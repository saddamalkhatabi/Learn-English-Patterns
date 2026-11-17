const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');
const { analyze, sameSpeech, shared } = require('../public/english-usage');
const plan = require('../scripts/plan-english-audio.cjs');
const media = require('../public/english-usage-audio.json');
const atlas = require('../public/vocabulary-index.json');
const practice = require('../public/english-practice.json').dialogues;
const offline = new Set(require('../public/offline-manifest.json').media.map(item => item.path));

test('regional wording preserves context and adjusts articles in both directions', () => {
 assert.equal(analyze('Is there a lift?').us, 'Is there an elevator?');
 assert.equal(analyze('Is there an elevator?').uk, 'Is there a lift?');
 assert.equal(analyze('There is a flat upstairs.').us, 'There is an apartment upstairs.');
 assert.equal(analyze('The flat battery is dead.').us, 'The flat battery is dead.');
 assert.equal(analyze('She needs a lift.').us, 'She needs a ride.');
 assert.equal(analyze('Lift the box.').changes.length, 0);
 assert.equal(analyze('Check the receipt.').changes.length, 0);
 assert.equal(analyze('Can I see the check?').changes.length, 0);
 assert.equal(analyze('Can I get the check, please?').uk, 'Could I have the bill, please?');
 assert.equal(analyze('Nice to meet you.').changes.length, 0);
 assert(sameSpeech('The colour of the car park sign', 'The color of the car park sign'));
 assert(!sameSpeech('Where is the lift?', 'Where is the elevator?'));
});

test('the atlas indexes contextual pairs and the added beginner expressions', () => {
 const apartment = atlas.regional.find(entry => entry.en.toLowerCase() === 'apartment' && entry.uk.toLowerCase() === 'flat');
 assert.equal(apartment?.ar, 'شقة سكنية');
 assert(apartment.sourceIds.some(index => atlas.sources[index].id === 'l2-053'));
 assert(apartment.sourceIds.every(index => !/flat battery/i.test(atlas.sources[index].en)));
 const quick = require('../public/instant-vocabulary-core.js');
 const index = quick.index(atlas);
 const context = 'There is a flat upstairs, and my car has a flat tire.';
 const residence = quick.select(index,context,context.indexOf('flat')+1);
 const damage = quick.select(index,context,context.lastIndexOf('flat')+1);
 assert.equal(quick.best(index,residence,context)?.entry.family,'apartment');
 assert.notEqual(quick.best(index,damage,context)?.entry.family,'apartment');
 for (const phrase of ['nice to meet you too', 'could you say that again', 'have a good day']){
  assert(shared.has(phrase));
  const entry = atlas.entries.find(entry => entry.en.toLowerCase() === phrase && entry.pos === 'PHRASE');
  assert(entry?.shared && entry.ar);
  assert(entry.sourceIds.some(index => practice.some(row => row.id === atlas.sources[index].id)));
 }
});

test('new starter dialogues have valid pattern and illustrative scene references', () => {
 const course = ['pilot','expansion-media'].map(name=>require('../public/'+name+'.json'));
 const patterns = new Set(course.flatMap(book=>book.patterns.map(row=>row.id)));
 const images = new Set(course.flatMap(book=>book.sentences.filter(row=>row.image).map(row=>row.id)));
 for(const row of practice){
  assert.equal(row.level,'A1');
  for(const line of row.lines){
   assert(images.has(line.scene),line.scene);
   assert(line.patterns.every(id=>patterns.has(id)),row.id);
  }
 }
});

test('every starter dialogue has four dedicated photo turns sized for the scene library', () => {
 const {scenes,lifecycles}=require('../public/conversation-scenes.json');
 const ideas=new Map(require('../public/idea-scenes.json').scenes.map(scene=>[scene.id,scene]));
 const {scenes:levels}=require('../public/learning-levels.json');
 const used=new Set();
 for(const dialogue of practice){
  const record=scenes[dialogue.id];
  assert.equal(record.cover.id,record.turns[1].id,dialogue.id);
  assert.deepEqual(lifecycles[dialogue.id].stages.map(({from,to})=>[from,to]),[[1,1],[2,2],[3,3],[4,4]],dialogue.id);
  for(const [index,image] of Object.values(record.turns).entries()){
   assert(!used.has(image.path),image.path);
   used.add(image.path);
   assert.deepEqual([image.width,image.height],[390,242],image.path);
   assert(offline.has(image.path),image.path);
   const scene=ideas.get(image.id);
   assert.equal(scene.sentenceEn,dialogue.lines[index].en,image.id);
   assert.equal(levels[image.id],'A1',image.id);
   assert(scene.words.every(word=>word.x>0&&word.x<100&&word.y>0&&word.y<100),image.id);
  }
 }
});

function checkAudio(recording, text){
 assert(offline.has(recording.path), recording.path);
 const digest = crypto.createHash('sha256').update(fs.readFileSync('public/' + recording.path)).digest('hex');
 assert.equal(recording.sha256,digest,recording.path);
 assert(recording.duration_ms>0 && text);
}
function checkCues(cue,text){
 assert.equal(cue.words.length,text.split(/\s+/).length,text);
 let previous = cue.start_ms||0;
 for(const {start_ms,end_ms} of cue.words){
  assert(start_ms>=previous && end_ms>start_ms && end_ms<=(cue.end_ms||cue.duration_ms),text);
  previous=end_ms;
 }
}
test('every audible change and new conversation ships exact, measured American audio', () => {
 assert.deepEqual(Object.keys(media.sentences).sort(),plan.sentences.map(row=>row.id).sort());
 assert.deepEqual(Object.keys(media.dialogues).sort(),plan.dialogues.map(row=>row.id).sort());
 for(const {id,text} of plan.sentences){
  for(const voice of ['male','female']){
   const clip=media.sentences[id][voice];
   assert.equal(clip.text,text);
   assert.equal(clip.voice_id,voice==='male'?'am_adam':'af_bella');
   checkAudio(clip,text);
   checkCues(clip,text);
  }
 }
 for(const row of plan.dialogues){
  const audio=media.dialogues[row.id];
  assert.deepEqual(audio.signature,row.signature);
  assert.equal(audio.title,row.title);
  checkAudio(audio,row.title);
  checkCues(audio.intro,row.title);
  audio.turns.forEach((cue,index)=>checkCues(cue,row.signature[index][0]));
 }
});
