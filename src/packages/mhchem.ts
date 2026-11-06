import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {em} from '../mathml.js';
import {raw, scan} from '../scanner.js';
import type {TexPackage, TexCommand} from './types.js';
import {xArrow} from './extpfeil.js';

// Character-code state machine based on the ce, pq/bd, tex-math and pu grammar
// of MathJax 4.1.3 / mhchemParser 4.2.1. No regexp recognizer and no copying of
// the unconsumed suffix. Child machines share the source and operate on spans;
// substring() is used only to emit a consumed lexeme into TeX expansion tokens.
type Span = readonly [start: number, end: number];
const enum Entity {Start, Body}
const letter = (c: number) => c >= 65 && c <= 90 || c >= 97 && c <= 122;
const lower = (c: number) => c >= 97 && c <= 122;
const digit = (c: number) => c >= 48 && c <= 57;
const white = (c: number) => c === 32 || c === 9 || c === 10 || c === 13 || c === 160;
const phantom = String.raw`{\vphantom{A}}`;
const roman = (s: string) => `\\mathrm{${s}}`;
const subscript = (s: string) => `_{\\flashmathChemSmash{${s}}}`;
const arrows: Record<string, string> = {
  '<-->': 'leftrightarrows', '<=>>': 'Rightleftharpoons', '<<=>': 'Leftrightharpoons',
  '<=>': 'rightleftharpoons', '<->': 'leftrightarrow', '->': 'rightarrow', '<-': 'leftarrow',
  '→': 'rightarrow', '⟶': 'rightarrow', '⇌': 'rightleftharpoons',
};
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

class Chemistry {
  i: number;
  constructor(readonly s: string, readonly p: Parser, readonly depth = 0,
    start = 0, readonly end = s.length) {
    this.i = start;
    if (depth >= (p.options.maxDepth ?? 1024)) p.error('Nesting limit exceeded');
  }
  c(offset = 0) {return this.i + offset < this.end ? this.s.charCodeAt(this.i + offset) : -1;}
  at(text: string, from = this.i) {
    if (from + text.length > this.end) return false;
    for (let j = 0; j < text.length; j++) if (this.s.charCodeAt(from + j) !== text.charCodeAt(j)) return false;
    return true;
  }
  text(span: Span) {return this.s.substring(span[0], span[1]);}
  child(span: Span) {return new Chemistry(this.s, this.p, this.depth + 1, span[0], span[1]);}
  inner(span: Span, commaSpace = 6) {return this.child(span).ce(commaSpace);}
  skip() {while (white(this.c())) this.i++;}
  command(): string {
    const start = this.i++;
    if (letter(this.c())) while (letter(this.c())) this.i++;
    else if (this.i < this.end) this.i++;
    return this.text([start, this.i]);
  }
  group(open = 123, close = 125): Span {
    if (this.c() !== open) this.p.error(`Missing ${String.fromCharCode(open)} in mhchem argument`);
    const start = ++this.i;
    let depth = 1, braces = 0;
    while (this.i < this.end) {
      const code = this.c();
      if (code === 92) {this.command(); continue;}
      this.i++;
      if (open !== 123) {
        if (code === 123) braces++;
        if (code === 125) braces--;
        if (braces) continue;
      }
      if (code === open) depth++;
      if (code === close && --depth === 0) return [start, this.i - 1];
    }
    return this.p.error(`Missing ${String.fromCharCode(close)} in mhchem argument`);
  }
  math() {
    const start = ++this.i;
    while (this.i < this.end) {
      if (this.c() === 92) {this.command(); continue;}
      if (this.c() !== 36) {this.i++; continue;}
      const text = this.child([start, this.i++]);
      let out = '', braces = 0;
      while (text.i < text.end) {
        switch (text.c()) {
          case 123: braces++; out += '{'; text.i++; break;
          case 125: braces--; out += '}'; text.i++; break;
          case 92: {
            const cmd = text.command();
            if (cmd === '\\ce' && !braces) {text.skip(); out += text.inner(text.group());}
            else out += cmd;
            break;
          }
          default: out += String.fromCodePoint(text.s.codePointAt(text.i)!); text.i += text.s.codePointAt(text.i)! > 0xffff ? 2 : 1;
        }
      }
      return out + ' ';
    }
    return this.p.error('Unclosed math delimiter in mhchem');
  }
  textGroup(span: Span): string {
    const c = this.child(span);
    let result = '', text = '';
    const flush = () => {if (text) {result += `\\text{${text}}`; text = '';}};
    while (c.i < c.end) {
      if (c.c() === 36) {flush(); result += c.math();}
      else text += c.s[c.i++];
    }
    flush(); return result;
  }
  numeric(span: Span) {
    if (span[0] === span[1]) return false;
    for (let i = span[0]; i < span[1]; i++) if (!digit(this.s.charCodeAt(i))) return false;
    return true;
  }
  oxidation(span: Span) {
    if (span[0] === span[1]) return false;
    for (let i = span[0]; i < span[1]; i++) {
      switch (this.s.charCodeAt(i)) {case 73: case 86: case 88: case 76: case 67: case 68: case 77: break; default: return false;}
    }
    return true;
  }
  scriptValue(span: Span, sup: boolean): string {
    const c = this.child(span);
    let out = '';
    while (c.i < c.end) {
      const code = c.c();
      switch (code) {
        case 36: out += c.math(); continue;
        case 123: out += c.textGroup(c.group()); continue;
        case 40: if (lower(c.c(1))) {out += c.stateGroup(true); continue;} break;
        case 92: {
          const cmd = c.command();
          if (cmd === '\\ce') out += c.inner(c.group());
          else if (cmd === '\\pu') out += '{' + c.child(c.group()).pu() + '}';
          else out += roman(cmd);
          continue;
        }
      }
      if (letter(code)) {
        const from = c.i++;
        while (letter(c.c())) c.i++;
        const word = c.text([from, c.i]);
        out += word === 'x' && sup ? '{\\times}' : word === 'x' || word === 'n' || word === 'e' ? word + ' ' : roman(word);
        continue;
      }
      c.i++;
      switch (code) {
        case 46: out += sup ? '\\mkern1mu \\bullet\\mkern1mu ' : '.'; break;
        case 39: out += '\\prime '; break;
        case 44: out += '{,}\\mkern1mu '; break;
        default: out += String.fromCharCode(code);
      }
    }
    return out;
  }
  script(sup: boolean): {tex: string; numeric: boolean; oxidation: boolean; state: boolean} {
    this.i++;
    let span: Span;
    if (this.c() === 123) span = this.group();
    else if (this.c() === 36) return {tex: this.math(), numeric: false, oxidation: false, state: false};
    else {
      const start = this.i;
      if (this.c() === 92) this.command();
      else if (this.c() === 43 || this.c() === 45) {this.i++; while (digit(this.c())) this.i++;}
      else {
        while (digit(this.c())) this.i++;
        if (this.i === start && letter(this.c())) this.i++;
        switch (this.c()) {
          case 45: if (!letter(this.c(1))) this.i++; break;
          case 43: case 46: case 42: case 39: this.i++;
        }
      }
      if (start === this.i) this.p.error('Missing mhchem script');
      span = [start, this.i];
    }
    return {tex: this.scriptValue(span, sup), numeric: this.numeric(span), oxidation: this.oxidation(span), state: this.s.charCodeAt(span[0]) === 40};
  }
  stateAt(from = this.i, math = false) {
    if (!this.at('(', from)) return false;
    for (const name of ['aq', 's', 'l', 'g', 'cr', 'c']) {
      if (this.at(name, from + 1)) {
        const next = this.s.charCodeAt(from + name.length + 1);
        if (next === 41 || next === 44) return true;
      }
    }
    return math && (this.at('\\ca', from + 1) || this.s.charCodeAt(from + 1) === 36
      && lower(this.s.charCodeAt(from + 2)) && this.s.charCodeAt(from + 3) === 36);
  }
  stateGroup(script = false) {
    return `\\mskip${script ? 1 : 2}mu (${this.inner(this.group(40, 41), 0)})`;
  }
  isotope(top: string, bottom: string) {
    return `${phantom}^{\\flashmathChemHphantom{${top}}}_{\\flashmathChemHphantom{${bottom}}}\\mkern-1.5mu${phantom}^{\\flashmathChemSmash{\\vphantom{2}}\\llap{${top}}}_{\\vphantom{2}\\llap{\\flashmathChemSmash{${bottom}}}}`;
  }
  arrow(): string {
    switch (this.c()) {
      case 60:
        if (this.at('<-->')) return '<-->';
        if (this.at('<=>>')) return '<=>>';
        if (this.at('<<=>')) return '<<=>';
        if (this.at('<=>')) return '<=>';
        if (this.at('<->')) return '<->';
        if (this.at('<-')) return '<-';
        return '';
      case 45: return this.c(1) === 62 ? '->' : '';
      case 0x2192: return '→'; case 0x27f6: return '⟶'; case 0x21cc: return '⇌';
      default: return '';
    }
  }
  ce(commaSpace = 6): string {
    const out: string[] = [];
    let letters = '', entity = Entity.Start, spaced = false, sup = false, hyphen = false;
    const flush = () => {if (letters) {out.push(roman(letters)); letters = '';}};
    const begin = () => {if (spaced && entity === Entity.Body) out.push('~'); spaced = false; entity = Entity.Body;};
    while (this.i < this.end) {
      const code = this.c();
      if (white(code)) {flush(); this.skip(); spaced = true; continue;}
      const arrow = this.arrow();
      if (arrow) {
        flush(); this.i += arrow.length; this.skip();
        let above = '', below = '';
        if (this.c() === 91) above = this.inner(this.group(91, 93));
        if (this.c() === 91) below = this.inner(this.group(91, 93));
        const name = arrows[arrow];
        let a = `\\mhchemlong${name}`;
        if (above || below) {
          switch (name) {
            case 'leftrightarrows': a = `\\mhchemx${name}${below ? `[${below}]` : ''}{${above}}`; break;
            case 'rightleftharpoons': case 'Rightleftharpoons': case 'Leftrightharpoons':
              a = `\\mhchemx${name}{${above}}`;
              if (below) a = `\\underset{\\flashmathChemLower6mu{${below}}}{${a}}`;
              break;
            default: a = `\\mhchemx${name}${below ? `[{${below}}]` : ''}{${above}}`;
          }
        }
        out.push(` {}\\flashmathChemRel{${a}}{} `); entity = Entity.Start; spaced = false; sup = false; continue;
      }
      const phase = (code === 118 || code === 94) && (spaced || entity === Entity.Start)
        && (this.c(1) === -1 || white(this.c(1)));
      if (phase || this.at('(v)') || this.at('(^)')) {
        flush(); const up = code === 94 || this.c(1) === 94;
        this.i += code === 40 ? 3 : 1;
        out.push(` \\${up ? 'uparrow' : 'downarrow'}{} `); entity = Entity.Body; spaced = true; continue;
      }
      switch (code) {
        case 43: case 45: case 61: case 60: case 62:
          if (entity === Entity.Start && (code === 43 || code === 45) && !white(this.c(1))) {
            out.push(`{${String.fromCharCode(code)}}\\,`); this.i++; entity = Entity.Body; continue;
          }
          if (spaced || entity === Entity.Start && code !== 45) {
            flush(); out.push(` {}${String.fromCharCode(code)}{} `); this.i++; spaced = false; entity = Entity.Start; sup = false; continue;
          }
          if (code === 43 || code === 45) {
            flush(); this.i++;
            const next = this.c();
            if (code === 45 && next !== -1 && !white(next) && next !== 41 && next !== 93 && next !== 125 && !this.stateAt()) out.push(hyphen ? '\\text{-}' : '{-}');
            else out.push(`${phantom}^{${String.fromCharCode(code)}}`);
            sup = true; continue;
          }
          if (code === 61) {flush(); out.push('{=}'); this.i++; continue;}
          break;
        case 36:
          flush(); begin(); out.push(this.math()); hyphen = true;
          if (white(this.c())) {this.skip(); if (letter(this.c())) out.push('\\,'); else spaced = true;}
          continue;
        case 123: {
          const span = this.group();
          if (span[0] === span[1] && letters.charCodeAt(0) === 92) {letters += '{}'; continue;}
          flush();
          if (span[0] !== span[1]) {begin(); out.push('{' + this.textGroup(span) + '}');}
          continue;
        }
        case 94: case 95: {
          flush(); spaced = false;
          const up = code === 94, value = this.script(up);
          if (entity === Entity.Start || up && value.numeric && this.c() >= 65 && this.c() <= 90) {
            let top = up ? value.tex : '', bottom = up ? '' : value.tex;
            if (this.c() === (up ? 95 : 94)) {
              const other = this.script(!up);
              if (up) bottom = other.tex; else top = other.tex;
            }
            if (entity !== Entity.Start) out.push('\\mkern2mu');
            out.push(this.isotope(top, bottom)); entity = Entity.Body; sup = false;
          } else {
            out.push((!up && sup ? '' : phantom) + (up ? `^{${value.tex}}` : subscript(value.tex)));
            sup = up && !value.oxidation && !value.state && !this.at('_{(');
            entity = Entity.Body;
          }
          continue;
        }
        case 39: {
          flush(); let value = '';
          while (this.c() === 39) {value += '\\prime '; this.i++;}
          out.push(`${phantom}^{${value}}`); sup = true; continue;
        }
        case 35: flush(); out.push(bonds['#']); this.i++; continue;
        case 42: case 46: flush(); out.push('\\,{\\cdot}\\,'); this.i++; entity = Entity.Start; spaced = false; continue;
        case 44: case 59:
          flush(); out.push(commaSpace ? `{${String.fromCharCode(code)}}\\mkern${commaSpace}mu ` : String.fromCharCode(code));
          this.i++; spaced = false; entity = Entity.Start; continue;
        case 92: {
          const cmd = this.command();
          switch (cmd) {
            case '\\ce': flush(); begin(); this.skip(); out.push(this.inner(this.group())); continue;
            case '\\pu': flush(); begin(); this.skip(); out.push('{' + this.child(this.group()).pu() + '}'); continue;
            case '\\bond': {
              flush(); this.skip(); const bond = this.text(this.group());
              if (!Object.hasOwn(bonds, bond)) this.p.error('mhchem bug T. Please report.');
              out.push(bonds[bond]); continue;
            }
            case '\\ca': flush(); out.push('{\\sim}'); spaced = false; continue;
            case '\\pm': case '\\approx': flush(); out.push(` {}${cmd}{} `); entity = Entity.Start; spaced = false; continue;
            case '\\frac': case '\\overset': case '\\underset': {
              flush(); begin(); this.skip(); const a = this.inner(this.group()); this.skip(); const b = this.inner(this.group());
              out.push(`${cmd}{${a}}{${b}}`); continue;
            }
            case '\\{': case '\\}': flush(); begin(); out.push(cmd); continue;
            case '\\leftarrow': case '\\rightarrow': case '\\leftrightarrow': case '\\rightleftharpoons':
              flush(); out.push(cmd === '\\rightleftharpoons' ? cmd + ' ' : '\\mhchem' + cmd.substring(1) + ' '); this.skip(); spaced = false; continue;
          }
          begin(); letters += cmd;
          if (white(this.c())) {this.skip(); letters += ' ';}
          hyphen = true; continue;
        }
        case 40: {
          flush();
          let j = this.i + 1;
          while (digit(this.s.charCodeAt(j)) && j < this.end) j++;
          if (entity === Entity.Start && j > this.i + 1 && this.s.charCodeAt(j) === 47) {
            j++; const denominator = j;
            while (digit(this.s.charCodeAt(j)) && j < this.end) j++;
            if (j > denominator && this.s.charCodeAt(j) === 41) {
              out.push(this.text([this.i, j + 1]) + '\\,'); this.i = j + 1; this.skip(); entity = Entity.Body; spaced = false; continue;
            }
          }
          if (this.stateAt(this.i, true)) {out.push(this.stateGroup()); spaced = false; entity = Entity.Body; continue;}
          begin(); out.push('('); this.i++; entity = Entity.Start; continue;
        }
        case 41: case 91: case 93:
          flush(); begin(); out.push(String.fromCharCode(code)); this.i++; entity = code === 91 ? Entity.Start : Entity.Body; sup = false; continue;
      }
      if (digit(code)) {
        flush(); const from = this.i++;
        const coefficient = entity === Entity.Start || spaced;
        while (digit(this.c()) || coefficient && (this.c() === 44 || this.c() === 46) && digit(this.c(1))) this.i++;
        let value = this.decimal([from, this.i]);
        if (coefficient) {
          begin();
          if (this.c() === 47 && digit(this.c(1))) {
            const numerator = value, from = ++this.i;
            while (digit(this.c())) this.i++;
            value = `\\flashmathChemFraction{${numerator}}{${this.text([from, this.i])}}`;
          }
          out.push(value); this.skip();
          const orbital = lower(this.c()) && this.c(1) === 94;
          if (orbital) hyphen = true;
          if ((letter(this.c()) || this.c() === 36 || this.c() === 92) && !orbital) out.push('\\,');
        } else out.push(phantom + subscript(value));
        sup = false; continue;
      }
      if (letter(code)) {
        if (entity === Entity.Start && (code === 120 || code === 110) && (white(this.c(1)) || this.c(1) === 45)) {
          flush(); out.push(String.fromCharCode(code)); this.i++; this.skip();
          out.push(this.c() !== 45 ? '\\,' : ' '); entity = Entity.Body; spaced = false; hyphen = true; continue;
        }
        begin(); letters += String.fromCharCode(code); this.i++; sup = false; continue;
      }
      flush(); begin(); out.push(String.fromCharCode(code)); this.i++;
    }
    flush(); return out.join('');
  }
  decimal(span: Span, group = false) {
    let separator = span[1];
    for (let i = span[0]; i < span[1]; i++) if (this.s.charCodeAt(i) === 44 || this.s.charCodeAt(i) === 46) {separator = i; break;}
    let out = '', digits = separator - span[0];
    if (this.s.charCodeAt(span[0]) === 43 || this.s.charCodeAt(span[0]) === 45) digits--;
    for (let i = span[0]; i < span[1]; i++) {
      const code = this.s.charCodeAt(i);
      if (group && digit(code)) {
        const integerRemaining = separator - i;
        const decimalIndex = i - separator - 1;
        if (i > span[0] && i < separator && digits > 4 && integerRemaining % 3 === 0
          || i > separator && span[1] - separator - 1 > 4 && decimalIndex > 0 && decimalIndex % 3 === 0) out += '\\mkern2mu ';
      }
      out += code === 44 ? '{,}' : String.fromCharCode(code);
    }
    return out;
  }
  unitBody(span: Span): {tex: string; terms: number} {
    const c = this.child(span);
    let out = '', word = '', terms = 0;
    const flush = () => {if (word) {out += roman(word); word = ''; terms++;}};
    while (c.i < c.end) {
      const code = c.c();
      switch (code) {
        case 32: case 9: case 10: case 13:
          flush(); c.skip(); if (c.i < c.end) {out += '\\mkern3mu '; terms++;} continue;
        case 42: flush(); out += '\\mkern1mu{\\cdot}\\mkern1mu '; terms++; c.i++; c.skip(); continue;
        case 92:
          word += c.command();
          if (white(c.c())) {word += ' '; c.skip();}
          continue;
        case 123: {
          const body = c.group();
          const inner = c.unitBody(body);
          flush(); out += inner.tex; terms += inner.terms;
          continue;
        }
        case 176: word += '{}^{\\circ}'; c.i++; continue;
        case 94:
          c.i++;
          if (c.c() === 111 && (c.c(1) === 67 || c.c(1) === 70)) {word += '{}^{\\circ}'; c.i++; continue;}
          if (c.at('{o}') && (c.c(3) === 67 || c.c(3) === 70)) {word += '{}^{\\circ}'; c.i += 3; continue;}
          if (c.c() === 123) {word += `^{${c.text(c.group())}}`; continue;}
          {
            const from = c.i;
            if (c.c() === 45 || c.c() === 43) c.i++;
            while (digit(c.c()) || (c.c() === 44 || c.c() === 46) && digit(c.c(1))) c.i++;
            if (c.i === from && c.i < c.end) c.i++;
            word += `^{${c.decimal([from, c.i])}}`; continue;
          }
      }
      if ((digit(code) || code === 45 || code === 43) && word) {
        const from = c.i++;
        while (digit(c.c()) || (c.c() === 44 || c.c() === 46) && digit(c.c(1))) c.i++;
        word += `^{${c.decimal([from, c.i])}}`; continue;
      }
      word += String.fromCharCode(code); c.i++;
    }
    flush(); return {tex: out, terms};
  }
  pu(): string {
    this.skip();
    let out = '';
    const from = this.i;
    if (this.c() === 43 || this.c() === 45) this.i++;
    const numberStart = this.i;
    while (digit(this.c()) || (this.c() === 44 || this.c() === 46) && digit(this.c(1))) this.i++;
    if (this.i > numberStart) {
      out = this.decimal([from, this.i], true);
      if (this.c() === 40) {
        const uncertainty = this.i;
        this.group(40, 41); out += this.text([uncertainty, this.i]);
      }
      if (this.c() === 101 || this.c() === 69) {
        const times = this.c() === 69; this.i++;
        const start = this.i;
        if (this.c() === 43 || this.c() === 45) this.i++;
        while (digit(this.c())) this.i++;
        out += `\\${times ? 'times' : 'cdot'} 10^{${this.text([start, this.i])}}`;
      } else {
        this.skip();
        const exponent = this.c(1);
        const numericPower = digit(exponent) || exponent === 43 || exponent === 45
          || exponent === 123 && (digit(this.c(2)) || this.c(2) === 43 || this.c(2) === 45);
        if (this.c() === 94 && numericPower) {
          this.i++;
          if (this.c() === 123) out += `^{${this.text(this.group())}}`;
          else {const start = this.i; if (this.c() === 43 || this.c() === 45) this.i++; while (digit(this.c())) this.i++; out += `^{${this.text([start, this.i])}}`;}
        } else if ((this.c() === 120 || this.c() === 42) && white(this.c(1))) {
          const times = this.c() === 120; this.i++; this.skip();
          if (this.at('10^')) {
            this.i += 3;
            let exponent: string;
            if (this.c() === 123) exponent = '{' + this.text(this.group()) + '}';
            else {const start = this.i; if (this.c() === 43 || this.c() === 45) this.i++; while (digit(this.c())) this.i++; exponent = this.text([start, this.i]);}
            out += `\\${times ? 'times' : 'cdot'} 10^{${exponent}}`;
          }
        }
      }
      this.skip(); if (this.i < this.end) out += '~';
    } else this.i = from;
    let end = this.end;
    while (end > this.i && white(this.s.charCodeAt(end - 1))) end--;
    let braces = 0, slash = -1;
    for (let i = this.i; i < end; i++) {
      switch (this.s.charCodeAt(i)) {
        case 92: i++; while (letter(this.s.charCodeAt(i + 1))) i++; break;
        case 123: braces++; break; case 125: braces--; break;
        case 47: if (!braces && i > this.i) slash = i; break;
      }
      if (slash >= 0) break;
    }
    const trim = (span: Span): Span => {
      let [a,b] = span; while (a < b && white(this.s.charCodeAt(a))) a++; while (b > a && white(this.s.charCodeAt(b - 1))) b--; return [a,b];
    };
    if (slash >= 0) {
      const fraction = this.s.charCodeAt(slash + 1) === 47;
      const numerator = this.unitBody(trim([this.i, slash]));
      const denominator = this.unitBody(trim([slash + (fraction ? 2 : 1), end]));
      if (fraction) return out + `\\flashmathChemFraction{${numerator.tex}}{${denominator.tex}}`;
      return out + numerator.tex + (numerator.terms > 1 || denominator.terms > 1 ? '\\,/\\,' : '/') + denominator.tex;
    }
    return out + this.unitBody([this.i, end]).tex;
  }
}
const inferred = (n: Node) => n.kind === K.mrow && !n.attributes['data-mjx-texclass'] ? n.children : [n];
function expand(p: Parser, tex: string) {
  if (!tex) return;
  p.stream.push(scan('{' + tex + '}', p.options.maxTokens ?? 200000));
}
const commands: Record<string, TexCommand> = {
  ce: {execute(p) {expand(p, new Chemistry(raw(p.tokensArgument('\\ce')), p).ce());}},
  pu: {execute(p) {expand(p, new Chemistry(raw(p.tokensArgument('\\pu')), p).pu());}},
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
    const positive = amount.charCodeAt(0) === 45 ? amount.substring(1) : '-' + amount;
    const negative = positive.charCodeAt(0) === 45 ? '+' + positive.substring(1) : '-' + positive;
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
