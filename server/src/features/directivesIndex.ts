import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { DocumentStore } from '../documentStore';
import { queryDirectives } from '../queries/directives';
import { Trees } from '../trees';

function resolvePathSegment(documentUri: string, path: string) {
	let result = documentUri.split('/').slice(0, -1).join('/');
	return result + '/' + path;
}

export class DirectivesIndex {
	private _cache = new Map<string, { includes: string[], notFound: { node: Parser.SyntaxNode, path: string }[] }>();

	constructor(private readonly _trees: Trees, private readonly _documents: DocumentStore) {}

	async update(document: TextDocument, tree: Parser.Tree) {
		let query = queryDirectives(tree.rootNode);

		let notFound: { node: Parser.SyntaxNode, path: string }[] = [];
		let includes: string[] = [];

		for (let include of query.includes) {
			let path = resolvePathSegment(document.uri, include.path.slice(1).slice(0, -1));
			let found = await this._documents.retrieve(path);
			if (!found.exists) {
				notFound.push({
					node: include.node,
					path,
				});
			} else {
				includes.push(path);
			}
		}

		this._cache.set(document.uri, { includes, notFound });
	}

	getDirectives(documentUri: string) {
		return this._cache.get(documentUri);
	}

	dispose(): void {
	}
};