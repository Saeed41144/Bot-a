import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Copy,
  Check,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FileText,
  Clock,
  Send,
  Loader2,
  Trash2,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Layers,
  Database,
  Key,
  FolderArchive,
  Wallet,
  Activity,
  ListTodo,
  Timer,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Info,
  FileSpreadsheet,
  FileCode,
  Lock,
  Unlock,
  Search,
  Sliders,
  Shield,
  Tag,
  Eye,
  EyeOff,
  Calendar,
  Bot,
  Radio,
  KeyRound,
  BookOpen,
  Library,
  Archive,
  FileArchive,
} from 'lucide-react';
import {
  Language,
  ThemeMode,
  TelegramConfig,
  Habit,
  Task,
  RewardWallet,
  WebNovel,
  ShopMovie,
  VideoPlaylist,
  AdvancedSettings,
  FullBackupSettings,
  SelectiveBackupOptions,
  SelectiveRestoreOptions,
  BackupSnapshotRecord,
  FullBackupData,
} from '../types';
import { translations, formatNumber } from '../utils/translations';
import {
  createSelectiveBackupPayload,
  executeSelectiveRestore,
  parseAndValidateBackup,
  downloadBackupFile,
  downloadMarkdownReport,
  generateMarkdownBackupSummary,
  copyBackupToClipboard,
  saveBackupSnapshot,
  getBackupSnapshots,
  deleteBackupSnapshot,
  clearAllBackupSnapshots,
  estimateBackupPayloadSize,
  exportHabitsToCSV,
  downloadHabitsCSV,
  exportTasksToCSV,
  downloadTasksCSV,
  downloadInteractiveHTMLReport,
  encryptBackupPayload,
  decryptBackupPayload,
  compareBackupWithCurrent,
  BackupDiffComparison,
  DEFAULT_SELECTIVE_BACKUP_OPTIONS,
  DEFAULT_SELECTIVE_RESTORE_OPTIONS,
  ParsedBackupResult,
} from '../utils/backupHelper';
import {
  createNovelsZipBlob,
  parseAndValidateNovelsZip,
  downloadNovelZipFile,
  ParsedNovelZipResult,
} from '../utils/novelBackupHelper';
import { getPomodoroSessions } from '../utils/pomodoroStorage';
import { safeStorage } from '../utils/safeStorage';

interface BackupSettingsTabProps {
  language: Language;
  theme: ThemeMode;
  habits: Habit[];
  tasks?: Task[];
  wallet?: RewardWallet;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  telegramConfig: TelegramConfig;
  advancedSettings?: AdvancedSettings;
  onUpdateTelegramConfig: (config: TelegramConfig) => void;
  onRestoreHabits: (restoredHabits: Habit[], restoredSettings?: Partial<FullBackupSettings>) => void;
  onRestoreNovels?: (restoredNovels: WebNovel[], options?: { merge: boolean }) => void;
  onCloseModal?: () => void;
}

export const BackupSettingsTab: React.FC<BackupSettingsTabProps> = ({
  language,
  theme,
  habits,
  tasks = [],
  wallet,
  customNovels = [],
  customMovies = [],
  customPlaylists = [],
  deletedMovieIds = [],
  deletedPlaylistIds = [],
  deletedNovelIds = [],
  telegramConfig,
  advancedSettings,
  onUpdateTelegramConfig,
  onRestoreHabits,
  onRestoreNovels,
  onCloseModal,
}) => {
  const t = translations[language] || translations.fa;
  const isRtl = t.dir === 'rtl';

  // 1. Selective Backup Options State
  const [selectedOptions, setSelectedOptions] = useState<SelectiveBackupOptions>(
    DEFAULT_SELECTIVE_BACKUP_OPTIONS
  );

  // Persist selective backup options to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lally_backup_selective_options');
      if (saved) {
        const parsed: SelectiveBackupOptions = JSON.parse(saved);
        setSelectedOptions(parsed);
      }
    } catch {
      // Use defaults on parse error
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('lally_backup_selective_options', JSON.stringify(selectedOptions));
    } catch {
      // Silently ignore storage errors
    }
  }, [selectedOptions]);

  const [activePreset, setActivePreset] = useState<'recommended' | 'habits_only' | 'productivity' | 'full' | 'custom'>(
    'recommended'
  );

  // Granular item selectors
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [habitSearchQuery, setHabitSearchQuery] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  // Date range & Privacy / Security
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days' | '365days'>('all');
  const [sanitizeSecrets, setSanitizeSecrets] = useState(false);
  const [enableEncryption, setEnableEncryption] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  // 2. Snapshots & Restore Points State
  const [snapshots, setSnapshots] = useState<BackupSnapshotRecord[]>([]);
  const [snapshotLabelInput, setSnapshotLabelInput] = useState('');
  const [snapshotTagInput, setSnapshotTagInput] = useState<'manual' | 'milestone' | 'pre_update'>('manual');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotSuccessMsg, setSnapshotSuccessMsg] = useState<string | null>(null);
  const [previewingSnapshotDiff, setPreviewingSnapshotDiff] = useState<{ snap: BackupSnapshotRecord; diff: BackupDiffComparison } | null>(null);

  // 3. UI Interaction States
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingBackup, setIsSendingBackup] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExportFormats, setShowExportFormats] = useState(false);

  // 4. Pending Upload Inspection & Restore State
  const [pendingParsedBackup, setPendingParsedBackup] = useState<ParsedBackupResult | null>(null);
  const [restoreOptions, setRestoreOptions] = useState<SelectiveRestoreOptions>(
    DEFAULT_SELECTIVE_RESTORE_OPTIONS
  );
  const [encryptedRawFileContent, setEncryptedRawFileContent] = useState<string | null>(null);
  const [decryptPasswordInput, setDecryptPasswordInput] = useState('');
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [diffComparison, setDiffComparison] = useState<BackupDiffComparison | null>(null);

  // 5. Automated Telegram Backup State
  const [tempAutoBackup, setTempAutoBackup] = useState(telegramConfig.autoBackupEnabled ?? false);
  const [tempBackupInterval, setTempBackupInterval] = useState(telegramConfig.backupInterval || 'daily');
  const [tempBackupTime, setTempBackupTime] = useState(telegramConfig.backupTime || '23:00');
  const [tempUseDedicatedBackupBot, setTempUseDedicatedBackupBot] = useState(telegramConfig.useDedicatedBackupBot ?? false);
  const [tempBackupBotToken, setTempBackupBotToken] = useState(telegramConfig.backupBotToken || '');
  const [tempBackupChatId, setTempBackupChatId] = useState(telegramConfig.backupChatId || '');
  const [showBackupBotToken, setShowBackupBotToken] = useState(false);
  const [isTestingBackupBot, setIsTestingBackupBot] = useState(false);
  const [backupBotTestResult, setBackupBotTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [tempBackupDayOfWeek, setTempBackupDayOfWeek] = useState<number>(telegramConfig.backupDayOfWeek ?? 6); // Default Saturday
  const [tempBackupDayOfMonth, setTempBackupDayOfMonth] = useState<number>(telegramConfig.backupDayOfMonth ?? 1); // Default 1st of month
  const [tempBackupFormat, setTempBackupFormat] = useState(telegramConfig.backupFormat || 'json_standard');
  const [tempBackupEncryptionPassword, setTempBackupEncryptionPassword] = useState(telegramConfig.backupEncryptionPassword || '');

  // 6. Dedicated Novel ZIP Backup & Restore State
  const [isExportingNovelZip, setIsExportingNovelZip] = useState(false);
  const [isSendingNovelZipTelegram, setIsSendingNovelZipTelegram] = useState(false);
  const [novelZipProgressMsg, setNovelZipProgressMsg] = useState<string | null>(null);
  const [novelZipStatusResult, setNovelZipStatusResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [novelIncludeReadingProgress, setNovelIncludeReadingProgress] = useState(true);

  // Automated Periodic Novel Backup State
  const [tempAutoNovelBackup, setTempAutoNovelBackup] = useState(telegramConfig.autoNovelBackupEnabled ?? false);
  const [tempNovelBackupInterval, setTempNovelBackupInterval] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>(telegramConfig.novelBackupInterval || 'weekly');
  const [tempNovelBackupTime, setTempNovelBackupTime] = useState(telegramConfig.novelBackupTime || '23:00');
  const [tempNovelBackupDayOfWeek, setTempNovelBackupDayOfWeek] = useState<number>(telegramConfig.novelBackupDayOfWeek ?? 6);
  const [tempNovelBackupDayOfMonth, setTempNovelBackupDayOfMonth] = useState<number>(telegramConfig.novelBackupDayOfMonth ?? 1);
  const [tempNovelBackupIncludeProgress, setTempNovelBackupIncludeProgress] = useState(telegramConfig.novelBackupIncludeProgress ?? true);

  // Novel ZIP Import & Inspection State
  const [isParsingNovelZip, setIsParsingNovelZip] = useState(false);
  const [isRestoringNovelZip, setIsRestoringNovelZip] = useState(false);
  const [parsedNovelZipResult, setParsedNovelZipResult] = useState<ParsedNovelZipResult | null>(null);
  const [novelRestoreMode, setNovelRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [novelRestoreSuccessMsg, setNovelRestoreSuccessMsg] = useState<string | null>(null);
  const novelZipFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMountRef = useRef(true);

  // Load snapshots from local storage on mount
  useEffect(() => {
    setSnapshots(getBackupSnapshots());
  }, []);

  // Update auto-backup telegram config when local inputs change
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    onUpdateTelegramConfig({
      ...telegramConfig,
      botToken: telegramConfig.botToken || '',
      chatId: telegramConfig.chatId || '',
      autoBackupEnabled: tempAutoBackup,
      backupInterval: tempBackupInterval,
      backupTime: tempBackupTime,
      useDedicatedBackupBot: tempUseDedicatedBackupBot,
      backupBotToken: tempBackupBotToken,
      backupChatId: tempBackupChatId,
      backupDayOfWeek: tempBackupDayOfWeek,
      backupDayOfMonth: tempBackupDayOfMonth,
      backupFormat: tempBackupFormat,
      backupEncryptionPassword: tempBackupEncryptionPassword,
      autoNovelBackupEnabled: tempAutoNovelBackup,
      novelBackupInterval: tempNovelBackupInterval,
      novelBackupTime: tempNovelBackupTime,
      novelBackupDayOfWeek: tempNovelBackupDayOfWeek,
      novelBackupDayOfMonth: tempNovelBackupDayOfMonth,
      novelBackupIncludeProgress: tempNovelBackupIncludeProgress,
    });
  }, [
    tempAutoBackup,
    tempBackupInterval,
    tempBackupTime,
    tempUseDedicatedBackupBot,
    tempBackupBotToken,
    tempBackupChatId,
    tempBackupDayOfWeek,
    tempBackupDayOfMonth,
    tempBackupFormat,
    tempBackupEncryptionPassword,
    tempAutoNovelBackup,
    tempNovelBackupInterval,
    tempNovelBackupTime,
    tempNovelBackupDayOfWeek,
    tempNovelBackupDayOfMonth,
    tempNovelBackupIncludeProgress,
  ]);

  // Pomodoro sessions from local storage
  const pomodoroSessions = useMemo(() => {
    try {
      return getPomodoroSessions();
    } catch {
      return [];
    }
  }, []);

  // Update selected options with date range and sanitize flags
  const effectiveSelectiveOptions = useMemo<SelectiveBackupOptions>(() => {
    return {
      ...selectedOptions,
      dateRange,
      sanitizeSecrets,
      isEncrypted: enableEncryption && !!encryptionPassword,
    };
  }, [selectedOptions, dateRange, sanitizeSecrets, enableEncryption, encryptionPassword]);

  // Compute live estimated payload size & record count
  const estimatedInfo = useMemo(() => {
    const payload = createSelectiveBackupPayload({
      options: effectiveSelectiveOptions,
      habits,
      tasks,
      wallet,
      pomodoroSessions,
      customNovels,
      customMovies,
      customPlaylists,
      deletedMovieIds,
      deletedPlaylistIds,
      deletedNovelIds,
      telegramConfig,
      language,
      theme,
      advancedSettings,
    });
    const size = estimateBackupPayloadSize(payload);
    return { payload, size };
  }, [
    effectiveSelectiveOptions,
    habits,
    tasks,
    wallet,
    pomodoroSessions,
    customNovels,
    customMovies,
    customPlaylists,
    deletedMovieIds,
    deletedPlaylistIds,
    deletedNovelIds,
    telegramConfig,
    language,
    theme,
    advancedSettings,
  ]);

  // Preset Handlers
  const handleApplyPreset = (preset: 'recommended' | 'habits_only' | 'productivity' | 'full') => {
    setActivePreset(preset);
    if (preset === 'recommended') {
      setSelectedOptions({
        includeHabits: true,
        selectedHabitIds: [],
        includeTasks: true,
        selectedTaskIds: [],
        includePomodoro: true,
        includeWallet: true,
        includeTelegram: true,
        includePreferences: true,
        includeAiKeys: false,
        includeMedia: false,
        includeActivityLogs: true,
      });
    } else if (preset === 'habits_only') {
      setSelectedOptions({
        includeHabits: true,
        selectedHabitIds: [],
        includeTasks: false,
        selectedTaskIds: [],
        includePomodoro: false,
        includeWallet: false,
        includeTelegram: false,
        includePreferences: false,
        includeAiKeys: false,
        includeMedia: false,
        includeActivityLogs: false,
      });
    } else if (preset === 'productivity') {
      setSelectedOptions({
        includeHabits: true,
        selectedHabitIds: [],
        includeTasks: true,
        selectedTaskIds: [],
        includePomodoro: true,
        includeWallet: true,
        includeTelegram: false,
        includePreferences: true,
        includeAiKeys: false,
        includeMedia: false,
        includeActivityLogs: true,
      });
    } else if (preset === 'full') {
      setSelectedOptions({
        includeHabits: true,
        selectedHabitIds: [],
        includeTasks: true,
        selectedTaskIds: [],
        includePomodoro: true,
        includeWallet: true,
        includeTelegram: true,
        includePreferences: true,
        includeAiKeys: true,
        includeMedia: true,
        includeActivityLogs: true,
      });
    }
  };

  const handleToggleOption = (key: keyof SelectiveBackupOptions) => {
    setActivePreset('custom');
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Habit individual checkbox selection
  const handleToggleHabitSelection = (habitId: string) => {
    setActivePreset('custom');
    setSelectedOptions((prev) => {
      const currentSelected = prev.selectedHabitIds && prev.selectedHabitIds.length > 0
        ? prev.selectedHabitIds
        : habits.map((h) => h.id);
      
      const isAlreadySelected = currentSelected.includes(habitId);
      const newSelected = isAlreadySelected
        ? currentSelected.filter((id) => id !== habitId)
        : [...currentSelected, habitId];

      return {
        ...prev,
        includeHabits: newSelected.length > 0,
        selectedHabitIds: newSelected.length === habits.length ? [] : newSelected,
      };
    });
  };

  const handleSelectAllHabits = () => {
    setSelectedOptions((prev) => ({
      ...prev,
      includeHabits: true,
      selectedHabitIds: [],
    }));
  };

  const handleDeselectAllHabits = () => {
    setSelectedOptions((prev) => ({
      ...prev,
      includeHabits: false,
      selectedHabitIds: ['none_selected'],
    }));
  };

  // Task individual checkbox selection
  const handleToggleTaskSelection = (taskId: string) => {
    setActivePreset('custom');
    setSelectedOptions((prev) => {
      const currentSelected = prev.selectedTaskIds && prev.selectedTaskIds.length > 0
        ? prev.selectedTaskIds
        : tasks.map((t) => t.id);
      
      const isAlreadySelected = currentSelected.includes(taskId);
      const newSelected = isAlreadySelected
        ? currentSelected.filter((id) => id !== taskId)
        : [...currentSelected, taskId];

      return {
        ...prev,
        includeTasks: newSelected.length > 0,
        selectedTaskIds: newSelected.length === tasks.length ? [] : newSelected,
      };
    });
  };

  // Export File (JSON, Encrypted JSON, CSV, Markdown, HTML)
  const handleDownloadMainBackup = async () => {
    try {
      if (enableEncryption) {
        if (!encryptionPassword) {
          setEncryptionError(language === 'fa' ? 'لطفاً رمز عبور را وارد کنید' : 'Please enter an encryption password');
          return;
        }
        if (encryptionPassword !== confirmPassword) {
          setEncryptionError(language === 'fa' ? 'رمز عبور و تکرار آن یکسان نیستند' : 'Passwords do not match');
          return;
        }
        setEncryptionError(null);
        const encryptedStr = await encryptBackupPayload(estimatedInfo.payload, encryptionPassword);
        const blob = new Blob([encryptedStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lally-encrypted-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        downloadBackupFile(estimatedInfo.payload, 'lally-backup');
      }

      setStatusMessage({
        type: 'success',
        text: language === 'fa' ? 'نسخه پشتیبان با موفقیت دانلود شد.' : 'Backup downloaded successfully.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: (language === 'fa' ? 'خطا در خروجی: ' : 'Export error: ') + (e?.message || ''),
      });
    }
  };

  const handleCopyClipboard = async () => {
    try {
      const ok = await copyBackupToClipboard(estimatedInfo.payload);
      if (ok) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
        setStatusMessage({
          type: 'success',
          text: language === 'fa' ? 'اطلاعات در کلیپ‌بورد کپی شد!' : 'Backup copied to clipboard!',
        });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' ? 'خطا در کپی کلیپ‌بورد.' : 'Failed to copy to clipboard.',
      });
    }
  };

  // Snapshot Handlers
  const handleCreateSnapshot = () => {
    setIsCreatingSnapshot(true);
    try {
      const snap = saveBackupSnapshot(
        snapshotLabelInput.trim() || undefined,
        estimatedInfo.payload
      );
      if (snap) {
        // Persist tag to storage after snapshot creation
        const existing = getBackupSnapshots();
        const tagged = existing.map((s) => s.id === snap.id ? { ...s, tag: snapshotTagInput } : s);
        safeStorage.setItem('lally_backup_snapshots', JSON.stringify(tagged));
      }
      setSnapshots(getBackupSnapshots());
      setSnapshotLabelInput('');
      setSnapshotSuccessMsg(
        language === 'fa'
          ? `نقطه بازیابی "${snap.name}" با موفقیت ذخیره شد.`
          : `Snapshot "${snap.name}" saved successfully.`
      );
      setTimeout(() => setSnapshotSuccessMsg(null), 3500);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' ? 'خطا در ثبت نقطه بازیابی.' : 'Failed to save snapshot.',
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = deleteBackupSnapshot(id);
    setSnapshots(updated);
  };

  const handleClearAllSnapshots = () => {
    if (
      window.confirm(
        language === 'fa'
          ? 'آیا مطمئنید که می‌خواهید تمام نقاط بازیابی ذخیره‌شده را پاک کنید؟'
          : 'Are you sure you want to clear all local snapshots?'
      )
    ) {
      clearAllBackupSnapshots();
      setSnapshots([]);
    }
  };

  const handlePreviewSnapshotDiff = (snap: BackupSnapshotRecord) => {
    const parsed = parseAndValidateBackup(snap.payload);
    if (parsed.valid) {
      const diff = compareBackupWithCurrent(parsed, { habits, tasks, wallet });
      setPreviewingSnapshotDiff({ snap, diff });
    }
  };

  const handleRestoreFromSnapshot = (snap: BackupSnapshotRecord) => {
    const parsed = parseAndValidateBackup(snap.payload);
    if (parsed.valid) {
      setPendingParsedBackup(parsed);
      const diff = compareBackupWithCurrent(parsed, { habits, tasks, wallet });
      setDiffComparison(diff);
      setPreviewingSnapshotDiff(null);
    } else {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' ? 'داده‌های این نقطه بازیابی نامعتبر است.' : 'Snapshot data is corrupted.',
      });
    }
  };

  // Upload & File Drop Handlers
  const handleProcessFileContent = (content: string) => {
    try {
      // Check if file is password protected / encrypted
      if (content.includes('"_lally_encrypted": true') || content.includes('"_lally_encrypted":true')) {
        setEncryptedRawFileContent(content);
        setDecryptError(null);
        setPendingParsedBackup(null);
        return;
      }

      const parsed = parseAndValidateBackup(content);
      if (parsed.valid) {
        setPendingParsedBackup(parsed);
        const diff = compareBackupWithCurrent(parsed, { habits, tasks, wallet });
        setDiffComparison(diff);
        setEncryptedRawFileContent(null);
        setStatusMessage(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: (language === 'fa' ? 'فایل نامعتبر است: ' : 'Invalid backup file: ') + (parsed.errors.join(', ') || 'Unknown format'),
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: (language === 'fa' ? 'خطا در خواندن فایل: ' : 'File parse error: ') + (err?.message || ''),
      });
    }
  };

  const handleDecryptAndLoad = async () => {
    if (!encryptedRawFileContent) return;
    if (!decryptPasswordInput) {
      setDecryptError(language === 'fa' ? 'لطفاً رمز عبور را وارد کنید' : 'Please enter the decryption password');
      return;
    }
    try {
      const decrypted = await decryptBackupPayload(encryptedRawFileContent, decryptPasswordInput);
      const parsed = parseAndValidateBackup(decrypted);
      if (parsed.valid) {
        setPendingParsedBackup(parsed);
        const diff = compareBackupWithCurrent(parsed, { habits, tasks, wallet });
        setDiffComparison(diff);
        setEncryptedRawFileContent(null);
        setDecryptPasswordInput('');
        setDecryptError(null);
      } else {
        setDecryptError(language === 'fa' ? 'داده‌های استخراج‌شده ساختار معتبری ندارند' : 'Decrypted data is invalid');
      }
    } catch (err: any) {
      setDecryptError(language === 'fa' ? 'رمز عبور اشتباه است یا فایل دستکاری شده است' : 'Incorrect password or corrupted file');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) handleProcessFileContent(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) handleProcessFileContent(content);
    };
    reader.readAsText(file);
  };

  // Execution of Restore
  const handleExecuteRestore = () => {
    if (!pendingParsedBackup || !pendingParsedBackup.valid) return;
    try {
      const result = executeSelectiveRestore(
        pendingParsedBackup,
        restoreOptions,
        {
          habits,
          tasks,
          wallet: wallet || {
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
          },
          telegramConfig,
          language,
          theme,
          advancedSettings,
          customNovels,
          customMovies,
          customPlaylists,
          deletedMovieIds,
          deletedPlaylistIds,
          deletedNovelIds,
        }
      );

      // Trigger habit and settings update
      onRestoreHabits(result.restoredHabits, result.restoredSettings);

      setStatusMessage({
        type: 'success',
        text:
          language === 'fa'
            ? `بازیابی موفقیت‌آمیز بود! (${result.restoredHabits.length} عادت، ${result.restoredSettings.tasks?.length || 0} تسک به روز شد)`
            : `Restore completed! (${result.restoredHabits.length} habits, ${result.restoredSettings.tasks?.length || 0} tasks updated)`,
      });

      setPendingParsedBackup(null);
      setDiffComparison(null);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: (language === 'fa' ? 'خطا در بازیابی: ' : 'Restore error: ') + (e?.message || ''),
      });
    }
  };

  // Test dedicated backup bot connection
  const handleTestBackupBot = async () => {
    const token = tempBackupBotToken.trim();
    const chat = tempBackupChatId.trim();
    if (!token || !chat) {
      setBackupBotTestResult({
        ok: false,
        message: language === 'fa' ? 'لطفاً ابتدا توکن ربات و شناسه چت را وارد کنید.' : 'Please enter bot token and chat ID first.',
      });
      return;
    }
    setIsTestingBackupBot(true);
    setBackupBotTestResult(null);
    try {
      const res = await fetch('/api/telegram/test-backup-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: token,
          chatId: chat,
          language,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUpdateTelegramConfig({
          ...telegramConfig,
          backupBotToken: token,
          backupChatId: chat,
          useDedicatedBackupBot: true,
        });
        setBackupBotTestResult({
          ok: true,
          message: data.message || (language === 'fa' ? 'اتصال ربات با موفقیت برقرار شد و ذخیره گردید!' : 'Bot connection verified and saved!'),
        });
      } else {
        setBackupBotTestResult({
          ok: false,
          message: data.error || (language === 'fa' ? 'خطا در اتصال به ربات' : 'Bot test failed'),
        });
      }
    } catch (err: any) {
      setBackupBotTestResult({
        ok: false,
        message: err.message || (language === 'fa' ? 'خطای شبکه در تست ربات' : 'Network error'),
      });
    } finally {
      setIsTestingBackupBot(false);
    }
  };

  // Telegram Manual Push (Supports dedicated bot, selected format & password encryption)
  const handleSendBackupToTelegramNow = async () => {
    const activeToken = (tempUseDedicatedBackupBot && tempBackupBotToken?.trim())
      ? tempBackupBotToken.trim()
      : telegramConfig.botToken?.trim();
    const activeChat = (tempUseDedicatedBackupBot && tempBackupChatId?.trim())
      ? tempBackupChatId.trim()
      : telegramConfig.chatId?.trim();

    if (!activeToken || !activeChat) {
      setStatusMessage({
        type: 'error',
        text:
          language === 'fa'
            ? (tempUseDedicatedBackupBot
                ? 'لطفاً ابتدا توکن و شناسه چت ربات اختصاصی پشتیبان‌گیری را وارد کنید.'
                : 'لطفاً ابتدا توکن ربات و شناسه چت را در تب تنظیمات تلگرام وارد کنید.')
            : 'Please configure your Telegram Bot Token & Chat ID first.',
      });
      return;
    }

    setIsSendingBackup(true);
    try {
      const format = tempBackupFormat || 'json_standard';
      const isEncrypted = format === 'json_encrypted' && !!tempBackupEncryptionPassword;
      const isSanitized = format === 'json_sanitized';

      const dateStr = new Date().toISOString().slice(0, 10);
      let rawContent: string | undefined = undefined;
      let customFileName = `scientific-habit-tracker-backup-${dateStr}.json`;

      if (isEncrypted) {
        rawContent = await encryptBackupPayload(estimatedInfo.payload, tempBackupEncryptionPassword);
        customFileName = `scientific-habit-tracker-encrypted-${dateStr}.json`;
      } else if (isSanitized) {
        customFileName = `scientific-habit-tracker-clean-${dateStr}.json`;
      }

      const res = await fetch('/api/telegram/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: activeToken,
          chatId: activeChat,
          fullBackupData: estimatedInfo.payload,
          rawContent,
          customFileName,
          habits,
          language,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const nowFormatted = new Date().toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US');
        onUpdateTelegramConfig({
          ...telegramConfig,
          lastBackupSentDate: nowFormatted,
          lastBackupTimestamp: Date.now(),
          lastBackupStatus: 'success',
          lastBackupError: undefined,
          totalAutoBackupsSent: (telegramConfig.totalAutoBackupsSent || 0) + 1,
        });
        setStatusMessage({
          type: 'success',
          text: language === 'fa' ? 'نسخه پشتیبان با موفقیت به تلگرام ارسال شد! 🚀' : 'Backup dispatched to Telegram successfully! 🚀',
        });
      } else {
        throw new Error(data.error || 'Telegram API Error');
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: (language === 'fa' ? 'خطا در ارسال به تلگرام: ' : 'Telegram dispatch failed: ') + (err?.message || ''),
      });
    } finally {
      setIsSendingBackup(false);
    }
  };

  // Active non-deleted novels
  const activeNovels = useMemo(() => {
    const delNovelSet = new Set(deletedNovelIds);
    return customNovels.filter((n) => !delNovelSet.has(n.id));
  }, [customNovels, deletedNovelIds]);

  const totalNovelChapters = useMemo(() => {
    return activeNovels.reduce((acc, n) => acc + (n.chapters?.length || n.totalChapters || 0), 0);
  }, [activeNovels]);

  // Export Novel ZIP Archive directly
  const handleExportNovelZip = async () => {
    if (activeNovels.length === 0) {
      setNovelZipStatusResult({
        ok: false,
        message: language === 'fa' ? 'هیچ رمانی در کتابخانه برای پشتیبان‌گیری وجود ندارد.' : 'No novels in library to backup.',
      });
      return;
    }

    try {
      setIsExportingNovelZip(true);
      setNovelZipStatusResult(null);
      setNovelZipProgressMsg(language === 'fa' ? 'در حال فشرده‌سازی فصول و ایجاد فایل ZIP...' : 'Compressing chapters and creating ZIP...');

      const { blob: zipBlob, sizeStr } = await createNovelsZipBlob(activeNovels, {
        wallet: novelIncludeReadingProgress ? wallet : undefined,
        includeReadingProgress: novelIncludeReadingProgress,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      downloadNovelZipFile(zipBlob, `novels-library-${todayStr}.zip`);

      setNovelZipStatusResult({
        ok: true,
        message: language === 'fa'
          ? `فایل ZIP با موفقیت دانلود شد (${sizeStr} شامل ${activeNovels.length} رمان و ${totalNovelChapters} فصل).`
          : `ZIP archive downloaded (${sizeStr} with ${activeNovels.length} novels and ${totalNovelChapters} chapters).`,
      });
    } catch (err: any) {
      setNovelZipStatusResult({
        ok: false,
        message: err?.message || (language === 'fa' ? 'خطا در ایجاد فایل فشرده ZIP' : 'Error generating ZIP archive'),
      });
    } finally {
      setIsExportingNovelZip(false);
      setNovelZipProgressMsg(null);
    }
  };

  // Send Novel ZIP Archive to Telegram (Dedicated Bot or Primary Bot)
  const handleSendNovelZipToTelegram = async () => {
    if (activeNovels.length === 0) {
      setNovelZipStatusResult({
        ok: false,
        message: language === 'fa' ? 'هیچ رمانی در کتابخانه برای ارسال وجود ندارد.' : 'No novels in library to send.',
      });
      return;
    }

    const activeToken = (tempUseDedicatedBackupBot && tempBackupBotToken?.trim())
      ? tempBackupBotToken.trim()
      : telegramConfig.botToken?.trim();
    const activeChat = (tempUseDedicatedBackupBot && tempBackupChatId?.trim())
      ? tempBackupChatId.trim()
      : telegramConfig.chatId?.trim();

    if (!activeToken || !activeChat) {
      setNovelZipStatusResult({
        ok: false,
        message: language === 'fa'
          ? (tempUseDedicatedBackupBot
              ? 'لطفاً ابتدا توکن و شناسه چت ربات اختصاصی پشتیبان‌گیری را در بخش بالا وارد کنید.'
              : 'لطفاً ابتدا توکن ربات و شناسه چت را در تب تنظیمات تلگرام وارد کنید.')
          : 'Please configure Telegram Bot Token & Chat ID first.',
      });
      return;
    }

    try {
      setIsSendingNovelZipTelegram(true);
      setNovelZipStatusResult(null);
      setNovelZipProgressMsg(language === 'fa' ? 'در حال فشرده‌سازی فصول رمان و ارسال به تلگرام...' : 'Compressing novels and sending to Telegram...');

      const { blob: zipBlob } = await createNovelsZipBlob(activeNovels, {
        wallet: novelIncludeReadingProgress ? wallet : undefined,
        includeReadingProgress: novelIncludeReadingProgress,
      });

      // Convert Blob to base64
      const arrayBuffer = await zipBlob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const zipBase64 = btoa(binary);
      const todayStr = new Date().toISOString().split('T')[0];

      const res = await fetch('/api/telegram/backup/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: activeToken,
          chatId: activeChat,
          novels: activeNovels,
          wallet: novelIncludeReadingProgress ? wallet : undefined,
          includeProgress: novelIncludeReadingProgress,
          zipBase64,
          customFileName: `novels-library-${todayStr}.zip`,
          language,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNovelZipStatusResult({
          ok: true,
          message: language === 'fa'
            ? `فایل فشرده رمان‌ها با موفقیت به تلگرام ارسال شد (${data.sizeStr || ''} - ${activeNovels.length} رمان).`
            : `Novel ZIP archive sent to Telegram (${data.sizeStr || ''} - ${activeNovels.length} novels).`,
        });
        onUpdateTelegramConfig({
          ...telegramConfig,
          lastNovelBackupSentDate: todayStr,
          lastNovelBackupTimestamp: Date.now(),
          lastNovelBackupStatus: 'success',
          lastNovelBackupSize: data.sizeStr,
          totalAutoNovelBackupsSent: (telegramConfig.totalAutoNovelBackupsSent || 0) + 1,
        });
      } else {
        setNovelZipStatusResult({
          ok: false,
          message: data.error || (language === 'fa' ? 'خطا در ارسال فایل زیپ به تلگرام' : 'Failed to send ZIP to Telegram'),
        });
      }
    } catch (err: any) {
      setNovelZipStatusResult({
        ok: false,
        message: err?.message || (language === 'fa' ? 'خطای شبکه در ارتباط با سرور' : 'Network connection error'),
      });
    } finally {
      setIsSendingNovelZipTelegram(false);
      setNovelZipProgressMsg(null);
    }
  };

  // Select Novel ZIP file
  const handleNovelZipFileSelected = async (file: File) => {
    if (!file) return;
    try {
      setIsParsingNovelZip(true);
      setNovelRestoreSuccessMsg(null);
      const result = await parseAndValidateNovelsZip(file);
      setParsedNovelZipResult(result);
    } catch (err: any) {
      setParsedNovelZipResult({
        valid: false,
        novels: [],
        totalChapters: 0,
        totalWords: 0,
        errors: [err?.message || (language === 'fa' ? 'خطا در بازگشایی فایل زیپ' : 'Failed to parse ZIP file')],
      });
    } finally {
      setIsParsingNovelZip(false);
    }
  };

  // Restore/Import Novels from parsed ZIP
  const handleApplyNovelZipRestore = async () => {
    if (!parsedNovelZipResult || !parsedNovelZipResult.valid || parsedNovelZipResult.novels.length === 0) {
      return;
    }

    try {
      setIsRestoringNovelZip(true);
      const incomingNovels = parsedNovelZipResult.novels;

      let mergedNovels: WebNovel[] = [];
      if (novelRestoreMode === 'replace') {
        mergedNovels = incomingNovels;
      } else {
        // Merge mode: existing + incoming (overwrite duplicates by ID)
        const incomingMap = new Map(incomingNovels.map((n) => [n.id, n]));
        const keptExisting = customNovels.map((ex) => {
          if (incomingMap.has(ex.id)) {
            const inc = incomingMap.get(ex.id)!;
            incomingMap.delete(ex.id);
            return inc;
          }
          return ex;
        });
        mergedNovels = [...keptExisting, ...Array.from(incomingMap.values())];
      }

      if (onRestoreNovels) {
        onRestoreNovels(mergedNovels, { merge: novelRestoreMode === 'merge' });
      }

      // Also persist to server storage if available
      try {
        await fetch('/api/store/custom-novels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novels: mergedNovels }),
        });
      } catch (err) {
        console.warn('Server sync error for restored novels:', err);
      }

      setNovelRestoreSuccessMsg(
        language === 'fa'
          ? `تعداد ${incomingNovels.length} رمان با موفقیت بازگردانی و به کتابخانه اضافه شد!`
          : `Successfully restored ${incomingNovels.length} novels to your library!`
      );
      setParsedNovelZipResult(null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || (language === 'fa'
          ? 'خطا در بازگردانی رمان‌ها.'
          : 'Error restoring novels.'),
      });
    } finally {
      setIsRestoringNovelZip(false);
    }
  };

  // Filtered lists for granular selector
  const filteredHabitsList = useMemo(() => {
    if (!habitSearchQuery.trim()) return habits;
    const q = habitSearchQuery.toLowerCase();
    return habits.filter((h) => h.name.toLowerCase().includes(q) || (h.category && h.category.toLowerCase().includes(q)));
  }, [habits, habitSearchQuery]);

  const filteredTasksList = useMemo(() => {
    if (!taskSearchQuery.trim()) return tasks;
    const q = taskSearchQuery.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)));
  }, [tasks, taskSearchQuery]);

  const isHabitSelected = (id: string) => {
    if (!selectedOptions.includeHabits) return false;
    if (!selectedOptions.selectedHabitIds || selectedOptions.selectedHabitIds.length === 0) return true;
    return selectedOptions.selectedHabitIds.includes(id);
  };

  const isTaskSelected = (id: string) => {
    if (!selectedOptions.includeTasks) return false;
    if (!selectedOptions.selectedTaskIds || selectedOptions.selectedTaskIds.length === 0) return true;
    return selectedOptions.selectedTaskIds.includes(id);
  };

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner & Status Toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-in fade-in transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: GRANULAR SELECTIVE EXPORT ENGINE                    */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-700 text-white flex items-center justify-center border dark:border-indigo-600 shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{language === 'fa' ? 'مرکز تولید نسخه پشتیبان هوشمند' : 'Smart Selective Backup Center'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                  {estimatedInfo.size}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'انتخاب دقیق بخش‌ها و آیتم‌های مورد نظر برای ایجاد فایل پشتیبان سفارشی'
                  : 'Select exact modules, habits, and tasks to include in your backup package.'}
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleApplyPreset('recommended')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePreset === 'recommended'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {language === 'fa' ? 'پیشنهادی' : 'Recommended'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('habits_only')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePreset === 'habits_only'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {language === 'fa' ? 'فقط عادات' : 'Habits Only'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('productivity')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePreset === 'productivity'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {language === 'fa' ? 'بهره‌وری' : 'Productivity'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('full')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                activePreset === 'full'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {language === 'fa' ? 'کامل' : 'Full'}
            </button>
          </div>
        </div>

        {/* Granular Module Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {/* Habits Checkbox + Sub-picker toggle */}
          <div
            className={`p-3 rounded-xl border transition flex flex-col justify-between ${
              selectedOptions.includeHabits
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
                <input
                  type="checkbox"
                  checked={selectedOptions.includeHabits}
                  onChange={() => handleToggleOption('includeHabits')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'fa' ? 'عادات و تاریخچه ثبت‌ها' : 'Habits & Check-ins'}</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {formatNumber(habits.length, language)}
              </span>
            </div>
            {selectedOptions.includeHabits && habits.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHabitPicker(!showHabitPicker)}
                className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
              >
                <span>
                  {selectedOptions.selectedHabitIds && selectedOptions.selectedHabitIds.length > 0
                    ? `${formatNumber(selectedOptions.selectedHabitIds.length, language)} ${language === 'fa' ? 'عادت انتخابی' : 'selected'}`
                    : language === 'fa' ? 'همه عادات (فیلتر آیتمی)' : 'All habits (filter)'}
                </span>
                {showHabitPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Tasks Checkbox + Sub-picker toggle */}
          <div
            className={`p-3 rounded-xl border transition flex flex-col justify-between ${
              selectedOptions.includeTasks
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
                <input
                  type="checkbox"
                  checked={selectedOptions.includeTasks}
                  onChange={() => handleToggleOption('includeTasks')}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                <span>{language === 'fa' ? 'تسک‌ها و برنامه‌ریزی' : 'Tasks & Subtasks'}</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {formatNumber(tasks.length, language)}
              </span>
            </div>
            {selectedOptions.includeTasks && tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
              >
                <span>
                  {selectedOptions.selectedTaskIds && selectedOptions.selectedTaskIds.length > 0
                    ? `${formatNumber(selectedOptions.selectedTaskIds.length, language)} ${language === 'fa' ? 'تسک انتخابی' : 'selected'}`
                    : language === 'fa' ? 'همه تسک‌ها (فیلتر آیتمی)' : 'All tasks (filter)'}
                </span>
                {showTaskPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Pomodoro Sessions */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includePomodoro
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includePomodoro}
                onChange={() => handleToggleOption('includePomodoro')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Timer className="w-3.5 h-3.5 text-rose-500" />
              <span>{language === 'fa' ? 'سوابق فوکوس پومودورو' : 'Pomodoro Sessions'}</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {formatNumber(pomodoroSessions.length, language)}
            </span>
          </div>

          {/* Reward Wallet */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includeWallet
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includeWallet}
                onChange={() => handleToggleOption('includeWallet')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'fa' ? 'کیف پول و سکه‌های پاداش' : 'Wallet & Coins'}</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {formatNumber(wallet?.coins ?? 0, language)} 🪙
            </span>
          </div>

          {/* Preferences & UI Settings */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includePreferences
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includePreferences}
                onChange={() => handleToggleOption('includePreferences')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'fa' ? 'تنظیمات، تم و زبان' : 'Theme & Preferences'}</span>
            </label>
          </div>

          {/* Activity Logs & Neuro-Learning */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includeActivityLogs
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includeActivityLogs}
                onChange={() => handleToggleOption('includeActivityLogs')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>{language === 'fa' ? 'لاگ‌های یادگیری و پیشرفت' : 'Activity & Stats'}</span>
            </label>
          </div>

          {/* AI Keys Toggle */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includeAiKeys
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includeAiKeys}
                onChange={() => handleToggleOption('includeAiKeys')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'fa' ? 'کلیدهای هوش مصنوعی (API Keys)' : 'AI API Keys'}</span>
            </label>
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
              {language === 'fa' ? 'حساس' : 'Secret'}
            </span>
          </div>

          {/* Media & Store Files */}
          <div
            className={`p-3 rounded-xl border transition flex items-center justify-between ${
              selectedOptions.includeMedia
                ? 'bg-white dark:bg-slate-900/90 border-indigo-400 dark:border-indigo-700 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">
              <input
                type="checkbox"
                checked={selectedOptions.includeMedia}
                onChange={() => handleToggleOption('includeMedia')}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <FolderArchive className="w-3.5 h-3.5 text-sky-500" />
              <span>{language === 'fa' ? 'رسانه‌ها و رمان‌ها (سنگین)' : 'Store Media & Novels'}</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {customNovels.length + customMovies.length + customPlaylists.length}
            </span>
          </div>
        </div>

        {/* Expandable Individual Habits Selector Drawer */}
        {showHabitPicker && selectedOptions.includeHabits && habits.length > 0 && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                {language === 'fa' ? 'انتخاب اختصاصی عادات:' : 'Select individual habits:'}
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllHabits}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  {language === 'fa' ? 'انتخاب همه' : 'Select all'}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllHabits}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  {language === 'fa' ? 'لغو انتخاب همه' : 'Deselect all'}
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'fa' ? 'جستجو در عادات...' : 'Search habits...'}
                value={habitSearchQuery}
                onChange={(e) => setHabitSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredHabitsList.map((h) => {
                const checked = isHabitSelected(h.id);
                return (
                  <label
                    key={h.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      checked
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 font-semibold'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleHabitSelection(h.id)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: h.color || '#4f46e5' }}
                    />
                    <span className="truncate flex-1">{h.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable Individual Tasks Selector Drawer */}
        {showTaskPicker && selectedOptions.includeTasks && tasks.length > 0 && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-blue-500" />
                {language === 'fa' ? 'انتخاب اختصاصی تسک‌ها:' : 'Select individual tasks:'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'fa' ? 'جستجو در تسک‌ها...' : 'Search tasks...'}
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredTasksList.map((tItem) => {
                const checked = isTaskSelected(tItem.id);
                return (
                  <label
                    key={tItem.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      checked
                        ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 font-semibold'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleTaskSelection(tItem.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                    />
                    <span className="truncate flex-1">{tItem.title}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Range & Privacy Toolbar */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              {language === 'fa' ? 'بازه زمانی تاریخچه:' : 'History Range:'}
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">{language === 'fa' ? 'تمام دوران (کامل)' : 'All Time'}</option>
              <option value="30days">{language === 'fa' ? '۳۰ روز اخیر' : 'Last 30 Days'}</option>
              <option value="90days">{language === 'fa' ? '۹۰ روز اخیر' : 'Last 90 Days'}</option>
              <option value="365days">{language === 'fa' ? 'یک سال اخیر' : 'Last 1 Year'}</option>
            </select>
          </div>

          {/* Privacy & Encryption Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={sanitizeSecrets}
                onChange={(e) => setSanitizeSecrets(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
              />
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'fa' ? 'حذف خودکار کلیدهای محرمانه' : 'Sanitize Secrets'}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={enableEncryption}
                onChange={(e) => setEnableEncryption(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer"
              />
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'fa' ? 'رمزگذاری امن (AES-256)' : 'Encrypt (AES-256)'}</span>
            </label>
          </div>
        </div>

        {/* Encryption Password Prompt Drawer */}
        {enableEncryption && (
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'تعیین رمز عبور برای قفل نسخه پشتیبان:' : 'Set backup encryption password:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                placeholder={language === 'fa' ? 'رمز عبور امن...' : 'Password...'}
                value={encryptionPassword}
                onChange={(e) => setEncryptionPassword(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <input
                type="password"
                placeholder={language === 'fa' ? 'تکرار رمز عبور...' : 'Confirm password...'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            {encryptionError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{encryptionError}</p>
            )}
          </div>
        )}

        {/* Primary Action Buttons & Format Chooser */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadMainBackup}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {enableEncryption
                  ? language === 'fa' ? 'دانلود فایل رمزگذاری‌شده JSON' : 'Download Encrypted JSON'
                  : language === 'fa' ? 'دانلود فایل پشتیبان (JSON)' : 'Download Backup (JSON)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyClipboard}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {isCopied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? (language === 'fa' ? 'کپی شد!' : 'Copied!') : (language === 'fa' ? 'کپی JSON' : 'Copy JSON')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExportFormats(!showExportFormats)}
              className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-indigo-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-transparent hover:border-indigo-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'سایر فرمت‌ها (Excel / HTML / MD)' : 'More Formats'}</span>
              {showExportFormats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Multi-Format Export Tray */}
        {showExportFormats && (
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 animate-in fade-in">
            {/* CSV Habits */}
            <button
              type="button"
              onClick={() => downloadHabitsCSV(habits, language)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-start transition cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === 'fa' ? 'اکسل / شیت (CSV عادات)' : 'Habits CSV (Excel)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {language === 'fa' ? 'تحلیل زنجیره و خودکارسازی' : 'Streaks & automaticity matrix'}
                </div>
              </div>
            </button>

            {/* CSV Tasks */}
            <button
              type="button"
              onClick={() => downloadTasksCSV(tasks, language)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-start transition cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === 'fa' ? 'اکسل / شیت (CSV تسک‌ها)' : 'Tasks CSV (Excel)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {language === 'fa' ? 'فهرست وظایف و اولویت‌ها' : 'Priorities & subtasks'}
                </div>
              </div>
            </button>

            {/* Interactive HTML Report */}
            <button
              type="button"
              onClick={() => downloadInteractiveHTMLReport(estimatedInfo.payload, language)}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-start transition cursor-pointer flex items-center gap-2"
            >
              <FileCode className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === 'fa' ? 'گزارش مستقل تعاملی HTML' : 'Interactive HTML Report'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {language === 'fa' ? 'اجرا در مرورگر بدون نیاز به اینترنت' : 'Standalone offline browser view'}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: SMART RESTORE & CONFLICT INSPECTOR ENGINE          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center border dark:border-emerald-600 shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {language === 'fa' ? 'بازیابی هوشمند و تحلیل تفاوت‌ها' : 'Smart Restore & Diff Inspector'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'بارگذاری فایل نسخه پشتیبان با پیش‌نمایش تفاوت‌ها قبل از اعمال نهایی'
                  : 'Import your backup file with full diff inspection and merge conflict protection.'}
              </p>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-2xl border-2 border-dashed text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:border-emerald-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileJson className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {language === 'fa'
              ? 'فایل پشتیبان JSON را اینجا بکشید یا برای انتخاب کلیک کنید'
              : 'Drag & drop JSON backup file here, or click to browse'}
          </div>
          <p className="text-[10px] text-slate-400">
            {language === 'fa'
              ? 'پشتیبانی از تمام نسخه‌های پشتیبان لالی و فایل‌های رمزگذاری‌شده'
              : 'Compatible with all Lally backup formats and encrypted packages'}
          </p>
        </div>

        {/* Password Prompt for Encrypted Backup Files */}
        {encryptedRawFileContent && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-800 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>{language === 'fa' ? 'این فایل با رمز عبور محافظت شده است' : 'This backup file is encrypted'}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {language === 'fa'
                ? 'برای بازگشایی و مشاهده محتوای نسخه پشتیبان، لطفاً رمز عبور را وارد کنید:'
                : 'Enter the password used during export to decrypt this backup file:'}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={language === 'fa' ? 'رمز عبور فایل...' : 'Decryption password...'}
                value={decryptPasswordInput}
                onChange={(e) => setDecryptPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDecryptAndLoad()}
                className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleDecryptAndLoad}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{language === 'fa' ? 'رمزگشایی' : 'Unlock'}</span>
              </button>
            </div>
            {decryptError && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{decryptError}</p>
            )}
          </div>
        )}

        {/* Smart Restore Inspector Modal / Drawer */}
        {pendingParsedBackup && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/80 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{language === 'fa' ? 'تحلیل هوشمند فایل ورودی' : 'Backup Inspection & Diff'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {pendingParsedBackup.exportDate || 'Valid schema'}
              </span>
            </div>

            {/* Deep Diff Stats Grid */}
            {diffComparison && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {formatNumber(diffComparison.newHabitsCount, language)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'fa' ? 'عادت کاملاً جدید' : 'New Habits'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatNumber(diffComparison.newCheckInsCount, language)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'fa' ? 'ثبت جدید اضافه شونده' : 'Check-ins to merge'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {formatNumber(diffComparison.newTasksCount, language)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'fa' ? 'تسک‌های جدید' : 'New Tasks'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {formatNumber(pendingParsedBackup.summary.walletCoins, language)} 🪙
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {language === 'fa' ? 'موجودی سکه فایل' : 'Backup Coins'}
                  </div>
                </div>
              </div>
            )}

            {/* Restore Target Checkboxes */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'fa' ? 'انتخاب بخش‌های مورد نظر جهت بازیابی:' : 'Select sections to restore:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreHabits}
                    onChange={(e) => setRestoreOptions((prev) => ({ ...prev, restoreHabits: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'عادات' : 'Habits'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreTasks}
                    onChange={(e) => setRestoreOptions((prev) => ({ ...prev, restoreTasks: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'تسک‌ها' : 'Tasks'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restorePomodoro}
                    onChange={(e) => setRestoreOptions((prev) => ({ ...prev, restorePomodoro: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'پومودورو' : 'Pomodoro'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restoreWallet}
                    onChange={(e) => setRestoreOptions((prev) => ({ ...prev, restoreWallet: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'کیف پول و سکه' : 'Wallet'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restoreOptions.restorePreferences}
                    onChange={(e) => setRestoreOptions((prev) => ({ ...prev, restorePreferences: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'تنظیمات و تم' : 'Preferences'}</span>
                </label>
              </div>
            </div>

            {/* Mode: Smart Merge vs Full Replace */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'fa' ? 'نحوه اعمال داده‌ها:' : 'Restore Mode:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreOptions((prev) => ({ ...prev, mode: 'merge' }))}
                  className={`p-2.5 rounded-xl border text-start transition cursor-pointer ${
                    restoreOptions.mode === 'merge'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{language === 'fa' ? 'ادغام هوشمند (پیشنهادی)' : 'Smart Merge (Recommended)'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'fa'
                      ? 'عادات و تاریخچه‌ها بدون حذف موارد فعلی با یکدیگر ترکیب می‌شوند.'
                      : 'Combines new items with your existing habits and records.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreOptions((prev) => ({ ...prev, mode: 'replace' }))}
                  className={`p-2.5 rounded-xl border text-start transition cursor-pointer ${
                    restoreOptions.mode === 'replace'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-xs'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'fa' ? 'جایگزینی کامل (Full Replace)' : 'Full Replace'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'fa'
                      ? 'بخش‌های انتخاب‌شده دقیقاً با محتوای این فایل بازنویسی می‌شوند.'
                      : 'Overwrites selected sections with the backup file data.'}
                  </p>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPendingParsedBackup(null);
                  setDiffComparison(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'fa' ? 'تأیید و اجرای بازیابی' : 'Confirm & Restore'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: LOCAL SNAPSHOTS & RESTORE POINTS ENGINE            */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 dark:bg-purple-700 text-white flex items-center justify-center border dark:border-purple-600 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>{language === 'fa' ? 'نقاط بازیابی سریع محلی (Snapshots)' : 'Instant Local Snapshots'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-900">
                  {formatNumber(snapshots.length, language)}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'ذخیره و بازیابی فوری وضعیت کامل اپلیکیشن در حافظه داخلی مرورگر'
                  : 'Capture and restore instant snapshots directly in local browser storage.'}
              </p>
            </div>
          </div>

          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllSnapshots}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{language === 'fa' ? 'پاکسازی همه' : 'Clear all'}</span>
            </button>
          )}
        </div>

        {snapshotSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-semibold">
            {snapshotSuccessMsg}
          </div>
        )}

        {/* Snapshot Creation Form */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <input
            type="text"
            placeholder={language === 'fa' ? 'عنوان نقطه بازیابی (مثال: قبل از ثبت عادات جدید)' : 'Snapshot label (optional)...'}
            value={snapshotLabelInput}
            onChange={(e) => setSnapshotLabelInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
          />
          <select
            value={snapshotTagInput}
            onChange={(e) => setSnapshotTagInput(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="manual">{language === 'fa' ? 'دستی' : 'Manual'}</option>
            <option value="milestone">{language === 'fa' ? 'نقطه عطف' : 'Milestone'}</option>
            <option value="pre_update">{language === 'fa' ? 'قبل از تغییر' : 'Pre-update'}</option>
          </select>
          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isCreatingSnapshot}
            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'ایجاد نقطه بازیابی' : 'Create Snapshot'}</span>
          </button>
        </div>

        {/* Snapshots List */}
        {snapshots.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs">
            {language === 'fa' ? 'هنوز هیچ نقطه بازیابی محلی ثبت نشده است.' : 'No local snapshots created yet.'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {snap.name || snap.label}
                    </span>
                    {snap.tag && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                        {snap.tag === 'milestone'
                          ? language === 'fa' ? 'نقطه عطف' : 'Milestone'
                          : snap.tag === 'pre_update'
                          ? language === 'fa' ? 'قبل از تغییر' : 'Pre-update'
                          : language === 'fa' ? 'دستی' : 'Manual'}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {snap.dateStr} {snap.timeStr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{formatNumber(snap.habitsCount || snap.habitCount || 0, language)} {language === 'fa' ? 'عادت' : 'habits'}</span>
                    <span>•</span>
                    <span>{formatNumber(snap.tasksCount || snap.taskCount || 0, language)} {language === 'fa' ? 'تسک' : 'tasks'}</span>
                    <span>•</span>
                    <span>{formatNumber(snap.walletCoins, language)} 🪙</span>
                    <span>•</span>
                    <span className="font-mono">{snap.formattedSize || snap.size}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePreviewSnapshotDiff(snap)}
                    title={language === 'fa' ? 'مشاهده تفاوت‌ها' : 'Inspect Diff'}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestoreFromSnapshot(snap)}
                    title={language === 'fa' ? 'بازیابی این نسخه' : 'Restore'}
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBackupFile(snap.payload || snap.data, `snapshot-${snap.name || snap.label}`)}
                    title={language === 'fa' ? 'دانلود فایل JSON' : 'Download JSON'}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSnapshot(snap.id)}
                    title={language === 'fa' ? 'حذف' : 'Delete'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Snapshot Diff Modal */}
        {previewingSnapshotDiff && (
          <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                {language === 'fa' ? `تفاوت‌های نقطه "${previewingSnapshotDiff.snap.name}" با وضعیت کنونی:` : `Diff comparison with current data:`}
              </span>
              <button
                type="button"
                onClick={() => setPreviewingSnapshotDiff(null)}
                className="text-xs text-purple-700 hover:underline cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                <div className="font-bold text-purple-700 dark:text-purple-300">
                  {previewingSnapshotDiff.diff.totalIncomingHabits}
                </div>
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'عادت در نقطه' : 'Habits'}</div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{previewingSnapshotDiff.diff.newCheckInsCount}
                </div>
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'ثبت‌های قابل ادغام' : 'Check-ins'}</div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                <div className="font-bold text-blue-600 dark:text-blue-400">
                  {previewingSnapshotDiff.diff.totalIncomingTasks}
                </div>
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'تسک‌ها' : 'Tasks'}</div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900">
                <div className="font-bold text-amber-600 dark:text-amber-400">
                  {previewingSnapshotDiff.snap.walletCoins} 🪙
                </div>
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'سکه' : 'Coins'}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleRestoreFromSnapshot(previewingSnapshotDiff.snap)}
                className="px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition cursor-pointer"
              >
                {language === 'fa' ? 'بارگذاری جهت بازیابی' : 'Load for restore'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 4: AUTOMATED TELEGRAM CLOUD BACKUP & DEDICATED BOT   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center border dark:border-blue-500 shadow-xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {t.autoBackupTelegramSection}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'ارسال خودکار، زمان‌بندی‌شده و ایمن فایل‌های پشتیبان به تلگرام با قابلیت ربات اختصاصی'
                  : 'Automated, scheduled & secure backup delivery to Telegram with dedicated bot support'}
              </p>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-SECTION 4.1: DEDICATED BACKUP BOT CONFIGURATION           */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t.dedicatedBackupBotTitle}
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  {t.dedicatedBackupBotDesc}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="dedicated-backup-bot-toggle"
                type="checkbox"
                checked={tempUseDedicatedBackupBot}
                onChange={(e) => setTempUseDedicatedBackupBot(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {tempUseDedicatedBackupBot ? (
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.backupBotTokenLabel}:
                </label>
                <div className="relative">
                  <input
                    id="backup-bot-token-input"
                    type={showBackupBotToken ? 'text' : 'password'}
                    value={tempBackupBotToken}
                    onChange={(e) => setTempBackupBotToken(e.target.value)}
                    placeholder={t.backupBotTokenPlaceholder}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBackupBotToken(!showBackupBotToken)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showBackupBotToken ? 'Hide token' : 'Show token'}
                  >
                    {showBackupBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.backupChatIdLabel}:
                </label>
                <input
                  id="backup-chat-id-input"
                  type="text"
                  value={tempBackupChatId}
                  onChange={(e) => setTempBackupChatId(e.target.value)}
                  placeholder={t.backupChatIdPlaceholder}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  id="test-backup-bot-btn"
                  type="button"
                  onClick={handleTestBackupBot}
                  disabled={isTestingBackupBot || !tempBackupBotToken.trim() || !tempBackupChatId.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTestingBackupBot ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Radio className="w-3.5 h-3.5" />
                  )}
                  <span>{t.testBackupBotBtn}</span>
                </button>

                {backupBotTestResult && (
                  <div
                    className={`text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium ${
                      backupBotTestResult.ok
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {backupBotTestResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{backupBotTestResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                {language === 'fa'
                  ? `از ربات اصلی برنامه (${telegramConfig.botToken ? 'تنظیم شده' : 'تنظیم نشده در تب تلگرام'}) جهت ارسال بکاپ استفاده می‌شود.`
                  : `Primary app bot will be used for backup dispatches (${telegramConfig.botToken ? 'Configured' : 'Not configured'}).`}
              </span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-SECTION 4.2: AUTOMATED DISPATCH SCHEDULE CONFIGURATION    */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 space-y-3">
          {/* Toggle switch for auto-backup */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
              <input
                id="auto-backup-telegram-toggle"
                type="checkbox"
                checked={tempAutoBackup}
                onChange={(e) => setTempAutoBackup(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 dark:accent-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>{t.autoBackupToggle}</span>
            </label>

            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                tempAutoBackup
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {tempAutoBackup ? t.statusActiveScheduled : t.statusDisabled}
            </span>
          </div>

          {tempAutoBackup && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
              {/* Interval selector (Daily, Every 3 Days, Weekly, Monthly) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  {t.backupIntervalLabel}:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempBackupInterval('daily')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                      tempBackupInterval === 'daily'
                        ? 'bg-blue-50 dark:bg-slate-800 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:dark:bg-slate-900'
                    }`}
                  >
                    {t.intervalDaily}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempBackupInterval('every_3_days')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                      tempBackupInterval === 'every_3_days'
                        ? 'bg-blue-50 dark:bg-slate-800 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:dark:bg-slate-900'
                    }`}
                  >
                    {t.intervalEvery3Days}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempBackupInterval('weekly')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                      tempBackupInterval === 'weekly'
                        ? 'bg-blue-50 dark:bg-slate-800 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:dark:bg-slate-900'
                    }`}
                  >
                    {t.intervalWeekly}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempBackupInterval('monthly')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                      tempBackupInterval === 'monthly'
                        ? 'bg-blue-50 dark:bg-slate-800 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:dark:bg-slate-900'
                    }`}
                  >
                    {t.intervalMonthly}
                  </button>
                </div>
              </div>

              {/* Conditional Day Picker for Weekly */}
              {tempBackupInterval === 'weekly' && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t.backupDayOfWeekLabel}:</span>
                  </div>
                  <select
                    value={tempBackupDayOfWeek}
                    onChange={(e) => setTempBackupDayOfWeek(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value={6}>{language === 'fa' ? 'شنبه (Saturday)' : 'Saturday'}</option>
                    <option value={0}>{language === 'fa' ? 'یکشنبه (Sunday)' : 'Sunday'}</option>
                    <option value={1}>{language === 'fa' ? 'دوشنبه (Monday)' : 'Monday'}</option>
                    <option value={2}>{language === 'fa' ? 'سه‌شنبه (Tuesday)' : 'Tuesday'}</option>
                    <option value={3}>{language === 'fa' ? 'چهارشنبه (Wednesday)' : 'Wednesday'}</option>
                    <option value={4}>{language === 'fa' ? 'پنج‌شنبه (Thursday)' : 'Thursday'}</option>
                    <option value={5}>{language === 'fa' ? 'جمعه (Friday)' : 'Friday'}</option>
                  </select>
                </div>
              )}

              {/* Conditional Day Picker for Monthly */}
              {tempBackupInterval === 'monthly' && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t.backupDayOfMonthLabel}:</span>
                  </div>
                  <select
                    value={tempBackupDayOfMonth}
                    onChange={(e) => setTempBackupDayOfMonth(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {language === 'fa' ? `روز ${day} هر ماه` : `Day ${day} of each month`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Backup Delivery Time */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{t.backupTimeLabel}:</span>
                </div>
                <input
                  type="time"
                  value={tempBackupTime}
                  onChange={(e) => setTempBackupTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-slate-700"
                />
              </div>

              {/* Backup Format & Security */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.backupFormatLabel}:</span>
                  </label>
                  <select
                    value={tempBackupFormat}
                    onChange={(e) => setTempBackupFormat(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="json_standard">{t.backupFormatStandard}</option>
                    <option value="json_encrypted">{t.backupFormatEncrypted}</option>
                    <option value="json_sanitized">{t.backupFormatSanitized}</option>
                  </select>
                </div>

                {tempBackupFormat === 'json_encrypted' && (
                  <div className="pt-1.5 animate-in fade-in">
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={tempBackupEncryptionPassword}
                        onChange={(e) => setTempBackupEncryptionPassword(e.target.value)}
                        placeholder={t.backupEncryptionPassPlaceholder}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-SECTION 4.3: REAL-TIME MONITORING & ACTION BAR            */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.lastBackupSentLabel}</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {telegramConfig.lastBackupSentDate || t.neverSent}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.totalAutoBackupsLabel}</div>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {telegramConfig.totalAutoBackupsSent || 0}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.backupStatusLabel}</div>
              <div
                className={`text-[11px] font-bold mt-0.5 ${
                  telegramConfig.lastBackupStatus === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : telegramConfig.lastBackupStatus === 'failed'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {telegramConfig.lastBackupStatus === 'success'
                  ? 'موفق (Success)'
                  : telegramConfig.lastBackupStatus === 'failed'
                  ? 'ناموفق (Failed)'
                  : 'آماده (Ready)'}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <button
              id="send-backup-telegram-now-btn"
              type="button"
              onClick={handleSendBackupToTelegramNow}
              disabled={isSendingBackup}
              className="py-2.5 px-4 rounded-xl bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingBackup ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-slate-200" />
              )}
              <span>{isSendingBackup ? t.sendingBackup : t.sendBackupNowBtn}</span>
            </button>

            <span className="text-[10.5px] text-slate-400 dark:text-slate-500 self-center text-center sm:text-right">
              {tempUseDedicatedBackupBot
                ? (language === 'fa' ? 'ارسال از طریق ربات اختصاصی بکاپ' : 'Dispatch via dedicated backup bot')
                : (language === 'fa' ? 'ارسال از طریق ربات اصلی' : 'Dispatch via primary app bot')}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 5: NOVEL-SPECIFIC COMPRESSED ZIP BACKUP & TELEGRAM DISPATCH */}
      {/* ================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{language === 'fa' ? 'پشتیبان‌گیری اختصاصی رمان‌ها (ZIP Archive & Bot)' : 'Novel ZIP Archive & Telegram Backup'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200">
                  {language === 'fa' ? 'فشرده‌سازی حداکثری' : 'Max Compression'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'تهیه فایل زیپ کم‌حجم از تمام فصول، ارسال دوره‌ای به ربات تلگرام و بازیابی سریع'
                  : 'High-ratio ZIP backup of all novel chapters, scheduled Telegram bot dispatch, and fast restore'}
              </p>
            </div>
          </div>

          {/* Quick Library Stats */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shadow-2xs">
              <Library className="w-3.5 h-3.5" />
              <span>{activeNovels.length} {language === 'fa' ? 'رمان' : 'novels'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
              {totalNovelChapters} {language === 'fa' ? 'فصل' : 'ch.'}
            </span>
          </div>
        </div>

        {/* Novel ZIP Status / Progress Alert */}
        {novelZipStatusResult && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in transition-all ${
              novelZipStatusResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {novelZipStatusResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="flex-1">{novelZipStatusResult.message}</span>
            <button
              type="button"
              onClick={() => setNovelZipStatusResult(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {novelRestoreSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="flex-1">{novelRestoreSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setNovelRestoreSuccessMsg(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* NOVEL SUB-SECTION 5.1: MANUAL EXPORT & TELEGRAM DISPATCH      */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'fa' ? 'تهیه فوری نسخه پشتیبان رمان‌ها (ZIP)' : 'Instant Novel ZIP Backup'}
              </span>
            </div>

            <label className="flex items-center gap-2 text-[11.5px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={novelIncludeReadingProgress}
                onChange={(e) => setNovelIncludeReadingProgress(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
              />
              <span>{language === 'fa' ? 'ذخیره پیشرفت مطالعه و فصول باز شده' : 'Include reading progress & unlocked chapters'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Download ZIP Button */}
            <button
              id="download-novels-zip-btn"
              type="button"
              onClick={handleExportNovelZip}
              disabled={isExportingNovelZip || activeNovels.length === 0}
              className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isExportingNovelZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>
                {isExportingNovelZip
                  ? (language === 'fa' ? 'در حال فشرده‌سازی...' : 'Compressing...')
                  : (language === 'fa' ? 'دانلود فایل فشرده ZIP رمان‌ها' : 'Download Novels ZIP Archive')}
              </span>
            </button>

            {/* Send ZIP to Telegram Button */}
            <button
              id="send-novels-zip-telegram-btn"
              type="button"
              onClick={handleSendNovelZipToTelegram}
              disabled={isSendingNovelZipTelegram || activeNovels.length === 0}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingNovelZipTelegram ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-indigo-200" />
              )}
              <span>
                {isSendingNovelZipTelegram
                  ? (language === 'fa' ? 'در حال ارسال به تلگرام...' : 'Sending to Telegram...')
                  : (language === 'fa' ? 'ارسال فایل ZIP به ربات تلگرام' : 'Send Novels ZIP to Telegram Bot')}
              </span>
            </button>
          </div>

          {novelZipProgressMsg && (
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5 justify-center pt-1 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{novelZipProgressMsg}</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* NOVEL SUB-SECTION 5.2: AUTOMATED PERIODIC NOVEL BACKUPS       */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {language === 'fa' ? 'پشتیبان‌گیری خودکار و دوره‌ای رمان‌ها' : 'Automated Scheduled Novel Backups'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {language === 'fa' ? 'ارسال خودکار فایل زیپ رمان‌ها به ربات تلگرام در زمان معین' : 'Automatically dispatch ZIP backups to Telegram on schedule'}
                </span>
              </div>
            </div>

            {/* Enable Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="toggle-auto-novel-backup"
                type="checkbox"
                checked={tempAutoNovelBackup}
                onChange={(e) => setTempAutoNovelBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {tempAutoNovelBackup && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {/* Interval Frequency */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                    {language === 'fa' ? 'بازه تکرار خودکار' : 'Backup Interval'}
                  </label>
                  <select
                    id="novel-backup-interval-select"
                    value={tempNovelBackupInterval}
                    onChange={(e) => setTempNovelBackupInterval(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="daily">{language === 'fa' ? 'روزانه (هر شب)' : 'Daily (Every Night)'}</option>
                    <option value="every_3_days">{language === 'fa' ? 'هر ۳ روز یک‌بار' : 'Every 3 Days'}</option>
                    <option value="weekly">{language === 'fa' ? 'هفتگی (یک روز در هفته)' : 'Weekly'}</option>
                    <option value="monthly">{language === 'fa' ? 'ماهانـه (یک‌بار در ماه)' : 'Monthly'}</option>
                  </select>
                </div>

                {/* Day Selector (Conditional) */}
                {tempNovelBackupInterval === 'weekly' && (
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                      {language === 'fa' ? 'روز هفته' : 'Day of Week'}
                    </label>
                    <select
                      value={tempNovelBackupDayOfWeek}
                      onChange={(e) => setTempNovelBackupDayOfWeek(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={6}>{language === 'fa' ? 'شنبه (Saturday)' : 'Saturday'}</option>
                      <option value={0}>{language === 'fa' ? 'یک‌شنبه (Sunday)' : 'Sunday'}</option>
                      <option value={1}>{language === 'fa' ? 'دوشنبه (Monday)' : 'Monday'}</option>
                      <option value={2}>{language === 'fa' ? 'سه‌شنبه (Tuesday)' : 'Tuesday'}</option>
                      <option value={3}>{language === 'fa' ? 'چهارشنبه (Wednesday)' : 'Wednesday'}</option>
                      <option value={4}>{language === 'fa' ? 'پنج‌شنبه (Thursday)' : 'Thursday'}</option>
                      <option value={5}>{language === 'fa' ? 'جمعه (Friday)' : 'Friday'}</option>
                    </select>
                  </div>
                )}

                {tempNovelBackupInterval === 'monthly' && (
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                      {language === 'fa' ? 'روز ماه' : 'Day of Month'}
                    </label>
                    <select
                      value={tempNovelBackupDayOfMonth}
                      onChange={(e) => setTempNovelBackupDayOfMonth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {language === 'fa' ? `روز ${d} ماه` : `Day ${d}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Execution Time */}
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                    {language === 'fa' ? 'ساعت ارسال خودکار' : 'Backup Time (HH:MM)'}
                  </label>
                  <input
                    type="time"
                    value={tempNovelBackupTime}
                    onChange={(e) => setTempNovelBackupTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'آخرین ارسال زیپ رمان' : 'Last Novel ZIP Sent'}
                  </div>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {telegramConfig.lastNovelBackupSentDate || (language === 'fa' ? 'تاکنون ارسال نشده' : 'Never sent')}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'حجم آخرین آرشیو' : 'Last Archive Size'}
                  </div>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {telegramConfig.lastNovelBackupSize || '---'}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === 'fa' ? 'تعداد کل پشتیبان‌های خودکار' : 'Total Auto Sent'}
                  </div>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {telegramConfig.totalAutoNovelBackupsSent || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* NOVEL SUB-SECTION 5.3: IMPORT & RESTORE FROM ZIP ARCHIVE      */}
        {/* ------------------------------------------------------------- */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {language === 'fa' ? 'بازیابی و واردسازی فایل فشرده رمان‌ها (.ZIP)' : 'Restore & Import from Novel ZIP Archive'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {language === 'fa' ? 'فایل زیپ پشتیبان گرفته شده را انتخاب یا به اینجا بکشید' : 'Select or drop a novel backup .zip archive to restore'}
              </span>
            </div>
          </div>

          <input
            ref={novelZipFileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleNovelZipFileSelected(f);
            }}
          />

          {!parsedNovelZipResult ? (
            <div
              onClick={() => novelZipFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleNovelZipFileSelected(f);
              }}
              className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition group"
            >
              {isParsingNovelZip ? (
                <div className="flex flex-col items-center gap-2 py-2 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-bold">{language === 'fa' ? 'در حال بررسی ساختار فایل زیپ...' : 'Analyzing ZIP archive...'}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <FileArchive className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {language === 'fa' ? 'کلیک کنید یا فایل ZIP رمان‌ها را به اینجا بکشید' : 'Click or drop novel .zip archive here'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {language === 'fa' ? 'پشتیبانی کامل از فایل‌های خروجی گرفته‌شده با زیپ' : 'Supports standard Novel ZIP archives'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
              {/* Inspection Header */}
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {language === 'fa' ? 'مشخصات فایل زیپ بارگذاری شده' : 'Parsed ZIP Archive Details'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setParsedNovelZipResult(null)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                >
                  {language === 'fa' ? 'انصراف / انتخاب فایل دیگر' : 'Cancel / Choose Another'}
                </button>
              </div>

              {parsedNovelZipResult.valid ? (
                <>
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">{language === 'fa' ? 'تعداد رمان‌ها' : 'Novels'}</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-0.5">
                        {parsedNovelZipResult.novels.length}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">{language === 'fa' ? 'مجموع فصول' : 'Total Chapters'}</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                        {parsedNovelZipResult.totalChapters}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">{language === 'fa' ? 'تخمین کلمات' : 'Total Words'}</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                        {parsedNovelZipResult.totalWords.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">{language === 'fa' ? 'وضعیت پیشرفت' : 'Reading Progress'}</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                        {parsedNovelZipResult.readingProgress ? (language === 'fa' ? 'موجود' : 'Included') : (language === 'fa' ? 'ندارد' : 'None')}
                      </div>
                    </div>
                  </div>

                  {/* Novel Titles List Preview */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 text-xs max-h-32 overflow-y-auto space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      {language === 'fa' ? 'عناوین موجود در آرشیو:' : 'Novels included in archive:'}
                    </span>
                    {parsedNovelZipResult.novels.map((n) => (
                      <div key={n.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                        <span className="font-medium truncate max-w-[200px]">📖 {n.title}</span>
                        <span className="text-[10.5px] text-slate-400">{n.chapters?.length || n.totalChapters || 0} {language === 'fa' ? 'فصل' : 'ch.'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Restore Mode & Execution Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="novelRestoreMode"
                          value="merge"
                          checked={novelRestoreMode === 'merge'}
                          onChange={() => setNovelRestoreMode('merge')}
                          className="text-indigo-600"
                        />
                        <span>{language === 'fa' ? 'ادغام با کتابخانه موجود' : 'Merge (Keep existing)'}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="novelRestoreMode"
                          value="replace"
                          checked={novelRestoreMode === 'replace'}
                          onChange={() => setNovelRestoreMode('replace')}
                          className="text-indigo-600"
                        />
                        <span>{language === 'fa' ? 'جایگزینی کامل' : 'Replace All'}</span>
                      </label>
                    </div>

                    <button
                      id="apply-novel-zip-restore-btn"
                      type="button"
                      onClick={handleApplyNovelZipRestore}
                      disabled={isRestoringNovelZip}
                      className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isRestoringNovelZip ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>
                        {isRestoringNovelZip
                          ? (language === 'fa' ? 'در حال واردسازی...' : 'Restoring...')
                          : (language === 'fa' ? 'تأیید و واردسازی رمان‌ها' : 'Apply Novel Restore')}
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parsedNovelZipResult.errors?.join(' | ') || (language === 'fa' ? 'فایل زیپ معتبر نیست یا حاوی ساختار رمان نمی‌باشد.' : 'Invalid novel ZIP archive.')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
