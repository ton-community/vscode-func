import { DocumentStore } from '../documentStore';
import * as lsp from 'vscode-languageserver';
import { Trees } from '../trees';
import { connection } from '../connection';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { asLspRange } from '../utils/position';
import { DirectivesIndex } from './directivesIndex';

export class DiagnosticsProvider {
    constructor(private readonly _trees: Trees, private readonly _deps: DirectivesIndex) {
        this._trees.onParseDone(async (event) => {
            await _deps.update(event.document, event.tree);
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

        let errors = this._deps.getDirectives(document.uri);
        for (let error of errors.notFound) {
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