const {commaSep, commaSep1, commaSep2} = require('./utils.js')

module.exports = {
  _type: $ => choice(
    $._atomic_type,
    $.function_type,
  ),

  function_type: $ => prec.right(100, seq(
    $._atomic_type,
    '->',
    $._type
  )),

  _atomic_type: $ => choice(
    $.primitive_type,
    $.var_type,
    $.hole_type,
    $.type_identifier,
    $.tensor_type,
    $.unit_type,
    $.tuple_type,
    $._parenthesized_type
  ),

  _parenthesized_type: $ => seq('(', $._type, ')'),

  primitive_type: $ => choice(
    'int',
    'cell',
    'slice',
    'builder',
    'cont',
    'tuple',
  ),

  tensor_type: $ => seq('(', commaSep2($._type), ')'),

  tuple_type: $ => seq('[', commaSep($._type), ']'),

  var_type: $ => 'var',
  hole_type: $ => alias($.underscore, $.hole_type),
  unit_type: $ => '()',

  type_identifier: $ => alias($.identifier, $.type_identifier),
}
