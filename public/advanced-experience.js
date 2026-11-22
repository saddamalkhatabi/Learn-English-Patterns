const advancedTabs={
 phrases:['تراكيب العبارات','Phrase patterns'],
 grammar:['مكتبة القواعد','Grammar library'],
 idioms:['التعابير الاصطلاحية','Idioms'],
 review:['مراجعة أخطائي','Review mistakes']
};
let advancedTab='phrases',advancedPhraseView='phrases',advancedPage=0,advancedExam=null;
const advancedProgress={correct:{},missed:{}};
try{
 const saved=JSON.parse(localStorage.getItem('patterns-advanced-progress')||'{}');
 for(const key of ['correct','missed'])if(saved[key]&&typeof saved[key]==='object')advancedProgress[key]=saved[key];
}catch{}
function saveAdvancedProgress(){
 try{localStorage.setItem('patterns-advanced-progress',JSON.stringify(advancedProgress))}catch{}
}
const advancedRegionLabels={both:['مشترك','Shared'],us:['شائع في الأمريكية','Common in US English'],uk:['شائع في البريطانية','Common in UK English'],variants:['صيغتان أمريكية وبريطانية','US and UK forms']};
const advancedSection=()=>advancedTab==='phrases'?advancedPhraseView:advancedTab;
function advancedTitle(section,row){
 if(['grammar','comparisons'].includes(section))return T(row.ar,row.en);
 return englishDisplay(advancedEnglish(row).title,row);
}
function advancedEnglish(row){
 if(EP.prefs.englishUsage==='uk'&&row.uk)return {title:row.uk,example:row.ukExample};
 return {title:row.en,example:row.example};
}
function advancedRegion(row){return row.uk?'variants':row.region||'both'}
function advancedFilterText(row){
 return normalizeSearchTerm([row.en,row.ar,row.uk,row.ruleEn,row.ruleAr,row.example,row.ukExample,row.translation,
  ...(EPAdvanced.groups[advancedSection()]?.[row.group]||[])].join(' '));
}
function advancedSelect(id,label,items){
 return `<label>${label}<select id="advanced-${id}" onchange="resetAdvancedResults()">
  <option value="">${T('الكل','All')}</option>
  ${items.map(([value,name])=>`<option value="${H(value)}">${H(name)}</option>`).join('')}</select></label>`;
}
function advancedExamLaunch(){
 const missed=EPAdvanced.exam('review',Object.keys(advancedProgress.missed));
 return `<section class="advanced-assessment panel"><div><h2>${T('اختبر فهمك','Test your understanding')}</h2>
  <p>${T('اختبار لكل مستوى، واختبار شامل من A1 إلى C2. بعد الإجابة يظهر التصحيح وسببه.','Take a level test or a comprehensive A1–C2 test. Each answer comes with feedback and an explanation.')}</p></div>
  <div class="advanced-exam-levels">${EPAdvanced.levels.map(level=>{
   const lessons=EPAdvanced.exam(level);
   const correct=lessons.filter(row=>advancedProgress.correct[row.id]).length;
   return `<button class="secondary" onclick="openAdvancedExam('${level}')"><b>${level}</b> <small>${correct} / ${lessons.length}</small></button>`;
  }).join('')}</div>
  <div class="buttonrow"><button class="primary" onclick="openAdvancedExam('all')">${T('الاختبار الشامل','Comprehensive test')} · ${EPAdvanced.grammar.length}</button>
  <button class="secondary" onclick="openAdvancedExam('review')" ${missed.length?'':'disabled'}>${T('أعد حلّ أخطائك','Retry missed questions')} · ${missed.length}</button></div></section>`;
}
function advancedReviewPage(){
 const rows=EPAdvanced.exam('review',Object.keys(advancedProgress.missed));
 return `${advancedExamLaunch()}<section class="panel"><h2>${T('مراجعة أخطائي','Review mistakes')}</h2>
  ${rows.length?`<ul class="advanced-review-list">${rows.map(row=>`<li><button class="textlink" onclick="openAdvancedItem('grammar','${row.id}')">
   ${row.level} · ${H(T(row.ar,row.en))} ↗</button></li>`).join('')}</ul>`:
   `<p>${T('ستظهر هنا القواعد التي تحتاج إلى مراجعتها بعد حلّ الاختبارات.','Topics you miss on a test will appear here for review.')}</p>`}</section>`;
}
function advancedPageHTML(){
 const section=advancedSection();
 const descriptions={
  phrases:['ابحث عن التركيب، أو قارن عبارتين متقاربتين لترى متى تستخدم كل واحدة.','Find a phrase pattern or compare similar expressions to see when each fits.'],
  grammar:['ادرس القاعدة من مثال واضح، ثم جرّب سؤالًا أو اختبر مستوى كاملًا.','Study a rule through an example, then try a question or take a full level test.'],
  idioms:['استكشف المعنى المقصود، والسياق الذي يناسبه، وصيغ الاستعمال الأمريكي والبريطاني.','Explore what each idiom means, when to use it and how American and British forms differ.'],
  review:['ارجع إلى الأسئلة التي أخطأت فيها واقرأ القاعدة المرتبطة بها.','Return to missed questions and review the rules behind them.']
 };
 return `${head(T('خدمات متقدمة','Advanced learning'),T(...descriptions[advancedTab]))}
  <div class="advanced-tabs" role="tablist" aria-label="${T('خدمات متقدمة','Advanced learning')}">
   ${Object.entries(advancedTabs).map(([id,name])=>`<button role="tab" aria-selected="${id===advancedTab}"
    aria-controls="advanced-panel" id="advanced-tab-${id}" tabindex="${id===advancedTab?0:-1}" data-advanced-tab="${id}"
    onclick="selectAdvancedTab('${id}')">${T(...name)}</button>`).join('')}</div>
  <div id="advanced-panel" role="tabpanel" aria-labelledby="advanced-tab-${advancedTab}">
   ${advancedTab==='review'?advancedReviewPage():`
    ${advancedTab==='grammar'?advancedExamLaunch():''}
    ${advancedTab==='phrases'?`<div class="buttonrow advanced-subtabs" aria-label="${T('عرض التراكيب','Phrase views')}">
     <button class="secondary" data-phrase-view="phrases" aria-pressed="${section==='phrases'}" onclick="setAdvancedPhraseView('phrases')">${T('التراكيب','Phrase patterns')}</button>
     <button class="secondary" data-phrase-view="comparisons" aria-pressed="${section==='comparisons'}" onclick="setAdvancedPhraseView('comparisons')">${T('مقارنات العبارات','Phrase comparisons')}</button></div>`:''}
    <div class="toolbar advanced-filters"><label>${T('البحث','Search')}<input id="advanced-query" type="search" oninput="resetAdvancedResults()"
     placeholder="${T('كلمة، تركيب أو معنى…','Word, structure or meaning…')}"></label>
     ${EPAdvanced.groups[section]?advancedSelect('group',T('التصنيف','Category'),Object.entries(EPAdvanced.groups[section]).map(([id,labels])=>[id,T(...labels)])):''}
     ${['grammar','phrases'].includes(section)?advancedSelect('level',T('المستوى','Level'),EPAdvanced.levels.map(level=>[level,level])):''}
     ${section==='idioms'?advancedSelect('region',T('الاستعمال الإقليمي','Regional usage'),Object.entries(advancedRegionLabels).map(([id,labels])=>[id,T(...labels)])):''}
    </div><p id="advanced-count" role="status"></p><div id="advanced-results" class="advanced-grid"></div>
    <div id="advanced-pages" class="pagination" hidden><button class="secondary" onclick="stepAdvancedPage(-1)">${T('السابق','Previous')}</button>
     <span></span><button class="secondary" onclick="stepAdvancedPage(1)">${T('التالي','Next')}</button></div>`}
  </div>`;
}
function selectAdvancedTab(id,focus=true){
 if(!advancedTabs[id])return;
 advancedTab=id;advancedPage=0;
 render();
 if(focus)$('#advanced-tab-'+id)?.focus();
}
function setAdvancedPhraseView(view){
 advancedPhraseView=view;advancedPage=0;render();
 $(`[data-phrase-view="${view}"]`)?.focus();
}
function resetAdvancedResults(){advancedPage=0;paintAdvancedResults()}
function stepAdvancedPage(delta){
 advancedPage+=delta;paintAdvancedResults();
 $('#advanced-count')?.scrollIntoView({block:'start'});
}
function advancedRows(search){
 const section=advancedSection();
 const group=$('#advanced-group')?.value,level=$('#advanced-level')?.value,region=$('#advanced-region')?.value;
 const query=normalizeSearchTerm(search??$('#advanced-query')?.value).split(' ').filter(Boolean);
 return (EPAdvanced[section]||[]).filter(row=>{
  if(group&&row.group!==group||level&&row.level!==level||region&&advancedRegion(row)!==region)return false;
  if(!query.length)return true;
  const text=advancedFilterText(row);
  return query.every(word=>text.includes(word));
 });
}
function paintAdvancedResults(){
 const host=$('#advanced-results');
 if(!host)return;
 const section=advancedSection();
 EPFilters.controls('advanced-'+section,$('.advanced-filters'),Object.fromEntries(['query','group','level','region'].map(id=>[id,$('#advanced-'+id)])),resetAdvancedResults);
 const rows=advancedRows(),size=18,max=Math.max(1,Math.ceil(rows.length/size));
 advancedPage=Math.min(Math.max(advancedPage,0),max-1);
 $('#advanced-count').textContent=T(`${rows.length} نتيجة`,`${rows.length} results`);
 host.innerHTML=rows.length?rows.slice(advancedPage*size,(advancedPage+1)*size).map(row=>advancedCard(section,row)).join(''):
  `<p class="empty">${T('لا توجد نتائج لهذا البحث.','No results for this search.')}</p>`;
 const paging=$('#advanced-pages');
 paging.hidden=max===1;
 paging.children[0].disabled=advancedPage===0;
 paging.children[1].textContent=`${advancedPage+1} / ${max}`;
 paging.children[2].disabled=advancedPage===max-1;
 EP.apply();
}
function advancedCard(section,row){
 const name=section==='idioms'?T(...advancedRegionLabels[advancedRegion(row)]):
  row.level||T('مقارنة','Comparison');
 const title=advancedTitle(section,row),english=title===englishDisplay(advancedEnglish(row).title,row);
 return `<details class="advanced-card panel" data-advanced-id="${row.id}"><summary>
  <span class="advanced-card-title"><b ${english?'lang="en" dir="ltr"':''}>${H(title)}</b>
  <small>${H(english?row.ar:row.en)}</small></span><span class="chip">${H(name)}</span>
 </summary><div class="advanced-card-body">${advancedDetails(section,row)}</div></details>`;
}
function advancedExample(row,region=EP.prefs.englishUsage){
 const text=region==='uk'&&row.ukExample?row.ukExample:row.example;
 const display=row.ukExample?text:englishDisplay(text,row);
 return `<div class="advanced-model"><p lang="en" dir="ltr">${row.ukExample?H(display):englishTextMarkup(text,row)}</p>
  ${EP.ar(row.translation)}<button class="textlink" type="button" data-advanced-speak="${H(display)}">▷ ${T('استمع','Listen')}</button></div>`;
}
function advancedDetails(section,row){
 const share=`<button class="secondary" type="button" data-share="advanced-item" data-share-section="${section}" data-share-id="${row.id}">
  ${T('مشاركة','Share')}</button>`;
 if(section==='comparisons')return `${EP.pair(row.ruleAr,row.ruleEn)}<div class="advanced-comparison-examples">
  ${row.examples.map(id=>{
   const example=EPAdvanced.get('phrases',id);
   return `<article><h3 lang="en" dir="ltr">${H(englishDisplay(advancedEnglish(example).title,example))}</h3>
    ${advancedExample(example)}<button class="textlink" onclick="openAdvancedItem('phrases','${id}')">${T('شرح التركيب','Open phrase pattern')} ↗</button></article>`;
  }).join('')}</div>${share}`;
 const labels=EPAdvanced.groups[section]?.[row.group];
 const usage=section==='idioms'?`<p class="advanced-usage"><span class="chip">${T(...advancedRegionLabels[advancedRegion(row)])}</span>
  <span class="chip">${row.register==='informal'?T('غير رسمي','Informal'):T('محايد','Neutral')}</span></p>`:'';
 return `${labels?`<small>${T(...labels)}</small>`:''}${usage}
  ${EP.pair(section==='idioms'?row.ar:row.ruleAr,row.ruleEn)}
  ${advancedExample(row)}
  ${row.uk?`<details class="advanced-regional"><summary>${T('قارن الأمريكي والبريطاني','Compare American and British forms')}</summary>
   <div class="advanced-comparison-examples">${[['us',row.en,'US'],['uk',row.uk,'UK']].map(([region,title,label])=>
   `<section><bdi class="chip">${label}</bdi><h3 lang="en" dir="ltr">${H(title)}</h3>${advancedExample(row,region)}</section>`).join('')}</div></details>`:''}
  <div class="buttonrow">${section==='grammar'?`<button class="primary" onclick="openAdvancedExam('single','${row.id}')">${T('جرّب سؤال القاعدة','Try a question')}</button>`:''}${share}</div>`;
}
function openAdvancedItem(section,id){
 const row=EPAdvanced.get(section,id);
 if(!row)return;
 stopSpeech();
 const trigger=document.activeElement,dialog=document.createElement('dialog');
 dialog.className='advanced-dialog';
 const title=section==='grammar'||section==='comparisons'?T(row.ar,row.en):englishDisplay(advancedEnglish(row).title,row);
 dialog.setAttribute('aria-label',title);
 dialog.innerHTML=`<div class="advanced-dialog-head"><h2>${H(title)}</h2>
  <form method="dialog"><button class="secondary" aria-label="${T('إغلاق','Close')}" autofocus>×</button></form>
  </div>${advancedDetails(section,row)}`;
 document.body.append(dialog);
 dialog.showModal();
 dialog.addEventListener('close',()=>{stopSpeech();dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true})},{once:true});
}
function openAdvancedExam(mode,id){
 const rows=mode==='single'?[EPAdvanced.get('grammar',id)].filter(Boolean):
  EPAdvanced.exam(mode,Object.keys(advancedProgress.missed));
 if(!rows.length||advancedExam)return;
 stopSpeech();
 const trigger=document.activeElement,dialog=document.createElement('dialog');
 dialog.className='advanced-dialog advanced-exam';
 dialog.setAttribute('aria-labelledby','advanced-exam-title');
 advancedExam={dialog,mode,rows,index:0,answers:[],offsets:rows.map(()=>Math.floor(Math.random()*3))};
 document.body.append(dialog);
 paintAdvancedExam();
 dialog.showModal();
 dialog.addEventListener('close',()=>{
  advancedExam=null;dialog.remove();
  if(page==='advanced'&&advancedTab==='review')render();
  else if(page==='advanced'&&advancedTab==='grammar'){
   const tests=$('.advanced-assessment');
   if(tests&&!tests.closest('dialog'))tests.outerHTML=advancedExamLaunch();
  }
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
 },{once:true});
}
function paintAdvancedExam(){
 const {dialog,mode,rows,index,answers,offsets}=advancedExam;
 const row=rows[index],finished=!row,selected=answers[index];
 const name=mode==='all'?T('الاختبار الشامل للقواعد','Comprehensive grammar test'):
  mode==='review'?T('إعادة حلّ الأخطاء','Retry missed questions'):mode==='single'?T('سؤال القاعدة','Grammar question'):
  T(`اختبار ${mode}`,`${mode} test`);
 let content;
 if(finished){
  const correct=answers.filter((answer,i)=>answer===rows[i].answer).length;
  const groups=EPAdvanced.levels.map(level=>{
   let good=0,total=0;
   rows.forEach((item,i)=>{if(item.level===level){total++;good+=Number(answers[i]===item.answer)}});
   return total?`<li><b>${level}</b><span>${good} / ${total}</span></li>`:'';
  }).join('');
  content=`<p class="advanced-score" role="status">${correct} / ${rows.length} · ${T('إجابات صحيحة','correct answers')}</p>
   <ul class="advanced-score-levels">${groups}</ul><div class="buttonrow">
    <button class="secondary" onclick="repeatAdvancedExam(false)">${T('أعد الاختبار','Retake test')}</button>
    <button class="primary" onclick="repeatAdvancedExam(true)" ${correct===rows.length?'disabled':''}>${T('أعد الأسئلة التي أخطأت فيها','Retry missed questions')}</button></div>`;
 }else{
  const choices=[row.answer,...row.distractors],start=offsets[index];
  const ordered=[...choices.slice(start),...choices.slice(0,start)];
  const displayed=englishChoiceOptions(ordered,row);
  const question=englishDisplay(row.question,row);
  const example=question.includes('___')?question.replace('___',englishDisplay(row.answer,row)):englishDisplay(row.answer,row);
  content=`<div class="advanced-exam-progress"><progress aria-label="${T('تقدم الاختبار','Test progress')}" max="${rows.length}" value="${answers.length}"></progress>
   <bdi>${index+1} / ${rows.length} · ${row.level}</bdi></div>
   <h3 lang="en" dir="ltr" id="advanced-question" tabindex="-1">${H(question)}</h3>
   <div class="advanced-options" aria-labelledby="advanced-question">${displayed.map((choice,i)=>{
    const answer=ordered[i],state=selected===undefined?'':answer===row.answer?'correct':answer===selected?'wrong':'';
    return `<button type="button" class="secondary" data-answer="${H(answer)}" data-result="${state}" ${selected===undefined?'':'disabled'} lang="en" dir="ltr">${H(choice)}</button>`;
   }).join('')}</div>
   ${selected===undefined?'':`<section class="advanced-feedback" role="status"><b>${selected===row.answer?T('إجابة صحيحة','Correct'):T('راجع هذا الفرق','Review this distinction')}</b>
    <p lang="en" dir="ltr">${H(example)}</p>${EP.pair(row.ruleAr,row.ruleEn)}</section>
   <button class="primary" id="advanced-next" onclick="advancedExam.index++;paintAdvancedExam();($('#advanced-question')||$('#advanced-exam-title'))?.focus()">
    ${index+1===rows.length?T('النتيجة','Results'):T('السؤال التالي','Next question')}</button>`}`;
 }
 dialog.innerHTML=`<div class="advanced-dialog-head"><h2 id="advanced-exam-title" tabindex="-1">${name}</h2>
  <form method="dialog"><button class="secondary" aria-label="${T('إغلاق','Close')}">×</button></form></div>${content}`;
}
function answerAdvancedQuestion(answer){
 const {rows,index,answers}=advancedExam;
 if(answers[index]!==undefined)return;
 const row=rows[index];
 if(![row.answer,...row.distractors].includes(answer))return;
 answers[index]=answer;
 if(answer===row.answer){advancedProgress.correct[row.id]=true;delete advancedProgress.missed[row.id]}
 else advancedProgress.missed[row.id]=true;
 saveAdvancedProgress();paintAdvancedExam();$('#advanced-next')?.focus();
}
function repeatAdvancedExam(missed){
 const exam=advancedExam;
 if(missed)exam.rows=exam.rows.filter((row,i)=>row.answer!==exam.answers[i]);
 exam.index=0;exam.answers=[];exam.offsets=exam.rows.map(()=>Math.floor(Math.random()*3));
 paintAdvancedExam();$('#advanced-question')?.focus();
}
document.addEventListener('click',event=>{
 const answer=event.target.closest?.('.advanced-exam button[data-answer]');
 if(answer&&advancedExam)answerAdvancedQuestion(answer.dataset.answer);
 const listen=event.target.closest?.('[data-advanced-speak]');
 if(listen)speak(listen.dataset.advancedSpeak);
});
document.addEventListener('keydown',event=>{
 const tab=event.target.closest?.('[data-advanced-tab]');
 if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const keys=Object.keys(advancedTabs),index=keys.indexOf(tab.dataset.advancedTab);
 const direction=(event.key==='ArrowRight'?1:-1)*(EP.prefs.language==='ar'?-1:1);
 selectAdvancedTab(keys[event.key==='Home'?0:event.key==='End'?keys.length-1:(index+direction+keys.length)%keys.length]);
});
document.addEventListener('DOMContentLoaded',()=>{
 const before=render;
 render=function(){
  if(page!=='advanced'){before();return}
  releaseDialoguePlayer();releaseComparisonGuide();
  nav();$('#app').innerHTML=advancedPageHTML();paintAdvancedResults();EP.decorate();
 };
 if(location.hash==='#advanced'){page='advanced';render()}
},{once:true});
