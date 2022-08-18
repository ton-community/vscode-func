import * as Parser from 'web-tree-sitter';
import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asLspRange } from '../../utils/position';

type Formatter = (node: Parser.SyntaxNode, document: TextDocument, indent: number) => lsp.TextEdit[];

let formatters: {
    [key: string]: Formatter[]
} = {}

function rule(name: string, formatter: Formatter) {
    formatters[name] = formatters[name] || [];
    formatters[name].push(formatter);
}

const indent: Formatter = (node, document, indent) => {
    let edits: lsp.TextEdit[] = [];
    // params.options.tabSize
    if (node.startPosition.column === 4 * indent) {
        return [];
    }

    // ignore if something is same line
    let prevText = document.getText({
        start: {
            line: node.startPosition.row,
            character: 0
        },
        end: asLspRange(node).start,
    });
    if (prevText.trim().length > 0) {
        return [];
    }

    if (node.startPosition.column > 4 * indent) {
        edits.push(lsp.TextEdit.del(lsp.Range.create(
            lsp.Position.create(node.startPosition.row, 0),
            lsp.Position.create(node.startPosition.row, node.startPosition.column)
        )));
    } else {
        edits.push(lsp.TextEdit.insert(
            lsp.Position.create(node.startPosition.row, 0),
            // params.options.tabSize
            ' '.repeat(4 * indent - node.startPosition.column)
        ));
    }
    return edits;
}

rule('function_definition', indent);
rule('compiler_directive', indent);
rule('global_var_declarations', indent);
rule('comment', indent);
rule('expression_statement', indent);
rule('return_statement', indent);
rule(')', indent);
rule('(', indent);
rule('{', indent);
rule('}', indent);
rule('&', indent);
rule('parenthesized_expression', indent);
rule('expression', indent);
rule('parameter_declaration', indent);


export function formatNode(node: Parser.SyntaxNode, document: TextDocument, indent: number) {
    let fmts = formatters[node.type];
    if (!fmts) {
        return [];
    }
    let edits: lsp.TextEdit[] = [];
    for (let rule of fmts) {
        edits.push(...rule(node, document, indent));
    }
    return edits;
}