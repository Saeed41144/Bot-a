import { UserActivityLog, Habit, Task } from '../types';
import { getTodayString } from './persianDate';

const ACTIVITY_LOGS_STORAGE_KEY = 'neuro_habit_user_activity_logs_v1';
const MAX_STORED_LOGS = 1000;

/**
 * Retrieves all stored background activity logs from localStorage
 */
export function getUserActivityLogs(): UserActivityLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse activity logs from storage:', e);
    return [];
  }
}

/**
 * Saves a new activity log to background storage
 */
export function saveUserActivityLog(
  log: Omit<UserActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): UserActivityLog {
  const currentLogs = getUserActivityLogs();
  const timestamp = log.timestamp || Date.now();
  const now = new Date(timestamp);
  const time = log.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = log.date || getTodayString();

  const durationSeconds = log.durationSeconds ?? (log.durationMinutes ? log.durationMinutes * 60 : 0);
  const durationMinutes = log.durationMinutes !== undefined 
    ? log.durationMinutes 
    : (durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 15);

  const newRecord: UserActivityLog = {
    id: log.id || `act-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    type: log.type,
    targetId: log.targetId,
    targetTitle: log.targetTitle || log.title,
    title: log.title || log.targetTitle || 'Activity',
    category: log.category || 'General',
    date,
    persianDate: log.persianDate || date,
    time,
    timestamp,
    durationMinutes,
    durationSeconds,
    isCompletedFull: log.isCompletedFull,
    isRecurring: log.isRecurring ?? true,
    notes: log.notes,
    details: log.details,
  };

  // For focus sessions, do NOT overwrite previous sessions on the same day. For checkins, replace.
  const isFocusLog = log.type.includes('focus') || log.type === 'pomodoro';
  const filtered = isFocusLog
    ? currentLogs.filter((item) => item.id !== newRecord.id)
    : currentLogs.filter((item) => !(item.targetId === log.targetId && item.date === date && item.type === log.type));

  const updatedLogs = [newRecord, ...filtered].slice(0, MAX_STORED_LOGS);

  try {
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (e) {
    console.warn('Failed to save activity log:', e);
  }

  return newRecord;
}

/**
 * Removes an activity log when a habit/task is unchecked
 */
export function removeUserActivityLog(targetId: string, dateStr: string): void {
  const currentLogs = getUserActivityLogs();
  const filtered = currentLogs.filter((item) => !(item.targetId === targetId && item.date === dateStr));
  try {
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove activity log:', e);
  }
}

/**
 * Returns activity logs for a specific date (defaults to today)
 */
export function getTodayActivityLogs(todayStr?: string): UserActivityLog[] {
  const dateKey = todayStr || getTodayString();
  const logs = getUserActivityLogs();
  return logs
    .filter((l) => l.date === dateKey)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Generates an aggregated summary of all background activity logs
 * Specifically designed for feeding into Gemini AI and displaying in the stats panel
 */
export function getActivityLearningSummary(habits: Habit[] = [], tasks: Task[] = []) {
  const logs = getUserActivityLogs();
  const todayStr = getTodayString();

  // Category time and count distribution
  const categoryMinutes: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  // 24-hour histogram (0 to 23)
  const hourlyDistribution: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {
    hourlyDistribution[i] = 0;
  }

  // Circadian distribution based on exact completion hours
  const circadianCounts = {
    morning: 0,   // 05:00 - 12:00
    afternoon: 0, // 12:00 - 17:00
    evening: 0,   // 17:00 - 22:00
    night: 0,     // 22:00 - 05:00
  };

  let totalLoggedMinutes = 0;
  let oneTimeHabitsCount = 0;
  let recurringHabitsCount = 0;
  let recurringTasksCount = 0;
  let regularTasksCount = 0;

  logs.forEach((log) => {
    const cat = log.category || 'عمومی';
    const duration = log.durationMinutes || 15;
    totalLoggedMinutes += duration;

    categoryMinutes[cat] = (categoryMinutes[cat] || 0) + duration;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Parse hour
    let hour = 12;
    if (log.time && log.time.includes(':')) {
      const parts = log.time.split(':');
      hour = parseInt(parts[0], 10);
    } else if (log.timestamp) {
      hour = new Date(log.timestamp).getHours();
    }
    if (isNaN(hour) || hour < 0 || hour > 23) hour = 12;

    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

    if (hour >= 5 && hour < 12) circadianCounts.morning++;
    else if (hour >= 12 && hour < 17) circadianCounts.afternoon++;
    else if (hour >= 17 && hour < 22) circadianCounts.evening++;
    else circadianCounts.night++;

    if (log.type === 'one_time_habit') oneTimeHabitsCount++;
    else if (log.type === 'habit') recurringHabitsCount++;
    else if (log.type === 'recurring_task') recurringTasksCount++;
    else regularTasksCount++;
  });

  // Calculate also from tasks completion timestamps if available
  tasks.forEach((t) => {
    if (t.completed && t.completedAt) {
      const h = new Date(t.completedAt).getHours();
      if (!isNaN(h) && h >= 0 && h <= 23) {
        hourlyDistribution[h] = (hourlyDistribution[h] || 0) + 1;
      }
    }
  });

  // Find Peak Productivity Hour Window
  let peakHour = 18;
  let maxCount = -1;
  for (let i = 0; i < 24; i++) {
    if ((hourlyDistribution[i] || 0) > maxCount) {
      maxCount = hourlyDistribution[i] || 0;
      peakHour = i;
    }
  }

  const peakNextHour = (peakHour + 1) % 24;
  const peakHoursWindow = `${String(peakHour).padStart(2, '0')}:00 الی ${String(peakNextHour).padStart(2, '0')}:00`;

  // Detailed Overdue Tasks Calculation
  const overdueTasksList = tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr)
    .map((t) => {
      const [y1, m1, d1] = (t.dueDate || todayStr).split('-').map(Number);
      const [y2, m2, d2] = todayStr.split('-').map(Number);
      const t1 = new Date(y1, m1 - 1, d1).getTime();
      const t2 = new Date(y2, m2 - 1, d2).getTime();
      const overdueDays = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        category: t.category,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        overdueDays,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const totalOverdueTasksCount = overdueTasksList.length;
  const totalOverdueDays = overdueTasksList.reduce((acc, t) => acc + t.overdueDays, 0);
  const maxOverdueDays = overdueTasksList.length > 0 ? Math.max(...overdueTasksList.map((t) => t.overdueDays)) : 0;
  const averageOverdueDays = totalOverdueTasksCount > 0 ? Math.round((totalOverdueDays / totalOverdueTasksCount) * 10) / 10 : 0;

  // Uncompleted Habits Analysis
  const uncompletedHabitsToday = habits
    .filter((h) => !h.history || !h.history[todayStr])
    .map((h) => ({
      id: h.id,
      name: h.name,
      category: h.category,
    }));

  // Today's activity list
  const todayLogs = logs.filter((l) => l.date === todayStr);

  return {
    totalLogsCount: logs.length,
    totalLoggedMinutes,
    todayLogs,
    todayCompletedCount: todayLogs.length,
    categoryMinutes,
    categoryCounts,
    circadianCounts,
    hourlyDistribution,
    peakHour,
    peakHoursWindow,
    peakHoursCount: maxCount,
    oneTimeHabitsCount,
    recurringHabitsCount,
    recurringTasksCount,
    regularTasksCount,
    // Overdue Metrics
    overdueTasksList,
    totalOverdueTasksCount,
    totalOverdueDays,
    maxOverdueDays,
    averageOverdueDays,
    // Uncompleted habits metrics
    uncompletedHabitsToday,
    totalMissedHabitsToday: uncompletedHabitsToday.length,
    recentTimeline: logs.slice(0, 30),
  };
}
