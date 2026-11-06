import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import subject from '../../bench/flashmath/adapter.mjs';
import {normalizeMathML} from '../../conformance/normalize.mjs';
const fixture = JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url)));
export function packageFixtures(name) {
  const records = fixture.records.filter(r => r.input?.packages?.includes(name) &&
    r.input.packages.every(p => ['base', name].includes(p)));
  assert.ok(records.length);
  for (const {id, input, expected} of records) test(id, () => {
    const {tex, ...options} = input;
    assert.equal(normalizeMathML(subject(tex, options)), normalizeMathML(expected));
  });
}
