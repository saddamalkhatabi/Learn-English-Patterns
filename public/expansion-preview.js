/* Imported, reviewed scenes appear in their catalog rows after the normal build. */
let expansionMediaById=new Map(),expansionPreviewAudio=null;
function playExpansionPreview(id,gender){const s=expansionMediaById.get(id),r=s?.recordings?.[gender];if(!r)return;expansionPreviewAudio?.pause();expansionPreviewAudio=new Audio(r.path);window.EPOffline?.rememberSentences([s]);expansionPreviewAudio.play().catch(()=>toast(EP.t('تعذر تشغيل التسجيل.','Could not play recording.')))}
function decorateExpansionMedia(){
 if(page!=='curriculum'||!COURSE_CATALOG)return;
 const q=epPatternQuery.toLowerCase().trim();
 const rows=COURSE_CATALOG.patterns.filter(p=>(!epPatternStatus||(epPatternStatus==='ready')===Boolean(p.lifecycle.published))&&(!epPatternGroup||p.group_ids.includes(epPatternGroup))&&(!q||JSON.stringify(p).toLowerCase().includes(q)));
 document.querySelectorAll('#curriculum-list .ep-pattern-item').forEach((item,index)=>{
  const p=rows[index];if(!p)return;
  item.querySelectorAll('.imported-examples>div').forEach((el,i)=>{
   const s=expansionMediaById.get(p.examples[i]?.id);if(!s||el.querySelector('.expansion-media-preview'))return;
   const text=el.querySelector('b[lang="en"]');if(text)text.innerHTML=EP.words(s);
   el.insertAdjacentHTML('afterbegin',`<div class="expansion-media-preview">${pilotScene(s)}<div class="audio-controls"><button type="button" data-expansion-voice="male">${EP.t('صوت ذكر','Male voice')} ▷</button><button type="button" data-expansion-voice="female">${EP.t('صوت أنثى','Female voice')} ▷</button></div></div>`);
   el.querySelectorAll('[data-expansion-voice]').forEach(button=>button.addEventListener('click',()=>playExpansionPreview(s.id,button.dataset.expansionVoice)));
  });
  if(p.examples.length===12&&p.examples.every(s=>expansionMediaById.has(s.id))){const hint=item.querySelector(':scope>.lesson-hint');if(hint)hint.textContent=EP.t('وسائط الأمثلة مكتملة؛ نشر الدرس ينتظر دمج التدريبات وفحصها.','Example media are complete; lesson publication awaits exercise integration and checks.');}
 });
}
const filterBeforeExpansionPreview=filterCurriculum;filterCurriculum=function(){filterBeforeExpansionPreview();decorateExpansionMedia()};
fetch('expansion-media.json').then(r=>{if(!r.ok)throw Error('media index');return r.json()}).then(d=>{expansionMediaById=new Map(d.sentences.map(s=>[s.id,s]));decorateExpansionMedia()}).catch(()=>{});
window.addEventListener('hashchange',()=>expansionPreviewAudio?.pause());
