// Lengths are UTF-16 code units; every fixture is ASCII.
export const limits = {
  default: {mathjax: {}, temml: {}},
  raised: {
    mathjax: {maxBuffer: 1024 * 1024, maxMacros: 100000},
    temml: {maxExpand: 100000},
  },
};

export function makeCases() {
  const cases = [16, 64, 256, 1024].map(length => {
    const unit = String.raw`x^2+\frac{1}{y}+`;
    const body = unit.repeat(Math.floor((length - 1) / unit.length)) + 'x';
    return {id: `ordinary-${length}`, family: 'ordinary', tex: body.padEnd(length)};
  });
  const definition = String.raw`\newcommand{\a}{x}`;
  for (const n of [64, 256, 768, 1536, 4096]) {
    for (const padding of [0, 4096, 32768]) {
      const pair = `n${n}-p${padding}`;
      const tail = ' '.repeat(padding) + 'y';
      cases.push({id: `macro-${pair}`, family: 'macro', n, padding, pair,
        tex: definition + String.raw`\a `.repeat(n) + tail});
      // Same input length and emitted tokens, without macro definition/expansion.
      cases.push({id: `inline-${pair}`, family: 'inline', n, padding, pair,
        tex: ' '.repeat(definition.length) + 'x  '.repeat(n) + tail});
    }
  }
  // Exercise the other two requested source sites independently of the main grid.
  cases.push({id: 'template-probe', family: 'probe',
    tex: String.raw`\def\a#1!{#1}\a x!+\a y!`});
  cases.push({id: 'environment-probe', family: 'probe',
    tex: String.raw`\newenvironment{zz}{x+}{+y}\begin{zz}z\end{zz}`});
  return cases.map(c => ({...c, length: c.tex.length}));
}

export function expectedError(c, engine, limit) {
  if (engine === 'temml' && c.id === 'environment-probe') return 'unsupported';
  if (limit === 'raised' || c.family !== 'macro') return null;
  // The first expansion removes the definition and the first macro token.
  if (engine.startsWith('mathjax') && c.n * 3 + c.padding - 1 > 5120) {
    return 'buffer';
  }
  if (c.n > 1000) return 'expansions';
  return null;
}
