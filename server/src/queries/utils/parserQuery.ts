import * as Parser from 'tree-sitter';
import * as FuncLanguage from 'tree-sitter-func-language';

export function parserQuery(text: TemplateStringsArray) {
    return new Parser.Query(FuncLanguage, text.toString());
}