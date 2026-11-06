import assert from 'node:assert/strict';
import {makeCases} from './cases.mjs';
import {execute, environment, engines} from './run.mjs';
import {quantile, validate, summarize} from './summarize.mjs';

environment();
assert.equal(quantile([5, 1, 4, 2, 3], .5), 3);
assert.equal(quantile([5, 1, 4, 2, 3], .95), 5);
const cases = makeCases();
for (const length of [16, 64, 256, 1024]) assert.equal(cases.find(c => c.id === `ordinary-${length}`).length, length);
for (const c of cases.filter(c => c.family === 'macro')) {
  assert.equal(c.length, cases.find(p => p.family === 'inline' && p.pair === c.pair).length);
}
const ids = ['ordinary-16', 'ordinary-64', 'ordinary-256', 'ordinary-1024',
  'macro-n64-p0', 'inline-n64-p0', 'macro-n64-p4096', 'inline-n64-p4096',
  'macro-n64-p32768', 'macro-n1536-p0', 'template-probe', 'environment-probe'];
const runs = [];
for (const caseId of ids) {
  for (const limit of ['default', 'raised']) {
    for (const engine of engines) {
      const run = execute({caseId, limit, engine, round: 0, warmup: 1, warm: 1});
      runs.push(run);
    }
  }
}
// Expand smoke observations to exercise the complete result validator cheaply.
// These synthetic repetitions never go into measurement artifacts.
const synthetic = {cases: cases.filter(c => ids.includes(c.id)), config: {processesPerCondition: 5, warmPerProcess: 1},
  runs: runs.flatMap(run => Array.from({length: 5}, (_, round) => ({...run, task: {...run.task, round}})))};
validate(synthetic);
const broken = structuredClone(synthetic);
broken.runs[0].samples[0].status = 'error';
assert.throws(() => validate(broken));
const drift = structuredClone(synthetic);
drift.runs[0].samples[1].outputSha256 = 'incorrect';
assert.throws(() => validate(drift));
const missing = structuredClone(synthetic);
missing.runs.pop();
assert.throws(() => validate(missing));
assert.equal(summarize(synthetic).rows.length, ids.length * 2 * 3 * 2);
console.log(`CHECK PASS: ${runs.length} real smoke workers; all three source sites, default errors, raised limits, output identity`);
console.log('CHECK PASS: exact fixture lengths, nearest-rank quantiles, missing/error/drift rejection');
