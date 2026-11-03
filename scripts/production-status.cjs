// Derive production coverage from exact local assets; do not equate it with publication.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { validate, asset, sha } = require('./media-validation.cjs');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const plan = read('production/plans/expansion-all-153.json');
const rows = plan.manifest_paths.flatMap(file => read(file).sentences);
const source = read('public/source-corpus.json');
const catalog = read('public/pattern-catalog.json'), pilot = read('public/pilot.json');
const hashes = new Map();
function reviewedImage(im) {
  if (!im || !['assistant-reviewed', 'visually_reviewed'].includes(im.status)) return false;
  const file = asset(root, im.atlas);
  assert(fs.existsSync(file), 'Reviewed scene missing: ' + im.atlas);
  if (!hashes.has(file)) hashes.set(file, sha(file));
  assert.equal(hashes.get(file), im.sha256, 'Reviewed image hash changed');
  const c = im.crop;
  assert(c && c.x >= 0 && c.y >= 0 && c.width > 0 && c.height > 0 && c.x + c.width <= im.width && c.y + c.height <= im.height);
  assert(im.width <= 1536 && im.height <= 2048);
  return true;
}
const patterns = plan.patterns.map(p => {
  const sentences = p.sentence_ids.map(id => rows.find(s => s.id === id));
  assert.equal(sentences.length, 12);
  const missing = [], voices = { male: 0, female: 0 };
  for (const s of sentences) for (const gender of ['male', 'female']) {
    const rec = s.recordings[gender], valid = validate(rec, asset(root, rec.path), s.en, gender);
    if (rec.sha256) assert(valid, 'Invalid production recording: ' + s.id + '/' + gender);
    if (valid) voices[gender]++; else missing.push(s.id + '/' + gender);
  }
  const images = sentences.filter(s => reviewedImage(s.image)).length;
  return { key: p.key, catalog_id: p.catalog_id, title: p.title, form: p.form, sentences: 12, audio: voices,
    missing_recordings: missing, reviewed_images: images, missing_images: sentences.filter(s => !reviewedImage(s.image)).map(s => s.id),
    media_complete: missing.length === 0 && images === 12, published: pilot.patterns.some(x => x.id === p.id) };
});
const sum = field => patterns.reduce((n, p) => n + p[field], 0);
const male = patterns.reduce((n, p) => n + p.audio.male, 0), female = patterns.reduce((n, p) => n + p.audio.female, 0);
const percent = (n, d) => Math.round(n / d * 10000) / 100;
const allRows=[...new Map([...pilot.sentences,...read('public/supplement.json').sentences,...source.sentences,...rows].map(s=>[s.id,s])).values()];
const audioFiles=new Set(),allVoices={male:0,female:0};let allAudioBindings=0;
for(const s of allRows)for(const gender of ['male','female']){const rec=s.recordings[gender],valid=validate(rec,asset(root,rec.path),s.en,gender);if(rec.sha256)assert(valid,'Invalid audio in total project coverage: '+s.id+'/'+gender);if(valid){audioFiles.add(rec.path);allAudioBindings++;allVoices[gender]++}}
const summary = {
  schema: 1, project: 'Learn-English-Patterns', measured_at: new Date().toISOString(),
  all_project_audio: { sentence_records: allRows.length, voice_bindings: allAudioBindings, male: allVoices.male, female: allVoices.female, distinct_files: audioFiles.size, pending_bindings: allRows.length*2-allAudioBindings,
    note: 'Bindings can reuse the same exact recording. Sentence records include lessons, story lines, references and authored expansion; they are not all distinct English texts.' },
  published_patterns: { complete: pilot.patterns.length, total: catalog.patterns.length, percent: percent(pilot.patterns.length, catalog.patterns.length) },
  expansion: { patterns: patterns.length, sentences: rows.length, audio: { male, female, complete: male + female, total: rows.length * 2,
    missing: rows.length * 2 - male - female, percent: percent(male + female, rows.length * 2) },
    images: { complete: sum('reviewed_images'), total: rows.length, missing: rows.length - sum('reviewed_images'), percent: percent(sum('reviewed_images'), rows.length) },
    patterns_with_complete_media: patterns.filter(p => p.media_complete).length,
    note: 'Completed production assets are not published lessons. Human listening and lesson promotion remain separate.' },
  reference_library: { sentences: source.sentences.length, audio_bindings: source.sentences.reduce((n, s) => n + ['male', 'female'].filter(g => validate(s.recordings[g], asset(root, s.recordings[g].path), s.en, g)).length, 0),
    reviewed_images: source.sentences.filter(s => reviewedImage(s.image)).length },
  cultural_policy: 'arab-muslim-family-v1', human_auditory_review: 'pending; no full human listening claim',
  legacy_cultural_repairs: 'deferred by user; earlier image acceptance did not certify the new cultural policy'
};
fs.writeFileSync(path.join(root, 'production/qa/expansion-status.json'), JSON.stringify({ ...summary, patterns }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'docs/PRODUCTION-STATUS.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
