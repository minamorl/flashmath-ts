import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const gitdir='bench/.integration-git',base='d3daf908c06960d4a04c95ededa6aed371c71d49';
function git(args){
 const r=spawnSync('git',[`--git-dir=${gitdir}`,...args],{encoding:'utf8',maxBuffer:16*1024*1024});
 assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout.trim();
}
const head=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
assert.equal(git(['status','--porcelain']),'','Commit the reviewed worktree before delivery');
for(const revision of ['2d6b58e','03ce698','2d4bf3c','b96b358','930c254','ed7da08'])git(['merge-base','--is-ancestor',revision,head]);
const files=git(['ls-files','-z','src','test','conformance','README.md','docs/integration.md','package.json','pnpm-lock.yaml']).split('\0').filter(Boolean);
const sourceSHA256={};
for(const file of files){
 const bytes=fs.readFileSync(file);
 const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 assert.equal(blob,git(['rev-parse',`${head}:${file}`]),file+' differs from committed source');
 sourceSHA256[file]=createHash('sha256').update(bytes).digest('hex');
}
git(['bundle','create','bench/integration.bundle','refs/heads/integrate',`^${base}`]);
const verify=spawnSync('git',['bundle','verify','bench/integration.bundle'],{encoding:'utf8'});
fs.writeFileSync('bench/integration-delivery-verify.log',verify.stdout+verify.stderr);
assert.equal(verify.status,0,verify.stdout+verify.stderr);
const metadata={base,head,tree,ref:'refs/heads/integrate',bundle:'bench/integration.bundle',bundleSHA256:createHash('sha256').update(fs.readFileSync('bench/integration.bundle')).digest('hex'),bundleVerifyExit:verify.status,sourceSHA256};
fs.writeFileSync('bench/integration-delivery.json',JSON.stringify(metadata,null,2)+'\n');
console.log(`head ${head}\nref ${metadata.ref}\nbase ${base}\nbundle verify: exit ${verify.status}`);
console.log(verify.stdout+verify.stderr);
