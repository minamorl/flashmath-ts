/** AMS symbol mappings derived from MathJax 4.1.3 (Apache-2.0).
 * Copyright (c) 2017-2026 The MathJax Consortium. See conformance/fixtures/LICENSE.MathJax.
 */
import {K} from '../ast.js';
import base from './base.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage,TexCommand,TexEnvironment} from './types.js';
import {scan,raw,spelling} from '../scanner.js';
import type {Token} from '../scanner.js';
import {operator,em,dimensionEm,fenceChars} from '../mathml.js';
import {markPackageNode} from '../package-mark.js';
const symbols = () => [
  {"name":"digamma","type":"mathchar0mi","char":"ϝ","attrs":{}},
  {"name":"varkappa","type":"mathchar0mi","char":"ϰ","attrs":{}},
  {"name":"varGamma","type":"mathchar0mi","char":"Γ","attrs":{"mathvariant":"italic"}},
  {"name":"varDelta","type":"mathchar0mi","char":"Δ","attrs":{"mathvariant":"italic"}},
  {"name":"varTheta","type":"mathchar0mi","char":"Θ","attrs":{"mathvariant":"italic"}},
  {"name":"varLambda","type":"mathchar0mi","char":"Λ","attrs":{"mathvariant":"italic"}},
  {"name":"varXi","type":"mathchar0mi","char":"Ξ","attrs":{"mathvariant":"italic"}},
  {"name":"varPi","type":"mathchar0mi","char":"Π","attrs":{"mathvariant":"italic"}},
  {"name":"varSigma","type":"mathchar0mi","char":"Σ","attrs":{"mathvariant":"italic"}},
  {"name":"varUpsilon","type":"mathchar0mi","char":"Υ","attrs":{"mathvariant":"italic"}},
  {"name":"varPhi","type":"mathchar0mi","char":"Φ","attrs":{"mathvariant":"italic"}},
  {"name":"varPsi","type":"mathchar0mi","char":"Ψ","attrs":{"mathvariant":"italic"}},
  {"name":"varOmega","type":"mathchar0mi","char":"Ω","attrs":{"mathvariant":"italic"}},
  {"name":"beth","type":"mathchar0mi","char":"ℶ","attrs":{}},
  {"name":"gimel","type":"mathchar0mi","char":"ℷ","attrs":{}},
  {"name":"daleth","type":"mathchar0mi","char":"ℸ","attrs":{}},
  {"name":"backprime","type":"mathchar0mi","char":"‵","attrs":{"variantForm":true}},
  {"name":"hslash","type":"mathchar0mi","char":"ℏ","attrs":{}},
  {"name":"varnothing","type":"mathchar0mi","char":"∅","attrs":{"variantForm":true}},
  {"name":"blacktriangle","type":"mathchar0mi","char":"▴","attrs":{}},
  {"name":"triangledown","type":"mathchar0mi","char":"▽","attrs":{"variantForm":true}},
  {"name":"blacktriangledown","type":"mathchar0mi","char":"▾","attrs":{}},
  {"name":"square","type":"mathchar0mi","char":"◻","attrs":{}},
  {"name":"Box","type":"mathchar0mi","char":"◻","attrs":{}},
  {"name":"blacksquare","type":"mathchar0mi","char":"◼","attrs":{}},
  {"name":"lozenge","type":"mathchar0mi","char":"◊","attrs":{}},
  {"name":"Diamond","type":"mathchar0mi","char":"◊","attrs":{}},
  {"name":"blacklozenge","type":"mathchar0mi","char":"⧫","attrs":{}},
  {"name":"circledS","type":"mathchar0mi","char":"Ⓢ","attrs":{"mathvariant":"normal"}},
  {"name":"bigstar","type":"mathchar0mi","char":"★","attrs":{}},
  {"name":"sphericalangle","type":"mathchar0mi","char":"∢","attrs":{}},
  {"name":"measuredangle","type":"mathchar0mi","char":"∡","attrs":{}},
  {"name":"nexists","type":"mathchar0mi","char":"∄","attrs":{}},
  {"name":"complement","type":"mathchar0mi","char":"∁","attrs":{}},
  {"name":"mho","type":"mathchar0mi","char":"℧","attrs":{}},
  {"name":"eth","type":"mathchar0mi","char":"ð","attrs":{"mathvariant":"normal"}},
  {"name":"Finv","type":"mathchar0mi","char":"Ⅎ","attrs":{}},
  {"name":"diagup","type":"mathchar0mi","char":"╱","attrs":{}},
  {"name":"Game","type":"mathchar0mi","char":"⅁","attrs":{}},
  {"name":"diagdown","type":"mathchar0mi","char":"╲","attrs":{}},
  {"name":"Bbbk","type":"mathchar0mi","char":"k","attrs":{"mathvariant":"double-struck"}},
  {"name":"yen","type":"mathchar0mi","char":"¥","attrs":{}},
  {"name":"circledR","type":"mathchar0mi","char":"®","attrs":{}},
  {"name":"checkmark","type":"mathchar0mi","char":"✓","attrs":{}},
  {"name":"maltese","type":"mathchar0mi","char":"✠","attrs":{}},
  {"name":"dotplus","type":"mathchar0mo","char":"∔","attrs":{}},
  {"name":"ltimes","type":"mathchar0mo","char":"⋉","attrs":{}},
  {"name":"smallsetminus","type":"mathchar0mo","char":"∖","attrs":{"variantForm":true}},
  {"name":"rtimes","type":"mathchar0mo","char":"⋊","attrs":{}},
  {"name":"Cap","type":"mathchar0mo","char":"⋒","attrs":{}},
  {"name":"doublecap","type":"mathchar0mo","char":"⋒","attrs":{}},
  {"name":"leftthreetimes","type":"mathchar0mo","char":"⋋","attrs":{}},
  {"name":"Cup","type":"mathchar0mo","char":"⋓","attrs":{}},
  {"name":"doublecup","type":"mathchar0mo","char":"⋓","attrs":{}},
  {"name":"rightthreetimes","type":"mathchar0mo","char":"⋌","attrs":{}},
  {"name":"barwedge","type":"mathchar0mo","char":"⊼","attrs":{}},
  {"name":"curlywedge","type":"mathchar0mo","char":"⋏","attrs":{}},
  {"name":"veebar","type":"mathchar0mo","char":"⊻","attrs":{}},
  {"name":"curlyvee","type":"mathchar0mo","char":"⋎","attrs":{}},
  {"name":"doublebarwedge","type":"mathchar0mo","char":"⩞","attrs":{}},
  {"name":"boxminus","type":"mathchar0mo","char":"⊟","attrs":{}},
  {"name":"circleddash","type":"mathchar0mo","char":"⊝","attrs":{}},
  {"name":"boxtimes","type":"mathchar0mo","char":"⊠","attrs":{}},
  {"name":"circledast","type":"mathchar0mo","char":"⊛","attrs":{}},
  {"name":"boxdot","type":"mathchar0mo","char":"⊡","attrs":{}},
  {"name":"circledcirc","type":"mathchar0mo","char":"⊚","attrs":{}},
  {"name":"boxplus","type":"mathchar0mo","char":"⊞","attrs":{}},
  {"name":"centerdot","type":"mathchar0mo","char":"⋅","attrs":{"variantForm":true}},
  {"name":"divideontimes","type":"mathchar0mo","char":"⋇","attrs":{}},
  {"name":"intercal","type":"mathchar0mo","char":"⊺","attrs":{}},
  {"name":"leqq","type":"mathchar0mo","char":"≦","attrs":{}},
  {"name":"geqq","type":"mathchar0mo","char":"≧","attrs":{}},
  {"name":"leqslant","type":"mathchar0mo","char":"⩽","attrs":{}},
  {"name":"geqslant","type":"mathchar0mo","char":"⩾","attrs":{}},
  {"name":"eqslantless","type":"mathchar0mo","char":"⪕","attrs":{}},
  {"name":"eqslantgtr","type":"mathchar0mo","char":"⪖","attrs":{}},
  {"name":"lesssim","type":"mathchar0mo","char":"≲","attrs":{}},
  {"name":"gtrsim","type":"mathchar0mo","char":"≳","attrs":{}},
  {"name":"lessapprox","type":"mathchar0mo","char":"⪅","attrs":{}},
  {"name":"gtrapprox","type":"mathchar0mo","char":"⪆","attrs":{}},
  {"name":"approxeq","type":"mathchar0mo","char":"≊","attrs":{}},
  {"name":"lessdot","type":"mathchar0mo","char":"⋖","attrs":{}},
  {"name":"gtrdot","type":"mathchar0mo","char":"⋗","attrs":{}},
  {"name":"lll","type":"mathchar0mo","char":"⋘","attrs":{}},
  {"name":"llless","type":"mathchar0mo","char":"⋘","attrs":{}},
  {"name":"ggg","type":"mathchar0mo","char":"⋙","attrs":{}},
  {"name":"gggtr","type":"mathchar0mo","char":"⋙","attrs":{}},
  {"name":"lessgtr","type":"mathchar0mo","char":"≶","attrs":{}},
  {"name":"gtrless","type":"mathchar0mo","char":"≷","attrs":{}},
  {"name":"lesseqgtr","type":"mathchar0mo","char":"⋚","attrs":{}},
  {"name":"gtreqless","type":"mathchar0mo","char":"⋛","attrs":{}},
  {"name":"lesseqqgtr","type":"mathchar0mo","char":"⪋","attrs":{}},
  {"name":"gtreqqless","type":"mathchar0mo","char":"⪌","attrs":{}},
  {"name":"doteqdot","type":"mathchar0mo","char":"≑","attrs":{}},
  {"name":"Doteq","type":"mathchar0mo","char":"≑","attrs":{}},
  {"name":"eqcirc","type":"mathchar0mo","char":"≖","attrs":{}},
  {"name":"risingdotseq","type":"mathchar0mo","char":"≓","attrs":{}},
  {"name":"circeq","type":"mathchar0mo","char":"≗","attrs":{}},
  {"name":"fallingdotseq","type":"mathchar0mo","char":"≒","attrs":{}},
  {"name":"triangleq","type":"mathchar0mo","char":"≜","attrs":{}},
  {"name":"backsim","type":"mathchar0mo","char":"∽","attrs":{}},
  {"name":"thicksim","type":"mathchar0mo","char":"∼","attrs":{"variantForm":true}},
  {"name":"backsimeq","type":"mathchar0mo","char":"⋍","attrs":{}},
  {"name":"thickapprox","type":"mathchar0mo","char":"≈","attrs":{"variantForm":true}},
  {"name":"subseteqq","type":"mathchar0mo","char":"⫅","attrs":{}},
  {"name":"supseteqq","type":"mathchar0mo","char":"⫆","attrs":{}},
  {"name":"Subset","type":"mathchar0mo","char":"⋐","attrs":{}},
  {"name":"Supset","type":"mathchar0mo","char":"⋑","attrs":{}},
  {"name":"sqsubset","type":"mathchar0mo","char":"⊏","attrs":{}},
  {"name":"sqsupset","type":"mathchar0mo","char":"⊐","attrs":{}},
  {"name":"preccurlyeq","type":"mathchar0mo","char":"≼","attrs":{}},
  {"name":"succcurlyeq","type":"mathchar0mo","char":"≽","attrs":{}},
  {"name":"curlyeqprec","type":"mathchar0mo","char":"⋞","attrs":{}},
  {"name":"curlyeqsucc","type":"mathchar0mo","char":"⋟","attrs":{}},
  {"name":"precsim","type":"mathchar0mo","char":"≾","attrs":{}},
  {"name":"succsim","type":"mathchar0mo","char":"≿","attrs":{}},
  {"name":"precapprox","type":"mathchar0mo","char":"⪷","attrs":{}},
  {"name":"succapprox","type":"mathchar0mo","char":"⪸","attrs":{}},
  {"name":"vartriangleleft","type":"mathchar0mo","char":"⊲","attrs":{}},
  {"name":"lhd","type":"mathchar0mo","char":"⊲","attrs":{}},
  {"name":"vartriangleright","type":"mathchar0mo","char":"⊳","attrs":{}},
  {"name":"rhd","type":"mathchar0mo","char":"⊳","attrs":{}},
  {"name":"trianglelefteq","type":"mathchar0mo","char":"⊴","attrs":{}},
  {"name":"unlhd","type":"mathchar0mo","char":"⊴","attrs":{}},
  {"name":"trianglerighteq","type":"mathchar0mo","char":"⊵","attrs":{}},
  {"name":"unrhd","type":"mathchar0mo","char":"⊵","attrs":{}},
  {"name":"vDash","type":"mathchar0mo","char":"⊨","attrs":{}},
  {"name":"Vdash","type":"mathchar0mo","char":"⊩","attrs":{}},
  {"name":"Vvdash","type":"mathchar0mo","char":"⊪","attrs":{}},
  {"name":"smallsmile","type":"mathchar0mo","char":"⌣","attrs":{"variantForm":true}},
  {"name":"shortmid","type":"mathchar0mo","char":"∣","attrs":{"variantForm":true}},
  {"name":"smallfrown","type":"mathchar0mo","char":"⌢","attrs":{"variantForm":true}},
  {"name":"shortparallel","type":"mathchar0mo","char":"∥","attrs":{"variantForm":true}},
  {"name":"bumpeq","type":"mathchar0mo","char":"≏","attrs":{}},
  {"name":"between","type":"mathchar0mo","char":"≬","attrs":{}},
  {"name":"Bumpeq","type":"mathchar0mo","char":"≎","attrs":{}},
  {"name":"pitchfork","type":"mathchar0mo","char":"⋔","attrs":{}},
  {"name":"varpropto","type":"mathchar0mo","char":"∝","attrs":{"variantForm":true}},
  {"name":"backepsilon","type":"mathchar0mo","char":"∍","attrs":{}},
  {"name":"blacktriangleleft","type":"mathchar0mo","char":"◂","attrs":{}},
  {"name":"blacktriangleright","type":"mathchar0mo","char":"▸","attrs":{}},
  {"name":"therefore","type":"mathchar0mo","char":"∴","attrs":{}},
  {"name":"because","type":"mathchar0mo","char":"∵","attrs":{}},
  {"name":"eqsim","type":"mathchar0mo","char":"≂","attrs":{}},
  {"name":"vartriangle","type":"mathchar0mo","char":"△","attrs":{"variantForm":true}},
  {"name":"Join","type":"mathchar0mo","char":"⋈","attrs":{}},
  {"name":"nless","type":"mathchar0mo","char":"≮","attrs":{}},
  {"name":"ngtr","type":"mathchar0mo","char":"≯","attrs":{}},
  {"name":"nleq","type":"mathchar0mo","char":"≰","attrs":{}},
  {"name":"ngeq","type":"mathchar0mo","char":"≱","attrs":{}},
  {"name":"nleqslant","type":"mathchar0mo","char":"⪇","attrs":{"variantForm":true}},
  {"name":"ngeqslant","type":"mathchar0mo","char":"⪈","attrs":{"variantForm":true}},
  {"name":"nleqq","type":"mathchar0mo","char":"≰","attrs":{"variantForm":true}},
  {"name":"ngeqq","type":"mathchar0mo","char":"≱","attrs":{"variantForm":true}},
  {"name":"lneq","type":"mathchar0mo","char":"⪇","attrs":{}},
  {"name":"gneq","type":"mathchar0mo","char":"⪈","attrs":{}},
  {"name":"lneqq","type":"mathchar0mo","char":"≨","attrs":{}},
  {"name":"gneqq","type":"mathchar0mo","char":"≩","attrs":{}},
  {"name":"lvertneqq","type":"mathchar0mo","char":"≨","attrs":{"variantForm":true}},
  {"name":"gvertneqq","type":"mathchar0mo","char":"≩","attrs":{"variantForm":true}},
  {"name":"lnsim","type":"mathchar0mo","char":"⋦","attrs":{}},
  {"name":"gnsim","type":"mathchar0mo","char":"⋧","attrs":{}},
  {"name":"lnapprox","type":"mathchar0mo","char":"⪉","attrs":{}},
  {"name":"gnapprox","type":"mathchar0mo","char":"⪊","attrs":{}},
  {"name":"nprec","type":"mathchar0mo","char":"⊀","attrs":{}},
  {"name":"nsucc","type":"mathchar0mo","char":"⊁","attrs":{}},
  {"name":"npreceq","type":"mathchar0mo","char":"⋠","attrs":{"variantForm":true}},
  {"name":"nsucceq","type":"mathchar0mo","char":"⋡","attrs":{"variantForm":true}},
  {"name":"precneqq","type":"mathchar0mo","char":"⪵","attrs":{}},
  {"name":"succneqq","type":"mathchar0mo","char":"⪶","attrs":{}},
  {"name":"precnsim","type":"mathchar0mo","char":"⋨","attrs":{}},
  {"name":"succnsim","type":"mathchar0mo","char":"⋩","attrs":{}},
  {"name":"precnapprox","type":"mathchar0mo","char":"⪹","attrs":{}},
  {"name":"succnapprox","type":"mathchar0mo","char":"⪺","attrs":{}},
  {"name":"nsim","type":"mathchar0mo","char":"≁","attrs":{}},
  {"name":"ncong","type":"mathchar0mo","char":"≇","attrs":{}},
  {"name":"nshortmid","type":"mathchar0mo","char":"∤","attrs":{"variantForm":true}},
  {"name":"nshortparallel","type":"mathchar0mo","char":"∦","attrs":{"variantForm":true}},
  {"name":"nmid","type":"mathchar0mo","char":"∤","attrs":{}},
  {"name":"nparallel","type":"mathchar0mo","char":"∦","attrs":{}},
  {"name":"nvdash","type":"mathchar0mo","char":"⊬","attrs":{}},
  {"name":"nvDash","type":"mathchar0mo","char":"⊭","attrs":{}},
  {"name":"nVdash","type":"mathchar0mo","char":"⊮","attrs":{}},
  {"name":"nVDash","type":"mathchar0mo","char":"⊯","attrs":{}},
  {"name":"ntriangleleft","type":"mathchar0mo","char":"⋪","attrs":{}},
  {"name":"ntriangleright","type":"mathchar0mo","char":"⋫","attrs":{}},
  {"name":"ntrianglelefteq","type":"mathchar0mo","char":"⋬","attrs":{}},
  {"name":"ntrianglerighteq","type":"mathchar0mo","char":"⋭","attrs":{}},
  {"name":"nsubseteq","type":"mathchar0mo","char":"⊈","attrs":{}},
  {"name":"nsupseteq","type":"mathchar0mo","char":"⊉","attrs":{}},
  {"name":"nsubseteqq","type":"mathchar0mo","char":"⊈","attrs":{"variantForm":true}},
  {"name":"nsupseteqq","type":"mathchar0mo","char":"⊉","attrs":{"variantForm":true}},
  {"name":"subsetneq","type":"mathchar0mo","char":"⊊","attrs":{}},
  {"name":"supsetneq","type":"mathchar0mo","char":"⊋","attrs":{}},
  {"name":"varsubsetneq","type":"mathchar0mo","char":"⊊","attrs":{"variantForm":true}},
  {"name":"varsupsetneq","type":"mathchar0mo","char":"⊋","attrs":{"variantForm":true}},
  {"name":"subsetneqq","type":"mathchar0mo","char":"⫋","attrs":{}},
  {"name":"supsetneqq","type":"mathchar0mo","char":"⫌","attrs":{}},
  {"name":"varsubsetneqq","type":"mathchar0mo","char":"⫋","attrs":{"variantForm":true}},
  {"name":"varsupsetneqq","type":"mathchar0mo","char":"⫌","attrs":{"variantForm":true}},
  {"name":"leftleftarrows","type":"mathchar0mo","char":"⇇","attrs":{}},
  {"name":"rightrightarrows","type":"mathchar0mo","char":"⇉","attrs":{}},
  {"name":"leftrightarrows","type":"mathchar0mo","char":"⇆","attrs":{}},
  {"name":"rightleftarrows","type":"mathchar0mo","char":"⇄","attrs":{}},
  {"name":"Lleftarrow","type":"mathchar0mo","char":"⇚","attrs":{}},
  {"name":"Rrightarrow","type":"mathchar0mo","char":"⇛","attrs":{}},
  {"name":"twoheadleftarrow","type":"mathchar0mo","char":"↞","attrs":{}},
  {"name":"twoheadrightarrow","type":"mathchar0mo","char":"↠","attrs":{}},
  {"name":"leftarrowtail","type":"mathchar0mo","char":"↢","attrs":{}},
  {"name":"rightarrowtail","type":"mathchar0mo","char":"↣","attrs":{}},
  {"name":"looparrowleft","type":"mathchar0mo","char":"↫","attrs":{}},
  {"name":"looparrowright","type":"mathchar0mo","char":"↬","attrs":{}},
  {"name":"leftrightharpoons","type":"mathchar0mo","char":"⇋","attrs":{}},
  {"name":"rightleftharpoons","type":"mathchar0mo","char":"⇌","attrs":{"variantForm":true}},
  {"name":"curvearrowleft","type":"mathchar0mo","char":"↶","attrs":{}},
  {"name":"curvearrowright","type":"mathchar0mo","char":"↷","attrs":{}},
  {"name":"circlearrowleft","type":"mathchar0mo","char":"↺","attrs":{}},
  {"name":"circlearrowright","type":"mathchar0mo","char":"↻","attrs":{}},
  {"name":"Lsh","type":"mathchar0mo","char":"↰","attrs":{}},
  {"name":"Rsh","type":"mathchar0mo","char":"↱","attrs":{}},
  {"name":"upuparrows","type":"mathchar0mo","char":"⇈","attrs":{}},
  {"name":"downdownarrows","type":"mathchar0mo","char":"⇊","attrs":{}},
  {"name":"upharpoonleft","type":"mathchar0mo","char":"↿","attrs":{}},
  {"name":"upharpoonright","type":"mathchar0mo","char":"↾","attrs":{}},
  {"name":"downharpoonleft","type":"mathchar0mo","char":"⇃","attrs":{}},
  {"name":"restriction","type":"mathchar0mo","char":"↾","attrs":{}},
  {"name":"multimap","type":"mathchar0mo","char":"⊸","attrs":{}},
  {"name":"downharpoonright","type":"mathchar0mo","char":"⇂","attrs":{}},
  {"name":"leftrightsquigarrow","type":"mathchar0mo","char":"↭","attrs":{}},
  {"name":"rightsquigarrow","type":"mathchar0mo","char":"⇝","attrs":{}},
  {"name":"leadsto","type":"mathchar0mo","char":"⇝","attrs":{}},
  {"name":"dashrightarrow","type":"mathchar0mo","char":"⇢","attrs":{}},
  {"name":"dashleftarrow","type":"mathchar0mo","char":"⇠","attrs":{}},
  {"name":"nleftarrow","type":"mathchar0mo","char":"↚","attrs":{}},
  {"name":"nrightarrow","type":"mathchar0mo","char":"↛","attrs":{}},
  {"name":"nLeftarrow","type":"mathchar0mo","char":"⇍","attrs":{}},
  {"name":"nRightarrow","type":"mathchar0mo","char":"⇏","attrs":{}},
  {"name":"nleftrightarrow","type":"mathchar0mo","char":"↮","attrs":{}},
  {"name":"nLeftrightarrow","type":"mathchar0mo","char":"⇎","attrs":{}},
  {"name":"ulcorner","type":"delimiter","char":"⌜","attrs":{}},
  {"name":"urcorner","type":"delimiter","char":"⌝","attrs":{}},
  {"name":"llcorner","type":"delimiter","char":"⌞","attrs":{}},
  {"name":"lrcorner","type":"delimiter","char":"⌟","attrs":{}},
  {"name":"lvert","type":"delimiter","char":"|","attrs":{"texClass":4}},
  {"name":"rvert","type":"delimiter","char":"|","attrs":{"texClass":5}},
  {"name":"lVert","type":"delimiter","char":"‖","attrs":{"texClass":4}},
  {"name":"rVert","type":"delimiter","char":"‖","attrs":{"texClass":5}},
  {"name":"iiiint","type":"mathchar0mo","char":"⨌","attrs":{"texClass":1}},
];
const commands:Record<string,TexCommand> = {};
let symbolsLoaded=false;
function packageCommands(){
 if(!symbolsLoaded){symbolsLoaded=true;
  for(const d of symbols())if(!commands[d.name])commands[d.name]={...d,execute(p,t,def,id){const n=p.symbol(t,id,def);n.relation=n.kind===K.mo&&operator(n.text)?.[2]===3;p.append(n);}};
  for(const [name,d]of Object.entries(base.commands))if(d.char&&operator(d.char)?.[2]===3&&!commands[name])commands[name]={...d,execute(p,t,def,id){const n=p.symbol(t,id,def);n.relation=true;p.append(n);}};
 }
 return commands;
}

export function sequence(n:Node):Node[] {
  return n.kind===K.mrow&&!Object.keys(n.attributes).length?n.children:[n];
}
export function expand(p:Parser,body:string,count=0) {
  p.expand({body:scan(body),count,optional:null,prefix:[],delimiters:[]});
}
/** Consume an environment body without rescanning source or recursive parsing. */
export function environmentBody(p:Parser,name:string):Token[] {
  const body:Token[]=[];let depth=0;
  while(p.stream.peek()){
    const t=p.stream.next()!;
    if((t[0]===-1||t[0]===-3)&&['begin','end'].includes(spelling(t))){
      const command=spelling(t),arg=p.tokensArgument(),env=raw(arg).trim();
      if(command==='end'&&depth===0){if(env!==name)p.error(`\\begin{${name}} ended with \\end{${env}}`);return body;}
      depth+=command==='begin'?1:-1;
      body.push(t,...scan('{'),...arg,...scan('}'));
    }else body.push(t);
  }
  p.error(`Missing \\end{${name}}`);
}
function star(p:Parser){p.stream.skip();if(p.stream.peek()?.[0]!==42)return false;p.stream.next();return true;}
function style(p:Parser,n:Node,digit:string,display=p.f.display,level=p.f.level):Node {
  if(digit==='')return n;
  if(!/^[0-3]$/.test(digit))p.error('Bad math style for \\genfrac');
  const d=digit==='0',l=Math.max(0,Number(digit)-1),a:Record<string,string>={};
  if(d!==display)a.displaystyle=String(d);
  if(l!==level)a.scriptlevel=String(l);
  return Object.keys(a).length?p.node(K.mstyle,[n],'',a):n;
}
function fraction(p:Parser,name:string){
  let left='',right='',thick='',digit='';
  if(name==='genfrac'){
    const delim=()=>{const t=p.tokensArgument();if(!t.length)return '';p.stream.push(t);return p.delimiter();};
    left=delim();right=delim();thick=raw(p.tokensArgument());digit=raw(p.tokensArgument()).trim();
  }else{
    digit=name.startsWith('d')?'0':name.startsWith('t')?'1':'';
    if(name.includes('binom')){left='(';right=')';thick='0';}
  }
  const display=p.f.display,level=p.f.level;
  p.args(2,n=>{
    let f=p.node(K.mfrac,n,'',thick?{linethickness:thick}:{});
    if(left||right){const size=(digit===''?display:digit==='0')?'2.047em':'1.2em';f=p.atom([p.atom([p.delimiterNode(left,size)],'OPEN'),f,p.atom([p.delimiterNode(right,size)],'CLOSE')]);}
    p.append(style(p,f,digit,display,level));
  });
}
for(const name of ['frac','tfrac','dfrac','binom','tbinom','dbinom','genfrac'])commands[name]={execute(p){fraction(p,name);}};
commands.cfrac={execute(p){
  const align=raw(p.optional()??[]).trim();if(!['','l','r'].includes(align))p.error('Illegal alignment specified in \\cfrac');
  const values=[p.tokensArgument(),p.tokensArgument()],nodes:Node[]=[],level=p.f.level;
  const next=()=>{if(nodes.length===2){p.append(p.node(K.mfrac,nodes,'',align?{numalign:align==='l'?'left':'right',denomalign:align==='l'?'left':'right'}:{}));return;}
    p.parseTokens(values[nodes.length],n=>{const atom=p.atom(sequence(n));nodes.push(p.row([p.node(K.mpadded,[p.row([],true)],'',{height:'8.6pt',depth:'3pt',width:'0'}),level?p.node(K.mstyle,[atom],'',{scriptlevel:'0'}):atom],true));next();});p.f.display=false;p.f.level=1;};next();
}};
for(const [name,glyph,l]of [['xrightarrow','→',5],['xleftarrow','←',10]] as const)commands[name]={execute(p){
  const bottom=p.optional();
  p.argument(top=>{
    const pad=(n:Node,under:boolean)=>markPackageNode(p.node(K.mpadded,[...sequence(n),p.node(K.mspace,[],'',under?{height:'.75em'}:{depth:'.2em'})],'',{width:'+0.833em',lspace:em(l/18),voffset:under?'.15em':'-.2em',...(under?{depth:'-.15em'}:{height:'-.2em'})}),'xarrow-label');
    const arrow=p.node(K.mo,[],glyph,{'data-mjx-texclass':'ORD'});
    const finish=(under?:Node)=>p.append(p.atom([p.atom([],'NONE'),p.node(under?K.munderover:K.mover,[arrow,...(under?[pad(under,true)]:[]),pad(top,false)])],'REL'));
    if(bottom)p.parseTokens(bottom,n=>finish(n));else finish();
  });
}};
for(const [name,body,count]of [
  ['implies','\\;\\Longrightarrow\\;',0],['impliedby','\\;\\Longleftarrow\\;',0],
  ['substack','\\begin{subarray}{c}#1\\end{subarray}',1],
  ['varliminf','\\mathop{\\underline{\\mmlToken{mi}{lim}}}',0],
  ['varlimsup','\\mathop{\\overline{\\mmlToken{mi}{lim}}}',0],
  ['varinjlim','\\mathop{\\underrightarrow{\\mmlToken{mi}{lim}}}',0],
  ['varprojlim','\\mathop{\\underleftarrow{\\mmlToken{mi}{lim}}}',0],
] as const)commands[name]={execute(p){expand(p,body,count);}};
commands.idotsint={execute(p){p.stream.skip();expand(p,spelling(p.stream.peek()??[0,0,0,''])==='limits'?'\\!\\!\\mathop{\\,\\,\\int\\cdots\\int}':'\\int\\cdots\\int');}};
for(const [name,glyph]of [['mathring','˚'],['dddot','⃛'],['ddddot','⃜']] as const)commands[name]={execute(p){p.argument(n=>p.append(p.atom([p.node(K.mover,[n,p.node(K.mo,[],glyph)])])));}};
commands.nobreakspace={execute(p){p.append(p.node(K.mtext,[],'\u00a0'));}};
for(const [name,width]of [['negmedspace',-2/9],['negthickspace',-5/18]] as const)commands[name]={execute(p){p.append(p.node(K.mspace,[],'',{width:em(width)}));}};
for(const [name,text]of [['injlim','inj\u2006lim'],['projlim','proj\u2006lim']] as const)commands[name]={execute(p){const n=p.node(K.mo,[],text,{'data-mjx-texclass':'OP',movablelimits:'true'});n.op=0;n.limits=1;p.append(n);}};
commands.operatorname={execute(p){
  const limits=star(p),tokens=p.tokensArgument();
  const configured=(p.options.texOptions?.ams as Record<string,unknown>)?.operatornamePattern;
  if(configured!==undefined&&!(configured instanceof RegExp))p.error('ams.operatornamePattern must be a RegExp');
  const pattern=configured instanceof RegExp?new RegExp(configured.source,configured.flags.replace(/[gy]/g,'')):/^[-*a-zA-Z0-9]+/;
  // Operator names group letter runs and also treat '-' and '*' as letters.
  const transformed:Token[]=[];
  for(let i=0;i<tokens.length;){
    if(tokens[i][0]>=0&&/^[a-zA-Z*\-]$/.test(spelling(tokens[i]))){
      let candidate='',j=i;
      while(j<tokens.length&&tokens[j][0]>=0)candidate+=spelling(tokens[j++]);
      const match=pattern.exec(candidate),word=match?.index===0&&match[0]?match[0]:spelling(tokens[i]);
      let length=0;while(i<tokens.length&&length<word.length)length+=spelling(tokens[i++]).length;
      transformed.push(...scan('\\mmlToken{mi}[mathvariant="normal"]{'+word+'}'));
    }else transformed.push(tokens[i++]);
  }
  p.parseTokens(transformed,n=>{if(n.kind!==K.mi){const stack=[...n.children];while(stack.length){const child=stack.pop()!;stack.push(...child.children);if(child.kind===K.mi&&child.text.length>1&&child.attributes.mathvariant==='normal'){delete child.attributes.mathvariant;child.attributes['data-mjx-auto-op']='false';}}}const op=n.kind===K.mi?n:p.atom(sequence(n),'OP');if(n.kind===K.mi){if(n.text.length>1)delete n.attributes.mathvariant;if(n.text.length===1||/[-*]/.test(n.text))n.attributes['data-mjx-texclass']='OP';}op.op=1;op.limits=limits?1:0;p.append(op);});
  if(!limits){p.stream.skip();if(spelling(p.stream.peek()??[0,0,0,''])==='limits')p.stream.next();}
}};
commands.DeclareMathOperator={execute(p){const s=star(p),name=spelling(p.tokensArgument()[0]),body=p.tokensArgument();p.macros.set(name,{body:[...scan('\\operatorname'+(s?'*':'')+'{'),...body,...scan('}')],count:0,optional:null,prefix:[],delimiters:[]});}};
commands.sideset={execute(p){p.args(3,([pre,post,base])=>{
  const split=(n:Node):[Node|undefined,Node[]]=>{const nodes=sequence(n).slice();const first=nodes[0];if(first&&[K.msub,K.msup,K.msubsup].includes(first.kind)&&first.children[0]?.kind===K.mi&&!first.children[0].text){nodes.shift();return[first,nodes];}return[undefined,nodes.filter(n=>n.kind!==K.mrow||n.children.length||n.attributes['data-mjx-texclass'])];};
  const [a,ar]=split(pre),[b,br]=split(post);
  const scripts=(n:Node)=>n.kind===K.msub?[n.children[1],p.node(K.none)]:n.kind===K.msup?(n.children[1].attributes['data-mjx-alternate']?[n.children[1],p.node(K.none)]:[p.node(K.none),n.children[1]]):[n.children[1],n.children[2]];
  let n=base;
  if(a&&!ar.length)n=p.node(K.mmultiscripts,[base,...(b?scripts(b):[]),p.node(K.mprescripts),...scripts(a)],'',{'data-mjx-script-align':'left'});
  else if(b){b.children[0]=base;n=b;}
  if(a&&ar.length)a.children[0]=p.node(K.mphantom,[p.node(K.mpadded,[clone(p,base)],'',{width:'0'})]);
  const result=p.atom([...(ar.length&&a?[a]:[]),...ar,...sequence(n),...br],'OP');result.limits=1;p.append(result);
});}};
export function clone(p:Parser,n:Node,stripIds=false):Node {
  const copy=(n:Node)=>{const c=p.node(n.kind,[],n.text,{...n.attributes},n.start);c.op=n.op;c.limits=n.limits;c.fixed=n.fixed;c.rawAttrs=n.rawAttrs;c.relation=n.relation;c.inferred=n.inferred;c.html=n.html;c.tokenCellSpacing=n.tokenCellSpacing;if(stripIds)delete c.attributes.id;return c;};
  const result=copy(n),stack:[Node,Node][]=[[n,result]];
  while(stack.length){const [source,target]=stack.pop()!;for(const child of source.children){const c=copy(child);target.children.push(c);stack.push([child,c]);}}
  return result;
}
const explicitTags=new WeakMap<Parser,boolean>();
const equationTags=new WeakMap<object,{tag:string;starred:boolean}>();
const unnumberedEquations=new WeakSet<object>();
export function tagCell(p:Parser,tag:string,label='',starred=false):Node {
  return p.labelCell(label,tag,starred);
}
commands.tag={execute(p){const starred=star(p),tag=raw(p.tokensArgument()).trim(),t=p.tagTable();
  if(!tag){if(t)t.noNumbers.add(t.rows.length);return;}
  if(t){const row=t.rows.length;if(t.tagCells.has(row))p.error('Multiple \\tag');t.tagCells.set(row,tagCell(p,tag,t.labels[row],starred));(t.explicitTags??=new Map()).set(row,tag);t.noNumbers.delete(row);return;}
  const equation=[...p.frames].reverse().find(f=>f.env==='equation'||f.env==='equation*');
  if(equation){if(equationTags.has(equation))p.error('Multiple \\tag');equationTags.set(equation,{tag,starred});return;}
  if(explicitTags.has(p))p.error('Multiple \\tag');explicitTags.set(p,true);p.hasTaggableEnvironment=true;
  const f=p.frames[0],done=f.done;f.done=nodes=>done([p.node(K.mtable,[p.node(K.mlabeledtr,[tagCell(p,tag,p.label,starred),p.node(K.mtd,nodes)])],'',{displaystyle:'true',...(p.options.tagSide&&p.options.tagSide!=='right'?{side:p.options.tagSide}:{}),...(p.options.tagIndent&&p.options.tagIndent!=='0.8em'?{minlabelspacing:p.options.tagIndent}:{})})]);
}};
commands.notag={execute(p){const t=p.tagTable();if(t){t.noNumbers.add(t.rows.length);t.tagCells.delete(t.rows.length);t.explicitTags?.delete(t.rows.length);}else{const equation=[...p.frames].reverse().find(f=>f.env==='equation'||f.env==='equation*');if(equation)unnumberedEquations.add(equation);else p.numbered=false;}}};
commands.nonumber=commands.notag;
commands.eqref={execute(p){const label=raw(p.tokensArgument());p.reference(label);const n=p.f.nodes.at(-1)!;n.children[0].text='('+n.children[0].text+')';}};
for(const [name,side]of [['shoveleft','left'],['shoveright','right']] as const)commands[name]={execute(p){if(!p.f.env.startsWith('multline'))p.error('Command only allowed in multline environment');if(p.f.nodes.length)p.error('Command must come at the beginning of the line');p.f.table!.fill=side;}};

export function beginAms(p:Parser,name:string,done?:(n:Node)=>void){
  const bare=name.replace(/\*$/,''),starred=name.endsWith('*');
  const append=done??((n:Node)=>p.append(n));
  if(bare==='equation'){
    const numbered=!starred&&p.options.tags!==undefined&&p.options.tags!=='none';
    p.hasTaggableEnvironment=true;
    p.frame(-4,false,n=>{const tag=equationTags.get(frame);if(numbered&&!unnumberedEquations.has(frame)||tag)append(p.node(K.mtable,[p.node(K.mlabeledtr,[tag?tagCell(p,tag.tag,p.label,tag.starred):p.labelCell(p.label),p.node(K.mtd,n)])],'',{displaystyle:'true',...(p.options.tagSide==='left'?{side:'left'}:{}),...(p.options.tagIndent&&p.options.tagIndent!=='0.8em'?{minlabelspacing:p.options.tagIndent}:{})}));else if(done)done(p.row(n));else for(const x of n)append(x);},name);const frame=p.f;return;
  }
  const surroundingLevel=p.f.level;
  const matrix=bare.includes('matrix')||bare==='subarray'||bare==='cases';
  const small=bare==='smallmatrix'||bare==='subarray';
  let position='';if(['aligned','alignedat','gathered'].includes(bare))position=raw(p.optional()??[]);
  if(position&&!['t','b','c'].includes(position)){p.stream.push(scan('['+position+']'));position='';}
  let count=0;
  if(bare.endsWith('alignat')||bare==='alignedat'){const value=raw(p.tokensArgument());if(!/^\d+$/.test(value)||Number(value)<1)p.error(`Argument to \\begin{${name}} must be a positive integer`);count=Number(value);if(count>(p.options.maxNodes??100000)/2)p.error('Node limit exceeded');}
  let align=matrix?(bare==='subarray'?raw(p.tokensArgument()):bare==='cases'?'ll':'c'):bare.startsWith('gather')||bare==='multline'?'c':bare==='eqnarray'?'rcl':count?'rl'.repeat(count):'rl';
  const taggable=!matrix&&!['split','aligned','alignedat','gathered'].includes(bare);
  if(taggable)p.hasTaggableEnvironment=true;
  p.tableStart('ams-table',align==='ll'?'l l':align,-4,n=>{
    const t=frame.table!,rowspacing=n.attributes.rowspacing;
    if(matrix){
      n.attributes={columnspacing:small?(bare==='subarray'?'0em':'0.333em'):'1em',rowspacing:small?(bare==='subarray'?'0.1em':'.2em'):bare==='cases'?'.2em':'4pt',...(bare==='cases'?{columnalign:'left left'}:{}),...(align==='l'?{columnalign:'left'}:{})};
      if(small){n.attributes['data-mjx-smallmatrix']='true';if(surroundingLevel!==1)n=p.node(K.mstyle,[n],'',{scriptlevel:'1'});}
      const sides:Record<string,string[]>={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['‖','‖'],cases:['{','']};
      const override=bare==='vmatrix'||bare==='Vmatrix'?p.macros.get(bare==='vmatrix'?'vert':'Vert'):undefined;
      const removed=override?.body.length===1&&override.body[0][0]>=0&&!fenceChars.has(spelling(override.body[0]));
      if(sides[bare]&&!removed){const [l,r]=sides[bare];n=p.atom([p.delimiterNode(l,'','OPEN'),n,p.delimiterNode(r,'','CLOSE')],'INNER');}
      append(n);return;
    }
    const cols=Math.max(0,...t.rows.map(r=>r.length));
    const multline=bare==='multline';
    const fl=bare==='flalign'||bare==='xalignat'||bare==='xxalignat';
    if(multline){
      n.attributes={displaystyle:'true',rowspacing:'.5em',columnspacing:'100%',width:String((p.options.texOptions?.ams as Record<string,unknown>)?.multlineWidth??'100%'),'data-array-padding':Array(2).fill(String((p.options.texOptions?.ams as Record<string,unknown>)?.multlineIndent??'1em')).join(' '),'data-width-includes-label':'true'};
      for(let i=0;i<n.children.length;i++){const row=n.children[i];const cell=row.children[row.kind===K.mlabeledtr?1:0];if(cell&&i>0)p.fixInitialMO(cell.children);if(cell&&!cell.attributes.columnalign&&(i===0||i===n.children.length-1))cell.attributes.columnalign=i===0?'left':'right';}
      let label:Node|undefined;
      for(const row of n.children)if(row.kind===K.mlabeledtr){label=row.children.shift();row.kind=K.mtr;}
      if(!label&&!starred&&(p.options.tags==='ams'||p.options.tags==='all')&&!t.noNumbers.size&&n.children.length)label=p.labelCell(t.labels.find(Boolean)??'');
      if(label&&n.children.length){const row=n.children[p.options.tagSide==='left'?0:n.children.length-1];row.kind=K.mlabeledtr;row.children.unshift(label);}
    }else{
      n.attributes={displaystyle:'true',columnalign:Array.from({length:cols},(_,i)=>align[i%align.length]==='r'?'right':align[i%align.length]==='l'?'left':'center').join(' '),columnspacing:Array.from({length:Math.max(0,cols-1)},(_,i)=>bare==='eqnarray'?(i%2?'0.278em':'0em'):i%2?'2em':'0em').join(' '),rowspacing:'3pt','data-break-align':Array.from({length:cols},(_,i)=>align[i%align.length]==='r'?'bottom':align[i%align.length]==='l'?'top':'middle').join(' ')};
      if(!cols)n.attributes.columnspacing='0em';
      if(bare.startsWith('gather')){n.attributes.columnspacing='1em';delete n.attributes.columnalign;n.attributes['data-break-align']='middle';}
      if(bare==='split')n.attributes.columnspacing='0em';
      if(count&&!fl)n.attributes.columnspacing=Array(Math.max(0,cols-1)).fill('0em').join(' ');
      if(n.attributes.columnalign==='center')delete n.attributes.columnalign;
      for(const row of n.children){const cells=row.children.slice(row.kind===K.mlabeledtr?1:0);for(let i=0;i<cells.length;i++){
        const cell=cells[i],left=align[i%align.length]==='l';
        if(bare.startsWith('gather')&&i>0)p.fixInitialMO(cell.children);
        if(bare==='eqnarray'&&i%3===1)cell.children.unshift(p.node(K.mi));
        if(left){
          p.fixInitialMO(cell.children);
          cell.children=[p.node(K.mstyle,cell.children,'',{indentshift:bare==='eqnarray'?'.7em':'2em'})];
        }
      }}
      if(fl)adjustFlalign(p,n,bare,count);
    }
    if(t.rowspaces.length)n.attributes.rowspacing=rowspacing;
    if(['t','b','c'].includes(position))n.attributes.align=({t:'baseline 1',b:'baseline -1',c:'center'} as Record<string,string>)[position]??position;
    if(p.options.tagSide==='left'&&n.children.some(r=>r.kind===K.mlabeledtr))n.attributes.side='left';
    append(n);
  });
  const frame=p.f,t=frame.table!;frame.env=name;
  t.display=!matrix;frame.display=t.display;if(!matrix){t.rowspacing=bare==='multline'?'.5em':'3pt';t.rowspacingBase=dimensionEm(t.rowspacing);}
  if(small){frame.level=1;frame.display=false;}
  t.taggable=taggable;t.numbered=taggable&&!starred&&(p.options.tags==='ams'||p.options.tags==='all'||p.options.tags==='cases');
  if(bare==='multline')t.numbered=false;
}
function adjustFlalign(p:Parser,n:Node,bare:string,count:number){
  const padded=bare==='xalignat';let max=0;
  for(const row of n.children){const offset=row.kind===K.mlabeledtr?1:0,cells=row.children.splice(offset);const out:Node[]=[];
    if(padded)out.push(p.node(K.mtd));
    for(let i=0;i<Math.max(cells.length,count*2);i++){out.push(cells[i]??p.node(K.mtd,i%2===1?[p.node(K.mstyle,[],'',{indentshift:'2em'})]:[]));if(i%2===1&&(padded||i<Math.max(cells.length,count*2)-1))out.push(p.node(K.mtd));}
    if(offset&&bare!=='flalign'){const label=row.children[0];label.children=[p.node(K.mpadded,label.children,'',{width:'0',...(p.options.tagSide==='left'?{}:{lspace:'-1width'})})];}
    row.children.push(...out);max=Math.max(max,out.length);
  }
  const pattern=padded?['center','right','left']:['right','left','center'];
  const width=padded?['fit','auto','auto']:['auto','auto','fit'];
  n.attributes={...(bare==='flalign'&&max<=2?{}:{width:'100%'}),...n.attributes,columnalign:Array.from({length:max},(_,i)=>pattern[i%3]).join(' '),columnspacing:'0em',columnwidth:Array.from({length:max},(_,i)=>width[i%3]).join(' '),'data-break-align':Array.from({length:max},(_,i)=>({left:'top',right:'bottom',center:'middle'})[pattern[i%3]]).join(' '),'data-width-includes-label':'true',...(bare!=='flalign'?{minlabelspacing:'0'}:{})};
}

const environments:Record<string,TexEnvironment>={};
for(const name of ['equation','equation*','eqnarray','eqnarray*','align','align*','multline','multline*','split','gather','gather*','alignat','alignat*','alignedat','aligned','gathered','xalignat','xalignat*','xxalignat','flalign','flalign*','subarray','smallmatrix','matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','cases'])environments[name]={begin:beginAms};
commands.mmlToken={...base.commands.mmlToken,execute(p,t,d,id){base.commands.mmlToken.execute(p,t,d,id);const n=p.f.nodes.at(-1)!;n.text=n.text.replace(/\\U\{([0-9a-fA-F]+)\}/g,(_,hex)=>String.fromCodePoint(parseInt(hex,16)));}};
commands.mbox={execute(p){const tokens=p.tokensArgument(),text=raw(tokens).replace(/\\eqref\{([^}]+)\}/g,(_,label)=>'$\\eqref{'+label+'}$');p.renderText(scan(text),'',true);}};
export default {name:'ams',get commands(){return packageCommands();},environments,configurationModules:['input/tex/ams/AmsConfiguration.js'],options:['ams']} satisfies TexPackage;
