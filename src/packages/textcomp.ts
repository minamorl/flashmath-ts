// Symbol data adapted from MathJax 4.1.3, copyright The MathJax Consortium.
// Apache-2.0; see ../LICENSE.MathJax. Parser handlers are independent.
import {K} from '../ast.js';
import type {TexPackage,TexCommand} from './types.js';
export const textcompSymbols:Record<string,[string,string]>={
  "textasciicircum": [
    "^",
    ""
  ],
  "textasciitilde": [
    "~",
    ""
  ],
  "textasteriskcentered": [
    "*",
    ""
  ],
  "textbackslash": [
    "\\",
    ""
  ],
  "textbar": [
    "|",
    ""
  ],
  "textbraceleft": [
    "{",
    ""
  ],
  "textbraceright": [
    "}",
    ""
  ],
  "textbullet": [
    "•",
    ""
  ],
  "textdagger": [
    "†",
    ""
  ],
  "textdaggerdbl": [
    "‡",
    ""
  ],
  "textellipsis": [
    "…",
    ""
  ],
  "textemdash": [
    "—",
    ""
  ],
  "textendash": [
    "–",
    ""
  ],
  "textexclamdown": [
    "¡",
    ""
  ],
  "textgreater": [
    ">",
    ""
  ],
  "textless": [
    "<",
    ""
  ],
  "textordfeminine": [
    "ª",
    ""
  ],
  "textordmasculine": [
    "º",
    ""
  ],
  "textparagraph": [
    "¶",
    ""
  ],
  "textperiodcentered": [
    "·",
    ""
  ],
  "textquestiondown": [
    "¿",
    ""
  ],
  "textquotedblleft": [
    "“",
    ""
  ],
  "textquotedblright": [
    "”",
    ""
  ],
  "textquoteleft": [
    "‘",
    ""
  ],
  "textquoteright": [
    "’",
    ""
  ],
  "textsection": [
    "§",
    ""
  ],
  "textunderscore": [
    "_",
    ""
  ],
  "textvisiblespace": [
    "␣",
    ""
  ],
  "textacutedbl": [
    "˝",
    ""
  ],
  "textasciiacute": [
    "´",
    ""
  ],
  "textasciibreve": [
    "˘",
    ""
  ],
  "textasciicaron": [
    "ˇ",
    ""
  ],
  "textasciidieresis": [
    "¨",
    ""
  ],
  "textasciimacron": [
    "¯",
    ""
  ],
  "textgravedbl": [
    "˵",
    ""
  ],
  "texttildelow": [
    "˷",
    ""
  ],
  "textbaht": [
    "฿",
    ""
  ],
  "textcent": [
    "¢",
    ""
  ],
  "textcolonmonetary": [
    "₡",
    ""
  ],
  "textcurrency": [
    "¤",
    ""
  ],
  "textdollar": [
    "$",
    ""
  ],
  "textdong": [
    "₫",
    ""
  ],
  "texteuro": [
    "€",
    ""
  ],
  "textflorin": [
    "ƒ",
    ""
  ],
  "textguarani": [
    "₲",
    ""
  ],
  "textlira": [
    "₤",
    ""
  ],
  "textnaira": [
    "₦",
    ""
  ],
  "textpeso": [
    "₱",
    ""
  ],
  "textsterling": [
    "£",
    ""
  ],
  "textwon": [
    "₩",
    ""
  ],
  "textyen": [
    "¥",
    ""
  ],
  "textcircledP": [
    "℗",
    ""
  ],
  "textcompwordmark": [
    "‌",
    ""
  ],
  "textcopyleft": [
    "🄯",
    ""
  ],
  "textcopyright": [
    "©",
    ""
  ],
  "textregistered": [
    "®",
    ""
  ],
  "textservicemark": [
    "℠",
    ""
  ],
  "texttrademark": [
    "™",
    ""
  ],
  "textbardbl": [
    "‖",
    ""
  ],
  "textbigcircle": [
    "◯",
    ""
  ],
  "textblank": [
    "␢",
    ""
  ],
  "textbrokenbar": [
    "¦",
    ""
  ],
  "textdiscount": [
    "⁒",
    ""
  ],
  "textestimated": [
    "℮",
    ""
  ],
  "textinterrobang": [
    "‽",
    ""
  ],
  "textinterrobangdown": [
    "⸘",
    ""
  ],
  "textmusicalnote": [
    "♪",
    ""
  ],
  "textnumero": [
    "№",
    ""
  ],
  "textopenbullet": [
    "◦",
    ""
  ],
  "textpertenthousand": [
    "‱",
    ""
  ],
  "textperthousand": [
    "‰",
    ""
  ],
  "textrecipe": [
    "℞",
    ""
  ],
  "textreferencemark": [
    "※",
    ""
  ],
  "textlangle": [
    "〈",
    ""
  ],
  "textrangle": [
    "〉",
    ""
  ],
  "textlbrackdbl": [
    "⟦",
    ""
  ],
  "textrbrackdbl": [
    "⟧",
    ""
  ],
  "textlquill": [
    "⁅",
    ""
  ],
  "textrquill": [
    "⁆",
    ""
  ],
  "textcelsius": [
    "℃",
    ""
  ],
  "textdegree": [
    "°",
    ""
  ],
  "textdiv": [
    "÷",
    ""
  ],
  "textdownarrow": [
    "↓",
    ""
  ],
  "textfractionsolidus": [
    "⁄",
    ""
  ],
  "textleftarrow": [
    "←",
    ""
  ],
  "textlnot": [
    "¬",
    ""
  ],
  "textmho": [
    "℧",
    ""
  ],
  "textminus": [
    "−",
    ""
  ],
  "textmu": [
    "µ",
    ""
  ],
  "textohm": [
    "Ω",
    ""
  ],
  "textonehalf": [
    "½",
    ""
  ],
  "textonequarter": [
    "¼",
    ""
  ],
  "textonesuperior": [
    "¹",
    ""
  ],
  "textpm": [
    "±",
    ""
  ],
  "textrightarrow": [
    "→",
    ""
  ],
  "textsurd": [
    "√",
    ""
  ],
  "textthreequarters": [
    "¾",
    ""
  ],
  "textthreesuperior": [
    "³",
    ""
  ],
  "texttimes": [
    "×",
    ""
  ],
  "texttwosuperior": [
    "²",
    ""
  ],
  "textuparrow": [
    "↑",
    ""
  ],
  "textborn": [
    "*",
    ""
  ],
  "textdied": [
    "†",
    ""
  ],
  "textdivorced": [
    "⚮",
    ""
  ],
  "textmarried": [
    "⚭",
    ""
  ],
  "textcentoldstyle": [
    "¢",
    "-tex-oldstyle"
  ],
  "textdollaroldstyle": [
    "$",
    "-tex-oldstyle"
  ],
  "textzerooldstyle": [
    "0",
    "-tex-oldstyle"
  ],
  "textoneoldstyle": [
    "1",
    "-tex-oldstyle"
  ],
  "texttwooldstyle": [
    "2",
    "-tex-oldstyle"
  ],
  "textthreeoldstyle": [
    "3",
    "-tex-oldstyle"
  ],
  "textfouroldstyle": [
    "4",
    "-tex-oldstyle"
  ],
  "textfiveoldstyle": [
    "5",
    "-tex-oldstyle"
  ],
  "textsixoldstyle": [
    "6",
    "-tex-oldstyle"
  ],
  "textsevenoldstyle": [
    "7",
    "-tex-oldstyle"
  ],
  "texteightoldstyle": [
    "8",
    "-tex-oldstyle"
  ],
  "textnineoldstyle": [
    "9",
    "-tex-oldstyle"
  ]
};
export default {name:'textcomp',commands:Object.fromEntries(Object.entries(textcompSymbols).map(([name,[char,font]])=>[name,{type:'text-insert',execute(p){const variant=font||p.f.font;p.append(p.node(K.mtext,[],char,variant?{mathvariant:variant}:{}));}} satisfies TexCommand])),environments:{},configurationModules:['input/tex/textcomp/TextcompConfiguration.js','input/tex/textmacros/TextMacrosConfiguration.js']} satisfies TexPackage;
