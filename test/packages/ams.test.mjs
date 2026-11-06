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
