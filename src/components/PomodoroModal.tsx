import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Minus,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  Coffee,
  Sun,
  Timer,
  CheckCircle2,
  Target,
  ListTodo,
  Flame,
  Award,
  History,
  TrendingUp,
  Sliders,
  Check,
  ChevronDown,
  Trash2,
  Minimize2,
  Maximize2,
  Eye,
  EyeOff,
  Music,
  Search,
} from 'lucide-react';
import { screenWakeLock } from '../utils/wakeLock';
import {
  Language,
  Habit,
  Task,
  PomodoroMode,
  PomodoroTargetType,
  PomodoroAmbientSound,
  PomodoroCustomSound,
  AdvancedSettings,
  ThemeMode,
  TelegramConfig,
} from '../types';
import { translations, formatNumber } from '../utils/translations';
import {
  playPomodoroBellSound,
  playBreakCompleteSound,
  playTickSound,
  startAmbientSound,
  stopAmbientSound,
  triggerCelebrationConfetti,
  triggerHapticFeedback,
} from '../utils/feedbackEffects';
import { getAllCustomPomodoroSounds } from '../utils/pomodoroSoundManager';
import {
  getPomodoroSessions,
  addPomodoroSession,
  clearPomodoroSessions,
  deletePomodoroSession,
  calculatePomodoroStats,
  formatPomodoroDuration,
} from '../utils/pomodoroStorage';
import { getTodayString } from '../utils/persianDate';

export interface PomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  theme?: ThemeMode;
  habits: Habit[];
  tasks: Task[];

  // Timer State & Handlers
  mode?: PomodoroMode | string;
  setMode?: (m: PomodoroMode) => void;
  onModeChange?: (m: 'focus' | 'shortBreak' | 'longBreak' | 'short_break' | 'long_break' | 'stopwatch') => void;

  timeLeft?: number;
  setTimeLeft?: React.Dispatch<React.SetStateAction<number>>;
  totalDuration?: number;
  setTotalDuration?: React.Dispatch<React.SetStateAction<number>>;

  isRunning?: boolean;
  setIsRunning?: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleRunning?: () => void;
  onReset?: () => void;

  // Target
  activeTargetType?: PomodoroTargetType;
  initialTargetType?: PomodoroTargetType;
  setActiveTargetType?: (type: PomodoroTargetType) => void;

  activeTargetId?: string | null;
  initialTargetId?: string | null;
  setActiveTargetId?: (id: string | undefined | null) => void;
  onTargetChange?: (type: PomodoroTargetType, id: string | null) => void;

  // Ambient Sound
  ambientSound?: PomodoroAmbientSound | string;
  setAmbientSound?: (s: PomodoroAmbientSound) => void;
  onAmbientSoundChange?: (s: any) => void;
  soundVolume?: number;
  onVolumeChange?: (volume: number) => void;

  // Completed Sessions count
  completedSessions?: number;
  completedSessionsCount?: number;
  setCompletedSessionsCount?: React.Dispatch<React.SetStateAction<number>>;

  // Settings & Callbacks
  pomodoroConfig?: any;
  advancedSettings?: AdvancedSettings;
  telegramConfig?: TelegramConfig;
  onUpdateSettings?: (settings: Partial<AdvancedSettings>) => void;
  onOpenSettings?: () => void;

  // Action Callbacks
  onUpdateHabitFocus?: (habitId: string, minutes: number, markDoneToday?: boolean) => void;
  onUpdateTaskFocus?: (taskId: string, minutes: number, markCompleted?: boolean) => void;
  onCompleteHabit?: (habitId: string) => void;
  onCompleteTask?: (taskId: string) => void;
  onAddGeneralFocus?: (minutes: number) => void;
  onRewardCoins?: (coins: number, reason: string) => void;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({
  isOpen,
  onClose,
  language,
  theme,
  habits = [],
  tasks = [],
  mode = 'focus',
  setMode,
  onModeChange,
  timeLeft = 25 * 60,
  setTimeLeft,
  totalDuration = 25 * 60,
  setTotalDuration,
  isRunning = false,
  setIsRunning,
  onToggleRunning,
  onReset,
  activeTargetType,
  initialTargetType = 'none',
  setActiveTargetType,
  activeTargetId,
  initialTargetId = null,
  setActiveTargetId,
  onTargetChange,
  ambientSound = 'none',
  setAmbientSound,
  onAmbientSoundChange,
  soundVolume = 0.35,
  onVolumeChange,
  completedSessions,
  completedSessionsCount,
  setCompletedSessionsCount,
  pomodoroConfig,
  advancedSettings,
  telegramConfig,
  onUpdateSettings,
  onOpenSettings,
  onUpdateHabitFocus,
  onUpdateTaskFocus,
  onCompleteHabit,
  onCompleteTask,
  onAddGeneralFocus,
  onRewardCoins,
}) => {
  const t = translations[language] || translations.fa;
  const isRtl = t.dir === 'rtl';

  // Normalize mode
  const normalizedMode: PomodoroMode =
    mode === 'shortBreak'
      ? 'short_break'
      : mode === 'longBreak'
      ? 'long_break'
      : mode === 'short_break' || mode === 'long_break' || mode === 'stopwatch'
      ? (mode as PomodoroMode)
      : 'focus';

  // Internal target state fallback if uncontrolled
  const [internalTargetType, setInternalTargetType] = useState<PomodoroTargetType>(
    activeTargetType || initialTargetType || 'none'
  );
  const [internalTargetId, setInternalTargetId] = useState<string | null>(
    activeTargetId ?? initialTargetId ?? null
  );

  // Sync internal state when external props change
  useEffect(() => {
    if (activeTargetType !== undefined) {
      setInternalTargetType(activeTargetType);
    } else if (initialTargetType !== undefined) {
      setInternalTargetType(initialTargetType);
    }
  }, [activeTargetType, initialTargetType]);

  useEffect(() => {
    if (activeTargetId !== undefined) {
      setInternalTargetId(activeTargetId);
    } else if (initialTargetId !== undefined) {
      setInternalTargetId(initialTargetId);
    }
  }, [activeTargetId, initialTargetId]);

  const effectiveTargetType: PomodoroTargetType =
    activeTargetType !== undefined ? activeTargetType : internalTargetType;
  const effectiveTargetId: string | null =
    activeTargetId !== undefined ? activeTargetId : internalTargetId;

  const effectiveCompletedSessions =
    completedSessions !== undefined
      ? completedSessions
      : completedSessionsCount !== undefined
      ? completedSessionsCount
      : 0;

  const [activeTab, setActiveTab] = useState<'timer' | 'history'>('timer');
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string>('');
  const [targetDropdownOpen, setTargetDropdownOpen] = useState<boolean>(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState<string>('');
  const [targetFilterTab, setTargetFilterTab] = useState<'all' | 'habit' | 'task'>('all');
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
  const [customSounds, setCustomSounds] = useState<PomodoroCustomSound[]>([]);
  const sessionStartTimestampRef = useRef<number | null>(null);

  // Fullscreen & Minimal Zen Immersion Mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pomodoro_fullscreen_enabled');
      return saved !== null ? saved === 'true' : true; // Default to true as user requested
    }
    return true;
  });

  const [isZenMode, setIsZenMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pomodoro_zen_mode_enabled');
      return saved !== null ? saved === 'true' : true; // Default to true so extra icons disappear
    }
    return true;
  });

  // Screen Wake Lock State (keeps display awake during focus)
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(() => screenWakeLock.isActive());
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pomodoro_wake_lock_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [wakeLockToast, setWakeLockToast] = useState<string | null>(null);

  // When opening modal, auto-enter fullscreen and zen mode (user request)
  useEffect(() => {
    if (isOpen) {
      setIsFullscreen(true);
      setIsZenMode(true);
      if (wakeLockEnabled) {
        screenWakeLock.request().catch(() => {});
      }
      try {
        if (!document.fullscreenElement && typeof document.documentElement.requestFullscreen === 'function') {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    }
  }, [isOpen, wakeLockEnabled]);

  // Sync wake lock subscription
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = screenWakeLock.subscribe((active) => {
      if (isMounted) setWakeLockActive(active);
    });

    if (isOpen && wakeLockEnabled) {
      screenWakeLock.request().catch(() => {});
    }

    return () => {
      isMounted = false;
      unsubscribe();
      if (!isRunning) {
        screenWakeLock.release().catch(() => {});
      }
    };
  }, [isOpen, wakeLockEnabled, isRunning]);

  // Keep screen awake while timer is running
  useEffect(() => {
    if (isRunning && wakeLockEnabled) {
      screenWakeLock.request().catch(() => {});
    }
  }, [isRunning, wakeLockEnabled]);

  // Sync with browser native fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Native fullscreen was exited, keep immersion layout state consistent
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  const handleToggleFullscreen = async () => {
    const nextVal = !isFullscreen;
    setIsFullscreen(nextVal);
    localStorage.setItem('pomodoro_fullscreen_enabled', String(nextVal));

    try {
      if (nextVal && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else if (!nextVal && document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    } catch {
      // Ignored if browser / iframe blocks native fullscreen API
    }
  };

  const handleToggleZenMode = () => {
    const nextVal = !isZenMode;
    setIsZenMode(nextVal);
    localStorage.setItem('pomodoro_zen_mode_enabled', String(nextVal));
  };

  const handleToggleWakeLock = async () => {
    try {
      if (wakeLockActive) {
        await screenWakeLock.release();
        setWakeLockActive(false);
        setWakeLockEnabled(false);
        localStorage.setItem('pomodoro_wake_lock_enabled', 'false');
        setWakeLockToast(t.pomodoroScreenKeepOnDisabled || 'روشن ماندن صفحه غیرفعال شد');
      } else {
        setWakeLockActive(true);
        setWakeLockEnabled(true);
        localStorage.setItem('pomodoro_wake_lock_enabled', 'true');
        await screenWakeLock.request();
        setWakeLockToast(t.pomodoroScreenKeepOnActive || 'روشن ماندن صفحه فعال شد (از به خواب رفتن نمایشگر جلوگیری می‌شود)');
      }
    } catch {
      setWakeLockActive(true);
      setWakeLockToast(t.pomodoroScreenKeepOnActive || 'روشن ماندن صفحه فعال شد');
    }
    setTimeout(() => {
      setWakeLockToast(null);
    }, 3000);
  };

  // Track session start time when timer starts
  useEffect(() => {
    if (isRunning && !sessionStartTimestampRef.current) {
      sessionStartTimestampRef.current = Date.now();
    } else if (!isRunning && timeLeft === (totalDuration || 25 * 60)) {
      sessionStartTimestampRef.current = null;
    }
  }, [isRunning, timeLeft, totalDuration]);

  // Load custom sounds from IndexedDB/Storage
  useEffect(() => {
    let isMounted = true;
    const loadSounds = async () => {
      try {
        const sounds = await getAllCustomPomodoroSounds();
        if (isMounted) {
          setCustomSounds(sounds);
        }
      } catch (err) {
        console.warn('Failed to load custom pomodoro sounds:', err);
      }
    };

    if (isOpen) {
      loadSounds();
    }

    const handleSoundsChanged = () => {
      loadSounds();
    };

    window.addEventListener('pomodoroCustomSoundsChanged', handleSoundsChanged);
    return () => {
      isMounted = false;
      window.removeEventListener('pomodoroCustomSoundsChanged', handleSoundsChanged);
    };
  }, [isOpen]);

  // Completion Dialog State
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [lastFinishedSession, setLastFinishedSession] = useState<{
    minutes: number;
    mode: PomodoroMode;
    coins: number;
    xp: number;
    targetName: string;
    targetType: PomodoroTargetType;
    targetId?: string | null;
  } | null>(null);

  // Load history sessions
  const sessions = useMemo(() => {
    return getPomodoroSessions();
  }, [historyRefreshKey, isOpen]);

  const stats = useMemo(() => {
    return calculatePomodoroStats(sessions, getTodayString(), habits, tasks);
  }, [sessions, habits, tasks]);

  // Current attached target
  const currentHabit = useMemo(() => {
    if (effectiveTargetType === 'habit' && effectiveTargetId) {
      return habits.find((h) => h.id === effectiveTargetId);
    }
    return null;
  }, [habits, effectiveTargetType, effectiveTargetId]);

  const currentTask = useMemo(() => {
    if (effectiveTargetType === 'task' && effectiveTargetId) {
      return tasks.find((t) => t.id === effectiveTargetId);
    }
    return null;
  }, [tasks, effectiveTargetType, effectiveTargetId]);

  const activeTargetName = currentHabit
    ? currentHabit.name
    : currentTask
    ? currentTask.title
    : t.pomodoroNoTarget || 'تمرکز آزاد';

  const activeTargetColor = currentHabit?.color || (currentTask ? currentTask.color || '#10b981' : '#6366f1');

  // Handle target change safely
  const handleSelectTarget = (type: PomodoroTargetType, id: string | null = null) => {
    setInternalTargetType(type);
    setInternalTargetId(id);

    if (typeof onTargetChange === 'function') {
      onTargetChange(type, id);
    }
    if (typeof setActiveTargetType === 'function') {
      setActiveTargetType(type);
    }
    if (typeof setActiveTargetId === 'function') {
      setActiveTargetId(id || undefined);
    }
    setTargetDropdownOpen(false);
  };

  // Switch Mode safely
  const handleSwitchMode = (newMode: PomodoroMode, customDurationSeconds?: number) => {
    if (typeof onModeChange === 'function') {
      const modeArg =
        newMode === 'short_break' ? 'shortBreak' : newMode === 'long_break' ? 'longBreak' : newMode;
      onModeChange(modeArg as any);
    }
    if (typeof setMode === 'function') {
      setMode(newMode);
    }

    const defaultDurationMins =
      newMode === 'short_break'
        ? advancedSettings?.pomodoroShortBreakDuration || pomodoroConfig?.shortBreakMinutes || 5
        : newMode === 'long_break'
        ? advancedSettings?.pomodoroLongBreakDuration || pomodoroConfig?.longBreakMinutes || 15
        : newMode === 'stopwatch'
        ? 0
        : advancedSettings?.pomodoroFocusDuration || pomodoroConfig?.focusMinutes || 25;

    const newDurSeconds =
      typeof customDurationSeconds === 'number' && customDurationSeconds >= 0
        ? customDurationSeconds
        : defaultDurationMins * 60;

    if (typeof setTotalDuration === 'function') {
      setTotalDuration(newDurSeconds);
    }
    if (typeof setTimeLeft === 'function') {
      setTimeLeft(newDurSeconds);
    }
  };

  const handleTogglePlay = () => {
    if (typeof onToggleRunning === 'function') {
      onToggleRunning();
    } else if (typeof setIsRunning === 'function') {
      setIsRunning(!isRunning);
    }
    triggerHapticFeedback(25);
  };

  const handleResetClick = () => {
    if (typeof onReset === 'function') {
      onReset();
    } else {
      const defaultDurationMins =
        normalizedMode === 'short_break'
          ? advancedSettings?.pomodoroShortBreakDuration || pomodoroConfig?.shortBreakMinutes || 5
          : normalizedMode === 'long_break'
          ? advancedSettings?.pomodoroLongBreakDuration || pomodoroConfig?.longBreakMinutes || 15
          : normalizedMode === 'stopwatch'
          ? 0
          : advancedSettings?.pomodoroFocusDuration || pomodoroConfig?.focusMinutes || 25;
      const newDurSeconds = defaultDurationMins * 60;
      if (typeof setTimeLeft === 'function') setTimeLeft(newDurSeconds);
      if (typeof setTotalDuration === 'function') setTotalDuration(newDurSeconds);
      if (typeof setIsRunning === 'function') setIsRunning(false);
    }
  };

  const handleAdjustTime = (deltaMinutes: number) => {
    if (normalizedMode === 'stopwatch') return;
    const deltaSeconds = deltaMinutes * 60;
    if (typeof setTimeLeft === 'function') {
      setTimeLeft((prev) => Math.max(60, prev + deltaSeconds));
    }
    if (typeof setTotalDuration === 'function') {
      setTotalDuration((prev) => Math.max(60, prev + deltaSeconds));
    }
  };

  const handleSetPreset = (minutes: number) => {
    if (normalizedMode === 'stopwatch') return;
    const sec = minutes * 60;
    if (typeof setTotalDuration === 'function') {
      setTotalDuration(sec);
    }
    if (typeof setTimeLeft === 'function') {
      setTimeLeft(sec);
    }
  };

  // Finish & Save Stopwatch Focus session (awards configured coins & XP per minute, strictly rounded to whole integer)
  const handleStopwatchFinish = () => {
    if (typeof setIsRunning === 'function') {
      setIsRunning(false);
    }
    stopAmbientSound();

    const elapsedSeconds = timeLeft;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const recordedMinutes = elapsedSeconds >= 30 ? Math.max(1, elapsedMinutes) : elapsedMinutes;

    // If session was under 10 seconds, reset cleanly without history or reward
    if (elapsedSeconds < 10) {
      if (typeof setTimeLeft === 'function') setTimeLeft(0);
      if (typeof setTotalDuration === 'function') setTotalDuration(0);
      sessionStartTimestampRef.current = null;
      triggerHapticFeedback(20);
      return;
    }

    // Configured rewards per minute from advanced settings
    const coinsPerMin = Number(
      advancedSettings?.stopwatchRewardCoinsPerMinute ??
      advancedSettings?.pomodoroConfig?.stopwatchCoinsPerMinute ??
      1
    );
    const xpPerMin = Number(
      advancedSettings?.stopwatchRewardXpPerMinute ??
      advancedSettings?.pomodoroConfig?.stopwatchXpPerMinute ??
      2
    );

    // Strict integer approximation without fractions (عدد صحیح بدون کسر)
    const exactMinutesFraction = elapsedSeconds / 60;
    const calculatedCoins = Math.round(exactMinutesFraction * coinsPerMin);
    const calculatedXp = Math.round(exactMinutesFraction * xpPerMin);

    const coins = Math.max(0, calculatedCoins);
    const xp = Math.max(0, calculatedXp);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startTs = sessionStartTimestampRef.current || (now.getTime() - elapsedSeconds * 1000);
    const startDate = new Date(startTs);
    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    addPomodoroSession({
      targetType: effectiveTargetType,
      targetId: effectiveTargetId || undefined,
      targetName: activeTargetName,
      targetTitle: activeTargetName,
      durationMinutes: recordedMinutes,
      durationSeconds: elapsedSeconds,
      plannedMinutes: recordedMinutes,
      isCompletedFull: true,
      completedAt: getTodayString(),
      time: timeStr,
      startTime: startTimeStr,
      endTime: timeStr,
      startTimestamp: startTs,
      targetColor: activeTargetColor,
      targetCategory: effectiveTargetType,
      mode: 'stopwatch',
      rewardCoinsEarned: coins,
      rewardXpEarned: xp,
      notes: language === 'fa' ? 'جلسه با دکمه اتمام کرنومتر آزاد ثبت و تکمیل شد' : 'Recorded via stopwatch finish',
    });

    sessionStartTimestampRef.current = null;

    // Update habit or task or general focus statistics
    if (effectiveTargetType === 'habit' && effectiveTargetId && onUpdateHabitFocus) {
      onUpdateHabitFocus(effectiveTargetId, recordedMinutes, false);
    } else if (effectiveTargetType === 'task' && effectiveTargetId && onUpdateTaskFocus) {
      onUpdateTaskFocus(effectiveTargetId, recordedMinutes, false);
    } else if (onAddGeneralFocus) {
      onAddGeneralFocus(recordedMinutes);
    }

    if (onRewardCoins && coins > 0) {
      onRewardCoins(coins, `${language === 'fa' ? 'کرنومتر آزاد' : 'Stopwatch Focus'} (${recordedMinutes} ${t.pomodoroMinutesLabel || 'دقیقه'})`);
    }

    if (coins > 0 || xp > 0) {
      playPomodoroBellSound();
      triggerHapticFeedback([50, 100, 50, 100]);
      triggerCelebrationConfetti();
    } else {
      triggerHapticFeedback(30);
    }

    // Telegram notification if configured
    if (
      telegramConfig &&
      telegramConfig.notifyOnPomodoroCompletion !== false &&
      telegramConfig.botToken &&
      telegramConfig.chatId
    ) {
      fetch('/api/telegram/notify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          eventType: 'pomodoro_completed',
          title: activeTargetName || (language === 'fa' ? 'کرنومتر آزاد' : 'Stopwatch Focus'),
          durationMinutes: recordedMinutes,
          earnedCoins: coins,
          language,
        }),
      }).catch(() => {});
    }

    if (typeof setCompletedSessionsCount === 'function') {
      setCompletedSessionsCount((prev) => prev + 1);
    }
    setHistoryRefreshKey((prev) => prev + 1);

    setLastFinishedSession({
      minutes: recordedMinutes,
      seconds: elapsedSeconds,
      mode: 'stopwatch',
      coins,
      xp,
      targetName: activeTargetName,
      targetType: effectiveTargetType,
      targetId: effectiveTargetId,
      isCompletedFull: true,
    });

    setShowCompletionModal(true);

    if (typeof setTimeLeft === 'function') setTimeLeft(0);
    if (typeof setTotalDuration === 'function') setTotalDuration(0);
  };

  // Skip Countdown Session (Focus or Break): Save to history but strictly 0 reward coins and 0 XP
  const handleSkipCountdownSession = () => {
    if (typeof setIsRunning === 'function') {
      setIsRunning(false);
    }

    const safeTotal = totalDuration || 25 * 60;
    const elapsedSeconds = Math.max(0, safeTotal - timeLeft);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const recordedMinutes = elapsedSeconds >= 30 ? Math.max(1, elapsedMinutes) : elapsedMinutes;

    // When skipping: Strictly NO REWARDS (zero coins, zero xp) as requested by user
    const coins = 0;
    const xp = 0;

    if (normalizedMode === 'focus') {
      // Save session history if at least 10 seconds were spent
      if (elapsedSeconds >= 10 || recordedMinutes > 0) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const startTs = sessionStartTimestampRef.current || (now.getTime() - elapsedSeconds * 1000);
        const startDate = new Date(startTs);
        const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

        addPomodoroSession({
          targetType: effectiveTargetType,
          targetId: effectiveTargetId || undefined,
          targetName: activeTargetName,
          targetTitle: activeTargetName,
          durationMinutes: recordedMinutes,
          durationSeconds: elapsedSeconds,
          plannedMinutes: Math.round(safeTotal / 60),
          isCompletedFull: false, // Skipped
          completedAt: getTodayString(),
          time: timeStr,
          startTime: startTimeStr,
          endTime: timeStr,
          startTimestamp: startTs,
          targetColor: activeTargetColor,
          targetCategory: effectiveTargetType,
          mode: 'focus',
          rewardCoinsEarned: 0, // No coins on skip
          rewardXpEarned: 0, // No XP on skip
          notes: language === 'fa' ? 'جلسه رد (اسکیپ) شد - بدون پاداش' : 'Session skipped - no reward',
        });

        if (effectiveTargetType === 'habit' && effectiveTargetId && onUpdateHabitFocus && recordedMinutes > 0) {
          onUpdateHabitFocus(effectiveTargetId, recordedMinutes, false);
        } else if (effectiveTargetType === 'task' && effectiveTargetId && onUpdateTaskFocus && recordedMinutes > 0) {
          onUpdateTaskFocus(effectiveTargetId, recordedMinutes, false);
        } else if (onAddGeneralFocus && recordedMinutes > 0) {
          onAddGeneralFocus(recordedMinutes);
        }
      }

      sessionStartTimestampRef.current = null;
      triggerHapticFeedback(25);
      setHistoryRefreshKey((prev) => prev + 1);

      // Auto-transition to break mode after skipping focus session
      const breakInterval = advancedSettings?.pomodoroConfig?.longBreakInterval ?? 4;
      const nextSessionCount = effectiveCompletedSessions + 1;
      const isLongBreak = nextSessionCount % breakInterval === 0;
      const nextBreakMode: PomodoroMode = isLongBreak ? 'long_break' : 'short_break';
      const breakMins = isLongBreak
        ? (advancedSettings?.pomodoroConfig?.longBreakMinutes ?? 15)
        : (advancedSettings?.pomodoroConfig?.shortBreakMinutes ?? 5);

      handleSwitchMode(nextBreakMode, breakMins * 60);
      if (typeof setIsRunning === 'function') {
        setIsRunning(true);
      }
    } else {
      // It was a break session, switch back to focus
      playBreakCompleteSound();
      const freshDuration = (advancedSettings?.pomodoroFocusDuration || pomodoroConfig?.focusMinutes || 25) * 60;
      handleSwitchMode('focus', freshDuration);
      if (typeof setIsRunning === 'function') {
        setIsRunning(advancedSettings?.pomodoroConfig?.autoStartPomodoros ?? false);
      }
    }
  };

  // Manual log with integer rounding
  const handleManualLog = (mins: number) => {
    if (mins <= 0) return;
    const isCompleted25Min = mins >= 25;
    const configuredCoins = Math.round(advancedSettings?.pomodoroRewardCoins ?? pomodoroConfig?.rewardCoins ?? 5);
    const configuredXp = Math.round(advancedSettings?.pomodoroRewardXp ?? pomodoroConfig?.rewardXp ?? 20);

    const intervals = isCompleted25Min ? Math.floor(mins / 25) : 0;
    const coins = Math.round(intervals * configuredCoins);
    const xp = Math.round(intervals * configuredXp);

    const now = new Date();
    const endStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const startD = new Date(now.getTime() - mins * 60 * 1000);
    const startStr = `${String(startD.getHours()).padStart(2, '0')}:${String(startD.getMinutes()).padStart(2, '0')}`;

    addPomodoroSession({
      targetType: effectiveTargetType,
      targetId: effectiveTargetId || undefined,
      targetName: activeTargetName,
      targetTitle: activeTargetName,
      durationMinutes: mins,
      durationSeconds: mins * 60,
      plannedMinutes: mins,
      isCompletedFull: isCompleted25Min,
      completedAt: getTodayString(),
      time: endStr,
      startTime: startStr,
      endTime: endStr,
      startTimestamp: startD.getTime(),
      targetColor: activeTargetColor,
      targetCategory: effectiveTargetType,
      mode: 'focus',
      rewardCoinsEarned: coins,
      rewardXpEarned: xp,
    });

    if (effectiveTargetType === 'habit' && effectiveTargetId && onUpdateHabitFocus) {
      onUpdateHabitFocus(effectiveTargetId, mins, false);
    } else if (effectiveTargetType === 'task' && effectiveTargetId && onUpdateTaskFocus) {
      onUpdateTaskFocus(effectiveTargetId, mins, false);
    } else if (onAddGeneralFocus) {
      onAddGeneralFocus(mins);
    }

    if (onRewardCoins && coins > 0) {
      onRewardCoins(coins, `${t.pomodoroManualLogTitle} (${mins} ${t.pomodoroMinutesLabel})`);
    }

    setHistoryRefreshKey((prev) => prev + 1);
    setManualSuccessMsg(
      coins > 0
        ? `+${formatNumber(mins, language)} ${t.pomodoroMinutesLabel || 'دقیقه'} (+${formatNumber(coins, language)} 🪙)`
        : `+${formatNumber(mins, language)} ${t.pomodoroMinutesLabel || 'دقیقه'} ${t.pomodoroLoggedSuccess || 'ثبت شد'}`
    );
    setTimeout(() => setManualSuccessMsg(''), 3500);
  };

  // Change sound safely
  const handleSelectSound = (sndId: PomodoroAmbientSound) => {
    if (typeof onAmbientSoundChange === 'function') {
      onAmbientSoundChange(sndId);
    }
    if (typeof setAmbientSound === 'function') {
      setAmbientSound(sndId);
    }
    if (typeof onUpdateSettings === 'function') {
      onUpdateSettings({ pomodoroAmbientSound: sndId });
    }
    if (sndId === 'none') {
      stopAmbientSound();
    }
  };

  // Progress Calculation
  const safeTotalDuration =
    totalDuration && totalDuration > 0
      ? totalDuration
      : normalizedMode === 'short_break'
      ? (advancedSettings?.pomodoroShortBreakDuration || pomodoroConfig?.shortBreakMinutes || 5) * 60
      : normalizedMode === 'long_break'
      ? (advancedSettings?.pomodoroLongBreakDuration || pomodoroConfig?.longBreakMinutes || 15) * 60
      : (advancedSettings?.pomodoroFocusDuration || pomodoroConfig?.focusMinutes || 25) * 60;

  // For countdowns: progressPercent represents remaining time proportion (100% -> 0%)
  // For stopwatch: progressPercent represents cumulative focus time filled continuously across a standard 60-minute block (0% -> 100%)
  const progressPercent =
    normalizedMode === 'stopwatch'
      ? Math.min(100, Math.max(0, (timeLeft / 3600) * 100))
      : safeTotalDuration > 0
      ? Math.min(100, Math.max(0, (timeLeft / safeTotalDuration) * 100))
      : 100;

  const hoursDisplay = Math.floor(timeLeft / 3600);
  const minutesDisplay = Math.floor((timeLeft % 3600) / 60);
  const secondsDisplay = timeLeft % 60;

  const timeFormatted =
    hoursDisplay > 0
      ? `${formatNumber(String(hoursDisplay).padStart(2, '0'), language)}:${formatNumber(
          String(minutesDisplay).padStart(2, '0'),
          language
        )}:${formatNumber(String(secondsDisplay).padStart(2, '0'), language)}`
      : `${formatNumber(String(minutesDisplay).padStart(2, '0'), language)}:${formatNumber(
          String(secondsDisplay).padStart(2, '0'),
          language
        )}`;

  const modeStyles: Record<PomodoroMode, { badge: string; circle: string; text: string; bg: string }> = {
    focus: {
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      circle: 'text-indigo-600 dark:text-indigo-400',
      text: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
    short_break: {
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      circle: 'text-teal-500 dark:text-teal-400',
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-600 hover:bg-teal-700 text-white',
    },
    long_break: {
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      circle: 'text-purple-500 dark:text-purple-400',
      text: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    stopwatch: {
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
      circle: 'text-cyan-500 dark:text-cyan-400',
      text: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    },
  };

  const currentStyle = modeStyles[normalizedMode] || modeStyles.focus;

  if (!isOpen) return null;

  return (
    <div
      id="pomodoro-modal-backdrop"
      className={`fixed inset-0 z-50 flex ${
        isFullscreen
          ? 'p-0 bg-slate-950 text-slate-100 w-screen h-screen overflow-hidden'
          : 'items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm'
      } animate-fade-in select-none`}
      onClick={(e) => {
        if (!isFullscreen && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="pomodoro-modal-content"
        dir={t.dir}
        className={`relative flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full max-w-none max-h-none rounded-none border-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-y-auto'
            : isZenMode
            ? 'w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-[92vh]'
            : 'w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-[92vh]'
        }`}
      >
        {/* Floating Wake Lock Notification Banner */}
        {wakeLockToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-800/95 text-amber-300 text-xs font-bold shadow-2xl border border-amber-500/40 flex items-center gap-2 animate-fade-in pointer-events-none backdrop-blur-md">
            <Sun className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>{wakeLockToast}</span>
          </div>
        )}
        {/* Minimal Immersion Zen Header (Extra icons hidden) */}
        {isZenMode ? (
          <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md shrink-0">
            {/* Left: Mode badge & Target name */}
            <div className="flex items-center gap-2.5 truncate">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${currentStyle.badge}`}
              >
                {normalizedMode === 'focus' ? (
                  <Flame className="w-3.5 h-3.5" />
                ) : normalizedMode === 'short_break' ? (
                  <Coffee className="w-3.5 h-3.5" />
                ) : normalizedMode === 'long_break' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Timer className="w-3.5 h-3.5" />
                )}
                <span>
                  {normalizedMode === 'focus'
                    ? t.pomodoroFocusMode || 'تمرکز'
                    : normalizedMode === 'short_break'
                    ? t.pomodoroShortBreak || 'استراحت کوتاه'
                    : normalizedMode === 'long_break'
                    ? t.pomodoroLongBreak || 'استراحت طولانی'
                    : t.pomodoroStopwatch || 'کرنومتر'}
                </span>
              </span>

              {/* Target Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 truncate max-w-xs">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeTargetColor }}
                />
                <span className="truncate font-semibold">{activeTargetName}</span>
              </div>
            </div>

            {/* Right: Screen Wake Lock, Sound Toggle, Details Toggle, Fullscreen Toggle, Close */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Screen Wake Lock Button (Prevents Screen Sleep) */}
              <button
                type="button"
                id="pomodoro-wakelock-btn"
                onClick={handleToggleWakeLock}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  wakeLockActive
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
                title={
                  wakeLockActive
                    ? (t.pomodoroScreenKeepOnActive || 'روشن ماندن صفحه فعال است (نمایشگر خاموش نمی‌شود)')
                    : (t.pomodoroScreenKeepOnDisabled || 'روشن ماندن صفحه غیرفعال است (برای فعال‌سازی کلیک کنید)')
                }
              >
                <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">
                  {wakeLockActive
                    ? (t.pomodoroScreenKeepOn || 'صفحه همیشه روشن')
                    : (t.pomodoroScreenKeepOn || 'روشن ماندن صفحه')}
                </span>
                {wakeLockActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              </button>

              {/* Ambient Mute quick icon if sound active */}
              {ambientSound !== 'none' && (
                <button
                  type="button"
                  onClick={() => handleSelectSound('none')}
                  className="p-2 rounded-xl bg-slate-800/80 text-indigo-400 border border-slate-700/60 hover:bg-slate-700/80 transition-colors cursor-pointer"
                  title={language === 'fa' ? 'قطع صدای پس‌زمینه' : 'Mute sound'}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}

              {/* Toggle Details View (to adjust target, sound, custom times) */}
              <button
                type="button"
                id="pomodoro-toggle-details-btn"
                onClick={handleToggleZenMode}
                className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
                title={t.pomodoroDetailedMode || 'نمایش جزئیات، اهداف و تاریخچه'}
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">{t.pomodoroDetailedMode || 'تنظیمات و تاریخچه'}</span>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                type="button"
                id="pomodoro-fullscreen-btn"
                onClick={handleToggleFullscreen}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={isFullscreen ? (t.pomodoroExitFullscreen || 'خروج از تمام‌صفحه') : (t.pomodoroFullscreenMode || 'حالت تمام‌صفحه')}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close / Minimize Button */}
              <button
                type="button"
                id="pomodoro-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title={t.close || 'بستن'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Detailed Mode Header */
          <div className="shrink-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {t.pomodoroModalTitle || 'پایگاه تمرکز پومودورو'}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-normal border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {formatNumber(effectiveCompletedSessions, language)} {t.pomodoroSessionsCount || 'جلسه'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                    {t.pomodoroModalSubtitle || 'تکنیک تمرکز عمیق، مدیریت زمان و بهره‌وری بالا'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Back to Zen Focus Button */}
                <button
                  type="button"
                  onClick={handleToggleZenMode}
                  className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t.pomodoroZenFocus || 'حالت تمرکز مینیمال'}</span>
                </button>

                {/* Wake lock toggle in detailed mode */}
                <button
                  type="button"
                  onClick={handleToggleWakeLock}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    wakeLockActive
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                  title={wakeLockActive ? t.pomodoroScreenKeepOnActive : t.pomodoroScreenKeepOnDisabled}
                >
                  <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-amber-500 animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">{t.pomodoroScreenKeepOn || 'روشن ماندن صفحه'}</span>
                </button>

                {/* Fullscreen / Window Toggle */}
                <button
                  id="pomodoro-fullscreen-btn"
                  onClick={handleToggleFullscreen}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isFullscreen ? (t.pomodoroExitFullscreen || 'خروج از تمام‌صفحه (پنجره‌ای)') : (t.pomodoroFullscreenMode || 'حالت تمام‌صفحه')}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  id="pomodoro-close-btn"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title={t.close || 'بستن پنجره و ادامه در پس‌زمینه'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Tabs in detailed mode */}
            <div className="flex items-center px-6 pt-3 border-b border-slate-100 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900">
              <button
                id="pomodoro-tab-timer-btn"
                onClick={() => setActiveTab('timer')}
                className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'timer'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Timer className="w-4 h-4" />
                <span>{t.pomodoroFocusMode || 'تایمر تمرکز'}</span>
              </button>
              <button
                id="pomodoro-tab-history-btn"
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>{t.pomodoroHistoryTitle || 'تاریخچه و گزارش‌ها'}</span>
                {stats.todaySessionsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold">
                    {formatNumber(stats.todaySessionsCount, language)}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div
          className={`flex-1 overflow-y-auto ${
            isZenMode
              ? 'flex flex-col items-center justify-center p-6 sm:p-10 min-h-[500px]'
              : 'p-6 space-y-6'
          }`}
        >
          {activeTab === 'timer' ? (
            isZenMode ? (
              /* Minimal Immersion Zen Mode (Extra icons hidden, distraction-free) */
              <div className="w-full max-w-xl flex flex-col items-center justify-center text-center my-auto space-y-6 sm:space-y-8 animate-fade-in">
                {/* Ambient Aura Background Glow */}
                <div className="relative flex flex-col items-center justify-center">
                  <div
                    className="absolute -inset-10 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
                    style={{
                      backgroundColor:
                        normalizedMode === 'focus'
                          ? '#6366f1'
                          : normalizedMode === 'short_break'
                          ? '#14b8a6'
                          : normalizedMode === 'long_break'
                          ? '#a855f7'
                          : '#06b6d4',
                    }}
                  />

                  {/* Main Timer Ring - Enlarged for Fullscreen Immersion */}
                  <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 flex items-center justify-center select-none">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
                      <defs>
                        <linearGradient id="zenFocusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="zenShortBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                        <linearGradient id="zenLongBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                        <linearGradient id="zenStopwatchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>

                        <filter id="zenTimerGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow
                            dx="0"
                            dy="0"
                            stdDeviation="5"
                            floodColor={
                              normalizedMode === 'focus'
                                ? '#6366f1'
                                : normalizedMode === 'short_break'
                                ? '#14b8a6'
                                : normalizedMode === 'long_break'
                                ? '#a855f7'
                                : '#06b6d4'
                            }
                            floodOpacity="0.45"
                          />
                        </filter>
                      </defs>

                      {/* Outer Decorative Track */}
                      <circle
                        cx="120"
                        cy="120"
                        r="108"
                        className="stroke-slate-800/60"
                        strokeWidth="1.5"
                        strokeDasharray="2 4"
                        fill="none"
                      />

                      {/* 60 Chronograph Tick Marks */}
                      {Array.from({ length: 60 }).map((_, i) => {
                        const angle = (i * 6 * Math.PI) / 180;
                        const isMajor = i % 5 === 0;
                        const r1 = isMajor ? 98 : 101;
                        const r2 = 105;
                        const x1 = 120 + r1 * Math.cos(angle);
                        const y1 = 120 + r1 * Math.sin(angle);
                        const x2 = 120 + r2 * Math.cos(angle);
                        const y2 = 120 + r2 * Math.sin(angle);
                        return (
                          <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            className={
                              isMajor
                                ? 'stroke-slate-500/80'
                                : 'stroke-slate-800'
                            }
                            strokeWidth={isMajor ? 2 : 1}
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Background Progress Circle */}
                      <circle
                        cx="120"
                        cy="120"
                        r="90"
                        className="stroke-slate-800/80"
                        strokeWidth="10"
                        fill="none"
                      />

                      {/* Active Animated Progress Arc */}
                      <circle
                        cx="120"
                        cy="120"
                        r="90"
                        stroke={
                          normalizedMode === 'focus'
                            ? 'url(#zenFocusGradient)'
                            : normalizedMode === 'short_break'
                            ? 'url(#zenShortBreakGradient)'
                            : normalizedMode === 'long_break'
                            ? 'url(#zenLongBreakGradient)'
                            : 'url(#zenStopwatchGradient)'
                        }
                        strokeWidth="10"
                        strokeDasharray={565.487}
                        strokeDashoffset={565.487 * (1 - progressPercent / 100)}
                        strokeLinecap="round"
                        filter={isRunning ? 'url(#zenTimerGlow)' : undefined}
                        className="transition-all duration-700 ease-out"
                        fill="none"
                      />
                    </svg>

                    {/* Inner Timer Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                      {/* Status Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border mb-1.5 shadow-xs transition-colors ${currentStyle.badge}`}
                      >
                        {isRunning && (
                          <span className="w-2 h-2 rounded-full bg-current animate-ping opacity-75" />
                        )}
                        <span>
                          {normalizedMode === 'focus'
                            ? t.pomodoroFocusMode || 'تمرکز عمیق'
                            : normalizedMode === 'short_break'
                            ? t.pomodoroShortBreak || 'استراحت کوتاه'
                            : normalizedMode === 'long_break'
                            ? t.pomodoroLongBreak || 'استراحت طولانی'
                            : t.pomodoroStopwatch || 'کرنومتر'}
                        </span>
                      </div>

                      {/* Main Time Counter */}
                      <span className="text-5xl sm:text-6xl md:text-7xl font-mono font-black text-white tracking-tighter my-1 tabular-nums drop-shadow-lg">
                        {timeFormatted}
                      </span>

                      {/* Target Indicator inside Ring */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 max-w-[240px] border border-slate-700/60 mt-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: activeTargetColor }}
                        />
                        <span
                          className="text-xs font-semibold truncate text-slate-200"
                          title={activeTargetName}
                        >
                          {activeTargetName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Minimal Zen Action Controls */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    id="pomodoro-zen-reset-btn"
                    onClick={handleResetClick}
                    title={t.pomodoroResetNoSaveTooltip || 'بازنشانی زمان (بدون ذخیره در تاریخچه)'}
                    className="p-4 rounded-2xl bg-slate-800/90 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all active:scale-95 cursor-pointer border border-slate-700/60 shadow-md"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    id="pomodoro-zen-main-toggle-btn"
                    onClick={handleTogglePlay}
                    className={`px-10 sm:px-12 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 flex items-center gap-3 cursor-pointer ${currentStyle.bg}`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-6 h-6" />
                        <span>{t.pomodoroPause || 'توقف'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 fill-current" />
                        <span>
                          {timeLeft < safeTotalDuration && timeLeft > 0
                            ? t.pomodoroResume || 'ادامه'
                            : t.pomodoroStart || 'شروع تمرکز'}
                        </span>
                      </>
                    )}
                  </button>

                  {normalizedMode === 'stopwatch' ? (
                    <button
                      id="pomodoro-zen-finish-btn"
                      onClick={handleStopwatchFinish}
                      title={t.pomodoroFinishStopwatchDesc || 'اتمام و ثبت جلسه کرنومتر'}
                      className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center gap-2 border border-emerald-500/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                      <span className="text-sm font-bold">{t.pomodoroFinishStopwatch || 'اتمام و ثبت'}</span>
                    </button>
                  ) : (
                    <button
                      id="pomodoro-zen-skip-btn"
                      onClick={handleSkipCountdownSession}
                      title={language === 'fa' ? 'رد کردن جلسه (ثبت در تاریخچه بدون پاداش)' : 'Skip session (log without reward)'}
                      className="p-4 rounded-2xl bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white transition-all active:scale-95 cursor-pointer border border-slate-700/60 shadow-md"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Switch to Detailed Mode Quick Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsZenMode(false)}
                    className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5 font-medium cursor-pointer py-1.5 px-4 rounded-full hover:bg-slate-800/50"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{language === 'fa' ? 'تغییر هدف، زمان، صدای پس‌زمینه یا ثبت دستی' : 'Change Target, Duration & Sound'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Completely Redesigned Detailed Mode Timer View */
              <div className="space-y-6 pb-2">
                {/* 1. Mode Selector Segmented Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/70">
                  <button
                    id="pomo-mode-focus-btn"
                    onClick={() => handleSwitchMode('focus')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      normalizedMode === 'focus'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-300" />
                    <span>{t.pomodoroFocusMode || 'تمرکز'}</span>
                  </button>

                  <button
                    id="pomo-mode-short-break-btn"
                    onClick={() => handleSwitchMode('short_break')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      normalizedMode === 'short_break'
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-1 ring-teal-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>{t.pomodoroShortBreak || 'استراحت کوتاه'}</span>
                  </button>

                  <button
                    id="pomo-mode-long-break-btn"
                    onClick={() => handleSwitchMode('long_break')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      normalizedMode === 'long_break'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t.pomodoroLongBreak || 'استراحت طولانی'}</span>
                  </button>

                  <button
                    id="pomo-mode-stopwatch-btn"
                    onClick={() => handleSwitchMode('stopwatch')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      normalizedMode === 'stopwatch'
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                    <span>{t.pomodoroStopwatch || 'کرنومتر'}</span>
                  </button>
                </div>

                {/* 2. Main 2-Column Responsive Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: Chronograph Control Deck (5 cols) */}
                  <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center text-center space-y-4">
                    
                    {/* Active Target Chip */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 max-w-full truncate shadow-2xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: activeTargetColor }}
                      />
                      <span className="truncate font-semibold">{activeTargetName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                        {effectiveTargetType === 'habit'
                          ? (t.pomodoroHabitsGroup || 'عادت')
                          : effectiveTargetType === 'task'
                          ? (t.pomodoroTasksGroup || 'تسک')
                          : (t.pomodoroNoTarget || 'آزاد')}
                      </span>
                    </div>

                    {/* Circular Chronograph Clock Dial */}
                    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center select-none my-1">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
                        <defs>
                          <linearGradient id="detailFocusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                          <linearGradient id="detailShortBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2dd4bf" />
                            <stop offset="100%" stopColor="#0d9488" />
                          </linearGradient>
                          <linearGradient id="detailLongBreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                          <linearGradient id="detailStopwatchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                          <filter id="detailGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow
                              dx="0"
                              dy="0"
                              stdDeviation="4"
                              floodColor={
                                normalizedMode === 'focus' ? '#6366f1' :
                                normalizedMode === 'short_break' ? '#14b8a6' :
                                normalizedMode === 'long_break' ? '#a855f7' : '#06b6d4'
                              }
                              floodOpacity="0.35"
                            />
                          </filter>
                        </defs>

                        {/* Outer Track with 60 Ticks */}
                        {Array.from({ length: 60 }).map((_, i) => {
                          const angle = (i * 6 * Math.PI) / 180;
                          const isMajor = i % 5 === 0;
                          const r1 = isMajor ? 98 : 101;
                          const r2 = 105;
                          const x1 = 120 + r1 * Math.cos(angle);
                          const y1 = 120 + r1 * Math.sin(angle);
                          const x2 = 120 + r2 * Math.cos(angle);
                          const y2 = 120 + r2 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={x1}
                              x2={x2}
                              y2={y2}
                              className={
                                isMajor
                                  ? 'stroke-slate-400/80 dark:stroke-slate-500/80'
                                  : 'stroke-slate-200 dark:stroke-slate-800'
                              }
                              strokeWidth={isMajor ? 2 : 1}
                              strokeLinecap="round"
                            />
                          );
                        })}

                        {/* Track Background */}
                        <circle
                          cx="120"
                          cy="120"
                          r="90"
                          className="stroke-slate-100 dark:stroke-slate-800/80"
                          strokeWidth="10"
                          fill="none"
                        />

                        {/* Active Progress Arc */}
                        <circle
                          cx="120"
                          cy="120"
                          r="90"
                          stroke={
                            normalizedMode === 'focus'
                              ? 'url(#detailFocusGradient)'
                              : normalizedMode === 'short_break'
                              ? 'url(#detailShortBreakGradient)'
                              : normalizedMode === 'long_break'
                              ? 'url(#detailLongBreakGradient)'
                              : 'url(#detailStopwatchGradient)'
                          }
                          strokeWidth="10"
                          strokeDasharray={565.487}
                          strokeDashoffset={565.487 * (1 - progressPercent / 100)}
                          strokeLinecap="round"
                          filter={isRunning ? 'url(#detailGlow)' : undefined}
                          className="transition-all duration-700 ease-out"
                          fill="none"
                        />
                      </svg>

                      {/* Inner Dial Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                        <span className="text-4xl sm:text-5xl font-mono font-black text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-xs">
                          {timeFormatted}
                        </span>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentStyle.badge}`}>
                            {normalizedMode === 'focus'
                              ? t.pomodoroFocusMode || 'تمرکز'
                              : normalizedMode === 'short_break'
                              ? t.pomodoroShortBreak || 'استراحت کوتاه'
                              : normalizedMode === 'long_break'
                              ? t.pomodoroLongBreak || 'استراحت طولانی'
                              : t.pomodoroStopwatch || 'کرنومتر'}
                          </span>
                        </div>

                        {/* 4 Cycle Dots */}
                        <div className="flex items-center gap-1.5 mt-2.5" title="چرخه جلسات پومودورو تا استراحت طولانی">
                          {[0, 1, 2, 3].map((idx) => {
                            const cycleIndex = effectiveCompletedSessions % 4;
                            const isDone = idx < cycleIndex;
                            return (
                              <span
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  isDone
                                    ? 'bg-indigo-600 dark:bg-indigo-400 scale-110 shadow-xs'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Primary Controls: Reset, Play/Pause, Skip/Finish */}
                    <div className="flex items-center justify-center gap-3 w-full">
                      <button
                        id="pomodoro-reset-btn"
                        onClick={handleResetClick}
                        title={t.pomodoroResetNoSaveTooltip || 'بازنشانی زمان (بدون ذخیره در تاریخچه)'}
                        className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>

                      <button
                        id="pomodoro-main-toggle-btn"
                        onClick={handleTogglePlay}
                        className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-base shadow-lg transition active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer ${currentStyle.bg}`}
                      >
                        {isRunning ? (
                          <>
                            <Pause className="w-5 h-5" />
                            <span>{t.pomodoroPause || 'توقف'}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 fill-current" />
                            <span>
                              {timeLeft < safeTotalDuration && timeLeft > 0
                                ? t.pomodoroResume || 'ادامه'
                                : t.pomodoroStart || 'شروع'}
                            </span>
                          </>
                        )}
                      </button>

                      {normalizedMode === 'stopwatch' ? (
                        <button
                          id="pomodoro-stopwatch-finish-btn"
                          onClick={handleStopwatchFinish}
                          title={t.pomodoroFinishStopwatchDesc || 'اتمام و ثبت جلسه کرنومتر'}
                          className="py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition active:scale-95 cursor-pointer shadow-md shadow-emerald-900/20 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                          <span className="text-xs font-bold whitespace-nowrap">{t.pomodoroFinishStopwatch || 'اتمام و ثبت'}</span>
                        </button>
                      ) : (
                        <button
                          id="pomodoro-skip-btn"
                          onClick={handleSkipCountdownSession}
                          title={language === 'fa' ? 'رد کردن جلسه (ثبت در تاریخچه بدون پاداش)' : 'Skip session (log without reward)'}
                          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
                        >
                          <SkipForward className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Presets & Steppers (when paused/focus) */}
                    {normalizedMode !== 'stopwatch' && !isRunning && (
                      <div className="w-full pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                        <div className="text-[11px] font-semibold text-slate-400 mb-2">
                          {t.pomodoroPresets || 'تنظیم سریع زمان:'}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                          <button
                            onClick={() => handleAdjustTime(-5)}
                            className="px-2 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-0.5 font-semibold cursor-pointer"
                            title="-۵ دقیقه"
                          >
                            <Minus className="w-3 h-3" />
                            <span>۵-</span>
                          </button>
                          {[15, 25, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleSetPreset(mins)}
                              className={`px-2.5 py-1 text-xs rounded-xl font-bold cursor-pointer transition-all ${
                                Math.round(timeLeft / 60) === mins
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {formatNumber(mins, language)}د
                            </button>
                          ))}
                          <button
                            onClick={() => handleAdjustTime(5)}
                            className="px-2 py-1 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-0.5 font-semibold cursor-pointer"
                            title="+۵ دقیقه"
                          >
                            <Plus className="w-3 h-3" />
                            <span>۵+</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Productivity Hub & Settings (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    
                    {/* Card 1: Target Selector Card */}
                    <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {t.pomodoroTargetCardTitle || 'هدف جلسه تمرکز'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {effectiveTargetType === 'habit' && currentHabit
                                ? `${currentHabit.name} (${formatNumber(currentHabit.totalFocusMinutes || 0, language)} دقیقه تمرکز تا کنون)`
                                : effectiveTargetType === 'task' && currentTask
                                ? `${currentTask.title} (${formatNumber(currentTask.totalFocusMinutes || 0, language)} دقیقه تمرکز تا کنون)`
                                : 'تمرکز آزاد بدون اتصال به آیتم خاص'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
                          className="px-3 py-1 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>{targetDropdownOpen ? 'بستن لیست' : 'انتخاب هدف'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${targetDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* Search & Selection area */}
                      {targetDropdownOpen && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-750 space-y-2 animate-fade-in">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                            <input
                              type="text"
                              value={targetSearchQuery}
                              onChange={(e) => setTargetSearchQuery(e.target.value)}
                              placeholder={language === 'fa' ? 'جستجو در عادات و تسک‌ها...' : 'Search habits or tasks...'}
                              className="w-full ps-8 pe-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setTargetFilterTab('all')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                targetFilterTab === 'all'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {language === 'fa' ? 'همه' : 'All'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetFilterTab('habit')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                targetFilterTab === 'habit'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {language === 'fa' ? 'عادات ۶۶ روزه' : 'Habits'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetFilterTab('task')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                targetFilterTab === 'task'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {language === 'fa' ? 'تسک‌ها' : 'Tasks'}
                            </button>
                          </div>

                          {/* List of targets */}
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {/* Free Focus option */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectTarget('none', null);
                                setTargetDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                effectiveTargetType === 'none'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                {t.pomodoroNoTarget || 'تمرکز آزاد (بدون اتصال به هدف خاص)'}
                              </span>
                              {effectiveTargetType === 'none' && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>

                            {/* Habits */}
                            {(targetFilterTab === 'all' || targetFilterTab === 'habit') &&
                              habits
                                .filter((h) => !targetSearchQuery || h.name.toLowerCase().includes(targetSearchQuery.toLowerCase()))
                                .map((h) => (
                                  <button
                                    key={h.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectTarget('habit', h.id);
                                      setTargetDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                                      effectiveTargetType === 'habit' && effectiveTargetId === h.id
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: h.color || '#3b82f6' }} />
                                      <span className="truncate">{h.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {formatNumber(h.totalFocusMinutes || 0, language)}m
                                      </span>
                                      {effectiveTargetType === 'habit' && effectiveTargetId === h.id && <Check className="w-4 h-4 text-indigo-600" />}
                                    </div>
                                  </button>
                                ))}

                            {/* Tasks */}
                            {(targetFilterTab === 'all' || targetFilterTab === 'task') &&
                              tasks
                                .filter((tsk) => !targetSearchQuery || tsk.title.toLowerCase().includes(targetSearchQuery.toLowerCase()))
                                .map((tsk) => (
                                  <button
                                    key={tsk.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectTarget('task', tsk.id);
                                      setTargetDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                                      effectiveTargetType === 'task' && effectiveTargetId === tsk.id
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tsk.color || '#10b981' }} />
                                      <span className={`truncate ${tsk.completed ? 'line-through text-slate-400' : ''}`}>{tsk.title}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {formatNumber(tsk.totalFocusMinutes || 0, language)}m
                                      </span>
                                      {effectiveTargetType === 'task' && effectiveTargetId === tsk.id && <Check className="w-4 h-4 text-indigo-600" />}
                                    </div>
                                  </button>
                                ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Ambient Soundscapes */}
                    <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                            <Music className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {t.pomodoroSoundCardTitle || 'فضاسازی صوتی و صداهای تمرکز'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {ambientSound !== 'none'
                                ? `در حال استفاده: ${customSounds.find((s) => s.id === ambientSound)?.name || 'صوت دلخواه'}`
                                : 'صوت پس‌زمینه خاموش است'}
                            </p>
                          </div>
                        </div>

                        {onOpenSettings && (
                          <button
                            type="button"
                            onClick={onOpenSettings}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <Sliders className="w-3 h-3" />
                            <span>{language === 'fa' ? 'مدیریت فایل‌ها' : 'Manage'}</span>
                          </button>
                        )}
                      </div>

                      {/* Sound chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSelectSound('none')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                            ambientSound === 'none'
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>{t.pomodoroSoundNone || 'خاموش'}</span>
                        </button>

                        {customSounds.map((snd) => (
                          <button
                            key={snd.id}
                            type="button"
                            onClick={() => handleSelectSound(snd.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                              ambientSound === snd.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Music className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{snd.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Volume Slider when sound is selected */}
                      {ambientSound !== 'none' && onVolumeChange && (
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 shrink-0">
                            <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                            <span>میزان صدا:</span>
                          </span>
                          <input
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            value={soundVolume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                          />
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-bold shrink-0">
                            {Math.round(soundVolume * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card 3: Quick Manual Logger */}
                    <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {t.pomodoroQuickLogCardTitle || 'ثبت سریع دقایق تمرکز'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              ثبت مستقیم دقایق بدون نیاز به اجرای تایمر
                            </p>
                          </div>
                        </div>

                        {manualSuccessMsg && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {manualSuccessMsg}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {[15, 25, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleManualLog(mins)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            +{formatNumber(mins, language)} {t.pomodoroMinutesLabel || 'دقیقه'}
                            {mins >= 25 && <span className="ms-1 text-[10px] text-amber-500 font-normal">🪙</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card 4: Smart Automation & Lally Guidelines */}
                    <div className="p-4 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>{t.pomodoroAutomationSettings || 'چرخه خودکار هوشمند'}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        • با اتمام ۲۵ دقیقه تمرکز، سیستم به صورت خودکار وارد حالت استراحت شده و شمارش را برای بازتوانی ذهنی آغاز می‌کند.
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        بر اساس مدل علمی لالی (Lally 2010)، حفظ فواصل منظم تمرکز و استراحت، پایداری اتصالات سیناپسی و خودکارسازی عادات را تثبیت می‌کند.
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )
        ) : (
            /* History & Analytics Tab */
            <div className="space-y-5">
              {/* Daily KPI summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                    {t.pomodoroTodayTotalFocus || 'تمرکز امروز'}
                  </div>
                  <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatNumber(stats.todayMinutes, language)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {t.pomodoroMinutesLabel || 'دقیقه'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                    {t.pomodoroTotalFocusAllTime || 'مجموع کل تمرکز'}
                  </div>
                  <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
                    {formatNumber(stats.totalMinutes, language)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {t.pomodoroMinutesLabel || 'دقیقه'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                    {t.pomodoroSessionsCount || 'تعداد جلسات'}
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {formatNumber(stats.totalSessionsCount, language)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                    {t.pomodoroHabitsGroup || 'عادات'}
                  </div>
                  <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                    {formatNumber(stats.habitMinutesTotal, language)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      {t.pomodoroMinutesLabel || 'دقیقه'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t.pomodoroHistoryTitle || 'تاریخچه جلسات اخیر'}
                  </h3>
                  {sessions.length > 0 && (
                    <button
                      onClick={() => {
                        clearPomodoroSessions();
                        setHistoryRefreshKey((prev) => prev + 1);
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.pomodoroClearHistory || 'پاکسازی تاریخچه'}</span>
                    </button>
                  )}
                </div>

                {sessions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    {t.pomodoroNoSessionsYet || 'هنوز جلسه‌ای ثبت نشده است.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                    {sessions.map((ses) => {
                      const isFull = ses.isCompletedFull || ses.durationMinutes >= 25;
                      const hasSeconds = typeof ses.durationSeconds === 'number' && ses.durationSeconds > 0;
                      const durSec = hasSeconds ? ses.durationSeconds! : ses.durationMinutes * 60;
                      const formattedDur = formatPomodoroDuration(durSec, language, true);

                      return (
                        <div
                          key={ses.id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`p-2 rounded-xl flex-shrink-0 ${
                                isFull
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}
                            >
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {ses.targetName || ses.targetTitle || t.pomodoroNoTarget || 'تمرکز آزاد'}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    isFull
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                  }`}
                                >
                                  {isFull
                                    ? (language === 'fa' ? 'تکمیل ۲۵دقیقه' : 'Completed 25m')
                                    : (language === 'fa' ? 'پایان زودهنگام' : 'Early finished')}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>{ses.completedAt}</span>
                                {ses.time && <span>• {ses.time}</span>}
                                <span>
                                  •{' '}
                                  {ses.mode === 'focus'
                                    ? t.pomodoroFocusMode || 'تمرکز'
                                    : t.pomodoroStopwatch || 'کرنومتر'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 font-mono flex-shrink-0">
                            <div className="text-end">
                              <div className="font-bold text-indigo-600 dark:text-indigo-400">
                                {formattedDur}
                              </div>
                              {ses.rewardCoinsEarned && ses.rewardCoinsEarned > 0 ? (
                                <div className="text-[10px] text-amber-500 font-bold">
                                  +{formatNumber(ses.rewardCoinsEarned, language)} 🪙
                                </div>
                              ) : null}
                            </div>
                            <button
                              onClick={() => {
                                deletePomodoroSession(ses.id);
                                setHistoryRefreshKey((prev) => prev + 1);
                              }}
                              className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={t.delete || 'حذف'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (only in detailed view) */}
        {!isZenMode && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              {t.pomodoroFloatingTimerTip || 'می‌توانید پنجره را ببندید، تایمر در پس‌زمینه ادامه می‌یابد.'}
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors cursor-pointer"
            >
              بستن و ادامه در پس‌زمینه
            </button>
          </div>
        )}
      </div>

      {/* Session Completion Celebration Dialog */}
      {showCompletionModal && lastFinishedSession && (
        <div
          id="pomodoro-celebration-dialog"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
        >
          <div
            dir={t.dir}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {t.pomodoroSessionCompleted || 'جلسه تمرکز با موفقیت به پایان رسید!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatNumber(lastFinishedSession.minutes, language)} {t.pomodoroMinutesLabel || 'دقیقه'}{' '}
                {t.pomodoroFocusMode || 'تمرکز'} برای «{lastFinishedSession.targetName}»
              </p>
            </div>

            {/* Rewards Card or Early Finish Notice */}
            {lastFinishedSession.coins > 0 || lastFinishedSession.xp > 0 ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-6">
                <div className="text-center">
                  <span className="block text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    +{formatNumber(lastFinishedSession.coins, language)}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {t.pomodoroCoinsEarned || 'سکه پاداش'} 🪙
                  </span>
                </div>
                <div className="w-px h-8 bg-amber-200 dark:bg-amber-800" />
                <div className="text-center">
                  <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    +{formatNumber(lastFinishedSession.xp, language)}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    {t.pomodoroXpEarned || 'امتیاز تجربه'} ⭐
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>
                    {formatNumber(lastFinishedSession.minutes, language)} {t.pomodoroMinutesLabel || 'دقیقه'} {t.pomodoroLoggedSuccess || 'ثبت شد'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.pomodoroEarlyFinishNotice ||
                    'جلسه قبل از ۲۵ دقیقه پایان یافت. زمان واقعی ثبت شد اما پاداش سکه و XP تنها به جلسات ۲۵ دقیقه به بالا تعلق می‌گیرد.'}
                </p>
              </div>
            )}

            {/* Prompts for Habit / Task Check-in */}
            {lastFinishedSession.targetType === 'habit' && lastFinishedSession.targetId && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-700 dark:text-slate-200 mb-2 font-medium">
                  {t.pomodoroMarkHabitDonePrompt || 'آیا مایلید تیک امروز این عادت ثبت شود؟'}
                </p>
                <button
                  onClick={() => {
                    if (lastFinishedSession.targetId) {
                      if (onCompleteHabit) {
                        onCompleteHabit(lastFinishedSession.targetId);
                      } else if (onUpdateHabitFocus) {
                        onUpdateHabitFocus(lastFinishedSession.targetId, 0, true);
                      }
                    }
                    setShowCompletionModal(false);
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت تیک امروز (انجام شد)</span>
                </button>
              </div>
            )}

            {lastFinishedSession.targetType === 'task' && lastFinishedSession.targetId && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-700 dark:text-slate-200 mb-2 font-medium">
                  {t.pomodoroMarkTaskDonePrompt || 'آیا مایلید وضعیت این تسک به پایان‌یافته تغییر کند؟'}
                </p>
                <button
                  onClick={() => {
                    if (lastFinishedSession.targetId) {
                      if (onCompleteTask) {
                        onCompleteTask(lastFinishedSession.targetId);
                      } else if (onUpdateTaskFocus) {
                        onUpdateTaskFocus(lastFinishedSession.targetId, 0, true);
                      }
                    }
                    setShowCompletionModal(false);
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تکمیل و بستن تسک</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setShowCompletionModal(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              عالی، بازگشت به تایمر
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
