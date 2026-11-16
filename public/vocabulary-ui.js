let vocabularyData=null,vocabularyLoad=null,vocabularyPageNumber=0,vocabularyTerm=null,vocabularyAudio=null;
let vocabularyQuery='',vocabularyType='',vocabularyCollection='',vocabularyPattern='',vocabularyLevel='',vocabularyVoice='male',vocabularyRegional='';
let vocabularyEntriesByKey=new Map(),vocabularySearch=new Map(),vocabularyPreferredScene='';
function loadVocabulary(){
 if(!vocabularyLoad)vocabularyLoad=fetch('vocabulary-index.json').then(response=>{
  if(!response.ok)throw Error('vocabulary');
  return response.json();
 }).then(data=>{
  vocabularyData=data;
  vocabularyAllEntries=[...(data.regional||[]),...data.entries];
  vocabularyById=new Map(vocabularyAllEntries.map(entry=>[entry.id,entry]));
  vocabularyEntriesByKey=new Map(data.entries.map(entry=>[vocabularyKey(entry.en,entry.pos),entry]));
  vocabularyRegionalByKey=new Map((data.regional||[]).map(entry=>[entry.family+'|'+EPVocabulary.normalize(entry.en),entry]));
  vocabularySearch=new Map(vocabularyAllEntries.map(entry=>{
   const translations=new Set([entry.ar]);
   for(const index of entry.sourceIds){
    const source=data.sources[index];
    if(source.type==='idea-word'&&EPVocabulary.normalize(source.en)===EPVocabulary.normalize(entry.en)&&
     (!source.pos||source.pos===entry.pos))translations.add(source.ar);
   }
   return [entry.id,normalizeSceneQuery(EPVocabulary.normalize([entry.en,entry.uk,entry.lemma,entry.expansion,...translations].join(' ')))];
  }));
  return data;
 }).catch(()=>{
  vocabularyLoad=null;
  toast(T('تعذّر تحميل أطلس المفردات.','Could not load the vocabulary atlas.'));
  return null;
 });
 return vocabularyLoad;
}
function vocabularyKey(en,pos){return EPVocabulary.normalize(en)+'|'+pos}
let vocabularyAllEntries=[],vocabularyById=new Map(),vocabularyRegionalByKey=new Map();
function vocabularyEntryFor(word){
 const usage=EPEnglish.analyze(word.en,{...word,pos:EPVocabulary.posFor(word)});
 const change=usage.changes.find(change=>EPVocabulary.normalize(change.us)===EPVocabulary.normalize(usage.us));
 return (change&&vocabularyRegionalByKey.get(change.id+'|'+EPVocabulary.normalize(change.us)))||
  vocabularyEntriesByKey.get(vocabularyKey(word.en,EPVocabulary.posFor(word)));
}
function vocabularyEntryName(entry){return EP.prefs.englishUsage==='uk'&&entry.uk?entry.uk:entry.en}
function vocabularyUsageTags(entry){
 if(entry.uk)return `<span class="english-regional-tag" dir="ltr" lang="en">US · ${H(entry.en)} / UK · ${H(entry.uk)}</span>`;
 return entry.shared?`<span class="english-regional-tag">${T('US/UK · مشترك','US/UK · Shared')}</span>`:'';
}
function matchesVocabularyRegional(entry){
 if(!vocabularyRegional)return true;
 if(vocabularyRegional==='shared')return Boolean(entry.shared);
 return vocabularyRegional==='differences'?Boolean(entry.uk):entry.kind===vocabularyRegional;
}
function openVocabularyFromScene(id,sceneId=''){
 return openLinkedLearning('atlas',id,{scene:sceneId});
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
    ${[['','كل المحتوى','All content'],['sentence','الجمل والدروس','Sentences and lessons'],['dialogue','المحادثات','Conversations'],['idea','مفردات المشاهد','Scene vocabulary']].map(([id,ar,en])=>`<option value="${id}" ${vocabularyCollection===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   <label>${T('النمط','Pattern')}<select onchange="vocabularyPattern=this.value;resetVocabulary()"><option value="">${T('كل الأنماط','All patterns')}</option>
    ${(PILOT?.patterns||[]).map(p=>`<option value="${p.id}" ${vocabularyPattern==p.id?'selected':''}>${H(p.form)}</option>`).join('')}</select></label>
   <label>${T('مستوى التعلّم','Learning level')}<select onchange="vocabularyLevel=this.value;resetVocabulary()">${learningLevelOptions(vocabularyLevel)}</select></label>
   <label>${T('الاستعمال الأمريكي والبريطاني','American and British usage')}<select id="vocabulary-regional" onchange="vocabularyRegional=this.value;resetVocabulary()">
    ${[['','كل المداخل','All entries'],['differences','أبرز الاختلافات','Regional differences'],['vocabulary','اختلاف المفردات','Vocabulary differences'],
      ['spelling','اختلاف التهجئة','Spelling differences'],['construction','اختلاف التعبير','Usage and construction'],
      ['shared','عبارات مشتركة','Shared expressions']].map(([id,ar,en])=>
     `<option value="${id}" ${vocabularyRegional===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   <label>${T('الصوت','Voice')}<select onchange="vocabularyVoice=this.value"><option value="male" ${vocabularyVoice==='male'?'selected':''}>Adam</option><option value="female" ${vocabularyVoice==='female'?'selected':''}>Bella</option></select></label>
  </div>
  <p class="lesson-hint">${T('قد تكون للكلمة أدوار مختلفة. راجع معناها ونوعها في المثال الظاهر.','A word may have different roles. Check its meaning and type in the example shown.')}</p>
  <section id="vocabulary-detail"></section><p id="vocabulary-count" role="status"></p>
  <div class="vocabulary-grid" id="vocabulary-results"></div>
  <div class="buttonrow"><button class="secondary" id="vocabulary-prev" onclick="vocabularyPageNumber--;paintVocabulary()">${T('السابق','Previous')}</button>
   <button class="secondary" id="vocabulary-next" onclick="vocabularyPageNumber++;paintVocabulary()">${T('التالي','Next')}</button></div>`;
}
function resetVocabulary(){
 vocabularyPageNumber=0;paintVocabulary();
 if(vocabularyTerm)openVocabularyTerm(vocabularyTerm,vocabularyPreferredScene,false);
}
function vocabularyMatchesSource(source){
 return (!vocabularyCollection||source.type.startsWith(vocabularyCollection))&&
  (!vocabularyLevel||source.level===vocabularyLevel)&&
  (!vocabularyPattern||source.patternIds.includes(Number(vocabularyPattern)));
}
function paintVocabulary(){
 const host=$('#vocabulary-results');
 if(!host)return;
 if(!vocabularyData){$('#vocabulary-count').textContent=T('جارٍ تحميل الأطلس…','Loading the atlas…');return}
 const query=normalizeSceneQuery(EPVocabulary.normalize(vocabularyQuery)),size=36;
 const entries=vocabularyAllEntries.filter(entry=>
  matchesVocabularyRegional(entry)&&
  (!vocabularyType||entry.pos===vocabularyType)&&
  (!vocabularyPattern||entry.patternIds.includes(Number(vocabularyPattern)))&&
  (!query||vocabularySearch.get(entry.id).includes(query))&&
  (!(vocabularyCollection||vocabularyLevel||vocabularyPattern)||entry.sourceIds.some(id=>vocabularyMatchesSource(vocabularyData.sources[id])))
 ).sort((a,b)=>(query?Number(Boolean(b.uk))-Number(Boolean(a.uk)):0)||b.sourceIds.length-a.sourceIds.length||a.en.localeCompare(b.en));
 const pages=Math.max(1,Math.ceil(entries.length/size));
 vocabularyPageNumber=Math.max(0,Math.min(vocabularyPageNumber,pages-1));
 $('#vocabulary-count').textContent=T(`${entries.length} مدخلًا · صفحة ${vocabularyPageNumber+1} من ${pages}`,`${entries.length} entries · page ${vocabularyPageNumber+1} of ${pages}`);
 $('#vocabulary-prev').disabled=vocabularyPageNumber===0;$('#vocabulary-next').disabled=vocabularyPageNumber+1>=pages;
 host.innerHTML=entries.slice(vocabularyPageNumber*size,(vocabularyPageNumber+1)*size).map(entry=>
  `<article class="panel vocabulary-card">${wordTypeBadge(entry)}<button class="textlink" lang="en" dir="ltr" onclick="openVocabularyTerm('${entry.id}','')">${H(vocabularyEntryName(entry))}</button>
   ${EP.ar(entry.ar)}${vocabularyUsageTags(entry)}<small>${entry.sourceIds.length} ${T('مواضع استخدام','uses')} · ${entry.sceneIds.length} ${T('صور','scenes')}</small>
   <button class="secondary" onclick="playVocabularyEntry('${entry.id}')" aria-label="${T('انطق','Hear')} ${H(entry.en)}">▶</button></article>`
 ).join('');
}
function openVocabularyTerm(id,preferredScene=vocabularyPreferredScene,scroll=true){
 vocabularyTerm=id;vocabularyPreferredScene=preferredScene;
 const entry=vocabularyById.get(id),host=$('#vocabulary-detail');
 if(!entry||!host)return;
 const uses=entry.sourceIds.map(index=>({index,source:vocabularyData.sources[index]})).filter(({source})=>vocabularyMatchesSource(source));
 if(!uses.length){host.replaceChildren();return}
 if(preferredScene)uses.sort((a,b)=>Number(b.source.id===preferredScene&&b.source.type==='idea-word')-
  Number(a.source.id===preferredScene&&a.source.type==='idea-word'));
 const byExample=new Map();
 for(const use of uses){
  const {source}=use,key=source.en+'|'+source.ar;
  if(!byExample.has(key))byExample.set(key,use);
 }
 host.innerHTML=`<article class="panel vocabulary-selected"><div class="buttonrow"><h2 lang="en" dir="ltr">${H(vocabularyEntryName(entry))}</h2>${wordTypeBadge(entry)}
   <button class="secondary" onclick="playVocabularyEntry('${entry.id}')">▶ ${T('استمع','Listen')}</button></div>
   ${EP.ar(entry.ar)}${vocabularyUsageTags(entry)}${entry.uk?englishUsageButton(EPEnglish.analyze(entry.en,entry)):''}${entry.expansion?`<p lang="en" dir="ltr">${H(entry.expansion)}</p>`:''}
   ${vocabularySceneLinks(uses)}
   <h3>${T('شاهدها في سياق','See it in context')}</h3>
   ${[...byExample.values()].slice(0,8).map(({source,index})=>{
    return `<div class="vocabulary-use"><p lang="en" dir="ltr">${vocabularyMarked(englishDisplay(source.en,source),vocabularyEntryName(entry))}${englishUsageButton(EPEnglish.analyze(source.en,source))}</p>${EP.ar(source.ar)}
     <small>${learningLevelLabel(source.level||'')}</small> <button class="textlink" onclick="openVocabularyUse(${index})">${source.type==='dialogue'?T('افتح المحادثة عند هذا الدور','Open this conversation turn'):source.type.startsWith('idea-guide')?T('افتح تدريب المشهد','Open scene practice'):source.type.startsWith('idea')?T('افتح المشهد','Open scene'):T('افتح الجملة وصورتها','Open sentence and scene')} ↗</button></div>`;
   }).join('')}
   <details><summary>${T('كل مواضع الاستخدام','All uses')} · ${uses.length}</summary>${uses.map(({source,index})=>
    `<button class="textlink vocabulary-source-link" onclick="openVocabularyUse(${index})">${H(englishDisplay(source.en,source))}${source.type==='idea-word'?` <span class="ar-content" lang="ar" dir="rtl">${H(source.ar)}</span>`:''}</button>`
   ).join('')}</details></article>`;
 if(scroll)host.scrollIntoView({block:'start'});
}
function vocabularySceneLinks(examples){
 const uses=new Map();
 for(const {index,source} of examples){
  for(const id of source.sceneIds)if(!uses.has(id))uses.set(id,{source,index});
 }
 const cards=[...uses].map(([id,use])=>{
  const source=use.source;let photo='';
  if(source.type==='dialogue'){
   const dialogue=PILOT?.dialogues.find(d=>d.id===source.id);
   if(dialogue)photo=dialogueVisual(dialogue,source.turn);
  }else if(source.type.startsWith('idea')){
   const scene=ideaLibrary?.scenes.find(scene=>scene.id===source.id);
   if(scene)photo=ideaPicture(scene);
  }else photo=pilotScene(dialogueScene(source.id));
  const open=!source.type.startsWith('idea-guide')&&dialogueSceneLocations.has(id)?`openLinkedLearning('photo','${H(id)}')`:`openVocabularyUse(${use.index})`;
  return photo?`<button class="vocabulary-scene-card" onclick="${open}">${photo}<small>${H(source.title||source.en)}</small></button>`:'';
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
function openVocabularyUse(index){
 const source=vocabularyData?.sources[index];if(!source)return;
 if(source.type==='dialogue'){
  return openLinkedLearning('dialogue',source.id,{turn:source.turn});
 }else if(source.type.startsWith('idea-guide')){
  return openSceneAssistantGuide(source.id,source.step);
 }else if(source.type.startsWith('idea')){
  return openLinkedLearning(dialogueSceneLocations.has(source.id)?'photo':'scene',source.id);
 }else{
  return openLinkedLearning('photo',source.id);
 }
}
function vocabularyAudioFor(text,voice){
 const normal=EPVocabulary.normalize(text);
 return vocabularyAllEntries.find(entry=>EPVocabulary.normalize(entry.en)===normal&&entry.audio[voice])?.audio[voice];
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
 const entry=vocabularyById.get(id);
 if(!entry)return;
 const text=vocabularyEntryName(entry);
 const clip=EPEnglish.sameSpeech(entry.en,text)?entry.audio[vocabularyVoice]:null;
 stopSpeech();vocabularyAudio?.stop();
 if(!clip){speak(text,vocabularyVoice==='male'?0:1);return}
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
