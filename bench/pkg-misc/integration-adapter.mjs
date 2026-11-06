import {parseToMathMLAst,toMathMLString} from './integration-dist/index.js';
export default function subject(tex,options) {return toMathMLString(parseToMathMLAst(tex,{display:true,...options}));}
