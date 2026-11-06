import assert from 'node:assert/strict';
import fs from 'node:fs';
import {run} from '../../conformance/runner.mjs';
import {parseMathML,firstDifference} from '../../conformance/normalize.mjs';
import subject from '../../bench/flashmath/adapter.mjs';
import mathjax from '../../conformance/mathjax.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
export async function fixtures(group,count){
 const report=await run(subject,{...fixture,records:fixture.records.filter(r=>r.group===group)});
 assert.equal(report.total,count);
 assert.deepEqual(report.rows.filter(r=>r.status!=='matched'),[]);
}
export async function compare(tex,packages,texOptions={}){
 const options={packages,texOptions,display:true};
 const expected=await mathjax(tex,options),actual=subject(tex,options);
 assert.equal(firstDifference(parseMathML(expected),parseMathML(actual)),null,`${tex}\nexpected: ${expected}\nactual: ${actual}`);
}
