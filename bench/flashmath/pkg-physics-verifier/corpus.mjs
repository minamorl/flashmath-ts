const r = String.raw;
const physics = [
  // derivatives
  r`\dv{x}`, r`\dv{f}{x}`, r`\dv[2]{f}{x}`, r`\dv[n]{f}{x}`, r`\dv{x}(x^2+1)`, r`\dv{f}{x}(x^2)`, r`\dv*{f}{x}`, r`\dv*[3]{f}{x}`,
  r`\pdv{x}`, r`\pdv{f}{x}`, r`\pdv{f}{x}{y}`, r`\pdv[2]{f}{x}`, r`\pdv*{f}{x}{y}`, r`\pdv{f}{x}(a)`, r`\pdv{\qty(f+g)}{x}`, r`\pdv{f}{x}{y}(a)`,
  r`\fdv{F}{g}`, r`\fdv[2]{F}{g}`, r`\fdv{F}{g}(x)`, r`\var{x}`, r`\var(x)`, r`\dd{x}`, r`\dd[3]{x}`, r`\dd(x)`, r`\dd x`, r`\dd[2](x)`, r`\int \dd[3]{r}\, f`, r`\frac{\dd{y}}{\dd{x}}`,
  // quantities
  r`\qty(\frac{a}{b})`, r`\qty[\frac ab]`, r`\qty|x|`, r`\qty{x}`, r`\qty\big(x)`, r`\qty\Bigg[x]`, r`\qty\bigg|x|`, r`\qty\big{x}`, r`\qty x`, r`\qty`,
  r`\pqty{x}`, r`\bqty{x}`, r`\Bqty{x}`, r`\vqty{x}`, r`\pqty\big{x}`, r`\pqty*{\frac ab}`, r`\bqty*{x}`, r`\abs{x}`, r`\abs*{\frac ab}`, r`\abs\big{x}`, r`\abs{\abs{x}}`,
  r`\norm{x}`, r`\norm*{\frac12}`, r`\norm\Big{x}`, r`\order{x^2}`, r`\order*{x}`, r`\order\big{x}`, r`\eval{x}_0^1`, r`\eval(x^2)_0^1`, r`\eval[x|_0^1`, r`\eval*{x}_0^1`, r`\eval*(x|_0^1`, r`\eval x`,
  r`\comm{A}{B}`, r`\comm*{A}{B}`, r`\comm\big{A}{B}`, r`\acomm{A}{B}`, r`\acomm*{A}{B}`, r`\pb{A}{B}`, r`\pb\Big{A}{B}`,
  // Dirac
  r`\bra{\psi}`, r`\ket{\phi}`, r`\bra*{\psi}`, r`\ket*{\phi}`, r`\bra{a}\ket{b}`, r`\bra{a}\ket*{b}`, r`\bra*{a}\ket{b}`, r`\bra{a}\,\ket{b}`, r`\braket{a}{b}`, r`\braket{a}`, r`\braket*{a}{b}`, r`\ip{a}{b}`,
  r`\ketbra{a}{b}`, r`\op{a}`, r`\dyad{a}{b}`, r`\op*{a}{b}`, r`\ev{A}`, r`\ev{A}{\psi}`, r`\ev*{A}{\psi}`, r`\ev**{A}{\psi}`, r`\mel{a}{O}{b}`, r`\mel*{a}{O}{b}`, r`\mel**{a}{O}{b}`, r`\ket{\frac{\psi}{2}}`, r`\bra{\psi}\hat{H}\ket{\phi}`,
  // matrices
  r`\mqty(a&b\\c&d)`, r`\mqty[a&b\\c&d]`, r`\mqty|a&b\\c&d|`, r`\mqty{a&b\\c&d}`, r`\mqty*(a&b)`, r`\pmqty{a&b\\c&d}`, r`\Pmqty{a&b}`, r`\bmqty{a&b\\c&d}`, r`\vmqty{a&b\\c&d}`, r`\smqty(a&b\\c&d)`, r`\spmqty{a&b}`, r`\sbmqty{a}`, r`\svmqty{a}`, r`\sPmqty{a}`, r`\mdet{a&b\\c&d}`, r`\smdet{a}`,
  r`\imat{2}`, r`\mqty(\imat{3})`, r`\xmat{0}{2}{3}`, r`\xmat*{a}{2}{3}`, r`\xmat*{a}{1}{3}`, r`\xmat*{a}{3}{1}`, r`\xmat*{a}{1}{1}`, r`\zmat{2}{2}`, r`\pmat{0}`, r`\pmat{1}`, r`\pmat{2}`, r`\pmat{3}`, r`\pmat{x}`, r`\pmat{y}`, r`\pmat{z}`, r`\mqty(\pmat{y})`,
  r`\dmat{1,2,3}`, r`\admat{1,2,3}`, r`\mqty(\dmat{1,2})`, r`\pmqty{\admat{1,2}}`, r`\pmqty{\imat{2}}`, r`\bmqty{\xmat*{x}{2}{2}}`, r`\dmat{{a,b},c}`, r`\mqty(\dmat{\mqty{a&b\\c&d},e})`,
  // vectors
  r`\vb{a}`, r`\vb*{a}`, r`\vb{\alpha}`, r`\vb*{\alpha}`, r`\vb{\Omega}`, r`\vb{a+b}`, r`\vb{1}`, r`\vb{ab}`, r`\vb{\mathrm{a}}`, r`\va{a}`, r`\va*{a}`, r`\vu{x}`, r`\vu*{x}`, r`\va{\vb{x}}`, r`\vb{\hat{x}}`, r`\vdot`, r`a\vdot b`, r`a\cross b`, r`a\cp b`,
  r`\grad f`, r`\grad{f}`, r`\grad(f)`, r`\grad[f]`, r`\grad{f+g}`, r`\div{E}`, r`\div(E)`, r`\div[E]`, r`\curl{B}`, r`\curl(B)`, r`\laplacian{\phi}`, r`\laplacian(\phi)`, r`\curl\curl E`, r`\grad\cross A`, r`\grad\vdot\vb{A}`, r`\div\grad f`, r`\curl\grad f`,
  // functions
  r`\sin(x)`, r`\sin[2](x)`, r`\sin[2]x`, r`\cos[n](\theta)`, r`\exp(x)`, r`\log(x)`, r`\ln[2](x)`, r`\tr A`, r`\tr(A)`, r`\Tr(\rho)`, r`\trace(A)`, r`\erf(x)`, r`\det(A)`, r`\Pr(A)`, r`\Re(z)`, r`\Im{z}`, r`\Re{z}`, r`\Res(f)`, r`\Res[f]`, r`\Res{f}`, r`\pv{\int f}`, r`\PV{\int f}`, r`\sine(x)`, r`\rank(A)`, r`\arctan[2](x)`,
  r`\qq{if}`, r`\qq*{if}`, r`\qcc`, r`\qif`, r`\qthen`, r`\qand`, r`\qc`, r`\qcc*`, r`\qfor*`, r`\flatfrac{a}{b}`, r`\real`, r`\imaginary`, r`\divsymbol`,
  // combinations
  r`\dv{\vb{x}}{t} = \vb{v}`, r`i\hbar\pdv{\psi}{t} = \hat H\ket{\psi}`, r`\abs{\braket{a}{b}}^2`, r`\norm{\grad f}^2`, r`\qty(\pdv{f}{x})^2`, r`\mqty(\dv{x}{t} \\ \dv{y}{t})`, r`\ev{\comm{A}{B}}{\psi}`, r`\bra{\psi}\pdv{t}\ket{\psi}`, r`\sum_i \ket{i}\bra{i}`, r`\curl\vb{E} = -\pdv{\vb{B}}{t}`, r`\oint \vb{E}\vdot\dd{\vb{l}}`, r`\int_0^1 \dd{x} \abs{f(x)}^2`, r`\exp(\qty[\frac{a}{b}])`, r`\sin[2](\abs{x})`, r`\qty\Big(\sum_i \abs{x_i})`, r`\order{\norm{x}^2}`, r`\sin(\cos(\tan(x)))`, r`\mel{\psi}{\grad}{\phi}`, r`\mqty(\abs{a}&\norm{b}\\ \ket{c}&\bra{d})`, r`\dv[2]{x}{t} + \omega^2 x = 0`, r`\grad\qty(\frac{1}{r})`, r`\vb{F} = q\qty(\vb{E} + \vb{v}\cross\vb{B})`, r`\pdv{x}\qty(\pdv{f}{y})`, r`\eval{\dv{f}{x}}_{x=0}`, r`\Tr(\op{\psi})`, r`\pmqty{\cos\theta & -\sin\theta \\ \sin\theta & \cos\theta}`, r`\vmqty{\vu{x}&\vu{y}\\a&b}`, r`\ket{\vb{k}}\otimes\ket{\uparrow}`, r`\comm{\hat x}{\hat p} = i\hbar`, r`e^{\qty(a+b)}`, r`x_{\abs{y}}`, r`\frac{\abs{x}}{\norm{y}}`, r`\sqrt{\abs{x}}`, r`\sum_{\ket{i}}\dd{x}`,
  // base syntax under the physics character handlers
  r`\sqrt[3]{x}`, r`\qty(\sqrt[3]{x})`, r`\qty[\sqrt[3]{x}]`, r`\left(a\right)`, r`\left[a\right]`, r`\bigl(x\bigr)`, r`(a|b)`, r`[x)`, r`x_{(1)}`, r`\begin{array}{c}(a)\\ [b]\end{array}`, r`\qty(a[b)c]`, r`\qty[(])`, r`\qty(\left(\right))`, r`\qty(\frac{a)}{b})`, r`\qty((a)(b))`, r`\qty|a(b)|`, r`\qty(a|b)`, r`\mqty(a(b)&c)`, r`\frac ab`, r`\mathbf{x}\sin x`, r`\matrix{a&b}`, r`\def\f(#1){#1}\f(x)`, r`\def\g[#1]{#1}\g[x]`, r`\newcommand{\h}[2][y]{#1#2}\h[a]{b}`, r`\newcommand{\h}[1]{\abs{#1}}\h{x}`, r`\def\k{\ket}\k{a}`, r`\def\p{\qty}\p(x)`, r`\mathrm{\vb{x}}`, r`\vb{\mathbf{x}}`,
  // errors
  r`\abs x`, r`\qty(`, r`\qty[x`, r`\mqty(a`, r`\xmat{a}{b}{c}`, r`\imat{x}`, r`\dv`, r`\comm{A}`, r`\comm A`, r`\bra`, r`\ket`, r`\pmqty`, r`\qty)`, r`\norm x`, r`\mel{a}{b}`,
];
const braket = [
  r`\bra{a}`, r`\ket{b}`, r`\Bra{\frac ab}`, r`\Ket{\frac ab}`, r`\ketbra{a}{b}`, r`\Ketbra{\frac ab}{c}`, r`\braket{a|b}`, r`\braket{a|b|c}`, r`\Braket{a|b|c}`, r`\Braket{\frac ab|c}`, r`\set{x|x>0}`, r`\Set{x|\frac{x}{2}>0}`, r`\Set{a|b|c}`, r`\set{a|b|c}`, r`\braket{a||b}`, r`\Braket{a||b}`, r`\set{x\|y}`, r`\Braket{a\|b}`, r`|x|`, r`\braket{\braket{a|b}|c}`, r`\Braket{\Braket{a|b}|c}`, r`\Braket{\left(a|b\right)}`, r`\Set{\sqrt{x|y}}`, r`\Braket{a|b}^2`, r`x_{\braket{a|b}}`, r`\braket a`, r`\Set x`, r`\set{}`, r`\Braket{}`, r`\Braket{a|\mathrm{b}|c}`, r`\frac{\Braket{a|b}}{\set{x|y}}`, r`\Braket{|}`, r`\Braket{a|}`,
];
const cancel = [
  r`\cancel{x}`, r`\bcancel{x}`, r`\xcancel{x}`, r`\cancelto{0}{x}`, r`\cancel{x+y}`, r`\cancel[mathcolor=red]{x}`, r`\bcancel[mathbackground=yellow]{a}`, r`\xcancel[color=red,data-thickness=2px]{a}`, r`\cancelto[mathcolor=blue]{0}{x}`, r`\cancelto{\infty}{\frac ab}`, r`\frac{\cancel{a}b}{\cancel{a}c}`, r`\cancel{\cancel{x}}`, r`\cancel x`, r`\cancel{}`, r`\sum\cancel{x}_i`, r`\cancelto{0}{x}^2`, r`\cancel[data-padding=0]{x}`, r`\cancel[foo=1]{x}`, r`\cancelto{0}x`, r`\cancelto0x`, r`\cancel`, r`\bcancel{\frac{a}{b}}`, r`\cancel{x}^2`, r`x^{\xcancel{2}}`,
];
const bbox = [
  r`\bbox{x}`, r`\bbox[red]{x}`, r`\bbox[#ff0]{x}`, r`\bbox[#FFCC00]{x}`, r`\bbox[3px]{x}`, r`\bbox[.5em]{x}`, r`\bbox[1.5em]{x}`, r`\bbox[2mu]{x}`, r`\bbox[1in]{x}`, r`\bbox[red,5px]{x}`, r`\bbox[5px,red]{x}`, r`\bbox[5px,border:2px solid red]{x}`, r`\bbox[yellow,5px,border: 1px solid]{x+y}`, r`\bbox[color:red]{x}`, r`\bbox[ 5pt , blue ]{x}`, r`\bbox[]{x}`, r`\bbox[-1px]{x}`, r`\bbox[5]{x}`, r`\bbox[5pt]{\frac ab}`, r`\bbox[#12]{x}`, r`\bbox[red;]{x}`, r`x^{\bbox[red]{2}}`, r`\bbox[1.px]{x}`, r`\bbox[0pt]{x}`, r`\bbox[5PX]{x}`, r`\bbox[background:red;padding:2px]{x}`, r`\bbox[url(x)]{y}`, r`\bbox[red, 2pt, color:blue]{x}`, r`\bbox x`, r`\bbox[red]x`, r`\bbox`, r`\bbox[1.25em]{x}`, r`\bbox[0.1em]{x}`,
];
const enclose = [
  ...'longdiv actuarial phasorangle radical box roundedbox circle left right top bottom updiagonalstrike downdiagonalstrike verticalstrike horizontalstrike updiagonalarrow northeastarrow madruwb'.split(' ').map(n => r`\enclose{` + n + `}{x+1}`),
  r`\enclose{box circle}{x}`, r`\enclose{box,circle}{x}`, r`\enclose{box}[mathcolor=red]{x}`, r`\enclose{box}[mathbackground=yellow]{x}`, r`\enclose{box}[data-thickness=2px]{x}`, r`\enclose{box}[data-padding=1px]{x}`, r`\enclose{northeastarrow}[data-arrowhead="5"]{x}`, r`\enclose{box}[color=blue]{x}`, r`\enclose{box}[background=red]{x}`, r`\enclose{box}[foo=bar,mathcolor=red]{x}`, r`\enclose{}{x}`, r`\enclose{box}{}`, r`\enclose{box}x`, r`\enclose{box}[style=x]{x}`, r`\enclose{box}[mathcolor="red"]{x}`, r`\enclose{box}[mathcolor={red}]{x}`, r`\enclose{circle}{\frac ab}`, r`\enclose{box}{\enclose{circle}{x}}`, r`\enclose{unknown}{x}`, r`\enclose box{x}`, r`\enclose`,
];
const centernot = [
  r`\centernot{=}`, r`\centernot{\in}`, r`\centernot\in`, r`\centernot{\longrightarrow}`, r`\centernot\to`, r`a\centernot\Rightarrow b`, r`\centernot{x}`, r`\centernot{\sum}`, r`\centernot{\mathop{x}}`, r`\centernot{\mathbin{+}}`, r`\centernot+`, r`\centerOver{=}{/}`, r`\centerOver{\rightarrow}{x}`, r`\centerOver{ab}{c}`, r`\centerOver{\frac ab}{c}`, r`a \centernot{\parallel} b`, r`\centernot{}`, r`\centernot{(}`, r`\centernot`, r`\centerOver{a}`, r`A\centernot{\sim}B`, r`\centerOver{\mathrel{a}}{b}`,
];
const mix = ['base', 'newcommand', 'physics', 'cancel', 'bbox', 'enclose', 'centernot'];
const mixed = [
  r`\cancel{\dv{f}{x}}`, r`\bbox[red]{\ket{a}}`, r`\enclose{box}{\abs{x}}`, r`\bbox[5px]{\mqty(a&b)}`, r`\cancelto{0}{\pdv{f}{x}}`, r`\centernot{\grad}`, r`\bbox[yellow,2pt]{\cancel{\vb{x}}}`, r`\enclose{circle}{\qty(x)}`, r`\qty(\cancel{x})`, r`\mqty(\cancel{a}&\bbox[red]{b})`, r`\vb{\cancel{x}}`, r`\vb{\bbox[red]{x}}`, r`\centerOver{\vb{x}}{\ket{y}}`,
];
const both = ['base', 'physics', 'braket'];
const pb = [r`\bra{a}`, r`\ket{a}`, r`\braket{a}{b}`, r`\braket{a|b}`, r`\Braket{a|b}`, r`\set{a|b}`, r`\qty(a|b)`, r`\Set{\qty(a|b)|c}`, r`\qty|a|`];
const pb2 = ['base', 'braket', 'physics'];
export default [
  ...physics.map(tex => ({tex, packages: ['base', 'newcommand', 'physics'], group: 'physics'})),
  ...braket.map(tex => ({tex, packages: ['base', 'braket'], group: 'braket'})),
  ...cancel.map(tex => ({tex, packages: ['base', 'cancel'], group: 'cancel'})),
  ...bbox.map(tex => ({tex, packages: ['base', 'bbox'], group: 'bbox'})),
  ...enclose.map(tex => ({tex, packages: ['base', 'enclose'], group: 'enclose'})),
  ...centernot.map(tex => ({tex, packages: ['base', 'centernot'], group: 'centernot'})),
  ...mixed.map(tex => ({tex, packages: mix, group: 'mixed'})),
  ...pb.map(tex => ({tex, packages: both, group: 'physics+braket'})),
  ...pb.map(tex => ({tex, packages: pb2, group: 'braket+physics'})),
];
