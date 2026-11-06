import {packageFixtures, compareCases} from './fixture-check.mjs';
packageFixtures('physics');
compareCases('physics', [
  String.raw`\grad\quad x`, String.raw`\grad\otimes x`, String.raw`\sin x\cos y`,
  String.raw`\vb{\va{x}}`, String.raw`\qty(\qty[x])`, String.raw`\bra A\ket* B`,
  String.raw`\exp(1+\cos(x))`, String.raw`\qty(\left(x\right))`,
  String.raw`\mqty{1+\qty(x)&2}`, String.raw`\pdv[2]{f}{x}(z)`,
  String.raw`\let\k\ket\bra{a}\k{b}`,
  [String.raw`\dd[2]{x}+\grad{x}`, {display: false, texOptions: {physics: {italicdiff: true, arrowdel: true}}}],
  ...['dv','bra','ket','comm','pqty','pdv','fdv','vb','va','mel','mqty','xmat','imat'].map(name => '\\' + name),
  String.raw`\comm{a}`, String.raw`\dv{a`, String.raw`\dv}`, String.raw`{\ket}`,
  String.raw`\sqrt{\qty(x)}`, String.raw`\sqrt{\abs{x}}`, String.raw`\sqrt{\ket{a}}`,
  String.raw`\sqrt{\mqty(a)}`, String.raw`\sqrt{\left|x\right|}`,
  String.raw`\mqty(a`, String.raw`\mqty[a`, String.raw`\mqty|a`,
]);
