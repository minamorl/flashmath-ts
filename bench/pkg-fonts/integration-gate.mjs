import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {normalizeMathML} from '../../conformance/normalize.mjs';
import oracle from '../../conformance/mathjax.mjs';
const root='bench/pkg-fonts',names=['color','colorv2','colortbl','boldsymbol','bbm','bboldx','dsfont','upgreek','gensymb','textcomp','unicode','texhtml','html','action','tagformat'];
const logfile=root+'/integration-conformance.log',fd=fs.openSync(logfile,'w');
const cmd=['conformance/runner.mjs','--subject',root+'/integration/adapter.mjs','--output',root+'/integration-conformance.json','--fresh'];
const result=spawnSync('node',cmd,{stdio:['ignore',fd,fd]});fs.closeSync(fd);
console.log('$ node',...cmd,'\nexit:',result.status);
console.log(fs.readFileSync(logfile,'utf8').trimEnd().split('\n').slice(-6).join('\n'));
assert.equal(result.status,1,'the complete suite still contains unrelated failures and unsupported extraction rows');
const report=JSON.parse(fs.readFileSync(root+'/integration-conformance.json'));
const fixture=JSON.parse(fs.readFileSync('conformance/fixtures/mathjax-4.1.3.json'));
const before=JSON.parse(fs.readFileSync(root+'/before.json'));
const byId=new Map(report.rows.map(r=>[r.id,r]));
for(const record of fixture.records){if(!record.input?.packages?.some(p=>names.includes(Array.isArray(p)?p[0]:p)))continue;
  const row=byId.get(record.id);assert.ok(row);assert.equal(row.status,record.unsupported?'unsupported':'matched',record.id+' '+JSON.stringify(row.difference??row.error));
}
for(const group of ['base','newcommand']){const matched=new Set(report.rows.filter(r=>r.group===group&&r.status==='matched').map(r=>r.id));for(const previous of before.rows.filter(r=>r.group===group&&r.status==='matched'))assert.ok(matched.has(previous.id),previous.id);}
console.log('package | matched | mismatch | unsupported | total');
for(const name of names){const g=report.byPackage[name];console.log(`${name} | ${g.matched} | ${g.mismatch} | ${g.unsupported} | ${g.total}`);assert.equal(g.total,before.byPackage[name].total);}
for(const group of ['base','newcommand'])console.log(group,JSON.stringify(report.groups[group]));
// Activation boundaries in the supplementary text integration patch.
const subject=(await import(pathToFileURL(process.cwd()+'/'+root+'/integration/adapter.mjs').href)).default;
for(const tex of [String.raw`\text{\textbb{x}}`,String.raw`\text{\textcent}`]){const options={packages:['base','textmacros'],display:true};assert.equal(normalizeMathML(subject(tex,options)),normalizeMathML(await oracle(tex,options)),tex);}
console.log('text package activation boundary: PASS');
const summary={runnerExit:result.status,subject:root+'/integration/adapter.mjs',packages:Object.fromEntries(names.map(n=>[n,report.byPackage[n]])),base:report.groups.base,newcommand:report.groups.newcommand,sourceHashes:JSON.parse(fs.readFileSync(root+'/integration/sources.json')),gate:'all target membership rows matched; original unsupported rows preserved; baseline matched IDs preserved'};
fs.writeFileSync(root+'/integration-summary.json',JSON.stringify(summary,null,2)+'\n');console.log('integration target fixture gate: PASS');
