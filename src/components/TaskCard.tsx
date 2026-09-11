import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Coins, 
  Zap, 
  AlertCircle, 
  Tag,
  CheckSquare,
  Square,
  Repeat,
  RotateCw,
  Timer
} from 'lucide-react';
import { Task, TaskPriority, TaskSubtask, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { 
  getTodayString, 
  getRelativeDueDateInfo, 
  formatDateStringToPersian, 
  getRecurrenceDescription,
  toPersianDigits 
} from '../utils/persianDate';

interface TaskCardProps {
  task: Task;
  language: Language;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, subtaskTitle: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenPomodoro?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  language,
  onToggleComplete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onEditTask,
  onDeleteTask,
  onOpenPomodoro,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtaskInput, setShowAddSubtaskInput] = useState(false);

  const t = translations[language];
  const todayStr = getTodayString();

  const isRecurringCompletedToday = !!(task.isRecurring && (task.lastCompletedDate === todayStr || (task.claimedRewardDates && task.claimedRewardDates.includes(todayStr))));
  const isRewardAlreadyClaimed = !task.isRecurring && !!(task.rewardClaimed || (task.claimedRewardDates && task.claimedRewardDates.length > 0));

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const hasSubtasks = subtasks.length > 0;
  const subtasksPercent = hasSubtasks ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  // Format priority colors & labels
  const getPriorityInfo = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return {
          label: t.priorityHigh,
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'medium':
        return {
          label: t.priorityMedium,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'low':
      default:
        return {
          label: t.priorityLow,
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          dot: 'bg-blue-500',
        };
    }
  };

  const priorityInfo = getPriorityInfo(task.priority);

  // Smart Due date status
  const relativeDateInfo = task.dueDate ? getRelativeDueDateInfo(task.dueDate, todayStr) : null;
  const fullPersianDate = task.dueDate ? formatDateStringToPersian(task.dueDate) : '';

  const getDueDateStyle = () => {
    if (!relativeDateInfo) return null;
    if (relativeDateInfo.isOverdue) {
      return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 animate-pulse';
    }
    if (relativeDateInfo.isToday) {
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50';
    }
    if (relativeDateInfo.isTomorrow) {
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50';
    }
    return 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  const recurrenceDesc = task.isRecurring ? getRecurrenceDescription(task.recurrence, language) : '';

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setShowAddSubtaskInput(false);
  };

  return (
    <div
      id={`task-card-${task.id}`}
      className={`group relative rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
        task.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 opacity-80'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
      }`}
    >
      {/* Accent Color Strip on Top */}
      <div 
        className={`h-1 w-full transition-all ${
          task.completed
            ? 'bg-emerald-500/60'
            : task.isRecurring
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
            : task.priority === 'high'
            ? 'bg-rose-500'
            : task.priority === 'medium'
            ? 'bg-amber-500'
            : 'bg-blue-500'
        }`}
      />

      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Top Row: Checkbox, Title, Priority Badge & Actions */}
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox and Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              id={`task-check-btn-${task.id}`}
              type="button"
              onClick={() => onToggleComplete(task.id)}
              className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                task.completed
                  ? 'bg-emerald-500 text-white shadow-xs scale-105'
                  : isRecurringCompletedToday
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 text-transparent hover:text-slate-300'
              }`}
              title={
                task.isRecurring
                  ? isRecurringCompletedToday
                    ? (language === 'fa' ? `این تسک برای امروز تکمیل شده است (موعد بعدی: ${fullPersianDate || task.dueDate})` : `Completed for today (next: ${task.dueDate})`)
                    : (language === 'fa' ? 'تکمیل چرخه فعلی و انتقال به موعد بعدی' : 'Complete cycle & advance')
                  : task.completed
                  ? t.taskCompleted
                  : t.markDoneToday
              }
            >
              <CheckCircle2 className={`w-4 h-4 ${task.completed || isRecurringCompletedToday ? 'opacity-100' : 'opacity-0'}`} />
            </button>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  onClick={() => onToggleComplete(task.id)}
                  className={`text-sm sm:text-base font-bold cursor-pointer select-none transition-all break-words ${
                    task.completed
                      ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                      : 'text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}
                >
                  {task.title}
                </h3>

                {/* Recurring Indicator Pill */}
                {task.isRecurring && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60"
                    title={recurrenceDesc}
                  >
                    <Repeat className="w-2.5 h-2.5" />
                    <span>{recurrenceDesc || t.recurringTaskBadge}</span>
                  </span>
                )}

                {/* Completed Recurring Cycles streak */}
                {task.isRecurring && (task.recurringStreak || 0) > 0 && (
                  <span 
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60"
                    title={`${toPersianDigits(task.recurringStreak || 0)} بار با موفقیت تکرار شده است`}
                  >
                    <RotateCw className="w-2.5 h-2.5" />
                    <span>{formatNumber(task.recurringStreak || 0, language)} {language === 'fa' ? 'چرخه' : 'cycles'}</span>
                  </span>
                )}

                {/* Done Today badge for recurring task */}
                {isRecurringCompletedToday && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                    title={language === 'fa' ? 'سکه و پاداش چرخه امروز دریافت شده است' : 'Today cycle reward claimed'}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    <span>{language === 'fa' ? 'انجام‌شده برای امروز' : 'Done for today'}</span>
                  </span>
                )}
              </div>

              {task.description && (
                <p className={`text-xs leading-relaxed line-clamp-2 ${
                  task.completed ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Top Actions: Pomodoro, Edit, Delete */}
          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
            {onOpenPomodoro && (
              <button
                id={`task-pomodoro-btn-${task.id}`}
                type="button"
                onClick={() => onOpenPomodoro(task)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                title={t.pomodoroStartForTask || 'شروع پومودورو برای این تسک'}
                aria-label="Start Pomodoro"
              >
                <Timer className="w-4 h-4" />
              </button>
            )}
            <button
              id={`task-edit-btn-${task.id}`}
              type="button"
              onClick={() => onEditTask(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={t.editTaskTitle}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              id={`task-delete-btn-${task.id}`}
              type="button"
              onClick={() => onDeleteTask(task.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title={t.deleteTaskConfirm}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Metadata Badges: Category, Priority, Due Date, Time, Rewards */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Priority Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${priorityInfo.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
            <span>{priorityInfo.label}</span>
          </span>

          {/* Category Badge */}
          {task.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{task.category}</span>
            </span>
          )}

          {/* Due Date Badge with Smart Relative & Persian format */}
          {relativeDateInfo && (
            <span 
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] border cursor-help ${getDueDateStyle()}`}
              title={`تاریخ دقیق شمسی: ${fullPersianDate}`}
            >
              <Calendar className="w-3 h-3" />
              <span>{relativeDateInfo.label}</span>
              {task.dueDate && !relativeDateInfo.isToday && !relativeDateInfo.isTomorrow && (
                <span className="text-[10px] opacity-75 font-mono">({fullPersianDate})</span>
              )}
            </span>
          )}

          {/* Due Time */}
          {task.dueTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{task.dueTime}</span>
            </span>
          )}

          {/* Focus Time Badge (if logged) */}
          {!!task.totalFocusMinutes && task.totalFocusMinutes > 0 && (
            <span 
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/40"
              title={t.pomodoroTotalFocusTime || 'مجموع زمان تمرکز'}
            >
              <Timer className="w-3 h-3" />
              <span>{formatNumber(task.totalFocusMinutes, language)} {t.pomodoroMinuteShort}</span>
            </span>
          )}

          {/* Rewards Badge */}
          <div className="ms-auto flex items-center gap-2">
            <span 
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${
                (task.completed || isRewardAlreadyClaimed || isRecurringCompletedToday)
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40'
              }`} 
              title={(task.completed || isRewardAlreadyClaimed || isRecurringCompletedToday) ? (language === 'fa' ? 'پاداش سکه دریافت شده (یک‌بار در هر دوره)' : 'Reward claimed (once per cycle)') : 'سکه پاداش'}
            >
              <Coins className="w-3 h-3" />
              <span>+{formatNumber(task.rewardCoins ?? 5, language)}</span>
            </span>
            <span 
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${
                (task.completed || isRewardAlreadyClaimed || isRecurringCompletedToday)
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40'
              }`} 
              title={(task.completed || isRewardAlreadyClaimed || isRecurringCompletedToday) ? (language === 'fa' ? 'امتیاز تجربه دریافت شده' : 'XP claimed') : 'امتیاز تجربه XP'}
            >
              <Zap className="w-3 h-3" />
              <span>+{formatNumber(task.rewardXp ?? 2, language)} XP</span>
            </span>
          </div>
        </div>

        {/* Subtasks Section (Checklist) */}
        {hasSubtasks && (
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {/* Progress Bar & Collapse Button */}
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {t.subtasksCompletedRatio} {formatNumber(completedSubtasks, language)} / {formatNumber(subtasks.length, language)}
                </span>
                <div className="flex-1 max-w-[120px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${subtasksPercent}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isExpanded ? (language === 'fa' ? 'بستن مراحل' : 'Hide') : (language === 'fa' ? 'مشاهده مراحل' : 'Show')}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Expanded Subtasks Checklist */}
            {isExpanded && (
              <div className="flex flex-col gap-1.5 pt-2 pl-2 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                {subtasks.map((subtask) => (
                  <div 
                    key={subtask.id}
                    className="flex items-center justify-between gap-2 text-xs py-1 group/sub"
                  >
                    <div 
                      onClick={() => onToggleSubtask(task.id, subtask.id)}
                      className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                    >
                      <button
                        type="button"
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${
                          subtask.completed 
                            ? 'bg-emerald-500 text-white' 
                            : 'border border-slate-300 dark:border-slate-600 text-transparent'
                        }`}
                      >
                        <CheckSquare className="w-3 h-3" />
                      </button>
                      <span className={`${
                        subtask.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                      }`}>
                        {subtask.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(task.id, subtask.id)}
                      className="opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-rose-500 transition p-0.5 cursor-pointer"
                      title="حذف زیرتسک"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Quick Add Subtask Input Form */}
                {showAddSubtaskInput ? (
                  <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      placeholder={t.subtaskPlaceholder}
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      autoFocus
                      className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition cursor-pointer"
                    >
                      {language === 'fa' ? 'ثبت' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSubtaskInput(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddSubtaskInput(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1 mt-1 cursor-pointer w-fit"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.addSubtaskBtn}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Add Subtask if has no subtasks yet */}
        {!hasSubtasks && isExpanded && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t.subtaskPlaceholder}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition cursor-pointer"
              >
                {t.addSubtaskBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
