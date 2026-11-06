import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('centernot');
compareCases('centernot', [String.raw`\centerOver{\sin x}{y}`, String.raw`\centernot{a=b}`,
  String.raw`\centernot{\mathrel{a}}`, String.raw`\centerOver{\sin^2 x}{y}`, String.raw`\centernot{{a=b}}`]);
