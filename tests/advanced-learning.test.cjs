const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const content=require('../public/advanced-curriculum.js');
const share=require('../public/share-model.js');
const {createServer}=require('../server.js');

test('each grammar level has original, distinct questions and feeds the comprehensive review',()=>{
 const ids=new Set();
 for(const level of content.levels){
  const questions=content.exam(level);
  assert.equal(questions.length,20,level);
  for(const question of questions){
   assert(!ids.has(question.id),question.id);
   ids.add(question.id);
   assert(content.groups.grammar[question.group],question.id);
   assert.match(question.ruleAr,/[\u0600-\u06ff]/);
   assert(question.example&&question.translation&&question.question&&question.ruleEn);
   const answers=[question.answer,...question.distractors];
   assert.equal(answers.filter(Boolean).length,3);
   assert.equal(new Set(answers).size,3,question.id);
   assert.equal(content.get('grammar',question.id),question);
  }
 }
 assert.equal(content.exam('all').length,ids.size);
 assert.deepEqual(content.exam('review',['be','perfect-participle','nonexistent']).map(row=>row.id),['be','perfect-participle']);
});
test('comparisons point to taught phrases and regional idioms contain contextual examples',()=>{
 assert(content.phrases.length>=80&&content.idioms.length>=80);
 for(const row of content.phrases)assert(content.groups.phrases[row.group]&&row.example&&row.ruleEn,row.id);
 for(const row of content.comparisons){
  assert(row.examples.length&&row.ruleAr&&row.ruleEn,row.id);
  for(const id of row.examples)assert(content.get('phrases',id),id);
 }
 for(const row of content.idioms){
  assert(content.groups.idioms[row.group]&&row.example&&row.translation&&row.ruleEn,row.id);
  assert(['both','us','uk'].includes(row.region),row.id);
  if(row.uk)assert(row.ukExample&&row.en!==row.uk,row.id);
 }
 assert.equal(content.get('idioms','knock-wood').uk,'touch wood');
});
test('shared plans round-trip typed settings without copying learner progress',()=>{
 const coach=share.normalize('coach-plan',{plan:{version:1,patternIds:[9097,12,9097,-4],purposeId:'schedule',
  voiceMode:'female',mode:'interactive',stage:2,readingSeconds:10,expandVocabulary:true,showEnglish:false,rate:.85,
  completed:[9097],answers:['private'],imageMode:'normal'}});
 assert.deepEqual(coach.plan.patternIds,[9097,12]);
 assert.equal(coach.plan.showEnglish,false);
 assert.equal(coach.plan.imageMode,'normal');
 assert(!Object.hasOwn(coach.plan,'answers')&&!Object.hasOwn(coach.plan,'completed'));
 const url=share.link('https://english.example/index.html?other=secret',coach);
 assert.equal(url.hash,'#coach');assert(!url.searchParams.has('other'));
 assert.deepEqual(share.read(url.searchParams),coach);
 const library=share.normalize('reference-plan',{plan:{version:1,section:'patterns',patternStrategy:'purpose',
  query:'  موعد الحصة  ',patternLevel:'A2',purposeSteps:{'pattern-form':false},purposeMode:'context',size:48,voice:'female',rate:1.15}});
 assert.equal(library.plan.query,'موعد الحصة');
 assert.deepEqual(library.plan.purposeSteps,{'pattern-purpose':false,'pattern-form':false,'example-purpose':true});
 assert.equal(Object.hasOwn(library.plan,'purposeMode'),false);
 assert.deepEqual(share.read(share.link('https://english.example/',library).searchParams),library);
 assert.equal(share.read(new URLSearchParams('share=page&target=__proto__')),null);
 assert.equal(share.normalize('coach-plan',{plan:{version:1,patternIds:['no']}}),null);
});
test('a crawler gets a distinct title, description and fetchable image for a shared route',async t=>{
 const server=createServer({publicOrigin:'https://english.example'});
 server.listen(0,'127.0.0.1');
 await once(server,'listening');t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}/index.html`;
 const cases=[
  [share.normalize('pattern',{target:9097}),/scheduled event/],
  [share.normalize('page',{target:'advanced',section:'grammar'}),/مكتبة القواعد/],
  [share.normalize('advanced-item',{target:'knock-wood',section:'idioms'}),/knock on wood/],
  [share.normalize('coach-plan',{plan:{version:1,patternIds:[9097],expandVocabulary:true}}),/توسيع المفردات/],
  [share.normalize('reference-plan',{plan:{version:1,patternStrategy:'purpose',section:'patterns',query:'"><script>PRIVATE<\/script>'}}),/الغرض ثم الجملة/]
 ];
 for(const [descriptor,title] of cases){
  const url=share.link(base,descriptor);
  const response=await fetch(url),html=await response.text();
  assert.equal(response.status,200);
  assert.match(html,title);
  assert.match(html,/<meta property="og:title" content="[^"]+">/);
  assert.match(html,/<meta property="og:description" content="[^"]+">/);
  assert(!html.includes('<script>PRIVATE'));
  const image=/<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  assert(image?.startsWith('https://english.example/'));
  const publicImage=await fetch(new URL(new URL(image).pathname,base),{method:'HEAD'});
  assert.equal(publicImage.status,200);
  assert.equal((await fetch(url,{method:'HEAD'})).headers.get('content-length'),response.headers.get('content-length'));
 }
});
