import {fixtures} from './fixtures.mjs';
fixtures('texhtml');
import {assert,test,subject} from './fixtures.mjs';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseToReact} from '../../dist/react.js';
test('texhtml AST renders as real React elements with escaped text and attributes',()=>{
  const options={packages:['base','texhtml'],texOptions:{allowTexHTML:true}};
  const tex='x+<tex-html><b title="&quot;">&lt;safe&gt;</b></tex-html>';
  const out=renderToStaticMarkup(parseToReact(tex,options));
  assert.match(out,/<b title="&quot;">&lt;safe&gt;<\/b>/);
  assert.doesNotMatch(out,/&lt;b/);
  assert.match(subject('x+<tex-html><b>text</b></tex-html>',{packages:['base']}),/<mi>t<\/mi>/);
});
