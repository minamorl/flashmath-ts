import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import subject from '../../bench/flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {registeredPackages} from '../../dist/packages/registry.js';
import {normalizeMathML} from '../../conformance/normalize.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json',import.meta.url)));
const available=new Set(registeredPackages.map(p=>p.name));
export function fixtures(name){
  test(`${name}: immutable upstream fixtures`,async t=>{
    const rows=fixture.records.filter(r=>r.group===name);
    assert.ok(rows.length,`${name} has fixtures`);
    for(const row of rows){
      const missing=row.input?.packages?.map(p=>Array.isArray(p)?p[0]:p).filter(p=>!available.has(p))??[];
      if(row.input?.tex.includes('\\begin{align}')&&!registeredPackages.find(p=>p.name==='ams')?.environments.align)missing.push('ams/align');
      await t.test(row.id,{skip:row.unsupported?`upstream extraction: ${row.unsupported}`:missing.length?`integration dependency not registered in this lane: ${missing.join(', ')}`:false},()=>{
        const {tex,...options}=row.input;
        assert.equal(normalizeMathML(subject(tex,options)),normalizeMathML(row.expected),row.id);
      });
    }
  });
}
export function compare(name,cases){test(`${name}: additional MathJax 4.1.3 behavior`,async()=>{
  for(const entry of cases){const [tex,patch={}]=typeof entry==='string'?[entry]:entry;const options={packages:['base',name],display:true,...patch};assert.equal(normalizeMathML(subject(tex,options)),normalizeMathML(await oracle(tex,options)),tex);}
});}
export {assert,test,subject};
