import { builtin } from "./scanner.js";
import type { Token } from "./scanner.js";
import { K } from "./ast.js";
import type { Node } from "./ast.js";
import { operators, definitions } from "./symbols.js";
type Attrs = Record<string, string>;
export const relationChars = new Set(
  Array.from("=<>≠≤≥≈∼≃≅≍≡∝∈∉∋⊂⊃⊆⊇⊢⊣⊨≺≻⪯⪰←→↔⇒⇐⇔"),
);
export const stretchyChars = new Set(
  Array.from("()[]{}|‖⌈⌉⌊⌋⟨⟩⎰⎱/\\↑↓↕⇑⇓⇕←→↔⇒⇐⇔∼⏜⏝⏞⏟"),
);
export const fenceChars = new Set(Array.from("()[]{}|‖⌈⌉⌊⌋⟨⟩⎰⎱⟮⟯"));
export const negated: Record<string, string> = {
  "=": "≠",
  "<": "≮",
  ">": "≯",
  "≤": "≰",
  "≥": "≱",
  "→": "↛",
  "←": "↚",
  "↔": "↮",
  "⇒": "⇏",
  "⇐": "⇍",
  "⇔": "⇎",
  "∈": "∉",
  "∋": "∌",
  "∼": "≁",
  "≃": "≄",
  "≅": "≇",
  "≈": "≉",
  "≡": "≢",
  "⊂": "⊄",
  "⊃": "⊅",
  "⊆": "⊈",
  "⊇": "⊉",
};
export const accents: Record<string, string> = {
  acute: "´",
  grave: "`",
  ddot: "¨",
  dddot: "⃛",
  ddddot: "⃜",
  tilde: "~",
  bar: "¯",
  breve: "˘",
  check: "ˇ",
  hat: "^",
  vec: "→",
  dot: "˙",
  widetilde: "~",
  widehat: "^",
};
export const underover: Record<string, string> = {
  overline: "¯",
  underline: "_",
  overbrace: "⏞",
  underbrace: "⏟",
  overparen: "⏜",
  underparen: "⏝",
  overrightarrow: "→",
  underrightarrow: "→",
  overleftarrow: "←",
  underleftarrow: "←",
  overleftrightarrow: "↔",
  underleftrightarrow: "↔",
};

export function compatible(a: Attrs, b: Attrs): boolean {
  const keysA = Object.keys(a).filter(
    (k) =>
      k !== "lspace" &&
      k !== "data-mjx-texclass" &&
      !(k === "stretchy" && a[k] === "false"),
  );
  const keysB = Object.keys(b).filter(
    (k) =>
      k !== "rspace" &&
      k !== "data-mjx-texclass" &&
      !(k === "stretchy" && b[k] === "false"),
  );
  return keysA.length === keysB.length && keysA.every((k) => a[k] === b[k]);
}
export function nodeText(nodes: Node[]): string {
  let text = "";
  const stack = [...nodes].reverse();
  while (stack.length) {
    const n = stack.pop()!;
    text += n.text;
    for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
  }
  return text;
}
export function nameOf(id: number) {
  return definitions[id].name;
}
export function dimensionEm(d: string): number {
  const n = parseFloat(d.replace(",", "."));
  const unit = d.replace(/[-+0-9., ]/g, "");
  return (
    n *
    (
      {
        em: 1,
        ex: 0.43,
        pt: 0.1,
        cm: 72 / 2.54 / 10,
        mm: 72 / 25.4 / 10,
        px: 1 / 10,
        in: 7.2,
      } as Record<string, number>
    )[unit]
  );
}
export function hasContent(n: Node): boolean {
  const stack = [n];
  while (stack.length) {
    const x = stack.pop()!;
    if (x.text) return true;
    for (const child of x.children) stack.push(child);
  }
  return false;
}
export function operator(text: string, form = "infix") {
  return (
    operators[form][text] ??
    operators.infix[text] ??
    operators.prefix[text] ??
    operators.postfix[text]
  );
}
export function em(n: number) {
  return String(Math.round(n * 1000) / 1000) + "em";
}

export function commandId(t: Token) {
  return builtin(t[0] === -3 ? [-1, t[1], t[2], t[3]] : t);
}
