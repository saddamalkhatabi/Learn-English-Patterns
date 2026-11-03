"""One cross-platform command for all returned ZIPs: add --apply to import reviewed files."""
import argparse
import importlib.util
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    receiver = module('scene_receiver', 'receive-scene-zip.py')
    importer = module('scene_importer', 'import-reviewed-scenes.py') if args.apply else None
    archives = sorted((ROOT / 'incoming/scene-zips').glob('*.zip'))
    if not archives:
        raise SystemExit('Place returned ZIPs in incoming/scene-zips first.')
    for archive in archives:
        match = re.fullmatch(r'(EP-(?:IMG|REF)-\d{3})(?:-[A-Za-z0-9_-]+)?\.zip', archive.name)
        if not match:
            raise ValueError('Unexpected archive filename: ' + archive.name)
        result = receiver.stage(archive, match[1])
        print(archive.name, ':', len(result['complete_groups']), 'complete groups;', len(result['incomplete_groups']), 'incomplete')
        if importer:
            importer.import_stage(result['stage'])
    print('Finished staging' + (' and importing; run npm run check before publishing.' if importer else '; no production content changed.'))
