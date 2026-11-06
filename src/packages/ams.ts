/** Delimiter subset used by newcommand compatibility; remaining AMS work is pending. */
import type { TexPackage } from "./types.js";
import type { Parser } from "../parser.js";
import type { Token } from "../scanner.js";
import type { Definition } from "../symbols.js";
import { definitions } from "../symbols.js";
const names = new Set(["lvert", "rvert", "lVert", "rVert"]);
export default {
  name: "ams",
  commands: Object.fromEntries(
    definitions
      .filter((d) => names.has(d.name))
      .map((d) => [
        d.name,
        {
          ...d,
          attrs: { ...d.attrs, texClass: d.name.startsWith("l") ? 4 : 5 },
          execute: (p: Parser, t: Token, d: Definition, id: number) =>
            p.append(p.symbol(t, id, d)),
        },
      ]),
  ),
  environments: {},
  configurationModules: ["input/tex/ams/AmsConfiguration.js"],
} satisfies TexPackage;
