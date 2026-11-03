"""Stage named PNGs from one handoff task. Python standard library only.
No approval, application mutation or Git action happens during staging.
"""
import argparse
import hashlib
import json
import pathlib
import re
import stat
import struct
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / 'handoff/web-20261103/IMAGE-CATALOG.json'


def sha(file):
    return hashlib.sha256(pathlib.Path(file).read_bytes()).hexdigest()


def png_dimensions(data):
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError('Expected actual PNG bytes, not a renamed JPEG/WebP')
    width, height = struct.unpack('>II', data[16:24])
    if not (512 <= width <= 4096 and 512 <= height <= 4096 and width * height <= 10000000):
        raise ValueError('PNG size outside supported512..4096 bounds or10MP limit')
    return width, height


def stage(zip_path, task_id, catalog_path=CATALOG, output_root=None):
    zip_path = pathlib.Path(zip_path).resolve()
    catalog = json.loads(pathlib.Path(catalog_path).read_text(encoding='utf-8'))
    task = next((t for t in catalog['tasks'] if t['id'] == task_id), None)
    if not task:
        raise ValueError('Unknown task ID')
    groups = [g for g in catalog['groups'] if g['key'] in task['groups']]
    allowed = {f['filename']: f for g in groups for f in [g['primary'], *g['alternates']]}
    if zip_path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError('ZIP exceeds20MiB; split into independent smaller ZIPs with the same task ID')
    zip_sha = sha(zip_path)
    parent = pathlib.Path(output_root or ROOT / 'incoming/scene-staging').resolve()
    target = parent / task_id / zip_sha[:16]
    if not target.resolve().is_relative_to(parent):
        raise ValueError('Stage path escaped its root')
    entries = {}
    with zipfile.ZipFile(zip_path) as archive:
        infos = archive.infolist()
        if len(infos) > 200 or sum(i.file_size for i in infos) > 64 * 1024 * 1024:
            raise ValueError('Archive entry/expanded-size limit exceeded')
        for info in infos:
            name = info.orig_filename
            p = pathlib.PurePosixPath(name)
            if '\\' in name or ':' in name or p.is_absolute() or '..' in p.parts or str(p) != name.rstrip('/'):
                raise ValueError('Unsafe ZIP path: ' + name)
            if info.flag_bits & 1 or stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('Encrypted/symlink entries are not accepted')
            if info.is_dir():
                if name not in ['images/', 'prompts/']:
                    raise ValueError('Unexpected directory: ' + name)
                continue
            if name in entries:
                raise ValueError('Duplicate ZIP entry: ' + name)
            image = name.startswith('images/') and name.count('/') == 1
            metadata = name in ['REPORT.json', 'README.txt'] or bool(re.fullmatch(r'prompts/[A-Za-z0-9_.-]+\.txt', name))
            if image:
                if p.name not in allowed or info.file_size > 12 * 1024 * 1024:
                    raise ValueError('Unrequested/oversize image: ' + name)
            elif not metadata or info.file_size > 1024 * 1024:
                raise ValueError('Unexpected/oversize metadata: ' + name)
            data = archive.read(info)
            if image:
                width, height = png_dimensions(data)
                expected = .75 if allowed[p.name]['kind'] == 'atlas' else 1
                if abs(width / height - expected) > .003:
                    raise ValueError('Wrong aspect ratio for ' + name)
                if expected == .75 and (width < 768 or height < 1024):
                    raise ValueError('Atlas source must be at least768x1024')
            entries[name] = data
    if 'REPORT.json' in entries:
        report = json.loads(entries['REPORT.json'].decode('utf-8-sig'))
        if report.get('task_id') != task_id:
            raise ValueError('REPORT task_id mismatch')
    complete, incomplete = [], []
    for g in groups:
        primary = 'images/' + g['primary']['filename'] in entries
        alternatives = [a for a in g['alternates'] if 'images/' + a['filename'] in entries]
        if primary and alternatives:
            raise ValueError('Ambiguous atlas plus alternative cells: ' + g['key'])
        (complete if primary or (g['alternates'] and len(alternatives) == len(g['alternates'])) else incomplete).append(g['key'])
    if not any(name.startswith('images/') for name in entries):
        raise ValueError('ZIP contains no requested images')
    # Validate every entry before writing any file; repeat delivery must match exactly.
    for name, data in entries.items():
        dest = target / name
        if dest.exists() and dest.read_bytes() != data:
            raise ValueError('Refusing to overwrite different staged content')
    for name, data in entries.items():
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    result = {'schema': 1, 'task_id': task_id, 'zip_sha256': zip_sha, 'source_zip': str(zip_path), 'catalog': str(pathlib.Path(catalog_path).resolve()), 'stage': str(target), 'complete_groups': complete, 'incomplete_groups': incomplete, 'images': [{'filename': pathlib.PurePosixPath(n).name, 'sha256': hashlib.sha256(d).hexdigest(), 'dimensions': list(png_dimensions(d))} for n, d in entries.items() if n.startswith('images/')], 'approval': 'not approved by staging; per-cell source-hash review and measured gutters required before import'}
    (target / 'INTAKE.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip')
    parser.add_argument('--task', required=True)
    args = parser.parse_args()
    print(json.dumps(stage(args.zip, args.task), ensure_ascii=False))
