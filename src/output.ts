import type {MathMLNode, OutputOptions} from './ast.js';
import {packageMark} from './package-mark.js';

// MathJax's mhchem glyph slots belong to its own font. Native MathML uses
// standard Unicode and MathML accents instead; see docs/packages-pkg-chem.md.
function glyph(code: number): string {
  switch (code) {
    case 0xe408: return '\u21cc';
    case 0xe410: return '\u2504';
    case 0xe428: return '\u27f5'; case 0xe429: return '\u27f6';
    case 0xe42a: return '\u27f7'; case 0xe42b: return '\u21c6';
    case 0xe42c: return '\u2190'; case 0xe42d: return '\u2192'; case 0xe42e: return '\u2194';
    default: return '';
  }
}
function compound(code: number) {
  return code === 0xe409 || code === 0xe40a || code >= 0xe411 && code <= 0xe413;
}
function codeOf(n: MathMLNode) {
  return packageMark(n)==='glyph' && n.kind === 'mo' && n.text.length === 1 ? n.text.charCodeAt(0) : 0;
}
function arrowLabel(n: MathMLNode) {
  if (packageMark(n)!=='arrow-label' || n.kind !== 'mpadded' || n.children.at(-1)?.kind !== 'mspace') return false;
  const a = n.attributes, strut = n.children.at(-1)!.attributes;
  return a.voffset === '-.2em' && a.height === '-.2em' && strut.depth === '.2em'
    || a.voffset === '.15em' && a.depth === '-.15em' && strut.height === '.75em';
}
function nativeGlyph(n: MathMLNode): MathMLNode {
  const code = codeOf(n), text = glyph(code);
  const attributes = {...n.attributes};
  delete attributes['data-mjx-variant'];
  if (text) return {...n, text, attributes, children: []};
  const token = (text: string, small = false): MathMLNode => ({
    kind: 'mo', text, start: n.start, children: [],
    attributes: small ? {stretchy: 'false', mathsize: '70%'} : {stretchy: 'true'},
  });
  const accent = (base: MathMLNode, over: MathMLNode, under = false): MathMLNode => ({
    kind: under ? 'munder' : 'mover', text: '', start: n.start,
    attributes: {[under ? 'accentunder' : 'accent']: 'true'}, children: [base, over],
  });
  let result: MathMLNode;
  switch (code) {
    case 0xe409: result = accent(token('⇀'), token('↽', true), true); break;
    case 0xe40a: result = accent(token('↽'), token('⇀', true)); break;
    case 0xe411: result = accent(token('−'), token('┄')); break;
    case 0xe412: result = accent(token('='), token('┄')); break;
    default: result = accent(accent(token('┄'), token('−')), token('−'), true);
  }
  delete attributes.stretchy; // This attribute belongs to mo, not an accent row.
  result.attributes = {...attributes, ...result.attributes};
  return result;
}

/** Select glyph output without mutating the caller's AST. MathJax mode preserves
 * the supplied codes; native mode maps mhchem's private-use font slots. */
export function mathMLForOutput(root: MathMLNode, options: OutputOptions = {}): MathMLNode {
  const mode = options.output === undefined ? 'native' : options.output;
  if (mode !== 'native' && mode !== 'mathjax') throw new TypeError('output must be native or mathjax');
  if (mode === 'mathjax') return root;
  const pending = [root];
  let found = false;
  while (pending.length) {
    const node = pending.pop()!, code = codeOf(node);
    if (glyph(code) || compound(code) || arrowLabel(node) || packageMark(node)==='prescript') {found = true; break;}
    for (const child of node.children) pending.push(child);
  }
  if (!found) return root;
  // Browser under/over layout determines the arrow's width from its labels.
  // MathJax's relative mpadded dimensions and struts belong to its own renderer.
  const copy = (n: MathMLNode): MathMLNode => arrowLabel(n)
    ? {...n, kind: 'mrow', attributes: {}, children: []}
    : {...n, attributes: {...n.attributes}, children: []};
  const result = copy(root), stack: [MathMLNode, MathMLNode][] = [[root, result]];
  while (stack.length) {
    const [input, output] = stack.pop()!;
    const length = input.children.length - (arrowLabel(input) ? 1 : 0);
    for (let i = 0; i < length; i++) {
      const child = input.children[i];
      if(packageMark(child)==='prescript' && input.children[i+3]) {
        const script=(which:number):MathMLNode=>{
          const stack=[child.children[which]];
          while(stack.length){const n=stack.pop();if(!n)continue;
            if(n.kind==='mphantom')return {kind:n.children.length?'mrow':'none',attributes:{},children:n.children,text:'',start:child.start};
            for(const c of n.children)stack.push(c);
          }
          return {kind:'none',attributes:{},children:[],text:'',start:child.start};
        };
        const source:MathMLNode={kind:'mmultiscripts',attributes:{},children:[
          input.children[i+3],{kind:'mprescripts',attributes:{},children:[],text:'',start:child.start},script(1),script(2),
        ],text:'',start:child.start};
        const cloned=copy(source);output.children.push(cloned);stack.push([source,cloned]);i+=3;continue;
      }
      const code = codeOf(child);
      if (glyph(code) || compound(code)) output.children.push(nativeGlyph(child));
      else {const cloned = copy(child); output.children.push(cloned); stack.push([child, cloned]);}
    }
  }
  return glyph(codeOf(root)) || compound(codeOf(root)) ? nativeGlyph(root) : result;
}
