import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {em} from '../mathml.js';
import {raw, scan} from '../scanner.js';
import type {TexPackage, TexCommand} from './types.js';
import {xArrow} from './extpfeil.js';
import {MhchemMachine} from './mhchem-machine.js';
import {markPackageNode} from '../package-mark.js';
const arrowNames: Record<string, readonly [number, number, number]> = {
  rightarrow: [0xe429, 5, 9], leftarrow: [0xe428, 9, 5],
  leftrightarrow: [0xe42a, 9, 9], leftrightarrows: [0xe42b, 9, 9],
  rightleftharpoons: [0xe408, 5, 9], Rightleftharpoons: [0xe409, 5, 9],
  Leftrightharpoons: [0xe40a, 9, 11],
};
const inferred = (n: Node) => n.kind === K.mrow && !n.attributes['data-mjx-texclass'] ? n.children : [n];
function expand(p: Parser, tex: string) {
  if (!tex) return;
  p.stream.push(scan(tex, p.options.maxTokens ?? 200000));
}
const commands: Record<string, TexCommand> = {
  flashmathChemIsotope: {execute(p) {
    const top=raw(p.tokensArgument()),bottom=raw(p.tokensArgument());
    const phantom=String.raw`{\vphantom{A}}`;
    p.parseTokens(scan(`${phantom}^{\\flashmathChemHphantom{${top}}}_{\\flashmathChemHphantom{${bottom}}}\\mkern-1.5mu${phantom}^{\\flashmathChemSmash{\\vphantom{2}}\\llap{${top}}}_{\\vphantom{2}\\llap{\\flashmathChemSmash{${bottom}}}}`),n=>{
      const children=inferred(n);
      if(children[0])markPackageNode(children[0],'prescript');
      for(const child of children)p.append(child);
    });
  }},
  ce: {execute(p) {expand(p, new MhchemMachine(message => p.error(message), p.options.maxDepth).toTex(raw(p.tokensArgument('\\ce'))));}},
  pu: {execute(p) {expand(p, new MhchemMachine(message => p.error(message), p.options.maxDepth).toTex(raw(p.tokensArgument('\\pu')), true));}},
  flashmathChemSmash: {execute(p) {p.argument(n => p.append(p.atom([p.node(K.mpadded, inferred(n), '', {height: '0'})])));}},
  flashmathChemHphantom: {execute(p) {p.argument(n => p.append(p.atom([
    p.node(K.mpadded, [p.node(K.mphantom, inferred(n))], '', {height: '0', depth: '0'}),
  ])));}},
  flashmathChemRel: {execute(p) {p.argument(n => p.append(p.atom(inferred(n), 'REL')));}},
  flashmathChemFraction: {execute(p) {
    const a = p.tokensArgument(), b = p.tokensArgument();
    p.parseTokens(scan('\\textstyle\\frac{' + raw(a) + '}{' + raw(b) + '}'), n => p.append(n));
  }},
  flashmathChemLower: {execute(p) {
    const level = p.f.level;
    let amount = p.dimension();
    if (amount.endsWith('mu')) amount = em(parseFloat(amount) / 18);
    const wasNegative=amount.charCodeAt(0)===45;
    let magnitude='';for(let i=wasNegative?1:0;i<amount.length;i++)magnitude+=amount[i];
    const positive=(wasNegative?'':'-')+magnitude,negative=(wasNegative?'-':'+')+magnitude;
    p.argument(n => p.append(p.node(K.mpadded, [p.atom(inferred(n))], '', {height: positive, depth: negative, voffset: positive})));
    p.f.level = level + 1;
    p.f.display = false;
  }},
  rightleftharpoons: {execute(p) {p.append(p.node(K.mo, [], '⇌', {'data-mjx-alternate': '1', stretchy: 'false'}));}},
};
function rel(name: string, code: number, stretchy = true) {
  commands[name] = {execute(p) {
    const node = markPackageNode(p.node(K.mo, [], String.fromCodePoint(code), {
      'data-mjx-variant': '-mhchem', 'data-mjx-texclass': 'REL', ...(stretchy ? {stretchy: 'true'} : {}),
    }), 'glyph');
    node.rawAttrs = true;
    p.append(node);
  }};
}
for (const [name, args] of Object.entries(arrowNames)) {
  rel('mhchemlong' + name, args[0]);
  commands['mhchemx' + name] = {execute(p) {xArrow(p, ...args);}};
}
for (const [name, code] of Object.entries({tripledash: 0xe410, mhchemBondTD: 0xe411, mhchemBondTDD: 0xe412, mhchemBondDTD: 0xe413})) rel(name, code, false);
for (const [name, code] of Object.entries({mhchemrightarrow: 0xe42d, mhchemleftarrow: 0xe42c, mhchemleftrightarrow: 0xe42e})) rel(name, code);

export default {
  name: 'mhchem', commands, environments: {},
  configurationModules: ['input/tex/mhchem/MhchemConfiguration.js'],
} satisfies TexPackage;
