import * as lsp from 'vscode-languageserver/node'
import * as Parser from 'web-tree-sitter'

export function asLspRange(node: Parser.SyntaxNode): lsp.Range {
	return lsp.Range.create(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function asParserPoint(position: lsp.Position): Parser.Point {
	return {
		column: position.character,
		row: position.line,
	}
}

export function asLspTextEdit(start: Parser.Point, end: Parser.Point, newText: string): lsp.TextEdit {
	return {
		range: lsp.Range.create(start.row, start.column, end.row, end.column),
		newText,
	}
}

// given node="impure" in the code "int f() impure {", detect startPosition of "{"
// (used to remove a node with following spaces if any)
// note, that "impure".nextSibling is null, because "{" is a nextSibling of "specifiers_list"
export function calcNextSiblingStart(node: Parser.SyntaxNode): Parser.Point {
	let has_next: Parser.SyntaxNode | null = node
	while (has_next && !has_next.nextSibling) {
		has_next = has_next.parent
	}
	return has_next ? has_next.nextSibling!.startPosition : node.endPosition
}
