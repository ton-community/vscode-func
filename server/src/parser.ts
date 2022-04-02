import * as Parser from 'tree-sitter';
import * as FuncLanguage from 'tree-sitter-func-language';


export const createParser = () => {
    const parser = new Parser();
    parser.setLanguage(FuncLanguage);
    return parser
}