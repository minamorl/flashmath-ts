import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('cancel');
compareCases('cancel', [String.raw`\cancelto{0}{x}^2`, String.raw`\cancelto{0}{x}_2`,
  String.raw`\cancelto{0}{x}_2^3`, String.raw`\cancelto{0}{x}^2_3`,
  String.raw`\cancel`, String.raw`\bcancel`, String.raw`\xcancel`, String.raw`\cancelto`, String.raw`\cancelto{0}`,
  String.raw`\cancel[mathcolor="red"]{x}`, String.raw`\cancel[mathcolor={{red}}]{x}`]);
compareCases('cancel', [[String.raw`\cancel{\qty(x)}`, {packages: ['base','physics','cancel']}]]);
