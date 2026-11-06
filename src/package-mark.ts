// Provenance is private object metadata, never a MathML attribute. Literal
// user glyphs cannot acquire it merely by selecting a package or a codepoint.
type PackageMark = 'glyph' | 'arrow-label' | 'prescript';
const marks = new WeakMap<object, PackageMark>();
export function markPackageNode<T extends object>(node:T, kind:PackageMark):T {
  marks.set(node,kind);return node;
}
export const packageMark = (node:object) => marks.get(node);
export function copyPackageMark(source:object, target:object) {
  const mark=marks.get(source);if(mark)marks.set(target,mark);
}
