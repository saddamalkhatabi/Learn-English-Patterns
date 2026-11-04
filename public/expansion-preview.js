/* All authored patterns have recorded voices; scenes appear as their atlases arrive. */
let expansionMediaById=new Map(),expansionAudio=null,expansionSequence=null;
const expansionOldFilter=filterCurriculum,expansionOldPage=curriculumPage;
curriculumPage=function(){return expansionOldPage()
 .replace('استكشف جميع الأنماط، وميّز الدروس المتاحة عن المواد التي يجري استكمال صورها وتدريباتها.','اقرأ جميع الأنماط واستمع إلى أمثلتها بصوتين؛ تظهر الصور تباعًا عند إضافتها.')
 .replace('Explore every pattern and distinguish ready lessons from material whose images and exercises are still being prepared.','Read every pattern and hear its examples in two voices; scenes appear as they arrive.')
 .replace('دروس جاهزة','جاهز للاستماع').replace('Ready lessons','Ready to listen')
 .replace('قيد الاستكمال','صور متبقية').replace('In production','Scenes remaining')};
function expansionRows(){const q=epPatternQuery.toLowerCase().trim();return COURSE_CATALOG.patterns.filter(p=>{
 const authored=p.examples?.every(s=>expansionMediaById.has(s.id)),ready=p.lifecycle.published||authored;
 return (!epPatternStatus||(epPatternStatus==='ready'?ready:authored&&p.examples.some(s=>!expansionMediaById.get(s.id)?.image)))
  &&(!epPatternGroup||p.group_ids.includes(epPatternGroup))&&(!q||JSON.stringify(p).toLowerCase().includes(q));
})}
function stopExpansionAudio(){expansionAudio?.pause();expansionSequence=null}
function expansionProgress(){if(!expansionSequence)return;const {id,index,ids}=expansionSequence,host=document.querySelector(`[data-expansion-pattern="${id}"]`);
 if(!host)return;host.querySelectorAll('[data-expansion-id]').forEach((el,i)=>el.classList.toggle('active',i===index));
 const bar=host.querySelector('progress'),label=host.querySelector('[data-expansion-progress]');if(bar)bar.value=index+1;
 if(label)label.textContent=EP.t(`الجملة ${index+1} من ${ids.length} · ${Math.round((index+1)/ids.length*100)}%`,`Sentence ${index+1} of ${ids.length} · ${Math.round((index+1)/ids.length*100)}%`);
}
function playExpansionAt(index){if(!expansionSequence)return;const state=expansionSequence;if(index>=state.ids.length){stopExpansionAudio();return}
 state.index=index;const s=expansionMediaById.get(state.ids[index]),gender=index%2?'female':'male',r=s.recordings[gender];
 expansionAudio?.pause();expansionAudio=new Audio(r.path);expansionAudio.onended=()=>{if(expansionSequence===state)playExpansionAt(index+1)};
 window.EPOffline?.rememberSentences([s]);expansionProgress();
 expansionAudio.play().catch(()=>toast(EP.t('اضغط تشغيل للسماح بالصوت.','Press play to allow audio.')));
}
function playExpansionSequence(id){const host=document.querySelector(`[data-expansion-pattern="${id}"]`);if(!host)return;
 const ids=[...host.querySelectorAll('[data-expansion-id]')].map(el=>el.dataset.expansionId);
 if(!ids.length)return;stopExpansionAudio();expansionSequence={id,index:0,ids};playExpansionAt(0);
}
function playExpansionPreview(id,gender){const s=expansionMediaById.get(id),r=s?.recordings?.[gender];if(!r)return;
 stopExpansionAudio();expansionAudio=new Audio(r.path);window.EPOffline?.rememberSentences([s]);
 expansionAudio.play().catch(()=>toast(EP.t('تعذر تشغيل التسجيل.','Could not play recording.')));
}
function renderExpansionDetail(item,p){const body=item.querySelector('.expansion-detail');if(!body||body.dataset.ready)return;body.dataset.ready='1';
 const published=PILOT?.patterns.some(x=>x.id===p.id),meta=learningMeta(p.id),examples=p.examples.slice(0,12);
 body.innerHTML=`${EP.pair(meta?.explanation_ar||p.explanation_ar,meta?.explanation_en||p.explanation_en||'Study the form and compare the examples below.')}
  ${published?`<div class="buttonrow"><button class="primary" onclick="openLesson(${p.id})">${EP.t('تعلّم النمط','Study this pattern')}</button><button class="secondary" onclick="startSinglePattern(${p.id})">${EP.t('استمع إلى أمثلته','Listen to its examples')}</button></div>`:
  `<p class="lesson-hint">${EP.t('القاعدة والأمثلة والترجمة وصوتا الذكر والأنثى جاهزة. يبدأ الاستماع المتتابع بهذا النمط ويتوقف بعده لتقرأ القاعدة قبل الانتقال. الصورة المستوردة تحتاج مراجعة بصرية قبل اعتمادها النهائي.','The rule, examples, translation and both recorded voices are ready. Sequential listening stops after this pattern so you can read its rule before moving on. Imported scenes await final visual review.')}</p>
   <div class="buttonrow"><button class="primary" type="button" data-start-expansion>${EP.t('▷ استمع إلى 12 جملة بالتتابع','▷ Listen to all 12 in sequence')}</button><button class="secondary" type="button" data-stop-expansion>${EP.t('Ⅱ إيقاف','Ⅱ Pause')}</button></div>
   <div class="ep-player-progress-label" data-expansion-progress>${EP.t('اقرأ القاعدة، ثم ابدأ الاستماع.','Read the rule, then start listening.')}</div><progress class="ep-player-progress" max="12" value="0"></progress>`}
  <div class="imported-examples">${examples.map((example,i)=>{const s=expansionMediaById.get(example.id),image=s?.image;
   return `<div class="expansion-example" ${s?`data-expansion-id="${H(s.id)}"`:''}>${image?`<div class="expansion-media-preview">${pilotScene(s)}</div>`:!published?`<div class="pending-scene">${EP.t('الصورة ستظهر عند إضافتها','Scene appears when added')}</div>`:''}
    <small>${i+1} / 12${image?.status==='imported-unreviewed'?` · ${EP.t('صورة مستوردة','Imported scene')}`:''}</small>
    <b lang="en" dir="ltr">${s?EP.words(s):H(example.en)}</b>${EP.ar(example.ar)}
    ${s?`<div class="audio-controls"><button type="button" data-expansion-voice="male" data-sentence="${H(s.id)}">${EP.t('صوت ذكر','Male voice')} ▷</button><button type="button" data-expansion-voice="female" data-sentence="${H(s.id)}">${EP.t('صوت أنثى','Female voice')} ▷</button></div>`:''}</div>`}).join('')}</div>`;
 body.querySelector('[data-start-expansion]')?.addEventListener('click',()=>playExpansionSequence(p.planned_pattern_id||p.id));
 body.querySelector('[data-stop-expansion]')?.addEventListener('click',stopExpansionAudio);
 body.querySelectorAll('[data-expansion-voice]').forEach(b=>b.addEventListener('click',()=>playExpansionPreview(b.dataset.sentence,b.dataset.expansionVoice)));
 EP.decorate();
}
filterCurriculum=function(){if(!$('#curriculum-list')||!COURSE_CATALOG)return;
 if(!expansionMediaById.size){expansionOldFilter();return}
 stopExpansionAudio();
 const rows=expansionRows(),published=COURSE_CATALOG.patterns.filter(p=>p.lifecycle.published).length;
 $('#curriculum-count').textContent=EP.t(`${rows.length} نمطًا · ${published} درسًا متدرجًا · ${expansionMediaById.size} مثالًا مسجلًا بصوتين`,
  `${rows.length} patterns · ${published} guided lessons · ${expansionMediaById.size} examples with two voices`);
 $('#curriculum-list').dataset.view=epPatternView;
 $('#curriculum-list').innerHTML=rows.map(p=>{const published=p.lifecycle.published,images=p.examples.filter(s=>expansionMediaById.get(s.id)?.image).length,id=p.planned_pattern_id||p.id;
  return `<details class="ep-pattern-item" data-expansion-pattern="${id}"><summary><span class="status-chip ready">${published?EP.t('درس جاهز','Ready lesson'):EP.t('الأمثلة والصوتان جاهزان','Examples and voices ready')}</span><strong class="pattern-form" lang="en" dir="ltr">${H(p.form)}</strong><span>${EP.t(p.title,p.form)}</span>${!published?`<small>${EP.t(`${images}/12 صورة`,`${images}/12 scenes`)}</small>`:''}</summary><div class="expansion-detail"></div></details>`}).join('')||`<div class="empty">${EP.t('لا توجد نتائج بهذه الخيارات.','No results match these filters.')}</div>`;
 $('#curriculum-list').querySelectorAll('details').forEach((item,index)=>item.addEventListener('toggle',()=>{if(item.open)renderExpansionDetail(item,rows[index])}));
 EP.decorate();
};
fetch('expansion-media.json').then(r=>{if(!r.ok)throw Error('media index');return r.json()}).then(d=>{
 expansionMediaById=new Map(d.sentences.map(s=>[s.id,s]));filterCurriculum()
}).catch(()=>{});
window.addEventListener('hashchange',stopExpansionAudio);
