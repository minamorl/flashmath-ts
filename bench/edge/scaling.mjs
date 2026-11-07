import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import subject from '../flashmath/adapter.mjs';

export const chemistryInput = (depth, parens = true) =>
  (parens ? '\\ce{(' : '\\ce{H').repeat(depth) + 'O' + (parens ? ')}' : '}').repeat(depth);

export function measureScaling() {
  const options = {packages:['base','mhchem'], maxDepth:100000, maxTokens:1e7, maxNodes:1e7};
  const evidence = [];
  for (const parens of [true, false]) {
    const depths = [5000, 10000, 20000], samples = depths.map(() => []);
    // Warm the same conversion/serialization path before measuring CPU time,
    // which excludes time spent waiting for concurrently running CI tests.
    for (let i = 0; i < 3; i++) subject(chemistryInput(1000, parens), options);
    for (let sample = 0; sample < 5; sample++) {
      for (const index of sample % 2 ? [2,1,0] : [0,1,2]) {
        const tex = chemistryInput(depths[index], parens), cpu = process.cpuUsage(), start = performance.now();
        const xml = subject(tex, options), usage = process.cpuUsage(cpu);
        assert.doesNotMatch(xml, /merror/);
        const text = xml.replace(/<[^>]*>/g, '');
        assert.equal(text, parens ? '('.repeat(depths[index])+'O'+')'.repeat(depths[index]) : 'H'.repeat(depths[index])+'O');
        samples[index].push({cpuMs:(usage.user+usage.system)/1000, wallMs:performance.now()-start});
      }
    }
    const rows = depths.map((depth,i) => ({depth, samples:samples[i],
      cpuMs:samples[i].map(x=>x.cpuMs).sort((a,b)=>a-b)[2]}));
    const slope = Math.log(rows[2].cpuMs / rows[0].cpuMs) / Math.log(4);
    const adjacentSlopes = rows.slice(1).map((r,i)=>Math.log(r.cpuMs/rows[i].cpuMs)/Math.log(2));
    evidence.push({family:parens?'ce-paren':'ce-nested', rows, slope, adjacentSlopes});
  }
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const evidence = measureScaling();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  for (const row of evidence) assert.ok(row.slope < 1.65, JSON.stringify(row));
}
