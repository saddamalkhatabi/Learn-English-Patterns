let patternComparisons=[], comparisonGuide=null, comparisonTimer=null;
fetch('comparisons.json').then(r=>r.ok?r.json():[]).then(rows=>{
 patternComparisons=rows;
 if(page==='comparisons')render();
}).catch(()=>{});
function comparisonsPage(){
 return head(T('المقارنات','Pattern comparisons'),T(
  'قارن صيغتين أو أكثر جنبًا إلى جنب، أو تصفّح المقارنات بالتتابع مع وقت للقراءة.',
  'Compare two or more structures side by side, or take a guided tour with reading breaks.'))+
  `<div class="toolbar">
   <label>${T('عدد الأنماط','Number of patterns')} <select id="comparison-size" onchange="resetComparisonSelection()">
   <option value="">${T('الكل','All')}</option><option value="2">${T('ثنائية','Two')}</option>
   <option value="3">${T('ثلاثية','Three')}</option><option value="4">${T('رباعية','Four')}</option>
   <option value="5">${T('خمسة فأكثر','Five or more')}</option></select></label>
   <label>${T('مدة القراءة','Reading time')} <select id="comparison-delay">
   <option value="12">12 s</option><option value="25" selected>25 s</option><option value="45">45 s</option></select></label>
   <button class="primary" onclick="startComparisonGuide()">${T('تصفّح متتابع','Start guided tour')} ▷</button>
  </div><div id="comparison-guide"></div><div id="comparison-list"></div>`;
}
function visibleComparisons(){
 const size=+($('#comparison-size')?.value||0);
 return patternComparisons.filter(c=>!size||(size===5?c.patterns.length>=5:c.patterns.length===size));
}
function comparisonModel(example,pattern){
 const words=example.split(/\s+/);
 const fixed=new Set(pattern?EPTeaching.describe({en:example},pattern).highlight:[]);
 return words.map((word,i)=>`<span class="${fixed.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' ');
}
function comparisonCards(item,showExamples,showDetails){
 return `<div class="comparison-examples">${item.patterns.map((id,i)=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  const lesson=learningMeta(id);
  const rows=PILOT?.sentences.filter(s=>s.pattern_id===id)||[];
  return `<article>
    <h3 class="pattern-form" dir="ltr" lang="en">${H(pattern?.form||item.examples[i])}</h3>
    ${showExamples?`<p dir="ltr" lang="en">${comparisonModel(item.examples[i],pattern)}</p>`:''}
    ${showDetails?`<details><summary>${T('تفاصيل النمط وأمثلته','Pattern details and examples')}</summary>
     ${EP.pair(lesson?.explanation_ar,lesson?.explanation_en)}
     ${rows.map(s=>`<p dir="ltr" lang="en">${EP.words(s)}</p>${EP.ar(s.ar)}`).join('')}
     <button class="secondary" onclick="pauseComparisonGuide();openLesson(${id})">${T('افتح الدرس الكامل','Open full lesson')} ↗</button>
    </details>`:''}
  </article>`;
 }).join('')}</div>`;
}
function comparisonExercise(item){
 return `<p lang="en" dir="ltr">${H(item.question)}</p><div class="buttonrow">${item.options.map((option,i)=>
  `<button class="secondary" onclick="checkComparison('${H(item.id)}',${i},this)" lang="en" dir="ltr">${H(option)}</button>`).join('')}</div>
  <p role="status" class="comparison-feedback"></p>`;
}
function paintComparisonSelection(){
 const list=$('#comparison-list');
 if(!list)return;
 list.innerHTML=visibleComparisons().map(item=>`<details class="comparison-card panel">
  <summary>${H(T(item.ar,item.en))} · ${item.patterns.length}</summary>
  <p>${H(T(item.noteAr,item.noteEn))}</p>${comparisonCards(item,true,true)}${comparisonExercise(item)}
 </details>`).join('');
}
function checkComparison(id,choice,button){
 const item=patternComparisons.find(c=>c.id===id);
 button.closest('.comparison-card').querySelector('.comparison-feedback').textContent=
  (choice===item.answer?T('صحيح. ','Correct. '):T('راجع الفرق وجرّب مجددًا. ','Review the distinction and try again. '))+T(item.noteAr,item.noteEn);
}
function resetComparisonSelection(){
 pauseComparisonGuide();comparisonGuide=null;
 $('#comparison-guide').innerHTML='';
 paintComparisonSelection();
}
function startComparisonGuide(){
 pauseComparisonGuide();
 const items=visibleComparisons();
 if(!items.length)return;
 comparisonGuide={items,step:0,seconds:+$('#comparison-delay').value,remaining:0,end:null};
 comparisonGuide.remaining=comparisonGuide.seconds*1000;
 paintComparisonGuide();
 resumeComparisonGuide();
}
function comparisonRemaining(){
 return comparisonGuide.end==null?comparisonGuide.remaining:Math.max(0,comparisonGuide.end-Date.now());
}
function pauseComparisonGuide(){
 clearInterval(comparisonTimer);
 comparisonTimer=null;
 if(!comparisonGuide)return;
 comparisonGuide.remaining=comparisonRemaining();
 comparisonGuide.end=null;
 updateComparisonTimer();
}
function resumeComparisonGuide(){
 if(!comparisonGuide||comparisonGuide.end!=null||!$('#comparison-guide'))return;
 comparisonGuide.end=Date.now()+comparisonGuide.remaining;
 comparisonTimer=setInterval(()=>{
  if(page!=='comparisons'){pauseComparisonGuide();return}
  if(comparisonRemaining()<=0){advanceComparisonGuide(1,true);return}
  updateComparisonTimer();
 },150);
 updateComparisonTimer();
}
function advanceComparisonGuide(delta,auto=false){
 const guide=comparisonGuide;
 if(!guide)return;
 const playing=auto||guide.end!=null;
 pauseComparisonGuide();
 const next=guide.step+delta;
 if(next>=guide.items.length*3){
  comparisonGuide=null;
  $('#comparison-guide').innerHTML=`<p class="panel" role="status">${T('اكتمل تصفّح المقارنات المختارة.','You have reached the end of the selected comparisons.')}</p>`;
  return;
 }
 guide.step=Math.max(0,next);
 guide.remaining=guide.seconds*1000;
 paintComparisonGuide();
 if(playing)resumeComparisonGuide();
}
function updateComparisonTimer(){
 const meter=$('#comparison-meter'), button=$('#comparison-play');
 if(!comparisonGuide||!meter||!button)return;
 const left=comparisonRemaining();
 meter.value=comparisonGuide.seconds*1000-left;
 $('#comparison-clock').textContent=T(`${Math.ceil(left/1000)} ثانية للقراءة`,`${Math.ceil(left/1000)} seconds to read`);
 button.textContent=comparisonGuide.end==null?T('استئناف','Resume'):T('إيقاف مؤقت','Pause');
}
function paintComparisonGuide(){
 const guide=comparisonGuide, index=Math.floor(guide.step/3), stage=guide.step%3, item=guide.items[index];
 const title=[T('الفكرة الأساسية','Key difference'),T('جملة من كل نمط','One example per pattern'),T('توسّع وجرّب','Explore and practise')][stage];
 $('#comparison-guide').innerHTML=`<section class="panel comparison-card">
  <p>${index+1} / ${guide.items.length} · ${title}</p><h2>${H(T(item.ar,item.en))}</h2>
  <p>${H(T(item.noteAr,item.noteEn))}</p>${comparisonCards(item,stage>=1,stage===2)}
  ${stage===2?comparisonExercise(item):''}
  <progress id="comparison-meter" max="${guide.seconds*1000}" value="0"></progress> <span id="comparison-clock"></span>
  <div class="buttonrow"><button class="secondary" onclick="advanceComparisonGuide(-1)" ${guide.step===0?'disabled':''}>${T('السابق','Previous')}</button>
  <button class="secondary" id="comparison-play" onclick="comparisonGuide.end==null?resumeComparisonGuide():pauseComparisonGuide()"></button>
  <button class="primary" onclick="advanceComparisonGuide(1)">${T('التالي','Next')}</button></div></section>`;
 updateComparisonTimer();
}
window.addEventListener('hashchange',()=>{if(location.hash!=='#comparisons'){pauseComparisonGuide();comparisonGuide=null}});
