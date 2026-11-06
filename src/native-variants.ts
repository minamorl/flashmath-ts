// Unicode Mathematical Alphanumeric Symbols, including the Letterlike Symbols
// holes. No renderer font tables or runtime dependencies are needed.
const latin: Record<string, [number, number, number?]> = {
  bold: [0x1d400, 0x1d41a, 0x1d7ce], italic: [0x1d434, 0x1d44e],
  'bold-italic': [0x1d468, 0x1d482], script: [0x1d49c, 0x1d4b6],
  'bold-script': [0x1d4d0, 0x1d4ea], fraktur: [0x1d504, 0x1d51e],
  'double-struck': [0x1d538, 0x1d552, 0x1d7d8],
  'bold-fraktur': [0x1d56c, 0x1d586], 'sans-serif': [0x1d5a0, 0x1d5ba, 0x1d7e2],
  'bold-sans-serif': [0x1d5d4, 0x1d5ee, 0x1d7ec],
  'sans-serif-italic': [0x1d608, 0x1d622],
  'sans-serif-bold-italic': [0x1d63c, 0x1d656], monospace: [0x1d670, 0x1d68a, 0x1d7f6],
};
const aliases: Record<string,string> = {'-tex-calligraphic':'script', '-tex-bold-calligraphic':'bold-script', '-tex-mathit':'italic', '-tex-oldstyle':'normal', '-tex-bold-oldstyle':'bold'};
const holes: Record<number,number> = {
  0x1d455:0x210e, 0x1d49d:0x212c, 0x1d4a0:0x2130, 0x1d4a1:0x2131,
  0x1d4a3:0x210b, 0x1d4a4:0x2110, 0x1d4a7:0x2112, 0x1d4a8:0x2133,
  0x1d4ad:0x211b, 0x1d4ba:0x212f, 0x1d4bc:0x210a, 0x1d4c4:0x2134,
  0x1d506:0x212d, 0x1d50b:0x210c, 0x1d50c:0x2111, 0x1d515:0x211c,
  0x1d51d:0x2128, 0x1d53a:0x2102, 0x1d53f:0x210d, 0x1d545:0x2115,
  0x1d547:0x2119, 0x1d548:0x211a, 0x1d549:0x211d, 0x1d551:0x2124,
};
const greek = Array.from('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡϴΣΤΥΦΧΨΩ∇αβγδεζηθικλμνξοπρςστυφχψω∂ϵϑϰϕϱϖ');
const greekStarts: Record<string,number> = {bold:0x1d6a8, italic:0x1d6e2, 'bold-italic':0x1d71c, 'bold-sans-serif':0x1d756, 'sans-serif-bold-italic':0x1d790};
export function variantName(name:string):string {return Object.hasOwn(aliases,name)?aliases[name]:name;}
const fallback:Record<string,string>={script:'italic','bold-script':'bold-italic','double-struck':'bold',fraktur:'normal','bold-fraktur':'bold','bold-italic':'bold','sans-serif':'normal','bold-sans-serif':'bold','sans-serif-italic':'italic','sans-serif-bold-italic':'bold-italic',monospace:'normal'};
export function variantText(text:string, variant:string):string {
  return Array.from(text,c=>{
    const code=c.codePointAt(0)!;
    let name=variantName(variant);
    if((variant==='-tex-calligraphic'||variant==='-tex-bold-calligraphic')&&!(code>=65&&code<=90))name=variant==='-tex-calligraphic'?'italic':'bold-italic';
    while(Object.hasOwn(latin,name)){
      const range=latin[name];
      let mapped=code>=65&&code<=90 ? range[0]+code-65
        : code>=97&&code<=122 ? range[1]+code-97
        : code>=48&&code<=57&&range[2] ? range[2]+code-48 : 0;
      if(!mapped&&greekStarts[name]){
        const i=greek.indexOf(c);if(i>=0)mapped=greekStarts[name]+i;
        else if(c==='Ϝ'||c==='ϝ')mapped=name==='bold'?0x1d7ca+(c==='ϝ'?1:0):0;
      }
      if(!mapped&&name==='italic'&&(c==='ı'||c==='ȷ'))mapped=c==='ı'?0x1d6a4:0x1d6a5;
      if(mapped)return String.fromCodePoint(holes[mapped]??mapped);
      name=fallback[name]??'normal';
    }
    return c;
  }).join('');
}
