import { Habit, Task, Language, UserRewardWallet, WebNovel, ShopMovie } from '../types';
import { calculateHabitStats } from './habitMath';
import { getTodayString, isDateInNowruz, getPersianSeason, getDateSeason, PersianSeason } from './persianDate';
import { safeStorage } from './safeStorage';

export type AchievementCategory = 'neuroscience' | 'streak' | 'mastery' | 'consistency' | 'seasonal' | 'fun_easter_eggs' | 'tasks' | 'shop';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon identifier
  category: AchievementCategory;
  tier: AchievementTier;
  xp: number;
  targetValue: number;
  currentValue: number;
  unlocked: boolean;
  unlockedAt?: string;
  progressPercent: number; // 0 to 100
  criteriaLabel: string;
  season?: PersianSeason;
  isSeasonActive?: boolean;
  seasonName?: string;
  seasonIcon?: string;
  seasonMonths?: string;
}

export interface BrainLevel {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badgeColor: string;
  description?: string;
  perk?: string;
  requiredAchievementIds?: string[]; // Mandatory achievement IDs required in addition to XP to unlock this level
}

export interface AchievementsOverview {
  totalUnlocked: number;
  totalAchievements: number;
  totalXp: number;
  habitsXp: number;
  tasksXp?: number;
  achievementsXp: number;
  currentLevel: BrainLevel;
  nextLevel: BrainLevel | null;
  levelProgressPercent: number;
  achievements: Achievement[];
  categories: {
    id: AchievementCategory;
    name: string;
    unlockedCount: number;
    totalCount: number;
  }[];
}

export const BRAIN_LEVELS: Record<Language, BrainLevel[]> = {
  fa: [
    {
      level: 1,
      title: 'نوآموز رفتاری (سطح ۱)',
      minXp: 0,
      maxXp: 250,
      badgeColor: 'from-amber-600 to-amber-800',
      description: 'آغاز سفر نوروپلاستی و برداشتن اولین گام‌های تثبیت الگوهای رفتاری مثبت',
      perk: 'ایجاد پیوند اولیه سیناپسی',
    },
    {
      level: 2,
      title: 'کاوشگر سیناپس (سطح ۲)',
      minXp: 250,
      maxXp: 650,
      badgeColor: 'from-blue-600 to-cyan-700',
      description: 'فعال‌سازی پیوندهای سیناپسی و عبور موفق از اصطکاک و مقاومت اولیه ذهن',
      perk: 'کاهش مقاومت اولیه برای شروع روتین',
    },
    {
      level: 3,
      title: 'معمار مدار عصبی (سطح ۳)',
      minXp: 650,
      maxXp: 1300,
      badgeColor: 'from-indigo-600 to-purple-700',
      description: 'تقویت مسیرهای دوپامینی و ساختاردهی منسجم به روتین‌های روزانه',
      perk: 'پایداری مدار پاداش و افزایش انگیزه درونی',
    },
    {
      level: 4,
      title: 'استاد نوروپلاستی (سطح ۴)',
      minXp: 1300,
      maxXp: 2300,
      badgeColor: 'from-purple-600 to-pink-700',
      description: 'بازآرایی فعال ساختار قشر مغز و افزایش شتاب‌گیرنده انعطاف‌پذیری عصبی',
      perk: 'انعطاف‌پذیری شناختی و بازگشت سریع پس از وقفه',
    },
    {
      level: 5,
      title: 'پیشگام خودکارشدگی (سطح ۵)',
      minXp: 2300,
      maxXp: 3800,
      badgeColor: 'from-emerald-600 to-teal-700',
      description: 'ورود به شیب تند لالی و تبدیل تصمیم‌گیری آگاهانه به عمل بدون زحمت',
      perk: 'کاهش ۵۰٪ انرژی شناختی مورد نیاز برای انجام عادت',
    },
    {
      level: 6,
      title: 'گرندمستر ۶۶ روزه (سطح ۶)',
      minXp: 3800,
      maxXp: 5800,
      badgeColor: 'from-amber-500 via-rose-500 to-purple-600',
      description: 'فتح قله استاندارد طلایی لالی (۲۰۱۰) و ثبت عادات در حافظه رویه‌ای ناخودآگاه',
      perk: 'تثبیت خودکارشدگی پایدار ۸۵٪+',
    },
    {
      level: 7,
      title: 'حکیم عادات و نوروساینس (سطح ۷)',
      minXp: 5800,
      maxXp: 8500,
      badgeColor: 'from-cyan-400 via-violet-500 to-fuchsia-600',
      description: 'تسلط همه‌جانبه بر عقده‌های قاعده‌ای و هم‌افزایی همزمان چندین روتین رفتاری',
      perk: 'هم‌افزایی چندگانه عادات بدون تداخل شناختی',
    },
    {
      level: 8,
      title: 'فرمانده اتوماسیون قشر پیش‌پیشانی (سطح ۸)',
      minXp: 8500,
      maxXp: 12000,
      badgeColor: 'from-teal-400 via-emerald-500 to-cyan-600',
      description: 'آزادسازی ظرفیت پردازش لوب پیشانی با انتقال کامل الگوها به مراکز خودکار زیرقشری',
      perk: 'تمرکز بالا و حذف خستگی تصمیم‌گیری روزانه',
    },
    {
      level: 9,
      title: 'معمار شبکه پیش‌فرض مغزی (سطح ۹)',
      minXp: 12000,
      maxXp: 16500,
      badgeColor: 'from-rose-500 via-pink-600 to-indigo-700',
      description: 'هم‌راستاسازی هویت ناخودآگاه با عادات در شبکه پیش‌فرض مغزی (DMN)؛ عادات به بخشی از کیستی شما تبدیل شده‌اند',
      perk: 'درهم‌تنیدگی عمیق هویت شخصی با رفتار پایدار',
    },
    {
      level: 10,
      title: 'تیتان میلین‌سازی عصب‌ها (سطح ۱۰)',
      minXp: 16500,
      maxXp: 22000,
      badgeColor: 'from-amber-400 via-orange-500 to-red-600',
      description: 'پوشش فوق‌متراکم غلاف میلین دور رشته‌های عصبی که سرعت هدایت پیام را تا ۱۰۰ برابر افزایش می‌دهد',
      perk: 'سرعت واکنش آنی و اجرای خودکار بدون تردید',
    },
    {
      level: 11,
      title: 'نابغه فرارفتار و انضباط جاودان (سطح ۱۱)',
      minXp: 22000,
      maxXp: 30000,
      badgeColor: 'from-indigo-500 via-purple-600 to-fuchsia-700',
      description: 'تسلط بر نظارت فراشناختی و انضباط ناگسستنی در برابر بحران‌ها، تنش‌ها و تغییر فصول سال',
      perk: 'انضباط رفتاری فولادین و مقاوم در برابر هرگونه چالش محیطی',
    },
    {
      level: 12,
      title: 'ترنسندنس و کمال علمی لالی (سطح ۱۲)',
      minXp: 30000,
      maxXp: 35000,
      badgeColor: 'from-yellow-300 via-amber-400 to-yellow-600',
      description: 'غایت تکامل نوروبیولوژیک و دستیابی به کمال ریاضی مدل ۶۶ روزه دکتر فیلیپا لالی',
      perk: 'دستیابی به بالاترین رتبه تکامل عصبی پایه در ردیاب علمی',
    },
    {
      level: 13,
      title: 'فرمانروای تکینگی سیناپسی (سطح ۱۳ 🔱)',
      minXp: 35000,
      maxXp: 50000,
      badgeColor: 'from-purple-600 via-pink-600 to-rose-700',
      description: 'ورود به تالار رتبه‌های افسانه‌ای و مشروط؛ پایداری بی‌نظیر مدارهای عصبی در برابر هرگونه لغزش، نیازمند اثبات تسلط ۶۶ روزه و اکوسیستم چندعادت بی‌نقص.',
      perk: 'حفاظت قوی از حافظه رویه‌ای و اجرای ناخودآگاه روتین‌ها بدون اصطکاک ارادی',
      requiredAchievementIds: ['lally_pinnacle_66', 'streak_66', 'flawless_ecosystem'],
    },
    {
      level: 14,
      title: 'تایتان جاودانگی نورونی و غلبه بر انتروپی (سطح ۱۴ 🛡️)',
      minXp: 50000,
      maxXp: 75000,
      badgeColor: 'from-cyan-400 via-blue-600 to-indigo-950',
      description: 'غلبه مطلق بر انتروپی و فرسایش رفتاری؛ عادات به ستون‌های تغییرناپذیر هویت شما در تمام فصول سال تبدیل شده‌اند. بازگشایی نیازمند ۱۰۰ روز زنجیره، ۵۰۰ ثبت، سابقه در تمام ۴ فصل و استادی ۳ عادت همزمان است.',
      perk: 'مصونیت ۹۹٪ در برابر لغزش، شوک‌های محیطی و تغییرات فصلی',
      requiredAchievementIds: ['streak_100', 'checkins_500', 'season_four_seasons_legend', 'tri_lally_apex_66'],
    },
    {
      level: 15,
      title: 'خدایگان نوروپلاستی و آگاهی جاودان (سطح ۱۵ 👑✨)',
      minXp: 75000,
      maxXp: 120000,
      badgeColor: 'from-amber-300 via-rose-500 to-violet-700',
      description: 'والاترین قله دست‌نیافتنی در تاریخ علوم اعصاب و روانشناسی رفتار؛ کمال نامحدود نورونی، آگاهی ابدی و وحدت کامل اراده با ناخودآگاه. این سطح نیازمند دشوارترین دستاوردهای تاریخ (زنجیره ۲۰۰ روزه افسانه‌ای، ۱۰۰۰ ثبت و تسلط جامع چهارفصل) است.',
      perk: 'رسیدن به اوج کمال خودکارشدگی بیولوژیک و جاودانگی ساختار عصبی در جهان',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'season_four_seasons_legend', 'tri_lally_apex_66', 'all_seasons_masters_quad'],
    },
    {
      level: 16,
      title: 'کیهان‌بان اراده کوانتومی و تسلط چندبُعدی (سطح ۱۶ 🌌⚡)',
      minXp: 120000,
      maxXp: 185000,
      badgeColor: 'from-blue-600 via-cyan-400 to-emerald-400',
      description: 'ورود به قلمرو کوانتومی رفتار و تمرکز؛ یکپارچه‌سازی فرابُعدی عادات روزانه، وظایف استراتژیک و پاداش‌های ذهنی. نیازمند ۲۰۰ روز زنجیره ناگسستنی، ۱۰۰۰ ثبت عادات، ۵۰ تسک تکمیل شده، استادی کالکشن فیلم فروشگاه و تسلط جامع چهارفصل است.',
      perk: 'همگامی کوانتومی حافظه کاری با ناخودآگاه و حذف ۱۰۰٪ تاخیر در اجرای امور',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_productivity_50', 'shop_cinephile_master_3', 'all_seasons_masters_quad'],
    },
    {
      level: 17,
      title: 'اَبَرفرمانروای تالار ابدیت و انضباط کیهانی (سطح ۱۷ 🪐🛡️✨)',
      minXp: 185000,
      maxXp: 280000,
      badgeColor: 'from-purple-600 via-rose-500 to-amber-400',
      description: 'فرمانروایی بر تالار ابدیت و ساختار فناپذیرناپذیر ذهن؛ عادات و تسک‌های شما به قوانین فیزیکی پایدار زندگی‌تان بدل شده‌اند. نیازمند ۱۰۰ تسک تکمیل شده، کلکسیونر برتر فروشگاه، تثبیت ۳ گانه لالی و غلبه بر انتروپی فصلی است.',
      perk: 'جاودانگی مطلق شبکه عصبی، مصونیت بی‌پایان در برابر فرسایش زمانی و بازسازی خودکار تمامی چرخه‌ها',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_centurion_100', 'shop_collector_supreme', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
    {
      level: 18,
      title: 'ذات یگانه نوروپلاستی نامتناهی و خدایگان ذهن (سطح ۱۸ 👑🌌🔮)',
      minXp: 280000,
      maxXp: 500000,
      badgeColor: 'from-yellow-300 via-fuchsia-500 to-indigo-950',
      description: 'والاترین قله دست‌نیافتنی در کل کیهان و تاریخ علم عصب‌شناسی؛ اتحاد نامحدود و ابدی آگاهی، اراده فولادین، تسک‌های ۲۵۰گانه، تسلط جامع بر اقتصاد دوپامین و ثبات ۴ فصلی. بازگشایی نیازمند دشوارترین ترکیبات تاریخ اپلیکیشن است.',
      perk: 'کمال مطلق و بی‌نهایت عملکرد شناختی؛ پیوند ناگسستنی اراده و سرنوشت تا ابدیت',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_titan_250', 'shop_collector_supreme', 'shop_fortune_collector_1000', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
  ],
  ar: [
    {
      level: 1,
      title: 'مبتدئ السلوك (المستوى ۱)',
      minXp: 0,
      maxXp: 250,
      badgeColor: 'from-amber-600 to-amber-800',
      description: 'بداية رحلة المرونة العصبية وتثبيت أولى الأنماط السلوكية الإيجابية',
      perk: 'إنشاء الاتصال المشبكي الأولي',
    },
    {
      level: 2,
      title: 'مستكشف المشابك العصبية (المستوى ۲)',
      minXp: 250,
      maxXp: 650,
      badgeColor: 'from-blue-600 to-cyan-700',
      description: 'تفعيل الروابط المشبكية وتجاوز الاحتكاك والمقاومة النفسية الأولية',
      perk: 'تقليل مقاومة البدء اليومية للروتين',
    },
    {
      level: 3,
      title: 'مهندس المسارات العصبية (المستوى ۳)',
      minXp: 650,
      maxXp: 1300,
      badgeColor: 'from-indigo-600 to-purple-700',
      description: 'تعزيز مسارات الدوبامين وتثبيت روتين يومي منظم ومتماسك',
      perk: 'استقرار مسار المكافأة وتعزيز الدافع الذاتي',
    },
    {
      level: 4,
      title: 'خبير المرونة العصبية (المستوى ۴)',
      minXp: 1300,
      maxXp: 2300,
      badgeColor: 'from-purple-600 to-pink-700',
      description: 'إعادة هيكلة قشرة الدماغ وزيادة المرونة العصبية التكيفية',
      perk: 'المرونة الإدراكية والتعافي السريع بعد الانقطاع',
    },
    {
      level: 5,
      title: 'رائد التلقائية السلوكية (المستوى ۵)',
      minXp: 2300,
      maxXp: 3800,
      badgeColor: 'from-emerald-600 to-teal-700',
      description: 'دخول منحنى لالي الصاعد وتحويل القرارات الواعية إلى أفعال تلقائية دون جهد',
      perk: 'توفير 50% من الطاقة الإدراكية المبذولة للعادة',
    },
    {
      level: 6,
      title: 'أستاذ الـ 66 يوماً (المستوى ۶)',
      minXp: 3800,
      maxXp: 5800,
      badgeColor: 'from-amber-500 via-rose-500 to-purple-600',
      description: 'بلوغ قمة معيار لالي (2010) الذهبي وترسيخ العادات في الذاكرة الإجرائية اللاواعية',
      perk: 'تثبيت التلقائية بنسبة تتجاوز 85%',
    },
    {
      level: 7,
      title: 'حكيم العادات والعلوم العصبية (المستوى ۷)',
      minXp: 5800,
      maxXp: 8500,
      badgeColor: 'from-cyan-400 via-violet-500 to-fuchsia-600',
      description: 'السيطرة الشاملة على العقد القاعدية وتناغم الأنظمة السلوكية المتعددة',
      perk: 'تناغم العادات المتعددة بدون تعارض إدراكي',
    },
    {
      level: 8,
      title: 'قائد الأتمتة الجبهية (المستوى ۸)',
      minXp: 8500,
      maxXp: 12000,
      badgeColor: 'from-teal-400 via-emerald-500 to-cyan-600',
      description: 'تحرير طاقة القشرة الجبهية بنقل الأنماط بالكامل إلى البنى التلقائية تحت القشرية',
      perk: 'تركيز فائق والتخلص التام من إجهاد اتخاذ القرار',
    },
    {
      level: 9,
      title: 'مهندس شبكة الوضع الافتراضي (المستوى ۹)',
      minXp: 12000,
      maxXp: 16500,
      badgeColor: 'from-rose-500 via-pink-600 to-indigo-700',
      description: 'مواءمة الهوية اللاواعية مع العادات في شبكة الوضع الافتراضي (DMN)؛ أصبحت العادات جزءاً من هويتك',
      perk: 'اندماج عميق بين الهوية الذاتية والسلوك الدائم',
    },
    {
      level: 10,
      title: 'بطل تغليف الميالين العصبي (المستوى ۱۰)',
      minXp: 16500,
      maxXp: 22000,
      badgeColor: 'from-amber-400 via-orange-500 to-red-600',
      description: 'تغليف فائق الكثافة لغمد الميالين حول المحاور العصبية لسرعة نقل إشارات مضاعفة 100 مرة',
      perk: 'تنفيذ فوري وتلقائي للسلوك دون أي تردد',
    },
    {
      level: 11,
      title: 'عبقري السلوك المعرفي الفائق (المستوى ۱۱)',
      minXp: 22000,
      maxXp: 30000,
      badgeColor: 'from-indigo-500 via-purple-600 to-fuchsia-700',
      description: 'السيطرة على المراقبة وراء المعرفية وانضباط منيع في أصعب الظروف والتقلبات الموسمية',
      perk: 'انضباط سلوكي فولاذي مقاوم لكافة التحديات',
    },
    {
      level: 12,
      title: 'أسطورة ترانسندنس لالي الخالدة (المستوى ۱۲)',
      minXp: 30000,
      maxXp: 35000,
      badgeColor: 'from-yellow-300 via-amber-400 to-yellow-600',
      description: 'الذروة المطلقة للنمو البيولوجي العصبي وخلود النظام السلوكي وفق نموذج لالي الخالد',
      perk: 'بلوغ أرفع مراتب التطور العصبي الأساسي في متتبع العادات العلمي',
    },
    {
      level: 13,
      title: 'سيد التفرد المشبكي والوعي (المستوى ۱۳ 🔱)',
      minXp: 35000,
      maxXp: 50000,
      badgeColor: 'from-purple-600 via-pink-600 to-rose-700',
      description: 'أولى الرتب الأسطورية المشروطة؛ استقرار غير مسبوق في المسارات العصبية يتطلب إثبات إتقان الـ 66 يوماً ومنظومة متوازنة.',
      perk: 'حماية فائقة للذاكرة الإجرائية وتنفيذ لاواعي للروتين دون أي احتكاك إرادي',
      requiredAchievementIds: ['lally_pinnacle_66', 'streak_66', 'flawless_ecosystem'],
    },
    {
      level: 14,
      title: 'تيتان الخلود العصبي وقاهر الانتروبيا (المستوى ۱۴ 🛡️)',
      minXp: 50000,
      maxXp: 75000,
      badgeColor: 'from-cyan-400 via-blue-600 to-indigo-950',
      description: 'تغلب تام على الانتروبيا والتشتت؛ أصبحت العادات أركاناً ثابتة في هويتك عبر جميع فصول السنة، وتتطلب ۱۰۰ يوم متواصل و ۵۰۰ إنجازاً.',
      perk: 'حصانة بنسبة 99% ضد الانتكاس والاضطرابات الموسمية',
      requiredAchievementIds: ['streak_100', 'checkins_500', 'season_four_seasons_legend', 'tri_lally_apex_66'],
    },
    {
      level: 15,
      title: 'أسطورة المرونة العصبية والخلود المعرفي (المستوى ۱۵ 👑✨)',
      minXp: 75000,
      maxXp: 120000,
      badgeColor: 'from-amber-300 via-rose-500 to-violet-700',
      description: 'أرفع قمة في علم الأعصاب والسلوك؛ كمال عصبي لا متناهٍ ووحدة تامة بين العزيمة واللاوعي، تتطلب سلسلة ۲۰۰ يوم و ۱۰۰۰ إنجازاً شاملاً.',
      perk: 'بلوغ الذروة المطلقة للتلقائية البيولوجية والخلود العصبي',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'season_four_seasons_legend', 'tri_lally_apex_66', 'all_seasons_masters_quad'],
    },
    {
      level: 16,
      title: 'حارس الإرادة الكمية والسيادة متعددة الأبعاد (المستوى ۱۶ 🌌⚡)',
      minXp: 120000,
      maxXp: 185000,
      badgeColor: 'from-blue-600 via-cyan-400 to-emerald-400',
      description: 'دخول النطاق الكمي للسلوك والتركيز؛ تكامل متعدد الأبعاد بين العادات اليومية والمهام والمكافآت. يتطلب سلسلة ۲۰۰ يوم، ۱۰۰۰ تسجيل، ۵۰ مهمة منجزة، ومكتبة المتجر.',
      perk: 'تزامن كمي بين الذاكرة الإجرائية واللاوعي وإلغاء التأخير بنسبة ۱۰۰٪',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_productivity_50', 'shop_cinephile_master_3', 'all_seasons_masters_quad'],
    },
    {
      level: 17,
      title: 'الحاكم الأعلى لردهة الخلود والانضباط الكوني (المستوى ۱۷ 🪐🛡️✨)',
      minXp: 185000,
      maxXp: 280000,
      badgeColor: 'from-purple-600 via-rose-500 to-amber-400',
      description: 'السيادة على ردهة الخلود؛ أصبحت عاداتك ومهامك قوانين فيزيائية ثابتة في حياتك. تتطلب ۱۰۰ مهمة، كلارکشن المتجر، وتفوق الفصول الكامل.',
      perk: 'حصانة أبدية ضد التراجع الزمني وإعادة بناء تلقائية لكافة المسارات',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_centurion_100', 'shop_collector_supreme', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
    {
      level: 18,
      title: 'الذات الأزلية للمرونة العصبية اللامتناهية وسيد العقل (المستوى ۱۸ 👑🌌🔮)',
      minXp: 280000,
      maxXp: 500000,
      badgeColor: 'from-yellow-300 via-fuchsia-500 to-indigo-950',
      description: 'أسمى ذروة لا تضاهى في تاريخ علم الأعصاب والكون؛ اتحاد أبدي غير محدود بين الإرادة واللاوعي وإنجاز ۲۵۰ مهمة واقتصاد الدوبامين الشامل.',
      perk: 'الكمال المطلق للوظائف الإدراكية والتناغم الأبدي بين الإرادة والمصير',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_titan_250', 'shop_collector_supreme', 'shop_fortune_collector_1000', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
  ],
  en: [
    {
      level: 1,
      title: 'Behavior Initiate (Lv 1)',
      minXp: 0,
      maxXp: 250,
      badgeColor: 'from-amber-600 to-amber-800',
      description: 'The start of your neuroplasticity journey and foundational habit formation',
      perk: 'Initial synaptic link establishment',
    },
    {
      level: 2,
      title: 'Synapse Explorer (Lv 2)',
      minXp: 250,
      maxXp: 650,
      badgeColor: 'from-blue-600 to-cyan-700',
      description: 'Activating synaptic junctions and overcoming initial mental friction',
      perk: 'Reduced routine initiation friction',
    },
    {
      level: 3,
      title: 'Neural Architect (Lv 3)',
      minXp: 650,
      maxXp: 1300,
      badgeColor: 'from-indigo-600 to-purple-700',
      description: 'Reinforcing dopamine pathways and structured daily routines',
      perk: 'Reward pathway stability & internal drive',
    },
    {
      level: 4,
      title: 'Neuroplasticity Adept (Lv 4)',
      minXp: 1300,
      maxXp: 2300,
      badgeColor: 'from-purple-600 to-pink-700',
      description: 'Active cortical remodeling and accelerated neural adaptability',
      perk: 'Cognitive resilience & rapid post-break recovery',
    },
    {
      level: 5,
      title: 'Automaticity Pioneer (Lv 5)',
      minXp: 2300,
      maxXp: 3800,
      badgeColor: 'from-emerald-600 to-teal-700',
      description: 'Surging along the Lally curve toward effortless behavioral execution',
      perk: '50% reduction in conscious cognitive load',
    },
    {
      level: 6,
      title: '66-Day Grandmaster (Lv 6)',
      minXp: 3800,
      maxXp: 5800,
      badgeColor: 'from-amber-500 via-rose-500 to-purple-600',
      description: 'Reaching the Lally (2010) gold standard asymptotic plateau in procedural memory',
      perk: 'Sustained 85%+ automaticity plateau',
    },
    {
      level: 7,
      title: 'Master of Behavioral Neuroscience (Lv 7)',
      minXp: 5800,
      maxXp: 8500,
      badgeColor: 'from-cyan-400 via-violet-500 to-fuchsia-600',
      description: 'Holistic basal ganglia mastery and multi-habit behavioral synergy',
      perk: 'Multi-habit synergy without cognitive interference',
    },
    {
      level: 8,
      title: 'Prefrontal Automation Commander (Lv 8)',
      minXp: 8500,
      maxXp: 12000,
      badgeColor: 'from-teal-400 via-emerald-500 to-cyan-600',
      description: 'Freeing prefrontal cortex bandwidth by delegating routines to subcortical hubs',
      perk: 'High focus and zero daily decision fatigue',
    },
    {
      level: 9,
      title: 'Default Mode Network Architect (Lv 9)',
      minXp: 12000,
      maxXp: 16500,
      badgeColor: 'from-rose-500 via-pink-600 to-indigo-700',
      description: 'Aligning subconscious self-identity with habits in the Default Mode Network (DMN)',
      perk: 'Deep identity-level habit integration',
    },
    {
      level: 10,
      title: 'Neural Myelination Paragon (Lv 10)',
      minXp: 16500,
      maxXp: 22000,
      badgeColor: 'from-amber-400 via-orange-500 to-red-600',
      description: 'Ultra-dense axonal myelination accelerating neural signal conduction up to 100x',
      perk: 'Instant reflex execution with zero hesitation',
    },
    {
      level: 11,
      title: 'Metacognitive Discipline Titan (Lv 11)',
      minXp: 22000,
      maxXp: 30000,
      badgeColor: 'from-indigo-500 via-purple-600 to-fuchsia-700',
      description: 'Mastery of metacognitive monitoring and unbreakable resilience across all seasons',
      perk: 'Crisis-proof behavioral invulnerability',
    },
    {
      level: 12,
      title: 'Ascended Lally Transcendence (Lv 12)',
      minXp: 30000,
      maxXp: 35000,
      badgeColor: 'from-yellow-300 via-amber-400 to-yellow-600',
      description: 'The supreme pinnacle of neurobehavioral evolution and absolute mathematical perfection of the Lally model',
      perk: 'Highest attainable status in baseline behavioral tracker',
    },
    {
      level: 13,
      title: 'Cosmic Synaptic Singularity Overlord (Lv 13 🔱)',
      minXp: 35000,
      maxXp: 50000,
      badgeColor: 'from-purple-600 via-pink-600 to-rose-700',
      description: 'First tier of conditioned legendary ranks; flawless neural circuit stability requiring proof of 66-day mastery and habit ecosystem synergy.',
      perk: 'Procedural memory shielding & frictionless automatic execution',
      requiredAchievementIds: ['lally_pinnacle_66', 'streak_66', 'flawless_ecosystem'],
    },
    {
      level: 14,
      title: 'Immortal Neural Titan & Entropy Vanquisher (Lv 14 🛡️)',
      minXp: 50000,
      maxXp: 75000,
      badgeColor: 'from-cyan-400 via-blue-600 to-indigo-950',
      description: 'Absolute victory over behavioral entropy. Demanding unbroken 100-day streak, 500 total logs, 4-season presence, and triple habit mastery.',
      perk: '99% behavioral immunity to seasonal dips & environmental shocks',
      requiredAchievementIds: ['streak_100', 'checkins_500', 'season_four_seasons_legend', 'tri_lally_apex_66'],
    },
    {
      level: 15,
      title: 'Apex Deity of Neuroplasticity (Lv 15 👑✨)',
      minXp: 75000,
      maxXp: 120000,
      badgeColor: 'from-amber-300 via-rose-500 to-violet-700',
      description: 'The ultimate unconquerable summit in behavioral neuroscience. Demanding legendary 200-day unbroken streak, 1000 check-ins, and quad-season mastery.',
      perk: 'Supreme biological automaticity zenith & eternal habit immortality',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'season_four_seasons_legend', 'tri_lally_apex_66', 'all_seasons_masters_quad'],
    },
    {
      level: 16,
      title: 'Quantum Willpower Cosmomaster & Multiverse Sovereign (Lv 16 🌌⚡)',
      minXp: 120000,
      maxXp: 185000,
      badgeColor: 'from-blue-600 via-cyan-400 to-emerald-400',
      description: 'Entry into the quantum realm of behavioral mastery; multidimensional integration of habits, strategic tasks, and dopamine rewards. Demands 200-day streak, 1000 habit check-ins, 50 tasks completed, store movie unlocks, and quad-season mastery.',
      perk: 'Quantum synchrony between working memory and subcortical hubs with zero execution delay',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_productivity_50', 'shop_cinephile_master_3', 'all_seasons_masters_quad'],
    },
    {
      level: 17,
      title: 'Eternal Archon of Cosmic Discipline & Singularity (Lv 17 🪐🛡️✨)',
      minXp: 185000,
      maxXp: 280000,
      badgeColor: 'from-purple-600 via-rose-500 to-amber-400',
      description: 'Sovereignty over the Hall of Eternity; your habits and task execution have become immutable laws of physics. Requires 100 tasks completed, Supreme Shop Collector, triple Lally habit apex, and multi-year behavioral resilience.',
      perk: 'Absolute neural circuit immortality, infinite immunity to burnout and autonomous habit auto-healing',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_centurion_100', 'shop_collector_supreme', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
    {
      level: 18,
      title: 'Omniscient Zenith of Infinite Neuroplasticity (Lv 18 👑🌌🔮)',
      minXp: 280000,
      maxXp: 500000,
      badgeColor: 'from-yellow-300 via-fuchsia-500 to-indigo-950',
      description: 'The ultimate, unconquerable zenith in cosmic neuroscience history; absolute eternal oneness of conscious willpower, procedural memory, 250 task milestones, and complete mastery of the dopamine economy.',
      perk: 'Absolute perfection of cognitive architecture; unbreakable eternal union of willpower and destiny',
      requiredAchievementIds: ['streak_200_mythic', 'checkins_1000_titan', 'task_titan_250', 'shop_collector_supreme', 'shop_fortune_collector_1000', 'all_seasons_masters_quad', 'tri_lally_apex_66'],
    },
  ],
};

export function getAllBrainLevels(language: Language = 'fa'): BrainLevel[] {
  return BRAIN_LEVELS[language] || BRAIN_LEVELS.fa;
}

export function calculateAchievements(
  habits: Habit[],
  language: Language = 'fa',
  tasks?: Task[],
  wallet?: UserRewardWallet,
  customNovels?: WebNovel[],
  customMovies?: ShopMovie[]
): AchievementsOverview {
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  // Task metrics calculation
  const taskList = tasks || [];
  const completedTasksList = taskList.filter((t) => t.completed);
  const completedTasksCount = completedTasksList.length;
  const highPriorityCompletedCount = completedTasksList.filter((t) => t.priority === 'high').length;
  const recurringCompletedCycles = taskList.reduce((sum, t) => sum + (t.recurringStreak || 0), 0);
  const maxRecurringStreak = taskList.reduce((max, t) => Math.max(max, t.recurringStreak || 0), 0);
  const tasksWithSubtasksCompleted = completedTasksList.filter(
    (t) => (t.subtasks || []).length > 0 && (t.subtasks || []).every((st) => st.completed)
  ).length;

  const todayPendingTasksCount = taskList.filter((t) => !t.completed && (t.dueDate === todayStr || !t.dueDate)).length;
  const todayCompletedTasksCount = completedTasksList.filter((t) => {
    if (t.lastCompletedDate === todayStr) return true;
    if (t.completedAt) {
      try {
        const completedDateStr = new Date(t.completedAt).toISOString().split('T')[0];
        return completedDateStr === todayStr;
      } catch {
        return false;
      }
    }
    return false;
  }).length;
  const hasZeroInboxToday = todayCompletedTasksCount > 0 && todayPendingTasksCount === 0;

  // Shop & Wallet metrics calculation
  const userWallet = wallet || {
    coins: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    history: [],
    unlockedNovelIds: [],
    unlockedChapterIds: [],
    readingProgress: {},
    unlockedMovieIds: [],
    unlockedEpisodeIds: [],
    movieWatchProgress: {},
  };

  const coinsEarnedTotal = userWallet.totalCoinsEarned || 0;
  const coinsSpentTotal = userWallet.totalCoinsSpent || 0;
  const unlockedNovelsCount = (userWallet.unlockedNovelIds || []).length;
  const unlockedChaptersCount = (userWallet.unlockedChapterIds || []).length;

  let totalReadChapters = 0;
  if (userWallet.readingProgress) {
    Object.values(userWallet.readingProgress).forEach((prog) => {
      if (prog && typeof prog === 'object') {
        const p = prog as { readChapterIds?: string[]; readChapterIndexes?: number[]; lastChapter?: number };
        if (p.readChapterIds && Array.isArray(p.readChapterIds)) {
          totalReadChapters += p.readChapterIds.length;
        } else if (p.readChapterIndexes && Array.isArray(p.readChapterIndexes)) {
          totalReadChapters += p.readChapterIndexes.length;
        } else if (typeof p.lastChapter === 'number') {
          totalReadChapters += Math.max(0, p.lastChapter);
        }
      }
    });
  }
  const effectiveReadChapters = Math.max(totalReadChapters, unlockedChaptersCount);

  const unlockedMoviesCount = (userWallet.unlockedMovieIds || []).length;
  const unlockedEpisodesCount = (userWallet.unlockedEpisodeIds || []).length;
  let completedMoviesWatched = 0;
  if (userWallet.movieWatchProgress) {
    Object.values(userWallet.movieWatchProgress).forEach((prog) => {
      if (prog && typeof prog === 'object' && (prog as { completed?: boolean }).completed) {
        completedMoviesWatched++;
      }
    });
  }
  const effectiveMoviesCount = Math.max(unlockedMoviesCount, completedMoviesWatched);

  // Compute base habit statistics
  const habitStatsList = habits.map((h) => calculateHabitStats(h, todayStr, language));
  
  // Aggregate metrics
  const totalCompletions = habits.reduce((acc, h) => {
    return acc + Object.values(h.history).filter(Boolean).length;
  }, 0);

  const maxIndividualStreak = habitStatsList.reduce((max, s) => Math.max(max, s.longestStreak, s.currentStreak), 0);
  const maxAutomaticity = habitStatsList.reduce((max, s) => Math.max(max, s.automaticity), 0);
  const maxCompletedDaysOnSingleHabit = habitStatsList.reduce((max, s) => Math.max(max, s.totalCompletedDays), 0);
  
  const totalHabitsCount = habits.length;
  const doneTodayCount = habits.filter((h) => !!h.history[todayStr]).length;
  const isPerfectToday = totalHabitsCount > 0 && doneTodayCount === totalHabitsCount;

  const avgAutomaticity = totalHabitsCount > 0 
    ? Math.round(habitStatsList.reduce((sum, s) => sum + s.automaticity, 0) / totalHabitsCount) 
    : 0;

  const habitsWithOver35Auto = habitStatsList.filter((s) => s.automaticity >= 35).length;
  const habitsWithOver50Auto = habitStatsList.filter((s) => s.automaticity >= 50).length;
  const habitsWithOver80Auto = habitStatsList.filter((s) => s.automaticity >= 80).length;
  const fullyFormedHabits = habitStatsList.filter((s) => s.automaticity >= 85 || s.totalCompletedDays >= 66).length;

  // Check history dates
  const allHistoryDates = new Set<string>();
  habits.forEach((h) => Object.keys(h.history).forEach((d) => allHistoryDates.add(d)));
  
  let historicPerfectDays = 0;
  let daysWithAtLeast3Done = 0;
  let weekendDaysDone = 0; // Friday (5) or Saturday (6) / Sunday
  let lateNightCheckinCount = 0;
  let earlyMorningCheckinCount = 0;

  // Check client time window if in browser
  const currentHour = typeof window !== 'undefined' ? new Date().getHours() : new Date().getUTCHours() + 3; // Approx Iran/Local time fallback
  const isCurrentlyMidnight = currentHour >= 0 && currentHour < 4; // 00:00 - 04:00 Night owl
  const isCurrentlyDawn = currentHour >= 5 && currentHour < 7; // 05:00 - 07:00 Early bird

  // Local storage flags for funny easter egg triggers (interactive)
  let easterEggTaps = 0;
  let colorRainbowSwapped = false;
  try {
    easterEggTaps = parseInt(safeStorage.getItem('habit_easter_egg_taps') || '0', 10);
    colorRainbowSwapped = safeStorage.getItem('habit_rainbow_colors_unlocked') === 'true';
  } catch {
    // ignore
  }

  // Count Friday / Weekend completions
  allHistoryDates.forEach((date) => {
    const doneOnDate = habits.filter((h) => !!h.history[date]).length;
    if (totalHabitsCount > 0 && doneOnDate === totalHabitsCount) {
      historicPerfectDays++;
    }
    if (doneOnDate >= 3) {
      daysWithAtLeast3Done++;
    }
    if (doneOnDate > 0) {
      try {
        const [y, m, d] = date.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        // 5 is Friday in JS (0 is Sun, 5 is Fri, 6 is Sat)
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
          weekendDaysDone++;
        }
      } catch {
        // ignore
      }
    }
  });

  // Nowruz (Farvardin 1 to 13) tracking
  let nowruzDaysDone = 0;
  let nowruzCompletions = 0;
  let sizdahBedarDone = 0;
  let nowruzPerfectDays = 0;

  const todayNowruzInfo = isDateInNowruz(todayStr);

  allHistoryDates.forEach((date) => {
    const doneOnDate = habits.filter((h) => !!h.history[date]).length;
    const nowruzInfo = isDateInNowruz(date);
    if (nowruzInfo.isNowruz && doneOnDate > 0) {
      nowruzDaysDone++;
      nowruzCompletions += doneOnDate;
      if (totalHabitsCount > 0 && doneOnDate === totalHabitsCount) {
        nowruzPerfectDays++;
      }
      if (nowruzInfo.shamsiDay === 13) {
        sizdahBedarDone += doneOnDate;
      }
    }
  });

  const todayDoneCount = habits.filter((h) => !!h.history[todayStr]).length;
  if (todayNowruzInfo.isNowruz && todayDoneCount > 0 && !allHistoryDates.has(todayStr)) {
    nowruzDaysDone++;
    nowruzCompletions += todayDoneCount;
    if (todayNowruzInfo.shamsiDay === 13) {
      sizdahBedarDone += todayDoneCount;
    }
    if (totalHabitsCount > 0 && todayDoneCount === totalHabitsCount) {
      nowruzPerfectDays++;
    }
  }

  // Seasonal Statistics (Four Seasons Tracking)
  const currentSeasonInfo = getPersianSeason();
  const currentSeason = currentSeasonInfo.season;

  let springCompletions = 0;
  let summerCompletions = 0;
  let autumnCompletions = 0;
  let winterCompletions = 0;

  const springDates = new Set<string>();
  const summerDates = new Set<string>();
  const autumnDates = new Set<string>();
  const winterDates = new Set<string>();

  allHistoryDates.forEach((date) => {
    const s = getDateSeason(date);
    const doneOnDate = habits.filter((h) => !!h.history[date]).length;
    if (doneOnDate > 0) {
      if (s === 'spring') {
        springCompletions += doneOnDate;
        springDates.add(date);
      } else if (s === 'summer') {
        summerCompletions += doneOnDate;
        summerDates.add(date);
      } else if (s === 'autumn') {
        autumnCompletions += doneOnDate;
        autumnDates.add(date);
      } else if (s === 'winter') {
        winterCompletions += doneOnDate;
        winterDates.add(date);
      }
    }
  });

  if (todayDoneCount > 0 && !allHistoryDates.has(todayStr)) {
    if (currentSeason === 'spring') {
      springCompletions += todayDoneCount;
      springDates.add(todayStr);
    } else if (currentSeason === 'summer') {
      summerCompletions += todayDoneCount;
      summerDates.add(todayStr);
    } else if (currentSeason === 'autumn') {
      autumnCompletions += todayDoneCount;
      autumnDates.add(todayStr);
    } else if (currentSeason === 'winter') {
      winterCompletions += todayDoneCount;
      winterDates.add(todayStr);
    }
  }

  const seasonsWithActivity = [
    springDates.size > 0 || springCompletions > 0,
    summerDates.size > 0 || summerCompletions > 0,
    autumnDates.size > 0 || autumnCompletions > 0,
    winterDates.size > 0 || winterCompletions > 0,
  ].filter(Boolean).length;

  // Calculate distinct colors used across habits
  const uniqueColorsCount = new Set(habits.map((h) => h.color).filter(Boolean)).size;

  // Check habits with long or quirky names
  const hasLongHabitName = habits.some((h) => h.name.trim().length >= 25);
  const hasMultipleCategories = new Set(habits.map((h) => h.category).filter(Boolean)).size >= 3;

  // Streak exactly 13 (unlucky streak)
  const hasStreak13 = habitStatsList.some((s) => s.currentStreak === 13 || s.longestStreak === 13);

  // Define All Achievements
  const achievements: Achievement[] = [
    // ==========================================
    // 1. NEUROSCIENCE ACHIEVEMENTS (Lally asymptotic model based)
    // ==========================================
    {
      id: 'neuro_genesis',
      title: isFa ? 'جوانه‌زنی نورونی' : isAr ? 'الشرارة العصبية الأولى' : 'Neuro Genesis',
      description: isFa 
        ? 'ثبت اولین روز انجام در حداقل یک عادت (آغاز تحریک مدارهای مغزی).'
        : isAr
        ? 'تسجيل أول يوم إنجاز في عادة واحدة على الأقل.'
        : 'Log your first completed day on any habit.',
      icon: 'Sprout',
      category: 'neuroscience',
      tier: 'bronze',
      xp: 50,
      targetValue: 1,
      currentValue: Math.min(1, totalCompletions),
      unlocked: totalCompletions >= 1,
      progressPercent: totalCompletions >= 1 ? 100 : 0,
      criteriaLabel: isFa ? '۱ روز انجام' : isAr ? 'يوم واحد' : '1 Day Done',
    },
    {
      id: 'synaptic_spark',
      title: isFa ? 'آغاز سیناپس‌سازی' : isAr ? 'تكوين المشابك' : 'Synaptic Spark',
      description: isFa 
        ? 'رسیدن خودکارشدگی یک عادت به حداقل ۲۰٪ بر اساس فرمول لالی.'
        : isAr
        ? 'وصول تلقائية إحدى العادات إلى ۲۰٪ على الأقل.'
        : 'Reach 20% automaticity on any habit.',
      icon: 'Zap',
      category: 'neuroscience',
      tier: 'bronze',
      xp: 100,
      targetValue: 20,
      currentValue: Math.min(20, maxAutomaticity),
      unlocked: maxAutomaticity >= 20,
      progressPercent: Math.min(100, Math.round((maxAutomaticity / 20) * 100)),
      criteriaLabel: isFa ? '۲۰٪ خودکارشدگی' : isAr ? '۲۰٪ تلقائية' : '20% Auto',
    },
    {
      id: 'dopamine_groove',
      title: isFa ? 'شیار دوپامینی' : isAr ? 'أخدود الدوبامين' : 'Dopamine Groove',
      description: isFa 
        ? 'رسیدن به ۳۵٪ خودکارشدگی در یک عادت (تثبیت پاسخ لذت و انگیزه در سیستم لیمبیک).'
        : isAr
        ? 'الوصول إلى ۳۵٪ من التلقائية في عادة واحدة.'
        : 'Reach 35% automaticity on a habit.',
      icon: 'Activity',
      category: 'neuroscience',
      tier: 'silver',
      xp: 150,
      targetValue: 35,
      currentValue: Math.min(35, maxAutomaticity),
      unlocked: maxAutomaticity >= 35,
      progressPercent: Math.min(100, Math.round((maxAutomaticity / 35) * 100)),
      criteriaLabel: isFa ? '۳۵٪ خودکارشدگی' : isAr ? '۳۵٪ تلقائية' : '35% Auto',
    },
    {
      id: 'plateau_crosser',
      title: isFa ? 'عبور از شیب سخت' : isAr ? 'تجاوز المنعطف الحرج' : 'Plateau Breaker',
      description: isFa 
        ? 'عبور از آستانه ۵۰٪ خودکارشدگی (نقطه عطف غلبه رفتار بر مقاومت ارادی قشر پیش‌پیشانی).'
        : isAr
        ? 'تجاوز عتبة ۵۰٪ من التلقائية العصبية.'
        : 'Cross the 50% automaticity threshold.',
      icon: 'Flame',
      category: 'neuroscience',
      tier: 'silver',
      xp: 200,
      targetValue: 50,
      currentValue: Math.min(50, maxAutomaticity),
      unlocked: maxAutomaticity >= 50,
      progressPercent: Math.min(100, Math.round((maxAutomaticity / 50) * 100)),
      criteriaLabel: isFa ? '۵۰٪ خودکارشدگی' : isAr ? '۵۰٪ تلقائية' : '50% Auto',
    },
    {
      id: 'synaptic_pruning',
      title: isFa ? 'استواری مدارهای عصبی' : isAr ? 'ثبات المسارات العصبية' : 'Neural Stability',
      description: isFa 
        ? 'رساندن حداقل ۲ عادت مختلف به بالای ۳۵٪ خودکارشدگی همزمان.'
        : isAr
        ? 'إيصال عادتين مختلفتين إلى ما فوق ۳۵٪ تلقائية في وقت واحد.'
        : 'Bring at least 2 habits above 35% automaticity simultaneously.',
      icon: 'Brain',
      category: 'neuroscience',
      tier: 'gold',
      xp: 280,
      targetValue: 2,
      currentValue: Math.min(2, habitsWithOver35Auto),
      unlocked: habitsWithOver35Auto >= 2,
      progressPercent: Math.min(100, Math.round((habitsWithOver35Auto / 2) * 100)),
      criteriaLabel: isFa ? '۲ عادت ۳۵٪+' : isAr ? 'عادتان ۳۵٪+' : '2 Habits 35%+',
    },
    {
      id: 'myelination_master',
      title: isFa ? 'تثبیت میلین عصبی' : isAr ? 'تغليف المايلين العصبي' : 'Myelination Master',
      description: isFa 
        ? 'رسیدن به ۷۰٪ خودکارشدگی در یک عادت (تثبیت لایه عایق چربی به دور رشته‌های عصبی برای انتقال پرسرعت).'
        : isAr
        ? 'الوصول إلى ۷۰٪ تلقائية سلوكية في عادة واحدة.'
        : 'Achieve 70% automaticity on a habit.',
      icon: 'ShieldCheck',
      category: 'neuroscience',
      tier: 'gold',
      xp: 350,
      targetValue: 70,
      currentValue: Math.min(70, maxAutomaticity),
      unlocked: maxAutomaticity >= 70,
      progressPercent: Math.min(100, Math.round((maxAutomaticity / 70) * 100)),
      criteriaLabel: isFa ? '۷۰٪ خودکارشدگی' : isAr ? '۷۰٪ تلقائية' : '70% Auto',
    },
    {
      id: 'neuroplastic_legend',
      title: isFa ? 'افسانه نوروپلاستی' : isAr ? 'أسطورة المرونة العصبية' : 'Neuroplastic Legend',
      description: isFa 
        ? 'رساندن حداقل ۲ عادت به بالای ۸۰٪ خودکارشدگی در گانگلیای پایه‌ای مغز.'
        : isAr
        ? 'إيصال عادتين إلى أكثر من ۸۰٪ من التلقائية العصبية.'
        : 'Reach 80%+ automaticity on at least 2 separate habits.',
      icon: 'Gem',
      category: 'neuroscience',
      tier: 'diamond',
      xp: 550,
      targetValue: 2,
      currentValue: Math.min(2, habitsWithOver80Auto),
      unlocked: habitsWithOver80Auto >= 2,
      progressPercent: Math.min(100, Math.round((habitsWithOver80Auto / 2) * 100)),
      criteriaLabel: isFa ? '۲ عادت ۸۰٪+' : isAr ? 'عادتان ۸۰٪+' : '2 Habits 80%+',
    },
    {
      id: 'lally_pinnacle_66',
      title: isFa ? 'قله ۶۶ روزه لالی' : isAr ? 'قمة الـ 66 يوماً (د. لالي)' : '66-Day Lally Pinnacle',
      description: isFa 
        ? 'تثبیت کامل و پایدار یک عادت (رسیدن به ۸۵٪ خودکارشدگی یا اتمام ۶۶ روز).'
        : isAr
        ? 'ترسيخ كامل ومستدام للعادة (۸۵٪ تلقائية أو إكمال ۶۶ يوماً).'
        : 'Fully solidify a habit (85%+ automaticity or 66 completed days).',
      icon: 'Trophy',
      category: 'neuroscience',
      tier: 'diamond',
      xp: 650,
      targetValue: 66,
      currentValue: Math.min(66, maxCompletedDaysOnSingleHabit),
      unlocked: fullyFormedHabits > 0 || maxAutomaticity >= 85 || maxCompletedDaysOnSingleHabit >= 66,
      progressPercent: Math.min(100, Math.round((Math.max(maxCompletedDaysOnSingleHabit, (maxAutomaticity / 85) * 66) / 66) * 100)),
      criteriaLabel: isFa ? '۸۵٪+ یا ۶۶ روز' : isAr ? '۸۵٪+ أو ۶۶ يوماً' : '85%+ or 66 Days',
    },
    {
      id: 'tri_lally_apex_66',
      title: isFa ? 'تثلیث طلایی ۶۶ روزه (۳ عادت در اوج) 🔱' : isAr ? 'الثلاثية الذهبية للـ 66 يوماً (3 عادات في القمة) 🔱' : 'Golden Trinity of 66 Days (3 Apex Habits) 🔱',
      description: isFa 
        ? 'رساندن همزمان حداقل ۳ عادت متمایز به قله ۶۶ روزه دکتر لالی یا خودکارشدگی بالای ۸۵٪!'
        : isAr
        ? 'إيصال ۳ عادات مختلفة معاً إلى قمة الـ 66 يوماً للدكتور لالي أو تلقائية تفوق 85٪!'
        : 'Solidify at least 3 distinct habits to the 66-day Lally plateau or 85%+ automaticity.',
      icon: 'Crown',
      category: 'neuroscience',
      tier: 'diamond',
      xp: 1200,
      targetValue: 3,
      currentValue: Math.min(3, fullyFormedHabits),
      unlocked: fullyFormedHabits >= 3,
      progressPercent: Math.min(100, Math.round((fullyFormedHabits / 3) * 100)),
      criteriaLabel: isFa ? '۳ عادت ۶۶ روزه' : isAr ? '۳ عادات ۶۶ يوماً' : '3 Habits (66 Days)',
    },

    // ==========================================
    // 2. STREAK & CONTINUITY ACHIEVEMENTS
    // ==========================================
    {
      id: 'streak_3',
      title: isFa ? 'جرقه ۳ روزه' : isAr ? 'شرارة ۳ أيام' : '3-Day Spark',
      description: isFa 
        ? 'حفظ ۳ روز زنجیره متوالی در هر یک از عادات فعال.'
        : isAr
        ? 'الحفاظ على سلسلة ۳ أيام متتالية في أي عادة.'
        : 'Maintain a 3-day unbroken streak on any habit.',
      icon: 'Zap',
      category: 'streak',
      tier: 'bronze',
      xp: 75,
      targetValue: 3,
      currentValue: Math.min(3, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 3,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 3) * 100)),
      criteriaLabel: isFa ? '۳ روز متوالی' : isAr ? '۳ أيام متتالية' : '3-Day Streak',
    },
    {
      id: 'streak_7',
      title: isFa ? 'هفته طلایی' : isAr ? 'الأسبوع الذهبي' : 'Golden Week',
      description: isFa 
        ? 'تداوم یک هفته کامل (۷ روز متوالی) بدون هیچ‌گونه وقفه.'
        : isAr
        ? 'إنجاز أسبوع كامل (۷ أيام متتالية) بدون انقطاع.'
        : 'Complete a full week (7-day streak) without missing a day.',
      icon: 'Award',
      category: 'streak',
      tier: 'silver',
      xp: 150,
      targetValue: 7,
      currentValue: Math.min(7, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 7,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 7) * 100)),
      criteriaLabel: isFa ? '۷ روز متوالی' : isAr ? '۷ أيام متتالية' : '7-Day Streak',
    },
    {
      id: 'streak_14',
      title: isFa ? 'دو هفته پایداری' : isAr ? 'أسبوعان من الاستقرار' : 'Fortnight Champion',
      description: isFa 
        ? 'حفظ ۱۴ روز متوالی زنجیره پیوسته در یک عادت.'
        : isAr
        ? 'الحفاظ على سلسلة متتالية لمدة ۱۴ يوماً دون انقطاع.'
        : 'Maintain a 14-day consecutive habit streak.',
      icon: 'Milestone',
      category: 'streak',
      tier: 'silver',
      xp: 220,
      targetValue: 14,
      currentValue: Math.min(14, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 14,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 14) * 100)),
      criteriaLabel: isFa ? '۱۴ روز متوالی' : isAr ? '۱۴ يوماً متتالياً' : '14-Day Streak',
    },
    {
      id: 'streak_21',
      title: isFa ? 'تعهد ۲۱ روزه' : isAr ? 'ميثاق ۲۱ يوماً' : '21-Day Milestone',
      description: isFa 
        ? 'حفظ ۲۱ روز زنجیره پیوسته (مرحله سنتی تثبیت الگوی اولیه رفتار).'
        : isAr
        ? 'الحفاظ على ۲۱ يوماً متتالياً من الالتزام المستمر.'
        : 'Achieve a 21-day consecutive habit streak.',
      icon: 'Medal',
      category: 'streak',
      tier: 'gold',
      xp: 300,
      targetValue: 21,
      currentValue: Math.min(21, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 21,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 21) * 100)),
      criteriaLabel: isFa ? '۲۱ روز متوالی' : isAr ? '۲۱ يوماً متتالياً' : '21-Day Streak',
    },
    {
      id: 'streak_30',
      title: isFa ? 'دوره زرین ۳۰ روزه' : isAr ? 'الشهر المثالي (۳۰ يوماً)' : 'Monthly Master',
      description: isFa 
        ? 'حفظ ۳۰ روز زنجیره متوالی و بدون وقفه در هر یک از عادات.'
        : isAr
        ? 'إتمام ۳۰ يوماً متتالياً من الالتزام الكامل بالعادة.'
        : 'Complete an uninterrupted 30-day streak.',
      icon: 'Sun',
      category: 'streak',
      tier: 'gold',
      xp: 450,
      targetValue: 30,
      currentValue: Math.min(30, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 30,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 30) * 100)),
      criteriaLabel: isFa ? '۳۰ روز متوالی' : isAr ? '۳۰ يوماً متتالياً' : '30-Day Streak',
    },
    {
      id: 'streak_66',
      title: isFa ? 'مشعل‌دار ۶۶ روزه' : isAr ? 'شعلة الـ 66 يوماً' : '66-Day Torchbearer',
      description: isFa 
        ? '۶۶ روز زنجیره پولادین و بدون وقفه بر اساس پژوهش دانشگاه UCL لندن.'
        : isAr
        ? 'سلسلة متواصلة لمدة ۶۶ يوماً بناءً على أبحاث UCL لندن.'
        : 'Complete a 66-day consecutive streak with unbroken consistency.',
      icon: 'Crown',
      category: 'streak',
      tier: 'diamond',
      xp: 750,
      targetValue: 66,
      currentValue: Math.min(66, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 66,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 66) * 100)),
      criteriaLabel: isFa ? '۶۶ روز زنجیره' : isAr ? 'سلسلة ۶۶ يوماً' : '66-Day Streak',
    },
    {
      id: 'streak_100',
      title: isFa ? 'زنجیره پولادین ۱۰۰ روزه' : isAr ? 'السلسلة الحديدية (۱۰۰ يوم)' : '100-Day Iron Will',
      description: isFa 
        ? '۱۰۰ روز زنجیره متوالی بدون حتی یک روز غفلت یا گسستگی.'
        : isAr
        ? '۱۰۰ يوم متواصل من الإرادة الفولاذية دون انقطاع.'
        : 'Reach an extraordinary 100-day consecutive streak.',
      icon: 'Shield',
      category: 'streak',
      tier: 'diamond',
      xp: 1000,
      targetValue: 100,
      currentValue: Math.min(100, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 100,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 100) * 100)),
      criteriaLabel: isFa ? '۱۰۰ روز متوالی' : isAr ? '۱۰۰ يوم متتالي' : '100-Day Streak',
    },
    {
      id: 'streak_200_mythic',
      title: isFa ? 'زنجیره افسانه‌ای ۲۰۰ روزه ⚡👑' : isAr ? 'السلسلة الأسطورية (۲۰۰ يوم) ⚡👑' : '200-Day Mythic Streak ⚡👑',
      description: isFa 
        ? '۲۰۰ روز زنجیره متوالی و پیوسته بدون حتی یک روز لغزش یا توقف!'
        : isAr
        ? 'الحفاظ على ۲۰۰ يوماً متتالياً من الالتزام دون أي انقطاع!'
        : 'Maintain a 200-day uninterrupted consecutive streak with flawless consistency.',
      icon: 'Flame',
      category: 'streak',
      tier: 'diamond',
      xp: 1500,
      targetValue: 200,
      currentValue: Math.min(200, maxIndividualStreak),
      unlocked: maxIndividualStreak >= 200,
      progressPercent: Math.min(100, Math.round((maxIndividualStreak / 200) * 100)),
      criteriaLabel: isFa ? '۲۰۰ روز متوالی' : isAr ? '۲۰۰ يوم متتالي' : '200-Day Streak',
    },

    // ==========================================
    // 3. MASTERY & MULTI-HABIT DISCIPLINE
    // ==========================================
    {
      id: 'perfect_day',
      title: isFa ? 'روز بی‌نقص' : isAr ? 'اليوم المثالي' : 'Perfect Day',
      description: isFa 
        ? 'تکمیل ۱۰۰٪ تمام عادات فعال ثبت‌شده در طول یک روز.'
        : isAr
        ? 'إنجاز ۱۰۰٪ من جميع العادات النشطة المسجلة في يوم واحد.'
        : 'Complete 100% of all active habits in a single day.',
      icon: 'CheckCheck',
      category: 'mastery',
      tier: 'bronze',
      xp: 100,
      targetValue: 1,
      currentValue: historicPerfectDays > 0 || isPerfectToday ? 1 : 0,
      unlocked: historicPerfectDays > 0 || isPerfectToday,
      progressPercent: (historicPerfectDays > 0 || isPerfectToday) ? 100 : Math.round((doneTodayCount / Math.max(1, totalHabitsCount)) * 100),
      criteriaLabel: isFa ? '۱۰۰٪ تکمیل روزانه' : isAr ? 'إنجاز ۱۰۰٪' : '100% Day',
    },
    {
      id: 'multi_habit_architect',
      title: isFa ? 'معمار چندگانه' : isAr ? 'مهندس العادات المتعددة' : 'Multi-Habit Architect',
      description: isFa 
        ? 'مدیریت و پیگیری همزمان حداقل ۳ عادت فعال در سیستم.'
        : isAr
        ? 'إدارة ومتابعة ۳ عادات نشطة على الأقل في نفس الوقت.'
        : 'Actively track and manage at least 3 active habits.',
      icon: 'Boxes',
      category: 'mastery',
      tier: 'silver',
      xp: 150,
      targetValue: 3,
      currentValue: Math.min(3, totalHabitsCount),
      unlocked: totalHabitsCount >= 3,
      progressPercent: Math.min(100, Math.round((totalHabitsCount / 3) * 100)),
      criteriaLabel: isFa ? '۳ عادت فعال' : isAr ? '۳ عادات نشطة' : '3 Active Habits',
    },
    {
      id: 'habit_trifecta',
      title: isFa ? 'سه‌گانه همگام' : isAr ? 'الثلاثية المتزامنة' : 'Habit Trifecta',
      description: isFa 
        ? 'تکمیل همزمان حداقل ۳ عادت در روز برای ۳ روز مجزا در تاریخچه.'
        : isAr
        ? 'إنجاز ۳ عادات معاً في يوم واحد لـ ۳ أيام مختلفة في السجل.'
        : 'Complete at least 3 habits in a single day for 3 distinct dates.',
      icon: 'Layers',
      category: 'mastery',
      tier: 'silver',
      xp: 220,
      targetValue: 3,
      currentValue: Math.min(3, daysWithAtLeast3Done),
      unlocked: daysWithAtLeast3Done >= 3,
      progressPercent: Math.min(100, Math.round((daysWithAtLeast3Done / 3) * 100)),
      criteriaLabel: isFa ? '۳ روز با ۳ عادت' : isAr ? '۳ أيام مع ۳ عادات' : '3 Days w/ 3 Habits',
    },
    {
      id: 'neuro_synergy_50',
      title: isFa ? 'هم‌افزایی عصبی' : isAr ? 'التآزر العصبي' : 'Neural Synergy',
      description: isFa 
        ? 'رساندن حداقل ۲ عادت مختلف به بالای ۵۰٪ خودکارشدگی همزمان.'
        : isAr
        ? 'إيصال عادتين مختلفتين إلى ما فوق ۵۰٪ من التلقائية في نفس الوقت.'
        : 'Reach 50%+ automaticity on at least 2 habits simultaneously.',
      icon: 'Sparkles',
      category: 'mastery',
      tier: 'gold',
      xp: 300,
      targetValue: 2,
      currentValue: Math.min(2, habitsWithOver50Auto),
      unlocked: habitsWithOver50Auto >= 2,
      progressPercent: Math.min(100, Math.round((habitsWithOver50Auto / 2) * 100)),
      criteriaLabel: isFa ? '۲ عادت بالای ۵۰٪' : isAr ? 'عادتان ۵۰٪+' : '2 Habits at 50%+',
    },
    {
      id: 'polymath_5_habits',
      title: isFa ? 'چندپتانسیلی جامع' : isAr ? 'متعدد الطاقات السلوكي' : 'Habit Polymath',
      description: isFa 
        ? 'پیگیری همزمان ۵ عادت فعال با وضعیت روزانه منظم.'
        : isAr
        ? 'متابعة ۵ عادات نشطة معاً بانتظام وثبات.'
        : 'Manage 5 active habits simultaneously with regular consistency.',
      icon: 'Boxes',
      category: 'mastery',
      tier: 'gold',
      xp: 400,
      targetValue: 5,
      currentValue: Math.min(5, totalHabitsCount),
      unlocked: totalHabitsCount >= 5,
      progressPercent: Math.min(100, Math.round((totalHabitsCount / 5) * 100)),
      criteriaLabel: isFa ? '۵ عادت فعال' : isAr ? '۵ عادات نشطة' : '5 Active Habits',
    },
    {
      id: 'system_mastery_avg60',
      title: isFa ? 'انضباط ذهن فراگیر' : isAr ? 'الانضباط العقلي الشامل' : 'Holistic Mind Mastery',
      description: isFa 
        ? 'رساندن میانگین خودکارشدگی کل عادات فعال به بالای ۶۰٪.'
        : isAr
        ? 'رفع متوسط التلقائية لجميع العادات النشطة إلى أكثر من ۶۰٪.'
        : 'Achieve an average automaticity rate of 60%+ across all active habits.',
      icon: 'Brain',
      category: 'mastery',
      tier: 'diamond',
      xp: 450,
      targetValue: 60,
      currentValue: Math.min(60, avgAutomaticity),
      unlocked: avgAutomaticity >= 60 && totalHabitsCount >= 2,
      progressPercent: Math.min(100, Math.round((avgAutomaticity / 60) * 100)),
      criteriaLabel: isFa ? 'میانگین ۶۰٪+' : isAr ? 'متوسط ۶۰٪+' : 'Avg 60%+',
    },
    {
      id: 'flawless_ecosystem',
      title: isFa ? 'اکوسیستم بدون نقص' : isAr ? 'المنظومة السلوكية المثالية' : 'Flawless Ecosystem',
      description: isFa 
        ? 'رساندن میانگین خودکارشدگی کل عادات به بالای ۷۵٪ با حداقل ۳ عادت فعال.'
        : isAr
        ? 'الوصول بمتوسط التلقائية إلى أكثر من ۷۵٪ مع وجود ۳ عادات نشطة على الأقل.'
        : 'Maintain a 75%+ overall automaticity average with at least 3 active habits.',
      icon: 'Crown',
      category: 'mastery',
      tier: 'diamond',
      xp: 800,
      targetValue: 75,
      currentValue: Math.min(75, avgAutomaticity),
      unlocked: avgAutomaticity >= 75 && totalHabitsCount >= 3,
      progressPercent: Math.min(100, Math.round((avgAutomaticity / 75) * 100)),
      criteriaLabel: isFa ? 'میانگین ۷۵٪+ با ۳ عادت' : isAr ? 'متوسط ۷۵٪+ مع ۳ عادات' : 'Avg 75%+ (3 Habits)',
    },

    // ==========================================
    // 4. CONSISTENCY & MILESTONE TOTALS
    // ==========================================
    {
      id: 'checkins_10',
      title: isFa ? 'آغازگر مصمم' : isAr ? 'البداية الواعدة' : 'Determined Starter',
      description: isFa 
        ? 'ثبت ۱۰ بار انجام در کل تاریخچه عادات شما.'
        : isAr
        ? 'تسجيل ۱۰ تكرارات ناجحة في سجل العادات.'
        : 'Log 10 total habit check-ins in your history.',
      icon: 'CheckCircle2',
      category: 'consistency',
      tier: 'bronze',
      xp: 60,
      targetValue: 10,
      currentValue: Math.min(10, totalCompletions),
      unlocked: totalCompletions >= 10,
      progressPercent: Math.min(100, Math.round((totalCompletions / 10) * 100)),
      criteriaLabel: isFa ? '۱۰ تیک کل' : isAr ? '۱۰ إنجازات' : '10 Check-ins',
    },
    {
      id: 'checkins_25',
      title: isFa ? 'گام‌های استوار' : isAr ? 'خطوات راسخة' : 'Solid Steps',
      description: isFa 
        ? 'ثبت ۲۵ بار انجام در کل تاریخچه عادات شما.'
        : isAr
        ? 'تسجيل ۲۵ تكراراً في السجل الإجمالي للعادات.'
        : 'Log 25 total habit completions in your history.',
      icon: 'CheckCircle2',
      category: 'consistency',
      tier: 'bronze',
      xp: 100,
      targetValue: 25,
      currentValue: Math.min(25, totalCompletions),
      unlocked: totalCompletions >= 25,
      progressPercent: Math.min(100, Math.round((totalCompletions / 25) * 100)),
      criteriaLabel: isFa ? '۲۵ تیک کل' : isAr ? '۲۵ إنجازاً' : '25 Check-ins',
    },
    {
      id: 'checkins_50',
      title: isFa ? 'باشگاه ۵۰ تایی' : isAr ? 'نادي الـ 50' : 'Club 50',
      description: isFa 
        ? 'ثبت ۵۰ بار انجام در کل تاریخچه عادات شما.'
        : isAr
        ? 'تسجيل ۵۰ تكراراً في السجل الإجمالي للعادات.'
        : 'Log 50 total habit completions across all habits.',
      icon: 'Layers',
      category: 'consistency',
      tier: 'silver',
      xp: 250,
      targetValue: 50,
      currentValue: Math.min(50, totalCompletions),
      unlocked: totalCompletions >= 50,
      progressPercent: Math.min(100, Math.round((totalCompletions / 50) * 100)),
      criteriaLabel: isFa ? '۵۰ تیک کل' : isAr ? '۵۰ إنجازاً' : '50 Check-ins',
    },
    {
      id: 'checkins_100',
      title: isFa ? 'قرن تلاش و پشتکار' : isAr ? 'مئوية الإصرار' : 'Centurion of Habit',
      description: isFa 
        ? 'ثبت ۱۰۰ بار انجام موفق در کل سوابق ثبت‌شده عادات.'
        : isAr
        ? 'تسجيل ۱۰۰ تكرار ناجح في السجل الإجمالي للعادات.'
        : 'Reach 100 total habit check-ins in your logs.',
      icon: 'Star',
      category: 'consistency',
      tier: 'gold',
      xp: 500,
      targetValue: 100,
      currentValue: Math.min(100, totalCompletions),
      unlocked: totalCompletions >= 100,
      progressPercent: Math.min(100, Math.round((totalCompletions / 100) * 100)),
      criteriaLabel: isFa ? '۱۰۰ تیک کل' : isAr ? '۱۰۰ إنجاز' : '100 Check-ins',
    },
    {
      id: 'checkins_200',
      title: isFa ? 'دویست‌تایی‌های استوار' : isAr ? 'نادي الـ 200' : 'Club 200',
      description: isFa 
        ? 'رسیدن به ۲۰۰ بار ثبت موفق عادت در سوابق کل.'
        : isAr
        ? 'الوصول إلى ۲۰۰ تكرار ناجح في مجمل السجلات.'
        : 'Reach 200 total habit check-ins.',
      icon: 'Trophy',
      category: 'consistency',
      tier: 'gold',
      xp: 750,
      targetValue: 200,
      currentValue: Math.min(200, totalCompletions),
      unlocked: totalCompletions >= 200,
      progressPercent: Math.min(100, Math.round((totalCompletions / 200) * 100)),
      criteriaLabel: isFa ? '۲۰۰ تیک کل' : isAr ? '۲۰۰ إنجاز' : '200 Check-ins',
    },
    {
      id: 'checkins_500',
      title: isFa ? 'اسطوره تکرار و عادت' : isAr ? 'أسطورة التكرار السلوكي' : 'Legend of Repetition',
      description: isFa 
        ? '۵۰۰ بار ثبت موفق عادت (رسیدن به حد کمال اتوماسیون رفتاری).'
        : isAr
        ? '۵۰۰ تكرار ناجح (الوصول إلى قمة الأتمتة السلوكية الدائمة).'
        : 'Complete 500 total habit completions across all history.',
      icon: 'Crown',
      category: 'consistency',
      tier: 'diamond',
      xp: 1200,
      targetValue: 500,
      currentValue: Math.min(500, totalCompletions),
      unlocked: totalCompletions >= 500,
      progressPercent: Math.min(100, Math.round((totalCompletions / 500) * 100)),
      criteriaLabel: isFa ? '۵۰۰ تیک کل' : isAr ? '۵۰۰ إنجاز' : '500 Check-ins',
    },
    {
      id: 'checkins_1000_titan',
      title: isFa ? 'هزارگانه تایتان عادات 🏛️' : isAr ? 'ألفية التيتان السلوكي 🏛️' : 'Titan Millenary (1000 Logs) 🏛️',
      description: isFa 
        ? 'ثبت ۱۰۰۰ بار انجام موفق در کل سوابق ثبت‌شده عادات (کمال مطلق اتوماسیون).'
        : isAr
        ? 'تسجيل ۱۰۰۰ إنجاز ناجح في السجل الإجمالي للعادات (الكمال السلوكي المطلق).'
        : 'Reach 1000 total habit check-ins in your history.',
      icon: 'Trophy',
      category: 'consistency',
      tier: 'diamond',
      xp: 2000,
      targetValue: 1000,
      currentValue: Math.min(1000, totalCompletions),
      unlocked: totalCompletions >= 1000,
      progressPercent: Math.min(100, Math.round((totalCompletions / 1000) * 100)),
      criteriaLabel: isFa ? '۱۰۰۰ تیک کل' : isAr ? '۱۰۰۰ إنجاز' : '1000 Check-ins',
    },

    // ==========================================
    // 5. SECRET VAULT & SEASONAL EVENTS (گنجینه اسرار و مناسبت‌ها)
    // ==========================================
    {
      id: 'nowruz_spring_blossom',
      title: isFa ? 'رویش بهاری نوروز 🌱' : isAr ? 'إشراقة الربيع والنوروز 🌱' : 'Nowruz Spring Blossom 🌱',
      description: isFa 
        ? 'ثبت حداقل یک عادت در ایام نوروز باستان (۱ تا ۱۳ فروردین) همگام با رستاخیز طبیعت و نوروپلاستی ذهن.'
        : isAr
        ? 'تسجيل عادة واحدة على الأقل خلال أيام النوروز والربيع (۱ إلى ۱۳ فروردين).'
        : 'Log at least one habit during the Nowruz holiday season (Farvardin 1 to 13).',
      icon: 'Sprout',
      category: 'fun_easter_eggs',
      tier: 'silver',
      xp: 250,
      targetValue: 1,
      currentValue: nowruzDaysDone >= 1 || (todayNowruzInfo.isNowruz && todayDoneCount > 0) ? 1 : 0,
      unlocked: nowruzDaysDone >= 1 || (todayNowruzInfo.isNowruz && todayDoneCount > 0),
      progressPercent: nowruzDaysDone >= 1 || (todayNowruzInfo.isNowruz && todayDoneCount > 0) ? 100 : 0,
      criteriaLabel: isFa ? 'ثبت در ایام نوروز (۱-۱۳ فروردین)' : isAr ? 'خلال النوروز (۱-۱۳ فروردين)' : 'Active in Nowruz (1-13 Farvardin)',
    },
    {
      id: 'nowruz_haft_sin',
      title: isFa ? 'هفت‌سین اراده و انضباط 🌸' : isAr ? 'سفينة سينات العزيمة 🌸' : 'Haft-Sin of Discipline 🌸',
      description: isFa 
        ? 'پایبندی و ثبت عادات در حداقل ۷ روز متمایز از ۱۳ روز تعطیلات نوروز در میان دید و بازدیدها!'
        : isAr
        ? 'الالتزام بالعادات في ۷ أيام مختلفة خلال عطلة النوروز الممتدة ۱۳ يوماً.'
        : 'Stay committed for at least 7 days during the 13 days of Nowruz holidays.',
      icon: 'Star',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 450,
      targetValue: 7,
      currentValue: Math.min(7, nowruzDaysDone),
      unlocked: nowruzDaysDone >= 7,
      progressPercent: Math.min(100, Math.round((nowruzDaysDone / 7) * 100)),
      criteriaLabel: isFa ? '۷ روز در تعطیلات نوروز' : isAr ? '۷ أيام في النوروز' : '7 Days in Nowruz',
    },
    {
      id: 'nowruz_sizdah_bedar',
      title: isFa ? 'سیزده‌بدر سبز و پایدار 🌿' : isAr ? 'يوم الطبيعة وسيزده به در 🌿' : 'Sizdah Bedar Green Habit 🌿',
      description: isFa 
        ? 'ثبت و حفظ زنجیره عادت در روز ۱۳ فروردین (روز طبیعت و سیزده‌بدر) بدون وقفه حتی در گردش و تفریح.'
        : isAr
        ? 'إنجاز العادة في يوم الطبيعة (۱۳ فروردين) دون انقطاع.'
        : 'Complete habit check-in on the 13th of Farvardin (Nature Day / Sizdah Bedar).',
      icon: 'Compass',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 350,
      targetValue: 1,
      currentValue: sizdahBedarDone >= 1 || (todayNowruzInfo.isNowruz && todayNowruzInfo.shamsiDay === 13 && todayDoneCount > 0) ? 1 : 0,
      unlocked: sizdahBedarDone >= 1 || (todayNowruzInfo.isNowruz && todayNowruzInfo.shamsiDay === 13 && todayDoneCount > 0),
      progressPercent: sizdahBedarDone >= 1 || (todayNowruzInfo.isNowruz && todayNowruzInfo.shamsiDay === 13 && todayDoneCount > 0) ? 100 : 0,
      criteriaLabel: isFa ? 'ثبت در روز ۱۳ فروردین' : isAr ? 'تسجيل في ۱۳ فروردين' : 'Check-in on 13th Farvardin',
    },
    {
      id: 'nowruz_spring_cleaning',
      title: isFa ? 'خانه‌تکانی سیناپسی ✨' : isAr ? 'التجدد والترتيب العصبي ✨' : 'Synaptic Spring Cleaning ✨',
      description: isFa 
        ? 'تکمیل ۱۰۰٪ تمام عادات فعال در یک روز از تعطیلات نوروز و زدودن غبار تنبلی از مدارهای عصبی.'
        : isAr
        ? 'إكمال جميع العادات بنسبة ۱۰۰٪ في يوم كامل من أيام النوروز.'
        : 'Achieve 100% completion on all active habits on a Nowruz holiday day.',
      icon: 'Sparkles',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 320,
      targetValue: 1,
      currentValue: nowruzPerfectDays >= 1 ? 1 : 0,
      unlocked: nowruzPerfectDays >= 1,
      progressPercent: nowruzPerfectDays >= 1 ? 100 : 0,
      criteriaLabel: isFa ? 'یک روز کامل در ایام نوروز' : isAr ? 'يوم مكتمل في النوروز' : 'Perfect Day in Nowruz',
    },
    {
      id: 'night_owl_syndrome',
      title: isFa ? 'جغد شب‌زنده‌دار 🦉' : isAr ? 'بومة الليل الساهرة 🦉' : 'Night Owl Syndrome 🦉',
      description: isFa 
        ? 'ورود به اپلیکیشن و حضور فعال بین نیمه‌شب تا ۴ بامداد (سیناپس‌های شبانه در اوج بیداری!).'
        : isAr
        ? 'فتح التطبيق والتواجد بين منتصف الليل والساعة ۴ فجراً.'
        : 'Open the app and stay active between midnight and 4:00 AM.',
      icon: 'Moon',
      category: 'fun_easter_eggs',
      tier: 'silver',
      xp: 180,
      targetValue: 1,
      currentValue: isCurrentlyMidnight ? 1 : 0,
      unlocked: isCurrentlyMidnight,
      progressPercent: isCurrentlyMidnight ? 100 : 0,
      criteriaLabel: isFa ? 'فعالیت بین ۰۰:۰۰ تا ۰۴:۰۰' : isAr ? 'بين ۰۰:۰۰ و ۰۴:۰۰' : 'Active 00:00 - 04:00',
    },
    {
      id: 'early_bird_miracle',
      title: isFa ? 'سحرخیز افسانه‌ای 🌅' : isAr ? 'طائر الصباح الباكر 🌅' : 'Early Bird Miracle 🌅',
      description: isFa 
        ? 'حضور در برنامه بین ساعت ۵ تا ۷ صبح زود (ترشح کورتیزول و اراده پولادین صبحگاهی).'
        : isAr
        ? 'التواجد في التطبيق بين ۵ و ۷ صباحاً.'
        : 'Check in between 5:00 AM and 7:00 AM.',
      icon: 'Sun',
      category: 'fun_easter_eggs',
      tier: 'silver',
      xp: 180,
      targetValue: 1,
      currentValue: isCurrentlyDawn ? 1 : 0,
      unlocked: isCurrentlyDawn,
      progressPercent: isCurrentlyDawn ? 100 : 0,
      criteriaLabel: isFa ? 'فعالیت بین ۰۵:۰۰ تا ۰۷:۰۰' : isAr ? 'بين ۰۵:۰۰ و ۰۷:۰۰' : 'Active 05:00 - 07:00',
    },
    {
      id: 'weekend_warrior',
      title: isFa ? 'جنگجوی آخر هفته 🏖️' : isAr ? 'محارب عطلة نهاية الأسبوع 🏖️' : 'Weekend Warrior 🏖️',
      description: isFa 
        ? 'پایبندی به عادات در حداقل ۳ روز جمعه یا تعطیلات آخر هفته بدون شل کردن!'
        : isAr
        ? 'الالتزام بالعادات في ۳ أيام عطلة أو جمعة على الأقل.'
        : 'Stay committed on at least 3 weekend / Friday dates in your logs.',
      icon: 'Coffee',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 260,
      targetValue: 3,
      currentValue: Math.min(3, weekendDaysDone),
      unlocked: weekendDaysDone >= 3,
      progressPercent: Math.min(100, Math.round((weekendDaysDone / 3) * 100)),
      criteriaLabel: isFa ? '۳ روز آخر هفته' : isAr ? '۳ أيام عطلة' : '3 Weekend Days',
    },
    {
      id: 'rainbow_palette',
      title: isFa ? 'رنگین‌کمان نورونی 🎨' : isAr ? 'قوس قزح العصبي 🎨' : 'Neural Rainbow 🎨',
      description: isFa 
        ? 'داشتن حداقل ۴ عادت با ۴ رنگ کاملاً متفاوت و متنوع.'
        : isAr
        ? 'امتلاك ۴ عادات على الأقل بألوان مختلفة ومتنوعة.'
        : 'Have at least 4 habits with 4 distinct customized colors.',
      icon: 'Palette',
      category: 'fun_easter_eggs',
      tier: 'silver',
      xp: 200,
      targetValue: 4,
      currentValue: Math.min(4, uniqueColorsCount),
      unlocked: uniqueColorsCount >= 4,
      progressPercent: Math.min(100, Math.round((uniqueColorsCount / 4) * 100)),
      criteriaLabel: isFa ? '۴ رنگ متنوع' : isAr ? '۴ ألوان متنوعة' : '4 Unique Colors',
    },
    {
      id: 'unlucky_thirteen',
      title: isFa ? 'طلسم‌شکن ۱۳ 🍀' : isAr ? 'كاسر نحس الرقم 13 🍀' : 'Lucky 13 Breaker 🍀',
      description: isFa 
        ? 'رسیدن دقیق به زنجیره ۱۳ روزه در یکی از عادات و عبور شجاعانه از عدد نحس!'
        : isAr
        ? 'الوصول إلى سلسلة ۱۳ يوماً متتالياً في إحدى العادات.'
        : 'Reach an exact streak of 13 days on any habit.',
      icon: 'Sparkles',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 313,
      targetValue: 1,
      currentValue: hasStreak13 ? 1 : 0,
      unlocked: hasStreak13,
      progressPercent: hasStreak13 ? 100 : 0,
      criteriaLabel: isFa ? 'زنجیره دقیقاً ۱۳ روز' : isAr ? 'سلسلة ۱۳ يوماً' : 'Streak of 13',
    },
    {
      id: 'essay_title',
      title: isFa ? 'رمان‌نویس عادات 📜' : isAr ? 'الروائي السلوكي 📜' : 'Habit Novelist 📜',
      description: isFa 
        ? 'انتخاب یک عنوان طولانی و پرماجرا (حداقل ۲۵ حرف) برای یکی از عادات شما!'
        : isAr
        ? 'تسمية إحدى العادات باسم طويل ومفصل يتجاوز ۲۵ حرفاً.'
        : 'Create a habit with a descriptive name of at least 25 characters.',
      icon: 'BookOpen',
      category: 'fun_easter_eggs',
      tier: 'bronze',
      xp: 130,
      targetValue: 1,
      currentValue: hasLongHabitName ? 1 : 0,
      unlocked: hasLongHabitName,
      progressPercent: hasLongHabitName ? 100 : 0,
      criteriaLabel: isFa ? 'نام عادت ۲۵+ حرف' : isAr ? 'اسم ۲۵+ حرفاً' : 'Name 25+ chars',
    },
    {
      id: 'brain_tapper',
      title: isFa ? 'تحریک مغزی شوخ‌طبعانه 🧠⚡' : isAr ? 'المداعب العصبي 🧠⚡' : 'Brain Tickler 🧠⚡',
      description: isFa 
        ? 'روی آیکون مغز در بالای صفحه تالار دستاوردها ۷ بار سریع ضربه بزنید تا مدارهای مخفی فعال شوند!'
        : isAr
        ? 'اضغط ۷ مرات سريعة على أيقونة الدماغ في الأعلى لتنشيط المشابك الخفية!'
        : 'Tap the Brain icon in achievements header 7 times to tickle neural circuits!',
      icon: 'Zap',
      category: 'fun_easter_eggs',
      tier: 'gold',
      xp: 350,
      targetValue: 7,
      currentValue: Math.min(7, easterEggTaps),
      unlocked: easterEggTaps >= 7,
      progressPercent: Math.min(100, Math.round((easterEggTaps / 7) * 100)),
      criteriaLabel: isFa ? '۷ کلیک روی آیکون مغز' : isAr ? '۷ نقرات على الدماغ' : '7 Taps on Brain',
    },
    {
      id: 'time_traveler',
      title: isFa ? 'مسافر زمان ⏳' : isAr ? 'المسافر عبر الزمن ⏳' : 'Time Traveler ⏳',
      description: isFa 
        ? 'داشتن سابقه ثبت عادت در حداقل ۷ روز در تاریخچه گذشته اپلیکیشن.'
        : isAr
        ? 'تسجيل عادات موزعة عبر ۷ أيام مختلفة في السجل.'
        : 'Have habit entries spanning across at least 7 calendar dates.',
      icon: 'Compass',
      category: 'fun_easter_eggs',
      tier: 'silver',
      xp: 220,
      targetValue: 7,
      currentValue: Math.min(7, allHistoryDates.size),
      unlocked: allHistoryDates.size >= 7,
      progressPercent: Math.min(100, Math.round((allHistoryDates.size / 7) * 100)),
      criteriaLabel: isFa ? '۷ روز تاریخچه فعال' : isAr ? '۷ أيام مسجلة' : '7 History Dates',
    },

    // ==========================================
    // 6. SEASONAL ACHIEVEMENTS (دستاوردها و چالش‌های چهار فصل سال)
    // قانون: هر دستاورد فقط و فقط در فصل خودش قابل دستیابی و بازگشایی است!
    // ==========================================

    // --- فصل بهار (Spring) ---
    {
      id: 'season_spring_awakening',
      title: isFa ? 'شکوفایی بهاره 🌸' : isAr ? 'إزهار الربيع 🌸' : 'Spring Awakening 🌸',
      description: isFa 
        ? 'ثبت حداقل ۵ بار عادت در فصل بهار (فروردین، اردیبهشت، خرداد). این دستاورد منحصراً در فصل بهار فعال و قابل تکمیل است.'
        : isAr
        ? 'تسجيل ۵ مرات على الأقل في فصل الربيع (فروردين، أرديبهشت، خرداد). هذا الإنجاز نشط ومتاح حصرياً خلال فصل الربيع.'
        : 'Complete at least 5 habit check-ins during Spring. Only unlockable during Spring.',
      icon: 'Sprout',
      category: 'seasonal',
      tier: 'bronze',
      xp: 180,
      season: 'spring',
      isSeasonActive: currentSeason === 'spring',
      seasonName: isFa ? 'بهار' : isAr ? 'الربيع' : 'Spring',
      seasonIcon: '🌸',
      seasonMonths: isFa ? 'فروردین تا خرداد' : isAr ? 'فروردين إلى خرداد' : 'Spring (Farvardin - Khordad)',
      targetValue: 5,
      currentValue: currentSeason === 'spring' ? Math.min(5, springCompletions) : 0,
      unlocked: currentSeason === 'spring' && springCompletions >= 5,
      progressPercent: currentSeason === 'spring' ? Math.min(100, Math.round((springCompletions / 5) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'spring' ? '۵ ثبت در بهار (فصل جاری ✅)' : '۵ ثبت در بهار (فقط در فصل بهار 🔒)')
        : (currentSeason === 'spring' ? '5 Check-ins in Spring (Active ✅)' : '5 Check-ins in Spring (Spring Only 🔒)'),
    },
    {
      id: 'season_spring_streak',
      title: isFa ? 'زنجیره اعتدال بهاری 🌱' : isAr ? 'سلسلة الاعتدال الربيعي 🌱' : 'Spring Equinox Streak 🌱',
      description: isFa 
        ? 'پایبندی و ثبت عادات در حداقل ۷ روز متمایز در فصل بهار. (قابل انجام منحصراً در بهار)'
        : isAr
        ? 'الالتزام بالعادات في ۷ أيام مختلفة في فصل الربيع (حصري في الربيع).'
        : 'Maintain activity on 7 distinct days in Spring season.',
      icon: 'Sun',
      category: 'seasonal',
      tier: 'silver',
      xp: 350,
      season: 'spring',
      isSeasonActive: currentSeason === 'spring',
      seasonName: isFa ? 'بهار' : isAr ? 'الربيع' : 'Spring',
      seasonIcon: '🌱',
      seasonMonths: isFa ? 'فروردین تا خرداد' : isAr ? 'فروردين إلى خرداد' : 'Spring (Farvardin - Khordad)',
      targetValue: 7,
      currentValue: currentSeason === 'spring' ? Math.min(7, springDates.size) : 0,
      unlocked: currentSeason === 'spring' && springDates.size >= 7,
      progressPercent: currentSeason === 'spring' ? Math.min(100, Math.round((springDates.size / 7) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'spring' ? '۷ روز در بهار (فصل جاری ✅)' : '۷ روز در بهار (فقط در فصل بهار 🔒)')
        : '7 Days in Spring',
    },
    {
      id: 'season_spring_mastery',
      title: isFa ? 'استاد رویش بهاره 🌿' : isAr ? 'سيد النمو الربيعي 🌿' : 'Spring Growth Master 🌿',
      description: isFa 
        ? 'ثبت ۲۰ بار انجام عادت در طول فصل بهار همگام با رستاخیز طبیعت. (قابل دستیابی فقط در بهار)'
        : isAr
        ? 'تسجيل ۲۰ إنجازاً خلال فصل الربيع (متاح فقط في الربيع).'
        : 'Log 20 habit completions during Spring season.',
      icon: 'Award',
      category: 'seasonal',
      tier: 'gold',
      xp: 600,
      season: 'spring',
      isSeasonActive: currentSeason === 'spring',
      seasonName: isFa ? 'بهار' : isAr ? 'الربيع' : 'Spring',
      seasonIcon: '🌿',
      seasonMonths: isFa ? 'فروردین تا خرداد' : isAr ? 'فروردين إلى خرداد' : 'Spring (Farvardin - Khordad)',
      targetValue: 20,
      currentValue: currentSeason === 'spring' ? Math.min(20, springCompletions) : 0,
      unlocked: currentSeason === 'spring' && springCompletions >= 20,
      progressPercent: currentSeason === 'spring' ? Math.min(100, Math.round((springCompletions / 20) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'spring' ? '۲۰ ثبت در بهار (فصل جاری ✅)' : '۲۰ ثبت در بهار (فقط در فصل بهار 🔒)')
        : '20 Check-ins in Spring',
    },

    // --- فصل تابستان (Summer) ---
    {
      id: 'season_summer_heat',
      title: isFa ? 'حرارت اراده تابستان ☀️' : isAr ? 'شعلة عزيمة الصيف ☀️' : 'Summer Heat Drive ☀️',
      description: isFa 
        ? 'ثبت حداقل ۵ بار عادت در فصل تابستان (تیر، مرداد، شهریور). این دستاورد منحصراً در فصل تابستان فعال و قابل انجام است.'
        : isAr
        ? 'تسجيل ۵ مرات في فصل الصيف (تير، مرداد، شهريور). متاح حصرياً في الصيف.'
        : 'Complete at least 5 habit check-ins during Summer season. Only unlockable during Summer.',
      icon: 'Flame',
      category: 'seasonal',
      tier: 'bronze',
      xp: 180,
      season: 'summer',
      isSeasonActive: currentSeason === 'summer',
      seasonName: isFa ? 'تابستان' : isAr ? 'الصيف' : 'Summer',
      seasonIcon: '☀️',
      seasonMonths: isFa ? 'تیر تا شهریور' : isAr ? 'تير إلى شهريور' : 'Summer (Tir - Shahrivar)',
      targetValue: 5,
      currentValue: currentSeason === 'summer' ? Math.min(5, summerCompletions) : 0,
      unlocked: currentSeason === 'summer' && summerCompletions >= 5,
      progressPercent: currentSeason === 'summer' ? Math.min(100, Math.round((summerCompletions / 5) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'summer' ? '۵ ثبت در تابستان (فصل جاری ✅)' : '۵ ثبت در تابستان (فقط در فصل تابستان 🔒)')
        : '5 Check-ins in Summer',
    },
    {
      id: 'season_summer_solstice_streak',
      title: isFa ? 'زنجیره انقلاب تابستانی 🌊' : isAr ? 'سلسلة الانقلاب الصيفي 🌊' : 'Summer Solstice Streak 🌊',
      description: isFa 
        ? 'ثبت عادات در حداقل ۷ روز متمایز از فصل تابستان بدون سستی و تنبلی در گرما. (فقط در تابستان)'
        : isAr
        ? 'تسجيل العادات في ۷ أيام مختلفة في فصل الصيف.'
        : 'Log habits across 7 distinct days in Summer season.',
      icon: 'Sun',
      category: 'seasonal',
      tier: 'silver',
      xp: 350,
      season: 'summer',
      isSeasonActive: currentSeason === 'summer',
      seasonName: isFa ? 'تابستان' : isAr ? 'الصيف' : 'Summer',
      seasonIcon: '🌊',
      seasonMonths: isFa ? 'تیر تا شهریور' : isAr ? 'تير إلى شهريور' : 'Summer (Tir - Shahrivar)',
      targetValue: 7,
      currentValue: currentSeason === 'summer' ? Math.min(7, summerDates.size) : 0,
      unlocked: currentSeason === 'summer' && summerDates.size >= 7,
      progressPercent: currentSeason === 'summer' ? Math.min(100, Math.round((summerDates.size / 7) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'summer' ? '۷ روز در تابستان (فصل جاری ✅)' : '۷ روز در تابستان (فقط در فصل تابستان 🔒)')
        : '7 Days in Summer',
    },
    {
      id: 'season_summer_mastery',
      title: isFa ? 'قهرمان روزهای داغ تابستان 🏄‍♂️' : isAr ? 'بطل أيام الصيف الدافئة 🏄‍♂️' : 'Summer Heat Champion 🏄‍♂️',
      description: isFa 
        ? 'ثبت ۲۰ بار انجام عادت در طول فصل تابستان در روزهای بلند و داغ سال. (فقط در تابستان)'
        : isAr
        ? 'تسجيل ۲۰ إنجازاً خلال فصل الصيف.'
        : 'Log 20 habit completions during Summer season.',
      icon: 'Trophy',
      category: 'seasonal',
      tier: 'gold',
      xp: 600,
      season: 'summer',
      isSeasonActive: currentSeason === 'summer',
      seasonName: isFa ? 'تابستان' : isAr ? 'الصيف' : 'Summer',
      seasonIcon: '🏄‍♂️',
      seasonMonths: isFa ? 'تیر تا شهریور' : isAr ? 'تير إلى شهريور' : 'Summer (Tir - Shahrivar)',
      targetValue: 20,
      currentValue: currentSeason === 'summer' ? Math.min(20, summerCompletions) : 0,
      unlocked: currentSeason === 'summer' && summerCompletions >= 20,
      progressPercent: currentSeason === 'summer' ? Math.min(100, Math.round((summerCompletions / 20) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'summer' ? '۲۰ ثبت در تابستان (فصل جاری ✅)' : '۲۰ ثبت در تابستان (فقط در فصل تابستان 🔒)')
        : '20 Check-ins in Summer',
    },

    // --- فصل پاییز (Autumn) ---
    {
      id: 'season_autumn_renewal',
      title: isFa ? 'رستاخیز پاییزی عادات 🍂' : isAr ? 'الانضباط الخريفي 🍂' : 'Autumn Renewal 🍂',
      description: isFa 
        ? 'ثبت حداقل ۵ بار عادت در فصل پاییز (مهر، آبان، آذر) همگام با شروع سال تحصیلی و کاری جدید. منحصراً در پاییز.'
        : isAr
        ? 'تسجيل ۵ مرات في فصل الخريف (مهر، آبان، آذر).'
        : 'Complete at least 5 habit check-ins during Autumn season. Only unlockable in Autumn.',
      icon: 'Sprout',
      category: 'seasonal',
      tier: 'bronze',
      xp: 180,
      season: 'autumn',
      isSeasonActive: currentSeason === 'autumn',
      seasonName: isFa ? 'پاییز' : isAr ? 'الخريف' : 'Autumn',
      seasonIcon: '🍂',
      seasonMonths: isFa ? 'مهر تا آذر' : isAr ? 'مهر إلى آذر' : 'Autumn (Mehr - Azar)',
      targetValue: 5,
      currentValue: currentSeason === 'autumn' ? Math.min(5, autumnCompletions) : 0,
      unlocked: currentSeason === 'autumn' && autumnCompletions >= 5,
      progressPercent: currentSeason === 'autumn' ? Math.min(100, Math.round((autumnCompletions / 5) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'autumn' ? '۵ ثبت در پاییز (فصل جاری ✅)' : '۵ ثبت در پاییز (فقط در فصل پاییز 🔒)')
        : '5 Check-ins in Autumn',
    },
    {
      id: 'season_autumn_golden_streak',
      title: isFa ? 'انضباط برگ‌ریزان طلایی 🍁' : isAr ? 'سلسلة الأوراق الذهبية 🍁' : 'Golden Autumn Streak 🍁',
      description: isFa 
        ? 'ثبت عادات در حداقل ۷ روز متمایز از فصل پاییز با نظم و تمرکز بالا. (فقط در پاییز)'
        : isAr
        ? 'تسجيل العادات في ۷ أيام مختلفة في فصل الخريف.'
        : 'Log habits on 7 distinct days during Autumn season.',
      icon: 'Star',
      category: 'seasonal',
      tier: 'silver',
      xp: 350,
      season: 'autumn',
      isSeasonActive: currentSeason === 'autumn',
      seasonName: isFa ? 'پاییز' : isAr ? 'الخريف' : 'Autumn',
      seasonIcon: '🍁',
      seasonMonths: isFa ? 'مهر تا آذر' : isAr ? 'مهر إلى آذر' : 'Autumn (Mehr - Azar)',
      targetValue: 7,
      currentValue: currentSeason === 'autumn' ? Math.min(7, autumnDates.size) : 0,
      unlocked: currentSeason === 'autumn' && autumnDates.size >= 7,
      progressPercent: currentSeason === 'autumn' ? Math.min(100, Math.round((autumnDates.size / 7) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'autumn' ? '۷ روز در پاییز (فصل جاری ✅)' : '۷ روز در پاییز (فقط در فصل پاییز 🔒)')
        : '7 Days in Autumn',
    },
    {
      id: 'season_autumn_mastery',
      title: isFa ? 'استاد شب‌های پاییزی ☕' : isAr ? 'سيد ليالي الخريف ☕' : 'Autumn Nights Master ☕',
      description: isFa 
        ? 'ثبت ۲۰ بار انجام عادت در طول فصل پاییز و شب‌های بلند و معتدل آن. (فقط در پاییز)'
        : isAr
        ? 'تسجيل ۲۰ إنجازاً خلال فصل الخريف.'
        : 'Log 20 habit completions during Autumn season.',
      icon: 'Coffee',
      category: 'seasonal',
      tier: 'gold',
      xp: 600,
      season: 'autumn',
      isSeasonActive: currentSeason === 'autumn',
      seasonName: isFa ? 'پاییز' : isAr ? 'الخريف' : 'Autumn',
      seasonIcon: '☕',
      seasonMonths: isFa ? 'مهر تا آذر' : isAr ? 'مهر إلى آذر' : 'Autumn (Mehr - Azar)',
      targetValue: 20,
      currentValue: currentSeason === 'autumn' ? Math.min(20, autumnCompletions) : 0,
      unlocked: currentSeason === 'autumn' && autumnCompletions >= 20,
      progressPercent: currentSeason === 'autumn' ? Math.min(100, Math.round((autumnCompletions / 20) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'autumn' ? '۲۰ ثبت در پاییز (فصل جاری ✅)' : '۲۰ ثبت در پاییز (فقط در فصل پاییز 🔒)')
        : '20 Check-ins in Autumn',
    },

    // --- فصل زمستان (Winter) ---
    {
      id: 'season_winter_frost',
      title: isFa ? 'اراده پولادین در یخبندان ❄️' : isAr ? 'العزيمة الفولاذية في الصقيع ❄️' : 'Winter Frost Willpower ❄️',
      description: isFa 
        ? 'ثبت حداقل ۵ بار عادت در فصل زمستان (دی، بهمن، اسفند). این دستاورد منحصراً در سرمای زمستان فعال و قابل انجام است.'
        : isAr
        ? 'تسجيل ۵ مرات في فصل الشتاء (دي، بهمن، اسفند). متاح حصرياً في الشتاء.'
        : 'Complete at least 5 habit check-ins during Winter season. Only unlockable in Winter.',
      icon: 'Sparkles',
      category: 'seasonal',
      tier: 'bronze',
      xp: 180,
      season: 'winter',
      isSeasonActive: currentSeason === 'winter',
      seasonName: isFa ? 'زمستان' : isAr ? 'الشتاء' : 'Winter',
      seasonIcon: '❄️',
      seasonMonths: isFa ? 'دی تا اسفند' : isAr ? 'دي إلى اسفند' : 'Winter (Dey - Esfand)',
      targetValue: 5,
      currentValue: currentSeason === 'winter' ? Math.min(5, winterCompletions) : 0,
      unlocked: currentSeason === 'winter' && winterCompletions >= 5,
      progressPercent: currentSeason === 'winter' ? Math.min(100, Math.round((winterCompletions / 5) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'winter' ? '۵ ثبت در زمستان (فصل جاری ✅)' : '۵ ثبت در زمستان (فقط در فصل زمستان 🔒)')
        : '5 Check-ins in Winter',
    },
    {
      id: 'season_winter_blizzard_streak',
      title: isFa ? 'کولاک استمرار و پایداری 🏔️' : isAr ? 'سلسلة العاصفة الشتوية 🏔️' : 'Blizzard Streak 🏔️',
      description: isFa 
        ? 'ثبت عادات در حداقل ۷ روز متمایز از فصل زمستان در اوج یخبندان و کوتاهی روزها. (فقط در زمستان)'
        : isAr
        ? 'تسجيل العادات في ۷ أيام مختلفة في فصل الشتاء.'
        : 'Log habits on 7 distinct days during Winter season.',
      icon: 'Shield',
      category: 'seasonal',
      tier: 'silver',
      xp: 350,
      season: 'winter',
      isSeasonActive: currentSeason === 'winter',
      seasonName: isFa ? 'زمستان' : isAr ? 'الشتاء' : 'Winter',
      seasonIcon: '🏔️',
      seasonMonths: isFa ? 'دی تا اسفند' : isAr ? 'دي إلى اسفند' : 'Winter (Dey - Esfand)',
      targetValue: 7,
      currentValue: currentSeason === 'winter' ? Math.min(7, winterDates.size) : 0,
      unlocked: currentSeason === 'winter' && winterDates.size >= 7,
      progressPercent: currentSeason === 'winter' ? Math.min(100, Math.round((winterDates.size / 7) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'winter' ? '۷ روز در زمستان (فصل جاری ✅)' : '۷ روز در زمستان (فقط در فصل زمستان 🔒)')
        : '7 Days in Winter',
    },
    {
      id: 'season_winter_mastery',
      title: isFa ? 'نگهبان شعله زمستانی 🕯️' : isAr ? 'حارس الشعلة الشتوية 🕯️' : 'Winter Hearth Master 🕯️',
      description: isFa 
        ? 'ثبت ۲۰ بار انجام عادت در طول فصل زمستان تا رسیدن به روزهای واپسین اسفند. (فقط در زمستان)'
        : isAr
        ? 'تسجيل ۲۰ إنجازاً خلال فصل الشتاء.'
        : 'Log 20 habit completions during Winter season.',
      icon: 'Flame',
      category: 'seasonal',
      tier: 'gold',
      xp: 600,
      season: 'winter',
      isSeasonActive: currentSeason === 'winter',
      seasonName: isFa ? 'زمستان' : isAr ? 'الشتاء' : 'Winter',
      seasonIcon: '🕯️',
      seasonMonths: isFa ? 'دی تا اسفند' : isAr ? 'دي إلى اسفند' : 'Winter (Dey - Esfand)',
      targetValue: 20,
      currentValue: currentSeason === 'winter' ? Math.min(20, winterCompletions) : 0,
      unlocked: currentSeason === 'winter' && winterCompletions >= 20,
      progressPercent: currentSeason === 'winter' ? Math.min(100, Math.round((winterCompletions / 20) * 100)) : 0,
      criteriaLabel: isFa 
        ? (currentSeason === 'winter' ? '۲۰ ثبت در زمستان (فصل جاری ✅)' : '۲۰ ثبت در زمستان (فقط در فصل زمستان 🔒)')
        : '20 Check-ins in Winter',
    },

    // --- نشان جامع چهارفصل (Four Seasons Legend) ---
    {
      id: 'season_four_seasons_legend',
      title: isFa ? 'اسطوره جامع چهارفصل 🌐👑' : isAr ? 'أسطورة الفصول الأربعة 🌐👑' : 'Four Seasons Legend 🌐👑',
      description: isFa 
        ? 'داشتن سابقه ثبت عادت در هر ۴ فصل سال (بهار 🌸، تابستان ☀️، پاییز 🍂 و زمستان ❄️) به نشانه استمرار سالانه پایدار!'
        : isAr
        ? 'تسجيل عادات في الفصول الأربعة كلها (الربيع والصيف والخريف والشتاء).'
        : 'Have habit check-ins in all 4 seasons of the year.',
      icon: 'Crown',
      category: 'seasonal',
      tier: 'diamond',
      xp: 1200,
      targetValue: 4,
      currentValue: Math.min(4, seasonsWithActivity),
      unlocked: seasonsWithActivity >= 4,
      progressPercent: Math.min(100, Math.round((seasonsWithActivity / 4) * 100)),
      criteriaLabel: isFa ? 'ثبت در تمام ۴ فصل' : isAr ? 'في جميع الفصول الأربعة' : 'Active in all 4 seasons',
    },
    {
      id: 'all_seasons_masters_quad',
      title: isFa ? 'تاج پادشاهی چهارفصل 👑🌸☀️🍂❄️' : isAr ? 'تاج ملوك الفصول الأربعة 👑🌸☀️🍂❄️' : 'Crown of Quad-Seasons 👑🌸☀️🍂❄️',
      description: isFa 
        ? 'ثبت حداقل ۲۰ بار عادت در هر یک از ۴ فصل سال (بهار، تابستان، پاییز و زمستان) به نشانه تسلط کامل بر تقویم سالانه!'
        : isAr
        ? 'تسجيل ۲۰ إنجازاً على الأقل في كل فصل من الفصول الأربعة للعام.'
        : 'Log at least 20 habit check-ins in each of the 4 seasons of the year.',
      icon: 'Crown',
      category: 'seasonal',
      tier: 'diamond',
      xp: 1800,
      targetValue: 4,
      currentValue: [springCompletions >= 20, summerCompletions >= 20, autumnCompletions >= 20, winterCompletions >= 20].filter(Boolean).length,
      unlocked: springCompletions >= 20 && summerCompletions >= 20 && autumnCompletions >= 20 && winterCompletions >= 20,
      progressPercent: Math.min(100, Math.round(([springCompletions >= 20, summerCompletions >= 20, autumnCompletions >= 20, winterCompletions >= 20].filter(Boolean).length / 4) * 100)),
      criteriaLabel: isFa ? '۲۰ تیک در هر ۴ فصل' : isAr ? '۲۰ في كل الفصول' : '20 in all 4 seasons',
    },

    // ==========================================
    // 7. TASK & PRODUCTIVITY ACHIEVEMENTS 📋⚡
    // ==========================================
    {
      id: 'task_first_strike',
      title: isFa ? 'ضرب‌شست اول در تسک‌ها' : isAr ? 'الضربة الأولى في المهام' : 'First Strike in Tasks',
      description: isFa
        ? 'تکمیل اولین تسک در سیستم مدیریت وظایف روزانه.'
        : isAr
        ? 'إنجاز أول مهمة في نظام إدارة المهام اليومية.'
        : 'Complete your first task in the daily tasks management system.',
      icon: 'CheckSquare',
      category: 'tasks',
      tier: 'bronze',
      xp: 60,
      targetValue: 1,
      currentValue: Math.min(1, completedTasksCount),
      unlocked: completedTasksCount >= 1,
      progressPercent: completedTasksCount >= 1 ? 100 : 0,
      criteriaLabel: isFa ? '۱ تسک تکمیل شده' : isAr ? 'مهمة واحدة مكتملة' : '1 Task Completed',
    },
    {
      id: 'task_decathlete_10',
      title: isFa ? 'ورزشکار دهگانه وظایف 🔟' : isAr ? 'بطل المهام العشر 🔟' : 'Task Decathlete 🔟',
      description: isFa
        ? 'تکمیل ۱۰ تسک مختلف و ایجاد نظم در انجام تعهدات روزانه.'
        : isAr
        ? 'إنجاز ۱۰ مهام مختلفة وترسيخ الانضباط في الالتزامات اليومية.'
        : 'Complete 10 tasks and build execution discipline for daily commitments.',
      icon: 'ListTodo',
      category: 'tasks',
      tier: 'bronze',
      xp: 150,
      targetValue: 10,
      currentValue: Math.min(10, completedTasksCount),
      unlocked: completedTasksCount >= 10,
      progressPercent: Math.min(100, Math.round((Math.min(10, completedTasksCount) / 10) * 100)),
      criteriaLabel: isFa ? '۱۰ تسک تکمیل شده' : isAr ? '۱۰ مهام مكتملة' : '10 Tasks Completed',
    },
    {
      id: 'task_productivity_50',
      title: isFa ? 'متخصص بهره‌وری و تمرکز ۵۰' : isAr ? 'خبير الإنتاجية والتركيز ۵۰' : 'Productivity Specialist 50',
      description: isFa
        ? 'تکمیل ۵۰ تسک و حفظ شتاب انجام پروژه‌ها و امور اجرایی.'
        : isAr
        ? 'إنجاز ۵۰ مهمة والحفاظ على زخم تنفيذ المشاريع والأعمال.'
        : 'Complete 50 tasks and maintain robust execution momentum.',
      icon: 'Target',
      category: 'tasks',
      tier: 'silver',
      xp: 350,
      targetValue: 50,
      currentValue: Math.min(50, completedTasksCount),
      unlocked: completedTasksCount >= 50,
      progressPercent: Math.min(100, Math.round((Math.min(50, completedTasksCount) / 50) * 100)),
      criteriaLabel: isFa ? '۵۰ تسک تکمیل شده' : isAr ? '۵۰ مهمة مكتملة' : '50 Tasks Completed',
    },
    {
      id: 'task_centurion_100',
      title: isFa ? 'فرمانده صدگانه تسک‌ها 💯' : isAr ? 'قائد المئة مهمة 💯' : 'Centurion of 100 Tasks 💯',
      description: isFa
        ? 'تکمیل ۱۰۰ تسک در برنامه؛ تسلط بر جریان کار و انجام بی‌چون‌وچرای تعهدات.'
        : isAr
        ? 'إنجاز ۱۰۰ مهمة؛ السيطرة على تدفق العمل وتنفيذ الالتزامات بلا تردد.'
        : 'Complete 100 tasks; total mastery over your workflow and daily commitments.',
      icon: 'Award',
      category: 'tasks',
      tier: 'gold',
      xp: 750,
      targetValue: 100,
      currentValue: Math.min(100, completedTasksCount),
      unlocked: completedTasksCount >= 100,
      progressPercent: Math.min(100, Math.round((Math.min(100, completedTasksCount) / 100) * 100)),
      criteriaLabel: isFa ? '۱۰۰ تسک تکمیل شده' : isAr ? '۱۰۰ مهمة مكتملة' : '100 Tasks Completed',
    },
    {
      id: 'task_titan_250',
      title: isFa ? 'تایتان مدیریت زمان و پروژه‌ها (۲۵۰ تسک) ⚡' : isAr ? 'تيتان إدارة الوقت والمشاريع (۲۵۰ مهمة) ⚡' : 'Titan of Time & Tasks (250 Tasks) ⚡',
      description: isFa
        ? 'تکمیل ۲۵۰ تسک با دقت و تعهد کامل؛ اثبات استادی در تبدیل فکر به عمل.'
        : isAr
        ? 'إنجاز ۲۵۰ مهمة بدقة والتزام كامل؛ إثبات الجدارة في تحويل الأفكار إلى إنجازات.'
        : 'Complete 250 tasks with peak precision; proven mastery of turning intent into action.',
      icon: 'Trophy',
      category: 'tasks',
      tier: 'diamond',
      xp: 1500,
      targetValue: 250,
      currentValue: Math.min(250, completedTasksCount),
      unlocked: completedTasksCount >= 250,
      progressPercent: Math.min(100, Math.round((Math.min(250, completedTasksCount) / 250) * 100)),
      criteriaLabel: isFa ? '۲۵۰ تسک تکمیل شده' : isAr ? '۲۵۰ مهمة مكتملة' : '250 Tasks Completed',
    },
    {
      id: 'task_recurring_habitual_5',
      title: isFa ? 'استاد چرخه‌های تکرارشونده 🔄' : isAr ? 'أستاذ الدورات المتكررة 🔄' : 'Recurring Cycle Master 🔄',
      description: isFa
        ? 'کسب حداقل ۵ زنجیره تکرار در تسک‌های دوره‌ای و تکرارشونده.'
        : isAr
        ? 'تحقيق ۵ سلاسل تكرار في المهام الدورية المتكررة.'
        : 'Achieve at least 5 recurring streaks across periodic tasks.',
      icon: 'Repeat',
      category: 'tasks',
      tier: 'silver',
      xp: 300,
      targetValue: 5,
      currentValue: Math.min(5, maxRecurringStreak),
      unlocked: maxRecurringStreak >= 5,
      progressPercent: Math.min(100, Math.round((Math.min(5, maxRecurringStreak) / 5) * 100)),
      criteriaLabel: isFa ? '۵ چرخه تکرار تسک' : isAr ? '۵ دورات تكرار' : '5 Recurring Streak',
    },
    {
      id: 'task_high_priority_slayer',
      title: isFa ? 'غلبه بر چالش‌های آتشین 🔥' : isAr ? 'قاهر المهام العاجلة 🔥' : 'High Priority Slayer 🔥',
      description: isFa
        ? 'تکمیل حداقل ۵ تسک با اولویت بالا (High Priority) و رسیدگی به امور حیاتی.'
        : isAr
        ? 'إنجاز ۵ مهام ذات أولوية قصوى ومعالجة الأمور الحيوية.'
        : 'Complete at least 5 high-priority tasks and conquer critical challenges.',
      icon: 'Flame',
      category: 'tasks',
      tier: 'silver',
      xp: 250,
      targetValue: 5,
      currentValue: Math.min(5, highPriorityCompletedCount),
      unlocked: highPriorityCompletedCount >= 5,
      progressPercent: Math.min(100, Math.round((Math.min(5, highPriorityCompletedCount) / 5) * 100)),
      criteriaLabel: isFa ? '۵ تسک اولویت بالا' : isAr ? '۵ مهام عالية الأولوية' : '5 High Priority Tasks',
    },
    {
      id: 'task_high_priority_conqueror',
      title: isFa ? 'فاتح تسک‌های حساس و استراتژیک 🛡️' : isAr ? 'فاتح المهام الاستراتيجية 🛡️' : 'Strategic Task Conqueror 🛡️',
      description: isFa
        ? 'تکمیل ۱۵ تسک با اولویت بالا و تصمیم‌گیری قاطعانه در کارهای مهم.'
        : isAr
        ? 'إنجاز ۱۵ مهمة ذات أولوية عالية واتخاذ قرارات حاسمة.'
        : 'Complete 15 high-priority tasks with resolute execution.',
      icon: 'ShieldCheck',
      category: 'tasks',
      tier: 'gold',
      xp: 500,
      targetValue: 15,
      currentValue: Math.min(15, highPriorityCompletedCount),
      unlocked: highPriorityCompletedCount >= 15,
      progressPercent: Math.min(100, Math.round((Math.min(15, highPriorityCompletedCount) / 15) * 100)),
      criteriaLabel: isFa ? '۱۵ تسک اولویت بالا' : isAr ? '۱۵ مهمة عالية الأولوية' : '15 High Priority Tasks',
    },
    {
      id: 'task_subtask_perfectionist',
      title: isFa ? 'کمال‌گرای ساختاریافته 🧩' : isAr ? 'المهام الفرعية الدقيقة 🧩' : 'Subtask Perfectionist 🧩',
      description: isFa
        ? 'تکمیل حداقل ۳ تسک که دارای زیرتسک‌های تفکیک‌شده بوده‌اند.'
        : isAr
        ? 'إنجاز ۳ مهام تتضمن مهاماً فرعية مفصلة بالكامل.'
        : 'Complete at least 3 tasks that contain breakdown subtasks.',
      icon: 'Layers',
      category: 'tasks',
      tier: 'bronze',
      xp: 120,
      targetValue: 3,
      currentValue: Math.min(3, tasksWithSubtasksCompleted),
      unlocked: tasksWithSubtasksCompleted >= 3,
      progressPercent: Math.min(100, Math.round((Math.min(3, tasksWithSubtasksCompleted) / 3) * 100)),
      criteriaLabel: isFa ? '۳ تسک با زیرتسک' : isAr ? '۳ مهام بمهام فرعية' : '3 Tasks with Subtasks',
    },
    {
      id: 'task_zero_inbox_cleaner',
      title: isFa ? 'پاکسازی بی‌نقص روز و اینباکس صفر 🧹' : isAr ? 'تنظيف المهام اليومية والإنبوكس الصفر 🧹' : 'Zero Inbox Day Cleaner 🧹',
      description: isFa
        ? 'به پایان رساندن تمام تسک‌های برنامه‌ریزی‌شده و رسیدن به صفر تسک معوق در روز فعال.'
        : isAr
        ? 'إنجاز كافة المهام المجدولة والوصول إلى صفر مهام مؤجلة اليوم.'
        : 'Complete all scheduled tasks for the day and achieve clean zero inbox.',
      icon: 'CheckCircle2',
      category: 'tasks',
      tier: 'silver',
      xp: 200,
      targetValue: 1,
      currentValue: hasZeroInboxToday ? 1 : 0,
      unlocked: hasZeroInboxToday,
      progressPercent: hasZeroInboxToday ? 100 : 0,
      criteriaLabel: isFa ? 'اینباکس صفر روز' : isAr ? 'صفر مهام معلقة' : 'Zero Pending Tasks Today',
    },

    // ==========================================
    // 8. STORE, NOVELS & CINEMA ACHIEVEMENTS 🛍️📚🎬
    // ==========================================
    {
      id: 'shop_first_novel_reader',
      title: isFa ? 'نخستین گام در دنیای واژگان 📖' : isAr ? 'الخطوة الأولى في عالم الكلمات 📖' : 'First Step in Stories 📖',
      description: isFa
        ? 'بازگشایی اولین رمان یا کتاب از فروشگاه با استفاده از سکه‌های پاداش عادات.'
        : isAr
        ? 'فتح أول رواية أو كتاب في المتجر باستخدام عملات المكافآت.'
        : 'Unlock your first novel or book in the store using reward coins.',
      icon: 'BookOpen',
      category: 'shop',
      tier: 'bronze',
      xp: 80,
      targetValue: 1,
      currentValue: Math.min(1, unlockedNovelsCount),
      unlocked: unlockedNovelsCount >= 1,
      progressPercent: unlockedNovelsCount >= 1 ? 100 : 0,
      criteriaLabel: isFa ? 'بازگشایی ۱ رمان' : isAr ? 'رواية واحدة' : '1 Novel Unlocked',
    },
    {
      id: 'shop_novel_enthusiast_3',
      title: isFa ? 'علاقه‌مند به رمان‌های آموزنده 📚' : isAr ? 'عاشق الروايات الهادفة 📚' : 'Novel Enthusiast 3 📚',
      description: isFa
        ? 'بازگشایی حداقل ۳ رمان در کتابخانه اختصاصی فروشگاه.'
        : isAr
        ? 'فتح ۳ روايات على الأقل في مكتبة المتجر المخصصة.'
        : 'Unlock at least 3 novels in your personal store library.',
      icon: 'BookOpen',
      category: 'shop',
      tier: 'silver',
      xp: 250,
      targetValue: 3,
      currentValue: Math.min(3, unlockedNovelsCount),
      unlocked: unlockedNovelsCount >= 3,
      progressPercent: Math.min(100, Math.round((Math.min(3, unlockedNovelsCount) / 3) * 100)),
      criteriaLabel: isFa ? 'بازگشایی ۳ رمان' : isAr ? '۳ روايات' : '3 Novels Unlocked',
    },
    {
      id: 'shop_bibliophile_scholar_5',
      title: isFa ? 'دانشمند و رمان‌خوان حرفه‌ای 🎓' : isAr ? 'القارئ المحترف ۵ 🎓' : 'Bibliophile Scholar 5 🎓',
      description: isFa
        ? 'بازگشایی ۵ رمان در کتابخانه فروشگاه با سکه‌های حاصل از تلاش و عادات.'
        : isAr
        ? 'فتح ۵ روايات في المتجر باستخدام العملات المكتسبة من العادات.'
        : 'Unlock 5 novels in the store library with habit-earned coins.',
      icon: 'Award',
      category: 'shop',
      tier: 'gold',
      xp: 600,
      targetValue: 5,
      currentValue: Math.min(5, unlockedNovelsCount),
      unlocked: unlockedNovelsCount >= 5,
      progressPercent: Math.min(100, Math.round((Math.min(5, unlockedNovelsCount) / 5) * 100)),
      criteriaLabel: isFa ? 'بازگشایی ۵ رمان' : isAr ? '۵ روايات' : '5 Novels Unlocked',
    },
    {
      id: 'shop_chapter_explorer_15',
      title: isFa ? 'کاوشگر فصل‌های بی‌پایان 📑' : isAr ? 'مستكشف الفصول 📑' : 'Chapter Explorer 15 📑',
      description: isFa
        ? 'مطالعه یا بازگشایی حداقل ۱۵ فصل از رمان‌های موجود در فروشگاه.'
        : isAr
        ? 'قراءة أو فتح ۱۵ فصلاً من الروايات في المتجر.'
        : 'Read or unlock at least 15 chapters across store novels.',
      icon: 'FileText',
      category: 'shop',
      tier: 'silver',
      xp: 300,
      targetValue: 15,
      currentValue: Math.min(15, effectiveReadChapters),
      unlocked: effectiveReadChapters >= 15,
      progressPercent: Math.min(100, Math.round((Math.min(15, effectiveReadChapters) / 15) * 100)),
      criteriaLabel: isFa ? 'مطالعه ۱۵ فصل' : isAr ? '۱۵ فصلاً' : '15 Chapters Read/Unlocked',
    },
    {
      id: 'shop_first_cinema_screening',
      title: isFa ? 'پرده اول سینمای اراده 🎬' : isAr ? 'العرض الأول لسينما العزيمة 🎬' : 'First Cinema Screening 🎬',
      description: isFa
        ? 'بازگشایی اولین فیلم یا سریال انگیزشی در فروشگاه پاداش.'
        : isAr
        ? 'فتح أول فيلم أو مسلسل تحفيزي في متجر المكافآت.'
        : 'Unlock your first motivational movie or series in the reward store.',
      icon: 'Film',
      category: 'shop',
      tier: 'bronze',
      xp: 100,
      targetValue: 1,
      currentValue: Math.min(1, effectiveMoviesCount),
      unlocked: effectiveMoviesCount >= 1,
      progressPercent: effectiveMoviesCount >= 1 ? 100 : 0,
      criteriaLabel: isFa ? 'بازگشایی ۱ فیلم/سریال' : isAr ? 'فيلم أو مسلسل واحد' : '1 Movie Unlocked',
    },
    {
      id: 'shop_cinephile_master_3',
      title: isFa ? 'کارگردان تحول و انگیزه 🎥' : isAr ? 'مخرج التحول والحافز ۳ 🎥' : 'Cinephile Master 3 🎥',
      description: isFa
        ? 'بازگشایی حداقل ۳ اثر سینمایی یا سریال انگیزشی از فروشگاه.'
        : isAr
        ? 'فتح ۳ أعمال سينمائية أو مسلسلات تحفيزية من المتجر.'
        : 'Unlock at least 3 cinematic or motivational series from the store.',
      icon: 'Film',
      category: 'shop',
      tier: 'silver',
      xp: 350,
      targetValue: 3,
      currentValue: Math.min(3, effectiveMoviesCount),
      unlocked: effectiveMoviesCount >= 3,
      progressPercent: Math.min(100, Math.round((Math.min(3, effectiveMoviesCount) / 3) * 100)),
      criteriaLabel: isFa ? 'بازگشایی ۳ فیلم/سریال' : isAr ? '۳ أفلام/مسلسلات' : '3 Movies Unlocked',
    },
    {
      id: 'shop_cinema_titan_5',
      title: isFa ? 'تایتان پرده نقره‌ای و پاداش‌های تصویری 🍿' : isAr ? 'تيتان الشاشة الفضية 🍿' : 'Cinema Titan 5 🍿',
      description: isFa
        ? 'بازگشایی ۵ فیلم یا فصل‌های کامل ویدیو در فروشگاه پاداش.'
        : isAr
        ? 'فتح ۵ أفلام أو مواسم كاملة في متجر المكافآت.'
        : 'Unlock 5 movies or full video playlists in the reward store.',
      icon: 'Film',
      category: 'shop',
      tier: 'gold',
      xp: 700,
      targetValue: 5,
      currentValue: Math.min(5, effectiveMoviesCount),
      unlocked: effectiveMoviesCount >= 5,
      progressPercent: Math.min(100, Math.round((Math.min(5, effectiveMoviesCount) / 5) * 100)),
      criteriaLabel: isFa ? 'بازگشایی ۵ فیلم/سریال' : isAr ? '۵ أفلام/مسلسلات' : '5 Movies Unlocked',
    },
    {
      id: 'shop_dopamine_investor_100',
      title: isFa ? 'سرمایه‌گذار لذت و دوپامین سالم 🪙' : isAr ? 'مستثمر الدوبامين الإيجابي 🪙' : 'Dopamine Investor 100 🪙',
      description: isFa
        ? 'خرج کردن ۱۰۰ سکه پاداش برای رمان‌ها و رسانه‌های فروشگاه.'
        : isAr
        ? 'إنفاق ۱۰۰ عملة مكافأة على الروايات والمحتوى في المتجر.'
        : 'Spend 100 reward coins on novels and media in the store.',
      icon: 'Coins',
      category: 'shop',
      tier: 'bronze',
      xp: 120,
      targetValue: 100,
      currentValue: Math.min(100, coinsSpentTotal),
      unlocked: coinsSpentTotal >= 100,
      progressPercent: Math.min(100, Math.round((Math.min(100, coinsSpentTotal) / 100) * 100)),
      criteriaLabel: isFa ? '۱۰۰ سکه خرج شده' : isAr ? '۱۰۰ عملة تم إنفاقها' : '100 Coins Spent',
    },
    {
      id: 'shop_dopamine_tycoon_500',
      title: isFa ? 'سلطان اقتصاد پاداش‌ها و عادات 💎' : isAr ? 'سلطان اقتصاد المكافآت ۵۰۰ 💎' : 'Dopamine Tycoon 500 💎',
      description: isFa
        ? 'خرج کردن ۵۰۰ سکه پاداش برای بازگشایی گنجینه‌های آموزشی و داستانی فروشگاه.'
        : isAr
        ? 'إنفاق ۵۰۰ عملة مكافأة لفتح الكنوز التعليمية والقصص في المتجر.'
        : 'Spend 500 reward coins to unlock learning and narrative treasures.',
      icon: 'ShoppingBag',
      category: 'shop',
      tier: 'silver',
      xp: 450,
      targetValue: 500,
      currentValue: Math.min(500, coinsSpentTotal),
      unlocked: coinsSpentTotal >= 500,
      progressPercent: Math.min(100, Math.round((Math.min(500, coinsSpentTotal) / 500) * 100)),
      criteriaLabel: isFa ? '۵۰۰ سکه خرج شده' : isAr ? '۵۰۰ عملة تم إنفاقها' : '500 Coins Spent',
    },
    {
      id: 'shop_fortune_collector_1000',
      title: isFa ? 'خزانه‌دار بزرگ سکه‌های طلایی ۱۰۰۰ 🏦✨' : isAr ? 'أمين خزينة العملات الذهبية ۱۰۰۰ 🏦✨' : 'Grand Fortune Collector 1000 🏦✨',
      description: isFa
        ? 'کسب مجموع ۱۰۰۰ سکه پاداش از تیک زدن عادات و تسک‌های روزانه.'
        : isAr
        ? 'كسب ما مجموعه ۱۰۰۰ عملة مكافأة من إنجاز العادات والمهام.'
        : 'Earn a total of 1,000 reward coins from habit & task completions.',
      icon: 'Coins',
      category: 'shop',
      tier: 'gold',
      xp: 900,
      targetValue: 1000,
      currentValue: Math.min(1000, coinsEarnedTotal),
      unlocked: coinsEarnedTotal >= 1000,
      progressPercent: Math.min(100, Math.round((Math.min(100, coinsEarnedTotal) / 1000) * 100)),
      criteriaLabel: isFa ? '۱۰۰۰ سکه کسب شده' : isAr ? '۱۰۰۰ عملة مكتسبة' : '1,000 Total Coins Earned',
    },
    {
      id: 'shop_collector_supreme',
      title: isFa ? 'کلکسیونر برتر و صاحب امپراتوری دانش 👑🛍️' : isAr ? 'الجامع الأعظم وإمبراطور المعرفة 👑🛍️' : 'Supreme Shop Collector 👑🛍️',
      description: isFa
        ? 'بازگشایی همزمان حداقل ۳ رمان و ۳ فیلم و مصرف حداقل ۷۵۰ سکه در فروشگاه پاداش.'
        : isAr
        ? 'فتح ۳ روايات و ۳ أفلام وإنفاق ۷۵۰ عملة في المتجر على الأقل.'
        : 'Unlock at least 3 novels, 3 movies, and spend at least 750 coins in the reward store.',
      icon: 'Crown',
      category: 'shop',
      tier: 'diamond',
      xp: 1600,
      targetValue: 3,
      currentValue: [unlockedNovelsCount >= 3, effectiveMoviesCount >= 3, coinsSpentTotal >= 750].filter(Boolean).length,
      unlocked: unlockedNovelsCount >= 3 && effectiveMoviesCount >= 3 && coinsSpentTotal >= 750,
      progressPercent: Math.min(100, Math.round(([unlockedNovelsCount >= 3, effectiveMoviesCount >= 3, coinsSpentTotal >= 750].filter(Boolean).length / 3) * 100)),
      criteriaLabel: isFa ? '۳ رمان + ۳ فیلم + ۷۵۰ سکه' : isAr ? '۳ روايات + ۳ أفلام + ۷۵۰ عملة' : '3 Novels + 3 Movies + 750 Coins',
    },
  ];

  // Calculate XP & Brain Level
  // Each habit check-in awards XP based on habit.rewardXp (1 to 5, default 5)
  const habitsXp = habits.reduce((acc, h) => {
    const habitXp = Math.min(5, Math.max(1, h.rewardXp ?? 5));
    const completedCount = Object.values(h.history || {}).filter(Boolean).length;
    return acc + (completedCount * habitXp);
  }, 0);

  // Each completed task awards task.rewardXp (default 2)
  // For one-time tasks: awards XP once when completed/claimed
  // For recurring tasks: awards XP once per completion cycle (claimedRewardDates or streak)
  const tasksXp = taskList.reduce((acc, t) => {
    const xpPerCycle = t.rewardXp ?? 2;
    if (t.isRecurring) {
      const cyclesCount = (t.claimedRewardDates && t.claimedRewardDates.length > 0)
        ? t.claimedRewardDates.length
        : (t.recurringStreak || 0);
      return acc + (cyclesCount * xpPerCycle);
    } else {
      const isDoneOrClaimed = t.completed || t.rewardClaimed;
      return acc + (isDoneOrClaimed ? xpPerCycle : 0);
    }
  }, 0);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const totalUnlocked = unlockedAchievements.length;
  const totalAchievements = achievements.length;
  const achievementsXp = unlockedAchievements.reduce((sum, a) => sum + a.xp, 0);
  const totalXp = achievementsXp + habitsXp + tasksXp;

  const levels = BRAIN_LEVELS[language] || BRAIN_LEVELS.fa;
  let currentLevel = levels[0];
  let nextLevel: BrainLevel | null = levels[1] || null;

  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i];
    const hasXp = totalXp >= lvl.minXp;
    const reqIds = lvl.requiredAchievementIds || [];
    const meetsRequirements = reqIds.length === 0 || reqIds.every((reqId) => {
      const ach = achievements.find((a) => a.id === reqId);
      return ach && ach.unlocked;
    });

    if (hasXp && meetsRequirements) {
      currentLevel = lvl;
      nextLevel = levels[i + 1] || null;
    } else {
      nextLevel = lvl;
      break;
    }
  }

  let levelProgressPercent = 100;
  if (nextLevel) {
    const range = Math.max(1, nextLevel.minXp - currentLevel.minXp);
    const progressInLevel = totalXp - currentLevel.minXp;
    levelProgressPercent = Math.min(100, Math.max(0, Math.round((progressInLevel / range) * 100)));
  }

  // Categories overview
  const categoryNames: Record<AchievementCategory, Record<Language, string>> = {
    neuroscience: {
      fa: 'علمی و نوروساینس',
      ar: 'العلم والأعصاب',
      en: 'Neuroscience',
    },
    streak: {
      fa: 'زنجیره و تداوم',
      ar: 'السلسلة والاستمرار',
      en: 'Streaks',
    },
    mastery: {
      fa: 'تسلط و تعادل',
      ar: 'الإتقان والتوازن',
      en: 'Mastery',
    },
    consistency: {
      fa: 'استمرار و ثبت‌ها',
      ar: 'التكرار والإنجازات',
      en: 'Consistency',
    },
    tasks: {
      fa: 'مدیریت وظایف و تسک‌ها 📋',
      ar: 'إدارة المهام والإنتاجية 📋',
      en: 'Tasks & Productivity 📋',
    },
    shop: {
      fa: 'فروشگاه، رمان و سینمای انگیزشی 🛍️📚',
      ar: 'المتجر والروايات والسينما 🛍️📚',
      en: 'Store, Novels & Cinema 🛍️📚',
    },
    seasonal: {
      fa: 'چالش‌های فصلی و چهارفصل 🌸☀️🍂❄️',
      ar: 'تحديات الفصول الأربعة 🌸☀️🍂❄️',
      en: 'Seasonal Challenges 🌸☀️🍂❄️',
    },
    fun_easter_eggs: {
      fa: 'گنجینه اسرار و مناسبت‌ها 🔮',
      ar: 'صندوق الأسرار والمناسبات 🔮',
      en: 'Secret Vault & Events 🔮',
    },
  };

  const categories: AchievementsOverview['categories'] = (['neuroscience', 'streak', 'mastery', 'consistency', 'tasks', 'shop', 'seasonal', 'fun_easter_eggs'] as AchievementCategory[]).map((cat) => {
    const items = achievements.filter((a) => a.category === cat);
    return {
      id: cat,
      name: categoryNames[cat][language] || categoryNames[cat].fa,
      unlockedCount: items.filter((a) => a.unlocked).length,
      totalCount: items.length,
    };
  });

  return {
    totalUnlocked,
    totalAchievements,
    totalXp,
    habitsXp,
    tasksXp,
    achievementsXp,
    currentLevel,
    nextLevel,
    levelProgressPercent,
    achievements,
    categories,
  };
}
