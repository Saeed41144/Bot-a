import { 
  Habit, 
  Task, 
  Language, 
  ThemeMode, 
  TelegramConfig, 
  FullBackupData, 
  FullBackupSettings, 
  UserRewardWallet, 
  WebNovel, 
  ShopMovie, 
  VideoPlaylist, 
  AdvancedSettings, 
  BackupType,
  SelectiveBackupOptions,
  SelectiveRestoreOptions,
  BackupSnapshotRecord,
  PomodoroSessionRecord,
  UserActivityLog
} from '../types';
import { calculateAchievements } from './achievements';
import { safeClipboardCopy } from './safeDom';
import { getPomodoroSessions, savePomodoroSessions } from './pomodoroStorage';
import { getUserActivityLogs } from './activityLearningStorage';
import { safeStorage } from './safeStorage';
import { getTodayString } from './persianDate';
import { calculateHabitStats } from './habitMath';

export const BACKUP_SCHEMA_VERSION = 2;
export const APP_NAME = 'Lally Scientific Habit Tracker';
export const APP_VERSION = '2.0.0';

export const BACKUP_SNAPSHOTS_STORAGE_KEY = 'lally_local_backup_snapshots_v1';

export const DEFAULT_SELECTIVE_BACKUP_OPTIONS: SelectiveBackupOptions = {
  includeHabits: true,
  includeTasks: true,
  includePomodoro: true,
  includeWallet: true,
  includeTelegram: true,
  includePreferences: true,
  includeAiKeys: false, // Default false for security / user choice
  includeMedia: false,  // Default false to keep backup file lightweight (~50KB)
  includeActivityLogs: true,
};

export const DEFAULT_SELECTIVE_RESTORE_OPTIONS: SelectiveRestoreOptions = {
  restoreHabits: true,
  restoreTasks: true,
  restorePomodoro: true,
  restoreWallet: true,
  restoreTelegram: true,
  restorePreferences: true,
  restoreAiKeys: true,
  restoreMedia: true,
  restoreActivityLogs: true,
  mode: 'merge',
};

/**
 * Calculates aggregate stats & brain level XP from habits for backup metadata
 */
export function extractBackupStats(habits: Habit[], language: Language = 'fa') {
  const totalHabits = habits.length;
  let totalCheckIns = 0;
  const uniqueDates = new Set<string>();

  habits.forEach((h) => {
    if (h.history && typeof h.history === 'object') {
      Object.entries(h.history).forEach(([dateStr, isDone]) => {
        if (isDone) {
          totalCheckIns++;
          uniqueDates.add(dateStr);
        }
      });
    }
  });

  let earnedXp = 0;
  let brainLevel = 1;
  let levelTitle = '';
  let unlockedAchievementsCount = 0;

  try {
    const overview = calculateAchievements(habits, language);
    earnedXp = overview.totalXp;
    brainLevel = overview.currentLevel.level;
    levelTitle = overview.currentLevel.title;
    unlockedAchievementsCount = overview.totalUnlocked;
  } catch {
    earnedXp = totalCheckIns * 5;
  }

  return {
    totalHabits,
    totalCheckIns,
    totalActiveDays: uniqueDates.size,
    earnedXp,
    brainLevel,
    levelTitle,
    unlockedAchievementsCount,
  };
}

/**
 * Formats byte size into human readable string (KB, MB, etc.)
 */
export function formatBackupBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Computes payload JSON size in bytes
 */
export function calculatePayloadSizeBytes(data: any): number {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

/**
 * Formats estimated backup payload size
 */
export function estimateBackupPayloadSize(data: any): string {
  const bytes = calculatePayloadSizeBytes(data);
  return formatBackupBytes(bytes);
}

/**
 * Creates a customized, selective backup payload based on granular user options.
 */
export function createSelectiveBackupPayload(
  habitsOrConfig: Habit[] | {
    options?: SelectiveBackupOptions;
    habits?: Habit[];
    tasks?: Task[];
    wallet?: UserRewardWallet;
    pomodoroSessions?: PomodoroSessionRecord[];
    customNovels?: WebNovel[];
    customMovies?: ShopMovie[];
    customPlaylists?: VideoPlaylist[];
    deletedMovieIds?: string[];
    deletedPlaylistIds?: string[];
    deletedNovelIds?: string[];
    telegramConfig?: TelegramConfig;
    language?: Language;
    theme?: ThemeMode;
    advancedSettings?: AdvancedSettings;
    activityLogs?: UserActivityLog[];
  },
  options: SelectiveBackupOptions = DEFAULT_SELECTIVE_BACKUP_OPTIONS,
  language: Language = 'fa',
  theme: ThemeMode = 'light',
  telegramConfig: TelegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  },
  rewardWallet?: UserRewardWallet,
  advancedSettings?: AdvancedSettings,
  tasks?: Task[],
  customNovels?: WebNovel[],
  customMovies?: ShopMovie[],
  customPlaylists?: VideoPlaylist[],
  deletedMovieIds?: string[],
  deletedPlaylistIds?: string[],
  deletedNovelIds?: string[],
  pomodoroSessions?: PomodoroSessionRecord[],
  activityLogs?: UserActivityLog[]
): FullBackupData {
  let finalHabits: Habit[] = [];
  let finalOptions = options;
  let finalLanguage = language;
  let finalTheme = theme;
  let finalTelegram = telegramConfig;
  let finalWallet = rewardWallet;
  let finalAdvanced = advancedSettings;
  let finalTasks = tasks;
  let finalNovels = customNovels;
  let finalMovies = customMovies;
  let finalPlaylists = customPlaylists;
  let finalDelMovies = deletedMovieIds;
  let finalDelPlaylists = deletedPlaylistIds;
  let finalDelNovels = deletedNovelIds;
  let finalPomodoro = pomodoroSessions;
  let finalActivityLogs = activityLogs;

  if (habitsOrConfig && !Array.isArray(habitsOrConfig) && typeof habitsOrConfig === 'object') {
    finalHabits = habitsOrConfig.habits || [];
    if (habitsOrConfig.options) finalOptions = habitsOrConfig.options;
    if (habitsOrConfig.language) finalLanguage = habitsOrConfig.language;
    if (habitsOrConfig.theme) finalTheme = habitsOrConfig.theme;
    if (habitsOrConfig.telegramConfig) finalTelegram = habitsOrConfig.telegramConfig;
    if (habitsOrConfig.wallet) finalWallet = habitsOrConfig.wallet;
    if (habitsOrConfig.advancedSettings) finalAdvanced = habitsOrConfig.advancedSettings;
    if (habitsOrConfig.tasks) finalTasks = habitsOrConfig.tasks;
    if (habitsOrConfig.customNovels) finalNovels = habitsOrConfig.customNovels;
    if (habitsOrConfig.customMovies) finalMovies = habitsOrConfig.customMovies;
    if (habitsOrConfig.customPlaylists) finalPlaylists = habitsOrConfig.customPlaylists;
    if (habitsOrConfig.deletedMovieIds) finalDelMovies = habitsOrConfig.deletedMovieIds;
    if (habitsOrConfig.deletedPlaylistIds) finalDelPlaylists = habitsOrConfig.deletedPlaylistIds;
    if (habitsOrConfig.deletedNovelIds) finalDelNovels = habitsOrConfig.deletedNovelIds;
    if (habitsOrConfig.pomodoroSessions) finalPomodoro = habitsOrConfig.pomodoroSessions;
    if (habitsOrConfig.activityLogs) finalActivityLogs = habitsOrConfig.activityLogs;
  } else if (Array.isArray(habitsOrConfig)) {
    finalHabits = habitsOrConfig;
  }

  const effectiveOptions: SelectiveBackupOptions = {
    ...finalOptions,
    includeTelegram: finalOptions.includeTelegram ?? finalOptions.includeTelegramConfig ?? true,
  };

  const exportDate = new Date().toISOString();
  const timestamp = Date.now();

  // 1. Filter Habits
  let targetHabits: Habit[] = [];
  if (effectiveOptions.includeHabits) {
    if (effectiveOptions.selectedHabitIds && effectiveOptions.selectedHabitIds.length > 0) {
      const allowedSet = new Set(effectiveOptions.selectedHabitIds);
      targetHabits = finalHabits.filter((h) => allowedSet.has(h.id));
    } else {
      targetHabits = finalHabits;
    }

    // Apply date range filter to habit history if specified
    if (effectiveOptions.dateRange && effectiveOptions.dateRange !== 'all') {
      const days = effectiveOptions.dateRange === '30days' ? 30 : effectiveOptions.dateRange === '90days' ? 90 : 365;
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      targetHabits = targetHabits.map((h) => {
        if (!h.history) return h;
        const filteredHistory: Record<string, boolean> = {};
        Object.entries(h.history).forEach(([dateStr, isDone]) => {
          try {
            const entryTime = new Date(dateStr).getTime();
            if (!isNaN(entryTime) && entryTime >= cutoffTime) {
              filteredHistory[dateStr] = isDone;
            }
          } catch {
            // Silently skip malformed date entries — don't include them in filtered history
          }
        });
        return { ...h, history: filteredHistory };
      });
    }
  }

  // 2. Filter Tasks
  let targetTasks: Task[] | undefined = undefined;
  if (effectiveOptions.includeTasks && finalTasks) {
    if (effectiveOptions.selectedTaskIds && effectiveOptions.selectedTaskIds.length > 0) {
      const allowedSet = new Set(effectiveOptions.selectedTaskIds);
      targetTasks = finalTasks.filter((t) => allowedSet.has(t.id));
    } else {
      targetTasks = finalTasks;
    }
  }

  // 3. Pomodoro Sessions
  let targetPomodoro: PomodoroSessionRecord[] | undefined = undefined;
  if (effectiveOptions.includePomodoro) {
    targetPomodoro = finalPomodoro || getPomodoroSessions();
  }

  // 4. Activity Logs
  let targetActivityLogs: UserActivityLog[] | undefined = undefined;
  if (effectiveOptions.includeActivityLogs) {
    targetActivityLogs = finalActivityLogs || getUserActivityLogs();
  }

  // 5. Sanitize / Filter Wallet
  let sanitizedWallet: UserRewardWallet | undefined = undefined;
  if (effectiveOptions.includeWallet && finalWallet) {
    sanitizedWallet = {
      coins: typeof finalWallet.coins === 'number' ? finalWallet.coins : 0,
      totalCoinsEarned: typeof finalWallet.totalCoinsEarned === 'number' ? finalWallet.totalCoinsEarned : 0,
      totalCoinsSpent: typeof finalWallet.totalCoinsSpent === 'number' ? finalWallet.totalCoinsSpent : 0,
      unlockedNovelIds: Array.isArray(finalWallet.unlockedNovelIds) ? [...finalWallet.unlockedNovelIds] : [],
      unlockedChapterIds: Array.isArray(finalWallet.unlockedChapterIds) ? [...finalWallet.unlockedChapterIds] : [],
      unlockedMovieIds: Array.isArray(finalWallet.unlockedMovieIds) ? [...finalWallet.unlockedMovieIds] : [],
      unlockedEpisodeIds: Array.isArray(finalWallet.unlockedEpisodeIds) ? [...finalWallet.unlockedEpisodeIds] : [],
      unlockedPlaylistIds: Array.isArray(finalWallet.unlockedPlaylistIds) ? [...finalWallet.unlockedPlaylistIds] : [],
      readingProgress: finalWallet.readingProgress ? { ...finalWallet.readingProgress } : {},
      movieWatchProgress: finalWallet.movieWatchProgress ? { ...finalWallet.movieWatchProgress } : {},
      transactions: Array.isArray(finalWallet.transactions) ? [...finalWallet.transactions] : [],
    };
  }

  // 6. Sanitize Advanced Settings & AI Keys
  let targetAdvancedSettings: AdvancedSettings | undefined = undefined;
  if (finalAdvanced) {
    targetAdvancedSettings = { ...finalAdvanced };
    if (!effectiveOptions.includeAiKeys || effectiveOptions.sanitizeSecrets) {
      if (targetAdvancedSettings.aiConfig) {
        targetAdvancedSettings = {
          ...targetAdvancedSettings,
          aiConfig: {
            analyticsAI: {
              keys: [],
              autoFallback: targetAdvancedSettings.aiConfig.analyticsAI?.autoFallback ?? true,
            },
            translationAI: {
              keys: [],
              autoFallback: targetAdvancedSettings.aiConfig.translationAI?.autoFallback ?? true,
            },
          },
        };
      }
    }
  }

  // 7. Media & Store Items
  const targetNovels = effectiveOptions.includeMedia ? finalNovels : undefined;
  const targetMovies = effectiveOptions.includeMedia ? finalMovies : undefined;
  const targetPlaylists = effectiveOptions.includeMedia ? finalPlaylists : undefined;
  const targetDelMovies = effectiveOptions.includeMedia ? finalDelMovies : undefined;
  const targetDelPlaylists = effectiveOptions.includeMedia ? finalDelPlaylists : undefined;
  const targetDelNovels = effectiveOptions.includeMedia ? finalDelNovels : undefined;

  // 8. Telegram Config
  const targetTelegramConfig: TelegramConfig = (effectiveOptions.includeTelegram && !effectiveOptions.sanitizeSecrets)
    ? finalTelegram
    : {
        botToken: '',
        chatId: '',
        autoDailyReport: false,
        reportTime: '21:00',
      };

  const stats = extractBackupStats(targetHabits, finalLanguage);

  let backupType: BackupType = 'user_only';
  if (effectiveOptions.includeMedia && (finalNovels?.length || finalMovies?.length || finalPlaylists?.length)) {
    backupType = 'complete';
  }

  const payload: FullBackupData = {
    version: APP_VERSION,
    appName: APP_NAME,
    exportDate,
    backupType,
    metadata: {
      version: APP_VERSION,
      appName: APP_NAME,
      exportDate,
      timestamp,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      backupType,
      containsShopFiles: !!effectiveOptions.includeMedia,
    },
    habits: targetHabits,
    tasks: targetTasks,
    pomodoroSessions: targetPomodoro,
    activityLogs: targetActivityLogs,
    settings: {
      language: effectiveOptions.includePreferences ? finalLanguage : 'fa',
      theme: effectiveOptions.includePreferences ? finalTheme : 'light',
      telegramConfig: targetTelegramConfig,
      rewardWallet: sanitizedWallet,
      customNovels: targetNovels,
      customMovies: targetMovies,
      customPlaylists: targetPlaylists,
      deletedMovieIds: targetDelMovies,
      deletedPlaylistIds: targetDelPlaylists,
      deletedNovelIds: targetDelNovels,
      advancedSettings: targetAdvancedSettings,
      tasks: targetTasks,
      pomodoroSessions: targetPomodoro,
      activityLogs: targetActivityLogs,
    },
    customNovels: targetNovels,
    customMovies: targetMovies,
    customPlaylists: targetPlaylists,
    deletedMovieIds: targetDelMovies,
    deletedPlaylistIds: targetDelPlaylists,
    deletedNovelIds: targetDelNovels,
    rewardWallet: sanitizedWallet,
    wallet: sanitizedWallet,
    advancedSettings: targetAdvancedSettings,
    stats,
    selectedOptions: effectiveOptions,
  };

  return payload;
}

/**
 * TIER 1: User-Only Data Backup (Used in Settings -> Backup Tab)
 */
export function createUserBackupPayload(
  habits: Habit[],
  language: Language = 'fa',
  theme: ThemeMode = 'light',
  telegramConfig: TelegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  },
  rewardWallet?: UserRewardWallet,
  advancedSettings?: AdvancedSettings,
  tasks?: Task[]
): FullBackupData {
  return createSelectiveBackupPayload(
    habits,
    {
      ...DEFAULT_SELECTIVE_BACKUP_OPTIONS,
      includeMedia: false,
      includeAiKeys: true,
    },
    language,
    theme,
    telegramConfig,
    rewardWallet,
    advancedSettings,
    tasks
  );
}

/**
 * TIER 2: Complete 100% Full System Backup (Used in Footer Backup Button & Advanced Settings Tab)
 */
export function createCompleteBackupPayload(
  habits: Habit[],
  language: Language = 'fa',
  theme: ThemeMode = 'light',
  telegramConfig: TelegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  },
  rewardWallet?: UserRewardWallet,
  customNovels?: WebNovel[],
  advancedSettings?: AdvancedSettings,
  storeProducts?: any[],
  tasks?: Task[],
  customMovies?: ShopMovie[],
  customPlaylists?: VideoPlaylist[],
  deletedMovieIds?: string[],
  deletedPlaylistIds?: string[],
  deletedNovelIds?: string[]
): FullBackupData {
  return createSelectiveBackupPayload(
    habits,
    {
      includeHabits: true,
      includeTasks: true,
      includePomodoro: true,
      includeWallet: true,
      includeTelegram: true,
      includePreferences: true,
      includeAiKeys: true,
      includeMedia: true,
      includeActivityLogs: true,
    },
    language,
    theme,
    telegramConfig,
    rewardWallet,
    advancedSettings,
    tasks,
    customNovels,
    customMovies,
    customPlaylists,
    deletedMovieIds,
    deletedPlaylistIds,
    deletedNovelIds
  );
}

/**
 * Backwards-compatible general backup generator
 */
export function createFullBackupPayload(
  habits: Habit[],
  language: Language = 'fa',
  theme: ThemeMode = 'light',
  telegramConfig: TelegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  },
  rewardWallet?: UserRewardWallet,
  customNovels?: WebNovel[],
  advancedSettings?: AdvancedSettings,
  options?: { excludeStoreData?: boolean },
  tasks?: Task[],
  customMovies?: ShopMovie[],
  customPlaylists?: VideoPlaylist[],
  deletedMovieIds?: string[],
  deletedPlaylistIds?: string[],
  deletedNovelIds?: string[]
): FullBackupData {
  if (options?.excludeStoreData) {
    return createUserBackupPayload(habits, language, theme, telegramConfig, rewardWallet, advancedSettings, tasks);
  }
  return createCompleteBackupPayload(
    habits,
    language,
    theme,
    telegramConfig,
    rewardWallet,
    customNovels,
    advancedSettings,
    undefined,
    tasks,
    customMovies,
    customPlaylists,
    deletedMovieIds,
    deletedPlaylistIds,
    deletedNovelIds
  );
}

export interface ParsedBackupResult {
  isValid: boolean;
  valid?: boolean;
  data?: FullBackupData;
  errorMessage?: string;
  exportDate?: string;
  errors?: string[];
  error?: string;
  habits: Habit[];
  tasks?: Task[];
  pomodoroSessions?: PomodoroSessionRecord[];
  activityLogs?: UserActivityLog[];
  settings?: Partial<FullBackupSettings>;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  storeProducts?: any[];
  rewardWallet?: UserRewardWallet;
  stats?: any;
  metadata?: any;
  backupType: BackupType;
  isLegacyFormat: boolean;
  summary: {
    habitCount: number;
    taskCount?: number;
    pomodoroCount?: number;
    activityLogsCount?: number;
    checkInCount: number;
    hasSettings: boolean;
    hasTelegram: boolean;
    hasWallet?: boolean;
    walletCoins?: number;
    hasAiKeys?: boolean;
    novelCount: number;
    movieCount?: number;
    playlistCount?: number;
    unlockedPurchasesCount?: number;
    language?: Language;
    theme?: ThemeMode;
    exportDate?: string;
    backupType: BackupType;
    isUserOnly: boolean;
    containsShopFiles: boolean;
    hasNovels?: boolean;
  };
}

/**
 * Validates and sanitizes an array of Task objects
 */
function sanitizeTasksArray(rawTasks: any[]): Task[] {
  if (!Array.isArray(rawTasks)) return [];
  return rawTasks
    .filter((item) => item && typeof item === 'object' && item.id && item.title)
    .map((item) => ({
      id: String(item.id),
      title: String(item.title).trim(),
      description: item.description ? String(item.description).trim() : undefined,
      completed: Boolean(item.completed),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      dueDate: item.dueDate ? String(item.dueDate) : undefined,
      dueTime: item.dueTime ? String(item.dueTime) : undefined,
      category: item.category ? String(item.category).trim() : undefined,
      completedAt: typeof item.completedAt === 'number' ? item.completedAt : item.completedAt ? Number(item.completedAt) || undefined : undefined,
      createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString().split('T')[0],
      rewardCoins: typeof item.rewardCoins === 'number' ? item.rewardCoins : 5,
      rewardXp: typeof item.rewardXp === 'number' ? item.rewardXp : 2,
      subtasks: Array.isArray(item.subtasks)
        ? item.subtasks
            .filter((s: any) => s && s.id && s.title)
            .map((s: any) => ({
              id: String(s.id),
              title: String(s.title).trim(),
              completed: Boolean(s.completed),
            }))
        : undefined,
    }));
}

/**
 * Validates and sanitizes an array of Habit objects
 */
function sanitizeHabitsArray(rawHabits: any[]): Habit[] {
  if (!Array.isArray(rawHabits)) return [];
  return rawHabits
    .filter((item) => item && typeof item === 'object' && item.id && item.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name).trim(),
      category: item.category ? String(item.category).trim() : 'General',
      description: item.description ? String(item.description).trim() : '',
      color: item.color ? String(item.color) : '#2563eb',
      iconName: item.iconName ? String(item.iconName) : 'Activity',
      createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString().split('T')[0],
      history: item.history && typeof item.history === 'object' ? item.history : {},
      targetDays: typeof item.targetDays === 'number' ? item.targetDays : 66,
      kRate: typeof item.kRate === 'number' ? item.kRate : 66,
      rewardCoins: typeof item.rewardCoins === 'number' ? item.rewardCoins : 10,
      rewardXp: typeof item.rewardXp === 'number' ? item.rewardXp : 5,
    }));
}

/**
 * Validates and sanitizes Pomodoro session records
 */
function sanitizePomodoroSessions(rawSessions: any[]): PomodoroSessionRecord[] {
  if (!Array.isArray(rawSessions)) return [];
  return rawSessions
    .filter((s) => s && typeof s === 'object' && s.id && typeof s.durationMinutes === 'number')
    .map((s) => ({
      id: String(s.id),
      targetType: s.targetType || 'none',
      targetId: s.targetId ? String(s.targetId) : undefined,
      targetName: s.targetName ? String(s.targetName) : undefined,
      targetTitle: s.targetTitle ? String(s.targetTitle) : undefined,
      durationMinutes: Number(s.durationMinutes) || 25,
      durationSeconds: typeof s.durationSeconds === 'number' ? s.durationSeconds : undefined,
      plannedMinutes: typeof s.plannedMinutes === 'number' ? s.plannedMinutes : undefined,
      isCompletedFull: Boolean(s.isCompletedFull),
      completedAt: s.completedAt ? String(s.completedAt) : getTodayString(),
      time: s.time ? String(s.time) : undefined,
      timestamp: Number(s.timestamp) || Date.now(),
      mode: s.mode || 'focus',
      rewardCoinsEarned: typeof s.rewardCoinsEarned === 'number' ? s.rewardCoinsEarned : undefined,
      rewardXpEarned: typeof s.rewardXpEarned === 'number' ? s.rewardXpEarned : undefined,
      notes: s.notes ? String(s.notes) : undefined,
    }));
}

/**
 * Parses and validates a JSON backup string with backward-compatibility for:
 * 1. User Data Backup (Schema v2, user_only)
 * 2. Complete Full System Backup (Schema v2, complete)
 * 3. Wrapped Habits Object ({ habits: [...] })
 * 4. Legacy Habits Array ([ { id, name, ... } ])
 */
export function parseAndValidateBackup(jsonStringOrData: string | FullBackupData | any): ParsedBackupResult {
  try {
    const parsed = typeof jsonStringOrData === 'string' ? JSON.parse(jsonStringOrData) : jsonStringOrData;

    if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
      return {
        isValid: false,
        valid: false,
        errors: ['Invalid JSON structure'],
        error: 'Invalid JSON structure',
        habits: [],
        backupType: 'legacy',
        isLegacyFormat: false,
        summary: {
          habitCount: 0,
          checkInCount: 0,
          hasSettings: false,
          hasTelegram: false,
          novelCount: 0,
          backupType: 'legacy',
          isUserOnly: false,
          containsShopFiles: false,
        },
      };
    }

    let habits: Habit[] = [];
    let tasks: Task[] | undefined = undefined;
    let pomodoroSessions: PomodoroSessionRecord[] | undefined = undefined;
    let activityLogs: UserActivityLog[] | undefined = undefined;
    let settings: Partial<FullBackupSettings> | undefined = undefined;
    let customNovels: WebNovel[] | undefined = undefined;
    let customMovies: ShopMovie[] | undefined = undefined;
    let customPlaylists: VideoPlaylist[] | undefined = undefined;
    let deletedMovieIds: string[] | undefined = undefined;
    let deletedPlaylistIds: string[] | undefined = undefined;
    let deletedNovelIds: string[] | undefined = undefined;
    let storeProducts: any[] | undefined = undefined;
    let rewardWallet: UserRewardWallet | undefined = undefined;
    let metadata: any = undefined;
    let stats: any = undefined;
    let isLegacyFormat = false;

    // Case 1: Legacy Array Format -> [ Habit1, Habit2, ... ]
    if (Array.isArray(parsed)) {
      habits = sanitizeHabitsArray(parsed);
      isLegacyFormat = true;
    }
    // Case 2: Object with habits array (Comprehensive v2 or Wrapped object)
    else if (parsed.habits && Array.isArray(parsed.habits)) {
      habits = sanitizeHabitsArray(parsed.habits);

      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        tasks = sanitizeTasksArray(parsed.tasks);
      } else if (parsed.settings?.tasks && Array.isArray(parsed.settings.tasks)) {
        tasks = sanitizeTasksArray(parsed.settings.tasks);
      }

      if (parsed.pomodoroSessions && Array.isArray(parsed.pomodoroSessions)) {
        pomodoroSessions = sanitizePomodoroSessions(parsed.pomodoroSessions);
      } else if (parsed.settings?.pomodoroSessions && Array.isArray(parsed.settings.pomodoroSessions)) {
        pomodoroSessions = sanitizePomodoroSessions(parsed.settings.pomodoroSessions);
      }

      if (parsed.activityLogs && Array.isArray(parsed.activityLogs)) {
        activityLogs = parsed.activityLogs;
      } else if (parsed.settings?.activityLogs && Array.isArray(parsed.settings.activityLogs)) {
        activityLogs = parsed.settings.activityLogs;
      }

      if (parsed.customNovels && Array.isArray(parsed.customNovels)) {
        customNovels = parsed.customNovels;
      } else if (parsed.settings?.customNovels && Array.isArray(parsed.settings.customNovels)) {
        customNovels = parsed.settings.customNovels;
      }

      if (parsed.customMovies && Array.isArray(parsed.customMovies)) {
        customMovies = parsed.customMovies;
      } else if (parsed.settings?.customMovies && Array.isArray(parsed.settings.customMovies)) {
        customMovies = parsed.settings.customMovies;
      }

      if (parsed.customPlaylists && Array.isArray(parsed.customPlaylists)) {
        customPlaylists = parsed.customPlaylists;
      } else if (parsed.settings?.customPlaylists && Array.isArray(parsed.settings.customPlaylists)) {
        customPlaylists = parsed.settings.customPlaylists;
      }

      if (parsed.deletedMovieIds && Array.isArray(parsed.deletedMovieIds)) {
        deletedMovieIds = parsed.deletedMovieIds;
      } else if (parsed.settings?.deletedMovieIds && Array.isArray(parsed.settings.deletedMovieIds)) {
        deletedMovieIds = parsed.settings.deletedMovieIds;
      }

      if (parsed.deletedPlaylistIds && Array.isArray(parsed.deletedPlaylistIds)) {
        deletedPlaylistIds = parsed.deletedPlaylistIds;
      } else if (parsed.settings?.deletedPlaylistIds && Array.isArray(parsed.settings.deletedPlaylistIds)) {
        deletedPlaylistIds = parsed.settings.deletedPlaylistIds;
      }

      if (parsed.deletedNovelIds && Array.isArray(parsed.deletedNovelIds)) {
        deletedNovelIds = parsed.deletedNovelIds;
      } else if (parsed.settings?.deletedNovelIds && Array.isArray(parsed.settings.deletedNovelIds)) {
        deletedNovelIds = parsed.settings.deletedNovelIds;
      }

      if (parsed.storeProducts && Array.isArray(parsed.storeProducts)) {
        storeProducts = parsed.storeProducts;
      }

      if (parsed.rewardWallet && typeof parsed.rewardWallet === 'object') {
        rewardWallet = parsed.rewardWallet;
      } else if (parsed.wallet && typeof parsed.wallet === 'object') {
        rewardWallet = parsed.wallet;
      } else if (parsed.settings?.rewardWallet && typeof parsed.settings.rewardWallet === 'object') {
        rewardWallet = parsed.settings.rewardWallet;
      }

      if (parsed.settings && typeof parsed.settings === 'object') {
        settings = {
          language: ['fa', 'ar', 'en'].includes(parsed.settings.language) ? parsed.settings.language : undefined,
          theme: ['light', 'dark'].includes(parsed.settings.theme) ? parsed.settings.theme : undefined,
          telegramConfig: parsed.settings.telegramConfig && typeof parsed.settings.telegramConfig === 'object'
            ? parsed.settings.telegramConfig
            : undefined,
          rewardWallet: rewardWallet || parsed.settings.rewardWallet,
          customNovels: customNovels || parsed.settings.customNovels,
          customMovies: customMovies || parsed.settings.customMovies,
          customPlaylists: customPlaylists || parsed.settings.customPlaylists,
          deletedMovieIds: deletedMovieIds || parsed.settings.deletedMovieIds,
          deletedPlaylistIds: deletedPlaylistIds || parsed.settings.deletedPlaylistIds,
          deletedNovelIds: deletedNovelIds || parsed.settings.deletedNovelIds,
          advancedSettings: parsed.settings.advancedSettings || parsed.advancedSettings,
          tasks: tasks || parsed.settings.tasks,
          pomodoroSessions: pomodoroSessions || parsed.settings.pomodoroSessions,
          activityLogs: activityLogs || parsed.settings.activityLogs,
        };
      }

      metadata = parsed.metadata || {
        version: parsed.version || '1.0.0',
        exportDate: parsed.exportDate || null,
        backupType: parsed.backupType,
      };

      stats = parsed.stats;
      isLegacyFormat = !parsed.settings && !parsed.metadata;
    } else {
      return {
        isValid: false,
        valid: false,
        habits: [],
        backupType: 'legacy',
        isLegacyFormat: false,
        summary: {
          habitCount: 0,
          checkInCount: 0,
          hasSettings: false,
          hasTelegram: false,
          novelCount: 0,
          backupType: 'legacy',
          isUserOnly: false,
          containsShopFiles: false,
        },
        error: 'No valid habit records found in backup data',
      };
    }

    if (habits.length === 0 && (!tasks || tasks.length === 0)) {
      return {
        isValid: false,
        valid: false,
        habits: [],
        backupType: 'legacy',
        isLegacyFormat,
        summary: {
          habitCount: 0,
          checkInCount: 0,
          hasSettings: false,
          hasTelegram: false,
          novelCount: 0,
          backupType: 'legacy',
          isUserOnly: false,
          containsShopFiles: false,
        },
        error: 'Backup file contains zero valid habits or tasks',
        errorMessage: 'Backup file contains zero valid habits or tasks',
      };
    }

    // Calculate check-in summary
    let checkInCount = 0;
    habits.forEach((h) => {
      if (h.history) {
        checkInCount += Object.values(h.history).filter(Boolean).length;
      }
    });

    const hasSettings = !!(settings?.language || settings?.theme || settings?.telegramConfig);
    const hasTelegram = !!(settings?.telegramConfig?.botToken && settings?.telegramConfig?.chatId);
    const hasWallet = !!(rewardWallet || settings?.rewardWallet);
    const novelCount = customNovels?.length || settings?.customNovels?.length || 0;
    const movieCount = customMovies?.length || settings?.customMovies?.length || 0;
    const playlistCount = customPlaylists?.length || settings?.customPlaylists?.length || 0;

    const activeWallet = rewardWallet || settings?.rewardWallet;
    const unlockedPurchasesCount = (activeWallet?.unlockedNovelIds?.length || 0) +
      (activeWallet?.unlockedMovieIds?.length || 0) +
      (activeWallet?.unlockedChapterIds?.length || 0) +
      (activeWallet?.unlockedEpisodeIds?.length || 0) +
      (activeWallet?.unlockedPlaylistIds?.length || 0);

    const adv = settings?.advancedSettings || parsed.advancedSettings;
    const hasAiKeys = !!(
      adv?.aiConfig?.analyticsAI?.keys?.length ||
      adv?.aiConfig?.translationAI?.keys?.length
    );

    let backupType: BackupType = 'legacy';
    if (metadata?.backupType) {
      backupType = metadata.backupType;
    } else if (parsed.backupType) {
      backupType = parsed.backupType;
    } else if (novelCount > 0 || movieCount > 0 || playlistCount > 0 || (storeProducts && storeProducts.length > 0)) {
      backupType = 'complete';
    } else if (hasSettings || hasWallet) {
      backupType = 'user_only';
    }

    const isUserOnly = backupType === 'user_only';
    const containsShopFiles = novelCount > 0 || movieCount > 0 || playlistCount > 0 || !!metadata?.containsShopFiles;

    const fullDataPayload: FullBackupData = {
      version: metadata?.version || APP_VERSION,
      appName: metadata?.appName || APP_NAME,
      exportDate: metadata?.exportDate || parsed.exportDate || new Date().toISOString(),
      backupType,
      metadata: metadata || {
        version: APP_VERSION,
        appName: APP_NAME,
        exportDate: new Date().toISOString(),
        timestamp: Date.now(),
        schemaVersion: BACKUP_SCHEMA_VERSION,
        backupType,
      },
      habits,
      tasks,
      pomodoroSessions,
      activityLogs,
      settings: (settings || {}) as FullBackupSettings,
      customNovels,
      customMovies,
      customPlaylists,
      deletedMovieIds,
      deletedPlaylistIds,
      deletedNovelIds,
      storeProducts,
      rewardWallet: activeWallet,
      wallet: activeWallet,
      advancedSettings: adv,
      stats,
    };

    return {
      isValid: true,
      valid: true,
      data: fullDataPayload,
      habits,
      tasks,
      pomodoroSessions,
      activityLogs,
      settings,
      customNovels,
      customMovies,
      customPlaylists,
      deletedMovieIds,
      deletedPlaylistIds,
      deletedNovelIds,
      storeProducts,
      rewardWallet: activeWallet,
      stats,
      metadata,
      backupType,
      isLegacyFormat,
      summary: {
        habitCount: habits.length,
        taskCount: tasks ? tasks.length : 0,
        pomodoroCount: pomodoroSessions ? pomodoroSessions.length : 0,
        activityLogsCount: activityLogs ? activityLogs.length : 0,
        checkInCount,
        hasSettings,
        hasTelegram,
        hasWallet,
        walletCoins: activeWallet?.coins,
        hasAiKeys,
        novelCount,
        movieCount,
        playlistCount,
        unlockedPurchasesCount,
        language: settings?.language,
        theme: settings?.theme,
        exportDate: metadata?.exportDate || parsed.exportDate,
        backupType,
        isUserOnly,
        containsShopFiles,
        hasNovels: novelCount > 0,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      valid: false,
      errorMessage: err.message || 'JSON parsing error',
      habits: [],
      backupType: 'legacy',
      isLegacyFormat: false,
      summary: {
        habitCount: 0,
        checkInCount: 0,
        hasSettings: false,
        hasTelegram: false,
        novelCount: 0,
        backupType: 'legacy',
        isUserOnly: false,
        containsShopFiles: false,
      },
      error: err.message || 'JSON parsing error',
    };
  }
}

/**
 * Triggers a browser file download of a backup payload
 */
export function downloadBackupFile(
  backupData: FullBackupData,
  fileNamePrefix: string = 'user-habits-backup'
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonStr = JSON.stringify(backupData, null, 2);
  const dataUri = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);

  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataUri);
  anchor.setAttribute('download', `${fileNamePrefix}-${dateStr}.json`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Copies the backup JSON string to the user's clipboard
 */
export async function copyBackupToClipboard(backupData: FullBackupData): Promise<boolean> {
  const jsonStr = JSON.stringify(backupData, null, 2);
  return safeClipboardCopy(jsonStr);
}

// -------------------------------------------------------------
// SNAPSHOTS (In-Browser Restore Points)
// -------------------------------------------------------------

export function getBackupSnapshots(): BackupSnapshotRecord[] {
  try {
    const raw = safeStorage.getItem(BACKUP_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load backup snapshots:', e);
    return [];
  }
}

export function saveBackupSnapshot(
  nameOrPayload: string | FullBackupData,
  payloadOrName?: FullBackupData | string
): BackupSnapshotRecord {
  let name = '';
  let payload: FullBackupData;

  if (typeof nameOrPayload === 'string') {
    name = nameOrPayload;
    payload = payloadOrName as FullBackupData;
  } else {
    payload = nameOrPayload as FullBackupData;
    name = (payloadOrName as string) || '';
  }

  const snapshots = getBackupSnapshots();
  const timestamp = Date.now();
  const dateStr = getTodayString();
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const sizeBytes = calculatePayloadSizeBytes(payload);
  const formattedSize = formatBackupBytes(sizeBytes);

  let checkInsCount = 0;
  (payload?.habits || []).forEach((h) => {
    if (h.history) {
      checkInsCount += Object.values(h.history).filter(Boolean).length;
    }
  });

  const finalName = name.trim() || `نقطه بازیابی ${dateStr} ${timeStr}`;

  const newSnapshot: BackupSnapshotRecord = {
    id: `snap-${timestamp}-${Math.random().toString(36).substring(2, 6)}`,
    name: finalName,
    label: finalName,
    timestamp,
    dateStr,
    timeStr,
    habitsCount: (payload?.habits || []).length,
    tasksCount: (payload?.tasks || []).length,
    checkInsCount,
    walletCoins: payload?.rewardWallet?.coins || payload?.wallet?.coins || 0,
    sizeBytes,
    formattedSize,
    payload,
    data: payload,
  };

  const updated = [newSnapshot, ...snapshots].slice(0, 20); // Keep last 20 snapshots
  try {
    safeStorage.setItem(BACKUP_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save backup snapshot:', e);
  }

  return newSnapshot;
}

export function deleteBackupSnapshot(id: string): BackupSnapshotRecord[] {
  const snapshots = getBackupSnapshots();
  const updated = snapshots.filter((s) => s.id !== id);
  try {
    safeStorage.setItem(BACKUP_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete snapshot:', e);
  }
  return updated;
}

export function clearBackupSnapshots(): void {
  try {
    safeStorage.removeItem(BACKUP_SNAPSHOTS_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear snapshots:', e);
  }
}

export const clearAllBackupSnapshots = clearBackupSnapshots;

// -------------------------------------------------------------
// TEXT & HTML REPORTS GENERATOR
// -------------------------------------------------------------

/**
 * Generates a clean, structured Markdown / Text report summary
 */
export function generateMarkdownBackupSummary(
  habits: Habit[],
  tasks: Task[] = [],
  wallet?: UserRewardWallet,
  language: Language = 'fa'
): string {
  const todayStr = getTodayString();
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  const title = isFa 
    ? `📊 گزارش جامع پیشرفت و پشتیبان‌گیری سیستم (${todayStr})` 
    : isAr 
    ? `📊 التقرير الشامل لتقدم العادات والنسخة الاحتياطية (${todayStr})`
    : `📊 Comprehensive Habit & Progress Backup Report (${todayStr})`;

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(isFa ? `📅 تاریخ گزارش: **${todayStr}**` : `📅 Report Date: **${todayStr}**`);
  if (wallet) {
    lines.push(isFa ? `💰 موجودی سکه‌های پاداش: **${wallet.coins} سکه** (مجموع کسب شده: ${wallet.totalCoinsEarned})` : `💰 Reward Coins Balance: **${wallet.coins}** (Total Earned: ${wallet.totalCoinsEarned})`);
  }
  lines.push(isFa ? `🎯 تعداد عادات فعال: **${habits.length}**` : `🎯 Active Habits: **${habits.length}**`);
  lines.push(isFa ? `✅ تعداد تسک‌ها: **${tasks.length}**` : `✅ Tasks: **${tasks.length}**`);
  lines.push('');
  lines.push(isFa ? `## 🌟 وضعیت پیشرفت عادات بر اساس مدل علمی لالی (۶۶ روز):` : `## 🌟 Habit Progress (Lally 66-Day Model):`);
  lines.push('');

  habits.forEach((h, idx) => {
    const stats = calculateHabitStats(h, todayStr, language);
    lines.push(`### ${idx + 1}. ${h.name} [${h.category || 'عمومی'}]`);
    lines.push(`- **درصد خودکاری (Automaticity):** ${stats.automaticity}%`);
    lines.push(`- **مرحله شکل‌گیری:** ${stats.stageLabel} (${stats.stage})`);
    lines.push(`- **زنجیره پیوسته فعلی:** ${stats.currentStreak} روز`);
    lines.push(`- **کل روزهای انجام شده:** ${stats.totalCompletedDays} از ${h.targetDays || 66} روز`);
    lines.push(`- **روزهای باقیمانده تا تثبیت کامل:** ${stats.remainingDays} روز`);
    lines.push(`- **وضعیت ثبت امروز:** ${stats.isDoneToday ? '✅ انجام شد' : '⏳ در انتظار انجام'}`);
    lines.push('');
  });

  if (tasks.length > 0) {
    lines.push(isFa ? `## 📋 لیست تسک‌ها و وظایف:` : `## 📋 Tasks List:`);
    lines.push('');
    tasks.forEach((t, idx) => {
      const status = t.completed ? '✅ تکمیل شده' : '⏳ در انتظار';
      const prio = t.priority === 'high' ? '🔥 فوری' : t.priority === 'medium' ? '⚡ متوسط' : '🌱 عادی';
      lines.push(`${idx + 1}. [${status}] **${t.title}** (${prio}) ${t.dueDate ? `- موعد: ${t.dueDate}` : ''}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push(isFa ? `*تولید شده توسط سیستم علمی رهگیری عادات لالی (نسخه ${APP_VERSION})*` : `*Generated by Lally Scientific Habit Tracker (v${APP_VERSION})*`);

  return lines.join('\n');
}

/**
 * Downloads a human-readable Markdown summary file
 */
export function downloadMarkdownSummaryFile(
  habits: Habit[],
  tasks: Task[] = [],
  wallet?: UserRewardWallet,
  language: Language = 'fa'
) {
  const mdContent = generateMarkdownBackupSummary(habits, tasks, wallet, language);
  const dateStr = getTodayString();
  const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);

  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataUri);
  anchor.setAttribute('download', `habits-progress-report-${dateStr}.md`);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Downloads a human-readable Markdown report from payload or habits
 */
export function downloadMarkdownReport(
  payloadOrHabits: FullBackupData | Habit[],
  language: Language = 'fa'
) {
  if (Array.isArray(payloadOrHabits)) {
    return downloadMarkdownSummaryFile(payloadOrHabits, [], undefined, language);
  }
  return downloadMarkdownSummaryFile(
    payloadOrHabits.habits || [],
    payloadOrHabits.tasks || [],
    payloadOrHabits.rewardWallet || payloadOrHabits.wallet,
    language
  );
}

/**
 * Executes a selective restore operation by smartly merging or replacing data
 */
export function executeSelectiveRestore(
  backupOrParams:
    | ParsedBackupResult
    | {
        uploadedData?: FullBackupData | ParsedBackupResult;
        backup?: ParsedBackupResult;
        options: SelectiveRestoreOptions;
        currentHabits?: Habit[];
        currentTasks?: Task[];
        currentWallet?: UserRewardWallet;
        currentCustomNovels?: WebNovel[];
        currentCustomMovies?: ShopMovie[];
        currentCustomPlaylists?: VideoPlaylist[];
        currentDeletedMovieIds?: string[];
        currentDeletedPlaylistIds?: string[];
        currentDeletedNovelIds?: string[];
        currentTelegramConfig?: TelegramConfig;
        currentAdvancedSettings?: AdvancedSettings;
        currentLanguage?: Language;
        currentTheme?: ThemeMode;
        current?: any;
      },
  optionsParam?: SelectiveRestoreOptions,
  currentParam?: {
    habits?: Habit[];
    tasks?: Task[];
    wallet?: UserRewardWallet;
    settings?: any;
    customNovels?: WebNovel[];
    customMovies?: ShopMovie[];
    customPlaylists?: VideoPlaylist[];
    deletedMovieIds?: string[];
    deletedPlaylistIds?: string[];
    deletedNovelIds?: string[];
    advancedSettings?: AdvancedSettings;
    telegramConfig?: TelegramConfig;
    language?: Language;
    theme?: ThemeMode;
  }
): {
  restoredHabits: Habit[];
  restoredSettings: Partial<FullBackupSettings>;
  mergedHabits: Habit[];
  mergedSettings: Partial<FullBackupSettings>;
} {
  let backup: ParsedBackupResult;
  let options: SelectiveRestoreOptions = DEFAULT_SELECTIVE_RESTORE_OPTIONS;
  let currentHabits: Habit[] = [];
  let currentTasks: Task[] = [];
  let currentWallet: UserRewardWallet = {
    coins: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    unlockedNovelIds: [],
    unlockedChapterIds: [],
    unlockedMovieIds: [],
    unlockedEpisodeIds: [],
    unlockedPlaylistIds: [],
    readingProgress: {},
    movieWatchProgress: {},
    transactions: [],
  };
  let currentNovels: WebNovel[] = [];
  let currentMovies: ShopMovie[] = [];
  let currentPlaylists: VideoPlaylist[] = [];
  let currentDeletedMovieIds: string[] = [];
  let currentDeletedPlaylistIds: string[] = [];
  let currentDeletedNovelIds: string[] = [];
  let currentTelegram: TelegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  };
  let currentAdvanced: AdvancedSettings | undefined = undefined;
  let currentLang: Language = 'fa';
  let currentTh: ThemeMode = 'light';

  if (backupOrParams && 'uploadedData' in backupOrParams) {
    const rawData = (backupOrParams as any).uploadedData;
    if (rawData?.habits && Array.isArray(rawData.habits)) {
      backup = {
        isValid: true,
        valid: true,
        data: rawData,
        habits: rawData.habits || [],
        tasks: rawData.tasks,
        pomodoroSessions: rawData.pomodoroSessions,
        activityLogs: rawData.activityLogs,
        settings: rawData.settings,
        customNovels: rawData.customNovels,
        customMovies: rawData.customMovies,
        customPlaylists: rawData.customPlaylists,
        deletedMovieIds: rawData.deletedMovieIds,
        deletedPlaylistIds: rawData.deletedPlaylistIds,
        deletedNovelIds: rawData.deletedNovelIds,
        rewardWallet: rawData.rewardWallet || rawData.wallet,
        backupType: rawData.backupType || 'user_only',
        isLegacyFormat: false,
        summary: {
          habitCount: rawData.habits?.length || 0,
          checkInCount: 0,
          hasSettings: !!rawData.settings,
          hasTelegram: !!rawData.settings?.telegramConfig,
          novelCount: rawData.customNovels?.length || 0,
          backupType: rawData.backupType || 'user_only',
          isUserOnly: true,
          containsShopFiles: false,
        },
      };
    } else {
      backup = parseAndValidateBackup(typeof rawData === 'string' ? rawData : JSON.stringify(rawData));
    }
    options = backupOrParams.options || DEFAULT_SELECTIVE_RESTORE_OPTIONS;
    currentHabits = (backupOrParams as any).currentHabits || [];
    currentTasks = (backupOrParams as any).currentTasks || [];
    currentWallet = (backupOrParams as any).currentWallet || currentWallet;
    currentNovels = (backupOrParams as any).currentCustomNovels || [];
    currentMovies = (backupOrParams as any).currentCustomMovies || [];
    currentPlaylists = (backupOrParams as any).currentCustomPlaylists || [];
    currentDeletedMovieIds = (backupOrParams as any).currentDeletedMovieIds || [];
    currentDeletedPlaylistIds = (backupOrParams as any).currentDeletedPlaylistIds || [];
    currentDeletedNovelIds = (backupOrParams as any).currentDeletedNovelIds || [];
    currentTelegram = (backupOrParams as any).currentTelegramConfig || currentTelegram;
    currentAdvanced = (backupOrParams as any).currentAdvancedSettings;
    currentLang = (backupOrParams as any).currentLanguage || 'fa';
    currentTh = (backupOrParams as any).currentTheme || 'light';
  } else {
    backup = backupOrParams as ParsedBackupResult;
    if (optionsParam) options = optionsParam;
    if (currentParam) {
      currentHabits = currentParam.habits || [];
      currentTasks = currentParam.tasks || [];
      currentWallet = currentParam.wallet || currentWallet;
      currentNovels = currentParam.customNovels || [];
      currentMovies = currentParam.customMovies || [];
      currentPlaylists = currentParam.customPlaylists || [];
      currentDeletedMovieIds = currentParam.deletedMovieIds || [];
      currentDeletedPlaylistIds = currentParam.deletedPlaylistIds || [];
      currentDeletedNovelIds = currentParam.deletedNovelIds || [];
      currentTelegram = currentParam.telegramConfig || currentTelegram;
      currentAdvanced = currentParam.advancedSettings;
      currentLang = currentParam.language || 'fa';
      currentTh = currentParam.theme || 'light';
    }
  }

  const isMerge = options.mode === 'merge';

  // 1. HABITS RESTORATION
  let finalHabits: Habit[] = currentHabits;
  if (options.restoreHabits && backup.habits && backup.habits.length > 0) {
    if (isMerge) {
      const habitMap = new Map<string, Habit>();
      currentHabits.forEach((h) => habitMap.set(h.id, { ...h, history: { ...(h.history || {}) } }));

      backup.habits.forEach((importedHabit) => {
        const existing = habitMap.get(importedHabit.id) || 
          Array.from(habitMap.values()).find((h) => h.name.trim().toLowerCase() === importedHabit.name.trim().toLowerCase());

        if (existing) {
          const mergedHistory = {
            ...(existing.history || {}),
            ...(importedHabit.history || {}),
          };
          habitMap.set(existing.id, {
            ...existing,
            ...importedHabit,
            id: existing.id,
            history: mergedHistory,
            targetDays: importedHabit.targetDays || existing.targetDays,
            rewardCoins: importedHabit.rewardCoins || existing.rewardCoins,
          });
        } else {
          habitMap.set(importedHabit.id, importedHabit);
        }
      });
      finalHabits = Array.from(habitMap.values());
    } else {
      finalHabits = backup.habits;
    }
  }

  // 2. TASKS RESTORATION
  let finalTasks: Task[] = currentTasks;
  if (options.restoreTasks && backup.tasks && backup.tasks.length > 0) {
    if (isMerge) {
      const taskMap = new Map<string, Task>();
      currentTasks.forEach((t) => taskMap.set(t.id, t));
      backup.tasks.forEach((importedTask) => {
        taskMap.set(importedTask.id, importedTask);
      });
      finalTasks = Array.from(taskMap.values());
    } else {
      finalTasks = backup.tasks;
    }
  }

  // 3. POMODORO SESSIONS RESTORATION
  if (options.restorePomodoro && backup.pomodoroSessions && backup.pomodoroSessions.length > 0) {
    const currentSessions = getPomodoroSessions();
    if (isMerge) {
      const sessionIds = new Set(currentSessions.map((s) => s.id));
      const newSessions = backup.pomodoroSessions.filter((s) => !sessionIds.has(s.id));
      const combined = [...newSessions, ...currentSessions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 1000);
      savePomodoroSessions(combined);
    } else {
      savePomodoroSessions(backup.pomodoroSessions);
    }
  }

  // 4. WALLET RESTORATION
  let finalWallet: UserRewardWallet = currentWallet;
  if (options.restoreWallet && backup.rewardWallet) {
    if (isMerge) {
      const imp = backup.rewardWallet;
      finalWallet = {
        coins: Math.max(currentWallet.coins, imp.coins || 0),
        totalCoinsEarned: Math.max(currentWallet.totalCoinsEarned, imp.totalCoinsEarned || 0),
        totalCoinsSpent: Math.max(currentWallet.totalCoinsSpent, imp.totalCoinsSpent || 0),
        unlockedNovelIds: Array.from(new Set([...(currentWallet.unlockedNovelIds || []), ...(imp.unlockedNovelIds || [])])),
        unlockedChapterIds: Array.from(new Set([...(currentWallet.unlockedChapterIds || []), ...(imp.unlockedChapterIds || [])])),
        unlockedMovieIds: Array.from(new Set([...(currentWallet.unlockedMovieIds || []), ...(imp.unlockedMovieIds || [])])),
        unlockedEpisodeIds: Array.from(new Set([...(currentWallet.unlockedEpisodeIds || []), ...(imp.unlockedEpisodeIds || [])])),
        unlockedPlaylistIds: Array.from(new Set([...(currentWallet.unlockedPlaylistIds || []), ...(imp.unlockedPlaylistIds || [])])),
        readingProgress: {
          ...(currentWallet.readingProgress || {}),
          ...(imp.readingProgress || {}),
        },
        movieWatchProgress: {
          ...(currentWallet.movieWatchProgress || {}),
          ...(imp.movieWatchProgress || {}),
        },
        transactions: [
          ...(imp.transactions || []),
          ...(currentWallet.transactions || []),
        ].slice(0, 100),
      };
    } else {
      finalWallet = backup.rewardWallet;
    }
  }

  // 5. TELEGRAM CONFIG
  let finalTelegram = currentTelegram;
  if (options.restoreTelegram && backup.settings?.telegramConfig) {
    finalTelegram = {
      ...currentTelegram,
      ...backup.settings.telegramConfig,
    };
  }

  // 6. PREFERENCES & ADVANCED SETTINGS
  let finalLanguage = currentLang;
  let finalTheme = currentTh;
  let finalAdvanced = currentAdvanced;

  if (options.restorePreferences) {
    if (backup.settings?.language) finalLanguage = backup.settings.language;
    if (backup.settings?.theme) finalTheme = backup.settings.theme;
  }

  if (options.restorePreferences && backup.settings?.advancedSettings) {
    const impAdv = backup.settings.advancedSettings;
    finalAdvanced = {
      ...currentAdvanced,
      ...impAdv,
    };
  }

  // 7. AI KEYS
  if (options.restoreAiKeys && backup.settings?.advancedSettings?.aiConfig) {
    finalAdvanced = {
      ...finalAdvanced,
      aiConfig: backup.settings.advancedSettings.aiConfig,
    };
  }

  // 8. MEDIA & STORE
  let finalNovels = currentNovels;
  let finalMovies = currentMovies;
  let finalPlaylists = currentPlaylists;
  let finalDelMovies = currentDeletedMovieIds;
  let finalDelPlaylists = currentDeletedPlaylistIds;
  let finalDelNovels = currentDeletedNovelIds;

  if (options.restoreMedia) {
    if (backup.customNovels && backup.customNovels.length > 0) {
      if (isMerge) {
        const novelMap = new Map<string, WebNovel>();
        currentNovels.forEach((n) => novelMap.set(n.id, n));
        backup.customNovels.forEach((n) => novelMap.set(n.id, n));
        finalNovels = Array.from(novelMap.values());
      } else {
        finalNovels = backup.customNovels;
      }
    }
    if (backup.customMovies && backup.customMovies.length > 0) {
      if (isMerge) {
        const movieMap = new Map<string, ShopMovie>();
        currentMovies.forEach((m) => movieMap.set(m.id, m));
        backup.customMovies.forEach((m) => movieMap.set(m.id, m));
        finalMovies = Array.from(movieMap.values());
      } else {
        finalMovies = backup.customMovies;
      }
    }
    if (backup.customPlaylists && backup.customPlaylists.length > 0) {
      if (isMerge) {
        const plMap = new Map<string, VideoPlaylist>();
        currentPlaylists.forEach((p) => plMap.set(p.id, p));
        backup.customPlaylists.forEach((p) => plMap.set(p.id, p));
        finalPlaylists = Array.from(plMap.values());
      } else {
        finalPlaylists = backup.customPlaylists;
      }
    }
    if (backup.deletedMovieIds) {
      finalDelMovies = Array.from(new Set([...currentDeletedMovieIds, ...backup.deletedMovieIds]));
    }
    if (backup.deletedPlaylistIds) {
      finalDelPlaylists = Array.from(new Set([...currentDeletedPlaylistIds, ...backup.deletedPlaylistIds]));
    }
    if (backup.deletedNovelIds) {
      finalDelNovels = Array.from(new Set([...currentDeletedNovelIds, ...backup.deletedNovelIds]));
    }
  }

  const restoredSettings: Partial<FullBackupSettings> = {
    language: options.restorePreferences ? finalLanguage : undefined,
    theme: options.restorePreferences ? finalTheme : undefined,
    telegramConfig: options.restoreTelegram ? finalTelegram : undefined,
    rewardWallet: options.restoreWallet ? finalWallet : undefined,
    tasks: options.restoreTasks ? finalTasks : undefined,
    advancedSettings: finalAdvanced,
    customNovels: options.restoreMedia ? finalNovels : undefined,
    customMovies: options.restoreMedia ? finalMovies : undefined,
    customPlaylists: options.restoreMedia ? finalPlaylists : undefined,
    deletedMovieIds: options.restoreMedia ? finalDelMovies : undefined,
    deletedPlaylistIds: options.restoreMedia ? finalDelPlaylists : undefined,
    deletedNovelIds: options.restoreMedia ? finalDelNovels : undefined,
    pomodoroSessions: options.restorePomodoro ? backup.pomodoroSessions : undefined,
    activityLogs: options.restoreActivityLogs ? backup.activityLogs : undefined,
  };

  return {
    restoredHabits: finalHabits,
    restoredSettings,
    mergedHabits: finalHabits,
    mergedSettings: restoredSettings,
  };
}

// -------------------------------------------------------------
// CSV DATA EXPORTERS (EXCEL / SHEETS COMPATIBLE)
// -------------------------------------------------------------

/**
 * Exports habits and their check-in statistics to standard CSV format
 */
export function exportHabitsToCSV(habits: Habit[], language: Language = 'fa'): string {
  const isFa = language === 'fa';
  const headers = isFa
    ? ['شناسه', 'عنوان عادت', 'دسته‌بندی', 'هدف (روز)', 'سکه‌های پاداش', 'ضریب خودکارسازی (%)', 'مجموع ثبت‌ها', 'طولانی‌ترین زنجیره', 'رنگ', 'تاریخ ایجاد']
    : ['ID', 'Title', 'Category', 'Target Days', 'Reward Coins', 'Automaticity (%)', 'Total Check-ins', 'Best Streak', 'Color', 'Created Date'];

  const rows: string[][] = [headers];

  habits.forEach((h) => {
    const stats = calculateHabitStats(h);
    const automaticityPct = Math.round(stats.automaticity || 0);
    rows.push([
      `"${h.id}"`,
      `"${(h.name || '').replace(/"/g, '""')}"`,
      `"${(h.category || '').replace(/"/g, '""')}"`,
      String(h.targetDays || 66),
      String(h.rewardCoins || 10),
      String(automaticityPct),
      String(stats.totalCompletedDays || 0),
      String(stats.longestStreak || stats.currentStreak || 0),
      `"${h.color || '#4f46e5'}"`,
      `"${h.createdAt || ''}"`,
    ]);
  });

  return '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
}

export function downloadHabitsCSV(habits: Habit[], language: Language = 'fa') {
  const csvContent = exportHabitsToCSV(habits, language);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = getTodayString().replace(/[^0-9-]/g, '_');
  a.href = url;
  a.download = `lally-habits-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports tasks to CSV
 */
export function exportTasksToCSV(tasks: Task[], language: Language = 'fa'): string {
  const isFa = language === 'fa';
  const headers = isFa
    ? ['شناسه', 'عنوان تسک', 'وضعیت', 'اولویت', 'تکرار', 'تعداد زیرتسک‌ها', 'امتیاز پاداش', 'تاریخ سررسید']
    : ['ID', 'Title', 'Status', 'Priority', 'Recurrence', 'Subtasks Count', 'Reward Coins', 'Due Date'];

  const rows: string[][] = [headers];

  tasks.forEach((t) => {
    rows.push([
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.completed ? (isFa ? 'تکمیل شده' : 'Completed') : (isFa ? 'در انتظار' : 'Pending'),
      `"${t.priority || 'medium'}"`,
      `"${t.recurrence || 'none'}"`,
      String((t.subtasks || []).length),
      String(t.rewardCoins || 0),
      `"${t.dueDate || ''}"`,
    ]);
  });

  return '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
}

export function downloadTasksCSV(tasks: Task[], language: Language = 'fa') {
  const csvContent = exportTasksToCSV(tasks, language);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = getTodayString().replace(/[^0-9-]/g, '_');
  a.href = url;
  a.download = `lally-tasks-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// STANDALONE INTERACTIVE HTML REPORT
// -------------------------------------------------------------

export function generateInteractiveHTMLReport(payload: FullBackupData, language: Language = 'fa'): string {
  const isFa = language === 'fa';
  const habits = payload.habits || [];
  const tasks = payload.tasks || [];
  const wallet = payload.rewardWallet || payload.wallet;
  const stats = payload.stats || extractBackupStats(habits, language);
  const exportDate = payload.exportDate || new Date().toLocaleString();

  const habitCardsHtml = habits
    .map((h) => {
      const hStats = calculateHabitStats(h);
      const autoPct = Math.round(hStats.automaticity || 0);
      const totalChecks = hStats.totalCompletedDays || 0;
      return `
      <div class="card habit-card" style="border-top: 4px solid ${h.color || '#4f46e5'};">
        <div class="card-header">
          <h3>${h.name}</h3>
          <span class="badge" style="background: ${h.color || '#4f46e5'}20; color: ${h.color || '#4f46e5'};">${h.category || (isFa ? 'عادت' : 'Habit')}</span>
        </div>
        <div class="metrics-grid">
          <div class="metric">
            <div class="num">${autoPct}%</div>
            <div class="lbl">${isFa ? 'نمره شکل‌گیری' : 'Automaticity'}</div>
          </div>
          <div class="metric">
            <div class="num">${totalChecks}</div>
            <div class="lbl">${isFa ? 'ثبت موفق' : 'Check-ins'}</div>
          </div>
          <div class="metric">
            <div class="num">${hStats.currentStreak || 0} 🔥</div>
            <div class="lbl">${isFa ? 'زنجیره فعلی' : 'Streak'}</div>
          </div>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${Math.min(100, (totalChecks / (h.targetDays || 66)) * 100)}%; background: ${h.color || '#4f46e5'};"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.7; margin-top: 6px;">
          <span>${isFa ? 'هدف دوره:' : 'Target:'} ${h.targetDays || 66} ${isFa ? 'روز' : 'days'}</span>
          <span>${isFa ? 'پاداش:' : 'Reward:'} ${h.rewardCoins || 10} 🪙</span>
        </div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${language}" dir="${isFa ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isFa ? 'گزارش تعاملی نسخه پشتیبان لالی' : 'Lally Habit Tracker Interactive Report'}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #6366f1;
      --border: #334155;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --text: #0f172a;
        --text-muted: #64748b;
        --border: #e2e8f0;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Vazirmatn', sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.6;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      background: var(--card-bg);
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--border);
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    h1 { font-size: 22px; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .header-meta { font-size: 12px; color: var(--text-muted); }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 16px;
      border-radius: 16px;
      text-align: center;
    }
    .stat-num { font-size: 24px; font-weight: 900; color: var(--accent); }
    .stat-lbl { font-size: 11px; color: var(--text-muted); font-weight: 600; margin-top: 4px; }
    .habits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      transition: transform 0.15s ease;
    }
    .card:hover { transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .card-header h3 { font-size: 15px; font-weight: 700; }
    .badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 8px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center; margin-bottom: 12px; }
    .metric .num { font-size: 15px; font-weight: 800; }
    .metric .lbl { font-size: 10px; color: var(--text-muted); }
    .progress-bar-bg { height: 6px; background: var(--border); border-radius: 6px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 6px; }
    .search-bar {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--card-bg);
      color: var(--text);
      font-size: 13px;
      margin-bottom: 20px;
      outline: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🧠 ${isFa ? 'گزارش وضعیت عادات و پیشرفت لالی' : 'Lally Scientific Tracker Report'}</h1>
        <div class="header-meta">${isFa ? 'تاریخ استخراج:' : 'Exported:'} ${exportDate}</div>
      </div>
      <div>
        <span class="badge" style="background: #6366f120; color: #6366f1; font-size: 12px; padding: 6px 12px;">
          ${stats.levelTitle ? `${isFa ? 'سطح مغز:' : 'Brain Level:'} ${stats.levelTitle}` : `XP: ${stats.earnedXp}`}
        </span>
      </div>
    </header>

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-num">${habits.length}</div>
        <div class="stat-lbl">${isFa ? 'تعداد عادات فعال' : 'Active Habits'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${stats.totalCheckIns}</div>
        <div class="stat-lbl">${isFa ? 'مجموع ثبت‌های موفق' : 'Total Check-ins'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${tasks.length}</div>
        <div class="stat-lbl">${isFa ? 'تسک‌ها و وظایف' : 'Tasks'}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${wallet?.coins ?? 0} 🪙</div>
        <div class="stat-lbl">${isFa ? 'موجودی سکه' : 'Wallet Coins'}</div>
      </div>
    </div>

    <input type="text" id="habitSearch" class="search-bar" placeholder="${isFa ? 'جستجو در عادات...' : 'Search habits...'}" oninput="filterHabits()" />

    <div class="habits-grid" id="habitsGrid">
      ${habitCardsHtml}
    </div>
  </div>

  <script>
    function filterHabits() {
      const q = document.getElementById('habitSearch').value.toLowerCase();
      const cards = document.querySelectorAll('.habit-card');
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'block' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

export function downloadInteractiveHTMLReport(payload: FullBackupData, language: Language = 'fa') {
  const html = generateInteractiveHTMLReport(payload, language);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = getTodayString().replace(/[^0-9-]/g, '_');
  a.href = url;
  a.download = `lally-report-${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// CLIENT-SIDE AES-GCM ENCRYPTION & PASSWORD PROTECTION
// -------------------------------------------------------------

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts backup JSON with user password using AES-GCM 256
 */
export async function encryptBackupPayload(payload: FullBackupData, password: string): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const data = enc.encode(jsonStr);

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const saltBase64 = btoa(String.fromCharCode(...salt));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));

  const encryptedEnvelope = {
    _lally_encrypted: true,
    v: 1,
    salt: saltBase64,
    iv: ivBase64,
    data: dataBase64,
    date: new Date().toISOString(),
  };

  return JSON.stringify(encryptedEnvelope, null, 2);
}

/**
 * Decrypts encrypted backup payload with password
 */
export async function decryptBackupPayload(encryptedJsonStr: string, password: string): Promise<FullBackupData> {
  const parsed = JSON.parse(encryptedJsonStr);
  if (!parsed._lally_encrypted) {
    throw new Error('Not an encrypted Lally backup file');
  }

  const salt = Uint8Array.from(atob(parsed.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(parsed.iv), (c) => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(parsed.data), (c) => c.charCodeAt(0));

  const key = await deriveKey(password, salt);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBytes
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuf);
  return JSON.parse(jsonStr);
}

// -------------------------------------------------------------
// DEEP DIFF COMPARISON HELPER
// -------------------------------------------------------------

export interface BackupDiffComparison {
  totalIncomingHabits: number;
  newHabitsCount: number;
  existingHabitsCount: number;
  newCheckInsCount: number;
  totalIncomingTasks: number;
  newTasksCount: number;
  walletCoinDiff: number;
  hasIncomingTelegram: boolean;
  hasIncomingAiKeys: boolean;
}

export function compareBackupWithCurrent(
  backup: ParsedBackupResult,
  current: {
    habits: Habit[];
    tasks: Task[];
    wallet?: UserRewardWallet;
  }
): BackupDiffComparison {
  const incomingHabits = backup.habits || [];
  const safeHabits: Habit[] = current.habits ?? [];
  const safeTasks: Task[] = current.tasks ?? [];
  const currentHabitsMap = new Map<string, Habit>();
  safeHabits.forEach((h) => currentHabitsMap.set(h.id, h));

  let newHabitsCount = 0;
  let existingHabitsCount = 0;
  let newCheckInsCount = 0;

  incomingHabits.forEach((inH) => {
    const existing = currentHabitsMap.get(inH.id) || safeHabits.find((h) => h.name === inH.name);
    if (!existing) {
      newHabitsCount++;
    } else {
      existingHabitsCount++;
      const existingHistory = existing.history || {};
      const incomingHistory = inH.history || {};
      Object.entries(incomingHistory).forEach(([d, done]) => {
        if (done && !existingHistory[d]) {
          newCheckInsCount++;
        }
      });
    }
  });

  const currentTaskIds = new Set(safeTasks.map((t) => t.id));
  const incomingTasks = backup.tasks || [];
  const newTasksCount = incomingTasks.filter((t) => !currentTaskIds.has(t.id)).length;

  const incomingCoins = backup.rewardWallet?.coins ?? backup.summary.walletCoins ?? 0;
  const currentCoins = current.wallet?.coins ?? 0;
  const walletCoinDiff = incomingCoins - currentCoins;

  const hasIncomingTelegram = !!backup.settings?.telegramConfig?.botToken;
  const hasIncomingAiKeys = !!backup.settings?.advancedSettings?.aiConfig?.analyticsAI?.keys?.length;

  return {
    totalIncomingHabits: incomingHabits.length,
    newHabitsCount,
    existingHabitsCount,
    newCheckInsCount,
    totalIncomingTasks: incomingTasks.length,
    newTasksCount,
    walletCoinDiff,
    hasIncomingTelegram,
    hasIncomingAiKeys,
  };
}
