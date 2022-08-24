import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Parser from 'web-tree-sitter';
import { DocumentStore } from '../documentStore';
import { queryDirectives } from '../queries/directives';
import { Trees } from '../trees';
import { normalize as normalizePath } from 'path';

function resolvePathSegment(documentUri: string, path: string) {
	let result = documentUri.split('/').slice(0, -1).join('/').substring('file://'.length);
	
	return 'file://' + normalizePath(result + '/' + path);
}

export class DepsIndex {
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

	getIncludedDocuments(documentUri: string): string[] {
		let visited = new Set<string>();
		let queue: string[] = [documentUri];
		while (queue.length > 0) {
			let current = queue.pop()!;
			if (visited.has(current)) {
				continue;
			}
			visited.add(current);

			let cache = this._cache.get(current);
			if (cache) {
				queue.push(...cache.includes);
			}
		}

		return [...visited]; 
	}

	getNotFound(documentUri: string): { node: Parser.SyntaxNode, path: string }[] {
		let root = this._cache.get(documentUri);
		return root?.notFound || [];
	}

	dispose(): void {
	}
};