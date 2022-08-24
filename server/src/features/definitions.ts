import * as lsp from 'vscode-languageserver';
import { config } from '../config';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { asParserPoint } from '../utils/position';
import { DepsIndex } from './depsIndex';
import { SymbolIndex } from './symbolIndex';

export class DefinitionProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex,
		private readonly _directives: DepsIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DefinitionRequest.type);
		connection.onRequest(lsp.DefinitionRequest.type, this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: lsp.DefinitionParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find definition globally
		const tree = this._trees.getParseTree(document.document!);
		if (!tree) {
			return [];
		}

        let id = tree.rootNode.descendantForPosition(asParserPoint(params.position));
		if (id.type !== 'identifier' && id.type !== 'function_name') {
			return [];
		}

		let files: string[] | undefined = undefined;
		if (config.symbolDiscovery === 'only #include') {
			files = this._directives.getIncludedDocuments(params.textDocument.uri);
		} 

		const symbols = await this._symbols.getDefinitions(id.text, files);
		return symbols.map(s => s.location);
	}
}