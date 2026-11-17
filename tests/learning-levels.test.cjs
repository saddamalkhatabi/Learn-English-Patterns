const test = require('node:test');
const assert = require('node:assert/strict');
const levels = require('../public/learning-levels.json');
const plan = require('../production/learning-sequence.json');
const { analyze } = require('../public/english-usage.js');
const additions = require('../public/english-practice.json').dialogues;
const dialogues = [...require('../public/dialogues.json').dialogues, ...additions];
const localized = require('../public/english-usage-audio.json').dialogues;
const audio = {...require('../public/dialogue-audio.json'), ...localized};
const scenes = require('../public/conversation-scenes.json').scenes;
const atlas = require('../public/vocabulary-index.json');

test('all conversations have a teaching level and photos inherit that level', () => {
 const levelOrder = ['A1', 'A2', 'B1', 'B2'];
 assert.deepEqual(new Set(levels.dialogueOrder), new Set(dialogues.map(dialogue => dialogue.id)));
 assert.equal(levels.dialogueOrder.length, dialogues.length);
 let last = 0;
 for (const id of levels.dialogueOrder) {
  const level = levels.dialogues[id], index = levelOrder.indexOf(level);
  assert(index >= last, id);
  last = index;
  for (const photo of Object.values(scenes[id]?.turns||{})) assert.equal(levels.scenes[photo.id], level, photo.id);
 }
 assert.equal(last, 3);
});

test('beginner excerpts lead the conversation sequence and have matching recorded turns', () => {
 const sequence=[...additions.map(row=>row.id),...plan.starterDialogues.map(([id])=>id)];
 assert.deepEqual(levels.dialogueOrder.slice(0,sequence.length),sequence);
 for (const [id, clip] of Object.entries(levels.starter)) {
  assert.equal(levels.dialogues[id], 'A1', id);
  const recording = audio[id];
  const dialogue = dialogues.find(row => row.id === id);
  assert.deepEqual(recording.signature, dialogue.lines.map(line => [
   localized[id] ? analyze(line.en,line).us : line.en, line.voice
  ]));
  assert(recording.turns[clip.from].start_ms < recording.turns[clip.to].end_ms, id);
  assert(clip.to - clip.from <= 2 && clip.ar && clip.en, id);
 }
});

test('every pattern has a level and usable lessons, and atlas sources retain content levels', () => {
 const patterns = ['pilot', 'expansion-media'].flatMap(name => require('../public/' + name + '.json').patterns);
 assert.equal(patterns.length, 180);
 assert.deepEqual(new Set(levels.patternOrder), new Set(patterns.map(pattern => pattern.id)));
 assert.equal(levels.patternOrder.length, patterns.length);
 for (const pattern of patterns) {
  assert(levels.patterns[pattern.id], pattern.id);
  assert.equal(pattern.sentence_ids.length, 12, pattern.id);
  assert(pattern.sentence_ids.some(id => levels.sentences[id] === levels.patterns[pattern.id]), pattern.id);
 }
 for (const source of atlas.sources) {
  if(source.type==='reference-example'){
   assert.equal(source.level,levels.sentences[source.referenceId],source.id);
   continue;
  }
  const registry = source.type === 'sentence' ? levels.sentences :
   source.type === 'dialogue' ? levels.dialogues : levels.scenes;
  assert.equal(source.level, registry[source.id], source.id);
 }
});
