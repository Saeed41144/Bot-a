import React, { useEffect } from 'react';
import {
  X,
  Trophy,
  Zap,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Brain,
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Crown,
  Sun,
  Star,
  Target,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Language, ThemeMode } from '../types';
import { formatNumber } from '../utils/translations';
import { getAllBrainLevels, BrainLevel, Achievement } from '../utils/achievements';
import { ResolvedAppearance } from '../utils/themeAppearance';

interface BrainLevelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentXp: number;
  currentLevel: BrainLevel;
  nextLevel: BrainLevel | null;
  achievements?: Achievement[];
  appearance?: ResolvedAppearance;
  onOpenAchievementsModal?: () => void;
}

export const BrainLevelsModal: React.FC<BrainLevelsModalProps> = ({
  isOpen,
  onClose,
  language,
  currentXp,
  currentLevel,
  nextLevel,
  achievements = [],
  appearance,
  onOpenAchievementsModal,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      try {
        window.addEventListener('keydown', handleKeyDown);
      } catch {}
    }
    return () => {
      try {
        window.removeEventListener('keydown', handleKeyDown);
      } catch {}
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;
  const levels = getAllBrainLevels(language);

  // Helper to render achievement mini-icon
  const renderAchievementIcon = (iconName: string, className: string = 'w-3.5 h-3.5') => {
    switch (iconName) {
      case 'Trophy': return <Trophy className={className} />;
      case 'Crown': return <Crown className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Shield': return <ShieldCheck className={className} />;
      case 'Sun': return <Sun className={className} />;
      case 'Star': return <Star className={className} />;
      case 'Brain': return <Brain className={className} />;
      default: return <Award className={className} />;
    }
  };

  return (
    <div
      id="brain-levels-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="brain-levels-modal-container"
        style={appearance?.modalBoxStyle}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-2xl text-white overflow-hidden my-auto max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with gradient & glow */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/80 border-b border-slate-800 shrink-0">
          {/* Close button */}
          <button
            id="close-brain-levels-modal-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 rtl:left-auto rtl:right-4 w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-slate-700/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5 pr-10 rtl:pr-0 rtl:pl-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {isFa ? 'نقشه جامع ۱۵ سطح تسلط مغزی' : isAr ? 'خريطة المستويات الـ 15 للسيطرة الدماغية' : 'Comprehensive 15-Level Brain Mastery Map'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {isFa ? 'سطوح تکامل عصب‌شناختی و شرایط پیش‌نیاز' : isAr ? 'مستويات التطور العصبي والشروط المسبقة' : 'Neuroplastic Evolution Levels & Prerequisites'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {isFa
                  ? 'سطوح ۱ تا ۱۲ بر پایه XP هستند؛ سطوح افسانه‌ای ۱۳ تا ۱۵ نیازمند XP و بازگشایی دستاوردهای دشوار پیش‌نیاز می‌باشند.'
                  : isAr
                  ? 'المستويات ۱-۱۲ تعتمد على XP، والمستويات الأسطورية ۱۳-۱۵ تتطلب نقاط XP وشروط إنجازات مسبقة.'
                  : 'Levels 1–12 are XP-driven; Legendary tiers 13–15 require both high XP and milestone prerequisite achievements.'}
              </p>
            </div>
          </div>

          {/* Current user status highlight card */}
          <div className="mt-4 p-3.5 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentLevel.badgeColor} text-white flex items-center justify-center font-black text-sm shadow-md shrink-0`}>
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">
                  {isFa ? 'سطح و رتبه فعلی شما' : isAr ? 'مستواك الحالي' : 'Your Current Level'}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  {currentLevel.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
                <div>
                  <span className="text-[9px] text-amber-200/80 block uppercase font-bold">
                    {isFa ? 'مجموع XP کسب‌شده' : isAr ? 'إجمالي XP' : 'Total XP'}
                  </span>
                  <span className="text-xs font-black text-amber-300">
                    {formatNumber(currentXp, language)} XP
                  </span>
                </div>
              </div>

              {nextLevel && (
                <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-indigo-200/80 block uppercase font-bold">
                      {isFa ? 'هدف سطح بعدی' : isAr ? 'للمستوى التالي' : 'Next Tier Goal'}
                    </span>
                    <span className="text-xs font-black text-indigo-300">
                      {formatNumber(nextLevel.minXp, language)} XP
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Levels Roadmap List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 custom-scrollbar">
          {levels.map((level) => {
            const hasPrerequisites = !!level.requiredAchievementIds && level.requiredAchievementIds.length > 0;
            
            // Analyze prerequisite achievements for this level
            const requiredAchievements = hasPrerequisites
              ? level.requiredAchievementIds!.map((reqId) => {
                  const found = achievements.find((a) => a.id === reqId);
                  return found || {
                    id: reqId,
                    title: reqId,
                    description: '',
                    icon: 'Award',
                    category: 'neuroscience',
                    tier: 'diamond',
                    xp: 500,
                    targetValue: 1,
                    currentValue: 0,
                    unlocked: false,
                    progressPercent: 0,
                    criteriaLabel: '',
                  };
                })
              : [];

            const allPrerequisitesMet = !hasPrerequisites || requiredAchievements.every((a) => a.unlocked);
            const completedPrereqCount = requiredAchievements.filter((a) => a.unlocked).length;
            const totalPrereqCount = requiredAchievements.length;

            const isCurrent = currentLevel.level === level.level;
            const hasEnoughXp = currentXp >= level.minXp;
            const isCompleted = currentXp >= level.maxXp && allPrerequisitesMet;
            const isBlockedByPrereq = hasEnoughXp && !allPrerequisitesMet;
            const isLocked = !hasEnoughXp || !allPrerequisitesMet;

            const xpNeededToPass = level.maxXp;
            const xpNeededToEnter = level.minXp;
            const remainingToPass = Math.max(0, level.maxXp - currentXp);
            const remainingToEnter = Math.max(0, level.minXp - currentXp);

            // Progress within this specific level
            let levelProgress = 0;
            if (isCompleted) {
              levelProgress = 100;
            } else if (hasEnoughXp && allPrerequisitesMet) {
              const range = level.maxXp - level.minXp;
              const gained = currentXp - level.minXp;
              levelProgress = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
            } else if (hasEnoughXp && !allPrerequisitesMet) {
              // User has XP but blocked by achievements
              levelProgress = Math.min(100, Math.round((completedPrereqCount / Math.max(1, totalPrereqCount)) * 100));
            }

            return (
              <div
                key={level.level}
                id={`level-card-tier-${level.level}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-slate-850 via-indigo-950/50 to-slate-850 border-amber-400/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/40'
                    : isCompleted
                    ? 'bg-slate-950/70 border-emerald-500/35 hover:border-emerald-500/60'
                    : isBlockedByPrereq
                    ? 'bg-gradient-to-r from-slate-950 via-rose-950/30 to-slate-950 border-rose-500/40 ring-1 ring-rose-500/20'
                    : hasPrerequisites
                    ? 'bg-slate-950/50 border-purple-800/40 opacity-90 hover:opacity-100'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                  {/* Left: Badge & Titles */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${level.badgeColor} text-white flex items-center justify-center font-black text-base shadow-md shrink-0 relative mt-0.5`}
                    >
                      <span>{formatNumber(level.level, language)}</span>
                      {isCompleted && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                      {isBlockedByPrereq && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shadow animate-pulse">
                          <ShieldAlert className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      )}
                      {isLocked && !isBlockedByPrereq && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shadow">
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                          {level.title}
                        </h3>

                        {/* Status Chip */}
                        {isCompleted && (
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {isFa ? 'گذرانده شده' : isAr ? 'تم الاجتياز' : 'Mastered'}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] bg-amber-400/20 text-amber-300 font-black px-2 py-0.5 rounded-md border border-amber-400/40 flex items-center gap-1 animate-pulse">
                            <Zap className="w-3 h-3 fill-amber-300" />
                            {isFa ? 'سطح فعال شما' : isAr ? 'مستواك الحالي' : 'Active Tier'}
                          </span>
                        )}
                        {isBlockedByPrereq && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-md border border-rose-500/40 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            {isFa ? 'نیازمند دستاوردها' : isAr ? 'يتطلب إنجازات' : 'Needs Achievements'}
                          </span>
                        )}
                        {isLocked && !isBlockedByPrereq && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {isFa ? 'قفل شده' : isAr ? 'مغلق' : 'Locked'}
                          </span>
                        )}

                        {hasPrerequisites && (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-md border border-purple-500/30 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" />
                            {isFa ? 'سطح مشروط' : isAr ? 'مستوى مشروط' : 'Conditioned Tier'}
                          </span>
                        )}
                      </div>

                      {/* XP requirement description */}
                      <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1">
                          <strong className="text-slate-400">{isFa ? 'ورود به سطح:' : isAr ? 'الدخول:' : 'Entry:'}</strong>
                          <span className="text-amber-300 font-semibold">{formatNumber(xpNeededToEnter, language)} XP</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1">
                          <strong className="text-slate-400">{isFa ? 'سقف پایان سطح:' : isAr ? 'سقف المستوى:' : 'Tier Cap:'}</strong>
                          <span className="text-emerald-400 font-bold">{formatNumber(xpNeededToPass, language)} XP</span>
                        </span>
                      </div>

                      {/* Level Scientific Description */}
                      {level.description && (
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          {level.description}
                        </p>
                      )}

                      {/* Level Perk */}
                      {level.perk && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-amber-300/90 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md font-medium">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{isFa ? 'دست‌آورد نورونی:' : isAr ? 'الميزة العصبية:' : 'Neural Perk:'} {level.perk}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Remaining XP info / Status badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between text-right shrink-0">
                    {isCompleted && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        {isFa ? '۱۰۰٪ تکمیل شده' : isAr ? '۱۰۰٪ مكتمل' : '100% Mastered'}
                      </span>
                    )}

                    {isCurrent && (
                      <div className="text-right rtl:text-left sm:rtl:text-right">
                        <span className="text-[10px] text-slate-300 block">
                          {isFa ? 'باقی‌مانده تا سقف:' : isAr ? 'المتبقي للسقف:' : 'Remaining to pass:'}
                        </span>
                        <span className="text-xs font-black text-amber-300">
                          {formatNumber(remainingToPass, language)} XP
                        </span>
                      </div>
                    )}

                    {isLocked && !isBlockedByPrereq && (
                      <div className="text-right rtl:text-left sm:rtl:text-right">
                        <span className="text-[10px] text-slate-400 block">
                          {isFa ? 'XP مانده تا ورود:' : isAr ? 'المتبقي لفتح المستوى:' : 'To unlock:'}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {formatNumber(remainingToEnter, language)} XP
                        </span>
                      </div>
                    )}

                    {isBlockedByPrereq && (
                      <div className="text-right rtl:text-left sm:rtl:text-right">
                        <span className="text-[10px] text-rose-300 font-bold block">
                          {isFa ? 'شرط بازگشایی:' : isAr ? 'شرط الفتح:' : 'Unlock criteria:'}
                        </span>
                        <span className="text-xs font-bold text-rose-400">
                          {formatNumber(completedPrereqCount, language)} / {formatNumber(totalPrereqCount, language)} {isFa ? 'دستاورد' : isAr ? 'إنجاز' : 'Badges'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PREREQUISITE ACHIEVEMENTS SECTION (For Levels 13, 14, 15) */}
                {hasPrerequisites && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{isFa ? 'دستاوردهای پیش‌نیاز الزامی برای بازگشایی این سطح:' : isAr ? 'الإنجازات المطلوبة لفتح هذا المستوى:' : 'Prerequisite Achievements Required:'}</span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                        allPrerequisitesMet 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {formatNumber(completedPrereqCount, language)} / {formatNumber(totalPrereqCount, language)} {allPrerequisitesMet ? '✅' : '🔒'}
                      </span>
                    </div>

                    {/* Requirements Badges Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {requiredAchievements.map((reqAch) => (
                        <div
                          key={reqAch.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            reqAch.unlocked
                              ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                              : 'bg-slate-900/90 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              reqAch.unlocked
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                              {renderAchievementIcon(reqAch.icon, 'w-3.5 h-3.5')}
                            </div>
                            <div className="min-w-0">
                              <span className={`text-xs font-bold block truncate ${
                                reqAch.unlocked ? 'text-white' : 'text-slate-300'
                              }`}>
                                {reqAch.title}
                              </span>
                              {reqAch.criteriaLabel && (
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {reqAch.criteriaLabel}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {reqAch.unlocked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                {isFa ? 'تکمیل' : isAr ? 'مكتمل' : 'Done'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <Lock className="w-2.5 h-2.5" />
                                {isFa ? 'قفل' : isAr ? 'مغلق' : 'Locked'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Blockage Alert Banner if XP is ready but achievements are missing */}
                    {isBlockedByPrereq && (
                      <div className="mt-2.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            {isFa
                              ? 'امتیاز XP کافی دارید، اما تا زمان تکمیل تمام دستاوردهای بالا، ورود به این سطح امکان‌پذیر نیست.'
                              : isAr
                              ? 'لديك نقاط كافية، ولكن لا يمكنك فتح هذا المستوى حتى إكمال الإنجازات المذكورة أعلاه.'
                              : 'You have enough XP, but level cannot be unlocked until all prerequisite badges above are achieved.'}
                          </span>
                        </div>
                        {onOpenAchievementsModal && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenAchievementsModal();
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer transition shadow-xs"
                          >
                            {isFa ? 'مشاهده دستاوردها 🏆' : isAr ? 'عرض الإنجازات' : 'View Badges'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Level Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span>
                      {isCompleted
                        ? (isFa ? 'تسلط کامل به مدارات این سطح' : 'Tier fully mastered')
                        : isCurrent
                        ? (isFa ? `پیشرفت در این سطح: ${formatNumber(levelProgress, language)}٪` : `Tier Progress: ${levelProgress}%`)
                        : isBlockedByPrereq
                        ? (isFa ? `پیش‌نیازهای باز شده: ${formatNumber(completedPrereqCount, language)} از ${formatNumber(totalPrereqCount, language)}` : `Prerequisites: ${completedPrereqCount} / ${totalPrereqCount}`)
                        : (isFa ? 'در انتظار کسب امتیاز لازم' : 'Awaiting required XP')}
                    </span>
                    <span>
                      {formatNumber(Math.min(level.maxXp, Math.max(level.minXp, currentXp)), language)} / {formatNumber(level.maxXp, language)} XP
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isCurrent
                          ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                          : isBlockedByPrereq
                          ? 'bg-gradient-to-r from-purple-500 to-rose-500'
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with XP acquisition Guide & Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {isFa
                ? 'کسب XP: هر ثبت عادت (+۵ XP) و بازگشایی دستاوردها (+۵۰ تا +۲۰۰۰ XP)'
                : isAr
                ? 'كسب النقاط: كل إنجاز للعادة (+٥ XP) وفتح الإنجازات (+٥٠ إلى +۲۰۰۰ XP)'
                : 'Gain XP: Habit check-ins (+5 XP) and achievement unlocks (+50 to +2000 XP)'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenAchievementsModal && (
              <button
                id="brain-levels-modal-view-achievements-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAchievementsModal();
                }}
                className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Award className="w-4 h-4" />
                <span>{isFa ? 'مشاهده تالار دستاوردها' : isAr ? 'معرض الإنجازات' : 'View Achievements'}</span>
              </button>
            )}

            <button
              id="brain-levels-modal-close-bottom-btn"
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer border border-slate-700"
            >
              {isFa ? 'بستن' : isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

