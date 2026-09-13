import React, { useState, useMemo, useEffect } from 'react';
import {
  Timer,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  Trash2,
  Download,
  Sparkles,
  Play,
  Target,
  ListTodo,
  Coins,
  Zap,
  TrendingUp,
  BarChart3,
  ChevronDown,
  Check,
  X,
  Layers,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  Habit,
  Task,
  Language,
  ThemeMode,
  PomodoroSessionRecord,
  PomodoroTargetType,
  PomodoroMode,
} from '../types';
import {
  getPomodoroSessions,
  deletePomodoroSession,
  clearPomodoroSessions,
  calculatePomodoroStats,
  formatPomodoroDuration,
  formatTimeShort,
} from '../utils/pomodoroStorage';
import { getTodayString, formatDateStringToPersian, toPersianDigits } from '../utils/persianDate';
import { formatNumber, translations } from '../utils/translations';

interface PomodoroAnalyticsTabProps {
  habits: Habit[];
  tasks: Task[];
  language: Language;
  theme: ThemeMode;
  onOpenPomodoroModal?: (targetType?: PomodoroTargetType, targetId?: string) => void;
}

type FilterTargetCategory = 'all' | 'habit' | 'task' | 'none';
type FilterCompletionStatus = 'all' | 'full' | 'partial';
type FilterDateRange = 'all' | 'today' | '7days' | '30days';
type SortOption = 'newest' | 'oldest' | 'durationDesc' | 'durationAsc' | 'coinsDesc';

export const PomodoroAnalyticsTab: React.FC<PomodoroAnalyticsTabProps> = ({
  habits,
  tasks,
  language,
  theme,
  onOpenPomodoroModal,
}) => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const t = translations[language] || translations.fa;

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [sessions, setSessions] = useState<PomodoroSessionRecord[]>(() => getPomodoroSessions());

  // Listen for storage updates
  useEffect(() => {
    const handleUpdate = () => {
      setSessions(getPomodoroSessions());
    };
    window.addEventListener('pomodoroSessionsUpdated', handleUpdate);
    return () => {
      window.removeEventListener('pomodoroSessionsUpdated', handleUpdate);
    };
  }, []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetCategoryFilter, setTargetCategoryFilter] = useState<FilterTargetCategory>('all');
  const [specificTargetId, setSpecificTargetId] = useState<string>('all');
  const [completionFilter, setCompletionFilter] = useState<FilterCompletionStatus>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<FilterDateRange>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'focus' | 'stopwatch'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Deletion confirm modal
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Aggregated Overall Stats
  const todayStr = getTodayString();
  const summaryStats = useMemo(() => {
    return calculatePomodoroStats(sessions, todayStr, habits, tasks);
  }, [sessions, todayStr, habits, tasks, refreshKey]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const thirtyDaysMs = 30 * oneDayMs;

    return sessions.filter((session) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const targetName = (session.targetName || session.targetTitle || '').toLowerCase();
        const notes = (session.notes || '').toLowerCase();
        const dateStr = (session.completedAt || '').toLowerCase();
        const timeStr = `${session.startTime || ''} ${session.endTime || ''} ${session.time || ''}`.toLowerCase();
        if (!targetName.includes(q) && !notes.includes(q) && !dateStr.includes(q) && !timeStr.includes(q)) {
          return false;
        }
      }

      // Target Category Filter
      if (targetCategoryFilter === 'habit' && session.targetType !== 'habit') return false;
      if (targetCategoryFilter === 'task' && session.targetType !== 'task') return false;
      if (targetCategoryFilter === 'none' && session.targetType !== 'none' && session.targetType !== undefined) return false;

      // Specific Target Filter
      if (specificTargetId !== 'all' && session.targetId !== specificTargetId) {
        return false;
      }

      // Completion Status Filter
      const isFull = session.isCompletedFull || session.durationMinutes >= 25;
      if (completionFilter === 'full' && !isFull) return false;
      if (completionFilter === 'partial' && isFull) return false;

      // Date Range Filter
      const sessionTime = session.timestamp || now;
      if (dateRangeFilter === 'today' && session.completedAt !== todayStr) return false;
      if (dateRangeFilter === '7days' && now - sessionTime > sevenDaysMs) return false;
      if (dateRangeFilter === '30days' && now - sessionTime > thirtyDaysMs) return false;

      // Mode Filter
      if (modeFilter !== 'all' && session.mode !== modeFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortOption === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
      if (sortOption === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
      if (sortOption === 'durationDesc') {
        const secA = a.durationSeconds !== undefined ? a.durationSeconds : a.durationMinutes * 60;
        const secB = b.durationSeconds !== undefined ? b.durationSeconds : b.durationMinutes * 60;
        return secB - secA;
      }
      if (sortOption === 'durationAsc') {
        const secA = a.durationSeconds !== undefined ? a.durationSeconds : a.durationMinutes * 60;
        const secB = b.durationSeconds !== undefined ? b.durationSeconds : b.durationMinutes * 60;
        return secA - secB;
      }
      if (sortOption === 'coinsDesc') {
        return (b.rewardCoinsEarned || 0) - (a.rewardCoinsEarned || 0);
      }
      return 0;
    });
  }, [
    sessions,
    searchQuery,
    targetCategoryFilter,
    specificTargetId,
    completionFilter,
    dateRangeFilter,
    modeFilter,
    sortOption,
    todayStr,
  ]);

  // Compute filtered totals
  const filteredMetrics = useMemo(() => {
    let totalSec = 0;
    let totalCoins = 0;
    let totalXp = 0;
    let fullCount = 0;
    let partialCount = 0;

    filteredSessions.forEach((s) => {
      const sec = s.durationSeconds !== undefined ? s.durationSeconds : s.durationMinutes * 60;
      totalSec += sec;
      totalCoins += s.rewardCoinsEarned || 0;
      totalXp += s.rewardXpEarned || 0;
      const isFull = s.isCompletedFull || s.durationMinutes >= 25;
      if (isFull) fullCount++;
      else partialCount++;
    });

    return {
      totalSec,
      totalMinutes: Math.round(totalSec / 60),
      totalCoins,
      totalXp,
      fullCount,
      partialCount,
      count: filteredSessions.length,
      completionRate: filteredSessions.length > 0 ? Math.round((fullCount / filteredSessions.length) * 100) : 0,
    };
  }, [filteredSessions]);

  // Handler: Delete single session
  const handleDeleteSession = (id: string) => {
    const updated = deletePomodoroSession(id);
    setSessions(updated);
    setSessionToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  // Handler: Clear all sessions
  const handleClearAll = () => {
    clearPomodoroSessions();
    setSessions([]);
    setShowClearConfirm(false);
    setRefreshKey((k) => k + 1);
  };

  // Handler: Export CSV / JSON
  const handleExportData = () => {
    const jsonStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pomodoro-focus-history-${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Header Banner & Quick Start */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-indigo-900/60 border border-indigo-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Timer className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                {isFa ? 'کارنامه و آمار جامع تمرکز و پومودورو' : isAr ? 'سجل وإحصائيات التركيز وبومودورو' : 'Pomodoro & Deep Focus Analytics'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {formatNumber(summaryStats.totalSessionsCount, language)} {isFa ? 'جلسه' : isAr ? 'جلسة' : 'sessions'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isFa
                ? 'تحلیل دقیق ساعات شروع و پایان، دوره‌های کامل شده، توزیع عادات و تسک‌ها با فیلترهای پیشرفته'
                : isAr
                ? 'تحليل دقيق لأوقات البدء والانتهاء والجلسات المكتملة وتوزيع العادات والمهام'
                : 'Detailed tracking of start/end times, full sessions, habit/task distribution, and focus metrics'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {onOpenPomodoroModal && (
            <button
              type="button"
              onClick={() => onOpenPomodoroModal('none', undefined)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isFa ? 'شروع جلسه تمرکز جدید' : isAr ? 'بدء جلسة تركيز جديدة' : 'Start Focus Session'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportData}
            title={isFa ? 'خروجی فایل JSON' : isAr ? 'تصدير البيانات' : 'Export JSON'}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center justify-center cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Focus Time */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              {isFa ? 'کل زمان تمرکز' : isAr ? 'إجمالي وقت التركيز' : 'Total Focus Time'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20">
              {isFa ? 'کل زمان' : 'All-time'}
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {formatPomodoroDuration(summaryStats.totalSeconds, language, true)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">
                {formatPomodoroDuration(summaryStats.todaySeconds, language, true)}
              </span>
              <span>{isFa ? 'تمرکز امروز' : isAr ? 'اليوم' : 'today'}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Sessions & Full vs Early */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              {isFa ? 'دوره‌های تمرکز' : isAr ? 'جلسات التركيز' : 'Focus Sessions'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
              {summaryStats.totalSessionsCount > 0
                ? `${Math.round((summaryStats.completedFullCount / summaryStats.totalSessionsCount) * 100)}% ${isFa ? 'کامل' : 'full'}`
                : '۰%'}
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-baseline gap-2">
              <span>{formatNumber(summaryStats.totalSessionsCount, language)}</span>
              <span className="text-xs font-normal text-slate-400">{isFa ? 'دوره' : isAr ? 'جلسة' : 'sessions'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" />
                {formatNumber(summaryStats.completedFullCount, language)} {isFa ? 'کامل (۲۵+ د)' : 'full'}
              </span>
              <span className="text-amber-400/90 font-medium">
                {formatNumber(summaryStats.earlyFinishedCount, language)} {isFa ? 'پاره‌وقت' : 'partial'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Today's Focus */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {isFa ? 'تمرکز امروز' : isAr ? 'تركيز اليوم' : "Today's Focus"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
              {formatNumber(summaryStats.todaySessionsCount, language)} {isFa ? 'جلسه' : 'sessions'}
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
              {formatPomodoroDuration(summaryStats.todaySeconds, language, true)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {summaryStats.todaySessionsCount > 0
                ? (isFa ? `ثبت شده در روز جاری (${formatDateStringToPersian(todayStr)})` : `Logged on ${todayStr}`)
                : (isFa ? 'امروز هنوز جلسه‌ای ثبت نشده است' : 'No sessions today yet')}
            </div>
          </div>
        </div>

        {/* KPI 4: Total Rewards Earned from Focus */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-yellow-400" />
              {isFa ? 'پاداش‌های تمرکز' : isAr ? 'مكافآت التركيز' : 'Focus Rewards'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-300 font-bold border border-yellow-500/20">
              🪙 + ⚡
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 text-lg sm:text-xl font-black text-slate-100">
              <span className="text-amber-400 flex items-center gap-1">
                <Coins className="w-4 h-4" />
                +{formatNumber(summaryStats.totalCoinsEarned, language)}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-400 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                +{formatNumber(summaryStats.totalXpEarned, language)} XP
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isFa ? 'پاداش‌های کسب‌شده از کار عمیق و پومودورو' : 'Earned strictly from completed focus sessions'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Distribution by Target (Habits vs Tasks vs Free Focus) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Habit Focus Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {isFa ? 'تمرکز روی عادات ۶۶ روزه' : isAr ? 'التركيز على العادات' : 'Habit Focus Time'}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {formatPomodoroDuration(summaryStats.habitSecondsTotal, language, true)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('habit');
                setSpecificTargetId('all');
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
            >
              {isFa ? 'فیلتر عادات' : 'Filter Habits'}
            </button>
          </div>

          {/* Top 3 Habits */}
          <div className="space-y-2 mt-1">
            {summaryStats.topHabits.length > 0 ? (
              summaryStats.topHabits.slice(0, 3).map((h) => {
                const percent = summaryStats.habitSecondsTotal > 0
                  ? Math.round((h.seconds / summaryStats.habitSecondsTotal) * 100)
                  : 0;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setTargetCategoryFilter('habit');
                      setSpecificTargetId(h.id);
                    }}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-750 border border-slate-800 transition cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: h.color || '#3b82f6' }}
                        />
                        {h.name}
                      </span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {formatPomodoroDuration(h.seconds, language, true)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: h.color || '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                {isFa ? 'هنوز تمرکزی روی عادات ثبت نشده است' : 'No habit focus logged yet'}
              </div>
            )}
          </div>
        </div>

        {/* Task Focus Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {isFa ? 'تمرکز روی تسک‌ها و وظایف' : isAr ? 'التركيز على المهام' : 'Task Focus Time'}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {formatPomodoroDuration(summaryStats.taskSecondsTotal, language, true)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('task');
                setSpecificTargetId('all');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
            >
              {isFa ? 'فیلتر تسک‌ها' : 'Filter Tasks'}
            </button>
          </div>

          {/* Top 3 Tasks */}
          <div className="space-y-2 mt-1">
            {summaryStats.topTasks.length > 0 ? (
              summaryStats.topTasks.slice(0, 3).map((tItem) => {
                const percent = summaryStats.taskSecondsTotal > 0
                  ? Math.round((tItem.seconds / summaryStats.taskSecondsTotal) * 100)
                  : 0;
                return (
                  <div
                    key={tItem.id}
                    onClick={() => {
                      setTargetCategoryFilter('task');
                      setSpecificTargetId(tItem.id);
                    }}
                    className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-750 border border-slate-800 transition cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                        {tItem.name}
                      </span>
                      <span className="text-slate-300 font-mono text-[11px]">
                        {formatPomodoroDuration(tItem.seconds, language, true)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                {isFa ? 'هنوز تمرکزی روی تسک‌ها ثبت نشده است' : 'No task focus logged yet'}
              </div>
            )}
          </div>
        </div>

        {/* Free Focus & Efficiency Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/70 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">
                  {isFa ? 'تمرکز آزاد و عملکرد' : isAr ? 'التركيز الحر والكفاءة' : 'Free Focus & Flow'}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {formatPomodoroDuration(summaryStats.unassignedSecondsTotal, language, true)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('none');
                setSpecificTargetId('all');
              }}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-bold transition cursor-pointer"
            >
              {isFa ? 'فیلتر آزاد' : 'Filter Free'}
            </button>
          </div>

          <div className="space-y-2.5 my-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isFa ? 'نرخ تکمیل دوره‌ها:' : 'Completion Rate:'}</span>
              <span className="font-bold text-emerald-400">
                {summaryStats.totalSessionsCount > 0
                  ? `${Math.round((summaryStats.completedFullCount / summaryStats.totalSessionsCount) * 100)}%`
                  : '۰%'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
                style={{
                  width: `${
                    summaryStats.totalSessionsCount > 0
                      ? Math.round((summaryStats.completedFullCount / summaryStats.totalSessionsCount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{isFa ? 'میانگین هر جلسه:' : 'Avg per session:'}</span>
              <span className="font-mono text-slate-200">
                {summaryStats.totalSessionsCount > 0
                  ? `${Math.round(summaryStats.totalMinutes / summaryStats.totalSessionsCount)} ${isFa ? 'دقیقه' : 'min'}`
                  : '۰'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Controls Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isFa
                  ? 'جستجو در نام عادت، تسک، تاریخ یا یادداشت...'
                  : isAr
                  ? 'بحث في العادة أو المهمة أو التاريخ...'
                  : 'Search by habit, task, date, or note...'
              }
              className="w-full ps-10 pe-9 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Order Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              {isFa ? 'مرتب‌سازی:' : 'Sort:'}
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="newest">{isFa ? 'جدیدترین جلسات' : 'Newest'}</option>
              <option value="oldest">{isFa ? 'قدیمی‌ترین جلسات' : 'Oldest'}</option>
              <option value="durationDesc">{isFa ? 'بیشترین مدت زمان' : 'Longest duration'}</option>
              <option value="durationAsc">{isFa ? 'کمترین مدت زمان' : 'Shortest duration'}</option>
              <option value="coinsDesc">{isFa ? 'بیشترین سکه/پاداش' : 'Highest coins'}</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-750">
          {/* Target Filter Group */}
          <div className="flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-750">
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('all');
                setSpecificTargetId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                targetCategoryFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'همه اهداف' : 'All Targets'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('habit');
                setSpecificTargetId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                targetCategoryFilter === 'habit'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>{isFa ? 'عادات' : 'Habits'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('task');
                setSpecificTargetId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                targetCategoryFilter === 'task'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-3 h-3" />
              <span>{isFa ? 'تسک‌ها' : 'Tasks'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetCategoryFilter('none');
                setSpecificTargetId('all');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                targetCategoryFilter === 'none'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'آزاد' : 'Free'}
            </button>
          </div>

          {/* Specific Target Select (if habit or task chosen) */}
          {targetCategoryFilter === 'habit' && habits.length > 0 && (
            <select
              value={specificTargetId}
              onChange={(e) => setSpecificTargetId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-blue-500/40 text-xs font-medium text-blue-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">{isFa ? 'همه عادات' : 'All Habits'}</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}

          {targetCategoryFilter === 'task' && tasks.length > 0 && (
            <select
              value={specificTargetId}
              onChange={(e) => setSpecificTargetId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-medium text-indigo-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">{isFa ? 'همه تسک‌ها' : 'All Tasks'}</option>
              {tasks.map((tsk) => (
                <option key={tsk.id} value={tsk.id}>
                  {tsk.title}
                </option>
              ))}
            </select>
          )}

          {/* Completion Status Group */}
          <div className="flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-750">
            <button
              type="button"
              onClick={() => setCompletionFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                completionFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'همه وضعیت‌ها' : 'All Status'}
            </button>
            <button
              type="button"
              onClick={() => setCompletionFilter('full')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                completionFilter === 'full'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{isFa ? 'دوره کامل (۲۵+ د)' : 'Full (25+m)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCompletionFilter('partial')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                completionFilter === 'partial'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{isFa ? 'توقف زودتر' : 'Partial'}</span>
            </button>
          </div>

          {/* Date Filter Group */}
          <div className="flex items-center gap-1 bg-slate-900/70 p-1 rounded-xl border border-slate-750 ms-auto">
            <button
              type="button"
              onClick={() => setDateRangeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateRangeFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'کل زمان' : 'All Time'}
            </button>
            <button
              type="button"
              onClick={() => setDateRangeFilter('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateRangeFilter === 'today'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'امروز' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => setDateRangeFilter('7days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateRangeFilter === '7days'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? '۷ روز' : '7d'}
            </button>
            <button
              type="button"
              onClick={() => setDateRangeFilter('30days')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                dateRangeFilter === '30days'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? '۳۰ روز' : '30d'}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Filtered Results Summary & Clear Action */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            {isFa
              ? `نمایش ${formatNumber(filteredSessions.length, language)} از ${formatNumber(sessions.length, language)} جلسه تمرکز`
              : `Showing ${formatNumber(filteredSessions.length, language)} of ${formatNumber(sessions.length, language)} sessions`}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-bold">
            {formatPomodoroDuration(filteredMetrics.totalSec, language, true)}
          </span>
          {filteredMetrics.totalCoins > 0 && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <Coins className="w-3 h-3" />
                +{formatNumber(filteredMetrics.totalCoins, language)}
              </span>
            </>
          )}
        </div>

        {sessions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isFa ? 'پاکسازی تاریخچه' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* 6. Detailed Session Cards List */}
      <div className="flex flex-col gap-3">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => {
            const isFull = session.isCompletedFull || session.durationMinutes >= 25;
            const sec = session.durationSeconds !== undefined ? session.durationSeconds : session.durationMinutes * 60;
            const durationFormatted = formatPomodoroDuration(sec, language, true);

            // Time Formatting (Start and End)
            let startDisplay = session.startTime || '';
            let endDisplay = session.endTime || session.time || '';
            if (!startDisplay && session.timestamp && sec > 0) {
              const startD = new Date(session.timestamp - sec * 1000);
              startDisplay = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;
            }
            if (!endDisplay && session.timestamp) {
              const endD = new Date(session.timestamp);
              endDisplay = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
            }

            // Target Name & Badge
            const targetName = session.targetName || session.targetTitle || (isFa ? 'تمرکز آزاد' : 'Free Focus');
            const targetType = session.targetType || 'none';

            return (
              <div
                key={session.id}
                className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Left: Target and Timing Details */}
                <div className="flex items-start gap-3.5">
                  {/* Status Icon Pillar */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isFull
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/70'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/70'
                    }`}
                  >
                    {isFull ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>

                  {/* Target Title & Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-100">{targetName}</span>

                      {/* Target Category Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          targetType === 'habit'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800/80'
                            : targetType === 'task'
                            ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                        }`}
                      >
                        {targetType === 'habit'
                          ? isFa ? 'عادت' : 'Habit'
                          : targetType === 'task'
                          ? isFa ? 'تسک' : 'Task'
                          : isFa ? 'تمرکز آزاد' : 'Free Focus'}
                      </span>

                      {/* Full vs Partial Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isFull
                            ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                            : 'bg-amber-900/60 text-amber-300 border-amber-700/60'
                        }`}
                      >
                        {isFull
                          ? isFa ? '✅ دوره کامل ۲۵+ دقیقه' : '✅ Full 25+ min'
                          : isFa ? '⏳ توقف زودهنگام' : '⏳ Stopped Early'}
                      </span>

                      {/* Mode Badge if stopwatch */}
                      {session.mode === 'stopwatch' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 font-mono">
                          {isFa ? 'کرنومتر' : 'Stopwatch'}
                        </span>
                      )}
                    </div>

                    {/* Start Time, End Time, and Date Row */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {/* Exact Hours: Start to End */}
                      <div className="flex items-center gap-1 text-slate-300 font-mono bg-slate-900/60 px-2 py-0.5 rounded-lg border border-slate-750">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>{startDisplay || '--:--'}</span>
                        <span className="text-slate-500">تا</span>
                        <span>{endDisplay || '--:--'}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>
                          {isFa ? formatDateStringToPersian(session.completedAt || todayStr) : session.completedAt || todayStr}
                        </span>
                      </div>

                      {/* Notes if present */}
                      {session.notes && (
                        <span className="text-slate-400 italic text-[11px]">«{session.notes}»</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Duration, Rewards & Delete Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-750">
                  {/* Duration and Coins/XP */}
                  <div className="text-end space-y-0.5">
                    <div className="text-sm font-black text-slate-100 font-mono">
                      {durationFormatted}
                    </div>
                    {(session.rewardCoinsEarned || session.rewardXpEarned) ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 justify-end">
                        {session.rewardCoinsEarned ? (
                          <span className="flex items-center gap-0.5">
                            <Coins className="w-3 h-3" />
                            +{formatNumber(session.rewardCoinsEarned, language)}
                          </span>
                        ) : null}
                        {session.rewardXpEarned ? (
                          <span className="text-blue-400 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" />
                            +{formatNumber(session.rewardXpEarned, language)} XP
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        {isFa ? 'بدون پاداش (کمتر از ۲۵ دقیقه)' : 'No bonus (<25m)'}
                      </span>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(session.id)}
                    title={isFa ? 'حذف این رکورد' : 'Delete record'}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 rounded-2xl bg-slate-800/40 border border-dashed border-slate-750 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center">
              <Timer className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-300">
                {isFa ? 'هیچ جلسه تمرکزی مطابق با فیلترها یافت نشد' : 'No focus sessions match the selected filters'}
              </h4>
              <p className="text-xs text-slate-500">
                {isFa
                  ? 'فیلترهای بالا را تغییر دهید یا یک جلسه پومودورو جدید را آغاز کنید.'
                  : 'Adjust filters above or start a new focus session.'}
              </p>
            </div>
            {onOpenPomodoroModal && (
              <button
                type="button"
                onClick={() => onOpenPomodoroModal('none', undefined)}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isFa ? 'شروع تمرکز پومودورو' : 'Start Focus Now'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Single Session Delete */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-start">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-100">
                {isFa ? 'حذف گزارش تمرکز' : 'Delete Focus Session'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFa
                ? 'آیا از حذف این گزارش تمرکز اطمینان دارید؟ این عملیات قابل بازگشت نیست.'
                : 'Are you sure you want to delete this focus session record?'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSession(sessionToDelete)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'حذف رکورد' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-start">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-100">
                {isFa ? 'پاکسازی کامل تاریخچه پومودورو' : 'Clear All Focus History'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isFa
                ? 'تمام گزارش‌ها، دقایق و جلسات ثبت شده پومودورو پاک خواهند شد. آیا مطمئن هستید؟'
                : 'All pomodoro focus session records will be permanently cleared. Are you sure?'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'پاکسازی همه' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
