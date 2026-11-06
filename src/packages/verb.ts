import {K} from '../ast.js';
import {scan} from '../scanner.js';
import type {TexPackage} from './types.js';
export default {
 name:'verb',commands:{verb:{execute(p){
   p.stream.skip();
   const token=p.stream.next()??p.error('Missing argument for \\verb');
   const source=token[3],delimiterStart=token[1]-(token[0]===-1?1:0);
   const delimiter=source.charAt(delimiterStart),start=delimiterStart+1;
   const end=source.indexOf(delimiter,start);
   if(end<0)p.error("Can't find closing delimiter for \\verb");
   let last=token;
   while(p.stream.peek()) {
     const next=p.stream.peek()!;
     if(next[3]!==source||next[1]-(next[0]===-1?1:0)>end)break;
     last=p.stream.next()!;
   }
   // A backslash delimiter can split a pre-scanned control word. Only that
   // token's remainder is scanned again; the unconsumed source is preserved.
   if(last[2]>end+1)p.stream.push(scan(source.slice(end+1,last[2])));
   p.append(p.node(K.mtext,[],source.slice(start,end).replace(/ /g,'\u00a0'),{mathvariant:'monospace'}));
 }}},environments:{},configurationModules:['input/tex/verb/VerbConfiguration.js'],
} satisfies TexPackage;
