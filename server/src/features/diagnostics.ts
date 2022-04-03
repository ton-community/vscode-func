import { DocumentStore } from '../documentStore';
import * as lsp from 'vscode-languageserver';
import { Trees } from '../trees';
import { connection } from '../connection';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { asLspRange } from '../utils/asLspRange';

export class DiagnosticsProvider {
    constructor(private readonly _trees: Trees, private readonly _documents: DocumentStore) {
        this._trees.onParseDone(async (event) => {
            this.provideDiagnostics(event.document, event.tree);
        })
    }

    register(connection: lsp.Connection) {
        // do nothing
    }

    provideDiagnostics(document: TextDocument, tree: Parser.Tree) {
        let diagnostics: lsp.Diagnostic[] = []

        const visitTree = (node: Parser.SyntaxNode) => {
            if (node.isMissing()) {
                console.log(node.type);
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
        visitTree(tree.rootNode)

        connection.sendDiagnostics({
            diagnostics,
            uri: document.uri,
            version: document.version
        })
    }
}