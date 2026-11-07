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
 const {scenes:archive} = require('../public/scene-archive.json');
 const approvedScenes = new Set(archive.map(scene => scene.id));
 const scenes = new Set([...foundation.sentences, ...expansion.sentences].filter(s => approvedScenes.has(s.id)).map(s => s.id));
 for(const dialogue of dialogues){
  assert(patterns.has(dialogue.after));
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
    assert.equal(Boolean(line.focus.length),Boolean(line.patterns.length),line.en);
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
  assert(entry.taskAr&&entry.taskEn&&targets.length,entry.id);
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
