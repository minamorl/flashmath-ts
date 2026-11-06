import {K} from '../ast.js';
import type {Node} from '../ast.js';
import type {Parser} from '../parser.js';
import {raw,scan} from '../scanner.js';
import type {TexPackage} from './types.js';

export function children(n:Node){return n.inferred?n.children:[n];}
export function scopeStyle(p:Parser,attrs:Record<string,string>){
  const f=p.f,existing=f.nodes,done=f.done;f.nodes=[];
  f.done=nodes=>done([...existing,p.node(K.mstyle,nodes,'',attrs)]);
}
const userColors=new WeakMap<object,Map<string,string>>();
// Named color data adapted from MathJax 4.1.3 ColorConstants.ts (Apache-2.0).
// Copyright 2018–2026 Omar Al-Ithawi and The MathJax Consortium; see ../LICENSE.MathJax.
const named:Record<string,string>={"Apricot":"#FBB982","Aquamarine":"#00B5BE","Bittersweet":"#C04F17","Black":"#221E1F","Blue":"#2D2F92","BlueGreen":"#00B3B8","BlueViolet":"#473992","BrickRed":"#B6321C","Brown":"#792500","BurntOrange":"#F7921D","CadetBlue":"#74729A","CarnationPink":"#F282B4","Cerulean":"#00A2E3","CornflowerBlue":"#41B0E4","Cyan":"#00AEEF","Dandelion":"#FDBC42","DarkOrchid":"#A4538A","Emerald":"#00A99D","ForestGreen":"#009B55","Fuchsia":"#8C368C","Goldenrod":"#FFDF42","Gray":"#949698","Green":"#00A64F","GreenYellow":"#DFE674","JungleGreen":"#00A99A","Lavender":"#F49EC4","LimeGreen":"#8DC73E","Magenta":"#EC008C","Mahogany":"#A9341F","Maroon":"#AF3235","Melon":"#F89E7B","MidnightBlue":"#006795","Mulberry":"#A93C93","NavyBlue":"#006EB8","OliveGreen":"#3C8031","Orange":"#F58137","OrangeRed":"#ED135A","Orchid":"#AF72B0","Peach":"#F7965A","Periwinkle":"#7977B8","PineGreen":"#008B72","Plum":"#92268F","ProcessBlue":"#00B0F0","Purple":"#99479B","RawSienna":"#974006","Red":"#ED1B23","RedOrange":"#F26035","RedViolet":"#A1246B","Rhodamine":"#EF559F","RoyalBlue":"#0071BC","RoyalPurple":"#613F99","RubineRed":"#ED017D","Salmon":"#F69289","SeaGreen":"#3FBC9D","Sepia":"#671800","SkyBlue":"#46C5DD","SpringGreen":"#C6DC67","Tan":"#DA9D76","TealBlue":"#00AEB3","Thistle":"#D883B7","Turquoise":"#00B4CE","Violet":"#58429B","VioletRed":"#EF58A0","White":"#FFFFFF","WildStrawberry":"#EE2967","Yellow":"#FFF200","YellowGreen":"#98CC70","YellowOrange":"#FAA21A"};
export function getColor(p:Parser,model:string,value:string):string {
  if(!model||model==='named'){
    if(value.includes(';'))p.error('Invalid color value');
    return userColors.get(p.session)?.get(value)??named[value]??value;
  }
  if(!['rgb','RGB','gray'].includes(model))p.error(`Color model '${model}' not defined`);
  const parts=value.trim().split(/\s*,\s*/);
  if(model!=='gray'&&parts.length!==3)p.error(`Color values for the ${model} model require 3 numbers`);
  const max=model==='RGB'?255:1;
  const nums=parts.map(part=>{
    if(!(model==='RGB'?/^\d+$/:/^(\d+(\.\d*)?|\.\d+)$/).test(part))p.error(model==='RGB'?'Invalid number':'Invalid decimal number');
    const n=Number(part);if(n>max)p.error(`Color values for the ${model} model must be between 0 and ${max}`);
    return Math.floor(n*(model==='RGB'?1:255)).toString(16).padStart(2,'0');
  });
  if(model==='gray'&&parts.length!==1)p.error('Invalid decimal number');
  return '#'+(model==='gray'?nums[0].repeat(3):nums.join(''));
}
export function readColor(p:Parser,fallback=''){const model=raw(p.optional()??[])||fallback;return getColor(p,model,raw(p.tokensArgument()));}
export default {name:'color',commands:{
  color:{execute(p){scopeStyle(p,{mathcolor:readColor(p)});}},
  textcolor:{execute(p){const color=readColor(p);p.argument(n=>p.append(p.node(K.mstyle,children(n),'',{mathcolor:color})));}},
  definecolor:{execute(p){const name=raw(p.tokensArgument()),model=raw(p.tokensArgument()),value=raw(p.tokensArgument());let colors=userColors.get(p.session);if(!colors)userColors.set(p.session,colors=new Map());if(value.includes(';'))p.error('Invalid color value');colors.set(name,model&&model!=='named'?getColor(p,model,value):value);}},
  colorbox:{execute(p){box(p,false);}},fcolorbox:{execute(p){box(p,true);}},
},environments:{},options:['color'],configurationModules:['input/tex/color/ColorConfiguration.js']} satisfies TexPackage;
function box(p:Parser,frame:boolean){
  const model=raw(p.optional()??[]),first=getColor(p,model,raw(p.tokensArgument()));
  const background=frame?readColor(p,model):first;
  const options=p.options.texOptions?.color as {padding?:string,borderWidth?:string}|undefined;
  const padding=options?.padding??'5px',unit=padding.replace(/^.*?([a-z]*)$/,'$1');
  const attrs={mathbackground:background,...(frame?{style:`border: ${options?.borderWidth??'2px'} solid ${first}`} : {}),width:'+'+(2*parseFloat(padding))+unit,height:'+'+padding,depth:'+'+padding,lspace:padding};
  const tokens=p.tokensArgument();
  p.parseTokens(scan('\\text{'+raw(tokens)+'}'),n=>p.append(p.node(K.mpadded,[n],'',attrs)));
}
