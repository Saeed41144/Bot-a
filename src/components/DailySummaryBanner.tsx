import React, { useState } from 'react';
import { 
  Brain, 
  Calendar, 
  Moon, 
  Sun, 
  Sparkles, 
  Settings, 
  BarChart3, 
  Trophy,
  ShoppingBag,
  Coins,
  Flame,
  ListTodo,
  Timer,
  Clock
} from 'lucide-react';
import { Habit, Task, Language, ThemeMode, TelegramConfig, UserRewardWallet, AdvancedSettings } from '../types';
import { translations, getLocalizedDate, formatNumber } from '../utils/translations';
import { calculateAchievements } from '../utils/achievements';
import { calculateAllHabitsStreak } from '../utils/habitMath';
import { AllHabitsStreakModal } from './AllHabitsStreakModal';
import { resolveAppearance, ResolvedAppearance } from '../utils/themeAppearance';

interface DailySummaryBannerProps {
  habits: Habit[];
  tasks?: Task[];
  activeTab?: 'habits' | 'tasks' | 'daily_focus';
  onTabChange?: (tab: 'habits' | 'tasks' | 'daily_focus') => void;
  language: Language;
  theme: ThemeMode;
  telegramConfig: TelegramConfig;
  wallet?: UserRewardWallet;
  advancedSettings?: AdvancedSettings;
  appearance?: ResolvedAppearance;
  onToggleDarkMode: () => void;
  onOpenAddModal: () => void;
  onOpenScienceModal: () => void;
  onOpenSettings: () => void;
  onOpenAIReport: () => void;
  onOpenStatsModal: () => void;
  onOpenAchievements: () => void;
  onOpenShop: () => void;
  onOpenPomodoro?: () => void;
  isPomodoroRunning?: boolean;
}

export const DailySummaryBanner: React.FC<DailySummaryBannerProps> = ({
  habits,
  tasks = [],
  activeTab,
  onTabChange,
  language,
  theme,
  telegramConfig,
  wallet,
  advancedSettings,
  appearance: propAppearance,
  onToggleDarkMode,
  onOpenScienceModal,
  onOpenSettings,
  onOpenAIReport,
  onOpenStatsModal,
  onOpenAchievements,
  onOpenShop,
  onOpenPomodoro,
  isPomodoroRunning = false,
}) => {
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const t = translations[language];
  const isFa = language === 'fa';
  const { weekday, dayMonthYear } = getLocalizedDate(language);

  const appearance = propAppearance || resolveAppearance(theme, advancedSettings?.uiAppearance);
  const isConfiguredTelegram = !!(telegramConfig.botToken && telegramConfig.chatId);
  const achievementsOverview = calculateAchievements(habits, language, tasks, wallet);
  const allHabitsStreak = calculateAllHabitsStreak(habits);
  const coinsCount = wallet ? wallet.coins : 0;
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  return (
    <>
      <header 
        dir={t.dir}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-200/90 dark:border-slate-800/90"
      >
        {/* Brand & App Identity */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 text-sm">
                ۶۶
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {t.appTitle}
              </h1>
              <span className="bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60">
                {t.scientificModelBadge}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {t.appSubtitle}
            </p>
          </div>

          {/* Mobile date pill */}
          <div 
            style={appearance.actionIconStyle || appearance.cardBoxStyle}
            className={`xl:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${appearance.actionIconClass} ${appearance.shadowClass}`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-[11px] whitespace-nowrap">{weekday}</span>
          </div>
        </div>

        {/* Action Command Bar / Structured Toolbars */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
          
          {/* Cluster 1: Gamification & Rewards (Streak, Wallet, Achievements) */}
          <div 
            style={appearance.toolbarContainerStyle || appearance.cardBoxStyle}
            className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-all duration-200 ${appearance.toolbarContainerClass} ${appearance.shadowClass}`}
          >
            {/* 1. All Habits Streak */}
            <button
              id="header-all-habits-streak-btn"
              type="button"
              onClick={() => setIsStreakModalOpen(true)}
              style={allHabitsStreak.currentStreak > 0 ? undefined : (appearance.actionIconStyle || appearance.cardBoxStyle)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                allHabitsStreak.currentStreak > 0
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 text-orange-800 dark:text-orange-300 border border-orange-400/40 hover:border-orange-500 shadow-2xs'
                  : appearance.actionIconClass
              }`}
              title={
                isFa
                  ? `زنجیره روزهای متوالی تمام عادات: ${formatNumber(allHabitsStreak.currentStreak, language)} روز`
                  : `All-Habits Streak: ${formatNumber(allHabitsStreak.currentStreak, language)} days`
              }
              aria-label="All-Habits Streak"
            >
              <Flame className={`w-3.5 h-3.5 ${
                allHabitsStreak.currentStreak > 0 
                  ? 'text-orange-600 dark:text-orange-400 fill-orange-500/40 animate-pulse' 
                  : 'text-slate-400'
              }`} />
              <span className="hidden md:inline text-xs">{isFa ? 'زنجیره' : 'Streak'}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                allHabitsStreak.currentStreak > 0
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {formatNumber(allHabitsStreak.currentStreak, language)}
              </span>
            </button>

            {/* 2. Coin Reward Store */}
            <button
              id="header-shop-btn"
              type="button"
              onClick={onOpenShop}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400/20 via-yellow-400/15 to-amber-500/20 hover:from-amber-400/30 hover:to-amber-500/30 text-amber-900 dark:text-amber-300 border border-amber-400/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              title={isFa ? 'فروشگاه پاداش و وب‌ناول‌ها' : 'Reward Store & Novels'}
              aria-label="Reward Store"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden md:inline text-xs">{isFa ? 'فروشگاه' : 'Store'}</span>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md shadow-2xs flex items-center gap-0.5">
                <Coins className="w-2.5 h-2.5" />
                <span>{formatNumber(coinsCount, language)}</span>
              </span>
            </button>

            {/* 3. Achievements Trophy */}
            <button
              id="header-achievements-btn"
              type="button"
              onClick={onOpenAchievements}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
              title={t.achievementsBtn}
              aria-label={t.achievementsBtn}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline text-xs">{t.achievementsBtn}</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black px-1.5 py-0.5 rounded-md">
                {formatNumber(achievementsOverview.totalUnlocked, language)}/{formatNumber(achievementsOverview.totalAchievements, language)}
              </span>
            </button>
          </div>

          {/* Cluster 2: Intelligence, Analytics & Science (AI, Stats, Scientific Model) */}
          <div 
            style={appearance.toolbarContainerStyle || appearance.cardBoxStyle}
            className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-all duration-200 ${
              appearance.toolbarContainerClass || 'bg-slate-100/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800'
            } ${appearance.shadowClass}`}
          >
            {/* 4. Pomodoro Focus Timer */}
            {onOpenPomodoro && (
              <button
                id="header-pomodoro-btn"
                type="button"
                onClick={onOpenPomodoro}
                style={isPomodoroRunning ? undefined : (appearance.actionIconStyle || appearance.cardBoxStyle)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs ${
                  isPomodoroRunning
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 animate-pulse'
                    : `${appearance.actionIconClass || 'bg-white dark:bg-slate-800'} hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700`
                }`}
                title={t.pomodoroModalTitle}
                aria-label={t.pomodoroModalTitle}
              >
                <Timer className={`w-3.5 h-3.5 ${isPomodoroRunning ? 'text-white animate-spin' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span className="hidden lg:inline text-xs">{t.pomodoroNavTitle}</span>
                {isPomodoroRunning && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )}

            {/* 5. AI Insights Report */}
            <button
              id="header-ai-report-btn"
              type="button"
              onClick={onOpenAIReport}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/80 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs hover:opacity-90 ${
                appearance.actionIconClass || 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
              }`}
              title={t.viewAiReport}
              aria-label={t.viewAiReport}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden lg:inline text-xs">{isFa ? 'گزارش هوش مصنوعی' : 'AI Report'}</span>
            </button>

            {/* 6. Statistics & Analytics */}
            <button
              id="header-stats-btn"
              type="button"
              onClick={onOpenStatsModal}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
              title={t.statsBtn}
              aria-label={t.statsBtn}
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden lg:inline text-xs">{t.statsBtn}</span>
            </button>

            {/* 7. Scientific Neurobiology Simulator */}
            <button
              id="header-open-science-modal"
              type="button"
              onClick={onOpenScienceModal}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
              title={t.scientificFormulaBtn}
              aria-label={t.scientificFormulaBtn}
            >
              <Brain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden lg:inline text-xs">{t.scientificFormulaBtn}</span>
            </button>
          </div>

          {/* Cluster 3: System & Utility Tools (Tasks Nav, Date, Settings, Theme) */}
          <div 
            style={appearance.toolbarContainerStyle || appearance.cardBoxStyle}
            className={`flex items-center gap-1.5 p-1 rounded-2xl border transition-all duration-200 ${
              appearance.toolbarContainerClass || 'bg-slate-100/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800'
            } ${appearance.shadowClass}`}
          >
            {/* 8. Tasks Quick Switch (if provided) */}
            {onTabChange && (
              <button
                id="header-tasks-nav-btn"
                type="button"
                onClick={() => onTabChange(activeTab === 'tasks' ? 'habits' : 'tasks')}
                style={activeTab === 'tasks' ? undefined : (appearance.actionIconStyle || appearance.cardBoxStyle)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                  activeTab === 'tasks'
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs'
                    : `${appearance.actionIconClass || 'bg-white dark:bg-slate-800'} hover:bg-slate-50 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-slate-200/80 dark:border-slate-700`
                }`}
                title={t.tasksSectionTitle}
                aria-label={t.tasksNavTitle}
              >
                <ListTodo className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {pendingTasksCount > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                    activeTab === 'tasks' ? 'bg-blue-800 text-white' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200'
                  }`}>
                    {formatNumber(pendingTasksCount, language)}
                  </span>
                )}
              </button>
            )}

            {/* 9. Desktop Date Pill */}
            <div 
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-[11px] whitespace-nowrap" id="current-date">
                {weekday}، {dayMonthYear}
              </span>
            </div>

            {/* 10. Settings */}
            <button
              id="header-settings-btn"
              type="button"
              onClick={onOpenSettings}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center text-xs shadow-2xs ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
              title={t.settingsTitle}
              aria-label={t.settingsTitle}
            >
              <Settings className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>

            {/* 11. Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={onToggleDarkMode}
              style={appearance.actionIconStyle || appearance.cardBoxStyle}
              className={`p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:opacity-90 transition-all cursor-pointer flex items-center justify-center text-xs shadow-2xs ${
                appearance.actionIconClass || 'bg-white dark:bg-slate-800'
              }`}
              title={theme === 'dark' ? t.themeLight : t.themeDark}
              aria-label={t.themeToggle}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 fill-slate-700" />
              )}
            </button>
          </div>

        </div>
      </header>

      {/* All Habits Consecutive Streak Modal */}
      <AllHabitsStreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        habits={habits}
        language={language}
        appearance={appearance}
        onOpenStatsModal={onOpenStatsModal}
      />
    </>
  );
};
