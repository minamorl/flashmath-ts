import {UnsupportedFeatureError} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw,scan} from '../scanner.js';
import {resolveConfiguration} from '../configuration.js';
import {registeredPackages} from './registry.js';
import type {TexPackage} from './types.js';
const loaded=new WeakMap<object,Set<string>>();
export function loadPackage(p:Parser,name:string) {
  const opts=p.options.texOptions?.require as {allow?:Record<string,boolean>;defaultAllow?:boolean;prefix?:string}|undefined;
  const prefix=opts?.prefix??'tex',extension=`[${prefix}]/${name}`;
  const deny=['base','autoload','configmacros','tagformat','setoptions','texhtml'];
  const allowed=opts?.allow?.[extension]??opts?.allow?.[name]??(deny.includes(name)?false:opts?.defaultAllow??true);
  if(!allowed)p.error(`Extension "${extension}" is not allowed to be loaded`);
  const pkg=registeredPackages.find(x=>x.name===name);
  if(!pkg)throw new UnsupportedFeatureError(`Extension "${name}" is not available in this build`);
  if(p.configuration.packages.some(x=>x.name===name))return;
  p.configuration=resolveConfiguration([...p.configuration.entries,name]);
  let names=loaded.get(p.session);if(!names)loaded.set(p.session,names=new Set());names.add(name);
  pkg.initialize?.(p);
}
export function requirePackage(p:Parser) {
  const option=p.configuration.packages.some(x=>x.name==='setoptions')?p.optional():null;
  const name=raw(p.tokensArgument());
  if(!/^[_a-zA-Z0-9]+$/.test(name))p.error('Argument for \\require is not a valid package name');
  loadPackage(p,name);
  if(option)p.stream.push(scan(`\\setOptions[${name}]{${raw(option)}}`));
}
export function initializeRequire(p:Parser) {const prefix=(p.options.texOptions?.require as {prefix?:string})?.prefix??'tex';if(!/^[_a-zA-Z0-9]*$/.test(prefix))throw new Error('Illegal characters used in \\require prefix');for(const name of loaded.get(p.session)??[])loadPackage(p,name);}
export default {name:'require',commands:{require:{execute:requirePackage}},environments:{},options:['require'],configurationModules:['input/tex/require/RequireConfiguration.js'],initialize:initializeRequire} satisfies TexPackage;
