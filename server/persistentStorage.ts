import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

export interface StoreProduct {
  id: string;
  type: 'novel' | 'video' | 'audio' | 'course' | 'file' | 'bundle';
  title: string;
  authorOrInstructor?: string;
  description: string;
  price: number; // in coins
  rating?: number;
  duration?: string; // for videos / courses (e.g. '45 min')
  fileSize?: string;
  fileName?: string;
  fileUrl?: string;
  coverImage?: string;
  coverColor?: string;
  category?: string;
  tags?: string[];
  isLocked?: boolean;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface PersistentDatabaseSchema {
  version: string;
  appName: string;
  lastUpdated: number;
  antiWipeProtected: boolean;
  habits: any[];
  tasks?: any[];
  deletedHabitIds?: string[];
  deletedTaskIds?: string[];
  wallet: {
    coins: number;
    totalCoinsEarned: number;
    totalCoinsSpent: number;
    unlockedNovelIds: string[];
    unlockedMovieIds?: string[];
    unlockedEpisodeIds?: string[];
    unlockedChapterIds?: string[];
    readingProgress?: Record<string, any>;
    transactions: any[];
  };
  customNovels: any[];
  customMovies?: any[];
  customPlaylists?: any[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  storeProducts: StoreProduct[];
  advancedSettings: Record<string, any>;
  telegramConfig: Record<string, any>;
  userCognitiveProfile?: Record<string, any> | null;
  chatHistories?: Record<string, any[]>;
  behaviorEngine?: Record<string, any>;
  proactiveCoach?: Record<string, any>;
  language: string;
  theme: string;
}

// ---------------------------------------------------------------------------
// Termux & Cross-Platform Resilient Project Root Detection
// ---------------------------------------------------------------------------

function findProjectRoot(): string {
  // 1. Explicit override if set
  if (process.env.APP_PROJECT_ROOT && fs.existsSync(process.env.APP_PROJECT_ROOT)) {
    return path.resolve(process.env.APP_PROJECT_ROOT);
  }

  // 2. Resolve relative to this file's location
  let startDir = '';
  try {
    if (typeof __dirname !== 'undefined') {
      startDir = __dirname;
    } else if (import.meta && import.meta.url) {
      startDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    startDir = process.cwd();
  }

  if (!startDir) startDir = process.cwd();

  // Search up to 5 parent directories for package.json or server.ts
  let current = path.resolve(startDir);
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(current, 'package.json')) || fs.existsSync(path.join(current, 'server.ts'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    return path.resolve(process.cwd());
  }

  return path.resolve(startDir);
}

const PROJECT_ROOT = findProjectRoot();

// Storage Directories
const DATA_DIR = process.env.DATA_DIR 
  ? path.resolve(process.env.DATA_DIR) 
  : path.join(PROJECT_ROOT, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_BACKUP_FILE = path.join(DATA_DIR, 'database.json.bak');
const LEGACY_CACHE_FILE = path.join(PROJECT_ROOT, 'server_habit_state.json');

// ---------------------------------------------------------------------------
// Permanent Multi-Path Redundancy for Termux, Android & Linux
// Ensures user data and custom store paths survive any project folder overwrite or fresh site copy
// ---------------------------------------------------------------------------

const HOME_DIR = process.env.HOME || '/data/data/com.termux/files/home';

// Master permanent directory in Termux user home (completely outside the project folder)
const GLOBAL_PERMANENT_DIR = path.join(HOME_DIR, '.lally_habit_app');
const GLOBAL_PERMANENT_DB = path.join(GLOBAL_PERMANENT_DIR, 'database.json');
const GLOBAL_PERMANENT_BAK = path.join(GLOBAL_PERMANENT_DIR, 'database.json.bak');

// Additional Termux / Linux backup paths
const TERMUX_HOME_DATA_DIR = path.join(HOME_DIR, '.lally_habit_data');
const TERMUX_HOME_DB_FILE = path.join(TERMUX_HOME_DATA_DIR, 'database.json');
const CONFIG_DIR_DB_FILE = path.join(HOME_DIR, '.config', 'lally_habits', 'database.json');

// Android shared storage / SD card master directories
const SDCARD_MASTER_DIR = '/sdcard/LallyHabitMasterData';
const SDCARD_MASTER_DB = path.join(SDCARD_MASTER_DIR, 'database.json');
const STORAGE_EMULATED_MASTER_DIR = '/storage/emulated/0/LallyHabitMasterData';
const STORAGE_EMULATED_MASTER_DB = path.join(STORAGE_EMULATED_MASTER_DIR, 'database.json');
const SHARED_STORAGE_DB = path.join(HOME_DIR, 'storage', 'shared', 'LallyHabitMasterData', 'database.json');

// Store path pointer files (stores the user's custom store directory path permanently)
const STORE_PATH_POINTER_FILES = [
  path.join(GLOBAL_PERMANENT_DIR, 'store_path.txt'),
  path.join(HOME_DIR, '.lally_store_path.txt'),
  path.join(TERMUX_HOME_DATA_DIR, 'store_path.txt'),
  path.join(SDCARD_MASTER_DIR, 'store_path.txt'),
  path.join(STORAGE_EMULATED_MASTER_DIR, 'store_path.txt'),
  path.join(DATA_DIR, 'store_path.txt'),
];

// Telegram config permanent pointer files (ensures Telegram token & chat ID survive any DB resets or client wipes)
const TELEGRAM_CONFIG_POINTER_FILES = [
  path.join(GLOBAL_PERMANENT_DIR, 'telegram_config.json'),
  path.join(HOME_DIR, '.lally_telegram_config.json'),
  path.join(TERMUX_HOME_DATA_DIR, 'telegram_config.json'),
  path.join(SDCARD_MASTER_DIR, 'telegram_config.json'),
  path.join(STORAGE_EMULATED_MASTER_DIR, 'telegram_config.json'),
  path.join(DATA_DIR, 'telegram_config.json'),
];

// Helper to detect dummy / placeholder tokens from test templates
export function isDummyTelegramToken(token?: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim().toLowerCase();
  return (
    clean === '' ||
    clean.includes('123456:abc') ||
    clean === 'your_bot_token' ||
    clean === 'bot_token_here' ||
    clean === 'xxx' ||
    clean.startsWith('dummy') ||
    clean === 'test'
  );
}

export function isDummyChatId(chatId?: string): boolean {
  if (!chatId || typeof chatId !== 'string') return false;
  const clean = chatId.trim();
  return (
    clean === '' ||
    clean === '987654321' ||
    clean === '123456789' ||
    clean === 'your_chat_id' ||
    clean === 'chat_id_here'
  );
}

// Helper to discover persistent Telegram config from all dedicated pointer files and env
export function getSavedTelegramConfigFromDisk(): Record<string, any> {
  const envBotToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^bot/i, '');
  const envChatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  const envBackupToken = (process.env.TELEGRAM_BACKUP_BOT_TOKEN || '').trim().replace(/^bot/i, '');
  const envBackupChatId = (process.env.TELEGRAM_BACKUP_CHAT_ID || '').trim();

  let merged: Record<string, any> = {
    botToken: isDummyTelegramToken(envBotToken) ? '' : envBotToken,
    chatId: isDummyChatId(envChatId) ? '' : envChatId,
    backupBotToken: isDummyTelegramToken(envBackupToken) ? '' : envBackupToken,
    backupChatId: isDummyChatId(envBackupChatId) ? '' : envBackupChatId,
  };

  // Inspect pointer files in order
  for (const pointerFile of TELEGRAM_CONFIG_POINTER_FILES) {
    try {
      if (fs.existsSync(pointerFile)) {
        const raw = fs.readFileSync(pointerFile, 'utf-8');
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const token = (parsed.botToken || '').trim().replace(/^bot/i, '');
            const chat = (parsed.chatId || '').trim();
            const bToken = (parsed.backupBotToken || '').trim().replace(/^bot/i, '');
            const bChat = (parsed.backupChatId || '').trim();

            const validToken = !isDummyTelegramToken(token) ? token : '';
            const validChat = !isDummyChatId(chat) ? chat : '';
            const validBToken = !isDummyTelegramToken(bToken) ? bToken : '';
            const validBChat = !isDummyChatId(bChat) ? bChat : '';

            merged = {
              ...merged,
              ...parsed,
              botToken: validToken || merged.botToken || '',
              chatId: validChat || merged.chatId || '',
              backupBotToken: validBToken || merged.backupBotToken || '',
              backupChatId: validBChat || merged.backupChatId || '',
            };
          }
        }
      }
    } catch {}
  }

  // Also check database files in permanent Termux directories if pointer file was missing
  const masterDbFiles = [GLOBAL_PERMANENT_DB, SDCARD_MASTER_DB, STORAGE_EMULATED_MASTER_DB];
  for (const masterDb of masterDbFiles) {
    try {
      if (masterDb && fs.existsSync(masterDb)) {
        const raw = fs.readFileSync(masterDb, 'utf-8');
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed?.telegramConfig && typeof parsed.telegramConfig === 'object') {
            const token = (parsed.telegramConfig.botToken || '').trim().replace(/^bot/i, '');
            const chat = (parsed.telegramConfig.chatId || '').trim();
            const bToken = (parsed.telegramConfig.backupBotToken || '').trim().replace(/^bot/i, '');
            const bChat = (parsed.telegramConfig.backupChatId || '').trim();

            if (!isDummyTelegramToken(token) && token && !merged.botToken) {
              merged.botToken = token;
            }
            if (!isDummyChatId(chat) && chat && !merged.chatId) {
              merged.chatId = chat;
            }
            if (!isDummyTelegramToken(bToken) && bToken && !merged.backupBotToken) {
              merged.backupBotToken = bToken;
            }
            if (!isDummyChatId(bChat) && bChat && !merged.backupChatId) {
              merged.backupChatId = bChat;
            }
          }
        }
      }
    } catch {}
  }

  return merged;
}

// Helper to save Telegram config to all persistent locations with strict anti-wipe
export function saveTelegramConfigToDedicatedDisk(config: Record<string, any>, forceClear: boolean = false): void {
  if (!config || typeof config !== 'object') return;
  const existing = getSavedTelegramConfigFromDisk();

  const tokenToSave = (config.botToken !== undefined && (config.botToken.trim() !== '' || forceClear))
    ? config.botToken.trim().replace(/^bot/i, '')
    : (existing.botToken || '');

  const chatToSave = (config.chatId !== undefined && (config.chatId.trim() !== '' || forceClear))
    ? config.chatId.trim()
    : (existing.chatId || '');

  const bTokenToSave = (config.backupBotToken !== undefined && (config.backupBotToken.trim() !== '' || forceClear))
    ? config.backupBotToken.trim().replace(/^bot/i, '')
    : (existing.backupBotToken || '');

  const bChatToSave = (config.backupChatId !== undefined && (config.backupChatId.trim() !== '' || forceClear))
    ? config.backupChatId.trim()
    : (existing.backupChatId || '');

  const finalConfig = {
    ...existing,
    ...config,
    botToken: tokenToSave,
    chatId: chatToSave,
    backupBotToken: bTokenToSave,
    backupChatId: bChatToSave,
    lastUpdated: Date.now(),
  };

  const payload = JSON.stringify(finalConfig, null, 2);
  for (const pointerFile of TELEGRAM_CONFIG_POINTER_FILES) {
    try {
      safeWriteFileSyncWithSync(pointerFile, payload);
    } catch {}
  }
}

// Helper to discover persistent store path from all pointer files
export function getSavedStorePathFromPointerFiles(): string {
  for (const pointerFile of STORE_PATH_POINTER_FILES) {
    try {
      if (fs.existsSync(pointerFile)) {
        const raw = fs.readFileSync(pointerFile, 'utf-8');
        if (raw && raw.trim()) {
          const resolved = raw.trim();
          if (resolved) return resolved;
        }
      }
    } catch {}
  }
  return '';
}

// Helper to save store path pointer to all persistent locations
export function saveStorePathToPointerFiles(storePath: string): void {
  if (!storePath || !storePath.trim()) return;
  const clean = storePath.trim();
  for (const pointerFile of STORE_PATH_POINTER_FILES) {
    try {
      safeWriteFileSyncWithSync(pointerFile, clean);
    } catch {}
  }
}

// Helper to dynamically resolve active Store & Media directory (custom path configurable by user)
export function getStoreDirectories(customOverridePath?: string) {
  let baseStoreDir = 
    customOverridePath || 
    inMemoryDatabase?.advancedSettings?.storeStoragePath || 
    process.env.STORE_STORAGE_PATH ||
    getSavedStorePathFromPointerFiles();
  
  if (!baseStoreDir || typeof baseStoreDir !== 'string' || !baseStoreDir.trim()) {
    baseStoreDir = path.join(DATA_DIR, 'store');
  } else {
    // Strip wrapping quotes and normalize whitespace
    baseStoreDir = baseStoreDir.trim().replace(/^["']|["']$/g, '').trim();
    // Normalize path separators to POSIX
    baseStoreDir = baseStoreDir.replace(/\\/g, '/');

    // Android Termux / Linux path enhancements
    const termuxHome = process.env.HOME || '/data/data/com.termux/files/home';

    // Handle common Android storage prefixes without leading slash
    if (baseStoreDir === 'sdcard' || baseStoreDir.startsWith('sdcard/')) {
      baseStoreDir = '/' + baseStoreDir;
    } else if (baseStoreDir === 'storage' || baseStoreDir.startsWith('storage/')) {
      baseStoreDir = '/' + baseStoreDir;
    }

    if (baseStoreDir.startsWith('~/')) {
      baseStoreDir = path.join(termuxHome, baseStoreDir.slice(2));
    } else if (baseStoreDir === '~') {
      baseStoreDir = termuxHome;
    } else if (!path.isAbsolute(baseStoreDir)) {
      baseStoreDir = path.resolve(process.cwd(), baseStoreDir);
    }
  }

  const moviesDir = path.join(baseStoreDir, 'movies');
  const legacyVideosDir = path.join(baseStoreDir, 'videos');
  const novelsDir = path.join(baseStoreDir, 'novels');
  const mediaDir = path.join(baseStoreDir, 'media');
  const catalogFile = path.join(baseStoreDir, 'catalog.json');

  return {
    baseStoreDir,
    moviesDir,
    legacyVideosDir,
    novelsDir,
    mediaDir,
    catalogFile,
  };
}

// Secondary CWD database file if running from a different working directory
const CWD_DATA_DIR = path.resolve(process.cwd(), 'data');
const CWD_DB_FILE = path.join(CWD_DATA_DIR, 'database.json');

console.info(`[PersistentDB] Storage Root: ${DATA_DIR}`);
console.info(`[PersistentDB] Database File: ${DB_FILE}`);

// Ensure all persistent directories exist
export function ensureDirectories() {
  const { baseStoreDir, moviesDir, legacyVideosDir, novelsDir, mediaDir } = getStoreDirectories();
  const dirs = [
    DATA_DIR,
    BACKUPS_DIR,
    GLOBAL_PERMANENT_DIR,
    TERMUX_HOME_DATA_DIR,
    baseStoreDir,
    moviesDir,
    legacyVideosDir,
    novelsDir,
    mediaDir,
  ];
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      // Soft warn for permissions on external mounts
    }
  }

  // Create clear README files explaining the store structure
  try {
    const rootReadme = path.join(baseStoreDir, 'README.txt');
    if (!fs.existsSync(rootReadme)) {
      const readmeContent = 
`======================================================================
  راهنمای ساختار پوشه‌های فروشگاه (Store Directories Guide)
======================================================================
مسیر ریشه فروشگاه: ${baseStoreDir}

پوشه‌های اصلی فروشگاه:
1. پوشه رمان‌ها (novels/):
   - هر رمان دارای یک پوشه اختصاصی با نام رمان است.
   - مثال: novels/کیمیای سعادت/
   - فایل‌های متنی فصول رمان (فایل‌های txt) یا metadata.json داخل این پوشه قرار می‌گیرند.

2. پوشه فیلم‌ها و ویدیوها (movies/):
   - هر فیلم یا سریال دارای یک پوشه اختصاصی با نام اثر است.
   - مثال: movies/فیلم انگیزشی/
   - فایل‌های ویدیویی (mp4, mkv, ...) داخل این پوشه قرار می‌گیرند.

قابلیت اسکن خودکار:
هر پوشه‌ای که به صورت دستی در novels/ یا movies/ ایجاد کنید یا فایل داخل آن قرار دهید،
از بخش «تنظیمات پیشرفته > مدیریت پوشه فروشگاه» در برنامه قابل اسکن و درون‌ریزی است.
======================================================================
`;
      safeWriteFileSyncWithSync(rootReadme, readmeContent);
    }
  } catch {}
}

/**
 * Sanitize folder name for novels and movies on disk (FAT32, Android Termux, ext4, NTFS compatible)
 */
export function sanitizeFolderName(name: string, fallbackId: string): string {
  if (!name || typeof name !== 'string') {
    return (fallbackId || `item-${Date.now()}`).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
  }
  let clean = name.replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '');
  if (!clean) {
    clean = (fallbackId || `item-${Date.now()}`).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
  }
  if (clean.length > 90) {
    clean = clean.slice(0, 90).trim();
  }
  return clean;
}

/**
 * Format chapter text file name: e.g. "01 - فصل اول.txt"
 */
export function formatChapterFileName(ch: any, idx: number): string {
  const num = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : idx + 1;
  const pad = String(num).padStart(2, '0');
  const rawTitle = (ch.title || `فصل ${num}`).replace(/[\\/:*?"<>|\r\n\t]+/g, '_').trim();
  const safeTitle = rawTitle.slice(0, 60).trim();
  return `${pad} - ${safeTitle}.txt`;
}

/**
 * Export a single WebNovel to its dedicated folder on disk inside novels/
 */
export function exportNovelToDiskFolder(
  novel: any,
  targetStoreDir?: string
): { success: boolean; folderPath: string; folderName: string } {
  if (!novel || !novel.id) {
    return { success: false, folderPath: '', folderName: '' };
  }
  try {
    const { novelsDir } = getStoreDirectories(targetStoreDir);
    if (!fs.existsSync(novelsDir)) {
      fs.mkdirSync(novelsDir, { recursive: true });
    }

    const folderName = sanitizeFolderName(novel.title || novel.id, novel.id);
    const novelFolder = path.join(novelsDir, folderName);
    if (!fs.existsSync(novelFolder)) {
      fs.mkdirSync(novelFolder, { recursive: true });
    }

    const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
    const resolvedSynopsis = resolveNovelSynopsis(novel, inMemoryDatabase.language || 'fa') || novel.synopsis || '';

    // 1. Write metadata.json and info.json
    const metadata = {
      id: novel.id,
      title: novel.title || folderName,
      author: novel.author || 'نویسنده نامشخص',
      genre: novel.genre || 'فانتزی',
      synopsis: resolvedSynopsis,
      price: novel.price !== undefined ? novel.price : chapters.length * (novel.pricePerChapter || 2),
      pricePerChapter: novel.pricePerChapter !== undefined ? novel.pricePerChapter : 2,
      isPriceLocked: novel.isPriceLocked ?? true,
      rating: novel.rating || 5.0,
      tags: novel.tags || ['رمان'],
      coverColor: novel.coverColor || '#6366f1',
      coverGradient: novel.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
      uploadedAt: novel.uploadedAt || new Date().toISOString(),
      totalChapters: chapters.length,
      diskFolderName: folderName,
    };

    safeWriteFileSyncWithSync(path.join(novelFolder, 'metadata.json'), JSON.stringify(metadata, null, 2));
    safeWriteFileSyncWithSync(path.join(novelFolder, 'info.json'), JSON.stringify(metadata, null, 2));

    // 2. Write chapters.json & individual chapter files
    if (chapters.length > 0) {
      safeWriteFileSyncWithSync(path.join(novelFolder, 'chapters.json'), JSON.stringify(chapters, null, 2));

      for (let idx = 0; idx < chapters.length; idx++) {
        const ch = chapters[idx];
        const chNum = typeof ch.chapterNumber === 'number' ? ch.chapterNumber : idx + 1;
        const chFileName = formatChapterFileName(ch, idx);
        const chFilePath = path.join(novelFolder, chFileName);

        const chContent = (ch.content || '').trim();
        const headerTitle = ch.title || `فصل ${chNum}`;
        const fileContent = `${headerTitle}\n\n${chContent}`;
        safeWriteFileSyncWithSync(chFilePath, fileContent);
      }
    } else if (novel.rawContent || novel.fileData) {
      const rawText = (novel.rawContent || novel.fileData || '').trim();
      safeWriteFileSyncWithSync(path.join(novelFolder, '01 - متن کامل رمان.txt'), rawText);
    } else {
      safeWriteFileSyncWithSync(
        path.join(novelFolder, '01 - فصل اول.txt'),
        `فصل اول\n\nمتن فصل اول رمان «${novel.title || folderName}»`
      );
    }

    // 3. Save cover image if base64 data URL
    if (novel.coverUrl && typeof novel.coverUrl === 'string' && novel.coverUrl.startsWith('data:image/')) {
      try {
        const match = novel.coverUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          const imgBuffer = Buffer.from(match[2], 'base64');
          safeWriteFileSyncWithSync(path.join(novelFolder, `cover.${ext}`), imgBuffer);
        }
      } catch {}
    }

    novel.diskFolderName = folderName;
    novel.diskPath = novelFolder;

    return { success: true, folderPath: novelFolder, folderName };
  } catch (err: any) {
    console.error(`[PersistentDB] Failed to export novel "${novel?.title}" to disk:`, err);
    return { success: false, folderPath: '', folderName: '' };
  }
}

/**
 * Export a single Movie or Series to its dedicated folder on disk inside movies/
 */
export function exportMovieToDiskFolder(
  movie: any,
  targetStoreDir?: string
): { success: boolean; folderPath: string; folderName: string } {
  if (!movie || !movie.id) {
    return { success: false, folderPath: '', folderName: '' };
  }
  try {
    const { moviesDir } = getStoreDirectories(targetStoreDir);
    if (!fs.existsSync(moviesDir)) {
      fs.mkdirSync(moviesDir, { recursive: true });
    }

    const folderName = sanitizeFolderName(movie.title || movie.id, movie.id);
    const movieFolder = path.join(moviesDir, folderName);
    if (!fs.existsSync(movieFolder)) {
      fs.mkdirSync(movieFolder, { recursive: true });
    }

    const metadata = {
      id: movie.id,
      title: movie.title || folderName,
      director: movie.director || 'نامشخص',
      genre: movie.genre || 'سینمایی',
      synopsis: movie.synopsis || '',
      duration: movie.duration || 120,
      price: movie.price || 0,
      pricePerEpisode: movie.pricePerEpisode,
      rating: movie.rating || 5.0,
      year: movie.year || new Date().getFullYear(),
      uploadedAt: movie.uploadedAt || new Date().toISOString(),
      mediaType: movie.mediaType || 'movie',
      hasSeasons: !!movie.hasSeasons,
      seasonsCount: movie.seasons?.length || 0,
      standaloneEpisodesCount: movie.standaloneEpisodes?.length || 0,
      diskFolderName: folderName,
    };

    safeWriteFileSyncWithSync(path.join(movieFolder, 'metadata.json'), JSON.stringify(metadata, null, 2));
    safeWriteFileSyncWithSync(path.join(movieFolder, 'info.json'), JSON.stringify(metadata, null, 2));

    movie.diskFolderName = folderName;
    movie.diskPath = movieFolder;

    return { success: true, folderPath: movieFolder, folderName };
  } catch (err: any) {
    console.error(`[PersistentDB] Failed to export movie "${movie?.title}" to disk:`, err);
    return { success: false, folderPath: '', folderName: '' };
  }
}

/**
 * Synchronize all custom novels and movies to their dedicated disk folders
 */
export function syncAllStoreItemsToDisk(targetStoreDir?: string): {
  novelsCount: number;
  moviesCount: number;
  storePath: string;
  novelsPath: string;
  moviesPath: string;
} {
  ensureDirectories();
  const dirs = getStoreDirectories(targetStoreDir);

  try {
    if (!fs.existsSync(dirs.baseStoreDir)) {
      fs.mkdirSync(dirs.baseStoreDir, { recursive: true });
    }
    if (!fs.existsSync(dirs.novelsDir)) {
      fs.mkdirSync(dirs.novelsDir, { recursive: true });
    }
    if (!fs.existsSync(dirs.moviesDir)) {
      fs.mkdirSync(dirs.moviesDir, { recursive: true });
    }

    const rootReadme = 
`======================================================================
  راهنمای ساختار پوشه‌های فروشگاه (Store Directories Guide)
======================================================================
مسیر ریشه فروشگاه: ${dirs.baseStoreDir}

پوشه‌های اصلی:
1. پوشه novels/ :
   - هر رمان باید دارای پوشه اختصاصی خود با نام رمان باشد.
   - نام پوشه = نام رمان (مثال: novels/صعود اراده/)
   - محتویات هر پوشه رمان:
     * metadata.json یا info.json (مشخصات، نویسنده و قیمت)
     * فایل‌های متنی فصول (مثال: 01 - فصل اول.txt ، 02 - فصل دوم.txt)
     * یا فایل chapters.json

2. پوشه movies/ :
   - هر فیلم یا سریال باید دارای پوشه اختصاصی خود با نام آن باشد.
   - نام پوشه = نام فیلم (مثال: movies/فیلم انگیزشی/)
   - محتویات هر پوشه فیلم:
     * metadata.json یا info.json (مشخصات اثر)
     * فایل‌های ویدیو (mp4, mkv, ...)

نکته مهم:
اگر پوشه‌ای به صورت دستی در novels/ یا movies/ بسازید، با زدن دکمه
«بررسی و واردسازی فایل‌های فروشگاه از دیسک» در تب تنظیمات پیشرفته،
فایل‌ها به صورت خودکار شناسایی شده و وارد فروشگاه می‌شوند.
======================================================================
`;
    safeWriteFileSyncWithSync(path.join(dirs.baseStoreDir, 'README.txt'), rootReadme);
    safeWriteFileSyncWithSync(
      path.join(dirs.novelsDir, 'README.txt'),
      'پوشه رمان‌ها: هر رمان باید دارای پوشه اختصاصی خود در این مسیر باشد.\nفایل‌های متنی فصول یا metadata.json را داخل پوشه رمان قرار دهید.'
    );
    safeWriteFileSyncWithSync(
      path.join(dirs.moviesDir, 'README.txt'),
      'پوشه فیلم‌ها: هر فیلم یا سریال باید دارای پوشه اختصاصی خود در این مسیر باشد.\nویدیوها یا metadata.json را داخل پوشه فیلم قرار دهید.'
    );
  } catch (err) {
    console.warn('[PersistentDB] Could not write store README files:', err);
  }

  let novelsCount = 0;
  const novels = inMemoryDatabase.customNovels || [];
  for (const novel of novels) {
    if (novel && novel.id) {
      const res = exportNovelToDiskFolder(novel, targetStoreDir);
      if (res.success) novelsCount++;
    }
  }

  let moviesCount = 0;
  const movies = inMemoryDatabase.customMovies || [];
  for (const movie of movies) {
    if (movie && movie.id) {
      const res = exportMovieToDiskFolder(movie, targetStoreDir);
      if (res.success) moviesCount++;
    }
  }

  console.info(`[PersistentDB] Store synchronized to disk: ${novelsCount} novels, ${moviesCount} movies at ${dirs.baseStoreDir}`);

  return {
    novelsCount,
    moviesCount,
    storePath: dirs.baseStoreDir,
    novelsPath: dirs.novelsDir,
    moviesPath: dirs.moviesDir,
  };
}

function sanitizeServerWallet(rawWallet: any) {
  const defaultCoins = 0;
  if (!rawWallet || typeof rawWallet !== 'object') {
    return {
      coins: defaultCoins,
      totalCoinsEarned: defaultCoins,
      totalCoinsSpent: 0,
      unlockedNovelIds: [],
      unlockedMovieIds: [],
      unlockedEpisodeIds: [],
      unlockedChapterIds: [],
      readingProgress: {},
      transactions: [],
    };
  }

  let coins = rawWallet.coins;
  if (typeof coins === 'string') coins = parseFloat(coins);
  if (typeof coins !== 'number' || isNaN(coins) || !isFinite(coins)) {
    const diamonds = typeof rawWallet.diamonds === 'number' && !isNaN(rawWallet.diamonds) ? rawWallet.diamonds : defaultCoins;
    coins = diamonds;
  }
  coins = Math.max(0, Math.round(coins));

  let totalCoinsEarned = rawWallet.totalCoinsEarned;
  if (typeof totalCoinsEarned === 'string') totalCoinsEarned = parseFloat(totalCoinsEarned);
  if (typeof totalCoinsEarned !== 'number' || isNaN(totalCoinsEarned) || !isFinite(totalCoinsEarned)) {
    totalCoinsEarned = Math.max(coins, defaultCoins);
  }
  totalCoinsEarned = Math.max(coins, Math.round(totalCoinsEarned));

  let totalCoinsSpent = rawWallet.totalCoinsSpent;
  if (typeof totalCoinsSpent === 'string') totalCoinsSpent = parseFloat(totalCoinsSpent);
  if (typeof totalCoinsSpent !== 'number' || isNaN(totalCoinsSpent) || !isFinite(totalCoinsSpent)) {
    totalCoinsSpent = 0;
  }
  totalCoinsSpent = Math.max(0, Math.round(totalCoinsSpent));

  return {
    ...rawWallet,
    coins,
    totalCoinsEarned,
    totalCoinsSpent,
    unlockedNovelIds: Array.isArray(rawWallet.unlockedNovelIds) ? rawWallet.unlockedNovelIds : [],
    unlockedMovieIds: Array.isArray(rawWallet.unlockedMovieIds) ? rawWallet.unlockedMovieIds : [],
    unlockedEpisodeIds: Array.isArray(rawWallet.unlockedEpisodeIds) ? rawWallet.unlockedEpisodeIds : [],
    unlockedChapterIds: Array.isArray(rawWallet.unlockedChapterIds) ? rawWallet.unlockedChapterIds : [],
    readingProgress: rawWallet.readingProgress && typeof rawWallet.readingProgress === 'object' ? rawWallet.readingProgress : {},
    transactions: Array.isArray(rawWallet.transactions) ? rawWallet.transactions : [],
  };
}

// Initial default empty database
const defaultDatabase: PersistentDatabaseSchema = {
  version: '2.5.0',
  appName: 'Lally 66-Day Habit & Reward Store Engine',
  lastUpdated: Date.now(),
  antiWipeProtected: true,
  habits: [],
  tasks: [],
  deletedHabitIds: [],
  deletedTaskIds: [],
  wallet: {
    coins: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    unlockedNovelIds: [],
    unlockedMovieIds: [],
    unlockedEpisodeIds: [],
    unlockedChapterIds: [],
    readingProgress: {},
    transactions: [],
  },
  customNovels: [],
  customMovies: [],
  customPlaylists: [],
  deletedMovieIds: [],
  deletedPlaylistIds: [],
  deletedNovelIds: [],
  storeProducts: [],
  advancedSettings: {
    defaultTargetDays: 66,
    enableSoundEffects: true,
    enableHapticFeedback: true,
    enableCelebrationConfetti: true,
    strictStreakMode: true,
    showScientificFormula: false,
    autoOptimizeStorage: true,
  },
  telegramConfig: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    autoDailyReport: true,
    reportTime: '21:00',
  },
  language: 'fa',
  theme: 'light',
};

let inMemoryDatabase: PersistentDatabaseSchema = { ...defaultDatabase };

// Check if a synopsis string is an in-progress temporary placeholder
export function isPlaceholderSynopsis(synopsis?: string): boolean {
  if (!synopsis || typeof synopsis !== 'string') return true;
  const trimmed = synopsis.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  return (
    trimmed.includes('در حال ترجمه') ||
    trimmed.includes('در دست ترجمه') ||
    trimmed.includes('قید ترجمه') ||
    lower.includes('in translation') ||
    lower.includes('being translated') ||
    lower.includes('novel is being translated') ||
    trimmed === 'خلاصه داستان ثبت نشده است.' ||
    trimmed === 'No synopsis provided.'
  );
}

// Extract clean introductory excerpt from novel chapters
export function extractCleanExcerptFromChapters(
  chapters?: { content?: string; title?: string }[],
  maxLength: number = 200
): string {
  if (!Array.isArray(chapters) || chapters.length === 0) return '';
  for (const ch of chapters) {
    if (!ch || !ch.content || typeof ch.content !== 'string') continue;
    let text = ch.content.replace(/<[^>]+>/g, ' ');
    text = text.replace(/[#*`_~=\-]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    if (ch.title) {
      const cleanTitle = ch.title.replace(/\s+/g, ' ').trim();
      if (cleanTitle && text.startsWith(cleanTitle)) {
        text = text.slice(cleanTitle.length).trim();
      }
    }
    if (text.length >= 20) {
      if (text.length <= maxLength) {
        return text;
      }
      const slice = text.slice(0, maxLength);
      const lastPunc = Math.max(
        slice.lastIndexOf('.'),
        slice.lastIndexOf('!'),
        slice.lastIndexOf('؟'),
        slice.lastIndexOf('?')
      );
      if (lastPunc > 60) {
        return slice.slice(0, lastPunc + 1).trim();
      }
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > 50) {
        return slice.slice(0, lastSpace).trim() + '...';
      }
      return slice.trim() + '...';
    }
  }
  return '';
}

// Resolve a proper, informative synopsis for a novel, never leaving a placeholder "در حال ترجمه"
export function resolveNovelSynopsis(
  novel: {
    title?: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    chapters?: { content?: string; title?: string }[];
  },
  language: string = 'fa'
): string {
  if (!novel) return '';
  if (novel.synopsis && !isPlaceholderSynopsis(novel.synopsis)) {
    return novel.synopsis.trim();
  }

  const isFa = language === 'fa' || !language;
  const isAr = language === 'ar';
  const cleanTitle = (novel.title || '').trim() || (isFa ? 'رمان' : isAr ? 'رواية' : 'Novel');
  const cleanAuthor = (novel.author || '').trim() || (isFa ? 'ناشناس' : isAr ? 'مجهول' : 'Unknown');
  const cleanGenre = (novel.genre || '').trim() || (isFa ? 'عمومی' : isAr ? 'عام' : 'General');
  const chaptersCount = Array.isArray(novel.chapters) ? novel.chapters.length : 0;

  const excerpt = extractCleanExcerptFromChapters(novel.chapters, 190);

  if (excerpt) {
    if (isFa) {
      return `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}. بخشی از داستان: «${excerpt}»`;
    }
    if (isAr) {
      return `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}. مقتطف من القصة: «${excerpt}»`;
    }
    return `"${cleanTitle}" — a captivating ${cleanGenre} novel by ${cleanAuthor}. Excerpt: "${excerpt}"`;
  }

  if (isFa) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}، شامل ${chaptersCount} فصل ترجمه‌شده و آماده مطالعه.`
      : `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}.`;
  }
  if (isAr) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}، تضم ${chaptersCount} فصول مترجمة وجاهزة للقراءة.`
      : `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}.`;
  }
  return chaptersCount > 0
    ? `"${cleanTitle}" — a complete ${cleanGenre} novel by ${cleanAuthor}, featuring ${chaptersCount} translated chapters.`
    : `"${cleanTitle}" — an engaging ${cleanGenre} novel by ${cleanAuthor}.`;
}

// Sanitize server novel object so any completed novel has a clean synopsis
export function sanitizeServerNovel(novel: any, language: string = 'fa'): any {
  if (!novel || typeof novel !== 'object') return novel;
  if (isPlaceholderSynopsis(novel.synopsis)) {
    return {
      ...novel,
      synopsis: resolveNovelSynopsis(novel, language),
    };
  }
  return novel;
}

// Helper to calculate data richness score for candidate database files
export function computeDatabaseScore(parsed: any): number {
  if (!parsed || typeof parsed !== 'object') return -999999;
  if (parsed.isDefaultTemplate === true) return -1000;

  const habits = Array.isArray(parsed.habits) ? parsed.habits : [];
  const tasks珍惜 = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const novels = Array.isArray(parsed.customNovels) ? parsed.customNovels : [];
  const movies = Array.isArray(parsed.customMovies) ? parsed.customMovies : [];
  const playlistsvol = Array.isArray(parsed.customPlaylists) ? parsed.customPlaylists : [];
  const deletedMovies = Array.isArray(parsed.deletedMovieIds) ? parsed.deletedMovieIds : [];
  const deletedPlaylists = Array.isArray(parsed.deletedPlaylistIds) ? parsed.deletedPlaylistIds : [];
  const deletedNovels = Array.isArray(parsed.deletedNovelIds) ? parsed.deletedNovelIds : [];

  let totalCheckins = 0;
  for (const h of habits) {
    if (h && h.history && typeof h.history === 'object') {
      totalCheckins += Object.keys(h.history).length;
    }
  }

  let totalTaskCompletions = 0;
  for (const t of tasks珍惜) {
    if (t && (t.completed || (t.completedTimestamps && t.completedTimestamps.length > 0))) {
      totalTaskCompletions++;
    }
  }

  const walletCoins = typeof parsed.wallet?.coins === 'number' ? parsed.wallet.coins : 0;
  const walletTx = Array.isArray(parsed.wallet?.transactions) ? parsed.wallet.transactions.length : 0;
  const unlockedNovels = Array.isArray(parsed.wallet?.unlockedNovelIds) ? parsed.wallet.unlockedNovelIds.length : 0;
  const unlockedMovies = Array.isArray(parsed.wallet?.unlockedMovieIds) ? parsed.wallet.unlockedMovieIds.length : 0;
  const readingProgressCount进 = parsed.wallet?.readingProgress ? Object.keys(parsed.wallet.readingProgress).length : 0;

  const hasStorePath = Boolean(parsed.advancedSettings?.storeStoragePath && parsed.advancedSettings.storeStoragePath.trim().length > 0);
  const rawBotToken = (parsed.telegramConfig?.botToken || '').trim();
  const hasBotToken = Boolean(rawBotToken.length > 0 && !isDummyTelegramToken(rawBotToken));
  const hasAiKey = Boolean(parsed.advancedSettings?.aiConfig?.analyticsAI?.keys?.length > 0);

  // If completely empty (no habits, tasks, checkins, media, novels, transactions or custom configs)
  if (
    habits.length === 0 &&
    tasks珍惜.length === 0 &&
    novels.length === 0 &&
    movies.length === 0 &&
    playlistsvol.length === 0 &&
    totalCheckins === 0 &&
    walletTx === 0 &&
    !hasStorePath &&
    !hasBotToken &&
    walletCoins === 0
  ) {
    return 0; // Empty baseline
  }

  let score = 100; // Base score for having valid user data
  score += habits.length * 1000;
  score += totalCheckins * 500;
  score += tasks珍惜.length * 1000;
  score += totalTaskCompletions * 500;
  score += novels.length * 2000;
  score += movies.length * 2000;
  score += playlistsvol.length * 1000;
  score += deletedMovies.length * 100;
  score += deletedPlaylists.length * 100;
  score += deletedNovels.length * 100;
  score += walletCoins * 5;
  score += walletTx * 200;
  score += unlockedNovels * 500;
  score += unlockedMovies * 500;
  score += readingProgressCount进 * 300;
  score += hasStorePath ? 5000 : 0;
  score += hasBotToken ? 3000 : 0;
  score += hasAiKey ? 1000 : 0;

  return score;
}

// Helper for synchronous disk write with explicit hardware fsync (vital for Android / Termux)
function safeWriteFileSyncWithSync(filePath: string, content: string | Buffer): boolean {
  try {
    const parent = path.dirname(filePath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    const fd = fs.openSync(filePath, 'w');
    if (Buffer.isBuffer(content)) {
      fs.writeSync(fd, content, 0, content.length);
    } else {
      fs.writeSync(fd, content, 0, 'utf-8');
    }
    try {
      fs.fsyncSync(fd);
    } catch {}
    fs.closeSync(fd);
    return true;
  } catch (err) {
    try {
      if (Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      return true;
    } catch (writeErr) {
      console.warn(`[PersistentDB] Write to ${filePath} failed:`, writeErr);
      return false;
    }
  }
}

// Atomic file write using temporary file and atomic rename, with synchronous direct fallback
function atomicWriteFileWithFsync(targetFile: string, content: string): boolean {
  const dir = path.dirname(targetFile);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  const tempFile = path.join(dir, `.atomic_${Date.now()}_${process.pid}.tmp`);
  try {
    const ok = safeWriteFileSyncWithSync(tempFile, content);
    if (ok) {
      fs.renameSync(tempFile, targetFile);
      return true;
    }
  } catch {
    // Fallback to direct synchronous write (needed if Android filesystem / SD card doesn't allow rename across mounts)
  }
  
  const directOk = safeWriteFileSyncWithSync(targetFile, content);
  try {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  } catch {}
  return directOk;
}

// Load database from disk on module initialization with resilient multi-path recovery
export function initializePersistentStorage(): PersistentDatabaseSchema {
  // 1. First, check if a custom store path was saved in any pointer file
  const savedStorePath = getSavedStorePathFromPointerFiles();
  if (savedStorePath) {
    if (!defaultDatabase.advancedSettings) defaultDatabase.advancedSettings = {};
    defaultDatabase.advancedSettings.storeStoragePath = savedStorePath;
    if (!inMemoryDatabase.advancedSettings) inMemoryDatabase.advancedSettings = {};
    inMemoryDatabase.advancedSettings.storeStoragePath = savedStorePath;
    console.info(`[PersistentDB] Discovered persistent custom store path: ${savedStorePath}`);
  }

  const { baseStoreDir } = getStoreDirectories(savedStorePath);

  // 2. List all candidate database locations in priority order
  const candidateFiles: string[] = [
    // Active Custom Store Directory database files (highest persistence on custom storage)
    path.join(baseStoreDir, 'lally_database.json'),
    path.join(baseStoreDir, 'database.json'),
    path.join(baseStoreDir, 'database_mirror.json'),
    path.join(baseStoreDir, 'database.json.bak'),

    // Termux user home permanent directory (immune to project folder overwrites/fresh copies)
    GLOBAL_PERMANENT_DB,
    GLOBAL_PERMANENT_BAK,
    TERMUX_HOME_DB_FILE,
    CONFIG_DIR_DB_FILE,

    // Android external SD card and shared storage
    SDCARD_MASTER_DB,
    STORAGE_EMULATED_MASTER_DB,
    SHARED_STORAGE_DB,

    // Project root directory
    DB_FILE,
    DB_BACKUP_FILE,
    CWD_DB_FILE,
    path.join(process.cwd(), 'server_habit_state.json'),
    LEGACY_CACHE_FILE,
  ].filter(Boolean);

  // Also include any backup snapshots in BACKUPS_DIR sorted by modification time (newest first)
  try {
    if (fs.existsSync(BACKUPS_DIR)) {
      const backupSnapshots = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(BACKUPS_DIR, f))
        .sort((a, b) => {
          try {
            return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
          } catch {
            return 0;
          }
        });
      candidateFiles.push(...backupSnapshots);
    }
  } catch {}

  let bestData: any = null;
  let bestTimestamp = -1;
  let bestScore = -999999;
  let chosenFile = '';

  // Evaluate all candidate files and select the highest quality dataset
  for (const candidate of candidateFiles) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.size < 20) continue;

      const raw = fs.readFileSync(candidate, 'utf-8');
      if (!raw || !raw.trim()) continue;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;

      const score = computeDatabaseScore(parsed);
      const candidateTime = typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : stat.mtimeMs;

      console.info(`[PersistentDB Candidate] "${candidate}" -> Score: ${score}, Time: ${candidateTime}, Habits: ${(parsed.habits || []).length}, Tasks: ${(parsed.tasks || []).length}`);

      // Selection rule: Higher score wins. If scores are equal, newest candidateTime wins.
      if (score > bestScore) {
        bestScore = score;
        bestTimestamp = candidateTime;
        bestData = parsed;
        chosenFile = candidate;
      } else if (score === bestScore && candidateTime > bestTimestamp) {
        bestScore = score;
        bestTimestamp = candidateTime;
        bestData = parsed;
        chosenFile = candidate;
      }
    } catch (err) {
      console.warn(`[PersistentDB] Candidate ${candidate} was unparseable:`, err);
    }
  }

  const savedTelegram = getSavedTelegramConfigFromDisk();

  if (bestData && bestScore > 0) {
    inMemoryDatabase = {
      ...defaultDatabase,
      ...bestData,
      habits: Array.isArray(bestData.habits) ? bestData.habits : [],
      tasks: Array.isArray(bestData.tasks) ? bestData.tasks : [],
      wallet: sanitizeServerWallet({
        ...defaultDatabase.wallet,
        ...(bestData.wallet || {}),
      }),
      customNovels: (Array.isArray(bestData.customNovels) ? bestData.customNovels : []).map((n: any) => sanitizeServerNovel(n, bestData.language || 'fa')),
      customMovies: Array.isArray(bestData.customMovies) ? bestData.customMovies : [],
      customPlaylists: Array.isArray(bestData.customPlaylists) ? bestData.customPlaylists : [],
      deletedMovieIds: Array.isArray(bestData.deletedMovieIds) ? bestData.deletedMovieIds : [],
      deletedPlaylistIds: Array.isArray(bestData.deletedPlaylistIds) ? bestData.deletedPlaylistIds : [],
      deletedNovelIds: Array.isArray(bestData.deletedNovelIds) ? bestData.deletedNovelIds : [],
      storeProducts: Array.isArray(bestData.storeProducts) && bestData.storeProducts.length > 0 
      ? bestData.storeProducts 
      : defaultDatabase.storeProducts,
      advancedSettings: {
        ...defaultDatabase.advancedSettings,
        ...(bestData.advancedSettings || {}),
        storeStoragePath: bestData.advancedSettings?.storeStoragePath || savedStorePath || defaultDatabase.advancedSettings?.storeStoragePath || '',
      },
      telegramConfig: {
        ...defaultDatabase.telegramConfig,
        ...(bestData.telegramConfig || {}),
        ...savedTelegram,
        botToken: (
          (!isDummyTelegramToken(savedTelegram.botToken) ? savedTelegram.botToken : '') ||
          (!isDummyTelegramToken(bestData.telegramConfig?.botToken) ? bestData.telegramConfig?.botToken : '') ||
          (!isDummyTelegramToken(process.env.TELEGRAM_BOT_TOKEN) ? process.env.TELEGRAM_BOT_TOKEN : '') ||
          ''
        ).trim(),
        chatId: (
          (!isDummyChatId(savedTelegram.chatId) ? savedTelegram.chatId : '') ||
          (!isDummyChatId(bestData.telegramConfig?.chatId) ? bestData.telegramConfig?.chatId : '') ||
          (!isDummyChatId(process.env.TELEGRAM_CHAT_ID) ? process.env.TELEGRAM_CHAT_ID : '') ||
          ''
        ).trim(),
      },
      antiWipeProtected: true,
      lastUpdated: bestData.lastUpdated || Date.now(),
    };

    // Remove demo placeholder courses if any
    if (Array.isArray(inMemoryDatabase.storeProducts)) {
      const demoVideoIds = new Set(['prod-video-lally-course-1', 'prod-video-dopamine-reset']);
      inMemoryDatabase.storeProducts = inMemoryDatabase.storeProducts.filter(
        (p) => !demoVideoIds.has(p.id)
      );
    }

    console.info(`[PersistentDB] Master database successfully restored from "${chosenFile}" (Score: ${bestScore}, ${inMemoryDatabase.habits.length} habits, ${(inMemoryDatabase.tasks || []).length} tasks, ${(inMemoryDatabase.customNovels || []).length} novels, ${(inMemoryDatabase.customMovies || []).length} movies).`);
  } else {
    const savedTelegram = getSavedTelegramConfigFromDisk();
    inMemoryDatabase = {
      ...defaultDatabase,
      telegramConfig: {
        ...defaultDatabase.telegramConfig,
        ...savedTelegram,
        botToken: (
          (!isDummyTelegramToken(savedTelegram.botToken) ? savedTelegram.botToken : '') ||
          (!isDummyTelegramToken(process.env.TELEGRAM_BOT_TOKEN) ? process.env.TELEGRAM_BOT_TOKEN : '') ||
          ''
        ).trim(),
        chatId: (
          (!isDummyChatId(savedTelegram.chatId) ? savedTelegram.chatId : '') ||
          (!isDummyChatId(process.env.TELEGRAM_CHAT_ID) ? process.env.TELEGRAM_CHAT_ID : '') ||
          ''
        ).trim(),
      },
    };
    console.info('[PersistentDB] No pre-existing active database found. Initializing persistent store with clean defaults.');
  }

  // Ensure all persistent directories exist according to active settings
  ensureDirectories();

  // Automatic media and novels scanning on server boot based on active store path
  try {
    const activeStoreDirs = getStoreDirectories();
    console.info(`[PersistentDB] Active store directory: ${activeStoreDirs.baseStoreDir}`);
    scanAllStoreDirectories();
  } catch (scanErr) {
    console.warn('[PersistentDB] Initial store scan error:', scanErr);
  }

  // Sync to primary DB_FILE, permanent Termux home and external mirrors immediately
  savePersistentDatabase();
  return inMemoryDatabase;
}

// Atomically save persistent database to disk across all permanent locations
export function savePersistentDatabase(options?: { force?: boolean }): boolean {
  try {
    ensureDirectories();
    inMemoryDatabase.lastUpdated = Date.now();
    inMemoryDatabase.antiWipeProtected = true;
    delete (inMemoryDatabase as any).isDefaultTemplate;

    const currentScore = computeDatabaseScore(inMemoryDatabase);

    // Anti-Wipe Safety: If in-memory state is empty (score <= 0) and !options?.force, do not wipe existing user data at permanent locations
    if (currentScore <= 0 && !options?.force) {
      if (fs.existsSync(GLOBAL_PERMANENT_DB)) {
        try {
          const raw = fs.readFileSync(GLOBAL_PERMANENT_DB, 'utf-8');
          const parsed = JSON.parse(raw);
          if (computeDatabaseScore(parsed) > 0) {
            console.warn(`[PersistentDB Anti-Wipe] Blocked overwriting permanent master DB (${GLOBAL_PERMANENT_DB}) with empty in-memory state.`);
            return false;
          }
        } catch {}
      }
    }
    
    const content = JSON.stringify(inMemoryDatabase, null, 2);

    // Save custom store storage path to all pointer files
    if (inMemoryDatabase.advancedSettings?.storeStoragePath) {
      saveStorePathToPointerFiles(inMemoryDatabase.advancedSettings.storeStoragePath);
    }

    // Save dedicated Telegram configuration to all pointer files
    if (inMemoryDatabase.telegramConfig) {
      saveTelegramConfigToDedicatedDisk(inMemoryDatabase.telegramConfig, options?.force);
    }

    // 1. Maintain rolling backup of current valid database before overwriting
    if (fs.existsSync(DB_FILE)) {
      try {
        const stats = fs.statSync(DB_FILE);
        if (stats.size > 20) {
          atomicWriteFileWithFsync(DB_BACKUP_FILE, content);
        }
      } catch (backupErr) {
        console.warn('[PersistentDB] Could not create database.json.bak:', backupErr);
      }
    }

    // 2. Safe atomic write to primary DB_FILE inside project
    const writeSuccess = atomicWriteFileWithFsync(DB_FILE, content);

    // 3. Mirror write to Master Permanent Directory in Termux Home (Immune to project overwrites)
    if (GLOBAL_PERMANENT_DB) {
      try {
        atomicWriteFileWithFsync(GLOBAL_PERMANENT_DB, content);
      } catch {}
    }
    if (TERMUX_HOME_DB_FILE) {
      try {
        atomicWriteFileWithFsync(TERMUX_HOME_DB_FILE, content);
      } catch {}
    }
    if (CONFIG_DIR_DB_FILE) {
      try {
        atomicWriteFileWithFsync(CONFIG_DIR_DB_FILE, content);
      } catch {}
    }

    // 4. Mirror write to Android SD Card & shared storage (Immune to Termux uninstall/reinstall)
    try {
      if (fs.existsSync('/sdcard')) {
        atomicWriteFileWithFsync(SDCARD_MASTER_DB, content);
      }
    } catch {}
    try {
      if (fs.existsSync('/storage/emulated/0')) {
        atomicWriteFileWithFsync(STORAGE_EMULATED_MASTER_DB, content);
      }
    } catch {}

    // 5. Mirror write to CWD data dir if CWD is different from PROJECT_ROOT
    if (CWD_DB_FILE && CWD_DB_FILE !== DB_FILE) {
      try {
        atomicWriteFileWithFsync(CWD_DB_FILE, content);
      } catch {}
    }

    // 6. Mirror write inside active store directory for external SD/storage resiliency
    try {
      const { baseStoreDir } = getStoreDirectories();
      if (baseStoreDir && fs.existsSync(baseStoreDir)) {
        const storeMirrorFile = path.join(baseStoreDir, 'database_mirror.json');
        const storePrimaryFile = path.join(baseStoreDir, 'lally_database.json');
        atomicWriteFileWithFsync(storeMirrorFile, content);
        atomicWriteFileWithFsync(storePrimaryFile, content);
      }
    } catch {}

    // 7. Write store catalog to separate file for easy modular access
    const { baseStoreDir } = getStoreDirectories();
    const catalogData = {
      version: '1.0.0',
      lastUpdated: inMemoryDatabase.lastUpdated,
      storeDirectories: {
        novels: './novels',
        movies: './movies',
        media: './media',
      },
      products: inMemoryDatabase.storeProducts || [],
      customNovelsCount: (inMemoryDatabase.customNovels || []).length,
    };
    try {
      if (fs.existsSync(baseStoreDir)) {
        atomicWriteFileWithFsync(path.join(baseStoreDir, 'catalog.json'), JSON.stringify(catalogData, null, 2));
      }
    } catch {}

    return writeSuccess;
  } catch (err) {
    console.error('[PersistentDB] Failed to save persistent database:', err);
    return false;
  }
}

// Immediately flush all in-memory data to persistent disk storage
export function flushAllDataToDiskNow(): boolean {
  return savePersistentDatabase();
}

// Create an automated local backup snapshot
export function createLocalBackupSnapshot(tag: string = 'manual'): string {
  try {
    ensureDirectories();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${tag}_${dateStr}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(inMemoryDatabase, null, 2), 'utf-8');
    
    // Clean up old backups (keep last 15)
    try {
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
          name: f,
          path: path.join(BACKUPS_DIR, f),
          time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 15) {
        for (const file of files.slice(15)) {
          fs.unlinkSync(file.path);
        }
      }
    } catch {}

    return filename;
  } catch (err) {
    console.error('[PersistentDB] Failed to create backup snapshot:', err);
    return '';
  }
}

// Get the current database
export function getPersistentDatabase(): PersistentDatabaseSchema {
  return inMemoryDatabase;
}

// Anti-Wipe Sync Algorithm
export function syncFullClientPayload(payload: {
  habits?: any[];
  tasks?: any[];
  deletedHabitIds?: string[];
  deletedTaskIds?: string[];
  wallet?: any;
  customNovels?: any[];
  customMovies?: any[];
  customPlaylists?: any[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  advancedSettings?: any;
  aiConfig?: any;
  telegramConfig?: any;
  language?: string;
  theme?: string;
  clientHydrated?: boolean; // True when client has hydrated from server and makes legitimate edits
  forceWipe?: boolean; // Only true when user explicitly executes "Reset All Data"
}): {
  success: boolean;
  database: PersistentDatabaseSchema;
  wasWipePrevented: boolean;
  message?: string;
} {
  let wasWipePrevented = false;

  // Track deleted habit and task IDs so deletions propagate cleanly across bot and web
  if (Array.isArray(payload.deletedHabitIds)) {
    if (payload.forceWipe) {
      inMemoryDatabase.deletedHabitIds = payload.deletedHabitIds;
    } else {
      const existing = inMemoryDatabase.deletedHabitIds || [];
      inMemoryDatabase.deletedHabitIds = Array.from(new Set([...existing, ...payload.deletedHabitIds]));
    }
  }

  if (Array.isArray(payload.deletedTaskIds)) {
    if (payload.forceWipe) {
      inMemoryDatabase.deletedTaskIds = payload.deletedTaskIds;
    } else {
      const existing = inMemoryDatabase.deletedTaskIds || [];
      inMemoryDatabase.deletedTaskIds = Array.from(new Set([...existing, ...payload.deletedTaskIds]));
    }
  }

  const deletedHabitSet = new Set(
    Array.isArray(payload.deletedHabitIds)
      ? payload.deletedHabitIds
      : (inMemoryDatabase.deletedHabitIds || [])
  );
  const deletedTaskSet = new Set(
    Array.isArray(payload.deletedTaskIds)
      ? payload.deletedTaskIds
      : (inMemoryDatabase.deletedTaskIds || [])
  );

  // 1. Habit anti-wipe and intelligent merge (preserves bot habits and web habits):
  if (Array.isArray(payload.habits)) {
    if (payload.forceWipe) {
      inMemoryDatabase.habits = payload.habits;
    } else {
      const existingHabits = Array.isArray(inMemoryDatabase.habits) ? inMemoryDatabase.habits : [];
      const incomingHabits = payload.habits;

      if (incomingHabits.length === 0 && existingHabits.length > 0 && !payload.clientHydrated) {
        console.warn('[PersistentDB Anti-Wipe] Incoming empty habits rejected to prevent wipe; keeping server habits.');
        wasWipePrevented = true;
      } else {
        const habitMap = new Map<string, any>();
        // Populate with existing server habits first (which includes habits added via Telegram bot)
        existingHabits.forEach((h) => {
          if (h && h.id && !deletedHabitSet.has(h.id)) {
            habitMap.set(h.id, h);
          }
        });

        // Merge incoming client habits intelligently
        incomingHabits.forEach((inc) => {
          if (!inc || !inc.id || deletedHabitSet.has(inc.id)) return;
          const exist = habitMap.get(inc.id);
          if (!exist) {
            habitMap.set(inc.id, inc);
          } else {
            habitMap.set(inc.id, {
              ...exist,
              ...inc,
              history: {
                ...(exist.history || {}),
                ...(inc.history || {}),
              },
              claimedRewardDates: {
                ...(exist.claimedRewardDates || {}),
                ...(inc.claimedRewardDates || {}),
              },
              completedTimestamps: {
                ...(exist.completedTimestamps || {}),
                ...(inc.completedTimestamps || {}),
              },
              completionTimes: {
                ...(exist.completionTimes || {}),
                ...(inc.completionTimes || {}),
              },
              focusHistory: {
                ...(exist.focusHistory || {}),
                ...(inc.focusHistory || {}),
              },
              totalFocusMinutes: Math.max(exist.totalFocusMinutes || 0, inc.totalFocusMinutes || 0),
              focusSessionsCount: Math.max(exist.focusSessionsCount || 0, inc.focusSessionsCount || 0),
            });
          }
        });

        inMemoryDatabase.habits = Array.from(habitMap.values());
      }
    }
  }

  // 2. Task anti-wipe and intelligent merge (preserves bot tasks and web tasks):
  if (Array.isArray(payload.tasks)) {
    if (payload.forceWipe) {
      inMemoryDatabase.tasks = payload.tasks;
    } else {
      const existingTasks = Array.isArray(inMemoryDatabase.tasks) ? inMemoryDatabase.tasks : [];
      const incomingTasks = payload.tasks;

      if (incomingTasks.length === 0 && existingTasks.length > 0 && !payload.clientHydrated) {
        console.warn('[PersistentDB Anti-Wipe] Incoming empty tasks rejected to prevent wipe; keeping server tasks.');
        wasWipePrevented = true;
      } else {
        const taskMap = new Map<string, any>();
        // Populate with existing server tasks first (which includes tasks added via Telegram bot)
        existingTasks.forEach((t) => {
          if (t && t.id && !deletedTaskSet.has(t.id)) {
            taskMap.set(t.id, t);
          }
        });

        // Merge incoming client tasks intelligently
        incomingTasks.forEach((inc) => {
          if (!inc || !inc.id || deletedTaskSet.has(inc.id)) return;
          const exist = taskMap.get(inc.id);
          if (!exist) {
            taskMap.set(inc.id, inc);
          } else {
            const mergedSubtasksMap = new Map<string, any>();
            (exist.subtasks || []).forEach((st: any) => st?.id && mergedSubtasksMap.set(st.id, st));
            (inc.subtasks || []).forEach((st: any) => {
              if (st?.id) {
                const existSt = mergedSubtasksMap.get(st.id);
                mergedSubtasksMap.set(st.id, existSt ? { ...existSt, ...st, completed: st.completed || existSt.completed } : st);
              }
            });

            taskMap.set(inc.id, {
              ...exist,
              ...inc,
              completed: Boolean(inc.completed || exist.completed),
              subtasks: Array.from(mergedSubtasksMap.values()),
            });
          }
        });

        inMemoryDatabase.tasks = Array.from(taskMap.values());
      }
    }
  }

  // 3. Wallet anti-wipe protection:
  if (payload.wallet && typeof payload.wallet === 'object') {
    const sanitizedIncoming = sanitizeServerWallet(payload.wallet);
    const existingWallet = inMemoryDatabase.wallet || {
      coins: 50,
      totalCoinsEarned: 50,
      totalCoinsSpent: 0,
      unlockedNovelIds: [],
      unlockedMovieIds: [],
      unlockedEpisodeIds: [],
      unlockedChapterIds: [],
      readingProgress: {},
      transactions: [],
    };

    // Union of unlocked items so purchases made in any session/bot are permanently preserved
    const mergedUnlockedNovels = Array.from(new Set([
      ...(existingWallet.unlockedNovelIds || []),
      ...(sanitizedIncoming.unlockedNovelIds || []),
    ]));
    const mergedUnlockedMovies = Array.from(new Set([
      ...(existingWallet.unlockedMovieIds || []),
      ...(sanitizedIncoming.unlockedMovieIds || []),
    ]));
    const mergedUnlockedEpisodes = Array.from(new Set([
      ...(existingWallet.unlockedEpisodeIds || []),
      ...(sanitizedIncoming.unlockedEpisodeIds || []),
    ]));
    const mergedUnlockedChapters = Array.from(new Set([
      ...(existingWallet.unlockedChapterIds || []),
      ...(sanitizedIncoming.unlockedChapterIds || []),
    ]));
    const mergedReadingProgress = {
      ...(existingWallet.readingProgress || {}),
      ...(sanitizedIncoming.readingProgress || {}),
    };

    let finalCoins = sanitizedIncoming.coins;
    let finalEarned = sanitizedIncoming.totalCoinsEarned;
    let finalSpent = Math.max(existingWallet.totalCoinsSpent || 0, sanitizedIncoming.totalCoinsSpent || 0);
    let finalTransactions = sanitizedIncoming.transactions || [];

    if (!payload.forceWipe) {
      if (
        (existingWallet.coins || 0) > (sanitizedIncoming.coins || 0) &&
        (sanitizedIncoming.transactions || []).length === 0 &&
        (existingWallet.transactions || []).length > 0 &&
        (sanitizedIncoming.unlockedNovelIds || []).length === 0 &&
        (sanitizedIncoming.unlockedMovieIds || []).length === 0
      ) {
        finalCoins = existingWallet.coins;
        finalEarned = Math.max(existingWallet.totalCoinsEarned || 0, finalEarned);
        finalTransactions = existingWallet.transactions;
        wasWipePrevented = true;
      } else {
        // Merge transactions by ID without duplicates
        const txMap = new Map<string, any>();
        (existingWallet.transactions || []).forEach((tx) => tx?.id && txMap.set(tx.id, tx));
        (sanitizedIncoming.transactions || []).forEach((tx) => tx?.id && txMap.set(tx.id, tx));
        finalTransactions = Array.from(txMap.values())
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, 50);
        finalCoins = Math.max(0, sanitizedIncoming.coins);
        finalEarned = Math.max(existingWallet.totalCoinsEarned || 0, sanitizedIncoming.totalCoinsEarned || 0, finalCoins + finalSpent);
      }
    }

    if (payload.forceWipe) {
      inMemoryDatabase.wallet = sanitizedIncoming;
    } else {
      inMemoryDatabase.wallet = {
        ...existingWallet,
        coins: finalCoins,
        totalCoinsEarned: finalEarned,
        totalCoinsSpent: finalSpent,
        unlockedNovelIds: mergedUnlockedNovels,
        unlockedMovieIds: mergedUnlockedMovies,
        unlockedEpisodeIds: mergedUnlockedEpisodes,
        unlockedChapterIds: mergedUnlockedChapters,
        readingProgress: mergedReadingProgress,
        transactions: finalTransactions,
      };
    }
  }

  // 3.5. Update advanced settings (preserving storeStoragePath and existing config if incoming is missing)
  if (payload.advancedSettings && typeof payload.advancedSettings === 'object') {
    const existingStorePath = inMemoryDatabase.advancedSettings?.storeStoragePath;
    const incomingStorePath = payload.advancedSettings.storeStoragePath;
    const resolvedStorePath = incomingStorePath !== undefined && incomingStorePath !== '' 
      ? incomingStorePath 
      : (existingStorePath || '');
    
    inMemoryDatabase.advancedSettings = {
      ...inMemoryDatabase.advancedSettings,
      ...payload.advancedSettings,
      storeStoragePath: resolvedStorePath,
    };

    if (resolvedStorePath) {
      saveStorePathToPointerFiles(resolvedStorePath);
      ensureDirectories();
    }
  }

  // 4. Custom novels smart merge & anti-wipe protection:
  if (Array.isArray(payload.customNovels)) {
    if (payload.forceWipe) {
      inMemoryDatabase.customNovels = payload.customNovels;
    } else {
      const existingNovels = Array.isArray(inMemoryDatabase.customNovels) ? inMemoryDatabase.customNovels : [];
      const incomingNovels = payload.customNovels;
      const deletedNovelSet = new Set(Array.isArray((payload as any).deletedNovelIds) ? (payload as any).deletedNovelIds : (inMemoryDatabase.deletedNovelIds || []));

      if (incomingNovels.length === 0 && existingNovels.length > 0 && !payload.clientHydrated) {
        console.warn('[PersistentDB Anti-Wipe] Incoming empty novels rejected to prevent wipe; keeping server novels.');
        wasWipePrevented = true;
      } else {
        const novelMap = new Map<string, any>();
        
        // Populate with existing server novels first
        existingNovels.forEach((n) => {
          if (n && n.id && !deletedNovelSet.has(n.id)) {
            novelMap.set(n.id, n);
          }
        });

        // Merge incoming novels intelligently
        incomingNovels.forEach((inc) => {
          if (!inc || !inc.id || deletedNovelSet.has(inc.id)) return;
          const exist = novelMap.get(inc.id);
          if (!exist) {
            novelMap.set(inc.id, inc);
          } else {
            // Intelligent chapter merge: never overwrite translated chapters with untranslated or shorter chapters
            const existChapters = Array.isArray(exist.chapters) ? exist.chapters : [];
            const incChapters = Array.isArray(inc.chapters) ? inc.chapters : [];
            
            const mergedChaptersMap = new Map<string | number, any>();
            existChapters.forEach((ch: any, idx: number) => {
              const key = ch.id || ch.chapterNumber || idx;
              mergedChaptersMap.set(key, ch);
            });

            incChapters.forEach((incCh: any, idx: number) => {
              const key = incCh.id || incCh.chapterNumber || idx;
              const existCh = mergedChaptersMap.get(key);
              if (!existCh) {
                mergedChaptersMap.set(key, incCh);
              } else {
                // Keep the chapter with more content / translated state
                const existLen = (existCh.content || '').trim().length;
                const incLen = (incCh.content || '').trim().length;
                if (incLen > existLen || (incCh.isTranslated && !existCh.isTranslated)) {
                  mergedChaptersMap.set(key, {
                    ...existCh,
                    ...incCh,
                  });
                }
              }
            });

            const mergedChapters = Array.from(mergedChaptersMap.values()).sort((a: any, b: any) => {
              const aNum = typeof a.chapterNumber === 'number' ? a.chapterNumber : 0;
              const bNum = typeof b.chapterNumber === 'number' ? b.chapterNumber : 0;
              return aNum - bNum;
            });

            novelMap.set(inc.id, {
              ...exist,
              ...inc,
              chapters: mergedChapters.length > 0 ? mergedChapters : (exist.chapters || inc.chapters || []),
            });
          }
        });

        inMemoryDatabase.customNovels = Array.from(novelMap.values()).map((n: any) =>
          sanitizeServerNovel(n, payload.language || inMemoryDatabase.language || 'fa')
        );

        // Auto-export all custom novels to their dedicated folders in novels/
        for (const n of inMemoryDatabase.customNovels) {
          if (n && n.id) {
            exportNovelToDiskFolder(n);
          }
        }
      }
    }
  }

  // 5. Custom movies & series protection:
  if (Array.isArray((payload as any).customMovies)) {
    if (payload.forceWipe) {
      inMemoryDatabase.customMovies = (payload as any).customMovies;
    } else {
      const existingMovies = Array.isArray(inMemoryDatabase.customMovies) ? inMemoryDatabase.customMovies : [];
      const incomingMovies = (payload as any).customMovies;
      const deletedMovieSet = new Set(Array.isArray((payload as any).deletedMovieIds) ? (payload as any).deletedMovieIds : (inMemoryDatabase.deletedMovieIds || []));

      if (incomingMovies.length === 0 && existingMovies.length > 0 && !payload.clientHydrated) {
        console.warn('[PersistentDB Anti-Wipe] Incoming empty movies rejected to prevent wipe; keeping server movies.');
        wasWipePrevented = true;
      } else {
        const movieMap = new Map<string, any>();
        existingMovies.forEach((m) => m?.id && !deletedMovieSet.has(m.id) && movieMap.set(m.id, m));
        incomingMovies.forEach((m: any) => m?.id && !deletedMovieSet.has(m.id) && movieMap.set(m.id, { ...(movieMap.get(m.id) || {}), ...m }));
        inMemoryDatabase.customMovies = Array.from(movieMap.values());

        // Auto-export all custom movies to their dedicated folders in movies/
        for (const m of inMemoryDatabase.customMovies) {
          if (m && m.id) {
            exportMovieToDiskFolder(m);
          }
        }
      }
    }
  }

  // 6. Custom playlists protection:
  if (Array.isArray((payload as any).customPlaylists)) {
    if (payload.forceWipe) {
      inMemoryDatabase.customPlaylists = (payload as any).customPlaylists;
    } else {
      const existingPlaylists = Array.isArray(inMemoryDatabase.customPlaylists) ? inMemoryDatabase.customPlaylists : [];
      const incomingPlaylists = (payload as any).customPlaylists;
      const deletedPlaylistSet = new Set(Array.isArray((payload as any).deletedPlaylistIds) ? (payload as any).deletedPlaylistIds : (inMemoryDatabase.deletedPlaylistIds || []));

      if (incomingPlaylists.length === 0 && existingPlaylists.length > 0 && !payload.clientHydrated) {
        console.warn('[PersistentDB Anti-Wipe] Incoming empty playlists rejected to prevent wipe; keeping server playlists.');
        wasWipePrevented = true;
      } else {
        const playlistMap = new Map<string, any>();
        existingPlaylists.forEach((p) => p?.id && !deletedPlaylistSet.has(p.id) && playlistMap.set(p.id, p));
        incomingPlaylists.forEach((p: any) => p?.id && !deletedPlaylistSet.has(p.id) && playlistMap.set(p.id, { ...(playlistMap.get(p.id) || {}), ...p }));
        inMemoryDatabase.customPlaylists = Array.from(playlistMap.values());
      }
    }
  }

  // Update deletedMovieIds
  if (Array.isArray((payload as any).deletedMovieIds)) {
    if (payload.forceWipe) {
      inMemoryDatabase.deletedMovieIds = (payload as any).deletedMovieIds;
    } else {
      const existing = inMemoryDatabase.deletedMovieIds || [];
      inMemoryDatabase.deletedMovieIds = Array.from(new Set([...existing, ...(payload as any).deletedMovieIds]));
    }
  }

  // Update deletedPlaylistIds
  if (Array.isArray((payload as any).deletedPlaylistIds)) {
    if (payload.forceWipe) {
      inMemoryDatabase.deletedPlaylistIds = (payload as any).deletedPlaylistIds;
    } else {
      const existing = inMemoryDatabase.deletedPlaylistIds || [];
      inMemoryDatabase.deletedPlaylistIds = Array.from(new Set([...existing, ...(payload as any).deletedPlaylistIds]));
    }
  }

  // Update deletedNovelIds
  if (Array.isArray((payload as any).deletedNovelIds)) {
    if (payload.forceWipe) {
      inMemoryDatabase.deletedNovelIds = (payload as any).deletedNovelIds;
    } else {
      const existing = inMemoryDatabase.deletedNovelIds || [];
      inMemoryDatabase.deletedNovelIds = Array.from(new Set([...existing, ...(payload as any).deletedNovelIds]));
    }
  }

  // Update Telegram config with strict anti-wipe protection
  if (payload.telegramConfig && typeof payload.telegramConfig === 'object') {
    const existingTg = inMemoryDatabase.telegramConfig || { botToken: '', chatId: '' };
    const incomingTg = payload.telegramConfig;

    const envBotToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const envChatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

    // Anti-wipe: if not forceWipe, an empty string ("") MUST NOT wipe out an existing valid botToken or chatId
    const incomingBotToken = typeof incomingTg.botToken === 'string' ? incomingTg.botToken.trim() : undefined;
    const incomingChatId = typeof incomingTg.chatId === 'string' ? incomingTg.chatId.trim() : undefined;
    const incomingBackupToken = typeof incomingTg.backupBotToken === 'string' ? incomingTg.backupBotToken.trim() : undefined;
    const incomingBackupChatId = typeof incomingTg.backupChatId === 'string' ? incomingTg.backupChatId.trim() : undefined;

    let finalBotToken = (existingTg.botToken || envBotToken || '').trim();
    if (incomingBotToken !== undefined) {
      if (incomingBotToken !== '' || payload.forceWipe) {
        finalBotToken = incomingBotToken;
      }
    }

    let finalChatId = (existingTg.chatId || envChatId || '').trim();
    if (incomingChatId !== undefined) {
      if (incomingChatId !== '' || payload.forceWipe) {
        finalChatId = incomingChatId;
      }
    }

    let finalBackupBotToken = (existingTg.backupBotToken || '').trim();
    if (incomingBackupToken !== undefined) {
      if (incomingBackupToken !== '' || payload.forceWipe) {
        finalBackupBotToken = incomingBackupToken;
      }
    }

    let finalBackupChatId = (existingTg.backupChatId || '').trim();
    if (incomingBackupChatId !== undefined) {
      if (incomingBackupChatId !== '' || payload.forceWipe) {
        finalBackupChatId = incomingBackupChatId;
      }
    }

    inMemoryDatabase.telegramConfig = {
      ...existingTg,
      ...incomingTg,
      botToken: finalBotToken,
      chatId: finalChatId,
      backupBotToken: finalBackupBotToken,
      backupChatId: finalBackupChatId,
      backupEncryptionPassword: incomingTg.backupEncryptionPassword !== undefined && incomingTg.backupEncryptionPassword !== ''
        ? incomingTg.backupEncryptionPassword
        : (existingTg.backupEncryptionPassword || ''),
    };
  }

  if (payload.language) inMemoryDatabase.language = payload.language;
  if (payload.theme) inMemoryDatabase.theme = payload.theme;

  savePersistentDatabase();

  return {
    success: true,
    database: inMemoryDatabase,
    wasWipePrevented,
    message: wasWipePrevented 
      ? 'مکانیزم محافظتی پایگاه داده فعال شد و از پاک شدن اطلاعات شما جلوگیری به عمل آمد.' 
      : 'اطلاعات با موفقیت روی حافظه پایدار سرور ذخیره شد.',
  };
}

/**
 * Permanently delete a movie or series from persistent server database
 * AND physically delete all associated video/media files on disk to free up storage space.
 */
export function deleteMovieFromPersistentStorage(movieId: string): {
  success: boolean;
  freedBytes: number;
  formattedFreedBytes: string;
  deletedFiles: string[];
  movieTitle?: string;
  remainingMoviesCount: number;
} {
  ensureDirectories();
  let freedBytes = 0;
  const deletedFiles: string[] = [];
  let targetMovieTitle = '';

  // 1. Locate movie in customMovies
  const initialMoviesCount = (inMemoryDatabase.customMovies || []).length;
  const foundMovie = (inMemoryDatabase.customMovies || []).find((m: any) => m.id === movieId);
  if (foundMovie) {
    targetMovieTitle = foundMovie.title || movieId;

    // Check size of embedded fileData
    if (foundMovie.fileData && typeof foundMovie.fileData === 'string') {
      freedBytes += Buffer.byteLength(foundMovie.fileData, 'utf-8');
    }

    // Check all episode embedded fileData
    if (Array.isArray(foundMovie.seasons)) {
      for (const s of foundMovie.seasons) {
        if (Array.isArray(s.episodes)) {
          for (const ep of s.episodes) {
            if (ep.fileData && typeof ep.fileData === 'string') {
              freedBytes += Buffer.byteLength(ep.fileData, 'utf-8');
            }
          }
        }
      }
    }
    if (Array.isArray(foundMovie.standaloneEpisodes)) {
      for (const ep of foundMovie.standaloneEpisodes) {
        if (ep.fileData && typeof ep.fileData === 'string') {
          freedBytes += Buffer.byteLength(ep.fileData, 'utf-8');
        }
      }
    }
  }

  // Also check storeProducts
  const foundStoreProd = (inMemoryDatabase.storeProducts || []).find((p) => p.id === movieId);
  if (foundStoreProd && !targetMovieTitle) {
    targetMovieTitle = foundStoreProd.title;
  }

  // 2. Scan and physically delete any associated files on server disk
  const { baseStoreDir, moviesDir, legacyVideosDir, mediaDir } = getStoreDirectories();
  const targetDirs = [moviesDir, legacyVideosDir, mediaDir, baseStoreDir].filter((d, i, arr) => d && fs.existsSync(d) && arr.indexOf(d) === i);
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        // Check if file is related to movieId or matching filename
        const isMatched = 
          file.includes(movieId) ||
          (foundMovie?.fileName && file === foundMovie.fileName) ||
          (foundStoreProd?.fileName && file === foundStoreProd.fileName);

        if (isMatched && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          try {
            const size = fs.statSync(fullPath).size;
            fs.unlinkSync(fullPath);
            freedBytes += size;
            deletedFiles.push(file);
            console.info(`[PersistentDB Storage] Deleted video/media file from disk: ${fullPath} (${size} bytes freed)`);
          } catch (delErr) {
            console.warn(`Failed to unlink file ${fullPath}:`, delErr);
          }
        }
      }
    } catch (readErr) {
      console.warn(`Failed to read directory ${dir} for cleanup:`, readErr);
    }
  }

  // 3. Remove movie from database customMovies
  if (Array.isArray(inMemoryDatabase.customMovies)) {
    inMemoryDatabase.customMovies = inMemoryDatabase.customMovies.filter((m: any) => m.id !== movieId);
  }

  // 4. Remove from storeProducts if present
  if (Array.isArray(inMemoryDatabase.storeProducts)) {
    inMemoryDatabase.storeProducts = inMemoryDatabase.storeProducts.filter((p) => p.id !== movieId);
  }

  // 5. Clean up playlists (remove movieId from itemIds)
  if (Array.isArray(inMemoryDatabase.customPlaylists)) {
    inMemoryDatabase.customPlaylists = inMemoryDatabase.customPlaylists.map((pl: any) => {
      if (Array.isArray(pl.itemIds) && pl.itemIds.includes(movieId)) {
        return {
          ...pl,
          itemIds: pl.itemIds.filter((id: string) => id !== movieId),
        };
      }
      return pl;
    });
  }

  // 6. Track deleted movie ID to suppress default/preset movies
  if (!inMemoryDatabase.deletedMovieIds) {
    inMemoryDatabase.deletedMovieIds = [];
  }
  if (!inMemoryDatabase.deletedMovieIds.includes(movieId)) {
    inMemoryDatabase.deletedMovieIds.push(movieId);
  }

  // 7. Save updated database to disk
  savePersistentDatabase();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  console.info(`[PersistentDB Storage] Movie "${targetMovieTitle || movieId}" deleted from server. Freed ~${formatSize(freedBytes)} of disk/database space.`);

  return {
    success: true,
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    deletedFiles,
    movieTitle: targetMovieTitle,
    remainingMoviesCount: (inMemoryDatabase.customMovies || []).length,
  };
}

/**
 * Scan server storage and remove orphan media files not attached to any product/movie/novel
 */
export function cleanupOrphanStoreFiles(): {
  freedBytes: number;
  formattedFreedBytes: string;
  cleanedFiles: string[];
} {
  ensureDirectories();
  let freedBytes = 0;
  const cleanedFiles: string[] = [];

  // Active referenced IDs & file names
  const activeIds = new Set<string>();
  const activeFileNames = new Set<string>();

  (inMemoryDatabase.customMovies || []).forEach((m: any) => {
    if (m.id) activeIds.add(m.id);
    if (m.fileName) activeFileNames.add(m.fileName);
    if (Array.isArray(m.seasons)) {
      m.seasons.forEach((s: any) => {
        (s.episodes || []).forEach((ep: any) => {
          if (ep.id) activeIds.add(ep.id);
          if (ep.fileName) activeFileNames.add(ep.fileName);
        });
      });
    }
  });

  (inMemoryDatabase.storeProducts || []).forEach((p) => {
    if (p.id) activeIds.add(p.id);
    if (p.fileName) activeFileNames.add(p.fileName);
  });

  (inMemoryDatabase.customNovels || []).forEach((n: any) => {
    if (n.id) activeIds.add(n.id);
  });

  const { moviesDir, legacyVideosDir, mediaDir } = getStoreDirectories();
  const checkDirs = [moviesDir, legacyVideosDir, mediaDir].filter((d, i, arr) => d && fs.existsSync(d) && arr.indexOf(d) === i);
  for (const dir of checkDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (!fs.statSync(fullPath).isFile()) continue;

        // If file starts with an ID that is no longer in activeIds, or is not in activeFileNames
        const isReferenced = 
          activeFileNames.has(file) || 
          Array.from(activeIds).some((id) => file.includes(id));

        if (!isReferenced) {
          try {
            const size = fs.statSync(fullPath).size;
            fs.unlinkSync(fullPath);
            freedBytes += size;
            cleanedFiles.push(file);
          } catch {}
        }
      }
    } catch {}
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    cleanedFiles,
  };
}

/**
 * Delete a specific season from a movie/series and delete all its episode media files from disk
 */
export function deleteSeasonFromPersistentStorage(movieId: string, seasonId: string): {
  success: boolean;
  freedBytes: number;
  formattedFreedBytes: string;
  seasonTitle?: string;
  remainingSeasonsCount: number;
  movie?: any;
} {
  ensureDirectories();
  let freedBytes = 0;
  let seasonTitle = '';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const movie = (inMemoryDatabase.customMovies || []).find((m: any) => m.id === movieId);
  if (!movie || !Array.isArray(movie.seasons)) {
    return {
      success: false,
      freedBytes: 0,
      formattedFreedBytes: '0 B',
      remainingSeasonsCount: 0,
    };
  }

  const targetSeason = movie.seasons.find((s: any) => s.id === seasonId);
  if (targetSeason) {
    seasonTitle = targetSeason.title || seasonId;
    const { moviesDir, legacyVideosDir, mediaDir } = getStoreDirectories();
    const targetDirs = [moviesDir, legacyVideosDir, mediaDir].filter((d, i, arr) => d && fs.existsSync(d) && arr.indexOf(d) === i);

    // Check each episode in this season and remove video files
    if (Array.isArray(targetSeason.episodes)) {
      for (const ep of targetSeason.episodes) {
        if (ep.fileData && typeof ep.fileData === 'string') {
          freedBytes += Buffer.byteLength(ep.fileData, 'utf-8');
        }
        for (const dir of targetDirs) {
          if (!fs.existsSync(dir)) continue;
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const fullPath = path.join(dir, file);
              const isMatched = (ep.id && file.includes(ep.id)) || (ep.fileName && file === ep.fileName);
              if (isMatched && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                try {
                  const size = fs.statSync(fullPath).size;
                  fs.unlinkSync(fullPath);
                  freedBytes += size;
                  console.info(`[PersistentDB] Deleted season episode file: ${fullPath} (${size} bytes freed)`);
                } catch {}
              }
            }
          } catch {}
        }
      }
    }

    // Filter out season
    movie.seasons = movie.seasons.filter((s: any) => s.id !== seasonId);
    savePersistentDatabase();
  }

  return {
    success: true,
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    seasonTitle,
    remainingSeasonsCount: (movie.seasons || []).length,
    movie,
  };
}

/**
 * Delete a specific episode from a movie/series and wipe its video file from disk
 */
export function deleteEpisodeFromPersistentStorage(movieId: string, episodeId: string): {
  success: boolean;
  freedBytes: number;
  formattedFreedBytes: string;
  episodeTitle?: string;
  movie?: any;
} {
  ensureDirectories();
  let freedBytes = 0;
  let episodeTitle = '';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const movie = (inMemoryDatabase.customMovies || []).find((m: any) => m.id === movieId);
  if (!movie) {
    return {
      success: false,
      freedBytes: 0,
      formattedFreedBytes: '0 B',
    };
  }

  const { moviesDir, legacyVideosDir, mediaDir } = getStoreDirectories();
  const targetDirs = [moviesDir, legacyVideosDir, mediaDir].filter((d, i, arr) => d && fs.existsSync(d) && arr.indexOf(d) === i);

  // Helper to remove matching episode files
  const removeEpFiles = (ep: any) => {
    if (ep.fileData && typeof ep.fileData === 'string') {
      freedBytes += Buffer.byteLength(ep.fileData, 'utf-8');
    }
    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const isMatched = (ep.id && file.includes(ep.id)) || (ep.fileName && file === ep.fileName);
          if (isMatched && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            try {
              const size = fs.statSync(fullPath).size;
              fs.unlinkSync(fullPath);
              freedBytes += size;
              console.info(`[PersistentDB] Deleted episode file: ${fullPath} (${size} bytes freed)`);
            } catch {}
          }
        }
      } catch {}
    }
  };

  // Check in seasons
  if (Array.isArray(movie.seasons)) {
    for (const s of movie.seasons) {
      if (Array.isArray(s.episodes)) {
        const found = s.episodes.find((ep: any) => ep.id === episodeId);
        if (found) {
          episodeTitle = found.title || episodeId;
          removeEpFiles(found);
          s.episodes = s.episodes.filter((ep: any) => ep.id !== episodeId);
        }
      }
    }
  }

  // Check in standaloneEpisodes
  if (Array.isArray(movie.standaloneEpisodes)) {
    const found = movie.standaloneEpisodes.find((ep: any) => ep.id === episodeId);
    if (found) {
      if (!episodeTitle) episodeTitle = found.title || episodeId;
      removeEpFiles(found);
      movie.standaloneEpisodes = movie.standaloneEpisodes.filter((ep: any) => ep.id !== episodeId);
    }
  }

  savePersistentDatabase();

  return {
    success: true,
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    episodeTitle,
    movie,
  };
}

/**
 * Delete a playlist from database and optionally delete all its associated movies
 */
export function deletePlaylistFromPersistentStorage(playlistId: string, deleteMoviesToo: boolean = false): {
  success: boolean;
  freedBytes: number;
  formattedFreedBytes: string;
  deletedPlaylistTitle?: string;
} {
  ensureDirectories();
  let freedBytes = 0;
  let deletedPlaylistTitle = '';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const pl = (inMemoryDatabase.customPlaylists || []).find((p: any) => p.id === playlistId);
  if (pl) {
    deletedPlaylistTitle = pl.title || playlistId;
  }

  // If deleting movies too
  if (deleteMoviesToo) {
    const moviesToDelete = (inMemoryDatabase.customMovies || []).filter(
      (m: any) => m.playlistId === playlistId || (pl?.itemIds && pl.itemIds.includes(m.id))
    );
    for (const m of moviesToDelete) {
      const res = deleteMovieFromPersistentStorage(m.id);
      freedBytes += res.freedBytes;
    }
  } else {
    // Unlink playlistId from custom movies
    if (Array.isArray(inMemoryDatabase.customMovies)) {
      inMemoryDatabase.customMovies = inMemoryDatabase.customMovies.map((m: any) => {
        if (m.playlistId === playlistId) {
          const { playlistId: _, ...rest } = m;
          return rest;
        }
        return m;
      });
    }
  }

  // Remove playlist
  if (Array.isArray(inMemoryDatabase.customPlaylists)) {
    inMemoryDatabase.customPlaylists = inMemoryDatabase.customPlaylists.filter((p: any) => p.id !== playlistId);
  }

  // Track deleted playlist ID to suppress default/preset playlists
  if (!inMemoryDatabase.deletedPlaylistIds) {
    inMemoryDatabase.deletedPlaylistIds = [];
  }
  if (!inMemoryDatabase.deletedPlaylistIds.includes(playlistId)) {
    inMemoryDatabase.deletedPlaylistIds.push(playlistId);
  }

  savePersistentDatabase();

  return {
    success: true,
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    deletedPlaylistTitle,
  };
}

// Calculate storage statistics on disk
export function getStorageDiskStatistics() {
  ensureDirectories();
  const { baseStoreDir, moviesDir, legacyVideosDir, novelsDir, mediaDir } = getStoreDirectories();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  let dbSizeBytes = 0;
  try {
    if (fs.existsSync(DB_FILE)) {
      dbSizeBytes = fs.statSync(DB_FILE).size;
    }
  } catch {}

  let backupsCount = 0;
  let backupsSizeBytes = 0;
  const backupsList: Array<{ name: string; size: number; formattedSize: string; time: number; date: string }> = [];
  try {
    if (fs.existsSync(BACKUPS_DIR)) {
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      backupsCount = files.length;
      for (const f of files) {
        const fullPath = path.join(BACKUPS_DIR, f);
        try {
          const stat = fs.statSync(fullPath);
          backupsSizeBytes += stat.size;
          backupsList.push({
            name: f,
            size: stat.size,
            formattedSize: formatSize(stat.size),
            time: stat.mtimeMs,
            date: new Date(stat.mtimeMs).toISOString().split('T')[0],
          });
        } catch {}
      }
      backupsList.sort((a, b) => b.time - a.time);
    }
  } catch {}

  let videoFilesCount = 0;
  let videoSizeBytes = 0;
  const videoFolders: Array<{ name: string; isDirectory: boolean; count: number; size: number; formattedSize: string }> = [];
  
  const countSubDir = (dir: string): { count: number; bytes: number } => {
    let count = 0;
    let bytes = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const sub = countSubDir(full);
          count += sub.count;
          bytes += sub.bytes;
        } else {
          count++;
          try { bytes += fs.statSync(full).size; } catch {}
        }
      }
    } catch {}
    return { count, bytes };
  };

  const videoScanDirs = [moviesDir, legacyVideosDir].filter((d, idx, arr) => d && fs.existsSync(d) && arr.indexOf(d) === idx);
  for (const scanDir of videoScanDirs) {
    try {
      const entries = fs.readdirSync(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(scanDir, entry.name);
        if (entry.isDirectory()) {
          const res = countSubDir(full);
          videoFilesCount += res.count;
          videoSizeBytes += res.bytes;
          videoFolders.push({
            name: entry.name,
            isDirectory: true,
            count: res.count,
            size: res.bytes,
            formattedSize: formatSize(res.bytes),
          });
        } else {
          videoFilesCount++;
          let sz = 0;
          try { sz = fs.statSync(full).size; } catch {}
          videoSizeBytes += sz;
          videoFolders.push({
            name: entry.name,
            isDirectory: false,
            count: 1,
            size: sz,
            formattedSize: formatSize(sz),
          });
        }
      }
    } catch {}
  }
  videoFolders.sort((a, b) => b.size - a.size);

  let novelsFilesCount = 0;
  let novelsSizeBytes = 0;
  const novelsFolders: Array<{ name: string; isDirectory: boolean; count: number; size: number; formattedSize: string }> = [];
  try {
    if (fs.existsSync(novelsDir)) {
      const entries = fs.readdirSync(novelsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(novelsDir, entry.name);
        if (entry.isDirectory()) {
          let count = 0;
          let bytes = 0;
          try {
            const sub = fs.readdirSync(full);
            count = sub.length;
            for (const f of sub) {
              try { bytes += fs.statSync(path.join(full, f)).size; } catch {}
            }
          } catch {}
          novelsFilesCount += count;
          novelsSizeBytes += bytes;
          novelsFolders.push({
            name: entry.name,
            isDirectory: true,
            count,
            size: bytes,
            formattedSize: formatSize(bytes),
          });
        } else {
          novelsFilesCount++;
          let sz = 0;
          try { sz = fs.statSync(full).size; } catch {}
          novelsSizeBytes += sz;
          novelsFolders.push({
            name: entry.name,
            isDirectory: false,
            count: 1,
            size: sz,
            formattedSize: formatSize(sz),
          });
        }
      }
      novelsFolders.sort((a, b) => b.size - a.size);
    }
  } catch {}

  let mediaFilesCount = 0;
  let mediaSizeBytes = 0;
  try {
    if (fs.existsSync(mediaDir)) {
      const entries = fs.readdirSync(mediaDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(mediaDir, entry.name);
        if (!entry.isDirectory()) {
          mediaFilesCount++;
          try { mediaSizeBytes += fs.statSync(full).size; } catch {}
        }
      }
    }
  } catch {}

  const storeFilesCount = videoFilesCount + novelsFilesCount + mediaFilesCount;
  const storeSizeBytes = videoSizeBytes + novelsSizeBytes + mediaSizeBytes;
  const totalServerSizeBytes = dbSizeBytes + backupsSizeBytes + storeSizeBytes;

  const pendingMoviesCount = (inMemoryDatabase.customMovies || []).filter((m: any) => m.needsMetadataSetup).length;
  const pendingNovelsCount = (inMemoryDatabase.customNovels || []).filter((n: any) => n.needsMetadataSetup).length;

  return {
    isServerPersistent: true,
    antiWipeProtected: true,
    dataDir: DATA_DIR,
    dbPath: DB_FILE,
    storePath: baseStoreDir,
    moviesPath: moviesDir,
    videosPath: moviesDir,
    novelsPath: novelsDir,
    mediaPath: mediaDir,
    dbSizeBytes,
    formattedDbSize: formatSize(dbSizeBytes),
    totalServerSizeBytes,
    formattedTotalServerSize: formatSize(totalServerSizeBytes),
    habitsCount: (inMemoryDatabase.habits || []).length,
    tasksCount: (inMemoryDatabase.tasks || []).length,
    customNovelsCount: (inMemoryDatabase.customNovels || []).length,
    customMoviesCount: (inMemoryDatabase.customMovies || []).length,
    customPlaylistsCount: (inMemoryDatabase.customPlaylists || []).length,
    storeProductsCount: (inMemoryDatabase.storeProducts || []).length,
    pendingMetadataCount: pendingMoviesCount + pendingNovelsCount,
    pendingMoviesCount,
    pendingNovelsCount,
    backupsCount,
    backupsSizeBytes,
    formattedBackupsSize: formatSize(backupsSizeBytes),
    backupsList: backupsList.slice(0, 8),
    videoFilesCount,
    videoSizeBytes,
    formattedVideoSize: formatSize(videoSizeBytes),
    videoFolders: videoFolders.slice(0, 10),
    novelsFilesCount,
    novelsSizeBytes,
    formattedNovelSize: formatSize(novelsSizeBytes),
    novelsFolders: novelsFolders.slice(0, 10),
    mediaFilesCount,
    mediaSizeBytes,
    formattedMediaSize: formatSize(mediaSizeBytes),
    storeFilesCount,
    storeSizeBytes,
    formattedStoreSize: formatSize(storeSizeBytes),
    lastUpdated: inMemoryDatabase.lastUpdated,
    systemInfo: {
      isTermux: Boolean(process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    },
  };
}

/**
 * Restore database from local backup snapshot file in BACKUPS_DIR
 */
export function restoreFromLocalSnapshot(filename: string): {
  success: boolean;
  message?: string;
  error?: string;
  database?: any;
} {
  ensureDirectories();
  const safeFilename = path.basename(filename);
  const targetFile = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(targetFile)) {
    return { success: false, error: `فایل اسنپ‌شات یافت نشد: ${safeFilename}` };
  }

  try {
    const raw = fs.readFileSync(targetFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'محتوای فایل اسنپ‌شات معتبر نیست.' };
    }

    // Safety backup of current state before restoration
    createLocalBackupSnapshot('pre_restore_safety');

    // Restore into inMemoryDatabase
    if (Array.isArray(parsed.habits)) inMemoryDatabase.habits = parsed.habits;
    if (Array.isArray(parsed.tasks)) inMemoryDatabase.tasks = parsed.tasks;
    if (parsed.wallet && typeof parsed.wallet === 'object') inMemoryDatabase.wallet = sanitizeServerWallet(parsed.wallet);
    if (Array.isArray(parsed.customNovels)) inMemoryDatabase.customNovels = parsed.customNovels;
    if (Array.isArray(parsed.customMovies)) inMemoryDatabase.customMovies = parsed.customMovies;
    if (Array.isArray(parsed.customPlaylists)) inMemoryDatabase.customPlaylists = parsed.customPlaylists;
    if (Array.isArray(parsed.storeProducts)) inMemoryDatabase.storeProducts = parsed.storeProducts;
    if (parsed.advancedSettings) inMemoryDatabase.advancedSettings = { ...inMemoryDatabase.advancedSettings, ...parsed.advancedSettings };
    if (parsed.telegramConfig) inMemoryDatabase.telegramConfig = { ...inMemoryDatabase.telegramConfig, ...parsed.telegramConfig };

    savePersistentDatabase();
    return { 
      success: true, 
      message: `پایگاه داده با موفقیت از اسنپ‌شات «${safeFilename}» بازیابی گردید.`,
      database: inMemoryDatabase
    };
  } catch (err: any) {
    return { success: false, error: `خطا در بازیابی اسنپ‌شات: ${err.message}` };
  }
}

/**
 * Delete a backup snapshot file
 */
export function deleteLocalSnapshot(filename: string): { success: boolean; error?: string } {
  ensureDirectories();
  const safeFilename = path.basename(filename);
  const targetFile = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(targetFile)) {
    return { success: false, error: 'فایل مورد نظر در پوشه اسنپ‌شات‌ها یافت نشد.' };
  }

  try {
    fs.unlinkSync(targetFile);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Natural number extraction helper for ordering episodes and seasons correctly (e.g. Ep 2 before Ep 10)
 */
export function extractNaturalNumber(str: string, fallback: number = 1): number {
  if (!str) return fallback;
  // Look for episode/season patterns like "E01", "ep 2", "episode 3", "فصل 1", "قسمت 5", "s01e04", or standalone digits
  const epMatch = str.match(/(?:ep|episode|قسمت|پارت|part|e|s\d+e)[\s_-]*(\d+)/i);
  if (epMatch && epMatch[1]) {
    const num = parseInt(epMatch[1], 10);
    if (!isNaN(num)) return num;
  }

  const seasonMatch = str.match(/(?:season|فصل|s)[\s_-]*(\d+)/i);
  if (seasonMatch && seasonMatch[1]) {
    const num = parseInt(seasonMatch[1], 10);
    if (!isNaN(num)) return num;
  }

  const digits = str.match(/\d+/g);
  if (digits && digits.length > 0) {
    const lastNum = parseInt(digits[digits.length - 1], 10);
    if (!isNaN(lastNum)) return lastNum;
  }

  return fallback;
}

/**
 * Clean up filenames into human-readable titles
 */
export function sanitizeMediaTitle(fileNameOrDirName: string): string {
  if (!fileNameOrDirName) return '';
  return fileNameOrDirName
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[_.-]+/g, ' ')
    .trim();
}

export const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m4v', '.ts', '.3gp']);
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
export const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.json', '.html', '.epub']);

/**
 * Scan movies and videos folders.
 * Directory hierarchy:
 *   <store_path>/movies/ (and legacy videos/)
 *     ├── [Playlist / Series / Movie Folder]/
 *     │     ├── [Season Folder] (optional)/
 *     │     │     ├── episode_01.mp4
 *     │     │     └── episode_02.mp4
 *     │     ├── movie.mp4 (or standalone episodes)
 *     │     └── cover.jpg (optional)
 *     └── standalone_video.mp4
 */
export function scanStoreVideosDirectory(): {
  scannedPlaylists: any[];
  scannedMovies: any[];
  newItemsCount: number;
  updatedItemsCount: number;
  totalVideosFound: number;
} {
  ensureDirectories();
  const { moviesDir, legacyVideosDir } = getStoreDirectories();
  const scannedPlaylists: any[] = [];
  const scannedMovies: any[] = [];
  let totalVideosFound = 0;

  const scanSourceDirs = [moviesDir, legacyVideosDir].filter((d, idx, arr) => d && fs.existsSync(d) && arr.indexOf(d) === idx);
  if (scanSourceDirs.length === 0) {
    return { scannedPlaylists, scannedMovies, newItemsCount: 0, updatedItemsCount: 0, totalVideosFound: 0 };
  }

  const existingMoviesMap = new Map<string, any>();
  (inMemoryDatabase.customMovies || []).forEach((m: any) => {
    if (m.id) existingMoviesMap.set(m.id, m);
    if (m.title) existingMoviesMap.set(`title:${m.title.toLowerCase().trim()}`, m);
    if (m.diskFolderName) existingMoviesMap.set(`folder:${m.diskFolderName.toLowerCase().trim()}`, m);
  });

  const existingPlaylistsMap = new Map<string, any>();
  (inMemoryDatabase.customPlaylists || []).forEach((p: any) => {
    if (p.id) existingPlaylistsMap.set(p.id, p);
    if (p.title) existingPlaylistsMap.set(`title:${p.title.toLowerCase().trim()}`, p);
  });

  let newItemsCount = 0;
  let updatedItemsCount = 0;

  try {
    for (const scanDir of scanSourceDirs) {
      const isLegacy = scanDir === legacyVideosDir && scanDir !== moviesDir;
      const mediaPrefix = isLegacy ? 'videos' : 'movies';
      const rootEntries = fs.readdirSync(scanDir, { withFileTypes: true });

      for (const rootEntry of rootEntries) {
        if (rootEntry.name.startsWith('.')) continue;

        const fullPath = path.join(scanDir, rootEntry.name);

        if (rootEntry.isDirectory()) {
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          
          const childDirs = subEntries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
          const directVideoFiles = subEntries.filter(
            (e) => e.isFile() && VIDEO_EXTENSIONS.has(path.extname(e.name).toLowerCase())
          );
          const directCoverFile = subEntries.find(
            (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())
          );

          const folderTitle = sanitizeMediaTitle(rootEntry.name);
          const playlistId = `pl-folder-${rootEntry.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
          const movieId = `imported-${rootEntry.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

          const existingMovie = existingMoviesMap.get(movieId) || existingMoviesMap.get(`title:${folderTitle.toLowerCase()}`) || existingMoviesMap.get(`folder:${rootEntry.name.toLowerCase()}`);

          const isSeasonStructured = childDirs.some((d) => 
            /season|فصل|part|پارت|s\d+/i.test(d.name)
          );

          if (isSeasonStructured || (childDirs.length > 0 && directVideoFiles.length === 0)) {
            // Series / Anime with Seasons
            const seasons: any[] = [];
            const sortedSeasonDirs = [...childDirs].sort((a, b) => {
              return extractNaturalNumber(a.name, 1) - extractNaturalNumber(b.name, 1);
            });

            sortedSeasonDirs.forEach((sDir, idx) => {
              const seasonNumber = extractNaturalNumber(sDir.name, idx + 1);
              const seasonPath = path.join(fullPath, sDir.name);
              let seasonFiles: fs.Dirent[] = [];
              try {
                seasonFiles = fs.readdirSync(seasonPath, { withFileTypes: true });
              } catch {}
              
              const seasonVideoFiles = seasonFiles.filter(
                (f) => f.isFile() && VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase())
              );

              const sortedEpFiles = seasonVideoFiles.sort((a, b) => {
                return extractNaturalNumber(a.name, 1) - extractNaturalNumber(b.name, 1);
              });

              const defaultEpPrice = existingMovie?.pricePerEpisode !== undefined ? existingMovie.pricePerEpisode : 2;

              const episodes = sortedEpFiles.map((epFile, epIdx) => {
                totalVideosFound++;
                const epNum = extractNaturalNumber(epFile.name, epIdx + 1);
                const epTitle = sanitizeMediaTitle(epFile.name);
                let epSizeMb = '0.0';
                let epSizeMbNum = 0;
                try {
                  const epStat = fs.statSync(path.join(seasonPath, epFile.name));
                  epSizeMbNum = epStat.size / (1024 * 1024);
                  epSizeMb = epSizeMbNum.toFixed(1);
                } catch {}

                return {
                  id: `ep-${rootEntry.name}-${sDir.name}-${epNum}`,
                  episodeNumber: epNum,
                  title: epTitle || `قسمت ${epNum}`,
                  videoUrl: `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, sDir.name, epFile.name))}`,
                  fileName: epFile.name,
                  fileSize: `${epSizeMb} MB`,
                  quality: epSizeMbNum > 400 ? '4K Ultra HD' : epSizeMbNum > 100 ? '1080p Full HD' : '720p HD',
                  price: defaultEpPrice,
                  synopsis: `قسمت ${epNum} از پوشه ${sDir.name}`,
                };
              });

              seasons.push({
                id: `season-${rootEntry.name}-${seasonNumber}`,
                seasonNumber,
                title: sanitizeMediaTitle(sDir.name) || `فصل ${seasonNumber}`,
                description: `مجموعه قسمت‌های فصل ${seasonNumber}`,
                episodes,
              });
            });

            const totalEps = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
            const pricePerEp = existingMovie?.pricePerEpisode !== undefined ? existingMovie.pricePerEpisode : 2;
            const totalPrice = existingMovie?.price !== undefined ? existingMovie.price : (totalEps * pricePerEp);

            const isPendingSetup = existingMovie ? (existingMovie.needsMetadataSetup ?? (!existingMovie.hasBeenEditedOnce)) : true;

            const movieRecord: any = {
              id: existingMovie ? existingMovie.id : movieId,
              mediaType: existingMovie?.mediaType || (seasons.length > 1 ? 'series' : 'anime'),
              title: existingMovie?.title || folderTitle,
              originalTitle: existingMovie?.originalTitle || rootEntry.name,
              duration: `${seasons.length} فصل • ${totalEps} قسمت`,
              genre: existingMovie?.genre || 'انگیزشی / سریال',
              genres: existingMovie?.genres || ['انگیزشی', 'سریال'],
              synopsis: existingMovie?.synopsis || `این اثر مستقیماً از پوشه دیسک دستگاه (${rootEntry.name}) خوانده شده است. دارای ${seasons.length} فصل و ${totalEps} قسمت.`,
              motivationalTheme: existingMovie?.motivationalTheme || 'اراده، تلاش و پیشرفت مستمر',
              price: totalPrice,
              pricePerEpisode: pricePerEp,
              isPriceLocked: existingMovie ? (existingMovie.isPriceLocked ?? true) : true,
              hasSeasons: true,
              seasons,
              playlistId,
              playlistTitle: folderTitle,
              diskFolderName: rootEntry.name,
              coverUrl: directCoverFile ? `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, directCoverFile.name))}` : (existingMovie?.coverUrl || undefined),
              coverGradient: existingMovie?.coverGradient || 'from-indigo-950 via-slate-900 to-slate-950',
              uploadedAt: existingMovie?.uploadedAt || new Date().toISOString().split('T')[0],
              isDirectDiskImport: true,
              needsMetadataSetup: isPendingSetup,
              editAllowedOnce: existingMovie ? (existingMovie.editAllowedOnce ?? (!existingMovie.hasBeenEditedOnce)) : true,
              hasBeenEditedOnce: existingMovie ? (existingMovie.hasBeenEditedOnce ?? false) : false,
            };

            scannedMovies.push(movieRecord);

            // Ensure playlist object
            const existingPl = existingPlaylistsMap.get(playlistId) || existingPlaylistsMap.get(`title:${folderTitle.toLowerCase()}`);
            const playlistRecord = {
              id: existingPl ? existingPl.id : playlistId,
              title: existingPl?.title || folderTitle,
              description: existingPl?.description || `پلی‌لیست خودکار شناسایی‌شده از پوشه ${rootEntry.name}`,
              type: (movieRecord.mediaType as any) || 'series',
              coverGradient: movieRecord.coverGradient,
              itemIds: [movieRecord.id],
              createdAt: existingPl?.createdAt || new Date().toISOString().split('T')[0],
            };
            scannedPlaylists.push(playlistRecord);

            if (existingMovie) updatedItemsCount++; else newItemsCount++;

          } else if (directVideoFiles.length > 0) {
            // Standalone Movie or Single-Season Direct Videos
            if (directVideoFiles.length === 1) {
              const vid = directVideoFiles[0];
              totalVideosFound++;
              let sizeMb = '0.0';
              try {
                const vidStat = fs.statSync(path.join(fullPath, vid.name));
                sizeMb = (vidStat.size / (1024 * 1024)).toFixed(1);
              } catch {}

              const isPendingSetup = existingMovie ? (existingMovie.needsMetadataSetup ?? (!existingMovie.hasBeenEditedOnce)) : true;

              const movieRecord: any = {
                id: existingMovie ? existingMovie.id : movieId,
                mediaType: existingMovie?.mediaType || 'movie',
                title: existingMovie?.title || folderTitle,
                originalTitle: existingMovie?.originalTitle || rootEntry.name,
                duration: existingMovie?.duration || `${sizeMb} MB`,
                genre: existingMovie?.genre || 'انگیزشی / سینما',
                genres: existingMovie?.genres || ['انگیزشی', 'سینما'],
                synopsis: existingMovie?.synopsis || `فیلم شناسایی‌شده مستقیماً از پوشه دیسک دستگاه (${rootEntry.name}).`,
                price: existingMovie?.price !== undefined ? existingMovie.price : 12,
                isPriceLocked: existingMovie ? (existingMovie.isPriceLocked ?? true) : true,
                videoUrl: `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, vid.name))}`,
                fileName: vid.name,
                fileSize: `${sizeMb} MB`,
                playlistId,
                playlistTitle: folderTitle,
                diskFolderName: rootEntry.name,
                coverUrl: directCoverFile ? `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, directCoverFile.name))}` : (existingMovie?.coverUrl || undefined),
                coverGradient: existingMovie?.coverGradient || 'from-blue-950 via-slate-900 to-indigo-950',
                uploadedAt: existingMovie?.uploadedAt || new Date().toISOString().split('T')[0],
                hasSeasons: false,
                isDirectDiskImport: true,
                needsMetadataSetup: isPendingSetup,
                editAllowedOnce: existingMovie ? (existingMovie.editAllowedOnce ?? (!existingMovie.hasBeenEditedOnce)) : true,
                hasBeenEditedOnce: existingMovie ? (existingMovie.hasBeenEditedOnce ?? false) : false,
              };

              scannedMovies.push(movieRecord);

              const existingPl = existingPlaylistsMap.get(playlistId) || existingPlaylistsMap.get(`title:${folderTitle.toLowerCase()}`);
              const playlistRecord = {
                id: existingPl ? existingPl.id : playlistId,
                title: existingPl?.title || folderTitle,
                description: existingPl?.description || `پلی‌لیست شناسایی‌شده از پوشه ${rootEntry.name}`,
                type: 'movie' as any,
                coverGradient: movieRecord.coverGradient,
                itemIds: [movieRecord.id],
                createdAt: existingPl?.createdAt || new Date().toISOString().split('T')[0],
              };
              scannedPlaylists.push(playlistRecord);

              if (existingMovie) updatedItemsCount++; else newItemsCount++;

            } else {
              // Multiple direct video files in folder: treat as 1 Season sorted by natural episode number
              const sortedEpFiles = [...directVideoFiles].sort((a, b) => {
                return extractNaturalNumber(a.name, 1) - extractNaturalNumber(b.name, 1);
              });

              const defaultEpPrice = existingMovie?.pricePerEpisode !== undefined ? existingMovie.pricePerEpisode : 2;

              const episodes = sortedEpFiles.map((epFile, epIdx) => {
                totalVideosFound++;
                const epNum = extractNaturalNumber(epFile.name, epIdx + 1);
                const epTitle = sanitizeMediaTitle(epFile.name);
                let epSizeMb = '0.0';
                let epSizeMbNum = 0;
                try {
                  const epStat = fs.statSync(path.join(fullPath, epFile.name));
                  epSizeMbNum = epStat.size / (1024 * 1024);
                  epSizeMb = epSizeMbNum.toFixed(1);
                } catch {}

                return {
                  id: `ep-${rootEntry.name}-${epNum}`,
                  episodeNumber: epNum,
                  title: epTitle || `قسمت ${epNum}`,
                  videoUrl: `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, epFile.name))}`,
                  fileName: epFile.name,
                  fileSize: `${epSizeMb} MB`,
                  quality: epSizeMbNum > 400 ? '4K Ultra HD' : epSizeMbNum > 100 ? '1080p Full HD' : '720p HD',
                  price: defaultEpPrice,
                  synopsis: `فایل ویدیویی قسمت ${epNum}`,
                };
              });

              const seasons = [
                {
                  id: `season-${rootEntry.name}-1`,
                  seasonNumber: 1,
                  title: 'فصل اول',
                  description: 'مجموعه قسمت‌ها',
                  episodes,
                }
              ];

              const pricePerEp = existingMovie?.pricePerEpisode !== undefined ? existingMovie.pricePerEpisode : 2;
              const totalPrice = existingMovie?.price !== undefined ? existingMovie.price : (episodes.length * pricePerEp);
              const isPendingSetup = existingMovie ? (existingMovie.needsMetadataSetup ?? (!existingMovie.hasBeenEditedOnce)) : true;

              const movieRecord: any = {
                id: existingMovie ? existingMovie.id : movieId,
                mediaType: existingMovie?.mediaType || 'series',
                title: existingMovie?.title || folderTitle,
                originalTitle: existingMovie?.originalTitle || rootEntry.name,
                duration: `۱ فصل • ${episodes.length} قسمت`,
                genre: existingMovie?.genre || 'انگیزشی / سریال',
                genres: existingMovie?.genres || ['انگیزشی', 'سریال'],
                synopsis: existingMovie?.synopsis || `این اثر شامل ${episodes.length} قسمت است که از پوشه دیسک (${rootEntry.name}) شناسایی شده‌اند.`,
                price: totalPrice,
                pricePerEpisode: pricePerEp,
                isPriceLocked: existingMovie ? (existingMovie.isPriceLocked ?? true) : true,
                hasSeasons: true,
                seasons,
                playlistId,
                playlistTitle: folderTitle,
                diskFolderName: rootEntry.name,
                coverUrl: directCoverFile ? `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name, directCoverFile.name))}` : (existingMovie?.coverUrl || undefined),
                coverGradient: existingMovie?.coverGradient || 'from-purple-950 via-slate-900 to-slate-950',
                uploadedAt: existingMovie?.uploadedAt || new Date().toISOString().split('T')[0],
                isDirectDiskImport: true,
                needsMetadataSetup: isPendingSetup,
                editAllowedOnce: existingMovie ? (existingMovie.editAllowedOnce ?? (!existingMovie.hasBeenEditedOnce)) : true,
                hasBeenEditedOnce: existingMovie ? (existingMovie.hasBeenEditedOnce ?? false) : false,
              };

              scannedMovies.push(movieRecord);

              const existingPl = existingPlaylistsMap.get(playlistId) || existingPlaylistsMap.get(`title:${folderTitle.toLowerCase()}`);
              const playlistRecord = {
                id: existingPl ? existingPl.id : playlistId,
                title: existingPl?.title || folderTitle,
                description: existingPl?.description || `پلی‌لیست شناسایی‌شده از پوشه ${rootEntry.name}`,
                type: 'series' as any,
                coverGradient: movieRecord.coverGradient,
                itemIds: [movieRecord.id],
                createdAt: existingPl?.createdAt || new Date().toISOString().split('T')[0],
              };
              scannedPlaylists.push(playlistRecord);

              if (existingMovie) updatedItemsCount++; else newItemsCount++;
            }
          }

        } else if (rootEntry.isFile() && VIDEO_EXTENSIONS.has(path.extname(rootEntry.name).toLowerCase())) {
          // Direct video file in root of movies folder
          totalVideosFound++;
          let sizeMb = '0.0';
          try {
            const vidStat = fs.statSync(fullPath);
            sizeMb = (vidStat.size / (1024 * 1024)).toFixed(1);
          } catch {}
          const cleanTitle = sanitizeMediaTitle(rootEntry.name);
          const movieId = `imported-root-${rootEntry.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
          const existingMovie = existingMoviesMap.get(movieId) || existingMoviesMap.get(`title:${cleanTitle.toLowerCase()}`);

          const isPendingSetup = existingMovie ? (existingMovie.needsMetadataSetup ?? (!existingMovie.hasBeenEditedOnce)) : true;

          const movieRecord: any = {
            id: existingMovie ? existingMovie.id : movieId,
            mediaType: 'movie',
            title: existingMovie?.title || cleanTitle,
            originalTitle: existingMovie?.originalTitle || rootEntry.name,
            duration: existingMovie?.duration || `${sizeMb} MB`,
            genre: existingMovie?.genre || 'انگیزشی / فیلم',
            genres: existingMovie?.genres || ['انگیزشی', 'فیلم'],
            synopsis: existingMovie?.synopsis || `فیلم شناسایی‌شده مستقیماً از ریشه پوشه فایل‌های ویدیویی.`,
            price: existingMovie?.price !== undefined ? existingMovie.price : 10,
            isPriceLocked: existingMovie ? (existingMovie.isPriceLocked ?? true) : true,
            videoUrl: `/api/store/media/stream?file=${encodeURIComponent(path.join(mediaPrefix, rootEntry.name))}`,
            fileName: rootEntry.name,
            fileSize: `${sizeMb} MB`,
            coverGradient: existingMovie?.coverGradient || 'from-emerald-950 via-slate-900 to-slate-950',
            uploadedAt: existingMovie?.uploadedAt || new Date().toISOString().split('T')[0],
            hasSeasons: false,
            isDirectDiskImport: true,
            needsMetadataSetup: isPendingSetup,
            editAllowedOnce: existingMovie ? (existingMovie.editAllowedOnce ?? (!existingMovie.hasBeenEditedOnce)) : true,
            hasBeenEditedOnce: existingMovie ? (existingMovie.hasBeenEditedOnce ?? false) : false,
          };

          scannedMovies.push(movieRecord);
          if (existingMovie) updatedItemsCount++; else newItemsCount++;
        }
      }
    }

    // Merge scanned movies into database customMovies safely
    if (scannedMovies.length > 0) {
      const mergedMovies = [...(inMemoryDatabase.customMovies || [])];
      for (const sm of scannedMovies) {
        const idx = mergedMovies.findIndex((m) => m.id === sm.id);
        if (idx >= 0) {
          const prev = mergedMovies[idx];
          mergedMovies[idx] = {
            ...sm,
            title: prev.hasBeenEditedOnce ? prev.title : sm.title,
            originalTitle: prev.hasBeenEditedOnce ? prev.originalTitle : sm.originalTitle,
            price: prev.hasBeenEditedOnce ? prev.price : sm.price,
            pricePerEpisode: prev.hasBeenEditedOnce ? prev.pricePerEpisode : sm.pricePerEpisode,
            genre: prev.hasBeenEditedOnce ? prev.genre : sm.genre,
            genres: prev.hasBeenEditedOnce ? prev.genres : sm.genres,
            synopsis: prev.hasBeenEditedOnce ? prev.synopsis : sm.synopsis,
            motivationalTheme: prev.hasBeenEditedOnce ? prev.motivationalTheme : sm.motivationalTheme,
            mediaType: prev.hasBeenEditedOnce ? prev.mediaType : sm.mediaType,
            coverGradient: prev.hasBeenEditedOnce ? prev.coverGradient : sm.coverGradient,
            needsMetadataSetup: prev.hasBeenEditedOnce ? false : prev.needsMetadataSetup,
            editAllowedOnce: prev.hasBeenEditedOnce ? false : sm.editAllowedOnce,
            hasBeenEditedOnce: prev.hasBeenEditedOnce ?? false,
          };
        } else {
          mergedMovies.push(sm);
        }
      }
      inMemoryDatabase.customMovies = mergedMovies;
    }

    // Merge scanned playlists into customPlaylists safely
    if (scannedPlaylists.length > 0) {
      const mergedPlaylists = [...(inMemoryDatabase.customPlaylists || [])];
      for (const sp of scannedPlaylists) {
        const idx = mergedPlaylists.findIndex((p) => p.id === sp.id);
        if (idx < 0) {
          mergedPlaylists.push(sp);
        }
      }
      inMemoryDatabase.customPlaylists = mergedPlaylists;
    }

    if (scannedMovies.length > 0 || scannedPlaylists.length > 0) {
      savePersistentDatabase();
    }

  } catch (scanErr) {
    console.error('[PersistentDB] Error scanning store videos directory:', scanErr);
  }

  return {
    scannedPlaylists,
    scannedMovies,
    newItemsCount,
    updatedItemsCount,
    totalVideosFound,
  };
}

/**
 * Scan novels folder structure on disk.
 * Hierarchy:
 *   <store_path>/novels/
 *     └── [Novel Folder]/
 *           ├── Chapter 1.txt (or 01.txt, ch01.md, etc.)
 *           ├── Chapter 2.txt
 *           └── cover.jpg (optional)
 */
export function scanStoreNovelsDirectory(): {
  scannedNovels: any[];
  newItemsCount: number;
  updatedItemsCount: number;
  totalChaptersFound: number;
} {
  ensureDirectories();
  const { baseStoreDir, novelsDir } = getStoreDirectories();
  const scannedNovels: any[] = [];
  let totalChaptersFound = 0;
  let newItemsCount = 0;
  let updatedItemsCount = 0;

  const existingNovelsMap = new Map<string, any>();
  (inMemoryDatabase.customNovels || []).forEach((n: any) => {
    if (n.id) existingNovelsMap.set(n.id, n);
    if (n.title) existingNovelsMap.set(`title:${n.title.toLowerCase().trim()}`, n);
    if (n.diskFolderName) existingNovelsMap.set(`folder:${n.diskFolderName.toLowerCase().trim()}`, n);
  });

  // Candidate directories where novels could be placed
  const candidateDirs: Array<{ dir: string; prefix: string }> = [];
  if (fs.existsSync(novelsDir)) {
    candidateDirs.push({ dir: novelsDir, prefix: 'novels' });
  }
  const altNames = ['Novels', 'NOVELS', 'رمان', 'رمان‌ها'];
  for (const alt of altNames) {
    const altPath = path.join(baseStoreDir, alt);
    if (altPath !== novelsDir && fs.existsSync(altPath)) {
      candidateDirs.push({ dir: altPath, prefix: alt });
    }
  }

  // Also check if user created novel folders directly in baseStoreDir
  const systemDirNames = new Set(['novels', 'movies', 'videos', 'media', 'data', 'backups', 'temp', 'logs', 'cache', '.git']);
  if (fs.existsSync(baseStoreDir)) {
    try {
      const directEntries = fs.readdirSync(baseStoreDir, { withFileTypes: true });
      for (const entry of directEntries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || systemDirNames.has(entry.name.toLowerCase())) {
          continue;
        }
        const folderPath = path.join(baseStoreDir, entry.name);
        let subFiles: fs.Dirent[] = [];
        try {
          subFiles = fs.readdirSync(folderPath, { withFileTypes: true });
        } catch { continue; }
        const hasVideos = subFiles.some(f => f.isFile() && VIDEO_EXTENSIONS.has(path.extname(f.name).toLowerCase()));
        if (!hasVideos) {
          // Direct novel folder under baseStoreDir
          candidateDirs.push({ dir: baseStoreDir, prefix: '' });
          break;
        }
      }
    } catch {}
  }

  const processedFolderKeys = new Set<string>();

  try {
    for (const { dir: scanDir, prefix } of candidateDirs) {
      if (!fs.existsSync(scanDir)) continue;
      const rootEntries = fs.readdirSync(scanDir, { withFileTypes: true });

      for (const rootEntry of rootEntries) {
        if (rootEntry.name.startsWith('.')) continue;
        if (prefix === '' && systemDirNames.has(rootEntry.name.toLowerCase())) continue;

        const fullNovelPath = path.join(scanDir, rootEntry.name);

        if (rootEntry.isDirectory()) {
          const folderKey = rootEntry.name.toLowerCase();
          if (processedFolderKeys.has(folderKey)) continue;
          processedFolderKeys.add(folderKey);

          let subFiles: fs.Dirent[] = [];
          try {
            subFiles = fs.readdirSync(fullNovelPath, { withFileTypes: true });
          } catch {
            continue;
          }

          const textFiles = subFiles.filter(
            (e) => e.isFile() && !e.name.startsWith('.') && TEXT_EXTENSIONS.has(path.extname(e.name).toLowerCase())
          );
          const coverFile = subFiles.find(
            (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())
          );

          let folderTitle = sanitizeMediaTitle(rootEntry.name);
          const novelId = `novel-folder-${rootEntry.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;
          const existingNovel = existingNovelsMap.get(novelId) || existingNovelsMap.get(`title:${folderTitle.toLowerCase()}`) || existingNovelsMap.get(`folder:${rootEntry.name.toLowerCase()}`);

          let chapters: any[] = [];
          let author = existingNovel?.author || 'نویسنده نامشخص';
          let synopsis = existingNovel?.synopsis || `این رمان به صورت مستقیم از پوشه دیسک دستگاه (${rootEntry.name}) شناسایی گردیده است.`;
          let genre = existingNovel?.genre || 'توسعه فردی و روانشناسی اراده';

          const infoJsonFile = textFiles.find((f) => f.name.toLowerCase() === 'info.json' || f.name.toLowerCase() === 'metadata.json' || f.name.toLowerCase() === 'novel.json');
          let parsedMeta: any = null;
          if (infoJsonFile) {
            try {
              const raw = fs.readFileSync(path.join(fullNovelPath, infoJsonFile.name), 'utf-8');
              parsedMeta = JSON.parse(raw);
              if (parsedMeta.title) folderTitle = parsedMeta.title;
              if (parsedMeta.author) author = parsedMeta.author;
              if (parsedMeta.synopsis) synopsis = parsedMeta.synopsis;
              if (parsedMeta.genre) genre = parsedMeta.genre;
            } catch {}
          }

          const jsonMetaFiles = new Set(['info.json', 'metadata.json', 'novel.json', 'chapters.json']);
          const chapterFiles = textFiles.filter((f) => !jsonMetaFiles.has(f.name.toLowerCase()));
          const defaultChPrice = existingNovel?.pricePerChapter !== undefined ? existingNovel.pricePerChapter : (parsedMeta?.pricePerChapter !== undefined ? parsedMeta.pricePerChapter : 2);

          if (chapterFiles.length > 0) {
            const sortedFiles = [...chapterFiles].sort((a, b) => {
              return extractNaturalNumber(a.name, 1) - extractNaturalNumber(b.name, 1);
            });

            chapters = sortedFiles.map((file, idx) => {
              totalChaptersFound++;
              const chNum = extractNaturalNumber(file.name, idx + 1);
              const chTitle = sanitizeMediaTitle(file.name) || `فصل ${chNum}`;
              let content = '';
              try {
                content = fs.readFileSync(path.join(fullNovelPath, file.name), 'utf-8');
              } catch {
                content = `[خطا در خواندن فایل: ${file.name}]`;
              }

              return {
                id: `ch-${novelId}-${chNum}`,
                chapterNumber: chNum,
                title: chTitle,
                content: content.trim(),
                price: defaultChPrice,
              };
            });
          } else {
            // Check for chapters.json or metadata.chapters
            const chaptersJsonFile = textFiles.find((f) => f.name.toLowerCase() === 'chapters.json');
            if (chaptersJsonFile) {
              try {
                const raw = fs.readFileSync(path.join(fullNovelPath, chaptersJsonFile.name), 'utf-8');
                const parsed = JSON.parse(raw);
                const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.chapters) ? parsed.chapters : []);
                if (list.length > 0) {
                  chapters = list.map((ch: any, idx: number) => ({
                    id: ch.id || `ch-${novelId}-${idx + 1}`,
                    chapterNumber: ch.chapterNumber || idx + 1,
                    title: ch.title || `فصل ${idx + 1}`,
                    content: ch.content || '',
                    price: ch.price !== undefined ? ch.price : defaultChPrice,
                  }));
                  totalChaptersFound += chapters.length;
                }
              } catch {}
            }

            if (chapters.length === 0 && parsedMeta && Array.isArray(parsedMeta.chapters)) {
              chapters = parsedMeta.chapters.map((ch: any, idx: number) => ({
                id: ch.id || `ch-${novelId}-${idx + 1}`,
                chapterNumber: ch.chapterNumber || idx + 1,
                title: ch.title || `فصل ${idx + 1}`,
                content: ch.content || '',
                price: ch.price !== undefined ? ch.price : defaultChPrice,
              }));
              totalChaptersFound += chapters.length;
            }

            // If still 0 chapters (user created an empty novel folder), initialize it!
            if (chapters.length === 0) {
              const initialChapter = {
                id: `ch-${novelId}-1`,
                chapterNumber: 1,
                title: 'فصل اول',
                content: `پوشه رمان «${folderTitle}» توسط شما ایجاد گردید. فایل‌های متنی فصول (.txt) را می‌توانید در این پوشه قرار دهید.`,
                price: defaultChPrice,
              };
              chapters = [initialChapter];
              totalChaptersFound++;

              try {
                safeWriteFileSyncWithSync(
                  path.join(fullNovelPath, '01 - فصل اول.txt'),
                  `${initialChapter.title}\n\n${initialChapter.content}`
                );
                safeWriteFileSyncWithSync(
                  path.join(fullNovelPath, 'metadata.json'),
                  JSON.stringify({
                    id: novelId,
                    title: folderTitle,
                    author,
                    genre,
                    synopsis,
                    price: defaultChPrice,
                    pricePerChapter: defaultChPrice,
                    needsMetadataSetup: true,
                    diskFolderName: rootEntry.name,
                  }, null, 2)
                );
              } catch {}
            }
          }

          // Clean and resolve synopsis
          synopsis = resolveNovelSynopsis({ title: folderTitle, author, genre, synopsis, chapters }, inMemoryDatabase.language || 'fa') || synopsis;

          const pricePerChapter = existingNovel?.pricePerChapter !== undefined ? existingNovel.pricePerChapter : 2;
          const totalPrice = existingNovel?.price !== undefined ? existingNovel.price : (chapters.length * pricePerChapter);
          const relativeCoverPath = prefix 
            ? path.join(prefix, rootEntry.name, coverFile ? coverFile.name : '') 
            : path.join(rootEntry.name, coverFile ? coverFile.name : '');
          const coverRelativeUrl = coverFile 
            ? `/api/store/media/stream?file=${encodeURIComponent(relativeCoverPath)}` 
            : undefined;

          const isPendingSetup = existingNovel ? (existingNovel.needsMetadataSetup ?? (!existingNovel.hasBeenEditedOnce)) : true;

          const novelRecord: any = {
            id: existingNovel ? existingNovel.id : novelId,
            title: existingNovel?.title || folderTitle,
            author,
            genre,
            synopsis,
            price: totalPrice,
            pricePerChapter,
            isPriceLocked: existingNovel ? (existingNovel.isPriceLocked ?? true) : true,
            chapters,
            coverUrl: coverRelativeUrl || existingNovel?.coverUrl,
            coverColor: existingNovel?.coverColor || '#6366f1',
            coverGradient: existingNovel?.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
            uploadedAt: existingNovel?.uploadedAt || new Date().toISOString().split('T')[0],
            diskFolderName: rootEntry.name,
            diskPath: fullNovelPath,
            isDirectDiskImport: true,
            needsMetadataSetup: isPendingSetup,
            editAllowedOnce: existingNovel ? (existingNovel.editAllowedOnce ?? (!existingNovel.hasBeenEditedOnce)) : true,
            hasBeenEditedOnce: existingNovel ? (existingNovel.hasBeenEditedOnce ?? false) : false,
          };

          scannedNovels.push(novelRecord);
          if (existingNovel) updatedItemsCount++; else newItemsCount++;
        }
      }
    }

    if (scannedNovels.length > 0) {
      const mergedNovels = [...(inMemoryDatabase.customNovels || [])];
      for (const sn of scannedNovels) {
        const idx = mergedNovels.findIndex((n) => n.id === sn.id);
        if (idx >= 0) {
          const prev = mergedNovels[idx];
          mergedNovels[idx] = {
            ...sn,
            title: prev.hasBeenEditedOnce ? prev.title : sn.title,
            author: prev.hasBeenEditedOnce ? prev.author : sn.author,
            genre: prev.hasBeenEditedOnce ? prev.genre : sn.genre,
            synopsis: prev.hasBeenEditedOnce ? prev.synopsis : sn.synopsis,
            price: prev.hasBeenEditedOnce ? prev.price : sn.price,
            pricePerChapter: prev.hasBeenEditedOnce ? prev.pricePerChapter : sn.pricePerChapter,
            coverGradient: prev.hasBeenEditedOnce ? prev.coverGradient : sn.coverGradient,
            coverColor: prev.hasBeenEditedOnce ? prev.coverColor : sn.coverColor,
            needsMetadataSetup: prev.hasBeenEditedOnce ? false : prev.needsMetadataSetup,
            editAllowedOnce: prev.hasBeenEditedOnce ? false : sn.editAllowedOnce,
            hasBeenEditedOnce: prev.hasBeenEditedOnce ?? false,
          };
        } else {
          mergedNovels.push(sn);
        }
      }
      inMemoryDatabase.customNovels = mergedNovels;
      savePersistentDatabase();
    }
  } catch (novelScanErr) {
    console.error('[PersistentDB] Error scanning store novels directory:', novelScanErr);
  }

  return {
    scannedNovels,
    newItemsCount,
    updatedItemsCount,
    totalChaptersFound,
  };
}

/**
 * Scan all store directories (movies, series, novels, playlists)
 */
export function scanAllStoreDirectories(): {
  moviesScan: ReturnType<typeof scanStoreVideosDirectory>;
  novelsScan: ReturnType<typeof scanStoreNovelsDirectory>;
  pendingMetadataItems: Array<{ type: 'movie' | 'novel'; id: string; title: string; folderName?: string; subItemsCount: number }>;
} {
  ensureDirectories();
  const moviesScan = scanStoreVideosDirectory();
  const novelsScan = scanStoreNovelsDirectory();

  const pendingMovies = (inMemoryDatabase.customMovies || [])
    .filter((m: any) => m.needsMetadataSetup)
    .map((m: any) => {
      let count = 0;
      if (Array.isArray(m.seasons)) {
        m.seasons.forEach((s: any) => { count += (s.episodes || []).length; });
      } else if (Array.isArray(m.standaloneEpisodes)) {
        count = m.standaloneEpisodes.length;
      } else {
        count = 1;
      }
      return {
        type: 'movie' as const,
        id: m.id,
        title: m.title,
        folderName: m.diskFolderName,
        mediaType: m.mediaType,
        subItemsCount: count,
      };
    });

  const pendingNovels = (inMemoryDatabase.customNovels || [])
    .filter((n: any) => n.needsMetadataSetup)
    .map((n: any) => ({
      type: 'novel' as const,
      id: n.id,
      title: n.title,
      folderName: n.diskFolderName,
      subItemsCount: (n.chapters || []).length,
    }));

  return {
    moviesScan,
    novelsScan,
    pendingMetadataItems: [...pendingMovies, ...pendingNovels],
  };
}

/**
 * Configure detected media item (one-time metadata and price locking)
 */
export function configureDiscoveredMedia(payload: {
  type: 'movie' | 'novel';
  id: string;
  title: string;
  pricePerUnit: number;
  genre?: string;
  genres?: string[];
  synopsis?: string;
  motivationalTheme?: string;
  author?: string;
  mediaType?: 'movie' | 'series' | 'anime';
  coverGradient?: string;
  coverUrl?: string;
}): {
  success: boolean;
  message?: string;
  error?: string;
  item?: any;
} {
  ensureDirectories();
  const { type, id, title, pricePerUnit } = payload;
  if (!id || !title) {
    return { success: false, error: 'شناسه و عنوان اثر الزامی است.' };
  }

  const sanitizedPrice = Math.max(0, Math.round(Number(pricePerUnit) || 2));

  if (type === 'movie') {
    if (!Array.isArray(inMemoryDatabase.customMovies)) inMemoryDatabase.customMovies = [];
    const movieIdx = inMemoryDatabase.customMovies.findIndex((m: any) => m.id === id);
    if (movieIdx < 0) {
      return { success: false, error: 'اثر ویدیویی مورد نظر در دیتابیس یافت نشد.' };
    }

    const movie = inMemoryDatabase.customMovies[movieIdx];
    if (movie.hasBeenEditedOnce) {
      return { success: false, error: 'اطلاعات این اثر قبلاً یک بار ثبت و قفل شده است و امکان ویرایش مجدد وجود ندارد.' };
    }

    let totalEpisodes = 0;
    if (Array.isArray(movie.seasons)) {
      for (const s of movie.seasons) {
        if (Array.isArray(s.episodes)) {
          for (const ep of s.episodes) {
            ep.price = sanitizedPrice;
            totalEpisodes++;
          }
        }
      }
    }
    if (Array.isArray(movie.standaloneEpisodes)) {
      for (const ep of movie.standaloneEpisodes) {
        ep.price = sanitizedPrice;
        totalEpisodes++;
      }
    }

    const calculatedTotalPrice = totalEpisodes > 0 ? (totalEpisodes * sanitizedPrice) : sanitizedPrice;

    inMemoryDatabase.customMovies[movieIdx] = {
      ...movie,
      title: title.trim(),
      originalTitle: payload.title.trim(),
      mediaType: payload.mediaType || movie.mediaType || 'movie',
      genre: payload.genre || movie.genre || 'انگیزشی / اختصاصی',
      genres: payload.genres || (payload.genre ? [payload.genre] : movie.genres),
      synopsis: payload.synopsis || movie.synopsis,
      motivationalTheme: payload.motivationalTheme || movie.motivationalTheme || 'اراده و استقامت',
      price: calculatedTotalPrice,
      pricePerEpisode: sanitizedPrice,
      isPriceLocked: true,
      coverGradient: payload.coverGradient || movie.coverGradient,
      coverUrl: payload.coverUrl || movie.coverUrl,
      needsMetadataSetup: false,
      editAllowedOnce: false,
      hasBeenEditedOnce: true,
      isDirectDiskImport: true,
    };

    if (movie.playlistId && Array.isArray(inMemoryDatabase.customPlaylists)) {
      const plIdx = inMemoryDatabase.customPlaylists.findIndex((p: any) => p.id === movie.playlistId);
      if (plIdx >= 0) {
        inMemoryDatabase.customPlaylists[plIdx].title = title.trim();
        if (payload.synopsis) inMemoryDatabase.customPlaylists[plIdx].description = payload.synopsis;
      }
    }

    savePersistentDatabase();
    return {
      success: true,
      message: `اطلاعات فیلم/سریال «${title}» با موفقیت ثبت شد و طبق قوانین سیستم قفل گردید (قیمت هر قسمت: ${sanitizedPrice} سکه).`,
      item: inMemoryDatabase.customMovies[movieIdx],
    };
  } else if (type === 'novel') {
    if (!Array.isArray(inMemoryDatabase.customNovels)) inMemoryDatabase.customNovels = [];
    const novelIdx = inMemoryDatabase.customNovels.findIndex((n: any) => n.id === id);
    if (novelIdx < 0) {
      return { success: false, error: 'رمان مورد نظر در دیتابیس یافت نشد.' };
    }

    const novel = inMemoryDatabase.customNovels[novelIdx];
    if (novel.hasBeenEditedOnce) {
      return { success: false, error: 'اطلاعات این رمان قبلاً یک بار ثبت و قفل شده است و امکان ویرایش مجدد وجود ندارد.' };
    }

    let chaptersCount = 0;
    if (Array.isArray(novel.chapters)) {
      for (const ch of novel.chapters) {
        ch.price = sanitizedPrice;
        chaptersCount++;
      }
    }

    const calculatedTotalPrice = chaptersCount > 0 ? (chaptersCount * sanitizedPrice) : sanitizedPrice;

    inMemoryDatabase.customNovels[novelIdx] = {
      ...novel,
      title: title.trim(),
      author: payload.author || novel.author || 'نویسنده نامشخص',
      genre: payload.genre || novel.genre || 'توسعه فردی و روانشناسی اراده',
      synopsis: payload.synopsis || novel.synopsis,
      price: calculatedTotalPrice,
      pricePerChapter: sanitizedPrice,
      isPriceLocked: true,
      coverGradient: payload.coverGradient || novel.coverGradient,
      coverUrl: payload.coverUrl || novel.coverUrl,
      needsMetadataSetup: false,
      editAllowedOnce: false,
      hasBeenEditedOnce: true,
      isDirectDiskImport: true,
    };

    savePersistentDatabase();
    return {
      success: true,
      message: `اطلاعات رمان «${title}» با موفقیت ثبت شد و طبق قوانین سیستم قفل گردید (قیمت هر فصل: ${sanitizedPrice} سکه).`,
      item: inMemoryDatabase.customNovels[novelIdx],
    };
  }

  return { success: false, error: 'نوع اثر نامعتبر است.' };
}

/**
 * Delete a custom novel and its associated disk folder
 */
export function deleteNovelFromPersistentStorage(novelId: string): {
  success: boolean;
  freedBytes: number;
  formattedFreedBytes: string;
  novelTitle?: string;
} {
  ensureDirectories();
  let freedBytes = 0;
  let novelTitle = '';
  const { novelsDir } = getStoreDirectories();

  const foundNovel = (inMemoryDatabase.customNovels || []).find((n: any) => n.id === novelId);
  if (foundNovel) {
    novelTitle = foundNovel.title || novelId;
    if (foundNovel.fileData) freedBytes += Buffer.byteLength(foundNovel.fileData, 'utf-8');
    if (foundNovel.rawContent) freedBytes += Buffer.byteLength(foundNovel.rawContent, 'utf-8');
    if (Array.isArray(foundNovel.chapters)) {
      for (const ch of foundNovel.chapters) {
        if (ch.content) freedBytes += Buffer.byteLength(ch.content, 'utf-8');
      }
    }

    if (foundNovel.diskFolderName && fs.existsSync(novelsDir)) {
      const folderPath = path.join(novelsDir, foundNovel.diskFolderName);
      if (fs.existsSync(folderPath)) {
        try {
          fs.rmSync(folderPath, { recursive: true, force: true });
        } catch {}
      }
    }
  }

  if (Array.isArray(inMemoryDatabase.customNovels)) {
    inMemoryDatabase.customNovels = inMemoryDatabase.customNovels.filter((n: any) => n.id !== novelId);
  }

  if (Array.isArray(inMemoryDatabase.storeProducts)) {
    inMemoryDatabase.storeProducts = inMemoryDatabase.storeProducts.filter((p: any) => p.id !== novelId && p.novelId !== novelId);
  }

  if (!inMemoryDatabase.deletedNovelIds) {
    inMemoryDatabase.deletedNovelIds = [];
  }
  if (!inMemoryDatabase.deletedNovelIds.includes(novelId)) {
    inMemoryDatabase.deletedNovelIds.push(novelId);
  }

  savePersistentDatabase();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return {
    success: true,
    freedBytes,
    formattedFreedBytes: formatSize(freedBytes),
    novelTitle,
  };
}

/**
 * Set and apply custom store storage path
 */
export function setStoreStoragePath(newPath: string): {
  success: boolean;
  message: string;
  storePath: string;
  moviesPath: string;
  novelsPath: string;
  scanResult: any;
  syncResult?: any;
} {
  const cleanPath = (newPath || '').trim();
  if (!inMemoryDatabase.advancedSettings) inMemoryDatabase.advancedSettings = {};
  inMemoryDatabase.advancedSettings.storeStoragePath = cleanPath;

  if (cleanPath) {
    saveStorePathToPointerFiles(cleanPath);
  }

  ensureDirectories();
  const syncResult = syncAllStoreItemsToDisk(cleanPath);
  savePersistentDatabase();

  const scanResult = scanAllStoreDirectories();
  const dirs = getStoreDirectories(cleanPath);

  return {
    success: true,
    message: `مسیر ذخیره‌سازی با موفقیت تنظیم شد، پوشه‌های اختصاصی novels و movies ساخته شدند و ${syncResult.novelsCount} رمان و ${syncResult.moviesCount} اثر فیلم به مسیر جدید منتقل/همگام گردیدند.`,
    storePath: dirs.baseStoreDir,
    moviesPath: dirs.moviesDir,
    novelsPath: dirs.novelsDir,
    scanResult,
    syncResult,
  };
}

/**
 * Extract an uploaded ZIP file directly into store directory, preserving directory structure.
 */
export async function extractZipToVideosStore(zipBuffer: Buffer, baseFolderName?: string): Promise<{
  success: boolean;
  extractedFilesCount: number;
  extractedSizeFormatted: string;
  scanResult: any;
  targetDirectory: string;
}> {
  ensureDirectories();
  const { moviesDir } = getStoreDirectories();
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    let targetDir = moviesDir;
    if (baseFolderName && baseFolderName.trim()) {
      targetDir = path.join(moviesDir, sanitizeMediaTitle(baseFolderName));
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    let extractedCount = 0;
    let totalBytes = 0;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const entryPath = entry.entryName;
      if (entryPath.includes('__MACOSX') || path.basename(entryPath).startsWith('.')) {
        continue;
      }

      const ext = path.extname(entryPath).toLowerCase();
      if (VIDEO_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext) || ext === '.srt' || ext === '.vtt' || ext === '.json' || TEXT_EXTENSIONS.has(ext)) {
        const destPath = path.join(targetDir, entryPath);
        const destFolder = path.dirname(destPath);
        if (!fs.existsSync(destFolder)) {
          fs.mkdirSync(destFolder, { recursive: true });
        }
        
        fs.writeFileSync(destPath, entry.getData());
        extractedCount++;
        totalBytes += entry.header.size || 0;
      }
    }

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const scanResult = scanStoreVideosDirectory();

    return {
      success: true,
      extractedFilesCount: extractedCount,
      extractedSizeFormatted: formatSize(totalBytes),
      scanResult,
      targetDirectory: targetDir,
    };
  } catch (err: any) {
    console.error('[PersistentDB] Failed to extract ZIP to store:', err);
    throw new Error(`خطا در استخراج فایل زیپ: ${err.message}`);
  }
}

