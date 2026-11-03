// Prove the preserved production recordings were imported into main without merging its older application tree.
const cp=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {validate,asset}=require('./media-validation.cjs'),root=path.resolve(__dirname,'..');
const production='origin/production/run-41555717077',main=cp.execFileSync('git',['rev-parse','main'],{encoding:'utf8'}).trim();
const readGit=(ref,file)=>JSON.parse(cp.execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8',maxBuffer:16*1024*1024}));
let bindings=0;const files=new Set();
for(const name of fs.readdirSync(path.join(root,'production/manifests')).filter(n=>n.endsWith('.json'))){
 const file='production/manifests/'+name,produced=readGit(production,file),published=readGit(main,file),current=JSON.parse(fs.readFileSync(path.join(root,file)));
 assert.equal(produced.plan_sha256,published.plan_sha256);
 for(const s of produced.sentences){const committed=published.sentences.find(x=>x.id===s.id),local=current.sentences.find(x=>x.id===s.id);assert.equal(committed.en,s.en);assert.equal(local.en,s.en);
  for(const gender of ['male','female']){const rec=s.recordings[gender];if(!rec.sha256)continue;assert.deepEqual(committed.recordings[gender],rec,s.id+'/'+gender+' absent from main');assert.deepEqual(local.recordings[gender],rec,'Local audio changed during image round');assert(validate(rec,asset(root,rec.path),s.en,gender));files.add(rec.path);bindings++}
 }
}
const report={schema:1,production_branch:production,main_commit_audited:main,production_recording_bindings_verified_in_main:bindings,distinct_production_paths:files.size,workspace_audio_unchanged:true,method:'Exact sentence, recording metadata, local asset SHA and measured-cue validation; application trees are not merged wholesale.'};
fs.writeFileSync(path.join(root,'production/qa/audio-main-integration.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
