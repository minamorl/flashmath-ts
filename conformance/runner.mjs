import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseMathML,firstDifference} from './normalize.mjs';
import {reviveOptions} from './options.mjs';
export const defaultFixture=fileURLToPath(new URL('./fixtures/mathjax-4.1.3.json',import.meta.url));
export async function run(subject,fixture,{previousRows=[],onRow=()=>{}}={}) {
  const rows=[], groups={}, byPackage={}, classifications={};
  if(fixture.schemaVersion!==1 || !fixture.records?.length) throw Error('Empty or unsupported fixture');
  if(previousRows.length>fixture.records.length) throw Error('Checkpoint has too many records');
  const ids=new Set();
  for(const record of fixture.records) {
    if(ids.has(record.id)) throw Error(`Duplicate fixture ID ${record.id}`); ids.add(record.id);
    const saved=previousRows[rows.length];
    if(saved && (saved.id!==record.id || saved.group!==record.group || !['matched','mismatch','unsupported'].includes(saved.status))) throw Error('Checkpoint record mismatch');
    const row=saved || {id:record.id,group:record.group,status:'mismatch',category:null};
    const group=groups[record.group]??={total:0,matched:0,mismatch:0,unsupported:0}; group.total++;
    if(saved) { /* Reuse a completed, fingerprinted journal entry. */ }
    else if(record.unsupported) { row.status='unsupported'; row.category=record.unsupported; }
    else {
      let expected;
      try { expected=parseMathML(record.expected); }
      catch(e) { row.category='invalid-expected'; row.error=String(e); }
      if(expected) {
        try {
          const {tex,...options}=record.input;
          row.actual=await subject(tex,reviveOptions(options));
          let actual;
          try { actual=parseMathML(row.actual); }
          catch(e) { row.category='invalid-actual'; row.error=String(e); }
          if(actual) {
            row.difference=firstDifference(expected,actual);
            row.category=row.difference?.category || null;
            if(!row.difference) row.status='matched';
          }
        } catch(e) { row.category='subject-error'; row.error=String(e); }
      }
    }
    group[row.status]++;
    const packages=record.input?.packages?.map(p=>Array.isArray(p)?p[0]:p) || ['(uncaptured)'];
    for(const name of new Set(packages)) {
      const count=byPackage[name]??={total:0,matched:0,mismatch:0,unsupported:0};
      count.total++; count[row.status]++;
    }
    if(row.category) classifications[row.category]=(classifications[row.category]||0)+1;
    // Keep raw candidate MathML only on failures; expected remains in fixture.
    if(row.status==='matched') { delete row.actual; delete row.difference; }
    rows.push(row);
    if(!saved) await onRow(row,rows.length);
  }
  const total=rows.length, matched=rows.filter(r=>r.status==='matched').length;
  return {version:fixture.provenance?.version,total,matched,rate:matched/total,groups,byPackage,classifications,rows};
}
export function table(report) {
  const lines=['group | matched | mismatch | unsupported | total | matched/total','--- | ---: | ---: | ---: | ---: | ---:'];
  for(const [name,g] of Object.entries(report.groups)) lines.push(`${name} | ${g.matched} | ${g.mismatch} | ${g.unsupported} | ${g.total} | ${(100*g.matched/g.total).toFixed(2)}%`);
  const mismatch=report.rows.filter(r=>r.status==='mismatch').length;
  lines.push(`ALL | ${report.matched} | ${mismatch} | ${report.total-report.matched-mismatch} | ${report.total} | ${(100*report.rate).toFixed(2)}%`);
  lines.push('', 'package membership (overlapping; each denominator includes failures and unsupported):', 'package | matched | mismatch | unsupported | total | matched/total', '--- | ---: | ---: | ---: | ---: | ---:');
  for(const [name,g] of Object.entries(report.byPackage)) lines.push(`${name} | ${g.matched} | ${g.mismatch} | ${g.unsupported} | ${g.total} | ${(100*g.matched/g.total).toFixed(2)}%`);
  lines.push('',`classifications: ${JSON.stringify(report.classifications)}`);
  return lines.join('\n');
}
if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  const args=process.argv.slice(2);
  const value=(flag,fallback)=>{ const i=args.indexOf(flag); return i<0?fallback:args[i+1]; };
  const subjectPath=value('--subject',fileURLToPath(new URL('./mathjax.mjs',import.meta.url)));
  const subject=(await import(pathToFileURL(path.resolve(subjectPath)).href)).default;
  if(typeof subject!=='function') throw Error('Subject must default-export a function');
  const fixtureBytes=fs.readFileSync(value('--fixture',defaultFixture));
  const fixture=JSON.parse(fixtureBytes);
  const output=value('--output',fileURLToPath(new URL('./results/mathjax-self.json',import.meta.url)));
  const journal=output+'.jsonl';
  const digest=createHash('sha256').update(process.version).update(fixtureBytes).update(fs.readFileSync(subjectPath));
  // Local harness changes invalidate cached rows, including changes to the MathJax adapter.
  for(const name of fs.readdirSync(new URL('./',import.meta.url)).filter(n=>n.endsWith('.mjs')).sort()) digest.update(fs.readFileSync(new URL(name,import.meta.url)));
  digest.update(fs.readFileSync(new URL(import.meta.resolve('@mathjax/src/package.json'))));
  const header={type:'conformance-journal-v1',fingerprint:digest.digest('hex'),subject:path.resolve(subjectPath)};
  let previousRows=[];
  if(fs.existsSync(journal) && !args.includes('--fresh')) {
    const bytes=fs.readFileSync(journal), end=bytes.lastIndexOf(10)+1;
    if(!end) throw Error('Incomplete journal header; use --fresh');
    const lines=bytes.subarray(0,end).toString('utf8').trimEnd().split('\n');
    if(JSON.stringify(JSON.parse(lines.shift()))!==JSON.stringify(header)) throw Error('Stale checkpoint; use --fresh or another --output');
    previousRows=lines.map(line=>JSON.parse(line));
    fs.truncateSync(journal,end); // Discard only a torn final line after an interrupted append.
  } else fs.writeFileSync(journal,JSON.stringify(header)+'\n');
  console.error(`checkpoint: ${previousRows.length}/${fixture.records.length} completed`);
  if(previousRows.length && subject.restore) await subject.restore(fixture.records,previousRows);
  const report=await run(subject,fixture,{previousRows,onRow(row,count) {
    fs.appendFileSync(journal,JSON.stringify(row)+'\n');
    if(count%100===0) console.error(`progress: ${count}/${fixture.records.length}`);
  }});
  report.run={fingerprint:header.fingerprint,subject:path.relative(process.cwd(),path.resolve(subjectPath)),node:process.version};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(table(report));
  process.exitCode=report.matched===report.total?0:1;
}
