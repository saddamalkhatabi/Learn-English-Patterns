let epReferenceMini=false;
try{epReferenceMini=localStorage.getItem('patterns-reference-mini')==='1'}catch{}
function toggleReferenceMini(){epReferenceMini=!epReferenceMini;try{localStorage.setItem('patterns-reference-mini',epReferenceMini?'1':'0')}catch{}paintReferencePlayer()}
const referenceGuides=new WeakMap();
function referenceGuide(sentence,text=sentence.en){
 if(!referenceGuides.has(sentence))referenceGuides.set(sentence,new Map());
 const byText=referenceGuides.get(sentence);
 if(!byText.has(text))byText.set(text,EPTeaching.describeReference(sentence,text));
 return byText.get(text);
}
function referenceWords(s,attribute=''){
 return EP.words(s,attribute,true,text=>referenceGuide(s,text).highlight);
}
function referenceAnnotations(s){
 const guide=referenceGuide(s);
 const grammar=referenceTaxonomy('grammar').find(item=>item.id===guide.construction);
 const topics=s.domains.filter(id=>id!=='everyday').slice(0,2)
  .map(id=>referenceTaxonomy('domains').find(item=>item.id===id)).filter(Boolean);
 const tags=[grammar?epFacet('grammar',grammar):'',...topics.map(topic=>epFacet('domains',topic))].filter(Boolean);
 return `
  <p class="reference-translation ar-content" lang="ar" dir="rtl">${H(s.ar)}</p>
  <ul class="reference-tags" aria-label="${T('غرض الجملة وتصنيفاتها','Sentence purpose and categories')}">
   <li class="reference-purpose-tag">${EP.prefs.arabic?`<bdi lang="ar">${H(guide.purpose_ar)}</bdi>`:''}<bdi lang="en">${H(guide.purpose_en)}</bdi></li>
   ${tags.map(tag=>`<li>${H(tag)}</li>`).join('')}</ul>
  ${guide.keywords.length?`<div class="reference-keywords"><b>${T('الكلمات المفتاحية','Keywords')}</b>
   <ul dir="ltr" lang="en">${guide.keywords.map(word=>`<li>${H(englishDisplay(word,s))}</li>`).join('')}</ul></div>`:''}`;
}
function referenceRule(s){
 const guide=referenceGuide(s,englishDisplay(s.en,s));
 if(!guide.form)return '';
 return `<details class="reference-rule" data-reference-study="${H(s.id)}" ontoggle="if(this.open)openReferenceStudy(this)">
  <summary>${T('بناء الجملة','Sentence structure')} <b class="pattern-form" dir="ltr" lang="en">${H(guide.form)}</b></summary>
  ${EP.pair(guide.rule_ar,guide.rule_en)}<div class="reference-study-content"></div></details>`;
}
const referenceDefaults={query:'',grammar:'',domain:'',purpose:'',level:'',sort:'source',view:'cards',size:24,section:'sentences',patternScope:'',patternLevel:''};
let epReference={...referenceDefaults};
try{
 const saved=JSON.parse(localStorage.getItem('patterns-reference-view')||'{}');
 for(const key of Object.keys(referenceDefaults))if(Object.hasOwn(saved,key))epReference[key]=saved[key];
}catch{}
function epReferenceSet(key,value,paint=true){epReference[key]=key==='size'?Number(value):value;referencePage=0;try{localStorage.setItem('patterns-reference-view',JSON.stringify(epReference))}catch{}if(paint)renderReferenceRows()}
function epReferenceReset(){epReference={...referenceDefaults,section:epReference.section};epReferenceSet('query','',false);render()}
const epFacetEnglish={learning:'Learning & languages',work:'Work & careers',food:'Food & dining',travel:'Travel & transport',family:'Family & relationships',home:'Home & daily life',health:'Health & feelings',money:'Money & shopping',leisure:'Hobbies & leisure',nature:'Nature & weather',technology:'Technology',community:'Places & community',everyday:'Everyday situations'};
const referenceGrammarEnglish={
 accustomed:'Being accustomed', 'past-habit':'Past habit','lack-necessity':'Lack of necessity','polite-request':'Polite request or permission',
 'offer-invitation':'Offer or invitation','reported-question':'Reported question','reported-command':'Request or intention with an object',
 'indirect-question':'Embedded question','wh-question':'Information question','yes-no-question':'Yes/no question',
 suggestion:'Suggestion','permission-let':'Permission and offers',wish:'Wish',concession:'Concession',condition:'Condition or precaution',
 'correlative-comparison':'Linked comparatives',superlative:'Superlative',comparison:'Comparison',quantity:'Quantity',existence:'Existence',
 demonstrative:'Demonstrative',cleft:'Focus construction','relative-clause':'Relative clause',causative:'Causative',perception:'Perception and impressions',
 obligation:'Obligation and advice',ability:'Ability',possibility:'Possibility',passive:'Passive','perfect-continuous':'Perfect continuous',
 perfect:'Perfect','future-intention':'Future and intention',gerund:'-ing form',infinitive:'Infinitive with to','habit-frequency':'Habit and frequency',
 'time-connection':'Time connector','reason-result':'Reason and result',discourse:'Discourse phrase',possession:'Possession',
 negation:'Negation',description:'Description',imperative:'Imperative',statement:'Statement'
};
function referenceTaxonomy(type){
 const items=REFERENCE_CORPUS.taxonomy[type];
 return type==='grammar'?[...items,{id:'offer-invitation',ar:'عرض أو دعوة',form:'Would you like …?'}]:items;
}
function epFacet(type,item){
 const en=type==='grammar'?referenceGrammarEnglish[item.id]||item.form:EPTeaching.purposes[item.id]?.[1]||epFacetEnglish[item.id]||item.id;
 return T(item.ar,en);
}
function epReferenceSelect(type,key,ar,en){return `<label>${T(ar,en)}<select aria-label="${T(ar,en)}" onchange="epReferenceSet('${key}',this.value)"><option value="">${T('الكل','All')}</option>${referenceTaxonomy(type).map(x=>`<option value="${x.id}" ${epReference[key]===x.id?'selected':''}>${H(epFacet(type,x))}</option>`).join('')}</select></label>`}
function referenceLibraryTabs(){
 const patternMode=epReference.section==='patterns';
 return `<div class="reference-library-options">
  <nav class="buttonrow" aria-label="${T('أقسام مكتبة الألف جملة','Sentence library sections')}">
   <button class="secondary" type="button" data-reference-section="sentences" aria-pressed="${!patternMode}" onclick="setReferenceSection(this)">${T('الجمل المرجعية','Reference sentences')}</button>
   <button class="secondary" type="button" data-reference-section="patterns" aria-pressed="${patternMode}" onclick="setReferenceSection(this)">${T('الأنماط الـ180','180 patterns')}</button>
  </nav>
  <label class="setting-toggle"><input id="reference-guided-setting" type="checkbox" ${EP.prefs.referenceGuided?'checked':''}
   onchange="EP.set('referenceGuided',this.checked);$('#reference-guided-setting')?.focus({preventScroll:true})">
   ${T('استخدم الشرح مع أمثلة إضافية عند الاستماع دائمًا','Always use explanations with additional examples when listening')}</label>
 </div>`;
}
function setReferenceSection(button){
 const section=button.dataset.referenceSection;
 if(epReference.section===section)return;
 epReferenceSet('section',section,false);
 render();
 $(`[data-reference-section="${section}"]`)?.focus({preventScroll:true});
}
function referencePatternFilters(){
 return `<label>${T('مجموعة الأنماط','Pattern collection')}<select onchange="epReferenceSet('patternScope',this.value)">
  <option value="">${T('الأنماط الـ180 كلها','All 180 patterns')}</option>
  <option value="foundation" ${epReference.patternScope==='foundation'?'selected':''}>${T('★ الأنماط التأسيسية','★ Foundation patterns')}</option>
 </select></label>
 <label>${T('مستوى التعلّم','Learning level')}<select onchange="epReferenceSet('patternLevel',this.value)">${learningLevelOptions(epReference.patternLevel)}</select></label>`;
}
function referenceSentenceFilters(){
 return `${epReferenceSelect('grammar','grammar','البناء','Structure')}${epReferenceSelect('domains','domain','الموقف','Situation')}${epReferenceSelect('purposes','purpose','الغرض','Purpose')}
  <label>${T('المستوى التقريبي','Approximate level')}<select onchange="epReferenceSet('level',this.value)">
   <option value="">${T('الكل','All')}</option>${['A1–A2','A2–B1','B1–B2'].map(x=>`<option ${epReference.level===x?'selected':''}>${x}</option>`).join('')}
  </select></label>`;
}
referencePageHTML=function(){
 if(!REFERENCE_CORPUS)return head(T('مكتبة الألف جملة','1,000-sentence library'),T('جارٍ التحميل…','Loading…'));
 const patternMode=epReference.section==='patterns';
 const sortOptions=[['source','ترتيب المصدر','Source order'],['az','أبجدي إنجليزي','English A–Z'],['level','المستوى','Level'],['grammar','البناء','Structure']];
 return `${head(T('ابحث عن المعنى. واسمع البناء.','Find the meaning. Hear the structure.'),
  T('استمع إلى الجمل المرجعية أو تعلّم الأنماط بالصور والصوت.','Listen to reference sentences or study patterns with photos and audio.'),'1,000 SENTENCES · REAL CONNECTIONS')}
  ${epSectionLinks(['scene-studio'])}${referenceLibraryTabs()}
  ${patternMode?'':`<div class="reference-summary"><span><b>1000</b> ${T('جملة','sentences')}</span><span><b>2000</b> ${T('تسجيل','recordings')}</span><span><b>${REFERENCE_CORPUS.counts.scenes}</b> ${T('مشهدًا متاحًا','available scenes')}</span><span><b>${referenceTaxonomy('grammar').length}</b> ${T('تصنيفًا للبناء','structure categories')}</span></div>`}
  <section class="panel reference-filters"><label>${T('ابحث بالعبارة أو المعنى','Search a phrase or meaning')}
   <input id="reference-search" class="search" value="${H(epReference.query)}" placeholder="${T('جملة، كلمة، معنى عربي أو قاعدة…','A sentence, word, Arabic meaning or structure…')}" oninput="epReferenceSet('query',this.value)"></label>
   ${patternMode?referencePatternFilters():referenceSentenceFilters()}</section>
  <div class="reference-results-head"><p id="reference-count" role="status"></p>
   ${patternMode||EP.prefs.referenceGuided?'':`<button class="secondary" onclick="resumeReference()">${T('استكمل موضعك','Resume listening')}</button>`}
   <button id="reference-play-results" class="primary" onclick="playReferenceResults()">▷ ${patternMode?T('استمع إلى الأنماط المعروضة','Listen to these patterns'):T('استماع متتابع للنتائج','Listen to these results')}</button></div>
  <div class="reference-toolbar" id="reference-view-options"><label>${T('الترتيب','Sort')}
   <select aria-label="${T('ترتيب النتائج','Result order')}" onchange="epReferenceSet('sort',this.value)">
    ${sortOptions.map(([v,ar,en])=>`<option value="${v}" ${epReference.sort===v?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   <label>${T('العرض','View')}<select aria-label="${T('طريقة عرض النتائج','Result layout')}" onchange="epReferenceSet('view',this.value)">
    ${[['cards','بطاقات','Cards'],['rows','صفوف','Rows'],['compact','قائمة مختصرة','Compact list']].map(([v,ar,en])=>`<option value="${v}" ${epReference.view===v?'selected':''}>${T(ar,en)}</option>`).join('')}
   </select></label>
   <label>${T('في الصفحة','Per page')}<select aria-label="${T('عدد النتائج في الصفحة','Results per page')}" onchange="epReferenceSet('size',this.value)">
    ${[12,24,48,100].map(n=>`<option ${epReference.size===n?'selected':''}>${n}</option>`).join('')}</select></label>
   <button class="filter-reset" onclick="epReferenceReset()">${T('مسح الفلاتر','Reset filters')}</button>${patternsImageControls()}</div>
  <div id="reference-results" class="reference-grid"></div><div class="pagination">
   <button id="reference-prev" class="secondary" onclick="changeReferencePage(-1)">${T('السابق','Previous')}</button>
   <span id="reference-pages"></span><button id="reference-next" class="secondary" onclick="changeReferencePage(1)">${T('التالي','Next')}</button></div>`;
};
referenceRows=function(){
 if(!REFERENCE_CORPUS)return [];
 const normalize=value=>String(value).toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F]/g,'').replace(/’/g,"'");
 const words=normalize(epReference.query).trim().split(/\s+/).filter(Boolean);
 const grammarNames=new Map(referenceTaxonomy('grammar').map(item=>[item.id,item]));
 const rows=REFERENCE_CORPUS.sentences.filter(s=>{
  const guide=referenceGuide(s),grammar=grammarNames.get(guide.construction);
  const hay=normalize([s.en,s.englishUsage?.us,s.englishUsage?.uk,s.ar,guide.form,guide.purpose_ar,guide.purpose_en,
   grammar?.ar,referenceGrammarEnglish[guide.construction],...guide.keywords,...s.source_ids].join(' '));
  return (!epReference.grammar||guide.construction===epReference.grammar)&&
   (!epReference.domain||s.domains.includes(epReference.domain))&&(!epReference.purpose||guide.purpose===epReference.purpose)&&
   (!epReference.level||s.level===epReference.level)&&words.every(word=>hay.includes(word));
 });
 if(epReference.sort==='az')rows.sort((a,b)=>a.en.localeCompare(b.en));
 else if(epReference.sort==='level')rows.sort((a,b)=>a.level.localeCompare(b.level)||a.ordinal-b.ordinal);
 else if(epReference.sort==='grammar')rows.sort((a,b)=>referenceGuide(a).construction.localeCompare(referenceGuide(b).construction)||a.ordinal-b.ordinal);
 return rows;
};
renderReferenceRows=function(){
 const box=$("#reference-results");
 if(!box||!REFERENCE_CORPUS)return;
 const patternMode=epReference.section==='patterns';
 const all=patternMode?referencePatterns():referenceRows(),size=[12,24,48,100].includes(epReference.size)?epReference.size:24,pages=Math.ceil(all.length/size);
 referencePage=Math.max(0,Math.min(referencePage,Math.max(0,pages-1)));
 const loading=patternMode&&(!COURSE_CATALOG||!PILOT);
 $("#reference-count").textContent=loading?T('جارٍ تحميل الأنماط…','Loading patterns…'):patternMode
  ?T(`${all.length} نمطًا تطابق اختياراتك`,`${all.length} patterns match your filters`)
  :T(`${all.length} جملة تطابق اختياراتك`,`${all.length} sentences match your filters`);
 $("#reference-play-results").disabled=!all.length;
 $("#reference-pages").textContent=`${all.length?referencePage+1:0} / ${pages}`;
 $("#reference-prev").disabled=referencePage===0;$("#reference-next").disabled=referencePage+1>=pages;
 const visible=all.slice(referencePage*size,(referencePage+1)*size);
 box.dataset.view=epReference.view;
 box.innerHTML=loading?'':visible.map(patternMode?referencePatternCard:referenceCard).join('')||`<div class="empty">${T('لا توجد نتائج. غيّر البحث أو امسح الفلاتر.','No results. Change your search or reset the filters.')}</div>`;
 EP.decorate();if(!patternMode)window.EPOffline?.rememberSentences(visible);
};
function referenceCard(s){
 return `<article class="reference-card panel" id="card-${s.id}">
  ${['assistant-reviewed','imported-unreviewed'].includes(s.image.status)?`<div class="reference-photo">${pilotScene({...s,context:s.ar})}</div>`:
   `<span class="pending-scene">${T('الصورة بانتظار المراجعة','Scene awaiting review')}</span>`}
  <div class="reference-card-content">
   <div class="reference-card-meta"><span>${String(s.ordinal).padStart(4,'0')}</span><span>${s.level}</span></div>
   <h2 lang="en" dir="ltr">${referenceWords(s)}</h2>
   ${referenceAnnotations(s)}${referenceRule(s)}<div id="practice-${s.id}"></div>
  </div>
  <div class="reference-card-actions buttonrow">
   <button class="secondary" onclick="playReference('${s.id}','male')">▷ Adam</button>
   <button class="secondary" onclick="playReference('${s.id}','female')">▷ Bella</button>
   <button class="secondary" type="button" onclick="openReferenceGuided(['${H(s.id)}'])">${T('شرح مع أمثلة إضافية','Explanation with additional examples')}</button>
   <button class="textlink" onclick="practiceReference('${s.id}')">${T('تدرّب','Practise')} ←</button>
  </div></article>`;
}
setReferenceDomain=function(id){epReference.domain=id;referencePage=0;render()};
function paintReferenceWordCue(player,bar){
 const previous=bar.querySelector('[data-reference-word].speaking'),cue=player.cue();
 const active=cue<0?null:bar.querySelector(`[data-reference-word="${cue}"]`);
 if(active===previous)return;
 previous?.classList.remove('speaking');
 active?.classList.add('speaking');
}
function attachReferenceWordClock(player,bar){
 const {audio}=player;
 let frame;
 function tick(){
  if(!referencePlayerOpen||audio.paused)return;
  paintReferenceWordCue(player,bar);
  frame=requestAnimationFrame(tick);
 }
 audio.addEventListener('playing',()=>{cancelAnimationFrame(frame);tick()});
 audio.addEventListener('pause',()=>cancelAnimationFrame(frame));
}
paintReferencePlayer=function(){const p=referencePlayer,s=p?.sentence,bar=$('#reference-player');if(!bar||!s||!referencePlayerOpen)return;bar.hidden=false;bar.dataset.mini=epReferenceMini;bar.setAttribute('aria-label',T('مشغل مكتبة الجمل','Sentence library player'));const key=[s.id,p.state.voice,EP.prefs.language,EP.prefs.englishUsage,EP.prefs.arabic,Boolean(EP.teaching),epReferenceMini].join('/');if(key!==referencePaint){const ruleOpen=bar.querySelector('.reference-rule')?.open;referencePaint=key;bar.innerHTML=`<button class="reference-player-close" aria-label="${T('إغلاق المشغل','Close player')}" onclick="closeReferencePlayer()">×</button><button type="button" class="reference-player-minimize secondary" onclick="toggleReferenceMini()">${epReferenceMini?T('توسيع المشغل','Expand player'):T('تصغير المشغل','Minimize player')}</button><div class="reference-player-title"><b id="reference-player-position"></b><span>${p.state.voice==='male'?'Adam':'Bella'}</span></div><div class="reference-player-scene">${patternsSentenceScene(s)}</div><div class="reference-player-words" lang="en" dir="ltr">${referenceWords(s,'data-reference-word')}</div><div class="reference-player-details">${referenceAnnotations(s)}${referenceRule(s)}</div><div class="ep-player-progress-label"><span>${T('تقدم المسار','Route progress')}</span><span id="reference-route-progress-label"></span></div><progress class="ep-player-progress" id="reference-route-progress" max="100" value="0"></progress><div class="reference-player-actions"><button class="secondary" onclick="referencePlayer.move(-1)" aria-label="${T('الجملة السابقة','Previous sentence')}">←</button><button class="primary" id="reference-play-toggle" onclick="referencePlayer.audio.paused?referencePlayer.play():referencePlayer.pause()"></button><button class="secondary" onclick="referencePlayer.move(1)" aria-label="${T('الجملة التالية','Next sentence')}">→</button><button class="secondary" onclick="referencePlayer.switchVoice()">⇄ ${T('الصوت الآخر','Other voice')}</button><label>${T('السرعة','Speed')}<select aria-label="${T('سرعة الاستماع','Listening speed')}" onchange="referencePlayer.rate(this.value)">${[.65,.75,.85,1,1.15].map(r=>`<option value="${r}" ${r===p.state.rate?'selected':''}>${r}×</option>`).join('')}</select></label><label><input type="checkbox" ${p.state.auto?'checked':''} onchange="referencePlayer.state.auto=this.checked;referencePlayer.save()">${T('تتابع تلقائي','Auto advance')}</label>${patternsImageControls()}</div><input id="reference-seek" type="range" min="0" step=".01" max="${p.recording.duration_ms/1000}" aria-label="${T('موضع التسجيل','Audio position')}" oninput="referencePlayer.seek(this.value)"><small id="reference-player-status" role="status"></small>`;const rule=bar.querySelector('.reference-rule');if(ruleOpen&&rule)rule.open=true;window.EPOffline?.rememberSentences([s])}
 applyPatternsImageMode();$('#reference-player-position').textContent=T(`الجملة ${p.state.cursor+1} من ${p.state.ids.length} · المرجع ${s.ordinal}`,`Sentence ${p.state.cursor+1} of ${p.state.ids.length} · Reference ${s.ordinal}`);$('#reference-play-toggle').textContent=p.audio.paused?'▷ '+T('تشغيل','Play'):'Ⅱ '+T('إيقاف','Pause');$('#reference-seek').value=p.audio.currentTime||0;paintReferenceWordCue(p,bar);const progress=p.state.complete?100:100*(p.state.cursor+Math.min(1,(p.audio.currentTime||0)/(p.recording.duration_ms/1000)))/p.state.ids.length;$('#reference-route-progress').value=progress;$('#reference-route-progress-label').textContent=progress.toFixed(1)+'%';$('#reference-player-status').textContent=p.error||(p.state.complete?T('اكتمل هذا المسار.','This route is complete.'):`${(p.audio.currentTime||0).toFixed(1)} / ${(p.recording.duration_ms/1000).toFixed(1)} ${T('ثانية','seconds')}`);EP.apply()};
