const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {asset,webpSize}=require('./media-validation.cjs');
const topics=[],scenes=[];
let topic,number=0;
for(const line of fs.readFileSync('production/idea-lab-scenes.tsv','utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/)){
 if(line.startsWith('@')){
  if(topic)assert.equal(number,10,topic.id);
  const [id,ar,en]=line.slice(1).split('|');
  assert(/^[a-z]+$/.test(id)&&ar&&en&&!topics.some(t=>t.id===id),line);
  topic={id,ar,en};topics.push(topic);number=0;
  continue;
 }
 const [en,ar,sentenceEn,sentenceAr,vocabulary,taskEn,taskAr,...extra]=line.split('|');
 assert(topic&&en&&ar&&sentenceEn&&sentenceAr&&vocabulary&&taskEn&&taskAr&&!extra.length,line);
 const id=`idea-${topic.id}-${String(++number).padStart(2,'0')}`;
 const path=`assets/scenes/idea-lab/${id.slice(5)}.webp`;
 const bytes=fs.readFileSync(asset(process.cwd(),path));
 assert.deepEqual(webpSize(bytes),[500,300],path);
 const words=vocabulary.split(',').map(pair=>{
  const [en,ar]=pair.split('=');
  assert(en&&ar,pair);
  return {en,ar};
 });
 assert(words.length>=4,id);
 scenes.push({id,topic:topic.id,en,ar,sentenceEn,sentenceAr,words,taskEn,taskAr,path,
  width:500,height:300,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
assert.equal(number,10,topic?.id);
assert.equal(scenes.length,100);
fs.writeFileSync('public/idea-scenes.json',JSON.stringify({schema:1,topics,scenes},null,2)+'\n');
console.log(`Indexed ${scenes.length} independent Idea Lab scenes`);
