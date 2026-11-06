import {fixtures} from './fixtures.mjs';
fixtures('bboldx');
import {compare} from './fixtures.mjs';
compare('bboldx',[
  [String.raw`\mathbb{AaΓγ}\mathbfbb{AaΓγ}\bbGamma\bfbbgamma`,{texOptions:{bboldx:{light:true}}}],
  [String.raw`\mathbb{AaΓγ}\mathbfbb{AaΓγ}\bbGamma\bfbbgamma`,{texOptions:{bboldx:{bfbb:true}}}],
]);
