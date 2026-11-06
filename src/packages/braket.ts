/** Adapted from MathJax 4.1.3 BraketMappings/Methods/Items.ts.
 * Copyright (c) 2009-2026 The MathJax Consortium.
 * Licensed under Apache-2.0; see ../LICENSE.MathJax. */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {scan} from '../scanner.js';
import type {TexCommand, TexPackage} from './types.js';

type BraketFrame = Parser['f'] & {braket?: {
  stretchy: boolean; max: number; count: number; saved: Node[];
}};
function bar(p: Parser, double = false): boolean {
  let frame: BraketFrame | undefined;
  for (let i = p.frames.length - 1; i >= 0; i--) {
    const candidate = p.frames[i] as BraketFrame;
    if (candidate.braket) { frame = candidate; break; }
    if (candidate.argumentScope) break;
  }
  const ctx = frame?.braket;
  if (!ctx || ctx.count >= ctx.max) return false;
  if (!double) {
    p.stream.skip();
    if (p.stream.peek()?.[0] === 124) { p.stream.next(); double = true; }
  }
  const n = p.node(K.mo, [], double ? '‖' : '|', {
    ...(ctx.stretchy || double ? {stretchy: String(ctx.stretchy)} : {}), 'data-braketbar': 'true',
    'data-mjx-texclass': ctx.stretchy ? 'BIN' : 'ORD',
  });
  if (ctx.stretchy) {
    // A bar closes a pending generalized fraction, but leaves its braket open.
    if (p.f !== frame) {
      p.error('Extra close brace or missing open brace');
    }
    let nodes = frame.nodes;
    if (frame.fraction) {
      const f = frame.fraction;
      nodes = [p.node(K.mfrac, [p.row(f.num), p.row(nodes)], '', f.attrs)];
      frame.fraction = null;
    }
    ctx.saved.push(...nodes, p.atom([], 'CLOSE'), n, p.atom([], 'OPEN'));
    frame.nodes = [];
    ctx.count++;
  } else p.append(n);
  return true;
}

const commands: Record<string, TexCommand> = {};
for (const [name, body, count] of [
  ['bra', '{\\langle {#1} \\vert}', 1], ['ket', '{\\vert {#1} \\rangle}', 1],
  ['Bra', '{\\left\\langle {#1} \\right\\vert}', 1],
  ['Ket', '{\\left\\vert {#1} \\right\\rangle}', 1],
  ['ketbra', '{\\vert {#1} \\rangle\\langle {#2} \\vert}', 2],
  ['Ketbra', '{\\left\\vert {#1} \\right\\rangle\\left\\langle {#2} \\right\\vert}', 2],
] as const) commands[name] = {execute(p) {
  const args = Array.from({length: count}, () => p.tokensArgument('\\' + name));
  const tokens = p.substitute({body: scan(body), count, optional: null, prefix: [], delimiters: []}, args);
  p.stream.push(tokens);
}};
for (const name of ['braket', 'Braket', 'set', 'Set']) commands[name] = {execute(p) {
  const stretchy = name[0] === name[0].toUpperCase(), set = name.toLowerCase() === 'set';
  const ctx = {stretchy, max: set ? 1 : Infinity, count: 0, saved: [] as Node[]};
  p.argument(inner => {
    const nodes = [...ctx.saved, ...(inner.kind === K.mrow && inner.inferred ? inner.children : [inner])];
    const fence = (text: string, cls: string) => p.node(K.mo, [], text,
      {'data-mjx-texclass': cls, ...(stretchy ? {} : {fence: 'true', stretchy: 'false', symmetric: 'true'})});
    if (name === 'Set') { nodes.unshift(p.node(K.mspace, [], '', {width: '0.167em'})); nodes.push(p.node(K.mspace, [], '', {width: '0.167em'})); }
    nodes.unshift(fence(set ? '{' : '⟨', 'OPEN'));
    nodes.push(fence(set ? '}' : '⟩', 'CLOSE'));
    p.append(stretchy ? p.atom(nodes, 'INNER') : p.row(nodes, true));
  }, false, '\\' + name);
  (p.f as BraketFrame).braket = ctx;
}};
commands['|'] = {type: 'delimiter', char: '‖', attrs: {texClass: 0}, execute(p, t, d, id) {
  if (!bar(p, true)) p.append(p.symbol(t, id, d));
}};
commands['@braket-character:|'] = {type: 'character', char: '|', execute: p => bar(p)};

export default {name: 'braket', priority: 3, commands,
  environments: {},
  configurationModules: ['input/tex/braket/BraketConfiguration.js']} satisfies TexPackage;
