import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import JSZip from "jszip";

dotenv.config();
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  executeMultiProviderCompletion, 
  fetchLiveModelsFromProvider, 
  testSingleAIKey, 
  detectProviderFromKey,
  autoRefreshAllConfiguredKeys,
  AIKeyConfig 
} from "./server/multiProviderAI";
import {
  initializePersistentStorage,
  getPersistentDatabase,
  savePersistentDatabase,
  flushAllDataToDiskNow,
  syncFullClientPayload,
  getStorageDiskStatistics,
  createLocalBackupSnapshot,
  restoreFromLocalSnapshot,
  deleteLocalSnapshot,
  deleteMovieFromPersistentStorage,
  deleteSeasonFromPersistentStorage,
  deleteEpisodeFromPersistentStorage,
  deletePlaylistFromPersistentStorage,
  deleteNovelFromPersistentStorage,
  cleanupOrphanStoreFiles,
  scanStoreVideosDirectory,
  scanStoreNovelsDirectory,
  scanAllStoreDirectories,
  configureDiscoveredMedia,
  setStoreStoragePath,
  extractZipToVideosStore,
  getStoreDirectories,
  getSavedTelegramConfigFromDisk,
  saveTelegramConfigToDedicatedDisk,
  exportNovelToDiskFolder,
  exportMovieToDiskFolder,
  syncAllStoreItemsToDisk,
  sanitizeServerNovel,
  StoreProduct,
  PersistentDatabaseSchema
} from "./server/persistentStorage";
import {
  createOrEnqueueServerJob,
  getAllServerJobs,
  getAllServerJobsSummary,
  getServerJobById,
  pauseServerJob,
  resumeServerJob,
  cancelServerJob,
  deleteServerJob
} from "./server/serverTranslationService";
import {
  initProactiveEngine,
  runProactiveCycle,
  getProactiveConfig,
  setProactiveConfig,
  getProactiveDiagnostics,
  registerProactiveFeedback,
  formatProactiveMessage,
} from "./server/proactiveEngine";
import {
  detectConsecutiveMisses,
  learnGoldenWindows,
  computeRelapseRisk,
  createEmptyEngineState,
} from "./server/behaviorObserver";

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.removeHeader("X-Frame-Options");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Initialize Unified Persistent Database on server boot
const initialPersistentDb = initializePersistentStorage();

// In-memory server state
interface ServerState {
  habits: any[];
  tasks?: any[];
  language: string;
  themeMode?: string;
  wallet?: any;
  customNovels?: any[];
  customMovies?: any[];
  customPlaylists?: any[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  deletedHabitIds?: string[];
  deletedTaskIds?: string[];
  storeProducts?: StoreProduct[];
  advancedSettings?: any;
  telegramConfig: {
    botToken: string;
    chatId: string;
    autoDailyReport?: boolean;
    reportTime?: string;
    reminderEnabled?: boolean;
    reminderTimes?: string[];
    strictWarningEnabled?: boolean;
    strictWarningTime?: string;
    sendVisualCharts?: boolean;
    autoBackupEnabled?: boolean;
    backupInterval?: string;
    backupTime?: string;
    botPersona?: string;
    aiModelPreference?: string;
    telegramAiKeyId?: string;
    [key: string]: any;
  };
  aiConfig?: {
    analyticsAI?: { keys: AIKeyConfig[]; autoFallback?: boolean };
    translationAI?: { keys: AIKeyConfig[]; autoFallback?: boolean };
  };
  userCognitiveProfile?: any;
  chatHistories?: Record<string, any[]>;
  behaviorEngine?: any;
  proactiveCoach?: any;
  lastSyncTimestamp: number;
}

let currentServerState: ServerState = {
  habits: initialPersistentDb.habits || [],
  tasks: initialPersistentDb.tasks || [],
  language: initialPersistentDb.language || "fa",
  themeMode: initialPersistentDb.theme || "light",
  wallet: initialPersistentDb.wallet,
  customNovels: initialPersistentDb.customNovels || [],
  customMovies: initialPersistentDb.customMovies || [],
  customPlaylists: initialPersistentDb.customPlaylists || [],
  deletedMovieIds: initialPersistentDb.deletedMovieIds || [],
  deletedPlaylistIds: initialPersistentDb.deletedPlaylistIds || [],
  deletedNovelIds: initialPersistentDb.deletedNovelIds || [],
  deletedHabitIds: (initialPersistentDb as any).deletedHabitIds || [],
  deletedTaskIds: (initialPersistentDb as any).deletedTaskIds || [],
  storeProducts: initialPersistentDb.storeProducts || [],
  advancedSettings: initialPersistentDb.advancedSettings || {},
  telegramConfig: {
    botToken: initialPersistentDb.telegramConfig?.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : ""),
    chatId: initialPersistentDb.telegramConfig?.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : ""),
    autoDailyReport: initialPersistentDb.telegramConfig?.autoDailyReport ?? true,
    reportTime: initialPersistentDb.telegramConfig?.reportTime || "21:00",
    ...(initialPersistentDb.telegramConfig || {}),
  },
  aiConfig: (initialPersistentDb.advancedSettings as any)?.aiConfig || {
    analyticsAI: { keys: [], autoFallback: true },
    translationAI: { keys: [], autoFallback: true },
  },
  userCognitiveProfile: (initialPersistentDb as any).userCognitiveProfile || null,
  chatHistories: (initialPersistentDb as any).chatHistories || {},
  behaviorEngine: (initialPersistentDb as any).behaviorEngine || createEmptyEngineState(),
  proactiveCoach: (initialPersistentDb as any).proactiveCoach || undefined,
  lastSyncTimestamp: initialPersistentDb.lastUpdated || Date.now(),
};

// Ensure in-memory server state is perfectly refreshed from authoritative persistent database
function refreshServerStateFromDb(): PersistentDatabaseSchema {
  const db = getPersistentDatabase();
  currentServerState.habits = Array.isArray(db.habits) ? db.habits : [];
  currentServerState.tasks = Array.isArray(db.tasks) ? db.tasks : [];
  currentServerState.language = db.language || currentServerState.language || "fa";
  currentServerState.themeMode = db.theme || currentServerState.themeMode || "light";
  if (db.wallet) currentServerState.wallet = db.wallet;
  if (db.telegramConfig) {
    const existing = (currentServerState.telegramConfig || {}) as any;
    currentServerState.telegramConfig = {
      ...existing,
      ...db.telegramConfig,
      botToken: (db.telegramConfig as any).botToken || existing.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : ""),
      chatId: (db.telegramConfig as any).chatId || existing.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : ""),
    };
  }
  if (db.customNovels) currentServerState.customNovels = db.customNovels;
  if (db.customMovies) currentServerState.customMovies = db.customMovies;
  if (db.customPlaylists) currentServerState.customPlaylists = db.customPlaylists;
  if (db.deletedMovieIds) currentServerState.deletedMovieIds = db.deletedMovieIds;
  if (db.deletedPlaylistIds) currentServerState.deletedPlaylistIds = db.deletedPlaylistIds;
  if (db.deletedNovelIds) currentServerState.deletedNovelIds = db.deletedNovelIds;
  if (db.deletedHabitIds) currentServerState.deletedHabitIds = db.deletedHabitIds;
  if (db.deletedTaskIds) currentServerState.deletedTaskIds = db.deletedTaskIds;
  if (db.storeProducts) currentServerState.storeProducts = db.storeProducts;
  if ((db as any).userCognitiveProfile) currentServerState.userCognitiveProfile = (db as any).userCognitiveProfile;
  if ((db as any).behaviorEngine) currentServerState.behaviorEngine = (db as any).behaviorEngine;
  if ((db as any).proactiveCoach) currentServerState.proactiveCoach = (db as any).proactiveCoach;
  if (db.advancedSettings) currentServerState.advancedSettings = db.advancedSettings;
  currentServerState.lastSyncTimestamp = db.lastUpdated || Date.now();
  return db;
}

function saveServerStateToDisk() {
  try {
    const db = getPersistentDatabase();
    db.habits = currentServerState.habits || [];
    db.tasks = currentServerState.tasks || [];
    db.language = currentServerState.language || "fa";
    db.theme = currentServerState.themeMode || "light";

    // ANTI-WIPE PROTECTION FOR TELEGRAM CONFIG
    const dbTg = (db.telegramConfig || {}) as any;
    const memTg = (currentServerState.telegramConfig || {}) as any;
    const safeBotToken = (memTg.botToken && String(memTg.botToken).trim())
      ? String(memTg.botToken).trim().replace(/^bot/i, "")
      : (dbTg.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : ""));
    const safeChatId = (memTg.chatId && String(memTg.chatId).trim())
      ? String(memTg.chatId).trim()
      : (dbTg.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : ""));
    const safeBackupBotToken = (memTg.backupBotToken && String(memTg.backupBotToken).trim())
      ? String(memTg.backupBotToken).trim().replace(/^bot/i, "")
      : (dbTg.backupBotToken || "");
    const safeBackupChatId = (memTg.backupChatId && String(memTg.backupChatId).trim())
      ? String(memTg.backupChatId).trim()
      : (dbTg.backupChatId || "");

    db.telegramConfig = {
      ...dbTg,
      ...memTg,
      botToken: safeBotToken,
      chatId: safeChatId,
      backupBotToken: safeBackupBotToken,
      backupChatId: safeBackupChatId,
    };
    currentServerState.telegramConfig = db.telegramConfig as any;
    if (currentServerState.wallet) db.wallet = currentServerState.wallet;
    if (currentServerState.customNovels) db.customNovels = currentServerState.customNovels;
    if (currentServerState.customMovies) db.customMovies = currentServerState.customMovies;
    if (currentServerState.customPlaylists) db.customPlaylists = currentServerState.customPlaylists;
    if (currentServerState.deletedMovieIds) db.deletedMovieIds = currentServerState.deletedMovieIds;
    if (currentServerState.deletedPlaylistIds) db.deletedPlaylistIds = currentServerState.deletedPlaylistIds;
    if (currentServerState.deletedNovelIds) db.deletedNovelIds = currentServerState.deletedNovelIds;
    if (currentServerState.deletedHabitIds) db.deletedHabitIds = currentServerState.deletedHabitIds;
    if (currentServerState.deletedTaskIds) db.deletedTaskIds = currentServerState.deletedTaskIds;
    if (currentServerState.storeProducts) db.storeProducts = currentServerState.storeProducts;
    if (currentServerState.userCognitiveProfile) (db as any).userCognitiveProfile = currentServerState.userCognitiveProfile;
    if (currentServerState.behaviorEngine) (db as any).behaviorEngine = currentServerState.behaviorEngine;
    if (currentServerState.proactiveCoach) (db as any).proactiveCoach = currentServerState.proactiveCoach;
    if (currentServerState.advancedSettings) {
      db.advancedSettings = {
        ...db.advancedSettings,
        ...currentServerState.advancedSettings,
        aiConfig: currentServerState.aiConfig,
      };
    }
    db.lastUpdated = Date.now();
    currentServerState.lastSyncTimestamp = db.lastUpdated;
    savePersistentDatabase();
    return db.lastUpdated;
  } catch (e) {
    console.warn("Failed to write server state cache:", e);
    return Date.now();
  }
}

// Initialize Google GenAI client securely on server
function getGenAI(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required but not set in environment variables");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Scientific Habit Math Engine (Lally 2010 model)
function calculateHabitStatsOnServer(habit: any, referenceToday?: string, language: string = "fa") {
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const history = habit.history || {};

  const completedDates = Object.keys(history).filter((d) => history[d]);
  let startDateStr = habit.createdAt || todayStr;
  if (completedDates.length > 0) {
    const minCompleted = completedDates.sort()[0];
    if (minCompleted < startDateStr) {
      startDateStr = minCompleted;
    }
  }

  let effectiveT = 0;
  let totalCompletedDays = 0;
  let consecutiveMisses = 0;
  let missedDaysCount = 0;
  const missedDates: string[] = [];

  const start = new Date(startDateStr);
  const end = new Date(todayStr);

  if (start <= end) {
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
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
        if (consecutiveMisses >= 2) {
          effectiveT = Math.max(0, effectiveT - 1);
        }
      }
      current.setDate(current.getDate() + 1);
    }
  } else {
    if (history[todayStr]) {
      totalCompletedDays = 1;
      effectiveT = 1;
    } else {
      missedDaysCount = 1;
      missedDates.push(todayStr);
    }
  }

  const kRate = habit.kRate || 66;
  const rawScore = 100 * (1 - Math.exp(-effectiveT / kRate));
  const automaticity = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(todayStr);
  if (!history[todayStr]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (true) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, "0");
    const d = String(checkDate.getDate()).padStart(2, "0");
    const k = `${y}-${m}-${d}`;
    if (history[k]) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  const sortedDates = Object.keys(history)
    .filter((d) => history[d])
    .sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevTime: number | null = null;
  for (const dateStr of sortedDates) {
    const time = new Date(dateStr).getTime();
    if (prevTime === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevTime = time;
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  const isDoneToday = !!history[todayStr];
  const remainingDays = Math.max(0, 66 - totalCompletedDays);

  const stage = automaticity >= 70 ? "automatic" : automaticity >= 40 ? "semi" : "forming";
  const stageLabels = {
    forming: { fa: "در حال شکل‌گیری", ar: "قيد التشكل", en: "Forming" },
    semi: { fa: "نیمه‌خودکار", ar: "شبه تلقائي", en: "Semi-Automatic" },
    automatic: { fa: "کاملاً خودکار شده", ar: "تلقائي بالكامل", en: "Fully Automatic" },
  };
  const stageLabel = (stageLabels[stage] as any)[language] || stageLabels[stage].fa;

  return {
    name: habit.name,
    category: habit.category,
    automaticity,
    stage,
    stageLabel,
    currentStreak,
    longestStreak,
    totalCompletedDays,
    isDoneToday,
    remainingDays,
    missedDaysCount,
    missedDates,
  };
}

function getHabitsSummaryFromState(referenceToday?: string, customHabits?: any[]) {
  const lang = currentServerState.language || "fa";
  const habits = Array.isArray(customHabits)
    ? customHabits
    : (Array.isArray(currentServerState.habits)
        ? currentServerState.habits
        : []);

  return habits.map((h) => ({
    ...calculateHabitStatsOnServer(h, referenceToday, lang),
    id: h.id,
    originalHabit: h,
  }));
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    habitsCount: currentServerState.habits.length,
    isBotListening: botPollingActive,
  });
});

// Endpoint: Sync client state with server (Backward compatible + Persistent DB integrated)
app.post("/api/telegram/sync-state", (req, res) => {
  try {
    const { habits, tasks, language, telegramConfig, aiConfig, wallet, customNovels, advancedSettings, forceWipe } = req.body;
    
    const syncRes = syncFullClientPayload({
      habits,
      tasks,
      language,
      telegramConfig,
      aiConfig,
      wallet,
      customNovels,
      advancedSettings,
      forceWipe,
    });

    const db = syncRes.database;
    currentServerState.habits = db.habits;
    currentServerState.tasks = db.tasks || [];
    currentServerState.language = db.language;
    currentServerState.themeMode = db.theme;
    currentServerState.wallet = db.wallet;
    currentServerState.customNovels = db.customNovels;
    currentServerState.storeProducts = db.storeProducts;
    currentServerState.advancedSettings = db.advancedSettings;
    const diskSavedTg = getSavedTelegramConfigFromDisk();
    const safeBotToken = (db.telegramConfig?.botToken || currentServerState.telegramConfig?.botToken || diskSavedTg.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : "")).trim();
    const safeChatId = (db.telegramConfig?.chatId || currentServerState.telegramConfig?.chatId || diskSavedTg.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : "")).trim();

    currentServerState.telegramConfig = {
      ...diskSavedTg,
      ...(currentServerState.telegramConfig || {}),
      ...(db.telegramConfig || {}),
      botToken: safeBotToken,
      chatId: safeChatId,
    };
    currentServerState.aiConfig = (db.advancedSettings as any)?.aiConfig || currentServerState.aiConfig;
    currentServerState.lastSyncTimestamp = db.lastUpdated;

    if (safeBotToken && safeBotToken !== currentServerState.telegramConfig?.botToken) {
      restartBotPolling();
    } else if (safeBotToken && !botPollingActive) {
      startBotPolling();
    }

    res.json({
      success: true,
      habitsCount: currentServerState.habits.length,
      tasksCount: (currentServerState.tasks || []).length,
      isListening: botPollingActive,
      aiConfig: currentServerState.aiConfig,
      wasWipePrevented: syncRes.wasWipePrevented,
      message: syncRes.message,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Get server state (habits, tasks, config, sync timestamp)
app.get("/api/telegram/get-state", (req, res) => {
  const db = getPersistentDatabase();
  const diskSavedTg = getSavedTelegramConfigFromDisk();
  const habits = db.habits || [];
  const tasks = db.tasks || currentServerState.tasks || [];
  const language = db.language || currentServerState.language || "fa";
  
  const mergedTg = {
    ...diskSavedTg,
    ...(db.telegramConfig || {}),
    ...(currentServerState.telegramConfig || {}),
    botToken: (currentServerState.telegramConfig?.botToken || db.telegramConfig?.botToken || diskSavedTg.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : "")).trim(),
    chatId: (currentServerState.telegramConfig?.chatId || db.telegramConfig?.chatId || diskSavedTg.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : "")).trim(),
  };

  const aiConfig = (db.advancedSettings as any)?.aiConfig || currentServerState.aiConfig || {
    analyticsAI: { keys: [], autoFallback: true },
    translationAI: { keys: [], autoFallback: true },
  };
  const lastSyncTimestamp = db.lastUpdated || currentServerState.lastSyncTimestamp || 0;

  res.json({
    success: true,
    habits,
    tasks,
    language,
    telegramConfig: mergedTg,
    aiConfig,
    wallet: db.wallet,
    customNovels: db.customNovels,
    storeProducts: db.storeProducts,
    advancedSettings: db.advancedSettings,
    lastSyncTimestamp,
    state: {
      habits,
      tasks,
      language,
      telegramConfig: mergedTg,
      aiConfig,
      wallet: db.wallet,
      customNovels: db.customNovels,
      storeProducts: db.storeProducts,
      advancedSettings: db.advancedSettings,
      lastSyncTimestamp,
    },
  });
});

// Endpoint: Explicitly and safely save Telegram Bot configuration immediately to disk
app.post("/api/telegram/save-config", (req, res) => {
  try {
    const incomingTg = req.body.telegramConfig || req.body;
    if (!incomingTg || typeof incomingTg !== "object") {
      return res.status(400).json({ success: false, error: "Invalid config object" });
    }

    const isExplicitClear = req.body.forceClear === true || req.body.forceWipe === true;
    const db = getPersistentDatabase();
    const diskSavedTg = getSavedTelegramConfigFromDisk();
    const existingTg = {
      ...diskSavedTg,
      ...(db.telegramConfig || {}),
      ...(currentServerState.telegramConfig || {}),
    };

    const incomingBotToken = incomingTg.botToken !== undefined ? String(incomingTg.botToken).trim().replace(/^bot/i, "") : undefined;
    const incomingChatId = incomingTg.chatId !== undefined ? String(incomingTg.chatId).trim() : undefined;
    const incomingBackupToken = incomingTg.backupBotToken !== undefined ? String(incomingTg.backupBotToken).trim().replace(/^bot/i, "") : undefined;
    const incomingBackupChatId = incomingTg.backupChatId !== undefined ? String(incomingTg.backupChatId).trim() : undefined;

    let finalBotToken = (existingTg.botToken || diskSavedTg.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, "");
    if (incomingBotToken !== undefined) {
      if (incomingBotToken !== '' || isExplicitClear) {
        finalBotToken = incomingBotToken;
      }
    }

    let finalChatId = (existingTg.chatId || diskSavedTg.chatId || process.env.TELEGRAM_CHAT_ID || '').trim();
    if (incomingChatId !== undefined) {
      if (incomingChatId !== '' || isExplicitClear) {
        finalChatId = incomingChatId;
      }
    }

    let finalBackupBotToken = (existingTg.backupBotToken || diskSavedTg.backupBotToken || '').trim().replace(/^bot/i, "");
    if (incomingBackupToken !== undefined) {
      if (incomingBackupToken !== '' || isExplicitClear) {
        finalBackupBotToken = incomingBackupToken;
      }
    }

    let finalBackupChatId = (existingTg.backupChatId || diskSavedTg.backupChatId || '').trim();
    if (incomingBackupChatId !== undefined) {
      if (incomingBackupChatId !== '' || isExplicitClear) {
        finalBackupChatId = incomingBackupChatId;
      }
    }

    const updatedTg = {
      ...existingTg,
      ...incomingTg,
      botToken: finalBotToken,
      chatId: finalChatId,
      backupBotToken: finalBackupBotToken,
      backupChatId: finalBackupChatId,
    };

    db.telegramConfig = updatedTg;
    currentServerState.telegramConfig = updatedTg;
    db.lastUpdated = Date.now();
    currentServerState.lastSyncTimestamp = db.lastUpdated;

    saveTelegramConfigToDedicatedDisk(updatedTg, isExplicitClear);
    savePersistentDatabase({ force: true });
    saveServerStateToDisk();

    if (finalBotToken && (!botPollingActive || finalBotToken !== currentServerState.telegramConfig?.botToken)) {
      restartBotPolling();
    }

    return res.json({
      success: true,
      message: "تنظیمات ربات تلگرام با موفقیت در دیسک سرور ثبت و فعال شد.",
      telegramConfig: updatedTg,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Persistent Storage & Store Management Endpoints
// ----------------------------------------------------

// Endpoint: Get full persistent database state
app.get("/api/storage/full-state", (req, res) => {
  try {
    const db = getPersistentDatabase();
    res.json({
      success: true,
      database: db,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Sync entire client database to disk
app.post("/api/storage/sync-all", (req, res) => {
  try {
    const syncRes = syncFullClientPayload(req.body);
    const db = syncRes.database;
    
    // Keep in-memory server state updated
    currentServerState.habits = db.habits;
    currentServerState.tasks = db.tasks;
    currentServerState.language = db.language;
    currentServerState.themeMode = db.theme;
    currentServerState.wallet = db.wallet;
    currentServerState.customNovels = db.customNovels;
    currentServerState.customMovies = db.customMovies;
    currentServerState.customPlaylists = db.customPlaylists;
    currentServerState.deletedMovieIds = db.deletedMovieIds;
    currentServerState.deletedPlaylistIds = db.deletedPlaylistIds;
    currentServerState.deletedNovelIds = db.deletedNovelIds;
    currentServerState.deletedHabitIds = db.deletedHabitIds;
    currentServerState.deletedTaskIds = db.deletedTaskIds;
    currentServerState.storeProducts = db.storeProducts;
    currentServerState.advancedSettings = db.advancedSettings;
    
    const prevToken = currentServerState.telegramConfig?.botToken;
    const safeBotToken = (db.telegramConfig?.botToken || currentServerState.telegramConfig?.botToken || (process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim().replace(/^bot/i, "") : "")).trim();
    const safeChatId = (db.telegramConfig?.chatId || currentServerState.telegramConfig?.chatId || (process.env.TELEGRAM_CHAT_ID ? process.env.TELEGRAM_CHAT_ID.trim() : "")).trim();

    currentServerState.telegramConfig = {
      ...(currentServerState.telegramConfig || {}),
      ...(db.telegramConfig || {}),
      botToken: safeBotToken,
      chatId: safeChatId,
    };
    currentServerState.aiConfig = (db.advancedSettings as any)?.aiConfig || currentServerState.aiConfig;
    currentServerState.lastSyncTimestamp = db.lastUpdated;

    if (safeBotToken) {
      if (!botPollingActive) {
        startBotPolling();
      } else if (prevToken && safeBotToken !== prevToken) {
        restartBotPolling();
      }
    }

    res.json({
      success: true,
      wasWipePrevented: syncRes.wasWipePrevented,
      message: syncRes.message,
      database: db,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Force write database & take backup snapshot
app.post("/api/storage/force-save", (req, res) => {
  try {
    saveServerStateToDisk();
    flushAllDataToDiskNow();
    const backupName = createLocalBackupSnapshot('manual_force');
    res.json({
      success: true,
      message: "پایگاه داده با موفقیت و قطعیت کامل روی دیسک ذخیره و اسنپ‌شات پشتیبان ایجاد شد.",
      backupFile: backupName,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Manually create a timestamped snapshot backup on server disk
app.post("/api/storage/create-snapshot", (req, res) => {
  try {
    saveServerStateToDisk();
    flushAllDataToDiskNow();
    const tag = req.body?.tag || 'manual';
    const filename = createLocalBackupSnapshot(tag);
    res.json({
      success: true,
      message: `اسنپ‌شات جدید با موفقیت روی دیسک سرور ثبت شد (${filename}).`,
      filename,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Restore a local snapshot from server disk
app.post("/api/storage/restore-snapshot", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: "نام فایل اسنپ‌شات ارسال نشده است." });
    }
    const result = restoreFromLocalSnapshot(filename);
    if (!result.success) {
      return res.status(400).json(result);
    }
    // Refresh in-memory server state
    const db = getPersistentDatabase();
    currentServerState.habits = db.habits || [];
    currentServerState.tasks = db.tasks || [];
    currentServerState.wallet = db.wallet;
    currentServerState.customNovels = db.customNovels || [];
    currentServerState.customMovies = db.customMovies || [];
    currentServerState.customPlaylists = db.customPlaylists || [];
    currentServerState.storeProducts = db.storeProducts || [];
    currentServerState.advancedSettings = db.advancedSettings;
    currentServerState.telegramConfig = {
      botToken: db.telegramConfig?.botToken || "",
      chatId: db.telegramConfig?.chatId || "",
      autoDailyReport: db.telegramConfig?.autoDailyReport ?? true,
      reportTime: db.telegramConfig?.reportTime || "21:00",
      ...(db.telegramConfig || {}),
    };

    res.json({
      success: true,
      message: result.message,
      database: db,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a snapshot file from server disk
app.delete("/api/storage/snapshots/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const result = deleteLocalSnapshot(filename);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({
      success: true,
      message: `اسنپ‌شات «${filename}» با موفقیت حذف گردید.`,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Get disk storage stats
app.get("/api/storage/stats", (req, res) => {
  try {
    const stats = getStorageDiskStatistics();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Export full database JSON backup as attachment (Tier 2 Complete Backup)
app.get("/api/storage/export-full-backup", (req, res) => {
  try {
    const db = getPersistentDatabase();
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const filename = `habit_tracker_full_complete_backup_${dateStr}.json`;

    let totalCheckIns = 0;
    const uniqueDates = new Set<string>();
    (db.habits || []).forEach((h: any) => {
      if (h.history && typeof h.history === "object") {
        Object.entries(h.history).forEach(([d, v]) => {
          if (v) {
            totalCheckIns++;
            uniqueDates.add(d);
          }
        });
      }
    });

    const exportPayload = {
      version: "2.0.0",
      appName: "Lally Scientific Habit Tracker",
      exportDate: new Date().toISOString(),
      backupType: "complete",
      metadata: {
        version: "2.0.0",
        appName: "Lally Scientific Habit Tracker",
        exportDate: new Date().toISOString(),
        timestamp,
        schemaVersion: 2,
        backupType: "complete",
        containsShopFiles: true,
      },
      habits: db.habits || [],
      settings: {
        language: db.language || "fa",
        theme: db.theme || "light",
        telegramConfig: db.telegramConfig || {
          botToken: "",
          chatId: "",
          autoDailyReport: true,
          reportTime: "21:00",
        },
        rewardWallet: db.wallet,
        customNovels: db.customNovels,
        advancedSettings: db.advancedSettings,
      },
      wallet: db.wallet,
      rewardWallet: db.wallet,
      customNovels: db.customNovels || [],
      storeProducts: db.storeProducts || [],
      advancedSettings: db.advancedSettings,
      telegramConfig: db.telegramConfig,
      stats: {
        totalHabits: (db.habits || []).length,
        totalCheckIns,
        totalActiveDays: uniqueDates.size,
        customNovelsCount: (db.customNovels || []).length,
        storeProductsCount: (db.storeProducts || []).length,
      },
    };
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Import and restore full database
app.post("/api/storage/import-full-backup", (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== 'object') {
      return res.status(400).json({ success: false, error: 'فرمت فایل پشتیبان نامعتبر است.' });
    }

    // Create safety backup of current state before overwrite
    createLocalBackupSnapshot('pre_import_safety');

    const db = getPersistentDatabase();
    if (Array.isArray(importedData.habits)) db.habits = importedData.habits;
    
    const incomingWallet = importedData.wallet || importedData.rewardWallet || importedData.settings?.rewardWallet;
    if (incomingWallet && typeof incomingWallet === 'object') db.wallet = incomingWallet;
    
    const incomingNovels = importedData.customNovels || importedData.settings?.customNovels;
    if (Array.isArray(incomingNovels)) db.customNovels = incomingNovels;
    
    if (Array.isArray(importedData.storeProducts)) db.storeProducts = importedData.storeProducts;
    
    const incomingAdv = importedData.advancedSettings || importedData.settings?.advancedSettings;
    if (incomingAdv) db.advancedSettings = incomingAdv;
    
    const incomingTg = importedData.telegramConfig || importedData.settings?.telegramConfig;
    if (incomingTg) db.telegramConfig = incomingTg;
    
    const incomingLang = importedData.language || importedData.settings?.language;
    if (incomingLang) db.language = incomingLang;
    
    const incomingTheme = importedData.theme || importedData.settings?.theme;
    if (incomingTheme) db.theme = incomingTheme;

    savePersistentDatabase();

    // Update in-memory state
    currentServerState.habits = db.habits;
    currentServerState.language = db.language;
    currentServerState.themeMode = db.theme;
    currentServerState.wallet = db.wallet;
    currentServerState.customNovels = db.customNovels;
    currentServerState.storeProducts = db.storeProducts;
    currentServerState.advancedSettings = db.advancedSettings;
    currentServerState.telegramConfig = {
      botToken: db.telegramConfig?.botToken || "",
      chatId: db.telegramConfig?.chatId || "",
      ...(db.telegramConfig || {}),
    };
    currentServerState.aiConfig = (db.advancedSettings as any)?.aiConfig || currentServerState.aiConfig;
    currentServerState.lastSyncTimestamp = Date.now();

    res.json({
      success: true,
      message: 'پایگاه داده با موفقیت از فایل پشتیبان بازگردانی شد.',
      database: db,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Store & Media Files Endpoints (For Videos & Novels)
// ----------------------------------------------------

// Endpoint: Stream local video/media files with range requests for fast seeking
app.get("/api/store/media/stream", (req, res) => {
  try {
    const fileParam = req.query.file as string;
    if (!fileParam) {
      return res.status(400).send("File query parameter is required.");
    }

    const cleanRelPath = fileParam.replace(/^(\.\.[\/\\])+/, "");
    const { baseStoreDir, moviesDir, legacyVideosDir, novelsDir, mediaDir } = getStoreDirectories();
    const candidateDirs = [baseStoreDir, moviesDir, legacyVideosDir, novelsDir, mediaDir, path.join(process.cwd(), "data", "store")].filter(Boolean);

    let safeFilePath = "";
    for (const dir of candidateDirs) {
      const candidate = path.resolve(dir, cleanRelPath);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        safeFilePath = candidate;
        break;
      }
    }

    if (!safeFilePath) {
      // Direct absolute or relative fallback check
      const fallback = path.resolve(baseStoreDir, cleanRelPath);
      if (fs.existsSync(fallback) && fs.statSync(fallback).isFile()) {
        safeFilePath = fallback;
      }
    }

    if (!safeFilePath || !fs.existsSync(safeFilePath)) {
      return res.status(404).send("Media file not found on disk.");
    }

    const stat = fs.statSync(safeFilePath);
    if (!stat.isFile()) {
      return res.status(400).send("Path is not a regular file.");
    }

    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(safeFilePath).toLowerCase();

    // Determine content type
    let contentType = "application/octet-stream";
    if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".mkv") contentType = "video/x-matroska";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".avi") contentType = "video/x-msvideo";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(safeFilePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": contentType,
      };
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      };
      res.writeHead(200, head);
      fs.createReadStream(safeFilePath).pipe(res);
    }
  } catch (err: any) {
    console.error("Media stream error:", err);
    res.status(500).send("Media stream error: " + err.message);
  }
});

// Endpoint: Change Store Storage Path in Advanced Settings
app.post("/api/store/set-storage-path", (req, res) => {
  try {
    const { storagePath } = req.body;
    const result = setStoreStoragePath(storagePath || "");
    const db = getPersistentDatabase();

    // Keep server cache in sync with persistent DB
    currentServerState.advancedSettings = db.advancedSettings;
    currentServerState.customMovies = db.customMovies;
    currentServerState.customNovels = db.customNovels;
    currentServerState.customPlaylists = db.customPlaylists;

    res.json({
      success: true,
      message: result.message,
      storePath: result.storePath,
      moviesPath: result.moviesPath,
      novelsPath: result.novelsPath,
      scanResult: result.scanResult,
      customMovies: db.customMovies || [],
      customNovels: db.customNovels || [],
      customPlaylists: db.customPlaylists || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Scan all store directories (movies, anime, series, novels)
app.post("/api/store/scan-all", (req, res) => {
  try {
    const scanResult = scanAllStoreDirectories();
    const db = getPersistentDatabase();
    res.json({
      success: true,
      message: `اسکن کامل فروشگاه انجام شد (${scanResult.moviesScan.scannedMovies.length} ویدیو/سریال و ${scanResult.novelsScan.scannedNovels.length} رمان شناسایی شد).`,
      scanResult,
      customMovies: db.customMovies || [],
      customNovels: db.customNovels || [],
      customPlaylists: db.customPlaylists || [],
      pendingMetadataItems: scanResult.pendingMetadataItems,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Get pending metadata items (items added manually to disk that require initial info setup)
app.get("/api/store/pending-metadata", (req, res) => {
  try {
    const db = getPersistentDatabase();
    const pendingMovies = (db.customMovies || []).filter((m: any) => m.needsMetadataSetup);
    const pendingNovels = (db.customNovels || []).filter((n: any) => n.needsMetadataSetup);
    res.json({
      success: true,
      pendingMovies,
      pendingNovels,
      totalPending: pendingMovies.length + pendingNovels.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Configure Discovered Media (One-time metadata & unit price setup)
app.post("/api/store/configure-discovered", (req, res) => {
  try {
    const payload = req.body;
    const result = configureDiscoveredMedia(payload);
    if (!result.success) {
      return res.status(400).json(result);
    }
    const db = getPersistentDatabase();
    res.json({
      ...result,
      customMovies: db.customMovies || [],
      customNovels: db.customNovels || [],
      customPlaylists: db.customPlaylists || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Trigger offline/direct folder scan of movies/videos
app.post("/api/store/scan-videos-folder", (req, res) => {
  try {
    const scanResult = scanStoreVideosDirectory();
    const db = getPersistentDatabase();
    res.json({
      success: true,
      message: `اسکن دیسک انجام شد: ${scanResult.totalVideosFound} قسمت/ویدیو شناسایی گردید (${scanResult.newItemsCount} اثر جدید، ${scanResult.updatedItemsCount} اثر به‌روزرسانی شد).`,
      scanResult,
      customMovies: db.customMovies || [],
      customPlaylists: db.customPlaylists || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Trigger offline/direct folder scan of novels
app.post("/api/store/scan-novels-folder", (req, res) => {
  try {
    const scanResult = scanStoreNovelsDirectory();
    const db = getPersistentDatabase();
    res.json({
      success: true,
      message: `اسکن پوشه رمان‌ها انجام شد: ${scanResult.totalChaptersFound} فصل در قالب ${scanResult.scannedNovels.length} رمان شناسایی گردید.`,
      scanResult,
      customNovels: db.customNovels || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a novel and its disk folder
app.delete(["/api/store/novels/:id", "/api/novels/:id"], (req, res) => {
  try {
    const { id } = req.params;
    const deleteResult = deleteNovelFromPersistentStorage(id);
    const db = getPersistentDatabase();
    currentServerState.customNovels = db.customNovels || [];
    currentServerState.deletedNovelIds = db.deletedNovelIds || [];
    try {
      cancelServerJob(id);
      deleteServerJob(id);
    } catch {}
    res.json({
      success: true,
      message: `رمان «${deleteResult.novelTitle || id}» با موفقیت حذف و ${deleteResult.formattedFreedBytes} حافظه آزاد شد.`,
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      customNovels: db.customNovels || [],
      deletedNovelIds: db.deletedNovelIds || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Upload ZIP archive with folders/seasons/episodes to store/videos
app.post("/api/store/upload-zip", (req, res) => {
  try {
    const { zipBase64, baseFolderName } = req.body;
    if (!zipBase64) {
      return res.status(400).json({ success: false, error: "داده فایل زیپ ارسال نشده است." });
    }

    // Clean base64 header if present
    const base64Data = zipBase64.replace(/^data:.*?;base64,/, "");
    const zipBuffer = Buffer.from(base64Data, "base64");

    extractZipToVideosStore(zipBuffer, baseFolderName)
      .then((result) => {
        const db = getPersistentDatabase();
        res.json({
          success: true,
          message: `فایل زیپ با موفقیت استخراج شد (${result.extractedFilesCount} فایل، حجم ${result.extractedSizeFormatted}). تمام پلی‌لیست‌ها، فصل‌ها و قسمت‌ها بر اساس شماره قسمت مرتب شدند.`,
          extractedFilesCount: result.extractedFilesCount,
          extractedSizeFormatted: result.extractedSizeFormatted,
          customMovies: db.customMovies || [],
          customPlaylists: db.customPlaylists || [],
          stats: getStorageDiskStatistics(),
        });
      })
      .catch((err) => {
        res.status(500).json({ success: false, error: err.message });
      });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Save single custom novel and immediately export to dedicated folder in store/novels/
app.post(["/api/store/novels/save", "/api/novels/save"], (req, res) => {
  try {
    const novel = req.body;
    if (!novel || !novel.title) {
      return res.status(400).json({ success: false, error: "عنوان رمان الزامی است." });
    }

    const db = getPersistentDatabase();
    if (!db.customNovels) db.customNovels = [];

    const sanitized = sanitizeServerNovel(novel, db.language || "fa");
    const existingIdx = db.customNovels.findIndex((n: any) => n.id === sanitized.id);
    if (existingIdx >= 0) {
      const existing = db.customNovels[existingIdx];
      db.customNovels[existingIdx] = {
        ...existing,
        ...sanitized,
        hasBeenEditedOnce: true,
        editAllowedOnce: false,
        isPriceLocked: true,
      };
    } else {
      db.customNovels.unshift({
        ...sanitized,
        isPriceLocked: true,
        hasBeenEditedOnce: sanitized.isDirectDiskImport ? true : undefined,
        editAllowedOnce: false,
      });
    }

    // Immediately export novel to its dedicated folder in store/novels/
    const targetNovel = db.customNovels[existingIdx >= 0 ? existingIdx : 0];
    const exportResult = exportNovelToDiskFolder(targetNovel);

    savePersistentDatabase();
    currentServerState.customNovels = db.customNovels;

    const stats = getStorageDiskStatistics();

    res.json({
      success: true,
      message: `رمان «${sanitized.title}» با موفقیت ذخیره شد و پوشه اختصاصی آن در مسیر (${exportResult.folderPath}) ایجاد گردید.`,
      novel: targetNovel,
      folderPath: exportResult.folderPath,
      diskFolderName: exportResult.folderName,
      customNovels: db.customNovels,
      stats,
    });
  } catch (err: any) {
    console.error("Error saving novel:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Synchronize all store items (novels and movies) to dedicated disk folders
app.post("/api/store/sync-to-disk", (req, res) => {
  try {
    const result = syncAllStoreItemsToDisk();
    const db = getPersistentDatabase();
    res.json({
      success: true,
      message: `تمام رمان‌ها (${result.novelsCount}) و فیلم‌ها (${result.moviesCount}) با موفقیت در پوشه‌های اختصاصی خود در مسیر دیسک فروشگاه (${result.storePath}) ایجاد و همگام شدند.`,
      result,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Save single or multi-part custom movie/series
app.post("/api/movies/save", (req, res) => {
  try {
    const movie = req.body;
    if (!movie || !movie.title) {
      return res.status(400).json({ success: false, error: "عنوان اثر الزامی است." });
    }

    const db = getPersistentDatabase();
    if (!db.customMovies) db.customMovies = [];

    const existingIdx = db.customMovies.findIndex((m: any) => m.id === movie.id);
    if (existingIdx >= 0) {
      const existing = db.customMovies[existingIdx];
      db.customMovies[existingIdx] = {
        ...existing,
        ...movie,
        // Mark as edited once if it was a direct disk import
        hasBeenEditedOnce: true,
        editAllowedOnce: false,
        isPriceLocked: true,
      };
    } else {
      db.customMovies.unshift({
        ...movie,
        isPriceLocked: true,
        hasBeenEditedOnce: movie.isDirectDiskImport ? true : undefined,
        editAllowedOnce: false,
      });
    }

    // Immediately export movie to its dedicated folder in store/movies/
    const targetMovie = db.customMovies[existingIdx >= 0 ? existingIdx : 0];
    const exportResult = exportMovieToDiskFolder(targetMovie);

    savePersistentDatabase();
    currentServerState.customMovies = db.customMovies;

    res.json({
      success: true,
      message: `اثر «${movie.title}» با موفقیت در دیتابیس و پوشه اختصاصی دیسک (${exportResult.folderPath}) ذخیره شد.`,
      movie: targetMovie,
      folderPath: exportResult.folderPath,
      diskFolderName: exportResult.folderName,
      customMovies: db.customMovies,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Get store catalog
app.get("/api/store/catalog", (req, res) => {
  try {
    const db = getPersistentDatabase();
    const stats = getStorageDiskStatistics();
    res.json({
      success: true,
      products: db.storeProducts || [],
      customNovels: db.customNovels || [],
      directories: {
        storePath: stats.storePath,
        videosPath: stats.videosPath,
        novelsPath: stats.novelsPath,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Add or update a store product
app.post("/api/store/products", (req, res) => {
  try {
    const product: StoreProduct = req.body;
    if (!product || !product.title) {
      return res.status(400).json({ success: false, error: 'عنوان محصول الزامی است.' });
    }

    const db = getPersistentDatabase();
    if (!db.storeProducts) db.storeProducts = [];

    const existingIdx = db.storeProducts.findIndex((p) => p.id === product.id);
    if (existingIdx >= 0) {
      db.storeProducts[existingIdx] = {
        ...db.storeProducts[existingIdx],
        ...product,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newProduct: StoreProduct = {
        ...product,
        id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: product.type || 'novel',
        price: typeof product.price === 'number' ? product.price : 10,
        createdAt: product.createdAt || new Date().toISOString(),
      };
      db.storeProducts.push(newProduct);
    }

    savePersistentDatabase();
    currentServerState.storeProducts = db.storeProducts;

    res.json({
      success: true,
      products: db.storeProducts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a store product with physical file cleanup
app.delete("/api/store/products/:id", (req, res) => {
  try {
    const { id } = req.params;
    const deleteResult = deleteMovieFromPersistentStorage(id);
    const db = getPersistentDatabase();
    currentServerState.storeProducts = db.storeProducts || [];

    res.json({
      success: true,
      message: 'محصول با موفقیت از فروشگاه و سرور حذف و فضای ذخیره‌سازی آزاد شد.',
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      deletedFiles: deleteResult.deletedFiles,
      products: db.storeProducts || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a movie or series and all associated video files from server disk
app.delete(["/api/store/movies/:id", "/api/movies/:id"], (req, res) => {
  try {
    const { id } = req.params;
    const deleteResult = deleteMovieFromPersistentStorage(id);
    const db = getPersistentDatabase();
    currentServerState.storeProducts = db.storeProducts || [];

    res.json({
      success: true,
      message: `فیلم/سریال «${deleteResult.movieTitle || id}» و کلیه فایل‌های ویدیویی وابسته با موفقیت از روی سرور حذف و ${deleteResult.formattedFreedBytes} حافظه آزاد گردید.`,
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      deletedFiles: deleteResult.deletedFiles,
      remainingMoviesCount: deleteResult.remainingMoviesCount,
      customMovies: db.customMovies || [],
      customPlaylists: db.customPlaylists || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a specific season from a movie/series
app.delete("/api/movies/:movieId/seasons/:seasonId", (req, res) => {
  try {
    const { movieId, seasonId } = req.params;
    const deleteResult = deleteSeasonFromPersistentStorage(movieId, seasonId);
    const db = getPersistentDatabase();

    res.json({
      success: deleteResult.success,
      message: `فصل «${deleteResult.seasonTitle || seasonId}» و تمام ویدیوهای آن از روی سرور حذف و ${deleteResult.formattedFreedBytes} حافظه آزاد شد.`,
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      movie: deleteResult.movie,
      customMovies: db.customMovies || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a specific episode from a movie/series
app.delete("/api/movies/:movieId/episodes/:episodeId", (req, res) => {
  try {
    const { movieId, episodeId } = req.params;
    const deleteResult = deleteEpisodeFromPersistentStorage(movieId, episodeId);
    const db = getPersistentDatabase();

    res.json({
      success: deleteResult.success,
      message: `قسمت «${deleteResult.episodeTitle || episodeId}» و فایل ویدیویی آن با موفقیت حذف و ${deleteResult.formattedFreedBytes} حافظه آزاد شد.`,
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      movie: deleteResult.movie,
      customMovies: db.customMovies || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Delete a playlist
app.delete("/api/playlists/:id", (req, res) => {
  try {
    const { id } = req.params;
    const deleteMovies = req.query.deleteMovies === 'true';
    const deleteResult = deletePlaylistFromPersistentStorage(id, deleteMovies);
    const db = getPersistentDatabase();

    res.json({
      success: true,
      message: `پلی‌لیست «${deleteResult.deletedPlaylistTitle || id}» با موفقیت حذف شد.`,
      freedBytes: deleteResult.freedBytes,
      formattedFreedBytes: deleteResult.formattedFreedBytes,
      customPlaylists: db.customPlaylists || [],
      customMovies: db.customMovies || [],
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Cleanup orphan files on server storage
app.post("/api/storage/cleanup-orphan-files", (req, res) => {
  try {
    const cleanupResult = cleanupOrphanStoreFiles();
    res.json({
      success: true,
      message: `پاک‌سازی فایل‌های موقت با موفقیت انجام شد و ${cleanupResult.formattedFreedBytes} فضا آزاد گردید.`,
      freedBytes: cleanupResult.freedBytes,
      formattedFreedBytes: cleanupResult.formattedFreedBytes,
      cleanedFiles: cleanupResult.cleanedFiles,
      stats: getStorageDiskStatistics(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Check Bot Status
app.get("/api/telegram/bot-status", (req, res) => {
  res.json({
    isListening: botPollingActive,
    lastPolledAt: lastPolledTimestamp ? new Date(lastPolledTimestamp).toISOString() : null,
    habitsCount: currentServerState.habits.length,
    hasToken: Boolean(currentServerState.telegramConfig?.botToken),
    hasChatId: Boolean(currentServerState.telegramConfig?.chatId),
    lastSyncTimestamp: currentServerState.lastSyncTimestamp || 0,
  });
});

// Endpoint: Register Bot Menu Commands in Telegram
app.post("/api/telegram/set-commands", async (req, res) => {
  try {
    const botToken = req.body.botToken || currentServerState.telegramConfig?.botToken;
    const language = req.body.language || currentServerState.language || "fa";

    if (!botToken) {
      return res.status(400).json({
        success: false,
        error: language === "fa" ? "توکن ربات تلگرام تنظیم نشده است." : "Telegram Bot Token is required.",
      });
    }

    const cleanToken = String(botToken).trim().replace(/^bot/i, "");

    const commandSets: Record<string, Array<{ command: string; description: string }>> = {
      fa: [
        { command: "habits", description: "📋 لیست و آمار تفکیکی عادات" },
        { command: "tasks", description: "📝 مدیریت تسک‌ها و چک‌لیست روزانه" },
        { command: "today", description: "📅 وضعیت کامل امروز (عادات + تسک‌ها)" },
        { command: "report", description: "📊 گزارش تحلیلی هوش مصنوعی و مدل لالی" },
        { command: "ask", description: "💬 پرسش اختصاصی از مربی هوش مصنوعی" },
        { command: "wallet", description: "💰 کیف پول، سکه‌ها و امتیاز تجربه" },
        { command: "shop", description: "🛍️ فروشگاه و اقلام قفل‌گشایی شده" },
        { command: "achievements", description: "🏆 تالار دستاوردها و رتبه مغز" },
        { command: "chart", description: "📊 نمودار تصویری و اینفوگرافیک پیشرفت" },
        { command: "add", description: "➕ افزودن عادت جدید (/add نام_عادت)" },
        { command: "addtask", description: "➕ افزودن تسک جدید (/addtask عنوان)" },
        { command: "delete", description: "🗑️ حذف تعاملی عادت یا تسک" },
        { command: "stats", description: "📈 خلاصه آمار و فرمول علمی لالی" },
        { command: "backup", description: "💾 دانلود فایل پشتیبان کامل (JSON)" },
        { command: "tips", description: "💡 نکات علمی و اصول نوروساینس عادات" },
        { command: "menu", description: "🏠 پیشخوان و منوی اصلی" },
        { command: "help", description: "❓ راهنما و منوی دکمه‌های سریع" },
      ],
      ar: [
        { command: "habits", description: "📋 قائمة وإحصائيات العادات" },
        { command: "tasks", description: "📝 إدارة المهام وقوائم الإنجاز" },
        { command: "today", description: "📅 قائمة اليوم (العادات والمهام)" },
        { command: "report", description: "📊 تقرير الذكاء الاصطناعي الشامل" },
        { command: "ask", description: "💬 استشارة مدرب الذكاء الاصطناعي" },
        { command: "wallet", description: "💰 المحفظة والمكافآت والعملات" },
        { command: "shop", description: "🛍️ المتجر والمحتويات المحررة" },
        { command: "achievements", description: "🏆 الإنجازات ومستوى الدماغ" },
        { command: "chart", description: "📊 مخطط بياني مرئي للتلقائية" },
        { command: "add", description: "➕ إضافة عادة جديدة (/add اسم_العادة)" },
        { command: "addtask", description: "➕ إضافة مهمة جديدة (/addtask عنوان)" },
        { command: "delete", description: "🗑️ حذف تفاعلي لأي عادة أو مهمة" },
        { command: "stats", description: "📈 ملخص الإحصائيات والمعادلات العلمية" },
        { command: "backup", description: "💾 تحميل نسخة احتياطية (JSON)" },
        { command: "tips", description: "💡 نصائح علمية في علم الأعصاب" },
        { command: "menu", description: "🏠 القائمة الرئيسية" },
        { command: "help", description: "❓ المساعدة وقائمة الأزرار" },
      ],
      en: [
        { command: "habits", description: "📋 Habit list & individual neural stats" },
        { command: "tasks", description: "📝 Tasks & Daily Todo Management" },
        { command: "today", description: "📅 Today's unified checklist (Habits & Tasks)" },
        { command: "report", description: "📊 Get comprehensive AI habit analysis report" },
        { command: "ask", description: "💬 Ask AI Neuroscience Coach a question" },
        { command: "wallet", description: "💰 Reward Wallet, Coins & Neural XP" },
        { command: "shop", description: "🛍️ Store & Unlocked Rewards" },
        { command: "achievements", description: "🏆 Brain mastery levels & badges" },
        { command: "chart", description: "📊 Visual habit automaticity chart" },
        { command: "add", description: "➕ Add a new habit (/add habit_name)" },
        { command: "addtask", description: "➕ Add a new task (/addtask task_title)" },
        { command: "delete", description: "🗑️ Delete a habit or task interactively" },
        { command: "stats", description: "📈 Habit stats, automaticity % & formulas" },
        { command: "backup", description: "💾 Download complete backup JSON" },
        { command: "tips", description: "💡 Neuroscience habit formation principles" },
        { command: "menu", description: "🏠 Main dashboard hub" },
        { command: "help", description: "❓ Bot guide and interactive menu" },
      ],
    };

    const commands = commandSets[language] || commandSets.fa;

    const setRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });

    const setData = (await setRes.json()) as { ok: boolean; description?: string };
    if (!setRes.ok || !setData.ok) {
      const friendlyErr = getTelegramFriendlyErrorMessage(setData.description || "خطا در ثبت منوی تلگرام", language);
      return res.status(400).json({
        success: false,
        error: friendlyErr,
      });
    }

    return res.json({
      success: true,
      message: language === "fa" ? "منوی دستورات با موفقیت در تلگرام ثبت گردید." : "Commands registered successfully in Telegram.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Test Telegram Bot connection
app.post("/api/telegram/test", async (req, res) => {
  try {
    const { botToken, chatId, language = "fa" } = req.body;

    const cleanToken = String(botToken || currentServerState.telegramConfig?.botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || currentServerState.telegramConfig?.chatId || "").trim();

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({
        success: false,
        error: language === "fa" ? "توکن ربات تلگرام و شناسه چت (Chat ID) الزامی هستند." : "Bot Token and Chat ID are required.",
      });
    }

    // Auto-update server state config
    if (!currentServerState.telegramConfig) currentServerState.telegramConfig = {} as any;
    currentServerState.telegramConfig.botToken = cleanToken;
    currentServerState.telegramConfig.chatId = cleanChatId;
    saveServerStateToDisk();

    if (!botPollingActive) {
      startBotPolling();
    }

    const testMessages: Record<string, string> = {
      fa: `🔔 <b>آزمایش اتصال ردیاب علمی عادات و وظایف</b>\n\n✅ <b>اتصال ربات تلگرام شما با موفقیت برقرار شد!</b>\nگزارش‌های روزانه تحلیل عادت‌ها، یادآورهای هوشمند و پیشنهادات هوش مصنوعی به این چت ارسال خواهند شد.\n\n💡 <i>اکنون می‌توانید با ارسال دستور <code>/report</code>، <code>/today</code> یا زدن دکمه‌های زیر، گزارش و آمار عادات خود را مستقیماً دریافت کنید.</i>`,
      ar: `🔔 <b>اختبار اتصال متتبع العادات العلمي</b>\n\n✅ <b>تم الاتصال ببوت تيليجرام بنجاح!</b>\nسيتم إرسال التقارير اليومية لتحليل العادات واقتراحات الذكاء الاصطناعي إلى هذه المحادثة.\n\n💡 <i>يمكنك الآن إرسال الأمر <code>/report</code> أو <code>/today</code> لطلب التقارير مباشرة.</i>`,
      en: `🔔 <b>Scientific Habit Tracker Connection Test</b>\n\n✅ <b>Your Telegram Bot connection is successfully verified!</b>\nDaily AI habit reports, smart reminders, and neuroscience coaching are ready.\n\n💡 <i>You can now send <code>/report</code>, <code>/today</code> or tap buttons to request on-demand reports directly!</i>`,
    };

    const text = testMessages[language] || testMessages.fa;
    const replyMarkup = getStandardKeyboards(language);

    const sent = await sendTelegramMessage(cleanToken, cleanChatId, text, replyMarkup.inlineMarkup);

    if (!sent.ok) {
      const friendlyErr = getTelegramFriendlyErrorMessage(sent.description || "خطا در برقراری ارتباط با سرور تلگرام", language);
      return res.status(400).json({
        success: false,
        error: friendlyErr,
      });
    }

    return res.json({ success: true, message: language === "fa" ? "پیام تست با موفقیت ارسال شد" : "Test message sent successfully" });
  } catch (err: any) {
    console.error("Telegram test error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطای غیرمنتظره در ارسال پیام تست تلگرام",
    });
  }
});

// Endpoint: Test and Dispatch Instant Real-Time Push Notifications (Task/Habit completion)
app.post("/api/telegram/notify-event", async (req, res) => {
  try {
    const { botToken, chatId, eventType, title, details, language = "fa", isTest = false } = req.body;
    const cleanToken = String(botToken || currentServerState.telegramConfig?.botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || currentServerState.telegramConfig?.chatId || "").trim();
    const isFa = language === "fa";
    const isAr = language === "ar";

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({
        success: false,
        error: isFa ? "توکن ربات و شناسه چت تنظیم نشده است." : "Bot Token and Chat ID are required.",
      });
    }

    let text = "";
    if (eventType === "pomodoro_completed") {
      const mins = Number(req.body.durationMinutes) || 25;
      const coins = Number(req.body.earnedCoins) || 5;
      text = isFa
        ? `🍅 <b>پایان موفقیت‌آمیز جلسه پومودورو و تمرکز عمیق!</b>\n\n🎯 <b>موضوع:</b> « ${title || "جلسه تمرکز عمیق"} »\n⏱️ <b>مدت زمان:</b> ${mins} دقیقه کار پیوسته و بدون حواس‌پرتی\n💰 <b>پاداش:</b> +${coins} سکه 🪙 و +20 XP به کیف پول شما واریز شد!\n🧘‍♂️ <i>پیشنهاد هوش مصنوعی: ۵ دقیقه استراحت چشمی، نوشیدن آب و تنفس آرام داشته باشید.</i>`
        : isAr
        ? `🍅 <b>اكتملت جلسة بومودورو والتركيز العميق بنجاح!</b>\n\n🎯 <b>الموضوع:</b> « ${title || "جلسة تركيز"} »\n⏱️ <b>المدة:</b> ${mins} دقيقة\n💰 <b>المكافأة:</b> +${coins} عملات 🪙 و +20 XP!\n🧘‍♂️ <i>خذ استراحة لمدة 5 دقائق الآن.</i>`
        : `🍅 <b>Pomodoro & Deep Work Session Completed!</b>\n\n🎯 <b>Topic:</b> « ${title || "Deep Focus Session"} »\n⏱️ <b>Duration:</b> ${mins} minutes\n💰 <b>Reward:</b> +${coins} Coins 🪙 & +20 XP added to Wallet!\n🧘‍♂️ <i>Take a 5-minute break now.</i>`;
    } else if (eventType === "task_completed" || (isTest && eventType !== "habit_completed")) {
      text = isFa
        ? `🎉 <b>تکمیل تسک در وب‌اپلیکیشن!</b>\n\n📌 <b>تسک:</b> « ${title || "مطالعه و برنامه‌ریزی روزانه"} »\n💰 <b>پاداش:</b> +10 سکه و +5 XP به کیف پول اضافه شد!\n⚡ <i>همگام‌سازی لحظه‌ای با وب‌سایت فعال است.</i>`
        : isAr
        ? `🎉 <b>تم إنجاز المهمة في تطبيق الويب!</b>\n\n📌 <b>المهمة:</b> « ${title || "مهمة نموذجية"} »\n💰 <b>المكافأة:</b> +10 عملات و +5 XP!\n⚡ <i>المزامنة اللحظية مفعلة.</i>`
        : `🎉 <b>Task Completed in Web App!</b>\n\n📌 <b>Task:</b> « ${title || "Sample Task"} »\n💰 <b>Reward:</b> +10 Coins & +5 XP added to Wallet!\n⚡ <i>Instant real-time sync active.</i>`;
    } else if (eventType === "habit_completed") {
      text = isFa
        ? `🔥 <b>ثبت درخشان عادت روزانه در وب‌اپلیکیشن!</b>\n\n📌 <b>عادت:</b> « ${title || "ورزش و تمرین بدنی"} »\n🧠 خودکارشدگی عصبی و زنجیره ارتقا یافت.\n💰 <b>پاداش:</b> +15 سکه و +8 XP!`
        : `🔥 <b>Habit Logged in Web App!</b>\n\n📌 <b>Habit:</b> « ${title || "Daily Habit"} »\n🧠 Neural automaticity increased!\n💰 <b>Reward:</b> +15 Coins!`;
    } else {
      text = `⚡ <b>${title || "اعلان فوری وب‌اپلیکیشن"}</b>\n\n${details || "تست ارتباط و اعلان لحظه‌ای با تلگرام با موفقیت برقرار است."}`;
    }

    const keyboards = getStandardKeyboards(language);
    const sent = await sendTelegramMessage(cleanToken, cleanChatId, text, keyboards.inlineMarkup);

    if (sent.ok) {
      return res.json({ success: true, message: isFa ? "اعلان فوری با موفقیت به تلگرام ارسال شد." : "Instant notification sent successfully." });
    } else {
      const friendlyErr = getTelegramFriendlyErrorMessage(sent.description || "خطا در ارسال اعلان به تلگرام", language);
      return res.status(400).json({ success: false, error: friendlyErr });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Chat pending conversation states (e.g. waiting for user to type habit name)
const chatPendingActions: Record<
  string | number,
  { action: string; payload?: any; timestamp: number; pendingHabits?: any[]; date?: string }
> = {};

// Active Telegram Pomodoro Sessions
interface TelegramPomodoroSession {
  chatId: string | number;
  botToken: string;
  durationMinutes: number;
  startTime: number;
  endTime: number;
  targetName?: string;
  timeoutId?: NodeJS.Timeout;
}
const activeTelegramPomodoroSessions = new Map<string, TelegramPomodoroSession>();

function getPomodoroProgressBar(percent: number): string {
  const totalBars = 10;
  const filled = Math.min(totalBars, Math.max(0, Math.round((percent / 100) * totalBars)));
  const empty = totalBars - filled;
  return "🟩".repeat(filled) + "⬜".repeat(empty);
}

// Helper to register official Telegram bot commands
async function registerTelegramBotCommands(cleanToken: string, language: string = "fa") {
  try {
    const isFa = language === "fa";
    const isAr = language === "ar";
    const commands = [
      {
        command: "today",
        description: isFa ? "چک‌لیست امروز (عادات و تسک‌ها)" : isAr ? "قائمة اليوم الشاملة" : "Today's Checklist",
      },
      {
        command: "reminder",
        description: isFa ? "یادآوری کارهای مانده و پیشرفت امروز" : isAr ? "تذكير المهام المتبقية" : "Pending Tasks Reminder",
      },
      {
        command: "check",
        description: isFa ? "ثبت انجام عادت یا تسک" : isAr ? "تسجيل إنجاز عادة أو مهمة" : "Check-in Habit/Task",
      },
      {
        command: "done",
        description: isFa ? "تکمیل سریع عادت یا تسک" : isAr ? "إنجاز عادة أو مهمة" : "Complete Habit/Task",
      },
      {
        command: "uncheck",
        description: isFa ? "لغو ثبت انجام عادت یا تسک" : isAr ? "إلغاء إنجاز عادة أو مهمة" : "Undo Habit/Task",
      },
      {
        command: "sync",
        description: isFa ? "وضعیت همگام‌سازی زنده با وب" : isAr ? "مزامنة فورية مع التطبيق" : "Live Real-Time Sync",
      },
      {
        command: "habits",
        description: isFa ? "لیست و آمار عادات" : isAr ? "قائمة وإحصائيات العادات" : "Habits & Stats",
      },
      {
        command: "tasks",
        description: isFa ? "مدیریت تسک‌ها و کارها" : isAr ? "إدارة المهام والواجبات" : "Tasks & Todos",
      },
      {
        command: "chat",
        description: isFa ? "گفتگو و گپ با مربی هوش مصنوعی" : isAr ? "محادثة مع مدرب الذكاء الاصطناعي" : "Chat with AI Coach",
      },
      {
        command: "report",
        description: isFa ? "گزارش تحلیلی هوش مصنوعی" : isAr ? "تقرير الذكاء الاصطناعي" : "AI Coaching Report",
      },
      {
        command: "ask",
        description: isFa ? "پرسش از مربی هوش مصنوعی" : isAr ? "استشارة مدرب الذكاء الاصطناعي" : "Ask AI Coach",
      },
      {
        command: "wallet",
        description: isFa ? "کیف پول و سکه‌های پاداش" : isAr ? "المحفظة والمكافآت" : "Reward Wallet & Coins",
      },
      {
        command: "shop",
        description: isFa ? "فروشگاه و قفل‌گشایی‌ها" : isAr ? "المتجر والمحتويات" : "Store & Unlocks",
      },
      {
        command: "achievements",
        description: isFa ? "دستاوردها و سطح مغز" : isAr ? "الإنجازات والمستوى" : "Achievements & Brain Lv",
      },
      {
        command: "chart",
        description: isFa ? "نمودار تصویری خودکارشدگی" : isAr ? "مخطط التلقائية" : "Visual Progress Chart",
      },
      {
        command: "add",
        description: isFa ? "افزودن عادت جدید" : isAr ? "إضافة عادة" : "Add Habit",
      },
      {
        command: "addtask",
        description: isFa ? "افزودن تسک جدید" : isAr ? "إضافة مهمة" : "Add Task",
      },
      {
        command: "delete",
        description: isFa ? "حذف عادت یا تسک" : isAr ? "حذف عادة أو مهمة" : "Delete Habit/Task",
      },
      {
        command: "pomodoro",
        description: isFa ? "تایمر پومودورو و تمرکز عمیق" : isAr ? "مؤقت بومودورو والتركيز" : "Pomodoro Focus Timer",
      },
      {
        command: "pomo_status",
        description: isFa ? "وضعیت تایمر تمرکز فعال" : isAr ? "حالة مؤقت التركيز" : "Active Focus Status",
      },
      {
        command: "pomo_stop",
        description: isFa ? "توقف تایمر پومودورو" : isAr ? "إيقاف مؤقت بومودورو" : "Stop Pomodoro Timer",
      },
      {
        command: "pomo_coach",
        description: isFa ? "مشاوره تمرکز عمیق هوش مصنوعی" : isAr ? "نصائح التركيز العميق" : "AI Deep Work Coach",
      },
      {
        command: "proactive",
        description: isFa ? "مربی پیش‌دستانه ۲۴/۷ و تنظیمات آن" : isAr ? "المدرب الاستباقي وإعداداته" : "24/7 Proactive Coach",
      },
      {
        command: "stats",
        description: isFa ? "خلاصه کل و فرمول لالی" : isAr ? "ملخص عام والمعادلات" : "Overview Stats",
      },
      {
        command: "backup",
        description: isFa ? "دانلود نسخه پشتیبان" : isAr ? "نسخة احتياطية" : "Download Backup",
      },
      {
        command: "tips",
        description: isFa ? "نکات نوروساینس عادات" : isAr ? "نصائح علمية" : "Science Tips",
      },
      {
        command: "menu",
        description: isFa ? "پیشخوان و منوی اصلی" : isAr ? "القائمة الرئيسية" : "Main Menu Hub",
      },
      {
        command: "help",
        description: isFa ? "راهنما و دستورات ربات" : isAr ? "المساعدة" : "Help & Guide",
      },
    ];

    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
  } catch (err) {
    console.error("Failed to register Telegram bot commands:", err);
  }
}

// Keyboards helper
function getStandardKeyboards(language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const addHabitBtn = isFa ? "➕ افزودن عادت" : isAr ? "➕ إضافة عادة" : "➕ Add Habit";
  const addTaskBtn = isFa ? "➕ افزودن تسک" : isAr ? "➕ إضافة مهمة" : "➕ Add Task";
  const habitsBtn = isFa ? "📋 لیست و آمار عادات" : isAr ? "📋 قائمة العادات" : "📋 Habits & Stats";
  const tasksBtn = isFa ? "📝 مدیریت تسک‌ها" : isAr ? "📝 قائمة المهام" : "📝 Tasks & Todos";
  const todayBtn = isFa ? "📅 وضعیت امروز" : isAr ? "📅 قائمة اليوم" : "📅 Today's Unified View";
  const chartBtn = isFa ? "📊 نمودار تصویری" : isAr ? "📊 مخطط بياني" : "📊 Visual Chart";
  const reportBtn = isFa ? "🧠 تحلیل هوش مصنوعی" : isAr ? "🧠 تقرير الذكاء الاصطناعي" : "🧠 AI Analysis";
  const chatCoachBtn = isFa ? "💬 گفتگو با مربی AI" : isAr ? "💬 محادثة مع المدرب" : "💬 Chat with AI Coach";
  const walletBtn = isFa ? "💰 کیف پول و جوایز" : isAr ? "💰 المحفظة والمكافآت" : "💰 Wallet & Coins";
  const shopBtn = isFa ? "🛍️ فروشگاه و قفل‌گشایی" : isAr ? "🛍️ المتجر والمحتويات" : "🛍️ Shop & Rewards";
  const achievementsBtn = isFa ? "🏆 دستاوردها و رتبه" : isAr ? "🏆 الإنجازات والأوسمة" : "🏆 Achievements";
  const statsBtn = isFa ? "📈 خلاصه کل" : isAr ? "📈 ملخص عام" : "📈 Overview Stats";
  const pomodoroBtn = isFa ? "🍅 تایمر پومودورو" : isAr ? "🍅 مؤقت بومودورو" : "🍅 Pomodoro Timer";
  const backupBtn = isFa ? "💾 فایل پشتیبان" : isAr ? "💾 نسخة احتياطية" : "💾 Backup JSON";
  const tipsBtn = isFa ? "💡 نکات نوروساینس" : isAr ? "💡 نصائح علمية" : "💡 Science Tips";
  const menuBtn = isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Hub";
  const syncBtn = isFa ? "🔄 همگام‌سازی زنده" : isAr ? "🔄 مزامنة فورية" : "🔄 Live Sync";
  const helpBtn = isFa ? "❓ راهنما" : isAr ? "❓ المساعدة" : "❓ Help";

  // Transparent Inline Keyboard (attached directly under messages)
  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: addHabitBtn, callback_data: "cmd_add_prompt" },
        { text: addTaskBtn, callback_data: "cmd_addtask_prompt" },
      ],
      [
        { text: habitsBtn, callback_data: "cmd_habits" },
        { text: tasksBtn, callback_data: "cmd_tasks" },
      ],
      [
        { text: todayBtn, callback_data: "cmd_today" },
        { text: chartBtn, callback_data: "cmd_chart" },
      ],
      [
        { text: reportBtn, callback_data: "cmd_report" },
        { text: chatCoachBtn, callback_data: "cmd_coach_chat" },
      ],
      [
        { text: pomodoroBtn, callback_data: "cmd_pomodoro" },
        { text: walletBtn, callback_data: "cmd_wallet" },
      ],
      [
        { text: shopBtn, callback_data: "cmd_shop" },
        { text: achievementsBtn, callback_data: "cmd_achievements" },
      ],
      [
        { text: statsBtn, callback_data: "cmd_stats" },
        { text: backupBtn, callback_data: "cmd_backup" },
      ],
      [
        { text: tipsBtn, callback_data: "cmd_tips" },
        { text: menuBtn, callback_data: "cmd_menu" },
      ],
      [
        { text: syncBtn, callback_data: "cmd_sync" },
        { text: helpBtn, callback_data: "cmd_help" },
      ],
    ],
  };

  return { inlineMarkup };
}

// Generate keyboard for reminders and strict warnings allowing instant check-off
function getHabitsReminderKeyboard(habits: any[], language: string = "fa", referenceToday?: string) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of habits) {
    const isDone = !!h.history?.[todayStr];
    const btnText = isDone
      ? `✅ ${h.name} (${isFa ? "انجام شد" : isAr ? "تم الإنجاز" : "Completed"})`
      : `⏳ ${h.name} (${isFa ? "ثبت فوری" : isAr ? "تسجيل الآن" : "Check Off"})`;
    
    rows.push([{ text: btnText, callback_data: `toggle_${h.id}` }]);
  }

  rows.push([
    {
      text: isFa ? "📅 وضعیت امروز" : isAr ? "📅 عادات اليوم" : "📅 Today View",
      callback_data: "cmd_today",
    },
    {
      text: isFa ? "📊 گزارش هوش مصنوعی" : isAr ? "📊 تقرير الذكاء الاصطناعي" : "📊 AI Report",
      callback_data: "cmd_report",
    },
  ]);

  return { inline_keyboard: rows };
}

// Generate keyboard for list of habits to view individual stats
function getHabitsListKeyboard(habits: any[], language: string = "fa", referenceToday?: string) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of habits) {
    const stats = calculateHabitStatsOnServer(h, todayStr, language);
    const isDone = !!h.history?.[todayStr];
    const statusIco = isDone ? "✅" : "⏳";
    const autoIco = stats.automaticity >= 70 ? "🟢" : stats.automaticity >= 40 ? "🟡" : "🔵";
    const btnText = `${statusIco} ${h.name} (${autoIco} ${stats.automaticity}٪ | 🔥 ${stats.currentStreak}د)`;
    
    rows.push([{ text: btnText, callback_data: `stat_${h.id}` }]);
  }

  // Action buttons
  rows.push([
    {
      text: isFa ? "➕ افزودن عادت جدید" : isAr ? "➕ إضافة عادة جديدة" : "➕ Add New Habit",
      callback_data: "cmd_add_prompt",
    },
    {
      text: isFa ? "🗑️ حذف یک عادت" : isAr ? "🗑️ حذف عادة" : "🗑️ Delete a Habit",
      callback_data: "cmd_delete_prompt",
    },
  ]);

  rows.push([
    {
      text: isFa ? "📅 وضعیت امروز" : isAr ? "📅 عادات اليوم" : "📅 Today View",
      callback_data: "cmd_today",
    },
    {
      text: isFa ? "📊 گزارش هوش مصنوعی" : isAr ? "📊 تقرير الذكاء الاصطناعي" : "📊 AI Report",
      callback_data: "cmd_report",
    },
  ]);

  rows.push([
    {
      text: isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
      callback_data: "cmd_menu",
    },
  ]);

  return { inline_keyboard: rows };
}

// Generate keyboard for deleting a habit
function getDeleteHabitKeyboard(habits: any[], language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of habits) {
    rows.push([{ text: `🗑️ ${h.name}`, callback_data: `del_ask_${h.id}` }]);
  }

  rows.push([
    {
      text: isFa ? "❌ انصراف و بازگشت" : isAr ? "❌ إلغاء والعودة" : "❌ Cancel & Return",
      callback_data: "del_cancel",
    },
  ]);

  return { inline_keyboard: rows };
}

// Generate keyboard for individual habit view
function getIndividualHabitKeyboard(habit: any, isDoneToday: boolean, language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const toggleText = isDoneToday
    ? isFa
      ? "↩️ لغو ثبت انجام امروز"
      : isAr
      ? "↩️ إلغاء تسجيل اليوم"
      : "↩️ Undo Today's Check-in"
    : isFa
    ? "✅ ثبت انجام برای امروز"
    : isAr
    ? "✅ تسجيل إنجاز اليوم"
    : "✅ Mark as Completed Today";

  const matrixBtnText = isFa
    ? "📊 ماتریس تصویری و روزهای مانده تا ۶۶ روز"
    : isAr
    ? "📊 مصفوفة العادة والأيام المتبقية لـ 66"
    : "📊 Habit Matrix & Days Left to 66";

  return {
    inline_keyboard: [
      [{ text: toggleText, callback_data: `toggle_${habit.id}` }],
      [{ text: matrixBtnText, callback_data: `chart_habit_${habit.id}` }],
      [
        {
          text: isFa ? "🗑️ حذف این عادت" : isAr ? "🗑️ حذف هذه العادة" : "🗑️ Delete This Habit",
          callback_data: `del_ask_${habit.id}`,
        },
        {
          text: isFa ? "📋 لیست همه عادات" : isAr ? "📋 قائمة العادات" : "📋 All Habits",
          callback_data: "cmd_habits",
        },
      ],
      [
        {
          text: isFa ? "📊 گزارش تحلیلی هوش مصنوعی" : isAr ? "📊 تقرير الذكاء الاصطناعي" : "📊 AI Report",
          callback_data: "cmd_report",
        },
        {
          text: isFa ? "🔙 منوی اصلی" : isAr ? "🔙 القائمة الرئيسية" : "🔙 Main Menu",
          callback_data: "cmd_menu",
        },
      ],
    ],
  };
}

// Format rich HTML for an individual habit's neuro-statistics
function formatIndividualHabitStatsHTML(habit: any, language: string = "fa", referenceToday?: string) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const stats = calculateHabitStatsOnServer(habit, todayStr, language);

  const statusBadge = stats.isDoneToday
    ? isFa
      ? "✅ <b>امروز تکمیل شده است</b>"
      : isAr
      ? "✅ <b>تم الإنجاز اليوم</b>"
      : "✅ <b>Completed Today</b>"
    : isFa
    ? "⏳ <b>هنوز برای امروز ثبت نشده</b>"
    : isAr
    ? "⏳ <b>لم يتم الإنجاز اليوم بعد</b>"
    : "⏳ <b>Pending Today</b>";

  let neuroTip = "";
  if (stats.automaticity >= 70) {
    neuroTip = isFa
      ? "🧠 <i>عالی است! مسیرهای نورونی در عقده‌های قاعده‌ای (Basal Ganglia) به شدت پایدار شده‌اند و اجرای این رفتار نیاز به حداقل انرژی ارادی (Prefrontal Cortex) دارد.</i>"
      : isAr
      ? "🧠 <i>رائع! المسارات العصبية في العقد القاعدية باتت مستقرة للغاية وتتطلب أدنى جهد إرادي.</i>"
      : "🧠 <i>Excellent! Neural circuits in the basal ganglia are well-stabilized, requiring minimal conscious effort.</i>";
  } else if (stats.automaticity >= 40) {
    neuroTip = isFa
      ? "⚡ <i>در فاز تثبیت عصبی هستید؛ تداوم روزانه در این مقطع برای جلوگیری از افت سیناپسی و رسیدن به آستانه خودکاری ۶۶ روزه حیاتی است.</i>"
      : isAr
      ? "⚡ <i>أنت في مرحلة الترسيخ العصبي؛ الاستمرارية اليومية هنا ضرورية لمنع التراجع والوصول إلى عتبة الـ 66 يوماً.</i>"
      : "⚡ <i>You are in the neural consolidation phase; daily repetition is key to reach automaticity.</i>";
  } else {
    neuroTip = isFa
      ? "🌱 <i>فاز شکل‌گیری اولیه؛ برای کاهش مقاومت ذهنی، قانون ۲ دقیقه و تکنیک قلاب‌کردن رفتار (Habit Stacking) را اعمال فرمایید.</i>"
      : isAr
      ? "🌱 <i>مرحلة البداية والتكوين؛ استخدم قاعدة الدقيقتين وربط العادة بروتين ثابت لتقليل الاحتكاك الذهني.</i>"
      : "🌱 <i>Early formation stage; apply the 2-minute rule and habit stacking to reduce friction.</i>";
  }

  let html = `🎯 <b>${isFa ? "شناسنامه و آمار علمی عادت:" : isAr ? "إحصائيات العادة:" : "Habit Neural Analytics:"}</b>\n`;
  html += `📌 <b>« ${habit.name} »</b>\n`;
  html += `🏷️ دسته: <code>${habit.category || (isFa ? "عمومی" : "General")}</code> | 📅 تاریخ شروع: <code>${habit.createdAt || "---"}</code>\n\n`;

  html += `🔬 <b>${isFa ? "شاخص‌های عصب‌شناختی مدل لالی (۲۰۱۰):" : isAr ? "مؤشرات نموذج لالي (2010):" : "Lally (2010) Metrics:"}</b>\n`;
  html += `• <b>${isFa ? "میزان خودکارشدگی عصبی" : isAr ? "نسبة التلقائية" : "Automaticity Score"}:</b> <b>${stats.automaticity}٪</b>\n`;
  html += `• <b>${isFa ? "مرحله تکامل رفتاری" : isAr ? "المرحلة العصبية" : "Neural Stage"}:</b> <b>${stats.stageLabel}</b>\n`;
  html += `• <b>${isFa ? "زنجیره فعال کنونی" : isAr ? "السلسلة الحالية" : "Current Streak"}:</b> 🔥 <b>${stats.currentStreak}</b> ${isFa ? "روز متوالی" : isAr ? "أيام" : "days"}\n`;
  html += `• <b>${isFa ? "بیشترین رکورد زنجیره" : isAr ? "أطول سلسلة" : "Best Streak Record"}:</b> ⚡ <b>${stats.longestStreak}</b> ${isFa ? "روز" : "days"}\n`;
  html += `• <b>${isFa ? "مجموع دفعات تکمیل‌شده" : isAr ? "إجمالي التكرارات" : "Total Completed Days"}:</b> 📅 <b>${stats.totalCompletedDays}</b> ${isFa ? "روز" : "days"}\n`;
  html += `• <b>${isFa ? "فاصله تا هدف ۶۶ روزه لالی" : isAr ? "المتبقي لـ 66 يوماً" : "Days to 66d Target"}:</b> ⏳ <b>${stats.remainingDays}</b> ${isFa ? "روز تمرین" : "days"}\n\n`;

  html += `📋 <b>${isFa ? "وضعیت امروز:" : isAr ? "حالة اليوم:" : "Today's Status:"}</b> ${statusBadge}\n\n`;
  html += `${neuroTip}\n`;

  return html;
}

// ----------------------------------------------------
// TASK MANAGEMENT & REWARD WALLET HELPERS (NEW VERSION)
// ----------------------------------------------------

function getTasksSummaryFromState() {
  refreshServerStateFromDb();
  const tasks = currentServerState.tasks || [];
  const todayStr = new Date().toISOString().split("T")[0];
  return tasks.map((t) => ({
    ...t,
    isDueToday: !t.dueDate || t.dueDate === todayStr,
    isOverdue: !!(t.dueDate && t.dueDate < todayStr && !t.completed),
  }));
}

function createTaskOnServer(title: string, priority: "high" | "medium" | "low" = "medium", dueDate?: string) {
  refreshServerStateFromDb();
  const todayStr = new Date().toISOString().split("T")[0];
  const newTask: any = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    priority,
    dueDate: dueDate || todayStr,
    completed: false,
    createdAt: todayStr,
    rewardCoins: 5,
    rewardXp: 2,
    subtasks: [],
  };

  if (!currentServerState.tasks) currentServerState.tasks = [];
  currentServerState.tasks.push(newTask);
  if (Array.isArray(currentServerState.deletedTaskIds)) {
    currentServerState.deletedTaskIds = currentServerState.deletedTaskIds.filter((id) => id !== newTask.id);
  }
  currentServerState.lastSyncTimestamp = Date.now();
  saveServerStateToDisk();

  return newTask;
}

function toggleTaskOnServer(taskId: string) {
  refreshServerStateFromDb();
  const tasks = currentServerState.tasks || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const coinsAwarded = task.rewardCoins || 5;
  const xpAwarded = task.rewardXp || 2;

  if (task.isRecurring) {
    if (!Array.isArray(task.claimedRewardDates)) {
      task.claimedRewardDates = [];
    }
    const alreadyClaimedForToday =
      task.lastCompletedDate === todayStr ||
      task.claimedRewardDates.includes(todayStr);

    if (!alreadyClaimedForToday) {
      task.claimedRewardDates.push(todayStr);
      task.lastCompletedDate = todayStr;
      task.recurringStreak = (task.recurringStreak || 0) + 1;
      awardWalletCoins(coinsAwarded, `تکمیل تسک تکرارشونده: ${task.title}`);
    }

    currentServerState.lastSyncTimestamp = Date.now();
    saveServerStateToDisk();

    return {
      task,
      isCompleted: true,
      coinsAwarded: alreadyClaimedForToday ? 0 : coinsAwarded,
      xpAwarded: alreadyClaimedForToday ? 0 : xpAwarded,
    };
  }

  // One-time task
  const willBeCompleted = !task.completed;
  const alreadyClaimed = Boolean(
    task.rewardClaimed ||
    (Array.isArray(task.claimedRewardDates) && task.claimedRewardDates.length > 0)
  );

  if (willBeCompleted) {
    task.completed = true;
    task.completedAt = Date.now();
    task.lastCompletedDate = todayStr;
    if (!alreadyClaimed) {
      task.rewardClaimed = true;
      if (!Array.isArray(task.claimedRewardDates)) task.claimedRewardDates = [];
      task.claimedRewardDates.push(todayStr);
      awardWalletCoins(coinsAwarded, `تکمیل تسک: ${task.title}`);
    }
  } else {
    task.completed = false;
    task.completedAt = undefined;
    // Strictly preserve task.rewardClaimed = true so re-checking does not grant duplicate coins/XP!
    // Do NOT deduct wallet coins.
  }

  currentServerState.lastSyncTimestamp = Date.now();
  saveServerStateToDisk();

  return {
    task,
    isCompleted: task.completed,
    coinsAwarded: (!alreadyClaimed && willBeCompleted) ? coinsAwarded : 0,
    xpAwarded: (!alreadyClaimed && willBeCompleted) ? xpAwarded : 0,
  };
}

// Helper: Find habit or task by name, query, or 1-based index
function findHabitOrTaskByQuery(query: string, referenceToday?: string) {
  refreshServerStateFromDb();
  const q = query.trim().toLowerCase();
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const habits = currentServerState.habits || [];
  const tasks = currentServerState.tasks || [];

  if (!q) return null;

  // 1. Check if query is a number (1-based index)
  const num = parseInt(q, 10);
  if (!isNaN(num) && num > 0) {
    if (num <= habits.length) {
      return { type: "habit" as const, item: habits[num - 1] };
    }
    const taskIdx = num - habits.length - 1;
    if (taskIdx >= 0 && taskIdx < tasks.length) {
      return { type: "task" as const, item: tasks[taskIdx] };
    }
  }

  // 2. Exact match on habit
  const exactHabit = habits.find((h) => h.name.toLowerCase() === q);
  if (exactHabit) return { type: "habit" as const, item: exactHabit };

  // 3. Exact match on task
  const exactTask = tasks.find((t) => t.title.toLowerCase() === q);
  if (exactTask) return { type: "task" as const, item: exactTask };

  // 4. Substring match on habit
  const subHabit = habits.find((h) => h.name.toLowerCase().includes(q) || q.includes(h.name.toLowerCase()));
  if (subHabit) return { type: "habit" as const, item: subHabit };

  // 5. Substring match on task
  const subTask = tasks.find((t) => t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()));
  if (subTask) return { type: "task" as const, item: subTask };

  return null;
}

function deleteTaskOnServer(taskId: string) {
  refreshServerStateFromDb();
  if (!currentServerState.deletedTaskIds) currentServerState.deletedTaskIds = [];
  if (!currentServerState.deletedTaskIds.includes(taskId)) {
    currentServerState.deletedTaskIds.push(taskId);
  }
  const initialCount = (currentServerState.tasks || []).length;
  const targetTask = (currentServerState.tasks || []).find((t) => t.id === taskId);
  currentServerState.tasks = (currentServerState.tasks || []).filter((t) => t.id !== taskId);

  if ((currentServerState.tasks || []).length !== initialCount) {
    currentServerState.lastSyncTimestamp = Date.now();
    saveServerStateToDisk();
    return targetTask || true;
  }
  return null;
}

function awardWalletCoins(coins: number, note?: string) {
  if (!currentServerState.wallet) {
    currentServerState.wallet = {
      coins: 100,
      totalEarned: 100,
      totalSpent: 0,
      streakMultiplier: 1.0,
      transactions: [],
    };
  }
  currentServerState.wallet.coins = (currentServerState.wallet.coins || 0) + coins;
  currentServerState.wallet.totalEarned = (currentServerState.wallet.totalEarned || 0) + coins;
  if (note) {
    currentServerState.wallet.transactions = currentServerState.wallet.transactions || [];
    currentServerState.wallet.transactions.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: coins,
      type: "earn",
      source: "habit",
      description: note,
      timestamp: Date.now(),
    });
    if (currentServerState.wallet.transactions.length > 50) {
      currentServerState.wallet.transactions = currentServerState.wallet.transactions.slice(0, 50);
    }
  }
}

function deductWalletCoins(coins: number, note?: string) {
  if (!currentServerState.wallet) return;
  currentServerState.wallet.coins = Math.max(0, (currentServerState.wallet.coins || 0) - coins);
  if (note) {
    currentServerState.wallet.transactions = currentServerState.wallet.transactions || [];
    currentServerState.wallet.transactions.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: -coins,
      type: "spend",
      source: "habit",
      description: note,
      timestamp: Date.now(),
    });
    if (currentServerState.wallet.transactions.length > 50) {
      currentServerState.wallet.transactions = currentServerState.wallet.transactions.slice(0, 50);
    }
  }
}

// Generate keyboard for tasks list
function getTasksListKeyboard(tasks: any[], language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const t of tasks) {
    const statusIco = t.completed ? "✅" : "⏳";
    const pIco = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
    const btnText = `${statusIco} ${pIco} ${t.title}`;
    rows.push([{ text: btnText, callback_data: `stat_task_${t.id}` }]);
  }

  rows.push([
    {
      text: isFa ? "➕ افزودن تسک جدید" : isAr ? "➕ إضافة مهمة جديدة" : "➕ Add New Task",
      callback_data: "cmd_addtask_prompt",
    },
    {
      text: isFa ? "🗑️ حذف یک تسک" : isAr ? "🗑️ حذف مهمة" : "🗑️ Delete a Task",
      callback_data: "cmd_deltask_prompt",
    },
  ]);

  rows.push([
    {
      text: isFa ? "📅 وضعیت امروز" : isAr ? "📅 قائمة اليوم" : "📅 Today's View",
      callback_data: "cmd_today",
    },
    {
      text: isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
      callback_data: "cmd_menu",
    },
  ]);

  return { inline_keyboard: rows };
}

// Generate keyboard for individual task
function getIndividualTaskKeyboard(task: any, language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const toggleText = task.completed
    ? isFa
      ? "↩️ لغو تکمیل تسک"
      : isAr
      ? "↩️ إلغاء الإنجاز"
      : "↩️ Undo Task Completion"
    : isFa
    ? "✅ علامت زدن به عنوان تکمیل‌شده"
    : isAr
    ? "✅ تحديد كمكتملة"
    : "✅ Mark Task as Completed";

  return {
    inline_keyboard: [
      [{ text: toggleText, callback_data: `toggle_task_${task.id}` }],
      [
        {
          text: isFa ? "🗑️ حذف این تسک" : isAr ? "🗑️ حذف هذه المهمة" : "🗑️ Delete Task",
          callback_data: `del_task_ask_${task.id}`,
        },
        {
          text: isFa ? "📝 لیست همه تسک‌ها" : isAr ? "📝 قائمة المهام" : "📝 All Tasks",
          callback_data: "cmd_tasks",
        },
      ],
      [
        {
          text: isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
          callback_data: "cmd_menu",
        },
      ],
    ],
  };
}

// Generate keyboard for deleting a task
function getDeleteTaskKeyboard(tasks: any[], language: string = "fa") {
  const isFa = language === "fa";
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const t of tasks) {
    rows.push([{ text: `🗑️ ${t.title}`, callback_data: `del_task_ask_${t.id}` }]);
  }

  rows.push([
    {
      text: isFa ? "❌ انصراف و بازگشت" : "❌ Cancel & Return",
      callback_data: "del_task_cancel",
    },
  ]);

  return { inline_keyboard: rows };
}

// Format rich HTML for task details
function formatIndividualTaskHTML(task: any, language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const priorityLabels = {
    high: isFa ? "🔴 بالا (ضروری)" : isAr ? "🔴 عالية" : "🔴 High Priority",
    medium: isFa ? "🟡 متوسط" : isAr ? "🟡 متوسطة" : "🟡 Medium Priority",
    low: isFa ? "🟢 پایین" : isAr ? "🟢 منخفضة" : "🟢 Low Priority",
  };

  const priorityText = (priorityLabels as any)[task.priority] || priorityLabels.medium;
  const statusBadge = task.completed
    ? isFa
      ? "✅ <b>تکمیل شده است</b>"
      : isAr
      ? "✅ <b>تم الإنجاز</b>"
      : "✅ <b>Completed</b>"
    : isFa
    ? "⏳ <b>در انتظار انجام</b>"
    : isAr
    ? "⏳ <b>قيد الانتظار</b>"
    : "⏳ <b>Pending</b>";

  let html = `📝 <b>${isFa ? "جزئیات و مشخصات تسک:" : isAr ? "تفاصيل المهمة:" : "Task Details:"}</b>\n`;
  html += `📌 <b>« ${task.title} »</b>\n\n`;
  html += `• <b>${isFa ? "اولویت" : isAr ? "الأولوية" : "Priority"}:</b> ${priorityText}\n`;
  html += `• <b>${isFa ? "مهلت انجام" : isAr ? "تاريخ الاستحقاق" : "Due Date"}:</b> <code>${task.dueDate || (isFa ? "نامشخص" : "None")}</code>\n`;
  html += `• <b>${isFa ? "پاداش سکه" : isAr ? "مكافأة العملات" : "Reward Coins"}:</b> 💰 <b>+${task.rewardCoins || 5} سکه</b> | ⚡ <b>+${task.rewardXp || 2} XP</b>\n`;
  html += `• <b>${isFa ? "وضعیت کنونی" : isAr ? "الحالة الحالية" : "Current Status"}:</b> ${statusBadge}\n\n`;

  if (task.description) {
    html += `💬 <b>${isFa ? "توضیحات:" : isAr ? "الوصف:" : "Description:"}</b>\n<i>${task.description}</i>\n\n`;
  }

  return html;
}

// Format tasks list HTML
function formatTasksListHTML(language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const tasks = currentServerState.tasks || [];
  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed).length;

  let html = `📝 <b>${isFa ? "مدیریت تسک‌ها و کارهای روزانه" : isAr ? "إدارة المهام والواجبات اليومية" : "Tasks & Daily Checklist"}</b>\n\n`;
  html += `📊 <b>${isFa ? "آمار کلی:" : isAr ? "الإحصائيات:" : "Summary:"}</b> ${tasks.length} ${isFa ? "تسک" : "tasks"} (✅ <b>${completed}</b> ${isFa ? "تکمیل شده" : "completed"} | ⏳ <b>${pending}</b> ${isFa ? "در انتظار" : "pending"})\n\n`;

  if (tasks.length === 0) {
    html += isFa
      ? `💡 <i>هیچ تسکی تعریف نشده است. با زدن دکمه «افزودن تسک جدید» یا دستور <code>/addtask عنوان</code> تسک جدید ایجاد کنید.</i>`
      : isAr
      ? `💡 <i>لا توجد مهام حالياً. أرسل <code>/addtask عنوان</code> لإضافة مهمة جديدة.</i>`
      : `💡 <i>No tasks found. Send <code>/addtask title</code> or tap Add Task below.</i>`;
  } else {
    html += isFa
      ? `👇 <i>جهت مشاهده جزئیات، تغییر وضعیت یا حذف، روی هر تسک کلیک کنید:</i>`
      : `👇 <i>Tap any task below to toggle completion or view details:</i>`;
  }

  return html;
}

// Combined today checklist keyboard (Habits + Tasks)
function getTodayCombinedKeyboard(habits: any[], tasks: any[], language: string = "fa", referenceToday?: string) {
  const isFa = language === "fa";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  // 1. Habit toggles
  if (habits.length > 0) {
    for (const h of habits) {
      const isDone = !!h.history?.[todayStr];
      const statusIco = isDone ? "✅" : "⏳";
      rows.push([{ text: `${statusIco} عادت: ${h.name}`, callback_data: `toggle_${h.id}` }]);
    }
  }

  // 2. Task toggles
  if (tasks.length > 0) {
    for (const t of tasks) {
      const statusIco = t.completed ? "✅" : "⏳";
      rows.push([{ text: `${statusIco} تسک: ${t.title}`, callback_data: `toggle_task_${t.id}` }]);
    }
  }

  // Action buttons
  rows.push([
    {
      text: isFa ? "➕ افزودن عادت" : "➕ Add Habit",
      callback_data: "cmd_add_prompt",
    },
    {
      text: isFa ? "➕ افزودن تسک" : "➕ Add Task",
      callback_data: "cmd_addtask_prompt",
    },
  ]);

  rows.push([
    {
      text: isFa ? "📊 گزارش هوش مصنوعی" : "📊 AI Report",
      callback_data: "cmd_report",
    },
    {
      text: isFa ? "💰 کیف پول و جوایز" : "💰 Wallet",
      callback_data: "cmd_wallet",
    },
  ]);

  rows.push([
    {
      text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
      callback_data: "cmd_menu",
    },
  ]);

  return { inline_keyboard: rows };
}

// Format concise reminder HTML (strictly compact, no unsolicited preachings/advice)
function formatConciseReminderHTML(
  habits: any[] = [],
  tasks: any[] = [],
  language: string = "fa",
  isTest: boolean = false,
  referenceToday?: string
) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];

  const habitsSummary = getHabitsSummaryFromState(todayStr, habits);
  const pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);
  const doneHabits = habitsSummary.filter((h) => h.isDoneToday);

  const doneTasks = tasks.filter((t: any) => t.completed);
  const pendingTasks = tasks.filter((t: any) => !t.completed);

  const totalItems = habitsSummary.length + tasks.length;
  const totalDone = doneHabits.length + doneTasks.length;
  const totalPending = pendingHabits.length + pendingTasks.length;

  let text = "";
  if (isTest) {
    text += isFa
      ? `🧪 <b>[تست یادآور تلگرام]</b>\n`
      : isAr
      ? `🧪 <b>[اختبار رسالة التذكير]</b>\n`
      : `🧪 <b>[Telegram Reminder Test]</b>\n`;
  }

  text += `⏰ <b>${isFa ? "یادآوری کارهای امروز" : isAr ? "تذكير بمهام اليوم" : "Today's Reminder"}</b>\n\n`;

  if (totalPending === 0 && totalItems > 0 && !isTest) {
    text += isFa
      ? `✅ <b>همه کارهای امروز انجام شده‌اند!</b>\n\n📊 شما <b>${totalDone} از ${totalItems}</b> کار امروز را انجام داده‌اید.`
      : isAr
      ? `✅ <b>تم إنجاز كافة مهام اليوم!</b>\n\n📊 لقد أنجزت <b>${totalDone} من ${totalItems}</b> مهام اليوم.`
      : `✅ <b>All of today's tasks are completed!</b>\n\n📊 You have completed <b>${totalDone} of ${totalItems}</b> items today.`;
    return text;
  }

  text += `📋 <b>${isFa ? "کارهای باقی‌مانده:" : isAr ? "المهام المتبقية:" : "Remaining tasks:"}</b>\n`;

  // List pending habits
  for (const h of pendingHabits) {
    text += `• ⏳ ${h.name}\n`;
  }

  // List pending tasks
  for (const t of pendingTasks) {
    text += `• ⏳ ${t.title}\n`;
  }

  if (totalPending === 0) {
    text += isFa ? `• <i>هیچ کاری در انتظار نیست.</i>\n` : `• <i>No pending tasks.</i>\n`;
  }

  text += isFa
    ? `\n📊 شما <b>${totalDone} از ${totalItems}</b> کار امروز را انجام داده‌اید (${totalPending} کار مانده).`
    : isAr
    ? `\n📊 لقد أنجزت <b>${totalDone} من ${totalItems}</b> مهام اليوم (تبقى ${totalPending}).`
    : `\n📊 You have completed <b>${totalDone} of ${totalItems}</b> items today (${totalPending} remaining).`;

  return text;
}

// Generate concise keyboard for reminder (only shows pending items + today view button)
function getConciseReminderKeyboard(
  habits: any[] = [],
  tasks: any[] = [],
  language: string = "fa",
  referenceToday?: string
) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  const pendingHabits = habits.filter((h) => !h.history?.[todayStr]);
  const pendingTasks = tasks.filter((t) => !t.completed);

  // Quick check-off buttons for pending habits
  for (const h of pendingHabits) {
    rows.push([{ text: `⏳ ${h.name} (${isFa ? "ثبت انجام" : isAr ? "تسجيل" : "Check Off"})`, callback_data: `toggle_${h.id}` }]);
  }

  // Quick check-off buttons for pending tasks
  for (const t of pendingTasks) {
    rows.push([{ text: `⏳ ${t.title} (${isFa ? "ثبت انجام" : isAr ? "تسجيل" : "Check Off"})`, callback_data: `toggle_task_${t.id}` }]);
  }

  rows.push([
    {
      text: isFa ? "📅 وضعیت کامل امروز" : isAr ? "📅 عادات اليوم" : "📅 Today View",
      callback_data: "cmd_today",
    },
  ]);

  return { inline_keyboard: rows };
}

// Format strict nightly warning HTML (concise few-sentence alert + list of pending items only, nothing extra)
function formatStrictWarningHTML(
  pendingHabits: any[] = [],
  pendingTasks: any[] = [],
  language: string = "fa",
  isTest: boolean = false
): string {
  const isFa = language === "fa";
  const isAr = language === "ar";
  
  let text = "";
  if (isTest) {
    text += isFa
      ? `🧪 <b>[آزمایش هشدار نهایی]</b>\n\n`
      : isAr
      ? `🧪 <b>[اختبار الإنذار النهائي]</b>\n\n`
      : `🧪 <b>[Strict Warning Test]</b>\n\n`;
  }

  const totalPending = pendingHabits.length + pendingTasks.length;

  if (totalPending === 0) {
    text += isFa
      ? `✅ <b>تمامی کارهای امروز تکمیل شده‌اند!</b>\nهیچ کار انجام‌نشده‌ای برای امروز باقی نمانده است.`
      : isAr
      ? `✅ <b>تم إنجاز كافة مهام اليوم!</b>\nلا توجد أي مهام غير مكتملة لليوم.`
      : `✅ <b>All of today's items are completed!</b>\nThere are no pending items remaining for today.`;
    return text;
  }

  // Concise several-sentence alert (هشدار چند جمله‌ای مستقیم)
  text += isFa
    ? `🚨 <b>هشدار پایان روز:</b>\n` +
      `زمان رو به پایان است و هنوز کارهای امروز شما تکمیل نشده‌اند. ` +
      `عقب انداختن برنامه‌ها تنها باعث توقف پیشرفت و سنگین‌تر شدن بار فردا خواهد شد. ` +
      `همین حالا دست به کار شوید و موارد باقی‌مانده را به اتمام برسانید!\n\n`
    : isAr
    ? `🚨 <b>تحذير نهاية اليوم:</b>\n` +
      `الوقت يوشك على الانتهاء وما زالت بعض مهامك اليومية غير مكتملة. ` +
      `تأجيل الالتزامات يكسر استمراريتك ويضاعف عبء الغد. ` +
      `ابدأ الآن فوراً وأنجز ما تبقى من مهامك!\n\n`
    : `🚨 <b>End-of-Day Warning:</b>\n` +
      `Time is running out and your commitments for today are not yet completed. ` +
      `Postponing your habits breaks your momentum and doubles tomorrow's burden. ` +
      `Take action right now and finish the remaining items!\n\n`;

  // ONLY the list of uncompleted items without anything extra
  text += `📋 <b>${isFa ? "لیست کارهای انجام‌نشده:" : isAr ? "قائمة المهام غير المنجزة:" : "Uncompleted items:"}</b>\n`;

  for (const h of pendingHabits) {
    text += `• ❌ ${h.name}\n`;
  }

  for (const t of pendingTasks) {
    text += `• ❌ ${t.title || t.name}\n`;
  }

  return text;
}

// Generate keyboard for strict warning: ONLY quick check-off buttons for pending items, no extra buttons
function getStrictWarningKeyboard(
  pendingHabits: any[] = [],
  pendingTasks: any[] = [],
  language: string = "fa"
) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const h of pendingHabits) {
    rows.push([{ 
      text: `⏳ ${h.name} (${isFa ? "ثبت انجام" : isAr ? "تسجيل" : "Check Off"})`, 
      callback_data: `toggle_${h.id}` 
    }]);
  }

  for (const t of pendingTasks) {
    rows.push([{ 
      text: `⏳ ${t.title || t.name} (${isFa ? "ثبت انجام" : isAr ? "تسجيل" : "Check Off"})`, 
      callback_data: `toggle_task_${t.id}` 
    }]);
  }

  return rows.length > 0 ? { inline_keyboard: rows } : undefined;
}

// Format combined today status HTML
function formatTodayCombinedStatusHTML(language: string = "fa", referenceToday?: string) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const habitsSummary = getHabitsSummaryFromState(todayStr);
  const tasks = currentServerState.tasks || [];

  const doneHabits = habitsSummary.filter((h) => h.isDoneToday);
  const pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);

  const doneTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);

  let html = `📅 <b>${isFa ? "چک‌لیست و وضعیت یکپارچه امروز" : isAr ? "قائمة اليوم الشاملة (العادات والمهام)" : "Today's Unified Checklist"}</b>\n`;
  html += `🗓️ <i>${todayStr}</i>\n\n`;

  // Habits section
  html += `🎯 <b>${isFa ? "وضعیت عادات علمی" : isAr ? "العادات اليومية" : "Daily Habits"} (${doneHabits.length}/${habitsSummary.length}):</b>\n`;
  if (habitsSummary.length === 0) {
    html += `  <i>${isFa ? "هیچ عادتی ثبت نشده است." : "No habits registered."}</i>\n`;
  } else {
    for (const h of habitsSummary) {
      const isDone = !!h.isDoneToday;
      const statusIco = isDone ? "✅" : "⏳";
      html += `  ${statusIco} <b>${h.name}</b> (خودکارشدگی: <b>${h.automaticity}٪</b> | 🔥 ${h.currentStreak}د)\n`;
    }
  }
  html += `\n`;

  // Tasks section
  html += `📝 <b>${isFa ? "وضعیت تسک‌ها و کارها" : isAr ? "المهام والواجبات" : "Tasks & Todos"} (${doneTasks.length}/${tasks.length}):</b>\n`;
  if (tasks.length === 0) {
    html += `  <i>${isFa ? "هیچ تسکی برای امروز ثبت نشده است." : "No tasks pending."}</i>\n`;
  } else {
    for (const t of tasks) {
      const statusIco = t.completed ? "✅" : "⏳";
      const pIco = t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢";
      html += `  ${statusIco} ${pIco} <b>${t.title}</b>\n`;
    }
  }
  html += `\n`;

  if (pendingHabits.length === 0 && pendingTasks.length === 0 && (habitsSummary.length > 0 || tasks.length > 0)) {
    html += `🎉 <b>${isFa ? "فوق‌العاده است! تمام عادات و تسک‌های امروز انجام شده‌اند 🏆" : "Awesome! All habits and tasks completed today! 🏆"}</b>\n`;
  } else {
    html += `💡 <i>${isFa ? "روی هر دکمه زیر کلیک کنید تا تیک انجام آن ثبت شود:" : "Tap buttons below to mark completed:"}</i>`;
  }

  return html;
}

// Format Wallet HTML
function formatWalletHTML(language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const wallet = currentServerState.wallet || {
    coins: 100,
    totalEarned: 100,
    totalSpent: 0,
    streakMultiplier: 1.0,
    transactions: [],
  };

  const coins = wallet.coins || 0;
  const totalEarned = wallet.totalEarned || 0;
  const totalSpent = wallet.totalSpent || 0;
  const multiplier = wallet.streakMultiplier || 1.0;
  const recentTxs = (wallet.transactions || []).slice(0, 5);

  let html = `💰 <b>${isFa ? "کیف پول پاداش، سکه‌ها و امتیازات" : isAr ? "محفظة المكافآت والعملات" : "Reward Wallet & Coins"}</b>\n\n`;
  html += `🪙 <b>${isFa ? "موجودی فعلی سکه‌ها" : isAr ? "الرصيد الحالي" : "Current Coins"}:</b> <b>${coins} 🪙</b>\n`;
  html += `📈 <b>${isFa ? "مجموع کل سکه‌های کسب‌شده" : isAr ? "إجمالي المكتسب" : "Total Earned"}:</b> <code>${totalEarned} 🪙</code>\n`;
  html += `🛍️ <b>${isFa ? "مجموع سکه‌های مصرف‌شده در فروشگاه" : isAr ? "إجمالي المنفق" : "Total Spent"}:</b> <code>${totalSpent} 🪙</code>\n`;
  html += `⚡ <b>${isFa ? "ضریب پاداش زنجیره" : isAr ? "مضاعف السلسلة" : "Streak Multiplier"}:</b> <b>${multiplier}x</b>\n\n`;

  if (recentTxs.length > 0) {
    html += `📜 <b>${isFa ? "آخرین تراکنش‌ها:" : isAr ? "آخر المعاملات:" : "Recent Transactions:"}</b>\n`;
    for (const tx of recentTxs) {
      const sign = tx.amount > 0 ? `+${tx.amount}` : `${tx.amount}`;
      const ico = tx.amount > 0 ? "🟢" : "🔴";
      html += `  ${ico} <b>${sign} 🪙</b> — <i>${tx.description || tx.source}</i>\n`;
    }
    html += `\n`;
  }

  html += `💡 <i>${isFa ? "با تیک زدن روزانه عادات (+۱۰ سکه) و تسک‌ها (+۵ سکه)، موجودی خود را افزایش داده و در بخش فروشگاه محتواهای جدید را قفل‌گشایی کنید!" : "Earn coins by completing habits (+10) and tasks (+5) to unlock shop rewards!"}</i>`;
  return html;
}

// Format Shop Catalog HTML
function formatShopCatalogHTML(language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const walletCoins = currentServerState.wallet?.coins || 0;
  const products = currentServerState.storeProducts || [];
  const customNovels = currentServerState.customNovels || [];
  const customMovies = currentServerState.customMovies || [];
  const customPlaylists = currentServerState.customPlaylists || [];

  let html = `🛍️ <b>${isFa ? "فروشگاه پاداش‌ها و رسانه‌های قفل‌گشایی شده" : isAr ? "متجر المكافآت والمحتوى" : "Rewards Store & Catalog"}</b>\n`;
  html += `🪙 <b>${isFa ? "موجودی سکه شما" : isAr ? "رصيدك" : "Your Balance"}:</b> <b>${walletCoins} 🪙</b>\n\n`;

  html += `📚 <b>${isFa ? "رمان‌ها و کتاب‌های وب" : isAr ? "الروايات والكتب" : "Web Novels"}:</b> ${customNovels.length} ${isFa ? "عنوان" : "items"}\n`;
  for (const n of customNovels.slice(0, 4)) {
    const isUnlocked = n.isPurchased || n.priceCoins === 0;
    const lockIco = isUnlocked ? "🔓" : "🔒";
    html += `  ${lockIco} <b>${n.title}</b> (${n.totalChapters || 0} فصل | ${n.priceCoins || 0} 🪙)\n`;
  }
  html += `\n`;

  html += `🎬 <b>${isFa ? "فیلم‌ها و پادکست‌ها" : isAr ? "الأفلام والمقاطع" : "Movies & Videos"}:</b> ${customMovies.length + customPlaylists.length} ${isFa ? "مورد" : "items"}\n`;
  for (const m of customMovies.slice(0, 3)) {
    const isUnlocked = m.isPurchased || m.priceCoins === 0;
    const lockIco = isUnlocked ? "🔓" : "🔒";
    html += `  ${lockIco} <b>${m.title}</b> (${m.durationMinutes || 0} دقیقه | ${m.priceCoins || 0} 🪙)\n`;
  }
  html += `\n`;

  html += `💡 <i>${isFa ? "برای مطالعه رمان‌ها و پخش فیلم‌ها، می‌توانید از بخش فروشگاه و مدیا پلیر وب‌اپلیکیشن استفاده نمایید." : "Open web app to read unlocked novels or play video streams."}</i>`;
  return html;
}

// Generate keyboard for Wallet and Shop views
function getWalletShopKeyboard(wallet?: any, language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  return {
    inline_keyboard: [
      [
        {
          text: isFa ? "🛍️ ورود به فروشگاه" : isAr ? "🛍️ المتجر والمكافآت" : "🛍️ Rewards Shop",
          callback_data: "cmd_shop",
        },
        {
          text: isFa ? "💰 کیف پول و سکه‌ها" : isAr ? "💰 المحفظة والرصيد" : "💰 Wallet & Coins",
          callback_data: "cmd_wallet",
        },
      ],
      [
        {
          text: isFa ? "📅 وضعیت امروز" : isAr ? "📅 قائمة اليوم" : "📅 Today's View",
          callback_data: "cmd_today",
        },
        {
          text: isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 الرئيسية" : "🏠 Main Menu",
          callback_data: "cmd_menu",
        },
      ],
    ],
  };
}

// Server habit mutation helpers
function createHabitOnServer(name: string, category?: string) {
  refreshServerStateFromDb();
  const language = currentServerState.language || "fa";
  const defaultCategory = language === "fa" ? "عمومی" : language === "ar" ? "عام" : "General";
  const colors = ["emerald", "indigo", "violet", "amber", "cyan", "rose", "teal", "blue"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  const todayStr = new Date().toISOString().split("T")[0];

  const newHabit = {
    id: `habit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    category: category ? category.trim() : defaultCategory,
    createdAt: todayStr,
    history: {},
    targetDays: 66,
    kRate: 66,
    color: randomColor,
    rewardCoins: 10,
    rewardXp: 5,
  };

  if (!Array.isArray(currentServerState.habits)) currentServerState.habits = [];
  currentServerState.habits.push(newHabit);
  if (Array.isArray(currentServerState.deletedHabitIds)) {
    currentServerState.deletedHabitIds = currentServerState.deletedHabitIds.filter((id) => id !== newHabit.id);
  }
  currentServerState.lastSyncTimestamp = Date.now();
  saveServerStateToDisk();

  return newHabit;
}

function deleteHabitOnServer(habitId: string) {
  refreshServerStateFromDb();
  if (!currentServerState.deletedHabitIds) currentServerState.deletedHabitIds = [];
  if (!currentServerState.deletedHabitIds.includes(habitId)) {
    currentServerState.deletedHabitIds.push(habitId);
  }
  const initialCount = (currentServerState.habits || []).length;
  const targetHabit = (currentServerState.habits || []).find((h) => h.id === habitId);
  currentServerState.habits = (currentServerState.habits || []).filter((h) => h.id !== habitId);
  
  if ((currentServerState.habits || []).length !== initialCount) {
    currentServerState.lastSyncTimestamp = Date.now();
    saveServerStateToDisk();
    return targetHabit || true;
  }
  return null;
}

function toggleHabitTodayOnServer(habitId: string, referenceToday?: string) {
  refreshServerStateFromDb();
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const habit = (currentServerState.habits || []).find((h) => h.id === habitId);
  
  if (!habit) return null;

  if (!habit.history || typeof habit.history !== "object") {
    habit.history = {};
  }
  if (!habit.claimedRewardDates || typeof habit.claimedRewardDates !== "object") {
    habit.claimedRewardDates = {};
  }

  const willBeDone = !habit.history[todayStr];
  const alreadyClaimedReward = Boolean(habit.claimedRewardDates[todayStr]);

  if (willBeDone) {
    habit.history[todayStr] = true;
    if (!alreadyClaimedReward) {
      habit.claimedRewardDates[todayStr] = true;
      awardWalletCoins(habit.rewardCoins || 10, `ثبت عادت: ${habit.name}`);
    }
  } else {
    delete habit.history[todayStr];
    // Preserve habit.claimedRewardDates[todayStr] = true so re-checking does not farm rewards!
    // Do NOT deduct wallet coins
  }

  currentServerState.lastSyncTimestamp = Date.now();
  saveServerStateToDisk();

  return {
    habit,
    isDoneToday: willBeDone,
    rewardAlreadyClaimed: alreadyClaimedReward,
  };
}

/**
 * Builds a multi-dimensional behavioral, cognitive, and temporal matrix of the user
 * Synthesizing habits, tasks, completion timestamps, and accumulated AI memory
 */
function buildComprehensiveUserBehavioralMatrix(
  habitsData: any[],
  rawTasks?: any[],
  wallet?: any,
  language: string = "fa",
  dateFormatted?: string
) {
  const todayStr = dateFormatted || new Date().toISOString().split("T")[0];
  const allHabits = Array.isArray(habitsData) && habitsData.length > 0 ? habitsData : currentServerState.habits || [];
  const allTasks = Array.isArray(rawTasks) && rawTasks.length > 0 ? rawTasks : currentServerState.tasks || [];

  // Normalize habits into summary objects with automaticity if not already computed
  const habitsSummary = allHabits.map((h: any) => {
    if (typeof h.automaticity === "number" && typeof h.isDoneToday === "boolean") {
      return h;
    }
    const stats = calculateHabitStatsOnServer(h, todayStr, language);
    return {
      name: h.name,
      category: h.category || "General",
      automaticity: stats.automaticity,
      stage: stats.stage,
      stageLabel: stats.stageLabel,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalCompletedDays: stats.totalCompletedDays,
      isDoneToday: stats.isDoneToday,
      remainingDays: stats.remainingDays,
      missedDaysCount: stats.missedDaysCount,
      missedDates: stats.missedDates,
      completedTimestamps: h.completedTimestamps || {},
      completionTimes: h.completionTimes || {},
      history: h.history,
    };
  });

  // 1. Habits Behavioral Analysis
  const totalHabits = habitsSummary.length;
  const completedTodayHabits = habitsSummary.filter((h) => h.isDoneToday).length;
  const uncompletedHabitsToday = habitsSummary
    .filter((h) => !h.isDoneToday)
    .map((h) => ({ name: h.name, category: h.category, automaticity: h.automaticity }));
  const missedHabitsCountToday = uncompletedHabitsToday.length;

  // Strict All-Habits Streak Calculation (0 if even 1 habit was missed today or yesterday)
  const isDatePerfect = (dateKey: string): boolean => {
    return allHabits.length > 0 && allHabits.every((h: any) => !!(h.history && h.history[dateKey]));
  };

  const isPerfectToday = totalHabits > 0 && completedTodayHabits === totalHabits;
  let allHabitsCurrentStreak = 0;
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
  const isPerfectYesterday = isDatePerfect(yKey);

  if (isPerfectToday) {
    allHabitsCurrentStreak = 1;
    const checkD = new Date(todayDate);
    checkD.setDate(checkD.getDate() - 1);
    while (true) {
      const ck = `${checkD.getFullYear()}-${String(checkD.getMonth() + 1).padStart(2, "0")}-${String(checkD.getDate()).padStart(2, "0")}`;
      if (isDatePerfect(ck)) {
        allHabitsCurrentStreak++;
        checkD.setDate(checkD.getDate() - 1);
      } else {
        break;
      }
    }
  } else if (isPerfectYesterday) {
    allHabitsCurrentStreak = 1;
    const checkD = new Date(yesterdayDate);
    checkD.setDate(checkD.getDate() - 1);
    while (true) {
      const ck = `${checkD.getFullYear()}-${String(checkD.getMonth() + 1).padStart(2, "0")}-${String(checkD.getDate()).padStart(2, "0")}`;
      if (isDatePerfect(ck)) {
        allHabitsCurrentStreak++;
        checkD.setDate(checkD.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    allHabitsCurrentStreak = 0;
  }

  const avgAutomaticity = totalHabits > 0 
    ? Math.round(habitsSummary.reduce((acc, h) => acc + (h.automaticity || 0), 0) / totalHabits) 
    : 0;
  const habitCompletionRate = totalHabits > 0 ? Math.round((completedTodayHabits / totalHabits) * 100) : 0;

  // Identify high-risk habits (at risk of 2+ consecutive misses)
  const highRiskHabits: any[] = [];
  const wellEstablishedHabits: any[] = [];
  const formingHabits: any[] = [];

  const habitCategoriesCount: Record<string, number> = {};

  habitsSummary.forEach((h) => {
    const category = h.category || "General";
    habitCategoriesCount[category] = (habitCategoriesCount[category] || 0) + 1;

    const auto = h.automaticity || 0;
    const streak = h.currentStreak || 0;
    const isDone = Boolean(h.isDoneToday);

    if (auto >= 85) {
      wellEstablishedHabits.push({ name: h.name, automaticity: auto, streak });
    } else if (!isDone && streak === 0) {
      highRiskHabits.push({ name: h.name, automaticity: auto, streak, stage: h.stage, missedDaysCount: h.missedDaysCount });
    } else {
      formingHabits.push({ name: h.name, automaticity: auto, streak, stage: h.stage });
    }
  });

  // 2. Tasks Executive Function Analysis
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const pendingTasks = allTasks.filter((t) => !t.completed).length;
  
  // Overdue tasks with precise days calculation
  const overdueTasksList = allTasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr)
    .map((t) => {
      const [y1, m1, d1] = (t.dueDate || todayStr).split("-").map(Number);
      const [y2, m2, d2] = todayStr.split("-").map(Number);
      const t1 = new Date(y1, m1 - 1, d1).getTime();
      const t2 = new Date(y2, m2 - 1, d2).getTime();
      const overdueDays = Math.max(1, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        category: t.category,
        dueDate: t.dueDate,
        overdueDays,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const overdueCount = overdueTasksList.length;
  const totalOverdueDays = overdueTasksList.reduce((acc, t) => acc + t.overdueDays, 0);
  const maxOverdueDays = overdueTasksList.length > 0 ? Math.max(...overdueTasksList.map((t) => t.overdueDays)) : 0;
  const averageOverdueDays = overdueCount > 0 ? Math.round((totalOverdueDays / overdueCount) * 10) / 10 : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Priority distribution
  const priorityStats = {
    high: { total: 0, completed: 0, overdue: 0 },
    medium: { total: 0, completed: 0, overdue: 0 },
    low: { total: 0, completed: 0, overdue: 0 },
  };

  allTasks.forEach((t) => {
    const p = (t.priority || 'medium') as 'high' | 'medium' | 'low';
    if (priorityStats[p]) {
      priorityStats[p].total++;
      if (t.completed) priorityStats[p].completed++;
      if (!t.completed && t.dueDate && t.dueDate < todayStr) priorityStats[p].overdue++;
    }
  });

  // Subtasks completion
  let totalSubtasks = 0;
  let completedSubtasks = 0;
  allTasks.forEach((t) => {
    if (Array.isArray(t.subtasks)) {
      t.subtasks.forEach((st: any) => {
        totalSubtasks++;
        if (st.completed) completedSubtasks++;
      });
    }
  });

  // Recurring tasks
  const recurringTasksCount = allTasks.filter((t) => t.isRecurring).length;

  // 3. Temporal & Circadian Completion Buckets & 24h Hourly Histogram
  const hourlyDistribution: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

  const circadianBuckets = {
    morning: 0,   // 05:00 - 12:00
    afternoon: 0, // 12:00 - 17:00
    evening: 0,   // 17:00 - 22:00
    night: 0,     // 22:00 - 05:00
  };

  allTasks.forEach((t) => {
    if (t.completed && t.completedAt) {
      const dateObj = new Date(t.completedAt);
      const hour = dateObj.getHours();
      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        if (hour >= 5 && hour < 12) circadianBuckets.morning++;
        else if (hour >= 12 && hour < 17) circadianBuckets.afternoon++;
        else if (hour >= 17 && hour < 22) circadianBuckets.evening++;
        else circadianBuckets.night++;
      }
    }
  });

  // Also include habit completion timestamps
  allHabits.forEach((h: any) => {
    if (h.completedTimestamps && typeof h.completedTimestamps === "object") {
      Object.values(h.completedTimestamps).forEach((ts: any) => {
        if (typeof ts === "number") {
          const hHour = new Date(ts).getHours();
          if (!isNaN(hHour) && hHour >= 0 && hHour <= 23) {
            hourlyDistribution[hHour] = (hourlyDistribution[hHour] || 0) + 1;
          }
        }
      });
    }
  });

  let peakHour = 18;
  let maxHourlyCount = -1;
  for (let i = 0; i < 24; i++) {
    if ((hourlyDistribution[i] || 0) > maxHourlyCount) {
      maxHourlyCount = hourlyDistribution[i] || 0;
      peakHour = i;
    }
  }
  const peakProductivityWindow = `${String(peakHour).padStart(2, "0")}:00 - ${String((peakHour + 1) % 24).padStart(2, "0")}:00`;

  // 4. Synergy & Procrastination Score Math
  const habitWeight = totalHabits > 0 ? (completedTodayHabits / totalHabits) * 50 : 25;
  const taskWeight = totalTasks > 0 ? (completedTasks / totalTasks) * 50 : 25;
  const holisticMasteryIndex = Math.min(100, Math.max(0, Math.round(habitWeight + taskWeight)));

  const overduePenalty = totalTasks > 0 ? (overdueCount / totalTasks) * 40 : 0;
  const highRiskPenalty = totalHabits > 0 ? (highRiskHabits.length / totalHabits) * 40 : 0;
  const procrastinationRiskIndex = Math.min(100, Math.max(5, Math.round(overduePenalty + highRiskPenalty + 10)));

  const taskHabitSynergyScore = Math.min(100, Math.max(10, Math.round((avgAutomaticity * 0.4) + (taskCompletionRate * 0.6))));

  return {
    todayStr,
    habitsAnalysis: {
      totalHabits,
      completedTodayHabits,
      uncompletedHabitsToday,
      missedHabitsCountToday,
      allHabitsStrictStreak: {
        currentStreak: allHabitsCurrentStreak,
        isPerfectToday,
        isPerfectYesterday,
      },
      habitCompletionRate,
      avgAutomaticity,
      highRiskHabits,
      wellEstablishedHabits,
      formingHabits,
      habitCategoriesCount,
      habitsList: habitsSummary,
    },
    tasksAnalysis: {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueCount,
      totalOverdueDays,
      maxOverdueDays,
      averageOverdueDays,
      overdueTasks: overdueTasksList,
      taskCompletionRate,
      priorityStats,
      totalSubtasks,
      completedSubtasks,
      recurringTasksCount,
    },
    temporalPatterns: {
      circadianBuckets,
      hourlyDistribution,
      peakHour,
      peakProductivityWindow,
      peakHourlyCount: maxHourlyCount,
      holisticMasteryIndex,
      procrastinationRiskIndex,
      taskHabitSynergyScore,
    },
    previousCognitiveProfile: currentServerState.userCognitiveProfile || null,
  };
}

function generateDeterministicNeuroscienceReport(
  matrix: ReturnType<typeof buildComprehensiveUserBehavioralMatrix>,
  language: string,
  dateFormatted?: string
) {
  const isFa = language === "fa";
  const isAr = language === "ar";

  const { habitsAnalysis, tasksAnalysis, temporalPatterns, todayStr } = matrix;
  const { totalHabits, completedTodayHabits, habitCompletionRate, avgAutomaticity, habitsList } = habitsAnalysis;
  const { totalTasks, completedTasks, pendingTasks, overdueCount, taskCompletionRate, priorityStats } = tasksAnalysis;

  const habitFeedback = habitsList.map((h: any) => {
    const auto = h.automaticity || 0;
    const streak = h.currentStreak || 0;
    const isDone = Boolean(h.isDoneToday);
    let status: "automatic" | "improving" | "warning" | "steady" = "steady";

    if (auto >= 85) {
      status = "automatic";
    } else if (isDone && streak >= 3) {
      status = "improving";
    } else if (!isDone && streak === 0) {
      status = "warning";
    } else {
      status = "steady";
    }

    let tip = "";
    if (isFa) {
      if (status === "automatic") {
        tip = `با ${auto}٪ خودکارشدگی، این رفتار در عقده‌های قاعده‌ای (Basal Ganglia) مغز شما تثبیت شده و کمترین انرژی ارادی را مصرف می‌کند.`;
      } else if (status === "improving") {
        tip = `زنجیره ${streak} روزه بسیار عالی است! فرآیند میلین‌دار شدن رشته‌های عصبی در حال تسریع است.`;
      } else if (status === "warning") {
        tip = `طبق پژوهش دکتر لالی (۲۰۱۰)، جا افتادن ۱ روز روند را تخریب نمی‌کند، ولی از افت ۲ روز متوالی جلوگیری کنید.`;
      } else {
        tip = `درصد خودکارشدگی ${auto}٪ است. این عادت را بلافاصله پس از یک عادت تثبیت‌شده اجرا کنید (Habit Stacking).`;
      }
    } else if (isAr) {
      if (status === "automatic") {
        tip = `بنسبة تلقائية ${auto}٪، أصبح هذا السلوك راسخاً في الدماغ ويتم تنفيذه بجهد ذهني منخفض.`;
      } else if (status === "improving") {
        tip = `سلسلة استمرار ${streak} أيام ممتازة! المسارات العصبية تتقوى يومياً.`;
      } else if (status === "warning") {
        tip = `تفويت يوم واحد لا يلغي العادة، لكن تجنب تفويت يومين متتاليين لمنع التراجع العصبي.`;
      } else {
        tip = `نسبة التلقائية ${auto}٪. اربط هذه العادة بروتين يومي ثابت لتسهيل تنفيذها.`;
      }
    } else {
      if (status === "automatic") {
        tip = `At ${auto}% automaticity, this neural loop is solidified in the basal ganglia with minimal friction.`;
      } else if (status === "improving") {
        tip = `Great momentum with a ${streak}-day streak! Myelination of this habit loop is actively progressing.`;
      } else if (status === "warning") {
        tip = `Missing 1 single day does not reset automaticity, but protect against 2 consecutive misses.`;
      } else {
        tip = `Automaticity is at ${auto}%. Implement habit stacking: anchor this action directly after an established routine.`;
      }
    }

    return {
      name: h.name,
      status,
      critiqueAndTip: tip,
    };
  });

  let title = "";
  let overview = "";
  let generalCritique = "";
  let actionableTips: string[] = [];
  let motivationalQuote = "";

  if (isFa) {
    title = `تحلیل یکپارچه عادات و تسک‌های روزانه (${completedTodayHabits} از ${totalHabits} عادت | ${completedTasks} از ${totalTasks} تسک)`;
    overview = `امروز نرخ اجرای عادات ${habitCompletionRate}٪ (میانگین خودکارشدگی ${avgAutomaticity}٪) و درصد تکمیل وظایف اجرایی ${taskCompletionRate}٪ است. شاخص یکپارچگی رفتاری و عملکرد شناختی شما روی ${temporalPatterns.holisticMasteryIndex} از ۱۰۰ ارزیابی شد.`;
    generalCritique =
      overdueCount > 0
        ? `تعداد ${overdueCount} تسک معوقه ثبت شده است که نشان‌دهنده اصطکاک شناختی در فاز شروع وظایف یا حجم بیش از حد روزانه است. تفکیک تسک‌ها به گام‌های ۲ دقیقه‌ای فشار قشر پیش‌پیشانی را برطرف می‌کند.`
        : `تعادل بالایی میان اجرای عادات ناخودآگاه و تسک‌های ارادی مشاهده می‌شود. پایداری در این وضعیت، مسیر شکل‌گیری هویت منظم را تثبیت می‌کند.`;
    actionableTips = [
      "قانون ۲ دقیقه (James Clear): شروع وظایف و عادات سنگین را به زیر ۲ دقیقه برسانید تا مقاومت PFC شکسته شود.",
      "اصل تاب‌آوری تک‌وقفه (Lally 2010): در صورت جا ماندن یک روزه، از سرزنش دوری کرده و زنجیره را فوراً فردا بازیابی کنید.",
      "هم‌افزایی عادت و تسک (Synergy Anchoring): سخت‌ترین تسک کاری روز را دقیقاً بعد از اتمام موفق یک عادت پرانرژی صبحگاهی قرار دهید.",
    ];
    motivationalQuote =
      "«ما همان چیزی هستیم که مکرراً انجام می‌دهیم؛ پس برتری یک عمل نیست، بلکه یک عادت است.» — ارسطو";
  } else if (isAr) {
    title = `التقرير الشامل للعادات والمهام اليومية (${completedTodayHabits} من ${totalHabits} عادات | ${completedTasks} من ${totalTasks} مهام)`;
    overview = `نسبة إنجاز العادات ${habitCompletionRate}٪ ونسبة إنجاز المهام ${taskCompletionRate}٪. مؤشر الإتقان السلوكي الإجمالي يقدر بـ ${temporalPatterns.holisticMasteryIndex}/100.`;
    generalCritique =
      overdueCount > 0
        ? `هناك ${overdueCount} مهام متأخرة. استخدم قاعدة الدقيقتين لتقليل التسويف والمقاومة الذهنية.`
        : `توازن رائع بين استمرارية العادات وإنجاز المهام اليومية بكفاءة عالية.`;
    actionableTips = [
      "قاعدة الدقيقتين: بسّط بداية أي مهمة صعبة إلى خطوة لا تتجاوز دقيقتين.",
      "قاعدة عدم تفويت يومين متتاليين (Lally 2010): حافظ على استمرارية الزخم العصبي.",
      "ربط المهام بالعادات: نفذ المهمة الأكثر أهمية فور الانتهاء من روتينك الصباحي.",
    ];
    motivationalQuote =
      "«النجاح هو مجموع جهود صغيرة تتكرر يوماً بعد يوم.» — روبرت كولير";
  } else {
    title = `Holistic Behavioral & Executive Analysis (${completedTodayHabits}/${totalHabits} Habits | ${completedTasks}/${totalTasks} Tasks)`;
    overview = `Today's habit execution rate is ${habitCompletionRate}% (avg automaticity: ${avgAutomaticity}%) and task completion is ${taskCompletionRate}%. Holistic Behavioral Mastery index is ${temporalPatterns.holisticMasteryIndex}/100.`;
    generalCritique =
      overdueCount > 0
        ? `Identified ${overdueCount} overdue task(s). Lower cognitive start resistance by converting large tasks into 2-minute micro-actions.`
        : `Strong synergy observed between habit consistency and conscious task execution.`;
    actionableTips = [
      "2-Minute Rule: Reduce initial action friction to break prefrontal resistance.",
      "Lally's Single-Miss Resiliency: 1 slip does not erase synaptic pathways; protect against 2 consecutive misses.",
      "Habit-Task Anchor: Schedule high-focus tasks immediately after completing your morning energy habit.",
    ];
    motivationalQuote =
      '"We are what we repeatedly do. Excellence, then, is not an act, but a habit." — Aristotle';
  }

  // Generate deterministic cognitive memory profile
  const userCognitiveProfile = {
    lastUpdated: todayStr,
    learnedUserPatterns: isFa ? [
      `پایداری در عادات با میانگین خودکارشدگی ${avgAutomaticity}٪ و تمرکز فعال روی ${totalHabits} رفتار روزانه.`,
      `الگوی مدیریت وظایف با درصد موفقیت ${taskCompletionRate}٪ (${completedTasks} تسک تکمیل‌شده از ${totalTasks}).`,
      overdueCount > 0 
        ? `ثبت ${overdueCount} وظیفه معوقه که نشانگر آسیب‌پذیری در زمان‌بندی روزهای پرفشار است.`
        : `انضباط زمانی بالا با حداقل تعویق و مدیریت دقیق وظایف روزانه.`
    ] : [
      `Consistent habit rhythm with ${avgAutomaticity}% average automaticity across ${totalHabits} behaviors.`,
      `Executive task management completion rate of ${taskCompletionRate}%.`,
      overdueCount > 0 ? `Detected ${overdueCount} overdue items highlighting time-pressure vulnerability.` : `High scheduling discipline with minimal task delay.`
    ],
    cognitiveStrengths: isFa ? [
      `تداوم در عادات تثبیت‌شده با نرخ خودکارسازی رو به رشد.`,
      `توانایی اجرای وظایف همزمان با ردیابی علمی شاخص‌های عصبی.`
    ] : [
      `Strong neural formation in established habit loops.`,
      `Effective dual-tracking of automatic habits alongside conscious tasks.`
    ],
    vulnerabilityTriggers: isFa ? [
      `ریسک انباشتگی وظایف سنگین در صورت عدم خردسازی به ریزاقدام‌ها.`,
      `حساسیت به افت در صورت ایجاد وقفه متوالی بیش از یک روز در عادات.`
    ] : [
      `Susceptibility to task paralysis when high-priority items lack micro-steps.`,
      `Risk of automaticity decay if 2 consecutive days are skipped.`
    ],
    tailoredNeuroHacks: isFa ? [
      `استفاده از نشانه محیطی واضح (Visual Cue) در محل کار برای شروع فوری عادت‌ها.`,
      `قاعده اجرای فوری تسک‌های زیر ۲ دقیقه بدون انتقال به لیست تعویق.`,
      `پاداش‌دهی دوپامینی بلافاصله پس از ثبت هر زنجیره روزانه.`
    ] : [
      `Place explicit environmental triggers directly in your workspace.`,
      `Apply immediate execution to any task taking under 2 minutes.`,
      `Anchor dopamine reinforcement immediately after each daily check-in.`
    ],
    automaticityMilestones: habitsList.map((h: any) => ({
      habitName: h.name,
      currentScore: h.automaticity || 0,
      projectedTargetDate: h.targetDate || todayStr,
      stage: h.stage || "forming",
    })),
    circadianProductivity: {
      peakHours: isFa ? "صبح‌ها بین ۸ تا ۱۲ و ساعات آغازین کار" : "Morning 08:00 - 12:00",
      bestDays: isFa ? "شنبه تا سه‌شنبه (روزهای اوج انگیزه هفتگی)" : "Saturday - Tuesday",
      highRiskTimeframe: isFa ? "عصرها بعد از ساعت ۱۹ و پایان هفته" : "Evenings after 19:00 & weekends",
    },
    taskHabitSynergyScore: temporalPatterns.taskHabitSynergyScore,
    procrastinationRiskIndex: temporalPatterns.procrastinationRiskIndex,
    holisticMasteryIndex: temporalPatterns.holisticMasteryIndex,
    personalAdvice: isFa 
      ? `شما در مسیر صحیح میلین‌سازی عادات و بهینه‌سازی ظرفیت شناختی قرار دارید. با محافظت از زنجیره‌ها و خرد کردن تسک‌های بزرگ، مغز شما هر روز مقاومت کمتری در برابر پیشرفت نشان خواهد داد.`
      : `You are on the right neuroplastic pathway. By protecting streaks against consecutive misses and chunking tasks, resistance will continuously diminish.`,
  };

  const tasksFeedback = {
    totalTasksAnalyzed: totalTasks,
    completionRate: taskCompletionRate,
    overdueAnalysis: isFa 
      ? (overdueCount > 0 ? `تعداد ${overdueCount} تسک عقب‌افتاده است. برای رهایی از فشار ذهنی، اولین تسک را به یک گام بسیار کوچک تبدیل نمایید.` : `تمام تسک‌های فعال در زمان‌بندی مقرر قرار دارند. عالی است!`)
      : (overdueCount > 0 ? `${overdueCount} task(s) are overdue. Break the nearest task into a 2-minute step.` : `All active tasks are strictly on schedule. Excellent!`),
    procrastinationTip: isFa
      ? `از تکنیک «شروع ۵ دقیقه‌ای» استفاده کنید: فقط ۵ دقیقه روی وظیفه تمرکز کنید، سپس در صورت تمایل توقف کنید. در ۹۰٪ موارد مغز ادامه خواهد داد.`
      : `Use the 5-Minute Kickstart: commit to just 5 minutes; in 90% of instances, cognitive momentum carries you through.`,
  };

  return {
    title,
    overview,
    habitFeedback,
    tasksFeedback,
    generalCritique,
    actionableTips,
    motivationalQuote,
    userCognitiveProfile,
    generationEngine: 'math' as const,
  };
}

async function generateAIReport(
  prompt: string,
  matrix: ReturnType<typeof buildComprehensiveUserBehavioralMatrix>,
  language: string,
  dateFormatted?: string,
  aiKeys?: AIKeyConfig[]
): Promise<any> {
  const systemInstruction =
    "You are a supportive, high-level behavioral scientist, executive function psychologist, and habit optimization AI coach specializing in Dr. Lally's habit automaticity model and cognitive neuroplasticity. Synthesize all user habits, tasks, completion times, and behavioral history into deep learned intelligence. Respond exclusively in valid JSON.";

  // Prioritize passed aiKeys from Analytics AI section, otherwise check all server states & sections
  let activeKeys: AIKeyConfig[] = [];
  if (Array.isArray(aiKeys) && aiKeys.length > 0) {
    activeKeys = aiKeys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0);
  }
  if (activeKeys.length === 0 && currentServerState.aiConfig?.analyticsAI?.keys) {
    activeKeys = currentServerState.aiConfig.analyticsAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0);
  }
  if (activeKeys.length === 0 && currentServerState.aiConfig?.translationAI?.keys) {
    activeKeys = currentServerState.aiConfig.translationAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0);
  }
  if (activeKeys.length === 0 && (currentServerState.advancedSettings as any)?.aiConfig?.analyticsAI?.keys) {
    activeKeys = (currentServerState.advancedSettings as any).aiConfig.analyticsAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0);
  }
  if (activeKeys.length === 0 && (currentServerState.advancedSettings as any)?.aiConfig?.translationAI?.keys) {
    activeKeys = (currentServerState.advancedSettings as any).aiConfig.translationAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0);
  }

  let aiExecutionError: string | null = null;

  if (activeKeys.length > 0 || process.env.GEMINI_API_KEY) {
    try {
      console.log(`[generateAIReport] Executing multi-provider completion with ${activeKeys.length} AI key(s)...`);
      const res = await executeMultiProviderCompletion({
        keys: activeKeys,
        systemPrompt: systemInstruction,
        prompt,
        temperature: 0.2,
        responseJson: true,
      });

      if (res.text) {
        let raw = res.text.trim();
        if (raw.startsWith('```')) {
          raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        const cleanAndParse = (jsonStr: string) => {
          try {
            return JSON.parse(jsonStr);
          } catch {
            const sanitized = jsonStr
              .replace(/,\s*([\}\]])/g, '$1')
              .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
            return JSON.parse(sanitized);
          }
        };

        try {
          const parsed = cleanAndParse(raw);
          if (parsed && typeof parsed === "object" && (parsed.title || parsed.overview)) {
            parsed.generationEngine = 'ai';
            parsed.providerUsed = res.providerUsed;
            parsed.modelUsed = res.modelUsed;

            // Persist the newly learned User Cognitive Memory Profile!
            if (parsed.userCognitiveProfile) {
              currentServerState.userCognitiveProfile = parsed.userCognitiveProfile;
              saveServerStateToDisk();
            }

            return parsed;
          }
        } catch {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = cleanAndParse(match[0]);
              if (parsed && typeof parsed === "object" && (parsed.title || parsed.overview)) {
                parsed.generationEngine = 'ai';
                parsed.providerUsed = res.providerUsed;
                parsed.modelUsed = res.modelUsed;

                if (parsed.userCognitiveProfile) {
                  currentServerState.userCognitiveProfile = parsed.userCognitiveProfile;
                  saveServerStateToDisk();
                }

                return parsed;
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err: any) {
      aiExecutionError = err?.message || String(err);
      console.warn("[generateAIReport] Multi-provider AI failed:", aiExecutionError);
    }
  }

  // Graceful deterministic fallback using Lally (2010) scientific model & multi-dimensional matrix
  const mathReport = generateDeterministicNeuroscienceReport(matrix, language, dateFormatted);
  mathReport.generationEngine = 'math';
  if (aiExecutionError) {
    (mathReport as any).aiError = aiExecutionError;
  }

  // Persist fallback profile if none existed
  if (mathReport.userCognitiveProfile) {
    currentServerState.userCognitiveProfile = mathReport.userCognitiveProfile;
    saveServerStateToDisk();
  }

  return mathReport;
}

// Dialogue memory for multi-turn Telegram AI Coaching sessions
interface DialogueTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const chatConversations: Record<string, DialogueTurn[]> = {};

function initDialogueMemoryFromDisk() {
  try {
    if ((currentServerState as any).chatHistories && typeof (currentServerState as any).chatHistories === "object") {
      Object.assign(chatConversations, (currentServerState as any).chatHistories);
    }
  } catch (e) {
    console.warn("Failed to load chatHistories from disk:", e);
  }
}

function addDialogueTurn(chatId: string | number, role: 'user' | 'assistant', text: string) {
  const key = String(chatId);
  if (!chatConversations[key]) {
    chatConversations[key] = [];
  }
  chatConversations[key].push({ role, text, timestamp: Date.now() });
  // Keep last 16 turns per chat to keep context rich without exceeding token limits
  if (chatConversations[key].length > 16) {
    chatConversations[key] = chatConversations[key].slice(-16);
  }
  if (!(currentServerState as any).chatHistories) {
    (currentServerState as any).chatHistories = {};
  }
  (currentServerState as any).chatHistories[key] = chatConversations[key];
  saveServerStateToDisk();
}

function getDialogueHistory(chatId: string | number): DialogueTurn[] {
  const key = String(chatId);
  if (!chatConversations[key] && (currentServerState as any).chatHistories?.[key]) {
    chatConversations[key] = (currentServerState as any).chatHistories[key];
  }
  return chatConversations[key] || [];
}

function clearDialogueHistory(chatId: string | number) {
  const key = String(chatId);
  delete chatConversations[key];
  if ((currentServerState as any).chatHistories) {
    delete (currentServerState as any).chatHistories[key];
    saveServerStateToDisk();
  }
}

// Adaptive Behavioral & Cognitive Learning Engine
function updateUserCognitiveProfileFromDialogue(
  userMessage: string,
  replyText: string,
  personaName: string,
  language: string = "fa"
) {
  try {
    if (!currentServerState.userCognitiveProfile) {
      currentServerState.userCognitiveProfile = {
        lastUpdated: new Date().toISOString().split("T")[0],
        learnedUserPatterns: [],
        cognitiveStrengths: [],
        vulnerabilityTriggers: [],
        tailoredNeuroHacks: [],
      };
    }

    const profile = currentServerState.userCognitiveProfile as any;
    profile.lastUpdated = new Date().toISOString().split("T")[0];
    if (!Array.isArray(profile.learnedUserPatterns)) profile.learnedUserPatterns = [];
    if (!Array.isArray(profile.vulnerabilityTriggers)) profile.vulnerabilityTriggers = [];
    if (!Array.isArray(profile.cognitiveStrengths)) profile.cognitiveStrengths = [];
    if (!Array.isArray(profile.userGoalsAndPreferences)) profile.userGoalsAndPreferences = [];
    profile.interactionCount = (profile.interactionCount || 0) + 1;

    const lowerMsg = userMessage.toLowerCase();
    const dateStr = profile.lastUpdated;

    // Detect fatigue or low energy
    const fatigueKeywords = ["خسته", "خستگی", "بی‌حوصله", "بی حوصله", "حال ندارم", "انرژی ندارم", "تعبان", "tired", "exhausted", "burnout"];
    if (fatigueKeywords.some((k) => lowerMsg.includes(k))) {
      const entry = language === "fa"
        ? `حساسیت به افت انرژی و خستگی فکری (${dateStr})`
        : `Vulnerability to mental fatigue (${dateStr})`;
      if (!profile.vulnerabilityTriggers.includes(entry)) {
        profile.vulnerabilityTriggers.unshift(entry);
      }
    }

    // Detect procrastination or resistance
    const procastKeywords = ["تعلل", "پشت گوش", "فردا", "وقت ندارم", "استرس", "اضطراب", "سرم شلوغه", "procrastinat", "busy", "stress"];
    if (procastKeywords.some((k) => lowerMsg.includes(k))) {
      const entry = language === "fa"
        ? `مقاومت در برابر شروع عادات و اثربخشی تکنیک ۲ دقیقه‌ای (${dateStr})`
        : `Starting friction; responds well to 2-minute micro-activation (${dateStr})`;
      if (!profile.vulnerabilityTriggers.includes(entry)) {
        profile.vulnerabilityTriggers.unshift(entry);
      }
    }

    // Detect mentioned habits or areas
    const habitKeywords = [
      { kw: "ورزش", label: "ورزش و فعالیت بدنی" },
      { kw: "مطالعه", label: "مطالعه و کتاب‌خوانی" },
      { kw: "کتاب", label: "مطالعه روزانه" },
      { kw: "خواب", label: "تنظیم ریتم خواب" },
      { kw: "آب", label: "نوشیدن آب و سلامت" },
      { kw: "تمرکز", label: "تمرکز عمیق و پومودورو" },
      { kw: "برنامه‌نویسی", label: "کدنویسی و توسعه" },
      { kw: "زبان", label: "یادگیری زبان" },
      { kw: "مدیتیشن", label: "مدیتیشن و آرام‌سازی ذهن" },
      { kw: "کار", label: "پیشبرد پروژه‌ها و کارها" },
    ];

    for (const item of habitKeywords) {
      if (lowerMsg.includes(item.kw)) {
        const entry = language === "fa"
          ? `تمرکز و توجه به بهبود مداوم «${item.label}»`
          : `Active focus on building consistency in ${item.label}`;
        if (!profile.userGoalsAndPreferences.includes(entry)) {
          profile.userGoalsAndPreferences.unshift(entry);
        }
      }
    }

    // Record general dialogue learning snippet
    const cleanExcerpt = userMessage.slice(0, 90).replace(/\n/g, " ");
    const dialogueEntry = language === "fa"
      ? `گفتگوی دوستانه (${dateStr} با ${personaName}): محوریت «${cleanExcerpt}»`
      : `Dialogue with ${personaName} (${dateStr}): Topic "${cleanExcerpt}"`;
    profile.learnedUserPatterns.unshift(dialogueEntry);

    // Keep bounded lengths
    profile.learnedUserPatterns = profile.learnedUserPatterns.slice(0, 15);
    profile.vulnerabilityTriggers = profile.vulnerabilityTriggers.slice(0, 10);
    profile.cognitiveStrengths = profile.cognitiveStrengths.slice(0, 10);
    profile.userGoalsAndPreferences = profile.userGoalsAndPreferences.slice(0, 15);

    saveServerStateToDisk();
  } catch (err) {
    console.warn("[updateUserCognitiveProfileFromDialogue] Warning:", err);
  }
}

// Rich Persona Details & Behavioral Framing
function getPersonaDetails(botPersona?: string, language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const personaKey = botPersona || currentServerState.telegramConfig?.botPersona || "academic";

  if (personaKey === "coach") {
    return {
      key: "coach",
      emoji: "🔥",
      name: isFa ? "مربی پرانرژی و انگیزشی" : isAr ? "المدرب التحفيزي الحماسي" : "High-Energy Motivational Coach",
      systemInstruction: `PERSONA: Energetic, High-Impact Motivational Habit & Growth Coach.
- Tone: Dynamic, inspiring, highly motivating, uplifting, momentum-building, empathetic yet action-obsessed.
- Philosophy: Build radical self-belief, conquer inertia, celebrate every micro-win, and turn hesitation into immediate energy.
- Dialogue style: Warmly acknowledge the user's struggle, ask 1-2 empowering questions to break mental friction ("What's the absolute smallest 2-minute step we can start right now?", "What spark will get you moving?"), and provide an immediate actionable push.`,
      dialoguePrompt: isFa
        ? `تو مربی پرانرژی، الهام‌بخش و عمل‌گرای عادات هستی. با شور و انگیزه بالا، با لحنی گرم و حمایتی با کاربر گفتگوی دو نفره انجام بده. ریشه خستگی یا بی‌حوصلگی‌اش را بپرس و راهکار ۲ دقیقه‌ای برای شروع فوری به او بده.`
        : `You are an energetic, inspiring habit coach. Radiate high morale, ask empowering questions to diagnose friction, and give an instant 2-minute actionable boost.`,
    };
  } else if (personaKey === "strict") {
    return {
      key: "strict",
      emoji: "⚡",
      name: isFa ? "افسر انضباط و پاسخ‌خواهی قاطع" : isAr ? "مسؤول الانضباط الصارم والمباشر" : "Strict & Direct Accountability Officer",
      systemInstruction: `PERSONA: Strict, Direct, and Uncompromising Accountability Officer.
- Tone: Candid, direct, no-nonsense, rigorous, radically honest, demanding extreme ownership.
- Philosophy: Zero excuses, eliminate friction, prioritize core commitments over comfort, and enforce disciplined consistency.
- Dialogue style: Call out rationalizations and distractions directly, ask 1-2 sharp piercing questions ("Why did you let a temporary distraction override your long-term goal?", "Is this real physical exhaustion or just mental resistance to starting?"), and mandate an immediate non-negotiable action.`,
      dialoguePrompt: isFa
        ? `تو مربی سرسخت، قاطع و پاسخ‌خواه هستی. بدون تعارف و توجیه، علت عدم انجام را کالبدشکافی کن، سوالات صریح و بدون بهانه بپرس و کاربر را به انجام حداقل نسخه ۲ دقیقه‌ای موظف کن.`
        : `You are a strict, direct accountability coach. Challenge excuses, ask piercing questions, and require immediate execution.`,
    };
  } else if (personaKey === "zen") {
    return {
      key: "zen",
      emoji: "🌿",
      name: isFa ? "راهنمای ذهن‌آگاهی و خرد استویک" : isAr ? "مرشد اليقظة الذهنية والحكمة الرواقية" : "Mindful & Stoic Zen Guide",
      systemInstruction: `PERSONA: Mindful Stoic Philosopher & Zen Habit Guide.
- Tone: Serene, patient, compassionate, non-judgmental, grounded, and emotionally peaceful.
- Philosophy: Non-attachment to guilt, mindful breathing, radical acceptance of reality, and effortless steady consistency.
- Dialogue style: Help the user release self-blame and anxiety around skipped habits. Ask 1-2 calm, reflective questions ("What inner tension or overwhelm is creating this resistance?", "If you let go of pressure, what gentle small step feels natural right now?"), and guide them through a mindful, low-friction action.`,
      dialoguePrompt: isFa
        ? `تو راهنمای ذهن‌آگاهی و خرد رواقی هستی. با آرامش عمیق، احساس گناه یا اضطراب کاربر را برطرف کن، با سوالات مایندفول علت مقاومت درونی‌اش را کشف کن و او را به یک اقدام آرام و پیوسته دعوت نما.`
        : `You are a Zen mindful mentor. Dispel guilt, explore inner resistance gently, and guide toward peaceful, low-friction micro-habits.`,
    };
  } else {
    // academic / default
    return {
      key: "academic",
      emoji: "🔬",
      name: isFa ? "پژوهشگر علوم اعصاب شناختی (مدل لالی)" : isAr ? "باحث علم الأعصاب السلوكي (نموذج لالي)" : "Cognitive Neuroscience Researcher",
      systemInstruction: `PERSONA: Academic & Cognitive Neuroscience Researcher based on Dr. Phillippa Lally's 2010 habit automaticity model.
- Tone: Scientific, deeply analytical, evidence-based, intellectually empowering, and structured.
- Philosophy: Synaptic plasticity, prefrontal cortex energy conservation, dopamine prediction loops, cue-routine-reward architecture.
- Dialogue style: Objectively analyze the friction in behavioral neurobiology. Ask 1-2 precise diagnostic questions ("Where did the habit loop break: environmental cue, craving, or activation energy?", "Was prefrontal cognitive fatigue high at that time of day?"), and provide evidence-based neuro-hacks (habit stacking, 2-minute rule, environmental redesign).`,
      dialoguePrompt: isFa
        ? `تو دانشمند علوم اعصاب شناختی و متخصص مدل ۶۶ روزه دکتر لالی (۲۰۱۰) هستی. موانع کاربر را به صورت علمی بررسی کن، سوالات شناختی دقیق بپرس و راهکارهای عصب‌شناختی برای شکستن اصطکاک ارائه بده.`
        : `You are a cognitive neuroscience researcher. Analyze behavioral friction through Dr. Lally's 2010 model, ask neurological diagnostic questions, and offer evidence-based neuro-hacks.`,
    };
  }
}

// Keyboard for interactive coaching dialogues (clean & minimal to avoid clutter)
function getInteractiveCoachingKeyboard(language: string = "fa") {
  const isFa = language === "fa";
  const isAr = language === "ar";
  return {
    inline_keyboard: [
      [
        {
          text: isFa ? "🔄 گفتگوی تازه" : isAr ? "🔄 محادثة جديدة" : "🔄 Fresh Chat",
          callback_data: "cmd_coach_reset",
        },
        {
          text: isFa ? "🏠 خروج به منو" : isAr ? "🏠 الرئيسية" : "🏠 Exit to Menu",
          callback_data: "cmd_menu",
        },
      ],
    ],
  };
}

// Helper to gather active user AI keys
function getActiveAIKeys(customAiKeys?: AIKeyConfig[], preferredModel?: string, telegramAiKeyId?: string): AIKeyConfig[] {
  let candidateKeys: AIKeyConfig[] = [];
  if (Array.isArray(customAiKeys) && customAiKeys.length > 0) {
    candidateKeys.push(...customAiKeys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0));
  }
  if (currentServerState.aiConfig?.analyticsAI?.keys) {
    candidateKeys.push(...currentServerState.aiConfig.analyticsAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0));
  }
  if ((currentServerState.advancedSettings as any)?.aiConfig?.analyticsAI?.keys) {
    candidateKeys.push(...(currentServerState.advancedSettings as any).aiConfig.analyticsAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0));
  }
  if (currentServerState.aiConfig?.translationAI?.keys) {
    candidateKeys.push(...currentServerState.aiConfig.translationAI.keys.filter((k) => k && typeof k.key === "string" && k.key.trim().length > 0));
  }

  // Deduplicate keys by key string
  const seenKeys = new Set<string>();
  let activeKeys: AIKeyConfig[] = [];
  for (const k of candidateKeys) {
    if (k.key && !seenKeys.has(k.key.trim())) {
      seenKeys.add(k.key.trim());
      activeKeys.push({ ...k });
    }
  }

  // If a specific telegram AI key is selected, prioritize it
  if (telegramAiKeyId && telegramAiKeyId !== "auto" && activeKeys.length > 0) {
    const selectedKeyIdx = activeKeys.findIndex((k) => k.id === telegramAiKeyId);
    if (selectedKeyIdx > -1) {
      const [matched] = activeKeys.splice(selectedKeyIdx, 1);
      if (preferredModel) {
        matched.selectedModel = preferredModel;
      }
      activeKeys.unshift(matched);
    }
  } else if (preferredModel && activeKeys.length > 0) {
    if (!activeKeys[0].selectedModel) {
      activeKeys[0].selectedModel = preferredModel;
    }
  }

  return activeKeys;
}

// Helper to calculate comprehensive live stats for AI Coach context
function getComprehensiveUserStats() {
  const habits = getHabitsSummaryFromState();
  const tasks = (currentServerState.tasks || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    completed: !!t.completed,
    priority: t.priority || "medium",
    dueDate: t.dueDate,
    streak: t.streak || 0,
  }));

  // ── Context-Aware: Real-Time Temporal & Behavioral Context ──
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun .. 6=Sat
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
  const timeOfDay: "morning" | "late_morning" | "afternoon" | "evening" | "night" =
    hour >= 5 && hour < 9 ? "morning" :
    hour >= 9 && hour < 12 ? "late_morning" :
    hour >= 12 && hour < 18 ? "afternoon" :
    hour >= 18 && hour < 22 ? "evening" : "night";

  const daysOfWeekFa = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
  const daysOfWeekEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = currentServerState.language === "fa" ? daysOfWeekFa[dayOfWeek] : currentServerState.language === "ar" ? daysOfWeekFa[dayOfWeek] : daysOfWeekEn[dayOfWeek];
  const timeLabel = currentServerState.language === "fa" ? { morning: "صبح", late_morning: "صبح دیروقت", afternoon: "بعدازظهر", evening: "عصر", night: "شب" }[timeOfDay] || "" : timeOfDay;

  // Golden Window Detection (based on Lally circadian productivity patterns)
  const goldenWindow = (hour >= 7 && hour < 11) ? "🟢 بله — پنجره طلایی بهره‌وری" :
    (hour >= 18 && hour < 21) ? "🟡 نزدیک پنجره طلایی" : "🔴 خارج از پنجره طلایی";

  // Week position in month (approximate)
  const weekOfMonth = Math.ceil((now.getDate()) / 7);
  // ── End Context-Aware ──

  const totalHabits = habits.length;
  const doneHabits = habits.filter((h: any) => h.isDoneToday).length;
  const pendingHabits = habits.filter((h: any) => !h.isDoneToday);
  const habitCompletionRate = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.completed).length;
  const pendingTasks = tasks.filter((t: any) => !t.completed);
  const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const automaticCount = habits.filter((h: any) => h.stage === "automatic").length;
  const semiAutomaticCount = habits.filter((h: any) => h.stage === "semi").length;
  const formingCount = habits.filter((h: any) => h.stage === "forming").length;
  const longestStreak = Math.max(0, ...habits.map((h: any) => h.longestStreak || 0));
  const totalDaysCompleted = habits.reduce((acc: number, h: any) => acc + (h.totalCompletedDays || 0), 0);

  // Average weekly completion rate for coach intelligence
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = now.toISOString().split("T")[0];
  let weeklyCompletionDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().split("T")[0];
    const doneOnDay = habits.filter((h: any) => {
      if (!h.completedDates || !Array.isArray(h.completedDates)) return false;
      return h.completedDates.includes(dayKey);
    }).length;
    if (totalHabits > 0 && doneOnDay > 0) weeklyCompletionDays++;
  }
  const weeklyTrend = weeklyCompletionDays >= 5 ? "📈 عالی" : weeklyCompletionDays >= 3 ? "📊 متوسط" : "📉 نیاز به تلاش";

  const walletCoins = currentServerState.wallet?.coins || 0;
  const brainLevel = (currentServerState.wallet as any)?.level || Math.floor((currentServerState.wallet?.totalCoinsEarned || 0) / 100) + 1;

  // Cognitive profile data for enriched context
  const cogProfile = currentServerState.userCognitiveProfile || {};
  const cogStrengths = Array.isArray(cogProfile.cognitiveStrengths) ? cogProfile.cognitiveStrengths.slice(0, 3) : [];
  const vulnerabilityTriggers = Array.isArray(cogProfile.vulnerabilityTriggers) ? cogProfile.vulnerabilityTriggers.slice(0, 3) : [];
  const personalAdvice = cogProfile.personalAdvice;

  // Persona feedback stats for adaptive switching
  const feedbackHistory = (currentServerState as any).coachFeedbackHistory || [];
  const recentFeedback = feedbackHistory.slice(-10);
  const goodFeedback = recentFeedback.filter((f: any) => f.rating === "good").length;
  const badFeedback = recentFeedback.filter((f: any) => f.rating === "bad").length;
  const feedbackScore = recentFeedback.length > 0 ? Math.round((goodFeedback / recentFeedback.length) * 100) : 50;

  return {
    // ── Core Stats ──
    habits, tasks,
    totalHabits, doneHabits, pendingHabits, habitCompletionRate,
    totalTasks, doneTasks, pendingTasks, taskCompletionRate,
    automaticCount, semiAutomaticCount, formingCount,
    longestStreak, totalDaysCompleted, walletCoins, brainLevel,
    // ── Context-Aware (NEW) ──
    timeOfDay, dayOfWeek, isWeekend, dayName, timeLabel, goldenWindow, weekOfMonth,
    currentHour: hour,
    weeklyCompletionDays, weeklyTrend,
    // ── Cognitive Profile (NEW) ──
    cogStrengths, vulnerabilityTriggers, personalAdvice,
    // ── Feedback Stats (NEW) ──
    feedbackScore, goodFeedback, badFeedback, totalFeedbackGiven: feedbackHistory.length,
  };
}

// 2-Way Interactive AI Coaching Dialogue Function with Full Stats & Adaptive Memory
async function askAICoachInteractiveDialogue(options: {
  userMessage: string;
  chatId: string | number;
  dialogueContext?: 'reminder' | 'warning' | 'inquiry' | 'general' | 'friendly_chat';
  habitsSummary?: any[];
  language?: string;
  overridePersona?: string;
  pendingHabits?: any[];
}): Promise<{ reply: string; personaUsed: string }> {
  const {
    userMessage,
    chatId,
    dialogueContext = 'friendly_chat',
    language = "fa",
    overridePersona,
  } = options;

  const isFa = language === "fa";
  const isAr = language === "ar";
  const persona = getPersonaDetails(overridePersona, language);
  const preferredModel = currentServerState.telegramConfig?.aiModelPreference || "gemini-2.5-flash";
  const telegramAiKeyId = currentServerState.telegramConfig?.telegramAiKeyId;

  // 1. Gather comprehensive real-time statistics
  const stats = getComprehensiveUserStats();

  // 2. Retrieve existing multi-turn dialogue history (all previous turns preserved)
  const historyTurns = getDialogueHistory(chatId);
  const historyFormatted = historyTurns.length > 0
    ? historyTurns.map((turn) => `${turn.role === 'user' ? 'User (کاربر)' : `Coach (${persona.name})`}: ${turn.text}`).join("\n\n")
    : "شروع اولین نوبت از گفتگوی جدید.";

  // 3. Accumulated cognitive memory & learned profile
  const cognitiveProfile = currentServerState.userCognitiveProfile || {
    learnedUserPatterns: [],
    vulnerabilityTriggers: [],
    cognitiveStrengths: [],
    userGoalsAndPreferences: [],
  };

  const systemInstruction = `You are the user's friendly AI habit & focus coach chatting 1-on-1 on Telegram.
Selected Coach Persona: ${persona.name}.
${persona.systemInstruction}

CRITICAL RULES (قوانین بسیار مهم برای جلوگیری از شلوغی و پیام‌های طولانی):
1. EXTREME BREVITY & WARMTH (بسیار کوتاه، صمیمی، خودمانی و جمع‌وجور):
   - Your reply MUST be SHORT: 1 to 2 short paragraphs at most (around 2 to 4 sentences in total!).
   - ABSOLUTELY FORBIDDEN: Long lectures, essays, numbered lists, bullet points, multiple bold headers, or wall of text.
   - Reply directly, warmly, and naturally, exactly like a real caring mentor texting a friend.
2. SUBTLE STATS INTEGRATION:
   - Casually mention relevant habit numbers in just 1 short phrase if helpful (e.g. "دیدم امروز ۱ از ۲ عادتت ثبت شده"). Do NOT generate big tables or stat summaries.
3. CONVERSATIONAL FLOW:
   - End with ONE simple, encouraging question or light check-in (e.g., "می‌تونی ۲ دقیقه براش وقت بذاری؟" or "الان حس و انرژیت چطوره؟").
4. FORMATTING:
   - Clean Telegram HTML with minimal, tasteful emojis. Keep it uncluttered, compact, and pleasant to read.
Language: ${isFa ? "Respond exclusively in warm, natural, friendly conversational Persian (فارسی خودمانی، بسیار کوتاه، جمع‌وجور و دلنشین)." : isAr ? "Respond in warm, concise Arabic." : "Respond in warm, concise English."}`;

  const prompt = `=== CONVERSATION SCENARIO ===
User's message: "${userMessage}"

=== RECENT DIALOGUE HISTORY ===
${historyFormatted}

=== TODAY'S QUICK STATS ===
Habits: ${stats.doneHabits}/${stats.totalHabits} done (${stats.habitCompletionRate}%). Tasks: ${stats.doneTasks}/${stats.totalTasks} done. Coins: ${stats.walletCoins}.

=== INSTRUCTION ===
Respond as ${persona.name}. Keep your answer VERY SHORT (maximum 2 to 4 sentences). Warm, friendly, direct, and uncluttered. End with a light check-in question.`;

  const activeKeys = getActiveAIKeys([], preferredModel, telegramAiKeyId);
  let replyText = "";

  if (activeKeys.length > 0 || process.env.GEMINI_API_KEY) {
    try {
      const completionPromise = executeMultiProviderCompletion({
        keys: activeKeys,
        systemPrompt: systemInstruction,
        prompt,
        temperature: 0.5,
        responseJson: false,
      });
      const timeoutPromise = new Promise<{ text: string }>((_, reject) =>
        setTimeout(() => reject(new Error("AI dialogue timeout (12s)")), 12000)
      );

      const res = await Promise.race([completionPromise, timeoutPromise]);
      if (res && res.text && res.text.trim()) {
        replyText = res.text.trim();
      }
    } catch (err: any) {
      console.warn("[askAICoachInteractiveDialogue] AI execution error:", err?.message || err);
    }
  }

  // High-craft deterministic fallback matching the selected persona and live statistics (short & friendly)
  if (!replyText) {
    const statsNoteFa = stats.totalHabits > 0
      ? `(امروز ${stats.doneHabits} از ${stats.totalHabits} عادتت ثبت شده)`
      : ``;

    if (persona.key === "coach") {
      replyText = isFa
        ? `🔥 <b>سلام رفیق!</b> پیامت رو خواندم. ${statsNoteFa ? statsNoteFa + " و " : ""}نگران افت انرژی نباش؛ مهم اینه که بازی رو نبازی! 🚀\n\nالان کوچک‌ترین کاری که در ۲ دقیقه می‌تونی براش انجام بدی چیه؟ برام بنویس تا با هم بریم جلو.`
        : `🔥 <b>Hey friend!</b> I hear you loud and clear (${stats.habitCompletionRate}% today). What is the single smallest 2-minute action you can take right now? Reply to me!`;
    } else if (persona.key === "strict") {
      replyText = isFa
        ? `⚡ <b>سلام.</b> پیامت دریافت شد. آمار امروزت: ${stats.doneHabits} از ${stats.totalHabits} عادت ثبت شده (${stats.habitCompletionRate}٪).\n\nتعلل و فکر زیاد فقط مقاومت ذهن رو بیشتر می‌کنه؛ آماده‌ای همین الان با یک گام ۲ دقیقه‌ای شروع کنی؟`
        : `⚡ <b>Direct Check:</b> Today is ${stats.habitCompletionRate}% complete. Stop overthinking and take the 2-minute step now. Ready?`;
    } else if (persona.key === "zen") {
      replyText = isFa
        ? `🌿 <b>سلام دوست خوبم.</b> پیامت رو با جان و دل شنیدم. با خودت مهربان باش؛ مسیر رشد پر از فراز و نشیب‌های طبیعیه.\n\nچه کار کوچک و آرامی همین حالا بهت حس بهتری میده؟ هر وقت خواستی برام بنویس.`
        : `🌿 <b>Peace, friend.</b> Be kind to yourself today. What gentle small step feels natural right now?`;
    } else {
      replyText = isFa
        ? `🔬 <b>سلام!</b> پیامت بررسی شد. در مدل لالی، هنگام خستگی مغز برای حفظ انرژی اصطکاک نشان میده ${statsNoteFa}.\n\nبا یک اقدام سریع ۲ دقیقه‌ای، مدار عصبی عادتت رو زنده نگه دار. می‌تونی همین الان امتحانش کنی؟`
        : `🔬 <b>Neuro Coach:</b> When friction spikes, the brain conserves energy. Run a 2-minute micro-activation to keep synapses firing. Ready to test it?`;
    }
  }

  // Record dialogue turns for seamless multi-turn continuity
  addDialogueTurn(chatId, 'user', userMessage);
  addDialogueTurn(chatId, 'assistant', replyText);

  // Update persistent cognitive profile from dialogue insights (Continuous Learning)
  updateUserCognitiveProfileFromDialogue(userMessage, replyText, persona.name, language);

  return { reply: replyText, personaUsed: persona.key };
}

// Ask AI Behavioral Coach dedicated question with full habit + task memory context
async function askAICoach(
  question: string, 
  matrix: any, 
  language: string = "fa", 
  customAiKeys?: AIKeyConfig[],
  overridePersona?: string
): Promise<string> {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const persona = getPersonaDetails(overridePersona, language);
  const preferredModel = currentServerState.telegramConfig?.aiModelPreference || "gemini-2.5-flash";
  const telegramAiKeyId = currentServerState.telegramConfig?.telegramAiKeyId;

  const systemInstruction = `You are a world-class behavioral scientist, habit formation coach, and executive function specialist based on Dr. Phillippa Lally's (2010) habit automaticity research.
You possess deep memory and contextual understanding of the user's habits, daily tasks, streaks, and cognitive patterns.
${persona.systemInstruction}
Provide a concise, practical, empowering, and scientifically grounded response (max 3-4 paragraphs) formatted nicely with bullet points and emojis.
Language rule: ${isFa ? "Respond exclusively in fluent, inspiring, professional Persian (فارسی سلیس و جذاب با فرمت‌بندی زیبا)." : isAr ? "Respond in fluent, encouraging, classical Arabic (عربية فصحى)." : "Respond in fluent, motivating, scientific English."}`;

  const prompt = `User's question or dilemma: "${question}"
User's comprehensive behavioral profile & context:
=== HABITS ===
${JSON.stringify(matrix?.habitsAnalysis || matrix?.habitsSummary || matrix, null, 2)}

=== TASKS & TIME EXECUTION ===
${JSON.stringify(matrix?.tasksAnalysis || "No tasks data", null, 2)}

=== ACCUMULATED AI COGNITIVE MEMORY ===
${JSON.stringify(matrix?.previousCognitiveProfile || currentServerState.userCognitiveProfile || "Initial Session", null, 2)}

Provide personalized coaching addressing their specific situation based on your persona (${persona.name}).`;

  const activeKeys = getActiveAIKeys(customAiKeys, preferredModel, telegramAiKeyId);

  if (activeKeys.length > 0 || process.env.GEMINI_API_KEY) {
    try {
      const completionPromise = executeMultiProviderCompletion({
        keys: activeKeys,
        systemPrompt: systemInstruction,
        prompt,
        temperature: 0.4,
        responseJson: false,
      });
      const timeoutPromise = new Promise<{ text: string }>((_, reject) =>
        setTimeout(() => reject(new Error("AI coaching completion timeout (10s)")), 10000)
      );

      const res = await Promise.race([completionPromise, timeoutPromise]);

      if (res && res.text && res.text.trim()) {
        return res.text.trim();
      }
    } catch (err: any) {
      console.warn("[askAICoach] Multi-provider AI fallback triggered:", err?.message || err);
    }
  }

  // Fallback response based on Lally behavioral principles
  if (isFa) {
    return `🧠 <b>پاسخ مربی هوشمند علوم اعصاب و روانشناسی رفتار:</b>\n\n` +
      `در مواجهه با این چالش رفتاری، سه اصل علمی مدل لالی (۲۰۱۰) را مدنظر قرار دهید:\n\n` +
      `۱. <b>کاهش مقاومت اولیه (قانون ۲ دقیقه):</b> اندازه گام اول را به کمتر از ۲ دقیقه تقلیل دهید تا کورتکس پیش‌پیشانی (PFC) دچار خستگی نشود.\n` +
      `۲. <b>اصل بخشش یک‌روزه:</b> افت تصادفی یک روزه مسیرهای سیناپسی را تخریب نمی‌کند، مشروط بر آنکه از وقوع ۲ روز غیبت متوالی اکیداً پیشگیری فرمایید.\n` +
      `۳. <b>هم‌افزایی با روتین‌های تثبیت‌شده (Habit Stacking):</b> رفتار مورد نظر را دقیقاً بعد از یکی از عادات با درصد خودکارشدگی بالای خود پیوند دهید.\n\n` +
      `<i>با استمرار روزانه، میلین‌سازی رشته‌های عصبی شما تکمیل خواهد شد!</i> 🌟`;
  } else if (isAr) {
    return `🧠 <b>إجابة مدرب علم الأعصاب وتكوين العادات:</b>\n\n` +
      `وفقاً لنموذج لالي (2010)، إليك أهم الإرشادات:\n\n` +
      `1. <b>قاعدة الدقيقتين:</b> بسّط بداية السلوك لتقليل المقاومة الذهنية.\n` +
      `2. <b>مرونة اليوم الواحد:</b> تفويت يوم واحد لا يلغي بناء العادة، احرص فقط على عدم تكراره.\n` +
      `3. <b>ربط العادات:</b> اربط هذا الهدف بروتين صباحي أو مسائي ثابت.\n\n` +
      `<i>الاستمرارية هي مفتاح التلقائية العصبية!</i> 🌟`;
  } else {
    return `🧠 <b>Neuroscience Habit Coach Advice:</b>\n\n` +
      `Based on Dr. Lally's automaticity model (2010):\n\n` +
      `1. <b>2-Minute Rule:</b> Minimize activation energy so starting requires zero cognitive resistance.\n` +
      `2. <b>Single-Miss Resiliency:</b> 1 slip does not erase synaptic pathways; prevent 2 consecutive misses.\n` +
      `3. <b>Habit Stacking:</b> Anchor this desired action to an established daily routine.\n\n` +
      `<i>Daily consistency drives neural automaticity!</i> 🌟`;
  }
}

// Formats full rich Telegram HTML report
function formatTelegramReportHTML(reportData: any, habitsSummary: any[], language: string, dateFormatted?: string) {
  const isFa = language === "fa";
  const isAr = language === "ar";

  let tgText = `📊 <b>${reportData.title || (isFa ? "گزارش تخصصی ردیاب علمی عادات و وظایف" : isAr ? "تقرير تحليل العادات والمهام اليومي" : "Daily Behavioral & Tasks Analysis Report")}</b>\n`;
  if (dateFormatted) {
    tgText += `📅 <i>${dateFormatted}</i>\n`;
  }

  const engineNotice = reportData.generationEngine === 'ai'
    ? (isFa ? `🤖 <i>تولید شده توسط هوش مصنوعی (${reportData.providerUsed || 'مدل هوش مصنوعی'})</i>` : isAr ? `🤖 <i>تم الإنشاء بواسطة الذكاء الاصطناعي (${reportData.providerUsed || 'AI'})</i>` : `🤖 <i>Generated by Artificial Intelligence (${reportData.providerUsed || 'AI'})</i>`)
    : (isFa ? `🧮 <i>تولید شده توسط الگوریتم ریاضی و مدل علوم اعصاب لالی (آفلاین)</i>` : isAr ? `🧮 <i>تم الإنشاء بواسطة الخوارزمية الرياضية وعلم الأعصاب (بدون ذكاء اصطناعي)</i>` : `🧮 <i>Generated by Mathematical Neuroscience Algorithm (Offline)</i>`);

  tgText += `${engineNotice}\n\n`;

  tgText += `📈 <b>${isFa ? "خلاصه وضعیت شناختی و عملکرد:" : isAr ? "ملخص الحالة والأداء:" : "Progress Overview:"}</b>\n${reportData.overview}\n\n`;

  if (habitsSummary && habitsSummary.length > 0) {
    tgText += `📋 <b>${isFa ? "آمار و پیشرفت تفکیکی هر عادت:" : isAr ? "الإحصائيات التفصيلية لكل عادة:" : "Detailed Habit Statistics:"}</b>\n`;
    for (const h of habitsSummary) {
      const isDone = !!h.isDoneToday;
      const statusEmoji = isDone ? "✅" : "⏳";
      const statusText = isDone
        ? isFa ? "انجام شد" : isAr ? "تم الإنجاز" : "Completed"
        : isFa ? "در انتظار" : isAr ? "قيد الانتظار" : "Pending";

      const autoScore = typeof h.automaticity === "number" ? h.automaticity : 0;
      const autoBadge = autoScore >= 70 ? "🟢" : autoScore >= 40 ? "🟡" : "🔵";
      const streak = typeof h.currentStreak === "number" ? h.currentStreak : 0;
      const bestStreak = typeof h.longestStreak === "number" ? h.longestStreak : streak;
      const doneDays = typeof h.totalCompletedDays === "number" ? h.totalCompletedDays : 0;
      const remaining = typeof h.remainingDays === "number" ? h.remainingDays : Math.max(0, 66 - doneDays);

      tgText += `• <b>${h.name}</b> ${statusEmoji} (${statusText})\n`;
      tgText += `  ├ ${autoBadge} ${isFa ? "خودکارشدگی عصبی" : isAr ? "التلقائية" : "Automaticity"}: <b>${autoScore}٪</b>\n`;
      tgText += `  ├ 🔥 ${isFa ? "زنجیره فعلی" : isAr ? "السلسلة الحالية" : "Current Streak"}: <b>${streak}</b> ${isFa ? "روز" : isAr ? "أيام" : "d"} | ⚡ ${isFa ? "بیشترین" : isAr ? "الأعلى" : "Best"}: <b>${bestStreak}</b>\n`;
      tgText += `  └ 📅 ${isFa ? "روزهای ثبت‌شده" : isAr ? "الأيام المسجلة" : "Logged Days"}: <b>${doneDays}</b> ${isFa ? "روز" : isAr ? "أيام" : "d"} (${remaining > 0 ? (isFa ? `${remaining} روز تا ۶۶ روز` : isAr ? `متبقي ${remaining} يوماً` : `${remaining}d to 66d`) : (isFa ? "تثبیت‌شده 🏆" : isAr ? "مكتمل 🏆" : "Target reached 🏆")})\n`;
    }
    tgText += `\n`;
  }

  if (reportData.tasksFeedback) {
    tgText += `🎯 <b>${isFa ? "وضعیت تسک‌ها و مدیریت وظایف اجرایی:" : isAr ? "حالة المهام التنفيذية:" : "Executive Tasks Status:"}</b>\n`;
    tgText += `• ${isFa ? "درصد تکمیل" : "Completion"}: <b>${reportData.tasksFeedback.completionRate}٪</b>\n`;
    tgText += `• ${reportData.tasksFeedback.overdueAnalysis}\n`;
    tgText += `• 💡 <i>${reportData.tasksFeedback.procrastinationTip}</i>\n\n`;
  }

  if (reportData.habitFeedback && reportData.habitFeedback.length > 0) {
    tgText += `🔍 <b>${isFa ? "تحلیل رفتاری و کوچینگ عادات:" : isAr ? "تحليل السلوك والتوجيه:" : "Habit Feedback & Coaching:"}</b>\n`;
    for (const item of reportData.habitFeedback) {
      const icon =
        item.status === "automatic"
          ? "🏆"
          : item.status === "warning"
          ? "⚠️"
          : item.status === "improving"
          ? "🚀"
          : "🔹";
      tgText += `${icon} <b>${item.name}</b>: ${item.critiqueAndTip}\n`;
    }
    tgText += `\n`;
  }

  if (reportData.generalCritique) {
    tgText += `🧠 <b>${isFa ? "تحلیل و نقد عملکرد:" : isAr ? "نقد وتحليل الأداء العام:" : "General Behavioral Critique:"}</b>\n${reportData.generalCritique}\n\n`;
  }

  if (reportData.actionableTips && reportData.actionableTips.length > 0) {
    tgText += `💡 <b>${isFa ? "پیشنهادها و راهکارهای علمی:" : isAr ? "نصائح وإرشادات علمية:" : "Actionable Neuroscience Tips:"}</b>\n`;
    for (const tip of reportData.actionableTips) {
      tgText += `• ${tip}\n`;
    }
    tgText += `\n`;
  }

  if (reportData.motivationalQuote) {
    tgText += `✨ <b>${isFa ? "جمله انگیزشی روز:" : isAr ? "اقتباس اليوم المحفز:" : "Daily Motivational Quote:"}</b>\n<blockquote>${reportData.motivationalQuote}</blockquote>\n\n`;
  }

  tgText += `🔬 <i>مدل خودکارسازی عصبی Lally 2010</i>`;
  return tgText;
}

// Endpoint: Generate Comprehensive AI Habit & Tasks Report with Cognitive Memory
app.post("/api/ai/report", async (req, res) => {
  try {
    const {
      habitsSummary: rawHabitsSummary,
      habits: rawHabits,
      tasks: rawTasks,
      wallet: rawWallet,
      language = "fa",
      botToken,
      chatId,
      sendToTelegram = false,
      dateFormatted,
      aiKeys,
    } = req.body;

    const habitsSummary = Array.isArray(rawHabitsSummary) 
      ? rawHabitsSummary 
      : (Array.isArray(rawHabits) ? rawHabits : (currentServerState.habits || []));

    const habits = Array.isArray(rawHabits) ? rawHabits : (currentServerState.habits || []);
    const tasks = Array.isArray(rawTasks) ? rawTasks : (currentServerState.tasks || []);
    const wallet = rawWallet || currentServerState.wallet;

    // Build the complete multi-dimensional user matrix
    const matrix = buildComprehensiveUserBehavioralMatrix(
      habitsSummary,
      tasks,
      wallet,
      language,
      dateFormatted
    );

    const langInstructions: Record<string, string> = {
      fa: `زبان خروجی باید کاملاً فارسی سلیس، بسیار عمیق، محترمانه و دقیق بر مبنای علوم اعصاب باشد.`,
      ar: `يجب أن تكون لغة الإخراج باللغة العربية الفصحى الأنيقة والمهنية والمحفزة علمياً.`,
      en: `The output language must be fluent, empowering, and scientific English.`,
    };

    const prompt = `You are a world-class behavioural neuroscientist, executive function psychologist, and habit formation coach based on Dr. Phillippa Lally's landmark study (2010, European Journal of Social Psychology) on habit automaticity.

You are analyzing the user's complete multi-dimensional behavioral dataset:

=== HABITS & NEURAL FORMATION ===
${JSON.stringify(matrix.habitsAnalysis, null, 2)}

=== TASKS & CONSCIOUS EXECUTIVE ACTION ===
${JSON.stringify(matrix.tasksAnalysis, null, 2)}

=== TEMPORAL, CIRCADIAN & STREAK PATTERNS ===
${JSON.stringify(matrix.temporalPatterns, null, 2)}

=== ACCUMULATED PREVIOUS AI COGNITIVE MEMORY ===
${JSON.stringify(matrix.previousCognitiveProfile || "Initial Session (No prior memory)", null, 2)}

Today's date: ${dateFormatted || new Date().toISOString().split("T")[0]}
Language rule: ${langInstructions[language] || langInstructions.fa}

Perform deep learning and comprehensive behavioral synthesis on this user. Formulate a report AND an updated User Cognitive Memory Profile that captures their patterns, strengths, vulnerability triggers, and custom neuro-hacks so you remember and coach them smarter over time.

Output strictly valid JSON matching this exact structure:
{
  "title": "Short catchy inspiring title for today's holistic report",
  "overview": "Holistic executive summary analyzing habits momentum, task completion rate, and cognitive state",
  "habitFeedback": [
    {
      "name": "Habit name",
      "status": "improving" | "warning" | "automatic" | "steady",
      "critiqueAndTip": "Specific observation, constructive critique, and actionable tip for this habit"
    }
  ],
  "tasksFeedback": {
    "totalTasksAnalyzed": number,
    "completionRate": number,
    "overdueAnalysis": "Constructive behavioral insight into pending/overdue tasks, priority balance, and cognitive friction",
    "procrastinationTip": "Concrete psychological antidote (e.g., 2-minute rule, task-chunking, implementation intentions)"
  },
  "generalCritique": "Deep holistic critique linking habit consistency with task follow-through and mental energy management",
  "actionableTips": [
    "Tip 1...",
    "Tip 2...",
    "Tip 3..."
  ],
  "motivationalQuote": "Inspiring closing quote on persistence and neuroplastic growth",
  "userCognitiveProfile": {
    "lastUpdated": "${dateFormatted || new Date().toISOString().split("T")[0]}",
    "learnedUserPatterns": [
      "Pattern 1 (e.g. Strong habit execution in morning routines)",
      "Pattern 2 (e.g. High priority tasks delayed when routine has >3 items)"
    ],
    "cognitiveStrengths": [
      "Strength 1...",
      "Strength 2..."
    ],
    "vulnerabilityTriggers": [
      "Vulnerability window 1 (e.g. Weekend transition drop-off)",
      "Vulnerability window 2 (e.g. High friction evening tasks)"
    ],
    "tailoredNeuroHacks": [
      "Custom hack 1 based on their specific habits/tasks...",
      "Custom hack 2..."
    ],
    "automaticityMilestones": [
      {
        "habitName": "Habit Name",
        "currentScore": number,
        "projectedTargetDate": "YYYY-MM-DD",
        "stage": "forming"
      }
    ],
    "circadianProductivity": {
      "peakHours": "e.g. Morning 08:00 - 12:00",
      "bestDays": "e.g. Saturday to Tuesday",
      "highRiskTimeframe": "e.g. Evenings after 20:00"
    },
    "taskHabitSynergyScore": number,
    "procrastinationRiskIndex": number,
    "holisticMasteryIndex": number,
    "personalAdvice": "Personalized heartfelt coaching guidance from the AI based on accumulated knowledge"
  }
}`;

    const reportData = await generateAIReport(
      prompt,
      matrix,
      language,
      dateFormatted,
      aiKeys
    );

    let telegramSent = false;
    let telegramError: string | null = null;

    if (sendToTelegram && botToken && chatId) {
      try {
        const tgText = formatTelegramReportHTML(reportData, habitsSummary, language, dateFormatted);
        const cleanToken = String(botToken).trim().replace(/^bot/i, "");
        const cleanChatId = String(chatId).trim();
        const keyboards = getStandardKeyboards(language);

        const shouldSendVisualChart = currentServerState.telegramConfig?.sendVisualCharts !== false;

        // If visual charts enabled, send infographic chart photo first
        if (shouldSendVisualChart && habitsSummary.length > 0) {
          const chartUrl = generateHabitsChartUrl(habitsSummary, language);
          const isFa = language === "fa";
          const isAr = language === "ar";
          const chartCaption = isFa
            ? `📊 <b>${reportData.title || "گزارش تحلیلی عادات و پیشرفت عصبی"}</b>\n<i>اینفوگرافیک و نمودار خودکارشدگی عادات (مدل لالی ۲۰۱۰)</i>`
            : isAr
            ? `📊 <b>${reportData.title || "تقرير العادات والتقدم العصبي"}</b>\n<i>مخطط التلقائية والترسيخ العصبي (نموذج لالي)</i>`
            : `📊 <b>${reportData.title || "Habit Neural Formation Report"}</b>\n<i>Visual Habit Automaticity Chart (Lally 2010)</i>`;

          await sendTelegramPhoto(cleanToken, cleanChatId, chartUrl, chartCaption);
        }

        const sent = await sendTelegramMessage(cleanToken, cleanChatId, tgText, keyboards.inlineMarkup);

        if (sent.ok) {
          telegramSent = true;
        } else {
          telegramError = getTelegramFriendlyErrorMessage(sent.description || "خطا در تحویل پیام به تلگرام", language);
        }
      } catch (err: any) {
        console.error("Failed to send telegram report:", err);
        telegramError = err.message || "خطای ارسال به تلگرام";
      }
    }

    return res.json({
      success: true,
      report: reportData,
      userCognitiveProfile: reportData.userCognitiveProfile || currentServerState.userCognitiveProfile,
      telegramSent,
      telegramError,
    });
  } catch (err: any) {
    console.error("AI Report generation error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در تولید گزارش هوش مصنوعی",
    });
  }
});

// Endpoint: Retrieve Stored User Cognitive Memory Profile
app.get("/api/ai/cognitive-profile", (req, res) => {
  return res.json({
    success: true,
    profile: currentServerState.userCognitiveProfile || null,
  });
});

// Endpoint: Reset/Clear Stored User Cognitive Memory Profile
app.post("/api/ai/cognitive-profile/reset", (req, res) => {
  currentServerState.userCognitiveProfile = null;
  saveServerStateToDisk();
  return res.json({
    success: true,
    message: "پروفایل حافظه شناختی هوش مصنوعی بازنشانی گردید.",
  });
});

// ---------------------------------------------------------------------------
// PROACTIVE COACH API — کنترل و مشاهدهٔ موتور مربی پیش‌دستانه
// ---------------------------------------------------------------------------

// وضعیت و تشخیص‌های مربی پیش‌دستانه
app.get("/api/proactive/status", (req, res) => {
  try {
    const diagnostics = getProactiveDiagnostics(currentServerState);
    return res.json({ success: true, ...diagnostics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "خطا در دریافت وضعیت" });
  }
});

// تنظیمات مربی پیش‌دستانه
app.get("/api/proactive/config", (req, res) => {
  return res.json({ success: true, config: getProactiveConfig(currentServerState) });
});

app.post("/api/proactive/config", (req, res) => {
  try {
    const patch = req.body?.config || req.body || {};
    const updated = setProactiveConfig(currentServerState, patch);
    saveServerStateToDisk();
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "خطا در ذخیرهٔ تنظیمات" });
  }
});

// اجرای دستی یک چرخه (برای تست)
app.post("/api/proactive/run", async (req, res) => {
  try {
    const result = await runProactiveCycle(new Date());
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "خطا در اجرای چرخه" });
  }
});

// پیش‌نمایش اقدام‌های پیش‌دستانه فعلی (بدون ارسال)
app.get("/api/proactive/preview", (req, res) => {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const habits = (currentServerState.habits || []).map((h: any) => ({
      ...h,
      ...(function () {
        try { return calculateHabitStatsOnServer(h, todayStr, currentServerState.language || "fa"); } catch { return {}; }
      })(),
    }));
    const misses = detectConsecutiveMisses(habits, todayStr);
    const windows = learnGoldenWindows(habits);
    const risk = computeRelapseRisk(habits, currentServerState.tasks || [], todayStr, now);
    return res.json({ success: true, todayStr, misses, windows, risk });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "خطا در پیش‌نمایش" });
  }
});

// ثبت بازخورد دستی/خارجی روی رویدادهای پیش‌دستانه
app.post("/api/proactive/feedback", (req, res) => {
  try {
    const { action = "acted", key = "manual", type = "incomplete_today" } = req.body || {};
    registerProactiveFeedback(action, key, type);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "خطا در ثبت بازخورد" });
  }
});

// Endpoint: Interactive AI Behavioral Coach Consultation
app.post("/api/ai/coach/ask", async (req, res) => {
  try {
    const { question, habits, tasks, wallet, language = "fa", aiKeys } = req.body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "سوال یا موضوع مشاوره ارسال نشده است.",
      });
    }

    const habitsData = Array.isArray(habits) ? habits : currentServerState.habits || [];
    const tasksData = Array.isArray(tasks) ? tasks : currentServerState.tasks || [];
    const walletData = wallet || currentServerState.wallet;

    const matrix = buildComprehensiveUserBehavioralMatrix(
      habitsData,
      tasksData,
      walletData,
      language
    );

    const answer = await askAICoach(question.trim(), matrix, language, aiKeys);

    return res.json({
      success: true,
      answer,
      userCognitiveProfile: currentServerState.userCognitiveProfile || null,
    });
  } catch (err: any) {
    console.error("Error in /api/ai/coach/ask:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در برقراری ارتباط با مربی هوش مصنوعی",
    });
  }
});

// Endpoint: Live Fetch Model Lists for any AI Provider
app.post("/api/ai/fetch-models", async (req, res) => {
  try {
    const { key = "", provider = "gemini" } = req.body;
    const result = await fetchLiveModelsFromProvider(key, provider);
    return res.json(result);
  } catch (err: any) {
    console.error("Error in /api/ai/fetch-models:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در استعلام مدل‌های هوش مصنوعی",
    });
  }
});

// Endpoint: Test Single AI Key with lightweight ping
app.post("/api/ai/test-key", async (req, res) => {
  try {
    const { key, provider = "gemini", model } = req.body;
    if (!key || typeof key !== "string" || !key.trim()) {
      return res.status(400).json({
        success: false,
        error: "کلید API جهت تست ارسال نشده است.",
      });
    }
    const result = await testSingleAIKey(key.trim(), provider, model);
    return res.json(result);
  } catch (err: any) {
    console.error("Error in /api/ai/test-key:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در تست اتصال کلید هوش مصنوعی",
    });
  }
});

// Endpoint: Update and persist AI Configuration directly
app.post("/api/settings/ai", (req, res) => {
  try {
    const { aiConfig } = req.body;
    if (aiConfig && typeof aiConfig === "object") {
      currentServerState.aiConfig = aiConfig;
      if (!currentServerState.advancedSettings) {
        currentServerState.advancedSettings = {} as any;
      }
      (currentServerState.advancedSettings as any).aiConfig = aiConfig;
      saveServerStateToDisk();
      return res.json({
        success: true,
        message: "تنظیمات هوش مصنوعی با موفقیت در دیسک سرور ثبت و به‌روزرسانی شد.",
      });
    }
    return res.status(400).json({
      success: false,
      error: "داده‌های ساختار کلیدهای هوش مصنوعی نامعتبر است.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Fast, 100% Free Non-AI Web Translation Engine (High speed parallel processing)
async function translateTextWithFreeEngine(
  text: string,
  targetLang: string = "fa",
  sourceLang: string = "auto"
): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";

  // Split into safe chunks (up to 850 characters per chunk)
  const rawParagraphs = clean.split(/\n\s*\n/);
  const chunks: string[] = [];

  for (const rawPara of rawParagraphs) {
    const para = rawPara.trim();
    if (!para) continue;

    if (para.length <= 850) {
      chunks.push(para);
      continue;
    }

    const lines = para.split(/\n+/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.length <= 850) {
        chunks.push(line);
        continue;
      }

      const sentences = line.split(/(?<=[.!?؟؛…])\s+/);
      let accumulated = "";

      for (const sent of sentences) {
        const trimmedSent = sent.trim();
        if (!trimmedSent) continue;

        if (trimmedSent.length > 850) {
          if (accumulated) {
            chunks.push(accumulated.trim());
            accumulated = "";
          }
          const words = trimmedSent.split(/\s+/);
          let wordChunk = "";
          for (const w of words) {
            if ((wordChunk + " " + w).length > 850) {
              if (wordChunk) chunks.push(wordChunk.trim());
              wordChunk = w;
            } else {
              wordChunk = wordChunk ? wordChunk + " " + w : w;
            }
          }
          if (wordChunk) chunks.push(wordChunk.trim());
        } else if ((accumulated + " " + trimmedSent).length > 850) {
          if (accumulated) chunks.push(accumulated.trim());
          accumulated = trimmedSent;
        } else {
          accumulated = accumulated ? accumulated + " " + trimmedSent : trimmedSent;
        }
      }
      if (accumulated) {
        chunks.push(accumulated.trim());
      }
    }
  }

  if (chunks.length === 0) chunks.push(clean.substring(0, 750));

  const mobileUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
  const desktopUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const decodeHtml = (str: string): string => {
    if (!str) return "";
    return str
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  // Function to translate a single chunk with multi-endpoint fallback
  const translateChunk = async (chunk: string): Promise<string> => {
    if (!chunk.trim()) return "";

    // 1. Primary: Google Mobile Web Translate (Extremely reliable, bypasses datacenter blocks, returns clean HTML)
    try {
      const mobileUrl = `https://translate.google.com/m?sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(chunk)}`;
      const res0 = await fetch(mobileUrl, {
        headers: {
          "User-Agent": mobileUserAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res0.ok) {
        const html = await res0.text();
        const match = html.match(/<div class="result-container">([\s\S]*?)<\/div>/);
        if (match && match[1]) {
          const trans = decodeHtml(match[1]).trim();
          if (trans && trans.length > 0) {
            return trans;
          }
        }
      }
    } catch {}

    // 2. Secondary: Googleapis GTX via GET
    try {
      const gtxGetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
      const res2 = await fetch(gtxGetUrl, {
        headers: { "User-Agent": desktopUserAgent },
        signal: AbortSignal.timeout(4000),
      });

      if (res2.ok) {
        const rawJson2 = (await res2.json()) as any;
        if (Array.isArray(rawJson2) && Array.isArray(rawJson2[0])) {
          const trans2 = rawJson2[0]
            .map((item: any) => (Array.isArray(item) ? item[0] : ""))
            .filter(Boolean)
            .join("");
          if (trans2 && trans2.trim().length > 0) {
            return trans2.trim();
          }
        }
      }
    } catch {}

    // 3. Tertiary: Googleapis GTX via POST
    try {
      const gtxPostUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t`;
      const res1 = await fetch(gtxPostUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "User-Agent": desktopUserAgent,
          "Accept": "*/*",
        },
        body: new URLSearchParams({ q: chunk }).toString(),
        signal: AbortSignal.timeout(4000),
      });

      if (res1.ok) {
        const rawJson = (await res1.json()) as any;
        if (Array.isArray(rawJson) && Array.isArray(rawJson[0])) {
          const trans = rawJson[0]
            .map((item: any) => (Array.isArray(item) ? item[0] : ""))
            .filter(Boolean)
            .join("");
          if (trans && trans.trim().length > 0) {
            return trans.trim();
          }
        }
      }
    } catch {}

    // 4. Quaternary: clients5 Google Translate (client=dict-chrome-ex via POST)
    try {
      const clients5Url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLang}&tl=${targetLang}`;
      const res3 = await fetch(clients5Url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          "User-Agent": desktopUserAgent,
        },
        body: new URLSearchParams({ q: chunk }).toString(),
        signal: AbortSignal.timeout(4000),
      });

      if (res3.ok) {
        const rawJson3 = (await res3.json()) as any;
        if (Array.isArray(rawJson3) && Array.isArray(rawJson3[0])) {
          const trans3 = rawJson3[0][0];
          if (typeof trans3 === "string" && trans3.trim().length > 0) {
            return trans3.trim();
          }
        } else if (typeof rawJson3 === "string" && rawJson3.trim().length > 0) {
          return rawJson3.trim();
        }
      }
    } catch {}

    // 5. Quinary: Fallback MyMemory for short sub-chunk
    try {
      const sub = chunk.length > 450 ? chunk.substring(0, 450) : chunk;
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sub)}&langpair=${sourceLang === 'auto' ? 'en' : sourceLang}|${targetLang}`;
      const res4 = await fetch(myMemoryUrl, { signal: AbortSignal.timeout(4000) });
      if (res4.ok) {
        const data = (await res4.json()) as any;
        if (data.responseData?.translatedText && !data.responseData.translatedText.includes('MYMEMORY WARNING')) {
          return data.responseData.translatedText.trim();
        }
      }
    } catch {}

    return chunk;
  };

  // Run chunks with controlled concurrency of 3 for fast processing
  const results: string[] = new Array(chunks.length);
  const concurrency = 3;
  let cursor = 0;

  const chunkWorker = async () => {
    while (cursor < chunks.length) {
      const idx = cursor++;
      const res = await translateChunk(chunks[idx]);
      results[idx] = res || chunks[idx];
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => chunkWorker())
  );
  return results.join("\n\n");
}

// Helper: Standardize chapter title to clean "فصل [شماره]: [عنوان]" or "فصل [شماره]"
function cleanServerChapterTitle(
  rawTitle: string,
  chapterNumber: number | null,
  language: string = "fa"
): string {
  const isFa = language === "fa";
  const isAr = language === "ar";

  let num: number | null = typeof chapterNumber === "number" && chapterNumber > 0 ? chapterNumber : null;
  const str = (rawTitle || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.(html?|xhtml|txt|epub|pdf|md)$/i, "")
    .replace(/[_.\-]*(?:raw|v\d+|1080p|720p|scan|asura|reaper|flame|boxnovel|wuxia|webnovel).*$/i, "")
    .replace(/\s*[|\-—–]\s*(?:Webnovel|ReadNovelFull|NovelFull|Novels|WuxiaWorld|LightNovel|LightNovelPub|ناول|رمان|Novel Updates|BoxNovel|RoyalRoad|ScribbleHub|MoonQuill|Free Web Novel|Read free novel online|Read light novel online).*$/i, "")
    .trim();

  const normalized = str
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  if (num === null) {
    const matchNum = normalized.match(/(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)[\s_.:#-]*([0-9]{1,5})/i)
      || normalized.match(/(?:第\s*([0-9]{1,5})\s*(?:章|话|回)|([0-9]{1,5})\s*(?:화|장|章|话|回))/i)
      || normalized.match(/^(?:[#=*_\-\[\]()~`\s]*)([0-9]{1,5})\s*[:\-\—\–.]/);
    if (matchNum && matchNum[1]) {
      const parsed = parseInt(matchNum[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        num = parsed;
      }
    }
  }

  const finalNum = num !== null && num > 0 ? num : null;
  const prefix = finalNum !== null
    ? (isFa ? `فصل ${finalNum}` : isAr ? `الفصل ${finalNum}` : `Chapter ${finalNum}`)
    : (isFa ? "فصل" : "Chapter");

  // Subtitle extraction
  let sub = "";
  const sepMatch = normalized.match(/(?:(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)?[\s_.:#-]*[0-9]{1,5}|[#=*_~`]+)\s*[:\-\—\–.]\s*(.+)$/i);
  if (sepMatch && sepMatch[1]) {
    sub = sepMatch[1].trim();
  } else {
    const afterNumMatch = normalized.match(/(?:chapter|ch\.|ch|chap|فصل|چپتر)[\s_.:#-]*[0-9]{1,5}\s+([^\n\r]+)$/i);
    if (afterNumMatch && afterNumMatch[1]) {
      sub = afterNumMatch[1].trim();
    }
  }

  if (sub) {
    sub = sub
      .replace(/^[#=*\-_\[\]()~`\s:–—]+/, "")
      .replace(/[#=*\-_\[\]()~`\s:–—]+$/, "")
      .replace(/^(?:chapter|ch\.|ch|chap|فصل|چپتر)[\s_.:#-]*[0-9]{1,5}\s*[:\-\—\–.]?\s*/i, "")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (
      sub.length > 45 ||
      /^[0-9\s]+$/.test(sub) ||
      (finalNum !== null && sub === String(finalNum)) ||
      /^(?:chapter|ch|فصل|چپتر|part|episode)[\s_.:#-]*[0-9]+$/i.test(sub) ||
      /(?:read novel|freewebnovel|boxnovel|novelfull|all chapters|updated)/i.test(sub) ||
      (sub.length > 25 && /[.!?؟؛…]$/.test(sub))
    ) {
      sub = "";
    }
  }

  if (sub && sub.length > 1) {
    return `${prefix}: ${sub}`;
  }
  return prefix;
}

// Helper: High-speed AI Novel Translation with parallel chunking and automatic free engine fallback
async function translateNovelWithGemini(
  text: string,
  title: string = "",
  targetLang: string = "fa",
  aiKeys?: AIKeyConfig[]
): Promise<{ title: string; content: string; engineUsed: string }> {
  const isFa = targetLang === "fa";
  const isAr = targetLang === "ar";
  const langName = isFa ? "Persian (Farsi - فارسی سلیس، روان و ادبی)" : isAr ? "Arabic (العربية الفصحى)" : "English";

  const cleanText = text.trim();
  if (!cleanText) {
    return { title: title.trim(), content: "", engineUsed: "none" };
  }

  const activeKeys = [...(aiKeys && aiKeys.length > 0 ? aiKeys : (currentServerState.aiConfig?.translationAI?.keys || []))];
  if (activeKeys.length === 0 && process.env.GEMINI_API_KEY) {
    activeKeys.push({
      key: process.env.GEMINI_API_KEY,
      provider: 'gemini',
      selectedModel: 'gemini-2.5-flash',
      availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
      isValid: true,
    });
  }
  if (activeKeys.length === 0 && currentServerState.aiConfig?.analyticsAI?.keys?.length) {
    activeKeys.push(...currentServerState.aiConfig.analyticsAI.keys);
  }

  // If no AI keys are available at all, immediately use high-speed Free Web Engine
  if (activeKeys.length === 0) {
    console.info("[translateNovel] No AI keys available, using Free Web Translation Engine...");
    const cleanedTitle = title && title.trim() ? cleanServerChapterTitle(title, null, targetLang) : title;
    const [translatedTitle, translatedContent] = await Promise.all([
      cleanedTitle && cleanedTitle.trim() ? translateTextWithFreeEngine(cleanedTitle, targetLang) : Promise.resolve(cleanedTitle),
      translateTextWithFreeEngine(cleanText, targetLang),
    ]);
    return {
      title: cleanServerChapterTitle(translatedTitle || cleanedTitle, null, targetLang),
      content: translatedContent || cleanText,
      engineUsed: "free_engine",
    };
  }

  // Modern Gemini models handle large chapter contexts (8,500 characters per chunk)
  const CHUNK_SIZE = 8500;
  const chunks: string[] = [];

  if (cleanText.length <= CHUNK_SIZE) {
    chunks.push(cleanText);
  } else {
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = "";
    for (const p of paragraphs) {
      if ((currentChunk + "\n\n" + p).length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  }

  // Translate title task
  const translateTitleTask = async (): Promise<string> => {
    if (!title || !title.trim()) return title;
    const cleaned = cleanServerChapterTitle(title, null, targetLang);
    const subMatch = cleaned.match(/^(فصل\s*[0-9]+|Chapter\s*[0-9]+|الفصل\s*[0-9]+)\s*:\s*(.+)$/i);
    if (subMatch && subMatch[2] && subMatch[2].length > 1) {
      const prefix = subMatch[1];
      const sub = subMatch[2];
      try {
        const titlePrompt = `Translate this web novel chapter title into ${langName}. Return ONLY the short translated title text without quotes:\n\n${sub}`;
        const titleResp = await executeMultiProviderCompletion({
          keys: activeKeys,
          prompt: titlePrompt,
          temperature: 0.2,
        });
        if (titleResp.text) {
          const transSub = titleResp.text.replace(/^["'«]+|["'»]+$/g, "").trim();
          if (transSub && transSub.length > 0 && transSub.length < 50) {
            return `${prefix}: ${transSub}`;
          }
        }
      } catch {
        try {
          const freeSub = await translateTextWithFreeEngine(sub, targetLang);
          if (freeSub && freeSub.length > 0 && freeSub.length < 50) {
            return `${prefix}: ${freeSub.trim()}`;
          }
        } catch {}
      }
      return `${prefix}: ${sub}`;
    }
    return cleaned;
  };

  // Translate single chunk with retry and fallback
  const translateSingleAIChunk = async (chunk: string, idx: number): Promise<string> => {
    const prompt = `You are a professional literary novel translator specializing in web novels and light novels.
Translate the following story excerpt into ${langName}.

Requirements:
1. Deliver a natural, fluent, and immersive literary translation.
2. Translate all dialogue with natural tone and emotional depth.
3. Preserve paragraph breaks (double newlines).
4. Do NOT omit or summarize any sentences.
5. Return ONLY the translated story text.

Novel Text to Translate:
${chunk}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const chunkRes = await executeMultiProviderCompletion({
          keys: activeKeys,
          prompt,
          temperature: 0.3,
        });

        if (chunkRes.text && chunkRes.text.trim().length > 10) {
          return chunkRes.text.trim();
        }
      } catch (err: any) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    // Failover to Free Engine for this chunk
    try {
      const freeRes = await translateTextWithFreeEngine(chunk, targetLang);
      if (freeRes && freeRes.trim().length > 5) {
        return freeRes.trim();
      }
    } catch {}

    return chunk;
  };

  // Run Title translation and All Chunks in parallel for instant turnaround
  const [translatedTitle, ...translatedChunks] = await Promise.all([
    translateTitleTask(),
    ...chunks.map((chunk, idx) => translateSingleAIChunk(chunk, idx)),
  ]);

  return {
    title: translatedTitle || title,
    content: translatedChunks.join("\n\n"),
    engineUsed: "ai_with_failover",
  };
}

// Endpoint: AI Extract & Translate Novel Chapter from HTML
app.post("/api/gemini/extract-html-novel", async (req, res) => {
  try {
    const {
      htmlContent,
      fileName = "",
      language = "fa",
      translateTo,
      useTranslation = false,
      translationEngine = "ai",
      aiKeys,
    } = req.body;

    if (!htmlContent || typeof htmlContent !== "string") {
      return res.status(400).json({
        success: false,
        error: "محتوای HTML ارائه نشده است.",
      });
    }

    const isFa = language === "fa";
    const isAr = language === "ar";
    const targetLang = translateTo || (isFa ? "fa" : isAr ? "ar" : "en");
    const activeKeys = [...(aiKeys && aiKeys.length > 0 ? aiKeys : (currentServerState.aiConfig?.translationAI?.keys || []))];
    if (activeKeys.length === 0 && process.env.GEMINI_API_KEY) {
      activeKeys.push({
        key: process.env.GEMINI_API_KEY,
        provider: 'gemini',
        selectedModel: 'gemini-2.5-flash',
        availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
        isValid: true,
      });
    }

    // 1. Comprehensive regex & DOM-like extraction of full content
    const fallbackClean = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(?:p|div|h[1-6]|li|br|tr|blockquote|article|section)[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();

    // 2. Intelligent Regex Title & Chapter Number Detection from HTML <title>, <h1-h3>, meta tags, and filename
    let detectedTitle = "";
    let detectedChapterNum: number | null = null;

    // Search <title>, meta[property='og:title'], <h1>, <h2>, <h3>
    const titleTagMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = htmlContent.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
    const h1Match = htmlContent.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);

    const rawTitleCandidate = (h1Match ? h1Match[1] : ogTitleMatch ? ogTitleMatch[1] : titleTagMatch ? titleTagMatch[1] : "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s*[|\-—–]\s*(?:Webnovel|ReadNovelFull|NovelFull|Novels|WuxiaWorld|LightNovel|ناول|رمان|Novel Updates|BoxNovel).*$/i, "")
      .trim();

    if (rawTitleCandidate.length > 1) {
      detectedTitle = rawTitleCandidate;
    }

    // Number extraction patterns from title, filename, and header sample (supports CJK, Arabic/Persian, and English)
    const combinedSample = `${detectedTitle} ${fileName} ${fallbackClean.substring(0, 800)}`;
    const normalizedDigitsSample = combinedSample.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

    const patterns = [
      /(?:第|chapter|ch\.|ch|فصل|چپتر|قسمت|الفصل|part|episode|ep|vol|vol\.|volume)\s*([0-9]{1,5})/i,
      /(?:^|[\s_.-])([0-9]{1,5})\s*(?:章|话|回|화|장)/i,
      /(?:^|[\s_.-])(?:chapter|ch|فصل|چپتر)[\s_.-]*([0-9]{1,5})/i,
      /^([0-9]{1,5})[\s_.:-]+/i,
      /(?:^|[\s_.-])([0-9]{1,5})$/i
    ];

    for (const pat of patterns) {
      const match = normalizedDigitsSample.match(pat);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
          detectedChapterNum = parsed;
          break;
        }
      }
    }

    let resultJson: any = null;

    // If AI is available, use AI for high-precision metadata extraction (Chapter title, exact chapter number)
    if (activeKeys.length > 0) {
      const sampleForAI = (fallbackClean.substring(0, 3500) + "\n\n[HTML Title/Headers: " + (detectedTitle || fileName) + "]").trim();
      const systemPrompt = `You are a specialized AI Web Novel Parser and Metadata Extractor.
Given the header / introductory text of a novel chapter (Filename: "${fileName}", Candidate Title: "${detectedTitle || 'Unknown'}"):
1. Extract the EXACT Chapter Title (e.g. "Chapter 50: The Ancient Awakening" or "فصل ۵۰: بیداری کهن").
2. Extract the TRUE Chapter Number as an integer (e.g. 50). Do NOT default to 1 if the novel is chapter 50, 150, or any higher number! If it's Chapter 50, chapterNumber MUST be 50.
3. Detect the source language ("en", "zh", "ko", "ja", "fa", "ar").`;

      const prompt = `Here is the chapter header sample:
\`\`\`text
${sampleForAI}
\`\`\`

Return a valid JSON object with:
- "title": string
- "chapterNumber": number or null
- "detectedLanguage": string`;

      try {
        const aiMetadataRes = await executeMultiProviderCompletion({
          keys: activeKeys,
          systemPrompt,
          prompt,
          temperature: 0.1,
          responseJson: true,
        });

        if (aiMetadataRes.text) {
          let raw = aiMetadataRes.text.trim();
          if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed) {
              resultJson = parsed;
            }
          } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                resultJson = JSON.parse(match[0]);
              } catch {}
            }
          }
        }
      } catch (err: any) {
        console.warn("AI Chapter metadata extraction error:", err?.message || err);
      }
    }

    let finalTitle = resultJson?.title || detectedTitle || (fileName ? fileName.replace(/\.[^/.]+$/, "") : (isFa ? "فصل رمان" : "Novel Chapter"));
    let finalChapterNum = typeof resultJson?.chapterNumber === "number" && resultJson.chapterNumber > 0
      ? resultJson.chapterNumber
      : detectedChapterNum;

    let finalContent = fallbackClean;
    let isTranslated = false;

    // 3. Complete, 100% Guaranteed Translation across ALL chunks (No truncation)
    if (useTranslation && finalContent.trim().length > 0) {
      if (translationEngine === "free" || activeKeys.length === 0) {
        console.info(`Translating complete HTML chapter "${finalTitle}" via Free Web Engine...`);
        try {
          const [transTitle, transContent] = await Promise.all([
            finalTitle ? translateTextWithFreeEngine(finalTitle, targetLang) : Promise.resolve(finalTitle),
            translateTextWithFreeEngine(finalContent, targetLang),
          ]);
          if (transContent && transContent.trim().length > 20) {
            finalContent = transContent;
            finalTitle = transTitle || finalTitle;
            isTranslated = true;
          }
        } catch (e) {
          console.warn("Free translation error:", e);
        }
      } else {
        try {
          console.info(`Translating complete HTML chapter "${finalTitle}" with Multi-Chunk AI Engine...`);
          const transRes = await translateNovelWithGemini(finalContent, finalTitle, targetLang, activeKeys);
          if (transRes.content && transRes.content.trim().length > 20) {
            finalContent = transRes.content;
            finalTitle = transRes.title || finalTitle;
            isTranslated = true;
          }
        } catch (transErr) {
          console.warn("AI translation error, falling back to Free Web Engine:", transErr);
          try {
            const [transTitle, transContent] = await Promise.all([
              finalTitle ? translateTextWithFreeEngine(finalTitle, targetLang) : Promise.resolve(finalTitle),
              translateTextWithFreeEngine(finalContent, targetLang),
            ]);
            if (transContent && transContent.trim().length > 20) {
              finalContent = transContent;
              finalTitle = transTitle || finalTitle;
              isTranslated = true;
            }
          } catch {}
        }
      }
    }

    // Calculate audit metrics for 100% completeness assurance
    const wordCount = finalContent.split(/\s+/).filter(Boolean).length;
    const paragraphCount = finalContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    return res.json({
      success: true,
      title: finalTitle,
      chapterNumber: finalChapterNum,
      content: finalContent,
      detectedLanguage: resultJson?.detectedLanguage || "auto",
      translated: isTranslated,
      stats: {
        wordCount,
        paragraphCount,
        charCount: finalContent.length,
        isComplete: true,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/gemini/extract-html-novel:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در پردازش فایل HTML",
    });
  }
});

// Endpoint: AI-Powered Chapter Number & Title Extractor from HTML/Text Snippets (Batch-Enabled)
app.post("/api/translation/extract-chapters-metadata", async (req, res) => {
  try {
    const { items = [], aiKeys = [], language = "fa" } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "فهرست آیتم‌ها جهت استخراج شماره فصل ارائه نشده است.",
      });
    }

    const isFa = language === "fa";

    // 1. Fast Baseline Heuristic Extraction
    const baselineResults = items.map((item: any) => {
      const rawSnippet = typeof item.snippet === "string" ? item.snippet : "";
      const fileName = typeof item.fileName === "string" ? item.fileName : "";
      const cleanSnippet = rawSnippet
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ");

      const normalized = cleanSnippet
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

      let detectedNum: number | null = null;
      let detectedTitle = "";

      // Check title tag
      const titleMatch = cleanSnippet.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const titleText = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      // Check specific chapter headings (h1, h2, h3, or elements with chapter in class/id)
      const headingMatches = [
        ...cleanSnippet.matchAll(/<(?:h[1-4]|div|p|span)[^>]*(?:class|id)=["'][^"']*(?:chapter|chr-|chap|cha-|title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[1-4]|div|p|span)>/gi),
        ...cleanSnippet.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi),
      ];

      const candidateHeaders: string[] = [];
      if (titleText) candidateHeaders.push(titleText);
      for (const m of headingMatches) {
        const text = m[1].replace(/<[^>]+>/g, "").trim();
        if (text && text.length > 1 && text.length < 150) {
          candidateHeaders.push(text);
        }
      }

      // Regex patterns
      const chapterPatterns = [
        /(?:第\s*([0-9]{1,5})\s*(?:章|话|回)|([0-9]{1,5})\s*(?:화|장|章|话|回))/i,
        /(?:^|[\s_.:#\-[\]()])(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)[\s_.:#-]*([0-9]{1,5})(?:\s*[:\-\—\–.]\s*([^\n<]+)|\s*([^\n<]*))/i,
        /(?:^|[\s_.:#\-[\]()])([0-9]{1,5})\s*[:\-\—\–.]\s*([^\n<0-9]+)/i,
        /(?:^|[\s_.-])(?:chapter|ch|فصل|چپتر)[\s_.-]*([0-9]{1,5})/i,
      ];

      for (const cand of candidateHeaders) {
        const normCand = cand
          .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
          .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

        for (const pat of chapterPatterns) {
          const match = normCand.match(pat);
          if (match) {
            const numStr = match[1] || match[2];
            const parsed = parseInt(numStr, 10);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              detectedNum = parsed;
              detectedTitle = cleanServerChapterTitle(cand, parsed, language);
              break;
            }
          }
        }
        if (detectedNum !== null) break;
      }

      // If still not found, check filename
      if (detectedNum === null && fileName) {
        const normFileName = fileName
          .replace(/\.[^/.]+$/, "")
          .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
          .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

        for (const pat of chapterPatterns) {
          const match = normFileName.match(pat);
          if (match) {
            const numStr = match[1] || match[2];
            const parsed = parseInt(numStr, 10);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              detectedNum = parsed;
              detectedTitle = cleanServerChapterTitle(fileName, parsed, language);
              break;
            }
          }
        }

        if (detectedNum === null) {
          const standaloneDigit = normFileName.match(/(?:^|[^0-9])([0-9]{1,5})(?:[^0-9]|$)/);
          if (standaloneDigit && standaloneDigit[1]) {
            const parsed = parseInt(standaloneDigit[1], 10);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
              detectedNum = parsed;
              detectedTitle = isFa ? `فصل ${parsed}` : `Chapter ${parsed}`;
            }
          }
        }
      }

      return {
        id: item.id,
        fileName,
        chapterNumber: detectedNum,
        title: detectedTitle || (detectedNum ? (isFa ? `فصل ${detectedNum}` : `Chapter ${detectedNum}`) : fileName.replace(/\.[^/.]+$/, "")),
        detectedBy: detectedNum !== null ? "heuristic" : "none",
      };
    });

    // 2. Prepare Candidate AI Keys in priority order:
    // First: Keys configured in Advanced Settings (translationAI section) passed in request
    // Second: Keys stored on server under translationAI
    // Third: Environment GEMINI_API_KEY as fallback
    const candidateKeys: any[] = [];
    const seenKeys = new Set<string>();

    const registerKey = (k: any, defaultProvider = "gemini", label?: string) => {
      if (!k) return;
      const keyStr = typeof k === "string" ? k.trim() : (k.key || "").trim();
      if (!keyStr || seenKeys.has(keyStr)) return;
      seenKeys.add(keyStr);
      const detected = detectProviderFromKey(keyStr);
      candidateKeys.push({
        key: keyStr,
        provider: (typeof k === "object" && k.provider && k.provider !== "auto" && k.provider !== "unknown") ? k.provider : (detected || defaultProvider),
        selectedModel: (typeof k === "object" && k.selectedModel) ? k.selectedModel : undefined,
        availableModels: (typeof k === "object" && Array.isArray(k.availableModels)) ? k.availableModels : undefined,
        label: (typeof k === "object" && k.label) ? k.label : label,
      });
    };

    if (Array.isArray(aiKeys)) {
      aiKeys.forEach((k: any, idx: number) => registerKey(k, "gemini", `کلید ${idx + 1} (تنظیمات ترجمه)`));
    }
    const serverTranslationKeys = currentServerState.aiConfig?.translationAI?.keys || [];
    if (Array.isArray(serverTranslationKeys)) {
      serverTranslationKeys.forEach((k: any, idx: number) => registerKey(k, "gemini", `کلید سرور ${idx + 1}`));
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      registerKey({
        key: process.env.GEMINI_API_KEY.trim(),
        provider: "gemini",
        selectedModel: "gemini-3.8-flash",
        label: "کلید پیش‌فرض سیستم (Gemini)",
      });
    }

    // If NO keys at all, return baseline with explicit warning
    if (candidateKeys.length === 0) {
      return res.json({
        success: true,
        results: baselineResults,
        noMoreKeys: true,
        allKeysFailed: false,
        warning: isFa
          ? "⚠️ هیچ کلید هوش مصنوعی فعالی در بخش تنظیمات پیشرفته (بخش هوش مصنوعی ترجمه) تنظیم نشده است. استخراج فصول با الگوریتم سریع محلی انجام شد."
          : "No active AI keys configured in Advanced Settings (Translation). Used heuristic extraction.",
        keyUsed: null,
      });
    }

    // Chunk items into optimized batches of 25 for fast inference
    const batchSize = 25;
    const finalResultsMap = new Map<string, { chapterNumber: number | null; title: string }>();

    // Populate baseline
    for (const b of baselineResults) {
      finalResultsMap.set(b.id, { chapterNumber: b.chapterNumber, title: b.title });
    }

    let workingKeyIndex = Math.max(0, Math.min(Number(req.body.activeKeyIndex) || 0, candidateKeys.length - 1));
    let lastKeySwitchInfo: { switched: boolean; previousKey?: any; currentKey?: any; message?: string } = { switched: false };
    let hadKeyFailure = false;
    let failureWarning: string | null = null;

    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const chunkPromptItems = chunk.map((c: any) => {
        // High-density, compact snippet to minimize token payload and latency
        const cleanSnippet = (c.snippet || "")
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
          .replace(/\s+/g, " ")
          .substring(0, 350);
        return `ID: "${c.id}"
File: "${c.fileName || ''}"
Text: "${cleanSnippet}"`;
      }).join("\n---\n");

      const systemPrompt = `You are a high-speed Chapter Number & Title Extractor for web novels.
For each item:
1. Extract the EXACT integer chapter number (e.g. Chapter 45 -> 45, 第105章 -> 105, فصل ۶۲ -> 62). Look inside text headings, title tags, and filename. If no chapter number is found, return null.
2. Extract the clean chapter title.
Strict requirement: Return ONLY a valid JSON array of objects:
[{"id": "...", "chapterNumber": 45, "title": "..."}]`;

      try {
        const resAI = await executeMultiProviderCompletion({
          keys: candidateKeys,
          startIndex: workingKeyIndex,
          systemPrompt,
          prompt: chunkPromptItems,
          temperature: 0.1,
          responseJson: true,
          maxOutputTokens: 1500,
        });

        if (resAI.keyIndexUsed !== undefined && resAI.keyIndexUsed !== workingKeyIndex) {
          lastKeySwitchInfo = {
            switched: true,
            previousKey: {
              index: workingKeyIndex,
              provider: candidateKeys[workingKeyIndex]?.provider || "سابق",
            },
            currentKey: {
              index: resAI.keyIndexUsed,
              provider: resAI.providerUsed,
              model: resAI.modelUsed,
              label: candidateKeys[resAI.keyIndexUsed]?.label || `کلید شماره ${resAI.keyIndexUsed + 1}`,
            },
            message: resAI.keySwitchMessage || (isFa
              ? `🔄 کلید هوش مصنوعی تعویض شد: اکنون از کلید شماره ${resAI.keyIndexUsed + 1} (${resAI.providerUsed} - ${resAI.modelUsed}) استفاده می‌شود.`
              : `Switched to key #${resAI.keyIndexUsed + 1} (${resAI.providerUsed} - ${resAI.modelUsed}).`),
          };
          workingKeyIndex = resAI.keyIndexUsed;
        }

        const aiResponseText = resAI.text || "";
        if (aiResponseText) {
          let parsedList: any[] = [];
          let raw = aiResponseText.trim();
          if (raw.startsWith("```")) {
            raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
          }
          try {
            parsedList = JSON.parse(raw);
          } catch {
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
              try {
                parsedList = JSON.parse(match[0]);
              } catch {}
            }
          }

          if (Array.isArray(parsedList)) {
            for (const p of parsedList) {
              if (p && p.id) {
                const num = typeof p.chapterNumber === "number" && p.chapterNumber > 0 ? p.chapterNumber : null;
                const existing = finalResultsMap.get(p.id);
                finalResultsMap.set(p.id, {
                  chapterNumber: num !== null ? num : (existing?.chapterNumber ?? null),
                  title: (p.title && p.title.trim().length > 1) ? p.title.trim() : (existing?.title || ""),
                });
              }
            }
          }
        }
      } catch (aiErr: any) {
        console.warn("[extract-chapters-metadata] AI batch execution error across available keys:", aiErr?.message);
        hadKeyFailure = true;
        failureWarning = isFa
          ? "⚠️ سهمیه کلیدهای هوش مصنوعی در بخش تنظیمات پیشرفته (ترجمه) به پایان رسیده یا خطایی رخ داده و کلید دیگری در دسترس نیست. استخراج فصول با الگوریتم سریع محلی انجام شد."
          : "AI keys exhausted quota or failed, and no alternative key is available. Used heuristic extraction.";
      }
    }

    const mergedResults = baselineResults.map((b: any) => {
      const fromAi = finalResultsMap.get(b.id);
      const finalNum = fromAi?.chapterNumber ?? b.chapterNumber;
      return {
        id: b.id,
        fileName: b.fileName,
        chapterNumber: finalNum,
        title: fromAi?.title || b.title || (finalNum ? (isFa ? `فصل ${finalNum}` : `Chapter ${finalNum}`) : b.fileName),
        source: fromAi?.chapterNumber ? "ai" : b.detectedBy,
      };
    });

    const activeKeyConfig = candidateKeys[workingKeyIndex];

    return res.json({
      success: true,
      results: mergedResults,
      keyUsed: {
        index: workingKeyIndex,
        provider: activeKeyConfig?.provider || "gemini",
        model: activeKeyConfig?.selectedModel || "gemini-3.8-flash",
        label: activeKeyConfig?.label || `کلید شماره ${workingKeyIndex + 1}`,
      },
      keySwitched: lastKeySwitchInfo.switched,
      previousKey: lastKeySwitchInfo.previousKey,
      keySwitchMessage: lastKeySwitchInfo.message,
      noMoreKeys: hadKeyFailure,
      allKeysFailed: hadKeyFailure,
      warning: failureWarning || undefined,
    });
  } catch (err: any) {
    console.error("Error in /api/translation/extract-chapters-metadata:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "خطا در استخراج شماره فصل‌ها با هوش مصنوعی",
    });
  }
});

// Endpoint: 100% Free Web Novel Translation (Non-AI Engine)
app.post("/api/translation/free-engine", async (req, res) => {
  try {
    const {
      text,
      title = "",
      targetLang = "fa",
      sourceLang = "auto",
    } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "متن جهت ترجمه ارائه نشده است.",
      });
    }

    const cleanedTitle = title && title.trim() ? cleanServerChapterTitle(title, null, targetLang) : "";
    const subMatch = cleanedTitle.match(/^(فصل\s*[0-9]+|Chapter\s*[0-9]+|الفصل\s*[0-9]+)\s*:\s*(.+)$/i);
    let titleToTranslate = cleanedTitle;
    let titlePrefix = "";

    if (subMatch && subMatch[2]) {
      titlePrefix = subMatch[1];
      titleToTranslate = subMatch[2];
    }

    const [translatedTitle, translatedContent] = await Promise.all([
      titleToTranslate ? translateTextWithFreeEngine(titleToTranslate, targetLang, sourceLang) : Promise.resolve(""),
      translateTextWithFreeEngine(text, targetLang, sourceLang),
    ]);

    let finalTitle = cleanedTitle || title;
    if (titlePrefix && translatedTitle) {
      finalTitle = `${titlePrefix}: ${translatedTitle.trim()}`;
    } else if (translatedTitle) {
      finalTitle = cleanServerChapterTitle(translatedTitle, null, targetLang);
    }

    return res.json({
      success: true,
      title: finalTitle,
      content: translatedContent || text,
      translated: true,
      engine: "free_engine",
      targetLang,
    });
  } catch (err: any) {
    console.error("Error in /api/translation/free-engine:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در موتور ترجمه رایگان وب",
    });
  }
});

// Endpoint: Dedicated AI Novel Translation with Free Engine Auto-Fallback
app.post("/api/gemini/translate-novel", async (req, res) => {
  try {
    const {
      text,
      title = "",
      targetLang = "fa",
      sourceLang = "auto",
      engine = "auto", // 'ai' | 'free' | 'auto'
      aiKeys,
    } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "متن جهت ترجمه ارائه نشده است.",
      });
    }

    // If explicit free engine requested
    if (engine === "free") {
      const [translatedTitle, translatedContent] = await Promise.all([
        title && title.trim() ? translateTextWithFreeEngine(title, targetLang, sourceLang) : Promise.resolve(title),
        translateTextWithFreeEngine(text, targetLang, sourceLang),
      ]);
      return res.json({
        success: true,
        title: translatedTitle || title,
        content: translatedContent || text,
        translated: true,
        engine: "free_engine",
        targetLang,
      });
    }

    const activeKeys = aiKeys && aiKeys.length > 0 ? aiKeys : (currentServerState.aiConfig?.translationAI?.keys || []);
    if (activeKeys.length === 0 && process.env.GEMINI_API_KEY) {
      activeKeys.push({
        key: process.env.GEMINI_API_KEY,
        provider: 'gemini',
        selectedModel: 'gemini-2.5-flash',
        availableModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
        isValid: true,
      });
    }
    if (activeKeys.length === 0 && currentServerState.aiConfig?.analyticsAI?.keys?.length) {
      activeKeys.push(...currentServerState.aiConfig.analyticsAI.keys);
    }

    const result = await translateNovelWithGemini(text, title, targetLang, activeKeys);

    return res.json({
      success: true,
      title: result.title,
      content: result.content,
      translated: true,
      engineUsed: result.engineUsed,
      targetLang,
    });
  } catch (err: any) {
    console.error("Error in /api/gemini/translate-novel:", err);
    // Ultimate safety fallback to Free Engine so translation NEVER fails completely!
    try {
      console.info("[translate-novel] AI error caught, attempting ultimate Free Engine fallback...");
      const freeTitle = req.body.title ? await translateTextWithFreeEngine(req.body.title, req.body.targetLang || "fa") : req.body.title;
      const freeContent = await translateTextWithFreeEngine(req.body.text, req.body.targetLang || "fa");
      if (freeContent && freeContent.length > 10) {
        return res.json({
          success: true,
          title: freeTitle || req.body.title,
          content: freeContent,
          translated: true,
          engineUsed: "free_engine_fallback",
          targetLang: req.body.targetLang || "fa",
        });
      }
    } catch (fallbackErr) {
      console.warn("Ultimate fallback failed:", fallbackErr);
    }

    return res.status(500).json({
      success: false,
      error: err.message || "خطا در ترجمه رمان",
    });
  }
});

// ================= SERVER BACKGROUND NOVEL TRANSLATION API =================
// 1. Create or enqueue new server translation job
app.post("/api/translation/server-jobs", (req, res) => {
  try {
    const {
      novelId,
      novelTitle,
      author,
      genre,
      synopsis,
      coverGradient,
      price,
      pricePerChapter,
      isPriceLocked,
      targetLang,
      engine,
      aiKeys,
      chapters,
    } = req.body;

    if (!novelTitle || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({
        success: false,
        error: "عنوان رمان و حداقل یک فصل جهت ترجمه در سرور الزامی است.",
      });
    }

    const job = createOrEnqueueServerJob({
      novelId,
      novelTitle,
      author,
      genre,
      synopsis,
      coverGradient,
      price,
      pricePerChapter,
      isPriceLocked,
      targetLang: targetLang || "fa",
      engine: engine || "free",
      aiKeys: aiKeys && Array.isArray(aiKeys) && aiKeys.length > 0 ? aiKeys : currentServerState.aiConfig?.translationAI?.keys,
      chapters,
    });

    return res.json({
      success: true,
      jobId: job.id,
      job,
      message: "عملیات ترجمه در پس‌زمینه سرور با موفقیت آغاز شد.",
    });
  } catch (err: any) {
    console.error("[ServerTranslation] Error creating job:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در ایجاد تسک ترجمه در سرور",
    });
  }
});

// 2. Get all server translation jobs
app.get("/api/translation/server-jobs", (req, res) => {
  try {
    const full = req.query.full === "true";
    const jobs = full ? getAllServerJobs() : getAllServerJobsSummary();
    return res.json({
      success: true,
      jobs,
      activeCount: jobs.filter((j: any) => j.status === "running" || j.status === "queued").length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "خطا در دریافت لیست تسک‌های سرور",
    });
  }
});

// 3. Get single server translation job
app.get("/api/translation/server-jobs/:id", (req, res) => {
  try {
    const job = getServerJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: "تسک ترجمه یافت نشد." });
    }
    return res.json({ success: true, job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Pause server translation job
app.post("/api/translation/server-jobs/:id/pause", (req, res) => {
  try {
    const ok = pauseServerJob(req.params.id);
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Resume server translation job
app.post("/api/translation/server-jobs/:id/resume", (req, res) => {
  try {
    const ok = resumeServerJob(req.params.id);
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete or cancel server translation job
app.delete("/api/translation/server-jobs/:id", (req, res) => {
  try {
    const ok = deleteServerJob(req.params.id);
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Background Keepalive Self-Ping & Telegram Handshake (Server Sleep Prevention)
app.get("/api/keepalive", (req, res) => {
  res.json({
    status: "alive",
    timestamp: Date.now(),
    uptime: process.uptime(),
    botPolling: botPollingActive,
  });
});

app.post("/api/telegram/keepalive-ping", async (req, res) => {
  try {
    const token = req.body.botToken || currentServerState.telegramConfig?.botToken;
    if (!token) {
      return res.json({ success: true, message: "Server is alive (no telegram token configured)" });
    }
    const cleanToken = String(token).trim().replace(/^bot/i, "");
    // Ping Telegram API getMe - does NOT send any user messages!
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const tgData = (await tgRes.json()) as any;
    return res.json({
      success: true,
      serverAlive: true,
      telegramHandshake: tgData.ok,
      botUser: tgData.result?.username,
    });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});

// Periodic internal keepalive ping to maintain active socket connection & prevent free-tier sleep
setInterval(() => {
  const token = currentServerState.telegramConfig?.botToken;
  if (token) {
    const cleanToken = String(token).trim().replace(/^bot/i, "");
    // Quietly ping getMe to keep active network connection without sending any messages
    fetch(`https://api.telegram.org/bot${cleanToken}/getMe`).catch(() => {});
  }
}, 4 * 60 * 1000); // Every 4 minutes

// Endpoint: Send backup JSON file to Telegram
app.post("/api/telegram/backup", async (req, res) => {
  try {
    const { botToken, chatId, habits, fullBackupData, settings, language = "fa" } = req.body;

    if (!botToken || !chatId) {
      return res.status(400).json({
        success: false,
        error: "توکن ربات تلگرام و شناسه چت (Chat ID) الزامی هستند.",
      });
    }

    const habitsData = habits || (fullBackupData && fullBackupData.habits) || currentServerState.habits;
    if (!habitsData || !Array.isArray(habitsData)) {
      return res.status(400).json({
        success: false,
        error: "اطلاعات عادات برای پشتیبان‌گیری معتبر نیستند.",
      });
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();

    // Count total check-ins and active days
    let totalCheckIns = 0;
    const uniqueDates = new Set<string>();
    habitsData.forEach((h: any) => {
      if (h.history && typeof h.history === "object") {
        Object.entries(h.history).forEach(([d, v]) => {
          if (v) {
            totalCheckIns++;
            uniqueDates.add(d);
          }
        });
      }
    });

    const exportPayload = fullBackupData || {
      version: "2.0.0",
      appName: "Lally Scientific Habit Tracker",
      exportDate: new Date().toISOString(),
      metadata: {
        version: "2.0.0",
        appName: "Lally Scientific Habit Tracker",
        exportDate: new Date().toISOString(),
        timestamp,
        schemaVersion: 2,
      },
      habits: habitsData,
      settings: settings || {
        language: language || currentServerState.language || "fa",
        theme: currentServerState.themeMode || "light",
        telegramConfig: currentServerState.telegramConfig || {
          botToken: String(botToken).trim(),
          chatId: String(chatId).trim(),
          autoDailyReport: true,
          reportTime: "21:00",
        },
      },
      stats: {
        totalHabits: habitsData.length,
        totalCheckIns,
        totalActiveDays: uniqueDates.size,
      },
    };

    const backupJson = req.body.rawContent || JSON.stringify(exportPayload, null, 2);
    const resolvedFileName = req.body.customFileName || `scientific-habit-tracker-backup-${dateStr}.json`;

    const captionMap: Record<string, string> = {
      fa: `💾 <b>نسخه پشتیبان ردیاب علمی عادات و وظایف</b>\n📅 تاریخ: <code>${dateStr}</code>\n📊 تعداد عادات: <b>${habitsData.length}</b> | مجموع ثبت‌ها: <b>${totalCheckIns}</b>\n\n📌 <i>این فایل حاوی نسخه پشتیبان اطلاعات کاربر (عادات، تسک‌ها، پومودورو، تاریخچه و تنظیمات) است. برای بازگردانی، این فایل را در بخش پشتیبان‌گیری وب‌اپلیکیشن بارگذاری کنید.</i>\n🔬 <i>Lally Tracker System</i>`,
      ar: `💾 <b>نسخة احتياطية لمتتبع العادات والمهام العلمي</b>\n📅 التاريخ: <code>${dateStr}</code>\n📊 عدد العادات: <b>${habitsData.length}</b> | إجمالي السجلات: <b>${totalCheckIns}</b>\n\n📌 <i>تحتوي هذه النسخة على بياناتك الشاملة. يمكنك استعادتها من قسم النسخ الاحتياطي في التطبيق.</i>`,
      en: `💾 <b>Scientific Habit Tracker - Backup Archive</b>\n📅 Date: <code>${dateStr}</code>\n📊 Total Habits: <b>${habitsData.length}</b> | Total Check-ins: <b>${totalCheckIns}</b>\n\n📌 <i>This comprehensive backup contains user data (habits, tasks, pomodoro logs & settings). Restore it in the Backup & Restore section.</i>`,
    };

    const caption = req.body.customCaption || captionMap[language] || captionMap.fa;
    const cleanToken = String(botToken).trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId).trim();

    const formData = new FormData();
    formData.append("chat_id", cleanChatId);
    const fileBlob = new Blob([backupJson], { type: "application/json" });
    formData.append("document", fileBlob, resolvedFileName);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${cleanToken}/sendDocument`,
      {
        method: "POST",
        body: formData,
      }
    );

    const tgData = (await tgRes.json()) as { ok: boolean; description?: string };

    if (!tgRes.ok || !tgData.ok) {
      return res.status(400).json({
        success: false,
        error: tgData.description || "خطا در ارسال فایل پشتیبان به تلگرام",
      });
    }

    return res.json({
      success: true,
      message: "فایل پشتیبان کامل با موفقیت به تلگرام ارسال شد.",
    });
  } catch (err: any) {
    console.error("Telegram backup dispatch error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطای غیرمنتظره در ارسال نسخه پشتیبان به تلگرام",
    });
  }
});

// Helper: Build ZIP buffer for Web Novels
async function buildNovelsZipBuffer(novels: any[], wallet?: any, includeProgress = true): Promise<Buffer> {
  const zip = new JSZip();
  const manifest = {
    version: "2.0.0",
    appName: "Lally Scientific Habit Tracker & Novel Library",
    type: "novel_zip_backup",
    exportedAt: new Date().toISOString(),
    totalNovels: novels.length,
    totalChapters: novels.reduce((acc, n) => acc + (n.chapters?.length || n.totalChapters || 0), 0),
    novels: novels.map((n) => ({
      id: n.id,
      title: n.title,
      author: n.author || "Unknown",
      totalChapters: n.chapters?.length || n.totalChapters || 0,
      genre: n.genre || [],
      description: n.description || "",
      hasFullChapters: !!(n.chapters && n.chapters.length > 0 && n.chapters.some((c: any) => c.content && c.content.trim())),
    })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("novels.json", JSON.stringify(novels, null, 2));

  if (includeProgress && wallet) {
    const readingState = {
      unlockedNovelIds: wallet.unlockedNovelIds || [],
      unlockedChapters: wallet.unlockedChapters || {},
      readingProgress: wallet.novelReadingProgress || {},
      exportedAt: new Date().toISOString(),
    };
    zip.file("reading_state.json", JSON.stringify(readingState, null, 2));
  }

  // Create human-readable text directory inside ZIP for offline reading
  const readablesFolder = zip.folder("readables");
  if (readablesFolder) {
    for (const novel of novels) {
      if (novel.chapters && Array.isArray(novel.chapters) && novel.chapters.length > 0) {
        const safeTitle = (novel.title || novel.id).replace(/[/\\?%*:|"<>]/g, "_").slice(0, 50);
        const novelFolder = readablesFolder.folder(safeTitle);
        if (novelFolder) {
          novelFolder.file("info.txt", `Title: ${novel.title}\nAuthor: ${novel.author || "Unknown"}\nChapters: ${novel.chapters.length}\nDescription: ${novel.description || ""}`);
          for (const chap of novel.chapters) {
            const chapNum = chap.chapterNumber || 1;
            const chapTitle = (chap.title || `Chapter_${chapNum}`).replace(/[/\\?%*:|"<>]/g, "_").slice(0, 40);
            const fileName = `ch_${String(chapNum).padStart(4, "0")}_${chapTitle}.txt`;
            novelFolder.file(fileName, `${chap.title || `Chapter ${chapNum}`}\n\n${chap.content || ""}`);
          }
        }
      }
    }
  }

  const uint8 = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  return Buffer.from(uint8);
}

// Endpoint: Dispatch compressed Novel ZIP backup to Telegram (supports dedicated or primary bot)
app.post("/api/telegram/backup/novels", async (req, res) => {
  try {
    const { 
      botToken: reqBotToken, 
      chatId: reqChatId, 
      novels: reqNovels, 
      wallet: reqWallet, 
      includeProgress = true, 
      zipBase64, 
      customFileName, 
      language = "fa" 
    } = req.body;

    const tgConfig = (currentServerState.telegramConfig || {}) as any;
    const useDedicated = !!tgConfig.useDedicatedBackupBot;
    
    const activeBotToken = String(
      (useDedicated && tgConfig.backupBotToken?.trim()) 
        ? tgConfig.backupBotToken 
        : (reqBotToken || tgConfig.botToken || "")
    ).trim().replace(/^bot/i, "");

    const activeChatId = String(
      (useDedicated && tgConfig.backupChatId?.trim()) 
        ? tgConfig.backupChatId 
        : (reqChatId || tgConfig.chatId || "")
    ).trim();

    if (!activeBotToken || !activeChatId) {
      return res.status(400).json({
        success: false,
        error: language === "fa" 
          ? "توکن ربات و شناسه چت تنظیم نشده‌اند. لطفاً در تنظیمات پشتیبان‌گیری ربات را مشخص کنید." 
          : "Bot Token and Chat ID are missing. Please configure them in backup settings.",
      });
    }

    // Determine novels data
    let novelsToBackup: any[] = [];
    if (Array.isArray(reqNovels) && reqNovels.length > 0) {
      novelsToBackup = reqNovels;
    } else if (Array.isArray(currentServerState.customNovels) && currentServerState.customNovels.length > 0) {
      const delSet = new Set(currentServerState.deletedNovelIds || []);
      novelsToBackup = currentServerState.customNovels.filter((n: any) => !delSet.has(n.id));
    }

    const walletData = reqWallet || currentServerState.wallet;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Get or build ZIP buffer
    let zipBuffer: Buffer;
    if (zipBase64 && typeof zipBase64 === "string") {
      zipBuffer = Buffer.from(zipBase64, "base64");
    } else {
      zipBuffer = await buildNovelsZipBuffer(novelsToBackup, walletData, includeProgress);
    }

    const fileSizeBytes = zipBuffer.length;
    const sizeStr = fileSizeBytes < 1024 * 1024 
      ? `${(fileSizeBytes / 1024).toFixed(1)} KB` 
      : `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

    const totalChapters = novelsToBackup.reduce((acc, n) => acc + (n.chapters?.length || n.totalChapters || 0), 0);
    const resolvedFileName = customFileName || `novels-archive-${dateStr}.zip`;

    // Rich telegram caption
    const titlesList = novelsToBackup.slice(0, 5).map(n => `📖 <i>${n.title}</i> (${n.chapters?.length || n.totalChapters || 0} فصل)`).join("\n");
    const moreCount = novelsToBackup.length > 5 ? `\n... و ${novelsToBackup.length - 5} رمان دیگر` : "";

    const captionMap: Record<string, string> = {
      fa: `📚 <b>نسخه پشتیبان فشرده رمان‌ها (ZIP Archive)</b>\n\n` +
          `📅 تاریخ: <code>${dateStr} ${timeStr}</code>\n` +
          `📦 حجم فایل فشرده: <b>${sizeStr}</b>\n` +
          `📑 تعداد رمان‌ها: <b>${novelsToBackup.length}</b> رمان\n` +
          `📄 مجموع فصول: <b>${totalChapters}</b> فصل\n\n` +
          `<b>لیست رمان‌های پشتیبان‌گیری‌شده:</b>\n${titlesList || "بدون رمان"}${moreCount}\n\n` +
          `✨ <i>این فایل فشرده حاوی تمام فصول، اطلاعات کتابخانه و پیشرفت مطالعه شماست. برای بازیابی آسان، این فایل زیپ را در تب پشتیبان‌گیری برنامه بارگذاری کنید.</i>\n` +
          `🤖 <i>ربات اختصاصی پشتیبان‌گیری رمان‌ها</i>`,
      en: `📚 <b>Compressed Web Novels ZIP Backup</b>\n\n` +
          `📅 Date: <code>${dateStr} ${timeStr}</code>\n` +
          `📦 Archive Size: <b>${sizeStr}</b>\n` +
          `📑 Novels Count: <b>${novelsToBackup.length}</b> novels\n` +
          `📄 Total Chapters: <b>${totalChapters}</b> chapters\n\n` +
          `<b>Included Novels:</b>\n${titlesList || "Empty"}${moreCount}\n\n` +
          `✨ <i>This compressed ZIP archive includes all chapters, metadata, and reading progress. To restore, upload this .zip file in the Backup tab.</i>\n` +
          `🤖 <i>Dedicated Novel Backup System</i>`,
    };

    const caption = captionMap[language] || captionMap.fa;

    const formData = new FormData();
    formData.append("chat_id", activeChatId);
    const fileBlob = new Blob([zipBuffer], { type: "application/zip" });
    formData.append("document", fileBlob, resolvedFileName);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");

    const tgRes = await fetch(`https://api.telegram.org/bot${activeBotToken}/sendDocument`, {
      method: "POST",
      body: formData,
    });

    const tgData = (await tgRes.json()) as { ok: boolean; description?: string };

    if (!tgRes.ok || !tgData.ok) {
      console.error("[Telegram Novel Backup] Error:", tgData);
      if (currentServerState.telegramConfig) {
        currentServerState.telegramConfig.lastNovelBackupStatus = "failed";
        currentServerState.telegramConfig.lastNovelBackupError = tgData.description || "خطا در ارسال فایل زیپ به تلگرام";
      }
      return res.status(400).json({
        success: false,
        error: tgData.description || "خطا در ارسال فایل فشرده به تلگرام",
      });
    }

    // Update server state status
    if (currentServerState.telegramConfig) {
      currentServerState.telegramConfig.lastNovelBackupSentDate = dateStr;
      currentServerState.telegramConfig.lastNovelBackupTimestamp = Date.now();
      currentServerState.telegramConfig.lastNovelBackupStatus = "success";
      currentServerState.telegramConfig.lastNovelBackupSize = sizeStr;
      currentServerState.telegramConfig.lastNovelBackupError = undefined;
      currentServerState.telegramConfig.totalAutoNovelBackupsSent = 
        (currentServerState.telegramConfig.totalAutoNovelBackupsSent || 0) + 1;
      saveServerStateToDisk();
    }

    return res.json({
      success: true,
      message: language === "fa" 
        ? "فایل فشرده رمان‌ها با موفقیت به تلگرام ارسال شد." 
        : "Novel ZIP archive successfully sent to Telegram.",
      fileSizeBytes,
      sizeStr,
      date: dateStr,
      totalNovels: novelsToBackup.length,
      totalChapters,
    });
  } catch (err: any) {
    console.error("Telegram novel backup error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطای غیرمنتظره در ارسال نسخه فشرده رمان‌ها به تلگرام",
    });
  }
});

// Endpoint: Test dedicated Telegram Backup bot connectivity
app.post("/api/telegram/test-backup-bot", async (req, res) => {
  try {
    const { botToken, chatId, language = "fa" } = req.body;
    const cleanToken = String(botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || "").trim();

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({
        success: false,
        error: language === "fa" ? "توکن ربات و شناسه چت الزامی هستند." : "Bot Token and Chat ID are required.",
      });
    }

    // 1. Verify token with Telegram getMe
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const getMeData = (await getMeRes.json()) as { ok: boolean; result?: { username?: string; first_name?: string }; description?: string };

    if (!getMeRes.ok || !getMeData.ok) {
      return res.status(400).json({
        success: false,
        error: getMeData.description || (language === "fa" ? "توکن ربات نامعتبر است." : "Invalid bot token."),
      });
    }

    const botName = getMeData.result?.first_name || getMeData.result?.username || "Backup Bot";
    const botUser = getMeData.result?.username ? `@${getMeData.result.username}` : "";

    // 2. Send ping verification message to target chat
    const testMsg = language === "fa"
      ? `🔐 <b>آزمایش اتصال ربات اختصاصی پشتیبان‌گیری</b>\n\n✅ <b>ربات «${botName}» (${botUser}) با موفقیت به این چت متصل شد!</b>\nفایل‌های پشتیبان خودکار و دوره‌ای وب‌اپلیکیشن به این کانال/چت ارسال خواهند شد.`
      : language === "ar"
      ? `🔐 <b>اختبار اتصال بوت النسخ الاحتياطي المخصص</b>\n\n✅ <b>تم الاتصال بنجاح بالبوت «${botName}»!</b>\nسيتم إرسال النسخ الاحتياطية المجدولة إلى هذه المحادثة.`
      : `🔐 <b>Dedicated Backup Bot Connection Verified</b>\n\n✅ <b>Bot «${botName}» (${botUser}) is successfully connected!</b>\nScheduled and manual backup archives will be dispatched to this chat.`;

    const sendRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: testMsg,
        parse_mode: "HTML",
      }),
    });

    const sendData = (await sendRes.json()) as { ok: boolean; description?: string };
    if (!sendRes.ok || !sendData.ok) {
      return res.status(400).json({
        success: false,
        error: sendData.description || (language === "fa" ? "ربات قادر به ارسال پیام به این چت نیست. لطفاً ابتدا در ربات دکمه Start را بزنید یا دسترسی ارسال پیام در کانال/گروه را بررسی کنید." : "Cannot send message to this Chat ID."),
      });
    }

    // Auto-update server state config with dedicated backup bot details
    if (!currentServerState.telegramConfig) currentServerState.telegramConfig = {} as any;
    currentServerState.telegramConfig.backupBotToken = cleanToken;
    currentServerState.telegramConfig.backupChatId = cleanChatId;
    currentServerState.telegramConfig.useDedicatedBackupBot = true;
    saveServerStateToDisk();

    return res.json({
      success: true,
      botName,
      botUsername: getMeData.result?.username || "",
      message: language === "fa" ? `ربات «${botName}» با موفقیت تأیید شد و پیام تست ارسال گردید.` : "Backup bot verified successfully!",
    });
  } catch (err: any) {
    console.error("Backup bot test error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "خطای غیرمنتظره در تست ربات پشتیبان",
    });
  }
});

// Endpoint: Send Scheduled Pending Habits & Tasks Reminder (Concise & Direct)
app.post("/api/telegram/send-reminder", async (req, res) => {
  try {
    const { botToken, chatId, habits: customHabits, tasks: customTasks, language = "fa", referenceDate, isTest = false } = req.body;
    const cleanToken = String(botToken || currentServerState.telegramConfig?.botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || currentServerState.telegramConfig?.chatId || "").trim();
    const lang = language || currentServerState.language || "fa";
    const isFa = lang === "fa";
    const isAr = lang === "ar";
    const todayFormatted = referenceDate || new Date().toISOString().split("T")[0];

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({
        success: false,
        error: isFa 
          ? "توکن ربات و شناسه چت الزامی هستند. لطفاً آنها را در تنظیمات وارد نمایید."
          : "Bot Token and Chat ID are required. Please configure them in Settings.",
      });
    }

    // Auto-sync configuration and start polling if needed
    if (!currentServerState.telegramConfig) currentServerState.telegramConfig = {} as any;
    if (cleanToken !== currentServerState.telegramConfig.botToken || cleanChatId !== currentServerState.telegramConfig.chatId) {
      currentServerState.telegramConfig.botToken = cleanToken;
      currentServerState.telegramConfig.chatId = cleanChatId;
      saveServerStateToDisk();
    }
    if (!botPollingActive) {
      startBotPolling();
    }

    let habits = Array.isArray(customHabits) && customHabits.length > 0
      ? customHabits
      : (Array.isArray(currentServerState.habits) && currentServerState.habits.length > 0
          ? currentServerState.habits
          : []);

    let tasks = Array.isArray(customTasks) && customTasks.length > 0
      ? customTasks
      : (Array.isArray(currentServerState.tasks) && currentServerState.tasks.length > 0
          ? currentServerState.tasks
          : []);

    if (habits.length === 0 && tasks.length === 0 && isTest) {
      habits = [
        {
          id: "test-h1",
          name: isFa ? "مطالعه ۲۰ دقیقه کتاب تخصصی" : isAr ? "قراءة 20 دقيقة كتاب تخصصي" : "20 mins Book Reading",
          category: isFa ? "یادگیری" : "Learning",
          createdAt: todayFormatted,
          targetDays: 66,
          rewardCoins: 10,
          rewardXp: 5,
          history: { [todayFormatted]: false },
        },
        {
          id: "test-h2",
          name: isFa ? "۳۰ دقیقه ورزش و پیاده‌روی سریع" : isAr ? "30 دقيقة رياضة ومشي سريع" : "30 mins Exercise & Walk",
          category: isFa ? "ورزش" : "Fitness",
          createdAt: todayFormatted,
          targetDays: 66,
          rewardCoins: 12,
          rewardXp: 6,
          history: { [todayFormatted]: true },
        },
      ];
      tasks = [
        {
          id: "test-t1",
          title: isFa ? "ارسال گزارش هفتگی پروژه" : "Send Weekly Project Report",
          completed: false,
          priority: "high",
        },
      ];
    }

    const text = formatConciseReminderHTML(habits, tasks, lang, isTest, todayFormatted);
    const listKb = getConciseReminderKeyboard(habits, tasks, lang, todayFormatted);
    const sent = await sendTelegramMessage(cleanToken, cleanChatId, text, listKb);

    if (sent.ok) {
      const habitsSummary = getHabitsSummaryFromState(todayFormatted, habits);
      const pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);
      const pendingTasks = tasks.filter((t: any) => !t.completed);
      return res.json({ success: true, pendingCount: pendingHabits.length + pendingTasks.length, isTest });
    } else {
      const friendlyErr = getTelegramFriendlyErrorMessage(sent.description || "خطا در ارسال پیام به تلگرام", lang);
      return res.status(400).json({ success: false, error: friendlyErr });
    }
  } catch (err: any) {
    console.error("Reminder dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Send Strict Final Warning (concise several-sentence alert + uncompleted items only, nothing extra)
app.post("/api/telegram/send-strict-warning", async (req, res) => {
  try {
    const { botToken, chatId, habits: customHabits, tasks: customTasks, language = "fa", referenceDate, isTest = false } = req.body;
    const cleanToken = String(botToken || currentServerState.telegramConfig?.botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || currentServerState.telegramConfig?.chatId || "").trim();
    const lang = language || currentServerState.language || "fa";
    const isFa = lang === "fa";
    const isAr = lang === "ar";
    const todayFormatted = referenceDate || new Date().toISOString().split("T")[0];

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({
        success: false,
        error: isFa 
          ? "توکن ربات و شناسه چت الزامی هستند. لطفاً آنها را در تنظیمات وارد نمایید."
          : "Bot Token and Chat ID are required. Please configure them in Settings.",
      });
    }

    // Auto-sync configuration and start polling if needed
    if (!currentServerState.telegramConfig) currentServerState.telegramConfig = {} as any;
    if (cleanToken !== currentServerState.telegramConfig.botToken || cleanChatId !== currentServerState.telegramConfig.chatId) {
      currentServerState.telegramConfig.botToken = cleanToken;
      currentServerState.telegramConfig.chatId = cleanChatId;
      saveServerStateToDisk();
    }
    if (!botPollingActive) {
      startBotPolling();
    }

    const habits = Array.isArray(customHabits) && customHabits.length > 0
      ? customHabits
      : (Array.isArray(currentServerState.habits) && currentServerState.habits.length > 0
          ? currentServerState.habits
          : []);

    const tasks = Array.isArray(customTasks) && customTasks.length > 0
      ? customTasks
      : (Array.isArray(currentServerState.tasks) && currentServerState.tasks.length > 0
          ? currentServerState.tasks
          : []);

    const habitsSummary = getHabitsSummaryFromState(todayFormatted, habits);
    let pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);
    let pendingTasks = tasks.filter((t: any) => !t.completed);

    if (pendingHabits.length === 0 && pendingTasks.length === 0 && !isTest) {
      // If 100% of items are done, no strict warning needed
      return res.json({ success: true, pendingCount: 0, skipped: true });
    }

    // In test mode, if there are no pending items at all, supply mock items so user can preview the warning format
    if (isTest && pendingHabits.length === 0 && pendingTasks.length === 0) {
      pendingHabits = [
        {
          id: "test-h1",
          name: isFa ? "مطالعه ۲۰ دقیقه کتاب تخصصی" : isAr ? "قراءة 20 دقيقة كتاب تخصصي" : "20 mins Book Reading",
        } as any,
        {
          id: "test-h2",
          name: isFa ? "۳۰ دقیقه ورزش و پیاده‌روی" : isAr ? "30 دقيقة رياضة ومشي" : "30 mins Exercise & Walk",
        } as any,
      ];
      pendingTasks = [
        {
          id: "test-t1",
          title: isFa ? "بررسی و پاسخ به ایمیل‌های کاری" : isAr ? "مراجعة رسائل البريد" : "Review work emails",
        } as any,
      ];
    }

    const text = formatStrictWarningHTML(pendingHabits, pendingTasks, lang, isTest);
    const listKb = getStrictWarningKeyboard(pendingHabits, pendingTasks, lang);
    const sent = await sendTelegramMessage(cleanToken, cleanChatId, text, listKb);

    if (sent.ok) {
      return res.json({ success: true, pendingCount: pendingHabits.length + pendingTasks.length, isTest });
    } else {
      const friendlyErr = getTelegramFriendlyErrorMessage(sent.description || "خطا در ارسال پیام به تلگرام", lang);
      return res.status(400).json({ success: false, error: friendlyErr });
    }
  } catch (err: any) {
    console.error("Strict warning dispatch error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to format projected finish date in both local calendar and Gregorian
function formatProjectedDate(daysToAdd: number, language: string = "fa"): string {
  if (daysToAdd <= 0) {
    return language === "fa"
      ? "🎉 هدف ۶۶ روز تکمیل شده است"
      : language === "ar"
      ? "🎉 تم إنجاز هدف 66 يوماً"
      : "🎉 66-day milestone achieved!";
  }
  const target = new Date();
  target.setDate(target.getDate() + daysToAdd);
  const locale = language === "fa" ? "fa-IR" : language === "ar" ? "ar-SA" : "en-US";
  const calendar = language === "fa" ? "persian" : language === "ar" ? "islamic-umalqura" : "gregory";

  try {
    const formattedLocale = new Intl.DateTimeFormat(locale, {
      calendar: calendar as any,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(target);
    const greg = target.toISOString().split("T")[0];
    return `${formattedLocale} (${greg})`;
  } catch {
    return target.toISOString().split("T")[0];
  }
}

// Generate single habit matrix chart with 14-day activity heatmap, automaticity %, and days to 66 days
function generateSingleHabitMatrixChartUrl(habit: any, language: string = "fa", referenceToday?: string): string {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const stats = calculateHabitStatsOnServer(habit, todayStr, language);
  const history = habit.history || {};

  const totalDays = 14;
  const daysList: string[] = [];
  const statusValues: number[] = [];
  const bgColors: string[] = [];
  const borderColors: string[] = [];
  const dayLabels: string[] = [];

  const refDate = new Date(todayStr);
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    daysList.push(dateStr);

    const isDone = !!history[dateStr];
    statusValues.push(isDone ? 100 : 10);
    bgColors.push(isDone ? "rgba(16, 185, 129, 0.88)" : "rgba(239, 68, 68, 0.25)");
    borderColors.push(isDone ? "#10b981" : "#ef4444");

    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const isCurrentToday = i === 0;
    const tag = isCurrentToday ? (isFa ? " (امروز)" : isAr ? " (اليوم)" : " (Today)") : "";
    dayLabels.push(`${month}/${day}${tag}`);
  }

  const progressPct = Math.min(100, Math.round((stats.totalCompletedDays / 66) * 100));
  const autoScore = stats.automaticity;
  const remaining = stats.remainingDays;

  const titleMain = isFa
    ? `📊 ماتریس فعالیت و پیشرفت: « ${habit.name} »`
    : isAr
    ? `📊 مصفوفة النشاط والترسيخ: « ${habit.name} »`
    : `📊 Activity Matrix & Progress: "${habit.name}"`;

  const subtitleMain = isFa
    ? `🧠 خودکارشدگی: ${autoScore}٪ | 📊 پیشرفت ۶۶ روز: ${progressPct}٪ (${stats.totalCompletedDays}/۶۶ روز) | ⏳ مانده: ${remaining} روز`
    : isAr
    ? `🧠 التلقائية: ${autoScore}% | 📊 التقدم لـ 66: ${progressPct}% (${stats.totalCompletedDays}/66 يوماً) | ⏳ المتبقي: ${remaining} يوم`
    : `🧠 Automaticity: ${autoScore}% | 📊 Progress: ${progressPct}% (${stats.totalCompletedDays}/66d) | ⏳ Days left: ${remaining} days`;

  const chartConfig = {
    type: "bar",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: isFa ? "ماتریس ثبت روزانه (۱۴ روز اخیر)" : isAr ? "مصفوفة التسجيل (آخر 14 يوماً)" : "Daily Activity (Last 14 Days)",
          data: statusValues,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          categoryPercentage: 0.85,
          barPercentage: 0.85,
        },
      ],
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: [titleMain, subtitleMain],
        fontColor: "#f8fafc",
        fontSize: 14,
        fontStyle: "bold",
        padding: 16,
      },
      legend: {
        display: true,
        position: "bottom",
        labels: {
          fontColor: "#cbd5e1",
          fontSize: 11,
          boxWidth: 14,
          padding: 12,
        },
      },
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
              max: 120,
              fontColor: "#94a3b8",
              fontSize: 10,
              callback: (val: any) => (val === 100 ? (isFa ? "✅ انجام شد" : "Done") : val === 0 ? (isFa ? "❌ غیبت" : "Miss") : ""),
            },
            gridLines: {
              color: "rgba(255, 255, 255, 0.08)",
              zeroLineColor: "rgba(255, 255, 255, 0.2)",
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              fontColor: "#e2e8f0",
              fontSize: 10,
              fontStyle: "bold",
              maxRotation: 45,
              minRotation: 25,
            },
            gridLines: {
              display: false,
            },
          },
        ],
      },
      plugins: {
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#f8fafc",
          font: { weight: "bold", size: 10 },
          formatter: (val: number) => (val >= 90 ? "✓" : "—"),
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?width=800&height=420&bkg=%23090d16&devicePixelRatio=2&c=${encoded}`;
}

// Helper to send a single habit matrix photo with full caption and action buttons
async function sendIndividualHabitMatrixPhoto(
  cleanToken: string,
  chatId: string | number,
  habit: any,
  language: string = "fa",
  referenceToday?: string
) {
  const isFa = language === "fa";
  const isAr = language === "ar";
  const todayStr = referenceToday || new Date().toISOString().split("T")[0];
  const stats = calculateHabitStatsOnServer(habit, todayStr, language);
  const chartUrl = generateSingleHabitMatrixChartUrl(habit, language, todayStr);
  const progressPct = Math.min(100, Math.round((stats.totalCompletedDays / 66) * 100));
  const projectedFinish = formatProjectedDate(stats.remainingDays, language);

  const statusBadge = stats.isDoneToday
    ? isFa ? "✅ <b>امروز تکمیل شده است</b>" : isAr ? "✅ <b>تم الإنجاز اليوم</b>" : "✅ <b>Completed Today</b>"
    : isFa ? "⏳ <b>هنوز برای امروز ثبت نشده</b>" : isAr ? "⏳ <b>لم يتم الإنجاز اليوم بعد</b>" : "⏳ <b>Pending Today</b>";

  let caption = `📌 <b>${isFa ? "ماتریس فعالیت و پیشرفت اختصاصی:" : isAr ? "مصفوفة تقدم العادة:" : "Habit Activity & Progress Matrix:"} « ${habit.name} »</b>\n\n`;
  caption += `🧠 <b>${isFa ? "میزان خودکارشدگی عصبی" : isAr ? "نسبة التلقائية العصبية" : "Automaticity Score"}:</b> <b>${stats.automaticity}٪</b> (<i>${stats.stageLabel}</i>)\n`;
  caption += `📊 <b>${isFa ? "درصد پیشرفت تا هدف ۶۶ روز" : isAr ? "نسبة التقدم لـ 66 يوماً" : "Progress to 66-Day Milestone"}:</b> <b>${progressPct}٪</b> (${stats.totalCompletedDays} ${isFa ? "از ۶۶ روز" : isAr ? "من 66 يوماً" : "of 66 days"})\n`;
  caption += `⏳ <b>${isFa ? "روزهای تخمینی مانده تا ۶۶ روز" : isAr ? "الأيام المقدرة للوصول لـ 66" : "Estimated Days to 66 Days"}:</b> <b>${stats.remainingDays}</b> ${isFa ? "روز تمرین پیوسته" : isAr ? "أيام" : "days"}\n`;
  caption += `📅 <b>${isFa ? "تاریخ تخمینی تکمیل و خودکاری کامل" : isAr ? "التاريخ المتوقع للإنجاز الكامل" : "Projected 66-Day Target Date"}:</b> <code>${projectedFinish}</code>\n`;
  caption += `🔥 <b>${isFa ? "طول زنجیره فعال" : isAr ? "طول السلسلة الحالية" : "Current Active Streak"}:</b> <b>${stats.currentStreak}</b> ${isFa ? "روز متوالی" : "days"}\n`;
  caption += `⚡ <b>${isFa ? "بیشترین رکورد زنجیره" : isAr ? "أطول سلسلة" : "Longest Streak Record"}:</b> <b>${stats.longestStreak}</b> ${isFa ? "روز" : "days"}\n`;
  caption += `📋 <b>${isFa ? "وضعیت امروز:" : isAr ? "حالة اليوم:" : "Today's Status:"}</b> ${statusBadge}\n\n`;
  caption += `🔬 <i>${isFa ? "مدل فیلیپا لالی (۲۰۱۰): تکرار پایدار در بستر زمانی مشخص، مسیرهای عصبی در عقده‌های قاعده‌ای (Basal Ganglia) را تثبیت می‌کند." : isAr ? "نموذج لالي (2010): الاستمرارية اليومية ترسخ المسارات العصبية وتقلل الجهد الإرادي." : "Lally (2010): Consistent daily repetition solidifies neural pathways in the basal ganglia, making the action effortless."}</i>`;

  const isDoneToday = !!habit.history?.[todayStr];
  const toggleBtnText = isDoneToday
    ? isFa ? "↩️ لغو ثبت امروز" : isAr ? "↩️ إلغاء تسجيل اليوم" : "↩️ Undo Today"
    : isFa ? "✅ ثبت انجام برای امروز" : isAr ? "✅ تسجيل إنجاز اليوم" : "✅ Mark Done Today";

  const habitPhotoKb = {
    inline_keyboard: [
      [
        { text: toggleBtnText, callback_data: `toggle_${habit.id}` },
        { text: isFa ? "📋 لیست همه عادات" : isAr ? "📋 قائمة العادات" : "📋 All Habits", callback_data: "cmd_habits" },
      ],
    ],
  };

  return await sendTelegramPhoto(cleanToken, chatId, chartUrl, caption, habitPhotoKb);
}

// Helper to generate a comprehensive, high-res multi-dimensional infographic chart URL
function generateHabitsChartUrl(habitsSummary: any[], language: string = "fa"): string {
  const isFa = language === "fa";
  const isAr = language === "ar";

  // Take up to 10 habits for clean layout, formatted with rank/status
  const limitedHabits = habitsSummary.slice(0, 10);

  const labels = limitedHabits.map((h) => {
    const raw = String(h.name || "");
    const statusIcon = h.isDoneToday ? "✅ " : "⏳ ";
    const truncated = raw.length > 18 ? raw.slice(0, 16) + ".." : raw;
    return statusIcon + truncated;
  });

  const autoScores = limitedHabits.map((h) =>
    typeof h.automaticity === "number" ? Math.min(100, Math.max(0, h.automaticity)) : 0
  );

  const streaks = limitedHabits.map((h) =>
    typeof h.currentStreak === "number" ? h.currentStreak : 0
  );

  const completedDays = limitedHabits.map((h) =>
    typeof h.totalCompletedDays === "number" ? h.totalCompletedDays : 0
  );

  // Background colors corresponding to neural threshold
  const autoBgColors = autoScores.map((s) =>
    s >= 70
      ? "rgba(16, 185, 129, 0.85)" // Automatic (Emerald)
      : s >= 40
      ? "rgba(245, 158, 11, 0.85)" // Semi-automatic (Amber)
      : "rgba(59, 130, 246, 0.85)"  // Forming (Blue)
  );

  const autoBorderColors = autoScores.map((s) =>
    s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#3b82f6"
  );

  const titleText = isFa
    ? "📊 اینفوگرافیک جامع تثبیت عصب‌شناختی عادات (مدل فیلیپا لالی ۲۰۱۰)"
    : isAr
    ? "📊 لوحة بيانية متكاملة للترسيخ العصبي للعادات (نموذج فيليبا لالي 2010)"
    : "📊 Comprehensive Habit Neural Formation Dashboard (Lally 2010)";

  const subtitleText = isFa
    ? "مقایسه درصد خودکارشدگی عصبی | طول زنجیره فعال | روزهای تثبیت‌شده تا مرز ۶۶ روز"
    : isAr
    ? "مقارنة نسبة التلقائية | طول السلسلة الحالية | الأيام المكتملة حتى عتبة 66 يوماً"
    : "Neural Automaticity % | Active Streak | Total Completed Days (Target: 66d)";

  const chartConfig = {
    type: "horizontalBar",
    data: {
      labels,
      datasets: [
        {
          label: isFa ? "🧠 خودکارشدگی عصبی (٪)" : isAr ? "🧠 نسبة التلقائية (٪)" : "🧠 Automaticity (%)",
          data: autoScores,
          backgroundColor: autoBgColors,
          borderColor: autoBorderColors,
          borderWidth: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
        {
          label: isFa ? "🔥 زنجیره فعال (روز)" : isAr ? "🔥 السلسلة الحالية (أيام)" : "🔥 Streak (Days)",
          data: streaks,
          backgroundColor: "rgba(239, 68, 68, 0.75)",
          borderColor: "#ef4444",
          borderWidth: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
        {
          label: isFa ? "📅 کل روزهای ثبت‌شده" : isAr ? "📅 إجمالي الأيام" : "📅 Total Days Done",
          data: completedDays,
          backgroundColor: "rgba(139, 92, 246, 0.75)",
          borderColor: "#8b5cf6",
          borderWidth: 2,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
      ],
    },
    options: {
      responsive: true,
      title: {
        display: true,
        text: [titleText, subtitleText],
        fontColor: "#f8fafc",
        fontSize: 15,
        fontStyle: "bold",
        padding: 14,
      },
      legend: {
        display: true,
        position: "bottom",
        labels: {
          fontColor: "#cbd5e1",
          fontSize: 12,
          boxWidth: 16,
          padding: 15,
        },
      },
      scales: {
        xAxes: [
          {
            ticks: {
              beginAtZero: true,
              fontColor: "#94a3b8",
              fontSize: 11,
              maxTicksLimit: 12,
            },
            gridLines: {
              color: "rgba(255, 255, 255, 0.08)",
              zeroLineColor: "rgba(255, 255, 255, 0.25)",
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              fontColor: "#f1f5f9",
              fontSize: 12,
              fontStyle: "bold",
            },
            gridLines: {
              display: false,
            },
          },
        ],
      },
      plugins: {
        datalabels: {
          anchor: "end",
          align: "right",
          color: "#f8fafc",
          font: { weight: "bold", size: 11 },
          formatter: (val: any) => {
            if (val === 0) return "";
            return val;
          },
        },
      },
    },
  };

  const chartHeight = Math.max(500, limitedHabits.length * 75 + 180);
  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?width=850&height=${chartHeight}&bkg=%23090d16&devicePixelRatio=2&c=${encoded}`;
}

// Endpoint: Send Habit Progress Chart Image(s) to Telegram
app.post("/api/telegram/send-chart", async (req, res) => {
  try {
    const { botToken, chatId, habits, language = "fa", isTest = false } = req.body;
    const cleanToken = String(botToken || currentServerState.telegramConfig?.botToken || "").trim().replace(/^bot/i, "");
    const cleanChatId = String(chatId || currentServerState.telegramConfig?.chatId || "").trim();
    const lang = language || currentServerState.language || "fa";
    const isFa = lang === "fa";
    const isAr = lang === "ar";

    if (!cleanToken || !cleanChatId) {
      return res.status(400).json({ 
        success: false, 
        error: isFa ? "توکن ربات یا شناسه چت تنظیم نشده است." : "Bot Token or Chat ID not configured." 
      });
    }

    if (!currentServerState.telegramConfig) currentServerState.telegramConfig = {} as any;
    currentServerState.telegramConfig.botToken = cleanToken;
    currentServerState.telegramConfig.chatId = cleanChatId;
    saveServerStateToDisk();

    if (!botPollingActive) {
      startBotPolling();
    }

    const todayFormatted = new Date().toISOString().split("T")[0];
    let currentHabits = Array.isArray(habits) && habits.length > 0
      ? habits 
      : (Array.isArray(currentServerState.habits) && currentServerState.habits.length > 0
          ? currentServerState.habits
          : []);

    if (currentHabits.length === 0) {
      currentHabits = [
        {
          id: "chart-test-h1",
          name: isFa ? "مطالعه ۲۰ دقیقه کتاب تخصصی" : isAr ? "قراءة 20 دقيقة كتاب تخصصي" : "20 mins Book Reading",
          category: isFa ? "یادگیری" : "Learning",
          createdAt: todayFormatted,
          targetDays: 66,
          rewardCoins: 10,
          rewardXp: 5,
          history: { [todayFormatted]: true },
        },
        {
          id: "chart-test-h2",
          name: isFa ? "۳۰ دقیقه ورزش و پیاده‌روی سریع" : isAr ? "30 دقيقة رياضة ومشي سريع" : "30 mins Exercise & Walk",
          category: isFa ? "ورزش" : "Fitness",
          createdAt: todayFormatted,
          targetDays: 66,
          rewardCoins: 12,
          rewardXp: 6,
          history: { [todayFormatted]: false },
        },
      ];
    }

    const habitsSummary = getHabitsSummaryFromState(todayFormatted, currentHabits);

    // 1. Send multi-habit comparison infographic chart photo first
    let sentCount = 0;
    const multiChartUrl = generateHabitsChartUrl(habitsSummary, lang);
    const multiCaption = isFa
      ? `📊 <b>اینفوگرافیک مقایسه‌ای خودکارشدگی عادات (مدل لالی ۲۰۱۰)</b>\n<i>نمودار تجمیعی سطح تثبیت نوروبیولوژیک و طول زنجیره عادات فعال</i>`
      : isAr
      ? `📊 <b>مخطط مقارنة التلقائية العصبية للعادات (نموذج لالي)</b>`
      : `📊 <b>Habits Automaticity Neural Formation Infographic (Lally 2010)</b>`;

    const multiSendRes = await sendTelegramPhoto(cleanToken, cleanChatId, multiChartUrl, multiCaption);
    if (multiSendRes.ok) sentCount++;

    // 2. Send individual habit matrix photos (for up to 3 habits)
    const habitsToMatrix = currentHabits.slice(0, 3);
    for (const h of habitsToMatrix) {
      const sendRes = await sendIndividualHabitMatrixPhoto(cleanToken, cleanChatId, h, lang, todayFormatted);
      if (sendRes.ok) sentCount++;
    }

    return res.json({
      success: true,
      sentCount: Math.max(1, sentCount),
      totalHabits: currentHabits.length,
      message: isFa 
        ? `${Math.max(1, sentCount)} تصویر نمودار و ماتریس عادات با موفقیت به تلگرام ارسال شد.` 
        : `${Math.max(1, sentCount)} habit charts sent successfully to Telegram.`,
    });
  } catch (err: any) {
    console.error("Send chart error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// TELEGRAM INTERACTIVE BOT POLLING ENGINE
// ==========================================

let botPollingActive = false;
let botPollingAbortController: AbortController | null = null;
let lastPolledTimestamp = 0;
let lastUpdateId = 0;

// Helper to clean and sanitize Telegram HTML
function cleanTelegramHtml(text: string): string {
  if (!text) return "";
  let clean = String(text);

  // Remove <think>...</think> tags if any
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Normalize markdown formatting to HTML
  clean = clean.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  clean = clean.replace(/__(.*?)__/g, "<b>$1</b>");
  clean = clean.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, "<i>$1</i>");
  clean = clean.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "<i>$1</i>");
  clean = clean.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  clean = clean.replace(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g, "<pre>$1</pre>");

  // Ensure & is escaped to &amp; when not already a valid entity
  clean = clean.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");

  // Escape invalid < and > tags that are not allowed by Telegram HTML parser
  const validTagPattern = /<\/?(b|i|code|pre|a|u|s|tg-spoiler|strong|em|blockquote)(?:\s+href="[^"]*")?\s*\/?>/gi;
  const parts: string[] = [];
  let lastIndex = 0;
  let match;

  while ((match = validTagPattern.exec(clean)) !== null) {
    const textBefore = clean.slice(lastIndex, match.index);
    parts.push(textBefore.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    let tag = match[0];
    tag = tag.replace(/<strong>/gi, "<b>").replace(/<\/strong>/gi, "</b>");
    tag = tag.replace(/<em>/gi, "<i>").replace(/<\/em>/gi, "</i>");
    parts.push(tag);
    lastIndex = match.index + match[0].length;
  }
  const textAfter = clean.slice(lastIndex);
  parts.push(textAfter.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

  return parts.join("");
}

// User-friendly Persian/Arabic/English error mapping for Telegram API errors
function getTelegramFriendlyErrorMessage(rawDescription: string, language: string = "fa"): string {
  const desc = String(rawDescription || "").toLowerCase();
  const isFa = language === "fa";
  const isAr = language === "ar";

  if (desc.includes("unauthorized") || (desc.includes("not found") && desc.includes("token"))) {
    return isFa
      ? "توکن ربات نامعتبر است. لطفاً توکن دریافتی از BotFather@ را دقیق بررسی و در تنظیمات وارد نمایید."
      : isAr
      ? "توكن البوت غير صالح. يرجى التأكد من التوكن المستلم من BotFather@."
      : "Invalid Bot Token. Please verify the token copied from @BotFather.";
  }
  if (desc.includes("chat not found")) {
    return isFa
      ? "شناسه چت (Chat ID) یافت نشد. لطفاً در تلگرام به ربات پیام داده یا دکمه Start را بزنید تا ربات شما را شناسایی کند."
      : isAr
      ? "لم يتم العثور على معرف المحادثة. يرجى بدء المحادثة مع البوت وإرسال /start أولاً."
      : "Chat not found. Please open your bot on Telegram and tap /start first.";
  }
  if (desc.includes("blocked by the user") || desc.includes("user is deactivated")) {
    return isFa
      ? "ربات توسط شما مسدود (Block) شده است. لطفاً در تلگرام ربات را Unblock نموده و مجدداً Start را بزنید."
      : isAr
      ? "تم حظر البوت من قبلك. يرجى إلغاء الحظر وإعادة تشغيل البوت."
      : "Bot was blocked by the user. Please unblock the bot in Telegram and send /start.";
  }
  if (desc.includes("too many requests") || desc.includes("retry after")) {
    return isFa
      ? "محدودیت نرخ ارسال تلگرام فعال شد. لطفاً چند ثانیه دیگر مجدداً تلاش فرمایید."
      : isAr
      ? "تم تجاوز حد الطلبات في تيليجرام. يرجى المحاولة بعد قليل."
      : "Telegram rate limit exceeded. Please wait a few seconds and try again.";
  }
  return rawDescription;
}

// Helper to send photo to Telegram with automatic fallback to rich message
async function sendTelegramPhoto(
  cleanToken: string,
  chatId: string | number,
  photoUrl: string,
  caption?: string,
  replyMarkup?: any
) {
  try {
    const formattedCaption = caption ? cleanTelegramHtml(caption) : undefined;
    const payload: any = {
      chat_id: chatId,
      photo: photoUrl,
      parse_mode: "HTML",
    };
    if (formattedCaption && formattedCaption.length <= 1024) {
      payload.caption = formattedCaption;
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok: boolean; description?: string; error_code?: number };

    if (data.ok && formattedCaption && formattedCaption.length > 1024) {
      await sendTelegramMessage(cleanToken, chatId, formattedCaption, replyMarkup);
      return data;
    }

    // Fallback: If photo delivery fails (e.g. QuickChart rate limit or URL issue), deliver via rich text message!
    if (!data.ok) {
      console.warn("sendTelegramPhoto returned not ok, falling back to message delivery:", data.description);
      const fallbackText = (formattedCaption || caption || "📊 <b>گزارش نمودار پیشرفت</b>") +
        (photoUrl ? `\n\n🔗 <i>لینک تصویر نمودار:</i> <a href="${photoUrl}">مشاهده در مرورگر</a>` : "");
      const msgRes = await sendTelegramMessage(cleanToken, chatId, fallbackText, replyMarkup);
      if (msgRes.ok) {
        return { ok: true, description: "Delivered via fallback message", result: msgRes.result };
      }
    }

    return data;
  } catch (err: any) {
    console.error("Error sending Telegram photo:", err);
    if (caption) {
      return await sendTelegramMessage(cleanToken, chatId, caption, replyMarkup);
    }
    return { ok: false, description: String(err?.message || err) };
  }
}

// Helper to send message to Telegram with entity sanitization and retry
async function sendTelegramMessage(cleanToken: string, chatId: string | number, text: string, replyMarkup?: any) {
  try {
    const formattedText = cleanTelegramHtml(text);
    const payload: any = {
      chat_id: chatId,
      text: formattedText,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      ok: boolean;
      description?: string;
      error_code?: number;
      result?: { message_id: number; [key: string]: any };
    };

    // If failed due to HTML parse error or formatting, retry in plain text without crashing
    if (!data.ok && (data.error_code === 400 || data.description?.toLowerCase().includes("parse") || data.description?.toLowerCase().includes("entity") || data.description?.toLowerCase().includes("tag") || data.description?.toLowerCase().includes("character"))) {
      const plainText = text.replace(/<[^>]*>/g, "");
      const retryRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          reply_markup: replyMarkup,
        }),
      });
      return (await retryRes.json()) as {
        ok: boolean;
        description?: string;
        result?: { message_id: number; [key: string]: any };
      };
    }

    return data;
  } catch (err: any) {
    console.error("Error sending Telegram message:", err);
    return { ok: false, description: String(err?.message || err) };
  }
}

// Helper to delete message from Telegram to keep chat clean
async function deleteTelegramMessage(cleanToken: string, chatId: string | number, messageId?: number) {
  if (!messageId) return;
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });
  } catch (err) {
    // Non-fatal if message is already deleted or cannot be deleted
  }
}

// Helper to remove any persistent bottom keyboard from client screen
async function dismissTelegramReplyKeyboard(cleanToken: string, chatId: string | number) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "⚡",
        reply_markup: { remove_keyboard: true },
      }),
    });
    const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
    if (data.ok && data.result?.message_id) {
      await deleteTelegramMessage(cleanToken, chatId, data.result.message_id);
    }
  } catch {}
}

// Helper to send chat action (e.g. typing)
async function sendTelegramChatAction(cleanToken: string, chatId: string | number, action: string = "typing") {
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {}
}

// Helper to answer callback query
async function answerTelegramCallbackQuery(cleanToken: string, callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${cleanToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined,
      }),
    });
  } catch {}
}

// Handle Bot Commands and Text Messages
async function handleBotIncomingAction(
  cleanToken: string,
  chatId: string | number,
  actionOrText: string,
  callbackQueryId?: string,
  messageId?: number
) {
  refreshServerStateFromDb();
  const language = currentServerState.language || "fa";
  const isFa = language === "fa";
  const isAr = language === "ar";
  const keyboards = getStandardKeyboards(language);
  const rawText = actionOrText.trim();
  const normalized = rawText.toLowerCase();
  const todayFormatted = new Date().toISOString().split("T")[0];

  // If this is a text message (not inline callback), ensure persistent keyboard is dismissed
  if (!callbackQueryId) {
    dismissTelegramReplyKeyboard(cleanToken, chatId).catch(() => {});
  }

  // 0. CHECK PENDING CONVERSATION STATE (e.g. user typing habit name, task name, or AI question)
  const pending = chatPendingActions[chatId];
  if (
    pending &&
    !normalized.startsWith("/") &&
    !normalized.startsWith("cmd_") &&
    !normalized.startsWith("del_") &&
    !normalized.startsWith("stat_") &&
    !normalized.startsWith("toggle_") &&
    !normalized.startsWith("buy_")
  ) {
    const promptMsgId = (pending as any).promptMessageId || pending.payload?.promptMessageId;
    if (promptMsgId) {
      await deleteTelegramMessage(cleanToken, chatId, promptMsgId);
    }

    if (pending.action === "awaiting_habit_name") {
      delete chatPendingActions[chatId];
      if (rawText.length > 0) {
        const newHabit = createHabitOnServer(rawText);
        const successMsg = isFa
          ? `✅ <b>عادت جدید «${newHabit.name}» با موفقیت اضافه شد!</b>\n\n🎯 <b>هدف:</b> ۶۶ روز پیوستگی بر اساس مدل نوروساینس دکتر فیلیپا لالی (۲۰۱۰).\n\n👇 <i>می‌توانید وضعیت امروز این عادت را ثبت کنید یا آمار آن را مشاهده نمایید:</i>`
          : isAr
          ? `✅ <b>تمت إضافة العادة الجديدة «${newHabit.name}» بنجاح!</b>\n\n🎯 <b>الهدف:</b> 66 يوماً من الاستمرارية وفق نموذج Lally (2010).\n\n👇 <i>يمكنك تسجيل إنجاز اليوم أو عرض الإحصائيات:</i>`
          : `✅ <b>New habit "${newHabit.name}" created successfully!</b>\n\n🎯 <b>Target:</b> 66 days of continuous repetition based on Dr. Lally's model.\n\n👇 <i>Log today's check-in or view stats below:</i>`;

        const habitKb = getIndividualHabitKeyboard(newHabit, false, language);
        await sendTelegramMessage(cleanToken, chatId, successMsg, habitKb);
        return;
      }
    } else if (pending.action === "awaiting_task_name") {
      delete chatPendingActions[chatId];
      if (rawText.length > 0) {
        const newTask = createTaskOnServer(rawText);
        const successMsg = isFa
          ? `✅ <b>تسک جدید «${newTask.title}» با موفقیت ثبت شد!</b>\n\n⭐ <b>پاداش انجام:</b> +۵ سکه 🪙 و +۱۵ امتیاز تجربه (XP)\n\n👇 <i>برای ثبت انجام یا مدیریت تسک‌ها کلیک کنید:</i>`
          : isAr
          ? `✅ <b>تمت إضافة المهمة «${newTask.title}» بنجاح!</b>\n\n⭐ <b>المكافأة:</b> +5 عملات 🪙 و +15 XP`
          : `✅ <b>New task "${newTask.title}" added successfully!</b>\n\n⭐ <b>Reward:</b> +5 Coins 🪙 & +15 XP`;

        const taskKb = getIndividualTaskKeyboard(newTask, language);
        await sendTelegramMessage(cleanToken, chatId, successMsg, taskKb);
        return;
      }
    } else if (
      pending.action === "active_coaching_dialogue" ||
      pending.action === "awaiting_ai_question" ||
      pending.action === "awaiting_strict_warning_inquiry"
    ) {
      // Check if user wants to end dialogue
      const isExit =
        normalized === "پایان گفتگو" ||
        normalized === "پایان" ||
        normalized === "خروج" ||
        normalized === "ممنون حله" ||
        normalized === "ممنون" ||
        normalized === "مرسی" ||
        normalized === "ثبت در حافظه" ||
        normalized === "انهاء" ||
        normalized === "exit" ||
        normalized === "done";

      if (isExit) {
        delete chatPendingActions[chatId];
        const exitMsg = isFa
          ? `✨ <b>گفتگو به پایان رسید.</b> خسته نباشی! نکات در حافظه مربی ثبت شد. 🌟`
          : `✨ <b>Coaching session concluded.</b> Great job! Insights saved to coach memory. 🌟`;
        await sendTelegramMessage(cleanToken, chatId, exitMsg, keyboards.inlineMarkup);
        return;
      }

      if (rawText.length > 0) {
        await sendTelegramChatAction(cleanToken, chatId, "typing");
        const habitsSummary = getHabitsSummaryFromState();

        const dialogueResult = await askAICoachInteractiveDialogue({
          userMessage: rawText,
          chatId,
          dialogueContext: pending.action === "awaiting_strict_warning_inquiry" ? "warning" : "inquiry",
          habitsSummary,
          language,
          pendingHabits: (pending as any).pendingHabits,
        });

        // Retain pending action so next text message continues the conversation seamlessly
        chatPendingActions[chatId] = {
          action: "active_coaching_dialogue",
          timestamp: Date.now(),
        };

        const coachKb = getInteractiveCoachingKeyboard(language);
        await sendTelegramMessage(cleanToken, chatId, dialogueResult.reply, coachKb);
        return;
      }
    }
  }

  // Clear stale pending states if user triggered other commands (except interactive coaching buttons)
  if (
    pending &&
    (normalized.startsWith("/") ||
      (normalized.startsWith("cmd_") && !normalized.startsWith("cmd_coach_")))
  ) {
    delete chatPendingActions[chatId];
  }

  let toggledTaskResult: any = null;
  let toggledHabitResult: any = null;

  // Answer callback query & delete previous button message to prevent chat clutter
  if (callbackQueryId) {
    let cbToast: string | undefined = undefined;
    if (normalized.startsWith("toggle_task_")) {
      const taskId = rawText.replace("toggle_task_", "");
      toggledTaskResult = toggleTaskOnServer(taskId);
      if (toggledTaskResult && toggledTaskResult.task) {
        cbToast = toggledTaskResult.task.completed
          ? isFa
            ? `✅ تسک انجام شد: ${toggledTaskResult.task.title}`
            : isAr
            ? `✅ تم إنجاز المهمة: ${toggledTaskResult.task.title}`
            : `✅ Task completed: ${toggledTaskResult.task.title}`
          : isFa
          ? `↩️ تسک به جریان افتاد: ${toggledTaskResult.task.title}`
          : isAr
          ? `↩️ تم إعادة المهمة: ${toggledTaskResult.task.title}`
          : `↩️ Task uncompleted: ${toggledTaskResult.task.title}`;
      }
    } else if (normalized.startsWith("toggle_")) {
      const habitId = rawText.replace("toggle_", "");
      toggledHabitResult = toggleHabitTodayOnServer(habitId, todayFormatted);
      if (toggledHabitResult && toggledHabitResult.habit) {
        cbToast = toggledHabitResult.isDoneToday
          ? isFa
            ? `✅ انجام شد: ${toggledHabitResult.habit.name}`
            : isAr
            ? `✅ تم الإنجاز: ${toggledHabitResult.habit.name}`
            : `✅ Marked completed: ${toggledHabitResult.habit.name}`
          : isFa
          ? `↩️ لغو ثبت شد: ${toggledHabitResult.habit.name}`
          : isAr
          ? `↩️ تم إلغاء التسجيل: ${toggledHabitResult.habit.name}`
          : `↩️ Unmarked: ${toggledHabitResult.habit.name}`;
      }
    }
    await answerTelegramCallbackQuery(cleanToken, callbackQueryId, cbToast);

    // Delete the previous message containing the clicked button
    if (messageId) {
      await deleteTelegramMessage(cleanToken, chatId, messageId);
    }
  }

  // 0.9. PROACTIVE COACH CALLBACKS (Miss Patrol / Golden Window / Overdue / Relapse)
  if (normalized.startsWith("proact_")) {
    // 0.9.1 کاربر روی «انجام دادم» برای یک عادت زد
    if (normalized.startsWith("proact_acted_toggle_task_")) {
      const taskId = rawText.replace("proact_acted_toggle_task_", "");
      registerProactiveFeedback("acted", `overdue:${taskId}`);
      const res = toggleTaskOnServer(taskId);
      const task = res?.task;
      if (task) {
        const taskHtml = formatIndividualTaskHTML(task, language);
        const taskKb = getIndividualTaskKeyboard(task, language);
        const msg = isFa
          ? `🎉 <b>عالی! تسک «${task.title}» انجام شد.</b> (+${res?.coinsAwarded || 5} سکه 🪙)\n\n${taskHtml}`
          : isAr
          ? `🎉 <b>رائع! أُنجزت المهمة «${task.title}».</b>\n\n${taskHtml}`
          : `🎉 <b>Great! Task "${task.title}" completed.</b>\n\n${taskHtml}`;
        await sendTelegramMessage(cleanToken, chatId, msg, taskKb);
      }
      return;
    }
    if (normalized.startsWith("proact_acted_toggle_")) {
      const habitId = rawText.replace("proact_acted_toggle_", "");
      registerProactiveFeedback("acted", `miss:${habitId}`);
      const res = toggleHabitTodayOnServer(habitId, todayFormatted);
      const habit = res?.habit;
      if (habit) {
        const statsHtml = formatIndividualHabitStatsHTML(habit, language, todayFormatted);
        const habitKb = getIndividualHabitKeyboard(habit, res.isDoneToday, language);
        const msg = isFa
          ? `🎉 <b>آفرین! زنجیره‌ات حفظ شد.</b>\n\n${statsHtml}`
          : isAr
          ? `🎉 <b>أحسنت! استمراريتك محفوظة.</b>\n\n${statsHtml}`
          : `🎉 <b>Well done! Streak preserved.</b>\n\n${statsHtml}`;
        await sendTelegramMessage(cleanToken, chatId, msg, habitKb);
      }
      return;
    }
    // 0.9.2 کاربر می‌خواهد دربارهٔ این موضوع گفتگو کند → ورود به مربی تعاملی
    if (normalized.startsWith("proact_talk_task_") || normalized.startsWith("proact_talk_")) {
      registerProactiveFeedback("acted", "proact_talk");
      const isTaskTalk = normalized.startsWith("proact_talk_task_");
      const id = isTaskTalk
        ? rawText.replace("proact_talk_task_", "")
        : rawText.replace("proact_talk_", "");
      let topicName = "";
      if (id && id !== "general") {
        if (isTaskTalk) {
          const t = (currentServerState.tasks || []).find((x: any) => x.id === id);
          topicName = t?.title || "";
        } else {
          const h = (currentServerState.habits || []).find((x: any) => x.id === id);
          topicName = h?.name || "";
        }
      }
      chatPendingActions[chatId] = { action: "active_coaching_dialogue", timestamp: Date.now() };
      await sendTelegramChatAction(cleanToken, chatId, "typing");
      const seed = topicName
        ? isFa
          ? `می‌خواهم درباره «${topicName}» صحبت کنم و کمکم کنی شروع کنم.`
          : `I'd like help getting started with "${topicName}".`
        : isFa
        ? `به یک برنامهٔ کوچک برای ادامه دادن مسیرم نیاز دارم.`
        : `I need a small plan to get back on track.`;
      const dialogueResult = await askAICoachInteractiveDialogue({
        userMessage: seed,
        chatId,
        dialogueContext: "inquiry",
        habitsSummary: getHabitsSummaryFromState(),
        language,
      });
      const coachKb = getInteractiveCoachingKeyboard(language);
      await sendTelegramMessage(cleanToken, chatId, dialogueResult.reply, coachKb);
      return;
    }
    // 0.9.3 یادآوری بعداً
    if (normalized.startsWith("proact_snooze_")) {
      registerProactiveFeedback("snoozed", "proact_snooze");
      const msg = isFa
        ? `⏰ باشه، بعداً یادآوری می‌کنم.`
        : isAr
        ? `⏰ حسناً، سأذكّرك لاحقاً.`
        : `⏰ Okay, I'll remind you later.`;
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }
  }

  // 1. TOGGLE HABIT TODAY (from inline button)
  if (normalized.startsWith("toggle_") && !normalized.startsWith("toggle_task_")) {
    const habitId = rawText.replace("toggle_", "");
    const habitRes = toggledHabitResult || toggleHabitTodayOnServer(habitId, todayFormatted);
    if (!habitRes || !habitRes.habit) {
      const msg = isFa ? "⚠️ عادت مورد نظر یافت نشد." : "⚠️ Habit not found.";
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }

    const habit = habitRes.habit;
    const isDone = habitRes.isDoneToday;
    const statsHtml = formatIndividualHabitStatsHTML(habit, language, todayFormatted);
    const habitKb = getIndividualHabitKeyboard(habit, isDone, language);
    const habitCoins = habit.rewardCoins || 10;
    const habitXp = habit.rewardXp || 5;
    const rewardAlreadyClaimed = Boolean(habitRes.rewardAlreadyClaimed);

    const updateMsg = isFa
      ? `${isDone ? (rewardAlreadyClaimed ? "🎉 <b>انجام امروز ثبت شد!</b> (پاداش قبلاً دریافت شده)" : `🎉 <b>انجام امروز ثبت شد!</b> (+${habitCoins} سکه 🪙 | +${habitXp} XP)`) : "↩️ <b>ثبت انجام امروز لغو شد.</b>"}\n\n${statsHtml}`
      : `${isDone ? (rewardAlreadyClaimed ? "🎉 <b>تم تسجيل إنجاز اليوم!</b> (تم الحصول على المكافأة مسبقاً)" : `🎉 <b>تم تسجيل إنجاز اليوم!</b> (+${habitCoins} عملات 🪙 | +${habitXp} XP)`) : "↩️ <b>تم إلغاء تسجيل اليوم.</b>"}\n\n${statsHtml}`;

    await sendTelegramMessage(cleanToken, chatId, updateMsg, habitKb);
    return;
  }

  // 1.5. TOGGLE TASK STATUS (from inline button)
  if (normalized.startsWith("toggle_task_")) {
    const taskId = rawText.replace("toggle_task_", "");
    const res = toggledTaskResult || toggleTaskOnServer(taskId);
    if (!res || !res.task) {
      const notFoundMsg = isFa ? "⚠️ تسک مورد نظر یافت نشد." : "⚠️ Task not found.";
      await sendTelegramMessage(cleanToken, chatId, notFoundMsg, keyboards.inlineMarkup);
      return;
    }

    const { task, coinsAwarded, xpAwarded } = res;
    const taskDetailsHtml = formatIndividualTaskHTML(task, language);
    const taskKb = getIndividualTaskKeyboard(task, language);

    let rewardNotice = "";
    if (task.completed) {
      if ((coinsAwarded || 0) > 0) {
        rewardNotice = isFa
          ? `🎉 <b>تسک با موفقیت تکمیل شد!</b> (+${coinsAwarded} سکه 🪙 | +${xpAwarded || 2} XP)\n\n`
          : isAr
          ? `🎉 <b>تم إنجاز المهمة بنجاح!</b> (+${coinsAwarded} عملات 🪙 | +${xpAwarded || 2} XP)\n\n`
          : `🎉 <b>Task completed!</b> (+${coinsAwarded} Coins 🪙 | +${xpAwarded || 2} XP)\n\n`;
      } else {
        rewardNotice = isFa
          ? `🎉 <b>تسک تکمیل شد!</b> (پاداش این دوره قبلاً دریافت شده است)\n\n`
          : isAr
          ? `🎉 <b>تم إنجاز المهمة!</b> (تم الحصول على المكافأة مسبقاً)\n\n`
          : `🎉 <b>Task completed!</b> (Reward already claimed for this cycle)\n\n`;
      }
    } else {
      rewardNotice = isFa
        ? `↩️ <b>تسک مجدداً به وضعیت فعال (در انتظار) برگشت.</b>\n\n`
        : isAr
        ? `↩️ <b>تمت إعادة المهمة إلى قيد الانتظار.</b>\n\n`
        : `↩️ <b>Task set back to pending.</b>\n\n`;
    }

    await sendTelegramMessage(cleanToken, chatId, rewardNotice + taskDetailsHtml, taskKb);
    return;
  }

  // 1.55. DIRECT CHECK / DONE COMMAND (/check [name/num] or /done [name/num])
  if (
    normalized.startsWith("/check") ||
    normalized.startsWith("/done") ||
    normalized.startsWith("انجام ") ||
    normalized.startsWith("تکمیل ") ||
    normalized.startsWith("ثبت ")
  ) {
    const query = rawText.replace(/^(\/check|\/done|انجام|تکمیل|ثبت)\s*/i, "").trim();
    if (!query) {
      // If no query supplied, show today's checklist directly
      const habits = currentServerState.habits || [];
      const tasks = currentServerState.tasks || [];
      const todayMsg = formatTodayCombinedStatusHTML(language, todayFormatted);
      const todayKb = getTodayCombinedKeyboard(habits, tasks, language, todayFormatted);
      await sendTelegramMessage(cleanToken, chatId, todayMsg, { inline_keyboard: todayKb });
      return;
    }

    const match = findHabitOrTaskByQuery(query, todayFormatted);
    if (!match) {
      const notFoundText = isFa
        ? `⚠️ <b>موردی با عنوان یا شماره «${query}» یافت نشد!</b>\n\nبرای ثبت، نام یا شماره مورد نظر را بنویسید (مثال: <code>/done ورزش</code> یا <code>/done 1</code>).\nیا برای مشاهده همه موارد دستور <code>/today</code> را ارسال فرمایید.`
        : isAr
        ? `⚠️ لم يتم العثور على «${query}»! استخدم <code>/done 1</code> أو <code>/today</code>.`
        : `⚠️ Could not find "${query}"! Use <code>/done 1</code> or <code>/today</code>.`;
      
      const habits = currentServerState.habits || [];
      const tasks = currentServerState.tasks || [];
      const todayKb = getTodayCombinedKeyboard(habits, tasks, language, todayFormatted);
      await sendTelegramMessage(cleanToken, chatId, notFoundText, { inline_keyboard: todayKb });
      return;
    }

    if (match.type === "habit") {
      const res = toggleHabitTodayOnServer(match.item.id, todayFormatted);
      const habit = res ? res.habit : match.item;
      const isDone = res ? res.isDoneToday : true;
      const statsHtml = formatIndividualHabitStatsHTML(habit, language, todayFormatted);
      const habitKb = getIndividualHabitKeyboard(habit, isDone, language);

      const msg = isFa
        ? `${isDone ? "🎉 <b>انجام امروز ثبت شد!</b> (+۱۰ سکه 🪙 | +۵ XP)" : "↩️ <b>ثبت انجام امروز لغو شد.</b>"}\n\n${statsHtml}`
        : `${isDone ? "🎉 <b>تم تسجيل إنجاز اليوم!</b>" : "↩️ <b>تم إلغاء تسجيل اليوم.</b>"}\n\n${statsHtml}`;

      await sendTelegramMessage(cleanToken, chatId, msg, habitKb);
      return;
    } else {
      // Task
      let res = null;
      if (!match.item.completed) {
        res = toggleTaskOnServer(match.item.id);
      } else {
        res = { task: match.item, isCompleted: true, coinsAwarded: match.item.rewardCoins || 5, xpAwarded: match.item.rewardXp || 15 };
      }
      const task = res?.task || match.item;
      const taskHtml = formatIndividualTaskHTML(task, language);
      const taskKb = getIndividualTaskKeyboard(task, language);

      const msg = isFa
        ? `🎉 <b>تسک «${task.title}» با موفقیت تکمیل شد!</b> (+${res?.coinsAwarded || 5} سکه 🪙 | +${res?.xpAwarded || 15} XP)\n\n${taskHtml}`
        : `🎉 <b>Task "${task.title}" completed!</b>\n\n${taskHtml}`;

      await sendTelegramMessage(cleanToken, chatId, msg, taskKb);
      return;
    }
  }

  // 1.56. DIRECT UNCHECK / UNDO COMMAND (/uncheck [name/num] or /undo [name/num])
  if (
    normalized.startsWith("/uncheck") ||
    normalized.startsWith("/undo") ||
    normalized.startsWith("لغو ") ||
    normalized.startsWith("برگشت ")
  ) {
    const query = rawText.replace(/^(\/uncheck|\/undo|لغو|برگشت)\s*/i, "").trim();
    if (!query) {
      const habits = currentServerState.habits || [];
      const tasks = currentServerState.tasks || [];
      const todayMsg = formatTodayCombinedStatusHTML(language, todayFormatted);
      const todayKb = getTodayCombinedKeyboard(habits, tasks, language, todayFormatted);
      await sendTelegramMessage(cleanToken, chatId, todayMsg, { inline_keyboard: todayKb });
      return;
    }

    const match = findHabitOrTaskByQuery(query, todayFormatted);
    if (!match) {
      const notFoundText = isFa
        ? `⚠️ <b>موردی با عنوان یا شماره «${query}» یافت نشد!</b>`
        : `⚠️ Item "${query}" not found!`;
      await sendTelegramMessage(cleanToken, chatId, notFoundText, keyboards.inlineMarkup);
      return;
    }

    if (match.type === "habit") {
      // If done, toggle it back
      if (match.item.history?.[todayFormatted]) {
        toggleHabitTodayOnServer(match.item.id, todayFormatted);
      }
      const statsHtml = formatIndividualHabitStatsHTML(match.item, language, todayFormatted);
      const habitKb = getIndividualHabitKeyboard(match.item, false, language);
      const msg = isFa
        ? `↩️ <b>ثبت انجام امروز برای «${match.item.name}» لغو گردید.</b>\n\n${statsHtml}`
        : `↩️ <b>Marked undone for today.</b>\n\n${statsHtml}`;
      await sendTelegramMessage(cleanToken, chatId, msg, habitKb);
      return;
    } else {
      if (match.item.completed) {
        toggleTaskOnServer(match.item.id);
      }
      const taskHtml = formatIndividualTaskHTML(match.item, language);
      const taskKb = getIndividualTaskKeyboard(match.item, language);
      const msg = isFa
        ? `↩️ <b>تسک «${match.item.title}» مجدداً به وضعیت فعال (در انتظار) برگشت.</b>\n\n${taskHtml}`
        : `↩️ <b>Task set back to pending.</b>\n\n${taskHtml}`;
      await sendTelegramMessage(cleanToken, chatId, msg, taskKb);
      return;
    }
  }

  // 1.57. LIVE SYNC DIAGNOSTIC COMMAND (/sync or cmd_sync)
  if (
    normalized === "cmd_sync" ||
    normalized.startsWith("/sync") ||
    normalized.includes("همگام") ||
    normalized.includes("مزامنة") ||
    normalized.includes("sync")
  ) {
    const habits = currentServerState.habits || [];
    const tasks = currentServerState.tasks || [];
    const wallet = currentServerState.wallet || { coins: 100, totalEarned: 100, streakMultiplier: 1 };
    const habitsDoneToday = habits.filter((h) => !!h.history?.[todayFormatted]).length;
    const tasksCompleted = tasks.filter((t) => t.completed).length;
    const tasksPending = tasks.length - tasksCompleted;

    const syncReport = isFa
      ? `🔄 <b>وضعیت همگام‌سازی بلادرنگ (Real-Time Live Sync):</b>\n\n` +
        `✅ <b>وضعیت ارتباط:</b> کاملاً متصل و برخط (Real-Time Active)\n` +
        `🌐 <b>سامانه همگام:</b> تلگرام ⇄ وب‌اپلیکیشن ⇄ دیتابیس پایدار\n` +
        `⏱️ <b>آخرین تغییرات سرور:</b> <code>${new Date(currentServerState.lastSyncTimestamp || Date.now()).toLocaleTimeString("fa-IR")}</code>\n\n` +
        `📊 <b>خلاصه عادات شما:</b>\n` +
        `• کل عادات ثبت‌شده: <b>${habits.length}</b> عادت\n` +
        `• انجام شده برای امروز: <b>${habitsDoneToday}</b> از <b>${habits.length}</b> (${habits.length > 0 ? Math.round((habitsDoneToday / habits.length) * 100) : 0}٪)\n\n` +
        `📝 <b>خلاصه تسک‌ها و وظایف:</b>\n` +
        `• کل تسک‌ها: <b>${tasks.length}</b> تسک\n` +
        `• ✅ تکمیل شده: <b>${tasksCompleted}</b> | ⏳ در انتظار: <b>${tasksPending}</b>\n\n` +
        `💰 <b>موجودی کیف پول:</b> 🪙 <b>${wallet.coins || 0}</b> سکه\n\n` +
        `<i>هر تغییری در تلگرام بلافاصله در وب‌اپلیکیشن و هر تغییری در وب‌اپلیکیشن فوراً در این ربات همگام می‌گردد.</i>`
      : isAr
      ? `🔄 <b>حالة المزامنة الفورية:</b>\n\n` +
        `✅ <b>الاتصال:</b> نشط ومتصل بالكامل\n` +
        `📊 العادات: <b>${habitsDoneToday}/${habits.length}</b> منجز اليوم\n` +
        `📝 المهام: <b>${tasksCompleted}/${tasks.length}</b> مكتملة\n` +
        `💰 المحفظة: <b>${wallet.coins || 0}</b> عملة`
      : `🔄 <b>Real-Time Live Sync Status:</b>\n\n` +
        `✅ <b>Connection:</b> Fully Online & Synced\n` +
        `📊 Habits: <b>${habitsDoneToday}/${habits.length}</b> done today\n` +
        `📝 Tasks: <b>${tasksCompleted}/${tasks.length}</b> completed (${tasksPending} pending)\n` +
        `💰 Coins: <b>${wallet.coins || 0}</b> 🪙`;

    const syncKb = {
      inline_keyboard: [
        [
          { text: isFa ? "📅 چک‌لیست امروز" : "📅 Today's List", callback_data: "cmd_today" },
          { text: isFa ? "🔄 بروزرسانی مجدد" : "🔄 Refresh", callback_data: "cmd_sync" },
        ],
        [
          { text: isFa ? "📋 لیست عادات" : "📋 All Habits", callback_data: "cmd_habits" },
          { text: isFa ? "📝 لیست تسک‌ها" : "📝 All Tasks", callback_data: "cmd_tasks" },
        ],
        [
          { text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Hub", callback_data: "cmd_menu" },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, syncReport, syncKb);
    return;
  }

  // 1.6. INDIVIDUAL TASK STATS (by ID)
  if (normalized.startsWith("stat_task_")) {
    const taskId = rawText.replace("stat_task_", "");
    const targetTask = (currentServerState.tasks || []).find((t: any) => t.id === taskId);
    if (!targetTask) {
      const notFoundMsg = isFa ? "⚠️ تسک مورد نظر یافت نشد." : "⚠️ Task not found.";
      const tasksKb = getTasksListKeyboard(currentServerState.tasks || [], language);
      await sendTelegramMessage(cleanToken, chatId, notFoundMsg, tasksKb);
      return;
    }

    const taskHtml = formatIndividualTaskHTML(targetTask, language);
    const taskKb = getIndividualTaskKeyboard(targetTask, language);
    await sendTelegramMessage(cleanToken, chatId, taskHtml, taskKb);
    return;
  }

  // 2. INDIVIDUAL HABIT STATS (by ID or name)
  if (
    normalized.startsWith("stat_") ||
    normalized.startsWith("/habit") ||
    (normalized.startsWith("/stats") && normalized.length > 7)
  ) {
    let targetHabit: any = null;

    if (normalized.startsWith("stat_")) {
      const habitId = rawText.replace("stat_", "");
      targetHabit = currentServerState.habits.find((h) => h.id === habitId);
    } else {
      // Search by habit name
      const searchParam = rawText.replace(/^\/(habit|stats)\s*/i, "").trim().toLowerCase();
      if (searchParam) {
        targetHabit = currentServerState.habits.find(
          (h) => h.name.toLowerCase() === searchParam || h.name.toLowerCase().includes(searchParam)
        );
      }
    }

    if (!targetHabit) {
      const notFoundMsg = isFa
        ? `⚠️ <b>عادت مورد نظر یافت نشد!</b>\n\nبرای مشاهده لیست تمام عادات و انتخاب از بین آنها، دکمه «لیست و آمار عادات» را بزنید.`
        : `⚠️ <b>Habit not found!</b>\n\nTap "Habits & Stats" to view all available habits.`;
      
      const listKb = getHabitsListKeyboard(currentServerState.habits, language, todayFormatted);
      await sendTelegramMessage(cleanToken, chatId, notFoundMsg, listKb);
      return;
    }

    const statsHtml = formatIndividualHabitStatsHTML(targetHabit, language, todayFormatted);
    const isDoneToday = !!targetHabit.history?.[todayFormatted];
    const habitKb = getIndividualHabitKeyboard(targetHabit, isDoneToday, language);

    await sendTelegramMessage(cleanToken, chatId, statsHtml, habitKb);
    return;
  }

  // 3. HABITS LIST & INDIVIDUAL STATS DIRECTORY
  if (
    normalized === "cmd_habits" ||
    normalized.startsWith("/habits") ||
    normalized === "/list" ||
    normalized.includes("عادات") ||
    normalized.includes("عادت ها") ||
    normalized.includes("عادت‌ها") ||
    normalized.includes("قائمة العادات") ||
    normalized.includes("habits")
  ) {
    const habits = currentServerState.habits || [];
    if (habits.length === 0) {
      const noHabitsMsg = isFa
        ? `⚠️ <b>هیچ عادتی در سیستم ثبت نشده است!</b>\n\nبرای شروع، می‌توانید با زدن دکمه <b>«افزودن عادت جدید»</b> یا ارسال دستور <code>/add نام_عادت</code> اولین عادت خود را ایجاد کنید.`
        : isAr
        ? `⚠️ <b>لا توجد عادات مسجلة بعد!</b>\n\nأرسل <code>/add اسم_العادة</code> لإضافة عادتك الأولى.`
        : `⚠️ <b>No habits registered yet!</b>\n\nUse <code>/add habit_name</code> or tap Add Habit to create your first habit.`;

      const emptyKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "➕ افزودن عادت جدید" : isAr ? "➕ إضافة عادة جديدة" : "➕ Add Habit",
              callback_data: "cmd_add_prompt",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, noHabitsMsg, emptyKb);
      return;
    }

    const listMsg = isFa
      ? `📋 <b>فهرست و کارنامه اختصاصی عادات شما:</b>\n\nبرای مشاهده <b>تحلیل نوروساینس، درصد خودکارشدگی، زنجیره‌ها و ثبت وضعیت</b> هر عادت، روی آن کلیک کنید:`
      : isAr
      ? `📋 <b>قائمة عاداتك والإحصائيات التفصيلية:</b>\n\nاضغط على أي عادة لعرض مؤشرات التلقائية العصبية والسلاسل وتفاصيلها:`
      : `📋 <b>Your Habits & Neural Automaticity Directory:</b>\n\nTap on any habit to inspect its detailed Lally metrics, streaks, and check-in options:`;

    const listKb = getHabitsListKeyboard(habits, language, todayFormatted);
    await sendTelegramMessage(cleanToken, chatId, listMsg, listKb);
    return;
  }

  // 4. ADD HABIT (Prompt or Direct)
  if (
    normalized.startsWith("/add") ||
    normalized.startsWith("/new") ||
    normalized === "cmd_add_prompt" ||
    normalized.includes("افزودن") ||
    normalized.includes("اضافه") ||
    normalized.includes("اضافة") ||
    normalized.includes("إضافة") ||
    normalized.includes("add habit") ||
    normalized === "add"
  ) {
    // Check if habit name was provided directly in command: e.g. /add 30 min reading
    const directName = rawText.replace(/^\/(add|new)\s*/i, "").trim();
    if (
      directName.length > 0 &&
      !directName.startsWith("/") &&
      !directName.startsWith("➕") &&
      directName !== "افزودن عادت" &&
      directName !== "اضافه کردن عادت" &&
      directName !== "إضافة عادة" &&
      directName !== "add habit"
    ) {
      const newHabit = createHabitOnServer(directName);
      const successMsg = isFa
        ? `✅ <b>عادت جدید «${newHabit.name}» با موفقیت اضافه شد!</b>\n\n🎯 <b>هدف علمی:</b> ۶۶ روز تکرار پیوسته بر اساس مدل لالی (۲۰۱۰).\n\n👇 <i>می‌توانید وضعیت امروز این عادت را ثبت کنید یا آمار آن را ببینید:</i>`
        : isAr
        ? `✅ <b>تمت إضافة العادة «${newHabit.name}» بنجاح!</b>\n\n🎯 <b>الهدف:</b> 66 يوماً للترسيخ العصبي.`
        : `✅ <b>Habit "${newHabit.name}" added successfully!</b>\n\n🎯 <b>Target:</b> 66 days automaticity goal.`;

      const habitKb = getIndividualHabitKeyboard(newHabit, false, language);
      await sendTelegramMessage(cleanToken, chatId, successMsg, habitKb);
      return;
    }

    // Set pending conversation state
    chatPendingActions[chatId] = { action: "awaiting_habit_name", timestamp: Date.now() };

    const promptMsg = isFa
      ? `✍️ <b>افزودن عادت علمی جدید</b>\n\nلطفاً <b>نام عادت</b> مورد نظر خود را بنویسید و ارسال کنید:\n(مثلاً: <code>ورزش صبحگاهی</code> یا <code>۳۰ دقیقه مطالعه تخصصی</code>)\n\n<i>یا از قالب مستقیم:</i> <code>/add نام_عادت</code> <i>استفاده کنید.</i>`
      : isAr
      ? `✍️ <b>إضافة عادة جديدة</b>\n\nيرجى إرسال اسم العادة الجديدة:\n(مثال: <code>رياضة صباحية</code> أو <code>قراءة ٢٠ دقيقة</code>)\n\n<i>أو استخدم:</i> <code>/add اسم_العادة</code>`
      : `✍️ <b>Add New Habit</b>\n\nPlease type and send the name of the new habit:\n(e.g. <code>Morning Workout</code> or <code>Read 20 mins</code>)\n\n<i>Or send:</i> <code>/add Habit Name</code>`;

    const cancelKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "❌ انصراف" : isAr ? "❌ إلغاء" : "❌ Cancel",
            callback_data: "cmd_habits",
          },
        ],
      ],
    };

    const promptRes = await sendTelegramMessage(cleanToken, chatId, promptMsg, cancelKb);
    const promptMsgId = promptRes?.result?.message_id;
    chatPendingActions[chatId] = {
      action: "awaiting_habit_name",
      timestamp: Date.now(),
      promptMessageId: promptMsgId,
    } as any;
    return;
  }

  // 4.5. TASKS DIRECTORY & LIST
  if (
    normalized === "cmd_tasks" ||
    normalized.startsWith("/tasks") ||
    normalized === "/task" ||
    normalized.includes("تسک‌ها") ||
    normalized.includes("تسک ها") ||
    normalized.includes("وظایف") ||
    normalized.includes("المهام") ||
    normalized === "tasks"
  ) {
    const tasks = currentServerState.tasks || [];
    if (tasks.length === 0) {
      const noTasksMsg = isFa
        ? `📝 <b>هیچ تسکی در لیست شما ثبت نشده است!</b>\n\nمی‌توانید با زدن دکمه <b>«افزودن تسک جدید»</b> یا ارسال <code>/addtask عنوان_تسک</code> اولین تسک خود را اضافه کنید.`
        : isAr
        ? `📝 <b>لا توجد مهام مسجلة بعد!</b>\n\nأرسل <code>/addtask اسم_المهمة</code> لإضافة مهمتك الأولى.`
        : `📝 <b>No tasks registered yet!</b>\n\nUse <code>/addtask Task Title</code> to create your first task.`;

      const emptyKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "➕ افزودن تسک جدید" : isAr ? "➕ إضافة مهمة جديدة" : "➕ Add Task",
              callback_data: "cmd_addtask_prompt",
            },
          ],
          [
            {
              text: isFa ? "🏠 پیشخوان اصلی" : isAr ? "🏠 الرئيسية" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, noTasksMsg, emptyKb);
      return;
    }

    const tasksHtml = formatTasksListHTML(language);
    const tasksKb = getTasksListKeyboard(tasks, language);
    await sendTelegramMessage(cleanToken, chatId, tasksHtml, tasksKb);
    return;
  }

  // 4.6. ADD TASK (Prompt or Direct)
  if (
    normalized.startsWith("/addtask") ||
    normalized.startsWith("/newtask") ||
    normalized === "cmd_addtask_prompt" ||
    normalized.includes("افزودن تسک") ||
    normalized.includes("اضافه کردن تسک") ||
    normalized.includes("إضافة مهمة") ||
    normalized.includes("add task")
  ) {
    const directTitle = rawText.replace(/^\/(addtask|newtask)\s*/i, "").trim();
    if (
      directTitle.length > 0 &&
      !directTitle.startsWith("/") &&
      !directTitle.startsWith("➕") &&
      directTitle !== "افزودن تسک" &&
      directTitle !== "اضافه کردن تسک" &&
      directTitle !== "إضافة مهمة" &&
      directTitle !== "add task"
    ) {
      const newTask = createTaskOnServer(directTitle);
      const successMsg = isFa
        ? `✅ <b>تسک جدید «${newTask.title}» با موفقیت اضافه شد!</b>\n\n⭐ <b>پاداش انجام:</b> +۵ سکه 🪙 و +۱۵ XP\n\n👇 <i>جهت ثبت وضعیت یا مدیریت تسک کلیک کنید:</i>`
        : isAr
        ? `✅ <b>تمت إضافة المهمة «${newTask.title}» بنجاح!</b>`
        : `✅ <b>Task "${newTask.title}" created successfully!</b>`;

      const taskKb = getIndividualTaskKeyboard(newTask, language);
      await sendTelegramMessage(cleanToken, chatId, successMsg, taskKb);
      return;
    }

    chatPendingActions[chatId] = { action: "awaiting_task_name", timestamp: Date.now() };

    const promptMsg = isFa
      ? `✍️ <b>افزودن تسک جدید</b>\n\nلطفاً <b>عنوان تسک یا وظیفه</b> مورد نظر خود را بنویسید و ارسال کنید:\n(مثلاً: <code>ارسال گزارش پایان ماه به مدیر</code> یا <code>مرور فلش‌کارت‌های زبان</code>)\n\n<i>یا از قالب مستقیم:</i> <code>/addtask عنوان_تسک</code> <i>استفاده کنید.</i>`
      : isAr
      ? `✍️ <b>إضافة مهمة جديدة</b>\n\nيرجى إرسال عنوان المهمة:\n<i>أو استخدم:</i> <code>/addtask عنوان_المهمة</code>`
      : `✍️ <b>Add New Task</b>\n\nPlease type and send your task title:\n<i>Or send:</i> <code>/addtask Task Title</code>`;

    const cancelKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "❌ انصراف" : isAr ? "❌ إلغاء" : "❌ Cancel",
            callback_data: "cmd_tasks",
          },
        ],
      ],
    };

    const promptRes = await sendTelegramMessage(cleanToken, chatId, promptMsg, cancelKb);
    const promptMsgId = promptRes?.result?.message_id;
    chatPendingActions[chatId] = {
      action: "awaiting_task_name",
      timestamp: Date.now(),
      promptMessageId: promptMsgId,
    } as any;
    return;
  }

  // 5. DELETE HABIT OR TASK (Prompt, Ask, Confirm, Cancel)
  if (normalized.startsWith("del_task_confirm_")) {
    const taskId = rawText.replace("del_task_confirm_", "");
    const deleted = deleteTaskOnServer(taskId);
    const doneMsg = isFa
      ? `🗑️ <b>تسک ${deleted ? `«${deleted.title}»` : ""} با موفقیت حذف شد.</b>`
      : `🗑️ <b>Task deleted successfully.</b>`;

    const afterKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "📋 فهرست تسک‌ها" : isAr ? "📋 قائمة المهام" : "📋 Tasks List",
            callback_data: "cmd_tasks",
          },
          {
            text: isFa ? "➕ افزودن تسک جدید" : isAr ? "➕ إضافة مهمة" : "➕ Add Task",
            callback_data: "cmd_addtask_prompt",
          },
        ],
      ],
    };
    await sendTelegramMessage(cleanToken, chatId, doneMsg, afterKb);
    return;
  }

  if (normalized.startsWith("del_task_ask_")) {
    const taskId = rawText.replace("del_task_ask_", "");
    const targetTask = (currentServerState.tasks || []).find((t: any) => t.id === taskId);
    if (!targetTask) {
      const notFoundMsg = isFa ? "⚠️ تسک مورد نظر یافت نشد." : "⚠️ Task not found.";
      await sendTelegramMessage(cleanToken, chatId, notFoundMsg, keyboards.inlineMarkup);
      return;
    }

    const askMsg = isFa
      ? `⚠️ <b>آیا از حذف تسک «${targetTask.title}» مطمئن هستید؟</b>`
      : `⚠️ <b>Are you sure you want to delete task "${targetTask.title}"?</b>`;

    const confirmKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "🗑️ بله، حذف شود" : "🗑️ Yes, Delete",
            callback_data: `del_task_confirm_${targetTask.id}`,
          },
          {
            text: isFa ? "❌ خیر، انصراف" : "❌ Cancel",
            callback_data: "cmd_tasks",
          },
        ],
      ],
    };
    await sendTelegramMessage(cleanToken, chatId, askMsg, confirmKb);
    return;
  }

  if (normalized === "del_cancel") {
    delete chatPendingActions[chatId];
    const cancelMsg = isFa ? "❌ عملیات حذف لغو گردید." : "❌ Habit deletion cancelled.";
    await sendTelegramMessage(cleanToken, chatId, cancelMsg, keyboards.inlineMarkup);
    return;
  }

  if (normalized.startsWith("del_confirm_")) {
    const habitId = rawText.replace("del_confirm_", "");
    const deleted = deleteHabitOnServer(habitId);
    const habitName = typeof deleted === "object" && deleted ? deleted.name : "";

    const doneMsg = isFa
      ? `🗑️ <b>عادت ${habitName ? `«${habitName}»` : ""} با موفقیت حذف گردید.</b>\n\nکلیه سوابق و تنظیمات این عادت پاک شدند.`
      : isAr
      ? `🗑️ <b>تم حذف العادة بنجاح.</b>`
      : `🗑️ <b>Habit deleted successfully.</b>`;

    const afterKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "📋 مشاهده لیست عادات" : isAr ? "📋 قائمة العادات" : "📋 Habit List",
            callback_data: "cmd_habits",
          },
          {
            text: isFa ? "➕ افزودن عادت جدید" : isAr ? "➕ إضافة عادة" : "➕ Add Habit",
            callback_data: "cmd_add_prompt",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, doneMsg, afterKb);
    return;
  }

  if (normalized.startsWith("del_ask_")) {
    const habitId = rawText.replace("del_ask_", "");
    const targetHabit = currentServerState.habits.find((h) => h.id === habitId);
    if (!targetHabit) {
      const notFoundMsg = isFa ? "⚠️ عادت مورد نظر یافت نشد." : "⚠️ Habit not found.";
      await sendTelegramMessage(cleanToken, chatId, notFoundMsg, keyboards.inlineMarkup);
      return;
    }

    const askMsg = isFa
      ? `⚠️ <b>آیا از حذف کامل عادت «${targetHabit.name}» مطمئن هستید؟</b>\n\n📌 <i>توجه: با این اقدام، کلیه سوابق روزانه، زنجیره‌ها و پیشرفت مدل لالی این عادت برای همیشه پاک خواهند شد.</i>`
      : isAr
      ? `⚠️ <b>هل أنت متأكد من حذف العادة «${targetHabit.name}»؟</b>\n\n📌 <i>سيتم حذف كافة السجلات ونسب التلقائية بشكل نهائي.</i>`
      : `⚠️ <b>Are you sure you want to delete "${targetHabit.name}"?</b>\n\n📌 <i>All logs, streaks, and neural progress for this habit will be permanently removed.</i>`;

    const confirmKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "🗑️ بله، کاملاً حذف شود" : isAr ? "🗑️ نعم، حذف نهائي" : "🗑️ Yes, Delete",
            callback_data: `del_confirm_${targetHabit.id}`,
          },
          {
            text: isFa ? "❌ خیر، انصراف" : isAr ? "❌ إلغاء" : "❌ Cancel",
            callback_data: "del_cancel",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, askMsg, confirmKb);
    return;
  }

  if (
    normalized.startsWith("/delete") ||
    normalized.startsWith("/del") ||
    normalized === "cmd_delete_prompt" ||
    normalized.includes("حذف") ||
    normalized.includes("delete habit") ||
    normalized === "delete" ||
    normalized === "del"
  ) {
    const habits = currentServerState.habits || [];
    if (habits.length === 0) {
      const emptyMsg = isFa ? "⚠️ هیچ عادتی برای حذف وجود ندارد." : "⚠️ No habits to delete.";
      await sendTelegramMessage(cleanToken, chatId, emptyMsg, keyboards.inlineMarkup);
      return;
    }

    // Direct deletion with name e.g. /delete کتاب
    const searchParam = rawText.replace(/^\/(delete|del)\s*/i, "").trim().toLowerCase();
    if (
      searchParam &&
      searchParam !== "حذف عادت" &&
      searchParam !== "حذف عادة" &&
      searchParam !== "delete habit" &&
      !searchParam.startsWith("🗑️")
    ) {
      const match = habits.find(
        (h) => h.name.toLowerCase() === searchParam || h.name.toLowerCase().includes(searchParam)
      );
      if (match) {
        // Route to ask confirmation
        const askMsg = isFa
          ? `⚠️ <b>آیا از حذف کامل عادت «${match.name}» مطمئن هستید؟</b>`
          : `⚠️ <b>Confirm deletion of "${match.name}"?</b>`;
        const confirmKb = {
          inline_keyboard: [
            [
              {
                text: isFa ? "🗑️ بله، حذف شود" : "🗑️ Yes, Delete",
                callback_data: `del_confirm_${match.id}`,
              },
              { text: isFa ? "❌ انصراف" : "❌ Cancel", callback_data: "del_cancel" },
            ],
          ],
        };
        await sendTelegramMessage(cleanToken, chatId, askMsg, confirmKb);
        return;
      }
    }

    const delPromptMsg = isFa
      ? `🗑️ <b>انتخاب عادت جهت حذف:</b>\n\nروی عادتی که قصد حذف آن را دارید کلیک کنید:`
      : isAr
      ? `🗑️ <b>اختر العادة المراد حذفها:</b>`
      : `🗑️ <b>Select a habit to delete:</b>`;

    const delKb = getDeleteHabitKeyboard(habits, language);
    await sendTelegramMessage(cleanToken, chatId, delPromptMsg, delKb);
    return;
  }

  // 6. REPORT COMMAND / REQUEST (Comprehensive AI Coaching)
  if (
    normalized.startsWith("/report") ||
    normalized.startsWith("/ai") ||
    normalized.startsWith("/coach") ||
    normalized === "cmd_report" ||
    normalized.includes("تحلیل") ||
    normalized.includes("هوش مصنوعی") ||
    normalized.includes("گزارش") ||
    normalized.includes("تقرير") ||
    normalized.includes("ذكاء") ||
    normalized.includes("ai analysis") ||
    normalized.includes("ai report") ||
    normalized.includes("coach") ||
    normalized === "ai" ||
    normalized === "report"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    
    const habitsSummary = getHabitsSummaryFromState();
    if (!habitsSummary || habitsSummary.length === 0) {
      const noHabitsMsg = isFa
        ? `⚠️ <b>هیچ عادتی در سیستم ثبت نشده است!</b>\n\nلطفاً ابتدا با زدن دکمه <b>«افزودن عادت»</b> یا از طریق وب‌اپلیکیشن، عادات خود را تعریف فرمایید تا هوش مصنوعی بتواند روند پیشرفت شما را تحلیل کند.`
        : isAr
        ? `⚠️ <b>لا توجد عادات مسجلة بعد!</b>\n\nيرجى إضافة عاداتك أولاً.`
        : `⚠️ <b>No habits registered yet!</b>\n\nPlease add habits first so AI can analyze your neural progress.`;
      
      const emptyKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "➕ افزودن اولین عادت" : "➕ Add First Habit",
              callback_data: "cmd_add_prompt",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, noHabitsMsg, emptyKb);
      return;
    }

    const waitMsg = isFa
      ? `⏳ <i>در حال بررسی داده‌ها و تولید گزارش تحلیلی هوش مصنوعی بر اساس مدل لالی (۲۰۱۰)...</i>`
      : isAr
      ? `⏳ <i>جاري تحليل البيانات وإعداد التقرير بالذكاء الاصطناعي...</i>`
      : `⏳ <i>Analyzing habits data with AI based on Lally (2010) model...</i>`;

    await sendTelegramMessage(cleanToken, chatId, waitMsg);
    await sendTelegramChatAction(cleanToken, chatId, "typing");

    const ai = getGenAI();

    const langInstructions: Record<string, string> = {
      fa: `زبان خروجی باید کاملاً فارسی سلیس، حرفه‌ای، محترمانه و دقیق باشد.`,
      ar: `يجب أن تكون لغة الإخراج باللغة العربية الفصحى الأنيقة والمهنية والمحفزة.`,
      en: `The output language must be fluent, empowering, and scientific English.`,
    };

    const prompt = `You are an expert behavioural neuroscientist and habit formation coach based on Phillippa Lally's landmark study (2010, European Journal of Social Psychology) on habit automaticity.

Analyze the user's daily habits data:
${JSON.stringify(habitsSummary, null, 2)}
Today's date: ${todayFormatted}

Language rule: ${langInstructions[language] || langInstructions.fa}

Please generate a comprehensive daily habit formation report with summary, detailed critique, actionable scientific tips, and a motivational quote. Respond only with valid JSON with keys: title, overview, habitFeedback (array of {name, status, critiqueAndTip}), generalCritique, actionableTips, motivationalQuote.`;

    const matrix = buildComprehensiveUserBehavioralMatrix(
      habitsSummary,
      currentServerState.tasks,
      currentServerState.wallet,
      language,
      todayFormatted
    );
    const reportData = await generateAIReport(prompt, matrix, language, todayFormatted);
    const reportHtml = formatTelegramReportHTML(reportData, habitsSummary, language, todayFormatted);

    const shouldSendVisualChart = currentServerState.telegramConfig?.sendVisualCharts !== false;
    if (shouldSendVisualChart && habitsSummary.length > 0) {
      const chartUrl = generateHabitsChartUrl(habitsSummary, language);
      const chartCaption = isFa
        ? `📊 <b>${reportData.title || "گزارش تحلیلی عادات و پیشرفت عصبی"}</b>\n<i>اینفوگرافیک و نمودار خودکارشدگی عادات (مدل لالی ۲۰۱۰)</i>`
        : isAr
        ? `📊 <b>${reportData.title || "تقرير العادات والتقدم العصبي"}</b>\n<i>مخطط التلقائية والترسيخ العصبي (نموذج لالي)</i>`
        : `📊 <b>${reportData.title || "Habit Neural Formation Report"}</b>\n<i>Visual Habit Automaticity Chart (Lally 2010)</i>`;

      await sendTelegramPhoto(cleanToken, chatId, chartUrl, chartCaption);
    }

    await sendTelegramMessage(cleanToken, chatId, reportHtml, keyboards.inlineMarkup);
    return;
  }

  // 6.4. INDIVIDUAL HABIT MATRIX PHOTO
  if (normalized.startsWith("chart_habit_")) {
    const habitId = rawText.replace("chart_habit_", "");
    const habit = currentServerState.habits.find((h) => h.id === habitId);
    if (!habit) {
      const msg = isFa ? "⚠️ عادت مورد نظر یافت نشد." : "⚠️ Habit not found.";
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }

    await sendTelegramChatAction(cleanToken, chatId, "upload_photo");
    const photoRes = await sendIndividualHabitMatrixPhoto(cleanToken, chatId, habit, language, todayFormatted);
    if (!photoRes.ok) {
      const fallbackMsg = isFa ? "⚠️ خطا در تولید تصویر ماتریس عادت." : "⚠️ Error generating habit matrix image.";
      await sendTelegramMessage(cleanToken, chatId, fallbackMsg, keyboards.inlineMarkup);
    }
    return;
  }

  // 6.5. CHART INFOGRAPHIC COMMAND / REQUEST (Send Individual Habit Matrix Charts)
  if (
    normalized.startsWith("/chart") ||
    normalized === "cmd_chart" ||
    normalized.includes("نمودار") ||
    normalized.includes("مخطط") ||
    normalized.includes("ماتریس") ||
    normalized.includes("مصفوفة") ||
    normalized === "chart" ||
    normalized === "matrix"
  ) {
    const isFa = language === "fa";
    const isAr = language === "ar";
    const habits = currentServerState.habits || [];

    if (habits.length === 0) {
      const noHabitsMsg = isFa
        ? `⚠️ <b>عادتی برای رسم نمودار ثبت نشده است!</b>\n\nابتدا عادات خود را از طریق دکمه «افزودن عادت جدید» یا دستور <code>/add</code> تعریف فرمایید.`
        : isAr
        ? `⚠️ <b>لا توجد عادات مسجلة لرسم المخطط!</b>`
        : `⚠️ <b>No habits found to chart!</b>`;
      await sendTelegramMessage(cleanToken, chatId, noHabitsMsg, keyboards.inlineMarkup);
      return;
    }

    await sendTelegramChatAction(cleanToken, chatId, "upload_photo");

    // Inform user if sending multiple habit matrices
    if (habits.length > 1) {
      const introMsg = isFa
        ? `📊 <b>در حال تولید و ارسال ماتریس‌های اختصاصی برای ${habits.length} عادت شما...</b>\n\n<i>هر تصویر شامل درصد خودکارشدگی، ماتریس فعالیت ۱۴ روزه و روزهای تخمینی تا ۶۶ روز است.</i>`
        : isAr
        ? `📊 <b>جاري إرسال مصفوفات النشاط لـ ${habits.length} عادات...</b>`
        : `📊 <b>Sending individual matrix charts for ${habits.length} habits...</b>`;
      await sendTelegramMessage(cleanToken, chatId, introMsg);
    }

    // Send individual matrix photo for each habit
    for (const h of habits.slice(0, 8)) {
      await sendTelegramChatAction(cleanToken, chatId, "upload_photo");
      await sendIndividualHabitMatrixPhoto(cleanToken, chatId, h, language, todayFormatted);
    }
    return;
  }

  // 6.6. CONCISE REMINDER COMMAND (/reminder, /remind, یادآور, یادآوری)
  if (
    normalized === "cmd_reminder" ||
    normalized.startsWith("/remind") ||
    normalized.startsWith("/reminder") ||
    normalized.includes("یادآور") ||
    normalized.includes("یادآوری") ||
    normalized.includes("تذكير") ||
    normalized === "reminder" ||
    normalized === "remind"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habits = currentServerState.habits || [];
    const tasks = currentServerState.tasks || [];

    const reminderHtml = formatConciseReminderHTML(habits, tasks, language, false, todayFormatted);
    const reminderKb = getConciseReminderKeyboard(habits, tasks, language, todayFormatted);

    await sendTelegramMessage(cleanToken, chatId, reminderHtml, reminderKb);
    return;
  }

  // 7. TODAY CHECKLIST & TODAY'S COMBINED STATUS (Habits & Tasks)
  if (
    normalized === "cmd_today_combined" ||
    normalized.startsWith("/today") ||
    normalized === "cmd_today" ||
    normalized.includes("امروز") ||
    normalized.includes("اليوم") ||
    normalized.includes("today") ||
    normalized.includes("چک‌لیست") ||
    normalized.includes("چک لیست") ||
    normalized.includes("checklist")
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habits = currentServerState.habits || [];
    const tasks = currentServerState.tasks || [];

    const todayHtml = formatTodayCombinedStatusHTML(language, todayFormatted);
    const todayKb = getTodayCombinedKeyboard(habits, tasks, language, todayFormatted);

    await sendTelegramMessage(cleanToken, chatId, todayHtml, todayKb);
    return;
  }

  // 7.04. PROACTIVE COACH SUB-CALLBACKS (toggle / stats / intensity)
  if (normalized.startsWith("cmd_proactive_")) {
    const isFaX = language === "fa";
    const isArX = language === "ar";
    if (normalized === "cmd_proactive_toggle") {
      const cfg = getProactiveConfig(currentServerState);
      const updated = setProactiveConfig(currentServerState, { enabled: !cfg.enabled });
      saveServerStateToDisk();
      const msg = updated.enabled
        ? isFaX ? "✅ مربی پیش‌دستانه روشن شد." : isArX ? "✅ تم تشغيل المدرب الاستباقي." : "✅ Proactive coach enabled."
        : isFaX ? "⛔ مربی پیش‌دستانه خاموش شد." : isArX ? "⛔ تم إطفاء المدرب الاستباقي." : "⛔ Proactive coach disabled.";
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }
    if (normalized === "cmd_proactive_stats") {
      const d = getProactiveDiagnostics(currentServerState);
      const msg = isFaX
        ? `📊 <b>آمار مربی پیش‌دستانه</b>\n\n` +
          `📨 کل ارسال: <b>${d.stats.totalSent}</b>\n` +
          `✅ اقدام‌شده: <b>${d.stats.totalActed}</b>\n` +
          `🙈 نادیده: <b>${d.stats.totalIgnored}</b>\n` +
          `📈 نرخ پاسخ: <b>${Math.round(d.stats.responseRate * 100)}٪</b>\n` +
          `⏰ سقف امروز: <b>${d.stats.todayQuotaUsed}/${d.config.maxPerDay}</b>\n` +
          `⚠️ ریسک لغزش فعلی: <b>${d.relapseRisk.score}٪ (${d.relapseRisk.level})</b>`
        : isArX
        ? `📊 <b>إحصاءات المدرب</b>\n\nمرسل: ${d.stats.totalSent}\nاستجاب: ${d.stats.totalActed}\nمعدل الاستجابة: ${Math.round(d.stats.responseRate * 100)}٪`
        : `📊 <b>Proactive Coach Stats</b>\n\nSent: ${d.stats.totalSent}\nActed: ${d.stats.totalActed}\nResponse rate: ${Math.round(d.stats.responseRate * 100)}%`;
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }
    if (normalized.startsWith("cmd_proactive_intensity_")) {
      const level = normalized.replace("cmd_proactive_intensity_", "") as any;
      setProactiveConfig(currentServerState, { intensity: level });
      saveServerStateToDisk();
      const intensityFa: Record<string, string> = { gentle: "ملایم 🌿", balanced: "متعادل ⚖️", strict: "سختگیرانه ⚡" };
      const label = isFaX ? intensityFa[level] : level;
      const msg = isFaX ? `✅ شدت مربی روی <b>${label}</b> تنظیم شد.` : isArX ? `✅ تم ضبط الشدّة: <b>${level}</b>` : `✅ Intensity set to <b>${level}</b>`;
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }
  }

  // 7.05. PROACTIVE COACH CONTROL (مربی پیش‌دستانه ۲۴/۷)
  if (
    normalized.startsWith("/proactive") ||
    normalized.startsWith("/coach_mode") ||
    normalized.startsWith("/proactivecoach") ||
    normalized.includes("مربی پیش‌دستانه") ||
    normalized.includes("مراقبت از مسیر") ||
    normalized === "cmd_proactive"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const cfg = getProactiveConfig(currentServerState);
    const isFaX = language === "fa";
    const isArX = language === "ar";
    const stateLabel = cfg.enabled ? (isFaX ? "✅ فعال" : isArX ? "✅ مفعّل" : "✅ Enabled") : (isFaX ? "⛔ غیرفعال" : isArX ? "⛔ معطّل" : "⛔ Disabled");
    const intensityFa: Record<string, string> = { gentle: "ملایم 🌿", balanced: "متعادل ⚖️", strict: "سختگیرانه ⚡" };
    const html = isFaX
      ? `🤖 <b>مربی پیش‌دستانه ۲۴/۷</b>\n\n` +
        `وضعیت: ${stateLabel}\n` +
        `شدت: <b>${intensityFa[cfg.intensity] || cfg.intensity}</b>\n` +
        `سقف پیام روزانه: <b>${cfg.maxPerDay}</b>\n` +
        `مراقبت افت‌ها: ${cfg.missPatrolEnabled ? "✅" : "⛔"} | پنجرهٔ طلایی: ${cfg.timingEnabled ? "✅" : "⛔"} | ریسک لغزش: ${cfg.relapseEnabled ? "✅" : "⛔"} | تسک‌های معوق: ${cfg.overdueEnabled ? "✅" : "⛔"}\n\n` +
        `<i>این موتور رفتار شما را رصد می‌کند و در لحظهٔ مناسب اقدام می‌کند.</i>`
      : isArX
      ? `🤖 <b>المدرب الاستباقي ٢٤/٧</b>\n\nالحالة: ${stateLabel}\nالشدّة: <b>${cfg.intensity}</b>\nحد الرسائل: <b>${cfg.maxPerDay}</b>`
      : `🤖 <b>24/7 Proactive Coach</b>\n\nStatus: ${stateLabel}\nIntensity: <b>${cfg.intensity}</b>\nDaily cap: <b>${cfg.maxPerDay}</b>`;
    const kb = {
      inline_keyboard: [
        [
          { text: cfg.enabled ? (isFaX ? "⛔ خاموش کن" : isArX ? "⛔ اطفئ" : "⛔ Turn off") : (isFaX ? "✅ روشن کن" : isArX ? "✅ شغّل" : "✅ Turn on"), callback_data: "cmd_proactive_toggle" },
          { text: isFaX ? "📊 آمار" : isArX ? "📊 إحصاءات" : "📊 Stats", callback_data: "cmd_proactive_stats" },
        ],
        [
          { text: isFaX ? "🌿 ملایم" : isArX ? "🌿 هادئ" : "🌿 Gentle", callback_data: "cmd_proactive_intensity_gentle" },
          { text: isFaX ? "⚖️ متعادل" : isArX ? "⚖️ معتدل" : "⚖️ Balanced", callback_data: "cmd_proactive_intensity_balanced" },
          { text: isFaX ? "⚡ سختگیر" : isArX ? "⚡ صارم" : "⚡ Strict", callback_data: "cmd_proactive_intensity_strict" },
        ],
      ],
    };
    await sendTelegramMessage(cleanToken, chatId, html, kb);
    return;
  }

  // 7.1. REWARD WALLET & COINS STATUS
  if (
    normalized.startsWith("/wallet") ||
    normalized.startsWith("/coins") ||
    normalized.startsWith("/balance") ||
    normalized === "cmd_wallet" ||
    normalized.includes("کیف پول") ||
    normalized.includes("سکه") ||
    normalized.includes("المحفظة") ||
    normalized.includes("العملات") ||
    normalized === "wallet" ||
    normalized === "coins"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const wallet = currentServerState.wallet || {
      coins: 50,
      totalEarned: 50,
      totalSpent: 0,
      transactions: [],
      unlockedNovels: [],
      unlockedMovies: [],
    };

    const walletHtml = formatWalletHTML(language);
    const walletKb = getWalletShopKeyboard(wallet, language);

    await sendTelegramMessage(cleanToken, chatId, walletHtml, walletKb);
    return;
  }

  // 7.2. REWARD SHOP CATALOG
  if (
    normalized.startsWith("/shop") ||
    normalized.startsWith("/store") ||
    normalized === "cmd_shop" ||
    normalized.includes("فروشگاه") ||
    normalized.includes("جوایز") ||
    normalized.includes("المتجر") ||
    normalized.includes("المكافآت") ||
    normalized === "shop" ||
    normalized === "store"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const wallet = currentServerState.wallet || {
      coins: 50,
      totalEarned: 50,
      totalSpent: 0,
      transactions: [],
      unlockedNovels: [],
      unlockedMovies: [],
    };

    const shopHtml = formatShopCatalogHTML(language);
    const shopKb = getWalletShopKeyboard(wallet, language);

    await sendTelegramMessage(cleanToken, chatId, shopHtml, shopKb);
    return;
  }

  // 7.3. PURCHASE SHOP ITEM VIA BOT
  if (normalized.startsWith("buy_item_")) {
    const itemId = rawText.replace("buy_item_", "");
    const isNovel = itemId.startsWith("novel_");
    const isMovie = itemId.startsWith("movie_");

    let price = 50;
    let itemTitle = isFa ? "مورد فروشگاه" : "Shop Item";

    if (itemId === "novel_reincarnated_slime") {
      price = 45;
      itemTitle = isFa ? "رمان تناسخ به عنوان اسلایم" : "That Time I Got Reincarnated as a Slime";
    } else if (itemId === "novel_solo_leveling") {
      price = 60;
      itemTitle = isFa ? "رمان سولو لولینگ (Solo Leveling)" : "Solo Leveling Novel";
    } else if (itemId === "novel_omniscient_reader") {
      price = 55;
      itemTitle = isFa ? "رمان دیدگاه خواننده دانای کل (ORV)" : "Omniscient Reader's Viewpoint";
    } else if (itemId === "movie_spirited_away") {
      price = 40;
      itemTitle = isFa ? "انیمه سینمایی شهر اشباح" : "Spirited Away (Film)";
    } else if (itemId === "movie_interstellar") {
      price = 50;
      itemTitle = isFa ? "فیلم سینمایی میان‌ستاره‌ای (Interstellar)" : "Interstellar Movie";
    } else if (itemId === "movie_your_name") {
      price = 45;
      itemTitle = isFa ? "انیمه نام تو (Your Name)" : "Your Name Anime";
    }

    const currentCoins = currentServerState.wallet?.coins || 0;
    if (currentCoins < price) {
      const needed = price - currentCoins;
      const failMsg = isFa
        ? `⚠️ <b>موجودی سکه کافی نیست!</b>\n\nبرای باز کردن «${itemTitle}» به <b>${price} سکه</b> نیاز دارید، اما موجودی فعلی شما <b>${currentCoins} سکه</b> است.\n\n💡 <i>شما به ${needed} سکه دیگر نیاز دارید. با تکمیل عادات و تسک‌های روزانه سکه کسب کنید!</i>`
        : `⚠️ <b>Insufficient Coins!</b>\n\nYou have ${currentCoins} coins, but "${itemTitle}" requires ${price} coins.\n\nComplete daily habits & tasks to earn ${needed} more coins!`;

      const shopKb = getWalletShopKeyboard(currentServerState.wallet || ({ coins: currentCoins } as any), language);
      await sendTelegramMessage(cleanToken, chatId, failMsg, shopKb);
      return;
    }

    // Deduct coins & record unlock
    deductWalletCoins(price, isFa ? `خرید و آزادسازی «${itemTitle}» از فروشگاه` : `Unlocked "${itemTitle}" in Rewards Shop`);

    if (!currentServerState.wallet) {
      currentServerState.wallet = {
        coins: 0,
        totalEarnedCoins: 0,
        totalSpentCoins: 0,
        transactions: [],
        unlockedNovels: [],
        unlockedMovies: [],
      };
    }
    if (isNovel && !currentServerState.wallet.unlockedNovels.includes(itemId)) {
      currentServerState.wallet.unlockedNovels.push(itemId);
    }
    if (isMovie && !currentServerState.wallet.unlockedMovies.includes(itemId)) {
      currentServerState.wallet.unlockedMovies.push(itemId);
    }
    saveServerStateToDisk();

    const successBuyMsg = isFa
      ? `🎉 <b>خرید و آزادسازی موفقیت‌آمیز بود!</b>\n\n«${itemTitle}» با کسر <b>${price} سکه</b> با موفقیت آزاد شد.\n💰 <b>موجودی جدید:</b> <code>${currentServerState.wallet.coins} سکه 🪙</code>\n\n📖 <i>می‌توانید در وب‌اپلیکیشن ردیاب به مطالعه رمان یا تماشای رسانه بپردازید!</i>`
      : `🎉 <b>Unlock Successful!</b>\n\n"${itemTitle}" unlocked for ${price} coins.\n💰 <b>New Balance:</b> ${currentServerState.wallet.coins} Coins 🪙`;

    const afterBuyKb = getWalletShopKeyboard(currentServerState.wallet, language);
    await sendTelegramMessage(cleanToken, chatId, successBuyMsg, afterBuyKb);
    return;
  }

  // 7.35. INTERACTIVE COACHING DIALOGUE ACTIONS (Hint, 2-Min Micro-step, Finish)
  if (normalized === "cmd_coach_reply_hint") {
    const persona = getPersonaDetails(undefined, language);
    const hintMsg = isFa
      ? `💬 <b>گفتگوی دو نفره با ${persona.name}</b>\n\n` +
        `✍️ برای پاسخ به سوال مربی، مطرح کردن دلایل تعلل، خستگی یا مشکلات امروز، <b>کافیست پیام متنی خود را در چت بنویسید و ارسال کنید.</b>\n\n` +
        `<i>مربی با لحن اختصاصی «${persona.name}» پاسخ می‌دهد و مرحله‌به‌مرحله با شما پیش خواهد رفت.</i>`
      : `💬 <b>Interactive Dialogue with ${persona.name}</b>\n\n✍️ Just type and send your text message in the chat to reply to the coach!`;
    const coachKb = getInteractiveCoachingKeyboard(language);
    await sendTelegramMessage(cleanToken, chatId, hintMsg, coachKb);
    return;
  }

  if (normalized === "cmd_coach_microstep") {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habitsSummary = getHabitsSummaryFromState();
    const persona = getPersonaDetails(undefined, language);
    const pendingHabits = habitsSummary.filter((h: any) => !h.isDoneToday);
    const pendingNames = pendingHabits.map((h: any) => h.name).join("، ") || "عادات روزانه";

    const microPrompt = isFa
      ? `کاربر دکمه «راهکار ۲ دقیقه‌ای فوری» را برای عادات باقیمانده [${pendingNames}] لمس کرده است.
تو ${persona.name} هستی.
یک دستورالعمل ۲ دقیقه‌ای فوق‌العاده سریع، دقیق، بدون پیچیدگی و متناسب با لحنت بده که کاربر همین ثانیه بتواند شروع کند و سد اینرسی ذهنی را بشکند. در انتها از او بپرس آیا همین الان شروع کرد؟`
      : `Provide an instant 2-minute micro-activation step for [${pendingNames}] in your authentic persona tone (${persona.name}) to break inertia immediately.`;

    const dialogueRes = await askAICoachInteractiveDialogue({
      userMessage: isFa ? "لطفاً راهکار ۲ دقیقه‌ای فوق‌العاده سریع برای شروع بده." : "Give me an instant 2-minute hack to start now.",
      chatId,
      dialogueContext: "inquiry",
      habitsSummary,
      language,
      pendingHabits,
    });

    chatPendingActions[chatId] = {
      action: "active_coaching_dialogue",
      timestamp: Date.now(),
    };

    const coachKb = getInteractiveCoachingKeyboard(language);
    await sendTelegramMessage(cleanToken, chatId, dialogueRes.reply, coachKb);
    return;
  }

  if (normalized === "cmd_coach_finish") {
    delete chatPendingActions[chatId];
    const persona = getPersonaDetails(undefined, language);
    const finishMsg = isFa
      ? `💾 <b>جلسه گفتگوی اختصاصی با موفقیت ثبت گردید</b>\n\n` +
        `نکات و الگوهای مطرح‌شده در گفتگوی شما با <b>${persona.name}</b> در <b>حافظه شناختی پایدار</b> هوش مصنوعی ذخیره شد تا در تصمیم‌گیری‌ها و راهنمایی‌های آتی اعمال شود.\n\n` +
        `🌟 <i>با حفظ زنجیره روزانه، مسیرهای عصبی مغز شما در مدل ۶۶ روزه لالی تثبیت خواهند شد!</i>`
      : `💾 <b>Coaching Session Saved to Cognitive Memory</b>\n\nYour conversation with <b>${persona.name}</b> has been recorded for continuous behavioral adaptation!`;

    await sendTelegramMessage(cleanToken, chatId, finishMsg, keyboards.inlineMarkup);
    return;
  }

  // 7.36. COACH MEMORY & LEARNING PROFILE INSPECTION
  if (normalized === "cmd_coach_memory") {
    const persona = getPersonaDetails(undefined, language);
    const cognitive = currentServerState.userCognitiveProfile || {};
    const turns = getDialogueHistory(chatId);

    let memoryMsg = isFa
      ? `🧠 <b>حافظه شناختی و آموخته‌های مربی از شما</b>\n\n`
      : `🧠 <b>Coach Cognitive Memory & Learning Profile</b>\n\n`;

    memoryMsg += isFa
      ? `🎭 <b>شخصیت و لحن فعال مربی:</b> ${persona.name} (${persona.emoji})\n`
      : `🎭 <b>Active Persona:</b> ${persona.name} (${persona.emoji})\n`;

    memoryMsg += isFa
      ? `💬 <b>تعداد تبادلات اخیر در این جلسه:</b> ${turns.length} پیام\n\n`
      : `💬 <b>Recent dialogue turns retained:</b> ${turns.length}\n\n`;

    const patterns = Array.isArray(cognitive.patterns) && cognitive.patterns.length > 0
      ? cognitive.patterns
      : (isFa ? ["در حال تحلیل و ثبت الگوهای رفتاری اولیه در طول گفتگوها..."] : ["Observing initial behavioral routines..."]);
    
    const fatigueTriggers = Array.isArray(cognitive.fatigueTriggers) && cognitive.fatigueTriggers.length > 0
      ? cognitive.fatigueTriggers
      : (isFa ? ["هنوز محرک خستگی شدیدی گزارش نشده است."] : ["No critical burnout triggers logged yet."]);

    const strategies = Array.isArray(cognitive.preferredStrategies) && cognitive.preferredStrategies.length > 0
      ? cognitive.preferredStrategies
      : (isFa ? ["قانون ۲ دقیقه", "قلاب‌کردن عادات (Habit Stacking)"] : ["2-Minute Rule", "Habit Stacking"]);

    memoryMsg += isFa ? `📌 <b>الگوها و رفتارهای شناسایی‌شده:</b>\n` : `📌 <b>Recognized Behavioral Patterns:</b>\n`;
    for (const p of patterns.slice(0, 4)) {
      memoryMsg += ` • ${p}\n`;
    }

    memoryMsg += isFa ? `\n⚠️ <b>محرک‌های خستگی یا تعلل شناسایی‌شده:</b>\n` : `\n⚠️ <b>Identified Fatigue/Procrastination Triggers:</b>\n`;
    for (const f of fatigueTriggers.slice(0, 3)) {
      memoryMsg += ` • ${f}\n`;
    }

    memoryMsg += isFa ? `\n💡 <b>استراتژی‌های موثر متناسب با شما:</b>\n` : `\n💡 <b>Adaptive Interventions:</b>\n`;
    for (const s of strategies.slice(0, 3)) {
      memoryMsg += ` • ${s}\n`;
    }

    memoryMsg += isFa
      ? `\n🌱 <i>مربی در طول هر گفتگوی دوستانه نکات جدیدی درباره شما می‌آموزد و پیام‌های قبلی را در نظر می‌گیرد تا پاسخ‌ها کوتاه، دوستانه و دقیق باشند.</i>`
      : `\n🌱 <i>The coach continuously learns from your dialogue turns to keep future replies concise, friendly, and tailored.</i>`;

    const memoryKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "💬 ادامه گفتگو" : "💬 Continue Chat",
            callback_data: "cmd_coach_reply_hint",
          },
          {
            text: isFa ? "🔄 گفتگوی تازه" : "🔄 Fresh Chat",
            callback_data: "cmd_coach_reset",
          },
        ],
        [
          {
            text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
            callback_data: "cmd_menu",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, memoryMsg, memoryKb);
    return;
  }

  // 7.37. FRESH CHAT / RESET ACTIVE DIALOGUE
  if (normalized === "cmd_coach_reset") {
    if (currentServerState.chatHistories) {
      currentServerState.chatHistories[chatId] = [];
      saveServerStateToDisk();
    }
    chatPendingActions[chatId] = {
      action: "active_coaching_dialogue",
      timestamp: Date.now(),
    };

    const persona = getPersonaDetails(undefined, language);
    const resetMsg = isFa
      ? `🔄 <b>گفتگوی تازه با ${persona.name} باز شد!</b>\n\n` +
        `👇 <i>هر زمان آماده‌ای، پیامت رو بنویس و بفرست:</i>`
      : `🔄 <b>Fresh coaching conversation started with ${persona.name}!</b>\n\n` +
        `👇 <i>Type and send your message whenever you're ready:</i>`;

    const coachKb = getInteractiveCoachingKeyboard(language);
    await sendTelegramMessage(cleanToken, chatId, resetMsg, coachKb);
    return;
  }

  // 7.4. CHAT WITH AI COACH (/chat, /ask, cmd_coach_chat, cmd_ask_prompt)
  if (
    normalized.startsWith("/chat") ||
    normalized.startsWith("/talk") ||
    normalized.startsWith("/dialogue") ||
    normalized === "cmd_coach_chat" ||
    normalized.startsWith("/ask") ||
    normalized.startsWith("/question") ||
    normalized === "cmd_ask_prompt" ||
    normalized.includes("گفتگو با مربی") ||
    normalized.includes("گفت‌وگو با مربی") ||
    normalized.includes("گپ با مربی") ||
    normalized.includes("پرسش از مربی") ||
    normalized.includes("سوال از هوش مصنوعی") ||
    normalized.includes("محادثة مع المدرب") ||
    normalized.includes("اسأل المدرب") ||
    normalized.includes("chat with coach") ||
    normalized.includes("ask coach") ||
    normalized === "chat" ||
    normalized === "ask"
  ) {
    const directMessage = rawText
      .replace(/^\/(chat|talk|dialogue|ask|question|coach)\s*/i, "")
      .trim();

    const isNonEmptyMessage =
      directMessage.length > 0 &&
      !directMessage.startsWith("/") &&
      !directMessage.startsWith("💬") &&
      !directMessage.startsWith("🧠") &&
      directMessage !== "گفتگو با مربی" &&
      directMessage !== "پرسش از مربی" &&
      directMessage !== "سوال از هوش مصنوعی" &&
      directMessage !== "محادثة مع المدرب" &&
      directMessage !== "اسأل المدرب" &&
      directMessage !== "chat with coach" &&
      directMessage !== "ask coach";

    if (isNonEmptyMessage) {
      await sendTelegramChatAction(cleanToken, chatId, "typing");
      const habitsSummary = getHabitsSummaryFromState();

      const dialogueRes = await askAICoachInteractiveDialogue({
        userMessage: directMessage,
        chatId,
        dialogueContext: "inquiry",
        habitsSummary,
        language,
      });

      chatPendingActions[chatId] = {
        action: "active_coaching_dialogue",
        timestamp: Date.now(),
      };

      const coachKb = getInteractiveCoachingKeyboard(language);
      await sendTelegramMessage(cleanToken, chatId, dialogueRes.reply, coachKb);
      return;
    }

    chatPendingActions[chatId] = {
      action: "active_coaching_dialogue",
      timestamp: Date.now(),
    };

    const persona = getPersonaDetails(undefined, language);
    const habitsSummary = getHabitsSummaryFromState();
    const totalHabits = habitsSummary.length;
    const doneHabits = habitsSummary.filter((h) => h.isDoneToday).length;

    const welcomeMsg = isFa
      ? `🧠 <b>گفتگو با مربی (${persona.name})</b>\n\n` +
        `سلام دوست خوبم! 👋 آمار امروزت رو می‌بینم (${doneHabits} از ${totalHabits} عادت ثبت شده).\n\n` +
        `امروز حالت چطوره یا دوست داری راجع به چی با هم گپ بزنیم؟\n` +
        `👇 <i>پیامت رو برام بنویس و بفرست:</i>`
      : isAr
      ? `🧠 <b>محادثة مع المدرب (${persona.name})</b>\n\nمرحباً! (${doneHabits}/${totalHabits} عادات مكتملة اليوم).\n\nكيف تشعر اليوم؟ اكتب رسالتك وسأجيبك فوراً:`
      : `🧠 <b>Chat with Coach (${persona.name})</b>\n\nHey there! 👋 I can see your stats today (${doneHabits}/${totalHabits} habits completed).\n\nHow is your energy, or what would you like to talk through?\n👇 <i>Type your message below:</i>`;

    const coachKb = getInteractiveCoachingKeyboard(language);
    await sendTelegramMessage(cleanToken, chatId, welcomeMsg, coachKb);
    return;
  }

  // 7.5. POMODORO & DEEP WORK COACH (Interactive Bot Engine)
  if (
    normalized.startsWith("/pomo_coach") ||
    normalized === "cmd_pomo_coach" ||
    normalized.includes("مشاوره تمرکز") ||
    normalized.includes("مربی تمرکز")
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habitsSummary = getHabitsSummaryFromState();
    const waitMsg = isFa
      ? `🧠 <i>مربی هوش مصنوعی در حال تولید توصیه‌های عصب‌شناختی برای ورود سریع به حالت غرقگی و تمرکز عمیق است...</i>`
      : `🧠 <i>AI Focus Coach is preparing neuroscience-backed flow state recommendations...</i>`;
    await sendTelegramMessage(cleanToken, chatId, waitMsg);
    await sendTelegramChatAction(cleanToken, chatId, "typing");

    const coachPrompt = isFa
      ? `به عنوان مربی نوروساینس تمرکز و غرقگی (Flow State)، یک راهنمای بسیار کاربردی، سریع و انگیزاننده (حداکثر ۳ نکته کلیدی) به کاربر بگو تا همین الان وارد حالت تمرکز عمیق بدون حواس‌پرتی شود، مقاومت ذهنی اولیه را بشکند و ترشح دوپامین سالم را فعال کند.`
      : `Act as a neuroscience deep work and flow state coach. Provide 3 sharp, science-backed actionable tips to immediately enter high-focus flow state, eliminate distraction friction, and sustain executive cognitive control.`;

    const aiResponse = await askAICoach(coachPrompt, habitsSummary, language, undefined, "coach");
    const pomoKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "🍅 شروع ۲۵ دقیقه تمرکز" : "🍅 Start 25m Focus",
            callback_data: "cmd_pomo_start_25",
          },
          {
            text: isFa ? "🔋 کار عمیق ۵۰ دقیقه" : "🔋 50m Deep Work",
            callback_data: "cmd_pomo_start_50",
          },
        ],
        [
          {
            text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
            callback_data: "cmd_menu",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, aiResponse, pomoKb);
    return;
  }

  // Pomodoro Stop
  if (
    normalized === "/pomo_stop" ||
    normalized === "/pomodoro_stop" ||
    normalized === "cmd_pomo_stop" ||
    normalized.includes("توقف پومودورو") ||
    normalized.includes("لغو تمرکز")
  ) {
    const sessionKey = String(chatId);
    const session = activeTelegramPomodoroSessions.get(sessionKey);

    if (session) {
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }
      activeTelegramPomodoroSessions.delete(sessionKey);
      const elapsedMin = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));

      const stopMsg = isFa
        ? `⏹ <b>تایمر پومودورو متوقف شد.</b>\n\n⏱️ <b>مدت زمان سپری شده:</b> ${elapsedMin} دقیقه\n🎯 <b>موضوع:</b> « ${session.targetName || "تمرکز عمیق"} »\n\n💡 <i>هر زمان آماده بودید، می‌توانید تایمر جدیدی را آغاز نمایید.</i>`
        : isAr
        ? `⏹ <b>تم إيقاف مؤقت بومودورو.</b>\n\n⏱️ <b>الوقت المنقضي:</b> ${elapsedMin} دقيقة\n🎯 <b>الموضوع:</b> « ${session.targetName || "تركيز"} »`
        : `⏹ <b>Pomodoro timer stopped.</b>\n\n⏱️ <b>Elapsed:</b> ${elapsedMin} mins\n🎯 <b>Target:</b> « ${session.targetName || "Focus"} »`;

      const nextKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "🍅 شروع مجدد (۲۵ دقیقه)" : "🍅 Restart 25m",
              callback_data: "cmd_pomo_start_25",
            },
            {
              text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, stopMsg, nextKb);
      return;
    } else {
      const noActiveMsg = isFa
        ? `ℹ️ <b>در حال حاضر هیچ تایمر تمرکزی فعال نیست.</b>\n\nجهت شروع یک جلسه جدید از دکمه‌های زیر استفاده کنید:`
        : `ℹ️ <b>No active Pomodoro session found.</b>\n\nStart a new session below:`;

      const startKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "🍅 شروع ۲۵ دقیقه" : "🍅 Start 25m",
              callback_data: "cmd_pomo_start_25",
            },
            {
              text: isFa ? "🔋 کار عمیق ۵۰ دقیقه" : "🔋 50m Deep Work",
              callback_data: "cmd_pomo_start_50",
            },
          ],
          [
            {
              text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, noActiveMsg, startKb);
      return;
    }
  }

  // Pomodoro Status
  if (
    normalized === "/pomo_status" ||
    normalized === "/pomodoro_status" ||
    normalized === "cmd_pomo_status" ||
    normalized.includes("وضعیت پومودورو") ||
    normalized.includes("وضعیت تمرکز")
  ) {
    const sessionKey = String(chatId);
    const session = activeTelegramPomodoroSessions.get(sessionKey);

    if (session) {
      const elapsedSec = Math.floor((Date.now() - session.startTime) / 1000);
      const totalSec = session.durationMinutes * 60;
      const remainSec = Math.max(0, totalSec - elapsedSec);
      const remainMin = Math.floor(remainSec / 60);
      const remSec = remainSec % 60;
      const percent = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
      const progressBar = getPomodoroProgressBar(percent);

      const statusMsg = isFa
        ? `🍅 <b>وضعیت جلسه تمرکز فعال:</b>\n\n` +
          `🎯 <b>موضوع:</b> « ${session.targetName || "تمرکز عمیق و کار پیوسته"} »\n` +
          `⏳ <b>زمان باقیمانده:</b> <b>${remainMin}:${remSec < 10 ? "0" : ""}${remSec}</b> از ${session.durationMinutes} دقیقه\n` +
          `📊 <b>پیشرفت:</b> ${progressBar} <b>${percent}%</b>\n\n` +
          `⚡ <i>حواس‌پرت‌کننده‌ها را مهار کرده و تا پایان زمان متمرکز بمانید!</i>`
        : isAr
        ? `🍅 <b>حالة جلسة التركيز الحالية:</b>\n\n` +
          `🎯 <b>الموضوع:</b> « ${session.targetName || "تركيز"} »\n` +
          `⏳ <b>الوقت المتبقي:</b> <b>${remainMin}:${remSec < 10 ? "0" : ""}${remSec}</b>\n` +
          `📊 <b>التقدم:</b> ${progressBar} <b>${percent}%</b>`
        : `🍅 <b>Active Pomodoro Status:</b>\n\n` +
          `🎯 <b>Topic:</b> « ${session.targetName || "Deep Focus"} »\n` +
          `⏳ <b>Time Remaining:</b> <b>${remainMin}:${remSec < 10 ? "0" : ""}${remSec}</b> of ${session.durationMinutes}m\n` +
          `📊 <b>Progress:</b> ${progressBar} <b>${percent}%</b>`;

      const statusKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "⏹ توقف تایمر" : "⏹ Stop Timer",
              callback_data: "cmd_pomo_stop",
            },
            {
              text: isFa ? "🤖 مربی تمرکز AI" : "🤖 AI Coach",
              callback_data: "cmd_pomo_coach",
            },
          ],
          [
            {
              text: isFa ? "🔄 بروزرسانی زمان" : "🔄 Refresh",
              callback_data: "cmd_pomo_status",
            },
            {
              text: isFa ? "🏠 منوی اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };

      await sendTelegramMessage(cleanToken, chatId, statusMsg, statusKb);
      return;
    } else {
      const noActiveMsg = isFa
        ? `ℹ️ <b>در حال حاضر هیچ تایمر تمرکزی در حال اجرا نیست.</b>\n\nبرای شروع جلسه تمرکز از گزینه‌های زیر انتخاب کنید:`
        : `ℹ️ <b>No active Pomodoro timer is currently running.</b>\n\nStart a session below:`;

      const startKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "🍅 شروع ۲۵ دقیقه" : "🍅 Start 25m",
              callback_data: "cmd_pomo_start_25",
            },
            {
              text: isFa ? "🔋 کار عمیق ۵۰ دقیقه" : "🔋 50m Deep Work",
              callback_data: "cmd_pomo_start_50",
            },
          ],
          [
            {
              text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };
      await sendTelegramMessage(cleanToken, chatId, noActiveMsg, startKb);
      return;
    }
  }

  // Pomodoro Start or Station Hub
  if (
    normalized.startsWith("/focus") ||
    normalized.startsWith("/pomodoro") ||
    normalized.startsWith("/pomo") ||
    normalized.startsWith("cmd_pomo_start_") ||
    normalized === "cmd_pomodoro" ||
    normalized === "cmd_focus" ||
    normalized.includes("پومودورو") ||
    normalized === "focus"
  ) {
    const isStartCmd =
      normalized.startsWith("cmd_pomo_start_") ||
      (normalized.startsWith("/pomodoro") && normalized !== "/pomodoro") ||
      (normalized.startsWith("/pomo") && normalized !== "/pomo" && normalized !== "/pomodoro");

    if (isStartCmd) {
      let durationMinutes = 25;
      let targetName = "";

      if (normalized.startsWith("cmd_pomo_start_")) {
        const parts = normalized.split("_");
        durationMinutes = parseInt(parts[parts.length - 1], 10) || 25;
      } else {
        const afterCmd = rawText.replace(/^\/(pomodoro|pomo)\s*/i, "").trim();
        const firstToken = afterCmd.split(" ")[0];
        const parsedMin = parseInt(firstToken, 10);
        if (!isNaN(parsedMin) && parsedMin > 0) {
          durationMinutes = Math.min(180, Math.max(1, parsedMin));
          targetName = afterCmd.replace(firstToken, "").trim();
        } else {
          targetName = afterCmd;
        }
      }

      if (!targetName) {
        targetName = isFa
          ? durationMinutes >= 50
            ? "کار عمیق و تمرکز اولترادین"
            : durationMinutes <= 5
            ? "استراحت و بازیابی انرژی"
            : "جلسه تمرکز استاندارد پومودورو"
          : "Deep Focus Session";
      }

      const sessionKey = String(chatId);
      const existingSession = activeTelegramPomodoroSessions.get(sessionKey);
      if (existingSession && existingSession.timeoutId) {
        clearTimeout(existingSession.timeoutId);
      }

      const startTime = Date.now();
      const endTime = startTime + durationMinutes * 60 * 1000;
      const endFormatted = new Date(endTime).toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Schedule completion timer
      const timeoutId = setTimeout(async () => {
        activeTelegramPomodoroSessions.delete(sessionKey);
        try {
          // Add reward to in-memory server wallet
          if (currentServerState.wallet) {
            currentServerState.wallet.coins = (currentServerState.wallet.coins || 0) + 5;
            currentServerState.wallet.totalCoinsEarned = (currentServerState.wallet.totalCoinsEarned || 0) + 5;
          }

          const completionMsg = isFa
            ? `🎉 <b>جلسه تمرکز پومودورو با موفقیت به پایان رسید!</b>\n\n` +
              `🎯 <b>موضوع:</b> « ${targetName} »\n` +
              `⏱️ <b>مدت زمان:</b> ${durationMinutes} دقیقه تمرکز خالص\n` +
              `💰 <b>پاداش:</b> +5 سکه 🪙 و +20 XP به کیف پول شما اضافه شد!\n\n` +
              `🧘‍♂️ <i>پیشنهاد هوش مصنوعی: اکنون ۵ دقیقه چشمانتان را ببندید، آب بنوشید و نفس عمیق بکشید.</i>`
            : isAr
            ? `🎉 <b>اكتملت جلسة بومودورو بنجاح!</b>\n\n🎯 <b>الموضوع:</b> « ${targetName} »\n⏱️ <b>المدة:</b> ${durationMinutes} دقيقة\n💰 <b>المكافأة:</b> +5 عملات 🪙 و +20 XP!`
            : `🎉 <b>Pomodoro Focus Session Completed!</b>\n\n🎯 <b>Topic:</b> « ${targetName} »\n⏱️ <b>Duration:</b> ${durationMinutes} minutes\n💰 <b>Reward:</b> +5 Coins 🪙 & +20 XP!`;

          const completeKb = {
            inline_keyboard: [
              [
                {
                  text: isFa ? "🍅 شروع پومودوروی بعدی (۲۵ دقیقه)" : "🍅 Next 25m Focus",
                  callback_data: "cmd_pomo_start_25",
                },
                {
                  text: isFa ? "☕ ۵ دقیقه استراحت" : "☕ 5m Break",
                  callback_data: "cmd_pomo_start_5",
                },
              ],
              [
                {
                  text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
                  callback_data: "cmd_menu",
                },
              ],
            ],
          };

          await sendTelegramMessage(cleanToken, chatId, completionMsg, completeKb);
        } catch (e) {
          console.error("Error dispatching Telegram Pomodoro completion:", e);
        }
      }, durationMinutes * 60 * 1000);

      activeTelegramPomodoroSessions.set(sessionKey, {
        chatId,
        botToken: cleanToken,
        durationMinutes,
        startTime,
        endTime,
        targetName,
        timeoutId,
      });

      const startMsg = isFa
        ? `🍅 <b>تایمر پومودورو با موفقیت آغاز شد!</b>\n\n` +
          `🎯 <b>موضوع:</b> « ${targetName} »\n` +
          `⏱️ <b>مدت زمان:</b> <b>${durationMinutes} دقیقه</b>\n` +
          `⏳ <b>پایان در ساعت:</b> <code>${endFormatted}</code>\n\n` +
          `💡 <i>گوشی را بی‌صدا کنید، نوتیفیکیشن‌ها را ببندید و وارد حالت تمرکز شوید. به محض اتمام زمان، پیام پایان و پاداش برایتان ارسال خواهد شد.</i>`
        : isAr
        ? `🍅 <b>بدأ مؤقت بومودورو الآن!</b>\n\n🎯 <b>الموضوع:</b> « ${targetName} »\n⏱️ <b>المدة:</b> ${durationMinutes} دقيقة\n⏳ <b>النهاية:</b> ${endFormatted}`
        : `🍅 <b>Pomodoro timer started!</b>\n\n🎯 <b>Topic:</b> « ${targetName} »\n⏱️ <b>Duration:</b> ${durationMinutes} mins\n⏳ <b>End time:</b> ${endFormatted}`;

      const runningKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "⏹ توقف تایمر" : "⏹ Stop Timer",
              callback_data: "cmd_pomo_stop",
            },
            {
              text: isFa ? "📊 بررسی وضعیت باقیمانده" : "📊 Check Status",
              callback_data: "cmd_pomo_status",
            },
          ],
          [
            {
              text: isFa ? "🤖 مربی تمرکز هوش مصنوعی" : "🤖 Focus AI Coach",
              callback_data: "cmd_pomo_coach",
            },
            {
              text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };

      await sendTelegramMessage(cleanToken, chatId, startMsg, runningKb);
      return;
    }

    // If an active session is already running, show status
    const sessionKey = String(chatId);
    if (activeTelegramPomodoroSessions.has(sessionKey)) {
      const session = activeTelegramPomodoroSessions.get(sessionKey)!;
      const elapsedSec = Math.floor((Date.now() - session.startTime) / 1000);
      const totalSec = session.durationMinutes * 60;
      const remainSec = Math.max(0, totalSec - elapsedSec);
      const remainMin = Math.floor(remainSec / 60);
      const remSec = remainSec % 60;
      const percent = Math.min(100, Math.round((elapsedSec / totalSec) * 100));
      const progressBar = getPomodoroProgressBar(percent);

      const activeNoticeMsg = isFa
        ? `🍅 <b>شما یک جلسه تمرکز فعال در حال اجرا دارید:</b>\n\n` +
          `🎯 <b>موضوع:</b> « ${session.targetName || "تمرکز عمیق"} »\n` +
          `⏳ <b>زمان باقیمانده:</b> <b>${remainMin}:${remSec < 10 ? "0" : ""}${remSec}</b> (${percent}%)\n` +
          `📊 <b>پیشرفت:</b> ${progressBar}`
        : `🍅 <b>Active Pomodoro running:</b>\n\n` +
          `⏳ <b>Remaining:</b> ${remainMin}:${remSec < 10 ? "0" : ""}${remSec} (${percent}%)\n` +
          `📊 <b>Progress:</b> ${progressBar}`;

      const activeKb = {
        inline_keyboard: [
          [
            {
              text: isFa ? "⏹ توقف تایمر" : "⏹ Stop Timer",
              callback_data: "cmd_pomo_stop",
            },
            {
              text: isFa ? "🔄 بروزرسانی زمان" : "🔄 Refresh",
              callback_data: "cmd_pomo_status",
            },
          ],
          [
            {
              text: isFa ? "🤖 مربی تمرکز AI" : "🤖 AI Coach",
              callback_data: "cmd_pomo_coach",
            },
            {
              text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
              callback_data: "cmd_menu",
            },
          ],
        ],
      };

      await sendTelegramMessage(cleanToken, chatId, activeNoticeMsg, activeKb);
      return;
    }

    // Default Pomodoro Station Hub
    const focusMsg = isFa
      ? `🍅 <b>ایستگاه پومودورو، کار عمیق و تمرکز هوشمند</b>\n\n` +
        `مطالعات علوم شناختی نشان می‌دهد ظرفیت تمرکز حداکثری مغز در چرخه‌های ۲۵ تا ۵۰ دقیقه‌ای به اوج می‌رسد:\n\n` +
        `⏱️ <b>پروتکل ۲۵/۵ استاندارد:</b> ۲۵ دقیقه تمرکز پیوسته + ۵ دقیقه استراحت چشمی\n` +
        `🔋 <b>پروتکل ۵۰/۱۰ اولترادین (Ultradian):</b> ۵۰ دقیقه کار عمیق بدون حواس‌پرتی\n` +
        `🤖 <b>مربی هوش مصنوعی:</b> دریافت راهکارهای عصب‌شناختی برای غلبه بر تنبلی و ورود به غرقگی\n\n` +
        `👇 <i>یک پروتکل را برای شروع فوری انتخاب کنید:</i>`
      : isAr
      ? `🍅 <b>محطة بومودورو والتركيز العميق</b>\n\n• 25 دقيقة تركيز قياسي\n• 50 دقيقة تركيز فائق\n\nاختر للبدء فوراً:`
      : `🍅 <b>Pomodoro & Deep Work Station</b>\n\n• 25/5 min Standard Cycle\n• 50/10 min Ultradian Deep Work\n\nSelect a protocol to begin:`;

    const focusKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "🍅 شروع ۲۵ دقیقه (پومودورو)" : "🍅 Start 25m Focus",
            callback_data: "cmd_pomo_start_25",
          },
          {
            text: isFa ? "🔋 شروع ۵۰ دقیقه (کار عمیق)" : "🔋 Start 50m Deep Work",
            callback_data: "cmd_pomo_start_50",
          },
        ],
        [
          {
            text: isFa ? "🤖 دریافت مشاوره تمرکز از AI" : "🤖 Ask AI Focus Coach",
            callback_data: "cmd_pomo_coach",
          },
          {
            text: isFa ? "📝 تسک‌های امروز" : "📝 View Tasks",
            callback_data: "cmd_tasks",
          },
        ],
        [
          {
            text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
            callback_data: "cmd_menu",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, focusMsg, focusKb);
    return;
  }

  // 7.6. SCIENTIFIC HABIT MODEL BREAKDOWN (Lally 2010)
  if (
    normalized.startsWith("/model") ||
    normalized.startsWith("/lally") ||
    normalized.startsWith("/science") ||
    normalized === "cmd_model" ||
    normalized.includes("مدل علمی") ||
    normalized.includes("لالی") ||
    normalized.includes("النموذج العلمي") ||
    normalized === "model"
  ) {
    const modelMsg = isFa
      ? `🔬 <b>مبانی علمی مدل شکل‌گیری عادات (Lally et al., 2010)</b>\n\n` +
        `پژوهش تاریخی دکتر فیلیپا لالی در University College London نشان داد که شکل‌گیری یک رفتار خودکار به طور میانگین <b>۶۶ روز (در بازه ۱۸ تا ۲۵۴ روز)</b> به طول می‌انجامد.\n\n` +
        `📈 <b>سه مرحله بیولوژیکی رشد خودکارشدگی:</b>\n` +
        `۱. <b>مرحله تصمیم‌گیری آگاهانه (روز ۱ تا ۲۱):</b> درگیری شدید کورتکس پیش‌پیشانی (PFC) و اصطکاک شناختی بالا.\n` +
        `۲. <b>مرحله شیار دوپامینی و میلین‌سازی (روز ۲۲ تا ۵۰):</b> انتقال کنترل رفتار از PFC به گانگلیای پایه‌ای (Basal Ganglia).\n` +
        `۳. <b>مرحله خودکارشدگی مجانبی (روز ۵۱ تا ۶۶+):</b> رفتار تبدیل به طبیعت دوم مغز شده و بدون مصرف اراده انجام می‌پذیرد.\n\n` +
        `✨ <i>این سیستم روزانه میزان پیشرفت عصبی شما را با فرمول لگاریتمی لالی اندازه‌گیری می‌کند.</i>`
      : `🔬 <b>Neuroscience Foundation: Dr. Phillippa Lally (2010) Habit Model</b>\n\n` +
        `Habit formation follows an asymptotic curve reaching neural automaticity in an average of <b>66 days</b>.\n\n` +
        `1. <b>Conscious Deliberation (Days 1-21):</b> High PFC load.\n` +
        `2. <b>Myelination & Basal Ganglia Shift (Days 22-50):</b> Lower friction.\n` +
        `3. <b>Neural Automaticity Plateau (Days 51-66+):</b> Action becomes automatic.`;

    const modelKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "📊 دریافت گزارش تحلیلی عادات" : "📊 AI Habit Report",
            callback_data: "cmd_report",
          },
          {
            text: isFa ? "🏠 پیشخوان اصلی" : "🏠 Main Menu",
            callback_data: "cmd_menu",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, modelMsg, modelKb);
    return;
  }

  // 8. STATS OVERVIEW COMMAND / REQUEST (خلاصه کل / آمار کل)
  if (
    normalized === "/stats" ||
    normalized.startsWith("/status") ||
    normalized === "cmd_stats" ||
    normalized.includes("خلاصه") ||
    normalized.includes("آمار") ||
    normalized.includes("وضعیت") ||
    normalized.includes("ملخص") ||
    normalized.includes("إحصائيات") ||
    normalized === "stats" ||
    normalized === "overview"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habitsSummary = getHabitsSummaryFromState();

    if (!habitsSummary || habitsSummary.length === 0) {
      const msg = isFa ? "⚠️ عادتی در سیستم ثبت نشده است." : "⚠️ No habits found.";
      await sendTelegramMessage(cleanToken, chatId, msg, keyboards.inlineMarkup);
      return;
    }

    const total = habitsSummary.length;
    const doneToday = habitsSummary.filter((h) => h.isDoneToday).length;
    const avgAuto = Math.round(habitsSummary.reduce((acc, h) => acc + (h.automaticity || 0), 0) / total);
    const maxStreak = Math.max(...habitsSummary.map((h) => h.currentStreak || 0), 0);
    const totalLogs = habitsSummary.reduce((acc, h) => acc + (h.totalCompletedDays || 0), 0);

    let statsMsg = `📈 <b>${isFa ? "خلاصه وضعیت و آمار عادات علمی شما" : isAr ? "ملخص إحصائيات العادات" : "Habit Performance Overview"}</b>\n\n`;
    statsMsg += `• <b>${isFa ? "تکمیل امروز" : isAr ? "إنجاز اليوم" : "Today's Completion"}:</b> ${doneToday} از ${total} (<b>${Math.round((doneToday / total) * 100)}٪</b>)\n`;
    statsMsg += `• <b>${isFa ? "میانگین خودکارشدگی عصبی" : isAr ? "متوسط التلقائية" : "Avg Automaticity"}:</b> <b>${avgAuto}٪</b>\n`;
    statsMsg += `• <b>${isFa ? "بالاترین زنجیره فعال" : isAr ? "أطول سلسلة حالية" : "Max Active Streak"}:</b> 🔥 <b>${maxStreak}</b> ${isFa ? "روز" : "d"}\n`;
    statsMsg += `• <b>${isFa ? "مجموع روزهای ثبت‌شده" : isAr ? "إجمالي الأيام المسجلة" : "Total Logged Checks"}:</b> 📅 <b>${totalLogs}</b>\n\n`;

    statsMsg += `📊 <b>${isFa ? "وضعیت عادات (جهت جزییات کلیک کنید):" : isAr ? "تفاصيل العادات:" : "Habits List:"}</b>\n`;
    for (const h of habitsSummary) {
      const isDone = !!h.isDoneToday;
      const statusIco = isDone ? "✅" : "⏳";
      const autoIco = h.automaticity >= 70 ? "🟢" : h.automaticity >= 40 ? "🟡" : "🔵";
      statsMsg += `${statusIco} <b>${h.name}</b>: ${autoIco} <b>${h.automaticity}٪</b> خودکار | 🔥 <b>${h.currentStreak}</b> روز\n`;
    }

    const listKb = getHabitsListKeyboard(currentServerState.habits, language, todayFormatted);
    await sendTelegramMessage(cleanToken, chatId, statsMsg, listKb);
    return;
  }

  // 9. BACKUP COMMAND
  if (
    normalized.startsWith("/backup") ||
    normalized === "cmd_backup" ||
    normalized.includes("پشتیبان") ||
    normalized.includes("بکاپ") ||
    normalized.includes("احتياطية") ||
    normalized.includes("backup")
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "upload_document");
    const habitsData = currentServerState.habits || [];
    const dateStr = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();

    let totalCheckIns = 0;
    const uniqueDates = new Set<string>();
    habitsData.forEach((h: any) => {
      if (h.history && typeof h.history === "object") {
        Object.entries(h.history).forEach(([d, v]) => {
          if (v) {
            totalCheckIns++;
            uniqueDates.add(d);
          }
        });
      }
    });

    const exportPayload = {
      version: "2.0.0",
      appName: "Lally Scientific Habit Tracker",
      exportDate: new Date().toISOString(),
      metadata: {
        version: "2.0.0",
        appName: "Lally Scientific Habit Tracker",
        exportDate: new Date().toISOString(),
        timestamp,
        schemaVersion: 2,
      },
      habits: habitsData,
      settings: {
        language: language || currentServerState.language || "fa",
        theme: currentServerState.themeMode || "light",
        telegramConfig: currentServerState.telegramConfig || {
          botToken: cleanToken,
          chatId: String(chatId),
          autoDailyReport: true,
          reportTime: "21:00",
        },
      },
      stats: {
        totalHabits: habitsData.length,
        totalCheckIns,
        totalActiveDays: uniqueDates.size,
      },
    };

    const backupJson = JSON.stringify(exportPayload, null, 2);

    const caption = isFa
      ? `💾 <b>نسخه پشتیبان کامل ردیاب علمی عادات</b>\n📅 تاریخ: <code>${dateStr}</code>\n📊 تعداد عادات: <b>${habitsData.length}</b> | مجموع ثبت‌ها: <b>${totalCheckIns}</b>\n\n📌 <i>این فایل جامع حاوی ۱۰۰٪ اطلاعات (عادات، تاریخچه، تم، زبان و تنظیمات تلگرام) است. برای بازگردانی، فایل را در وب‌اپلیکیشن بارگذاری فرمایید.</i>`
      : isAr
      ? `💾 <b>نسخة احتياطية شاملة لمتتبع العادات</b>\n📅 التاريخ: <code>${dateStr}</code>\n📊 عدد العادات: <b>${habitsData.length}</b> | إجمالي السجلات: <b>${totalCheckIns}</b>`
      : `💾 <b>Scientific Habit Tracker - Full Backup</b>\n📅 Date: <code>${dateStr}</code>\n📊 Total Habits: <b>${habitsData.length}</b> | Total Check-ins: <b>${totalCheckIns}</b>`;

    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    const fileBlob = new Blob([backupJson], { type: "application/json" });
    formData.append("document", fileBlob, `scientific-habit-tracker-backup-${dateStr}.json`);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");

    await fetch(`https://api.telegram.org/bot${cleanToken}/sendDocument`, {
      method: "POST",
      body: formData,
    });
    return;
  }

  // 10. TIPS & NEUROSCIENCE PRINCIPLES
  if (
    normalized.startsWith("/tips") ||
    normalized === "cmd_tips" ||
    normalized.includes("نکات") ||
    normalized.includes("نوروساینس") ||
    normalized.includes("نصائح") ||
    normalized.includes("tips")
  ) {
    const tipsMsg = isFa
      ? `💡 <b>۳ اصل طلایی عصب‌شناختی در شکل‌گیری عادات (Lally et al., 2010):</b>\n\n` +
        `۱. <b>اصل بخشش ۱ روزه لالی:</b> اگر یک روز به طور تصادفی عادت را فراموش کردید، هیچ ضربه‌ای به مسیر سیناپسی مغز وارد نمی‌شود! نگذارید ۲ روز متوالی تکرار شود.\n\n` +
        `۲. <b>قانون ۲ دقیقه:</b> در روزهایی که انگیزه کمی دارید، مقیاس عادت را به ۲ دقیقه کاهش دهید (مثلاً فقط خواندن ۱ صفحه کتاب) تا زنجیره عصبی پاره نشود.\n\n` +
        `۳. <b>تکنیک قلاب‌کردن (Habit Stacking):</b> عادت جدید را دقیقاً بلافاصله پس از یک عادت از پیش تثبیت‌شده (مانند بعد از مسواک زدن یا نوشیدن چای صبح) اجرا کنید.`
      : isAr
      ? `💡 <b>٣ مبادئ علمية لترسيخ العادات (Lally 2010):</b>\n\n1. تفويت يوم واحد لا يلغي العادة.\n2. قاعدة الدقيقتين للتغلب على التسويف.\n3. ربط العادات بروتين يومي ثابت.`
      : `💡 <b>3 Neuroscience Habit Principles (Lally 2010):</b>\n\n1. Single-miss resiliency: 1 slip doesn't break automaticity.\n2. 2-Minute Rule: Lower initial friction.\n3. Habit Stacking: Anchor new behaviors to existing routines.`;

    await sendTelegramMessage(cleanToken, chatId, tipsMsg, keyboards.inlineMarkup);
    return;
  }

  // 10.5. ACHIEVEMENTS & NEURAL BADGES (بخش دستاوردها و نشان‌های عصبی)
  if (
    normalized.startsWith("/achievement") ||
    normalized.startsWith("/badge") ||
    normalized.startsWith("/trophy") ||
    normalized === "cmd_achievements" ||
    normalized.includes("دستاورد") ||
    normalized.includes("نشان") ||
    normalized.includes("إنجازات") ||
    normalized.includes("أوسمة") ||
    normalized === "achievements"
  ) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habits = currentServerState.habits || [];
    const habitsSummary = getHabitsSummaryFromState();

    const totalCompletions = habits.reduce((acc: number, h: any) => {
      return acc + Object.values(h.history || {}).filter(Boolean).length;
    }, 0);
    const maxStreak = habitsSummary.reduce((m: number, s: any) => Math.max(m, s.currentStreak || 0, s.longestStreak || 0), 0);
    const maxAuto = habitsSummary.reduce((m: number, s: any) => Math.max(m, s.automaticity || 0), 0);
    const habitsOver66 = habitsSummary.filter((s: any) => (s.totalCompletedDays || 0) >= 66).length;
    const habitsOver50Auto = habitsSummary.filter((s: any) => (s.automaticity || 0) >= 50).length;

    // Time window calculation for Telegram commands
    const nowUtcHour = new Date().getUTCHours();
    const approxIranHour = (nowUtcHour + 3.5) % 24;
    const isNightOwl = approxIranHour >= 0 && approxIranHour < 4;
    const isEarlyBird = approxIranHour >= 5 && approxIranHour < 7;
    const uniqueColors = new Set(habits.map((h: any) => h.color).filter(Boolean)).size;
    const hasLongName = habits.some((h: any) => (h.name || "").trim().length >= 25);
    const has13Streak = habitsSummary.some((s: any) => s.currentStreak === 13 || s.longestStreak === 13);

    // Badges definitions
    const badges = [
      { id: "neuro_genesis", title: isFa ? "جوانه‌زنی نورونی" : isAr ? "الشرارة العصبية الأولى" : "Neuro Genesis", xp: 50, unlocked: totalCompletions >= 1, desc: isFa ? "ثبت نخستین تکرار موفق" : "First completion logged" },
      { id: "synaptic_spark", title: isFa ? "آغاز سیناپس‌سازی (۲۰٪)" : isAr ? "تكوين المشابك 20%" : "Synaptic Spark (20%)", xp: 100, unlocked: maxAuto >= 20, desc: isFa ? "رسیدن به ۲۰٪ خودکارشدگی" : "20% automaticity" },
      { id: "dopamine_groove", title: isFa ? "شیار دوپامینی (۳۵٪)" : isAr ? "أخدود الدوبامين 35%" : "Dopamine Groove (35%)", xp: 150, unlocked: maxAuto >= 35, desc: isFa ? "رسیدن به ۳۵٪ خودکارشدگی" : "35% automaticity" },
      { id: "auto_50", title: isFa ? "عبور از شیب سخت (۵۰٪)" : isAr ? "تجاوز المنعطف الحرج 50%" : "Plateau Breaker (50%)", xp: 200, unlocked: maxAuto >= 50, desc: isFa ? "رسیدن به ۵۰٪ خودکارشدگی" : "50% automaticity" },
      { id: "myelination", title: isFa ? "تثبیت میلین عصبی (۷۰٪)" : isAr ? "تغليف المايلين 70%" : "Myelination Master (70%)", xp: 350, unlocked: maxAuto >= 70, desc: isFa ? "رسیدن به ۷۰٪ خودکارشدگی" : "70% automaticity" },
      { id: "auto_85", title: isFa ? "قله ۶۶ روزه لالی (۸۵٪+)" : isAr ? "قمة الـ 66 يوماً (85%+)" : "66-Day Lally Pinnacle (85%+)", xp: 650, unlocked: maxAuto >= 85 || habitsOver66 >= 1, desc: isFa ? "تثبیت کامل رفتار ناخودآگاه" : "85%+ automaticity or 66 days" },
      { id: "streak_3", title: isFa ? "جرقه ۳ روزه" : isAr ? "شرارة ۳ أيام" : "3-Day Spark", xp: 75, unlocked: maxStreak >= 3, desc: isFa ? "۳ روز پایداری متوالی" : "3-day streak" },
      { id: "streak_7", title: isFa ? "هفته طلایی" : isAr ? "الأسبوع الذهبي" : "Golden Week", xp: 150, unlocked: maxStreak >= 7, desc: isFa ? "۷ روز زنجیره بی‌وقفه" : "7-day streak" },
      { id: "streak_14", title: isFa ? "دو هفته پایداری" : isAr ? "أسبوعان من الاستقرار" : "Fortnight Champion", xp: 220, unlocked: maxStreak >= 14, desc: isFa ? "۱۴ روز زنجیره متوالی" : "14-day streak" },
      { id: "streak_21", title: isFa ? "تعهد ۲۱ روزه" : isAr ? "ميثاق ۲۱ يوماً" : "21-Day Milestone", xp: 300, unlocked: maxStreak >= 21, desc: isFa ? "۲۱ روز پایبندی کامل" : "21-day streak" },
      { id: "streak_30", title: isFa ? "دوره زرین ۳۰ روزه" : isAr ? "الشهر المثالي (۳۰ يوماً)" : "Monthly Master", xp: 450, unlocked: maxStreak >= 30, desc: isFa ? "۳۰ روز زنجیره متوالی" : "30-day streak" },
      { id: "streak_66", title: isFa ? "مشعل‌دار ۶۶ روزه" : isAr ? "شعلة الـ 66 يوماً" : "66-Day Torchbearer", xp: 750, unlocked: maxStreak >= 66, desc: isFa ? "۶۶ روز زنجیره پولادین" : "66-day unbroken streak" },
      { id: "streak_100", title: isFa ? "زنجیره پولادین ۱۰۰ روزه" : isAr ? "السلسلة الحديدية (۱۰۰ يوم)" : "100-Day Iron Will", xp: 1000, unlocked: maxStreak >= 100, desc: isFa ? "۱۰۰ روز پیوستگی بی‌وقفه" : "100-day streak" },
      { id: "checkins_10", title: isFa ? "آغازگر مصمم (۱۰ تیک)" : isAr ? "البداية الواعدة" : "Determined Starter", xp: 60, unlocked: totalCompletions >= 10, desc: isFa ? "۱۰ بار ثبت موفق" : "10 completions" },
      { id: "checkins_25", title: isFa ? "گام‌های استوار (۲۵ تیک)" : isAr ? "خطوات راسخة" : "Solid Steps", xp: 100, unlocked: totalCompletions >= 25, desc: isFa ? "۲۵ بار ثبت موفق" : "25 completions" },
      { id: "checkins_50", title: isFa ? "باشگاه ۵۰ تایی" : isAr ? "نادي الـ 50" : "Club 50", xp: 250, unlocked: totalCompletions >= 50, desc: isFa ? "۵۰ بار ثبت موفق" : "50 completions" },
      { id: "checkins_100", title: isFa ? "قرن تلاش و استقامت" : isAr ? "مئوية الإصرار" : "Centurion of Habit", xp: 500, unlocked: totalCompletions >= 100, desc: isFa ? "۱۰۰ بار ثبت موفق" : "100 completions" },
      { id: "checkins_200", title: isFa ? "دویست‌تایی‌های استوار" : isAr ? "نادي الـ 200" : "Club 200", xp: 750, unlocked: totalCompletions >= 200, desc: isFa ? "۲۰۰ بار ثبت موفق" : "200 completions" },
      { id: "checkins_500", title: isFa ? "اسطوره تکرار و عادت" : isAr ? "أسطورة التكرار السلوكي" : "Legend of Repetition", xp: 1200, unlocked: totalCompletions >= 500, desc: isFa ? "۵۰۰ بار ثبت موفق" : "500 completions" },
      // Funny & Easter Egg Badges
      { id: "night_owl_syndrome", title: isFa ? "جغد شب‌زنده‌دار 🦉" : isAr ? "بومة الليل الساهرة 🦉" : "Night Owl Syndrome 🦉", xp: 180, unlocked: isNightOwl, desc: isFa ? "فعالیت بین ۰۰:۰۰ تا ۰۴:۰۰ بامداد" : "Active 00:00 - 04:00 AM" },
      { id: "early_bird_miracle", title: isFa ? "سحرخیز افسانه‌ای 🌅" : isAr ? "طائر الصباح الباكر 🌅" : "Early Bird Miracle 🌅", xp: 180, unlocked: isEarlyBird, desc: isFa ? "فعالیت بین ۰۵:۰۰ تا ۰۷:۰۰ صبح" : "Active 05:00 - 07:00 AM" },
      { id: "rainbow_palette", title: isFa ? "رنگین‌کمان نورونی 🎨" : isAr ? "قوس قزح العصبي 🎨" : "Neural Rainbow 🎨", xp: 200, unlocked: uniqueColors >= 4, desc: isFa ? "۴ عادت با رنگ‌های مختلف" : "4 distinct habit colors" },
      { id: "unlucky_thirteen", title: isFa ? "طلسم‌شکن ۱۳ 🍀" : isAr ? "كاسر نحس الرقم 13 🍀" : "Lucky 13 Breaker 🍀", xp: 313, unlocked: has13Streak, desc: isFa ? "رسیدن دقیق به زنجیره ۱۳ روزه" : "Exact 13-day streak" },
      { id: "essay_title", title: isFa ? "رمان‌نویس عادات 📜" : isAr ? "الروائي السلوكي 📜" : "Habit Novelist 📜", xp: 130, unlocked: hasLongName, desc: isFa ? "نام عادت ۲۵ حرف یا بیشتر" : "Habit name 25+ chars" },
    ];

    const totalUnlocked = badges.filter((b) => b.unlocked).length;
    const achievementsXp = badges.filter((b) => b.unlocked).reduce((sum, b) => sum + b.xp, 0);
    const habitsXp = totalCompletions * 5; // +5 XP per habit check-in
    const totalXp = achievementsXp + habitsXp;

    // Brain Level
    let levelName = isFa ? "نوآموز رفتاری (سطح ۱)" : isAr ? "مبتدئ السلوك (المستوى ۱)" : "Behavior Initiate (Lv 1)";
    let levelNum = 1;
    if (totalXp >= 7000) {
      levelName = isFa ? "حکیم عادات و نوروساینس (سطح ۷)" : isAr ? "حكيم العادات والعلوم العصبية (المستوى ۷)" : "Master of Neuroscience (Lv 7)";
      levelNum = 7;
    } else if (totalXp >= 4500) {
      levelName = isFa ? "گرندمستر ۶۶ روزه (سطح ۶)" : isAr ? "أستاذ الـ 66 يوماً (المستوى ۶)" : "66-Day Grandmaster (Lv 6)";
      levelNum = 6;
    } else if (totalXp >= 2800) {
      levelName = isFa ? "پیشگام خودکارشدگی (سطح ۵)" : isAr ? "رائد التلقائية (المستوى ۵)" : "Automaticity Pioneer (Lv 5)";
      levelNum = 5;
    } else if (totalXp >= 1500) {
      levelName = isFa ? "استاد نوروپلاستی (سطح ۴)" : isAr ? "خبير المرونة (المستوى ۴)" : "Neuroplasticity Adept (Lv 4)";
      levelNum = 4;
    } else if (totalXp >= 700) {
      levelName = isFa ? "معمار مدار عصبی (سطح ۳)" : isAr ? "مهندس المسارات (المستوى ۳)" : "Neural Architect (Lv 3)";
      levelNum = 3;
    } else if (totalXp >= 250) {
      levelName = isFa ? "کاوشگر سیناپس (سطح ۲)" : isAr ? "مستكشف المشابك (المستوى ۲)" : "Synapse Explorer (Lv 2)";
      levelNum = 2;
    }

    let achMsg = `🏆 <b>${isFa ? "تالار دستاوردها و رتبه تسلط عصبی" : isAr ? "لوحة الإنجازات والمستوى العصبي" : "Achievements & Neural Mastery"}</b>\n\n`;
    achMsg += `🧠 <b>${isFa ? "سطح فعلی مغز" : isAr ? "المستوى الحالي" : "Current Brain Level"}:</b> <b>${levelName}</b>\n`;
    achMsg += `⚡ <b>${isFa ? "مجموع امتیاز تجربه (XP)" : isAr ? "مجموع نقاط الخبرة" : "Total Neural XP"}:</b> <code>${totalXp} XP</code> <i>(${achievementsXp} نشان‌ها + ${habitsXp} ثبت عادات)</i>\n`;
    achMsg += `🎖️ <b>${isFa ? "نشان‌های آزاد شده" : isAr ? "الأوسمة المحررة" : "Unlocked Badges"}:</b> <b>${totalUnlocked} از ${badges.length}</b>\n\n`;

    achMsg += `<b>${isFa ? "📜 وضعیت نشان‌های شما:" : isAr ? "قائمة الأوسمة:" : "Badges Status:"}</b>\n`;
    for (const b of badges) {
      const icon = b.unlocked ? "🌟" : "🔒";
      const statusText = b.unlocked ? `(<b>+${b.xp} XP</b> ✅)` : `(${b.xp} XP)`;
      achMsg += `${icon} <b>${b.title}</b> ${statusText}\n   └ <i>${b.desc}</i>\n`;
    }

    achMsg += `\n💡 <i>${isFa ? "با تداوم در انجام روزانه عادات، امتیازهای بیشتری کسب کنید و نشان‌های طلایی را آزاد سازید!" : "Keep up daily habits to unlock more achievements and level up!"}</i>`;

    await sendTelegramMessage(cleanToken, chatId, achMsg, keyboards.inlineMarkup);
    return;
  }

  // 11. MAIN MENU / DASHBOARD HUB (منوی اصلی / صفحه اصلی / پیشخوان)
  if (
    normalized === "cmd_menu" ||
    normalized === "cmd_main" ||
    normalized === "cmd_home" ||
    normalized.startsWith("/menu") ||
    normalized.startsWith("/start") ||
    normalized.startsWith("/home") ||
    normalized.includes("منوی اصلی") ||
    normalized.includes("صفحه اصلی") ||
    normalized.includes("الرئيسية") ||
    normalized.includes("القائمة الرئيسية") ||
    normalized === "menu" ||
    normalized === "home" ||
    normalized === "start"
  ) {
    const habitsSummary = getHabitsSummaryFromState();
    const totalHabits = habitsSummary.length;
    const doneToday = habitsSummary.filter((h) => h.isDoneToday).length;
    const avgAuto = totalHabits > 0 ? Math.round(habitsSummary.reduce((acc, h) => acc + (h.automaticity || 0), 0) / totalHabits) : 0;
    const bestStreak = habitsSummary.length > 0 ? Math.max(...habitsSummary.map((h) => h.currentStreak || 0), 0) : 0;

    const tasks = currentServerState.tasks || [];
    const completedTasksCount = tasks.filter((t: any) => t.completed).length;
    const pendingTasksCount = tasks.length - completedTasksCount;
    const coins = currentServerState.wallet?.coins ?? 50;

    let menuMsg = isFa
      ? `🏠 <b>پیشخوان و مرکز فرماندهی ردیاب هوشمند</b>\n\n` +
        `📅 <b>امروز:</b> <code>${todayFormatted}</code>\n` +
        `💰 <b>موجودی کیف پول:</b> <code>${coins} سکه 🪙</code>\n\n` +
        `📊 <b>شاخص‌های عصب‌شناختی و عملکرد:</b>\n` +
        `  • 🎯 <b>عادات فعال:</b> ${totalHabits} عادت\n` +
        `  • 📅 <b>ثبت عادات امروز:</b> <b>${doneToday} از ${totalHabits}</b> (${totalHabits > 0 ? Math.round((doneToday / totalHabits) * 100) : 0}٪)\n` +
        `  • 🧠 <b>میانگین خودکارشدگی عصبی:</b> <b>${avgAuto}٪</b>\n` +
        `  • 🔥 <b>بیشترین زنجیره فعال:</b> <b>${bestStreak} روز</b>\n` +
        `  • 📝 <b>تسک‌ها:</b> ${tasks.length} تسک (${pendingTasksCount} در انتظار | ${completedTasksCount} انجام‌شده)\n\n` +
        `👇 <i>برای ثبت، بررسی یا گفتگو با مربی، یکی از گزینه‌های زیر را لمس فرمایید:</i>`
      : isAr
      ? `🏠 <b>لوحة التحكم والقائمة الرئيسية الشاملة</b>\n\n` +
        `📅 <b>اليوم:</b> <code>${todayFormatted}</code>\n` +
        `💰 <b>الرصيد:</b> <code>${coins} عملة 🪙</code>\n` +
        `📊 <b>ملخص الحالة:</b>\n` +
        `  • 🎯 <b>العادات النشطة:</b> ${totalHabits}\n` +
        `  • 📅 <b>إنجاز اليوم:</b> <b>${doneToday} من ${totalHabits}</b>\n` +
        `  • 🧠 <b>متوسط التلقائية:</b> <b>${avgAuto}%</b>\n` +
        `  • 📝 <b>المهام:</b> ${tasks.length} (${pendingTasksCount} قيد الانتظار)\n\n` +
        `👇 <i>اختر أحد الخيارات للمتابعة:</i>`
      : `🏠 <b>Scientific Habit & Task Master Dashboard</b>\n\n` +
        `📅 <b>Today:</b> <code>${todayFormatted}</code>\n` +
        `💰 <b>Wallet:</b> <code>${coins} Coins 🪙</code>\n` +
        `📊 <b>Overview:</b>\n` +
        `  • 🎯 <b>Active Habits:</b> ${totalHabits}\n` +
        `  • 📅 <b>Completed Today:</b> <b>${doneToday} of ${totalHabits}</b>\n` +
        `  • 🧠 <b>Average Automaticity:</b> <b>${avgAuto}%</b>\n` +
        `  • 🔥 <b>Longest Streak:</b> <b>${bestStreak} days</b>\n` +
        `  • 📝 <b>Tasks:</b> ${tasks.length} (${pendingTasksCount} pending)\n\n` +
        `👇 <i>Select an action below to proceed:</i>`;

    await sendTelegramMessage(cleanToken, chatId, menuMsg, keyboards.inlineMarkup);
    return;
  }

  // 12. HELP & COMMANDS GUIDE (راهنما و راهنمای دستورات)
  if (
    normalized.startsWith("/help") ||
    normalized === "cmd_help" ||
    normalized.includes("راهنما") ||
    normalized.includes("مساعدة") ||
    normalized === "help"
  ) {
    const helpMsg = isFa
      ? `❓ <b>راهنمای جامع و دستورات ربات ردیاب علمی عادات و وظایف</b>\n\n` +
        `این سامانه با تکیه بر <b>نوروساینس رفتاری (مدل ۶۶ روزه دکتر فیلیپا لالی ۲۰۱۰)</b>، مدیریت تسک‌ها و سیستم پاداش مبتنی بر گیمیفیکیشن طراحی شده است.\n\n` +
        `<b>⚡ راهنمای دستورات مستقیم:</b>\n` +
        `• 📋 <code>/habits</code> : شناسنامه و مدیریت تفکیکی عادات\n` +
        `• ➕ <code>/add [نام]</code> : افزودن عادت جدید (مثال: <code>/add ۲۰ دقیقه مطالعه</code>)\n` +
        `• 📝 <code>/tasks</code> : فهرست و مدیریت تسک‌ها و وظایف\n` +
        `• ✍️ <code>/addtask [عنوان]</code> : افزودن تسک جدید (مثال: <code>/addtask ارسال ایمیل به استاد</code>)\n` +
        `• 📅 <code>/today</code> : چک‌لیست یکپارچه عادات و تسک‌های امروز\n` +
        `• 🧠 <code>/ask [سوال]</code> : پرسش از مربی اختصاصی هوش مصنوعی علوم اعصاب\n` +
        `• 📊 <code>/report</code> : تحلیل جامع هوش مصنوعی و نمودار تصویری\n` +
        `• 💰 <code>/wallet</code> : مشاهده موجودی سکه‌ها، تراکنش‌ها و تاریخچه پاداش\n` +
        `• 🎁 <code>/shop</code> : فروشگاه جوایز، باز کردن رمان‌ها و رسانه‌های صوتی/تصویری\n` +
        `• 🏆 <code>/achievements</code> : تالار افتخارات، نشان‌های نورونی و رتبه مغز\n` +
        `• 🍅 <code>/pomodoro [دقیقه]</code> : تایمر هوشمند پومودورو (مثال: <code>/pomodoro 25</code>)\n` +
        `• 📊 <code>/pomo_status</code> : بررسی پیشرفت و زمان باقیمانده جلسه تمرکز\n` +
        `• ⏹ <code>/pomo_stop</code> : توقف و لغو جلسه تمرکز فعال\n` +
        `• 🤖 <code>/pomo_coach</code> : راهکارهای نوروساینس غرقگی و کار عمیق هوش مصنوعی\n` +
        `• 🎯 <code>/focus</code> : راهنما و پروتکل‌های تمرکز عمیق و پومودورو\n` +
        `• 🔬 <code>/model</code> : تشریح منحنی بیولوژیکی ۶۶ روزه لالی\n` +
        `• 📈 <code>/stats</code> : خلاصه آمار، بیشترین زنجیره‌ها و روزهای فعال\n` +
        `• 💾 <code>/backup</code> : دانلود فایل پشتیبان کامل JSON از کلیه سوابق\n` +
        `• 💡 <code>/tips</code> : ۳ اصل طلایی عصب‌شناختی برای تداوم رفتار\n\n` +
        `👇 <i>جهت بازگشت به پیشخوان اصلی، روی دکمه زیر کلیک کنید:</i>`
      : isAr
      ? `❓ <b>دليل واستخدامات متتبع العادات والمهام العلمي</b>\n\nالأوامر المتاحة:\n• <code>/habits</code> : قائمة وإحصائيات العادات\n• <code>/add [اسم]</code> : إضافة عادة جديدة\n• <code>/tasks</code> : قائمة المهام وإنجازها\n• <code>/addtask [عنوان]</code> : إضافة مهمة جديدة\n• <code>/today</code> : قائمة اليوم الموحدة\n• <code>/ask [سؤال]</code> : استشارة مدرب الذكاء الاصطناعي\n• <code>/report</code> : تقرير الذكاء الاصطناعي والرسوم البيانية\n• <code>/wallet</code> : المحفظة ورصيد العملات\n• <code>/shop</code> : متجر المكافآت\n• <code>/achievements</code> : الأوسمة والمستوى العصبي\n• <code>/focus</code> : دليل التركيز العميق\n• <code>/stats</code> : ملخص الإحصائيات\n• <code>/backup</code> : النسخة الاحتياطية`
      : `❓ <b>Scientific Habit & Task Tracker Bot Guide</b>\n\nAvailable commands:\n• <code>/habits</code> : Habit directory & individual stats\n• <code>/add [name]</code> : Add a new habit\n• <code>/tasks</code> : Task management & check-in\n• <code>/addtask [title]</code> : Add a new task\n• <code>/today</code> : Unified today's checklist\n• <code>/ask [question]</code> : Ask AI Neuroscience Habit Coach\n• <code>/report</code> : AI analysis & visual chart\n• <code>/wallet</code> : Coins balance & reward transactions\n• <code>/shop</code> : Reward shop & novel unlocks\n• <code>/achievements</code> : Badges & Brain level\n• <code>/focus</code> : Deep Work & Pomodoro guide\n• <code>/stats</code> : Habit statistics & streaks\n• <code>/backup</code> : Full JSON backup\n• <code>/tips</code> : Neuroscience principles`;

    const helpKb = {
      inline_keyboard: [
        [
          {
            text: isFa ? "🏠 پیشخوان و منوی اصلی" : isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
            callback_data: "cmd_menu",
          },
        ],
      ],
    };

    await sendTelegramMessage(cleanToken, chatId, helpMsg, helpKb);
    return;
  }

  // 13. DEFAULT FALLBACK / CONVERSATIONAL AI COACH
  if (rawText && rawText.length > 0 && !rawText.startsWith("/")) {
    await sendTelegramChatAction(cleanToken, chatId, "typing");
    const habitsSummary = getHabitsSummaryFromState();
    const persona = getPersonaDetails(undefined, language);
    const waitMsg = isFa
      ? `🧠 <i>${persona.name} در حال تفکر و تنظیم پاسخ مناسب شماست...</i>`
      : `🧠 <i>${persona.name} is formulating a personalized response...</i>`;
    await sendTelegramMessage(cleanToken, chatId, waitMsg);
    await sendTelegramChatAction(cleanToken, chatId, "typing");

    const dialogueRes = await askAICoachInteractiveDialogue({
      userMessage: rawText,
      chatId,
      dialogueContext: "general",
      habitsSummary,
      language,
    });

    chatPendingActions[chatId] = {
      action: "active_coaching_dialogue",
      timestamp: Date.now(),
    };

    const coachKb = getInteractiveCoachingKeyboard(language);
    await sendTelegramMessage(cleanToken, chatId, dialogueRes.reply, coachKb);
    return;
  }

  const defaultMsg = isFa
    ? `👋 <b>سلام! پیام شما دریافت شد.</b>\n\nبرای مدیریت عادات، ثبت کارهای امروز یا دریافت تحلیل هوش مصنوعی، لطفاً از دکمه‌های زیر استفاده فرمایید:`
    : isAr
    ? `👋 <b>أهلاً بك! يرجى استخدام الأزرار أدناه للمتابعة:</b>`
    : `👋 <b>Hello! Please use the buttons below to manage your habits:</b>`;

  await sendTelegramMessage(cleanToken, chatId, defaultMsg, keyboards.inlineMarkup);
}

// Telegram Bot Polling Worker
async function runBotPollingLoop(abortSignal: AbortSignal) {
  botPollingActive = true;
  console.info("Telegram Bot polling worker started.");

  while (!abortSignal.aborted) {
    const token = currentServerState.telegramConfig?.botToken;
    if (!token) {
      // Wait until token is provided
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }

    const cleanToken = String(token).trim().replace(/^bot/i, "");
    if (!cleanToken) {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }

    // Register official Telegram bot commands once per startup
    registerTelegramBotCommands(cleanToken, currentServerState.language || "fa").catch(() => {});

    try {
      lastPolledTimestamp = Date.now();
      const url = `https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=20&allowed_updates=["message","callback_query"]`;

      const response = await fetch(url, { signal: abortSignal });
      if (!response.ok) {
        // If unauthorized or rate limited, backoff
        await new Promise((r) => setTimeout(r, 6000));
        continue;
      }

      const data = (await response.json()) as {
        ok: boolean;
        result?: Array<{
          update_id: number;
          message?: {
            message_id: number;
            chat: { id: number; username?: string };
            text?: string;
          };
          callback_query?: {
            id: string;
            from: { id: number };
            message?: { message_id: number; chat: { id: number } };
            data?: string;
          };
        }>;
      };

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);

          // Handle message
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Auto update chatId if not yet configured
            if (!currentServerState.telegramConfig.chatId) {
              currentServerState.telegramConfig.chatId = String(chatId);
              saveServerStateToDisk();
            }

            handleBotIncomingAction(cleanToken, chatId, text).catch((e) =>
              console.error("Error processing bot message:", e)
            );
          }

          // Handle callback query (inline buttons)
          if (update.callback_query && update.callback_query.data) {
            const chatId =
              update.callback_query.message?.chat.id || update.callback_query.from.id;
            const action = update.callback_query.data;
            const queryId = update.callback_query.id;
            const messageId = update.callback_query.message?.message_id;

            handleBotIncomingAction(cleanToken, chatId, action, queryId, messageId).catch((e) =>
              console.error("Error processing callback query:", e)
            );
          }
        }
      }
    } catch (err: any) {
      if (abortSignal.aborted) break;
      // Network retry backoff
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  botPollingActive = false;
  console.info("Telegram Bot polling worker stopped.");
}

function startBotPolling() {
  if (botPollingActive) return;
  botPollingAbortController = new AbortController();
  runBotPollingLoop(botPollingAbortController.signal).catch((err) => {
    console.error("Bot polling error:", err);
    botPollingActive = false;
  });
}

function restartBotPolling() {
  if (botPollingAbortController) {
    botPollingAbortController.abort();
  }
  lastUpdateId = 0;
  setTimeout(() => {
    startBotPolling();
  }, 500);
}

// Auto-start polling if token is already present
if (currentServerState.telegramConfig?.botToken) {
  startBotPolling();
}

// ---------------------------------------------------------------------------
// PROACTIVE COACH RUNTIME BRIDGE
// اتصال موتور رفتاری مبتنی بر behaviorObserver/proactiveEngine به سرور
// ---------------------------------------------------------------------------
initProactiveEngine({
  getState: () => currentServerState,
  saveState: () => { saveServerStateToDisk(); },
  getHabitsSummary: (today: string) => getHabitsSummaryFromState(today),
  sendTelegram: async (text: string, keyboard?: any) => {
    const cfg = currentServerState.telegramConfig as any;
    if (!cfg?.botToken || !cfg?.chatId) return false;
    const cleanToken = String(cfg.botToken).trim().replace(/^bot/i, "");
    const cleanChatId = String(cfg.chatId).trim();
    const res = await sendTelegramMessage(cleanToken, cleanChatId, text, keyboard);
    return Boolean(res && (res as any).ok);
  },
});

// Periodic proactive observation cycle (every 10 minutes) -
// Miss Patrol, Golden Window, Overdue Tasks, Relapse Risk
try {
  setInterval(async () => {
    try {
      const cfg = currentServerState.telegramConfig as any;
      if (!cfg?.botToken || !cfg?.chatId) return;
      const proactive = getProactiveConfig(currentServerState);
      if (!proactive.enabled) return;
      await runProactiveCycle(new Date());
    } catch (e) {
      console.warn("[ProactiveCoach] cycle error:", (e as any)?.message || e);
    }
  }, 10 * 60 * 1000);
} catch {}

// Background scheduler for automated Telegram daily reports, pending reminders, and strict accountability warnings
let lastProcessedMinuteStr = "";
setInterval(async () => {
  try {
    const config = currentServerState.telegramConfig;
    if (!config || !config.botToken || !config.chatId) return;

    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const todayFormatted = now.toISOString().split("T")[0];
    const minuteKey = `${todayFormatted}_${currentHHMM}`;

    if (lastProcessedMinuteStr === minuteKey) return;
    lastProcessedMinuteStr = minuteKey;

    const cleanToken = config.botToken.trim().replace(/^bot/i, "");
    const cleanChatId = config.chatId.trim();
    const lang = currentServerState.language || "fa";

    // 1. Auto Daily Report Check
    if (config.autoDailyReport && config.reportTime === currentHHMM) {
      console.info(`[Scheduler] Triggering auto daily report at ${currentHHMM}`);
      const habitsSummary = getHabitsSummaryFromState(todayFormatted);
      if (habitsSummary.length > 0) {
        const matrix = buildComprehensiveUserBehavioralMatrix(
          habitsSummary,
          currentServerState.tasks,
          currentServerState.wallet,
          lang,
          todayFormatted
        );
        const langInstructions: Record<string, string> = {
          fa: "پاسخ باید کاملاً به زبان فارسی روان، علمی، کاربردی و جذاب باشد.",
          ar: "يجب أن تكون الإجابة باللغة العربية الفصحى الواضحة والعملية.",
          en: "The response must be fully in fluent, precise, motivating English.",
        };
        const prompt = `You are an elite behavioral neuroscience coach analyzing daily habit and task progress.
Context:
${JSON.stringify(habitsSummary, null, 2)}
Today's date: ${todayFormatted}

Language rule: ${langInstructions[lang] || langInstructions.fa}

Please generate a comprehensive daily habit formation report with summary, detailed critique, actionable scientific tips, and a motivational quote. Respond only with valid JSON with keys: title, overview, habitFeedback (array of {name, status, critiqueAndTip}), generalCritique, actionableTips, motivationalQuote.`;

        const reportData = await generateAIReport(prompt, matrix, lang, todayFormatted);
        const reportHtml = formatTelegramReportHTML(reportData, habitsSummary, lang, todayFormatted);
        const keyboards = getStandardKeyboards(lang);
        await sendTelegramMessage(cleanToken, cleanChatId, reportHtml, keyboards.inlineMarkup);
      }
    }

    // 2. Periodic Incomplete Habits & Tasks Reminders (Concise & Direct)
    if (config.reminderEnabled && Array.isArray(config.reminderTimes) && config.reminderTimes.includes(currentHHMM)) {
      console.info(`[Scheduler] Triggering pending reminders at ${currentHHMM}`);
      const habits = currentServerState.habits || [];
      const tasks = currentServerState.tasks || [];
      const habitsSummary = getHabitsSummaryFromState(todayFormatted, habits);
      const pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);
      const pendingTasks = tasks.filter((t: any) => !t.completed);

      if (pendingHabits.length > 0 || pendingTasks.length > 0) {
        const text = formatConciseReminderHTML(habits, tasks, lang, false, todayFormatted);
        const listKb = getConciseReminderKeyboard(habits, tasks, lang, todayFormatted);
        await sendTelegramMessage(cleanToken, cleanChatId, text, listKb);
      }
    }

    // 3. Strict Accountability Final Warning (concise several-sentence alert + pending items only, nothing extra)
    if (config.strictWarningEnabled && config.strictWarningTime === currentHHMM) {
      console.info(`[Scheduler] Triggering strict warning at ${currentHHMM}`);
      const habits = currentServerState.habits || [];
      const tasks = currentServerState.tasks || [];
      const habitsSummary = getHabitsSummaryFromState(todayFormatted, habits);
      const pendingHabits = habitsSummary.filter((h) => !h.isDoneToday);
      const pendingTasks = tasks.filter((t: any) => !t.completed);

      if (pendingHabits.length > 0 || pendingTasks.length > 0) {
        const text = formatStrictWarningHTML(pendingHabits, pendingTasks, lang, false);
        const listKb = getStrictWarningKeyboard(pendingHabits, pendingTasks, lang);
        await sendTelegramMessage(cleanToken, cleanChatId, text, listKb);
      }
    }

    // 4. Automated Novel ZIP Backup schedule to dedicated Telegram backup bot
    if (config.autoNovelBackupEnabled) {
      const activeNovelBotToken = (
        config.useDedicatedBackupBot && config.backupBotToken?.trim()
          ? config.backupBotToken.trim()
          : config.botToken?.trim()
      )?.replace(/^bot/i, "");

      const activeNovelChatId = (
        config.useDedicatedBackupBot && config.backupChatId?.trim()
          ? config.backupChatId.trim()
          : config.chatId?.trim()
      );

      const novelBackupTime = config.novelBackupTime || "23:00";
      if (activeNovelBotToken && activeNovelChatId && currentHHMM === novelBackupTime) {
        let shouldSendNovelBackup = false;
        const lastTimestamp = config.lastNovelBackupTimestamp || 0;
        const interval = config.novelBackupInterval || "weekly";

        if (interval === "daily") {
          shouldSendNovelBackup = config.lastNovelBackupSentDate !== todayFormatted;
        } else if (interval === "every_3_days") {
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          shouldSendNovelBackup = (!lastTimestamp || Date.now() - lastTimestamp >= threeDaysMs) && config.lastNovelBackupSentDate !== todayFormatted;
        } else if (interval === "weekly") {
          const targetDay = config.novelBackupDayOfWeek !== undefined ? config.novelBackupDayOfWeek : 6;
          shouldSendNovelBackup = (now.getDay() === targetDay) && config.lastNovelBackupSentDate !== todayFormatted;
        } else if (interval === "monthly") {
          const targetDay = config.novelBackupDayOfMonth !== undefined ? config.novelBackupDayOfMonth : 1;
          shouldSendNovelBackup = (now.getDate() === targetDay) && config.lastNovelBackupSentDate !== todayFormatted;
        }

        if (shouldSendNovelBackup) {
          console.info(`[Scheduler] Triggering scheduled novel ZIP backup at ${currentHHMM}`);
          const delSet = new Set(currentServerState.deletedNovelIds || []);
          const validNovels = (currentServerState.customNovels || []).filter((n: any) => !delSet.has(n.id));

          if (validNovels.length > 0) {
            try {
              const zipBuffer = await buildNovelsZipBuffer(
                validNovels, 
                currentServerState.wallet, 
                config.novelBackupIncludeProgress ?? true
              );
              const fileSizeBytes = zipBuffer.length;
              const sizeStr = fileSizeBytes < 1024 * 1024 
                ? `${(fileSizeBytes / 1024).toFixed(1)} KB` 
                : `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
              const totalChapters = validNovels.reduce((acc: number, n: any) => acc + (n.chapters?.length || n.totalChapters || 0), 0);
              const customFileName = `novels-auto-backup-${todayFormatted}.zip`;

              const isFa = lang === "fa";
              const caption = isFa
                ? `🤖 <b>پشتیبان‌گیری خودکار و دوره‌ای رمان‌ها (ZIP)</b>\n\n` +
                  `📅 تاریخ: <code>${todayFormatted} ${currentHHMM}</code>\n` +
                  `📦 حجم آرشیو: <b>${sizeStr}</b>\n` +
                  `📚 رمان‌ها: <b>${validNovels.length}</b> عنوان | 📑 مجموع فصول: <b>${totalChapters}</b>\n\n` +
                  `✨ <i>نسخه پشتیبان خودکار دوره‌ای با موفقیت فشرده و ذخیره شد.</i>`
                : `🤖 <b>Automated Periodic Web Novels Backup (ZIP)</b>\n\n` +
                  `📅 Date: <code>${todayFormatted} ${currentHHMM}</code>\n` +
                  `📦 Size: <b>${sizeStr}</b>\n` +
                  `📚 Novels: <b>${validNovels.length}</b> | 📑 Total Chapters: <b>${totalChapters}</b>\n\n` +
                  `✨ <i>Scheduled automated backup successfully zipped and archived.</i>`;

              const formData = new FormData();
              formData.append("chat_id", activeNovelChatId);
              const fileBlob = new Blob([zipBuffer], { type: "application/zip" });
              formData.append("document", fileBlob, customFileName);
              formData.append("caption", caption);
              formData.append("parse_mode", "HTML");

              const tgRes = await fetch(`https://api.telegram.org/bot${activeNovelBotToken}/sendDocument`, {
                method: "POST",
                body: formData,
              });

              const tgData = (await tgRes.json()) as { ok: boolean; description?: string };
              if (tgRes.ok && tgData.ok) {
                config.lastNovelBackupSentDate = todayFormatted;
                config.lastNovelBackupTimestamp = Date.now();
                config.lastNovelBackupStatus = "success";
                config.lastNovelBackupSize = sizeStr;
                config.lastNovelBackupError = undefined;
                config.totalAutoNovelBackupsSent = (config.totalAutoNovelBackupsSent || 0) + 1;
                saveServerStateToDisk();
                console.info(`[Scheduler] Novel ZIP backup successfully sent to Telegram.`);
              } else {
                console.warn(`[Scheduler] Novel ZIP backup Telegram dispatch failed:`, tgData.description);
                config.lastNovelBackupStatus = "failed";
                config.lastNovelBackupError = tgData.description;
              }
            } catch (err: any) {
              console.error("[Scheduler] Scheduled novel backup error:", err);
              config.lastNovelBackupStatus = "failed";
              config.lastNovelBackupError = err.message;
            }
          }
        }
      }
    }
  } catch (scheduleErr) {
    console.warn("[Scheduler] Error in periodic check:", scheduleErr);
  }
}, 30000);

// Periodic background flush every 15 seconds to ensure changes are always committed to disk
const autoSaveInterval = setInterval(() => {
  try {
    saveServerStateToDisk();
  } catch (e) {
    console.warn("Background auto-save error:", e);
  }
}, 15000);

// Graceful shutdown handling (critical for Android / Termux process exit)
let isShuttingDown = false;
function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.info(`[PersistentDB] Caught signal ${signal}. Flushing all data to disk before exit...`);
  try {
    clearInterval(autoSaveInterval);
    saveServerStateToDisk();
    flushAllDataToDiskNow();
    createLocalBackupSnapshot('termux_exit');
    console.info(`[PersistentDB] All data successfully saved. Safe to exit.`);
  } catch (err) {
    console.error(`[PersistentDB] Error during shutdown save:`, err);
  }
  process.exit(0);
}

process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => handleGracefulShutdown("SIGHUP"));
process.on("beforeExit", () => {
  try {
    saveServerStateToDisk();
    flushAllDataToDiskNow();
  } catch {}
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/database.json',
            '**/*.json',
            '**/data/**/*',
            '**/.git/**',
            '**/node_modules/**',
          ],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
