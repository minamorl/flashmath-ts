import {K} from '../ast.js';
import type {Node} from '../ast.js';
import {raw,scan} from '../scanner.js';
import type {TexPackage} from './types.js';
export default {name:'action',commands:{
  mathtip:{execute(p){p.args(2,n=>p.append(p.node(K.maction,n,'',{actiontype:'tooltip'})));}},
  texttip:{execute(p){const body=p.tokensArgument(),tip=p.tokensArgument();p.parseTokens(body,n=>{p.parseTokens(scan('\\text{'+raw(tip)+'}'),text=>p.append(p.node(K.maction,[n,text],'',{actiontype:'tooltip'})));});}},
  toggle:{execute(p){const nodes:Node[]=[];const next=()=>{const tokens=p.tokensArgument('\\toggle');if(raw(tokens)==='\\endtoggle'){p.append(p.node(K.maction,nodes));return;}p.parseTokens(tokens,n=>{nodes.push(n);next();});};next();}},
},environments:{},configurationModules:['input/tex/action/ActionConfiguration.js']} satisfies TexPackage;
