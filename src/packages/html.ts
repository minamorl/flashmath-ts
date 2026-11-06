import {raw} from '../scanner.js';
import type {TexPackage,TexCommand} from './types.js';
const commands:Record<string,TexCommand>={};
for(const [name,attr] of Object.entries({href:'href',class:'class',style:'style',cssId:'id',data:'data'}))commands[name]={execute(p){const value=raw(p.tokensArgument());p.argument(n=>{
  if(attr==='data')for(const entry of value.split(',')){
    const [key,...rest]=entry.split('=');const k=key.trim();
    if(!k||/[\x00-\x20\x7f-\x9f"'>/=]/.test(k)||[...k].some(c=>{const n=c.codePointAt(0)!;return n>=0xfdd0&&n<=0xfdef||(n&0xffff)>=0xfffe;}))p.error(`Invalid HTML attribute: data-${k}`);
    n.attributes['data-'+k]=rest.length?rest.join('=').trim().replace(/^\{(.*)\}$/s,'$1'):'true';
  }else {const old=n.attributes[attr];n.attributes[attr]=old&&(attr==='style'||attr==='class')?old+(attr==='style'?(old.endsWith(';')?' ':'; '):' ')+value:value;}
  p.append(n);
});}};
export default {name:'html',commands,environments:{},configurationModules:['input/tex/html/HtmlConfiguration.js']} satisfies TexPackage;
