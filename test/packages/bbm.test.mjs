import {fixtures} from './fixtures.mjs';
fixtures('bbm');
import {compare} from './fixtures.mjs';
compare('bbm',[String.raw`x+\mathbbm{A12+\frac{b}{c}}+y`,String.raw`{\mathversion{bold}\mathbbm{A}}\mathbbm{B}`]);
