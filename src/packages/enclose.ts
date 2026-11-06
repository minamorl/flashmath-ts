import {K} from '../ast.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';

const allowed = new Set(['data-arrowhead', 'color', 'mathcolor', 'background',
  'mathbackground', 'data-padding', 'data-thickness']);

/** TeX key/value options: braces and quoted strings protect commas. */
export function enclosureAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let start = 0, depth = 0, quote = '';
  for (let i = 0; i <= source.length; i++) {
    const c = source[i];
    if (quote) { if (c === quote) quote = ''; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    if (i === source.length || c === ',' && depth === 0 && !quote) {
      const part = source.slice(start, i), equal = part.indexOf('=');
      const key = (equal < 0 ? part : part.slice(0, equal)).trim();
      let value = equal < 0 ? 'true' : part.slice(equal + 1).trim();
      if (/^\{[\s\S]*\}$|^"[\s\S]*"$|^'[\s\S]*'$/.test(value)) value = value.slice(1, -1);
      if (allowed.has(key)) attrs[key] = value;
      start = i + 1;
    }
  }
  return attrs;
}

export default {
  name: 'enclose',
  commands: {enclose: {execute(p) {
    const notation = raw(p.tokensArgument()).replace(/,/g, ' ');
    const attrs = enclosureAttributes(raw(p.optional() ?? []));
    p.argument(n => p.append(p.node(K.menclose, n.kind === K.mrow && !Object.keys(n.attributes).length ? n.children : [n], '', {...attrs, notation})));
  }}},
  environments: {},
  configurationModules: ['input/tex/enclose/EncloseConfiguration.js'],
} satisfies TexPackage;
