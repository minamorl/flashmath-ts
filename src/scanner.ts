import {ParseError} from './ast.js';
import {command} from './symbols.js';
// Characters retain their UTF-16 code; control sequences are -1. A token is a
// source span, including expansion tokens: the unconsumed input is never rebuilt.
export type Token = readonly [code:number,start:number,end:number,source:string];
export const letter=(c:number)=>c>=65&&c<=90||c>=97&&c<=122;
export const space=(c:number)=>c===32||c===9||c===10||c===13||c===160;
export function scan(source:string,max=200000):Token[] {
  const tokens:Token[]=[];
  for(let i=0;i<source.length;){const start=i,c=source.charCodeAt(i++);
    if(tokens.length>=max)throw new ParseError('Token limit exceeded',start);
    if(c<32&&c!==9&&c!==10&&c!==13||c>=0xdc00&&c<=0xdfff||c===0xfffe||c===0xffff)throw new ParseError('Invalid XML character',start);
    if(c===92){const from=i;if(letter(source.charCodeAt(i))){while(letter(source.charCodeAt(i)))i++;}else if(i<source.length){const next=source.charCodeAt(i);if(next<32&&next!==9&&next!==10&&next!==13||next>=0xd800&&next<=0xdfff||next===0xfffe||next===0xffff)throw new ParseError('Invalid control sequence character',start);i++;}
      tokens.push([-1,from,i,source]);
    }
    else {if(c>=0xd800&&c<=0xdbff){const low=source.charCodeAt(i);if(!(low>=0xdc00&&low<=0xdfff))throw new ParseError('Invalid XML character',start);i++;}tokens.push([c,start,i,source]);}
  }
  return tokens;
}
export const spelling=(t:Token)=>t[0]>=0&&t[2]===t[1]+1?String.fromCharCode(t[0]):t[3].slice(t[1],t[2]);
export const builtin=(t:Token|undefined)=>t&&t[0]===-1?command(t[3],t[1],t[2]):-1;
export const raw=(tokens:readonly Token[])=>tokens.map(t=>(t[0]===-1?'\\':'')+spelling(t)).join('');
export interface Macro {body:readonly Token[];count:number;optional:readonly Token[]|null;prefix:readonly Token[];delimiters:readonly (readonly Token[])[]}
export class Stream {
  private streams:{tokens:readonly Token[];i:number}[]=[];
  private cached:Token|undefined;
  consumed=0;
  constructor(tokens:readonly Token[],private max:number){this.push(tokens);}
  push(tokens:readonly Token[]){if(this.cached){this.streams.push({tokens:[this.cached],i:0});this.cached=undefined;}this.streams.push({tokens,i:0});}
  peek():Token|undefined {return this.cached??=this.read();}
  next():Token|undefined {const t=this.peek();this.cached=undefined;return t;}
  skip(){while(this.peek()&&space(this.peek()![0]))this.next();}
  private read():Token|undefined {while(this.streams.length){const s=this.streams[this.streams.length-1];if(s.i===s.tokens.length){this.streams.pop();continue;}if(++this.consumed>this.max)throw Error('Token limit exceeded');return s.tokens[s.i++];}return undefined;}
}
