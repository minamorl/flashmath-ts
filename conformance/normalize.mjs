/** Strict XML-subset parser. No DOM repair, DTDs, network access or external entities. */
const MATHML = 'http://www.w3.org/1998/Math/MathML';
const XML = 'http://www.w3.org/XML/1998/namespace';
const ignored = new Set(['data-latex', 'data-latex-item', 'data-mjx-texclass']);
const layout = new Set(['math','mrow','msqrt','mroot','mfrac','msub','msup','msubsup','munder','mover','munderover','mmultiscripts','mprescripts','none','mstyle','merror','mpadded','mphantom','mfenced','menclose','mtable','mtr','mlabeledtr','mtd','maction','semantics']);
const tokens = new Set(['mi','mn','mo','mtext','ms','annotation']);
const namePattern = '[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?';
const nameRE = new RegExp(`^${namePattern}`);
function decode(s) {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(s)) throw Error('Invalid XML entity');
  return s.replace(/&([^;]+);/g, (_m,key) => {
    const named = {amp:'&', lt:'<', gt:'>', quot:'"', apos:"'"};
    if (key in named) return named[key];
    const n = key[1] === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
    if (!validCodePoint(n)) throw Error('Invalid XML character reference');
    return String.fromCodePoint(n);
  });
}
function validCodePoint(n) {
  return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 0xD7FF)
    || (n >= 0xE000 && n <= 0xFFFD) || (n >= 0x10000 && n <= 0x10FFFF);
}
export function parseMathML(xml) {
  if (typeof xml !== 'string') throw Error('MathML must be a string');
  for (const c of xml) if (!validCodePoint(c.codePointAt(0))) throw Error('Invalid XML character');
  xml = xml.replace(/\r\n?/g,'\n');
  const roots=[], stack=[];
  let i=0;
  const addText = (text) => {
    if (!stack.length) { if (/[^ \t\r\n]/.test(text)) throw Error('Text outside root'); return; }
    const children=stack.at(-1).children;
    if (typeof children.at(-1) === 'string') children[children.length-1]+=text;
    else children.push(text);
  };
  while (i < xml.length) {
    if (xml[i] !== '<') {
      const end=xml.indexOf('<',i), next=end<0?xml.length:end;
      const text=xml.slice(i,next);
      if (text.includes(']]>')) throw Error('Invalid XML text');
      addText(decode(text)); i=next; continue;
    }
    if (xml.startsWith('<![CDATA[',i)) {
      const end=xml.indexOf(']]>',i+9); if(end<0) throw Error('Unclosed CDATA');
      if (!stack.length) throw Error('CDATA outside root');
      addText(xml.slice(i+9,end)); i=end+3; continue;
    }
    if (xml.startsWith('<!',i) || xml.startsWith('<?',i)) throw Error('Declarations, comments and instructions are unsupported');
    const closing=xml[i+1]==='/'; i+=closing?2:1;
    const found=xml.slice(i).match(nameRE); if(!found) throw Error('Invalid element name');
    const tag=found[0]; i+=tag.length;
    if(closing) {
      const close=xml.slice(i).match(/^[ \t\r\n]*>/); if(!close) throw Error('Invalid closing tag');
      i+=close[0].length;
      if(stack.pop()?.tag!==tag) throw Error(`Unbalanced closing tag ${tag}`);
      continue;
    }
    const attrs=[], names=new Set();
    let self=false;
    while(true) {
      const space=xml.slice(i).match(/^[ \t\r\n]*/)[0]; i+=space.length;
      if(xml.startsWith('/>',i)) { self=true; i+=2; break; }
      if(xml[i]==='>') { i++; break; }
      if(!space.length) throw Error('Missing attribute separator');
      const attr=xml.slice(i).match(new RegExp(`^(${namePattern})[ \\t\\r\\n]*=[ \\t\\r\\n]*(["'])([\\s\\S]*?)\\2`));
      if(!attr || attr[3].includes('<')) throw Error('Invalid XML attribute');
      if(names.has(attr[1])) throw Error('Duplicate XML attribute'); names.add(attr[1]);
      // XML normalizes literal attribute whitespace before entity expansion.
      attrs.push([attr[1],decode(attr[3].replace(/[\t\n]/g,' '))]); i+=attr[0].length;
    }
    const ns=Object.assign(Object.create(null),stack.at(-1)?.ns || {xml:XML});
    for(const [key,value] of attrs) {
      if((key==='xmlns' || key.startsWith('xmlns:')) && (value==='http://www.w3.org/2000/xmlns/' || (value===XML && key!=='xmlns:xml'))) throw Error('Reserved XML namespace');
      if(key==='xmlns') ns['']=value;
      else if(key.startsWith('xmlns:')) {
        const prefix=key.slice(6);
        if(prefix==='xmlns' || !value || (prefix==='xml' && value!==XML)) throw Error('Invalid namespace declaration');
        ns[prefix]=value;
      }
    }
    const expand=(name,attribute=false)=>{
      const parts=name.split(':');
      if(parts.length===2) { if(!ns[parts[0]]) throw Error('Unbound namespace prefix'); return `{${ns[parts[0]]}}${parts[1]}`; }
      return `{${attribute?'':ns['']||''}}${name}`;
    };
    const normalizedAttrs=[], expanded=new Set();
    for(const [key,value] of attrs) {
      if(key==='xmlns' || key.startsWith('xmlns:')) continue;
      const name=expand(key,true);
      if(expanded.has(name)) throw Error('Duplicate expanded XML attribute'); expanded.add(name);
      if(!ignored.has(key)) normalizedAttrs.push([name,value]);
    }
    normalizedAttrs.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
    const node={tag,name:expand(tag), attrs:normalizedAttrs,children:[],ns};
    if(stack.length) stack.at(-1).children.push(node); else roots.push(node);
    if(!self) stack.push(node);
  }
  if(stack.length || roots.length!==1 || roots[0].name!==`{${MATHML}}math`) throw Error('Expected one closed MathML math root with namespace');
  const clean=(node)=>({name:node.name, attrs:node.attrs, children:node.children
    .filter(child=>typeof child!=='string' || !node.name.startsWith(`{${MATHML}}`) || !layout.has(node.tag.split(':').at(-1)) || tokens.has(node.tag.split(':').at(-1)) || /[^ \t\r\n]/.test(child))
    .map(child=>typeof child==='string'?child:clean(child))});
  return clean(roots[0]);
}
export function normalizeMathML(xml) { return JSON.stringify(parseMathML(xml)); }
export function firstDifference(a,b,path='/math') {
  if(a.name!==b.name) return {category:'structure',path,expected:a.name,actual:b.name};
  if(JSON.stringify(a.attrs)!==JSON.stringify(b.attrs)) return {category:'attributes',path,expected:a.attrs,actual:b.attrs};
  if(a.children.length!==b.children.length) return {category:'structure',path,expected:a.children.length,actual:b.children.length};
  for(let i=0;i<a.children.length;i++) {
    const x=a.children[i], y=b.children[i], p=`${path}/${i}`;
    if(typeof x==='string' || typeof y==='string') {
      if(x!==y) return {category:typeof x===typeof y?'text':'structure',path:p,expected:x,actual:y};
    } else { const diff=firstDifference(x,y,p); if(diff) return diff; }
  }
  return null;
}
