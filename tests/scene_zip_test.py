"""Bounded ZIP intake tests; no packages, model weights or project mutation."""
import importlib.util
import json
import pathlib
import struct
import sys
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('scene_receiver', ROOT / 'scripts/receive-scene-zip.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


def header(w=1086, h=1448):
    # Header-only fixture tests intake bounds; full decoding occurs during preparation.
    return b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\rIHDR' + struct.pack('>II', w, h) + b'\x08\x02\x00\x00\x00' + b'\x00' * 4


class Intake(unittest.TestCase):
    def setUp(self):
        parent = ROOT / '.local'
        parent.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=parent, prefix='zip-test-')
        self.root = pathlib.Path(self.temp.name).resolve()
        self.assertTrue(self.root.is_relative_to(parent.resolve()))
        self.task = {'id': 'EP-IMG-001', 'groups': ['pattern-9039']}
        self.catalog = self.root / 'catalog.json'
        self.catalog.write_text(json.dumps({'tasks': [self.task], 'groups': [{'key': 'pattern-9039', 'primary': {'filename': 'pattern-9039-v1.png', 'kind': 'atlas'}, 'alternates': [{'filename': 'pattern-9039-01.png', 'kind': 'cell'}]}]}))

    def tearDown(self):
        self.temp.cleanup()

    def intake(self, entries):
        file = self.root / 'test.zip'
        with zipfile.ZipFile(file, 'w') as out:
            for name, data in entries:
                entry = zipfile.ZipInfo(name)
                entry.filename = name  # Preserve raw backslashes for the rejection test on Windows.
                out.writestr(entry, data)
        return receiver.stage(file, 'EP-IMG-001', self.catalog, self.root / 'staged')

    def test_valid_atlas_and_repeat(self):
        entries = [('images/pattern-9039-v1.png', header()), ('REPORT.json', b'{"task_id":"EP-IMG-001"}')]
        a = self.intake(entries)
        self.assertEqual(a['complete_groups'], ['pattern-9039'])
        self.assertIn('not approved', a['approval'])
        self.assertEqual(a['zip_sha256'], self.intake(entries)['zip_sha256'])

    def test_unsafe_paths(self):
        for name in ['../escape.png', '/escape.png', 'C:/escape.png', 'images\\pattern-9039-v1.png']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.intake([(name, header())])

    def test_duplicate_entry(self):
        with self.assertRaises(ValueError):
            self.intake([('images/pattern-9039-v1.png', header())] * 2)

    def test_wrong_shape_and_fake_extension(self):
        for data in [header(1024, 2048), b'JPEG pretending to be PNG']:
            with self.assertRaises(ValueError):
                self.intake([('images/pattern-9039-v1.png', data)])

    def test_unrequested_and_ambiguous(self):
        with self.assertRaises(ValueError):
            self.intake([('images/pattern-9017-v1.png', header())])
        with self.assertRaises(ValueError):
            self.intake([('images/pattern-9039-v1.png', header()), ('images/pattern-9039-01.png', header(1024, 1024))])

    def test_report_mismatch(self):
        with self.assertRaises(ValueError):
            self.intake([('images/pattern-9039-v1.png', header()), ('REPORT.json', b'{"task_id":"EP-IMG-002"}')])


if __name__ == '__main__':
    unittest.main()
