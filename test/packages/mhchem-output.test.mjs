import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToMathMLAst, toMathMLString, createMathMLParser} from '../../dist/index.js';
import {parseToReact, mathMLAstToReact} from '../../dist/react.js';
import subject from '../../bench/flashmath/adapter.mjs';
import {normalizeMathML} from '../../conformance/normalize.mjs';

const options = {packages: ['base', 'mhchem'], display: true};
const pua = /[\uE000-\uF8FF]/u;
const fixture = JSON.parse(fs.readFileSync(new URL('../../conformance/fixtures/mathjax-4.1.3.json', import.meta.url)));

test('mhchem output: all captured chemistry has native glyphs and unchanged MathJax mode', () => {
  for (const record of fixture.records.filter(r => r.group === 'mhchem')) {
    const {tex, ...opts} = record.input;
    const native = parseToMathMLAst(tex, opts);
    assert.ok(!pua.test(JSON.stringify(native)), `Native AST has PUA: ${tex}`);
    assert.equal(renderToStaticMarkup(parseToReact(tex, opts)), toMathMLString(native), tex);
    const compat = {...opts, output: 'mathjax'};
    const raw = parseToMathMLAst(tex, compat);
    const snapshot = JSON.stringify(raw);
    assert.equal(normalizeMathML(toMathMLString(raw, compat)), normalizeMathML(record.expected), tex);
    assert.equal(renderToStaticMarkup(parseToReact(tex, compat)), toMathMLString(raw, compat), tex);
    assert.equal(toMathMLString(raw), toMathMLString(native), tex);
    assert.equal(renderToStaticMarkup(mathMLAstToReact(raw)), toMathMLString(native), tex);
    assert.equal(JSON.stringify(raw), snapshot, 'Output conversion must not mutate a MathJax AST');
    assert.equal(normalizeMathML(subject(tex, opts)), normalizeMathML(record.expected), tex);
  }
});

test('mhchem output: every chemical private-use slot has an explicit native representation', () => {
  const commands = [
    'mhchemlongrightleftharpoons', 'mhchemlongRightleftharpoons', 'mhchemlongLeftrightharpoons',
    'tripledash', 'mhchemBondTD', 'mhchemBondTDD', 'mhchemBondDTD',
    'mhchemlongleftarrow', 'mhchemlongrightarrow', 'mhchemlongleftrightarrow', 'mhchemlongleftrightarrows',
    'mhchemleftarrow', 'mhchemrightarrow', 'mhchemleftrightarrow',
  ];
  for (const name of commands) {
    const tex = `\\${name}`;
    const raw = parseToMathMLAst(tex, {...options, output: 'mathjax'});
    const native = parseToMathMLAst(tex, options);
    assert.ok(pua.test(toMathMLString(raw, {output: 'mathjax'})), name);
    assert.ok(!pua.test(toMathMLString(native)), name);
    assert.ok(!toMathMLString(native).includes('<merror'), name);
    assert.ok(!toMathMLString(native).includes('-mhchem'), name);
  }
  for (const tex of [String.raw`\ce{A\bond{~-}B}`, String.raw`\ce{A\bond{~--}B}`, String.raw`\ce{A\bond{-~-}B}`])
    assert.ok(toMathMLString(parseToMathMLAst(tex, options)).includes('<mover'));
});

test('mhchem output: defaults, session overrides and invalid output values', () => {
  const tex = String.raw`\ce{A -> B}`;
  assert.ok(toMathMLString(parseToMathMLAst(tex, options)).includes('⟶'));
  const labeled = toMathMLString(parseToMathMLAst(String.raw`\ce{A ->[long label] B}`, options));
  assert.ok(!labeled.includes('voffset="-.2em"'), 'Native under/over layout must not retain MathJax label padding');
  const session = createMathMLParser(options);
  assert.ok(!pua.test(JSON.stringify(session.parse(tex))));
  assert.ok(pua.test(JSON.stringify(session.parse(tex, {output: 'mathjax'}))));
  const ast = parseToMathMLAst(tex, {...options, output: 'mathjax'});
  for (const output of ['svg', '', null]) {
    assert.throws(() => parseToMathMLAst(tex, {...options, output}), /output/);
    assert.throws(() => parseToReact(tex, {...options, output}), /output/);
    assert.throws(() => toMathMLString(ast, {output}), /output/);
  }
});
