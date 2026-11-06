/** MathJax 4.1.3 mathtools semantics, implemented on the token/frame parser.
 * Reference: MathJax MathtoolsMappings/Methods/Items/Util (Apache-2.0).
 * No oracle, fixture lookup, or runtime MathJax dependency is used here.
 */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import type {Token} from '../scanner.js';
import {scan, raw, spelling} from '../scanner.js';
import {dimensionEm, em, nodeText} from '../mathml.js';
import {definitions} from '../symbols.js';
import type {TexCommand, TexEnvironment, TexPackage} from './types.js';
import newcommand from './newcommand.js';

type Options = Record<string, unknown>;
type Pair = [string, string, string?, number?, string?, string?];
interface State {
  options: Options;
  pairs: Map<string, Pair>;
  tagforms: Map<string, string[]>;
  tagform: string[] | null;
  tables: WeakMap<object,TableExtra>;
}
const defaults: Options = {
  'multlined-gap':'1em', 'multlined-pos':'c', 'multlined-width':'',
  'firstline-afterskip':'', 'lastline-preskip':'', 'smallmatrix-align':'c',
  'shortvdotsadjustabove':'.2em', 'shortvdotsadjustbelow':'.2em',
  centercolon:false, 'centercolon-offset':'.04em', 'thincolon-dx':'-.04em',
  'thincolon-dw':'-.08em', 'use-unicode':false, legacycolonsymbols:false,
  'prescript-sub-format':'', 'prescript-sup-format':'', 'prescript-arg-format':'',
  'allow-mathtoolsset':true,
};
function state(p: Parser): State { return p.session.packageData.get('mathtools') as State; }
function option(p: Parser, key: string): string { return String(state(p).options[key] ?? ''); }
function children(n: Node): Node[] { return n.kind === K.mrow && !n.attributes['data-mjx-texclass'] ? n.children : [n]; }
function push(p: Parser, tex: string) {
  if (++p.expansions > (p.options.maxExpansions ?? 10000)) p.error('Macro expansion limit exceeded');
  p.stream.push(scan(tex, p.options.maxTokens ?? 200000));
}
function macro(p: Parser, name: string, body: string, count=0, optional: string | null=null) {
  p.macros.set(name,{body:scan(body),count,optional:optional === null ? null : scan(optional),prefix:[],delimiters:[]});
}
function styleAttrs(p: Parser, style: string): Record<string,string> {
  const level = ['\\displaystyle','\\textstyle','\\scriptstyle','\\scriptscriptstyle'].indexOf(style.trim());
  return level < 0 ? {} : {...(p.f.display===(level===0)?{}:{displaystyle:String(level===0)}),...(p.f.level===Math.max(0,level-1)?{}:{scriptlevel:String(Math.max(0,level-1))})};
}
function initialize(p: Parser) {
  if (!p.session.packageData.has('mathtools')) {
    const opts = {...defaults,...p.options.texOptions?.mathtools as Options};
    const s: State = {options:opts,pairs:new Map(Object.entries(opts.pairedDelimiters as Record<string,Pair> ?? {})),
      tagforms:new Map(Object.entries(opts.tagforms as Record<string,string[]> ?? {})),tagform:null,tables:new WeakMap()};
    p.session.packageData.set('mathtools',s);
    for (const name of s.pairs.keys()) macro(p,name,`\\MTpaired{${name}}`);
  }
}
const commands: Record<string,TexCommand> = {};
function command(name: string, execute: (p: Parser, name: string)=>void) {
  commands[name]={execute(p){execute(p,name);}};
}
for (const [name, char, cls] of [['lparen','(','OPEN'],['rparen',')','CLOSE']] as const) {
  commands[name]={type:'delimiter',char,attrs:{texClass:cls === 'OPEN'?4:5},execute(p,t,d,id){p.append(p.symbol(t,id,d));}};
}
for (const name of ['mathllap','mathrlap','mathclap','crampedllap','crampedrlap','crampedclap','cramped']) {
  command(name,(p,name)=>{
    const sty=raw(p.optional()??[]), cramped=name.startsWith('cramped');
    const attrs:Record<string,string>={'data-cramped':String(cramped),...styleAttrs(p,sty)};
    p.argument(n=>{
      if(name==='cramped') p.append(p.node(K.mstyle,children(n),'',attrs));
      else {
        const pos=name.at(-4), a:Record<string,string>={width:'0'};
        if(pos!=='r') a.lspace=pos==='l'?'-1width':'-.5width';
        p.append(p.atom([p.node(K.mstyle,[p.node(K.mpadded,children(n),'',a)],'',attrs)]));
      }
    });
    const styleLevel=['\\displaystyle','\\textstyle','\\scriptstyle','\\scriptscriptstyle'].indexOf(sty.trim());
    if(styleLevel>=0){p.f.level=Math.max(0,styleLevel-1);p.f.display=styleLevel===0;}
  });
}
for(const name of ['clap','textllap','textrlap','textclap']) command(name,(p,name)=>{
  const tokens=p.tokensArgument(), pos=name==='clap'?'c':name.at(-4), level=p.f.level;
  // Text arguments retain internal $...$ math through the core text renderer.
  const parent=p.f;
  p.frame(-2,false,n=>{
    const content=n.length===1&&n[0].kind===K.mstyle?n[0].children:n.flatMap(children);
    const attrs:Record<string,string>={width:'0'};
    if(pos!=='r')attrs.lspace=pos==='l'?'-1width':'-.5width';
    p.append(p.node(K.mpadded,[p.node(K.mstyle,content,'',level?{scriptlevel:'0'}:{displaystyle:'false'})],'',attrs));
  });
  p.stream.push([[0,0,0,'']]);
  p.renderText(tokens,parent.font,true);
});
command('mathmbox',p=>p.argument(n=>p.append(p.row(children(n),true))));
command('mathmakebox',p=>{
  const width=raw(p.optional()??[]),pos=raw(p.optional()??scan('c'));
  const attrs:Record<string,string>={}; if(width)attrs.width=width;
  if(pos.toLowerCase()==='c')attrs['data-align']='center';
  if(pos.toLowerCase()==='r')attrs['data-align']='right';
  if(pos.toLowerCase()!==pos)attrs['data-overflow']='linebreak';
  p.argument(n=>p.append(p.node(K.mpadded,children(n),'',attrs)));
});
const arrows:Record<string,[string,number,number,number?]>={
 xleftrightarrow:['↔',10,10],xLeftarrow:['⇐',12,7],xRightarrow:['⇒',7,12],xLeftrightarrow:['⇔',12,12],
 xhookleftarrow:['↩',10,5],xhookrightarrow:['↪',5,10],xmapsto:['↦',10,10],
 xrightharpoondown:['⇁',5,10],xleftharpoondown:['↽',10,5],xrightleftharpoons:['⇌',10,10],
 xrightharpoonup:['⇀',5,10],xleftharpoonup:['↼',10,5],xleftrightharpoons:['⇋',10,10],
 xlongrightarrow:['⟶',7,12,1.45],xlongleftarrow:['⟵',12,7,1.45],xLongrightarrow:['⟹',7,12,1.45],xLongleftarrow:['⟸',12,7,1.45],
};
for(const [name,[glyph,left,right,min]] of Object.entries(arrows)) command(name,p=>{
  const below=p.optional();
  p.argument(top=>{
    const a:Record<string,string>={'data-mjx-texclass':'ORD',stretchy:'true'}; if(min)a.minsize=em(min);
    const arrow=p.node(K.mo,[],glyph,a);arrow.relation=false;
    const pad=(n:Node,under=false)=>p.node(K.mpadded,[...children(n),p.node(K.mspace,[],'',under?{height:'.75em'}:{depth:'.2em'})],'',
      {width:`+${em((left+right)/18)}`,lspace:em(left/18),voffset:under?'.15em':'-.2em',...(under?{depth:'-.15em'}:{height:'-.2em'})});
    const emit=(n:Node)=>p.append(p.atom([p.atom([],'NONE'),n],'REL'));
    const base=p.f.level>0?p.node(K.mstyle,[arrow],'',{scriptlevel:'0'}):arrow;
    if(below) p.parseTokens(below,bottom=>emit(p.node(K.munderover,[base,pad(bottom,true),pad(top)])));
    else emit(p.node(K.mover,[base,pad(top)]));
  });
});
for(const name of ['underbracket','overbracket']) command(name,(p,name)=>{
  const thickness=raw(p.optional()??scan('.1em'))||'.1em',height=raw(p.optional()??scan('.2em'));
  const toks=p.tokensArgument(),over=name==='overbracket';
  p.parseTokens(toks,base=>p.parseTokens(toks,copy=>{
    const thicknessEm=thickness.endsWith('px')?parseFloat(thickness)/16:dimensionEm(thickness);
    const script=p.node(K.mpadded,[p.node(K.mphantom,children(copy))],'',{
      style:`border: ${em(thicknessEm)} solid; border-${over?'bottom':'top'}: none`,height,depth:'0'});
    const n=p.node(over?K.mover:K.munder,[base,script],'',{[over?'accent':'accentunder']:'true'});
    const atom=p.atom([p.node(K.mstyle,[n],'',n.attributes)],'OP');n.attributes={};atom.limits=2;p.append(atom);
  }));
});
function centerColon(p:Parser,center:boolean,force=false,thin=false):Node {
  let n=p.node(K.mo,[],':');n.relation=true;
  if(center&&(force||state(p).options.centercolon)){
    const dy=option(p,'centercolon-offset');
    n=p.node(K.mpadded,[n],'',{voffset:dy,height:'+'+dy,depth:'-'+dy,
      ...(thin?{width:option(p,'thincolon-dw'),lspace:option(p,'thincolon-dx')}:{})});
  }
  return n;
}
command(':',p=>p.append(centerColon(p,true)));
command('vcentercolon',p=>p.append(centerColon(p,true,true)));
command('ordinarycolon',p=>p.append(centerColon(p,false)));
command('MTThinColon',p=>p.append(centerColon(p,true,true,true)));
const relations:Record<string,[string,string?]>={coloneqq:[':=','≔'],Coloneqq:['::=','⩴'],coloneq:[':=','≔'],Coloneq:['::=','⩺'],
 eqqcolon:['=:','≕'],Eqqcolon:['=::'],eqcolon:['=:','≕'],Eqcolon:['=::'],colonapprox:[':\\approx'],Colonapprox:['::\\approx'],
 colonsim:[':\\sim'],Colonsim:['::\\sim'],dblcolon:['::','∷'],approxcolon:['\\approx:'],Approxcolon:['\\approx::'],
 simcolon:['\\sim:'],Simcolon:['\\sim::'],colondash:[':-'],Colondash:['::-'],dashcolon:['-:','∹'],Dashcolon:['-::']};
for(const [name,pair] of Object.entries(relations))command(name,p=>{
  let [tex,unicode]=pair;
  if(state(p).options.legacycolonsymbols && ['coloneq','Coloneq','eqcolon','Eqcolon'].includes(name)){
    tex=tex.replace('=','-');unicode=name==='eqcolon'?'∹':undefined;
  }
  if(state(p).options['use-unicode']&&unicode){const n=p.node(K.mo,[],unicode,{'data-mjx-texclass':'REL'});n.relation=true;p.append(n);}
  else push(p,'\\mathrel{'+tex.replace(/:/g,'\\MTThinColon ').replace(/-/g,'\\mathrel{-}')+'}');
});
command('mathtoolsset',p=>{
  if(!state(p).options['allow-mathtoolsset'])p.error('\\mathtoolsset is disabled');
  for(const entry of raw(p.tokensArgument()).split(',')){
    const [key,...rest]=entry.split('='),name=key.trim();let value:unknown=rest.join('=').trim().replace(/^\{(.*)\}$/s,'$1');
    if(!Object.hasOwn(defaults,name)||name==='allow-mathtoolsset')p.error(`Invalid option: ${name}`);
    if(!rest.length||value==='true')value=true;else if(value==='false')value=false;
    state(p).options[name]=value;
  }
});
for(const [name,glyph,dy] of [['nuparrow','↑','.06em'],['ndownarrow','↓','.25em']])command(name,p=>{
  const arrow=()=>p.node(K.mtext,[],glyph);
  p.append(p.atom([arrow(),p.node(K.mpadded,[
    p.node(K.mpadded,[p.node(K.menclose,[p.node(K.mspace,[],'',{height:'.2em',depth:'0',width:'.4em'})],'',
      {notation:'updiagonalstrike','data-thickness':'.05em','data-padding':'0'})],'',{width:'0',lspace:'-.5width',voffset:dy}),
    p.node(K.mphantom,[arrow()])],'',{width:'0',lspace:'-.5width'})],'REL'));
});
command('bigtimes',p=>push(p,'\\mathop{\\Large\\kern-.1em\\boldsymbol{\\times}\\kern-.1em}'));
command('xmathstrut',p=>{
  const dd=raw(p.optional()??[]),dh=raw(p.tokensArgument()).trim();
  const signed=(v:string)=>{if(!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v))p.error('Argument to \\xmathstrut is not a number');return /^[+-]/.test(v)?v:'+'+v;};
  p.append(p.atom([p.node(K.mpadded,[p.node(K.mphantom,[p.node(K.mo,[],'(',{stretchy:'false'})])],'',
    {width:'0',height:signed(dh)+'height',depth:signed(dd||dh)+'depth'})]));
});
// A fraction's arguments use the next TeX style; keep that state on frames.
command('frac',p=>{
 const display=p.f.display,level=p.f.level,values:Node[]=[];
 const next=()=>{if(values.length===2){p.append(p.node(K.mfrac,values));return;}
  p.argument(n=>{values.push(n);next();});p.f.display=false;p.f.level=display?level:level+1;
 };next();
});
for(const name of ['splitfrac','splitdfrac'])command(name,(p,name)=>{
  const display=name==='splitdfrac',outerDisplay=p.f.display,parentLevel=p.f.level;
  p.args(2,([num,den])=>{
    const row=(nodes:Node[])=>p.node(K.mstyle,nodes,'',display?{}:{scriptlevel:'0'});
    const frac=p.node(K.mfrac,[row([...children(num),p.node(K.mi),p.node(K.mspace,[],'',{width:'1em'})]),
      row([p.node(K.mspace,[],'',{width:'1em'}),p.node(K.mi),...children(den)])],'',{linethickness:'0',numalign:'left',denomalign:'right'});
    const attrs:Record<string,string>={...(display===outerDisplay?{}:{displaystyle:String(display)}),...(parentLevel?{scriptlevel:'0'}:{})};
    p.append(Object.keys(attrs).length?p.node(K.mstyle,[frac],'',attrs):frac);
  });
});
function scriptArgument(p:Parser,pos:string,done:(n:Node)=>void){
  let toks=p.tokensArgument(),format=option(p,`prescript-${pos}-format`);
  if(!raw(toks).trim()){done(p.node(K.none));return;}
  if(format)toks=scan(`${format}{${raw(toks)}}`);
  p.parseTokens(toks,n=>done(n.kind===K.mrow&&!n.children.length?p.node(K.none):n));
}
command('prescript',p=>scriptArgument(p,'sup',sup=>scriptArgument(p,'sub',sub=>scriptArgument(p,'arg',base=>{
  if(sup.kind===K.none&&sub.kind===K.none){p.append(base);return;}
  const posts:[Node,Node]=[p.node(K.none),p.node(K.none)];let hasPost=false;
  const next=()=>{
    p.stream.skip();const c=p.stream.peek()?.[0];
    if(c===39||c===0x2019){
      p.stream.next();hasPost=true;let count=1;while([39,0x2019].includes(p.stream.peek()?.[0]??0)){p.stream.next();count++;}
      const prime=p.node(K.mo,[],['','′','″','‴','⁗'][count]??'′'.repeat(count),{'data-mjx-alternate':'1'});
      posts[1]=posts[1].kind===K.none?prime:p.row([posts[1],prime],true);next();
    }else if(c===94||c===95){p.stream.next();hasPost=true;const i=c===95?0:1;
      if(posts[i].kind!==K.none)p.error(c===95?'Double subscripts: use braces to clarify':'Double exponent: use braces to clarify');
      p.argument(n=>{posts[i]=n;next();},true);
    }else p.append(p.node(K.mmultiscripts,[base,...(hasPost?posts:[]),p.node(K.mprescripts),sub,sup]));
  };next();
}))));
command('adjustlimits',p=>{
 const a=raw(p.tokensArgument());p.stream.skip();if(p.stream.next()?.[0]!==95)p.error('Missing _');const b=raw(p.tokensArgument());
 const c=raw(p.tokensArgument());p.stream.skip();if(p.stream.next()?.[0]!==95)p.error('Missing _');const d=raw(p.tokensArgument());
 push(p,`\\mathop{{${a}}\\vphantom{{${c}}}}_{{${b}}\\vphantom{{${d}}}}\\MTadjustseparator\\mathop{{${c}}\\vphantom{{${a}}}}_{{${d}}\\vphantom{{${b}}}}`);
});
command('MTadjustseparator',p=>p.append(p.node(K.mo,[],'⁡',{'data-mjx-texclass':'NONE'})));
for(const name of ['mathopen','mathclose'])command(name,(p,name)=>p.argument(n=>p.append(p.atom(children(n),name==='mathopen'?'OPEN':'CLOSE'))));
// Dependency commands remain local to mathtools, avoiding edits to the AMS lane.
for(const name of ['def','let','newcommand','renewcommand'])commands[name]=newcommand.commands[name];
command('boldsymbol',p=>p.argument(n=>{
 const stack=[n];while(stack.length){const v=stack.pop()!;if([K.mi,K.mo,K.mn,K.mtext].includes(v.kind))v.attributes.mathvariant=v.kind===K.mi&&!v.attributes.mathvariant?'bold-italic':'bold';stack.push(...v.children);}p.append(n);
}));
export const boldsymbolDependency:TexPackage={name:'boldsymbol',commands:{boldsymbol:commands.boldsymbol},environments:{},configurationModules:['input/tex/boldsymbol/BoldsymbolConfiguration.js']};
const environments:Record<string,TexEnvironment>={};
function paired(p:Parser,name:string){
  const pair=state(p).pairs.get(name);if(!pair)p.error(`Undefined control sequence \\${name}`);
  let [open,close,body='#1',count=1,pre='',post='']=pair;
  p.stream.skip();const star=p.stream.peek()?.[0]===42;if(star)p.stream.next();
  const size=star?'':raw(p.optional()??[]);
  const args=Array.from({length:count},()=>raw(p.tokensArgument()));
  const substitute=(s:string)=>s.replace(/#([1-9])/g,(_,i)=>args[Number(i)-1]??'');
  body=substitute(body).replace(/\\delimsize/g,star?'\\middle':size);
  const left=star?'\\mathopen{\\left ':size?size+'l ':'';
  const right=star?'\\right ':size?size+'r ':'';
  push(p,`${substitute(pre)} ${left}${open} ${body} ${right}${close}${star?'}\\mathclose{}':''} ${substitute(post)}`);
}
command('MTpaired',p=>paired(p,raw(p.tokensArgument())));
for(const name of ['DeclarePairedDelimiter','DeclarePairedDelimiterX','DeclarePairedDelimiterXPP','DeclarePairedDelimiters','DeclarePairedDelimitersX','DeclarePairedDelimitersXPP'])command(name,(p,name)=>{
  const cs=raw(p.tokensArgument()).trim().replace(/^\\/,''),x=name.endsWith('X'),pp=name.endsWith('XPP');
  if(p.macros.has(cs)||p.configuration.extensions.has(cs)||definitions.some(d=>d.name===cs))p.error(`Command \\${cs} already defined`);
  const n=x||pp?Number(raw(p.optional()??scan('0'))):1;
  if(!Number.isInteger(n)||n<0||n>9)p.error('Illegal number of parameters');
  const pre=pp?raw(p.tokensArgument()):'',open=raw(p.tokensArgument()),close=raw(p.tokensArgument()),post=pp?raw(p.tokensArgument()):'',body=x||pp?raw(p.tokensArgument()):'#1';
  state(p).pairs.set(cs,[open,close,body,n,pre,post]);macro(p,cs,`\\MTpaired{${cs}}`);
});
function wrapTable(p:Parser,table:Node,left:string,right:string):Node {
  return left||right?p.atom([p.delimiterNode(left,'','OPEN'),table,p.delimiterNode(right,'','CLOSE')],'INNER'):table;
}
for(const [prefix,left,right] of [['','',''],['p','(',')'],['b','[',']'],['B','{','}'],['v','|','|'],['V','‖','‖']]){
  for(const small of [false,true]){
    const names=small?[prefix+'smallmatrix*',...(prefix?[prefix+'smallmatrix']:['smallmatrix'])]:[prefix+'matrix*'];
    for(const name of names)environments[name]={begin(p,name){
      const alignment=name.endsWith('*')?raw(p.optional()??scan(small?option(p,'smallmatrix-align'):'c')):'c';
      const align=alignment||'c',parentLevel=p.f.level;
      p.tableStart(name,align,-4,n=>{
        n.attributes=small?{'data-mjx-smallmatrix':'true',columnspacing:'0.333em',rowspacing:'.2em',...(align==='c'?{}:{columnalign:({l:'left',r:'right'} as Record<string,string>)[align]??align})}:
          {columnspacing:'1em',rowspacing:'4pt',...(align==='c'?{}:{columnalign:Array.from(align,c=>({l:'left',c:'center',r:'right'} as Record<string,string>)[c]??c).join(' ')})};
        p.append(wrapTable(p,small&&parentLevel!==1?p.node(K.mstyle,[n],'',{scriptlevel:'1'}):n,left,right));
      });
      if(small){p.f.level=1;p.f.display=false;}
    }};
  }
}
environments.crampedsubarray={begin(p,name){
  const align=raw(p.tokensArgument());p.tableStart(name,align,-4,n=>{
    n.attributes={'data-mjx-smallmatrix':'true',columnspacing:'0em',rowspacing:'0.1em','data-cramped':'true',...(align==='c'?{}:{columnalign:align==='l'?'left':'right'})};p.append(n);
  });p.f.level=1;p.f.display=false;
}};
command('crampedsubstack',p=>push(p,`\\begin{crampedsubarray}{c}${raw(p.tokensArgument())}\\end{crampedsubarray}`));
function readEnvironment(p:Parser,name:string):Token[]{
 const body:Token[]=[];let depth=0;
 for(;;){const t=p.stream.next();if(!t)p.error(`Missing \\end{${name}}`);
  if(t[0]===-1&&(spelling(t)==='begin'||spelling(t)==='end')){
   const arg=p.tokensArgument(),env=raw(arg);if(spelling(t)==='end'&&depth===0){if(env!==name)p.error(`\\begin{${name}} ended with \\end{${env}}`);break;}
   depth+=spelling(t)==='begin'?1:-1;body.push(t,...scan('{'),...arg,...scan('}'));
  }else body.push(t);
 }return body;
}
function starCasesBody(p:Parser,name:string){
 const toks=readEnvironment(p,name),out:Token[]=[];let i=0,depth=0;
 while(i<toks.length){const t=toks[i++];if(t[0]===123)depth++;if(t[0]===125)depth--;
  out.push(t);if(t[0]!==38||depth)continue;
  const text:Token[]=[];let braces=0;
  while(i<toks.length){const next=toks[i];if(!braces&&next[0]===-1&&spelling(next)==='\\')break;
   i++;if(next[0]===123)braces++;if(next[0]===125)braces--;text.push(next);
  }
  out.push(...scan('\\text{'),...scan(raw(text).trim()),...scan('}'));
 }
 p.stream.push([...out,...scan(`\\end{${name}}`)]);
}
for(const name of ['dcases','rcases','drcases','dcases*','rcases*','drcases*','cases*'])environments[name]={begin(p,name){
 const starred=name.endsWith('*'),display=name.startsWith('d'),right=name.includes('rcases');
 if(starred)starCasesBody(p,name);
 p.tableStart(name,'lll',-4,n=>{
   n.attributes={columnspacing:'1em',rowspacing:'.2em',columnalign:starred?'left':'left left',...(display?{displaystyle:'true'}:{})};
   if(starred)for(const row of n.children){const cell=row.children[1];if(cell&&(display||cell.children.length!==1||cell.children[0].kind!==K.mtext))cell.children=[p.node(K.mstyle,cell.children.flatMap(children),'',display?{displaystyle:'false'}:{})];}
   p.append(wrapTable(p,n,right?'':'{',right?'}':''));
 });p.f.display=display;
}};
interface TableExtra {shoves:Map<number,string>; rowGaps:Map<number,number>; arrowRows:Set<number>}
// Metadata belongs to the live frame/table, via a closure created at begin.

function extra(p:Parser):TableExtra {
 const t=p.f.table;if(!t)p.error('Command can only be used in aligment environments');
 let e=state(p).tables.get(t);if(!e){e={shoves:new Map(),rowGaps:new Map(),arrowRows:new Set()};state(p).tables.set(t,e);}return e;
}
environments.multlined={begin(p,name){
 let pos=option(p,'multlined-pos')||'c',width=option(p,'multlined-width');
 // Unlike other optional arguments these must be immediately adjacent.
 if(p.stream.peek()?.[0]===91){const arg=raw(p.optional()??[]);if(/^[ctb]$/.test(arg)){pos=arg;width=p.stream.peek()?.[0]===91?raw(p.optional()??[]):'';}else width=arg;}
 p.tableStart(name,'c',-4,n=>{
  const t=state(p).tables.get(table),rows=n.children;
  if(rows.length>1){const first=rows[0].children[0],last=rows.at(-1)!.children[0];
   if(t?.shoves.get(0)!=='right')first.children.push(p.node(K.mspace,[],'',{width:option(p,'firstline-afterskip')||option(p,'multlined-gap')}));
   if(t?.shoves.get(rows.length-1)!=='left')last.children.unshift(p.node(K.mspace,[],'',{width:option(p,'lastline-preskip')||option(p,'multlined-gap')}));
  }
  rows.forEach((row,i)=>{const alignment=t?.shoves.get(i)??(i===0?'left':i===rows.length-1?'right':'');if(alignment)row.children[0].attributes.columnalign=alignment;});
  n.attributes={displaystyle:'true',rowspacing:'.5em',columnwidth:'100%',...(width?{width}:{}),...(pos==='t'?{align:'baseline 1'}:pos==='b'?{align:'baseline -1'}:{})};p.append(n);
 });const table=p.f.table!;table.display=true;p.f.display=true;
}};
for(const name of ['shoveleft','shoveright'])command(name,(p,name)=>{
 if(p.f.env!=='multlined'&&p.f.env!=='multline')p.error(`\\${name} can only appear within the multline or multlined environments`);
 if(p.f.nodes.length)p.error(`\\${name} must come at the beginning of the line`);
 const shift=raw(p.optional()??[]),left=name==='shoveleft';extra(p).shoves.set(p.f.table!.rows.length,left?'left':'right');
 p.argument(n=>{if(shift){const s=p.node(K.mspace,[],'',{width:shift});p.append(p.row(left?[s,n]:[n,s],true));}else p.append(n);});
});
function alignment(p:Parser,name:string){
 const isGather=name.includes('gather'),alignat=name.includes('alignat'),pairs=alignat?Number(raw(p.tokensArgument())):0;
 const pos=raw(p.optional()??[]),gathered=name==='lgathered'||name==='rgathered';
 const align=isGather?(name==='lgathered'?'l':name==='rgathered'?'r':'c'):'rl'.repeat(pairs||1);
 p.tableStart(name,align,-4,n=>{
  const max=Math.max(1,...n.children.map(row=>row.children.length-(row.kind===K.mlabeledtr?1:0)));
  const columns=isGather?1:Math.max(alignat?pairs*2:0,max),e=state(p).tables.get(table);
  for(const [i,row] of n.children.entries()){
   if(!isGather)for(let c=1+(row.kind===K.mlabeledtr?1:0);c<row.children.length;c+=2){
    const cell=row.children[c],nodes=cell.children;
    if(nodes[0]?.kind===K.mo)nodes.unshift(p.node(K.mi));
    cell.children=[p.node(K.mstyle,nodes,'',{indentshift:'2em'})];
   }
  }
  const colalign=Array.from({length:columns},(_,i)=>isGather?(name==='lgathered'?'left':'right'):i%2?'left':'right').join(' ');
  const spacing=isGather?'1em':Array.from({length:columns-1},(_,i)=>alignat||i%2===0?'0em':'2em').join(' ');
  n.attributes={displaystyle:'true',...(!isGather||gathered?{columnalign:colalign}:{}),columnspacing:spacing,rowspacing:'3pt',
    ...(!gathered?{'data-break-align':isGather?'middle':Array.from({length:columns},(_,i)=>i%2?'top':'bottom').join(' ')}:{}),
    ...(pos==='t'?{align:'baseline 1'}:pos==='b'?{align:'baseline -1'}:{})};
  if(e?.rowGaps.size){const last=Math.max(...e.rowGaps.keys());n.attributes.rowspacing=Array.from({length:n.children.length},(_,i)=>e.rowGaps.has(i)?em(e.rowGaps.get(i)!):i<last?(i===0?'3pt':em(dimensionEm('3pt'))):String(dimensionEm('3pt'))+'em').join(' ');}
  p.append(n);
 });const table=p.f.table!;table.display=true;table.spacing='0em';p.f.display=true;
}
for(const name of ['align','align*','aligned','alignat','alignat*','alignedat','gather','gather*','gathered','lgathered','rgathered'])environments[name]={begin:alignment};
environments.spreadlines={begin(p,name){
 const spread=p.dimension();p.frame(-4,false,n=>{
   for(const item of n){if(item.kind===K.mtable)item.attributes.rowspacing=(item.attributes.rowspacing??'.5em').split(' ').map(v=>em(Math.max(0,dimensionEm(v)+dimensionEm(spread)))).join(' ');p.append(item);}
 },name);
}};
command('MoveEqLeft',p=>{const n=raw(p.optional()??scan('2'));push(p,`\\hspace{${n}em}&\\hspace{-${n}em}`);});
function tagNodes(p:Parser,tag:string,star:boolean,done:(nodes:Node[])=>void){
 if(star){done([p.node(K.mtext,[],tag)]);return;}
 const form=state(p).tagform??['(',')',''],[left,right,format='']=form;
 done([p.node(K.mtext,[],left),p.node(K.mtext,[],format?`${format}{${tag}}`:tag),p.node(K.mtext,[],right)]);
}
for(const name of ['newtagform','renewtagform'])command(name,(p,name)=>{
 const id=raw(p.tokensArgument()).trim();if(!id)p.error("Tag form name can't be empty");
 const format=raw(p.optional()??[]),left=raw(p.tokensArgument()),right=raw(p.tokensArgument());
 if(name==='newtagform'&&state(p).tagforms.has(id))p.error(`Duplicate tag form: ${id}`);
 state(p).tagforms.set(id,[left,right,format]);
});
command('usetagform',p=>{const id=raw(p.tokensArgument()).trim();if(id&&!state(p).tagforms.has(id))p.error(`Undefined tag form: ${id}`);state(p).tagform=id?state(p).tagforms.get(id)!:null;});
command('tag',p=>{
 p.stream.skip();const star=p.stream.peek()?.[0]===42;if(star)p.stream.next();
 const tag=raw(p.tokensArgument()),table=p.tagTable()??p.f.table,label=p.label||table?.labels[table.rows.length]||'';
 const id='mjx-eqn:'+((p.options.useLabelIds!==false?label:'')||tag).replace(/\s/g,'_');
 if(label)p.localLabels.set(label,{tag,id});
 tagNodes(p,tag,star,nodes=>{
  const cell=p.node(K.mtd,nodes,'',{id});
  if(table)table.tagCells.set(table.rows.length,cell);
  else {const root=p.frames[0],done=root.done;root.done=nodes=>done([p.node(K.mtable,[p.node(K.mlabeledtr,[cell,p.node(K.mtd,nodes)])],'',{displaystyle:'true'})]);}
 });
});
command('refeq',p=>p.reference(raw(p.tokensArgument())));
command('boxed',p=>p.argument(n=>p.append(p.node(K.menclose,[p.atom([p.atom(children(n))])],'',{notation:'box'}))));


function endCell(p:Parser){const t=p.f.table!;p.finishCell(t,p.f.nodes);p.f.nodes=[];}
function endRow(p:Parser){const t=p.f.table!;t.rows.push(t.cells);t.cells=[];}
function requireAlignment(p:Parser,name:string){if(!p.f.table||!/(?:align|gather)/.test(p.f.env))p.error(`\\${name} can only be used in aligment environments`);}
command('ArrowBetweenLines',p=>{
 requireAlignment(p,'ArrowBetweenLines');const t=p.f.table!;
 if(p.f.nodes.length||t.cells.length)p.error('\\ArrowBetweenLines must be on a row by itself');
 p.stream.skip();const star=p.stream.peek()?.[0]===42;if(star){p.stream.next();endCell(p);endCell(p);}
 const symbol=raw(p.optional()??scan('\\Updownarrow'));
 p.parseTokens(scan(star?'\\quad '+symbol:symbol+'\\quad'),n=>{p.f.nodes.push(...children(n));endCell(p);endRow(p);});
});
function flushAbove(p:Parser){requireAlignment(p,'MTFlushSpaceAbove');const t=p.f.table!;if(t.rows.length)extra(p).rowGaps.set(t.rows.length-1,Math.max(0,dimensionEm('3pt')-dimensionEm(option(p,'shortvdotsadjustabove'))));}
function flushBelow(p:Parser){requireAlignment(p,'MTFlushSpaceBelow');const t=p.f.table!;if(p.f.nodes.length)endCell(p);endRow(p);extra(p).rowGaps.set(t.rows.length-1,Math.max(0,dimensionEm('3pt')-dimensionEm(option(p,'shortvdotsadjustbelow'))));}
function vdotsWithin(p:Parser,done:()=>void=()=>{}){
 const tokens=p.tokensArgument();p.parseTokens(tokens,n=>{
  const phantom=p.node(K.mphantom,[p.node(K.mi),...children(n),p.node(K.mi)]);
  p.append(p.node(K.mpadded,[p.node(K.mpadded,[p.node(K.mo,[],'⋮')],'',{width:'0',lspace:'-.5width'}),phantom],'',{lspace:'.5width'}));done();
 });
}
command('vdotswithin',p=>vdotsWithin(p));
command('shortvdotswithin',p=>{
 p.stream.skip();const star=p.stream.peek()?.[0]===42;if(star)p.stream.next();
 if(p.f.table){flushAbove(p);if(!star)endCell(p);}
 vdotsWithin(p,()=>{if(p.f.table){if(star)endCell(p);flushBelow(p);}});
});
command('MTFlushSpaceAbove',flushAbove);
command('MTFlushSpaceBelow',flushBelow);
function aboxed(p:Parser,box='boxed',math=true){
 requireAlignment(p,'Aboxed');if(p.f.table!.cells.length%2)endCell(p);
 const tokens=p.tokensArgument(),parts:Token[][]=[[]];let depth=0;
 for(const t of tokens){if(t[0]===123)depth++;if(t[0]===125)depth--;if(!depth&&t[0]===38)parts.push([]);else parts.at(-1)!.push(t);}
 const left=raw(parts[0]),right=raw(parts[1]??[]),body=left+'{}'+right;
 const content=math?body:'$\\displaystyle{'+body+'}$';
 push(p,`\\rlap{\\${box}{${content}}}\\kern.267em\\phantom{${left}}&\\phantom{{}${right}}\\kern.267em`);
}
command('Aboxed',p=>aboxed(p));
command('MTAboxed',p=>{const box=raw(p.tokensArgument()),math=raw(p.tokensArgument())==='true';aboxed(p,box,math);});
command('MakeAboxedCommand',p=>{
 p.stream.skip();const star=p.stream.peek()?.[0]===42;if(star)p.stream.next();
 const name=raw(p.tokensArgument()).replace(/^\\/,''),box=raw(p.tokensArgument()).replace(/^\\/,'');
 if(p.macros.has(name)||p.configuration.extensions.has(name))p.error(`\\${name} is already defined`);
 macro(p,name,`\\MTAboxed{${box}}{${star}}`);
});
command('sideset',p=>{
 const left=p.tokensArgument(),right=p.tokensArgument(),base=p.tokensArgument();
 p.parseTokens(left,l=>p.parseTokens(right,r=>p.parseTokens(base,b=>{
  const scripts=(n:Node):[Node,Node]=>n.kind===K.msub?[n.children[1],p.node(K.none)]:n.kind===K.msup?[p.node(K.none),n.children[1]]:n.kind===K.msubsup?[n.children[1],n.children[2]]:[p.node(K.none),p.node(K.none)];
  const ls=scripts(l),rs=scripts(r),post=rs.some(n=>n.kind!==K.none);
  const multi=p.node(K.mmultiscripts,[b,...(post?rs:[]),p.node(K.mprescripts),...ls],'',{'data-mjx-script-align':'left'});
  const n=p.atom([multi,...(post?[]:children(r))],'OP');n.op=1;n.limits=1;p.append(n);
 })));
});
command('bbox',p=>{
 const opts=raw(p.optional()??[]).split(',').map(s=>s.trim()),attrs:Record<string,string>={},pad:Record<string,string>={};
 for(const opt of opts){if(!opt)continue;if(/^[\d.]+(?:px|em|pt|ex)$/.test(opt)){pad.height='+'+opt;pad.depth='+'+opt;pad.lspace=opt;pad.width='+'+(2*parseFloat(opt))+opt.replace(/[\d.]/g,'');}else if(opt.includes(':'))attrs.style=opt;else attrs.mathbackground=opt;}
 p.argument(n=>p.append(p.node(K.mstyle,[Object.keys(pad).length?p.node(K.mpadded,children(n),'',pad):n],'',attrs)));
});
export const bboxDependency:TexPackage={name:'bbox',commands:{bbox:commands.bbox},environments:{},configurationModules:['input/tex/bbox/BboxConfiguration.js']};


command('phantom',p=>p.argument(n=>p.append(p.atom([p.node(K.mphantom,children(n))]))));
command('fbox',p=>{
 const tokens=p.tokensArgument(),display=p.f.display;
 p.frame(-2,false,n=>{
  if(display)for(const atom of n){const child=atom.children[0];if(child?.kind===K.mstyle&&child.attributes.displaystyle==='true'&&Object.keys(child.attributes).length===1)atom.children=child.children;}
  p.append(p.node(K.menclose,n,'',{notation:'box'}));
 });
 p.stream.push([[0,0,0,'']]);p.renderText(tokens,p.f.font,false);
});
command('framebox',p=>{
 const width=p.optional(),pos=width?raw(p.optional()??scan('c')):'c',tokens=p.tokensArgument();
 const a:Record<string,string>={...(width?{width:raw(width)}:{}),'data-align':({l:'left',r:'right',c:'center'} as Record<string,string>)[pos.toLowerCase()]??'center',...(pos===pos.toUpperCase()?{'data-overflow':'linebreak'}:{})};
 const content=raw(tokens)?[p.text(tokens)]:[];
 const n=width?p.node(K.mpadded,content,'',a):p.row(content);
 p.append(p.atom([p.node(K.menclose,[n],'',{notation:'box'})]));
});
const characters={':':commands[':']};delete commands[':'];
export default {name:'mathtools',commands,characters,environments,initialize,
 configurationModules:['input/tex/mathtools/MathtoolsConfiguration.js','input/tex/bbox/BboxConfiguration.js'],
 options:['mathtools'],
} satisfies TexPackage;
