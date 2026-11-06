/** MathJax 4.1.3 subject. Uses only installed local source modules. */
import fs from 'node:fs';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {HTMLDocument} from '@mathjax/src/js/handlers/html/HTMLDocument.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {SerializedMmlVisitor} from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {STATE} from '@mathjax/src/js/core/MathItem.js';
import {ConfigurationHandler} from '@mathjax/src/js/input/tex/Configuration.js';

const version=JSON.parse(fs.readFileSync(new URL(import.meta.resolve('@mathjax/src/package.json')))).version;
if(version!=='4.1.3') throw Error(`Expected MathJax 4.1.3, got ${version}`);
const adaptor=liteAdaptor(); RegisterHTMLHandler(adaptor);
const visitor=new SerializedMmlVisitor();
export default async function mathjaxSubject(tex, options) {
  const {packages,texOptions,display=true,mode='convert',prior=[],configurationModules=[]}=options;
  for(const module of configurationModules) await import('@mathjax/src/js/'+module);
  for(const entry of packages) {
    const name=Array.isArray(entry)?entry[0]:entry;
    if(!ConfigurationHandler.get(name)) {
      const config={action:'Action',ams:'Ams',amscd:'AmsCd',autoload:'Autoload',base:'Base',bbm:'Bbm',bboldx:'Bboldx',bbox:'Bbox',begingroup:'Begingroup',boldsymbol:'Boldsymbol',braket:'Braket',bussproofs:'Bussproofs',cancel:'Cancel',cases:'Cases',centernot:'Centernot',color:'Color',colortbl:'Colortbl',colorv2:'ColorV2',configmacros:'ConfigMacros',dsfont:'Dsfont',empheq:'Empheq',enclose:'Enclose',extpfeil:'Extpfeil',gensymb:'Gensymb',html:'Html',mathtools:'Mathtools',mhchem:'Mhchem',newcommand:'Newcommand',noerrors:'NoErrors',noundefined:'NoUndefined',physics:'Physics',require:'Require',setoptions:'SetOptions',tagformat:'TagFormat',texhtml:'TexHtml',textcomp:'Textcomp',textmacros:'TextMacros',unicode:'Unicode',units:'Units',upgreek:'Upgreek',verb:'Verb'}[name];
      if(!config) throw Error(`Unsupported custom package ${name}`);
      await import(`@mathjax/src/js/input/tex/${name}/${config}Configuration.js`);
    }
  }
  // Configuration dependencies may be registered by imports in the upstream test file.
  const revive=(value)=>{
    if(value && typeof value==='object') {
      if('$regexp' in value) return new RegExp(value.$regexp,value.flags);
      if(Array.isArray(value)) return value.map(revive);
      return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,revive(v)]));
    }
    return value;
  };
  const jax=new TeX({...revive(texOptions), packages});
  const extra={};
  if(mode==='output') { const {SVG}=await import('@mathjax/src/js/output/svg.js'); extra.OutputJax=new SVG(); }
  const doc=new HTMLDocument('',adaptor,{InputJax:jax,...extra});
  const convert=(text,block)=> {
    if(mode==='render') {
      const delim=block?'$$':'$';
      const page=mathjax.document(`<html><head></head><body>${delim}${text}${delim}</body></html>`,{InputJax:jax});
      page.findMath().compile();
      return visitor.visitTree(Array.from(page.math)[0].root);
    }
    return visitor.visitTree(doc.convert(text,{display:block,end:STATE.CONVERT}));
  };
  for(const previous of prior) convert(previous.tex,previous.display);
  return convert(tex,display);
}

// Rebuild module-level MathJax caches when resuming in a new Node process.
// Completed comparisons remain cached; only the subject's earlier calls replay.
mathjaxSubject.restore = async (records,rows) => {
  for(let i=0;i<rows.length;i++) {
    if(rows[i].status==='unsupported' || rows[i].category==='invalid-expected') continue;
    const {tex,...options}=records[i].input;
    try { await mathjaxSubject(tex,options); } catch(e) { if(rows[i].category!=='subject-error') throw e; }
  }
};
