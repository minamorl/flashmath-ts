import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const gitdir='bench/native-render/.native-git';
const base='0ba4bef1a9edbe3125616edfb6691e695bd74b34';
const bundle='bench/native-render.bundle';
function git(args){
  const r=spawnSync('git',[`--git-dir=${gitdir}`,...args],{encoding:'utf8',maxBuffer:24*1024*1024});
  assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout.trim();
}
assert.equal(git(['diff','--name-only','HEAD']),'','Commit reviewed tracked artifacts first');
const allowed=new Set(['bench/native-render.bundle','bench/native-render-delivery.json']);
for(const file of git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean))assert.ok(allowed.has(file),'Uncommitted artifact: '+file);
const head=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
const files=git(['ls-files','-z','src','test','docs','README.md','bench/native-render']).split('\0').filter(Boolean);
const sha256={};
for(const file of files){
  const bytes=fs.readFileSync(file);
  const blob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(blob,git(['rev-parse',`${head}:${file}`]),file+' differs from committed artifact');
  sha256[file]=createHash('sha256').update(bytes).digest('hex');
}
git(['bundle','create',bundle,'refs/heads/native-render',`^${base}`]);
const verification=spawnSync('git',['bundle','verify',bundle],{encoding:'utf8'});
fs.writeFileSync('bench/native-render/bundle-verify.log',verification.stdout+verification.stderr);
assert.equal(verification.status,0,verification.stdout+verification.stderr);
const metadata={base,head,tree,ref:'refs/heads/native-render',bundle,bundleSHA256:createHash('sha256').update(fs.readFileSync(bundle)).digest('hex'),bundleVerifyExit:verification.status,sha256,externalSend:false,npmPublish:false,pixelParity:'not achieved; native/mathjax font and metric differences documented',review:'root verifier must assess final visual acceptance; no broker checkpoints were called'};
fs.writeFileSync('bench/native-render-delivery.json',JSON.stringify(metadata,null,2)+'\n');
console.log(`head ${head}\nbase ${base}\nref ${metadata.ref}\nbundle verify: exit ${verification.status}\n${verification.stdout}${verification.stderr}`);
