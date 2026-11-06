/** Local primary sources read: MathJax's TeX/HTMLDocument/SerializedMmlVisitor,
 * Temml's dist/temml.d.ts and temml.js, React's server.node.js. */
import fs from 'node:fs';
export async function engine(name){
 if(name==='flashmath'){
  const {parseToMathMLAst,toMathMLString}=await import('../../dist/index.js');
  return tex=>toMathMLString(parseToMathMLAst(tex,{display:true,throwOnError:true}));
 }
 if(name==='temml'){
  const {default:temml}=await import('temml');
  return tex=>temml.renderToString(tex,{displayMode:true,throwOnError:true,xml:true});
 }
 if(name!=='mathjax')throw Error('Unknown engine '+name);
 const [{TeX},{HTMLDocument},{liteAdaptor},{SerializedMmlVisitor},{STATE}]=await Promise.all([
  import('@mathjax/src/js/input/tex.js'),import('@mathjax/src/js/handlers/html/HTMLDocument.js'),
  import('@mathjax/src/js/adaptors/liteAdaptor.js'),import('@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js'),
  import('@mathjax/src/js/core/MathItem.js')
 ]);
 await import('@mathjax/src/js/input/tex/base/BaseConfiguration.js');
 await import('@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js');
 const jax=new TeX({packages:['base','newcommand']});
 const doc=new HTMLDocument('',liteAdaptor(),{InputJax:jax});const visitor=new SerializedMmlVisitor();
 return tex=>visitor.visitTree(doc.convert(tex,{display:true,end:STATE.CONVERT}));
}
export function versions(){return Object.fromEntries([['mathjax','@mathjax/src'],['temml','temml']].map(([name,pkg])=>[name,JSON.parse(fs.readFileSync(new URL(import.meta.resolve(pkg+'/package.json')))).version]));}
