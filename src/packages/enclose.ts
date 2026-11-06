/** Adapted from MathJax 4.1.3 EncloseConfiguration.ts.
 * Copyright (c) 2018-2026 The MathJax Consortium.
 * Licensed under Apache-2.0; see ../LICENSE.MathJax. */
import {K, ParseError} from '../ast.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';

const allowed = new Set(['data-arrowhead', 'color', 'mathcolor', 'background',
  'mathbackground', 'data-padding', 'data-thickness']);

/** MathJax keyval syntax: only braces protect separators; quotes are data. */
export function enclosureAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!source) return attrs;
  let cursor = 0;
  const white = (c: number) => c <= 32 || c === 160 || c === 0xfeff || c >= 0x2000 && c <= 0x200a;
  const value = (key: boolean): [string, number] => {
    const start = cursor;
    let depth = 0, outer = 0, leading = true, delimiter = 0;
    while (cursor < source.length) {
      const c = source.charCodeAt(cursor++);
      if (c === 92) { cursor = Math.min(cursor + 1, source.length); leading = false; continue; }
      if (c === 123) { if (leading) outer++; depth++; }
      else if (c === 125) {
        if (!depth) throw new ParseError('Extra close brace or missing open brace', cursor - 1);
        depth--; leading = false;
      } else if (c !== 32) {
        if (!depth && (c === 44 || key && c === 61)) { delimiter = c; break; }
        outer = Math.min(outer, depth); leading = false;
      }
    }
    if (depth) throw new ParseError('Extra open brace or missing close brace', start);
    let a = start, b = cursor - (delimiter ? 1 : 0);
    const trim = () => {
      while (a < b && white(source.charCodeAt(a))) a++;
      while (b > a && white(source.charCodeAt(b - 1))) {
        let slash = b - 2;
        while (slash >= a && source.charCodeAt(slash) === 92) slash--;
        if ((b - 2 - slash) % 2) break;
        b--;
      }
    };
    trim();
    while (outer-- > 0) { a++; b--; trim(); }
    return [source.slice(a, b), delimiter];
  };
  while (cursor < source.length) {
    const [key, delimiter] = value(true);
    const text = delimiter === 61 ? value(false)[0] : 'true';
    if (allowed.has(key)) attrs[key] = text;
  }
  return attrs;
}

export default {
  name: 'enclose',
  commands: {enclose: {execute(p) {
    const text = raw(p.tokensArgument('\\enclose'));
    let notation = '';
    for (let i = 0; i < text.length; i++) notation += text.charCodeAt(i) === 44 ? ' ' : text[i];
    const attrs = enclosureAttributes(raw(p.optional() ?? []));
    p.argument(n => p.append(p.node(K.menclose, n.kind === K.mrow && n.inferred ? n.children : [n], '', notation === 'longdiv' ? attrs : {...attrs, notation})), false, '\\enclose');
  }}},
  environments: {},
  configurationModules: ['input/tex/enclose/EncloseConfiguration.js'],
} satisfies TexPackage;
