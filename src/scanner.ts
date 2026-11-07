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
export interface TokenSpan {tokens:readonly Token[];start:number;end:number}
const braceIndexes=new WeakMap<readonly Token[],Map<number,number>>();
/** Build once per source buffer; argument views share this index. */
export function groupEnd(tokens:readonly Token[],start:number):number|undefined {
  let index=braceIndexes.get(tokens);
  if(!index){index=new Map();const stack:number[]=[];
    for(let i=0;i<tokens.length;i++){if(tokens[i][0]===123)stack.push(i);else if(tokens[i][0]===125&&stack.length)index.set(stack.pop()!,i);}
    braceIndexes.set(tokens,index);
  }
  return index.get(start);
}
export class Stream {
  private streams:{tokens:readonly Token[];i:number;end:number}[]=[];
  private cached:Token|undefined;
  consumed=0;
  constructor(tokens:readonly Token[],private max:number){this.push(tokens);}
  push(tokens:readonly Token[]){if(this.cached){this.streams.push({tokens:[this.cached],i:0,end:1});this.cached=undefined;}this.streams.push({tokens,i:0,end:tokens.length});}
  pushSpan(span:TokenSpan){if(this.cached){this.streams.push({tokens:[this.cached],i:0,end:1});this.cached=undefined;}if(span.start<span.end)this.streams.push({tokens:span.tokens,i:span.start,end:span.end});}
  /** Called immediately after an opening brace was read. */
  takeGroup():TokenSpan|undefined {
    const current=this.streams.at(-1);if(!current||this.cached)return;
    const end=groupEnd(current.tokens,current.i-1);
    if(end===undefined||end>=current.end)return;
    const start=current.i;current.i=end+1;
    return {tokens:current.tokens,start,end};
  }
  /** Text math delimiters are matched at this brace level, skipping groups. */
  takeMath(dollar:boolean):TokenSpan|undefined {
    if(this.cached)return;
    const current=this.streams.at(-1);if(!current)return;
    for(let i=current.i;i<current.end;i++){
      const t=current.tokens[i];
      if(dollar?t[0]===36:t[0]===-1&&spelling(t)===')'){
        const start=current.i;current.i=i+1;return {tokens:current.tokens,start,end:i};
      }
      if(t[0]===123){const close=groupEnd(current.tokens,i);if(close===undefined||close>=current.end)return;i=close;}
    }
  }
  peek():Token|undefined {return this.cached??=this.read();}
  next():Token|undefined {const t=this.peek();this.cached=undefined;return t;}
  skip(){while(this.peek()&&space(this.peek()![0]))this.next();}
  /** Consume raw source through a delimiter without dispatching each token. */
  takeThrough(source:string,end:number):Token|undefined {
    const within=(t:Token)=>t[3]===source&&t[1]-(t[0]===-1?1:0)<=end;
    let last:Token|undefined;
    if(this.cached){if(!within(this.cached))return;last=this.cached;this.cached=undefined;}
    while(this.streams.length){
      const s=this.streams[this.streams.length-1];
      if(s.i===s.end){this.streams.pop();continue;}
      const token=s.tokens[s.i];
      if(!within(token))break;
      if(++this.consumed>this.max)throw new ParseError('Token limit exceeded',token[1]);
      last=token;s.i++;
    }
    return last;
  }
  private read():Token|undefined {while(this.streams.length){const s=this.streams[this.streams.length-1];if(s.i===s.end){this.streams.pop();continue;}if(++this.consumed>this.max)throw new ParseError('Token limit exceeded',s.tokens[s.i][1]);return s.tokens[s.i++];}return undefined;}
}
