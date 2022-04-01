import { FuncLexer } from './lexer'

it('should tokenize', () => {
    let tokens = FuncLexer.tokenize('test kek() impure {\n} kek');

    console.log(JSON.stringify(tokens))
    expect(tokens.tokens.length).toEqual(8);
})