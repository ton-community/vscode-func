import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { asLspRange } from '../utils/position';
import { createHash } from 'crypto';
import { crc32 } from '../utils/crc32';

export class CodeLensProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.CodeLensRequest.type);
		connection.onRequest(lsp.CodeLensRequest.type, this.provideCodeLens.bind(this));
	}

	async provideCodeLens(params: lsp.CodeLensParams): Promise<lsp.CodeLens[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find definition globally
		const tree = this._trees.getParseTree(document.document!);
		if (!tree) {
			return [];
		}

        let numberLiterals = tree.rootNode.descendantsOfType('number_string_literal');
		return numberLiterals.map(a => {
            let numberTag = a.text[a.text.length - 1];
			let text = a.text.slice(1, a.text.length - 2);

			let result: string;
			if (numberTag === 'H') {
				result = createHash('sha256').update(text).digest('hex');
			} else if (numberTag === 'h') {
				result = createHash('sha256').update(text).digest().slice(0, 4).toString('hex');
			} else if (numberTag === 'u') {
				result = Buffer.from(text).toString('hex');
			} else if (numberTag === 'c') {
				result = crc32(text).toString(16);
			} else {
				result = text;
			}

            return {
				range: asLspRange(a),
				command: {
					title: `Copy ${result} to clipboard`,
					command: "func.copyToClipboard",
					arguments: [result]
				},
			}
        });
	}
}