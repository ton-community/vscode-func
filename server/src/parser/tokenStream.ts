import { Token } from './tokenizer';

export class TokenStream {
    private pos = -1;

    constructor(private readonly tokens: Token[]) {}

    hasNext() {
        return this.pos+1 < this.tokens.length;
    }
    peek(): Token {
        return this.tokens[this.pos+1];
    }

    current(): Token {
        return this.tokens[Math.max(this.pos, 0)];
    }

    next(): Token {
        return this.tokens[++this.pos];
    }

    readUntil(...seps: Token['type'][]) {
        let tokens: Token[] = []
        let token: Token | undefined
        while (token = this.peek()) {
            if (seps.includes(token.type)) {
                break
            }
            tokens.push(token)
            this.next()
        }
        return tokens
    }
}