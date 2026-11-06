/** Independent common-input corpus, not a selection of passing conformance rows. */
export default [
 'x+1', 'x^2+y^2=z^2', String.raw`\alpha+\beta=\gamma`,
 String.raw`\frac{a+b}{c+d}`,String.raw`\sqrt{x^2+1}`,String.raw`\sqrt[3]{x+y}`,
 String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
 String.raw`\sum_{i=1}^{n}i^2`,String.raw`\left(\frac{a}{b}\right)^2`,
 String.raw`\int_0^1 x^2 dx`,String.raw`\begin{array}{cc}a&b\\c&d\end{array}`,
 String.raw`\newcommand{\pair}[2]{(#1,#2)}\pair{x}{y}`
];
