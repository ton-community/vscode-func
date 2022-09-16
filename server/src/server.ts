import {
	InitializeParams,
	TextDocumentSyncKind,
	Connection
} from 'vscode-languageserver/node';
import { connection } from './connection';
import { DepsIndex } from './features/depsIndex';
import { DocumentStore } from './documentStore';
import { CompletionItemProvider } from './features/completion';
import { DefinitionProvider } from './features/definitions';
import { DiagnosticsProvider } from './features/diagnostics';
import { DocumentSymbols } from './features/documentSymbols';
import { FormattingProvider } from './features/formatting';
import { SymbolIndex } from './features/symbolIndex';
import { initParser } from './parser';
import { Trees } from './trees';
import { RenameProvider } from './features/rename';
import { mutateConfig } from './config';
import { CodeLensProvider } from './features/codeLens';


const features: { register(connection: Connection): any }[] = [];

connection.onInitialize(async (params: InitializeParams) => {
	await initParser(params.initializationOptions.treeSitterWasmUri, params.initializationOptions.langUri);

	const documents = new DocumentStore(connection);
	const trees = new Trees(documents);
	
	const symbolIndex = new SymbolIndex(trees, documents);
	const depsIndex = new DepsIndex(trees, documents);

	const diagnosticsProvider = new DiagnosticsProvider(depsIndex, symbolIndex);

	features.push(diagnosticsProvider);
	features.push(new DocumentSymbols(documents, trees));
	features.push(new CompletionItemProvider(documents, trees, symbolIndex, depsIndex));
	features.push(new DefinitionProvider(documents, trees, symbolIndex, depsIndex));
	features.push(new FormattingProvider(documents, trees));
	features.push(new RenameProvider(documents, trees, symbolIndex));
	features.push(new CodeLensProvider(documents, trees));

	// manage configuration
	connection.onNotification('configuration/change', (config) => {
		mutateConfig(config);
	});

	// manage symbol index. add/remove files as they are disovered and edited
	documents.all().forEach(doc => symbolIndex.addFile(doc.uri));
	documents.onDidOpen(event => symbolIndex.addFile(event.document.uri));
	documents.onDidChangeContent(event => symbolIndex.addFile(event.document.uri));
	connection.onNotification('queue/remove', uri => symbolIndex.removeFile(uri));
	connection.onNotification('queue/add', uri => symbolIndex.addFile(uri));
	connection.onRequest('queue/init', uris => {
		return symbolIndex.initFiles(uris);
	});

	// on parse done
	trees.onParseDone(async (event) => {
		await depsIndex.update(event.document, event.tree);
		diagnosticsProvider.provideDiagnostics(event.document, event.tree);
	})

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