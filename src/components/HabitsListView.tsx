import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Zap, 
  Flame, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Brain, 
  Sparkles, 
  Filter, 
  Sliders, 
  ArrowUpDown, 
  Award, 
  ShieldCheck, 
  Activity,
  Layers,
  CheckCheck
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
  onToggleAllToday,
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
  const totalAuto = habits.reduce((acc, h) => acc + (habitStatsMap.get(h.id)?.automaticity || 0), 0);
  const avgAutomaticity = totalHabits > 0 ? Math.round(totalAuto / totalHabits) : 0;
  const establishedCount = habits.filter((h) => (habitStatsMap.get(h.id)?.automaticity || 0) >= 66).length;

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
      {/* 🌟 HABITS MANAGEMENT & CONTROL BOX (باکس جامع مدیریت عادات) */}
      <div 
        id="habits-management-box"
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col gap-5 transition-all"
      >
        {/* Banner Header: Title, Description & KPI Cards */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shadow-inner shrink-0">
              <Zap className="w-6 h-6 fill-blue-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                  {isFa ? 'مدیریت عادات و روتین‌های ۶۶ روزه' : isAr ? 'إدارة العادات والروتينات ٦٦ يوماً' : 'Habits & 66-Day Routines Manager'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {t.scientificModelBadge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isFa 
                  ? 'کنترل، فیلتر پیشرفته، دسته‌بندی و ثبت هوشمند مسیر خودکارسازی رفتاری'
                  : isAr
                  ? 'التحكم والتصفية وتصنيف وتسجيل العادات اليومية'
                  : 'Manage, filter, categorize, and track behavioral automaticity'}
              </p>
            </div>
          </div>

          {/* Quick KPI Stats & Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Pending Today */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
              <span className="text-[10px] text-slate-400 block font-semibold">{t.filterPending}</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                {formatNumber(pendingHabits, language)}
              </span>
            </div>

            {/* Completed Today */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
              <span className="text-[10px] text-slate-400 block font-semibold">{t.filterCompleted}</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatNumber(completedHabits, language)}
              </span>
            </div>

            {/* Avg Automaticity */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750">
              <span className="text-[10px] text-slate-400 block font-semibold">{isFa ? 'میانگین خودکارسازی' : 'Avg Auto'}</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                {formatNumber(avgAutomaticity, language)}٪
              </span>
            </div>

            {/* Established Count */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-750 hidden sm:block">
              <span className="text-[10px] text-slate-400 block font-semibold">{isFa ? 'تثبیت‌شده' : 'Established'}</span>
              <span className="text-sm font-black text-amber-500 dark:text-amber-400">
                {formatNumber(establishedCount, language)}
              </span>
            </div>

            {/* Action Buttons */}
            {onToggleAllToday && pendingHabits > 0 && (
              <button
                type="button"
                onClick={onToggleAllToday}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                title={isFa ? 'ثبت تمام عادات باقی‌مانده امروز' : 'Mark all pending habits done today'}
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden md:inline">{isFa ? 'ثبت همه امروز' : 'Check All'}</span>
              </button>
            )}

            <button
              id="open-add-habit-modal-top-btn"
              type="button"
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.newHabitBtn}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${t.dir === 'rtl' ? 'right-3.5' : 'left-3.5'}`} />
          <input
            id="search-habits-input"
            type="text"
            placeholder={isFa ? 'جستجو در نام، هدف یا دسته‌بندی عادات...' : t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
              t.dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'
            }`}
          />
        </div>

        {/* Filter Toolbar: Status Chips, Category Filter, and Sorting */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Status / Stage Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {/* Pending Today */}
            <button
              id="filter-habit-pending-btn"
              type="button"
              onClick={() => setSelectedFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'pending'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
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
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
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
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-300" />
              <span>{isFa ? 'بیشترین زنجیره' : 'Top Streaks'}</span>
            </button>

            {/* Established 66+ Days */}
            <button
              id="filter-habit-established-btn"
              type="button"
              onClick={() => setSelectedFilter('established')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedFilter === 'established'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
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
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
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

          {/* Right Controls: Sort & Categories */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as HabitSortType)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="default">{isFa ? 'ترتیب پیش‌فرض' : 'Default Order'}</option>
                <option value="automaticity">{isFa ? 'بیشترین خودکارسازی' : 'Highest Automaticity'}</option>
                <option value="streak">{isFa ? 'بیشترین زنجیره (Streak)' : 'Longest Streak'}</option>
                <option value="name">{isFa ? 'بر اساس نام (الفبا)' : 'By Name (A-Z)'}</option>
                <option value="newest">{isFa ? 'جدیدترین عادات' : 'Newest'}</option>
              </select>
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
                  {isFa ? 'همه دسته‌ها' : 'All Categories'}
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
      </div>

      {/* Habits Grid / Cards Section */}
      {sortedHabits.length > 0 ? (
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
      ) : selectedFilter === 'pending' && habits.length > 0 && completedHabits === totalHabits ? (
        /* All Habits Completed Today Celebration Card */
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
        /* Empty State */
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
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
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
