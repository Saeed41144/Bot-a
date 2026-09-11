import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  Sliders,
  Calendar,
  Zap,
  Coins,
  Repeat
} from 'lucide-react';
import { Task, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';
import { TaskCard } from './TaskCard';

interface TasksListViewProps {
  tasks: Task[];
  language: Language;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, subtaskTitle: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onOpenAddModal: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onQuickAddTask?: (title: string) => void;
  onOpenPomodoro?: (task: Task) => void;
}

export const TasksListView: React.FC<TasksListViewProps> = ({
  tasks,
  language,
  onToggleComplete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onOpenAddModal,
  onEditTask,
  onDeleteTask,
  onOpenPomodoro,
}) => {
  const t = translations[language];
  const todayStr = getTodayString();
  const isFa = language === 'fa';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'completed' | 'high' | 'today' | 'recurring'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories
  const categories = Array.from(new Set(tasks.map((t) => t.category).filter(Boolean))) as string[];

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search
    if (searchQuery.trim()) {
      const matchTitle = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDesc = (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = (task.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }

    // Status / Priority / Due / Recurring filters
    if (selectedFilter === 'pending' && task.completed) return false;
    if (selectedFilter === 'completed' && !task.completed) return false;
    if (selectedFilter === 'high' && task.priority !== 'high') return false;
    if (selectedFilter === 'today' && task.dueDate !== todayStr) return false;
    if (selectedFilter === 'recurring' && !task.isRecurring) return false;

    // Category filter
    if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;

    return true;
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayTasksCount = tasks.filter((t) => t.dueDate === todayStr).length;
  const recurringTasksCount = tasks.filter((t) => t.isRecurring).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner / Stats Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
              {t.tasksSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.tasksSectionSubtitle}
            </p>
          </div>
        </div>

        {/* Quick KPI stats & Main Add Task Button */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
            <span className="text-[10px] text-slate-400 block font-semibold">{t.filterTaskPending}</span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
              {formatNumber(pendingTasks, language)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
            <span className="text-[10px] text-slate-400 block font-semibold">{t.filterTaskCompleted}</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(completedTasks, language)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
            <span className="text-[10px] text-slate-400 block font-semibold">{t.tasksDoneSummary}</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              {formatNumber(completionRate, language)}٪
            </span>
          </div>

          <button
            id="open-add-task-modal-top-btn"
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createTaskTitle}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${t.dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
        <input
          id="search-tasks-input"
          type="text"
          placeholder={isFa ? 'جستجو در عنوان، توضیحات یا دسته‌بندی تسک‌ها...' : t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
            t.dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'
          }`}
        />
      </div>

      {/* Filters Bar: Status Tabs & Category Chips */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            id="filter-task-pending-btn"
            type="button"
            onClick={() => setSelectedFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'pending'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>{t.filterTaskPending}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedFilter === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {formatNumber(pendingTasks, language)}
            </span>
          </button>

          <button
            id="filter-task-today-btn"
            type="button"
            onClick={() => setSelectedFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{t.filterTaskToday}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedFilter === 'today' ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {formatNumber(todayTasksCount, language)}
            </span>
          </button>

          <button
            id="filter-task-recurring-btn"
            type="button"
            onClick={() => setSelectedFilter('recurring')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'recurring'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>{language === 'fa' ? 'تکرارشونده' : language === 'ar' ? 'المتكررة' : 'Recurring'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedFilter === 'recurring' ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {formatNumber(recurringTasksCount, language)}
            </span>
          </button>

          <button
            id="filter-task-high-btn"
            type="button"
            onClick={() => setSelectedFilter('high')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'high'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>{t.filterTaskHighPriority}</span>
          </button>

          <button
            id="filter-task-completed-btn"
            type="button"
            onClick={() => setSelectedFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>{t.filterTaskCompleted}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {formatNumber(completedTasks, language)}
            </span>
          </button>

          <button
            id="filter-task-all-btn"
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <span>{t.filterTaskAll}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
              selectedFilter === 'all' ? 'bg-slate-800 dark:bg-slate-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {formatNumber(totalTasks, language)}
            </span>
          </button>
        </div>

        {/* Category Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto max-w-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {language === 'fa' ? 'همه دسته‌ها' : 'All Tags'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task List / Grid */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              language={language}
              onToggleComplete={onToggleComplete}
              onToggleSubtask={onToggleSubtask}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onOpenPomodoro={onOpenPomodoro}
            />
          ))}
        </div>
      ) : selectedFilter === 'pending' && tasks.length > 0 && completedTasks === totalTasks ? (
        /* All Tasks Done Celebration */
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-slate-900 rounded-3xl p-8 text-center border border-green-200 dark:border-green-800/50 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-green-900 dark:text-green-300">
            {language === 'fa' ? '🎉 تمام تسک‌های برنامه‌ریزی‌شده انجام شدند!' : '🎉 All Tasks Completed!'}
          </h3>
          <p className="text-xs text-green-800/80 dark:text-green-200/70 max-w-md leading-relaxed">
            {language === 'fa' 
              ? 'تبریک! تمام تسک‌های فعال شما تیک خوردند و پاداش سکه و XP به حسابتان اضافه شد.' 
              : 'Great job! All your action items are completed.'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setSelectedFilter('completed')}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-500 transition cursor-pointer"
            >
              {language === 'fa' ? 'مشاهده تسک‌های تکمیل‌شده' : 'View Completed Tasks'}
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <ListTodo className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {tasks.length === 0 ? t.noTasksYet : t.noTasksFiltered}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {t.noTasksSubtext}
          </p>
          {tasks.length === 0 && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createTaskTitle}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
