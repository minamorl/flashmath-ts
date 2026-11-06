import { UnsupportedFeatureError } from "./ast.js";
import type { ParseOptions } from "./ast.js";
import {
  resolvePackages,
  registeredPackages,
  validateConfigurationModules,
} from "./packages/registry.js";
import type { ActivePackageConfiguration, PackageEntry } from "./packages/types.js";
import { configurationKey, copyConfiguration, remember } from './configuration-cache.js';

const optionCache = new Map<string, ReturnType<typeof configureUncached>>();
const packageCache = new Map<string, ActivePackageConfiguration>();

export function configure(input: ParseOptions): {
  options: ParseOptions;
  configuration: ActivePackageConfiguration;
} {
  const key = configurationKey(input);
  let resolved = key === undefined ? undefined : optionCache.get(key);
  if (!resolved) {
    resolved = configureUncached(input);
    if (key !== undefined) remember(optionCache, key, { ...resolved, options: copyConfiguration(resolved.options) });
  }
  return { configuration: resolved.configuration, options: key === undefined ? resolved.options : copyConfiguration(resolved.options) };
}

function configureUncached(input: ParseOptions): {
  options: ParseOptions;
  configuration: ActivePackageConfiguration;
} {
  if (input.mode !== undefined && input.mode !== "convert" &&
      !(input.mode === "render" && input.packages?.some(p=>(typeof p==="string"?p:p[0])==="texhtml")) &&
      !(input.mode === "output" && input.packages?.some(p=>(typeof p==="string"?p:p[0])==="bussproofs")))
    throw new UnsupportedFeatureError(
      `Unsupported mode: ${input.mode} (HTML discovery and SVG measurement are not implemented)`,
    );
  if (
    input.executionOrder !== undefined &&
    (!Number.isSafeInteger(input.executionOrder) || input.executionOrder < 0)
  )
    throw new TypeError("executionOrder must be a nonnegative integer");
  validateConfigurationModules(input.configurationModules);
  const configuration = resolveConfiguration(input.packages);
  const texOptions = input.texOptions ?? {};
  for (const key of Object.keys(texOptions))
    if (!configuration.options.has(key))
      throw new UnsupportedFeatureError(`Unsupported TeX option: ${key}`);
  const options: ParseOptions = { ...input, texOptions: {...texOptions} };
  if (options.output !== undefined && options.output !== 'native' && options.output !== 'mathjax')
    throw new TypeError('output must be native or mathjax');
  for (const name of [
    "macros",
    "tags",
    "baseURL",
    "useLabelIds",
    "ignoreDuplicateLabels",
    "tagSide",
    "tagIndent",
    "tagAlign",
    "numberPattern",
    "identifierPattern",
  ] as const) {
    if (texOptions[name] !== undefined)
      (options as Record<string, unknown>)[name] = texOptions[name];
  }
  // MathJax retains the historical digits alias, including string-valued regexes.
  if (texOptions.digits)
    options.numberPattern = texOptions.digits as string | RegExp;
  if (options.numberPattern !== undefined) {
    const pattern = options.numberPattern;
    if (typeof pattern !== "string" && !(pattern instanceof RegExp))
      throw new TypeError("numberPattern must be a string or RegExp");
    options.numberPattern = new RegExp(
      (typeof pattern === "string" ? pattern : pattern.source).replace(
        /^\^/,
        "",
      ),
      (typeof pattern === "string" ? "" : pattern.flags).replace(/[gy]/g, "") +
        "y",
    );
  }
  if (options.identifierPattern !== undefined) {
    if (!(options.identifierPattern instanceof RegExp))
      throw new TypeError("identifierPattern must be a RegExp");
    options.identifierPattern = new RegExp(
      options.identifierPattern.source.replace(/^\^/, ""),
      options.identifierPattern.flags.replace(/[gy]/g, "") + "y",
    );
  }
  for (const [name, value] of Object.entries(options.macros ?? {})) {
    const tuple: readonly unknown[] =
      typeof value === "string" ? [value, 0] : value;
    if (
      !Array.isArray(tuple) ||
      typeof tuple[0] !== "string" ||
      (tuple[1] !== undefined &&
        (typeof tuple[1] !== "number" ||
          !Number.isSafeInteger(tuple[1]) ||
          tuple[1] < 0 ||
          tuple[1] > 9)) ||
      (tuple[2] !== undefined && typeof tuple[2] !== "string" && !(configuration.packages.some(p=>p.name==="configmacros") && Array.isArray(tuple[2]) && tuple[2].every(x=>typeof x==="string")))
    )
      throw new TypeError(`Unsupported macro configuration: ${name}`);
  }
  if (
    options.tags !== undefined &&
    !["none", "all"].includes(options.tags) &&
    !(options.tags === "ams" && configuration.options.has("mathtools")) &&
    !( ["ams", "cases"].includes(options.tags) && input.packages?.some(entry => {
      const name = typeof entry === "string" ? entry : entry[0];
      return name === options.tags || (options.tags === "ams" && name === "cases");
    }))
  )
    throw new UnsupportedFeatureError(`Unsupported tag mode: ${options.tags}`);
  for (const name of ["baseURL", "tagSide", "tagIndent", "tagAlign"] as const)
    if (options[name] !== undefined && typeof options[name] !== "string")
      throw new TypeError(`${name} must be a string`);
  for (const name of ["useLabelIds", "ignoreDuplicateLabels"] as const)
    if (options[name] !== undefined && typeof options[name] !== "boolean")
      throw new TypeError(`${name} must be a boolean`);
  for (const name of [
    "maxNodes",
    "maxTokens",
    "maxExpansions",
    "maxDepth",
  ] as const)
    if (
      options[name] !== undefined &&
      (!Number.isSafeInteger(options[name]) || options[name]! < 1)
    )
      throw new RangeError(`${name} must be a positive safe integer`);
  return { options, configuration };
}

/** Keep package lifecycle metadata outside the registry's registration-only boundary. */
export function resolveConfiguration(entries:readonly PackageEntry[]=['base','newcommand']):ActivePackageConfiguration {
  const key = configurationKey(entries);
  const cached = key === undefined ? undefined : packageCache.get(key);
  if (cached) return cached;
  const configuration=resolvePackages(entries);
  const selected=entries.map((entry,index)=>{
    const [name,priority]=typeof entry==='string'?[entry,undefined]:entry;
    const definition=registeredPackages.find(p=>p.name===name)!;
    return {definition,priority:priority??definition.priority??5,index};
  }).sort((a,b)=>b.priority-a.priority||a.index-b.index);
  const resolved = {...configuration,entries:selected.map(x=>[x.definition.name,x.priority] as const),packages:selected.map(x=>x.definition)};
  return key === undefined ? resolved : remember(packageCache, key, resolved);
}
