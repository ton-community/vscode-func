import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { asParserPoint } from '../utils/position';
import { SymbolIndex } from './symbolIndex';

export class DefinitionProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DefinitionRequest.type);
		connection.onRequest(lsp.DefinitionRequest.type, this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: lsp.DefinitionParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find definition globally
		const tree = this._trees.getParseTree(document.document);
		if (!tree) {
			return [];
		}

        let id = tree.rootNode.descendantForPosition(asParserPoint(params.position));
		if (id.type !== 'identifier' && id.type !== 'function_name') {
			return [];
		}

		const symbols = await this._symbols.getDefinitions(id.text, document.document);
		return symbols.map(s => s.location);
	}
}