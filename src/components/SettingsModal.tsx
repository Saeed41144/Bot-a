import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Globe, 
  Moon, 
  Sun, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Bot, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  Check, 
  FileText,
  Loader2,
  Download,
  Upload,
  Database,
  HardDrive,
  FileJson,
  Key,
  MessageSquare,
  Bell,
  AlertTriangle,
  Plus,
  Trash2,
  BarChart3,
  Image,
  Copy,
  CheckCheck,
  ShieldCheck,
  Layers,
  Sliders,
  ExternalLink,
  Activity,
  Wifi,
  Volume2,
  VolumeX,
  Flame,
  Brain,
  Leaf,
  Zap,
  Timer
} from 'lucide-react';
import { Language, ThemeMode, TelegramConfig, BotPersona, Habit, BackupInterval, FullBackupSettings, AdvancedSettings, RewardWallet, WebNovel, ShopMovie, VideoPlaylist } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { calculateHabitStats } from '../utils/habitMath';
import { getTodayString } from '../utils/persianDate';
import { 
  createFullBackupPayload, 
  createUserBackupPayload, 
  createCompleteBackupPayload,
  parseAndValidateBackup, 
  downloadBackupFile, 
  copyBackupToClipboard,
  ParsedBackupResult
} from '../utils/backupHelper';
import { PROVIDER_METADATA, fetchModelsForProvider } from '../utils/aiKeyManager';
import { AdvancedSettingsTab } from './AdvancedSettingsTab';
import { BackupSettingsTab } from './BackupSettingsTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  theme: ThemeMode;
  telegramConfig: TelegramConfig;
  advancedSettings?: AdvancedSettings;
  wallet?: RewardWallet;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  tasks?: any[];
  habits: Habit[];
  initialTab?: 'general' | 'telegram' | 'backup' | 'advanced';
  onUpdateLanguage: (lang: Language) => void;
  onUpdateTheme: (theme: ThemeMode) => void;
  onUpdateTelegramConfig: (config: TelegramConfig) => void;
  onUpdateAdvancedSettings?: (settings: AdvancedSettings) => void;
  onOpenAIReport: () => void;
  onRestoreHabits: (restoredHabits: Habit[], restoredSettings?: Partial<FullBackupSettings>) => void;
  onRestoreNovels?: (restoredNovels: WebNovel[], options?: { merge: boolean }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  theme,
  telegramConfig,
  advancedSettings,
  wallet,
  customNovels,
  customMovies,
  customPlaylists = [],
  deletedMovieIds = [],
  deletedPlaylistIds = [],
  deletedNovelIds = [],
  tasks = [],
  habits,
  initialTab = 'general',
  onUpdateLanguage,
  onUpdateTheme,
  onUpdateTelegramConfig,
  onUpdateAdvancedSettings,
  onOpenAIReport,
  onRestoreHabits,
  onRestoreNovels,
}) => {
  const [tempBotToken, setTempBotToken] = useState(telegramConfig.botToken || '');
  const [tempChatId, setTempChatId] = useState(telegramConfig.chatId || '');
  const [tempAutoReport, setTempAutoReport] = useState(telegramConfig.autoDailyReport ?? true);
  const [tempReportTime, setTempReportTime] = useState(telegramConfig.reportTime || '21:00');

  // Daily Reminders Configuration
  const [tempReminderEnabled, setTempReminderEnabled] = useState(telegramConfig.reminderEnabled ?? true);
  const [tempReminderTimes, setTempReminderTimes] = useState<string[]>(
    telegramConfig.reminderTimes && telegramConfig.reminderTimes.length > 0
      ? telegramConfig.reminderTimes
      : ['11:00', '16:00', '19:30']
  );
  const [newReminderTimeInput, setNewReminderTimeInput] = useState('14:00');

  // Strict Nightly Accountability Deadline Warning
  const [tempStrictWarningEnabled, setTempStrictWarningEnabled] = useState(telegramConfig.strictWarningEnabled ?? true);
  const [tempStrictWarningTime, setTempStrictWarningTime] = useState(telegramConfig.strictWarningTime || '23:30');

  // Visual Chart Infographics
  const [tempSendVisualCharts, setTempSendVisualCharts] = useState(telegramConfig.sendVisualCharts ?? true);
  const [isSendingChartTest, setIsSendingChartTest] = useState(false);

  // Bot Persona & Coaching Tone
  const [tempBotPersona, setTempBotPersona] = useState<BotPersona>(telegramConfig.botPersona || 'academic');
  const [tempAiModelPreference, setTempAiModelPreference] = useState<string>(telegramConfig.aiModelPreference || 'gemini-2.5-flash');
  const [tempTelegramAiKeyId, setTempTelegramAiKeyId] = useState<string>(telegramConfig.telegramAiKeyId || 'auto');
  const [fetchedModelsMap, setFetchedModelsMap] = useState<Record<string, string[]>>({});
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelFetchMessage, setModelFetchMessage] = useState<string | null>(null);

  // Real-time Push Notifications on Web Actions
  const [tempNotifyOnTaskCompletion, setTempNotifyOnTaskCompletion] = useState(telegramConfig.notifyOnTaskCompletion ?? true);
  const [tempNotifyOnHabitCheck, setTempNotifyOnHabitCheck] = useState(telegramConfig.notifyOnHabitCheck ?? false);
  const [isSendingInstantTest, setIsSendingInstantTest] = useState(false);

  // Pomodoro & Deep Work in Telegram & AI
  const [tempNotifyOnPomodoroCompletion, setTempNotifyOnPomodoroCompletion] = useState(telegramConfig.notifyOnPomodoroCompletion ?? true);
  const [tempEnableTelegramPomodoroControl, setTempEnableTelegramPomodoroControl] = useState(telegramConfig.enableTelegramPomodoroControl ?? true);
  const [isSendingPomodoroTest, setIsSendingPomodoroTest] = useState(false);

  // Quiet Hours (Silent Night Mode)
  const [tempQuietHoursEnabled, setTempQuietHoursEnabled] = useState(telegramConfig.quietHoursEnabled ?? false);
  const [tempQuietHoursStart, setTempQuietHoursStart] = useState(telegramConfig.quietHoursStart || '23:30');
  const [tempQuietHoursEnd, setTempQuietHoursEnd] = useState(telegramConfig.quietHoursEnd || '07:30');

  // Live Connection / Latency / Username state
  const [liveBotInfo, setLiveBotInfo] = useState<{
    checking: boolean;
    serverAlive?: boolean;
    telegramHandshake?: boolean;
    botUser?: string;
    latencyMs?: number;
    error?: string;
  }>({ checking: false });

  // Auto-backup configuration state
  const [tempAutoBackup, setTempAutoBackup] = useState(telegramConfig.autoBackupEnabled ?? false);
  const [tempBackupInterval, setTempBackupInterval] = useState<BackupInterval>(telegramConfig.backupInterval || 'daily');
  const [tempBackupTime, setTempBackupTime] = useState(telegramConfig.backupTime || '23:00');

  // Advanced Settings State
  const [tempAdvancedSettings, setTempAdvancedSettings] = useState<AdvancedSettings>(() => ({
    defaultTargetDays: advancedSettings?.defaultTargetDays ?? 66,
    enableSoundEffects: advancedSettings?.enableSoundEffects ?? true,
    enableHapticFeedback: advancedSettings?.enableHapticFeedback ?? true,
    enableCelebrationConfetti: advancedSettings?.enableCelebrationConfetti ?? true,
    strictStreakMode: advancedSettings?.strictStreakMode ?? true,
    showScientificFormula: advancedSettings?.showScientificFormula ?? false,
    autoOptimizeStorage: advancedSettings?.autoOptimizeStorage ?? true,
    aiConfig: advancedSettings?.aiConfig || {
      analyticsAI: { keys: [], autoFallback: true },
      translationAI: { keys: [], autoFallback: true },
    },
  }));

  // Track previous isOpen state to only populate form when modal opens
  const prevIsOpenRef = useRef(false);
  const userEditedBotTokenRef = useRef(false);
  const userEditedChatIdRef = useRef(false);
  const botTokenDebounceTimer = useRef<any>(null);
  const chatIdDebounceTimer = useRef<any>(null);

  // Keep state synchronized ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      userEditedBotTokenRef.current = false;
      userEditedChatIdRef.current = false;
      setTempBotToken(telegramConfig.botToken || '');
      setTempChatId(telegramConfig.chatId || '');
      setTempAutoReport(telegramConfig.autoDailyReport ?? true);
      setTempReportTime(telegramConfig.reportTime || '21:00');
      setTempReminderEnabled(telegramConfig.reminderEnabled ?? true);
      setTempReminderTimes(telegramConfig.reminderTimes?.length ? telegramConfig.reminderTimes : ['11:00', '16:00', '19:30']);
      setTempStrictWarningEnabled(telegramConfig.strictWarningEnabled ?? true);
      setTempStrictWarningTime(telegramConfig.strictWarningTime || '23:30');
      setTempSendVisualCharts(telegramConfig.sendVisualCharts ?? true);
      setTempBotPersona(telegramConfig.botPersona || 'academic');
      setTempAiModelPreference(telegramConfig.aiModelPreference || 'gemini-2.5-flash');
      setTempTelegramAiKeyId(telegramConfig.telegramAiKeyId || 'auto');
      setTempNotifyOnTaskCompletion(telegramConfig.notifyOnTaskCompletion ?? true);
      setTempNotifyOnHabitCheck(telegramConfig.notifyOnHabitCheck ?? false);
      setTempNotifyOnPomodoroCompletion(telegramConfig.notifyOnPomodoroCompletion ?? true);
      setTempEnableTelegramPomodoroControl(telegramConfig.enableTelegramPomodoroControl ?? true);
      setTempQuietHoursEnabled(telegramConfig.quietHoursEnabled ?? false);
      setTempQuietHoursStart(telegramConfig.quietHoursStart || '23:30');
      setTempQuietHoursEnd(telegramConfig.quietHoursEnd || '07:30');
      setTempAutoBackup(telegramConfig.autoBackupEnabled ?? false);
      setTempBackupInterval(telegramConfig.backupInterval || 'daily');
      setTempBackupTime(telegramConfig.backupTime || '23:00');

      // Fetch latest authoritative Telegram configuration from server disk/env/pointer files without wiping active inputs
      fetch('/api/telegram/get-state')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.telegramConfig) {
            const sToken = (data.telegramConfig.botToken || '').trim();
            const sChat = (data.telegramConfig.chatId || '').trim();
            
            // Only update local input if user has not actively typed and local input was empty
            if (sToken && !userEditedBotTokenRef.current) {
              setTempBotToken((prev) => {
                if (!prev.trim()) {
                  checkLiveBotPing(sToken);
                  return sToken;
                }
                return prev;
              });
            }
            if (sChat && !userEditedChatIdRef.current) {
              setTempChatId((prev) => {
                if (!prev.trim()) return sChat;
                return prev;
              });
            }
          }
        })
        .catch(() => {
          if (telegramConfig.botToken) {
            checkLiveBotPing(telegramConfig.botToken);
          }
        });

      if (advancedSettings) {
        setTempAdvancedSettings({
          defaultTargetDays: advancedSettings.defaultTargetDays ?? 66,
          enableSoundEffects: advancedSettings.enableSoundEffects ?? true,
          enableHapticFeedback: advancedSettings.enableHapticFeedback ?? true,
          enableCelebrationConfetti: advancedSettings.enableCelebrationConfetti ?? true,
          strictStreakMode: advancedSettings.strictStreakMode ?? true,
          showScientificFormula: advancedSettings.showScientificFormula ?? false,
          autoOptimizeStorage: advancedSettings.autoOptimizeStorage ?? true,
          aiConfig: advancedSettings.aiConfig || {
            analyticsAI: { keys: [], autoFallback: true },
            translationAI: { keys: [], autoFallback: true },
          },
        });
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const checkLiveBotPing = async (token?: string) => {
    const activeToken = token || tempBotToken;
    if (!activeToken.trim()) return;
    setLiveBotInfo((prev) => ({ ...prev, checking: true }));
    const startTime = Date.now();
    try {
      const res = await fetch('/api/telegram/keepalive-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: activeToken.trim() }),
      });
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      if (res.ok && data.success) {
        setLiveBotInfo({
          checking: false,
          serverAlive: true,
          telegramHandshake: data.telegramHandshake,
          botUser: data.botUser,
          latencyMs,
        });
      } else {
        setLiveBotInfo({
          checking: false,
          serverAlive: true,
          telegramHandshake: false,
          error: data.error || 'Handshake failed',
        });
      }
    } catch (err: any) {
      setLiveBotInfo({
        checking: false,
        error: err.message,
      });
    }
  };

  const [activeTab, setActiveTab] = useState<'general' | 'telegram' | 'backup' | 'advanced'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);
  const [showGuide, setShowGuide] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSendingBackup, setIsSendingBackup] = useState(false);
  const [isSettingMenu, setIsSettingMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reminderFeedback, setReminderFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [strictWarningFeedback, setStrictWarningFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isSendingReminderTest, setIsSendingReminderTest] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingStrictWarningTest, setIsSendingStrictWarningTest] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    habits: Habit[];
    settings?: Partial<FullBackupSettings>;
    summary: ParsedBackupResult['summary'];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  if (!isOpen) return null;

  const executeRestore = (data: { habits: Habit[]; settings?: Partial<FullBackupSettings> }) => {
    onRestoreHabits(data.habits, data.settings);
    
    if (data.settings?.telegramConfig) {
      setTempBotToken(data.settings.telegramConfig.botToken || '');
      setTempChatId(data.settings.telegramConfig.chatId || '');
      setTempAutoReport(data.settings.telegramConfig.autoDailyReport ?? true);
      setTempReportTime(data.settings.telegramConfig.reportTime || '21:00');
      setTempReminderEnabled(data.settings.telegramConfig.reminderEnabled ?? true);
      if (data.settings.telegramConfig.reminderTimes) {
        setTempReminderTimes(data.settings.telegramConfig.reminderTimes);
      }
      setTempStrictWarningEnabled(data.settings.telegramConfig.strictWarningEnabled ?? true);
      setTempStrictWarningTime(data.settings.telegramConfig.strictWarningTime || '23:30');
      setTempSendVisualCharts(data.settings.telegramConfig.sendVisualCharts ?? true);
      setTempBotPersona(data.settings.telegramConfig.botPersona || 'academic');
      setTempAiModelPreference(data.settings.telegramConfig.aiModelPreference || 'flash');
      setTempNotifyOnTaskCompletion(data.settings.telegramConfig.notifyOnTaskCompletion ?? true);
      setTempNotifyOnHabitCheck(data.settings.telegramConfig.notifyOnHabitCheck ?? false);
      setTempNotifyOnPomodoroCompletion(data.settings.telegramConfig.notifyOnPomodoroCompletion ?? true);
      setTempEnableTelegramPomodoroControl(data.settings.telegramConfig.enableTelegramPomodoroControl ?? true);
      setTempQuietHoursEnabled(data.settings.telegramConfig.quietHoursEnabled ?? false);
      setTempQuietHoursStart(data.settings.telegramConfig.quietHoursStart || '23:30');
      setTempQuietHoursEnd(data.settings.telegramConfig.quietHoursEnd || '07:30');
      setTempAutoBackup(data.settings.telegramConfig.autoBackupEnabled ?? false);
      setTempBackupInterval(data.settings.telegramConfig.backupInterval || 'daily');
      setTempBackupTime(data.settings.telegramConfig.backupTime || '23:00');
    }

    setPendingRestore(null);
    setStatusMessage({
      type: 'success',
      text: t.restoreSuccess,
    });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleFetchModelsForKey = async (keyConfig: { key: string; provider: any; id: string }) => {
    if (!keyConfig.key || isFetchingModels) return;
    setIsFetchingModels(true);
    setModelFetchMessage(null);
    try {
      const res = await fetchModelsForProvider(keyConfig.key, keyConfig.provider);
      if (res && res.models && res.models.length > 0) {
        setFetchedModelsMap((prev) => ({ ...prev, [keyConfig.id]: res.models }));
        setModelFetchMessage(language === 'fa' 
          ? `✅ تعداد ${res.models.length} مدل با موفقیت از سرور دریافت شد.`
          : `✅ Successfully fetched ${res.models.length} models.`);
      } else {
        setModelFetchMessage(language === 'fa' 
          ? '⚠️ مدلی از سرور دریافت نشد، از مدل‌های پیش‌فرض استفاده می‌شود.'
          : '⚠️ No models returned, using popular defaults.');
      }
    } catch (e: any) {
      setModelFetchMessage(language === 'fa' 
        ? `⚠️ خطا در دریافت مدل‌ها: ${e.message || 'نامشخص'}` 
        : `⚠️ Error fetching models: ${e.message || 'Unknown'}`);
    } finally {
      setIsFetchingModels(false);
      setTimeout(() => setModelFetchMessage(null), 5000);
    }
  };

  const handleSave = () => {
    const finalBotToken = tempBotToken.trim() || telegramConfig.botToken || '';
    const finalChatId = tempChatId.trim() || telegramConfig.chatId || '';

    const nextTelegramConfig: TelegramConfig = {
      ...telegramConfig,
      botToken: finalBotToken,
      chatId: finalChatId,
      autoDailyReport: tempAutoReport,
      reportTime: tempReportTime,
      reminderEnabled: tempReminderEnabled,
      reminderTimes: tempReminderTimes.sort(),
      strictWarningEnabled: tempStrictWarningEnabled,
      strictWarningTime: tempStrictWarningTime,
      sendVisualCharts: tempSendVisualCharts,
      botPersona: tempBotPersona,
      aiModelPreference: tempAiModelPreference,
      telegramAiKeyId: tempTelegramAiKeyId,
      notifyOnTaskCompletion: tempNotifyOnTaskCompletion,
      notifyOnHabitCheck: tempNotifyOnHabitCheck,
      notifyOnPomodoroCompletion: tempNotifyOnPomodoroCompletion,
      enableTelegramPomodoroControl: tempEnableTelegramPomodoroControl,
      quietHoursEnabled: tempQuietHoursEnabled,
      quietHoursStart: tempQuietHoursStart,
      quietHoursEnd: tempQuietHoursEnd,
      autoBackupEnabled: tempAutoBackup,
      backupInterval: tempBackupInterval,
      backupTime: tempBackupTime,
    };

    onUpdateTelegramConfig(nextTelegramConfig);

    // Direct synchronous post to server to immediately persist in database.json and pointer files
    fetch('/api/telegram/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramConfig: nextTelegramConfig }),
    }).catch(() => {});

    if (onUpdateAdvancedSettings) {
      onUpdateAdvancedSettings(tempAdvancedSettings);
    }
    setStatusMessage({ type: 'success', text: t.settingsSaved });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleFillSmartDefaults = () => {
    setTempAutoReport(true);
    setTempReportTime('21:00');
    setTempReminderEnabled(true);
    setTempReminderTimes(['09:00', '14:00', '18:00', '21:30']);
    setTempStrictWarningEnabled(true);
    setTempStrictWarningTime('23:30');
    setTempSendVisualCharts(true);
    setTempBotPersona('academic');
    setTempAiModelPreference('gemini-2.5-flash');
    setTempNotifyOnTaskCompletion(true);
    setTempNotifyOnHabitCheck(false);
    setTempQuietHoursEnabled(false);
    setTempQuietHoursStart('23:30');
    setTempQuietHoursEnd('07:30');
    setTempAutoBackup(true);
    setTempBackupInterval('daily');
    setTempBackupTime('23:00');
    setStatusMessage({
      type: 'success',
      text: language === 'fa' 
        ? '✨ تمامی تنظیمات و ساعت‌های یادآور به مقادیر پیشنهادی هوشمند و بهینه علوم اعصاب تغییر یافتند.'
        : language === 'ar'
        ? '✨ تم ملء جميع الإعدادات وساعات التذكير بالقيم الموصى بها تلقائياً.'
        : '✨ All settings and reminder hours filled with neuroscience-recommended smart defaults.',
    });
  };

  const handleAddReminderTime = () => {
    if (!newReminderTimeInput) return;
    if (!tempReminderTimes.includes(newReminderTimeInput)) {
      const updated = [...tempReminderTimes, newReminderTimeInput].sort();
      setTempReminderTimes(updated);
    }
  };

  const handleRemoveReminderTime = (timeToRemove: string) => {
    setTempReminderTimes(tempReminderTimes.filter((t) => t !== timeToRemove));
  };

  const handleTestReminder = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      const msg = language === 'fa' 
        ? 'لطفاً ابتدا توکن ربات و شناسه چت را در بالای بخش تلگرام وارد کنید.'
        : language === 'ar'
        ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً.'
        : 'Please enter both Bot Token and Chat ID first.';
      setStatusMessage({ type: 'error', text: msg });
      setReminderFeedback({ type: 'error', text: msg });
      return;
    }

    setIsSendingReminderTest(true);
    setStatusMessage(null);
    setReminderFeedback(null);

    try {
      const res = await fetch('/api/telegram/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          habits,
          tasks,
          language,
          referenceDate: getTodayString(),
          isTest: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const successText = t.reminderSentSuccess || (language === 'fa' ? 'پیام آزمایشی یادآور عادات با موفقیت به تلگرام ارسال شد!' : 'Reminder test message sent to Telegram successfully!');
        setStatusMessage({ type: 'success', text: successText });
        setReminderFeedback({ type: 'success', text: successText });
      } else {
        const errText = data.error || (language === 'fa' ? 'خطا در ارسال یادآور' : 'Failed to send reminder');
        setStatusMessage({ type: 'error', text: errText });
        setReminderFeedback({ type: 'error', text: errText });
      }
    } catch (err: any) {
      const errText = err.message || (language === 'fa' ? 'خطای شبکه در ارسال یادآور' : 'Network error sending reminder');
      setStatusMessage({ type: 'error', text: errText });
      setReminderFeedback({ type: 'error', text: errText });
    } finally {
      setIsSendingReminderTest(false);
    }
  };

  const handleTestStrictWarning = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      const msg = language === 'fa' 
        ? 'لطفاً ابتدا توکن ربات و شناسه چت را در بالای بخش تلگرام وارد کنید.'
        : language === 'ar'
        ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً.'
        : 'Please enter both Bot Token and Chat ID first.';
      setStatusMessage({ type: 'error', text: msg });
      setStrictWarningFeedback({ type: 'error', text: msg });
      return;
    }

    setIsSendingStrictWarningTest(true);
    setStatusMessage(null);
    setStrictWarningFeedback(null);

    try {
      const res = await fetch('/api/telegram/send-strict-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          habits,
          tasks,
          language,
          referenceDate: getTodayString(),
          isTest: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const successText = t.strictWarningSentSuccess || (language === 'fa' ? 'پیام هشدار نهایی کارهای انجام‌نشده به تلگرام ارسال شد!' : 'Strict accountability warning sent to Telegram successfully!');
        setStatusMessage({ type: 'success', text: successText });
        setStrictWarningFeedback({ type: 'success', text: successText });
      } else {
        const errText = data.error || (language === 'fa' ? 'خطا در ارسال هشدار نهایی' : 'Failed to send strict warning');
        setStatusMessage({ type: 'error', text: errText });
        setStrictWarningFeedback({ type: 'error', text: errText });
      }
    } catch (err: any) {
      const errText = err.message || (language === 'fa' ? 'خطای شبکه در ارسال هشدار' : 'Network error sending strict warning');
      setStatusMessage({ type: 'error', text: errText });
      setStrictWarningFeedback({ type: 'error', text: errText });
    } finally {
      setIsSendingStrictWarningTest(false);
    }
  };

  const handleTestVisualChart = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً ابتدا توکن ربات و شناسه چت را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً'
          : 'Please enter both Bot Token and Chat ID',
      });
      return;
    }

    setIsSendingChartTest(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/telegram/send-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          habits,
          language,
          isTest: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: t.visualChartSentSuccess,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'خطا در ارسال تصویر نمودار',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'خطا در ارسال تصویر نمودار',
      });
    } finally {
      setIsSendingChartTest(false);
    }
  };

  const handleTestInstantNotification = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa'
          ? 'لطفاً ابتدا توکن ربات و شناسه چت را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة'
          : 'Please enter both Bot Token and Chat ID',
      });
      return;
    }

    setIsSendingInstantTest(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/telegram/notify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          eventType: 'task_completed',
          title: language === 'fa' ? 'تست ارسال اعلان و همگام‌سازی لحظه‌ای' : 'Test Real-time Push Notification',
          language,
          isTest: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: t.instantNotificationSentSuccess || (language === 'fa' ? 'پیام اعلان فوری با موفقیت به تلگرام ارسال شد!' : 'Instant notification sent successfully!'),
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'خطا در ارسال پیام به تلگرام',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'خطا در ارسال پیام به تلگرام',
      });
    } finally {
      setIsSendingInstantTest(false);
    }
  };

  const handleTestPomodoroNotification = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً ابتدا توکن ربات و شناسه چت را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً'
          : 'Please enter both Bot Token and Chat ID',
      });
      return;
    }

    setIsSendingPomodoroTest(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/telegram/notify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          eventType: 'pomodoro_completed',
          title: language === 'fa' ? 'جلسه تمرکز عمیق (کار بر روی پروژه و عادات)' : language === 'ar' ? 'جلسة تركيز عميق على الأهداف' : 'Deep Work Focus Session',
          durationMinutes: 25,
          earnedCoins: 5,
          language,
          isTest: true,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: t.pomodoroNotificationSentSuccess || (language === 'fa' ? 'اعلان آزمایشی پایان پومودورو با موفقیت به تلگرام ارسال شد!' : 'Pomodoro notification sent successfully!'),
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'خطا در ارسال اعلان پومودورو',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'خطا در ارسال اعلان پومودورو',
      });
    } finally {
      setIsSendingPomodoroTest(false);
    }
  };

  const handleTestConnection = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً توکن ربات و شناسه چت را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة'
          : 'Please enter both Bot Token and Chat ID',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          language,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const updatedConfig = {
          ...telegramConfig,
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
        };
        onUpdateTelegramConfig(updatedConfig);
        fetch('/api/telegram/save-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramConfig: updatedConfig }),
        }).catch(() => {});
        setStatusMessage({
          type: 'success',
          text: language === 'fa'
            ? 'پیام تست با موفقیت به تلگرام شما ارسال شد و اطلاعات ذخیره گردید!'
            : language === 'ar'
            ? 'تم إرسال رسالة الاختبار بنجاح وحفظ البيانات!'
            : 'Test message successfully delivered and credentials saved!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || t.sendToTelegramFailed,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t.sendToTelegramFailed,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendAIReportToTelegram = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً ابتدا توکن ربات و شناسه چت را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً'
          : 'Please configure Bot Token and Chat ID first',
      });
      return;
    }

    setIsSendingReport(true);
    setStatusMessage(null);

    const todayStr = getTodayString();
    const habitsSummary = habits.map((h) => {
      const stats = calculateHabitStats(h, todayStr, language);
      return {
        name: h.name,
        category: h.category,
        automaticity: stats.automaticity,
        stage: stats.stage,
        stageLabel: stats.stageLabel,
        currentStreak: stats.currentStreak,
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
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          sendToTelegram: true,
          sendVisualCharts: tempSendVisualCharts,
          dateFormatted: todayStr,
          aiKeys: tempAdvancedSettings?.aiConfig?.analyticsAI?.keys || advancedSettings?.aiConfig?.analyticsAI?.keys,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.telegramSent) {
        setStatusMessage({
          type: 'success',
          text: t.sendToTelegramSuccess,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.telegramError || data.error || t.sendToTelegramFailed,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t.sendToTelegramFailed,
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  // 1. Download User Data Backup JSON (Habits, History, Theme, Language, Telegram, Wallet - Excludes Shop Novels)
  const handleDownloadBackup = () => {
    try {
      const userBackupPayload = createUserBackupPayload(
        habits,
        language,
        theme,
        {
          ...telegramConfig,
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          autoDailyReport: tempAutoReport,
          reportTime: tempReportTime,
          autoBackupEnabled: tempAutoBackup,
          backupInterval: tempBackupInterval,
          backupTime: tempBackupTime,
          reminderEnabled: tempReminderEnabled,
          reminderTimes: tempReminderTimes,
          strictWarningEnabled: tempStrictWarningEnabled,
          strictWarningTime: tempStrictWarningTime,
          sendVisualCharts: tempSendVisualCharts,
        },
        wallet,
        tempAdvancedSettings,
        tasks
      );
      downloadBackupFile(userBackupPayload, 'user-habits-backup');
      setStatusMessage({
        type: 'success',
        text: language === 'fa'
          ? 'فایل پشتیبان داده‌های کاربر (عادات، تاریخچه‌ها، تم و ظاهر، کیف پول و تنظیمات - بدون فایل‌های فروشگاه) دانلود شد.'
          : language === 'ar'
          ? 'تم تنزيل ملف بيانات المستخدم (العادات والسجلات والمظهر والمحفظة والإعدادات) بنجاح.'
          : 'User data backup file downloaded successfully.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error downloading backup',
      });
    }
  };

  // 1b. Copy User Backup JSON to Clipboard
  const handleCopyBackupJson = async () => {
    try {
      const userBackupPayload = createUserBackupPayload(
        habits,
        language,
        theme,
        {
          ...telegramConfig,
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          autoDailyReport: tempAutoReport,
          reportTime: tempReportTime,
          autoBackupEnabled: tempAutoBackup,
          backupInterval: tempBackupInterval,
          backupTime: tempBackupTime,
          reminderEnabled: tempReminderEnabled,
          reminderTimes: tempReminderTimes,
          strictWarningEnabled: tempStrictWarningEnabled,
          strictWarningTime: tempStrictWarningTime,
          sendVisualCharts: tempSendVisualCharts,
        },
        wallet,
        tempAdvancedSettings,
        tasks
      );
      const success = await copyBackupToClipboard(userBackupPayload);
      if (success) {
        setIsCopied(true);
        setStatusMessage({
          type: 'success',
          text: t.backupCopiedSuccess,
        });
        setTimeout(() => setIsCopied(false), 3000);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error copying backup',
      });
    }
  };

  // 2. Upload / Restore Backup JSON (Supports User Backup & 100% Full System Backup)
  const processUploadedFile = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setStatusMessage({
        type: 'error',
        text: t.restoreError,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseAndValidateBackup(content);
        if (!result.isValid || result.habits.length === 0) {
          throw new Error(result.error || 'Invalid backup structure');
        }

        setPendingRestore({
          habits: result.habits,
          settings: result.settings,
          summary: result.summary,
        });
      } catch (e: any) {
        setStatusMessage({
          type: 'error',
          text: t.restoreError + (e.message ? ` (${e.message})` : ''),
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // 3. Send User Backup file to Telegram Now
  const handleSendBackupToTelegramNow = async () => {
    if (!tempBotToken.trim() || !tempChatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً ابتدا توکن ربات (Bot Token) و شناسه چت (Chat ID) را در بخش تنظیمات تلگرام وارد کنید.'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة أولاً'
          : 'Please configure Bot Token and Chat ID first',
      });
      return;
    }

    setIsSendingBackup(true);
    setStatusMessage(null);

    const updatedTgConfig: TelegramConfig = {
      ...telegramConfig,
      botToken: tempBotToken.trim(),
      chatId: tempChatId.trim(),
      autoDailyReport: tempAutoReport,
      reportTime: tempReportTime,
      autoBackupEnabled: tempAutoBackup,
      backupInterval: tempBackupInterval,
      backupTime: tempBackupTime,
      reminderEnabled: tempReminderEnabled,
      reminderTimes: tempReminderTimes,
      strictWarningEnabled: tempStrictWarningEnabled,
      strictWarningTime: tempStrictWarningTime,
      sendVisualCharts: tempSendVisualCharts,
      lastBackupSentDate: getTodayString(),
      lastBackupTimestamp: Date.now(),
    };

    const userBackupPayload = createUserBackupPayload(habits, language, theme, updatedTgConfig, wallet, tempAdvancedSettings, tasks);

    try {
      const res = await fetch('/api/telegram/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          chatId: tempChatId.trim(),
          fullBackupData: userBackupPayload,
          backupType: 'user_only',
          habits,
          language,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: t.backupSentSuccess,
        });
        onUpdateTelegramConfig(updatedTgConfig);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || t.backupSentFailed,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t.backupSentFailed,
      });
    } finally {
      setIsSendingBackup(false);
    }
  };

  // 4. Register Bot Menu Commands in Telegram
  const handleSetBotMenu = async () => {
    if (!tempBotToken.trim()) {
      setStatusMessage({
        type: 'error',
        text: language === 'fa' 
          ? 'لطفاً ابتدا توکن ربات تلگرام را وارد کنید'
          : language === 'ar'
          ? 'يرجى إدخال توكن البوت أولاً'
          : 'Please enter your Bot Token first',
      });
      return;
    }

    setIsSettingMenu(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/telegram/set-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: tempBotToken.trim(),
          language,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: t.botMenuSetSuccess,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || t.botMenuSetFailed,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || t.botMenuSetFailed,
      });
    } finally {
      setIsSettingMenu(false);
    }
  };

  const isTelegramConfigured = Boolean(tempBotToken.trim() && tempChatId.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        id="settings-modal-content"
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl p-6 md:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {t.settingsTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.settingsSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-5 text-xs font-bold border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'عمومی و تم' : language === 'ar' ? 'عام والمظهر' : 'General & Theme'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'telegram'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'ربات تلگرام و AI' : language === 'ar' ? 'تيليجرام والذكاء' : 'Telegram & AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'پشتیبان‌گیری' : language === 'ar' ? 'نسخ احتياطي' : 'Backup'}</span>
          </button>

          <button
            id="tab-advanced-settings-btn"
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'advanced'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 shadow-sm border border-slate-200 dark:border-slate-700 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'تنظیمات پیشرفته' : language === 'ar' ? 'إعدادات متقدمة' : 'Advanced'}</span>
          </button>
        </div>

        {/* Notification / Alert banner */}
        {statusMessage && (
          <div
            className={`p-3.5 mb-5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="font-semibold leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: General & Theme */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 1. Language Selection */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t.languageSection}</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  id="lang-fa-btn"
                  type="button"
                  onClick={() => onUpdateLanguage('fa')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    language === 'fa'
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🇮🇷</span>
                  <span>فارسی</span>
                </button>

                <button
                  id="lang-ar-btn"
                  type="button"
                  onClick={() => onUpdateLanguage('ar')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    language === 'ar'
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🇸🇦</span>
                  <span>العربية</span>
                </button>

                <button
                  id="lang-en-btn"
                  type="button"
                  onClick={() => onUpdateLanguage('en')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-200 dark:ring-blue-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>English</span>
                </button>
              </div>
            </div>

            {/* 2. Theme Selection */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{t.themeSection}</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="theme-light-select-btn"
                  type="button"
                  onClick={() => onUpdateTheme('light')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    theme === 'light'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-200 dark:ring-amber-900/60 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{t.themeLight}</span>
                  {theme === 'light' && <Check className="w-3.5 h-3.5 stroke-[3] mr-auto" />}
                </button>

                <button
                  id="theme-dark-select-btn"
                  type="button"
                  onClick={() => onUpdateTheme('dark')}
                  className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-500 ring-2 ring-blue-400/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-4 h-4 text-white dark:text-white fill-current" />
                  <span>{t.themeDark}</span>
                  {theme === 'dark' && <Check className="w-3.5 h-3.5 stroke-[3] mr-auto" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Telegram Bot & AI Daily Coaching */}
        {activeTab === 'telegram' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Live Connection & Diagnostic Monitor Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/90 dark:to-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-blue-200/80 dark:border-indigo-900/50 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isTelegramConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                        {t.telegramSection}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isTelegramConfigured
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {isTelegramConfigured ? (language === 'fa' ? 'متصل و فعال' : language === 'ar' ? 'متصل ونشط' : 'Active & Connected') : (language === 'fa' ? 'در انتظار پیکربندی' : language === 'ar' ? 'بانتظار الإعداد' : 'Not Configured')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {liveBotInfo.botUser ? (
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">@{liveBotInfo.botUser}</span>
                      ) : (
                        <span>{language === 'fa' ? 'دستیار و مربی هوشمند عادات در پیام‌رسان تلگرام' : 'Your intelligent habit assistant in Telegram'}</span>
                      )}
                      {liveBotInfo.latencyMs !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          ⚡ {liveBotInfo.latencyMs}ms
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => checkLiveBotPing()}
                    disabled={liveBotInfo.checking || !tempBotToken.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                    title={language === 'fa' ? 'بررسی وضعیت اتصال زنده' : 'Ping Live Connection'}
                  >
                    <Activity className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${liveBotInfo.checking ? 'animate-spin' : ''}`} />
                    <span>{liveBotInfo.checking ? (language === 'fa' ? 'در حال پینگ...' : 'Pinging...') : (language === 'fa' ? 'پینگ وضعیت' : 'Ping')}</span>
                  </button>

                  {liveBotInfo.botUser && (
                    <a
                      href={`https://t.me/${liveBotInfo.botUser}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{language === 'fa' ? 'ورود به ربات' : language === 'ar' ? 'فتح البوت' : 'Open Bot'}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Credentials Card (Bot Token & Chat ID) */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    {language === 'fa' ? 'اطلاعات اتصال ربات' : language === 'ar' ? 'بيانات اتصال البوت' : 'Bot Credentials'}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{t.howToGetTelegram}</span>
                </button>
              </div>

              {/* Guide accordion */}
              {showGuide && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1 whitespace-pre-line animate-in fade-in">
                  {t.telegramGuideText}
                </div>
              )}

              <div className="space-y-3">
                {/* Bot Token input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.botTokenLabel}
                  </label>
                  <input
                    id="telegram-bot-token-input"
                    type="text"
                    dir="ltr"
                    placeholder={t.botTokenPlaceholder}
                    value={tempBotToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempBotToken(val);
                      userEditedBotTokenRef.current = true;
                      if (botTokenDebounceTimer.current) clearTimeout(botTokenDebounceTimer.current);
                      botTokenDebounceTimer.current = setTimeout(() => {
                        const trimmed = val.trim();
                        const updated = {
                          ...telegramConfig,
                          botToken: trimmed,
                          chatId: tempChatId.trim() || telegramConfig.chatId || '',
                        };
                        onUpdateTelegramConfig(updated);
                        fetch('/api/telegram/save-config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ telegramConfig: updated }),
                        }).catch(() => {});
                        if (trimmed) checkLiveBotPing(trimmed);
                      }, 350);
                    }}
                    onBlur={() => {
                      const trimmed = tempBotToken.trim();
                      userEditedBotTokenRef.current = true;
                      const updated = { ...telegramConfig, botToken: trimmed, chatId: tempChatId.trim() || telegramConfig.chatId || '' };
                      onUpdateTelegramConfig(updated);
                      fetch('/api/telegram/save-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telegramConfig: updated }),
                      }).catch(() => {});
                      if (trimmed) checkLiveBotPing(trimmed);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Chat ID input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.chatIdLabel}
                  </label>
                  <input
                    id="telegram-chat-id-input"
                    type="text"
                    dir="ltr"
                    placeholder={t.chatIdPlaceholder}
                    value={tempChatId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempChatId(val);
                      userEditedChatIdRef.current = true;
                      if (chatIdDebounceTimer.current) clearTimeout(chatIdDebounceTimer.current);
                      chatIdDebounceTimer.current = setTimeout(() => {
                        const trimmed = val.trim();
                        const updated = {
                          ...telegramConfig,
                          chatId: trimmed,
                          botToken: tempBotToken.trim() || telegramConfig.botToken || '',
                        };
                        onUpdateTelegramConfig(updated);
                        fetch('/api/telegram/save-config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ telegramConfig: updated }),
                        }).catch(() => {});
                      }, 350);
                    }}
                    onBlur={() => {
                      const trimmed = tempChatId.trim();
                      userEditedChatIdRef.current = true;
                      const updated = { ...telegramConfig, chatId: trimmed, botToken: tempBotToken.trim() || telegramConfig.botToken || '' };
                      onUpdateTelegramConfig(updated);
                      fetch('/api/telegram/save-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telegramConfig: updated }),
                      }).catch(() => {});
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Connection Test Action */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    id="test-telegram-btn"
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !tempBotToken.trim()}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isTesting ? t.testingTelegram : t.testTelegramBtn}</span>
                  </button>

                  <button
                    id="fill-smart-defaults-btn"
                    type="button"
                    onClick={handleFillSmartDefaults}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{language === 'fa' ? '✨ تکمیل خودکار تمام مقادیر پیشنهادی' : language === 'ar' ? '✨ ملء الإعدادات الموصى بها' : '✨ Fill Recommended Defaults'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Coach Persona & Behavioral Tone Architecture */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-950/70 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-600/90 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                      {t.botPersonaTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fa' 
                        ? 'تنظیم اتصال مربی هوش مصنوعی تلگرام به کلیدهای بخش تحلیل داده و انتخاب مدل فعال'
                        : language === 'ar'
                        ? 'تخصيص مفاتيح الذكاء الاصطناعي من قسم تحليل البيانات وتحديد النموذج النشط'
                        : 'Configure Telegram AI Coach keys from Data Analytics and select active model'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic AI Key & Model Selection linked to Data Analytics Keys */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{language === 'fa' ? 'کلید هوش مصنوعی مربی تلگرام:' : language === 'ar' ? 'مفتاح الذكاء الاصطناعي للمدرب:' : 'Telegram Coach AI Key:'}</span>
                  </label>

                  {/* Switch to Advanced tab link */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('advanced')}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>{language === 'fa' ? '⚙️ مدیریت کلیدها در تنظیمات پیشرفته' : language === 'ar' ? '⚙️ إدارة المفاتيح في الإعدادات المتقدمة' : '⚙️ Manage Keys in Advanced'}</span>
                  </button>
                </div>

                {/* Key Selector */}
                {(() => {
                  const analyticsKeys = tempAdvancedSettings?.aiConfig?.analyticsAI?.keys || [];
                  const selectedKey = analyticsKeys.find(k => k.id === tempTelegramAiKeyId);
                  const currentProvider = selectedKey?.provider || (analyticsKeys.length > 0 ? analyticsKeys[0].provider : 'gemini');
                  const currentProviderMeta = PROVIDER_METADATA[currentProvider] || PROVIDER_METADATA.gemini;

                  // Models available: live fetched -> key.availableModels -> popular models
                  const availableModels = (selectedKey && fetchedModelsMap[selectedKey.id]) ||
                    (selectedKey?.availableModels && selectedKey.availableModels.length > 0 ? selectedKey.availableModels : null) ||
                    currentProviderMeta.popularModels || [
                      'gemini-2.5-flash',
                      'gemini-2.0-flash',
                      'gemini-2.5-pro',
                      'deepseek-chat',
                      'gpt-4o-mini',
                      'gpt-4o',
                    ];

                  if (analyticsKeys.length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-semibold leading-relaxed">
                            {language === 'fa'
                              ? 'هیچ کلیدی در بخش تنظیمات پیشرفته (تحلیل داده) ثبت نشده است. مربی از متغیرهای سیستمی یا مدل پیش‌فرض استفاده خواهد کرد.'
                              : language === 'ar'
                              ? 'لم يتم تسجيل أي مفتاح في قسم تحليل البيانات. سيستخدم المدرب الإعدادات الافتراضية.'
                              : 'No AI keys configured in Advanced Settings (Data Analytics). Coach will use system fallback models.'}
                          </span>
                        </div>
                        <div className="pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setActiveTab('advanced')}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === 'fa' ? 'افزودن کلید هوش مصنوعی جدید' : 'Add AI Key'}</span>
                          </button>

                          {/* Fallback default model buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setTempAiModelPreference('gemini-2.5-flash')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                tempAiModelPreference === 'gemini-2.5-flash' || tempAiModelPreference === 'flash'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              ⚡ Gemini 2.5 Flash
                            </button>
                            <button
                              type="button"
                              onClick={() => setTempAiModelPreference('gemini-2.5-pro')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                tempAiModelPreference === 'gemini-2.5-pro' || tempAiModelPreference === 'pro'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              🧠 Gemini 2.5 Pro
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {/* Key Selection Dropdown / Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTempTelegramAiKeyId('auto')}
                          className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                            tempTelegramAiKeyId === 'auto'
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/60 font-bold'
                              : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="text-right">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {language === 'fa' ? '⚡ استفاده خودکار و چرخشی از تمام کلیدها' : '⚡ Auto Multi-Key Failover'}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {language === 'fa' ? `تعداد ${analyticsKeys.length} کلید فعال تحلیل داده` : `${analyticsKeys.length} active analytics keys`}
                              </div>
                            </div>
                          </div>
                          {tempTelegramAiKeyId === 'auto' && <Check className="w-4 h-4 text-indigo-600 shrink-0 stroke-[3]" />}
                        </button>

                        {analyticsKeys.map((k) => {
                          const meta = PROVIDER_METADATA[k.provider] || PROVIDER_METADATA.gemini;
                          const isSelected = tempTelegramAiKeyId === k.id;
                          return (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => {
                                setTempTelegramAiKeyId(k.id);
                                if (k.selectedModel) {
                                  setTempAiModelPreference(k.selectedModel);
                                } else if (meta.defaultBestModel) {
                                  setTempAiModelPreference(meta.defaultBestModel);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/60 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${meta.badgeColor}`}>
                                  {meta.name}
                                </span>
                                <div className="text-right truncate">
                                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {k.name || meta.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                    {k.key ? `${k.key.substring(0, 6)}...${k.key.substring(k.key.length - 4)}` : 'No key'}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic Model Selector for Selected Key */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{language === 'fa' ? 'انتخاب مدل هوش مصنوعی فعال برای مربی:' : 'Select Active AI Model for Coach:'}</span>
                          </label>

                          {/* Live fetch button */}
                          {selectedKey && (
                            <button
                              type="button"
                              onClick={() => handleFetchModelsForKey(selectedKey)}
                              disabled={isFetchingModels}
                              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                            >
                              <Loader2 className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                              <span>{isFetchingModels ? (language === 'fa' ? 'در حال استعلام...' : 'Fetching...') : (language === 'fa' ? 'استعلام زنده مدل‌ها' : 'Fetch Live Models')}</span>
                            </button>
                          )}
                        </div>

                        {modelFetchMessage && (
                          <div className="text-[11px] p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold animate-in fade-in">
                            {modelFetchMessage}
                          </div>
                        )}

                        {/* Model quick select pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {availableModels.map((m) => {
                            const isSelected = tempAiModelPreference === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setTempAiModelPreference(m)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer border ${
                                  isSelected
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom model name text input */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                            {language === 'fa' ? 'یا مدل سفارشی:' : 'Or custom model:'}
                          </span>
                          <input
                            type="text"
                            value={tempAiModelPreference}
                            onChange={(e) => setTempAiModelPreference(e.target.value.trim())}
                            placeholder="e.g. deepseek-chat, gpt-4o, gemini-2.5-flash"
                            className="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 block">
                  {language === 'fa' ? 'انتخاب لحن و سبک پاسخ‌دهی مربی:' : 'Select Coaching Behavioral Tone:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Academic & Neuroscience */}
                  <button
                    type="button"
                    onClick={() => setTempBotPersona('academic')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      tempBotPersona === 'academic'
                        ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-300 dark:ring-blue-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-700 dark:text-blue-300">
                        <Brain className="w-4 h-4 text-blue-600" />
                        <span>{t.personaAcademic}</span>
                      </div>
                      {tempBotPersona === 'academic' && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.personaAcademicDesc}
                    </p>
                  </button>

                  {/* Energetic & Motivational Coach */}
                  <button
                    type="button"
                    onClick={() => setTempBotPersona('coach')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      tempBotPersona === 'coach'
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 ring-2 ring-amber-300 dark:ring-amber-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-300">
                        <Flame className="w-4 h-4 text-amber-600" />
                        <span>{t.personaCoach}</span>
                      </div>
                      {tempBotPersona === 'coach' && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.personaCoachDesc}
                    </p>
                  </button>

                  {/* Strict & Direct Accountability */}
                  <button
                    type="button"
                    onClick={() => setTempBotPersona('strict')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      tempBotPersona === 'strict'
                        ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 ring-2 ring-rose-300 dark:ring-rose-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-300">
                        <Zap className="w-4 h-4 text-rose-600" />
                        <span>{t.personaStrict}</span>
                      </div>
                      {tempBotPersona === 'strict' && <Check className="w-4 h-4 text-rose-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.personaStrictDesc}
                    </p>
                  </button>

                  {/* Zen & Mindful Stoic */}
                  <button
                    type="button"
                    onClick={() => setTempBotPersona('zen')}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      tempBotPersona === 'zen'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900/60 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-300">
                        <Leaf className="w-4 h-4 text-emerald-600" />
                        <span>{t.personaZen}</span>
                      </div>
                      {tempBotPersona === 'zen' && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.personaZenDesc}
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Daily AI Habit Analysis Report */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {language === 'fa' ? 'گزارش و تحلیل روزانه هوش مصنوعی' : language === 'ar' ? 'تقرير وتحليل الذكاء الاصطناعي اليومي' : 'Daily AI Analysis Report'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fa' 
                        ? 'تحلیل عصب‌شناختی پیشرفت عادات بر اساس مدل ۶۶ روزه دکتر فیلیپا لالی' 
                        : language === 'ar'
                        ? 'تحليل التقدم العصبي للعادات وفق النموذج العلمي 66 يوماً'
                        : 'Neuroscience-based daily habit coaching and critique'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  <input
                    id="auto-daily-report-toggle"
                    type="checkbox"
                    checked={tempAutoReport}
                    onChange={(e) => setTempAutoReport(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{t.autoDailyReportToggle}</span>
                </label>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.telegramDescription || (language === 'fa' 
                  ? 'ربات تلگرام به همراه هوش مصنوعی، روزانه پیشرفت عادات شما را تحلیل کرده، نقد و بررسی سازنده، پیشنهادات علمی و جمله انگیزشی اختصاصی را سر ساعت معین به چت شما ارسال می‌کند.' 
                  : 'Your Telegram bot and AI analyze daily habit progress based on Dr. Lally’s neuroscience model, sending actionable critique, tips, and motivation directly to your chat.')}
              </p>

              {tempAutoReport && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t.reportTimeLabel}:</span>
                    <input
                      type="time"
                      value={tempReportTime}
                      onChange={(e) => setTempReportTime(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="send-ai-report-now-btn"
                      type="button"
                      onClick={handleSendAIReportToTelegram}
                      disabled={isSendingReport || !tempBotToken.trim()}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSendingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isSendingReport ? t.generatingAiReport : t.sendAiReportNowBtn}</span>
                    </button>

                    <button
                      id="view-ai-report-in-app-btn"
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAIReport();
                      }}
                      className="px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t.viewAiReport}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Daily Reminders Section (Multiple specific hours in day) */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.remindersSectionTitle || t.remindersSection || (language === 'fa' ? 'یادآورهای روزانه کارهای انجام‌نشده (Daily Reminders)' : language === 'ar' ? 'تذكيرات المهام اليومية المتبقية' : 'Daily Pending Tasks & Habits Reminders')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fa' 
                        ? 'ارسال پیام یادآوری خلاصه برای کارهای باقی‌مانده و میزان پیشرفت امروز' 
                        : language === 'ar'
                        ? 'إرسال تذكير موجز بالمهام المتبقية ونسبة الإنجاز اليومي'
                        : 'Concise daily reminder of pending tasks and current progress'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-teal-700 dark:text-teal-400 shrink-0">
                  <input
                    id="reminder-enabled-toggle"
                    type="checkbox"
                    checked={tempReminderEnabled}
                    onChange={(e) => setTempReminderEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>{t.reminderToggleLabel || (language === 'fa' ? 'فعال‌سازی یادآورها' : language === 'ar' ? 'تفعيل التذكيرات' : 'Enable Reminders')}</span>
                </label>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.remindersSectionDesc || t.remindersDesc || (language === 'fa' 
                  ? 'تنظیم ساعت‌های مشخص در طول روز برای ارسال پیام‌های خلاصه و جمع‌وجور به تلگرام؛ فقط شامل لیست کارهای باقی‌مانده و میزان کارهای انجام‌شده امروز بدون نصیحت و حاشیه، همراه با دکمه‌های شیشه‌ای ثبت سریع.' 
                  : language === 'ar'
                  ? 'تحديد أوقات مخصصة خلال اليوم لإرسال رسائل تذكيرية موجزة ومباشرة عبر تيليجرام بالمهام المتبقية ونسبة الإنجاز مع أزرار الإنجاز الفوري.'
                  : 'Set specific hours throughout the day to receive concise, to-the-point Telegram reminders listing remaining tasks and today\'s completion progress without unsolicited advice.')}
              </p>

              {tempReminderEnabled && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 animate-in fade-in">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t.reminderTimesListLabel} ({tempReminderTimes.length}):
                  </div>

                  {/* List of configured reminder times */}
                  <div className="flex flex-wrap items-center gap-2">
                    {tempReminderTimes.length === 0 ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                        {t.noReminderTimesAdded}
                      </span>
                    ) : (
                      tempReminderTimes.map((timeVal) => (
                        <div
                          key={timeVal}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900/60 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold shadow-xs"
                        >
                          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>{timeVal}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReminderTime(timeVal)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add new time picker */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <input
                      id="new-reminder-time-input"
                      type="time"
                      value={newReminderTimeInput}
                      onChange={(e) => setNewReminderTimeInput(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
                    />
                    <button
                      id="add-reminder-time-btn"
                      type="button"
                      onClick={handleAddReminderTime}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addReminderTimeBtn}</span>
                    </button>

                    <button
                      id="test-reminder-btn"
                      type="button"
                      onClick={handleTestReminder}
                      disabled={isSendingReminderTest}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800/80 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 mr-auto"
                    >
                      {isSendingReminderTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                      <span>{isSendingReminderTest ? t.testingTelegram : t.sendReminderTestBtn}</span>
                    </button>
                  </div>

                  {reminderFeedback && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                        reminderFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {reminderFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="font-medium leading-relaxed">{reminderFeedback.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Strict Nightly Accountability Deadline Warning */}
            <div className="bg-rose-50/40 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-950/70 space-y-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 dark:bg-rose-600/90 text-white flex items-center justify-center shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-rose-950 dark:text-rose-200">
                      {t.strictWarningSection}
                    </h3>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/70 font-medium mt-0.5">
                      {language === 'fa' ? 'ارسال هشدار چندجمله‌ای و فقط فهرست کارهای انجام‌نشده بدون هیچ مورد اضافی' : language === 'ar' ? 'إنذار من بضع جمل وقائمة المهام المتبقية فقط دون إضافات' : 'Concise multi-sentence alert with only the uncompleted items list'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/80 px-2.5 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60">
                  <input
                    id="strict-warning-enabled-toggle"
                    type="checkbox"
                    checked={tempStrictWarningEnabled}
                    onChange={(e) => setTempStrictWarningEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>{t.enableStrictWarningToggle}</span>
                </label>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.strictWarningDesc}
              </p>

              {tempStrictWarningEnabled && (
                <div className="pt-3 space-y-3 border-t border-rose-200/60 dark:border-rose-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span className="text-xs text-slate-700 dark:text-slate-200 font-bold">{t.strictWarningTimeLabel}:</span>
                      <input
                        id="strict-warning-time-input"
                        type="time"
                        value={tempStrictWarningTime}
                        onChange={(e) => setTempStrictWarningTime(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <button
                      id="test-strict-warning-btn"
                      type="button"
                      onClick={handleTestStrictWarning}
                      disabled={isSendingStrictWarningTest}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isSendingStrictWarningTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>{isSendingStrictWarningTest ? t.testingTelegram : t.sendStrictWarningTestBtn}</span>
                    </button>
                  </div>

                  {strictWarningFeedback && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                        strictWarningFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {strictWarningFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="font-medium leading-relaxed">{strictWarningFeedback.text}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Habit Visual Progress Charts & Infographics Section */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-sky-200 dark:border-sky-950/60 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.visualChartSectionTitle || (language === 'fa' ? 'ماتریس و اینفوگرافیک تصویری عادات (Habit Charts)' : 'Habit Visual Progress Charts & Infographics')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fa'
                        ? 'تولید و ارسال اینفوگرافیک تصویری تقویم و پیشرفت عادات به تلگرام'
                        : language === 'ar'
                        ? 'توليد وإرسال مخططات بيانية مصورة للتقدم عبر تيليجرام'
                        : 'Visual habit matrix and automaticity progress rendering'}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-sky-700 dark:text-sky-400 shrink-0">
                  <input
                    id="send-visual-charts-toggle"
                    type="checkbox"
                    checked={tempSendVisualCharts}
                    onChange={(e) => setTempSendVisualCharts(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>{t.sendVisualChartsToggle || (language === 'fa' ? 'ارسال تصاویر ماتریس' : 'Send Visual Charts')}</span>
                </label>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.visualChartSectionDesc || (language === 'fa'
                  ? 'ارسال تصویر اختصاصی ماتریس فعالیت و تقویم ۱۴ روزه برای هر عادت به صورت جداگانه، شامل درصد پیشرفت، روزهای تخمینی مانده تا ۶۶ روز و تاریخ تکمیل.'
                  : language === 'ar'
                  ? 'إرسال صورة مخصصة لمصفوفة النشاط وتقويم الـ 14 يوماً لكل عادة على حدة، بما في ذلك نسبة التقدم وتاريخ الإنجاز المتوقع.'
                  : 'Receive dedicated progress matrix images for each habit in Telegram, including completion percentage and remaining days to 66-day automaticity.')}
              </p>

              {tempSendVisualCharts && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-sky-100 dark:border-sky-900/40 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <Image className="w-3.5 h-3.5 text-sky-500" />
                    <span>{language === 'fa' ? 'فرمت: تصویر اینفوگرافیک با کیفیت بالا + درصد خودکارشدگی' : language === 'ar' ? 'صورة مخطط بياني عالي الدقة' : 'High-res horizontal progress bar infographic'}</span>
                  </div>

                  <button
                    id="test-visual-chart-btn"
                    type="button"
                    onClick={handleTestVisualChart}
                    disabled={isSendingChartTest || !tempBotToken.trim()}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSendingChartTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                    <span>{isSendingChartTest ? t.testingTelegram : t.sendVisualChartTestBtn}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Instant Push Notifications & Web Sync */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.notifyOnTaskCompletionTitle || (language === 'fa' ? 'اعلان‌های فوری و همگام‌سازی لحظه‌ای با تلگرام' : 'Instant Push Notifications & Web Sync')}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'fa' 
                        ? 'ارسال خودکار پیام‌های تشویقی و پاداش‌ها هنگام انجام تسک‌ها یا ثبت عادات' 
                        : language === 'ar'
                        ? 'إرسال إشعارات فورية بالمكافآت عند إنجاز المهام أو تسجيل العادات'
                        : 'Real-time alert dispatching when checking off tasks or habits'}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'fa' 
                  ? 'با فعال‌سازی هریک از گزینه‌های زیر، به محض انجام عملیات در وب‌سایت، پیام تبریک، واریز سکه‌ها، امتیاز XP یا ارتقای خودکارشدگی عصبی فوراً به چت تلگرام شما فرستاده می‌شود.'
                  : language === 'ar'
                  ? 'عند تفعيل هذه الخيارات، سيتم إرسال إشعار فوري ومباشر إلى تيليجرام فور إتمام أي مهمة أو تسجيل عادة في الموقع مع العملات والنقاط المكتسبة.'
                  : 'Whenever you check off a task or habit in the web app, instant congratulatory alerts with earned coins, XP rewards, or neural automaticity updates are sent to Telegram.'}
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-200 dark:border-slate-800/80">
                <label className="flex items-start justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {t.notifyOnTaskCompletionLabel || (language === 'fa' ? 'ارسال پیام آنی هنگام انجام تسک‌ها' : 'Notify on Task Completion')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {t.notifyOnTaskCompletionDesc || (language === 'fa' ? 'پیام تبریک، واریز +10 سکه و +5 XP به کیف پول' : 'Congratulatory message & coin reward')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempNotifyOnTaskCompletion}
                    onChange={(e) => setTempNotifyOnTaskCompletion(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  />
                </label>

                <label className="flex items-start justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-800 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {t.notifyOnHabitCheckLabel || (language === 'fa' ? 'ارسال نوتیفیکیشن هنگام ثبت عادت' : 'Notify on Habit Check-in')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {t.notifyOnHabitCheckDesc || (language === 'fa' ? 'پیام افزایش خودکارشدگی و حفظ زنجیره عادت' : 'Automaticity growth & streak safeguard')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempNotifyOnHabitCheck}
                    onChange={(e) => setTempNotifyOnHabitCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  />
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end border-t border-slate-200 dark:border-slate-800/80">
                <button
                  id="test-instant-push-notification-btn"
                  type="button"
                  onClick={handleTestInstantNotification}
                  disabled={isSendingInstantTest || !tempBotToken.trim()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSendingInstantTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSendingInstantTest ? t.testingTelegram : (t.sendInstantNotificationTestBtn || (language === 'fa' ? 'آزمایش ارسال پیام و اعلان فوری به تلگرام' : 'Test Instant Push Notification'))}</span>
                </button>
              </div>
            </div>

            {/* Pomodoro, Deep Work & Focus Management in Telegram & AI */}
            <div className="bg-gradient-to-br from-rose-50/70 via-slate-50 to-amber-50/50 dark:from-slate-950/90 dark:via-slate-900/60 dark:to-rose-950/30 p-4 sm:p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                        {t.pomodoroTelegramSectionTitle || (language === 'fa' ? '🍅 مدیریت پومودورو، کار عمیق و تمرکز هوشمند در تلگرام و AI' : 'Pomodoro & Deep Work in Telegram & AI')}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {language === 'fa' ? 'ربات + وب + هوش مصنوعی' : 'Bot + Web + AI'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {t.pomodoroTelegramSectionDesc || (language === 'fa' 
                        ? 'امکان شروع تایمرها، هشدارهای پایان جلسات تمرکز، واریز خودکار سکه‌ها و دریافت مشاوره تمرکز از هوش مصنوعی در محیط تلگرام.' 
                        : 'Manage focus timers, receive session completion alerts, and get AI coaching via Telegram.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Telegram Bot Commands Quick Chips */}
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-100 dark:border-rose-900/40 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  {language === 'fa' ? '⚡ دستورات تعاملی پومودورو در ربات تلگرام:' : language === 'ar' ? '⚡ أوامر بومودورو التفاعلية في البوت:' : '⚡ Interactive Telegram Bot Commands:'}
                </span>
                <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 font-semibold" title="شروع تایمر ۲۵ دقیقه">
                    /pomodoro
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 font-semibold" title="شروع کار عمیق ۵۰ دقیقه">
                    /pomodoro 50
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 font-semibold" title="بررسی زمان باقیمانده">
                    /pomo_status
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold" title="لغو یا توقف تایمر">
                    /pomo_stop
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-semibold" title="مشاوره هوش مصنوعی برای تمرکز">
                    /pomo_coach
                  </span>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-rose-200/60 dark:border-rose-900/40">
                <label className="flex items-start justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-rose-300 dark:hover:border-rose-800 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {t.notifyOnPomodoroCompletionLabel || (language === 'fa' ? 'ارسال خودکار اعلان پایان پومودورو به تلگرام' : 'Notify on Pomodoro Completion')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {t.notifyOnPomodoroCompletionDesc || (language === 'fa' ? 'پیام تبریک، مدت زمان، واریز +5 سکه و +20 XP به تلگرام' : 'Congratulatory alert, focus minutes, and earned coins')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempNotifyOnPomodoroCompletion}
                    onChange={(e) => setTempNotifyOnPomodoroCompletion(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer mt-0.5"
                  />
                </label>

                <label className="flex items-start justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-rose-300 dark:hover:border-rose-800 transition">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                      {t.enableTelegramPomodoroControlLabel || (language === 'fa' ? 'دسترسی به تایمرها و دستورات در ربات تلگرام' : 'Enable Pomodoro Controls in Bot')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-relaxed">
                      {t.enableTelegramPomodoroControlDesc || (language === 'fa' ? 'امکان شروع جلسات ۲۵ و ۵۰ دقیقه‌ای مستقیم از تلگرام با هشدار پایان' : 'Start focus sessions directly via bot')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempEnableTelegramPomodoroControl}
                    onChange={(e) => setTempEnableTelegramPomodoroControl(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer mt-0.5"
                  />
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-end border-t border-rose-200/60 dark:border-rose-900/40">
                <button
                  id="test-pomodoro-telegram-notification-btn"
                  type="button"
                  onClick={handleTestPomodoroNotification}
                  disabled={isSendingPomodoroTest || !tempBotToken.trim()}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSendingPomodoroTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Timer className="w-3.5 h-3.5" />}
                  <span>{isSendingPomodoroTest ? t.testingTelegram : (t.sendPomodoroTestBtn || (language === 'fa' ? 'آزمایش ارسال اعلان پومودورو به تلگرام' : 'Test Pomodoro Notification'))}</span>
                </button>
              </div>
            </div>

            {/* Quiet Hours / Silent Mode */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <VolumeX className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.quietHoursTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.quietHoursDesc}
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={tempQuietHoursEnabled}
                    onChange={(e) => setTempQuietHoursEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-700 focus:ring-slate-500 cursor-pointer"
                  />
                  <span>{language === 'fa' ? 'فعال‌سازی' : 'Enable'}</span>
                </label>
              </div>

              {tempQuietHoursEnabled && (
                <div className="pt-2 flex flex-wrap items-center gap-4 border-t border-slate-200 dark:border-slate-800/80 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{t.quietHoursStart}:</span>
                    <input
                      type="time"
                      value={tempQuietHoursStart}
                      onChange={(e) => setTempQuietHoursStart(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{t.quietHoursEnd}:</span>
                    <input
                      type="time"
                      value={tempQuietHoursEnd}
                      onChange={(e) => setTempQuietHoursEnd(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Telegram Bot Commands & Listening Card */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t.telegramInteractiveSection}
                    </h3>
                  </div>
                </div>

                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                    isTelegramConfigured
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isTelegramConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{isTelegramConfigured ? (language === 'fa' ? 'ربات آماده شنود و پاسخگویی' : language === 'ar' ? 'البوت جاهز للرد' : 'Bot Listening & Interactive') : (language === 'fa' ? 'نیازمند تنظیم توکن' : language === 'ar' ? 'يتطلب التوكن' : 'Needs Token')}</span>
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                {t.telegramInteractiveDesc}
              </p>

              {/* Commands List */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t.botCommandsTitle} ({language === 'fa' ? 'هماهنگ با تمام قابلیت‌های نسخه جدید و دکمه‌های شیشه‌ای' : 'Synchronized with all new features and inline buttons'})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded text-[11px]">/habits</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdHabitsDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px]">/add</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdAddDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">/tasks</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'فهرست، مدیریت و تیک زدن وظایف و تسک‌ها' : 'Task management & toggle'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px]">/addtask</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'افزودن سریع تسک جدید' : 'Add a new task'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px]">/today</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'چک‌لیست تجمیعی عادات و تسک‌های امروز' : "Today's combined checklist"}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[11px]">/wallet</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'کیف پول، سکه‌ها و تراکنش‌های پاداش' : 'Rewards Wallet & Coins'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px]">/shop</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'فروشگاه جوایز و آزادسازی رمان‌ها' : 'Reward Store & Novel Unlocks'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded text-[11px]">/ask</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'پرسش از مربی هوش مصنوعی علوم اعصاب' : 'Ask AI Neuroscience Coach'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">/report</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdReportDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/60 px-1.5 py-0.5 rounded text-[11px]">/achievements</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{language === 'fa' ? 'نشان‌های نورونی و رتبه مغز' : 'Brain level & Badges'}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded text-[11px]">/chart</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdChartDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-[11px]">/delete</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdDeleteDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px]">/stats</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdStatsDesc}</span>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[11px]">/backup</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{t.cmdBackupDesc}</span>
                  </div>
                </div>
              </div>

              {/* Set bot menu button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  id="set-telegram-bot-menu-btn"
                  type="button"
                  onClick={handleSetBotMenu}
                  disabled={isSettingMenu || !tempBotToken.trim()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {isSettingMenu ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  <span>{isSettingMenu ? t.settingBotMenu : t.setBotMenuBtn}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Upgraded Granular Backup, Snapshots & Auto-Backup to Telegram */}
        {activeTab === 'backup' && (
          <BackupSettingsTab
            language={language}
            theme={theme}
            habits={habits}
            tasks={tasks}
            wallet={wallet}
            customNovels={customNovels}
            customMovies={customMovies}
            customPlaylists={customPlaylists}
            deletedMovieIds={deletedMovieIds}
            deletedPlaylistIds={deletedPlaylistIds}
            deletedNovelIds={deletedNovelIds}
            telegramConfig={{
              ...telegramConfig,
              botToken: tempBotToken.trim() || telegramConfig.botToken || '',
              chatId: tempChatId.trim() || telegramConfig.chatId || '',
              autoDailyReport: tempAutoReport,
              reportTime: tempReportTime,
              reminderEnabled: tempReminderEnabled,
              reminderTimes: tempReminderTimes,
              strictWarningEnabled: tempStrictWarningEnabled,
              strictWarningTime: tempStrictWarningTime,
              sendVisualCharts: tempSendVisualCharts,
              botPersona: tempBotPersona,
              aiModelPreference: tempAiModelPreference,
              telegramAiKeyId: tempTelegramAiKeyId,
              notifyOnTaskCompletion: tempNotifyOnTaskCompletion,
              notifyOnHabitCheck: tempNotifyOnHabitCheck,
              quietHoursEnabled: tempQuietHoursEnabled,
              quietHoursStart: tempQuietHoursStart,
              quietHoursEnd: tempQuietHoursEnd,
              autoBackupEnabled: tempAutoBackup,
              backupInterval: tempBackupInterval,
              backupTime: tempBackupTime,
            }}
            advancedSettings={tempAdvancedSettings}
            onUpdateTelegramConfig={(updatedTg) => {
              if (updatedTg.autoBackupEnabled !== undefined) setTempAutoBackup(updatedTg.autoBackupEnabled);
              if (updatedTg.backupInterval !== undefined) setTempBackupInterval(updatedTg.backupInterval);
              if (updatedTg.backupTime !== undefined) setTempBackupTime(updatedTg.backupTime);
              onUpdateTelegramConfig({
                ...telegramConfig,
                ...updatedTg,
                botToken: tempBotToken.trim() || updatedTg.botToken || telegramConfig.botToken || '',
                chatId: tempChatId.trim() || updatedTg.chatId || telegramConfig.chatId || '',
              });
            }}
            onRestoreHabits={onRestoreHabits}
            onRestoreNovels={onRestoreNovels}
            onCloseModal={onClose}
          />
        )}

        {/* Tab 4: Advanced Settings */}
        {activeTab === 'advanced' && (
          <AdvancedSettingsTab
            language={language}
            theme={theme}
            telegramConfig={telegramConfig}
            advancedSettings={tempAdvancedSettings}
            habits={habits}
            wallet={wallet}
            customNovels={customNovels}
            customMovies={customMovies}
            customPlaylists={customPlaylists}
            deletedMovieIds={deletedMovieIds}
            deletedPlaylistIds={deletedPlaylistIds}
            deletedNovelIds={deletedNovelIds}
            tasks={tasks}
            onChange={(newSettings) => {
              setTempAdvancedSettings(newSettings);
              if (onUpdateAdvancedSettings) {
                onUpdateAdvancedSettings(newSettings);
              }
            }}
          />
        )}

        {/* Footer Actions */}
        <div className="pt-5 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            id="save-settings-btn"
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-blue-500 transition text-xs shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{t.saveSettingsBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
