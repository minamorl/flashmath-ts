import {act,createElement} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {parseToReact} from '../../dist/react.js';
import {cases} from './cases.mjs';
import {warningCases} from './react-cases.mjs';
import fixture from '../../conformance/fixtures/mathjax-4.1.3.json';
import {reviveOptions} from '../../conformance/options.mjs';
window.IS_REACT_ACT_ENVIRONMENT=true;
window.reactChecks=(async()=>{
 const errors=[],original=console.error;console.error=(...args)=>errors.push(args.map(String).join(' '));
 try{
  const recoverable=[];
  await act(async()=>{
   for(const c of cases)hydrateRoot(document.querySelector('#'+c.id+' .native'),parseToReact(c.tex,c.options),{onRecoverableError:e=>recoverable.push(String(e))});
  });
  const host=document.createElement('div');host.hidden=true;document.body.append(host);
  const root=createRoot(host),inputs=fixture.records.filter(r=>r.input&&!r.unsupported).map(r=>[r.id,r.input]);
  for(const [i,[tex,options]]of warningCases.entries())inputs.push(['warning-'+i,{tex,...options}]);
  await act(async()=>root.render(createElement('div',null,inputs.map(([id,input])=>{const {tex,...options}=input;return createElement('div',{key:id},parseToReact(tex,reviveOptions(options)));}))));
  const count=host.querySelectorAll('math').length;
  if(count!==inputs.length)throw Error(`Client math count ${count}/${inputs.length}`);
  if(errors.length||recoverable.length)throw Error(JSON.stringify({errors,recoverable}));
  return {hydrated:cases.length,clientRendered:count,errors,recoverable};
 }finally{console.error=original;}
})().catch(error=>({failure:String(error)}));
