import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { queryGlobals } from '../queries/globals';
import { asLspRange } from '../utils/position';

export class DocumentSymbols {
	constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentSymbolRequest.type);
		connection.onRequest(lsp.DocumentSymbolRequest.type, this.provideDocumentSymbols.bind(this));
	}

	async provideDocumentSymbols(params: lsp.DocumentSymbolParams): Promise<lsp.DocumentSymbol[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);
		let symbols = getDocumentSymbols(document.document, this._trees);
        return symbols;
	}
}

export function getDocumentSymbols(document: TextDocument, trees: Trees): lsp.DocumentSymbol[] {
	const tree = trees.getParseTree(document);
	if (!tree) {
		return [];
	}
    const globals = queryGlobals(tree.rootNode);

    const result: lsp.DocumentSymbol[] = [];
    for (let declaration of globals) {
        let children: lsp.DocumentSymbol[] = []
        if (declaration.type == 'function') {
            let body = declaration.node.parent.childForFieldName('body');
            if (body) {
                let declarations = body.descendantsOfType('variable_declaration')
                for (let node of declarations) {
                    let identifiers = node.descendantsOfType('identifier');
                    children.push(...identifiers.map(localVar => {
                        let range = asLspRange(localVar)
                        return lsp.DocumentSymbol.create(
                            localVar.text, 
                            '', 
                            lsp.SymbolKind.Variable, 
                            range,
                            range,
                        )
                    }))
                }
            }
            result.push(
                lsp.DocumentSymbol.create(
                    declaration.text, 
                    '', 
                    lsp.SymbolKind.Function, 
                    asLspRange(declaration.node.parent),
                    declaration.range, 
                    children
                )
            );
        } else if (declaration.type == 'globalVar') {
            result.push(
                lsp.DocumentSymbol.create(
                    declaration.text, 
                    '', 
                    lsp.SymbolKind.Variable, 
                    declaration.range, 
                    declaration.range,
                    children
                )
            );
        }
    }
    return result;
}