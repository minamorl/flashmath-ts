// Deliberately includes short/wide/tall/nested content, not only fixture inputs.
export const cases=[];
const add=(group,tex,packages=[],extra={})=>cases.push({id:`${group}-${cases.filter(c=>c.group===group).length+1}`,group,tex,options:{packages:['base','newcommand',...packages],display:true,...extra}});
export const notations=['top','right','bottom','left','actuarial','madruwb','box','roundedbox','circle','longdiv','radical','phasorangle','updiagonalstrike','downdiagonalstrike','horizontalstrike','verticalstrike','uparrow','downarrow','leftarrow','rightarrow','updownarrow','leftrightarrow','updiagonalarrow','northeastarrow','southeastarrow','northwestarrow','southwestarrow','northeastsouthwestarrow','northwestsoutheastarrow'];
for(const notation of notations)for(const body of ['x',String.raw`a+b+c`,String.raw`\frac{x^2}{y_0}`])add('enclose',`\\enclose{${notation}}{${body}}`,['enclose']);
for(const name of ['cancel','bcancel','xcancel','cancelto'])for(const body of ['x',String.raw`a+b+c`,String.raw`\frac{x}{y}`])add('cancel',`\\${name}${name==='cancelto'?'{0}':''}{${body}}`,['cancel']);
for(const tex of [String.raw`\boxed{x+y}`,String.raw`\boxed{\frac{x}{y}}`,String.raw`\bbox[3px,border:2px solid red]{x+y}`,String.raw`\bbox[.3em,yellow,border:1px solid blue]{\frac{x}{y}}`,String.raw`\enclose{box,circle,updiagonalstrike}{x+y}`,String.raw`\enclose{box}[color=red,background=yellow,data-padding=.4em,data-thickness=.1em]{x+y}`])add('frames',tex,['ams','bbox','enclose']);
for(const side of ['right','left'])for(const tex of [String.raw`x=y\tag{A}`,String.raw`\frac{x}{y}=z\tag{long tag}`,String.raw`\begin{equation}a+b=c\end{equation}`,String.raw`\begin{align}x&=y\\a+b&=c\end{align}`,String.raw`\begin{align}x&=y\notag\\a+b&=c\end{align}`,String.raw`\begin{gather}x=y\\\frac{a}{b}=c\end{gather}`,String.raw`\begin{align}x&=y&z&=w\\a&=b&c&=d\end{align}`])add('tags',tex,['ams'],{tags:'ams',tagSide:side,texOptions:{tags:'ams',tagSide:side}});
for(const line of ['singleLine','dashedLine','noLine'])for(const up of ['',String.raw`\rootAtTop`])for(const wide of [false,true])add('proofs',String.raw`\begin{prooftree}`+up+String.raw`\AxiomC{$A$}\AxiomC{$B$}`+`\\${line}`+(wide?String.raw`\RightLabel{rule}\BinaryInfC{$A\land B$}\UnaryInfC{$C$}`:String.raw`\BinaryInfC{$C$}`)+String.raw`\end{prooftree}`,['bussproofs']);
for(const body of ['=',String.raw`\Longrightarrow`,String.raw`a=b`,String.raw`\frac{a}{b}`]){
  add('overlap',`\\centernot{${body}}`,['centernot']);
  add('overlap',`\\centerOver{${body}}{*}`,['centernot']);
  add('overlap',`\\centerOver{${body}}{\\frac{1}{2}}`,['centernot']);
}
for(const variant of ['mathbf','mathit','mathcal','mathscr','mathfrak','mathbb','mathsf','mathtt'])for(const body of ['ABCxyz','0123',String.raw`\Gamma\alpha\theta`])add('variants',`\\${variant}{${body}}`,['ams']);
for(const tex of [String.raw`\vb{a}`,String.raw`\vb*{a}`,String.raw`\vb{\alpha}`,String.raw`\vb*{\alpha}`,String.raw`\vb{AB}`,String.raw`\order{x^2}`,String.raw`\pv{x}`,String.raw`\order{\frac{1}{n}}`])add('physics',tex,['physics']);
for(const tex of [String.raw`\ce{A ->[heat] B}`,String.raw`\ce{A <=>[catalyst][heat] B}`,String.raw`\ce{A <=>> B}`,String.raw`\ce{A <<=> B}`,String.raw`\ce{A\bond{~-}B}`,String.raw`\ce{A\bond{~--}B}`,String.raw`\ce{A\bond{-~-}B}`,String.raw`\ce{^{235}_{92}U}`,String.raw`\ce{2H2 + O2 -> 2H2O}`,String.raw`\pu{9.81 m/s^2}`])add('chemistry',tex,['mhchem']);
for(const tex of ['x+y=z',String.raw`\frac{a+b}{c+d}`,String.raw`\sqrt{x^2+y^2}`,String.raw`\sum_{n=0}^\infty\frac{1}{n!}`,String.raw`\int_0^1x^2\,dx`,String.raw`\left(\frac{x}{y}\right)`,String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,String.raw`\overline{x+y}`,String.raw`\underbrace{x+y}_{z}`,String.raw`x^{y^z}`])add('core',tex,['ams']);

// Verifier regressions, including labelled/wide arrows and label-only rules.
for(const tex of [String.raw`\ce{A <=>>[long catalyst label][heat] B}`,String.raw`\ce{A <<=>[heat][long catalyst label] B}`,String.raw`\ce{A\bond{~-}B\bond{~--}C\bond{-~-}D}`])add('chemistry',tex,['mhchem']);
for(const up of ['',String.raw`\rootAtTop`])for(const side of ['LeftLabel','RightLabel'])add('proofs',String.raw`\begin{prooftree}`+up+String.raw`\AxiomC{$A$}\AxiomC{$B$}\noLine`+`\\${side}{rule}`+String.raw`\BinaryInfC{$A\land B$}\end{prooftree}`,['bussproofs']);

// Independent polish regressions, exercised in the actual browser as well.
for(const tex of [String.raw`\begin{array}{ll}a&b\\1&2\end{array}`,String.raw`x+7\tag{$*$}`,String.raw`x+7\tag{$\dagger$}`,String.raw`\mathop{\mathrm{ab}}x`,String.raw`\mathop{\mathbf{X}}_7x`,String.raw`\mathop{\mathrm{ess\,sup}}x`])add('polish',tex,['ams']);
add('polish','\\ce{H'.repeat(8)+'O'+'}'.repeat(8),['mhchem']);
add('polish',String.raw`\boldsymbol{\alpha+\Gamma+x^2+\mathit{B}}`,['boldsymbol']);
add('polish',String.raw`\verb|x { y % z|+q_7`,['verb']);

// Initial-operator regressions: preserve the exact MathJax tree and browser path.
for(const tex of [String.raw`\begin{multlined}a+b\\+c\end{multlined}`,String.raw`\begin{multlined}[t]a+b\\+c\end{multlined}`,String.raw`\begin{multlined}a_7\\\,+c_5\end{multlined}`])add('edge',tex,['ams','mathtools']);
for(const tex of [String.raw`\begin{aligned}\ce{A &-> B}\end{aligned}`,String.raw`\begin{align}\ce{A &= B}\end{align}`])add('edge',tex,['ams','mhchem']);
