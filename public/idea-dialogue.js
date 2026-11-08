(function(root){
 const hasArabic=/[\u0600-\u06ff]/;
 const limits={input:30000,turns:60,line:650};
 function parseIdeaDialogue(input){
  const raw=String(input||'').trim();
  if(!raw||raw.length>limits.input)throw Error('length');
  const text=raw.replace(/^```(?:json|text|markdown)?\s*\n([\s\S]*?)\n```$/i,'$1').trim();
  let draft;
  if(text.startsWith('{')||text.startsWith('[')){
   try{draft=JSON.parse(text)}catch{throw Error('format')}
   if(Array.isArray(draft))draft={turns:draft};
  }else{
   const turns=[];
   let title='';
   for(const line of text.split(/\r?\n/)){
    const clean=line.trim().replace(/^[-*]\s+|^\d+[.)]\s+/,'').replaceAll('**','');
    if(!clean)continue;
    if(/^#+\s/.test(clean)&&!turns.length){title=clean.replace(/^#+\s*/,'');continue}
    const pair=/^([\p{L}\p{N} _.-]{1,30})\s*[:：]\s*(.+)$/u.exec(clean);
    if(!pair){
     if(turns.length&&hasArabic.test(clean)&&!turns.at(-1).ar)turns.at(-1).ar=clean;
     continue;
    }
    const [,speaker,words]=pair;
    if(/^(AR|العربية|الترجمة)$/i.test(speaker)&&turns.length){turns.at(-1).ar=words;continue}
    if(/^(title|العنوان)$/i.test(speaker)&&!turns.length){title=words;continue}
    turns.push({speaker,en:words});
   }
   draft={title,turns};
  }
  const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  if(!Array.isArray(draft?.turns)||draft.turns.length<2||draft.turns.length>limits.turns)throw Error('format');
  const turns=draft.turns.map(turn=>({
   speaker:clean(turn?.speaker,30),
   en:clean(turn?.en,limits.line+1),
   ar:clean(turn?.ar,limits.line+1)
  }));
  if(turns.some(t=>!t.speaker||!/[a-z]/i.test(t.en)||t.en.length>limits.line||t.ar.length>limits.line)||
     new Set(turns.map(t=>t.speaker.toLowerCase())).size<2)throw Error('format');
  return {title:clean(draft.title,100),turns};
 }
 if(typeof module!=='undefined')module.exports={parseIdeaDialogue};
 else root.parseIdeaDialogue=parseIdeaDialogue;
})(typeof window!=='undefined'?window:globalThis);
