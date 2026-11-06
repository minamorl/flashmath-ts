import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import subject from '../../bench/flashmath/adapter.mjs';
import oracle from '../../conformance/mathjax.mjs';
import {parseMathML, firstDifference} from '../../conformance/normalize.mjs';

// Independent examples selected by grammar feature, before the scanner rewrite.
// Keep failures in the denominator and report every difference.
export const examples = {
  formulas: [
    'Al2(SO4)3', 'Ca3(PO4)2', '[Cu(NH3)4]SO4', 'K4[Fe(CN)6]', 'CH3CH2OH',
    'C12H22O11', 'Na2CO3.10H2O', 'CuSO4*5H2O', 'MgCl2 * 6 H2O',
    '3/2 O2', '0,25 O2', '(3/4) N2', 'n H2', 'x CO2',
    '^{235}_{92}U', '^14_6C', '^{18}O', '_6^12C', 'D2 + O2 -> D2O',
    'NH4+ + NO3- -> NH4NO3', 'SO4^{2-}', 'Fe^{3+}', 'ClO4-', 'PO4^3-',
    'Fe^{III}Cl3', 'Cu^{II}SO4', 'Co^{II}_2', 'O2^{.-}', 'X_{site}',
    'X_{ab}^{2+}', 'Y^{2+}_{site}', 'NO_{2}^{-}', 'A_{x+1}', 'Fe_{1-x}O',
    'H2(g) + Cl2(g) -> 2 HCl(g)', 'NaCl(s) -> Na+(aq) + Cl-(aq)',
    '{acetic acid} + {water}', '{cis}-[Pt(NH3)2Cl2]', '\\alpha-Fe',
    'A\\bond{~}B', 'A\\bond{~-}B', 'A\\bond{~--}B', 'A\\bond{-~-}B',
    'A\\bond{....}B', 'A\\bond{->}B', 'C-C=C#N', 'A, B; C',
    '$k$ A -> $k$ B', '$\\ce{H2O}$',
  ],
  reactions: [
    '2 Na + Cl2 -> 2 NaCl', 'N2 + 3 H2 <=> 2 NH3',
    'A ->[heat] B', 'A <-[cold] B', 'A <->[light] B', 'A <-->[catalyst] B',
    'A <=>>[fast] B', 'A <<=>[slow] B', 'A ->[Pt][300 K] B',
    'A ->[][H2O] B', 'A ->[$k_1$][$k_{-1}$] B',
    '$A$ ->[\\ce{+H2O}] $B$', 'A ->[\\ce{2 H2 + O2}] B',
    'A ->[{warm water}] B', 'A ->[{$h\\nu$}] B',
    'A <=>[H+][OH-] B', 'A<-->[above][below]B',
    'A ->[\\Delta] B', 'A ->[\\pu{300 K}] B',
    'CaCO3 -> CaO + CO2 ^', 'Ag+ + Cl- -> AgCl v',
  ],
  units: [
    '9.81 m/s^2', '5 m s-1', '7 kg*m/s2', '12 kg m//s2', '20 m//s^2',
    '6.02e23 mol-1', '1.38E-23 J K-1', '2,5e-3 mol L-1',
    '273.15 K', '25 °C', '32 ^oF', '10 ^{o}C', '1.2 mm^2',
    '5 cm^{3}', '4 m^-2', '3 s^{-1}', '1.5 kg*m2', '2 N*m',
    '12345 J', '1234567 J', '1.23456 m', '0,12345 s', '3.14(2) m',
    '10^3 Pa', '2 x 10^3 J', '2 * 10^{-3} J', '1/2 mol',
    '1 kg / mol', '3 {kg m} / {s2}', '5 {m/s}',
    '7 \\mu m', '2 \\Omega', '-40 °C', '+2.0 V',
  ],
};

test('mhchem generalization: at least 60 distinct non-fixture examples, >=95% MathJax agreement', async () => {
  const rows = [];
  for (const [category, inputs] of Object.entries(examples)) for (const input of inputs) {
    const tex = `\\${category === 'units' ? 'pu' : 'ce'}{${input}}`;
    const options = {packages: ['base', 'mhchem'], display: true};
    const expected = await oracle(tex, options);
    let actual, difference;
    try {
      actual = subject(tex, options);
      difference = firstDifference(parseMathML(expected), parseMathML(actual));
    } catch (error) {difference = {error: String(error)};}
    rows.push({category, tex, matched: !difference, difference, ...(difference ? {expected, actual} : {})});
  }
  assert.equal(new Set(rows.map(r => r.tex)).size, rows.length, 'No duplicate examples');
  const captured = new Set(JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url))).records.map(r => r.input?.tex));
  assert.ok(rows.every(r => !captured.has(r.tex)), 'Every generalization input must be outside the captured fixture');
  assert.ok(rows.length >= 60);
  const matched = rows.filter(r => r.matched).length;
  for (const row of rows.filter(r => !r.matched)) console.log(JSON.stringify({tex: row.tex, difference: row.difference}));
  console.log(`generalization: ${matched}/${rows.length} (${(matched / rows.length * 100).toFixed(2)}%)`);
  if (process.env.MHCHEM_GENERALIZATION_REPORT)
    fs.writeFileSync(process.env.MHCHEM_GENERALIZATION_REPORT, JSON.stringify({matched, total: rows.length, rows}, null, 2) + '\n');
  for (const tex of [String.raw`\pu{9.81 m/s^2}`, String.raw`\ce{$A$ ->[\ce{+H2O}] $B$}`])
    assert.ok(rows.find(r => r.tex === tex)?.matched, `Required example: ${tex}`);
  assert.ok(matched / rows.length >= 0.95, `Only ${matched}/${rows.length} examples matched`);
});
