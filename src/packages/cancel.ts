/** Adapted from MathJax 4.1.3 CancelConfiguration.ts.
 * Copyright (c) 2018-2026 The MathJax Consortium.
 * Licensed under Apache-2.0; see ../LICENSE.MathJax. */
import {K} from '../ast.js';
import {raw} from '../scanner.js';
import {enclosureAttributes} from './enclose.js';
import type {TexPackage, TexCommand} from './types.js';

const commands: Record<string, TexCommand> = {};
for (const [name, notation] of Object.entries({cancel: 'updiagonalstrike',
  bcancel: 'downdiagonalstrike', xcancel: 'updiagonalstrike downdiagonalstrike'})) {
  commands[name] = {execute(p) {
    const attrs = {...enclosureAttributes(raw(p.optional() ?? [])), notation};
    p.argument(n => p.append(p.node(K.menclose,
      n.kind === K.mrow && n.inferred ? n.children : [n], '', attrs)), false, '\\' + name);
  }};
}
commands.cancelto = {execute(p) {
  const attrs = {...enclosureAttributes(raw(p.optional() ?? [])),
    notation: 'updiagonalstrike updiagonalarrow northeastarrow'};
  p.args(2, ([value, math]) => {
    const result = p.node(K.msup, [
    p.node(K.menclose, math.kind === K.mrow && math.inferred ? math.children : [math], '', attrs),
    p.node(K.mpadded, value.kind === K.mrow && value.inferred ? value.children : [value], '',
      {depth: '-.1em', height: '+.1em', voffset: '.1em'}),
    ]);
    result.scriptBoundary = true;
    p.append(result);
  }, '\\cancelto');
}};
export default {name: 'cancel', commands, environments: {},
  configurationModules: ['input/tex/cancel/CancelConfiguration.js']} satisfies TexPackage;
