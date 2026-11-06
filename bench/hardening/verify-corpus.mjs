// Replays the verifier's 40-package/cross-package corpus. Any mismatch is rerun
// with both engines in a fresh process to eliminate MathJax's module state.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {optionsFor} from './inputs.mjs';
const dir=path.dirname(new URL(import.meta.url).pathname);
const run=(file,args=[])=>{const r=spawnSync(process.execPath,[path.join(dir,file),...args],{encoding:'utf8',env:{...process.env,V:dir},maxBuffer:10e6});if(r.status!==0)throw Error(`${file} exit ${r.status}\n${r.stderr}`);return r.stdout;};
const output=run('generalize.mjs');fs.writeFileSync(path.join(dir,'generalize.log'),output);
const initial=JSON.parse(fs.readFileSync(path.join(dir,'generalize.json')));
const isolated=[];
for(const row of initial.rows.filter(r=>r.kind==='mismatch'||r.kind==='flash-throw')) {
 const input={tex:row.tex,o:optionsFor(row.g,row.tex)};
 const result=JSON.parse(run('one.mjs',[JSON.stringify(input)]).trim().split('\n').pop());
 isolated.push({...row,...result,input});
 if(result.same){const g=initial.results[row.g];g.match++;g.mismatch-=row.kind==='mismatch'?1:0;g.fmThrow-=row.kind==='flash-throw'?1:0;if(row.valid)g.validMatch++;}
}
const totals=Object.values(initial.results).reduce((a,g)=>{for(const k of ['total','match','mismatch','fmThrow','mjThrow','validTotal','validMatch'])a[k]=(a[k]||0)+g[k];return a;},{});
const result={totals,groups:initial.results,isolated,htmlVoidNormalization:'MathJax serializes HTML <br> without a closing tag; close HTML void br only for the XML comparator.'};
fs.writeFileSync(path.join(dir,'corpus-verified.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(totals));
for(const r of isolated.filter(r=>!r.same))console.log(JSON.stringify({group:r.g,tex:r.tex,difference:r.d,e1:r.e1,e2:r.e2}));
assert.equal(totals.validMatch,827);assert.equal(totals.validTotal,827);assert.equal(totals.match,969);assert.equal(totals.mismatch+totals.fmThrow,0);
