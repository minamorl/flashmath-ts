/** Adapted from MathJax 4.1.3 BboxConfiguration.ts.
 * Copyright (c) 2018-2026 The MathJax Consortium.
 * Licensed under Apache-2.0; see ../LICENSE.MathJax. */
import {K} from '../ast.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';
import {markPackageNode} from '../package-mark.js';

const units = new Set(['pt', 'em', 'ex', 'mu', 'px', 'in', 'cm', 'mm']);
const digit = (c: number) => c >= 48 && c <= 57;
const alpha = (c: number) => c >= 65 && c <= 90 || c >= 97 && c <= 122;
const white = (c: number) => c <= 32 || c === 160;
export default {name: 'bbox', commands: {bbox: {execute(p) {
  const source = raw(p.optional() ?? []);
  p.argument(math => {
    let padding: Record<string, string> | undefined, background = '', style = '';
    let cursor = 0;
    while (cursor < source.length) {
      let start = cursor;
      while (cursor < source.length && source.charCodeAt(cursor) !== 44) cursor++;
      let end = cursor++;
      while (start < end && white(source.charCodeAt(start))) start++;
      while (end > start && white(source.charCodeAt(end - 1))) end--;
      if (start === end) continue;
      let i = start, digits = 0;
      while (i < end && digit(source.charCodeAt(i))) { i++; digits++; }
      if (source.charCodeAt(i) === 46) {
        i++;
        while (i < end && digit(source.charCodeAt(i))) { i++; digits++; }
      }
      const unit = digits && end - i === 2 ? source.slice(i, end) : '';
      if (unit && units.has(unit)) {
        if (padding) p.error('Padding specified twice in \\bbox');
        const pad = source.slice(start, end);
        padding = {height: '+' + pad, depth: '+' + pad, lspace: pad,
          width: '+' + 2 * parseFloat(pad) + unit};
        continue;
      }
      let color = true;
      const hash = source.charCodeAt(start) === 35;
      if (hash && end - start !== 4 && end - start !== 7) color = false;
      for (i = start + (hash ? 1 : 0); color && i < end; i++) {
        const c = source.charCodeAt(i);
        color = digit(c) || (hash ? c >= 65 && c <= 70 || c >= 97 && c <= 102 : alpha(c));
      }
      const part = source.slice(start, end);
      if (color) {
        if (background) p.error('Background specified twice in \\bbox');
        background = part;
        continue;
      }
      i = start;
      while (i < end && (alpha(source.charCodeAt(i)) || source.charCodeAt(i) === 45)) i++;
      if (i > start && source.charCodeAt(i) === 58) {
        if (style) p.error('Style specified twice in \\bbox');
        style = part;
      } else p.error(`"${part}" doesn't look like a color, a padding dimension, or a style`);
    }
    const children = () => math.kind === K.mrow && math.inferred ? math.children : [math];
    if (padding) math = markPackageNode(p.node(K.mpadded, children(), '', padding),'bbox-padding');
    if (background || style) math = p.node(K.mstyle, children(), '', {
      ...(background ? {mathbackground: background} : {}), ...(style ? {style} : {})});
    p.append(math);
  }, false, '\\bbox');
}}}, environments: {}, configurationModules: ['input/tex/bbox/BboxConfiguration.js']} satisfies TexPackage;
