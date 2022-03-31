import { tokenize } from './tokenizer'

it('should tokenize', () => {
    let tokens = tokenize('test kek() impure {\n} kek');

    expect(tokens.length).toEqual(8);
})