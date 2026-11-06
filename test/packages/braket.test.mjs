import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('braket');
compareCases('braket', [
  String.raw`\braket{x||y}`, String.raw`\Set{{x|y}|z}`, String.raw`\Braket{{x|y}|z}`,
  String.raw`\braket{\frac{x|y}{z}}`, String.raw`\Braket{a\over b|c\over d}`,
  String.raw`\braket{\def\a{x}\a|y}`,
  ...['bra', 'ket', 'braket', 'Braket', 'set', 'Set', 'Ketbra'].map(name => '\\' + name),
  ...[['base','physics','braket'], ['base','braket','physics'], ['base',['physics',2],'braket']]
    .flatMap(packages => [String.raw`\qty|a|`, String.raw`\qty(a|b)`, String.raw`\Braket{x|y}`, String.raw`\bra{a}\ket{b}`]
      .map(tex => [tex, {packages}])),
]);
