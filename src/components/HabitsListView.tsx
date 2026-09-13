import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Zap, 
  Flame, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpDown, 
  LayoutGrid, 
  List, 
  Timer,
  Trash2,
  Info
} from 'lucide-react';
import { Habit, Language } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { getTodayString } from '../utils/persianDate';
import { calculateHabitStats } from '../utils/habitMath';
import { HabitCard } from './HabitCard';

interface HabitsListViewProps {
  habits: Habit[];
  language: Language;
  onToggleDay: (habitId: string, dateStr: string) => void;
  onRequestDelete: (habit: Habit) => void;
  onOpenAddModal: () => void;
  onOpenScienceModal: () => void;
  onToggleAllToday?: () => void;
  onOpenPomodoro?: (habit: Habit) => void;
}

type HabitFilterType = 'all' | 'pending' | 'completed' | 'forming' | 'stabilizing' | 'established' | 'top_streaks';
type HabitSortType = 'default' | 'automaticity' | 'streak' | 'name' | 'newest';

export const HabitsListView: React.FC<HabitsListViewProps> = ({
  habits,
  language,
  onToggleDay,
  onRequestDelete,
  onOpenAddModal,
  onOpenScienceModal,
  onOpenPomodoro,
}) => {
  const t = translations[language];
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<HabitFilterType>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<HabitSortType>('default');
  const [isCompactView, setIsCompactView] = useState(false);

  // Extract unique categories
  const categories = Array.from(new Set(habits.map((h) => h.category).filter(Boolean))) as string[];

  // Calculate habit stats for filtering & KPIs
  const habitStatsMap = new Map<string, ReturnType<typeof calculateHabitStats>>();
  habits.forEach((h) => {
    habitStatsMap.set(h.id, calculateHabitStats(h, todayStr, language));
  });

  const totalHabits = habits.length;
  const completedHabits = habits.filter((h) => !!h.history[todayStr]).length;
  const pendingHabits = totalHabits - completedHabits;

  // Filter habits
  const filteredHabits = habits.filter((habit) => {
    const stats = habitStatsMap.get(habit.id);
    const isDoneToday = !!habit.history[todayStr];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = habit.name.toLowerCase().includes(q);
      const matchCat = (habit.category || '').toLowerCase().includes(q);
      const matchWhy = (habit.why || '').toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchWhy) return false;
    }

    // Status / Stage filter
    if (selectedFilter === 'pending' && isDoneToday) return false;
    if (selectedFilter === 'completed' && !isDoneToday) return false;
    if (selectedFilter === 'forming' && stats?.stage !== 'forming' && (stats?.effectiveT || 0) > 21) return false;
    if (selectedFilter === 'stabilizing' && stats?.stage !== 'semi') return false;
    if (selectedFilter === 'established' && (stats?.automaticity || 0) < 66 && stats?.stage !== 'automatic') return false;
    if (selectedFilter === 'top_streaks' && (stats?.currentStreak || 0) < 3) return false;

    // Category filter
    if (selectedCategory !== 'all' && habit.category !== selectedCategory) return false;

    return true;
  });

  // Sort habits
  const sortedHabits = [...filteredHabits].sort((a, b) => {
    const statsA = habitStatsMap.get(a.id);
    const statsB = habitStatsMap.get(b.id);

    if (sortOption === 'automaticity') {
      return (statsB?.automaticity || 0) - (statsA?.automaticity || 0);
    }
    if (sortOption === 'streak') {
      return (statsB?.currentStreak || 0) - (statsA?.currentStreak || 0);
    }
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortOption === 'newest') {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }
    return 0;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 🌟 HABITS MANAGEMENT & CONTROL BOX */}
      <div 
        id="habits-management-box"
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-5 transition-all"
      >
        {/* Banner Header: Title & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black shadow-inner shrink-0">
              <Zap className="w-6 h-6 fill-orange-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {isFa ? 'مدیریت عادات و روتین‌های ۶۶ روزه' : isAr ? 'إدارة العادات والروتينات ٦٦ يوماً' : 'Habits & 66-Day Routines Manager'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                  {t.scientificModelBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFa 
                  ? 'کنترل، فیلتر پیشرفته، دسته‌بندی و ثبت هوشمند مسیر خودکارسازی رفتاری'
                  : 'Manage, filter, categorize, and track behavioral automaticity'}
              </p>
            </div>
          </div>

          {/* Action Buttons & Compact View Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Toggle View Mode Button */}
            <button
              type="button"
              onClick={() => setIsCompactView(!isCompactView)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isCompactView
                  ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title={isFa ? (isCompactView ? 'سوئیچ به نمای کارتی کامل' : 'سوئیچ به نمای فشرده تک‌خطی') : 'Toggle Compact View'}
            >
              {isCompactView ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              <span>{isCompactView ? (isFa ? 'نمای کارتی' : 'Card View') : (isFa ? 'نمای فشرده' : 'Compact View')}</span>
            </button>

            <button
              id="open-add-habit-btn"
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newHabitBtn}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="habit-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFa ? 'جستجو در نام عادات، دسته‌بندی یا دلیل انجام...' : 'Search habits, tags, or why...'}
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {/* Pending Today */}
            <button
              id="filter-habit-pending-btn"
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
                {formatNumber(pendingHabits, language)}
              </span>
            </button>

            {/* Completed Today */}
            <button
              id="filter-habit-completed-btn"
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
                {formatNumber(completedHabits, language)}
              </span>
            </button>

            {/* Top Streaks */}
            <button
              id="filter-habit-streaks-btn"
              type="button"
              onClick={() => setSelectedFilter('top_streaks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'top_streaks'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>{isFa ? 'بیشترین زنجیره' : 'Top Streaks'}</span>
            </button>

            {/* Established */}
            <button
              id="filter-habit-established-btn"
              type="button"
              onClick={() => setSelectedFilter('established')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'established'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-purple-300" />
              <span>{isFa ? 'تثبیت‌شده (۶۶٪+)' : 'Established'}</span>
            </button>

            {/* All */}
            <button
              id="filter-habit-all-btn"
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{t.filterAll}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedFilter === 'all' ? 'bg-slate-800 dark:bg-slate-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {formatNumber(totalHabits, language)}
              </span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as HabitSortType)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="default">{isFa ? 'ترتیب پیش‌فرض' : 'Default Order'}</option>
              <option value="automaticity">{isFa ? 'بیشترین خودکارسازی' : 'Highest Automaticity'}</option>
              <option value="streak">{isFa ? 'بیشترین زنجیره (Streak)' : 'Longest Streak'}</option>
              <option value="name">{isFa ? 'بر اساس نام' : 'By Name'}</option>
              <option value="newest">{isFa ? 'جدیدترین عادات' : 'Newest'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Habits Content Container with Smart Scrollbar */}
      {sortedHabits.length > 0 ? (
        <div className="relative">
          <div className="max-h-[640px] overflow-y-auto custom-scrollbar pr-1 pl-1 pb-4">
            {isCompactView ? (
              /* Compact Dense View */
              <div className="flex flex-col gap-2">
                {sortedHabits.map((habit) => {
                  const stats = habitStatsMap.get(habit.id);
                  const isDoneToday = !!habit.history[todayStr];

                  return (
                    <div
                      key={habit.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all gap-3 ${
                        isDoneToday
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleDay(habit.id, todayStr)}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition cursor-pointer shrink-0 ${
                            isDoneToday
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-orange-500 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isDoneToday ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-base">{habit.icon || '⚡'}</span>}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold truncate ${
                              isDoneToday ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                            }`}>
                              {habit.name}
                            </span>
                            {habit.category && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {habit.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1 text-orange-500 font-semibold">
                              <Flame className="w-3 h-3" />
                              {formatNumber(stats?.currentStreak || 0, language)} روز
                            </span>
                            <span>•</span>
                            <span className="text-blue-500 font-semibold">
                              {formatNumber(stats?.automaticity || 0, language)}٪ خودکار
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenPomodoro && (
                          <button
                            type="button"
                            onClick={() => onOpenPomodoro(habit)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 transition"
                            title={isFa ? 'شروع پومودورو' : 'Pomodoro'}
                          >
                            <Timer className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenScienceModal()}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                          title={isFa ? 'اطلاعات علمی' : 'Science Info'}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(habit)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                          title={isFa ? 'حذف عادت' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleDay(habit.id, todayStr)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isDoneToday
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDoneToday ? (isFa ? 'انجام شد' : 'Done') : (isFa ? 'ثبت' : 'Check')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Standard Full Card Grid */
              <div id="habits-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    language={language}
                    onToggleDay={onToggleDay}
                    onRequestDelete={onRequestDelete}
                    onOpenInfo={onOpenScienceModal}
                    onOpenPomodoro={onOpenPomodoro}
                  />
                ))}
              </div>
            )}
          </div>
          {sortedHabits.length > 4 && (
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
          )}
        </div>
      ) : selectedFilter === 'pending' && habits.length > 0 && completedHabits === totalHabits ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-slate-900 rounded-3xl p-8 text-center border border-green-200 dark:border-green-800/50 shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-green-900 dark:text-green-300">
            {t.allDoneTodayTitle}
          </h3>
          <p className="text-xs text-green-800/80 dark:text-green-200/70 max-w-md leading-relaxed">
            {t.allDoneTodayDesc}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              id="view-completed-today-btn"
              type="button"
              onClick={() => setSelectedFilter('completed')}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-500 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.viewCompletedHabitsBtn} ({formatNumber(completedHabits, language)})</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {habits.length === 0 ? t.noHabitsYet : t.noHabitsFiltered}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {t.noHabitsSubtext}
          </p>
          {habits.length === 0 && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newHabitBtn}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
