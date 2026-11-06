import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw, scan} from '../scanner.js';
import {em} from '../mathml.js';
import type {TexPackage, TexCommand} from './types.js';

// Layout follows MathJax 4.1.3 AmsMethods.xArrow (Apache-2.0).
// Labels are parsed on the existing stack; no nested parser or source rewrite.
export function xArrow(p: Parser, code: number, left: number, right: number) {
  const bottom = p.optional();
  const level = p.f.level;
  p.argument(top => {
    const finish = (below?: Node) => {
      let arrow = p.node(K.mo, [], String.fromCodePoint(code), {
        'data-mjx-texclass': 'ORD', stretchy: 'true',
      });
      if (level) arrow = p.node(K.mstyle, [arrow], '', {scriptlevel: '0'});
      const label = (n: Node, under: boolean) => p.node(K.mpadded, [
        ...(n.kind === K.mrow && !n.attributes['data-mjx-texclass'] ? n.children : [n]),
        p.node(K.mspace, [], '', under ? {height: '.75em'} : {depth: '.2em'}),
      ], '', {
        width: '+' + em((left + right) / 18), lspace: em(left / 18),
        voffset: under ? '.15em' : '-.2em',
        ...(under ? {depth: '-.15em'} : {height: '-.2em'}),
      });
      p.append(p.atom([
        p.atom([], 'NONE'),
        p.node(below ? K.munderover : K.mover, [
          arrow, ...(below ? [label(below, true)] : []), label(top, false),
        ]),
      ], 'REL'));
    };
    if (bottom?.length) {
      p.parseTokens(bottom, finish);
      p.f.level = level + 1;
      p.f.display = false;
    }
    else finish();
  });
  p.f.level = level + 1;
  p.f.display = false;
}

const arrows: Record<string, readonly [number, number, number]> = {
  xtwoheadrightarrow: [0x21a0, 12, 16],
  xtwoheadleftarrow: [0x219e, 17, 13],
  xmapsto: [0x21a6, 6, 7],
  xlongequal: [0x3d, 7, 7],
  xtofrom: [0x21c4, 12, 12],
};
const commands: Record<string, TexCommand> = Object.fromEntries(
  Object.entries(arrows).map(([name, args]) => [name, {execute(p) {xArrow(p, ...args);}}]),
);
commands.Newextarrow = {execute(p) {
  const cs = raw(p.tokensArgument('\\Newextarrow'));
  const spaces = raw(p.tokensArgument('\\Newextarrow'));
  const code = raw(p.tokensArgument('\\Newextarrow'));
  if (!/^\\([a-z]+|.)$/i.test(cs))
    p.error('First argument to \\Newextarrow must be a control sequence name');
  if (!/^\d+,\d+$/.test(spaces))
    p.error('Second argument to \\Newextarrow must be two integers separated by a comma');
  if (!/^(\d+|0x[0-9a-f]+)$/i.test(code))
    p.error('Third argument to \\Newextarrow must be a unicode character number');
  const [l, r] = spaces.split(',').map(Number);
  const n = Number(code);
  if (n > 0x10ffff || n >= 0xd800 && n <= 0xdfff || n < 32)
    p.error('Invalid Unicode character number');
  // The definition belongs to the parser session, just like \newcommand.
  p.macros.set(cs.slice(1), {
    body: scan(`\\flashmathExtArrow{${n}}{${l}}{${r}}`),
    count: 0, optional: null, prefix: [], delimiters: [],
  });
}};
commands.flashmathExtArrow = {execute(p) {
  const code = Number(raw(p.tokensArgument()));
  const l = Number(raw(p.tokensArgument()));
  const r = Number(raw(p.tokensArgument()));
  xArrow(p, code, l, r);
}};

export default {
  name: 'extpfeil', commands, environments: {},
  configurationModules: ['input/tex/extpfeil/ExtpfeilConfiguration.js'],
} satisfies TexPackage;
