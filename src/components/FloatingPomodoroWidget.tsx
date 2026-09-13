import React from 'react';
import { Play, Pause, Maximize2, Sparkles, CheckCircle2, Clock, RotateCcw, X } from 'lucide-react';
import { PomodoroMode, PomodoroTargetType, Language, Habit, Task } from '../types';
import { translations, formatNumber } from '../utils/translations';

interface FloatingPomodoroWidgetProps {
  language: Language;
  mode: PomodoroMode | string;
  timeLeft: number;
  totalTime?: number;
  totalDuration?: number;
  isRunning: boolean;
  targetType: PomodoroTargetType;
  targetId?: string | null;
  targetName?: string;
  targetColor?: string;
  habits?: Habit[];
  tasks?: Task[];
  className?: string;
  onTogglePlay?: () => void;
  onToggleRunning?: () => void;
  onOpenModal: () => void;
  onReset?: () => void;
  onClose?: () => void;
}

export const FloatingPomodoroWidget: React.FC<FloatingPomodoroWidgetProps> = ({
  language,
  mode,
  timeLeft,
  totalTime,
  totalDuration,
  isRunning,
  targetType,
  targetId,
  targetName,
  targetColor,
  habits = [],
  tasks = [],
  className = '',
  onTogglePlay,
  onToggleRunning,
  onOpenModal,
  onReset,
  onClose,
}) => {
  const t = translations[language] || translations.fa;
  const isRtl = t.dir === 'rtl';

  const normalizedMode: PomodoroMode =
    mode === 'shortBreak'
      ? 'short_break'
      : mode === 'longBreak'
      ? 'long_break'
      : mode === 'short_break' || mode === 'long_break' || mode === 'stopwatch'
      ? (mode as PomodoroMode)
      : 'focus';

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const timeFormatted =
    hours > 0
      ? `${formatNumber(String(hours).padStart(2, '0'), language)}:${formatNumber(
          String(minutes).padStart(2, '0'),
          language
        )}:${formatNumber(String(seconds).padStart(2, '0'), language)}`
      : `${formatNumber(String(minutes).padStart(2, '0'), language)}:${formatNumber(
          String(seconds).padStart(2, '0'),
          language
        )}`;

  const resolvedTotalTime =
    (totalDuration && totalDuration > 0)
      ? totalDuration
      : (totalTime && totalTime > 0)
      ? totalTime
      : normalizedMode === 'short_break'
      ? 5 * 60
      : normalizedMode === 'long_break'
      ? 15 * 60
      : 25 * 60;

  const progressPercent =
    normalizedMode === 'stopwatch'
      ? Math.min(100, Math.max(0, (timeLeft / 3600) * 100))
      : resolvedTotalTime > 0
      ? Math.min(100, Math.max(0, (timeLeft / resolvedTotalTime) * 100))
      : 100;

  // Resolve target name and color
  let resolvedTargetName = targetName;
  let resolvedTargetColor = targetColor || '#6366f1';

  if (!resolvedTargetName && targetId) {
    if (targetType === 'habit') {
      const h = habits.find((item) => item.id === targetId);
      if (h) {
        resolvedTargetName = h.name;
        resolvedTargetColor = h.color || '#3b82f6';
      }
    } else if (targetType === 'task') {
      const tsk = tasks.find((item) => item.id === targetId);
      if (tsk) {
        resolvedTargetName = tsk.title;
        resolvedTargetColor = tsk.color || '#10b981';
      }
    }
  }

  if (!resolvedTargetName) {
    resolvedTargetName =
      targetType === 'habit'
        ? t.pomodoroHabitsGroup || 'عادت'
        : targetType === 'task'
        ? t.pomodoroTasksGroup || 'تسک'
        : t.pomodoroNoTarget || 'تمرکز آزاد';
  }

  const handleToggle = () => {
    if (onToggleRunning) {
      onToggleRunning();
    } else if (onTogglePlay) {
      onTogglePlay();
    }
  };

  const modeColors: Record<PomodoroMode, { bg: string; text: string; ring: string; badge: string }> = {
    focus: {
      bg: 'bg-indigo-600 dark:bg-indigo-700',
      text: 'text-indigo-100',
      ring: 'text-indigo-500',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    },
    short_break: {
      bg: 'bg-teal-600 dark:bg-teal-700',
      text: 'text-teal-100',
      ring: 'text-teal-500',
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
    },
    long_break: {
      bg: 'bg-purple-600 dark:bg-purple-700',
      text: 'text-purple-100',
      ring: 'text-purple-500',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
    stopwatch: {
      bg: 'bg-cyan-600 dark:bg-cyan-700',
      text: 'text-cyan-100',
      ring: 'text-cyan-500',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
    },
  };

  const currentTheme = modeColors[normalizedMode] || modeColors.focus;

  return (
    <div
      id="floating-pomodoro-widget"
      dir={t.dir}
      className={
        className
          ? `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-2xl animate-fade-in ${className}`
          : `fixed bottom-5 ${
              isRtl ? 'left-5' : 'right-5'
            } z-40 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 transition-all duration-300 hover:shadow-2xl animate-fade-in`
      }
    >
      {/* Progress ring or pulsing icon */}
      <button
        id="floating-pomodoro-maximize-btn"
        onClick={onOpenModal}
        title={t.pomodoroModalTitle || 'تایمر پومودورو'}
        className="relative flex items-center justify-center w-10 h-10 rounded-full focus:outline-none group cursor-pointer"
      >
        <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 36 36">
          <path
            className="text-slate-200 dark:text-slate-700 stroke-current"
            strokeWidth="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={`${currentTheme.ring} stroke-current transition-all duration-500`}
            strokeDasharray={`${progressPercent}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock
            className={`w-4 h-4 ${
              isRunning ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-400 dark:text-slate-500'
            }`}
          />
        </div>
      </button>

      {/* Target and Time Details */}
      <button
        id="floating-pomodoro-text-btn"
        onClick={onOpenModal}
        className="flex flex-col text-start max-w-[130px] sm:max-w-[170px] truncate focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {timeFormatted}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${currentTheme.badge}`}
          >
            {normalizedMode === 'focus'
              ? t.pomodoroFocusMode || 'تمرکز'
              : normalizedMode === 'short_break'
              ? t.pomodoroShortBreak || 'استراحت'
              : normalizedMode === 'long_break'
              ? t.pomodoroLongBreak || 'استراحت طولانی'
              : t.pomodoroStopwatch || 'کرنومتر'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: resolvedTargetColor }}
          />
          <span className="truncate">{resolvedTargetName}</span>
        </div>
      </button>

      {/* Action Controls */}
      <div className="flex items-center gap-1 pl-1 border-s border-slate-200 dark:border-slate-800">
        <button
          id="floating-pomodoro-play-pause-btn"
          onClick={handleToggle}
          title={isRunning ? t.pomodoroPause || 'توقف' : t.pomodoroStart || 'شروع'}
          className={`p-2 rounded-xl text-white font-bold transition-transform active:scale-95 cursor-pointer ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {onReset && (
          <button
            id="floating-pomodoro-reset-btn"
            onClick={onReset}
            title={t.pomodoroResetNoSaveTooltip || t.pomodoroReset || 'بازنشانی زمان (بدون ذخیره در تاریخچه)'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          id="floating-pomodoro-expand-btn"
          onClick={onOpenModal}
          title={t.pomodoroModalTitle || 'باز کردن پنجره کامل'}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {onClose && (
          <button
            id="floating-pomodoro-close-btn"
            onClick={onClose}
            title={t.close || 'بستن صفحه شناور'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
