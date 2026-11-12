const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {asset,webpSize}=require('./media-validation.cjs');
const author=require('../production/conversation-scenes.json');
const ideas=new Map(require('../public/idea-scenes.json').scenes.map(s=>[s.id,s]));
const dialogues=new Map(require('../public/dialogues.json').dialogues.map(d=>[d.id,d]));
function resolve(input){
 if(typeof input==='string'){
  const scene=ideas.get(input);
  assert(scene,`Unknown Idea Lab scene: ${input}`);
  const {id,path,width,height,sha256,sentenceEn:en,sentenceAr:ar}=scene;
  return {id,path,width,height,sha256,en,ar};
 }
 const {id,path,width,height,en,ar,sourceCrop}=input;
 assert(/^conv-[a-z0-9-]+$/.test(id)&&/^assets\/scenes\/conversations\/[a-z0-9-]+\.webp$/.test(path),path);
 assert(Number.isInteger(width)&&width>0&&Number.isInteger(height)&&height>0&&en&&ar,id);
 if(sourceCrop){
  const [canvasWidth,canvasHeight]=sourceCrop.canvas;
  const [x,y,right,bottom]=sourceCrop.box;
  assert([canvasWidth,canvasHeight,x,y,right,bottom].every(Number.isInteger),id);
  assert(x>=0&&y>=0&&right<=canvasWidth&&bottom<=canvasHeight,id);
  assert.deepEqual([right-x,bottom-y],[width,height],id);
 }
 const bytes=fs.readFileSync(asset(process.cwd(),path));
 assert.deepEqual(webpSize(bytes),[width,height],path);
 return {id,path,width,height,en,ar,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
const scenes={};
const registered=new Map();
function register(input){
 const scene=resolve(input);
 if(registered.has(scene.id))assert.deepEqual(scene,registered.get(scene.id),scene.id);
 registered.set(scene.id,scene);
 return scene;
}
for(const [id,input] of Object.entries(author)){
 const dialogue=dialogues.get(id);
 assert(dialogue,id);
 const turns={};
 for(const [position,image] of Object.entries(input.turns||{})){
  assert(/^[1-9][0-9]*$/.test(position)&&+position<=dialogue.lines.length,`${id} turn ${position}`);
  turns[position]=register(image);
 }
 const cover=input.cover?register(input.cover):null;
 assert(cover||Object.keys(turns).length,id);
 scenes[id]={cover,turns};
}
const lifecycles=require('../production/dialogue-lifecycles.json');
const turnPurposes=require('../production/dialogue-turn-purposes.json');
for(const [id,life] of Object.entries(lifecycles)){
 const dialogue=dialogues.get(id);
 assert(dialogue&&life.goalEn&&life.goalAr&&life.stages.length===4,id);
 let next=1;
 for(const stage of life.stages){
  assert(stage.from===next&&stage.to>=stage.from&&stage.to<=dialogue.lines.length,id);
  assert(stage.ar&&stage.en&&stage.purposeAr&&stage.purposeEn,id);
  assert(scenes[id]?.turns[stage.from],id);
  next=stage.to+1;
 }
 assert.equal(next,dialogue.lines.length+1,id);
 const notes=turnPurposes[id];
 if(notes){
  assert.equal(notes.length,dialogue.lines.length,`${id} turn purposes`);
  assert(notes.every(pair=>pair.length===2&&pair.every(text=>typeof text==='string'&&text.trim())),id);
  life.turnPurposes=notes;
 }
}
fs.writeFileSync('public/conversation-scenes.json',JSON.stringify({schema:1,scenes,lifecycles},null,2)+'\n');
console.log(`Indexed scene links for ${Object.keys(scenes).length} conversations`);
