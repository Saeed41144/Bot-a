import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
  Layers,
  ChevronRight,
  Info,
  Sparkles,
  BarChart3,
  CalendarDays,
  Flame,
  LayoutGrid,
  ListFilter,
  ArrowRight,
  Compass
} from 'lucide-react';
import { Habit, Language, ThemeMode } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { formatDateStringToPersian, getPersianMonthDay, getTodayString, toPersianDigits } from '../utils/persianDate';

interface YearlyMatrixViewProps {
  habits: Habit[];
  language: Language;
  theme: ThemeMode;
  selectedHabitId?: string;
  onSelectHabit?: (habitId: string) => void;
}

type ViewMode = 'all' | string; // 'all' or habitId
type YearScope = 'currentPersian' | 'rolling365' | 'currentGregorian';
type DisplayMode = 'focused' | 'allHabitsCards';

interface DayCellData {
  dateKey: string;
  dateObj: Date;
  isDone: boolean;
  doneCount: number;
  totalHabitsCount: number;
  completionPct: number;
  persianStr: string;
  persianMonth: number;
  persianDay: number;
  persianYear: number;
  weekdayIndex: number; // 0 for Saturday in Persian/RTL
  weekdayName: string;
  monthName: string;
  isFuture: boolean;
  isToday: boolean;
  weekIndex: number;
}

const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const ARABIC_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const GREGORIAN_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const PERSIAN_WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const PERSIAN_WEEKDAYS_FULL = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

const ENGLISH_WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const ENGLISH_WEEKDAYS_FULL = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Safe date key formatter matching local time
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Find exact Gregorian date range for the current Persian Solar Year (1 Farvardin to 29/30 Esfand)
function getPersianYearDateRange(refDate: Date): { startDate: Date; endDate: Date; persianYear: number } {
  const pInfo = getPersianMonthDay(refDate);
  const currentPersianYear = pInfo.year;
  const refYear = refDate.getFullYear();

  // Search for Farvardin 1 (month 1, day 1) in March
  let foundStart: Date | null = null;
  for (let y = refYear - 1; y <= refYear + 1; y++) {
    for (let dayOffset = -4; dayOffset <= 6; dayOffset++) {
      const test = new Date(y, 2, 20 + dayOffset, 12, 0, 0);
      const p = getPersianMonthDay(test);
      if (p.year === currentPersianYear && p.month === 1 && p.day === 1) {
        foundStart = test;
        break;
      }
    }
    if (foundStart) break;
  }

  const startDate = foundStart || new Date(refYear, 2, 21, 12, 0, 0);

  // Search for 1 Farvardin of NEXT year
  let foundNextStart: Date | null = null;
  for (let dayOffset = -4; dayOffset <= 6; dayOffset++) {
    const test = new Date(startDate.getFullYear() + 1, 2, 20 + dayOffset, 12, 0, 0);
    const p = getPersianMonthDay(test);
    if (p.year === currentPersianYear + 1 && p.month === 1 && p.day === 1) {
      foundNextStart = test;
      break;
    }
  }

  const nextStart = foundNextStart || new Date(startDate.getFullYear() + 1, 2, 21, 12, 0, 0);
  const endDate = new Date(nextStart);
  endDate.setDate(endDate.getDate() - 1);

  return { startDate, endDate, persianYear: currentPersianYear };
}

export const YearlyMatrixView: React.FC<YearlyMatrixViewProps> = ({
  habits,
  language,
  theme,
  selectedHabitId: initialSelectedHabitId,
  onSelectHabit,
}) => {
  const t = translations[language];
  const isRtl = t.dir === 'rtl';
  const todayStr = getTodayString();
  const todayDate = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [todayStr]);

  const [activeHabitId, setActiveHabitId] = useState<ViewMode>(
    initialSelectedHabitId && habits.some((h) => h.id === initialSelectedHabitId)
      ? initialSelectedHabitId
      : 'all'
  );

  const [displayMode, setDisplayMode] = useState<DisplayMode>('focused');

  // Default scope: 'currentPersian' in Persian mode, otherwise 'currentGregorian'
  const [yearScope, setYearScope] = useState<YearScope>(
    language === 'fa' ? 'currentPersian' : 'currentGregorian'
  );
  const [hoveredDay, setHoveredDay] = useState<DayCellData | null>(null);

  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLDivElement>(null);

  const selectedHabit = useMemo(() => {
    if (activeHabitId === 'all') return null;
    return habits.find((h) => h.id === activeHabitId) || habits[0] || null;
  }, [habits, activeHabitId]);

  // Generate 52/53 weeks matrix data
  const { weeksGrid, monthHeaders, yearlyStats, monthlyBreakdown, currentPersianYearNum, currentWeekIdx } = useMemo(() => {
    const days: DayCellData[] = [];
    const totalHabits = habits.length;

    let startDate: Date;
    let endDate: Date;
    let pYearNum = getPersianMonthDay(todayDate).year;

    if (yearScope === 'currentPersian') {
      const pRange = getPersianYearDateRange(todayDate);
      startDate = pRange.startDate;
      endDate = pRange.endDate;
      pYearNum = pRange.persianYear;
    } else if (yearScope === 'rolling365') {
      endDate = new Date(todayDate);
      startDate = new Date(todayDate);
      startDate.setDate(startDate.getDate() - 364);
    } else {
      // Current Gregorian year
      const curYear = todayDate.getFullYear();
      startDate = new Date(curYear, 0, 1, 12, 0, 0);
      endDate = new Date(curYear, 11, 31, 12, 0, 0);
    }

    // Align start date to the beginning of the week (Saturday for Persian/Iran calendar)
    // In JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    // In Persian calendar: Saturday is day 0
    const startDayOfWeek = (startDate.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, ... Friday = 6
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setDate(adjustedStartDate.getDate() - startDayOfWeek);

    // Calculate total days to generate to cover the full year (approx 53 weeks)
    const curDate = new Date(adjustedStartDate);
    const totalDaysToGen = 53 * 7; // 371 days
    let foundTodayWeekIdx = 0;

    for (let i = 0; i < totalDaysToGen; i++) {
      const dateKey = formatDateKey(curDate);
      const pInfo = getPersianMonthDay(curDate);
      const weekdayIdx = (curDate.getDay() + 1) % 7; // 0=Sat, 6=Fri
      const weekIdx = Math.floor(i / 7);

      let isDone = false;
      let doneCount = 0;

      if (activeHabitId === 'all') {
        doneCount = habits.filter((h) => !!h.history[dateKey]).length;
        isDone = doneCount > 0;
      } else if (selectedHabit) {
        isDone = !!selectedHabit.history[dateKey];
        doneCount = isDone ? 1 : 0;
      }

      const completionPct = totalHabits > 0 ? Math.round((doneCount / totalHabits) * 100) : 0;
      const isFuture = dateKey > todayStr;
      const isToday = dateKey === todayStr;

      if (isToday) {
        foundTodayWeekIdx = weekIdx;
      }

      let monthName = '';
      if (language === 'fa') {
        monthName = PERSIAN_MONTH_NAMES[(pInfo.month - 1 + 12) % 12];
      } else if (language === 'ar') {
        monthName = ARABIC_MONTH_NAMES[curDate.getMonth()];
      } else {
        monthName = GREGORIAN_MONTH_NAMES[curDate.getMonth()];
      }

      const weekdayName = language === 'fa'
        ? PERSIAN_WEEKDAYS_FULL[weekdayIdx]
        : language === 'ar'
        ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][weekdayIdx]
        : ENGLISH_WEEKDAYS_FULL[weekdayIdx];

      days.push({
        dateKey,
        dateObj: new Date(curDate),
        isDone,
        doneCount,
        totalHabitsCount: totalHabits,
        completionPct,
        persianStr: formatDateStringToPersian(dateKey),
        persianMonth: pInfo.month,
        persianDay: pInfo.day,
        persianYear: pInfo.year,
        weekdayIndex: weekdayIdx,
        weekdayName,
        monthName,
        isFuture,
        isToday,
        weekIndex: weekIdx,
      });

      curDate.setDate(curDate.getDate() + 1);
    }

    // Chunk into 53 weeks (columns), each week having 7 days (rows)
    const weeks: DayCellData[][] = [];
    for (let w = 0; w < 53; w++) {
      weeks.push(days.slice(w * 7, (w + 1) * 7));
    }

    // Determine month headers along the 53 weeks with exact grid columns
    const headers: { monthName: string; weekIndex: number; monthNum: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, wIdx) => {
      const midDay = week[3] || week[0];
      if (!midDay) return;
      const monthId = language === 'fa' ? midDay.persianMonth : midDay.dateObj.getMonth() + 1;
      if (monthId !== lastMonth) {
        headers.push({
          monthName: midDay.monthName,
          weekIndex: wIdx,
          monthNum: monthId,
        });
        lastMonth = monthId;
      }
    });

    // Compute Yearly Stats for non-future days
    const nonFutureDays = days.filter((d) => !d.isFuture && d.dateObj >= startDate && d.dateKey <= todayStr);
    const totalDaysCount = nonFutureDays.length || 1;
    
    let totalCompletedDays = 0;
    let longestStreak = 0;
    let curStreak = 0;
    let tempStreak = 0;

    // Weekday completion frequency (0=Sat to 6=Fri)
    const weekdayCompletions = [0, 0, 0, 0, 0, 0, 0];
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];

    // Initialize 12 Persian months or 12 Gregorian months in order
    const monthlyList: { monthNum: number; name: string; completed: number; total: number }[] = [];
    if (language === 'fa') {
      for (let m = 1; m <= 12; m++) {
        monthlyList.push({
          monthNum: m,
          name: PERSIAN_MONTH_NAMES[m - 1],
          completed: 0,
          total: 0,
        });
      }
    } else {
      for (let m = 0; m < 12; m++) {
        monthlyList.push({
          monthNum: m + 1,
          name: language === 'ar' ? ARABIC_MONTH_NAMES[m] : GREGORIAN_MONTH_NAMES[m],
          completed: 0,
          total: 0,
        });
      }
    }

    nonFutureDays.forEach((day) => {
      weekdayTotals[day.weekdayIndex] = (weekdayTotals[day.weekdayIndex] || 0) + 1;

      if (day.isDone) {
        totalCompletedDays++;
        weekdayCompletions[day.weekdayIndex] = (weekdayCompletions[day.weekdayIndex] || 0) + 1;
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      // Monthly breakdown
      const targetMonthIndex = language === 'fa' ? day.persianMonth - 1 : day.dateObj.getMonth();
      if (monthlyList[targetMonthIndex]) {
        monthlyList[targetMonthIndex].total++;
        if (day.isDone) {
          monthlyList[targetMonthIndex].completed++;
        }
      }
    });

    // Current active streak working backwards from today
    const sortedPastDays = [...nonFutureDays].reverse();
    for (const d of sortedPastDays) {
      if (d.isDone) {
        curStreak++;
      } else {
        // If today is not done yet, allow checking yesterday before breaking
        if (d.dateKey === todayStr && curStreak === 0) {
          continue;
        }
        break;
      }
    }

    // Consistency rate
    const consistencyRate = Math.min(100, Math.round((totalCompletedDays / totalDaysCount) * 100));

    // Best weekday
    let bestWeekdayIdx = 0;
    let maxWeekdayRate = -1;
    for (let w = 0; w < 7; w++) {
      const tot = weekdayTotals[w] || 1;
      const comp = weekdayCompletions[w] || 0;
      const rate = comp / tot;
      if (rate > maxWeekdayRate && comp > 0) {
        maxWeekdayRate = rate;
        bestWeekdayIdx = w;
      }
    }

    const bestWeekdayName = language === 'fa'
      ? PERSIAN_WEEKDAYS_FULL[bestWeekdayIdx]
      : language === 'ar'
      ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][bestWeekdayIdx]
      : ENGLISH_WEEKDAYS_FULL[bestWeekdayIdx];

    // Most active month
    let mostActiveMonthName = '-';
    let maxMonthRate = -1;
    monthlyList.forEach((m) => {
      if (m.total > 0) {
        const r = m.completed / m.total;
        if (r > maxMonthRate && m.completed > 0) {
          maxMonthRate = r;
          mostActiveMonthName = m.name;
        }
      }
    });

    return {
      weeksGrid: weeks,
      monthHeaders: headers,
      yearlyStats: {
        totalDaysCount,
        totalCompletedDays,
        consistencyRate,
        longestStreak,
        curStreak,
        bestWeekdayName,
        mostActiveMonthName,
      },
      monthlyBreakdown: monthlyList,
      currentPersianYearNum: pYearNum,
      currentWeekIdx: foundTodayWeekIdx,
    };
  }, [habits, activeHabitId, selectedHabit, yearScope, language, todayDate, todayStr]);

  // Scroll to current week on mount or change
  const handleScrollToToday = () => {
    if (matrixScrollRef.current) {
      const scrollContainer = matrixScrollRef.current;
      const targetScroll = isRtl
        ? ((53 - currentWeekIdx) / 53) * scrollContainer.scrollWidth - scrollContainer.clientWidth / 2
        : (currentWeekIdx / 53) * scrollContainer.scrollWidth - scrollContainer.clientWidth / 2;
      scrollContainer.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  // Color mapping helper for cells
  const getCellColor = (day: DayCellData) => {
    if (day.isFuture) {
      return 'bg-slate-900/40 border-slate-800/40 opacity-30';
    }

    if (activeHabitId === 'all') {
      if (day.doneCount === 0) {
        return 'bg-slate-800/90 border-slate-750 hover:border-slate-500';
      }
      const pct = day.completionPct;
      if (pct >= 80) return 'bg-emerald-500 border-emerald-400 text-black shadow-xs';
      if (pct >= 50) return 'bg-emerald-600 border-emerald-500 text-white';
      if (pct >= 25) return 'bg-emerald-800 border-emerald-700 text-white';
      return 'bg-emerald-950 border-emerald-800 text-emerald-300';
    }

    // Single Habit mode
    if (day.isDone) {
      return 'border-transparent shadow-sm ring-1 ring-white/20';
    }

    return 'bg-slate-800/90 border-slate-750 hover:border-slate-500';
  };

  const getCellInlineStyle = (day: DayCellData) => {
    if (!day.isFuture && day.isDone && activeHabitId !== 'all' && selectedHabit) {
      return {
        backgroundColor: selectedHabit.color || '#3b82f6',
      };
    }
    return undefined;
  };

  const todayPersianInfo = useMemo(() => {
    const p = getPersianMonthDay(todayDate);
    const mName = PERSIAN_MONTH_NAMES[p.month - 1] || '';
    return {
      day: p.day,
      monthName: mName,
      year: p.year,
      fullText: `${toPersianDigits(p.day)} ${mName} ${toPersianDigits(p.year)}`,
    };
  }, [todayDate]);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200" dir={t.dir}>
      {/* Top Header & Scope Bar */}
      <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Habit Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            id="habit-select-all"
            type="button"
            onClick={() => {
              setActiveHabitId('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
              activeHabitId === 'all'
                ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.allHabitsCombined}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-200 border border-slate-700">
              {formatNumber(habits.length, language)}
            </span>
          </button>

          {habits.map((h) => {
            const isSelected = activeHabitId === h.id;
            return (
              <button
                key={h.id}
                id={`habit-select-${h.id}`}
                type="button"
                onClick={() => {
                  setActiveHabitId(h.id);
                  if (onSelectHabit) onSelectHabit(h.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-400/40'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: h.color || '#3b82f6' }}
                />
                <span>{h.name}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode & Scope Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* Display Mode Switcher (Single Matrix vs All Habits Cards) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-750">
            <button
              type="button"
              onClick={() => setDisplayMode('focused')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                displayMode === 'focused'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={language === 'fa' ? 'نمای متمرکز سالانه' : 'Focused View'}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'ماتریس متمرکز' : 'Focused'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('allHabitsCards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                displayMode === 'allHabitsCards'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={language === 'fa' ? 'ماتریس سالانه تمام عادات به تفکیک' : 'All Habits Matrices'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'تمام عادات به تفکیک' : 'All Habits'}</span>
            </button>
          </div>

          {/* Scope Pill Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-750">
            <button
              type="button"
              onClick={() => setYearScope(language === 'fa' ? 'currentPersian' : 'currentGregorian')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                yearScope === 'currentPersian' || yearScope === 'currentGregorian'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'fa' ? `سال ${toPersianDigits(currentPersianYearNum)}` : language === 'ar' ? 'العام الحالي' : 'Current Year'}
            </button>
            <button
              type="button"
              onClick={() => setYearScope('rolling365')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                yearScope === 'rolling365'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'fa' ? '۳۶۵ روز گذشته' : 'Past 365d'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header Card for Active Selection */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/90 border border-slate-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0"
            style={{
              backgroundColor:
                activeHabitId === 'all'
                  ? '#3b82f6'
                  : selectedHabit?.color || '#8b5cf6',
            }}
          >
            {activeHabitId === 'all' ? (
              <Layers className="w-6 h-6 text-white" />
            ) : (
              selectedHabit?.name.charAt(0) || 'H'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">
                {activeHabitId === 'all'
                  ? t.yearlyMatrixTitle
                  : selectedHabit?.name}
              </h3>
              {activeHabitId !== 'all' && selectedHabit?.category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-700 text-slate-300">
                  {selectedHabit.category}
                </span>
              )}
              {/* Today Badge */}
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>{language === 'fa' ? `امروز: ${todayPersianInfo.fullText}` : `Today: ${todayStr}`}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeHabitId === 'all'
                ? (language === 'fa'
                    ? `ماتریس ۵۲ هفته‌ای سالانه از ۱ فروردین تا پایان اسفند ${toPersianDigits(currentPersianYearNum)} (امروز در ماه ${todayPersianInfo.monthName} است)`
                    : t.yearlyMatrixSubtitle)
                : (language === 'fa'
                    ? `ماتریس سالانه پیوستگی «${selectedHabit?.name}» از فروردین تا پایان اسفند ${toPersianDigits(currentPersianYearNum)}`
                    : `52-week calendar matrix tracking daily consistency for this habit`)}
            </p>
          </div>
        </div>

        {/* Consistency Score Badge & Jump to Today Button */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleScrollToToday}
            className="px-3 py-2 rounded-2xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title={language === 'fa' ? 'اسکرول به ستون هفته جاری و امروز' : 'Jump to Today'}
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>{language === 'fa' ? 'پرش به امروز' : 'Jump to Today'}</span>
          </button>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-850 border border-slate-700">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 font-bold uppercase">
                {t.yearlyConsistency}
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatNumber(yearlyStats.consistencyRate, language)}٪
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Annual Metric KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t.yearlyCompletions}</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-black text-blue-400">
            {formatNumber(yearlyStats.totalCompletedDays, language)}
            <span className="text-xs text-slate-400 font-bold ml-1 mr-1">
              / {formatNumber(yearlyStats.totalDaysCount, language)}
            </span>
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            {language === 'fa' ? 'روزهای تکمیل‌شده تا امروز' : 'Completed days so far'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t.bestYearlyStreak}</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-400">
            {formatNumber(yearlyStats.longestStreak, language)}
            <span className="text-xs text-slate-400 font-bold ml-1 mr-1">
              {language === 'fa' ? 'روز' : 'days'}
            </span>
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            {language === 'fa' ? 'طولانی‌ترین زنجیره سال' : 'Longest continuous run'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t.mostActiveMonth}</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-lg sm:text-xl font-black text-purple-300 truncate">
            {yearlyStats.mostActiveMonthName}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            {language === 'fa' ? 'بالاترین رکورد ماهانه' : 'Top active month'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>{t.bestWeekday}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-lg sm:text-xl font-black text-emerald-300 truncate">
            {yearlyStats.bestWeekdayName}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">
            {language === 'fa' ? 'بیشترین نرخ موفقیت' : 'Highest completion day'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 52-WEEK CALENDAR HEATMAP MATRIX (53 Columns × 7 Rows) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-750 flex flex-col gap-4 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white">
              {language === 'fa'
                ? `ماتریس سالانه ۵۲ هفته‌ای (از ۱ فروردین تا پایان اسفند ${toPersianDigits(currentPersianYearNum)})`
                : `52-Week Activity Grid (${yearlyStats.totalDaysCount} Days)`}
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {language === 'fa' ? 'از راست به چپ: فروردین ← اسفند' : 'Left to Right: Jan → Dec'}
            </span>
          </div>

          {/* Interactive Info / Hover Status */}
          <div className="text-xs text-slate-300 min-h-[22px] flex items-center">
            {hoveredDay ? (
              <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl font-medium animate-in fade-in flex items-center gap-2">
                <span className="text-white font-bold">{hoveredDay.persianStr}</span>
                <span className="text-slate-400">({hoveredDay.weekdayName})</span>
                <span>•</span>
                {hoveredDay.isToday && (
                  <span className="text-blue-400 font-bold bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-700 text-[10px]">
                    {language === 'fa' ? 'امروز' : 'Today'}
                  </span>
                )}
                {activeHabitId === 'all' ? (
                  <span className="text-emerald-400 font-bold">
                    {formatNumber(hoveredDay.doneCount, language)} {language === 'fa' ? 'از' : 'of'} {formatNumber(hoveredDay.totalHabitsCount, language)} {language === 'fa' ? 'عادت' : 'habits'} ({formatNumber(hoveredDay.completionPct, language)}٪)
                  </span>
                ) : (
                  <span className={hoveredDay.isDone ? 'text-emerald-400 font-bold' : hoveredDay.isFuture ? 'text-slate-500' : 'text-slate-400'}>
                    {hoveredDay.isFuture
                      ? (language === 'fa' ? 'روزهای آینده' : 'Future')
                      : hoveredDay.isDone
                      ? (language === 'fa' ? 'انجام شد ✅' : 'Completed ✅')
                      : (language === 'fa' ? 'انجام‌نشده ⏳' : 'Missed ⏳')}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>{language === 'fa' ? 'برای مشاهده وضعیت هر روز، ماوس را روی خانه‌ها ببرید' : 'Hover over any cell to inspect date details'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Heatmap Canvas */}
        <div ref={matrixScrollRef} className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
          <div className="min-w-[850px] flex flex-col gap-1.5">
            {/* Month labels row with precise 53 CSS grid columns */}
            <div className="flex text-[10px] text-slate-400 font-bold select-none h-5">
              <div className="w-7 shrink-0" /> {/* Weekday label spacer */}
              <div
                className="flex-1 relative"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(53, minmax(13px, 1fr))',
                  gap: '3px',
                }}
              >
                {monthHeaders.map((hdr, idx) => {
                  const isCurrentMonth = language === 'fa' && hdr.monthName === todayPersianInfo.monthName;
                  return (
                    <div
                      key={`${hdr.monthName}-${idx}`}
                      style={{ gridColumnStart: hdr.weekIndex + 1 }}
                      className="relative"
                    >
                      <span
                        className={`absolute whitespace-nowrap text-[10px] font-bold ${
                          isCurrentMonth
                            ? 'text-blue-400 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {hdr.monthName}
                        {isCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block ms-1" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7 Weekday Rows × 53 Week Columns */}
            <div className="flex gap-1.5 items-center">
              {/* Row labels (Sat-Fri in Persian) */}
              <div className="w-7 shrink-0 flex flex-col justify-between text-[9px] font-bold text-slate-400 select-none py-0.5 h-[105px]">
                {(language === 'fa' ? PERSIAN_WEEKDAYS : ENGLISH_WEEKDAYS).map((wDay, idx) => (
                  <span key={idx} className="h-3 flex items-center justify-center">
                    {idx % 2 === 0 ? wDay : ''}
                  </span>
                ))}
              </div>

              {/* 53 Weeks Columns with Inline Grid Style */}
              <div
                className="flex-1"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(53, minmax(13px, 1fr))',
                  gap: '3px',
                }}
              >
                {weeksGrid.map((week, wIdx) => {
                  const isCurrentWeek = wIdx === currentWeekIdx;
                  return (
                    <div
                      key={wIdx}
                      className={`flex flex-col gap-[3px] p-0.5 rounded-md transition ${
                        isCurrentWeek ? 'bg-blue-950/30 ring-1 ring-blue-500/40' : ''
                      }`}
                    >
                      {week.map((day) => {
                        const isHovered = hoveredDay?.dateKey === day.dateKey;
                        return (
                          <div
                            key={day.dateKey}
                            ref={day.isToday ? todayCellRef : undefined}
                            onMouseEnter={() => setHoveredDay(day)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => setHoveredDay(day)}
                            className={`w-3.5 h-3.5 rounded-xs border transition-all duration-150 cursor-pointer relative ${
                              getCellColor(day)
                            } ${
                              day.isToday
                                ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900 z-10 scale-125 shadow-md'
                                : ''
                            } ${
                              isHovered ? 'scale-140 z-20 shadow-lg ring-2 ring-white' : ''
                            }`}
                            style={getCellInlineStyle(day)}
                            title={`${day.persianStr} (${day.weekdayName})${
                              day.isToday ? ' [امروز]' : ''
                            }: ${
                              day.isDone
                                ? 'انجام شد ✅'
                                : day.isFuture
                                ? 'آینده'
                                : 'انجام‌نشده ⏳'
                            }`}
                          >
                            {day.isToday && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400 animate-ping pointer-events-none" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Legend Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
              <span>{language === 'fa' ? `امروز (${todayPersianInfo.fullText})` : `Today (${todayStr})`}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-900/40 border border-slate-800/40 inline-block opacity-40" />
              <span>{language === 'fa' ? 'روزهای آینده' : 'Future Days'}</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              {language === 'fa'
                ? `مجموع ثبت‌ها تا امروز: ${formatNumber(yearlyStats.totalCompletedDays, language)} بار`
                : `Total completions: ${formatNumber(yearlyStats.totalCompletedDays, language)} times`}
            </span>
          </div>

          {/* Density scale */}
          <div className="flex items-center gap-1.5">
            <span>{t.less}</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-xs bg-slate-800 border border-slate-750" />
              <div className="w-3 h-3 rounded-xs bg-emerald-950 border border-emerald-800" />
              <div className="w-3 h-3 rounded-xs bg-emerald-800 border border-emerald-700" />
              <div className="w-3 h-3 rounded-xs bg-emerald-600 border border-emerald-500" />
              <div className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-400" />
            </div>
            <span>{t.more}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: ALL HABITS INDIVIDUAL ANNUAL MATRICES SIDE-BY-SIDE */}
      {/* ========================================================================= */}
      {displayMode === 'allHabitsCards' && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              <span>{language === 'fa' ? 'ماتریس سالانه اختصاصی تک‌تک عادات' : 'Per-Habit Annual Heatmap Cards'}</span>
            </h4>
            <span className="text-xs text-slate-400">
              {formatNumber(habits.length, language)} {language === 'fa' ? 'عادت فعال' : 'active habits'}
            </span>
          </div>

          <div className="space-y-4">
            {habits.map((h) => {
              const habitCheckins = Object.keys(h.history || {}).length;
              return (
                <div
                  key={h.id}
                  className="p-4 sm:p-5 rounded-3xl bg-slate-850 border border-slate-750 flex flex-col gap-3 shadow-lg hover:border-slate-600 transition"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full shadow-xs"
                        style={{ backgroundColor: h.color || '#3b82f6' }}
                      />
                      <span className="font-black text-sm text-white">{h.name}</span>
                      {h.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-750 text-slate-300 border border-slate-700">
                          {h.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-xl">
                        {formatNumber(habitCheckins, language)} {language === 'fa' ? 'روز تکمیل' : 'days'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHabitId(h.id);
                          setDisplayMode('focused');
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                      >
                        <span>{language === 'fa' ? 'تحلیل دقیق' : 'Analyze'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Mini 53-week row matrix for this specific habit */}
                  <div className="overflow-x-auto pb-1 scrollbar-thin">
                    <div
                      className="min-w-[800px]"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(53, minmax(13px, 1fr))',
                        gap: '3px',
                      }}
                    >
                      {weeksGrid.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-[3px]">
                          {week.map((day) => {
                            const isDone = !!h.history[day.dateKey];
                            return (
                              <div
                                key={day.dateKey}
                                className={`w-3.5 h-3.5 rounded-xs border transition ${
                                  day.isFuture
                                    ? 'bg-slate-900/30 border-slate-800/30 opacity-30'
                                    : isDone
                                    ? 'border-transparent shadow-xs'
                                    : 'bg-slate-800 border-slate-750'
                                } ${day.isToday ? 'ring-2 ring-blue-400 z-10' : ''}`}
                                style={
                                  !day.isFuture && isDone
                                    ? { backgroundColor: h.color || '#3b82f6' }
                                    : undefined
                                }
                                title={`${day.persianStr}: ${isDone ? 'انجام شد' : 'انجام‌نشده'}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12-MONTH PROGRESS BREAKDOWN (FARVARDIN TO ESFAND) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/90 border border-slate-750 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>{t.monthBreakdownTitle}</span>
          </h4>
          <span className="text-xs text-slate-400">
            {language === 'fa' ? `۱۲ ماه سال ${toPersianDigits(currentPersianYearNum)}` : '12 Months'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
          {monthlyBreakdown.map((m, idx) => {
            const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
            const isCurrentMonth = language === 'fa' && m.name === todayPersianInfo.monthName;

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex flex-col gap-2 justify-between transition ${
                  isCurrentMonth
                    ? 'bg-slate-800 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-850 border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-white flex items-center gap-1">
                    <span>{m.name}</span>
                    {isCurrentMonth && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-900/80 text-blue-300 font-bold border border-blue-700">
                        {language === 'fa' ? 'ماه جاری' : 'Current'}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-purple-400">
                    {formatNumber(pct, language)}٪
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCurrentMonth
                        ? 'bg-gradient-to-r from-blue-400 to-emerald-400'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{language === 'fa' ? 'ثبت‌های موفق:' : 'Completed:'}</span>
                  <span className="font-bold text-slate-200">
                    {formatNumber(m.completed, language)} / {formatNumber(m.total, language)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HABIT-BY-HABIT ANNUAL MATRIX COMPARISON LIST */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/90 border border-slate-750 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{language === 'fa' ? 'انتخاب و مرور سالانه هر عادت' : 'Habit-by-Habit Annual Overview'}</span>
          </h4>
          <span className="text-xs text-slate-400">
            {formatNumber(habits.length, language)} {language === 'fa' ? 'عادت تعریف‌شده' : 'habits'}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {habits.map((habit) => {
            const completedCount = Object.keys(habit.history || {}).length;
            const isCurrentlySelected = activeHabitId === habit.id;

            return (
              <div
                key={habit.id}
                onClick={() => {
                  setActiveHabitId(habit.id);
                  setDisplayMode('focused');
                  if (onSelectHabit) onSelectHabit(habit.id);
                }}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isCurrentlySelected
                    ? 'bg-purple-950/70 border-purple-500 shadow-md ring-1 ring-purple-400/30'
                    : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: habit.color || '#3b82f6' }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-white block truncate">
                      {habit.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {language === 'fa'
                        ? `مجموع ثبت‌های ثبت‌شده: ${formatNumber(completedCount, language)} روز`
                        : `Total check-ins: ${formatNumber(completedCount, language)} days`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-300 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700">
                    {language === 'fa' ? 'مشاهده ماتریس ۵۲ هفته' : 'View 52w Matrix'}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 ${isRtl ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
