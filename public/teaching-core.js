(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.EPTeaching=api})(globalThis,function(){
 const rules={
 'accustomed':['be/get used to + noun / -ing','بعد be/get used to يأتي اسم أو فعل بصيغة ing؛ المقصود الاعتياد، وليس عادة انتهت.','After be/get used to, use a noun or an -ing form. This means being or becoming accustomed to something.','لا تخلط be used to مع used to + الفعل الأساسي.','Do not confuse be used to with used to + a base verb.',/\b(?:(?:am|is|are|was|were|be|been|being|get|gets|getting|got)\s+used to)\b/i],
 'past-habit':['used to + base verb','نستخدم used to مع الفعل الأساسي لعادة أو حالة سابقة لا تستمر الآن.','Use used to + a base verb for a past habit or state that no longer continues.','بعد did/didn’t تكتب use to؛ وتختلف عن be used to + ing.','After did/didn’t, use use to. This differs from be used to + -ing.',/\b(?:used to|(?:did(?:n't| not)?\s+\w+\s+use to))\b/i],
 'lack-necessity':['do not have to / no need to','عدم الاضطرار يعني أن الفعل اختياري، ولا يعني أنه ممنوع.','Lack of necessity means the action is optional, not forbidden.','don’t have to تختلف عن mustn’t التي تدل على المنع.','Don’t have to differs from mustn’t, which expresses prohibition.',/\b(?:(?:do(?:n't| not)|does(?:n't| not)|did(?:n't| not)) have to|no need to|need(?:n't| not))\b/i],
 'polite-request':['could / would / may + request','تساعد الأفعال الناقصة في صياغة الطلب أو الاستئذان بأدب. بعدها يأتي الفعل الأساسي.','Modal verbs can make a request or permission question polite. Use a base verb after the modal.','انتبه للغرض: الطلب المهذب لا يساوي بالضرورة الحديث عن الماضي.','Notice the purpose: a polite modal request does not necessarily refer to the past.',/\b(?:could|would|may|can)(?:\s+(?:you|I|we))?(?:\s+(?:please|like))?\b/i],
 'reported-question':['asked / wondered + question clause','في السؤال المنقول نرتب الجملة الداخلية ترتيبًا خبريًا: الفاعل ثم الفعل.','In a reported question, the embedded clause uses statement order: subject before verb.','في سؤال نعم/لا نستخدم if أو whether؛ لا نعكس الفاعل والفعل داخل الجملة المنقولة.','Use if or whether for a reported yes/no question; do not invert the embedded subject and verb.',/\b(?:asked|wondered)(?:\s+\w+)?\s+(?:if|whether|where|what|when|why|how)\b/i],
 'reported-command':['ask/tell + person + to + verb','نستخدم ask/tell ثم الشخص ثم to والفعل لنقل طلب أو توجيه.','Use ask/tell + a person + to + a base verb to report a request or instruction.','لنقل النهي نستخدم not to + الفعل.','For a negative instruction, use not to + a base verb.',/\b(?:ask|asked|tell|told)\b/i],
 'indirect-question':['know / wonder + question clause','داخل السؤال غير المباشر يأتي الفاعل قبل الفعل، حتى لو كانت الجملة الكبرى سؤالًا.','Inside an indirect question, put the subject before the verb, even when the main clause is a question.','قارن: Where is it? مع Do you know where it is?','Compare Where is it? with Do you know where it is?',/\b(?:(?:do you )?know|wonder)(?:\s+(?:if|whether|where|what|when|why|how))?\b/i],
 'wh-question':['question word + question structure','تحدد أداة السؤال نوع المعلومة المطلوبة؛ يتغير الترتيب بحسب الفعل ونوع السؤال.','The question word identifies the information needed; word order depends on the verb and question type.','سؤال الفاعل مثل Who called? لا يحتاج do إضافية.','A subject question such as Who called? does not need an extra do.',/\b(?:what|where|when|who|whose|why|which|how)(?:\s+(?:long|much|many|often|far|old))?\b/i],
 'yes-no-question':['auxiliary / be / modal + subject','في أسئلة نعم/لا يسبق الفعل المساعد أو be أو الفعل الناقص الفاعل.','In yes/no questions, the auxiliary, be, or modal comes before the subject.','مع do/does/did نستخدم الفعل الأساسي بعد الفاعل.','With do/does/did, use the base form of the main verb.',/^(?:do|does|did|am|is|are|was|were|have|has|had|can|could|will|would|should|may)\b/i],
 'suggestion':["let’s + base verb",'نستخدم let’s لاقتراح فعل نقوم به معًا، ويأتي بعدها الفعل الأساسي.','Use let’s + a base verb to suggest doing something together.','النفي هو let’s not + الفعل.','The negative form is let’s not + a base verb.',/\blet['’]s(?: not)?\b/i],
 'permission-let':['let + person + base verb','بعد let نذكر الشخص ثم الفعل الأساسي دون to.','After let, use the person and then a base verb without to.','تختلف Let me help عن Let’s help: الأولى عرض أو سماح، والثانية اقتراح مشترك.','Let me help offers help or asks permission; let’s help is a joint suggestion.',/\blet\s+(?:me|him|her|us|them|you)\b/i],
 'wish':['wish + clause','تعبّر wish عن تمنٍ يخالف الواقع أو عن أسف؛ تحدد صيغة الجملة بعدها الزمن المقصود.','Wish can express an unreal desire or regret; the following verb form identifies the time reference.','للتمني عن الحاضر نستعمل غالبًا الماضي، وعن الماضي نستخدم الماضي التام.','A present unreal wish often uses a past form; a past regret uses the past perfect.',/\b(?:wish|wishes|wished)\b/i],
 'concession':['even if / even though / no matter','تربط هذه الصيغ فكرةً بنتيجة تستمر رغم شرط أو صعوبة.','These expressions connect a circumstance or obstacle with a result that still holds.','even though لحقيقة معروفة، وeven if لشرط محتمل أو افتراضي.','Even though introduces an established fact; even if introduces a possible or hypothetical condition.',/\b(?:even (?:if|though)|although|though|no matter)\b/i],
 'condition':['if / unless / in case + clause','يربط الشرط بين حالة ونتيجة؛ اختر الأزمنة بحسب المعنى والاحتمال.','A conditional connects a condition with a result; choose verb forms to match the intended possibility.','in case للاحتياط، وليست بديلًا عن if في كل جملة.','In case expresses precaution and cannot replace if in every sentence.',/\b(?:if|unless|in case)\b/i],
 'correlative-comparison':['the + comparative … the + comparative','نربط تغيرين متلازمين: كلما زاد أو تغير الأول، تغير الثاني.','Use two the + comparative clauses to connect two related changes.','المقصود علاقة بين تغيرين، لا صيغة التفضيل الأعلى.','This connects changes; it is not a superlative structure.',/\bthe (?:more|less|better|worse|\w+er)\b/gi],
 'superlative':['the + superlative','نستخدم التفضيل الأعلى للمقارنة داخل مجموعة محددة.','Use a superlative to identify an extreme within a group.','انتبه إلى أشكال best وworst وإلى المجموعة التي تقارن داخلها.','Notice irregular forms such as best/worst and identify the comparison group.',/\b(?:the (?:most|least|best|worst|\w+est))\b/i],
 'comparison':['comparative + than / as … as','تستخدم المقارنة لبيان فرق أو تساوٍ بين شيئين أو حالتين.','Comparatives show a difference or equality between things or situations.','نستخدم than مع المقارنة، وas … as للمساواة.','Use than with a comparative and as … as for equality.',/\b(?:than|as|more|less|better|worse|\w+er)\b/gi],
 'quantity':['quantity + noun / of + group','تحدد ألفاظ الكمية مقدار الشيء أو جزءًا من مجموعة.','Quantity expressions identify an amount or a portion of a group.','اختر الصيغة بحسب المعدود وغير المعدود، واستخدم of عند تحديد مجموعة مناسبة.','Choose forms for countable or uncountable nouns; use of when referring to an appropriate defined group.',/\b(?:all|some|any|most|many|much|few|little|half|enough|a lot)(?: of)?\b/i],
 'existence':['there + is / are','نستخدم there is للمفرد أو غير المعدود، وthere are للجمع، للإخبار بوجود شيء.','Use there is with singular or uncountable nouns and there are with plurals to express existence.','there هنا جزء من البناء، وليست دائمًا بمعنى هناك كمكان.','Here, there belongs to the existence construction; it does not always name a location.',/\bthere(?:['’]s| (?:is|are|was|were))\b/i],
 'demonstrative':['this / that / these / those + be','نستخدم أسماء الإشارة بحسب القرب والبعد والإفراد والجمع.','Choose this/that/these/those according to distance and singular/plural reference.','this/that مع is، وthese/those مع are في المضارع.','In the present, use this/that with is and these/those with are.',/\b(?:this|that|these|those)(?: (?:is|are|was|were)|['’]s)\b/i],
 'cleft':['it is … who / that / what','يساعد هذا البناء في إبراز شخص أو معلومة محددة داخل الجملة.','This structure puts focus on a particular person or piece of information.','انتبه إلى الجزء الذي نؤكده، بدل ترجمة كل كلمة وحدها.','Identify the focused part instead of translating each word separately.',/\b(?:it|this)(?: is|['’]s)\b/i],
 'relative-clause':['noun + who / which / that / whose','تصف جملة الموصول اسمًا وتضيف إليه معلومة أو تحدده.','A relative clause describes or identifies a noun.','whose للملكية، وwhere للمكان، وقد تحذف أداة الموصول في بعض جمل المفعول.','Whose expresses possession, where refers to place, and some object relatives can omit the relative pronoun.',/\b(?:who|which|that|whose|where)\b/i],
 'causative':['make / keep / get + person + complement','نستخدم أبنية التسبب للتأثير في فعل شخص أو حالته؛ يختلف ما يلي كل فعل.','Causative structures describe an effect on someone’s action or state; each verb has its own complement pattern.','مثل make someone do، وkeep someone doing؛ لا تنقل صيغة فعل إلى آخر تلقائيًا.','Compare make someone do with keep someone doing; do not transfer one verb’s pattern to another.',/\b(?:make|makes|made|keep|keeps|kept|talk(?:ed)?\s+\w+\s+into)\b/i],
 'perception':['look / sound / seem + complement','نستخدم أفعال الانطباع مع صفة، أو like مع اسم/تشبيه بحسب المعنى.','Perception verbs can take an adjective, or like + a noun/comparison, depending on the meaning.','look like + اسم تختلف عن look + صفة.','Look like + a noun differs from look + an adjective.',/\b(?:look|looks|looked|sound|sounds|sounded|seem|seems|seemed)(?: like)?\b/i],
 'obligation':['have to / must / should + base verb','تعبر هذه الصيغ عن ضرورة أو التزام أو نصيحة، وتختلف قوة كل صيغة.','These forms express necessity, obligation, or advice, with different strengths.','mustn’t منع؛ don’t have to عدم اضطرار؛ should نصيحة غالبًا.','Mustn’t is prohibition; don’t have to is lack of necessity; should usually gives advice.',/\b(?:have to|has to|had to|must(?:n't)?|should(?:n't)?|ought to)\b/i],
 'ability':['can / could / be able to + base verb','بعد can/could يأتي الفعل الأساسي دون to؛ نستخدم be able to مع to.','Use a base verb without to after can/could; be able to includes to.','حدد هل المقصود قدرة أم طلب أو استئذان من سياق العبارة.','Use the context to distinguish ability from a request or permission.',/\b(?:can(?:not|['’]t)?|could(?:n't)?|(?:am|is|are|was|were|be|been) able to)\b/i],
 'possibility':['may / might / could / likely','تعبّر هذه الصيغ عن احتمال أو استنتاج بدرجات مختلفة من اليقين.','These expressions convey possibility or inference with different levels of certainty.','الفعل بعد may/might/could بصيغته الأساسية؛ likely تستخدم بناء مختلفًا.','Use a base verb after may/might/could; likely takes a different structure.',/\b(?:may|might|could|likely|perhaps|probably)\b/i],
 'passive':['be + past participle','في المبني للمجهول نركز على ما حدث للشيء، ونستخدم be مع التصريف الثالث.','The passive focuses on what happens to something and uses be + a past participle.','زمن be يحدد الزمن؛ وليس كل be + صفة مبنيًا للمجهول.','The form of be carries the tense; not every be + adjective is passive.',/\b(?:am|is|are|was|were|be|been|being)(?: being| been)?\b/i],
 'perfect-continuous':['have / has / had been + -ing','نستخدم التام المستمر للتركيز على استمرار نشاط أو مدته بالنسبة إلى وقت مرجعي.','The perfect continuous focuses on an activity’s duration or continuity up to a reference time.','لا تخلطه بالتام البسيط؛ زمن have/has/had يحدد الوقت المرجعي.','Distinguish it from the perfect simple; have/has/had sets the reference time.',/\b(?:(?:have|has|had)|['’](?:ve|s|d))\s+been\s+\w+ing\b/i],
 'perfect':['have / has / had + past participle','يربط التام حدثًا بوقت مرجعي: الحاضر أو لحظة في الماضي بحسب الفعل المساعد.','The perfect relates an event to a reference time: the present or a past point, depending on the auxiliary.','have/has للمضارع التام وhad للماضي التام؛ اقرأ سياق الزمن.','Have/has forms the present perfect; had forms the past perfect. Read the time context.',/\b(?:have|has|had)(?: not|n't)?\b|['’](?:ve|s|d)\b/i],
 'future-intention':['be going to / plan to + base verb','تعبّر going to وplan to عن نية أو خطة، بحسب السياق.','Going to and plan to can express intentions or plans in context.','be تتغير مع الفاعل؛ وبعد to يأتي الفعل الأساسي.','Be agrees with the subject; use a base verb after to.',/\b(?:(?:am|is|are|['’]m|['’]s|['’]re) going to|going to|plan(?:s|ned)? to)\b/i],
 'gerund':['verb / preposition + -ing','تأتي صيغة ing بعد حروف الجر وبعد أفعال معينة بحسب تركيبها.','Use an -ing form after prepositions and after verbs that require this complement.','to قد تكون حرف جر مثل look forward to؛ عندها يليها اسم أو ing.','To can be a preposition, as in look forward to; in that case it takes a noun or -ing.',/\b(?:enjoy|avoid|mind|finish|finished|worth|feel like|look forward to|interested in)\b/i],
 'infinitive':['verb + to + base verb','تأتي to مع الفعل الأساسي بعد أفعال مثل want وneed وdecide، أو للتعبير عن غرض.','Use to + a base verb after verbs such as want, need and decide, or to express purpose.','اختر المكمل الذي يتطلبه الفعل؛ لا تصلح ing بدل to في كل موضع.','Choose the complement required by the verb; -ing cannot replace to in every context.',/\b(?:want|wants|need|needs|decide|decided|hope|try|managed|would like|['’]d like) to\b/i],
 'habit-frequency':['frequency adverb + verb','توضح ظروف التكرار مدى تكرر الفعل، وغالبًا تأتي قبل الفعل الرئيسي وبعد be.','Frequency adverbs show how often an action happens; they usually precede a main verb and follow be.','always وusually وoften وnever تختلف في مقدار التكرار.','Always, usually, often and never express different frequencies.',/\b(?:always|usually|often|sometimes|rarely|never|every\s+\w+)\b/i],
 'time-connection':['when / while / before / after + clause','نربط الأحداث بحسب ترتيبها أو تزامنها باستخدام رابط زمني مناسب.','Time connectors show the order or overlap of events.','في الجمل الزمنية عن المستقبل نستخدم عادة المضارع بعد when/before/after.','In future time clauses, use the present after when/before/after in the usual pattern.',/\b(?:when|while|before|after|since|until|as soon as|by the time)\b/i],
 'reason-result':['because / so / since + clause','نستخدم because لذكر سبب وso لعرض نتيجة؛ يحدد السياق وظيفة الرابط.','Because introduces a reason and so introduces a result; context identifies the connector’s function.','because + جملة؛ because of + اسم أو عبارة اسمية.','Use because + a clause, but because of + a noun phrase.',/\b(?:because(?: of)?|so(?: that)?|since|therefore|as a result)\b/i],
 'discourse':['linking expression + message','توضح عبارات الربط العلاقة بين الأفكار أو تنظم الانتقال بينها.','Discourse expressions show relationships between ideas or organize a conversation.','عبارات مثل by the way وin fact تؤدي وظيفة خطابية؛ لا تترجمها كلمة بكلمة.','Expressions such as by the way and in fact have a discourse purpose; avoid literal word-by-word translation.',/\b(?:by the way|in fact|actually|however|generally speaking|as far as|in addition(?: to)?|for example)\b/i],
 'possession':['have / has / have got + noun','تعبّر have/has وhave got عن الملكية في هذا الاستخدام.','Have/has and have got express possession in this use.','have + اسم للملكية؛ have to + فعل للضرورة.','Have + a noun expresses possession; have to + a verb expresses necessity.',/\b(?:have(?: got)?|has(?: got)?|['’]ve got|['’]s got)\b/i],
 'negation':['negative auxiliary + verb','نختار أداة النفي والفعل المساعد بحسب الزمن والبناء.','Choose the negative auxiliary to match the tense and structure.','بعد do/does/did not يأتي الفعل الأساسي؛ لا تضف نفيًا ثانيًا بلا داعٍ.','Use a base verb after do/does/did not; avoid an unintended double negative.',/\b(?:do(?:n't| not)|does(?:n't| not)|did(?:n't| not)|is(?:n't| not)|are(?:n't| not)|was(?:n't| not)|not|never|no|neither)\b/i],
 'description':['subject + be + complement','نستخدم be مع صفة أو اسم أو عبارة مكان لوصف الحالة أو الهوية أو الموقع.','Use be + an adjective, noun or place phrase to describe a state, identity or location.','تتغير be مع الفاعل والزمن: am/is/are أو was/were.','Be agrees with the subject and time: am/is/are or was/were.',/\b(?:am|is|are|was|were)|['’](?:m|s|re)\b/i],
 'imperative':['base verb / don’t + base verb','نبدأ بالفعل الأساسي للتوجيه، وقد نحذف الفاعل you لأنه مفهوم.','Start with a base verb for an instruction; the subject you is usually understood.','please يلطّف الأمر؛ don’t + الفعل للنهي.','Please can soften an imperative; don’t + a base verb makes it negative.',/^(?:(?:please\s+)?(?:don't\s+)?\w+)\b/i],
 'statement':['subject + verb + complement','حدد الفاعل والفعل وما يكمل المعنى، واقرأ الزمن من صيغة الفعل والسياق.','Identify the subject, verb and complement; read the tense from the verb form and context.','هذه جملة إخبارية؛ قد تحتوي أكثر من تركيب، فلا تختزل معناها في كلمة واحدة.','A statement may contain several structures; read the whole meaning rather than one isolated cue.',null]
 };
 const purposes={ 'ask-information':['طلب معلومة','Ask for information'],request:['طلب أو مساعدة','Make a request'],offer:['عرض أو مساعدة','Offer help'],advice:['نصيحة وتوجيه','Give advice'],preference:['رغبة وتفضيل','Express a preference'],opinion:['رأي وتقييم','Give an opinion'],emotion:['التعبير عن شعور','Express a feeling'],social:['تواصل ولباقة','Social interaction'],planning:['نية وخطة','Discuss a plan'],narration:['سرد حدث','Narrate an event'],instruction:['توجيه عملي','Give an instruction'],description:['وصف وإخبار','Describe or state a fact']};
 function indices(text,re){if(!re)return [];const out=new Set(),words=[...text.matchAll(/\S+/g)];const rx=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');for(const match of text.matchAll(rx)){for(const [i,w]of words.entries())if(w.index<match.index+match[0].length&&w.index+w[0].length>match.index)out.add(i)}return [...out]}
 function describe(s,p,meta){const r=rules[s.construction]||rules.statement;let expression=r[5],form=s.display_pattern||p?.form||r[0];
  if(p?.form){const prefix=p.form.split(/\s*\+/)[0].trim().replace(/[?]/g,'');if(prefix&&s.en.toLowerCase().replace(/’/g,"'").startsWith(prefix.toLowerCase().replace(/’/g,"'")))expression=new RegExp('^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/['’]/g,"['’]"),'i')}
  const purpose=purposes[s.purposes?.[0]]||null;
  return {form,construction:s.construction||'authored-pattern',rule_ar:meta?.explanation_ar||p?.explanation_ar||r[1],rule_en:meta?.explanation_en||p?.explanation_en||r[2],note_ar:s.teaching_note?.ar||meta?.comparison_ar||p?.comparison?.ar||r[3],note_en:s.teaching_note?.en||meta?.comparison_en||p?.comparison?.en||r[4],purpose_ar:purpose?.[0]||'',purpose_en:purpose?.[1]||'',highlight:indices(s.en,expression)};
 }
 // A reference cue teaches the construction in this sentence. The broader lesson copy stays in describe().
 const referenceCues={
  'offer-invitation':[
   [/^would you like(?: to)?\b/i,'Would you like + noun / to + verb?','استخدم اسمًا لعرض شيء، أو to مع فعل لدعوة الشخص إلى فعله.','Use a noun to offer something or to + verb to invite someone to do it.']
  ],
  'polite-request':[
   [/^would you mind if\b/i,'Would you mind if I …?','اسأل بأدب إن كان الطرف الآخر يمانع في فعل ستقوم به أنت.','Politely check whether the other person minds you doing something.'],
   [/^would you mind\b/i,'Would you mind + -ing?','استخدم فعلًا بصيغة ‎-ing بعد هذه البداية لتطلب من شخص فعل شيء بأدب.','Follow this opening with an -ing form to ask someone politely to do something.'],
   [/^(?:can|could|may) (?:I|we)\b/i,'Can / Could / May I …?','ابدأ بالفعل الناقص قبل الفاعل لتطلب الإذن، ثم استخدم الفعل الأساسي.','Put the modal before the subject to ask permission, then use the base verb.'],
   [/^(?:is it|would it be) (?:okay|all right|alright) if\b/i,null,'اذكر الفعل الذي تستأذن فيه في الجملة التي تبدأ بـ if.','Use the if-clause to say what you are asking permission to do.'],
   [/^(?:can|could|would|will) you (?:please|open|close|tell|help|drive|show|give|lend|wait|pass|bring|move|send|call)\b/i,'Modal + you + base verb?','ضع الفعل الناقص قبل you لصياغة الطلب. ويمكن أن تضيف please.','Put the modal before you to make the request. You can add please.']
  ],
  'reported-question':[
   [/\b(?:asked|wondered) (?:\w+ )?(?:if|whether|who|what|where|when|why|which|how)\b/i,'asked / wondered + question clause','بعد asked أو wondered نذكر مضمون السؤال. إذا ذكرت الجملة الداخلية فاعلًا مستقلًا، فترتيبها خبري.','After asked or wondered, give the content of the question. An embedded clause with a separate subject uses statement order.']
  ],
  'reported-command':[
   [/\b(?:ask(?:ed)?|tell|told|advis(?:e|ed)|encourag(?:e|ed)|persuad(?:e|ed)|want(?:ed|s)?) \w+ (?:not )?to\b/i,'verb + person + (not) to + base verb','اذكر الشخص ثم الفعل الذي طُلب منه أو أُريد منه فعله. وتأتي not قبل to عند النفي.','Name the person, then the action requested or wanted. Put not before to for a negative action.']
  ],
  'indirect-question':[
   [/\b(?:know|knows|knew|wonder(?:ing)?|understand|understood|remember|tell me|find out|figure out|guess|see|matter|care|mind|bother me|decid(?:e|ed)|have no idea) (?:exactly )?(?:who|what|where|when|why|how|which|if|whether)\b/i,'verb or expression + embedded question','يحمل الجزء الأخير المعلومة أو السؤال داخل الجملة. إذا كان له فاعل مستقل، يأتي الفاعل قبل الفعل.','The final part carries the question inside the sentence. If it has a separate subject, put that subject before its verb.']
  ],
  'yes-no-question':[
   [/^(?:don['’]t|doesn['’]t|didn['’]t)\b/i,'negative auxiliary + subject + base verb?','ابدأ بالفعل المساعد المنفي، ثم اذكر الفاعل والفعل الأساسي.','Start with the negative auxiliary, then use the subject and base verb.']
  ],
  'lack-necessity':[
   [/\b(?:do(?:n['’]t| not)|does(?:n['’]t| not)|did(?:n['’]t| not)) (?:have to|need to)\b|\bno need to\b/i,null,'هذا التركيب يبيّن أن الفعل اختياري.','This expression makes the action optional.']
  ],
  'accustomed':[
   [/(?:\b(?:am|is|are|was|were|be|been|get|got|getting)|['’](?:m|s|re)) used to\b/i,'be / get used to + noun or -ing','بعد used to هنا اذكر الشيء أو النشاط الذي اعتدت عليه.','After used to here, name the thing or activity you are accustomed to.']
  ],
  'permission-let':[
   [/\ballow(?:ed|s)? \w+ to\b/i,'allow + person + to + base verb','بعد allow اذكر الشخص المأذون له، ثم to والفعل.','After allow, name the person who has permission, then use to and the verb.'],
   [/^you may\b/i,'You may + base verb','تمنح may هنا الإذن بفعل شيء.','Here, may grants permission to do something.'],
   [/\blet (?:me|him|her|us|them|you|tom|mary)\b/i,null,'بعد let اذكر الشخص، ثم استخدم الفعل الأساسي مباشرة.','After let, name the person and follow it directly with a base verb.']
  ],
  'condition':[
   [/\bbother me if\b/i,'doesn’t bother me if + clause','اذكر بعد if الفعل الذي لا يزعجك حدوثه.','Use the if-clause to name what you do not mind happening.'],
   [/\bin case\b/i,'in case + clause','اذكر بعد in case الموقف الذي تتخذ احتياطك تحسّبًا له.','After in case, state the situation you are preparing for.'],
   [/\bif\b/i,'if + condition','يحدد الجزء الذي يبدأ بـ if الحالة التي ينطبق فيها الرد أو الإجراء.','The if-clause states when the action or response applies.']
  ],
  'comparison':[
   [/\bprefer(?:s|red)?\b/i,'prefer A to B','اذكر بعد prefer الخيار المفضّل، ثم الخيار الآخر بعد to.','Name the preferred option after prefer and the other option after to.'],
   [/\b(?:the )?same\b/i,'the same …','استخدم same للدلالة على التطابق، وأضف as عند تسمية ما تقارن به.','Use same to show a match. Add as when you name what it matches.'],
   [/\bthan\b/i,'comparative + than','ما بعد than هو الشخص أو الشيء أو المقدار الذي تقارن به.','The part after than supplies the person, thing or amount used for comparison.']
  ],
  'superlative':[
   [/\bone of my favorite\b/i,'one of my favorite + plural noun','اذكر اسمًا جمعًا بعد favorite لتحدد المجموعة التي فضّلت منها هذا الشيء.','The plural noun names the group this favorite belongs to.']
  ],
  'quantity':[
   [/\bneither\b[^.!?]*?\bnor\b/i,'neither A nor B','ينفي هذا التركيب انطباق الفعل على كلا الخيارين.','Neither … nor says the action applies to neither option.'],
   [/\b(?:both of|none of|everyone (?:except|but)|almost everyone|one of the)\b/i,null,'تحدّد العبارة من تشمله من المجموعة أو من تستثنيه منها.','The expression specifies who or what is included in the group or excluded from it.']
  ],
  'concession':[
   [/\bas strange as it may sound\b/i,null,'تعترف هذه المقدّمة بأن الكلام قد يبدو غريبًا ثم تقدّم الفكرة الأساسية.','This opening acknowledges that the claim may sound strange before stating it.'],
   [/\beven though\b/i,'even though + clause','أدخل بـ even though حقيقة تجعل النتيجة غير متوقّعة.','Use even though to introduce a fact that makes the outcome surprising.'],
   [/\beven if\b/i,'even if + clause','تظل النتيجة صحيحة حتى لو تحقق الشرط الذي يلي even if.','The result still holds even if the condition happens.'],
   [/\beven when\b/i,'even when + clause','يظل الوصف أو النتيجة صحيحًا في الموقف المذكور بعد even when.','The description or result still holds in the situation introduced by even when.']
  ],
  'cleft':[
   [/\b(?:the (?:only |last )?one|me) who\b/i,null,'يحدّد ما بعد who الشخص الذي قام بالفعل.','The clause after who identifies the person who did the action.']
  ],
  'perception':[
   [/\b(?:look(?:s|ed)?|sound(?:s|ed)?|seem(?:s|ed)?) like\b/i,null,'تذكر العبارة التالية الانطباع الذي يعطيه الشخص أو الشيء.','What follows gives the impression the person or thing makes.'],
   [/\bappear(?:s|ed)? (?:that|to be)\b/i,null,'يقدّم هذا البناء ما يبدو صحيحًا بحسب الانطباع أو الدليل المتاح.','Use this expression for what seems true from the evidence available.'],
   [/\b(?:look(?:s|ed)?|sound(?:s|ed)?|seem(?:s|ed)?)\b/i,'look / sound / seem + adjective','تصف الصفة الانطباع الذي يعطيه الشخص أو الشيء.','Use the adjective to describe the impression the person or thing gives.']
  ],
  'obligation':[
   [/\bshould have\b/i,'should have + past participle','تُقيّم هذه الصيغة فعلًا في الماضي، وقد تأتي في سياق الندم أو النقد.','Use this form to assess a past action, often in hindsight.'],
   [/\b(?:should|ought to|had better|better get)\b/i,null,'يقدّم هذا التركيب الفعل الذي تراه أنسب في الموقف.','This expression gives the action that seems best in the situation.'],
   [/\b(?:must|have to|has to|had to|need(?:s|ed)? to|supposed to)\b/i,null,'تذكر العبارة الفعل المطلوب أو اللازم في هذا الموقف.','The expression introduces the action required or expected in this situation.']
  ],
  'ability':[
   [/\bmanage(?:d|s)? to\b/i,'manage to + base verb','يعني التركيب نجاح الشخص في فعل شيء، غالبًا بعد جهد أو صعوبة.','This means someone succeeds in doing something, often with some effort.'],
   [/\b(?:able|unable) to\b/i,null,'اذكر بعد to الفعل الذي يستطيع الشخص القيام به أو يعجز عنه.','After to, give the action the person can or cannot do.'],
   [/\b(?:can(?:not|['’]t)?|could(?:n['’]t)?)\b/i,null,'اذكر الفعل الأساسي بعد هذه الصيغة للتعبير عن إمكان الفعل أو تعذّره.','Use a base verb after the modal to say what can or cannot be done.']
  ],
  'possibility':[
   [/\b(?:possible|unlikely|likely) that\b/i,null,'تعبّر الصفة عن مدى احتمال حدوث ما يلي that.','The adjective rates how likely the following situation is.'],
   [/\bdoubt that\b/i,'doubt (that) + clause','تبيّن العبارة ما يشكّ المتكلم في صحته.','Use the clause to state what the speaker doubts.']
  ],
  'passive':[
   [/\bshould be washed\b/i,'should be + past participle','تُذكر هنا الحاجة إلى غسل الشيء، ويمكن ترك من سيقوم بالغسل مفهومًا من السياق.','Say what should be washed. The person who will wash it can be left unstated.']
  ],
  'perfect':[
   [/\b(?:the )?first time\b/i,'This is the first time + present perfect','استخدم المضارع التام لذكر الفعل الذي تقوم به للمرة الأولى حتى الآن.','Use the present perfect for the action this is your first time doing.']
  ],
  'future-intention':[
   [/\b(?:plan(?:s|ned|ning)?|intend(?:s|ed)?) to\b/i,null,'ضع الفعل الذي تنوي فعله بعد to.','Put the planned action after to.'],
   [/\b(?:no )?intention of\b/i,'(no) intention of + -ing','يأتي الفعل بصيغة ‎-ing بعد of لبيان ما ينوي الشخص فعله أو يمتنع عن التخطيط له.','After of, use an -ing form to say what someone intends or has no intention of doing.'],
   [/\babout to\b/i,'be about to + base verb','هذا التركيب يعني أن الحدث على وشك الوقوع.','This expression means the action is about to happen.'],
   [/(?:\b(?:am|is|are|was|were|be)|['’](?:m|s|re)) going to\b/i,'be going to + base verb','يأتي بعد going to الفعل الذي يتوقّع المتكلم حدوثه أو ينوي القيام به.','After going to, name the action expected or intended.'],
   [/\b(?:will|won['’]t)\b|['’]ll\b/i,'will / won’t + base verb','يعبّر will عن قرار أو وعد أو توقّع بحسب السياق، ويأتي بعده الفعل الأساسي.','Will expresses a decision, promise or prediction in context and takes the base form.']
  ],
  'gerund':[
   [/\b(?:have|has|had) a hard time \w+ing\b/i,'have a hard time + -ing','تسمّي صيغة ‎-ing الفعل الذي يجد الشخص صعوبة فيه.','The -ing form names the action the person finds difficult.'],
   [/\b(?:stop(?:ped|s)?|keep|keeps) \w+ing\b/i,'stop / keep + -ing','بعد stop أو keep يأتي النشاط الذي يتوقف أو يستمر بصيغة ‎-ing.','Use an -ing form for the activity that stops or continues.'],
   [/\b(?:began|started|start|enjoys?|hate|likes?|mind|worth|busy|trouble|feel like) \w+ing\b/i,'expression + -ing','استخدم صيغة ‎-ing لتسمية النشاط المرتبط بالتعبير.','Use an -ing form to name the activity that goes with the expression.'],
   [/\b(?:look(?:ing)? forward to|instead of|without|after|before|for|in|of|about) \w+ing\b/i,'preposition + -ing','إذا جاء نشاط بعد حرف جر في هذا التركيب نستخدم صيغة ‎-ing.','When an action follows the preposition in this construction, use an -ing form.'],
   [/\b(?:spend(?:s)?|waste)\b[^.!?]*?\btime \w+ing\b/i,'spend / waste time + -ing','يصف الفعل بصيغة ‎-ing النشاط الذي يقضي فيه الشخص وقته.','The -ing form names the activity someone spends time on.']
  ],
  'infinitive':[
   [/\b(?:forgot|forget|remember) to\b/i,null,'الفعل بعد to هو المطلوب تذكّره أو الذي نُسي فعله.','The verb after to is the action to remember or the one someone forgot to do.'],
   [/\b(?:came|went|here|called) to (?:thank|apologize|help|ask|tell|warn|see|say|talk)\b/i,'to + base verb (purpose)','يبيّن ما بعد to سبب الحضور أو الحركة أو الاتصال.','The part after to gives the reason for coming, going, being here or calling.'],
   [/(?:\bwould|['’]d) like to\b/i,'would like to + base verb','اذكر الفعل الذي ترغب فيه بعد to.','Name the action you would like to do after to.'],
   [/\b(?:want(?:s|ed)?|hope|decide(?:d)?|need(?:s|ed)?|tried|try|expect(?:ed)?|manage(?:d)?|agree(?:d)?|offer(?:ed)?|happen(?:ed)?) (?:not )?to\b/i,null,'أكمل التعبير بعد to بالفعل الأساسي.','Complete the expression after to with the base form of the verb.'],
   [/\b(?:take|takes|took) (?:me )?(?:an hour|three hours) to\b/i,'it takes + time + to + base verb','اذكر المدة أولًا ثم الفعل الذي يستغرقها.','Give the time first, then the activity that takes that long.'],
   [/\b(?:time|turn|right) (?:for you )?to\b/i,'noun + to + base verb','تبيّن عبارة to الفعل المرتبط بالوقت أو الدور أو الحق المذكور.','The to-phrase identifies the action tied to the time, turn or right described.'],
   [/\b(?:something|anything|nothing) to\b/i,'something / anything / nothing + to + base verb','توضح عبارة to ما يمكن فعله أو ما هو متاح.','The to-phrase specifies what there is, or is not, to do.'],
   [/\b(?:afraid|sorry|glad|ready|pleased|happy|thrilled|lucky|surprised|prepared) to\b/i,'adjective + to + base verb','توضّح عبارة to الفعل المرتبط بالشعور أو الاستعداد.','The to-phrase names the action connected with the feeling or readiness.'],
   [/\b(?:good|easy|important|impossible|dangerous|difficult|okay|kind of you|too tired|useless) to\b/i,'adjective + to + base verb','تقيّم الصفة الفعل الذي يلي to في هذا السياق.','The adjective gives an assessment of the action that follows to.'],
   [/\b(?:make it a rule|be sure) to\b/i,null,'اذكر بعد to الفعل الذي تحرص على الالتزام به.','After to, name the action you make sure to do.'],
   [/\b(?:expect|consider|ask|waited for) \w+ to\b/i,'verb + person + to + base verb','يأتي الفعل بعد to مع الشخص المرتبط به في هذا التعبير.','The to-phrase gives the action associated with the person named.'],
   [/\b(?:the last (?:one|person)|bother) to\b/i,null,'أكمل العبارة بالفعل الأساسي بعد to.','Complete the phrase with the base verb after to.']
  ],
  'reason-result':[
   [/\bbecause of\b/i,'because of + noun','اذكر بعد because of سببًا في صورة اسم أو عبارة اسمية.','Give the reason as a noun or noun phrase after because of.'],
   [/\bbecause\b/i,'because + clause','اذكر سبب الموقف بعد because في جملة لها فاعل وفعل.','Use a full clause after because to give the reason.'],
   [/\bno reason to\b/i,'no reason to + base verb','تعبّر العبارة عن غياب سبب يدعو إلى الفعل المذكور بعدها.','This expression says there is no reason to do the action that follows.']
  ],
  'existence':[
   [/\bthere (?:seems?|appears?) to be\b/i,'there seems to be …','تُخبر عما يبدو أنه موجود.','Use this to say what appears to exist.'],
   [/\bthere (?:may|might|must) be\b/i,null,'يعبّر الفعل الناقص عن درجة اليقين بوجود الشيء.','The modal shows the degree of certainty that something exists.']
  ],
  'time-connection':[
   [/^no sooner\b/i,'No sooner + had + subject + participle … than …','تربط الصيغة حدثين متتابعين مباشرة، ويأتي had قبل الفاعل بعد No sooner.','This links two events in immediate succession. After No sooner, put had before the subject.'],
   [/\bas soon as\b/i,'as soon as + clause','يدل هذا البناء على وقوع الحدث الثاني فور وقوع الأول.','This construction puts one event immediately after the other.'],
   [/\buntil\b|\btill\b/i,null,'تحدد until الوقت أو الحدث الذي يستمر إليه الفعل.','Until marks the time or event up to which something continues.']
  ],
  'habit-frequency':[
   [/\b(?:five days a week|every day|seldom|hardly ever)\b/i,null,'تحدّد هذه العبارة عدد مرات حدوث الفعل أو مدى تكراره.','This expression says how frequently the action happens.']
  ],
  'discourse':[
   [/^as far as i know\b/i,null,'تحدّ هذه العبارة من نطاق الكلام إلى ما يعرفه المتكلّم.','This phrase limits the claim to what the speaker knows.'],
   [/^(?:to be honest|to tell the truth|for the record|needless to say|to make matters worse)\b/i,null,'توضّح العبارة الافتتاحية طريقة تقديم المتكلّم لما سيقوله.','This opening frames how the speaker presents what follows.'],
   [/\b(?:apparently|obviously|clearly|fortunately|luckily)\b/i,null,'تُبيّن كلمة البداية تقييم المتكلّم لما سيرويه أو مدى ثقته فيه.','The opening word gives the speaker’s reaction to or confidence in what follows.'],
   [/\b(?:as usual|at present|at one time|at this point|from now on|for the time being|so far)\b/i,null,'تضع هذه العبارة الموقف في إطاره الزمني أو في سياق ما يجري عادة.','This phrase sets the time frame or relates the event to what normally happens.'],
   [/\b(?:anyway|eventually|at last|first|in any case|in general|at least|to put it bluntly|frankly speaking|in addition to)\b/i,null,'انتبه إلى العبارة الافتتاحية التي تنظّم الكلام أو تبيّن طريقة طرحه.','Notice how the opening expression frames or organizes what follows.']
  ],
  'suggestion':[
   [/^shall we\b/i,'Shall we + base verb?','تطرح هذه البداية اقتراحًا بشأن فعل تقومان به معًا.','Use this opening to suggest doing something together.'],
   [/^why don['’]t we\b/i,'Why don’t we + base verb?','هذه الصيغة تقترح فعلًا مشتركًا.','Use this question form to suggest doing something together.'],
   [/^how about\b/i,'How about …?','استخدم هذه البداية لطرح خيار للنقاش.','Use this opening to propose an option.']
  ],
  'imperative':[
   [/^make sure\b/i,'make sure + clause','بعد make sure اذكر الأمر الذي تطلب التأكد منه.','After make sure, give the situation you want someone to check.'],
   [/^\w+[^.!?]*,?\s+will you\?$/i,'imperative + will you?','ابدأ بالفعل المطلوب. وتلحق will you بالطلب على هيئة سؤال قصير.','Start with the requested action. Will you follows as a short question tag.']
  ],
  'statement':[
   [/\b(?:have|has|had) nothing to do with\b/i,'have nothing to do with + person or thing','تنفي العبارة الصلة بالشخص أو الموضوع الذي يلي with.','This expression denies a connection to the person or subject after with.'],
   [/\bcan['’]t stand\b/i,'can’t stand + noun / -ing','تعبّر هذه العبارة عن انزعاج شديد من شيء أو نشاط.','Use this expression when something or an activity bothers you very much.'],
   [/\b(?:have|has|had) (?:a feeling|a premonition)\b/i,'have a feeling (that) + clause','تقدّم العبارة توقّعًا أو إحساسًا بشأن ما تذكره في الجملة التابعة.','Use this to introduce a feeling or hunch about what the following clause describes.'],
   [/\b(?:said|says|thought|thinks?|believes?|told \w+) that\b/i,'reporting verb + (that) + clause','تنقل الجملة بعد that مضمون القول أو الاعتقاد.','The clause after that gives what was said or believed.'],
   [/\b(?:finally )?got a job\b/i,'get a job','تعني get هنا الحصول على وظيفة.','Here, get means to obtain a job.'],
   [/\bbe willing to\b|['’]m willing to\b/i,'be willing to + base verb','اذكر الفعل الذي يوافق الشخص على القيام به.','Name the action the person is willing to take.'],
   [/\bup all night\b/i,'be up all night','تعني up هنا أن الشخص بقي مستيقظًا طوال الليل.','Here, up means staying awake all night.'],
   [/\bfind (?:it|that) (?:easy|difficult|hard)\b/i,'find it + adjective + to + base verb','تقيّم الصفة مدى سهولة الفعل أو صعوبته.','The adjective expresses how easy or difficult the activity is.'],
   [/\b(?:want|wants|wanted) (?:a|an|the|some|more)\b/i,'want + noun','بعد want اذكر الشيء الذي ترغب فيه.','After want, name the thing you would like.'],
   [/\bi hope\b/i,'hope + clause','اذكر بعد hope ما تتمنى أن يكون صحيحًا أو أن يحدث.','After hope, give the situation you would like to be true or to happen.'],
   [/\bremember \w+ing\b/i,'remember + -ing','يشير الفعل بصيغة ‎-ing إلى حدث وقع وتتذكّره.','The -ing form refers to something that happened and that you remember.']
  ]
 };

 function referenceConstruction(s,text){
  const source=s.construction;
  if(referenceCues['offer-invitation'].some(([re])=>re.test(text)))return 'offer-invitation';
  if(referenceCues['polite-request'].some(([re])=>re.test(text)))return 'polite-request';
  if(/^(?:let['’]s|why don['’]t we|how about|shall we)\b/i.test(text))return 'suggestion';
  if(/^you may leave\b/i.test(text))return 'permission-let';
  if(/^look(?: at| what)\b|^make sure\b|, (?:will you|okay)\?$/i.test(text))return 'imperative';
  if(/^no sooner\b/i.test(text))return 'time-connection';
  if(/\bas soon as\b/i.test(text)&&source==='comparison')return 'time-connection';
  if(/^as far as i know\b/i.test(text))return 'discourse';
  if(/^by the way, (?:where|who|what|when|how|why)\b/i.test(text))return 'wh-question';
  if(source==='infinitive'&&/^(?:to be honest|to tell the truth|for the record|needless to say|to make matters worse)\b/i.test(text))return 'discourse';
  if(source==='condition'&&/\b(?:see|care) if\b/i.test(text))return 'indirect-question';
  if(source==='reported-question'&&/\basked \w+ to\b/i.test(text))return 'reported-command';
  if(source==='reported-question'&&/^don['’]t hesitate\b/i.test(text))return 'imperative';
  if(source==='reported-command'&&/^(?:do you|what do you) want\b/i.test(text))return /^what\b/i.test(text)?'wh-question':'yes-no-question';
  if(source==='future-intention'&&/\binstead of going to\b/i.test(text))return 'gerund';
  if(/\bsorry to cause\b/i.test(text)||(source==='passive'&&/\bwant to get married\b/i.test(text)))return 'infinitive';
  if(source==='perception'&&/\bappears on\b/i.test(text))return 'habit-frequency';
  if(source==='demonstrative'&&/^this (?:looks|sounds|seems)\b/i.test(text))return 'perception';
  if(source==='demonstrative'&&/^this should be washed\b/i.test(text))return 'passive';
  if(source==='gerund'&&/^don['’]t be late for the meeting/i.test(text))return 'imperative';
  if(source==='gerund'&&/\bmake it a rule to\b/i.test(text))return 'infinitive';
  if((source==='infinitive'&&/\bwaste your time trying\b/i.test(text))||(source==='possession'&&/\bhad a hard time\b/i.test(text)))return 'gerund';
  if(source==='possession'&&/\bno idea (?:how|why|what|where|when)\b/i.test(text))return 'indirect-question';
  if(source==='superlative'&&/\bone of the doors\b/i.test(text))return 'quantity';
  if(source==='superlative'&&/\bthe first time i['’]ve ever\b/i.test(text))return 'perfect';
  if(!/\?$/.test(text)&&referenceCues.statement.some(([re])=>re.test(text)))return 'statement';
  return source||'statement';
 }

 const referencePurposes=[
  [/^what(?:['’]s| is) your name\b/i,'social','السؤال عن الاسم','Ask someone’s name'],
  [/^(?:(?:nice|glad|pleased) to meet you|(?:let|allow) me (?:introduce|tell you my name))\b/i,'social','التعارف والتقديم','Get acquainted'],
  [/^would you like to\b/i,'offer','دعوة شخص إلى فعل','Invite someone to do something'],
  [/^(?:would you like|do you want me to|let me help)\b/i,'offer','تقديم عرض','Make an offer'],
  [/^(?:(?:can|could|may) (?:i|we)\b|would you mind if\b|(?:is it|would it be) (?:okay|all right|alright) if\b)/i,'request','طلب الإذن','Ask for permission'],
  [/^you may leave\b/i,'description','منح الإذن','Give permission'],
  [/\ballowed \w+ to\b/i,'narration','الإخبار عن إذن مُنح لشخص','Report permission'],
  [/^(?:(?:could|can|would|will) you (?:please |(?:open|close|tell|help|drive|show|give|lend|wait|pass|bring|move|send|call)\b)|would you mind \w+ing\b)/i,'request','طلب فعل بأدب','Make a polite request'],
  [/^(?:let['’]s|why don['’]t we|how about|shall we)\b/i,'planning','اقتراح خيار أو فعل مشترك','Make a suggestion'],
  [/, will you\?$/i,'request','طلب فعل مباشر','Ask someone to do something'],
  [/\bdoesn['’]t bother me if\b/i,'opinion','التعبير عن عدم الممانعة','Say that you do not mind'],
  [/^instead of going to school\b/i,'narration','سرد ما حدث بدلًا من الفعل المتوقع','Tell what happened instead'],
  [/^(?:what|where|when|which|how) [^?]*\bshould\b[^?]*\?$/i,'ask-information','طلب نصيحة','Ask for advice'],
  [/\b(?:don['’]t have to|doesn['’]t have to|don['’]t need to|no need to)\b/i,'description','توضيح أن الفعل اختياري','Explain that an action is optional'],
  [/\b(?:i want to apologize|i apologiz(?:e|ed)|i['’]m sorry for|i['’]m sorry to cause)\b/i,'social','الاعتذار','Apologize'],
  [/\b(?:thank you|came to thank|thanks for)\b/i,'social','التعبير عن الشكر','Say thank you'],
  [/^(?:i promise|promise me)\b/i,'social','إعطاء وعد أو طلبه','Give or ask for a promise']
 ];
 function referencePurpose(s,text,construction){
  const specific=referencePurposes.find(([re])=>re.test(text));
  if(specific)return specific.slice(1);
  let id=s.purposes?.[0]||'description';
  if(construction==='imperative')id=s.purposes?.includes('advice')?'advice':'instruction';
  else if(/\?$/.test(text))id='ask-information';
  else if(construction==='reported-question')return ['narration','نقل سؤال أو تساؤل','Report a question'];
  else if(construction==='reported-command'&&/\b(?:told|asked|advised|wanted|persuaded)\b/i.test(text))id='narration';
  else if(construction==='obligation'){
   if(/\b(?:should|ought to|had better)\b/i.test(text))id='advice';
   else return ['description','بيان ما يجب فعله','State what needs to be done'];
  }else if(construction==='ability')return ['description','وصف القدرة أو الاستطاعة','Describe ability'];
  else if(construction==='possession'||construction==='perception')id='description';
  else if(id==='planning'&&!referenceCues['future-intention'].some(([re])=>re.test(text)))
   id=s.purposes.find(p=>p!=='planning')||'description';
  return [id,...(purposes[id]||purposes.description)];
 }

 const referenceKeywordFallback=/\b(?:do you think|should say|told \w+ everything|do anything for you|know that|say first|who do you know|going to go|or not|what could|what more|want to tell|tell \w+ about|doing this right|shall we|says that|knows you|last one|get here|was here|nothing to do with)\b/i;
 function describeReference(s,text=s.en){
  let construction=referenceConstruction(s,text);
  let variant=referenceCues[construction]?.find(([re])=>re.test(text));
  // These source tags can be triggered by ordinary words such as "all" and "meeting".
  if(!variant&&['future-intention','gerund','reported-question','reported-command','indirect-question'].includes(construction)){
   construction='statement';
   variant=referenceCues.statement.find(([re])=>re.test(text));
  }
  const general=rules[construction]||rules.statement;
  const [cue,form,ar,en]=variant||[general[5],general[0],general[1],general[2]];
  const highlight=indices(text,cue);
  const phrase=cue&&text.match(new RegExp(cue.source,cue.flags.replace('g','')))?.[0];
  const [purpose,purpose_ar,purpose_en]=referencePurpose(s,text,construction);
  const keywords=[...new Set([...(phrase&&/^[a-z]/i.test(phrase)&&phrase.split(/\s+/).length<=4&&
   !/^(?:do|does|did|am|is|are|was|were|have|has|had|the|it|what|who)$/i.test(phrase)?[phrase]:[]),
   ...(s.keywords||[]).filter(word=>/^[a-z]+(?:['’][a-z]+)?$/i.test(word)&&
    !/^(?:i|he|she|you|we|they|it|what)['’]/i.test(word))].map(word=>word.toLowerCase()))].slice(0,5);
  if(!keywords.length){
   const fallback=text.match(referenceKeywordFallback)?.[0];
   if(fallback)keywords.push(fallback.toLowerCase());
  }
  return {
   construction,purpose,purpose_ar,purpose_en,highlight,keywords,
   form:highlight.length?(form||phrase):'',rule_ar:highlight.length?ar:'',rule_en:highlight.length?en:''
  };
 }
 return {rules,purposes,indices,describe,describeReference};
});
