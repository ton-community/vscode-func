import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Trees } from '../trees';

export interface IUsage {
	name: string;
	range: lsp.Range;
	kind: lsp.SymbolKind;
}

export function getDocumentUsages(document: TextDocument, trees: Trees): IUsage[] {
	return [];
}