# Adding a TeX package

Each package owns `src/packages/<name>.ts`. It exports one `TexPackage` containing
its command table, environment table, supported option names, and recognized
configuration-module names. Base and newcommand use this same boundary.

Add one line before `registeredPackages` is frozen in `src/packages/registry.ts`:

```ts
import example from './example.js'; registrations.push(example);
```

That is the only shared source edit required. New command names use the extension
lookup table; they do not require edits to the generated base decision tree,
scanner, parser, adapter, or tsconfig. Independent package lanes can own separate
package files and tests, then root can combine their registration lines.

## Example

```ts
// src/packages/example.ts
import {K} from '../ast.js';
import type {TexPackage} from './types.js';

export default {
  name: 'example',
  commands: {
    hello: {
      execute(parser) {
        parser.argument(argument => {
          parser.append(parser.atom([argument], 'ORD'));
        });
      },
    },
    exampleDelimiter: {
      type: 'delimiter',
      char: '|',
      attrs: {texClass: 0},
      execute(parser, token, definition, id) {
        parser.append(parser.symbol(token, id, definition));
      },
    },
  },
  environments: {
    examplebox: {
      begin(parser, name) {
        parser.frame(-4, false, nodes => {
          parser.append(parser.atom([
            parser.node(K.menclose, nodes, '', {notation: 'box'}),
          ], 'INNER'));
        }, name);
      },
    },
  },
  configurationModules: ['input/tex/example/ExampleConfiguration.js'],
  options: [],
} satisfies TexPackage;
```

Select it through `parseToMathMLAst(tex, {packages: ['base', 'example']})` or the
same options on `parseToReact`. Handlers run synchronously and use the current
parser/session. No mutable parse state belongs in module globals.

## Handler boundary

- `parser.argument(callback, keepGroup?)` and `parser.args(count, callback)` parse
  MathML arguments on the existing explicit stack. `tokensArgument()` and
  `optional()` read raw token arguments. `stream.push(tokens)` schedules expansion
  without rebuilding the unconsumed source string.
- Create nodes through `parser.node()` so allocation limits apply. `parser.row()`
  builds an inferred sequence; `parser.atom(nodes, texclass)` creates an explicit
  TeX atom. Preserve ORD/OP/BIN/REL/OPEN/CLOSE/PUNCT/INNER/NONE distinctions. The
  conformance normalizer compares `data-mjx-texclass` and all other semantic attrs.
- Environment `begin` handlers open a frame with their environment name. With no
  `end` handler, `\end{name}` validates the matching frame and closes it. An
  optional `end(parser, name)` handler runs after that validation and owns closing
  the frame. Group and environment nesting remain explicit stack operations.
- Options named in a selected package's `options` table are available as
  `parser.options.texOptions`. Package handlers must implement those options,
  including any callbacks they advertise. Unknown options are rejected.
- A package entry can be `[name, priority]`. Smaller numeric priorities take
  precedence; at the same priority the later requested package wins. Definitions
  and resolved configurations are shared read-only; macros, references and
  counters are owned by each `createMathMLParser()` session.

`test/packages-references.test.mjs` installs a disposable compiled probe package
by adding only its module and a registry line. It verifies a new command,
overrides and priorities, delimiter lookup, environment lookup, and activation
boundaries without changing the real registry.

## Current registrations and contract

| Name | Implemented boundary |
| --- | --- |
| `base` | Existing core commands, symbols and basic environments; current fixture failures remain in `bench/flashmath/conformance.json` |
| `newcommand` | `\newcommand`, `\renewcommand`, `\def`, `\let`, `\newenvironment`, `\renewenvironment`; user definitions persist within a session |
| `ams` | Only `\lvert`, `\rvert`, `\lVert`, `\rVert`; the remaining AMS package is pending |
| `colorv2` | Only the legacy `\color`/`\textcolor` wrapper commands; the remaining color functionality is pending |

The public default is `['base', 'newcommand']`. The harness adapter forwards its
explicit `packages` list, including priority tuples. Importing a known
`configurationModules` name registers metadata; it does not activate a package
that was omitted from `packages`. Unknown packages and registration modules raise
`UnsupportedFeatureError`. Only `mode: 'convert'` is implemented. HTML discovery
(`render`) and SVG measurement (`output`) raise that error instead of silently
running as convert.

`prior` inputs run on the same session before the requested input. This preserves
macro definitions, equation counters and resolved labels. `executionOrder` is
validated metadata; it does not replace the supplied prior order. The adapter
uses the harness's trusted option revival for `$regexp` and `$function` values;
unsupported callback options are rejected explicitly.

## Package gate

Keep `conformance/` read-only. Add package-specific tests under `test/`; compare
new cases against installed MathJax 4.1.3 primary behavior. Then run:

```sh
pnpm run build
pnpm test
pnpm run conformance
node conformance/runner.mjs --subject bench/flashmath/adapter.mjs \
  --output bench/flashmath/full-conformance.json --fresh
```

Use `--fresh` after transitive parser/package changes: the shared runner does not
fingerprint transitive subject source. Preserve fixture denominators and failing
rows. Do not change normalization, filter out failures, or return oracle output
from a package implementation. Before expensive runs, inspect input selection,
option forwarding and timing/normalization boundaries; root performs the final
independent verification.
