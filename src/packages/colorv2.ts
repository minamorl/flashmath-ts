import type {TexPackage} from './types.js';
import {raw} from '../scanner.js';
import {K} from '../ast.js';
import {children} from './color.js';
export default {name:'colorv2',commands:{color:{execute(p){const color=raw(p.tokensArgument());p.argument(n=>p.append(p.node(K.mstyle,children(n),'',{mathcolor:color})));}}},environments:{},configurationModules:['input/tex/colorv2/ColorV2Configuration.js']} satisfies TexPackage;
