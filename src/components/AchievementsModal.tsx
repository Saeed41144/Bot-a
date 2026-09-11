import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  Medal, 
  Zap, 
  Flame, 
  ShieldCheck, 
  Sprout, 
  Crown, 
  CheckCheck, 
  Boxes, 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  Layers, 
  Star, 
  Lock, 
  Unlock, 
  X, 
  Copy, 
  Check, 
  TrendingUp,
  Target,
  Activity,
  Gem,
  Milestone,
  Sun,
  Shield,
  Moon,
  Coffee,
  Palette,
  BookOpen,
  Compass,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  ListTodo,
  Repeat,
  ShoppingBag,
  Coins,
  Film,
  FileText
} from 'lucide-react';
import { Habit, Task, Language, UserRewardWallet, WebNovel, ShopMovie } from '../types';
import { calculateAchievements, Achievement, AchievementCategory, AchievementTier } from '../utils/achievements';
import { formatNumber, translations } from '../utils/translations';
import { BrainLevelsModal } from './BrainLevelsModal';
import { safeStorage } from '../utils/safeStorage';
import { safeClipboardCopy } from '../utils/safeDom';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  language: Language;
  tasks?: Task[];
  wallet?: UserRewardWallet;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  habits,
  language,
  tasks = [],
  wallet,
  customNovels = [],
  customMovies = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all' | 'unlocked' | 'locked'>('all');
  const [copied, setCopied] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [brainTaps, setBrainTaps] = useState(() => {
    try {
      return parseInt(safeStorage.getItem('habit_easter_egg_taps') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [showBrainSecretMsg, setShowBrainSecretMsg] = useState(false);
  const [isLevelsModalOpen, setIsLevelsModalOpen] = useState(false);

  if (!isOpen) return null;

  const t = translations[language];
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const overview = calculateAchievements(habits, language, tasks, wallet, customNovels, customMovies);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 45 && !isHeaderCollapsed) {
      setIsHeaderCollapsed(true);
    } else if (scrollTop <= 10 && isHeaderCollapsed) {
      setIsHeaderCollapsed(false);
    }
  };

  const handleBrainTap = () => {
    const nextCount = (brainTaps >= 7 ? 7 : brainTaps + 1);
    setBrainTaps(nextCount);
    try {
      safeStorage.setItem('habit_easter_egg_taps', String(nextCount));
    } catch {
      // ignore
    }

    if (nextCount === 7) {
      setShowBrainSecretMsg(true);
      setTimeout(() => setShowBrainSecretMsg(false), 4000);
    }
  };

  // Filter achievements
  const filteredAchievements = overview.achievements.filter((a) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unlocked') return a.unlocked;
    if (selectedCategory === 'locked') return !a.unlocked;
    return a.category === selectedCategory;
  });

  // Render Icon helper
  const renderIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'Sprout': return <Sprout className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'Gem': return <Gem className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'Award': return <Award className={className} />;
      case 'Milestone': return <Milestone className={className} />;
      case 'Medal': return <Medal className={className} />;
      case 'Sun': return <Sun className={className} />;
      case 'Crown': return <Crown className={className} />;
      case 'Shield': return <Shield className={className} />;
      case 'CheckCheck': return <CheckCheck className={className} />;
      case 'Boxes': return <Boxes className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'Brain': return <Brain className={className} />;
      case 'CheckCircle2': return <CheckCircle2 className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'Star': return <Star className={className} />;
      case 'Moon': return <Moon className={className} />;
      case 'Coffee': return <Coffee className={className} />;
      case 'Palette': return <Palette className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Compass': return <Compass className={className} />;
      case 'CheckSquare': return <CheckSquare className={className} />;
      case 'ListTodo': return <ListTodo className={className} />;
      case 'Repeat': return <Repeat className={className} />;
      case 'ShoppingBag': return <ShoppingBag className={className} />;
      case 'Coins': return <Coins className={className} />;
      case 'Film': return <Film className={className} />;
      case 'FileText': return <FileText className={className} />;
      default: return <Award className={className} />;
    }
  };

  const getTierStyles = (tier: AchievementTier, unlocked: boolean) => {
    if (!unlocked) {
      return {
        cardBg: 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 opacity-75',
        badgeBg: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent dark:border-slate-700/50',
        iconBg: 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800',
        barColor: 'bg-slate-300 dark:bg-slate-750',
        label: isFa ? 'قفل شده' : isAr ? 'مغلق' : 'Locked',
      };
    }

    switch (tier) {
      case 'diamond':
        return {
          cardBg: 'bg-purple-50/50 dark:bg-slate-900 border-purple-200 dark:border-purple-800/60 shadow-xs dark:shadow-purple-950/40',
          badgeBg: 'bg-purple-600 dark:bg-purple-900/80 text-white dark:text-purple-200 border border-purple-400/30 dark:border-purple-700/60',
          iconBg: 'bg-purple-100 dark:bg-purple-950/90 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-xs',
          barColor: 'bg-purple-600 dark:bg-purple-500',
          label: isFa ? 'الماس' : isAr ? 'ماسي' : 'Diamond',
        };
      case 'gold':
        return {
          cardBg: 'bg-amber-50/50 dark:bg-slate-900 border-amber-200 dark:border-amber-800/60 shadow-xs dark:shadow-amber-950/40',
          badgeBg: 'bg-amber-600 dark:bg-amber-900/80 text-white dark:text-amber-200 border border-amber-400/30 dark:border-amber-700/60',
          iconBg: 'bg-amber-100 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 shadow-xs',
          barColor: 'bg-amber-500 dark:bg-amber-400',
          label: isFa ? 'طلا' : isAr ? 'ذهبي' : 'Gold',
        };
      case 'silver':
        return {
          cardBg: 'bg-slate-100/60 dark:bg-slate-900 border-slate-300 dark:border-slate-750/70 shadow-xs',
          badgeBg: 'bg-slate-600 dark:bg-slate-800 text-white dark:text-slate-200 border border-slate-400/30 dark:border-slate-700',
          iconBg: 'bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-750 shadow-xs',
          barColor: 'bg-slate-500 dark:bg-slate-400',
          label: isFa ? 'نقره' : isAr ? 'فضي' : 'Silver',
        };
      case 'bronze':
      default:
        return {
          cardBg: 'bg-orange-50/50 dark:bg-slate-900 border-orange-200 dark:border-orange-900/60 shadow-xs dark:shadow-orange-950/40',
          badgeBg: 'bg-orange-700 dark:bg-orange-900/80 text-white dark:text-orange-200 border border-orange-400/30 dark:border-orange-800/60',
          iconBg: 'bg-orange-100 dark:bg-orange-950/90 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-850 shadow-xs',
          barColor: 'bg-orange-600 dark:bg-orange-500',
          label: isFa ? 'برنز' : isAr ? 'برونزي' : 'Bronze',
        };
    }
  };

  const handleCopySummary = () => {
    const summaryText = isFa
      ? `🏆 کارنامه دستاوردهای ردیاب علمی عادات\n` +
        `🧠 رتبه ذهن: ${overview.currentLevel.title}\n` +
        `⚡ امتیاز تجربه نورونی: ${overview.totalXp} XP\n` +
        `🎖️ نشان‌های آزاد شده: ${overview.totalUnlocked} از ${overview.totalAchievements}\n\n` +
        `🥇 برترین دستاوردهای من:\n` +
        overview.achievements
          .filter((a) => a.unlocked)
          .map((a) => `✅ ${a.title} (+${a.xp} XP)`)
          .join('\n') +
        `\n\nمدل ۶۶ روزه رشد مجانبی دکتر فیلیپا لالی (۲۰۱۰)`
      : `🏆 Scientific Habit Tracker Achievements\n` +
        `🧠 Brain Rank: ${overview.currentLevel.title}\n` +
        `⚡ Neural XP: ${overview.totalXp} XP\n` +
        `🎖️ Unlocked Badges: ${overview.totalUnlocked} / ${overview.totalAchievements}\n\n` +
        overview.achievements
          .filter((a) => a.unlocked)
          .map((a) => `✅ ${a.title} (+${a.xp} XP)`)
          .join('\n');

    safeClipboardCopy(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Brain Level Card */}
        <div className={`bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden shrink-0 border-b border-slate-800 dark:border-slate-800/80 transition-all duration-300 ${
          isHeaderCollapsed ? 'p-3.5 sm:px-6 sm:py-3.5' : 'p-5 sm:p-6'
        }`}>
          {/* Subtle decorative glow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shadow-xs shrink-0 font-black">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                    {isFa ? 'تالار دستاوردها و نشان‌های عصبی' : isAr ? 'لوحة الإنجازات والأوسمة العصبية' : 'Achievements & Neural Badges'}
                  </h2>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-400/30">
                    {formatNumber(overview.totalUnlocked, language)} / {formatNumber(overview.totalAchievements, language)}
                  </span>
                  {/* Compact level chip when collapsed */}
                  {isHeaderCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsLevelsModalOpen(true)}
                      className="text-[11px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-400/30 flex items-center gap-1 cursor-pointer transition animate-in fade-in"
                    >
                      <Brain className="w-3 h-3 text-indigo-300" />
                      <span>{overview.currentLevel.title}</span>
                      <span className="text-amber-300 font-black">({formatNumber(overview.totalXp, language)} XP)</span>
                    </button>
                  )}
                </div>
                {!isHeaderCollapsed && (
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed hidden sm:block animate-in fade-in">
                    {isFa 
                      ? 'پاداش‌های رفتاری و نقاط عطف عصب‌شناختی بر پایه مدل ۶۶ روزه دکتر لالی' 
                      : isAr 
                      ? 'المكافآت السلوكية والمعالم العصبية بناءً على نموذج الـ 66 يوماً' 
                      : 'Behavioral milestones & neural trophies based on Lally (2010) model'}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons: Collapse Toggle & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="toggle-achievements-header-btn"
                onClick={() => setIsHeaderCollapsed((prev) => !prev)}
                className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10 dark:border-slate-700/60"
                title={isHeaderCollapsed 
                  ? (isFa ? 'نمایش اطلاعات کامل سطح و پیشرفت XP' : 'Expand level progress') 
                  : (isFa ? 'جمع کردن این پنل برای فضای بیشتر' : 'Collapse banner for more space')}
              >
                {isHeaderCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4 text-amber-300" />
                    <span className="text-[11px] hidden sm:inline text-amber-200">
                      {isFa ? 'پیشرفت سطح' : 'Expand'}
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                    <span className="text-[11px] hidden sm:inline">
                      {isFa ? 'جمع کردن' : 'Collapse'}
                    </span>
                  </>
                )}
              </button>

              <button
                id="close-achievements-modal-btn"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-white/10 dark:border-slate-700/60"
                aria-label={t.cancel}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secret Easter Egg Toast Notification */}
          {showBrainSecretMsg && (
            <div className="mt-3 p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center gap-2.5 text-amber-200 text-xs animate-in fade-in slide-in-from-top-2">
              <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-spin" />
              <div>
                <strong className="text-white block">{isFa ? '🎉 سیناپس‌های مخفی فعال شدند!' : '🎉 Secret Synaptic Circuits Unlocked!'}</strong>
                <span>{isFa ? 'نشان «تحریک مغزی شوخ‌طبعانه» با ۳۵۰ امتیاز تجربه آزاد شد!' : 'Brain Tickler badge (+350 XP) unlocked!'}</span>
              </div>
            </div>
          )}

          {/* Level and XP progress bar card (Collapsible Accordion) */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isHeaderCollapsed 
                ? 'max-h-0 opacity-0 mt-0 pointer-events-none' 
                : 'max-h-[350px] opacity-100 mt-4 sm:mt-5'
            }`}
          >
            <div className="bg-white/10 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div 
                onClick={() => setIsLevelsModalOpen(true)}
                className="flex items-center gap-3 w-full sm:w-auto cursor-pointer group select-none"
                title={isFa ? 'مشاهده نقشه تمام سطوح و XP لازم' : 'View all levels roadmap'}
              >
                <button
                  type="button"
                  id="brain-easter-egg-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrainTap();
                  }}
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${overview.currentLevel.badgeColor} text-white flex items-center justify-center font-black shadow-md shrink-0 cursor-pointer active:scale-90 hover:scale-105 transition-all relative select-none`}
                  title={isFa ? 'برای بیدار کردن سیناپس‌های مخفی ۷ بار کلیک کنید!' : 'Tap 7 times for secret neural boost!'}
                >
                  <Brain className={`w-6 h-6 ${brainTaps > 0 && brainTaps < 7 ? 'animate-bounce' : ''}`} />
                  {brainTaps > 0 && brainTaps < 7 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-ping">
                      {brainTaps}
                    </span>
                  )}
                </button>
                <div>
                  <span className="text-[10px] text-slate-300 font-semibold block uppercase tracking-wider group-hover:text-amber-300 transition">
                    {isFa ? 'سطح تسلط مغزی (مشاهده نقشه سطوح)' : isAr ? 'مستوى السيطرة الدماغية (عرض الخريطة)' : 'Brain Mastery Level (View Roadmap)'}
                  </span>
                  <span className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition flex items-center gap-1.5">
                    <span>{overview.currentLevel.title}</span>
                    <Trophy className="w-3.5 h-3.5 text-amber-400 opacity-75 group-hover:opacity-100" />
                  </span>
                </div>
              </div>

              <div className="w-full sm:flex-1 max-w-md flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    <span>{formatNumber(overview.totalXp, language)} XP</span>
                    <span className="text-[10px] text-slate-300 font-normal">
                      ({formatNumber(overview.achievementsXp, language)} {isFa ? 'نشان‌ها' : isAr ? 'أوسمة' : 'badges'} + {formatNumber(overview.habitsXp, language)} {isFa ? 'عادات' : isAr ? 'عادات' : 'habits'}{(overview.tasksXp || 0) > 0 ? ` + ${formatNumber(overview.tasksXp || 0, language)} ${isFa ? 'تسک‌ها' : isAr ? 'مهام' : 'tasks'}` : ''})
                    </span>
                  </span>
                  {overview.nextLevel ? (
                    <span className="text-slate-300 text-[11px]">
                      {isFa ? 'هدف سطح بعدی:' : isAr ? 'المستوى القادم:' : 'Next level:'}{' '}
                      <strong className="text-white font-bold">{formatNumber(overview.nextLevel.minXp, language)} XP</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-bold text-[11px]">
                      {isFa ? '👑 حداکثر سطح کسب شده' : '👑 Max Level Achieved'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/10 dark:border-slate-800">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 transition-all duration-500 shadow-sm"
                    style={{ width: `${overview.levelProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Level Roadmap & Copy Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  id="view-levels-roadmap-btn"
                  type="button"
                  onClick={() => setIsLevelsModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-amber-400/40"
                  title={isFa ? 'مشاهده تمام سطوح مغزی و XP مورد نیاز' : 'View all brain levels & XP'}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isFa ? 'نقشه سطوح' : isAr ? 'خريطة المستويات' : 'Levels'}</span>
                </button>

                <button
                  id="copy-achievements-btn"
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-white/15 dark:border-slate-700"
                  title={isFa ? 'کپی کارنامه افتخارات' : 'Copy achievements summary'}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">{isFa ? 'کپی شد!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isFa ? 'کپی کارنامه' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and category selector */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>{isFa ? 'همه نشان‌ها' : isAr ? 'جميع الأوسمة' : 'All Badges'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedCategory === 'all' ? 'bg-slate-800 dark:bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              {formatNumber(overview.totalAchievements, language)}
            </span>
          </button>

          {overview.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedCategory === cat.id ? 'bg-slate-800 dark:bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {formatNumber(cat.unlockedCount, language)}/{formatNumber(cat.totalCount, language)}
              </span>
            </button>
          ))}

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 mx-1 shrink-0" />

          <button
            onClick={() => setSelectedCategory('unlocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'unlocked'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>{isFa ? 'آزاد شده‌ها' : isAr ? 'المفتوحة' : 'Unlocked'}</span>
            <span className="text-[10px] font-bold">({formatNumber(overview.totalUnlocked, language)})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('locked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'locked'
                ? 'bg-slate-700 dark:bg-slate-800 text-white shadow-xs border border-transparent dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isFa ? 'در دست اقدام' : isAr ? 'قيد الإنجاز' : 'In Progress'}</span>
            <span className="text-[10px] font-bold">({formatNumber(overview.totalAchievements - overview.totalUnlocked, language)})</span>
          </button>
        </div>

        {/* Badges Grid View */}
        <div 
          onScroll={handleScroll}
          className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-white dark:bg-slate-950 scroll-smooth"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredAchievements.map((achievement) => {
              const styles = getTierStyles(achievement.tier, achievement.unlocked);

              return (
                <div
                  key={achievement.id}
                  id={`achievement-card-${achievement.id}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${styles.cardBg}`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon Box */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${styles.iconBg}`}>
                      {renderIcon(achievement.icon, 'w-6 h-6')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                          <span>{achievement.title}</span>
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {achievement.season && (
                            achievement.isSeasonActive ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/60 flex items-center gap-1 shadow-2xs">
                                <span>{achievement.seasonIcon}</span>
                                <span>{isFa ? `${achievement.seasonName} (فصل جاری ✅)` : `${achievement.seasonName} (Active)`}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{isFa ? `فقط در ${achievement.seasonName}` : `${achievement.seasonName} only`}</span>
                              </span>
                            )
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${styles.badgeBg}`}>
                            {styles.label}
                          </span>
                          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50 flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>+{formatNumber(achievement.xp, language)}</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                        {achievement.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar and status */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {isFa ? 'معیار هدف:' : isAr ? 'الهدف:' : 'Target:'}{' '}
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{achievement.criteriaLabel}</strong>
                      </span>
                      {achievement.unlocked ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isFa ? 'آزاد شده 🏆' : isAr ? 'مكتمل 🏆' : 'Unlocked 🏆'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">
                          {formatNumber(achievement.progressPercent, language)}٪ {isFa ? 'پیشرفت' : isAr ? 'مكتمل' : 'Done'}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${styles.barColor}`}
                        style={{ width: `${achievement.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
              {isFa ? 'نورونی با این فیلتر یافت نشد.' : 'No achievements found with this filter.'}
            </div>
          )}

          {/* Scientific Reward Doctrine Note */}
          <div className="mt-2 p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <strong className="block font-bold mb-0.5">
                {isFa ? 'پایه علمی سیستم پاداش دوپامینی:' : isAr ? 'الأساس العلمي لنظام المكافآت:' : 'Scientific Dopamine Loop:'}
              </strong>
              {isFa 
                ? 'ثبت تیک‌های روزانه و دستیابی به این نشان‌های عصبی، مسیرهای پاداش پیشانی مغز (VTA به Striatum) را فعال کرده و با ترشح کنترل‌شده دوپامین، مقاومت قشر قدامی را در روزهای سخت کاهش می‌دهد.'
                : 'Logging daily check-ins triggers the brain reward pathways (VTA-Striatum loop), releasing micro-dopamine bursts that reinforce myelin pathways and diminish cognitive friction.'}
            </div>
          </div>
        </div>

        {/* Footer Close Button */}
        <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isFa 
              ? `🏆 ${formatNumber(overview.totalUnlocked, language)} از ${formatNumber(overview.totalAchievements, language)} دستاورد آزاد شده است.`
              : `🏆 ${overview.totalUnlocked} of ${overview.totalAchievements} badges unlocked.`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 text-white text-xs font-bold transition cursor-pointer"
          >
            {isFa ? 'بستن' : isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      <BrainLevelsModal
        isOpen={isLevelsModalOpen}
        onClose={() => setIsLevelsModalOpen(false)}
        language={language}
        currentXp={overview.totalXp}
        currentLevel={overview.currentLevel}
        nextLevel={overview.nextLevel}
      />
    </div>
  );
};
