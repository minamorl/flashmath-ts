import {SVG} from '@mathjax/src/js/output/svg.js';
import {HTMLDocument} from '@mathjax/src/js/handlers/html/HTMLDocument.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import {STATE} from '@mathjax/src/js/core/MathItem.js';
const adaptor=liteAdaptor(), output=new SVG(),doc=new HTMLDocument('',adaptor,{InputJax:new TeX({packages:['base']}),OutputJax:output});
for(const tex of ['C\\rightarrow D\\rightarrow Q','Q^2','P','P\\rightarrow Q','\\rightarrow_E','\\wedge_I','{\\rightarrow_I}^1','Hyp^{1}','\\text{AAAA}','\\text{More and more}']) {
 const root=doc.convert(tex,{display:false,end:STATE.CONVERT});const item=new doc.options.MathItem('',null,false);item.root=root;console.log(tex,JSON.stringify(output.getBBox(item,doc)));
}
