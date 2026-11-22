/* Local suggestions use the same values understood by each page's existing filter. */
const EPSearch=(()=>{
 const normalize=normalizeSearchTerm;
 const entries=(rows,format)=>rows.flatMap(row=>{
  const item=format(row);
  return item.value?[item]:[];
 });
 const patternsForSearch=(rows=patterns)=>entries(rows,p=>({value:p.form,ar:p.ar,
  extra:[p.meaning,p.topic,learningMeta(p.id)?.keywords].flat().join(' '),open:()=>openPatternLesson(p.id)}));
 const corpusForSearch=(rows=REFERENCE_CORPUS?.sentences||[])=>entries(rows,row=>({value:row.en,ar:row.ar,
  extra:[row.englishUsage?.uk,...row.keywords,referenceGuide(row).form,...row.source_ids].join(' '),
  open:()=>openLinkedLearning('reference',row.id)}));
 const vocabularyForSearch=(rows=vocabularyAllEntries)=>entries(rows,word=>({value:vocabularyEntryName(word),ar:word.ar,
  extra:vocabularySearch.get(word.id),open:()=>openLinkedLearning('atlas',word.id)}));
 const scenesForSearch=()=>[
  ...entries(PILOT?.sentences||[],row=>({value:row.en,ar:row.ar,extra:row.context,open:()=>openLinkedLearning('photo',row.id)})),
  ...entries(REFERENCE_CORPUS?.sentences||[],row=>({value:row.en,ar:row.ar,extra:row.keywords.join(' '),open:()=>openLinkedLearning('photo',row.id)})),
  ...entries(ideaLibrary?.scenes||[],scene=>({value:scene.en,ar:scene.ar,extra:[scene.sentenceEn,scene.sentenceAr].join(' '),
   open:()=>openLinkedLearning('scene',scene.id)}))
 ];
 const dialoguesForSearch=(rows=dialogueEntries())=>entries(rows,entry=>({value:entry.en,ar:entry.ar,
  extra:[entry.taskEn,entry.taskAr,...(entry.dialogue?.lines||[]).flatMap(line=>[line.en,line.ar])].join(' '),
  open:entry.dialogue?()=>openLinkedLearning('dialogue',entry.id):null}));
 const purposesForSearch=()=>EPPurposes.groups.flatMap(group=>[
  [group.id,group.ar,group.en],...group.items
 ]).map(([id,ar,en])=>({value:en,ar,open:()=>{selectPurpose(id);navigate('purposes')}}));
 function openFilteredPage(target,scope,query,defaults){
  EPFilters.save(scope,{...EPFilters.read(scope,defaults),query});
  navigate(target);
 }
 const routesForSearch=()=>entries(CURRICULUM?.routes||[],row=>({value:row.title,extra:row.keywords.join(' '),
  open:()=>openFilteredPage('routes','purposes',row.title,{tag:''})}));
 const curriculumForSearch=(rows=COURSE_CATALOG?.patterns||[])=>entries(rows,row=>({value:row.form,ar:row.title,extra:row.keywords?.join(' ')}));
 const journeysForSearch=()=>entries(studioJourneyRows(),row=>({value:row.dialogue.en,ar:row.dialogue.ar,extra:row.search}));
 const originalsForSearch=()=>entries(sources,row=>({value:row.text,extra:`${row.id} ${row.rule}`}));
 const comparisonsForSearch=()=>entries(patternComparisons,item=>({value:item.en,ar:item.ar,extra:item.examples.join(' '),
  open:()=>openFilteredPage('comparisons','comparisons',item.en,{level:'',type:'',size:'',purpose:''})}));
 const songsForSearch=()=>entries(songSearchRows,song=>({value:song.title,ar:song.topicAr,extra:song.topicEn,
  open:()=>{navigate('songs');filterSongsByTitle(song.title)}}));
 const advancedForSearch=(section,rows)=>entries(rows,row=>({value:row.en,ar:row.ar,extra:[row.uk,row.ruleAr,row.ruleEn,row.example].join(' '),
  open:()=>{navigate('advanced');openAdvancedItem(section,row.id)}}));
 const libraries={
  'pattern-search':()=>patternsForSearch(patterns.filter(pattern=>{
   const level=$('#level-filter')?.value;
   return (!level||learningLevels.patterns[pattern.id]===level)&&matchesLearningPurpose($('#purpose-filter')?.value,[pattern.id]);
  })),'teacher-pattern-search':patternsForSearch,
  'reference-search':()=>epReference.section==='patterns'?curriculumForSearch(referencePatterns('')):corpusForSearch(referenceRows('')),
  'vocabulary-query':()=>vocabularyForSearch(vocabularyAllEntries.filter(matchesVocabularyEntry)),
  'scene-studio-query':scenesForSearch,'scene-search':scenesForSearch,
  'studio-journey-query':journeysForSearch,'dialogue-query':()=>dialoguesForSearch(filteredDialogueEntries('')),'purpose-search':routesForSearch,
  'ep-pattern-query':curriculumForSearch,'curriculum-search':curriculumForSearch,'source-search':originalsForSearch,
  'purpose-tree-query':purposesForSearch,'song-search':songsForSearch,'comparison-search':comparisonsForSearch,
  'advanced-query':()=>advancedForSearch(advancedSection(),advancedRows('')),
  'site-search-input':()=>[...patternsForSearch(),...corpusForSearch(),...vocabularyForSearch(),...scenesForSearch(),
   ...dialoguesForSearch().filter(item=>item.open),...purposesForSearch(),...songsForSearch(),...routesForSearch(),...comparisonsForSearch(),
   ...['phrases','grammar','idioms','comparisons'].flatMap(section=>advancedForSearch(section,EPAdvanced[section]))]
 };
 let field,menu,options=[],active=-1;
 function closeSuggestions(){
  if(field){
   field.setAttribute('aria-expanded','false');
   field.removeAttribute('aria-activedescendant');
   field.removeAttribute('aria-controls');
  }
  menu?.remove();
  field=menu=null;active=-1;
 }
 function reposition(){
  if(!menu||!field)return;
  const rect=field.getBoundingClientRect(),available=window.innerHeight-rect.bottom;
  const above=available<170&&rect.top>available;
  const viewport=document.documentElement.clientWidth,maxWidth=viewport-20;
  const width=Math.min(maxWidth,Math.max(rect.width,290));
  menu.style.width=`${width}px`;
  menu.style.left=`${Math.max(10,Math.min(rect.left,viewport-width-10))}px`;
  menu.style.maxHeight=`${Math.max(70,Math.min(320,(above?rect.top:available)-12))}px`;
  menu.style.top=above?`${Math.max(6,rect.top-menu.offsetHeight-4)}px`:`${rect.bottom+4}px`;
 }
 function showSuggestions(input){
  const provider=libraries[input.id],query=normalize(input.value);
  if(!provider||query.length<2){closeSuggestions();return}
  const tokens=query.split(' '),ranked=new Map();
  const local=input.id!=='site-search-input';
  for(const item of provider()){
   const title=normalize(item.value),ar=normalize(item.ar),extra=normalize(item.extra);
   const visible=title+' '+ar;
   if(!tokens.every(word=>visible.includes(word)||extra.includes(word)))continue;
   const rank=title===query||ar===query?0:title.startsWith(query)||ar.startsWith(query)?1:
    visible.split(' ').some(word=>word.startsWith(query))?2:visible.includes(query)?3:4;
   const key=title+'|'+ar;
   const previous=ranked.get(key);
   if(!previous||rank<previous.rank)ranked.set(key,{item,rank});
  }
  closeSuggestions();
  options=[...ranked.values()].sort((a,b)=>a.rank-b.rank||a.item.value.length-b.item.value.length)
   .slice(0,8).map(({item})=>item);
  if(!options.length)return;
  field=input;
  menu=document.createElement('div');
  menu.id='ep-search-suggestions';
  menu.className='ep-search-suggestions';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label',T('اقتراحات البحث','Search suggestions'));
  for(const [index,item] of options.entries()){
   const option=document.createElement('div'),title=document.createElement('bdi');
   option.id=`ep-search-result-${index}`;
   option.setAttribute('role','option');
   option.setAttribute('aria-selected','false');
   title.textContent=item.value;
   option.append(title);
   if(item.ar&&item.ar!==item.value){
    const subtitle=document.createElement('bdi');
    subtitle.lang='ar';subtitle.textContent=item.ar;option.append(subtitle);
   }
   option.onpointerdown=event=>event.preventDefault();
   option.onclick=()=>choose(index,local);
   menu.append(option);
  }
  (input.closest('dialog')||document.body).append(menu);
  input.setAttribute('aria-expanded','true');
  input.setAttribute('aria-controls',menu.id);
  reposition();
 }
 function choose(index,local){
  const input=field,item=options[index];
  if(!input||!item)return;
  closeSuggestions();
  if(!local&&item.open){
   input.closest('dialog').close();
   item.open();
   return;
  }
  input.value=normalize(item.ar).includes(normalize(input.value))&&item.ar?item.ar:item.value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  closeSuggestions();
 }
 function bindSuggestions(){
  for(const input of document.querySelectorAll('input[id]')){
   if(!libraries[input.id]||input.getAttribute('role')==='combobox')continue;
   input.setAttribute('role','combobox');
   input.setAttribute('aria-autocomplete','list');
   input.setAttribute('aria-expanded','false');
   input.setAttribute('autocomplete','off');
   if(!input.labels?.length&&!input.hasAttribute('aria-label')&&input.placeholder)input.setAttribute('aria-label',input.placeholder);
  }
 }
 document.addEventListener('input',event=>{
  if(!event.isComposing&&libraries[event.target.id])showSuggestions(event.target);
 });
 document.addEventListener('compositionend',event=>{
  if(libraries[event.target.id])showSuggestions(event.target);
 });
 document.addEventListener('focusin',event=>{
  if(libraries[event.target.id])showSuggestions(event.target);
  else if(field&&event.target!==field)closeSuggestions();
 });
 document.addEventListener('pointerdown',event=>{
  if(field&&event.target!==field&&!menu?.contains(event.target))closeSuggestions();
 });
 document.addEventListener('keydown',event=>{
  if(event.target!==field||!menu)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSuggestions();return}
  if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active,field.id!=='site-search-input');return}
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
  event.preventDefault();
  if(active>=0)menu.children[active].setAttribute('aria-selected','false');
  active=active<0?(event.key==='ArrowDown'?0:options.length-1):
   (active+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
  const option=menu.children[active];
  option.setAttribute('aria-selected','true');
  field.setAttribute('aria-activedescendant',option.id);
  const bounds=menu.getBoundingClientRect(),row=option.getBoundingClientRect();
  if(row.top<bounds.top)menu.scrollTop+=row.top-bounds.top;
  else if(row.bottom>bounds.bottom)menu.scrollTop+=row.bottom-bounds.bottom;
 });
 window.addEventListener('resize',reposition);
 document.addEventListener('scroll',reposition,true);
 window.addEventListener('hashchange',closeSuggestions);

 const mounted=new Set(),selections=new WeakMap();
 const jquery=window.jQuery;
 const loader=jquery?.fn.select2?.amd;
 let NativeSelect;
 if(loader){
  const Adapter=loader.require('select2/data/select'),utils=loader.require('select2/utils');
  NativeSelect=function(...args){Adapter.apply(this,args)};
  utils.Extend(NativeSelect,Adapter);
  NativeSelect.prototype.select=function(data){
   const select=this.$element[0];
   select.value=data.id;
   select.dispatchEvent(new Event('input',{bubbles:true}));
   select.dispatchEvent(new Event('change',{bubbles:true}));
  };
 }
 function matchSelect(params,item){
  const terms=normalize(params.term).split(' ').filter(Boolean);
  if(!terms.length)return item;
  if(item.children){
   const children=item.children.map(child=>matchSelect(params,child)).filter(Boolean);
   return children.length?{...item,children}:null;
  }
  return terms.every(term=>normalize(item.text).includes(term))?item:null;
 }
 function mountSelect(select){
  const control=jquery(select);
  control.select2({
   dataAdapter:NativeSelect,dropdownParent:jquery(select.closest('dialog')||document.body),
   minimumResultsForSearch:4,dir:select.dir||document.documentElement.dir,matcher:matchSelect,width:'style',
   language:{noResults:()=>T('لا توجد نتائج','No results')}
  });
  mounted.add(select);
  const selection=control.next().find('[role=combobox]');
  const name=select.getAttribute('aria-label')||[...(select.labels?.[0]?.childNodes||[])]
   .filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent.trim()).join(' ').trim();
  if(name)selection.attr('aria-label',name);
  control.on('select2:open.epSearch',()=>{
   const input=select.closest('dialog')?.querySelector('.select2-container--open .select2-search__field')||
    document.querySelector('.select2-container--open .select2-search__field');
   if(input){input.placeholder=T('ابحث في الخيارات','Search options');input.setAttribute('aria-label',input.placeholder)}
  });
 }
 function refresh(){
  if(field&&!field.isConnected)closeSuggestions();
  bindSuggestions();
  if(!NativeSelect)return;
  for(const select of mounted){
   if(select.isConnected)continue;
   const control=jquery(select).off('.epSearch');
   if(control.data('select2'))control.select2('destroy');
   mounted.delete(select);
  }
  for(const select of document.querySelectorAll('select:not([multiple]):not([size]):not([data-native-select])')){
   const control=jquery(select);
   if(!mounted.has(select)){
    if(select.options.length<4||!select.getClientRects().length)continue;
    mountSelect(select);
   }
   const current=select.selectedOptions[0];
   const stamp=[current?.value,current?.textContent,select.disabled].join('|');
   if(selections.get(select)!==stamp){
    selections.set(select,stamp);
    control.trigger('change.select2');
   }
  }
 }
 let frame;
 function scheduleRefresh(){
  if(frame)return;
  frame=requestAnimationFrame(()=>{frame=null;refresh()});
 }
 const fields='select,option,optgroup,input[id]';
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.type==='attributes'||record.target.closest?.('select')||
   [...record.addedNodes,...record.removedNodes].some(node=>node.matches?.(fields)||node.querySelector?.(fields))))scheduleRefresh();
 });
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','disabled','selected']});
 document.addEventListener('input',scheduleRefresh);
 document.addEventListener('change',scheduleRefresh);
 document.addEventListener('click',scheduleRefresh);
 scheduleRefresh();
 return {refreshSuggestions:()=>{if(field)showSuggestions(field)}};
})();

function openSiteSearch(){
 if($('#site-search-dialog'))return;
 const trigger=document.activeElement,dialog=document.createElement('dialog');
 dialog.id='site-search-dialog';
 dialog.className='site-search-dialog';
 dialog.setAttribute('aria-labelledby','site-search-title');
 dialog.innerHTML=`<form method="dialog" class="buttonrow">
  <h2 id="site-search-title">${T('بحث في الموقع','Search the site')}</h2>
  <button class="secondary" type="submit">${T('إغلاق','Close')}</button></form>
  <label for="site-search-input">${T('ابحث في الدروس والجمل والمفردات والمشاهد','Find lessons, sentences, words and scenes')}</label>
  <input id="site-search-input" type="search" autofocus autocomplete="off">`;
 document.body.append(dialog);
 dialog.addEventListener('close',()=>{
  dialog.remove();
  if(!document.querySelector('dialog[open]'))trigger?.focus({preventScroll:true});
 },{once:true});
 dialog.showModal();
 Promise.all([loadVocabulary(),pilotReady,referenceDataReady]).then(EPSearch.refreshSuggestions);
}
