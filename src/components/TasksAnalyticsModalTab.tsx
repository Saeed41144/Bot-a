import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Flame,
  Coins,
  AlertCircle,
  CheckCircle2,
  Search,
  Tag,
  Clock,
  Calendar,
  Check,
  Timer,
  ListTodo,
  CheckSquare,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  History,
  Hourglass,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Trophy,
  Filter,
  ArrowUpDown,
  Target,
  Layers,
  CircleDot,
  Brain
} from 'lucide-react';
import { Task, Habit, Language, ThemeMode } from '../types';
import { translations, formatNumber } from '../utils/translations';
import {
  getTodayString,
  formatDateStringToPersianShort,
  formatDateStringToPersian,
  getRelativeDueDateInfo,
  toPersianDigits,
} from '../utils/persianDate';
import { getUserActivityLogs } from '../utils/activityLearningStorage';
import { getPomodoroSessions, formatPomodoroDuration, PomodoroSessionRecord } from '../utils/pomodoroStorage';
import { getArchivedTasks } from '../utils/archivedEntitiesStorage';
import { CompletionHistorySection, CompletionHistoryItem } from './CompletionHistorySection';

interface TasksAnalyticsModalTabProps {
  tasks: Task[];
  habits?: Habit[];
  language: Language;
  theme: ThemeMode;
  initialSubTab?: 'individual' | 'onetime' | 'recurring' | 'focusLogs';
  selectedTaskId?: string;
  onSelectTask?: (id: string) => void;
}

type TasksSubTab = 'individual' | 'onetime' | 'recurring' | 'focusLogs';
type TaskStatusFilter = 'all' | 'completed' | 'pending';
type TaskPriorityFilter = 'all' | 'high' | 'medium' | 'low';
type OneTimeSortField = 'completedAt' | 'dueDate' | 'createdAt' | 'focusMinutes' | 'priority' | 'name';
type RecurringSortField = 'streak' | 'due' | 'reward' | 'name';
type RecurringFilterType = 'all' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
type PickerFilterType = 'all' | 'pending' | 'completed' | 'high_priority' | 'has_focus';

export const TasksAnalyticsModalTab: React.FC<TasksAnalyticsModalTabProps> = ({
  tasks,
  habits = [],
  language,
  theme,
  initialSubTab = 'individual',
  selectedTaskId: controlledTaskId,
  onSelectTask,
}) => {
  const [subTab, setSubTab] = useState<TasksSubTab>(initialSubTab);
  const t = translations[language];
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isRtl = t.dir === 'rtl';

  // ---------------------------------------------------------------------------
  // 0. POMODORO SESSIONS STRICT TASK FILTERING (EXCLUDING HABITS 100%)
  // ---------------------------------------------------------------------------
  const taskPomodoroSessions = useMemo(() => {
    const all = getPomodoroSessions();
    const habitIds = new Set(habits.map((h) => h.id));
    const habitNames = new Set(habits.map((h) => h.name.trim().toLowerCase()));

    return all.filter((s) => {
      // 1. Exclude if explicitly tagged as habit
      if (s.targetType === 'habit') return false;
      // 2. Exclude if targetId matches any existing habit id
      if (s.targetId && habitIds.has(s.targetId)) return false;
      // 3. Exclude if targetName matches any habit name
      if (s.targetName && habitNames.has(s.targetName.trim().toLowerCase())) return false;
      if (s.targetTitle && habitNames.has(s.targetTitle.trim().toLowerCase())) return false;

      // 4. Include if explicitly tagged as task
      if (s.targetType === 'task') return true;

      // 5. Or include if targetId matches any known task id
      if (s.targetId && tasks.some((t) => t.id === s.targetId)) return true;
      if (s.targetName && tasks.some((t) => t.title.trim().toLowerCase() === s.targetName?.trim().toLowerCase())) return true;
      if (s.targetTitle && tasks.some((t) => t.title.trim().toLowerCase() === s.targetTitle?.trim().toLowerCase())) return true;

      return false;
    });
  }, [habits, tasks]);

  // Overall Task Pomodoro KPIs
  const allTasksFocusStats = useMemo(() => {
    let totalSeconds = 0;
    let fullCycles = 0;
    let partialCycles = 0;
    let totalCoins = 0;

    taskPomodoroSessions.forEach((s) => {
      const sec = typeof s.durationSeconds === 'number' && s.durationSeconds > 0
        ? s.durationSeconds
        : (s.durationMinutes || 0) * 60;
      totalSeconds += sec;

      const isFull = s.isCompletedFull || s.durationMinutes >= 25;
      if (isFull) {
        fullCycles++;
      } else {
        partialCycles++;
      }

      totalCoins += s.rewardCoinsEarned || 0;
    });

    const totalMinutes = Math.floor(totalSeconds / 60);

    return {
      totalSessions: taskPomodoroSessions.length,
      totalSeconds,
      totalMinutes,
      fullCycles,
      partialCycles,
      totalCoins,
    };
  }, [taskPomodoroSessions]);

  // Retrieve archived tasks
  const archivedTasks = useMemo(() => {
    return getArchivedTasks();
  }, []);

  // Combined active + archived tasks for historical stats
  const allHistoricalTasks = useMemo(() => {
    const activeIds萃 = new Set(tasks.map((t) => t.id));
    const archivedOnly = archivedTasks
      .filter((rec) => !activeIds萃.has(rec.task.id) && rec.hasHistoricalLogs)
      .map((rec) => ({
        ...rec.task,
        isArchived: true,
      }));
    return [...tasks, ...archivedOnly];
  }, [tasks, archivedTasks]);

  // ---------------------------------------------------------------------------
  // 1. INDIVIDUAL TASK SELECTION & DEEP FOCUS ANALYTICS
  // ---------------------------------------------------------------------------
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string>(() => {
    if (tasks.length > 0) {
      // Pick first task with focus time or simply the first task
      const taskWithFocus = tasks.find((t) => (t.totalFocusMinutes || 0) > 0);
      return taskWithFocus ? taskWithFocus.id : tasks[0].id;
    }
    return '';
  });

  const selectedTaskId = controlledTaskId || internalSelectedTaskId;

  const handleSelectTask = (id: string) => {
    setInternalSelectedTaskId(id);
    if (onSelectTask) {
      onSelectTask(id);
    }
  };

  const currentTask拼 = useMemo(() => {
    if (!allHistoricalTasks || allHistoricalTasks.length === 0) return null;
    return allHistoricalTasks.find((t) => t.id === selectedTaskId) || allHistoricalTasks[0];
  }, [allHistoricalTasks, selectedTaskId]);

  const currentTask = currentTask拼;

  // Picker filters and search
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilter, setPickerFilter] = useState<PickerFilterType>('all');

  const filteredPickerTasks = useMemo(() => {
    let list = [...allHistoricalTasks];

    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    if (pickerFilter === 'pending') {
      list = list.filter((t) => !t.completed);
    } else if (pickerFilter === 'completed') {
      list = list.filter((t) => t.completed);
    } else if (pickerFilter === 'high_priority') {
      list = list.filter((t) => t.priority === 'high');
    } else if (pickerFilter === 'has_focus') {
      list = list.filter((t) => {
        const hasDirectMinutes = (t.totalFocusMinutes || 0) > 0;
        const hasSessions = taskPomodoroSessions.some(
          (s) => s.targetId === t.id || s.targetName?.toLowerCase() === t.title.toLowerCase()
        );
        return hasDirectMinutes || hasSessions;
      });
    }

    return list;
  }, [tasks, pickerSearch, pickerFilter, taskPomodoroSessions]);

  // Selected Task Focus Sessions & Detailed Metrics
  const selectedTaskSessions = useMemo(() => {
    if (!currentTask) return [];
    const taskId = currentTask.id;
    const taskTitle = currentTask.title.trim().toLowerCase();

    return taskPomodoroSessions.filter((s) => {
      if (s.targetId === taskId) return true;
      if (s.targetName && s.targetName.trim().toLowerCase() === taskTitle) return true;
      if (s.targetTitle && s.targetTitle.trim().toLowerCase() === taskTitle) return true;
      return false;
    });
  }, [currentTask, taskPomodoroSessions]);

  const selectedTaskFocusStats = useMemo(() => {
    if (!currentTask) {
      return {
        totalSessions: 0,
        completedFullSessions: 0,
        partialSessions: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        coinsEarned: 0,
        xpEarned: 0,
      };
    }

    const totalSessions = selectedTaskSessions.length;
    const completedFullSessions = selectedTaskSessions.filter(
      (s) => s.isCompletedFull || s.durationMinutes >= 25
    ).length;
    const partialSessions = totalSessions - completedFullSessions;

    const sessionSecondsSum = selectedTaskSessions.reduce((acc, s) => {
      const sec = typeof s.durationSeconds === 'number' && s.durationSeconds > 0
        ? s.durationSeconds
        : (s.durationMinutes || 0) * 60;
      return acc + sec;
    }, 0);

    const legacySeconds = (currentTask.totalFocusMinutes || 0) * 60;
    const totalSeconds = Math.max(sessionSecondsSum, legacySeconds);
    const totalMinutes = Math.floor(totalSeconds / 60);

    const coinsEarned = selectedTaskSessions.reduce((acc, s) => acc + (s.rewardCoinsEarned || 0), 0);
    const xpEarned = selectedTaskSessions.reduce((acc, s) => acc + (s.rewardXpEarned || 0), 0);

    return {
      totalSessions,
      completedFullSessions,
      partialSessions,
      totalSeconds,
      totalMinutes,
      coinsEarned,
      xpEarned,
    };
  }, [currentTask, selectedTaskSessions]);

  // ---------------------------------------------------------------------------
  // 2. ONE-TIME TASKS DATA & FILTER STATE
  // ---------------------------------------------------------------------------
  const [oneTimeSearch, setOneTimeSearch] = useState('');
  const [oneTimeStatusFilter, setOneTimeStatusFilter] = useState<TaskStatusFilter>('all');
  const [oneTimePriorityFilter, setOneTimePriorityFilter] = useState<TaskPriorityFilter>('all');
  const [oneTimeCategoryFilter, setOneTimeCategoryFilter] = useState<string>('all');
  const [oneTimeSort, setOneTimeSort] = useState<OneTimeSortField>('completedAt');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTaskExpanded = (id: string) => {
    setExpandedTaskIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const oneTimeTasks = useMemo(() => {
    return tasks.filter((t) => !t.isRecurring);
  }, [tasks]);

  const oneTimeCategories = useMemo(() => {
    const cats = new Set<string>();
    oneTimeTasks.forEach((t) => {
      if (t.category && t.category.trim()) cats.add(t.category.trim());
    });
    return Array.from(cats);
  }, [oneTimeTasks]);

  const oneTimeStats = useMemo(() => {
    const total = oneTimeTasks.length;
    const completed = oneTimeTasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const totalFocusMinutes = oneTimeTasks.reduce((acc, t) => acc + (t.totalFocusMinutes || 0), 0);
    const totalFocusSessions = oneTimeTasks.reduce((acc, t) => acc + (t.focusSessionsCount || 0), 0);

    const totalCoinsEarned = oneTimeTasks
      .filter((t) => t.completed)
      .reduce((acc, t) => acc + (t.rewardCoins ?? 5), 0);
    const totalXpEarned = oneTimeTasks
      .filter((t) => t.completed)
      .reduce((acc, t) => acc + (t.rewardXp ?? 2), 0);

    const overdueCount = oneTimeTasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate < todayStr
    ).length;
    const dueTodayCount = oneTimeTasks.filter(
      (t) => !t.completed && t.dueDate === todayStr
    ).length;

    return {
      total,
      completed,
      pending,
      completionRate,
      totalFocusMinutes,
      totalFocusSessions,
      totalCoinsEarned,
      totalXpEarned,
      overdueCount,
      dueTodayCount,
    };
  }, [oneTimeTasks, todayStr]);

  const filteredAndSortedOneTimeTasks = useMemo(() => {
    let list = [...oneTimeTasks];

    if (oneTimeSearch.trim()) {
      const q = oneTimeSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (oneTimeStatusFilter === 'completed') {
      list = list.filter((t) => t.completed);
    } else if (oneTimeStatusFilter === 'pending') {
      list = list.filter((t) => !t.completed);
    }

    if (oneTimePriorityFilter !== 'all') {
      list = list.filter((t) => t.priority === oneTimePriorityFilter);
    }

    if (oneTimeCategoryFilter !== 'all') {
      list = list.filter((t) => t.category === oneTimeCategoryFilter);
    }

    list.sort((a, b) => {
      if (oneTimeSort === 'completedAt') {
        if (a.completed && b.completed) {
          return (b.completedAt || 0) - (a.completedAt || 0);
        }
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      }
      if (oneTimeSort === 'dueDate') {
        const dateA = a.dueDate || '9999-99-99';
        const dateB = b.dueDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (oneTimeSort === 'createdAt') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (oneTimeSort === 'focusMinutes') {
        return (b.totalFocusMinutes || 0) - (a.totalFocusMinutes || 0);
      }
      if (oneTimeSort === 'priority') {
        const pOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 1) - (pOrder[a.priority] || 1);
      }
      if (oneTimeSort === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [
    oneTimeTasks,
    oneTimeSearch,
    oneTimeStatusFilter,
    oneTimePriorityFilter,
    oneTimeCategoryFilter,
    oneTimeSort,
  ]);

  // ---------------------------------------------------------------------------
  // 3. RECURRING TASKS DATA & FILTER STATE
  // ---------------------------------------------------------------------------
  const [recurringSearch, setRecurringSearch] = useState('');
  const [recurringFilter, setRecurringFilter] = useState<RecurringFilterType>('all');
  const [recurringSort, setRecurringSort] = useState<RecurringSortField>('streak');

  const recurringTasks = useMemo(() => {
    return tasks.filter((t) => t.isRecurring);
  }, [tasks]);

  const recurringStats = useMemo(() => {
    const totalCount = recurringTasks.length;
    const totalCyclesCompleted = recurringTasks.reduce(
      (acc, t) => acc + (t.recurringStreak || 0),
      0
    );
    const totalCoinsEarned = recurringTasks.reduce(
      (acc, t) => acc + (t.recurringStreak || 0) * (t.rewardCoins ?? 5),
      0
    );
    const totalXpEarned = recurringTasks.reduce(
      (acc, t) => acc + (t.recurringStreak || 0) * (t.rewardXp ?? 2),
      0
    );
    const dueTodayCount = recurringTasks.filter((t) => t.dueDate === todayStr).length;
    const overdueCount = recurringTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr && !t.completed
    ).length;

    const topTask =
      recurringTasks.length > 0
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

  const filteredAndSortedRecurringTasks = useMemo(() => {
    let list = [...recurringTasks];

    if (recurringSearch.trim()) {
      const q = recurringSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (recurringFilter !== 'all') {
      list = list.filter((t) => t.recurrence?.type === recurringFilter);
    }

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
        return (
          (b.rewardCoins ?? 5) * (b.recurringStreak || 0) -
          (a.rewardCoins ?? 5) * (a.recurringStreak || 0)
        );
      }
      if (recurringSort === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [recurringTasks, recurringSearch, recurringFilter, recurringSort]);

  // ---------------------------------------------------------------------------
  // 4. FOCUS LOGS FILTERING & SEARCH
  // ---------------------------------------------------------------------------
  const [logsTaskFilter, setLogsTaskFilter] = useState<string>('all');
  const [logsStatusFilter, setLogsStatusFilter] = useState<'all' | 'full' | 'partial'>('all');
  const [logsSearch, setLogsSearch] = useState('');

  const filteredTaskPomodoroSessions = useMemo(() => {
    let list = [...taskPomodoroSessions];

    if (logsTaskFilter !== 'all') {
      list = list.filter((s) => s.targetId === logsTaskFilter || s.targetName === logsTaskFilter);
    }

    if (logsStatusFilter === 'full') {
      list = list.filter((s) => s.isCompletedFull || s.durationMinutes >= 25);
    } else if (logsStatusFilter === 'partial') {
      list = list.filter((s) => !s.isCompletedFull && s.durationMinutes < 25);
    }

    if (logsSearch.trim()) {
      const q = logsSearch.toLowerCase();
      list = list.filter(
        (s) =>
          (s.targetName && s.targetName.toLowerCase().includes(q)) ||
          (s.targetTitle && s.targetTitle.toLowerCase().includes(q)) ||
          (s.completedAt && s.completedAt.includes(q))
      );
    }

    return list;
  }, [taskPomodoroSessions, logsTaskFilter, logsStatusFilter, logsSearch]);

  const activityLogs = useMemo(() => {
    return getUserActivityLogs().filter((l) => l.type === 'task' || l.type === 'recurring_task');
  }, []);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Top Level Sub-Section Pill Switcher */}
      <div className="p-1.5 rounded-2xl bg-slate-800/90 border border-slate-750 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sub-tab 1: Individual Task Deep Focus Analytics (Primary & Matching Habit View) */}
          <button
            type="button"
            id="subtab-tasks-individual"
            onClick={() => setSubTab('individual')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'individual'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                : 'bg-slate-900/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Target className="w-4 h-4 text-purple-300" />
            <span>{isFa ? '🎯 تحلیل اختصاصی و پومودورو تسک' : 'Individual Task & Focus'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                subTab === 'individual'
                  ? 'bg-purple-700 text-white'
                  : 'bg-slate-800 text-purple-400'
              }`}
            >
              {formatNumber(tasks.length, language)}
            </span>
          </button>

          {/* Sub-tab 2: One-Time Tasks Archive */}
          <button
            type="button"
            id="subtab-tasks-onetime"
            onClick={() => setSubTab('onetime')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'onetime'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'bg-slate-900/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-300" />
            <span>{isFa ? '📋 آرشیو تسک‌های یک‌باره' : 'One-Time Tasks Archive'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                subTab === 'onetime'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {formatNumber(oneTimeTasks.length, language)}
            </span>
          </button>

          {/* Sub-tab 3: Recurring Tasks */}
          <button
            type="button"
            id="subtab-tasks-recurring"
            onClick={() => setSubTab('recurring')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'recurring'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                : 'bg-slate-900/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Repeat className="w-4 h-4 text-indigo-300" />
            <span>{isFa ? '🔄 تسک‌های تکرارشونده' : 'Recurring Tasks'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                subTab === 'recurring'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {formatNumber(recurringTasks.length, language)}
            </span>
          </button>

          {/* Sub-tab 4: All Tasks Focus Logs Timeline */}
          <button
            type="button"
            id="subtab-tasks-focus-logs"
            onClick={() => setSubTab('focusLogs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'focusLogs'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-slate-900/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Timer className="w-4 h-4 text-emerald-300" />
            <span>{isFa ? '⏱️ تاریخچه کل پومودورو تسک‌ها' : 'All Task Focus Logs'}</span>
            {allTasksFocusStats.totalSessions > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  subTab === 'focusLogs'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-800 text-emerald-400'
                }`}
              >
                {formatNumber(allTasksFocusStats.totalSessions, language)} {isFa ? 'جلسه' : 'sessions'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: INDIVIDUAL TASK DEEP ANALYTICS & POMODORO (HABIT-LIKE UI) */}
      {/* ===================================================================== */}
      {subTab === 'individual' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Horizontal Scrollable Task Picker with Search & Filter */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-400" />
                <span>{isFa ? 'انتخاب تسک برای تحلیل عمیق و مشاهده تایم پومودورو:' : 'Select Task for Deep Focus Analytics:'}</span>
              </span>
              <span className="font-mono text-purple-300">
                {formatNumber(tasks.length, language)} {isFa ? 'تسک تعریف‌شده' : 'tasks'}
              </span>
            </div>

            {/* Quick Picker Filter Chips & Search Bar */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={isFa ? 'جستجو در تسک‌ها...' : 'Search tasks...'}
                  className="w-full bg-slate-850 text-white text-xs rounded-xl border border-slate-750 pr-8 pl-3 rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 py-1.5 focus:outline-hidden focus:border-purple-500 transition"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setPickerFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    pickerFilter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isFa ? 'همه' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilter('has_focus')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    pickerFilter === 'has_focus'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-purple-400 hover:text-purple-300'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  <span>{isFa ? 'دارای زمان تمرکز ⏱️' : 'Has Focus ⏱️'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    pickerFilter === 'pending'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-amber-400 hover:text-amber-300'
                  }`}
                >
                  {isFa ? 'در انتظار' : 'Pending'}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    pickerFilter === 'completed'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {isFa ? 'تکمیل‌شده' : 'Completed'}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerFilter('high_priority')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    pickerFilter === 'high_priority'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-rose-400 hover:text-rose-300'
                  }`}
                >
                  {isFa ? 'فوری 🔥' : 'High'}
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Task Buttons List */}
            {filteredPickerTasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 text-center text-xs text-slate-400">
                {isFa ? 'تسکی با این فیلتر یا عبارت جستجو یافت نشد.' : 'No tasks match the filter.'}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {filteredPickerTasks.map((tItem) => {
                  const isSelected = tItem.id === (currentTask?.id || '');
                  const tFocusMinutes = tItem.totalFocusMinutes || 0;
                  const matchingSessionsCount = taskPomodoroSessions.filter(
                    (s) => s.targetId === tItem.id || s.targetName?.toLowerCase() === tItem.title.toLowerCase()
                  ).length;

                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => handleSelectTask(tItem.id)}
                      className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border shrink-0 ${
                        isSelected
                          ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500'
                          : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          tItem.completed
                            ? 'bg-emerald-400 ring-2 ring-emerald-950'
                            : tItem.priority === 'high'
                            ? 'bg-rose-500 ring-2 ring-rose-950'
                            : 'bg-blue-400 ring-2 ring-blue-950'
                        }`}
                      />
                      <span className="max-w-[140px] truncate">{tItem.title}</span>

                      {matchingSessionsCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-900/80 text-purple-300 border border-purple-750 flex items-center gap-0.5">
                          <Timer className="w-2.5 h-2.5" />
                          <span>{formatNumber(matchingSessionsCount, language)}</span>
                        </span>
                      ) : tFocusMinutes > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-900/80 text-indigo-300 border border-indigo-750">
                          {formatNumber(tFocusMinutes, language)}m
                        </span>
                      ) : null}

                      {tItem.completed && (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Task Detailed Workspace */}
          {currentTask ? (
            <div className="flex flex-col gap-4">
              {/* Task Header Banner */}
              <div className="p-5 rounded-3xl bg-slate-800 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0 border ${
                      currentTask.completed
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-400'
                        : currentTask.priority === 'high'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-400'
                        : 'bg-blue-950/80 border-blue-700 text-blue-400'
                    }`}
                  >
                    {currentTask.completed ? (
                      <CheckSquare className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <CheckSquare className="w-6 h-6" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-base sm:text-lg font-black truncate ${
                          currentTask.completed ? 'text-slate-300 line-through decoration-emerald-500/50' : 'text-white'
                        }`}
                      >
                        {currentTask.title}
                      </h3>

                      {currentTask.category && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{currentTask.category}</span>
                        </span>
                      )}

                      {/* Status Pill */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 border ${
                          currentTask.completed
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        {currentTask.completed ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>{t.completed}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{isFa ? 'در انتظار اجرا' : 'Pending'}</span>
                          </>
                        )}
                      </span>

                      {/* Priority Pill */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                          currentTask.priority === 'high'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : currentTask.priority === 'medium'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : 'bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        {currentTask.priority === 'high'
                          ? (isFa ? 'فوری / مهم 🔥' : 'High')
                          : currentTask.priority === 'medium'
                          ? (isFa ? 'متوسط ⚡' : 'Medium')
                          : (isFa ? 'عادی' : 'Low')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>
                        {isFa ? 'تاریخ ایجاد: ' : 'Created: '}
                        <strong className="text-slate-200">
                          {currentTask.createdAt ? formatDateStringToPersianShort(currentTask.createdAt) : '-'}
                        </strong>
                      </span>
                      {currentTask.dueDate && (
                        <>
                          <span>•</span>
                          <span className="text-blue-300">
                            {isFa ? 'سررسید: ' : 'Due: '}
                            <strong className="text-blue-200">
                              {formatDateStringToPersianShort(currentTask.dueDate)}
                              {currentTask.dueTime ? ` (${toPersianDigits(currentTask.dueTime)})` : ''}
                            </strong>
                          </span>
                        </>
                      )}
                      {currentTask.isRecurring && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-300 font-bold flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            <span>{isFa ? 'تکرارشونده' : 'Recurring'}</span>
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Total Focus Time Gauge Banner */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850 border border-purple-900/60 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] text-purple-300 font-bold uppercase">
                      {isFa ? 'مجموع زمان تمرکز این تسک' : 'Total Task Focus Time'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-purple-400 font-mono">
                      {formatPomodoroDuration(selectedTaskFocusStats.totalSeconds, language, true)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold">
                    <Timer className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 4 Detail Metric Cards (Matching Habit Deep Analytics Layout) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Card 1: Total Focus Duration */}
                <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{isFa ? 'کل زمان صرف‌شده' : 'Total Focus Time'}</span>
                    <Timer className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-lg sm:text-xl font-black text-purple-300 font-mono">
                    {formatPomodoroDuration(selectedTaskFocusStats.totalSeconds, language, true)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {isFa ? 'ثبت دقیق ثانیه و دقیقه' : 'Exact seconds & minutes'}
                  </span>
                </div>

                {/* Card 2: Completed Full 25m+ Cycles */}
                <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{isFa ? 'دوره‌های کامل ۲۵+ دقیقه' : 'Full 25m+ Cycles'}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {formatNumber(selectedTaskFocusStats.completedFullSessions, language)}
                    <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'دوره' : 'cycles'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {isFa ? 'سشن‌های استاندارد تکمیل‌شده' : 'Standard 25m focus blocks'}
                  </span>
                </div>

                {/* Card 3: Partial / Early Finished Cycles */}
                <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{isFa ? 'دوره‌های ناقص / زودهنگام' : 'Partial / Early Finish'}</span>
                    <Hourglass className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {formatNumber(selectedTaskFocusStats.partialSessions, language)}
                    <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'دوره' : 'sessions'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {isFa ? 'پایان زودهنگام ثبت‌شده' : 'Recorded before 25m finish'}
                  </span>
                </div>

                {/* Card 4: Focus Reward Coins & XP */}
                <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                    <span>{isFa ? 'پاداش تمرکز تسک' : 'Focus Rewards'}</span>
                    <Coins className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    +{formatNumber(selectedTaskFocusStats.coinsEarned, language)}
                    <span className="text-xs text-slate-400 font-bold ml-1 mr-1">🪙</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {isFa ? 'سکه‌های پاداش دریافت شده' : 'Coins earned from sessions'}
                  </span>
                </div>
              </div>

              {/* Subtasks Progress (If task has subtasks) */}
              {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ListTodo className="w-4 h-4 text-blue-400" />
                      <span>{isFa ? 'زیرتسک‌ها و چک‌لیست اجرایی این تسک:' : 'Subtasks & Action Checklist:'}</span>
                    </h4>
                    <span className="text-xs font-bold text-blue-400">
                      {formatNumber(currentTask.subtasks.filter((s) => s.completed).length, language)} / {formatNumber(currentTask.subtasks.length, language)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-750 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{
                        width: `${Math.round(
                          (currentTask.subtasks.filter((s) => s.completed).length / currentTask.subtasks.length) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Subtask list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {currentTask.subtasks.map((st) => (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                          st.completed
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                            : 'bg-slate-850 border-slate-750 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            st.completed ? 'bg-emerald-500 text-black' : 'bg-slate-700'
                          }`}
                        >
                          {st.completed && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`truncate ${st.completed ? 'line-through text-slate-400' : ''}`}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Pomodoro Deep Focus Sessions Log Table */}
              <div className="p-4.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{isFa ? 'آمار دوره‌های پومودورو این تسک (کامل و ناقص):' : 'Task Pomodoro Focus Sessions Log:'}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-900/60 text-purple-300 border border-purple-750">
                          {formatNumber(selectedTaskFocusStats.totalSessions, language)} {isFa ? 'جلسه' : 'sessions'}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isFa
                          ? 'ثبت مجزا برای هر سشن با تاریخ، ساعت دقیق، مدت زمان ثانیه‌ای و برچسب دوره کامل / زودهنگام'
                          : 'Recorded per session with timestamp, duration in seconds, full cycle vs partial'}
                      </p>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-xs font-bold text-purple-400 font-mono">
                      {formatPomodoroDuration(selectedTaskFocusStats.totalSeconds, language, true)}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {isFa ? 'مجموع زمان صرف‌شده' : 'Total Focus Time'}
                    </span>
                  </div>
                </div>

                {/* KPI Breakdown Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-purple-900/60">
                    <span className="block text-[10px] text-slate-400 font-medium">
                      {isFa ? 'کل زمان تمرکز تسک' : 'Total Time'}
                    </span>
                    <span className="text-xs font-black text-purple-400 font-mono">
                      {formatPomodoroDuration(selectedTaskFocusStats.totalSeconds, language, true)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-850 border border-emerald-900/60">
                    <span className="block text-[10px] text-emerald-400 font-medium">
                      {isFa ? 'دوره‌های کامل (۲۵+ دقیقه)' : 'Completed (25m+)'}
                    </span>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {formatNumber(selectedTaskFocusStats.completedFullSessions, language)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-850 border border-amber-900/60">
                    <span className="block text-[10px] text-amber-400 font-medium">
                      {isFa ? 'دوره‌های ناقص / زودهنگام' : 'Early Finished'}
                    </span>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      {formatNumber(selectedTaskFocusStats.partialSessions, language)}
                    </span>
                  </div>
                </div>

                {/* Detailed Session History List */}
                {selectedTaskSessions.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400 text-xs bg-slate-850/60 rounded-xl border border-dashed border-slate-700/60 flex flex-col items-center justify-center gap-2">
                    <Timer className="w-8 h-8 text-slate-500" />
                    <p className="font-semibold text-slate-300">
                      {isFa
                        ? 'هنوز جلسه تمرکزی برای این تسک ثبت نشده است.'
                        : 'No focus sessions logged for this task yet.'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md">
                      {isFa
                        ? 'هنگام شروع تایمر پومودورو در صفحه اصلی، این تسک را به عنوان هدف تمرکز انتخاب کنید تا تمام دوره‌ها و زمان‌های کامل و ناقص در اینجا ثبت گردند.'
                        : 'Select this task as your focus target in the Pomodoro timer to record all completed and partial cycles here.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/60 max-h-60 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-850/70">
                    {selectedTaskSessions.map((ses) => {
                      const isFull = ses.isCompletedFull || ses.durationMinutes >= 25;
                      const durSec = typeof ses.durationSeconds === 'number' && ses.durationSeconds > 0
                        ? ses.durationSeconds
                        : (ses.durationMinutes || 0) * 60;

                      return (
                        <div
                          key={ses.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-800/60 transition text-xs gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isFull ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-200">
                                  {ses.completedAt ? formatDateStringToPersianShort(ses.completedAt) : ''}
                                </span>
                                {ses.time && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    ساعت {toPersianDigits(ses.time)}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                                    isFull
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}
                                >
                                  {isFull ? (isFa ? 'تکمیل ۲۵ دقیقه 🏆' : 'Completed 25m 🏆') : (isFa ? 'پایان زودهنگام ⚡' : 'Early Finished ⚡')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="font-bold text-purple-300">
                              {formatPomodoroDuration(durSec, language, true)}
                            </span>
                            {ses.rewardCoinsEarned && ses.rewardCoinsEarned > 0 ? (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-800 px-1.5 py-0.2 rounded-md">
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

              {/* Task Completion History & Timestamps Sub-section */}
              {(() => {
                const completedHistoryList = currentTask.completedHistory || [];
                const compTimes = currentTask.completionTimes || [];
                const compTimestamps = currentTask.completedTimestamps || [];

                // Build unified completion records
                const records: CompletionHistoryItem[] = [];
                if (completedHistoryList.length > 0) {
                  completedHistoryList.forEach((h) => records.push({ date: h.date, time: h.time, timestamp: h.timestamp }));
                } else if (compTimes.length > 0) {
                  compTimes.forEach((t, idx) => {
                    const ts = compTimestamps[idx];
                    const date = ts ? new Date(ts).toISOString().split('T')[0] : (currentTask.lastCompletedDate || currentTask.dueDate || currentTask.createdAt);
                    records.push({ date, time: t, timestamp: ts });
                  });
                } else if (currentTask.completed) {
                  const date = currentTask.lastCompletedDate || currentTask.dueDate || currentTask.createdAt;
                  records.push({ date, time: currentTask.completedTime, timestamp: currentTask.completedAt });
                }

                return (
                  <CompletionHistorySection
                    title={isFa ? 'تاریخچه و ساعت دقیق انجام تسک' : 'Task Completion Times & History'}
                    subtitle={
                      isFa
                        ? 'ساعت و تاریخ دقیق انجام این تسک با فیلترهای زمانی، جستجوی سریع و خلاصه‌سازی هوشمند'
                        : 'Exact recorded times with smart analytics, time filters, and searchable history'
                    }
                    records={records}
                    themeColor="blue"
                    language={language}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-750 text-center text-slate-400 text-xs">
              {isFa ? 'هیچ تسکی برای نمایش وجود ندارد.' : 'No tasks available.'}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: ONE-TIME TASKS DEDICATED ARCHIVE & KPI ANALYTICS */}
      {/* ===================================================================== */}
      {subTab === 'onetime' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-900/60 border border-blue-700/80 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-200 flex items-center gap-2">
                  <span>{isFa ? 'بخش اختصاصی آمار و تحلیل تسک‌های یک‌باره' : 'One-Time Tasks Comprehensive Analytics'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isFa
                    ? 'آرشیو کامل فعالیت‌ها، اولویت‌بندی، بررسی سررسیدها و زمان‌های تمرکز ثبت‌شده'
                    : 'Full archive of completed vs pending tasks, priority matrices, and focus history'}
                </p>
              </div>
            </div>

            {/* Quick Completion Rate Gauge */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850 border border-slate-750 shrink-0">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">
                  {isFa ? 'نرخ کل تکمیل تسک‌ها' : 'Completion Rate'}
                </span>
                <span className="text-xl font-black text-blue-400">
                  {formatNumber(oneTimeStats.completionRate, language)}٪
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 4 Detail Metric Cards for One-Time Tasks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Completed */}
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'تسک‌های تکمیل‌شده' : 'Completed Tasks'}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-black text-emerald-400">
                {formatNumber(oneTimeStats.completed, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">
                  / {formatNumber(oneTimeStats.total, language)}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {formatNumber(oneTimeStats.pending, language)} {isFa ? 'تسک در انتظار اجرا' : 'pending tasks'}
              </span>
            </div>

            {/* 2. Total Focus Minutes on One-Time Tasks */}
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'زمان تمرکز ثبت‌شده' : 'Focus Time'}</span>
                <Timer className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-2xl font-black text-purple-400">
                {formatNumber(oneTimeStats.totalFocusMinutes, language)}{' '}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'دقیقه' : 'min'}</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {formatNumber(oneTimeStats.totalFocusSessions, language)} {isFa ? 'جلسه پومودورو' : 'sessions'}
              </span>
            </div>

            {/* 3. Total Coins Earned */}
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'سکه‌های پاداش کسب‌شده' : 'Reward Coins'}</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-400">
                +{formatNumber(oneTimeStats.totalCoinsEarned, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">🪙</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                +{formatNumber(oneTimeStats.totalXpEarned, language)} {isFa ? 'امتیاز تجربه XP' : 'XP'}
              </span>
            </div>

            {/* 4. Overdue Tasks */}
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'تسک‌های معوق / سررسید امروز' : 'Overdue / Today'}</span>
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-2xl font-black text-rose-400">
                {formatNumber(oneTimeStats.overdueCount, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'معوق' : 'overdue'}</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {formatNumber(oneTimeStats.dueTodayCount, language)} {isFa ? 'تسک سررسید امروز' : 'due today'}
              </span>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
                <input
                  type="text"
                  value={oneTimeSearch}
                  onChange={(e) => setOneTimeSearch(e.target.value)}
                  placeholder={isFa ? 'جستجو در عنوان، دسته‌بندی یا توضیحات تسک...' : 'Search title, category, description...'}
                  className="w-full bg-slate-850 text-white text-xs rounded-xl border border-slate-700 pr-9 pl-4 rtl:pr-9 rtl:pl-4 ltr:pl-9 ltr:pr-4 py-2.5 focus:outline-hidden focus:border-blue-500 transition"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setOneTimeStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    oneTimeStatusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isFa ? 'همه' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setOneTimeStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    oneTimeStatusFilter === 'pending'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isFa ? 'در انتظار' : 'Pending'}
                </button>
                <button
                  type="button"
                  onClick={() => setOneTimeStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    oneTimeStatusFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isFa ? 'تکمیل‌شده' : 'Completed'}
                </button>
              </div>
            </div>

            {/* Filter Bar: Category, Priority, Sort Order */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1 border-t border-slate-750">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Dropdown */}
                {oneTimeCategories.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={oneTimeCategoryFilter}
                      onChange={(e) => setOneTimeCategoryFilter(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">{isFa ? 'همه دسته‌بندی‌ها' : 'All Categories'}</option>
                      {oneTimeCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority Filter */}
                <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={oneTimePriorityFilter}
                    onChange={(e) => setOneTimePriorityFilter(e.target.value as TaskPriorityFilter)}
                    className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">{isFa ? 'همه اولویت‌ها' : 'All Priorities'}</option>
                    <option value="high">{isFa ? 'فوری / مهم' : 'High'}</option>
                    <option value="medium">{isFa ? 'متوسط' : 'Medium'}</option>
                    <option value="low">{isFa ? 'عادی' : 'Low'}</option>
                  </select>
                </div>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 text-[11px]">{isFa ? 'مرتب‌سازی:' : 'Sort:'}</span>
                <select
                  value={oneTimeSort}
                  onChange={(e) => setOneTimeSort(e.target.value as OneTimeSortField)}
                  className="bg-transparent text-blue-400 text-xs font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="completedAt">{isFa ? 'زمان تکمیل / سررسید' : 'Completion / Due'}</option>
                  <option value="dueDate">{isFa ? 'تاریخ سررسید' : 'Due Date'}</option>
                  <option value="createdAt">{isFa ? 'جدیدترین ایجادشده' : 'Newest'}</option>
                  <option value="focusMinutes">{isFa ? 'بیشترین زمان تمرکز' : 'Most Focus Time'}</option>
                  <option value="priority">{isFa ? 'اولویت (فوری به عادی)' : 'Priority'}</option>
                  <option value="name">{isFa ? 'نام (الفبا)' : 'Name'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* One-Time Tasks Rich List */}
          {filteredAndSortedOneTimeTasks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-800/40 border border-slate-750 text-center flex flex-col items-center justify-center gap-3">
              <CheckSquare className="w-10 h-10 text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {isFa ? 'تسکی با فیلترهای انتخابی یافت نشد.' : 'No one-time tasks found matching filters.'}
              </p>
              <p className="text-xs text-slate-400">
                {isFa ? 'می‌توانید فیلترها را ریست کنید یا تسک جدیدی ایجاد کنید.' : 'Try changing your search term or filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAndSortedOneTimeTasks.map((task) => {
                const isExpanded = !!expandedTaskIds[task.id];
                const dueInfo = getRelativeDueDateInfo(task.dueDate, language);

                let completedDisplay = '';
                if (task.completed) {
                  if (task.completedAt) {
                    const compDate = new Date(task.completedAt);
                    const compDateStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(compDate.getDate()).padStart(2, '0')}`;
                    completedDisplay = `${isFa ? 'تکمیل در ' : 'Completed on '} ${formatDateStringToPersian(compDateStr)} ${task.completedTime ? `(ساعت ${toPersianDigits(task.completedTime)})` : ''}`;
                  } else {
                    completedDisplay = isFa ? 'تکمیل‌شده' : 'Completed';
                  }
                }

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      task.completed
                        ? 'bg-slate-800/90 border-emerald-800/50 hover:border-emerald-700/80 shadow-xs'
                        : dueInfo.isOverdue
                        ? 'bg-slate-800/90 border-rose-800/60 hover:border-rose-700/90 shadow-sm'
                        : 'bg-slate-800/90 border-slate-700 hover:border-slate-600 shadow-xs'
                    }`}
                  >
                    {/* Top Badges Row */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Status Pill */}
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.8 rounded-lg flex items-center gap-1 border ${
                              task.completed
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                                : dueInfo.isOverdue
                                ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                                : 'bg-amber-950/90 text-amber-300 border-amber-800'
                            }`}
                          >
                            {task.completed ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>{isFa ? 'تکمیل شده' : 'Completed'}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>{dueInfo.isOverdue ? (isFa ? 'معوق' : 'Overdue') : (isFa ? 'در انتظار' : 'Pending')}</span>
                              </>
                            )}
                          </span>

                          {/* Priority Pill */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              task.priority === 'high'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                                : task.priority === 'medium'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                                : 'bg-slate-750 text-slate-300 border-slate-600'
                            }`}
                          >
                            {task.priority === 'high'
                              ? isFa ? 'فوری / مهم 🔥' : 'High'
                              : task.priority === 'medium'
                              ? isFa ? 'متوسط ⚡' : 'Medium'
                              : isFa ? 'عادی' : 'Low'}
                          </span>

                          {/* Category Pill */}
                          {task.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{task.category}</span>
                            </span>
                          )}
                        </div>

                        {/* Focus time badge if any */}
                        {(task.totalFocusMinutes || 0) > 0 && (
                          <span className="text-[10px] font-bold px-2.5 py-0.8 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800 flex items-center gap-1 shrink-0">
                            <Timer className="w-3 h-3 text-purple-400" />
                            <span>
                              {formatNumber(task.totalFocusMinutes || 0, language)} {isFa ? 'دقیقه تمرکز' : 'min focus'}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Task Title & Description */}
                      <div className="flex items-start gap-2.5 mt-1">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                            task.completed
                              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                              : 'bg-blue-950/80 border-blue-800 text-blue-400'
                          }`}
                        >
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <h4
                            className={`text-sm font-bold leading-snug ${
                              task.completed ? 'text-slate-200 line-through decoration-emerald-500/50' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Completion Timestamp Detail Callout (If completed) */}
                    {task.completed && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{completedDisplay}</span>
                      </div>
                    )}

                    {/* Information Grid: Created date, Due date, Subtasks */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/80 text-xs">
                      {/* Created At */}
                      <div className="p-2 rounded-xl bg-slate-850 border border-slate-750 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {isFa ? 'زمان ایجاد:' : 'Created:'}
                          </span>
                          <span className="font-bold text-slate-200 text-[11px]">
                            {task.createdAt ? formatDateStringToPersianShort(task.createdAt) : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Due Date & Time */}
                      <div className="p-2 rounded-xl bg-slate-850 border border-slate-750 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {isFa ? 'سررسید:' : 'Due Date:'}
                          </span>
                          <span className="font-bold text-slate-200 text-[11px]">
                            {task.dueDate ? formatDateStringToPersianShort(task.dueDate) : (isFa ? 'بدون تاریخ' : 'No date')}
                            {task.dueTime ? ` (${toPersianDigits(task.dueTime)})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subtasks Checklist Progress (if any) */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-850 border border-slate-750">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            <ListTodo className="w-3.5 h-3.5 text-blue-400" />
                            <span>{isFa ? 'زیرتسک‌ها:' : 'Subtasks:'}</span>
                          </span>
                          <span className="font-mono text-blue-400 font-bold">
                            {formatNumber(task.subtasks.filter((s) => s.completed).length, language)} / {formatNumber(task.subtasks.length, language)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-750 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full transition-all"
                            style={{
                              width: `${Math.round(
                                (task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer Row: Rewards, Expand button & Link to Individual Analysis */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>+{formatNumber(task.rewardCoins ?? 5, language)}</span>
                        </span>
                        <span className="text-purple-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+{formatNumber(task.rewardXp ?? 2, language)} XP</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTask(task.id);
                          setSubTab('individual');
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>{isFa ? 'مشاهده آمار تمرکز' : 'View Focus Stats'}</span>
                        <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: RECURRING TASKS & HABIT-LIKE CYCLES */}
      {/* ===================================================================== */}
      {subTab === 'recurring' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-900/60 border border-indigo-700/80 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                <Repeat className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-indigo-200 flex items-center gap-2">
                  <span>{isFa ? 'تسک‌های تکرارشونده و چرخه‌های بازگشتی' : 'Recurring Tasks & Cyclic Habits'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isFa
                    ? 'پایش دقیق چرخه‌ها، استریک‌های تکرار، پاداش‌های فزاینده و زمان‌بندی هوشمند'
                    : 'Recurring streaks, reward multipliers, and scheduled renewal triggers'}
                </p>
              </div>
            </div>

            {/* Quick Cycles Count Badge */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850 border border-slate-750 shrink-0">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">
                  {isFa ? 'مجموع چرخه‌های انجام‌شده' : 'Total Cycles Completed'}
                </span>
                <span className="text-xl font-black text-indigo-400">
                  {formatNumber(recurringStats.totalCyclesCompleted, language)} {isFa ? 'چرخه' : 'cycles'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 4 Detail Metric Cards for Recurring Tasks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'کل تسک‌های تکرارشونده' : 'Total Recurring'}</span>
                <Repeat className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-black text-indigo-400">
                {formatNumber(recurringStats.totalCount, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'تسک' : 'tasks'}</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {formatNumber(recurringStats.dueTodayCount, language)} {isFa ? 'سررسید در چرخه امروز' : 'due today'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'مجموع چرخه‌های تکمیل‌شده' : 'Cycles Completed'}</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-400">
                {formatNumber(recurringStats.totalCyclesCompleted, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'بار' : 'times'}</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {isFa ? 'توالی و استریک‌های ثبت‌شده' : 'Continuous cycle streaks'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'سکه‌های کسب‌شده از چرخه‌ها' : 'Coins Earned'}</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl font-black text-amber-400">
                +{formatNumber(recurringStats.totalCoinsEarned, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">🪙</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                +{formatNumber(recurringStats.totalXpEarned, language)} {isFa ? 'XP امتیاز تجربه' : 'XP'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
                <span>{isFa ? 'برترین استریک فعال' : 'Top Streak Leader'}</span>
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-2xl font-black text-yellow-400">
                {formatNumber(recurringStats.topTask?.recurringStreak || 0, language)}
                <span className="text-xs text-slate-400 font-bold ml-1 mr-1">{isFa ? 'چرخه' : 'cycles'}</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1 truncate">
                {recurringStats.topTask ? recurringStats.topTask.title : '-'}
              </span>
            </div>
          </div>

          {/* Search, Filter & Sort Controls for Recurring */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
              <input
                type="text"
                value={recurringSearch}
                onChange={(e) => setRecurringSearch(e.target.value)}
                placeholder={isFa ? 'جستجو در تسک‌های تکرارشونده...' : 'Search recurring tasks...'}
                className="w-full bg-slate-850 text-white text-xs rounded-xl border border-slate-700 pr-9 pl-4 rtl:pr-9 rtl:pl-4 ltr:pl-9 ltr:pr-4 py-2.5 focus:outline-hidden focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={recurringFilter}
                  onChange={(e) => setRecurringFilter(e.target.value as RecurringFilterType)}
                  className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="all">{isFa ? 'همه دوره‌ها' : 'All Recurrences'}</option>
                  <option value="daily">{isFa ? 'روزانه' : 'Daily'}</option>
                  <option value="weekdays">{isFa ? 'روزهای کاری' : 'Weekdays'}</option>
                  <option value="weekly">{isFa ? 'هفتگی' : 'Weekly'}</option>
                  <option value="monthly">{isFa ? 'ماهانه' : 'Monthly'}</option>
                </select>
              </div>

              <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={recurringSort}
                  onChange={(e) => setRecurringSort(e.target.value as RecurringSortField)}
                  className="bg-transparent text-indigo-400 text-xs font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="streak">{isFa ? 'بیشترین استریک' : 'Highest Streak'}</option>
                  <option value="due">{isFa ? 'سررسید نزدیک‌تر' : 'Next Due'}</option>
                  <option value="reward">{isFa ? 'بیشترین پاداش' : 'Most Rewards'}</option>
                  <option value="name">{isFa ? 'نام (الفبا)' : 'Name'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recurring Tasks List */}
          {filteredAndSortedRecurringTasks.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-800/40 border border-slate-750 text-center flex flex-col items-center justify-center gap-3">
              <Repeat className="w-10 h-10 text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {isFa ? 'تسک تکرارشونده‌ای یافت نشد.' : 'No recurring tasks found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAndSortedRecurringTasks.map((task) => {
                const streak = task.recurringStreak || 0;
                const recType = task.recurrence?.type || 'daily';

                let recurrenceLabel = isFa ? 'روزانه' : 'Daily';
                if (recType === 'weekdays') recurrenceLabel = isFa ? 'روزهای کاری' : 'Weekdays';
                if (recType === 'weekly') recurrenceLabel = isFa ? 'هفتگی' : 'Weekly';
                if (recType === 'monthly') recurrenceLabel = isFa ? 'ماهانه' : 'Monthly';

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black px-2.5 py-0.8 rounded-lg bg-indigo-950/90 text-indigo-300 border border-indigo-700 flex items-center gap-1">
                            <Repeat className="w-3 h-3 text-indigo-400" />
                            <span>{recurrenceLabel}</span>
                          </span>

                          {task.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-750 text-slate-300 border border-slate-700">
                              {task.category}
                            </span>
                          )}
                        </div>

                        {/* Streak Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-0.8 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-bold">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {formatNumber(streak, language)} {isFa ? 'استریک چرخه' : 'cycles'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 mt-1">
                        <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white leading-snug">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-750 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>+{formatNumber((task.rewardCoins ?? 5) * (streak + 1), language)}</span>
                        </span>
                        <span className="text-purple-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+{formatNumber((task.rewardXp ?? 2) * (streak + 1), language)} XP</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectTask(task.id);
                          setSubTab('individual');
                        }}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>{isFa ? 'مشاهده آمار تمرکز' : 'View Focus Stats'}</span>
                        <ChevronRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: ALL TASKS FOCUS LOGS & POMODORO TIMELINE (TASK-ONLY) */}
      {/* ===================================================================== */}
      {subTab === 'focusLogs' && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-4.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-300 border border-emerald-700 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {isFa ? 'تاریخچه و تایم‌لاین تمام دوره‌های پومودورو تسک‌ها' : 'All Tasks Focus Sessions & Activity Logs'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isFa
                    ? 'پایش جامع دوره‌های تمرکز کامل و ناقص صرف‌شده روی تسک‌ها، با تفکیک ثانیه و دقیقه'
                    : 'Exact minutes and seconds spent on tasks, completed 25m vs partial sessions'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 border border-emerald-800/80 font-bold">
                {formatNumber(allTasksFocusStats.totalSessions, language)} {isFa ? 'جلسه تمرکز تسک' : 'task sessions'}
              </span>
            </div>
          </div>

          {/* 4 Aggregate Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isFa ? 'کل زمان تمرکز تسک‌ها' : 'Total Task Time'}</span>
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-1">
                {formatPomodoroDuration(allTasksFocusStats.totalSeconds, language, true)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                {formatNumber(allTasksFocusStats.totalMinutes, language)} {isFa ? 'دقیقه کل' : 'total minutes'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isFa ? 'دوره‌های کامل ۲۵+ دقیقه' : 'Completed 25m+'}</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatNumber(allTasksFocusStats.fullCycles, language)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">{isFa ? 'سشن‌های استاندارد' : 'Standard 25m'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isFa ? 'دوره‌های ناقص / زودهنگام' : 'Early Finished'}</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1">
                {formatNumber(allTasksFocusStats.partialCycles, language)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">{isFa ? 'سشن‌های پایان‌یافته' : 'Early exit'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{isFa ? 'پاداش سکه‌های تمرکز' : 'Coins Earned'}</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1">
                +{formatNumber(allTasksFocusStats.totalCoins, language)} 🪙
              </span>
              <span className="text-[10px] text-slate-400 mt-1">{isFa ? 'پاداش سشن‌های تمرکز' : 'Focus rewards'}</span>
            </div>
          </div>

          {/* Filter Bar for Focus Logs */}
          <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-750 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto" />
              <input
                type="text"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                placeholder={isFa ? 'جستجو در جلسات تمرکز تسک...' : 'Search focus sessions...'}
                className="w-full bg-slate-850 text-white text-xs rounded-xl border border-slate-700 pr-8 pl-3 rtl:pr-8 rtl:pl-3 ltr:pl-8 ltr:pr-3 py-1.5 focus:outline-hidden focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Task Selector Filter */}
              <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logsTaskFilter}
                  onChange={(e) => setLogsTaskFilter(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all">{isFa ? 'همه تسک‌ها' : 'All Tasks'}</option>
                  {tasks.map((tItem) => (
                    <option key={tItem.id} value={tItem.id}>
                      {tItem.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cycle Status Filter */}
              <div className="flex items-center gap-1 bg-slate-850 px-2.5 py-1.5 rounded-xl border border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={logsStatusFilter}
                  onChange={(e) => setLogsStatusFilter(e.target.value as 'all' | 'full' | 'partial')}
                  className="bg-transparent text-emerald-400 text-xs font-bold focus:outline-hidden cursor-pointer"
                >
                  <option value="all">{isFa ? 'همه دوره‌ها (کامل و ناقص)' : 'All Cycles'}</option>
                  <option value="full">{isFa ? 'فقط دوره‌های کامل (۲۵+ دقیقه)' : 'Full Cycles Only'}</option>
                  <option value="partial">{isFa ? 'فقط دوره‌های ناقص / زودهنگام' : 'Early Finished Only'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pomodoro Focus Sessions List (Filtered to Tasks Only) */}
          {filteredTaskPomodoroSessions.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-800/40 border border-slate-750 text-center flex flex-col items-center justify-center gap-3">
              <Timer className="w-10 h-10 text-slate-500" />
              <p className="text-sm font-bold text-slate-300">
                {isFa
                  ? 'هنوز جلسه تمرکز پومودورو برای تسک‌ها ثبت نشده است.'
                  : 'No task focus sessions logged yet.'}
              </p>
              <p className="text-xs text-slate-400">
                {isFa
                  ? 'با اجرای پومودورو برای هر تسک، دوره‌ها و جزئیات دقیق آن در این بخش ثبت می‌شود.'
                  : 'Start a Pomodoro session targeted at any task to see it logged here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="divide-y divide-slate-750 max-h-96 overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-850/70">
                {filteredTaskPomodoroSessions.map((ses) => {
                  const isFull = ses.isCompletedFull || ses.durationMinutes >= 25;
                  const durSec = typeof ses.durationSeconds === 'number' && ses.durationSeconds > 0
                    ? ses.durationSeconds
                    : (ses.durationMinutes || 0) * 60;

                  return (
                    <div
                      key={ses.id}
                      className="p-3 hover:bg-slate-800/60 transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isFull ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white truncate">
                              {ses.targetName || ses.targetTitle || (isFa ? 'تسک بدون نام' : 'Task')}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                              {isFa ? 'تسک' : 'Task'}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                                isFull
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {isFull ? (isFa ? 'تکمیل ۲۵دقیقه 🏆' : 'Completed 25m 🏆') : (isFa ? 'پایان زودهنگام ⚡' : 'Early Finished ⚡')}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{ses.completedAt ? formatDateStringToPersianShort(ses.completedAt) : ''}</span>
                            {ses.time && <span className="font-mono">ساعت {toPersianDigits(ses.time)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="font-bold text-emerald-300">
                          {formatPomodoroDuration(durSec, language, true)}
                        </span>
                        {ses.rewardCoinsEarned && ses.rewardCoinsEarned > 0 ? (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-950/60 border border-amber-800 px-1.5 py-0.2 rounded-md">
                            +{formatNumber(ses.rewardCoinsEarned, language)} 🪙
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
