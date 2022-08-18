const {commaSep, commaSep1, commaSep2} = require('./utils.js')

module.exports = {
  function_definition: $ => seq(
    field("type_variables", optional($.type_variables_list)),
    field("return_type", $._type),
    field("name", $.function_name),
    field("arguments", $.parameter_list),
    field("specifiers", optional($.specifiers_list)),
    choice(
      ';',
      field("body", $.block_statement),
      field("asm_body", $.asm_function_body)
    )
  ),

  function_name: $ => /(`.*`)|((\.|~)?(([a-zA-Z_](\w|['?:])+)|([a-zA-Z])))/,

  impure: $ => "impure",
  inline: $ => choice("inline", "inline_ref"),
  method_id: $ => seq("method_id", optional(
    seq('(', choice($.number_literal, $.string_literal), ')')
  )),

  specifiers_list: $ => choice(
    seq($.impure, optional($.inline), optional($.method_id)), 
    seq($.inline, optional($.method_id)), 
    $.method_id
  ),

  type_variables_list: $ => seq(
    "forall",
    commaSep(seq(optional("type"), $.type_identifier)),
    "->"
  ),

  parameter_list: $ => seq(
    '(',
    commaSep($.parameter_declaration),
    ')'
  ),

  parameter_declaration: $ => seq(
    optional(field('type', $._type)),
    choice(
      field('name', $.identifier),
      $.underscore
    )
  ),

  asm_function_body: $ => seq(
    $.asm_specifier,
    repeat1($.asm_instruction),
    ';'
  ),

  asm_specifier: $ => seq(
    'asm',
    optional(seq(
      '(',
      repeat($.identifier),
      optional(seq(
        '->',
        repeat($.number_literal)
      )),
      ')'
    ))
  ),
  asm_instruction: $ => alias($.string_literal, $.asm_instruction),
}
