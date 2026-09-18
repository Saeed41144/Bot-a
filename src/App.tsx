import React, { useState, useEffect, useRef } from 'react';
import { Habit, Task, Language, ThemeMode, TelegramConfig, FullBackupSettings, UserRewardWallet, WebNovel, WebNovelChapter, ShopMovie, VideoPlaylist, VideoEpisode, RewardTransaction, AdvancedSettings, PomodoroAmbientSound } from './types';
import { resolveAppearance } from './utils/themeAppearance';
import { getInitialHabits } from './data/defaultHabits';
import { getInitialTasks } from './data/defaultTasks';
import { HabitCard } from './components/HabitCard';
import { AddHabitModal } from './components/AddHabitModal';
import { AddTaskModal } from './components/AddTaskModal';
import { TasksListView } from './components/TasksListView';
import { HabitsListView } from './components/HabitsListView';
import type { AppearancePreset } from './utils/themeAppearance';
import { DailyFocusView } from './components/DailyFocusView';
import { ScientificModelModal } from './components/ScientificModelModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DeleteTaskConfirmModal } from './components/DeleteTaskConfirmModal';
import { SettingsModal } from './components/SettingsModal';
import { AIReportModal } from './components/AIReportModal';
import { StatsModal } from './components/StatsModal';
import { AchievementsModal } from './components/AchievementsModal';
import { BrainLevelsModal } from './components/BrainLevelsModal';
import { ShopModal } from './components/ShopModal';
import { NovelReaderModal } from './components/NovelReaderModal';
import { UploadNovelModal } from './components/UploadNovelModal';
import { MoviePlayerModal } from './components/MoviePlayerModal';
import { UploadMovieModal } from './components/UploadMovieModal';
import { DailySummaryBanner } from './components/DailySummaryBanner';
import { PomodoroModal } from './components/PomodoroModal';
import { FloatingPomodoroWidget } from './components/FloatingPomodoroWidget';
import { getTodayString, getNextRecurringDate } from './utils/persianDate';
import { calculateHabitStats } from './utils/habitMath';
import { calculateAchievements } from './utils/achievements';
import { translations, formatNumber } from './utils/translations';
import { createSelectiveBackupPayload, createFullBackupPayload, createCompleteBackupPayload, downloadBackupFile, encryptBackupPayload } from './utils/backupHelper';
import { 
  getInitialRewardWallet, 
  saveRewardWallet, 
  sanitizeWallet,
  getCustomWebNovels, 
  saveCustomWebNovels, 
  getDefaultWebNovels, 
  getChapterPrice,
  getNovelTotalCalculatedPrice,
  getDeletedNovelIds,
  saveDeletedNovelIds,
  COINS_PER_CHECKIN 
} from './utils/rewardWallet';
import { 
  getCustomMovies, 
  saveCustomMovies, 
  getCustomPlaylists, 
  saveCustomPlaylists, 
  getAllPlaylists,
  getDeletedMovieIds,
  saveDeletedMovieIds,
  getDeletedPlaylistIds,
  saveDeletedPlaylistIds
} from './utils/movieData';
import { safeStorage } from './utils/safeStorage';
import { safeMatchMediaDark } from './utils/safeDom';
import { backgroundNovelTranslator } from './utils/backgroundNovelTranslator';
import { BackgroundTranslationProgressBanner } from './components/BackgroundTranslationProgressBanner';
import { 
  playCheckinSound, 
  playCelebrationSound, 
  triggerHapticFeedback, 
  triggerCelebrationConfetti,
  playPomodoroBellSound,
  playBreakCompleteSound,
  playTickSound,
  startAmbientSound,
  stopAmbientSound
} from './utils/feedbackEffects';
import { savePomodoroSession, getPomodoroSessions } from './utils/pomodoroStorage';
import { saveUserActivityLog } from './utils/activityLearningStorage';
import { archiveHabitOnDelete, archiveTaskOnDelete } from './utils/archivedEntitiesStorage';
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Download, 
  ListTodo,
  Brain, 
  Sliders,
  Sparkles,
  CheckCircle2,
  Trophy,
  Zap,
  ChevronRight,
  Award,
  ShoppingBag,
  Coins,
  BookOpen
} from 'lucide-react';

const STORAGE_KEY = 'lally_habits_data_v1';
const TASKS_KEY = 'lally_tasks_data_v1';
const THEME_KEY = 'lally_theme_mode';
const LANG_KEY = 'lally_language_v1';
const TELEGRAM_KEY = 'lally_telegram_v1';
const ADVANCED_KEY = 'lally_advanced_settings_v1';
const DELETED_HABIT_IDS_KEY = 'lally_deleted_habit_ids_v1';
const DELETED_TASK_IDS_KEY = 'lally_deleted_task_ids_v1';

function getDeletedHabitIds(): string[] {
  try {
    const raw = safeStorage.getItem(DELETED_HABIT_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.warn("Failed to load deletedHabitIds from localStorage:", e); }
  return [];
}

function getDeletedTaskIds(): string[] {
  try {
    const raw = safeStorage.getItem(DELETED_TASK_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.warn("Failed to load deletedTaskIds from localStorage:", e); }
  return [];
}

export default function App() {
  // Habits state
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return getInitialHabits();
  });

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = safeStorage.getItem(TASKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return getInitialTasks();
  });

  // View state: 'daily_focus' (combined), 'habits' (classic habit tracker), 'tasks' (action to-do list)
  const [activeView, setActiveView] = useState<'daily_focus' | 'habits' | 'tasks'>('daily_focus');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Language state
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const savedLang = safeStorage.getItem(LANG_KEY) as Language;
      if (savedLang === 'fa' || savedLang === 'ar' || savedLang === 'en') {
        return savedLang;
      }
    } catch {
      // Ignore
    }
    return 'fa';
  });

  // Theme mode state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const savedTheme = safeStorage.getItem(THEME_KEY) as ThemeMode;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      return safeMatchMediaDark() ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Telegram configuration state
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    try {
      const savedTg = safeStorage.getItem(TELEGRAM_KEY);
      if (savedTg) {
        return JSON.parse(savedTg);
      }
    } catch {
      // Ignore
    }
    return {
      botToken: '',
      chatId: '',
      autoDailyReport: true,
      reportTime: '21:00',
    };
  });

  // Advanced System & Behavior Settings state
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(() => {
    try {
      const savedAdv = safeStorage.getItem(ADVANCED_KEY);
      if (savedAdv) {
        return JSON.parse(savedAdv);
      }
    } catch {
      // Ignore
    }
    return {
      defaultTargetDays: 66,
      enableSoundEffects: true,
      enableHapticFeedback: true,
      enableCelebrationConfetti: true,
      strictStreakMode: true,
      showScientificFormula: false,
      autoOptimizeStorage: true,
    };
  });

  const handleUpdateAdvancedSettings = (newSettings: AdvancedSettings) => {
    setAdvancedSettings(newSettings);
    try {
      safeStorage.setItem(ADVANCED_KEY, JSON.stringify(newSettings));
    } catch (e) { console.warn("Failed to save advancedSettings to localStorage:", e); }
  };

  // Reward Store, Web Novels & Movie Cinema state
  const [wallet, setWallet] = useState<UserRewardWallet>(() => getInitialRewardWallet());
  const [customNovels, setCustomNovels] = useState<WebNovel[]>(() => getCustomWebNovels());
  const [customMovies, setCustomMovies] = useState<ShopMovie[]>(() => getCustomMovies());
  const [customPlaylists, setCustomPlaylists] = useState<VideoPlaylist[]>(() => getCustomPlaylists());
  const [deletedMovieIds, setDeletedMovieIds] = useState<string[]>(() => getDeletedMovieIds());
  const [deletedPlaylistIds, setDeletedPlaylistIds] = useState<string[]>(() => getDeletedPlaylistIds());
  const [deletedNovelIds, setDeletedNovelIds] = useState<string[]>(() => getDeletedNovelIds());
  const [deletedHabitIds, setDeletedHabitIds] = useState<string[]>(() => getDeletedHabitIds());
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>(() => getDeletedTaskIds());
  const lastIngestedServerTimestamp = useRef<number>(0);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isUploadNovelModalOpen, setIsUploadNovelModalOpen] = useState(false);
  const [uploadTargetNovel, setUploadTargetNovel] = useState<WebNovel | null>(null);
  const [activeReadingNovel, setActiveReadingNovel] = useState<WebNovel | null>(null);
  
  const [isUploadMovieModalOpen, setIsUploadMovieModalOpen] = useState(false);
  const [uploadTargetMovie, setUploadTargetMovie] = useState<ShopMovie | null>(null);
  const [activePlayingMovie, setActivePlayingMovie] = useState<ShopMovie | null>(null);

  const [coinToast, setCoinToast] = useState<{
    id: number;
    amount: number;
    habitName: string;
  } | null>(null);
  const [resetToast, setResetToast] = useState(false);
  const [backupSuccessToast, setBackupSuccessToast] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScienceModalOpen, setIsScienceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'telegram' | 'backup' | 'advanced'>('general');
  const [isAIReportModalOpen, setIsAIReportModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
  const [isBrainLevelsModalOpen, setIsBrainLevelsModalOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Pomodoro Focus Timer State
  const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
  const [isPomodoroFloatingVisible, setIsPomodoroFloatingVisible] = useState(false);
  const [pomodoroTargetType, setPomodoroTargetType] = useState<'none' | 'habit' | 'task'>('none');
  const [pomodoroTargetId, setPomodoroTargetId] = useState<string | null>(null);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'shortBreak' | 'longBreak' | 'stopwatch'>('focus');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(25 * 60);
  const [pomodoroTotalDuration, setPomodoroTotalDuration] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroCompletedSessions, setPomodoroCompletedSessions] = useState(0);
  const [pomodoroAmbientSound, setPomodoroAmbientSound] = useState<PomodoroAmbientSound>(advancedSettings.pomodoroAmbientSound || 'none');
  const [pomodoroSoundVolume, setPomodoroSoundVolume] = useState(0.35);

  // Form & filters
  const [quickHabitName, setQuickHabitName] = useState('');
  const [quickError, setQuickError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const isAutoDispatching = useRef(false);
  const isAutoBackupDispatching = useRef(false);
  const isAutoReminderDispatching = useRef(false);
  const isAutoStrictWarningDispatching = useRef(false);
  const t = translations[language];
  const todayStr = getTodayString();

  // Save wallet to localStorage
  useEffect(() => {
    saveRewardWallet(wallet);
  }, [wallet]);

  // Save custom novels to localStorage
  useEffect(() => {
    saveCustomWebNovels(customNovels);
  }, [customNovels]);

  // Synchronize background novel translations with customNovels state
  useEffect(() => {
    const handleCustomNovelsUpdated = (event: any) => {
      if (event?.detail?.novels && Array.isArray(event.detail.novels)) {
        setCustomNovels(event.detail.novels);
      }
    };

    const handleTranslationCompleted = (event: any) => {
      if (event?.detail?.novelTitle) {
        if (advancedSettings.enableCelebrationConfetti !== false) {
          triggerCelebrationConfetti();
        }
        if (advancedSettings.enableSoundEffects !== false) {
          playCelebrationSound();
        }
      }
    };

    window.addEventListener('customNovelsUpdated', handleCustomNovelsUpdated);
    window.addEventListener('novelTranslationCompleted', handleTranslationCompleted);

    return () => {
      window.removeEventListener('customNovelsUpdated', handleCustomNovelsUpdated);
      window.removeEventListener('novelTranslationCompleted', handleTranslationCompleted);
    };
  }, [advancedSettings]);

  // Save custom movies to localStorage
  useEffect(() => {
    saveCustomMovies(customMovies);
  }, [customMovies]);

  // Save custom playlists to localStorage
  useEffect(() => {
    saveCustomPlaylists(customPlaylists);
  }, [customPlaylists]);

  // Save deleted movie IDs to localStorage
  useEffect(() => {
    saveDeletedMovieIds(deletedMovieIds);
  }, [deletedMovieIds]);

  // Save deleted playlist IDs to localStorage
  useEffect(() => {
    saveDeletedPlaylistIds(deletedPlaylistIds);
  }, [deletedPlaylistIds]);

  // Save deleted novel IDs to localStorage
  useEffect(() => {
    saveDeletedNovelIds(deletedNovelIds);
  }, [deletedNovelIds]);

  // Save deleted habit IDs to localStorage
  useEffect(() => {
    try {
      safeStorage.setItem(DELETED_HABIT_IDS_KEY, JSON.stringify(deletedHabitIds));
    } catch (e) { console.warn("Failed to save deletedHabitIds to localStorage:", e); }
  }, [deletedHabitIds]);

  // Save deleted task IDs to localStorage
  useEffect(() => {
    try {
      safeStorage.setItem(DELETED_TASK_IDS_KEY, JSON.stringify(deletedTaskIds));
    } catch (e) { console.warn("Failed to save deletedTaskIds to localStorage:", e); }
  }, [deletedTaskIds]);

  // Apply dark mode & language direction to document
  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      safeStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('dir', t.dir);
      document.documentElement.setAttribute('lang', language);
      safeStorage.setItem(LANG_KEY, language);
    } catch {
      // Ignore
    }
  }, [language, t.dir]);

  // Save habits to safeStorage
  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {
      // Ignore
    }
  }, [habits]);

  // Save tasks to safeStorage
  useEffect(() => {
    try {
      safeStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch {
      // Ignore
    }
  }, [tasks]);

  // Save telegram configuration
  useEffect(() => {
    try {
      safeStorage.setItem(TELEGRAM_KEY, JSON.stringify(telegramConfig));
    } catch {
      // Ignore
    }
  }, [telegramConfig]);

  // Save wallet to safeStorage
  useEffect(() => {
    try {
      saveRewardWallet(wallet);
    } catch {
      // Ignore
    }
  }, [wallet]);

  const hasHydratedFromServer = useRef<boolean>(false);
  const lastLocalEditTime = useRef<number>(0);
  const lastTelegramLocalEditTime = useRef<number>(0);
  const isIncomingServerUpdate = useRef<boolean>(false);

  // Mark local habit changes and persist
  const updateHabitsWithTimestamp = (updater: (prev: Habit[]) => Habit[]) => {
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();
    setHabits((prev) => {
      const nextHabits = updater(prev);
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(nextHabits));
      } catch (e) { console.warn("Failed to save habits to localStorage:", e); }
      return nextHabits;
    });
  };

  // Mark local task changes and persist
  const updateTasksWithTimestamp = (updater: (prev: Task[]) => Task[]) => {
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();
    setTasks((prev) => {
      const nextTasks = updater(prev);
      try {
        safeStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
      } catch (e) { console.warn("Failed to save tasks to localStorage:", e); }
      return nextTasks;
    });
  };

  // Mark local wallet changes and persist
  const updateWalletWithTimestamp = (updater: (prev: UserRewardWallet) => UserRewardWallet) => {
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();
    setWallet((prev) => {
      const nextWallet = updater(prev);
      try {
        saveRewardWallet(nextWallet);
      } catch (e) { console.warn("Failed to save wallet to localStorage:", e); }
      return nextWallet;
    });
  };

  // Mark local telegram configuration changes and persist immediately
  const updateTelegramConfigWithTimestamp = (updater: TelegramConfig | ((prev: TelegramConfig) => TelegramConfig)) => {
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();
    lastTelegramLocalEditTime.current = Date.now();
    setTelegramConfig((prev) => {
      const nextConfig = typeof updater === 'function' ? updater(prev) : updater;
      const cleanBotToken = (nextConfig.botToken || prev.botToken || '').trim();
      const cleanChatId = (nextConfig.chatId || prev.chatId || '').trim();
      const cleanBackupBotToken = (nextConfig.backupBotToken || prev.backupBotToken || '').trim();
      const cleanBackupChatId = (nextConfig.backupChatId || prev.backupChatId || '').trim();

      const finalConfig: TelegramConfig = {
        ...prev,
        ...nextConfig,
        botToken: cleanBotToken,
        chatId: cleanChatId,
        backupBotToken: cleanBackupBotToken,
        backupChatId: cleanBackupChatId,
      };

      try {
        safeStorage.setItem(TELEGRAM_KEY, JSON.stringify(finalConfig));
      } catch (e) { console.warn("Failed to save telegramConfig to localStorage:", e); }

      // Explicit direct sync to server immediately to guarantee disk persistence
      fetch('/api/telegram/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramConfig: finalConfig }),
      }).catch((err) => {
        console.warn('Direct telegram save warning:', err);
      });

      return finalConfig;
    });
  };

  // Sync state with server persistent storage (Habits, Tasks, Wallet, Novels, AI Config, Telegram, Movies, Playlists)
  useEffect(() => {
    // CRITICAL: Block syncing if app hasn't hydrated or if change was triggered by incoming server poll
    if (!hasHydratedFromServer.current || isIncomingServerUpdate.current) return;

    const syncTimeout = setTimeout(() => {
      fetch('/api/storage/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientHydrated: true,
          habits,
          tasks,
          deletedHabitIds,
          deletedTaskIds,
          telegramConfig,
          language,
          theme,
          wallet,
          customNovels,
          customMovies,
          customPlaylists,
          deletedMovieIds,
          deletedPlaylistIds,
          deletedNovelIds,
          advancedSettings,
          aiConfig: advancedSettings.aiConfig,
        }),
      }).catch((err) => {
        console.warn('Failed to sync state with server database:', err);
      });
    }, 250);

    return () => clearTimeout(syncTimeout);
  }, [habits, tasks, deletedHabitIds, deletedTaskIds, telegramConfig, language, theme, wallet, customNovels, customMovies, customPlaylists, deletedMovieIds, deletedPlaylistIds, deletedNovelIds, advancedSettings]);

  // Pull state from persistent server storage (hydrates on launch and syncs bot additions/actions)
  const pullServerState = async (isInitialMount = false) => {
    try {
      const res = await fetch('/api/storage/full-state');
      if (!res.ok) {
        if (isInitialMount) {
          setTimeout(() => pullServerState(true), 1200);
        }
        return;
      }
      const data = await res.json();
      const db = data.database;
      if (!db) return;

      const serverHabits: Habit[] = Array.isArray(db.habits) ? db.habits : [];
      const serverTasks: Task[] = Array.isArray(db.tasks) ? db.tasks : [];
      const serverTimestamp = Number(db.lastUpdated) || 0;

      // Hydrate & merge deleted IDs from server
      let currentDeletedHabitIds = deletedHabitIds;
      if (Array.isArray(db.deletedHabitIds) && db.deletedHabitIds.length > 0) {
        setDeletedHabitIds((prev) => {
          const merged = Array.from(new Set([...prev, ...db.deletedHabitIds]));
          currentDeletedHabitIds = merged;
          return merged;
        });
      }
      let currentDeletedTaskIds = deletedTaskIds;
      if (Array.isArray(db.deletedTaskIds) && db.deletedTaskIds.length > 0) {
        setDeletedTaskIds((prev) => {
          const merged = Array.from(new Set([...prev, ...db.deletedTaskIds]));
          currentDeletedTaskIds = merged;
          return merged;
        });
      }
      if (Array.isArray(db.deletedMovieIds) && db.deletedMovieIds.length > 0) {
        setDeletedMovieIds((prev) => Array.from(new Set([...prev, ...db.deletedMovieIds])));
      }
      if (Array.isArray(db.deletedPlaylistIds) && db.deletedPlaylistIds.length > 0) {
        setDeletedPlaylistIds((prev) => Array.from(new Set([...prev, ...db.deletedPlaylistIds])));
      }
      if (Array.isArray(db.deletedNovelIds) && db.deletedNovelIds.length > 0) {
        setDeletedNovelIds((prev) => {
          const merged = Array.from(new Set([...prev, ...db.deletedNovelIds]));
          saveDeletedNovelIds(merged);
          return merged;
        });
      }

      const delHabitSet = new Set([...currentDeletedHabitIds, ...(db.deletedHabitIds || [])]);
      const delTaskSet = new Set([...currentDeletedTaskIds, ...(db.deletedTaskIds || [])]);

      // Initial hydration on app launch / refresh
      if (isInitialMount) {
        isIncomingServerUpdate.current = true;

        // 1. Hydrate and merge habits: union local and server habits
        setHabits((prevLocalHabits) => {
          const habitMap = new Map<string, Habit>();
          (Array.isArray(prevLocalHabits) ? prevLocalHabits : []).forEach((h) => {
            if (h && h.id && !delHabitSet.has(h.id)) habitMap.set(h.id, h);
          });
          serverHabits.forEach((sh) => {
            if (!sh || !sh.id || delHabitSet.has(sh.id)) return;
            const exist = habitMap.get(sh.id);
            if (!exist) {
              habitMap.set(sh.id, sh);
            } else {
              habitMap.set(sh.id, {
                ...exist,
                ...sh,
                history: { ...(exist.history || {}), ...(sh.history || {}) },
                claimedRewardDates: { ...(exist.claimedRewardDates || {}), ...(sh.claimedRewardDates || {}) },
                completedTimestamps: { ...(exist.completedTimestamps || {}), ...(sh.completedTimestamps || {}) },
                completionTimes: { ...(exist.completionTimes || {}), ...(sh.completionTimes || {}) },
                focusHistory: { ...(exist.focusHistory || {}), ...(sh.focusHistory || {}) },
                totalFocusMinutes: Math.max(exist.totalFocusMinutes || 0, sh.totalFocusMinutes || 0),
                focusSessionsCount: Math.max(exist.focusSessionsCount || 0, sh.focusSessionsCount || 0),
              });
            }
          });
          const merged = Array.from(habitMap.values());
          try {
            safeStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) { console.warn("Failed to save merged habits to localStorage:", e); }
          return merged;
        });

        // 2. Hydrate and merge tasks: union local and server tasks
        setTasks((prevLocalTasks) => {
          const taskMap = new Map<string, Task>();
          (Array.isArray(prevLocalTasks) ? prevLocalTasks : []).forEach((t) => {
            if (t && t.id && !delTaskSet.has(t.id)) taskMap.set(t.id, t);
          });
          serverTasks.forEach((st) => {
            if (!st || !st.id || delTaskSet.has(st.id)) return;
            const exist = taskMap.get(st.id);
            if (!exist) {
              taskMap.set(st.id, st);
            } else {
              const mergedSubtasksMap = new Map<string, any>();
              (exist.subtasks || []).forEach((s: any) => s?.id && mergedSubtasksMap.set(s.id, s));
              (st.subtasks || []).forEach((s: any) => {
                if (s?.id) {
                  const existSt = mergedSubtasksMap.get(s.id);
                  mergedSubtasksMap.set(s.id, existSt ? { ...existSt, ...s, completed: s.completed || existSt.completed } : s);
                }
              });
              taskMap.set(st.id, {
                ...exist,
                ...st,
                completed: Boolean(st.completed || exist.completed),
                subtasks: Array.from(mergedSubtasksMap.values()),
              });
            }
          });
          const merged = Array.from(taskMap.values());
          try {
            safeStorage.setItem(TASKS_KEY, JSON.stringify(merged));
          } catch (e) { console.warn("Failed to save merged tasks to localStorage:", e); }
          return merged;
        });

        // 3. Hydrate wallet
        if (db.wallet && typeof db.wallet === 'object') {
          const sanitizedWallet = sanitizeWallet(db.wallet);
          if (
            sanitizedWallet.coins > 0 ||
            sanitizedWallet.transactions.length > 0 ||
            sanitizedWallet.unlockedNovelIds.length > 0 ||
            sanitizedWallet.unlockedMovieIds.length > 0
          ) {
            setWallet(sanitizedWallet);
            saveRewardWallet(sanitizedWallet);
          }
        }

        // 4. Hydrate custom novels
        if (Array.isArray(db.customNovels) && db.customNovels.length > 0) {
          setCustomNovels(db.customNovels);
          saveCustomWebNovels(db.customNovels);
        }

        // 5. Hydrate custom movies
        if (Array.isArray(db.customMovies) && db.customMovies.length > 0) {
          setCustomMovies(db.customMovies);
          saveCustomMovies(db.customMovies);
        }

        // 6. Hydrate custom playlists
        if (Array.isArray(db.customPlaylists) && db.customPlaylists.length > 0) {
          setCustomPlaylists(db.customPlaylists);
          saveCustomPlaylists(db.customPlaylists);
        }

        // 7. Hydrate advanced settings
        if (db.advancedSettings && typeof db.advancedSettings === 'object') {
          setAdvancedSettings((prev) => ({
            ...prev,
            ...db.advancedSettings,
          }));
        }

        // 8. Hydrate Telegram config (preserving local non-empty token/chatId if server has empty)
        if (db.telegramConfig && typeof db.telegramConfig === 'object') {
          setTelegramConfig((prev) => {
            const incomingBotToken = (db.telegramConfig.botToken || '').trim();
            const incomingChatId = (db.telegramConfig.chatId || '').trim();
            const incomingBackupBotToken = (db.telegramConfig.backupBotToken || '').trim();
            const incomingBackupChatId = (db.telegramConfig.backupChatId || '').trim();

            const mergedConfig = {
              ...prev,
              ...db.telegramConfig,
              botToken: incomingBotToken || prev.botToken || '',
              chatId: incomingChatId || prev.chatId || '',
              backupBotToken: incomingBackupBotToken || prev.backupBotToken || '',
              backupChatId: incomingBackupChatId || prev.backupChatId || '',
            };
            try {
              safeStorage.setItem(TELEGRAM_KEY, JSON.stringify(mergedConfig));
            } catch (e) { console.warn("Failed to save merged telegramConfig to localStorage:", e); }
            return mergedConfig;
          });
        }

        hasHydratedFromServer.current = true;
        lastIngestedServerTimestamp.current = serverTimestamp;

        setTimeout(() => {
          isIncomingServerUpdate.current = false;
        }, 400);
        return;
      }

      // Routine poll updates (e.g. actions done via Telegram bot or other tabs)
      const isRecentlyEditedLocally = Date.now() - lastLocalEditTime.current < 450;
      if (!isRecentlyEditedLocally) {
        let didUpdateSomething = false;

        // Reconcile habits (detect bot-created habits or bot check-ins)
        setHabits((prevHabits) => {
          let hasChange = false;
          const habitMap = new Map<string, Habit>();
          const currentHabits = Array.isArray(prevHabits) ? prevHabits : [];

          currentHabits.forEach((h) => {
            if (h && h.id && !delHabitSet.has(h.id)) {
              habitMap.set(h.id, h);
            } else if (h && delHabitSet.has(h.id)) {
              hasChange = true;
            }
          });

          serverHabits.forEach((sh) => {
            if (!sh || !sh.id || delHabitSet.has(sh.id)) return;
            const exist = habitMap.get(sh.id);
            if (!exist) {
              habitMap.set(sh.id, sh);
              hasChange = true;
            } else {
              const existHistJson = JSON.stringify(exist.history || {});
              const shHistJson = JSON.stringify(sh.history || {});
              const isDifferent =
                existHistJson !== shHistJson ||
                exist.name !== sh.name ||
                exist.targetDays !== sh.targetDays;

              if (isDifferent) {
                hasChange = true;
                habitMap.set(sh.id, {
                  ...exist,
                  ...sh,
                  history: { ...(exist.history || {}), ...(sh.history || {}) },
                  claimedRewardDates: { ...(exist.claimedRewardDates || {}), ...(sh.claimedRewardDates || {}) },
                  completedTimestamps: { ...(exist.completedTimestamps || {}), ...(sh.completedTimestamps || {}) },
                  completionTimes: { ...(exist.completionTimes || {}), ...(sh.completionTimes || {}) },
                  focusHistory: { ...(exist.focusHistory || {}), ...(sh.focusHistory || {}) },
                  totalFocusMinutes: Math.max(exist.totalFocusMinutes || 0, sh.totalFocusMinutes || 0),
                  focusSessionsCount: Math.max(exist.focusSessionsCount || 0, sh.focusSessionsCount || 0),
                });
              }
            }
          });

          if (!hasChange && habitMap.size === currentHabits.length) {
            return prevHabits;
          }

          didUpdateSomething = true;
          const merged = Array.from(habitMap.values());
          try {
            safeStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) { console.warn("Failed to save merged habits (habits effect) to localStorage:", e); }
          return merged;
        });

        // Reconcile tasks (detect bot-created tasks or bot task completions)
        setTasks((prevTasks) => {
          let hasChange = false;
          const taskMap = new Map<string, Task>();
          const currentTasks = Array.isArray(prevTasks) ? prevTasks : [];

          currentTasks.forEach((t) => {
            if (t && t.id && !delTaskSet.has(t.id)) {
              taskMap.set(t.id, t);
            } else if (t && delTaskSet.has(t.id)) {
              hasChange = true;
            }
          });

          serverTasks.forEach((st) => {
            if (!st || !st.id || delTaskSet.has(st.id)) return;
            const exist = taskMap.get(st.id);
            if (!exist) {
              taskMap.set(st.id, st);
              hasChange = true;
            } else {
              const isDifferent =
                exist.completed !== st.completed ||
                exist.title !== st.title ||
                JSON.stringify(exist.subtasks || []) !== JSON.stringify(st.subtasks || []);

              if (isDifferent) {
                hasChange = true;
                const mergedSubtasksMap = new Map<string, any>();
                (exist.subtasks || []).forEach((s: any) => s?.id && mergedSubtasksMap.set(s.id, s));
                (st.subtasks || []).forEach((s: any) => {
                  if (s?.id) {
                    const existSt = mergedSubtasksMap.get(s.id);
                    mergedSubtasksMap.set(s.id, existSt ? { ...existSt, ...s, completed: s.completed || existSt.completed } : s);
                  }
                });
                taskMap.set(st.id, {
                  ...exist,
                  ...st,
                  completed: Boolean(st.completed || exist.completed),
                  subtasks: Array.from(mergedSubtasksMap.values()),
                });
              }
            }
          });

          if (!hasChange && taskMap.size === currentTasks.length) {
            return prevTasks;
          }

          didUpdateSomething = true;
          const merged = Array.from(taskMap.values());
          try {
            safeStorage.setItem(TASKS_KEY, JSON.stringify(merged));
          } catch (e) { console.warn("Failed to save merged tasks (tasks effect) to localStorage:", e); }
          return merged;
        });

        if (db.wallet && typeof db.wallet === 'object') {
          const sanitizedServerWallet = sanitizeWallet(db.wallet);
          if (!wallet || sanitizedServerWallet.coins !== wallet.coins || (sanitizedServerWallet.transactions || []).length !== (wallet.transactions || []).length) {
            setWallet(sanitizedServerWallet);
            saveRewardWallet(sanitizedServerWallet);
            didUpdateSomething = true;
          }
        }

        if (Array.isArray(db.customNovels)) {
          const delSet = new Set(db.deletedNovelIds || deletedNovelIds);
          const validNovels = db.customNovels.filter((n: any) => !delSet.has(n.id));
          const isNovelsDifferent = JSON.stringify(validNovels) !== JSON.stringify(customNovels);
          if (isNovelsDifferent) {
            setCustomNovels(validNovels);
            saveCustomWebNovels(validNovels);
            didUpdateSomething = true;
            setActiveReadingNovel((curr) => {
              if (!curr) return null;
              const matching = validNovels.find((n: any) => n.id === curr.id);
              return matching ? { ...curr, ...matching } : curr;
            });
          }
        }

        if (Array.isArray(db.customMovies) && db.customMovies.length !== customMovies.length) {
          setCustomMovies(db.customMovies);
          saveCustomMovies(db.customMovies);
          didUpdateSomething = true;
        }

        if (db.advancedSettings && typeof db.advancedSettings === 'object' && db.advancedSettings.storeStoragePath !== advancedSettings.storeStoragePath) {
          setAdvancedSettings((prev) => ({
            ...prev,
            ...db.advancedSettings,
          }));
          didUpdateSomething = true;
        }

        if (db.telegramConfig && typeof db.telegramConfig === 'object') {
          const isRecentlyEditedTgLocally = Date.now() - lastTelegramLocalEditTime.current < 25000;
          if (!isRecentlyEditedTgLocally) {
            setTelegramConfig((prev) => {
              const incomingBotToken = (db.telegramConfig.botToken || '').trim();
              const incomingChatId = (db.telegramConfig.chatId || '').trim();
              const incomingBackupBotToken = (db.telegramConfig.backupBotToken || '').trim();
              const incomingBackupChatId = (db.telegramConfig.backupChatId || '').trim();

              const shouldUpdateBotToken = incomingBotToken !== '' && incomingBotToken !== prev.botToken;
              const shouldUpdateChatId = incomingChatId !== '' && incomingChatId !== prev.chatId;
              const shouldUpdateBackupBotToken = incomingBackupBotToken !== '' && incomingBackupBotToken !== prev.backupBotToken;
              const shouldUpdateBackupChatId = incomingBackupChatId !== '' && incomingBackupChatId !== prev.backupChatId;

              if (shouldUpdateBotToken || shouldUpdateChatId || shouldUpdateBackupBotToken || shouldUpdateBackupChatId) {
                const updatedConfig = {
                  ...prev,
                  ...db.telegramConfig,
                  botToken: shouldUpdateBotToken ? incomingBotToken : (prev.botToken || ''),
                  chatId: shouldUpdateChatId ? incomingChatId : (prev.chatId || ''),
                  backupBotToken: shouldUpdateBackupBotToken ? incomingBackupBotToken : (prev.backupBotToken || ''),
                  backupChatId: shouldUpdateBackupChatId ? incomingBackupChatId : (prev.backupChatId || ''),
                };
                try {
                  safeStorage.setItem(TELEGRAM_KEY, JSON.stringify(updatedConfig));
                } catch (e) { console.warn("Failed to save updated telegramConfig to localStorage:", e); }
                return updatedConfig;
              }
              return prev;
            });
          }
        }

        if (didUpdateSomething) {
          isIncomingServerUpdate.current = true;
          setTimeout(() => {
            isIncomingServerUpdate.current = false;
          }, 400);
        }
        lastIngestedServerTimestamp.current = Math.max(lastIngestedServerTimestamp.current, serverTimestamp);
      }
    } catch {
      if (isInitialMount) {
        setTimeout(() => pullServerState(true), 2000);
      }
    }
  };

  // Periodically and reactively pull state from server to synchronize bot additions/deletions/toggles
  useEffect(() => {
    // Pull immediately on mount
    pullServerState(true);

    const interval = setInterval(() => pullServerState(false), 2500);
    const onFocus = () => pullServerState(false);
    const onVisibilityChange = () => {
      if (!document.hidden) pullServerState(false);
    };

    const onCustomNovelsUpdated = (event: Event) => {
      const customEv = event as CustomEvent;
      const directNovels = customEv?.detail?.novels;
      if (Array.isArray(directNovels) && directNovels.length > 0) {
        setCustomNovels(directNovels);
        setActiveReadingNovel((curr) => {
          if (!curr) return null;
          const matching = directNovels.find((n: any) => n.id === curr.id);
          return matching ? { ...curr, ...matching } : curr;
        });
      } else {
        const stored = getCustomWebNovels();
        if (Array.isArray(stored)) {
          setCustomNovels(stored);
          setActiveReadingNovel((curr) => {
            if (!curr) return null;
            const matching = stored.find((n: any) => n.id === curr.id);
            return matching ? { ...curr, ...matching } : curr;
          });
        }
      }
    };

    try {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('customNovelsUpdated', onCustomNovelsUpdated);
    } catch (e) { console.warn("Failed to add global event listeners:", e); }

    return () => {
      clearInterval(interval);
      try {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('customNovelsUpdated', onCustomNovelsUpdated);
      } catch (e) { console.warn("Failed to remove global event listeners:", e); }
    };
  }, []);

  // Automated background check for daily Telegram report & Telegram backups
  useEffect(() => {
    const checkSchedules = async () => {
      if (!telegramConfig.botToken || !telegramConfig.chatId || habits.length === 0) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // 1. Daily AI coaching report schedule
      if (
        telegramConfig.autoDailyReport &&
        !isAutoDispatching.current &&
        currentTimeStr >= (telegramConfig.reportTime || '21:00') &&
        telegramConfig.lastSentDate !== todayStr
      ) {
        isAutoDispatching.current = true;

        const habitsSummary = habits.map((h) => {
          const stats = calculateHabitStats(h, todayStr, language);
          return {
            name: h.name,
            category: h.category,
            automaticity: stats.automaticity,
            stage: stats.stage,
            stageLabel: stats.stageLabel,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            totalCompletedDays: stats.totalCompletedDays,
            isDoneToday: stats.isDoneToday,
            remainingDays: stats.remainingDays,
          };
        });

        try {
          const res = await fetch('/api/ai/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              habitsSummary,
              habits,
              language,
              botToken: telegramConfig.botToken,
              chatId: telegramConfig.chatId,
              sendToTelegram: true,
              sendVisualCharts: telegramConfig.sendVisualCharts ?? true,
              dateFormatted: todayStr,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.telegramSent) {
            setTelegramConfig((prev) => ({
              ...prev,
              lastSentDate: todayStr,
            }));
          }
        } catch (err) {
          console.error('Auto report dispatch error:', err);
        } finally {
          isAutoDispatching.current = false;
        }
      }

      // 2. Automated Telegram Backup schedule
      const activeBackupBotToken = (
        telegramConfig.useDedicatedBackupBot && telegramConfig.backupBotToken?.trim()
          ? telegramConfig.backupBotToken.trim()
          : telegramConfig.botToken?.trim()
      );
      const activeBackupChatId = (
        telegramConfig.useDedicatedBackupBot && telegramConfig.backupChatId?.trim()
          ? telegramConfig.backupChatId.trim()
          : telegramConfig.chatId?.trim()
      );

      if (
        telegramConfig.autoBackupEnabled &&
        activeBackupBotToken &&
        activeBackupChatId &&
        !isAutoBackupDispatching.current &&
        currentTimeStr >= (telegramConfig.backupTime || '23:00')
      ) {
        let shouldSendBackup = false;
        const lastTimestamp = telegramConfig.lastBackupTimestamp || 0;
        const interval = telegramConfig.backupInterval || 'daily';

        if (interval === 'daily') {
          shouldSendBackup = telegramConfig.lastBackupSentDate !== todayStr;
        } else if (interval === 'every_3_days') {
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          shouldSendBackup = (!lastTimestamp || Date.now() - lastTimestamp >= threeDaysMs) && telegramConfig.lastBackupSentDate !== todayStr;
        } else if (interval === 'weekly') {
          if (telegramConfig.backupDayOfWeek !== undefined) {
            shouldSendBackup = (now.getDay() === telegramConfig.backupDayOfWeek) && telegramConfig.lastBackupSentDate !== todayStr;
          } else {
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            shouldSendBackup = (!lastTimestamp || Date.now() - lastTimestamp >= sevenDaysMs) && telegramConfig.lastBackupSentDate !== todayStr;
          }
        } else if (interval === 'monthly') {
          if (telegramConfig.backupDayOfMonth !== undefined) {
            shouldSendBackup = (now.getDate() === telegramConfig.backupDayOfMonth) && telegramConfig.lastBackupSentDate !== todayStr;
          } else {
            const monthlyMs = 28 * 24 * 60 * 60 * 1000;
            shouldSendBackup = (!lastTimestamp || Date.now() - lastTimestamp >= monthlyMs) && telegramConfig.lastBackupSentDate !== todayStr;
          }
        }

        if (shouldSendBackup) {
          isAutoBackupDispatching.current = true;
          try {
            const format = telegramConfig.backupFormat || 'json_standard';
            const isSanitized = format === 'json_sanitized';
            const fullBackup = createSelectiveBackupPayload({
              habits,
              tasks,
              wallet,
              language,
              theme,
              telegramConfig,
              advancedSettings,
              options: {
                includeHabits: true,
                includeTasks: true,
                includePomodoro: true,
                includeWallet: true,
                includeTelegram: true,
                includePreferences: true,
                includeAiKeys: !isSanitized,
                includeMedia: false,
                includeActivityLogs: true,
                sanitizeSecrets: isSanitized,
              },
            });

            let rawContent: string | undefined = undefined;
            let customFileName = `scientific-habit-tracker-backup-${todayStr}.json`;

            if (format === 'json_encrypted' && telegramConfig.backupEncryptionPassword) {
              rawContent = await encryptBackupPayload(fullBackup, telegramConfig.backupEncryptionPassword);
              customFileName = `scientific-habit-tracker-encrypted-${todayStr}.json`;
            } else if (isSanitized) {
              customFileName = `scientific-habit-tracker-clean-${todayStr}.json`;
            }

            const res = await fetch('/api/telegram/backup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                botToken: activeBackupBotToken,
                chatId: activeBackupChatId,
                fullBackupData: fullBackup,
                rawContent,
                customFileName,
                habits,
                language,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setTelegramConfig((prev) => ({
                ...prev,
                lastBackupSentDate: todayStr,
                lastBackupTimestamp: Date.now(),
                lastBackupStatus: 'success',
                lastBackupError: undefined,
                totalAutoBackupsSent: (prev.totalAutoBackupsSent || 0) + 1,
              }));
            } else {
              setTelegramConfig((prev) => ({
                ...prev,
                lastBackupStatus: 'failed',
                lastBackupError: data.error || 'Failed to dispatch scheduled backup',
              }));
            }
          } catch (err: any) {
            console.error('Auto backup dispatch error:', err);
            setTelegramConfig((prev) => ({
              ...prev,
              lastBackupStatus: 'failed',
              lastBackupError: err?.message || 'Error dispatching auto backup',
            }));
          } finally {
            isAutoBackupDispatching.current = false;
          }
        }
      }

      // 3. Multi-Time Daily Pending Habits Reminders
      if (
        telegramConfig.reminderEnabled &&
        !isAutoReminderDispatching.current &&
        telegramConfig.reminderTimes &&
        telegramConfig.reminderTimes.length > 0
      ) {
        const lastSentMap = telegramConfig.lastRemindersSent || {};
        const eligibleTimes = telegramConfig.reminderTimes.filter(
          (remTime) => currentTimeStr >= remTime && lastSentMap[remTime] !== todayStr
        );

        if (eligibleTimes.length > 0) {
          const targetTime = eligibleTimes[0];
          isAutoReminderDispatching.current = true;

          try {
            const res = await fetch('/api/telegram/send-reminder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                botToken: telegramConfig.botToken,
                chatId: telegramConfig.chatId,
                habits,
                tasks,
                language,
                referenceDate: todayStr,
                isTest: false,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setTelegramConfig((prev) => ({
                ...prev,
                lastRemindersSent: {
                  ...(prev.lastRemindersSent || {}),
                  [targetTime]: todayStr,
                },
              }));
            }
          } catch (err) {
            console.error('Auto reminder dispatch error:', err);
          } finally {
            isAutoReminderDispatching.current = false;
          }
        }
      }

      // 4. Strict Nightly Accountability Deadline Warning
      if (
        telegramConfig.strictWarningEnabled &&
        !isAutoStrictWarningDispatching.current &&
        currentTimeStr >= (telegramConfig.strictWarningTime || '23:30') &&
        telegramConfig.lastStrictWarningSentDate !== todayStr
      ) {
        isAutoStrictWarningDispatching.current = true;
        try {
          const res = await fetch('/api/telegram/send-strict-warning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: telegramConfig.botToken,
              chatId: telegramConfig.chatId,
              habits,
              tasks,
              language,
              referenceDate: todayStr,
              isTest: false,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setTelegramConfig((prev) => ({
              ...prev,
              lastStrictWarningSentDate: todayStr,
            }));
          }
        } catch (err) {
          console.error('Auto strict warning dispatch error:', err);
        } finally {
          isAutoStrictWarningDispatching.current = false;
        }
      }
    };

    const interval = setInterval(checkSchedules, 60000);
    checkSchedules(); // Check immediately on mount/update

    return () => clearInterval(interval);
  }, [telegramConfig, habits, todayStr, language]);

  // Pomodoro Focus Completion Handler
  const handlePomodoroCompleted = () => {
    stopAmbientSound();

    if (pomodoroMode === 'focus') {
      // 1. Audio & Haptic celebration feedback
      if (advancedSettings.pomodoroConfig?.soundEffects !== false && advancedSettings.enableSoundEffects !== false) {
        playPomodoroBellSound();
      }
      if (advancedSettings.enableCelebrationConfetti !== false) {
        triggerCelebrationConfetti();
      }
      if (advancedSettings.enableHapticFeedback !== false) {
        triggerHapticFeedback([100, 50, 100]);
      }

      const focusMins = advancedSettings.pomodoroConfig?.focusMinutes ?? 25;
      const newSessionCount = pomodoroCompletedSessions + 1;
      setPomodoroCompletedSessions(newSessionCount);

      // Target title for session history
      const targetHabit = pomodoroTargetType === 'habit' ? habits.find(h => h.id === pomodoroTargetId) : undefined;
      const targetTask = pomodoroTargetType === 'task' ? tasks.find(t => t.id === pomodoroTargetId) : undefined;
      const targetTitle = targetHabit?.name || targetTask?.title;

      // 2. Persist session history
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      savePomodoroSession({
        targetType: pomodoroTargetType,
        targetId: pomodoroTargetId || undefined,
        targetTitle,
        durationMinutes: focusMins,
        durationSeconds: focusMins * 60,
        plannedMinutes: focusMins,
        isCompletedFull: true,
        completedAt: todayStr,
        time: timeStr,
        mode: 'focus',
      });

      // 3. Update focus statistics on attached Habit or Task
      if (pomodoroTargetType === 'habit' && pomodoroTargetId) {
        updateHabitsWithTimestamp((prev) =>
          prev.map((h) => {
            if (h.id !== pomodoroTargetId) return h;
            return {
              ...h,
              totalFocusMinutes: (h.totalFocusMinutes || 0) + focusMins,
              focusSessionsCount: (h.focusSessionsCount || 0) + 1,
            };
          })
        );
      } else if (pomodoroTargetType === 'task' && pomodoroTargetId) {
        updateTasksWithTimestamp((prev) =>
          prev.map((t) => {
            if (t.id !== pomodoroTargetId) return t;
            return {
              ...t,
              totalFocusMinutes: (t.totalFocusMinutes || 0) + focusMins,
              focusSessionsCount: (t.focusSessionsCount || 0) + 1,
            };
          })
        );
      }

      // 4. Award focus reward coins & XP (configurable in advancedSettings, min 25 mins)
      const isCompleted25Min = focusMins >= 25;
      const configuredCoins = Math.round(advancedSettings.pomodoroRewardCoins ?? advancedSettings.pomodoroConfig?.rewardCoins ?? 5);
      const intervals = isCompleted25Min ? Math.max(1, Math.floor(focusMins / 25)) : 0;
      const focusBonusCoins = Math.round(intervals * configuredCoins);
      const targetLabel = targetTitle || (language === 'fa' ? 'جلسه تمرکز عمیق' : 'Deep Focus Session');

      if (focusBonusCoins > 0) {
        updateWalletWithTimestamp((prev) => {
          const safePrev = sanitizeWallet(prev);
          const newCoins = safePrev.coins + focusBonusCoins;
          const newTx: RewardTransaction = {
            id: `tx-pomo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'earn',
            amount: focusBonusCoins,
            description: language === 'fa'
              ? `پاداش تمرکز پومودورو (${focusMins} دقیقه) برای «${targetLabel}» (+${focusBonusCoins} سکه)`
              : language === 'ar'
              ? `مكافأة تركيز بومودورو (${focusMins} دقيقة) لـ «${targetLabel}» (+${focusBonusCoins} عملة)`
              : `Pomodoro focus reward (${focusMins}m) for "${targetLabel}" (+${focusBonusCoins} coins)`,
            timestamp: Date.now(),
          };
          return {
            ...safePrev,
            coins: newCoins,
            totalCoinsEarned: safePrev.totalCoinsEarned + focusBonusCoins,
            transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
          };
        });

        // Show toast
        const toastId = Date.now();
        setCoinToast({
          id: toastId,
          amount: focusBonusCoins,
          habitName: language === 'fa' ? `پومودورو: ${targetLabel}` : `Pomodoro: ${targetLabel}`,
        });
        setTimeout(() => {
          setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
        }, 3500);
      }

      // 5. Transition to break mode automatically
      const breakInterval = advancedSettings.pomodoroConfig?.longBreakInterval ?? 4;
      const isLongBreak = newSessionCount % breakInterval === 0;
      const nextMode = isLongBreak ? 'longBreak' : 'shortBreak';
      const nextDuration = (isLongBreak
        ? (advancedSettings.pomodoroConfig?.longBreakMinutes ?? 15)
        : (advancedSettings.pomodoroConfig?.shortBreakMinutes ?? 5)) * 60;

      setPomodoroMode(nextMode);
      setPomodoroTimeLeft(nextDuration);
      setPomodoroTotalDuration(nextDuration);
      // Auto-start break countdown as requested by user
      setIsPomodoroRunning(advancedSettings.pomodoroConfig?.autoStartBreaks !== false);
    } else {
      // Break completed -> Transition to focus mode
      if (advancedSettings.pomodoroConfig?.soundEffects !== false && advancedSettings.enableSoundEffects !== false) {
        playBreakCompleteSound();
      }
      const nextDuration = (advancedSettings.pomodoroConfig?.focusMinutes ?? 25) * 60;
      setPomodoroMode('focus');
      setPomodoroTimeLeft(nextDuration);
      setPomodoroTotalDuration(nextDuration);
      setIsPomodoroRunning(advancedSettings.pomodoroConfig?.autoStartPomodoros ?? false);
    }
  };

  // Pomodoro timer / stopwatch tick loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPomodoroRunning) {
      if (pomodoroAmbientSound !== 'none') {
        startAmbientSound(pomodoroAmbientSound, pomodoroSoundVolume);
      } else {
        stopAmbientSound();
      }

      interval = setInterval(() => {
        if (pomodoroMode === 'stopwatch') {
          // Stopwatch mode: counts UP from 0
          setPomodoroTimeLeft((prev) => prev + 1);
        } else {
          // Countdown timer modes: counts DOWN
          setPomodoroTimeLeft((prev) => {
            if (advancedSettings.pomodoroConfig?.tickingSound && prev > 1) {
              playTickSound();
            }

            if (prev <= 1) {
              handlePomodoroCompleted();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      stopAmbientSound();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isPomodoroRunning,
    pomodoroMode,
    pomodoroAmbientSound,
    pomodoroSoundVolume,
    pomodoroTargetType,
    pomodoroTargetId,
    pomodoroCompletedSessions,
    advancedSettings.pomodoroConfig,
    habits,
    tasks,
  ]);

  // Keep floating Pomodoro widget visible once timer starts running
  useEffect(() => {
    if (isPomodoroRunning) {
      setIsPomodoroFloatingVisible(true);
    }
  }, [isPomodoroRunning]);

  // Pomodoro helper handlers
  const handleOpenPomodoroForHabit = (habit: Habit) => {
    setPomodoroTargetType('habit');
    setPomodoroTargetId(habit.id);
    setIsPomodoroModalOpen(true);
  };

  const handleOpenPomodoroForTask = (task: Task) => {
    setPomodoroTargetType('task');
    setPomodoroTargetId(task.id);
    setIsPomodoroModalOpen(true);
  };

  const handleOpenGenericPomodoro = () => {
    setIsPomodoroModalOpen(true);
  };

  const handlePomodoroModeChange = (mode: 'focus' | 'shortBreak' | 'longBreak' | 'stopwatch') => {
    setPomodoroMode(mode);
    setIsPomodoroRunning(false);
    stopAmbientSound();
    if (mode === 'focus') {
      const dur = (advancedSettings.pomodoroConfig?.focusMinutes ?? 25) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (mode === 'shortBreak') {
      const dur = (advancedSettings.pomodoroConfig?.shortBreakMinutes ?? 5) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (mode === 'longBreak') {
      const dur = (advancedSettings.pomodoroConfig?.longBreakMinutes ?? 15) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (mode === 'stopwatch') {
      setPomodoroTimeLeft(0);
      setPomodoroTotalDuration(0);
    }
  };

  const handlePomodoroReset = () => {
    setIsPomodoroRunning(false);
    stopAmbientSound();
    if (pomodoroMode === 'focus') {
      const dur = (advancedSettings.pomodoroConfig?.focusMinutes ?? 25) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (pomodoroMode === 'shortBreak') {
      const dur = (advancedSettings.pomodoroConfig?.shortBreakMinutes ?? 5) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (pomodoroMode === 'longBreak') {
      const dur = (advancedSettings.pomodoroConfig?.longBreakMinutes ?? 15) * 60;
      setPomodoroTimeLeft(dur);
      setPomodoroTotalDuration(dur);
    } else if (pomodoroMode === 'stopwatch') {
      setPomodoroTimeLeft(0);
      setPomodoroTotalDuration(0);
    }
  };

  // Update focus minutes specifically for a habit and log activity
  const handleUpdateHabitFocus = (habitId: string, minutes: number, markDoneToday?: boolean) => {
    if (!habitId || minutes <= 0) return;
    const targetHabit = habits.find((h) => h.id === habitId);
    updateHabitsWithTimestamp((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newHistory = markDoneToday ? { ...(h.history || {}), [todayStr]: true } : h.history;
        return {
          ...h,
          totalFocusMinutes: (h.totalFocusMinutes || 0) + minutes,
          focusSessionsCount: (h.focusSessionsCount || 0) + 1,
          history: newHistory,
        };
      })
    );

    if (targetHabit) {
      saveUserActivityLog({
        type: 'habit_focus',
        targetId: habitId,
        targetTitle: targetHabit.name,
        durationMinutes: minutes,
        timestamp: Date.now(),
        persianDate: todayStr,
        details: {
          category: targetHabit.category,
          markDoneToday: !!markDoneToday,
          rewardCoins: Math.max(1, Math.round(minutes / 10) * 2),
        },
      });
    }
  };

  // Update focus minutes specifically for a task and log activity
  const handleUpdateTaskFocus = (taskId: string, minutes: number, markCompleted?: boolean) => {
    if (!taskId || minutes <= 0) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    updateTasksWithTimestamp((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          totalFocusMinutes: (t.totalFocusMinutes || 0) + minutes,
          focusSessionsCount: (t.focusSessionsCount || 0) + 1,
          completed: markCompleted ? true : t.completed,
          completedAt: markCompleted ? Date.now() : t.completedAt,
        };
      })
    );

    if (targetTask) {
      saveUserActivityLog({
        type: 'task_focus',
        targetId: taskId,
        targetTitle: targetTask.title,
        durationMinutes: minutes,
        timestamp: Date.now(),
        persianDate: todayStr,
        details: {
          category: targetTask.category,
          isOneTime: !targetTask.isRecurring,
          markCompleted: !!markCompleted,
          rewardCoins: Math.max(1, Math.round(minutes / 10) * 2),
        },
      });
    }
  };

  // General standalone focus log
  const handleAddGeneralFocus = (minutes: number) => {
    if (minutes <= 0) return;
    saveUserActivityLog({
      type: 'general_focus',
      durationMinutes: minutes,
      timestamp: Date.now(),
      persianDate: todayStr,
      details: {
        rewardCoins: Math.max(1, Math.round(minutes / 10) * 2),
      },
    });
  };

  // Reward coins from Pomodoro or manual log
  const handleRewardCoins = (coins: number, reason: string) => {
    if (coins <= 0) return;
    updateWalletWithTimestamp((prev) => {
      const safePrev = sanitizeWallet(prev);
      const newCoins = safePrev.coins + coins;
      const newTx: RewardTransaction = {
        id: `tx-pomo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'earn',
        amount: coins,
        description: reason || `پاداش تمرکز (+${coins} سکه)`,
        timestamp: Date.now(),
      };
      return {
        ...safePrev,
        coins: newCoins,
        totalCoinsEarned: safePrev.totalCoinsEarned + coins,
        transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
      };
    });

    const toastId = Date.now();
    setCoinToast({
      id: toastId,
      amount: coins,
      habitName: reason,
    });
    setTimeout(() => {
      setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
    }, 3500);
  };

  // Toggle habit completion on a specific date and award reward coins (strictly once per day per habit)
  const handleToggleDay = (habitId: string, dateStr: string) => {
    const currentHabit = habits.find((h) => h.id === habitId);
    const wasAlreadyChecked = currentHabit?.history?.[dateStr] === true;
    const willBeChecked = !wasAlreadyChecked;
    const alreadyClaimedRewardForDate = !!currentHabit?.claimedRewardDates?.[dateStr];
    const habitName = currentHabit?.name || '';
    const habitCoins = Math.min(10, Math.max(1, currentHabit?.rewardCoins ?? 10));
    const nowTimestamp = Date.now();
    const timeFormatted = new Date().toLocaleTimeString(language === 'fa' ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    updateHabitsWithTimestamp((prev) =>
      prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const currentHistory = { ...(habit.history || {}) };
        const currentTimestamps = { ...(habit.completedTimestamps || {}) };
        const currentTimes = { ...(habit.completionTimes || {}) };
        const currentClaimedDates = { ...(habit.claimedRewardDates || {}) };

        if (currentHistory[dateStr]) {
          delete currentHistory[dateStr];
          delete currentTimestamps[dateStr];
          delete currentTimes[dateStr];
          // Keep currentClaimedDates[dateStr] = true so rewards cannot be re-farmed for this date
        } else {
          currentHistory[dateStr] = true;
          currentTimestamps[dateStr] = nowTimestamp;
          currentTimes[dateStr] = timeFormatted;
          currentClaimedDates[dateStr] = true;
        }
        return {
          ...habit,
          history: currentHistory,
          completedTimestamps: currentTimestamps,
          completionTimes: currentTimes,
          claimedRewardDates: currentClaimedDates,
        };
      })
    );

    // If user completed a habit check-in, award reward coins only if not already claimed for this specific date
    if (willBeChecked) {
      if (!alreadyClaimedRewardForDate) {
        if (currentHabit) {
          saveUserActivityLog({
            type: 'habit_checkin',
            targetId: currentHabit.id,
            targetTitle: currentHabit.name,
            time: timeFormatted,
            timestamp: nowTimestamp,
            persianDate: dateStr,
            details: {
              category: currentHabit.category,
              targetDays: currentHabit.targetDays,
              rewardCoins: habitCoins,
              exactCompletionTime: timeFormatted,
            },
          });
        }

        updateWalletWithTimestamp((prev) => {
          const safePrev = sanitizeWallet(prev);
          const newCoins = safePrev.coins + habitCoins;
          const newTotalEarned = safePrev.totalCoinsEarned + habitCoins;
          const newTx: RewardTransaction = {
            id: `tx-checkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'earn',
            amount: habitCoins,
            description: language === 'fa' 
              ? `انجام عادت «${habitName || 'روزانه'}» (+${habitCoins} سکه)` 
              : language === 'ar' 
              ? `إتمام العادة «${habitName || 'اليومية'}» (+${habitCoins} عملة)` 
              : `Completed habit "${habitName || 'Daily'}" (+${habitCoins} coins)`,
            timestamp: Date.now(),
          };

          return {
            ...safePrev,
            coins: newCoins,
            totalCoinsEarned: newTotalEarned,
            transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
          };
        });

        // Show celebratory floating toast
        const toastId = Date.now();
        setCoinToast({
          id: toastId,
          amount: habitCoins,
          habitName: habitName || (language === 'fa' ? 'عادت روزانه' : 'Daily habit'),
        });
        setTimeout(() => {
          setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
        }, 3500);

        // Sound and Haptic feedback effects based on Advanced Settings
        if (advancedSettings.enableSoundEffects !== false) {
          playCheckinSound();
        }
        if (advancedSettings.enableHapticFeedback !== false) {
          triggerHapticFeedback(20);
        }

        // Check if all other active habits are done for today, then trigger celebration confetti
        const otherHabitsDone = habits.filter((h) => h.id !== habitId).every((h) => !!h.history[dateStr]);
        if (otherHabitsDone && habits.length > 0 && advancedSettings.enableCelebrationConfetti !== false) {
          triggerCelebrationConfetti();
          if (advancedSettings.enableSoundEffects !== false) {
            playCelebrationSound();
          }
        }
      } else {
        // Reward was already claimed earlier today - just provide UI feedback without granting extra coins
        if (advancedSettings.enableSoundEffects !== false) {
          playCheckinSound();
        }
        if (advancedSettings.enableHapticFeedback !== false) {
          triggerHapticFeedback(15);
        }
      }
    }
  };

  // Unlock individual chapter with 1 to 5 coins
  const handleUnlockChapter = (novel: WebNovel, chapter: WebNovelChapter): boolean => {
    const chapterKey = `${novel.id}:${chapter.id}`;
    if (wallet.unlockedNovelIds.includes(novel.id) || (wallet.unlockedChapterIds && wallet.unlockedChapterIds.includes(chapterKey))) {
      return true; // Already unlocked
    }

    const chapterPrice = getChapterPrice(chapter, novel.pricePerChapter || 2);
    if (wallet.coins < chapterPrice) {
      return false; // Insufficient coins
    }

    updateWalletWithTimestamp((prev) => {
      const safePrev = sanitizeWallet(prev);
      const newCoins = Math.max(0, safePrev.coins - chapterPrice);
      const newTotalSpent = safePrev.totalCoinsSpent + chapterPrice;
      const newTx: RewardTransaction = {
        id: `tx-ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'spend',
        amount: chapterPrice,
        description: language === 'fa'
          ? `بازگشایی ${chapter.title} از رمان «${novel.title}» (-${chapterPrice} سکه)`
          : language === 'ar'
          ? `فتح ${chapter.title} من الرواية «${novel.title}» (-${chapterPrice} عملة)`
          : `Unlocked ${chapter.title} of "${novel.title}" (-${chapterPrice} coins)`,
        timestamp: Date.now(),
        novelId: novel.id,
      };

      const existingChapters = safePrev.unlockedChapterIds || [];
      return {
        ...safePrev,
        coins: newCoins,
        totalCoinsSpent: newTotalSpent,
        unlockedChapterIds: [...existingChapters, chapterKey],
        transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
      };
    });

    return true;
  };

  // Unlock / purchase a web novel with coins
  const handleUnlockNovel = (novel: WebNovel): boolean => {
    if (wallet.unlockedNovelIds.includes(novel.id)) {
      return true; // Already unlocked
    }

    const calculatedPrice = getNovelTotalCalculatedPrice(novel);

    if (calculatedPrice > 0 && wallet.coins < calculatedPrice) {
      return false; // Insufficient coins
    }

    updateWalletWithTimestamp((prev) => {
      const safePrev = sanitizeWallet(prev);
      const newCoins = Math.max(0, safePrev.coins - calculatedPrice);
      const newTotalSpent = safePrev.totalCoinsSpent + calculatedPrice;
      const newTx: RewardTransaction = {
        id: `tx-buy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'spend',
        amount: calculatedPrice,
        description: language === 'fa'
          ? `بازگشایی و خرید وب‌ناول «${novel.title}» (-${calculatedPrice} سکه)`
          : language === 'ar'
          ? `فتح وشراء الرواية «${novel.title}» (-${calculatedPrice} عملة)`
          : `Unlocked web novel "${novel.title}" (-${calculatedPrice} coins)`,
        timestamp: Date.now(),
        novelId: novel.id,
      };

      return {
        ...safePrev,
        coins: newCoins,
        totalCoinsSpent: newTotalSpent,
        unlockedNovelIds: [...safePrev.unlockedNovelIds, novel.id],
        transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
      };
    });

    return true;
  };

  // Save reading progress & mark chapter as read for a novel
  const handleSaveReadingProgress = (
    novelId: string,
    chapterIndex: number,
    scrollPercent: number = 0,
    chapterId?: string,
    chapterNumber?: number
  ) => {
    updateWalletWithTimestamp((prev) => {
      const existing = prev.readingProgress?.[novelId] || {};
      const existingReadIds = Array.isArray(existing.readChapterIds) ? existing.readChapterIds : [];
      const existingReadIndexes = Array.isArray(existing.readChapterIndexes) ? existing.readChapterIndexes : [];

      const updatedReadIds = chapterId && !existingReadIds.includes(chapterId)
        ? [...existingReadIds, chapterId]
        : existingReadIds;

      const updatedReadIndexes = !existingReadIndexes.includes(chapterIndex)
        ? [...existingReadIndexes, chapterIndex]
        : existingReadIndexes;

      return {
        ...prev,
        readingProgress: {
          ...(prev.readingProgress || {}),
          [novelId]: {
            ...existing,
            lastChapter: chapterIndex,
            lastChapterNumber: chapterNumber || chapterIndex + 1,
            scrollPercentage: scrollPercent,
            lastReadDate: new Date().toISOString(),
            readChapterIds: updatedReadIds,
            readChapterIndexes: updatedReadIndexes,
          },
        },
      };
    });
  };

  // Toggle read/unread state for a specific chapter
  const handleToggleChapterRead = (novelId: string, chapterIndex: number, chapterId?: string) => {
    updateWalletWithTimestamp((prev) => {
      const existing = prev.readingProgress?.[novelId] || {};
      const existingReadIds = Array.isArray(existing.readChapterIds) ? existing.readChapterIds : [];
      const existingReadIndexes = Array.isArray(existing.readChapterIndexes) ? existing.readChapterIndexes : [];

      const isIndexRead = existingReadIndexes.includes(chapterIndex);
      const isIdRead = chapterId ? existingReadIds.includes(chapterId) : false;
      const isRead = isIndexRead || isIdRead;

      let updatedReadIds = existingReadIds;
      let updatedReadIndexes = existingReadIndexes;

      if (isRead) {
        updatedReadIndexes = existingReadIndexes.filter((idx) => idx !== chapterIndex);
        if (chapterId) {
          updatedReadIds = existingReadIds.filter((id) => id !== chapterId);
        }
      } else {
        if (!existingReadIndexes.includes(chapterIndex)) {
          updatedReadIndexes = [...existingReadIndexes, chapterIndex];
        }
        if (chapterId && !existingReadIds.includes(chapterId)) {
          updatedReadIds = [...existingReadIds, chapterId];
        }
      }

      return {
        ...prev,
        readingProgress: {
          ...(prev.readingProgress || {}),
          [novelId]: {
            ...existing,
            lastChapter: chapterIndex,
            lastChapterNumber: chapterIndex + 1,
            lastReadDate: new Date().toISOString(),
            readChapterIds: updatedReadIds,
            readChapterIndexes: updatedReadIndexes,
          },
        },
      };
    });
  };

  // Save new or updated custom web novel
  const handleSaveCustomNovel = async (newNovel: WebNovel) => {
    // Prevent background polling from overriding novel state during save
    lastLocalEditTime.current = Date.now() + 20000;

    let updatedList: WebNovel[] = [];
    setCustomNovels((prev) => {
      const existsIndex = prev.findIndex((n) => n.id === newNovel.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        const existing = copy[existsIndex];
        copy[existsIndex] = {
          ...newNovel,
          price: existing.price !== undefined ? existing.price : newNovel.price,
          isPriceLocked: true,
        };
        updatedList = copy;
      } else {
        updatedList = [{ ...newNovel, isPriceLocked: true }, ...prev];
      }
      saveCustomWebNovels(updatedList);
      return updatedList;
    });

    // Also update activeReadingNovel if it's currently open
    setActiveReadingNovel((curr) => {
      if (curr && curr.id === newNovel.id) {
        return {
          ...newNovel,
          price: curr.price !== undefined ? curr.price : newNovel.price,
          isPriceLocked: true,
        };
      }
      return curr;
    });

    // Send novel directly to server to create dedicated disk folder in store/novels/
    try {
      const res = await fetch("/api/store/novels/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNovel),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.customNovels)) {
          setCustomNovels(data.customNovels);
          saveCustomWebNovels(data.customNovels);
        }
      }
    } catch (err) {
      console.warn("[App] Direct novel save to disk endpoint error:", err);
    }
  };

  // Delete custom or default novel permanently from server and client
  const handleDeleteCustomNovel = async (novelId: string) => {
    // 1. Update deletedNovelIds in state and localStorage immediately
    setDeletedNovelIds((prev) => {
      const next = Array.from(new Set([...prev, novelId]));
      saveDeletedNovelIds(next);
      return next;
    });

    // 2. Remove from customNovels state and localStorage immediately
    setCustomNovels((prev) => {
      const next = prev.filter((n) => n.id !== novelId);
      saveCustomWebNovels(next);
      return next;
    });

    // 3. Cancel and remove any active background translation job for this novel
    try {
      backgroundNovelTranslator.cancelJob(novelId);
    } catch (e) { console.warn("Failed to cancel novel translation job:", e); }

    // 4. Update timestamps to avoid sync race conditions
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();

    // 5. Send server DELETE request to remove disk folder and update database.json
    try {
      const res = await fetch(`/api/store/novels/${encodeURIComponent(novelId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.deletedNovelIds && Array.isArray(data.deletedNovelIds)) {
          setDeletedNovelIds((prev) => {
            const merged = Array.from(new Set([...prev, ...data.deletedNovelIds]));
            saveDeletedNovelIds(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to delete novel from server storage:', err);
    }
  };

  // Unlock / purchase a movie with coins
  const handleUnlockMovie = (movie: ShopMovie): boolean => {
    if ((wallet.unlockedMovieIds || []).includes(movie.id)) {
      return true; // Already unlocked
    }

    if (movie.price > 0 && wallet.coins < movie.price) {
      return false; // Insufficient coins
    }

    updateWalletWithTimestamp((prev) => {
      const safePrev = sanitizeWallet(prev);
      const newCoins = Math.max(0, safePrev.coins - movie.price);
      const newTotalSpent = safePrev.totalCoinsSpent + movie.price;
      const newTx: RewardTransaction = {
        id: `tx-movie-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'spend',
        amount: movie.price,
        description: language === 'fa'
          ? `خرید و بازگشایی فیلم «${movie.title}» (-${movie.price} سکه)`
          : language === 'ar'
          ? `شراء وفتح الفيلم «${movie.title}» (-${movie.price} عملة)`
          : `Unlocked movie "${movie.title}" (-${movie.price} coins)`,
        timestamp: Date.now(),
        movieId: movie.id,
      };

      const existingUnlocked = safePrev.unlockedMovieIds || [];
      return {
        ...safePrev,
        coins: newCoins,
        totalCoinsSpent: newTotalSpent,
        unlockedMovieIds: [...existingUnlocked, movie.id],
        transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
      };
    });

    if (advancedSettings.enableSoundEffects !== false) {
      playCelebrationSound();
    }
    if (advancedSettings.enableHapticFeedback !== false) {
      triggerHapticFeedback(30);
    }

    return true;
  };

  // Unlock individual episode with coins
  const handleUnlockEpisode = (movieId: string, episodeId: string, cost: number): boolean => {
    const epKey = `${movieId}:${episodeId}`;
    if ((wallet.unlockedEpisodeIds || []).includes(epKey) || (wallet.unlockedMovieIds || []).includes(movieId)) {
      return true; // Already unlocked
    }

    if (cost > 0 && wallet.coins < cost) {
      return false; // Insufficient coins
    }

    updateWalletWithTimestamp((prev) => {
      const safePrev = sanitizeWallet(prev);
      const newCoins = Math.max(0, safePrev.coins - cost);
      const newTotalSpent = safePrev.totalCoinsSpent + cost;
      const newTx: RewardTransaction = {
        id: `tx-ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'spend',
        amount: cost,
        description: language === 'fa'
          ? `خرید و بازگشایی قسمت جدید (-${cost} سکه)`
          : language === 'ar'
          ? `فتح حلقة جديدة (-${cost} عملة)`
          : `Unlocked new episode (-${cost} coins)`,
        timestamp: Date.now(),
        movieId,
      };

      const existingEpisodes = safePrev.unlockedEpisodeIds || [];
      return {
        ...safePrev,
        coins: newCoins,
        totalCoinsSpent: newTotalSpent,
        unlockedEpisodeIds: [...existingEpisodes, epKey],
        transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
      };
    });

    if (advancedSettings.enableSoundEffects !== false) {
      playCelebrationSound();
    }
    return true;
  };

  // Save or update user playlist
  const handleSaveCustomPlaylist = (newPlaylist: VideoPlaylist) => {
    setCustomPlaylists((prev) => {
      const existsIndex = prev.findIndex((p) => p.id === newPlaylist.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newPlaylist;
        return copy;
      }
      return [newPlaylist, ...prev];
    });
  };

  // Delete custom user playlist or default playlist
  const handleDeleteCustomPlaylist = async (
    playlistId: string,
    deleteContainedMovies?: boolean
  ): Promise<{ success: boolean; freedBytes?: number; formattedFreedBytes?: string; message?: string }> => {
    const nextPlaylists = customPlaylists.filter((p) => p.id !== playlistId);
    const nextDeletedPlIds = Array.from(new Set([...deletedPlaylistIds, playlistId]));
    setCustomPlaylists(nextPlaylists);
    saveCustomPlaylists(nextPlaylists);
    setDeletedPlaylistIds(nextDeletedPlIds);
    saveDeletedPlaylistIds(nextDeletedPlIds);

    if (deleteContainedMovies) {
      const allPlaylistsList = getAllPlaylists(language, customPlaylists, deletedPlaylistIds);
      const targetPl = allPlaylistsList.find((p) => p.id === playlistId);
      const targetItemIds = targetPl?.itemIds || [];
      if (targetItemIds.length > 0) {
        const nextMovies = customMovies.filter((m) => !targetItemIds.includes(m.id) && m.playlistId !== playlistId);
        const nextDelMovieIds = Array.from(new Set([...deletedMovieIds, ...targetItemIds]));
        setCustomMovies(nextMovies);
        saveCustomMovies(nextMovies);
        setDeletedMovieIds(nextDelMovieIds);
        saveDeletedMovieIds(nextDelMovieIds);
      } else {
        const nextMovies = customMovies.filter((m) => m.playlistId !== playlistId);
        setCustomMovies(nextMovies);
        saveCustomMovies(nextMovies);
      }
    } else {
      const nextMovies = customMovies.map((m) => (m.playlistId === playlistId ? { ...m, playlistId: undefined } : m));
      setCustomMovies(nextMovies);
      saveCustomMovies(nextMovies);
    }
    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();
    try {
      const res = await fetch(
        `/api/playlists/${encodeURIComponent(playlistId)}?deleteMovies=${deleteContainedMovies ? 'true' : 'false'}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deletedMovieIds)) {
          setDeletedMovieIds((prev) => {
            const merged = Array.from(new Set([...prev, ...data.deletedMovieIds]));
            saveDeletedMovieIds(merged);
            return merged;
          });
        }
        if (Array.isArray(data.deletedPlaylistIds)) {
          setDeletedPlaylistIds((prev) => {
            const merged = Array.from(new Set([...prev, ...data.deletedPlaylistIds]));
            saveDeletedPlaylistIds(merged);
            return merged;
          });
        }
        return {
          success: true,
          freedBytes: data.freedBytes,
          formattedFreedBytes: data.formattedFreedBytes,
          message: data.message,
        };
      }
    } catch (err) {
      console.warn('Server playlist delete request failed:', err);
    }
    return { success: true };
  };

  // Delete an individual season from a movie/series
  const handleDeleteSeason = async (
    movieId: string,
    seasonId: string
  ): Promise<{ success: boolean; freedBytes?: number; formattedFreedBytes?: string; message?: string }> => {
    setCustomMovies((prev) =>
      prev.map((m) => {
        if (m.id === movieId && Array.isArray(m.seasons)) {
          return {
            ...m,
            seasons: m.seasons.filter((s) => s.id !== seasonId),
          };
        }
        return m;
      })
    );
    try {
      const res = await fetch(
        `/api/movies/${encodeURIComponent(movieId)}/seasons/${encodeURIComponent(seasonId)}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          freedBytes: data.freedBytes,
          formattedFreedBytes: data.formattedFreedBytes,
          message: data.message,
        };
      }
    } catch (err) {
      console.warn('Server season delete failed:', err);
    }
    return { success: true };
  };

  // Delete an individual episode from a movie/series
  const handleDeleteEpisode = async (
    movieId: string,
    episodeId: string
  ): Promise<{ success: boolean; freedBytes?: number; formattedFreedBytes?: string; message?: string }> => {
    setCustomMovies((prev) =>
      prev.map((m) => {
        if (m.id === movieId) {
          let updatedSeasons = m.seasons;
          if (Array.isArray(m.seasons)) {
            updatedSeasons = m.seasons.map((s) => ({
              ...s,
              episodes: (s.episodes || []).filter((ep) => ep.id !== episodeId),
            }));
          }
          const updatedStandalone = Array.isArray(m.standaloneEpisodes)
            ? m.standaloneEpisodes.filter((ep) => ep.id !== episodeId)
            : m.standaloneEpisodes;

          return {
            ...m,
            seasons: updatedSeasons,
            standaloneEpisodes: updatedStandalone,
          };
        }
        return m;
      })
    );
    try {
      const res = await fetch(
        `/api/movies/${encodeURIComponent(movieId)}/episodes/${encodeURIComponent(episodeId)}`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          freedBytes: data.freedBytes,
          formattedFreedBytes: data.formattedFreedBytes,
          message: data.message,
        };
      }
    } catch (err) {
      console.warn('Server episode delete failed:', err);
    }
    return { success: true };
  };

  // Save new or updated custom movie
  const handleSaveCustomMovie = (newMovie: ShopMovie) => {
    setCustomMovies((prev) => {
      const existsIndex = prev.findIndex((m) => m.id === newMovie.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        const existing = copy[existsIndex];
        copy[existsIndex] = {
          ...newMovie,
          price: existing.price !== undefined ? existing.price : newMovie.price,
          isPriceLocked: true,
        };
        return copy;
      }
      return [{ ...newMovie, isPriceLocked: true }, ...prev];
    });

    // Sync playlist itemIds
    if (newMovie.playlistId) {
      setCustomPlaylists((prev) => {
        const exists = prev.some((p) => p.id === newMovie.playlistId);
        if (exists) {
          return prev.map((pl) => {
            if (pl.id === newMovie.playlistId) {
              const currentItems = pl.itemIds || [];
              if (!currentItems.includes(newMovie.id)) {
                return { ...pl, itemIds: [...currentItems, newMovie.id] };
              }
            } else {
              return {
                ...pl,
                itemIds: (pl.itemIds || []).filter((id) => id !== newMovie.id),
              };
            }
            return pl;
          });
        }
        return prev;
      });
    }
  };

  // Delete movie or series (both custom uploaded and default curated movies)
  const handleDeleteCustomMovie = async (movieId: string): Promise<{ success: boolean; freedBytes?: number; formattedFreedBytes?: string; message?: string }> => {
    // 1. Remove from local customMovies state and record as deleted
    const nextMovies = customMovies.filter((m) => m.id !== movieId);
    const nextDeletedIds = Array.from(new Set([...deletedMovieIds, movieId]));
    setCustomMovies(nextMovies);
    saveCustomMovies(nextMovies);
    setDeletedMovieIds(nextDeletedIds);
    saveDeletedMovieIds(nextDeletedIds);
    
    // Also clean up any playlists containing this movieId
    const nextPlaylists = customPlaylists.map((pl) => ({
      ...pl,
      itemIds: (pl.itemIds || []).filter((id) => id !== movieId),
    }));
    setCustomPlaylists(nextPlaylists);
    saveCustomPlaylists(nextPlaylists);

    // If currently active playing movie is deleted, close player
    if (activePlayingMovie?.id === movieId) {
      setActivePlayingMovie(null);
    }

    hasHydratedFromServer.current = true;
    lastLocalEditTime.current = Date.now();

    // 2. Trigger physical deletion of video/media files and database cleanup on the server
    try {
      const res = await fetch(`/api/movies/${encodeURIComponent(movieId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deletedMovieIds)) {
          setDeletedMovieIds((prev) => {
            const merged = Array.from(new Set([...prev, ...data.deletedMovieIds]));
            saveDeletedMovieIds(merged);
            return merged;
          });
        }
        return {
          success: true,
          freedBytes: data.freedBytes,
          formattedFreedBytes: data.formattedFreedBytes,
          message: data.message,
        };
      }
    } catch (err) {
      console.warn('Server delete request failed:', err);
    }
    return { success: true };
  };

  // Add new habit
  const handleAddHabit = (newHabit: Habit) => {
    updateHabitsWithTimestamp((prev) => [newHabit, ...prev]);
  };

  // Quick add from sidebar
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHabitName.trim()) {
      setQuickError(t.habitTitleError);
      return;
    }

    const defaultCategory = language === 'fa' ? 'عمومی' : language === 'ar' ? 'عام' : 'General';

    const newHabit: Habit = {
      id: 'habit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: quickHabitName.trim(),
      category: defaultCategory,
      iconName: 'Activity',
      color: '#2563eb',
      createdAt: todayStr,
      history: {},
      targetDays: advancedSettings.defaultTargetDays || 66,
      rewardCoins: 10,
      rewardXp: 5,
    };

    updateHabitsWithTimestamp((prev) => [newHabit, ...prev]);
    setQuickHabitName('');
    setQuickError('');
  };

  // Delete habit handler
  const handleConfirmDelete = (habitId: string) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    if (targetHabit) {
      archiveHabitOnDelete(targetHabit);
    }
    setDeletedHabitIds((prev) => Array.from(new Set([...prev, habitId])));
    updateHabitsWithTimestamp((prev) => prev.filter((h) => h.id !== habitId));
    setHabitToDelete(null);
  };

  // Task handlers
  const handleSaveTask = (savedTask: Task) => {
    updateTasksWithTimestamp((prev) => {
      const exists = prev.some((t) => t.id === savedTask.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });
    setIsAddTaskModalOpen(false);
    setTaskToEdit(null);
  };

  const handleToggleTask = (taskId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const taskTitle = currentTask.title;
    const taskCoins = currentTask.rewardCoins ?? 5;
    const nowTimestamp = Date.now();
    const timeFormatted = new Date().toLocaleTimeString(language === 'fa' ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. RECURRING TASKS: Handled per cycle (at most once per day/cycle)
    if (currentTask.isRecurring && currentTask.recurrence) {
      const isAlreadyCompletedForToday =
        currentTask.lastCompletedDate === todayStr ||
        (currentTask.claimedRewardDates && currentTask.claimedRewardDates.includes(todayStr));

      if (isAlreadyCompletedForToday) {
        // Recurring task was already completed and claimed today
        const toastId = Date.now();
        setCoinToast({
          id: toastId,
          amount: 0,
          habitName: language === 'fa' 
            ? `«${taskTitle}» امروز قبلاً تکمیل شده است` 
            : `"${taskTitle}" already completed today`,
        });
        setTimeout(() => {
          setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
        }, 3000);

        if (advancedSettings.enableSoundEffects !== false) {
          playCheckinSound();
        }
        if (advancedSettings.enableHapticFeedback !== false) {
          triggerHapticFeedback(15);
        }
        return;
      }

      // First legitimate completion for this recurring cycle:
      const nextDueDate = getNextRecurringDate(currentTask.dueDate || todayStr, currentTask.recurrence);
      const nextStreak = (currentTask.recurringStreak || 0) + 1;
      const resetSubtasks = currentTask.subtasks
        ? currentTask.subtasks.map((st) => ({ ...st, completed: false }))
        : undefined;

      updateTasksWithTimestamp((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          const claimedDates = Array.from(new Set([...(task.claimedRewardDates || []), todayStr]));
          return {
            ...task,
            completed: false, // Keep active for next cycle
            dueDate: nextDueDate,
            lastCompletedDate: todayStr,
            recurringStreak: nextStreak,
            subtasks: resetSubtasks,
            completedAt: nowTimestamp,
            completedTimestamps: [...(task.completedTimestamps || []), nowTimestamp],
            completionTimes: [...(task.completionTimes || []), timeFormatted],
            claimedRewardDates: claimedDates,
          };
        })
      );

      // Save activity log
      saveUserActivityLog({
        type: 'task_completion',
        targetId: currentTask.id,
        targetTitle: currentTask.title,
        timestamp: nowTimestamp,
        persianDate: todayStr,
        details: {
          category: currentTask.category,
          priority: currentTask.priority,
          isOneTime: false,
          rewardCoins: taskCoins,
          completionTime: timeFormatted,
          totalFocusMinutes: currentTask.totalFocusMinutes || 0,
        },
      });

      // Award coins strictly once for this recurring cycle
      updateWalletWithTimestamp((prev) => {
        const safePrev = sanitizeWallet(prev);
        const newCoins = safePrev.coins + taskCoins;
        const newTotalEarned = safePrev.totalCoinsEarned + taskCoins;
        const newTx: RewardTransaction = {
          id: `tx-task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'earn',
          amount: taskCoins,
          description: language === 'fa'
            ? `تکمیل تسک «${taskTitle}» (+${taskCoins} سکه)`
            : language === 'ar'
            ? `إتمام المهمة «${taskTitle}» (+${taskCoins} عملة)`
            : `Completed task "${taskTitle}" (+${taskCoins} coins)`,
          timestamp: Date.now(),
        };
        return {
          ...safePrev,
          coins: newCoins,
          totalCoinsEarned: newTotalEarned,
          transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
        };
      });

      const toastId = Date.now();
      setCoinToast({
        id: toastId,
        amount: taskCoins,
        habitName: taskTitle,
      });
      setTimeout(() => {
        setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
      }, 3500);

      if (advancedSettings.enableSoundEffects !== false) {
        playCheckinSound();
      }
      if (advancedSettings.enableHapticFeedback !== false) {
        triggerHapticFeedback(20);
      }
      if (advancedSettings.enableCelebrationConfetti !== false) {
        triggerCelebrationConfetti();
      }
      return;
    }

    // 2. ONE-TIME (NON-RECURRING) TASKS:
    const willBeCompleted = !currentTask.completed;
    const alreadyClaimedReward = !!currentTask.rewardClaimed || ((currentTask.claimedRewardDates || []).length > 0);

    updateTasksWithTimestamp((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        if (willBeCompleted) {
          const claimedDates = Array.from(new Set([...(task.claimedRewardDates || []), todayStr]));
          return {
            ...task,
            completed: true,
            completedAt: nowTimestamp,
            completedTime: timeFormatted,
            completedTimestamps: [...(task.completedTimestamps || []), nowTimestamp],
            completionTimes: [...(task.completionTimes || []), timeFormatted],
            rewardClaimed: true,
            claimedRewardDates: claimedDates,
          };
        } else {
          // Unchecking task from completed list
          return {
            ...task,
            completed: false,
            completedAt: undefined,
            completedTime: undefined,
            // Keep rewardClaimed: true to prevent infinite coin farming on subsequent re-checks
          };
        }
      })
    );

    if (willBeCompleted) {
      if (!alreadyClaimedReward) {
        // First time completing this task: award coins and log activity
        saveUserActivityLog({
          type: 'task_completion',
          targetId: currentTask.id,
          targetTitle: currentTask.title,
          timestamp: nowTimestamp,
          persianDate: todayStr,
          details: {
            category: currentTask.category,
            priority: currentTask.priority,
            isOneTime: true,
            rewardCoins: taskCoins,
            completionTime: timeFormatted,
            totalFocusMinutes: currentTask.totalFocusMinutes || 0,
          },
        });

        updateWalletWithTimestamp((prev) => {
          const safePrev = sanitizeWallet(prev);
          const newCoins = safePrev.coins + taskCoins;
          const newTotalEarned = safePrev.totalCoinsEarned + taskCoins;
          const newTx: RewardTransaction = {
            id: `tx-task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'earn',
            amount: taskCoins,
            description: language === 'fa'
              ? `تکمیل تسک «${taskTitle}» (+${taskCoins} سکه)`
              : language === 'ar'
              ? `إتمام المهمة «${taskTitle}» (+${taskCoins} عملة)`
              : `Completed task "${taskTitle}" (+${taskCoins} coins)`,
            timestamp: Date.now(),
          };
          return {
            ...safePrev,
            coins: newCoins,
            totalCoinsEarned: newTotalEarned,
            transactions: [newTx, ...safePrev.transactions.slice(0, 49)],
          };
        });

        const toastId = Date.now();
        setCoinToast({
          id: toastId,
          amount: taskCoins,
          habitName: taskTitle,
        });
        setTimeout(() => {
          setCoinToast((curr) => (curr && curr.id === toastId ? null : curr));
        }, 3500);

        if (advancedSettings.enableSoundEffects !== false) {
          playCheckinSound();
        }
        if (advancedSettings.enableHapticFeedback !== false) {
          triggerHapticFeedback(20);
        }
        if (advancedSettings.enableCelebrationConfetti !== false) {
          triggerCelebrationConfetti();
        }
      } else {
        // Reward was already claimed previously: provide standard feedback without awarding extra coins
        if (advancedSettings.enableSoundEffects !== false) {
          playCheckinSound();
        }
        if (advancedSettings.enableHapticFeedback !== false) {
          triggerHapticFeedback(15);
        }
      }
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const parentTask = tasks.find((t) => t.id === taskId);
    const targetSub = parentTask?.subtasks?.find((s) => s.id === subtaskId);
    const willSubComplete = targetSub ? !targetSub.completed : false;

    if (willSubComplete) {
      if (advancedSettings.enableSoundEffects !== false) {
        playCheckinSound();
      }
      if (advancedSettings.enableHapticFeedback !== false) {
        triggerHapticFeedback(15);
      }
    }

    updateTasksWithTimestamp((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.subtasks) return t;
        const nextSubtasks = t.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        const allSubDone = nextSubtasks.length > 0 && nextSubtasks.every((st) => st.completed);
        return {
          ...t,
          subtasks: nextSubtasks,
          completed: allSubDone ? true : t.completed,
        };
      })
    );
  };

  const handleAddSubtask = (taskId: string, title: string) => {
    updateTasksWithTimestamp((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newSub = {
          id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title,
          completed: false,
        };
        return {
          ...t,
          subtasks: [...(t.subtasks || []), newSub],
        };
      })
    );
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    updateTasksWithTimestamp((prev) =>
      prev.map((t) => {
        if (t.id !== taskId || !t.subtasks) return t;
        return {
          ...t,
          subtasks: t.subtasks.filter((st) => st.id !== subtaskId),
        };
      })
    );
  };

  const handleDeleteTaskRequest = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      setTaskToDelete(target);
    } else {
      setDeletedTaskIds((prev) => Array.from(new Set([...prev, taskId])));
      updateTasksWithTimestamp((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const handleConfirmDeleteTask = (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      archiveTaskOnDelete(targetTask);
    }
    setDeletedTaskIds((prev) => Array.from(new Set([...prev, taskId])));
    updateTasksWithTimestamp((prev) => prev.filter((t) => t.id !== taskId));
    setTaskToDelete(null);
  };

  const handleQuickAddTask = (title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      priority: 'medium',
      category: language === 'fa' ? 'شخصی' : language === 'ar' ? 'شخصي' : 'Personal',
      dueDate: todayStr,
      completed: false,
      createdAt: todayStr,
      rewardCoins: 5,
      rewardXp: 2,
      color: '#3b82f6',
    };
    updateTasksWithTimestamp((prev) => [newTask, ...prev]);
  };

  // Reset to initial clean state (clears habits, tasks, coins, achievements, media)
  const handleConfirmResetDefaults = () => {
    const cleanHabits: Habit[] = [];
    const cleanTasks: Task[] = [];
    const cleanWallet: UserRewardWallet = {
      coins: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      unlockedNovelIds: [],
      unlockedMovieIds: [],
      unlockedEpisodeIds: [],
      unlockedChapterIds: [],
      readingProgress: {},
      transactions: [],
    };
    const cleanNovels: WebNovel[] = [];
    const cleanMovies: ShopMovie[] = [];
    const cleanPlaylists: VideoPlaylist[] = [];
    const cleanDeletedMovieIds: string[] = [];
    const cleanDeletedPlaylistIds: string[] = [];
    const cleanDeletedNovelIds: string[] = [];
    const cleanDeletedHabitIds: string[] = [];
    const cleanDeletedTaskIds: string[] = [];

    // 1. Update React states
    updateHabitsWithTimestamp(() => cleanHabits);
    updateTasksWithTimestamp(() => cleanTasks);
    setWallet(cleanWallet);
    setCustomNovels(cleanNovels);
    setCustomMovies(cleanMovies);
    setCustomPlaylists(cleanPlaylists);
    setDeletedMovieIds(cleanDeletedMovieIds);
    setDeletedPlaylistIds(cleanDeletedPlaylistIds);
    setDeletedNovelIds(cleanDeletedNovelIds);
    setDeletedHabitIds(cleanDeletedHabitIds);
    setDeletedTaskIds(cleanDeletedTaskIds);

    // 2. Clear local storage
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(cleanHabits));
    safeStorage.setItem(TASKS_KEY, JSON.stringify(cleanTasks));
    saveRewardWallet(cleanWallet);
    saveCustomWebNovels(cleanNovels);
    saveCustomMovies(cleanMovies);
    saveCustomPlaylists(cleanPlaylists);
    saveDeletedMovieIds(cleanDeletedMovieIds);
    saveDeletedPlaylistIds(cleanDeletedPlaylistIds);
    saveDeletedNovelIds(cleanDeletedNovelIds);
    try {
      safeStorage.setItem(DELETED_HABIT_IDS_KEY, JSON.stringify(cleanDeletedHabitIds));
      safeStorage.setItem(DELETED_TASK_IDS_KEY, JSON.stringify(cleanDeletedTaskIds));
    } catch (e) { console.warn("Failed to save deleted IDs to localStorage on app reset:", e); }

    setIsResetConfirmOpen(false);

    // Show visual feedback toast
    setResetToast(true);
    setTimeout(() => setResetToast(false), 3500);

    // 3. Wipe and update persistent server storage
    fetch('/api/storage/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientHydrated: true,
        forceWipe: true,
        habits: cleanHabits,
        tasks: cleanTasks,
        deletedHabitIds: cleanDeletedHabitIds,
        deletedTaskIds: cleanDeletedTaskIds,
        telegramConfig,
        language,
        theme,
        wallet: cleanWallet,
        customNovels: cleanNovels,
        customMovies: cleanMovies,
        customPlaylists: cleanPlaylists,
        deletedMovieIds: cleanDeletedMovieIds,
        deletedPlaylistIds: cleanDeletedPlaylistIds,
        deletedNovelIds: cleanDeletedNovelIds,
        advancedSettings,
      }),
    }).catch(() => {});
  };

  // Restore habits from uploaded backup
  const handleRestoreHabits = (
    restoredHabits: Habit[],
    restoredSettings?: Partial<FullBackupSettings>
  ) => {
    updateHabitsWithTimestamp(() => restoredHabits);
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(restoredHabits));

    if (restoredSettings) {
      if (restoredSettings.language) {
        setLanguage(restoredSettings.language);
        safeStorage.setItem(LANG_KEY, restoredSettings.language);
      }
      if (restoredSettings.theme) {
        setTheme(restoredSettings.theme);
        safeStorage.setItem(THEME_KEY, restoredSettings.theme);
      }
      if (restoredSettings.telegramConfig) {
        setTelegramConfig(restoredSettings.telegramConfig);
        safeStorage.setItem(TELEGRAM_KEY, JSON.stringify(restoredSettings.telegramConfig));
      }
      if (restoredSettings.tasks && Array.isArray(restoredSettings.tasks)) {
        setTasks(restoredSettings.tasks);
        safeStorage.setItem(TASKS_KEY, JSON.stringify(restoredSettings.tasks));
      }
      if (restoredSettings.rewardWallet) {
        setWallet(restoredSettings.rewardWallet);
        saveRewardWallet(restoredSettings.rewardWallet);
      }
      if (restoredSettings.customNovels && Array.isArray(restoredSettings.customNovels)) {
        setCustomNovels(restoredSettings.customNovels);
        saveCustomWebNovels(restoredSettings.customNovels);
      }
      if (restoredSettings.customMovies && Array.isArray(restoredSettings.customMovies)) {
        setCustomMovies(restoredSettings.customMovies);
        saveCustomMovies(restoredSettings.customMovies);
      }
      if (restoredSettings.customPlaylists && Array.isArray(restoredSettings.customPlaylists)) {
        setCustomPlaylists(restoredSettings.customPlaylists);
        saveCustomPlaylists(restoredSettings.customPlaylists);
      }
      if (restoredSettings.deletedMovieIds && Array.isArray(restoredSettings.deletedMovieIds)) {
        setDeletedMovieIds(restoredSettings.deletedMovieIds);
        saveDeletedMovieIds(restoredSettings.deletedMovieIds);
      }
      if (restoredSettings.deletedPlaylistIds && Array.isArray(restoredSettings.deletedPlaylistIds)) {
        setDeletedPlaylistIds(restoredSettings.deletedPlaylistIds);
        saveDeletedPlaylistIds(restoredSettings.deletedPlaylistIds);
      }
      if (restoredSettings.deletedNovelIds && Array.isArray(restoredSettings.deletedNovelIds)) {
        setDeletedNovelIds(restoredSettings.deletedNovelIds);
        saveDeletedNovelIds(restoredSettings.deletedNovelIds);
      }
      if (restoredSettings.advancedSettings) {
        setAdvancedSettings(restoredSettings.advancedSettings);
        safeStorage.setItem(ADVANCED_KEY, JSON.stringify(restoredSettings.advancedSettings));
      }

      // Synchronize restored state with server storage (with forceWipe: true to prevent stale data merge)
      fetch('/api/storage/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientHydrated: true,
          forceWipe: true,
          habits: restoredHabits,
          tasks: restoredSettings.tasks || tasks,
          language: restoredSettings.language || language,
          theme: restoredSettings.theme || theme,
          telegramConfig: restoredSettings.telegramConfig || telegramConfig,
          wallet: restoredSettings.rewardWallet || wallet,
          customNovels: restoredSettings.customNovels || customNovels,
          customMovies: restoredSettings.customMovies || customMovies,
          customPlaylists: restoredSettings.customPlaylists || customPlaylists,
          deletedMovieIds: restoredSettings.deletedMovieIds || deletedMovieIds,
          deletedPlaylistIds: restoredSettings.deletedPlaylistIds || deletedPlaylistIds,
          deletedNovelIds: restoredSettings.deletedNovelIds || deletedNovelIds,
          advancedSettings: restoredSettings.advancedSettings || advancedSettings,
        }),
      }).catch((e) => console.warn('Failed to sync restored backup to server storage:', e));
    }
  };

  // Export 100% Comprehensive JSON backup (Habits, check-ins, tasks, store items & unlocked purchases)
  const handleExportData = () => {
    const fullBackup = createCompleteBackupPayload(
      habits,
      language,
      theme,
      telegramConfig,
      wallet,
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
    downloadBackupFile(fullBackup, 'complete-all-data-and-store-backup');
    setBackupSuccessToast(true);
    setTimeout(() => setBackupSuccessToast(false), 4500);
  };

  // Filtered habits
  const filteredHabits = habits.filter((habit) => {
    if (searchQuery.trim()) {
      const matchName = habit.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = (habit.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchName && !matchCat) return false;
    }

    const isDoneToday = !!habit.history[todayStr];
    if (selectedFilter === 'completed' && !isDoneToday) return false;
    if (selectedFilter === 'pending' && isDoneToday) return false;

    return true;
  });

  // Statistics for sidebar
  const totalHabits = habits.length;
  const doneHabitsCount = habits.filter((h) => !!h.history[todayStr]).length;
  const totalAuto = habits.reduce((acc, h) => {
    return acc + calculateHabitStats(h, todayStr, language).automaticity;
  }, 0);
  const avgAutomaticity = totalHabits > 0 ? Math.round(totalAuto / totalHabits) : 0;
  const appearance = resolveAppearance(theme, advancedSettings.uiAppearance);
  const achievementsOverview = calculateAchievements(habits, language, tasks, wallet, customNovels, customMovies);

  return (
    <div 
      dir={t.dir}
      className={`min-h-screen antialiased p-4 sm:p-6 md:p-8 flex flex-col justify-between selection:bg-blue-100 dark:selection:bg-blue-900 selection-text-blue-900 dark:selection:text-blue-200 font-sans transition-colors duration-200 ${appearance.pageBackgroundClass}`}
    >
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
        {/* Header with Theme Toggle & Settings */}
        <DailySummaryBanner
          habits={habits}
          tasks={tasks}
          activeTab={activeView}
          onTabChange={(tab) => setActiveView(tab)}
          language={language}
          theme={theme}
          telegramConfig={telegramConfig}
          wallet={wallet}
          advancedSettings={advancedSettings}
          appearance={appearance}
          onToggleDarkMode={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenScienceModal={() => setIsScienceModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenAIReport={() => setIsAIReportModalOpen(true)}
          onOpenStatsModal={() => setIsStatsModalOpen(true)}
          onOpenAchievements={() => setIsAchievementsModalOpen(true)}
          onOpenShop={() => setIsShopModalOpen(true)}
          onOpenPomodoro={handleOpenGenericPomodoro}
        />

        {/* View Switcher Tabs (Daily Focus 🎯, Habits ⚡, Tasks 📋) */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200 dark:border-slate-800/80 gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800">
            <button
              id="view-tab-daily-focus"
              type="button"
              onClick={() => setActiveView('daily_focus')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'daily_focus'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.dailyFocusNavTitle}</span>
            </button>

            <button
              id="view-tab-habits"
              type="button"
              onClick={() => setActiveView('habits')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'habits'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{t.habitsNavTitle}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeView === 'habits'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {formatNumber(habits.filter((h) => !h.history || !h.history[todayStr]).length, language)}
              </span>
            </button>

            <button
              id="view-tab-tasks"
              type="button"
              onClick={() => setActiveView('tasks')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'tasks'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>{t.tasksNavTitle}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeView === 'tasks'
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {formatNumber(tasks.filter((t) => !t.completed).length, language)}
              </span>
            </button>
          </div>
        </div>

        {/* Render Active View */}
        {activeView === 'daily_focus' ? (
          <DailyFocusView
            appearance={appearance}
            habits={habits}
            tasks={tasks}
            language={language}
            achievementsOverview={achievementsOverview}
            onOpenAchievements={() => setIsAchievementsModalOpen(true)}
            onOpenBrainLevels={() => setIsBrainLevelsModalOpen(true)}
            onToggleHabit={handleToggleDay}
            onDeleteHabit={(h) => setHabitToDelete(h)}
            onToggleTask={handleToggleTask}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onOpenAddHabit={() => setIsAddModalOpen(true)}
            onOpenAddTask={() => {
              setTaskToEdit(null);
              setIsAddTaskModalOpen(true);
            }}
            onEditTask={(t) => {
              setTaskToEdit(t);
              setIsAddTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTaskRequest}
            onOpenPomodoroForHabit={handleOpenPomodoroForHabit}
            onOpenPomodoroForTask={handleOpenPomodoroForTask}
          />
        ) : activeView === 'tasks' ? (
          <TasksListView
            appearance={appearance}
            tasks={tasks}
            language={language}
            onToggleComplete={handleToggleTask}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onOpenAddModal={() => {
              setTaskToEdit(null);
              setIsAddTaskModalOpen(true);
            }}
            onEditTask={(t) => {
              setTaskToEdit(t);
              setIsAddTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTaskRequest}
            onQuickAddTask={handleQuickAddTask}
            onOpenPomodoro={handleOpenPomodoroForTask}
          />
        ) : (
          /* Habits Management & 66-Day Habits View */
          <HabitsListView
            appearance={appearance}
            habits={habits}
            language={language}
            onToggleDay={handleToggleDay}
            onRequestDelete={(h) => setHabitToDelete(h)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScienceModal={() => setIsScienceModalOpen(true)}
            onOpenPomodoro={handleOpenPomodoroForHabit}
            onToggleAllToday={() => {
              const pendingHabitsList = habits.filter((h) => !h.history[todayStr]);
              if (pendingHabitsList.length === 0) return;
              pendingHabitsList.forEach((h) => {
                handleToggleDay(h.id, todayStr);
              });
            }}
          />
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span>Scientific Habit Tracker v1.2.0 &copy; 2025</span>
            <span>•</span>
            <span>{t.scientificModelBadge}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExportData}
              className="hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 transition lowercase tracking-normal font-sans text-xs cursor-pointer"
              title={t.backupBtn}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.backupBtn}</span>
            </button>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition lowercase tracking-normal font-sans text-xs cursor-pointer"
              title={t.resetDefaultsBtn}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetDefaultsBtn}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Modals */}
      {isResetConfirmOpen && (
        <div 
          id="reset-defaults-confirm-modal"
          dir={t.dir}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {t.resetDefaultsBtn}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.resetConfirm}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-md shadow-red-600/20 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.resetDefaultsBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <AddHabitModal
        isOpen={isAddModalOpen}
        language={language}
        defaultTargetDays={advancedSettings.defaultTargetDays}
        onClose={() => setIsAddModalOpen(false)}
        onAddHabit={handleAddHabit}
      />

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        language={language}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsAddTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSaveTask={handleSaveTask}
      />

      <ScientificModelModal
        isOpen={isScienceModalOpen}
        language={language}
        appearance={appearance}
        onClose={() => setIsScienceModalOpen(false)}
      />

      <DeleteConfirmModal
        habit={habitToDelete}
        language={language}
        isOpen={!!habitToDelete}
        onClose={() => setHabitToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <DeleteTaskConfirmModal
        task={taskToDelete}
        language={language}
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        language={language}
        theme={theme}
        appearance={appearance}
        telegramConfig={telegramConfig}
        advancedSettings={advancedSettings}
        wallet={wallet}
        customNovels={customNovels}
        customMovies={customMovies}
        customPlaylists={customPlaylists}
        deletedMovieIds={deletedMovieIds}
        deletedPlaylistIds={deletedPlaylistIds}
        deletedNovelIds={deletedNovelIds}
        tasks={tasks}
        habits={habits}
        initialTab={settingsInitialTab}
        onUpdateLanguage={(newLang) => setLanguage(newLang)}
        onUpdateTheme={(newTheme) => setTheme(newTheme)}
        onUpdateTelegramConfig={(newCfg) => updateTelegramConfigWithTimestamp(newCfg)}
        onUpdateAdvancedSettings={handleUpdateAdvancedSettings}
        onOpenAIReport={() => setIsAIReportModalOpen(true)}
        onRestoreHabits={handleRestoreHabits}
        onRestoreNovels={(restoredNovels) => setCustomNovels(restoredNovels)}
      />

      <AIReportModal
        isOpen={isAIReportModalOpen}
        onClose={() => setIsAIReportModalOpen(false)}
        habits={habits}
        tasks={tasks}
        wallet={wallet}
        language={language}
        appearance={appearance}
        telegramConfig={telegramConfig}
        aiConfig={advancedSettings.aiConfig}
        onUpdateAiConfig={(newAiConfig) => handleUpdateAdvancedSettings({ ...advancedSettings, aiConfig: newAiConfig })}
        onOpenSettings={(tab?: 'general' | 'telegram' | 'backup' | 'advanced') => {
          setSettingsInitialTab(tab || 'advanced');
          setIsSettingsModalOpen(true);
        }}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        habits={habits}
        tasks={tasks}
        language={language}
        theme={theme}
        appearance={appearance}
        telegramConfig={telegramConfig}
        aiConfig={advancedSettings.aiConfig}
        onOpenAIReport={() => setIsAIReportModalOpen(true)}
        onOpenPomodoroModal={(targetType, targetId) => {
          setIsStatsModalOpen(false);
          setPomodoroTargetType(targetType || 'none');
          setPomodoroTargetId(targetId || null);
          setIsPomodoroModalOpen(true);
        }}
      />

      <AchievementsModal
        isOpen={isAchievementsModalOpen}
        onClose={() => setIsAchievementsModalOpen(false)}
        habits={habits}
        language={language}
        appearance={appearance}
        tasks={tasks}
        wallet={wallet}
        customNovels={customNovels}
        customMovies={customMovies}
      />

      <BrainLevelsModal
        isOpen={isBrainLevelsModalOpen}
        onClose={() => setIsBrainLevelsModalOpen(false)}
        language={language}
        appearance={appearance}
        currentXp={achievementsOverview.totalXp}
        currentLevel={achievementsOverview.currentLevel}
        nextLevel={achievementsOverview.nextLevel}
        achievements={achievementsOverview.achievements}
        onOpenAchievementsModal={() => setIsAchievementsModalOpen(true)}
      />

      {/* Reward Shop, Web Novel Reader & Movie Cinema Modals */}
      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        language={language}
        appearance={appearance}
        wallet={wallet}
        customNovels={customNovels}
        customMovies={customMovies}
        customPlaylists={customPlaylists}
        deletedMovieIds={deletedMovieIds}
        deletedPlaylistIds={deletedPlaylistIds}
        deletedNovelIds={deletedNovelIds}
        onUnlockNovel={handleUnlockNovel}
        onUnlockMovie={handleUnlockMovie}
        onCreatePlaylist={handleSaveCustomPlaylist}
        onDeleteCustomPlaylist={handleDeleteCustomPlaylist}
        onOpenReader={(novel) => {
          setActiveReadingNovel(novel);
        }}
        onOpenMoviePlayer={(movie) => {
          setActivePlayingMovie(movie);
        }}
        onOpenUploadModal={(targetNovel) => {
          setUploadTargetNovel(targetNovel && typeof targetNovel === 'object' && 'title' in targetNovel ? targetNovel : null);
          setIsUploadNovelModalOpen(true);
        }}
        onOpenUploadMovieModal={(targetMovie) => {
          setUploadTargetMovie(targetMovie && typeof targetMovie === 'object' && 'title' in targetMovie ? targetMovie : null);
          setIsUploadMovieModalOpen(true);
        }}
        onDeleteCustomNovel={handleDeleteCustomNovel}
        onDeleteCustomMovie={handleDeleteCustomMovie}
      />

      <NovelReaderModal
        isOpen={!!activeReadingNovel}
        novel={activeReadingNovel}
        language={language}
        wallet={wallet}
        onUnlockChapter={handleUnlockChapter}
        onUnlockNovel={handleUnlockNovel}
        onSaveNovel={handleSaveCustomNovel}
        onSaveProgress={handleSaveReadingProgress}
        onToggleChapterRead={handleToggleChapterRead}
        onClose={() => setActiveReadingNovel(null)}
      />

      <UploadNovelModal
        isOpen={isUploadNovelModalOpen}
        onClose={() => {
          setIsUploadNovelModalOpen(false);
          setUploadTargetNovel(null);
        }}
        existingNovels={customNovels}
        targetNovel={uploadTargetNovel}
        language={language}
        onSaveNovel={(novel) => {
          handleSaveCustomNovel(novel);
          setUploadTargetNovel(null);
        }}
      />

      <MoviePlayerModal
        isOpen={!!activePlayingMovie}
        movie={activePlayingMovie}
        language={language}
        wallet={wallet}
        onUnlockMovie={handleUnlockMovie}
        onUnlockEpisode={handleUnlockEpisode}
        onDeleteMovie={handleDeleteCustomMovie}
        onDeleteSeason={handleDeleteSeason}
        onDeleteEpisode={handleDeleteEpisode}
        onClose={() => setActivePlayingMovie(null)}
      />

      <UploadMovieModal
        isOpen={isUploadMovieModalOpen}
        onClose={() => {
          setIsUploadMovieModalOpen(false);
          setUploadTargetMovie(null);
        }}
        existingMovies={customMovies}
        targetMovie={uploadTargetMovie}
        customPlaylists={customPlaylists}
        deletedPlaylistIds={deletedPlaylistIds}
        onCreatePlaylist={handleSaveCustomPlaylist}
        language={language}
        onDeleteMovie={handleDeleteCustomMovie}
        onDeleteSeason={handleDeleteSeason}
        onDeleteEpisode={handleDeleteEpisode}
        onSaveMovie={(movie) => {
          handleSaveCustomMovie(movie);
          setUploadTargetMovie(null);
        }}
      />

      {/* Pomodoro Focus Station Modal */}
      <PomodoroModal
        isOpen={isPomodoroModalOpen}
        onClose={() => {
          setIsPomodoroModalOpen(false);
          if (isPomodoroRunning || pomodoroTimeLeft !== pomodoroTotalDuration) {
            setIsPomodoroFloatingVisible(true);
          }
        }}
        language={language}
        theme={theme}
        appearance={appearance}
        habits={habits}
        tasks={tasks}
        initialTargetType={pomodoroTargetType}
        initialTargetId={pomodoroTargetId}
        mode={pomodoroMode}
        timeLeft={pomodoroTimeLeft}
        totalDuration={pomodoroTotalDuration}
        setTimeLeft={setPomodoroTimeLeft}
        setTotalDuration={setPomodoroTotalDuration}
        isRunning={isPomodoroRunning}
        completedSessions={pomodoroCompletedSessions}
        ambientSound={pomodoroAmbientSound}
        soundVolume={pomodoroSoundVolume}
        advancedSettings={advancedSettings}
        pomodoroConfig={advancedSettings.pomodoroConfig}
        telegramConfig={telegramConfig}
        onUpdateSettings={handleUpdateAdvancedSettings}
        onModeChange={handlePomodoroModeChange}
        onToggleRunning={() => setIsPomodoroRunning((prev) => !prev)}
        onReset={handlePomodoroReset}
        onTargetChange={(targetType, targetId) => {
          setPomodoroTargetType(targetType);
          setPomodoroTargetId(targetId);
        }}
        onAmbientSoundChange={(snd) => setPomodoroAmbientSound(snd)}
        onVolumeChange={(vol) => setPomodoroSoundVolume(vol)}
        onUpdateHabitFocus={handleUpdateHabitFocus}
        onUpdateTaskFocus={handleUpdateTaskFocus}
        onAddGeneralFocus={handleAddGeneralFocus}
        onRewardCoins={handleRewardCoins}
        onCompleteHabit={(habitId) => handleToggleDay(habitId, todayStr)}
        onCompleteTask={(taskId) => handleToggleTask(taskId)}
        onOpenSettings={() => {
          setSettingsInitialTab('advanced');
          setIsSettingsModalOpen(true);
        }}
      />

      {/* Floating Action & Background Progress Stack (Pomodoro + Translation Banner) */}
      <div
        id="floating-widgets-stack"
        className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-3 pointer-events-none max-w-md w-[calc(100vw-2.5rem)]"
      >
        {/* Floating Pomodoro Widget: visible when running or paused (active session) and modal is closed */}
        {!isPomodoroModalOpen && (isPomodoroFloatingVisible || isPomodoroRunning) && (
          <div className="pointer-events-auto">
            <FloatingPomodoroWidget
              language={language}
              isRunning={isPomodoroRunning}
              mode={pomodoroMode}
              timeLeft={pomodoroTimeLeft}
              totalDuration={pomodoroTotalDuration}
              targetType={pomodoroTargetType}
              targetId={pomodoroTargetId}
              habits={habits}
              tasks={tasks}
              className="pointer-events-auto shadow-2xl"
              onOpenModal={() => setIsPomodoroModalOpen(true)}
              onToggleRunning={() => setIsPomodoroRunning((prev) => !prev)}
              onReset={handlePomodoroReset}
              onClose={() => setIsPomodoroFloatingVisible(false)}
            />
          </div>
        )}

        {/* Global Background Translation Banner when Shop modal is closed */}
        {!isShopModalOpen && (
          <div className="w-full pointer-events-auto flex justify-end">
            <BackgroundTranslationProgressBanner
              language={language}
              novels={[...getDefaultWebNovels(language), ...customNovels]}
              onOpenReader={(novel) => setActiveReadingNovel(novel)}
              compact={true}
            />
          </div>
        )}
      </div>

      {/* Reset Confirmation Toast */}
      {resetToast && (
        <div
          id="reset-success-toast"
          dir={t.dir}
          className="fixed bottom-6 start-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-900/95 border border-emerald-500/50 text-white px-4 py-3.5 rounded-2xl shadow-2xl shadow-emerald-950/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-bold text-emerald-300">
              {language === 'fa' 
                ? 'برنامه با موفقیت بازنشانی و پاکسازی شد' 
                : language === 'ar' 
                ? 'تمت إعادة ضبط وتصفير التطبيق بنجاح' 
                : 'App state reset successfully!'}
            </span>
            <span className="text-[11px] text-slate-300 font-medium">
              {language === 'fa'
                ? 'عادات، تسک‌ها، سکه‌ها و دستاوردها صفر و بازنشانی شدند.'
                : language === 'ar'
                ? 'تمت إعادة تعيين العادات والمهام والعملات والإنجازات.'
                : 'Habits, tasks, coins, and achievements have been reset.'}
            </span>
          </div>
        </div>
      )}

      {/* Complete Backup Success Toast */}
      {backupSuccessToast && (
        <div
          id="complete-backup-success-toast"
          dir={t.dir}
          className="fixed bottom-6 start-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-900/95 border border-blue-500/50 text-white px-4 py-3.5 rounded-2xl shadow-2xl shadow-blue-950/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-bold text-blue-300">
              {language === 'fa' 
                ? 'پشتیبان‌گیری کامل با موفقیت انجام شد' 
                : language === 'ar' 
                ? 'تم إنشاء النسخة الاحتياطية الشاملة بنجاح' 
                : 'Complete system backup created!'}
            </span>
            <span className="text-[11px] text-slate-300 font-medium">
              {language === 'fa'
                ? 'شامل تمام عادات، تسک‌ها، محتوای فروشگاه و خریدهای کاربر.'
                : language === 'ar'
                ? 'يتضمن جميع العادات والمهام ومحتوى المتجر ومشترياتك.'
                : 'Includes all habits, tasks, store items & your unlocked purchases.'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Coin Reward Toast Notification */}
      {coinToast && (
        <div
          id="coin-reward-toast"
          dir={t.dir}
          className="fixed bottom-6 start-6 z-50 flex items-center gap-3.5 bg-slate-900/95 dark:bg-slate-900/95 border border-amber-500/50 text-white px-4 py-3.5 rounded-2xl shadow-2xl shadow-amber-950/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 animate-bounce">
            <Coins className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-amber-300">
                +{formatNumber(coinToast.amount, language)} {language === 'fa' ? 'سکه پاداش دریافت شد!' : language === 'ar' ? 'عملة مكافأة جديدة!' : 'Reward Coins Earned!'}
              </span>
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {language === 'fa' 
                ? `برای انجام: «${coinToast.habitName}»` 
                : language === 'ar' 
                ? `لإتمام: «${coinToast.habitName}»` 
                : `For completing: "${coinToast.habitName}"`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCoinToast(null);
              setIsShopModalOpen(true);
            }}
            className="ms-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shadow-sm shrink-0 flex items-center gap-1"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'فروشگاه' : language === 'ar' ? 'المتجر' : 'Shop'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
