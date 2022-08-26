import * as lsp from 'vscode-languageserver';
import { connection } from '../connection';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { asLspRange } from '../utils/position';
import { DepsIndex } from './depsIndex';
import { SymbolIndex } from './symbolIndex';
import { config } from '../config';
import { FuncType } from './typeInference';
import { findLocals } from '../queries/locals';

export class DiagnosticsProvider {
    constructor(private readonly _deps: DepsIndex, private readonly _symbols: SymbolIndex) {
    }

    register(connection: lsp.Connection) {
        // do nothing
    }

    private async retrieveAvailableGlobalSymbols(uri: string) {
        await this._symbols.update();

        let deps = this._deps.getIncludedDocuments(uri);

        let result: { kind: lsp.SymbolKind, type: FuncType, name: string }[] = [];
        for (let [label, occurencies] of this._symbols.index) {
            for (let [doc, symbol] of occurencies.entries()) {
                if (symbol.definitions.size === 0) {
                    continue;
                }
                if (
                    config.symbolDiscovery === 'only #include' && 
                    doc !== uri && 
                    !deps.includes(doc)
                ) {
                    continue;
                }

                for (let [def, type] of symbol.definitions.entries()) {
                    result.push({
                        kind: def,
                        type,
                        name: label,
                    })
                }
            }
        }
        return result;
    }

    async provideDiagnostics(document: TextDocument, tree: Parser.Tree) {
        let diagnostics: lsp.Diagnostic[] = []
        let globalSymbols = await this.retrieveAvailableGlobalSymbols(document.uri);
        const visitTree = (node: Parser.SyntaxNode) => {
            if (node.isMissing()) {
                diagnostics.push({
                    message: 'Missing ' + node.type,
                    range: asLspRange(node),
                })
            } else if (node.hasError() && node.children.every(a => !a.hasError())) {
                diagnostics.push({
                    message: 'Syntax error',
                    range: asLspRange(node),
                })
            }

            if (config.experimentalDiagnostics && node.type === 'block_statement' && config.symbolDiscovery === 'only #include') {
                let identifiers = node.descendantsOfType('identifier');
                for (let identifier of identifiers) {
                    let locals = findLocals(tree.rootNode, identifier.endPosition);
                    let symbol = globalSymbols.find(a => {
                        if (a.name.startsWith('~')) {
                            return a.name.slice(1) === identifier.text;
                        }
                        return a.name === identifier.text;
                    }) || locals.find(a => a.text === identifier.text);
                    if (!symbol) {
                        diagnostics.push({
                            message: `Сannot find symbol with name '${identifier.text}'`,
                            range: asLspRange(identifier),
                        })
                    }
                }
            }
            
            for (let child of node.children) {
                visitTree(child);
            }
        }
        visitTree(tree.rootNode);

        let errors = this._deps.getNotFound(document.uri);
        for (let error of errors) {
            diagnostics.push({
                message: 'Dependency not found: ' + error.path,
                range: asLspRange(error.node),
            })
        }

        connection.sendDiagnostics({
            diagnostics,
            uri: document.uri,
            version: document.version
        })
    }
}