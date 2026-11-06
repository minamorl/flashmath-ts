// Verify persisted observations, derived artifacts, and every numeric table cell
// in the accompanying report. Run after the benchmark, not on partial snapshots.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {sourceEvidence} from './instrumentation.mjs';
import {validate, summarize, markdown} from './summarize.mjs';

const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const root = 'bench/mathjax/results/';
const raw = json(root + 'raw.json');
validate(raw);
assert.deepEqual(sourceEvidence(), raw.sources);
for (const [name, hash] of Object.entries(raw.harnessSha256)) {
  assert.equal(createHash('sha256').update(read(`bench/mathjax/${name}`)).digest('hex'), hash, `Harness changed: ${name}`);
}
assert.deepEqual(read(root + 'runs.jsonl').trim().split('\n').map(JSON.parse), raw.runs);
const manifest = json(root + 'manifest.json');
for (const [key, value] of Object.entries(manifest.metadata)) assert.deepEqual(raw[key], value);
for (const run of raw.runs) {
  assert(Date.parse(raw.startedAt) <= Date.parse(run.recordedAt));
  assert(Date.parse(run.recordedAt) <= Date.parse(raw.finishedAt));
}
const summary = summarize(raw);
assert.deepEqual(json(root + 'summary.json'), summary);
assert.equal(read(root + 'tables.md'), markdown(summary));
console.log('ARTIFACT PASS: full coverage, journal/raw identity, source/harness hashes, timestamps, recalculated summaries/tables');

const doc = read('docs/measure-mathjax.md');
const get = (caseId, engine, phase, limit) => summary.rows.find(r =>
  r.caseId === caseId && r.engine === engine && r.phase === phase && r.limit === limit);
const pair = value => `${value.p50.toFixed(3)} / ${value.p95.toFixed(3)}`;
function cells(section, next) {
  const content = doc.split(section)[1]?.split(next)[0];
  assert(content, `Missing section: ${section}`);
  return content.split('\n').filter(line => /^\| \d/.test(line))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
}
const ordinary = cells('### 普通の式（default）', '### 既定上限内');
assert.equal(ordinary.length, 4);
for (const [length, ...values] of ordinary) {
  const expected = ['mathjax', 'temml'].flatMap(engine => ['cold', 'warm'].map(phase =>
    pair(get(`ordinary-${length}`, engine, phase, 'default').totalMs)));
  assert.deepEqual(values, expected);
}
const defaults = cells('### 既定上限内で成功した macro ケース', '### 上限を引き上げた');
assert.equal(defaults.length, 10);
for (const [n, p, phase, total, interval, percent] of defaults) {
  const id = `macro-n${n}-p${p}`;
  const r = get(id, 'mathjax-instrumented', phase, 'default');
  assert.deepEqual([total, interval, percent], [pair(get(id, 'mathjax', phase, 'default').totalMs),
    pair(r.reconstruction.intervalMs), pair(r.reconstruction.intervalPercent)]);
}
const raised = cells('### 上限を引き上げた macro ケース（warm）', '上限引き上げ時の cold の抜粋:');
assert.equal(raised.length, 15);
for (const [n, p, length, ...values] of raised) {
  const id = `macro-n${n}-p${p}`;
  assert.equal(Number(length), raw.cases.find(c => c.id === id).length);
  const r = get(id, 'mathjax-instrumented', 'warm', 'raised');
  assert.deepEqual(values, [pair(get(id, 'mathjax', 'warm', 'raised').totalMs),
    pair(get(`inline-n${n}-p${p}`, 'mathjax', 'warm', 'raised').totalMs),
    pair(get(id, 'temml', 'warm', 'raised').totalMs), pair(r.reconstruction.intervalMs),
    pair(r.reconstruction.intervalPercent)]);
}
const cold = cells('上限引き上げ時の cold の抜粋:', '### H1 / H2');
assert.equal(cold.length, 3);
for (const [n, p, ...values] of cold) {
  const id = `macro-n${n}-p${p}`;
  const r = get(id, 'mathjax-instrumented', 'cold', 'raised');
  assert.deepEqual(values, [pair(get(id, 'mathjax', 'cold', 'raised').totalMs),
    pair(get(id, 'temml', 'cold', 'raised').totalMs), pair(r.reconstruction.intervalMs),
    pair(r.reconstruction.intervalPercent)]);
}
for (const match of doc.matchAll(/\]\((\.\.\/bench\/mathjax\/[^)]+)\)/g)) {
  assert(existsSync(resolve('docs', match[1])), `Missing report link: ${match[1]}`);
}
assert(doc.includes(raw.environmentStart.node) && doc.includes(raw.environmentStart.v8));
console.log('REPORT PASS: ordinary/default/raised/cold table cells match raw-derived quantiles; artifact links and runtime versions exist');
