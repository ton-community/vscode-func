type Position = {
    index: number,
    line: number,
    character: number,
}

const TokenDictionary = {
    '(': 'lparen',
    ')': 'rparen',
    '{': 'lbrace',
    '}': 'rbrace',
    '[': 'lsqbracket',
    ']': 'rsqbracket',
    ',': 'comma',
    ';': 'semicolon',
} as const

export type Token = {
    position: Position,
    value: string,
    type: 'identifier' | (typeof TokenDictionary[keyof typeof TokenDictionary])
}

const Tokens = Object.keys(TokenDictionary)

class CharStream {
    private index = -1
    private currentLine = 0
    private currentCharacter = -1

    constructor(private code: string) {}

    public next() {
        let char = this.code[++this.index]
        if (char === '\n') {
            this.currentLine++
            this.currentCharacter = -1
        } else {
            this.currentCharacter++
        }
        return char
    }


    public position(): Position {
        return {
            index: this.index,
            line: this.currentLine,
            character: this.currentCharacter
        }
    }
}

export function tokenize(code: string): Token[] {
    let tokens: Token[] = []
    let iterator = new CharStream(code)
    let char: string | undefined = undefined

    let buffer = ''
    let bufferPosition: Position | undefined = undefined
    const flushBuffer = () => {
        if (buffer.length == 0) {
            return
        }

        tokens.push({
            position: bufferPosition,
            type: 'identifier',
            value: buffer
        })
        buffer = ''
        bufferPosition = undefined
    }
    while (char = iterator.next()) {
        if (char == ' ' || char == '\n' || Tokens.includes(char)) {
            flushBuffer()

            if (Tokens.includes(char)) {
                tokens.push({
                    position: iterator.position(),
                    type: TokenDictionary[char],
                    value: char
                })
            }
            continue
        }
        if (bufferPosition === undefined) {
            bufferPosition = iterator.position()
        }
        buffer += char 
    }
    flushBuffer()

    return tokens
}