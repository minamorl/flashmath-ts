import type { Parser } from "../parser.js";
import type { TexPackage } from "./types.js";
import type { Token, Macro } from "../scanner.js";
import { raw, spelling, scan, space } from "../scanner.js";
import { C } from "../symbols.js";
import { stretchyChars } from "../mathml.js";

function define(parser: Parser, id: number) {
  const env = id === C.newenvironment || id === C.renewenvironment;
  const name = raw(parser.tokensArgument()).trim().replace(/^\\/, "");
  if (id === C.let) {
    parser.stream.skip();
    if (parser.stream.peek()?.[0] === 61) parser.stream.next();
    parser.stream.skip();
    const token = parser.stream.next();
    if (!token) parser.error("Missing let value");
    const old =
      token[0] === -1 ? parser.macros.get(spelling(token)) : undefined;
    // Snapshot aliases to builtins as source tokens whose names are private to
    // this parse: later redefinition of the original cannot change a let.
    if (old) parser.macros.set(name, old);
    else {
      const frozen: Token =
        token[0] === 123 || token[0] === 125
          ? token
          : token[0] === -1
            ? [-3, token[1], token[2], token[3]]
            : stretchyChars.has(spelling(token)) ||
                "<>".includes(spelling(token))
              ? [-5, token[1], token[2], token[3]]
              : token;
      parser.macros.set(name, {
        body: [frozen],
        count: 0,
        optional: null,
        prefix: [],
        delimiters: [],
      });
    }
    return;
  }
  let count = 0,
    optional: Token[] | null = null,
    prefix: Token[] = [],
    delimiters: Token[][] = [];
  if (id === C.def) {
    let part: Token[] = [];
    parser.stream.skip();
    while (parser.stream.peek() && parser.stream.peek()![0] !== 123) {
      const t = parser.stream.next()!;
      if (t[0] === 35) {
        const n = parser.stream.next();
        if (!n || n[0] !== 49 + count)
          parser.error("Parameters must be numbered sequentially");
        if (count === 0) prefix = part;
        else delimiters[count - 1] = part;
        part = [];
        count++;
      } else part.push(t);
    }
    if (count)
      delimiters[count - 1] =
        part.every((t) => space(t[0])) && delimiters.every((x) => !x.length)
          ? []
          : part;
    else prefix = part;
  } else {
    const n = parser.optional();
    if (n) {
      count = Number(raw(n));
      if (!Number.isInteger(count) || count < 0 || count > (parser.options.maxTokens??200000))
        parser.error("Illegal number of parameters");
      optional = parser.optional();
    }
  }
  const body = parser.tokensArgument();
  const macro: Macro = { body, count, optional, prefix, delimiters };
  if (env)
    parser.environments.set(name, {
      begin: macro,
      end: {
        body: parser.tokensArgument(),
        count: 0,
        optional: null,
        prefix: [],
        delimiters: [],
      },
    });
  else parser.macros.set(name, macro);
}

const names = [
  "newcommand",
  "renewcommand",
  "def",
  "let",
  "newenvironment",
  "renewenvironment",
] as const;
export default {
  name: "newcommand",
  commands: Object.fromEntries(
    names.map((name) => [
      name,
      {
        execute: (p: Parser, _t: Token, _d: unknown, id: number) =>
          define(p, id),
      },
    ]),
  ),
  environments: {},
  configurationModules: ["input/tex/newcommand/NewcommandConfiguration.js"],
} satisfies TexPackage;
