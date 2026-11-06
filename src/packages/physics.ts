/** MathJax 4.1.3 physics syntax, executed on flashmath's token/frame stack.
 * Copyright (c) 2018-2026 The MathJax Consortium.
 * Expansion rules adapted from PhysicsMethods/PhysicsMappings (Apache-2.0;
 * see src/LICENSE.MathJax and src/ATTRIBUTION.MathJax). */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw, scan, spelling} from '../scanner.js';
import type {Token} from '../scanner.js';
import type {TexPackage, TexCommand} from './types.js';
import {operator} from '../mathml.js';

const commands: Record<string, TexCommand> = {};
const next = (p: Parser) => { p.stream.skip(); return p.stream.peek(); };
const peek = (p: Parser) => { const t = next(p); return t ? (t[0] === -1 ? '\\' : '') + spelling(t) : ''; };
const star = (p: Parser) => { if (peek(p) !== '*') return false; p.stream.next(); return true; };
const arg = (p: Parser, name: string) => raw(p.tokensArgument('\\' + name));
const optional = (p: Parser) => { const t = p.optional(); return t === null ? null : raw(t); };
const children = (n: Node) => n.kind === K.mrow && n.inferred ? n.children : [n];
const insert = (p: Parser, tex: string) => {
  if (++p.expansions > (p.options.maxExpansions ?? 10000)) p.error('Macro expansion limit exceeded');
  p.stream.push(scan(tex, p.options.maxTokens ?? 200000));
};
const emit = (p: Parser, n: Node) => { for (const c of children(n)) p.append(c); };
const parsed = (p: Parser, tex: string, done: (n: Node) => void = n => emit(p, n)) =>
  p.parseTokens(scan(tex, p.options.maxTokens ?? 200000), done);
function define(names: string, fn: (p: Parser, name: string) => void) {
  for (const name of names.split(' ')) commands[name] = {execute: p => fn(p, name)};
}
function macro(names: string, body: string, count = 0) {
  define(names, (p, name) => {
    const args = Array.from({length: count}, () => p.tokensArgument('\\' + name));
    p.stream.push(p.substitute({body: scan(body), count, optional: null, prefix: [], delimiters: []}, args));
  });
}
const pairs: Record<string, string> = {'(': ')', '[': ']', '|': '|', '{': '}'};
const sizes: Record<string, string> = {big: '1.2em', Big: '1.623em', bigg: '2.047em', Bigg: '2.470em'};
function big(p: Parser): string {
  const t = next(p);
  if (t?.[0] === -1 && Object.hasOwn(sizes, spelling(t))) { p.stream.next(); return spelling(t); }
  return '';
}
function fenced(open: string, close: string, body: string, fixed = false, size = '') {
  return fixed ? `${open} ${body} ${close}` : size
    ? `\\${size}l${open} ${body} \\${size}r${close}`
    : `\\left${open} ${body} \\right${close}`;
}
type AutoFrame = Parser['f'] & {physicsAuto?: {open: string; close: string; count: number}};
function automatic(p: Parser, open: string, close: string, size = '', smash = false, evalRight = false, ignore = false) {
  p.frame(-6, false, nodes => {
    if (ignore) return;
    if (smash) nodes = [p.atom([p.node(K.mpadded, nodes, '', {height: '0', depth: '0'})])];
    const emit = () => {
      const fence = (text: string, cls: string) => size
        ? p.atom([p.delimiterNode(text, sizes[size])], cls) : p.delimiterNode(text, '', cls);
      p.append(p.row([fence(open, 'OPEN'), ...nodes, fence(close, 'CLOSE')], true));
    };
    if (evalRight) parsed(p, '\\vphantom{\\int}', n => { nodes.push(n); emit(); });
    else emit();
  });
  (p.f as AutoFrame).physicsAuto = {open, close, count: 0};
  p.f.missingMessage = 'Extra open or missing close delimiter';
}
function autoCharacter(p: Parser, t: Token): boolean {
  const a = (p.f as AutoFrame).physicsAuto, text = String.fromCharCode(t[0]);
  if (!a) return false;
  if (text === a.close && a.count-- === 0) { p.close(); return true; }
  if (text === a.open) a.count++;
  return false;
}

define('quantity qty pqty bqty vqty Bqty absolutevalue abs norm order', (p, name) => {
  const fixedArg = !['quantity', 'qty'].includes(name), fixed = fixedArg && star(p);
  const size = big(p), left = peek(p);
  const [open, close] = name === 'bqty' ? ['[', ']'] : name === 'Bqty' ? ['\\{', '\\}']
    : ['vqty', 'absolutevalue', 'abs'].includes(name) ? ['|', '|'] : name === 'norm' ? ['\\|', '\\|'] : ['(', ')'];
  if (fixedArg && left !== '{') p.error(`Missing argument for \\${name}`);
  if (!pairs[left]) {
    p.append(p.atom([p.delimiterNode('(', '', 'OPEN'), p.row([]),
      p.delimiterNode(')', '', 'CLOSE')], 'INNER'));
    return;
  }
  if (name === 'order') {
    const n = p.node(K.mi, [], 'O', {mathvariant: '-tex-calligraphic', 'data-mjx-texclass': 'OP'}); n.op = 2; p.append(n);
  }
  if (left === '{') {
    const l = fixedArg ? open : '\\{', r = fixedArg ? close : '\\}';
    // Consume the argument on the existing frame stack. Reading it as raw TeX
    // and re-scanning at every depth makes nested quantities quadratic.
    p.argument(n => {
      const body = children(n);
      if (fixed) {
        parsed(p, l, a => parsed(p, r, b => {
          p.append(a); for (const item of body) p.append(item); p.append(b);
        }));
      } else if (size) {
        const fence = (text: string, cls: string) => p.atom([
          p.delimiterNode(text.charCodeAt(0) === 92 ? text === '\\|' ? '‖' : text[1] : text, sizes[size]),
        ], cls);
        p.append(fence(l, 'OPEN')); for (const item of body) p.append(item); p.append(fence(r, 'CLOSE'));
      } else {
        const delim = (text: string) => text === '\\|' ? '‖' : text.charCodeAt(0) === 92 ? text[1] : text;
        p.append(p.atom([p.delimiterNode(delim(l), '', 'OPEN'), ...body,
          p.delimiterNode(delim(r), '', 'CLOSE')], 'INNER'));
      }
    }, false, '\\' + name);
  } else { p.stream.next(); automatic(p, left, pairs[left], size); }
});
define('evaluated eval', (p, name) => {
  const fixed = star(p), left = peek(p);
  if (left === '(' || left === '[') { p.stream.next(); automatic(p, left, '|', '', fixed, true); }
  else {
    const body = left === '{' ? arg(p, name) : '';
    insert(p, `\\left.${fixed ? `\\smash{${body}}` : body}\\vphantom{\\int}\\right|`);
  }
});
define('commutator comm anticommutator acomm poissonbracket pb', (p, name) => {
  const fixed = star(p), size = big(p);
  if (peek(p) !== '{') p.error(`Missing argument for \\${name}`);
  const a = arg(p, name), b = arg(p, name), braces = !['comm', 'commutator'].includes(name);
  parsed(p, fenced(braces ? '\\{' : '[', braces ? '\\}' : ']', a + ',' + b, fixed, size));
});

define('vectorbold vb', (p, name) => {
  const fixed = star(p), tokens = p.tokensArgument('\\' + name);
  p.parseTokens(tokens, n => emit(p, n));
  p.f.font = '';
  p.f.tokenTransform = n => {
    const c = n.text.codePointAt(0) ?? 0;
    if (n.text.length === 1 && !p.f.font && (c >= 65 && c <= 90 || c >= 97 && c <= 122 ||
      c >= 0x391 && c <= 0x3a9 || c >= 48 && c <= 57 || fixed && c >= 0x3b1 && c <= 0x3c9 || n.kind === K.mo && operator(n.text)?.[3]?.accent))
      n.attributes.mathvariant = fixed ? 'bold-italic' : 'bold';
  };
});
define('vectorarrow va vectorunit vu', (p, name) => {
  const fixed = star(p), body = arg(p, name), accent = ['va', 'vectorarrow'].includes(name) ? 'vec' : 'hat';
  insert(p, `\\${accent}{\\vb${fixed ? '*' : ''}{${body}}}`);
});
for (const [names, text, attrs] of [
  ['dotproduct vdot', '⋅', {mathvariant: 'bold'}], ['crossproduct cross cp', '×', {}],
  ['gradientnabla', '∇', {mathvariant: 'bold'}], ['divsymbol divisionsymbol', '÷', {}],
] as const) define(names, p => { const n = p.node(K.mo, [], text, {...attrs}); n.fixed = true; p.append(n); });
define('real imaginary', (p, name) => p.append(p.node(K.mi, [], name === 'real' ? 'ℜ' : 'ℑ', {mathvariant: 'normal'})));
define('vnabla', p => parsed(p, (p.options.texOptions?.physics as {arrowdel?: boolean})?.arrowdel ? '\\vec{\\gradientnabla}' : '{\\gradientnabla}'));
define('diffd', p => parsed(p, (p.options.texOptions?.physics as {italicdiff?: boolean})?.italicdiff ? 'd' : '{\\rm d}'));
function application(p: Parser, op: string, fences: string[], fn: boolean, name: string) {
  parsed(p, op, n => {
    const nodes = children(n);
    if (fn && nodes.length) nodes[nodes.length - 1].op = 2;
    emit(p, n);
    const left = peek(p);
    if (!pairs[left]) return;
    if (left === '{') {
      const body = arg(p, name);
      insert(p, fences.includes(left) ? fenced('\\{', '\\}', body) : ' ' + body + ' ');
    } else if (fences.includes(left)) { p.stream.next(); automatic(p, left, pairs[left]); }
  });
}
define('gradient grad divergence div curl laplacian Res principalvalue pv PV Re Im', (p, name) => {
  const op = ['gradient', 'grad', 'divergence', 'div', 'curl'].includes(name) ? '\\vnabla' +
    (['divergence', 'div'].includes(name) ? '\\vdot' : name === 'curl' ? '\\crossproduct' : '')
    : name === 'laplacian' ? '\\nabla^2' : name === 'Res' ? '\\Residue'
    : ['pv', 'principalvalue'].includes(name) ? '{\\cal P}' : name === 'PV' ? '{\\rm P.V.}' : `\\mathrm{${name}}`;
  application(p, op, ['Re', 'Im'].includes(name) ? ['{'] : name === 'Res' ? ['(', '[', '{'] : ['principalvalue', 'pv', 'PV'].includes(name) ? [] : ['(', '['],
    !['divergence', 'div', 'curl'].includes(name), name);
});
macro('Residue', '\\mathrm{Res}');
const trig = 'sin sinh arcsin asin cos cosh arccos acos tan tanh arctan atan csc csch arccsc acsc sec sech arcsec asec cot coth arccot acot log ln';
const poweredFunctions = new Set(trig.split(' '));
define(trig + ' exp det Pr tr trace Tr Trace erf', (p, name) => {
  const exp = poweredFunctions.has(name) ? optional(p) : null;
  const fn = p.node(K.mi, [], name === 'trace' ? 'tr' : name === 'Trace' ? 'Tr' : name);
  const emit = (n: Node) => {
    n.op = 2; p.append(n);
    if (peek(p) === '(') { p.stream.next(); automatic(p, '(', ')'); }
  };
  if (exp) parsed(p, exp, n => emit(p.node(K.msup, [fn, n]))); else emit(fn);
});
for (const [name, text] of Object.entries({sine: 'sin', hypsine: 'sinh', arcsine: 'arcsin', asine: 'asin',
  cosine: 'cos', hypcosine: 'cosh', arccosine: 'arccos', acosine: 'acos', tangent: 'tan', hyptangent: 'tanh',
  arctangent: 'arctan', atangent: 'atan', cosecant: 'csc', hypcosecant: 'csch', arccosecant: 'arccsc',
  acosecant: 'acsc', secant: 'sec', hypsecant: 'sech', arcsecant: 'arcsec', asecant: 'asec', cotangent: 'cot',
  hypcotangent: 'coth', arccotangent: 'arccot', acotangent: 'acot', exponential: 'exp', logarithm: 'log',
  naturallogarithm: 'ln', determinant: 'det', Probability: 'Pr', rank: 'rank'}))
  define(name, p => { const n = p.node(K.mi, [], text); n.op = 1; p.append(n); });

define('qqtext qq qcomma qc qcc qif qthen qelse qotherwise qunless qgiven qusing qassume qsince qlet qfor qall qeven qodd qinteger qand qor qas qin', (p, name) => {
  const fixed = star(p), text = ['qqtext', 'qq'].includes(name) ? arg(p, name) : ['qc', 'qcomma'].includes(name) ? ',' : name === 'qcc' ? 'c.c.' : name.slice(1);
  insert(p, (fixed || ['qc', 'qcomma'].includes(name) ? '' : '\\quad') + `\\text{${text}}\\quad `);
});
macro('flatfrac', '\\left.#1\\middle/#2\\right.', 2);
define('differential dd variation var', (p, name) => {
  const op = ['differential', 'dd'].includes(name) ? '\\diffd' : '\\delta';
  const opt = optional(p), power = opt === null ? ' ' : `^{${opt}}`, left = peek(p);
  if (left === '{') parsed(p, op + power + arg(p, name), n => p.append(p.atom(children(n), 'OP')));
  else if (left === '(') {
    p.stream.next(); parsed(p, op + power, n => { p.append(n); automatic(p, '(', ')'); });
  } else parsed(p, op + power + (next(p) && !['}', ')', ']'].includes(peek(p)) ? arg(p, name) : ''));
});
define('derivative dv partialderivative pderivative pdv functionalderivative fderivative fdv', (p, name) => {
  const fixed = star(p), opt = optional(p), partial = ['partialderivative', 'pderivative', 'pdv'].includes(name);
  const op = partial ? '\\partial' : ['derivative', 'dv'].includes(name) ? '\\diffd' : '\\delta';
  const args = [arg(p, name)], max = partial ? 3 : 2;
  while (args.length < max && peek(p) === '{') args.push(arg(p, name));
  const power1 = partial && args.length > 2 ? '^{2}' : opt !== null ? `^{${opt}}` : ' ';
  const power2 = partial && args.length > 2 ? ' ' : power1;
  const first = args.length > 1 ? args[0] : '', second = args.length > 1 ? args[1] : args[0];
  const rest = args.slice(2).map(a => op + ' ' + a).join('');
  parsed(p, `${fixed ? '\\flatfrac' : '\\frac'}{${op}${power1}${first}}{${op} ${second}${power2} ${rest}}`, n => {
    p.append(n);
    if (peek(p) === '(') { p.stream.next(); automatic(p, '(', ')', '', false, false, partial && (args.length > 2 || opt !== null && args.length > 1)); }
  });
});

function outputBraket(a: string, b: string, c: string, one: boolean, two: boolean) {
  return one && two ? `\\left\\langle{${a}}\\middle\\vert{${b}}\\middle\\vert{${c}}\\right\\rangle`
    : one ? `\\langle{${a}}\\vert{${b}}\\vert{${c}}\\rangle`
    : `\\left\\langle{${a}}\\right\\vert{${b}}\\left\\vert{${c}}\\right\\rangle`;
}
// These arguments remain on the parser's frame stack: nested kets and
// bra/inner/outer products never reconstruct and scan their complete bodies.
function groupedArgument(p:Parser,name:string,done:(n:Node)=>void) {
  p.argument(n=>done(p.atom(children(n))),false,'\\'+name);
}
function fixedFence(p:Parser,text:string) {
  return p.node(K.mo,[],text,{fence:'false',stretchy:'false',...('|‖'.includes(text)?{'data-mjx-texclass':'ORD'}:{})});
}
function braketNodes(p:Parser,left:string,right:string,bodies:Node[],fixed:boolean,outer=false) {
  const nodes:Node[]=[fixed?fixedFence(p,left):p.delimiterNode(left,'','OPEN'),bodies[0]];
  if(bodies.length>1){
    const middle=(text:string)=>{
      if(!fixed)nodes.push(p.atom([],'CLOSE'));
      nodes.push(fixed?fixedFence(p,text):p.node(K.mo,[],text,text==='|'?{stretchy:'true',symmetric:'true'}:{}));
      if(!fixed)nodes.push(p.atom([],'OPEN'));
    };
    if(outer){middle('⟩');nodes.push(p.node(K.mspace,[],'',{width:'-0.167em'}));middle('⟨');}
    else middle('|');
    nodes.push(bodies[1]);
  }
  nodes.push(fixed?fixedFence(p,right):p.delimiterNode(right,'','CLOSE'));
  if(fixed)for(const n of nodes)p.append(n);else p.append(p.atom(nodes,'INNER'));
}
function copyArgument(p:Parser,node:Node):Node {
  const copy=(n:Node)=>Object.assign(p.node(n.kind),n,{attributes:{...n.attributes},children:[] as Node[]});
  const root=copy(node),stack:[Node,Node][]=[[node,root]];
  while(stack.length){const [source,target]=stack.pop()!;for(const n of source.children){
    const child=p.node(n.kind,[],n.text,{...n.attributes},n.start);Object.assign(child,n,{children:[],attributes:{...n.attributes}});
    target.children.push(child);stack.push([n,child]);
  }}
  return root;
}
define('ket',(p,name)=>{const fixed=star(p);groupedArgument(p,name,n=>braketNodes(p,'|','⟩',[n],fixed));});
define('bra',(p,name)=>{
  const fixed=star(p);
  groupedArgument(p,name,body=>{
    const t=next(p),alias=t?.[0]===-1?p.macros.get(spelling(t)):undefined;
    const ketAlias=alias?.body.length===1&&alias.body[0][0]===-3&&spelling(alias.body[0])==='ket';
    if(peek(p)==='\\ket'||ketAlias){
      p.stream.next();const ketStar=star(p);
      if(peek(p)==='{')groupedArgument(p,name,right=>braketNodes(p,'⟨','⟩',[body,right],fixed||ketStar));
      else {if(ketStar)insert(p,'*');braketNodes(p,'⟨','⟩',[body,p.atom([])],fixed);}
    }else{braketNodes(p,'⟨','|',[body],fixed);if(!fixed)p.append(p.atom([]));}
  });
});
define('innerproduct ip braket outerproduct dyad ketbra op',(p,name)=>{
  const fixed=star(p),outer=['outerproduct','dyad','ketbra','op'].includes(name);
  groupedArgument(p,name,a=>{
    const done=(b:Node)=>braketNodes(p,outer?'|':'⟨',outer?'|':'⟩',[a,b],fixed,outer);
    if(peek(p)==='{')groupedArgument(p,name,done);else done(copyArgument(p,a));
  });
});
define('expectationvalue expval ev matrixelement matrixel mel', (p, name) => {
  const one = star(p), two = one && star(p), a = arg(p, name);
  let expansion: string;
  if (['matrixelement', 'matrixel', 'mel'].includes(name)) expansion = outputBraket(a, arg(p, name), arg(p, name), one, two);
  else {
    const b = peek(p) === '{' ? arg(p, name) : null;
    expansion = a && b ? outputBraket(b, a, b, one, two) : one ? `\\langle {${a}} \\rangle` : `\\left\\langle {${a}} \\right\\rangle`;
  }
  parsed(p, expansion);
});

function upTo(p: Parser, close: string, name: string): string {
  const tokens: Token[] = []; let depth = 0;
  for (;;) {
    const t = p.stream.next();
    if (!t) p.error(`Could not find ${close} for \\${name}`);
    if (!depth && t[0] !== -1 && spelling(t) === close) return raw(tokens);
    if (t[0] === 123) depth++;
    if (t[0] === 125) depth--;
    tokens.push(t);
  }
}
define('matrixquantity mqty smallmatrixquantity smqty', (p, name) => {
  const fixed = star(p), left = peek(p), small = ['smallmatrixquantity', 'smqty'].includes(name);
  let body = '', open = '', close = '';
  if (left === '{') body = arg(p, name);
  else if (['(', '[', '|'].includes(left)) {
    p.stream.next(); body = upTo(p, pairs[left], name);
    open = left === '(' && fixed ? '\\lgroup' : left;
    close = left === '(' && fixed ? '\\rgroup' : pairs[left];
  } else { open = '('; close = ')'; }
  parsed(p, (open ? '\\left' + open : '') + `\\begin{${small ? 'smallmatrix' : 'array'}}{} ${body}\\end{${small ? 'smallmatrix' : 'array'}}` + (close ? '\\right' + close : ''), n => {
    const pending = [n];
    while (pending.length) {
      const item = pending.pop()!;
      if (item.kind === K.mtable && Object.hasOwn(item.attributes, 'data-frame-styles')) item.attributes.columnalign ??= '';
      pending.push(...item.children);
    }
    emit(p, n);
  });
});
for (const [name, body] of Object.entries({pmqty: '\\mqty(#1)', Pmqty: '\\mqty*(#1)', bmqty: '\\mqty[#1]', vmqty: '\\mqty|#1|',
  spmqty: '\\smqty(#1)', sPmqty: '\\smqty*(#1)', sbmqty: '\\smqty[#1]', svmqty: '\\smqty|#1|',
  matrixdeterminant: '\\vmqty{#1}', mdet: '\\vmqty{#1}', smdet: '\\svmqty{#1}'})) macro(name, body, 1);
function matrixLimit(p: Parser, n: number, m: number) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(m) || n * m > (p.options.maxNodes ?? 100000)) p.error('Node limit exceeded');
}
define('identitymatrix imat', (p, name) => {
  const size = parseInt(arg(p, name), 10);
  if (Number.isNaN(size)) p.error('Invalid number');
  matrixLimit(p, Math.max(size, 1), Math.max(size, 1));
  insert(p, size <= 1 ? '1' : Array.from({length: size}, (_, i) => Array.from({length: size}, (_, j) => i === j ? '1' : '0').join(' & ')).join('\\\\ '));
});
define('xmatrix xmat', (p, name) => {
  const fixed = star(p), a = arg(p, name), b = arg(p, name), c = arg(p, name);
  let n = parseInt(b, 10), m = parseInt(c, 10);
  if (String(n) !== b || String(m) !== c || Number.isNaN(n) || Number.isNaN(m)) p.error('Invalid number');
  n = Math.max(1, n); m = Math.max(1, m); matrixLimit(p, n, m);
  insert(p, Array.from({length: n}, (_, i) => Array.from({length: m}, (_, j) => !fixed || n === 1 && m === 1 ? a
    : n === 1 ? `${a}_{${j + 1}}` : m === 1 ? `${a}_{${i + 1}}` : `${a}_{{${i + 1}}{${j + 1}}}`).join(' & ')).join('\\\\ '));
});
macro('zeromatrix zmat', '\\xmat{0}{#1}{#2}', 2);
define('paulimatrix pmat', (p, name) => {
  const a = arg(p, name), rows: Record<string, string> = {'0': '1 & 0\\\\0 & 1', '1': '0 & 1\\\\1 & 0',
    x: '0 & 1\\\\1 & 0', '2': '0 & -i\\\\i & 0', y: '0 & -i\\\\i & 0', '3': '1 & 0\\\\0 & -1', z: '1 & 0\\\\0 & -1'};
  insert(p, a.slice(1) + ' ' + (rows[a[0]] ?? ''));
});
define('diagonalmatrix dmat antidiagonalmatrix admat', (p, name) => {
  if (peek(p) !== '{') return;
  const tokens = p.tokensArgument('\\' + name), elements: Token[][] = [[]]; let depth = 0;
  for (const t of tokens) {
    if (t[0] === 123) depth++;
    if (t[0] === 125) depth--;
    if (t[0] === 44 && !depth) elements.push([]); else elements.at(-1)!.push(t);
  }
  const anti = ['antidiagonalmatrix', 'admat'].includes(name);
  insert(p, elements.map((e, i) => '&'.repeat(anti ? elements.length - i - 1 : i) + `\\mqty{${raw(e)}}`).join('\\\\ '));
});

for (const char of ['(', ')', '[', ']', '|']) commands['@physics-character:' + char] = {
  type: 'character', char, execute: autoCharacter,
};

export default {name: 'physics', commands, environments: {smallmatrix: {begin(p, name) {
  p.tableStart(name, 'c', -4, n => {
    n.attributes.columnspacing = '0.333em'; n.attributes.rowspacing = '.2em';
    n.attributes['data-mjx-smallmatrix'] = 'true';
    delete n.attributes.displaystyle;
    p.append(p.node(K.mstyle, [n], '', {scriptlevel: '1'}));
  });
  p.f.level = 1;
}}},
  options: ['physics'], configurationModules: ['input/tex/physics/PhysicsConfiguration.js']} satisfies TexPackage;
