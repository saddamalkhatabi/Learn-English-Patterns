// Adopt independently prepared atlases sequentially, preserving every audio/text field.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {sha,asset}=require('./media-validation.cjs'),root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const plan=read('production/plans/expansion-all-153.json'),policy=read('production/scene-policy.json');
const keys=process.argv.slice(2);assert(keys.length,'Specify prepared pattern keys');
const manifests=new Map(plan.manifest_paths.map(file=>[file,read(file)])),changed=new Set();
const accepted=[];
function projectFile(relative){const file=path.resolve(root,relative);assert(file.startsWith(root+path.sep),'File outside project');return file}
for(const key of keys){
 const pattern=plan.patterns.find(p=>p.key===key);assert(pattern,'Unknown pattern '+key);
 const metaPath=`production/expansion-images/${key}.json`,meta=read(metaPath),review=read(meta.review);
 assert.equal(meta.key,key);assert.equal(meta.policy,policy.id);assert.equal(review.policy,policy.id);assert.equal(review.pattern_key,key);assert.equal(review.human_review,false);
 assert.deepEqual(review.cells.map(c=>c.cell),Array.from({length:12},(_,i)=>i+1));assert(review.cells.every(c=>c.status==='accepted'&&c.notes?.trim()));
 assert.equal(sha(projectFile(meta.source)),meta.source_sha256);assert.equal(meta.source_sha256,review.source_sha256);
 const image=asset(root,meta.atlas);assert.equal(sha(image),meta.sha256);
 const probe=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',image],{encoding:'utf8'}));
 assert.equal(probe.streams[0].width,1536);assert.equal(probe.streams[0].height,2048);
 assert.equal(meta.geometry_verification.source_rects.length,12);assert(meta.geometry_verification.source_rects.every(r=>Math.abs(r.width/r.height-1)<.08));
 let count=0;
 for(const [file,data]of manifests)for(const s of data.sentences){if(s.pattern_id!==pattern.id)continue;
  const cell=pattern.sentence_ids.indexOf(s.id);assert(cell>=0);assert.equal(s.image.cell,cell);
  if(['assistant-reviewed','visually_reviewed'].includes(s.image.status))assert.equal(s.image.sha256,meta.sha256,'Cannot replace a previously approved atlas');
  Object.assign(s.image,{atlas:meta.atlas,sha256:meta.sha256,width:1536,height:2048,tile_aspect:1,crop:{x:cell%3*512+1,y:Math.floor(cell/3)*512+1,width:510,height:510},status:'assistant-reviewed',cultural_policy:policy.id,review_path:meta.review});
  count++;changed.add(file);
 }
 assert.equal(count,12);accepted.push({key,metaPath,meta});
}
for(const file of changed){const target=projectFile(file),temporary=target+'.tmp';fs.writeFileSync(temporary,JSON.stringify(manifests.get(file),null,2)+'\n');fs.renameSync(temporary,target)}
for(const {metaPath,meta}of accepted){meta.manifest_sync='applied';fs.writeFileSync(projectFile(metaPath),JSON.stringify(meta,null,2)+'\n')}
console.log(JSON.stringify({patterns:accepted.map(p=>p.key),reviewed_cells:accepted.length*12,manifests_updated:changed.size}));
