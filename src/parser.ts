import {K, ParseError, expose} from './ast.js';
import type {Node, ParseOptions, MathMLNode} from './ast.js';
import {scan, Stream, spelling, builtin, raw, letter, space} from './scanner.js';
import type {Token, Macro} from './scanner.js';
import {preamble} from './preamble.js';
import type {Preamble} from './preamble.js';
import {C, definitions,operators,ranges} from './symbols.js';

type Attrs=Record<string,string>;
interface Frame {nodes:Node[];stop:number;single:boolean;done:(nodes:Node[])=>void;font:string;multi:boolean;level:number;display:boolean;env:string;table:Table|null;fraction:{num:Node[];attrs:Attrs;left:string;right:string}|null}
interface Table {rows:Node[][];cells:Node[];align:string;spacing:string;rowspacing:string;display:boolean;lines:string[];rowlines:string[];frame:string;top:string;bottom:string;position:string;latex:boolean;plan:Preamble;originalFont:string;fill:string;rowBreak:Record<number,string>;cellBreak:Record<string,string>;tableBreak:boolean;labels:string[];noNumbers:Set<number>;rowspaces:string[]}
const NS='http://www.w3.org/1998/Math/MathML';
const relationChars=new Set(Array.from('=<>≠≤≥≈∼≃≅≍≡∝∈∉∋⊂⊃⊆⊇⊢⊣⊨≺≻⪯⪰←→↔⇒⇐⇔'));
const stretchyChars=new Set(Array.from('()[]{}|‖⌈⌉⌊⌋⟨⟩⎰⎱/\\↑↓↕⇑⇓⇕←→↔⇒⇐⇔∼⏜⏝⏞⏟'));
const fenceChars=new Set(Array.from('()[]{}|‖⌈⌉⌊⌋⟨⟩⎰⎱⟮⟯'));
const negated:Record<string,string>={'=':'≠','<':'≮','>':'≯','≤':'≰','≥':'≱','→':'↛','←':'↚','↔':'↮','⇒':'⇏','⇐':'⇍','⇔':'⇎','∈':'∉','∋':'∌','∼':'≁','≃':'≄','≅':'≇','≈':'≉','≡':'≢','⊂':'⊄','⊃':'⊅','⊆':'⊈','⊇':'⊉'};
const accents:Record<string,string>={acute:'´',grave:'`',ddot:'¨',dddot:'⃛',ddddot:'⃜',tilde:'~',bar:'¯',breve:'˘',check:'ˇ',hat:'^',vec:'→',dot:'˙',widetilde:'~',widehat:'^'};
const underover:Record<string,string>={overline:'¯',underline:'_',overbrace:'⏞',underbrace:'⏟',overparen:'⏜',underparen:'⏝',overrightarrow:'→',underrightarrow:'→',overleftarrow:'←',underleftarrow:'←',overleftrightarrow:'↔',underleftrightarrow:'↔'};
const isDigit=(c:number)=>c>=48&&c<=57;
const same=(a:Token|undefined,b:Token)=>!!a&&a[0]===b[0]&&spelling(a)===spelling(b);

class Parser {
  readonly stream:Stream;
  readonly macros=new Map<string,Macro>();
  readonly environments=new Map<string,{begin:Macro;end:Macro}>();
  readonly frames:Frame[]=[];
  nodes=0;expansions=0;position=0;
  readonly columns=new Map<string,{count:number;body:string}>();label='';numbered=false;
  readonly envStack:string[]=[];hsize='';inline=false;nonscript=false;pendingBreak='';
  result:Node[]=[];
  constructor(readonly tex:string,readonly options:ParseOptions){
    this.stream=new Stream(scan(tex,options.maxTokens??200000),options.maxTokens??200000);
    for(const [name,value] of Object.entries(options.macros??{})){const [body,count=0,opt]=typeof value==='string'?[value]:value;this.macros.set(name,{body:scan(body),count,optional:opt===undefined?null:scan(opt),prefix:[],delimiters:[]});}
    this.frame(0,false,n=>{this.result=n;});
  }
  error(message:string):never {throw new ParseError(message,this.position);}
  node(kind:K,children:Node[]=[],text='',attributes:Attrs={},start=this.position):Node {
    if(++this.nodes>(this.options.maxNodes??100000))this.error('Node limit exceeded');
    return {kind,attributes,children,text,start,op:0,limits:0,relation:kind===K.mo&&relationChars.has(text),fixed:false,rawAttrs:false};
  }
  row(nodes:Node[],force=false):Node {return !force&&nodes.length===1?nodes[0]:this.node(K.mrow,nodes);}
  get f(){return this.frames[this.frames.length-1];}
  frame(stop:number,single:boolean,done:(nodes:Node[])=>void,env='',table:Table|null=null){
    if(this.frames.length>=(this.options.maxDepth??1024))this.error('Nesting limit exceeded');
    const p=this.f;this.frames.push({nodes:[],stop,single,done,font:p?.font??'',multi:p?.multi??false,level:p?.level??0,display:p?.display??(this.options.display??false),env,table,fraction:null});
  }
  append(n:Node){if(this.pendingBreak){const value=this.pendingBreak;this.pendingBreak='';if(n.kind===K.mo&&operator(n.text)?.[3]?.linebreakstyle!=='after')n.attributes.linebreak=value;else this.f.nodes.push(this.node(K.mspace,[],'',value==='auto'?{}:{linebreak:value}));}if(this.nonscript){this.nonscript=false;if(this.f.level>0&&(n.kind===K.mspace||n.kind===K.mstyle&&n.children[0]?.kind===K.mspace))return;}if(this.f.table?.bottom)this.f.table.bottom='';this.f.nodes.push(n);}
  close(){const f=this.f;if(this.pendingBreak){const value=this.pendingBreak;this.pendingBreak='';f.nodes.push(this.node(K.mspace,[],'',value==='auto'?{}:{linebreak:value}));}let nodes=f.nodes;
    if(f.fraction){const x=f.fraction;let frac=this.node(K.mfrac,[this.row(x.num),this.row(nodes)],'',x.attrs);if(x.left||x.right){const size=this.f.level===0?'2.047em':'1.2em';frac=this.row([this.row([this.delimiterNode(x.left,size)],true),frac,this.row([this.delimiterNode(x.right,size)],true)],true);}nodes=[frac];}
    this.frames.pop();f.done(nodes);
  }
  argument(done:(n:Node)=>void,keepGroup=false){
    this.stream.skip();const t=this.stream.peek();if(!t)this.error('Missing argument');
    if(t[0]===123){this.stream.next();this.frame(125,false,n=>done(this.row(n,keepGroup)));}
    else this.frame(0,true,n=>done(this.row(n)));
  }
  args(count:number,done:(nodes:Node[])=>void){const values:Node[]=[];const next=()=>{if(values.length===count)done(values);else this.argument(n=>{values.push(n);next();});};next();}
  tokensArgument(name=''):Token[]{
    this.stream.skip();const first=this.stream.next();if(!first)this.error(`Missing argument for ${name}`);
    if(first[0]!==123)return [first];const result:Token[]=[];let depth=1;
    while(depth){const t=this.stream.next();if(!t)this.error('Missing close brace');if(t[0]===123)depth++;if(t[0]===125)depth--;if(depth)result.push(t);}
    return result;
  }
  optional():Token[]|null {this.stream.skip();if(this.stream.peek()?.[0]!==91)return null;this.stream.next();const out:Token[]=[];let depth=0;
    for(;;){const t=this.stream.next();if(!t)this.error("Couldn't find closing ']' for argument");if(t[0]===93&&depth===0)return out;if(t[0]===123)depth++;if(t[0]===125)depth--;out.push(t);}
  }
  parseTokens(tokens:readonly Token[],done:(n:Node)=>void){this.stream.push([[0,0,0,'']]);this.stream.push(tokens);this.frame(-2,false,n=>done(this.row(n)));}
  substitute(m:Macro,args:readonly Token[][]):Token[]{const out:Token[]=[];
    for(let i=0;i<m.body.length;i++){const t=m.body[i];if(t[0]!==35){out.push(t);continue;}const n=m.body[++i];if(n?.[0]===35)out.push(n);else {const index=n?n[0]-49:-1;if(index<0||index>=args.length)this.error('Illegal macro parameter reference');for(const value of args[index]){if(out.length>=(this.options.maxTokens??200000))this.error('Token limit exceeded');out.push(value);}}if(out.length>(this.options.maxTokens??200000))this.error('Token limit exceeded');}return out;
  }
  expand(m:Macro){if(++this.expansions>(this.options.maxExpansions??10000))this.error('Macro expansion limit exceeded');
    this.stream.skip();for(const t of m.prefix){if(!same(this.stream.next(),t))this.error("Use of macro doesn't match its definition");}
    const args:Token[][]=[];if(m.optional)args.push(this.optional()??[...m.optional]);
    for(let i=args.length;i<m.count;i++){const delim=m.delimiters[i]??[];if(!delim.length){args.push(this.tokensArgument());continue;}
      const value:Token[]=[];let depth=0;
      for(;;){const t=this.stream.next();if(!t)this.error('Missing macro argument delimiter');value.push(t);if(t[0]===123)depth++;if(t[0]===125)depth--;if(depth===0&&value.length>=delim.length&&delim.every((x,j)=>same(value[value.length-delim.length+j],x))){value.length-=delim.length;break;}}
      if(value[0]?.[0]===123&&value.at(-1)?.[0]===125){let d=0,whole=true;for(let k=0;k<value.length-1;k++){if(value[k][0]===123)d++;if(value[k][0]===125)d--;if(d===0)whole=false;}if(whole){value.shift();value.pop();}}
      args.push(value);
    }
    this.stream.push(this.substitute(m,args));
  }
  define(id:number){
    const env=id===C.newenvironment||id===C.renewenvironment;
    const name=raw(this.tokensArgument()).trim().replace(/^\\/,'');
    if(id===C.let){this.stream.skip();if(this.stream.peek()?.[0]===61)this.stream.next();this.stream.skip();const token=this.stream.next();if(!token)this.error('Missing let value');
      const old=token[0]===-1?this.macros.get(spelling(token)):undefined;
      // Snapshot aliases to builtins as source tokens whose names are private to
      // this parse: later redefinition of the original cannot change a let.
      if(old)this.macros.set(name,old);else {const frozen:Token=token[0]===123||token[0]===125?token:token[0]===-1?[-3,token[1],token[2],token[3]]:stretchyChars.has(spelling(token))||'<>'.includes(spelling(token))?[-5,token[1],token[2],token[3]]:token;this.macros.set(name,{body:[frozen],count:0,optional:null,prefix:[],delimiters:[]});}return;
    }
    let count=0,optional:Token[]|null=null,prefix:Token[]=[],delimiters:Token[][]=[];
    if(id===C.def){let part:Token[]=[];this.stream.skip();while(this.stream.peek()&&this.stream.peek()![0]!==123){const t=this.stream.next()!;if(t[0]===35){const n=this.stream.next();if(!n||n[0]!==49+count)this.error('Parameters must be numbered sequentially');if(count===0)prefix=part;else delimiters[count-1]=part;part=[];count++;}else part.push(t);}if(count)delimiters[count-1]=part.every(t=>space(t[0]))&&delimiters.every(x=>!x.length)?[]:part;else prefix=part;}
    else {const n=this.optional();if(n){count=Number(raw(n));if(!Number.isInteger(count)||count<0||count>9)this.error('Illegal number of parameters');optional=this.optional();}}
    const body=this.tokensArgument();const macro:Macro={body,count,optional,prefix,delimiters};
    if(env)this.environments.set(name,{begin:macro,end:{body:this.tokensArgument(),count:0,optional:null,prefix:[],delimiters:[]}});else this.macros.set(name,macro);
  }
  delimiter():string {this.stream.skip();let t=this.stream.next();if(t?.[0]===123){t=this.stream.next();if(this.stream.next()?.[0]!==125)this.error('Missing close brace');}if(!t)this.error('Missing delimiter');
    for(let i=0;i<30;i++){if(t![0]!==-1&&t![0]!==-3)break;const m:Macro|undefined=t![0]===-1?this.macros.get(spelling(t!)):undefined;if(m?.body.length===1){t=m.body[0];continue;}const d=definitions[commandId(t!)];if(d?.char)return d.char==='<'?'⟨':d.char==='>'?'⟩':d.char;this.error(`Unknown delimiter \\${spelling(t!)}`);}
    const s=spelling(t!);if(s==='.')return '';if(s==='<')return '⟨';if(s==='>')return '⟩';if(!stretchyChars.has(s))this.error(`Missing or unrecognized delimiter for ${s}`);return s;
  }
  delimiterNode(text:string,big=''):Node {const a:Attrs={};if(!text)Object.assign(a,{fence:'true',stretchy:'true',symmetric:'true'});else if(!fenceChars.has(text)&&text!=='<'&&text!=='>')Object.assign(a,{fence:'true',symmetric:'true',...['⏐','⏪','⎪','/','\\'].includes(text)?{stretchy:'true'}:{}});if(big)Object.assign(a,{minsize:big,maxsize:big,...text==='|'||text==='‖'?{fence:'true',stretchy:'true',symmetric:'true'}:{}});return this.node(K.mo,[],text,a);}
  symbol(t:Token,id:number){const d=definitions[id];const attrs:Attrs={};let kind=K.mo;const text=d.char!;
    if(d.type==='lcGreek'){kind=K.mi;attrs.mathvariant='italic';}
    else if(d.type==='ucGreek'){kind=K.mi;attrs.mathvariant=this.f.font||'normal';}
    else if(d.type==='mathchar0mi'){kind=K.mi;attrs.mathvariant=String(d.attrs?.mathvariant??(d.attrs&&Object.keys(d.attrs).length?'':'italic'));if(!attrs.mathvariant)delete attrs.mathvariant;}
    else if(d.type==='mathchar7'){kind=K.mi;attrs.mathvariant=this.f.font||String(d.attrs?.mathvariant??'normal');}
    else if(d.type==='delimiter'){if(fenceChars.has(text))attrs.fence='false';attrs.stretchy='false';}
    if(kind===K.mo&&stretchyChars.has(text))attrs.stretchy='false';
    for(const [k,v] of Object.entries(d.attrs??{})){if(['mathvariant','largeop','movablelimits','symmetric'].includes(k))attrs[k]=String(v);}
    if(d.attrs?.variantForm)attrs['data-mjx-alternate']='1';if(nameOf(id)==='to')attrs.accent='false';
    if(kind===K.mi&&attrs.mathvariant==='italic'&&Array.from(text).length===1)delete attrs.mathvariant;
    const n=this.node(kind,[],text,attrs,t[1]-1);n.limits=d.attrs?.movesupsub?1:0;n.fixed=kind===K.mo;return n;
  }
  character(t:Token){const s=spelling(t),c=t[0];let kind:K=letter(c)?K.mi:K.mo;let text=s;const attrs:Attrs={};
    if(c>127){const cp=s.codePointAt(0)!;const range=ranges.find(r=>cp>=r[0]&&cp<=r[1]);if(range){kind=range[3]==='mi'?K.mi:K.mo;if(range[4])attrs.mathvariant=range[4];}if(kind===K.mi&&(c>=0x391&&c<=0x3a9||c>=0x3000&&c<0xd800))attrs.mathvariant='normal';}
    if(c===45)text='−';if(c===42)text='∗';if(c===96)text='‘';
    if(kind===K.mo&&stretchyChars.has(text))attrs.stretchy='false';
    if(this.f.font)attrs.mathvariant=this.f.font;
    const n=this.node(kind,[],text,attrs,t[1]);n.fixed=kind===K.mo;return n;
  }
  number(t:Token):Node {let text=spelling(t);const decimal=this.options.decimalSeparator===','?44:46;
    while(!this.f.single){const next=this.stream.peek();if(!next)break;if(isDigit(next[0])){text+=spelling(this.stream.next()!);continue;}
      if(next[0]===123){
        const open=this.stream.next()!,group:Token[]=[];let depth=1,close:Token|undefined;
        while(depth){const token=this.stream.next();if(!token)this.error('Missing close brace');if(token[0]===123)depth++;if(token[0]===125)depth--;if(depth)group.push(token);else close=token;}
        if(group.length===1&&group[0][0]===(decimal===44?46:44)){
          const digits:Token[]=[];for(let i=0;i<3&&isDigit(this.stream.peek()?.[0]??0);i++)digits.push(this.stream.next()!);
          if(digits.length===3){text+=spelling(group[0])+raw(digits);if(isDigit(this.stream.peek()?.[0]??0))break;continue;}
          this.stream.push([open,...group,close!,...digits]);
        }else this.stream.push([open,...group,close!]);
        break;
      }
      if(next[0]===decimal&&!text.includes(String.fromCharCode(decimal))){this.stream.next();if(isDigit(this.stream.peek()?.[0]??0)){text+=String.fromCharCode(decimal);continue;}this.stream.push([next]);}break;}
    return this.node(K.mn,[],text,this.f.font?{mathvariant:this.f.font}:{},t[1]);
  }
  script(sup:boolean,prime=false){let base=this.f.nodes.pop()??this.node(K.mi);const target=base;
    const add=(arg:Node)=>{let b=target,sub:Node|undefined,top:Node|undefined;const under=b.limits!==0&&(b.kind===K.munder||b.kind===K.mover||b.kind===K.munderover);
      if([K.msub,K.msup,K.msubsup].includes(b.kind)||b.limits!==0&&[K.munder,K.mover,K.munderover].includes(b.kind)){if(b.kind===K.msub||b.kind===K.munder)sub=b.children[1];else if(b.kind===K.msup||b.kind===K.mover)top=b.children[1];else {sub=b.children[1];top=b.children[2];}b=b.children[0];}
      if(sup){if(top&&!prime){if(top.kind===K.mo&&top.attributes['data-mjx-alternate']){top.attributes['data-mjx-pseudoscript']='true';arg=this.row([top,arg],true);}else this.error('Double exponent: use braces to clarify');top=arg;}else top=top?this.row([top,arg],true):arg;}else{if(sub)this.error('Double subscripts: use braces to clarify');sub=arg;}
      const useUnder=b.limits>0&&(this.f.display||b.limits===2)||under;
      const k=sub&&top?(useUnder?K.munderover:K.msubsup):sub?(useUnder?K.munder:K.msub):(useUnder?K.mover:K.msup);
      const n=this.node(k,[b,...sub?[sub]:[],...top?[top]:[]],'',{},b.start);n.op=b.op;n.limits=b.limits;this.append(n);
    };
    if(prime){let count=1;while([39,0x2019].includes(this.stream.peek()?.[0]??0)){this.stream.next();count++;}add(this.node(K.mo,[],['','′','″','‴','⁗'][count]??'′'.repeat(count),{'data-mjx-alternate':'1'}));}
    else {const level=this.f.level;this.argument(n=>{add(n);},true);this.f.level=level+1;this.f.display=false;}
  }
  dimension():string {this.stream.skip();if(this.stream.peek()?.[0]===123)return raw(this.tokensArgument()).replace(',','.').trim();let s='';while(this.stream.peek()){const t=this.stream.peek()!;if(t[0]===-1||t[0]===123||t[0]===125)break;const c=t[0];if(space(c)){this.stream.next();if(s)break;continue;}if(isDigit(c)||letter(c)||c===45||c===43||c===46||c===44){s+=spelling(this.stream.next()!);if(/[a-z]{2}$/i.test(s))break;}else break;}if(!s)this.error('Missing dimension');return s.replace(',','.');}
  text(tokens:Token[],font=''):Node {let text=raw(tokens).replace(/\\U\{([0-9a-fA-F]+)\}/g,(_,hex)=>String.fromCodePoint(parseInt(hex,16))).replace(/\\([{}%$#_& \\])/g,'$1').replace(/~/g,'\u00a0');if(text.startsWith(' '))text='\u00a0'+text.slice(1);if(text.endsWith(' '))text=text.slice(0,-1)+'\u00a0';return this.node(K.mtext,[],text,font?{mathvariant:font}:{});}
  renderText(tokens:Token[],font='',style=false){
    const parts:{math:boolean;tokens:Token[]}[]=[];let current:Token[]=[],math=false,depth=0;
    for(const t of tokens){const name=t[0]===-1?spelling(t):'';const delimiter=t[0]===36&&depth===0||name==='('||name===')';
      if(delimiter){parts.push({math,tokens:current});current=[];math=!math;continue;}if(t[0]===123)depth++;if(t[0]===125)depth--;current.push(t);
    }parts.push({math,tokens:current});if(math)this.error('Unclosed math delimiter in text');
    const nodes:Node[]=[];let index=0;const display=this.f.display;
    const next=()=>{while(index<parts.length){const p=parts[index++];if(!p.tokens.length)continue;if(p.math){this.parseTokens(p.tokens,n=>{nodes.push(n.kind===K.mrow?n:this.row([n],true));next();});this.f.font='';this.f.display=false;return;}nodes.push(this.text(p.tokens,font));}
      let n=nodes.length===1?nodes[0]:this.row(nodes,true);if(style&&display)n=this.node(K.mstyle,n.kind===K.mrow?n.children:[n],'',{displaystyle:'false'});this.append(n);
    };next();
  }
  tableStart(name:string,align:string,stop:number,done?:(n:Node)=>void){const t:Table={rows:[],cells:[],align,spacing:'1em',rowspacing:'4pt',display:name==='darray'||name==='eqnarray'||name.includes('eqalign'),lines:[],rowlines:[],frame:'',top:'',bottom:'',position:'',latex:stop===-4,plan:preamble(align,this.options.maxTokens??200000,this.columns),originalFont:this.f.font,fill:'',rowBreak:{},cellBreak:{},tableBreak:true,labels:[],noNumbers:new Set(),rowspaces:[]};
    if(name==='eqnarray'||name.includes('eqalign')){t.spacing=name==='eqnarray'?'0em 0.278em':'0.278em';t.rowspacing='.5em';}
    if(name==='cases'){t.spacing='1em';t.rowspacing='.2em';}
    this.frame(stop,false,n=>{if(n.length||t.cells.length){this.finishCell(t,n);t.rows.push(t.cells);}if(t.rows.length>1&&t.bottom&&n.length){t.bottom='';}this.completeTable(t,name,done??(n=>this.append(n)));},name,t);this.f.display=t.display;if(t.latex)this.startCell(t);
  }
  startCell(t:Table){const real=t.plan.columns.filter(c=>c.insert===null);const col=real[t.cells.length%real.length];if(col?.before.length&&builtin(this.stream.peek()??[0,0,0,''])!==C.end)this.stream.push(col.before);}
  finishCell(t:Table,nodes:Node[]){const real=t.plan.columns.filter(c=>c.insert===null);const col=real[t.cells.length%real.length];if(col?.after.length){for(const token of col.after){if(space(token[0]))continue;nodes.push(this.character(token));}}const a:Attrs={};if(t.fill){a.columnalign=t.fill;t.fill='';}const key=t.rows.length+':'+t.cells.length;if(t.cellBreak[key])a['data-vertical-align']=t.cellBreak[key];if(col?.width&&col.width!=='auto'){const text=this.node(K.mtext,[],nodeText(nodes));nodes=[this.node(K.mpadded,[text],'',{'data-mjx-vbox':col.vertical||'top',width:col.width,'data-overflow':'auto','data-align':col.align,'data-vertical-align':col.vertical||'top'})];}if(t.align==='ll'&&t.cells.length===1&&nodes[0]?.kind!==K.mtext)nodes=[this.node(K.mtext,[],nodeText(nodes))];t.cells.push(this.node(K.mtd,nodes,'',a));}
  completeTable(t:Table,name:string,done:(n:Node)=>void){
    const inserts=t.plan.columns.map((c,i)=>({c,i})).filter(x=>x.c.insert!==null);let row=0,insert=0;
    const next=()=>{while(row<t.rows.length){if(insert===inserts.length){insert=0;row++;continue;}const {c,i}=inserts[insert++];this.parseTokens(c.insert!,n=>{const cell=this.node(K.mtd,n.kind===K.mrow?n.children:[n]);const following=t.rows[row][i];if(following&&!following.children.length&&following.attributes.columnalign){cell.attributes.columnalign=following.attributes.columnalign;delete following.attributes.columnalign;}t.rows[row].splice(i,0,cell);next();});return;}done(this.tableNode(t,name));};next();
  }
  labelCell(label:string,n:number){return this.node(K.mtd,[this.node(K.mtext,[],'('),this.node(K.mtext,[],String(n)),this.node(K.mtext,[],')')],'',{id:'mjx-eqn:'+label});}
  tableNode(t:Table,name:string):Node {const cols=t.plan.columns.map(c=>({left:'l',right:'r',center:'c'})[c.align]).join('')||'c';const attrs:Attrs={columnspacing:t.spacing,rowspacing:t.rowspacing,columnalign:Array.from(cols,c=>({l:'left',c:'center',r:'right'})[c]!).join(' ')};
    if(!['matrix','array','pmatrix','cases'].includes(name)||name==='array'&&t.align!=='c')attrs.displaystyle=String(t.display);
    else attrs.displaystyle=String(t.display);
    if(name==='matrix'||name==='pmatrix')attrs.columnalign='center';
    if(t.plan.columns.slice(1).some(c=>c.separator))attrs.columnlines=t.plan.columns.slice(1).map(c=>c.separator==='|'?'solid':c.separator===':'?'dashed':'none').join(' ');
    if(t.plan.columns.some(c=>c.width!=='auto'))attrs.columnwidth=t.plan.columns.map(c=>c.width).join(' ');
    if(t.plan.columns.some(c=>c.insert)){attrs.columnspacing=t.plan.columns.slice(1).map((c,i)=>t.plan.columns[i].insert?t.plan.columns[i].gap:c.insert?c.gap:'1em').join(' ');if(t.plan.columns.at(-1)?.insert!==null)attrs.columnspacing+=' '+t.plan.columns.at(-1)!.gap;if(t.plan.padding)attrs['data-array-padding']=t.plan.padding;}
    if(t.rowlines.slice(0,t.rows.length-1).some(Boolean))attrs.rowlines=Array.from({length:t.rows.length-1},(_,i)=>t.rowlines[i]??'none').join(' ');
    if(t.rowspaces.length)attrs.rowspacing=Array.from({length:Math.max(t.rows.length,t.rowspaces.length)},(_,i)=>t.rowspaces[i]??'0.4em').join(' ');
    const edge=t.plan.left,last=t.plan.right;let frame='';if(edge==='|'&&last==='|'&&t.top==='solid'&&t.bottom==='solid')frame='solid';else if(edge===':'&&last===':'&&t.top==='solid'&&t.bottom==='solid')frame='dashed';if(frame){delete attrs['data-frame-styles'];attrs.frame=frame;attrs.framespacing=t.latex?'.5em .125em':'.2em .125em';}
    if(t.position)attrs.align=t.position;
    if(name==='displaylines'){attrs.displaystyle='true';attrs.rowspacing='.5em';}
    if(name==='eqnarray'){const count=Math.max(...t.rows.map(r=>r.length));attrs.columnalign=Array.from({length:count},(_,i)=>['right','center','left'][i%3]).join(' ');attrs.columnspacing=Array.from({length:count-1},(_,i)=>i%2===0?'0em':'0.278em').join(' ');attrs['data-break-align']=Array.from({length:count},(_,i)=>['bottom','middle','top'][i%3]).join(' ');attrs.rowspacing='3pt';if(!t.tableBreak)delete attrs['data-break-align'];}
    if(attrs.columnalign==='center')delete attrs.columnalign;if(attrs.displaystyle==='false')delete attrs.displaystyle;
    if(name==='array'||name==='matrix'||name==='pmatrix'||name==='cases'){attrs['data-frame-styles']='';attrs.framespacing=t.latex?'.5em .125em':'.2em .125em';}
    if(name==='leqalignno')attrs.side='left';
    const table=this.node(K.mtable,t.rows.map((c,rowIndex)=>{if(name==='eqnarray'){for(let i=0;i<c.length;i++){if(i%3===1)c[i].children.unshift(this.node(K.mi));if(i%3===2)c[i].children=[this.node(K.mstyle,c[i].children,'',{indentshift:'.7em'})];}}if(name==='eqalignno'||name==='leqalignno'){const label=c.pop()??this.node(K.mtd);return this.node(K.mlabeledtr,[label,...c]);}if(name==='eqnarray'&&(t.labels[rowIndex]!==undefined||!t.noNumbers.has(rowIndex)&&this.numbered))return this.node(K.mlabeledtr,[this.labelCell(t.labels[rowIndex]??String(rowIndex+1),rowIndex+1),...c]);return this.node(K.mtr,c,'',t.rowBreak[rowIndex]?{'data-break-align':t.rowBreak[rowIndex]}:{});}),'',attrs);
    let result:Node=table;
    const sides:string[]=[];if(edge==='|'||edge===':')sides.push('left');if(last==='|'||last===':')sides.push('right');if(t.top)sides.push('top');if(t.bottom)sides.push('bottom');
    if(frame==='solid')delete table.attributes['data-frame-styles'];
    if(frame==='dashed'||edge==='|'&&last===':'||edge===':'&&last==='|'){delete table.attributes.frame;table.attributes['data-frame-styles']=[t.top||'none',last===':'?'dashed':last==='|'?'solid':'none',t.bottom||'none',edge===':'?'dashed':edge==='|'?'solid':'none'].join(' ');return table;}
    if(sides.length&&!frame){const enclose=this.node(K.menclose,[table],'',{notation:sides.join(' '),'data-padding':'0'});table.attributes.framespacing=t.latex?'.5em .125em':'.2em .125em';result=enclose;}
    if(name==='pmatrix')result=this.row([this.delimiterNode('('),result,this.delimiterNode(')')],true);
    if(name==='cases')result=this.row([this.delimiterNode('{'),result,this.delimiterNode('')],true);
    return result;
  }
  run():MathMLNode {
    while(this.frames.length){while(this.f?.single&&this.f.nodes.length)this.close();if(!this.frames.length)break;
      const t=this.stream.next();if(!t){if(this.frames.length!==1)this.error(this.f.env?`Missing \\end{${this.f.env}}`:'Missing close brace');this.close();break;}this.position=t[1];const c=t[0];
      if(c===0&&this.f.stop===-2){this.close();continue;}
      if(c===this.f.stop){this.close();continue;}
      if(space(c))continue;
      switch(c){
        case 123:this.frame(125,false,n=>this.append(this.row(n,true)));continue;
        case 125:this.error('Extra close brace or missing open brace');
        case 94:this.script(true);continue;
        case 95:this.script(false);continue;
        case 39:case 0x2019:this.script(true,true);continue;
        case 35:this.error("You can't use 'macro parameter character #' in math mode");
        case 38:{const f=this.f;if(!f.table)this.error('Misplaced &');this.finishCell(f.table,f.nodes);f.nodes=[];f.font=f.table.originalFont;if(f.table.latex)this.startCell(f.table);continue;}
        case -5:{const text=spelling(t)==='<'?'⟨':spelling(t)==='>'?'⟩':spelling(t);const n=this.node(K.mo,[],text,{fence:'false',stretchy:'false'});n.rawAttrs=true;this.append(n);continue;}
        case 126:this.append(this.node(K.mtext,[],'\u00a0'));continue;
        case -1:case -3:{const id=commandId(t),d=definitions[id],name=d?.name??spelling(t),m=c===-1&&this.macros.size?this.macros.get(name):undefined;if(m){this.expand(m);continue;}if(id<0)this.error(`Undefined control sequence \\${name}`);
          if(d.char!==undefined){this.append(this.symbol(t,id));continue;}
          const args=d.args??[];
          if(d.type==='MathFont'){const font=String(args[0]);this.argument(n=>this.append(n.kind===K.mrow&&n.children.length===0?n:this.row([n],true)));this.f.font=font;this.f.multi=true;continue;}
          if(d.type==='SetFont'){this.f.font=String(args[0]);continue;}
          if(d.type==='SetStyle'||d.type==='SetSize'){const attrs:Attrs=d.type==='SetSize'?{mathsize:String(args[0])+'em'}:{displaystyle:String(args[1]),scriptlevel:String(args[2])};const f=this.f;const existing=f.nodes;f.nodes=[];
            if(d.type==='SetStyle'){if(args[2]===0)delete attrs.scriptlevel;if(args[1]===false&&args[2]!==2&&!f.display)delete attrs.displaystyle;}this.frame(f.stop,false,n=>{this.frames.push(f);f.nodes=[...existing,...Object.keys(attrs).length?[this.node(K.mstyle,n,'',attrs)]:n];this.close();});this.frames.splice(this.frames.length-2,1);this.f.display=d.type==='SetStyle'?Boolean(args[1]):f.display;this.f.level=d.type==='SetStyle'?Number(args[2]):f.level;continue;}
          if(d.type==='NamedFn'||d.type==='NamedOp'){const op=d.type==='NamedOp';const n=this.node(op?K.mo:K.mi,[],String(args[0]??name).replaceAll('&thinsp;','\u2006'),op?{movablelimits:'true'}:{});n.op=1;n.limits=op?1:0;this.append(n);continue;}
          if(d.type==='HBox'){this.renderText(this.tokensArgument(),String(args[1]??''),args[0]===0);continue;}
          if(d.type==='Spacer'){let n=this.node(K.mspace,[],'',{width:em(Number(args[0]))});if(this.f.level>0)n=this.node(K.mstyle,[n],'',{scriptlevel:'0'});this.append(n);continue;}
          if(d.type==='Accent'){const glyph=accents[name]??String.fromCodePoint(parseInt(String(args[0]),16));this.argument(n=>{const a:Attrs={};if(args[1]!==true&&operator(glyph)?.[3]?.stretchy)a.stretchy='false';if(name==='acute'||name==='grave')a['data-mjx-pseudoscript']='true';if(this.f.font)a.mathvariant=this.f.font;const mo=this.node(K.mo,[],glyph,a);const mover=this.node(K.mover,[n,mo]);this.append(this.row([mover],true));});continue;}
          if(d.type==='UnderOver'){let glyph=underover[name]??String.fromCodePoint(parseInt(String(args[0]),16));const under=name.startsWith('under');this.argument(n=>{const a:Attrs={};if(name.includes('line')){a.accent='true';glyph='―';}const mo=this.node(K.mo,[],glyph,a);const b=this.decorationBase(n);const x=this.node(under?K.munder:K.mover,[b,mo]);if(args[1]){const w=this.row([x],true);w.limits=2;this.append(w);}else this.append(x);});continue;}
          if(d.type==='MakeBig'){const delim=this.delimiter(),size=String(Number(args[1])*(1.2/0.85)).replace(/(\.\d\d\d).+/, '$1')+'em';this.append(this.row([this.delimiterNode(delim,size)],true));continue;}
          if(d.type==='Macro'&&id!==C.boxed){this.expand({body:scan(String(args[0])),count:Number(args[1]??0),optional:null,prefix:[],delimiters:[]});continue;}
          this.control(id,name);continue;
        }
      }
      if(isDigit(c)||c===(this.options.decimalSeparator===','?44:46)&&isDigit(this.stream.peek()?.[0]??0)){this.append(this.number(t));continue;}
      let n=this.character(t);if(this.f.multi&&n.kind===K.mi&&letter(c)){while(this.stream.peek()&&letter(this.stream.peek()![0]))n.text+=spelling(this.stream.next()!);if(n.text.length>1&&n.attributes.mathvariant==='normal')n.attributes['data-mjx-auto-op']='false';}
      this.append(n);
    }
    if(this.numbered&&!this.result.some(n=>n.kind===K.mtable))this.result=[this.node(K.mtable,[this.node(K.mlabeledtr,[this.labelCell(this.label||'1',1),this.node(K.mtd,this.result)])],'',{displaystyle:'true'})];
    if(this.envStack.length)this.error(`Missing \\end{${this.envStack.at(-1)}}`);
    this.finish(this.result);
    return expose(this.node(K.math,this.result,'',{xmlns:NS,...this.options.display&&!this.inline?{display:'block'}:{},...this.hsize?{maxwidth:this.hsize,overflow:'linebreak'}:{}}));
  }
  control(id:number,name:string){
    switch(id){
      case C.newcommand:case C.renewcommand:case C.def:case C.let:case C.newenvironment:case C.renewenvironment:this.define(id);return;
      case C.newcolumntype:{const name=raw(this.tokensArgument()),count=Number(raw(this.optional()??[])||'0'),body=raw(this.tokensArgument());this.columns.set(name,{count,body});return;}
      case C.breakAlign:{const scope=raw(this.tokensArgument()),value=raw(this.tokensArgument()),t=this.f.table;if(!t)this.error('Misplaced breakAlign');const align=Array.from(value,c=>({t:'top',b:'bottom',m:'middle',c:'center'} as Record<string,string>)[c]??c).join(' ');if(scope==='c')t.cellBreak[t.rows.length+':'+t.cells.length]=align;else if(scope==='r')t.rowBreak[t.rows.length]=align;else t.tableBreak=false;return;}
      case C.mathchoice:{const choices=[this.tokensArgument(),this.tokensArgument(),this.tokensArgument(),this.tokensArgument()];this.stream.push(choices[this.f.display?0:Math.min(3,this.f.level+1)]);return;}
      case C.buildrel:{const top=this.tokensArgument();this.stream.skip();if(builtin(this.stream.next()!)!==C.over)this.error('Missing \\over for \\buildrel');this.argument(base=>this.parseTokens(top,n=>this.append(this.row([this.node(K.mover,[base,this.row([n],true)])],true))));return;}
      case C.hsize:{this.stream.skip();if(this.stream.peek()?.[0]===61)this.stream.next();this.hsize=this.dimension();return;}
      case C.vtop:case C.vcenter:case C.vbox:{const position=id===C.vtop?'top':id===C.vbox?'bottom':'center';this.argument(n=>this.append(this.node(K.mpadded,[n],'',{'data-mjx-vbox':position,'data-vertical-align':position,...this.hsize?{width:this.hsize,'data-overflow':'linebreak'}:{}})));return;}
      case C.parbox:{const width=raw(this.tokensArgument());this.append(this.node(K.mpadded,[this.text(this.tokensArgument())],'',{'data-mjx-vbox':'center',width,'data-overflow':'linebreak','data-vertical-align':'center'}));return;}
      case C.framebox:case C.makebox:{const width=this.optional();const align=width?raw(this.optional()??scan('c')):'c';const a:Attrs={...width?{width:raw(width)}:{},'data-align':({l:'left',r:'right',c:'center'} as Record<string,string>)[align.toLowerCase()]??'center',...align===align.toUpperCase()?{'data-overflow':'linebreak'}:{}};let n=this.text(this.tokensArgument());if(id===C.makebox||width)n=this.node(K.mpadded,[n],'',a);if(id===C.framebox)n=this.row([this.node(K.menclose,[n],'',{notation:'box'})],true);this.append(n);return;}
      case C.rule:case C.Rule:case C.Space:{const offset=id===C.rule?raw(this.optional()??[]):'';const width=raw(this.tokensArgument()),height=raw(this.tokensArgument()),depth=id!==C.rule?raw(this.tokensArgument()):'';let n=this.node(K.mspace,[],'',{width,height,...depth?{depth}:{},...id!==C.Space?{mathbackground:'black'}:{}});if(offset)n=this.node(K.mpadded,[n],'',{voffset:offset,height:offset.startsWith('-')?offset:'+'+offset,...offset.startsWith('-')?{depth:'+'+offset.slice(1)}:{}});this.append(n);return;}
      case C.frac:this.args(2,n=>this.append(this.node(K.mfrac,n)));return;
      case C.sqrt:{const root=this.optional();this.argument(n=>{if(root)this.parseTokens(root,r=>this.append(this.node(K.mroot,[n,r])));else this.append(this.node(K.msqrt,n.kind===K.mrow?n.children:[n]))});return;}
      case C.root:{const root:Token[]=[];while(this.stream.peek()&&builtin(this.stream.peek()!)!==C.of)root.push(this.stream.next()!);if(!this.stream.next())this.error('Missing \\of');this.argument(n=>this.parseTokens(root,r=>this.append(this.node(K.mroot,[n,r]))));return;}
      case C.left:{const delim=this.delimiter();this.frame(-4,false,n=>this.append(this.row([this.delimiterNode(delim),...n],true)),'left');return;}
      case C.right:{const delim=this.delimiter();if(this.f.env!=='left')this.error('Extra \\right');this.f.nodes.push(this.delimiterNode(delim));this.close();return;}
      case C.middle:{const d=this.delimiter();if(this.f.env!=='left')this.error('Misplaced \\middle');this.append(this.row([],true));this.append(this.node(K.mo,[],d,{stretchy:'true',symmetric:'true'}));this.append(this.row([],true));return;}
      case C.begin:{const name=raw(this.tokensArgument()).trim();const custom=this.environments.get(name);if(custom){this.envStack.push(name);this.expand(custom.begin);return;}
        if(name==='indentalign'){const first=this.optional(),middle=this.optional(),last=this.optional(),align=raw(this.tokensArgument());const attrs:Attrs={indentshiftfirst:raw(first??[]),indentshift:raw(middle??first??[]),indentalignfirst:({l:'left',c:'center',r:'right'} as Record<string,string>)[align[0]],indentalign:({l:'left',c:'center',r:'right'} as Record<string,string>)[align[1]??align[0]]};if(align.length>1)attrs.indentalignlast=({l:'left',c:'center',r:'right'} as Record<string,string>)[align.at(-1)!];if(last)attrs.indentshiftlast=raw(last);this.frame(-4,false,n=>this.append(this.node(K.mstyle,n,'',attrs)),name);return;}
        if(['array','darray','eqnarray'].includes(name)){const pos=this.optional();const align=name==='eqnarray'?'rcl':raw(this.tokensArgument());this.tableStart(name,align,-4);if(pos)this.f.table!.position=({t:'baseline 1',b:'baseline -1',c:'center'} as Record<string,string>)[raw(pos)]??raw(pos);return;}
        if(['math','equation','displaymath'].includes(name)){if(name==='math')this.inline=true;this.frame(-4,false,n=>{for(const x of n)this.append(x)},name);return;}this.error(`Unknown environment '${name}'`);}
      case C.end:{const name=raw(this.tokensArgument()).trim();const custom=this.environments.get(name);if(custom){const index=this.envStack.lastIndexOf(name);if(index<0)this.error(`Missing \\begin{${name}}`);this.envStack.splice(index,1);this.stream.push(custom.end.body);return;}if(this.f.env!==name)this.error(`\\begin{${this.f.env}} ended with \\end{${name}}`);this.close();return;}
      case C.over:case C.atop:case C.above:case C.choose:case C.brack:case C.brace:case C.overwithdelims:case C.atopwithdelims:case C.abovewithdelims:{const f=this.f;if(f.fraction)this.error('Ambiguous use of fraction');let left='',right='';if(name.includes('withdelims')){left=this.delimiter();right=this.delimiter();}if(id===C.choose){left='(';right=')';}if(id===C.brack){left='[';right=']';}if(id===C.brace){left='{';right='}';}const attrs:Attrs={};if(id!==C.over&&id!==C.overwithdelims)attrs.linethickness=name.startsWith('above')?this.dimension():'0';f.fraction={num:f.nodes,attrs,left,right};f.nodes=[];return;}
      case C.text:case C.mbox:case C.hbox:this.renderText(this.tokensArgument(),this.f.font,id!==C.text);return;
      case C.limits:case C.nolimits:case C.displaylimits:{const n=this.f.nodes.at(-1);if(!n)this.error('Limits controls must follow a math operator');const b=[K.msub,K.msup,K.msubsup,K.munder,K.mover,K.munderover].includes(n.kind)?n.children[0]:n;b.limits=id===C.nolimits?-1:id===C.limits?2:1;if(id===C.limits&&b.kind===K.mo)b.attributes.movablelimits='false';if(id===C.nolimits)delete b.attributes.movablelimits;n.limits=b.limits;if(n!==b){const under=b.limits>0&&(this.f.display||b.limits===2);const map:Partial<Record<K,K>>=under?{[K.msub]:K.munder,[K.msup]:K.mover,[K.msubsup]:K.munderover}:{[K.munder]:K.msub,[K.mover]:K.msup,[K.munderover]:K.msubsup};n.kind=map[n.kind]??n.kind;}return;}
      case C.not:this.argument(n=>{if(n.kind===K.mo&&n.text.length<=2){n.text=negated[n.text]??n.text+'̸';this.append(n);}else {this.append(this.row([this.node(K.mpadded,[this.node(K.mtext,[],'⧸')],'',{width:'0'})],true));this.append(n);}});return;
      case C.overset:case C.underset:case C.overunderset:case C.stackrel:case C.stackbin:{this.args(id===C.overunderset?3:2,n=>{const over=id!==C.underset,base=n.at(-1)!;base.limits=0;const attrs:Attrs={};if(n[0].kind===K.mo&&operator(n[0].text)?.[3]?.accent)attrs[over?'accent':'accentunder']='true';if(id===C.overunderset&&n[1].kind===K.mo&&operator(n[1].text)?.[3]?.accent)attrs.accentunder='true';let result=this.node(id===C.overunderset?K.munderover:over?K.mover:K.munder,id===C.overunderset?[base,n[1],n[0]]:[base,n[0]],'',attrs);if(id===C.stackrel||id===C.stackbin)result=this.row([result],true);this.append(result);});return;}
      case C.mathop:case C.mathord:case C.mathrel:case C.mathbin:case C.mathopen:case C.mathclose:case C.mathpunct:case C.mathinner:{this.argument(n=>{const x=id===C.mathop&&n.kind===K.mi&&!!n.attributes.mathvariant&&!n.attributes.mathvariant.startsWith('-tex-')?n:n.kind===K.mrow&&n.children.length===0?n:this.row(n.kind===K.mrow?n.children:[n],true);if(id===C.mathop){x.op=n.text||n.children.length?1:0;x.limits=1;}this.append(x);});return;}
      case C.mmlToken:{const kind=raw(this.tokensArgument()),attrs=raw(this.optional()??[]),text=raw(this.tokensArgument());const tag=({mi:K.mi,mo:K.mo,mn:K.mn,mtext:K.mtext} as Record<string,K>)[kind];if(tag===undefined)this.error('Invalid MathML token type');const a:Attrs={};for(const m of attrs.matchAll(/([a-zA-Z]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\s]+))/g)){if(!['mathvariant','mathsize','largeop','movablelimits','lspace','rspace','stretchy','fence','symmetric','accent','mathcolor','mathbackground'].includes(m[1]))this.error('Invalid MathML token attribute');a[m[1]]=m[2]??m[3]??m[4];}const token=this.node(tag,[],text,a);token.rawAttrs=true;this.append(token);return;}
      case C.hskip:case C.hspace:case C.kern:case C.mskip:case C.mspace:case C.mkern:{let width=this.dimension();if(width.endsWith('mu'))width=em(parseFloat(width)/18);this.append(this.node(K.mspace,[],'',{width,...id===C.kern||id===C.mkern?{linebreak:'nobreak'}:{}}));return;}
      case C.phantom:case C.vphantom:case C.hphantom:this.argument(n=>{let result=this.node(K.mphantom,[n]);if(id!==C.phantom)result=this.node(K.mpadded,[result],'',id===C.vphantom?{width:'0'}:{height:'0',depth:'0'});this.append(this.row([result],true));});return;
      case C.smash:{const opt=raw(this.optional()??[]);this.argument(n=>this.append(this.row([this.node(K.mpadded,[n],'',opt==='b'?{depth:'0'}:opt==='t'?{height:'0'}:{height:'0',depth:'0'})],true)));return;}
      case C.llap:case C.rlap:this.argument(n=>this.append(this.row([this.node(K.mpadded,[n],'',id===C.llap?{width:'0',lspace:'-1width'}:{width:'0'})],true)));return;
      case C.raise:case C.lower:case C.moveleft:case C.moveright:{let amount=this.dimension();if(id===C.lower||id===C.moveleft)amount=amount.startsWith('-')?amount.slice(1):'-'+amount;if(!amount.startsWith('-')&&!amount.startsWith('+'))amount='+'+amount;
        if(id===C.moveleft||id===C.moveright){const w=amount.startsWith('+')?amount.slice(1):amount;this.append(this.node(K.mspace,[],'',{width:w}));this.argument(n=>{this.append(this.row([n],true));this.append(this.node(K.mspace,[],'',{width:w.startsWith('-')?w.slice(1):'-'+w}));});}
        else this.argument(n=>this.append(this.node(K.mpadded,[this.row([n],true)],'',{height:amount,depth:amount.startsWith('-')?'+'+amount.slice(1):'-'+amount.slice(1),voffset:amount})));return;}
      case C.fbox:case C.boxed:{if(id===C.boxed)this.argument(n=>this.append(this.node(K.menclose,[this.row([this.row([n],true)],true)],'',{notation:'box'})));else this.append(this.node(K.menclose,[this.text(this.tokensArgument())],'',{notation:'box'}));return;}
      case C.matrix:case C.array:case C.pmatrix:case C.cases:case C.eqalign:case C.eqalignno:case C.leqalignno:case C.displaylines:{this.stream.skip();const brace=this.stream.peek()?.[0]===123;if(brace)this.stream.next();this.tableStart(name,name.includes('eqalign')?'rl':name==='cases'?'ll':'c',brace?125:0);if(!brace)this.f.single=true;return;}
      case C.hline:case C.hdashline:{const t=this.f.table;if(!t)this.error('Misplaced \\hline');const style=id===C.hline?'solid':'dashed';if(!t.rows.length&&!t.cells.length&&!this.f.nodes.length)t.top=style;else if(!this.f.nodes.length&&!t.cells.length){t.bottom=style;t.rowlines[t.rows.length-1]=style;}else t.rowlines[t.rows.length-1]=style;return;}
      case C.hfil:case C.hfill:case C.hfilll:if(this.f.table)this.f.table.fill=this.f.table.fill?'center':this.f.nodes.length?'left':'right';return;
      case C.cr:case C.newline:{this.linebreak();return;}
      case C.allowbreak:case C.goodbreak:case C.badbreak:case C.nobreak:{const value=id===C.allowbreak?'auto':name;if(id===C.allowbreak){this.append(this.node(K.mspace));return;}const previous=this.f.nodes.at(-1);const after=previous?.kind===K.mo&&operator(previous.text)?.[3]?.linebreakstyle==='after';if(after&&value!=='auto')previous.attributes.linebreak=value;this.stream.skip();const t=this.stream.peek();const d=t?definitions[commandId(t)]:undefined;const glyph=d?.char??(t?spelling(t):'');if(!after||glyph!==',')this.pendingBreak=value;return;}
      case C.break:this.append(this.node(K.mspace,[],'',{linebreak:'newline'}));return;
      case C.label:{const label=raw(this.tokensArgument());if(this.f.table)this.f.table.labels[this.f.table.rows.length]=label;else {this.label=label;this.numbered=true;}return;}
      case C.nonumber:if(this.f.table){this.f.table.noNumbers.add(this.f.table.rows.length);this.numbered=true;}return;
      case C.ref:this.tokensArgument();this.append(this.node(K.mrow,[this.node(K.mtext,[],'???')],'',{href:'#',class:'MathJax_ref'}));return;
      case C.nonscript:this.nonscript=true;return;
      case C.color:case C.textcolor:{const color=raw(this.tokensArgument());this.argument(n=>this.append(this.node(K.mstyle,[n],'',{mathcolor:color})));return;}
      case C.dots:{this.stream.skip();const t=this.stream.peek(),d=t?definitions[commandId(t)]:undefined;const glyph=d?.char??(t?spelling(t):'');this.append(this.node(K.mo,[],relationChars.has(glyph)||'+−*∗'.includes(glyph)&&glyph!==''?'⋯':'…'));return;}
      case C['*']:this.append(this.node(K.mo,[],'⁢',{linebreakmultchar:'×'}));return;
      case C.strut:this.append(this.node(K.mpadded,[this.row([],true)],'',{height:'8.6pt',depth:'3pt',width:'0'}));return;
      case C.mathstrut:this.stream.push(scan('\\vphantom{(}'));return;
      case C.iff:this.stream.push(scan('\\;\\Longleftrightarrow\\;'));return;
    }
    if(name==='\\'){this.linebreak();return;}
    if(name===' '||name==='space'||name===' '){this.append(this.node(K.mtext,[],'\u00a0'));return;}
    this.error(`Undefined control sequence \\${name}`);
  }
  linebreak(){if(this.stream.peek()?.[0]===42)this.stream.next();const spacing=this.optional();const f=this.f;
    if(f.table){const t=f.table;this.finishCell(t,f.nodes);t.rows.push(t.cells);t.cells=[];f.nodes=[];f.font=t.originalFont;if(spacing)t.rowspaces[t.rows.length-1]=em(dimensionEm(raw(spacing))+0.4);if(t.latex)this.startCell(t);return;}
    this.append(this.node(K.mspace,[],'',{linebreak:'newline',...spacing?{'data-lineleading':raw(spacing).replace(',','.')}:{}}));
  }
  decorationBase(n:Node):Node {if(n.kind===K.mo&&n.limits>0){n.attributes.movablelimits='false';n.limits=0;return n;}if((n.limits!==0||n.children[0]?.attributes.movablelimits==='false')&&[K.munder,K.mover,K.munderover].includes(n.kind)){const b=n.children[0];b.attributes.lspace='0';b.attributes.rspace='0';return this.row([this.node(K.mo,[],'',{rspace:'0'}),n],true);}return n;}
  clean(n:Node,index:number,length:number){
    if(n.rawAttrs)return;const a=n.attributes;const defaults=n.kind===K.mo?(operator(n.text,index===0&&length>1?'prefix':index===length-1&&length>1?'postfix':'infix')?.[3]??{}):{};
    if(n.kind===K.mo&&a.stretchy==='true'&&defaults.stretchy)delete a.stretchy;
    if(n.fixed){if(defaults.stretchy)a.stretchy='false';else if(n.text!=='|'&&n.text!=='‖')delete a.stretchy;}
    if(!n.rawAttrs&&n.kind===K.mo){for(const key of ['fence','largeop','movablelimits','symmetric','accent'])if(a[key]===String(defaults[key]??false))delete a[key];}
    if(a.mathvariant?.startsWith('-tex-')){a['data-mjx-variant']=a.mathvariant;a.mathvariant=a.mathvariant.includes('calligraphic')?(a.mathvariant.includes('bold')?'bold-script':'script'):a.mathvariant==='-tex-oldstyle'?'normal':'italic';}
    if(a.mathvariant==='italic'&&n.kind===K.mi&&Array.from(n.text).length===1&&!a['data-mjx-variant'])delete a.mathvariant;
    if(!n.rawAttrs&&!a['data-mjx-variant']&&a.mathvariant==='normal'&&(n.kind===K.mo||n.kind===K.mn||n.kind===K.mtext))delete a.mathvariant;
  }
  finish(nodes:Node[]){const stack:{children:Node[];sequence:boolean}[]=[{children:nodes,sequence:true}];while(stack.length){const {children,sequence}=stack.pop()!;
    for(let i=0;i<children.length;i++){const n=children[i];if(n.children.length)stack.push({children:n.children,sequence:[K.math,K.mrow,K.mtd,K.mstyle,K.mpadded,K.msqrt,K.mphantom,K.menclose].includes(n.kind)});this.clean(n,i,children.length);if([K.msub,K.msup,K.msubsup,K.munder,K.mover,K.munderover].includes(n.kind))n.children[0].op=0;
      if(sequence&&n.op&&i+1<children.length&&(n.text||hasContent(n))){const next=children[i+1];if(next.kind===K.mi||next.kind===K.mn||next.kind===K.mrow||next.kind===K.mo&&'([{|'.includes(next.text)){children.splice(++i,0,this.node(K.mo,[],'⁡'));}}
      if(sequence&&n.kind===K.mo&&n.relation){while(i+1<children.length){const next=children[i+1];if(!next.relation)break;this.clean(next,i+1,children.length);if(!compatible(n.attributes,next.attributes)){n.attributes.rspace??='0pt';next.attributes.lspace??='0pt';break;}if(next.attributes.stretchy==='false')n.attributes.stretchy='false';n.text+=next.text;children.splice(i+1,1);}}
    }
  }}
}
function commandId(t:Token){return builtin(t[0]===-3?[-1,t[1],t[2],t[3]]:t);}
function compatible(a:Attrs,b:Attrs):boolean {const keysA=Object.keys(a).filter(k=>k!=='lspace'&&!(k==='stretchy'&&a[k]==='false'));const keysB=Object.keys(b).filter(k=>k!=='rspace'&&!(k==='stretchy'&&b[k]==='false'));return keysA.length===keysB.length&&keysA.every(k=>a[k]===b[k]);}
function nodeText(nodes:Node[]):string {let text='';const stack=[...nodes].reverse();while(stack.length){const n=stack.pop()!;text+=n.text;for(let i=n.children.length-1;i>=0;i--)stack.push(n.children[i]);}return text;}
function nameOf(id:number){return definitions[id].name;}
function dimensionEm(d:string):number {const n=parseFloat(d.replace(',','.'));const unit=d.replace(/[-+0-9., ]/g,'');return n*({em:1,ex:.43,pt:.1,cm:72/2.54/10,mm:72/25.4/10,px:1/10,in:7.2} as Record<string,number>)[unit];}
function hasContent(n:Node):boolean {const stack=[n];while(stack.length){const x=stack.pop()!;if(x.text)return true;for(const child of x.children)stack.push(child);}return false;}
function operator(text:string,form='infix'){return operators[form][text]??operators.infix[text]??operators.prefix[text]??operators.postfix[text];}
function em(n:number){return String(Math.round(n*1000)/1000)+'em';}
export function parseToMathMLAst(tex:string,options:ParseOptions={}):MathMLNode {
  if(typeof tex!=='string')throw new TypeError('TeX input must be a string');
  for(const k of ['maxNodes','maxTokens','maxExpansions','maxDepth'] as const)if(options[k]!==undefined&&(!Number.isSafeInteger(options[k])||options[k]!<1))throw new RangeError(`${k} must be a positive safe integer`);
  try {return new Parser(tex,options).run();}
  catch(error){if(!(error instanceof ParseError)&&!(error instanceof Error&&error.message==='Token limit exceeded'))throw error;if(options.throwOnError)throw error;const message=(error as Error).message;return {kind:'math',attributes:{xmlns:NS,...options.display?{display:'block'}:{}},children:[{kind:'merror',attributes:{'data-mjx-error':message},children:[{kind:'mtext',attributes:{},children:[],text:message,start:0}],text:'',start:0}],text:'',start:0};}
}
