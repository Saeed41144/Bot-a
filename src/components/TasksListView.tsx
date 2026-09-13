import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ListTodo, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  Timer, 
  Calendar, 
  Trash2, 
  Edit3
} from 'lucide-react';
import { Task, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';
import { TaskCard } from './TaskCard';

interface TasksListViewProps {
  appearance?: any;
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
  appearance,
}) => {
  const t = translations[language];
  const todayStr = getTodayString();
  const isFa = language === 'fa';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'completed' | 'high' | 'today' | 'recurring'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCompactView, setIsCompactView] = useState(false);

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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  return (
    <div className="flex flex-col gap-6">
      {/* Task Management & Control Header */}
      <div 
        style={appearance?.cardBoxStyle}
        className={`rounded-3xl p-5 sm:p-6 border shadow-2xs flex flex-col gap-5 transition-all overflow-hidden ${
          appearance?.cardBoxClass || 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        } ${appearance?.shadowClass || 'shadow-2xs'}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shadow-inner shrink-0">
              <ListTodo className="w-6 h-6 fill-blue-500/20" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                {t.tasksNavTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFa 
                  ? 'سازماندهی تسک‌ها، اولویت‌بندی، وظایف تکرارشونده و مدیریت زمان' 
                  : 'Manage daily tasks, priorities, recurring jobs, and focus'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Toggle View Mode Button */}
            <button
              type="button"
              onClick={() => setIsCompactView(!isCompactView)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isCompactView
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title={isFa ? (isCompactView ? 'سوئیچ به نمای کارتی کامل' : 'سوئیچ به نمای فشرده تک‌خطی') : 'Toggle Compact View'}
            >
              {isCompactView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span>{isCompactView ? (isFa ? 'نمای کارتی' : 'Card View') : (isFa ? 'نمای فشرده' : 'Compact View')}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createTaskTitle}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFa ? 'جستجو در عنوان، توضیحات یا دسته‌بندی تسک‌ها...' : 'Search tasks...'}
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {/* Pending */}
            <button
              type="button"
              onClick={() => setSelectedFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'pending'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{t.filterPending}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedFilter === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {formatNumber(pendingTasks, language)}
              </span>
            </button>

            {/* Completed */}
            <button
              type="button"
              onClick={() => setSelectedFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{t.filterCompleted}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {formatNumber(completedTasks, language)}
              </span>
            </button>

            {/* High Priority */}
            <button
              type="button"
              onClick={() => setSelectedFilter('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'high'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{isFa ? 'اولویت بالا' : 'High Priority'}</span>
            </button>

            {/* Due Today */}
            <button
              type="button"
              onClick={() => setSelectedFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'today'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{isFa ? 'سررسید امروز' : 'Today'}</span>
            </button>

            {/* All */}
            <button
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
                {isFa ? 'همه دسته‌ها' : 'All Tags'}
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
      </div>

      {/* Task Content Container with Smart Scrollbar */}
      {filteredTasks.length > 0 ? (
        <div className="relative">
          <div className={`${appearance?.maxHeightClass || 'max-h-[640px] sm:max-h-[720px]'} overflow-y-auto custom-scrollbar pr-1 pl-1 pb-4`}>
            {isCompactView ? (
              /* Compact Dense View */
              <div className="flex flex-col gap-2">
                {filteredTasks.map((task) => {
                  const isDone = Boolean(task.completed);
                  return (
                    <div
                      key={task.id}
                      style={appearance?.cardBoxStyle}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all gap-3 shrink-0 ${
                        isDone
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                          : (appearance?.cardBoxClass || 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800') + ' hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task.id)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition cursor-pointer shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold truncate ${
                              isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                            }`}>
                              {task.title}
                            </span>
                            {task.priority && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                                task.priority === 'high' 
                                   ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' 
                                  : task.priority === 'medium'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {task.priority === 'high' ? (isFa ? 'فوری' : 'High') : task.priority === 'medium' ? (isFa ? 'متوسط' : 'Med') : (isFa ? 'عادی' : 'Low')}
                              </span>
                            )}
                          </div>
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{task.dueDate}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenPomodoro && (
                          <button
                            type="button"
                            onClick={() => onOpenPomodoro(task)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                            title={isFa ? 'شروع پومودورو' : 'Pomodoro'}
                          >
                            <Timer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title={isFa ? 'ویرایش تسک' : 'Edit'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                          title={isFa ? 'حذف تسک' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isDone
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDone ? (isFa ? 'تکمیل شد' : 'Done') : (isFa ? 'انجام' : 'Check')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Standard Full Card Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    language={language}
                    appearance={appearance}
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
            )}
          </div>
          {filteredTasks.length > 4 && (
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
          )}
        </div>
      ) : selectedFilter === 'pending' && tasks.length > 0 && completedTasks === totalTasks ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-slate-900 rounded-3xl p-8 text-center border border-green-200 dark:border-green-800/50 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-green-900 dark:text-green-300">
            {isFa ? '🎉 تمام تسک‌های برنامه‌ریزی‌شده انجام شدند!' : '🎉 All Tasks Completed!'}
          </h3>
          <p className="text-xs text-green-800/80 dark:text-green-200/70 max-w-md leading-relaxed">
            {isFa 
              ? 'تبریک! تمام تسک‌های فعال شما تیک خوردند و پاداش سکه و XP به حسابتان اضافه شد.' 
              : 'Great job! All your action items are completed.'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setSelectedFilter('completed')}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-500 transition cursor-pointer"
            >
              {isFa ? 'مشاهده تسک‌های تکمیل‌شده' : 'View Completed Tasks'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <ListTodo className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {tasks.length === 0 ? t.noTasksYet : t.noTasksFiltered}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {tasks.length === 0 
              ? (isFa ? 'هنوز هیچ وظیفه‌ای ثبت نکرده‌اید. با دکمه زیر اولین تسک خود را اضافه کنید.' : 'No tasks added yet.')
              : (isFa ? 'هیچ تسکی با فیلتر انتخابی شما مطابقت ندارد.' : 'No tasks match filter.')}
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
