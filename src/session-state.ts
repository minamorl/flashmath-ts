import type { Macro } from "./scanner.js";
export interface Reference {
  tag: string;
  id: string;
}
/** Owned by one document/session; never shared between independent parser calls. */
export interface SessionState {
  macros: Map<string, Macro>;
  environments: Map<string, { begin: Macro; end: Macro }>;
  labels: Map<string, Reference>;
  counter: number;
  initialized: boolean;
}
export function sessionState(): SessionState {
  return {
    macros: new Map(),
    environments: new Map(),
    labels: new Map(),
    counter: 0,
    initialized: false,
  };
}
