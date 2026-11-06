import {scan} from '../scanner.js';
import type {Macro} from '../scanner.js';
import type {TexPackage} from './types.js';
export function configuredMacro(value:unknown):Macro {
  const [body,count=0,option]=typeof value==='string'?[value]:value as [string,number?,(string|string[])?];
  return {body:scan(body),count,optional:typeof option==='string'?scan(option):null,prefix:Array.isArray(option)?scan(option[0]??''):[],delimiters:Array.isArray(option)?option.slice(1).map(scanPart=>scan(scanPart)):[]};
}
const initialized=new WeakSet<object>();
export default {
  name:'configmacros',commands:{},environments:{},options:['active','macros','environments'],configurationModules:['input/tex/configmacros/ConfigMacrosConfiguration.js'],
  initialize(p) {
    if(initialized.has(p.session))return;initialized.add(p.session);
    for(const [name,value] of Object.entries(p.options.texOptions?.macros??{}))if(!p.macros.has(name))p.macros.set(name,configuredMacro(value));
    for(const [name,value] of Object.entries(p.options.texOptions?.environments??{})) {const [begin,end,count=0,option]=(value as any[]);p.environments.set(name,{begin:configuredMacro([begin,count,option]),end:configuredMacro(end)});}
  },
} satisfies TexPackage;
