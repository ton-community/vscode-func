import { parserQuery } from './utils/parserQuery';
import * as Parser from 'web-tree-sitter';

const query = parserQuery`
(include_directive) @include
(pragma_directive) @pragma
`

export function queryDirectives(node: Parser.SyntaxNode) {
    let captures = query().captures(node);
    let includes = captures.filter(a => a.name === 'include');
    let pramgas = captures.filter(a => a.name === 'pragma');

    return {
        includes: includes.map(a => ({
            path: a.node.childForFieldName('path').text,
            node: a.node,
        })),
        pramgas: pramgas.map(a => ({
            key: a.node.childForFieldName('key').text,
            value: a.node.childForFieldName('value').text,
            node: a.node
        }))
    }
}