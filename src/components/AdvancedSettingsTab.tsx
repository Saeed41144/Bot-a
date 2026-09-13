import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Volume2, 
  Vibrate, 
  Sparkles, 
  Flame, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  Check, 
  Play, 
  Info, 
  ShieldCheck, 
  Calendar,
  Activity,
  Layers,
  Brain,
  BarChart3,
  Languages,
  Key,
  Database,
  Server,
  Download,
  Upload,
  FolderTree,
  FolderPlus,
  Video,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Copy,
  FileText,
  Trash2,
  Clock,
  Terminal,
  FolderSearch,
  FileArchive,
  Image,
  ChevronDown,
  ChevronUp,
  History,
  Archive,
  Film,
  Music,
  Pause,
  Plus,
  Minus,
  Coins,
  Award,
  Timer,
  Zap,
  FileAudio,
  VolumeX,
} from 'lucide-react';
import { Language, ThemeMode, TelegramConfig, AdvancedSettings, Habit, RewardWallet, WebNovel, ShopMovie, VideoPlaylist, AISettingsSection, PomodoroCustomSound } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { 
  playCheckinSound, 
  playCelebrationSound, 
  triggerHapticFeedback, 
  triggerCelebrationConfetti, 
  getLocalStorageStats, 
  optimizeLocalStorage 
} from '../utils/feedbackEffects';
import { 
  getAllCustomPomodoroSounds, 
  saveCustomPomodoroSound, 
  deleteCustomPomodoroSound, 
  fileToBase64, 
  getAudioDuration, 
  previewCustomSound, 
  stopPreviewCustomSound 
} from '../utils/pomodoroSoundManager';
import { AIKeySectionManager } from './AIKeySectionManager';
import { createCompleteBackupPayload, downloadBackupFile, copyBackupToClipboard } from '../utils/backupHelper';
import { DiscoveredMediaConfigModal } from './DiscoveredMediaConfigModal';

interface AdvancedSettingsTabProps {
  language: Language;
  theme?: ThemeMode;
  telegramConfig?: TelegramConfig;
  advancedSettings: AdvancedSettings;
  habits: Habit[];
  wallet?: RewardWallet;
  customNovels?: WebNovel[];
  customMovies?: ShopMovie[];
  customPlaylists?: VideoPlaylist[];
  deletedMovieIds?: string[];
  deletedPlaylistIds?: string[];
  deletedNovelIds?: string[];
  tasks?: any[];
  storeProducts?: any[];
  onChange: (updated: AdvancedSettings) => void;
  onRefreshFromDatabase?: () => Promise<void>;
}

export const AdvancedSettingsTab: React.FC<AdvancedSettingsTabProps> = ({
  language,
  theme = 'light',
  telegramConfig = {
    botToken: '',
    chatId: '',
    autoDailyReport: false,
    reportTime: '21:00',
  },
  advancedSettings,
  habits,
  wallet,
  customNovels,
  customMovies,
  customPlaylists = [],
  deletedMovieIds = [],
  deletedPlaylistIds = [],
  deletedNovelIds = [],
  tasks = [],
  storeProducts,
  onChange,
  onRefreshFromDatabase,
}) => {
  const t = translations[language];
  const [storageStats, setStorageStats] = useState(() => getLocalStorageStats());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationSuccess, setOptimizationSuccess] = useState(false);
  const [activeAISubTab, setActiveAISubTab] = useState<'analytics' | 'translation'>('analytics');
  const [isCopyingFullJson, setIsCopyingFullJson] = useState(false);
  const [fullJsonCopiedSuccess, setFullJsonCopiedSuccess] = useState(false);
  const [proactive, setProactive] = useState<{
    enabled: boolean;
    intensity: 'gentle' | 'balanced' | 'strict';
    maxPerDay: number;
    missPatrolEnabled: boolean;
    timingEnabled: boolean;
    relapseEnabled: boolean;
    overdueEnabled: boolean;
    todayQuotaUsed: number;
    totalSent: number;
    totalActed: number;
    responseRate: number;
    relapseRiskScore: number;
    relapseRiskLevel: string;
  } | null>(null);
  const [isSavingProactive, setIsSavingProactive] = useState(false);
  const [proactiveFeedback, setProactiveFeedback] = useState<string | null>(null);

  const loadProactive = React.useCallback(async () => {
    try {
      const res = await fetch('/api/proactive/status');
      const data = await res.json();
      if (data?.success) {
        setProactive({
          ...data.config,
          todayQuotaUsed: data.stats?.todayQuotaUsed || 0,
          totalSent: data.stats?.totalSent || 0,
          totalActed: data.stats?.totalActed || 0,
          responseRate: data.stats?.responseRate || 0,
          relapseRiskScore: data.relapseRisk?.score || 0,
          relapseRiskLevel: data.relapseRisk?.level || 'low',
        });
      }
    } catch { /* server may be offline */ }
  }, []);

  useEffect(() => { loadProactive(); }, [loadProactive]);

  const updateProactive = async (patch: Record<string, any>) => {
    setIsSavingProactive(true);
    try {
      const res = await fetch('/api/proactive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: patch }),
      });
      const data = await res.json();
      if (data?.success) {
        setProactive((prev) => (prev ? { ...prev, ...data.config } : prev));
        setProactiveFeedback(language === 'fa' ? '✅ ذخیره شد' : language === 'ar' ? '✅ تم الحفظ' : '✅ Saved');
        setTimeout(() => setProactiveFeedback(null), 2000);
      }
    } catch { /* ignore */ }
    setIsSavingProactive(false);
  };

  // Server Persistent DB stats & action states
  const [serverStats, setServerStats] = useState<{
    isServerPersistent?: boolean;
    antiWipeProtected?: boolean;
    dataDir?: string;
    dbPath?: string;
    novelsPath?: string;
    videosPath?: string;
    storePath?: string;
    mediaPath?: string;
    dbSizeBytes?: number;
    formattedDbSize?: string;
    totalServerSizeBytes?: number;
    formattedTotalServerSize?: string;
    habitsCount?: number;
    tasksCount?: number;
    customNovelsCount?: number;
    customMoviesCount?: number;
    customPlaylistsCount?: number;
    storeProductsCount?: number;
    backupsCount?: number;
    backupsSizeBytes?: number;
    formattedBackupsSize?: string;
    backupsList?: Array<{ name: string; size: number; formattedSize: string; time: number; date: string }>;
    videoFilesCount?: number;
    videoSizeBytes?: number;
    formattedVideoSize?: string;
    videoFolders?: Array<{ name: string; isDirectory: boolean; count: number; size: number; formattedSize: string }>;
    novelsFilesCount?: number;
    novelsSizeBytes?: number;
    formattedNovelSize?: string;
    novelsFolders?: Array<{ name: string; isDirectory: boolean; count: number; size: number; formattedSize: string }>;
    mediaFilesCount?: number;
    mediaSizeBytes?: number;
    formattedMediaSize?: string;
    storeFilesCount?: number;
    storeSizeBytes?: number;
    formattedStoreSize?: string;
    lastUpdated?: number;
    systemInfo?: {
      isTermux?: boolean;
      platform?: string;
      arch?: string;
      nodeVersion?: string;
    };
  } | null>(null);

  const [isSavingDisk, setIsSavingDisk] = useState(false);
  const [saveDiskFeedback, setSaveDiskFeedback] = useState<string | null>(null);
  const [isCleaningFiles, setIsCleaningFiles] = useState(false);
  const [cleanFilesFeedback, setCleanFilesFeedback] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snapshot Management States
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);
  const [restoringSnapshotName, setRestoringSnapshotName] = useState<string | null>(null);
  const [deletingSnapshotName, setDeletingSnapshotName] = useState<string | null>(null);
  const [showBackupsArchive, setShowBackupsArchive] = useState(false);

  // Store Files & Media Management States
  const [customStorePathInput, setCustomStorePathInput] = useState<string>(
    advancedSettings.storeStoragePath || ''
  );
  const [isSettingStorePath, setIsSettingStorePath] = useState(false);
  const [storePathFeedback, setStorePathFeedback] = useState<string | null>(null);

  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanAllFeedback, setScanAllFeedback] = useState<string | null>(null);
  const [isScanningNovels, setIsScanningNovels] = useState(false);
  const [scanNovelsFeedback, setScanNovelsFeedback] = useState<string | null>(null);

  const [isSyncingDisk, setIsSyncingDisk] = useState(false);
  const [syncDiskFeedback, setSyncDiskFeedback] = useState<string | null>(null);

  const [isScanningVideos, setIsScanningVideos] = useState(false);
  const [scanVideosFeedback, setScanVideosFeedback] = useState<string | null>(null);
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [uploadZipFeedback, setUploadZipFeedback] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [showStoreExplorer, setShowStoreExplorer] = useState(false);
  const [showTermuxGuide, setShowTermuxGuide] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Discovered Media Modal Setup State
  const [discoveredModalOpen, setDiscoveredModalOpen] = useState(false);
  const [discoveredModalItem, setDiscoveredModalItem] = useState<any>(null);
  const [discoveredModalType, setDiscoveredModalType] = useState<'movie' | 'novel'>('movie');

  // Pomodoro Custom Ambient Sounds State
  const [customSounds, setCustomSounds] = useState<PomodoroCustomSound[]>([]);
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const [soundUploadFeedback, setSoundUploadFeedback] = useState<string | null>(null);
  const [previewingSoundId, setPreviewingSoundId] = useState<string | null>(null);
  const [soundNameInput, setSoundNameInput] = useState<string>('');
  const soundFileInputRef = useRef<HTMLInputElement>(null);

  const refreshCustomSounds = async () => {
    try {
      const sounds = await getAllCustomPomodoroSounds();
      setCustomSounds(sounds);
    } catch (err) {
      console.warn('Failed to load custom pomodoro sounds in settings:', err);
    }
  };

  useEffect(() => {
    refreshCustomSounds();
    const handleSoundsChanged = () => {
      refreshCustomSounds();
    };
    window.addEventListener('pomodoroCustomSoundsChanged', handleSoundsChanged);
    return () => {
      stopPreviewCustomSound();
      window.removeEventListener('pomodoroCustomSoundsChanged', handleSoundsChanged);
    };
  }, []);

  const handleSoundFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i)) {
      setSoundUploadFeedback(language === 'fa' ? 'لطفاً یک فایل صوتی معتبر (MP3, WAV, OGG, M4A, AAC) انتخاب کنید.' : 'Please select a valid audio file.');
      setTimeout(() => setSoundUploadFeedback(null), 4000);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setSoundUploadFeedback(language === 'fa' ? 'حجم فایل صوتی بیش از حد مجاز است (حداکثر ۲۰ مگابایت).' : 'File size too large (max 20MB).');
      setTimeout(() => setSoundUploadFeedback(null), 4000);
      return;
    }

    setIsUploadingSound(true);
    setSoundUploadFeedback(null);
    try {
      const base64 = await fileToBase64(file);
      const duration = await getAudioDuration(base64);

      const defaultName = soundNameInput.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      const newSound: PomodoroCustomSound = {
        id: `sound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: defaultName,
        fileName: file.name,
        fileSize: formattedSize,
        fileData: base64,
        duration,
        createdAt: Date.now(),
      };

      await saveCustomPomodoroSound(newSound);
      await refreshCustomSounds();

      if (!advancedSettings.pomodoroAmbientSound || advancedSettings.pomodoroAmbientSound === 'none') {
        onChange({
          ...advancedSettings,
          pomodoroAmbientSound: newSound.id,
        });
      }

      setSoundNameInput('');
      setSoundUploadFeedback(
        language === 'fa' 
          ? `فایل «${newSound.name}» با موفقیت ذخیره شد.` 
          : `Audio "${newSound.name}" added successfully.`
      );
      setTimeout(() => setSoundUploadFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to save audio file:', err);
      setSoundUploadFeedback(language === 'fa' ? 'خطا در بارگذاری فایل صوتی.' : 'Failed to save audio file.');
      setTimeout(() => setSoundUploadFeedback(null), 4000);
    } finally {
      setIsUploadingSound(false);
    }
  };

  const handleTogglePreviewSound = (sound: PomodoroCustomSound) => {
    if (previewingSoundId === sound.id) {
      stopPreviewCustomSound();
      setPreviewingSoundId(null);
    } else {
      stopPreviewCustomSound();
      previewCustomSound(sound, () => {
        setPreviewingSoundId(null);
      });
      setPreviewingSoundId(sound.id);
    }
  };

  const handleDeleteSound = async (soundId: string, soundName: string) => {
    if (previewingSoundId === soundId) {
      stopPreviewCustomSound();
      setPreviewingSoundId(null);
    }

    await deleteCustomPomodoroSound(soundId);
    await refreshCustomSounds();

    if (advancedSettings.pomodoroAmbientSound === soundId) {
      onChange({
        ...advancedSettings,
        pomodoroAmbientSound: 'none',
      });
    }

    setSoundUploadFeedback(
      language === 'fa'
        ? `فایل صوتی «${soundName}» حذف شد.`
        : `Audio "${soundName}" deleted.`
    );
    setTimeout(() => setSoundUploadFeedback(null), 3500);
  };

  const fetchServerStats = async () => {
    try {
      const res = await fetch('/api/storage/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setServerStats(data.stats);
        }
      }
    } catch {
      // Ignore network hiccup
    }
  };

  useEffect(() => {
    fetchServerStats();
  }, []);

  const handleForceSaveToDisk = async () => {
    setIsSavingDisk(true);
    setSaveDiskFeedback(null);
    try {
      const res = await fetch('/api/storage/force-save', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveDiskFeedback(data.message || t.forceSaveSuccess);
        if (data.stats) setServerStats(data.stats);
        setTimeout(() => setSaveDiskFeedback(null), 5000);
      }
    } catch {
      setSaveDiskFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Failed to connect to server');
    } finally {
      setIsSavingDisk(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setSnapshotFeedback(null);
    try {
      const res = await fetch('/api/storage/create-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'manual' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSnapshotFeedback(data.message || t.createSnapshotSuccess);
        if (data.stats) setServerStats(data.stats);
        setTimeout(() => setSnapshotFeedback(null), 5000);
      } else {
        setSnapshotFeedback(data.error || (language === 'fa' ? 'خطا در ایجاد اسنپ‌شات' : 'Snapshot failed'));
      }
    } catch {
      setSnapshotFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Failed to connect to server');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    const confirmPrompt = language === 'fa'
      ? `آیا از بازگردانی پایگاه داده از اسنپ‌شات «${filename}» اطمینان دارید؟ تمام داده‌ها با این نسخه جایگزین خواهند شد.`
      : language === 'ar'
      ? `هل أنت متأكد من استعادة قاعدة البيانات من اللقطة «${filename}»؟ سيتم استبدال البيانات الحالية.`
      : `Restore database from snapshot "${filename}"? Current data will be replaced.`;

    if (!window.confirm(confirmPrompt)) return;

    setRestoringSnapshotName(filename);
    setRestoreFeedback(null);
    try {
      const res = await fetch('/api/storage/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreFeedback({ type: 'success', text: data.message });
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => {
          setRestoreFeedback(null);
          window.location.reload();
        }, 1500);
      } else {
        setRestoreFeedback({ type: 'error', text: data.error || 'خطا در بازگردانی اسنپ‌شات' });
      }
    } catch {
      setRestoreFeedback({ type: 'error', text: language === 'fa' ? 'خطا در ارتباط با سرور' : 'Failed to connect' });
    } finally {
      setRestoringSnapshotName(null);
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    if (!window.confirm(t.deleteSnapshotConfirm)) return;
    setDeletingSnapshotName(filename);
    try {
      const res = await fetch(`/api/storage/snapshots/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.stats) setServerStats(data.stats);
      }
    } catch {
      // Ignore
    } finally {
      setDeletingSnapshotName(null);
    }
  };

  const handleSetStoragePath = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSettingStorePath(true);
    setStorePathFeedback(null);
    try {
      const res = await fetch('/api/store/set-storage-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: customStorePathInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStorePathFeedback(data.message || (language === 'fa' ? 'مسیر فروشگاه با موفقیت تغییر کرد و اسکن شد.' : 'Storage path updated.'));
        if (data.stats) setServerStats(data.stats);
        onChange({
          ...advancedSettings,
          storeStoragePath: customStorePathInput.trim(),
        });
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => setStorePathFeedback(null), 6000);
      } else {
        setStorePathFeedback(data.error || (language === 'fa' ? 'خطا در اعمال مسیر ذخیره‌سازی' : 'Failed to update store path'));
      }
    } catch {
      setStorePathFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Connection failed');
    } finally {
      setIsSettingStorePath(false);
    }
  };

  const handleScanAllStore = async () => {
    setIsScanningAll(true);
    setScanAllFeedback(null);
    try {
      const res = await fetch('/api/store/scan-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanAllFeedback(data.message || (language === 'fa' ? 'اسکن همه‌جانبه با موفقیت انجام شد.' : 'All store folders scanned.'));
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => setScanAllFeedback(null), 6000);
      } else {
        setScanAllFeedback(data.error || (language === 'fa' ? 'خطا در اسکن فروشگاه' : 'Scan failed'));
      }
    } catch {
      setScanAllFeedback(language === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Connection failed');
    } finally {
      setIsScanningAll(false);
    }
  };

  const handleScanNovelsFolder = async () => {
    setIsScanningNovels(true);
    setScanNovelsFeedback(null);
    try {
      const res = await fetch('/api/store/scan-novels-folder', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanNovelsFeedback(data.message || (language === 'fa' ? 'اسکن پوشه رمان‌ها با موفقیت انجام شد.' : 'Novels scanned.'));
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => setScanNovelsFeedback(null), 6000);
      } else {
        setScanNovelsFeedback(data.error || (language === 'fa' ? 'خطا در اسکن رمان‌ها' : 'Scan failed'));
      }
    } catch {
      setScanNovelsFeedback(language === 'fa' ? 'خطا در برقراری ارتباط با سرور' : 'Connection failed');
    } finally {
      setIsScanningNovels(false);
    }
  };

  const handleSyncAllStoreToDisk = async () => {
    setIsSyncingDisk(true);
    setSyncDiskFeedback(null);
    try {
      const res = await fetch('/api/store/sync-to-disk', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncDiskFeedback(data.message || (language === 'fa' ? 'تمامی پوشه‌ها با موفقیت بر روی دیسک ایجاد و همگام شدند.' : 'Folders synced on disk.'));
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => setSyncDiskFeedback(null), 7000);
      } else {
        setSyncDiskFeedback(data.error || (language === 'fa' ? 'خطا در همگام‌سازی پوشه‌ها' : 'Sync failed'));
      }
    } catch {
      setSyncDiskFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Connection failed');
    } finally {
      setIsSyncingDisk(false);
    }
  };

  const handleOpenDiscoveredConfig = (item: any, type: 'movie' | 'novel') => {
    setDiscoveredModalItem(item);
    setDiscoveredModalType(type);
    setDiscoveredModalOpen(true);
  };

  const handleScanVideosFolder = async () => {
    setIsScanningVideos(true);
    setScanVideosFeedback(null);
    try {
      const res = await fetch('/api/store/scan-videos-folder', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setScanVideosFeedback(data.message || t.scanVideosSuccess);
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => setScanVideosFeedback(null), 6000);
      } else {
        setScanVideosFeedback(data.error || (language === 'fa' ? 'خطا در اسکن پوشه ویدیوها' : 'Scan failed'));
      }
    } catch {
      setScanVideosFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Server connection failed');
    } finally {
      setIsScanningVideos(false);
    }
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingZip(true);
    setUploadZipFeedback(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const zipBase64 = reader.result as string;
          const baseFolderName = file.name.replace(/\.zip$/i, '');
          const res = await fetch('/api/store/upload-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zipBase64, baseFolderName }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setUploadZipFeedback(data.message);
            if (data.stats) setServerStats(data.stats);
            if (onRefreshFromDatabase) {
              await onRefreshFromDatabase();
            }
            setTimeout(() => setUploadZipFeedback(null), 7000);
          } else {
            setUploadZipFeedback(data.error || 'خطا در استخراج فایل زیپ');
          }
        } catch (err: any) {
          setUploadZipFeedback(err.message || 'خطا در ارسال فایل زیپ');
        } finally {
          setIsUploadingZip(false);
          if (event.target) event.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingZip(false);
      setUploadZipFeedback(err.message || 'خطا در بارگذاری فایل');
    }
  };

  const handleCleanupOrphanFiles = async () => {
    setIsCleaningFiles(true);
    setCleanFilesFeedback(null);
    try {
      const res = await fetch('/api/storage/cleanup-orphan-files', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCleanFilesFeedback(data.message || (language === 'fa' ? 'فایل‌های بلااستفاده با موفقیت پاک شدند.' : 'Orphan files cleaned.'));
        if (data.stats) setServerStats(data.stats);
        setTimeout(() => setCleanFilesFeedback(null), 5000);
      }
    } catch {
      setCleanFilesFeedback(language === 'fa' ? 'خطا در ارتباط با سرور' : 'Failed to connect to server');
    } finally {
      setIsCleaningFiles(false);
    }
  };

  const handleExportFullBackup = () => {
    try {
      const activeTheme: ThemeMode = theme === 'dark' ? 'dark' : 'light';
      const fullPayload = createCompleteBackupPayload(
        habits,
        language,
        activeTheme,
        telegramConfig,
        wallet,
        customNovels,
        advancedSettings,
        storeProducts,
        tasks,
        customMovies,
        customPlaylists,
        deletedMovieIds,
        deletedPlaylistIds,
        deletedNovelIds
      );
      downloadBackupFile(fullPayload, 'habit-tracker-complete-all-data-backup');
    } catch {
      window.location.href = '/api/storage/export-full-backup';
    }
  };

  const handleCopyFullBackupJson = async () => {
    setIsCopyingFullJson(true);
    try {
      const activeTheme: ThemeMode = theme === 'dark' ? 'dark' : 'light';
      const fullPayload = createCompleteBackupPayload(
        habits,
        language,
        activeTheme,
        telegramConfig,
        wallet,
        customNovels,
        advancedSettings,
        storeProducts,
        tasks,
        customMovies,
        customPlaylists,
        deletedMovieIds,
        deletedPlaylistIds,
        deletedNovelIds
      );
      const ok = await copyBackupToClipboard(fullPayload);
      if (ok) {
        setFullJsonCopiedSuccess(true);
        setTimeout(() => setFullJsonCopiedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to copy full backup JSON:', err);
    } finally {
      setIsCopyingFullJson(false);
    }
  };

  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreFeedback(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/storage/import-full-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreFeedback({
          type: 'success',
          text: data.message || t.importBackupSuccess,
        });
        if (data.stats) setServerStats(data.stats);
        if (onRefreshFromDatabase) {
          await onRefreshFromDatabase();
        }
        setTimeout(() => {
          setRestoreFeedback(null);
          window.location.reload();
        }, 1500);
      } else {
        setRestoreFeedback({
          type: 'error',
          text: data.error || 'خطا در بازیابی دیتابیس',
        });
      }
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        text: language === 'fa' ? 'فایل پشتیبان معتبر نمی‌باشد (خطای تجزیه JSON)' : 'Invalid JSON backup file',
      });
    } finally {
      setIsRestoring(false);
      if (event.target) event.target.value = '';
    }
  };

  // Total check-ins calculation
  const totalCheckInsCount = habits.reduce((acc, h) => acc + Object.keys(h.history || {}).length, 0);
  const totalTransactionsCount = wallet?.transactions?.length || 0;

  const targetDayPresets = [
    { days: 21, label: language === 'fa' ? '۲۱ روز (پایه)' : language === 'ar' ? '21 يوماً (أساسي)' : '21 Days (Sprint)' },
    { days: 30, label: language === 'fa' ? '۳۰ روز (یک‌ماهه)' : language === 'ar' ? '30 يوماً (شهري)' : '30 Days (Monthly)' },
    { days: 66, label: language === 'fa' ? '۶۶ روز (مدل لالی ★)' : language === 'ar' ? '66 يوماً (نموذج لالي ★)' : '66 Days (Lally Standard ★)', isRecommended: true },
    { days: 90, label: language === 'fa' ? '۹۰ روز (تسلط فصلی)' : language === 'ar' ? '90 يوماً (إتقان فصلي)' : '90 Days (Mastery)' },
    { days: 100, label: language === 'fa' ? '۱۰۰ روز (قرن عادات)' : language === 'ar' ? '100 يوم (مئوية)' : '100 Days (Century)' },
  ];

  const handleToggle = (key: keyof AdvancedSettings) => {
    onChange({
      ...advancedSettings,
      [key]: !advancedSettings[key],
    });
  };

  const handleDefaultDaysChange = (days: number) => {
    onChange({
      ...advancedSettings,
      defaultTargetDays: Math.max(1, Math.min(365, days)),
    });
  };

  const handleAnalyticsAIChange = (section: AISettingsSection) => {
    onChange({
      ...advancedSettings,
      aiConfig: {
        ...advancedSettings.aiConfig,
        analyticsAI: section,
      },
    });
  };

  const handleTranslationAIChange = (section: AISettingsSection) => {
    onChange({
      ...advancedSettings,
      aiConfig: {
        ...advancedSettings.aiConfig,
        translationAI: section,
      },
    });
  };

  const handleTestSound = () => {
    playCheckinSound();
    triggerHapticFeedback(20);
  };

  const handleTestConfetti = () => {
    triggerCelebrationConfetti();
    playCelebrationSound();
    triggerHapticFeedback([30, 50, 30]);
  };

  const handleUpdatePomodoroField = (key: keyof AdvancedSettings, value: number, min = 1, max = 500) => {
    const num = isNaN(value) ? min : Math.max(min, Math.min(max, value));
    const newConfig = {
      ...(advancedSettings.pomodoroConfig || {}),
      ...(key === 'pomodoroRewardCoins' ? { rewardCoins: num } : {}),
      ...(key === 'pomodoroRewardXp' ? { rewardXp: num } : {}),
      ...(key === 'pomodoroFocusDuration' ? { focusMinutes: num } : {}),
      ...(key === 'pomodoroShortBreakDuration' ? { shortBreakMinutes: num } : {}),
      ...(key === 'pomodoroLongBreakDuration' ? { longBreakMinutes: num } : {}),
      ...(key === 'stopwatchRewardCoinsPerMinute' ? { stopwatchCoinsPerMinute: num } : {}),
      ...(key === 'stopwatchRewardXpPerMinute' ? { stopwatchXpPerMinute: num } : {}),
    };
    onChange({
      ...advancedSettings,
      [key]: num,
      pomodoroConfig: newConfig,
    });
  };

  const handleOptimizeStorage = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      optimizeLocalStorage();
      setStorageStats(getLocalStorageStats());
      setIsOptimizing(false);
      setOptimizationSuccess(true);
      setTimeout(() => setOptimizationSuccess(false), 3000);
    }, 400);
  };

  const analyticsKeysCount = advancedSettings.aiConfig?.analyticsAI?.keys?.length || 0;
  const translationKeysCount = advancedSettings.aiConfig?.translationAI?.keys?.length || 0;

  return (
    <div className="space-y-6">
      {/* Title & Scope intro */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-slate-950 dark:to-slate-900 border border-blue-100 dark:border-slate-850">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 dark:bg-slate-800 text-white dark:text-slate-300 shadow-xs border border-transparent dark:border-slate-700/60">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              {t.advancedSettingsTitle}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
              {t.advancedSettingsDesc}
            </p>
          </div>
        </div>
      </div>

      {/* 24/7 Proactive Coach Section */}
      <div
        id="proactive-coach-settings-panel"
        className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-amber-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{language === 'fa' ? 'مربی پیش‌دستانه ۲۴/۷' : language === 'ar' ? 'المدرب الاستباقي ٢٤/٧' : '24/7 Proactive Coach'}</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'رصد خودکار عادت‌ها، تشخیص افت، پنجرهٔ طلایی و هشدار لغزش پیش از وقوع'
                  : language === 'ar'
                  ? 'مراقبة تلقائية للعادات، النافذة الذهبية، والتحذير المبكر'
                  : 'Automatic habit monitoring, golden windows, and pre-emptive relapse alerts'}
              </p>
            </div>
          </div>
          {proactive && (
            <button
              type="button"
              onClick={() => updateProactive({ enabled: !proactive.enabled })}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${proactive.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              aria-label="toggle proactive coach"
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${proactive.enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          )}
        </div>

        {!proactive ? (
          <p className="text-[11px] text-slate-400">
            {language === 'fa' ? 'سرور در دسترس نیست…' : language === 'ar' ? 'الخادم غير متاح…' : 'Server unavailable…'}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-amber-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'ارسال شده' : language === 'ar' ? 'مُرسل' : 'Sent'}</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{formatNumber(proactive.totalSent, language)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-amber-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'اقدام شده' : language === 'ar' ? 'استجاب' : 'Acted'}</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatNumber(proactive.totalActed, language)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-amber-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500">{language === 'fa' ? 'نرخ پاسخ' : language === 'ar' ? 'معدل الاستجابة' : 'Response'}</div>
                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{Math.round(proactive.responseRate * 100)}٪</div>
              </div>
            </div>

            {/* Intensity selector */}
            <div>
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                {language === 'fa' ? 'شدت و لحن مربی' : language === 'ar' ? 'شدّة المدرب' : 'Coach intensity'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'gentle', fa: 'ملایم 🌿', ar: 'هادئ 🌿', en: 'Gentle 🌿' },
                  { key: 'balanced', fa: 'متعادل ⚖️', ar: 'معتدل ⚖️', en: 'Balanced ⚖️' },
                  { key: 'strict', fa: 'سختگیر ⚡', ar: 'صارم ⚡', en: 'Strict ⚡' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateProactive({ intensity: opt.key })}
                    disabled={isSavingProactive}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      proactive.intensity === opt.key
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white/70 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                    }`}
                  >
                    {language === 'fa' ? opt.fa : language === 'ar' ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature toggles */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'missPatrolEnabled', fa: 'مراقبت افت‌ها', ar: 'مراقبة التراجع', en: 'Miss Patrol' },
                { key: 'timingEnabled', fa: 'پنجرهٔ طلایی', ar: 'النافذة الذهبية', en: 'Golden Window' },
                { key: 'relapseEnabled', fa: 'هشدار لغزش', ar: 'تحذير الانتكاس', en: 'Relapse Alert' },
                { key: 'overdueEnabled', fa: 'تسک‌های معوق', ar: 'المهام المتأخرة', en: 'Overdue Tasks' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => updateProactive({ [f.key]: !(proactive as any)[f.key] })}
                  disabled={isSavingProactive}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                    (proactive as any)[f.key]
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-slate-50 dark:bg-slate-950/60 text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>{language === 'fa' ? f.fa : language === 'ar' ? f.ar : f.en}</span>
                  <span>{(proactive as any)[f.key] ? '✓' : '○'}</span>
                </button>
              ))}
            </div>

            {/* Daily cap + relapse risk */}
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span>{language === 'fa' ? 'سقف پیام روزانه:' : language === 'ar' ? 'حد الرسائل:' : 'Daily cap:'}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => updateProactive({ maxPerDay: Math.max(1, proactive.maxPerDay - 1) })} className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black cursor-pointer">−</button>
                  <span className="w-6 text-center font-black">{formatNumber(proactive.maxPerDay, language)}</span>
                  <button type="button" onClick={() => updateProactive({ maxPerDay: Math.min(10, proactive.maxPerDay + 1) })} className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black cursor-pointer">+</button>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg font-bold ${proactive.relapseRiskScore >= 60 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' : proactive.relapseRiskScore >= 35 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                {language === 'fa' ? `ریسک لغزش: ${proactive.relapseRiskScore}٪` : language === 'ar' ? `خطر الانتكاس: ${proactive.relapseRiskScore}٪` : `Relapse risk: ${proactive.relapseRiskScore}%`}
              </div>
            </div>

            {proactiveFeedback && (
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 text-center">{proactiveFeedback}</div>
            )}
          </div>
        )}
      </div>

      {/* AI Key Management Section with Two Dedicated Sub-Divisions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{language === 'fa' ? 'مدیریت چندگانه کلیدهای هوش مصنوعی (Multi-Key & Model Failover)' : language === 'ar' ? 'إدارة مفاتيح ونماذج الذكاء الاصطناعي المتعددة' : 'AI Multi-Key & Model Failover Hub'}</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa' 
                  ? 'تفکیک تخصصی کلیدها، انتخاب مدل پویا و سیستم تاب‌آوری خودکار (عدم توقف در صورت قطعی)'
                  : language === 'ar'
                  ? 'فصل المفاتيح حسب الاستخدام، واختيار النموذج مع تجاوز الفشل التلقائي'
                  : 'Dedicated API keys with model selection and multi-provider automatic failover'}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs for Analytics vs Translation AI */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            id="ai-tab-analytics-btn"
            type="button"
            onClick={() => setActiveAISubTab('analytics')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeAISubTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs border border-indigo-100 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'گزارش و تحلیل آمار عادات' : language === 'ar' ? 'التقارير وتحليل العادات' : 'Habit Analytics AI'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              analyticsKeysCount > 0
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {formatNumber(analyticsKeysCount, language)}
            </span>
          </button>

          <button
            id="ai-tab-translation-btn"
            type="button"
            onClick={() => setActiveAISubTab('translation')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeAISubTab === 'translation'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-xs border border-purple-100 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{language === 'fa' ? 'ترجمه رمان و استخراج HTML' : language === 'ar' ? 'ترجمة الروايات واستخراج HTML' : 'Novel Translation & Web AI'}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              translationKeysCount > 0
                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {formatNumber(translationKeysCount, language)}
            </span>
          </button>
        </div>

        {/* Render Selected AI Sub-Section */}
        {activeAISubTab === 'analytics' ? (
          <div className="animate-in fade-in duration-200">
            <AIKeySectionManager
              language={language}
              sectionKey="analyticsAI"
              title={language === 'fa' ? 'بخش ۱: کلیدهای هوش مصنوعی گزارش و تحلیل آمار' : language === 'ar' ? 'القسم 1: مفاتيح تحليل وتقارير العادات' : 'Section 1: Habit Analytics & Automated Coaching AI'}
              subtitle={language === 'fa' ? 'گزارش‌دهی و تحلیل عادات' : language === 'ar' ? 'التحليلات والتقارير' : 'Analytics & Insights'}
              icon={<BarChart3 className="w-5 h-5" />}
              description={language === 'fa' 
                ? 'این کلیدها به صورت اختصاصی برای تولید گزارش‌های هوشمند روزانه، تحلیل منحنی خودکارسازی لالی (۲۰۱۰)، بازخورد تلگرام و پیشنهادهای علمی به کار می‌روند.'
                : language === 'ar'
                ? 'تُستخدم هذه المفاتيح حصرياً لتوليد التقارير اليومية الذكية، وتحليل منحنى لالي وتدريب العادات.'
                : 'Used specifically for generating daily habit reports, automaticity progress analysis, and behavioral insights.'}
              sectionData={advancedSettings.aiConfig?.analyticsAI || { keys: [], autoFallback: true }}
              onChange={handleAnalyticsAIChange}
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <AIKeySectionManager
              language={language}
              sectionKey="translationAI"
              title={language === 'fa' ? 'بخش ۲: کلیدهای هوش مصنوعی ترجمه رمان و استخراج HTML' : language === 'ar' ? 'القسم 2: مفاتيح ترجمة الروايات واستخراج HTML' : 'Section 2: Novel Translation & Web Content Extraction AI'}
              subtitle={language === 'fa' ? 'ترجمه و استخراج محتوا' : language === 'ar' ? 'الترجمة واستخراج المحتوى' : 'Translation & Web Extraction'}
              icon={<Languages className="w-5 h-5" />}
              description={language === 'fa'
                ? 'این کلیدها برای ترجمه عمیق و چندبخشی رمان‌های متنی، استخراج هوشمند محتوای خالص از صفحات وب/HTML و پاک‌سازی نویز به کار می‌روند.'
                : language === 'ar'
                ? 'تُستخدم هذه المفاتيح لترجمة الروايات واستخراج فصول القصص من صفحات الويب وتنظيف الإعلانات.'
                : 'Used for literary web novel chapter translation, raw HTML parsing, and smart ad-stripping.'}
              sectionData={advancedSettings.aiConfig?.translationAI || { keys: [], autoFallback: true }}
              onChange={handleTranslationAIChange}
            />
          </div>
        )}
      </div>

      {/* Section 1: Scientific Target Days & Mathematical Model */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t.defaultTargetDaysLabel}
            </h4>
          </div>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            {formatNumber(advancedSettings.defaultTargetDays || 66, language)}{' '}
            {language === 'fa' ? 'روز' : language === 'ar' ? 'يوم' : 'Days'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.defaultTargetDaysDesc}
        </p>

        {/* Presets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {targetDayPresets.map((preset) => {
            const isSelected = (advancedSettings.defaultTargetDays || 66) === preset.days;
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => handleDefaultDaysChange(preset.days)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700'
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Audio & Haptic Feedback */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t.feedbackEffectsTitle}
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {t.feedbackEffectsDesc}
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t.soundEffectsLabel || t.soundFeedbackLabel}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.soundEffectsDesc || t.soundFeedbackDesc}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestSound}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                title="Test Sound"
              >
                <Play className="w-3 h-3" />
              </button>
              <input
                id="sound-enabled-toggle"
                type="checkbox"
                checked={advancedSettings.enableSoundEffects !== false}
                onChange={() => handleToggle('enableSoundEffects')}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t.hapticFeedbackLabel}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.hapticFeedbackDesc}
                </span>
              </div>
            </div>
            <input
              id="haptics-enabled-toggle"
              type="checkbox"
              checked={advancedSettings.enableHapticFeedback !== false}
              onChange={() => handleToggle('enableHapticFeedback')}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {/* Confetti Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t.confettiEffectsLabel || t.confettiCelebrationLabel}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.confettiEffectsDesc || t.confettiCelebrationDesc}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConfetti}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                title="Test Confetti"
              >
                <Play className="w-3 h-3" />
              </button>
              <input
                id="confetti-enabled-toggle"
                type="checkbox"
                checked={advancedSettings.enableCelebrationConfetti !== false}
                onChange={() => handleToggle('enableCelebrationConfetti')}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Pomodoro Timing & Focus Rewards Configuration */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t.pomodoroSettingsTitle || 'پیکربندی زمان‌ها و پاداش‌های تمرکز پومودورو'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'تنظیم دقیق مقدار سکه و امتیاز تجربه (XP) برای اتمام جلسات تمرکز، و مدت زمان‌های استاندارد پومودورو.'
                  : language === 'ar'
                  ? 'تخصيص مكافآت العملات ونقاط الخبرة وفترات التركيز والاستراحة.'
                  : 'Configure XP and coin rewards for completed focus sessions and timer durations.'}
              </p>
            </div>
          </div>
        </div>

        {/* Qualification Rule Notice Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">
              {language === 'fa' ? 'قانون دریافت پاداش تمرکز:' : language === 'ar' ? 'شروط الحصول على المكافأة:' : 'Focus Reward Eligibility Rule:'}
            </span>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
              {t.pomodoroMin25MinNotice ||
                'سکه و امتیاز تجربه (XP) تنها زمانی به کاربر تعلق می‌گیرد که حداقل ۲۵ دقیقه تمرکز را با موفقیت تمام کرده باشد. در صورت رد کردن (Skip) یا توقف زودهنگام قبل از ۲۵ دقیقه، فقط دقایق واقعی صرف‌شده ثبت شده و هیچ پاداشی داده نمی‌شود.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1: Reward Coins */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {t.pomodoroRewardCoinsLabel || 'سکه پاداش جلسه ۲۵ دقیقه‌ای'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.pomodoroRewardCoinsDesc || 'سکه اعطایی پس از تکمیل ۲۵ دقیقه تمرکز'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                +{formatNumber(advancedSettings.pomodoroRewardCoins ?? advancedSettings.pomodoroConfig?.rewardCoins ?? 5, language)} 🪙
              </span>
            </div>

            {/* Stepper + Quick Presets */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 3, 5, 10, 15, 25].map((val) => {
                  const current = advancedSettings.pomodoroRewardCoins ?? advancedSettings.pomodoroConfig?.rewardCoins ?? 5;
                  const isSelected = current === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleUpdatePomodoroField('pomodoroRewardCoins', val, 1, 100)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const curr = advancedSettings.pomodoroRewardCoins ?? advancedSettings.pomodoroConfig?.rewardCoins ?? 5;
                    handleUpdatePomodoroField('pomodoroRewardCoins', curr - 1, 1, 100);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curr = advancedSettings.pomodoroRewardCoins ?? advancedSettings.pomodoroConfig?.rewardCoins ?? 5;
                    handleUpdatePomodoroField('pomodoroRewardCoins', curr + 1, 1, 100);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Reward XP */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {t.pomodoroRewardXpLabel || 'امتیاز تجربه (XP) پاداش ۲۵ دقیقه'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.pomodoroRewardXpDesc || 'امتیاز تجربه اعطایی پس از تکمیل ۲۵ دقیقه تمرکز'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                +{formatNumber(advancedSettings.pomodoroRewardXp ?? advancedSettings.pomodoroConfig?.rewardXp ?? 20, language)} ⭐
              </span>
            </div>

            {/* Stepper + Quick Presets */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 20, 30, 50, 100].map((val) => {
                  const current = advancedSettings.pomodoroRewardXp ?? advancedSettings.pomodoroConfig?.rewardXp ?? 20;
                  const isSelected = current === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleUpdatePomodoroField('pomodoroRewardXp', val, 1, 200)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const curr = advancedSettings.pomodoroRewardXp ?? advancedSettings.pomodoroConfig?.rewardXp ?? 20;
                    handleUpdatePomodoroField('pomodoroRewardXp', curr - 5, 1, 200);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="-5"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curr = advancedSettings.pomodoroRewardXp ?? advancedSettings.pomodoroConfig?.rewardXp ?? 20;
                    handleUpdatePomodoroField('pomodoroRewardXp', curr + 5, 1, 200);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="+5"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Stopwatch Reward Coins per Minute */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {t.stopwatchRewardCoinsLabel || 'سکه پاداش هر دقیقه کرنومتر آزاد'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.stopwatchRewardCoinsDesc || 'تعداد سکه دریافتی به ازای هر ۱ دقیقه تمرکز با کرنومتر'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                +{formatNumber(Math.round(advancedSettings.stopwatchRewardCoinsPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchCoinsPerMinute ?? 1), language)} 🪙/دقیقه
              </span>
            </div>

            {/* Stepper + Quick Presets */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 5, 10].map((val) => {
                  const current = Math.round(advancedSettings.stopwatchRewardCoinsPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchCoinsPerMinute ?? 1);
                  const isSelected = current === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleUpdatePomodoroField('stopwatchRewardCoinsPerMinute', val, 0, 50)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const curr = Math.round(advancedSettings.stopwatchRewardCoinsPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchCoinsPerMinute ?? 1);
                    handleUpdatePomodoroField('stopwatchRewardCoinsPerMinute', curr - 1, 0, 50);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curr = Math.round(advancedSettings.stopwatchRewardCoinsPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchCoinsPerMinute ?? 1);
                    handleUpdatePomodoroField('stopwatchRewardCoinsPerMinute', curr + 1, 0, 50);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Stopwatch Reward XP per Minute */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {t.stopwatchRewardXpLabel || 'امتیاز تجربه (XP) هر دقیقه کرنومتر آزاد'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.stopwatchRewardXpDesc || 'مقدار امتیاز تجربه اعطایی به ازای هر ۱ دقیقه تمرکز با کرنومتر'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800">
                +{formatNumber(Math.round(advancedSettings.stopwatchRewardXpPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchXpPerMinute ?? 2), language)} ⭐/دقیقه
              </span>
            </div>

            {/* Stepper + Quick Presets */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[0, 1, 2, 3, 5, 10, 20].map((val) => {
                  const current = Math.round(advancedSettings.stopwatchRewardXpPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchXpPerMinute ?? 2);
                  const isSelected = current === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleUpdatePomodoroField('stopwatchRewardXpPerMinute', val, 0, 100)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {formatNumber(val, language)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const curr = Math.round(advancedSettings.stopwatchRewardXpPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchXpPerMinute ?? 2);
                    handleUpdatePomodoroField('stopwatchRewardXpPerMinute', curr - 1, 0, 100);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const curr = Math.round(advancedSettings.stopwatchRewardXpPerMinute ?? advancedSettings.pomodoroConfig?.stopwatchXpPerMinute ?? 2);
                    handleUpdatePomodoroField('stopwatchRewardXpPerMinute', curr + 1, 0, 100);
                  }}
                  className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integer Rounding Clarification Note */}
        <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <span>✨</span>
          <span>{t.pomodoroIntegerRewardNotice || 'کلیه پاداش‌های دریافتی به عدد صحیح بدون کسر تقریب زده می‌شوند.'}</span>
        </div>

        {/* Timing Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Focus Duration */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t.pomodoroFocusMode || 'تمرکز عمیق'}</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatNumber(advancedSettings.pomodoroFocusDuration ?? advancedSettings.pomodoroConfig?.focusMinutes ?? 25, language)} {t.pomodoroMinutesLabel || 'دقیقه'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 25, 30, 45, 60].map((mins) => {
                const current = advancedSettings.pomodoroFocusDuration ?? advancedSettings.pomodoroConfig?.focusMinutes ?? 25;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleUpdatePomodoroField('pomodoroFocusDuration', mins, 1, 180)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      current === mins
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {formatNumber(mins, language)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Short Break */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t.pomodoroShortBreak || 'استراحت کوتاه'}</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {formatNumber(advancedSettings.pomodoroShortBreakDuration ?? advancedSettings.pomodoroConfig?.shortBreakMinutes ?? 5, language)} {t.pomodoroMinutesLabel || 'دقیقه'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[3, 5, 8, 10].map((mins) => {
                const current = advancedSettings.pomodoroShortBreakDuration ?? advancedSettings.pomodoroConfig?.shortBreakMinutes ?? 5;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleUpdatePomodoroField('pomodoroShortBreakDuration', mins, 1, 60)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      current === mins
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {formatNumber(mins, language)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Long Break */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>{t.pomodoroLongBreak || 'استراحت طولانی'}</span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {formatNumber(advancedSettings.pomodoroLongBreakDuration ?? advancedSettings.pomodoroConfig?.longBreakMinutes ?? 15, language)} {t.pomodoroMinutesLabel || 'دقیقه'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 15, 20, 30].map((mins) => {
                const current = advancedSettings.pomodoroLongBreakDuration ?? advancedSettings.pomodoroConfig?.longBreakMinutes ?? 15;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleUpdatePomodoroField('pomodoroLongBreakDuration', mins, 1, 90)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      current === mins
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {formatNumber(mins, language)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Custom Pomodoro Ambient Audio Manager */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {language === 'fa' 
                  ? 'آپلود و مدیریت صداهای پس‌زمینه پومودورو' 
                  : language === 'ar'
                  ? 'إدارة ورفع الملفات الصوتية للتركيز (بومودورو)'
                  : 'Pomodoro Ambient Audio Files'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'fa'
                  ? 'فایل‌های صوتی آرامش‌بخش، نویزها یا موسیقی تمرکز دلخواه خود را بارگذاری کنید تا در هنگام اجرای پومودورو پخش شوند.'
                  : language === 'ar'
                  ? 'قم برفع ملفاتك الصوتية المفضلة لتشغيلها كصوت خلفية أثناء جلسات التركيز.'
                  : 'Upload custom audio files (MP3, WAV, OGG, M4A) to play as relaxing background sounds during Pomodoro focus sessions.'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {formatNumber(customSounds.length, language)} {language === 'fa' ? 'فایل صوتی' : 'sounds'}
          </span>
        </div>

        {/* Upload Form Card */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:flex-1">
              <input
                id="custom-sound-name-input"
                type="text"
                value={soundNameInput}
                onChange={(e) => setSoundNameInput(e.target.value)}
                placeholder={language === 'fa' ? 'عنوان دلخواه صدا (اختیاری، مثلا: پیانو آرامش‌بخش)' : 'Sound Title (e.g. Cozy Rain, Soft Piano)'}
                className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              id="upload-sound-trigger-btn"
              type="button"
              onClick={() => soundFileInputRef.current?.click()}
              disabled={isUploadingSound}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              <Plus className={`w-3.5 h-3.5 ${isUploadingSound ? 'animate-spin' : ''}`} />
              <span>{isUploadingSound ? (language === 'fa' ? 'در حال پردازش...' : 'Processing...') : (language === 'fa' ? 'انتخاب و آپلود فایل صوتی' : 'Choose & Upload Audio')}</span>
            </button>

            <input
              type="file"
              ref={soundFileInputRef}
              onChange={handleSoundFileSelected}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 flex-wrap gap-1">
            <span>{language === 'fa' ? '💡 فرمت‌های مجاز: MP3, WAV, OGG, M4A, AAC, FLAC (حداکثر ۲۰ مگابایت)' : 'Supported formats: MP3, WAV, OGG, M4A, AAC (Max 20MB)'}</span>
            <span>{language === 'fa' ? '🔒 ذخیره امن و آفلاین در مرورگر' : 'Offline & Secure Storage'}</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {soundUploadFeedback && (
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{soundUploadFeedback}</span>
          </div>
        )}

        {/* Uploaded Sounds List */}
        <div className="space-y-2 pt-1">
          {customSounds.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
              <FileAudio className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'fa' ? 'هیچ فایل صوتی آپلود نشده است' : 'No custom audio files uploaded yet'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {language === 'fa'
                  ? 'صداهای پیش‌فرض قدیمی حذف شده‌اند. با کلیک بر روی دکمه بالا، فایل‌های صوتی مورد علاقه خود را اضافه کنید تا در پنجره پومودورو قابل انتخاب و پخش باشند.'
                  : 'Default generic sounds have been removed. Upload your own audio files above to use them in the Pomodoro widget.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customSounds.map((sound) => {
                const isSelectedAsDefault = advancedSettings.pomodoroAmbientSound === sound.id;
                const isPreviewing = previewingSoundId === sound.id;

                const durationFormatted = sound.duration
                  ? `${Math.floor(sound.duration / 60)}:${String(sound.duration % 60).padStart(2, '0')}`
                  : null;

                return (
                  <div
                    key={sound.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelectedAsDefault
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePreviewSound(sound)}
                          className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                            isPreviewing
                              ? 'bg-indigo-600 text-white animate-pulse'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={isPreviewing ? 'توقف پیش‌نمایش' : 'پخش پیش‌نمایش'}
                        >
                          {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate" title={sound.name}>
                            {sound.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-mono" title={sound.fileName}>
                            {sound.fileName}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSound(sound.id, sound.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer shrink-0"
                        title={language === 'fa' ? 'حذف فایل صوتی' : 'Delete sound'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                        {sound.fileSize && <span>{sound.fileSize}</span>}
                        {durationFormatted && <span>• {durationFormatted}</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onChange({
                            ...advancedSettings,
                            pomodoroAmbientSound: isSelectedAsDefault ? 'none' : sound.id,
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          isSelectedAsDefault
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelectedAsDefault && <Check className="w-3 h-3" />}
                        <span>
                          {isSelectedAsDefault
                            ? (language === 'fa' ? 'صدای فعال پومودورو' : 'Active Sound')
                            : (language === 'fa' ? 'انتخاب به عنوان پیش‌فرض' : 'Set as Active')}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Strict Streak Mode */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t.strictStreakToggleLabel}
            </h4>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            advancedSettings.strictStreakMode !== false 
              ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {advancedSettings.strictStreakMode !== false 
              ? (language === 'fa' ? 'انضباط ۱۰۰٪ فعال' : language === 'ar' ? 'الانضباط التام مفعّل' : '100% Zero-Tolerance')
              : (language === 'fa' ? 'اغماض‌پذیر' : language === 'ar' ? 'مرن' : 'Flexible Mode')}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.strictStreakToggleDesc}
        </p>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
          <label htmlFor="strict-streak-toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {language === 'fa' ? 'ریست شدن فوری زنجیره ۱۰۰٪ در صورت از دست رفتن هر عادت:' : language === 'ar' ? 'تصفير فوري لسلسلة 100% عند تفويت أي عادة:' : 'Reset 100% streak immediately on missed habit:'}
          </label>
          <input
            id="strict-streak-toggle"
            type="checkbox"
            checked={advancedSettings.strictStreakMode !== false}
            onChange={() => handleToggle('strictStreakMode')}
            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Section 4: Server-Side Persistent Storage (Database & File Storage Management) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {t.fileStorageTitle || 'مدیریت و ذخیره‌سازی فایل‌های سیستم و پایگاه داده'}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              {t.antiWipeStatus}
            </span>
            {serverStats?.systemInfo?.isTermux && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Terminal className="w-3 h-3" />
                Termux Safe
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.fileStorageDesc}
        </p>

        {/* Server Storage Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 truncate">
              {language === 'fa' ? 'حجم دیتابیس دیسک' : language === 'ar' ? 'حجم قاعدة البيانات' : 'Server DB Size'}
            </span>
            <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {serverStats?.formattedDbSize || '0.05 KB'}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 truncate">
              {language === 'fa' ? 'عادات پایدار دیسک' : language === 'ar' ? 'العادات الدائمة' : 'Synced Habits'}
            </span>
            <span className="text-xs font-black font-mono text-slate-900 dark:text-white block truncate">
              {formatNumber(serverStats?.habitsCount ?? habits.length, language)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 truncate">
              {language === 'fa' ? 'اسنپ‌شات‌های سرور' : language === 'ar' ? 'النسخ الاحتياطية' : 'Snapshots'}
            </span>
            <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 block truncate">
              {formatNumber(serverStats?.backupsCount ?? (serverStats?.backupsList?.length || 1), language)} ({serverStats?.formattedBackupsSize || '0 KB'})
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 truncate">
              {language === 'fa' ? 'حافظه مرورگر' : language === 'ar' ? 'ذاكرة المتصفح' : 'Local Storage'}
            </span>
            <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-300 block truncate">
              {storageStats.formattedSize}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 truncate">
              {language === 'fa' ? 'کل فضای سرور' : language === 'ar' ? 'إجمالي مساحة الخادم' : 'Total Disk'}
            </span>
            <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400 block truncate">
              {serverStats?.formattedTotalServerSize || '0 KB'}
            </span>
          </div>
        </div>

        {/* Database Actions: Export, Copy JSON, Import, Force Save */}
        <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            id="export-full-backup-btn"
            type="button"
            onClick={handleExportFullBackup}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>{language === 'fa' ? 'دانلود پشتیبان کامل (همه داده‌ها)' : language === 'ar' ? 'تحميل النسخة الكاملة' : 'Download Complete Backup'}</span>
          </button>

          <button
            id="copy-full-backup-json-btn"
            type="button"
            onClick={handleCopyFullBackupJson}
            disabled={isCopyingFullJson}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{isCopyingFullJson ? (language === 'fa' ? 'در حال کپی...' : 'Copying...') : (language === 'fa' ? 'کپی متن JSON کامل' : language === 'ar' ? 'نسخ JSON الشامل' : 'Copy Full JSON')}</span>
          </button>

          <button
            id="import-full-backup-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Upload className={`w-3.5 h-3.5 text-indigo-500 ${isRestoring ? 'animate-bounce' : ''}`} />
            <span>{isRestoring ? (language === 'fa' ? 'در حال بازیابی...' : 'Restoring...') : t.importBackupBtn}</span>
          </button>

          <button
            id="force-save-disk-btn"
            type="button"
            onClick={handleForceSaveToDisk}
            disabled={isSavingDisk}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Database className={`w-3.5 h-3.5 text-emerald-500 ${isSavingDisk ? 'animate-pulse' : ''}`} />
            <span>{isSavingDisk ? (language === 'fa' ? 'در حال ذخیره...' : 'Saving...') : t.forceSaveDiskBtn}</span>
          </button>
        </div>

        {/* Snapshot Controls & Toolbar */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              className="py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-blue-200 dark:border-blue-800 disabled:opacity-50"
            >
              <Archive className={`w-3.5 h-3.5 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
              <span>{isCreatingSnapshot ? t.creatingSnapshot : t.createSnapshotBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBackupsArchive(!showBackupsArchive)}
              className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.serverBackupsListTitle}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-mono">
                {serverStats?.backupsList?.length ?? (serverStats?.backupsCount || 0)}
              </span>
              {showBackupsArchive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              id="optimize-cache-btn"
              type="button"
              onClick={handleOptimizeStorage}
              disabled={isOptimizing}
              className="py-1.5 px-3 rounded-lg bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer border border-dashed border-slate-300 dark:border-slate-800"
            >
              <RefreshCw className={`w-3 h-3 ${isOptimizing ? 'animate-spin text-blue-500' : ''}`} />
              <span>{t.optimizeCacheBtn}</span>
            </button>
          </div>

          {fullJsonCopiedSuccess && (
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'JSON کامل کپی شد!' : 'Full JSON copied!'}</span>
            </div>
          )}
        </div>

        {/* Server Snapshots Archive Drawer */}
        {showBackupsArchive && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {t.serverBackupsListTitle}
                </h5>
              </div>
              <span className="text-[9px] font-mono text-slate-400">
                /data/backups/
              </span>
            </div>

            {(!serverStats?.backupsList || serverStats.backupsList.length === 0) ? (
              <p className="text-[10px] text-slate-500 py-2 text-center">
                {language === 'fa' ? 'هیچ اسنپ‌شاتی در سرور یافت نشد. با کلیک روی «ایجاد اسنپ‌شات دستی» اولین نسخه را ثبت کنید.' : 'No snapshots found. Click "Create Server Snapshot" to create one.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {serverStats.backupsList.map((bk) => (
                  <div
                    key={bk.name}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-[10px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileArchive className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate" title={bk.name}>
                          {bk.name}
                        </span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {bk.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {bk.formattedSize}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(bk.name)}
                        disabled={restoringSnapshotName === bk.name}
                        className="py-1 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 transition cursor-pointer border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
                      >
                        <Upload className={`w-2.5 h-2.5 ${restoringSnapshotName === bk.name ? 'animate-bounce' : ''}`} />
                        <span>{restoringSnapshotName === bk.name ? t.restoringSnapshot : t.restoreSnapshotBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(bk.name)}
                        disabled={deletingSnapshotName === bk.name}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title={t.deleteSnapshotBtn}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Database Feedback alerts */}
        {snapshotFeedback && (
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{snapshotFeedback}</span>
          </div>
        )}

        {saveDiskFeedback && (
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{saveDiskFeedback}</span>
          </div>
        )}

        {restoreFeedback && (
          <div className={`text-[11px] font-bold flex items-center gap-1.5 p-2 rounded-lg border animate-in fade-in ${
            restoreFeedback.type === 'success'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
          }`}>
            {restoreFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{restoreFeedback.text}</span>
          </div>
        )}

        {optimizationSuccess && (
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{t.cacheOptimizedSuccess}</span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileRestore}
          accept=".json,application/json"
          className="hidden"
        />
      </div>

      {/* Section 5: Store Files & Media Storage Management */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {language === 'fa' ? 'مدیریت پوشه و مسیر ذخیره‌سازی فایل‌های فروشگاه' : t.storeFilesSectionTitle}
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Film className="w-3 h-3" />
              {serverStats?.formattedStoreSize || '0 KB'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {language === 'fa' 
            ? 'می‌توانید مسیر قرارگیری فایل‌های چندرسانه‌ای، فیلم‌ها، سریال‌ها و رمان‌ها را به پوشه دلخواه روی حافظه دستگاه (مانند کارت حافظه یا پوشه Termux) تغییر دهید. فایل‌های دستی ایجاد شده در این مسیرها خودکار شناسایی می‌شوند.'
            : t.storeFilesSectionDesc}
        </p>

        {/* Custom Storage Path Input & Configuration */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              <span>{language === 'fa' ? 'مسیر ریشه پوشه فروشگاه روی حافظه دستگاه:' : 'Store Root Directory Path:'}</span>
            </label>
            <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
              {serverStats?.storePath || './data/store'}
            </span>
          </div>

          <form onSubmit={handleSetStoragePath} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customStorePathInput}
              onChange={(e) => setCustomStorePathInput(e.target.value)}
              placeholder={language === 'fa' ? 'مثال: /sdcard/BotStore یا ./data/store' : 'e.g. /sdcard/BotStore or ./data/store'}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={isSettingStorePath}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSettingStorePath ? 'animate-spin' : ''}`} />
              <span>{isSettingStorePath ? (language === 'fa' ? 'در حال اعمال...' : 'Applying...') : (language === 'fa' ? 'ذخیره و اعمال مسیر' : 'Apply Path')}</span>
            </button>
          </form>

          {/* Quick Presets for Android / Termux / Local */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium">
              {language === 'fa' ? 'مسیرهای پیشنهادی:' : 'Quick Presets:'}
            </span>
            {[
              { label: language === 'fa' ? 'پیش‌فرض برنامه' : 'Default', path: './data/store' },
              { label: 'حافظه داخلی (SDCard)', path: '/sdcard/BotStore' },
              { label: 'فیلم‌های گوشی', path: '/sdcard/Movies/BotStore' },
              { label: 'پوشه اشتراکی Termux', path: '/data/data/com.termux/files/home/storage/shared/BotStore' },
            ].map((preset) => (
              <button
                key={preset.path}
                type="button"
                onClick={() => setCustomStorePathInput(preset.path)}
                className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 transition cursor-pointer border border-transparent hover:border-indigo-300"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {storePathFeedback && (
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{storePathFeedback}</span>
            </div>
          )}
        </div>

        {/* Discovered Media Pending Metadata Setup Notice */}
        {((customMovies?.some(m => m.needsMetadataSetup)) || (customNovels?.some(n => n.needsMetadataSetup))) && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{language === 'fa' ? 'فایل‌های جدید شناسایی شده از حافظه دستگاه (نیازمند قیمت‌گذاری و قفل)' : 'Discovered Media Pending Setup'}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                {formatNumber(
                  (customMovies?.filter(m => m.needsMetadataSetup).length || 0) +
                  (customNovels?.filter(n => n.needsMetadataSetup).length || 0),
                  language
                )} {language === 'fa' ? 'مورد جدید' : 'items'}
              </span>
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
              {language === 'fa'
                ? 'پوشه‌ها یا ویدیوهای زیر به صورت دستی روی دستگاه قرار گرفته و شناسایی شده‌اند. برای تعیین قیمت واحد و نام اثر، روی دکمه زیر کلیک کنید (تنها یک‌بار قابل تنظیم است).'
                : 'The following media was discovered directly on storage. Click to configure display title and lock pricing.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {customMovies?.filter(m => m.needsMetadataSetup).map(movie => (
                <div key={movie.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      {movie.title || movie.diskFolderName || movie.id}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {movie.hasSeasons ? `${movie.seasons?.length || 0} فصل` : `${movie.standaloneEpisodes?.length || 1} قسمت`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDiscoveredConfig(movie, 'movie')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 transition cursor-pointer shadow-xs"
                  >
                    {language === 'fa' ? 'تنظیم مشخصات و قیمت' : 'Configure & Lock'}
                  </button>
                </div>
              ))}

              {customNovels?.filter(n => n.needsMetadataSetup).map(novel => (
                <div key={novel.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                      {novel.title || novel.diskFolderName || novel.id}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {novel.chapters?.length || 1} {language === 'fa' ? 'فصل' : 'chapters'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDiscoveredConfig(novel, 'novel')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 transition cursor-pointer shadow-xs"
                  >
                    {language === 'fa' ? 'تنظیم مشخصات و قیمت' : 'Configure & Lock'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 Storage Repositories Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
          {/* Card 1: Videos Folder */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {t.videosFolderLabel}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  {serverStats?.formattedVideoSize || '0 KB'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 block truncate" title={serverStats?.moviesPath || serverStats?.videosPath}>
                {serverStats?.moviesPath || serverStats?.videosPath || '/data/store/movies/'}
              </span>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                <span>{t.videoFilesCountLabel} </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(serverStats?.videoFilesCount ?? (customMovies?.length || 0), language)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-1.5">
              <button
                type="button"
                onClick={handleScanVideosFolder}
                disabled={isScanningVideos}
                className="flex-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FolderSearch className={`w-3 h-3 ${isScanningVideos ? 'animate-spin' : ''}`} />
                <span>{isScanningVideos ? t.scanningVideos : t.scanVideosFolderBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={isUploadingZip}
                className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <FileArchive className={`w-3 h-3 text-purple-500 ${isUploadingZip ? 'animate-bounce' : ''}`} />
                <span>{isUploadingZip ? t.uploadingZip : t.uploadZipBtn}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Novels Folder */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {t.novelsFolderLabel}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                  {serverStats?.formattedNovelSize || '0 KB'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 block truncate" title={serverStats?.novelsPath}>
                {serverStats?.novelsPath || '/data/store/novels/'}
              </span>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                <span>{t.novelsFilesCountLabel} </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(serverStats?.novelsFilesCount ?? (serverStats?.customNovelsCount ?? (customNovels?.length || 0)), language)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleScanNovelsFolder}
                disabled={isScanningNovels}
                className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FolderSearch className={`w-3 h-3 ${isScanningNovels ? 'animate-spin' : ''}`} />
                <span>{isScanningNovels ? (language === 'fa' ? 'در حال اسکن رمان‌ها...' : 'Scanning novels...') : (language === 'fa' ? 'اسکن پوشه رمان‌ها' : 'Scan Novels Folder')}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Media & Images Folder */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Image className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {language === 'fa' ? 'پوشه رسانه‌ها و کاورها' : language === 'ar' ? 'مجلد الوسائط والغلاف' : 'Media & Covers'}
                  </span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {serverStats?.formattedMediaSize || '0 KB'}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 block truncate" title={serverStats?.mediaPath}>
                {serverStats?.mediaPath || '/data/store/media/'}
              </span>
              <div className="text-[10px] text-slate-600 dark:text-slate-400">
                <span>{language === 'fa' ? 'تعداد فایل‌های رسانه‌ای:' : 'Media files count:'} </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(serverStats?.mediaFilesCount ?? 0, language)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleScanAllStore}
                disabled={isScanningAll}
                className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isScanningAll ? 'animate-spin' : ''}`} />
                <span>{isScanningAll ? (language === 'fa' ? 'در حال اسکن همه‌جانبه...' : 'Scanning all...') : (language === 'fa' ? 'اسکن همه‌جانبه فروشگاه' : 'Scan All Store Folders')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Store Tools & Actions Toolbar */}
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCleanupOrphanFiles}
              disabled={isCleaningFiles}
              className="py-1.5 px-3 rounded-lg bg-transparent hover:bg-rose-500/10 text-slate-600 dark:text-slate-400 hover:text-rose-500 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-dashed border-slate-300 dark:border-slate-800 hover:border-rose-400 disabled:opacity-50"
              title={t.cleanupOrphanFilesDesc}
            >
              <Trash2 className={`w-3.5 h-3.5 ${isCleaningFiles ? 'animate-bounce text-rose-500' : ''}`} />
              <span>{isCleaningFiles ? (language === 'fa' ? 'در حال پاک‌سازی...' : 'Cleaning...') : t.cleanupOrphanFilesBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAllStoreToDisk}
              disabled={isSyncingDisk}
              className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              title={language === 'fa' ? 'ایجاد و همگام‌سازی پوشه اختصاصی برای تک‌تک رمان‌ها و فیلم‌ها در مسیر دیسک' : 'Generate and sync dedicated folders for all store items'}
            >
              <FolderPlus className={`w-3.5 h-3.5 ${isSyncingDisk ? 'animate-spin' : ''}`} />
              <span>{isSyncingDisk ? (language === 'fa' ? 'در حال همگام‌سازی دیسک...' : 'Syncing...') : (language === 'fa' ? 'ایجاد پوشه تمام رمان‌ها و فیلم‌ها روی دیسک' : 'Create Folders for All Items on Disk')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowStoreExplorer(!showStoreExplorer)}
              className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <FolderSearch className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.storeFolderExplorerTitle}</span>
              {showStoreExplorer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowTermuxGuide(!showTermuxGuide)}
              className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t.termuxTransferGuideTitle}</span>
              {showTermuxGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {syncDiskFeedback && (
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>{syncDiskFeedback}</span>
          </div>
        )}

        {/* Store Folders Explorer Drawer */}
        {showStoreExplorer && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.storeFolderExplorerTitle}</span>
              </h5>
              <span className="text-[9px] font-mono text-slate-400">
                {serverStats?.storePath || '/data/store/'}
              </span>
            </div>

            {(!serverStats?.videoFolders?.length && !serverStats?.novelsFolders?.length) ? (
              <p className="text-[10px] text-slate-500 py-2 text-center">
                {language === 'fa' ? 'هنوز پوشه یا سریالی در مسیر ذخیره‌سازی یافت نشد.' : 'No directories found in store path.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {serverStats?.videoFolders?.map((vf) => (
                  <div
                    key={vf.name}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Film className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate" title={vf.name}>
                          {vf.name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {vf.count} {language === 'fa' ? 'فایل' : 'files'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 font-bold shrink-0">
                      {vf.formattedSize}
                    </span>
                  </div>
                ))}

                {serverStats?.novelsFolders?.map((nf) => (
                  <div
                    key={nf.name}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate" title={nf.name}>
                          {nf.name}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {nf.count} {language === 'fa' ? 'فصل/فایل' : 'chapters'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 font-bold shrink-0">
                      {nf.formattedSize}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Termux Direct Transfer Guide Drawer */}
        {showTermuxGuide && (
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 space-y-2.5 text-[11px] animate-in fade-in font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>{t.termuxTransferGuideTitle}</span>
              </div>
              <span className="text-[9px] text-slate-400">Android / Termux CLI</span>
            </div>

            <p className="text-[10px] text-slate-300 font-sans leading-relaxed">
              {language === 'fa'
                ? 'شما می‌توانید ویدیوها و انیمه‌ها را مستقیماً در قالب پوشه‌های پلی‌لیست و فصل‌بندی در مسیر فروشگاه کپی کنید:'
                : t.termuxTransferGuideDesc}
            </p>

            <div className="space-y-2 pt-1 font-sans">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 block">
                  {language === 'fa' ? 'ساختار پوشه‌بندی استاندارد فیلم و سریال روی حافظه:' : 'Standard Folder Hierarchy:'}
                </span>
                <div className="bg-black/60 p-2 rounded border border-slate-800 font-mono text-[9px] text-slate-300 leading-relaxed">
                  <div>📁 <span className="text-amber-300">{serverStats?.storePath || './data/store'}/movies/</span></div>
                  <div className="pl-3">└── 📁 <span className="text-emerald-400">نام_پلی‌لیست_یا_سریال/</span></div>
                  <div className="pl-6">├── 📁 <span className="text-indigo-400">فصل_1/</span></div>
                  <div className="pl-9">├── 🎬 <span className="text-slate-400">قسمت_01.mp4</span></div>
                  <div className="pl-9">└── 🎬 <span className="text-slate-400">قسمت_02.mp4</span></div>
                  <div className="pl-6">└── 📁 <span className="text-indigo-400">فصل_2/</span></div>
                  <div className="pl-9">└── 🎬 <span className="text-slate-400">قسمت_01.mp4</span></div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 block">
                  {language === 'fa' ? 'دستور کپی کردن یک پوشه سریال با تمام فصل‌ها در حافظه:' : 'Copy entire series folder:'}
                </span>
                <div className="flex items-center justify-between gap-2 bg-black/40 p-2 rounded border border-slate-800 font-mono text-[10px] text-emerald-300">
                  <span className="truncate">cp -r /sdcard/Download/MyAnime {serverStats?.moviesPath || './data/store/movies/'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`cp -r /sdcard/Download/MyAnime ${serverStats?.moviesPath || './data/store/movies/'}`);
                      setCopiedCommand(true);
                      setTimeout(() => setCopiedCommand(false), 2000);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                    title="Copy command"
                  >
                    {copiedCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-sans">
              {language === 'fa'
                ? '💡 پس از کپی کردن پوشه روی دستگاه، دکمه «اسکن همه‌جانبه» را بزنید. سیستم خودکار فصل‌ها و قسمت‌ها را شناسایی کرده و برای تکمیل اطلاعات و قفل قیمت به شما نمایش می‌دهد.'
                : '💡 After copying, click "Scan All Store Folders" to automatically detect playlists, seasons, and episodes.'}
            </p>
          </div>
        )}

        {/* Store Feedbacks */}
        {scanAllFeedback && (
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{scanAllFeedback}</span>
          </div>
        )}

        {scanNovelsFeedback && (
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{scanNovelsFeedback}</span>
          </div>
        )}

        {scanVideosFeedback && (
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{scanVideosFeedback}</span>
          </div>
        )}

        {uploadZipFeedback && (
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadZipFeedback}</span>
          </div>
        )}

        {cleanFilesFeedback && (
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{cleanFilesFeedback}</span>
          </div>
        )}

        <input
          type="file"
          ref={zipInputRef}
          onChange={handleZipUpload}
          accept=".zip,application/zip"
          className="hidden"
        />
      </div>

      {/* Discovered Media Configuration Modal */}
      {discoveredModalOpen && (
        <DiscoveredMediaConfigModal
          isOpen={discoveredModalOpen}
          onClose={() => setDiscoveredModalOpen(false)}
          item={discoveredModalItem}
          itemType={discoveredModalType}
          language={language}
          customPlaylists={customPlaylists}
          onConfigSaved={async () => {
            if (onRefreshFromDatabase) {
              await onRefreshFromDatabase();
            }
            fetchServerStats();
          }}
        />
      )}

      {/* Section 6: System Diagnostics & Mathematical Parameters */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
        <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            {t.scientificParamsTitle}
          </span>
          <p className="leading-relaxed font-mono text-[10px] text-slate-500 dark:text-slate-400">
            {t.scientificParamsDesc}
          </p>
        </div>
      </div>
    </div>
  );
};

