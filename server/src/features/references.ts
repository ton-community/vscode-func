import * as lsp from 'vscode-languageserver';
import { Trees } from '../trees';

export interface IUsage {
	name: string;
	range: lsp.Range;
	kind: lsp.SymbolKind;
}

export function getDocumentUsages(document: lsp.TextDocument, trees: Trees): IUsage[] {
	return [];
}