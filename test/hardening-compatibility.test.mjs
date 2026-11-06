import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import subject from '../bench/flashmath/adapter.mjs';
import {parseMathML,firstDifference} from '../conformance/normalize.mjs';
const records=JSON.parse(fs.readFileSync(new URL('../bench/hardening/regressions.json',import.meta.url)));
// The verifier captured these expected outputs in isolated MathJax processes.
// Its XML normalizer cannot read MathJax's unclosed HTML <br>; close only that
// HTML void element for tree comparison, retaining all semantic attributes.
for(const r of records)test(`verifier regression: ${r.g} ${r.tex}`,()=>{
 const expected=r.htmlVoidComparison?r.ex.replace(/<br>/g,'<br></br>'):r.ex;
 assert.equal(firstDifference(parseMathML(expected),parseMathML(subject(r.tex,r.o))),null);
});
