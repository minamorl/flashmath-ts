import os,subprocess,pathlib
root=pathlib.Path.cwd(); repo=root/'bench/pkg-fonts/delivery.git'
def git(*args):
    r=subprocess.run(['git','--git-dir='+str(repo),'--work-tree='+str(root),*args],text=True,capture_output=True)
    print(r.stdout,end='');print(r.stderr,end='');print('git',args[0],'exit:',r.returncode)
    if r.returncode:raise SystemExit(r.returncode)
    return r.stdout.strip()
base=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
common=subprocess.check_output(['git','rev-parse','--git-common-dir'],text=True).strip()
objects=(root/common/'objects').resolve()
(repo/'objects/info/alternates').write_text(str(objects)+'\n')
git('config','user.name','minamorl');git('config','user.email','minamorl@users.noreply.github.com')
if not (repo/'refs/heads/pkg-fonts').exists():
    git('symbolic-ref','HEAD','refs/heads/pkg-fonts');git('update-ref','refs/heads/pkg-fonts',base);git('read-tree',base)
paths=['src/ast.ts','src/parser.ts','src/configuration.ts','src/react.ts','src/serialize.ts','src/packages/registry.ts']
paths += [str(p) for p in (root/'src/packages').glob('*.ts') if p.name not in ['ams.ts','base.ts','newcommand.ts','types.ts']]
paths += ['test/packages-fonts.test.mjs','test/packages','docs/packages-shared-changes.md']
for path in ['docs/packages-pkg-fonts.md','bench/pkg-fonts/validate.mjs','bench/pkg-fonts/integration.mjs','bench/pkg-fonts/report.mjs','bench/pkg-fonts/checkpoint.py','bench/pkg-fonts/textmacros-integration.patch']:
    if pathlib.Path(path).exists():paths.append(path)
git('add','--',*paths)
status=git('diff','--cached','--stat')
if status:git('commit','-m',os.environ.get('PKG_FONTS_COMMIT','feat(packages): implement fonts color html action and tagformat'))
git('bundle','create',str(root/'bench/pkg-fonts/pkg-fonts.bundle'),'HEAD','^'+base)
git('bundle','verify',str(root/'bench/pkg-fonts/pkg-fonts.bundle'))
