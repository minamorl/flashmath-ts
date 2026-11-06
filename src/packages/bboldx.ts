// Symbol data adapted from MathJax 4.1.3 BboldxMappings.ts, Apache-2.0.
// Copyright The MathJax Consortium; see ../LICENSE.MathJax.
import {K} from '../ast.js';
import type {Parser} from '../parser.js';
import type {TexPackage,TexCommand} from './types.js';
import {fontArgument} from './bbm.js';
import {scan} from '../scanner.js';
const maps: [string,Record<string,string>][]=[
  [
    "bboldx-mathchar0miNormal",
    {
      "bbGamma": "Γ",
      "bbDelta": "∆",
      "bbTheta": "Θ",
      "bbLambda": "Λ",
      "bbXi": "Ξ",
      "bbPi": "Π",
      "bbSigma": "Σ",
      "bbUpsilon": "Υ",
      "bbPhi": "Φ",
      "bbPsi": "Ψ",
      "bbOmega": "Ω",
      "bbalpha": "α",
      "bbbeta": "β",
      "bbgamma": "γ",
      "bbdelta": "δ",
      "bbepsilon": "ε",
      "bbzeta": "ζ",
      "bbeta": "η",
      "bbtheta": "θ",
      "bbiota": "ι",
      "bbkappa": "κ",
      "bblambda": "λ",
      "bbmu": "µ",
      "bbnu": "ν",
      "bbxi": "ξ",
      "bbpi": "π",
      "bbrho": "ρ",
      "bbsigma": "σ",
      "bbtau": "τ",
      "bbupsilon": "υ",
      "bbphi": "φ",
      "bbchi": "χ",
      "bbpsi": "ψ",
      "bbomega": "ω",
      "bbdotlessi": "ı",
      "bbdotlessj": "ȷ"
    }
  ],
  [
    "bboldx-delimiterNormal",
    {
      "bbLparen": "(",
      "bbRparen": ")",
      "bbLbrack": "[",
      "bbRbrack": "]",
      "bbLangle": "〈",
      "bbRangle": "〉"
    }
  ],
  [
    "bboldx-mathchar0miBold",
    {
      "bfbbGamma": "Γ",
      "bfbbDelta": "∆",
      "bfbbTheta": "Θ",
      "bfbbLambda": "Λ",
      "bfbbXi": "Ξ",
      "bfbbPi": "Π",
      "bfbbSigma": "Σ",
      "bfbbUpsilon": "Υ",
      "bfbbPhi": "Φ",
      "bfbbPsi": "Ψ",
      "bfbbOmega": "Ω",
      "bfbbalpha": "α",
      "bfbbbeta": "β",
      "bfbbgamma": "γ",
      "bfbbdelta": "δ",
      "bfbbepsilon": "ε",
      "bfbbzeta": "ζ",
      "bfbbeta": "η",
      "bfbbtheta": "θ",
      "bfbbiota": "ι",
      "bfbbkappa": "κ",
      "bfbblambda": "οBB",
      "bfbbmu": "µ",
      "bfbbnu": "ν",
      "bfbbxi": "ξ",
      "bfbbpi": "π",
      "bfbbrho": "ρ",
      "bfbbsigma": "σ",
      "bfbbtau": "τ",
      "bfbbupsilon": "υ",
      "bfbbphi": "φ",
      "bfbbchi": "χ",
      "bfbbpsi": "ψ",
      "bfbbomega": "ω",
      "bfbbdotlessi": "ı",
      "bfbbdotlessj": "ȷ"
    }
  ],
  [
    "bboldx-delimiterBold",
    {
      "bfbbLparen": "(",
      "bfbbRparen": ")",
      "bfbbLbrack": "[",
      "bfbbRbrack": "]",
      "bfbbLangle": "〈",
      "bfbbRangle": "〉"
    }
  ],
  [
    "text-bboldx-mathchar0miNormal",
    {
      "txtbbGamma": "Γ",
      "txtbbDelta": "∆",
      "txtbbTheta": "Θ",
      "txtbbLambda": "Λ",
      "txtbbXi": "Ξ",
      "txtbbPi": "Π",
      "txtbbSigma": "Σ",
      "txtbbUpsilon": "Υ",
      "txtbbPhi": "Φ",
      "txtbbPsi": "Ψ",
      "txtbbOmega": "Ω",
      "txtbbalpha": "α",
      "txtbbbeta": "β",
      "txtbbgamma": "γ",
      "txtbbdelta": "δ",
      "txtbbepsilon": "ε",
      "txtbbzeta": "ζ",
      "txtbbeta": "η",
      "txtbbtheta": "θ",
      "txtbbiota": "ι",
      "txtbbkappa": "κ",
      "txtbblambda": "λ",
      "txtbbmu": "µ",
      "txtbbnu": "ν",
      "txtbbxi": "ξ",
      "txtbbpi": "π",
      "txtbbrho": "ρ",
      "txtbbsigma": "σ",
      "txtbbtau": "τ",
      "txtbbupsilon": "υ",
      "txtbbphi": "φ",
      "txtbbchi": "χ",
      "txtbbpsi": "ψ",
      "txtbbomega": "ω",
      "txtbbdotlessi": "ı",
      "txtbbdotlessj": "ȷ"
    }
  ],
  [
    "text-bboldx-delimiterNormal",
    {
      "txtbbLparen": "(",
      "txtbbRparen": ")",
      "txtbbLbrack": "[",
      "txtbbRbrack": "]",
      "txtbbLangle": "〈",
      "txtbbRangle": "〉"
    }
  ],
  [
    "text-bboldx-mathchar0miBold",
    {
      "txtbfbbGamma": "Γ",
      "txtbfbbDelta": "∆",
      "txtbfbbTheta": "Θ",
      "txtbfbbLambda": "Λ",
      "txtbfbbXi": "Ξ",
      "txtbfbbPi": "Π",
      "txtbfbbSigma": "Σ",
      "txtbfbbUpsilon": "Υ",
      "txtbfbbPhi": "Φ",
      "txtbfbbPsi": "Ψ",
      "txtbfbbOmega": "Ω",
      "txtbfbbalpha": "α",
      "txtbfbbbeta": "β",
      "txtbfbbgamma": "γ",
      "txtbfbbdelta": "δ",
      "txtbfbbepsilon": "ε",
      "txtbfbbzeta": "ζ",
      "txtbfbbeta": "η",
      "txtbfbbtheta": "θ",
      "txtbfbbiota": "ι",
      "txtbfbbkappa": "κ",
      "txtbfbblambda": "λ",
      "txtbfbbmu": "µ",
      "txtbfbbnu": "ν",
      "txtbfbbxi": "ξ",
      "txtbfbbpi": "π",
      "txtbfbbrho": "ρ",
      "txtbfbbsigma": "σ",
      "txtbfbbtau": "τ",
      "txtbfbbupsilon": "υ",
      "txtbfbbphi": "φ",
      "txtbfbbchi": "χ",
      "txtbfbbpsi": "ψ",
      "txtbfbbomega": "ω",
      "txtbfbbdotlessi": "ı",
      "txtbfbbdotlessj": "ȷ"
    }
  ],
  [
    "text-bboldx-delimiterBold",
    {
      "txtbfbbLparen": "(",
      "txtbfbbRparen": ")",
      "txtbfbbLbrack": "[",
      "txtbfbbRbrack": "]",
      "txtbfbbLangle": "〈",
      "txtbfbbRangle": "〉"
    }
  ]
];
export function textVariant(p:Parser,bold=false){const opts=p.options.texOptions?.bboldx as {bfbb?:boolean,light?:boolean}|undefined;return opts?.bfbb?'-bboldx-bold':opts?.light?(bold?'-bboldx':'-bboldx-light'):(bold?'-bboldx-bold':'-bboldx');}
const commands:Record<string,TexCommand>={mathbb:{execute(p){fontArgument(p,textVariant(p));}},mathbfbb:{execute(p){fontArgument(p,textVariant(p,true));}}};
for(const [map,symbols] of maps)for(const [name,char] of Object.entries(symbols))commands[name]={type:'text-insert',execute(p){const delim=map.includes('delimiter');const n=p.node(delim?K.mo:K.mi,[],char,{'data-mjx-variant':textVariant(p,map.endsWith('Bold')),...(delim?{stretchy:'false'}:{})});n.rawAttrs=true;p.append(n);}};
for(const [alias,name] of Object.entries({imathbb:'bbdotlessi',jmathbb:'bbdotlessj',imathbfbb:'bfbbdotlessi',jmathbfbb:'bfbbdotlessj',itextbb:'txtbbdotlessi',jtextbb:'txtbbdotlessj',itextbfbb:'txtbfbbdotlessi',jtextbfbb:'txtbfbbdotlessj'}))commands[alias]=commands[name];
for(const [name,bold] of [['textbb',false],['textbfbb',true]] as const)commands[name]={execute(p){const n=p.text(p.tokensArgument());n.attributes['data-mjx-variant']=textVariant(p,bold);p.append(n);}};
export default {name:'bboldx',priority:3,commands,environments:{},options:['bboldx'],configurationModules:['input/tex/bboldx/BboldxConfiguration.js','input/tex/textmacros/TextMacrosConfiguration.js']} satisfies TexPackage;
