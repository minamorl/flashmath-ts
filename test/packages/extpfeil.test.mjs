import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import subject from '../../bench/flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {normalizeMathML} from '../../conformance/normalize.mjs';
import {createMathMLParser, toMathMLString} from '../../dist/index.js';

const options = {packages: ['base', 'extpfeil'], display: true};
const fixtures = JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url))).records;
test('extpfeil: complete captured fixtures, including texclass and padding', () => {
  for (const {input: {tex, ...opts}, expected, id} of fixtures.filter(r => r.group === 'extpfeil'))
    assert.equal(normalizeMathML(subject(tex, opts)), normalizeMathML(expected), id);
});
test('extpfeil: independent above/below, empty, context and scripted labels', async () => {
  for (const tex of [
    String.raw`a\xmapsto[b_2]{a^2}c`,
    String.raw`\xtwoheadleftarrow[]{}`, String.raw`\xtofrom[\frac12]{\text{reaction}}`,
    String.raw`\xmapsto[2\,H]{3\,O}`, String.raw`x^{\xtwoheadrightarrow[2\,H]{3\,O}}`,
    String.raw`x_{\xlongequal[b]{a}}`, String.raw`\Newextarrow{\a}{0,0}{0x2192}\a[y]{x}`,
    String.raw`\Newextarrow{\!}{4,9}{8594}\!{x}`,
    String.raw`\Newextarrow{x}{1,2}{8594}`,
    String.raw`\Newextarrow{\a}{a,2}{8594}`,
    String.raw`\Newextarrow{\a}{1,2}{a}`,
  ]) assert.equal(normalizeMathML(subject(tex, options)), normalizeMathML(await oracle(tex, options)), tex);
});
test('extpfeil: new arrows persist only within their parser session', () => {
  const p = createMathMLParser(options);
  p.parse(String.raw`\Newextarrow{\custom}{3,8}{8594}`);
  assert.ok(!toMathMLString(p.parse(String.raw`\custom{label}`)).includes('<merror'));
  assert.ok(subject(String.raw`\custom{label}`, options).includes('Undefined control sequence'));
  assert.ok(subject(String.raw`\xmapsto{x}`, {packages: ['base']}).includes('Undefined control sequence'));
});
