"""Prepare a reviewed expansion atlas using measured gutters, without model packages.

Usage: python scripts/prepare-expansion-scenes.py pattern-9017 source.png review.json
Needs the repository's media-tools scripts and FFmpeg/FFprobe only.
"""
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.media-tools/scripts'))
from atlas_geometry import gutter_geometry
from prepare_scenes import dimensions


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def save(file, data):
    file.parent.mkdir(parents=True, exist_ok=True)
    temporary = file.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    temporary.replace(file)


def main():
    key, source_arg, review_arg = sys.argv[1:]
    source, review_file = pathlib.Path(source_arg).resolve(), pathlib.Path(review_arg).resolve()
    plan = json.loads((ROOT / 'production/plans/expansion-all-153.json').read_text(encoding='utf-8'))
    pattern = next(p for p in plan['patterns'] if p['key'] == key)
    review = json.loads(review_file.read_text(encoding='utf-8'))
    policy = json.loads((ROOT / 'production/scene-policy.json').read_text(encoding='utf-8'))
    assert review['source_sha256'] == digest(source), 'Review does not match this source'
    assert review['policy'] == policy['id'] and review['human_review'] is False
    assert review['pattern_key'] == key
    assert [c['cell'] for c in review['cells']] == list(range(1, 13))
    assert all(c['status'] == 'accepted' and c['notes'].strip() for c in review['cells'])
    geometry = gutter_geometry(source)
    assert abs(geometry['width'] / geometry['height'] - 0.75) < 0.003, 'Wrong source aspect ratio; regenerate'
    assert all(abs(r['width'] / r['height'] - 1) < 0.08 for r in geometry['source_rects']), 'Cells are not approximately square'
    target = ROOT / 'public/assets/scenes' / f'{key}-atlas-v1.webp'
    assert not target.exists(), 'Use a new version rather than overwriting a reviewed asset'
    temporary = target.with_name(target.stem + '.tmp.webp')
    filters = ['[0:v]split=12' + ''.join(f'[s{i}]' for i in range(12))]
    for i, r in enumerate(geometry['source_rects']):
        filters.append(f'[s{i}]crop={r["width"]}:{r["height"]}:{r["x"]}:{r["y"]},scale=512:512:flags=lanczos[c{i}]')
    filters.append(''.join(f'[c{i}]' for i in range(12)) + 'xstack=inputs=12:layout=' + '|'.join(f'{i%3*512}_{i//3*512}' for i in range(12)) + '[out]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-filter_complex', ';'.join(filters), '-map', '[out]', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', str(temporary)], check=True)
    assert dimensions(temporary) == (1536, 2048)
    atlas_hash = digest(temporary)
    updates = []
    for name in plan['manifest_paths']:
        file = ROOT / name
        data = json.loads(file.read_text(encoding='utf-8'))
        touched = False
        for sentence in data['sentences']:
            if sentence['pattern_id'] != pattern['id']:
                continue
            im = sentence['image']
            im.update({'atlas': target.relative_to(ROOT / 'public').as_posix(), 'sha256': atlas_hash, 'width': 1536, 'height': 2048,
                       'tile_aspect': 1, 'crop': {'x': im['cell'] % 3 * 512 + 1, 'y': im['cell'] // 3 * 512 + 1, 'width': 510, 'height': 510},
                       'status': 'assistant-reviewed', 'cultural_policy': policy['id'], 'review_path': review_file.relative_to(ROOT).as_posix()})
            touched = True
        if touched:
            updates.append((file, data))
    assert sum(sum(s['pattern_id'] == pattern['id'] for s in d['sentences']) for _, d in updates) == 12
    temporary.replace(target)
    for file, data in updates:
        save(file, data)
    provenance = {'schema': 1, 'key': key, 'source': source.relative_to(ROOT).as_posix(), 'source_sha256': digest(source),
                  'source_dimensions': [geometry['width'], geometry['height']], 'geometry_verification': geometry,
                  'atlas': target.relative_to(ROOT / 'public').as_posix(), 'sha256': atlas_hash, 'width': 1536, 'height': 2048,
                  'tool': 'built-in imagegen', 'review': review_file.relative_to(ROOT).as_posix(), 'policy': policy['id'],
                  'prompt': f'production/expansion-image-prompts/{key}.txt', 'publication': 'production only; lesson promotion remains separate'}
    save(ROOT / 'production/expansion-images' / f'{key}.json', provenance)
    print(json.dumps({'key': key, 'atlas': provenance['atlas'], 'reviewed_cells': 12, 'sha256': atlas_hash}))


if __name__ == '__main__':
    main()
