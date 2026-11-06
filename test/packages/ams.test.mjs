import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseToMathMLAst,toMathMLString,createMathMLParser} from '../../dist/index.js';
import {run} from '../../conformance/runner.mjs';
import subject from '../../bench/flashmath/adapter.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
test('ams: all immutable MathJax 4.1.3 fixtures including texclass and attributes',async()=>{
 const report=await run(subject,{...fixture,records:fixture.records.filter(r=>r.group==='ams')});
 assert.equal(report.total,158);
 assert.deepEqual(report.rows.filter(r=>r.status!=='matched'),[]);
});
test('ams: activation, invalid arguments, and isolated session numbering',()=>{
 const parse=(tex,packages=['base','ams'])=>toMathMLString(parseToMathMLAst(tex,{packages,display:true}));
 assert.match(parse('\\digamma',['base']),/merror/);
 assert.match(parse('\\digamma'),/ϝ/);
 assert.match(parse('\\genfrac{}{}{0}{4}{a}{b}'),/merror/);
 assert.match(parse('\\begin{alignat}{x}a\\end{alignat}'),/merror/);
 const first=createMathMLParser({packages:['base','ams'],display:true,tags:'ams'});
 const second=createMathMLParser({packages:['base','ams'],display:true,tags:'ams'});
 assert.match(toMathMLString(first.parse('\\begin{equation}a\\end{equation}')),/mjx-eqn:1/);
 assert.match(toMathMLString(first.parse('\\begin{equation}b\\end{equation}')),/mjx-eqn:2/);
 assert.match(toMathMLString(second.parse('\\begin{equation}c\\end{equation}')),/mjx-eqn:1/);
});

test('ams: additional MathJax comparisons for tags, optional row spacing and grouped operators',async()=>{
 const {compare}=await import('./helpers.mjs');
 for(const tex of [
  String.raw`\begin{equation}x\tag{A}\end{equation}`,
  String.raw`\begin{equation}x\notag\end{equation}`,
  String.raw`\begin{multline}a\tag{A}\\b\end{multline}`,
  String.raw`\begin{align}x&=y\label{eq}\tag{A}\\z&=w\end{align}`,
  String.raw`\begin{smallmatrix}a&b\\c&d\end{smallmatrix}`,
  String.raw`\genfrac{\langle}{\rangle}{1pt}{2}{a}{b}`,
  String.raw`\operatorname*{argmax}_{x}f(x)`,
  String.raw`\operatorname{f1}x`,
  String.raw`\begin{multline}a+b\\=c+d\end{multline}`,
  String.raw`\begin{align}a&=b\\[1em]c&=d\end{align}`,
  String.raw`\begin{align}a&=b\notag\\c&=d\end{align}`,
  String.raw`\begin{bmatrix}a&b\\c&d\end{bmatrix}`,
 ])await compare(tex,['base','ams'],{tags:'ams'});
 await compare(String.raw`\begin{multline}a\\b\end{multline}`,['base','ams'],{ams:{multlineWidth:'80%',multlineIndent:'2em'}});
 await compare(String.raw`\operatorname{abc}x`,['base','ams'],{ams:{operatornamePattern:/^[a-z]{1,2}/}});
});

test('ams: new MathML kinds serialize identically through React SSR',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {parseToReact}=await import('../../dist/react.js');
 for(const tex of [String.raw`\sideset{_a^b}{_c^d}\sum`,String.raw`\begin{align}a&=b\\c&=d\end{align}`]){
  const options={packages:['base','ams'],display:true,tags:'ams'};
  assert.equal(renderToStaticMarkup(parseToReact(tex,options)),toMathMLString(parseToMathMLAst(tex,options)));
 }
 assert.throws(()=>parseToMathMLAst('x',{packages:['base','ams'],texOptions:{tags:'base'}}),/Unsupported tag mode/);
});

test('ams: all 305 related package fixtures retain their denominator (303 matched, 2 upstream unsupported)',async()=>{
 const {relatedFixtures}=await import('./helpers.mjs');
 await relatedFixtures();
});
