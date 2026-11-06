import {scan,raw,Stream} from './scanner.js';
import type {Token} from './scanner.js';
export interface Column {align:string;width:string;before:Token[];after:Token[];insert:Token[]|null;separator:string;gap:string;vertical:string}
export interface Preamble {columns:Column[];left:string;right:string;padding:string;spacing:string}
/** The array preamble is a separate, cold grammar; its expansion is bounded. */
export function preamble(source:string,max:number,custom:Map<string,{count:number;body:string}>):Preamble {
  let expansion=0;const stream=new Stream(scan(source),max),columns:Column[]=[];
  const argument=()=>{stream.skip();const t=stream.next();if(!t)return '';if(t[0]!==123)return raw([t]);const tokens:Token[]=[];let depth=1;while(depth){const x=stream.next();if(!x)throw Error('Missing array preamble brace');if(x[0]===123)depth++;if(x[0]===125)depth--;if(depth)tokens.push(x);}return raw(tokens);};
  let before:Token[]=[],separator='',left='',lastInsert='',spacing='1em',padding='';
  const add=(align:string,width='auto',insert:Token[]|null=null,gap='1em',vertical='')=>{if(columns.length>=max)throw Error('Array column limit exceeded');columns.push({align,width,before,after:[],insert,separator,gap,vertical});before=[];separator='';};
  while(stream.peek()){
    stream.skip();const t=stream.next();if(!t)break;const c=raw([t]);
    if(c==='*'){const count=Number(argument());if(!Number.isSafeInteger(count)||count<0||count>max)throw Error('Invalid array repeat');let body=argument();if(body==='|'||body===':')body+=argument();if(body.length*count>max)throw Error('Array preamble limit exceeded');stream.push(scan(body.repeat(count)));continue;}
    const macro=custom.get(c);if(macro){if(++expansion>max)throw Error('Array preamble limit exceeded');let body=macro.body;for(let i=1;i<=macro.count;i++)body=body.replaceAll('#'+i,argument());stream.push(scan(body));continue;}
    if(c==='|'||c===':'){separator=c;if(!columns.length)left=c;continue;}
    if(c==='>'){before.unshift(...scan(argument()));continue;}
    if(c==='<'){if(columns.length)columns.at(-1)!.after.unshift(...scan(argument()));else argument();continue;}
    if(c==='@'||c==='!'){const body=scan(argument()),gap=c==='@'?'0':'.5em';if(columns.length===0)padding=(c==='@'?'0':'.5em')+' .5em';add('center','auto',body,gap);lastInsert=c;spacing=gap;continue;}
    if(c==='w'||c==='W'){const align=argument(),width=argument();add(({l:'left',r:'right',c:'center'} as Record<string,string>)[align]??'center',width,null,'1em','top');continue;}
    if(c==='p'||c==='m'||c==='b'){add('left',argument(),null,'1em',c==='p'?'top':c==='m'?'middle':'bottom');continue;}
    if(c==='l'||c==='c'||c==='r'){add(({l:'left',c:'center',r:'right'} as Record<string,string>)[c]);continue;}
    if(c==='{'){stream.push(scan(argument()));continue;}
  }
  if(lastInsert&&columns.at(-1)?.insert){padding=(padding?padding.split(' ')[0]:'.5em')+' '+(lastInsert==='@'?'0':'.5em');}
  if(!columns.length)add('center');
  return {columns,left,right:separator,padding,spacing};
}
