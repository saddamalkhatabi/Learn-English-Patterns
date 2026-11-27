/* The lesson, songs and listening players share these two exercises. */
(function(root){
 function pictureKey(row){
  if(row?.photo)return row.photo;
  const image=row?.image;
  if(!image?.atlas||!image.width||!image.height||image.status&&
   !['assistant-reviewed','visually_reviewed','imported-unreviewed'].includes(image.status))return '';
  const crop=image.crop;
  if(crop){
   const {x,y,width,height}=crop;
   if(!(x>=0&&y>=0&&width>0&&height>0&&x+width<=image.width&&y+height<=image.height))return '';
   return [image.atlas,x,y,width,height].join(':');
  }
  return Number.isInteger(image.cell)&&image.columns>0&&image.rows>0&&image.cell>=0&&image.cell<image.columns*image.rows?
   `${image.atlas}:${image.cell}`:'';
 }

 function distinctRows(rows,kind,{repeatText=false}={}){
  const texts=new Set(),pictures=new Set(),ids=new Set();
  return rows.filter(row=>{
   const text=row?.en?.trim().toLowerCase().replace(/[.!?]+$/,'');
   if(!row?.id||!text||ids.has(row.id)||!repeatText&&texts.has(text))return false;
   if(kind==='pictures'){
    const key=pictureKey(row);
    if(!key||pictures.has(key))return false;
    pictures.add(key);
   }else if(text.split(/\s+/).length<2)return false;
   ids.add(row.id);
   texts.add(text);
   return true;
  });
 }

 function shuffled(items){
  const order=[...items];
  for(let i=order.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [order[i],order[j]]=[order[j],order[i]];
  }
  return order;
 }

 function wordOrderMatches(words,order){
  return order.length===words.length&&new Set(order).size===words.length&&
   order.every((index,position)=>words[index]===words[position]);
 }

 function wordBank(words){
  const order=shuffled(words.map((_,index)=>index));
  if(wordOrderMatches(words,order)&&new Set(words).size>1){
   const other=order.findIndex(index=>words[index]!==words[order[0]]);
   [order[0],order[other]]=[order[other],order[0]];
  }
  return order;
 }

 function pictureChoices(target,pool){
  const alternatives=distinctRows([target,...shuffled(pool)],'pictures').slice(1,3);
  return shuffled([target,...alternatives]);
 }

 const practiceTextKey=value=>String(value||'').normalize('NFKC').toLowerCase().replaceAll('’',"'")
  .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[^\p{L}\p{N}'\s]/gu,' ').replace(/\s+/g,' ').trim();
 const commonWords=new Set('a an the of and to for in on is are was were am be we they he she it i you me my your our their his her this that these those with'.split(' '));
 const generalVerbs=new Set(['have','has','had','do','does','did','get','gets','got']);
 function pictureFeatures(row){
  const text=practiceTextKey(row.en);
  return {row,text,meaning:practiceTextKey(row.ar),photo:pictureKey(row),topics:row.practiceTopics||[],
   patterns:row.practicePatterns||[],words:new Set(text.split(' ').filter(word=>word&&!commonWords.has(word)))};
 }

 function galleryChoices(target,features,challenge){
  const current=features.get(target)||pictureFeatures(target);
  const phrases=new Set([current.text,...(target.practiceAlternates||[]).map(practiceTextKey)]);
  const meanings=new Set(current.meaning?[current.meaning]:[]);
  const rank=candidate=>{
   const overlap=[...candidate.words].filter(word=>current.words.has(word)).length;
   const topic=candidate.topics.some(id=>current.topics.includes(id));
   const pattern=candidate.patterns.some(id=>current.patterns.includes(id));
   const dialogue=target.practiceDialogue&&target.practiceDialogue===candidate.row.practiceDialogue;
   const similarity=overlap/Math.max(1,current.words.size+candidate.words.size-overlap);
   return challenge?8*similarity+2*Number(topic)+2*Number(pattern)+3*Number(Boolean(dialogue))+
    Number(target.practiceLevel===candidate.row.practiceLevel)*.5+Math.random()*.25:
    Math.random()-Number(topic)*.7-Number(pattern)*.5-similarity;
  };
  const ranked=[];
  for(const candidate of features.values()){
   if(candidate.photo===current.photo||phrases.has(candidate.text)||meanings.has(candidate.meaning))continue;
   const sharesDetail=[...candidate.words].some(word=>current.words.has(word));
   const addsDetail=[...candidate.words].some(word=>!current.words.has(word)&&!generalVerbs.has(word));
   if(!sharesDetail||addsDetail)ranked.push({candidate,score:rank(candidate)});
  }
  ranked.sort((a,b)=>b.score-a.score);
  const chosen=[target];
  for(const {candidate} of ranked){
   if(phrases.has(candidate.text)||meanings.has(candidate.meaning))continue;
   chosen.push(candidate.row);
   phrases.add(candidate.text);
   if(candidate.meaning)meanings.add(candidate.meaning);
   if(chosen.length===(challenge?4:3))break;
  }
  return shuffled(chosen);
 }

 function patternIndexes(row,text){
  const sameLength=text.trim().split(/\s+/).length===row.en.trim().split(/\s+/).length;
  const stored=EP.teaching?.sentences?.[row.id];
  const indexed=row.practiceFocus?.length?row.practiceFocus:stored?.highlight;
  if(sameLength&&indexed?.length)return new Set(indexed);
  const form=row.form||stored?.form||(row.pattern_id&&PILOT?.patterns.find(pattern=>pattern.id===row.pattern_id)?.form);
  const authored=form?EPTeaching.describe({...row,en:text},{form}).highlight:[];
  if(authored.length)return new Set(authored);
  const classified=EPTeaching.describeReference(row,text).highlight;
  if(classified.length)return new Set(classified);
  const core=EPTeaching.indices(text,/\b(?:i (?:want|need|like|think|know|feel|have)|thank you|thanks for|you['’]re welcome|nice to meet you|hello|excuse me|my name is|would like(?: to)?|have to|can(?:not|['’]t)?|should|would|could|am|is|are|was|were|do not|did not|['’](?:m|re|s))(?:\s+\w+ing\b)?/i);
  if(core.length)return new Set(core);
  const action=(row.practiceActions||[]).map(term=>practiceTextKey(term)).find(term=>term&&(' '+practiceTextKey(text)+' ').includes(' '+term+' '));
  const words=text.trim().split(/\s+/);
  const first=words.findIndex(word=>!commonWords.has(practiceTextKey(word))&&practiceTextKey(word));
  const actionMatch=action?EPTeaching.indices(text,new RegExp('\\b'+action.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i')):[];
  return new Set(actionMatch.length?actionMatch:[Math.max(0,first)]);
 }

 function pictureOption(row){
  const text=englishDisplay(row.en,row),fixed=patternIndexes(row,text);
  const runs=[];
  for(const [index,word] of text.trim().split(/\s+/).entries()){
   const highlighted=fixed.has(index),last=runs.at(-1);
   if(last?.highlighted===highlighted)last.words.push(word);
   else runs.push({highlighted,words:[word]});
  }
  return runs.map(run=>{
   const phrase=H(run.words.join(' '));
   return run.highlighted?`<mark class="practice-pattern-word">${phrase}</mark>`:phrase;
  }).join(' ');
 }

 function nextRows(rows,seen,limit=5){return rows.filter(row=>!seen.has(String(row.id))).slice(0,limit)}

 function rowPicture(row){
  return row.photo?`<img src="${H(row.photo)}" alt="">`:
   `<div aria-hidden="true">${pilotScene({image:row.image,en:'',ar:''})}</div>`;
 }

 function practiceTitle(kind){
  return kind==='pictures'?T('اربط الجمل بالصور','Match sentences to pictures'):T('رتّب كلمات الجملة','Put the sentence in order');
 }

 function actions(handler,{atEnd=false}={}){
  return `<div class="learning-practice-actions">
   <button type="button" class="secondary" data-open-practice="pictures" onclick="${handler}('pictures',this)">${atEnd?
    T('اربط جمل المسار بالصور','Match route sentences to pictures'):practiceTitle('pictures')}</button>
   <button type="button" class="secondary" data-open-practice="words" onclick="${handler}('words',this)">${atEnd?
    T('رتّب جمل المسار','Rebuild route sentences'):practiceTitle('words')}</button></div>`;
 }

 function config(kind,rows,alternatives,gallery){
  const repeatText=Boolean(gallery);
  const eligible=distinctRows(rows,kind,{repeatText});
  const pool=distinctRows([...eligible,...alternatives],kind,{repeatText});
  const targets=kind==='pictures'&&pool.length<2?[]:eligible;
  return {targets,pool};
 }

 const autoAdvanceKey='patterns-picture-auto-advance';
 function autoAdvance(){
  try{return localStorage.getItem(autoAdvanceKey)!=='off'}catch{return true}
 }
 function mount(host,{kind,targets,pool,seen,onCorrect,exit,exitLabel,limit=5,gallery}){
  let round=[],index=0,wordOrder=[],picked=[],choices=[],solved=false,wrong=-1;
  let timer,wordList=[],fixed=new Set(),advanceAutomatically=autoAdvance();
  const isPicture=kind==='pictures';
  const features=gallery&&new Map(pool.map(item=>[item,pictureFeatures(item)]));
  const order=gallery&&(gallery.shuffle?shuffled(targets):targets);
  let completed=gallery?targets.filter(item=>seen.has(String(item.id))).length:0;
  const row=()=>round[index];
  const hasMore=()=>gallery?completed<targets.length:nextRows(targets,seen,1).length>0;
  const canAdvance=()=>index+1<round.length||hasMore();
  const onResult=()=>{
   solved=true;
   const id=String(row().id);
   if(!seen.has(id))completed++;
   seen.add(id);
   onCorrect?.(id);
  };
  function startQuestion(){
   clearTimeout(timer);
   solved=false;wrong=-1;picked=[];
   if(row()){
    if(isPicture)choices=gallery?galleryChoices(row(),features,gallery.challenge):pictureChoices(row(),pool);
    else{
     const text=englishDisplay(row().en,row());
     wordList=text.trim().split(/\s+/);
     fixed=patternIndexes(row(),text);
     wordOrder=wordBank(wordList);
    }
   }
   paint();
  }
  function startRound(preferStart=false){
   round=gallery?order:nextRows(targets,seen,limit);
   const startId=preferStart&&gallery?.startId;
   index=gallery?Math.max(0,round.findIndex(item=>startId?String(item.id)===String(startId):!seen.has(String(item.id)))):0;
   startQuestion();
  }
  function move(action){
   if(action==='more')startRound();
   else{index+=action==='previous'?-1:1;startQuestion()}
   host.querySelector('.learning-practice-meta')?.scrollIntoView({block:'nearest'});
   host.querySelector('[data-picture-choice]:not(:disabled), [data-order-word]:not(:disabled)')?.focus({preventScroll:true});
  }
  function scheduleAdvance(){
   clearTimeout(timer);
   if(!isPicture||!advanceAutomatically||!solved||!canAdvance())return;
   timer=setTimeout(()=>{
    if(host.isConnected&&host.closest('dialog')?.open!==false)move(index+1<round.length?'next':'more');
   },1450);
  }
  function paint(focus){
   if(!row()){
    const completed=targets.some(item=>seen.has(String(item.id)));
    host.innerHTML=`<p class="learning-practice-feedback" role="status">${completed?
     T('أكملت هذه الجمل.','You have practised these sentences.'):
     T('تحتاج المطابقة إلى جملتين بمشهدين مختلفين.','Matching needs two distinct sentences with different scenes.')}</p>
     ${completed?`<button type="button" class="secondary" data-practice-action="again">${T('أعد التدريب على هذه الجمل','Practise these sentences again')}</button>`:''}
     ${exit?`<button type="button" class="primary" data-practice-action="exit">${H(exitLabel)}</button>`:''}`;
   }else{
    const picture=pictureKey(row());
    const chapters=isPicture?`<div class="learning-picture-choices" lang="en" dir="ltr">${choices.map((choice,i)=>
     `<button type="button" class="secondary ${solved&&choice===row()?'correct':wrong===i?'incorrect':''}" data-practice-tone="${i}" data-picture-choice="${i}" ${solved||wrong===i?'disabled':''}>${pictureOption(choice)}</button>`).join('')}</div>`:
     `<div class="answerbank" lang="en" dir="ltr" aria-label="${T('ترتيبك الحالي','Your current order')}">${picked.map((number,i)=>
      `<button type="button" ${fixed.has(number)?'class="practice-pattern-tile"':''} data-order-remove="${i}" ${solved?'disabled':''}>${H(wordList[number])}</button>`).join('')}</div>
      <div class="wordbank" lang="en" dir="ltr">${wordOrder.map(number=>
       `<button type="button" ${fixed.has(number)?'class="practice-pattern-tile"':''} data-order-word="${number}" ${picked.includes(number)||solved?'disabled':''}>${H(wordList[number])}</button>`).join('')}</div>`;
    const hint=gallery&&T(row().practiceHintAr||row().practiceHint||'',row().practiceHint||row().practiceHintAr||'');
    const options=isPicture?`<div class="learning-practice-options">
     <label><input type="checkbox" data-practice-auto ${advanceAutomatically?'checked':''}> ${T('الانتقال التلقائي بعد الإجابة الصحيحة','Advance automatically after a correct answer')}</label>
     ${gallery?`<span>${T(`تمت مطابقة ${completed} من ${targets.length}`,`${completed} of ${targets.length} matched`)}</span>`:''}</div>`:'';
    host.innerHTML=`<div class="learning-practice-meta"><p>${gallery?.challenge?
     T('اختر عبارة المكتبة الأدقّ للمشهد. انتبه إلى الفعل أو الشيء أو المكان.','Choose the library sentence that fits best. Look for the action, object or place.'):
     isPicture?T('اختر الجملة التي تصف الموقف.','Choose the sentence that fits the scene.'):
     T('اختر الكلمات بالترتيب، واضغط كلمة في إجابتك لإعادتها.','Choose the words in order. Tap a word in your answer to put it back.')}</p>
     <bdi>${index+1} / ${round.length}</bdi></div>${options}
     <div class="learning-practice-question${picture?' has-picture':''}">
      ${picture?`<div class="learning-practice-visual"><div class="learning-practice-picture" role="img" aria-label="${T('صورة الموقف','Scene image')}">${rowPicture(row())}</div>
       ${hint?`<details class="learning-practice-hint"><summary>${T('تلميح عن الموقف','Scene hint')}</summary><p>${H(hint)}</p></details>`:''}</div>`:''}
      <div class="learning-practice-answer">
       ${!isPicture&&EP.prefs.arabic?EP.ar(row().ar):''}${chapters}
       <p class="learning-practice-feedback${solved?' correct':''}" role="status">${solved?
        (isPicture?T('صحيح، هذه الجملة تناسب الصورة.','Correct. This sentence matches the picture.'):
         T('رتّبت الجملة ترتيبًا صحيحًا.','You put the sentence in the right order.')):
        (wrong>=0||!isPicture&&picked.length===wordList.length?
         T('جرّب مرة أخرى.','Try again.'):'')}</p>
       <div class="learning-practice-actions">
        ${!isPicture&&!solved&&picked.length?`<button type="button" class="secondary" data-practice-action="reset">${T('أعد الترتيب','Clear order')}</button>`:''}
        ${gallery&&round.length>1?`<button type="button" class="secondary" data-practice-action="previous" ${index===0?'disabled':''}>${T('الصورة السابقة','Previous photo')}</button>`:''}
        ${(gallery||solved)&&index+1<round.length?`<button type="button" class="${solved?'primary':'secondary'}" data-practice-action="next">${gallery?
         (solved?T('الصورة التالية','Next photo'):T('تخطَّ هذه الصورة','Skip this photo')):T('الجملة التالية','Next sentence')}</button>`:''}
        ${!gallery&&solved&&index+1===round.length&&hasMore()?`<button type="button" class="secondary" data-practice-action="more">${T('تدرّب على جمل أخرى','Practise more sentences')}</button>`:''}
        ${gallery&&index+1===round.length&&completed<targets.length?`<button type="button" class="secondary" data-practice-action="more">${T('انتقل إلى أول صورة لم تُحلّ','Go to the first unmatched photo')}</button>`:''}
        ${solved&&index+1===round.length&&exit?`<button type="button" class="primary" data-practice-action="exit">${H(exitLabel)}</button>`:''}
        ${solved&&index+1===round.length&&!exit&&!hasMore()?`<p>${T('أكملت الجولة.','Round complete.')}</p>`:''}
       </div>
      </div>
     </div>`;
   }
   if(focus)(host.querySelector(focus)||host.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
  }
  host.onclick=event=>{
   const button=event.target.closest('button');
   if(!button||button.disabled)return;
   const action=button.dataset.practiceAction;
   if(action==='exit'){exit();return}
   if(action==='again'){
    for(const item of targets)seen.delete(String(item.id));
    startRound();host.querySelector('button:not(:disabled)')?.focus({preventScroll:true});return;
   }
   if(['more','next','previous'].includes(action)){move(action);return}
   if(button.hasAttribute('data-picture-choice')){
    const choice=Number(button.dataset.pictureChoice);
    if(choices[choice]===row())onResult();else wrong=choice;
   }else if(button.hasAttribute('data-order-word')){
    picked.push(Number(button.dataset.orderWord));
    if(wordOrderMatches(wordList,picked))onResult();
   }else if(button.hasAttribute('data-order-remove'))picked.splice(Number(button.dataset.orderRemove),1);
   else if(action==='reset')picked=[];
   else return;
   const hintOpen=host.querySelector('.learning-practice-hint')?.open;
   paint(solved?'[data-practice-action="next"], [data-practice-action="exit"], [data-practice-action="more"]':
    button.hasAttribute('data-order-word')?'.wordbank button:not(:disabled)':isPicture?'[data-picture-choice]:not(:disabled)':'button:not(:disabled)');
   if(hintOpen)host.querySelector('.learning-practice-hint').open=true;
   scheduleAdvance();
  };
  host.onchange=event=>{
   if(!event.target.hasAttribute('data-practice-auto'))return;
   advanceAutomatically=event.target.checked;
   try{localStorage.setItem(autoAdvanceKey,advanceAutomatically?'on':'off')}catch{}
   scheduleAdvance();
  };
  startRound(true);
  return ()=>clearTimeout(timer);
 }

 function inline(host,rows,seen){
  mount(host,{kind:'pictures',...config('pictures',rows,[]),seen});
 }

 let active;
 function open(kind,rows,{alternatives=[],seen=new Set(),onCorrect,onStart,onExit,gallery,trigger=document.activeElement,exitLabel=T('العودة إلى الاستماع','Return to listening')}={}){
  if(active)return false;
  const {targets,pool}=config(kind,rows,alternatives,gallery);
  if(!targets.length){
   toast(kind==='pictures'?T('تحتاج المطابقة إلى جملتين بمشهدين مختلفين.','Matching needs two distinct sentences with different scenes.'):
    T('استمع إلى جملة في هذا المسار أولًا.','Listen to a sentence in this route first.'));
   return false;
  }
  const dialog=document.createElement('dialog');
  dialog.className='learning-practice-dialog';
  if(gallery)dialog.dataset.pictureGallery='true';
  dialog.setAttribute('aria-labelledby','learning-practice-title');
  dialog.innerHTML=`<div class="learning-practice-header"><h2 id="learning-practice-title">${practiceTitle(kind)}</h2>
   <form method="dialog"><button class="secondary" autofocus>${H(exitLabel)}</button></form></div>
   <div class="learning-practice-content"></div>`;
  const parent=document.querySelector('dialog[open]')||document.body;
  parent.append(dialog);
  active=dialog;
  const cleanup=mount(dialog.querySelector('.learning-practice-content'),{kind,targets,pool,seen,onCorrect,gallery,exit:()=>dialog.close(),exitLabel});
  dialog.addEventListener('close',()=>{
   cleanup();
   active=null;dialog.remove();
   if(trigger?.isConnected)trigger.focus({preventScroll:true});
   onExit?.();
  },{once:true});
  onStart?.();
  dialog.showModal();
  return true;
 }

 const api={pictureKey,distinctRows,wordOrderMatches,wordBank,pictureChoices,pictureFeatures,galleryChoices,patternIndexes,nextRows,actions,inline,open};
 if(typeof module==='object')module.exports=api;
 else root.EPPractice=api;
})(globalThis);
