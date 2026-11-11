(function(root){
 const types={
  NOUN:{code:'n',ar:'اسم',en:'noun',color:'noun'},
  PROPN:{code:'prop.n',ar:'اسم علم',en:'proper noun',color:'proper'},
  VERB:{code:'v',ar:'فعل',en:'verb',color:'verb'},
  AUX:{code:'aux',ar:'فعل مساعد',en:'auxiliary verb',color:'aux'},
  ADJ:{code:'adj',ar:'صفة',en:'adjective',color:'adjective'},
  ADV:{code:'adv',ar:'ظرف',en:'adverb',color:'adverb'},
  ADP:{code:'prep',ar:'حرف جر',en:'preposition',color:'preposition'},
  PRON:{code:'pron',ar:'ضمير',en:'pronoun',color:'pronoun'},
  DET:{code:'det',ar:'محدّد',en:'determiner',color:'determiner'},
  CCONJ:{code:'conj',ar:'حرف عطف',en:'conjunction',color:'conjunction'},
  SCONJ:{code:'conj',ar:'أداة ربط',en:'subordinating conjunction',color:'conjunction'},
  PART:{code:'part',ar:'أداة',en:'particle',color:'particle'},
  NUM:{code:'num',ar:'عدد',en:'number',color:'number'},
  INTJ:{code:'int',ar:'تعبير تفاعلي',en:'interjection',color:'interjection'},
  CONTR:{code:'contr',ar:'اختصار',en:'contraction',color:'contraction'},
  PHRASE:{code:'phr',ar:'عبارة',en:'phrase',color:'phrase'},
  X:{code:'?',ar:'غير مصنّف',en:'unclassified',color:'unknown'}
 };
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replaceAll('’',"'").trim();
 const tokens=text=>String(text).match(/[\p{L}]+(?:['’][\p{L}]+)*|\d+(?:[:.]\d+)*/gu)||[];
 const posFor=word=>word.pos||({object:'NOUN',action:'VERB',description:'ADJ',phrase:'PHRASE'}[word.kind])||'X';
 function includesTerm(text,term){
  const phrase=tokens(term).map(normalize),words=tokens(text).map(normalize);
  return phrase.length>0&&words.some((_,i)=>phrase.every((word,j)=>words[i+j]===word));
 }
 const api={types,normalize,tokens,posFor,includesTerm};
 if(typeof module!=='undefined')module.exports=api;
 else root.EPVocabulary=api;
})(typeof window!=='undefined'?window:globalThis);
