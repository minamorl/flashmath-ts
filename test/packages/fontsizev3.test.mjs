import {compare} from './fixtures.mjs';
compare('fontsizev3',Object.keys({tiny:0,Tiny:0,scriptsize:0,small:0,normalsize:0,large:0,Large:0,LARGE:0,huge:0,Huge:0}).map(name=>[String.raw`a{\${name} x+y}b`,{configurationModules:['input/tex/fontsizev3/FontSizeV3Configuration.js']}]));
