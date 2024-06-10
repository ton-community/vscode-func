import * as Parser from 'web-tree-sitter';
import { CodeAction, Diagnostic, TextEdit } from 'vscode-languageserver';
import { asLspTextEdit, asParserPoint, calcNextSiblingStart } from '../utils/position';

// QuickFix is a fix for diagnostic, available via "Alt+Enter" in VS Code
export interface QuickFix {
    convertToCodeAction(documentUri: string, tree: Parser.Tree, diagnostic: Diagnostic): CodeAction
}

export class ChooseFuncLanguageLevelQuickFix implements QuickFix {
    public static kind = 'choose_language_level'

    convertToCodeAction(documentUri: string, tree: Parser.Tree, diagnostic: Diagnostic): CodeAction {
        return {
            title: 'Configure FunC language level...',
            kind: 'quickfix',
            diagnostics: [diagnostic],
            isPreferred: false,
            command: {
                title: 'Open Settings',
                command: 'workbench.action.openSettings',
                arguments: ['@ext:tonwhales.func-vscode'],
            },
        }
    }
}

abstract class DefaultQuickFix implements QuickFix {
    abstract getTitle(): string
    abstract applyQuickFix(node: Parser.SyntaxNode): TextEdit[]

    convertToCodeAction(documentUri: string, tree: Parser.Tree, diagnostic: Diagnostic): CodeAction {
        return {
            title: this.getTitle(),
            kind: 'quickfix',
            diagnostics: [diagnostic],
            isPreferred: true,
            edit: {
                changes: { [documentUri]: this.applyQuickFix(tree.rootNode.descendantForPosition(asParserPoint(diagnostic.range.start))) },
            },
        }
    }
}

export class RemoveImpureSpecifierQuickFix extends DefaultQuickFix {
    public static kind = 'remove_impure'

    getTitle() {
        return "Remove 'impure'"
    }

    applyQuickFix(node: Parser.SyntaxNode): TextEdit[] {
        return [asLspTextEdit(node.startPosition, calcNextSiblingStart(node), '')]
    }
}

export class ReplaceMethodIdWithGetQuickFix extends DefaultQuickFix {
    public static kind = 'replace_method_id_with_get'

    getTitle(): string {
        return "Replace 'method_id' with 'get'"
    }

    applyQuickFix(node: Parser.SyntaxNode): TextEdit[] {
        let f_decl: Parser.SyntaxNode | null = node
        while (f_decl && f_decl.type !== 'function_definition') {
            f_decl = f_decl.parent
        }
        if (!f_decl) { // shouldn't happen
            return []
        }

        return [
            asLspTextEdit(node.startPosition, calcNextSiblingStart(node), ''),
            asLspTextEdit(f_decl.startPosition, f_decl.startPosition, 'get '),
        ]
    }
}

export class ReplaceLineCommentToTraditionalQuickFix extends DefaultQuickFix {
    public static kind = 'replace_line_comment_with_traditional'

    getTitle(): string {
        return 'Replace with //comment';
    }

    applyQuickFix(node: Parser.SyntaxNode): TextEdit[] {
        let newText = node.text     // just replace all ';' to '/' in the beginning
            .replace(/^;+/, (a) => '/'.repeat(a.length))

        return [asLspTextEdit(node.startPosition, node.endPosition, newText)]
    }
}

export class ReplaceBlockCommentToTraditionalQuickFix extends DefaultQuickFix {
    public static kind = 'replace_block_comment_with_traditional'

    getTitle(): string {
        return 'Replace with /* comment */';
    }

    applyQuickFix(node: Parser.SyntaxNode): TextEdit[] {
        let newText = node.text     // replace '{--o--}' to '/**o**/'
            .replace(/^{(-+)/, (_, a) => '/' + '*'.repeat(a.length))
            .replace(/(-*)}$/, (_, a) => '*'.repeat(a.length) + '/')

        return [asLspTextEdit(node.startPosition, node.endPosition, newText)]
    }
}

export class RemoveDeprecatedPragma extends DefaultQuickFix {
    public static kind = 'remove_deprecated_pragma'

    getTitle(): string {
        return 'Remove deprecated #pragma';
    }

    applyQuickFix(node: Parser.SyntaxNode): TextEdit[] {
        let directive: Parser.SyntaxNode | null = node
        while (directive && directive.type !== 'compiler_directive') {
            directive = directive.parent
        }
        if (!directive) {
            return []
        }

        return [asLspTextEdit(directive.startPosition, calcNextSiblingStart(directive), '')];
    }
}


const allExistingQuickFixes: { [kind in string]: QuickFix } = {
    [ChooseFuncLanguageLevelQuickFix.kind]: new ChooseFuncLanguageLevelQuickFix(),
    [RemoveImpureSpecifierQuickFix.kind]: new RemoveImpureSpecifierQuickFix(),
    [ReplaceMethodIdWithGetQuickFix.kind]: new ReplaceMethodIdWithGetQuickFix(),
    [ReplaceLineCommentToTraditionalQuickFix.kind]: new ReplaceLineCommentToTraditionalQuickFix(),
    [ReplaceBlockCommentToTraditionalQuickFix.kind]: new ReplaceBlockCommentToTraditionalQuickFix(),
    [RemoveDeprecatedPragma.kind]: new RemoveDeprecatedPragma(),
}

export function findQuickFixByKind(kind: string): QuickFix | undefined {
    return allExistingQuickFixes[kind]
}

