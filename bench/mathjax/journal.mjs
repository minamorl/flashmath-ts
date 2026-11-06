import assert from 'node:assert/strict';
import {existsSync, readFileSync, writeFileSync, appendFileSync, truncateSync} from 'node:fs';
import {join} from 'node:path';

export const taskKey = task => `${task.caseId}/${task.limit}/${task.engine}/${task.round}`;

// One complete worker per flushed line. Resume only with the same harness,
// fixtures, dependency sources, runtime versions, and measurement configuration.
export function openJournal(directory, metadata, identity) {
  const manifestPath = join(directory, 'manifest.json');
  const journalPath = join(directory, 'runs.jsonl');
  if (!existsSync(manifestPath)) {
    assert(!existsSync(journalPath), 'Journal without manifest');
    writeFileSync(manifestPath, JSON.stringify({identity, metadata}) + '\n', {flag: 'wx', flush: true});
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest.identity, identity, 'Resume identity mismatch; use a new output directory');
  const runs = [];
  const completed = new Set();
  if (existsSync(journalPath)) {
    const bytes = readFileSync(journalPath);
    const completeEnd = bytes.lastIndexOf(10) + 1;
    // Interrupted final append is not a committed observation. Preserve it for
    // inspection, then repeat only that worker. Never repair an interior line.
    if (completeEnd !== bytes.length) {
      writeFileSync(join(directory, 'interrupted-tail.bin'), bytes.subarray(completeEnd));
      truncateSync(journalPath, completeEnd);
      console.log('RECOVERED incomplete final journal line; saved interrupted-tail.bin');
    }
    for (const line of bytes.subarray(0, completeEnd).toString('utf8').split('\n').filter(Boolean)) {
      const run = JSON.parse(line);
      const key = taskKey(run.task);
      assert(!completed.has(key), `Duplicate journal task ${key}`);
      completed.add(key);
      runs.push(run);
    }
  }
  return {metadata: manifest.metadata, runs, completed,
    append(run) {
      const key = taskKey(run.task);
      assert(!completed.has(key), `Duplicate task ${key}`);
      appendFileSync(journalPath, JSON.stringify(run) + '\n', {flush: true});
      completed.add(key);
      runs.push(run);
    }};
}
