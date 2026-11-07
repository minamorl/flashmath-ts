import type {MathMLNode,OutputOptions} from './ast.js';
import {mathMLForOutput} from './output.js';
/** XML/React-compatible escaping, used for both text and attribute values. */
const escapes:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'};
const escaped=(c:string)=>escapes[c];
export function escapeXML(value:string):string {return /[&<>"']/.test(value)?value.replace(/[&<>"']/g,escaped):value;}
export function toMathMLString(ast:MathMLNode,options:OutputOptions={}):string {
  let out='';const stack:(MathMLNode|string)[]=[mathMLForOutput(ast,options)];
  while(stack.length){
    const n=stack.pop()!;
    if(typeof n==='string'){out+=n;continue;}
    if(n.kind==='#text'){out+=escapeXML(n.text);continue;}
    out+='<'+n.kind;
    for(const key of Object.keys(n.attributes))out+=' '+key+'="'+escapeXML(n.attributes[key])+'"';
    out+='>';stack.push('</'+n.kind+'>');
    for(let i=n.children.length-1;i>=0;i--)stack.push(n.children[i]);
    if(n.text)out+=escapeXML(n.text);
  }
  return out;
}
