const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { dialogues } = require('../public/dialogues.json');
const media = require('../public/dialogue-audio.json');
const foundation = require('../public/pilot.json');
const expansion = require('../public/expansion-media.json');
const plan = require('../public/dialogue-plan.json');
const corpus = require('../public/source-corpus.json');
const references = new Map(corpus.sentences.map(row => [row.id, row]));

test('conversation turns link to real patterns, scenes and measured cues within a single file', () => {
 const patterns = new Set([...foundation.patterns, ...expansion.patterns].map(p => p.id));
 const {scenes:archive} = require('../public/scene-archive.json');
 const approvedScenes = new Set(archive.map(scene => scene.id));
 const scenes = new Set([...foundation.sentences, ...expansion.sentences, ...corpus.sentences].filter(s => approvedScenes.has(s.id)).map(s => s.id));
 for(const dialogue of dialogues){
  assert(dialogue.lines.length>=6,`Conversation needs six or more speaking turns: ${dialogue.id}`);
  assert.equal(new Set(dialogue.lines.map(line=>line.en)).size,dialogue.lines.length,dialogue.id);
  assert(patterns.has(dialogue.after)||dialogue.after===null&&dialogue.lines.some(line=>line.referenceId),dialogue.id);
  const audio=media[dialogue.id];
  const signature=dialogue.lines.map(line=>[line.en,line.voice]);
  const matches=audio&&JSON.stringify(audio.signature)===JSON.stringify(signature);
  if(process.env.DIALOGUE_AUDIO_REQUIRED==='1'){
   assert(matches&&audio.intro,`Missing aligned audio for ${dialogue.id}`);
  }
  assert.deepEqual(new Set(signature.map(([,voice])=>voice)),new Set(['male','female']));
  if(matches){
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/'+audio.path)).digest('hex'),audio.sha256);
   assert.equal(audio.turns.length,dialogue.lines.length);
   if(audio.intro){
    assert.equal(audio.title,dialogue.en.trim().replace(/[.!?]+$/,'')+'.');
    assert.equal(audio.intro.start_ms,0);
    assert(audio.intro.end_ms<audio.turns[0].start_ms);
    assert.equal(audio.intro.words.length,audio.title.split(/\s+/).length);
   }
  }
  for(const [i,line] of dialogue.lines.entries()){
   assert(line.patterns.every(id=>patterns.has(id)),line.en);
   assert(scenes.has(line.scene),line.scene);
   if(line.focus){
    assert.equal(Boolean(line.focus.length),Boolean(line.patterns.length||line.referenceId||line.expression),line.en);
    assert(line.focus.every((index,j)=>Number.isInteger(index)&&index>(line.focus[j-1]??-1)
     &&index<line.en.split(/\s+/).length),line.en);
   }
   if(!matches)continue;
   const turn=audio.turns[i];
   assert(turn.start_ms >= (audio.turns[i-1]?.end_ms ?? 0));
   assert(turn.end_ms <= audio.duration_ms+2);
   assert.equal(turn.words.length,line.en.split(/\s+/).length);
   assert(turn.words.every((word,j)=>word.start_ms >= (turn.words[j-1]?.end_ms ?? turn.start_ms)
    && word.start_ms<word.end_ms && word.end_ms<=turn.end_ms));
  }
 }
});

test('both rule announcements are available for every taught pattern',()=>{
 const expected=require('../scripts/training-cues.cjs');
 const cues=require('../public/training-audio.json');
 const {ideaWordCueId}=require('../public/training-narration.js');
 const vocabulary=new Set(require('../public/idea-scenes.json').scenes.flatMap(scene=>scene.words.map(word=>word.en)));
 for(const voice of ['male','female']){
  const keys=[...vocabulary].map(word=>ideaWordCueId(word,voice));
  assert.equal(new Set(keys).size,vocabulary.size);
  [...vocabulary].forEach((word,index)=>assert.equal(expected[keys[index]],word));
 }
 for(const [id,spoken] of Object.entries(expected)){
  assert(!/[\u0600-\u06ff]/.test(spoken)&&spoken.trim(),id);
  const audio=cues[id];
  if(process.env.DIALOGUE_AUDIO_REQUIRED==='1')assert(audio?.text===spoken,id);
  if(audio?.text!==spoken)continue;
  assert(audio.duration_ms>0,id);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/'+audio.path)).digest('hex'),audio.sha256,id);
 }
});

test('level one has 200 conversations, with multiple contexts for every course pattern', () => {
 const published = new Map(dialogues.map(dialogue => [dialogue.id,dialogue]));
 const entries = new Map(plan.entries.map(entry => [entry.id,entry]));
 assert.equal(entries.size,plan.entries.length,'duplicate conversation IDs');
 assert.equal(published.size,dialogues.length,'duplicate published conversation IDs');
 assert.equal(published.size,entries.size,'every planned situation needs a transcript');
 const levelOne=plan.entries.filter(entry=>(entry.series??plan.defaultSeries)===1);
 assert.equal(levelOne.length,200);
 assert(levelOne.some(entry=>entry.category==='interview'));
 for(const dialogue of dialogues){
  const entry=entries.get(dialogue.id);
  assert(entry,dialogue.id);
  assert.equal(entry.category,dialogue.category);
 }
 const categoriesByPattern=new Map();
 const dialoguesByPattern=new Map();
 for(const entry of entries.values()){
  const dialogue=published.get(entry.id);
  assert(dialogue,entry.id);
  const targets=dialogue.lines.flatMap(line=>line.patterns);
  if(entry.targets)assert.deepEqual(new Set(targets),new Set(entry.targets),entry.id);
  assert(entry.taskAr&&entry.taskEn&&(targets.length||dialogue.lines.some(line=>line.referenceId)),entry.id);
  for(const id of targets){
   if(!categoriesByPattern.has(id))categoriesByPattern.set(id,new Set());
   categoriesByPattern.get(id).add(entry.category);
   if((entry.series??plan.defaultSeries)===1){
    if(!dialoguesByPattern.has(id))dialoguesByPattern.set(id,new Set());
    dialoguesByPattern.get(id).add(entry.id);
   }
  }
 }
 const curriculum=[...foundation.patterns,...expansion.patterns].map(pattern=>pattern.id);
 assert.deepEqual(new Set(categoriesByPattern.keys()),new Set(curriculum));
 for(const id of curriculum){
  assert(dialoguesByPattern.get(id)?.size>=2,`Pattern ${id} needs two level-one conversations`);
 }
 for(const id of plan.corePatterns){
  assert(categoriesByPattern.get(id)?.size>=2,`Core pattern ${id} needs two domains`);
 }
});

test('level two has 200 conversations tied to exact library examples across all grammar categories', () => {
 const levelTwo=new Set(plan.entries.filter(entry=>entry.series===2).map(entry=>entry.id));
 assert.equal(levelTwo.size,200);
 const used=new Set();
 for(const dialogue of dialogues.filter(dialogue=>levelTwo.has(dialogue.id))){
  const turns=dialogue.lines.filter(line=>line.referenceId);
  assert(turns.length,dialogue.id);
  for(const turn of turns){
   const reference=references.get(turn.referenceId);
   assert(reference,turn.referenceId);
   assert.equal(turn.en,reference.en,dialogue.id);
   assert.equal(turn.ar,reference.ar,dialogue.id);
   assert(turn.focus.length,dialogue.id);
   used.add(reference.id);
  }
 }
 assert(used.size>=200);
 const grammar=new Set([...used].flatMap(id=>references.get(id).grammar));
 assert.deepEqual(grammar,new Set(corpus.taxonomy.grammar.map(item=>item.id)));
});

test('level three adds 200 bilingual conversations and introduces unused reference examples', () => {
 const levelThree = new Set(plan.entries.filter(entry => entry.series === 3).map(entry => entry.id));
 assert.equal(levelThree.size, 200);
 assert.equal(dialogues.length, 600);
 const earlier = new Set(dialogues.filter(dialogue => !levelThree.has(dialogue.id))
  .flatMap(dialogue => dialogue.lines.map(line => line.referenceId)));
 const newReferences = new Set();
 const categories = new Set();
 for (const dialogue of dialogues.filter(dialogue => levelThree.has(dialogue.id))) {
  categories.add(dialogue.category);
  const quoted = dialogue.lines.filter(line => line.referenceId);
  assert(new Set(quoted.map(line => line.referenceId)).size >= 2, dialogue.id);
  assert(dialogue.lines.some(line => line.expression && line.patterns.length), dialogue.id);
  for (const line of dialogue.lines) {
   assert(/\p{Script=Arabic}/u.test(line.ar), dialogue.id);
   if (line.expression) {
    const words = line.en.split(/\s+/);
    assert.equal(line.focus.map(index => words[index]).join(' ').replace(/[.?!,;:]+$/, ''), line.expression, dialogue.id);
   }
  }
  for (const line of quoted) {
   const reference = references.get(line.referenceId);
   assert.equal(line.en, reference.en, dialogue.id);
   assert.equal(line.ar, reference.ar, dialogue.id);
   if (!earlier.has(reference.id)) newReferences.add(reference.id);
  }
 }
 assert.equal(categories.size, 9);
 assert(newReferences.size >= 370);
 const vocabulary = require('../public/vocabulary-index.json');
 for (const expression of ['in that case', 'take your time', 'make sure', 'could you clarify', 'what matters is']) {
  const phrase = vocabulary.entries.find(entry => entry.pos === 'PHRASE' && entry.en.toLowerCase() === expression);
  assert(phrase?.sourceIds.some(index => levelThree.has(vocabulary.sources[index].id)), expression);
 }
});
