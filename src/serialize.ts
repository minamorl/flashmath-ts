import type {MathMLNode} from './ast.js';
/** XML/React-compatible escaping, used for both text and attribute values. */
export function escapeXML(value:string):string {return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]!));}
export function toMathMLString(ast:MathMLNode):string {
  const out:string[]=[],stack:(MathMLNode|string)[]=[ast];
  while(stack.length){const n=stack.pop()!;if(typeof n==='string'){out.push(n);continue;}out.push('<',n.kind);for(const [key,value] of Object.entries(n.attributes))out.push(' ',key,'="',escapeXML(value),'"');out.push('>');stack.push('</'+n.kind+'>');for(let i=n.children.length-1;i>=0;i--)stack.push(n.children[i]);if(n.text)stack.push(escapeXML(n.text));}
  return out.join('');
}
