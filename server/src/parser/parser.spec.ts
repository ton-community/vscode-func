import { createSyntaxDiagramsCode } from 'chevrotain'
import { writeFile } from 'fs/promises'
import { FuncLexer } from './lexer'
import { FuncParser, parseFunc } from './parser'


const code = `
global var test;
global ((int, int) -> int) op;
global cop;

global (int, int) testtensorvar;
global [int, int] testtuplevar;

slice test_asm() asm "TESTASM";


var kek(int a) inline {
    var lol = a;
    if {
        test_asm();
    }
}

`

it('should parse simple ast', async () => {
    //console.log(JSON.stringify(FuncLexer.tokenize(code)))
    console.log(JSON.stringify(parseFunc(code)))

    await writeFile(__dirname + "/docs/diagram.html", createSyntaxDiagramsCode(new FuncParser().getSerializedGastProductions()))
})