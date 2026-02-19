// Generated from /Users/mitchellmcmillan/projects/income-tax-plotter/TaxSpec.g4 by ANTLR 4.13.2
// jshint ignore: start
import antlr4 from 'antlr4';
import TaxSpecListener from './TaxSpecListener.js';
import TaxSpecVisitor from './TaxSpecVisitor.js';

const serializedATN = [4,1,44,320,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,
4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,
2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,
20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,26,2,27,
7,27,2,28,7,28,2,29,7,29,2,30,7,30,2,31,7,31,1,0,5,0,66,8,0,10,0,12,0,69,
9,0,1,0,1,0,1,1,1,1,3,1,75,8,1,1,1,1,1,5,1,79,8,1,10,1,12,1,82,9,1,1,1,1,
1,1,2,1,2,1,3,1,3,1,3,1,3,1,3,1,3,3,3,94,8,3,1,3,1,3,1,3,1,3,3,3,100,8,3,
1,3,1,3,1,4,1,4,1,4,3,4,107,8,4,1,4,1,4,1,4,3,4,112,8,4,1,5,1,5,1,6,1,6,
1,7,1,7,1,7,1,7,1,8,5,8,123,8,8,10,8,12,8,126,9,8,1,8,1,8,1,9,1,9,1,9,1,
9,1,9,3,9,135,8,9,1,10,1,10,1,11,1,11,1,11,5,11,142,8,11,10,11,12,11,145,
9,11,1,12,1,12,1,12,5,12,150,8,12,10,12,12,12,153,9,12,1,13,1,13,1,13,3,
13,158,8,13,1,14,1,14,1,14,3,14,163,8,14,1,15,1,15,1,15,5,15,168,8,15,10,
15,12,15,171,9,15,1,16,1,16,1,16,5,16,176,8,16,10,16,12,16,179,9,16,1,17,
1,17,1,17,3,17,184,8,17,1,18,1,18,1,18,3,18,189,8,18,1,19,1,19,1,19,1,19,
1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,1,19,3,19,208,
8,19,1,20,1,20,1,20,1,20,1,20,1,20,1,20,1,21,1,21,1,21,1,21,1,21,1,21,1,
21,1,22,1,22,1,22,1,22,1,22,1,23,1,23,1,23,1,23,1,23,5,23,234,8,23,10,23,
12,23,237,9,23,3,23,239,8,23,1,23,1,23,1,24,1,24,1,24,5,24,246,8,24,10,24,
12,24,249,9,24,1,25,1,25,1,25,4,25,254,8,25,11,25,12,25,255,1,25,1,25,1,
25,1,25,3,25,262,8,25,3,25,264,8,25,1,25,1,25,1,26,1,26,1,26,1,26,3,26,272,
8,26,1,27,1,27,1,27,1,27,3,27,278,8,27,1,27,4,27,281,8,27,11,27,12,27,282,
1,27,1,27,1,28,1,28,1,28,1,28,1,28,1,28,1,28,1,28,3,28,295,8,28,1,28,4,28,
298,8,28,11,28,12,28,299,1,28,1,28,1,29,1,29,1,29,1,29,3,29,308,8,29,1,30,
1,30,1,30,1,30,1,30,1,30,1,31,1,31,3,31,318,8,31,1,31,0,0,32,0,2,4,6,8,10,
12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58,
60,62,0,5,1,0,40,41,2,0,15,15,41,41,1,0,32,37,1,0,30,31,1,0,28,29,330,0,
67,1,0,0,0,2,72,1,0,0,0,4,85,1,0,0,0,6,87,1,0,0,0,8,103,1,0,0,0,10,113,1,
0,0,0,12,115,1,0,0,0,14,117,1,0,0,0,16,124,1,0,0,0,18,129,1,0,0,0,20,136,
1,0,0,0,22,138,1,0,0,0,24,146,1,0,0,0,26,157,1,0,0,0,28,159,1,0,0,0,30,164,
1,0,0,0,32,172,1,0,0,0,34,180,1,0,0,0,36,188,1,0,0,0,38,207,1,0,0,0,40,209,
1,0,0,0,42,216,1,0,0,0,44,223,1,0,0,0,46,228,1,0,0,0,48,242,1,0,0,0,50,250,
1,0,0,0,52,267,1,0,0,0,54,273,1,0,0,0,56,286,1,0,0,0,58,303,1,0,0,0,60,309,
1,0,0,0,62,317,1,0,0,0,64,66,3,2,1,0,65,64,1,0,0,0,66,69,1,0,0,0,67,65,1,
0,0,0,67,68,1,0,0,0,68,70,1,0,0,0,69,67,1,0,0,0,70,71,5,0,0,1,71,1,1,0,0,
0,72,74,3,4,2,0,73,75,3,6,3,0,74,73,1,0,0,0,74,75,1,0,0,0,75,76,1,0,0,0,
76,80,5,18,0,0,77,79,3,8,4,0,78,77,1,0,0,0,79,82,1,0,0,0,80,78,1,0,0,0,80,
81,1,0,0,0,81,83,1,0,0,0,82,80,1,0,0,0,83,84,5,19,0,0,84,3,1,0,0,0,85,86,
7,0,0,0,86,5,1,0,0,0,87,99,5,16,0,0,88,93,5,41,0,0,89,90,5,38,0,0,90,91,
5,39,0,0,91,92,5,28,0,0,92,94,5,41,0,0,93,89,1,0,0,0,93,94,1,0,0,0,94,100,
1,0,0,0,95,96,5,39,0,0,96,97,5,41,0,0,97,98,5,38,0,0,98,100,5,41,0,0,99,
88,1,0,0,0,99,95,1,0,0,0,100,101,1,0,0,0,101,102,5,17,0,0,102,7,1,0,0,0,
103,106,5,41,0,0,104,105,5,23,0,0,105,107,3,10,5,0,106,104,1,0,0,0,106,107,
1,0,0,0,107,108,1,0,0,0,108,109,5,38,0,0,109,111,3,12,6,0,110,112,5,22,0,
0,111,110,1,0,0,0,111,112,1,0,0,0,112,9,1,0,0,0,113,114,7,1,0,0,114,11,1,
0,0,0,115,116,3,14,7,0,116,13,1,0,0,0,117,118,5,18,0,0,118,119,3,16,8,0,
119,120,5,19,0,0,120,15,1,0,0,0,121,123,3,18,9,0,122,121,1,0,0,0,123,126,
1,0,0,0,124,122,1,0,0,0,124,125,1,0,0,0,125,127,1,0,0,0,126,124,1,0,0,0,
127,128,3,20,10,0,128,17,1,0,0,0,129,130,5,1,0,0,130,131,5,41,0,0,131,132,
5,38,0,0,132,134,3,20,10,0,133,135,5,22,0,0,134,133,1,0,0,0,134,135,1,0,
0,0,135,19,1,0,0,0,136,137,3,22,11,0,137,21,1,0,0,0,138,143,3,24,12,0,139,
140,5,10,0,0,140,142,3,24,12,0,141,139,1,0,0,0,142,145,1,0,0,0,143,141,1,
0,0,0,143,144,1,0,0,0,144,23,1,0,0,0,145,143,1,0,0,0,146,151,3,26,13,0,147,
148,5,9,0,0,148,150,3,26,13,0,149,147,1,0,0,0,150,153,1,0,0,0,151,149,1,
0,0,0,151,152,1,0,0,0,152,25,1,0,0,0,153,151,1,0,0,0,154,155,5,11,0,0,155,
158,3,26,13,0,156,158,3,28,14,0,157,154,1,0,0,0,157,156,1,0,0,0,158,27,1,
0,0,0,159,162,3,30,15,0,160,161,7,2,0,0,161,163,3,30,15,0,162,160,1,0,0,
0,162,163,1,0,0,0,163,29,1,0,0,0,164,169,3,32,16,0,165,166,7,3,0,0,166,168,
3,32,16,0,167,165,1,0,0,0,168,171,1,0,0,0,169,167,1,0,0,0,169,170,1,0,0,
0,170,31,1,0,0,0,171,169,1,0,0,0,172,177,3,34,17,0,173,174,7,4,0,0,174,176,
3,34,17,0,175,173,1,0,0,0,176,179,1,0,0,0,177,175,1,0,0,0,177,178,1,0,0,
0,178,33,1,0,0,0,179,177,1,0,0,0,180,183,3,36,18,0,181,182,5,27,0,0,182,
184,3,34,17,0,183,181,1,0,0,0,183,184,1,0,0,0,184,35,1,0,0,0,185,186,7,3,
0,0,186,189,3,36,18,0,187,189,3,38,19,0,188,185,1,0,0,0,188,187,1,0,0,0,
189,37,1,0,0,0,190,208,5,39,0,0,191,208,5,14,0,0,192,208,5,12,0,0,193,208,
5,13,0,0,194,208,5,41,0,0,195,208,5,40,0,0,196,197,5,16,0,0,197,198,3,20,
10,0,198,199,5,17,0,0,199,208,1,0,0,0,200,208,3,40,20,0,201,208,3,42,21,
0,202,208,3,44,22,0,203,208,3,46,23,0,204,208,3,50,25,0,205,208,3,56,28,
0,206,208,3,54,27,0,207,190,1,0,0,0,207,191,1,0,0,0,207,192,1,0,0,0,207,
193,1,0,0,0,207,194,1,0,0,0,207,195,1,0,0,0,207,196,1,0,0,0,207,200,1,0,
0,0,207,201,1,0,0,0,207,202,1,0,0,0,207,203,1,0,0,0,207,204,1,0,0,0,207,
205,1,0,0,0,207,206,1,0,0,0,208,39,1,0,0,0,209,210,5,2,0,0,210,211,5,16,
0,0,211,212,3,48,24,0,212,213,5,24,0,0,213,214,3,20,10,0,214,215,5,17,0,
0,215,41,1,0,0,0,216,217,5,3,0,0,217,218,5,16,0,0,218,219,3,20,10,0,219,
220,5,24,0,0,220,221,3,20,10,0,221,222,5,17,0,0,222,43,1,0,0,0,223,224,5,
4,0,0,224,225,5,16,0,0,225,226,3,48,24,0,226,227,5,17,0,0,227,45,1,0,0,0,
228,229,5,41,0,0,229,238,5,16,0,0,230,235,3,20,10,0,231,232,5,24,0,0,232,
234,3,20,10,0,233,231,1,0,0,0,234,237,1,0,0,0,235,233,1,0,0,0,235,236,1,
0,0,0,236,239,1,0,0,0,237,235,1,0,0,0,238,230,1,0,0,0,238,239,1,0,0,0,239,
240,1,0,0,0,240,241,5,17,0,0,241,47,1,0,0,0,242,247,5,41,0,0,243,244,5,25,
0,0,244,246,5,41,0,0,245,243,1,0,0,0,246,249,1,0,0,0,247,245,1,0,0,0,247,
248,1,0,0,0,248,49,1,0,0,0,249,247,1,0,0,0,250,251,5,5,0,0,251,253,5,18,
0,0,252,254,3,52,26,0,253,252,1,0,0,0,254,255,1,0,0,0,255,253,1,0,0,0,255,
256,1,0,0,0,256,263,1,0,0,0,257,258,5,8,0,0,258,259,5,23,0,0,259,261,3,20,
10,0,260,262,5,22,0,0,261,260,1,0,0,0,261,262,1,0,0,0,262,264,1,0,0,0,263,
257,1,0,0,0,263,264,1,0,0,0,264,265,1,0,0,0,265,266,5,19,0,0,266,51,1,0,
0,0,267,268,3,20,10,0,268,269,5,23,0,0,269,271,3,20,10,0,270,272,5,22,0,
0,271,270,1,0,0,0,271,272,1,0,0,0,272,53,1,0,0,0,273,274,5,7,0,0,274,275,
5,16,0,0,275,277,3,20,10,0,276,278,5,22,0,0,277,276,1,0,0,0,277,278,1,0,
0,0,278,280,1,0,0,0,279,281,3,58,29,0,280,279,1,0,0,0,281,282,1,0,0,0,282,
280,1,0,0,0,282,283,1,0,0,0,283,284,1,0,0,0,284,285,5,17,0,0,285,55,1,0,
0,0,286,287,5,6,0,0,287,288,5,16,0,0,288,289,3,20,10,0,289,290,5,24,0,0,
290,291,3,20,10,0,291,292,5,24,0,0,292,294,3,20,10,0,293,295,5,22,0,0,294,
293,1,0,0,0,294,295,1,0,0,0,295,297,1,0,0,0,296,298,3,58,29,0,297,296,1,
0,0,0,298,299,1,0,0,0,299,297,1,0,0,0,299,300,1,0,0,0,300,301,1,0,0,0,301,
302,5,17,0,0,302,57,1,0,0,0,303,304,3,60,30,0,304,305,5,23,0,0,305,307,3,
20,10,0,306,308,5,22,0,0,307,306,1,0,0,0,307,308,1,0,0,0,308,59,1,0,0,0,
309,310,5,20,0,0,310,311,3,62,31,0,311,312,5,26,0,0,312,313,3,62,31,0,313,
314,5,21,0,0,314,61,1,0,0,0,315,318,5,14,0,0,316,318,3,20,10,0,317,315,1,
0,0,0,317,316,1,0,0,0,318,63,1,0,0,0,31,67,74,80,93,99,106,111,124,134,143,
151,157,162,169,177,183,188,207,235,238,247,255,261,263,271,277,282,294,
299,307,317];


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.atn.PredictionContextCache();

export default class TaxSpecParser extends antlr4.Parser {

    static grammarFileName = "TaxSpec.g4";
    static literalNames = [ null, "'let'", "'eval'", "'fix'", "'T'", "'piece'", 
                            "'bracketsTaxable'", "'brackets'", "'else'", 
                            "'and'", "'or'", "'not'", "'true'", "'false'", 
                            "'inf'", "'_'", "'('", "')'", "'{'", "'}'", 
                            "'['", "']'", "';'", "':'", "','", "'.'", "'..'", 
                            "'^'", "'*'", "'/'", "'+'", "'-'", "'<='", "'<'", 
                            "'>='", "'>'", "'=='", "'!='", "'='" ];
    static symbolicNames = [ null, "LET", "EVAL", "FIX", "TOTAL", "PIECE", 
                             "BRACKETS_TAXABLE", "BRACKETS", "ELSE", "AND", 
                             "OR", "NOT", "TRUE", "FALSE", "INF", "UNDERSCORE", 
                             "LPAREN", "RPAREN", "LBRACE", "RBRACE", "LBRACK", 
                             "RBRACK", "SEMI", "COLON", "COMMA", "DOT", 
                             "DOTDOT", "POW", "MUL", "DIV", "ADD", "SUB", 
                             "LE", "LT", "GE", "GT", "EQEQ", "NEQ", "ASSIGN", 
                             "NUMBER", "STRING", "IDENT", "WS", "LINE_COMMENT", 
                             "BLOCK_COMMENT" ];
    static ruleNames = [ "program", "countryBlock", "countryName", "currencyMeta", 
                         "componentDef", "kindToken", "cell", "wrapper", 
                         "block", "stmt", "expr", "orExpr", "andExpr", "notExpr", 
                         "cmpExpr", "addExpr", "mulExpr", "powExpr", "unaryExpr", 
                         "primary", "evalCall", "fixCall", "refCall", "funcCall", 
                         "nameRef", "pieceExpr", "pieceArm", "scheduleExpr", 
                         "bracketsTaxableExpr", "rangeArm", "range", "bound" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = TaxSpecParser.ruleNames;
        this.literalNames = TaxSpecParser.literalNames;
        this.symbolicNames = TaxSpecParser.symbolicNames;
    }



	program() {
	    let localctx = new ProgramContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, TaxSpecParser.RULE_program);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 67;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===40 || _la===41) {
	            this.state = 64;
	            this.countryBlock();
	            this.state = 69;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	        this.state = 70;
	        this.match(TaxSpecParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	countryBlock() {
	    let localctx = new CountryBlockContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 2, TaxSpecParser.RULE_countryBlock);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 72;
	        this.countryName();
	        this.state = 74;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===16) {
	            this.state = 73;
	            this.currencyMeta();
	        }

	        this.state = 76;
	        this.match(TaxSpecParser.LBRACE);
	        this.state = 80;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===41) {
	            this.state = 77;
	            this.componentDef();
	            this.state = 82;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	        this.state = 83;
	        this.match(TaxSpecParser.RBRACE);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	countryName() {
	    let localctx = new CountryNameContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, TaxSpecParser.RULE_countryName);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 85;
	        _la = this._input.LA(1);
	        if(!(_la===40 || _la===41)) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	currencyMeta() {
	    let localctx = new CurrencyMetaContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 6, TaxSpecParser.RULE_currencyMeta);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 87;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 99;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 41:
	            this.state = 88;
	            this.match(TaxSpecParser.IDENT);
	            this.state = 93;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===38) {
	                this.state = 89;
	                this.match(TaxSpecParser.ASSIGN);
	                this.state = 90;
	                this.match(TaxSpecParser.NUMBER);
	                this.state = 91;
	                this.match(TaxSpecParser.MUL);
	                this.state = 92;
	                this.match(TaxSpecParser.IDENT);
	            }

	            break;
	        case 39:
	            this.state = 95;
	            this.match(TaxSpecParser.NUMBER);
	            this.state = 96;
	            this.match(TaxSpecParser.IDENT);
	            this.state = 97;
	            this.match(TaxSpecParser.ASSIGN);
	            this.state = 98;
	            this.match(TaxSpecParser.IDENT);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this.state = 101;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	componentDef() {
	    let localctx = new ComponentDefContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 8, TaxSpecParser.RULE_componentDef);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 103;
	        this.match(TaxSpecParser.IDENT);
	        this.state = 106;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===23) {
	            this.state = 104;
	            this.match(TaxSpecParser.COLON);
	            this.state = 105;
	            this.kindToken();
	        }

	        this.state = 108;
	        this.match(TaxSpecParser.ASSIGN);
	        this.state = 109;
	        this.cell();
	        this.state = 111;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 110;
	            this.match(TaxSpecParser.SEMI);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	kindToken() {
	    let localctx = new KindTokenContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 10, TaxSpecParser.RULE_kindToken);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 113;
	        _la = this._input.LA(1);
	        if(!(_la===15 || _la===41)) {
	        this._errHandler.recoverInline(this);
	        }
	        else {
	        	this._errHandler.reportMatch(this);
	            this.consume();
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	cell() {
	    let localctx = new CellContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 12, TaxSpecParser.RULE_cell);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 115;
	        this.wrapper();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	wrapper() {
	    let localctx = new WrapperContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 14, TaxSpecParser.RULE_wrapper);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 117;
	        this.match(TaxSpecParser.LBRACE);
	        this.state = 118;
	        this.block();
	        this.state = 119;
	        this.match(TaxSpecParser.RBRACE);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	block() {
	    let localctx = new BlockContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 16, TaxSpecParser.RULE_block);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 124;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===1) {
	            this.state = 121;
	            this.stmt();
	            this.state = 126;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	        this.state = 127;
	        this.expr();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	stmt() {
	    let localctx = new StmtContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 18, TaxSpecParser.RULE_stmt);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 129;
	        this.match(TaxSpecParser.LET);
	        this.state = 130;
	        this.match(TaxSpecParser.IDENT);
	        this.state = 131;
	        this.match(TaxSpecParser.ASSIGN);
	        this.state = 132;
	        this.expr();
	        this.state = 134;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 133;
	            this.match(TaxSpecParser.SEMI);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	expr() {
	    let localctx = new ExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 20, TaxSpecParser.RULE_expr);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 136;
	        this.orExpr();
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	orExpr() {
	    let localctx = new OrExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 22, TaxSpecParser.RULE_orExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 138;
	        this.andExpr();
	        this.state = 143;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===10) {
	            this.state = 139;
	            this.match(TaxSpecParser.OR);
	            this.state = 140;
	            this.andExpr();
	            this.state = 145;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	andExpr() {
	    let localctx = new AndExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 24, TaxSpecParser.RULE_andExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 146;
	        this.notExpr();
	        this.state = 151;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===9) {
	            this.state = 147;
	            this.match(TaxSpecParser.AND);
	            this.state = 148;
	            this.notExpr();
	            this.state = 153;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	notExpr() {
	    let localctx = new NotExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 26, TaxSpecParser.RULE_notExpr);
	    try {
	        this.state = 157;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 11:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 154;
	            this.match(TaxSpecParser.NOT);
	            this.state = 155;
	            this.notExpr();
	            break;
	        case 2:
	        case 3:
	        case 4:
	        case 5:
	        case 6:
	        case 7:
	        case 12:
	        case 13:
	        case 14:
	        case 16:
	        case 30:
	        case 31:
	        case 39:
	        case 40:
	        case 41:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 156;
	            this.cmpExpr();
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	cmpExpr() {
	    let localctx = new CmpExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 28, TaxSpecParser.RULE_cmpExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 159;
	        this.addExpr();
	        this.state = 162;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(((((_la - 32)) & ~0x1f) === 0 && ((1 << (_la - 32)) & 63) !== 0)) {
	            this.state = 160;
	            _la = this._input.LA(1);
	            if(!(((((_la - 32)) & ~0x1f) === 0 && ((1 << (_la - 32)) & 63) !== 0))) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 161;
	            this.addExpr();
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	addExpr() {
	    let localctx = new AddExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 30, TaxSpecParser.RULE_addExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 164;
	        this.mulExpr();
	        this.state = 169;
	        this._errHandler.sync(this);
	        var _alt = this._interp.adaptivePredict(this._input,13,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                this.state = 165;
	                _la = this._input.LA(1);
	                if(!(_la===30 || _la===31)) {
	                this._errHandler.recoverInline(this);
	                }
	                else {
	                	this._errHandler.reportMatch(this);
	                    this.consume();
	                }
	                this.state = 166;
	                this.mulExpr(); 
	            }
	            this.state = 171;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,13,this._ctx);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	mulExpr() {
	    let localctx = new MulExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 32, TaxSpecParser.RULE_mulExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 172;
	        this.powExpr();
	        this.state = 177;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===28 || _la===29) {
	            this.state = 173;
	            _la = this._input.LA(1);
	            if(!(_la===28 || _la===29)) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 174;
	            this.powExpr();
	            this.state = 179;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	powExpr() {
	    let localctx = new PowExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 34, TaxSpecParser.RULE_powExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 180;
	        this.unaryExpr();
	        this.state = 183;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===27) {
	            this.state = 181;
	            this.match(TaxSpecParser.POW);
	            this.state = 182;
	            this.powExpr();
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	unaryExpr() {
	    let localctx = new UnaryExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 36, TaxSpecParser.RULE_unaryExpr);
	    var _la = 0;
	    try {
	        this.state = 188;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case 30:
	        case 31:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 185;
	            _la = this._input.LA(1);
	            if(!(_la===30 || _la===31)) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 186;
	            this.unaryExpr();
	            break;
	        case 2:
	        case 3:
	        case 4:
	        case 5:
	        case 6:
	        case 7:
	        case 12:
	        case 13:
	        case 14:
	        case 16:
	        case 39:
	        case 40:
	        case 41:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 187;
	            this.primary();
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	primary() {
	    let localctx = new PrimaryContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 38, TaxSpecParser.RULE_primary);
	    try {
	        this.state = 207;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,17,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 190;
	            this.match(TaxSpecParser.NUMBER);
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 191;
	            this.match(TaxSpecParser.INF);
	            break;

	        case 3:
	            this.enterOuterAlt(localctx, 3);
	            this.state = 192;
	            this.match(TaxSpecParser.TRUE);
	            break;

	        case 4:
	            this.enterOuterAlt(localctx, 4);
	            this.state = 193;
	            this.match(TaxSpecParser.FALSE);
	            break;

	        case 5:
	            this.enterOuterAlt(localctx, 5);
	            this.state = 194;
	            this.match(TaxSpecParser.IDENT);
	            break;

	        case 6:
	            this.enterOuterAlt(localctx, 6);
	            this.state = 195;
	            this.match(TaxSpecParser.STRING);
	            break;

	        case 7:
	            this.enterOuterAlt(localctx, 7);
	            this.state = 196;
	            this.match(TaxSpecParser.LPAREN);
	            this.state = 197;
	            this.expr();
	            this.state = 198;
	            this.match(TaxSpecParser.RPAREN);
	            break;

	        case 8:
	            this.enterOuterAlt(localctx, 8);
	            this.state = 200;
	            this.evalCall();
	            break;

	        case 9:
	            this.enterOuterAlt(localctx, 9);
	            this.state = 201;
	            this.fixCall();
	            break;

	        case 10:
	            this.enterOuterAlt(localctx, 10);
	            this.state = 202;
	            this.refCall();
	            break;

	        case 11:
	            this.enterOuterAlt(localctx, 11);
	            this.state = 203;
	            this.funcCall();
	            break;

	        case 12:
	            this.enterOuterAlt(localctx, 12);
	            this.state = 204;
	            this.pieceExpr();
	            break;

	        case 13:
	            this.enterOuterAlt(localctx, 13);
	            this.state = 205;
	            this.bracketsTaxableExpr();
	            break;

	        case 14:
	            this.enterOuterAlt(localctx, 14);
	            this.state = 206;
	            this.scheduleExpr();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	evalCall() {
	    let localctx = new EvalCallContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 40, TaxSpecParser.RULE_evalCall);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 209;
	        this.match(TaxSpecParser.EVAL);
	        this.state = 210;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 211;
	        this.nameRef();
	        this.state = 212;
	        this.match(TaxSpecParser.COMMA);
	        this.state = 213;
	        this.expr();
	        this.state = 214;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	fixCall() {
	    let localctx = new FixCallContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 42, TaxSpecParser.RULE_fixCall);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 216;
	        this.match(TaxSpecParser.FIX);
	        this.state = 217;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 218;
	        this.expr();
	        this.state = 219;
	        this.match(TaxSpecParser.COMMA);
	        this.state = 220;
	        this.expr();
	        this.state = 221;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	refCall() {
	    let localctx = new RefCallContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 44, TaxSpecParser.RULE_refCall);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 223;
	        this.match(TaxSpecParser.TOTAL);
	        this.state = 224;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 225;
	        this.nameRef();
	        this.state = 226;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	funcCall() {
	    let localctx = new FuncCallContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 46, TaxSpecParser.RULE_funcCall);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 228;
	        this.match(TaxSpecParser.IDENT);
	        this.state = 229;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 238;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if((((_la) & ~0x1f) === 0 && ((1 << _la) & 3221321980) !== 0) || ((((_la - 39)) & ~0x1f) === 0 && ((1 << (_la - 39)) & 7) !== 0)) {
	            this.state = 230;
	            this.expr();
	            this.state = 235;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            while(_la===24) {
	                this.state = 231;
	                this.match(TaxSpecParser.COMMA);
	                this.state = 232;
	                this.expr();
	                this.state = 237;
	                this._errHandler.sync(this);
	                _la = this._input.LA(1);
	            }
	        }

	        this.state = 240;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	nameRef() {
	    let localctx = new NameRefContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 48, TaxSpecParser.RULE_nameRef);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 242;
	        this.match(TaxSpecParser.IDENT);
	        this.state = 247;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        while(_la===25) {
	            this.state = 243;
	            this.match(TaxSpecParser.DOT);
	            this.state = 244;
	            this.match(TaxSpecParser.IDENT);
	            this.state = 249;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	pieceExpr() {
	    let localctx = new PieceExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 50, TaxSpecParser.RULE_pieceExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 250;
	        this.match(TaxSpecParser.PIECE);
	        this.state = 251;
	        this.match(TaxSpecParser.LBRACE);
	        this.state = 253; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 252;
	            this.pieceArm();
	            this.state = 255; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while((((_la) & ~0x1f) === 0 && ((1 << _la) & 3221321980) !== 0) || ((((_la - 39)) & ~0x1f) === 0 && ((1 << (_la - 39)) & 7) !== 0));
	        this.state = 263;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===8) {
	            this.state = 257;
	            this.match(TaxSpecParser.ELSE);
	            this.state = 258;
	            this.match(TaxSpecParser.COLON);
	            this.state = 259;
	            this.expr();
	            this.state = 261;
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	            if(_la===22) {
	                this.state = 260;
	                this.match(TaxSpecParser.SEMI);
	            }

	        }

	        this.state = 265;
	        this.match(TaxSpecParser.RBRACE);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	pieceArm() {
	    let localctx = new PieceArmContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 52, TaxSpecParser.RULE_pieceArm);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 267;
	        this.expr();
	        this.state = 268;
	        this.match(TaxSpecParser.COLON);
	        this.state = 269;
	        this.expr();
	        this.state = 271;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 270;
	            this.match(TaxSpecParser.SEMI);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	scheduleExpr() {
	    let localctx = new ScheduleExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 54, TaxSpecParser.RULE_scheduleExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 273;
	        this.match(TaxSpecParser.BRACKETS);
	        this.state = 274;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 275;
	        this.expr();
	        this.state = 277;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 276;
	            this.match(TaxSpecParser.SEMI);
	        }

	        this.state = 280; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 279;
	            this.rangeArm();
	            this.state = 282; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===20);
	        this.state = 284;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	bracketsTaxableExpr() {
	    let localctx = new BracketsTaxableExprContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 56, TaxSpecParser.RULE_bracketsTaxableExpr);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 286;
	        this.match(TaxSpecParser.BRACKETS_TAXABLE);
	        this.state = 287;
	        this.match(TaxSpecParser.LPAREN);
	        this.state = 288;
	        this.expr();
	        this.state = 289;
	        this.match(TaxSpecParser.COMMA);
	        this.state = 290;
	        this.expr();
	        this.state = 291;
	        this.match(TaxSpecParser.COMMA);
	        this.state = 292;
	        this.expr();
	        this.state = 294;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 293;
	            this.match(TaxSpecParser.SEMI);
	        }

	        this.state = 297; 
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        do {
	            this.state = 296;
	            this.rangeArm();
	            this.state = 299; 
	            this._errHandler.sync(this);
	            _la = this._input.LA(1);
	        } while(_la===20);
	        this.state = 301;
	        this.match(TaxSpecParser.RPAREN);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	rangeArm() {
	    let localctx = new RangeArmContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 58, TaxSpecParser.RULE_rangeArm);
	    var _la = 0;
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 303;
	        this.range();
	        this.state = 304;
	        this.match(TaxSpecParser.COLON);
	        this.state = 305;
	        this.expr();
	        this.state = 307;
	        this._errHandler.sync(this);
	        _la = this._input.LA(1);
	        if(_la===22) {
	            this.state = 306;
	            this.match(TaxSpecParser.SEMI);
	        }

	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	range() {
	    let localctx = new RangeContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 60, TaxSpecParser.RULE_range);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 309;
	        this.match(TaxSpecParser.LBRACK);
	        this.state = 310;
	        this.bound();
	        this.state = 311;
	        this.match(TaxSpecParser.DOTDOT);
	        this.state = 312;
	        this.bound();
	        this.state = 313;
	        this.match(TaxSpecParser.RBRACK);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}



	bound() {
	    let localctx = new BoundContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 62, TaxSpecParser.RULE_bound);
	    try {
	        this.state = 317;
	        this._errHandler.sync(this);
	        var la_ = this._interp.adaptivePredict(this._input,30,this._ctx);
	        switch(la_) {
	        case 1:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 315;
	            this.match(TaxSpecParser.INF);
	            break;

	        case 2:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 316;
	            this.expr();
	            break;

	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

TaxSpecParser.EOF = antlr4.Token.EOF;
TaxSpecParser.LET = 1;
TaxSpecParser.EVAL = 2;
TaxSpecParser.FIX = 3;
TaxSpecParser.TOTAL = 4;
TaxSpecParser.PIECE = 5;
TaxSpecParser.BRACKETS_TAXABLE = 6;
TaxSpecParser.BRACKETS = 7;
TaxSpecParser.ELSE = 8;
TaxSpecParser.AND = 9;
TaxSpecParser.OR = 10;
TaxSpecParser.NOT = 11;
TaxSpecParser.TRUE = 12;
TaxSpecParser.FALSE = 13;
TaxSpecParser.INF = 14;
TaxSpecParser.UNDERSCORE = 15;
TaxSpecParser.LPAREN = 16;
TaxSpecParser.RPAREN = 17;
TaxSpecParser.LBRACE = 18;
TaxSpecParser.RBRACE = 19;
TaxSpecParser.LBRACK = 20;
TaxSpecParser.RBRACK = 21;
TaxSpecParser.SEMI = 22;
TaxSpecParser.COLON = 23;
TaxSpecParser.COMMA = 24;
TaxSpecParser.DOT = 25;
TaxSpecParser.DOTDOT = 26;
TaxSpecParser.POW = 27;
TaxSpecParser.MUL = 28;
TaxSpecParser.DIV = 29;
TaxSpecParser.ADD = 30;
TaxSpecParser.SUB = 31;
TaxSpecParser.LE = 32;
TaxSpecParser.LT = 33;
TaxSpecParser.GE = 34;
TaxSpecParser.GT = 35;
TaxSpecParser.EQEQ = 36;
TaxSpecParser.NEQ = 37;
TaxSpecParser.ASSIGN = 38;
TaxSpecParser.NUMBER = 39;
TaxSpecParser.STRING = 40;
TaxSpecParser.IDENT = 41;
TaxSpecParser.WS = 42;
TaxSpecParser.LINE_COMMENT = 43;
TaxSpecParser.BLOCK_COMMENT = 44;

TaxSpecParser.RULE_program = 0;
TaxSpecParser.RULE_countryBlock = 1;
TaxSpecParser.RULE_countryName = 2;
TaxSpecParser.RULE_currencyMeta = 3;
TaxSpecParser.RULE_componentDef = 4;
TaxSpecParser.RULE_kindToken = 5;
TaxSpecParser.RULE_cell = 6;
TaxSpecParser.RULE_wrapper = 7;
TaxSpecParser.RULE_block = 8;
TaxSpecParser.RULE_stmt = 9;
TaxSpecParser.RULE_expr = 10;
TaxSpecParser.RULE_orExpr = 11;
TaxSpecParser.RULE_andExpr = 12;
TaxSpecParser.RULE_notExpr = 13;
TaxSpecParser.RULE_cmpExpr = 14;
TaxSpecParser.RULE_addExpr = 15;
TaxSpecParser.RULE_mulExpr = 16;
TaxSpecParser.RULE_powExpr = 17;
TaxSpecParser.RULE_unaryExpr = 18;
TaxSpecParser.RULE_primary = 19;
TaxSpecParser.RULE_evalCall = 20;
TaxSpecParser.RULE_fixCall = 21;
TaxSpecParser.RULE_refCall = 22;
TaxSpecParser.RULE_funcCall = 23;
TaxSpecParser.RULE_nameRef = 24;
TaxSpecParser.RULE_pieceExpr = 25;
TaxSpecParser.RULE_pieceArm = 26;
TaxSpecParser.RULE_scheduleExpr = 27;
TaxSpecParser.RULE_bracketsTaxableExpr = 28;
TaxSpecParser.RULE_rangeArm = 29;
TaxSpecParser.RULE_range = 30;
TaxSpecParser.RULE_bound = 31;

class ProgramContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_program;
    }

	EOF() {
	    return this.getToken(TaxSpecParser.EOF, 0);
	};

	countryBlock = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(CountryBlockContext);
	    } else {
	        return this.getTypedRuleContext(CountryBlockContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterProgram(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitProgram(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitProgram(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class CountryBlockContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_countryBlock;
    }

	countryName() {
	    return this.getTypedRuleContext(CountryNameContext,0);
	};

	LBRACE() {
	    return this.getToken(TaxSpecParser.LBRACE, 0);
	};

	RBRACE() {
	    return this.getToken(TaxSpecParser.RBRACE, 0);
	};

	currencyMeta() {
	    return this.getTypedRuleContext(CurrencyMetaContext,0);
	};

	componentDef = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ComponentDefContext);
	    } else {
	        return this.getTypedRuleContext(ComponentDefContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterCountryBlock(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitCountryBlock(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitCountryBlock(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class CountryNameContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_countryName;
    }

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	STRING() {
	    return this.getToken(TaxSpecParser.STRING, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterCountryName(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitCountryName(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitCountryName(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class CurrencyMetaContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_currencyMeta;
    }

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	IDENT = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.IDENT);
	    } else {
	        return this.getToken(TaxSpecParser.IDENT, i);
	    }
	};


	NUMBER() {
	    return this.getToken(TaxSpecParser.NUMBER, 0);
	};

	ASSIGN() {
	    return this.getToken(TaxSpecParser.ASSIGN, 0);
	};

	MUL() {
	    return this.getToken(TaxSpecParser.MUL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterCurrencyMeta(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitCurrencyMeta(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitCurrencyMeta(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ComponentDefContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_componentDef;
    }

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	ASSIGN() {
	    return this.getToken(TaxSpecParser.ASSIGN, 0);
	};

	cell() {
	    return this.getTypedRuleContext(CellContext,0);
	};

	COLON() {
	    return this.getToken(TaxSpecParser.COLON, 0);
	};

	kindToken() {
	    return this.getTypedRuleContext(KindTokenContext,0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterComponentDef(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitComponentDef(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitComponentDef(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class KindTokenContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_kindToken;
    }

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	UNDERSCORE() {
	    return this.getToken(TaxSpecParser.UNDERSCORE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterKindToken(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitKindToken(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitKindToken(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class CellContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_cell;
    }

	wrapper() {
	    return this.getTypedRuleContext(WrapperContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterCell(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitCell(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitCell(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class WrapperContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_wrapper;
    }

	LBRACE() {
	    return this.getToken(TaxSpecParser.LBRACE, 0);
	};

	block() {
	    return this.getTypedRuleContext(BlockContext,0);
	};

	RBRACE() {
	    return this.getToken(TaxSpecParser.RBRACE, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterWrapper(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitWrapper(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitWrapper(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class BlockContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_block;
    }

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	stmt = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(StmtContext);
	    } else {
	        return this.getTypedRuleContext(StmtContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterBlock(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitBlock(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitBlock(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class StmtContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_stmt;
    }

	LET() {
	    return this.getToken(TaxSpecParser.LET, 0);
	};

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	ASSIGN() {
	    return this.getToken(TaxSpecParser.ASSIGN, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterStmt(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitStmt(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitStmt(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_expr;
    }

	orExpr() {
	    return this.getTypedRuleContext(OrExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class OrExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_orExpr;
    }

	andExpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(AndExprContext);
	    } else {
	        return this.getTypedRuleContext(AndExprContext,i);
	    }
	};

	OR = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.OR);
	    } else {
	        return this.getToken(TaxSpecParser.OR, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterOrExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitOrExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitOrExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class AndExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_andExpr;
    }

	notExpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(NotExprContext);
	    } else {
	        return this.getTypedRuleContext(NotExprContext,i);
	    }
	};

	AND = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.AND);
	    } else {
	        return this.getToken(TaxSpecParser.AND, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterAndExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitAndExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitAndExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class NotExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_notExpr;
    }

	NOT() {
	    return this.getToken(TaxSpecParser.NOT, 0);
	};

	notExpr() {
	    return this.getTypedRuleContext(NotExprContext,0);
	};

	cmpExpr() {
	    return this.getTypedRuleContext(CmpExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterNotExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitNotExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitNotExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class CmpExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_cmpExpr;
    }

	addExpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(AddExprContext);
	    } else {
	        return this.getTypedRuleContext(AddExprContext,i);
	    }
	};

	LT() {
	    return this.getToken(TaxSpecParser.LT, 0);
	};

	LE() {
	    return this.getToken(TaxSpecParser.LE, 0);
	};

	GT() {
	    return this.getToken(TaxSpecParser.GT, 0);
	};

	GE() {
	    return this.getToken(TaxSpecParser.GE, 0);
	};

	EQEQ() {
	    return this.getToken(TaxSpecParser.EQEQ, 0);
	};

	NEQ() {
	    return this.getToken(TaxSpecParser.NEQ, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterCmpExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitCmpExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitCmpExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class AddExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_addExpr;
    }

	mulExpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(MulExprContext);
	    } else {
	        return this.getTypedRuleContext(MulExprContext,i);
	    }
	};

	ADD = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.ADD);
	    } else {
	        return this.getToken(TaxSpecParser.ADD, i);
	    }
	};


	SUB = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.SUB);
	    } else {
	        return this.getToken(TaxSpecParser.SUB, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterAddExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitAddExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitAddExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class MulExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_mulExpr;
    }

	powExpr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(PowExprContext);
	    } else {
	        return this.getTypedRuleContext(PowExprContext,i);
	    }
	};

	MUL = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.MUL);
	    } else {
	        return this.getToken(TaxSpecParser.MUL, i);
	    }
	};


	DIV = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.DIV);
	    } else {
	        return this.getToken(TaxSpecParser.DIV, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterMulExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitMulExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitMulExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PowExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_powExpr;
    }

	unaryExpr() {
	    return this.getTypedRuleContext(UnaryExprContext,0);
	};

	POW() {
	    return this.getToken(TaxSpecParser.POW, 0);
	};

	powExpr() {
	    return this.getTypedRuleContext(PowExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterPowExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitPowExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitPowExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class UnaryExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_unaryExpr;
    }

	unaryExpr() {
	    return this.getTypedRuleContext(UnaryExprContext,0);
	};

	ADD() {
	    return this.getToken(TaxSpecParser.ADD, 0);
	};

	SUB() {
	    return this.getToken(TaxSpecParser.SUB, 0);
	};

	primary() {
	    return this.getTypedRuleContext(PrimaryContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterUnaryExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitUnaryExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitUnaryExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PrimaryContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_primary;
    }

	NUMBER() {
	    return this.getToken(TaxSpecParser.NUMBER, 0);
	};

	INF() {
	    return this.getToken(TaxSpecParser.INF, 0);
	};

	TRUE() {
	    return this.getToken(TaxSpecParser.TRUE, 0);
	};

	FALSE() {
	    return this.getToken(TaxSpecParser.FALSE, 0);
	};

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	STRING() {
	    return this.getToken(TaxSpecParser.STRING, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	evalCall() {
	    return this.getTypedRuleContext(EvalCallContext,0);
	};

	fixCall() {
	    return this.getTypedRuleContext(FixCallContext,0);
	};

	refCall() {
	    return this.getTypedRuleContext(RefCallContext,0);
	};

	funcCall() {
	    return this.getTypedRuleContext(FuncCallContext,0);
	};

	pieceExpr() {
	    return this.getTypedRuleContext(PieceExprContext,0);
	};

	bracketsTaxableExpr() {
	    return this.getTypedRuleContext(BracketsTaxableExprContext,0);
	};

	scheduleExpr() {
	    return this.getTypedRuleContext(ScheduleExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterPrimary(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitPrimary(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitPrimary(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class EvalCallContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_evalCall;
    }

	EVAL() {
	    return this.getToken(TaxSpecParser.EVAL, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	nameRef() {
	    return this.getTypedRuleContext(NameRefContext,0);
	};

	COMMA() {
	    return this.getToken(TaxSpecParser.COMMA, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterEvalCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitEvalCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitEvalCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class FixCallContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_fixCall;
    }

	FIX() {
	    return this.getToken(TaxSpecParser.FIX, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	COMMA() {
	    return this.getToken(TaxSpecParser.COMMA, 0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterFixCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitFixCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitFixCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class RefCallContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_refCall;
    }

	TOTAL() {
	    return this.getToken(TaxSpecParser.TOTAL, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	nameRef() {
	    return this.getTypedRuleContext(NameRefContext,0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterRefCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitRefCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitRefCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class FuncCallContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_funcCall;
    }

	IDENT() {
	    return this.getToken(TaxSpecParser.IDENT, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	COMMA = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.COMMA);
	    } else {
	        return this.getToken(TaxSpecParser.COMMA, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterFuncCall(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitFuncCall(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitFuncCall(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class NameRefContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_nameRef;
    }

	IDENT = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.IDENT);
	    } else {
	        return this.getToken(TaxSpecParser.IDENT, i);
	    }
	};


	DOT = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.DOT);
	    } else {
	        return this.getToken(TaxSpecParser.DOT, i);
	    }
	};


	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterNameRef(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitNameRef(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitNameRef(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PieceExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_pieceExpr;
    }

	PIECE() {
	    return this.getToken(TaxSpecParser.PIECE, 0);
	};

	LBRACE() {
	    return this.getToken(TaxSpecParser.LBRACE, 0);
	};

	RBRACE() {
	    return this.getToken(TaxSpecParser.RBRACE, 0);
	};

	pieceArm = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(PieceArmContext);
	    } else {
	        return this.getTypedRuleContext(PieceArmContext,i);
	    }
	};

	ELSE() {
	    return this.getToken(TaxSpecParser.ELSE, 0);
	};

	COLON() {
	    return this.getToken(TaxSpecParser.COLON, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterPieceExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitPieceExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitPieceExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class PieceArmContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_pieceArm;
    }

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	COLON() {
	    return this.getToken(TaxSpecParser.COLON, 0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterPieceArm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitPieceArm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitPieceArm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class ScheduleExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_scheduleExpr;
    }

	BRACKETS() {
	    return this.getToken(TaxSpecParser.BRACKETS, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	rangeArm = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(RangeArmContext);
	    } else {
	        return this.getTypedRuleContext(RangeArmContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterScheduleExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitScheduleExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitScheduleExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class BracketsTaxableExprContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_bracketsTaxableExpr;
    }

	BRACKETS_TAXABLE() {
	    return this.getToken(TaxSpecParser.BRACKETS_TAXABLE, 0);
	};

	LPAREN() {
	    return this.getToken(TaxSpecParser.LPAREN, 0);
	};

	expr = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExprContext);
	    } else {
	        return this.getTypedRuleContext(ExprContext,i);
	    }
	};

	COMMA = function(i) {
		if(i===undefined) {
			i = null;
		}
	    if(i===null) {
	        return this.getTokens(TaxSpecParser.COMMA);
	    } else {
	        return this.getToken(TaxSpecParser.COMMA, i);
	    }
	};


	RPAREN() {
	    return this.getToken(TaxSpecParser.RPAREN, 0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	rangeArm = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(RangeArmContext);
	    } else {
	        return this.getTypedRuleContext(RangeArmContext,i);
	    }
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterBracketsTaxableExpr(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitBracketsTaxableExpr(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitBracketsTaxableExpr(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class RangeArmContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_rangeArm;
    }

	range() {
	    return this.getTypedRuleContext(RangeContext,0);
	};

	COLON() {
	    return this.getToken(TaxSpecParser.COLON, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	SEMI() {
	    return this.getToken(TaxSpecParser.SEMI, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterRangeArm(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitRangeArm(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitRangeArm(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class RangeContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_range;
    }

	LBRACK() {
	    return this.getToken(TaxSpecParser.LBRACK, 0);
	};

	bound = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(BoundContext);
	    } else {
	        return this.getTypedRuleContext(BoundContext,i);
	    }
	};

	DOTDOT() {
	    return this.getToken(TaxSpecParser.DOTDOT, 0);
	};

	RBRACK() {
	    return this.getToken(TaxSpecParser.RBRACK, 0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterRange(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitRange(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitRange(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}



class BoundContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = TaxSpecParser.RULE_bound;
    }

	INF() {
	    return this.getToken(TaxSpecParser.INF, 0);
	};

	expr() {
	    return this.getTypedRuleContext(ExprContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.enterBound(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof TaxSpecListener ) {
	        listener.exitBound(this);
		}
	}

	accept(visitor) {
	    if ( visitor instanceof TaxSpecVisitor ) {
	        return visitor.visitBound(this);
	    } else {
	        return visitor.visitChildren(this);
	    }
	}


}




TaxSpecParser.ProgramContext = ProgramContext; 
TaxSpecParser.CountryBlockContext = CountryBlockContext; 
TaxSpecParser.CountryNameContext = CountryNameContext; 
TaxSpecParser.CurrencyMetaContext = CurrencyMetaContext; 
TaxSpecParser.ComponentDefContext = ComponentDefContext; 
TaxSpecParser.KindTokenContext = KindTokenContext; 
TaxSpecParser.CellContext = CellContext; 
TaxSpecParser.WrapperContext = WrapperContext; 
TaxSpecParser.BlockContext = BlockContext; 
TaxSpecParser.StmtContext = StmtContext; 
TaxSpecParser.ExprContext = ExprContext; 
TaxSpecParser.OrExprContext = OrExprContext; 
TaxSpecParser.AndExprContext = AndExprContext; 
TaxSpecParser.NotExprContext = NotExprContext; 
TaxSpecParser.CmpExprContext = CmpExprContext; 
TaxSpecParser.AddExprContext = AddExprContext; 
TaxSpecParser.MulExprContext = MulExprContext; 
TaxSpecParser.PowExprContext = PowExprContext; 
TaxSpecParser.UnaryExprContext = UnaryExprContext; 
TaxSpecParser.PrimaryContext = PrimaryContext; 
TaxSpecParser.EvalCallContext = EvalCallContext; 
TaxSpecParser.FixCallContext = FixCallContext; 
TaxSpecParser.RefCallContext = RefCallContext; 
TaxSpecParser.FuncCallContext = FuncCallContext; 
TaxSpecParser.NameRefContext = NameRefContext; 
TaxSpecParser.PieceExprContext = PieceExprContext; 
TaxSpecParser.PieceArmContext = PieceArmContext; 
TaxSpecParser.ScheduleExprContext = ScheduleExprContext; 
TaxSpecParser.BracketsTaxableExprContext = BracketsTaxableExprContext; 
TaxSpecParser.RangeArmContext = RangeArmContext; 
TaxSpecParser.RangeContext = RangeContext; 
TaxSpecParser.BoundContext = BoundContext; 
