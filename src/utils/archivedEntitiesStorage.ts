import { Habit, Task } from '../types';
import { safeStorage } from './safeStorage';

const ARCHIVED_HABITS_KEY = 'lally_archived_habits_v1';
const ARCHIVED_TASKS_KEY = 'lally_archived_tasks_v1';

export interface ArchivedHabitRecord {
  habit: Habit;
  archivedAt: number; // ms timestamp
  archiveDate: string; // YYYY-MM-DD
  totalCompletedDays: number;
  lastActiveDate?: string;
  hasHistoricalLogs: boolean;
}

export interface ArchivedTaskRecord {
  task: Task;
  archivedAt: number; // ms timestamp
  archiveDate: string; // YYYY-MM-DD
  wasCompleted: boolean;
  hasHistoricalLogs: boolean;
}

/**
 * Retrieves all archived / deleted habits from local persistent storage
 */
export function getArchivedHabits(): ArchivedHabitRecord[] {
  try {
    const raw = safeStorage.getItem(ARCHIVED_HABITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse archived habits:', e);
    return [];
  }
}

/**
 * Archives a habit when it is removed by the user, preserving all check-ins, completion times, and pomodoro history
 */
export function archiveHabitOnDelete(habit: Habit): void {
  try {
    const current = getArchivedHabits();
    const existingIdx = current.findIndex((item) => item.habit.id === habit.id);

    const historyKeys = Object.keys(habit.history || {}).filter((k) => habit.history[k]);
    const totalCompletedDays = historyKeys.length;
    const sortedDates = [...historyKeys].sort();
    const lastActiveDate = sortedDates[sortedDates.length - 1];

    const record: ArchivedHabitRecord = {
      habit,
      archivedAt: Date.now(),
      archiveDate: new Date().toISOString().split('T')[0],
      totalCompletedDays,
      lastActiveDate,
      hasHistoricalLogs: totalCompletedDays > 0 || (habit.focusSessionsCount || 0) > 0,
    };

    let updated: ArchivedHabitRecord[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = record;
    } else {
      updated = [record, ...current];
    }

    safeStorage.setItem(ARCHIVED_HABITS_KEY, JSON.stringify(updated.slice(0, 500)));
  } catch (e) {
    console.warn('Failed to archive deleted habit:', e);
  }
}

/**
 * Retrieves all archived / deleted tasks from local persistent storage
 */
export function getArchivedTasks(): ArchivedTaskRecord[] {
  try {
    const raw = safeStorage.getItem(ARCHIVED_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse archived tasks:', e);
    return [];
  }
}

/**
 * Archives a task when it is deleted by the user, preserving completion status, dates, and times
 */
export function archiveTaskOnDelete(task: Task): void {
  try {
    const current = getArchivedTasks();
    const existingIdx = current.findIndex((item) => item.task.id === task.id);

    const hasLogs = !!task.completed || !!task.completedAt || (task.completedTimestamps && task.completedTimestamps.length > 0) || (task.totalFocusMinutes || 0) > 0;

    const record: ArchivedTaskRecord = {
      task,
      archivedAt: Date.now(),
      archiveDate: new Date().toISOString().split('T')[0],
      wasCompleted: task.completed,
      hasHistoricalLogs: hasLogs,
    };

    let updated: ArchivedTaskRecord[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = record;
    } else {
      updated = [record, ...current];
    }

    safeStorage.setItem(ARCHIVED_TASKS_KEY, JSON.stringify(updated.slice(0, 500)));
  } catch (e) {
    console.warn('Failed to archive deleted task:', e);
  }
}
