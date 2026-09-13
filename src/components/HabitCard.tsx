import React, { useState } from 'react';
import { 
  Check, 
  Trash2, 
  Droplets, 
  Activity, 
  BookOpen, 
  Sparkles, 
  Languages as LanguagesIcon, 
  Moon, 
  CheckSquare, 
  Flame,
  Info,
  Coins,
  Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Habit, Language } from '../types';
import { calculateHabitStats } from '../utils/habitMath';
import { translations, formatNumber } from '../utils/translations';
import { getCurrentWeekMatrixDays, getTodayString, formatDateStringToPersianShort } from '../utils/persianDate';

interface HabitCardProps {
  habit: Habit;
  language: Language;
  appearance?: any;
  onToggleDay: (habitId: string, dateStr: string) => void;
  onRequestDelete: (habit: Habit) => void;
  onOpenInfo?: () => void;
  onOpenPomodoro?: (habit: Habit) => void;
}

const ICONS_MAP: Record<string, React.ElementType> = {
  Droplets,
  Activity,
  BookOpen,
  Sparkles,
  Languages: LanguagesIcon,
  Moon,
  CheckSquare,
};

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  language,
  appearance,
  onToggleDay,
  onRequestDelete,
  onOpenInfo,
  onOpenPomodoro,
}) => {
  const [showInlineConfirm, setShowInlineConfirm] = useState(false);
  const t = translations[language];
  const todayStr = getTodayString();
  const stats = calculateHabitStats(habit, todayStr, language);
  const weekDays = getCurrentWeekMatrixDays(todayStr, language);
  const completedWeekCount = weekDays.filter((d) => !!habit.history[d.dateStr]).length;
  const weekProgressPercent = Math.round((completedWeekCount / 7) * 100);

  const IconComponent = (habit.iconName && ICONS_MAP[habit.iconName]) || Activity;

  // Days since start calculation
  const startDayTime = new Date(habit.createdAt || todayStr).getTime();
  const todayTime = new Date(todayStr).getTime();
  const daysSinceStart = Math.max(1, Math.round((todayTime - startDayTime) / (1000 * 3600 * 24)) + 1);

  const habitCoins = Math.min(10, Math.max(1, habit.rewardCoins ?? 10));
  const habitXp = Math.min(5, Math.max(1, habit.rewardXp ?? 5));

  const handleTodayToggle = () => {
    if (!stats.isDoneToday) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2563eb', '#10b981', '#f59e0b'],
          disableForReducedMotion: true,
        });
      } catch {
        // Safe fallback
      }
    }
    onToggleDay(habit.id, todayStr);
  };

  const formattedStartDays = t.startFromDaysAgo.replace('{n}', formatNumber(daysSinceStart, language));
  const formattedStreak = t.consecutiveStreak.replace('{n}', formatNumber(stats.currentStreak, language));
  const formattedRemainingDays = t.remainingDaysToGoal.replace('{n}', formatNumber(stats.remainingDays, language));
  const coinsWord = language === 'fa' ? 'سکه' : language === 'ar' ? 'عملة' : 'coins';

  return (
    <div 
      id={`habit-card-${habit.id}`}
      dir={t.dir}
      style={appearance?.cardBoxStyle}
      className={`p-5 rounded-2xl border relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200 flex flex-col justify-between shrink-0 ${
        appearance?.cardBoxClass || 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80'
      } ${appearance?.shadowClass || 'shadow-xs'}`}
    >
      {/* Action Buttons: Pomodoro & Delete (Left for RTL, Right for LTR) */}
      <div className={`absolute top-3.5 ${t.dir === 'rtl' ? 'left-3.5' : 'right-3.5'} z-10 flex items-center gap-1`}>
        {onOpenPomodoro && (
          <button
            id={`pomodoro-btn-habit-${habit.id}`}
            type="button"
            onClick={() => onOpenPomodoro(habit)}
            className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer opacity-70 group-hover:opacity-100 focus:opacity-100"
            title={t.pomodoroStartForHabit || 'شروع پومودورو برای این عادت'}
            aria-label="Start Pomodoro"
          >
            <Timer className="w-3.5 h-3.5" />
          </button>
        )}

        {showInlineConfirm ? (
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 p-1 rounded-xl text-xs shadow-sm animate-in fade-in">
            <span className="text-red-700 dark:text-red-300 font-bold px-1 text-[11px]">{t.deleteShortConfirm}</span>
            <button
              id={`confirm-delete-${habit.id}`}
              onClick={() => {
                setShowInlineConfirm(false);
                onRequestDelete(habit);
              }}
              className="px-2 py-0.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-[11px] font-bold cursor-pointer"
            >
              {t.yes}
            </button>
            <button
              onClick={() => setShowInlineConfirm(false)}
              className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition text-[11px] cursor-pointer"
            >
              {t.cancel}
            </button>
          </div>
        ) : (
          <button
            id={`delete-btn-${habit.id}`}
            onClick={() => onRequestDelete(habit)}
            className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all cursor-pointer opacity-70 group-hover:opacity-100 focus:opacity-100"
            title={t.deleteHabit}
            aria-label={t.deleteHabit}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div>
        {/* Top Header: Title, Days elapsed & Streak Pill */}
        <div className={`flex justify-between items-start mb-4 ${t.dir === 'rtl' ? 'pr-0.5 pl-14' : 'pl-0.5 pr-14'}`}>
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700/60"
              style={{ 
                backgroundColor: habit.color ? `${habit.color}15` : '#f1f5f9',
                color: habit.color || '#334155'
              }}
            >
              <IconComponent className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-base font-bold text-slate-800 dark:text-slate-100 block truncate">
                {habit.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 flex items-center flex-wrap gap-1">
                <span>{formattedStartDays}</span>
                {habit.category && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{habit.category}</span>
                  </>
                )}
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5" />
                  +{formatNumber(habitCoins, language)}
                </span>
                <span className="text-indigo-500 dark:text-indigo-400 font-semibold">
                  +{formatNumber(habitXp, language)} XP
                </span>
                {!!habit.totalFocusMinutes && habit.totalFocusMinutes > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded-md">
                      <Timer className="w-2.5 h-2.5" />
                      {formatNumber(habit.totalFocusMinutes, language)} {t.pomodoroMinuteShort}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 shrink-0 ${t.dir === 'rtl' ? 'mr-1' : 'ml-1'}`}>
            {stats.currentStreak > 0 && (
              <span className="bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-green-200/50 dark:border-green-800/40">
                <Flame className="w-3 h-3 fill-green-600 text-green-600 dark:fill-green-400 dark:text-green-400" />
                <span>{formattedStreak}</span>
              </span>
            )}
          </div>
        </div>

        {/* Score & Stage Indicator Row */}
        <div className="flex items-end justify-between mb-2">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tracking-tight ${stats.colorTheme.textColor}`} id={`score-${habit.id}`}>
                {t.automaticityRate.replace('{n}', formatNumber(stats.automaticity, language))}
              </span>
              {onOpenInfo && (
                <button
                  onClick={onOpenInfo}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5"
                  title={t.scientificFormulaBtn}
                >
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className={`text-[11px] font-bold ${stats.colorTheme.badgeText}`}>
              {stats.stageLabel}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {stats.remainingDays > 0 ? (
                formattedRemainingDays
              ) : (
                t.goalAchieved
              )}
            </span>
          </div>
        </div>

        {/* Sleek Linear Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700/60 h-2 rounded-full mb-5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${stats.colorTheme.progressBar}`}
            style={{ width: `${Math.max(3, stats.automaticity)}%` }}
          />
        </div>
      </div>

      <div>
        {/* Today Action Button */}
        <div className="mb-4">
          <button
            id={`toggle-today-${habit.id}`}
            onClick={handleTodayToggle}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              stats.isDoneToday
                ? 'bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
            }`}
          >
            {stats.isDoneToday ? (
              <>
                <span className="text-slate-600 dark:text-slate-200">{t.doneToday}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/70 border border-amber-300/40 dark:border-amber-700/40 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-amber-500" />
                  +{formatNumber(habitCoins, language)} {coinsWord}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                  +{formatNumber(habitXp, language)} XP
                </span>
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </>
            ) : (
              <>
                <span>{t.markDoneToday}</span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/25 border border-amber-400/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                  <Coins className="w-2.5 h-2.5 text-amber-300" />
                  +{formatNumber(habitCoins, language)} {coinsWord}
                </span>
                <span className="text-[10px] font-bold text-blue-100 bg-blue-700/60 px-1.5 py-0.5 rounded-md">
                  +{formatNumber(habitXp, language)} XP
                </span>
              </>
            )}
          </button>
        </div>

        {/* Sleek Compact Weekly Matrix (Saturday to Friday) */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
              {t.weeklyMatrix}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              ({formatNumber(completedWeekCount, language)}/۷)
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {weekDays.map((day) => {
              const isCompleted = !!habit.history[day.dateStr];
              const tooltipStatus = isCompleted 
                ? t.completed 
                : day.isToday 
                ? t.pendingToday 
                : day.isFuture 
                ? t.upcomingDay 
                : t.notCompleted;

              return (
                <div
                  key={day.dateStr}
                  id={`week-matrix-${habit.id}-${day.dateStr}`}
                  className="flex flex-col items-center gap-0.5"
                  title={`${day.weekdayFull} (${formatDateStringToPersianShort(day.dateStr)}) - ${tooltipStatus}`}
                >
                  <span className={`text-[8.5px] leading-tight select-none ${
                    day.isToday 
                      ? 'text-blue-600 dark:text-blue-400 font-bold' 
                      : day.isFriday 
                      ? 'text-amber-500/80 dark:text-amber-400/80 font-medium' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {day.weekdayShort}
                  </span>
                  
                  <div
                    className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-[10px] transition-all select-none ${
                      isCompleted
                        ? 'bg-emerald-500 text-white font-bold shadow-2xs shadow-emerald-500/20'
                        : day.isToday
                        ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-500 text-blue-600 dark:text-blue-400'
                        : day.isFuture
                        ? 'bg-slate-100/50 dark:bg-slate-850/40 border border-dashed border-slate-200/80 dark:border-slate-800'
                        : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-300 dark:text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : day.isToday ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
