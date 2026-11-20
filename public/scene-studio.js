/* Archive labels are derived from the original brief, sentence and course tags. */
let sceneArchive, studioPage=0, studioAudio=null, studioMode='photos', studioLearningLevel='',studioCollection='';
const archiveReady=Promise.all([fetch('scene-archive.json').then(r=>r.ok?r.json():null).catch(()=>null),courseScriptsReady,learningLevelsReady]).then(([data])=>data);
const normalizeSceneQuery=value=>String(value).normalize('NFKD').toLowerCase()
 .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا');
const scenePrompts={
 home:['What are they doing at home?','I think they are getting ready for the day.','What might they do next?','Maybe they will make breakfast together.'],
 study:['What might this person be studying?','They might be preparing for a lesson.','Could we study together?','Yes. Let’s start with one example.'],
 work:['What might they be discussing?','They might be planning their next task.','When should we meet again?','Let’s meet after lunch.'],
 travel:['Where might they be going?','They might be looking for the next bus or train.','Could you tell me where to go?','Of course. Let’s look at the signs.'],
 water:['What might they say near the water?','I think they are talking about the conditions.','Is it safe to swim here?','Let’s ask someone who works here.'],
 outdoors:['How would you describe the weather?','It looks like a good day to be outside.','Would you like to go for a walk?','Yes. Let’s find a quiet place.'],
 food:['What might they order or prepare?','They might want something to eat and drink.','What would you like?','I’d like something warm, please.'],
 shopping:['What might they be looking for?','They might be deciding what to buy.','How much does this cost?','Let me check the price for you.'],
 health:['What kind of help might this person need?','They might need to ask for advice.','Could I make an appointment?','Yes. What time works for you?'],
 social:['How might these people know each other?','They might be friends or neighbors.','Would you like to join us?','Yes, thank you. What are you planning?'],
 objects:['What could someone use this object for?','They might need it to finish a task.','Can I borrow it for a moment?','Of course. I can show you how to use it.'],
 everyday:['What could be happening here?','I think the people are getting ready to do something.','What should we do next?','Let’s talk about our options.']
};
function sceneStudioPage(){
 const topics=new Map([...(sceneArchive?.topics||[]),...(ideaLibrary?.topics||[])].map(topic=>[topic.id,topic]));
 return head(T('مكتبة الصور الذكية','Smart photo library'),T(
  'تعلّم من صورة واحدة، أو تأمّل تسلسل محادثة وابتكر حوارك.',
  'Learn from a single photo or explore a conversation sequence and write your own dialogue.'))+
  `<nav class="studio-tabs" aria-label="${T('أقسام مكتبة الصور','Photo library sections')}">
   <button type="button" class="secondary" data-studio-mode="photos" aria-pressed="${studioMode==='photos'}" onclick="setStudioMode(this.dataset.studioMode)">${T('تصفّح الصور','Browse photos')}</button>
   <button type="button" class="secondary" data-studio-mode="journeys" aria-pressed="${studioMode==='journeys'}" onclick="setStudioMode(this.dataset.studioMode)">${T('مشاهد المحادثات','Conversation scenes')}</button>
  </nav>`+(studioMode==='journeys'?studioJourneysPage():
  `<section class="scene-detail" id="scene-studio-active" hidden></section>
  <dialog id="idea-zoom" aria-labelledby="idea-zoom-title" onclose="restoreIdeaZoom()"><div class="idea-zoom-header"><h2 id="idea-zoom-title"></h2><form method="dialog"><button class="secondary" aria-label="${T('إغلاق عرض المشهد','Close scene view')}">×</button></form></div><div class="idea-zoom-content"></div></dialog>
  <section class="scene-gallery" id="scene-studio-gallery">
  ${epSectionLinks(['references'])}
  <div class="toolbar"><input type="search" id="scene-studio-query" oninput="studioPage=0;paintSceneStudio()" placeholder="${T('مسبح، مكتبة، train…','Pool, library, قطار…')}" aria-label="${T('بحث المشاهد','Search scenes')}">
  <select id="scene-studio-topic" onchange="studioPage=0;paintSceneStudio()" aria-label="${T('موضوع المشهد','Scene topic')}"><option value="">${T('كل الموضوعات','All topics')}</option><option value="conversation">${T('مشاهد المحادثات','Conversation scenes')}</option>${[...topics.values()].map(t=>`<option value="${t.id}">${H(T(t.ar,t.en))}</option>`).join('')}</select>
  <label>${T('مستوى التعلّم','Learning level')}<select id="scene-studio-level" onchange="setStudioLearningLevel(this.value)">${learningLevelOptions(studioLearningLevel)}</select></label>
  <label>${T('المجموعة','Collection')}<select id="scene-studio-collection" onchange="studioCollection=this.value;studioPage=0;paintSceneStudio()">
   ${[['','كل الصور','All photos'],['speaking','مشاهد ممارسة التحدث','Speaking practice scenes'],['saved','صور لها حوارات محفوظة','Photos with saved dialogues']].map(([id,ar,en])=>
    `<option value="${id}" ${studioCollection===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
  ${smartLibraryFilters()}<button type="button" class="secondary" id="scene-studio-suggest" onclick="surpriseScene()">${T('اقترح مشهدًا','Suggest a scene')}</button></div>
  <section id="studio-pattern-context"></section>
  <p id="scene-studio-count" role="status"></p>
  <div id="scene-studio-results" class="scene-studio-grid"></div><div class="buttonrow">
   <button class="secondary" id="scene-studio-prev" onclick="studioPage--;paintSceneStudio()">${T('السابق','Previous')}</button>
   <button class="secondary" id="scene-studio-next" onclick="studioPage++;paintSceneStudio()">${T('التالي','Next')}</button></div></section>`);
}
function sceneGalleryCard(id,picture,title,level,open){
 return `<article class="panel"><button type="button" class="scene-gallery-card" data-scene-card="${H(id)}" onclick="${open}(this.dataset.sceneCard)">
  <span class="scene-gallery-thumb">${picture}</span><b>${H(title)}</b><small>${H(level)}</small></button></article>`;
}
function sceneGalleryReturnButton(close,label=T('العودة إلى تصفّح الصور','Back to photos')){
 return `<button type="button" class="secondary scene-gallery-return" onclick="${close}()">${label}</button>`;
}
function returnToSceneGallery(gallery,detail,id,fallback='input'){
 stopSpeech();
 clearIdeaFlash();
 ideaFrameObserver?.disconnect();
 if($('#idea-zoom')?.open)$('#idea-zoom').close();
 $('#idea-zoom .idea-zoom-content')?.replaceChildren();
 detail.hidden=true;
 detail.replaceChildren();
 gallery.hidden=false;
 (gallery.querySelector(`[data-scene-card="${CSS.escape(id)}"]`)||gallery.querySelector(fallback))?.focus();
}
function setStudioMode(mode){
 if(mode===studioMode)return;
 studioMode=mode;studioOpenEpoch++;
 clearIdeaFlash();
 render();
 $(`[data-studio-mode="${mode}"]`)?.focus();
}
function studioMatches(){
 const tokens=normalizeSceneQuery($('#scene-studio-query')?.value||'').trim().split(/\s+/).filter(Boolean);
 const topic=$('#scene-studio-topic')?.value, topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 const sentences=new Map([...(PILOT?.sentences||[]),...(REFERENCE_CORPUS?.sentences||[]),...(SUPPLEMENT?.sentences||[])].map(s=>[s.id,s]));
 const dialogues=new Map((PILOT?.dialogues||[]).map(dialogue=>[dialogue.id,dialogue]));
 const saved=new Set(studioCollection==='saved'?ideaArchive.map(entry=>scenePhotoKey(entry.sceneId)):[]);
 const inCollection=id=>studioCollection!=='saved'||saved.has(id);
 const originals=(studioCollection==='speaking'?[]:sceneArchive?.scenes||[]).flatMap(item=>{
  const row=sentences.get(item.id);
  if(!row||!inCollection(item.id)||!matchesStudioContext(row)||topic&&!item.topics.includes(topic))return [];
  if(!tokens.length)return [{item,row,level:sentenceLearningLevel(row)}];
  const labels=item.topics.flatMap(id=>[topics.get(id).ar,topics.get(id).en]);
  const words=studioVocabulary?.[item.id]?.words.filter(hasIdeaPoint).flatMap(word=>[word.en,word.ar])||[];
  const text=normalizeSceneQuery([row.id,row.en,row.ar,item.description,item.descriptionAr,...item.keywords,...labels,...words].join(' '));
  return tokens.every(word=>text.includes(word))?[{item,row,level:sentenceLearningLevel(row)}]:[];
 });
 const visualPractice=(ideaLibrary?.scenes||[]).flatMap(scene=>{
  const location=dialogueSceneLocations.get(scene.id);
  if(!inCollection(scene.id)||topic&&(topic==='conversation'?!location:scene.topic!==topic))return [];
  const dialogue=dialogues.get(location?.id);
  const row={id:scene.id,pattern_ids:scene.patterns.map(pattern=>pattern.id)};
  if(!matchesStudioContext(row))return [];
  if(!tokens.length)return [{item:scene,row,scene,level:sceneLearningLevel(scene)}];
  const text=normalizeSceneQuery([scene.id,scene.en,scene.ar,scene.sentenceEn,scene.sentenceAr,scene.taskEn,scene.taskAr,
   ...scene.patterns.flatMap(pattern=>[pattern.en,pattern.ar]),dialogue?.en,dialogue?.ar,
   ...scene.words.flatMap(word=>[word.en,word.ar])].join(' '));
  return tokens.every(word=>text.includes(word))?[{item:scene,row,scene,level:sceneLearningLevel(scene)}]:[];
 });
 const levels=Object.keys(learningLevelNames);
 const rank=new Map(learningLevels.dialogueOrder.map((id,index)=>[id,index]));
 const firstScenes=new Map(learningLevels.starterScenes.map((id,index)=>[id,index]));
 const priority=({row})=>{
  const dialogueRank=rank.get(dialogueSceneLocations.get(row.id)?.id)??Infinity;
  return firstScenes.get(row.id)??(firstScenes.size+dialogueRank);
 };
 return [...originals,...visualPractice].filter(row=>!studioLearningLevel||row.level===studioLearningLevel)
  .sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level)||
   (studioPattern?Number(Boolean(a.scene))-Number(Boolean(b.scene)):0)||priority(a)-priority(b));
}
function setStudioLearningLevel(level){
 studioLearningLevel=level;
 studioPage=0;
 paintSceneStudio();
}
function refreshSavedPhotoResults(){
 if(page==='scene-studio'&&studioMode==='photos'&&studioCollection==='saved')paintSceneStudio();
}
function paintSceneStudio(){
 if(studioMode==='journeys'){paintStudioJourneys();return}
 if(!$('#scene-studio-results'))return;
 const query=$('#scene-studio-query');
 const filters=EPFilters.controls('photo-library',query.closest('.toolbar'),{
  query,topic:$('#scene-studio-topic'),level:$('#scene-studio-level'),collection:$('#scene-studio-collection'),
  pattern:$('#studio-pattern'),purpose:$('#studio-purpose')
 },()=>{studioPage=0;paintSceneStudio()});
 studioLearningLevel=filters.level;studioCollection=filters.collection;
 if(!document.body.dataset.linkedLearning||$('#studio-pattern').options.length>1)studioPattern=Number(filters.pattern)||null;
 studioPurpose=filters.purpose;
 const matches=studioMatches(), total=Math.max(1,Math.ceil(matches.length/24));
 studioPage=Math.max(0,Math.min(studioPage,total-1));
 $('#scene-studio-count').textContent=T(`${matches.length} مشهد · صفحة ${studioPage+1} من ${total}`,`${matches.length} scenes · Page ${studioPage+1} of ${total}`);
 $('#scene-studio-prev').disabled=studioPage===0;
 $('#scene-studio-next').disabled=studioPage+1>=total;
 const topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 $('#scene-studio-results').innerHTML=matches.slice(studioPage*24,studioPage*24+24).map(({item,row,scene,level})=>{
  const {ar,en}=scene||topics.get(item.topics[0]);
  return sceneGalleryCard(item.id,scene?ideaPicture(scene):studioPicture(row,ar,en),T(ar,en),learningLevelLabel(level),'openStudioScene');
 }).join('');
 prepareSmartSelection();
}
function studioPicture(row,ar,en){
 return pilotScene({...row,en,ar,context:''});
}
async function copySceneAiPrompt(button){
 const panel=button.closest('.scene-ai'),box=panel.querySelector('[data-scene-ai-prompt]'),status=panel.querySelector('[data-scene-ai-status]');
 try{await navigator.clipboard.writeText(box.value);status.textContent=T('نُسخ الطلب. الصقه في مساعدك المفضل.','Prompt copied. Paste it into your preferred assistant.')}
 catch{box.hidden=false;box.focus();box.select();status.textContent=T('حُدّد النص. انسخه يدويًا.','Text selected. Copy it manually.')}
}
async function surpriseScene(){
 const gallery=$('#scene-studio-gallery'),epoch=studioOpenEpoch;
 if(!gallery||gallery.hidden)return;
 await loadStudioVocabulary();
 if(!gallery.isConnected||gallery.hidden||epoch!==studioOpenEpoch)return;
 const matches=studioMatches();
 const withWords=matches.map(entry=>({id:entry.item.id,words:entry.scene?.words||studioVocabulary?.[entry.item.id]?.words||[]}))
  .filter(entry=>entry.words.length);
 const labelled=withWords.filter(entry=>entry.words.some(hasIdeaPoint));
 const candidates=labelled.length?labelled:withWords;
 if(!candidates.length){
  toast(T('لا توجد مشاهد بمفردات متاحة ضمن هذه الفلاتر.','No scenes with available vocabulary match these filters.'));
  return;
 }
 return openStudioScene(candidates[Math.floor(Math.random()*candidates.length)].id);
}
function openStudioScene(id){return openSmartScene(id)}
function playStudioSentence(id,voice){
 const scene=studioWordScene,row=dialogueScene(id);
 const recording=row?.recordings?.[voice];
 if(scene?.sentenceId!==id||!recording?.path)return;
 stopSpeech();
 if(ideaSequence||ideaSelected!==null)setIdeaWordMode(ideaWordMode==='flash'?'visible':ideaWordMode);
 const audio=new Audio(recording.path),host=$('#scene-studio-active');
 studioAudio=audio;
 audio.playbackRate=state.rate||1;
 const words=host.querySelectorAll('[data-studio-word]');
 const overlay=$('#idea-scene-viewer .studio-scene-cue');
 const cues=recording.words||[];
 const transcript=(recording.text||row.en).trim().split(/\s+/);
 const spokenWords=cues.map((cue,index)=>cue.text||transcript[index]||'');
 const wordsInCue=text=>EPVocabulary.tokens(text).map(EPVocabulary.normalize);
 const cueTerms=spokenWords.flatMap((text,cueIndex)=>wordsInCue(text).map(term=>({term,cueIndex})));
 const vocabulary=cues.map(()=>new Set());
 scene?.words.forEach((word,index)=>{
  const parts=wordsInCue(word.en);
  if(!parts.length)return;
  cueTerms.forEach((_,start)=>{
   if(parts.every((part,offset)=>cueTerms[start+offset]?.term===part))
    parts.forEach((_,offset)=>vocabulary[cueTerms[start+offset].cueIndex].add(index));
  });
 });
 let frame=0,last=-1;
 const paint=index=>{
  if(index===last)return;
  last=index;
  const spoken=spokenWords[index]||'';
  if(overlay){overlay.textContent=spoken;overlay.hidden=!spoken}
  words.forEach((word,i)=>word.classList.toggle('speaking',i===index));
  host.querySelectorAll('[data-idea-vocab]').forEach(item=>item.classList.toggle('studio-speaking',Boolean(vocabulary[index]?.has(+item.dataset.ideaVocab))));
  overlay?.parentElement.querySelectorAll('.idea-map-point').forEach(point=>point.classList.toggle('studio-speaking',Boolean(vocabulary[index]?.has(+point.dataset.word))));
 };
 const tick=()=>{
  if(audio.paused||audio.ended||studioAudio!==audio){paint(-1);return}
  const ms=audio.currentTime*1000;
  paint(cues.findIndex(cue=>cue.start_ms<=ms&&ms<cue.end_ms));
  frame=requestAnimationFrame(tick);
 };
 const clear=()=>{cancelAnimationFrame(frame);paint(-1)};
 audio.addEventListener('playing',()=>{cancelAnimationFrame(frame);tick()});
 for(const event of ['pause','ended','waiting','error'])audio.addEventListener(event,clear);
 audio.play().catch(()=>toast(T('تعذّر تشغيل الصوت.','Audio could not play.')));
}
labels['scene-studio']='مكتبة الصور الذكية';
if(location.hash==='#scene-studio')page=pageFromHash();
const stopSpeechBeforeStudio=stopSpeech;
stopSpeech=function(options){studioAudio?.pause();stopSpeechBeforeStudio(options)};
const renderBeforeSceneStudio=render;
render=function(){
 studioAudio?.pause();
 if(typeof clearIdeaFlash==='function'){clearIdeaFlash();ideaFrameObserver?.disconnect()}
 if(page!=='scene-studio'){renderBeforeSceneStudio();return}
 releaseDialoguePlayer();stopSpeech();nav();
 $('#app').innerHTML=sceneStudioPage();paintSceneStudio();EP.decorate();
 if(studioMode==='photos'&&!studioVocabulary)loadStudioVocabulary().then(()=>{
  if(page==='scene-studio'&&$('#scene-studio-query')?.value)paintSceneStudio();
 });
};
archiveReady.then(data=>{sceneArchive=data;if(page==='scene-studio')render()});
pilotReady.then(()=>{if(page==='scene-studio')paintSceneStudio()});
Promise.all([dialogueArchiveReady,pilotReady,dialoguePlanReady]).then(()=>{if(page==='scene-studio')paintSceneStudio()});
function playStudioDialogueTurn(id){
 const location=dialogueSceneLocations.get(id);
 const dialogue=PILOT?.dialogues.find(row=>row.id===location?.id);
 if(dialogue)playStudioDialogueRange(dialogue,location.turn,location.turn,$('#scene-studio-active'));
}
function playStudioDialogueRange(dialogue,from,to,host,byTurn=false,rate=state.rate||1){
 const turns=dialogue?.audio?.turns;
 if(!turns?.[from]||!turns[to]||!host)return;
 stopSpeech();
 const audio=new Audio(dialogue.audio.path);
 studioAudio=audio;
 let frame=0;
 audio.playbackRate=rate;
 audio.currentTime=turns[from].start_ms/1000;
 const spans=Array.from({length:to-from+1},(_,index)=>{
  const line=byTurn?host.querySelector(`[data-studio-dialogue-turn="${from+index}"]`):host;
  return [...(line?.querySelectorAll('[data-dialogue-word]')||[])];
 });
 const paint=()=>{
  const ms=audio.currentTime*1000;
  if(!audio.paused&&ms>=turns[to].end_ms)audio.pause();
  spans.forEach((words,offset)=>{
   const index=audio.paused?-1:turns[from+offset].words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
   words.forEach((word,i)=>word.classList.toggle('speaking',index===i));
  });
 };
 const tick=()=>{
  paint();
  if(!audio.paused&&studioAudio===audio)frame=requestAnimationFrame(tick);
 };
 audio.addEventListener('playing',()=>{cancelAnimationFrame(frame);tick()});
 audio.addEventListener('pause',()=>{cancelAnimationFrame(frame);paint()});
 audio.play().catch(()=>toast(T('تعذّر تشغيل الصوت.','Audio could not play.')));
}
