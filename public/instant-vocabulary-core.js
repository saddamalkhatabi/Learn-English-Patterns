(function(root,factory){
 const api=typeof module!=='undefined'?factory(require('./vocabulary-core.js'),require('./english-usage.js')):
  factory(root.EPVocabulary,root.EPEnglish);
 if(typeof module!=='undefined')module.exports=api;
 else root.EPInstantVocabulary=api;
})(typeof window==='undefined'?globalThis:window,function(vocabulary,englishUsage){
 const arabic=/\p{Script=Arabic}/u;
 const articles=new Set(['a','an','the']);
 const normalize=value=>vocabulary.normalize(value).replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا');
 const language=value=>arabic.test(value)?'ar':'en';
 function words(text){
  return [...text.matchAll(/\p{L}[\p{L}\p{M}]*(?:['’]\p{L}[\p{L}\p{M}]*)*/gu)].map(match=>({
   text:match[0],key:normalize(match[0]),start:match.index,end:match.index+match[0].length
  }));
 }
 const key=text=>words(text).map(word=>word.key).join(' ');
 function meanings(text){
  return (text||'').split(/\s+أو\s+|[،؛/]/).map(part=>part.trim()).filter(Boolean);
 }
 function arabicForms(text){
  const normal=key(text);
  if(!normal)return [];
  const bare=normal.startsWith('ال')&&normal.length>4?normal.slice(2):normal;
  return [...new Set([normal,bare])];
 }
 function englishRoots(text){
  return [...new Set([
   text.replace(/ies$/,'y'),text.replace(/(?:es|s)$/,''),
   text.replace(/(?:ed|ing)$/,''),text.replace(/(?:ed|ing)$/,'e'),text.replace(/([bdfgmnprt])\1(?:ed|ing)$/,'$1')
  ])].filter(root=>root!==text&&root.length>=3);
 }
 function index(atlas){
  const translations={en:new Map(),ar:new Map()},expressions=new Map();
  const add=(lang,form,entry)=>{
   const map=translations[lang];
   if(!form)return;
   if(!map.has(form))map.set(form,new Set());
   map.get(form).add(entry);
  };
  for(const entry of [...atlas.entries,...(atlas.regional||[])]){
   const english=key(entry.en);
   add('en',english,entry);
   if(entry.uk)add('en',key(entry.uk),entry);
   for(const meaning of meanings(entry.ar))for(const form of arabicForms(meaning))add('ar',form,entry);
   for(const id of entry.sourceIds){
    const source=atlas.sources[id];
    if(source.type==='idea-word'&&key(source.en)===english&&(!source.pos||source.pos===entry.pos))
     for(const meaning of meanings(source.ar))for(const form of arabicForms(meaning))add('ar',form,entry);
   }
   const terms=english.split(' ');
   if(entry.pos==='PHRASE'&&entry.common&&entry.ar&&terms.length>=2&&terms.length<=6){
    for(const term of new Set(terms)){
     if(term.length<3||articles.has(term))continue;
     if(!expressions.has(term))expressions.set(term,[]);
     expressions.get(term).push(entry);
    }
   }
  }
  const sourceTexts={en:new Map(),ar:new Map()};
  for(const source of atlas.sources){
   if(!source.en||!source.ar||source.type==='idea-word')continue;
   for(const lang of ['en','ar']){
    const normalized=key(source[lang]);
    if(!sourceTexts[lang].has(normalized))sourceTexts[lang].set(normalized,source);
   }
  }
  return {translations,expressions,sources:atlas.sources,sourceTexts};
 }
 function selectRange(indexed,text,start,end){
  const raw=text.slice(start,end),selected=raw.trim();
  start+=raw.indexOf(selected);
  end=start+selected.length;
  const tokens=words(selected);
  if(!tokens.length||tokens.length>40)return null;
  const lang=language(tokens[0].text);
  if(tokens.some(token=>language(token.text)!==lang))return null;
  if(tokens.length===1)return select(indexed,text,start+tokens[0].start);
  const normalized=key(selected);
  const entries=[...(indexed.translations[lang].get(normalized)||[])];
  const source=indexed.sourceTexts[lang].get(normalized);
  return {lang,text:selected,start,end,entries,source};
 }
 function select(indexed,text,offset){
  const tokens=words(text);
  const clicked=tokens.findIndex(word=>word.start<=offset&&offset<word.end);
  if(clicked<0)return null;
  const word=tokens[clicked],lang=language(word.text),map=indexed.translations[lang];
  const enclosing=[];
  for(let first=Math.max(0,clicked-9);first<=clicked;first++){
   for(let last=Math.max(first+1,clicked);last<tokens.length&&last<first+10;last++){
    const span=tokens.slice(first,last+1);
    const enOrAr=text.slice(span[0].start,span.at(-1).end);
    if(/[.!?؟،؛,\n…:]/.test(enOrAr)||span.some(part=>language(part.text)!==lang))break;
    const entries=map.get(span.map(part=>part.key).join(' '));
    if(entries?.size)enclosing.push({start:span[0].start,end:span.at(-1).end,text:enOrAr,entries:[...entries],wordCount:span.length});
   }
  }
  if(enclosing.length)return {...enclosing.sort((a,b)=>b.wordCount-a.wordCount||a.start-b.start)[0],lang};
  if(lang==='en'&&articles.has(word.key))return null;
  const aliases=lang==='ar'?arabicForms(word.text):[];
  const exact=map.get(word.key)||aliases.map(alias=>map.get(alias)).find(Boolean);
  const candidates=exact||((lang==='en'?englishRoots(word.key):[]).map(root=>map.get(root)).find(Boolean));
  return {...word,lang,entries:[...(candidates||[])]};
 }
 function best(indexed,match,context,specific=null){
  const contextKey=key(context),wordKey=key(match.text);
  const regional=match.lang==='en'?englishUsage.analyze(context,specific||{}).changes:[];
  const candidates=match.entries.flatMap(entry=>{
   let score=Number(Boolean(entry.ar))*5+Number(entry.pos!=='X')*2+Math.log1p(entry.sourceIds.length);
   if(entry.uk&&match.lang==='en'){
    const matching=regional.some(change=>change.id===entry.family&&
     change.sourceFrom<match.end&&change.sourceTo>match.start&&[entry.en,entry.uk].some(form=>key(form)===wordKey));
    if(!matching)return [];
    score+=65;
   }
   const specificMatch=specific&&key(specific.en)===key(entry.en)&&vocabulary.posFor(specific)===entry.pos;
   const sources=entry.sourceIds.map(id=>indexed.sources[id]);
   if(sources.some(source=>key(source.en)===contextKey))score+=30;
   if(specificMatch)score+=50;
   if(match.lang==='en'&&entry.pos==='VERB'&&new RegExp('(?:^| )(?:to|can|could|will|would|should|must) '+wordKey+'(?: |$)').test(contextKey))score+=7;
   if(match.lang==='en'&&['NOUN','PROPN'].includes(entry.pos)&&new RegExp('(?:^| )(?:a|an|the|my|your|this|that) '+wordKey+'(?: |$)').test(contextKey))score+=7;
   return [{entry,score,ar:specificMatch&&specific.ar?specific.ar:entry.ar}];
  });
  return candidates.sort((a,b)=>b.score-a.score)[0]||null;
 }
 function related(indexed,entry){
  const options=new Set([...(indexed.expressions.get(key(entry.en))||[]),...(indexed.expressions.get(key(entry.lemma||entry.en))||[])]);
  options.delete(entry);
  return [...options].sort((a,b)=>b.sourceIds.length-a.sourceIds.length).slice(0,3);
 }
 function dictionaryResult(dictionary,match){
  if(match.lang==='en'){
   const form=[key(match.text),normalize(match.text),...englishRoots(key(match.text))].find(word=>Object.hasOwn(dictionary,word));
   return form?{en:match.text,ar:dictionary[form].join('، ')}:null;
  }
  const wanted=new Set(arabicForms(match.text)),found=[];
  for(const [en,translations] of Object.entries(dictionary)){
   if(translations.some(translation=>meanings(translation).some(meaning=>arabicForms(meaning).some(form=>wanted.has(form)))))found.push(en);
   if(found.length>=4)break;
  }
  return found.length?{en:found.join(', '),ar:match.text,speech:found[0]}:null;
 }
 function selectionParts(indexed,match,context,dictionary){
  const tokens=words(match.text),parts=[];
  for(let i=0;i<tokens.length;){
   let translated;
   for(let end=Math.min(tokens.length,i+10);end>i;end--){
    const first=tokens[i].start,last=tokens[end-1].end;
    const text=match.text.slice(first,last);
    if(/[.!?؟،؛,\n…:]/.test(text))continue;
    const entries=[...(indexed.translations[match.lang].get(key(text))||[])];
    const chunk={text,lang:match.lang,entries,start:match.start+first,end:match.start+last};
    const result=best(indexed,chunk,context);
    const value=match.lang==='en'?(result?.ar||dictionaryResult(dictionary,chunk)?.ar):result?.entry?.en;
    if(!value)continue;
    parts.push({text,value});i=end;translated=true;break;
   }
   if(!translated)i++;
  }
  return parts;
 }
 return {index,select,selectRange,best,related,dictionaryResult,selectionParts,words,key,arabicForms,language};
});
