import {copyPackageMark} from './package-mark.js';
/** A MathML tree. The parser uses numeric tags internally and exposes this string union. */
export type MathMLKind =
  | "math"
  | "mi"
  | "mn"
  | "mo"
  | "mtext"
  | "mspace"
  | "mrow"
  | "mfrac"
  | "msqrt"
  | "mroot"
  | "msub"
  | "msup"
  | "msubsup"
  | "munder"
  | "mover"
  | "munderover"
  | "mstyle"
  | "merror"
  | "mpadded"
  | "mphantom"
  | "mtable"
  | "mtr"
  | "mlabeledtr"
  | "mtd"
  | "menclose"
  | "mmultiscripts"
  | "mprescripts"
  | "none"

  | "maction"
  | "#text"
  | (string & {});
export interface MathMLNode {
  kind: MathMLKind;
  attributes: Record<string, string>;
  children: MathMLNode[];
  text: string;
  start: number;
}
export interface OutputOptions {
  /** MathML Core + inline CSS by default; mathjax preserves upstream markup. */
  output?: 'native' | 'mathjax';
}
export interface ParseOptions extends OutputOptions {
  display?: boolean;
  packages?: readonly (string | readonly [string, number])[];
  /** Requested package order and MathJax-compatible numeric priorities. */
  texOptions?: Record<string, unknown>;
  mode?: string;
  configurationModules?: readonly string[];
  executionOrder?: number;
  prior?: readonly { tex: string; display?: boolean }[];
  tags?: "none" | "all" | "ams" | "cases";
  baseURL?: string;
  useLabelIds?: boolean;
  ignoreDuplicateLabels?: boolean;
  tagSide?: string;
  tagIndent?: string;
  tagAlign?: string;
  numberPattern?: string | RegExp;
  identifierPattern?: RegExp;
  maxExpansions?: number;
  maxNodes?: number;
  maxTokens?: number;
  maxDepth?: number;
  /** Throw instead of returning MathJax-compatible merror markup. */
  throwOnError?: boolean;
  macros?: Record<string, string | [string, number, string?]>;
  /** Decimal separator; default is '.'. */
  decimalSeparator?: "." | ",";
}
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}
export const tags: MathMLKind[] = [
  "math",
  "mi",
  "mn",
  "mo",
  "mtext",
  "mspace",
  "mrow",
  "mfrac",
  "msqrt",
  "mroot",
  "msub",
  "msup",
  "msubsup",
  "munder",
  "mover",
  "munderover",
  "mstyle",
  "merror",
  "mpadded",
  "mphantom",
  "mtable",
  "mtr",
  "mlabeledtr",
  "mtd",
  "menclose",
  "mmultiscripts",
  "mprescripts",
  "none",
  "maction",
  "html",
];
export const enum K {
  math,
  mi,
  mn,
  mo,
  mtext,
  mspace,
  mrow,
  mfrac,
  msqrt,
  mroot,
  msub,
  msup,
  msubsup,
  munder,
  mover,
  munderover,
  mstyle,
  merror,
  mpadded,
  mphantom,
  mtable,
  mtr,
  mlabeledtr,
  mtd,
  menclose,
  mmultiscripts,
  mprescripts,
  none,
  maction,
  html,
}
export interface Node {
  /** Internal inferred sequences may flatten; explicit mrows must survive. */
  inferred?: boolean;
  /** Generated scripts remain an indivisible base for later TeX scripts. */
  scriptBoundary?: boolean;
  kind: K;
  attributes: Record<string, string>;
  children: Node[];
  text: string;
  start: number;
  op: number;
  limits: number;
  relation: boolean;
  fixed: boolean;
  rawAttrs: boolean;
  /** Parsed HTML subtree, available only through the explicit texhtml package. */
  html?: MathMLNode;
  /** Preserve upstream mixed token/cell serialization in unnumbered empheq. */
  tokenCellSpacing?: boolean;
}
export function expose(root: Node): MathMLNode {
  const result: MathMLNode = {
    kind: tags[root.kind],
    attributes: root.attributes,
    children: [],
    text: root.text,
    start: root.start,
  };
  const stack: [Node, MathMLNode, number][] = [[root, result, 0]];
  copyPackageMark(root,result);
  while (stack.length) {
    const [n, out, depth] = stack.pop()!;
    for (const c of n.children) {
      if(n.tokenCellSpacing&&c.kind===K.mtd)out.children.push({kind:'#text',attributes:{},children:[],text:' '.repeat(2*(depth+1)),start:c.start});
      if (c.html) { out.children.push(c.html); continue; }
      const v: MathMLNode = {
        kind: tags[c.kind],
        attributes: c.attributes,
        children: [],
        text: c.text,
        start: c.start,
      };
      out.children.push(v);
      copyPackageMark(c,v);
      stack.push([c, v, depth+1]);
    }
  }
  return result;
}

export class UnsupportedFeatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFeatureError";
  }
}
