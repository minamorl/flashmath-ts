import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('physics');
compareCases('physics', [
  String.raw`\grad\quad x`, String.raw`\grad\otimes x`, String.raw`\sin x\cos y`,
  String.raw`\vb{\va{x}}`, String.raw`\qty(\qty[x])`, String.raw`\bra A\ket* B`,
  String.raw`\exp(1+\cos(x))`, String.raw`\qty(\left(x\right))`,
  String.raw`\mqty{1+\qty(x)&2}`, String.raw`\pdv[2]{f}{x}(z)`,
  String.raw`\let\k\ket\bra{a}\k{b}`,
  [String.raw`\dd[2]{x}+\grad{x}`, {display: false, texOptions: {physics: {italicdiff: true, arrowdel: true}}}],
]);
