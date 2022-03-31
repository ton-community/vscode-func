import { Token } from './tokenizer';
import { TokenStream } from './tokenStream';

type AstNode = Root | Identifier | Literal | VariableDeclaration | VariableDeclarator | FunctionDeclaration | BlockStatement | Modifier
interface Root { type: 'root', body: AstNode[] }
interface Identifier { type: 'identifier', name: string }
interface Modifier { type: 'modifier', name: string }
interface Literal { type: 'literal', name: string }

interface VariableDeclaration { 
    type: 'variable_declaration',
    declarations: VariableDeclarator[]
 }
interface VariableDeclarator {
    type: 'variable_declarator',
    id: Identifier,
    typeDef: Type
}
interface FunctionDeclaration { 
    type: 'function_declaration',
    id: Identifier,
    arguments: FunctionArguments,
    returnType: Type,
    modifiers: Modifier[]
    body: BlockStatement
}
interface FunctionArguments {
    type: 'function_arguments',
    declarations: VariableDeclarator[]
}
type Type = AtomicType | TensorType | TupleType | FunctionType | HoleType
interface TensorType {
    type: 'tensor_type'
    values: Type[]
}
interface TupleType {
    type: 'tuple_type'
    values: Type[]
}
interface FunctionType {
    type: 'function_type'
    args: Type
    returnType: Type
}
interface AtomicType {
    type: 'atomic_type'
    name: string
}
interface HoleType {
    type: 'hole_type'
}
interface BlockStatement {
    type: 'block_statement'
    body: AstNode[]
}

function parseIdentifier(tokens: TokenStream): Identifier {
    let id = tokens.next()
    if (id.type !== 'identifier') {
        // error
    }

    return {
        name: id.value,
        type: 'identifier'
    }
}

function parseArguments(tokens: TokenStream) {
    let args: FunctionArguments = {
        type: 'function_arguments',
        declarations: []
    }
    while (true) {
        let type = parseTypeDefinition(tokens)
        let id = parseIdentifier(tokens)
        args.declarations.push({
            id,
            typeDef: type,
            type: 'variable_declarator'
        })
        if (tokens.peek().type !== 'comma') {
            break
        }
        tokens.next()
    }
    return args
}

function parseVariableDeclarator(tokens: TokenStream): VariableDeclarator {
    let type = parseTypeDefinition(tokens);
    let identifier = parseIdentifier(tokens);

    return {
        id: identifier,
        typeDef: type,
        type: 'variable_declarator',
    }
}

function parseBlockStatement(tokens: TokenStream): BlockStatement {
    let bracketStack: ('{' | '(' | '[')[] = []
    if (tokens.peek().type !== 'lbrace') {
        console.log('invalid block statement')
    } else {
        tokens.next()
        bracketStack.push('{')
    }
    while (bracketStack.length !== 0) {
        let next = tokens.next()
        if (next.type === 'lbrace') {
            bracketStack.unshift('{')
        }
        if (next.type === 'lparen') {
            bracketStack.unshift('(')
        }
        if (next.type === 'lsqbracket') {
            bracketStack.unshift('[')
        }

        if (
            (bracketStack[0] === '{' && next.type === 'rbrace') ||
            (bracketStack[0] === '(' && next.type === 'rparen') ||
            (bracketStack[0] === '[' && next.type === 'rsqbracket')
        ) {
            bracketStack.shift()
        }
    }
    return {
        type: 'block_statement',
        body: []
    }
}

function parseTypeDefinition(tokens: TokenStream): Type {
    const atomicTypes = ['int', 'slice', 'cell', 'builder', 'tuple', 'cont', '_', 'var']
    let peeked = tokens.peek()
    if (peeked.type === 'identifier' && !atomicTypes.includes(peeked.value)) {
        return {
            type: 'hole_type'
        }
    }
    let token = tokens.next();
    if (token.type == 'identifier') {
        return {
            type: 'atomic_type',
            name: token.value
        }
    }
    if (token.type == 'lparen') {
        let next = tokens.peek()

        if (next.type == 'rparen') {
            // empty tensor type
            tokens.next()
            return {
                type: 'tensor_type',
                values: []
            }
        }

        let firstType = parseTypeDefinition(tokens)
        next = tokens.next()
        if (next.type === 'comma') { // tensor type
            let type: Type = {
                type: 'tensor_type',
                values: [firstType]
            }
            while (next.type !== 'rparen') {
                let nextType = parseTypeDefinition(tokens)
                type.values.push(nextType)
                next = tokens.next()
            }
            return type;
        } else if (next.type === 'rparen') {
            return {
                type: 'tensor_type',
                values: [firstType]
            }
        } else if (next.value === '->') { // function type
            let returnType = parseTypeDefinition(tokens)
            next = tokens.next()
            if (next.type !== 'rparen') {
                throw new Error('missing )')
            }

            return {
                type: 'function_type',
                args: firstType,
                returnType
            }
        }
    }
    if (token.type === 'lsqbracket') {
        let next = tokens.peek()
        if (next.type === 'rsqbracket') {
            tokens.next()

            return {
                type: 'tuple_type',
                values: []
            }
        }
        let type: Type = {
            type: 'tuple_type',
            values: []
        } 
        while (next.type !== 'rsqbracket') {
            let variable = parseTypeDefinition(tokens)
            type.values.push(variable)
            next = tokens.next()
            if (next.type !== 'comma' && next.type !== 'rsqbracket') {
                // error
            }
        }
        return type
    }
    console.log(`(${token.position.line}:${token.position.character}): cannot parse type definition: unexpected token: ${token.value}`)
}

function expectSemicolon(tokens: TokenStream) {
    let next = tokens.peek()
    if (next.type !== 'semicolon') {
        console.log(`(${next.position.line}:${next.position.character}): semicolon expected, got "${next.value}"`)
        return
    }
    tokens.next()
}

export function buildAstFromTokens(tokens: Token[]): AstNode {
    let root: Root = { type: 'root', body: [] }
    let path: AstNode[] = [root]
    let tokenStream = new TokenStream(tokens)
    while (tokenStream.hasNext()) {
        let current = path[0]

        if (current.type === 'root') {
            let next = tokenStream.peek()
            if (next.value === 'global') {
                tokenStream.next()

                // variable
                let nextNode: AstNode = {
                    type: 'variable_declaration',
                    declarations: [parseVariableDeclarator(tokenStream)]
                }
                expectSemicolon(tokenStream)

                current.body.push(nextNode)
            } else {
                let returnType = parseTypeDefinition(tokenStream)
                let name = tokenStream.next()
                if (name.type !== 'identifier') {
                    throw new Error('invalid function signature')
                }
                if (tokenStream.peek().type !== 'lparen') {
                    console.log('expected \'(\' in function declaration, not ' + tokenStream.peek().value);
                } else {
                    tokenStream.next()
                }

                let args = parseArguments(tokenStream)
                if (tokenStream.peek().type !== 'rparen') {
                    console.log('expected \')\' or \',\', not ' + tokenStream.peek().value);
                } else {
                    tokenStream.next()
                }
                let modifiers = tokenStream.readUntil('lbrace')

                let nextNode: AstNode = {
                    type: 'function_declaration',
                    arguments: args,
                    returnType,
                    id: {
                        name: name.value,
                        type: 'identifier'
                    },
                    modifiers: modifiers.map(a => ({
                        type: 'modifier',
                        name: a.value
                    })),
                    body: parseBlockStatement(tokenStream),
                }
                current.body.push(nextNode)
            }
        }
    }
    console.log(JSON.stringify(root))
    return root
}