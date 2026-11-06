/** Layout follows MathJax 4.1.3 (Apache-2.0), Copyright (c) 2017-2026 The MathJax Consortium.
 * See conformance/fixtures/LICENSE.MathJax.
 */
/** Commutative diagrams, following the MathJax 4.1.3 AMScd layout. */
import {K} from '../ast.js';
import base from './base.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
import {scan,spelling,space} from '../scanner.js';
import type {Token} from '../scanner.js';
import {environmentBody,sequence} from './ams.js';
const dimensions=new WeakMap<Parser,{width?:string;height?:string}>();
function dimension(p:Parser,key:'width'|'height'){
  p.stream.skip();
  const value=p.stream.peek()?.[0]===123?p.tokensArgument():null;
  if(value)p.stream.push(value);
  const d=p.dimension(),settings=dimensions.get(p)??{};settings[key]=d;dimensions.set(p,settings);
}
function begin(p:Parser,name:string){
  const body=environmentBody(p,name),options={colspace:'5pt',rowspace:'5pt',harrowsize:'2.75em',varrowsize:'1.75em',hideHorizontalLabels:false,...p.options.texOptions?.amscd as Record<string,unknown>};
  const width=dimensions.get(p)?.width??String(options.harrowsize),height=dimensions.get(p)?.height??String(options.varrowsize);
  const rows:Node[]=[],cells:Node[]=[],nodes:Node[]=[];
  let i=0;
  const cell=(strut=true)=>{
    if(strut&&rows.length%2===0&&!cells.length)nodes.push(p.node(K.mpadded,[],'',{height:'8.5pt',depth:'2pt'}));
    cells.push(p.node(K.mtd,nodes.splice(0)));
  };
  const readTo=(end:string)=>{
    const out:Token[]=[];let depth=0;
    while(i<body.length){const t=body[i++],s=spelling(t);if(!depth&&s===end&&t[0]>=0)return out;if(t[0]===123)depth++;if(t[0]===125)depth--;out.push(t);}
    p.error(`Couldn't find closing '${end}' for @${end}`);
  };
  const parse=(tokens:Token[],done:(n:Node)=>void)=>{p.parseTokens(tokens,done);p.f.display=true;};
  const next=()=>{
    while(i<body.length){
      const t=body[i];
      if(t[0]===-1&&['\\','cr'].includes(spelling(t))){i++;cell(false);rows.push(p.node(K.mtr,cells.splice(0)));continue;}
      if(t[0]===38){i++;cell(false);continue;}
      if(t[0]===64){
        let j=i+1;while(j<body.length&&space(body[j][0]))j++;
        const c=body[j]&&spelling(body[j]);
        if(c&&'><VA.|='.includes(c)){
          i=j+1;
          if(nodes.length)cell();
          if((cells.length+(rows.length%2?0:1))%2)cell();
          const finish=(n?:Node)=>{if(n)nodes.push(n);cell();next();};
          const horizontal={minsize:width},vertical={minsize:height,symmetric:'true',lspace:'0',rspace:'0'};
          if(c==='.') {finish();return;}
          if(c==='|'){finish(p.node(K.mo,[],'∥',{...vertical,stretchy:'true'}));return;}
          if(c==='='){finish(p.node(K.mo,[],'=',{...horizontal,stretchy:'true'}));return;}
          const a=readTo(c),bottom=readTo(c),b=bottom.some(t=>!space(t[0]))?bottom:[],glyph=({'<':'←','>':'→',V:'↓',A:'↑'} as Record<string,string>)[c];
          if(c==='<'||c==='>'){
            const label=(tokens:Token[],done:(n:Node)=>void)=>{parse(tokens,done);p.f.level=1;p.f.display=false;};
            label(a.some(t=>!space(t[0]))?a:scan('\\kern '+width),top=>{
              const pad=(n:Node,over=false)=>p.node(K.mpadded,sequence(n),'',{width:'+.67em',lspace:'.33em',...(over?{voffset:'.1em'}:{})});
              const done=(bottom?:Node)=>{let n=p.node(bottom?K.munderover:K.mover,[p.node(K.mo,[],glyph,horizontal),...(bottom?[pad(bottom)]:[]),pad(top,true)]);if(options.hideHorizontalLabels)n=p.node(K.mpadded,[n],'',{depth:'0',height:'.67em'});finish(n);};
              if(b.length)label(b,n=>done(n));else done();
            });return;
          }
          const left=a.length?'\\scriptstyle\\raise.125em{\\vcenter{\\llap{'+a.map(t=>(t[0]===-1?'\\':'')+spelling(t)).join('')+'}}}':'';
          const right=b.length?'\\scriptstyle\\raise.125em{\\vcenter{\\rlap{'+b.map(t=>(t[0]===-1?'\\':'')+spelling(t)).join('')+'}}}':'';
          const arrow=p.node(K.mo,[],glyph,vertical);
          if(!left&&!right){finish(arrow);return;}
          const pieces:Node[]=[];
          const afterLeft=()=>{pieces.push(arrow);if(right)parse(scan(right),n=>{pieces.push(n);finish(p.row(pieces,true));});else finish(p.row(pieces,true));};
          if(left)parse(scan(left),n=>{pieces.push(n);afterLeft();});else afterLeft();return;
        }
      }
      const tokens:Token[]=[];let depth=0;
      do {const t=body[i++];tokens.push(t);if(t[0]===123)depth++;if(t[0]===125)depth--;}
      while(i<body.length&&(depth||body[i][0]!==38&&body[i][0]!==64&&!(body[i][0]===-1&&['\\','cr'].includes(spelling(body[i])))));
      parse(tokens,n=>{nodes.push(...sequence(n));next();});return;
    }
    if(nodes.length||cells.length){cell(false);rows.push(p.node(K.mtr,cells.splice(0)));}
    p.append(p.node(K.mtable,rows,'',{columnspacing:String(options.colspace),rowspacing:String(options.rowspace),displaystyle:'true'}));
  };
  next();
}
export default {
  name:'amscd',commands:{scriptstyle:{...base.commands.scriptstyle,execute(p,t,d,id){if(p.f.level!==1||p.f.display)base.commands.scriptstyle.execute(p,t,d,id);}},minCDarrowwidth:{execute(p){dimension(p,'width');}},minCDarrowheight:{execute(p){dimension(p,'height');}}},environments:{CD:{begin}},options:['amscd'],configurationModules:['input/tex/amscd/AmsCdConfiguration.js'],
} satisfies TexPackage;
