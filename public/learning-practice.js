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

 function distinctRows(rows,kind){
  const texts=new Set(),pictures=new Set(),ids=new Set();
  return rows.filter(row=>{
   const text=row?.en?.trim().toLowerCase().replace(/[.!?]+$/,'');
   if(!row?.id||!text||ids.has(row.id)||texts.has(text))return false;
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

 function config(kind,rows,alternatives){
  const eligible=distinctRows(rows,kind);
  const pool=distinctRows([...eligible,...alternatives],kind);
  const targets=kind==='pictures'&&pool.length<2?[]:eligible;
  return {targets,pool};
 }

 function mount(host,{kind,targets,pool,seen,onCorrect,exit,exitLabel,limit=5}){
  let round=[],index=0,wordOrder=[],picked=[],choices=[],solved=false,wrong=-1;
  const row=()=>round[index];
  const words=()=>englishDisplay(row().en,row()).trim().split(/\s+/);
  const onResult=()=>{
   solved=true;
   const id=String(row().id);
   seen.add(id);
   onCorrect?.(id);
  };
  function startQuestion(){
   solved=false;wrong=-1;picked=[];
   if(row()){
    if(kind==='pictures')choices=pictureChoices(row(),pool);
    else wordOrder=wordBank(words());
   }
   paint();
  }
  function startRound(){round=nextRows(targets,seen,limit);index=0;startQuestion()}
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
    const isPicture=kind==='pictures';
    const chapters=isPicture?`<div class="learning-picture-choices" lang="en" dir="ltr">${choices.map((choice,i)=>
     `<button type="button" class="secondary ${solved&&choice===row()?'correct':wrong===i?'incorrect':''}" data-picture-choice="${i}" ${solved||wrong===i?'disabled':''}>${H(englishDisplay(choice.en,choice))}</button>`).join('')}</div>`:
     `<div class="answerbank" lang="en" dir="ltr" aria-label="${T('ترتيبك الحالي','Your current order')}">${picked.map((number,i)=>
      `<button type="button" data-order-remove="${i}" ${solved?'disabled':''}>${H(words()[number])}</button>`).join('')}</div>
      <div class="wordbank" lang="en" dir="ltr">${wordOrder.map(number=>
       `<button type="button" data-order-word="${number}" ${picked.includes(number)||solved?'disabled':''}>${H(words()[number])}</button>`).join('')}</div>`;
    host.innerHTML=`<div class="learning-practice-meta"><p>${isPicture?
     T('اختر الجملة التي تصف الموقف.','Choose the sentence that fits the scene.'):
     T('اختر الكلمات بالترتيب، واضغط كلمة في إجابتك لإعادتها.','Choose the words in order. Tap a word in your answer to put it back.')}</p>
     <bdi>${index+1} / ${round.length}</bdi></div>
     <div class="learning-practice-question${picture?' has-picture':''}">
      ${picture?`<div class="learning-practice-picture" role="img" aria-label="${T('صورة الموقف','Scene image')}">${rowPicture(row())}</div>`:''}
      <div class="learning-practice-answer">
       ${!isPicture&&EP.prefs.arabic?EP.ar(row().ar):''}${chapters}
       <p class="learning-practice-feedback${solved?' correct':''}" role="status">${solved?
        (isPicture?T('صحيح، هذه الجملة تناسب الصورة.','Correct. This sentence matches the picture.'):
         T('رتّبت الجملة ترتيبًا صحيحًا.','You put the sentence in the right order.')):
        (wrong>=0||!isPicture&&picked.length===words().length?
         T('جرّب مرة أخرى.','Try again.'):'')}</p>
       <div class="learning-practice-actions">
        ${!isPicture&&!solved&&picked.length?`<button type="button" class="secondary" data-practice-action="reset">${T('أعد الترتيب','Clear order')}</button>`:''}
        ${solved&&index+1<round.length?`<button type="button" class="primary" data-practice-action="next">${T('الجملة التالية','Next sentence')}</button>`:''}
        ${solved&&index+1===round.length&&nextRows(targets,seen,1).length?`<button type="button" class="secondary" data-practice-action="more">${T('تدرّب على جمل أخرى','Practise more sentences')}</button>`:''}
        ${solved&&index+1===round.length&&exit?`<button type="button" class="primary" data-practice-action="exit">${H(exitLabel)}</button>`:''}
        ${solved&&index+1===round.length&&!exit?`<p>${T('أكملت الجولة.','Round complete.')}</p>`:''}
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
   if(action==='more'||action==='next'){
    if(action==='more')startRound();else{index++;startQuestion()}
    host.querySelector('.learning-practice-meta')?.scrollIntoView({block:'nearest'});
    host.querySelector('button:not(:disabled)')?.focus({preventScroll:true});return;
   }
   if(button.hasAttribute('data-picture-choice')){
    const choice=Number(button.dataset.pictureChoice);
    if(choices[choice]===row())onResult();else wrong=choice;
   }else if(button.hasAttribute('data-order-word')){
    picked.push(Number(button.dataset.orderWord));
    if(wordOrderMatches(words(),picked))onResult();
   }else if(button.hasAttribute('data-order-remove'))picked.splice(Number(button.dataset.orderRemove),1);
   else if(action==='reset')picked=[];
   else return;
   paint(solved?'[data-practice-action="next"], [data-practice-action="exit"], [data-practice-action="more"]':
    button.hasAttribute('data-order-word')?'.wordbank button:not(:disabled)':'button:not(:disabled)');
  };
  startRound();
 }

 function inline(host,rows,seen){
  mount(host,{kind:'pictures',...config('pictures',rows,[]),seen});
 }

 let active;
 function open(kind,rows,{alternatives=[],seen=new Set(),onCorrect,onStart,onExit,trigger=document.activeElement,exitLabel=T('العودة إلى الاستماع','Return to listening')}={}){
  if(active)return false;
  const {targets,pool}=config(kind,rows,alternatives);
  if(!targets.length){
   toast(kind==='pictures'?T('تحتاج المطابقة إلى جملتين بمشهدين مختلفين.','Matching needs two distinct sentences with different scenes.'):
    T('استمع إلى جملة في هذا المسار أولًا.','Listen to a sentence in this route first.'));
   return false;
  }
  const dialog=document.createElement('dialog');
  dialog.className='learning-practice-dialog';
  dialog.setAttribute('aria-labelledby','learning-practice-title');
  dialog.innerHTML=`<div class="learning-practice-header"><h2 id="learning-practice-title">${practiceTitle(kind)}</h2>
   <form method="dialog"><button class="secondary" autofocus>${H(exitLabel)}</button></form></div>
   <div class="learning-practice-content"></div>`;
  const parent=document.querySelector('dialog[open]')||document.body;
  parent.append(dialog);
  active=dialog;
  mount(dialog.querySelector('.learning-practice-content'),{kind,targets,pool,seen,onCorrect,exit:()=>dialog.close(),exitLabel});
  dialog.addEventListener('close',()=>{
   active=null;dialog.remove();
   if(trigger?.isConnected)trigger.focus({preventScroll:true});
   onExit?.();
  },{once:true});
  onStart?.();
  dialog.showModal();
  return true;
 }

 const api={pictureKey,distinctRows,wordOrderMatches,wordBank,pictureChoices,nextRows,actions,inline,open};
 if(typeof module==='object')module.exports=api;
 else root.EPPractice=api;
})(globalThis);
