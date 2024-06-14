import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
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
import { defaultConfig, FuncPluginConfigScheme } from 'server/src/config-scheme';


let client: LanguageClient;


export function activate(context: vscode.ExtensionContext) {
	vscode.commands.registerCommand('func.copyToClipboard', (str: string) => {
		vscode.env.clipboard.writeText(str);
		vscode.window.showInformationMessage(`Copied ${str} to clipboard`);
	})

    startServer(context)
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

function getClientConfiguration(): FuncPluginConfigScheme {
	let obj = {} as { [k in string]: any }
	let w = vscode.workspace.getConfiguration('func');
	for (let key in defaultConfig) {
		let value = w.get(key)
		if (value !== undefined) {
			obj[key] = value
		}
	}
	return obj as FuncPluginConfigScheme
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
			fileEvents: workspace.createFileSystemWatcher('**/.func.yml')
		},
		initializationOptions: {
			clientConfig: getClientConfiguration(),
			treeSitterWasmUri: Utils.joinPath(context.extensionUri, './dist/tree-sitter.wasm').fsPath,
            langUri: Utils.joinPath(context.extensionUri,  './dist/tree-sitter-func.wasm').fsPath,
			databaseName
		}
	};

	const serverModule = context.asAbsolutePath(
		path.join('dist', 'server.js')
	);

    const serverOptions: ServerOptions = {
		run: { 
			module: serverModule, 
			transport: TransportKind.ipc
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: { execArgv: ['--nolazy', '--inspect=6009'] }	// same port as in .vscode/launch.json
		}
	};
    client = new LanguageClient(
		'funcServer',
		'FunC Language Server',
		serverOptions,
		clientOptions
	);

	await client.start();

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
				return { type: 'not-found' };
			}
		}

		if (vscode.workspace.fs.isWritableFileSystem(uri.scheme) === undefined) {
			// undefined means we don't know anything about these uris
			return { type: 'not-found' };
		}

		let data: Uint8Array;
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.size > 1024 ** 2) {
				console.warn(`IGNORING "${uri.toString()}" because it is too large (${stat.size}bytes)`);
				data = Buffer.from(new Uint8Array());
			} else {
				data = await vscode.workspace.fs.readFile(uri);
			}
			return data;
		} catch (err) {
			if (err instanceof vscode.FileSystemError) {
				return { type: 'not-found' };
			}
			// graceful
			console.warn(err);
			return { type: 'not-found' };
		}
	});

	client.onRequest('completion/matching-files', async (raw: { pathPrefix: string, uri: string }) => {
		const uri = vscode.Uri.parse(raw.uri);
		let searchDirName = Utils.joinPath(uri, '..', raw.pathPrefix, (raw.pathPrefix.trim().length === 0 || raw.pathPrefix.endsWith(path.sep)) ? '' : '..');
		let toSearch = raw.pathPrefix.split(path.sep).pop() ?? '';

		try {
			let files = await vscode.workspace.fs.readDirectory(searchDirName);
			return files
				.filter(([path, type]) => {
					if (path === toSearch) return false;

					return path.startsWith(toSearch) && (type !== vscode.FileType.File || path.endsWith('.fc'));
				})
				.map(([segment, type]) => {
					if (type === vscode.FileType.Directory) {
						return segment + path.sep;
					}
					return segment;
				});
		} catch {
			return [];
		}
	});

	// notify at configuration change
	vscode.workspace.onDidChangeConfiguration((change) => {
		if (change.affectsConfiguration('func')) {
			client.sendNotification('configuration/change', getClientConfiguration());
		}
	})

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
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: '[FunC] Building Index...' }, () => Promise.race([init(), initCancel]));

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

	return new vscode.Disposable(() => disposables.forEach(d => d.dispose()));
}