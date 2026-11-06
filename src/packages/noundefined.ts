import {K} from '../ast.js';
import type {TexPackage} from './types.js';
export default {
  name: 'noundefined', commands: {}, environments: {}, options:['noundefined'],
  configurationModules: ['input/tex/noundefined/NoUndefinedConfiguration.js'],
  undefinedCommand(p, name) {
    const options = {color:'red', background:'', size:'', ...(p.options.texOptions?.noundefined as object)};
    const attrs:Record<string,string> = {};
    for (const key of ['color','background','size'] as const) if(options[key]) attrs['math'+key] = options[key];
    p.append(p.node(K.mtext, [], '\\'+name, attrs));
  },
} satisfies TexPackage;
