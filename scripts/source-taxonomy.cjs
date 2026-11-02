/* Search facets describe constructions, communicative purposes and situations separately. */
const grammar=[
 ['accustomed','الاعتياد على شيء','be/get used to',/\b(?:am|is|are|was|were|be|been|being|getting|get|got|starting to get|'m|'s|'re) used to\b/i],
 ['past-habit','عادة سابقة','used to + verb',/\bused to\b/i],
 ['lack-necessity','عدم الاضطرار','do not have to / no need',/\b(?:don.t|doesn.t|didn.t) have to\b|\bno need\b|\bdon.t need to\b/i],
 ['polite-request','طلب مهذب','would/could/may',/^(?:would (?:you|it)|could (?:you|i)|may (?:i|we))\b/i],
 ['reported-question','سؤال منقول','asked / wondered + clause',/\b(?:asked|wondered|ask)\b[^.!?]*\b(?:if|whether|who|what|why|how|when|where|which)\b/i],
 ['reported-command','طلب منقول','ask/tell + object + to',/\b(?:asked|told|advised|encourage|persuaded|wanted|wants|want)\s+(?:me|him|her|us|them|you|tom|mary)\s+(?:not\s+)?to\b/i],
 ['indirect-question','استفهام داخل جملة','know/wonder + question clause',/\b(?:know|knows|knew|wonder|wondering|understand|remember|tell me|find out|figure out|guess)\b[^.!?]*\b(?:who|what|where|when|why|how|which|if|whether)\b/i],
 ['wh-question','سؤال عن معلومة','question word',/^(?:exactly\s+)?(?:what|who|whom|whose|where|when|why|which|how)\b|^about how\b/i],
 ['yes-no-question','سؤال بنعم أو لا','auxiliary + subject',/^(?:do|does|did|don.t|doesn.t|didn.t|am|is|are|was|were|have|has|had|can|can.t|could|should|shall|will|would|may|must)\b.+\?$/i],
 ['suggestion','اقتراح مشترك',"let's + verb",/^let.s\b/i],
 ['permission-let','السماح والعرض','let + object + verb',/^(?:don.t\s+)?let\b|\ballowed?\b|\ballow me\b/i],
 ['wish','التمني','wish + clause',/\bwish(?:es|ed)?\b/i],
 ['concession','التنازل والاستدراك','even if / no matter',/\beven (?:if|though|when)\b|^no matter\b|^as strange as/i],
 ['condition','الشرط والاحتياط','if / in case',/\bif\b|\bin case\b/i],
 ['correlative-comparison','مقارنة متلازمة','the more … the more',/^the (?:more|longer|sooner)\b/i],
 ['superlative','التفضيل الأعلى','the most / best / -est',/\b(?:the most|the best|the worst|one of (?:the|my)|favorite|ever (?:seen|had|sat|written))\b/i],
 ['comparison','المقارنة','than / as … as',/\bthan\b|\bas (?:many|much|soon|long|far|strange)\b|\bsame\b|\bprefer\b/i],
 ['quantity','الكمية والجزء','all / some / half',/^(?:all|some|half|few|both|neither|none|everyone|almost everyone|most)\b|\benough\b/i],
 ['existence','الوجود','there + be',/^there(?:.s| is| are| was| were| may| must| seems| used|.s)/i],
 ['demonstrative','الإشارة','this/that + be',/^(?:this|that|these|those)\s+(?:is|are|was|were|looks?|sounds?|seems?|should)\b|^that.s\b/i],
 ['cleft','تحديد الفاعل والفكرة','it/this is … who/what',/^it was (?:me|tom)|\b(?:the one|only one|last one) who\b/i],
 ['relative-clause','صلة الموصول','who / whose / where',/\bwhose\b|\b(?:person|people|one|daughter|key|place|country|way|school|shop|thing|anything|everything|book|books|keys|money|food)\s+(?:who|that|where|which)\b/i],
 ['causative','التسبب والإقناع','make/keep/talk into',/\b(?:make|makes|made|kept|keep)\s+(?:me|you|him|her|us|them|tom|mary)\b|\btalk(?:ed)?\s+(?:tom|mary|him|her) into\b/i],
 ['perception','المظهر والانطباع','look/sound/seem',/\b(?:look|looks|looked|sound|sounds|sounded|seem|seems|seemed|appears?|appeared)\b/i],
 ['obligation','الضرورة والنصيحة','have to / should / must',/\b(?:have to|has to|had to|should|ought to|must|supposed to|need to|needs to|better get)\b/i],
 ['ability','القدرة والإمكان','can / be able to',/\b(?:can|can.t|could|couldn.t|able to|unable to|manage(?:d)? to)\b/i],
 ['possibility','الاحتمال والاستنتاج','may / might / likely',/\b(?:may|might|likely|unlikely|possible|possibility|chance|probably|perhaps|doubt)\b/i],
 ['passive','المبني للمجهول','be + past participle',/\b(?:is|are|was|were|be|been|being|get)\s+(?:\w+ly\s+)?(?:told|replaced|wasted|paid|served|born|married|washed|killed|stolen|locked|broken|spoken|done)\b/i],
 ['perfect-continuous','التام المستمر','have been + -ing',/\b(?:have|has|had|.ve|.s)\s*been\s+\w+ing\b/i],
 ['perfect','الفعل التام','have + past participle',/\b(?:have|has|had|.ve)\s*(?:never\s+|already\s+|ever\s+)?(?:been|known|fed|had|spent|finished|told|seen|written|lost|bought|studied|waited|come)\b|\b(?:i.ve|he.s|she.s|it.s) been\b/i],
 ['future-intention','المستقبل والنية','going to / plan to',/\bgoing to\b|\b(?:plan|plans|planning|intend|intends|intention|about to)\b|\b(?:will|won.t|shall|.ll)\b/i],
 ['gerund','الفعل بصيغة ing','verb / preposition + -ing',/\b(?:enjoy|enjoys|hate|hates|like|likes|prefer|mind|stopped|stop|keep|keeps|began|started|start|spend|spends|worth|busy|trouble|without|instead of|after|before|in|for|about|of)\s+(?:\w+\s+)?\w+ing\b|\bfeel like\b|\blooking forward to\b/i],
 ['infinitive','المصدر مع to','verb + to + verb',/\bto (?:be|do|have|go|get|ask|tell|talk|say|speak|study|learn|help|live|eat|buy|see|know|make|wait|understand|find|take|close|lock|think|finish|call|work|stay|come|thank|apologize|try|solve|warn|feed|remember|leave|give|read|climb|follow|sleep|stop|write|turn|pick|trust|prepare|afford|treat|convince|remain|engage|cause|explain|eat|drink)\b/i],
 ['habit-frequency','التكرار والعادات','often / always / usually',/\b(?:always|often|usually|sometimes|seldom|rarely|never|hardly ever|every day|five days a week)\b/i],
 ['time-connection','ربط الأحداث زمنيًا','when / since / while',/\b(?:when|while|since|until|till|as soon as|by the time|before|after)\b/i],
 ['reason-result','السبب والنتيجة','because / so / since',/\b(?:because|reason|so that|so we|so noisy that|since it.s)\b/i],
 ['discourse','الربط وتنظيم الكلام','in fact / by the way',/^(?:in (?:fact|general|any case|addition|retrospect|a way|some ways)|for (?:the record|some reason|a moment|now|all we know)|by the way|as usual|apparently|obviously|fortunately|luckily|eventually|finally|clearly|needless|frankly|to (?:be honest|tell the truth|put it bluntly|make matters worse)|anyway|first,|at (?:least|last|present|this|one)|from now on|so far|sooner or later|generally speaking)/i],
 ['possession','الملكية','have / have got',/\b(?:have|has|had|.ve got|got)\s+(?:a|an|some|no|the|my|your|good|nothing|something|anything|enough|many|much|little|one|two|three)\b/i],
 ['negation','النفي','not / no / neither',/\b(?:don.t|doesn.t|didn.t|isn.t|aren.t|wasn.t|weren.t|not|no|never|nothing|neither|none|nobody)\b/i],
 ['description','الوصف والحالة','be + complement',/^(?:i.m|i was|i am|it.s|it was|it is|tom was|tom is|you are|we are|everything is|everybody.s|he.s)\b/i],
 ['imperative','الأمر والتوجيه','base verb',/^(?:don.t|be|return|hand|promise|look|come|go|put|get|keep|stay|bring|close|clean|enjoy|check|choose|tell|remember|try|help|give|listen|wake|see|find|wait|call|make|allow)\b/i],
 ['statement','إخبار وسرد','statement',/./]
];
const domains=[
 ['learning','التعلم واللغات',/\b(?:learn\w*|study|studying|studied|school|class|teacher|student|students|homework|lecture|french|english|latin|language|notes|test|math|chapter|book|books|reading)\b/i],
 ['work','العمل والمهن',/\b(?:work|working|workers|job|jobs|office|business|meeting|budget|paid|speech|doctor|doctors|lawyer|policeman)\b/i],
 ['food','الطعام والمطعم',/\b(?:food|eat|eating|eats|ate|dinner|supper|lunch|meal|drink|drinks|drinking|tea|coffee|water|apple|milk|cake|soup|fork|meat|fish|cooking|cook|restaurant|ice cream|jam|marmalade|refrigerator|hungry|appetite|delicious)\b/i],
 ['travel','السفر والمواصلات',/\b(?:trip|trips|travel|bus|train|station|airport|passport|hotel|vacation|check in|taxi|car|drive|driving|parked|bicycle|motorcycle|truck|boats|bridge|kilometers|coast|suitcases|arrive|arrived)\b/i],
 ['family','الأسرة والعلاقات',/\b(?:family|parents|mother|father|grandfather|wife|husband|married|marry|marriage|children|child|kids|baby|daughter|girlfriend|friend|friends|love|loves|dating|dates|kiss|engagement|wedding)\b/i],
 ['home','المنزل والحياة اليومية',/\b(?:house|home|apartment|room|door|window|bed|sofa|couch|table|shelf|garage|trash|keys|clothes|coat|sweater|towel|toys|teeth|shaving|suit|tie|sleeps|sleep|asleep|sleepy|wake)\b/i],
 ['health','الصحة والمشاعر',/\b(?:health|healthy|sick|illness|disease|hospital|ambulance|pain|headache|migraine|infection|injury|pulse|allergic|smoke|smoking|loneliness|depressed|worried|worry|afraid|tired|confused|happy|angry|sad|hungry|diet|weight|shots)\b/i],
 ['money','المال والتسوق',/\b(?:money|cost|costs|price|expensive|buy|bought|pay|paying|bill|cash|atm|rich|loan|lend|borrowed|afford|donated|donating|gift|shop|shoes|camera)\b/i],
 ['leisure','الهوايات والترفيه',/\b(?:music|guitar|song|concert|movie|movies|cinema|theater|tv|television|radio|sports|game|games|dance|dancing|camping|camp|swim|swimming|pool|beach|novel|novelist|party)\b/i],
 ['nature','الطبيعة والطقس',/\b(?:rain|raining|weather|hot|cold|storm|rainbow|mountain|lake|butterflies|fire|dusty|dog|dogs|cat|cats|pet|unicorns|farm)\b/i],
 ['technology','التقنية والأجهزة',/\b(?:computer|electricity|robots|button|microwave|telephone|phone|camera)\b/i],
 ['community','المجتمع والأماكن',/\b(?:city|street|park|bank|police|prison|prisoner|library|theft|stole|stolen|thief|guilty|lawyer|weapons|gun)\b/i]
];
const functions=[
 ['ask-information','طلب معلومة',/\?$|\btell me\b|\blet me know\b/i],
 ['request','طلب فعل أو مساعدة',/^(?:can|could|would|may)\b|\b(?:help me|ask|asked|need you|want you|give me)\b/i],
 ['offer','عرض ومساعدة',/\b(?:let me help|can help|offered|would you like|bring|brought you)\b/i],
 ['advice','نصيحة وتوجيه',/\b(?:should|ought|advise|advised|better|be careful|make sure|be sure|remember to|don.t forget)\b/i],
 ['preference','رغبة وتفضيل',/\b(?:want|wants|wanted|like|likes|prefer|love|loves|hate|hates|enjoy|enjoys|wish|wishes|would like)\b/i],
 ['opinion','رأي وتقييم',/\b(?:think|thinks|thought|believe|believes|guess|suppose|agree|good|bad|best|worst|better|doubt|obvious)\b/i],
 ['emotion','التعبير عن الشعور',/\b(?:feel|feeling|happy|sorry|worried|afraid|angry|proud|pleased|grateful|thrilled|surprised|fed up|sick of|hate|love)\b/i],
 ['social','لباقة وتواصل اجتماعي',/\b(?:thank|thanks|apologize|apologized|sorry|excuse|introduce|congratulate|polite|respect|name|see you)\b/i],
 ['planning','نية وخطة',/\b(?:plan|plans|planning|intend|intends|going to|will|won.t|.ll|tomorrow|future|next)\b/i],
 ['narration','سرد حدث',/\b(?:was|were|did|went|came|found|told|asked|yesterday|last|ago|bought|stopped|started|gave|took|made|had)\b/i],
 ['instruction','توجيه عملي',/^(?:don.t|be|return|hand|look|come|go|put|get|keep|stay|bring|close|clean|check|choose|tell|remember|try|help|give|listen|wake|see|find|wait|call|make|let.s)\b/i],
 ['description','وصف وإخبار',/./]
];
const stop=new Set("i me my myself we us our you your yourself he him his she her hers it its they them their tom mary a an the this that these those to of in on at for from with by into out up off about as than and or but so if when where what who whom whose why how which is are was were be been being am do does did doing done have has had having ve got can could would should must may might will shall s t m re ll d don doesn didn won isn aren wasn weren no not never any all some such just very really much many more most less one two three first last now here there then only else other another something anything everything nothing someone anyone everyone nobody somewhere anywhere before after again also still already yet ever even well right quite pretty rather almost enough too each both same own get gets getting go goes going come comes say says said tell told know knows knew think thinks thought see seen want wants wanted need needs needed like likes that’s it’s i’m i’ve let’s".split(/\s+/));
function keywords(text){return [...new Set((text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[]).filter(w=>w.length>2&&!stop.has(w)))].slice(0,12)}
function classify(text,rule=''){
 let chosen=grammar.find(g=>g[3].test(text));
 // An accustomed construction must never also be labelled as a former habit.
 const tags=grammar.filter(g=>g[0]!=='statement'&&g[3].test(text)&&!(chosen[0]==='accustomed'&&g[0]==='past-habit')).map(g=>g[0]);
 const ds=domains.filter(d=>d[2].test(text)).map(d=>d[0]);if(!ds.length)ds.push('everyday');
 const purposes=functions.filter(f=>f[0]!=='description'&&f[2].test(text)).map(f=>f[0]);if(!purposes.length)purposes.push('description');
 const level=['reported-question','reported-command','indirect-question','cleft','relative-clause','wish','correlative-comparison','perfect-continuous','concession'].includes(chosen[0])?'B1–B2':['wh-question','yes-no-question','description','demonstrative','possession','existence','imperative','suggestion'].includes(chosen[0])&&text.split(/\s+/).length<=9?'A1–A2':'A2–B1';
 return {construction:chosen[0],grammar:[...new Set([chosen[0],...tags])],domains:ds,purposes,level,level_review:'provisional editorial range, not a placement result',keywords:[...keywords(text),chosen[1],...ds.map(id=>domains.find(d=>d[0]===id)?.[1]||'يومي'),...purposes.map(id=>functions.find(f=>f[0]===id)[1])],classification_review:'rule-assisted facets; original rule retained for review'};
}
module.exports={classify,keywords,taxonomy:{grammar:grammar.map(([id,ar,form])=>({id,ar,form})),domains:[...domains.map(([id,ar])=>({id,ar})),{id:'everyday',ar:'مواقف يومية عامة'}],purposes:functions.map(([id,ar])=>({id,ar}))}};
