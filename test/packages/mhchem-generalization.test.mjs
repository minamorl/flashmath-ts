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
  expanded_chemistry: [
    'Fe^x+', 'Fe^{x+}', 'Fe^n-', 'X^x', 'X^{x}', 'X_{x}^{x+}',
    'Cu^{+II}', 'Fe^{-III}', 'Fe^{+-0}', 'Cr^{+VI}', 'Mn^{VII}O4-',
    '^{238}_{92}U -> ^{234}_{90}Th + ^4_2He', '^{13}_{6}C', '_8^{16}O',
    '^{99m}_{43}Tc', '^1_1H', '^{2}H2O', 'C{}^{14}C',
    '(CH3)3COH', '[Co(en)3]^{3+}', 'K2[PtCl6]', '\\{[Ag(NH3)2]\\}+',
    'Ca(OH)2(aq)', 'Fe(OH)3 v', 'H2 ^', 'CO2(g) ^', 'A (v) + B (^) -> C',
    'SO4_{(aq)}^2-', 'CuSO4·7H2O', 'BaCl2⋅2H2O', '2n H2O', '$2n-1$ CO2',
    'n/2 O2', '$n$/3 CO2', '-2 H2', 'C \\pm D', '+ H2O',
    'pH = 7', 'pOH', 'pK_a', 'iBu-Cl', 'sp^3-C', '3d^5',
    'A/B', 'A \\, B', 'A ... B', 'A\\bond{=}B', 'A\\bond{3}B',
    'X_{i,j}', 'X_{V,2}', 'X_{Ti,0.1}', 'V^{..}_{O}',
    '$K_{eq}$ = $\\frac{1}{2}$', '$\\ce{Na+} + \\ce{Cl-}$',
    '\\frac{H2}{O2}', '\\overset{H}{Cl}', '\\underset{aq}{NaCl}',
  ],
  expanded_reactions: [
    'A ->[\\mathrm{cat.}] B', 'A ->[\\text{hv}] B', 'A ->[2H2O][-CO2] B',
    'A ->C[H2O] B', 'A ->T[text above] B', 'A ->M[k_1] B',
    'A ->C[H2O]T[below text] B', 'A <-T[reverse]M[k_{-1}] B',
    'A <->T[forward]T[reverse] B', 'A <-->[H2O][CO2] B',
    'A <=>>[H2][O2] B', 'A <<=>[H2][O2] B', 'A <=>[][H+] B',
    'A → B', 'A ⟶ B', 'A ⇌ B', 'A ->[\\frac{1}{2}] B',
    'A ->[{\\text{UV}}] B', 'A ->[$\\ce{H2O}$] B',
    'A ->[\\pu{273 K}][\\pu{1 atm}] B',
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
  expanded_units: [
    '1.23 +- 0.04 kg', '12.5 +/- 0.5 m', '2.5 \\pm 0.1 s',
    '1.0(2) kg', '1.234(0.012) m', '1.2e-5 +- 0.2e-5 mol',
    '5.0 x 10^2 V', '6.3 × 10^{-4} m', '2.0 \\times 10^{5} Pa',
    '-1.5E+6 J', '1,2345e6 J', '12345678 mm', '.25 mol', '0.00012345 s',
    '100 kPa', '50 km/h', '8 J/(mol K)', '2 kg m2 s-2', '3 kg*m^2/s^2',
    '4 mol//L', '5 m//{s^2}', '6 {N m}//{mol K}', '7 kg//m^{3}',
    '8 m2/s', '9 m s^{-2}', '10 kg.m2', '11 m^{+2}',
    '12 \\mu g', '13 \\Omega m', '14 °F', '15 ^oC', '16 ^{o}F',
    '17 mmol L^-1', '18 kg/(m s2)', '19 {kg*m}//{s2}',
  ],
};

test('mhchem generalization: at least 150 distinct non-fixture examples, >=98% MathJax agreement', async () => {
  const rows = [];
  for (const [category, inputs] of Object.entries(examples)) for (const input of inputs) {
    const tex = `\\${category.endsWith('units') ? 'pu' : 'ce'}{${input}}`;
    const options = {packages: ['base', 'mhchem'], display: true};
    const expected = await oracle(tex, options);
    let actual, difference;
    try {
      actual = subject(tex, options);
      difference = firstDifference(parseMathML(expected), parseMathML(actual));
    } catch (error) {difference = {error: String(error)};}
    rows.push({category, tex, expectedError:expected.includes('<merror'), matched: !difference, difference, ...(difference ? {expected, actual} : {})});
  }
  assert.equal(new Set(rows.map(r => r.tex)).size, rows.length, 'No duplicate examples');
  const captured = new Set(JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url))).records.map(r => r.input?.tex));
  assert.ok(rows.every(r => !captured.has(r.tex)), 'Every generalization input must be outside the captured fixture');
  assert.ok(rows.length >= 150);
  assert.ok(rows.filter(r=>!r.expectedError).length>=150,'At least 150 valid MathJax expressions');
  const matched = rows.filter(r => r.matched).length;
  for (const row of rows.filter(r => !r.matched)) console.log(JSON.stringify({tex: row.tex, difference: row.difference}));
  console.log(`generalization: ${matched}/${rows.length} (${(matched / rows.length * 100).toFixed(2)}%)`);
  console.log(`valid MathJax expressions: ${rows.filter(r=>!r.expectedError).length}/${rows.length}`);
  if (process.env.MHCHEM_GENERALIZATION_REPORT)
    fs.writeFileSync(process.env.MHCHEM_GENERALIZATION_REPORT, JSON.stringify({matched, total: rows.length, rows}, null, 2) + '\n');
  for (const tex of [String.raw`\pu{9.81 m/s^2}`, String.raw`\ce{$A$ ->[\ce{+H2O}] $B$}`, String.raw`\ce{Fe^x+}`, String.raw`\pu{1.23 +- 0.04 kg}`, String.raw`\ce{A ->[\mathrm{cat.}] B}`, String.raw`\ce{A ->[\text{hv}] B}`, String.raw`\ce{A ->[2H2O][-CO2] B}`])
    assert.ok(rows.find(r => r.tex === tex)?.matched, `Required example: ${tex}`);
  assert.ok(matched / rows.length >= 0.98, `Only ${matched}/${rows.length} examples matched`);
});
