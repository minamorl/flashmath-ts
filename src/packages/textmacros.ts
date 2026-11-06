import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {Stream,scan,raw,spelling,space} from '../scanner.js';
import type {Token} from '../scanner.js';
import type {TexPackage,TexCommand} from './types.js';
import {em} from '../mathml.js';
const fonts:Record<string,string>={rm:'normal',mit:'italic',oldstyle:'-tex-oldstyle',cal:'-tex-calligraphic',it:'-tex-mathit',bf:'bold',sf:'sans-serif',tt:'monospace'};
const textfonts:Record<string,string>={textnormal:'normal',textup:'normal',textrm:'normal',textit:'-tex-mathit',textbf:'bold',textsf:'sans-serif',texttt:'monospace',frak:'fraktur',Bbb:'double-struck'};
const sizes:Record<string,number>={Tiny:.5,tiny:.6,scriptsize:.7,SMALL:.7,Small:.8,footnotesize:.8,small:.9,normalsize:1,large:1.095,Large:1.2,LARGE:1.44,huge:1.73,Huge:2.07,HUGE:2.49};
const accents:Record<string,string>={"'":'´','’':'´','`':'`','‘':'`','^':'^','"':'¨','~':'~','=':'¯','.':'˙',u:'˘',v:'ˇ'};
const symbols:Record<string,string>={dagger:'†',ddagger:'‡',S:'§',AA:'Å',ldots:'…',vdots:'⋮'};
const spaces:Record<string,number>={',':1/6,':':2/9,'>':2/9,';':5/18,'!':-1/6,enspace:.5,quad:1,qquad:2,thinspace:1/6,negthinspace:-1/6};
interface TextFrame {stream:Stream; attrs:Record<string,string>; groups:Record<string,string>[];nodes:Node[];text:string;done:(n:Node)=>void;}
/** Text has its own token grammar and scope stack; mathematical subexpressions
 * return to the existing explicit math stack rather than reparsing the suffix. */
export function renderTextMacros(p:Parser,tokens:readonly Token[],font='',style=false,done:(n:Node)=>void=n=>p.append(n)) {
  const stack:TextFrame[]=[];
  function frame(tokens:readonly Token[],attrs:Record<string,string>,done:(n:Node)=>void) {
    if(stack.length >= (p.options.maxDepth??1024))p.error('Nesting limit exceeded');
    stack.push({stream:new Stream(tokens,p.options.maxTokens??200000),attrs:{...attrs},groups:[],nodes:[],text:'',done});
  }
  function add(f:TextFrame,n:Node) {flush(f);if([K.mi,K.mn,K.mo,K.mtext,K.mspace].includes(n.kind))for(const [key,value]of Object.entries(f.attrs))n.attributes[key]??=value;f.nodes.push(n);}
  function flush(f:TextFrame) {if(!f.text)return;let text=f.text;f.text='';if(text[0]===' ')text='\u00a0'+text.slice(1);if(text.at(-1)===' ')text=text.slice(0,-1)+'\u00a0';f.nodes.push(p.node(K.mtext,[],text,{...f.attrs}));}
  function argument(f:TextFrame):Token[] {f.stream.skip();const first=f.stream.next()??p.error('Missing text argument');if(first[0]!==123)return[first];let depth=1;const out:Token[]=[];while(depth){const t=f.stream.next()??p.error('Missing close brace');if(t[0]===123)depth++;if(t[0]===125)depth--;if(depth)out.push(t);}return out;}
  function math(f:TextFrame,ts:Token[]) {flush(f);p.parseTokens(ts,n=>{for(const key of ['mathcolor','mathsize'])if(f.attrs[key]) {if([K.mi,K.mo,K.mn,K.mtext,K.mstyle].includes(n.kind))n.attributes[key]??=f.attrs[key];else n=p.node(K.mstyle,n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n],'',{[key]:f.attrs[key]});}f.nodes.push(n.kind===K.mrow&&n.attributes['data-mjx-texclass']==='ORD'?n:p.atom([n]));step();});p.f.font='';p.f.display=false;}
  function step() {
    while(stack.length) {
      const f=stack.at(-1)!,t=f.stream.next();
      if(!t){flush(f);if(f.groups.length)p.error('Missing close brace');stack.pop();f.done(p.row(f.nodes));continue;}
      const c=t[0],name=spelling(t);
      if(c===123){f.groups.push({...f.attrs});continue;}
      if(c===125){flush(f);f.attrs=f.groups.pop()??p.error('Extra close brace or missing open brace');continue;}
      if(c===36 || c===-1&&name==='(') {
        const ts:Token[]=[];let depth=0,closed=false;while(f.stream.peek()){const v=f.stream.next()!;if(depth===0&&(c===36?v[0]===36:v[0]===-1&&spelling(v)===')')){closed=true;break;}if(v[0]===123)depth++;if(v[0]===125)depth--;ts.push(v);}if(!closed)p.error('Math mode is not properly terminated');math(f,ts);return;
      }
      if(c===37){while(f.stream.peek()&&! [10,13].includes(f.stream.peek()![0]))f.stream.next();f.stream.next();continue;}
      if(c!==-1){
        if(c===94||c===95)p.error(`'${name}' allowed only in math mode`);
        if(c===38||c===35)p.error(`Misplaced '${name}'`);
        if(c===126||c===160)f.text+='\u00a0';
        else if(space(c)){f.text+=' ';while(f.stream.peek()&&space(f.stream.peek()![0])&&f.stream.peek()![0]!==160)f.stream.next();}
        else if(c===96||c===39){const twice=f.stream.peek()?.[0]===c;if(twice)f.stream.next();f.text+=c===96?(twice?'“':'‘'):(twice?'”':'’');}
        else f.text+=name;
        continue;
      }
      // TeX consumes spaces after control words even when they expand to text.
      if(/^[a-z]+$/i.test(name))f.stream.skip();
      if('$ _%{}&#'.includes(name)&&name.length===1){f.text+=name;continue;}
      if(name===' '){f.text+=' ';continue;}
      if(name==='\\'){math(f,scan('\\\\'));return;}
      if(symbols[name]){f.text+=symbols[name];continue;}
      if(fonts[name]){flush(f);f.attrs.mathvariant=fonts[name];continue;}
      if(sizes[name]){flush(f);f.attrs.mathsize=String(sizes[name]);continue;}
      if(textfonts[name]||name==='emph') {flush(f);const attrs={...f.attrs,mathvariant:name==='emph'?(f.attrs.mathvariant==='-tex-mathit'?'normal':'-tex-mathit'):textfonts[name]};frame(argument(f),attrs,n=>add(f,n));continue;}
      if(accents[name]) {const glyph=accents[name];frame(argument(f),f.attrs,n=>{const accent=p.node(K.mo,[],glyph,{...f.attrs,...(['´','`'].includes(glyph)?{'data-mjx-pseudoscript':'true'}:{})});add(f,p.node(K.mover,[n,accent]));});continue;}
      if(spaces[name]!==undefined){add(f,p.node(K.mspace,[],'',{width:em(spaces[name])}));continue;}
      if(['color','textcolor','colorbox','fcolorbox'].includes(name)&&!p.configuration.extensions.has(name)&&!p.configuration.commands.some(x=>x?.definition.name===name))p.error(`\\${name} is only supported in math mode`);
      if(name==='color'){flush(f);f.attrs.mathcolor=raw(argument(f));continue;}
      if(name==='textcolor'){const color=raw(argument(f));frame(argument(f),f.attrs,n=>add(f,p.node(K.mstyle,n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n],'',{mathcolor:color})));continue;}
      if(name==='colorbox'||name==='fcolorbox') {const first=raw(argument(f)),background=name==='colorbox'?first:raw(argument(f));frame(argument(f),f.attrs,n=>add(f,p.node(K.mpadded,n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n],'',{mathbackground:background,...(name==='fcolorbox'?{style:`border: 2px solid ${first}`} : {}),width:'+10px',height:'+5px',depth:'+5px',lspace:'5px'})));continue;}
      if(name==='ref'||name==='eqref') {const label=raw(argument(f)),ref=p.session.labels.get(label)??p.localLabels.get(label)??{id:'',tag:'???'};add(f,p.node(K.mrow,[p.node(K.mtext,[],name==='eqref'?'('+ref.tag+')':ref.tag)],'',{href:(p.options.baseURL??'')+'#'+encodeURIComponent(ref.id),class:'MathJax_ref'}));continue;}
      const macro=p.macros.get(name);
      if(macro) {const shim=new Proxy(p,{get(target,key){if(key==='stream')return f.stream;if(key==='tokensArgument')return ()=>argument(f);return Reflect.get(target,key);}});shim.expand(macro);continue;}
      const registered=p.configuration.extensions.get(name)??p.configuration.commands.find(x=>x?.definition.name===name);
      const allowed=['hskip','hspace','kern','mskip','mspace','mkern','Rule','Space','rule','underline','llap','rlap','phantom','vphantom','hphantom','smash','mmlToken','href','class','style','data','cssId','unicode','U','char'];
      if(registered&&(allowed.includes(name)||registered.definition.type==='text-insert'||name==='textbb'||name==='textbfbb')) {
        let suspended=false;
        const shim=new Proxy(p,{get(target,key){
          if(key==='stream')return f.stream;
          if(key==='f')return {...p.f,font:f.attrs.mathvariant??''};
          if(key==='textMode')return true;
          if(key==='append')return (n:Node)=>{if(name==='kern'||name==='mkern')delete n.attributes.linebreak;add(f,n);};
          if(key==='tokensArgument')return ()=>argument(f);
          if(key==='argument')return (callback:(n:Node)=>void)=>{suspended=true;frame(argument(f),f.attrs,callback);};
          return Reflect.get(target,key);
        }});
        registered.execute(shim,t,registered.definition,registered.id);
        if(['hskip','kern','mskip','mkern'].includes(name))f.stream.skip();
        if(suspended)continue;
        continue;
      }
      if(registered)p.error(`\\${name} is only supported in math mode`);
      const fallback=[...p.configuration.packages].reverse().find(x=>x.undefinedCommand)?.undefinedCommand;
      if(fallback){fallback(new Proxy(p,{get(target,key){return key==='append'?(n:Node)=>add(f,n):Reflect.get(target,key);}}),name);continue;}
      p.error(`Undefined control sequence \\${name}`);
    }
  }
  const attrs:Record<string,string>=font?{mathvariant:font}:{};
  const display=p.f.display,level=p.f.level;
  frame(tokens,attrs,n=>{if(style)n=p.node(K.mstyle,n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n],'',{...(display?{displaystyle:'false'}:{}),...(level?{scriptlevel:'0'}:{})});done(n);});step();
}
const commands:Record<string,TexCommand>={};
for(const name of ['text','mbox','hbox',...Object.keys(textfonts).filter(x=>x.startsWith('text'))])commands[name]={execute(p){renderTextMacros(p,p.tokensArgument(),textfonts[name]??p.f.font,name==='mbox'||name==='hbox');}};
export default {name:'textmacros',priority:1,commands,environments:{},options:['textmacros'],configurationModules:['input/tex/textmacros/TextMacrosConfiguration.js']} satisfies TexPackage;
