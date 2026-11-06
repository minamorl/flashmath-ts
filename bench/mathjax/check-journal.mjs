import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, appendFileSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openJournal, taskKey} from './journal.mjs';

const directory = mkdtempSync(fileURLToPath(new URL('./.journal-check-', import.meta.url)));
try {
  const identity = {version: 'test'};
  const first = {task: {caseId: 'a', limit: 'default', engine: 'mathjax', round: 0}, samples: [1]};
  const second = {...first, task: {...first.task, round: 1}};
  let journal = openJournal(directory, {startedAt: 'original'}, identity);
  journal.append(first);
  journal = openJournal(directory, {startedAt: 'later'}, identity);
  assert.equal(journal.metadata.startedAt, 'original');
  assert(journal.completed.has(taskKey(first.task)));
  assert.deepEqual(journal.runs, [first]);
  assert.throws(() => journal.append(first));
  journal.append(second);
  appendFileSync(join(directory, 'runs.jsonl'), '{"task":');
  journal = openJournal(directory, {}, identity);
  assert.deepEqual(journal.runs, [first, second]);
  assert.equal(readFileSync(join(directory, 'interrupted-tail.bin'), 'utf8'), '{"task":');
  assert.throws(() => openJournal(directory, {}, {version: 'different'}));
  appendFileSync(join(directory, 'runs.jsonl'), 'invalid\n');
  assert.throws(() => openJournal(directory, {}, identity));
  console.log('JOURNAL PASS: resume, preserved metadata, duplicate/mismatch rejection, incomplete-tail recovery, interior corruption rejection');
} finally {
  rmSync(directory, {recursive: true});
}
