import {fixtures} from './fixtures.mjs';
fixtures('color');
import {compare,assert,test,subject} from './fixtures.mjs';
import {createMathMLParser,toMathMLString} from '../../dist/index.js';
compare('color',[
  String.raw`a{\color{red} x+\color{blue} y}z`,
  String.raw`\colorbox{red}{left $x+y$ right}`,
  [String.raw`\fcolorbox{red}{blue}{x}`,{texOptions:{color:{padding:'2em',borderWidth:'1px'}}}],
  String.raw`\color[rgb]{2,0,0}x`,
  String.raw`\color[RGB]{256,0,0}x`,
  String.raw`\color[gray]{-1}x`,
  String.raw`\color{red;blue}x`,
]);
test('color definitions persist within a session and isolate independent sessions',()=>{
  const p=createMathMLParser({packages:['base','color']});p.parse(String.raw`\definecolor{mine}{rgb}{1,0,0}`);
  assert.match(toMathMLString(p.parse(String.raw`\color{mine}x`)),/mathcolor="#ff0000"/);
  assert.match(subject(String.raw`\color{mine}x`,{packages:['base','color']}),/mathcolor="mine"/);
});
