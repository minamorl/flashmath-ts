import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {makeCases, limits, expectedError} from './cases.mjs';
import {sourceEvidence} from './instrumentation.mjs';
import {validate, summarize, markdown} from './summarize.mjs';
import {openJournal, taskKey} from './journal.mjs';

export const engines = ['mathjax', 'mathjax-instrumented', 'temml'];
export const worker = fileURLToPath(new URL('./worker.mjs', import.meta.url));

export function execute(task) {
  const child = spawnSync(process.execPath, [worker], {
    env: {...process.env, NODE_ENV: 'production'}, input: JSON.stringify(task),
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000,
  });
  if (child.status !== 0 || child.error || child.stderr) {
    throw new Error(`Worker failed ${JSON.stringify(task)}: exit=${child.status} ${child.error ?? ''}\n${child.stderr}`);
  }
  const result = JSON.parse(child.stdout);
  const c = makeCases().find(c => c.id === task.caseId);
  const expected = expectedError(c, task.engine, task.limit);
  for (const sample of result.samples) {
    if (sample.status !== (expected ? 'error' : 'ok')) {
      throw new Error(`Unexpected outcome ${JSON.stringify(task)}: ${JSON.stringify(sample)}`);
    }
    if (expected) {
      const message = sample.error.message;
      const pattern = {buffer: /internal buffer size exceeded/, expansions: /substitution count exceeded|Too many expansions/,
        unsupported: /Unsupported function name: \\newenvironment/}[expected];
      if (!pattern.test(message)) throw new Error(`Wrong error: ${message}`);
    }
  }
  return result;
}

function optionalRead(path) {
  try { return readFileSync(path, 'utf8').trim(); } catch { return null; }
}

export function environment() {
  const require = createRequire(import.meta.url);
  const versions = Object.fromEntries(['@mathjax/src', 'temml'].map(name =>
    [name, JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')).version]));
  if (versions['@mathjax/src'] !== '4.1.3' || versions.temml !== '0.14.0') {
    throw new Error(`Version mismatch: ${JSON.stringify(versions)}`);
  }
  return {node: process.version, v8: process.versions.v8, versions, platform: process.platform,
    arch: process.arch, release: os.release(), cpus: os.cpus().map(c => ({model: c.model, speed: c.speed})),
    availableParallelism: os.availableParallelism(), loadavg: os.loadavg(),
    nodeEnv: process.env.NODE_ENV, nodeOptions: process.env.NODE_OPTIONS ?? null,
    execArgv: process.execArgv, cgroup: optionalRead('/proc/self/cgroup'),
    cpuMax: optionalRead('/sys/fs/cgroup/cpu.max'), cpuStat: optionalRead('/sys/fs/cgroup/cpu.stat')};
}

// Seeded Fisher-Yates: deterministic order, rotating engines/cases across rounds.
function shuffle(items, seed) {
  const result = items.slice();
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function main() {
  if (process.env.NODE_ENV !== 'production') throw new Error('Use NODE_ENV=production');
  const out = resolve(process.argv[2] ?? 'bench/mathjax/results');
  const allowed = fileURLToPath(new URL('./', import.meta.url));
  if (!out.startsWith(allowed)) throw new Error('Output must be under bench/mathjax/');
  const cases = makeCases();
  const config = {processesPerCondition: 5, warmup: 10, warmPerProcess: 5,
    seed: 20261107, serial: true, limits,
    cold: 'First conversion in a fresh Node process; imports/setup excluded and recorded separately',
    warm: 'Five conversions following cold + ten discarded warmups in each process',
    quantile: 'nearest rank: sorted[ceil(p*n)-1]; warm samples clustered in five processes'};
  const environmentNow = environment();
  const sources = sourceEvidence();
  const harnessSha256 = Object.fromEntries(['cases', 'instrumentation', 'worker', 'run', 'journal', 'summarize'].map(name =>
    [`${name}.mjs`, createHash('sha256').update(readFileSync(new URL(`./${name}.mjs`, import.meta.url))).digest('hex')]));
  const metadata = {startedAt: new Date().toISOString(), environmentStart: environmentNow,
    config, sources, cases, harnessSha256};
  mkdirSync(out, {recursive: true});
  const identity = {config, sources, cases, harnessSha256,
    node: environmentNow.node, v8: environmentNow.v8, versions: environmentNow.versions,
    platform: environmentNow.platform, arch: environmentNow.arch,
    nodeOptions: environmentNow.nodeOptions};
  const journal = openJournal(out, metadata, identity);
  const raw = {...journal.metadata, runs: journal.runs};
  console.log(`RESUME ${journal.completed.size} saved workers; flushed journal ${join(out, 'runs.jsonl')}`);
  const conditions = cases.flatMap(c => Object.keys(limits).flatMap(limit =>
    engines.map(engine => ({caseId: c.id, limit, engine}))));
  console.log(`START ${conditions.length} conditions x ${config.processesPerCondition} fresh processes; serial`);
  for (let round = 0; round < config.processesPerCondition; round++) {
    for (const condition of shuffle(conditions, config.seed + round)) {
      const task = {...condition, round, warmup: config.warmup, warm: config.warmPerProcess};
      if (journal.completed.has(taskKey(task))) continue;
      const run = execute(task);
      run.recordedAt = new Date().toISOString();
      journal.append(run);
      if (raw.runs.length % 18 === 0) console.log(`SAVED ${raw.runs.length}: ${taskKey(task)}`);
    }
    writeFileSync(join(out, 'raw.json'), JSON.stringify(raw) + '\n');
    console.log(`ROUND ${round + 1}/${config.processesPerCondition}: ${raw.runs.length} worker records written`);
  }
  raw.finishedAt = new Date().toISOString();
  raw.environmentEnd = environment();
  writeFileSync(join(out, 'raw.json'), JSON.stringify(raw) + '\n');
  validate(raw);
  const summary = summarize(raw);
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(join(out, 'tables.md'), markdown(summary));
  console.log(`VALIDATED ${raw.runs.length} workers; cold n=5, warm n=25 per condition`);
  console.log(`RESULTS ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
