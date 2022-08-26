import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { queryGlobals } from '../queries/globals';
import { asLspRange } from '../utils/position';
import * as Parser from 'web-tree-sitter';
import { FuncType, inferFunctionType, inferVariableTypeFromDeclaration, stringifyType } from './typeInference';

export class DocumentSymbols {
	constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentSymbolRequest.type);
		connection.onRequest(lsp.DocumentSymbolRequest.type, this.provideDocumentSymbols.bind(this));
	}

	async provideDocumentSymbols(params: lsp.DocumentSymbolParams): Promise<lsp.DocumentSymbol[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);
		let symbols = getDocumentSymbols(document.document!, this._trees);
        return symbols.map(a => a.symbol);
	}
}


export type SymbolMeta = { 
    symbol: lsp.DocumentSymbol, 
    node: Parser.SyntaxNode,
    funcType: FuncType
}
export function getDocumentSymbols(document: TextDocument, trees: Trees): SymbolMeta[] {
	const tree = trees.getParseTree(document);
	if (!tree) {
		return [];
	}
    const globals = queryGlobals(tree.rootNode);

    const result: SymbolMeta[] = [];
    for (let declaration of globals) {
        let children: lsp.DocumentSymbol[] = []
        if (declaration.type == 'function') {
            let body = declaration.node.parent!.childForFieldName('body');
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
            result.push({
                node: declaration.node.parent!,
                symbol: lsp.DocumentSymbol.create(
                    declaration.text, 
                    '', 
                    lsp.SymbolKind.Function, 
                    asLspRange(declaration.node.parent!),
                    declaration.range, 
                    children
                ),
                funcType: inferFunctionType(declaration.node.parent!)
            });
        } else if (declaration.type == 'globalVar') {
            result.push({
                node: declaration.node.parent!,
                symbol: lsp.DocumentSymbol.create(
                    declaration.text, 
                    '', 
                    lsp.SymbolKind.Variable, 
                    declaration.range, 
                    declaration.range,
                    children,
                ),
                funcType: inferVariableTypeFromDeclaration(declaration.node.parent!)
            });
        } else if (declaration.type == 'const') {
            result.push({
                node: declaration.node.parent!,
                symbol: lsp.DocumentSymbol.create(
                    declaration.text,
                    '',
                    lsp.SymbolKind.Constant,
                    declaration.range,
                    declaration.range
                ),
                funcType: inferVariableTypeFromDeclaration(declaration.node.parent!)
            });
        }
    }
    return result;
}