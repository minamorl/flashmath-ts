import {parseToMathMLAst,toMathMLString} from '../../dist/index.js';
export default function subject(tex,{display=true,texOptions={}}={}) {
 return toMathMLString(parseToMathMLAst(tex,{display,macros:texOptions.macros,decimalSeparator:texOptions.digits?.includes(',')?',':'.'}));
}
