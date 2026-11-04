// Make exact, present WebP atlases available to the site without implying visual approval.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const plan=require('../production/plans/expansion-all-153.json');
const geometry=fs.existsSync('production/qa/webp-grid-overrides.json')?require('../production/qa/webp-grid-overrides.json').atlases:{};
const holds=fs.existsSync('production/qa/scene-holds.json')?require('../production/qa/scene-holds.json').sentences:{};
const approved=new Set(['assistant-reviewed','visually_reviewed']);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function size(b){
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 const kind=b.toString('ascii',12,16);
 if(kind==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
 if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
 if(kind==='VP8L')return [1+(((b[22]&0x3f)<<8)|b[21]),1+(((b[24]&15)<<10)|(b[23]<<2)|((b[22]&0xc0)>>6))];
 throw Error('Unsupported WebP codec '+kind);
}
const atlases=new Map(),names=fs.readdirSync('public/assets/scenes');
for(const p of plan.patterns){const versions=names.map(name=>{const m=new RegExp(`^${p.key}-atlas-v([1-9]\\d*)\\.webp$`).exec(name);return m?{name,version:+m[1]}:null}).filter(Boolean).sort((a,b)=>b.version-a.version);
 if(!versions.length)continue;const file=`public/assets/scenes/${versions[0].name}`;
 const bytes=fs.readFileSync(file),dimensions=size(bytes);assert.deepEqual(dimensions,[1536,2048],file+' must be 1536×2048');
 const digest=sha(bytes),entry=geometry[versions[0].name];
 atlases.set(p.id,{atlas:file.slice(7).replaceAll('\\','/'),sha256:digest,crops:entry?.sha256===digest?entry.crops:null});
}
let changed=0,available=0,withheld=0;
for(const filename of plan.manifest_paths){const data=JSON.parse(fs.readFileSync(filename,'utf8'));let dirty=false;
 for(const s of data.sentences){const atlas=atlases.get(s.pattern_id),prior=s.image,next={...prior};
  if(approved.has(prior.status)){if(atlas)assert.equal(prior.sha256,atlas.sha256,'Approved image replaced: '+s.id);continue}
  if(!atlas){if(prior.status==='imported-unreviewed'){s.image={...prior,status:'planned'};delete s.image.sha256;delete s.image.crop;dirty=true}continue}
  const cell=prior.cell,crop=atlas.crops?.[cell]||{x:cell%3*512+10,y:Math.floor(cell/3)*512+10,width:492,height:492};
  const status=holds[s.id]?'withheld':'imported-unreviewed';
  const image={...prior,atlas:atlas.atlas,sha256:atlas.sha256,width:1536,height:2048,tile_aspect:1,crop,status};
  if(JSON.stringify(image)!==JSON.stringify(prior)){s.image=image;dirty=true}
  if(status==='withheld')withheld++;else available++;
 }
 if(dirty){fs.writeFileSync(filename,JSON.stringify(data,null,2)+'\n');changed++}
}
console.log(JSON.stringify({atlases:atlases.size,available_unreviewed_cells:available,withheld_cells:withheld,manifests_updated:changed}));
