import {balanceProof} from './bussproofs-layout.js';
/** Proof construction and balancing adapted from MathJax 4.1.3 BussproofsMethods
 * and BussproofsUtil (Apache-2.0). Copyright 2018–2026 The MathJax Consortium. */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw,scan} from '../scanner.js';
import type {Token} from '../scanner.js';
import type {TexPackage,TexCommand} from './types.js';
interface Tree {stack:Node[];line:string;current:string;up:boolean;left:Node|null;right:Node|null;inferences:Node[];props:Map<Node,Map<string,string>>;}
const trees=new WeakMap<object,Tree[]>();
function tree(p:Parser):Tree {const t=trees.get(p)?.at(-1);if(!t)p.error('Proof commands only allowed in prooftree environment.');return t!;}
function property(t:Tree,n:Node,key:string,value:string) {let data=t.props.get(n);if(!data)t.props.set(n,data=new Map());data.set(key,value);}
function content(p:Parser,padded:boolean,done:(n:Node)=>void,sequent=false) {
 if(sequent){sequentContent(p,done);return;}
 const tokens=p.tokensArgument();const source=padded?raw(tokens).trim():raw(tokens);
 if(!source&&padded){done(p.row([],true));return;}
 const shim=new Proxy(p,{get(target,key){if(key==='append')return(n:Node)=>{if(!padded&&n.kind===K.mrow&&!Object.keys(n.attributes).length)n.kind=K.mstyle;done(padded?p.row([p.node(K.mspace,[],'',{width:'.5ex'}),...(n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n]),p.node(K.mspace,[],'',{width:'.5ex'})],true):n);};return Reflect.get(target,key);}});
 shim.renderText(scan(source));
}
function inference(p:Parser,count:number,sequent=false) {
 const t=tree(p);if(t.stack.length<count)p.error('Proof tree badly specified.');
 const premises=t.stack.splice(-count);const childCount=count===1&&!premises[0].children.length?0:count;
 content(p,true,conclusion=>{
   const cells:Node[]=[];for(const n of premises){if(cells.length)cells.push(p.node(K.mtd));cells.push(p.node(K.mtd,[n],'',{rowalign:t.up?'top':'bottom'}));}
   const upper=p.node(K.mtr,[p.node(K.mtd,[p.node(K.mtable,[p.node(K.mtr,cells)],'',{framespacing:'0 0'})])]);
   const lower=p.node(K.mtr,[p.node(K.mtd,[conclusion])]);
   let rule=p.node(K.mtable,t.up?[lower,upper]:[upper,lower],'',{align:'top 2',...(t.current==='none'?{}:{rowlines:t.current}),framespacing:'0 0'});
   property(t,rule,'inferenceRule',t.up?'up':'down');t.current=t.line;
   if(t.left||t.right) {
     const children:Node[]=[];
     if(t.left){const label=p.node(K.mpadded,[t.left],'',{height:'.25em',depth:'+.25em',width:'+.5ex',voffset:'-.25em'});property(t,label,'prooflabel','left');children.push(label);}
     children.push(rule);
     if(t.right){const label=p.node(K.mpadded,[t.right],'',{height:'-.25em',depth:'+.25em',width:'+.5ex',voffset:'-.25em',lspace:'.5ex'});property(t,label,'prooflabel','right');children.push(label);}
     rule=p.row(children,true);property(t,rule,'labelledRule',t.left&&t.right?'both':t.left?'left':'right');
   }
   t.left=t.right=null;property(t,rule,'inference',String(childCount));t.inferences.push(rule);t.stack.push(rule);
 },sequent);
}
function sequentContent(p:Parser,done:(n:Node)=>void) {
 p.stream.skip();if(p.stream.next()?.[0]!==36)p.error('Use of '+p.currentCommand+' does not match its definition.');
 const tokens:Token[]=[];let closed=false;
 while(p.stream.peek()){const token=p.stream.next()!;if(token[0]===36){closed=true;break;}tokens.push(token);}
 if(!closed)p.error('Missing closing $');
 const middle=tokens.findIndex(t=>t[0]===-1&&raw([t])==='\\fCenter');
 if(middle<0)p.error('Missing \\fCenter in '+p.currentCommand+'.');
 p.parseTokens(tokens.slice(0,middle),left=>p.parseTokens(tokens.slice(middle+1),right=>p.parseTokens(scan('\\fCenter'),center=>{
  const sequence=(n:Node)=>n.inferred?n.children:[n];
  const table=p.node(K.mtable,[p.node(K.mtr,[p.node(K.mtd,sequence(left)),p.node(K.mtd,sequence(center)),p.node(K.mtd,sequence(right))])],'',{columnspacing:'.5ex',columnalign:'center 2'});
  property(tree(p),table,'sequent','true');done(table);
 })));
}
const commands:Record<string,TexCommand>={};
for(const name of ['Axiom','AX'])commands[name]={execute(p){const t=tree(p);content(p,false,n=>{property(t,n,'axiom','true');t.stack.push(n);},true);}};
for(const [name,count]of [['UnaryInf',1],['BinaryInf',2],['TrinaryInf',3],['QuaternaryInf',4],['QuinaryInf',5]] as const)commands[name]={execute:p=>inference(p,count,true)};

for(const name of ['AxiomC','AXC'])commands[name]={execute(p){const t=tree(p);content(p,true,n=>{property(t,n,'axiom','true');t.stack.push(n);});}};
for(const [names,count]of [[['UnaryInfC','UIC'],1],[['BinaryInfC','BIC'],2],[['TrinaryInfC','TIC'],3],[['QuaternaryInfC'],4],[['QuinaryInfC'],5]] as const)for(const name of names)commands[name]={execute:p=>inference(p,count)};
for(const name of ['LeftLabel','LL','RightLabel','RL'])commands[name]={execute(p){const t=tree(p);content(p,false,n=>{t[name==='LeftLabel'||name==='LL'?'left':'right']=n;});}};
for(const name of ['noLine','singleLine','solidLine','dashedLine','alwaysNoLine','alwaysSingleLine','alwaysSolidLine','alwaysDashedLine'])commands[name]={execute(p){const t=tree(p);t.current=/no/i.test(name)?'none':/dashed/i.test(name)?'dashed':'solid';if(name.startsWith('always'))t.line=t.current;}};
for(const name of ['rootAtTop','alwaysRootAtTop','rootAtBottom','alwaysRootAtBottom'])commands[name]={execute(p){tree(p).up=name.endsWith('Top');}};
commands.fCenter={execute(){}};
export default {name:'bussproofs',commands,environments:{prooftree:{begin(p,name){
 const t:Tree={stack:[],line:'solid',current:'solid',up:false,left:null,right:null,inferences:[],props:new Map()};let list=trees.get(p);if(!list)trees.set(p,list=[]);list.push(t);
 p.frame(-4,false,noise=>{list!.pop();if(t.stack.length!==1){const roots=[...noise,...t.stack];for(const n of roots){styles(n,p.f.display);for(const [node,data]of t.props)if(data.size)node.attributes.semantics=[...data].map(([key,value])=>'bspr_'+key+':'+value).join(';');p.append(n);}return;}let result=t.stack.length===1?t.stack[0]:p.row(t.stack,true);if(noise.length)result=p.row([...noise,result],true);property(t,result,'proof','true');
   // Text nested inside proof tables inherits text style; at top level the
   // internal-text wrapper explicitly resets displaystyle.
   function styles(n:Node,display:boolean){if(n.kind===K.mrow&&t.props.get(n)?.has('axiom')&&display&&n.children.length>2){n.children.splice(1,n.children.length-2,p.node(K.mstyle,n.children.slice(1,-1),'',{displaystyle:'false'}));}if(n.kind===K.mpadded&&t.props.get(n)?.has('prooflabel')&&display){if(n.children[0]?.kind===K.mstyle)n.children[0].attributes.displaystyle='false';else n.children=[p.node(K.mstyle,n.children,'',{displaystyle:'false'})];}for(const c of n.children)styles(c,n.kind===K.mtable?false:display);}
   result=balanceProof(p,result,t.inferences,t.props);
   styles(result,p.f.display);
   for(const [n,data]of t.props)if(data.size)n.attributes.semantics=[...data].map(([key,value])=>'bspr_'+key+':'+value).join(';');p.append(result);
 },name);
}}},configurationModules:['input/tex/bussproofs/BussproofsConfiguration.js']} satisfies TexPackage;
