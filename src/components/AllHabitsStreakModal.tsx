import React from 'react';
import { 
  X, 
  Flame, 
  CheckCircle2, 
  AlertCircle, 
  Trophy, 
  Calendar, 
  Zap, 
  Sparkles,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Habit, Language } from '../types';
import { calculateAllHabitsStreak } from '../utils/habitMath';
import { formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';

interface AllHabitsStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  language: Language;
  onOpenStatsModal?: () => void;
}

export const AllHabitsStreakModal: React.FC<AllHabitsStreakModalProps> = ({
  isOpen,
  onClose,
  habits,
  language,
  onOpenStatsModal,
}) => {
  if (!isOpen) return null;

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const streakInfo = calculateAllHabitsStreak(habits);
  const todayStr = getTodayString();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        dir={isFa || isAr ? 'rtl' : 'ltr'}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Flame Banner */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white p-6 relative overflow-hidden shrink-0">
          {/* Subtle background glow */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-rose-400/20 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-yellow-200 flex items-center justify-center border border-white/30 shadow-lg shrink-0">
                <Flame className={`w-7 h-7 stroke-[2.5] ${streakInfo.currentStreak > 0 ? 'animate-pulse text-yellow-300' : 'text-white/80'}`} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isFa ? 'انضباط ۱۰۰٪ روزانه' : isAr ? 'سلسلة الالتزام الكامل' : '100% Daily Discipline'}
                </span>
                <h2 className="text-xl font-black text-white">
                  {isFa ? 'زنجیره متوالی تمام عادات' : isAr ? 'سلسلة إنجاز كافة العادات' : 'All-Habits Streak'}
                </h2>
              </div>
            </div>

            <button
              id="close-streak-modal-btn"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-white/15"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Big Streak Counter Display */}
          <div className="mt-6 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-1">
                <span>{formatNumber(streakInfo.currentStreak, language)}</span>
                <span className="text-lg sm:text-xl font-bold text-yellow-200">
                  {isFa ? 'روز' : isAr ? 'أيام' : 'Days'}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right flex flex-col items-end">
              <span className="text-xs text-yellow-100 font-semibold">
                {isFa ? 'وضعیت زنجیره:' : isAr ? 'حالة السلسلة:' : 'Streak Status:'}
              </span>
              <span className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                {streakInfo.isPerfectToday ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 fill-emerald-300/30" />
                    <span className="text-emerald-200">{isFa ? 'امروز ۱۰۰٪ تکمیل شد!' : isAr ? 'تم إنجاز كل العادات اليوم!' : '100% Done Today!'}</span>
                  </>
                ) : streakInfo.streakActiveYesterday ? (
                  <>
                    <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span className="text-yellow-100">{isFa ? 'فعال (در انتظار تکمیل امروز)' : isAr ? 'نشطة (بانتظار إتمام اليوم)' : 'Active (Complete today)'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-white/70" />
                    <span className="text-white/80">{isFa ? 'زنجیره بازنشانی شده' : isAr ? 'السلسلة صفرية حالياً' : 'Streak reset to 0'}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Today's Progress Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span>{isFa ? 'پیشرفت انجام عادات امروز' : isAr ? 'تقدم عادات اليوم' : "Today's Habit Progress"}</span>
              </span>
              <span className="text-orange-600 dark:text-orange-400">
                {formatNumber(streakInfo.doneTodayCount, language)} {isFa ? 'از' : isAr ? 'من' : 'of'} {formatNumber(streakInfo.totalHabitsCount, language)} ({formatNumber(streakInfo.completionPercentToday, language)}٪)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                  streakInfo.isPerfectToday 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                }`}
                style={{ width: `${streakInfo.completionPercentToday}%` }}
              />
            </div>

            {/* Subtext info */}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              {streakInfo.isPerfectToday 
                ? (isFa 
                    ? '🎉 تبریک! تمام عادات فعال شما در امروز تیک خورده‌اند و زنجیره شما حفظ شده است.' 
                    : isAr 
                    ? '🎉 رائع! تم إكمال جميع العادات اليوم والسلسلة مستمرة بنجاح.' 
                    : '🎉 Great job! All active habits are completed today and your streak is preserved.')
                : (isFa 
                    ? `هنوز ${formatNumber(streakInfo.totalHabitsCount - streakInfo.doneTodayCount, language)} عادت برای امروز باقی مانده است. برای حفظ یا تداوم زنجیره، همه آن‌ها را تیک بزنید.`
                    : isAr
                    ? `متبقي ${formatNumber(streakInfo.totalHabitsCount - streakInfo.doneTodayCount, language)} عادات اليوم. أكملها جميعاً للحفاظ على السلسلة.`
                    : `${formatNumber(streakInfo.totalHabitsCount - streakInfo.doneTodayCount, language)} habits remaining today. Complete all to maintain your streak.`)}
            </p>
          </div>

          {/* Stats Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Longest streak */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {isFa ? 'رکورد بیشترین زنجیره' : isAr ? 'أعلى رقم قياسي' : 'Longest Streak'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                {formatNumber(streakInfo.longestStreak, language)} {isFa ? 'روز' : isAr ? 'أيام' : 'days'}
              </span>
            </div>

            {/* Total perfect days in history */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                {isFa ? 'مجموع روزهای ۱۰۰٪' : isAr ? 'إجمالي الأيام الكاملة' : 'Total Perfect Days'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">
                {formatNumber(streakInfo.historicPerfectDaysCount, language)} {isFa ? 'روز' : isAr ? 'أيام' : 'days'}
              </span>
            </div>
          </div>

          {/* Strict Reset Rule Notice */}
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-rose-900 dark:text-rose-200 mb-0.5">
                {isFa ? 'قانون بازنشانی به صفر:' : isAr ? 'قاعدة إعادة التعيين للصفر:' : 'Strict Reset Rule:'}
              </strong>
              <span>
                {isFa 
                  ? 'این شاخص نشان‌دهنده انضباط کامل و بی‌نقص است؛ در صورتی که در طول یک روز حتی یکی از عادات را انجام ندهید، شمارش زنجیره فوراً صفر (Reset) خواهد شد.'
                  : isAr
                  ? 'يقيس هذا المؤشر الانضباط التام؛ إذا فاتك إنجاز ولو عادة واحدة في أي يوم، يتم إعادة تعيين العداد للصفر فوراً.'
                  : 'This metric measures absolute 100% discipline. Missing even a single habit on any day resets the consecutive streak back to zero.'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {onOpenStatsModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStatsModal();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isFa ? 'مشاهده در آمار و تحلیل' : isAr ? 'عرض في الإحصائيات' : 'View in Analytics'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-orange-600 hover:bg-slate-800 dark:hover:bg-orange-500 text-white text-xs font-bold transition cursor-pointer ms-auto shadow-md"
          >
            {isFa ? 'متوجه شدم' : isAr ? 'فهمت ذلك' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
