import fs from 'node:fs';
import assert from 'node:assert/strict';

// Validate every row of the unmodified full harness output. Package groups are
// only used for assertions/reporting here; no fixture is removed from that run.
const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url)));
const fixture = read('../../conformance/fixtures/mathjax-4.1.3.json');
const before = read('./pkg-chem-before.json');
const after = read('./pkg-chem-conformance.json');
assert.equal(after.rows.length, fixture.records.length);
assert.equal(before.rows.length, fixture.records.length);
for (let i = 0; i < fixture.records.length; i++) {
  const record = fixture.records[i], old = before.rows[i], row = after.rows[i];
  assert.equal(row.id, record.id);
  assert.equal(old.id, record.id);
  assert.equal(row.group, record.group);
  if (old.status === 'matched') assert.equal(row.status, 'matched', `Regression: ${row.id}`);
}
for (const name of ['base', 'newcommand', 'mhchem', 'extpfeil']) {
  const rows = after.rows.filter(r => r.group === name);
  const old = before.rows.filter(r => r.group === name);
  const matches = rows.filter(r => r.status === 'matched').length;
  const oldMatches = old.filter(r => r.status === 'matched').length;
  assert.ok(rows.length > 0);
  if (['mhchem', 'extpfeil'].includes(name)) assert.equal(matches, rows.length, name);
  else assert.ok(matches >= oldMatches, name);
  console.log(`${name}: ${matches}/${rows.length} (before ${oldMatches}/${old.length})`);
}
console.log('previously matched rows regressed: 0');
