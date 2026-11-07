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
function overline(n:MathMLNode):boolean {
  const accent=n.children[1];
  return (n.kind==='mover'||n.kind==='munder')&&accent?.kind==='mo'&&accent.text==='―'&&accent.attributes.accent==='true';
}
function nativeGlyph(n: MathMLNode): MathMLNode {
  const code = codeOf(n), text = glyph(code);
  const attributes = {...n.attributes};
  delete attributes['data-mjx-variant'];
  if (text) return {...n, text, attributes, children: []};
  // Fixed bond geometry follows the source font's em metrics. Accenting a
  // Unicode '=' or dash lets the browser choose incompatible glyph bearings.
  const arrow=code===0xe409||code===0xe40a;
  const height=arrow?.692:code===0xe411?.238:.428;
  const result:MathMLNode={...n,kind:'mrow',text:'',attributes:{...attributes,
    'data-flashmath-chem':arrow?'harpoons':'bond',
    'aria-label':arrow?'⇌':code===0xe411?'~-':code===0xe412?'~--':'-~-',
  },children:[]};
  delete result.attributes.stretchy;
  addStyle(result,`display:inline-block;position:relative;${arrow?'min-width:1.463em;width:100%':'width:.828em'};height:${height}em;transform:translateY(${arrow?'.098':code===0xe411?'-.131':'-.036'}em);`);
  const stroke=(top:string,left:string,width:string,dashed=false)=>{
    const child:MathMLNode={kind:'mrow',text:'',children:[],start:n.start,attributes:{'aria-hidden':'true','data-flashmath-chem-stroke':dashed?'dashed':'solid',style:`display:block;position:absolute;top:${top};left:${left};width:${width};height:.048em;border-radius:.024em;${dashed?'background:repeating-linear-gradient(to right,currentColor 0em,currentColor .198em,transparent .198em,transparent .258em)':'background-color:currentColor'}`}};
    result.children.push(child);return child;
  };
  if(arrow){
    const upperShort=code===0xe40a;
    const upper=stroke('.226em',upperShort?'.282em':'.056em',upperShort?'calc(100% - .563em)':'calc(100% - .112em)');
    const lower=stroke('.419em',upperShort?'.056em':'.282em',upperShort?'calc(100% - .112em)':'calc(100% - .563em)');
    for(const [line,right]of [[upper,true],[lower,false]] as const){
      line.children.push({kind:'mrow',text:'',children:[],start:n.start,attributes:{'aria-hidden':'true','data-flashmath-chem-head':right?'right':'left',style:`display:block;position:absolute;${right?'right:0;bottom:0':'left:0;top:0'};width:.25em;height:.273em;background-color:currentColor;clip-path:polygon(${right?'100% 100%,0 0,28% 100%':'0 0,100% 100%,72% 0'})`}});
    }
  }else{
    const count=code===0xe411?2:3;
    for(let i=0;i<count;i++)stroke(`${i*.19}em`,'.057em','.714em',code===0xe413?i===1:i===0);
  }
  if(arrow){
    result.attributes.style='display:block;position:absolute;left:.2778em;right:.2778em;top:0;height:.692em;transform:translateY(.098em)';
    return {kind:'mrow',text:'',start:n.start,attributes:{style:'display:inline-block;position:relative;min-width:2.019em;width:100%;height:.692em'},children:[result]};
  }
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
      || overline(n)
      || n.kind==='mtable' && (n.attributes.rowlines || n.attributes.columnlines || n.attributes.frame || n.attributes.semantics?.includes('bspr_inferenceRule:'))
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
      job.done=true;work.push(job);
      const sourceChildren=input.children,childCount=sourceChildren.length-(arrowLabel(input)?1:0);
      const children:MathMLNode[]=[];
      for(let i=0;i<childCount;i++){
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
        if(name!=='normal'&&mapped===output.text&&!['script','bold-script'].includes(name)){
          if(name.includes('bold'))addStyle(output,'font-weight:bold;');
          if(name.includes('italic')||name.includes('script'))addStyle(output,'font-style:italic;');
          if(name.includes('sans-serif'))addStyle(output,'font-family:sans-serif;');
          if(name==='monospace')addStyle(output,'font-family:monospace;');
        }
        // Distinct upstream NewCM calligraphic/script faces; load fonts.css for
        // deterministic glyphs. Other characters fall back to the math font.
        if(variant==='-tex-calligraphic'||variant==='-tex-bold-calligraphic')
          addStyle(output,`font-family:'Flashmath Calligraphic',math;font-style:normal;font-weight:${variant.includes('bold')?'bold':'normal'};`);
        else if(name==='script'||name==='bold-script')
          addStyle(output,`font-family:'Flashmath Script',math;font-style:normal;font-weight:${name.includes('bold')?'bold':'normal'};`);
        output.text=mapped;
        delete output.attributes['data-mjx-variant'];
        if(output.kind==='mi')output.attributes.mathvariant='normal';
        else delete output.attributes.mathvariant;
      }else delete output.attributes.mathvariant;
    }
    if(output.attributes.semantics?.includes('bspr_prooflabel:')){
      const right=output.attributes.semantics.includes('bspr_prooflabel:right');
      output.kind='mrow';
      for(const key of ['width','height','depth','voffset','lspace'])delete output.attributes[key];
      addStyle(output,`display:inline-flex;align-items:baseline;padding-${right?'left':'right'}:.5ex;transform:translateY(.25em);`);
    }
    if(packageMark(input)==='bbox-padding')nativeBBox(output);
    else if(output.kind==='menclose')Object.assign(output,nativeEnclosure(output));
    else if(isCenterOver(output))nativeCenterOver(output);
    else if(output.kind==='mtable'){
      const labeled=output.children.some(n=>n.kind==='mlabeledtr');
      nativeTable(output,defaultSide);hasLabels ||= labeled;
    }
    if(overline(output)){
      const under=output.kind==='munder';
      Object.assign(output,nativeEnclosure({...output,attributes:{...output.attributes,notation:under?'bottom':'top','data-padding':'.1em','data-thickness':'.04em'},children:[output.children[0]]}));
      output.attributes['data-flashmath-accent']=under?'underline':'overline';
    }
  }
  if(hasLabels&&result.kind==='math'&&result.attributes.display==='block')addStyle(result,'width:100%;display:block;');
  return result;
}
