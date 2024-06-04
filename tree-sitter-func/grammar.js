const { commaSep1 } = require('./grammar/utils.js')
const types = require('./grammar/types.js')
const expressions = require('./grammar/expressions.js')
const functions = require('./grammar/functions.js')
const statements = require('./grammar/statements.js')

module.exports = grammar({
  name: 'func',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  word: $ => $.identifier,

  rules: {
    translation_unit: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.function_definition,
      $.global_var_declarations,
      $.compiler_directive,
      $.constant_declarations,
    ),

    compiler_directive: $ => seq(choice($.include_directive, $.pragma_directive), ';'),
    include_directive: $ => seq('#include', repeat1(' '), field('path', $.string_literal)),

    version_identifier: $ => /(>=|<=|=|>|<|\^)?([0-9]+)(.[0-9]+)?(.[0-9]+)?/,
    pragma_directive: $ => seq(
      '#pragma',
      repeat1(' '),
      choice(
        seq(
          field('key', choice('version', 'not-version')), 
          repeat1(' '),
          field('value', $.version_identifier)
        ),
        field('key', choice('allow-post-modification', 'compute-asm-ltr')), 
      ),
    ),

    global_var_declarations: $ => seq(
      'global',
      commaSep1($.global_var_declaration),
      ';'
    ),
    global_var_declaration: $ => seq(
      field('type', optional($._type)),
      field('name', $.identifier),
    ),

    constant_declarations: $ => seq(
      'const',
      commaSep1($.constant_declaration),
      ';'
    ),
    constant_declaration: $ => seq(
      field('type', optional($.constant_type)),
      field('name', $.identifier),
      '=',
      field('value', choice($.expression)) // todo: make constant expression
    ),

    ...types,
    ...expressions,
    ...functions,
    ...statements,

    number_literal: $ => choice(
      token(seq(
        optional('-'),
        choice(
          seq('0x', /[0-9a-fA-F]+/),
          /[0-9]+/
        )
      )),
      $.number_string_literal
    ),

    string_literal: $ => /"[^"]*"/,
    number_string_literal: $ => /"[^"]*"[Hhcu]/,
    slice_string_literal: $ => /"[^"]*"[sa]/,

    // actually FunC identifiers are much more flexible
    identifier: $ => /`[^`]+`|[a-zA-Z_\$][^\s\+\-\*\/%,\.;\(\)\{\}\[\]=<>\|\^\~]*/,
    underscore: $ => '_',

    // multiline_comment: $ => seq('{-', repeat(choice(/./, $.multiline_comment)), '-}'),
    // unfortunately getting panic while generating parser with support for nested comments
    comment: $ => {
      var multiline_comment = seq('{-', /[^-]*-+([^-}][^-]*-+)*/, '}') // C-style multiline comments (without nesting)
      // manually support some nesting
      for (var i = 0; i < 5; i++) {
        multiline_comment = seq('{-', repeat(choice(/[^-{]/, /-[^}]/, /\{[^-]/, multiline_comment)), '-}')
      }
      return token(choice(
        seq(';;', /[^\n]*/), // single-line comment
        multiline_comment
      ));
    }
  },

  conflicts: $ => [
    [$.parameter_list_relaxed, $.type_identifier],
    [$.parameter_list_relaxed, $.hole_type],
    [$.parameter_list_relaxed, $.parameter_list]
  ]
});
