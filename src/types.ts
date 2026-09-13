export type Language = 'fa' | 'ar' | 'en';
export type ThemeMode = 'dark' | 'light';
export type BackupInterval = 'daily' | 'every_3_days' | 'weekly' | 'monthly';
export type BotPersona = 'academic' | 'coach' | 'strict' | 'zen';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  autoDailyReport: boolean;
  reportTime: string; // e.g. "21:00"
  lastSentDate?: string; // YYYY-MM-DD
  // Dedicated Backup Telegram Bot & Automated Scheduling
  useDedicatedBackupBot?: boolean; // When true, uses backupBotToken/backupChatId instead of primary botToken/chatId
  backupBotToken?: string;
  backupChatId?: string;
  autoBackupEnabled?: boolean;
  backupInterval?: BackupInterval; // 'daily' | 'every_3_days' | 'weekly' | 'monthly'
  backupTime?: string; // e.g. "23:00"
  backupDayOfWeek?: number; // 0-6 (0=Sunday ... 6=Saturday)
  backupDayOfMonth?: number; // 1-31
  backupFormat?: 'json_standard' | 'json_encrypted' | 'json_sanitized';
  backupEncryptionPassword?: string;
  lastBackupSentDate?: string; // YYYY-MM-DD
  lastBackupTimestamp?: number;
  lastBackupStatus?: 'success' | 'failed';
  lastBackupError?: string;
  totalAutoBackupsSent?: number;
  // Dedicated Novel ZIP Backup & Automated Scheduling
  autoNovelBackupEnabled?: boolean;
  novelBackupInterval?: BackupInterval; // 'daily' | 'every_3_days' | 'weekly' | 'monthly'
  novelBackupTime?: string; // e.g. "23:00"
  novelBackupDayOfWeek?: number; // 0-6 (0=Sunday ... 6=Saturday)
  novelBackupDayOfMonth?: number; // 1-31
  lastNovelBackupSentDate?: string; // YYYY-MM-DD
  lastNovelBackupTimestamp?: number;
  lastNovelBackupStatus?: 'success' | 'failed';
  lastNovelBackupError?: string;
  totalAutoNovelBackupsSent?: number;
  // Daily Pending Habits Reminders
  reminderEnabled?: boolean;
  reminderTimes?: string[]; // e.g. ["10:00", "15:00", "19:00"]
  lastRemindersSent?: Record<string, string>; // { "10:00": "YYYY-MM-DD" }
  // Strict Accountability Final Deadline Warning
  strictWarningEnabled?: boolean;
  strictWarningTime?: string; // e.g. "23:30"
  lastStrictWarningSentDate?: string; // YYYY-MM-DD
  // Visual Chart Infographics
  sendVisualCharts?: boolean;
  // New Enhanced Capabilities
  botPersona?: BotPersona;
  notifyOnTaskCompletion?: boolean;
  notifyOnHabitCheck?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // e.g. "23:30"
  quietHoursEnd?: string; // e.g. "07:30"
  aiModelPreference?: string; // e.g. "gemini-2.5-flash", "gpt-4o", "deepseek-chat"
  telegramAiKeyId?: string; // 'auto' or specific AIKeyConfig.id from analyticsAI keys
  sendTaskReminders?: boolean;
  // Pomodoro & Deep Work Integration in Telegram & AI
  notifyOnPomodoroCompletion?: boolean; // Send Telegram notification when Pomodoro session ends
  enableTelegramPomodoroControl?: boolean; // Enable Pomodoro commands and interactive timers in Telegram bot
  pomodoroDailyReminderEnabled?: boolean; // Remind daily focus & deep work targets via Telegram
}

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  telegram: TelegramConfig;
}

export interface Habit {
  id: string;
  name: string;
  category?: string;
  description?: string;
  color?: string;
  iconName?: string;
  createdAt: string; // YYYY-MM-DD
  history: Record<string, boolean>; // 'YYYY-MM-DD': true
  targetDays?: number; // default 66
  kRate?: number; // default 66
  rewardCoins?: number; // 1 to 10 coins per check-in (default 10)
  rewardXp?: number; // 1 to 5 XP per check-in (default 5)
  totalFocusMinutes?: number; // Total pomodoro/focus minutes logged
  focusSessionsCount?: number; // Number of completed pomodoro sessions
  focusHistory?: Record<string, number>; // 'YYYY-MM-DD': minutes focused
  isOneTime?: boolean; // When true, one-time habit/activity stored for AI learning but excluded from 66-day stats
  completionTimes?: Record<string, string>; // 'YYYY-MM-DD': 'HH:mm' e.g. '14:35'
  completedTimestamps?: Record<string, number>; // 'YYYY-MM-DD': timestamp in ms
  claimedRewardDates?: Record<string, boolean>; // 'YYYY-MM-DD': true - Tracks dates when rewards were claimed to prevent infinite farming
}

export type HabitStage = 'forming' | 'semi' | 'automatic';

export interface HabitStats {
  totalCompletedDays: number;
  effectiveT: number;
  automaticity: number; // 0 to 100
  stage: HabitStage;
  stageLabel: string;
  colorTheme: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    progressBar: string;
    ringColor: string;
    textColor: string;
    accentBg: string;
  };
  currentStreak: number;
  longestStreak: number;
  remainingDays: number;
  isDoneToday: boolean;
  doneDatesCount: number;
  missedDaysCount: number;
  missedDates: string[];
}

export interface AIHabitFeedback {
  name: string;
  status: 'improving' | 'warning' | 'automatic' | 'steady';
  critiqueAndTip: string;
}

export interface AutomaticityMilestone {
  habitName: string;
  currentScore: number;
  projectedTargetDate: string;
  stage: string;
}

export interface CircadianProductivity {
  peakHours: string;
  bestDays: string;
  highRiskTimeframe: string;
}

export interface UserCognitiveProfile {
  lastUpdated: string;
  learnedUserPatterns: string[];
  cognitiveStrengths: string[];
  vulnerabilityTriggers: string[];
  tailoredNeuroHacks: string[];
  automaticityMilestones?: AutomaticityMilestone[];
  circadianProductivity?: CircadianProductivity;
  taskHabitSynergyScore?: number; // 0-100
  procrastinationRiskIndex?: number; // 0-100
  holisticMasteryIndex?: number; // 0-100
  personalAdvice?: string;
}

export interface AIReportData {
  title: string;
  overview: string;
  habitFeedback: AIHabitFeedback[];
  generalCritique: string;
  actionableTips: string[];
  motivationalQuote: string;
  generationEngine?: 'ai' | 'math';
  providerUsed?: string;
  modelUsed?: string;
  userCognitiveProfile?: UserCognitiveProfile;
  tasksFeedback?: {
    totalTasksAnalyzed: number;
    completionRate: number;
    overdueAnalysis: string;
    procrastinationTip: string;
  };
}

export type BackupType = 'user_only' | 'complete' | 'legacy';

export interface BackupMetadata {
  version: string;
  appName: string;
  exportDate: string;
  timestamp: number;
  schemaVersion: number;
  backupType?: BackupType; // 'user_only' (User habits & settings without shop files) vs 'complete' (100% complete with shop novels/media)
  containsShopFiles?: boolean;
}

export interface BackupStatsSummary {
  totalHabits: number;
  totalCheckIns: number;
  totalActiveDays: number;
  earnedXp?: number;
  brainLevel?: number;
  levelTitle?: string;
  unlockedAchievementsCount?: number;
}

export interface WebNovelChapter {
  id: string;
  chapterNumber: number;
  title: string;
  content: string;
  price?: number; // 1 to 5 coins per chapter
  isTranslated?: boolean;
}

export interface WebNovel {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  coverColor?: string;
  coverGradient?: string;
  genre: string;
  synopsis: string;
  price: number; // Total cost in reward coins/points
  pricePerChapter?: number; // 1 to 5 coins per chapter
  isPriceLocked?: boolean; // When true, price is permanently fixed and immutable even if chapters are added
  fileName?: string;
  fileData?: string; // base64 or raw text for direct download
  fileType?: string; // 'txt' | 'pdf' | 'epub' | 'md' | 'json' | 'doc' | 'custom'
  fileSize?: string;
  rawContent?: string;
  chapters?: WebNovelChapter[];
  isDefault?: boolean;
  uploadedAt: string;
  tags?: string[];
  rating?: number;

  // Offline Folder / Direct Disk Scan Flags
  isDirectDiskImport?: boolean;
  needsMetadataSetup?: boolean; // True when detected on disk but user has not entered title/price yet
  editAllowedOnce?: boolean;
  hasBeenEditedOnce?: boolean;
  diskFolderName?: string;
}

export interface RewardTransaction {
  id: string;
  type: 'earn' | 'spend' | 'bonus';
  amount: number;
  description: string;
  timestamp: number;
  novelId?: string;
  movieId?: string;
}

export type MediaType = 'movie' | 'series' | 'anime';

export interface VideoEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  duration?: string; // e.g. "45 min" / "۲۴ دقیقه"
  videoUrl?: string;
  fileData?: string; // Base64 or local file
  fileName?: string;
  fileSize?: string;
  quality?: string; // '4K Ultra HD' | '1080p Full HD' | '720p HD'
  price?: number; // Cost in coins for this individual episode (or 0 for free/included)
  synopsis?: string;
  thumbnailUrl?: string;
  uploadedAt?: string;
}

export interface VideoSeason {
  id: string;
  seasonNumber: number;
  title: string; // e.g. "فصل ۱" / "Season 1"
  description?: string;
  episodes: VideoEpisode[];
}

export interface VideoPlaylist {
  id: string;
  title: string;
  description?: string;
  mediaType: MediaType; // 'movie' | 'series' | 'anime'
  coverUrl?: string;
  coverGradient?: string;
  createdAt: string;
  itemIds?: string[]; // IDs of ShopMovies in this playlist
  tags?: string[];
  isDefault?: boolean;
}

export interface ShopMovie {
  id: string;
  mediaType?: MediaType; // 'movie' | 'series' | 'anime' (default 'movie')
  title: string;
  originalTitle?: string;
  director?: string;
  year?: number;
  duration?: string; // e.g. "۲ ساعت و ۲۸ دقیقه" / "148 min" or "۱۲ قسمت"
  genre?: string; // e.g. "علمی-تخیلی / انگیزشی"
  genres?: string[]; // e.g. ['انگیزشی', 'علمی-تخیلی', 'روانشناسی']
  synopsis: string;
  price: number; // Cost in reward coins to unlock full movie/series
  pricePerEpisode?: number; // Optional coin price per episode if series/anime (e.g. 1 to 5)
  isPriceLocked?: boolean;
  rating?: number; // e.g. 4.9
  imdbRating?: string; // e.g. "8.8"
  coverUrl?: string; // poster image URL or fallback
  coverGradient?: string; // Tailwind gradient classes
  videoUrl?: string; // Trailer / movie preview / full video URL or stream
  trailerUrl?: string; // YouTube/Direct trailer link
  downloadUrl?: string; // Direct file or HD download link
  fileData?: string; // Base64 or local blob
  fileName?: string;
  fileSize?: string;
  quality?: string; // '4K Ultra HD' | '1080p Full HD' | '720p HD'
  motivationalTheme?: string; // e.g. "استقامت و اراده، انضباط روزانه، بازسازی ذهن"
  tags?: string[];
  isDefault?: boolean;
  uploadedAt: string;

  // Playlist & Series Structure
  playlistId?: string; // ID of the playlist this item belongs to
  playlistTitle?: string;
  hasSeasons?: boolean; // If true, organized in seasons and episodes
  seasons?: VideoSeason[]; // Structured seasons containing episodes
  standaloneEpisodes?: VideoEpisode[]; // Direct episodes without seasons

  // Offline Folder / Direct Disk Scan Flags
  isDirectDiskImport?: boolean; // Uploaded/scanned directly from local disk folders without website form
  needsMetadataSetup?: boolean; // True when detected on disk but user has not entered title/price yet
  editAllowedOnce?: boolean; // Only true when freshly imported via direct folder/ZIP, allowed to be edited exactly once to set price and details
  hasBeenEditedOnce?: boolean; // Set to true after the user saves their one-time edit
  diskFolderName?: string;
}

export interface UserRewardWallet {
  coins: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  unlockedNovelIds: string[];
  unlockedChapterIds?: string[]; // "novelId:chapterId"
  unlockedMovieIds?: string[]; // List of unlocked movie/series IDs (full unlock)
  unlockedEpisodeIds?: string[]; // "movieId:episodeId" for individual episode unlocks
  unlockedPlaylistIds?: string[];
  readingProgress?: Record<string, {
    lastChapter?: number;
    lastChapterNumber?: number;
    scrollPercentage?: number;
    lastReadDate?: string;
    readChapterIds?: string[];
    readChapterIndexes?: number[];
  }>;
  movieWatchProgress?: Record<string, {
    seasonIndex?: number;
    episodeId?: string;
    episodeNumber?: number;
    lastTime?: number;
    completed?: boolean;
    lastWatchedDate?: string;
  }>;
  transactions: RewardTransaction[];
}

export type RewardWallet = UserRewardWallet;
export type UserWallet = UserRewardWallet;

export type AIServiceProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek' 
  | 'groq' 
  | 'openrouter' 
  | 'mistral' 
  | 'together' 
  | 'xai' 
  | 'custom';

export interface AIKeyConfig {
  id: string;
  key: string;
  provider: AIServiceProvider | 'unknown';
  name?: string;
  selectedModel?: string; // Empty or undefined means "Auto-select latest model"
  availableModels?: string[];
  lastChecked?: number;
  isValid?: boolean;
  errorMessage?: string;
  createdAt: number;
}

export interface AISettingsSection {
  keys: AIKeyConfig[];
  autoFallback: boolean; // default true
  preferredProvider?: AIServiceProvider;
}

export interface AIConfigurationSettings {
  analyticsAI: AISettingsSection;   // Section 1: For Reports, Analytics, Habits & Telegram AI
  translationAI: AISettingsSection; // Section 2: For Web Novels, HTML extraction & Chapter Translation
}

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskRecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';

export interface TaskRecurrence {
  type: TaskRecurrenceType;
  interval?: number; // e.g. every 1, 2, 3...
  unit?: 'days' | 'weeks' | 'months'; // for custom
  daysOfWeek?: number[]; // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday (Shamsi: 6 is Shanbeh, 0 is Yekshanbeh...)
  endType?: 'never' | 'after_count' | 'on_date';
  endCount?: number;
  endDate?: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  completed: boolean;
  completedAt?: number; // timestamp
  completedTime?: string; // 'HH:mm' e.g. '15:20'
  completedTimestamps?: number[]; // history of all completion timestamps
  completionTimes?: string[]; // history of time strings e.g. ['14:30', '18:15']
  completedHistory?: Array<{ date: string; time: string; timestamp: number }>; // For recurring tasks cycles
  createdAt: string; // YYYY-MM-DD
  rewardCoins?: number; // default 5
  rewardXp?: number; // default 2
  subtasks?: TaskSubtask[];
  color?: string;
  isRecurring?: boolean;
  isOneTime?: boolean;
  recurrence?: TaskRecurrence;
  recurringStreak?: number; // completed cycles count
  lastCompletedDate?: string;
  totalFocusMinutes?: number; // Total focus minutes logged
  focusSessionsCount?: number; // Total completed pomodoro sessions
  estimatedMinutes?: number; // Optional user estimated time
  tags?: string[];
  rewardClaimed?: boolean; // When true, one-time reward has been claimed (prevents uncheck/re-check coin farming)
  claimedRewardDates?: string[]; // History of date strings 'YYYY-MM-DD' when rewards were claimed (for recurring tasks)
}

export type ActivityLogType =
  | 'habit'
  | 'recurring_task'
  | 'task'
  | 'one_time_habit'
  | 'pomodoro'
  | 'habit_focus'
  | 'task_focus'
  | 'general_focus'
  | 'habit_checkin'
  | 'task_completion';

export interface UserActivityLog {
  id: string;
  type: ActivityLogType;
  targetId?: string;
  targetTitle?: string;
  title?: string;
  category?: string;
  date?: string; // YYYY-MM-DD
  persianDate?: string;
  time?: string; // HH:mm
  timestamp: number;
  durationMinutes?: number;
  durationSeconds?: number;
  isRecurring?: boolean;
  isCompletedFull?: boolean;
  notes?: string;
  details?: Record<string, any>;
}

export type PomodoroMode = 'focus' | 'short_break' | 'long_break' | 'stopwatch';
export type PomodoroTargetType = 'none' | 'habit' | 'task';
export type PomodoroAmbientSound = string; // 'none', built-in sound ID, or custom sound ID

export interface PomodoroCustomSound {
  id: string;
  name: string;
  fileName: string;
  fileSize?: string;
  fileData: string; // Base64 Data URL or audio file URL
  audioFormat?: string;
  duration?: number; // In seconds
  createdAt: number;
}

export interface PomodoroSessionRecord {
  id: string;
  targetType: PomodoroTargetType;
  targetId?: string;
  targetName?: string;
  targetTitle?: string;
  targetColor?: string;
  targetCategory?: string;
  durationMinutes: number;
  durationSeconds?: number;
  plannedMinutes?: number;
  isCompletedFull?: boolean;
  completedAt: string; // YYYY-MM-DD
  time?: string; // HH:mm
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  startTimestamp?: number;
  timestamp: number;
  mode: PomodoroMode;
  rewardCoinsEarned?: number;
  rewardXpEarned?: number;
  notes?: string;
}

export interface AdvancedSettings {
  defaultTargetDays?: number; // default 66
  enableSoundEffects?: boolean; // default true
  enableHapticFeedback?: boolean; // default true
  enableCelebrationConfetti?: boolean; // default true
  strictStreakMode?: boolean; // default true
  showScientificFormula?: boolean; // default false
  autoOptimizeStorage?: boolean; // default true
  aiConfig?: AIConfigurationSettings;
  storeStoragePath?: string; // Custom directory path on device for store files (novels, playlists, videos)
  // Pomodoro Settings
  pomodoroFocusDuration?: number; // default 25
  pomodoroShortBreakDuration?: number; // default 5
  pomodoroLongBreakDuration?: number; // default 15
  pomodoroLongBreakInterval?: number; // default 4
  pomodoroAutoStartBreaks?: boolean; // default false
  pomodoroAutoStartFocus?: boolean; // default false
  pomodoroAmbientSound?: PomodoroAmbientSound; // default 'none'
  pomodoroRewardCoins?: number; // default 5 (reward coins for completing 25min focus)
  pomodoroRewardXp?: number; // default 20 (reward XP for completing 25min focus)
  stopwatchRewardCoinsPerMinute?: number; // default 1 (reward coins per minute of stopwatch, rounded to integer)
  stopwatchRewardXpPerMinute?: number; // default 2 (reward XP per minute of stopwatch, rounded to integer)
  customPomodoroSounds?: PomodoroCustomSound[];
  pomodoroConfig?: {
    focusMinutes?: number;
    shortBreakMinutes?: number;
    longBreakMinutes?: number;
    longBreakInterval?: number;
    autoStartBreaks?: boolean;
    autoStartPomodoros?: boolean;
    soundEffects?: boolean;
    tickingSound?: boolean;
    rewardCoins?: number;
    rewardXp?: number;
    stopwatchCoinsPerMinute?: number;
    stopwatchXpPerMinute?: number;
  };
}

export interface FullBackupSettings {
  language: Language;
  theme: ThemeMode;
  telegramConfig: TelegramConfig;
  advancedSettings?: AdvancedSettings;
  rewardWallet?: UserRewardWallet;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  tasks?: Task[];
  pomodoroSessions?: PomodoroSessionRecord[];
  activityLogs?: UserActivityLog[];
}

export interface SelectiveBackupOptions {
  includeHabits: boolean;
  selectedHabitIds?: string[];
  includeTasks: boolean;
  selectedTaskIds?: string[];
  includePomodoro: boolean;
  includeWallet: boolean;
  includeTelegram: boolean;
  includeTelegramConfig?: boolean;
  includePreferences: boolean;
  includeAiKeys: boolean;
  includeMedia: boolean;
  includeActivityLogs: boolean;
  dateRange?: 'all' | '30days' | '90days' | '365days';
  sanitizeSecrets?: boolean;
  isEncrypted?: boolean;
  encryptionHint?: string;
}

export interface SelectiveRestoreOptions {
  restoreHabits: boolean;
  selectedHabitIds?: string[];
  restoreTasks: boolean;
  selectedTaskIds?: string[];
  restorePomodoro: boolean;
  restoreWallet: boolean;
  restoreTelegram: boolean;
  restoreTelegramConfig?: boolean;
  restorePreferences: boolean;
  restoreAiKeys: boolean;
  restoreMedia: boolean;
  restoreActivityLogs: boolean;
  mode: 'merge' | 'replace';
}

export interface BackupSnapshotRecord {
  id: string;
  name: string;
  label?: string;
  tag?: 'manual' | 'auto' | 'milestone' | 'pre_update';
  timestamp: number;
  dateStr: string;
  timeStr: string;
  createdAt?: string;
  habitsCount: number;
  tasksCount: number;
  habitCount?: number;
  taskCount?: number;
  checkInsCount: number;
  checkInCount?: number;
  walletCoins: number;
  sizeBytes: number;
  formattedSize: string;
  size?: string;
  payload: FullBackupData;
  data?: any;
}

export interface FullBackupData {
  version: string;
  appName: string;
  exportDate: string;
  backupType?: BackupType;
  metadata: BackupMetadata;
  habits: Habit[];
  tasks?: Task[];
  pomodoroSessions?: PomodoroSessionRecord[];
  activityLogs?: UserActivityLog[];
  settings: FullBackupSettings;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  storeProducts?: any[];
  rewardWallet?: UserRewardWallet;
  wallet?: UserRewardWallet;
  advancedSettings?: AdvancedSettings;
  stats?: BackupStatsSummary;
  selectedOptions?: SelectiveBackupOptions;
}


