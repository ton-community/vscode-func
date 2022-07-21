import * as vscode from 'vscode';
import * as path from 'path';
import { workspace } from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	RevealOutputChannelOn,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { TextEncoder } from 'util';


let client: LanguageClient;


export function activate(context: vscode.ExtensionContext) {
    startServer(context)
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

async function startServer(context: vscode.ExtensionContext): Promise<vscode.Disposable> {
	const disposables: vscode.Disposable[] = [];
	const databaseName = context.workspaceState.get('dbName', `func_${Math.random().toString(32).slice(2)}`);
	context.workspaceState.update('dbName', databaseName);

	const clientOptions: LanguageClientOptions = {
		outputChannelName: 'FunC',
		revealOutputChannelOn: RevealOutputChannelOn.Never,
		documentSelector: [{ scheme: 'file', language: 'func' }],
		synchronize:  {
			fileEvents: workspace.createFileSystemWatcher('**/.fcrc')
		},
		initializationOptions: {
			treeSitterWasmUri: vscode.Uri.joinPath(context.extensionUri, './node_modules/web-tree-sitter/tree-sitter.wasm').fsPath,
            langUri: vscode.Uri.joinPath(context.extensionUri,  './server/tree-sitter-func.wasm').fsPath,
			databaseName
		}
	};

    const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
    client = new LanguageClient(
		'funcServer',
		'FunC Language Server',
		serverOptions,
		clientOptions
	);

	disposables.push(client.start());

	await client.onReady();

	const langPattern = `**/*.fc`;
	const watcher = vscode.workspace.createFileSystemWatcher(langPattern);
	disposables.push(watcher);

	// file discover and watching. in addition to text documents we annouce and provide
	// all matching files

	// workaround for https://github.com/microsoft/vscode/issues/48674
	const exclude = `{${[
		...Object.keys(vscode.workspace.getConfiguration('search', null).get('exclude') ?? {}),
		...Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') ?? {})
	].join(',')}}`;

	let size: number = Math.max(0, vscode.workspace.getConfiguration('func').get<number>('symbolIndexSize', 500));

	const init = async () => {
        let all = await vscode.workspace.findFiles(langPattern, exclude);

		const uris = all.slice(0, size);
		console.info(`USING ${uris.length} of ${all.length} files for ${langPattern}`);

		await client.sendRequest('queue/init', uris.map(String));
	};
	const initCancel = new Promise<void>(resolve => disposables.push(new vscode.Disposable(resolve)));
	vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Building Index...' }, () => Promise.race([init(), initCancel]));

	disposables.push(watcher.onDidCreate(uri => {
		client.sendNotification('queue/add', uri.toString());
	}));
	disposables.push(watcher.onDidDelete(uri => {
		client.sendNotification('queue/remove', uri.toString());
		client.sendNotification('file-cache/remove', uri.toString());
	}));
	disposables.push(watcher.onDidChange(uri => {
		client.sendNotification('queue/add', uri.toString());
		client.sendNotification('file-cache/remove', uri.toString());
	}));

	// serve fileRead request
	client.onRequest('file/read', async raw => {
		const uri = vscode.Uri.parse(raw);

		if (uri.scheme === 'vscode-notebook-cell') {
			// we are dealing with a notebook
			try {
				const doc = await vscode.workspace.openTextDocument(uri);
				return new TextEncoder().encode(doc.getText());
			} catch (err) {
				console.warn(err);
				return new Uint8Array();
			}
		}

		if (vscode.workspace.fs.isWritableFileSystem(uri.scheme) === undefined) {
			// undefined means we don't know anything about these uris
			return new Uint8Array();
		}

		let data: Uint8Array;
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.size > 1024 ** 2) {
				console.warn(`IGNORING "${uri.toString()}" because it is too large (${stat.size}bytes)`);
				data = new Uint8Array();
			} else {
				data = await vscode.workspace.fs.readFile(uri);
			}
			return data;

		} catch (err) {
			// graceful
			console.warn(err);
			return new Uint8Array();
		}
	});

	return new vscode.Disposable(() => disposables.forEach(d => d.dispose()));
}