import type {PackageEntry,TexPackage,PackageConfiguration,RegisteredCommand} from './types.js';
import {C} from '../symbols.js';
import {UnsupportedFeatureError} from '../ast.js';

// Only registration runs at module initialization. Frozen definitions and resolved
// configurations are shared; macro, label and parse state belongs to a session.
const registrations:TexPackage[]=[];
import base from './base.js'; registrations.push(base);
import newcommand from './newcommand.js'; registrations.push(newcommand);
import ams from './ams.js'; registrations.push(ams);
import colorv2 from './colorv2.js'; registrations.push(colorv2);
import verb from './verb.js'; registrations.push(verb);
import noerrors from './noerrors.js'; registrations.push(noerrors);
import noundefined from './noundefined.js'; registrations.push(noundefined);
import begingroup from './begingroup.js'; registrations.push(begingroup);
import configmacros from './configmacros.js'; registrations.push(configmacros);
import retry from './retry.js'; registrations.push(retry);
import textmacros from './textmacros.js'; registrations.push(textmacros);
import require from './require.js'; registrations.push(require);
import autoload from './autoload.js'; registrations.push(autoload);
import setoptions from './setoptions.js'; registrations.push(setoptions);
import bussproofs from './bussproofs.js'; registrations.push(bussproofs);
export const registeredPackages:readonly TexPackage[]=Object.freeze(registrations);
const modules=new Set(registeredPackages.flatMap(p=>p.configurationModules??[]));
modules.add('input/tex/Configuration.js');

function build(entries:readonly PackageEntry[]):PackageConfiguration {
  const selected=entries.map((entry,index)=>{
    const [name,priority]=typeof entry==='string'?[entry,undefined]:entry;
    const definition=registeredPackages.find(p=>p.name===name);
    if(!definition)throw new UnsupportedFeatureError(`Unsupported TeX package: ${name}`);
    if(priority!==undefined&&!Number.isFinite(priority))throw new TypeError('Package priority must be finite');
    return {definition,priority:priority??definition.priority??5,index};
  }).sort((a,b)=>b.priority-a.priority||a.index-b.index);
  const commands:(RegisteredCommand|undefined)[]=[],extensions=new Map<string,RegisteredCommand>();
  const environments=new Map(),options=new Set<string>();
  for(const {definition:pkg}of selected){
    for(const [name,value]of Object.entries(pkg.commands)){
      const id=(C as Record<string,number>)[name]??-1;
      const {execute,...data}=value;
      const command={definition:Object.freeze({name,type:'command',...data}),execute,id};
      if(id<0)extensions.set(name,command);else commands[id]=command;
    }
    for(const [name,value]of Object.entries(pkg.environments))environments.set(name,value);
    for(const name of pkg.options??[])options.add(name);
  }
  return Object.freeze({commands:Object.freeze(commands),extensions,environments,options});
}
const defaults=build(['base','newcommand']);
const baseOnly=build(['base']);
export function resolvePackages(entries:readonly PackageEntry[]=['base','newcommand']):PackageConfiguration {
  if(entries.length===1&&entries[0]==='base')return baseOnly;
  if(entries.length===2&&entries[0]==='base'&&entries[1]==='newcommand')return defaults;
  return build(entries);
}
export function validateConfigurationModules(names:readonly string[]=[]):void {
  for(const name of names)if(!modules.has(name))throw new UnsupportedFeatureError(`Unsupported configuration module: ${name}`);
}
