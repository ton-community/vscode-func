import { CstParser } from 'chevrotain';
import { 
    AsmKeyword, AtomicType, Comma,
    EqualityOperator,
    FuncLexer, FunctionArrowOperator, 
    FunctionModifier, funcTokens, GlobalModifier, 
    Identifier, IfKeyword, LCurly, LParen, LSquare, 
    RCurly, RParen, RSquare, Semicolon, 
    StringLiteral
} from './lexer';


export class FuncParser extends CstParser {
    constructor() {
        super(funcTokens)
        this.performSelfAnalysis()
    }

    public func = this.RULE("func", () => {
        this.MANY({
            DEF: () => {
                this.OR([
                    { ALT: () => this.SUBRULE(this.function) },
                    { ALT: () => this.SUBRULE(this.globalVariable) }
                ])
            }
        })
    })

    //#region Root rules
    private function = this.RULE('function', () => {
        this.SUBRULE(this.typeDeclaration);
        this.CONSUME(Identifier);
        this.CONSUME(LParen);
        this.SUBRULE(this.functionParameters);
        this.CONSUME(RParen);
        this.MANY({
            DEF: () => this.CONSUME(FunctionModifier)
        })
        this.OR([
            {
                ALT: () => {
                    this.SUBRULE(this.blockStatement)
                }
            },
            {
                ALT: () => this.SUBRULE(this.asmReference)
            }
        ])
    })

    private globalVariable = this.RULE('globalVariable', () => {
        this.CONSUME(GlobalModifier);
        this.OR([
            {
                ALT: () => {
                    this.SUBRULE(this.typeDeclaration);
                    this.CONSUME(Identifier);
                }
            }, {
                ALT: () => {
                    this.CONSUME1(Identifier);
                }
            }
        ])
        this.CONSUME(Semicolon);
    })
    //#endregion

    private functionParameters = this.RULE('functionParameters', () => {
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => {
                this.SUBRULE(this.parameterDeclaration);
            }
        })
    })

    private parameterDeclaration = this.RULE('parameterDeclaration', () => {
        this.SUBRULE(this.typeDeclaration);
        this.CONSUME(Identifier);
    })

    private asmReference = this.RULE('asmReference', () => {
        this.CONSUME(AsmKeyword);
        this.CONSUME(StringLiteral);
        this.CONSUME(Semicolon);
    })

    private blockStatement = this.RULE('blockStatement', () => {
        this.CONSUME(LCurly);
        this.MANY({
            DEF: () => this.SUBRULE(this.blockExpression)
        })
        this.CONSUME(RCurly);
    })
    private blockExpression = this.RULE('blockExpression', () => {
        this.OR([
            {
                ALT: () => {
                    this.SUBRULE(this.simpleExpression);
                    this.CONSUME(Semicolon);
                }             
            }, {
                ALT: () => {
                    this.SUBRULE(this.controlExpression);
                }
            }
        ])
    })


    //#region Simple expression
    private simpleExpression = this.RULE('simpleExpression', () => {
        this.OR([
            {
                ALT: () => this.SUBRULE(this.assignExpression)
            }, {
                ALT: () => this.SUBRULE(this.callExpression)
            }, {
                ALT: () => this.CONSUME(Identifier)
            }
        ])
    })

    private callExpression = this.RULE('callExpression', () => {
        this.CONSUME(Identifier);
        this.CONSUME(LParen);
        this.MANY_SEP({
            DEF: () => this.SUBRULE(this.simpleExpression),
            SEP: Comma,
        })
        this.CONSUME(RParen);
    })

    private assignExpression = this.RULE('assignExpression', () => {
        this.SUBRULE(this.identifierGroup);
        this.CONSUME(EqualityOperator);
        this.SUBRULE(this.simpleExpression);
    })

    private identifierGroup = this.RULE('identifierGroup', () => {
        this.OPTION({
            DEF: () => this.SUBRULE(this.typeDeclaration),
        })
        this.OR([
            {
                ALT: () => this.CONSUME(Identifier)
            },
            {
                ALT: () => {
                    this.CONSUME(LParen);
                    this.MANY_SEP({
                        SEP: Comma,
                        DEF: () => this.SUBRULE1(this.identifierGroup)
                    })
                    this.CONSUME(RParen);
                }
            },
            {
                ALT: () => {
                    this.CONSUME(LSquare);
                    this.MANY_SEP1({
                        SEP: Comma,
                        DEF: () => this.SUBRULE2(this.identifierGroup)
                    })
                    this.CONSUME(RSquare);
                }
            }
        ])
    })
    //#endregion

    //#region Control expression
    private controlExpression = this.RULE('controlExpression', () => {
        this.CONSUME(IfKeyword);
        this.SUBRULE(this.blockStatement);
    })
    //#endregion

    //#region Type declaration
    private typeDeclaration = this.RULE('typeDeclaration', () => {
        this.OR({
            DEF: [
                { ALT: () => this.CONSUME(AtomicType) },
                { ALT: () => this.SUBRULE(this.tupleType) },
                { 
                    ALT: () => this.SUBRULE(this.tensorType),
                    GATE: this.BACKTRACK(this.tensorType),
                },
                { 
                    ALT: () => this.SUBRULE(this.wrappedFunctionalType),
                    GATE: this.BACKTRACK(this.wrappedFunctionalType)
                }
            ]
        })
    })

    private tensorType = this.RULE('tensorType', () => {
        this.CONSUME(LParen);
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.typeDeclaration)
        });
        this.CONSUME(RParen);
    })

    private tupleType = this.RULE('tupleType', () => {
        this.CONSUME(LSquare)
        this.MANY_SEP({
            SEP: Comma,
            DEF: () => this.SUBRULE(this.typeDeclaration)
        })
        this.CONSUME(RSquare)
    })

    private wrappedFunctionalType = this.RULE('wrappedFunctionalType', () => {
        this.CONSUME(LParen);
        this.SUBRULE(this.functionalType);
        this.CONSUME(RParen);
    })

    private functionalType = this.RULE('functionalType', () => {
        this.SUBRULE(this.typeDeclaration);
        this.CONSUME(FunctionArrowOperator);
        this.SUBRULE1(this.typeDeclaration);
    })
    //#endregion
}


export function parseFunc(text: string) {
    let parser = new FuncParser()

    const lexResult = FuncLexer.tokenize(text)
    parser.input = lexResult.tokens
    const cst = parser.func()
  
    // this would be a TypeScript compilation error because our parser now has a clear API.
    // let value = parser.json_OopsTypo()
  
    return {
      cst: cst,
      lexErrors: lexResult.errors,
      parseErrors: parser.errors
    }
  }