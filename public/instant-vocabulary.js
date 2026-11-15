let instantIndexPromise,instantDictionaryPromise,instantLookup,instantAudio,instantFirstClick,instantLastGesture,instantPointerType;
const instantTextControls='button,a[href],summary,label[for],[role="button"]';
const instantTextSkip='script,style,[hidden],[aria-hidden="true"],select,input[type="password"],audio,video,.instant-vocabulary';

function loadInstantIndex(){
 if(!instantIndexPromise)instantIndexPromise=loadVocabulary().then(data=>{
  if(data)return EPInstantVocabulary.index(data);
  instantIndexPromise=null;
  return EPInstantVocabulary.index({entries:[],sources:[]});
 });
 return instantIndexPromise;
}

function loadInstantDictionary(){
 if(!instantDictionaryPromise)instantDictionaryPromise=fetch('instant-dictionary.json').then(response=>{
  if(!response.ok)throw Error('dictionary');
  return response.json();
 }).catch(()=>{instantDictionaryPromise=null;return {}});
 return instantDictionaryPromise;
}

function instantTextContext(event){
 const target=event.target;
 if(!(target instanceof Element)||target.closest(instantTextSkip))return null;
 const editable=target.closest('textarea,input');
 if(editable){
  if(typeof editable.selectionStart!=='number'||editable.selectionStart===editable.selectionEnd)return null;
  return {target,text:editable.value,offset:editable.selectionStart,rect:editable.getBoundingClientRect()};
 }
 const caret=document.caretPositionFromPoint?.(event.clientX,event.clientY)||document.caretRangeFromPoint?.(event.clientX,event.clientY);
 const node=caret?.offsetNode||caret?.startContainer,offset=caret?.offset??caret?.startOffset;
 if(node?.nodeType!==Node.TEXT_NODE||!target.contains(node)&&!node.parentElement.contains(target))return null;
 let block=node.parentElement;
 while(block.parentElement&&getComputedStyle(block).display==='inline'&&!block.matches(instantTextControls))block=block.parentElement;
 const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode:part=>
  part.parentElement.closest(instantTextSkip)||getComputedStyle(part.parentElement).display==='none'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 let text='',position=-1;
 const nodes=[];
 while(walker.nextNode()){
  const part=walker.currentNode,start=text.length;
  if(part===node)position=start+offset;
  text+=part.data;
  if(part.length)nodes.push({part,start,end:text.length});
 }
 function rangeFor(start,end){
  const first=nodes.find(part=>part.start<=start&&start<part.end),last=nodes.find(part=>part.start<end&&end<=part.end);
  if(!first||!last)return null;
  const range=document.createRange();
  range.setStart(first.part,start-first.start);range.setEnd(last.part,end-last.start);
  return range;
 }
 const nearby=EPInstantVocabulary.words(text).filter(word=>word.start<=position&&position<=word.end);
 const hit=nearby.find(word=>[...(rangeFor(word.start,word.end)?.getClientRects()||[])].some(rect=>
  rect.left-2<=event.clientX&&rect.right+2>=event.clientX&&rect.top-2<=event.clientY&&rect.bottom+2>=event.clientY));
 if(!hit)return null;
 const specificTarget=target.closest('[data-idea-vocab],[data-word].idea-map-point');
 const specific=specificTarget?currentIdeaScene()?.words[Number(specificTarget.dataset.ideaVocab??specificTarget.dataset.word)]:null;
 return {text,offset:Math.min(position,hit.end-1),target,rangeFor,specific,rect:rangeFor(hit.start,hit.end)?.getBoundingClientRect()};
}

function closeInstantVocabulary(){
 const popup=instantLookup?.popup;
 instantLookup=null;
 popup?.remove();
 globalThis.CSS?.highlights?.delete('instant-vocabulary-selection');
 instantAudio?.stop();instantAudio=null;
}

function positionInstantVocabulary(popup,anchor){
 const gap=8,screenWidth=document.documentElement.clientWidth,screenHeight=window.innerHeight;
 const x=Math.max(gap,Math.min(anchor.left,screenWidth-popup.offsetWidth-gap));
 const bottom=anchor.bottom+gap;
 const y=bottom+popup.offsetHeight<=screenHeight-gap?bottom:Math.max(gap,anchor.top-popup.offsetHeight-gap);
 popup.style.left=x+'px';popup.style.top=y+'px';
}

function moveInstantHighlight(session,match){
 const range=session.context.rangeFor?.(match.start,match.end);
 if(!range)return;
 if(globalThis.Highlight&&globalThis.CSS?.highlights){
  CSS.highlights.set('instant-vocabulary-selection',new Highlight(range));
  const selection=window.getSelection();
  if(selection?.rangeCount&&selection.getRangeAt(0).intersectsNode(range.commonAncestorContainer))selection.removeAllRanges();
 }else{
  const selection=window.getSelection();
  selection?.removeAllRanges();selection?.addRange(range);
 }
 session.anchor=range.getBoundingClientRect();
 positionInstantVocabulary(session.popup,session.anchor);
}

function pronounceInstantVocabulary(session){
 if(instantLookup!==session)return;
 const {result,match}=session;
 stopSpeech();
 if(match.lang==='ar'){
  if(!('speechSynthesis' in window))return;
  const utterance=new SpeechSynthesisUtterance(match.text);
  utterance.lang='ar';utterance.rate=state.rate||1;
  const arabicVoice=speechSynthesis.getVoices().find(voice=>voice.lang.toLowerCase().startsWith('ar'));
  if(arabicVoice)utterance.voice=arabicVoice;
  speechSynthesis.speak(utterance);
  instantAudio={stop:()=>speechSynthesis.cancel()};
  return;
 }
 const voice=state.voice===1?'female':'male',alternate=voice==='male'?'female':'male';
 const recording=result?.entry?.audio[voice]||result?.entry?.audio[alternate];
 const text=match.text;
 if(recording&&EPInstantVocabulary.key(recording.text)===EPInstantVocabulary.key(text)){
  const player=playVocabularyClip(recording);
  instantAudio=player;
  player.done.then(ok=>{
   if(!ok&&instantLookup===session&&instantAudio===player)instantAudio=synthesizeTrainingCue(text,state.rate||1,voice);
  });
 }else instantAudio=synthesizeTrainingCue(text,state.rate||1,voice);
}

function paintInstantVocabulary(session,indexed){
 if(instantLookup!==session)return;
 const {popup,match,result}=session,related=result?.entry?EPInstantVocabulary.related(indexed,result.entry):[];
 const value=match.lang==='en'?result?.ar:result?.entry?.en||result?.en;
 const type=result?.entry?wordTypeBadge(result.entry):wordTypeBadge({pos:'X'});
 const entry=result?.entry,forms=entry&&['VERB','AUX','CONTR','PHRASE'].includes(entry.pos)?
  (PILOT?.patterns||[]).filter(pattern=>entry.patternIds.includes(pattern.id)&&
   [entry.en,entry.lemma].some(term=>term&&EPVocabulary.includesTerm(pattern.form.split('+')[0],term))).slice(0,2):[];
 popup.querySelector('.instant-vocabulary-body').innerHTML=`
  <div class="instant-vocabulary-heading"><b lang="${match.lang}" dir="auto">${H(match.text)}</b>${type}</div>
  ${value?`<p lang="${match.lang==='en'?'ar':'en'}" dir="auto">${H(value)}</p>`:
   `<p>${T('لا تتوفر ترجمة لهذه الصيغة في المعجم.','This form has no dictionary translation.')}</p>`}
  ${result?.entry?.expansion?`<p lang="en" dir="ltr">${H(result.entry.expansion)}</p>`:''}
  ${related.length||forms.length?`<strong>${T('تراكيب شائعة','Common expressions')}</strong><ul>${forms.map(pattern=>
   `<li class="pattern-token" lang="en" dir="ltr">${H(pattern.form)}</li>`).join('')}${related.slice(0,3-forms.length).map(item=>
   `<li><b lang="en" dir="ltr">${H(item.en)}</b><span lang="ar" dir="rtl">${H(item.ar)}</span></li>`).join('')}</ul>`:''}
  <div class="buttonrow">
   <button class="secondary" type="button" data-instant-audio>▶ ${T('انطق','Pronounce')}</button>
   ${result?.entry&&value?`<button class="textlink" type="button" data-instant-atlas>${T('افتح في الأطلس','Open in atlas')} ↗</button>`:''}
  </div>
  ${result?.dictionary?`<small><a href="dictionaries/README.txt" target="_blank" rel="noopener noreferrer">FreeDict</a></small>`:''}`;
 popup.querySelector('[data-instant-audio]').addEventListener('click',()=>pronounceInstantVocabulary(session));
 popup.querySelector('[data-instant-atlas]')?.addEventListener('click',()=>{
  closeInstantVocabulary();openVocabularyFromScene(result.entry.id);
 });
 positionInstantVocabulary(popup,session.anchor);
}

async function showInstantVocabulary(context,initial){
 closeInstantVocabulary();
 const popup=document.createElement('aside');
 popup.className='instant-vocabulary';
 popup.setAttribute('aria-label',T('الترجمة الفورية','Instant vocabulary'));
 popup.setAttribute('popover','manual');
 popup.innerHTML=`<button type="button" class="secondary instant-vocabulary-close" aria-label="${T('أغلق الترجمة','Close translation')}">×</button>
  <div class="instant-vocabulary-body" aria-live="polite"><p>${T('جارٍ البحث في المعجم…','Looking up the expression…')}</p></div>`;
 (context.target.closest('dialog[open]')||document.body).append(popup);
 try{if(typeof popup.showPopover==='function')popup.showPopover();else popup.removeAttribute('popover')}
 catch{popup.removeAttribute('popover')}
 popup.querySelector('.instant-vocabulary-close').addEventListener('click',closeInstantVocabulary);
 const session={popup,context,match:initial,anchor:context.rect};
 instantLookup=session;
 positionInstantVocabulary(popup,session.anchor);
 const indexed=await loadInstantIndex();
 if(instantLookup!==session||!context.target.isConnected){if(instantLookup===session)closeInstantVocabulary();return}
 const match=EPInstantVocabulary.select(indexed,context.text,context.offset);
 if(!match){closeInstantVocabulary();return}
 session.match=match;
 session.result=EPInstantVocabulary.best(indexed,match,context.text,context.specific);
 moveInstantHighlight(session,match);
 pronounceInstantVocabulary(session);
 if(match.lang==='en'?!session.result?.ar:!session.result){
  const dictionary=await loadInstantDictionary();
  if(instantLookup!==session)return;
  const fallback=EPInstantVocabulary.dictionaryResult(dictionary,match);
  if(fallback)session.result={...session.result,...fallback,dictionary:true};
 }
 paintInstantVocabulary(session,indexed);
}

function instantGesture(event,context=instantTextContext(event)){
 if(!context)return false;
 const word=EPInstantVocabulary.words(context.text).find(part=>part.start<=context.offset&&context.offset<part.end);
 if(!word)return false;
 const now=performance.now(),previous=instantLastGesture;
 const repeated=previous&&now-previous.time<220&&Math.hypot(previous.x-event.clientX,previous.y-event.clientY)<12;
 if(repeated)return true;
 const gesture={time:now,x:event.clientX,y:event.clientY};
 instantLastGesture=gesture;
 const initial={...word,lang:EPInstantVocabulary.language(word.text)};
 if(initial.lang==='en'&&['a','an','the'].includes(word.key)){
  loadInstantIndex().then(indexed=>{
   if(instantLastGesture===gesture&&context.target.isConnected&&EP.prefs.instantVocabulary&&
    EPInstantVocabulary.select(indexed,context.text,context.offset))showInstantVocabulary(context,initial);
  });
 }else showInstantVocabulary(context,initial);
 return true;
}

document.addEventListener('click',event=>{
 if(!EP.prefs.instantVocabulary||!event.isTrusted||!(event.target instanceof Element)||event.detail===0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||
  event.target.closest('.instant-vocabulary'))return;
 const context=instantTextContext(event);
 if(!context)return;
 if(!instantIndexPromise)loadInstantIndex();
 const now=performance.now(),first=instantFirstClick;
 const double=event.detail>1||(event.pointerType||instantPointerType)==='touch'&&first&&now-first.time<=380&&
  Math.hypot(first.x-event.clientX,first.y-event.clientY)<=22;
 if(double){
  if(first?.timer)clearTimeout(first.timer);
  instantFirstClick=null;
  if(instantGesture(event,context)){event.preventDefault();event.stopImmediatePropagation()}
  return;
 }
 const control=event.target.closest(instantTextControls);
 const click={time:now,x:event.clientX,y:event.clientY};
 instantFirstClick=click;
 if(!control)return;
 event.preventDefault();event.stopImmediatePropagation();
 const target=event.target;
 click.timer=setTimeout(()=>{
  if(instantFirstClick===click)instantFirstClick=null;
  if(target.isConnected)target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,
   button:0,clientX:click.x,clientY:click.y}));
 },380);
},true);

document.addEventListener('dblclick',event=>{
 if(EP.prefs.instantVocabulary&&instantGesture(event)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
document.addEventListener('pointerdown',event=>{
 instantPointerType=event.pointerType;
 if(instantLookup&&!instantLookup.popup.contains(event.target))closeInstantVocabulary();
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&instantLookup){closeInstantVocabulary();event.preventDefault();event.stopPropagation()}
},true);
window.addEventListener('hashchange',closeInstantVocabulary);
window.addEventListener('resize',closeInstantVocabulary);
document.addEventListener('scroll',event=>{
 if(instantLookup&&!instantLookup.popup.contains(event.target))closeInstantVocabulary();
},true);
const stopBeforeInstantVocabulary=stopSpeech;
stopSpeech=function(){instantAudio?.stop();instantAudio=null;stopBeforeInstantVocabulary()};
