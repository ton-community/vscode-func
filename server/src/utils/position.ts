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