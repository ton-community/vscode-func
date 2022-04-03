import * as lsp from 'vscode-languageserver';
import { InsertTextFormat } from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { SymbolIndex } from './symbolIndex';

export class CompletionItemProvider {
    constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees, private readonly _symbols: SymbolIndex) {}

    register(connection: lsp.Connection) {
        connection.client.register(lsp.CompletionRequest.type);
        connection.onRequest(lsp.CompletionRequest.type, this.provideCompletionItems.bind(this));
    }

    async provideCompletionItems(params: lsp.CompletionParams): Promise<lsp.CompletionItem[]> {
        const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

        let result: lsp.CompletionItem[] = [];
        let symbols = new Set<string>();
        for (let [label, occurencies] of this._symbols.index.query('')) {
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
                    } else if (def === lsp.SymbolKind.Variable) {
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