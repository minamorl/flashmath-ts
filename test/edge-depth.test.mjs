import test from 'node:test';
import assert from 'node:assert/strict';
import subject from '../bench/flashmath/adapter.mjs';
import {chemistryInput, measureScaling} from '../bench/edge/scaling.mjs';

test('default nesting limit applies to ordinary TeX with every package combination', () => {
  for (const packages of [['base'], ['base','mhchem'], ['base','ams','mhchem']]) {
    for (const [open,close] of [['{','}'], ['\\frac{','}{y}'], ['\\sqrt{','}']]) {
      const tex = open.repeat(20000)+'x'+close.repeat(20000);
      assert.match(subject(tex, {packages}), /merror.*Nesting limit exceeded/);
      assert.throws(()=>subject(tex, {packages,throwOnError:true}), /Nesting limit exceeded/);
    }
    const tex = '{'.repeat(40)+'x'+'}'.repeat(40);
    assert.match(subject(tex, {packages,maxDepth:32}), /merror.*Nesting limit exceeded/);
    assert.doesNotMatch(subject(tex, {packages,maxDepth:64}), /merror/);
  }
});

test('chemistry shares the enclosing parser depth budget and rejects deep input early', t => {
  const packages = ['base','mhchem'];
  for (const command of ['ce','pu']) {
    const inner = `\\${command}{H}`;
    assert.doesNotMatch(subject(inner,{packages,maxDepth:8}), /merror/);
    assert.match(subject('{'.repeat(6)+inner+'}'.repeat(6),{packages,maxDepth:8}), /merror.*Nesting limit exceeded/);
  }
  for (const parens of [true,false]) for (const depth of [5000,10000,20000]) {
    const tex = chemistryInput(depth,parens), cpu = process.cpuUsage(), start = performance.now();
    assert.match(subject(tex,{packages}), /merror.*Nesting limit exceeded/);
    const usage = process.cpuUsage(cpu), cpuMs = (usage.user+usage.system)/1000;
    t.diagnostic(JSON.stringify({parens,depth,cpuMs,wallMs:performance.now()-start}));
    assert.ok(cpuMs < 1000, 'default limit must reject before doing full deep expansion');
  }
});

test('raised chemistry limits scale linearly at depth 5000/10000/20000', t => {
  for (const row of measureScaling()) {
    t.diagnostic(JSON.stringify(row));
    assert.ok(row.slope < 1.65, JSON.stringify(row));
  }
});
