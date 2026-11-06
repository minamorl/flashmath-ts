import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('enclose');
compareCases('enclose', [String.raw`\enclose{box,circle}[color={red},nothing=x]{a+b}`]);
compareCases('enclose', [String.raw`\enclose{longdiv}{x}`, String.raw`\enclose{circle}[mathcolor="red"]{x}`,
  String.raw`\enclose{circle}[mathcolor={{red}}]{x}`, String.raw`\enclose{circle}[mathcolor="red,blue"]{x}`,
  String.raw`\enclose`, String.raw`\enclose{circle}`]);
compareCases('enclose', [[String.raw`\enclose{circle}{\qty(x)}`, {packages: ['base','physics','enclose']}]]);
