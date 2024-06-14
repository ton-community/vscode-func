import * as Parser from 'web-tree-sitter';
import { FuncType, inferVariableTypeFromDeclaration } from '../features/typeInference';
import * as lsp from 'vscode-languageserver';

export interface FoundLocalSymbol {
    node: Parser.SyntaxNode,
    declaration: Parser.SyntaxNode,
    kind: 'variable',
    type: FuncType,
    text: string
}

export interface FoundGlobalSymbol {
    kind: lsp.SymbolKind
    type: FuncType
    name: string
}

export function findLocals(rootNode: Parser.SyntaxNode, cursorPosition: Parser.Point): FoundLocalSymbol[] {
    let descendant: Parser.SyntaxNode | null = rootNode.descendantForPosition(cursorPosition);

    let result: FoundLocalSymbol[] = [];

    // navigate through parents and find their variables declared higher than cursor
    while (descendant) {
        while (descendant && descendant.type !== 'block_statement') {
            descendant = descendant.parent;
        }
        if (!descendant) {
            continue;
        }
        for (let child of descendant.children) {
            if (child.type === 'statement' && child.children[0].type === 'expression_statement') {
                child = child.children[0];
                
                let variableDeclarations = child.descendantsOfType('variable_declaration', undefined, cursorPosition);
                for (let varDec of variableDeclarations) {
                    let identifiers = varDec.descendantsOfType('identifier', undefined, cursorPosition);
                    result.push(...identifiers.map(a => ({
                        node: a,
                        declaration: varDec,
                        kind: 'variable' as 'variable', // Typescript wtf???
                        text: a.text,
                        type: inferVariableTypeFromDeclaration(varDec)
                    })))
                }
            }
        }

        descendant = descendant.parent;
        if (descendant && descendant.type === 'function_definition') {
            let parameters = descendant.childForFieldName('arguments')?.descendantsOfType('parameter_declaration') || [];
            for (let param of parameters) {
                let node = param.childForFieldName('name');
                if (!node) continue;
                
                result.push({
                    node: node,
                    declaration: param,
                    kind: 'variable' as 'variable', // Typescript wtf???
                    text: node.text,
                    type: inferVariableTypeFromDeclaration(param)
                });
            }
        }
    }
    return result;
}