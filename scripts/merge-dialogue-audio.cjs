const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const incoming = process.argv[2];
assert(incoming, 'Pass the directory containing the downloaded shards');
const output = 'public/dialogue-audio.json';
const existing = JSON.parse(fs.readFileSync(output, 'utf8'));
const { dialogues } = require('../public/dialogues.json');
const expected = new Map(dialogues.map(dialogue => [dialogue.id, dialogue]));
const staged = new Map();
const cueOutput='public/training-audio.json';
const expectedCues=require('./training-cues.cjs');
const existingCues=JSON.parse(fs.readFileSync(cueOutput,'utf8'));
const stagedCues=new Map();

for (const directory of fs.readdirSync(incoming, {withFileTypes:true})) {
 if (!directory.isDirectory()) continue;
 const root = path.join(incoming, directory.name);
 const fragment = JSON.parse(fs.readFileSync(path.join(root, 'dialogue-audio.json'), 'utf8'));
 for (const [id, audio] of Object.entries(fragment)) {
  const dialogue = expected.get(id);
  assert(dialogue && /^[a-z0-9-]+$/.test(id) && !staged.has(id), id);
  assert.deepEqual(audio.signature, dialogue.lines.map(line => [line.en, line.voice]), id);
  assert.equal(audio.title, dialogue.en.trim().replace(/[.!?]+$/, '') + '.', id);
  assert.match(audio.sha256, /^[a-f0-9]{64}$/);
  assert.equal(audio.path, `assets/audio/dialogue-${id}-${audio.sha256.slice(0, 12)}.mp3`);
  const source = path.join(root, audio.path);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'), audio.sha256, id);
  staged.set(id, {audio, source});
 }
 const cueFragment=JSON.parse(fs.readFileSync(path.join(root,'training-audio.json'),'utf8'));
 for(const [id,audio] of Object.entries(cueFragment)){
  assert(Object.hasOwn(expectedCues,id)&&!stagedCues.has(id),id);
  assert.equal(audio.text,expectedCues[id],id);
  assert(audio.duration_ms>0,id);
  assert.match(audio.sha256,/^[a-f0-9]{64}$/);
  assert.equal(audio.path,`assets/audio/training-${id}-${audio.sha256.slice(0,12)}.mp3`);
  const source=path.join(root,audio.path);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),audio.sha256,id);
  stagedCues.set(id,{audio,source});
 }
}
assert(staged.size||stagedCues.size, 'No new recordings were collected');
for (const {audio, source} of [...staged.values(),...stagedCues.values()]) fs.copyFileSync(source, path.join('public', audio.path));
const merged = Object.fromEntries(dialogues.map(({id}) => [id, staged.get(id)?.audio ?? existing[id]]));
fs.writeFileSync(output, JSON.stringify(merged, null, 2) + '\n');
console.log(`Merged ${staged.size} recordings`);
const cues=Object.fromEntries(Object.keys(expectedCues).map(id=>[id,stagedCues.get(id)?.audio??existingCues[id]]));
fs.writeFileSync(cueOutput,JSON.stringify(cues,null,2)+'\n');
console.log(`Merged ${stagedCues.size} training cues`);
