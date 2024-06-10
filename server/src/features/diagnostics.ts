import * as lsp from 'vscode-languageserver';
import { Diagnostic } from 'vscode-languageserver';
import * as Parser from 'web-tree-sitter';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { connection } from '../connection';
import { asLspRange, asLspTextEdit, asParserPoint } from '../utils/position';
import { DepsIndex } from './depsIndex';
import { SymbolIndex } from './symbolIndex';
import { config } from '../config';
import { FuncType } from './typeInference';
import { findLocals, FoundGlobalSymbol, FoundLocalSymbol } from '../queries/locals';
import * as qf from './quickfixes';
import { detectFuncLanguageCapabilities, FuncChangesByLevel } from './language-level';
import { FuncPluginConfigScheme } from '../config-scheme';


class CollectedDiagnostics {
    private diagnostics: lsp.Diagnostic[] = []

    error(message: string, node: Parser.SyntaxNode, ...fixes: string[]) {
        this.diagnostics.push({ message, range: asLspRange(node), data: { fixes } })
    }

    errorAt(message: string, range: lsp.Range, ...fixes: string[]) {
        this.diagnostics.push({ message, range, data: { fixes } })
    }

    warning(message: string, node: Parser.SyntaxNode, ...fixes: string[]) {
        this.diagnostics.push({ message, range: asLspRange(node), severity: 2, data: { fixes } })
    }

    warningAt(message: string, range: lsp.Range, ...fixes: string[]) {
        this.diagnostics.push({ message, range, severity: 2, data: { fixes } })
    }

    info(message: string, node: Parser.SyntaxNode, ...fixes: string[]) {
        this.diagnostics.push({ message, range: asLspRange(node), severity: 3, data: { fixes } })
    }

    infoAt(message: string, range: lsp.Range, ...fixes: string[]) {
        this.diagnostics.push({ message, range, severity: 3, data: { fixes } })
    }

    hint(message: string, node: Parser.SyntaxNode, ...fixes: string[]) {
        this.diagnostics.push({ message, range: asLspRange(node), severity: 4, data: { fixes } })
    }

    hintAt(message: string, range: lsp.Range, ...fixes: string[]) {
        this.diagnostics.push({ message, range, severity: 4, data: { fixes } })
    }

    getCollectedDiagnostics(): lsp.Diagnostic[] {
        return this.diagnostics
    }
}

class TreeVisitor {
    private constructor(
        private readonly config: FuncPluginConfigScheme,
        private readonly rootNode: Parser.SyntaxNode,
        private readonly diagnostics: CollectedDiagnostics,
        private readonly globalSymbols: FoundGlobalSymbol[],
        private readonly lang = detectFuncLanguageCapabilities(config.languageLevel),
    ) {
    }

    static visitTreeAndCollectDiagnostics(tree: Parser.Tree, globalSymbols: FoundGlobalSymbol[]): CollectedDiagnostics {
        let collected = new CollectedDiagnostics()
        let self = new TreeVisitor(config, tree.rootNode, collected, globalSymbols)
        self.visitSubTree(self.rootNode)
        return collected
    }

    private visitSubTree(node: Parser.SyntaxNode) {
        if (node.isMissing()) {
            this.diagnostics.error('Missing ' + node.type, node)
        } else if (node.hasError() && node.children.every(a => !a.hasError())) {
            this.diagnostics.error('Syntax error', node)
        }

        if (this.config.experimentalDiagnostics && node.type === 'block_statement' && this.config.symbolDiscovery === 'only #include') {
            let identifiers = node.descendantsOfType('identifier');
            for (let identifier of identifiers) {
                let locals: FoundLocalSymbol[] = findLocals(this.rootNode, identifier.endPosition);
                let symbol = this.globalSymbols.find(a =>
                    a.name.startsWith('~') ? a.name.slice(1) === identifier.text : a.name === identifier.text,
                ) || locals.find(a => a.text === identifier.text);
                if (!symbol) {
                    this.diagnostics.error(`Cannot find symbol '${identifier.text}'`, identifier)
                }
            }
        }

        if (node.type === 'impure_specifier' && this.lang.impureByDefault) {
            this.diagnostics.warning(`'impure' specifier is deprecated since FunC ${FuncChangesByLevel.impureByDefault}, all functions are impure by default`, node, qf.RemoveImpureSpecifierQuickFix.kind)
        }

        if (node.type === 'pure_specifier' && !this.lang.pureSpecifierAllowed) {
            this.diagnostics.error(`'pure' specifier is only allowed since FunC ${FuncChangesByLevel.pureSpecifierAllowed}`, node, qf.ChooseFuncLanguageLevelQuickFix.kind)
        }

        if (node.type === 'method_id_specifier' && node.childCount < 2 && this.lang.preferGetInsteadOfMethodId) {
            this.diagnostics.warning(`'method_id' specifier is deprecated since FunC ${FuncChangesByLevel.preferGetInsteadOfMethodId}, use 'get' keyword on the left`, node, qf.ReplaceMethodIdWithGetQuickFix.kind)
        }

        if (node.type === 'get_specifier' && !this.lang.getSpecifierAllowed) {
            this.diagnostics.error(`'get' specifier is only allowed since FunC ${FuncChangesByLevel.getSpecifierAllowed}`, node, qf.ChooseFuncLanguageLevelQuickFix.kind)
        }

        if (node.type === 'comment') {
            let traditional_allowed = this.lang.traditionalCommentsAllowed
            let text = node.text

            if (traditional_allowed && text.startsWith(';;')) {
                this.diagnostics.hintAt("';;' comments can be replaced with // traditional", lsp.Range.create(node.startPosition.row, node.startPosition.column, node.startPosition.row, node.startPosition.column + 2), qf.ReplaceLineCommentToTraditionalQuickFix.kind)
            } else if (traditional_allowed && text.startsWith('{-')) {
                this.diagnostics.hintAt("'{-' comments can be replaced with /* traditional */", lsp.Range.create(node.startPosition.row, node.startPosition.column, node.startPosition.row, node.startPosition.column + 2), qf.ReplaceBlockCommentToTraditionalQuickFix.kind)
            } else if (!traditional_allowed && text.startsWith('//')) {
                this.diagnostics.error(`'//' comments are only allowed since FunC ${FuncChangesByLevel.traditionalCommentsAllowed}`, node, qf.ChooseFuncLanguageLevelQuickFix.kind)
            } else if (!traditional_allowed && text.startsWith('/*')) {
                this.diagnostics.error(`'/* */' comments are only allowed since FunC ${FuncChangesByLevel.traditionalCommentsAllowed}`, node, qf.ChooseFuncLanguageLevelQuickFix.kind)
            }
        }

        if (node.type === 'pragma_directive') {
            let text = node.text

            for (let name of this.lang.deprecatedPragmas) {
                if (text.includes(name)) {
                    this.diagnostics.warning(`#pragma ${name} is deprecated since FunC ${FuncChangesByLevel.deprecatedPragmas[name]}`, node, qf.RemoveDeprecatedPragma.kind)
                    break
                }
            }
        }

        for (let child of node.children) {
            this.visitSubTree(child);
        }
    }
}

export class DiagnosticsProvider {
    constructor(private readonly _deps: DepsIndex, private readonly _symbols: SymbolIndex) {
    }

    register(connection: lsp.Connection) {
        // do nothing
    }

    private async retrieveAvailableGlobalSymbols(uri: string): Promise<FoundGlobalSymbol[]> {
        await this._symbols.update();

        let deps = this._deps.getIncludedDocuments(uri);

        let result: FoundGlobalSymbol[] = [];
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
        let globalSymbols = await this.retrieveAvailableGlobalSymbols(document.uri);
        let diagnostics = TreeVisitor.visitTreeAndCollectDiagnostics(tree, globalSymbols)

        let errors = this._deps.getNotFound(document.uri);
        for (let error of errors) {
            diagnostics.error('Dependency not found: ' + error.path, error.node)
        }

        connection.sendDiagnostics({
            diagnostics: diagnostics.getCollectedDiagnostics(),
            uri: document.uri,
            version: document.version
        })
    }
}