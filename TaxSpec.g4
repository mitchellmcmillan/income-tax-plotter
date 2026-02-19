grammar TaxSpec;

program
  : (countryBlock)* EOF
  ;

// ---- Countries ----
countryBlock
  : countryName currencyMeta? LBRACE (componentDef)* RBRACE
  ;

countryName
  : IDENT
  | STRING
  ;

currencyMeta
  : LPAREN (IDENT (ASSIGN NUMBER MUL IDENT)? | NUMBER IDENT ASSIGN IDENT) RPAREN
  ;

// ---- Components ----
// Allow:  Name : kind = ...
// Also allow: Name = ...     (kind defaulted by interpreter)
componentDef
  : IDENT (COLON kindToken)? ASSIGN cell SEMI?
  ;

kindToken
  : IDENT
  | UNDERSCORE
  ;

cell
  : wrapper
  ;

wrapper
  : LBRACE block RBRACE
  ;

block
  : stmt* expr
  ;

stmt
  : LET IDENT ASSIGN expr SEMI?
  ;

// ---------- Expressions (precedence) ----------
expr
  : orExpr
  ;

orExpr
  : andExpr (OR andExpr)*
  ;

andExpr
  : notExpr (AND notExpr)*
  ;

notExpr
  : NOT notExpr
  | cmpExpr
  ;

cmpExpr
  : addExpr ((LT | LE | GT | GE | EQEQ | NEQ) addExpr)?
  ;

addExpr
  : mulExpr ((ADD | SUB) mulExpr)*
  ;

mulExpr
  : powExpr ((MUL | DIV) powExpr)*
  ;

powExpr
  : unaryExpr (POW powExpr)?
  ;

unaryExpr
  : (ADD | SUB) unaryExpr
  | primary
  ;

primary
  : NUMBER
  | INF
  | TRUE
  | FALSE
  | IDENT
  | STRING
  | LPAREN expr RPAREN
  | evalCall
  | fixCall
  | refCall
  | funcCall         // numeric functions only
  | pieceExpr
  | bracketsTaxableExpr
  | scheduleExpr
  ;

// ---------- Special forms ----------
evalCall
  : EVAL LPAREN nameRef COMMA expr RPAREN
  ;

fixCall
  : FIX LPAREN expr COMMA expr RPAREN
  ;

refCall
  : TOTAL LPAREN nameRef RPAREN
  ;

// Numeric function calls: always expression arguments
funcCall
  : IDENT LPAREN (expr (COMMA expr)*)? RPAREN
  ;

nameRef
  : IDENT (DOT IDENT)*
  ;

pieceExpr
  : PIECE LBRACE pieceArm+ (ELSE COLON expr SEMI?)? RBRACE
  ;

pieceArm
  : expr COLON expr SEMI?
  ;

scheduleExpr
  : BRACKETS LPAREN expr SEMI? rangeArm+ RPAREN
  ;

bracketsTaxableExpr
  : BRACKETS_TAXABLE LPAREN expr COMMA expr COMMA expr SEMI? rangeArm+ RPAREN
  ;

rangeArm
  : range COLON expr SEMI?
  ;

range
  : LBRACK bound DOTDOT bound RBRACK
  ;

bound
  : INF
  | expr
  ;

// ---------- Lexer ----------

LET   : 'let' ;

EVAL  : 'eval' ;
FIX   : 'fix' ;

TOTAL    : 'T' ;

PIECE : 'piece' ;
BRACKETS_TAXABLE   : 'bracketsTaxable' ;
BRACKETS           : 'brackets' ;

ELSE  : 'else' ;

AND   : 'and' ;
OR    : 'or' ;
NOT   : 'not' ;

TRUE  : 'true' ;
FALSE : 'false' ;

INF   : 'inf' ;

UNDERSCORE : '_' ;

LPAREN : '(' ;
RPAREN : ')' ;
LBRACE : '{' ;
RBRACE : '}' ;
LBRACK : '[' ;
RBRACK : ']' ;

SEMI  : ';' ;
COLON : ':' ;
COMMA : ',' ;

DOT   : '.' ;
DOTDOT : '..' ;

POW : '^' ;
MUL : '*' ;
DIV : '/' ;
ADD : '+' ;
SUB : '-' ;

LE   : '<=' ;
LT   : '<' ;
GE   : '>=' ;
GT   : '>' ;
EQEQ : '==' ;
NEQ  : '!=' ;
ASSIGN : '=' ;

NUMBER : [0-9]+ ('.' [0-9]+)? ;

STRING : '"' ( ~["\\] | '\\' . )* '"' ;

IDENT  : [A-Za-z_] [A-Za-z0-9_]* ;

WS : [ \t\r\n]+ -> skip ;
LINE_COMMENT : '//' ~[\r\n]* -> skip ;
BLOCK_COMMENT : '/*' .*? '*/' -> skip ;
