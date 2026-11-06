// MathJax 4.1.3 gensymb symbol data, Apache-2.0; see ../LICENSE.MathJax.
import {K} from '../ast.js';
import type {TexPackage,TexCommand} from './types.js';
export default {name:'gensymb',commands:Object.fromEntries(Object.entries({ohm:'Ω',degree:'°',celsius:'℃',perthousand:'‰',micro:'µ'}).map(([name,char])=>[name,{execute(p){p.append(p.node(K.mi,[],char,{mathvariant:'normal',class:'MathML-Unit'}));}} satisfies TexCommand])),environments:{},configurationModules:['input/tex/gensymb/GensymbConfiguration.js']} satisfies TexPackage;
