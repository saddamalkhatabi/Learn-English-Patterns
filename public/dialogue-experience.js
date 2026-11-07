/* One timeline drives the active turn, its scene and word cues. */
const dialogueCategories={
 social:['التعارف والأسرة','Social and family'],food:['الطعام والطلبات','Food and ordering'],
 travel:['السفر والمواصلات','Travel and transport'],study:['التعلم والمكتبة','Study and library'],
 daily:['الحياة اليومية','Everyday situations'],shopping:['التسوق','Shopping'],
 health:['الصحة','Health'],work:['العمل','Work'],interview:['مقابلات العمل','Job interviews']
};
const dialoguePurposes={
 ask:['السؤال والتحقّق','Ask and confirm'],
 request:['الطلب والاستئذان','Request and ask permission'],
 describe:['التعارف والوصف','Introduce and describe'],
 choose:['المقارنة والاختيار','Compare and choose'],
 plan:['الاتفاق والتخطيط','Make a plan'],
 retell:['سرد ما حدث','Tell what happened'],
 explain:['التوضيح والتبرير','Explain and give reasons'],
 solve:['حلّ مشكلة','Solve a problem']
};
const dialoguePlanReady=fetch('dialogue-plan.json')
 .then(response=>response.ok?response.json():null).catch(()=>null);
let dialoguePlan=null;
let dialogueCatalogPage=0;
const dialoguesPerPage=12;
const dialogueAnchors={
 1:/\bwant to\b/i,2:/\b(?:have|has) to\b/i,3:/\b(?:i['’]d|i would) like to\b/i,
 4:/\bcan i\b/i,5:/\bthis is\b/i,6:/\blet['’]s\b/i,8:/\bused to\b/i,
 9:/\bmanaged to\b/i,10:/\bit takes\b/i,11:/\b(?:it['’]s|it is) worth\b/i,
 12:/\bdo you know (?:where|if)\b/i,13:/\bneed to\b/i,102:/\bthat(?: is|['’]s)\b/i,
 103:/\bi(?: am|['’]m)\b/i,105:/\b(?:i have|do you have)\b/i,
  109:/\b(?:i['’]d|i would) like\b(?! to)/i,113:/\bmy name is\b/i,114:/\bwhat(?: is|['’]s) your name\b/i,
  116:/\bthese are\b/i,117:/\bthere is\b/i,118:/\bthere are\b/i,9023:/\bi usually\b/i,
  9037:/\bcan you\b/i,9039:/\bis it okay if\b/i,9041:/\bi need\b(?! to)/i,
 9044:/\b(?:don't|don’t|do not) have to\b/i,9047:/\byou should\b/i,9049:/\blet me\b/i,
 9051:/\b(?:what )?would you like\b(?! to)/i,9052:/\bwould you like to\b/i,
  9050:/\bplease\b/i,9054:/\bwhere is\b/i,9056:/\bwhen is\b/i,9064:/\bdo you\b/i,
  9063:/\bhow do you\b/i,9066:/\bis there\b/i,9068:/\bhow many\b/i,9069:/\bhow much\b/i,
  9075:/\bi didn['’]t\b/i,9076:/\bdid you\b/i,9080:/\bi bought\b/i,9082:/\bi forgot to\b/i,
  9089:/\bi['’]ll\b/i,9092:/\bi['’]m going to\b/i,9094:/\bare you going to\b/i,
  9097:/\b(?:starts|leaves|opens|begins) at\b/i,9100:/\bi might\b/i,9104:/\bif\b|\bi['’]ll\b/gi,
  9107:/\bi feel\b/i,9117:/\bi think\b/i,9125:/\bexcuse me\b/i,
 9120:/\bi prefer\b|\bto\b/gi,9126:/\bcould you please\b/i,9139:/\blet me know if\b/i,
  9127:/\bwould you mind\b/i,9128:/\bdo you mind if\b/i,
  9136:/\bi['’]m sorry for\b/i,9137:/\bthat['’]s all right\b/i,9138:/\bcould you clarify\b/i,
  9140:/\bbecause\b(?! of)/i,9141:/\bbecause of\b/i,9148:/\bbut\b/i
};
let dialogueQueue=null;
function pauseDialogueAudio(except){
 document.querySelectorAll('[data-dialogue-player] audio').forEach(audio=>{
  if(audio!==except)audio.pause();
 });
}
function releaseDialoguePlayer(){
 pauseDialogueAudio();
 dialogueQueue=null;
}
const stopSpeechBeforeDialogues=stopSpeech;
stopSpeech=function(){
 pauseDialogueAudio();
 stopSpeechBeforeDialogues();
};
function dialogueWords(line){
 const highlighted=new Set(line.focus??line.patterns.flatMap(id=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  return dialogueAnchors[id]?EPTeaching.indices(line.en,dialogueAnchors[id]):EPTeaching.describe(line,pattern).highlight;
 }));
 return line.en.split(/\s+/).map((word,i)=>`<span data-dialogue-word="${i}" class="${highlighted.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' ');
}
function dialoguePatterns(ids){
 return [...new Set(ids)].map(id=>{
  const p=PILOT?.patterns.find(row=>row.id===id);
  return p?`<button class="textlink pattern-form" lang="en" dir="ltr" onclick="openDialogueLesson(${id})">${H(p.form)} ↗</button>`:'';
 }).join('');
}
function openDialogueLesson(id){
 releaseDialoguePlayer();
 openLesson(id);
}
function dialoguePanel(dialogue, jump){
 return `<section class="dialogue-panel"><h2>${H(T(dialogue.ar,dialogue.en))}</h2>
  <details class="dialogue-patterns"><summary>${T('الأنماط في هذه المحادثة','Patterns in this conversation')} · ${new Set(dialogue.lines.flatMap(line=>line.patterns)).size}</summary>
  <div class="buttonrow">${dialoguePatterns(dialogue.lines.flatMap(line=>line.patterns))}</div></details>
  <div class="dialogue-active" aria-label="${T('المقطع الحالي','Current turn')}"></div>
  <details class="dialogue-transcript" ${dialogue.audio?'':'open'}>
   <summary>${T('عرض كل المحادثة','Show full conversation')}</summary>
   <ol>${dialogue.lines.map((line,i)=>`<li data-dialogue-line="${i}">
    <strong>${line.voice==='male'?T('عمر','Omar'):T('سارة','Sara')}</strong>
    <div><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</div>
    ${dialogue.audio?`<button class="textlink" onclick="${jump}(${i},this)" aria-label="${T('استمع من الدور','Listen from turn')} ${i+1}">▷</button>`:''}
   </li>`).join('')}</ol>
  </details></section>`;
}
function paintDialogue(panel,dialogue,ms){
 if(!panel||!dialogue?.audio)return;
 const active=panel.querySelector('.dialogue-active');
 if(!active)return;
 const { turns, intro, title }=dialogue.audio;
 const isTitle=Boolean(intro&&ms<turns[0].start_ms);
 const index=isTitle?-1:turns.findIndex((turn,i)=>i===turns.length-1||ms<turns[i+1].start_ms);
 const line=isTitle?{voice:'female',en:title,ar:dialogue.ar,patterns:[],scene:dialogue.lines[0].scene}:dialogue.lines[index];
 const turn=isTitle?intro:turns[index];
 if(active.dataset.turn!==String(index)){
  active.dataset.turn=index;
  const example=PILOT.sentences.find(s=>s.id===line.scene);
  const speaker=line.voice==='male'?T('عمر','Omar'):T('سارة','Sara');
  active.innerHTML=`<div class="dialogue-photo">${example?.image?pilotScene(example):''}</div><div>
   <small>${isTitle?T('عنوان المحادثة','Conversation title'):`${speaker} · ${index+1} / ${turns.length}`}</small>
   <p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}
   <div class="dialogue-turn-patterns">${dialoguePatterns(line.patterns)}</div></div>`;
  panel.querySelectorAll('[data-dialogue-line]').forEach(row=>row.classList.toggle('active',+row.dataset.dialogueLine===index));
 }
 const cue=turn.words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
 panel.querySelectorAll('[data-dialogue-word]').forEach(word=>{
  const row=word.closest('[data-dialogue-line]');
  word.classList.toggle('speaking',(!row||+row.dataset.dialogueLine===index)&&+word.dataset.dialogueWord===cue);
 });
}
function jumpCoachDialogue(index){
 const turn=route.activeDialogue?.audio?.turns[index];
 if(!turn)return;
 route.seek(turn.start_ms/1000);
 if(!route.running)route.play();
}
function openDialogue(id,queued=false,hostId='dialogue-player'){
 const dialogue=PILOT?.dialogues.find(d=>d.id===id);
 const host=document.getElementById(hostId);
 if(!dialogue||!host)return;
 if(!queued)dialogueQueue=null;
 if(referencePlayerOpen)closeReferencePlayer();
 stopSpeech();
 host.querySelector('audio')?.pause();
 host.innerHTML=(dialogue.audio?
  `<div class="dialogue-play-status" role="status">${queued?`${dialogueQueue.index+1} / ${dialogueQueue.ids.length} · ${dialogueQueue.label}`:''}</div>
  <audio controls preload="metadata" src="${H(dialogue.audio.path)}"></audio>${queued?`<div class="buttonrow">
  <button class="secondary" onclick="advanceDialogueQueue(-1)">${T('الحوار السابق','Previous conversation')}</button>
  <button class="secondary" onclick="advanceDialogueQueue(1)">${T('الحوار التالي','Next conversation')}</button>
  <button class="secondary" onclick="stopDialogueQueue()">${T('أوقف التتابع','Stop continuous play')}</button></div>`:''}`:
  `<p role="status">${T('يمكنك قراءة النص الآن. التسجيل قيد الإنتاج.','Read the transcript now. Audio is in production.')}</p>`)+dialoguePanel(dialogue,'jumpStandaloneDialogue');
 const audio=host.querySelector('audio');
 if(audio){
  host.dataset.dialogue=id;
  const paint=()=>paintDialogue(host,dialogue,audio.currentTime*1000);
  audio.addEventListener('timeupdate',paint);
  audio.addEventListener('seeked',paint);
  audio.addEventListener('play',()=>{
   pauseDialogueAudio(audio);
   stopSpeechBeforeDialogues();
  });
  audio.addEventListener('ended',()=>{if(queued&&dialogueQueue&&audio===host.querySelector('audio'))advanceDialogueQueue(1)});
  paint();
  audio.play().catch(()=>{});
 }
 host.scrollIntoView({block:'start'});
}
function playAllDialogues(filtered=false){
 const rows=filtered?filteredDialogueEntries().map(entry=>entry.dialogue):(PILOT?.dialogues||[]);
 const ids=rows.filter(dialogue=>dialogue?.audio).map(dialogue=>dialogue.id);
 if(!ids.length)return;
 const label=filtered?T('تشغيل نتائج البحث','Playing filtered results'):T('تشغيل كل المحادثات','Playing all conversations');
 dialogueQueue={ids,index:0,label};
 openDialogue(ids[0],true);
}
function advanceDialogueQueue(delta){
 if(!dialogueQueue)return;
 dialogueQueue.index=Math.max(0,dialogueQueue.index+delta);
 if(dialogueQueue.index>=dialogueQueue.ids.length){
  dialogueQueue=null;
  $('.dialogue-play-status').textContent=T('اكتمل تشغيل القائمة.','Playback complete.');
  return;
 }
 openDialogue(dialogueQueue.ids[dialogueQueue.index],true);
}
function stopDialogueQueue(){
 dialogueQueue=null;$('#dialogue-player audio')?.pause();
 $('.dialogue-play-status').textContent=T('توقف التتابع.','Continuous play stopped.');
}
function jumpStandaloneDialogue(index,button){
 const host=button.closest('[data-dialogue-player]'),audio=host?.querySelector('audio');
 const turn=PILOT?.dialogues.find(d=>d.id===host?.dataset.dialogue)?.audio?.turns[index];
 if(!audio||!turn)return;
 audio.currentTime=turn.start_ms/1000;
 audio.play().catch(()=>{});
}
function patternDialogueList(patternId,hostId){
 const choices=route?.dialoguesForPattern(patternId)||[];
 if(!choices.length)return '';
 return `<details class="panel pattern-dialogues">
  <summary>${T('تدرّب بالمحادثات على هذا النمط','Practise this pattern in conversations')} · ${choices.length}</summary>
  <div class="buttonrow">${choices.map(dialogue=>
   `<button class="secondary" onclick="openDialogue('${H(dialogue.id)}',false,'${hostId}')">
    ${dialogue.audio?'▷ ':''}${H(T(dialogue.ar,dialogue.en))}
   </button>`
  ).join('')}</div>
  <div id="${hostId}" data-dialogue-player></div>
 </details>`;
}
const renderLessonBeforeDialogues=renderLesson;
renderLesson=function(){
 $('#lesson-dialogue-player audio')?.pause();
 renderLessonBeforeDialogues();
 $('.lesson-body .stage-label')?.insertAdjacentHTML('afterend',patternDialogueList(current?.id,'lesson-dialogue-player'));
};
const updateCoachBeforeDialogues=updateCoach;
updateCoach=function(){
 updateCoachBeforeDialogues();
 const host=$('#coach-related-dialogues');
 const patternId=route?.pattern?.id;
 if(!host||host.dataset.patternId===String(patternId))return;
 host.querySelector('audio')?.pause();
 host.dataset.patternId=String(patternId);
 host.innerHTML=patternDialogueList(patternId,'coach-dialogue-player');
};
const toggleCoachBeforeDialogues=toggleCoach;
toggleCoach=function(){
 pauseDialogueAudio();
 toggleCoachBeforeDialogues();
};
const coachNextBeforeDialogues=coachNext;
coachNext=function(){
 pauseDialogueAudio();
 coachNextBeforeDialogues();
};
const coachPreviousBeforeDialogues=coachPrevious;
coachPrevious=function(){
 pauseDialogueAudio();
 coachPreviousBeforeDialogues();
};
const playCatalogBeforeDialogues=playCatalogSentence;
playCatalogSentence=function(id){
 pauseDialogueAudio();
 playCatalogBeforeDialogues(id);
};
function dialogueSeriesLabel(series){
 return series===1?T('المستوى الأول','Level 1'):T(`المستوى ${series}`,`Level ${series}`);
}
function dialoguesPage(){
 const groups=new Map();
 for(const entry of dialogueEntries()){
  if(entry.status!=='planned')groups.set(entry.series,(groups.get(entry.series)||0)+1);
 }
 const seriesChoices=Object.fromEntries([...groups.keys()].map(series=>[series,[`المستوى ${series===1?'الأول':series}`,`Level ${series}`]]));
 return head(T('المحادثات','Conversations'),T('استمع إلى عنوان كل محادثة ثم إلى شخصين يستخدمان الأنماط في موقف واحد. يتغيّر المشهد مع الأدوار، ويمكنك فتح النص الكامل في أي وقت.','Hear each title, then listen to two people use patterns in context. The scene follows the turns, and the full transcript is always available.'))+
  `<div class="buttonrow dialogue-series">${[...groups].map(([series,count])=>
   `<button class="secondary" onclick="selectDialogueSeries(${series})">${dialogueSeriesLabel(series)} · ${count}</button>`
  ).join('')}</div>
  <form class="panel dialogue-filters" onsubmit="event.preventDefault()" onreset="requestAnimationFrame(resetDialogueCatalog)">
   <label class="dialogue-search">${T('البحث','Search')}<input type="search" id="dialogue-query" oninput="resetDialogueFilters()" placeholder="${T('عنوان، موقف، أو نمط…','Title, situation, or pattern…')}"></label>
   ${dialogueSelect('category',T('الموقف','Situation'),T('كل المواقف','All situations'),dialogueCategories)}
   ${dialogueSelect('purpose',T('هدف المحادثة','Speaking goal'),T('كل الأهداف','All goals'),dialoguePurposes)}
   ${dialogueSelect('series',T('مستوى المحادثات','Conversation level'),T('كل المستويات','All conversation levels'),seriesChoices)}
   ${dialogueSelect('level',T('صعوبة اللغة المقترحة','Suggested language difficulty'),T('كل درجات الصعوبة','All difficulties'),{A1:['A1','A1'],A2:['A2','A2'],B1:['B1','B1'],B2:['B2','B2']})}
   ${dialogueSelect('status',T('الجاهزية','Availability'),T('المحادثات المتاحة','Available conversations'),{
    audio:['مسجّلة','Recorded'],text:['نص فقط','Transcript only'],planned:['مواقف في خطة التوسّع','Planned situations']
   },'resetDialogueCatalog()')}
   <label>${T('النمط','Pattern')}<select id="dialogue-pattern" onchange="resetDialogueFilters()" dir="ltr"></select></label>
   <button class="secondary" type="reset">${T('مسح الفلاتر','Reset filters')}</button>
  </form>
  <div class="buttonrow">
   <button class="primary" id="dialogue-play-all" onclick="playAllDialogues()">▷ ${T('شغّل كل المحادثات','Play all conversations')}</button>
   <button class="secondary" id="dialogue-play-filtered" onclick="playAllDialogues(true)">▷ ${T('شغّل النتائج المسجّلة','Play recorded results')}</button>
  </div>
  <div id="dialogue-player" data-dialogue-player></div>
  <p id="dialogue-count" role="status"></p>
  <div class="dialogue-catalog" id="dialogue-catalog"></div>
  <div class="buttonrow" id="dialogue-pagination" hidden>
   <button class="secondary" id="dialogue-prev-page" onclick="moveDialoguePage(-1)">${T('السابق','Previous')}</button>
   <button class="secondary" id="dialogue-next-page" onclick="moveDialoguePage(1)">${T('التالي','Next')}</button>
  </div>`;
}
function dialogueSelect(key,label,all,choices,onchange='resetDialogueFilters()'){
 return `<label>${label}<select id="dialogue-${key}" onchange="${onchange}">
  <option value="">${all}</option>${Object.entries(choices).map(([id,names])=>`<option value="${id}">${T(...names)}</option>`).join('')}
 </select></label>`;
}
function dialogueEntries(){
 const dialogues=new Map((PILOT?.dialogues||[]).map(dialogue=>[dialogue.id,dialogue]));
 const plan=new Map((dialoguePlan?.entries||[]).map(entry=>[entry.id,entry]));
 for(const dialogue of dialogues.values()){
  if(!plan.has(dialogue.id))plan.set(dialogue.id,dialogue);
 }
 return [...plan.values()].map(entry=>{
  const dialogue=dialogues.get(entry.id);
  const patternIds=dialogue?dialogue.lines.flatMap(line=>line.patterns):entry.targets;
  const status=dialogue?(dialogue.audio?'audio':'text'):'planned';
  return {...entry,series:entry.series??dialoguePlan?.defaultSeries??1,dialogue,status,patternIds:[...new Set(patternIds)]};
 });
}
function selectDialogueSeries(series){
 $('#dialogue-series').value=String(series);
 resetDialogueFilters();
}
function dialogueStatusMatches(entry,status){
 return status?entry.status===status:entry.status!=='planned';
}
function paintDialoguePatternOptions(){
 const status=$('#dialogue-status').value;
 const patternIds=new Set(dialogueEntries().filter(entry=>dialogueStatusMatches(entry,status)).flatMap(entry=>entry.patternIds));
 const options=(PILOT?.patterns||[]).filter(pattern=>patternIds.has(pattern.id))
  .sort((left,right)=>left.form.localeCompare(right.form,'en'));
 $('#dialogue-pattern').innerHTML=`<option value="">${T('كل الأنماط','All patterns')}</option>`+
  options.map(pattern=>`<option value="${pattern.id}">${H(pattern.form)}</option>`).join('');
}
function resetDialogueFilters(){
 dialogueCatalogPage=0;
 paintDialogueCatalog();
}
function resetDialogueCatalog(){
 paintDialoguePatternOptions();
 resetDialogueFilters();
}
function moveDialoguePage(delta){
 dialogueCatalogPage+=delta;
 paintDialogueCatalog();
 $('#dialogue-count').scrollIntoView({block:'start'});
}
function normalizeDialogueSearch(value){
 return value.toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'')
  .replace(/[أإآ]/g,'ا').replace(/’/g,"'");
}
function filteredDialogueEntries(){
 const status=$('#dialogue-status').value;
 const facets=['category','purpose','level','series'].map(key=>[key,$('#dialogue-'+key).value]);
 const patternId=Number($('#dialogue-pattern').value);
 const tokens=normalizeDialogueSearch($('#dialogue-query').value).trim().split(/\s+/).filter(Boolean);
 const patterns=new Map((PILOT?.patterns||[]).map(pattern=>[pattern.id,pattern]));
 return dialogueEntries().filter(entry=>{
  if(!dialogueStatusMatches(entry,status))return false;
  if(facets.some(([key,value])=>value&&String(entry[key])!==value))return false;
  if(patternId&&!entry.patternIds.includes(patternId))return false;
  if(!tokens.length)return true;
  const forms=entry.patternIds.flatMap(id=>{
   const pattern=patterns.get(id);
   return pattern?[pattern.form,pattern.title]:[];
  });
  const text=normalizeDialogueSearch([
   entry.ar,entry.en,entry.taskAr,entry.taskEn,
   ...(dialogueCategories[entry.category]||[]),...(dialoguePurposes[entry.purpose]||[]),...forms,
   ...(entry.dialogue?.lines||[]).flatMap(line=>[line.en,line.ar])
  ].join(' '));
  return tokens.every(token=>text.includes(token));
 });
}
function paintDialogueCatalog(){
 const host=$('#dialogue-catalog');
 if(!host)return;
 const entries=filteredDialogueEntries();
 const totalPages=Math.max(1,Math.ceil(entries.length/dialoguesPerPage));
 dialogueCatalogPage=Math.max(0,Math.min(dialogueCatalogPage,totalPages-1));
 const offset=dialogueCatalogPage*dialoguesPerPage;
 const pageLabel=totalPages>1?` · ${T('الصفحة','Page')} ${dialogueCatalogPage+1}/${totalPages}`:'';
 const planned=dialoguePlan?.entries.filter(entry=>entry.targets&&!PILOT?.dialogues.some(d=>d.id===entry.id)).length||0;
 const plannedLabel=planned?` · ${T(`${planned} موقفًا في خطة التوسّع`,`${planned} situations on the roadmap`)}`:'';
 $('#dialogue-count').textContent=T(`${entries.length} نتيجة`,`${entries.length} results`)+pageLabel+plannedLabel;
 $('#dialogue-pagination').hidden=totalPages===1;
 $('#dialogue-prev-page').disabled=dialogueCatalogPage===0;
 $('#dialogue-next-page').disabled=dialogueCatalogPage+1===totalPages;
 $('#dialogue-play-all').disabled=!PILOT?.dialogues.some(dialogue=>dialogue.audio);
 $('#dialogue-play-filtered').disabled=!entries.some(entry=>entry.dialogue?.audio);
 if(!entries.length){
  host.innerHTML=`<p class="panel">${PILOT?T('لا توجد نتائج لهذه الفلاتر. جرّب مسحها أو تغيير البحث.','No matches. Reset the filters or try a different search.'):T('جارٍ تحميل المحادثات…','Loading conversations…')}</p>`;
  return;
 }
 const scenes=new Map((PILOT?.sentences||[]).map(row=>[row.id,row]));
 host.innerHTML=entries.slice(offset,offset+dialoguesPerPage).map(entry=>{
  const {dialogue,category,level,purpose}=entry;
  const scene=scenes.get(dialogue?.lines[0].scene);
  const meta=[dialogueSeriesLabel(entry.series),T(...(dialogueCategories[category]||dialogueCategories.daily)),level,purpose&&T(...dialoguePurposes[purpose])].filter(Boolean).join(' · ');
  const label=dialogue?.audio?T('مسجّلة','Recorded'):dialogue?T('نص متاح','Transcript available'):T('ضمن الخطة','Planned');
  const action=dialogue?`<button class="secondary" onclick="openDialogue('${H(dialogue.id)}')">
    ${dialogue.audio?T('استمع','Listen'):T('اقرأ النص','Read transcript')} ↗</button>`:
   `<details><summary>${T('الأنماط المستهدفة','Target patterns')}</summary><div class="buttonrow">${dialoguePatterns(entry.patternIds)}</div></details>`;
  return `<article class="panel dialogue-cover">${scene?.image?pilotScene(scene):''}
   <div><small>${H(meta)}</small><span class="chip dialogue-status">${label}</span>
   <h3>${H(T(entry.ar,entry.en))}</h3>
   ${entry.taskEn&&T(entry.taskAr,entry.taskEn)!==T(entry.ar,entry.en)?`<p>${H(T(entry.taskAr,entry.taskEn))}</p>`:''}
   ${action}</div></article>`;
 }).join('');
}
labels.dialogues='المحادثات';
labels.comparisons='المقارنات';
if(['dialogues','comparisons'].includes(location.hash.slice(1)))page=location.hash.slice(1);
epNavGroups[1][2].splice(2,0,['dialogues','▧','المحادثات','Conversations'],['comparisons','⇄','المقارنات','Comparisons']);
const renderBeforeDialogues=render;
render=function(){
 releaseDialoguePlayer();
 releaseComparisonGuide();
 if(!['dialogues','comparisons'].includes(page)){renderBeforeDialogues();return}
 if(route?.running)route.pause();
 nav();
 $('#app').innerHTML=page==='dialogues'?dialoguesPage():comparisonsPage();
 if(page==='comparisons'){
  paintComparisonSelection();
  applyPatternsImageMode();
 }
 if(page==='dialogues')resetDialogueCatalog();
 EP.decorate();
};
Promise.all([pilotReady,dialoguePlanReady]).then(([,plan])=>{
 dialoguePlan=plan;
 if(['dialogues','comparisons'].includes(page))render();
});
render();
