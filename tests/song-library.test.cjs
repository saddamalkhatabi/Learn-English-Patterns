const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const songs = require('../public/song-library.json');
const lyrics = require('../public/song-lyrics.json');
const curriculum = require('../public/learning-levels.json');
const offline = require('../public/offline-manifest.json');
const {followLyrics}=require('../public/song-follow.js');

test('the songs preserve their full source lyrics, pattern order and offline media', () => {
 const source = path.join(__dirname, '../handoff/music-pilot-20261120');
 const prompts = fs.readdirSync(source).filter(name => name.endsWith('.txt'));
 assert.equal(songs.length, 18);
 assert.deepEqual(Object.keys(lyrics).sort(), songs.map(song => song.id).sort());
 assert.deepEqual(songs.flatMap(song => song.patterns.map(p => p.id)), curriculum.patternOrder);
 assert(offline.shell.includes('song-lyrics.json'));
 const media = new Map(offline.media.map(item => [item.path, item]));
 for (const song of songs) {
  const name = prompts.find(file => file.startsWith(`EP-SONG-${song.id}-`));
  const prompt = fs.readFileSync(path.join(source, name), 'utf8').replace(/\r\n/g, '\n');
  const {text, highlights} = lyrics[song.id];
  assert.equal(text, prompt.split('\nLyrics:\n')[1].trim());
  const lines = text.split('\n');
  assert.deepEqual(Object.keys(highlights).map(index => lines[index]), song.patterns.map(p => p.en));
  assert(media.get(song.path)?.groups.includes('all'));
  for (const [index, ranges] of Object.entries(highlights)) {
   const line = lines[index];
   let previousEnd = 0;
   assert(ranges.length);
   for (const [start, end] of ranges) {
    assert(start >= previousEnd && start < end && end <= line.length, line);
    assert.match(line.slice(start, end), /^\p{L}(?:.*\p{L})?$/u);
    previousEnd = end;
   }
  }
 }
});

test('highlighting isolates fixed words and both parts of paired patterns', () => {
 function highlighted(song, example) {
  const {text, highlights} = lyrics[song];
  const line = text.split('\n').indexOf(example);
  return highlights[line].map(([start, end]) => example.slice(start, end));
 }
 assert.deepEqual(highlighted('01', 'My name is Ali.'), ['My name is']);
 assert.deepEqual(highlighted('01', "What's your name?"), ["What's", 'name']);
 assert.deepEqual(highlighted('02', 'Speak slowly, please.'), ['please']);
 assert.deepEqual(highlighted('17', 'He is not only helpful but also patient.'), ['not only', 'but also']);
 assert.deepEqual(highlighted('18', 'We find that the more we practice, the more confident we become.'), ['the more', 'the more']);
});

test('each song scene uses the exact example, its purpose line, and downloadable visual media', () => {
 const source = new Map([...require('../public/pilot.json').sentences, ...require('../public/expansion-media.json').sentences]
  .map(sentence => [sentence.id, sentence]));
 const extra = new Map(require('../production/qa/song-scenes.json').scenes.map(scene => [scene.sentenceId, scene]));
 const media = new Map(offline.media.map(item => [item.path, item]));
 for (const song of songs) {
  const {text, scenes} = lyrics[song.id];
  const lines = text.split('\n');
  assert.equal(scenes.length, song.patterns.length);
  for (const [index, {line, purposeLine, sentenceId, image, photo}] of scenes.entries()) {
   const {id, en} = song.patterns[index];
   const sentence = source.get(sentenceId);
   assert.equal(sentence.pattern_id, id);
   assert.equal(sentence.en, en);
   assert.equal(lines[line], en);
   assert.equal(purposeLine, line - 1);
   assert(lines[purposeLine].trim() && !lines[purposeLine].startsWith('['));
   if (image) {
    assert.equal(image.atlas, sentence.image.atlas);
    assert.equal(image.cell, sentence.image.cell);
    assert.deepEqual(image.crop, sentence.image.crop);
    assert(media.get(image.atlas)?.groups.includes('all'));
   } else {
    const asset = extra.get(sentenceId);
    assert.equal(photo, asset.path);
    assert.equal(media.get(photo)?.sha256, asset.sha256);
    assert(media.get(photo)?.groups.includes('all'));
   }
  }
 }
});

test('song timings match the shipped recordings and valid ranges in their lyrics', () => {
 const timings = require('../public/song-timing.json');
 assert.deepEqual(Object.keys(timings).sort(), songs.map(song => song.id).sort());
 assert(offline.shell.includes('song-timing.json'));
 for (const song of songs) {
  const {sha256,lines} = timings[song.id];
  assert.equal(sha256, createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../public',song.path))).digest('hex'));
  const text = lyrics[song.id].text.split('\n');
  assert(lines.length, song.title);
  let previousEnd = 0;
  let previousLine = -1;
  for (const {line,start_ms,end_ms,words} of lines) {
   assert(text[line]?.trim() && !text[line].startsWith('[') && line > previousLine, song.title);
   assert(start_ms >= previousEnd && end_ms > start_ms && end_ms <= (song.duration+1)*1000, song.title);
   previousLine = line;
   previousEnd = end_ms;
   let wordEnd = start_ms;
   let offset = 0;
   for (const [from,to,start,end] of words) {
    assert(from >= offset && to > from && to <= text[line].length, song.title);
    assert(start >= wordEnd && end > start && end <= end_ms, song.title);
    wordEnd = end;
    offset = to;
   }
  }
 }
});

test('every sung line has Arabic text and an exact cue, estimated cue or nearby placement',()=>{
 const timings=require('../public/song-timing.json');
 for(const song of songs){
  const {text,translations}=lyrics[song.id],lines=text.split('\n');
  const measured=timings[song.id].lines;
  const timeline=followLyrics(lines,measured,song.duration*1000);
  const all=timeline.flatMap(cue=>[cue.line,...cue.nearby]).sort((a,b)=>a-b);
  const sung=lines.flatMap((line,index)=>line.trim()&&!line.startsWith('[')?[index]:[]);
  assert.deepEqual(all,sung,song.title);
  for(const index of sung)assert.match(translations[index],/\p{Script=Arabic}/u);
  for(const [i,cue] of timeline.entries()){
   assert(cue.start_ms>=(timeline[i-1]?.end_ms||0)&&cue.end_ms>cue.start_ms);
   if(cue.approximate)assert.deepEqual(cue.words,[]);
   else assert.deepEqual(cue.words,measured.find(line=>line.line===cue.line).words);
  }
 }
});

test('Hear Me Out follows its opening, all examples and both choruses with timed words', () => {
 const {text,scenes} = lyrics['14'];
 const lines = text.split('\n');
 const measured = require('../public/song-timing.json')['14'].lines;
 const timeline = followLyrics(lines, measured, 152000, {measuredOnly:true});
 assert.deepEqual(timeline.map(cue => cue.line), lines.flatMap((line, index) => line && !line.startsWith('[') ? [index] : []));
 assert(timeline[0].start_ms >= 10000 && timeline[0].start_ms < 12000);
 for (const {line,purposeLine} of scenes) {
  const example = timeline.find(cue => cue.line === line);
  const purpose = timeline.find(cue => cue.line === purposeLine);
  assert(purpose.end_ms <= example.start_ms, lines[line]);
  assert.deepEqual(example.words.map(([start,end]) => lines[line].slice(start,end)), lines[line].match(/\b[a-z]+(?:'[a-z]+)*\b/gi));
 }
 const chorus = timeline.filter(cue => lines[cue.line].startsWith('Hear me out'));
 assert.equal(chorus.length, 2);
 assert(chorus[0].start_ms > 40000 && chorus[0].start_ms < 43000);
 assert(chorus[1].start_ms > 113000 && chorus[1].start_ms < 117000);
});
