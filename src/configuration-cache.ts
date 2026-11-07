// Only immutable configuration templates belong here, never parser/session state.
export const CONFIGURATION_CACHE_LIMIT = 128;
export function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  if (cache.size >= CONFIGURATION_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
  return value;
}

/** Value keys for plain option data. Callbacks, accessors and cycles bypass caching. */
const snapshots = new WeakMap<object, {keys:string[]; values:unknown[]; encoded:string[]; key:string}>();
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
    seen.add(v);
    const previous=snapshots.get(v),keys=array?undefined:Object.keys(v);
    const length=array?v.length:keys!.length;
    if(previous&&length===previous.values.length){
      let same=true;
      for(let i=0;i<length;i++){
        const key=array?String(i):keys![i];
        if(!array&&key!==previous.keys[i]){same=false;break;}
        const d=Object.getOwnPropertyDescriptor(v,key);
        if(d&&!('value'in d))throw 0;
        const child=d?.value;
        if(child!==null&&typeof child==='object'){
          if(encode(child)!==previous.encoded[i]){same=false;break;}
        }else if(!Object.is(child,previous.values[i])){same=false;break;}
      }
      if(same){seen.delete(v);return previous.key;}
    }
    const names=keys??Array.from({length},(_,i)=>String(i));
    const values:unknown[]=[],encoded:string[]=[];
    for(const key of names){
      const d=Object.getOwnPropertyDescriptor(v,key);
      if(d&&!('value'in d))throw 0;
      values.push(d?.value);encoded.push(encode(d?.value));
    }
    seen.delete(v);
    let out=array?'a[':'o{';
    const order=names.map((_,i)=>i);
    if(!array)order.sort((a,b)=>names[a]<names[b]?-1:names[a]>names[b]?1:0);
    for(const i of order)out+=(array?'':JSON.stringify(names[i])+':')+encoded[i]+',';
    const key=out+(array?']':'}');
    if(key.length>32768)throw 0;
    snapshots.set(v,{keys:names,values,encoded,key});
    return key;
  }
  try {const key=encode(value);return key.length<=32768?key:undefined;}
  catch{return undefined;}
}

export function copyConfiguration<T>(v: T): T {
  if (!v || typeof v !== 'object') return v;
  if (v instanceof RegExp) return new RegExp(v.source, v.flags) as T;
  if(Array.isArray(v))return v.map(copyConfiguration) as T;
  {
    const result:Record<string,unknown>={};
    for(const key of Object.keys(v)){
      const value=copyConfiguration((v as Record<string,unknown>)[key]);
      if(key==='__proto__')Object.defineProperty(result,key,{value,enumerable:true,writable:true,configurable:true});
      else result[key]=value;
    }
    return result as T;
  }
}
