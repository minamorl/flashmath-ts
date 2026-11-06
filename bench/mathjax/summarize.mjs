import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {expectedError} from './cases.mjs';

export function quantile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}
const stats = values => ({n: values.length, p50: quantile(values, .5), p95: quantile(values, .95)});
const signature = s => s.status === 'ok' ? s.outputSha256 : JSON.stringify(s.error);

export function validate(raw) {
  const {processesPerCondition, warmPerProcess} = raw.config;
  assert(processesPerCondition >= 5 && processesPerCondition * warmPerProcess >= 5);
  const expectedKeys = new Set(raw.cases.flatMap(c => ['default', 'raised'].flatMap(limit =>
    ['mathjax', 'mathjax-instrumented', 'temml'].flatMap(engine =>
      Array.from({length: processesPerCondition}, (_, round) => `${c.id}/${limit}/${engine}/${round}`)))));
  const outputs = new Map();
  const paired = new Map();
  for (const run of raw.runs) {
    const {caseId, limit, engine, round} = run.task;
    assert(expectedKeys.delete(`${caseId}/${limit}/${engine}/${round}`), 'Duplicate/unexpected run');
    const c = raw.cases.find(c => c.id === caseId);
    const error = expectedError(c, engine, limit);
    assert.equal(run.samples.filter(s => s.phase === 'cold').length, 1);
    assert.equal(run.samples.filter(s => s.phase === 'warm').length, warmPerProcess);
    for (const s of run.samples) {
      assert(Number.isFinite(s.totalMs) && s.totalMs > 0);
      assert.equal(s.status, error ? 'error' : 'ok');
      const key = `${caseId}/${limit}/${engine.replace('-instrumented', '')}`;
      if (outputs.has(key)) assert.equal(signature(s), outputs.get(key), `Output drift: ${key}`);
      outputs.set(key, signature(s));
      if (c.pair && s.status === 'ok') {
        const pk = `${c.pair}/${limit}/${engine}`;
        if (paired.has(pk)) assert.equal(s.normalizedSha256, paired.get(pk), `Inline mismatch: ${pk}`);
        paired.set(pk, s.normalizedSha256);
      }
      if (s.reconstruction) {
        const counts = s.reconstruction;
        if (c.family === 'macro' && !error) {
          assert.equal(counts.base.calls, c.n);
          // GetCS consumes the delimiter space: sum(3*(n-j)+padding+1).
          assert.equal(counts.base.suffixUnits, 3 * c.n * (c.n - 1) / 2 + c.n * (c.padding + 1));
        }
        if (c.family === 'ordinary' || c.family === 'inline') {
          assert.equal(Object.values(counts).reduce((n, a) => n + a.calls, 0), 0);
        }
        if (caseId === 'template-probe') assert.equal(counts.template.calls, 2);
        if (caseId === 'environment-probe') assert.equal(counts.environment.calls, 1);
        for (const site of Object.values(counts)) {
          assert(site.calls >= 0 && site.suffixUnits >= 0 && site.intervalNs >= 0);
          assert(site.intervalNs / 1e6 <= s.totalMs);
        }
      }
    }
  }
  assert.equal(expectedKeys.size, 0, 'Missing runs');
}

export function summarize(raw) {
  const groups = new Map();
  for (const run of raw.runs) {
    for (const s of run.samples) {
      const key = `${run.task.caseId}/${run.task.limit}/${run.task.engine}/${s.phase}`;
      if (!groups.has(key)) groups.set(key, {caseId: run.task.caseId, limit: run.task.limit,
        engine: run.task.engine, phase: s.phase, samples: [], setup: [], timer: []});
      const g = groups.get(key);
      g.samples.push(s);
      if (s.phase === 'cold' || s.index === 0) {
        g.setup.push(run.setupMs);
        g.timer.push(quantile(run.timerPairNs, .5));
      }
    }
  }
  const rows = [...groups.values()].map(g => {
    const row = {caseId: g.caseId, limit: g.limit, engine: g.engine, phase: g.phase,
      status: g.samples[0].status, totalMs: stats(g.samples.map(s => s.totalMs)),
      setupMs: stats(g.setup), timerPairNs: stats(g.timer)};
    if (row.status === 'error') row.error = g.samples[0].error;
    if (g.samples[0].reconstruction) {
      const sums = g.samples.map(s => Object.values(s.reconstruction).reduce((a, b) =>
        ({calls: a.calls + b.calls, suffixUnits: a.suffixUnits + b.suffixUnits,
          intervalNs: a.intervalNs + b.intervalNs}), {calls: 0, suffixUnits: 0, intervalNs: 0}));
      row.reconstruction = {calls: stats(sums.map(s => s.calls)),
        suffixUnits: stats(sums.map(s => s.suffixUnits)),
        intervalMs: stats(sums.map(s => s.intervalNs / 1e6)),
        // Within the instrumented run, not a speedup estimate or baseline fraction.
        intervalPercent: stats(sums.map((s, i) => s.intervalNs / (g.samples[i].totalMs * 1e4)))};
    }
    return row;
  });
  rows.sort((a, b) => `${a.caseId}/${a.limit}/${a.engine}/${a.phase}`.localeCompare(`${b.caseId}/${b.limit}/${b.engine}/${b.phase}`));
  return {startedAt: raw.startedAt, finishedAt: raw.finishedAt, rows};
}

export function markdown(summary) {
  let out = '| Case | Limit | Engine | Phase | Status | n | p50 ms | p95 ms | interval p50 ms | interval p50 % |\n';
  out += '|---|---|---|---|---|---:|---:|---:|---:|---:|\n';
  for (const r of summary.rows) {
    out += `| ${r.caseId} | ${r.limit} | ${r.engine} | ${r.phase} | ${r.status} | ${r.totalMs.n} | ${r.totalMs.p50.toFixed(4)} | ${r.totalMs.p95.toFixed(4)} | ${r.reconstruction?.intervalMs.p50.toFixed(4) ?? '—'} | ${r.reconstruction?.intervalPercent.p50.toFixed(3) ?? '—'} |\n`;
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(process.argv[2] ?? 'bench/mathjax/results/raw.json', 'utf8'));
  validate(raw);
  console.log(`VALIDATED ${raw.runs.length} workers; ${summarize(raw).rows.length} summary rows`);
}
