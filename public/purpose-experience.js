function purposeOptions(selected='',prefix='',answer=false){
 const placeholder=answer?'اختر… / Choose…':'كل الأغراض / All purposes';
 return `<option value="" data-no-translate>${placeholder}</option>${EPPurposes.groups.map(group=>
  `${answer?'':`<option data-no-translate value="${prefix+group.id}" ${selected===prefix+group.id?'selected':''}>${H(purposeBilingual(group.id))}</option>`}
   <optgroup label="${H(purposeBilingual(group.id))}">${group.items.map(([id])=>
    `<option data-no-translate value="${prefix+id}" ${selected===prefix+id?'selected':''}>${H(purposeBilingual(id))}</option>`).join('')}</optgroup>`
 ).join('')}`;
}
function purposeBilingual(id){
 const purpose=EPPurposes.get(id);
 return purpose?`${purpose.ar} / ${purpose.en}`:'';
}
function purposeLabel(id){
 const purpose=EPPurposes.get(id);
 return purpose?T(purpose.ar,purpose.en):'';
}
function sentencePurpose(row){
 if(row.pattern_id||!row.grammar)return EPPurposes.forCourseSentence(row);
 return EPPurposes.forReference(referenceGuide(row),row.en);
}
function purposeTag(id){
 return `<a class="purpose-chip" href="#purposes" onclick="selectPurpose('${id}')">${H(purposeLabel(id))}</a>`;
}
function matchesLearningPurpose(selection,ids,actual){
 if(selection?.startsWith('purpose:')){
  const purpose=selection.slice('purpose:'.length);
  return actual?EPPurposes.matches(purpose,actual):ids.some(id=>EPPurposes.matches(purpose,EPPurposes.forPattern(id)));
 }
 const preset=CURRICULUM?.routes.find(item=>item.id===selection);
 return !preset||ids.some(id=>preset.pattern_ids.includes(id));
}
function makePurposeTrack(id,specific){
 const cue=(PILOT?.trainingAudio||referenceStudyRecordings)?.[`purpose-category-${id}-female`];
 const recorded=specific&&referenceStudyRecording('purpose',specific.en,'female');
 const prompt=recorded||specific&&!cue?specific:{ar:EPPurposes.get(id).ar,en:EPPurposes.spoken(id)};
 return {prompt,text:prompt.en,recording:recorded||cue};
}
function purposeTrack(row){
 const id=sentencePurpose(row);
 if(row.pattern_id||!row.grammar)return makePurposeTrack(id);
 const guide=referenceGuide(row);
 const specific=referenceStudyAudio.purposePrompt(row,guide);
 const generic=EPEnglish.sameSpeech(specific.en,guide.purpose_en);
 return makePurposeTrack(id,generic&&['schedule','clarify','hypothetical'].includes(id)?null:specific);
}
function playPurposeTrack({recording,text},rate){
 return recording?.path?playVocabularyClip(recording,{rate}):synthesizeTrainingCue(text,rate);
}
function narrateSentencePurpose(row,rate){return playPurposeTrack(purposeTrack(row),rate)}
let purposeSpeech;
function hearPurpose(id){
 if(!EPPurposes.get(id)?.group)return;
 stopSpeech({keepReferencePlayer:true});
 purposeSpeech=playPurposeTrack(makePurposeTrack(id),state.rate||1);
}
function lookupPurposeSentence(id){
 return referencePlayer?.rows.get(id)||PILOT?.sentences.find(row=>row.id===id);
}
function hearSentencePurpose(id){
 const row=lookupPurposeSentence(id);
 if(!row)return;
 stopSpeech({keepReferencePlayer:true});
 purposeSpeech=narrateSentencePurpose(row,state.rate||1);
}
function sentencePurposeMarkup(row){
 if(!row)return '';
 return `<div class="purpose-line"><span>${T('غرض العبارة','Purpose')}</span>${purposeTag(sentencePurpose(row))}
  <button class="textlink" type="button" onclick="hearSentencePurpose('${H(row.id)}')">▷ ${T('اسمع الغرض','Hear the purpose')}</button></div>`;
}
function dialoguePurposeMarkup(id){
 return `<div class="purpose-line"><span>${T('غرض التعبير','Purpose')}</span>${purposeTag(id)}
  <button class="textlink" type="button" onclick="hearPurpose('${id}')">▷ ${T('اسمع الغرض','Hear the purpose')}</button></div>`;
}
function playPurposeBeforeLessonExample(done){
 const row=lessonScene(),play=()=>speak(current.examples[example][0],state.voice,done);
 if(!row||route?.session.speakPurpose===false){play();return}
 stopSpeech();
 const sound=purposeSpeech=narrateSentencePurpose(row,state.rate||1);
 sound.done.then(()=>{
  if(purposeSpeech!==sound)return;
  purposeSpeech=null;
  play();
 });
}
let selectedPurpose=EPFilters.read('purpose-tree',{purpose:''}).purpose,purposePracticeIndex=0;
if(!EPPurposes.get(selectedPurpose))selectedPurpose='';
function selectPurpose(id){
 selectedPurpose=id;
 EPFilters.save('purpose-tree',{purpose:id});
 purposePracticeIndex=0;
 if(page==='purposes'){
  paintPurposeTree();
  $('#purpose-tree').querySelector(id?`[data-purpose-id="${id}"]`:'[data-purpose-id]')?.focus({preventScroll:true});
 }
}
function purposePage(){
 return `${head(T('أغراض التعبير','Communicative purposes'),T('استكشف لماذا نقول العبارة، ثم جرّب تحديد الغرض من مثال تسمعه أو تقرؤه.','Explore why we say a sentence, then identify the purpose in an example you read or hear.'))}
  <div class="toolbar purpose-tree-filter"><label>${T('ابحث عن غرض','Search for a purpose')}
   <input type="search" id="purpose-tree-query" oninput="filterPurposeTree()"></label></div>
  <div id="purpose-tree"></div>`;
}
function filterPurposeTree(){
 const input=$('#purpose-tree-query');
 if(!input)return;
 EPFilters.controls('purpose-tree-search',input.closest('.toolbar'),{query:input},filterPurposeTree);
 const query=normalizeSearchTerm(input.value).split(' ').filter(Boolean);
 const matches=text=>query.every(word=>normalizeSearchTerm(text).includes(word));
 for(const branch of document.querySelectorAll('.purpose-branch')){
  const group=branch.querySelector('h2 button').dataset.purposeId;
  const groupMatches=matches(purposeBilingual(group));
  const leaves=[...branch.querySelectorAll('li')];
  for(const leaf of leaves)leaf.hidden=!groupMatches&&!matches(purposeBilingual(leaf.querySelector('button').dataset.purposeId));
  branch.hidden=!groupMatches&&leaves.every(leaf=>leaf.hidden);
 }
}
function teacherPurposeOptions(purposeId){
 return {...route.session,...route.session.filters,patternIds:PILOT.pattern_order,routeId:'',learningLevel:'',stage:0,cefr:'',sample:0,purposeId};
}
function trainPurpose(){
 if(!route)return;
 const options=teacherPurposeOptions(selectedPurpose);
 if(!route.queue(options).length)return;
 stopSpeech();
 route.configure(options);
 navigate('coach');
}
function explorePurposeSentences(){
 for(const [key,value] of Object.entries(referenceDefaults))if(!key.endsWith('Strategy'))epReferenceSet(key,value,false);
 epReferenceSet('purpose',selectedPurpose,false);
 navigate('references');
}
function paintPurposeTree(){
 const host=$('#purpose-tree');
 if(!host)return;
 const patternCounts=new Map(),sentenceCounts=new Map();
 function count(map,id){
  const group=EPPurposes.get(id).group;
  for(const key of [id,group])map.set(key,(map.get(key)||0)+1);
 }
 for(const pattern of PILOT?.patterns||[])count(patternCounts,EPPurposes.forPattern(pattern.id));
 for(const row of REFERENCE_CORPUS?.sentences||[])count(sentenceCounts,sentencePurpose(row));
 const title=id=>{
  const references=sentenceCounts.get(id)||0,patterns=patternCounts.get(id)||0;
  const count=references?T(`${references} جملة`,`${references} sentences`):patterns?T(`${patterns} نمط`,`${patterns} patterns`):'';
  return `<button type="button" class="purpose-choice ${selectedPurpose===id?'active':''}" aria-pressed="${selectedPurpose===id}" data-purpose-id="${id}" onclick="selectPurpose('${id}')">
   <span class="purpose-choice-label" data-no-translate><bdi lang="ar">${H(EPPurposes.get(id).ar)}</bdi>
    <bdi lang="en">${H(EPPurposes.get(id).en)}</bdi></span><span>${count}</span></button>`;
 };
 const controls=Boolean(PILOT||REFERENCE_CORPUS);
 host.innerHTML=`<div class="purpose-branches">${EPPurposes.groups.map(group=>`<section class="panel purpose-branch">
  <h2>${title(group.id)}</h2><ul>${group.items.map(([id])=>`<li>${title(id)}${sentenceCounts.get(id)||patternCounts.get(id)?`<button type="button" class="purpose-listen" aria-label="${T('اسمع','Hear')} ${H(purposeLabel(id))}" onclick="hearPurpose('${id}')">▷</button>`:''}</li>`).join('')}</ul></section>`).join('')}</div>
  <div class="buttonrow purpose-actions">
   ${selectedPurpose?`<b role="status">${T('الغرض المحدد','Selected purpose')} · ${H(purposeLabel(selectedPurpose))}</b>`:''}
   <button type="button" class="secondary" onclick="selectPurpose('')" ${selectedPurpose?'':'hidden'}>${T('إلغاء تحديد الغرض','Clear purpose selection')}</button>
   <button type="button" class="secondary" onclick="explorePurposeSentences()" ${REFERENCE_CORPUS&&(!selectedPurpose||sentenceCounts.has(selectedPurpose))?'':'disabled'}>${T('الجمل المرجعية','Reference sentences')} · ${selectedPurpose?sentenceCounts.get(selectedPurpose)||0:REFERENCE_CORPUS?.sentences.length||0}</button>
   <button type="button" class="primary" onclick="trainPurpose()" ${PILOT&&(!selectedPurpose||patternCounts.has(selectedPurpose))?'':'disabled'}>${T('تدرّب على الأنماط','Practise patterns')} · ${selectedPurpose?patternCounts.get(selectedPurpose)||0:PILOT?.patterns.length||0}</button>
  </div><section class="panel purpose-practice" id="purpose-practice">${controls?'':T('جارٍ تحميل الأمثلة…','Loading examples…')}</section>`;
 paintPurposePractice();
 filterPurposeTree();
}
function purposePracticeRow(){
 const fits=row=>EPPurposes.matches(selectedPurpose,sentencePurpose(row));
 const rows=(REFERENCE_CORPUS?.sentences||[]).filter(row=>row.recordings?.male?.sha256&&fits(row));
 const examples=rows.length?rows:(PILOT?.sentences||[]).filter(fits);
 return examples[purposePracticeIndex%examples.length];
}
function playPurposePractice(id){
 const row=lookupPurposeSentence(id);
 if(!row)return;
 stopSpeech({keepReferencePlayer:true});
 const track=referenceStudySentenceTrack(row,'male');
 purposeSpeech=track.recording?.path?playVocabularyClip(track.recording):synthesizeTrainingCue(track.text,state.rate||1,'male');
}
function paintPurposePractice(){
 const host=$('#purpose-practice'),row=purposePracticeRow();
 if(!host)return;
 const id=row&&sentencePurpose(row);
 host.innerHTML=`<h2>${T('ما غرض العبارة؟','What is the purpose?')}</h2>${!row?`<p>${T('اختر فرعًا آخر للتدرّب على أحد الأمثلة المتاحة.','Choose another branch to practise with an available example.')}</p>`:`
  <p class="sentence" lang="en" dir="ltr">${H(englishDisplay(row.en,row))}</p>${EP.ar(row.ar)}
  <div class="buttonrow">
   <button type="button" class="secondary" onclick="playPurposePractice('${H(row.id)}')">▷ ${T('اسمع العبارة','Hear the sentence')}</button>
   <label>${T('اختر الغرض','Choose the purpose')}<select id="purpose-answer" onchange="checkPurposeAnswer('${id}',this.value)">
    ${purposeOptions('','',true)}
   </select></label>
   <button type="button" class="secondary" onclick="nextPurposePractice()">${T('مثال آخر','Another example')}</button>
  </div><p id="purpose-feedback" role="status"></p>
  <button id="purpose-practice-hear" type="button" class="textlink" hidden onclick="hearSentencePurpose('${H(row.id)}')">▷ ${T('اسمع الغرض','Hear the purpose')}</button>`}`;
 EP.apply();
}
function checkPurposeAnswer(id,answer){
 const right=id===answer;
 $('#purpose-feedback').textContent=!answer?'':right?T('صحيح. '+purposeLabel(id),'Correct. '+purposeLabel(id)):
  T('حاول مرة أخرى. فكّر فيما يريد المتحدث أن يحققه.','Try again. Think about what the speaker wants to achieve.');
 $('#purpose-practice-hear').hidden=!right;
}
function nextPurposePractice(){
 purposeSpeech?.stop();
 purposePracticeIndex++;
 paintPurposePractice();
 $('#purpose-answer')?.focus();
}
document.addEventListener('DOMContentLoaded',()=>{
 const stopBeforePurposeSpeech=stopSpeech;
 stopSpeech=function(options){
  purposeSpeech?.stop();
  purposeSpeech=null;
  if(teacherSimulation?.player.running)teacherSimulation.player.pause();
  stopBeforePurposeSpeech(options);
 };
 const renderBeforePurpose=render;
 render=function(){
  if(page!=='purposes'){renderBeforePurpose();return}
  releaseDialoguePlayer();
  releaseComparisonGuide();
  nav();
  $('#app').innerHTML=purposePage();
  paintPurposeTree();
  EP.decorate();
 };
 if(location.hash==='#purposes'){page='purposes';render()}
 Promise.all([pilotReady,referenceDataReady]).then(()=>{if(page==='purposes')paintPurposeTree()});
},{once:true});
