import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';

export class FormattingProvider {
    constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentFormattingRequest.type);
		connection.onRequest(lsp.DocumentFormattingRequest.type, this.provideDocumentFormattingEdits.bind(this));
	}

	async provideDocumentFormattingEdits(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null> {
		const document = await this._trees.getParseTree(params.textDocument.uri);
		let edits: lsp.TextEdit[] = [];
		console.log('Formatting document');

		let indent = 0;
		let cursor = document.rootNode.walk();
		let hasAny = cursor.gotoFirstChild();
		while (hasAny) {
			let node = cursor.currentNode();
			if ( // process root nodes
				node.type === 'function_definition' || 
				node.type === 'compiler_directive' ||
				node.type === 'global_var_declarations'
				) {
				if (node.startPosition.column > params.options.tabSize * indent) {
					edits.push(lsp.TextEdit.del(lsp.Range.create(
						lsp.Position.create(node.startPosition.row, 0),
						lsp.Position.create(node.startPosition.row, node.startPosition.column)
					)));
				}
			}

			if (cursor.gotoNextSibling()) {
				continue;
			}
			if (cursor.gotoFirstChild()) {
				indent++;
				continue;
			}
			if (cursor.gotoParent() && cursor.gotoNextSibling()) {
				indent--;
				continue;
			}
			break;
		}

        return edits;
	}
}