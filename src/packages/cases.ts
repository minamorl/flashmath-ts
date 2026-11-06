/** Layout follows MathJax 4.1.3 (Apache-2.0), Copyright (c) 2017-2026 The MathJax Consortium.
 * See conformance/fixtures/LICENSE.MathJax.
 */
/** Numbered piecewise expressions with text-mode conditions. */
import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
import {scan,spelling,space} from '../scanner.js';
import type {Token} from '../scanner.js';
import {environmentBody,tagCell} from './ams.js';
import {decorate} from './empheq.js';
function begin(p:Parser,name:string){
  const left=p.tokensArgument(),body=environmentBody(p,name),rewritten:Token[]=[];
  let depth=0;
  for(let i=0;i<body.length;i++){
    const t=body[i];
    if(t[0]===123)depth++;if(t[0]===125)depth--;
    if(t[0]!==38||depth){rewritten.push(t);continue;}
    const text:Token[]=[];let d=0;
    while(i+1<body.length){const next=body[i+1],name=next[0]===-1?spelling(next):'';
      if(!d&&(name==='\\'||name==='cr'||name==='label'))break;
      if(!d&&next[0]===38)p.error('Extra alignment tab in text for numcase environment');
      i++;if(next[0]===123)d++;if(next[0]===125)d--;text.push(next);
    }
    while(text.length&&space(text[0][0]))text.shift();
    rewritten.push(t,...scan('\\text{'),...text,...scan('}&'));
  }
  p.stream.push([...rewritten,...scan('\\end{'+name+'}')]);
  p.hasTaggableEnvironment=true;
  p.tableStart('numbered-cases','l l l',-4,table=>{
    const t=frame.table!,cols=Math.max(0,...t.rows.map(r=>r.length));
    table.attributes={columnalign:Array(cols).fill('left').join(' '),columnspacing:'1em',rowspacing:'.2em',...(cols>1?{'data-break-align':Array(cols).fill('top').join(' ')}:{})};
    const numbered=p.options.tags==='cases'||p.options.tags==='ams'||p.options.tags==='all';
    let main=0;
    for(let i=0;i<table.children.length;i++){
      const row=table.children[i];
      if(numbered&&!t.noNumbers.has(i)&&row.kind!==K.mlabeledtr){
        if(name==='subnumcases'&&p.options.tags==='cases'){
          if(!main)main=++p.session.counter;
          row.kind=K.mlabeledtr;row.children.unshift(tagCell(p,String(main)+String.fromCharCode(97+i),t.labels[i]??''));
        }else{row.kind=K.mlabeledtr;row.children.unshift(p.labelCell(t.labels[i]??''));}
      }
      const offset=row.kind===K.mlabeledtr?1:0;
      for(let j=offset+1;j<row.children.length;j++){const children=row.children[j].children;for(const child of children)if(child.kind===K.mrow&&!Object.keys(child.attributes).length)child.kind=K.mstyle;row.children[j].children=[p.node(K.mstyle,children,'',{indentshift:'2em'})];}
    }
    decorate(p,table,[...left,...scan('\\mmlToken{mo}{\\U{7B}}\\,')],[],n=>p.append(n));
  });
  const frame=p.f;frame.env=name;frame.display=false;frame.table!.taggable=true;frame.table!.numbered=false;
}
export default {name:'cases',commands:{},environments:{numcases:{begin},subnumcases:{begin}},configurationModules:['input/tex/cases/CasesConfiguration.js']} satisfies TexPackage;
