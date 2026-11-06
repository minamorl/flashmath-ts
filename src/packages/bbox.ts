import {K} from '../ast.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';

export default {name: 'bbox', commands: {bbox: {execute(p) {
  const source = raw(p.optional() ?? []);
  p.argument(math => {
    let padding: Record<string, string> | undefined, background = '', style = '';
    for (const part of source.split(',').map(s => s.trim())) {
      const m = part.match(/^(\.\d+|\d+(?:\.\d*)?)(pt|em|ex|mu|px|in|cm|mm)$/);
      if (m) {
        if (padding) p.error('Padding specified twice in \\bbox');
        const pad = m[1] + m[2];
        padding = {height: '+' + pad, depth: '+' + pad, lspace: pad,
          width: '+' + 2 * parseFloat(m[1]) + m[2]};
      } else if (/^([a-z0-9]+|#[0-9a-f]{6}|#[0-9a-f]{3})$/i.test(part)) {
        if (background) p.error('Background specified twice in \\bbox');
        background = part;
      } else if (/^[-a-z]+:/i.test(part)) {
        if (style) p.error('Style specified twice in \\bbox');
        style = part;
      } else if (part) p.error(`"${part}" doesn't look like a color, a padding dimension, or a style`);
    }
    const children = () => math.kind === K.mrow && !Object.keys(math.attributes).length ? math.children : [math];
    if (padding) math = p.node(K.mpadded, children(), '', padding);
    if (background || style) math = p.node(K.mstyle, children(), '', {
      ...(background ? {mathbackground: background} : {}), ...(style ? {style} : {})});
    p.append(math);
  });
}}}, environments: {}, configurationModules: ['input/tex/bbox/BboxConfiguration.js']} satisfies TexPackage;
