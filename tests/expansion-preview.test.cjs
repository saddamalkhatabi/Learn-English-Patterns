const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('all expansion examples have two real voices and only displayable scenes appear',()=>{
 const plan=require('../production/plans/expansion-all-153.json'),rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
 const preview=require('../public/expansion-media.json');assert.deepEqual(preview.sentences.map(s=>s.id),rows.map(s=>s.id));
 const visible=new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
 for(let i=0;i<rows.length;i++){const s=preview.sentences[i],original=rows[i];
  assert.equal(Boolean(s.image),visible.has(original.image.status));
  if(s.image)assert(fs.existsSync('public/'+s.image.atlas));
  for(const gender of ['male','female'])assert(fs.existsSync('public/'+s.recordings[gender].path));
 }
 assert.equal(rows.find(s=>s.id==='pattern-9071-02').image.status,'withheld');
});

test('the first three imported atlas tasks map to 359 visible cells and one held cell',()=>{
 const catalog=require('../handoff/web-20261103/IMAGE-CATALOG.json'),tasks=catalog.tasks.slice(0,3);
 const keys=new Set(tasks.flatMap(t=>t.groups));assert.equal(keys.size,30);
 const plan=require('../production/plans/expansion-all-153.json');
 const rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences).filter(s=>keys.has(`pattern-${s.pattern_id}`));
 assert.equal(rows.length,360);assert.equal(rows.filter(s=>s.image.status==='imported-unreviewed').length,359);
 assert.deepEqual(rows.filter(s=>s.image.status==='withheld').map(s=>s.id),['pattern-9071-02']);
 for(const s of rows){const c=s.image.crop;assert(c&&c.width===c.height&&c.x>=0&&c.y>=0&&c.x+c.width<=1536&&c.y+c.height<=2048);}
});
