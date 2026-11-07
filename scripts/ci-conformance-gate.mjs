import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const unsupportedLimits = new Map([
  ['typeset-component-pipeline', 14],
  ['custom-package-registration', 26],
  ['non-single-MathML-snapshot', 7],
  ['input-not-captured', 1],
]);

export function checkConformance(report) {
  assert.ok(Array.isArray(report.rows), 'report.rows must be an array');
  assert.equal(report.total, report.rows.length, 'total must agree with rows');
  const ids = new Set();
  const counts = {matched: 0, mismatch: 0, unsupported: 0};
  const classifications = {};
  for (const row of report.rows) {
    assert.ok(typeof row.id === 'string' && row.id.length > 0, 'row ID is required');
    assert.ok(!ids.has(row.id), `duplicate row ID: ${row.id}`);
    ids.add(row.id);
    assert.ok(Object.hasOwn(counts, row.status), `unknown row status: ${row.status}`);
    counts[row.status]++;
    if (row.status === 'matched') {
      assert.equal(row.category, null, `matched row has a failure category: ${row.id}`);
    } else if (row.status === 'unsupported') {
      assert.ok(unsupportedLimits.has(row.category), `unknown unsupported category: ${row.category}`);
      classifications[row.category] = (classifications[row.category] ?? 0) + 1;
    }
  }
  assert.equal(counts.mismatch, 0, 'conformance mismatches must be zero');
  assert.equal(report.matched, counts.matched, 'matched must agree with rows');
  assert.ok(counts.matched >= 2635, `matched ${counts.matched} is below 2635`);
  for (const [category, limit] of unsupportedLimits) {
    assert.ok((classifications[category] ?? 0) <= limit, `${category} exceeds ${limit}`);
  }
  assert.deepEqual(report.classifications, classifications, 'classifications must agree with rows');
  return {...counts, total: report.total, classifications};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.equal(process.argv.length, 3, 'usage: node scripts/ci-conformance-gate.mjs <report.json>');
    const result = checkConformance(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(`Conformance gate PASS: ${JSON.stringify(result)}`);
  } catch (error) {
    console.error(`Conformance gate FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
