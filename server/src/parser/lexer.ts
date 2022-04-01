import { createToken, Lexer } from 'chevrotain'


export const True = createToken({ name: "True", pattern: /true/ })
export const False = createToken({ name: "False", pattern: /false/ })
export const Null = createToken({ name: "Null", pattern: /null/ }) 
export const LCurly = createToken({ name: "LCurly", pattern: /{/ })
export const RCurly = createToken({ name: "RCurly", pattern: /}/ })
export const LSquare = createToken({ name: "LSquare", pattern: /\[/ })
export const RSquare = createToken({ name: "RSquare", pattern: /]/ })
export const LParen = createToken({ name: 'LParen', pattern: /\(/ })
export const RParen = createToken({ name: 'RParen', pattern: /\)/ })
export const Comma = createToken({ name: "Comma", pattern: /,/ })
export const Semicolon = createToken({ name: "Semicolon", pattern: /;/ })
export const GlobalModifier = createToken({ name: "GlobalModifier", pattern: /global/ })
export const AtomicType = createToken({ name: 'AtomicType', pattern: /var|int|slice|tuple|cell|builder|cont|_/ })
export const IfKeyword = createToken({ name: 'IfKeyword', pattern: /if/ })
export const AsmKeyword = createToken({ name: 'AsmKeyword', pattern: /asm/ })
export const ForallKeyword = createToken({ name: 'AsmKeyword', pattern: /forall/ })
export const FunctionModifier = createToken({ name: "FunctionModifier", pattern: /impure|method_id|inline|inline_ref/ })
export const FunctionArrowOperator = createToken({ name: 'FunctionArrowOperator', pattern: /\-\>/ })
export const EqualityOperator = createToken({ name: 'EqualityOperator', pattern: /=/ })
export const Operator = createToken({ name: 'Operator', pattern: /(\<==\>|([~\-=])|((\<\<|\>\>|\^\>\>|\^\<\<|([\*\/\%\&\+\|\^\<\>])|([~\^]\/)|([~\^\/]\%))=)|(\<\<|\>\>|\^\>\>|\^\<\<|([\*\/\%\&\+\|\^\<\>])|([~\^]\/)|([~\^\/]\%)))/ })
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(:?[^\\"]|\\(:?[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/,

  })
export const NumberLiteral = createToken({
    name: "NumberLiteral",
    pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/
})
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t\n\r]+/,
    group: Lexer.SKIPPED
})
export const Identifier = createToken({
    name: "Identifier",
    pattern: /(`([^`]+)`|(?=_[\w\d]*)(_([^;,\[\]\(\)\s~.\{\}]+))|(?![_`][\w\d]*)([^;,\[\]\(\)\s~.\{\}]+))/
})

LCurly.LABEL = '{'
RCurly.LABEL = '}'
LSquare.LABEL = '['
RSquare.LABEL = ']'
LParen.LABEL = '('
RParen.LABEL = ')'
Comma.LABEL = ','
Semicolon.LABEL = ';'
FunctionArrowOperator.LABEL = '->'
EqualityOperator.LABEL = '='
IfKeyword.LABEL = 'if'


export const funcTokens = [
    True, False, Null, 
    LCurly, RCurly, LSquare,
    RSquare, LParen, RParen,
    Comma, Semicolon, StringLiteral,
    GlobalModifier, 
    NumberLiteral, WhiteSpace,
    AtomicType,
    EqualityOperator,
    FunctionArrowOperator,
    IfKeyword,
    AsmKeyword,
    ForallKeyword,
    FunctionModifier,
    Operator,
    Identifier,
]

export const FuncLexer = new Lexer(funcTokens, {
    positionTracking: "onlyOffset"
})
