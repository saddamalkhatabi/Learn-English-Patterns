(function(root){
 const rules=[
  ['color','spelling','لون','NOUN',['color|colour','colors|colours','colored|coloured','colorful|colourful','coloring|colouring']],
  ['favorite','spelling','مفضّل','ADJ',['favorite|favourite','favorites|favourites']],
  ['neighbor','spelling','جار','NOUN',['neighbor|neighbour','neighbors|neighbours','neighborhood|neighbourhood','neighborhoods|neighbourhoods','neighboring|neighbouring']],
  ['center','spelling','مركز','NOUN',['center|centre','centers|centres','centered|centred']],
  ['theater','spelling','مسرح','NOUN',['theater|theatre','theaters|theatres']],
  ['gray','spelling','رمادي','ADJ',['gray|grey']],
  ['measure','spelling','وحدة قياس الطول','NOUN',['meter|metre','meters|metres','centimeter|centimetre','centimeters|centimetres','kilometer|kilometre','kilometers|kilometres','millimeter|millimetre','millimeters|millimetres']],
  ['travel','spelling','السفر','VERB',['traveled|travelled','traveling|travelling','traveler|traveller','travelers|travellers']],
  ['cancel','spelling','إلغاء','VERB',['canceled|cancelled','canceling|cancelling']],
  ['behavior','spelling','سلوك','NOUN',['behavior|behaviour','behaviors|behaviours']],
  ['flavor','spelling','نكهة','NOUN',['flavor|flavour','flavors|flavours','flavored|flavoured']],
  ['honor','spelling','تكريم','NOUN',['honor|honour','honors|honours','honored|honoured']],
  ['humor','spelling','فكاهة','NOUN',['humor|humour','humorous|humorous']],
  ['labor','spelling','عمل','NOUN',['labor|labour','laborer|labourer','laborers|labourers']],
  ['organize','spelling','ينظّم','VERB',['organize|organise','organizes|organises','organized|organised','organizing|organising','organization|organisation','organizations|organisations']],
  ['recognize','spelling','يتعرّف على','VERB',['recognize|recognise','recognizes|recognises','recognized|recognised','recognizing|recognising']],
  ['realize','spelling','يدرك','VERB',['realize|realise','realizes|realises','realized|realised','realizing|realising']],
  ['apologize','spelling','يعتذر','VERB',['apologize|apologise','apologizes|apologises','apologized|apologised','apologizing|apologising']],
  ['analyze','spelling','يحلّل','VERB',['analyze|analyse','analyzes|analyses','analyzed|analysed','analyzing|analysing'], 'verb'],
  ['practice','spelling','يمارس','VERB',['practice|practise','practices|practises','practiced|practised','practicing|practising'],'practice'],
  ['tire','spelling','إطار عجلة','NOUN',['tire|tyre','tires|tyres'],'tire'],
  ['defense','spelling','دفاع','NOUN',['defense|defence','offense|offence','defenses|defences','offenses|offences']],
  ['jewelry','spelling','مجوهرات','NOUN',['jewelry|jewellery']],
  ['pajamas','spelling','ملابس النوم','NOUN',['pajamas|pyjamas']],
  ['catalog','spelling','فهرس','NOUN',['catalog|catalogue','catalogs|catalogues']],
  ['check','spelling','شيك مصرفي','NOUN',['check|cheque','checks|cheques'],'cheque'],
  ['apartment','vocabulary','شقة سكنية','NOUN',['apartment|flat','apartments|flats'],'flat'],
  ['elevator','vocabulary','مصعد','NOUN',['elevator|lift','elevators|lifts'],'lift'],
  ['restroom','vocabulary','دورة المياه','NOUN',['restroom|toilet','restrooms|toilets'],'restroom'],
  ['restaurant-bill','vocabulary','فاتورة المطعم','PHRASE',['Can I get the check, please|Could I have the bill, please','asking for the check|asking for the bill']],
  ['ride','vocabulary','توصيلة بالسيارة','PHRASE',['needs a ride|needs a lift','need a ride|need a lift','give you a ride|give you a lift','give me a ride|give me a lift']],
  ['parking-lot','vocabulary','موقف سيارات','NOUN',['parking lot|car park','parking lots|car parks']],
  ['gas-station','vocabulary','محطة وقود','NOUN',['gas station|petrol station','gas stations|petrol stations']],
  ['cell-phone','vocabulary','هاتف محمول','NOUN',['cell phone|mobile phone','cell phones|mobile phones']],
  ['trash-can','vocabulary','سلّة مهملات','NOUN',['trash can|rubbish bin','trash cans|rubbish bins']],
  ['shopping-cart','vocabulary','عربة تسوق','NOUN',['shopping cart|shopping trolley','shopping carts|shopping trolleys']],
  ['flashlight','vocabulary','مصباح يدوي','NOUN',['flashlight|torch','flashlights|torches'],'torch'],
  ['sidewalk','vocabulary','رصيف المشاة','NOUN',['sidewalk|pavement','sidewalks|pavements'],'pavement'],
  ['math','vocabulary','الرياضيات','NOUN',['math|maths']],
  ['truck','vocabulary','شاحنة','NOUN',['truck|lorry','trucks|lorries']],
  ['movie','vocabulary','فيلم سينمائي','NOUN',['movie|film','movies|films'],'film'],
  ['timetable','vocabulary','جدول المواعيد','NOUN',['schedule|timetable','schedules|timetables'],'timetable'],
  ['round-trip','vocabulary','تذكرة ذهاب وإياب','NOUN',['round-trip ticket|return ticket','round-trip tickets|return tickets']],
  ['one-way','vocabulary','تذكرة ذهاب فقط','NOUN',['one-way ticket|single ticket','one-way tickets|single tickets']],
  ['candy','vocabulary','حلوى','NOUN',['candy|sweets']],
  ['trash','vocabulary','قمامة','NOUN',['trash|rubbish'],'trash'],
  ['pants','vocabulary','بنطال','NOUN',['pants|trousers'],'pants'],
  ['cookie','vocabulary','بسكويت حلو','NOUN',['cookie|biscuit','cookies|biscuits'],'cookie'],
  ['train-car','vocabulary','عربة القطار','NOUN',['train car|train carriage','in this train car|in this carriage','which train car|which carriage']],
  ['sales-associate','vocabulary','موظف مبيعات في متجر','NOUN',['sales associate|shop assistant','sales associates|shop assistants']],
  ['living-room','vocabulary','غرفة الجلوس','NOUN',['living room|sitting room','living rooms|sitting rooms']],
  ['school-break','vocabulary','عطلة المدرسة','NOUN',['school break|school holiday','school breaks|school holidays']],
  ['afterward','vocabulary','بعد ذلك','ADV',['afterward|afterwards']],
  ['toward','vocabulary','باتجاه','ADP',['toward|towards']],
  ['electric-outlet','vocabulary','مأخذ كهربائي','NOUN',['wall outlet|wall socket','wall outlets|wall sockets','power outlet|power socket','power outlets|power sockets']],
  ['zip-code','vocabulary','رمز بريدي','NOUN',['ZIP code|postcode','ZIP codes|postcodes']],
  ['line','vocabulary','طابور الانتظار','PHRASE',['in line|in the queue','join the line|join the queue','stand in line|stand in the queue','people line up|people queue']],
  ['weekend','construction','في عطلة نهاية الأسبوع','PHRASE',['on the weekend|at the weekend','on weekends|at weekends']],
  ['recent-move','construction','انتقلت للسكن للتو','PHRASE',["I just moved in|I've just moved in"]],
  ['possession','construction','هل لديك…؟','PHRASE',['Do you have a pen|Have you got a pen']]
 ].map(([id,kind,ar,pos,forms,context])=>({id,kind,ar,pos,context,
  forms:forms.map(form=>form.split('|')).filter(([us,uk])=>us!==uk)})).filter(rule=>rule.forms.length);
 const escapeRegExp=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const normalize=text=>String(text??'').replace(/[‘’]/g,"'").toLowerCase();
 const familyById=new Map(rules.map(rule=>[rule.id,rule]));
 const forms=new Map();
 for(const rule of rules)for(const [us,uk] of rule.forms)for(const [region,text] of Object.entries({us,uk})){
  forms.set(normalize(text),{rule,region,us,uk});
 }
 const matchForms=new RegExp('\\b(?:'+[...forms.keys()].sort((a,b)=>b.length-a.length).map(word=>
  escapeRegExp(word).replace(/'/g,"['’]")).join('|')+')\\b','gi');

 function contextual(match,word,before,after,ar,pos){
  const {rule,region}=match;
  switch(rule.context){
   case 'verb': return pos!=='NOUN'&&!/\banalyses (?:of|show|indicate|are)\b/i.test(word+' '+after);
   case 'practice': return word.toLowerCase().includes('practis')||pos==='VERB'||
    /\b(?:to|can|could|will|should|must|i|we|you|they|let's|let’s)\s*$/i.test(before);
   case 'flat': return region==='us'||!/^\s+(?:battery|tires?|tyres?|roof|area|surface|rate|fare|fee|screen|feet|shoes|ground|voice)\b/i.test(after)&&
    (/شق[ةت]|شقق/.test(ar)||
    /\b(?:the|a|my|her|his|our|your|their|new|rented)\s*$/i.test(before)&&
    /^(?:[.!?,;:]|\s*(?:$|upstairs\b|next door\b|number\b|was\b|is\b|near\b|two streets\b|this evening\b|last week\b|after\b|to rent\b|in\b))/i.test(after));
   case 'lift': return region==='us'||!/توصيل|يوصل/.test(ar)&&!/^\s+(?:the|a|an|my|your)\b/i.test(after)&&(/مصعد/.test(ar)||
    /\b(?:the|a)\s*$/i.test(before)&&/^(?:[?!.;,]|\s*(?:to the|is broken|is out of order|doors?|button)\b)/i.test(after)&&
    !/\b(?:give|gave|offer|offered|needs?|needed|wants?|wanted|get|got)(?:\s+\w+){0,2}\s+(?:the|a)\s*$/i.test(before));
   case 'film': return region==='us'||!/^\s*(?:crew|festival|camera|industry|school)\b/i.test(after)&&
    (/فيلم|أفلام/.test(ar)||/\b(?:watch(?:ed|ing)?|see|saw|favorite|favourite|short) (?:a |the |my )?$/i.test(before));
   case 'torch': return region==='us'||/مصباح|كشّاف|كشاف/.test(ar)||/\b(?:switch(?:ed)? on|turn(?:ed)? on|shine)(?: the| a)?\s*$/i.test(before);
   case 'pavement': return region==='us'||/رصيف/.test(ar)||
    /\b(?:walk(?:s|ed|ing)?|stand(?:ing)?|step(?:ped|ping)?) (?:on|along|onto) (?:a|the)\s*$/i.test(before);
   case 'cheque': return region==='uk'||/شيك/.test(ar)||/\b(?:cash|write|deposit|by) (?:a |the )?$/i.test(before);
   case 'tire': return region==='uk'||/إطار|عجلة/.test(ar)||/\b(?:flat|spare|new|rear|front|replace|change)(?: a| the)?\s*$/i.test(before);
   case 'restroom': return region==='us'||/دورة المياه|مكان الحمّام/.test(ar)||
    /\bwhere(?:'s| is) the\s*$/i.test(before);
   case 'timetable': return region==='uk'||/جدول المواعيد|جدول الحصص/.test(ar)||
    /\b(?:class|school|train|bus|flight)\s*$/i.test(before);
   case 'trash': return region==='us'||/نفايات|قمامة|مهملات/.test(ar)||
    /\b(?:throw|toss|take out|pick up)(?:\s+\w+){0,2}\s*$/i.test(before);
   case 'pants': return region==='uk'||/بنطال|سروال/.test(ar);
   case 'cookie': return region==='us'||/بسكويت/.test(ar)&&!/جبن|مالح/.test(ar);
   default:return true;
  }
 }
 function keepCase(original,text){
  if(original.toUpperCase()===original&&original.toLowerCase()!==original)return text.toUpperCase();
  if(/^[A-Z]/.test(original))return text[0].toUpperCase()+text.slice(1);
  return text;
 }
 function matchArticle(gap,word,replacement){
  if(/^[aeiou]/i.test(word)===/^[aeiou]/i.test(replacement))return gap;
  return gap.replace(/\b(an?)\s+$/i,(tail,article)=>
   keepCase(article,/^[aeiou]/i.test(replacement)?'an':'a')+tail.slice(article.length));
 }
 function analyze(text,{ar='',pos='',spellingOnly=false}={}){
  const source=String(text??''),changes=[];
  let us='',uk='',last=0;
  for(const occurrence of source.matchAll(matchForms)){
   const word=occurrence[0],start=occurrence.index,end=start+word.length;
   const form=forms.get(normalize(word));
   if(spellingOnly&&form.rule.kind!=='spelling')continue;
   if(!contextual(form,word,source.slice(Math.max(0,start-45),start),source.slice(end,end+45),ar,pos))continue;
   const american=keepCase(word,form.us),british=keepCase(word,form.uk);
   const gap=source.slice(last,start);
   us+=matchArticle(gap,word,american);
   uk+=matchArticle(gap,word,british);
   changes.push({id:form.rule.id,kind:form.rule.kind,region:form.region,us:american,uk:british,sourceFrom:start,sourceTo:end,
    usFrom:us.length,ukFrom:uk.length});
   us+=american;uk+=british;last=end;
  }
  return {us:us+source.slice(last),uk:uk+source.slice(last),changes};
 }
 function sameSpeech(a,b){
  return a===b||analyze(a,{spellingOnly:true}).us===analyze(b,{spellingOnly:true}).us;
 }
 function projectSentence(row,recordings){
  const usage=analyze(row.en,row);
  if(!usage.changes.length)return row;
  if(recordings?.male?.text===usage.us&&recordings?.female?.text===usage.us)
   return {...row,en:usage.us,sourceEn:row.en,englishUsage:usage,recordings,regionalAudio:true};
  if(sameSpeech(row.en,usage.us))return {...row,en:usage.us,sourceEn:row.en,englishUsage:usage};
  return {...row,englishUsage:usage};
 }
 const shared=new Set(['nice to meet you','nice to meet you too','good to see you','good to see you too',
  'could you say that again','could you speak more slowly','how\'s it going','see you later','have a good day',
  'can i pay by card','excuse me','you\'re welcome','what\'s your name',
  'would you like','would you mind','as soon as','get used to','up all night','no need to']);
 const api={analyze,sameSpeech,projectSentence,rules,familyById,shared};
 if(typeof module==='object')module.exports=api;else root.EPEnglish=api;
})(typeof globalThis==='undefined'?this:globalThis);
