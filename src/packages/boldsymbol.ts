import {K} from '../ast.js';
import type {TexPackage} from './types.js';
const bold:Record<string,string>={normal:'bold',italic:'bold-italic',fraktur:'bold-fraktur',script:'bold-script','sans-serif':'bold-sans-serif','-tex-calligraphic':'-tex-bold-calligraphic','-tex-oldstyle':'-tex-bold-oldstyle','-tex-mathit':'bold-italic'};
export default {name:'boldsymbol',commands:{boldsymbol:{execute(p){p.argument(n=>{
  const stack=[n];while(stack.length){const x=stack.pop()!;
    // Text boxes create a fresh math environment. Explicit inner boldsymbol
    // commands have already rewritten their own arguments.
    if(x.kind===K.mstyle&&x.attributes.displaystyle==='false')continue;
    if([K.mi,K.mn,K.mo].includes(x.kind)&&x.attributes.stretchy!=='true'&&!['OPEN','CLOSE'].includes(x.attributes['data-mjx-texclass'])){
      const variant=x.attributes.mathvariant||(x.kind===K.mi&&Array.from(x.text).length===1?'italic':'normal');
      if(bold[variant]){if(variant==='-tex-mathit'){delete x.attributes.mathvariant;x.attributes['data-mjx-variant']='bold-italic';}else x.attributes.mathvariant=bold[variant];}
    }stack.push(...x.children);
  }
  if(n.kind===K.mrow&&!Object.keys(n.attributes).length)for(const x of n.children)p.append(x);else p.append(n);
});}}},environments:{},configurationModules:['input/tex/boldsymbol/BoldsymbolConfiguration.js']} satisfies TexPackage;
