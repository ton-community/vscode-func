import { parserQuery } from './utils/parserQuery';
import * as Parser from 'web-tree-sitter';
import { asLspRange } from '../utils/position';

const query = parserQuery`
(function_definition name: (function_name) @function)
(global_var_declarations _ name: (identifier) @globalVar)
`

export function queryGlobals(node: Parser.SyntaxNode) {
    return query().captures(node).map(a => ({ 
        text: a.node.text, 
        type: a.name,
        range: asLspRange(a.node),
        node: a.node
    }));
}