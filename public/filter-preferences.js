const EPFilters=(()=>{
 const storageKey='patterns-filters-v1', mounted=new WeakSet(), notices=new WeakMap();
 let saved={};
 try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{}}catch{}

 function read(scope,defaults){
  return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[
   key,typeof saved[scope]?.[key]===typeof value?saved[scope][key]:value
  ]));
 }
 function active(value){return typeof value==='string'?Boolean(value.trim()):Boolean(value)}
 function save(scope,values){
  const next=Object.fromEntries(Object.entries(values).filter(([,value])=>active(value)));
  if(JSON.stringify(next)===JSON.stringify(saved[scope]||{}))return;
  if(Object.keys(next).length)saved[scope]=next;
  else delete saved[scope];
  try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}
 }
 function show(host,values,clear){
  if(!host)return;
  let notice=notices.get(host);
  if(!notice){
   notice=document.createElement('div');
   notice.className='ep-filter-state';
   notice.innerHTML='<span role="status"></span><button class="secondary" type="button"></button>';
   host.after(notice);
   notices.set(host,notice);
  }
  const count=Object.values(values).filter(active).length;
  notice.hidden=!count;
  notice.firstElementChild.textContent=T(`الفلاتر المحفوظة مفعّلة (${count})`,`Saved filters active (${count})`);
  const button=notice.lastElementChild;
  button.textContent=T('إلغاء كل الفلاتر','Clear all filters');
  button.onclick=clear;
 }
 function controls(scope,host,fields,repaint){
  const controls=Object.fromEntries(Object.entries(fields).filter(([,element])=>element));
  const store=!document.body.dataset.linkedLearning;
  const values={};
  for(const [key,element] of Object.entries(controls)){
   if(store&&!mounted.has(element)){
    const value=saved[scope]?.[key];
    if(typeof value==='string'&&(!element.options||[...element.options].some(option=>option.value===value))){
     element.value=value;
    }
    if(!value||!element.options||element.options.length>1)mounted.add(element);
   }
   values[key]=element.value;
  }
  // Keep stored options until asynchronous lists have loaded.
  const preserved={...saved[scope],...values};
  for(const [key,element] of Object.entries(controls)){
   if(element.options?.length<=1&&saved[scope]?.[key])preserved[key]=saved[scope][key];
  }
  if(store)save(scope,preserved);
  show(host,values,()=>{
   if(store)save(scope,{});
   for(const element of Object.values(controls))element.value='';
   repaint();
   Object.values(controls)[0]?.focus({preventScroll:true});
  });
  return values;
 }
 return {read,save,show,controls};
})();
