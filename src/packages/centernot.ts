/** Adapted from MathJax 4.1.3 CenternotConfiguration.ts.
 * Copyright (c) 2021-2026 The MathJax Consortium.
 * Licensed under Apache-2.0; see ../LICENSE.MathJax. */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {scan} from '../scanner.js';
import {operator} from '../mathml.js';
import type {TexPackage} from './types.js';

function center(p: Parser, negated = false) {
  const name = negated ? '\\centernot' : '\\centerOver';
  const base = p.tokensArgument(name);
  const over = negated ? scan('{⧸}') : p.tokensArgument(name);
  const group = (n: Node) => p.atom(n.kind === K.mrow && n.inferred ? n.children : [n]);
  p.parseTokens(over, symbol => {
    p.parseTokens(base, phantom => {
      p.parseTokens(base, visible => {
        let core: Node = phantom;
        while (core.kind === K.mrow && core.children.length && !core.attributes['data-mjx-texclass'])
          core = core.children[0];
        const cls = core.attributes['data-mjx-texclass'] ??
          (core.kind === K.mi && core.op ? 'OP' : core.kind === K.mo
            ? ['ORD', 'OP', 'BIN', 'REL', 'OPEN', 'CLOSE', 'PUNCT', 'INNER'][operator(core.text)?.[2] ?? 0] : 'ORD');
        const content = symbol.kind === K.mrow && symbol.inferred ? symbol.children : [symbol];
        p.append(p.atom([group(visible), p.node(K.mpadded, [
          p.node(K.mpadded, content, '', {width: '0', lspace: '-.5width'}),
          p.node(K.mphantom, [group(phantom)]),
        ], '', {width: '0', lspace: '-.5width'})], cls));
      });
    });
  });
}
export default {name: 'centernot', commands: {
  centerOver: {execute: p => center(p)}, centernot: {execute: p => center(p, true)},
}, environments: {}, configurationModules: ['input/tex/centernot/CenternotConfiguration.js']} satisfies TexPackage;
