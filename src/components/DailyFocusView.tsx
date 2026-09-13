import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  ListTodo, 
  Flame, 
  Zap, 
  Plus, 
  TrendingUp, 
  Clock, 
  Coins, 
  Target, 
  Award, 
  LayoutGrid, 
  List, 
  Timer, 
  ChevronDown
} from 'lucide-react';
import { Habit, Task, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';
import { calculateAchievements, AchievementsOverview } from '../utils/achievements';
import { HabitCard } from './HabitCard';
import { TaskCard } from './TaskCard';

interface DailyFocusViewProps {
  appearance?: any;
  habits: Habit[];
  tasks: Task[];
  language: Language;
  achievementsOverview?: AchievementsOverview;
  onOpenAchievements?: () => void;
  onOpenBrainLevels?: () => void;
  onToggleHabit: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (habit: Habit) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onOpenAddHabit: () => void;
  onOpenAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenPomodoroForHabit?: (habit: Habit) => void;
  onOpenPomodoroForTask?: (task: Task) => void;
}

export const DailyFocusView: React.FC<DailyFocusViewProps> = ({
  habits,
  tasks,
  language,
  onToggleHabit,
  onDeleteHabit,
  onToggleTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onOpenAddHabit,
  onOpenAddTask,
  onEditTask,
  onDeleteTask,
  onOpenPomodoroForHabit,
  onOpenPomodoroForTask,
  appearance,
}) => {
  const t = translations[language];
  const todayStr = getTodayString();
  const isFa = language === 'fa';

  // Toggle states for compact/expanded views
  const [isHabitsCompact, setIsHabitsCompact] = useState(false);
  const [isTasksCompact, setIsTasksCompact] = useState(false);

  // Habit metrics
  const totalHabits = habits.length;
  const completedHabitsList = habits.filter((h) => h.history && h.history[todayStr]);
  const completedHabits = completedHabitsList.length;
  const pendingHabitsList = habits.filter((h) => !h.history || !h.history[todayStr]);

  // Task helper: check if task was completed for today
  const isTaskCompletedToday = (t: Task) => {
    if (t.isRecurring) {
      return t.lastCompletedDate === todayStr || (Array.isArray(t.claimedRewardDates) && t.claimedRewardDates.includes(todayStr));
    }
    return Boolean(t.completed);
  };

  // Task metrics (due today, overdue pending, with no specific due date, or completed today)
  const todayTasks = tasks.filter((t) => {
    if (t.isRecurring) {
      const isDoneToday = isTaskCompletedToday(t);
      return isDoneToday || !t.dueDate || t.dueDate === todayStr || t.dueDate < todayStr;
    }
    return !t.dueDate || t.dueDate === todayStr || (!t.completed && t.dueDate < todayStr) || (t.completed && t.completedAt && new Date(t.completedAt).toISOString().split('T')[0] === todayStr);
  });
  const totalTasksCount = todayTasks.length;
  const completedTasksList = todayTasks.filter(isTaskCompletedToday);
  const completedTasksCount = completedTasksList.length;
  const pendingTasksList = todayTasks.filter((t) => !isTaskCompletedToday(t));

  // Combined score
  const totalDailyItems = totalHabits + totalTasksCount;
  const totalDailyCompleted = completedHabits + completedTasksCount;
  const dailyFocusPercentage = totalDailyItems > 0 
    ? Math.round((totalDailyCompleted / totalDailyItems) * 100) 
    : 0;

  // Habits and Tasks progress percentages
  const habitsPercentage = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
  const tasksPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Today's coins and XP earned
  const coinsEarnedToday = completedHabitsList.reduce((acc, h) => acc + (h.rewardCoins ?? 10), 0) +
                           completedTasksList.reduce((acc, task) => acc + (task.rewardCoins ?? 5), 0);
  const xpEarnedToday = completedHabitsList.reduce((acc, h) => acc + (h.rewardXp ?? 4), 0) +
                        completedTasksList.reduce((acc, task) => acc + (task.rewardXp ?? 2), 0);

  // Motivational message
  const getMotivationalMessage = () => {
    if (totalDailyItems === 0) {
      return isFa 
        ? 'هنوز عادتی یا تسکی برای امروز تعریف نشده است. با دکمه‌های زیر اولین مورد را اضافه کنید!' 
        : 'No habits or tasks defined for today yet. Use the buttons below to get started!';
    }
    if (dailyFocusPercentage === 100) {
      return isFa
        ? 'فوق‌العاده است! تمام برنامه‌ها و عادات امروز را کامل انجام دادید. روزتان را فتح کردید! 🏆'
        : 'Spectacular! You have completed all scheduled habits and tasks for today. Day conquered! 🏆';
    }
    if (dailyFocusPercentage >= 70) {
      return isFa
        ? 'عملکرد عالی! تنها چند گام کوچک تا تکمیل ۱۰۰٪ تمام برنامه‌های امروز فاصله دارید ⚡'
        : 'Amazing progress! Just a few more steps to achieve 100% daily completion ⚡';
    }
    if (dailyFocusPercentage >= 35) {
      return isFa
        ? 'مسیر خوبی را طی کرده‌اید؛ تمرکزتان را حفظ کنید و باقی کارهای روز را جلو ببرید 🎯'
        : 'Great momentum! Keep your focus and knock out the remaining items for today 🎯';
    }
    return isFa
      ? 'روز تازه با فرصت‌های نو! با انجام اولین عادت یا تسک انرژی امروزتان را آزاد کنید ✨'
      : 'A fresh day full of opportunities! Check off your first habit or task to build momentum ✨';
  };

  // SVG Circular Gauge calculation
  const circleRadius = 38;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (dailyFocusPercentage / 100) * circleCircumference;

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Progress Focus Header Box */}
      <div className={`relative overflow-hidden rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-100 flex flex-col gap-5 ${appearance?.headerBoxClass || "bg-slate-900 border border-slate-800"}`}>
        {/* Subtle Ambient Glow Effects */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges & Meta Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800/90 text-cyan-300 border border-cyan-500/30 shadow-xs backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {t.dailyFocusNavTitle}
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80 backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {todayStr}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {dailyFocusPercentage === 100 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isFa ? 'تکمیل ۱۰۰٪ روز' : '100% Completed'}
              </span>
            ) : dailyFocusPercentage >= 50 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                <TrendingUp className="w-3.5 h-3.5" />
                {isFa ? 'بیش از نیمی انجام شد' : 'Over 50% Done'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                {isFa ? 'در حال پیشبرد روز' : 'In Progress'}
              </span>
            )}
          </div>
        </div>

        {/* Main Content: Headline + Circular Progress Ring */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Text & Motivational Info */}
          <div className="flex flex-col gap-2.5 max-w-xl text-right">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{isFa ? 'پیشرفت و تمرکز کل روز' : 'Daily Overall Focus & Progress'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {getMotivationalMessage()}
            </p>
          </div>

          {/* Circular SVG Gauge in Dark Container */}
          <div className="relative shrink-0 flex items-center justify-center p-3 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={circleRadius}
                fill="none"
                stroke="#1e293b"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r={circleRadius}
                fill="none"
                stroke="url(#progressGradientFocus)"
                strokeWidth="8"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="progressGradientFocus" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {formatNumber(dailyFocusPercentage, language)}٪
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {isFa ? 'پیشرفت' : 'Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Dark Metric Stat Cards at Bottom */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
          {/* Habits Status Card */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">
                  {t.habitsNavTitle}
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {formatNumber(completedHabits, language)} از {formatNumber(totalHabits, language)} {isFa ? 'عادت' : 'habits'}
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
              {formatNumber(habitsPercentage, language)}٪
            </span>
          </div>

          {/* Tasks Status Card */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ListTodo className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">
                  {t.tasksNavTitle}
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {formatNumber(completedTasksCount, language)} از {formatNumber(totalTasksCount, language)} {isFa ? 'تسک' : 'tasks'}
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
              {formatNumber(tasksPercentage, language)}٪
            </span>
          </div>

          {/* Rewards Earned Today Card */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-slate-400">
                  {isFa ? 'دستاورد امروز' : 'Today Rewards'}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    +{formatNumber(coinsEarnedToday, language)}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-blue-400 flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    +{formatNumber(xpEarnedToday, language)} XP
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              🪙⚡
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Habits on Left, Tasks on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Today's Habits */}
        <div 
          style={appearance?.cardBoxStyle}
          className={`rounded-3xl p-5 border flex flex-col gap-4 ${
            appearance?.cardBoxClass || 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          } ${appearance?.shadowClass || 'shadow-2xs'}`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                  {t.habitsNavTitle}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingHabitsList.length > 0
                    ? (isFa
                        ? `${formatNumber(pendingHabitsList.length, language)} عادت باقی‌مانده (${formatNumber(completedHabits, language)} انجام شده)`
                        : `${formatNumber(pendingHabitsList.length, language)} remaining (${formatNumber(completedHabits, language)} done)`)
                    : totalHabits > 0
                    ? (isFa
                        ? `تمام ${formatNumber(totalHabits, language)} عادت امروز انجام شد 🎉`
                        : `All ${formatNumber(totalHabits, language)} habits done today 🎉`)
                    : (isFa ? 'بدون عادت ثبت شده' : 'No habits yet')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Compact Toggle Button */}
              {pendingHabitsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsHabitsCompact(!isHabitsCompact)}
                  className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    isHabitsCompact
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                  title={isFa ? (isHabitsCompact ? 'تغییر به نمای کارتی' : 'تغییر به نمای فشرده') : 'Toggle View Mode'}
                >
                  {isHabitsCompact ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">{isHabitsCompact ? (isFa ? 'کارتی' : 'Cards') : (isFa ? 'فشرده' : 'Compact')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenAddHabit}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.newHabitBtn}</span>
              </button>
            </div>
          </div>

          {/* Habits List Container with Smart Max-Height & Custom Scrollbar */}
          {pendingHabitsList.length > 0 ? (
            <div className="relative">
              <div className={`${appearance?.maxHeightClass || 'max-h-[460px] sm:max-h-[520px]'} overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1 pl-1 pb-2`}>
                {pendingHabitsList.map((habit) => {
                  if (isHabitsCompact) {
                    return (
                      <div
                        key={habit.id}
                        style={appearance?.cardBoxStyle}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border hover:border-orange-300 transition-all gap-2 shrink-0 ${
                          appearance?.cardBoxClass || 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-750'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleHabit(habit.id, todayStr)}
                            className="w-7 h-7 rounded-xl border-2 border-slate-300 dark:border-slate-600 hover:border-orange-500 dark:hover:border-orange-400 flex items-center justify-center transition cursor-pointer shrink-0"
                            title={isFa ? 'تیک زدن عادت' : 'Check Habit'}
                          >
                            <span className="text-xs">{habit.icon || '⚡'}</span>
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {habit.name}
                            </span>
                            {habit.category && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {habit.category}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenPomodoroForHabit && (
                            <button
                              type="button"
                              onClick={() => onOpenPomodoroForHabit(habit)}
                              className="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-700 transition"
                              title={isFa ? 'شروع پومودورو' : 'Start Pomodoro'}
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleHabit(habit.id, todayStr)}
                            className="px-2.5 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isFa ? 'ثبت' : 'Done'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      language={language}
                      appearance={appearance}
                      onToggleDay={onToggleHabit}
                      onRequestDelete={onDeleteHabit}
                      onOpenPomodoro={onOpenPomodoroForHabit}
                    />
                  );
                })}
              </div>
              {pendingHabitsList.length > 4 && (
                <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent rounded-b-3xl" />
              )}
            </div>
          ) : habits.length > 0 ? (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl p-6 text-center border border-emerald-200 dark:border-emerald-800/50 flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {isFa 
                  ? 'تمامی عادات امروز با موفقیت انجام شدند!' 
                  : 'All habits for today are completed!'}
              </span>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-xs leading-relaxed">
                {isFa
                  ? `آفرین! هر ${formatNumber(completedHabits, language)} عادت امروز ثبت شدند.`
                  : `Great work! All ${formatNumber(completedHabits, language)} habits are done.`}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
              <span className="text-xs text-slate-400">{t.noHabitsYet}</span>
              <button
                type="button"
                onClick={onOpenAddHabit}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.newHabitBtn}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Today's Tasks */}
        <div 
          style={appearance?.cardBoxStyle}
          className={`rounded-3xl p-5 border flex flex-col gap-4 ${
            appearance?.cardBoxClass || 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          } ${appearance?.shadowClass || 'shadow-2xs'}`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                  {t.tasksNavTitle}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {pendingTasksList.length > 0
                    ? (isFa
                        ? `${formatNumber(pendingTasksList.length, language)} تسک باقی‌مانده (${formatNumber(completedTasksCount, language)} انجام شده)`
                        : `${formatNumber(pendingTasksList.length, language)} remaining (${formatNumber(completedTasksCount, language)} done)`)
                    : totalTasksCount > 0
                    ? (isFa
                        ? `تمام ${formatNumber(totalTasksCount, language)} تسک امروز تکمیل شد ✨`
                        : `All ${formatNumber(totalTasksCount, language)} tasks done today ✨`)
                    : (isFa ? 'بدون تسک ثبت شده' : 'No tasks yet')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Compact Toggle Button */}
              {pendingTasksList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTasksCompact(!isTasksCompact)}
                  className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    isTasksCompact
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                  title={isFa ? (isTasksCompact ? 'تغییر به نمای کارتی' : 'تغییر به نمای فشرده') : 'Toggle View Mode'}
                >
                  {isTasksCompact ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">{isTasksCompact ? (isFa ? 'کارتی' : 'Cards') : (isFa ? 'فشرده' : 'Compact')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenAddTask}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.createTaskTitle}</span>
              </button>
            </div>
          </div>

          {/* Tasks List Container with Smart Max-Height & Custom Scrollbar */}
          {pendingTasksList.length > 0 ? (
            <div className="relative">
              <div className={`${appearance?.maxHeightClass || 'max-h-[460px] sm:max-h-[520px]'} overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1 pl-1 pb-2`}>
                {pendingTasksList.map((task) => {
                  if (isTasksCompact) {
                    return (
                      <div
                        key={task.id}
                        style={appearance?.cardBoxStyle}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border hover:border-blue-300 transition-all gap-2 shrink-0 ${
                          appearance?.cardBoxClass || 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-750'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 flex items-center justify-center transition cursor-pointer shrink-0"
                            title={isFa ? 'تیک زدن تسک' : 'Check Task'}
                          >
                            <span className="w-2.5 h-2.5 rounded-sm bg-transparent" />
                          </button>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {task.title}
                            </span>
                            {task.priority && (
                              <span className={`text-[10px] font-semibold ${
                                task.priority === 'high' ? 'text-rose-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-slate-400'
                              }`}>
                                {task.priority === 'high' ? (isFa ? 'اولویت بالا' : 'High') : task.priority === 'medium' ? (isFa ? 'متوسط' : 'Medium') : (isFa ? 'عادی' : 'Low')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenPomodoroForTask && (
                            <button
                              type="button"
                              onClick={() => onOpenPomodoroForTask(task)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                              title={isFa ? 'شروع پومودورو' : 'Start Pomodoro'}
                            >
                              <Timer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isFa ? 'انجام' : 'Done'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      language={language}
                      appearance={appearance}
                      onToggleComplete={onToggleTask}
                      onToggleSubtask={onToggleSubtask}
                      onAddSubtask={onAddSubtask}
                      onDeleteSubtask={onDeleteSubtask}
                      onEditTask={onEditTask}
                      onDeleteTask={onDeleteTask}
                      onOpenPomodoro={onOpenPomodoroForTask}
                    />
                  );
                })}
              </div>
              {pendingTasksList.length > 4 && (
                <div className="pointer-events-none absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white dark:from-slate-900 to-transparent rounded-b-3xl" />
              )}
            </div>
          ) : tasks.length > 0 ? (
            <div className="bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl p-6 text-center border border-blue-200 dark:border-blue-800/50 flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-blue-900 dark:text-blue-200">
                {isFa 
                  ? 'تمامی تسک‌های برنامه‌ریزی‌شده انجام شدند!' 
                  : 'All tasks completed!'}
              </span>
              <p className="text-xs text-blue-700 dark:text-blue-400 max-w-xs leading-relaxed">
                {isFa
                  ? `تبریک! تمام ${formatNumber(completedTasksCount, language)} تسک فعال با موفقیت تکمیل شدند.`
                  : `Great job! All ${formatNumber(completedTasksCount, language)} tasks are finished.`}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
              <span className="text-xs text-slate-400">{t.noTasksYet}</span>
              <button
                type="button"
                onClick={onOpenAddTask}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.createTaskTitle}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
