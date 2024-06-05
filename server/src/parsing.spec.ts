import * as Parser from 'web-tree-sitter'
import * as fs from 'fs'
import { createParser, initParser } from './parser'
import { queryGlobals } from './queries/globals'

function parseFunCSource(source: string): Parser.SyntaxNode {
    let parser = createParser();
    return parser.parse(source).rootNode
}

beforeAll(async () => {
    await initParser(__dirname + '/../../node_modules/web-tree-sitter/tree-sitter.wasm', __dirname + '/../tree-sitter-func.wasm');
})

it('should parse just main()', () => {
    let rootNode = parseFunCSource(`
int main() pure {
    return 0;
}
`);
    let f_main = rootNode.firstChild!
    expect(f_main.type).toBe('function_definition')
    expect(f_main.childForFieldName("return_type")?.text).toBe('int')
    expect(f_main.childForFieldName("specifiers")?.text).toContain('pure')
    expect(f_main.child(4)?.type).toBe('block_statement')
})

it('should parse stdlib.fc', () => {
    let rootNode = parseFunCSource(fs.readFileSync(__dirname + '/../../tree-sitter-func/examples/stdlib.fc', 'utf-8'))
    let functions = rootNode.children.filter(n => n.type === 'function_definition')
    expect(rootNode.hasError()).toBeFalsy()
    expect(functions.length).toBe(175)
    expect(rootNode.firstChild!.type).toBe('comment')
    expect(functions[0].firstChild?.type).toBe('type_variables_list')
    expect(functions[0].firstChild?.text).toBe('forall X ->')
    expect(rootNode.lastChild!.childForFieldName("return_type")?.type).toBe('unit_type')
})

it('should parse comments', () => {
    let rootNode = parseFunCSource(`
{-
begin
{- nested -}
end
-}
/* also /* nested */ end */

;; line
// line

{- ;; line and end -}
/* // line and end */
    `)
    let comments = rootNode.children.filter(c => c.type === 'comment')
    expect(rootNode.childCount).toBe(comments.length)
})

it('should parse get methods', () => {
    let rootNode = parseFunCSource(`
int f1() { }

int exported1() method_id {}
_ exported2() impure method_id {}
(slice, ()) exported3(int a) pure method_id(123) {}

int main() { return f1(); } 
    `)
    // the code below is taken from ton-verifier
    const getters = rootNode.children.filter(c =>
        c.type === "function_definition" &&
        c.children.find(n => n.type === "specifiers_list")?.text.includes("method_id"),
    );

    const gettersParsed = getters.map((f: Parser.SyntaxNode) => {
        return {
            returnTypes: f.children[0].children
                .filter((c) => !c.type.match(/[,()]/))
                .map((c) => c.text),
            name: f.children.find((n) => n.type === "function_name")!.text,
            parameters: f.children
                .find((n) => n.type === "parameter_list")!
                .children.filter((c) => c.type === "parameter_declaration")
                .map((c) => ({
                    type: c.child(0)!.text,
                    name: c.child(1)!.text,
                })),
        };
    });

    expect(gettersParsed).toEqual([
        { returnTypes: ['int'], name: 'exported1', parameters: [] },
        { returnTypes: ['_'], name: 'exported2', parameters: [] },
        { returnTypes: ['slice', '()'], name: 'exported3', parameters: [{ type: 'int', name: 'a' }] },
    ])
})