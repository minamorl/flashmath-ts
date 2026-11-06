import type { MathMLNode } from "../ast.js";
import type { Parser } from "../parser.js";
import type { Token } from "../scanner.js";
import type { Definition } from "../symbols.js";

export type PackageEntry = string | readonly [name: string, priority: number];
export type CommandHandler = (
  parser: Parser,
  token: Token,
  definition: Definition,
  id: number,
) => void;
export interface TexCommand {
  type?: string;
  char?: string;
  attrs?: Record<string, unknown>;
  args?: unknown[];
  execute: CommandHandler;
}
export interface TexEnvironment {
  begin: (parser: Parser, name: string) => void;
  end?: (parser: Parser, name: string) => void;
}
export interface TexPackage {
  name: string;
  initialize?: (parser: Parser) => void;
  undefinedCommand?: (parser: Parser, name: string) => void;
  formatError?: (message: string, tex: string) => MathMLNode;
  priority?: number;
  commands: Readonly<Record<string, TexCommand>>;
  environments: Readonly<Record<string, TexEnvironment>>;
  configurationModules?: readonly string[];
  options?: readonly string[];
}
export interface RegisteredCommand {
  definition: Definition;
  execute: CommandHandler;
  id: number;
}
export interface ActivePackageConfiguration extends PackageConfiguration {
  entries: readonly PackageEntry[];
  packages: readonly TexPackage[];
}
export interface PackageConfiguration {
  commands: readonly (RegisteredCommand | undefined)[];
  extensions: ReadonlyMap<string, RegisteredCommand>;
  environments: ReadonlyMap<string, TexEnvironment>;
  options: ReadonlySet<string>;
}
