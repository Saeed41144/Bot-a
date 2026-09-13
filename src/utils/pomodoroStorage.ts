import { PomodoroSessionRecord, Habit, Task } from '../types';
import { safeStorage } from './safeStorage';
import { getTodayString } from './persianDate';

export type { PomodoroSessionRecord };

const POMODORO_STORAGE_KEY = 'lally_pomodoro_history_v1';

export function getPomodoroSessions(): PomodoroSessionRecord[] {
  try {
    const raw = safeStorage.getItem(POMODORO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load pomodoro sessions:', err);
  }
  return [];
}

export function savePomodoroSessions(sessions: PomodoroSessionRecord[]): void {
  try {
    safeStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(sessions));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pomodoroSessionsUpdated', { detail: sessions }));
    }
  } catch (err) {
    console.warn('Failed to save pomodoro sessions:', err);
  }
}

export function addPomodoroSession(session: Omit<PomodoroSessionRecord, 'id' | 'timestamp'> & { timestamp?: number }): PomodoroSessionRecord {
  const now = Date.now();
  const endD = new Date();
  const endFormatted = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
  
  const elapsedSec = session.durationSeconds !== undefined 
    ? session.durationSeconds 
    : (session.durationMinutes * 60);

  const startD = new Date(now - elapsedSec * 1000);
  const startFormatted = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;

  const newRecord: PomodoroSessionRecord = {
    ...session,
    id: `pomo-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: session.timestamp || now,
    startTimestamp: session.startTimestamp || (now - elapsedSec * 1000),
    startTime: session.startTime || startFormatted,
    endTime: session.endTime || endFormatted,
    time: session.time || endFormatted,
  };

  const current = getPomodoroSessions();
  const updated = [newRecord, ...current].slice(0, 1500); // Keep last 1500 sessions
  savePomodoroSessions(updated);
  return newRecord;
}

export const savePomodoroSession = addPomodoroSession;

export function deletePomodoroSession(sessionId: string): PomodoroSessionRecord[] {
  const current = getPomodoroSessions();
  const updated = current.filter((s) => s.id !== sessionId);
  savePomodoroSessions(updated);
  return updated;
}

export function clearPomodoroSessions(): void {
  savePomodoroSessions([]);
}

export interface TargetFocusStats {
  targetId: string;
  targetType: 'habit' | 'task';
  name: string;
  color?: string;
  totalMinutes: number;
  totalSeconds: number;
  sessionsCount: number;
  completedFullCount: number;
  earlyFinishedCount: number;
  sessions: PomodoroSessionRecord[];
}

export function formatTimeShort(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatPomodoroDuration(
  totalSecondsOrMinutes: number,
  language: string = 'fa',
  isSeconds: boolean = false
): string {
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  let totalSec = isSeconds ? Math.round(totalSecondsOrMinutes) : Math.round(totalSecondsOrMinutes * 60);
  if (totalSec <= 0) {
    return isFa ? '۰ ثانیه' : isAr ? '٠ ثانية' : '0s';
  }

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(
      isFa ? `${toPersianDigits(hours)} ساعت` : isAr ? `${hours} ساعة` : `${hours}h`
    );
  }
  if (minutes > 0) {
    parts.push(
      isFa ? `${toPersianDigits(minutes)} دقیقه` : isAr ? `${minutes} دقيقة` : `${minutes}m`
    );
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(
      isFa ? `${toPersianDigits(seconds)} ثانیه` : isAr ? `${seconds} ثانية` : `${seconds}s`
    );
  }

  return parts.join(isFa ? ' و ' : isAr ? ' و ' : ' ');
}

export function toPersianDigits(n: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, (w) => farsiDigits[+w]);
}

export function getSessionsForTarget(
  targetType: 'habit' | 'task',
  targetId: string,
  sessions: PomodoroSessionRecord[] = getPomodoroSessions()
): PomodoroSessionRecord[] {
  if (!targetId) return [];
  return sessions
    .filter((s) => s.targetType === targetType && s.targetId === targetId)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function calculateTargetFocusStats(
  targetType: 'habit' | 'task',
  targetId: string,
  targetName?: string,
  targetColor?: string,
  sessions: PomodoroSessionRecord[] = getPomodoroSessions()
): TargetFocusStats {
  const targetSessions = getSessionsForTarget(targetType, targetId, sessions);
  let totalSeconds = 0;
  let completedFullCount = 0;
  let earlyFinishedCount = 0;

  targetSessions.forEach((s) => {
    const sec = s.durationSeconds !== undefined ? s.durationSeconds : (s.durationMinutes * 60);
    totalSeconds += sec;
    if (s.isCompletedFull || s.durationMinutes >= 25) {
      completedFullCount++;
    } else {
      earlyFinishedCount++;
    }
  });

  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    targetId,
    targetType,
    name: targetName || '',
    color: targetColor,
    totalMinutes,
    totalSeconds,
    sessionsCount: targetSessions.length,
    completedFullCount,
    earlyFinishedCount,
    sessions: targetSessions,
  };
}

export interface PomodoroSummaryStats {
  todayMinutes: number;
  todaySeconds: number;
  todaySessionsCount: number;
  todayCoinsEarned: number;
  todayXpEarned: number;
  totalMinutes: number;
  totalSeconds: number;
  totalSessionsCount: number;
  totalCoinsEarned: number;
  totalXpEarned: number;
  completedFullCount: number;
  earlyFinishedCount: number;
  habitMinutesTotal: number;
  habitSecondsTotal: number;
  taskMinutesTotal: number;
  taskSecondsTotal: number;
  unassignedMinutesTotal: number;
  unassignedSecondsTotal: number;
  topHabits: { id: string; name: string; minutes: number; seconds: number; color?: string; sessionsCount: number; completedFullCount: number; earlyFinishedCount: number; sessions: PomodoroSessionRecord[] }[];
  topTasks: { id: string; name: string; minutes: number; seconds: number; sessionsCount: number; completedFullCount: number; earlyFinishedCount: number; sessions: PomodoroSessionRecord[] }[];
  allHabitStats: Record<string, TargetFocusStats>;
  allTaskStats: Record<string, TargetFocusStats>;
  dailyTrend: { date: string; minutes: number; seconds: number; sessionsCount: number; coins: number }[];
}

export function calculatePomodoroStats(
  sessions: PomodoroSessionRecord[],
  todayStr: string = getTodayString(),
  habits: Habit[] = [],
  tasks: Task[] = []
): PomodoroSummaryStats {
  let todayMinutes = 0;
  let todaySeconds = 0;
  let todaySessionsCount = 0;
  let todayCoinsEarned = 0;
  let todayXpEarned = 0;
  let totalMinutes = 0;
  let totalSeconds = 0;
  let totalSessionsCount = 0;
  let totalCoinsEarned = 0;
  let totalXpEarned = 0;
  let completedFullCount = 0;
  let earlyFinishedCount = 0;
  let habitMinutesTotal = 0;
  let habitSecondsTotal = 0;
  let taskMinutesTotal = 0;
  let taskSecondsTotal = 0;
  let unassignedMinutesTotal = 0;
  let unassignedSecondsTotal = 0;

  const allHabitStats: Record<string, TargetFocusStats> = {};
  const allTaskStats: Record<string, TargetFocusStats> = {};
  const dailyMap: Record<string, { date: string; minutes: number; seconds: number; sessionsCount: number; coins: number }> = {};

  // Initialize from habits
  habits.forEach((h) => {
    allHabitStats[h.id] = {
      targetId: h.id,
      targetType: 'habit',
      name: h.name,
      color: h.color,
      totalMinutes: h.totalFocusMinutes || 0,
      totalSeconds: (h.totalFocusMinutes || 0) * 60,
      sessionsCount: h.focusSessionsCount || 0,
      completedFullCount: 0,
      earlyFinishedCount: 0,
      sessions: [],
    };
  });

  // Initialize from tasks
  tasks.forEach((t) => {
    allTaskStats[t.id] = {
      targetId: t.id,
      targetType: 'task',
      name: t.title,
      totalMinutes: t.totalFocusMinutes || 0,
      totalSeconds: (t.totalFocusMinutes || 0) * 60,
      sessionsCount: t.focusSessionsCount || 0,
      completedFullCount: 0,
      earlyFinishedCount: 0,
      sessions: [],
    };
  });

  // Process all session records
  sessions.forEach((s) => {
    if (s.mode === 'focus' || s.mode === 'stopwatch') {
      const sec = s.durationSeconds !== undefined ? s.durationSeconds : (s.durationMinutes * 60);
      const mins = Math.max(1, Math.round(sec / 60));
      const coins = s.rewardCoinsEarned || 0;
      const xp = s.rewardXpEarned || 0;

      totalSeconds += sec;
      totalMinutes += mins;
      totalSessionsCount += 1;
      totalCoinsEarned += coins;
      totalXpEarned += xp;

      const isFull = s.isCompletedFull || mins >= 25;
      if (isFull) {
        completedFullCount++;
      } else {
        earlyFinishedCount++;
      }

      if (s.completedAt === todayStr) {
        todayMinutes += mins;
        todaySeconds += sec;
        todaySessionsCount += 1;
        todayCoinsEarned += coins;
        todayXpEarned += xp;
      }

      // Track daily trends
      const dateKey = s.completedAt || todayStr;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, minutes: 0, seconds: 0, sessionsCount: 0, coins: 0 };
      }
      dailyMap[dateKey].minutes += mins;
      dailyMap[dateKey].seconds += sec;
      dailyMap[dateKey].sessionsCount += 1;
      dailyMap[dateKey].coins += coins;

      if (s.targetType === 'habit' && s.targetId) {
        habitSecondsTotal += sec;
        habitMinutesTotal += mins;
        if (!allHabitStats[s.targetId]) {
          allHabitStats[s.targetId] = {
            targetId: s.targetId,
            targetType: 'habit',
            name: s.targetName || s.targetTitle || 'عادت',
            totalMinutes: 0,
            totalSeconds: 0,
            sessionsCount: 0,
            completedFullCount: 0,
            earlyFinishedCount: 0,
            sessions: [],
          };
        }
        const st = allHabitStats[s.targetId];
        st.sessions.push(s);
        st.totalSeconds += sec;
        st.totalMinutes = Math.round(st.totalSeconds / 60);
        st.sessionsCount++;
        if (isFull) st.completedFullCount++;
        else st.earlyFinishedCount++;
      } else if (s.targetType === 'task' && s.targetId) {
        taskSecondsTotal += sec;
        taskMinutesTotal += mins;
        if (!allTaskStats[s.targetId]) {
          allTaskStats[s.targetId] = {
            targetId: s.targetId,
            targetType: 'task',
            name: s.targetName || s.targetTitle || 'تسک',
            totalMinutes: 0,
            totalSeconds: 0,
            sessionsCount: 0,
            completedFullCount: 0,
            earlyFinishedCount: 0,
            sessions: [],
          };
        }
        const st = allTaskStats[s.targetId];
        st.sessions.push(s);
        st.totalSeconds += sec;
        st.totalMinutes = Math.round(st.totalSeconds / 60);
        st.sessionsCount++;
        if (isFull) st.completedFullCount++;
        else st.earlyFinishedCount++;
      } else {
        unassignedMinutesTotal += mins;
        unassignedSecondsTotal += sec;
      }
    }
  });

  // Sort sessions per target
  Object.values(allHabitStats).forEach((st) => {
    st.sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  });
  Object.values(allTaskStats).forEach((st) => {
    st.sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  });

  const topHabits = Object.values(allHabitStats)
    .filter((data) => data.totalSeconds > 0 || data.sessionsCount > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10)
    .map((data) => ({
      id: data.targetId,
      name: data.name,
      minutes: data.totalMinutes,
      seconds: data.totalSeconds,
      color: data.color,
      sessionsCount: data.sessionsCount,
      completedFullCount: data.completedFullCount,
      earlyFinishedCount: data.earlyFinishedCount,
      sessions: data.sessions,
    }));

  const topTasks = Object.values(allTaskStats)
    .filter((data) => data.totalSeconds > 0 || data.sessionsCount > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10)
    .map((data) => ({
      id: data.targetId,
      name: data.name,
      minutes: data.totalMinutes,
      seconds: data.totalSeconds,
      sessionsCount: data.sessionsCount,
      completedFullCount: data.completedFullCount,
      earlyFinishedCount: data.earlyFinishedCount,
      sessions: data.sessions,
    }));

  const dailyTrend = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return {
    todayMinutes,
    todaySeconds,
    todaySessionsCount,
    todayCoinsEarned,
    todayXpEarned,
    totalMinutes,
    totalSeconds,
    totalSessionsCount,
    totalCoinsEarned,
    totalXpEarned,
    completedFullCount,
    earlyFinishedCount,
    habitMinutesTotal,
    habitSecondsTotal,
    taskMinutesTotal,
    taskSecondsTotal,
    unassignedMinutesTotal,
    unassignedSecondsTotal,
    topHabits,
    topTasks,
    allHabitStats,
    allTaskStats,
    dailyTrend,
  };
}
