const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {asset,webpSize}=require('./media-validation.cjs');
const text=file=>fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const annotationRows=new Map();
let group;
for(const line of text('production/idea-lab-labels.txt')){
 if(line.startsWith('@')){
  group=line.slice(1);
  assert(!annotationRows.has(group),group);
  annotationRows.set(group,[]);
 }else annotationRows.get(group).push(line);
}
const patternIds=new Set([...require('../public/pilot.json').patterns,...require('../public/expansion-media.json').patterns].map(p=>p.id));
const relatedByTopic={
 home:[117,9037],food:[3,4],travel:[12,4],study:[9037,13],work:[2,9037],
 neighborhood:[12,9037],nature:[117,6],health:[4,9037],craft:[10,9037],events:[6,118],
 routine:[9029,9030],market:[9126,9069],journey:[12,9097],classroom:[9138,9154],
 team:[9139,9144],civic:[9037,9133],field:[9104,9140],care:[9126,9163],
 workshop:[9063,9145],gathering:[9105,9132]
};
function point(value){
 if(!value||value==='-')return {};
 const [x,y,...extra]=value.split(',').map(Number);
 assert(!extra.length&&[x,y].every(n=>Number.isFinite(n)&&n>=0&&n<=100),value);
 return {x,y};
}
const topics=[],scenes=[];
let topic,number=0;
for(const line of text('production/idea-lab-scenes.tsv')){
 if(line.startsWith('@')){
  const [id,ar,en]=line.slice(1).split('|');
  assert(/^[a-z]+$/.test(id)&&ar&&en&&!topics.some(t=>t.id===id),line);
  topic={id,ar,en};topics.push(topic);number=0;
  continue;
 }
 const [en,ar,sentenceEn,sentenceAr,vocabulary,taskEn,taskAr,linkedExample,...extra]=line.split('|');
 assert(topic&&en&&ar&&sentenceEn&&sentenceAr&&vocabulary&&taskEn&&taskAr&&!extra.length,line);
 const id=`idea-${topic.id}-${String(++number).padStart(2,'0')}`;
 const path=`assets/scenes/idea-lab/${id.slice(5)}.webp`;
 const bytes=fs.readFileSync(asset(process.cwd(),path));
 assert.deepEqual(webpSize(bytes),[500,300],path);
 const [coordinates,extras,suggestion]=annotationRows.get(topic.id)?.[number-1]?.split('|')||[];
 const points=coordinates?.split(/\s+/)||[];
 const words=vocabulary.split(',').map((pair,index)=>{
  const [en,ar]=pair.split('=');
  assert(en&&ar,pair);
  return {en,ar,kind:en==='north'?'object':['object','object','action','description'][index]||'object',...point(points[index])};
 });
 assert(words.length>=4,id);
 if(coordinates)assert.equal(points.length,words.length,id);
 for(const entry of extras?extras.split(';'):[]){
  const [term,ar,location]=entry.split('~');
  assert(term&&ar&&location,entry);
  const action=term.startsWith('!');
  words.push({en:action?term.slice(1):term,ar,kind:action?'action':'object',...point(location)});
 }
 const patterns=[];
 if(suggestion||linkedExample){
  const [pattern,en,ar]=(suggestion||linkedExample).split('~');
  assert(patternIds.has(+pattern)&&en&&ar,id);
  patterns.push({id:+pattern,en,ar});
 }
 for(const id of relatedByTopic[topic.id]||[117,9037]){
  if(!patterns.some(p=>p.id===id))patterns.push({id});
 }
 scenes.push({id,topic:topic.id,en,ar,sentenceEn,sentenceAr,words,patterns,taskEn,taskAr,path,
  width:500,height:300,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const [topic,rows] of annotationRows)assert(rows.length<=scenes.filter(s=>s.topic===topic).length,topic);
const byId=new Map(scenes.map(scene=>[scene.id,scene]));
for(const line of text('production/idea-pattern-practice.tsv')){
 const [sceneId,rawId,en,ar,taskEn,taskAr,...extra]=line.split('|');
 const scene=byId.get(sceneId),id=Number(rawId);
 assert(scene&&patternIds.has(id)&&en&&ar&&taskEn&&taskAr&&!extra.length,line);
 assert(!scene.patterns.some(pattern=>pattern.id===id&&pattern.en),line);
 scene.patterns=scene.patterns.filter(pattern=>pattern.id!==id);
 scene.patterns.push({id,en,ar,taskEn,taskAr});
}
const covered=new Set(scenes.flatMap(scene=>scene.patterns.filter(pattern=>pattern.en).map(pattern=>pattern.id)));
assert.deepEqual(covered,patternIds,'Every lesson needs a contextual scene example');
fs.writeFileSync('public/idea-scenes.json',JSON.stringify({schema:2,topics,scenes},null,2)+'\n');
console.log(`Indexed ${scenes.length} independent Idea Lab scenes`);
