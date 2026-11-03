"""Package text tasks/context and one retained style reference; no model packages."""
import hashlib
import json
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / 'handoff/web-20261103'
OUT = ROOT / 'incoming/gpt6-handoff'
OUT.mkdir(parents=True, exist_ok=True)
assert OUT.resolve().is_relative_to(ROOT)
generated = []


def write_zip(target, files):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for source, name in sorted(files, key=lambda p: p[1]):
            archive.write(source, name)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    generated.append({'file': target.name, 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})


for directory in sorted((BASE / 'image-tasks').iterdir()):
    write_zip(OUT / (directory.name + '-TASK.zip'), [(p, p.relative_to(directory).as_posix()) for p in directory.rglob('*') if p.is_file()])

context = []
for name in ['package.json', 'server.js', 'HANDOFF.md', '.github/workflows/verify.yml', '.github/workflows/receive-scene-zip.yml']:
    context.append((ROOT / name, name))
for folder in ['scripts', 'tests', 'docs', 'content/expansion-review', 'content/batches', 'production/plans', 'production/manifests']:
    for p in (ROOT / folder).rglob('*'):
        if p.is_file() and '__pycache__' not in p.parts and p.suffix in ['.js', '.cjs', '.py', '.ps1', '.json', '.md', '.txt', '.yml']:
            context.append((p, p.relative_to(ROOT).as_posix()))
for p in (ROOT / 'public').iterdir():
    if p.is_file() and (p.suffix in ['.html', '.css', '.js', '.svg'] or p.name in ['pilot.json', 'curriculum.json', 'supplement.json', 'pattern-catalog.json', 'source-corpus.json']):
        context.append((p, p.relative_to(ROOT).as_posix()))
for name in ['production/pattern-id-map.json', 'production/scene-policy.json']:
    context.append((ROOT / name, name))
for name in ['00-START-HERE.md', '01-FORMATS-AND-NAMES.md', '02-RECEIVE-AND-GITHUB.md', '03-CODING-TASKS.md', 'CHECKPOINT.json', 'IMAGE-CATALOG.json', 'VALIDATION.json']:
    context.append((BASE / name, 'handoff/web-20261103/' + name))
readme = OUT / 'CODE-CONTEXT-NOT-A-FULL-CHECKOUT.txt'
readme.write_text('Code and metadata context only. Binary audio/scenes and Git history are excluded. Full media checks require the actual repository checkout. Do not claim tests passed against missing assets.\n', encoding='utf-8')
context.append((readme, readme.name))
write_zip(OUT / 'EP-CODE-CONTEXT.zip', context)

files = [(p, p.relative_to(BASE).as_posix()) for p in BASE.rglob('*') if p.is_file()]
files.append((ROOT / 'production/expansion-images/sources/pattern-9021-v1.png', 'STYLE-REFERENCE.png'))
files += [(OUT / g['file'], 'READY-TASK-ZIPS/' + g['file']) for g in generated if g['file'].endswith('-TASK.zip')]
files.append((OUT / 'EP-CODE-CONTEXT.zip', 'EP-CODE-CONTEXT.zip'))
master = ROOT / 'handoff/EP-GPT6-HANDOFF.zip'
write_zip(master, files)
(OUT / 'PACKAGES.json').write_text(json.dumps({'schema': 1, 'packages': generated, 'master': str(master), 'note': 'Actual remaining PNGs are not included: these are instructions/context, not generation claims.'}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'output': str(OUT), 'packages': len(generated), 'master_bytes': generated[-1]['bytes'], 'master_sha256': generated[-1]['sha256']}))
