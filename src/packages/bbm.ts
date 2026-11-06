import {K} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';

/** Math-font arguments share the existing scanner and explicit argument stack. */
export function fontArgument(p:Parser,font:string) {
  p.argument(n=>{
    if(font.startsWith('-')&&!font.startsWith('-tex-')){
      const stack=[n];
      while(stack.length){const x=stack.pop()!;if(x.attributes.mathvariant===font){delete x.attributes.mathvariant;x.attributes['data-mjx-variant']=font;}stack.push(...x.children);}
    }
    p.append(p.atom(n.kind===K.mrow&&!n.attributes['data-mjx-texclass']?n.children:[n]));
  });
  p.f.font=font;p.f.multi=true;
}
const versions=new WeakMap<object,boolean>();
export default {
  name:'bbm',
  commands:{
    mathversion:{execute(p){versions.set(p.session,raw(p.tokensArgument())==='bold');}},
    mathbbm:{execute(p){fontArgument(p,(versions.get(p.session)??!!(p.options.texOptions?.bbm as {bold?:boolean})?.bold)?'-bbm-bold':'-bbm-normal');}},
    mathbbmss:{execute(p){fontArgument(p,(versions.get(p.session)??!!(p.options.texOptions?.bbm as {bold?:boolean})?.bold)?'-bbm-sans-serif-bold':'-bbm-sans-serif');}},
    mathbbmtt:{execute(p){fontArgument(p,'-bbm-monospace');}},
  },environments:{},options:['bbm'],configurationModules:['input/tex/bbm/BbmConfiguration.js'],
} satisfies TexPackage;
