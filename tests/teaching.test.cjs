const test=require('node:test'),assert=require('node:assert/strict');const {describe}=require('../public/teaching-core.js');
test('teaching cues distinguish past habits, accustomed states and lack of necessity',()=>{
 const a=describe({en:'I used to work here.',construction:'past-habit'}),b=describe({en:'I am used to working here.',construction:'accustomed'}),c=describe({en:"You don't have to leave.",construction:'lack-necessity'});
 assert.equal(a.form,'used to + base verb');assert.deepEqual(a.highlight,[1,2]);assert.match(b.form,/-ing/);assert.deepEqual(b.highlight,[1,2,3]);assert.match(c.note_en,/prohibition/);
});
test('every learning entry preserves the exact source word indexes and offers bilingual guidance',()=>{
 const index=require('../public/teaching-index.json'),corpus=require('../public/source-corpus.json'),pilot=require('../public/pilot.json');
 for(const s of [...corpus.sentences,...pilot.sentences]){const e=index.sentences[s.id];assert(e&&e.rule_ar&&e.rule_en&&e.form,s.id);const words=s.en.split(/\s+/);for(const i of e.highlight)assert(Number.isInteger(i)&&i>=0&&i<words.length)}
});
