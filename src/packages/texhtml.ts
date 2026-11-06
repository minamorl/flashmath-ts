import {K} from '../ast.js';
import type {MathMLNode} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';

/** HTML is admitted only by the explicitly enabled texhtml package. It stays
 * structured in the AST and is escaped by the regular serializer/React renderer. */
function htmlTree(p:Parser,source:string):MathMLNode|null {
  const root:MathMLNode={kind:'div',attributes:{},children:[],text:'',start:p.position};
  const stack=[root];let i=0,count=0;
  const add=(n:MathMLNode)=>{if(++count>(p.options.maxNodes??100000))p.error('Node limit exceeded');stack.at(-1)!.children.push(n);};
  const decode=(s:string)=>s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,v:string)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'}[v]??String.fromCodePoint(parseInt(v.slice(v[1]?.toLowerCase()==='x'?2:1),v[1]?.toLowerCase()==='x'?16:10))));
  while(i<source.length){
    if(source.startsWith('<!--',i)){const end=source.indexOf('-->',i+4);i=end<0?source.length:end+3;continue;}
    if(source[i]!=='<'){const end=source.indexOf('<',i),next=end<0?source.length:end;add({kind:'#text',attributes:{},children:[],text:decode(source.slice(i,next)),start:p.position});i=next;continue;}
    const tag=/^<(\/)?([a-z][\w:-]*)([^>]*?)>/i.exec(source.slice(i));
    if(!tag){add({kind:'#text',attributes:{},children:[],text:'<',start:p.position});i++;continue;}
    i+=tag[0].length;const name=tag[2].toLowerCase();
    if(tag[1]){let index=stack.length-1;while(index>0&&stack[index].kind!==name)index--;if(index>0)stack.length=index;continue;}
    const attrs:Record<string,string>={};
    for(const m of tag[3].matchAll(/([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
    const node:MathMLNode={kind:name,attributes:attrs,children:[],text:'',start:p.position};add(node);
    if(!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name)&&!tag[3].endsWith('/')){if(stack.length>=(p.options.maxDepth??1024))p.error('Nesting limit exceeded');stack.push(node);}
  }
  p.nodes+=count;
  if(!root.children.length)return null;return root.children.length===1?root.children[0]:root;
}
export default {name:'texhtml',commands:{'<':{type:'character',execute(p,t){
  const source=t[3];const start=t[1];
  if(!p.options.texOptions?.allowTexHTML||!source.startsWith('<tex-html>',start)){p.append(p.character(t));return;}
  let depth=1,end=-1,close=-1;const tags=/<\/?tex-html\b[^>]*>/g;tags.lastIndex=start+10;
  for(let m;(m=tags.exec(source));){depth+=m[0][1]==='/'?-1:1;if(depth===0){close=m.index;end=tags.lastIndex;break;}}
  if(end<0)p.error('Could not find </tex-html> for <tex-html>');
  while(p.stream.peek()&&p.stream.peek()![3]===source&&p.stream.peek()![1]<end)p.stream.next();
  const html=htmlTree(p,source.slice(start+10,close).trim());
  if(html){const child=p.node(K.html);child.html=html;p.append(p.node(K.mtext,[child]));}
}}},environments:{},options:['allowTexHTML'],configurationModules:['input/tex/texhtml/TexHtmlConfiguration.js']} satisfies TexPackage;
