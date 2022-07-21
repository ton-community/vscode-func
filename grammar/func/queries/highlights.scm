(impure) @keyword
"inline" @keyword
"inline_ref" @keyword
"method_id" @keyword
"asm" @keyword
"global" @keyword
"forall" @keyword
"return" @keyword
"repeat" @keyword
"do" @keyword
"until" @keyword
"while" @keyword
"if" @keyword
"ifnot" @keyword
"else" @keyword
"elseif" @keyword
"elseifnot" @keyword

"=" @operator
"+=" @operator
"-=" @operator
"*=" @operator
"/=" @operator
"~/=" @operator
"^/=" @operator
"%=" @operator
"~%=" @operator
"^%=" @operator
"<<=" @operator
">>=" @operator
"~>>=" @operator
"^>>=" @operator
"&=" @operator
"|=" @operator
"^=" @operator

"==" @operator
"<" @operator
">" @operator
"<=" @operator
">=" @operator
"!=" @operator
"<=>" @operator
"<<" @operator
">>" @operator
"~>>" @operator
"^>>" @operator
"-" @operator
"+" @operator
"|" @operator
"^" @operator
"*" @operator
"/" @operator
"%" @operator
"~/" @operator
"^/" @operator
"~%" @operator
"^%" @operator
"/%" @operator
"&" @operator
"~" @operator
"." @operator

"->" @operator


(string_literal) @string
(asm_instruction) @string
(number_literal) @number

(function_definition
  name: (function_name) @function)
(function_application
  function: (identifier) @function)
(method_call
  method_name: (identifier) @function)

"type" @type
(type_identifier) @type
(primitive_type) @type
(var_type) @type

(identifier) @variable

(comment) @comment
