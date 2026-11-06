// usage: node probe2.mjs <worktree> <oracle-worktree> -- second-round probes of the failure shapes from round 1
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const W = path.resolve(process.argv[2]);
const load = p => import(pathToFileURL(path.join(W, p)).href);
const subject = (await load('bench/flashmath/adapter.mjs')).default;
const oracle = (await load('conformance/mathjax.mjs')).default;
const {normalizeMathML} = await load('conformance/normalize.mjs');
const r = String.raw;
const P = ['base', 'newcommand', 'physics'], M = ['base', 'newcommand', 'physics', 'cancel', 'bbox', 'enclose'];
const cases = [
  [r`\sqrt{\qty(x)}`, P], [r`\sqrt{\ket{a}}`, P], [r`\sqrt{\abs{x}+1}`, P], [r`\sqrt[3]{\abs{x}}`, P], [r`\sqrt{\norm{x}}`, P], [r`\sqrt{\bra{a}}`, P], [r`\sqrt{\braket{a}{b}}`, P], [r`\sqrt{\sin(x)}`, P], [r`\sqrt{\mqty(a)}`, P], [r`\sqrt{\dv{x}}`, P], [r`\sqrt{\comm{A}{B}}`, P], [r`\phantom{\abs{x}}`, P], [r`\mathbf{\abs{x}}`, P], [r`\boxed{\abs{x}}`, P], [r`\overline{\abs{x}}`, P], [r`{\abs{x}}`, P], [r`\mathrm{\qty(x)}`, P], [r`\sqrt{\left|x\right|}`, P],
  [r`\cancel{\abs{x}}`, M], [r`\cancel{\qty(x)}`, M], [r`\bbox[red]{\qty(x)}`, M], [r`\bbox[2pt]{\qty(x)}`, M], [r`\enclose{box}{\qty[x]}`, M], [r`\enclose{box}{\ket{a}}`, M], [r`\enclose{box}{\abs{x}}`, M], [r`\enclose{box}{\pqty{x}}`, M], [r`\xcancel{\sin(x)}`, M],
  [r`\cancelto{0}{x}_2`, ['base', 'cancel']], [r`\cancelto{0}{x}^2_3`, ['base', 'cancel']], [r`\cancel{x}^2_3`, ['base', 'cancel']],
  [r`\enclose{box}[mathcolor='red']{x}`, ['base', 'enclose']], [r`\cancel[mathcolor="red"]{x}`, ['base', 'cancel']], [r`\enclose{longdiv,box}{x}`, ['base', 'enclose']], [r`\enclose{longdiv}[mathcolor=red]{x}`, ['base', 'enclose']],
  [r`\begin{array}{c}a\\ [b]\end{array}`, ['base']], [r`\begin{array}{c}a\\[b]\end{array}`, ['base']], [r`\begin{array}{c}a\\[2pt]b\end{array}`, ['base']], [r`\begin{array}{c}a\\ [2pt]b\end{array}`, ['base']], [r`\matrix{a\\ [b]}`, ['base']],
  [r`\qty|a|`, ['base', 'braket', 'physics']], [r`\qty\big|a|`, ['base', 'braket', 'physics']], [r`\eval{x}_0`, ['base', 'braket', 'physics']], [r`\mqty|a|`, ['base', 'braket', 'physics']], [r`\vmqty{a}`, ['base', 'braket', 'physics']],
];
let m = 0;
for (const [tex, packages] of cases) {
  const o = {packages, display: true};
  let a, b;
  try { a = await oracle(tex, o); } catch (e) { a = 'THROW ' + e; }
  try { b = subject(tex, o); } catch (e) { b = 'THROW ' + e; }
  let same = false; try { same = normalizeMathML(a) === normalizeMathML(b); } catch {}
  if (same) m++;
  const c = s => s.replace(/\s*\n\s*/g, '').replace(/ data-latex(-item)?="[^"]*"/g, '').replace(/ xmlns="[^"]*"/, '').replace(/ data-mjx-texclass/g, ' tc').slice(0, 300);
  console.log(`${same ? 'OK  ' : 'DIFF'} ${tex}  [${packages.slice(1).join(',')}]`);
  if (!same) { console.log('  MJ', c(a)); console.log('  FM', c(b)); }
}
console.log(`matched ${m}/${cases.length}`);
const X = 'xmlns="http://www.w3.org/1998/Math/MathML"';
console.log('calibration equal(mi,mo)=', normalizeMathML(`<math ${X}><mi>x</mi></math>`) === normalizeMathML(`<math ${X}><mo>x</mo></math>`), 'equal(mi,mi bold)=', normalizeMathML(`<math ${X}><mi>x</mi></math>`) === normalizeMathML(`<math ${X}><mi mathvariant="bold">x</mi></math>`), 'equal(same)=', normalizeMathML(`<math ${X}><mi>x</mi></math>`) === normalizeMathML(`<math ${X}><mi>x</mi></math>`));
