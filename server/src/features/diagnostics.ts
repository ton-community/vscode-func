import * as lsp from 'vscode-languageserver';
import { connection } from '../connection';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { asLspRange } from '../utils/position';
import { DepsIndex } from './depsIndex';

export class DiagnosticsProvider {
    constructor(private readonly _deps: DepsIndex) {
    }

    register(connection: lsp.Connection) {
        // do nothing
    }

    provideDiagnostics(document: TextDocument, tree: Parser.Tree) {
        let diagnostics: lsp.Diagnostic[] = []

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