// Re-run the exact chem merge checkpoint with both manifest test globs.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=process.cwd(),destination=path.join(root,'bench/integration/checkpoint-replay');
fs.mkdirSync(destination,{recursive:true});
const archive=spawnSync('git',['--git-dir=bench/.integration-git','archive','40620d0'],{maxBuffer:64*1024*1024});
assert.equal(archive.status,0,archive.stderr.toString());
const extract=spawnSync('tar',['-xf','-','-C',destination],{input:archive.stdout});
assert.equal(extract.status,0,extract.stderr.toString());
fs.symlinkSync(path.join(root,'node_modules'),path.join(destination,'node_modules'),'dir');
const checks=[];
function check(name,args,allowed){
 const r=spawnSync(process.execPath,args,{cwd:destination,encoding:'utf8',maxBuffer:32*1024*1024});
 fs.writeFileSync(`bench/integration/04-chem-replay-${name}.log`,r.stdout+r.stderr);
 checks.push({name,args,exit:r.status});
 console.log(`${name}: exit ${r.status}\n${(r.stdout+r.stderr).trimEnd().split('\n').slice(-8).join('\n')}`);
 assert.ok(allowed.includes(r.status),name);
}
try{
 check('build',[path.join(root,'node_modules/typescript/bin/tsc'),'-p','tsconfig.json'],[0]);
 const files=['test','test/packages'].flatMap(d=>fs.readdirSync(path.join(destination,d)).filter(f=>f.endsWith('.test.mjs')).map(f=>d+'/'+f));
 check('test',['--test',...files],[0]);
 check('conformance',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',path.join(root,'bench/integration/04-chem-replay.json'),'--fresh'],[1]);
 const old=JSON.parse(fs.readFileSync('bench/integration/04-chem.json'));
 const replay=JSON.parse(fs.readFileSync('bench/integration/04-chem-replay.json'));
 assert.deepEqual(replay.rows,old.rows);
 console.log('Exact checkpoint replay matches every original row: PASS');
}finally{
 fs.writeFileSync('bench/integration/04-chem-replay-checks.json',JSON.stringify(checks,null,2)+'\n');
 fs.rmSync(destination,{recursive:true,force:true});
}
