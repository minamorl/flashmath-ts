import {build} from 'esbuild';
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseToMathMLAst,
  toMathMLString,
  createMathMLParser,
  UnsupportedFeatureError,
} from "../dist/index.js";
import subject from "../bench/flashmath/adapter.mjs";
import oracle from "../conformance/mathjax.mjs";
import { normalizeMathML } from "../conformance/normalize.mjs";
const normalize = normalizeMathML;
const options = {
  packages: ["base", "newcommand"],
  texOptions: { tags: "all" },
  display: true,
  mode: "convert",
  configurationModules: [],
};

test("adapter reproduces MathJax label/ref values, URLs, counter, duplicates and prior macros", async () => {
  const cases = [
    [
      String.raw`\begin{eqnarray}x\label{A}\\\ref{A}\end{eqnarray}`,
      { tags: "all" },
      [],
    ],
    [
      "x\\label{A}",
      { tags: "all", ignoreDuplicateLabels: true },
      [{ tex: "y\\label{A}", display: true }],
    ],
    [String.raw`\begin{array}{c}x\label{A}\end{array}`, { tags: "all" }, []],
    ["\\ref{A}", { tags: "all" }, [{ tex: "a\\label{A}", display: true }]],
    ["\\ref{A}+\\ref{B}", {}, [{ tex: "a\\label{A}", display: true }]],
    [
      "\\ref{space label}",
      { tags: "all", baseURL: "/doc", useLabelIds: true },
      [{ tex: "a\\label{space label}", display: true }],
    ],
    ["\\foo", {}, [{ tex: "\\def\\foo{x}", display: true }]],
    ["a\\label{A}\\ref{A}", { tags: "all" }, []],
    ["b\\label{A}", { tags: "all" }, [{ tex: "a\\label{A}", display: true }]],
    [
      "\\ref{A}",
      { tags: "all", useLabelIds: false },
      [{ tex: "a\\label{A}", display: true }],
    ],
    [
      "x",
      { tags: "all", tagSide: "left", tagIndent: "2em", tagAlign: "top" },
      [],
    ],
    [
      "\\begin{eqnarray}x&=&y\\label{B}\\end{eqnarray}",
      { tags: "all", tagSide: "left", tagIndent: "2em", tagAlign: "top" },
      [],
    ],
  ];
  for (const [tex, texOptions, prior] of cases) {
    const opts = { ...options, texOptions, prior };
    assert.equal(
      normalize(subject(tex, opts)),
      normalize(await oracle(tex, opts)),
      tex + JSON.stringify(texOptions),
    );
  }
  const resolved = subject("\\ref{A}", {
    ...options,
    prior: [{ tex: "a\\label{A}", display: true }],
  });
  assert.ok(resolved.includes('href="#mjx-eqn%3AA"'));
  assert.ok(!resolved.includes("???"));
});

test("parser sessions preserve document references and independent sessions isolate them", () => {
  const session = createMathMLParser({ tags: "all", display: true });
  session.parse("a\\label{alpha}");
  const out = toMathMLString(session.parse("\\ref{alpha}"));
  assert.ok(out.includes('href="#mjx-eqn%3Aalpha"'));
  assert.ok(out.includes('id="mjx-eqn:2"'));
  assert.ok(toMathMLString(parseToMathMLAst("\\ref{alpha}")).includes("???"));
});

test("texclass presence and all explicit atom classes match MathJax", async () => {
  const shapes = [
    "mathord",
    "mathop",
    "mathbin",
    "mathrel",
    "mathopen",
    "mathclose",
    "mathpunct",
    "mathinner",
  ];
  const results = [];
  for (const name of shapes) {
    const tex = `a\\${name}{x}b`;
    const actual = subject(tex, { ...options, texOptions: {} });
    assert.equal(
      normalize(actual),
      normalize(await oracle(tex, { ...options, texOptions: {} })),
      name,
    );
    results.push(normalize(actual));
  }
  assert.equal(new Set(results).size, shapes.length);
});

test("adapter preserves numberPattern as RegExp and serialized RegExp, and the digits alias", async () => {
  for (const texOptions of [
    { numberPattern: /^[0-9]+(?:;[0-9]+)?/ },
    { numberPattern: { $regexp: "^[0-9]+(?:;[0-9]+)?", flags: "" } },
    { digits: "^[0-9]+(?:;[0-9]+)?" },
    { identifierPattern: /^[a-z0-9]+/ },
  ]) {
    const tex = "a+1;23+\\mathrm{abc123}";
    const opts = { ...options, texOptions };
    assert.equal(
      normalize(subject(tex, opts)),
      normalize(await oracle(tex, opts)),
      JSON.stringify(texOptions),
    );
  }
});

test("package activation is separate from module registration and unsupported contracts reject explicitly", () => {
  const base = {
    ...options,
    packages: ["base"],
    texOptions: {},
    configurationModules: ["input/tex/newcommand/NewcommandConfiguration.js"],
  };
  assert.ok(
    subject("\\def\\a{x}\\a", base).includes("Undefined control sequence"),
  );
  assert.ok(
    !subject("\\def\\a{x}\\a", {
      ...base,
      packages: ["base", "newcommand"],
    }).includes("<merror"),
  );
  for (const patch of [
    { packages: ["missing"] },
    { mode: "render" },
    { mode: "output" },
    { configurationModules: ["input/tex/missing/MissingConfiguration.js"] },
    { texOptions: { formatError: () => "" } },
    { texOptions: { unsupportedSetting: true } },
  ])
    assert.throws(
      () => subject("x", { ...options, ...patch }),
      UnsupportedFeatureError,
    );
  assert.throws(
    () => subject("x", { ...options, executionOrder: -1 }),
    TypeError,
  );
});

test("a package adds commands, overrides, delimiters and an environment with one registry line", async () => {
  // Build a disposable source fixture to exercise the one-line package registry boundary.
  const tmp = fs.mkdtempSync(
    path.join(process.env.TMPDIR ?? os.tmpdir(), "flashmath-package-test-"),
  );
  try {
    fs.cpSync(new URL("../src/", import.meta.url), path.join(tmp,"src"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "package.json"), ' {"type":"module"}\n');
    const module = `export default {name:'probe',commands:{sentinel:{execute(p){p.append(p.text(p.tokensArgument()));}},frac:{execute(p){p.append(p.text(p.tokensArgument()));}},fence:{type:'delimiter',char:'|',attrs:{texClass:0},execute(p,t,d,id){p.append(p.symbol(t,id,d));}}},environments:{nest:{begin(p,name){p.frame(-4,false,n=>p.append(p.atom(n,'INNER')),name);}}}};\n`;
    fs.writeFileSync(path.join(tmp, "src/packages/probe.js"), module);
    const registry = path.join(tmp, "src/packages/registry.ts");
    fs.writeFileSync(
      registry,
      fs
        .readFileSync(registry, "utf8")
        .replace(
          "export const registeredPackages",
          "import probe from './probe.js'; registrations.push(probe);\nexport const registeredPackages",
        ),
    );
    await build({entryPoints:[path.join(tmp,"src/index.ts")],outfile:path.join(tmp,"index.js"),bundle:true,format:"esm",platform:"neutral",target:"es2022"});
    const { parseToMathMLAst: parse } = await import(
      pathToFileURL(path.join(tmp, "index.js")).href
    );
    const selected = { packages: ["base", "probe"] };
    assert.equal(parse("\\sentinel{ok}", selected).children[0].text, "ok");
    assert.equal(parse("\\frac{ok}", selected).children[0].kind, "mtext");
    assert.equal(
      parse("\\frac{a}{b}", {
        packages: [
          ["base", 1],
          ["probe", 10],
        ],
      }).children[0].kind,
      "mfrac",
    );
    assert.equal(
      parse("\\begin{nest}x\\end{nest}", selected).children[0].attributes[
        "data-mjx-texclass"
      ],
      "INNER",
    );
    assert.equal(
      parse("\\left\\fence x\\right\\fence", selected).children[0].children[0]
        .text,
      "|",
    );
    assert.equal(parse("\\fence", selected).children[0].text, "|");
    assert.equal(
      parse("\\sentinel{ok}", { packages: ["base"] }).children[0].kind,
      "merror",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
