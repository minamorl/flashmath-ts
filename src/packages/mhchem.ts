import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {em} from '../mathml.js';
import {raw, scan} from '../scanner.js';
import type {TexPackage, TexCommand} from './types.js';
import {xArrow} from './extpfeil.js';

// Independent cursor scanner. Chemistry is expanded into tokens on the existing
// TeX stack; neither the remaining input nor a MathJax parser is reconstructed.
// MathJax 4.1.3 MhchemConfiguration and mhchemParser 4.2.1 specify the layout.
const phantom = String.raw`{\vphantom{A}}`;
const roman = (s: string) => `\\mathrm{${s}}`;
const subscript = (s: string) => `_{\\flashmathChemSmash{${s}}}`;
const arrows: Record<string, string> = {
  '<-->': 'leftrightarrows', '<=>>': 'Rightleftharpoons', '<<=>': 'Leftrightharpoons',
  '<=>': 'rightleftharpoons', '<->': 'leftrightarrow', '->': 'rightarrow', '<-': 'leftarrow',
  '→': 'rightarrow', '⟶': 'rightarrow', '⇌': 'rightleftharpoons',
};
const arrowTokens = Object.keys(arrows); // Longest matching prefix first.
const arrowNames: Record<string, readonly [number, number, number]> = {
  rightarrow: [0xe429, 5, 9], leftarrow: [0xe428, 9, 5],
  leftrightarrow: [0xe42a, 9, 9], leftrightarrows: [0xe42b, 9, 9],
  rightleftharpoons: [0xe408, 5, 9], Rightleftharpoons: [0xe409, 5, 9],
  Leftrightharpoons: [0xe40a, 9, 11],
};
const bonds: Record<string, string> = {
  '-': '{-}', '1': '{-}', '=': '{=}', '2': '{=}', '#': '{\\equiv}', '3': '{\\equiv}',
  '~': '{\\tripledash}', '~-': '{\\mhchemBondTD}',
  '~--': '{\\mhchemBondTDD}', '~=': '{\\mhchemBondTDD}', '-~-': '{\\mhchemBondDTD}',
  '...': '{{\\cdot}{\\cdot}{\\cdot}}', '....': '{{\\cdot}{\\cdot}{\\cdot}{\\cdot}}',
  '->': '{\\mhchemrightarrow}', '<-': '{\\mhchemleftarrow}', '<': '{<}', '>': '{>}',
};
const alpha = (s: string) => s >= 'A' && s <= 'Z' || s >= 'a' && s <= 'z';
const digit = (s: string) => s >= '0' && s <= '9';
const white = (s: string) => s === ' ' || s === '\n' || s === '\t' || s === '\r';

class Chemistry {
  i = 0;
  constructor(readonly s: string, readonly p: Parser, readonly depth = 0) {
    if (depth >= (p.options.maxDepth ?? 1024)) p.error('Nesting limit exceeded');
  }
  skip() {while (white(this.s[this.i])) this.i++;}
  command() {
    const start = this.i++;
    if (alpha(this.s[this.i])) while (alpha(this.s[this.i])) this.i++;
    else if (this.i < this.s.length) this.i++;
    return this.s.slice(start, this.i);
  }
  group(open = '{', close = '}') {
    if (this.s[this.i] !== open) this.p.error(`Missing ${open} in mhchem argument`);
    const start = ++this.i;
    let depth = 1;
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (c === '\\') {this.command(); continue;}
      this.i++;
      if (c === open) depth++;
      if (c === close && --depth === 0) return this.s.slice(start, this.i - 1);
    }
    return this.p.error(`Missing ${close} in mhchem argument`);
  }
  math() {
    const start = ++this.i;
    while (this.i < this.s.length) {
      if (this.s[this.i] === '\\') {this.command(); continue;}
      if (this.s[this.i++] === '$') {
        const text = new Chemistry(this.s.slice(start, this.i - 1), this.p, this.depth + 1);
        let expanded = '', braces = 0;
        while (text.i < text.s.length) {
          if (text.s[text.i] !== '\\') {
            if (text.s[text.i] === '{') braces++;
            if (text.s[text.i] === '}') braces--;
            expanded += text.s[text.i++]; continue;
          }
          const command = text.command();
          if (command === '\\ce' && braces === 0) {text.skip(); expanded += text.inner(text.group());}
          else expanded += command;
        }
        return expanded + ' ';
      }
    }
    return this.p.error('Unclosed math delimiter in mhchem');
  }
  inner(s: string, commaSpace = 6) {return new Chemistry(s, this.p, this.depth + 1).ce(commaSpace);}
  scriptValue(s: string, sup: boolean): string {
    const c = new Chemistry(s, this.p, this.depth + 1);
    let out = '';
    while (c.i < s.length) {
      const ch = s[c.i];
      if (ch === '$') {out += c.math(); continue;}
      if (ch === '{') {out += `\\text{${c.group()}}`; continue;}
      if (ch === '(' && /^\([a-z]+/.test(s.slice(c.i))) {out += c.stateGroup(true); continue;}
      if (ch === '\\') {out += roman(c.command()); continue;}
      if (alpha(ch)) {
        const start = c.i++;
        while (alpha(s[c.i])) c.i++;
        const text = s.slice(start, c.i);
        out += text === 'x' && sup ? '{\\times}' : ['x', 'n', 'e'].includes(text) ? text + ' ' : roman(text);
        continue;
      }
      c.i++;
      out += ch === '.' && sup ? '\\mkern1mu \\bullet\\mkern1mu '
        : ch === "'" ? '\\prime '
        : ch === ',' ? '{,}\\mkern1mu ' : ch;
    }
    return out;
  }
  script(sup: boolean) {
    this.i++;
    if (this.s[this.i] === '{') return this.scriptValue(this.group(), sup);
    if (this.s[this.i] === '$') return this.math();
    const start = this.i;
    if (this.s[this.i] === '\\') return roman(this.command());
    if (this.s[this.i] === '+' || this.s[this.i] === '-') {
      this.i++; while (digit(this.s[this.i])) this.i++;
    }
    else {
      while (digit(this.s[this.i])) this.i++;
      if (this.i === start && alpha(this.s[this.i])) this.i++;
      if (['+', '-', '.', '*', "'"].includes(this.s[this.i]) && !(this.s[this.i] === '-' && alpha(this.s[this.i + 1]))) this.i++;
    }
    if (start === this.i) this.p.error('Missing mhchem script');
    return this.scriptValue(this.s.slice(start, this.i), sup);
  }
  stateGroup(script = false) {
    // Parentheses containing a lower-case state of matter are upright and get
    // a small separation, unlike structural parentheses around a formula.
    const body = this.group('(', ')');
    return `\\mskip${script ? 1 : 2}mu (${this.inner(body, 0)})`;
  }
  ce(commaSpace = 6): string {
    const out: string[] = [];
    let letters = '', start = true, spaced = false, sup = false, hyphen = false;
    const flush = () => {if (letters) {out.push(roman(letters)); letters = '';}};
    const begin = () => {if (spaced && !start) out.push('~'); spaced = false; start = false;};
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (white(ch)) {flush(); this.skip(); spaced = true; continue;}
      const arrow = arrowTokens.find(a => this.s.startsWith(a, this.i));
      if (arrow) {
        flush(); this.i += arrow.length; this.skip();
        let above = '', below = '';
        if (this.s[this.i] === '[') above = this.inner(this.group('[', ']'));
        if (this.s[this.i] === '[') below = this.inner(this.group('[', ']'));
        const name = arrows[arrow];
        let a = `\\mhchemlong${name}`;
        if (above || below) {
          if (['leftrightarrows', 'rightleftharpoons', 'Rightleftharpoons', 'Leftrightharpoons'].includes(name) && below) {
            // MathJax's compatibility replacement deliberately only collapses
            // the 2mu case; the harpoon lower label retains its 6mu padding.
            a = `\\mhchemx${name}{${above}}`;
            a = `\\underset{\\flashmathChemLower${name === 'leftrightarrows' ? 2 : 6}mu{${below}}}{${a}}`;
            if (name === 'leftrightarrows') a = `\\mhchemx${name}[${below}]{${above}}`;
          } else a = `\\mhchemx${name}${below ? `[{${below}}]` : ''}{${above}}`;
        }
        out.push(` {}\\flashmathChemRel{${a}}{} `); start = true; spaced = false; sup = false; continue;
      }
      const standalonePhase = (ch === 'v' || ch === '^') && (spaced || start)
        && (!this.s[this.i + 1] || white(this.s[this.i + 1]));
      if (standalonePhase || this.s.startsWith('(v)', this.i) || this.s.startsWith('(^)', this.i)) {
        flush(); const up = ch === '^' || this.s[this.i + 1] === '^';
        this.i += ch === '(' ? 3 : 1;
        out.push(` \\${up ? 'uparrow' : 'downarrow'}{} `); start = false; spaced = true; continue;
      }
      if ('+-=<>'.includes(ch) && (spaced || start && ch !== '-')) {
        flush(); out.push(` {}${ch}{} `); this.i++; spaced = false; start = true; sup = false; continue;
      }
      if (ch === '$') {
        flush(); begin(); out.push(this.math()); hyphen = true;
        if (white(this.s[this.i])) {
          this.skip();
          if (alpha(this.s[this.i])) out.push('\\,');
          else spaced = true;
        }
        continue;
      }
      if (ch === '{') {
        const text = this.group();
        if (!text && letters.startsWith('\\')) {letters += '{}'; continue;}
        flush();
        if (text) {begin(); out.push(`{\\text{${text}}}`);}
        continue;
      }
      if (ch === '^' || ch === '_') {
        flush(); spaced = false;
        const up = ch === '^', scriptStart = this.i, v = this.script(up);
        // Numeric scripts immediately before another element are isotopes.
        if (up && (start || /^[0-9]+$/.test(v) && alpha(this.s[this.i]) && this.s[this.i] <= 'Z')) {
          let bottom = '';
          if (this.s[this.i] === '_') bottom = this.script(false);
          if (!start) out.push('\\mkern2mu');
          out.push(`${phantom}^{\\flashmathChemHphantom{${v}}}_{\\flashmathChemHphantom{${bottom}}}\\mkern-1.5mu${phantom}^{\\flashmathChemSmash{\\vphantom{2}}\\llap{${v}}}_{\\vphantom{2}\\llap{\\flashmathChemSmash{${bottom}}}}`);
          start = false; sup = false;
        } else {
          out.push((!up && sup ? '' : phantom) + (up ? `^{${v}}` : subscript(v)));
          sup = up && !v.includes('\\mskip') && !this.s.slice(scriptStart + 1, this.i).includes('(');
          if (up && this.s.startsWith('_{(', this.i)) sup = false;
          start = false;
        }
        continue;
      }
      if (ch === "'") {
        flush(); let value = '';
        while (this.s[this.i] === "'") {value += '\\prime '; this.i++;}
        out.push(`${phantom}^{${value}}`); sup = true; continue;
      }
      if (ch === '+' || ch === '-') {
        flush(); this.i++;
        const state = /^\((?:aq|s|l|g|cr|c)(?=[,)])/.test(this.s.slice(this.i));
        if (ch === '-' && this.i < this.s.length && !white(this.s[this.i]) && !')]}'.includes(this.s[this.i]) && !state) out.push(hyphen ? '\\text{-}' : '{-}');
        else out.push(`${phantom}^{${ch}}`);
        sup = true; continue;
      }
      if (ch === '=' || ch === '#') {flush(); out.push(bonds[ch]); this.i++; continue;}
      if (ch === '*' || ch === '.') {flush(); out.push('\\,{\\cdot}\\,'); this.i++; start = true; spaced = false; continue;}
      if (ch === ',' || ch === ';') {flush(); out.push(commaSpace ? `{${ch}}\\mkern${commaSpace}mu ` : ch); this.i++; spaced = false; start = true; continue;}
      if (ch === '\\') {
        const cmd = this.command();
        if (cmd === '\\bond') {
          flush(); const bond = this.group();
          if (!Object.hasOwn(bonds, bond)) this.p.error('mhchem bug T. Please report.');
          out.push(bonds[bond]); continue;
        }
        if (cmd === '\\ca') {flush(); out.push('{\\sim}'); spaced = false; continue;}
        if (['\\pm', '\\approx'].includes(cmd)) {flush(); out.push(` {}${cmd}{} `); start = true; spaced = false; continue;}
        if (cmd === '\\frac' || cmd === '\\overset' || cmd === '\\underset') {
          flush(); begin(); const a = this.inner(this.group()); const b = this.inner(this.group());
          out.push(`${cmd}{${a}}{${b}}`); continue;
        }
        if (cmd === '\\{' || cmd === '\\}') {flush(); begin(); out.push(cmd); continue;}
        if (['\\leftarrow', '\\rightarrow', '\\leftrightarrow', '\\rightleftharpoons'].includes(cmd)) {
          flush(); out.push(cmd === '\\rightleftharpoons' ? cmd + ' ' : '\\mhchem' + cmd.slice(1) + ' '); this.skip(); spaced = false; continue;
        }
        begin(); letters += cmd;
        if (white(this.s[this.i])) {this.skip(); letters += ' ';}
        hyphen = true; continue;
      }
      if (ch === '(') {
        flush();
        const fraction = this.s.slice(this.i).match(/^\(\d+\/\d+\)/);
        if (start && fraction) {out.push(fraction[0] + '\\,'); this.i += fraction[0].length; this.skip(); start = false; spaced = false; continue;}
        const state = this.s.slice(this.i).match(/^\((?:(?:aq|s|l|g|cr|c)(?=[,)])|\\ca|\$[a-z]\$)/);
        if (state) {out.push(this.stateGroup()); spaced = false; start = false; continue;}
        begin(); out.push('('); this.i++; start = true; continue;
      }
      if (')[]'.includes(ch)) {flush(); begin(); out.push(ch); this.i++; start = ch === '['; sup = false; continue;}
      if (digit(ch)) {
        flush(); const from = this.i++;
        while (digit(this.s[this.i]) || (start || spaced) && [',', '.'].includes(this.s[this.i]) && digit(this.s[this.i + 1])) this.i++;
        let value = this.s.slice(from, this.i);
        if (start || spaced) {
          begin();
          if (this.s[this.i] === '/' && digit(this.s[this.i + 1])) {
            const a = value; const from = ++this.i;
            while (digit(this.s[this.i])) this.i++;
            value = `\\flashmathChemFraction{${a}}{${this.s.slice(from, this.i)}}`;
          }
          out.push(value); this.skip();
          const orbital = this.s[this.i] >= 'a' && this.s[this.i] <= 'z' && this.s[this.i + 1] === '^';
          if (orbital) hyphen = true;
          if (this.i < this.s.length && (alpha(this.s[this.i]) || this.s[this.i] === '$' || this.s[this.i] === '\\') && !orbital) out.push('\\,');
        } else out.push(phantom + subscript(value));
        sup = false; continue;
      }
      if (alpha(ch)) {
        if (start && ['x', 'n'].includes(ch) && (white(this.s[this.i + 1]) || this.s[this.i + 1] === '-')) {
          flush(); out.push(ch); this.i++; this.skip();
          if (this.s[this.i] !== '-') out.push('\\,');
          else out.push(' ');
          start = false; spaced = false; hyphen = true; continue;
        }
        begin(); letters += ch; this.i++; sup = false; continue;
      }
      flush(); begin(); out.push(ch); this.i++;
    }
    flush(); return out.join('');
  }
}

function units(s: string, p: Parser): string {
  const c = new Chemistry(s.trim(), p);
  let out = '';
  const from = c.i;
  if (c.s[c.i] === '+' || c.s[c.i] === '-') c.i++;
  while (digit(c.s[c.i]) || [',', '.'].includes(c.s[c.i]) && digit(c.s[c.i + 1])) c.i++;
  if (c.i > from) {
    out += c.s.slice(from, c.i).replaceAll(',', '{,}');
    if (c.s[c.i] === 'e' || c.s[c.i] === 'E') {
      const times = c.s[c.i++] === 'E'; const start = c.i;
      if (c.s[c.i] === '+' || c.s[c.i] === '-') c.i++;
      while (digit(c.s[c.i])) c.i++;
      out += `\\${times ? 'times' : 'cdot'} 10^{${c.s.slice(start, c.i)}}`;
    }
    c.skip(); if (c.i < c.s.length) out += '~';
  }
  const body = c.s.slice(c.i);
  function u(text: string): string {
    let i = 0, result = '';
    while (i < text.length) {
      if (white(text[i])) {while (white(text[i])) i++; if (i < text.length) result += '\\mkern3mu '; continue;}
      if (text[i] === '*') {result += '\\mkern1mu{\\cdot}\\mkern1mu '; i++; while (white(text[i])) i++; continue;}
      if (text[i] === '/') {result += '/'; i++; continue;}
      const start = i;
      while (alpha(text[i]) || text[i] === 'µ' || text[i] === 'Ω') i++;
      if (start === i) {result += text[i++]; continue;}
      let word = text.slice(start, i);
      const power = i;
      if (text[i] === '-' || text[i] === '+') i++;
      while (digit(text[i])) i++;
      if (i > power) word += `^{${text.slice(power, i)}}`;
      result += roman(word);
    }
    return result;
  }
  const div = body.indexOf('//');
  if (div >= 0) {
    return out + `\\flashmathChemFraction{${u(body.slice(0, div).trim())}}{${u(body.slice(div + 2).trim())}}`;
  }
  return out + u(body);
}

const inferred = (n: Node) => n.kind === K.mrow && !n.attributes['data-mjx-texclass'] ? n.children : [n];
function expand(p: Parser, tex: string) {
  if (!tex) return;
  p.stream.push(scan('{' + tex + '}', p.options.maxTokens ?? 200000));
}
const commands: Record<string, TexCommand> = {
  ce: {execute(p) {expand(p, new Chemistry(raw(p.tokensArgument('\\ce')), p).ce());}},
  pu: {execute(p) {expand(p, units(raw(p.tokensArgument('\\pu')), p));}},
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
    const positive = amount.startsWith('-') ? amount.slice(1) : '-' + amount;
    const negative = positive.startsWith('-') ? '+' + positive.slice(1) : '-' + positive;
    p.argument(n => p.append(p.node(K.mpadded, [p.atom(inferred(n))], '', {height: positive, depth: negative, voffset: positive})));
    p.f.level = level + 1;
    p.f.display = false;
  }},
  rightleftharpoons: {execute(p) {p.append(p.node(K.mo, [], '⇌', {'data-mjx-alternate': '1', stretchy: 'false'}));}},
};
function rel(name: string, code: number, stretchy = true) {
  commands[name] = {execute(p) {
    const node = p.node(K.mo, [], String.fromCodePoint(code), {
      'data-mjx-variant': '-mhchem', 'data-mjx-texclass': 'REL', ...(stretchy ? {stretchy: 'true'} : {}),
    });
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
