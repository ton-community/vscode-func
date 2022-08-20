import {
	InitializeParams,
	TextDocumentSyncKind,
	Connection
} from 'vscode-languageserver/node';
import { connection } from './connection';
import { DirectivesIndex } from './features/directivesIndex';
import { DocumentStore } from './documentStore';
import { CompletionItemProvider } from './features/completion';
import { DefinitionProvider } from './features/definitions';
import { DiagnosticsProvider } from './features/diagnostics';
import { DocumentSymbols } from './features/documentSymbols';
import { FormattingProvider } from './features/formatting';
import { SymbolIndex } from './features/symbolIndex';
import { initParser } from './parser';
import { Trees } from './trees';


const features: { register(connection: Connection): any }[] = [];

connection.onInitialize(async (params: InitializeParams) => {
	await initParser(params.initializationOptions.treeSitterWasmUri, params.initializationOptions.langUri);

	const documents = new DocumentStore(connection);
	const trees = new Trees(documents);
	
	const symbolIndex = new SymbolIndex(trees, documents);
	const depsIndex = new DirectivesIndex(trees, documents);

	features.push(new DocumentSymbols(documents, trees));
	features.push(new DiagnosticsProvider(trees, depsIndex));
	features.push(new CompletionItemProvider(documents, trees, symbolIndex));
	features.push(new DefinitionProvider(documents, trees, symbolIndex));
	features.push(new FormattingProvider(documents, trees));

	// manage symbol index. add/remove files as they are disovered and edited
	documents.all().forEach(doc => symbolIndex.addFile(doc.uri));
	documents.onDidOpen(event => symbolIndex.addFile(event.document.uri));
	documents.onDidChangeContent(event => symbolIndex.addFile(event.document.uri));
	connection.onNotification('queue/remove', uri => symbolIndex.removeFile(uri));
	connection.onNotification('queue/add', uri => symbolIndex.addFile(uri));
	connection.onRequest('queue/init', uris => {
		return symbolIndex.initFiles(uris);
	});

	console.log('FunC language server is READY');
	
	return {
		capabilities: { 
			textDocumentSync: TextDocumentSyncKind.Incremental
		}
	};
});

connection.onInitialized(() => {
	for (let feature of features) {
		feature.register(connection);
	}
});

// Listen on the connection
connection.listen();