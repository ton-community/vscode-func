const {commaSep, commaSep1, commaSep2} = require('./utils.js')

module.exports = {
  // non-terminals are mostly borrowed from original parse-func.cpp (to be changed later)
  // original parser assigns some flags (_IsLvalue, _IsRvalue, _IsNewVar, _IsType, ...) to every non-terminal symbol match and sometimes checks their fitness
  // we mostly ignore this aspect, so we actually accept wider class of expression-like strings
  // and ofcourse we don't do typechecking (it's not grammar task to do so)
  expression: $ => $._expr10,

  _expr10: $ => prec(10, seq(
    $._expr13,
    optional(seq(
      choice('=', '+=', '-=', '*=', '/=', '~/=', '^/=', '%=', '~%=', '^%=',
             '<<=', '>>=', '~>>=', '^>>=', '&=', '|=', '^='),
      $._expr10
    )),
  )),

  _expr13: $ => prec(13, seq(
    $._expr14,
    optional(seq(
      '?',
      $.expression,
      ':',
      $._expr13
    ))
  )),

  _expr14: $ => prec(14, seq(
    $._expr15,
    repeat(seq(
      choice('&', '|', '^'),
      $._expr15,
    ))
  )),

  _expr15: $ => prec(15, seq(
    $._expr17,
    optional(seq(
      choice('==', '<', '>', '<=', '>=', '!=', '<=>'),
      $._expr17
    ))
  )),

  _expr17: $ => prec.left(17, seq(
    $._expr20,
    repeat(seq(
      choice('<<', '>>', '~>>', '^>>'),
      $._expr20
    ))
  )),

  _expr20: $ => prec.left(20, seq(
    optional('-'),
    $._expr30,
    repeat(seq(
      choice('-', '+'),
      $._expr30
    ))
  )),

  _expr30: $ => prec.left(30, seq(
    $._expr75,
    repeat(seq(
      choice('*', '/', '%', '~/', '^/', '~%', '^%', '/%'),
      $._expr75
    ))
  )),

  _expr75: $ => prec(75, seq(
    optional('~'),
    $._expr80
  )),

  _expr80: $ => prec.left(80, seq(
    $._expr90,
    repeat($.method_call)
  )),
  method_call: $ => prec.left(80, seq(
    choice('.', '~'),
    field("method_name", $.identifier),
    field("arguments", $._expr100)
  )),

  _expr90: $ => prec.left(90, choice(
    $._expr100,
    $.variable_declaration,
    $.function_application
  )),
  function_application: $ => prec.left(90, seq(
      field("function", $._nontype_expr100),
      field("agruments", repeat1(choice(
        $.identifier,
        $.parenthesized_expression,
        $.tensor_expression,
        $.unit_literal
      )))
  )),
  variable_declaration: $ => prec.left(90, seq(
    field("type", $.type_expression),
    field("variable", choice(
      $.identifier,
      $.tuple_expression,
      $.tensor_expression,
      $.parenthesized_expression
    ))
  )),

  type_expression: $ => prec(101, choice(
    $.primitive_type,
    $.var_type,
    $.parenthesized_type_expression,
    $.tensor_type_expression,
    $.tuple_type_expression
  )),
  parenthesized_type_expression: $ => prec(101, seq('(', $.type_expression, ')')),
  tensor_type_expression: $ => prec(101, seq('(', commaSep2($.type_expression), ')')),
  tuple_type_expression: $ => prec(101, seq('[', commaSep1($.type_expression), ']')),

  _nontype_expr100 : $ => prec(100, choice(
    $.parenthesized_expression,
    $.tensor_expression,
    $.tuple_expression,
    $.unit_literal,
    $.primitive_type,
    $.identifier,
    $.number_literal,
    $.string_literal,
    $.slice_string_literal,
    $.underscore
  )),

  _expr100: $ => prec(100, choice(
    $.type_expression,
    $._nontype_expr100
  )),

  unit_literal: $ => '()',

  parenthesized_expression: $ => seq('(', $.expression, ')'),
  tensor_expression: $ => seq('(', commaSep2($.expression), ')'),
  tuple_expression: $ => seq('[', commaSep($.expression), ']'),
}
