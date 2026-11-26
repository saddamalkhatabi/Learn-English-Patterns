const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { songStudySteps, wordAt } = require('../public/song-follow.js');
const { get } = require('../public/purpose-tree.js');
const foundation = require('../public/song-library.json');
const references = require('../public/reference-song-library.json');
const referenceRows = require('../public/source-corpus.json').sentences;
const study = require('../public/song-study.json');
const offline = require('../public/offline-manifest.json');
const purposes = require('../production/qa/song-study-purposes.json');

test('song preparation uses its own ordered examples and downloadable recordings', () => {
 const songs = [...foundation, ...references];
 const media = new Set(offline.media.filter(asset => asset.groups.includes('all')).map(asset => asset.path));
 assert(offline.shell.includes('song-study.json'));
 assert.deepEqual(Object.keys(study).sort(), songs.map(song => song.id).sort());
 for (const song of songs) {
  const entries = study[song.id];
  assert.equal(entries.length, song.patterns.length);
  for (const entry of entries) {
   assert(get(entry.general)?.group);
   assert(entry.purpose.en && entry.purpose.ar && media.has(entry.purpose.path));
   assert(media.has(entry.sentence));
   assert.notEqual(entry.sentence, song.path);
  }
  assert.deepEqual(songStudySteps('song', entries), []);
  assert.deepEqual(songStudySteps('sentences', entries),
   entries.map((entry, index) => ({ kind: 'sentence', index, path: entry.sentence })));
  assert.deepEqual(songStudySteps('purposes', entries), entries.flatMap((entry, index) => [
   { kind: 'purpose', index, path: entry.purpose.path },
   { kind: 'sentence', index, path: entry.sentence },
  ]));
 }
 assert.equal(study['01'][0].sentence, 'assets/audio/name-01-male.mp3');
 assert.equal(study['01'][0].purpose.en, 'Introduce yourself when it is your turn.');
 const reference = references.find(song => song.id === 'EP-REF-SONG-017');
 const row = referenceRows.find(sentence => sentence.id === reference.patterns[0].referenceId);
 assert.equal(study[reference.id][0].sentence, row.recordings.male.path);
});

test('new direct-purpose clips belong to the exact foundation sentence', () => {
 const byPattern = new Map(foundation.flatMap(song => song.patterns.map((pattern, index) =>
  [String(pattern.id), { pattern, purpose: study[song.id][index].purpose }])));
 for (const [id, cue] of Object.entries(purposes)) {
  const { pattern, purpose } = byPattern.get(id);
  assert.equal(cue.sentence, pattern.en);
  assert.equal(purpose.en, cue.en);
  assert.equal(purpose.ar, cue.ar);
  assert.equal(purpose.path, cue.recording.path);
  assert.equal(cue.recording.text, cue.en);
  const audio = fs.readFileSync(path.join(__dirname, '../public', purpose.path));
  assert.equal(createHash('sha256').update(audio).digest('hex'), cue.recording.sha256);
 }
});

test('the study player has exact-recording word timings for both parts of every example', () => {
 const purposeTiming = require('../production/qa/song-study-purpose-timing.json');
 const sentences = ['pilot', 'expansion-media', 'supplement', 'source-corpus']
  .flatMap(source => require('../public/' + source + '.json').sentences);
 const usage = require('../public/english-usage-audio.json').sentences;
 const recordings = new Map([...sentences.map(row => row.recordings), ...Object.values(usage)]
  .flatMap(row => Object.values(row || {})).map(recording => [recording.path, recording]));
 const media = new Map(offline.media.map(asset => [asset.path, asset.sha256]));
 for (const song of [...foundation, ...references]) {
  for (const [index, {sentence, sentenceWords, purpose}] of study[song.id].entries()) {
   const recording = recordings.get(sentence);
   assert.equal(recording.sha256, media.get(sentence));
   assert.deepEqual(sentenceWords.map(word => word.slice(2)), recording.words.map(word => [word.start_ms, word.end_ms]));
   assert.equal(purposeTiming[purpose.path].sha256, media.get(purpose.path));
   assert.deepEqual(purpose.words.map(word => word.slice(2)), purposeTiming[purpose.path].words);
   for (const [text, words] of [[song.patterns[index].en, sentenceWords], [purpose.en, purpose.words]]) {
    const tokens = text.match(/\S+/gu).map(token => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    assert.deepEqual(words.map(([start,end]) => text.slice(start,end)), tokens);
    let previousEnd = 0;
    for (const [word, [,,start,end]] of words.entries()) {
     assert(start >= previousEnd && end > start, text);
     assert.equal(wordAt(words, start), word);
     assert.equal(wordAt(words, end), words[word+1]?.[2] === end ? word+1 : -1);
     previousEnd = end;
    }
   }
  }
 }
});
