import React, { useState, useMemo } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Timer,
  Send,
  Sparkles,
  Zap,
  Calendar,
  Layers,
  Award,
  Check,
  Search,
  Copy,
  Activity,
  Target,
  Brain,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckSquare,
  CalendarDays,
  Repeat,
  Coins,
  AlertCircle,
  ListTodo,
  Tag,
  Trophy,
  ArrowUpDown,
  Filter,
  CheckCircle,
  HelpCircle,
  CalendarRange
} from 'lucide-react';
import { Habit, Task, Language, ThemeMode, TelegramConfig, AIConfigurationSettings, PomodoroTargetType } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { calculateHabitStats, calculateAllHabitsStreak } from '../utils/habitMath';
import {
  getTodayString,
  formatDateStringToPersianShort,
  formatDateStringToPersian,
  getRelativeDueDateInfo,
  toPersianDigits
} from '../utils/persianDate';
import { safeClipboardCopy } from '../utils/safeDom';
import { getStoredSectionAIKeys } from '../utils/aiKeyManager';
import { YearlyMatrixView } from './YearlyMatrixView';
import { TasksAnalyticsModalTab } from './TasksAnalyticsModalTab';
import { PomodoroAnalyticsTab } from './PomodoroAnalyticsTab';
import {
  getPomodoroSessions,
  formatPomodoroDuration,
  PomodoroSessionRecord,
} from '../utils/pomodoroStorage';
import { getArchivedHabits, getArchivedTasks } from '../utils/archivedEntitiesStorage';
import { CompletionHistorySection, CompletionHistoryItem } from './CompletionHistorySection';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  tasks?: Task[];
  language: Language;
  theme: ThemeMode;
  telegramConfig: TelegramConfig;
  aiConfig?: AIConfigurationSettings;
  onOpenAIReport: () => void;
  onOpenPomodoroModal?: (targetType?: PomodoroTargetType, targetId?: string) => void;
}

type TabType = 'overview' | 'individual' | 'matrix' | 'recurringTasks' | 'pomodoro' | 'yearlyMatrix' | 'curve';
type SortField = 'auto' | 'streak' | 'completions' | 'pending';
type RecurringSortField = 'streak' | 'due' | 'reward' | 'name';
type RecurringFilterType = 'all' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  habits,
  tasks = [],
  language,
  theme,
  telegramConfig,
  aiConfig,
  onOpenAIReport,
  onOpenPomodoroModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedHabitId, setSelectedHabitId] = useState<string>(habits[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('auto');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Recurring Tasks Filter & Sort States
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringFilter, setRecurringFilter] = useState<RecurringFilterType>('all');
  const [recurringSort, setRecurringSort] = useState<RecurringSortField>('streak');

  const t = translations[language];
  const todayStr = getTodayString();
  const isRtl = t.dir === 'rtl';
  const isDark = theme === 'dark';

  // Extract recurring tasks
  const recurringTasks = useMemo(() => {
    return tasks.filter((t) => t.isRecurring);
  }, [tasks]);

  // Aggregate metrics for recurring tasks
  const recurringStats = useMemo(() => {
    const totalCount = recurringTasks.length;
    const totalCyclesCompleted = recurringTasks.reduce((acc, t) => acc + (t.recurringStreak || 0), 0);
    const totalCoinsEarned = recurringTasks.reduce((acc, t) => acc + ((t.recurringStreak || 0) * (t.rewardCoins ?? 5)), 0);
    const totalXpEarned = recurringTasks.reduce((acc, t) => acc + ((t.recurringStreak || 0) * (t.rewardXp ?? 2)), 0);
    
    const dueTodayCount = recurringTasks.filter((t) => t.dueDate === todayStr).length;
    const overdueCount = recurringTasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.completed).length;

    const topTask = recurringTasks.length > 0
      ? [...recurringTasks].sort((a, b) => (b.recurringStreak || 0) - (a.recurringStreak || 0))[0]
      : null;

    return {
      totalCount,
      totalCyclesCompleted,
      totalCoinsEarned,
      totalXpEarned,
      dueTodayCount,
      overdueCount,
      topTask,
    };
  }, [recurringTasks, todayStr]);

  // Filtered & Sorted Recurring Tasks
  const filteredAndSortedRecurringTasks = useMemo(() => {
    let list = [...recurringTasks];

    // Search query
    if (recurringSearch.trim()) {
      const q = recurringSearch.toLowerCase();
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Recurrence Type Filter
    if (recurringFilter !== 'all') {
      list = list.filter((t) => t.recurrence?.type === recurringFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (recurringSort === 'streak') {
        return (b.recurringStreak || 0) - (a.recurringStreak || 0);
      }
      if (recurringSort === 'due') {
        const dateA = a.dueDate || '9999-99-99';
        const dateB = b.dueDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (recurringSort === 'reward') {
        return ((b.rewardCoins ?? 5) * (b.recurringStreak || 0)) - ((a.rewardCoins ?? 5) * (a.recurringStreak || 0));
      }
      if (recurringSort === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [recurringTasks, recurringSearch, recurringFilter, recurringSort]);

  // Retrieve archived habits with history
  const archivedHabits = useMemo(() => {
    return getArchivedHabits();
  }, [isOpen]);

  // Combined list of active + archived habits for deep historical analysis
  const allHistoricalHabits = useMemo(() => {
    const activeIds = new Set(habits.map((h) => h.id));
    const archivedOnly = archivedHabits
      .filter((rec) => !activeIds.has(rec.habit.id) && rec.hasHistoricalLogs)
      .map((rec) => ({
        ...rec.habit,
        isArchived: true,
      }));
    return [...habits, ...archivedOnly];
  }, [habits, archivedHabits]);

  // Calculate detailed stats for all habits unconditionally
  const habitStatsList = useMemo(() => {
    return allHistoricalHabits.map((h) => {
      const stats = calculateHabitStats(h, todayStr, language);
      
      const createdDate = new Date(h.createdAt || todayStr);
      const todayDate = new Date(todayStr);
      const daysSinceCreation = Math.max(
        1,
        Math.round((todayDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)) + 1
      );
      const consistencyRate = Math.min(100, Math.round((stats.totalCompletedDays / daysSinceCreation) * 100));

      return {
        habit: h,
        stats,
        daysSinceCreation,
        consistencyRate,
      };
    });
  }, [allHistoricalHabits, todayStr, language]);

  // Ensure selected habit is valid
  const currentSelectedHabit = useMemo(() => {
    const found = habitStatsList.find((item) => item.habit.id === selectedHabitId);
    return found || habitStatsList[0] || null;
  }, [habitStatsList, selectedHabitId]);

  // Aggregate Metrics
  const totalHabits = habits.length;
  const doneTodayCount = habitStatsList.filter((item) => item.stats.isDoneToday).length;
  const pendingTodayCount = totalHabits - doneTodayCount;
  const todayCompletionPct = totalHabits > 0 ? Math.round((doneTodayCount / totalHabits) * 100) : 0;

  const totalAutomaticity = habitStatsList.reduce((acc, item) => acc + item.stats.automaticity, 0);
  const avgAutomaticity = totalHabits > 0 ? Math.round(totalAutomaticity / totalHabits) : 0;

  const totalCompletedDaysSum = habitStatsList.reduce((acc, item) => acc + item.stats.totalCompletedDays, 0);
  const maxCurrentStreak = habitStatsList.length > 0 ? Math.max(...habitStatsList.map((item) => item.stats.currentStreak)) : 0;
  const topStreakHabit = habitStatsList.find((item) => item.stats.currentStreak === maxCurrentStreak);

  // 100% All-habits consecutive streak calculation
  const allHabitsStreak = useMemo(() => calculateAllHabitsStreak(habits, todayStr), [habits, todayStr]);

  // Stages count
  const automaticCount = habitStatsList.filter((item) => item.stats.stage === 'automatic').length;
  const semiCount = habitStatsList.filter((item) => item.stats.stage === 'semi').length;
  const formingCount = habitStatsList.filter((item) => item.stats.stage === 'forming').length;

  // 7-day completion velocity calculation
  const last7DaysVelocity = useMemo(() => {
    const dates: { date: string; label: string; count: number; total: number; pct: number }[] = [];
    const today = new Date(todayStr);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      
      const dayCompletions = habits.filter((h) => !!h.history[dateKey]).length;
      const pct = totalHabits > 0 ? Math.round((dayCompletions / totalHabits) * 100) : 0;
      
      const dayName = d.toLocaleDateString(
        language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar-SA' : 'en-US',
        { weekday: 'short' }
      );

      dates.push({
        date: dateKey,
        label: dayName,
        count: dayCompletions,
        total: totalHabits,
        pct,
      });
    }
    return dates;
  }, [habits, todayStr, totalHabits, language]);

  // 30-day History Grid for Selected Habit in Individual Tab
  const selectedHabit30Days = useMemo(() => {
    if (!currentSelectedHabit) return [];
    const days: { date: string; dayNum: number; isDone: boolean; dateLabel: string }[] = [];
    const today = new Date(todayStr);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const isDone = !!currentSelectedHabit.habit.history[dateKey];
      const dateLabel = d.toLocaleDateString(
        language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar-SA' : 'en-US',
        { month: 'numeric', day: 'numeric' }
      );

      days.push({
        date: dateKey,
        dayNum: 30 - i,
        isDone,
        dateLabel,
      });
    }
    return days;
  }, [currentSelectedHabit, todayStr, language]);

  // Pomodoro Focus Sessions for the Selected Habit
  const allPomodoroSessions = useMemo(() => {
    return getPomodoroSessions();
  }, [isOpen]);

  const selectedHabitSessions = useMemo(() => {
    if (!currentSelectedHabit) return [];
    const habitId = currentSelectedHabit.habit.id;
    const habitName = currentSelectedHabit.habit.name;

    return allPomodoroSessions.filter(
      (ses) =>
        (ses.targetType === 'habit' && (ses.targetId === habitId || ses.targetName === habitName)) ||
        ses.targetId === habitId ||
        ses.targetName === habitName
    );
  }, [allPomodoroSessions, currentSelectedHabit]);

  const selectedHabitFocusStats = useMemo(() => {
    const totalSessions = selectedHabitSessions.length;
    const completed25MinSessions = selectedHabitSessions.filter(
      (s) => s.isCompletedFull || s.durationMinutes >= 25
    ).length;
    const partialSessions = totalSessions - completed25MinSessions;

    const totalSeconds = selectedHabitSessions.reduce((acc, s) => {
      const sec = typeof s.durationSeconds === 'number' && s.durationSeconds > 0
        ? s.durationSeconds
        : (s.durationMinutes || 0) * 60;
      return acc + sec;
    }, 0);

    const totalMinutes = Math.floor(totalSeconds / 60);
    const coinsEarned = selectedHabitSessions.reduce((acc, s) => acc + (s.rewardCoinsEarned || 0), 0);

    return {
      totalSessions,
      completed25MinSessions,
      partialSessions,
      totalSeconds,
      totalMinutes,
      coinsEarned,
    };
  }, [selectedHabitSessions]);

  // Filtered & Sorted Habit List for Matrix View
  const filteredAndSortedHabits = useMemo(() => {
    let list = [...habitStatsList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.habit.name.toLowerCase().includes(q) ||
          (item.habit.category && item.habit.category.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'auto') {
        return b.stats.automaticity - a.stats.automaticity;
      }
      if (sortBy === 'streak') {
        return b.stats.currentStreak - a.stats.currentStreak;
      }
      if (sortBy === 'completions') {
        return b.stats.totalCompletedDays - a.stats.totalCompletedDays;
      }
      if (sortBy === 'pending') {
        if (!a.stats.isDoneToday && b.stats.isDoneToday) return -1;
        if (a.stats.isDoneToday && !b.stats.isDoneToday) return 1;
        return b.stats.automaticity - a.stats.automaticity;
      }
      return 0;
    });

    return list;
  }, [habitStatsList, searchQuery, sortBy]);

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `📊 ${t.statsModalTitle}\n📅 ${todayStr}\n\n` +
      `• ${t.statsTodayRate}: ${todayCompletionPct}% (${doneTodayCount}/${totalHabits})\n` +
      `• ${t.statsAvgAuto}: ${avgAutomaticity}%\n` +
      `• ${t.statsTopStreak}: ${maxCurrentStreak} ${language === 'fa' ? 'روز' : 'days'}\n` +
      `• ${t.statsTotalCompletions}: ${totalCompletedDaysSum}\n\n` +
      habitStatsList
        .map(
          (item) =>
            `- ${item.habit.name}: ${item.stats.automaticity}% | 🔥 ${item.stats.currentStreak}d | ${item.stats.isDoneToday ? '✅' : '⏳'}`
        )
        .join('\n');

    safeClipboardCopy(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Send Stats to Telegram
  const handleSendStatsToTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setTelegramStatus(
        language === 'fa'
          ? 'لطفاً ابتدا در بخش تنظیمات، توکن ربات و شناسه چت را وارد کنید.'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة في الإعدادات أولاً.'
          : 'Please set your Bot Token and Chat ID in Settings first.'
      );
      return;
    }

    setIsSendingTelegram(true);
    setTelegramStatus(null);

    const habitsSummary = habitStatsList.map(({ habit, stats, consistencyRate }) => ({
      name: habit.name,
      category: habit.category,
      automaticity: stats.automaticity,
      stage: stats.stage,
      stageLabel: stats.stageLabel,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalCompletedDays: stats.totalCompletedDays,
      isDoneToday: stats.isDoneToday,
      remainingDays: stats.remainingDays,
      consistencyRate,
    }));

    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitsSummary,
          language,
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          sendToTelegram: true,
          dateFormatted: todayStr,
          aiKeys: aiConfig?.analyticsAI?.keys || getStoredSectionAIKeys('analyticsAI'),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.telegramSent) {
          setTelegramStatus(
            language === 'fa'
              ? '✅ آمار و تحلیل جامع عادات با موفقیت به تلگرام ارسال شد!'
              : language === 'ar'
              ? '✅ تم إرسال الإحصائيات الشاملة للعادات بنجاح إلى تلغرام!'
              : '✅ Comprehensive habit stats successfully sent to Telegram!'
          );
        } else {
          setTelegramStatus(data.telegramError || t.sendToTelegramFailed);
        }
      } else {
        setTelegramStatus(data.error || 'خطا در ارسال آمار به تلگرام');
      }
    } catch (err: any) {
      setTelegramStatus(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  // Render nothing if modal is not open
  if (!isOpen) return null;

  return (
    <div
      id="stats-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir={t.dir}
        className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden"
      >
        {/* Modern Modal Header - Solid Dark Theme */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {t.statsModalTitle}
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
                  {formatNumber(totalHabits, language)} {language === 'fa' ? 'عادت' : 'habits'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.statsModalSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy stats summary button */}
            <button
              id="copy-stats-summary-btn"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title={t.statsCopySummary}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{t.statsCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">{t.statsCopySummary}</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              id="close-stats-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Tabs Switcher - Pure Dark Design */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-800 bg-slate-900 dark:bg-slate-950 flex items-center gap-1.5 sm:gap-3 overflow-x-auto">
          {/* Tab 1: Overview */}
          <button
            id="tab-stats-overview"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'text-blue-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{t.tabOverview}</span>
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Tab 2: Individual Habit Breakdown */}
          <button
            id="tab-stats-individual"
            onClick={() => setActiveTab('individual')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'individual'
                ? 'text-purple-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>{t.tabIndividual}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/80">
              {language === 'fa' ? 'تفکیکی' : 'Detailed'}
            </span>
            {activeTab === 'individual' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>

          {/* Tab 3: Habits Matrix */}
          <button
            id="tab-stats-matrix"
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'text-blue-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.tabHabitsMatrix}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {formatNumber(habits.length, language)}
            </span>
            {activeTab === 'matrix' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Tab 4: Tasks Analytics (One-time & Recurring) */}
          <button
            id="tab-stats-recurring-tasks"
            onClick={() => setActiveTab('recurringTasks')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recurringTasks'
                ? 'text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>{language === 'fa' ? 'آمار و تحلیل تسک‌ها' : t.tabRecurringTasks}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${
              activeTab === 'recurringTasks'
                ? 'bg-indigo-900/90 text-indigo-200 border-indigo-700'
                : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
            }`}>
              {formatNumber(tasks.length, language)}
            </span>
            {activeTab === 'recurringTasks' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          {/* Tab 5: Pomodoro & Focus Analytics */}
          <button
            id="tab-stats-pomodoro"
            onClick={() => setActiveTab('pomodoro')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pomodoro'
                ? 'text-amber-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>{language === 'fa' ? '🍅 تمرکز و پومودورو' : language === 'ar' ? '🍅 التركيز وبومودورو' : '🍅 Focus & Pomodoro'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
              {language === 'fa' ? 'آمار عمیق' : 'Deep'}
            </span>
            {activeTab === 'pomodoro' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          {/* Tab 6: 52-Week Yearly Matrix */}
          <button
            id="tab-stats-yearly-matrix"
            onClick={() => setActiveTab('yearlyMatrix')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'yearlyMatrix'
                ? 'text-emerald-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.tabYearlyMatrix}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
              {language === 'fa' ? '۵۲ هفته' : '52w'}
            </span>
            {activeTab === 'yearlyMatrix' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>

          {/* Tab 5: 66-Day Curve */}
          <button
            id="tab-stats-curve"
            onClick={() => setActiveTab('curve')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'curve'
                ? 'text-purple-400 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>{t.tabGrowthCurve}</span>
            {activeTab === 'curve' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Modal Body Content - Clean Dark Surface */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 bg-slate-900 dark:bg-slate-950">
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW & KPIS */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Top Hero Duo Cards - Dark Themed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hero Card 1: Automaticity Dial */}
                <div className="p-5 rounded-3xl bg-slate-800/90 border border-slate-750 flex items-center gap-5">
                  {/* Radial Score Visual */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-700"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-purple-400 transition-all duration-700 ease-out"
                        strokeDasharray={`${avgAutomaticity}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white">
                        {formatNumber(avgAutomaticity, language)}٪
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {t.statsAvgAuto}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      {avgAutomaticity >= 70
                        ? t.stageAutomatic
                        : avgAutomaticity >= 40
                        ? t.stageSemi
                        : t.stageForming}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {language === 'fa'
                        ? 'میانگین ضریب ناخودآگاه‌سازی عصبی عادات شما بر اساس فرمول تجربی دکتر لالی (۲۰۱۰).'
                        : 'Overall neural automaticity index calculated across all active habits.'}
                    </p>
                  </div>
                </div>

                {/* Hero Card 2: Today's Completion Score */}
                <div className="p-5 rounded-3xl bg-slate-800/90 border border-slate-750 flex items-center gap-5">
                  {/* Radial Progress Visual */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-700"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-400 transition-all duration-700 ease-out"
                        strokeDasharray={`${todayCompletionPct}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white">
                        {formatNumber(todayCompletionPct, language)}٪
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t.statsTodayRate}
                    </span>
                    <h3 className="text-base font-black text-white mt-1">
                      {formatNumber(doneTodayCount, language)} {language === 'fa' ? 'از' : 'of'} {formatNumber(totalHabits, language)} {language === 'fa' ? 'عادت انجام شد' : 'completed'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {pendingTodayCount === 0 && totalHabits > 0
                        ? (language === 'fa' ? '🎉 تمام عادات امروز تکمیل شده‌اند.' : 'All habits completed today!')
                        : `${formatNumber(pendingTodayCount, language)} ${language === 'fa' ? 'عادت باقی‌مانده برای ثبت امروز' : 'habits left for today'}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* All Habits 100% Streak Banner */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-950/50 via-amber-950/30 to-slate-900 border border-orange-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0">
                    <Flame className={`w-6 h-6 ${allHabitsStreak.currentStreak > 0 ? 'animate-pulse text-orange-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-400">
                        {language === 'fa' ? 'زنجیره متوالی تمام عادات (۱۰۰٪ کامل)' : language === 'ar' ? 'سلسلة إنجاز كافة العادات ۱۰۰٪' : '100% All-Habits Streak'}
                      </span>
                      {allHabitsStreak.isPerfectToday && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {language === 'fa' ? 'امروز کامل شد' : 'Done Today'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {language === 'fa' 
                        ? 'در صورت عدم انجام تمام عادات در هر روز، این شمارنده به صفر برمی‌گردد.'
                        : 'Missing any habit on any day resets this counter to 0.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <div className="text-right sm:text-left">
                    <span className="text-[10px] uppercase text-orange-300/80 font-bold block">
                      {language === 'fa' ? 'شمارش فعلی' : 'Current Streak'}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-orange-400">
                      {formatNumber(allHabitsStreak.currentStreak, language)} <span className="text-sm font-bold text-slate-400">{language === 'fa' ? 'روز' : 'days'}</span>
                    </span>
                  </div>

                  <div className="h-9 w-px bg-slate-700 mx-1 hidden sm:block" />

                  <div className="text-right sm:text-left hidden sm:block">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">
                      {language === 'fa' ? 'رکورد تاریخی' : 'Best Streak'}
                    </span>
                    <span className="text-lg font-black text-white">
                      {formatNumber(allHabitsStreak.longestStreak, language)} {language === 'fa' ? 'روز' : 'd'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Essential Metric Tiles - Solid Dark Theme */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{t.statsTotalHabits}</span>
                    <Layers className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-2xl font-black text-white">
                    {formatNumber(totalHabits, language)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {formatNumber(doneTodayCount, language)} {t.doneToday}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{t.statsTopStreak}</span>
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    {formatNumber(maxCurrentStreak, language)} <span className="text-xs text-slate-400 font-bold">{language === 'fa' ? 'روز' : 'd'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 truncate">
                    {topStreakHabit ? topStreakHabit.habit.name : '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{t.statsTotalCompletions}</span>
                    <Calendar className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-white">
                    {formatNumber(totalCompletedDaysSum, language)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {language === 'fa' ? 'مجموع ثبت‌ها در سیستم' : 'Total check-ins logged'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{language === 'fa' ? 'عادت‌های تثبیت‌شده' : 'Solidified'}</span>
                    <Award className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-2xl font-black text-purple-400">
                    {formatNumber(automaticCount, language)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {language === 'fa' ? 'رسیده به آستانه ≥۷۰٪' : '≥70% Automaticity'}
                  </span>
                </div>
              </div>

              {/* 7-Day Completion Velocity Grid */}
              <div className="p-4.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>{language === 'fa' ? 'روند پایبندی و سرعت ۷ روز گذشته' : '7-Day Completion Velocity'}</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {language === 'fa' ? 'نرخ موفقیت روزانه' : 'Daily success rate'}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {last7DaysVelocity.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-850 border border-slate-700/80 text-center"
                    >
                      <span className="text-[10px] font-semibold text-slate-400">
                        {day.label}
                      </span>
                      <div className="w-full bg-slate-750 h-10 rounded-lg flex flex-col justify-end p-0.5 overflow-hidden">
                        <div
                          className="w-full bg-blue-500 rounded-md transition-all duration-500"
                          style={{ height: `${Math.max(8, day.pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-200">
                        {formatNumber(day.pct, language)}٪
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Spectrum Visual */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{t.statsStageDistribution}</span>
                  <span className="text-slate-400">
                    {formatNumber(totalHabits, language)} {language === 'fa' ? 'عادت' : 'habits'}
                  </span>
                </div>

                {/* Progress bar split */}
                <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden flex">
                  {totalHabits > 0 ? (
                    <>
                      <div
                        style={{ width: `${(automaticCount / totalHabits) * 100}%` }}
                        className="bg-emerald-500 h-full transition-all"
                      />
                      <div
                        style={{ width: `${(semiCount / totalHabits) * 100}%` }}
                        className="bg-amber-400 h-full transition-all"
                      />
                      <div
                        style={{ width: `${(formingCount / totalHabits) * 100}%` }}
                        className="bg-blue-500 h-full transition-all"
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-700 h-full" />
                  )}
                </div>

                {/* Legend badges - Solid Dark */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-emerald-900/60">
                    <span className="block text-[10px] text-emerald-400 font-semibold">{t.stageAutomatic}</span>
                    <span className="text-sm font-black text-emerald-400">{formatNumber(automaticCount, language)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-amber-900/60">
                    <span className="block text-[10px] text-amber-400 font-semibold">{t.stageSemi}</span>
                    <span className="text-sm font-black text-amber-400">{formatNumber(semiCount, language)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-blue-900/60">
                    <span className="block text-[10px] text-blue-400 font-semibold">{t.stageForming}</span>
                    <span className="text-sm font-black text-blue-400">{formatNumber(formingCount, language)}</span>
                  </div>
                </div>
              </div>

              {/* Recurring Tasks Spotlight inside Overview */}
              <div className="p-4.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-900/60 border border-indigo-700/80 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                    <Repeat className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-indigo-200">
                        {language === 'fa' ? 'آمار تسک‌های تکرارشونده و دوره‌ای' : 'Recurring Tasks & Routines'}
                      </h4>
                      {recurringStats.totalCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-900 text-indigo-300 border border-indigo-750">
                          {formatNumber(recurringStats.totalCount, language)} {language === 'fa' ? 'تسک فعال' : 'tasks'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {recurringStats.totalCount > 0
                        ? (language === 'fa'
                            ? `مجموع چرخه‌های انجام‌شده: ${formatNumber(recurringStats.totalCyclesCompleted, language)} دور | پاداش انباشته: +${formatNumber(recurringStats.totalCoinsEarned, language)} سکه`
                            : `Total completed cycles: ${formatNumber(recurringStats.totalCyclesCompleted, language)} | Rewards: +${formatNumber(recurringStats.totalCoinsEarned, language)} coins`)
                        : (language === 'fa' ? 'هنوز تسک تکرارشونده‌ای تعریف نکرده‌اید. با ایجاد تسک‌های دوره‌ای عادات اجرایی خود را ارتقا دهید.' : 'No recurring tasks defined yet. Add recurring tasks to build daily work discipline.')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('recurringTasks')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
                >
                  <span>{language === 'fa' ? 'مشاهده تحلیل تسک‌ها' : 'View Task Analytics'}</span>
                  {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INDIVIDUAL HABIT ANALYTICS (NEW DEEP DIVE SECTION) */}
          {/* ========================================================================= */}
          {activeTab === 'individual' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              {/* Horizontal Scrollable Habit Picker */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                  <span>{language === 'fa' ? 'انتخاب عادت برای تحلیل عمیق:' : 'Select Habit for Deep Analytics:'}</span>
                  <span>{formatNumber(habits.length, language)} {language === 'fa' ? 'عادت موجود' : 'habits'}</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {habitStatsList.map((item) => {
                    const isSelected = item.habit.id === (currentSelectedHabit?.habit.id || '');
                    return (
                      <button
                        key={item.habit.id}
                        onClick={() => setSelectedHabitId(item.habit.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-md'
                            : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.habit.color || '#3b82f6' }}
                        />
                        <span>{item.habit.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${item.stats.colorTheme.badgeBg} ${item.stats.colorTheme.textColor}`}>
                          {formatNumber(item.stats.automaticity, language)}٪
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Habit Detailed Workspace */}
              {currentSelectedHabit ? (
                <div className="flex flex-col gap-4">
                  {/* Habit Card Top Banner */}
                  <div className="p-5 rounded-3xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0"
                        style={{ backgroundColor: currentSelectedHabit.habit.color || '#3b82f6' }}
                      >
                        {currentSelectedHabit.habit.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-white">
                            {currentSelectedHabit.habit.name}
                          </h3>
                          {currentSelectedHabit.habit.category && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-750 text-slate-300 border border-slate-700">
                              {currentSelectedHabit.habit.category}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                              currentSelectedHabit.stats.isDoneToday
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {currentSelectedHabit.stats.isDoneToday ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>{t.doneToday}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{t.filterPending}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {language === 'fa' ? 'مرحله فعلی: ' : 'Current Stage: '}
                          <span className="font-bold text-slate-200">
                            {currentSelectedHabit.stats.stageLabel}
                          </span>
                          {' • '}
                          {language === 'fa'
                            ? `شروع از ${formatNumber(currentSelectedHabit.daysSinceCreation, language)} روز پیش`
                            : `Started ${formatNumber(currentSelectedHabit.daysSinceCreation, language)} days ago`}
                        </p>
                      </div>
                    </div>

                    {/* Quick Automaticity Gauge Badge */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850 border border-slate-700 shrink-0">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">{t.automaticityRate.replace('٪{n}', 'ضریب خودکارشدگی')}</span>
                        <span className="text-xl font-black text-purple-400">
                          {formatNumber(currentSelectedHabit.stats.automaticity, language)}٪
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold">
                        <Brain className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* 4 Detail Metric Cards for Selected Habit */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                        <span>{t.statsColStreak}</span>
                        <Flame className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-2xl font-black text-amber-400">
                        {formatNumber(currentSelectedHabit.stats.currentStreak, language)}
                        <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{language === 'fa' ? 'روز' : 'days'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {language === 'fa' ? 'پیوستگی پیاپی فعال' : 'Active consecutive streak'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                        <span>{t.statsColLongestStreak}</span>
                        <Zap className="w-4 h-4 text-yellow-500" />
                      </div>
                      <span className="text-2xl font-black text-yellow-400">
                        {formatNumber(currentSelectedHabit.stats.longestStreak, language)}
                        <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{language === 'fa' ? 'روز' : 'days'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {language === 'fa' ? 'بالاترین رکورد ثبت‌شده' : 'All-time best streak'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                        <span>{t.statsColCompletedDays}</span>
                        <Calendar className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-2xl font-black text-blue-400">
                        {formatNumber(currentSelectedHabit.stats.totalCompletedDays, language)}
                        <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{language === 'fa' ? 'بار' : 'times'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {language === 'fa' ? 'تعداد کل روزهای ثبت‌شده' : 'Total check-ins'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                        <span>{language === 'fa' ? 'نرخ ثبات و پایبندی' : 'Consistency Rate'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-2xl font-black text-emerald-400">
                        {formatNumber(currentSelectedHabit.consistencyRate, language)}٪
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {language === 'fa' ? 'نسبت به کل روزهای ایجاد' : 'Since creation date'}
                      </span>
                    </div>
                  </div>

                  {/* 30-Day Check-in Heatmap Grid for this Habit */}
                  <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>{language === 'fa' ? 'ماتریس ثبت روزانه ۳۰ روز گذشته این عادت:' : '30-Day Activity History Grid:'}</span>
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                          <span>{t.completed}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-slate-700" />
                          <span>{t.notCompleted}</span>
                        </span>
                      </div>
                    </div>

                    {/* 30-day dots matrix */}
                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 pt-1">
                      {selectedHabit30Days.map((day) => (
                        <div
                          key={day.date}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                            day.isDone
                              ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                              : 'bg-slate-850 border-slate-700/80 text-slate-500'
                          }`}
                          title={`${day.date}: ${day.isDone ? 'Done' : 'Missed'}`}
                        >
                          <span className="text-[9px] font-semibold">{day.dateLabel}</span>
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                            day.isDone ? 'bg-emerald-500 text-black' : 'bg-slate-700'
                          }`}>
                            {day.isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Link to Full 52-Week Yearly Matrix */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHabitId(currentSelectedHabit.habit.id);
                          setActiveTab('yearlyMatrix');
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{language === 'fa' ? 'مشاهده ماتریس کامل سالانه این عادت (۵۲ هفته و ۳۶۵ روز)' : 'View Full 52-Week Annual Matrix for this Habit'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* 3-Phase Neural Timeline Breakdown */}
                  <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span>{language === 'fa' ? 'پیشرفت فازهای ۳گانه عصب‌شناختی تا خودکارشدگی کامل (۶۶ روز):' : '3-Phase Synaptic Milestone Progress:'}</span>
                      </h4>
                      <span className="text-xs font-black text-purple-400">
                        {currentSelectedHabit.stats.remainingDays === 0
                          ? (language === 'fa' ? '🏆 به اوج خودکارشدگی رسیده‌اید!' : '🏆 66-Day Target Achieved!')
                          : `${formatNumber(currentSelectedHabit.stats.remainingDays, language)} ${language === 'fa' ? 'روز تا هدف ۶۶ روز' : 'days left'}`}
                      </span>
                    </div>

                    {/* 3 Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* Phase 1: 1-21 Days */}
                      <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                        currentSelectedHabit.stats.totalCompletedDays >= 21
                          ? 'bg-blue-950/50 border-blue-700/80'
                          : 'bg-slate-850 border-slate-700/80'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-blue-400">{t.milestone21Title}</span>
                          {currentSelectedHabit.stats.totalCompletedDays >= 21 && (
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{ width: `${Math.min(100, (currentSelectedHabit.stats.totalCompletedDays / 21) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatNumber(Math.min(21, currentSelectedHabit.stats.totalCompletedDays), language)} / ۲۱ {language === 'fa' ? 'روز' : 'days'}
                        </span>
                      </div>

                      {/* Phase 2: 22-45 Days */}
                      <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                        currentSelectedHabit.stats.totalCompletedDays >= 45
                          ? 'bg-purple-950/50 border-purple-700/80'
                          : 'bg-slate-850 border-slate-700/80'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-purple-400">{t.milestone45Title}</span>
                          {currentSelectedHabit.stats.totalCompletedDays >= 45 && (
                            <CheckCircle2 className="w-4 h-4 text-purple-400" />
                          )}
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((currentSelectedHabit.stats.totalCompletedDays - 21) / 24) * 100))}%`
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatNumber(Math.min(45, Math.max(21, currentSelectedHabit.stats.totalCompletedDays)), language)} / ۴۵ {language === 'fa' ? 'روز' : 'days'}
                        </span>
                      </div>

                      {/* Phase 3: 46-66 Days */}
                      <div className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                        currentSelectedHabit.stats.totalCompletedDays >= 66
                          ? 'bg-emerald-950/50 border-emerald-700/80'
                          : 'bg-slate-850 border-slate-700/80'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-emerald-400">{t.milestone66Title}</span>
                          {currentSelectedHabit.stats.totalCompletedDays >= 66 && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, ((currentSelectedHabit.stats.totalCompletedDays - 45) / 21) * 100))}%`
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatNumber(Math.min(66, Math.max(45, currentSelectedHabit.stats.totalCompletedDays)), language)} / ۶۶ {language === 'fa' ? 'روز' : 'days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Habit Deep Focus & Pomodoro Analytics Section */}
                  <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{language === 'fa' ? 'آمار جلسات تمرکز و پومودورو این عادت:' : 'Deep Focus & Pomodoro Sessions:'}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 border border-indigo-750">
                              {formatNumber(selectedHabitFocusStats.totalSessions, language)} {language === 'fa' ? 'جلسه' : 'sessions'}
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {language === 'fa'
                              ? 'ثبت دقیق دقایق و ثانیه‌ها، جلسات کامل ۲۵ دقیقه‌ای و جلسات نیمه‌کاره'
                              : 'Exact minutes & seconds, completed 25m intervals vs partial sessions'}
                          </p>
                        </div>
                      </div>

                      <div className="text-end">
                        <span className="text-xs font-bold text-indigo-400 font-mono">
                          {formatPomodoroDuration(selectedHabitFocusStats.totalSeconds, language, true)}
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {language === 'fa' ? 'مجموع زمان صرف‌شده' : 'Total Focus Time'}
                        </span>
                      </div>
                    </div>

                    {/* KPI Badges */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-850 border border-indigo-900/60">
                        <span className="block text-[10px] text-slate-400 font-medium">
                          {language === 'fa' ? 'کل زمان تمرکز' : 'Total Time'}
                        </span>
                        <span className="text-xs font-black text-indigo-400 font-mono">
                          {formatPomodoroDuration(selectedHabitFocusStats.totalSeconds, language, true)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-850 border border-emerald-900/60">
                        <span className="block text-[10px] text-emerald-400 font-medium">
                          {language === 'fa' ? 'جلسات کامل (۲۵+ دقیقه)' : 'Completed (25m+)'}
                        </span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {formatNumber(selectedHabitFocusStats.completed25MinSessions, language)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-850 border border-amber-900/60">
                        <span className="block text-[10px] text-amber-400 font-medium">
                          {language === 'fa' ? 'پایان زودهنگام/نیمه‌کاره' : 'Early Finished'}
                        </span>
                        <span className="text-xs font-black text-amber-400 font-mono">
                          {formatNumber(selectedHabitFocusStats.partialSessions, language)}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Log Table */}
                    {selectedHabitSessions.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs bg-slate-850/60 rounded-xl border border-dashed border-slate-700/60">
                        {language === 'fa'
                          ? 'هنوز جلسه تمرکزی برای این عادت ثبت نشده است. هنگام استارت پومودورو، این عادت را به عنوان هدف انتخاب کنید.'
                          : 'No focus sessions logged for this habit yet. Select this habit as target in Pomodoro timer.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/60 max-h-52 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-850/70">
                        {selectedHabitSessions.map((ses) => {
                          const isFull = ses.isCompletedFull || ses.durationMinutes >= 25;
                          const durSec = typeof ses.durationSeconds === 'number' && ses.durationSeconds > 0
                            ? ses.durationSeconds
                            : (ses.durationMinutes || 0) * 60;

                          return (
                            <div
                              key={ses.id}
                              className="flex items-center justify-between p-2.5 hover:bg-slate-800/60 transition text-xs gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isFull ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'
                                  }`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-slate-200">
                                      {ses.completedAt}
                                    </span>
                                    {ses.time && (
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        ساعت {ses.time}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-medium ${
                                        isFull
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                                      }`}
                                    >
                                      {isFull
                                        ? (language === 'fa' ? 'تکمیل ۲۵دقیقه' : 'Completed 25m')
                                        : (language === 'fa' ? 'پایان زودهنگام' : 'Early Finished')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 font-mono shrink-0">
                                <span className="font-bold text-indigo-300">
                                  {formatPomodoroDuration(durSec, language, true)}
                                </span>
                                {ses.rewardCoinsEarned && ses.rewardCoinsEarned > 0 ? (
                                  <span className="text-[10px] text-amber-400 font-bold">
                                    +{formatNumber(ses.rewardCoinsEarned, language)} 🪙
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                    {/* Habit Execution & Completion Hours Log (Detailed Sub-section) */}
                    {(() => {
                      const compTimes = currentSelectedHabit.habit.completionTimes || {};
                      const historyKeys = Object.keys(currentSelectedHabit.habit.history || {}).filter((k) => currentSelectedHabit.habit.history[k]);
                      const records: CompletionHistoryItem[] = historyKeys.map((dateKey) => ({
                        date: dateKey,
                        time: compTimes[dateKey],
                      }));

                      return (
                        <CompletionHistorySection
                          title={language === 'fa' ? 'تاریخچه و ساعت دقیق انجام عادت' : 'Completion Timestamps & History'}
                          subtitle={
                            language === 'fa'
                              ? 'ساعت و تاریخ دقیق انجام این عادت با امکان فیلتر بازه زمانی، جستجو و خلاصه هوشمند'
                              : 'Exact recorded times with smart analytics, time filters, and searchable history'
                          }
                          records={records}
                          themeColor="purple"
                          language={language}
                        />
                      );
                    })()}

                  {/* Jump to 52-Week Yearly Matrix for this Habit */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {language === 'fa' ? `ماتریس سالانه ۵۲ هفته‌ای «${currentSelectedHabit.habit.name}»` : `52-Week Yearly Matrix for "${currentSelectedHabit.habit.name}"`}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {language === 'fa' ? 'مشاهده نقشه حرارتی ۳۶۵ روزه و تفکیک ماهانه این عادت' : 'View full 365-day annual heatmap and monthly performance breakdown'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHabitId(currentSelectedHabit.habit.id);
                        setActiveTab('yearlyMatrix');
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{language === 'fa' ? 'باز کردن ماتریس سالانه' : 'Open Yearly Matrix'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-800 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs">
                  {t.noHabitsYet}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HABIT MATRIX & COMPARATIVE TABLE */}
          {/* ========================================================================= */}
          {activeTab === 'matrix' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              {/* Search & Sort Controls Bar - Solid Dark */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-between">
                {/* Search input */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-9 pr-9 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ${isRtl ? 'left-3' : 'right-3'}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort selector pills */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <span className="text-xs font-semibold text-slate-400 shrink-0 hidden sm:inline">
                    {t.statsSortBy}
                  </span>
                  <button
                    onClick={() => setSortBy('auto')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      sortBy === 'auto'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    }`}
                  >
                    {t.sortHighestAuto}
                  </button>
                  <button
                    onClick={() => setSortBy('streak')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      sortBy === 'streak'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    }`}
                  >
                    {t.sortHighestStreak}
                  </button>
                  <button
                    onClick={() => setSortBy('pending')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      sortBy === 'pending'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    }`}
                  >
                    {t.sortPendingFirst}
                  </button>
                  <button
                    onClick={() => setSortBy('completions')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      sortBy === 'completions'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                    }`}
                  >
                    {t.sortMostCompletions}
                  </button>
                </div>
              </div>

              {/* Habit Matrix Cards */}
              {filteredAndSortedHabits.length === 0 ? (
                <div className="p-8 text-center bg-slate-800 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs">
                  {t.noHabitsFiltered}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredAndSortedHabits.map(({ habit, stats }) => (
                    <div
                      key={habit.id}
                      className="p-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-blue-500 transition flex flex-col gap-3 group cursor-pointer"
                      onClick={() => {
                        setSelectedHabitId(habit.id);
                        setActiveTab('individual');
                      }}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: habit.color || '#3b82f6' }}
                          />
                          <span className="font-black text-sm text-white group-hover:text-blue-400 transition">
                            {habit.name}
                          </span>
                          {habit.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-750 text-slate-300 border border-slate-700">
                              {habit.category}
                            </span>
                          )}
                        </div>

                        {/* Status Chip & Details Shortcut */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.8 rounded-xl flex items-center gap-1 ${
                              stats.isDoneToday
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {stats.isDoneToday ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>{t.doneToday}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>{t.filterPending}</span>
                              </>
                            )}
                          </span>

                          <span className={`text-[11px] font-black px-2 py-0.8 rounded-lg ${stats.colorTheme.badgeBg} ${stats.colorTheme.textColor}`}>
                            {formatNumber(stats.automaticity, language)}٪
                          </span>

                          <span className="text-slate-400 group-hover:text-blue-400 transition p-1">
                            <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${stats.colorTheme.progressBar}`}
                          style={{ width: `${stats.automaticity}%` }}
                        />
                      </div>

                      {/* 4 Stats Pills Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-700 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] text-slate-400">{t.statsColStreak}:</span>
                          <span className="font-bold text-white">
                            {formatNumber(stats.currentStreak, language)} {language === 'fa' ? 'روز' : 'd'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          <span className="text-[11px] text-slate-400">{t.statsColLongestStreak}:</span>
                          <span className="font-bold text-white">
                            {formatNumber(stats.longestStreak, language)} {language === 'fa' ? 'روز' : 'd'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-[11px] text-slate-400">{t.statsColCompletedDays}:</span>
                          <span className="font-bold text-white">
                            {formatNumber(stats.totalCompletedDays, language)} {language === 'fa' ? 'روز' : 'd'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="text-[11px] text-slate-400">{t.statsColRemaining}:</span>
                          <span className="font-bold text-purple-400">
                            {stats.remainingDays === 0
                              ? (language === 'fa' ? 'تثبیت‌شده 🏆' : 'Goal Met 🏆')
                              : `${formatNumber(stats.remainingDays, language)} ${language === 'fa' ? 'روز' : 'd'}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: COMPREHENSIVE TASKS ANALYTICS (ONE-TIME TASKS & RECURRING CYCLES) */}
          {/* ========================================================================= */}
          {activeTab === 'recurringTasks' && (
            <TasksAnalyticsModalTab
              tasks={tasks}
              habits={habits}
              language={language}
              theme={theme}
              initialSubTab="individual"
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 5: POMODORO & DEEP FOCUS ANALYTICS */}
          {/* ========================================================================= */}
          {activeTab === 'pomodoro' && (
            <PomodoroAnalyticsTab
              habits={habits}
              tasks={tasks}
              language={language}
              theme={theme}
              onOpenPomodoroModal={onOpenPomodoroModal}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 6: 52-WEEK YEARLY MATRIX & ACTIVITY HEATMAP */}
          {/* ========================================================================= */}
          {activeTab === 'yearlyMatrix' && (
            <YearlyMatrixView
              habits={habits}
              language={language}
              theme={theme}
              selectedHabitId={selectedHabitId}
              onSelectHabit={(id) => setSelectedHabitId(id)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 5: 66-DAY NEURAL GROWTH ASYMPTOTE CURVE */}
          {/* ========================================================================= */}
          {activeTab === 'curve' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-blue-300 leading-relaxed flex items-center gap-3">
                <Brain className="w-6 h-6 text-blue-400 shrink-0" />
                <p>{t.growthCurveDesc}</p>
              </div>

              {/* SVG Asymptotic Curve Graphic */}
              <div className="p-6 rounded-3xl bg-slate-950 text-white shadow-xl relative overflow-hidden flex flex-col gap-4 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-800 pb-3">
                  <span>{language === 'fa' ? 'منحنی مجانب رشد سیناپسی (Lally Asymptotic Model)' : 'Synaptic Automaticity Curve'}</span>
                  <span className="text-emerald-400 font-bold">{language === 'fa' ? 'آستانه نهایی: ۱۰۰٪' : 'Asymptote: 100%'}</span>
                </div>

                {/* SVG Visual Canvas */}
                <div className="w-full h-48 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 160" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="40" x2="400" y2="40" stroke="#334155" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="400" y2="80" stroke="#334155" strokeDasharray="3 3" />
                    <line x1="0" y1="120" x2="400" y2="120" stroke="#334155" strokeDasharray="3 3" />

                    {/* Milestone Vertical Lines */}
                    {/* Day 21 (x = 21/66 * 380 = 128) */}
                    <line x1="128" y1="10" x2="128" y2="150" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
                    {/* Day 45 (x = 45/66 * 380 = 272) */}
                    <line x1="272" y1="10" x2="272" y2="150" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
                    {/* Day 66 (x = 380) */}
                    <line x1="380" y1="10" x2="380" y2="150" stroke="#10b981" strokeWidth="1.5" />

                    {/* The Lally Asymptotic Exponential Curve: y(t) = 150 - (1 - e^(-0.045 * t)) * 135 */}
                    <path
                      d="M 10 150 Q 80 80, 160 50 T 280 25 T 380 18"
                      fill="none"
                      stroke="url(#curveGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    {/* Habit Points Plotted on Curve */}
                    {habitStatsList.map((item) => {
                      const effectiveDays = Math.min(66, Math.max(0, item.stats.totalCompletedDays));
                      const x = 10 + (effectiveDays / 66) * 370;
                      const auto = item.stats.automaticity;
                      const y = 150 - (auto / 100) * 132;

                      return (
                        <g key={item.habit.id}>
                          <circle
                            cx={x}
                            cy={y}
                            r="5.5"
                            fill={item.habit.color || '#3b82f6'}
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Milestone Indicators Bottom Bar */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div className="text-slate-400">
                    <span className="block font-bold text-blue-400">{language === 'fa' ? 'روز ۱ تا ۲۱' : 'Day 1-21'}</span>
                    <span>{t.milestone21Title}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="block font-bold text-purple-400">{language === 'fa' ? 'روز ۲۲ تا ۴۵' : 'Day 22-45'}</span>
                    <span>{t.milestone45Title}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="block font-bold text-emerald-400">{language === 'fa' ? 'روز ۴۶ تا ۶۶+' : 'Day 46-66+'}</span>
                    <span>{t.milestone66Title}</span>
                  </div>
                </div>
              </div>

              {/* Habit Milestone Positions List */}
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-slate-200">
                  {language === 'fa' ? 'موقعیت فعلی عادات در مسیر ۶۶ روزه:' : 'Active Habits on the 66-Day Journey:'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {habitStatsList.map((item) => (
                    <div
                      key={item.habit.id}
                      className="p-2.5 rounded-xl bg-slate-850 border border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.habit.color || '#3b82f6' }}
                        />
                        <span className="font-bold text-slate-100">{item.habit.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="font-black text-white">
                          {formatNumber(item.stats.totalCompletedDays, language)}
                        </span>
                        <span className="text-[10px]">/ ۶۶ {language === 'fa' ? 'روز' : 'days'}</span>
                        <span className="font-bold text-purple-400">
                          ({formatNumber(item.stats.automaticity, language)}٪)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Telegram Status Toast Message */}
          {telegramStatus && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                telegramStatus.startsWith('✅')
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800'
              }`}
            >
              <span>{telegramStatus}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions Bar - Solid Dark */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Send to Telegram Button */}
            <button
              id="send-stats-telegram-btn"
              type="button"
              onClick={handleSendStatsToTelegram}
              disabled={isSendingTelegram}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSendingTelegram
                  ? (language === 'fa' ? 'در حال ارسال به تلگرام...' : 'Sending...')
                  : t.statsSendToTelegram}
              </span>
            </button>

            {/* AI Report Shortcut */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAIReport();
              }}
              className="px-4 py-2.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800 text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.statsViewAiReport}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-slate-700"
          >
            {t.understoodBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
