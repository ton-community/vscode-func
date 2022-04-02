import * as path from 'path';
import * as os from 'os';
import * as Parser from 'web-tree-sitter';
import { existsSync } from 'fs';


export let language: Parser.Language

export const initParser = async (uri: string) => {
    if (language) {
        return;
    }
    if (!existsSync(uri)) {
        uri = uri.slice('file://'.length)
    }
    const options: object | undefined = {
		locateFile() {
			return uri
		}
	};
    await Parser.init(options)
    language = await Parser.Language.load(path.resolve(__dirname + '/../tree-sitter-func.wasm'))

}

export const createParser = () => {
    const parser = new Parser();
    parser.setLanguage(language);
    return parser
}