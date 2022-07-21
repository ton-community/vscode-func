function sep(sep, rule) {
  return optional(sep1(sep, rule));
}

function sep1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)))
}

function sep2(sep, rule) {
  return seq(rule, repeat1(seq(sep, rule)))
}

const commaSep = rule => sep(',', rule)
const commaSep1 = rule => sep1(',', rule)
const commaSep2 = rule => sep2(',', rule)

module.exports = {
  sep,
  sep1,
  sep2,
  commaSep,
  commaSep1,
  commaSep2
}
