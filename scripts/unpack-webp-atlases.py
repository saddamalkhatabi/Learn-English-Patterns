"""Safely unpack finished WebP atlases. Uses only stdlib and existing FFmpeg tools.

The images become visible after `npm run build`; this does not approve their content.
Usage: python scripts/unpack-webp-atlases.py public/assets/scenes/batch.zip
"""
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.media-tools/scripts'))
from atlas_geometry import gutter_geometry

ATLAS_NAME = re.compile(r'(pattern-\d{4})-atlas-v[1-9]\d*\.webp\Z')
MAX_ZIP = 20 * 1024 * 1024
MAX_FILE = 4 * 1024 * 1024
TARGET = ROOT / 'public/assets/scenes'
GEOMETRY_FILE = ROOT / 'production/qa/webp-grid-overrides.json'
PREFIXES = ('public/assets/scenes/', 'images/', '')
METADATA = {'MANIFEST.csv', 'MANIFEST.json', 'README.md', 'REPORT.json'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def crops(file):
    try:
        grid = gutter_geometry(file)
        rects = grid['source_rects']
        assert len(rects) == 12
        assert all(abs(r['width'] / r['height'] - 1) < .08 for r in rects)
        result = []
        for r in rects:
            size = min(r['width'], r['height']) - 8
            result.append({'x': r['x'] + (r['width'] - size) // 2,
                           'y': r['y'] + (r['height'] - size) // 2,
                           'width': size, 'height': size})
        return result, 'measured-pale-gutters'
    except (AssertionError, subprocess.CalledProcessError):
        # A few finished atlases have a non-continuous white gutter. Keep a
        # conservative inset and report the uncertain grid for later review.
        return [{'x': c * 512 + 10, 'y': r * 512 + 10,
                 'width': 492, 'height': 492}
                for r in range(4) for c in range(3)], 'fixed-grid-fallback-needs-review'


def main():
    archive = pathlib.Path(sys.argv[1]).resolve()
    assert archive.is_file() and archive.stat().st_size <= MAX_ZIP
    plan = json.loads((ROOT / 'production/plans/expansion-all-153.json').read_text(encoding='utf-8'))
    valid = {p['key'] for p in plan['patterns']}
    catalog = json.loads((ROOT / 'handoff/web-20261103/IMAGE-CATALOG.json').read_text(encoding='utf-8'))
    references = {
        g['primary']['filename'].removesuffix('.png') + '.webp': g['type']
        for g in catalog['groups'] if g['type'].startswith('reference-')
    }
    geometry = json.loads(GEOMETRY_FILE.read_text(encoding='utf-8')) if GEOMETRY_FILE.exists() else {'schema': 1, 'atlases': {}}
    with zipfile.ZipFile(archive) as z:
        infos = z.infolist()
        assert 1 <= len(infos) <= 200 and sum(i.file_size for i in infos) <= 64 * 1024 * 1024
        assert len({i.filename for i in infos}) == len(infos), 'Duplicate entry'
        entries = {}
        for i in infos:
            if i.orig_filename in METADATA:
                continue
            name = pathlib.PurePosixPath(i.orig_filename).name
            atlas = ATLAS_NAME.fullmatch(name)
            assert i.orig_filename in {prefix + name for prefix in PREFIXES}, 'Unexpected ZIP path'
            assert name in references or (atlas and atlas.group(1) in valid), 'Unknown WebP: ' + name
            assert name not in entries and 0 < i.file_size <= MAX_FILE and i.external_attr >> 16 & 0o170000 != 0o120000
            entries[name] = i
        assert entries, 'No scene files'
        (ROOT / 'incoming/scene-staging').mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / 'incoming/scene-staging') as temp:
            prepared = []
            for name, i in entries.items():
                data = z.read(i)
                assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', 'Not WebP: ' + i.filename
                file = pathlib.Path(temp) / name
                file.write_bytes(data)
                probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                    'stream=width,height', '-of', 'json', str(file)]))
                square = references.get(name) == 'reference-cell-repair'
                dimensions = (1024, 1024) if square else (1536, 2048)
                assert [(s['width'], s['height']) for s in probe['streams']] == [dimensions], 'Wrong dimensions: ' + name
                digest = sha(data)
                target = (TARGET / 'imported-references' if name in references else TARGET) / name
                assert not target.exists() or sha(target.read_bytes()) == digest, 'Different existing atlas: ' + name
                if square:
                    cells, method = [dict(x=0, y=0, width=1024, height=1024)], 'full-square'
                elif geometry['atlases'].get(name, {}).get('sha256') == digest:
                    entry = geometry['atlases'][name]
                    cells, method = entry['crops'], entry['method']
                else:
                    cells, method = crops(file)
                prepared.append((file, target, digest, cells, method, dimensions))
            for file, target, digest, cells, method, dimensions in prepared:
                if not target.exists():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(file, target)
                entry = {'sha256': digest, 'crops': cells, 'method': method}
                if target.parent != TARGET:
                    entry['dimensions'] = dimensions
                geometry['atlases'][target.name] = entry
            with GEOMETRY_FILE.open('w', encoding='utf-8', newline='\n') as out:
                out.write(json.dumps(geometry, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'files': len(prepared),
                      'grid_fallbacks': [t.name for _, t, _, _, m, _ in prepared if m.startswith('fixed')]}))


if __name__ == '__main__':
    main()
