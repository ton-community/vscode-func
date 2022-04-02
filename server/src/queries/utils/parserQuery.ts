import * as Parser from 'web-tree-sitter';
import { language } from '../../parser';

export function parserQuery(text: TemplateStringsArray) {
    return () => {
        return language.query(text.toString())
    }
}