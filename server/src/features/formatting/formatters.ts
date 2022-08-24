import * as Parser from 'web-tree-sitter';
import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asLspRange } from '../../utils/position';

type Formatter = (node: Parser.SyntaxNode, document: TextDocument, indent: number, options: lsp.FormattingOptions) => lsp.TextEdit[];

let formatters: {
    [key: string]: Formatter[]
} = {}

function rule(name: string, formatter: Formatter) {
    formatters[name] = formatters[name] || [];
    formatters[name].push(formatter);
}

const indent: Formatter = (node, document, indent, options: lsp.FormattingOptions) => {
    let edits: lsp.TextEdit[] = [];

    let alignedIndent = options.insertSpaces ? options.tabSize * indent : indent;
    if (node.startPosition.column === alignedIndent) {
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

    let spaceCharacter = options.insertSpaces ? ' ' : '\t';

    // check if there are correct space characters
    if ((options.insertSpaces && prevText.includes('\t')) || (!options.insertSpaces && prevText.includes(' '))) {
        edits.push(
            lsp.TextEdit.replace(
                lsp.Range.create(
                    lsp.Position.create(node.startPosition.row, 0),
                    lsp.Position.create(node.startPosition.row, node.startPosition.column)
                ), 
                spaceCharacter.repeat(alignedIndent)
            )
        );
        return edits;
    }

    // check if the space charecters are aligned well
    if (node.startPosition.column > alignedIndent) {
        edits.push(lsp.TextEdit.del(lsp.Range.create(
            lsp.Position.create(node.startPosition.row, alignedIndent),
            lsp.Position.create(node.startPosition.row, node.startPosition.column)
        )));
    } else {
        edits.push(lsp.TextEdit.insert(
            lsp.Position.create(node.startPosition.row, 0),
            spaceCharacter.repeat(alignedIndent - node.startPosition.column)
        ));
    }
    return edits;
}

const ifParentNot = (types: string[], formatter: Formatter) => (node: Parser.SyntaxNode, document: TextDocument, indent: number, options: lsp.FormattingOptions) => {
    if (types.includes(node.parent!.type)) {
        return [];
    }
    return formatter(node, document, indent, options);
}

rule('function_definition', indent);
rule('compiler_directive', indent);
rule('global_var_declarations', indent);
rule('comment', indent);
rule('statement', indent);
rule('expression', ifParentNot(['expression_statement'], indent));
rule(')', indent);
rule('(', indent);
rule('{', indent);
rule('}', indent);
rule('[', indent);
rule(']', indent);
rule('&', indent);
rule('parameter_declaration', indent);


export function formatNode(node: Parser.SyntaxNode, document: TextDocument, indent: number, options: lsp.FormattingOptions) {
    let fmts = formatters[node.type];
    if (!fmts) {
        return [];
    }
    let edits: lsp.TextEdit[] = [];
    for (let rule of fmts) {
        edits.push(...rule(node, document, indent, options));
    }
    return edits;
}