import {K} from '../ast.js';
import type {Parser} from '../parser.js';
import ams from './ams.js';
import {raw} from '../scanner.js';
import type {TexPackage} from './types.js';
type Result=string|string[];
type Key='number'|'tag'|'ref'|'id'|'url';
export function format(p:Parser,key:Key,...args:(string|number)[]):Result {
  const options=p.options.texOptions?.tagformat as Partial<Record<Key,(...args:any[])=>Result>>|undefined;
  const callback=options?.[key]||(key==='ref'?options?.tag:undefined);
  if(callback){if(typeof callback!=='function')throw new TypeError(`tagformat.${key} must be a function`);return callback(...args);}
  const value=String(args[0]);
  return key==='tag'||key==='ref'?['(',value,')']:key==='id'?'mjx-eqn:'+value.replace(/\s/g,'_'):key==='url'?String(args[1])+'#'+encodeURIComponent(value):value;
}
export function tagNodes(p:Parser,tag:string,starred=false,ref=false){
  const formatted=starred?tag:format(p,ref?'ref':'tag',tag);
  const parts=ref?[Array.isArray(formatted)?formatted.join(''):formatted]:Array.isArray(formatted)?formatted:(formatted.match(/^(\(|\[|\{)(.*)(\}|\]|\))$/)?.slice(1)??[formatted]);
  return parts.filter(x=>x!==''&&x!=null).flatMap(x=>p.tagText(String(x)));
}
export default {name:'tagformat',priority:1,commands:{
  tag:ams.commands.tag,
  eqref:{execute(p){p.reference(raw(p.tokensArgument()),true);}},
},environments:{},options:['tagformat'],configurationModules:['input/tex/tagformat/TagFormatConfiguration.js']} satisfies TexPackage;
