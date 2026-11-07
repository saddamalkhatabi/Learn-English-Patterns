const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { dialogues } = require('../public/dialogues.json');
const media = require('../public/dialogue-audio.json');
const foundation = require('../public/pilot.json');
const expansion = require('../public/expansion-media.json');
const plan = require('../public/dialogue-plan.json');

test('conversation turns link to real patterns, scenes and measured cues within a single file', () => {
 const patterns = new Set([...foundation.patterns, ...expansion.patterns].map(p => p.id));
 const scenes = new Set([...foundation.sentences, ...expansion.sentences].filter(s => s.image).map(s => s.id));
 for(const dialogue of dialogues){
  assert(patterns.has(dialogue.after));
  const audio=media[dialogue.id];
  const signature=dialogue.lines.map(line=>[line.en,line.voice]);
  assert.deepEqual(new Set(signature.map(([,voice])=>voice)),new Set(['male','female']));
  if(audio && JSON.stringify(audio.signature)===JSON.stringify(signature)){
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
   if(!audio||JSON.stringify(audio.signature)!==JSON.stringify(signature))continue;
   const turn=audio.turns[i];
   assert(turn.start_ms >= (audio.turns[i-1]?.end_ms ?? 0));
   assert(turn.end_ms <= audio.duration_ms+2);
   assert.equal(turn.words.length,line.en.split(/\s+/).length);
   assert(turn.words.every((word,j)=>word.start_ms >= (turn.words[j-1]?.end_ms ?? turn.start_ms)
    && word.start_ms<word.end_ms && word.end_ms<=turn.end_ms));
  }
 }
});

test('the 100-situation roadmap covers the curriculum and revisits core patterns across domains', () => {
 const published = new Map(dialogues.map(dialogue => [dialogue.id,dialogue]));
 const entries = new Map(plan.entries.map(entry => [entry.id,entry]));
 assert.equal(entries.size,plan.entries.length,'duplicate conversation IDs');
 assert(entries.size>=100);
 for(const dialogue of dialogues){
  const entry=entries.get(dialogue.id);
  assert(entry,dialogue.id);
  assert.equal(entry.category,dialogue.category);
 }
 const categoriesByPattern=new Map();
 for(const entry of entries.values()){
  const dialogue=published.get(entry.id);
  const targets=dialogue?dialogue.lines.flatMap(line=>line.patterns):entry.targets;
  assert(entry.taskAr&&entry.taskEn&&targets.length,entry.id);
  for(const id of targets){
   if(!categoriesByPattern.has(id))categoriesByPattern.set(id,new Set());
   categoriesByPattern.get(id).add(entry.category);
  }
 }
 const curriculum=[...foundation.patterns,...expansion.patterns].map(pattern=>pattern.id);
 assert.deepEqual(new Set(categoriesByPattern.keys()),new Set(curriculum));
 for(const id of plan.corePatterns){
  assert(categoriesByPattern.get(id)?.size>=2,`Core pattern ${id} needs two domains`);
 }
});
