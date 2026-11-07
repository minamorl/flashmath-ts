export const warningCases=[
 [String.raw`\unicode[Arial]{x41}`,{packages:['base','unicode']}],
 [String.raw`\href{}{x}`,{packages:['base','html']}],
 [String.raw`<tex-html><label for="field" class="label" tabindex="0">Name</label></tex-html>`,{packages:['base','texhtml'],texOptions:{allowTexHTML:true}}],
];
