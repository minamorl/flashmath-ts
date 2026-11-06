import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {scan} from '../scanner.js';
import {operator} from '../mathml.js';
import type {TexPackage} from './types.js';

function center(p: Parser, negated = false) {
  const base = p.tokensArgument();
  const over = negated ? scan('{⧸}') : p.tokensArgument();
  p.parseTokens(base, n => {
    const group = () => p.atom(n.kind === K.mrow && !Object.keys(n.attributes).length ? n.children : [n]);
    p.parseTokens(over, symbol => {
      let core: Node = n;
      while (core.kind === K.mrow && core.children.length) core = core.children[0];
      const cls = core.attributes['data-mjx-texclass'] ??
        (core.kind === K.mo ? ['ORD', 'OP', 'BIN', 'REL', 'OPEN', 'CLOSE', 'PUNCT', 'INNER'][operator(core.text)?.[2] ?? 0] : 'ORD');
      const content = symbol.kind === K.mrow && !Object.keys(symbol.attributes).length ? symbol.children : [symbol];
      p.append(p.atom([group(), p.node(K.mpadded, [
        p.node(K.mpadded, content, '', {width: '0', lspace: '-.5width'}),
        p.node(K.mphantom, [group()]),
      ], '', {width: '0', lspace: '-.5width'})], cls));
    });
  });
}
export default {name: 'centernot', commands: {
  centerOver: {execute: p => center(p)}, centernot: {execute: p => center(p, true)},
}, environments: {}, configurationModules: ['input/tex/centernot/CenternotConfiguration.js']} satisfies TexPackage;
