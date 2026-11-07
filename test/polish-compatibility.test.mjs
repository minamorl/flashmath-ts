import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import oracle from '../conformance/mathjax.mjs';
import subject from '../bench/flashmath/adapter.mjs';
import {parseMathML, firstDifference} from '../conformance/normalize.mjs';

const captured = new Set(JSON.parse(fs.readFileSync(new URL('../conformance/fixtures/mathjax-4.1.3.json', import.meta.url))).records.map(r => r.input?.tex));
async function compareCases(t, cases) {
  assert.ok(new Set(cases.map(c => c.tex)).size >= 30, 'at least 30 distinct formulas');
  assert.ok(cases.every(c => !captured.has(c.tex)), 'all formulas are outside the upstream fixture');
  for (const {tex, ...options} of cases) {
    const expected = await oracle(tex, options), actual = subject(tex, options);
    assert.equal(firstDifference(parseMathML(expected), parseMathML(actual)), null, `${tex}\nexpected: ${expected}\nactual: ${actual}`);
    assert.ok(!expected.includes('<merror'), `valid oracle output: ${tex}`);
  }
  t.diagnostic(`${cases.length} fresh MathJax 4.1.3 comparisons`);
}

test('array ll preserves math tokens in the second column with and without ams', async t => {
  const cases = [];
  const bodies = [String.raw`1&2`, String.raw`a&b`, String.raw`x&y+z`, String.raw`a_2&b^3`,
    String.raw`\alpha&\beta`, String.raw`u&\frac{v}{w}`, String.raw`3&\sqrt{x}`, String.raw`a&\mathrm{word}`,
    String.raw`q&\mathbf{X}`, String.raw`r&\text{condition}`, String.raw`5&6\\s&t`, String.raw`i&\sin x`,
    String.raw`a+b&c-d`, String.raw`x&{y}`, String.raw`m&n_0`, String.raw`a&\text{if $x$}`];
  for (const align of ['ll','cc','lr','rl','l','lll','l|l','cl']) for (const body of bodies) {
    for (const packages of [['base'], ['base','ams']]) cases.push({tex:`\\begin{array}{${align}}${body}\\end{array}`, packages, display:true});
  }
  await compareCases(t, cases);
});

test('tags parse embedded math rather than printing dollar delimiters', async t => {
  const cases = [];
  const symbols = ['*', String.raw`\dagger`, String.raw`\ddagger`, String.raw`\alpha`, String.raw`\beta`,
    String.raw`\star`, 'x_7', 'y^3', String.raw`\frac{1}{3}`, String.raw`\sqrt{5}`, String.raw`\mathrm{aux}`, String.raw`\mathbf{Z}`];
  for (const symbol of symbols) for (const starred of ['', '*']) for (const wrapper of ['plain','equation','align']) {
    const tag = `\\tag${starred}{aux $${symbol}$}`;
    const tex = wrapper === 'plain' ? `z+7${tag}` : `\\begin{${wrapper}*}z+7${tag}\\end{${wrapper}*}`;
    cases.push({tex, packages:['base','ams'], display:true});
  }
  cases.push(...['*', String.raw`\dagger`].map(s => ({tex:`z+7\\tag{$${s}$}`,packages:['base','ams'],display:true})));
  await compareCases(t, cases);
});

test('mathop preserves the ORD atom of explicit font arguments', async t => {
  const cases = [];
  for (const font of ['mathrm','mathbf','mathit','mathsf','mathtt','mathcal']) for (const body of ['ab','X',String.raw`ess\,sup`,'xy7','PQ',String.raw`arg\,max`]) {
    for (const suffix of ['', '_{k+7}x']) cases.push({tex:`\\mathop{\\${font}{${body}}}${suffix}`,packages:['base','ams'],display:true});
  }
  await compareCases(t, cases);
});

test('deep chemistry around depth 800 agrees with MathJax using default limits', async t => {
  const cases = Array.from({length:32}, (_, i) => ({
    tex:'\\ce{H'.repeat(770 + 3*i) + 'O' + '}'.repeat(770 + 3*i),
    packages:['base','mhchem'], display:true,
  }));
  await compareCases(t, cases);
});

test('chemistry default limits accept MathJax depth 2000 and explicit limits still apply', async () => {
  const tex = '\\ce{H'.repeat(2000) + 'O' + '}'.repeat(2000);
  const options = {packages:['base','mhchem'], display:true};
  const expected = await oracle(tex, options), actual = subject(tex, options);
  assert.doesNotMatch(expected, /merror/);
  assert.doesNotMatch(actual, /merror/);
  assert.equal(actual.replace(/<[^>]*>/g,''), 'H'.repeat(2000)+'O');
  assert.match(subject(tex, {...options, maxDepth:512}), /merror.*Nesting limit exceeded/);
  assert.doesNotMatch(subject(tex, {...options, maxDepth:8000}), /merror/);
});

test('boldsymbol optimization retains MathJax behavior on fresh font and script expressions', async t => {
  const cases = [];
  for (const body of ['q',String.raw`\beta`,String.raw`\Delta`,String.raw`\partial`,String.raw`\nabla`,String.raw`\infty`,String.raw`\sum_{j=3}^9q_j`,String.raw`\frac{q}{r}`,String.raw`\sqrt{r}`,String.raw`\mathrm{PQ}`,String.raw`\mathcal{MN}`,String.raw`\mathfrak{pq}`]) {
    for (const suffix of ['+7','_{j+7}','^3']) cases.push({tex:`{\\boldsymbol{${body}}}${suffix}`,packages:['base','boldsymbol'],display:true});
  }
  await compareCases(t, cases);
});

test('verb raw consumption retains MathJax behavior across delimiters and following math', async t => {
  const cases = [];
  for (const delimiter of ['|','!','+','/']) for (const body of ['a%b','x { y','<a>&b',String.raw`\frac{p}{q}`,'two words','😀 x','a_b^7','{nested}']) {
    cases.push({tex:`\\verb${delimiter}${body}${delimiter}+q_7`,packages:['base','verb'],display:true});
  }
  cases.push({tex:String.raw`\verb\raw\q_7`,packages:['base','verb'],display:true});
  await compareCases(t, cases);
});
