import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Minus,
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Coins, 
  Zap, 
  AlertCircle,
  ListTodo,
  CheckCircle2,
  Sliders,
  Sparkles,
  Repeat,
  RotateCw,
  CalendarDays,
  Award
} from 'lucide-react';
import { Task, TaskPriority, TaskSubtask, TaskRecurrence, TaskRecurrenceType, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { 
  getTodayString, 
  addDaysToDate, 
  addMonthsToDate, 
  dateStringToJalali, 
  jalaliToDateString, 
  formatDateStringToPersian,
  getRelativeDueDateInfo,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAY_NAMES,
  toPersianDigits
} from '../utils/persianDate';
import { TASK_PRESETS } from '../data/defaultTasks';

interface AddTaskModalProps {
  isOpen: boolean;
  language: Language;
  taskToEdit?: Task | null;
  onClose: () => void;
  onSaveTask: (task: Task) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  language,
  taskToEdit,
  onClose,
  onSaveTask,
}) => {
  const t = translations[language];
  const todayStr = getTodayString();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('');
  
  // Due date states
  const [dueDateType, setDueDateType] = useState<'today' | 'tomorrow' | 'in2days' | 'nextWeek' | 'nextMonth' | 'none' | 'custom'>('today');
  const [selectedDueDate, setSelectedDueDate] = useState<string>(todayStr);
  const [dueTime, setDueTime] = useState('');

  // Shamsi picker components
  const todayJalali = dateStringToJalali(todayStr);
  const [shamsiYear, setShamsiYear] = useState<number>(todayJalali.jy);
  const [shamsiMonth, setShamsiMonth] = useState<number>(todayJalali.jm);
  const [shamsiDay, setShamsiDay] = useState<number>(todayJalali.jd);

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceType, setRecurrenceType] = useState<TaskRecurrenceType>('daily');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([6, 0, 1, 2, 3]); // Sat-Wed by default

  const [rewardCoins, setRewardCoins] = useState<number>(5);
  const [rewardXp, setRewardXp] = useState<number>(2);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [error, setError] = useState('');

  // Handle typing input for Coins with strict limit <= 10
  const handleCoinsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const engStr = rawVal.replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
                         .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
                         .replace(/[^0-9]/g, '');
    if (engStr === '') {
      setRewardCoins(1);
      return;
    }
    const num = parseInt(engStr, 10);
    if (!isNaN(num)) {
      setRewardCoins(Math.min(10, Math.max(1, num)));
    }
  };

  // Handle typing input for XP with strict limit <= 5
  const handleXpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const engStr = rawVal.replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
                         .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
                         .replace(/[^0-9]/g, '');
    if (engStr === '') {
      setRewardXp(1);
      return;
    }
    const num = parseInt(engStr, 10);
    if (!isNaN(num)) {
      setRewardXp(Math.min(5, Math.max(1, num)));
    }
  };

  // Populate when editing or resetting
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority || 'medium');
      setCategory(taskToEdit.category || '');
      
      if (!taskToEdit.dueDate) {
        setDueDateType('none');
        setSelectedDueDate('');
      } else if (taskToEdit.dueDate === todayStr) {
        setDueDateType('today');
        setSelectedDueDate(todayStr);
      } else if (taskToEdit.dueDate === addDaysToDate(todayStr, 1)) {
        setDueDateType('tomorrow');
        setSelectedDueDate(taskToEdit.dueDate);
      } else if (taskToEdit.dueDate === addDaysToDate(todayStr, 2)) {
        setDueDateType('in2days');
        setSelectedDueDate(taskToEdit.dueDate);
      } else if (taskToEdit.dueDate === addDaysToDate(todayStr, 7)) {
        setDueDateType('nextWeek');
        setSelectedDueDate(taskToEdit.dueDate);
      } else {
        setDueDateType('custom');
        setSelectedDueDate(taskToEdit.dueDate);
      }

      if (taskToEdit.dueDate) {
        const j = dateStringToJalali(taskToEdit.dueDate);
        setShamsiYear(j.jy);
        setShamsiMonth(j.jm);
        setShamsiDay(j.jd);
      }

      setDueTime(taskToEdit.dueTime || '');

      // Recurrence
      if (taskToEdit.isRecurring && taskToEdit.recurrence) {
        setIsRecurring(true);
        setRecurrenceType(taskToEdit.recurrence.type || 'daily');
        setRecurrenceInterval(taskToEdit.recurrence.interval || 1);
        setRecurrenceUnit(taskToEdit.recurrence.unit || 'days');
        setRecurrenceDaysOfWeek(taskToEdit.recurrence.daysOfWeek || [6, 0, 1, 2, 3]);
      } else {
        setIsRecurring(false);
        setRecurrenceType('daily');
        setRecurrenceInterval(1);
        setRecurrenceUnit('days');
        setRecurrenceDaysOfWeek([6, 0, 1, 2, 3]);
      }

      setRewardCoins(Math.min(10, Math.max(1, taskToEdit.rewardCoins ?? 5)));
      setRewardXp(Math.min(5, Math.max(1, taskToEdit.rewardXp ?? 2)));
      setSubtasks(taskToEdit.subtasks ? [...taskToEdit.subtasks] : []);
    } else {
      // Reset defaults for new task
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory(language === 'fa' ? 'شخصی' : language === 'ar' ? 'شخصي' : 'Personal');
      setDueDateType('today');
      setSelectedDueDate(todayStr);
      const j = dateStringToJalali(todayStr);
      setShamsiYear(j.jy);
      setShamsiMonth(j.jm);
      setShamsiDay(j.jd);
      setDueTime('');
      setIsRecurring(false);
      setRecurrenceType('daily');
      setRecurrenceInterval(1);
      setRecurrenceUnit('days');
      setRecurrenceDaysOfWeek([6, 0, 1, 2, 3]);
      setRewardCoins(5);
      setRewardXp(2);
      setSubtasks([]);
    }
    setError('');
  }, [taskToEdit, isOpen, language, todayStr]);

  if (!isOpen) return null;

  const quickCategories = language === 'fa' 
    ? ['کاری', 'شخصی', 'پروژه', 'مطالعه', 'سلامت', 'خرید', 'توسعه فردی', 'ورزش']
    : language === 'ar'
    ? ['عمل', 'شخصي', 'مشروع', 'دراسة', 'صحة', 'تسوق', 'تطوير الذات', 'رياضة']
    : ['Work', 'Personal', 'Project', 'Study', 'Health', 'Shopping', 'Self-Growth', 'Fitness'];

  const handleSelectDueDatePreset = (type: 'today' | 'tomorrow' | 'in2days' | 'nextWeek' | 'nextMonth' | 'none' | 'custom') => {
    setDueDateType(type);
    let targetDate = '';
    if (type === 'today') {
      targetDate = todayStr;
    } else if (type === 'tomorrow') {
      targetDate = addDaysToDate(todayStr, 1);
    } else if (type === 'in2days') {
      targetDate = addDaysToDate(todayStr, 2);
    } else if (type === 'nextWeek') {
      targetDate = addDaysToDate(todayStr, 7);
    } else if (type === 'nextMonth') {
      targetDate = addMonthsToDate(todayStr, 1);
    } else if (type === 'none') {
      targetDate = '';
    } else if (type === 'custom') {
      targetDate = selectedDueDate || todayStr;
    }

    if (targetDate) {
      setSelectedDueDate(targetDate);
      const j = dateStringToJalali(targetDate);
      setShamsiYear(j.jy);
      setShamsiMonth(j.jm);
      setShamsiDay(j.jd);
    } else if (type === 'none') {
      setSelectedDueDate('');
    }
  };

  const handleUpdateShamsiDate = (newYear: number, newMonth: number, newDay: number) => {
    setShamsiYear(newYear);
    setShamsiMonth(newMonth);
    // adjust max days
    const maxDays = newMonth <= 6 ? 31 : newMonth <= 11 ? 30 : 29;
    const safeDay = Math.min(newDay, maxDays);
    setShamsiDay(safeDay);
    const gregorianStr = jalaliToDateString(newYear, newMonth, safeDay);
    setSelectedDueDate(gregorianStr);
    setDueDateType('custom');
  };

  const handleDirectDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDueDate(val);
    setDueDateType('custom');
    if (val) {
      const j = dateStringToJalali(val);
      setShamsiYear(j.jy);
      setShamsiMonth(j.jm);
      setShamsiDay(j.jd);
    }
  };

  const handleToggleWeekday = (dayKey: number) => {
    setRecurrenceDaysOfWeek((prev) => {
      if (prev.includes(dayKey)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((d) => d !== dayKey);
      } else {
        return [...prev, dayKey].sort((a, b) => a - b);
      }
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: newSubtaskInput.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApplyPreset = (preset: typeof TASK_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    setRewardCoins(preset.rewardCoins);
    setRewardXp(preset.rewardXp);
    if (preset.subtasks) {
      setSubtasks(preset.subtasks.map((s) => ({ ...s, id: 'sub-' + Math.random().toString(36).substring(2, 6) })));
    }
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.taskTitleError);
      return;
    }

    let finalDueDate: string | undefined = undefined;
    if (dueDateType !== 'none' && selectedDueDate.trim()) {
      finalDueDate = selectedDueDate.trim();
    }

    let recurrencePayload: TaskRecurrence | undefined = undefined;
    if (isRecurring) {
      recurrencePayload = {
        type: recurrenceType,
        interval: recurrenceInterval > 0 ? recurrenceInterval : 1,
        unit: recurrenceType === 'custom' ? recurrenceUnit : undefined,
        daysOfWeek: recurrenceType === 'weekly' ? recurrenceDaysOfWeek : undefined,
        endType: 'never',
      };
    }

    const taskPayload: Task = {
      id: taskToEdit ? taskToEdit.id : 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category: category.trim() || undefined,
      dueDate: finalDueDate,
      dueTime: dueTime.trim() || undefined,
      completed: taskToEdit ? taskToEdit.completed : false,
      completedAt: taskToEdit ? taskToEdit.completedAt : undefined,
      createdAt: taskToEdit ? taskToEdit.createdAt : todayStr,
      rewardCoins: Math.min(10, Math.max(1, Number(rewardCoins) || 5)),
      rewardXp: Math.min(5, Math.max(1, Number(rewardXp) || 2)),
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      isRecurring: isRecurring,
      recurrence: recurrencePayload,
      recurringStreak: taskToEdit?.recurringStreak || 0,
      lastCompletedDate: taskToEdit?.lastCompletedDate,
    };

    onSaveTask(taskPayload);
    onClose();
  };

  const relativeDateInfo = selectedDueDate ? getRelativeDueDateInfo(selectedDueDate, todayStr) : null;

  // Generate Year options (current Jalali year +/- 3)
  const currentJYear = todayJalali.jy;
  const yearOptions = [currentJYear - 1, currentJYear, currentJYear + 1, currentJYear + 2, currentJYear + 3];

  // Days in selected Shamsi month
  const daysInMonth = shamsiMonth <= 6 ? 31 : shamsiMonth <= 11 ? 30 : 29;
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div 
      dir={t.dir}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                {taskToEdit ? t.editTaskTitle : t.createTaskTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {taskToEdit ? t.submitSaveTask : (language === 'fa' ? 'امکان تعیین موعد با هر تاریخ دلخواه و ساخت تسک‌های تکرارشونده' : t.createTaskSubtitle)}
              </p>
            </div>
          </div>

          <button
            id="close-add-task-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Presets (only for new tasks) */}
          {!taskToEdit && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'fa' ? 'پیش‌نهادهای سریع و متداول:' : 'Quick Presets:'}</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TASK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.taskTitleLabel} <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              placeholder={t.taskTitlePlaceholder}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Task Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.taskDescLabel}
            </label>
            <textarea
              id="task-desc-input"
              placeholder={t.taskDescPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs leading-relaxed resize-none"
            />
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Priority Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t.taskPriorityLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'high'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{t.priorityHigh}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('medium')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t.priorityMedium}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('low')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === 'low'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{t.priorityLow}</span>
                </button>
              </div>
            </div>

            {/* Category & Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.taskCategoryLabel}</span>
              </label>
              <input
                type="text"
                placeholder={t.taskCategoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-1 mt-0.5">
                {quickCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      category === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* Due Date & Custom Calendar Selection (Any Date Allowed)   */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <span>{t.taskDueDateLabel}</span>
                <span className="text-[10px] font-normal text-slate-400">({language === 'fa' ? 'امکان تعیین هر تاریخ دلخواه' : 'Select any date'})</span>
              </label>

              {selectedDueDate && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                  {formatDateStringToPersian(selectedDueDate)}
                </span>
              )}
            </div>

            {/* Fast Presets Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('today')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'today'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                ⚡ {t.taskDueToday}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('tomorrow')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'tomorrow'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                📅 {t.taskDueTomorrow}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('in2days')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'in2days'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                🗓️ {t.taskDueIn2Days}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('nextWeek')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'nextWeek'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                📆 {t.taskDueNextWeek}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('nextMonth')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'nextMonth'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                📅 {t.taskDueNextMonth}
              </button>

              <button
                type="button"
                onClick={() => handleSelectDueDatePreset('none')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                  dueDateType === 'none'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                🚫 {t.taskDueNoDate}
              </button>
            </div>

            {/* Custom Shamsi Date Selector & Calendar Picker */}
            {dueDateType !== 'none' && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t.taskDatePickerTitle}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {language === 'fa' ? 'انتخاب سال، ماه و روز شمسی یا تقویم میلادی' : 'Select Shamsi or Gregorian date'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {/* Shamsi Year */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      {t.taskShamsiYear}
                    </label>
                    <select
                      value={shamsiYear}
                      onChange={(e) => handleUpdateShamsiDate(Number(e.target.value), shamsiMonth, shamsiDay)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {toPersianDigits(y)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shamsi Month */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      {t.taskShamsiMonth}
                    </label>
                    <select
                      value={shamsiMonth}
                      onChange={(e) => handleUpdateShamsiDate(shamsiYear, Number(e.target.value), shamsiDay)}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {toPersianDigits(idx + 1)} - {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shamsi Day */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      {t.taskShamsiDay}
                    </label>
                    <select
                      value={shamsiDay}
                      onChange={(e) => handleUpdateShamsiDate(shamsiYear, shamsiMonth, Number(e.target.value))}
                      className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {dayOptions.map((d) => (
                        <option key={d} value={d}>
                          {toPersianDigits(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Direct Gregorian Date Picker & Time Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                      <span>{language === 'fa' ? 'انتخاب از تقویم پیش‌فرض سیستم (میلادی):' : 'System Gregorian Date:'}</span>
                    </label>
                    <input
                      type="date"
                      value={selectedDueDate}
                      onChange={handleDirectDateInputChange}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Due Time */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>{t.taskDueTimeLabel} ({language === 'fa' ? 'ساعت انجام' : 'Time'}):</span>
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Selected Date Summary Banner */}
                {selectedDueDate && relativeDateInfo && (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                    <span className="text-indigo-950 dark:text-indigo-200 font-medium flex items-center gap-1.5">
                      <span>📌 {t.taskSelectedDatePreview}</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {formatDateStringToPersian(selectedDueDate)}
                      </strong>
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      {relativeDateInfo.label}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* Recurring Task Builder Section (تسک‌های تکرارشونده)      */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Repeat className={`w-4 h-4 ${isRecurring ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span>{t.recurringTaskToggle}</span>
                </span>
              </label>

              {isRecurring && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                  {t.recurringTaskBadge}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.recurringTaskDesc}
            </p>

            {/* Recurrence Options when active */}
            {isRecurring && (
              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-3">
                {/* Frequency selector buttons */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {t.recurrenceFrequencyLabel}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecurrenceType('daily')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                        recurrenceType === 'daily'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      🔄 {t.recurrenceDaily}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecurrenceType('weekdays')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                        recurrenceType === 'weekdays'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      💼 {t.recurrenceWeekdays}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecurrenceType('weekly')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                        recurrenceType === 'weekly'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      📅 {t.recurrenceWeekly}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecurrenceType('monthly')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition cursor-pointer text-center ${
                        recurrenceType === 'monthly'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      🗓️ {t.recurrenceMonthly}
                    </button>
                  </div>
                </div>

                {/* If Weekly: Weekdays Chip Selector */}
                {recurrenceType === 'weekly' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {t.recurrenceDaysOfWeekLabel}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PERSIAN_WEEKDAY_NAMES.map((w) => {
                        const isSelected = recurrenceDaysOfWeek.includes(w.key);
                        return (
                          <button
                            key={w.key}
                            type="button"
                            onClick={() => handleToggleWeekday(w.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                            }`}
                          >
                            {w.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recurrence Interval */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t.recurrenceIntervalLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRecurrenceInterval((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold px-2 text-indigo-600 dark:text-indigo-400">
                      {formatNumber(recurrenceInterval, language)} {recurrenceType === 'monthly' ? (language === 'fa' ? 'ماه' : 'Month') : recurrenceType === 'weekly' ? (language === 'fa' ? 'هفته' : 'Week') : (language === 'fa' ? 'روز' : 'Day')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecurrenceInterval((prev) => prev + 1)}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Recurrence Summary Message */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    {recurrenceType === 'daily' && (recurrenceInterval === 1 ? (language === 'fa' ? 'این تسک هر روز به صورت خودکار تکرار خواهد شد.' : 'Repeats daily.') : (language === 'fa' ? `این تسک هر ${toPersianDigits(recurrenceInterval)} روز یک‌بار تکرار خواهد شد.` : `Repeats every ${recurrenceInterval} days.`))}
                    {recurrenceType === 'weekdays' && (language === 'fa' ? 'این تسک در روزهای کاری (شنبه تا چهارشنبه) تکرار خواهد شد.' : 'Repeats on weekdays.')}
                    {recurrenceType === 'weekly' && (language === 'fa' ? `این تسک هر هفته در روزهای (${recurrenceDaysOfWeek.map(d => PERSIAN_WEEKDAY_NAMES.find(w => w.key === d)?.label).join('، ')}) تکرار خواهد شد.` : 'Repeats weekly on selected days.')}
                    {recurrenceType === 'monthly' && (recurrenceInterval === 1 ? (language === 'fa' ? 'این تسک به صورت ماهانه در همین روز تکرار خواهد شد.' : 'Repeats monthly.') : (language === 'fa' ? `این تسک هر ${toPersianDigits(recurrenceInterval)} ماه یک‌بار تکرار خواهد شد.` : `Repeats every ${recurrenceInterval} months.`))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Subtasks Checklist */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.taskSubtasksLabel}
            </label>

            {/* List of subtasks */}
            {subtasks.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-1">
                {subtasks.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">{idx + 1}.</span>
                      <span>{s.title}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(s.id)}
                      className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t.subtaskPlaceholder}
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addSubtaskBtn}</span>
              </button>
            </div>
          </div>

          {/* Gamification Coins & XP Direct Typing Settings (Max 10 Coins, Max 5 XP) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Coins Typed Input (1 to 10) */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/40 dark:to-amber-900/20 rounded-2xl border border-amber-300/40 dark:border-amber-700/40 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <label htmlFor="task-reward-coins-input" className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.taskRewardCoinsLabel}
                    </label>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    +{formatNumber(rewardCoins, language)} {language === 'fa' ? 'سکه' : 'coins'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {language === 'fa' ? 'تایپ عدد سکه دلخواه (حداقل ۱ و سقف مجاز: ۱۰ سکه)' : 'Type coin amount (Min 1, Max allowed: 10 coins)'}
                </p>
              </div>

              {/* Number Input with Stepper Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRewardCoins(prev => Math.max(1, prev - 1))}
                  disabled={rewardCoins <= 1}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 shadow-xs"
                  title={language === 'fa' ? 'کاهش سکه' : 'Decrease coins'}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="relative flex-1">
                  <input
                    id="task-reward-coins-input"
                    type="number"
                    min={1}
                    max={10}
                    value={rewardCoins}
                    onChange={handleCoinsInputChange}
                    onBlur={() => {
                      if (!rewardCoins || rewardCoins < 1) setRewardCoins(1);
                      else if (rewardCoins > 10) setRewardCoins(10);
                    }}
                    className="w-full h-10 px-3 text-center text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                    placeholder="1-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 pointer-events-none">
                    🪙
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setRewardCoins(prev => Math.min(10, prev + 1))}
                  disabled={rewardCoins >= 10}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 shadow-xs"
                  title={language === 'fa' ? 'افزایش سکه' : 'Increase coins'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* XP Typed Input (1 to 5) */}
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-600/5 dark:from-blue-950/40 dark:to-indigo-900/20 rounded-2xl border border-blue-300/40 dark:border-blue-700/40 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <label htmlFor="task-reward-xp-input" className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.taskRewardXpLabel}
                    </label>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    +{formatNumber(rewardXp, language)} XP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {language === 'fa' ? 'تایپ امتیاز XP دلخواه (حداقل ۱ و سقف مجاز: ۵ XP)' : 'Type XP amount (Min 1, Max allowed: 5 XP)'}
                </p>
              </div>

              {/* Number Input with Stepper Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRewardXp(prev => Math.max(1, prev - 1))}
                  disabled={rewardXp <= 1}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 shadow-xs"
                  title={language === 'fa' ? 'کاهش امتیاز' : 'Decrease XP'}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="relative flex-1">
                  <input
                    id="task-reward-xp-input"
                    type="number"
                    min={1}
                    max={5}
                    value={rewardXp}
                    onChange={handleXpInputChange}
                    onBlur={() => {
                      if (!rewardXp || rewardXp < 1) setRewardXp(1);
                      else if (rewardXp > 5) setRewardXp(5);
                    }}
                    className="w-full h-10 px-3 text-center text-sm font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    placeholder="1-5"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-500 pointer-events-none">
                    ⚡
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setRewardXp(prev => Math.min(5, prev + 1))}
                  disabled={rewardXp >= 5}
                  className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950/60 disabled:opacity-30 disabled:pointer-events-none text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0 shadow-xs"
                  title={language === 'fa' ? 'افزایش امتیاز' : 'Increase XP'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="submit-save-task-btn"
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{taskToEdit ? t.submitSaveTask : t.submitCreateTask}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
