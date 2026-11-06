import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {metrics} from './bussproofs-metrics.js';
import {operator} from '../mathml.js';
type Properties=Map<Node,Map<string,string>>;
const em=(n:number)=>Math.abs(n)<.0006?'0em':n.toFixed(3).replace(/\.?0+$/,'')+'em';
const length=(s:string)=>parseFloat(s)*(s.endsWith('ex')?.431:s.endsWith('px')?1/16:s.endsWith('pt')?.1:1)||0;
function glyph(code:number,italic:boolean):readonly [number,number] {
 let mapped=code;if(italic){if(code>=65&&code<=90)mapped=code-65+0x1d434;else if(code>=97&&code<=122)mapped=code===104?0x210e:code-97+0x1d44e;}
 return metrics[mapped]??metrics[code]??[.5,0];
}
function bbox(n:Node):{w:number;ic:number} {
 let w=0,ic=0;
 const children=n.children;
 if([K.mi,K.mn,K.mo,K.mtext].includes(n.kind)) {
   const italic=n.attributes.mathvariant==='italic'||n.kind===K.mi&&Array.from(n.text).length===1&&!n.attributes.mathvariant;
   for(const c of n.text){const [advance,correction]=glyph(c.codePointAt(0)!,italic);w+=advance;ic=correction;}
   if(n.kind===K.mi)w+=ic;
 } else if(n.kind===K.mspace)w=length(n.attributes.width??'0');
 else if(n.kind===K.mtable) {
   const widths:number[]=[];for(const row of children)for(let i=0;i<row.children.length;i++)widths[i]=Math.max(widths[i]??0,bbox(row.children[i]).w);
   w=widths.reduce((sum,x)=>sum+x,0)+Math.max(0,widths.length-1)*length(n.attributes.columnspacing??'.8em');
 } else if([K.msup,K.msub,K.msubsup].includes(n.kind)) {
   const b=bbox(children[0]);const sub=n.kind!==K.msup?bbox(children[1]).w/Math.sqrt(2):0;
   const sup=n.kind!==K.msub?bbox(children.at(-1)!).w/Math.sqrt(2):0;
   const core=children[0];const isChar=[K.mi,K.mn,K.mo].includes(core.kind)&&Array.from(core.text).length===1;
   const correction=b.ic?1.05*b.ic+.05:0;
   w=Math.max(b.w,b.w-b.ic+.033+(isChar?0:correction)+sub,b.w+.033+correction-b.ic+sup)+.05;
 } else if(n.kind===K.mfrac)w=Math.max(...children.map(x=>bbox(x).w))/Math.sqrt(2)+.24;
 else {
   for(let i=0;i<children.length;i++) {
     const c=children[i];w+=bbox(c).w;
     if([K.mrow,K.mtd,K.mstyle].includes(n.kind)) {
       const op=c.kind===K.mo?operator(c.text):null;
       if(op){if(i>0)w+=op[0]/18;if(i+1<children.length)w+=op[1]/18;}
     }
   }
   if(n.kind===K.mpadded&&n.attributes.width){const value=n.attributes.width;w=/^[+-]/.test(value)?w+length(value):length(value);}
 }
 if(n.attributes.mathsize)w*=Number(n.attributes.mathsize)||1;
 for(const match of (n.attributes.style??'').matchAll(/margin-(?:left|right):\s*([^;]+)/g))w+=length(match[1]);
 return {w,ic};
}
export function balanceProof(p:Parser,root:Node,inferences:Node[],props:Properties):Node {
 const container=p.row([root],true),parents=new Map<Node,Node>(),margins=new Map<Node,{left:number;right:number}>();
 const get=(n:Node|undefined,key:string)=>n?props.get(n)?.get(key):undefined;
 const set=(n:Node,key:string,value:string)=>{let v=props.get(n);if(!v)props.set(n,v=new Map());v.set(key,value);};
 function parentMap(){parents.clear();const work=[container];while(work.length){const n=work.pop()!;for(const c of n.children){parents.set(c,n);work.push(c);}}}
 function rule(n:Node):Node {while(n.kind!==K.mtable){n=n.children.find(c=>c.kind===K.mtable)??n.children.find(c=>!get(c,'prooflabel'))!;if(!n)throw Error('Invalid inference structure');}return n;}
 const premises=(r:Node)=>r.children[get(r,'inferenceRule')==='up'?1:0].children[0].children[0].children[0];
 const conclusion=(r:Node)=>r.children[get(r,'inferenceRule')==='up'?0:1].children[0].children[0];
 function spaces(inf:Node,r:Node,right=false) {let result=0;if(inf===r)return result;const parent=parents.get(r)!;if(inf!==parent){result+=(margins.get(inf)?.[right?'right':'left']??0);inf=parent;}const edge=right?inf.children.at(-1)!:inf.children[0];if(edge!==r)result+=bbox(edge).w;return result;}
 function adjust(inf:Node,right=false){const r=rule(inf);return spaces(inf,r,right)+(bbox(r).w-bbox(conclusion(r)).w)/2;}
 function add(inf:Node,amount:number,right=false){if(!amount)return;
   if(get(inf,'inferenceRule')||get(inf,'labelledRule')) {
     const parent=parents.get(inf)!;const wrapper=p.row([inf],true);parent.children[parent.children.indexOf(inf)]=wrapper;
     for(const key of ['inference','proof','labelledRule']) {const value=get(inf,key);if(value!==undefined){set(wrapper,key,value);props.get(inf)!.delete(key);}}
     inf=wrapper;parentMap();
   }
   let value=margins.get(inf);if(!value)margins.set(inf,value={left:0,right:0});value[right?'right':'left']+=amount;
   inf.attributes.style=(['left','right'] as const).filter(key=>value![key]).map(key=>`margin-${key}: ${em(value![key])}`).join('; ');
 }
 const sequents=[...props].filter(([,v])=>v.has('sequent')).map(([n])=>n);
 const maxLeft=Math.max(0,...sequents.map(n=>bbox(n.children[0].children[0]).w));
 const maxRight=Math.max(0,...sequents.map(n=>bbox(n.children[0].children[2]).w));
 for(const n of sequents){const cells=n.children[0].children;
  for(const [index,max,side]of [[0,maxLeft,'left'],[2,maxRight,'right']] as const){
   const delta=max-bbox(cells[index]).w;
   if(delta>0){const space=p.node(K.mspace,[],'',{width:em(delta)});if(index===0)cells[index].children.unshift(space);else cells[index].children.push(space);set(n,'sequentAdjust_'+side,String(delta));}
  }
 }
 parentMap();let maxAdjust=0;
 for(const inf of inferences) {
   const proof=get(inf,'proof'),r=rule(inf),prem=premises(r),first=prem.children[0]?.children[0];let left=0;
   if(first && get(first,'inference')!==undefined){const a=adjust(first);if(a){add(first,-a);const w=spaces(inf,r);add(inf,a-w);left=a-w;}}
   const last=prem.children.at(-1)!.children[0];
   if(get(last,'inference')===undefined)continue;
   const a=adjust(last,true);add(last,-a,true);const w=spaces(inf,r,true),delta=(bbox(r).w-bbox(parents.get(prem)!).w)/2;
   add(inf,delta<left?-delta:-left);maxAdjust=Math.max(0,Math.max(0,maxAdjust+a-w)-delta);
   let column=parents.get(inf);while(column&&column.kind!==K.mtd)column=parents.get(column);
   if(proof||!column){add(get(inf,'proof')?inf:parents.get(inf)!,maxAdjust,true);continue;}
   const siblings=parents.get(column)!.children,next=siblings[siblings.indexOf(column)+1];
   if(next){next.children.push(p.node(K.mspace,[],'',{width:em(maxAdjust)}));maxAdjust=0;}
 }
 return container.children[0];
}
