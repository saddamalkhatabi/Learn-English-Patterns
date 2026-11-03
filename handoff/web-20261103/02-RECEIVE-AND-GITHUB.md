# استلام ZIP وإظهار الصور دون رفع متكرر

## الطريق المفضل: التنزيل المحلي والاستيراد

نزّل ZIP الناتج من المحادثة وضعه في:

`D:\ai-tools\kids-youtube-reels\15\Learn-English-Patterns\incoming\scene-zips\`

من PowerShell في جذر المشروع، افحص وفك الدفعة أولًا:

```powershell
powershell -NoProfile -File scripts/receive-scenes.ps1 -ZipPath incoming/scene-zips/EP-IMG-001.zip -Task EP-IMG-001
```

تذهب الملفات إلى `incoming/scene-staging/TASK/ZIP-SHA/` فقط. هذه الخطوة لا تغيّر الموقع ولا تفترض قبول الصورة.

بعد التأكد من REPORT.json ومراجعاته، استورد الدفعة:

```powershell
powershell -NoProfile -File scripts/receive-scenes.ps1 -ZipPath incoming/scene-zips/EP-IMG-001.zip -Task EP-IMG-001 -Apply
```

غيّر اسم ZIP ورقم المهمة لكل دفعة أو جزء مستقل.

ولكل الأرشيفات دفعة واحدة، دون الاعتماد على سياسة تشغيل ملفاتPowerShell، يكفي هذا الأمر من جذر المشروع:

```text
python scripts/import-scene-inbox.py --apply
npm run check
```

ويمكن تشغيله دون --apply للفك والفحص فقط. لا تغيّر إعدادات أمان النظام لتشغيل ملفps1؛ استخدم مدخلPythonالمباشر إذا منعته سياسة الجهاز.

تحتاج الأداة Node22 وPython القياسي وFFmpeg والملفات الصغيرة الموجودة في .media-tools/scripts فقط. لا تحتاج pip أوTorch أو أوزان نماذج. على جهاز آخر، اجلب فرع media-tools إلى .media-tools؛ لا تدمج تطبيق فرع إنتاج الصوت فوق main.

يفحص الاستيراد بصمة الصورة ومراجعات خلاياها ويقيس الفواصل. ثم يصنع WebP بمقاس 1536×2048، ويحفظ المصادر والأداة والمطالبات، ويحدّث manifests والمكتبة والمعاينات ونسخة العمل دون إنترنت. بعدها يجري البناء والتحقق.

تظهر المشاهد المعتمدة في أمثلة فهرس الأنماط بعد تحديث الصفحة. الدرس الكامل لا يرقّى تلقائيًا؛ ما تزال له شروط أسئلة ومسارات وتدريبات. الصور المربعة التسع تستبدل الخلايا المرفوضة فقط.

إعادة استلام ZIP نفسه آمنة ببصمته. ترفض الأداة استبدال أصل معتمد بملف مختلف صامتًا. عند فشل أمر اقرأ السبب ولا تنشر، ولا تحذف أصولًا قديمة لتجاوز الحماية.

**رفع الصور إلى public أو رفع ZIP وحده لا يشغّل الاستيراد.** أمر Apply أو تشغيل Actions هو خطوة الربط والبناء.

## الاستلام على GitHub من المتصفح

إذا تعذرت كتابة GitHub من النموذج، نزّل ZIP بنفسك. أنشئ مرة واحدة فرعًا باسم `media-inbox` من آخر main. من Add file → Upload files، ارفع الأرشيف إلى `uploads/EP-IMG-001.zip` على هذا الفرع. لا ترفع الأرشيف إلى main.

يبقى ZIP أقل من 20MiB حتى يظل دون حد المتصفح البالغ 25MiB للملف. يسمح GitHub برفع حتى 100 ملف في المرة؛ نستخدم هنا أرشيفًا واحدًا لتقليل عمليات الرفع. [توثيق GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

من Actions افتح **Receive reviewed scene ZIP** ثم Run workflow على main:

- zip_path: مثل `uploads/EP-IMG-001.zip`.
- task_id: مثل `EP-IMG-001`.
- اترك apply_reviewed غير مفعّل للفحص والحفظ فقط. يبقى ZIP على media-inbox، ويحفظ تقرير الاستلام كـartifact لمدة 30 يومًا.
- فعّل apply_reviewed فقط عند اكتمال مراجعات المصادر والخلايا. يستورد الصور ويختبرها ويحفظ النتيجة في فرع `media/import-EP-IMG-001-RUN_ID` للمراجعة، ثم يُدمج هذا الفرع لاحقًا في main.

لا يحتاج النموذج إلى PAT أو أسرار. إذا منعت سياسة المستودع إنشاء الفروع، احتفظ بالملف واتبع الطريق المحلي. [توثيق artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data).

## تجنب تعارض الدفعات

للمراجعة النهائية بأقل تكلفة: احفظ ZIPات الدفعات محليًا أو على media-inbox مع apply_reviewed:false، ثم استوردها تباعًا في نسخة main واحدة. اختبر واجمع النتائج في تحديثات صغيرة.

إذا استخدمت فروع Actions المستوردة، ادمج الدفعة الأولى بعد فحصها قبل استيراد التالية؛ كل تشغيل يبدأ من main. لا تدمج عشرات الفروع القديمة بافتراض خلو JSON من التعارضات.

قبل النشر شغّل:

```text
npm run build
npm run check
python tests/scene_zip_test.py
git diff --check
```

راجع أن الأصوات ونصوصها وبصماتها وتوقيتاتها بقيت كما هي. ارفع main بعد المراجعة، وانتظر نجاح Actions. النقل بـZIP ثم Git على الجهاز أوrunner يقلل طلبات الرفع الفردية، لكنه لا يضمن عدم حدوث فشل شبكة.
