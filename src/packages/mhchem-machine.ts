// Actions adapted from mhchemParser 4.2.1, copyright 2015–2023 Martin Hensel,
// Apache-2.0 (../LICENSE.MathJax). Changed: numeric dispatch, source-span buffers,
// handwritten matchers and direct TeX emission. No regexp lexer or runtime oracle.
import {Pattern as P, Action as A, Machine as M, chemistryGrammar} from './mhchem-grammar.js';
import type {Option} from './mhchem-grammar.js';
type SourceIndex = {braces?:Map<number,number>};
type Piece = {source:string;start:number;end:number;index?:SourceIndex};
type Text = readonly Piece[];
const literal = (source:string):Text => source ? [{source,start:0,end:source.length,index:{}}] : [];
const alpha=(c:number)=>c>=65&&c<=90||c>=97&&c<=122;
const lower=(c:number)=>c>=97&&c<=122;
const digit=(c:number)=>c>=48&&c<=57;
const white=(c:number)=>c===32||c===9||c===10||c===13||c===160;
const greekNames=['alpha','beta','gamma','delta','epsilon','zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron','pi','rho','sigma','tau','upsilon','phi','chi','psi','omega','Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Upsilon','Phi','Psi','Omega'];
export class View {
  readonly offsets:number[]=[];readonly length:number;
  constructor(readonly parts:Text) {let n=0;for(const p of parts){this.offsets.push(n);n+=p.end-p.start;}this.length=n;}
  c(i:number) {
    if(i<0||i>=this.length)return -1;
    let a=0,b=this.parts.length-1;
    while(a<b){const m=(a+b+1)>>1;if(this.offsets[m]<=i)a=m;else b=m-1;}
    const p=this.parts[a],c=p.source.charCodeAt(p.start+i-this.offsets[a]);
    return c===0x2212||c>=0x2010&&c<=0x2014?45:c===10?32:c;
  }
  at(s:string,i=0){if(i+s.length>this.length)return false;for(let k=0;k<s.length;k++)if(this.c(i+k)!==s.charCodeAt(k))return false;return true;}
  equal(s:string){return this.length===s.length&&this.at(s);}
  span(a:number,b=this.length):Text {
    if(a>=b)return [];const out:Piece[]=[];
    for(let k=0;k<this.parts.length;k++){
      const p=this.parts[k],from=this.offsets[k],to=from+p.end-p.start;
      if(to<=a)continue;if(from>=b)break;
      out.push({source:p.source,start:p.start+Math.max(0,a-from),end:p.start+Math.min(to,b)-from,index:p.index});
    }return out;
  }
  emit(a=0,b=this.length){let s='';for(let i=a;i<b;i++)s+=String.fromCharCode(this.c(i));return s;}
  skip(i:number){while(white(this.c(i)))i++;return i;}
  command(i:number){if(this.c(i)!==92)return -1;let j=i+1;if(alpha(this.c(j)))while(alpha(this.c(j)))j++;else if(j<this.length)j++;return j;}
  group(i:number,open=123,close=125){if(this.c(i)!==open)return -1;
    // Recursive chemistry views retain the source index instead of rescanning
    // the rest of every enclosing group at each nesting level.
    const p=this.parts.length===1?this.parts[0]:undefined;
    if(open===123&&close===125&&p?.index){
      if(!p.index.braces){
        const ends=new Map<number,number>(),stack:number[]=[];
        for(let j=0;j<p.source.length;j++){
          const c=p.source.charCodeAt(j);
          if(c===92){j++;if(alpha(p.source.charCodeAt(j))){while(alpha(p.source.charCodeAt(j+1)))j++;}continue;}
          if(c===123)stack.push(j);
          else if(c===125&&stack.length)ends.set(stack.pop()!,j+1);
        }
        p.index.braces=ends;
      }
      const end=p.index.braces.get(p.start+i);
      return end!==undefined&&end<=p.end?end-p.start:-1;
    }
    let depth=1,braces=0;
    for(let j=i+1;j<this.length;j++){const c=this.c(j);if(c===92){j=this.command(j)-1;continue;}
      if(open!==123){if(c===123)braces++;if(c===125)braces--;if(braces)continue;}
      if(c===open&&open!==close)depth++;if(c===close&&--depth===0)return j+1;
    }return -1;}
  number(i:number,sign=true,missingZero=true){let j=i;if(sign&&(this.c(j)===43||this.c(j)===45))j++;const start=j;while(digit(this.c(j)))j++;const hasInteger=j>start;
    if((this.c(j)===44||this.c(j)===46)&&digit(this.c(j+1))&&(hasInteger||missingZero&&this.c(j)===46)){j++;while(digit(this.c(j)))j++;}
    return j>start?j:-1;}
  integer(i:number,sign=true){let j=i;if(sign&&(this.c(j)===43||this.c(j)===45))j++;const start=j;while(digit(this.c(j)))j++;return j>start?j:-1;}
  greek(i:number,onlyLower=false){if(this.c(i)!==92)return -1;const end=this.command(i);for(const name of greekNames){if(onlyLower&&!lower(name.charCodeAt(0)))continue;if(end===i+name.length+1&&this.at(name,i+1)){
      if(this.at('{}',end))return end+2;return this.skip(end);
    }}return -1;}
  letters(i:number){let j=i;while(j<this.length){const c=this.c(j);if(alpha(c)||c>=0x3b1&&c<=0x3c9||c>=0x391&&c<=0x3a9||c===63||c===64){j++;continue;}const end=this.greek(j);if(end>j){j=end;continue;}break;}return j>i?j:-1;}
  boundary(i:number){const c=this.c(i);return c===-1||white(c)||c===44||c===59||c===41||c===93||c===125;}
  orbital(i:number){let j=i;while(j-i<2&&digit(this.c(j)))j++;if(this.at('sp',j))j+=2;else if(j>i&&(this.c(j)===115||this.c(j)===112||this.c(j)===100||this.c(j)===102||this.c(j)===103||this.c(j)===104))j++;else return -1;return !alpha(this.c(j))?j:-1;}
  state(i:number){if(this.c(i)!==40)return -1;let j=i+1;while(j<i+4&&lower(this.c(j)))j++;
    if(j>i+1&&(this.c(j)===41||this.c(j)===44)){const e=this.group(i,40,41);if(e>0&&this.boundary(e))return e;}
    j=i+1;if(this.at('\\ca',j))j=this.skip(j+3);
    if(this.c(j)===36&&[97,109,111,116,104,99].includes(this.c(j+1))&&this.at('$)',j+2))return j+4;
    return -1;}
  fraction(i:number){let j=i;if(this.c(j)===43||this.c(j)===45)j++;let numerator=this.integer(j,false);if(numerator<0){if(this.c(j)===36&&lower(this.c(j+1))&&this.c(j+2)===36)numerator=j+3;else if(lower(this.c(j)))numerator=j+1;else return -1;}
    if(this.c(numerator)!==47)return -1;const denominator=this.integer(numerator+1,false);if(denominator<0)return -1;j=denominator;
    if(this.c(j)===36&&lower(this.c(j+1))&&this.c(j+2)===36)j+=3;else if(lower(this.c(j)))j++;
    return j;}
  formula(i:number){let letters=0,other=0,first=-1,last=-1;
    for(let j=i;j<this.length;j++){const c=this.c(j);if(lower(c)){if(lower(this.c(j-1)))return false;letters++;if(first<0)first=j;last=j;}else if(digit(c)||white(c)||c===43||c===45||c===44||c===46||c===40||c===41)other++;else return false;}
    if(this.c(i)===40&&this.c(this.length-1)===41&&letters===this.length-i-2)return false;
    return letters>0&&(this.length-i===1||other>0&&first>=0&&last>=0);
  }
  amount(i:number){let j=i,e=-1;
    if(this.c(j)===40){let k=j+1;if(this.c(k)===43||this.c(k)===45)k++;const n=this.integer(k,false);if(n>0&&this.c(n)===47){const d=this.integer(n+1,false);if(d>0&&this.c(d)===41)e=d+1;}}
    if(e<0){e=this.fraction(j);if(e<0)e=this.number(j);}
    if(e>=0){if(lower(this.c(e))){const k=this.skip(e+1);if(this.c(k)>=65&&this.c(k)<=90)e++;}return e;}
    if(this.c(j)===43||this.c(j)===45)j++;
    if(lower(this.c(j))){const k=this.skip(j+1);if(this.c(k)>=65&&this.c(k)<=90)return j+1;}
    if(this.c(i)===43&&!white(this.c(i+1)))return i+1;
    if(this.c(i)===36){const end=this.group(i,36,36);if(end>0){let hasLower=false;for(let k=i+1;k<end-1;k++){const c=this.c(k);if(lower(c)){if(lower(this.c(k-1)))return -1;hasLower=true;}else if(!digit(c)&&c!==43&&c!==45&&c!==40&&c!==41)return -1;}if(hasLower||end===i+3&&(this.c(i+1)===43||this.c(i+1)===45))return end;}}
    return -1;}
}
interface Match {end:number;value:Text;groups?:Text[]}
function match(v:View,i:number,p:P):Match|null {
  const c=v.c(i),n=v.length;
  const yes=(end:number,start=i,to=end):Match|null=>end<0?null:{end,value:v.span(start,to)};
  const group=(start:number,open=123,close=125,raw=false)=>{const e=v.group(start,open,close);return e<0?null:yes(e,raw?start:start+1,raw?e:e-1);};
  const commandArgs=(count:number,prefix=0)=>{if(!alpha(v.c(i+prefix+1)))return null;let e=v.command(i+prefix);if(e<0)return null;for(let k=0;k<count;k++){e=v.group(e);if(e<0)return null;}return yes(e,i+prefix);};
  const macro=(name:string,count=1,under=false)=>{if(!v.at(name,i)||alpha(v.c(i+name.length)))return null;let j=i+name.length;const captures:Text[]=[];
    for(let k=0;k<count;k++){if(k&&under){if(v.c(j)!==95)return null;j++;}const e=v.group(j);if(e<0)return null;captures.push(v.span(j+1,e-1));j=e;}
    return {end:j,value:captures[0],groups:count>1?captures:undefined};};
  switch(p){
    case P.Empty:return i===n?yes(i):null;
    case P.Any:case P.Any2:return i<n?yes(i+1):null;
    case P.Space:return white(c)?yes(i+1):null;
    case P.SpaceA:return white(c)&&(v.c(i+1)>=65&&v.c(i+1)<=90||v.c(i+1)===92||v.c(i+1)===36)?yes(i+1):null;
    case P.SpaceEnd:return white(c)&&i+1===n?yes(i+1):null;
    case P.Lower:return lower(c)?yes(i+1):null;
    case P.X:return c===120?yes(i+1):null;
    case P.XEnd:return c===120&&i+1===n?yes(n):null;
    case P.IEnd:return c===105&&i+1===n?yes(n):null;
    case P.Letters:return yes(v.letters(i));
    case P.Greek:return yes(v.greek(i));
    case P.LatinEnd:return lower(c)&&(i+1===n||i+2===n&&!alpha(v.c(i+1)))?yes(n,i,i+1):null;
    case P.MathLatinEnd:return v.c(i)===36&&lower(v.c(i+1))&&v.c(i+2)===36&&i+3===n?yes(n,i+1,i+2):null;
    case P.GreekEnd:{let j=i;if(v.c(j)===36)j++;let e=v.greek(j,true);if(e<0&&v.c(j)>=0x3b1&&v.c(j)<=0x3c9)e=j+1;if(e<0)return null;if(v.c(e)===36)e++;e=v.skip(e);if(v.at('{}',e))e+=2;return e===n?yes(e):null;}
    case P.Digits:return yes(v.integer(i,false));
    case P.Number:return yes(v.number(i));
    case P.NumberFull:return yes(v.number(i,true,false));
    case P.PowerNumber:case P.Scientific:{
      let j=i;const groups:Text[]=Array.from({length:6},()=>[]);
      const signStart=j;
      if(v.at('+/-',j))j+=3;else if(v.at('+-',j))j+=2;else if(v.at('\\pm',j))j=v.skip(j+3);else if(v.c(j)===43||v.c(j)===45)j++;
      groups[0]=v.span(signStart,j);const num=j;const numberEnd=v.number(j,false);
      if(numberEnd>=0){j=numberEnd;groups[1]=v.span(num,j);}
      if(p===P.PowerNumber){if(numberEnd<0||v.c(j)!==94)return null;j++;const start=j;let e=v.integer(j);if(v.c(j)===123){e=v.group(j);if(e<0)return null;const inner=new View(v.span(j+1,e-1));if(inner.integer(0)!==inner.length)return null;}if(e<0)return null;return {end:e,value:[],groups:[groups[0],groups[1],v.span(start,e)]};}
      if(v.c(j)===40){const end=v.group(j,40,41);if(end>0&&v.number(j+1,false)===end-1){groups[2]=v.span(j,end);j=end;}}
      let exp=j,k=v.skip(j),kind=0;
      if(v.c(j)===101||v.c(j)===69){kind=v.c(j);groups[3]=v.span(j,j+1);exp=j+1;}
      else if(v.c(k)===42||v.c(k)===120||v.c(k)===0xd7||v.at('\\times',k)){const end=v.c(k)===92?k+6:k+1;const ten=v.skip(end);if(v.at('10^',ten)){kind=1;groups[4]=v.span(k,end);exp=ten+3;}}
      if(kind){let e=v.integer(exp);if(v.c(exp)===123){e=v.group(exp);if(e>0&&v.integer(exp+1)!==e-1)e=-1;}if(e>0){groups[5]=v.span(exp,e);j=e;}else {groups[3]=[];groups[4]=[];}}
      return j>i?{end:j,value:[],groups}:null;
    }
    case P.StateEnd:return yes(v.state(i));
    case P.StateSub:{if(!v.at('_{(',i))return null;const e=v.group(i+1);if(e<0)return null;const b=new View(v.span(i+2,e-1));return b.state(0)===b.length?yes(e,i+2,e-1):null;}
    case P.Open:return c===91||c===40?yes(i+1):v.at('\\{',i)?yes(i+2):null;
    case P.Close:return c===93||c===41?yes(i+1):v.at('\\}',i)?yes(i+2):null;
    case P.CommaSpace:return c===44||c===59?yes(v.skip(i+1)):null;
    case P.Comma:return c===44||c===59?yes(i+1):null;
    case P.Dot:return c===46?yes(i+1):null;
    case P.Hydrate:return c===46||c===42||c===0x22c5||c===0xb7||c===0x2022?yes(v.skip(i+1)):null;
    case P.Ellipsis:return v.at('...',i)&&v.c(i+3)!==46?yes(i+3):null;
    case P.TopGroup:case P.SubGroup:return c===(p===P.TopGroup?94:95)?group(i+1):null;
    case P.TopMath:case P.SubMath:return c===(p===P.TopMath?94:95)&&v.c(i+1)===36?group(i+1,36,36,true):null;
    case P.TopChar:case P.SubChar:{if(c!==(p===P.TopChar?94:95)||i+1===n||v.c(i+1)===92||p===P.TopChar&&v.c(i+1)===95)return null;const e=v.integer(i+1,p===P.SubChar);return yes(e<0?i+2:e,i+1);}
    case P.TopCommandTwo:case P.SubCommandTwo:return c===(p===P.TopCommandTwo?94:95)?commandArgs(2,1):null;
    case P.TopCommandOne:case P.SubCommandOne:return c===(p===P.TopCommandOne?94:95)?commandArgs(1,1):null;
    case P.TopCommand:case P.SubCommand:{if(c!==(p===P.TopCommand?94:95)||!alpha(v.c(i+2)))return null;const e=v.command(i+1);return e<0?null:yes(v.skip(e),i+1,e);}
    case P.TopInteger:return c===94?yes(v.integer(i+1),i+1):null;
    case P.Prime:return c===39?yes(i+1):null;
    case P.EmptyScript:return (c===94&&v.c(i+1)===95||c===95&&v.c(i+1)===94||(c===94||c===95)&&i+1===n)?yes(i+1):null;
    case P.EmptyTop:return v.at('{}^',i)?yes(i+2):null;
    case P.EmptyGroup:return v.at('{}',i)?yes(i+2):null;
    case P.GroupRaw:return group(i,123,125,true);
    case P.Group:return group(i);
    case P.MathRaw:return c===36?group(i,36,36,true):null;
    case P.Math:{if(c!==36)return null;if(v.c(i+1)===123){const e=v.group(i+1);if(e>0&&v.c(e)===36)return yes(e+1,i+2,e-1);}return group(i,36,36);}
    case P.Bond:return c===61||c===60||c===62?yes(i+1):null;
    case P.TripleBond:return c===35||c===0x2261?yes(i+1):null;
    case P.Plus:return c===43?yes(i+1):null;
    case P.ChargeMinus:{if(c!==45)return null;const next=v.c(i+1);return next===-1||white(next)||next===95||next===125||next===44||next===59||next===93||next===47||v.state(i+1)>0?yes(i+1):null;}
    case P.Negative:return c===45&&digit(v.c(i+1))?yes(i+1):null;
    case P.OrbitalMinus:{if(c!==45)return null;let e=i+1;if(v.at('sp',e))e+=2;else if(v.c(e)===115||v.c(e)===112||v.c(e)===100)e++;else return null;return v.boundary(e)?yes(i+1):null;}
    case P.Minus:return c===45?yes(i+1):null;
    case P.PlusMinus:if(v.at('+-',i))return yes(i+2);if(v.at('+/-',i))return yes(i+3);if(v.at('\\pm',i))return yes(i+3);return v.at('$\\pm$',i)?yes(i+5):null;
    case P.Operator:{if(c===43)return yes(i+1);let e=i+1;if(v.at('<<',i)||v.at('>>',i))e=i+2;else if(v.at('\\approx',i))e=i+7;else if(v.at('$\\approx$',i))e=i+9;else if(c!==45&&c!==61&&c!==60&&c!==62)return null;return v.c(e)===-1||white(v.c(e))||digit(v.c(e))||v.c(e)===45&&digit(v.c(e+1))?yes(e):null;}
    case P.Phase:{let e=i+1;if(v.at('(v)',i)||v.at('(^)',i))e=i+3;else if(c!==118&&c!==94)return null;return v.boundary(e)?yes(e):null;}
    case P.ExplicitBond:return macro('\\bond');
    case P.Arrow:{for(const a of ['<->','<-->','->','<-','<=>>','<<=>','<=>','→','⟶','⇌'])if(v.at(a,i))return yes(i+a.length);return null;}
    case P.LabelMode:return (c===67||c===77||c===84)&&v.c(i+1)===91?yes(i+1):null;
    case P.Label:return group(i,91,93);
    case P.Escape:if(c===38)return yes(v.skip(i+1),i,i+1);if(v.at('\\\\',i))return yes(v.skip(i+2),i,i+2);if(v.at('\\hline',i))return yes(v.skip(i+6),i,i+6);return null;
    case P.Spacer:return c===92&&(v.c(i+1)===44||v.c(i+1)===32||v.c(i+1)===59||v.c(i+1)===58)?yes(i+2):null;
    case P.CommandTwo:return commandArgs(2);
    case P.CommandOne:return commandArgs(1);
    case P.Circa:return v.at('\\ca',i)&&!alpha(v.c(i+3))?yes(v.skip(i+3)):null;
    case P.Command:{if(!alpha(v.c(i+1))&&![95,38,123,125,37].includes(v.c(i+1)))return null;const e=v.command(i);return e<0?null:yes(v.skip(e));}
    case P.Orbital:return yes(v.orbital(i));
    case P.Other:return c===47||c===126||c===124?yes(i+1):null;
    case P.Fraction:return macro('\\frac',2);case P.Overset:return macro('\\overset',2);case P.Underset:return macro('\\underset',2);case P.Underbrace:return macro('\\underbrace',2,true);
    case P.Color:return macro('\\color');
    case P.ColorBody:{const regular=macro('\\color',2);if(regular)return regular;
      if(!v.at('\\color',i)||v.c(i+6)!==92)return null;const end=v.command(i+6),body=v.group(end);return body<0?null:{end:body,value:v.span(i+6,end),groups:[v.span(i+6,end),v.span(end+1,body-1)]};}
    case P.Ce:return macro('\\ce');case P.Pu:return macro('\\pu');
    case P.SignedOxidation:case P.Oxidation:{let j=i;if(c===43||c===45)j++;else if(p===P.SignedOxidation){const pm=match(v,i,P.PlusMinus);if(!pm)return null;j=v.skip(pm.end);return v.c(j)===48&&j+1===n?yes(n):null;}const start=j;while(v.c(j)===73||v.c(j)===86||v.c(j)===88)j++;if(j===n&&j>start&&(p===P.Oxidation||i!==start))return yes(n);const pm=match(v,i,P.PlusMinus);if(pm){j=v.skip(pm.end);if(v.c(j)===48&&j+1===n)return yes(n);}return null;}
    case P.FractionEnd:{const e=v.fraction(i);return e===n?yes(e):null;}
    case P.Amount:case P.Amount2:return yes(v.amount(i));
    case P.DefectLetters:{let j=i;if(v.c(j)>=65&&v.c(j)<=90){j++;let count=0;while(count<2&&lower(v.c(j))){j++;count++;}}else if(v.c(j)===105)j++;else return null;return v.c(j)===44?yes(j):null;}
    case P.FormulaEnd:return v.formula(i)?yes(n):null;
    case P.Upright:for(const x of ['pH','pOH','pC','pK','iPr','iBu'])if(v.at(x,i)&&!alpha(v.c(i+x.length)))return yes(i+x.length);return null;
    case P.Slash:case P.DoubleSlash:{const j=v.skip(i),size=p===P.Slash?1:2;if(v.c(j)!==47||size===2&&v.c(j+1)!==47)return null;return yes(v.skip(j+size),j,j+size);}
    case P.Product:{const j=v.skip(i);return v.c(j)===42||v.c(j)===46?yes(v.skip(j+1),j,j+1):null;}
  }
}
interface Item {tex:string;escape?:boolean}
const item=(tex:string,escape=false):Item=>({tex,escape});
const join=(items:Item[])=>items.map(x=>x.tex).join('');
const append=(a:Text=[],b:Text=[]):Text=>{
  const parts:Piece[]=[];
  for(const group of [a,b])for(const p of group){const last=parts.at(-1);
    if(last&&last.source===p.source&&last.end===p.start)parts[parts.length-1]={source:last.source,start:last.start,end:p.end};
    else parts.push(p);
  }return parts;
};
const emit=(t:Text=[])=>new View(t).emit();
const nonempty=(t:Text|undefined)=>!!t?.some(p=>p.end>p.start);
interface Buffer {fields:Record<string,Text>;sb:boolean;bond:boolean;parentheses:number;defect:boolean;oxidation:boolean}
const fields:Partial<Record<A,string>>={[A.SetA]:'a',[A.SetB]:'b',[A.SetP]:'p',[A.SetO]:'o',[A.SetQ]:'q',[A.SetD]:'d',[A.SetText]:'text',[A.SetRoman]:'rm',[A.SetR]:'r',[A.Top]:'rd',[A.Bottom]:'rq',[A.TopMode]:'rdt',[A.BottomMode]:'rqt'};
const arrowNames:Record<string,string>={'->':'rightarrow','→':'rightarrow','⟶':'rightarrow','<-':'leftarrow','<->':'leftrightarrow','<-->':'leftrightarrows','<=>':'rightleftharpoons','⇌':'rightleftharpoons','<=>>':'Rightleftharpoons','<<=>':'Leftrightharpoons'};
const bondTex:Record<string,string>={'-':'{-}','1':'{-}','=':'{=}','2':'{=}','#':'{\\equiv}','≡':'{\\equiv}','3':'{\\equiv}','~':'{\\tripledash}','~-':'{\\mhchemBondTD}','~--':'{\\mhchemBondTDD}','~=':'{\\mhchemBondTDD}','-~-':'{\\mhchemBondDTD}','...':'{{\\cdot}{\\cdot}{\\cdot}}','....':'{{\\cdot}{\\cdot}{\\cdot}{\\cdot}}','->':'{\\mhchemrightarrow}','<-':'{\\mhchemleftarrow}','<':'{<}','>':'{>}' };
const inserts:Record<string,string>={'space':' ','tinySkip':'\\mkern2mu','entitySkip':'~','pu-space-1':'~','pu-space-2':'\\mkern3mu ','1000 separator':'\\mkern2mu ','commaDecimal':'{,}','hyphen':'\\text{-}','addition compound':'\\,{\\cdot}\\,','electron dot':'\\mkern1mu \\bullet\\mkern1mu ','KV x':'{\\times}','prime':'\\prime ','cdot':'\\cdot ','tight cdot':'\\mkern1mu{\\cdot}\\mkern1mu ','times':'\\times ','circa':'{\\sim}','ellipsis':'\\ldots ','/':'/',' / ':'\\,/\\,'};
export class MhchemMachine {
  constructor(readonly fail:(message:string)=>never,readonly maxDepth=1024){}
  run(text:Text,machine:M,depth=0):Item[] {
    // Recursive grammar actions have an independent safety ceiling, even when
    // callers raise the explicit parser stack limit.
    if(depth>=Math.min(this.maxDepth,512))this.fail('Nesting limit exceeded');
    if(!nonempty(text))return [];
    const v=new View(text),g=chemistryGrammar()[machine],buf:Buffer={fields:{},sb:false,bond:false,parentheses:0,defect:false,oxidation:false},out:Item[]=[];
    let state=g.start,i=0,stalled=0;
    const go=(t:Text=[],m:M=machine)=>this.run(t,m,depth+1);
    const render=(t:Text=[],m:M=machine)=>join(go(t,m));
    const reset=()=>{buf.fields={};buf.sb=false;buf.defect=false;buf.oxidation=false;};
    const operator=(t:Text,option:Option)=>{
      const name=typeof option==='string'?option:emit(t);
      if(name==='v'||name==='(v)')return item(' \\downarrow{} ');
      if(name==='^'||name==='(^)')return item(' \\uparrow{} ');
      if(name==='<<'||name==='>>')return item(` {}\\${name==='<<'?'ll':'gg'}{} `);
      return item(` {}${name}{} `);
    };
    const bond=(t:Text,option:Option)=>{const name=typeof option==='string'?option:emit(t);if(!Object.hasOwn(bondTex,name))this.fail('mhchem bug T. Please report.');return item(bondTex[name]);};
    const clearOutput=(s:string)=>{reset();return [item(s)];};
    const output=(follows:Option=null):Item[]=>{
      const f=buf.fields;
      switch(machine){
        case M.Text:{if(!nonempty(f.text))return [];const view=new View(f.text);let special=false;for(let k=0;k<view.length;k++)if(view.c(k)===94||view.c(k)===95)special=true;let value=view.emit();
          if(special){let s='',space=false,hyphen=false;for(let k=0;k<view.length;k++){const c=view.c(k);if(c===32&&!space){s+='~';space=true;}else if(c===45&&!hyphen){s+='\\text{-}';hyphen=true;}else s+=String.fromCharCode(c);}value='\\mathrm{'+s+'}';}else value='\\text{'+value+'}';return clearOutput(value);}
        case M.Math:case M.MathTight:return nonempty(f.o)?clearOutput(emit(f.o)+' '):[];
        case M.Unit:{if(!nonempty(f.rm))return [];const vv=new View(f.rm),group=match(vv,0,P.Group);const result=group?.end===vv.length?go(group.value,M.Pu):[item('\\mathrm{'+emit(f.rm)+'}')];reset();return result;}
        case M.Pu:{let d=f.d??[],q=f.q??[];
          const strip=(t:Text)=>{const vv=new View(t),m=match(vv,0,P.Group);return m?.end===vv.length?m.value:t;};
          d=strip(d);q=strip(q);
          const degrees=(t:Text):Text=>{const vv=new View(t),pieces:Piece[]=[];let last=0;
            for(let k=0;k<vv.length;k++){let end=-1;if(vv.c(k)===176&&(vv.c(k+1)===67||vv.c(k+1)===70))end=k+1;else if(vv.at('^o',k)&&(vv.c(k+2)===67||vv.c(k+2)===70))end=k+2;else if(vv.at('^{o}',k)&&(vv.c(k+4)===67||vv.c(k+4)===70))end=k+4;
              if(end>=0){pieces.push(...vv.span(last,k),...literal('{}^{\\circ}'));last=end;k=end-1;}}
            pieces.push(...vv.span(last));return pieces;};
          d=degrees(d);let result:Item[];
          if(nonempty(q)){q=degrees(q);const top=go(d,M.Pu),bottom=go(q,M.Pu);result=emit(f.o)==='//'
              ?[item(`\\flashmathChemFraction{${join(top)}}{${join(bottom)}}`)]
              :[...top,item(top.length>1||bottom.length>1?'\\,/\\,':'/'),...bottom];}
          else result=go(d,M.Unit);
          reset();return result;
        }
        case M.Ce:{
          if(nonempty(f.r)){
            const topMode=emit(f.rdt),bottomMode=emit(f.rqt),top=topMode==='M'?render(f.rd,M.Math):topMode==='T'?'\\text{'+emit(f.rd)+'}':render(f.rd,M.Ce),bottom=bottomMode==='M'?render(f.rq,M.Math):bottomMode==='T'?'\\text{'+emit(f.rq)+'}':render(f.rq,M.Ce);
            const name=arrowNames[emit(f.r)];let arrow=`\\mhchemlong${name}`;
            if(top||bottom){if(name==='rightleftharpoons'||name==='Rightleftharpoons'||name==='Leftrightharpoons'){
                // Upstream replacement changes overset to xArrow, but leaves its
                // 6mu lower harpoon label outside. Preserve that exact boundary.
                arrow=top?`\\mhchemx${name}{${top}}`:arrow;
                if(bottom)arrow=`\\underset{\\flashmathChemLower6mu{${bottom}}}{${arrow}}`;
              }else if(name==='leftrightarrows')arrow=`\\mhchemx${name}${bottom?'['+bottom+']':''}{${top}}`;
              else arrow=`\\mhchemx${name}${bottom?'[{'+bottom+'}]':''}{${top}}`;
            }
            return clearOutput(` {}\\flashmathChemRel{${arrow}}{} `);
          }
          if(!['a','b','p','o','q','d'].some(k=>nonempty(f[k]))&&!follows){reset();return [];}
          if(!['o','q','d','b','p'].some(k=>nonempty(f[k]))&&follows!==2){f.o=f.a;delete f.a;}
          else if(!['o','q','d'].some(k=>nonempty(f[k]))&&(nonempty(f.b)||nonempty(f.p))){f.o=f.a;f.d=f.b;f.q=f.p;delete f.a;delete f.b;delete f.p;}
          else if(nonempty(f.o)&&buf.defect&&match(new View(f.d??[]),0,P.Oxidation))buf.oxidation=true;
          else if(nonempty(f.o)&&buf.defect&&!nonempty(f.q))buf.defect=false;
          const amount=render(f.a,M.Amount),top=render(f.b,M.Sup),bottom=render(f.p,M.Sub),body=render(f.o,M.Body),sub=render(f.q,M.Sub),sup=render(f.d,buf.oxidation?M.Oxidation:M.Sup);
          const signed=(s:string)=>s.charCodeAt(0)===43||s.charCodeAt(0)===45?'{'+s+'}':s;
          let tex=buf.sb?'~':'';if(amount)tex+=signed(amount)+'\\,';
          if(top||bottom)tex+=`\\flashmathChemIsotope{${top}}{${bottom}}`;
          tex+=signed(body);
          const phantom=String.raw`{\vphantom{A}}`,subTex=sub?`_{\\flashmathChemSmash{${sub}}}`:'';
          if(buf.defect&&!buf.oxidation){if(sub||sup)tex+=phantom;if(sup)tex+=`^{${sup}}`;tex+=subTex;}
          else if(buf.oxidation){if(sup)tex+=phantom+`^{${sup}}`;if(sub)tex+=phantom+subTex;}
          else {if(sub)tex+=phantom+subTex;if(sup)tex+=phantom+`^{${sup}}`;}
          return clearOutput(tex);
        }
        default:return [];
      }
    };
    const act=(a:A,m:Match,option:Option):Item[]=>{
      const f=buf.fields,field=fields[a];
      if(field){f[field]=append(f[field],m.value);return [];}
      switch(a){
        case A.Copy:return [item(emit(m.value))];case A.Write:return [item(String(option))];
        case A.Ce:return go(m.value,M.Ce);case A.Pu:return go(m.value,M.Pu);
        case A.Output:return output(option);
        case A.NotBond:buf.bond=false;return [];case A.BeginsBond:buf.bond=true;return [];
        case A.NoSpace:buf.sb=false;return [];case A.SpaceBefore:buf.sb=true;return [];
        case A.Open:buf.parentheses++;return [];case A.Close:buf.parentheses--;return [];
        case A.SetDefect:f.d=m.value;buf.defect=true;return [];
        case A.AmountToBody:f.o=f.a;delete f.a;return [];
        case A.AppendO:f.o=append(f.o,literal(String(option)));return [];
        case A.TightOperator:f.o=append(f.o,append(literal('{'),append(m.value,literal('}'))));return [];
        case A.Operator:return [operator(m.value,option)];case A.Bond:return [bond(m.value,option)];
        case A.ChargeOrBond:if(buf.bond)return [...output(),bond(m.value,'-')];f.d=m.value;return [];
        case A.MinusAfter:{const body=new View(f.o??[]),orb=match(body,0,P.Orbital),greek=match(body,0,P.GreekEnd),latin=match(body,0,P.LatinEnd),mathLatin=match(body,0,P.MathLatinEnd);
          const hyphen=(orb?.end===body.length||greek||latin||mathLatin)&&new View(m.value).equal('-');
          if(hyphen&&!['a','b','p','d','q'].some(k=>nonempty(f[k]))&&!orb&&latin)f.o=append(literal('$'),append(f.o,literal('$')));
          if(hyphen)return [...output(),item('\\text{-}')];
          const d=new View(f.d??[]),digits=match(d,0,P.Digits);
          if(option&&digits?.end===d.length)f.d=append(f.d,m.value);
          else return [...output(),bond(m.value,'-')];
          return output();
        }
        case A.BodyAfter:{const d=new View(f.d??[]);const num=match(d,0,P.Digits);let result:Item[];
          if(d.c(0)>=49&&d.c(0)<=57&&num?.end===d.length){const top=f.d;delete f.d;result=[...output(),item('\\mkern2mu')];buf.fields.b=top;}
          else result=output();buf.fields.o=append(buf.fields.o,m.value);return result;}
        case A.OxidationOutput:return [item('{'+render(m.value,M.Oxidation)+'}')];
        case A.RomanNumeral:return [item('\\mathrm{'+emit(f.o)+'}')];
        case A.State:return [item(`\\mskip${machine===M.Sub?1:2}mu `+render(m.value,M.Body))];
        case A.Comma:if(machine===M.Decimal||machine===M.UnitNumber)return [item('{,}')];{
          const vv=new View(m.value),withSpace=white(vv.c(vv.length-1));let end=vv.length;while(white(vv.c(end-1)))end--;
          return [item('{'+vv.emit(0,end)+'}\\mkern'+(withSpace&&buf.parentheses===0?6:3)+'mu ')];}
        case A.Insert:{const s=String(option);if(!Object.hasOwn(inserts,s))this.fail('Unknown mhchem insertion '+s);return [item(inserts[s])];}
        case A.InsertValue:{if(option==='1st-level escape')return [item(emit(m.value)+' ',true)];const width=option==='comma enumeration S'?1:option==='comma enumeration M'?3:6;return [item('{'+emit(m.value)+'}\\mkern'+width+'mu ')];}
        case A.Roman:return [item('\\mathrm{'+emit(m.value)+'}')];
        case A.Math:return go(m.value,M.Math);case A.MathTight:return go(m.value,M.MathTight);case A.Text:return go(m.value,M.Text);case A.Decimal:return go(m.value,M.Decimal);
        case A.Color0:return [item('\\color{'+emit(m.value)+'}')];
        case A.Color:{const group=m.groups!;return [item('{\\color{'+emit(group[0])+'}{'+render(group[1],machine===M.Sub||machine===M.Sup?machine:M.Ce)+'}}')];}
        case A.Fraction:case A.Overset:case A.Underset:case A.Underbrace:{const group=m.groups!,one=render(group[0],M.Ce),two=render(group[1],M.Ce),cmd=a===A.Fraction?'frac':a===A.Overset?'overset':a===A.Underset?'underset':'underbrace';return [item(a===A.Underbrace?`\\underbrace{${one}}_{${two}}`:`\\${cmd}{${one}}{${two}}`)];}
        case A.AmountFraction:{const vv=new View(m.value);let j=0,sign='';if(vv.c(j)===43||vv.c(j)===45)sign=String.fromCharCode(vv.c(j++));let slash=j;while(slash<vv.length&&vv.c(slash)!==47)slash++;const end=vv.integer(slash+1,false);let numerator='';for(let k=j;k<slash;k++)if(vv.c(k)!==36)numerator+=String.fromCharCode(vv.c(k));let rest='';for(let k=end;k<vv.length;k++)if(vv.c(k)!==36)rest+=String.fromCharCode(vv.c(k));return [item(sign),item(`\\flashmathChemFraction{${numerator}}{${vv.emit(slash+1,end)}}`),...(rest?[item(rest+' ')]:[])];}
        case A.Space:return [item(machine===M.Unit?'\\mkern3mu ':'~')];case A.Dot:return [item('\\mkern1mu{\\cdot}\\mkern1mu ')];
        case A.UnitPower:f.rm=append(f.rm,append(literal('^{'),append(m.value,literal('}'))));return [];
        case A.NumberPower:case A.Scientific:{const group=m.groups!,sign=new View(group[0]);const result:Item[]=[];
          if(sign.equal('+-')||sign.equal('+/-'))result.push(item('\\pm '));else if(sign.length)result.push(item(sign.emit()));
          result.push(...go(group[1],M.UnitNumber));
          if(a===A.NumberPower)result.push(item('^{'+emit(group[2])+'}'));
          else {if(nonempty(group[2])){const uncertainty=new View(group[2]);let decimal=false;for(let k=0;k<uncertainty.length;k++)if(uncertainty.c(k)===44||uncertainty.c(k)===46)decimal=true;result.push(...(decimal?go(group[2],M.UnitNumber):[item(uncertainty.emit())]));}
            if(nonempty(group[3])||nonempty(group[4]))result.push(item(emit(group[3])==='e'||emit(group[4])==='*'?'\\cdot ':'\\times '));
            if(nonempty(group[5]))result.push(item('10^{'+emit(group[5])+'}'));}
          return result;
        }
        case A.IntegerOutput:case A.DecimalOutput:{const vv=new View(f.text??[]);let result:Item[]=[];
          if(vv.length>4){let start=0,next=a===A.IntegerOutput?(vv.length%3||3):3;while(next<vv.length){result.push(item(vv.emit(start,next)),item('\\mkern2mu '));start=next;next+=3;}result.push(item(vv.emit(start)));}
          else result=[item(vv.emit())];reset();return result;}
        default:return this.fail('Unknown mhchem action '+a);
      }
    };
    while(true){const old=i;let selected=false;
      for(const ruleId of g.states[state]){
        const [pattern,actions,next,flags]=g.rules[ruleId],m=match(v,i,pattern);if(!m)continue;selected=true;
        for(const [action,option]of actions)for(const value of act(action,m,option))out.push(value);
        if(next>=0)state=next;
        if(i===v.length)return out;
        if(!(flags&1))i=m.end;
        if(!(flags&2))break;
      }
      if(!selected||old===i){if(++stalled>12)this.fail('mhchem bug U. Please report.');}else stalled=0;
    }
  }
  toTex(source:string,unit=false){
    const parts:Piece[]=[],index:SourceIndex={};let start=0;
    for(let i=0;i<source.length;i++)if(source.charCodeAt(i)===0x2026){if(start<i)parts.push({source,start,end:i,index});parts.push(...literal('...'));start=i+1;}
    if(start<source.length)parts.push({source,start,end:source.length,index});
    const result=this.run(parts,unit?M.Pu:M.Ce);const text=join(result),v=new View(literal(text));let tex='';
    for(let i=0;i<v.length;){
      if(v.c(i)!==92){tex+=String.fromCharCode(v.c(i++));continue;}
      const end=v.command(i);let replacement='';
      for(const name of ['leftarrow','rightarrow','leftrightarrow','longleftarrow','longrightarrow','longleftrightarrow','longleftrightarrows','longrightleftharpoons','longRightleftharpoons','longLeftrightharpoons'])
        if(end===i+name.length+1&&v.at(name,i+1)){replacement='\\mhchem'+name;break;}
      tex+=replacement||v.emit(i,end);i=end;
    }
    return tex&&!result.some(x=>x.escape)?'{'+tex+'}':tex;
  }
}
