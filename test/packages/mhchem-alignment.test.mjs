import test from 'node:test';
import assert from 'node:assert/strict';
import oracle from '../../conformance/mathjax.mjs';
import subject from '../../bench/flashmath/adapter.mjs';
import {parseMathML, firstDifference} from '../../conformance/normalize.mjs';

// The same 19-package CROSS configuration as bench/hardening/inputs.mjs.
const allPackages = ['base','ams','newcommand','mathtools','boldsymbol','physics',
  'mhchem','color','bbox','enclose','cancel','html','unicode','dsfont','bbm',
  'upgreek','gensymb','textmacros','colortbl'];
const base = ['base','ams','mhchem'];
const configurations = [base,
  ...allPackages.filter(name => !base.includes(name)).map(name => [...base, name]),
  allPackages];
const wrap = (env, body) => `\\begin{${env}}${env.includes('alignat') || env === 'alignedat' ? '{1}' : ''}${body}\\end{${env}}`;
const common = [];
for (const env of ['aligned','align','align*','alignat','alignat*','alignedat','gathered','split']) {
  for (const op of ['->','<=>','=','+','-']) {
    common.push(wrap(env, `\\ce{A &${op} B}`));
    common.push(wrap(env, `\\ce{A &${op} B}\\\\\\ce{B &<=> C}`));
  }
  // Controls: ordinary atoms, external &, spaces, labels and empty TeX atoms.
  for (const body of [String.raw`\ce{A}&\ce{B}`, String.raw`\ce{A &B}`,
    String.raw`\ce{A &->[heat] B}`, String.raw`A&{}=B`,
    String.raw`A&\,=B`, String.raw`A&B+C`]) common.push(wrap(env, body));
}
const mathtools = [];
for (const env of ['lgathered','rgathered']) {
  for (const body of [String.raw`\ce{A &-> B}`, String.raw`\ce{A &-> B}\\\ce{B &<=> C}`,
    String.raw`\ce{A -> B}\\\ce{&<=> C}`]) mathtools.push(wrap(env, body));
}
for (const body of [String.raw`\begin{aligned}\ce{A &-> B}\end{aligned}`,
  String.raw`\begin{aligned}\ce{A &-> B}\\\ce{B &<=> C}\end{aligned}\\\ce{<=> D}`]) {
  mathtools.push(wrap('multlined', body));
}
for (const env of ['dcases','rcases','drcases',
  'matrix*','pmatrix*','bmatrix*','Bmatrix*','vmatrix*','Vmatrix*','smallmatrix*',
  'psmallmatrix','psmallmatrix*','bsmallmatrix','bsmallmatrix*','Bsmallmatrix','Bsmallmatrix*',
  'vsmallmatrix','vsmallmatrix*','Vsmallmatrix','Vsmallmatrix*']) {
  mathtools.push(wrap(env, String.raw`\ce{A &-> B}`));
  mathtools.push(wrap(env, String.raw`\ce{A &-> B}\\\ce{B &<=> C}`));
}
// Starred cases have a text column; keep the chemical alignment in math mode.
for (const env of ['dcases*','rcases*','drcases*','cases*']) {
  mathtools.push(wrap(env, String.raw`\begin{aligned}\ce{A &-> B}\\\ce{B &<=> C}\end{aligned}&reaction`));
}
mathtools.push(String.raw`\begin{crampedsubarray}{c}\ce{A &-> B}\\\ce{B &= C}\end{crampedsubarray}`);
mathtools.push(String.raw`\begin{spreadlines}{2pt}\begin{aligned}\ce{A &-> B}\\\ce{B &<=> C}\end{aligned}\end{spreadlines}`);

assert.equal(allPackages.length, 19);
assert.equal(configurations.length, 18);
assert.ok(new Set(common).size >= 40);
for (const packages of configurations) {
  test(`chemistry alignment matches MathJax 4.1.3: ${packages.join('+')}`, async t => {
    const cases = packages.includes('mathtools') ? [...common, ...mathtools] : common;
    const failures = [];
    for (const tex of cases) {
      const options = {packages, display:true};
      const expected = await oracle(tex, options), actual = subject(tex, options);
      // An oracle error is not evidence of a successful alignment conversion.
      assert.doesNotMatch(expected, /<merror/, `${packages}: ${tex}\n${expected}`);
      const difference = firstDifference(parseMathML(expected), parseMathML(actual));
      if (difference) failures.push({tex, difference, expected, actual});
    }
    assert.equal(failures.length, 0, JSON.stringify(failures.map(({tex,difference}) => ({tex,difference})), null, 2));
    t.diagnostic(`${cases.length} strict MathML comparisons; ${new Set(cases).size} distinct expressions; no oracle errors`);
  });
}
