import assert from 'node:assert/strict';
import test from 'node:test';
import {parseToMathMLAst} from '../../dist/index.js';

test('character handlers do not add a slice per literal token', t => {
  const original = String.prototype.slice, evidence = [];
  for (const tex of ['x'.repeat(5000), '()'.repeat(2500), '|'.repeat(5000)]) {
    let baseline;
    for (const packages of [['base'], ['base','physics'], ['base','braket']]) {
      let slices = 0;
      String.prototype.slice = function(...args) { slices++; return Reflect.apply(original, this, args); };
      try { parseToMathMLAst(tex, {packages, throwOnError: true}); }
      finally { String.prototype.slice = original; }
      baseline ??= slices;
      assert.ok(slices <= baseline, packages.join('+'));
      evidence.push({input: tex[0], packages, slices});
    }
  }
  t.diagnostic(JSON.stringify(evidence));
});

test('nested quantities at depth 400 scan once and preserve every fence', t => {
  const originalSlice = String.prototype.slice;
  const rows = [];
  for (const depth of [100, 200, 400]) {
    const tex = '\\qty{'.repeat(depth) + 'x' + '}'.repeat(depth);
    let slices = 0;
    String.prototype.slice = function(...args) {
      slices++;
      return Reflect.apply(originalSlice, this, args);
    };
    let ast;
    const start = performance.now();
    try { ast = parseToMathMLAst(tex, {packages: ['base', 'physics'], throwOnError: true}); }
    finally { String.prototype.slice = originalSlice; }
    rows.push({depth, slices, milliseconds: performance.now() - start});
    let node = ast.children[0];
    for (let i = 0; i < depth; i++) {
      assert.equal(node.kind, 'mrow');
      assert.equal(node.attributes['data-mjx-texclass'], 'INNER');
      assert.equal(node.children[0].text, '{');
      assert.equal(node.children[2].text, '}');
      node = node.children[1];
    }
    assert.equal(node.text, 'x');
  }
  assert.ok(rows[2].slices <= 2 * rows[1].slices + 8, JSON.stringify(rows));
  assert.ok(rows[2].slices < 4000, JSON.stringify(rows));
  t.diagnostic(JSON.stringify(rows));
});

test('quantity, function and enclosure hot paths do not run regex, split, match or replace', t => {
  const entries = [
    ['cancel', '\\cancel{x}'], ['bbox', '\\bbox[red]{x}'],
    ['enclose', '\\enclose{box,circle}[mathcolor="red"]{x}'], ['physics', '\\sin(x)'],
  ];
  const targets = [[RegExp.prototype, 'exec'], [RegExp.prototype, 'test'],
    [String.prototype, 'split'], [String.prototype, 'match'], [String.prototype, 'replace']];
  const evidence = [];
  for (const [name, tex] of entries) {
    const counts = {};
    const originals = targets.map(([target, key]) => target[key]);
    targets.forEach(([target, key], i) => {
      counts[key] = 0;
      target[key] = function(...args) { counts[key]++; return Reflect.apply(originals[i], this, args); };
    });
    try { parseToMathMLAst(tex, {packages: ['base', name], throwOnError: true}); }
    finally { targets.forEach(([target, key], i) => { target[key] = originals[i]; }); }
    evidence.push({name, counts});
    assert.deepEqual(Object.values(counts), [0, 0, 0, 0, 0], name);
  }
  t.diagnostic(JSON.stringify(evidence));
});
