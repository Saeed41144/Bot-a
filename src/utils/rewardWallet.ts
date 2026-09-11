import { WebNovel, WebNovelChapter, UserRewardWallet, Language, RewardTransaction } from '../types';
import { safeStorage } from './safeStorage';

export const WALLET_STORAGE_KEY = 'lally_reward_wallet_v1';
export const NOVELS_STORAGE_KEY = 'lally_custom_novels_v1';
export const DELETED_NOVELS_STORAGE_KEY = 'lally_deleted_novels_v1';

export const getDeletedNovelIds = (): string[] => {
  try {
    const saved = safeStorage.getItem(DELETED_NOVELS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse deleted novel IDs:', e);
  }
  return [];
};

export const saveDeletedNovelIds = (ids: string[]) => {
  try {
    safeStorage.setItem(DELETED_NOVELS_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('Failed to save deleted novel IDs:', e);
  }
};

export const COINS_PER_CHECKIN = 10; // Earn 10 reward coins per habit checked
export const COINS_PER_STREAK_BONUS = 5; // Bonus for unbroken streaks
export const COINS_PER_ACHIEVEMENT = 50; // Bonus for achievements

// Default high-quality starter web novels with chapters priced between 1 to 5 coins
// These are permanently embedded in the codebase as system defaults and will never be lost on reset or cache clear.
export const getDefaultWebNovels = (language: Language): WebNovel[] => {
  if (language === 'fa') {
    return [
      {
        id: 'novel-synapse-rebirth',
        title: 'نبرد سیناپس‌ها: بازگشت ارباب عادات',
        author: 'معمار انضباط (الکس کیم)',
        genre: 'سیستم و ارتقای فردی / فانتزی مدرن',
        synopsis: 'در دنیایی که هر تصمیم روزانه به انرژی سیناپسی تبدیل می‌شود، آریا که در بحران تنبلی و فرسایش روحی غرق شده بود، به گذشته بازمی‌گردد با یک سیستم اختصاصی: «مدل ۶۶ روزه دکتر لالی». او حالا باید با تثبیت عادات کوچک، قصر عصبی خود را بازسازی کند و بر اربابان حواس‌پرتی و فرسایش پیروز شود...',
        price: 5, // Total 5 coins (1 habit gives 10 coins!)
        pricePerChapter: 2,
        rating: 4.9,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '45 KB',
        coverColor: 'from-blue-600 via-indigo-700 to-purple-900',
        tags: ['سیستم', 'تناسخ', 'انضباط', 'علمی-تخیلی', 'روانشناسی'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'فصل اول: بیداری در نقطه صفر سیناپسی',
            price: 1, // 1 coin
            content: `صدای تیک‌تاک ساعت دیواری شبیه ضربات پتک بر جمجمه‌ام فرود می‌آمد.
چشم‌هایم را که باز کردم، تقویم روی دیوار سال‌ها به عقب برگشته بود؛ روزهایی که هنوز اراده‌ام زیر خروارها بهانه‌تراشی و پاداش‌های ارزان دوپامینی مدفون نشده بود.

ناگهان کادری شفاف و آبی‌رنگ در میدان دیدم پدیدار شد:
[سیستم عصبی لالی فعال شد]
[وضعیت فعلی: صفر درصد خودکارشدگی - انرژی شناختی مصرفی: حداکثر]
[ماموریت اولیه: اولین پیوند سیناپسی را با ثبت یک عادت کوچک برقرار کن.]

لبخند تلخی زدم. این بار قرار نبود به انگیزه‌های لحظه‌ای و هیجانات زودگذر تکیه کنم. من قانون ۶۶ روز را می‌دانستم؛ بازی تازه آغاز شده بود...`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'فصل دوم: شکستن دیواره مقاومت مغز',
            price: 2, // 2 coins
            content: `روز هفتم بود. قشر پیش‌پیشانی مغزم مثل کوره‌ای داغ می‌سوخت.
هر سلول از بدنم التماس می‌کرد که امروز را بی‌خیال شوم. صدای وسوسه‌انگیز درونم زمزمه می‌کرد: «فقط یک روز استراحت کن، فردا جبران می‌کنی!»

اما من چشمانم را بستم و به فرمول فیلیپا لالی فکر کردم:
y = a + (b - a) * (1 - e^(-k * t))

«یک روز لغزش تصادفی، کل فرآیند را نابود نمی‌کند؛ اما تسلیم شدن آگاهانه مدار را می‌شکند.»
کفش‌هایم را پوشیدم. فقط ۲ دقیقه. این قانون طلایی برای عبور از دروازه مقاومت بود. وقتی ۲ دقیقه تمام شد، اینرسی شکسته شده بود و دوپامین پیروزی در رگ‌هایم جریان یافت.`
          },
          {
            id: 'ch-3',
            chapterNumber: 3,
            title: 'فصل سوم: میلین‌سازی و تثبیت در قله ۶۶',
            price: 2, // 2 coins
            content: `روز شصت و ششم فرارسید. دیگر نیازی به فریادهای انگیزشی یا جنگیدن با خود نبود.
عمل مورد نظر مانند نفس کشیدن طبیعی شده بود. وقتی دستم به سمت کار رفت، سیستم پیامی طلایی صادر کرد:

[تبریک! مدار عصبی به آستانه ۸۵٪ خودکارشدگی رسید.]
[غلاف میلین به حداکثر تراکم دست یافت. مقاومت ارادی: صفر.]
[عنوان جدید کسب شد: ارباب ناخودآگاه.]

حالا فهمیده بودم که قدرت واقعی نه در جرقه‌های موقت، بلکه در قطرات مداوم و بی‌صدای انضباط روزمره نهفته است.`
          }
        ]
      },
      {
        id: 'novel-66-day-horizon',
        title: 'پادشاهی ۶۶ روزه: افق نامیرایان',
        author: 'دکتر فیلیپ ونس',
        genre: 'ماجراجویی حماسی / فانتزی تاریک',
        synopsis: 'افسانه‌ها می‌گویند در اعماق قلمرو نورونی، برجی به ارتفاع ۶۶ طبقه قرار دارد. هر طبقه نماد یک روز پایداری است و غول‌های تاریک آن (خستگی تصمیم‌گیری، اضطراب و سستی) منتظر لغزش جنگجویانند. شوالیه‌ای تنها با شمشیر استمرار قدم در این برج می‌گذارد...',
        price: 5,
        pricePerChapter: 2,
        rating: 4.8,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '62 KB',
        coverColor: 'from-amber-600 via-rose-700 to-slate-900',
        tags: ['حماسی', 'برج صعود', 'مبارزه', 'استقامت'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'فصل اول: دروازه طبقه ۲۱ (فاز تشنج عادت)',
            price: 2,
            content: `مه سنگینی راه پله‌های سنگی برج را پوشانده بود. هر پله سنگین‌تر از پله قبل به نظر می‌رسید.
سربازانی که همراه من وارد شده بودند، یکی پس از دیگری در طبقات اول تا بیست و یکم سلاح‌هایشان را زمین انداخته بودند.

غول طبقه ۲۱ به نام «خستگی تصمیم» با صدای غرش‌آسایی گفت:
«چرا این‌قدر خودت را شکنجه می‌دهی؟ آسودگی آسان‌تر است!»
شمشیر استمرار را محکم فشردم و گفتم: «من برای آسودگی موقت اینجا نیامده‌ام. من برای ساختن سرنوشت آمده‌ام.»`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'فصل دوم: قله ۶۶ و تاج خودکارشدگی',
            price: 3,
            content: `طبقه شصت و ششم روشن‌ترین منظره جهان را داشت.
باد خنک بر فراز قله می‌وزید و تمام دره‌ها و بیابان‌های سختی پشت سر مانده بود.
بر فراز برج، تاجی از جنس نور سیناپسی در انتظار ایستاده بود؛ تاجی که نه با ثروت، بلکه با ۶۶ روز پایبندی بی‌چون‌وچرا به حقیقت به دست می‌آمد.`
          }
        ]
      },
      {
        id: 'novel-dopamine-architect',
        title: 'کیمیاگری ذهن: مانیفست اربابان تمرکز',
        author: 'استاد هیروشی ریو',
        genre: 'روانشناسی عمیق / فلسفه انضباط',
        synopsis: 'راهنمای عملی و داستانی در قالب آموزه‌های یک استاد ذن مدرن برای بازپس‌گیری حاکمیت توجه در عصر هیاهو، بمباران نوتیفیکیشن‌ها و حواس‌پرتی‌های بی‌پایان.',
        price: 4,
        pricePerChapter: 2,
        rating: 5.0,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'md',
        fileSize: '38 KB',
        coverColor: 'from-emerald-600 via-teal-800 to-slate-950',
        tags: ['ذن', 'تمرکز عمیق', 'کیمیاگری', 'روانشناسی'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'فصل اول: سکوت در برابر امواج دوپامین ارزان',
            price: 2,
            content: `استاد کاسه چای را پر کرد تا سرریز شد.
پرسیدم: «چرا متوقف نمی‌شوید؟»
گفت: «ذهن تو نیز مانند این کاسه است؛ پر از خواسته‌های زودگذر و هیاهوهای پوچ. تا زمانی که ظرف ذهنت را از محرک‌های بی‌ارزش خالی نکنی، خرد انضباط جایی برای فرود آمدن ندارد.»`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'فصل دوم: قلعه غیرقابل نفوذ توجه',
            price: 2,
            content: `«هر بار که گوشی همراهت را بدون هدف روشن می‌کنی، تکه‌ای از اراده‌ات را به غارتگران زمان می‌بخشی.
انضباط یعنی محافظت از معبد ذهنت. وقتی یک ساعت در روز را در تمرکز ناب غوطه‌ور شوی، از صدها ساعت کار پراکنده و آشفته فراتر خواهی رفت.»`
          }
        ]
      },
      {
        id: 'novel-shadow-of-procrastination',
        title: 'شکارچی اهمال‌کاری: قلمرو اراده پولادین',
        author: 'کیوان آریامنش',
        genre: 'سیستم لیت‌آرپی‌جی / اکشن انگیزشی',
        synopsis: 'موجوداتی نامرئی به نام «سایه‌های اهمال» انرژی حیاتی انسان‌ها را می‌مکند و باعث به تعویق انداختن اهداف می‌شوند. قهرمان داستان با فعال کردن سلاح عادت‌های ۵ دقیقه‌ای، به نبرد مستقیم با شاه سایه‌ها می‌رود.',
        price: 4,
        pricePerChapter: 2,
        rating: 4.9,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '40 KB',
        coverColor: 'from-violet-600 via-purple-800 to-slate-950',
        tags: ['اکشن', 'اراده', 'مبارزه با تنبلی', 'پیروزی'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'فصل اول: حمله هیولای «بعداً انجام می‌دهم»',
            price: 2,
            content: `سایه خاکستری رنگ روی شانه‌ام سنگینی می‌کرد. صدای لزجش می‌گفت: «الان وقت مناسبی نیست. بذار برای شنبه... شنبه با انرژی شروع کن!»
اگر گذشته بود، فریبش را می‌خوردم. اما این بار شمشیر «قانون ۵ ثانیه‌ای» را بیرون کشیدم: ۵، ۴، ۳، ۲، ۱... شلیک حرکت!`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'فصل دوم: زره پیوستگی زنجیره',
            price: 2,
            content: `هر روزی که روی تقویم ضربدر می‌خورد، حلقه‌ای از جنس فولاد به زره پیوستگی‌ام اضافه می‌شد. هیولای تنبلی دیگر نمی‌توانست نفوذ کند؛ زیرا هیچ وقفه‌ای در زنجیره وجود نداشت.`
          }
        ]
      }
    ];
  } else if (language === 'ar') {
    return [
      {
        id: 'novel-synapse-rebirth',
        title: 'معركة المشابك العصبية: عودة سيد العادات',
        author: 'أليكس كيم',
        genre: 'تطوير الذات / خيال النظام الحديث',
        synopsis: 'في عالم تتحول فيه القرارات اليومية إلى طاقة عصبية ملموسة، يعود البطل بذاكرة المستقبل ونظام "الـ 66 يوماً للدكتورة لالي" لبناء حصنه العصبي والانتصار على التشتت...',
        price: 5,
        pricePerChapter: 2,
        rating: 4.9,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '45 KB',
        coverColor: 'from-blue-600 via-indigo-700 to-purple-900',
        tags: ['النظام', 'الانضباط', 'المرونة العصبية'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'الفصل الأول: الاستيقاظ عند نقطة الصفر المشبكي',
            price: 2,
            content: `كان صوت عقارب الساعة يدوي في أرجاء الغرفة كأنه يعيدني إلى الماضي.
ظهرت أمامي شاشة النظام الزرقاء:
[تم تفعيل نموذج لالي للتحكم العصبي]
[الهدف: الوصول إلى 85% تلقائية خلال 66 يوماً]
أدركت حينها أن التغيير الحقيقي يبدأ بالانضباط اليومي الهادئ وليس بالحماس المؤقت.`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'الفصل الثاني: كسر جدار المقاومة الأول',
            price: 2,
            content: `في اليوم الحادي والعشرين بدأت قشرة الدماغ الأمامية تستجيب. التكرار اليومي الصامت أصبح أقوى من أي تردد.`
          }
        ]
      },
      {
        id: 'novel-66-day-horizon',
        title: 'أفق الـ 66 يوماً: قمة الخالدين',
        author: 'د. فيليب فانس',
        genre: 'مغامرة ملحمية / انضباط',
        synopsis: 'برج أسطوري من 66 طابقاً يختبر إرادة الأبطال؛ لا ينجو إلا من أتقن فن الاستمرارية اليومية.',
        price: 5,
        pricePerChapter: 2,
        rating: 4.8,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '62 KB',
        coverColor: 'from-amber-600 via-rose-700 to-slate-900',
        tags: ['ملحمي', 'إصرار', 'تحدي'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'الفصل الأول: عبور بوابة الـ 21 يوماً',
            price: 2,
            content: `في هذا الطابق يستسلم أغلب المغامرين، لكن الاستمرار لـ 66 يوماً هو السبيل الوحيد لبلوغ المجد.`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'الفصل الثاني: تاج التلقائية في الطابق الـ 66',
            price: 3,
            content: `على قمة البرج، أشرقت شمس الحرية والانضباط التام؛ لا شيء يقف في وجه العادة الراسخة.`
          }
        ]
      }
    ];
  } else {
    return [
      {
        id: 'novel-synapse-rebirth',
        title: 'Synaptic Sovereignty: Rebirth of the Habit Master',
        author: 'Alex Kim',
        genre: 'Progression Fantasy / System LitRPG',
        synopsis: 'In a world where every daily action constructs physical neural pathways, Aria awakens with an advanced cognitive system based on Dr. Philippa Lally\'s 66-day neuroplasticity formula. Watch him conquer distraction and ascend to supreme behavioral mastery.',
        price: 5,
        pricePerChapter: 2,
        rating: 4.9,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '45 KB',
        coverColor: 'from-blue-600 via-indigo-700 to-purple-900',
        tags: ['System', 'Discipline', 'Neuroscience', 'Progression'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'Chapter 1: Awakening at Synaptic Zero',
            price: 1,
            content: `The rhythmic ticking of the wall clock echoed through the empty room.
I opened my eyes to a translucent cerulean window floating before me:
[Lally Neuroplasticity Protocol Activated]
[Current Automaticity: 0% | Cognitive Friction: Maximum]
[Primary Quest: Form the initial synaptic bridge through a single micro-habit.]

A confident smirk crossed my face. This time, I wouldn't rely on fleeting bursts of motivation. I knew the mathematical formula of 66 days. The game had just begun.`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'Chapter 2: Conquering the 21-Day Friction Threshold',
            price: 2,
            content: `By day 21, the initial resistance of the prefrontal cortex began to yield.
The internal voice that once screamed for cheap dopamine had grown quiet.
Procedural memory in the basal ganglia was solidifying. Each check-in forged a denser myelin sheath around the neural circuit.`
          },
          {
            id: 'ch-3',
            chapterNumber: 3,
            title: 'Chapter 3: The 66-Day Automaticity Plateau',
            price: 2,
            content: `Day 66 arrived.
The action was no longer a conscious effort; it had become as natural as breathing.
[Congratulations: 85%+ Automaticity Milestone Achieved.]
[Title Acquired: Master of the Subconscious Architecture.]`
          }
        ]
      },
      {
        id: 'novel-66-day-horizon',
        title: 'The 66-Day Horizon: Tower of Immortals',
        author: 'Dr. Philip Vance',
        genre: 'Epic Fantasy / Adventure',
        synopsis: 'Legends speak of the 66-Floor Spire of Willpower where challengers test their consistency against the monsters of procrastination and burnout.',
        price: 5,
        pricePerChapter: 2,
        rating: 4.8,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'txt',
        fileSize: '62 KB',
        coverColor: 'from-amber-600 via-rose-700 to-slate-900',
        tags: ['Epic', 'Tower Climbing', 'Willpower'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'Chapter 1: Gate of the First Threshold',
            price: 2,
            content: `Only those who understand unbroken consistency can climb beyond the first 21 floors...`
          },
          {
            id: 'ch-2',
            chapterNumber: 2,
            title: 'Chapter 2: Pinnacle of the 66th Floor',
            price: 3,
            content: `At the summit of the tower stood the crown of effortless automaticity.`
          }
        ]
      },
      {
        id: 'novel-dopamine-architect',
        title: 'Mind Alchemy: The Deep Focus Chronicles',
        author: 'Master Hiroshi Ryo',
        genre: 'Zen Psychology / Modern Discipline',
        synopsis: 'A gripping journey into mastering attention in an age of hyper-distraction, following the ancient discipline rituals modernized for cognitive supremacy.',
        price: 4,
        pricePerChapter: 2,
        rating: 5.0,
        isDefault: true,
        uploadedAt: '2026-08-23',
        fileType: 'md',
        fileSize: '38 KB',
        coverColor: 'from-emerald-600 via-teal-800 to-slate-950',
        tags: ['Zen', 'Deep Focus', 'Cognition'],
        chapters: [
          {
            id: 'ch-1',
            chapterNumber: 1,
            title: 'Chapter 1: Silence Against the Dopamine Torrent',
            price: 2,
            content: `The Master filled the teacup until it overflowed. "Until you empty your attention of worthless noise, the wisdom of deep focus cannot settle."`
          }
        ]
      }
    ];
  }
};

// Sanitize wallet to prevent any NaN, undefined, or corrupted values
export const sanitizeWallet = (rawWallet: any): UserRewardWallet => {
  const defaultStarterCoins = 0;
  if (!rawWallet || typeof rawWallet !== 'object') {
    return {
      coins: defaultStarterCoins,
      totalCoinsEarned: defaultStarterCoins,
      totalCoinsSpent: 0,
      unlockedNovelIds: [],
      unlockedMovieIds: [],
      unlockedEpisodeIds: [],
      unlockedChapterIds: [],
      readingProgress: {},
      transactions: [],
    };
  }

  let coins = rawWallet.coins;
  if (typeof coins === 'string') {
    coins = parseFloat(coins);
  }
  if (typeof coins !== 'number' || isNaN(coins) || !isFinite(coins)) {
    // Check legacy diamonds field if present
    const legacyDiamonds = typeof rawWallet.diamonds === 'number' && !isNaN(rawWallet.diamonds) && isFinite(rawWallet.diamonds)
      ? rawWallet.diamonds
      : defaultStarterCoins;
    coins = legacyDiamonds;
  }
  coins = Math.max(0, Math.round(coins));

  let totalCoinsSpent = rawWallet.totalCoinsSpent;
  if (typeof totalCoinsSpent === 'string') {
    totalCoinsSpent = parseFloat(totalCoinsSpent);
  }
  if (typeof totalCoinsSpent !== 'number' || isNaN(totalCoinsSpent) || !isFinite(totalCoinsSpent)) {
    totalCoinsSpent = 0;
  }
  totalCoinsSpent = Math.max(0, Math.round(totalCoinsSpent));

  let totalCoinsEarned = rawWallet.totalCoinsEarned;
  if (typeof totalCoinsEarned === 'string') {
    totalCoinsEarned = parseFloat(totalCoinsEarned);
  }
  if (typeof totalCoinsEarned !== 'number' || isNaN(totalCoinsEarned) || !isFinite(totalCoinsEarned)) {
    totalCoinsEarned = coins + totalCoinsSpent;
  }
  totalCoinsEarned = Math.max(coins + totalCoinsSpent, Math.round(totalCoinsEarned));

  return {
    ...rawWallet,
    coins,
    totalCoinsEarned,
    totalCoinsSpent,
    unlockedNovelIds: Array.isArray(rawWallet.unlockedNovelIds) ? rawWallet.unlockedNovelIds : [],
    unlockedMovieIds: Array.isArray(rawWallet.unlockedMovieIds) ? rawWallet.unlockedMovieIds : [],
    unlockedEpisodeIds: Array.isArray(rawWallet.unlockedEpisodeIds) ? rawWallet.unlockedEpisodeIds : [],
    unlockedChapterIds: Array.isArray(rawWallet.unlockedChapterIds) ? rawWallet.unlockedChapterIds : [],
    readingProgress: rawWallet.readingProgress && typeof rawWallet.readingProgress === 'object' ? rawWallet.readingProgress : {},
    transactions: Array.isArray(rawWallet.transactions) ? rawWallet.transactions : [],
  };
};

// Initial wallet
export const getInitialRewardWallet = (): UserRewardWallet => {
  try {
    const saved = safeStorage.getItem(WALLET_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return sanitizeWallet(parsed);
    }
  } catch (e) {
    console.warn('Failed to parse wallet from storage:', e);
  }

  return sanitizeWallet(null);
};

export const saveRewardWallet = (wallet: UserRewardWallet) => {
  try {
    const sanitized = sanitizeWallet(wallet);
    safeStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Failed to save wallet:', e);
  }
};

// Custom user-uploaded novels storage
// Check if a synopsis string is an in-progress temporary placeholder
export const isPlaceholderSynopsis = (synopsis?: string): boolean => {
  if (!synopsis || typeof synopsis !== 'string') return true;
  const trimmed = synopsis.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  return (
    trimmed.includes('در حال ترجمه') ||
    trimmed.includes('در دست ترجمه') ||
    trimmed.includes('قید ترجمه') ||
    lower.includes('in translation') ||
    lower.includes('being translated') ||
    lower.includes('novel is being translated') ||
    trimmed === 'خلاصه داستان ثبت نشده است.' ||
    trimmed === 'No synopsis provided.'
  );
};

// Extract clean introductory excerpt from novel chapters
export const extractCleanExcerptFromChapters = (
  chapters?: { content?: string; title?: string }[],
  maxLength: number = 200
): string => {
  if (!Array.isArray(chapters) || chapters.length === 0) return '';
  for (const ch of chapters) {
    if (!ch || !ch.content || typeof ch.content !== 'string') continue;
    // Strip HTML tags
    let text = ch.content.replace(/<[^>]+>/g, ' ');
    // Strip markdown formatting symbols
    text = text.replace(/[#*`_~=\-]/g, ' ');
    // Normalize whitespaces
    text = text.replace(/\s+/g, ' ').trim();
    // Strip repetitive chapter title at the start
    if (ch.title) {
      const cleanTitle = ch.title.replace(/\s+/g, ' ').trim();
      if (cleanTitle && text.startsWith(cleanTitle)) {
        text = text.slice(cleanTitle.length).trim();
      }
    }
    if (text.length >= 20) {
      if (text.length <= maxLength) {
        return text;
      }
      const slice = text.slice(0, maxLength);
      const lastPunc = Math.max(
        slice.lastIndexOf('.'),
        slice.lastIndexOf('!'),
        slice.lastIndexOf('؟'),
        slice.lastIndexOf('?')
      );
      if (lastPunc > 60) {
        return slice.slice(0, lastPunc + 1).trim();
      }
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > 50) {
        return slice.slice(0, lastSpace).trim() + '...';
      }
      return slice.trim() + '...';
    }
  }
  return '';
};

// Resolve a proper, informative synopsis for a novel, never leaving a placeholder "در حال ترجمه"
export const resolveNovelSynopsis = (
  novel: Partial<WebNovel> | {
    title?: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    chapters?: { content?: string; title?: string }[];
  },
  language: Language = 'fa'
): string => {
  if (!novel) return '';
  // If user provided a real, non-placeholder synopsis, preserve it directly
  if (novel.synopsis && !isPlaceholderSynopsis(novel.synopsis)) {
    return novel.synopsis.trim();
  }

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const cleanTitle = (novel.title || '').trim() || (isFa ? 'رمان' : isAr ? 'رواية' : 'Novel');
  const cleanAuthor = (novel.author || '').trim() || (isFa ? 'ناشناس' : isAr ? 'مجهول' : 'Unknown');
  const cleanGenre = (novel.genre || '').trim() || (isFa ? 'عمومی' : isAr ? 'عام' : 'General');
  const chaptersCount = Array.isArray(novel.chapters) ? novel.chapters.length : 0;

  const excerpt = extractCleanExcerptFromChapters(novel.chapters, 190);

  if (excerpt) {
    if (isFa) {
      return `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}. بخشی از داستان: «${excerpt}»`;
    }
    if (isAr) {
      return `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}. مقتطف من القصة: «${excerpt}»`;
    }
    return `"${cleanTitle}" — a captivating ${cleanGenre} novel by ${cleanAuthor}. Excerpt: "${excerpt}"`;
  }

  if (isFa) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}، شامل ${chaptersCount} فصل ترجمه‌شده و آماده مطالعه.`
      : `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}.`;
  }
  if (isAr) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}، تضم ${chaptersCount} فصول مترجمة وجاهزة للقراءة.`
      : `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}.`;
  }
  return chaptersCount > 0
    ? `"${cleanTitle}" — a complete ${cleanGenre} novel by ${cleanAuthor}, featuring ${chaptersCount} translated chapters.`
    : `"${cleanTitle}" — an engaging ${cleanGenre} novel by ${cleanAuthor}.`;
};

// Sanitize a novel object to ensure its synopsis is resolved if completed
export const sanitizeNovel = (novel: WebNovel, language: Language = 'fa'): WebNovel => {
  if (!novel || typeof novel !== 'object') return novel;
  if (isPlaceholderSynopsis(novel.synopsis)) {
    return {
      ...novel,
      synopsis: resolveNovelSynopsis(novel, language),
    };
  }
  return novel;
};

export const getCustomWebNovels = (): WebNovel[] => {
  try {
    const saved = safeStorage.getItem(NOVELS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((n) => sanitizeNovel(n));
      }
    }
  } catch (e) {
    console.warn('Failed to parse custom novels:', e);
  }
  return [];
};

export const saveCustomWebNovels = (novels: WebNovel[]) => {
  try {
    const sanitized = Array.isArray(novels) ? novels.map((n) => sanitizeNovel(n)) : [];
    safeStorage.setItem(NOVELS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Failed to save custom novels:', e);
  }
};

// Combine defaults + custom uploaded novels safely, filtering out deleted novels
export const getAllWebNovels = (
  language: Language,
  customNovels: WebNovel[] = getCustomWebNovels(),
  deletedNovelIds: string[] = getDeletedNovelIds()
): WebNovel[] => {
  const defaults = getDefaultWebNovels(language);
  const deletedSet = new Set(deletedNovelIds);
  const defaultIds = new Set(defaults.map((d) => d.id));
  const customs = customNovels.map((n) => sanitizeNovel(n, language)).filter((c) => !defaultIds.has(c.id));
  return [...defaults, ...customs].filter((n) => !deletedSet.has(n.id));
};

// Calculate total unlock price for full novel based on sum of chapters or price per chapter
export const getNovelTotalCalculatedPrice = (novel: WebNovel): number => {
  if (novel.chapters && novel.chapters.length > 0) {
    const sum = novel.chapters.reduce((acc, ch) => {
      const p = ch.price !== undefined && ch.price > 0
        ? Number(ch.price)
        : (novel.pricePerChapter !== undefined && novel.pricePerChapter > 0 ? Number(novel.pricePerChapter) : 2);
      return acc + p;
    }, 0);
    return Math.max(1, sum);
  }
  if (novel.pricePerChapter !== undefined && novel.pricePerChapter > 0) {
    return Math.max(1, Number(novel.pricePerChapter));
  }
  return novel.price !== undefined ? Math.max(1, Number(novel.price)) : 5;
};

// Check if chapter is unlocked for reading
export const isChapterUnlocked = (
  wallet: UserRewardWallet,
  novelId: string,
  chapterId: string,
  chapterIndex?: number
): boolean => {
  // If whole novel is unlocked, all chapters are unlocked
  if (wallet.unlockedNovelIds.includes(novelId)) return true;
  
  // Chapter 1 (index 0) can be unlocked or free if desired, but if user explicitly unlocks it
  const chapterKey = `${novelId}:${chapterId}`;
  if (wallet.unlockedChapterIds && wallet.unlockedChapterIds.includes(chapterKey)) {
    return true;
  }

  return false;
};

// Calculate chapter price (strictly between 1 to 5 coins)
export const getChapterPrice = (
  chapter?: Partial<WebNovelChapter>,
  defaultPerChapter: number = 2
): number => {
  if (typeof chapter?.price === 'number' && chapter.price >= 1) {
    return Math.min(5, Math.max(1, Math.round(chapter.price)));
  }
  return Math.min(5, Math.max(1, Math.round(defaultPerChapter || 2)));
};

// Check if a specific chapter has been read
export const isChapterRead = (
  wallet?: UserRewardWallet,
  novelId?: string,
  chapterId?: string,
  chapterIndex?: number
): boolean => {
  if (!wallet || !novelId || !wallet.readingProgress || !wallet.readingProgress[novelId]) {
    return false;
  }
  const prog = wallet.readingProgress[novelId];
  if (chapterId && Array.isArray(prog.readChapterIds) && prog.readChapterIds.includes(chapterId)) {
    return true;
  }
  if (typeof chapterIndex === 'number' && Array.isArray(prog.readChapterIndexes) && prog.readChapterIndexes.includes(chapterIndex)) {
    return true;
  }
  return false;
};

// Get the 1-based number of the last read chapter for display
export const getLastReadChapterNumber = (
  wallet?: UserRewardWallet,
  novelId?: string
): number | null => {
  if (!wallet || !novelId || !wallet.readingProgress || !wallet.readingProgress[novelId]) {
    return null;
  }
  const prog = wallet.readingProgress[novelId];
  if (typeof prog.lastChapterNumber === 'number' && prog.lastChapterNumber > 0) {
    return prog.lastChapterNumber;
  }
  if (typeof prog.lastChapter === 'number' && prog.lastChapter >= 0) {
    return prog.lastChapter + 1;
  }
  if (Array.isArray(prog.readChapterIndexes) && prog.readChapterIndexes.length > 0) {
    return Math.max(...prog.readChapterIndexes) + 1;
  }
  return null;
};

// Get total count of read chapters for a novel
export const getReadChaptersCount = (
  wallet?: UserRewardWallet,
  novelId?: string
): number => {
  if (!wallet || !novelId || !wallet.readingProgress || !wallet.readingProgress[novelId]) {
    return 0;
  }
  const prog = wallet.readingProgress[novelId];
  if (Array.isArray(prog.readChapterIndexes) && prog.readChapterIndexes.length > 0) {
    return prog.readChapterIndexes.length;
  }
  if (Array.isArray(prog.readChapterIds) && prog.readChapterIds.length > 0) {
    return prog.readChapterIds.length;
  }
  if (typeof prog.lastChapter === 'number' && prog.lastChapter >= 0) {
    return 1;
  }
  return 0;
};

// Download novel content as a text/markdown/html file
export const downloadNovelAsFile = (novel: WebNovel) => {
  let contentToDownload = '';
  let mimeType = 'text/plain;charset=utf-8';
  let extension = novel.fileType || 'txt';

  if (novel.fileData && novel.fileData.startsWith('data:')) {
    // If it's a data URL (e.g. PDF/EPUB/Binary uploaded), trigger direct download
    const a = document.createElement('a');
    a.href = novel.fileData;
    a.download = novel.fileName || `${novel.title}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (novel.rawContent) {
    contentToDownload = novel.rawContent;
  } else if (novel.chapters && novel.chapters.length > 0) {
    contentToDownload = `# ${novel.title}\nنویسنده: ${novel.author || 'نامشخص'}\nژانر: ${novel.genre}\n\nخلاصه:\n${novel.synopsis}\n\n=====================================\n\n`;
    novel.chapters.forEach((ch) => {
      contentToDownload += `\n\n### ${ch.title}\n\n${ch.content}\n\n-------------------------------------\n`;
    });
  } else {
    contentToDownload = `# ${novel.title}\nنویسنده: ${novel.author || 'نامشخص'}\n\n${novel.synopsis}`;
  }

  const blob = new Blob([contentToDownload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = novel.fileName || `${novel.title.replace(/[\/\\?%*:|"<>]/g, '_')}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
