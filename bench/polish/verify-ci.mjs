// Run the workflow's local steps and preserve command, exit and raw output.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {sourceFingerprint} from '../flashmath/fingerprint.mjs';
const dir=`bench/polish/ci-node-${process.versions.node.split('.')[0]}`;
fs.mkdirSync(dir,{recursive:true});
const checks=[];
function run(name,command,args,accepted=[0],env={}){
 const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:64e6,env:{...process.env,...env}});
 const output=(result.stdout??'')+(result.stderr??'');
 fs.writeFileSync(`${dir}/${name}.log`,output);
 const check={name,command:[command,...args],exit:result.status,accepted};checks.push(check);
 console.log(`${name}: exit ${result.status}\n${output.trimEnd().split('\n').slice(-12).join('\n')}`);
 assert.ok(accepted.includes(result.status),result.error?.message??`${name}: ${result.status}`);
}
try{
 console.log(`node ${process.version}`);
 // Offline mode keeps the explicitly requested locked install local.
 run('install','pnpm',['install','--frozen-lockfile'],[0],{npm_config_offline:'true',npm_config_update_notifier:'false'});
 run('build',process.execPath,['scripts/build.mjs']);
 const tests=['test','test/packages'].flatMap(d=>fs.readdirSync(d).filter(f=>f.endsWith('.test.mjs')).map(f=>d+'/'+f));
 run('tests',process.execPath,['--test','--test-reporter=tap',...tests,'conformance/harness.test.mjs','scripts/ci-checks.test.mjs']);
 run('conformance',process.execPath,['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',`${dir}/conformance.json`,'--fresh'],[0,1]);
 run('conformance-gate',process.execPath,['scripts/ci-conformance-gate.mjs',`${dir}/conformance.json`]);
 run('pack-smoke',process.execPath,['scripts/ci-pack-smoke.mjs']);
 console.log('CI local steps: PASS');
} finally {
 fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({node:process.version,sourceSha256:sourceFingerprint(),checks},null,2)+'\n');
}
