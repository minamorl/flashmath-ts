import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,compare} from './helpers.mjs';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('cases: all immutable MathJax 4.1.3 fixtures',()=>fixtures('cases',5));
test('cases: additional piecewise expression and extra text-column rejection',async()=>{
 await compare(String.raw`\begin{numcases}{g(t)=} t & for $t>0$ \\ -t & otherwise \end{numcases}`,['base','ams','cases'],{tags:'cases'});
 const invalid=toMathMLString(parseToMathMLAst(String.raw`\begin{numcases}{x=}a&one&two\end{numcases}`,{packages:['base','ams','cases'],tags:'cases'}));
 assert.match(invalid,/Extra alignment tab/);
});
