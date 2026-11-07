import {createElement} from 'react';
import type {ReactElement,ReactNode} from 'react';
import type {MathMLNode,ParseOptions,OutputOptions} from './ast.js';
import {mathMLForOutput} from './output.js';
import {parseToMathMLAst} from './parser.js';
/** React requires a declaration object, while the MathML AST stores CSS text. */
function cssProperties(source:string):Record<string,string> {
  const result:Record<string,string>={};
  let start=0,colon=-1,depth=0,quote=0;
  for(let i=0;i<=source.length;i++){
    const c=source.charCodeAt(i);
    if(quote){if(c===92)i++;else if(c===quote)quote=0;}
    else if(c===34||c===39)quote=c;
    else if(c===40)depth++;
    else if(c===41)depth--;
    else if(c===58&&colon<0)colon=i;
    if(i===source.length||c===59&&!depth&&!quote){
      if(colon>=start){
        const original=source.slice(start,colon).trim();
        const property=original.startsWith('--')?original:original.toLowerCase();
        let name='';
        if(property.startsWith('--'))name=property;
        else for(let j=0;j<property.length;j++){
          const code=property.charCodeAt(j);
          if(code===45&&j+1<property.length){
            const next=property.charCodeAt(++j);
            name+=String.fromCharCode(j===1&&next===109&&property.charCodeAt(2)===115?next:next>=97&&next<=122?next-32:next);
          }else name+=property[j];
        }
        if(name)result[name]=source.slice(colon+1,i).trim();
      }
      start=i+1;colon=-1;
    }
  }
  return result;
}
// React shares HTML/SVG property validation with MathML. Keep MathML-only
// names (mathvariant, scriptlevel, …) lowercase and translate shared aliases.
const propertyNames:Record<string,string>={class:'className',for:'htmlFor','http-equiv':'httpEquiv','accept-charset':'acceptCharset'};
for(const name of ('accessKey allowFullScreen autoCapitalize autoComplete autoFocus cellPadding cellSpacing charSet classID colSpan contentEditable contextMenu crossOrigin dateTime encType enterKeyHint fetchPriority formAction formEncType formMethod formNoValidate formTarget frameBorder hrefLang inputMode itemID itemProp itemRef itemScope itemType marginHeight marginWidth maxLength minLength noModule noValidate playsInline readOnly referrerPolicy rowSpan spellCheck srcDoc srcLang srcSet tabIndex useMap fontFamily fontSize fontSizeAdjust fontStretch fontStyle fontVariant fontWeight strokeWidth strokeLinecap strokeLinejoin strokeMiterlimit strokeDasharray strokeDashoffset strokeOpacity fillOpacity fillRule clipPath clipRule xmlLang xmlSpace xlinkHref xmlnsXlink').split(' ')){
  propertyNames[name.toLowerCase()]=name;
  propertyNames[name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=name;
}
Object.assign(propertyNames,{'xml:lang':'xmlLang','xml:space':'xmlSpace','xlink:href':'xlinkHref','xmlns:xlink':'xmlnsXlink'});
/** Real React MathML elements, with no HTML injection. */
export function parseToReact(tex:string,options:ParseOptions={}):ReactElement {
  return mathMLAstToReact(parseToMathMLAst(tex,options),options);
}
export function mathMLAstToReact(ast:MathMLNode,options:OutputOptions={}):ReactElement {
  const work:{node:MathMLNode;visited:boolean;key:number}[]=[{node:mathMLForOutput(ast,options),visited:false,key:0}];
  const results:ReactNode[]=[];
  while(work.length){const {node,visited,key}=work.pop()!;
    if(!visited){work.push({node,visited:true,key});for(let i=node.children.length-1;i>=0;i--)work.push({node:node.children[i],visited:false,key:node.children[i].start*(node.children.length+1)+i});continue;}
    if(node.kind==='#text'){results.push(node.text);continue;}
    const children=results.splice(results.length-node.children.length,node.children.length);
    const props:Record<string,unknown>={key};
    for(const [name,value]of Object.entries(node.attributes)){
      if(name==='href'&&value==='')continue;
      props[propertyNames[name]??name]=name==='style'?cssProperties(value):value;
    }
    results.push(createElement(node.kind,props,node.text?[node.text,...children]:children));
  }
  return results[0] as ReactElement;
}
