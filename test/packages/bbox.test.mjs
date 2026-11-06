import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('bbox');
compareCases('bbox', [String.raw`\bbox[2px,3px]{x}`, String.raw`\bbox[red,blue]{x}`,
  String.raw`\bbox[border:solid,border:dashed]{x}`, String.raw`\bbox[?]{x}`]);
compareCases('bbox', [String.raw`\bbox`, String.raw`\bbox[red]`, String.raw`\bbox{a`,
  String.raw`\bbox[.5em]{x}`, String.raw`\bbox[5.em]{x}`, String.raw`\bbox[#AbF]{x}`, String.raw`\bbox[#abcdef]{x}`]);
compareCases('bbox', [[String.raw`\bbox[red]{\qty(x)}`, {packages: ['base','physics','bbox']}]]);
