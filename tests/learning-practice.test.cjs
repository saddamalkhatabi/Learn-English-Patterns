const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pictureKey,distinctRows,pictureChoices,nextRows,wordBank,wordOrderMatches}=require('../public/learning-practice.js');
const {studyPictures}=require('../public/song-follow.js');

test('picture rounds use distinct photos and only schedule unpractised target sentences',()=>{
 const rows=[
  {id:'a',en:'First.',photo:'first.webp'},
  {id:'b',en:'Second.',photo:'first.webp'},
  {id:'c',en:'Third.',photo:'third.webp'},
  {id:'d',en:'Fourth.',photo:'fourth.webp'},
  {id:'e',en:'Third!',photo:'different.webp'},
  {id:'f',en:'Sixth.'}
 ];
 assert.deepEqual(distinctRows(rows,'pictures').map(row=>row.id),['a','c','d']);
 const choices=pictureChoices(rows[0],rows);
 assert.equal(choices.length,3);
 assert.equal(new Set(choices.map(pictureKey)).size,3);
 assert(choices.includes(rows[0]));
 assert.deepEqual(nextRows(rows,new Set(['a','b']),2).map(row=>row.id),['c','d']);
});

test('sentence assembly accepts identical words in either slot without duplicating a tile',()=>{
 const words=['I','said','said','again.'];
 assert(wordOrderMatches(words,[0,2,1,3]));
 assert(!wordOrderMatches(words,[0,1,1,3]));
 assert(!wordOrderMatches(words,[3,0,1,2]));
 const bank=wordBank(words);
 assert.deepEqual([...bank].sort(),[0,1,2,3]);
 assert(!wordOrderMatches(words,bank));
});

test('every song practice picture comes from a shipped scene independently of cue estimates',()=>{
 const songs=[...require('../public/song-library.json'),...require('../public/reference-song-library.json')];
 const lyrics={...require('../public/song-lyrics.json'),...require('../public/reference-song-sync.json').lyrics};
 const extras=require('../public/reference-song-extras.json');
 for(const song of songs){
  const pictures=studyPictures(lyrics[song.id].scenes,extras[song.id]?.examples||[],song.patterns);
  for(const pattern of song.patterns){
   const scene=pictures.get(String(pattern.referenceId??pattern.id));
   assert(pictureKey(scene),song.title+' · '+pattern.en);
   assert(fs.existsSync(require('node:path').join(__dirname,'../public',scene.photo||scene.image.atlas)));
  }
 }
});
