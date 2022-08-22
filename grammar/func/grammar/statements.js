const {commaSep, commaSep1, commaSep2} = require('./utils.js')

module.exports = {
  statement: $ => choice(
    $.return_statement,
    $.block_statement,
    $.expression_statement,
    $.empty_statement,
    $.repeat_statement,
    $.if_statement,
    $.do_statement,
    $.while_statement,
  ),

  return_statement: $ => seq('return', $.expression, ';'),
  block_statement: $ => seq('{', repeat($.statement), '}'),
  expression_statement: $ => seq($.expression, ';'),
  empty_statement: $ => ';',
  repeat_statement: $ => seq('repeat', field("count", $.expression), field("body", $.block_statement)),

  if_statement: $ => seq(
    choice('if', 'ifnot'),
    $._if_statement_contents
  ),
  _if_statement_contents: $ => seq(
    field("condition", $.expression),
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
    field("postcondition", $.expression)
  ),
  while_statement: $ => seq(
    "while",
    field("precondition", $.expression),
    field("body", $.block_statement)
  )
}
