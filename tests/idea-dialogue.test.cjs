const test=require('node:test');
const assert=require('node:assert/strict');
const {parseIdeaDialogue}=require('../public/idea-dialogue.js');

test('imports fenced bilingual JSON and plain speaker lines',()=>{
 const turns=[{speaker:'Sara',en:'Can I sit here?',ar:'هل يمكنني الجلوس هنا؟'},{speaker:'Omar',en:'Of course.',ar:'بالطبع.'}];
 const json='\x60\x60\x60json\n'+JSON.stringify({title:'At the table',turns})+'\n\x60\x60\x60';
 assert.deepEqual(parseIdeaDialogue(json),{title:'At the table',turns});
 const plain='## At the table\n- **Sara:** Can I sit here?\nالعربية: هل يمكنني الجلوس هنا؟\n- **Omar:** Of course.\nبالطبع.';
 assert.deepEqual(parseIdeaDialogue(plain),{title:'At the table',turns});
});

test('rejects malformed, single speaker, and oversized pasted replies',()=>{
 for(const value of ['{"turns":null}','A: Hello\nA: Goodbye','This is an explanation, not a dialogue.','A: '+('a'.repeat(700))+'\nB: Hi']) {
  assert.throws(()=>parseIdeaDialogue(value),/format/);
 }
});
