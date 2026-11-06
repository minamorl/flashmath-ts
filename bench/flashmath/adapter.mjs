import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
import {reviveOptions} from '../../conformance/options.mjs';
/** Pass the complete harness contract. The core explicitly rejects unsupported
 * packages, modes, registration modules and TeX options instead of ignoring them. */
export default function subject(tex,options={}) {
 return toMathMLString(parseToMathMLAst(tex,{display:true,...reviveOptions(options),output:'mathjax'}),{output:'mathjax'});
}
