import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';

export class FormattingProvider {
    constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentFormattingRequest.type);
		connection.onRequest(lsp.DocumentFormattingRequest.type, this.provideDocumentFormattingEdits.bind(this));
	}

	async provideDocumentFormattingEdits(params: lsp.DocumentFormattingParams): Promise<lsp.TextEdit[] | null> {
		const document = await this._documents.retrieve(params.textDocument.uri);
        console.log(params);
        return [];
	}
}