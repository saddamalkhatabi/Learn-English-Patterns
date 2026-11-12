const assert = require('node:assert/strict');
const fs = require('node:fs');
const { sentences } = require('../public/source-corpus.json');
const teaching = require('../public/teaching-index.json').sentences;
const sceneIds = new Set(require('../public/scene-archive.json').scenes.map(scene => scene.id));
const patterns = new Set([
  ...require('../public/pilot.json').patterns,
  ...require('../public/expansion-media.json').patterns
].map(pattern => pattern.id));
const references = new Map(sentences.map(row => [row.ordinal, row]));
const catalogue = require('../public/dialogues.json');
const plan = require('../public/dialogue-plan.json');
const authored = fs.readFileSync('production/dialogue-level-three.tsv', 'utf8').trim().split(/\r?\n/);
const groups = [];

for (const row of authored) {
  if (!row.trim() || row.startsWith('#')) continue;
  if (row.startsWith('@')) {
    const [number, en, ar, category, purpose, level, ...extra] = row.slice(1).split('|');
    assert(/^\d{3}$/.test(number) && en && ar && !extra.length, row);
    assert(['social', 'food', 'travel', 'study', 'daily', 'shopping', 'health', 'work', 'interview'].includes(category), row);
    assert(['ask', 'request', 'describe', 'choose', 'plan', 'retell', 'explain', 'solve'].includes(purpose), row);
    assert(['A2', 'B1', 'B2'].includes(level), row);
    groups.push({ id: `l3-${number}`, en, ar, category, purpose, level, rows: [] });
  } else {
    assert(groups.length, row);
    groups.at(-1).rows.push(row);
  }
}
assert.equal(groups.length, 200);
assert.equal(new Set(groups.map(group => group.id)).size, 200);

function parseTurn(row) {
  const [marked, translation, targetIds, ...extra] = row.split('|');
  assert(!extra.length, row);
  if (marked.startsWith('=')) {
    assert(!translation && !targetIds, row);
    const reference = references.get(Number(marked.slice(1)));
    assert(reference?.ar && sceneIds.has(reference.id), row);
    const measuredFocus = teaching[reference.id]?.highlight;
    const focus = measuredFocus?.length ? measuredFocus : reference.en.split(/\s+/).map((_, index) => index);
    return { en: reference.en, ar: reference.ar, patterns: [], referenceId: reference.id, focus, scene: reference.id };
  }
  assert(marked && translation, row);
  const expressions = [...marked.matchAll(/\[([^\[\]]+)\]/g)];
  assert(expressions.length <= 1, row);
  const [expression] = expressions;
  const en = marked.replace(/[\[\]]/g, '');
  const targets = targetIds ? targetIds.split(',').map(Number) : [];
  assert(targets.every(id => patterns.has(id)), row);
  assert(!targets.length || expression, row);
  const turn = { en, ar: translation, patterns: targets };
  if (expression) {
    const before = marked.slice(0, expression.index).trim();
    const start = before ? before.split(/\s+/).length : 0;
    turn.expression = expression[1];
    turn.focus = expression[1].split(/\s+/).map((_, i) => start + i);
  }
  return turn;
}

const dialogues = catalogue.dialogues.filter(dialogue => !/^l3-\d{3}$/.test(dialogue.id));
const entries = plan.entries.filter(entry => entry.series !== 3);
const knownTitles = new Set(dialogues.map(dialogue => dialogue.en.toLowerCase()));
const levelThree = [];
const levelThreePlan = [];
for (const group of groups) {
  const { id, en, ar, category, purpose, level, rows } = group;
  assert(!knownTitles.has(en.toLowerCase()), en);
  knownTitles.add(en.toLowerCase());
  const parsed = rows.map(parseTurn);
  const sources = parsed.flatMap((turn, position) => turn.referenceId ? [{ position, id: turn.referenceId }] : []);
  const targets = [...new Set(parsed.flatMap(turn => turn.patterns))];
  assert(parsed.length >= 6 && sources.length >= 2 && targets.length, id);
  assert.equal(new Set(parsed.map(turn => turn.en)).size, parsed.length, id);
  const lines = parsed.map((turn, position) => {
    const nearest = sources.reduce((a, b) => Math.abs(a.position - position) <= Math.abs(b.position - position) ? a : b);
    return { voice: position % 2 === 0 ? 'male' : 'female', ...turn, scene: turn.scene || nearest.id };
  });
  levelThree.push({ id, en, ar, category, after: targets[0], lines });
  levelThreePlan.push({ id, en, ar, category, level, purpose, taskEn: en, taskAr: ar, batch: 16 + Math.floor((Number(id.slice(3)) - 1) / 20), series: 3, targets });
}

function replaceLevelThree(file, firstEntry, closing, generated, expected) {
  const current = fs.readFileSync(file, 'utf8');
  const first = current.search(firstEntry);
  const end = first === -1 ? current.lastIndexOf(closing) : first;
  assert(end > 0, file);
  const prefix = current.slice(0, end).trimEnd().replace(/,$/, '');
  const output = prefix + ',\n' + generated.join(',\n') + '\n' + closing + '\n';
  assert.deepEqual(JSON.parse(output), expected, file);
  fs.writeFileSync(file, output);
}

function formatDialogue({ lines, ...fields }) {
  const header = Object.entries(fields).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(', ');
  const turns = lines.map(line => '        ' + JSON.stringify(line)).join(',\n');
  return `    {\n      ${header},\n      "lines": [\n${turns}\n      ]\n    }`;
}

replaceLevelThree('public/dialogues.json', /^    \{\r?\n      "id": "l3-\d{3}"/m, ']}', levelThree.map(formatDialogue),
  { ...catalogue, dialogues: [...dialogues, ...levelThree] });
replaceLevelThree('public/dialogue-plan.json', /^    \{"id":"l3-\d{3}"/m, '  ]\n}', levelThreePlan.map(entry => '    ' + JSON.stringify(entry)),
  { ...plan, entries: [...entries, ...levelThreePlan] });
console.log(`Published ${groups.length} level-three conversations`);
