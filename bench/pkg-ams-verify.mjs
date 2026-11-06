import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const evidence=[];
function execute(label,args,log,accepted=[0]){
 const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:32*1024*1024});
 const output=(result.stdout??'')+(result.stderr??'');
 fs.writeFileSync(log,output);
 const tail=output.trimEnd().split('\n').slice(-12).join('\n');
 const message=`${label}: exit ${result.status}\n${tail}\n`;
 evidence.push(message);console.log(message);
 assert.ok(accepted.includes(result.status),`${label} failed; see ${log}`);
}
try{
 execute('build',['node_modules/typescript/bin/tsc','-p','tsconfig.json'],'bench/pkg-ams-build.log');
 // Explicit paths keep each lane's package tests visible without changing the shared script.
 execute('tests',['--test','test/core.test.mjs','test/packages-references.test.mjs','test/ssr-fixtures.test.mjs','test/packages/ams.test.mjs','test/packages/amscd.test.mjs','test/packages/cases.test.mjs','test/packages/empheq.test.mjs','conformance/harness.test.mjs'],'bench/pkg-ams-all-tests.log');
 execute('focused conformance',['bench/pkg-ams-check.mjs','ams','amscd','cases','empheq'],'bench/pkg-ams-focused.log');
 execute('full conformance',['conformance/runner.mjs','--subject','bench/flashmath/adapter.mjs','--output','bench/pkg-ams-conformance.json','--fresh'],'bench/pkg-ams-conformance.log',[0,1]);
 const before=JSON.parse(fs.readFileSync('bench/pkg-ams-baseline.json')),after=JSON.parse(fs.readFileSync('bench/pkg-ams-conformance.json'));
 assert.equal(after.total,before.total);
 assert.deepEqual(after.rows.map(r=>r.id),before.rows.map(r=>r.id));
 const regressions=after.rows.filter((row,i)=>before.rows[i].status==='matched'&&row.status!=='matched');
 assert.deepEqual(regressions,[]);
 for(const group of ['base','newcommand']){assert.equal(after.groups[group].total,before.groups[group].total);assert.ok(after.groups[group].matched>=before.groups[group].matched,`${group} matched count decreased`);}
 for(const [group,count] of Object.entries({ams:158,amscd:13,cases:5,empheq:44}))assert.deepEqual(after.groups[group],{total:count,matched:count,mismatch:0,unsupported:0});
 const output=['baseline comparison: exit 0',...['base','newcommand','ams','amscd','cases','empheq'].map(group=>`${group}: ${JSON.stringify(after.groups[group])}`),'matched -> failing fixture IDs: '+JSON.stringify(regressions)].join('\n');
 console.log(output);evidence.push(output);
 fs.writeFileSync('bench/pkg-ams-baseline-comparison.json',JSON.stringify({before:before.groups,after:after.groups,regressions},null,2)+'\n');
}catch(error){process.exitCode=1;evidence.push(String(error));console.error(error);}
finally{fs.writeFileSync('bench/pkg-ams-verification.txt',evidence.join('\n')+'\n');}
