import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseToMathMLAst, toMathMLString, createMathMLParser} from '../../dist/index.js';
import subject from '../../bench/flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {run} from '../../conformance/runner.mjs';
import {normalizeMathML} from '../../conformance/normalize.mjs';

const options={packages:['base','ams','mathtools'],display:true};
const xml=(tex,extra={})=>toMathMLString(parseToMathMLAst(tex,{...options,...extra}));
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));

test('all 196 immutable MathJax mathtools fixtures, including attributes and texclass',async()=>{
  const selected={...fixture,records:fixture.records.filter(r=>r.group==='mathtools')};
  assert.equal(selected.records.length,196);
  const report=await run(subject,selected);
  assert.equal(report.matched,196,JSON.stringify(report.rows.filter(r=>r.status!=='matched'),null,2));
});

test('base and newcommand match status never regresses from the captured baseline',async()=>{
  const baseline=JSON.parse(fs.readFileSync(new URL('../../bench/flashmath/pkg-mathtools-before.json',import.meta.url)));
  const matched=new Set(baseline.rows.filter(r=>r.status==='matched'&&['base','newcommand'].includes(r.group)).map(r=>r.id));
  const report=await run(subject,{...fixture,records:fixture.records.filter(r=>matched.has(r.id))});
  assert.deepEqual(report.rows.filter(r=>r.status!=='matched'),[]);
});

test('mathtools activation and literal colon are separate from the control sequence',async()=>{
  assert.match(xml(String.raw`\mathclap{x}`,{packages:['base']}),/Undefined control sequence/);
  for(const tex of [String.raw`a\:b`,String.raw`a:=b`,String.raw`\mathtoolsset{centercolon=true}a:=b`]){
    assert.equal(normalizeMathML(xml(tex)),normalizeMathML(await oracle(tex,options)),tex);
  }
});

test('paired delimiters, options and tag forms persist in a session and remain isolated',()=>{
  const session=createMathMLParser(options);
  session.parse(String.raw`\DeclarePairedDelimiter\abs{|}{|}\mathtoolsset{centercolon=true}\newtagform{brackets}{[}{]}\usetagform{brackets}`);
  const result=toMathMLString(session.parse(String.raw`\abs{x} a:=b \tag{n}`));
  assert.match(result,/voffset=".04em"/);
  assert.match(result,/<mtext>\[<\/mtext>/);
  assert.doesNotMatch(result,/merror/);
  assert.match(xml(String.raw`\abs{x}`),/Undefined control sequence/);
  assert.doesNotMatch(xml('a:=b'),/mpadded/);
  assert.match(xml(String.raw`\usetagform{brackets}`),/Undefined tag form/);
});

test('package expansions and parsing obey existing resource limits',()=>{
  assert.match(xml(String.raw`\DeclarePairedDelimiter\abs{|}{|}\abs{x}`,{maxExpansions:1}),/expansion limit/i);
  assert.match(xml(String.raw`\xmathstrut{0.1}`,{maxNodes:2}),/Node limit exceeded/);
  assert.match(xml(String.raw`\prescript{a}{b}{X}`,{maxDepth:1}),/Nesting limit exceeded/);
});
