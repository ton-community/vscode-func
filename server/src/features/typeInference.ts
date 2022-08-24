import { type } from 'os';
import * as Parser from 'web-tree-sitter';

type PrimitiveType = {
    kind: 'primitive',
    name: 'int' | 'cell' | 'slice' | 'builder' | 'cont' | 'tuple'
}

type CompositeType = {
    kind: 'tensor' | 'tuple',
    shape: FuncType[]
}

export type FunctionType = {
    kind: 'function',
    arguments: FuncType[],
    returns: FuncType
}

type GenericType = {
    kind: 'generic',
    name: string
}

type UnitType = { kind: 'unit' }
type VarType = { kind: 'var' }
type HoleType = { kind: 'hole' }

export type AtomicType = PrimitiveType | UnitType | VarType | HoleType | GenericType | CompositeType; 

export type FuncType = AtomicType | FunctionType;

export function inferType(typeNode: Parser.SyntaxNode): FuncType {
    if (typeNode.type === 'primitive_type') {
        return {
            kind: 'primitive',
            name: typeNode.text as PrimitiveType['name']
        };
    } else if (typeNode.type === 'tensor_type' || typeNode.type === 'tuple_type') {
        return {
            kind: typeNode.type === 'tensor_type' ? 'tensor' : 'tuple',
            shape: typeNode.children.map(a => inferType(a))
        }
    } else if (typeNode.type === 'var_type') {
        return { kind: 'var' }
    } else if (typeNode.type === 'hole_type') {
        return { kind: 'var' }
    } else if (typeNode.type === 'unit_type') {
        return { kind: 'unit' }
    }

    // fallback to var
    return { kind: 'var' };
}

/**
 * Supports paremeter declaration and variable declaration
 */
export function inferVariableTypeFromDeclaration(node: Parser.SyntaxNode): FuncType {
    if (node.type === 'variable_declaration') {
        let variableType = node.childForFieldName('type')!.child(0);
        return inferType(variableType!);
    } else if (node.type === 'parameter_declaration') {
        let type = node.childForFieldName('type');
        return inferType(type!);
    }
    return { kind: 'var' };
}

export function inferFunctionType(node: Parser.SyntaxNode): FuncType {
    if (node.type === 'function_definition') {
        // return_type
        return {
            kind: 'function',
            arguments: [{
                kind: 'primitive',
                name: 'int'
            }, {
                kind: 'primitive',
                name: 'int'
            }],
            returns: {
                kind: 'primitive',
                name: 'slice'
            }
        }
    }
    
    // fallback to hole
    return { kind: 'hole' };
}