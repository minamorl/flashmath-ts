import {fontArgument} from './bbm.js';
import type {TexPackage} from './types.js';
export default {name:'dsfont',commands:{mathds:{execute(p){fontArgument(p,(p.options.texOptions?.dsfont as {sans?:boolean})?.sans?'-ds-ss':'-ds-rm');}}},environments:{},options:['dsfont'],configurationModules:['input/tex/dsfont/DsfontConfiguration.js']} satisfies TexPackage;
