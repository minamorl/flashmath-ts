import {fixtures} from './fixtures.mjs';
fixtures('tagformat');

import {compare} from './fixtures.mjs';
compare('tagformat', [
 ...['none','ams','all'].flatMap(tags=>['equation','equation*','align'].flatMap(env=>['X','*Y'].map(tag=>[
  `\\begin{${env}}b\\tag${tag[0]==='*'?'*':''}{${tag.replace('*','')}}\\end{${env}}`,
  {packages:['base','ams','tagformat'],texOptions:{tags,tagformat:{number:n=>'B'+n,tag:t=>'<'+t+'>',id:t=>'tag:'+t}},tags}
 ]))),
 [String.raw`\begin{equation}b\tag{X}\label{a}\end{equation}`,{packages:['base','ams','tagformat'],tags:'ams',texOptions:{tags:'ams'}}],
]);
