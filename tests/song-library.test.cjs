const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const songs = require('../public/song-library.json');
const lyrics = require('../public/song-lyrics.json');
const curriculum = require('../public/learning-levels.json');
const offline = require('../public/offline-manifest.json');

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
