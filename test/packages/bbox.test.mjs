import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('bbox');
compareCases('bbox', [String.raw`\bbox[2px,3px]{x}`, String.raw`\bbox[red,blue]{x}`,
  String.raw`\bbox[border:solid,border:dashed]{x}`, String.raw`\bbox[?]{x}`]);
