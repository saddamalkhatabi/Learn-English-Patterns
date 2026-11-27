const test=require('node:test');
const assert=require('node:assert/strict');
const {withEstimatedExamples,withVocalRecovery,followLyrics,practiceAt,reviewPractice}=require('../public/song-follow.js');
const foundation=require('../public/song-library.json');
const references=require('../public/reference-song-library.json');
const authoredLyrics=require('../public/song-lyrics.json');
const originalTimings=require('../public/song-timing.json');
const referenceSync=require('../public/reference-song-sync.json');
const extras=require('../public/reference-song-extras.json');
const recovered=require('../public/song-vocal-recovery.json');
const offline=require('../public/offline-manifest.json');

function vocals(song,estimates=true){
 const reference=song.collection==='reference',duration=song.duration*1000;
 const original=reference?referenceSync.lyrics[song.id]:authoredLyrics[song.id];
 const timing=reference?referenceSync.timings[song.id]:originalTimings[song.id];
 const extra=extras[song.id];
 const content=reference?withEstimatedExamples(original,timing,estimates?extra:null,song.patterns):original;
 const merged=withVocalRecovery(content,timing,recovered[song.id],extra?.examples||[],song.patterns,
  {reference,duration,estimates});
 return {content,timing,merged,timeline:followLyrics(merged.text.split('\n'),merged.lines||timing.lines,duration,
  {measuredOnly:reference||merged.recordedOrder||!estimates})};
}

test('The Pieces Fit follows the repeated chorus, the last verse and the final chorus in recording order',()=>{
 const song=foundation.find(track=>track.title==='The Pieces Fit');
 const {merged,timeline}=vocals(song);
 const lines=merged.text.split('\n');
 const at=ms=>timeline.find(cue=>cue.start_ms<=ms&&cue.end_ms>ms);
 assert.equal(lines[at(128000).line],'The pieces fit when you sing with me.');
 assert.equal(lines[at(138000).line],'I managed to finish on time.');
 const estimated=at(144000);
 assert(estimated.approximate);
 assert.deepEqual(estimated.words,[]);
 assert.match(lines[estimated.line],/deserves the effort/);
 assert.equal(lines[at(149000).line],"It's worth trying again.");
 assert.equal(lines[at(158000).line],'Do you know where the station is?');
 assert.equal(lines[at(179000).line],'The pieces fit when you sing with me.');
 const scene=merged.scenes.find(item=>item.patternId===12);
 assert.match(lines[scene.purposeLine],/subject before the verb/);
 assert(scene.photo||scene.image);
 assert.equal(scene.line,at(158000).line);
 assert.equal(timeline.filter(cue=>lines[cue.line]==='The pieces fit when you sing with me.').length,3);
 const vocalEnd=timeline.at(-1).end_ms;
 assert.equal(practiceAt([],179000,song.duration*1000,false,vocalEnd),null);
 assert.equal(practiceAt([],vocalEnd,song.duration*1000,false,vocalEnd),reviewPractice);
});

test('recovered lyrics preserve the original audio anchors and keep word timing separate from estimates',()=>{
 assert(offline.shell.includes('song-vocal-recovery.json'));
 let improved=0;
 for(const song of [...foundation,...references]){
  const {content,timing,merged,timeline}=vocals(song);
  const original=content.text.split('\n');
  const lines=merged.text.split('\n');
  for(const cue of content.lines||timing.lines){
   const same=timeline.find(item=>item.start_ms===cue.start_ms&&item.end_ms===cue.end_ms);
   assert(same&&lines[same.line]===original[cue.line],song.id+' '+original[cue.line]);
   assert.deepEqual(same.words,cue.words);
  }
  if(!recovered[song.id])continue;
  if(timeline.length>(content.lines||timing.lines).length)improved++;
  assert.equal(recovered[song.id].sha256,timing.sha256,song.id);
  for(const [index,cue] of timeline.entries()){
   assert(cue.start_ms>=(timeline[index-1]?.end_ms??0)&&cue.end_ms>cue.start_ms&&cue.end_ms<=(song.duration+1)*1000,song.id);
   assert.match(merged.translations[cue.line],/\p{Script=Arabic}/u);
   if(cue.approximate)assert.deepEqual(cue.words,[]);
   for(const [from,to,start,end] of cue.words){
    assert(from>=0&&to>from&&to<=lines[cue.line].length&&start>=cue.start_ms&&end>start&&end<=cue.end_ms,song.id);
   }
  }
  const strict=vocals(song,false).timeline;
  assert(!strict.some(cue=>cue.approximate));
  assert.strictEqual(withVocalRecovery(content,timing,{...recovered[song.id],sha256:'old-audio'},[],song.patterns),content);
 }
 assert(improved>=50);
 const song=references.find(track=>track.id==='EP-REF-SONG-078');
 const {merged,timeline}=vocals(song);
 const repeated=timeline.at(-1);
 assert(repeated.end_ms>140000);
 assert.equal(merged.text.split('\n')[repeated.line],'Step by step, the words come through.');
});
