import type {TexPackage} from './types.js';
import {raw} from '../scanner.js';
import {K} from '../ast.js';
import {children} from './color.js';
import type {CommandHandler} from './types.js';
const color:CommandHandler=p=>{const value=raw(p.tokensArgument());p.argument(n=>p.append(p.node(K.mstyle,children(n),'',{mathcolor:value})));};
export default {name:'colorv2',commands:{color:{execute:color},textcolor:{execute:color}},environments:{},configurationModules:['input/tex/colorv2/ColorV2Configuration.js']} satisfies TexPackage;
