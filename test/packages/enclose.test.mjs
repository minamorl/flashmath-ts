import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('enclose');
compareCases('enclose', [String.raw`\enclose{box,circle}[color={red},nothing=x]{a+b}`]);
