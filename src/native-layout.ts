import type {MathMLNode} from './ast.js';

function node(kind:string,children:MathMLNode[]=[],attributes:Record<string,string>={},start=0):MathMLNode {
  if(attributes.style?.endsWith(';'))attributes.style=attributes.style.slice(0,-1);
  return {kind,children,attributes,text:'',start};
}
function words(value:string):string[] {
  const result:string[]=[];let start=-1;
  for(let i=0;i<=value.length;i++){
    const c=value.charCodeAt(i),white=i===value.length||c<=32||c===160;
    if(white){if(start>=0){result.push(value.slice(start,i));start=-1;}}
    else if(start<0)start=i;
  }
  return result;
}
export function addStyle(n:MathMLNode,css:string):void {
  const previous=n.attributes.style??'';
  const joined=previous+(previous&&!previous.endsWith(';')?';':'')+css;
  n.attributes.style=joined.endsWith(';')?joined.slice(0,-1):joined;
}
export function nativeBBox(n:MathMLNode):MathMLNode {
  const padding=length(n.attributes.lspace,'0em');
  n.kind='mrow';
  for(const key of ['width','height','depth','lspace','voffset'])delete n.attributes[key];
  n.attributes['data-flashmath-bbox']='true';
  addStyle(n,`padding:${padding};`);return n;
}
function length(value:string|undefined,fallback:string):string {
  if(!value)return fallback;
  const source=value.trim();let i=source[0]==='+'?1:0,dots=0,digits=0;
  for(;i<source.length;i++){const c=source.charCodeAt(i);if(c>=48&&c<=57)digits++;else if(c===46&&dots++===0)continue;else break;}
  const unit=source.slice(i);if(!digits||!['','em','ex','px','pt','pc','in','cm','mm','mu','%'].includes(unit))return fallback;
  return unit==='mu'?`${Number(source.slice(0,i))/18}em`:source.slice(0,i)+(unit||'em');
}

// Absolute, size-contained decoration layers let CSS calculate diagonal lengths
// and angles from the final layout. The converter never measures text or a DOM.
function line(n:MathMLNode,direction:string,thickness:string,heads=0,head='4 2 1'):MathMLNode {
  const diagonal=direction==='up'||direction==='down';
  const width=diagonal?'hypot(100cqw,100cqh)':direction==='vertical'?'100cqh':'100cqw';
  const angle=diagonal?`calc(${direction==='up'?'-1':'1'} * atan2(100cqh,100cqw))`:direction==='vertical'?'90deg':'0deg';
  const line=node('mrow',[],{'data-flashmath-line':direction,style:`position:absolute;left:50%;top:50%;width:${width};height:${thickness};background-color:currentColor;transform:translate(-50%,-50%) rotate(${angle});`},n.start);
  const dimensions=words(head).map(Number);
  const x=Number.isFinite(dimensions[0])&&dimensions[0]>0?dimensions[0]:4;
  const y=Number.isFinite(dimensions[1])&&dimensions[1]>0?dimensions[1]:2;
  const dx=Number.isFinite(dimensions[2])&&dimensions[2]>=0?dimensions[2]:1;
  for(const end of [1,2])if(heads&end)line.children.push(node('mrow',[],{style:`position:absolute;${end===1?'right':'left'}:0;top:50%;width:calc(${x+dx} * ${thickness});height:calc(${2*y} * ${thickness});background-color:currentColor;clip-path:polygon(0 0,100% 50%,0 100%,${100*dx/(x+dx)}% 50%);transform:translateY(-50%)${end===2?' rotate(180deg)':''};`},n.start));
  return node('mrow',[line],{'aria-hidden':'true',style:'position:absolute;inset:0;container-type:size;pointer-events:none;'},n.start);
}
const arrows:Record<string,[string,number]>={
  uparrow:['vertical',2],downarrow:['vertical',1],leftarrow:['horizontal',2],rightarrow:['horizontal',1],
  updownarrow:['vertical',3],leftrightarrow:['horizontal',3],updiagonalarrow:['up',1],northeastarrow:['up',1],
  southwestarrow:['up',2],southeastarrow:['down',1],northwestarrow:['down',2],
  northeastsouthwestarrow:['up',3],northwestsoutheastarrow:['down',3],
};
const borders:Record<string,string[]>={top:['top'],right:['right'],bottom:['bottom'],left:['left'],actuarial:['top','right'],madruwb:['bottom','right'],box:['top','right','bottom','left'],roundedbox:['top','right','bottom','left'],circle:['top','right','bottom','left']};
export function nativeEnclosure(n:MathMLNode):MathMLNode {
  const notations=new Set(words(n.attributes.notation??'longdiv'));
  const a={...n.attributes};delete a.notation;
  const padding=length(a['data-padding'],'.2em'),thickness=length(a['data-thickness'],'.067em');
  const result={...n,kind:'mrow',attributes:a,children:[...n.children]};
  result.attributes['data-flashmath-enclose']=[...notations].join(' ');
  if(a.color&&!a.mathcolor)a.mathcolor=a.color;
  if(a.background&&!a.mathbackground)a.mathbackground=a.background;
  let body=node('mrow',result.children,{},n.start);
  if(notations.has('radical'))body=node('msqrt',[body],{},n.start);
  result.children=[body];
  const css:Record<string,string>={position:'relative'};
  const pads:Record<string,string>={top:'0em',right:'0em',bottom:'0em',left:'0em'};
  const extend=(side:string,value:string)=>{pads[side]=pads[side]==='0em'||pads[side]===value?value:`max(${pads[side]},${value})`;};
  const sides=new Set<string>(),straight=new Set<string>();
  for(const notation of notations)for(const side of Object.hasOwn(borders,notation)?borders[notation]:[]){
    sides.add(side);if(notation!=='circle'&&notation!=='roundedbox')straight.add(side);
  }
  if(sides.size){
    for(const [shape,edges] of [['straight',straight],['roundedbox',notations.has('roundedbox')?sides:[]],['circle',notations.has('circle')?sides:[]]] as const){
      const declarations=[...edges].map(side=>`border-${side}:${thickness} solid currentColor;`).join('');
      if(declarations)result.children.push(node('mrow',[],{'aria-hidden':'true',style:'position:absolute;inset:0;pointer-events:none;'+declarations+(shape==='circle'?'border-radius:50%;':shape==='roundedbox'?`border-radius:calc(${padding} + ${thickness});`:'')},n.start));
    }
    // Account for the stroke in the natural box as MathJax does.
    for(const side of sides)extend(side,`calc(${padding} + ${thickness})`);
  }
  const lines=new Map<string,number>();
  for(const notation of notations){
    if(Object.hasOwn(arrows,notation)){const [direction,heads]=arrows[notation];lines.set(direction,(lines.get(direction)??0)|heads);}
    else if(notation==='updiagonalstrike')lines.set('up',lines.get('up')??0);
    else if(notation==='downdiagonalstrike')lines.set('down',lines.get('down')??0);
    else if(notation==='horizontalstrike')lines.set('horizontal',lines.get('horizontal')??0);
    else if(notation==='verticalstrike')lines.set('vertical',lines.get('vertical')??0);
  }
  for(const [direction,heads] of lines){
    if(direction==='up'||direction==='down')for(const side of Object.keys(pads))extend(side,`calc(${padding} + ${thickness})`);
    else{
      const [before,after]=direction==='horizontal'?['left','right']:['top','bottom'];
      const [x=4,,dx=1]=words(a['data-arrowhead']??'4 2 1').map(Number);
      const reach=Number.isFinite(x+dx)&&x>0&&dx>=0?x+dx+1:6;
      extend(before,heads&2?`max(${padding},calc(${reach} * ${thickness}))`:padding);
      extend(after,heads&1?`max(${padding},calc(${reach} * ${thickness}))`:padding);
    }
    result.children.push(line(n,direction,thickness,heads,a['data-arrowhead']));
  }
  if(notations.has('longdiv')){
    extend('left',`calc(2 * ${padding} + ${thickness} / 2)`);extend('top',`calc(${padding} + ${thickness})`);extend('right',padding);extend('bottom',padding);
    result.children.push(node('mrow',[],{'aria-hidden':'true',style:`position:absolute;inset:0;pointer-events:none;border-top:${thickness} solid currentColor;`},n.start));
    result.children.push(node('mrow',[],{'aria-hidden':'true',style:`position:absolute;left:calc(-1 * ${padding});top:0;bottom:0;width:calc(2 * ${padding});border-right:${thickness} solid currentColor;border-radius:0 50% 50% 0;pointer-events:none;`},n.start));
  }
  if(notations.has('phasorangle')){
    extend('left',`calc(1.5 * ${padding} + ${thickness})`);extend('bottom',`calc(${padding} / 2 + ${thickness})`);extend('top',padding);extend('right',`calc(${padding} / 2)`);
    result.children.push(node('mrow',[],{'aria-hidden':'true',style:`position:absolute;inset:0;border-bottom:${thickness} solid currentColor;pointer-events:none;`},n.start));
    const slant=node('mrow',[],{style:`position:absolute;left:0;top:0;bottom:0;width:calc(1.75 * ${padding});container-type:size;pointer-events:none;`},n.start);
    slant.children.push(line(n,'up',thickness));result.children.push(slant);
  }
  css.padding=['top','right','bottom','left'].map(side=>pads[side]).join(' ');
  addStyle(result,Object.entries(css).map(([key,value])=>`${key}:${value}`).join(';'));
  return result;
}

export function isCenterOver(n:MathMLNode):boolean {
  const outer=n.children[1],inner=outer?.children[0];
  return n.kind==='mrow'&&n.children.length===2&&outer?.kind==='mpadded'&&outer.attributes.width==='0'&&outer.attributes.lspace==='-.5width'
    &&inner?.kind==='mpadded'&&inner.attributes.width==='0'&&inner.attributes.lspace==='-.5width'&&outer.children[1]?.kind==='mphantom';
}
export function nativeCenterOver(n:MathMLNode):MathMLNode {
  const content=node('mrow',n.children[1].children[0].children,{style:'transform:translateX(-50%);'},n.start);
  const overlay=node('mrow',[content],{style:'width:0;min-width:0;'},n.start);
  const base=node('mrow',[n.children[0]],{},n.start);
  addStyle(n,'display:inline-grid;grid-template-columns:max-content;align-items:baseline;');
  n.attributes['data-flashmath-overlay']='true';
  for(const child of [base,overlay])addStyle(child,'grid-area:1 / 1;justify-self:center;');
  n.children=[base,overlay];return n;
}

const entry=(value:string|undefined,index:number,fallback:string)=>{const list=value===undefined?undefined:words(value);return list?.[Math.min(index,list.length-1)]??fallback;};
export function nativeTable(n:MathMLNode,defaultSide='right'):MathMLNode {
  const labeled=n.children.some(r=>r.kind==='mlabeledtr');
  const proof=n.attributes.semantics?.includes('bspr_inferenceRule:')??false;
  if(!labeled&&!n.attributes.rowlines&&!n.attributes.columnlines&&!n.attributes.frame)return n;
  const side=(n.attributes.side??defaultSide)==='left'?'left':'right';
  const columns=Math.max(0,...n.children.map(r=>r.children.length-(r.kind==='mlabeledtr'?1:0)));
  for(let i=0;i<n.children.length;i++){
    const row=n.children[i],label=row.kind==='mlabeledtr'?row.children.shift():undefined;
    row.kind='mtr';
    while(row.children.length<columns)row.children.push(node('mtd',[],{},row.start));
    for(let j=0;j<row.children.length;j++){
      const cell=row.children[j];
      const align=cell.attributes.columnalign??row.attributes.columnalign??entry(n.attributes.columnalign,j,'center');
      const vertical=cell.attributes.rowalign??row.attributes.rowalign??entry(n.attributes.rowalign,i,'baseline');
      addStyle(cell,`text-align:${['left','right','center'].includes(align)?align:'center'};vertical-align:${['top','bottom','center'].includes(vertical)?vertical==='center'?'middle':vertical:'baseline'};`);
      const top=i?length(entry(n.attributes.rowspacing,i-1,'.5ex'),'.5ex'):'0em';
      const bottom=i<n.children.length-1?length(entry(n.attributes.rowspacing,i,'.5ex'),'.5ex'):'0em';
      const left=j?length(entry(n.attributes.columnspacing,j-1,'.8em'),'.8em'):'0em';
      const right=j<columns-1?length(entry(n.attributes.columnspacing,j,'.8em'),'.8em'):'0em';
      addStyle(cell,`padding:calc(${top} / 2) calc(${right} / 2) calc(${bottom} / 2) calc(${left} / 2);`);
      const border=entry(n.attributes.rowlines,i-1,'none');
      if(i&&['solid','dashed'].includes(border)){
        addStyle(cell,`border-top:.067em ${border} currentColor;`);
        cell.attributes['data-flashmath-rule']=border;
      }
      const column=entry(n.attributes.columnlines,j-1,'none');
      if(j&&['solid','dashed'].includes(column))addStyle(cell,`border-left:.067em ${column} currentColor;`);
      if(proof){
        cell.kind='mrow';cell.children=[node('mrow',cell.children,{},cell.start)];
        addStyle(cell,`display:inline-grid;justify-items:center;grid-row:${i+1};grid-column:${j+1};`);
      }
    }
    if(labeled){
      const empty=node('mtd',[],{},row.start),tag=label??node('mtd',[],{},row.start);
      if(label)tag.attributes['data-flashmath-label']=side;
      addStyle(tag,`text-align:${side};padding-${side==='right'?'left':'right'}:1em;`);
      row.children=side==='right'?[empty,...row.children,tag]:[tag,...row.children,empty];
      for(let j=0;j<row.children.length;j++){
        const cell=row.children[j],align=j===0?'left':j===columns+1?'right':cell.attributes.columnalign??entry(n.attributes.columnalign,j-1,'center');
        cell.kind='mrow';cell.attributes['data-flashmath-row']=String(i+1);
        addStyle(cell,`grid-row:${i+1};grid-column:${j+1};justify-self:${align==='left'?'start':align==='right'?'end':'center'};`);
      }
    }
  }
  // CSS table layout implements rowlines/frame; Core reserves the attributes.
  if(n.attributes.frame&&['solid','dashed'].includes(n.attributes.frame))addStyle(n,`border:.067em ${n.attributes.frame} currentColor;`);
  if(labeled){
    n.kind='mrow';n.children=n.children.flatMap(row=>row.children);
    n.attributes['data-flashmath-tags']=side;
    addStyle(n,`display:inline-grid;width:100%;grid-template-columns:minmax(max-content,1fr) repeat(${columns},max-content) minmax(max-content,1fr);align-items:baseline;`);
  }
  else if(proof){
    n.kind='mrow';n.children=n.children.flatMap(row=>row.children);
    addStyle(n,`display:inline-grid;grid-template-columns:repeat(${columns},max-content);math-style:compact;`);
  }else addStyle(n,'display:inline-table;border-collapse:collapse;');
  delete n.attributes.rowlines;delete n.attributes.columnlines;delete n.attributes.frame;
  return n;
}
