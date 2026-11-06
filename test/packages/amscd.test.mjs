import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,compare} from './helpers.mjs';
import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
test('amscd: all immutable MathJax 4.1.3 fixtures',()=>fixtures('amscd',13));
test('amscd: additional diagram and per-parser dimensions',async()=>{
 await compare(String.raw`\begin{CD}X @>f>>Y\\@VVgV @VVhV\\Z @>>k>W\end{CD}`,['base','amscd']);
 await compare(String.raw`\begin{CD}X @>a>>Y\end{CD}`,['base','amscd'],{amscd:{colspace:'1em',rowspace:'2pt',harrowsize:'4em',varrowsize:'3em'}});
 const parse=tex=>toMathMLString(parseToMathMLAst(tex,{packages:['base','amscd'],display:true}));
 assert.match(parse(String.raw`\minCDarrowwidth{4em}\begin{CD}X @>>>Y\end{CD}`),/minsize="4em"/);
 assert.match(parse(String.raw`\begin{CD}X @>>>Y\end{CD}`),/minsize="2.75em"/);
 assert.match(parse(String.raw`\begin{CD}X @>a>\end{CD}`),/merror/);
});
