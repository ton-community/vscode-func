import * as lsp from 'vscode-languageserver';
import * as Parser from 'web-tree-sitter';
import { config } from '../config';
import { connection } from '../connection';
import { DocumentStore } from '../documentStore';
import { findLocals } from '../queries/locals';
import { Trees } from '../trees';
import { asParserPoint } from '../utils/position';
import { DepsIndex } from './depsIndex';
import { SymbolIndex } from './symbolIndex';
import { stringifyType } from './typeInference';

export class CompletionItemProvider {
    constructor(
        private readonly _documents: DocumentStore,
        private readonly _trees: Trees, 
        private readonly _symbols: SymbolIndex, 
        private readonly _deps: DepsIndex
    ) {}

    register(connection: lsp.Connection) {
        connection.client.register(lsp.CompletionRequest.type, {
            documentSelector: [{ language: 'func' }],
            triggerCharacters: ['.', '~']
        });
        connection.onRequest(lsp.CompletionRequest.type, this.provideCompletionItems.bind(this));
    }


    async provideIncludeCompletionItems(params: lsp.CompletionParams, node: Parser.SyntaxNode): Promise<lsp.CompletionItem[]> {
        let matching: string[] = await connection.sendRequest('completion/matching-files', { pathPrefix: node.text.slice(1).slice(0, -1), uri: params.textDocument.uri });
        let result: lsp.CompletionItem[] = [];
        for (let match of matching) {
            let item = lsp.CompletionItem.create(match);
            item.kind = lsp.CompletionItemKind.File;
            result.push(item);
        }
        return result;
    }

    async provideCompletionItems(params: lsp.CompletionParams): Promise<lsp.CompletionItem[]> {
        const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document.document!);
		if (!tree) {
			return [];
		}

        let cursorPosition = asParserPoint(params.position);
        let cursorNode = tree.rootNode.descendantForPosition(cursorPosition);
        if (cursorNode.type === 'string_literal' && cursorNode.parent && cursorNode.parent.type === 'include_directive') {
            return this.provideIncludeCompletionItems(params, cursorNode);
        }

        let isFunctionApplication = false;
        if (params.context?.triggerCharacter === '.' || params.context?.triggerCharacter === '~') {
            isFunctionApplication = true;
        }

        let result: lsp.CompletionItem[] = [];

        // local symbols
        if (!isFunctionApplication) {
            result.push(...findLocals(tree.rootNode, cursorPosition).map(a => {
                let item = lsp.CompletionItem.create(a.text);
                item.kind = lsp.CompletionItemKind.Variable;
                item.detail = stringifyType(a.type);
                return item;
            }))
        }

        let deps = this._deps.getIncludedDocuments(params.textDocument.uri);

        // global symbols
        await this._symbols.update();
        let symbols = new Set<string>();
        for (let [label, occurencies] of this._symbols.index) {
            for (let [doc, symbol] of occurencies.entries()) {
                if (symbol.definitions.size === 0) {
                    continue;
                }

                if (
                    config.symbolDiscovery === 'only #include' && 
                    doc !== params.textDocument.uri && 
                    !deps.includes(doc)
                ) {
                    continue;
                }

                for (let [def, type] of symbol.definitions.entries()) {
                    if (symbols.has(`${label}_${def}`)) {
                        continue;
                    } 
                    symbols.add(`${label}_${def}`);
                    let item = lsp.CompletionItem.create(label);
                    if (def === lsp.SymbolKind.Function) {
                        item.kind = lsp.CompletionItemKind.Function;
                        if (config.autocompleteAddParentheses && type.kind === 'function') {
                            let fArgs = [...type.arguments];
                            if (isFunctionApplication) {
                                let firstArg = fArgs.shift();
                                if (!firstArg) {
                                    continue;
                                }
                            };
                            item.insertText = `${label}(${fArgs.map((a, i) => `$\{${i+1}:${a.name}}`)})`;
                            item.insertTextFormat = lsp.InsertTextFormat.Snippet;
                        }
                    } else if (def === lsp.SymbolKind.Variable && !isFunctionApplication) {
                        item.kind = lsp.CompletionItemKind.Variable;
                    } else if (def === lsp.SymbolKind.Constant && !isFunctionApplication) {
                        item.kind = lsp.CompletionItemKind.Constant;
                    } else {
                        continue;
                    }
                    item.detail = stringifyType(type);
                    // item.documentation = stringifyType(type);
                    result.push(item);
                }
            }
        }

        return result;
    }
}