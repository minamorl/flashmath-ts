import { K, ParseError, expose } from "./ast.js";
import type { Node, ParseOptions, MathMLNode } from "./ast.js";
import {
  scan,
  Stream,
  spelling,
  builtin,
  raw,
  letter,
  space,
} from "./scanner.js";
import type { Token, Macro } from "./scanner.js";
import { preamble } from "./preamble.js";
import type { Preamble } from "./preamble.js";
import { C, definitions, ranges } from "./symbols.js";
import { resolvePackages } from "./packages/registry.js";
import { configure } from "./configuration.js";
import { sessionState } from "./session-state.js";
import type { SessionState, Reference } from "./session-state.js";
import type { PackageConfiguration } from "./packages/types.js";
import type { Definition } from "./symbols.js";
import {
  relationChars,
  stretchyChars,
  fenceChars,
  operator,
  compatible,
  em,
  dimensionEm,
  nodeText,
  hasContent,
  nameOf,
  commandId,
} from "./mathml.js";

type Attrs = Record<string, string>;
interface Frame {
  nodes: Node[];
  stop: number;
  single: boolean;
  done: (nodes: Node[]) => void;
  font: string;
  multi: boolean;
  level: number;
  display: boolean;
  env: string;
  table: Table | null;
  fraction: { num: Node[]; attrs: Attrs; left: string; right: string } | null;
}
interface Table {
  rows: Node[][];
  cells: Node[];
  align: string;
  spacing: string;
  rowspacing: string;
  rowspacingBase?: number;
  display: boolean;
  lines: string[];
  rowlines: string[];
  frame: string;
  top: string;
  bottom: string;
  position: string;
  latex: boolean;
  plan: Preamble;
  originalFont: string;
  fill: string;
  rowBreak: Record<number, string>;
  cellBreak: Record<string, string>;
  tableBreak: boolean;
  labels: string[];
  noNumbers: Set<number>;
  rowspaces: string[];
  numbered: boolean;
  taggable: boolean;
  tagCells: Map<number, Node>;
}
const NS = "http://www.w3.org/1998/Math/MathML";
const isDigit = (c: number) => c >= 48 && c <= 57;
const same = (a: Token | undefined, b: Token) =>
  !!a && a[0] === b[0] && spelling(a) === spelling(b);

export class Parser {
  readonly stream: Stream;
  readonly macros: Map<string, Macro>;
  readonly environments: Map<string, { begin: Macro; end: Macro }>;
  readonly localLabels = new Map<string, Reference>();
  readonly frames: Frame[] = [];
  nodes = 0;
  expansions = 0;
  position = 0;
  readonly columns = new Map<string, { count: number; body: string }>();
  label = "";
  numbered = false;
  hasTaggableEnvironment = false;
  readonly envStack: string[] = [];
  hsize = "";
  inline = false;
  nonscript = false;
  pendingBreak = "";
  result: Node[] = [];
  constructor(
    readonly tex: string,
    readonly options: ParseOptions,
    readonly configuration: PackageConfiguration = resolvePackages(
      options.packages,
    ),
    readonly session: SessionState = sessionState(),
  ) {
    this.macros = session.macros;
    this.environments = session.environments;
    this.numbered = options.tags === "all" && !!options.display;
    this.stream = new Stream(
      scan(tex, options.maxTokens ?? 200000),
      options.maxTokens ?? 200000,
    );
    if (!session.initialized)
      for (const [name, value] of Object.entries(options.macros ?? {})) {
        const [body, count = 0, opt] =
          typeof value === "string" ? [value] : value;
        this.macros.set(name, {
          body: scan(body),
          count,
          optional: opt === undefined ? null : scan(opt),
          prefix: [],
          delimiters: [],
        });
      }
    session.initialized = true;
    this.frame(0, false, (n) => {
      this.result = n;
    });
  }
  error(message: string): never {
    throw new ParseError(message, this.position);
  }
  node(
    kind: K,
    children: Node[] = [],
    text = "",
    attributes: Attrs = {},
    start = this.position,
  ): Node {
    if (++this.nodes > (this.options.maxNodes ?? 100000))
      this.error("Node limit exceeded");
    return {
      kind,
      attributes,
      children,
      text,
      start,
      op: 0,
      limits: 0,
      relation: kind === K.mo && relationChars.has(text),
      fixed: false,
      rawAttrs: false,
    };
  }
  row(nodes: Node[], force = false): Node {
    return !force && nodes.length === 1 ? nodes[0] : this.node(K.mrow, nodes);
  }
  atom(nodes: Node[], texclass = "ORD"): Node {
    return this.node(K.mrow, nodes, "", { "data-mjx-texclass": texclass });
  }
  get f() {
    return this.frames[this.frames.length - 1];
  }
  frame(
    stop: number,
    single: boolean,
    done: (nodes: Node[]) => void,
    env = "",
    table: Table | null = null,
  ) {
    if (this.frames.length >= (this.options.maxDepth ?? 1024))
      this.error("Nesting limit exceeded");
    const p = this.f;
    this.frames.push({
      nodes: [],
      stop,
      single,
      done,
      font: p?.font ?? "",
      multi: p?.multi ?? false,
      level: p?.level ?? 0,
      display: p?.display ?? this.options.display ?? false,
      env,
      table,
      fraction: null,
    });
  }
  append(n: Node) {
    if (this.pendingBreak) {
      const value = this.pendingBreak;
      this.pendingBreak = "";
      if (n.kind === K.mo && operator(n.text)?.[3]?.linebreakstyle !== "after")
        n.attributes.linebreak = value;
      else
        this.f.nodes.push(
          this.node(
            K.mspace,
            [],
            "",
            value === "auto" ? {} : { linebreak: value },
          ),
        );
    }
    if (this.nonscript) {
      this.nonscript = false;
      if (
        this.f.level > 0 &&
        (n.kind === K.mspace ||
          (n.kind === K.mstyle && n.children[0]?.kind === K.mspace))
      )
        return;
    }
    if (this.f.table?.bottom) this.f.table.bottom = "";
    this.f.nodes.push(n);
  }
  close() {
    const f = this.f;
    if (this.pendingBreak) {
      const value = this.pendingBreak;
      this.pendingBreak = "";
      f.nodes.push(
        this.node(
          K.mspace,
          [],
          "",
          value === "auto" ? {} : { linebreak: value },
        ),
      );
    }
    let nodes = f.nodes;
    if (f.fraction) {
      const x = f.fraction;
      let frac = this.node(
        K.mfrac,
        [this.row(x.num), this.row(nodes)],
        "",
        x.attrs,
      );
      if (x.left || x.right) {
        const size = this.f.level === 0 ? "2.047em" : "1.2em";
        frac = this.atom([
          this.atom([this.delimiterNode(x.left, size)], "OPEN"),
          frac,
          this.atom([this.delimiterNode(x.right, size)], "CLOSE"),
        ]);
      }
      nodes = [frac];
    }
    this.frames.pop();
    f.done(nodes);
  }
  argument(done: (n: Node) => void, keepGroup = false) {
    this.stream.skip();
    const t = this.stream.peek();
    if (!t) this.error("Missing argument");
    if (t[0] === 123) {
      this.stream.next();
      this.frame(125, false, (n) =>
        done(keepGroup ? this.atom(n) : this.row(n)),
      );
    } else this.frame(0, true, (n) => done(this.row(n)));
  }
  args(count: number, done: (nodes: Node[]) => void) {
    const values: Node[] = [];
    const next = () => {
      if (values.length === count) done(values);
      else
        this.argument((n) => {
          values.push(n);
          next();
        });
    };
    next();
  }
  tokensArgument(name = ""): Token[] {
    this.stream.skip();
    const first = this.stream.next();
    if (!first) this.error(`Missing argument for ${name}`);
    if (first[0] !== 123) return [first];
    const result: Token[] = [];
    let depth = 1;
    while (depth) {
      const t = this.stream.next();
      if (!t) this.error("Missing close brace");
      if (t[0] === 123) depth++;
      if (t[0] === 125) depth--;
      if (depth) result.push(t);
    }
    return result;
  }
  optional(): Token[] | null {
    this.stream.skip();
    if (this.stream.peek()?.[0] !== 91) return null;
    this.stream.next();
    const out: Token[] = [];
    let depth = 0;
    for (;;) {
      const t = this.stream.next();
      if (!t) this.error("Couldn't find closing ']' for argument");
      if (t[0] === 93 && depth === 0) return out;
      if (t[0] === 123) depth++;
      if (t[0] === 125) depth--;
      out.push(t);
    }
  }
  parseTokens(tokens: readonly Token[], done: (n: Node) => void) {
    this.stream.push([[0, 0, 0, ""]]);
    this.stream.push(tokens);
    this.frame(-2, false, (n) => done(this.row(n)));
  }
  substitute(m: Macro, args: readonly Token[][]): Token[] {
    const out: Token[] = [];
    for (let i = 0; i < m.body.length; i++) {
      const t = m.body[i];
      if (t[0] !== 35) {
        out.push(t);
        continue;
      }
      const n = m.body[++i];
      if (n?.[0] === 35) out.push(n);
      else {
        const index = n ? n[0] - 49 : -1;
        if (index < 0 || index >= args.length)
          this.error("Illegal macro parameter reference");
        for (const value of args[index]) {
          if (out.length >= (this.options.maxTokens ?? 200000))
            this.error("Token limit exceeded");
          out.push(value);
        }
      }
      if (out.length > (this.options.maxTokens ?? 200000))
        this.error("Token limit exceeded");
    }
    return out;
  }
  expand(m: Macro) {
    if (++this.expansions > (this.options.maxExpansions ?? 10000))
      this.error("Macro expansion limit exceeded");
    this.stream.skip();
    for (const t of m.prefix) {
      if (!same(this.stream.next(), t))
        this.error("Use of macro doesn't match its definition");
    }
    const args: Token[][] = [];
    if (m.optional) args.push(this.optional() ?? [...m.optional]);
    for (let i = args.length; i < m.count; i++) {
      const delim = m.delimiters[i] ?? [];
      if (!delim.length) {
        args.push(this.tokensArgument());
        continue;
      }
      const value: Token[] = [];
      let depth = 0;
      for (;;) {
        const t = this.stream.next();
        if (!t) this.error("Missing macro argument delimiter");
        value.push(t);
        if (t[0] === 123) depth++;
        if (t[0] === 125) depth--;
        if (
          depth === 0 &&
          value.length >= delim.length &&
          delim.every((x, j) => same(value[value.length - delim.length + j], x))
        ) {
          value.length -= delim.length;
          break;
        }
      }
      if (value[0]?.[0] === 123 && value.at(-1)?.[0] === 125) {
        let d = 0,
          whole = true;
        for (let k = 0; k < value.length - 1; k++) {
          if (value[k][0] === 123) d++;
          if (value[k][0] === 125) d--;
          if (d === 0) whole = false;
        }
        if (whole) {
          value.shift();
          value.pop();
        }
      }
      args.push(value);
    }
    this.stream.push(this.substitute(m, args));
  }
  delimiter(): string {
    this.stream.skip();
    let t = this.stream.next();
    if (t?.[0] === 123) {
      t = this.stream.next();
      if (this.stream.next()?.[0] !== 125) this.error("Missing close brace");
    }
    if (!t) this.error("Missing delimiter");
    for (let i = 0; i < 30; i++) {
      if (t![0] !== -1 && t![0] !== -3) break;
      const m: Macro | undefined =
        t![0] === -1 ? this.macros.get(spelling(t!)) : undefined;
      if (m?.body.length === 1) {
        t = m.body[0];
        continue;
      }
      const symbolId = commandId(t!);
      const d = (
        symbolId < 0
          ? this.configuration.extensions.get(spelling(t!))
          : this.configuration.commands[symbolId]
      )?.definition;
      if (d?.char) return d.char === "<" ? "⟨" : d.char === ">" ? "⟩" : d.char;
      this.error(`Unknown delimiter \\${spelling(t!)}`);
    }
    const s = spelling(t!);
    if (s === ".") return "";
    if (s === "<") return "⟨";
    if (s === ">") return "⟩";
    if (!stretchyChars.has(s))
      this.error(`Missing or unrecognized delimiter for ${s}`);
    return s;
  }
  delimiterNode(text: string, big = "", texclass = ""): Node {
    const a: Attrs = texclass ? { "data-mjx-texclass": texclass } : {};
    if (!text)
      Object.assign(a, { fence: "true", stretchy: "true", symmetric: "true" });
    else if (!fenceChars.has(text) && text !== "<" && text !== ">")
      Object.assign(a, {
        fence: "true",
        symmetric: "true",
        ...(["⏐", "⏪", "⎪", "/", "\\", "⌜", "⌝", "⌞", "⌟"].includes(text)
          ? { stretchy: "true" }
          : {}),
      });
    if (big)
      Object.assign(a, {
        minsize: big,
        maxsize: big,
        ...(text === "|" || text === "‖"
          ? { fence: "true", stretchy: "true", symmetric: "true" }
          : {}),
      });
    return this.node(K.mo, [], text, a);
  }
  symbol(t: Token, id: number, d: Definition = definitions[id]) {
    const attrs: Attrs = {};
    let kind = K.mo;
    const text = d.char!;
    if (d.type === "lcGreek") {
      kind = K.mi;
      attrs.mathvariant = "italic";
    } else if (d.type === "ucGreek") {
      kind = K.mi;
      attrs.mathvariant = this.f.font || "normal";
    } else if (d.type === "mathchar0mi") {
      kind = K.mi;
      attrs.mathvariant = String(
        d.attrs?.mathvariant ??
          (d.attrs && Object.keys(d.attrs).length ? "" : "italic"),
      );
      if (!attrs.mathvariant) delete attrs.mathvariant;
    } else if (d.type === "mathchar7") {
      kind = K.mi;
      attrs.mathvariant =
        this.f.font || String(d.attrs?.mathvariant ?? "normal");
    } else if (d.type === "delimiter") {
      if (fenceChars.has(text)) attrs.fence = "false";
      attrs.stretchy = "false";
    }
    if (kind === K.mo && stretchyChars.has(text)) attrs.stretchy = "false";
    for (const [k, v] of Object.entries(d.attrs ?? {})) {
      if (["mathvariant", "largeop", "movablelimits", "symmetric"].includes(k))
        attrs[k] = String(v);
    }
    if (d.attrs?.texClass !== undefined)
      attrs["data-mjx-texclass"] =
        ["ORD", "OP", "BIN", "REL", "OPEN", "CLOSE", "PUNCT", "INNER"][
          Number(d.attrs.texClass)
        ] ?? "NONE";
    if (d.attrs?.variantForm) attrs["data-mjx-alternate"] = "1";
    if (d.name === "to") attrs.accent = "false";
    if (
      kind === K.mi &&
      attrs.mathvariant === "italic" &&
      Array.from(text).length === 1
    )
      delete attrs.mathvariant;
    const n = this.node(kind, [], text, attrs, t[1] - 1);
    n.limits = d.attrs?.movesupsub ? 1 : 0;
    n.fixed = kind === K.mo;
    return n;
  }
  character(t: Token) {
    const s = spelling(t),
      c = t[0];
    let kind: K = letter(c) ? K.mi : K.mo;
    let text = s;
    const attrs: Attrs = {};
    if (c > 127) {
      const cp = s.codePointAt(0)!;
      const range = ranges.find((r) => cp >= r[0] && cp <= r[1]);
      if (range) {
        kind = range[3] === "mi" ? K.mi : K.mo;
        if (range[4]) attrs.mathvariant = range[4];
      }
      if (
        kind === K.mi &&
        ((c >= 0x391 && c <= 0x3a9) || (c >= 0x3000 && c < 0xd800))
      )
        attrs.mathvariant = "normal";
    }
    if (c === 124) attrs["data-mjx-texclass"] = "ORD";
    if (c === 45) text = "−";
    if (c === 42) text = "∗";
    if (c === 96) text = "‘";
    if (kind === K.mo && stretchyChars.has(text)) attrs.stretchy = "false";
    if (this.f.font) attrs.mathvariant = this.f.font;
    const n = this.node(kind, [], text, attrs, t[1]);
    n.fixed = kind === K.mo;
    return n;
  }
  number(t: Token): Node {
    if (this.options.numberPattern instanceof RegExp && !this.f.single) {
      const pattern = this.options.numberPattern;
      pattern.lastIndex = t[1];
      const match = pattern.exec(t[3]);
      if (!match || !match[0].length) return this.character(t);
      if (match && match[0].length) {
        const end = t[1] + match[0].length;
        let cursor = t[2];
        while (cursor < end) {
          const next = this.stream.peek();
          if (!next || next[3] !== t[3] || next[1] !== cursor) break;
          cursor = next[2];
          this.stream.next();
        }
        if (cursor === end)
          return this.node(
            K.mn,
            [],
            match[0].replace(/[{}]/g, ""),
            this.f.font ? { mathvariant: this.f.font } : {},
            t[1],
          );
      }
    }
    let text = spelling(t);
    const decimal = this.options.decimalSeparator === "," ? 44 : 46;
    while (!this.f.single) {
      const next = this.stream.peek();
      if (!next) break;
      if (isDigit(next[0])) {
        text += spelling(this.stream.next()!);
        continue;
      }
      if (next[0] === 123) {
        const open = this.stream.next()!,
          group: Token[] = [];
        let depth = 1,
          close: Token | undefined;
        while (depth) {
          const token = this.stream.next();
          if (!token) this.error("Missing close brace");
          if (token[0] === 123) depth++;
          if (token[0] === 125) depth--;
          if (depth) group.push(token);
          else close = token;
        }
        if (group.length === 1 && group[0][0] === (decimal === 44 ? 46 : 44)) {
          const digits: Token[] = [];
          for (let i = 0; i < 3 && isDigit(this.stream.peek()?.[0] ?? 0); i++)
            digits.push(this.stream.next()!);
          if (digits.length === 3) {
            text += spelling(group[0]) + raw(digits);
            if (isDigit(this.stream.peek()?.[0] ?? 0)) break;
            continue;
          }
          this.stream.push([open, ...group, close!, ...digits]);
        } else this.stream.push([open, ...group, close!]);
        break;
      }
      if (next[0] === decimal && !text.includes(String.fromCharCode(decimal))) {
        this.stream.next();
        if (isDigit(this.stream.peek()?.[0] ?? 0)) {
          text += String.fromCharCode(decimal);
          continue;
        }
        this.stream.push([next]);
      }
      break;
    }
    return this.node(
      K.mn,
      [],
      text,
      this.f.font ? { mathvariant: this.f.font } : {},
      t[1],
    );
  }
  script(sup: boolean, prime = false) {
    let base = this.f.nodes.pop() ?? this.node(K.mi);
    const target = base;
    const add = (arg: Node) => {
      let b = target,
        sub: Node | undefined,
        top: Node | undefined;
      const under =
        b.limits !== 0 &&
        (b.kind === K.munder || b.kind === K.mover || b.kind === K.munderover);
      if (
        [K.msub, K.msup, K.msubsup].includes(b.kind) ||
        (b.limits !== 0 && [K.munder, K.mover, K.munderover].includes(b.kind))
      ) {
        if (b.kind === K.msub || b.kind === K.munder) sub = b.children[1];
        else if (b.kind === K.msup || b.kind === K.mover) top = b.children[1];
        else {
          sub = b.children[1];
          top = b.children[2];
        }
        b = b.children[0];
      }
      if (sup) {
        if (top && !prime) {
          if (top.kind === K.mo && top.attributes["data-mjx-alternate"]) {
            top.attributes["data-mjx-pseudoscript"] = "true";
            arg = this.row([top, arg], true);
          } else this.error("Double exponent: use braces to clarify");
          top = arg;
        } else top = top ? this.row([top, arg], true) : arg;
      } else {
        if (sub) this.error("Double subscripts: use braces to clarify");
        sub = arg;
      }
      const useUnder =
        (b.limits > 0 && (this.f.display || b.limits === 2)) || under;
      const k =
        sub && top
          ? useUnder
            ? K.munderover
            : K.msubsup
          : sub
            ? useUnder
              ? K.munder
              : K.msub
            : useUnder
              ? K.mover
              : K.msup;
      const n = this.node(
        k,
        [b, ...(sub ? [sub] : []), ...(top ? [top] : [])],
        "",
        {},
        b.start,
      );
      n.op = b.op;
      n.limits = b.limits;
      this.append(n);
    };
    if (prime) {
      let count = 1;
      while ([39, 0x2019].includes(this.stream.peek()?.[0] ?? 0)) {
        this.stream.next();
        count++;
      }
      add(
        this.node(
          K.mo,
          [],
          ["", "′", "″", "‴", "⁗"][count] ?? "′".repeat(count),
          { "data-mjx-alternate": "1" },
        ),
      );
    } else {
      const level = this.f.level;
      this.argument((n) => {
        add(n);
      }, true);
      this.f.level = level + 1;
      this.f.display = false;
    }
  }
  dimension(): string {
    this.stream.skip();
    if (this.stream.peek()?.[0] === 123)
      return raw(this.tokensArgument()).replace(",", ".").trim();
    let s = "";
    while (this.stream.peek()) {
      const t = this.stream.peek()!;
      if (t[0] === -1 || t[0] === 123 || t[0] === 125) break;
      const c = t[0];
      if (space(c)) {
        this.stream.next();
        if (s) break;
        continue;
      }
      if (
        isDigit(c) ||
        letter(c) ||
        c === 45 ||
        c === 43 ||
        c === 46 ||
        c === 44
      ) {
        s += spelling(this.stream.next()!);
        if (/[a-z]{2}$/i.test(s)) break;
      } else break;
    }
    if (!s) this.error("Missing dimension");
    return s.replace(",", ".");
  }
  text(tokens: Token[], font = ""): Node {
    let text = raw(tokens)
      .replace(/\\U\{([0-9a-fA-F]+)\}/g, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/\\([{}%$#_& \\])/g, "$1")
      .replace(/~/g, "\u00a0");
    if (text.startsWith(" ")) text = "\u00a0" + text.slice(1);
    if (text.endsWith(" ")) text = text.slice(0, -1) + "\u00a0";
    return this.node(K.mtext, [], text, font ? { mathvariant: font } : {});
  }
  renderText(tokens: Token[], font = "", style = false) {
    const parts: { math: boolean; tokens: Token[] }[] = [];
    let current: Token[] = [],
      math = false,
      depth = 0;
    for (const t of tokens) {
      const name = t[0] === -1 ? spelling(t) : "";
      const delimiter =
        (t[0] === 36 && depth === 0) || name === "(" || name === ")";
      if (delimiter) {
        parts.push({ math, tokens: current });
        current = [];
        math = !math;
        continue;
      }
      if (t[0] === 123) depth++;
      if (t[0] === 125) depth--;
      current.push(t);
    }
    parts.push({ math, tokens: current });
    if (math) this.error("Unclosed math delimiter in text");
    const nodes: Node[] = [];
    let index = 0;
    const display = this.f.display;
    const next = () => {
      while (index < parts.length) {
        const p = parts[index++];
        if (!p.tokens.length) continue;
        if (p.math) {
          this.parseTokens(p.tokens, (n) => {
            nodes.push(
              this.atom(
                n.kind === K.mrow && !Object.keys(n.attributes).length
                  ? n.children
                  : [n],
              ),
            );
            next();
          });
          this.f.font = "";
          this.f.display = false;
          return;
        }
        nodes.push(this.text(p.tokens, font));
      }
      let n = nodes.length === 1 ? nodes[0] : this.row(nodes, true);
      if (style && display)
        n = this.node(K.mstyle, n.kind === K.mrow ? n.children : [n], "", {
          displaystyle: "false",
        });
      this.append(n);
    };
    next();
  }
  tableStart(
    name: string,
    align: string,
    stop: number,
    done?: (n: Node) => void,
  ) {
    if (name === "eqnarray") this.hasTaggableEnvironment = true;
    const t: Table = {
      rows: [],
      cells: [],
      align,
      spacing: "1em",
      rowspacing: "4pt",
      display:
        name === "darray" || name === "eqnarray" || name.includes("eqalign"),
      lines: [],
      rowlines: [],
      frame: "",
      top: "",
      bottom: "",
      position: "",
      latex: stop === -4,
      plan: preamble(align, this.options.maxTokens ?? 200000, this.columns),
      originalFont: this.f.font,
      fill: "",
      rowBreak: {},
      cellBreak: {},
      tableBreak: true,
      labels: [],
      noNumbers: new Set(),
      rowspaces: [],
      numbered: name === "eqnarray" && this.numbered,
      taggable: name === "eqnarray",
      tagCells: new Map(),
    };
    if (name === "eqnarray" || name.includes("eqalign")) {
      t.spacing = name === "eqnarray" ? "0em 0.278em" : "0.278em";
      t.rowspacing = ".5em";
    }
    if (name === "cases") {
      t.spacing = "1em";
      t.rowspacing = ".2em";
    }
    this.frame(
      stop,
      false,
      (n) => {
        if (n.length || t.cells.length) {
          this.finishCell(t, n);
          t.rows.push(t.cells);
          this.tagRow(t);
        }
        if (t.rows.length > 1 && t.bottom && n.length) {
          t.bottom = "";
        }
        this.completeTable(t, name, done ?? ((n) => this.append(n)));
      },
      name,
      t,
    );
    this.f.display = t.display;
    if (t.latex) this.startCell(t);
  }
  startCell(t: Table) {
    const real = t.plan.columns.filter((c) => c.insert === null);
    const col = real[t.cells.length % real.length];
    if (
      col?.before.length &&
      builtin(this.stream.peek() ?? [0, 0, 0, ""]) !== C.end
    )
      this.stream.push(col.before);
  }
  finishCell(t: Table, nodes: Node[]) {
    const real = t.plan.columns.filter((c) => c.insert === null);
    const col = real[t.cells.length % real.length];
    if (col?.after.length) {
      for (const token of col.after) {
        if (space(token[0])) continue;
        nodes.push(this.character(token));
      }
    }
    const a: Attrs = {};
    if (t.fill) {
      a.columnalign = t.fill;
      t.fill = "";
    }
    const key = t.rows.length + ":" + t.cells.length;
    if (t.cellBreak[key]) a["data-vertical-align"] = t.cellBreak[key];
    if (col?.width && col.width !== "auto") {
      const text = this.node(K.mtext, [], nodeText(nodes));
      nodes = [
        this.node(K.mpadded, [text], "", {
          "data-mjx-vbox": col.vertical || "top",
          width: col.width,
          "data-overflow": "auto",
          "data-align": col.align,
          "data-vertical-align": col.vertical || "top",
        }),
      ];
    }
    if (t.align === "ll" && t.cells.length === 1 && nodes[0]?.kind !== K.mtext)
      nodes = [this.node(K.mtext, [], nodeText(nodes))];
    t.cells.push(this.node(K.mtd, nodes, "", a));
  }
  completeTable(t: Table, name: string, done: (n: Node) => void) {
    const inserts = t.plan.columns
      .map((c, i) => ({ c, i }))
      .filter((x) => x.c.insert !== null);
    let row = 0,
      insert = 0;
    const next = () => {
      while (row < t.rows.length) {
        if (insert === inserts.length) {
          insert = 0;
          row++;
          continue;
        }
        const { c, i } = inserts[insert++];
        this.parseTokens(c.insert!, (n) => {
          const cell = this.node(K.mtd, n.kind === K.mrow ? n.children : [n]);
          const following = t.rows[row][i];
          if (
            following &&
            !following.children.length &&
            following.attributes.columnalign
          ) {
            cell.attributes.columnalign = following.attributes.columnalign;
            delete following.attributes.columnalign;
          }
          t.rows[row].splice(i, 0, cell);
          next();
        });
        return;
      }
      done(this.tableNode(t, name));
    };
    next();
  }
  tagTable(): Table | undefined {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const table = this.frames[i].table;
      if (table?.taggable) return table;
    }
    return undefined;
  }
  setLabel(label: string) {
    if (label === "") return;
    const table = this.tagTable();
    const previous = table ? table.labels[table.rows.length] : this.label;
    if (previous) this.error("Multiple \\label");
    if (
      (this.session.labels.has(label) || this.localLabels.has(label)) &&
      !this.options.ignoreDuplicateLabels
    )
      this.error(`Label '${label}' multiply defined`);
    this.localLabels.set(label, { tag: "???", id: "" });
    if (table) table.labels[table.rows.length] = label;
    else this.label = label;
  }
  reference(label: string) {
    const ref = this.session.labels.get(label) ??
      this.localLabels.get(label) ?? { tag: "???", id: "" };
    this.append(
      this.node(K.mrow, [this.node(K.mtext, [], ref.tag)], "", {
        href: (this.options.baseURL ?? "") + "#" + encodeURIComponent(ref.id),
        class: "MathJax_ref",
      }),
    );
  }
  tagRow(table: Table) {
    const index = table.rows.length - 1;
    if (table.numbered && !table.noNumbers.has(index) && !table.tagCells.has(index))
      table.tagCells.set(index, this.labelCell(table.labels[index] ?? ""));
  }
  labelCell(label: string) {
    const n = ++this.session.counter,
      tag = String(n);
    const id =
      "mjx-eqn:" +
      ((this.options.useLabelIds !== false ? label : "") || tag).replace(
        /\s/g,
        "_",
      );
    if (label) this.localLabels.set(label, { tag, id });
    return this.node(
      K.mtd,
      [
        this.node(K.mtext, [], "("),
        this.node(K.mtext, [], tag),
        this.node(K.mtext, [], ")"),
      ],
      "",
      {
        id,
        ...(this.options.tagAlign && this.options.tagAlign !== "baseline"
          ? { rowalign: this.options.tagAlign }
          : {}),
      },
    );
  }
  tableNode(t: Table, name: string): Node {
    const cols =
      t.plan.columns
        .map((c) => ({ left: "l", right: "r", center: "c" })[c.align])
        .join("") || "c";
    const attrs: Attrs = {
      columnspacing: t.spacing,
      rowspacing: t.rowspacing,
      columnalign: Array.from(
        cols,
        (c) => ({ l: "left", c: "center", r: "right" })[c]!,
      ).join(" "),
    };
    if (
      !["matrix", "array", "pmatrix", "cases"].includes(name) ||
      (name === "array" && t.align !== "c")
    )
      attrs.displaystyle = String(t.display);
    else attrs.displaystyle = String(t.display);
    if (name === "matrix" || name === "pmatrix") attrs.columnalign = "center";
    if (t.plan.columns.slice(1).some((c) => c.separator))
      attrs.columnlines = t.plan.columns
        .slice(1)
        .map((c) =>
          c.separator === "|"
            ? "solid"
            : c.separator === ":"
              ? "dashed"
              : "none",
        )
        .join(" ");
    if (t.plan.columns.some((c) => c.width !== "auto"))
      attrs.columnwidth = t.plan.columns.map((c) => c.width).join(" ");
    if (t.plan.columns.some((c) => c.insert)) {
      attrs.columnspacing = t.plan.columns
        .slice(1)
        .map((c, i) =>
          t.plan.columns[i].insert
            ? t.plan.columns[i].gap
            : c.insert
              ? c.gap
              : "1em",
        )
        .join(" ");
      if (t.plan.columns.at(-1)?.insert !== null)
        attrs.columnspacing += " " + t.plan.columns.at(-1)!.gap;
      if (t.plan.padding) attrs["data-array-padding"] = t.plan.padding;
    }
    if (t.rowlines.slice(0, t.rows.length - 1).some(Boolean))
      attrs.rowlines = Array.from(
        { length: t.rows.length - 1 },
        (_, i) => t.rowlines[i] ?? "none",
      ).join(" ");
    if (t.rowspaces.length)
      attrs.rowspacing = Array.from(
        { length: Math.max(t.rows.length, t.rowspaces.length) },
        (_, i) => t.rowspaces[i] ?? (t.rowspacingBase === undefined ? "0.4em" : t.rowspacingBase + "em"),
      ).join(" ");
    const edge = t.plan.left,
      last = t.plan.right;
    let frame = "";
    if (
      edge === "|" &&
      last === "|" &&
      t.top === "solid" &&
      t.bottom === "solid"
    )
      frame = "solid";
    else if (
      edge === ":" &&
      last === ":" &&
      t.top === "solid" &&
      t.bottom === "solid"
    )
      frame = "dashed";
    if (frame) {
      delete attrs["data-frame-styles"];
      attrs.frame = frame;
      attrs.framespacing = t.latex ? ".5em .125em" : ".2em .125em";
    }
    if (t.position) attrs.align = t.position;
    if (name === "displaylines") {
      attrs.displaystyle = "true";
      attrs.rowspacing = ".5em";
    }
    if (name === "eqnarray") {
      const count = Math.max(...t.rows.map((r) => r.length));
      attrs.columnalign = Array.from(
        { length: count },
        (_, i) => ["right", "center", "left"][i % 3],
      ).join(" ");
      attrs.columnspacing = Array.from({ length: count - 1 }, (_, i) =>
        i % 2 === 0 ? "0em" : "0.278em",
      ).join(" ");
      attrs["data-break-align"] = Array.from(
        { length: count },
        (_, i) => ["bottom", "middle", "top"][i % 3],
      ).join(" ");
      attrs.rowspacing = "3pt";
      if (!t.tableBreak) delete attrs["data-break-align"];
    }
    if (attrs.columnalign === "center") delete attrs.columnalign;
    if (attrs.displaystyle === "false") delete attrs.displaystyle;
    if (
      name === "array" ||
      name === "matrix" ||
      name === "pmatrix" ||
      name === "cases"
    ) {
      attrs["data-frame-styles"] = "";
      attrs.framespacing = t.latex ? ".5em .125em" : ".2em .125em";
    }
    if (name === "leqalignno") attrs.side = "left";
    const table = this.node(
      K.mtable,
      t.rows.map((c, rowIndex) => {
        if (name === "eqnarray") {
          for (let i = 0; i < c.length; i++) {
            if (i % 3 === 1) c[i].children.unshift(this.node(K.mi));
            if (i % 3 === 2)
              c[i].children = [
                this.node(K.mstyle, c[i].children, "", { indentshift: ".7em" }),
              ];
          }
        }
        if (name === "eqalignno" || name === "leqalignno") {
          const label = c.pop() ?? this.node(K.mtd);
          return this.node(K.mlabeledtr, [label, ...c]);
        }
        if (t.tagCells.has(rowIndex))
          return this.node(K.mlabeledtr, [t.tagCells.get(rowIndex)!, ...c]);
        return this.node(
          K.mtr,
          c,
          "",
          t.rowBreak[rowIndex]
            ? { "data-break-align": t.rowBreak[rowIndex] }
            : {},
        );
      }),
      "",
      attrs,
    );
    if (table.children.some((row) => row.kind === K.mlabeledtr)) {
      if (this.options.tagSide && this.options.tagSide !== "right")
        table.attributes.side = this.options.tagSide;
      if (this.options.tagIndent && this.options.tagIndent !== "0.8em")
        table.attributes.minlabelspacing = this.options.tagIndent;
    }
    let result: Node = table;
    const sides: string[] = [];
    if (edge === "|" || edge === ":") sides.push("left");
    if (last === "|" || last === ":") sides.push("right");
    if (t.top) sides.push("top");
    if (t.bottom) sides.push("bottom");
    if (frame === "solid") delete table.attributes["data-frame-styles"];
    if (
      frame === "dashed" ||
      (edge === "|" && last === ":") ||
      (edge === ":" && last === "|")
    ) {
      delete table.attributes.frame;
      table.attributes["data-frame-styles"] = [
        t.top || "none",
        last === ":" ? "dashed" : last === "|" ? "solid" : "none",
        t.bottom || "none",
        edge === ":" ? "dashed" : edge === "|" ? "solid" : "none",
      ].join(" ");
      return table;
    }
    if (sides.length && !frame) {
      const enclose = this.node(K.menclose, [table], "", {
        notation: sides.join(" "),
        "data-padding": "0",
      });
      table.attributes.framespacing = t.latex ? ".5em .125em" : ".2em .125em";
      result = enclose;
    }
    if (name === "pmatrix")
      result = this.atom(
        [
          this.delimiterNode("(", "", "OPEN"),
          result,
          this.delimiterNode(")", "", "CLOSE"),
        ],
        "INNER",
      );
    if (name === "cases")
      result = this.atom(
        [
          this.delimiterNode("{", "", "OPEN"),
          result,
          this.delimiterNode("", "", "CLOSE"),
        ],
        "INNER",
      );
    return result;
  }
  run(): MathMLNode {
    while (this.frames.length) {
      while (this.f?.single && this.f.nodes.length) this.close();
      if (!this.frames.length) break;
      const t = this.stream.next();
      if (!t) {
        if (this.frames.length !== 1)
          this.error(
            this.f.env ? `Missing \\end{${this.f.env}}` : "Missing close brace",
          );
        this.close();
        break;
      }
      this.position = t[1];
      const c = t[0];
      if (c === 0 && this.f.stop === -2) {
        this.close();
        continue;
      }
      if (c === this.f.stop) {
        this.close();
        continue;
      }
      if (space(c)) continue;
      switch (c) {
        case 123:
          this.frame(125, false, (n) => this.append(this.atom(n)));
          continue;
        case 125:
          this.error("Extra close brace or missing open brace");
        case 94:
          this.script(true);
          continue;
        case 95:
          this.script(false);
          continue;
        case 39:
        case 0x2019:
          this.script(true, true);
          continue;
        case 35:
          this.error(
            "You can't use 'macro parameter character #' in math mode",
          );
        case 38: {
          const f = this.f;
          if (!f.table) this.error("Misplaced &");
          this.finishCell(f.table, f.nodes);
          f.nodes = [];
          f.font = f.table.originalFont;
          if (f.table.latex) this.startCell(f.table);
          continue;
        }
        case -5: {
          const text =
            spelling(t) === "<" ? "⟨" : spelling(t) === ">" ? "⟩" : spelling(t);
          const n = this.node(K.mo, [], text, {
            fence: "false",
            stretchy: "false",
          });
          n.rawAttrs = true;
          this.append(n);
          continue;
        }
        case 126:
          this.append(this.node(K.mtext, [], "\u00a0"));
          continue;
        case -1:
        case -3: {
          const id = commandId(t),
            d = definitions[id],
            name = d?.name ?? spelling(t),
            m =
              c === -1 && this.macros.size ? this.macros.get(name) : undefined;
          if (m) {
            this.expand(m);
            continue;
          }
          const registered =
            id < 0
              ? this.configuration.extensions.get(name)
              : this.configuration.commands[id];
          if (!registered) this.error(`Undefined control sequence \\${name}`);
          registered.execute(this, t, registered.definition, id);
          continue;
        }
      }
      if (
        isDigit(c) ||
        (this.options.numberPattern !== undefined && (c === 44 || c === 46)) ||
        (c === (this.options.decimalSeparator === "," ? 44 : 46) &&
          isDigit(this.stream.peek()?.[0] ?? 0))
      ) {
        this.append(this.number(t));
        continue;
      }
      let n = this.character(t);
      if (this.f.multi && n.kind === K.mi && letter(c)) {
        if (this.options.identifierPattern instanceof RegExp) {
          const pattern = this.options.identifierPattern;
          pattern.lastIndex = t[1];
          const match = pattern.exec(t[3]);
          if (match && match[0].length) {
            const end = t[1] + match[0].length;
            let cursor = t[2];
            while (cursor < end) {
              const next = this.stream.peek();
              if (!next || next[3] !== t[3] || next[1] !== cursor) break;
              cursor = next[2];
              n.text += spelling(this.stream.next()!);
            }
          }
        } else
          while (this.stream.peek() && letter(this.stream.peek()![0]))
            n.text += spelling(this.stream.next()!);
        if (n.text.length > 1 && n.attributes.mathvariant === "normal")
          n.attributes["data-mjx-auto-op"] = "false";
      }
      this.append(n);
    }
    if (this.numbered && !this.hasTaggableEnvironment && this.options.display)
      this.result = [
        this.node(
          K.mtable,
          [
            this.node(K.mlabeledtr, [
              this.labelCell(this.label),
              this.node(K.mtd, this.result),
            ]),
          ],
          "",
          {
            displaystyle: "true",
            ...(this.options.tagSide && this.options.tagSide !== "right"
              ? { side: this.options.tagSide }
              : {}),
            ...(this.options.tagIndent && this.options.tagIndent !== "0.8em"
              ? { minlabelspacing: this.options.tagIndent }
              : {}),
          },
        ),
      ];
    if (this.envStack.length)
      this.error(`Missing \\end{${this.envStack.at(-1)}}`);
    for (const [label, value] of this.localLabels)
      this.session.labels.set(label, value);
    this.finish(this.result);
    return expose(
      this.node(K.math, this.result, "", {
        xmlns: NS,
        ...(this.options.display && !this.inline ? { display: "block" } : {}),
        ...(this.hsize ? { maxwidth: this.hsize, overflow: "linebreak" } : {}),
      }),
    );
  }
  linebreak() {
    if (this.stream.peek()?.[0] === 42) this.stream.next();
    const spacing = this.optional();
    const f = this.f;
    if (f.table) {
      const t = f.table;
      this.finishCell(t, f.nodes);
      t.rows.push(t.cells);
      this.tagRow(t);
      t.cells = [];
      f.nodes = [];
      f.font = t.originalFont;
      if (spacing)
        t.rowspaces[t.rows.length - 1] = t.rowspacingBase === undefined
          ? em(dimensionEm(raw(spacing)) + 0.4)
          : (dimensionEm(raw(spacing)) + t.rowspacingBase) + "em";
      if (t.latex) this.startCell(t);
      return;
    }
    this.append(
      this.node(K.mspace, [], "", {
        linebreak: "newline",
        ...(spacing
          ? { "data-lineleading": raw(spacing).replace(",", ".") }
          : {}),
      }),
    );
  }
  decorationBase(n: Node): Node {
    if (n.kind === K.mo && n.limits > 0) {
      n.attributes.movablelimits = "false";
      n.limits = 0;
      return n;
    }
    if (
      (n.limits !== 0 || n.children[0]?.attributes.movablelimits === "false") &&
      [K.munder, K.mover, K.munderover].includes(n.kind)
    ) {
      const b = n.children[0];
      b.attributes.lspace = "0";
      b.attributes.rspace = "0";
      return this.row([this.node(K.mo, [], "", { rspace: "0" }), n], true);
    }
    return n;
  }
  clean(n: Node, index: number, length: number) {
    if (n.rawAttrs) return;
    const a = n.attributes;
    const defaults =
      n.kind === K.mo
        ? (operator(
            n.text,
            index === 0 && length > 1
              ? "prefix"
              : index === length - 1 && length > 1
                ? "postfix"
                : "infix",
          )?.[3] ?? {})
        : {};
    if (n.kind === K.mo && a.stretchy === "true" && defaults.stretchy)
      delete a.stretchy;
    if (n.fixed) {
      if (defaults.stretchy) a.stretchy = "false";
      else if (n.text !== "|" && n.text !== "‖") delete a.stretchy;
    }
    if (!n.rawAttrs && n.kind === K.mo) {
      for (const key of [
        "fence",
        "largeop",
        "movablelimits",
        "symmetric",
        "accent",
      ])
        if (a[key] === String(defaults[key] ?? false)) delete a[key];
    }
    if (a.mathvariant?.startsWith("-tex-")) {
      a["data-mjx-variant"] = a.mathvariant;
      a.mathvariant = a.mathvariant.includes("calligraphic")
        ? a.mathvariant.includes("bold")
          ? "bold-script"
          : "script"
        : a.mathvariant === "-tex-oldstyle"
          ? "normal"
          : "italic";
    }
    if (
      a.mathvariant === "italic" &&
      n.kind === K.mi &&
      Array.from(n.text).length === 1 &&
      !a["data-mjx-variant"]
    )
      delete a.mathvariant;
    if (
      !n.rawAttrs &&
      !a["data-mjx-variant"] &&
      a.mathvariant === "normal" &&
      (n.kind === K.mo ||
        n.kind === K.mn ||
        n.kind === K.mtext ||
        (n.kind === K.mi && Array.from(n.text).length > 1))
    )
      delete a.mathvariant;
  }
  finish(nodes: Node[]) {
    const stack: { children: Node[]; sequence: boolean }[] = [
      { children: nodes, sequence: true },
    ];
    while (stack.length) {
      const { children, sequence } = stack.pop()!;
      for (let i = 0; i < children.length; i++) {
        const n = children[i];
        if (n.children.length)
          stack.push({
            children: n.children,
            sequence: [
              K.math,
              K.mrow,
              K.mtd,
              K.mstyle,
              K.mpadded,
              K.msqrt,
              K.mphantom,
              K.menclose,
            ].includes(n.kind),
          });
        this.clean(n, i, children.length);
        if (
          [K.msub, K.msup, K.msubsup, K.munder, K.mover, K.munderover].includes(
            n.kind,
          )
        )
          n.children[0].op = 0;
        if (
          sequence &&
          n.op &&
          i + 1 < children.length &&
          (n.text || hasContent(n))
        ) {
          const next = children[i + 1];
          if (
            next.kind === K.mi ||
            next.kind === K.mn ||
            next.kind === K.mrow ||
            (next.kind === K.mo && "([{|".includes(next.text))
          ) {
            children.splice(
              ++i,
              0,
              this.node(K.mo, [], "⁡", { "data-mjx-texclass": "NONE" }),
            );
          }
        }
        if (sequence && n.kind === K.mo && n.relation) {
          while (i + 1 < children.length) {
            const next = children[i + 1];
            if (!next.relation) break;
            this.clean(next, i + 1, children.length);
            if (!compatible(n.attributes, next.attributes)) {
              n.attributes.rspace ??= "0pt";
              next.attributes.lspace ??= "0pt";
              break;
            }
            if (next.attributes.stretchy === "false")
              n.attributes.stretchy = "false";
            n.text += next.text;
            n.attributes["data-mjx-texclass"] = "REL";
            children.splice(i + 1, 1);
          }
        }
      }
    }
  }
}
function parseOne(
  tex: string,
  options: ParseOptions,
  configuration: PackageConfiguration,
  state: SessionState,
): MathMLNode {
  if (typeof tex !== "string")
    throw new TypeError("TeX input must be a string");
  try {
    return new Parser(tex, options, configuration, state).run();
  } catch (error) {
    if (
      !(error instanceof ParseError) &&
      !(error instanceof Error && error.message === "Token limit exceeded")
    )
      throw error;
    if (options.throwOnError) throw error;
    const message = (error as Error).message;
    return {
      kind: "math",
      attributes: {
        xmlns: NS,
        ...(options.display ? { display: "block" } : {}),
      },
      children: [
        {
          kind: "merror",
          attributes: { "data-mjx-error": message },
          children: [
            {
              kind: "mtext",
              attributes: {},
              children: [],
              text: message,
              start: 0,
            },
          ],
          text: "",
          start: 0,
        },
      ],
      text: "",
      start: 0,
    };
  }
}
export interface MathMLParserSession {
  parse(tex: string, options?: { display?: boolean }): MathMLNode;
}
export function createMathMLParser(
  input: ParseOptions = {},
): MathMLParserSession {
  const { options, configuration } = configure(input),
    state = sessionState();
  const parse = (tex: string, overrides: { display?: boolean } = {}) =>
    parseOne(tex, { ...options, ...overrides }, configuration, state);
  for (const previous of options.prior ?? [])
    parse(previous.tex, { display: previous.display ?? options.display });
  return { parse };
}
export function parseToMathMLAst(
  tex: string,
  options: ParseOptions = {},
): MathMLNode {
  return createMathMLParser(options).parse(tex);
}
