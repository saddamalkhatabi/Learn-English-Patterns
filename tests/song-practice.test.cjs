const test = require('node:test');
const assert = require('node:assert/strict');
const foundation = require('../public/song-library.json');
const references = require('../public/reference-song-library.json');
const foundationTiming = require('../public/song-timing.json');
const { lyrics: referenceLyrics, timings: referenceTiming } = require('../public/reference-song-sync.json');
const plan = require('../handoff/music-corpus-20261124/manifest.json');
const offline = require('../public/offline-manifest.json');
const practice = require('../public/song-practice.json');
const { practiceAt, reviewPractice } = require('../public/song-follow.js');

test('timed practice prompts use examples and timestamps from their own recording', () => {
 assert(offline.shell.includes('song-practice.json'));
 const songs = new Map([...foundation, ...references].map(song => [song.id, song]));
 for (const song of references.slice(0, 20)) assert(practice.tracks[song.id]?.windows.length, song.id);
 for (const [songId, { sha256, windows }] of Object.entries(practice.tracks)) {
  const song = songs.get(songId);
  const timing = referenceTiming[songId] ?? foundationTiming[songId];
  const lesson = plan.songs.find(item => item.id === songId);
  assert.equal(sha256, timing.sha256);
  let previousEnd = 0;
  for (const step of windows) {
   const { start_ms: start, end_ms: end, targets = [] } = step;
   assert(start >= previousEnd && start < end && end <= song.duration * 1000, songId);
   for (const target of targets) {
    assert(song.patterns.some(pattern => String(pattern.referenceId ?? pattern.id) === target), target);
   }
   if (step.kind === 'repeat') {
    assert(targets.length);
    if (lesson) assert.deepEqual(targets, [lesson.practice.referenceId]);
   } else {
    assert.equal(step.kind, 'transfer');
    assert(step.promptAr && step.promptEn && (step.starter || targets.length));
    if (lesson && step.promptEn !== lesson.practice.transferCue) {
     const { text, translations } = referenceLyrics[songId];
     const lines = text.split('\n');
     assert(timing.lines.some(({ line, start_ms, end_ms }) =>
      lines[line] === step.promptEn && translations[line] === step.promptAr &&
      start_ms >= start && end_ms <= end), songId);
    }
   }
   assert.equal(practiceAt(windows, start, song.duration * 1000), step);
   assert.equal(practiceAt(windows, end - 1, song.duration * 1000), step);
   assert.notEqual(practiceAt(windows, end, song.duration * 1000), step);
   previousEnd = end;
  }
 }
});

test('songs without a recorded practice cue still offer a review near the end and after playback', () => {
 for (const song of [...foundation, ...references]) {
  const duration = song.duration * 1000;
  assert.equal(practiceAt([], 0, duration), null);
  assert.equal(practiceAt([], duration - 8001, duration), null);
  assert.equal(practiceAt([], duration - 8000, duration), reviewPractice);
  assert.equal(practiceAt([], duration, duration, true), reviewPractice);
 }
 assert.equal(practiceAt([], 0, NaN), null);
});
