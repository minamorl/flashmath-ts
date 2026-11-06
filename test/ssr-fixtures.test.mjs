import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToMathMLAst,toMathMLString} from '../dist/index.js';
import {parseToReact} from '../dist/react.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
test('SSR exactly equals string output for all 848 executable base/newcommand fixtures',()=>{
 for(const record of fixture.records.filter(r=>['base','newcommand'].includes(r.group)&&!r.unsupported)){
  const options={display:record.input.display,decimalSeparator:record.input.texOptions.digits?.includes(',')?',':'.'};
  assert.equal(renderToStaticMarkup(parseToReact(record.input.tex,options)),toMathMLString(parseToMathMLAst(record.input.tex,options)),record.id);
 }
});
