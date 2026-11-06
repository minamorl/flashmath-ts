/** Layout follows MathJax 4.1.3 (Apache-2.0), Copyright (c) 2017-2026 The MathJax Consortium.
 * See conformance/fixtures/LICENSE.MathJax.
 */
/** Row-spanning equation decorations, compatible with MathJax 4.1.3. */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage,TexCommand} from './types.js';
import {scan,raw,spelling} from '../scanner.js';
import type {Token} from '../scanner.js';
import {beginAms,clone,environmentBody,sequence} from './ams.js';

/** Decorations size themselves from independent, id-free copies of the table. */
export function decorate(p:Parser,table:Node,left:Token[],right:Token[],done:(n:Node)=>void){
  const original=clone(p,table,true);
  const phantom=(n:Node)=>p.node(K.mphantom,[p.node(K.mpadded,n.kind===K.mrow&&n.inferred?n.children:[n],'',{width:'0'})]);
  // Upstream also decorates an unnumbered equation's inferred sequence.
  // A lone token's text-child decorations are omitted by its serializer.
  if([K.mi,K.mn,K.mo,K.mtext].includes(table.kind)){
    const finish=()=>{if(left.length){table.attributes.columnalign=right.length?'right left':'right undefined';table.attributes.columnspacing=right.length?' 0em':'0em undefined';}done(table);};
    const afterLeft=()=>right.length?p.parseTokens(right,finish):finish();
    if(left.length)p.parseTokens(left,afterLeft);else afterLeft();return;
  }
  if(table.kind===K.mrow&&table.inferred)for(let i=0;i<table.children.length;i++){
    const row=table.children[i];
    if(row.text){p.clean(row,i,table.children.length);row.rawAttrs=true;row.tokenCellSpacing=true;
      const text=p.node(K.html);text.html={kind:'#text',attributes:{},children:[],text:row.text,start:row.start};row.text='';row.children.push(text);
    }
  }
  const block=(tokens:Token[],cb:(n:Node)=>void)=>{
    p.parseTokens(tokens,n=>{
      const top=clone(p,original,true);top.children=top.children.slice(0,1);top.attributes.align='baseline 1';
      cb(p.node(K.mpadded,[p.node(K.mpadded,[...sequence(n),phantom(clone(p,original,true))],'',{height:'0',depth:'0',voffset:'-1height'}),phantom(top)],'',{height:'0',depth:'0',voffset:'height'}));
    });
  };
  const afterLeft=()=>{
    if(!right.length){done(table);return;}
    if(!table.children.length)table.children.push(p.node(K.mtr));
    const row=table.children[0],count=Math.max(0,...table.children.map(r=>r.children.length-(r.kind===K.mlabeledtr?1:0)))+(row.kind===K.mlabeledtr?1:0);
    while(row.children.length<count)row.children.push(p.node(K.mtd));
    const cell=p.node(K.mtd);row.children.push(cell);
    block(right,n=>{
      cell.children.push(n);
      table.attributes.columnalign=(table.attributes.columnalign??'center').split(' ').slice(0,count).join(' ')+' left';
      table.attributes.columnspacing=(table.attributes.columnspacing??'.8em').split(' ').slice(0,count-1).join(' ')+' 0em';
      done(table);
    });
  };
  if(!left.length){afterLeft();return;}
  table.attributes.columnalign='right '+(table.attributes.columnalign??'center');
  table.attributes.columnspacing='0em '+(table.attributes.columnspacing??'.8em');
  if(!table.children.length)table.children.push(p.node(K.mtr));
  let first:Node|undefined;
  for(const row of table.children){const cell=p.node(K.mtd);row.children.splice(row.kind===K.mlabeledtr?1:0,0,cell);first??=cell;}
  block(left,n=>{first!.children.push(n);afterLeft();});
}
function options(p:Parser,tokens:Token[]){
  const result:{left:Token[];right:Token[]}={left:[],right:[]};
  let part:Token[]=[],depth=0;
  const add=()=>{if(!part.length)return;const index=part.findIndex(t=>t[0]===61),key=raw(part.slice(0,index)).trim();if(index<0||key!=='left'&&key!=='right')p.error('Invalid option: '+key);let value=part.slice(index+1);while(value[0]?.[0]===32)value.shift();while(value.at(-1)?.[0]===32)value.pop();if(value[0]?.[0]===123&&value.at(-1)?.[0]===125)value=value.slice(1,-1);result[key]=value;part=[];};
  for(const t of tokens){if(!depth&&t[0]===44){add();continue;}part.push(t);if(t[0]===123)depth++;if(t[0]===125)depth--;}
  add();return result;
}
const commands:Record<string,TexCommand>={};
for(const [suffix,l,r]of [['brace','{','}'],['brack','[',']'],['angle','⟨','⟩'],['paren','(',')'],['vert','|','|'],['Vert','‖','‖'],['floor','⌊','⌋'],['ceil','⌈','⌉']] as const){
  for(const big of ['', 'big'])for(const [side,char]of [['l',l],['r',r]])commands['empheq'+big+side+suffix]={execute(p){p.append(p.node(K.mo,[],char));}};
}
for(const name of ['empheql','empheqr','empheqbigl','empheqbigr'])commands[name]={execute(p){p.append(p.node(K.mo,[],p.delimiter(),{stretchy:'true',symmetric:'true'}));}};
export default {
  name:'empheq',commands,environments:{empheq:{begin(p,name){
    const opts=options(p,p.optional()??[]),[env,n]=raw(p.tokensArgument()).split('=');
    if(!['equation','align','gather','flalign','alignat','multline'].includes(env.replace(/\*$/,'')))p.error(`Invalid environment "${env}" for empheq`);
    const body=environmentBody(p,name);
    p.stream.push([...scan(n?'{'+n+'}':''),...body,...scan('\\end{'+env+'}')]);
    const append=(n:Node)=>{if(n.kind===K.mrow&&n.inferred)for(const c of n.children)p.append(c);else p.append(n);};
    beginAms(p,env,table=>{if(opts.left.length||opts.right.length)decorate(p,table,opts.left,opts.right,append);else append(table);});
  }}},configurationModules:['input/tex/empheq/EmpheqConfiguration.js'],
} satisfies TexPackage;
