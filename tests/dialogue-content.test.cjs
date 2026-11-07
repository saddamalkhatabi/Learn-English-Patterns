const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { dialogues } = require('../public/dialogues.json');
const media = require('../public/dialogue-audio.json');
const foundation = require('../public/pilot.json');
const expansion = require('../public/expansion-media.json');

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
