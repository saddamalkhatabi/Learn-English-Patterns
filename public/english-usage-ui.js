let englishAudio={sentences:{},dialogues:{}};
const englishAudioReady=epFetchJSON('english-usage-audio.json')
 .then(data=>{if(data?.schema===1)englishAudio=data}).catch(()=>{});

function englishDisplay(text,context){
 return EPEnglish.analyze(text,context)[EP.prefs.englishUsage];
}
function englishAmerican(text,context){
 return EPEnglish.analyze(text,context).us;
}
function englishSpeakable(text,context){
 // The accent stays American. Regional words shown outside a timed track can be read as written.
 return englishDisplay(text,context);
}
function englishChoiceOptions(options,context){
 const adapted=options.map(text=>englishDisplay(text,context));
 return new Set(adapted.map(text=>text.toLowerCase())).size===options.length?adapted:options;
}
function englishSessionInstruction(){
 return `Use ${EP.prefs.englishUsage==='uk'?'British':'American'} wording and American pronunciation when possible.`;
}
function englishUsageButton(usage){
 if(!usage.changes.length)return '';
 const other=EP.prefs.englishUsage==='uk'?'US':'UK';
 const label=other==='UK'?EP.t('افتح الصيغة البريطانية','Show British usage'):
  EP.t('افتح الصيغة الأمريكية','Show American usage');
 return `<button type="button" class="english-usage-badge" data-english-usage="${EP.escape(JSON.stringify(usage))}"
  aria-label="${label}" title="${label}">${other} ↔</button>`;
}
function englishTextMarkup(text,context,compare=true){
 const usage=EPEnglish.analyze(text,context);
 return `<span data-english-rendered>${EP.escape(usage[EP.prefs.englishUsage])}${compare?englishUsageButton(usage):''}</span>`;
}
function englishIndexedMarkup(text,context,renderWords,{timed=false,compare=true}={}){
 const usage=context?.englishUsage||EPEnglish.analyze(text,context);
 if(!usage.changes.length)return renderWords(text);
 const selected=usage[EP.prefs.englishUsage];
 const parallel=timed&&!EPEnglish.sameSpeech(selected,text);
 const content=parallel?
  `<span class="english-usage-primary">${EP.escape(selected)}</span>
   <small class="english-usage-audio-label" lang="${EP.prefs.language}">${EP.t('نص التسجيل الصوتي','Audio transcript')}</small>${renderWords(text)}`:
  renderWords(selected);
 return `<span data-english-rendered>${content}${compare?englishUsageButton(usage):''}</span>`;
}
function englishMarkChanges(usage,region){
 let out='',last=0;
 for(const change of usage.changes){
  const start=change[region+'From'];
  out+=EP.escape(usage[region].slice(last,start))+`<mark>${EP.escape(change[region])}</mark>`;
  last=start+change[region].length;
 }
 return out+EP.escape(usage[region].slice(last));
}
function showEnglishUsage(button){
 const data=JSON.parse(button.dataset.englishUsage);
 stopSpeech();
 const dialog=document.createElement('dialog');
 dialog.className='english-usage-dialog';
 const title=EP.t('الاستعمال الأمريكي والبريطاني','American and British usage');
 dialog.setAttribute('aria-label',title);
 const active=EP.prefs.englishUsage;
 dialog.innerHTML=`<div class="english-usage-heading"><h2>${title}</h2><form method="dialog">
  <button class="secondary" autofocus aria-label="${EP.t('إغلاق','Close')}">×</button></form></div>
  ${[active,active==='us'?'uk':'us'].map(region=>`<section>
   <b>${region==='us'?EP.t('US · أمريكي','US · American'):EP.t('UK · بريطاني','UK · British')}</b>
   <p lang="en-${region==='us'?'US':'GB'}" dir="ltr">${englishMarkChanges(data,region)}</p>
   <button class="secondary" data-english-speak="${region}">▶ ${EP.t('استمع بنطق أمريكي','Listen with American pronunciation')}</button>
  </section>`).join('')}`;
 dialog.querySelectorAll('[data-english-speak]').forEach(control=>control.addEventListener('click',()=>speak(data[control.dataset.englishSpeak])));
 document.body.append(dialog);
 dialog.addEventListener('close',()=>{stopSpeech();dialog.remove();if(button.isConnected)button.focus({preventScroll:true})},{once:true});
 dialog.showModal();
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button.english-usage-badge');
 if(button)showEnglishUsage(button);
});

function decorateEnglishUsage(){
 const selector='.bilingual [lang="en"],.pattern-form[lang="en"],.exam-prompt,#idea-lab-task p[lang="en"]';
 for(const element of document.querySelectorAll(selector)){
  if(element.childElementCount||element.closest('[data-english-rendered],.english-usage-dialog'))continue;
  const source=element.textContent;
  const usage=EPEnglish.analyze(source);
  if(!usage.changes.length)continue;
  if(element.matches('button,.choice'))continue;
  element.innerHTML=englishTextMarkup(source);
 }
}

function projectEnglishSentence(row){
 return EPEnglish.projectSentence(row,englishAudio.sentences[row.id]);
}
function projectEnglishDialogue(row,audio){
 const title=EPEnglish.analyze(row.en,row);
 const lines=row.lines.map(line=>({line,usage:EPEnglish.analyze(line.en,line)}));
 const signature=lines.map(({line,usage})=>[usage.us,line.voice]);
 const replacement=englishAudio.dialogues[row.id];
 const canReplace=replacement&&JSON.stringify(replacement.signature)===JSON.stringify(signature);
 const spokenTitle=title.us.trim().replace(/[.!?]+$/,'')+'.';
 const canReuse=audio&&EPEnglish.sameSpeech(audio.title,spokenTitle)&&
  lines.every(({line,usage})=>EPEnglish.sameSpeech(line.en,usage.us));
 const recording=canReplace?replacement:canReuse?{...audio,signature,title:spokenTitle}:audio;
 return {...row,en:title.us,englishUsage:title,audio:recording,regionalAudio:Boolean(canReplace),
  lines:lines.map(({line,usage})=>({...line,englishUsage:usage,
   en:canReplace||canReuse||!audio?usage.us:line.en,
   focus:line.en.split(/\s+/).length===usage.us.split(/\s+/).length?line.focus:undefined}))};
}
