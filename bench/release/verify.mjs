// One offline/local command regenerates every release check and artifact.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sourceFingerprint} from '../flashmath/fingerprint.mjs';
const checks=[],dir='bench/release';
fs.mkdirSync(dir,{recursive:true});
function run(name,args,expected=0,env={}){
 const p=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:64e6,env:{...process.env,...env}});
 const out=(p.stdout??'')+(p.stderr??'');fs.writeFileSync(`${dir}/${name}.log`,out);
 checks.push({name,command:[process.execPath,...args],exit:p.status,expected});
 console.log(`${name}: exit ${p.status} (expected ${expected})\n${out.trimEnd().split('\n').slice(-12).join('\n')}`);
 assert.equal(p.status,expected,p.error?.message??name);
}
try{
 run('build',['scripts/build.mjs']);
 const tests=['test','test/packages'].flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.test.mjs')).map(f=>d+'/'+f));
 run('tests',['--test','--test-reporter=tap',...tests]);
 run('harness',['--test','--test-reporter=tap','conformance/harness.test.mjs']);
 run('scoped-conformance',['bench/flashmath/conformance.mjs']);
 // The upstream CLI returns 1 for the retained unsupported records. Require
 // exact per-ID statuses as well as counts before accepting that exit status.
 run('conformance',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',`${dir}/conformance.json`,'--fresh'],1);
 const full=JSON.parse(fs.readFileSync(`${dir}/conformance.json`)),base=JSON.parse(fs.readFileSync('bench/integration/07-fixes.json'));
 assert.equal(full.total,2683);assert.equal(full.matched,2635);
 assert.equal(full.rows.filter(r=>r.status==='mismatch').length,0);
 assert.equal(full.rows.filter(r=>r.status==='unsupported').length,48);
 assert.deepEqual(full.rows.map(r=>[r.id,r.status]),base.rows.map(r=>[r.id,r.status]));
 console.log('full conformance exact gate: 2635 matched / 0 mismatched / 48 unsupported; baseline IDs/statuses retained');
 run('corpus',['bench/hardening/verify-corpus.mjs']);
 run('bussproofs',['bench/release/bussproofs.mjs']);
 run('grammar',['bench/flashmath/generate-mhchem-grammar.mjs','--check']);
 run('compare',['bench/native-render/compare.mjs']);
 run('screen',['bench/native-render/screen.mjs']);
 run('visual',['bench/native-render/verify-screen.mjs']);
 const visual=JSON.parse(fs.readFileSync('bench/native-render/visual-checks.json'));
 assert.ok(visual.formulas>=202);assert.ok(visual.checks.length>=724);
 assert.deepEqual(visual.failures,[]);assert.deepEqual(visual.referenceDifferences,[]);
 run('benchmark',['bench/hardening/bench-driver.mjs'],0,{V:path.resolve('bench/hardening'),ENG:'flashmath,session,mathjax,temml',COLD:'9',WARM:'5',OUT:'../flashmath/hardening-benchmark.raw.json'});
 run('benchmark-summary',['bench/hardening/report-benchmark.mjs']);
 run('readme',['bench/release/readme.mjs']);
 run('pack-smoke',['bench/release/pack.mjs']);
 console.log('release gate: PASS; local candidate only, no external transmission');
}finally{
 fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({sourceSha256:sourceFingerprint(),node:process.version,createdAt:new Date().toISOString(),checks},null,2)+'\n');
}
