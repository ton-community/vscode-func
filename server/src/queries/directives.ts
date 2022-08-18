import { parserQuery } from './utils/parserQuery';
import * as Parser from 'web-tree-sitter';

const query = parserQuery`
(include_directive) @include
(pragma_directive) @pragma
`

export function queryDirectives(node: Parser.SyntaxNode) {
    return query().captures(node);
}