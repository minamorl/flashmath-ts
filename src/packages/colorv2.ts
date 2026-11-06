/** Legacy color wrapper subset, not the full colorv2 package. */
import type { TexPackage } from "./types.js";
import type { Parser } from "../parser.js";
import { raw } from "../scanner.js";
import { K } from "../ast.js";
function color(parser: Parser) {
  const color = raw(parser.tokensArgument());
  parser.argument((n) =>
    parser.append(parser.node(K.mstyle, [n], "", { mathcolor: color })),
  );
  return;
}
export default {
  name: "colorv2",
  commands: { color: { execute: color }, textcolor: { execute: color } },
  environments: {},
  configurationModules: ["input/tex/colorv2/ColorV2Configuration.js"],
} satisfies TexPackage;
