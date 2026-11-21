(function(root){
'use strict';
const groups=[
 {id:'understand',ar:'السؤال والفهم',en:'Ask and understand',items:[
  ['ask-information','طلب معلومة','Ask for information'],
  ['clarify','طلب توضيح','Ask for clarification'],
  ['description','وصف وإخبار','Describe or state a fact'],
  ['explain','شرح سبب أو نتيجة','Explain a reason or result']
 ]},
 {id:'coordinate',ar:'الطلب والتنسيق',en:'Request and coordinate',items:[
  ['request','طلب فعل أو مساعدة','Make a request'],
  ['permission','طلب الإذن أو منحه','Ask for or give permission'],
  ['offer','عرض أو دعوة','Make an offer or invitation'],
  ['advice','طلب نصيحة أو تقديمها','Ask for or give advice'],
  ['instruction','إعطاء توجيه','Give an instruction'],
  ['obligation','بيان الضرورة أو الاختيار','Explain what is required or optional'],
  ['ability','وصف القدرة','Describe ability'],
  ['planning','التخطيط والاقتراح','Discuss a plan or suggestion'],
  ['schedule','ذكر موعد ثابت','State the time of a scheduled event']
 ]},
 {id:'connect',ar:'التواصل والعلاقات',en:'Connect with people',items:[
  ['social','التواصل واللباقة','Interact politely'],
  ['introduce','التعارف وتقديم النفس','Introduce yourself or ask someone’s name'],
  ['gratitude','الشكر والرد عليه','Thank someone or respond to thanks'],
  ['apology','الاعتذار والتطمين','Apologize or reassure someone'],
  ['emotion','التعبير عن شعور','Express a feeling']
 ]},
 {id:'reflect',ar:'التجارب والاختيارات',en:'Experiences and choices',items:[
  ['narration','سرد حدث','Narrate an event'],
  ['routine','وصف عادة أو روتين','Describe a habit or routine'],
  ['preference','التعبير عن تفضيل أو رغبة','Express a preference or wish'],
  ['opinion','إبداء رأي أو مقارنة','Give an opinion or make a comparison'],
  ['hypothetical','افتراض أو شرط','Imagine a situation or state a condition']
 ]}
];
const byId=new Map(groups.flatMap(group=>[[group.id,group],...group.items.map(([id,ar,en])=>[id,{id,ar,en,group:group.id}])]));
const patternGroups={
 'ask-information':[12,9053,9054,9055,9056,9057,9058,9059,9060,9061,9062,9063,9064,9065,9066,9067,9068,9069,9070,9073,9076,9091,9094,9161,9162,9163],
 clarify:[9138],explain:[9140,9141,9142,9143,9144,9145,9154,9155,9158,9160],
 request:[9037,9050,9126,9127,9139],permission:[4,9039,9040,9128,9129],
 offer:[9049,9051,9052,9130],advice:[9046,9047,9171],
 obligation:[2,13,9041,9044,9045],ability:[9035,9036],
 planning:[6,9089,9090,9092,9093,9095,9096,9099,9100,9101,9102,9103,9114,9132],
 schedule:[9097],social:[9125,9131],introduce:[113,114],
 gratitude:[9113,9133,9134,9135],apology:[9136,9137],emotion:[9107,9108,9109,9110,9111,9112],
 narration:[8,9,9071,9072,9074,9075,9077,9078,9079,9080,9081,9082,9083,9084,9086,9087,9088,9167,9172,9173,9174],
 routine:[9017,9018,9019,9020,9021,9022,9023,9024,9025,9026,9027,9028,9029,9030,9031,9032,9033,9034],
 preference:[1,3,7,107,109,111,112,9098,9116,9120,9168],
 opinion:[11,9117,9118,9119,9121,9122,9123,9124,9146,9147,9148,9149,9150,9151,9152,9153,9159,9175],
 hypothetical:[9104,9105,9106,9156,9157,9169,9170]
};
const byPattern=new Map(Object.entries(patternGroups).flatMap(([id,patterns])=>patterns.map(pattern=>[pattern,id])));
const forPattern=id=>byPattern.get(Number(id))||'description';
const coursePurposeOverrides=new Map([
 ['know-11','description'],
 ['can-12','request'],
 ['pattern-9037-07','ability'],
 ['pattern-9037-09','clarify']
]);
function forCourseSentence(row){
 return coursePurposeOverrides.get(row.id)||forPattern(row.pattern_id||row.pattern_ids?.[0]);
}
function forReference(guide,sentence=''){
 const text=guide.purpose_en||'';
 if(/\b(?:ask for|give) permission\b/i.test(text))return 'permission';
 if(/advice/i.test(text))return 'advice';
 if(/name|acquainted/i.test(text)&&guide.purpose==='social')return 'introduce';
 if(/thank/i.test(text))return 'gratitude';
 if(/apologize/i.test(text))return 'apology';
 if(/optional|needs to be done/i.test(text))return 'obligation';
 if(/ability/i.test(text))return 'ability';
 if(/^what do you mean\b|^(?:could|can) you (?:repeat|explain)\b/i.test(sentence))return 'clarify';
 if(/^(?:the|our)\b.{0,48}\b(?:starts|leaves|opens|begins|departs) at\s+\d/i.test(sentence))return 'schedule';
 if(guide.construction==='condition'||guide.construction==='wish'&&guide.purpose!=='preference')return 'hypothetical';
 if(guide.construction==='reason-result')return 'explain';
 if(guide.construction==='habit-frequency')return 'routine';
 return byId.has(guide.purpose)?guide.purpose:'description';
}
function forDialogue(dialogue){
 const explicit={ask:'ask-information',ask_information:'ask-information',describe:'description',request:'request',advise:'advice',
  choose:'opinion',plan:'planning',retell:'narration',solve:'planning'}[dialogue.purpose];
 return explicit||(byId.get(dialogue.purpose)?.group?dialogue.purpose:forPattern(dialogue.after||dialogue.lines?.[0]?.patterns?.[0]));
}
function matches(selection,purpose){
 return !selection||selection===purpose||byId.get(purpose)?.group===selection;
}
const get=id=>byId.get(id);
const spoken=id=>get(id).en.replace(/[.!?]$/,'')+'.';
const api={groups,get,forPattern,forCourseSentence,forReference,forDialogue,matches,spoken};
if(typeof module==='object')module.exports=api;else root.EPPurposes=api;
})(globalThis);
