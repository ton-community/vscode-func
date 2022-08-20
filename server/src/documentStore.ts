
import { TextDecoder } from 'util';
import * as lsp from 'vscode-languageserver';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LRUMap } from './utils/lruMap';

export interface TextDocumentChange2 {
	document: TextDocument,
	changes: {
		range: lsp.Range;
		rangeOffset: number;
		rangeLength: number;
		text: string;
	}[]
}

export class DocumentStore extends TextDocuments<TextDocument> {

	private readonly _onDidChangeContent2 = new lsp.Emitter<TextDocumentChange2>();
	readonly onDidChangeContent2 = this._onDidChangeContent2.event;

	private readonly _decoder = new TextDecoder();
	private readonly _fileDocuments: LRUMap<string, Promise<{ exists: boolean, document?: TextDocument }>>;

	constructor(private readonly _connection: lsp.Connection) {
		super({
			create: TextDocument.create,
			update: (doc, changes, version) => {
				let result: TextDocument;
				let incremental = true;
				let event: TextDocumentChange2 = { document: doc, changes: [] };

				for (const change of changes) {
					if (!lsp.TextDocumentContentChangeEvent.isIncremental(change)) {
						incremental = false;
						break;
					}
					const rangeOffset = doc.offsetAt(change.range.start);
					event.changes.push({
						text: change.text,
						range: change.range,
						rangeOffset,
						rangeLength: change.rangeLength ?? doc.offsetAt(change.range.end) - rangeOffset,
					});
				}
				result = TextDocument.update(doc, changes, version);
				if (incremental) {
					this._onDidChangeContent2.fire(event);
				}
				return result;
			}
		});

		this._fileDocuments = new LRUMap<string, Promise<{ exists: boolean, document?: TextDocument }>>({
			size: 200,
			dispose: _entries => { }
		});

		super.listen(_connection);

		_connection.onNotification('file-cache/remove', uri => this._fileDocuments.delete(uri));
	}

	async retrieve(uri: string): Promise<{ exists: boolean, document?: TextDocument }> {
		let result = this.get(uri);
		if (result) {
			return { exists: true, document: result };
		}
		let promise = this._fileDocuments.get(uri);
		if (!promise) {
			promise = this._requestDocument(uri);
			this._fileDocuments.set(uri, promise);
		}
		return promise;
	}

	private async _requestDocument(uri: string): Promise<{ exists: boolean, document?: TextDocument }> {
		const reply = await this._connection.sendRequest<{ type: 'Buffer', data: any } | { type: 'not-found' }>('file/read', uri);
		if (reply.type === 'not-found') {
			return { exists: false, document: undefined };
		}
        let decoded = this._decoder.decode(new Uint8Array(reply.data));
		return { exists: true, document: TextDocument.create(uri, 'func', 1, decoded) };
	}

}