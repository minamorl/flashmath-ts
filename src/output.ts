import type {MathMLNode, OutputOptions} from './ast.js';
import {packageMark} from './package-mark.js';
import {variantName, variantText} from './native-variants.js';
import {addStyle, isCenterOver, nativeBBox, nativeCenterOver, nativeEnclosure, nativeTable} from './native-layout.js';

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

/** Native output lowers renderer-specific layout to MathML Core and inline CSS.
 * MathJax output returns the original tree verbatim. Neither mode mutates input. */
export function mathMLForOutput(root: MathMLNode, options: OutputOptions = {}): MathMLNode {
  const mode = options.output === undefined ? 'native' : options.output;
  if (mode !== 'native' && mode !== 'mathjax') throw new TypeError('output must be native or mathjax');
  if (mode === 'mathjax') return root;
  const pending = [root];
  let found = false;
  while (pending.length) {
    const n = pending.pop()!, code = codeOf(n), variant=n.attributes.mathvariant;
    if (glyph(code) || compound(code) || arrowLabel(n) || packageMark(n)==='prescript' || packageMark(n)==='bbox-padding'
      || n.kind==='menclose' || n.kind==='mlabeledtr' || isCenterOver(n)
      || n.kind==='mtable' && (n.attributes.rowlines || n.attributes.columnlines || n.attributes.frame)
      || variant && (variant!=='normal' && (variant!=='italic' || n.kind!=='mi' || Array.from(n.text).length!==1) || n.kind==='mstyle')) {found = true; break;}
    for (const child of n.children) pending.push(child);
  }
  if (!found) return root;
  const copy = (n: MathMLNode): MathMLNode => arrowLabel(n)
    ? {...n, kind: 'mrow', attributes: {}, children: []}
    : {...n, attributes: {...n.attributes}, children: []};
  const result=copy(root);
  const defaultSide='tagSide' in options&&options.tagSide==='left'?'left':'right';
  let hasLabels=false;
  type Job={input:MathMLNode;output:MathMLNode;variant:string;done:boolean};
  const work:Job[]=[{input:root,output:result,variant:'',done:false}];
  while(work.length){
    const job=work.pop()!,{input,output}=job;
    const variant=input.attributes['data-mjx-variant']??input.attributes.mathvariant??job.variant;
    if(!job.done){
      work.push({...job,done:true});
      const sourceChildren=input.children.slice(0,input.children.length-(arrowLabel(input)?1:0));
      const children:MathMLNode[]=[];
      for(let i=0;i<sourceChildren.length;i++){
        const child=sourceChildren[i];
        if(packageMark(child)==='prescript' && sourceChildren[i+3]){
          const script=(which:number):MathMLNode=>{
            const stack=[child.children[which]];
            while(stack.length){const n=stack.pop();if(!n)continue;
              if(n.kind==='mphantom')return {kind:n.children.length?'mrow':'none',attributes:{},children:n.children,text:'',start:child.start};
              for(const c of n.children)stack.push(c);
            }
            return {kind:'none',attributes:{},children:[],text:'',start:child.start};
          };
          children.push({kind:'mmultiscripts',attributes:{},children:[sourceChildren[i+3],{kind:'mprescripts',attributes:{},children:[],text:'',start:child.start},script(1),script(2)],text:'',start:child.start});
          i+=3;
        }else children.push(child);
      }
      for(const child of children){
        const cloned=copy(child);output.children.push(cloned);
        work.push({input:child,output:cloned,variant,done:false});
      }
      continue;
    }
    const code=codeOf(input);
    if(glyph(code)||compound(code)){Object.assign(output,nativeGlyph(input));continue;}
    if(variant){
      const name=variantName(variant);
      if(['mi','mn','mo','mtext'].includes(output.kind)){
        const mapped=output.kind==='mtext'?output.text:variantText(output.text,variant);
        if(name!=='normal'&&mapped===output.text){
          if(name.includes('bold'))addStyle(output,'font-weight:bold;');
          if(name.includes('italic')||name.includes('script'))addStyle(output,'font-style:italic;');
          if(name.includes('sans-serif'))addStyle(output,'font-family:sans-serif;');
          if(name==='monospace')addStyle(output,'font-family:monospace;');
        }
        output.text=mapped;
        delete output.attributes['data-mjx-variant'];
        if(output.kind==='mi')output.attributes.mathvariant='normal';
        else delete output.attributes.mathvariant;
      }else delete output.attributes.mathvariant;
    }
    if(packageMark(input)==='bbox-padding')nativeBBox(output);
    else if(output.kind==='menclose')Object.assign(output,nativeEnclosure(output));
    else if(isCenterOver(output))nativeCenterOver(output);
    else if(output.kind==='mtable'){
      const labeled=output.children.some(n=>n.kind==='mlabeledtr');
      nativeTable(output,defaultSide);hasLabels ||= labeled;
    }
  }
  if(hasLabels&&result.kind==='math'&&result.attributes.display==='block')addStyle(result,'width:100%;display:block;');
  return result;
}
