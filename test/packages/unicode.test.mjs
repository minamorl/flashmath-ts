import {fixtures} from './fixtures.mjs';
fixtures('unicode');
import {compare} from './fixtures.mjs';
compare('unicode',['U+x',String.raw`\U{41}+U+\char65`,String.raw`\unicode[serif;bad]{65}`,String.raw`\unicode{xyz}`]);
