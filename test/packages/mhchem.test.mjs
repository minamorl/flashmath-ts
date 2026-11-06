import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import subject from '../../bench/flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {normalizeMathML} from '../../conformance/normalize.mjs';

const options = {packages: ['base', 'mhchem'], display: true};
const fixtures = JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url))).records;
test('mhchem: all captured chemistry and physical-unit fixtures', () => {
  for (const {input: {tex, ...opts}, expected, id} of fixtures.filter(r => r.group === 'mhchem'))
    assert.equal(normalizeMathML(subject(tex, opts)), normalizeMathML(expected), id);
});
test('mhchem: independent formulas, reactions, isotopes, labels, units and errors', async () => {
  const cases = [
    String.raw`\ce{Fe2(SO4)3}`, String.raw`\ce{NH4+ + OH- -> NH3 + H2O}`,
    String.raw`\ce{D2O}`, String.raw`\ce{NaCl(s) -> Na+(aq) + Cl-(aq)}`,
    String.raw`\ce{^{14}_{6}C -> ^{14}_{7}N + e-}`, String.raw`\ce{A B}`,
    String.raw`\ce{A->[heat][cold]B}`, String.raw`\ce{A ->[][H2O] B}`,
    String.raw`\ce{A<=>[heat][cold]B}`, String.raw`\ce{A ->[2H2O] B}`,
    String.raw`\ce{}`, String.raw`\pu{}`, String.raw`\ce{Na+}`,
    String.raw`\pu{-2.5e-4 kg m-3}`, String.raw`\pu{5 m//s2}`,
    String.raw`x_{\ce{H2O}}`, String.raw`\ce{$\frac{\ce{H2O}}{x}$}`,
    String.raw`\ce{Fe^{III}}`, String.raw`\ce{Zn_{i}^{x}}`,
    String.raw`\ce{A +}`, String.raw`\ce{A -}`, String.raw`\ce{A\bond{..}B}`,
    String.raw`\ce{A\bond{constructor}B}`,
  ];
  for (const display of [false, true]) for (const tex of cases) {
    const opts = {...options, display};
    assert.equal(normalizeMathML(subject(tex, opts)), normalizeMathML(await oracle(tex, opts)), `${tex} display=${display}`);
  }
});
test('mhchem: activation and resource budgets use the host parser boundary', () => {
  assert.ok(subject(String.raw`\ce{H2O}`, {packages: ['base']}).includes('Undefined control sequence'));
  for (const limit of [{maxTokens: 12}, {maxNodes: 10}, {maxDepth: 2}])
    assert.throws(() => subject(String.raw`\ce{H2SO4}`, {...options, ...limit, throwOnError: true}), /limit exceeded/i);
  assert.ok(subject(String.raw`\ce{X_{missing}`, options).includes('<merror'));
});
