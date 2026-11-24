const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const plan = require('../handoff/music-corpus-20261124/manifest.json');
const reference = require('../public/reference-song-library.json');
const { lyrics, timings } = require('../public/reference-song-sync.json');
const { sentences } = require('../public/source-corpus.json');
const offline = require('../public/offline-manifest.json');
const audit = require('../production/qa/reference-songs-20261124.json');
const { followLyrics } = require('../public/song-follow.js');

test('published reference songs use the planned order, exact MP3 names and offline assets', () => {
 assert(reference.length);
 const expected = plan.songs.slice(0, reference.length);
 assert.deepEqual(reference.map(song => song.id), expected.map(song => song.id));
 assert.deepEqual(audit.map(song => song.id), reference.map(song => song.id));
 assert(offline.shell.includes('reference-song-library.json'));
 assert(offline.shell.includes('reference-song-sync.json'));
 const media = new Map(offline.media.map(item => [item.path, item]));
 for (const [index, song] of reference.entries()) {
  assert.equal(song.collection, 'reference');
  assert.equal(song.number, String(index + 1).padStart(3, '0'));
  assert.equal(path.posix.basename(song.path), expected[index].expectedAudioFilename);
  assert.deepEqual(song.patterns.map(pattern => pattern.referenceId), expected[index].examples.map(example => example.referenceId));
  const digest = createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../public', song.path))).digest('hex');
  assert.equal(digest, audit[index].sha256);
  assert.equal(digest, timings[song.id].sha256);
  assert.equal(digest, media.get(song.path).sha256);
  assert(media.get(song.path).groups.includes('all'));
 }
});

test('reference song words and scenes play only at measured times on the same recording', () => {
 const source = new Map(sentences.map(sentence => [sentence.id, sentence]));
 const media = new Map(offline.media.map(item => [item.path, item]));
 for (const [index, song] of reference.entries()) {
  const { text, scenes, translations, highlights } = lyrics[song.id];
  const lines = text.split('\n');
  const cues = timings[song.id].lines;
  const { durationMs, matchedExamples, untimedReferences } = audit[index];
  const timeline = followLyrics(lines, cues, durationMs, { measuredOnly: true });
  assert.deepEqual(timeline, cues.map(cue => ({...cue, nearby: []})));
  let previousEnd = 0;
  let previousLine = -1;
  for (const { line, start_ms, end_ms, words } of cues) {
   assert(line > previousLine && lines[line].trim() && translations[line]);
   assert(start_ms >= previousEnd && end_ms > start_ms && end_ms <= durationMs);
   let wordEnd = start_ms;
   let textEnd = 0;
   for (const [from, to, start, end] of words) {
    assert(from >= textEnd && to > from && to <= lines[line].length);
    assert(start >= wordEnd && end > start && end <= end_ms);
    wordEnd = end;
    textEnd = to;
   }
   assert(words.length);
   previousEnd = end_ms;
   previousLine = line;
  }
  const byLine = new Set(cues.map(cue => cue.line));
  const measuredExamples = new Set();
  for (const scene of scenes) {
   const row = source.get(scene.referenceId);
   assert(byLine.has(scene.line) && highlights[scene.line]?.length);
   assert.equal(lines[scene.line], row.en);
   assert.equal(translations[scene.line], row.ar);
   assert.equal(scene.image.atlas, row.image.atlas);
   assert.deepEqual(scene.image.crop, row.image.crop);
   assert(media.get(scene.image.atlas).groups.includes('all'));
   measuredExamples.add(row.id);
  }
  assert.equal(measuredExamples.size, matchedExamples);
  assert.deepEqual(song.patterns.map(pattern => pattern.referenceId).filter(id => !measuredExamples.has(id)), untimedReferences);
 }
});
