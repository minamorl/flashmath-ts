/** Restore serialized options from trusted local fixtures (function source is code). */
export function reviveOptions(value) {
  if (!value || typeof value !== 'object' || value instanceof RegExp) return value;
  if (Array.isArray(value)) return value.map(reviveOptions);
  if ('$regexp' in value) return new RegExp(value.$regexp, value.flags);
  if ('$function' in value) {
    if (typeof value.$function !== 'string') throw Error('Invalid fixture callback source');
    const callback = Function(`"use strict"; return (${value.$function});`)();
    if (typeof callback !== 'function') throw Error('Fixture callback source must produce a function');
    return callback;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reviveOptions(item)]));
}
