import {scopeStyle} from './color.js';
import type {TexPackage,TexCommand} from './types.js';
export default {name:'fontsizev3',commands:Object.fromEntries(Object.entries({tiny:.5,Tiny:.6,scriptsize:.7,small:.85,normalsize:1,large:1.2,Large:1.44,LARGE:1.73,huge:2.07,Huge:2.49}).map(([name,size])=>[name,{execute(p){scopeStyle(p,{mathsize:size+'em'});}} satisfies TexCommand])),environments:{},configurationModules:['input/tex/fontsizev3/FontSizeV3Configuration.js']} satisfies TexPackage;
