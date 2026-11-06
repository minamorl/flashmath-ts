import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const out='bench/pkg-fonts';
const steps=[['build','node_modules/.bin/tsc',['-p','tsconfig.json']],['tests','node',['--test','--test-reporter=tap',...fs.readdirSync('test').filter(n=>n.endsWith('.test.mjs')).map(n=>'test/'+n)]],['conformance','node',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output',out+'/final.json','--fresh']]];
const checks=[];
for(const [name,cmd,args] of steps){const logfile=out+'/final-'+name+'.log',fd=fs.openSync(logfile,'w');const result=spawnSync(cmd,args,{stdio:['ignore',fd,fd]});fs.closeSync(fd);const tail=fs.readFileSync(logfile,'utf8').trimEnd().split('\n').slice(-12);console.log('$',cmd,...args,'\nexit:',result.status,'\n'+tail.join('\n'));checks.push({name,command:[cmd,...args],exit:result.status,logfile});if(name!=='conformance'&&result.status!==0)process.exit(result.status??1);}
const before=JSON.parse(fs.readFileSync(out+'/before.json')),after=JSON.parse(fs.readFileSync(out+'/final.json'));
for(const group of ['base','newcommand']){
  const previous=before.rows.filter(r=>r.group===group&&r.status==='matched').map(r=>r.id),current=new Set(after.rows.filter(r=>r.group===group&&r.status==='matched').map(r=>r.id));
  for(const id of previous)assert.ok(current.has(id),`regression: ${id}`);
  assert.ok(after.groups[group].matched>=before.groups[group].matched);
  console.log(group,JSON.stringify(after.groups[group]));
}
const names=['color','colorv2','colortbl','boldsymbol','bbm','bboldx','dsfont','upgreek','gensymb','textcomp','unicode','texhtml','html','action','tagformat','fontsizev3'];
const summary={checks,groups:Object.fromEntries(names.filter(n=>after.groups[n]).map(n=>[n,after.groups[n]])),packages:Object.fromEntries(names.filter(n=>after.byPackage[n]).map(n=>[n,after.byPackage[n]])),regression:'base and newcommand matched IDs preserved'};
fs.writeFileSync(out+'/validation.json',JSON.stringify(summary,null,2)+'\n');console.log('regression gate: PASS');
