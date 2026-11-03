// Always copy withheld states too: retaining a previous approved image exposes stale crops.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const plan = read('production/plans/source-corpus-1000.json');
const corpus = read('public/source-corpus.json');
const incoming = new Map(plan.manifest_paths.flatMap(file => read(file).sentences).map(s => [s.id, s]));
let ready = 0;
const atlases = new Set();
for (const s of corpus.sentences) {
  const row = incoming.get(s.id);
  if (!row || row.en !== s.en) throw Error('Reference identity changed');
  const im = structuredClone(row.image);
  const key = `reference-${String(Math.floor((s.ordinal - 1) / 12) + 1).padStart(3, '0')}`;
  const file = path.join(root, 'production/reference-images', key + '.json');
  const meta = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const cell = (s.ordinal - 1) % 12;
  if (meta?.review === 'assistant visual review' && !meta.rejected_cells?.includes(cell)) {
    Object.assign(im, { atlas: meta.atlas, sha256: meta.sha256, cell, columns: 3, rows: 4, width: 1536, height: 2048, tile_aspect: 1,
      crop: { x: cell % 3 * 512 + 1, y: Math.floor(cell / 3) * 512 + 1, width: 510, height: 510 }, status: 'assistant-reviewed' });
  } else {
    im.status = meta?.rejected_cells?.includes(cell) ? 'review-rejected' : 'generated-pending-review';
    im.review_note = meta?.geometry_error || meta?.review || 'No approved source sidecar';
  }
  s.image = im;
  s.lifecycle.image = im.status === 'assistant-reviewed' ? 'assistant-reviewed' : 'pending';
  if (im.status === 'assistant-reviewed') { ready++; atlases.add(im.atlas); }
}
corpus.counts.scenes = ready;
corpus.counts.atlases = atlases.size;
fs.writeFileSync(path.join(root, 'public/source-corpus.json'), JSON.stringify(corpus, null, 2) + '\n');
const audit = read('public/source-corpus-audit.json');
audit.counts = corpus.counts;
audit.complete_images = ready === corpus.sentences.length;
fs.writeFileSync(path.join(root, 'public/source-corpus-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ reviewed_reference_scenes: ready, withheld_reference_scenes: corpus.sentences.length - ready }));
