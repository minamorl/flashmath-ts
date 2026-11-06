import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('braket');
compareCases('braket', [
  String.raw`\braket{x||y}`, String.raw`\Set{{x|y}|z}`, String.raw`\Braket{{x|y}|z}`,
  String.raw`\braket{\frac{x|y}{z}}`, String.raw`\Braket{a\over b|c\over d}`,
  String.raw`\braket{\def\a{x}\a|y}`,
]);
