// Visual policy is separate from the frozen text/audio batch and its content hash.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { policy, scene, risks } = require('./scene-policy.cjs');
const root = path.resolve(__dirname, '..');
const plan = require('../production/plans/expansion-all-153.json');
const rows = plan.manifest_paths.flatMap(file => JSON.parse(fs.readFileSync(path.join(root, file))).sentences);
const selection = process.argv.slice(2);
const patterns = selection.length ? plan.patterns.filter(p => selection.includes(p.key)) : plan.patterns;
if (selection.some(key => !patterns.some(p => p.key === key))) throw Error('Unknown pattern key');
const destination = path.join(root, 'production/expansion-image-prompts');
fs.mkdirSync(destination, { recursive: true });
for (const p of patterns) {
  const sentences = p.sentence_ids.map(id => rows.find(s => s.id === id));
  if (sentences.length !== 12 || sentences.some(s => !s)) throw Error('Incomplete scene set');
  const prompt = [
    'Use case: scientific-educational. Generate ONE English Patterns learning atlas.',
    `Pattern context: ${p.form}. Style: ${policy.style}`,
    'Canvas width:height MUST be THREE:FOUR (0.75), not 1:2. Exactly 3 columns by 4 rows of SQUARE photographic cells, with narrow continuous pure white divider gutters. All twelve cells visible. Final display contract 1536x2048.',
    ...policy.constraints,
    'The following English sentences are context only: do not render their text. Exact panel order, left to right then top to bottom:',
    ...sentences.map((s, i) => `${i + 1}. Meaning: ${s.en} Visual staging: ${scene(s)}`)
  ].join('\n');
  fs.writeFileSync(path.join(destination, `${p.key}.txt`), prompt + '\n');
}
const audit = rows.map(s => ({ id: s.id, pattern_id: s.pattern_id, en: s.en, flags: risks(s) })).filter(s => s.flags.length);
fs.writeFileSync(path.join(root, 'production/qa/scene-policy-audit.json'), JSON.stringify({
  schema: 1, policy: policy.id, policy_sha256: crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex'),
  total_scenes: rows.length, flagged_scenes: audit.length, note: 'Flags guide staging and visual review; they do not reject the teaching sentence or certify generated images.', scenes: audit
}, null, 2) + '\n');
console.log(JSON.stringify({ prompts_written: patterns.length, scenes: rows.length, flagged_scenes: audit.length, policy: policy.id }));
