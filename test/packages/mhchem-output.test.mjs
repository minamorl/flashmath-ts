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

test('native output only maps package-created nodes, including mixed literal PUA', () => {
  for(const code of [0xe408,0xe409,0xe40a,0xe410,0xe411,0xe412,0xe413,0xe428,0xe429,0xe42a,0xe42b,0xe42c,0xe42d,0xe42e]) {
    const literal=String.fromCharCode(code);
    for(const packages of [['base'],['base','mhchem'],['base','extpfeil']]) {
      const native=parseToMathMLAst(literal,{packages});
      const compat=parseToMathMLAst(literal,{packages,output:'mathjax'});
      assert.deepEqual(native,compat,`Literal U+${code.toString(16)} (${packages})`);
      assert.ok(toMathMLString(compat).includes(literal));
      assert.ok(renderToStaticMarkup(parseToReact(literal,{packages})).includes(literal));
    }
    const mixed=toMathMLString(parseToMathMLAst(literal+String.raw`\ce{A -> B}`,options));
    assert.equal([...mixed].filter(c=>c.charCodeAt(0)>=0xe000&&c.charCodeAt(0)<=0xf8ff).length,1);
    assert.ok(mixed.includes(literal));assert.ok(mixed.includes('⟶'));
  }
  const arrow=String.raw`\Newextarrow{\chem}{5,9}{0xE429}\chem{heat}`;
  assert.ok(toMathMLString(parseToMathMLAst(arrow,{packages:['base','extpfeil']})).includes('⟶'));
});

test('native isotope prescripts attach to their element using standard MathML', () => {
  for(const tex of [String.raw`\ce{^{235}_{92}U}`,String.raw`\ce{_8^{16}O}`,String.raw`\ce{^{13}CO2}`,String.raw`\ce{H^3HO}`]) {
    const native=toMathMLString(parseToMathMLAst(tex,options));
    assert.ok(native.includes('<mmultiscripts>'),tex);
    assert.ok(native.includes('<mprescripts>'),tex);
    assert.ok(!native.includes('lspace="-1width"'),tex);
    assert.ok(!native.includes('width="-0.083em"'),tex);
    const compat=toMathMLString(parseToMathMLAst(tex,{...options,output:'mathjax'}),{output:'mathjax'});
    assert.ok(!compat.includes('<mmultiscripts>'),tex);
    assert.ok(compat.includes('lspace="-1width"'),tex);
  }
});

test('variable charges and physical-unit uncertainty retain their meaning in both output modes', () => {
  for(const output of ['native','mathjax']) {
    const charge=toMathMLString(parseToMathMLAst(String.raw`\ce{Fe^x+}`,{...options,output}),{output});
    assert.ok(charge.includes('>x<'));assert.ok(!charge.includes('×'));
    const error=toMathMLString(parseToMathMLAst(String.raw`\pu{1.23 +- 0.04 kg}`,{...options,output}),{output});
    assert.ok(error.includes('±'));assert.ok(error.includes('>0.04<'));
    assert.ok(!error.includes('<msup'));assert.ok(!error.includes('<msub'));
  }
});
