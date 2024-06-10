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
    arguments: {
        name?: string,
        type: FuncType
    }[],
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

export function extractType(typeNode: Parser.SyntaxNode): FuncType {
    if (typeNode.type === 'primitive_type') {
        return {
            kind: 'primitive',
            name: typeNode.text as PrimitiveType['name']
        };
    } else if (typeNode.type === 'tensor_type' || typeNode.type === 'tuple_type') {
        return {
            kind: typeNode.type === 'tensor_type' ? 'tensor' : 'tuple',
            shape: typeNode.children.map(a => extractType(a))
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
        return extractType(variableType!);
    } else if (node.type === 'parameter_declaration' || node.type === 'global_var_declaration' || node.type === 'constant_declaration') {
        let type = node.childForFieldName('type');
        return extractType(type!);
    }
    return { kind: 'var' };
}

export function inferFunctionType(node: Parser.SyntaxNode): FuncType {
    if (node.type === 'function_definition') {
        // return_type
        let returnType = node.childForFieldName('return_type');
        let parameters = node.descendantsOfType('parameter_declaration');
        return {
            kind: 'function',
            arguments: parameters.map(param => ({
                name: param.childForFieldName('name')?.text,
                type: extractType(param)
            })),
            returns: extractType(returnType!)
        }
    }
    
    // fallback to hole
    return { kind: 'hole' };
}

export function stringifyType(type: FuncType): string {
    if (type.kind === 'primitive') {
        return type.name;
    } else if (type.kind === 'function') {
        let args = type.arguments.map(a => {
            let type = stringifyType(a.type);
            if (a.name) return `${type} ${a.name}`;
            return type;
        }).join(', ');
        return `(${args}) -> ${stringifyType(type.returns)}`;
    } else if (type.kind === 'var') {
        return 'var';
    } else if (type.kind === 'unit') {
        return '()';
    } else if (type.kind === 'hole') {
        return '_';
    } else if (type.kind === 'generic') {
        return type.name;
    } else if (type.kind === 'tensor') {
        return `(${type.shape.map(a => stringifyType(a)).join(', ')})`;
    } else if (type.kind === 'tuple') {
        return `(${type.shape.map(a => stringifyType(a)).join(', ')})`;
    }
    return '_';
}