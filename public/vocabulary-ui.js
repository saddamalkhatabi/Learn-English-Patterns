let vocabularyData=null,vocabularyLoad=null,vocabularyPageNumber=0,vocabularyTerm=null,vocabularyAudio=null;
let vocabularyQuery='',vocabularyType='',vocabularyCollection='',vocabularyPattern='',vocabularyVoice='male';
function loadVocabulary(){
 if(!vocabularyLoad)vocabularyLoad=fetch('vocabulary-index.json').then(response=>{
  if(!response.ok)throw Error('vocabulary');
  return response.json();
 }).then(data=>{vocabularyData=data;return data}).catch(()=>{
  vocabularyLoad=null;
  toast(T('تعذّر تحميل أطلس المفردات.','Could not load the vocabulary atlas.'));
  return null;
 });
 return vocabularyLoad;
}
function wordTypeBadge(word){
 const type=EPVocabulary.types[EPVocabulary.posFor(word)]||EPVocabulary.types.X;
 return `<span class="word-type word-type-${type.color}" title="${H(T(type.ar,type.en))}"><b lang="en" dir="ltr">${type.code}</b> ${H(T(type.ar,type.en))}</span>`;
}
function vocabularyPage(){
 return head(T('أطلس المفردات والعبارات','Words & phrases atlas'),
  T('ابحث عن كلمة، وتعرّف نوعها من استعمالها، ثم افتح جملها وصورها ومحادثاتها.','Find a word, see how it is used, then open its sentences, scenes and conversations.'))+
  `<div class="toolbar vocabulary-filters">
   <label>${T('الكلمة أو المعنى','Word or meaning')}<input type="search" value="${H(vocabularyQuery)}" oninput="vocabularyQuery=this.value;resetVocabulary()"></label>
   <label>${T('النوع','Type')}<select onchange="vocabularyType=this.value;resetVocabulary()"><option value="">${T('الكل','All')}</option>
    ${Object.entries(EPVocabulary.types).map(([id,type])=>`<option value="${id}" ${vocabularyType===id?'selected':''}>${type.code} · ${T(type.ar,type.en)}</option>`).join('')}</select></label>
   <label>${T('موضع الاستخدام','Used in')}<select onchange="vocabularyCollection=this.value;resetVocabulary()">
    ${[['','كل المحتوى','All content'],['sentence','الجمل والدروس','Sentences and lessons'],['dialogue','المحادثات','Conversations'],['idea','المشاهد الحرّة','Open scenes']].map(([id,ar,en])=>`<option value="${id}" ${vocabularyCollection===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   <label>${T('النمط','Pattern')}<select onchange="vocabularyPattern=this.value;resetVocabulary()"><option value="">${T('كل الأنماط','All patterns')}</option>
    ${(PILOT?.patterns||[]).map(p=>`<option value="${p.id}" ${vocabularyPattern==p.id?'selected':''}>${H(p.form)}</option>`).join('')}</select></label>
   <label>${T('الصوت','Voice')}<select onchange="vocabularyVoice=this.value"><option value="male" ${vocabularyVoice==='male'?'selected':''}>Adam</option><option value="female" ${vocabularyVoice==='female'?'selected':''}>Bella</option></select></label>
  </div>
  <p class="lesson-hint">${T('قد تكون للكلمة أدوار مختلفة. راجع معناها ونوعها في المثال الظاهر.','A word may have different roles. Check its meaning and type in the example shown.')}</p>
  <section id="vocabulary-detail"></section><p id="vocabulary-count" role="status"></p>
  <div class="vocabulary-grid" id="vocabulary-results"></div>
  <div class="buttonrow"><button class="secondary" id="vocabulary-prev" onclick="vocabularyPageNumber--;paintVocabulary()">${T('السابق','Previous')}</button>
   <button class="secondary" id="vocabulary-next" onclick="vocabularyPageNumber++;paintVocabulary()">${T('التالي','Next')}</button></div>`;
}
function resetVocabulary(){vocabularyPageNumber=0;paintVocabulary()}
function paintVocabulary(){
 const host=$('#vocabulary-results');
 if(!host)return;
 if(!vocabularyData){$('#vocabulary-count').textContent=T('جارٍ تحميل الأطلس…','Loading the atlas…');return}
 const query=EPVocabulary.normalize(vocabularyQuery),size=36;
 const entries=vocabularyData.entries.filter(entry=>
  (!vocabularyType||entry.pos===vocabularyType)&&
  (!vocabularyPattern||entry.patternIds.includes(Number(vocabularyPattern)))&&
  (!query||EPVocabulary.normalize([entry.en,entry.lemma,entry.ar,entry.expansion].join(' ')).includes(query))&&
  (!vocabularyCollection||entry.sourceIds.some(id=>vocabularyData.sources[id].type.startsWith(vocabularyCollection)))
 ).sort((a,b)=>b.sourceIds.length-a.sourceIds.length||a.en.localeCompare(b.en));
 const pages=Math.max(1,Math.ceil(entries.length/size));
 vocabularyPageNumber=Math.max(0,Math.min(vocabularyPageNumber,pages-1));
 $('#vocabulary-count').textContent=T(`${entries.length} مدخلًا · صفحة ${vocabularyPageNumber+1} من ${pages}`,`${entries.length} entries · page ${vocabularyPageNumber+1} of ${pages}`);
 $('#vocabulary-prev').disabled=vocabularyPageNumber===0;$('#vocabulary-next').disabled=vocabularyPageNumber+1>=pages;
 host.innerHTML=entries.slice(vocabularyPageNumber*size,(vocabularyPageNumber+1)*size).map(entry=>
  `<article class="panel vocabulary-card">${wordTypeBadge(entry)}<button class="textlink" lang="en" dir="ltr" onclick="openVocabularyTerm('${entry.id}')">${H(entry.en)}</button>
   ${EP.ar(entry.ar)}<small>${entry.sourceIds.length} ${T('مواضع استخدام','uses')} · ${entry.sceneIds.length} ${T('صور','scenes')}</small>
   <button class="secondary" onclick="playVocabularyEntry('${entry.id}')" aria-label="${T('انطق','Hear')} ${H(entry.en)}">▶</button></article>`
 ).join('');
}
function openVocabularyTerm(id){
 vocabularyTerm=id;
 const entry=vocabularyData?.entries.find(entry=>entry.id===id),host=$('#vocabulary-detail');
 if(!entry||!host)return;
 const uses=entry.sourceIds.map(index=>vocabularyData.sources[index]);
 const unique=uses.filter((source,index)=>uses.findIndex(other=>other.en===source.en)===index);
 host.innerHTML=`<article class="panel vocabulary-selected"><div class="buttonrow"><h2 lang="en" dir="ltr">${H(entry.en)}</h2>${wordTypeBadge(entry)}
   <button class="secondary" onclick="playVocabularyEntry('${entry.id}')">▶ ${T('استمع','Listen')}</button></div>
   ${EP.ar(entry.ar)}${entry.expansion?`<p lang="en" dir="ltr">${H(entry.expansion)}</p>`:''}
   ${vocabularySceneLinks(entry)}
   <h3>${T('شاهدها في سياق','See it in context')}</h3>
   ${unique.slice(0,8).map(source=>{
    const index=vocabularyData.sources.indexOf(source);
    return `<div class="vocabulary-use"><p lang="en" dir="ltr">${vocabularyMarked(source.en,entry.en)}</p>${EP.ar(source.ar)}
     <button class="textlink" onclick="openVocabularyUse(${index})">${source.type==='dialogue'?T('افتح المحادثة عند هذا الدور','Open this conversation turn'):source.type.startsWith('idea')?T('افتح المشهد','Open scene'):T('افتح الجملة وصورتها','Open sentence and scene')} ↗</button></div>`;
   }).join('')}
   <details><summary>${T('كل مواضع الاستخدام','All uses')} · ${uses.length}</summary>${uses.map(source=>
    `<button class="textlink vocabulary-source-link" onclick="openVocabularyUse(${vocabularyData.sources.indexOf(source)})">${H(source.en)}</button>`
   ).join('')}</details></article>`;
 host.scrollIntoView({block:'start'});
}
function vocabularySceneLinks(entry){
 const uses=new Map();
 for(const index of entry.sourceIds){
  const source=vocabularyData.sources[index];
  for(const id of source.sceneIds)if(!uses.has(id))uses.set(id,{source,index});
 }
 const cards=[...uses].map(([,use])=>{
  const source=use.source;let photo='';
  if(source.type==='dialogue'){
   const dialogue=PILOT?.dialogues.find(d=>d.id===source.id);
   if(dialogue)photo=dialogueVisual(dialogue,source.turn);
  }else if(source.type.startsWith('idea')){
   const scene=ideaLibrary?.scenes.find(scene=>scene.id===source.id);
   if(scene)photo=ideaPicture(scene);
  }else photo=pilotScene(dialogueScene(source.id));
  return photo?`<button class="vocabulary-scene-card" onclick="openVocabularyUse(${use.index})">${photo}<small>${H(source.title||source.en)}</small></button>`:'';
 }).filter(Boolean);
 return cards.length?`<details class="vocabulary-scenes"><summary>${T('الصور المرتبطة','Linked scenes')} · ${cards.length}</summary><div class="vocabulary-scene-links">${cards.join('')}</div></details>`:'';
}
function vocabularyMarked(text,term){
 const wanted=EPVocabulary.tokens(term).map(EPVocabulary.normalize),words=text.split(/(\s+)/);
 const tokens=EPVocabulary.tokens(text).map(EPVocabulary.normalize),positions=new Set();
 tokens.forEach((_,i)=>{if(wanted.every((word,j)=>tokens[i+j]===word))wanted.forEach((_,j)=>positions.add(i+j))});
 let index=0;
 return words.map(word=>{
  const count=EPVocabulary.tokens(word).length,selected=Array.from({length:count},(_,i)=>index+i).some(i=>positions.has(i));index+=count;
  return selected?`<mark>${H(word)}</mark>`:H(word);
 }).join('');
}
async function openVocabularyUse(index){
 const source=vocabularyData?.sources[index];if(!source)return;
 if(source.type==='dialogue'){
  await Promise.all([pilotReady,dialogueArchiveReady]);navigate('dialogues');
  // The route renderer runs on hashchange.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   openDialogue(source.id,false,'dialogue-player',true);
   const audio=$('#dialogue-player audio'),turn=PILOT.dialogues.find(d=>d.id===source.id)?.audio?.turns[source.turn];
   if(audio&&turn){audio.currentTime=turn.start_ms/1000;playDialogueMedia(audio)}
  }));
 }else if(source.type.startsWith('idea')){
  await ideaLibraryReady;navigate('lab');
  requestAnimationFrame(()=>chooseIdeaScene(source.id));
 }else{
  await Promise.all([pilotReady,archiveReady]);openSmartSentence(source.id);
 }
}
function vocabularyAudioFor(text,voice){
 const normal=EPVocabulary.normalize(text);
 return vocabularyData?.entries.find(entry=>EPVocabulary.normalize(entry.en)===normal&&entry.audio[voice])?.audio[voice];
}
function playVocabularyClip(clip){
 const audio=new Audio(clip.path);let finish,frame,timer,stopped=false;
 const done=new Promise(resolve=>{finish=resolve});
 const end=ok=>{if(stopped)return;stopped=true;clearTimeout(timer);cancelAnimationFrame(frame);audio.pause();finish(ok)};
 audio.playbackRate=state.rate||1;
 audio.onloadedmetadata=()=>{if(clip.start_ms!=null)audio.currentTime=clip.start_ms/1000};
 audio.onplaying=()=>{
  if(clip.end_ms==null)return;
  clearTimeout(timer);cancelAnimationFrame(frame);
  const tick=()=>{if(stopped)return;if(audio.currentTime*1000>=clip.end_ms){end(true);return}frame=requestAnimationFrame(tick)};
  tick();
  timer=setTimeout(()=>end(true),Math.max(20,(clip.end_ms-audio.currentTime*1000)/audio.playbackRate));
 };
 audio.onended=()=>end(true);audio.onerror=()=>end(false);audio.play().catch(()=>end(false));
 return {done,stop:()=>end(false)};
}
function playVocabularyEntry(id){
 const entry=vocabularyData?.entries.find(entry=>entry.id===id),clip=entry?.audio[vocabularyVoice];
 if(!entry)return;
 stopSpeech();vocabularyAudio?.stop();
 if(!clip){speak(entry.en);return}
 vocabularyAudio=playVocabularyClip(clip);
}
labels.vocabulary='أطلس المفردات والعبارات';
const renderBeforeVocabulary=render;
render=function(){
 vocabularyAudio?.stop();
 if(page!=='vocabulary'){renderBeforeVocabulary();return}
 stopSpeech();nav();$('#app').innerHTML=vocabularyPage();paintVocabulary();
 loadVocabulary().then(()=>{if(page==='vocabulary'){paintVocabulary();if(vocabularyTerm)openVocabularyTerm(vocabularyTerm)}});
};
const stopBeforeVocabulary=stopSpeech;
stopSpeech=function(){vocabularyAudio?.stop();stopBeforeVocabulary()};
if(location.hash==='#vocabulary'){page='vocabulary';render()}
