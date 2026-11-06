import {raw} from '../scanner.js';
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
import {requirePackage} from './require.js';
import {registeredPackages} from './registry.js';
const defaults:Record<string,Record<string,unknown>|false>={tex:{FindTeX:false,formatError:false,package:false,baseURL:false,tags:false,maxBuffer:false,maxMacros:false,macros:false,environments:false},setoptions:false,autoload:false,require:false,configmacros:false,tagformat:false};
const packageDefaults:Record<string,Record<string,unknown>>={ams:{multlineWidth:'100%',multlineIndent:'1em',operatornamePattern:/^[a-z]+/},units:{loose:false,ugly:false},noundefined:{color:'red',background:'',size:''},color:{padding:'5px',borderWidth:'2px'}};
function values(source:string):[string,unknown][] {const entries:string[]=[];let start=0,depth=0;for(let i=0;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;if(source[i]===','&&!depth){entries.push(source.slice(start,i));start=i+1;}}entries.push(source.slice(start));return entries.filter(x=>x.trim()).map(x=>{const i=x.indexOf('=');const key=(i<0?x:x.slice(0,i)).trim();let value:unknown=i<0?true:x.slice(i+1).trim().replace(/^\{(.*)\}$/s,'$1');if(value==='true')value=true;if(value==='false')value=false;return[key,value];});}
const topOptions=new WeakMap<object,Record<string,unknown>>();
export function setOptions(p:Parser) {
 const extension=raw(p.optional()??[])||'tex',source=raw(p.tokensArgument());
 const config:Record<string,any>={allowPackageDefault:true,allowOptionsDefault:true,...p.options.texOptions?.setoptions as Record<string,any>};
 const allow={...defaults,...config.allowOptions};
 for(const name of Object.keys(config.allowOptions??{}))if(typeof defaults[name]==='object'&&typeof config.allowOptions[name]==='object')allow[name]={...defaults[name],...config.allowOptions[name]};
 const settings=allow[extension];
 if(config.filterPackage){if(!config.filterPackage(p,extension))return;}
 else {if(extension!=='tex'&&!registeredPackages.some(x=>x.name===extension))p.error(`Not a defined package: ${extension}`);if(settings===false || settings===undefined&&!config.allowPackageDefault)p.error(`Options can't be set for package "${extension}"`);}
 for(const [key,original] of values(source)) {
   const target=extension==='tex'?p.options:p.options.texOptions![extension]={...packageDefaults[extension],...p.options.texOptions?.[extension] as object};
   if(config.filterOption){if(!config.filterOption(p,extension,key))continue;}
   else {
     const permitted=settings&&typeof settings==='object'?settings[key]:undefined;
     if(permitted===false || permitted===undefined&&!config.allowOptionsDefault)p.error(extension==='tex'?`Option "${key}" is not allowed to be set`:`Option "${key}" is not allowed to be set for package ${extension}`);
     if(!(key in target)&&!(extension==='tex'&&['tagSide','tagIndent','tagAlign','useLabelIds','ignoreDuplicateLabels','digits','numberPattern','identifierPattern'].includes(key)))p.error(extension==='tex'?`Invalid TeX option "${key}"`:`Invalid option "${key}" for package "${extension}"`);
   }
   const match=typeof original==='string'?original.match(/^\/(.*)\/([dgimsuvy]*)$/):null;
   const value=config.filterValue?config.filterValue(p,extension,key,original):match?new RegExp(match[1],match[2]):original;
   (target as Record<string,unknown>)[key]=value;
   if(extension==='tex'){let saved=topOptions.get(p.session);if(!saved)topOptions.set(p.session,saved={});saved[key]=value;}
   if(extension==='tex'&&(key==='digits'||key==='numberPattern')) {p.options.numberPattern=new RegExp((value instanceof RegExp?value.source:String(value)).replace(/^\^/,''),(value instanceof RegExp?value.flags.replace(/[gy]/g,''):'')+'y');topOptions.get(p.session)!.numberPattern=p.options.numberPattern;}
 }
}
export default {name:'setoptions',priority:3,commands:{setOptions:{execute:setOptions},Require:{execute:requirePackage}},initialize(p){Object.assign(p.options,topOptions.get(p.session));},environments:{},options:['setoptions'],configurationModules:['input/tex/setoptions/SetOptionsConfiguration.js']} satisfies TexPackage;
