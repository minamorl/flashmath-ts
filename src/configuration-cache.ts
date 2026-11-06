// Only immutable configuration templates belong here, never parser/session state.
export const CONFIGURATION_CACHE_LIMIT = 128;
export function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  if (cache.size >= CONFIGURATION_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

/** Value keys for plain option data. Callbacks, accessors and cycles bypass caching. */
export function configurationKey(value: unknown): string | undefined {
  const seen = new Set<object>();
  function encode(v: unknown): unknown {
    if (v === undefined) return ['undefined'];
    if (typeof v === 'number') return ['number', String(v), Object.is(v, -0)];
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (v instanceof RegExp) return ['regexp', v.source, v.flags];
    if (typeof v !== 'object' || seen.has(v)) throw 0;
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null) throw 0;
    seen.add(v);
    const result = Array.isArray(v) ? ['array', ...v.map(encode)] : ['object', ...Object.keys(v).sort().map(k => {
      const d = Object.getOwnPropertyDescriptor(v, k)!;
      if (!('value' in d)) throw 0;
      return [k, encode(d.value)];
    })];
    seen.delete(v);
    return result;
  }
  try {
    const key = JSON.stringify(encode(value));
    return key.length <= 32768 ? key : undefined;
  } catch { return undefined; }
}

export function copyConfiguration<T>(v: T): T {
  if (v instanceof RegExp) return new RegExp(v.source, v.flags) as T;
  if (Array.isArray(v)) return v.map(copyConfiguration) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyConfiguration(x)])) as T;
  return v;
}
