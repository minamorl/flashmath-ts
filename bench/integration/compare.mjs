import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const stages=['01-ams','02-mathtools','03-physics','04-chem','05-fonts','06-misc','07-fixes'];
const baselines=[
 ['core','d3daf90','bench/flashmath/full-conformance.json'],
 ['ams','2d6b58e','bench/pkg-ams-conformance.json'],
 ['mathtools','03ce698','bench/flashmath/pkg-mathtools-full.json'],
 ['physics','2d4bf3c','bench/flashmath/pkg-physics-conformance.json'],
 ['chem','b96b358','bench/flashmath/pkg-chem-conformance.json'],
 ['fonts','930c254','bench/pkg-fonts/final.json'],
 ['fonts-supplement','930c254','bench/pkg-fonts/integration-conformance.json'],
 ['misc','ed7da08','bench/pkg-misc/full-conformance.json'],
 ['misc-supplement','ed7da08','bench/pkg-misc/integration.json'],
];
const fixtureBytes=fs.readFileSync('conformance/fixtures/mathjax-4.1.3.json');
const fixture=JSON.parse(fixtureBytes);
const reports=stages.map(stage=>({stage,...JSON.parse(fs.readFileSync(`bench/integration/${stage}.json`))}));
const final=reports.at(-1),finalById=new Map(final.rows.map(r=>[r.id,r]));
assert.equal(final.rows.length,fixture.records.length);
assert.equal(final.total,2683);
for(const report of reports){
 assert.equal(report.rows.length,fixture.records.length,report.stage);
 report.rows.forEach((row,i)=>{
  assert.equal(row.id,fixture.records[i].id);
  assert.equal(row.group,fixture.records[i].group);
  if(fixture.records[i].unsupported)assert.equal(row.status,'unsupported',row.id);
 });
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const snapshots=[],union=new Set();
for(const [name,revision,file] of baselines){
 const bytes=spawnSync('git',['show',`${revision}:${file}`],{maxBuffer:32*1024*1024});
 assert.equal(bytes.status,0,`${revision}:${file}: ${bytes.stderr}`);
 const report=JSON.parse(bytes.stdout),regressions=[];
 const seen=new Set();
 for(const row of report.rows){
  assert.ok(!seen.has(row.id),row.id);seen.add(row.id);
  assert.ok(finalById.has(row.id),row.id);
  if(row.status==='matched'){
   union.add(row.id);
   if(finalById.get(row.id).status!=='matched')regressions.push(row.id);
  }
 }
 const entry={name,revision,file,sha256:sha256(bytes.stdout),total:report.total,matched:report.matched,regressions,groups:report.groups,byPackage:report.byPackage};
 snapshots.push(entry);
 console.log(`${name}: ${report.matched}/${report.total}; regressions ${JSON.stringify(regressions)}`);
 assert.deepEqual(regressions,[],name);
}
const stageRegressions=[];
for(let i=1;i<reports.length;i++){
 const now=new Map(reports[i].rows.map(r=>[r.id,r.status]));
 const ids=reports[i-1].rows.filter(r=>r.status==='matched'&&now.get(r.id)!=='matched').map(r=>r.id);
 stageRegressions.push({from:stages[i-1],to:stages[i],ids});
 assert.deepEqual(ids,[],`${stages[i-1]} -> ${stages[i]}`);
}
const unsupported=fixture.records.filter(r=>r.unsupported).map(({id,group,unsupported})=>({id,group,category:unsupported}));
assert.equal(unsupported.length,48);
assert.deepEqual(final.rows.filter(r=>r.status==='mismatch'),[]);
assert.equal(final.matched,fixture.records.length-unsupported.length);
for(const path of ['conformance','pnpm-lock.yaml']){
 const diff=spawnSync('git',['diff','--exit-code','d3daf90','--',path],{encoding:'utf8'});
 assert.equal(diff.status,0,diff.stdout+diff.stderr);
}
const summary={fixtureSHA256:sha256(fixtureBytes),total:final.total,matched:final.matched,rate:final.rate,executable:final.total-unsupported.length,mismatches:[],unionPreviouslyMatched:union.size,regressions:[],snapshots,stageRegressions,unsupported};
fs.writeFileSync('bench/integration/comparison.json',JSON.stringify(summary,null,2)+'\n');
const lines=['package membership | lane best | 01 AMS | 02 mathtools | 03 physics | 04 chem | 05 fonts | 06 misc | final | total',
 '--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---:'];
for(const [name,counts] of Object.entries(final.byPackage)){
 const best=Math.max(...snapshots.map(s=>s.byPackage?.[name]?.matched??0));
 lines.push([name,best,...reports.map(r=>r.byPackage[name].matched),counts.total].join(' | '));
}
fs.writeFileSync('bench/integration/packages.md',lines.join('\n')+'\n');
console.log(`ALL ${final.matched}/${final.total}; executable ${final.matched}/${summary.executable}; unsupported ${unsupported.length}`);
console.log(`union of earlier matched IDs: ${union.size}; regressions: []`);
console.log('unchanged conformance/ and pnpm-lock.yaml: PASS');
