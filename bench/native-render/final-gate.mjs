import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sourceFingerprint} from '../flashmath/fingerprint.mjs';
const checks=[],directory=new URL('./',import.meta.url);
function run(name,command,args,expected=0){
  const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:48*1024*1024});
  const output=(result.stdout??'')+(result.stderr??'');
  fs.writeFileSync(new URL(`final-${name}.log`,directory),output);
  checks.push({name,command:[command,...args],exit:result.status,expected});
  console.log(`${name}: exit ${result.status}\n${output.trimEnd().split('\n').slice(-10).join('\n')}`);
  assert.equal(result.status,expected,result.error?.message??name);
}
try{
  run('build',process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
  const files=fs.readdirSync('test').filter(n=>n.endsWith('.test.mjs')).map(n=>'test/'+n);
  files.push(...fs.readdirSync('test/packages').filter(n=>n.endsWith('.test.mjs')).map(n=>'test/packages/'+n));
  run('test',process.execPath,['--test','--test-reporter=tap',...files]);
  run('conformance',process.execPath,['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output','bench/native-render/conformance.json','--fresh'],1);
  const report=JSON.parse(fs.readFileSync(new URL('conformance.json',directory)));
  const baseline=JSON.parse(fs.readFileSync('bench/integration/07-fixes.json'));
  assert.equal(report.total,2683);assert.equal(report.matched,2635);
  assert.equal(report.rows.filter(r=>r.status==='mismatch').length,0);
  assert.equal(report.rows.filter(r=>r.status==='unsupported').length,48);
  assert.deepEqual(report.rows.map(r=>[r.id,r.status]),baseline.rows.map(r=>[r.id,r.status]));
  console.log('conformance exact gate: 2635 matched / 0 mismatched / 48 unsupported; baseline IDs/statuses unchanged');
  run('harness',process.execPath,['--test','--test-reporter=tap','conformance/harness.test.mjs']);
  run('compare',process.execPath,['bench/native-render/compare.mjs']);
  run('screen',process.execPath,['bench/native-render/screen.mjs']);
  run('visual',process.execPath,['bench/native-render/verify-screen.mjs']);
  run('unchanged','git',['diff','--exit-code','0ba4bef','--','conformance','pnpm-lock.yaml','bench/flashmath/adapter.mjs']);
  run('diff','git',['--git-dir=bench/native-render/.native-git','diff','--check','0ba4bef','--','src','test','docs','bench/native-render','README.md']);
  console.log('native render gate: PASS (feature/geometry parity; font-dependent pixel differences documented)');
}finally{
  fs.writeFileSync(new URL('final-checks.json',directory),JSON.stringify({sourceSha256:sourceFingerprint(),node:process.version,checks},null,2)+'\n');
}
