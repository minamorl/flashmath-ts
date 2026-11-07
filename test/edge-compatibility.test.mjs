import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import oracle from '../conformance/mathjax.mjs';
import subject from '../bench/flashmath/adapter.mjs';
import {parseMathML,firstDifference} from '../conformance/normalize.mjs';

const captured = new Set(JSON.parse(fs.readFileSync(new URL('../conformance/fixtures/mathjax-4.1.3.json',import.meta.url))).records.map(r=>r.input?.tex));
async function compare(t,cases) {
  assert.ok(new Set(cases.map(c=>c.tex)).size>=30);
  for(const {tex,...options} of cases) {
    assert.ok(!captured.has(tex), `outside fixture: ${tex}`);
    const expected=await oracle(tex,options),actual=subject(tex,options);
    assert.doesNotMatch(expected, /<merror/);
    assert.equal(firstDifference(parseMathML(expected),parseMathML(actual)),null,`${tex}\nEXPECTED ${expected}\nACTUAL ${actual}`);
  }
  t.diagnostic(`${cases.length} fresh MathJax 4.1.3 comparisons`);
}

test('multlined initial operators match MathJax with each position and multiple rows', async t=>{
  const cases=[];
  for(const option of ['', '[t]', '[b]', '[c]']) for(const operator of ['+', '-', '=', String.raw`\times`, String.raw`\leq`, String.raw`\to`, String.raw`\pm`, String.raw`\cdot`]) {
    for(const prefix of ['', '{}', String.raw`\,`]) for(const tail of ['',String.raw`\\-d_9`]) {
      cases.push({tex:`\\begin{multlined}${option}a_7+b_3\\\\${prefix}${operator} c_5${tail}\\end{multlined}`,packages:['base','ams','mathtools'],display:true});
    }
  }
  for(const option of ['', '[t]'])cases.push({tex:`\\begin{multlined}${option}a+b\\\\+c\\end{multlined}`,packages:['base','ams','mathtools'],display:true});
  // Controls: first-row operators retain prefix behavior, grouped operators
  // remain embellished, and nonoperators must not acquire an initial mi.
  for(const body of [String.raw`+a_7\\b_3`,String.raw`a_7\\c_5`,String.raw`a_7\\{+}c_5`,String.raw`a_7\\\mathrm{X}c_5`])
    cases.push({tex:`\\begin{multlined}${body}\\end{multlined}`,packages:['base','ams','mathtools'],display:true});
  await compare(t,cases);
});

test('chemistry alignment escapes preserve initial infix operators after empty atoms',async t=>{
  const cases=[];
  for(const env of ['aligned','align','align*','split']) for(const op of ['->','<-','<->','<=>','=','+','-','<<','>>']) {
    for(const pair of [['A','B'],['H2O','CO2'],['Na+','Cl-'],['Fe^{III}','H2']]) {
      cases.push({tex:`\\begin{${env}}\\ce{${pair[0]} &${op} ${pair[1]}}\\end{${env}}`,packages:['base','ams','mhchem'],display:true});
    }
  }
  // Controls: chemistry outside the alignment escape and multiple rows.
  for(const env of ['aligned','align']) for(const body of [String.raw`\ce{A}&\ce{B}`,String.raw`\ce{A &-> B}\\\ce{C &= D}`,String.raw`\ce{A &B}`,String.raw`\ce{A &->[heat] B}`])
    cases.push({tex:`\\begin{${env}}${body}\\end{${env}}`,packages:['base','ams','mhchem'],display:true});
  await compare(t,cases);
});
