const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const plan=require('../production/plans/expansion-all-153.json');
const rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
test('polite request patterns use the original scenes for their own twelve scripts',()=>{
 const geometry=require('../production/qa/webp-grid-overrides.json').atlases;
 const published=require('../public/expansion-media.json').sentences;
 for(const [pattern,donor] of [[9125,9127],[9126,9128],[9127,9126],[9128,9125]]){
  const file=`pattern-${pattern}-atlas-v2.webp`,source=`pattern-${donor}-atlas-v1.webp`;
  const registered=geometry[file],original=geometry[source];
  assert.equal(registered.rebound_from,source);
  assert.equal(registered.sha256,original.sha256);
  assert.deepEqual(registered.crops,original.crops);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/assets/scenes/'+file)).digest('hex'),original.sha256);
  const sentences=rows.filter(row=>row.pattern_id===pattern);
  assert.equal(sentences.length,12);
  sentences.forEach((row,cell)=>{
   assert.equal(row.image.atlas,'assets/scenes/'+file,row.id);
   assert.equal(row.image.cell,cell,row.id);
   assert.deepEqual(row.image.crop,original.crops[cell],row.id);
   assert.deepEqual(published.find(example=>example.id===row.id)?.image,row.image,row.id);
  });
 }
});
test('reviewed expansion scenes match their retained source, policy review and exact cell crop',()=>{
 for(const p of plan.patterns){
  const sentences=rows.filter(s=>s.pattern_id===p.id),reviewed=sentences.filter(s=>s.image.status==='assistant-reviewed');
  if(!reviewed.length)continue;
  assert.equal(reviewed.length,12,p.key);
  const meta=JSON.parse(fs.readFileSync(`production/expansion-images/${p.key}.json`));
  const review=JSON.parse(fs.readFileSync(meta.review));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(meta.source)).digest('hex'),review.source_sha256);
  assert.equal(meta.policy,'arab-muslim-family-v1');
  assert.equal(review.human_review,false);
  assert.equal(review.cells.filter(c=>c.status==='accepted').length,12);
  for(const s of reviewed){const im=s.image;assert.equal(im.sha256,meta.sha256);assert.equal(im.cultural_policy,meta.policy);assert.equal(im.cell,sentences.indexOf(s));assert.deepEqual(im.crop,{x:im.cell%3*512+1,y:Math.floor(im.cell/3)*512+1,width:510,height:510})}
 }
});
test('visual policy preserves English meaning and holds unsupported restricted props for review',()=>{
 const {scene,risks}=require('../scripts/scene-policy.cjs');
 assert(risks({en:'Can you swim without a float?'}).includes('water'));
 assert.match(scene({en:'Can you swim without a float?'}),/EMPTY pool/);
 assert.match(scene({en:'After I exercise, I take a shower.'}),/OUTSIDE a closed bathroom/);
 assert.throws(()=>scene({en:'An adult drinks wine.'}),/explicit reviewed override/);
 assert.equal(scene({en:'I drink water.',scene:'An adult holding a glass of water.'}),'An adult holding a glass of water.');
});
