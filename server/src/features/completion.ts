import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { SymbolIndex } from './symbolIndex';

export class CompletionItemProvider {
    constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees, private readonly _symbols: SymbolIndex) {}

    register(connection: lsp.Connection) {
        connection.client.register(lsp.CompletionRequest.type, {
            documentSelector: [{ language: 'func' }],
            triggerCharacters: ['.', '~']
        });
        connection.onRequest(lsp.CompletionRequest.type, this.provideCompletionItems.bind(this));
    }

    async provideCompletionItems(params: lsp.CompletionParams): Promise<lsp.CompletionItem[]> {
        const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

        let onlyFunctions = false;
        if (params.context?.triggerCharacter === '.' || params.context?.triggerCharacter === '~') {
            onlyFunctions = true;
        }

        let result: lsp.CompletionItem[] = [];

        // local symbols
        if (!onlyFunctions) {
            let cursorPosition = {
                column: params.position.character,
                row: params.position.line,
            }
            let descendant = tree.rootNode.descendantForPosition(cursorPosition);
    
            // navigate through parents and find their variables declared higher than cursor
            while (descendant) {
                while (descendant && descendant.type !== 'block_statement') {
                    descendant = descendant.parent;
                }
                if (!descendant) {
                    continue;
                }
                for (let child of descendant.children) {
                    if (child.type == 'expression_statement') {
                        let variableDeclarations = child.descendantsOfType('variable_declaration', null, cursorPosition);
                        for (let varDec of variableDeclarations) {
                            let identifiers = varDec.descendantsOfType('identifier', null, cursorPosition);
                            result.push(...identifiers.map(a => {
                                let item = lsp.CompletionItem.create(a.text);
                                item.kind = lsp.CompletionItemKind.Variable;
                                return item;
                            }))
                        }
                    }
                }
                descendant = descendant.parent;
            }
        }

        // global symbols
        await this._symbols.update();
        let symbols = new Set<string>();
        for (let [label, occurencies] of this._symbols.index) {
            for (let [doc, symbol] of occurencies.entries()) {
                if (symbol.definitions.size === 0) {
                    continue;
                }
                for (let def of symbol.definitions.values()) {
                    if (symbols.has(`${label}_${def}`)) {
                        continue;
                    } 
                    symbols.add(`${label}_${def}`);
                    let item = lsp.CompletionItem.create(label);
                    if (def === lsp.SymbolKind.Function) {
                        item.kind = lsp.CompletionItemKind.Function;
                    } else if (def === lsp.SymbolKind.Variable && !onlyFunctions) {
                        item.kind = lsp.CompletionItemKind.Variable;
                    } else {
                        continue;
                    }
                    result.push(item);
                }
            }
        }

        return result;
    }
}