import type { Parser } from "../parser.js";
import type { TexPackage, TexEnvironment } from "./types.js";
import type { Token } from "../scanner.js";
import type { Definition } from "../symbols.js";
import { K } from "../ast.js";
import { C, definitions } from "../symbols.js";
import { scan, raw, spelling, builtin } from "../scanner.js";
import {
  em,
  operator,
  accents,
  underover,
  relationChars,
  negated,
  commandId,
} from "../mathml.js";
type Attrs = Record<string, string>;

function executeBase(parser: Parser, t: Token, d: Definition, id: number) {
  if (d.name === "uproot" || d.name === "leftroot") parser.error(`\\${d.name} can appear only within a root`);
  const name = d.name;
  if (d.char !== undefined) {
    parser.append(parser.symbol(t, id, d));
    return;
  }
  const args = d.args ?? [];
  if (d.type === "MathFont") {
    const font = String(args[0]);
    parser.argument((n) =>
      parser.append(
        parser.atom(
          n.kind === K.mrow && !n.attributes["data-mjx-texclass"]
            ? n.children
            : [n],
        ),
      ),
    );
    parser.f.font = font;
    parser.f.multi = true;
    return;
  }
  if (d.type === "SetFont") {
    parser.f.font = String(args[0]);
    return;
  }
  if (d.type === "SetStyle" || d.type === "SetSize") {
    const attrs: Attrs =
      d.type === "SetSize"
        ? { mathsize: String(args[0]) + "em" }
        : { displaystyle: String(args[1]), scriptlevel: String(args[2]) };
    const f = parser.f;
    const existing = f.nodes;
    f.nodes = [];
    if (d.type === "SetStyle") {
      if (args[2] === 0) delete attrs.scriptlevel;
      if (args[1] === false && args[2] !== 2 && !f.display)
        delete attrs.displaystyle;
    }
    parser.frame(f.stop, false, (n) => {
      parser.frames.push(f);
      f.nodes = [
        ...existing,
        ...(Object.keys(attrs).length
          ? [parser.node(K.mstyle, n, "", attrs)]
          : n),
      ];
      parser.close();
    });
    parser.frames.splice(parser.frames.length - 2, 1);
    parser.f.display = d.type === "SetStyle" ? Boolean(args[1]) : f.display;
    parser.f.level = d.type === "SetStyle" ? Number(args[2]) : f.level;
    return;
  }
  if (d.type === "NamedFn" || d.type === "NamedOp") {
    const op = d.type === "NamedOp";
    const n = parser.node(
      op ? K.mo : K.mi,
      [],
      String(args[0] ?? name).replaceAll("&thinsp;", "\u2006"),
      op ? { movablelimits: "true" } : {},
    );
    if (op) n.attributes["data-mjx-texclass"] = "OP";
    n.op = 1;
    n.limits = op ? 1 : 0;
    parser.append(n);
    return;
  }
  if (d.type === "HBox") {
    parser.renderText(
      parser.tokensArgument(),
      String(args[1] ?? ""),
      args[0] === 0,
    );
    return;
  }
  if (d.type === "Spacer") {
    let n = parser.node(K.mspace, [], "", { width: em(Number(args[0])) });
    if (parser.f.level > 0)
      n = parser.node(K.mstyle, [n], "", { scriptlevel: "0" });
    parser.append(n);
    return;
  }
  if (d.type === "Accent") {
    const glyph =
      accents[name] ?? String.fromCodePoint(parseInt(String(args[0]), 16));
    parser.argument((n) => {
      const a: Attrs = {};
      if (args[1] !== true && operator(glyph)?.[3]?.stretchy)
        a.stretchy = "false";
      if (name === "acute" || name === "grave")
        a["data-mjx-pseudoscript"] = "true";
      if (parser.f.font) a.mathvariant = parser.f.font;
      const mo = parser.node(K.mo, [], glyph, a);
      const mover = parser.node(K.mover, [n, mo]);
      parser.append(parser.atom([mover]));
    });
    return;
  }
  if (d.type === "UnderOver") {
    let glyph =
      underover[name] ?? String.fromCodePoint(parseInt(String(args[0]), 16));
    const under = name.startsWith("under");
    parser.argument((n) => {
      const a: Attrs = {};
      if (name.includes("line")) {
        a.accent = "true";
        glyph = "―";
      }
      const mo = parser.node(K.mo, [], glyph, a);
      const b = parser.decorationBase(n);
      const x = parser.node(under ? K.munder : K.mover, [b, mo]);
      if (args[1]) {
        const w = parser.atom([x], "OP");
        w.limits = 2;
        parser.append(w);
      } else parser.append(x);
    });
    return;
  }
  if (d.type === "MakeBig") {
    const delim = parser.delimiter(),
      size =
        String(Number(args[1]) * (1.2 / 0.85)).replace(/(\.\d\d\d).+/, "$1") +
        "em";
    parser.append(
      parser.atom(
        [parser.delimiterNode(delim, size)],
        ["ORD", "OP", "BIN", "REL", "OPEN", "CLOSE", "PUNCT", "INNER"][
          Number(args[0])
        ],
      ),
    );
    return;
  }
  if (d.type === "Macro" && id !== C.boxed) {
    parser.expand({
      body: scan(String(args[0])),
      count: Number(args[1] ?? 0),
      optional: null,
      prefix: [],
      delimiters: [],
    });
    return;
  }
  baseCommand(parser, id, name);
  return;
}
function baseCommand(parser: Parser, id: number, name: string) {
  switch (id) {
    case C.newcolumntype: {
      const name = raw(parser.tokensArgument()),
        count = Number(raw(parser.optional() ?? []) || "0"),
        body = raw(parser.tokensArgument());
      parser.columns.set(name, { count, body });
      return;
    }
    case C.breakAlign: {
      const scope = raw(parser.tokensArgument()),
        value = raw(parser.tokensArgument()),
        t = parser.f.table;
      if (!t) parser.error("Misplaced breakAlign");
      const align = Array.from(
        value,
        (c) =>
          (
            ({ t: "top", b: "bottom", m: "middle", c: "center" }) as Record<
              string,
              string
            >
          )[c] ?? c,
      ).join(" ");
      if (scope === "c")
        t.cellBreak[t.rows.length + ":" + t.cells.length] = align;
      else if (scope === "r") t.rowBreak[t.rows.length] = align;
      else t.tableBreak = false;
      return;
    }
    case C.mathchoice: {
      const choices = [
        parser.tokensArgument(),
        parser.tokensArgument(),
        parser.tokensArgument(),
        parser.tokensArgument(),
      ];
      parser.stream.push(
        choices[parser.f.display ? 0 : Math.min(3, parser.f.level + 1)],
      );
      return;
    }
    case C.buildrel: {
      const top = parser.tokensArgument();
      parser.stream.skip();
      if (builtin(parser.stream.next()!) !== C.over)
        parser.error("Missing \\over for \\buildrel");
      parser.argument((base) =>
        parser.parseTokens(top, (n) =>
          parser.append(
            parser.atom(
              [parser.node(K.mover, [base, parser.atom([n])])],
              "REL",
            ),
          ),
        ),
      );
      return;
    }
    case C.hsize: {
      parser.stream.skip();
      if (parser.stream.peek()?.[0] === 61) parser.stream.next();
      parser.hsize = parser.dimension();
      return;
    }
    case C.vtop:
    case C.vcenter:
    case C.vbox: {
      const position =
        id === C.vtop ? "top" : id === C.vbox ? "bottom" : "center";
      parser.argument((n) =>
        parser.append(
          parser.node(K.mpadded, [n], "", {
            "data-mjx-texclass": "ORD",
            "data-mjx-vbox": position,
            "data-vertical-align": position,
            ...(parser.hsize
              ? { width: parser.hsize, "data-overflow": "linebreak" }
              : {}),
          }),
        ),
      );
      return;
    }
    case C.parbox: {
      const width = raw(parser.tokensArgument());
      parser.append(
        parser.node(K.mpadded, [parser.text(parser.tokensArgument())], "", {
          "data-mjx-vbox": "center",
          width,
          "data-overflow": "linebreak",
          "data-vertical-align": "center",
        }),
      );
      return;
    }
    case C.framebox:
    case C.makebox: {
      const width = parser.optional();
      const align = width ? raw(parser.optional() ?? scan("c")) : "c";
      const a: Attrs = {
        ...(width ? { width: raw(width) } : {}),
        "data-align":
          ({ l: "left", r: "right", c: "center" } as Record<string, string>)[
            align.toLowerCase()
          ] ?? "center",
        ...(align === align.toUpperCase()
          ? { "data-overflow": "linebreak" }
          : {}),
      };
      let n = parser.text(parser.tokensArgument());
      if (id === C.makebox || width) n = parser.node(K.mpadded, [n], "", a);
      if (id === C.framebox)
        n = parser.atom([
          parser.node(K.menclose, [n], "", { notation: "box" }),
        ]);
      parser.append(n);
      return;
    }
    case C.rule:
    case C.Rule:
    case C.Space: {
      const offset = id === C.rule ? raw(parser.optional() ?? []) : "";
      const width = raw(parser.tokensArgument());
      if (!width) parser.error(`Missing dimension or its units for \\${name}`);
      const height = raw(parser.tokensArgument()),
        depth = id !== C.rule ? raw(parser.tokensArgument()) : "";
      let n = parser.node(K.mspace, [], "", {
        width,
        height,
        ...(depth ? { depth } : {}),
        ...(id !== C.Space ? { mathbackground: "black" } : {}),
      });
      if (offset)
        n = parser.node(K.mpadded, [n], "", {
          voffset: offset,
          height: offset.startsWith("-") ? offset : "+" + offset,
          ...(offset.startsWith("-") ? { depth: "+" + offset.slice(1) } : {}),
        });
      parser.append(n);
      return;
    }
    case C.frac:
      parser.args(2, (n) => parser.append(parser.node(K.mfrac, n)));
      return;
    case C.sqrt: {
      let root = parser.optional();
      const shift:Attrs={};
      if(root) {
        const input=raw(root), seen=new Set<string>();
        root=scan(input.replace(/\\(leftroot|uproot)\s*(?:\{([^}]*)\}|([^\s{}]+))/g,(_,name,group,bare)=>{
          if(seen.has(name))parser.error(`Multiple use of \\${name}`);seen.add(name);
          const value=group??bare;if(!/^[+-]?\d+$/.test(value))parser.error(`The argument to \\${name} must be an integer`);
          const em=Number(value)/15,amount=(em>=0?"+":"")+em+"em";
          if(name==="leftroot")shift.width=amount;else {shift.voffset=amount;shift.height=amount;}
          return "";
        }));
      }
      parser.argument((n) => {
        if (root)
          parser.parseTokens(root, (r) =>
            parser.append(parser.node(K.mroot, [n, Object.keys(shift).length ? parser.node(K.mpadded,[r],"",shift) : r])),
          );
        else
          parser.append(
            parser.node(K.msqrt, n.kind === K.mrow ? n.children : [n]),
          );
      });
      return;
    }
    case C.root: {
      const root: Token[] = [];
      let depth=0;
      while(parser.stream.peek()) {
        const next=parser.stream.next()!;
        if(next[0]===123)depth++;if(next[0]===125&&--depth<0)parser.error("Extra close brace while looking for \\of");
        if(depth===0&&builtin(next)===C.of)break;
        root.push(next);
      }
      if (!parser.stream.peek() || depth) parser.error("Could not find \\of for \\root");
      parser.argument((n) =>
        parser.parseTokens(root, (r) =>
          parser.append(parser.node(K.mroot, [n, r])),
        ),
      );
      return;
    }
    case C.left: {
      const delim = parser.delimiter();
      parser.frame(
        -4,
        false,
        (n) =>
          parser.append(
            parser.atom(
              [parser.delimiterNode(delim, "", "OPEN"), ...n],
              "INNER",
            ),
          ),
        "left",
      );
      return;
    }
    case C.right: {
      const delim = parser.delimiter();
      if (parser.f.env !== "left") parser.error("Missing \\left or extra \\right");
      parser.f.nodes.push(parser.delimiterNode(delim, "", "CLOSE"));
      parser.close();
      return;
    }
    case C.middle: {
      const d = parser.delimiter();
      if (parser.f.env !== "left") parser.error("Extra \\middle");
      parser.append(parser.atom([], "CLOSE"));
      parser.append(
        parser.node(K.mo, [], d, { stretchy: "true", symmetric: "true" }),
      );
      parser.append(parser.atom([], "OPEN"));
      return;
    }
    case C.begin: {
      const name = raw(parser.tokensArgument()).trim();
      if (name.includes("\\")) parser.error(`Invalid environment name '${name}'`);
      const custom = parser.environments.get(name);
      if (custom) {
        parser.envStack.push(name);
        parser.expand(custom.begin);
        return;
      }
      const entry = parser.configuration.environments.get(name);
      if (!entry) parser.error(`Unknown environment '${name}'`);
      entry.begin(parser, name);
      return;
    }
    case C.end: {
      const name = raw(parser.tokensArgument()).trim();
      const custom = parser.environments.get(name);
      if (custom) {
        const index = parser.envStack.lastIndexOf(name);
        if (index < 0) parser.error(`Missing \\begin{${name}}`);
        parser.envStack.splice(index, 1);
        parser.stream.push(custom.end.body);
        return;
      }
      if (!parser.f.env) parser.error(`Missing \\begin{${name}} or extra \\end{${name}}`);
      if (parser.f.env !== name)
        parser.error(`\\begin{${parser.f.env}} ended with \\end{${name}}`);
      const environment = parser.configuration.environments.get(name);
      if (environment?.end) {
        environment.end(parser, name);
        return;
      }
      parser.close();
      return;
    }
    case C.over:
    case C.atop:
    case C.above:
    case C.choose:
    case C.brack:
    case C.brace:
    case C.overwithdelims:
    case C.atopwithdelims:
    case C.abovewithdelims: {
      const f = parser.f;
      if (f.fraction) parser.error(`Ambiguous use of \\${name}`);
      let left = "",
        right = "";
      if (name.includes("withdelims")) {
        left = parser.delimiter();
        right = parser.delimiter();
      }
      if (id === C.choose) {
        left = "(";
        right = ")";
      }
      if (id === C.brack) {
        left = "[";
        right = "]";
      }
      if (id === C.brace) {
        left = "{";
        right = "}";
      }
      const attrs: Attrs = {};
      if (id !== C.over && id !== C.overwithdelims)
        attrs.linethickness = name.startsWith("above")
          ? parser.dimension()
          : "0";
      f.fraction = { num: f.nodes, attrs, left, right };
      f.nodes = [];
      return;
    }
    case C.text:
    case C.mbox:
    case C.hbox:
      parser.renderText(parser.tokensArgument(), parser.f.font, id !== C.text);
      return;
    case C.limits:
    case C.nolimits:
    case C.displaylimits: {
      const n = parser.f.nodes.at(-1);
      if (!n) parser.error("Limits controls must follow a math operator");
      const b = [
        K.msub,
        K.msup,
        K.msubsup,
        K.munder,
        K.mover,
        K.munderover,
      ].includes(n.kind)
        ? n.children[0]
        : n;
      if (!b.limits && !b.op && !(b.kind === K.mo && operator(b.text)?.[3]?.largeop)) parser.error(`\\${name} is allowed only on operators`);
      b.limits = id === C.nolimits ? -1 : id === C.limits ? 2 : 1;
      if (id === C.limits && b.kind === K.mo)
        b.attributes.movablelimits = "false";
      if (id === C.nolimits) delete b.attributes.movablelimits;
      n.limits = b.limits;
      if (n !== b) {
        const under = b.limits > 0 && (parser.f.display || b.limits === 2);
        const map: Partial<Record<K, K>> = under
          ? { [K.msub]: K.munder, [K.msup]: K.mover, [K.msubsup]: K.munderover }
          : {
              [K.munder]: K.msub,
              [K.mover]: K.msup,
              [K.munderover]: K.msubsup,
            };
        n.kind = map[n.kind] ?? n.kind;
      }
      return;
    }
    case C.not:
      parser.argument((n) => {
        if (n.kind === K.mo && n.text.length <= 2) {
          n.text = negated[n.text] ?? n.text + "̸";
          parser.append(n);
        } else {
          parser.append(
            parser.atom(
              [
                parser.node(K.mpadded, [parser.node(K.mtext, [], "⧸")], "", {
                  width: "0",
                }),
              ],
              "REL",
            ),
          );
          parser.append(n);
        }
      });
      return;
    case C.overset:
    case C.underset:
    case C.overunderset:
    case C.stackrel:
    case C.stackbin: {
      parser.args(id === C.overunderset ? 3 : 2, (n) => {
        const over = id !== C.underset,
          base = n.at(-1)!;
        base.limits = 0;
        const attrs: Attrs = {};
        if (n[0].kind === K.mo && operator(n[0].text)?.[3]?.accent)
          attrs[over ? "accent" : "accentunder"] = "true";
        if (
          id === C.overunderset &&
          n[1].kind === K.mo &&
          operator(n[1].text)?.[3]?.accent
        )
          attrs.accentunder = "true";
        let result = parser.node(
          id === C.overunderset ? K.munderover : over ? K.mover : K.munder,
          id === C.overunderset ? [base, n[1], n[0]] : [base, n[0]],
          "",
          attrs,
        );
        if (id === C.stackrel || id === C.stackbin)
          result = parser.atom([result], id === C.stackbin ? "BIN" : "REL");
        parser.append(result);
      });
      return;
    }
    case C.mathop:
    case C.mathord:
    case C.mathrel:
    case C.mathbin:
    case C.mathopen:
    case C.mathclose:
    case C.mathpunct:
    case C.mathinner: {
      parser.argument((n) => {
        const x =
          id === C.mathop &&
          n.kind === K.mi &&
          !!n.attributes.mathvariant &&
          !n.attributes.mathvariant.startsWith("-tex-")
            ? n
            : n.kind === K.mrow && n.children.length === 0
              ? n
              : parser.row(n.kind === K.mrow ? n.children : [n], true);
        x.attributes["data-mjx-texclass"] = name.slice(4).toUpperCase();
        if (id === C.mathop) {
          x.op = n.text || n.children.length ? 1 : 0;
          x.limits = 1;
        }
        parser.append(x);
      });
      return;
    }
    case C.mmlToken: {
      const kind = raw(parser.tokensArgument()),
        attrs = raw(parser.optional() ?? []),
        text = raw(parser.tokensArgument());
      const tag = (
        { mi: K.mi, mo: K.mo, mn: K.mn, mtext: K.mtext } as Record<string, K>
      )[kind];
      if (tag === undefined) parser.error(`${kind} is not a token element`);
      const invalid = attrs.match(/(?:^|,)\s*([^=, ]+)\s*=/)?.[1];
      if (invalid && !/^[a-z]+$/i.test(invalid)) parser.error(`Invalid MathML attribute: ${invalid}`);
      const a: Attrs = {};
      for (const m of attrs.matchAll(
        /([a-zA-Z]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^,\s]+))/g,
      )) {
        if (
          ![
            "mathvariant",
            "mathsize",
            "largeop",
            "movablelimits",
            "lspace",
            "rspace",
            "stretchy",
            "fence",
            "symmetric",
            "accent",
            "mathcolor",
            "mathbackground",
          ].includes(m[1])
        )
          parser.error(`${m[1]} is not a recognized attribute for ${kind}`);
        a[m[1]] = m[2] ?? m[3] ?? m[4];
      }
      const token = parser.node(tag, [], text, a);
      token.rawAttrs = true;
      parser.append(token);
      return;
    }
    case C.hskip:
    case C.hspace:
    case C.kern:
    case C.mskip:
    case C.mspace:
    case C.mkern: {
      let width = parser.dimension();
      if (width.endsWith("mu")) width = em(parseFloat(width) / 18);
      parser.append(
        parser.node(K.mspace, [], "", {
          width,
          ...(id === C.kern || id === C.mkern ? { linebreak: "nobreak" } : {}),
        }),
      );
      return;
    }
    case C.phantom:
    case C.vphantom:
    case C.hphantom:
      parser.argument((n) => {
        let result = parser.node(K.mphantom, [n]);
        if (id !== C.phantom)
          result = parser.node(
            K.mpadded,
            [result],
            "",
            id === C.vphantom ? { width: "0" } : { height: "0", depth: "0" },
          );
        parser.append(parser.atom([result]));
      });
      return;
    case C.smash: {
      const opt = raw(parser.optional() ?? []);
      parser.argument((n) =>
        parser.append(
          parser.atom([
            parser.node(
              K.mpadded,
              [n],
              "",
              opt === "b"
                ? { depth: "0" }
                : opt === "t"
                  ? { height: "0" }
                  : { height: "0", depth: "0" },
            ),
          ]),
        ),
      );
      return;
    }
    case C.llap:
    case C.rlap:
      parser.argument((n) =>
        parser.append(
          parser.atom([
            parser.node(
              K.mpadded,
              n.kind === K.mrow && !n.attributes["data-mjx-texclass"]
                ? n.children
                : [n],
              "",
              id === C.llap
                ? { width: "0", lspace: "-1width" }
                : { width: "0" },
            ),
          ]),
        ),
      );
      return;
    case C.raise:
    case C.lower:
    case C.moveleft:
    case C.moveright: {
      let amount = parser.dimension();
      parser.stream.skip();
      if (!parser.stream.peek()) parser.error(`Missing box for \\${name}`);
      if (id === C.lower || id === C.moveleft)
        amount = amount.startsWith("-") ? amount.slice(1) : "-" + amount;
      if (!amount.startsWith("-") && !amount.startsWith("+"))
        amount = "+" + amount;
      if (id === C.moveleft || id === C.moveright) {
        const w = amount.startsWith("+") ? amount.slice(1) : amount;
        parser.append(parser.node(K.mspace, [], "", { width: w }));
        parser.argument((n) => {
          parser.append(parser.atom([n]));
          parser.append(
            parser.node(K.mspace, [], "", {
              width: w.startsWith("-") ? w.slice(1) : "-" + w,
            }),
          );
        });
      } else
        parser.argument((n) =>
          parser.append(
            parser.node(K.mpadded, [parser.atom([n])], "", {
              height: amount,
              depth: amount.startsWith("-")
                ? "+" + amount.slice(1)
                : "-" + amount.slice(1),
              voffset: amount,
            }),
          ),
        );
      return;
    }
    case C.fbox:
    case C.boxed: {
      if (id === C.boxed)
        parser.argument((n) =>
          parser.append(
            parser.node(K.menclose, [parser.atom([parser.atom([n])])], "", {
              notation: "box",
            }),
          ),
        );
      else
        parser.append(
          parser.node(K.menclose, [parser.text(parser.tokensArgument())], "", {
            notation: "box",
          }),
        );
      return;
    }
    case C.matrix:
    case C.array:
    case C.pmatrix:
    case C.cases:
    case C.eqalign:
    case C.eqalignno:
    case C.leqalignno:
    case C.displaylines: {
      parser.stream.skip();
      const brace = parser.stream.peek()?.[0] === 123;
      if (brace) parser.stream.next();
      parser.tableStart(
        name,
        name.includes("eqalign") ? "rl" : name === "cases" ? "ll" : "c",
        brace ? 125 : 0,
      );
      if (!brace) parser.f.single = true;
      return;
    }
    case C.hline:
    case C.hdashline: {
      const t = parser.f.table;
      if (!t) parser.error("Misplaced \\hline");
      const style = id === C.hline ? "solid" : "dashed";
      if (!t.rows.length && !t.cells.length && !parser.f.nodes.length)
        t.top = style;
      else if (!parser.f.nodes.length && !t.cells.length) {
        t.bottom = style;
        t.rowlines[t.rows.length - 1] = style;
      } else t.rowlines[t.rows.length - 1] = style;
      return;
    }
    case C.hfil:
    case C.hfill:
    case C.hfilll:
      if (!parser.f.table) parser.error(`Unsupported use of \\${name}`);
      if (parser.f.table)
        parser.f.table.fill = parser.f.table.fill
          ? "center"
          : parser.f.nodes.length
            ? "left"
            : "right";
      return;
    case C.cr:
      if (!parser.f.table) parser.error("Misplaced \\cr");
    case C.newline: {
      parser.linebreak();
      return;
    }
    case C.allowbreak:
    case C.goodbreak:
    case C.badbreak:
    case C.nobreak: {
      const value = id === C.allowbreak ? "auto" : name;
      if (id === C.allowbreak) {
        parser.append(parser.node(K.mspace));
        return;
      }
      const previous = parser.f.nodes.at(-1);
      const after =
        previous?.kind === K.mo &&
        operator(previous.text)?.[3]?.linebreakstyle === "after";
      if (after && value !== "auto") previous.attributes.linebreak = value;
      parser.stream.skip();
      const t = parser.stream.peek();
      const d = t ? definitions[commandId(t)] : undefined;
      const glyph = d?.char ?? (t ? spelling(t) : "");
      if (!after || glyph !== ",") parser.pendingBreak = value;
      return;
    }
    case C.break:
      parser.append(parser.node(K.mspace, [], "", { linebreak: "newline" }));
      return;
    case C.label:
      parser.setLabel(raw(parser.tokensArgument()));
      return;
    case C.nonumber:
      if (parser.f.table)
        parser.f.table.noNumbers.add(parser.f.table.rows.length);
      else parser.numbered = false;
      return;
    case C.ref:
      parser.reference(raw(parser.tokensArgument()));
      return;
    case C.nonscript:
      parser.nonscript = true;
      return;
    case C.dots: {
      parser.stream.skip();
      const t = parser.stream.peek(),
        d = t ? definitions[commandId(t)] : undefined;
      const glyph = d?.char ?? (t ? spelling(t) : "");
      parser.append(
        parser.node(
          K.mo,
          [],
          relationChars.has(glyph) || ("+−*∗".includes(glyph) && glyph !== "")
            ? "⋯"
            : "…",
        ),
      );
      return;
    }
    case C["*"]:
      parser.append(parser.node(K.mo, [], "⁢", { linebreakmultchar: "×" }));
      return;
    case C.strut:
      parser.append(
        parser.node(K.mpadded, [parser.row([], true)], "", {
          height: "8.6pt",
          depth: "3pt",
          width: "0",
        }),
      );
      return;
    case C.mathstrut:
      parser.stream.push(scan("\\vphantom{(}"));
      return;
    case C.iff:
      parser.stream.push(scan("\\;\\Longleftrightarrow\\;"));
      return;
  }
  if (name === "\\") {
    parser.linebreak();
    return;
  }
  if (name === " " || name === "space" || name === " ") {
    parser.append(parser.node(K.mtext, [], "\u00a0"));
    return;
  }
  parser.error(`Undefined control sequence \\${name}`);
}

function beginEnvironment(parser: Parser, name: string) {
  if (name === "indentalign") {
    const first = parser.optional(),
      middle = parser.optional(),
      last = parser.optional(),
      align = raw(parser.tokensArgument());
    const attrs: Attrs = {
      indentshiftfirst: raw(first ?? []),
      indentshift: raw(middle ?? first ?? []),
      indentalignfirst: (
        { l: "left", c: "center", r: "right" } as Record<string, string>
      )[align[0]],
      indentalign: (
        { l: "left", c: "center", r: "right" } as Record<string, string>
      )[align[1] ?? align[0]],
    };
    if (align.length > 1)
      attrs.indentalignlast = (
        { l: "left", c: "center", r: "right" } as Record<string, string>
      )[align.at(-1)!];
    if (last) attrs.indentshiftlast = raw(last);
    parser.frame(
      -4,
      false,
      (n) => parser.append(parser.node(K.mstyle, n, "", attrs)),
      name,
    );
    return;
  }
  if (["equation", "eqnarray", "displaymath"].includes(name) && parser.frames.some(f=>["equation","eqnarray","displaymath"].includes(f.env))) parser.error("Erroneous nesting of equation structures");
  if (["array", "darray", "eqnarray"].includes(name)) {
    const pos = parser.optional();
    const align = name === "eqnarray" ? "rcl" : raw(parser.tokensArgument());
    parser.tableStart(name, align, -4);
    if (pos)
      parser.f.table!.position =
        (
          { t: "baseline 1", b: "baseline -1", c: "center" } as Record<
            string,
            string
          >
        )[raw(pos)] ?? raw(pos);
    return;
  }
  if (["math", "equation", "displaymath"].includes(name)) {
    if (name === "math") parser.inline = true;
    parser.frame(
      -4,
      false,
      (n) => {
        for (const x of n) parser.append(x);
      },
      name,
    );
    return;
  }
  parser.error(`Unknown environment '${name}'`);
}
const excluded = new Set([
  "newcommand",
  "renewcommand",
  "def",
  "let",
  "newenvironment",
  "renewenvironment",
  "lvert",
  "rvert",
  "lVert",
  "rVert",
  "color",
  "textcolor",
]);
const environments: Record<string, TexEnvironment> = Object.fromEntries(
  [
    "array",
    "darray",
    "eqnarray",
    "math",
    "equation",
    "displaymath",
    "indentalign",
  ].map((name) => [name, { begin: beginEnvironment }]),
);
export default {
  name: "base",
  commands: Object.fromEntries(
    definitions
      .filter((d) => !excluded.has(d.name))
      .map((d) => [d.name, { ...d, execute: executeBase }]),
  ),
  environments,
  configurationModules: ["input/tex/base/BaseConfiguration.js"],
  options: [
    "digits",
    "numberPattern",
    "identifierPattern",
    "macros",
    "tags",
    "baseURL",
    "useLabelIds",
    "ignoreDuplicateLabels",
    "tagSide",
    "tagIndent",
    "tagAlign",
  ],
} satisfies TexPackage;
