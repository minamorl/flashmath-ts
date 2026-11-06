/** Units macros derived from MathJax 4.1.3 UnitsConfiguration.ts.
 * Copyright (c) 2018-2026 The MathJax Consortium, Apache-2.0.
 * See ../LICENSE.MathJax. Activated only by the units package. */
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
import {raw,scan} from '../scanner.js';
const opts=(p:Parser)=>({loose:false,ugly:false,...(p.options.texOptions?.units as {loose?:boolean;ugly?:boolean})});
export default {name:'units',commands:{
 units:{execute(p){const value=raw(p.optional()??[]),dimension=raw(p.tokensArgument());p.stream.push(scan((value?value+(opts(p).loose?'~':'\\,'):'')+`\\mathrm{${dimension}}`));}},
 unitfrac:{execute(p){const value=raw(p.optional()??[]),numerator=raw(p.tokensArgument()),denominator=raw(p.tokensArgument());p.stream.push(scan((value?value+(opts(p).loose?'~':'\\,'):'')+`\\nicefrac[\\mathrm]{${numerator}}{${denominator}}`));}},
 nicefrac:{execute(p){const font=raw(p.optional()??scan('\\mathrm')),numerator=raw(p.tokensArgument()),denominator=raw(p.tokensArgument());p.parseTokens(scan(`\\frac{${font}{${numerator}}}{${font}{${denominator}}}`),n=>{if(!opts(p).ugly)n.attributes.bevelled='true';p.append(n);});}},
},environments:{},options:['units'],configurationModules:['input/tex/units/UnitsConfiguration.js']} satisfies TexPackage;
