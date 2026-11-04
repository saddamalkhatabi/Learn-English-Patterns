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
    geometry = json.loads(GEOMETRY_FILE.read_text(encoding='utf-8')) if GEOMETRY_FILE.exists() else {'schema': 1, 'atlases': {}}
    with zipfile.ZipFile(archive) as z:
        infos = z.infolist()
        assert 1 <= len(infos) <= 200 and sum(i.file_size for i in infos) <= 64 * 1024 * 1024
        assert len({i.filename for i in infos}) == len(infos), 'Duplicate entry'
        assert all(ATLAS_NAME.fullmatch(i.filename) and ATLAS_NAME.fullmatch(i.filename).group(1) in valid and not i.is_dir()
                   and 0 < i.file_size <= MAX_FILE and not (i.external_attr >> 16 & 0o170000) == 0o120000
                   for i in infos), 'Unknown or unsafe ZIP entry'
        (ROOT / 'incoming/scene-staging').mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT / 'incoming/scene-staging') as temp:
            prepared = []
            for i in infos:
                data = z.read(i)
                assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', 'Not WebP: ' + i.filename
                file = pathlib.Path(temp) / i.filename
                file.write_bytes(data)
                probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                    'stream=width,height', '-of', 'json', str(file)]))
                assert [(s['width'], s['height']) for s in probe['streams']] == [(1536, 2048)], 'Wrong dimensions: ' + i.filename
                digest = sha(data)
                target = TARGET / i.filename
                assert not target.exists() or sha(target.read_bytes()) == digest, 'Different existing atlas: ' + i.filename
                cells, method = crops(file)
                prepared.append((file, target, digest, cells, method))
            for file, target, digest, cells, method in prepared:
                if not target.exists():
                    shutil.copyfile(file, target)
                geometry['atlases'][target.name] = {'sha256': digest, 'crops': cells, 'method': method}
            with GEOMETRY_FILE.open('w', encoding='utf-8', newline='\n') as out:
                out.write(json.dumps(geometry, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'atlases': len(prepared), 'cells': len(prepared) * 12,
                      'grid_fallbacks': [t.name for _, t, _, _, m in prepared if m.startswith('fixed')]}))


if __name__ == '__main__':
    main()
