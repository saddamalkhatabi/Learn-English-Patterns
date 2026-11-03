"""Import staged external PNGs with exact per-cell reviews; never invent approval.
Usage: python scripts/import-reviewed-scenes.py STAGE_DIRECTORY
Requires existing FFmpeg, Node and the tiny media-tools scripts (no model packages).
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.media-tools/scripts'))


def load(file):
    return json.loads(pathlib.Path(file).read_text(encoding='utf-8-sig'))


def save(file, value):
    file = pathlib.Path(file)
    file.parent.mkdir(parents=True, exist_ok=True)
    temp = file.with_suffix(file.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(file)


def digest(file):
    return hashlib.sha256(pathlib.Path(file).read_bytes()).hexdigest()


def run(args):
    subprocess.run(args, cwd=ROOT, check=True)


def compose(images, target, gutter=False, old=None, replace=None):
    """Compose real inputs; optional old atlas preserves every other512px tile."""
    args = ['ffmpeg', '-v', 'error', '-y']
    if old:
        args += ['-i', str(old)]
    for image in images:
        args += ['-i', str(image)]
    filters, labels = [], []
    if old:
        filters.append('[0:v]split=12' + ''.join('[b%d]' % i for i in range(12)))
    for i in range(12):
        label = '[c%d]' % i
        if old and i != replace:
            filters.append('[b%d]crop=512:512:%d:%d%s' % (i, i % 3 * 512, i // 3 * 512, label))
        elif old:
            # Consume the replaced split pad so FFmpeg has no unconnected output.
            filters.append('[b%d]nullsink' % i)
            filters.append('[1:v]scale=512:512:flags=lanczos' + label)
        elif i < len(images):
            transform = 'scale=504:504:flags=lanczos,pad=512:512:4:4:color=white' if gutter else 'scale=512:512:flags=lanczos'
            filters.append('[%d:v]%s%s' % (i, transform, label))
        else:
            filters.append('color=c=0xf7f3e8:s=504x504:d=1,pad=512:512:4:4:color=white' + label)
        labels.append(label)
    filters.append(''.join(labels) + 'xstack=inputs=12:layout=' + '|'.join('%d_%d' % (i % 3 * 512, i // 3 * 512) for i in range(12)) + '[out]')
    args += ['-filter_complex', ';'.join(filters), '-map', '[out]', '-frames:v', '1', str(target)]
    run(args)


def normalize(source, target):
    from atlas_geometry import gutter_geometry
    geometry = gutter_geometry(source)
    assert abs(geometry['width'] / geometry['height'] - .75) < .003, 'Atlas must be3:4'
    assert all(abs(r['width'] / r['height'] - 1) < .08 for r in geometry['source_rects']), 'Unequal cells: regenerate, do not stretch'
    filters = ['[0:v]split=12' + ''.join('[s%d]' % i for i in range(12))]
    for i, r in enumerate(geometry['source_rects']):
        filters.append('[s%d]crop=%d:%d:%d:%d,scale=512:512:flags=lanczos[c%d]' % (i, r['width'], r['height'], r['x'], r['y'], i))
    filters.append(''.join('[c%d]' % i for i in range(12)) + 'xstack=inputs=12:layout=' + '|'.join('%d_%d' % (i % 3 * 512, i // 3 * 512) for i in range(12)) + '[out]')
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-filter_complex', ';'.join(filters), '-map', '[out]', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', str(target)])
    return geometry


def import_stage(directory):
    stage = pathlib.Path(directory).resolve()
    intake = load(stage / 'INTAKE.json')
    catalog = load(ROOT / 'handoff/web-20261103/IMAGE-CATALOG.json')
    task = next(t for t in catalog['tasks'] if t['id'] == intake['task_id'])
    report = load(stage / 'REPORT.json')
    assert report['task_id'] == task['id'] and report.get('human_review') is False
    assert report.get('image_tool', '').strip() and report.get('model', '').strip(), 'Declare actual model and image tool'
    reviews = {r['filename']: r for r in report.get('reviews', [])}
    receipt_path = ROOT / 'production/qa/zip-imports' / (intake['zip_sha256'] + '.json')
    prior = load(receipt_path) if receipt_path.exists() else {'imported_groups': []}
    groups = [g for g in catalog['groups'] if g['key'] in intake['complete_groups'] and g['key'] in task['groups'] and g['key'] not in prior['imported_groups']]
    # Whole-package preflight before changing production files.
    for g in groups:
        primary = stage / 'images' / g['primary']['filename']
        files = [g['primary']] if primary.exists() else g['alternates']
        for entry in files:
            source = stage / 'images' / entry['filename']
            r = reviews.get(entry['filename'])
            assert r and r['source_sha256'] == digest(source), 'Review/source mismatch: ' + entry['filename']
            count = 12 if entry['kind'] == 'atlas' else 1
            assert [c['cell'] for c in r['cells']] == list(range(1, count + 1)), 'Missing cell reviews (include8 fillers for084)'
            assert all(c['status'] == 'accepted' and c.get('notes', '').strip() for c in r['cells'])
            assert r.get('actual_prompt', '').strip(), 'Preserve actual prompt used'
        g['_files'] = files
        if g['type'] == 'expansion':
            output = ROOT / 'public/assets/scenes' / (g['key'] + '-atlas-v1.webp')
            metadata = ROOT / 'production/expansion-images' / (g['key'] + '.json')
        else:
            key = g['cells'][0].get('legacy_atlas', g['key'])
            output = ROOT / 'public/assets/scenes' / (key + '-v2.webp')
            metadata = ROOT / 'production/reference-images' / (key + '.json')
        if output.exists():
            meta = load(metadata)
            old_reviews = meta.get('external_generation', {}).get('reviews', [])
            assert [(r['filename'], r['source_sha256']) for r in old_reviews] == [(e['filename'], reviews[e['filename']]['source_sha256']) for e in files], 'Refusing to replace a different approved source'
            assert digest(output) == meta['sha256'] and digest(ROOT / meta['source']) == meta['source_sha256']
            g['_resume'] = True
    from atlas_geometry import gutter_geometry
    work = stage / 'prepared'
    work.mkdir(exist_ok=True)
    # Validate measured geometry of every supplied atlas before publication.
    for g in groups:
        source = stage / 'images' / g['primary']['filename']
        if g['primary']['kind'] == 'atlas' and source.exists():
            geometry = gutter_geometry(source)
            assert abs(geometry['width'] / geometry['height'] - .75) < .003
            assert all(abs(r['width'] / r['height'] - 1) < .08 for r in geometry['source_rects']), g['key'] + ': regenerate unequal cells'
    adopted = []
    checkpoint = load(ROOT / 'production/qa/reference-image-checkpoint.json')
    for g in groups:
        if g.get('_resume'):
            if g['type'] == 'expansion':
                adopted.append(g['key'])
            prior['imported_groups'].append(g['key'])
            continue
        files = [stage / 'images' / e['filename'] for e in g['_files']]
        source = files[0]
        if len(files) > 1:
            source = work / (g['key'] + '.png')
            compose(files, source, gutter=True)
        cell_notes = reviews[g['_files'][0]['filename']]['cells'] if len(files) == 1 else [{'cell': i + 1, 'status': 'accepted', 'notes': reviews[e['filename']]['cells'][0]['notes']} for i, e in enumerate(g['_files'])]
        provenance = {'task_id': task['id'], 'zip_sha256': intake['zip_sha256'], 'model': report['model'], 'tool': report['image_tool'], 'reviews': [reviews[e['filename']] for e in g['_files']], 'human_review': False}
        if g['type'] == 'expansion':
            retained = ROOT / 'production/expansion-images/sources' / (g['key'] + '-v1.png')
            retained.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, retained)
            review_file = ROOT / 'production/qa' / (g['key'] + '-image-review.json')
            save(review_file, {'schema': 1, 'pattern_key': g['key'], 'source_sha256': digest(retained), 'policy': catalog['policy'], 'human_review': False, 'reviewer': 'Upstream image assistant declared in external ZIP; not a new human review', 'cells': cell_notes, 'external_generation': provenance})
            run([sys.executable, 'scripts/prepare-expansion-scenes.py', g['key'], str(retained), str(review_file), '--defer-manifest'])
            meta_path = ROOT / 'production/expansion-images' / (g['key'] + '.json')
            meta = load(meta_path)
            meta['tool'] = report['image_tool']
            meta['external_generation'] = provenance
            save(meta_path, meta)
            adopted.append(g['key'])
        else:
            cell_repair = g['type'] == 'reference-cell-repair'
            key = g['cells'][0]['legacy_atlas'] if cell_repair else g['key']
            meta_path = ROOT / 'production/reference-images' / (key + '.json')
            old = load(meta_path) if meta_path.exists() else {}
            retained = ROOT / 'production/reference-images/sources' / (key + '-v2.png')
            retained.parent.mkdir(parents=True, exist_ok=True)
            target = ROOT / 'public/assets/scenes' / (key + '-v2.webp')
            if cell_repair:
                cell = g['cells'][0]['legacy_cell'] - 1
                compose([source], retained, old=ROOT / 'public' / old['atlas'], replace=cell)
                run(['ffmpeg', '-v', 'error', '-y', '-i', str(retained), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', str(target)])
                geometry = {'method': 'Exact512px composition from previous reviewed display atlas; only the rejected cell replaced'}
                rejected = [c for c in old.get('rejected_cells', []) if c != cell]
            else:
                shutil.copyfile(source, retained)
                geometry = normalize(retained, target)
                rejected = []
            meta = {'key': key, 'source': retained.relative_to(ROOT).as_posix(), 'source_sha256': digest(retained), 'geometry': geometry, 'atlas': target.relative_to(ROOT / 'public').as_posix(), 'sha256': digest(target), 'width': 1536, 'height': 2048, 'cell_count': 4 if key == 'reference-084' else 12, 'review': 'assistant visual review', 'human_review': False, 'rejected_cells': rejected, 'cultural_policy_scope': 'Only newly generated cells; old accepted cells are not newly culturally certified', 'external_generation': provenance}
            save(meta_path, meta)
            checkpoint['repair_cells'] = [r for r in checkpoint['repair_cells'] if not (r['atlas'] == key and (not cell_repair or r['cell_one_based'] == cell + 1))]
            checkpoint['geometry_failures'] = [r for r in checkpoint['geometry_failures'] if r['atlas'] != key]
            if key == 'reference-084':
                checkpoint['invalid_atlas'] = None
            checkpoint['atlases'] = [r for r in checkpoint['atlases'] if r['atlas'] != key]
            checkpoint['atlases'].append({'atlas': key, 'cells': meta['cell_count'], 'accepted_cells': meta['cell_count'] - len(rejected), 'sha256': meta['sha256'], 'geometry': 'Measured grid or exact preserved512px composition', 'human_review': False})
            save(ROOT / 'production/qa/reference-image-checkpoint.json', checkpoint)
        prior['imported_groups'].append(g['key'])
    if adopted:
        run(['node', 'scripts/adopt-expansion-scenes.cjs', *adopted])
    checkpoint['accepted_reference_scenes'] = sum(a['accepted_cells'] for a in checkpoint['atlases'])
    save(ROOT / 'production/qa/reference-image-checkpoint.json', checkpoint)
    run(['node', 'scripts/sync-reference-images.cjs'])
    # Keep production reference rows consistent as well as the public library.
    corpus = {s['id']: s for s in load(ROOT / 'public/source-corpus.json')['sentences']}
    for file in load(ROOT / 'production/plans/source-corpus-1000.json')['manifest_paths']:
        data = load(ROOT / file)
        for s in data['sentences']:
            s['image'] = corpus[s['id']]['image']
        save(ROOT / file, data)
    run(['npm.cmd' if sys.platform == 'win32' else 'npm', 'run', 'build'])
    run(['node', 'scripts/production-status.cjs'])
    save(receipt_path, {**prior, 'schema': 1, 'task_id': task['id'], 'zip_sha256': intake['zip_sha256'], 'model': report['model'], 'tool': report['image_tool'], 'date': datetime.date.today().isoformat()})
    print(json.dumps({'imported_groups': prior['imported_groups'], 'note': 'Files and previews rebuilt. No Git commit/push and no lesson promotion performed.'}))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('stage_directory')
    import_stage(ap.parse_args().stage_directory)
