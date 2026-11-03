"""Fetch one named ZIP from the owner's media-inbox branch, never execute its code."""
import pathlib
import re
import subprocess
import sys

file = sys.argv[1]
if not re.fullmatch(r'uploads/EP-(IMG|REF)-\d{3}(?:-[A-Za-z0-9_-]+)?\.zip', file):
    raise ValueError('Use uploads/EP-IMG-001.zip or a named independent part')
subprocess.run(['git', 'fetch', '--depth=1', 'origin', 'refs/heads/media-inbox'], check=True)
size = int(subprocess.check_output(['git', 'cat-file', '-s', 'FETCH_HEAD:' + file]))
if size > 20 * 1024 * 1024:
    raise ValueError('Split ZIP into independent parts below20MiB')
target = pathlib.Path('incoming/scene-zips') / pathlib.PurePosixPath(file).name
target.parent.mkdir(parents=True, exist_ok=True)
with target.open('wb') as out:
    subprocess.run(['git', 'show', 'FETCH_HEAD:' + file], stdout=out, check=True)
print(target)
