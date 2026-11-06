import {readColor} from './color.js';
import type {TexPackage,TexCommand} from './types.js';
const commands:Record<string,TexCommand>={};
for(const name of ['cellcolor','rowcolor','columncolor'])commands[name]={execute(p){
  const color=readColor(p),t=p.f.table??p.error(`Unsupported use of \\${name}`);
  const colors=t.colors??={cell:'',row:'',columns:[],rowIndex:0};
  if(name==='columncolor'){
    if(t.rows.length&&colors.columns[t.cells.length]!==color)p.error(`\\${name} must be in the top row or preamble`);
    colors.columns[t.cells.length]=color;if(p.optional())p.optional();
  }else if(name==='rowcolor'){
    if(p.f.nodes.length||t.cells.length)p.error(`\\${name} must be at the beginning of a row`);
    colors.row=color;colors.rowIndex=t.rows.length;
  }else colors.cell=color;
}};
export default {name:'colortbl',priority:10,commands,environments:{},options:['color'],configurationModules:['input/tex/colortbl/ColortblConfiguration.js']} satisfies TexPackage;
