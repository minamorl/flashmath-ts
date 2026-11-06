import {K} from '../ast.js';
import {raw,scan,spelling} from '../scanner.js';
import type {Parser} from '../parser.js';
import type {TexPackage} from './types.js';
const fonts=new WeakMap<object,Map<number,string>>();
export default {name:'unicode',commands:{
  unicode:{execute(p){
    let font=raw(p.optional()??[]);if(/^\s*(\d+(\.\d*)?|\.\d+)\s*,\s*(\d+(\.\d*)?|\.\d+)\s*$/.test(font))font=raw(p.optional()??[]);
    if(font.includes(';'))p.error("Font name for \\unicode can't contain semicolons");
    const value=raw(p.tokensArgument()).trim().replace(/^0x/,'x');
    if(!/^(x[0-9A-Fa-f]+|[0-9]+)$/.test(value))p.error('Argument to \\unicode must be a number');
    const code=parseInt(value.replace(/^x/,''),value[0]==='x'?16:10);
    let cache=fonts.get(p.session);if(!cache)fonts.set(p.session,cache=new Map());
    font=font||cache.get(code)||'';if(font)cache.set(code,font);
    const attrs:Record<string,string>={};const variant=p.f.font;
    if(font){attrs.fontfamily=font;if(variant.includes('bold'))attrs.fontweight='bold';if(/italic|-mathit/.test(variant))attrs.fontstyle='italic';}
    else if(variant)attrs.mathvariant=variant;
    p.append(p.node(K.mtext,[],numeric(p,code),attrs));
  }},
  U:{execute(p){const value=raw(p.tokensArgument()).trim();if(!/^[0-9A-F]{1,6}$/.test(value))p.error('Argument to \\U must a hexadecimal number with 1 to 6 digits');p.stream.push(scan(numeric(p,parseInt(value,16))));}},
  char:{execute(p){
    p.stream.skip();let radix=10,limit=7,value='';const first=p.stream.peek();
    if(first?.[0]===96){p.stream.next();const t=p.stream.next();if(!t)p.error('Missing numeric constant for \\char');value=spelling(t!);if([...value].length!==1)p.error('Invalid alphanumeric constant for \\char');}
    else {if(first?.[0]===39){radix=8;p.stream.next();}else if(first?.[0]===34){radix=16;limit=6;p.stream.next();}
      let digits='';while(digits.length<limit&&p.stream.peek()&&(radix===16?/^[0-9A-F]$/:radix===8?/^[0-7]$/:/^[0-9]$/).test(spelling(p.stream.peek()!)))digits+=spelling(p.stream.next()!);
      if(!digits)p.error('Missing numeric constant for \\char');value=numeric(p,parseInt(digits,radix));if(p.stream.peek()?.[0]===32)p.stream.next();
    }
    if(/^[0-9]$/.test(value))p.append(p.node(K.mn,[],value));else p.append(p.character(scan(value)[0]));
  }},
},environments:{},configurationModules:['input/tex/unicode/UnicodeConfiguration.js']} satisfies TexPackage;
function numeric(p:Parser,n:number){return n>0x10ffff||n>=0xd800&&n<=0xdfff||n===0?'\uFFFD':String.fromCodePoint(n);}
