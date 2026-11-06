import {createElement} from 'react';
import type {ReactElement} from 'react';
import type {MathMLNode,ParseOptions,OutputOptions} from './ast.js';
import {mathMLForOutput} from './output.js';
import {parseToMathMLAst} from './parser.js';
/** Real React MathML elements, with no HTML injection. */
export function parseToReact(tex:string,options:ParseOptions={}):ReactElement {
  return mathMLAstToReact(parseToMathMLAst(tex,options),options);
}
export function mathMLAstToReact(ast:MathMLNode,options:OutputOptions={}):ReactElement {
  const work:{node:MathMLNode;visited:boolean;key:number}[]=[{node:mathMLForOutput(ast,options),visited:false,key:0}];
  const results:ReactElement[]=[];
  while(work.length){const {node,visited,key}=work.pop()!;
    if(!visited){work.push({node,visited:true,key});for(let i=node.children.length-1;i>=0;i--)work.push({node:node.children[i],visited:false,key:node.children[i].start*(node.children.length+1)+i});continue;}
    const children=results.splice(results.length-node.children.length,node.children.length);
    const props:Record<string,unknown>={key};
    for(const [name,value]of Object.entries(node.attributes))props[name==='class'?'className':name]=value;
    results.push(createElement(node.kind,props,node.text?[node.text,...children]:children));
  }
  return results[0];
}
