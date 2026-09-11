import { Habit, HabitStats, Language } from '../types';
import { getTodayString } from './persianDate';

/**
 * Calculates habit formation statistics based on the Lally et al. (2010)
 * asymptotic model: Automaticity(t) = 100 * (1 - e^(-t / 66))
 * 
 * Rules:
 * - Single missed day does NOT reduce effective t (no penalty for 1 slip)
 * - 2 or more consecutive missed days deduct 1 point from t for each day beyond day 1
 * - Automaticity: <40% Red, 40-70% Yellow, >70% Green
 * - Target asymptote is 66 days average
 */
export function calculateHabitStats(
  habit: Habit,
  referenceToday?: string,
  language: Language = 'fa'
): HabitStats {
  const todayStr = referenceToday || getTodayString();
  const history = habit.history || {};

  // Find start date: earlier of createdAt or earliest completed date
  const completedDates = Object.keys(history).filter((d) => history[d]);
  let startDateStr = habit.createdAt || todayStr;
  
  if (completedDates.length > 0) {
    const minCompleted = completedDates.sort()[0];
    if (minCompleted < startDateStr) {
      startDateStr = minCompleted;
    }
  }

  // Iterate day by day from startDate to todayStr
  let effectiveT = 0;
  let totalCompletedDays = 0;
  let consecutiveMisses = 0;
  let missedDaysCount = 0;
  const missedDates: string[] = [];

  const start = new Date(startDateStr);
  const end = new Date(todayStr);

  // If start is in the future, normalize
  if (start <= end) {
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const isCompleted = !!history[dateKey];

      if (isCompleted) {
        totalCompletedDays++;
        effectiveT += 1;
        consecutiveMisses = 0;
      } else {
        missedDaysCount++;
        missedDates.push(dateKey);
        consecutiveMisses++;
        // 1st missed day: no penalty.
        // 2nd and subsequent missed days: deduct 1 from effectiveT (min 0)
        if (consecutiveMisses >= 2) {
          effectiveT = Math.max(0, effectiveT - 1);
        }
      }

      current.setDate(current.getDate() + 1);
    }
  } else {
    // If today is before creation date
    if (history[todayStr]) {
      totalCompletedDays = 1;
      effectiveT = 1;
    } else {
      missedDaysCount = 1;
      missedDates.push(todayStr);
    }
  }

  // Automaticity Score: S = 100 * (1 - e^(-effectiveT / 66))
  const kRate = habit.kRate || 66;
  const rawScore = 100 * (1 - Math.exp(-effectiveT / kRate));
  const automaticity = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Stage labels localized
  const stageLabels = {
    forming: {
      fa: 'در حال شکل‌گیری',
      ar: 'قيد التشكل',
      en: 'Forming',
    },
    semi: {
      fa: 'نیمه‌خودکار',
      ar: 'شبه تلقائي',
      en: 'Semi-Automatic',
    },
    automatic: {
      fa: 'کاملاً خودکار شده',
      ar: 'تلقائي بالكامل',
      en: 'Fully Automatic',
    },
  };

  // Stages & Colors for Sleek Interface theme
  let stage: HabitStats['stage'] = 'forming';
  let stageLabel = stageLabels.forming[language] || stageLabels.forming.fa;
  let colorTheme = {
    badgeBg: 'bg-red-50 dark:bg-red-950/40',
    badgeText: 'text-red-600 dark:text-red-400',
    badgeBorder: 'border-red-200 dark:border-red-900/50',
    progressBar: 'bg-red-500',
    ringColor: 'stroke-red-500',
    textColor: 'text-red-500 dark:text-red-400',
    accentBg: 'bg-red-500',
  };

  if (automaticity >= 70) {
    stage = 'automatic';
    stageLabel = stageLabels.automatic[language] || stageLabels.automatic.fa;
    colorTheme = {
      badgeBg: 'bg-green-50 dark:bg-green-950/40',
      badgeText: 'text-green-600 dark:text-green-400',
      badgeBorder: 'border-green-200 dark:border-green-900/50',
      progressBar: 'bg-green-500',
      ringColor: 'stroke-green-500',
      textColor: 'text-green-500 dark:text-green-400',
      accentBg: 'bg-green-500',
    };
  } else if (automaticity >= 40) {
    stage = 'semi';
    stageLabel = stageLabels.semi[language] || stageLabels.semi.fa;
    colorTheme = {
      badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
      badgeText: 'text-yellow-600 dark:text-yellow-400',
      badgeBorder: 'border-yellow-200 dark:border-yellow-900/50',
      progressBar: 'bg-yellow-500',
      ringColor: 'stroke-yellow-500',
      textColor: 'text-yellow-500 dark:text-yellow-400',
      accentBg: 'bg-yellow-500',
    };
  }

  // Calculate Remaining Days to full automaticity target (66 effective days)
  const targetDays = habit.targetDays || 66;
  const remainingDays = Math.max(0, targetDays - effectiveT);

  // Calculate Streak
  const isDoneToday = !!history[todayStr];
  let currentStreak = 0;
  
  // Calculate backwards from today (or yesterday if today isn't done yet)
  const streakRef = new Date(todayStr);
  if (!isDoneToday) {
    // Check if yesterday was done to keep streak alive
    streakRef.setDate(streakRef.getDate() - 1);
  }

  while (true) {
    const y = streakRef.getFullYear();
    const m = String(streakRef.getMonth() + 1).padStart(2, '0');
    const d = String(streakRef.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    if (history[key]) {
      currentStreak++;
      streakRef.setDate(streakRef.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  let runningStreak = 0;
  const sortedDates = Object.keys(history)
    .filter((k) => history[k])
    .sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  return {
    totalCompletedDays,
    effectiveT,
    automaticity,
    stage,
    stageLabel,
    colorTheme,
    currentStreak,
    longestStreak,
    remainingDays,
    isDoneToday,
    doneDatesCount: completedDates.length,
    missedDaysCount,
    missedDates,
  };
}

export interface AllHabitsStreakInfo {
  currentStreak: number;
  longestStreak: number;
  isPerfectToday: boolean;
  doneTodayCount: number;
  totalHabitsCount: number;
  completionPercentToday: number;
  historicPerfectDaysCount: number;
  streakActiveYesterday: boolean;
  missedTodayCount: number;
  uncompletedHabitsToday: string[];
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates the consecutive streak of days where 100% of habits were completed.
 * If the user misses all or any habit on a day, this streak resets to zero.
 */
export function calculateAllHabitsStreak(
  habits: Habit[],
  referenceToday?: string
): AllHabitsStreakInfo {
  const totalHabitsCount = habits.length;
  if (totalHabitsCount === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isPerfectToday: false,
      doneTodayCount: 0,
      totalHabitsCount: 0,
      completionPercentToday: 0,
      historicPerfectDaysCount: 0,
      streakActiveYesterday: false,
      missedTodayCount: 0,
      uncompletedHabitsToday: [],
    };
  }

  const todayStr = referenceToday || getTodayString();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const isDatePerfect = (dateKey: string): boolean => {
    return habits.every((h) => !!(h.history && h.history[dateKey]));
  };

  const uncompletedHabitsToday = habits
    .filter((h) => !h.history || !h.history[todayStr])
    .map((h) => h.name);
  const missedTodayCount = uncompletedHabitsToday.length;
  const doneTodayCount = totalHabitsCount - missedTodayCount;
  const isPerfectToday = totalHabitsCount > 0 && doneTodayCount === totalHabitsCount;
  const completionPercentToday = totalHabitsCount > 0 ? Math.round((doneTodayCount / totalHabitsCount) * 100) : 0;

  // Calculate current streak
  let currentStreak = 0;
  let streakActiveYesterday = false;

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterdayDate);
  const isPerfectYesterday = isDatePerfect(yesterdayKey);

  if (isPerfectToday) {
    // Today is 100% completed, start counting from today backwards
    currentStreak = 1;
    const checkDate = new Date(todayDate);
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const key = formatDateKey(checkDate);
      if (isDatePerfect(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (isPerfectYesterday) {
    // Today is not completed yet, but yesterday was 100% completed.
    // The streak remains active based on yesterday pending today's full completion.
    streakActiveYesterday = true;
    currentStreak = 1;
    const checkDate = new Date(yesterdayDate);
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const key = formatDateKey(checkDate);
      if (isDatePerfect(key)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    // Neither today nor yesterday was 100% completed: streak is reset to 0
    currentStreak = 0;
  }

  // Find all unique dates in history
  const allDatesSet = new Set<string>();
  habits.forEach((h) => {
    Object.keys(h.history || {}).forEach((d) => {
      if (h.history[d]) allDatesSet.add(d);
    });
  });

  // Calculate total historic perfect days & all-time longest perfect streak
  let historicPerfectDaysCount = 0;
  const perfectDates: string[] = [];

  allDatesSet.forEach((d) => {
    if (isDatePerfect(d)) {
      historicPerfectDaysCount++;
      perfectDates.push(d);
    }
  });

  perfectDates.sort();

  let longestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < perfectDates.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const [py, pm, pd] = perfectDates[i - 1].split('-').map(Number);
      const [cy, cm, cd] = perfectDates[i].split('-').map(Number);
      const prevD = new Date(py, pm - 1, pd);
      const currD = new Date(cy, cm - 1, cd);
      const diffDays = Math.round((currD.getTime() - prevD.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    isPerfectToday,
    doneTodayCount,
    totalHabitsCount,
    completionPercentToday,
    historicPerfectDaysCount,
    streakActiveYesterday,
    missedTodayCount,
    uncompletedHabitsToday,
  };
}
