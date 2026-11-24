# تعلّم بقية الأنماط بالأغاني

حزمة إنتاج تضم **102 مهمة مستقلة لـ Gemini** لتغطية **997 جملة** من مكتبة الألف. أغاني الأساس الـ18 تغطي **180 نمطًا**، وتتطابق أمثلتها حرفيًا مع ثلاث جمل من المكتبة هي `ref-0001` و`ref-0008` و`ref-0015`. ترتبط هذه الجمل بتسجيلاتها الحالية في [خريطة التغطية](manifest.json)، فيكتمل مجموع الجمل إلى **1000**. مدة كل أغنية مستهدفة بنحو **دقيقتين ونصف**، وتضم **8 إلى 12 جملة مرجعية**.

## طريقة التوليد

1. افتح Gemini واختر **Pro**، ثم **إنشاء موسيقى**، وحدّد **Full** مع الغناء. يصف دليل Google المسار الكامل بأنه يمتد نحو دقيقتين إلى ثلاث دقائق. [دليل Gemini لإنشاء الموسيقى](https://support.google.com/gemini/answer/16901237?co=GENIE.Platform%3DDesktop&hl=ar)
2. افتح المهمة المطلوبة من الفهرس وانسخ ملف `.txt` كاملًا في طلب واحد. يبدأ الملف برقم الأغنية وعنوان العرض واسم MP3 المطلوب. تستخدم هذه البيانات للتسمية فقط. يبدأ الغناء من أول تلميح مكتوب تحت `Lyrics:`. [دليل Google DeepMind لكتابة طلبات Lyria](https://deepmind.google/models/lyria/prompt-guide/)
3. نزّل التسجيل بصيغة **MP3**. إذا اختار Gemini اسمًا آخر للتنزيل، أعد تسميته إلى الاسم المكتوب أمام `Expected MP3 filename` في المهمة. مثال الأغنية الأولى `EP-REF-SONG-001-A1-what-have-you-got.mp3`. تبدأ الأرقام الخاصة بهذه الدفعة من `EP-REF-SONG-001` وتنتهي عند `EP-REF-SONG-102`.
4. ضع ملفات الدفعة الجديدة مباشرة في مجلد تسليم واحد. تضم [قائمة استلام التسجيلات](01-AUDIO-DELIVERY.md) جميع الأسماء المتوقعة وطريقة فحص المجلد قبل النقل.

## مسار التعلّم

| المرحلة | موضع التدرّب |
| --- | --- |
| A1 | التعارف، الملكية، روتين اليوم، سؤال وجواب قصيران، والاستئذان. |
| A2 | وصف موقف، عرض خيار، سرد حدث، والسؤال عن الوقت والخطة. |
| B1 | ربط فكرتين، نقل ما قيل أو سُئل، والتعبير عن السبب والاحتمال. |
| B2 | الحفاظ على وضوح الجمل الأطول عند المقارنة، التمنّي، والحديث عن شرط أو نتيجة. |

تضمّ المراحل بالتسلسل 20 و39 و36 و7 أغانٍ. بعد الإنتاج والمراجعة تتكوّن قائمة التشغيل المشتركة من 120 أغنية، بما فيها أغاني الأساس.

المستوى في الفهرس يصف صعوبة الأداء والتدريب داخل الأغنية. تتدرّج المهمات من عبارات قصيرة يمكن ترديدها على نبض ثابت إلى جمل أطول تُقال في مجموعات صوتية طبيعية. يبدأ كل مقطع بتلميح غنائي قصير يوضّح متى نستخدم الجمل التي تليه، وتعود اللازمة باللحن نفسه. تتبع المقاطع مرحلة كلامية قصيرة فيها نموذج مسموع بسرعة محادثة مريحة، ثم وقفة لإعادة الجملة من الذاكرة، ثم وقفة لقول جملة جديدة على النمط نفسه. يمكن للمتعلّم أن يردّد أولًا مع اللحن، ثم يقول الجملة بنبرة محادثة، ثم يجرّبها بتفصيل من حياته. معيار التقدّم أن يستدعي الصيغة بسرعة أكبر مع بقاء النطق واضحًا.

## مراجعة التسجيلات وتحضير المزامنة

- طابق التسجيل مع قسم `Lyrics:` كاملًا عند الاستماع، بما في ذلك التلميحات واللازمة، وترتيب الجمل، وكلام فقرة التدريب. دقّق في أدوات النفي والاختصارات ونهايات الكلمات، خصوصًا حين تطول الجملة. أعد توليد المهمة إذا سقطت جملة أو تغيّر معناها، أو إذا غطّت الموسيقى على كلماتها.
- تأكّد من أن الوقفتين من دون صوت بشري، وأن لدى المتعلّم وقتًا للرد. جرّب الإجابة بصوتك ثم قارنها بالنموذج المنطوق. هذه الحزمة تستهدف نحو `2:30` لكل تسجيل، وتُعطي اكتمال النص ووضوح النطق الأولوية داخل مدة المسار الكامل.
- يربط [ملف الربط](manifest.json) كل جملة بمعرّفها `ref-####`، ونصها العربي، وسطر مثالها وتلميحها، وموضع إعادة النموذج المنطوق داخل الكلمات. تُستعاد صورة الجملة وموادها من سجل المعرّف نفسه في `public/source-corpus.json`. قِس توقيت الجمل والكلمات من ملف MP3 المعتمد عند التجهيز، بما فيه ظهور النموذج عند تكراره. سجّل نسخة التوقيت مع التسجيل الذي قِيست منه.
- عند تجهيز الواجهة، يمكن عرض الأغاني الـ18 في تبويب **الأنماط الأساسية**، وترتيب أغاني تبويب **بقية الأنماط** باستخدام `songOrder`. ويستخدم زر التشغيل داخل تبويب **الألف جملة** قيم `combinedPlaylistOrder` ليبدأ بأغاني الأساس ويتابع إلى الأغاني الجديدة، مع إعادة استخدام تسجيلات MP3 والصور والتوقيتات نفسها.

## فهرس مهام Gemini

### A1

| الرقم | المهمة | غرضها | الجمل |
| --- | --- | --- | ---: |
| 001 | [What Have You Got?](prompts/EP-REF-SONG-001-A1-what-have-you-got.txt) | الملكية وما لدى كل شخص | 11 |
| 002 | [Right Here in My Hand](prompts/EP-REF-SONG-002-A1-right-here-in-my-hand.txt) | الإشارة وتسليم الأشياء | 12 |
| 003 | [What's the Place Like?](prompts/EP-REF-SONG-003-A1-whats-the-place-like.txt) | وصف المكان والجو وحالة الأشياء | 11 |
| 004 | [Words for Who We Are](prompts/EP-REF-SONG-004-A1-words-for-who-we-are.txt) | التعريف بالأشخاص ووصفهم | 10 |
| 005 | [The Things I Like](prompts/EP-REF-SONG-005-A1-the-things-i-like.txt) | ما نحبه وما لا نرغب فيه | 10 |
| 006 | [Tea at the Table](prompts/EP-REF-SONG-006-A1-tea-at-the-table.txt) | الدعوة وتقديم الضيافة والطلب | 9 |
| 007 | [Time to Get Up](prompts/EP-REF-SONG-007-A1-time-to-get-up.txt) | عادات اليوم من الصباح إلى النوم | 10 |
| 008 | [How Often Do You?](prompts/EP-REF-SONG-008-A1-how-often-do-you.txt) | وصف تكرار العادة في الحياة اليومية | 12 |
| 009 | [A Little About Your Day](prompts/EP-REF-SONG-009-A1-a-little-about-your-day.txt) | السؤال عن الشخص وعاداته وتوزيع أدوار اليوم | 11 |
| 010 | [Look Around the Hotel](prompts/EP-REF-SONG-010-A1-look-around-the-hotel.txt) | وجود الأشخاص والأشياء والأماكن | 10 |
| 011 | [Is There One Nearby?](prompts/EP-REF-SONG-011-A1-is-there-one-nearby.txt) | السؤال عمّا يوجد قربنا | 9 |
| 012 | [Right on the Map](prompts/EP-REF-SONG-012-A1-right-on-the-map.txt) | السؤال عن مكان واتجاه الحركة | 9 |
| 013 | [What Time Is It For Us?](prompts/EP-REF-SONG-013-A1-what-time-is-it-for-us.txt) | الساعة والمواعيد الثابتة والقادمة | 10 |
| 014 | [How Much Is It?](prompts/EP-REF-SONG-014-A1-how-much-is-it.txt) | السعر والنقود والرسوم | 9 |
| 015 | [Put It Right Here](prompts/EP-REF-SONG-015-A1-put-it-right-here.txt) | تعليمات يومية مباشرة للمكان والحركة | 10 |
| 016 | [Don't Forget the Door](prompts/EP-REF-SONG-016-A1-dont-forget-the-door.txt) | النهي والتنبيه وتذكير شخص بفعل | 10 |
| 017 | [May I Come In?](prompts/EP-REF-SONG-017-A1-may-i-come-in.txt) | الاستئذان في الصف والأماكن العامة | 11 |
| 018 | [A Little Help, Please](prompts/EP-REF-SONG-018-A1-a-little-help-please.txt) | طلب المساعدة أو فعل من المخاطَب | 9 |
| 019 | [I Can Give It a Try](prompts/EP-REF-SONG-019-A1-i-can-give-it-a-try.txt) | القدرة والحدود المثبتة والمنفية | 12 |
| 020 | [We Can Do This Together](prompts/EP-REF-SONG-020-A1-we-can-do-this-together.txt) | اقتراح نشاط مشترك والبدء به | 11 |

### A2

| الرقم | المهمة | غرضها | الجمل |
| --- | --- | --- | ---: |
| 021 | [Let Me Take a Turn](prompts/EP-REF-SONG-021-A2-let-me-take-a-turn.txt) | العرض والسماح وتوزيع الأدوار | 11 |
| 022 | [I Want To Tell You](prompts/EP-REF-SONG-022-A2-i-want-to-tell-you.txt) | الرغبة في فعل والطلب من شخص آخر | 10 |
| 023 | [Would You Go With Me?](prompts/EP-REF-SONG-023-A2-would-you-go-with-me.txt) | الرغبات والخطط كما تظهر في السؤال | 9 |
| 024 | [First Things First](prompts/EP-REF-SONG-024-A2-first-things-first.txt) | الحاجة والواجب والنصيحة في الحاضر | 11 |
| 025 | [A Choice, a Duty, or Advice](prompts/EP-REF-SONG-025-A2-a-choice-a-duty-or-advice.txt) | التمييز بين الاضطرار وعدم الاضطرار والنصيحة | 10 |
| 026 | [Just a Little More Time](prompts/EP-REF-SONG-026-A2-just-a-little-more-time.txt) | طلب مزيد من الوقت وذكر ما نحتاجه | 9 |
| 027 | [All, Both, or None?](prompts/EP-REF-SONG-027-A2-all-both-or-none.txt) | الكمية الكلية والجزئية والاستثناء | 12 |
| 028 | [Did You Do It?](prompts/EP-REF-SONG-028-A2-did-you-do-it.txt) | أسئلة نعم أو لا عن أحداث وحالات الماضي | 10 |
| 029 | [How Was It Then?](prompts/EP-REF-SONG-029-A2-how-was-it-then.txt) | أسئلة مفتوحة عن أحداث وتجارب سابقة | 11 |
| 030 | [How Long, How Far?](prompts/EP-REF-SONG-030-A2-how-long-how-far.txt) | قياس الطول والمسافة والعمر والمدة | 9 |
| 031 | [Timing the Task](prompts/EP-REF-SONG-031-A2-timing-the-task.txt) | مدة العمل والانتظار والوقت المستغرق | 9 |
| 032 | [What's on the Calendar?](prompts/EP-REF-SONG-032-A2-whats-on-the-calendar.txt) | الخطط والنوايا في المستقبل | 12 |
| 033 | [Tomorrow's Promises](prompts/EP-REF-SONG-033-A2-tomorrows-promises.txt) | الوعود والتوقعات والمستقبل القريب | 10 |
| 034 | [Something to Look Forward To](prompts/EP-REF-SONG-034-A2-something-to-look-forward-to.txt) | التطلع إلى أمر وتوقّعه أو التعبير عن مفاجأة | 9 |
| 035 | [Let Me Tell the Story](prompts/EP-REF-SONG-035-A2-let-me-tell-the-story.txt) | سرد أفعال ماضية مختصرة بأفعال شائعة | 10 |
| 036 | [Yesterday in Small Scenes](prompts/EP-REF-SONG-036-A2-yesterday-in-small-scenes.txt) | جمل ماضية قصيرة تصف ردّ فعل أو فعلاً وقع | 10 |
| 037 | [One Thing After Another](prompts/EP-REF-SONG-037-A2-one-thing-after-another.txt) | سرد الحدث ومتى وقع وما صاحبه | 9 |
| 038 | [I Meant To, I Forgot To](prompts/EP-REF-SONG-038-A2-i-meant-to-i-forgot-to.txt) | التذكّر والنسيان والقصد باستعمال المصدر | 10 |
| 039 | [Little Things Went Wrong](prompts/EP-REF-SONG-039-A2-little-things-went-wrong.txt) | سرد مواقف يومية طارئة والاعتذار عنها | 9 |
| 040 | [Nice Words to Keep](prompts/EP-REF-SONG-040-A2-nice-words-to-keep.txt) | الشكر والتقدير والرد اللبق | 9 |
| 041 | [Opinions Around the Table](prompts/EP-REF-SONG-041-A2-opinions-around-the-table.txt) | التعبير عن الرأي والاتفاق أو الاختلاف | 9 |
| 042 | [How Are Things Going?](prompts/EP-REF-SONG-042-A2-how-are-things-going.txt) | السؤال عن الحال والجاهزية والتقدّم | 9 |
| 043 | [Can We Start Now?](prompts/EP-REF-SONG-043-A2-can-we-start-now.txt) | اقتراح وقت وطلب تأكيد بسيط | 9 |
| 044 | [Take Care on the Way](prompts/EP-REF-SONG-044-A2-take-care-on-the-way.txt) | التنبيه والإرشاد والأمان في الموقف | 9 |
| 045 | [Say It in One Breath](prompts/EP-REF-SONG-045-A2-say-it-in-one-breath.txt) | طلبات وأوامر مباشرة بحسب الموقف | 10 |
| 046 | [Start, Stop, Keep Going](prompts/EP-REF-SONG-046-A2-start-stop-keep-going.txt) | استعمال صيغة ing لبدء نشاط أو وقفه أو استمراره | 9 |
| 047 | [What I Enjoy Doing](prompts/EP-REF-SONG-047-A2-what-i-enjoy-doing.txt) | الهوايات والأنشطة المحببة وغير المحببة | 9 |
| 048 | [I Just Don't Feel Like It](prompts/EP-REF-SONG-048-A2-i-just-dont-feel-like-it.txt) | الميل إلى الفعل أو فتور الرغبة | 9 |
| 049 | [My Head, My Heart](prompts/EP-REF-SONG-049-A2-my-head-my-heart.txt) | وصف شعور جسدي أو حالة شخصية | 11 |
| 050 | [A Smile for Today](prompts/EP-REF-SONG-050-A2-a-smile-for-today.txt) | الرضا والفخر والاهتمام والتأثر | 10 |
| 051 | [Let's Choose One](prompts/EP-REF-SONG-051-A2-lets-choose-one.txt) | المفاضلة والاختيار والسؤال عن البدائل | 9 |
| 052 | [The Smallest and the Best](prompts/EP-REF-SONG-052-A2-the-smallest-and-the-best.txt) | التفضيل الأعلى واختيار الأفضل أو الأسوأ | 10 |
| 053 | [This One Costs Too Much](prompts/EP-REF-SONG-053-A2-this-one-costs-too-much.txt) | الوصف والتقييم بدرجات الشدة | 9 |
| 054 | [You Look Like Sunshine](prompts/EP-REF-SONG-054-A2-you-look-like-sunshine.txt) | الانطباع من الشكل والصوت والمظهر | 11 |
| 055 | [I Know, I Believe, I Guess](prompts/EP-REF-SONG-055-A2-i-know-i-believe-i-guess.txt) | درجات الثقة وعدم اليقين في الرأي | 11 |
| 056 | [Can I Tell You a Secret?](prompts/EP-REF-SONG-056-A2-can-i-tell-you-a-secret.txt) | التواصل الاجتماعي وطلب التوضيح دون تخمين | 10 |
| 057 | [The Word I Was Looking For](prompts/EP-REF-SONG-057-A2-the-word-i-was-looking-for.txt) | السؤال عن المعنى والكيفية وتحديد الكلمة | 10 |
| 058 | [I'm Ready for the Next Step](prompts/EP-REF-SONG-058-A2-im-ready-for-the-next-step.txt) | الجاهزية والمحاولة والاستمرار في التعلم | 9 |
| 059 | [Start with One Good Question](prompts/EP-REF-SONG-059-A2-start-with-one-good-question.txt) | أسئلة عملية عن الخطوة التالية والمساعدة | 9 |

### B1

| الرقم | المهمة | غرضها | الجمل |
| --- | --- | --- | ---: |
| 060 | [Have You Ever Been There?](prompts/EP-REF-SONG-060-B1-have-you-ever-been-there.txt) | التجربة حتى الآن والسؤال عنها | 9 |
| 061 | [Since Then, All This Time](prompts/EP-REF-SONG-061-B1-since-then-all-this-time.txt) | الماضي المتصل بالحاضر مع since وfor | 10 |
| 062 | [Time Spent Learning](prompts/EP-REF-SONG-062-B1-time-spent-learning.txt) | السؤال عن المدة والتغيّر حتى الوقت الحالي | 9 |
| 063 | [Back When Things Were Different](prompts/EP-REF-SONG-063-B1-back-when-things-were-different.txt) | العادة السابقة والاعتياد على شيء جديد | 9 |
| 064 | [Where the Answer Is](prompts/EP-REF-SONG-064-B1-where-the-answer-is.txt) | السؤال غير المباشر بعد wonder وknow | 10 |
| 065 | [Finding the Missing Detail](prompts/EP-REF-SONG-065-B1-finding-the-missing-detail.txt) | طلب معلومة بسؤال غير مباشر | 9 |
| 066 | [Now I See What You Mean](prompts/EP-REF-SONG-066-B1-now-i-see-what-you-mean.txt) | الفهم والتذكّر وتوضيح صعوبة التعلّم | 10 |
| 067 | [Ask the Whole Question](prompts/EP-REF-SONG-067-B1-ask-the-whole-question.txt) | طرح سؤال طويل مع الحفاظ على ترتيب معناه | 10 |
| 068 | [The Question She Asked](prompts/EP-REF-SONG-068-B1-the-question-she-asked.txt) | نقل أسئلة نعم أو لا باستعمال if وwhether | 9 |
| 069 | [What Did They Ask About?](prompts/EP-REF-SONG-069-B1-what-did-they-ask-about.txt) | نقل السؤال المفتوح عن الزمان والمكان والمعلومة | 9 |
| 070 | [Wondering About Someone](prompts/EP-REF-SONG-070-B1-wondering-about-someone.txt) | نقل ما يتساءل عنه الآخرون | 9 |
| 071 | [Asked Me To Do It](prompts/EP-REF-SONG-071-B1-asked-me-to-do-it.txt) | نقل طلب أو دعوة أو عرض فعل | 9 |
| 072 | [We Came Here To Help](prompts/EP-REF-SONG-072-B1-we-came-here-to-help.txt) | المصدر للدلالة على غرض الحركة والتواصل | 9 |
| 073 | [Keep It Kind](prompts/EP-REF-SONG-073-B1-keep-it-kind.txt) | النهي المهذب والنصيحة في العلاقات | 9 |
| 074 | [Don't Take It the Wrong Way](prompts/EP-REF-SONG-074-B1-dont-take-it-the-wrong-way.txt) | توضيح القصد وتصحيح سوء الفهم | 9 |
| 075 | [There Is Nothing Left](prompts/EP-REF-SONG-075-B1-there-is-nothing-left.txt) | التعبير عن غياب الخيار وما بقي للفعل أو القول | 11 |
| 076 | [Something Is Not Quite Right](prompts/EP-REF-SONG-076-B1-something-is-not-quite-right.txt) | تحديد أمر غامض أو خلل أو إمكانية | 9 |
| 077 | [What Really Matters](prompts/EP-REF-SONG-077-B1-what-really-matters.txt) | حصر المقصود أو المطلوب باستعمال all وonly | 11 |
| 078 | [That's What I Mean](prompts/EP-REF-SONG-078-B1-thats-what-i-mean.txt) | الإشارة إلى الفكرة أو الطريقة أو السبب | 10 |
| 079 | [That's the One Who Did It](prompts/EP-REF-SONG-079-B1-thats-the-one-who-did-it.txt) | تحديد شخص أو مكان بعبارة موصولة | 11 |
| 080 | [I Heard What Happened](prompts/EP-REF-SONG-080-B1-i-heard-what-happened.txt) | نقل الأخبار وما قيل وما أدركه الشخص | 10 |
| 081 | [I Decided to Tell the Truth](prompts/EP-REF-SONG-081-B1-i-decided-to-tell-the-truth.txt) | القرار والادّعاء والإفصاح عن حقيقة | 9 |
| 082 | [Reason and Result](prompts/EP-REF-SONG-082-B1-reason-and-result.txt) | ربط الحدث بسبب أو نتيجة | 10 |
| 083 | [Before and After the Moment](prompts/EP-REF-SONG-083-B1-before-and-after-the-moment.txt) | روابط الزمن وتحديد تزامن الأحداث أو ترتيبها | 9 |
| 084 | [More or Less Than You Think](prompts/EP-REF-SONG-084-B1-more-or-less-than-you-think.txt) | المقارنة في الدرجة والشبه | 9 |
| 085 | [It Seems That Way](prompts/EP-REF-SONG-085-B1-it-seems-that-way.txt) | الانطباع مقابل ما يبدو واضحًا أو مرجحًا | 10 |
| 086 | [Maybe, Probably, Surely](prompts/EP-REF-SONG-086-B1-maybe-probably-surely.txt) | التخمين والاحتمال والاستنتاج | 10 |
| 087 | [A Chance or a Certainty](prompts/EP-REF-SONG-087-B1-a-chance-or-a-certainty.txt) | السؤال عن الإمكان والتعبير عن فرصة حدوث أمر ما | 9 |
| 088 | [It Was Done That Way](prompts/EP-REF-SONG-088-B1-it-was-done-that-way.txt) | المبني للمجهول وتقديم الشيء الذي وقع عليه الفعل | 10 |
| 089 | [Good At, Worried About](prompts/EP-REF-SONG-089-B1-good-at-worried-about.txt) | وصف الحالة والاهتمام بحروف الجر المناسبة | 10 |
| 090 | [I Can't Get It Off My Mind](prompts/EP-REF-SONG-090-B1-i-cant-get-it-off-my-mind.txt) | التعبير عن الانشغال بشيء أو ضيق الصدر أو عدم الاكتراث | 10 |
| 091 | [A Hard Time, A Good Try](prompts/EP-REF-SONG-091-B1-a-hard-time-a-good-try.txt) | الصعوبة والنجاح والمحاولة في إنجاز أمر | 9 |
| 092 | [Advice or a Choice](prompts/EP-REF-SONG-092-B1-advice-or-a-choice.txt) | طلب النصيحة وذكر الواجب والضغط وتحمل المسؤولية | 10 |
| 093 | [Enough Space to Speak](prompts/EP-REF-SONG-093-B1-enough-space-to-speak.txt) | القدرة والإمكان تحت قيود الوقت والجهد | 10 |
| 094 | [A Place for Another Idea](prompts/EP-REF-SONG-094-B1-a-place-for-another-idea.txt) | تنظيم الحديث وإضافة معلومة أو الانتقال إلى موضوع | 10 |
| 095 | [What I Really Think](prompts/EP-REF-SONG-095-B1-what-i-really-think.txt) | الصراحة والتحفظ في إبداء الرأي والتعليق | 11 |

### B2

| الرقم | المهمة | غرضها | الجمل |
| --- | --- | --- | ---: |
| 096 | [If It Happens, Call Me](prompts/EP-REF-SONG-096-B2-if-it-happens-call-me.txt) | شرط واقعي وخطة احتياط وردّ عملي | 9 |
| 097 | [Even Then I Keep Going](prompts/EP-REF-SONG-097-B2-even-then-i-keep-going.txt) | التنازل والمقابلة مع even وno matter | 9 |
| 098 | [If I Could Turn Back Time](prompts/EP-REF-SONG-098-B2-if-i-could-turn-back-time.txt) | التمني والحسرة والبديل في الماضي | 8 |
| 099 | [The More, the Better](prompts/EP-REF-SONG-099-B2-the-more-the-better.txt) | المقارنة المتلازمة وتغيّر نتيجتين معًا | 10 |
| 100 | [Persuade, Ask, or Let](prompts/EP-REF-SONG-100-B2-persuade-ask-or-let.txt) | التأثير في فعل شخص آخر والإقناع والسماح | 10 |
| 101 | [Not All That Simple](prompts/EP-REF-SONG-101-B2-not-all-that-simple.txt) | التقييم الدقيق والرد على الكلام المبالغ فيه | 9 |
| 102 | [A Story With a Turn](prompts/EP-REF-SONG-102-B2-a-story-with-a-turn.txt) | الإشارة إلى لحظة التحوّل وما سبقها في السرد | 8 |
