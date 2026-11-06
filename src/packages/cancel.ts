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
      n.kind === K.mrow && !Object.keys(n.attributes).length ? n.children : [n], '', attrs)));
  }};
}
commands.cancelto = {execute(p) {
  const attrs = {...enclosureAttributes(raw(p.optional() ?? [])),
    notation: 'updiagonalstrike updiagonalarrow northeastarrow'};
  p.args(2, ([value, math]) => p.append(p.node(K.msup, [
    p.node(K.menclose, math.kind === K.mrow && !Object.keys(math.attributes).length ? math.children : [math], '', attrs),
    p.node(K.mpadded, value.kind === K.mrow && !Object.keys(value.attributes).length ? value.children : [value], '',
      {depth: '-.1em', height: '+.1em', voffset: '.1em'}),
  ])));
}};
export default {name: 'cancel', commands, environments: {},
  configurationModules: ['input/tex/cancel/CancelConfiguration.js']} satisfies TexPackage;
