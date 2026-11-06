import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
import newcommand from './newcommand.js';
import {C} from '../symbols.js';
import {raw,scan,spelling} from '../scanner.js';
type Snapshot = {macros: Parser['macros']; environments: Parser['environments']};
const states = new WeakMap<object,{groups:Snapshot[]; sandbox:Snapshot|null; global:boolean}>();
function state(p:Parser) {let s=states.get(p.session);if(!s)states.set(p.session,s={groups:[],sandbox:null,global:false});return s;}
function snapshot(p:Parser):Snapshot {return {macros:new Map(p.macros),environments:new Map(p.environments)};}
function restore(p:Parser,s:Snapshot) {for(const key of ['macros','environments'] as const) {p[key].clear();for(const [k,v] of s[key])p[key].set(k,v as never);}}
function reset(p:Parser) {const s=state(p);while(s.groups.length)restore(p,s.groups.pop()!);}
const commands:TexPackage['commands'] = {
  begingroup:{execute(p){state(p).groups.push(snapshot(p));}},
  endgroup:{execute(p){const s=state(p).groups.pop() ?? p.error("Missing \\begingroup or extra \\endgroup");if(!s)p.error('Missing \\begingroup or extra \\endgroup');restore(p,s);}},
  begingroupReset:{execute:reset},
  begingroupSandbox:{execute(p){reset(p);const s=state(p);if(s.sandbox)restore(p,s.sandbox);else s.sandbox=snapshot(p);}},
  global:{execute(p){p.stream.skip();const t=p.stream.peek();const allow=(p.options.texOptions?.begingroup as {allowGlobal?:string[]})?.allowGlobal??['def','let','newcommand','renewcommand','newenvironment','renewenvironment'];if(!t||t[0]!==-1||!allow.includes(spelling(t)))p.error('Invalid use of \\global');state(p).global=true;}},
  gdef:{execute(p){state(p).global=true;define(p,'def',C.def);}},
  ...Object.fromEntries(Object.keys(newcommand.commands).map(name=>[name,{execute(p:Parser,_t:unknown,_d:unknown,id:number){define(p,name,id);}}])),
};
function define(p:Parser,name:string,id:number) {
  const nameTokens=p.tokensArgument();const cs=raw(nameTokens).trim().replace(/^\\/,'');p.stream.push(scan('{'+raw(nameTokens)+'}'));const t=p.stream.peek();
  newcommand.commands[name as keyof typeof newcommand.commands].execute(p, t!, {} as never, id);
  const s=state(p);if(s.global) {s.global=false;for(const group of s.groups) {for(const key of ['macros','environments'] as const){const value=p[key].get(cs);if(value)group[key].set(cs,value as never);else group[key].delete(cs);}}}
}
export default {name:'begingroup', priority:3, commands, environments:{}, options:['begingroup','formatError'], configurationModules:['input/tex/begingroup/BegingroupConfiguration.js']} satisfies TexPackage;
