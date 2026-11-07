// Replay CI steps locally and retain exact commands, statuses and output tails.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
assert.ok(process.env.TMPDIR,'TMPDIR required');
const checks=[],directory='bench/release';
function run(name,command,args,allowed=[0]){
 const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:64e6,env:{...process.env,PNPM_DISABLE_SELF_UPDATE_CHECK:'1'}});
 const output=(result.stdout??'')+(result.stderr??'');
 fs.writeFileSync(`${directory}/ci-${name}.log`,output);
 const row={name,command:[command,...args],exit:result.status,allowed,tail:output.trimEnd().split('\n').slice(-12)};checks.push(row);
 console.log(JSON.stringify(row,null,2));
 assert.ok(allowed.includes(result.status),name+': '+(result.error??result.signal??result.status));
}
try{
 run('install','pnpm',['install','--frozen-lockfile']);
 run('build',process.execPath,['scripts/build.mjs']);
 const tests=['test','test/packages','conformance','scripts'].flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.test.mjs')).map(f=>d+'/'+f));
 run('tests',process.execPath,['--test',...tests]);
 run('conformance',process.execPath,['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',`${directory}/ci-conformance.json`,'--fresh'],[0,1]);
 run('conformance-gate',process.execPath,['scripts/ci-conformance-gate.mjs',`${directory}/ci-conformance.json`]);
 run('pack-smoke',process.execPath,['scripts/ci-pack-smoke.mjs']);
 console.log('CI replay: PASS');
}finally{
 fs.writeFileSync(`${directory}/ci-checks.json`,JSON.stringify({node:process.version,createdAt:new Date().toISOString(),checks},null,2)+'\n');
}
