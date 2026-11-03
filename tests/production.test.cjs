const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const plan=require('../production/plans/expansion-all-153.json');
const rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
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
