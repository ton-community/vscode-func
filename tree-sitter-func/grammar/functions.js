const { commaSep, commaSep1, commaSep2 } = require('./utils.js')

module.exports = {
  function_definition: $ => seq(
    field("pre_specifiers", optional($.pre_specifiers_list)),
    field("type_variables", optional($.type_variables_list)),
    field("return_type", $._type),
    field("name", $.function_name),
    choice(
      seq(
        field("arguments", $.parameter_list),
        field("specifiers", optional($.specifiers_list)),
        choice(
          field("body", $.block_statement),
          field("asm_body", $.asm_function_body)
        )
      ),
      seq(
        field("arguments", $.parameter_list_relaxed),
        field("specifiers", optional($.specifiers_list)),
        ';',
      )
    )
  ),

  function_name: $ => /(`.*`)|((\.|~)?(([$%a-zA-Z_](\w|['?:$%])+)|([a-zA-Z%$])))/,

  impure_specifier: $ => "impure",
  pure_specifier: $ => "pure",
  get_specifier: $ => "get",
  inline_specifier: $ => choice("inline", "inline_ref"),
  method_id_specifier: $ => seq("method_id", optional(
    seq('(', choice($.number_literal, $.string_literal), ')')
  )),
  builtin_specifier: $ => "builtin",

  pre_specifiers_list: $ => choice(
    seq($.get_specifier),
  ),
  specifiers_list: $ => choice(
    seq(choice($.impure_specifier, $.pure_specifier), optional($.inline_specifier), optional($.method_id_specifier)),
    seq(optional($.pure_specifier), $.builtin_specifier),
    seq($.inline_specifier, optional($.method_id_specifier)),
    $.method_id_specifier
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

  parameter_list_relaxed: $ => seq(
    '(',
    commaSep(
      choice(
        $.parameter_declaration,
        field('name', $.identifier),
        $.underscore
      )
    ),
    ')'
  ),

  parameter_declaration: $ => seq(
    field('type', $._type),
    optional(
      choice(
        field('name', $.identifier),
        $.underscore
      )
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
