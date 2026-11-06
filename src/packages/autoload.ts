import type {TexPackage} from './types.js';
import {registeredPackages} from './registry.js';
import {loadPackage,requirePackage,initializeRequire} from './require.js';
const defaults:Record<string,readonly string[]|readonly [readonly string[],readonly string[]]>={
  action:['toggle','mathtip','texttip'],amscd:[[],['CD']],bbox:['bbox'],boldsymbol:['boldsymbol'],
  braket:['bra','ket','braket','set','Bra','Ket','Braket','Set','ketbra','Ketbra'],bussproofs:[[],['prooftree']],
  cancel:['cancel','bcancel','xcancel','cancelto'],color:['color','definecolor','textcolor','colorbox','fcolorbox'],enclose:['enclose'],
  extpfeil:['xtwoheadrightarrow','xtwoheadleftarrow','xmapsto','xlongequal','xtofrom','Newextarrow'],mhchem:['ce','pu'],
  newcommand:['newcommand','renewcommand','newenvironment','renewenvironment','def','let'],html:['data','href','class','style','cssId'],
  unicode:['unicode','U','char'],verb:['verb'],
};
export default {name:'autoload',priority:10,commands:{require:{execute:requirePackage}},environments:{},options:['autoload','require'],configurationModules:['input/tex/autoload/AutoloadConfiguration.js'],
 initialize,
} satisfies TexPackage;
function initialize(p:import('../parser.js').Parser){
   initializeRequire(p);
   const commands=[...p.configuration.commands],extensions=new Map(p.configuration.extensions),environments=new Map(p.configuration.environments);
   for(const [pkg,definition]of Object.entries({...defaults,...p.options.texOptions?.autoload as object})) {
     const [macros,envs]=Array.isArray(definition[0])?definition as [string[],string[]]:[definition,[]];
     for(const name of macros as string[]) {
       const builtin=commands.find(x=>x?.definition.name===name);
       if((builtin||extensions.has(name))&&(name!=='color'||p.configuration.packages.some(x=>x.name==='color')))continue;
       const command={id:-1,definition:{name,type:'command'},execute(parser:typeof p,t:any){loadPackage(parser,pkg);initialize(parser);const found=parser.configuration.extensions.get(name)??parser.configuration.commands.find(x=>x?.definition.name===name);if(!found)parser.error(`Undefined control sequence \\${name}`);found!.execute(parser,t,found!.definition,found!.id);}};
       if(builtin)commands[builtin.id]=command;else extensions.set(name,command);
     }
     for(const name of envs)if(!environments.has(name))environments.set(name,{begin(parser,env){loadPackage(parser,pkg);const entry=registeredPackages.find(x=>x.name===pkg)?.environments[env];if(!entry)parser.error(`Unknown environment '${env}'`);entry!.begin(parser,env);}});
   }
   p.configuration={...p.configuration,commands,extensions,environments};
 }
