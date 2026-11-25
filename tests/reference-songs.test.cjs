const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const plan = require('../handoff/music-corpus-20261124/manifest.json');
const foundation = require('../public/song-library.json');
const reference = require('../public/reference-song-library.json');
const { lyrics, timings } = require('../public/reference-song-sync.json');
const extras = require('../public/reference-song-extras.json');
const { sentences } = require('../public/source-corpus.json');
const offline = require('../public/offline-manifest.json');
const audit = require('../production/qa/reference-songs-20261124.json');
const { followLyrics, withEstimatedExamples } = require('../public/song-follow.js');

test('published reference songs use the planned order, exact MP3 names and offline assets', () => {
 assert(reference.length);
 const published = new Set(reference.map(song => song.id));
 const expected = plan.songs.filter(song => published.has(song.id));
 assert.deepEqual(reference.map(song => song.id), expected.map(song => song.id));
 assert.deepEqual(audit.map(song => song.id), reference.map(song => song.id));
 assert(offline.shell.includes('reference-song-library.json'));
 assert(offline.shell.includes('reference-song-sync.json'));
 const media = new Map(offline.media.map(item => [item.path, item]));
 for (const [index, song] of reference.entries()) {
  assert.equal(song.collection, 'reference');
  assert.equal(song.number, String(expected[index].songOrder).padStart(3, '0'));
  assert.equal(path.posix.basename(song.path), expected[index].expectedAudioFilename);
  assert.deepEqual(song.patterns.map(pattern => pattern.referenceId), expected[index].examples.map(example => example.referenceId));
  const digest = createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../public', song.path))).digest('hex');
  assert.equal(digest, audit[index].sha256);
  assert.equal(digest, timings[song.id].sha256);
  assert.equal(digest, media.get(song.path).sha256);
  assert(media.get(song.path).groups.includes('all'));
 }
});

test('published foundation and reference songs share one audio directory and unique recordings', () => {
 const directory = 'assets/audio/songs';
 const files = new Set();
 const assets = new Set();
 const hashes = new Map(offline.media.map(item => [item.path, item.sha256]));
 for (const song of [...foundation, ...reference]) {
  assert.equal(path.posix.dirname(song.path), directory);
  assert(!files.has(song.path), song.path);
  files.add(song.path);
  const hash = hashes.get(song.path);
  assert(hash && !assets.has(hash), song.path);
  assets.add(hash);
 }
 const onDisk = fs.readdirSync(path.join(__dirname, '../public', directory))
  .filter(name => name.endsWith('.mp3')).map(name => `${directory}/${name}`);
 assert.deepEqual(onDisk.sort(), [...files].sort());
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

test('estimated reference lines stay separate from measured lyrics and all review examples have their own scene', () => {
 assert(offline.shell.includes('reference-song-extras.json'));
 const source = new Map(sentences.map(sentence => [sentence.id, sentence]));
 const offlineAssets = new Set(offline.media.filter(item => item.groups.includes('all')).map(item => item.path));
 let estimated = 0;
 for (const [index, song] of reference.entries()) {
  const content = lyrics[song.id];
  const timing = timings[song.id];
  const review = extras[song.id];
  const { untimedReferences, durationMs } = audit[index];
  assert.deepEqual(review?.examples.map(example => example.referenceId) ?? [], untimedReferences);
  if (!review) continue;
  assert.equal(review.sha256, timing.sha256);
  for (const example of review.examples) {
   const row = source.get(example.referenceId);
   const { atlas, width, height, crop } = row.image;
   assert.deepEqual(example.image, { atlas, width, height, crop });
   assert(offlineAssets.has(atlas));
   assert(example.highlights.length && example.highlights.every(([start, end]) =>
    Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= row.en.length));
  }
  const merged = withEstimatedExamples(content, timing, review, song.patterns);
  const text = merged.text.split('\n');
  const measuredText = content.text.split('\n');
  const keepTiming = ({ line, ...cue }, lines) => [cue, lines[line]];
  assert.deepEqual(merged.lines.filter(line => !line.approximate).map(line => keepTiming(line, text)),
   timing.lines.map(line => keepTiming(line, measuredText)));
  let previousEnd = 0;
  for (const cue of merged.lines) {
   assert(cue.start_ms >= previousEnd && cue.end_ms <= durationMs, song.id);
   previousEnd = cue.end_ms;
   if (!cue.approximate) continue;
   estimated++;
   assert.deepEqual(cue.words, []);
   const scene = merged.scenes.find(item => item.line === cue.line);
   const row = source.get(scene.referenceId);
   const expected = review.examples.find(example => example.referenceId === scene.referenceId);
   assert.equal(text[cue.line], expected.spoken?.en ?? row.en);
   assert.equal(merged.translations[cue.line], expected.spoken?.ar ?? row.ar);
   assert(merged.highlights[cue.line]?.length);
  }
  assert.deepEqual(withEstimatedExamples(content, timing, {...review, sha256: 'different'}, song.patterns),
   {...content, lines: timing.lines});
 }
 assert(estimated > 0);
});
