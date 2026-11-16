const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => require('../public/' + name + '.json');
const editorial = require('../production/learning-sequence.json');
const levels = ['A1', 'A2', 'B1', 'B2'];
const catalog = read('pattern-catalog').patterns;
const ids = catalog.map(pattern => pattern.planned_pattern_id || pattern.id);
const assigned = Object.values(editorial.patterns).flat();
assert.equal(new Set(assigned).size, assigned.length, 'Pattern levels must be unique');
assert(assigned.every(id => ids.includes(id)), 'Unknown pattern in learning sequence');
const patternOrder = levels.flatMap(level => editorial.patterns[level] || ids.filter(id => !assigned.includes(id)));
const patterns = Object.fromEntries(levels.flatMap(level =>
 (editorial.patterns[level] || ids.filter(id => !assigned.includes(id))).map(id => [id, level])));

const plan = read('dialogue-plan').entries;
const dialogueRows = new Map(read('dialogues').dialogues.map(dialogue => [dialogue.id, dialogue]));
const starter = Object.fromEntries(editorial.starterDialogues.map(([id, from, to, ar, en]) => {
 assert(from >= 1 && to > from && to <= dialogueRows.get(id)?.lines.length, id);
 assert(plan.some(entry => entry.id === id && entry.level === 'A1'), id);
 return [id, { from: from - 1, to: to - 1, ar, en }];
}));
const overrides = Object.entries(editorial.dialogueLevels).flatMap(([level, list]) => list.map(id => [id, level]));
assert.equal(new Set(overrides.map(([id]) => id)).size, overrides.length);
assert(overrides.every(([id, level]) => dialogueRows.has(id) && levels.includes(level) && !starter[id]));
const explicit = new Map(overrides);
const clipOrder = new Map(Object.keys(starter).map((id, index) => [id, index]));
const goals = ['describe', 'request', 'ask', 'choose', 'plan', 'retell', 'explain', 'solve'];
const contexts = ['social', 'food', 'daily', 'travel', 'shopping', 'study', 'health', 'work', 'interview'];
const rank = (list, item) => list.includes(item) ? list.indexOf(item) : list.length;
const words = text => text.trim().split(/\s+/).length;
const complexity = lines => {
 const lengths = lines.map(line => words(line.en));
 return Math.max(...lengths) + lengths.reduce((a, b) => a + b, 0) / lengths.length;
};
const dialogues = Object.fromEntries(plan.filter(entry => dialogueRows.has(entry.id)).map(entry =>
 [entry.id, explicit.get(entry.id) || entry.level]));
assert.equal(Object.keys(dialogues).length, dialogueRows.size, 'Every conversation needs a teaching level');
assert(Object.values(dialogues).every(level => levels.includes(level)));
const dialogueOrder = plan.filter(entry => dialogues[entry.id]).map(entry => ({
 ...entry, length: complexity(dialogueRows.get(entry.id).lines)
})).sort((a, b) => rank(levels, dialogues[a.id]) - rank(levels, dialogues[b.id]) ||
 (clipOrder.get(a.id) ?? Infinity) - (clipOrder.get(b.id) ?? Infinity) ||
 rank(goals, a.purpose) - rank(goals, b.purpose) ||
 rank(contexts, a.category) - rank(contexts, b.category) || a.length - b.length)
 .map(entry => entry.id);

const photoOwners = new Map();
for (const [id, row] of Object.entries(read('conversation-scenes').scenes)) {
 for (const photo of [row.cover, ...Object.values(row.turns)].filter(Boolean)) {
  if (!photoOwners.has(photo.id)) photoOwners.set(photo.id, id);
 }
}
const sentenceLevel = row => {
 if (row.pattern_id) {
  const level = patterns[row.pattern_id] || row.difficulty?.cefr || 'A2';
  // The final examples can model language for the next stage of the course.
  if (level === 'A1' && row.optional_advanced) return 'A2';
  return level;
 }
 return levels.find(level => row.level?.startsWith(level)) || 'A2';
};
const sentences = Object.fromEntries(['pilot', 'expansion-media', 'source-corpus', 'supplement']
 .flatMap(name => read(name).sentences.map(row => [row.id, sentenceLevel(row)])));
const priorityScenes = new Set(editorial.starterScenes);
const familiar = new Set(['home', 'food', 'social', 'daily', 'shopping', 'study', 'travel', 'market', 'objects']);
const scenes = {};
for (const scene of read('idea-scenes').scenes) {
 const owner = photoOwners.get(scene.id);
 const targets = (scene.patterns || []).map(pattern => patterns[pattern.id]).filter(Boolean);
 const simplest = levels.find(level => targets.includes(level));
 scenes[scene.id] = dialogues[owner] || sentences[scene.sentenceId] ||
  (priorityScenes.has(scene.id) ? 'A1' : simplest === 'A1' ?
   (familiar.has(scene.topic) && words(scene.sentenceEn) <= 12 ? 'A1' : 'A2') : simplest || 'B1');
}
assert(editorial.starterScenes.every(id => scenes[id] === 'A1'));
const data = { schema: 1, patterns, patternOrder, dialogues, dialogueOrder, starter, sentences, scenes,
 starterScenes: editorial.starterScenes };
fs.writeFileSync(path.join(__dirname, '../public/learning-levels.json'), JSON.stringify(data) + '\n');
for (const level of levels) console.log(level, Object.fromEntries(['patterns', 'dialogues', 'sentences', 'scenes']
 .map(key => [key, Object.values(data[key]).filter(value => value === level).length])));
