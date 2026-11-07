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
  function encode(v: unknown): string {
    if(v===undefined)return 'u';
    if(v===null)return 'null';
    if(typeof v==='string')return JSON.stringify(v);
    if(typeof v==='boolean')return String(v);
    if(typeof v==='number')return 'n'+(Object.is(v,-0)?'-0':String(v));
    if(v instanceof RegExp)return 'r'+JSON.stringify(v.source)+JSON.stringify(v.flags);
    if(typeof v!=='object'||seen.has(v))throw 0;
    const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
    if(!array&&proto!==Object.prototype&&proto!==null)throw 0;
    seen.add(v);let out=array?'a[':'o{';
    if(array){for(let i=0;i<v.length;i++){
      const d=Object.getOwnPropertyDescriptor(v,i);
      if(d&&!('value'in d))throw 0;
      out+=encode(d?.value)+',';
    }}else for(const k of Object.keys(v).sort()){
      const d=Object.getOwnPropertyDescriptor(v,k)!;if(!('value'in d))throw 0;
      out+=JSON.stringify(k)+':'+encode(d.value)+',';
    }
    seen.delete(v);return out+(array?']':'}');
  }
  try {const key=encode(value);return key.length<=32768?key:undefined;}
  catch{return undefined;}
}

export function copyConfiguration<T>(v: T): T {
  if (v instanceof RegExp) return new RegExp(v.source, v.flags) as T;
  if(Array.isArray(v))return v.map(copyConfiguration) as T;
  if(v&&typeof v==='object'){
    const result:Record<string,unknown>={};
    for(const key of Object.keys(v)){
      const value=copyConfiguration((v as Record<string,unknown>)[key]);
      if(key==='__proto__')Object.defineProperty(result,key,{value,enumerable:true,writable:true,configurable:true});
      else result[key]=value;
    }
    return result as T;
  }
  return v;
}
