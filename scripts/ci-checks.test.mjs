import test from 'node:test';
import assert from 'node:assert/strict';
import {checkConformance} from './ci-conformance-gate.mjs';
import {checkPackEntries} from './ci-pack-smoke.mjs';

function report() {
  const rows = Array.from({length: 2635}, (_, i) => ({id: `match-${i}`, status: 'matched', category: null}));
  const classifications = {
    'typeset-component-pipeline': 14,
    'custom-package-registration': 26,
    'non-single-MathML-snapshot': 7,
    'input-not-captured': 1,
  };
  for (const [category, count] of Object.entries(classifications)) {
    for (let i = 0; i < count; i++) rows.push({id: `${category}-${i}`, status: 'unsupported', category});
  }
  return {total: rows.length, matched: 2635, rows, classifications};
}

test('conformance gate accepts the baseline and reductions in unsupported cases', () => {
  assert.equal(checkConformance(report()).unsupported, 48);
  const improved = report();
  const row = improved.rows.at(-1);
  delete improved.classifications[row.category];
  row.status = 'matched';
  row.category = null;
  improved.matched++;
  assert.equal(checkConformance(improved).matched, 2636);
});

for (const [name, mutate] of [
  ['a real mismatch', r => {r.rows[0].status = 'mismatch'; r.matched--;}],
  ['too few matches', r => {r.rows.shift(); r.total--; r.matched--;}],
  ['a new unsupported category', r => {r.rows.at(-1).category = 'new-category';}],
  ['a per-category increase within the total budget', r => {
    r.rows.at(-1).category = 'typeset-component-pipeline';
    r.classifications['typeset-component-pipeline']++;
    delete r.classifications['input-not-captured'];
  }],
  ['a duplicate ID', r => {r.rows[1].id = r.rows[0].id;}],
  ['a forged matched summary', r => {r.matched++;}],
  ['a truncated report', r => {r.rows.pop();}],
  ['a forged classification summary', r => {r.classifications['input-not-captured'] = 0;}],
  ['an unknown status', r => {r.rows[0].status = 'skipped';}],
  ['missing rows', r => {delete r.rows;}],
]) test(`conformance gate rejects ${name}`, () => {
  const value = report();
  mutate(value);
  assert.throws(() => checkConformance(value));
});

const entries = ['package/package.json', 'package/dist/index.js', 'package/dist/react.js'];
test('pack gate accepts runtime files', () => assert.equal(checkPackEntries(entries).size, 3));
for (const file of ['bench/result.json', 'conformance/fixtures/mathjax.json', '.git/config',
  '.git-ci/objects/aa/bb', '.ci-git/HEAD', 'dist/internal-git/HEAD', 'dist/fixtures/source.json',
  '../escaped', 'scripts/build.mjs']) {
  test(`pack gate rejects ${file}`, () => assert.throws(() => checkPackEntries([...entries, `package/${file}`])));
}
test('pack gate requires both entry points', () => assert.throws(() => checkPackEntries(entries.slice(0, 2))));
test('pack gate rejects duplicate entries', () => assert.throws(() => checkPackEntries([...entries, entries[0]])));
test('pack gate rejects files outside the package root', () => assert.throws(() => checkPackEntries([...entries, '/absolute'])));
