import { TextDocument } from 'vscode-languageserver-textdocument'
import { readdir, readFile, stat } from 'fs/promises'
import { connection } from './connection'
import * as path from 'path'
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver'


const findFilesRecursively = async (rootDir: string, pattern: RegExp) => {
    let found: string[] = []

    let stack: string[] = [rootDir] 
    while (stack.length > 0) {
        let nextDir = stack.shift()
        let entries = await readdir(nextDir)
        for (let entry of entries) {
            let entryPath = path.resolve(nextDir, entry)
            // Do not allow node_modules deeper than 1
            if (entry == "node_modules" && path.relative(rootDir, nextDir).includes("node_modules")) {
                continue
            }
            if (entryPath.includes("output/")) {
                continue
            }
            let dt = await stat(entryPath)
            if (dt.isDirectory()) {
                stack.push(entryPath)
            } else {
                if (pattern.test(entry)) {
                    if (entryPath.includes("node_modules/")) {
                        if (entry !== 'stdlib.fc') {
                            continue
                        }
                    }
                    found.push(entryPath)
                }
            }
        }
    }

    return found
}

export class FuncContext {
    private globalVariables: any[] = []
    private functionDeclarations: any[] = []
    private rootPath: string | undefined = undefined
    

    constructor(rootPath: string) {
        this.rootPath = rootPath
        if (this.rootPath.startsWith('file://')) {
            this.rootPath = this.rootPath.slice(7)
        }
    }

    setRoot(rootPath: string) {
        this.rootPath = rootPath
    }

    onFileChange() {
        console.log('file changed')
    }
    
    async analyzeRoot() {
        if (!this.rootPath) {
            connection.console.warn('[func-context] analyzeRoot called without root path set')
            return
        }

        connection.console.warn(`[func-context] analyzeRoot for ${this.rootPath}`)

        let files = await findFilesRecursively(this.rootPath, /.+(\.fc)$/)
        for (let file of files) {
            await this.analyze(file)
        }
        console.log(files)
    }

    async analyze(uri: string) {
        return;
        
	    // The validator creates diagnostics for all uppercase words length 2 and more
	    const text = await readFile(uri, {
            encoding: 'utf-8'
        });
        let linesState = text.split('\n').reduce<{ 
            length: number,
            lines: { startAt: number, content: string }[]
         }>((data, line) => {
             data.lines.push({
                 startAt: data.length,
                 content: line
             })
             data.length += line.length + 1

             return data
        }, { length: 0, lines: [] });
        const findPosition = (index: number) => {
            let line = linesState.lines.findIndex(a => a.startAt > index)
            if (line == -1) {
                line = linesState.lines.length
            }
            line--;
            return {
                line,
                character: index - linesState.lines[line].startAt
            }
        }

	    const pattern = /\b[A-Z]{2,}\b/g;
	    let m: RegExpExecArray | null;

	    let problems = 0;
	    const diagnostics: Diagnostic[] = [];
	    while ((m = pattern.exec(text))) {
            pattern.lastIndex
		    problems++;
		    const diagnostic: Diagnostic = {
			    severity: DiagnosticSeverity.Warning,
			    range: {
				    start: findPosition(m.index),
				    end: findPosition(m.index + m[0].length)
			    },
			    message: `${m[0]} is all uppercase.`,
			    source: 'ex'
		    };
		    diagnostic.relatedInformation = [
                {
                    location: {
                        uri: uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Spelling matters'
                },
                {
                    location: {
                        uri: uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Particularly for names'
                }
            ];
		    diagnostics.push(diagnostic);
	    }
	    connection.sendDiagnostics({ uri: uri, diagnostics });
    }
}