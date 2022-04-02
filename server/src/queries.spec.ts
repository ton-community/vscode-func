import { createParser } from './parser'
import { queryGlobals } from './queries/globals';

it('should query globals', () => {
    let parser = createParser();
    let tree = parser.parse(`
        global var id;

        () test() {
            if (id == 1) {
                int i = 0;
            }
            int a = 0;
        }
    `)

    let globals = queryGlobals(tree.rootNode);
    expect(globals).toMatchSnapshot();
})