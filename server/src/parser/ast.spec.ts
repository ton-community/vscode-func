import { buildAstFromTokens } from './ast'
import { tokenize } from './tokenizer'


const code = `
global var test;
global ((int, int) -> int) op;
global cop;

global (int, int) testtensorvar;
global [int, int] testtuplevar;

(int) function(var a, slice b) inline {
    
}

`

it('should parse simple ast', () => {
    let tokens = tokenize(code)
    buildAstFromTokens(tokens)
})