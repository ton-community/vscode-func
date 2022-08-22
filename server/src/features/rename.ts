import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';
import { asLspRange, asParserPoint } from '../utils/position';
import { findLocals } from '../queries/locals';
import * as Parser from 'web-tree-sitter';

function findParentBlock(node: Parser.SyntaxNode) {
    let parent = node.parent;
    while (parent.type !== 'block_statement') {
        parent = parent.parent;
        if (!parent) {
            break;
        }
    }
    return parent;
}

function compare(point1: Parser.Point, point2: Parser.Point) {
    if (point1.row < point2.row) {
        return -1;
    }
    if (point1.row > point2.row) {
        return 1;
    }
    if (point1.column < point2.column) {
        return -1;
    }
    if (point1.column > point2.column) {
        return 1;
    }
    return 0;
}

function findChildrenWithType(node: Parser.SyntaxNode, type: string, startPosition?: Parser.Point, endPosition?: Parser.Point) {
    let result: Parser.SyntaxNode[] = [];
    const visit = (node: Parser.SyntaxNode) => {
        if (node.type === type) {
            console.log('kek', compare(startPosition, node.startPosition) <= 0);
            console.log('lol', compare(endPosition, node.endPosition) >= 0, endPosition, node.endPosition);
        }
        if (
            node.type === type && 
            (!startPosition || (compare(startPosition, node.startPosition) <= 0)) && 
            (!endPosition || (compare(endPosition, node.endPosition) >= 0))
        ) {
            result.push(node);
        }
        for (let child of node.children) {
            visit(child);
        }
    }
    visit(node);
    return result;
}

export class RenameProvider {
	constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees, private readonly _symbols: SymbolIndex) { }

	register(connection: lsp.Connection) {
        connection.client.register(lsp.RenameRequest.type);
		connection.onRequest(lsp.RenameRequest.type, this.performRename.bind(this));
	}

	async performRename(params: lsp.RenameParams): Promise<lsp.WorkspaceEdit | null> {
        let tree = await this._trees.getParseTree(params.textDocument.uri);
        let document = this._documents.get(params.textDocument.uri);
        let oldIdentifier = tree.rootNode.descendantForPosition(asParserPoint(params.position));

        // try to find declaration
        let locals = findLocals(tree.rootNode, oldIdentifier.endPosition);
        let localDeclaration = locals.find(a => a.text === oldIdentifier.text);
        if (localDeclaration) {
            // rename to the end of block
            let parentBlock = findParentBlock(localDeclaration.node);
            let identifiers = findChildrenWithType(parentBlock, 'identifier', localDeclaration.node.startPosition, parentBlock.endPosition);
            let needToRename = identifiers.filter(a => a.text === oldIdentifier.text);
            console.log(needToRename);
            return {
                changes: {
                    [params.textDocument.uri]: needToRename.map(a => ({
                        range: asLspRange(a),
                        newText: params.newName
                    }))
                }
            }
        } else {
            return null;
        }
	}
}