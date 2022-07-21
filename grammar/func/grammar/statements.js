const {commaSep, commaSep1, commaSep2} = require('./utils.js')

module.exports = {
  _statement: $ => choice(
    $.return_statement,
    $.block_statement,
    $.expression_statement,
    $.empty_statement,
    $.repeat_statement,
    $.if_statement,
    $.do_statement,
    $.while_statement,
  ),

  return_statement: $ => seq('return', $._expression, ';'),
  block_statement: $ => seq('{', repeat($._statement), '}'),
  expression_statement: $ => seq($._expression, ';'),
  empty_statement: $ => ';',
  repeat_statement: $ => seq('repeat', field("count", $._expression), field("body", $.block_statement)),

  if_statement: $ => seq(
    choice('if', 'ifnot'),
    $._if_statement_contents
  ),
  _if_statement_contents: $ => seq(
    field("condition", $._expression),
    field("consequent", $.block_statement),
    field("alternative",
      optional(choice(
        seq("else", $.block_statement),
        seq(choice("elseif", "elseifnot"), $._if_statement_contents)
    )))
  ),

  do_statement: $ => seq(
    "do",
    field("body", $.block_statement),
    "until",
    field("postcondition", $._expression)
  ),
  while_statement: $ => seq(
    "while",
    field("precondition", $._expression),
    field("body", $.block_statement)
  )
}
