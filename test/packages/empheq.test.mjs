import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,compare} from './helpers.mjs';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('empheq: all immutable MathJax 4.1.3 fixtures',()=>fixtures('empheq',44));
test('empheq: simultaneous decorations, equation layout and invalid environment',async()=>{
 await compare(String.raw`\begin{empheq}[left=\empheqlbrace,right=R]{align}x&=y\\z&=w\end{empheq}`,['base','ams','empheq'],{tags:'ams'});
 await compare(String.raw`\begin{empheq}[left=L]{equation}x=y\end{empheq}`,['base','ams','empheq'],{tags:'ams'});
 const invalid=toMathMLString(parseToMathMLAst(String.raw`\begin{empheq}{array}x\end{empheq}`,{packages:['base','ams','empheq']}));
 assert.match(invalid,/Invalid environment/);
});
