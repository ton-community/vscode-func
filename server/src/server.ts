import {
	InitializeParams,
	TextDocumentSyncKind,
	Connection
} from 'vscode-languageserver/node';
import { InitializeResult } from 'vscode-languageserver-protocol';
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
import { CodeAction } from 'vscode-languageserver';
import { findQuickFixByKind } from './features/quickfixes';


const features: { register(connection: Connection): any }[] = [];

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
	// while starting the server, client posted some initializationOptions; for instance, clientConfig
	await initParser(params.initializationOptions.treeSitterWasmUri, params.initializationOptions.langUri);
	mutateConfig(params.initializationOptions.clientConfig || {})

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
		// config sent from a client matches FuncPluginConfigScheme
		mutateConfig(config);
		// after config change, re-run all diagnostics on opened documents
		for (let document of documents.all()) {
			let tree = trees.getParseTree(document);
			if (tree) {
				diagnosticsProvider.provideDiagnostics(document, tree);
			}
		}
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

	connection.onCodeAction(params => {
		let document = documents.get(params.textDocument.uri)
		let tree = document ? trees.getParseTree(document) : undefined
		if (params.context.diagnostics.length === 0 || !document || !tree) {
			return []
		}

		let actions = [] as CodeAction[]
		for (let diagnostic of params.context.diagnostics) {
			// data.fixes contains an array of kind, see CollectedDiagnostics
			if (diagnostic.data && Array.isArray(diagnostic.data.fixes)) {
				for (let kind of diagnostic.data.fixes) {
					let qf = findQuickFixByKind(kind)
					if (qf) {
						actions.push(qf.convertToCodeAction(document.uri, tree, diagnostic))
					}
				}
			}
		}
		return actions
	})

	// on parse done
	trees.onParseDone(async (event) => {
		await depsIndex.update(event.document, event.tree);
		diagnosticsProvider.provideDiagnostics(event.document, event.tree);
	})

	console.log('FunC language server is READY');
	
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			codeActionProvider: true,
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