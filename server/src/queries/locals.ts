import * as Parser from 'web-tree-sitter';

export function findLocals(rootNode: Parser.SyntaxNode, cursorPosition: Parser.Point) {
    let descendant = rootNode.descendantForPosition(cursorPosition);
    
    let result: {
        node: Parser.SyntaxNode,
        kind: 'variable',
        text: string
    }[] = [];
    // navigate through parents and find their variables declared higher than cursor
    while (descendant) {
        while (descendant && descendant.type !== 'block_statement') {
            descendant = descendant.parent;
        }
        if (!descendant) {
            continue;
        }
        for (let child of descendant.children) {
            if (child.type == 'expression_statement') {
                let variableDeclarations = child.descendantsOfType('variable_declaration', null, cursorPosition);
                for (let varDec of variableDeclarations) {
                    let identifiers = varDec.descendantsOfType('identifier', null, cursorPosition);
                    result.push(...identifiers.map(a => ({
                        node: a,
                        kind: 'variable' as 'variable', // Typescript wtf???
                        text: a.text,
                    })))
                }
            }
        }
        descendant = descendant.parent;
    }
    return result;
}