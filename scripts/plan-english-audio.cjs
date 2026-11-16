const { analyze, sameSpeech } = require('../public/english-usage.js');
const read = name => require('../public/' + name + '.json');
const sentences = ['pilot', 'expansion-media', 'source-corpus', 'supplement'].flatMap(name =>
 read(name).sentences.flatMap(row => {
  const text = analyze(row.en, row).us;
  return sameSpeech(row.en, text) ? [] : [{ id: row.id, text }];
 }));
const recordings = read('dialogue-audio');
const spokenTitle = text => text.trim().replace(/[.!?]+$/, '') + '.';
const dialogues = [...read('dialogues').dialogues, ...read('english-practice').dialogues].flatMap(row => {
 const original = recordings[row.id];
 const title = spokenTitle(analyze(row.en, row).us);
 const signature = row.lines.map(line => [analyze(line.en, line).us, line.voice]);
 const segments = [[title, 'female'], ...signature].map(([text, voice], index) => {
  const originalText = index === 0 ? original?.title : original?.signature[index - 1]?.[0];
  const originalCue = index === 0 ? original?.intro : original?.turns[index - 1];
  return { text, voice, reuse: sameSpeech(text, originalText) ? originalCue : null };
 });
 return segments.every(segment => segment.reuse) ? [] : [{ id: row.id, title, signature, originalPath: original?.path, segments }];
});
if (require.main === module) process.stdout.write(JSON.stringify({ sentences, dialogues }));
module.exports = { sentences, dialogues };
