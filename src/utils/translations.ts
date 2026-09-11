import { Language, HabitStage } from '../types';

export interface TranslationDict {
  dir: 'rtl' | 'ltr';
  appTitle: string;
  appSubtitle: string;
  scientificModelBadge: string;
  todayLabel: string;
  themeToggle: string;
  scientificFormulaBtn: string;
  settingsBtn: string;
  newHabitBtn: string;
  quickAddTitle: string;
  customizationMore: string;
  habitInputLabel: string;
  habitInputPlaceholder: string;
  addToHabitsBtn: string;
  scientificGuideTitle: string;
  advancedSimulator: string;
  scientificExplanation: string;
  todaySummaryTitle: string;
  todayProgress: string;
  recordedPercentage: string;
  avgAutomaticity: string;
  allActiveHabits: string;
  searchPlaceholder: string;
  filterAll: string;
  filterPending: string;
  filterCompleted: string;
  allDoneTodayTitle: string;
  allDoneTodayDesc: string;
  viewCompletedHabitsBtn: string;
  statsBtn: string;
  achievementsBtn: string;
  achievementsModalTitle: string;
  achievementsModalSubtitle: string;
  achievementsSidebarCardTitle: string;
  viewAllAchievements: string;
  statsModalTitle: string;
  statsModalSubtitle: string;
  statsTotalHabits: string;
  statsTodayRate: string;
  statsAvgAuto: string;
  statsTotalCompletions: string;
  statsTopStreak: string;
  statsStageDistribution: string;
  statsHabitDetailsTitle: string;
  statsColHabit: string;
  statsColToday: string;
  statsColAuto: string;
  statsColStreak: string;
  statsColLongestStreak: string;
  statsColCompletedDays: string;
  statsColRemaining: string;
  statsSendToTelegram: string;
  statsViewAiReport: string;
  tabOverview: string;
  tabHabitsMatrix: string;
  tabIndividual: string;
  tabRecurringTasks: string;
  tabYearlyMatrix: string;
  tabGrowthCurve: string;
  recurringTasksStatsTitle: string;
  recurringTasksStatsSubtitle: string;
  yearlyMatrixTitle: string;
  yearlyMatrixSubtitle: string;
  allHabitsCombined: string;
  yearlyCompletions: string;
  yearlyConsistency: string;
  bestYearlyStreak: string;
  mostActiveMonth: string;
  bestWeekday: string;
  monthBreakdownTitle: string;
  less: string;
  more: string;
  statsSortBy: string;
  sortHighestAuto: string;
  sortHighestStreak: string;
  sortPendingFirst: string;
  sortMostCompletions: string;
  statsCopySummary: string;
  statsCopied: string;
  growthCurveDesc: string;
  milestone21Title: string;
  milestone45Title: string;
  milestone66Title: string;
  noHabitsYet: string;
  noHabitsFiltered: string;
  noHabitsSubtext: string;
  createWithDetails: string;
  backupBtn: string;
  resetDefaultsBtn: string;
  resetConfirm: string;
  startFromDaysAgo: string;
  consecutiveStreak: string;
  automaticityRate: string;
  remainingDaysToGoal: string;
  goalAchieved: string;
  doneToday: string;
  markDoneToday: string;
  history7Days: string;
  matrix7Days: string;
  weeklyMatrix: string;
  saturdayToFriday: string;
  pendingToday: string;
  upcomingDay: string;
  daysDoneCount7: string;
  completed: string;
  notCompleted: string;
  deleteHabit: string;
  deleteConfirmTitle: string;
  deleteConfirmWarning: string;
  currentAutomaticity: string;
  recordedDaysCount: string;
  deletePromptText: string;
  deleteTaskConfirmTitle: string;
  deleteTaskConfirmWarning: string;
  deleteTaskPromptText: string;
  cancel: string;
  yesDelete: string;
  deleteShortConfirm: string;
  yes: string;
  createHabitTitle: string;
  createHabitSubtitle: string;
  quickPresetsLabel: string;
  habitTitleLabel: string;
  habitTitlePlaceholder: string;
  habitTitleError: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  iconLabel: string;
  customColorLabel: string;
  rewardCoinsLabel: string;
  rewardCoinsSubtext: string;
  rewardXpLabel: string;
  rewardXpSubtext: string;
  scientificNote: string;
  submitAndStart: string;
  scienceModalTitle: string;
  scienceModalSubtitle: string;
  automaticityFormulaTitle: string;
  tEffectiveDays: string;
  sixtySixDaysMean: string;
  simulatorTitle: string;
  effectiveDaysSlider: string;
  resultingScore: string;
  stageLabel: string;
  findingsTitle: string;
  oneDayGraceTitle: string;
  oneDayGraceDesc: string;
  twoDayPenaltyTitle: string;
  twoDayPenaltyDesc: string;
  asymptoticCurveTitle: string;
  asymptoticCurveDesc: string;
  understoodBtn: string;
  // Stage Labels
  stageForming: string;
  stageSemi: string;
  stageAutomatic: string;
  // Settings & Telegram & AI
  settingsTitle: string;
  settingsSubtitle: string;
  languageSection: string;
  themeSection: string;
  themeLight: string;
  themeDark: string;
  telegramSection: string;
  telegramDescription: string;
  botTokenLabel: string;
  botTokenPlaceholder: string;
  chatIdLabel: string;
  chatIdPlaceholder: string;
  howToGetTelegram: string;
  telegramGuideText: string;
  autoDailyReportToggle: string;
  reportTimeLabel: string;
  testTelegramBtn: string;
  testingTelegram: string;
  sendAiReportNowBtn: string;
  generatingAiReport: string;
  saveSettingsBtn: string;
  settingsSaved: string;
  aiReportModalTitle: string;
  aiReportModalSubtitle: string;
  generalCritiqueTitle: string;
  actionableTipsTitle: string;
  motivationalQuoteTitle: string;
  sendToTelegramSuccess: string;
  sendToTelegramFailed: string;
  copyReportBtn: string;
  reportCopied: string;
  viewAiReport: string;
  close: string;
  // Backup & Restore
  backupSection: string;
  backupDescription: string;
  userBackupBadge: string;
  userBackupIncludesTitle: string;
  userBackupExcludesShopNotice: string;
  downloadBackupBtn: string;
  uploadBackupBtn: string;
  uploadDragDropText: string;
  uploadSubtext: string;
  restoreSuccess: string;
  restoreError: string;
  restoreConfirm: string;
  autoBackupTelegramSection: string;
  autoBackupToggle: string;
  backupIntervalLabel: string;
  intervalDaily: string;
  intervalEvery3Days: string;
  intervalWeekly: string;
  intervalMonthly: string;
  backupTimeLabel: string;
  dedicatedBackupBotTitle: string;
  dedicatedBackupBotDesc: string;
  useDedicatedBotToggle: string;
  useMainBotOption: string;
  backupBotTokenLabel: string;
  backupBotTokenPlaceholder: string;
  backupChatIdLabel: string;
  backupChatIdPlaceholder: string;
  testBackupBotBtn: string;
  testBackupBotSuccess: string;
  testBackupBotFailed: string;
  scheduledBackupScheduleTitle: string;
  backupDayOfWeekLabel: string;
  backupDayOfMonthLabel: string;
  backupFormatLabel: string;
  backupFormatStandard: string;
  backupFormatEncrypted: string;
  backupFormatSanitized: string;
  backupEncryptionPassPlaceholder: string;
  nextScheduledRunLabel: string;
  backupStatusLabel: string;
  statusActiveScheduled: string;
  statusDisabled: string;
  totalAutoBackupsLabel: string;
  sendBackupNowBtn: string;
  sendingBackup: string;
  backupSentSuccess: string;
  backupSentFailed: string;
  totalHabitsCount: string;
  exportSummary: string;
  lastBackupSentLabel: string;
  neverSent: string;
  copyBackupJsonBtn: string;
  backupCopiedSuccess: string;
  fullBackupIncludedTitle: string;
  fullBackupHabitsIncluded: string;
  fullBackupSettingsIncluded: string;
  fullBackupTelegramIncluded: string;
  fullBackupStatsIncluded: string;
  restorePreviewTitle: string;
  restoredHabitsCountLabel: string;
  restoredCheckInsCountLabel: string;
  restoredSettingsLabel: string;
  restoredNovelsLabel: string;
  // Interactive Telegram Bot
  telegramInteractiveSection: string;
  telegramInteractiveDesc: string;
  botCommandsTitle: string;
  cmdReportDesc: string;
  cmdStatsDesc: string;
  cmdTodayDesc: string;
  cmdHabitsDesc: string;
  cmdAddDesc: string;
  cmdTasksDesc?: string;
  cmdAddTaskDesc?: string;
  cmdWalletDesc?: string;
  cmdShopDesc?: string;
  cmdAchievementsDesc?: string;
  cmdAskDesc?: string;
  cmdFocusDesc?: string;
  cmdModelDesc?: string;
  cmdTipsDesc?: string;
  cmdDeleteDesc: string;
  cmdBackupDesc: string;
  cmdHelpDesc: string;
  setBotMenuBtn: string;
  settingBotMenu: string;
  botMenuSetSuccess: string;
  botMenuSetFailed: string;
  botStatusListening: string;
  botStatusWaiting: string;
  // Bot Persona & Coaching Tone
  botPersonaTitle?: string;
  botPersonaDesc?: string;
  personaAcademic?: string;
  personaAcademicDesc?: string;
  personaCoach?: string;
  personaCoachDesc?: string;
  personaStrict?: string;
  personaStrictDesc?: string;
  personaZen?: string;
  personaZenDesc?: string;
  // Real-time Push Notifications & Quiet Hours
  notifyOnTaskCompletionTitle?: string;
  notifyOnTaskCompletionDesc?: string;
  notifyOnTaskCompletionLabel?: string;
  notifyOnHabitCheckTitle?: string;
  notifyOnHabitCheckDesc?: string;
  notifyOnHabitCheckLabel?: string;
  sendInstantNotificationTestBtn?: string;
  instantNotificationSentSuccess?: string;
  // Pomodoro & Deep Work in Telegram & AI
  pomodoroTelegramSectionTitle?: string;
  pomodoroTelegramSectionDesc?: string;
  notifyOnPomodoroCompletionLabel?: string;
  notifyOnPomodoroCompletionDesc?: string;
  enableTelegramPomodoroControlLabel?: string;
  enableTelegramPomodoroControlDesc?: string;
  sendPomodoroTestBtn?: string;
  pomodoroNotificationSentSuccess?: string;
  pomodoroAiCoachTitle?: string;
  pomodoroAiCoachDesc?: string;
  quietHoursTitle?: string;
  quietHoursDesc?: string;
  enableQuietHoursToggle?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursStartLabel?: string;
  quietHoursEndLabel?: string;
  openInTelegramBtn?: string;
  botConnectionLiveStatus?: string;
  botLatencyLabel?: string;
  botUsernameLabel?: string;
  remindersSectionTitle?: string;
  remindersSectionDesc?: string;
  reminderToggleLabel?: string;
  reminderTimesListLabel?: string;
  noReminderTimesAdded?: string;
  // Smart Reminders & Strict Accountability
  remindersSection: string;
  remindersDesc: string;
  enableRemindersToggle: string;
  reminderTimesLabel: string;
  addReminderTimeBtn: string;
  removeTimeBtn: string;
  strictWarningSection: string;
  strictWarningDesc: string;
  enableStrictWarningToggle: string;
  strictWarningTimeLabel: string;
  sendReminderTestBtn: string;
  sendStrictWarningTestBtn: string;
  reminderSentSuccess: string;
  strictWarningSentSuccess: string;
  // Visual Chart Infographics
  visualChartSectionTitle: string;
  visualChartSectionDesc: string;
  sendVisualChartsToggle: string;
  sendVisualChartTestBtn: string;
  visualChartSentSuccess: string;
  cmdChartDesc: string;
  // Advanced Settings
  advancedTabTitle: string;
  advancedSettingsTitle: string;
  advancedSettingsDesc: string;
  defaultTargetDaysLabel: string;
  defaultTargetDaysDesc: string;
  feedbackEffectsTitle: string;
  feedbackEffectsDesc: string;
  soundEffectsLabel: string;
  soundEffectsDesc: string;
  soundFeedbackLabel: string;
  soundFeedbackDesc: string;
  hapticFeedbackLabel: string;
  hapticFeedbackDesc: string;
  confettiEffectsLabel: string;
  confettiEffectsDesc: string;
  confettiCelebrationLabel: string;
  confettiCelebrationDesc: string;
  strictStreakToggleLabel: string;
  strictStreakToggleDesc: string;
  storageManagerTitle: string;
  serverStorageTitle: string;
  serverStorageDesc: string;
  persistentDbStatus: string;
  antiWipeStatus: string;
  dbLocationLabel: string;
  fileStorageTitle: string;
  fileStorageDesc: string;
  createSnapshotBtn: string;
  creatingSnapshot: string;
  createSnapshotSuccess: string;
  serverBackupsListTitle: string;
  restoreSnapshotBtn: string;
  restoringSnapshot: string;
  deleteSnapshotBtn: string;
  deleteSnapshotConfirm: string;
  storeFilesSectionTitle: string;
  storeFilesSectionDesc: string;
  scanVideosFolderBtn: string;
  scanningVideos: string;
  scanVideosSuccess: string;
  uploadZipBtn: string;
  uploadingZip: string;
  termuxTransferGuideTitle: string;
  termuxTransferGuideDesc: string;
  cleanupOrphanFilesBtn: string;
  cleanupOrphanFilesDesc: string;
  storeFolderExplorerTitle: string;
  videoFilesCountLabel: string;
  novelsFilesCountLabel: string;
  storeMediaFoldersTitle: string;
  storeMediaFoldersDesc: string;
  videosFolderLabel: string;
  novelsFolderLabel: string;
  forceSaveDiskBtn: string;
  forceSaveSuccess: string;
  exportBackupBtn: string;
  importBackupBtn: string;
  importBackupSuccess: string;
  storageUsedLabel: string;
  totalDataRecordsLabel: string;
  optimizeCacheBtn: string;
  cacheOptimizedSuccess: string;
  systemDiagnosticsTitle: string;
  scientificParamsTitle: string;
  scientificParamsDesc: string;
  testSoundBtn: string;
  testConfettiBtn: string;
  // Task Management
  tasksNavTitle: string;
  habitsNavTitle: string;
  dailyFocusNavTitle: string;
  tasksSectionTitle: string;
  tasksSectionSubtitle: string;
  createTaskTitle: string;
  createTaskSubtitle: string;
  editTaskTitle: string;
  taskTitleLabel: string;
  taskTitlePlaceholder: string;
  taskTitleError: string;
  taskDescLabel: string;
  taskDescPlaceholder: string;
  taskPriorityLabel: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  taskDueDateLabel: string;
  taskDueToday: string;
  taskDueTomorrow: string;
  taskDueNoDate: string;
  taskCustomDate: string;
  taskDueTimeLabel: string;
  taskCategoryLabel: string;
  taskCategoryPlaceholder: string;
  taskSubtasksLabel: string;
  addSubtaskBtn: string;
  subtaskPlaceholder: string;
  taskRewardCoinsLabel: string;
  taskRewardXpLabel: string;
  submitCreateTask: string;
  submitSaveTask: string;
  filterTaskAll: string;
  filterTaskPending: string;
  filterTaskCompleted: string;
  filterTaskHighPriority: string;
  filterTaskToday: string;
  tasksDoneSummary: string;
  noTasksYet: string;
  noTasksFiltered: string;
  noTasksSubtext: string;
  quickAddTaskPlaceholder: string;
  deleteTaskConfirm: string;
  taskCompletedCelebration: string;
  subtasksCompletedRatio: string;
  taskDueIn2Days: string;
  taskDueNextWeek: string;
  taskDueNextMonth: string;
  taskDatePickerTitle: string;
  taskShamsiYear: string;
  taskShamsiMonth: string;
  taskShamsiDay: string;
  taskSelectedDatePreview: string;
  recurringTaskToggle: string;
  recurringTaskDesc: string;
  recurrenceFrequencyLabel: string;
  recurrenceDaily: string;
  recurrenceWeekdays: string;
  recurrenceWeekly: string;
  recurrenceMonthly: string;
  recurrenceCustom: string;
  recurrenceIntervalLabel: string;
  recurrenceDaysOfWeekLabel: string;
  filterTaskRecurring: string;
  recurringTaskBadge: string;
  recurringCycleCount: string;
  nextRecurringDueNotice: string;
  // Pomodoro & Focus Timer Keys
  pomodoroNavTitle: string;
  pomodoroModalTitle: string;
  pomodoroModalSubtitle: string;
  pomodoroFocusMode: string;
  pomodoroShortBreak: string;
  pomodoroLongBreak: string;
  pomodoroStopwatch: string;
  pomodoroStart: string;
  pomodoroPause: string;
  pomodoroResume: string;
  pomodoroReset: string;
  pomodoroSkip: string;
  pomodoroTargetLabel: string;
  pomodoroNoTarget: string;
  pomodoroHabitsGroup: string;
  pomodoroTasksGroup: string;
  pomodoroManualLogTitle: string;
  pomodoroManualLogDesc: string;
  pomodoroLogMinutesBtn: string;
  pomodoroQuickAddMinutes: string;
  pomodoroCustomMinutes: string;
  pomodoroLoggedSuccess: string;
  pomodoroSessionCompleted: string;
  pomodoroSessionCompletedDesc: string;
  pomodoroTodayTotalFocus: string;
  pomodoroTotalFocusAllTime: string;
  pomodoroSessionsCount: string;
  pomodoroMinutesLabel: string;
  pomodoroCoinsEarned: string;
  pomodoroXpEarned: string;
  pomodoroMarkHabitDonePrompt: string;
  pomodoroMarkTaskDonePrompt: string;
  pomodoroAmbientSoundLabel: string;
  pomodoroSoundNone: string;
  pomodoroSoundWhiteNoise: string;
  pomodoroSoundRain: string;
  pomodoroSoundTick: string;
  pomodoroSoundLofi: string;
  pomodoroHistoryTitle: string;
  pomodoroNoSessionsYet: string;
  pomodoroFloatingTimerTip: string;
  pomodoroQuickTimerBtn: string;
  pomodoroHabitFocusBadge: string;
  pomodoroTaskFocusBadge: string;
  pomodoroPreset15: string;
  pomodoroPreset25: string;
  pomodoroPreset45: string;
  pomodoroPreset60: string;
  pomodoroAdd5Min: string;
  pomodoroSub5Min: string;
  pomodoroClearHistory: string;
  pomodoroSettingsTitle?: string;
  pomodoroRewardCoinsLabel?: string;
  pomodoroRewardCoinsDesc?: string;
  pomodoroRewardXpLabel?: string;
  pomodoroRewardXpDesc?: string;
  pomodoroMin25MinNotice?: string;
  pomodoroEarlyFinishNotice?: string;
  pomodoroFullscreenMode?: string;
  pomodoroExitFullscreen?: string;
  pomodoroZenFocus?: string;
  pomodoroDetailedMode?: string;
  pomodoroScreenKeepOn?: string;
  pomodoroScreenKeepOnActive?: string;
  pomodoroScreenKeepOnDisabled?: string;
  pomodoroScreenKeepOnUnsupported?: string;
  pomodoroAutoBreakNotice?: string;
  pomodoroAutoBreakBtn?: string;
  pomodoroTabControls?: string;
  pomodoroTabAnalytics?: string;
  pomodoroTargetCardTitle?: string;
  pomodoroSoundCardTitle?: string;
  pomodoroQuickLogCardTitle?: string;
  pomodoroAutomationSettings?: string;
  stopwatchRewardCoinsLabel?: string;
  stopwatchRewardCoinsDesc?: string;
  stopwatchRewardXpLabel?: string;
  stopwatchRewardXpDesc?: string;
  pomodoroFinishStopwatch?: string;
  pomodoroFinishStopwatchDesc?: string;
  pomodoroSkipSessionNotice?: string;
  pomodoroResetNoSaveTooltip?: string;
  pomodoroIntegerRewardNotice?: string;
}

export const translations: Record<Language, TranslationDict> = {
  fa: {
    dir: 'rtl',
    appTitle: 'ردیاب علمی عادات روزانه',
    appSubtitle: 'بر اساس مدل رشد مجانبی و خودکارسازی عصبی عادات (Lally et al., 2010)',
    scientificModelBadge: 'مدل Lally 2010',
    todayLabel: 'امروز',
    themeToggle: 'تغییر تم',
    scientificFormulaBtn: 'فرمول علمی',
    settingsBtn: 'تنظیمات و هوش مصنوعی',
    newHabitBtn: 'عادت جدید',
    quickAddTitle: 'عادت جدید',
    customizationMore: 'شخصی‌سازی بیشتر',
    habitInputLabel: 'نام عادت را وارد کنید',
    habitInputPlaceholder: 'مثلاً: ۳۰ دقیقه مطالعه، ورزش صبحگاهی...',
    addToHabitsBtn: 'افزودن به لیست',
    scientificGuideTitle: 'راهنمای علمی',
    advancedSimulator: 'شبیه‌ساز پیشرفته',
    scientificExplanation:
      'طبق تحقیق دکتر لالی (۲۰۱۰)، شکل‌گیری عادت خطی نیست بلکه یک منحنی نمایی مجانبی است. ۶۶ روز میانگین زمان لازم برای خودکار شدن است. غیبت یک‌روزه ایرادی ندارد، اما غیبت‌های متوالی روند خودکارشدگی را معکوس می‌کند.',
    todaySummaryTitle: 'خلاصه وضعیت امروز',
    todayProgress: 'پیشرفت امروز',
    recordedPercentage: 'ثبت شده',
    avgAutomaticity: 'میانگین خودکارشدگی',
    allActiveHabits: 'کل عادات فعال',
    searchPlaceholder: 'جستجوی عادت...',
    filterAll: 'همه',
    filterPending: 'انجام‌نشده امروز',
    filterCompleted: 'تکمیل‌شده‌های امروز',
    allDoneTodayTitle: '🎉 تمام عادات امروز انجام شدند!',
    allDoneTodayDesc: 'عالی بود! تمام عادات فعال شما برای امروز تیک خوردند و طبق تنظیمات از صفحه اصلی پنهان شدند.',
    viewCompletedHabitsBtn: 'مشاهده عادات تکمیل‌شده',
    statsBtn: 'آمار و ارقام',
    achievementsBtn: 'دستاوردها و نشان‌ها',
    achievementsModalTitle: 'تالار دستاوردها و نشان‌های عصبی',
    achievementsModalSubtitle: 'پاداش‌های رفتاری و نقاط عطف عصب‌شناختی بر پایه مدل ۶۶ روزه دکتر لالی',
    achievementsSidebarCardTitle: 'دستاوردها و سطح ذهن',
    viewAllAchievements: 'مشاهده همه دستاوردها',
    statsModalTitle: 'داشبورد جامع آمار و پیشرفت عادات',
    statsModalSubtitle: 'تحلیل دقیق شاخص‌های خودکارشدگی عصبی، زنجیره‌ها و روزهای ثبت‌شده بر اساس مدل دکتر لالی',
    statsTotalHabits: 'کل عادات تعریف‌شده',
    statsTodayRate: 'نرخ تکمیل امروز',
    statsAvgAuto: 'میانگین خودکارشدگی',
    statsTotalCompletions: 'مجموع تکرارهای انجام‌شده',
    statsTopStreak: 'بیشترین زنجیره پیاپی',
    statsStageDistribution: 'توزیع مراحل عصبی عادات',
    statsHabitDetailsTitle: 'آمار تفکیکی و مقایسه‌ای هر عادت',
    statsColHabit: 'عادت و دسته‌بندی',
    statsColToday: 'وضعیت امروز',
    statsColAuto: 'ضریب خودکارشدگی',
    statsColStreak: 'زنجیره فعلی',
    statsColLongestStreak: 'رکورد زنجیره',
    statsColCompletedDays: 'روزهای انجام‌شده',
    statsColRemaining: 'روز تا ۶۶ روز',
    statsSendToTelegram: 'ارسال این آمار و گزارش به تلگرام',
    statsViewAiReport: 'تحلیل تخصصی هوش مصنوعی',
    tabOverview: 'نمای کلی و شاخص‌ها',
    tabHabitsMatrix: 'ماتریس تفکیکی عادات',
    tabIndividual: 'آمار تفکیکی هر عادت',
    tabRecurringTasks: 'تسک‌های تکرارشونده',
    tabYearlyMatrix: 'ماتریس سالانه عادات',
    tabGrowthCurve: 'منحنی عصبی ۶۶ روزه',
    recurringTasksStatsTitle: 'آمار و ارزیابی تسک‌های تکرارشونده',
    recurringTasksStatsSubtitle: 'تحلیل استریک، تعداد چرخه‌های انجام‌شده، زمان‌بندی سررسیدها و بهره‌وری هر تسک دوره‌ای',
    yearlyMatrixTitle: 'ماتریس سالانه فعالیت و پیوستگی عادات',
    yearlyMatrixSubtitle: 'نمایش تقویمی ۵۲ هفته و ۳۶۵ روز عملکرد، زنجیره‌ها و چگالی انجام هر عادت',
    allHabitsCombined: 'تجمیعی تمام عادات',
    yearlyCompletions: 'تکرارهای سالانه',
    yearlyConsistency: 'نرخ ثبات سالانه',
    bestYearlyStreak: 'طولانی‌ترین زنجیره سال',
    mostActiveMonth: 'پربازده‌ترین ماه',
    bestWeekday: 'بهترین روز هفته',
    monthBreakdownTitle: 'تفکیک ماهانه عملکرد در طول سال',
    less: 'کمتر',
    more: 'بیشتر',
    statsSortBy: 'مرتب‌سازی:',
    sortHighestAuto: 'بیشترین خودکارشدگی',
    sortHighestStreak: 'طولانی‌ترین زنجیره',
    sortPendingFirst: 'نیاز به انجام امروز',
    sortMostCompletions: 'بیشترین روزهای ثبت‌شده',
    statsCopySummary: 'کپی خلاصه آمار',
    statsCopied: 'کپی شد!',
    growthCurveDesc: 'مقایسه جایگاه عادات فعال شما در مسیر تکامل سیناپسی ۶۶ روزه (مدل لالی ۲۰۱۰)',
    milestone21Title: 'روز ۲۱: شکل‌گیری مسیر اولیه سیناپسی',
    milestone45Title: 'روز ۴۵: تثبیت مدار و کاهش مقاومت روانی',
    milestone66Title: 'روز ۶۶: اوج خودکارسازی و رفتار ناخودآگاه 🏆',
    noHabitsYet: 'هنوز هیچ عادتی تعریف نکرده‌اید',
    noHabitsFiltered: 'عادتی با این فیلتر یافت نشد',
    noHabitsSubtext: 'از فرم کناری برای ثبت نام عادت استفاده کنید یا لیست فیلتر را تغییر دهید.',
    createWithDetails: 'ایجاد با جزئیات کامل',
    backupBtn: 'پشتیبان‌گیری',
    resetDefaultsBtn: 'بازنشانی اولیه',
    resetConfirm: 'آیا از بازگردانی عادات به نمونه‌های اولیه اطمینان دارید؟',
    startFromDaysAgo: 'شروع از {n} روز پیش',
    consecutiveStreak: '{n} روز پیاپی',
    automaticityRate: '٪{n}',
    remainingDaysToGoal: '{n} روز باقیمانده تا خودکار شدن',
    goalAchieved: 'هدف نهایی محقق شد 🏆',
    doneToday: 'امروز انجام شد',
    markDoneToday: 'ثبت انجام برای امروز',
    history7Days: 'ماتریس ۷ روزه:',
    matrix7Days: 'ماتریس ۷ روزه',
    weeklyMatrix: 'ماتریس هفتگی',
    saturdayToFriday: 'شنبه تا جمعه',
    pendingToday: 'در انتظار ثبت امروز',
    upcomingDay: 'روز آینده',
    daysDoneCount7: '{n} از ۷ روز',
    completed: 'انجام شده',
    notCompleted: 'انجام نشده',
    deleteHabit: 'حذف عادت',
    deleteConfirmTitle: 'حذف عادت',
    deleteConfirmWarning: 'این عملیات قابل بازگشت نخواهد بود',
    currentAutomaticity: 'خودکارشدگی فعلی:',
    recordedDaysCount: 'روزهای ثبت‌شده:',
    deletePromptText: 'آیا از حذف کامل این عادت و تمامی سوابق روزانه ثبت‌شده برای آن اطمینان دارید؟',
    deleteTaskConfirmTitle: 'حذف تسک و برنامه کاری',
    deleteTaskConfirmWarning: 'این عملیات تسک و تمامی زیرتسک‌های آن را حذف می‌کند و قابل بازگشت نیست',
    deleteTaskPromptText: 'آیا از حذف کامل این تسک از فهرست کارهای خود اطمینان دارید؟',
    cancel: 'انصراف',
    yesDelete: 'بله، حذف شود',
    deleteShortConfirm: 'حذف؟',
    yes: 'بله',
    createHabitTitle: 'ایجاد عادت جدید',
    createHabitSubtitle: 'عادت جدید خود را تعریف و روند علمی آن را آغاز کنید',
    quickPresetsLabel: 'انتخاب سریع از عادت‌های متداول و مفید:',
    habitTitleLabel: 'عنوان عادت',
    habitTitlePlaceholder: 'مثال: مطالعه روزانه ۲۰ دقیقه، نرمش صبحگاهی...',
    habitTitleError: 'لطفاً عنوان عادت را وارد کنید',
    categoryLabel: 'دسته‌بندی (اختیاری)',
    categoryPlaceholder: 'مثال: ورزش، مطالعه، سلامت، تمرکز...',
    iconLabel: 'آیکون',
    customColorLabel: 'رنگ اختصاصی',
    rewardCoinsLabel: 'مقدار سکه پاداش (۱ تا ۱۰)',
    rewardCoinsSubtext: 'سکه دریافتی برای هر بار تیک زدن (قابل استفاده در فروشگاه وب‌رمان‌ها)',
    rewardXpLabel: 'مقدار امتیاز تجربه (۱ تا ۵ XP)',
    rewardXpSubtext: 'امتیاز XP دریافتی برای ارتقای سطح مغز و پیشرفت در نوروپلاستی',
    scientificNote: '💡 بر اساس تحقیق Lally (2010)، شکل‌گیری عادت با سرعت اولیه بالا شروع شده و به مرور تثبیت می‌گردد (میانگین ۶۶ روز موثر).',
    submitAndStart: 'ثبت و شروع عادت',
    scienceModalTitle: 'منطق علمی و ریاضی شکل‌گیری عادات (Lally et al., 2010)',
    scienceModalSubtitle: 'بر اساس پژوهش منتشر شده در European Journal of Social Psychology',
    automaticityFormulaTitle: 'فرمول درصد خودکارشدگی عادت (Automaticity Score):',
    tEffectiveDays: 't: تعداد روزهای موثر انجام عادت (با محاسبه غیبت‌های متوالی).',
    sixtySixDaysMean: '۶۶: میانگین زمان رسیدن به خودکارسازی کامل بر اساس تحقیق لالی (بازه ۱۸ تا ۲۵۴ روز).',
    simulatorTitle: 'شبیه‌ساز پیشرفت روزهای موثر (t):',
    effectiveDaysSlider: '{n} روز موثر',
    resultingScore: 'امتیاز خودکارشدگی حاصل:',
    stageLabel: 'مرحله:',
    findingsTitle: 'قوانین اصلاحی و اصول کشف شده در پژوهش:',
    oneDayGraceTitle: 'قانون بخشش ۱ روز غیبت:',
    oneDayGraceDesc: 'طبق یافته‌های لالی، جا انداختن تنها یک روز در میان روزهای متوالی انجام، تاثیری در افت شکل‌گیری عادت ندارد و امتیاز t شما کسر نمی‌شود.',
    twoDayPenaltyTitle: 'افت در ۲ روز غیبت متوالی یا بیشتر:',
    twoDayPenaltyDesc: 'اگر ۲ روز متوالی یا بیشتر عادت جا بیفتد، برای شبیه‌سازی افت مهارت عصبی، به ازای هر روز غیبت اضافه ۱ امتیاز از t موثر کسر می‌گردد.',
    asymptoticCurveTitle: 'منحنی نمایی-مجانبی (Asymptotic):',
    asymptoticCurveDesc: 'رشد عادت خطی نیست؛ در روزهای ابتدایی مغز به سرعت ارتباطات سیناپسی جدید می‌سازد و سپس به سمت تثبیت و کمال پیش می‌رود.',
    understoodBtn: 'متوجه شدم',
    stageForming: 'در حال شکل‌گیری',
    stageSemi: 'نیمه‌خودکار',
    stageAutomatic: 'کاملاً خودکار شده',
    settingsTitle: 'تنظیمات و دستیار هوش مصنوعی',
    settingsSubtitle: 'تنظیم زبان، تم و ربات تلگرام برای ارسال روزانه گزارش تحلیلی عادات',
    languageSection: 'زبان برنامه (Language)',
    themeSection: 'تم و ظاهر (Theme)',
    themeLight: 'روشن (Light)',
    themeDark: 'تاریک (Dark)',
    telegramSection: 'اتصال ربات تلگرام و گزارش روزانه با AI',
    telegramDescription: 'ربات تلگرام شما به همراه هوش مصنوعی، روزانه پیشرفت عادات شما را تحلیل کرده، نقد و بررسی سازنده، پیشنهادات علمی و جمله انگیزشی اختصاصی به چت شما ارسال می‌کند.',
    botTokenLabel: 'توکن ربات تلگرام (Bot Token)',
    botTokenPlaceholder: 'مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    chatIdLabel: 'شناسه چت یا کاربر (Chat ID)',
    chatIdPlaceholder: 'مثال: 123456789 یا @username',
    howToGetTelegram: 'راهنمای دریافت توکن و چت‌آیدی',
    telegramGuideText: '۱. به ربات @BotFather در تلگرام پیام داده و دستور /newbot را ارسال کنید تا توکن ربات دریافت شود.\n۲. به ربات خود پیام /start بفرستید.\n۳. برای دریافت Chat ID خود به ربات @userinfobot پیام دهید.',
    autoDailyReportToggle: 'فعال‌سازی ارسال خودکار گزارش روزانه',
    reportTimeLabel: 'زمان ارسال گزارش',
    testTelegramBtn: 'آزمایش اتصال تلگرام',
    testingTelegram: 'در حال ارسال تست...',
    sendAiReportNowBtn: 'تولید و ارسال گزارش هوش مصنوعی به تلگرام',
    generatingAiReport: 'در حال پردازش هوش مصنوعی...',
    saveSettingsBtn: 'ذخیره تنظیمات',
    settingsSaved: 'تنظیمات با موفقیت ذخیره شد.',
    aiReportModalTitle: 'گزارش تحلیلی هوش مصنوعی برای عادات شما',
    aiReportModalSubtitle: 'تحلیل رفتار عصبی، نقد سازنده، راهکارهای علمی و جمله انگیزشی',
    generalCritiqueTitle: 'تحلیل جامع و نقد رفتاری هوش مصنوعی:',
    actionableTipsTitle: 'پیشنهادها و تکنیک‌های علمی برای تثبیت عادات:',
    motivationalQuoteTitle: 'جمله انگیزشی و الهام‌بخش روز:',
    sendToTelegramSuccess: 'گزارش هوش مصنوعی با موفقیت به تلگرام شما ارسال شد!',
    sendToTelegramFailed: 'خطا در ارسال به تلگرام',
    copyReportBtn: 'کپی متن گزارش',
    reportCopied: 'متن گزارش کپی شد!',
    viewAiReport: 'مشاهده گزارش هوش مصنوعی',
    close: 'بستن',
    // Backup & Restore
    backupSection: 'پشتیبان‌گیری و بازیابی داده‌های کاربر',
    backupDescription: 'دانلود و بازیابی اختصاصی داده‌های شخصی کاربر (عادات، تاریخچه‌ها، تم و ظاهر، کیف پول و تنظیمات - بدون فایل‌های سنگین رمان‌های فروشگاه).',
    userBackupBadge: 'پشتیبان اختصاصی کاربر',
    userBackupIncludesTitle: 'این فایل پشتیبان شامل داده‌های شخصی زیر است:',
    userBackupExcludesShopNotice: '💡 فایل‌ها و فصول رمان‌های فروشگاه در این نسخه مستثنی هستند تا حجم فایل سبک و سریع باشد (پشتیبان ۱۰۰٪ کامل تمام فایل‌ها در تب «تنظیمات پیشرفته» قرار دارد).',
    downloadBackupBtn: 'دانلود پشتیبان کاربر (JSON)',
    uploadBackupBtn: 'بارگذاری و بازیابی فایل',
    uploadDragDropText: 'فایل پشتیبان JSON را اینجا رها کنید یا کلیک کنید',
    uploadSubtext: 'پشتیبانی از انواع فایل‌های پشتیبان کاربر و جامع',
    restoreSuccess: 'اطلاعات با موفقیت از فایل پشتیبان بازیابی شد!',
    restoreError: 'فایل پشتیبان نامعتبر است یا ساختار داده‌های آن اشتباه است.',
    restoreConfirm: 'آیا اطمینان دارید؟ با بازیابی این فایل، عادات و تاریخچه فعلی با محتوای این نسخه جایگزین می‌شوند.',
    autoBackupTelegramSection: 'ارسال خودکار فایل پشتیبان کاربر به تلگرام',
    autoBackupToggle: 'فعال‌سازی ارسال خودکار نسخه پشتیبان به تلگرام',
    backupIntervalLabel: 'بازه زمانی ارسال پشتیبان',
    intervalDaily: 'روزانه (Daily)',
    intervalEvery3Days: 'هر ۳ روز یک‌بار',
    intervalWeekly: 'هفتگی (Weekly)',
    intervalMonthly: 'ماهانه (Monthly)',
    backupTimeLabel: 'زمان ارسال پشتیبان',
    dedicatedBackupBotTitle: 'پیکربندی ربات اختصاصی تلگرام برای پشتیبان‌گیری',
    dedicatedBackupBotDesc: 'می‌توانید یک ربات و چت جداگانه منحصراً برای ذخیره و نگهداری فایل‌های پشتیبان تعریف کنید تا با ربات گزارش‌ها و چت‌های هوش مصنوعی تداخل نداشته باشد.',
    useDedicatedBotToggle: 'استفاده از ربات تلگرام اختصاصی برای پشتیبان‌گیری',
    useMainBotOption: 'استفاده از ربات اصلی برنامه (مشترک با گزارش‌ها)',
    backupBotTokenLabel: 'توکن ربات پشتیبان‌گیری (Backup Bot Token)',
    backupBotTokenPlaceholder: 'مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    backupChatIdLabel: 'شناسه چت یا کانال پشتیبان (Backup Chat ID / Channel ID)',
    backupChatIdPlaceholder: 'مثال: 123456789 یا -1001234567890',
    testBackupBotBtn: 'تست اتصال ربات پشتیبان',
    testBackupBotSuccess: 'اتصال ربات پشتیبان با موفقیت برقرار شد!',
    testBackupBotFailed: 'خطا در برقراری اتصال با ربات پشتیبان',
    scheduledBackupScheduleTitle: 'زمان‌بندی و تناوب ارسال خودکار',
    backupDayOfWeekLabel: 'روز هفته جهت ارسال هفتگی',
    backupDayOfMonthLabel: 'روز ماه جهت ارسال ماهانه',
    backupFormatLabel: 'فرمت و امنیت فایل ارسالی',
    backupFormatStandard: 'فایل JSON استاندارد کامل',
    backupFormatEncrypted: 'فایل JSON رمزگذاری‌شده (AES-256)',
    backupFormatSanitized: 'فایل JSON پاکسازی‌شده (بدون کلیدهای API)',
    backupEncryptionPassPlaceholder: 'رمز عبور جهت قفل‌گذاری نسخه ارسالی...',
    nextScheduledRunLabel: 'زمان ارسال بعدی برنامه‌ریزی‌شده:',
    backupStatusLabel: 'وضعیت سیستم خودکار:',
    statusActiveScheduled: 'فعال و در حال نظارت زمان‌بندی',
    statusDisabled: 'غیرفعال',
    totalAutoBackupsLabel: 'مجموع بکاپ‌های خودکار ارسالی:',
    sendBackupNowBtn: 'ارسال پشتیبان کاربر به تلگرام',
    sendingBackup: 'در حال ارسال فایل پشتیبان...',
    backupSentSuccess: 'فایل پشتیبان کاربر با موفقیت به تلگرام شما ارسال شد!',
    backupSentFailed: 'خطا در ارسال فایل پشتیبان به تلگرام',
    totalHabitsCount: 'تعداد کل عادات کاربر:',
    exportSummary: 'حاوی تمامی سوابق روزانه، تاریخچه‌های تکمیل، تم و امتیازات مدل لالی',
    lastBackupSentLabel: 'آخرین زمان ارسال:',
    neverSent: 'هنوز ارسال نشده',
    copyBackupJsonBtn: 'کپی JSON اطلاعات کاربر',
    backupCopiedSuccess: 'اطلاعات پشتیبان کاربر در حافظه کپی شد!',
    fullBackupIncludedTitle: 'این نسخه پشتیبان شامل اطلاعات زیر است:',
    fullBackupHabitsIncluded: 'تمام عادات، تاریخچه کامل روزانه، یادداشت‌ها و رنگ‌ها',
    fullBackupSettingsIncluded: 'تنظیمات زبان، تم روز/شب، کیف پول و گزینه‌های ظاهری',
    fullBackupTelegramIncluded: 'پیکربندی ربات تلگرام، زمان‌بندی یادآورها و گزارش‌ها',
    fullBackupStatsIncluded: 'سطح پیشرفت مغز، امتیازات XP و دستاوردها',
    restorePreviewTitle: 'پیش‌نمایش محتوای فایل پشتیبان:',
    restoredHabitsCountLabel: 'تعداد عادات:',
    restoredCheckInsCountLabel: 'تعداد کل ثبت‌ها:',
    restoredSettingsLabel: 'تنظیمات تم، زبان و اتصال تلگرام نیز بازیابی خواهند شد.',
    restoredNovelsLabel: 'رمان‌های فروشگاه:',
    // Interactive Telegram Bot
    telegramInteractiveSection: 'درخواست مستقیم گزارش و آمار از ربات تلگرام',
    telegramInteractiveDesc: 'شما می‌توانید در هر لحظه، مستقیماً از داخل تلگرام با ارسال دستورات یا کلیک روی دکمه‌های ربات، گزارش تحلیلی هوش مصنوعی، آمار تفکیکی هر عادت، افزودن یا حذف عادات را انجام دهید.',
    botCommandsTitle: 'دستورات فعال در ربات تلگرام:',
    cmdReportDesc: 'تولید و ارسال آنی گزارش جامع هوش مصنوعی و مدل لالی',
    cmdStatsDesc: 'مشاهده خلاصه آمار، درصد خودکارشدگی و زنجیره‌ها',
    cmdTodayDesc: 'چک‌لیست، وضعیت و ثبت انجام عادات امروز',
    cmdHabitsDesc: 'مشاهده لیست کامل و آمار تفکیکی تک‌تک عادات',
    cmdAddDesc: 'افزودن عادت جدید (مثال: /add ورزش روزانه)',
    cmdDeleteDesc: 'حذف تعاملی یک عادت از سیستم',
    cmdBackupDesc: 'دریافت فوری فایل پشتیبان داده‌ها (JSON)',
    cmdHelpDesc: 'نمایش راهنما و دکمه‌های سریع تعاملی',
    cmdTasksDesc: 'مشاهده و مدیریت تسک‌ها و وظایف',
    cmdAddTaskDesc: 'افزودن سریع تسک جدید (مثال: /addtask ارسال ایمیل)',
    cmdWalletDesc: 'موجودی سکه‌ها، تاریخچه و تراکنش‌های پاداش',
    cmdShopDesc: 'فروشگاه پاداش‌ها و آزادسازی وب‌رمان‌ها و فیلم‌ها',
    cmdAchievementsDesc: 'تالار افتخارات، نشان‌های عصبی و رتبه مغز',
    cmdAskDesc: 'پرسش و مشاوره از مربی هوش مصنوعی علوم اعصاب',
    cmdFocusDesc: 'راهنما و پروتکل‌های تمرکز عمیق و پومودورو',
    cmdModelDesc: 'تشریح مدل علمی ۶۶ روزه دکتر فیلیپا لالی',
    cmdTipsDesc: '۳ اصل طلایی عصب‌شناختی برای تثبیت عادات',
    setBotMenuBtn: 'تنظیم منوی رسمی دستورات در تلگرام',
    settingBotMenu: 'در حال ثبت منو در تلگرام...',
    botMenuSetSuccess: 'منوی دستورات با موفقیت در ربات تلگرام شما فعال شد!',
    botMenuSetFailed: 'خطا در فعال‌سازی منوی دستورات ربات',
    botStatusListening: 'ربات هوشمند فعال است و در تلگرام به پیام‌ها و دستورات شما پاسخ می‌دهد 🟢',
    botStatusWaiting: 'برای فعال‌سازی شنود خودکار، توکن و شناسه چت را تنظیم کنید 🟡',
    botPersonaTitle: 'لحن و شخصیت مربی هوش مصنوعی در ربات تلگرام',
    botPersonaDesc: 'انتخاب سبک پاسخ‌دهی و زاویه تحلیل رفتارها توسط دستیار هوش مصنوعی و مربی اختصاصی شما در تلگرام.',
    personaAcademic: '🔬 آکادمیک و نوروساینس',
    personaAcademicDesc: 'تحلیل عمیق بر مبنای مقالات نوروبیولوژی، لوب پیش‌پیشانی و مدل لالی',
    personaCoach: '🔥 مربی پرانرژی و انگیزشی',
    personaCoachDesc: 'حمایت‌گر، پرانرژی، تقویت‌کننده اعتماد به نفس و انگیزه روزانه',
    personaStrict: '⚡ سخت‌گیر و رک‌گو (قاطع)',
    personaStrictDesc: 'بدون توجیه و تعارف، هشداردهنده نسبت به تنبلی و عقب افتادن کارها',
    personaZen: '🌿 رواقی و ذهن‌آگاه (Zen)',
    personaZenDesc: 'آرامش‌بخش، تمرکز بر ثبات روانی، دوری از کمال‌گرایی منفی و تمرکز',
    notifyOnTaskCompletionTitle: 'اعلان‌های فوری و همگام‌سازی لحظه‌ای با تلگرام',
    notifyOnTaskCompletionLabel: 'ارسال پیام آنی هنگام انجام تسک‌ها در وب',
    notifyOnTaskCompletionDesc: 'در صورت تیک زدن تسک در سایت، پیام تبریک و دریافت سکه بلافاصله به تلگرام فرستاده می‌شود.',
    notifyOnHabitCheckTitle: 'اعلان ثبت آنی عادت روزانه',
    notifyOnHabitCheckLabel: 'ارسال نوتیفیکیشن هنگام ثبت عادت در وب',
    notifyOnHabitCheckDesc: 'ارسال وضعیت لحظه‌ای رشد خودکارشدگی به تلگرام بلافاصله پس از ثبت عادت.',
    sendInstantNotificationTestBtn: 'آزمایش ارسال پیام و اعلان فوری به تلگرام',
    instantNotificationSentSuccess: 'پیام اعلان فوری و همگام‌سازی لحظه‌ای با موفقیت به تلگرام ارسال شد!',
    // Pomodoro & Deep Work in Telegram & AI
    pomodoroTelegramSectionTitle: '🍅 مدیریت پومودورو، کار عمیق و تمرکز هوشمند در تلگرام و AI',
    pomodoroTelegramSectionDesc: 'امکان شروع تایمر، دریافت هشدارهای پایان جلسات تمرکز، ثبت خودکار پاداش‌ها و دریافت مشاوره نوروساینس تمرکز از هوش مصنوعی در محیط تلگرام.',
    notifyOnPomodoroCompletionLabel: 'ارسال خودکار اعلان پایان پومودورو به تلگرام',
    notifyOnPomodoroCompletionDesc: 'پس از اتمام هر تایمر تمرکز در سایت، پیام تبریک، مدت زمان، واریز +۵ سکه و +۲۰ XP به تلگرام فرستاده می‌شود.',
    enableTelegramPomodoroControlLabel: 'دسترسی به تایمرها و دستورات پومودورو در ربات تلگرام',
    enableTelegramPomodoroControlDesc: 'امکان شروع جلسات ۲۵ و ۵۰ دقیقه‌ای مستقیم از تلگرام با هشدار پایان خودکار و دکمه‌های شیشه‌ای تعاملی.',
    sendPomodoroTestBtn: 'آزمایش ارسال اعلان پومودورو به تلگرام',
    pomodoroNotificationSentSuccess: 'اعلان آزمایشی پایان پومودورو با موفقیت به تلگرام ارسال شد!',
    pomodoroAiCoachTitle: 'مربی هوش مصنوعی تمرکز عمیق (AI Focus Coach)',
    pomodoroAiCoachDesc: 'ارائه تکنیک‌های غلبه بر حواس‌پرتی، ورود به حالت غرقی (Flow State) و تنظیم بهینه دوپامین توسط مربی هوش مصنوعی.',
    quietHoursTitle: 'ساعات استراحت و سکوت شبانه (Quiet Hours)',
    quietHoursDesc: 'در بازه زمانی تعیین‌شده در شب، هیچ یادآور یا پیام خودکاری ارسال نمی‌شود تا خواب شما مختل نگردد.',
    enableQuietHoursToggle: 'فعال‌سازی ساعات سکوت شبانه',
    quietHoursStartLabel: 'آغاز سکوت:',
    quietHoursEndLabel: 'پایان سکوت:',
    openInTelegramBtn: 'ورود مستقیم به ربات در تلگرام',
    botConnectionLiveStatus: 'وضعیت اتصال برخط سرور و ربات:',
    botLatencyLabel: 'تأخیر پاسخ (پینگ):',
    botUsernameLabel: 'نام کاربری ربات:',
    // Smart Reminders & Strict Accountability
    remindersSection: 'یادآورهای روزانه کارهای انجام‌نشده (Daily Reminders)',
    remindersDesc: 'تنظیم ساعت‌های مشخص در طول روز برای ارسال پیام‌های خلاصه و جمع‌وجور به تلگرام؛ فقط شامل لیست کارهای باقی‌مانده و میزان کارهای انجام‌شده امروز بدون نصیحت و حاشیه، همراه با دکمه‌های شیشه‌ای ثبت سریع.',
    enableRemindersToggle: 'فعال‌سازی ارسال یادآورهای دوره‌ای به تلگرام',
    reminderTimesLabel: 'ساعت‌های ارسال یادآور در روز:',
    addReminderTimeBtn: 'افزودن ساعت جدید',
    removeTimeBtn: 'حذف',
    strictWarningSection: 'هشدار نهایی کارهای انجام‌نشده (Nightly Final Warning)',
    strictWarningDesc: 'تعیین ساعت پایانی روز (ضرب‌الاجل). در صورتی که کارهای امروز انجام نشده باشند، یک هشدار چندجمله‌ای قاطع همراه با فقط فهرست کارهای باقی‌مانده و بدون هیچ پیام اضافی به تلگرام ارسال می‌شود.',
    enableStrictWarningToggle: 'فعال‌سازی هشدار نهایی شبانه کارهای انجام‌نشده',
    strictWarningTimeLabel: 'ساعت ارسال هشدار نهایی شبانه:',
    sendReminderTestBtn: 'آزمایش ارسال یادآور فوری',
    sendStrictWarningTestBtn: 'آزمایش ارسال هشدار نهایی کارهای انجام‌نشده',
    reminderSentSuccess: 'پیام یادآور خلاصه کارهای امروز با موفقیت به تلگرام ارسال شد!',
    strictWarningSentSuccess: 'پیام هشدار نهایی کارهای انجام‌نشده به تلگرام ارسال شد!',
    // Visual Chart Infographics
    visualChartSectionTitle: 'ماتریس و اینفوگرافیک تصویری مجزای هر عادت (Habit Matrix Charts)',
    visualChartSectionDesc: 'ارسال تصویر اختصاصی ماتریس فعالیت و تقویم ۱۴ روزه برای هر عادت به صورت جداگانه، شامل درصد پیشرفت، روزهای تخمینی مانده تا ۶۶ روز و تاریخ تکمیل.',
    sendVisualChartsToggle: 'ارسال تصویر ماتریس و پیشرفت هر عادت',
    sendVisualChartTestBtn: 'آزمایش ارسال تصاویر ماتریس عادات به تلگرام',
    visualChartSentSuccess: 'تصاویر ماتریس اختصاصی عادات با موفقیت به تلگرام ارسال شد!',
    cmdChartDesc: '📊 دریافت ماتریس تصویری و روزهای تخمینی تا ۶۶ روز برای هر عادت',
    // Advanced Settings
    advancedTabTitle: 'تنظیمات پیشرفته',
    advancedSettingsTitle: 'تنظیمات پیشرفته سامانه و رفتارها',
    advancedSettingsDesc: 'شخصی‌سازی بازخورد صوتی و لمسی، مدل علمی شکل‌گیری عادات، قوانین سخت‌گیرانه زنجیره و مدیریت حافظه محلی.',
    defaultTargetDaysLabel: 'روزهای هدف پیش‌فرض عادات جدید',
    defaultTargetDaysDesc: 'تعداد روزهای پیش‌فرض مبنا برای خودکارسازی عادات جدید (پیش‌فرض علمی مدل لالی: ۶۶ روز)',
    feedbackEffectsTitle: 'افکت‌ها و بازخوردهای حسی (صوتی، لرزشی و انیمیشن جشن)',
    feedbackEffectsDesc: 'تنظیم بازخوردهای چندحسی بلافاصله پس از انجام عادت جهت تقویت دوپامین عصبی و ایجاد حس رضایت در مغز.',
    soundEffectsLabel: 'افکت صوتی هنگام ثبت عادت (Sound Effects)',
    soundEffectsDesc: 'پخش صدای تایید ملایم و انگیزشی هنگام تیک زدن و ثبت هر عادت',
    soundFeedbackLabel: 'افکت صوتی هنگام تیک زدن عادت (Sound Effect)',
    soundFeedbackDesc: 'پخش صدای تایید ملایم و انگیزشی هنگام ثبت و تیک زدن هر عادت',
    hapticFeedbackLabel: 'بازخورد لرزشی و لمسی (Haptic Vibration)',
    hapticFeedbackDesc: 'ایجاد لرزش کوتاه و لمسی در گوشی‌های همراه و تبلت‌ها هنگام ثبت موفق عادت',
    confettiEffectsLabel: 'انیمیشن جشن و کانفتی تکمیل ۱۰۰٪ عادات روز',
    confettiEffectsDesc: 'نمایش افکت ستاره‌باران و پرتاب ذرات جشن هنگام تکمیل موفق تمام عادات فعال روز',
    confettiCelebrationLabel: 'انیمیشن جشن و کانفتی تکمیل ۱۰۰٪ روز',
    confettiCelebrationDesc: 'نمایش افکت ستاره‌باران و کانفتی هنگام تکمیل موفق تمام عادات فعال روز',
    strictStreakToggleLabel: 'حالت سخت‌گیرانه زنجیره ۱۰۰٪ (Zero-Tolerance)',
    strictStreakToggleDesc: 'در صورت از دست رفتن حتی ۱ عادت در یک روز، شمارنده زنجیره متوالی فوراً به صفر برمی‌گردد.',
    storageManagerTitle: 'وضعیت حافظه محلی و بهینه‌سازی کش (Storage & Cache)',
    serverStorageTitle: 'پایگاه داده پایدار سرور و مدیریت فایل‌های فروشگاه (Termux DB)',
    serverStorageDesc: 'ذخیره دائمی عادات، کیف پول و فایل‌های رسانه‌ای در حافظه دیسک سرور با قفل ضدحذف حتی در صورت ریستارت Termux یا بستن مرورگر.',
    persistentDbStatus: 'پایگاه داده پایدار سرور فعال و متصل',
    antiWipeStatus: 'قفل محافظت ضدحذف داده‌ها (Anti-Wipe Protected)',
    dbLocationLabel: 'مسیر دیتابیس:',
    fileStorageTitle: 'مدیریت و ذخیره‌سازی فایل‌های سیستم و پایگاه داده (File Storage)',
    fileStorageDesc: 'مدیریت دیتابیس پایدار، ذخیره‌سازی اسنپ‌شات‌های پشتیبان روی سرور، همگام‌سازی فوری دیسک و کنترل حافظه کش.',
    createSnapshotBtn: 'ایجاد اسنپ‌شات دستی در سرور',
    creatingSnapshot: 'در حال ایجاد اسنپ‌شات...',
    createSnapshotSuccess: 'اسنپ‌شات پشتیبان با موفقیت در دیسک سرور ثبت شد.',
    serverBackupsListTitle: 'فهرست نسخه‌های اسنپ‌شات در سرور (Server Snapshots)',
    restoreSnapshotBtn: 'بازیابی این نسخه',
    restoringSnapshot: 'در حال بازگردانی...',
    deleteSnapshotBtn: 'حذف',
    deleteSnapshotConfirm: 'آیا از حذف این فایل اسنپ‌شات از سرور اطمینان دارید؟',
    storeFilesSectionTitle: 'مدیریت و ذخیره‌سازی فایل‌های فروشگاه (Store Files & Media Storage)',
    storeFilesSectionDesc: 'ساختار پوشه‌های رسانه، ویدیوها، قسمت‌ها و کتاب‌های فروشگاه در دیسک سرور با قابلیت اسکن دایرکتوری و آپلود مستقیم.',
    scanVideosFolderBtn: 'اسکن فوری پوشه ویدیوها',
    scanningVideos: 'در حال اسکن دیسک...',
    scanVideosSuccess: 'اسکن پوشه ویدیوها با موفقیت انجام شد و آرشیو به‌روز گردید.',
    uploadZipBtn: 'آپلود فایل زیپ / قسمت‌ها',
    uploadingZip: 'در حال استخراج و پردازش زیپ...',
    termuxTransferGuideTitle: 'راهنمای انتقال مستقیم فایل در ترموکس / اندروید (بدون اینترنت)',
    termuxTransferGuideDesc: 'شما می‌توانید فایل‌های ویدیویی یا فصول رمان را مستقیماً از حافظه گوشی به پوشه store کپی کرده و دکمه «اسکن فوری» را بزنید.',
    cleanupOrphanFilesBtn: 'پاک‌سازی فایل‌های موقت و رهاشده',
    cleanupOrphanFilesDesc: 'بررسی فایل‌های ویدیویی و تصویری موجود در دیسک و حذف مواردی که در هیچ محصول، فیلم یا سریالی استفاده نشده‌اند.',
    storeFolderExplorerTitle: 'کاوشگر پوشه‌ها و فایل‌های فروشگاه (Store Explorer)',
    videoFilesCountLabel: 'تعداد کل فایل‌های ویدیویی:',
    novelsFilesCountLabel: 'تعداد کل فایل‌های رمان:',
    storeMediaFoldersTitle: 'ساختار پوشه‌های مجزای فروشگاه و فایل‌های ویدیویی (Store Architecture)',
    storeMediaFoldersDesc: 'فایل‌های رمان و ویدیوها در پوشه‌های کاملاً تفکیک‌شده در سرور نگهداری می‌شوند تا آماده توسعه آتی ویدیوها و فروش محصولات باشند.',
    videosFolderLabel: 'پوشه فایل‌های ویدیویی:',
    novelsFolderLabel: 'پوشه کتاب‌ها و رمان‌ها:',
    forceSaveDiskBtn: 'ذخیره و همگام‌سازی فوری دیتابیس با دیسک',
    forceSaveSuccess: 'پایگاه داده با موفقیت روی دیسک سرور ذخیره و اسنپ‌شات پشتیبان ثبت شد.',
    exportBackupBtn: 'دانلود نسخه پشتیبان کامل (Full Backup JSON)',
    importBackupBtn: 'بازیابی دیتابیس از فایل پشتیبان',
    importBackupSuccess: 'پایگاه داده با موفقیت از فایل پشتیبان بازگردانی شد.',
    storageUsedLabel: 'فضای مصرفی در حافظه محلی:',
    totalDataRecordsLabel: 'مجموع رکوردهای ثبت‌شده در دیتابیس محلی:',
    optimizeCacheBtn: 'بهینه‌سازی و فشرده‌سازی کش داده‌ها',
    cacheOptimizedSuccess: 'داده‌ها و کش محلی با موفقیت بازسازی و بهینه‌سازی شد!',
    systemDiagnosticsTitle: 'اطلاعات تشخیصی سامانه',
    scientificParamsTitle: 'پارامترهای محاسباتی مدل ریاضی Lally',
    scientificParamsDesc: 'تابع لجستیک غیرخطی: Automaticity = 100 / (1 + e^(-k * (t - t0))) با نرخ رشد نمایی',
    testSoundBtn: 'تست صدای تایید',
    testConfettiBtn: 'تست انیمیشن جشن',
    // Task Management
    tasksNavTitle: 'تسک‌ها و وظایف',
    habitsNavTitle: 'عادات ۶۶ روزه',
    dailyFocusNavTitle: 'نمای تلفیقی روز',
    tasksSectionTitle: 'مدیریت وظایف و تسک‌های روزانه',
    tasksSectionSubtitle: 'برنامه‌ریزی، اولویت‌بندی، چک‌لیست زیرتسک‌ها و دریافت پاداش با انجام هر تسک',
    createTaskTitle: 'ایجاد تسک جدید',
    createTaskSubtitle: 'تسک یا کار اجرایی جدید خود را با تعیین اولویت، موعد و زیرتسک‌ها ثبت کنید',
    editTaskTitle: 'ویرایش مشخصات تسک',
    taskTitleLabel: 'عنوان تسک یا کار',
    taskTitlePlaceholder: 'مثال: آماده‌سازی پروپوزال، خرید اقلام، تماس کاری...',
    taskTitleError: 'لطفاً عنوان تسک را وارد کنید',
    taskDescLabel: 'توضیحات و جزئیات (اختیاری)',
    taskDescPlaceholder: 'یادداشت‌ها، لینک‌ها یا توضیحات بیشتر در مورد نحوه انجام کار...',
    taskPriorityLabel: 'سطح اولویت',
    priorityHigh: 'فوری و مهم (بالا)',
    priorityMedium: 'متوسط و عادی',
    priorityLow: 'پایین و اختیاری',
    taskDueDateLabel: 'تاریخ موعد انجام',
    taskDueToday: 'امروز',
    taskDueTomorrow: 'فردا',
    taskDueNoDate: 'بدون موعد مشخص',
    taskCustomDate: 'انتخاب تاریخ دلخواه',
    taskDueTimeLabel: 'ساعت یا زمان موعد (اختیاری)',
    taskCategoryLabel: 'دسته‌بندی یا برچسب',
    taskCategoryPlaceholder: 'مثال: کاری، شخصی، پروژه، مطالعه...',
    taskSubtasksLabel: 'زیرتسک‌ها و چک‌لیست مراحل (Checklist)',
    addSubtaskBtn: 'افزودن مرحله / زیرتسک',
    subtaskPlaceholder: 'عنوان مرحله یا زیرتسک...',
    taskRewardCoinsLabel: 'پاداش سکه پس از انجام (۱ تا ۱۰)',
    taskRewardXpLabel: 'پاداش امتیاز تجربه (۱ تا ۵ XP)',
    submitCreateTask: 'ثبت و ایجاد تسک',
    submitSaveTask: 'ذخیره تغییرات تسک',
    filterTaskAll: 'همه تسک‌ها',
    filterTaskPending: 'در انتظار انجام',
    filterTaskCompleted: 'تکمیل‌شده‌ها',
    filterTaskHighPriority: 'اولویت بالا',
    filterTaskToday: 'موعد امروز',
    tasksDoneSummary: 'پیشرفت تسک‌ها',
    noTasksYet: 'هنوز هیچ تسکی ثبت نکرده‌اید',
    noTasksFiltered: 'تسکی با این فیلتر یافت نشد',
    noTasksSubtext: 'برای مدیریت بهتر کارهای روزانه و پروژه‌های خود، اولین تسک را ثبت کنید و با انجام آن سکه پاداش بگیرید.',
    quickAddTaskPlaceholder: 'افزودن سریع تسک جدید (Enter را بزنید)...',
    deleteTaskConfirm: 'آیا از حذف این تسک اطمینان دارید؟',
    taskCompletedCelebration: 'تسک با موفقیت انجام شد!',
    subtasksCompletedRatio: 'مراحل انجام‌شده:',
    taskDueIn2Days: 'پس‌فردا',
    taskDueNextWeek: 'هفته آینده (+۷ روز)',
    taskDueNextMonth: 'ماه آینده (+۳۰ روز)',
    taskDatePickerTitle: 'انتخاب دقیق تاریخ شمسی موعد',
    taskShamsiYear: 'سال',
    taskShamsiMonth: 'ماه',
    taskShamsiDay: 'روز',
    taskSelectedDatePreview: 'موعد تعیین‌شده:',
    recurringTaskToggle: 'تکرار خودکار و منظم (تسک تکرارشونده)',
    recurringTaskDesc: 'پس از انجام، به طور خودکار موعد بعدی محاسبه و تسک برای دوره بعد آماده می‌شود.',
    recurrenceFrequencyLabel: 'دوره تناوب تکرار',
    recurrenceDaily: 'روزانه (هر روز)',
    recurrenceWeekdays: 'روزهای کاری (شنبه تا چهارشنبه)',
    recurrenceWeekly: 'هفتگی (روزهای مشخص)',
    recurrenceMonthly: 'ماهانه (هر ماه)',
    recurrenceCustom: 'شخصی‌سازی بازه',
    recurrenceIntervalLabel: 'فاصله تکرار (هر چند واحد یک‌بار):',
    recurrenceDaysOfWeekLabel: 'روزهای هفته برای تکرار:',
    filterTaskRecurring: 'تکرارشونده‌ها',
    recurringTaskBadge: 'تکرارشونده',
    recurringCycleCount: 'دوره انجام‌شده',
    nextRecurringDueNotice: 'موعد تکرار بعدی:',
    // Pomodoro & Focus Timer (FA)
    pomodoroNavTitle: 'تایمر پومودورو',
    pomodoroModalTitle: 'ایستگاه تمرکز و تایمر پومودورو',
    pomodoroModalSubtitle: 'تکنیک استاندارد تمرکز عمیق، مدیریت بازه‌های زمانی و ثبت تایم برای عادات و تسک‌ها',
    pomodoroFocusMode: 'تمرکز عمیق',
    pomodoroShortBreak: 'استراحت کوتاه',
    pomodoroLongBreak: 'استراحت طولانی',
    pomodoroStopwatch: 'کرنومتر آزاد',
    pomodoroStart: 'شروع تمرکز',
    pomodoroPause: 'توقف موقت',
    pomodoroResume: 'ادامه',
    pomodoroReset: 'ریست زمان',
    pomodoroSkip: 'رفتن به بازه بعد',
    pomodoroTargetLabel: 'اتصال به عادت یا تسک:',
    pomodoroNoTarget: 'تمرکز آزاد (بدون اتصال)',
    pomodoroHabitsGroup: 'عادات روزانه',
    pomodoroTasksGroup: 'تسک‌ها و وظایف',
    pomodoroManualLogTitle: 'ثبت دستی زمان و تمرکز',
    pomodoroManualLogDesc: 'اگر بدون تایمر روی این مورد زمان صرف کرده‌اید، می‌توانید دقایق آن را دستی ثبت کنید:',
    pomodoroLogMinutesBtn: 'ثبت زمان',
    pomodoroQuickAddMinutes: 'افزودن سریع:',
    pomodoroCustomMinutes: 'دقایق دلخواه:',
    pomodoroLoggedSuccess: 'زمان با موفقیت ثبت شد!',
    pomodoroSessionCompleted: '🎉 آفرین! بازه تمرکز به پایان رسید',
    pomodoroSessionCompletedDesc: 'زمان ثبت و به پیشرفت شما اضافه شد.',
    pomodoroTodayTotalFocus: 'مجموع تمرکز امروز:',
    pomodoroTotalFocusAllTime: 'کل زمان تمرکز ثبت‌شده:',
    pomodoroSessionsCount: 'تعداد جلسات تکمیل‌شده:',
    pomodoroMinutesLabel: 'دقیقه',
    pomodoroCoinsEarned: 'سکه پاداش',
    pomodoroXpEarned: 'امتیاز تجربه XP',
    pomodoroMarkHabitDonePrompt: 'آیا مایلید این عادت را برای امروز علامت تیک (انجام شد) بزنید؟',
    pomodoroMarkTaskDonePrompt: 'آیا این تسک به پایان رسید و علامت تکمیل بخورد؟',
    pomodoroAmbientSoundLabel: 'صدای پس‌زمینه آرامش‌بخش (نویز محیطی):',
    pomodoroSoundNone: 'بدون صدا (خاموش)',
    pomodoroSoundWhiteNoise: 'نویز سفید ملایم (White Noise)',
    pomodoroSoundRain: 'باران ملایم و آرامش‌بخش (Rain)',
    pomodoroSoundTick: 'تیک‌تاک ساعت مکانیکی (Tick-Tock)',
    pomodoroSoundLofi: 'فرکانس آرامش لو‌فای (Lo-Fi Tone)',
    pomodoroHistoryTitle: 'تاریخچه جلسات تمرکز',
    pomodoroNoSessionsYet: 'هنوز هیچ جلسه تمرکزی ثبت نشده است.',
    pomodoroFloatingTimerTip: 'با بستن پنجره، تایمر در پایین صفحه فعال می‌ماند.',
    pomodoroQuickTimerBtn: 'پومودورو / ثبت زمان',
    pomodoroHabitFocusBadge: 'تمرکز',
    pomodoroTaskFocusBadge: 'تمرکز',
    pomodoroPreset15: '۱۵ دقیقه',
    pomodoroPreset25: '۲۵ دقیقه',
    pomodoroPreset45: '۴۵ دقیقه',
    pomodoroPreset60: '۶۰ دقیقه',
    pomodoroAdd5Min: '+۵ دقیقه',
    pomodoroSub5Min: '-۵ دقیقه',
    pomodoroClearHistory: 'پاکسازی تاریخچه',
    pomodoroSettingsTitle: 'پیکربندی زمان‌ها و پاداش‌های تمرکز پومودورو',
    pomodoroRewardCoinsLabel: 'سکه پاداش اتمام جلسه ۲۵ دقیقه‌ای',
    pomodoroRewardCoinsDesc: 'تعداد سکه‌هایی که کاربر پس از تکمیل موفقیت‌آمیز حداقل ۲۵ دقیقه تمرکز دریافت می‌کند.',
    pomodoroRewardXpLabel: 'امتیاز تجربه (XP) پاداش ۲۵ دقیقه',
    pomodoroRewardXpDesc: 'مقدار امتیاز تجربه (XP) که پس از اتمام حداقل ۲۵ دقیقه تمرکز به کاربر تعلق می‌گیرد.',
    pomodoroMin25MinNotice: 'قانون پاداش: سکه و XP پومودورو تنها زمانی پرداخت می‌شوند که کاربر حداقل ۲۵ دقیقه تمرکز را به پایان رسانده باشد. در صورت پایان زودهنگام قبل از ۲۵ دقیقه، فقط دقایق واقعی صرف‌شده ثبت شده و پاداشی اعطا نمی‌گردد.',
    pomodoroEarlyFinishNotice: 'جلسه قبل از ۲۵ دقیقه پایان یافت. زمان واقعی ثبت شد اما پاداش سکه و XP تعلق نگرفت.',
    pomodoroFullscreenMode: 'حالت تمام‌صفحه و غوطه‌وری',
    pomodoroExitFullscreen: 'خروج از تمام‌صفحه',
    pomodoroZenFocus: 'تمرکز مینیمال (بدون حواس‌پرتی)',
    pomodoroDetailedMode: 'نمایش جزئیات و تاریخچه',
    pomodoroScreenKeepOn: 'روشن ماندن صفحه',
    pomodoroScreenKeepOnActive: 'روشن ماندن صفحه فعال است (نمایشگر خاموش نمی‌شود)',
    pomodoroScreenKeepOnDisabled: 'روشن ماندن صفحه غیرفعال است (برای فعال‌سازی کلیک کنید)',
    pomodoroScreenKeepOnUnsupported: 'سیستم بیداری صفحه فعال شد (جلوگیری خودکار از به خواب رفتن نمایشگر)',
    pomodoroAutoBreakNotice: 'زمان تمرکز به پایان رسید! حالت استراحت به طور خودکار فعال و شمارش آغاز شد ☕',
    pomodoroAutoBreakBtn: 'ادامه استراحت',
    pomodoroTabControls: 'کنترل و تنظیمات تمرکز',
    pomodoroTabAnalytics: 'تحلیل و تاریخچه جلسات',
    pomodoroTargetCardTitle: 'هدف جلسه تمرکز',
    pomodoroSoundCardTitle: 'موسیقی و فضاسازی صوتی',
    pomodoroQuickLogCardTitle: 'ثبت سریع دقایق تمرکز',
    pomodoroAutomationSettings: 'تنظیمات خودکارسازی و رفتار پومودورو',
    stopwatchRewardCoinsLabel: 'سکه پاداش هر دقیقه کرنومتر آزاد',
    stopwatchRewardCoinsDesc: 'تعداد سکه‌های دریافتی به ازای هر ۱ دقیقه تمرکز با کرنومتر (پاداش نهایی به عدد صحیح تقریب زده می‌شود).',
    stopwatchRewardXpLabel: 'امتیاز تجربه (XP) هر دقیقه کرنومتر آزاد',
    stopwatchRewardXpDesc: 'مقدار امتیاز تجربه اعطایی به ازای هر ۱ دقیقه تمرکز با کرنومتر (پاداش نهایی به عدد صحیح تقریب زده می‌شود).',
    pomodoroFinishStopwatch: 'اتمام و ثبت تمرکز',
    pomodoroFinishStopwatchDesc: 'پایان دادن به کرنومتر، ذخیره در تاریخچه و آمار، و محاسبه پاداش سکه و XP به صورت عدد صحیح',
    pomodoroSkipSessionNotice: 'جلسه رد (اسکیپ) شد. زمان صرف‌شده در تاریخچه و آمار ثبت گردید اما پاداش سکه یا XP تعلق نگرفت.',
    pomodoroResetNoSaveTooltip: 'بازنشانی زمان (بدون ذخیره در تاریخچه)',
    pomodoroIntegerRewardNotice: 'کلیه پاداش‌های دریافتی به عدد صحیح بدون کسر تقریب زده می‌شوند.',
  },
  ar: {
    dir: 'rtl',
    appTitle: 'متتبع العادات العلمي اليومي',
    appSubtitle: 'وفق نموذج النمو المقارب والأتمتة العصبية للعادات (Lally et al., 2010)',
    scientificModelBadge: 'نموذج Lally 2010',
    todayLabel: 'اليوم',
    themeToggle: 'تغيير المظهر',
    scientificFormulaBtn: 'المعادلة العلمية',
    settingsBtn: 'الإعدادات والذكاء الاصطناعي',
    newHabitBtn: 'عادة جديدة',
    quickAddTitle: 'عادة جديدة',
    customizationMore: 'تخصيص متقدم',
    habitInputLabel: 'أدخل اسم العادة',
    habitInputPlaceholder: 'مثال: قراءة ۲۰ دقيقة، رياضة صباحية...',
    addToHabitsBtn: 'إضافة إلى القائمة',
    scientificGuideTitle: 'الدليل العلمي',
    advancedSimulator: 'محاكي متقدم',
    scientificExplanation:
      'وفقاً لدراسة الدكتورة لالي (٢٠١٠)، فإن بناء العادة ليس خطياً بل يتبع منحنى أسياً مقارباً. ٦٦ يوماً هو المتوسط لتحقيق الأتمتة. تفويت يوم واحد لا يضر، لكن الغياب المتتالي ينقص من ترسيخ العادة.',
    todaySummaryTitle: 'ملخص اليوم',
    todayProgress: 'إنجاز اليوم',
    recordedPercentage: 'مسجل',
    avgAutomaticity: 'متوسط الأتمتة',
    allActiveHabits: 'إجمالي العادات النشطة',
    searchPlaceholder: 'بحث عن عادة...',
    filterAll: 'الكل',
    filterPending: 'غير مكتمل اليوم',
    filterCompleted: 'المكتملة اليوم',
    allDoneTodayTitle: '🎉 اكتملت جميع عادات اليوم!',
    allDoneTodayDesc: 'رائع جداً! تم إنجاز جميع عاداتك لليوم وتم إخفاؤها تلقائياً من القائمة الرئيسية.',
    viewCompletedHabitsBtn: 'عرض العادات المكتملة',
    statsBtn: 'الإحصائيات والتحليلات',
    achievementsBtn: 'الإنجازات والأوسمة',
    achievementsModalTitle: 'لوحة الإنجازات والأوسمة العصبية',
    achievementsModalSubtitle: 'المكافآت السلوكية والمعالم العصبية بناءً على نموذج الـ 66 يوماً',
    achievementsSidebarCardTitle: 'الإنجازات ومستوى الدماغ',
    viewAllAchievements: 'عرض جميع الإنجازات',
    statsModalTitle: 'لوحة الإحصائيات الشاملة للعادات',
    statsModalSubtitle: 'تحليل دقيق لدرجات التلقائية العصبية والسلاسل المستمرة وفقاً لنموذج د. لالي',
    statsTotalHabits: 'إجمالي العادات',
    statsTodayRate: 'نسبة إنجاز اليوم',
    statsAvgAuto: 'متوسط التلقائية',
    statsTotalCompletions: 'مجموع مرات التكرار',
    statsTopStreak: 'أعلى سلسلة مستمرة',
    statsStageDistribution: 'توزيع المراحل العصبية',
    statsHabitDetailsTitle: 'إحصائيات تفصيلية لكل عادة',
    statsColHabit: 'العادة والفئة',
    statsColToday: 'حالة اليوم',
    statsColAuto: 'نسبة التلقائية',
    statsColStreak: 'السلسلة الحالية',
    statsColLongestStreak: 'أعلى سلسلة',
    statsColCompletedDays: 'الأيام المنجزة',
    statsColRemaining: 'المتبقي لـ 66 يوماً',
    statsSendToTelegram: 'إرسال الإحصائيات إلى تلغرام',
    statsViewAiReport: 'تحليل الذكاء الاصطناعي',
    tabOverview: 'نظرة عامة ومؤشرات',
    tabHabitsMatrix: 'مصفوفة العادات',
    tabIndividual: 'إحصائيات كل عادة تفصيلاً',
    tabRecurringTasks: 'المهام المتكررة',
    tabYearlyMatrix: 'المصفوفة السنوية',
    tabGrowthCurve: 'منحنى النمو العصبي 66 يوماً',
    recurringTasksStatsTitle: 'إحصائيات وتقييم المهام المتكررة',
    recurringTasksStatsSubtitle: 'تحليل السلاسل وعدد الدورات المنجزة ومواعيد الاستحقاق ومؤشرات الانضباط لكل مهمة دورية',
    yearlyMatrixTitle: 'مصفوفة النشاط والمواظبة السنوية',
    yearlyMatrixSubtitle: 'عرض تقويمي لـ 52 أسبوعاً و 365 يوماً من الأداء والسلاسل لكل عادة',
    allHabitsCombined: 'إجمالي كافة العادات',
    yearlyCompletions: 'المنجز خلال العام',
    yearlyConsistency: 'نسبة المواظبة السنوية',
    bestYearlyStreak: 'أطول سلسلة في العام',
    mostActiveMonth: 'الشهر الأكثر إنتاجية',
    bestWeekday: 'أفضل أيام الأسبوع',
    monthBreakdownTitle: 'التوزيع الشهري للأداء خلال العام',
    less: 'أقل',
    more: 'أكثر',
    statsSortBy: 'الترتيب حسب:',
    sortHighestAuto: 'أعلى تلقائية',
    sortHighestStreak: 'أطول سلسلة',
    sortPendingFirst: 'غير المكتملة أولاً',
    sortMostCompletions: 'الأكثر إنجازاً',
    statsCopySummary: 'نسخ ملخص الإحصائيات',
    statsCopied: 'تم النسخ!',
    growthCurveDesc: 'مقارنة مسار نمو كل عادة مع منحنى الأتمتة العصبية للدكتورة لالي',
    milestone21Title: 'اليوم 21: تشكل المسار العصبي الأولي',
    milestone45Title: 'اليوم 45: ترسيخ الدارة العصبية',
    milestone66Title: 'اليوم 66: قمة الأتمتة والترسيخ التام 🏆',
    noHabitsYet: 'لم تقم بإضافة أي عادات بعد',
    noHabitsFiltered: 'لم يتم العثور على عادات مطابقة',
    noHabitsSubtext: 'استخدم النموذج الجانبي لإضافة عادة جديدة أو قم بتغيير الفلتر.',
    createWithDetails: 'إنشاء بتفاصيل كاملة',
    backupBtn: 'نسخ احتياطي',
    resetDefaultsBtn: 'إعادة الضبط الأولي',
    resetConfirm: 'هل أنت متأكد من رغبتك في استعادة العادات الافتراضية؟',
    startFromDaysAgo: 'بدأت منذ {n} أيام',
    consecutiveStreak: '{n} أيام متتالية',
    automaticityRate: '٪{n}',
    remainingDaysToGoal: '{n} أيام متبقية للأتمتة',
    goalAchieved: 'تم تحقيق الهدف بنجاح 🏆',
    doneToday: 'أُنجزت اليوم',
    markDoneToday: 'تسجيل الإنجاز لليوم',
    history7Days: 'مصفوفة ٧ أيام:',
    matrix7Days: 'مصفوفة ٧ أيام',
    weeklyMatrix: 'المصفوفة الأسبوعية',
    saturdayToFriday: 'من السبت إلى الجمعة',
    pendingToday: 'بانتظار التسجيل اليوم',
    upcomingDay: 'اليوم القادم',
    daysDoneCount7: '{n} من ٧ أيام',
    completed: 'مكتمل',
    notCompleted: 'غير مكتمل',
    deleteHabit: 'حذف العادة',
    deleteConfirmTitle: 'حذف العادة',
    deleteConfirmWarning: 'لا يمكن التراجع عن هذا الإجراء',
    currentAutomaticity: 'نسبة الأتمتة الحالية:',
    recordedDaysCount: 'الأيام المسجلة:',
    deletePromptText: 'هل أنت متأكد من حذف هذه العادة وجميع سجلاتها بالكامل؟',
    deleteTaskConfirmTitle: 'حذف المهمة',
    deleteTaskConfirmWarning: 'سيؤدي هذا الإجراء إلى حذف المهمة ومهامها الفرعية نهائياً',
    deleteTaskPromptText: 'هل أنت متأكد من حذف هذه المهمة من قائمة مهامك؟',
    cancel: 'إلغاء',
    yesDelete: 'نعم، احذف',
    deleteShortConfirm: 'حذف؟',
    yes: 'نعم',
    createHabitTitle: 'إنشاء عادة جديدة',
    createHabitSubtitle: 'حدد عادتك الجديدة وابدأ مسارها العلمي',
    quickPresetsLabel: 'اختيار سريع من العادات الشائعة والمفيدة:',
    habitTitleLabel: 'عنوان العادة',
    habitTitlePlaceholder: 'مثال: قراءة ٢٠ دقيقة، شرب الماء، تأمل...',
    habitTitleError: 'يرجى إدخال اسم العادة',
    categoryLabel: 'التصنيف (اختياري)',
    categoryPlaceholder: 'مثال: صحة، رياضة، تعلم، تركيز...',
    iconLabel: 'الأيقونة',
    customColorLabel: 'اللون المخصص',
    rewardCoinsLabel: 'مقدار مكافأة العملات (١ إلى ۱۰)',
    rewardCoinsSubtext: 'العملات المكتسبة عند كل تسجيل (للاستخدام في متجر الروايات)',
    rewardXpLabel: 'مقدار نقاط الخبرة (١ إلى ۵ XP)',
    rewardXpSubtext: 'نقاط الخبرة المكتسبة لرفع مستوى الدماغ في مسار اللدونة العصبية',
    scientificNote: '💡 وفق دراسة Lally (2010)، يتسارع بناء العادة في البداية ثم يستقر تدريجياً (بمتوسط ٦٦ يوماً فعالاً).',
    submitAndStart: 'حفظ وبدء العادة',
    scienceModalTitle: 'الأساس العلمي والرياضي لبناء العادات (Lally et al., 2010)',
    scienceModalSubtitle: 'بناءً على البحث المنشور في المجلة الأوروبية لعلم النفس الاجتماعي',
    automaticityFormulaTitle: 'معادلة نسبة أتمتة العادة (Automaticity Score):',
    tEffectiveDays: 't: عدد الأيام الفعالة لأداء العادة (مع احتساب الغياب المتتالي).',
    sixtySixDaysMean: '٦٦: متوسط الأيام للوصول للأتمتة التامة وفق دراسة لالي.',
    simulatorTitle: 'محاكي تقدم الأيام الفعالة (t):',
    effectiveDaysSlider: '{n} يوماً فعالاً',
    resultingScore: 'درجة الأتمتة الناتجة:',
    stageLabel: 'المرحلة:',
    findingsTitle: 'القواعد والنتائج المكتشفة في البحث:',
    oneDayGraceTitle: 'قاعدة مسامحة غياب يوم واحد:',
    oneDayGraceDesc: 'وفقاً لنتائج لالي، فإن تفويت يوم واحد فقط لا يؤثر سلباً على مسار بناء العادة ولا يخصم من نقاطك.',
    twoDayPenaltyTitle: 'التراجع عند الغياب ليومين متتاليين أو أكثر:',
    twoDayPenaltyDesc: 'إذا تم تفويت يومين متتاليين أو أكثر، يتم خصم نقطة واحدة لكل يوم غياب إضافي لمحاكاة التراجع العصبي.',
    asymptoticCurveTitle: 'المنحنى الأسي المقارب (Asymptotic):',
    asymptoticCurveDesc: 'تكوين العادة ليس خطياً؛ يبني الدماغ روابط تشابكية سريعة في البداية ثم ينتقل نحو التثبيت.',
    understoodBtn: 'فهمت ذلك',
    stageForming: 'قيد التشكل',
    stageSemi: 'شبه تلقائي',
    stageAutomatic: 'تلقائي بالكامل',
    settingsTitle: 'الإعدادات ومساعد الذكاء الاصطناعي',
    settingsSubtitle: 'ضبط اللغة والمظهر وربط بوت تيليجرام للتقارير اليومية الذكية',
    languageSection: 'لغة التطبيق (Language)',
    themeSection: 'المظهر والسمة (Theme)',
    themeLight: 'فاتح (Light)',
    themeDark: 'داكن (Dark)',
    telegramSection: 'ربط تيليجرام والتقارير اليومية بالذكاء الاصطناعي',
    telegramDescription: 'يقوم البوت بالتعاون مع الذكاء الاصطناعي بتحليل عاداتك يومياً وإرسال نقد بناء ونصائح علمية واقتباس تحفيزي مخصص لمحادثتك.',
    botTokenLabel: 'رمز توكن البوت (Bot Token)',
    botTokenPlaceholder: 'مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    chatIdLabel: 'معرف المحادثة أو المستخدم (Chat ID)',
    chatIdPlaceholder: 'مثال: 123456789 أو @username',
    howToGetTelegram: 'كيفية الحصول على التوكن ومعرف الشات؟',
    telegramGuideText: '١. راسل بوت @BotFather في تيليجرام وأرسل الأمر /newbot للحصول على التوكن.\n٢. أرسل /start إلى بوتك الجديد.\n٣. للحصول على معرف الشات (Chat ID) الخاص بك، راسل بوت @userinfobot.',
    autoDailyReportToggle: 'تفعيل إرسال التقرير اليومي التلقائي',
    reportTimeLabel: 'وقت إرسال التقرير',
    testTelegramBtn: 'اختبار اتصال تيليجرام',
    testingTelegram: 'جاري إرسال الاختبار...',
    sendAiReportNowBtn: 'توليد وإرسال تقرير الذكاء الاصطناعي إلى تيليجرام',
    generatingAiReport: 'جاري المعالجة بالذكاء الاصطناعي...',
    saveSettingsBtn: 'حفظ الإعدادات',
    settingsSaved: 'تم حفظ الإعدادات بنجاح.',
    aiReportModalTitle: 'التقرير التحليلي بالذكاء الاصطناعي لعاداتك',
    aiReportModalSubtitle: 'تحليل السلوك العصبي، نقد بناء، حلول علمية واقتباس تحفيزي',
    generalCritiqueTitle: 'التحليل الشامل والنقد السلوكي للذكاء الاصطناعي:',
    actionableTipsTitle: 'اقتراحات وتقنيات علمية لترسيخ العادات:',
    motivationalQuoteTitle: 'اقتباس تحفيزي ملهم لليوم:',
    sendToTelegramSuccess: 'تم إرسال تقرير الذكاء الاصطناعي بنجاح إلى تيليجرام!',
    sendToTelegramFailed: 'فشل الإرسال إلى تيليجرام',
    copyReportBtn: 'نسخ نص التقرير',
    reportCopied: 'تم نسخ التقرير!',
    viewAiReport: 'عرض تقرير الذكاء الاصطناعي',
    close: 'إغلاق',
    // Backup & Restore
    backupSection: 'نسخ واستعادة بيانات المستخدم',
    backupDescription: 'تنزيل واستعادة بيانات المستخدم الخاصة (العادات، السجلات، المظهر والمحفظة والإعدادات - دون ملفات الروايات الثقيلة).',
    userBackupBadge: 'نسخة بيانات المستخدم',
    userBackupIncludesTitle: 'تتضمن هذه النسخة البيانات الشخصية التالية:',
    userBackupExcludesShopNotice: '💡 تم استثناء ملفات وفصول روايات المتجر للحفاظ على خفة وسرعة الملف (النسخة الشاملة 100% متوفرة في تبويب الإعدادات المتقدمة).',
    downloadBackupBtn: 'تنزيل نسخة المستخدم (JSON)',
    uploadBackupBtn: 'رفع واستعادة الملف',
    uploadDragDropText: 'اسحب ملف JSON الاحتياطي هنا أو انقر للاختيار',
    uploadSubtext: 'يدعم ملفات النسخ الاحتياطي الخاصة والشاملة',
    restoreSuccess: 'تمت استعادة البيانات بنجاح من ملف النسخة الاحتياطية!',
    restoreError: 'ملف النسخة الاحتياطية غير صالح أو بنية البيانات غير صحيحة.',
    restoreConfirm: 'هل أنت متأكد؟ ستستبدل عملية الاستعادة جميع العادات الحالية بمحتوى هذا الملف.',
    autoBackupTelegramSection: 'النسخ الاحتياطي التلقائي لبيانات المستخدم إلى تيليجرام',
    autoBackupToggle: 'تفعيل إرسال ملف النسخة الاحتياطية تلقائياً إلى تيليجرام',
    backupIntervalLabel: 'دورية الإرسال',
    intervalDaily: 'يومياً (Daily)',
    intervalEvery3Days: 'كل ٣ أيام',
    intervalWeekly: 'أسبوعياً (Weekly)',
    intervalMonthly: 'شهرياً (Monthly)',
    backupTimeLabel: 'وقت إرسال النسخة',
    dedicatedBackupBotTitle: 'تكوين بوت تيليجرام مخصص للنسخ الاحتياطي',
    dedicatedBackupBotDesc: 'يمكنك تحديد بوت ومحادثة مخصصة حصرياً لتخزين وإرسال ملفات النسخ الاحتياطي لتجنب التداخل مع تقارير الذكاء الاصطناعي.',
    useDedicatedBotToggle: 'استخدام بوت تيليجرام مخصص للنسخ الاحتياطي',
    useMainBotOption: 'استخدام البوت الرئيسي للتطبيق',
    backupBotTokenLabel: 'رمز توكن بوت النسخ الاحتياطي (Backup Bot Token)',
    backupBotTokenPlaceholder: 'مثال: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    backupChatIdLabel: 'معرف المحادثة أو القناة للنسخ (Backup Chat ID / Channel ID)',
    backupChatIdPlaceholder: 'مثال: 123456789 أو -1001234567890',
    testBackupBotBtn: 'اختبار اتصال بوت النسخ',
    testBackupBotSuccess: 'تم الاتصال ببوت النسخ الاحتياطي بنجاح!',
    testBackupBotFailed: 'فشل الاتصال ببوت النسخ الاحتياطي',
    scheduledBackupScheduleTitle: 'جدولة وتكرار الإرسال التلقائي',
    backupDayOfWeekLabel: 'يوم الأسبوع للإرسال الأسبوعي',
    backupDayOfMonthLabel: 'يوم الشهر للإرسال الشهري',
    backupFormatLabel: 'صيغة وأمان الملف المرسل',
    backupFormatStandard: 'ملف JSON قياسي شامل',
    backupFormatEncrypted: 'ملف JSON مشفر بكلمة مرور (AES-256)',
    backupFormatSanitized: 'ملف JSON منقى (بدون مفاتيح API)',
    backupEncryptionPassPlaceholder: 'كلمة المرور لتشفير النسخة الاحتياطية...',
    nextScheduledRunLabel: 'الموعد المجدول القادم:',
    backupStatusLabel: 'حالة النظام التلقائي:',
    statusActiveScheduled: 'نشط ومجدول تلقائياً',
    statusDisabled: 'معطل',
    totalAutoBackupsLabel: 'إجمالي النسخ المرسلة تلقائياً:',
    sendBackupNowBtn: 'إرسال نسخة المستخدم إلى تيليجرام',
    sendingBackup: 'جاري إرسال النسخة الاحتياطية...',
    backupSentSuccess: 'تم إرسال ملف نسخة المستخدم بنجاح إلى تيليجرام!',
    backupSentFailed: 'فشل إرسال ملف النسخة الاحتياطية إلى تيليجرام',
    totalHabitsCount: 'إجمالي عادات المستخدم:',
    exportSummary: 'يشمل كافة السجلات اليومية وتواريخ الإنجاز ونقاط نموذج لالي والمظهر',
    lastBackupSentLabel: 'آخر وقت للإرسال:',
    neverSent: 'لم يتم الإرسال بعد',
    copyBackupJsonBtn: 'نسخ JSON بيانات المستخدم',
    backupCopiedSuccess: 'تم نسخ بيانات المستخدم الاحتياطية بنجاح!',
    fullBackupIncludedTitle: 'تتضمن هذه النسخة المعلومات التالية:',
    fullBackupHabitsIncluded: 'جميع العادات والسجل اليومي الكامل والألوان والملاحظات',
    fullBackupSettingsIncluded: 'إعدادات اللغة والمظهر (فاتح/داكن) والمحفظة والخيارات',
    fullBackupTelegramIncluded: 'إعدادات بوت تيليجرام ومواعيد التذكير والتقارير',
    fullBackupStatsIncluded: 'مستوى الدماغ العصبي ونقاط الخبرة XP والإنجازات',
    restorePreviewTitle: 'معاينة محتوى ملف النسخة الاحتياطية:',
    restoredHabitsCountLabel: 'عدد العادات:',
    restoredCheckInsCountLabel: 'إجمالي التسجيلات:',
    restoredSettingsLabel: 'ستتم استعادة إعدادات اللغة والمظهر وتيليجرام أيضاً.',
    restoredNovelsLabel: 'روايات المتجر:',
    // Interactive Telegram Bot
    telegramInteractiveSection: 'طلب التقارير والإحصائيات وإدارة العادات من بوت تيليجرام',
    telegramInteractiveDesc: 'يمكنك طلب تقرير الذكاء الاصطناعي، عرض إحصائيات كل عادة على حدة، وإضافة أو حذف العادات مباشرة من تيليجرام.',
    botCommandsTitle: 'الأوامر المفعلة في بوت تيليجرام:',
    cmdReportDesc: 'إنشاء وإرسال تقرير الذكاء الاصطناعي الشامل فوراً',
    cmdStatsDesc: 'عرض ملخص الإحصائيات ونسب التلقائية والسلاسل',
    cmdTodayDesc: 'قائمة عادات اليوم وتسجيل إنجازها',
    cmdHabitsDesc: 'عرض قائمة العادات وإحصائيات كل عادة بشكل منفصل',
    cmdAddDesc: 'إضافة عادة جديدة (مثال: /add رياضة صباحية)',
    cmdDeleteDesc: 'حذف عادة محددة من النظام بشكل تفاعلي',
    cmdBackupDesc: 'تحميل فوري لملف النسخة الاحتياطية (JSON)',
    cmdHelpDesc: 'عرض دليل المساعدة والأزرار التفاعلية',
    cmdTasksDesc: 'عرض وإدارة المهام وقوائم التحقق',
    cmdAddTaskDesc: 'إضافة مهمة جديدة بسرعة (مثال: /addtask كتابة التقرير)',
    cmdWalletDesc: 'رصيد العملات وسجل المكافآت الذهبية',
    cmdShopDesc: 'متجر المكافآت وفتح الروايات والأفلام',
    cmdAchievementsDesc: 'لوحة الإنجازات والأوسمة العصبية',
    cmdAskDesc: 'استشارة مدرب الذكاء الاصطناعي في العلوم العصبية',
    cmdFocusDesc: 'دليل جلسات التركيز العميق وبومودورو',
    cmdModelDesc: 'شرح النموذج العلمي 66 يوماً للدكتورة فيليبا لالي',
    cmdTipsDesc: 'القواعد الذهبية الثلاث لترسيخ العادات',
    setBotMenuBtn: 'تثبيت قائمة الأوامر في تيليجرام',
    settingBotMenu: 'جاري تثبيت القائمة في تيليجرام...',
    botMenuSetSuccess: 'تم تثبيت قائمة الأوامر في بوت تيليجرام بنجاح!',
    botMenuSetFailed: 'فشل تثبيت قائمة أوامر البوت',
    botStatusListening: 'البوت الذكي يعمل ويستجيب لرسائلك وأوامرك في تيليجرام 🟢',
    botStatusWaiting: 'يرجى إدخال التوكن ومعرف المحادثة لتفعيل الاستماع التلقائي 🟡',
    botPersonaTitle: 'شخصية وأسلوب مدرب الذكاء الاصطناعي في البوت',
    botPersonaDesc: 'تحديد نبرة الإرشاد وتحليل السلوكيات بواسطة مساعد الذكاء الاصطناعي في تيليجرام.',
    personaAcademic: '🔬 أكاديمي وعلم الأعصاب',
    personaAcademicDesc: 'تحليل دقيق مستند إلى علم الأعصاب الإدراكي ونموذج لالي',
    personaCoach: '🔥 مدرب تحفيزي مفعم بالحماس',
    personaCoachDesc: 'داعم، مشجع، يرفع العزيمة والثقة والهمة اليومية',
    personaStrict: '⚡ حازم وصريح (بدون أعذار)',
    personaStrictDesc: 'مباشر وقاطع، ينبه بوضوح إلى التسويف وتأخير المهام',
    personaZen: '🌿 رواقي وهادئ (Zen)',
    personaZenDesc: 'يركز على السلام الداخلي، التوازن، وتقليل التوتر والإرهاق',
    notifyOnTaskCompletionTitle: 'الإشعارات الفورية والمزامنة المباشرة مع تيليجرام',
    notifyOnTaskCompletionLabel: 'إشعار فوري عند إنجاز المهام في الويب',
    notifyOnTaskCompletionDesc: 'إرسال رسالة تهنئة ومكافأة العملات إلى تيليجرام فور إتمام أي مهمة.',
    notifyOnHabitCheckTitle: 'إشعار تسجيل العادات اللحظي',
    notifyOnHabitCheckLabel: 'إشعار فوري عند تسجيل العادة في الويب',
    notifyOnHabitCheckDesc: 'إرسال مستوى التلقائية والتقدم إلى تيليجرام فور تسجيل أي عادة.',
    sendInstantNotificationTestBtn: 'اختبار إرسال إشعار فوري إلى تيليجرام',
    instantNotificationSentSuccess: 'تم إرسال الإشعار والمزامنة الفورية إلى تيليجرام بنجاح!',
    // Pomodoro & Deep Work in Telegram & AI
    pomodoroTelegramSectionTitle: '🍅 إدارة بومودورو والتركيز العميق في تيليجرام والذكاء الاصطناعي',
    pomodoroTelegramSectionDesc: 'بدء مؤقتات التركيز، استلام تنبيهات الانتهاء والمكافآت، واستشارة مدرب الذكاء الاصطناعي للتركيز عبر تيليجرام.',
    notifyOnPomodoroCompletionLabel: 'إرسال إشعار اكتمال بومودورو إلى تيليجرام',
    notifyOnPomodoroCompletionDesc: 'إرسال تهنئة ومدة التركيز والمكافآت المكتسبة (+5 عملات و +20 XP) إلى تيليجرام فور انتهاء المؤقت.',
    enableTelegramPomodoroControlLabel: 'التحكم في مؤقتات بومودورو عبر بوت تيليجرام',
    enableTelegramPomodoroControlDesc: 'إمكانية بدء جلسات 25 و 50 دقيقة مباشرة من تيليجرام مع التنبيه التلقائي والأزرار التفاعلية.',
    sendPomodoroTestBtn: 'اختبار إشعار بومودورو إلى تيليجرام',
    pomodoroNotificationSentSuccess: 'تم إرسال إشعار اكتمال بومودورو التجريبي إلى تيليجرام بنجاح!',
    pomodoroAiCoachTitle: 'مدرب الذكاء الاصطناعي للتركيز العميق (AI Focus Coach)',
    pomodoroAiCoachDesc: 'تقديم تقنيات علم الأعصاب لزيادة التركيز ومحاربة التشتت وتنظيم الدوبامين.',
    quietHoursTitle: 'ساعات الهدوء والراحة الليلية (Quiet Hours)',
    quietHoursDesc: 'عدم إرسال أي تذكيرات أو رسائل تلقائية في هذا الوقت لتجنب إزعاج النوم.',
    enableQuietHoursToggle: 'تفعيل ساعات الهدوء الليلي',
    quietHoursStartLabel: 'بداية الهدوء:',
    quietHoursEndLabel: 'نهاية الهدوء:',
    openInTelegramBtn: 'فتح البوت مباشرة في تيليجرام',
    botConnectionLiveStatus: 'حالة اتصال الخادم والبوت المباشرة:',
    botLatencyLabel: 'زمن الاستجابة (بينغ):',
    botUsernameLabel: 'اسم مستخدم البوت:',
    // Smart Reminders & Strict Accountability
    remindersSection: 'تذكيرات المهام اليومية المتبقية (Daily Reminders)',
    remindersDesc: 'تحديد أوقات مخصصة خلال اليوم لإرسال رسائل تذكيرية موجزة ومباشرة عبر تيليجرام بالمهام المتبقية ونسبة الإنجاز بدون نصائح أو إطالة، مع أزرار الإنجاز الفوري.',
    enableRemindersToggle: 'تفعيل إرسال التذكيرات الدورية إلى تيليجرام',
    reminderTimesLabel: 'أوقات إرسال التذكيرات اليومية:',
    addReminderTimeBtn: 'إضافة وقت جديد',
    removeTimeBtn: 'حذف',
    strictWarningSection: 'الإنذار النهائي للمهام غير المنجزة (Nightly Final Warning)',
    strictWarningDesc: 'تحديد وقت نهائي بنهاية اليوم. في حال وجود مهام غير مكتملة، يتم إرسال تنبيه حاسم من بضع جمل يحتوي فقط على قائمة المهام المتبقية دون أي إضافات.',
    enableStrictWarningToggle: 'تفعيل الإنذار النهائي الليلي للمهام المتبقية',
    strictWarningTimeLabel: 'وقت إرسال الإنذار النهائي ليلاً:',
    sendReminderTestBtn: 'اختبار إرسال تذكير فوري',
    sendStrictWarningTestBtn: 'اختبار إرسال الإنذار النهائي للمهام المتبقية',
    reminderSentSuccess: 'تم إرسال رسالة التذكير الموجزة بالمهام إلى تيليجرام بنجاح!',
    strictWarningSentSuccess: 'تم إرسال رسالة الإنذار النهائي للمهام غير المنجزة إلى تيليجرام بنجاح!',
    // Visual Chart Infographics
    visualChartSectionTitle: 'مصفوفة بيانية وصورة مستقلة لكل عادة (Habit Matrix Charts)',
    visualChartSectionDesc: 'إرسال صورة مصفوفة النشاط لـ 14 يوماً لكل عادة على حدة، متضمنة نسبة التقدم والأيام المقدرة للوصول إلى 66 يوماً وتاريخ الإنجاز المتوقع.',
    sendVisualChartsToggle: 'إرسال مصفوفة بيانية مستقلة لكل عادة',
    sendVisualChartTestBtn: 'اختبار إرسال مصفوفات العادات إلى تيليجرام',
    visualChartSentSuccess: 'تم إرسال مصفوفات العادات المرئية بنجاح إلى تيليجرام!',
    cmdChartDesc: '📊 الحصول على مصفوفة بيانية مستقلة والأيام المقدرة لـ 66 يوماً لكل عادة',
    // Advanced Settings
    advancedTabTitle: 'إعدادات متقدمة',
    advancedSettingsTitle: 'الإعدادات المتقدمة للنظام والسلوك',
    advancedSettingsDesc: 'تخصيص المؤثرات الصوتية والاهتزاز اللمسي، النموذج العلمي لبناء العادات، قواعد السلسلة الصارمة وإدارة الذاكرة المحلية.',
    defaultTargetDaysLabel: 'الأيام المستهدفة الافتراضية للعادات الجديدة',
    defaultTargetDaysDesc: 'عدد الأيام المستهدفة تلقائياً عند إنشاء عادة جديدة (الافتراضي وفق نموذج لالي: 66 يوماً)',
    feedbackEffectsTitle: 'المؤثرات التفاعلية (الصوت والاهتزاز والاحتفال)',
    feedbackEffectsDesc: 'تخصيص التغذية الراجعة الحسية فور تسجيل العادة لتعزيز التحفيز والإنجاز.',
    soundEffectsLabel: 'المؤثرات الصوتية عند تسجيل العادة (Sound Effects)',
    soundEffectsDesc: 'تشغيل صوت تشجيعي لطيف عند إتمام تسجيل أي عادة',
    soundFeedbackLabel: 'المؤثرات الصوتية عند تسجيل العادة (Sound Effect)',
    soundFeedbackDesc: 'تشغيل صوت تشجيعي لطيف عند إتمام تسجيل أي عادة',
    hapticFeedbackLabel: 'الاهتزاز اللمسي (Haptic Vibration)',
    hapticFeedbackDesc: 'اهتزاز خفيف للأجهزة المحمولة عند النقر وتسجيل العادة بنجاح',
    confettiEffectsLabel: 'مؤثرات الاحتفال عند إنجاز 100% من عادات اليوم',
    confettiEffectsDesc: 'عرض قصاصات الاحتفال والنجوم عند إتمام كافة العادات النشطة لليوم الحالي',
    confettiCelebrationLabel: 'مؤثرات الاحتفال عند إنجاز 100% من عادات اليوم',
    confettiCelebrationDesc: 'عرض قصاصات الاحتفال والنجوم عند إتمام كافة العادات النشطة لليوم الحالي',
    strictStreakToggleLabel: 'الوضع الصارم لسلسلة الإنجاز (Zero-Tolerance)',
    strictStreakToggleDesc: 'إعادة تصفير العداد فوراً عند تفويت أو عدم إنجاز أي عادة في اليوم.',
    storageManagerTitle: 'حالة التخزين المحلي وتحسين الذاكرة (Storage & Cache)',
    serverStorageTitle: 'قاعدة البيانات الدائمة وإدارة ملفات المتجر (Termux DB)',
    serverStorageDesc: 'حفظ دائم للعادات والمحفظة والملفات الإعلامية على قرص الخادم مع حماية ضد المسح حتى عند إعادة تشغيل Termux أو إغلاق المتصفح.',
    persistentDbStatus: 'قاعدة البيانات الدائمة للخادم متصلة ونشطة',
    antiWipeStatus: 'قفل حماية البيانات من المسح (Anti-Wipe Protected)',
    dbLocationLabel: 'مسار قاعدة البيانات:',
    fileStorageTitle: 'إدارة وتخزين ملفات النظام وقاعدة البيانات (File Storage)',
    fileStorageDesc: 'إدارة قاعدة البيانات الدائمة ولقطات النسخ الاحتياطي على الخادم والمزامنة الفورية مع القرص.',
    createSnapshotBtn: 'إنشاء لقطة احتياطية يدوية على الخادم',
    creatingSnapshot: 'جاري إنشاء اللقطة...',
    createSnapshotSuccess: 'تم إنشاء اللقطة الاحتياطية بنجاح على قرص الخادم.',
    serverBackupsListTitle: 'قائمة لقطات النسخ الاحتياطي على الخادم (Server Snapshots)',
    restoreSnapshotBtn: 'استعادة هذه اللقطة',
    restoringSnapshot: 'جاري الاستعادة...',
    deleteSnapshotBtn: 'حذف',
    deleteSnapshotConfirm: 'هل أنت متأكد من رغبتك في حذف ملف هذه اللقطة من الخادم؟',
    storeFilesSectionTitle: 'إدارة وتخزين ملفات المتجر والوسائط (Store Files & Media Storage)',
    storeFilesSectionDesc: 'هيكل مجلدات الوسائط والفيديوهات والروايات على قرص الخادم مع الفحص المباشر والرفع.',
    scanVideosFolderBtn: 'فحص فوري لمجلد الفيديوهات',
    scanningVideos: 'جاري فحص القرص...',
    scanVideosSuccess: 'تم فحص مجلد الفيديوهات بنجاح وتحديث الأرشيف.',
    uploadZipBtn: 'رفع ملف ZIP أو حلقات جديدة',
    uploadingZip: 'جاري استخراج ومعالجة ملف ZIP...',
    termuxTransferGuideTitle: 'دليل النقل المباشر للملفات في تيرموكس / أندرويد',
    termuxTransferGuideDesc: 'يمكنك نسخ ملفات الفيديو أو فصول الروايات مباشرة إلى مجلد store ثم الضغط على زر «فحص فوري».',
    cleanupOrphanFilesBtn: 'تنظيف الملفات المؤقتة والمهملة',
    cleanupOrphanFilesDesc: 'فحص ملفات الوسائط على القرص وحذف الملفات غير المرتبطة بأي منتج أو فيديو لتحرير المساحة.',
    storeFolderExplorerTitle: 'مستكشف مجلدات وملفات المتجر (Store Explorer)',
    videoFilesCountLabel: 'إجمالي ملفات الفيديو:',
    novelsFilesCountLabel: 'إجمالي ملفات الروايات:',
    storeMediaFoldersTitle: 'هيكل مجلدات المتجر وملفات الفيديو (Store Architecture)',
    storeMediaFoldersDesc: 'يتم الاحتفاظ بملفات الروايات والفيديو في مجلدات مفصولة تماماً على الخادم لتكون جاهزة لتوسعة بيع الفيديوهات والدورات مستقبلاً.',
    videosFolderLabel: 'مجلد ملفات الفيديو:',
    novelsFolderLabel: 'مجلد الروايات والكتب:',
    forceSaveDiskBtn: 'حفظ ومزامنة فورية مع القرص',
    forceSaveSuccess: 'تم حفظ قاعدة البيانات على قرص الخادم بنجاح وإنشاء لقطة احتياطية.',
    exportBackupBtn: 'تحميل نسخة احتياطية كاملة (JSON)',
    importBackupBtn: 'استعادة قاعدة البيانات من ملف احتياطي',
    importBackupSuccess: 'تمت استعادة قاعدة البيانات من النسخة الاحتياطية بنجاح.',
    storageUsedLabel: 'المساحة المستخدمة في ذاكرة المتصفح:',
    totalDataRecordsLabel: 'إجمالي السجلات المحفوظة في قاعدة البيانات:',
    optimizeCacheBtn: 'تحسين وضغط الذاكرة المؤقتة',
    cacheOptimizedSuccess: 'تم تحسين الذاكرة المؤقتة وضغط البيانات بنجاح!',
    systemDiagnosticsTitle: 'معلومات تشخيص النظام',
    scientificParamsTitle: 'معاملات النموذج الرياضي (Lally Formula)',
    scientificParamsDesc: 'دالة النمو اللوجستي: Automaticity = 100 / (1 + e^(-k * (t - t0)))',
    testSoundBtn: 'تجربة الصوت',
    testConfettiBtn: 'تجربة الاحتفال',
    // Task Management
    tasksNavTitle: 'المهام والواجبات',
    habitsNavTitle: 'عادات الـ 66 يوماً',
    dailyFocusNavTitle: 'التركيز اليومي الشامل',
    tasksSectionTitle: 'إدارة المهام والواجبات اليومية',
    tasksSectionSubtitle: 'التخطيط وتحديد الأولويات والمهام الفرعية وكسب المكافآت عند الإنجاز',
    createTaskTitle: 'إنشاء مهمة جديدة',
    createTaskSubtitle: 'أضف مهمتك الجديدة مع تحديد الأولوية وموعد الإنجاز والمهام الفرعية',
    editTaskTitle: 'تعديل المهمة',
    taskTitleLabel: 'عنوان المهمة',
    taskTitlePlaceholder: 'مثال: إعداد العرض التقديمي، التسوق، مكالمة عمل...',
    taskTitleError: 'يرجى إدخال عنوان المهمة',
    taskDescLabel: 'الوصف والتفاصيل (اختياري)',
    taskDescPlaceholder: 'ملاحظات أو روابط إضافية حول تنفيذ المهمة...',
    taskPriorityLabel: 'مستوى الأولوية',
    priorityHigh: 'عاجل ومهم (عالي)',
    priorityMedium: 'متوسط',
    priorityLow: 'منخفض',
    taskDueDateLabel: 'تاريخ الاستحقاق',
    taskDueToday: 'اليوم',
    taskDueTomorrow: 'غداً',
    taskDueNoDate: 'بدون موعد محدد',
    taskCustomDate: 'تاريخ مخصص',
    taskDueTimeLabel: 'الوقت المحدد (اختياري)',
    taskCategoryLabel: 'التصنيف أو الوسم',
    taskCategoryPlaceholder: 'مثال: عمل، شخصي، مشروع، دراسة...',
    taskSubtasksLabel: 'المهام الفرعية وقائمة التحقق',
    addSubtaskBtn: 'إضافة مهمة فرعية',
    subtaskPlaceholder: 'عنوان المهمة الفرعية...',
    taskRewardCoinsLabel: 'مكافأة العملات عند الإنجاز (١ إلى ۱۰)',
    taskRewardXpLabel: 'مكافأة نقاط الخبرة (١ إلى ۵ XP)',
    submitCreateTask: 'حفظ وإنشاء المهمة',
    submitSaveTask: 'حفظ التعديلات',
    filterTaskAll: 'كافة المهام',
    filterTaskPending: 'قيد الانتظار',
    filterTaskCompleted: 'المكتملة',
    filterTaskHighPriority: 'أولوية عالية',
    filterTaskToday: 'استحقاق اليوم',
    tasksDoneSummary: 'إنجاز المهام',
    noTasksYet: 'لم تقم بإضافة أي مهام بعد',
    noTasksFiltered: 'لا توجد مهام مطابقة للفلتر',
    noTasksSubtext: 'أضف مهامك لتنظيم يومك ومشاريعك واكسب العملات الذهبية عند إتمامها.',
    quickAddTaskPlaceholder: 'إضافة سريعة لمهمة جديدة (اضغط Enter)...',
    deleteTaskConfirm: 'هل أنت متأكد من حذف هذه المهمة؟',
    taskCompletedCelebration: 'تم إنجاز المهمة بنجاح!',
    subtasksCompletedRatio: 'المهام الفرعية المنجزة:',
    taskDueIn2Days: 'بعد غد',
    taskDueNextWeek: 'الأسبوع القادم (+٧ أيام)',
    taskDueNextMonth: 'الشهر القادم (+٣٠ يوماً)',
    taskDatePickerTitle: 'تحديد تاريخ الاستحقاق بدقة',
    taskShamsiYear: 'السنة',
    taskShamsiMonth: 'الشهر',
    taskShamsiDay: 'اليوم',
    taskSelectedDatePreview: 'تاريخ الاستحقاق المحدد:',
    recurringTaskToggle: 'تكرار تلقائي منتظم (مهمة دورية)',
    recurringTaskDesc: 'بعد الإنجاز، سيتم جدولة الموعد القادم تلقائياً للدورة التالية.',
    recurrenceFrequencyLabel: 'دورة التكرار',
    recurrenceDaily: 'يومياً (كل يوم)',
    recurrenceWeekdays: 'أيام العمل',
    recurrenceWeekly: 'أسبوعياً',
    recurrenceMonthly: 'شهرياً',
    recurrenceCustom: 'تخصيص الفترة',
    recurrenceIntervalLabel: 'فاصل التكرار:',
    recurrenceDaysOfWeekLabel: 'أيام الأسبوع للتكرار:',
    filterTaskRecurring: 'المهام المتكررة',
    recurringTaskBadge: 'متكررة',
    recurringCycleCount: 'الدورات المكتملة',
    nextRecurringDueNotice: 'موعد التكرار القادم:',
    // Pomodoro & Focus Timer (AR)
    pomodoroNavTitle: 'مؤقت بومودورو',
    pomodoroModalTitle: 'محطة التركيز ومؤقت بومودورو',
    pomodoroModalSubtitle: 'تقنية التركيز العميق وإدارة الفترات الزمنية وتسجيل الوقت للعادات والمهام',
    pomodoroFocusMode: 'التركيز العميق',
    pomodoroShortBreak: 'استراحة قصيرة',
    pomodoroLongBreak: 'استراحة طويلة',
    pomodoroStopwatch: 'ساعة إيقاف حرة',
    pomodoroStart: 'بدء التركيز',
    pomodoroPause: 'إيقاف مؤقت',
    pomodoroResume: 'استئناف',
    pomodoroReset: 'إعادة ضبط',
    pomodoroSkip: 'تخطي إلى الفترة التالية',
    pomodoroTargetLabel: 'ربط بعادة أو مهمة:',
    pomodoroNoTarget: 'تركيز حر (غير مرتبط)',
    pomodoroHabitsGroup: 'العادات اليومية',
    pomodoroTasksGroup: 'المهام والواجبات',
    pomodoroManualLogTitle: 'تسجيل الوقت يدوياً',
    pomodoroManualLogDesc: 'إذا قضيت وقتاً على هذا البند بدون تشغيل المؤقت، يمكنك تسجيل الدقائق يدوياً:',
    pomodoroLogMinutesBtn: 'تسجيل الوقت',
    pomodoroQuickAddMinutes: 'إضافة سريعة:',
    pomodoroCustomMinutes: 'دقائق مخصصة:',
    pomodoroLoggedSuccess: 'تم تسجيل الوقت بنجاح!',
    pomodoroSessionCompleted: '🎉 أحسنت! اكتملت فترة التركيز بنجاح',
    pomodoroSessionCompletedDesc: 'تم حفظ الوقت وإضافته إلى إنجازك.',
    pomodoroTodayTotalFocus: 'إجمالي تركيز اليوم:',
    pomodoroTotalFocusAllTime: 'إجمالي وقت التركيز المسجل:',
    pomodoroSessionsCount: 'الجلسات المكتملة:',
    pomodoroMinutesLabel: 'دقيقة',
    pomodoroCoinsEarned: 'عملات المكافأة',
    pomodoroXpEarned: 'نقاط الخبرة XP',
    pomodoroMarkHabitDonePrompt: 'هل ترغب في تحديد هذه العادة كمنجزة لليوم؟',
    pomodoroMarkTaskDonePrompt: 'هل انتهت هذه المهمة وتود وضع علامة اكتمال؟',
    pomodoroAmbientSoundLabel: 'الأصوات المحيطية المريحة:',
    pomodoroSoundNone: 'بدون صوت',
    pomodoroSoundWhiteNoise: 'الضوضاء البيضاء (White Noise)',
    pomodoroSoundRain: 'صوت المطر الهادئ (Rain)',
    pomodoroSoundTick: 'دقات الساعة الميكانيكية (Tick-Tock)',
    pomodoroSoundLofi: 'نغمات لوفاي مهدئة (Lo-Fi Tone)',
    pomodoroHistoryTitle: 'سجل جلسات التركيز',
    pomodoroNoSessionsYet: 'لم يتم تسجيل أي جلسة تركيز حتى الآن.',
    pomodoroFloatingTimerTip: 'عند إغلاق النافذة، يظل المؤقت نشطاً أسفل الشاشة.',
    pomodoroQuickTimerBtn: 'بومودورو / تسجيل الوقت',
    pomodoroHabitFocusBadge: 'تركيز',
    pomodoroTaskFocusBadge: 'تركيز',
    pomodoroPreset15: '١٥ دقيقة',
    pomodoroPreset25: '٢٥ دقيقة',
    pomodoroPreset45: '٤٥ دقيقة',
    pomodoroPreset60: '٦٠ دقيقة',
    pomodoroAdd5Min: '+٥ دقائق',
    pomodoroSub5Min: '-٥ دقائق',
    pomodoroClearHistory: 'مسح السجل',
    pomodoroSettingsTitle: 'إعدادات أوقات ومكافآت بومودورو',
    pomodoroRewardCoinsLabel: 'عملات مكافأة جلسة 25 دقيقة',
    pomodoroRewardCoinsDesc: 'عدد العملات التي يحصل عليها المستخدم بعد إكمال 25 دقيقة تركيز على الأقل بنجاح.',
    pomodoroRewardXpLabel: 'نقاط الخبرة (XP) لمكافأة 25 دقيقة',
    pomodoroRewardXpDesc: 'نقاط الخبرة التي تُمنح للمستخدم بعد إكمال 25 دقيقة تركيز.',
    pomodoroMin25MinNotice: 'تنبيه: تُمنح العملات ونقاط XP فقط عند إكمال 25 دقيقة تركيز كاملة على الأقل.',
    pomodoroEarlyFinishNotice: 'انتهت الجلسة قبل 25 دقيقة. تم تسجيل الوقت الفعلي فقط بدون مكافآت.',
    pomodoroFullscreenMode: 'وضع ملء الشاشة والغمر',
    pomodoroExitFullscreen: 'الخروج من ملء الشاشة',
    pomodoroZenFocus: 'تركيز بسيط (بدون تشتيت)',
    pomodoroDetailedMode: 'عرض التفاصيل والسجل',
    pomodoroScreenKeepOn: 'إبقاء الشاشة مضاءة',
    pomodoroScreenKeepOnActive: 'الشاشة ستبقى مضاءة تلقائياً (تم تعطيل السكون)',
    pomodoroScreenKeepOnDisabled: 'تم تعطيل إبقاء الشاشة مضاءة (انقر للتفعيل)',
    pomodoroScreenKeepOnUnsupported: 'تم تفعيل حماية إبقاء الشاشة مضاءة',
    pomodoroAutoBreakNotice: 'انتهت فترة التركيز! تم بدء وقت الاستراحة تلقائياً ☕',
    pomodoroAutoBreakBtn: 'متابعة الاستراحة',
    pomodoroTabControls: 'التحكم وإعدادات التركيز',
    pomodoroTabAnalytics: 'التحليلات وسجل الجلسات',
    pomodoroTargetCardTitle: 'هدف جلسة التركيز',
    pomodoroSoundCardTitle: 'الموسيقى والأصوات المحيطة',
    pomodoroQuickLogCardTitle: 'تسجيل يدوي سريع للدقائق',
    pomodoroAutomationSettings: 'إعدادات الأتمتة والسلوك',
    stopwatchRewardCoinsLabel: 'عملات مكافأة لكل دقيقة ساعة إيقاف',
    stopwatchRewardCoinsDesc: 'عدد العملات لكل دقيقة تركيز بساعة الإيقاف (يتم تقريب المكافأة إلى عدد صحيح).',
    stopwatchRewardXpLabel: 'نقاط خبرة (XP) لكل دقيقة ساعة إيقاف',
    stopwatchRewardXpDesc: 'نقاط الخبرة الممنوحة لكل دقيقة بساعة الإيقاف (يتم تقريب المكافأة إلى عدد صحيح).',
    pomodoroFinishStopwatch: 'إنهاء وحفظ الجلسة',
    pomodoroFinishStopwatchDesc: 'إنهاء ساعة الإيقاف وحفظها في السجل والإحصائيات واحتساب المكافآت كعدد صحيح',
    pomodoroSkipSessionNotice: 'تم تخطي الجلسة. تم حفظ الوقت بالسجل بدون منح مكافآت عملات أو XP.',
    pomodoroResetNoSaveTooltip: 'إعادة ضبط الوقت (بدون حفظ في السجل)',
    pomodoroIntegerRewardNotice: 'يتم تقريب جميع المكافآت إلى عدد صحيح بدون كسور.',
  },
  en: {
    dir: 'ltr',
    appTitle: 'Scientific Habit Tracker',
    appSubtitle: 'Based on the asymptotic growth and neuro-automaticity model (Lally et al., 2010)',
    scientificModelBadge: 'Lally 2010 Model',
    todayLabel: 'Today',
    themeToggle: 'Toggle Theme',
    scientificFormulaBtn: 'Scientific Formula',
    settingsBtn: 'Settings & AI Assistant',
    newHabitBtn: 'New Habit',
    quickAddTitle: 'New Habit',
    customizationMore: 'Advanced Options',
    habitInputLabel: 'Enter habit name',
    habitInputPlaceholder: 'e.g. 20 min reading, morning workout, meditation...',
    addToHabitsBtn: 'Add to List',
    scientificGuideTitle: 'Scientific Guide',
    advancedSimulator: 'Advanced Simulator',
    scientificExplanation:
      'According to Dr. Lally (2010), habit formation is non-linear and follows an asymptotic exponential curve. 66 days is the average time to automaticity. A single missed day has no penalty, but consecutive misses trigger neural decay.',
    todaySummaryTitle: "Today's Summary",
    todayProgress: "Today's Progress",
    recordedPercentage: 'completed',
    avgAutomaticity: 'Avg Automaticity',
    allActiveHabits: 'Total Active Habits',
    searchPlaceholder: 'Search habits...',
    filterAll: 'All',
    filterPending: 'Pending Today',
    filterCompleted: 'Completed Today',
    allDoneTodayTitle: '🎉 All Habits Done for Today!',
    allDoneTodayDesc: 'Awesome work! All your active habits for today are completed and hidden from the pending view.',
    viewCompletedHabitsBtn: 'View Completed Habits',
    statsBtn: 'Stats & Analytics',
    achievementsBtn: 'Achievements & Badges',
    achievementsModalTitle: 'Neural Achievements & Badges',
    achievementsModalSubtitle: 'Behavioral milestones & neural trophies based on Dr. Lally’s 66-day model',
    achievementsSidebarCardTitle: 'Achievements & Brain Level',
    viewAllAchievements: 'View All Achievements',
    statsModalTitle: 'Comprehensive Habit Analytics & Stats',
    statsModalSubtitle: 'Detailed neural automaticity metrics, streaks, and completion logs based on Dr. Lally’s model',
    statsTotalHabits: 'Total Habits',
    statsTodayRate: "Today's Completion",
    statsAvgAuto: 'Avg Automaticity',
    statsTotalCompletions: 'Total Completed Days',
    statsTopStreak: 'Top Active Streak',
    statsStageDistribution: 'Neural Stages Distribution',
    statsHabitDetailsTitle: 'Detailed Habit-by-Habit Statistics',
    statsColHabit: 'Habit & Category',
    statsColToday: "Today's Status",
    statsColAuto: 'Automaticity',
    statsColStreak: 'Current Streak',
    statsColLongestStreak: 'Best Streak',
    statsColCompletedDays: 'Completed Days',
    statsColRemaining: 'Days to 66d Target',
    statsSendToTelegram: 'Send Stats to Telegram',
    statsViewAiReport: 'View AI Neural Analysis',
    tabOverview: 'Overview & KPIs',
    tabHabitsMatrix: 'Habits Breakdown Matrix',
    tabIndividual: 'Individual Habit Analytics',
    tabRecurringTasks: 'Recurring Tasks',
    tabYearlyMatrix: 'Annual Matrix',
    tabGrowthCurve: '66-Day Neural Curve',
    recurringTasksStatsTitle: 'Recurring Tasks Analytics & Evaluation',
    recurringTasksStatsSubtitle: 'Streak analysis, completed cycles, due schedule, and discipline metrics per recurring task',
    yearlyMatrixTitle: 'Annual Habit Activity & Consistency Matrix',
    yearlyMatrixSubtitle: '52-week 365-day calendar heatmap tracking completion density and streaks for each habit',
    allHabitsCombined: 'All Habits Combined',
    yearlyCompletions: 'Annual Completions',
    yearlyConsistency: 'Annual Consistency',
    bestYearlyStreak: 'Best Yearly Streak',
    mostActiveMonth: 'Most Productive Month',
    bestWeekday: 'Best Day of Week',
    monthBreakdownTitle: 'Month-by-Month Annual Breakdown',
    less: 'Less',
    more: 'More',
    statsSortBy: 'Sort by:',
    sortHighestAuto: 'Highest Automaticity',
    sortHighestStreak: 'Longest Streak',
    sortPendingFirst: 'Pending Today First',
    sortMostCompletions: 'Most Completed Days',
    statsCopySummary: 'Copy Stats Summary',
    statsCopied: 'Copied to Clipboard!',
    growthCurveDesc: 'Visual positioning of active habits along Dr. Lally’s 66-day synaptic consolidation curve',
    milestone21Title: 'Day 21: Initial Synaptic Pathway Initiation',
    milestone45Title: 'Day 45: Pathway Solidification & Friction Drop',
    milestone66Title: 'Day 66: Full Automaticity & Subconscious Consolidation 🏆',
    noHabitsYet: 'No habits created yet',
    noHabitsFiltered: 'No habits match this filter',
    noHabitsSubtext: 'Use the side form to create your first habit or adjust your search filter.',
    createWithDetails: 'Create with Full Details',
    backupBtn: 'Export Backup',
    resetDefaultsBtn: 'Reset Defaults',
    resetConfirm: 'Are you sure you want to reset habits to initial default examples?',
    startFromDaysAgo: 'Started {n} days ago',
    consecutiveStreak: '{n} day streak',
    automaticityRate: '{n}%',
    remainingDaysToGoal: '{n} days left until full automaticity',
    goalAchieved: 'Milestone Achieved 🏆',
    doneToday: 'Completed Today',
    markDoneToday: 'Mark as Done Today',
    history7Days: '7-Day Matrix:',
    matrix7Days: '7-Day Matrix',
    weeklyMatrix: 'Weekly Matrix',
    saturdayToFriday: 'Saturday to Friday',
    pendingToday: 'Pending Today',
    upcomingDay: 'Upcoming Day',
    daysDoneCount7: '{n} of 7 days',
    completed: 'Completed',
    notCompleted: 'Not completed',
    deleteHabit: 'Delete Habit',
    deleteConfirmTitle: 'Delete Habit',
    deleteConfirmWarning: 'This action cannot be undone',
    currentAutomaticity: 'Current Automaticity:',
    recordedDaysCount: 'Completed Days:',
    deletePromptText: 'Are you sure you want to permanently delete this habit and all its recorded history?',
    deleteTaskConfirmTitle: 'Delete Task',
    deleteTaskConfirmWarning: 'This action will permanently delete the task and its subtasks',
    deleteTaskPromptText: 'Are you sure you want to delete this task from your list?',
    cancel: 'Cancel',
    yesDelete: 'Yes, Delete',
    deleteShortConfirm: 'Delete?',
    yes: 'Yes',
    createHabitTitle: 'Create New Habit',
    createHabitSubtitle: 'Define your habit and start tracking scientific automaticity',
    quickPresetsLabel: 'Quick presets from popular healthy habits:',
    habitTitleLabel: 'Habit Name',
    habitTitlePlaceholder: 'e.g. Drink 8 glasses of water, 20 mins reading...',
    habitTitleError: 'Please enter a habit title',
    categoryLabel: 'Category (Optional)',
    categoryPlaceholder: 'e.g. Health, Fitness, Learning, Focus...',
    iconLabel: 'Icon',
    customColorLabel: 'Custom Color',
    rewardCoinsLabel: 'Reward Coins (1 to 10)',
    rewardCoinsSubtext: 'Coins earned on each check-in (used in the Web Novel store)',
    rewardXpLabel: 'Experience Points (1 to 5 XP)',
    rewardXpSubtext: 'XP earned on each check-in to upgrade Brain Level & neuroplasticity',
    scientificNote: '💡 Per Lally (2010), habit formation accelerates rapidly at first and asymptotically plateaus around 66 effective days.',
    submitAndStart: 'Save & Start Habit',
    scienceModalTitle: 'Scientific & Mathematical Basis of Habit Formation (Lally et al., 2010)',
    scienceModalSubtitle: 'Based on research published in the European Journal of Social Psychology',
    automaticityFormulaTitle: 'Habit Automaticity Score Formula:',
    tEffectiveDays: 't: Effective days of performing the habit (accounting for consecutive absences).',
    sixtySixDaysMean: '66: Mean days required to reach the asymptotic plateau per Lally et al.',
    simulatorTitle: 'Effective Days Simulator (t):',
    effectiveDaysSlider: '{n} effective days',
    resultingScore: 'Resulting Automaticity Score:',
    stageLabel: 'Stage:',
    findingsTitle: 'Core Rules and Psychological Discoveries:',
    oneDayGraceTitle: 'The 1-Day Grace Rule:',
    oneDayGraceDesc: 'Lally found that missing a single day does not disrupt the habit formation process or degrade the effective t score.',
    twoDayPenaltyTitle: 'Penalty for 2+ Consecutive Misses:',
    twoDayPenaltyDesc: 'Missing two or more consecutive days causes neural decay, reducing effective t by 1 for each additional missed day.',
    asymptoticCurveTitle: 'Asymptotic Exponential Trajectory:',
    asymptoticCurveDesc: 'Habit growth is non-linear; the brain builds early synaptic pathways rapidly, tapering into automaticity.',
    understoodBtn: 'Got it',
    stageForming: 'Forming',
    stageSemi: 'Semi-Automatic',
    stageAutomatic: 'Fully Automatic',
    settingsTitle: 'Settings & AI Assistant',
    settingsSubtitle: 'Configure language, theme, and Telegram Bot for daily AI habit reviews and critiques',
    languageSection: 'Application Language',
    themeSection: 'Theme & Appearance',
    themeLight: 'Light Theme',
    themeDark: 'Dark Theme',
    telegramSection: 'Telegram Bot & Daily AI Reports',
    telegramDescription: 'Connect your Telegram Bot to receive daily AI-powered habit analysis, constructive critiques, scientific tips, and a personalized motivational quote.',
    botTokenLabel: 'Telegram Bot Token',
    botTokenPlaceholder: 'e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    chatIdLabel: 'Telegram Chat ID / User ID',
    chatIdPlaceholder: 'e.g. 123456789 or @username',
    howToGetTelegram: 'How to get Bot Token & Chat ID?',
    telegramGuideText: '1. Message @BotFather on Telegram and send /newbot to obtain your Bot Token.\n2. Start your newly created bot by sending /start to it.\n3. Message @userinfobot to find your Telegram Chat ID.',
    autoDailyReportToggle: 'Enable Automated Daily Report',
    reportTimeLabel: 'Report Delivery Time',
    testTelegramBtn: 'Test Telegram Connection',
    testingTelegram: 'Sending test message...',
    sendAiReportNowBtn: 'Generate & Send AI Report to Telegram',
    generatingAiReport: 'Generating AI Report...',
    saveSettingsBtn: 'Save Settings',
    settingsSaved: 'Settings successfully saved.',
    aiReportModalTitle: 'AI Habit Analysis & Coaching Report',
    aiReportModalSubtitle: 'Neural behavior analysis, constructive critiques, scientific tips, and daily inspiration',
    generalCritiqueTitle: 'Comprehensive AI Critique & Behavioral Analysis:',
    actionableTipsTitle: 'Actionable Scientific Suggestions for Habit Stacking:',
    motivationalQuoteTitle: 'Daily Motivational Inspiration:',
    sendToTelegramSuccess: 'AI Report was successfully sent to your Telegram!',
    sendToTelegramFailed: 'Failed to send to Telegram',
    copyReportBtn: 'Copy Report Text',
    reportCopied: 'Report text copied to clipboard!',
    viewAiReport: 'View AI Report',
    close: 'Close',
    // Backup & Restore
    backupSection: 'User Data Backup & Restore',
    backupDescription: 'Download and restore personal user data (habits, history logs, theme, wallet & preferences - excluding heavy store novels).',
    userBackupBadge: 'User Data Backup',
    userBackupIncludesTitle: 'This backup includes the following user data:',
    userBackupExcludesShopNotice: '💡 Store novels & media files are excluded to keep this backup lightweight and fast (Full 100% complete backup is located in Advanced Settings).',
    downloadBackupBtn: 'Download User Backup (JSON)',
    uploadBackupBtn: 'Upload & Restore File',
    uploadDragDropText: 'Drag & drop JSON backup file here, or click to browse',
    uploadSubtext: 'Compatible with user data backups and complete full system backups',
    restoreSuccess: 'Data successfully restored from backup file!',
    restoreError: 'Invalid backup file or corrupt data structure.',
    restoreConfirm: 'Are you sure? Restoring this backup will replace your current habits and histories.',
    autoBackupTelegramSection: 'Automated User Backup to Telegram',
    autoBackupToggle: 'Enable automated backup file delivery to Telegram',
    backupIntervalLabel: 'Backup Frequency',
    intervalDaily: 'Daily',
    intervalEvery3Days: 'Every 3 Days',
    intervalWeekly: 'Weekly',
    intervalMonthly: 'Monthly',
    backupTimeLabel: 'Backup Time',
    dedicatedBackupBotTitle: 'Dedicated Telegram Bot for Backups',
    dedicatedBackupBotDesc: 'Configure a dedicated Telegram bot & chat exclusively for storing and dispatching backup files, keeping your main AI reporting bot clean.',
    useDedicatedBotToggle: 'Use Dedicated Telegram Bot for Backups',
    useMainBotOption: 'Use Primary App Bot (Shared with AI Reports)',
    backupBotTokenLabel: 'Backup Bot Token',
    backupBotTokenPlaceholder: 'e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ...',
    backupChatIdLabel: 'Backup Chat ID / Channel ID',
    backupChatIdPlaceholder: 'e.g. 123456789 or -1001234567890',
    testBackupBotBtn: 'Test Backup Bot Connection',
    testBackupBotSuccess: 'Backup bot connected and verified successfully!',
    testBackupBotFailed: 'Failed to connect to backup bot',
    scheduledBackupScheduleTitle: 'Automated Dispatch Schedule',
    backupDayOfWeekLabel: 'Day of Week for Weekly Dispatch',
    backupDayOfMonthLabel: 'Day of Month for Monthly Dispatch',
    backupFormatLabel: 'Backup Format & Security',
    backupFormatStandard: 'Standard Full JSON',
    backupFormatEncrypted: 'Password-Encrypted JSON (AES-256)',
    backupFormatSanitized: 'Sanitized JSON (Exclude API Keys)',
    backupEncryptionPassPlaceholder: 'Enter encryption password for backup file...',
    nextScheduledRunLabel: 'Next scheduled run:',
    backupStatusLabel: 'Auto system status:',
    statusActiveScheduled: 'Active & Monitored',
    statusDisabled: 'Disabled',
    totalAutoBackupsLabel: 'Total Auto-backups Dispatched:',
    sendBackupNowBtn: 'Send User Backup to Telegram',
    sendingBackup: 'Sending backup file to Telegram...',
    backupSentSuccess: 'User backup JSON file was sent to your Telegram successfully!',
    backupSentFailed: 'Failed to send backup file to Telegram',
    totalHabitsCount: 'Total User Habits:',
    exportSummary: 'Includes complete daily logs, streaks, theme and Lally automaticity progress metrics',
    lastBackupSentLabel: 'Last backup sent:',
    neverSent: 'Never sent yet',
    copyBackupJsonBtn: 'Copy User Backup JSON',
    backupCopiedSuccess: 'User backup data copied to clipboard successfully!',
    fullBackupIncludedTitle: 'This backup contains the following user data:',
    fullBackupHabitsIncluded: 'All habits, complete historical logs, colors & notes',
    fullBackupSettingsIncluded: 'Language, theme mode (Light/Dark), wallet & preferences',
    fullBackupTelegramIncluded: 'Telegram bot settings, scheduled reminders & dispatches',
    fullBackupStatsIncluded: 'Brain levels, XP progress snapshot & achievements',
    restorePreviewTitle: 'Backup File Content Preview:',
    restoredHabitsCountLabel: 'Habits count:',
    restoredCheckInsCountLabel: 'Total check-ins:',
    restoredSettingsLabel: 'Theme, language & Telegram configuration will also be restored.',
    restoredNovelsLabel: 'Store novels:',
    // Interactive Telegram Bot
    telegramInteractiveSection: 'Direct Telegram Bot Reports, Stats & Habit Management',
    telegramInteractiveDesc: 'You can request on-demand AI reports, view individual stats per habit, and add or delete habits anytime directly from your Telegram bot.',
    botCommandsTitle: 'Active Telegram Bot Commands:',
    cmdReportDesc: 'Generate and send instant comprehensive AI habit analysis',
    cmdStatsDesc: 'View habit statistics, automaticity percentage & streaks',
    cmdTodayDesc: "Review today's habit checklist and log daily completions",
    cmdHabitsDesc: 'View full habit list and individual statistics per habit',
    cmdAddDesc: 'Add a new habit (e.g. /add Morning Workout)',
    cmdDeleteDesc: 'Delete a habit with interactive confirmation',
    cmdBackupDesc: 'Download data backup JSON file immediately',
    cmdHelpDesc: 'Show bot help guide and interactive quick action buttons',
    cmdTasksDesc: 'View and manage tasks & action items',
    cmdAddTaskDesc: 'Quick add a new task (e.g. /addtask Send project email)',
    cmdWalletDesc: 'Coins balance, reward transactions & log',
    cmdShopDesc: 'Reward store & unlocked web novels and movies',
    cmdAchievementsDesc: 'Hall of Fame, neural badges & brain rank',
    cmdAskDesc: 'Consult AI Neuroscience & Habit Coach',
    cmdFocusDesc: 'Deep focus & Pomodoro protocols guide',
    cmdModelDesc: 'Philippa Lally 66-Day scientific model guide',
    cmdTipsDesc: '3 golden neuroscience habit formation rules',
    setBotMenuBtn: 'Register Bot Commands Menu in Telegram',
    settingBotMenu: 'Registering menu in Telegram...',
    botMenuSetSuccess: 'Bot command menu successfully registered in Telegram!',
    botMenuSetFailed: 'Failed to register bot commands menu',
    botStatusListening: 'Smart bot is active and actively listening for your commands in Telegram 🟢',
    botStatusWaiting: 'Configure Bot Token and Chat ID to enable live bot listening 🟡',
    botPersonaTitle: 'AI Bot Persona & Coaching Tone',
    botPersonaDesc: 'Configure the tone, feedback style, and behavioral guidance delivered by your Telegram AI coach.',
    personaAcademic: '🔬 Academic & Neuroscience',
    personaAcademicDesc: 'Rigorous analysis based on prefrontal cortex biology and Lally model',
    personaCoach: '🔥 High-Energy Motivational Coach',
    personaCoachDesc: 'Enthusiastic, encouraging, builds daily momentum and high morale',
    personaStrict: '⚡ Strict & Direct Accountability',
    personaStrictDesc: 'No-nonsense, candid, direct warnings against procrastination and skips',
    personaZen: '🌿 Mindful & Stoic (Zen)',
    personaZenDesc: 'Calm, balanced, grounded approach focusing on long-term consistency',
    notifyOnTaskCompletionTitle: 'Instant Push Notifications & Web Sync',
    notifyOnTaskCompletionLabel: 'Instant Web Task Completion Notifications',
    notifyOnTaskCompletionDesc: 'Receive a congratulatory message and coin update in Telegram upon completing a task in the web app.',
    notifyOnHabitCheckTitle: 'Instant Habit Check-in Notifications',
    notifyOnHabitCheckLabel: 'Instant Web Habit Check-in Notifications',
    notifyOnHabitCheckDesc: 'Receive an automaticity growth update in Telegram upon checking off a habit in the web app.',
    sendInstantNotificationTestBtn: 'Test Instant Real-Time Push Notification',
    instantNotificationSentSuccess: 'Instant real-time push notification delivered to Telegram successfully!',
    // Pomodoro & Deep Work in Telegram & AI
    pomodoroTelegramSectionTitle: '🍅 Pomodoro, Deep Work & Focus in Telegram & AI',
    pomodoroTelegramSectionDesc: 'Start focus timers, receive session completion alerts with reward coins & XP, and get neuroscience-based focus coaching directly in Telegram.',
    notifyOnPomodoroCompletionLabel: 'Send Pomodoro Completion Alerts to Telegram',
    notifyOnPomodoroCompletionDesc: 'Whenever a focus timer completes in the web app, send congratulatory message, duration, and +5 Coins & +20 XP update to Telegram.',
    enableTelegramPomodoroControlLabel: 'Enable Pomodoro Controls & Timers in Telegram Bot',
    enableTelegramPomodoroControlDesc: 'Start 25m/50m focus sessions directly from Telegram bot with automated completion notifications and interactive buttons.',
    sendPomodoroTestBtn: 'Test Pomodoro Notification in Telegram',
    pomodoroNotificationSentSuccess: 'Test Pomodoro session completion alert sent to Telegram successfully!',
    pomodoroAiCoachTitle: 'AI Deep Work & Pomodoro Coach',
    pomodoroAiCoachDesc: 'Get neuroscience advice on flow state, beating distractions, dopamine regulation, and deep focus from AI.',
    quietHoursTitle: 'Nightly Quiet Hours (Silent Mode)',
    quietHoursDesc: 'Silence all automatic reminders and alerts during your bedtime hours to protect restorative sleep.',
    enableQuietHoursToggle: 'Enable Nightly Quiet Hours',
    quietHoursStartLabel: 'Quiet Hours Start:',
    quietHoursEndLabel: 'Quiet Hours End:',
    openInTelegramBtn: 'Open Bot Directly in Telegram',
    botConnectionLiveStatus: 'Live Server & Bot Connection Status:',
    botLatencyLabel: 'Response Latency (Ping):',
    botUsernameLabel: 'Bot Username:',
    // Smart Reminders & Strict Accountability
    remindersSection: 'Daily Pending Tasks Reminders',
    remindersDesc: 'Set specific hours throughout the day to receive concise, direct Telegram messages listing pending items and today\'s completion progress without unsolicited advice.',
    enableRemindersToggle: 'Enable periodic reminder dispatches to Telegram',
    reminderTimesLabel: 'Daily Reminder Schedules:',
    addReminderTimeBtn: 'Add Schedule Time',
    removeTimeBtn: 'Remove',
    strictWarningSection: 'Nightly Final Warning for Pending Tasks',
    strictWarningDesc: 'Set an end-of-day deadline. If any pending tasks remain, a direct multi-sentence warning containing only the uncompleted items without anything extra is sent to Telegram.',
    enableStrictWarningToggle: 'Enable Nightly Final Warning for Pending Tasks',
    strictWarningTimeLabel: 'Nightly Final Warning Time:',
    sendReminderTestBtn: 'Test Pending Habits Reminder',
    sendStrictWarningTestBtn: 'Test Final Warning Alert',
    reminderSentSuccess: 'Concise tasks reminder delivered to Telegram successfully!',
    strictWarningSentSuccess: 'Final warning for pending tasks delivered to Telegram successfully!',
    // Visual Chart Infographics
    visualChartSectionTitle: 'Individual Habit Matrix Charts & 66-Day Progress',
    visualChartSectionDesc: 'Send individual visual matrix charts for each habit, including automaticity %, 14-day activity heatmap, estimated days to 66 days, and projected completion date.',
    sendVisualChartsToggle: 'Send individual habit matrix and progress charts',
    sendVisualChartTestBtn: 'Test Dispatching Individual Habit Matrices to Telegram',
    visualChartSentSuccess: 'Habit matrix charts delivered to Telegram successfully!',
    cmdChartDesc: '📊 Get individual habit matrix charts & days left to 66-day automaticity',
    // Advanced Settings
    advancedTabTitle: 'Advanced Settings',
    advancedSettingsTitle: 'Advanced System & Behavioral Settings',
    advancedSettingsDesc: 'Configure audio and haptic feedback, scientific habit modeling, strict streak rules, and local storage management.',
    defaultTargetDaysLabel: 'Default Target Days for New Habits',
    defaultTargetDaysDesc: 'Baseline target duration required for habit automaticity (Standard scientific baseline: 66 days by Dr. Lally).',
    feedbackEffectsTitle: 'Audio, Haptic & Celebration Visual Feedback',
    feedbackEffectsDesc: 'Configure multi-sensory feedback upon habit check-in to trigger dopamine and reinforce neural habit loops.',
    soundEffectsLabel: 'Sound Effects on Habit Check-in',
    soundEffectsDesc: 'Play an acoustic confirmation chime whenever a habit is checked in.',
    soundFeedbackLabel: 'Sound Effect on Habit Check-in',
    soundFeedbackDesc: 'Play an acoustic confirmation chime whenever a habit is checked in.',
    hapticFeedbackLabel: 'Haptic / Vibration Feedback',
    hapticFeedbackDesc: 'Trigger subtle tactile feedback on mobile devices and touchpads upon successful check-in.',
    confettiEffectsLabel: '100% Day Completion Confetti Animation',
    confettiEffectsDesc: 'Trigger a celebratory confetti burst when all daily active habits are completed.',
    confettiCelebrationLabel: '100% Day Completion Confetti',
    confettiCelebrationDesc: 'Trigger a celebratory confetti burst when all daily active habits are completed.',
    strictStreakToggleLabel: 'Strict Zero-Tolerance Streak Mode',
    strictStreakToggleDesc: 'If any single active habit is missed in a day, the all-habits streak counter instantly resets to 0.',
    storageManagerTitle: 'Local Storage & Cache Management',
    serverStorageTitle: 'Persistent Server Database & Store Media Management (Termux DB)',
    serverStorageDesc: 'Durable disk persistence for habits, wallet, and media assets with anti-wipe protection across Termux restarts and browser cache clears.',
    persistentDbStatus: 'Persistent Server Database Active & Connected',
    antiWipeStatus: 'Anti-Wipe Safeguard Active',
    dbLocationLabel: 'Database File Path:',
    fileStorageTitle: 'System & Database File Storage Management',
    fileStorageDesc: 'Manage persistent disk database, server backup snapshots, immediate disk sync, and cache control.',
    createSnapshotBtn: 'Create Server Backup Snapshot',
    creatingSnapshot: 'Creating snapshot...',
    createSnapshotSuccess: 'Snapshot successfully recorded to server disk.',
    serverBackupsListTitle: 'Server Backup Snapshots Archive',
    restoreSnapshotBtn: 'Restore Snapshot',
    restoringSnapshot: 'Restoring snapshot...',
    deleteSnapshotBtn: 'Delete',
    deleteSnapshotConfirm: 'Are you sure you want to delete this server snapshot file?',
    storeFilesSectionTitle: 'Store Files & Media Storage Management',
    storeFilesSectionDesc: 'Partitioned server storage architecture for videos, episodes, novels, and store media with auto-scan and direct upload.',
    scanVideosFolderBtn: 'Scan Videos Folder Now',
    scanningVideos: 'Scanning disk...',
    scanVideosSuccess: 'Videos folder scanned successfully and catalog updated.',
    uploadZipBtn: 'Upload ZIP / Episodes',
    uploadingZip: 'Extracting and processing ZIP archive...',
    termuxTransferGuideTitle: 'Direct File Transfer Guide (Termux / Android Offline)',
    termuxTransferGuideDesc: 'You can copy video files or novel chapters directly to the store folders via file manager or Termux terminal, then click "Scan Videos Folder Now".',
    cleanupOrphanFilesBtn: 'Clean Orphan Store Files',
    cleanupOrphanFilesDesc: 'Scan disk media files and safely delete unreferenced videos/images not attached to any product or series.',
    storeFolderExplorerTitle: 'Store Folders & Files Explorer',
    videoFilesCountLabel: 'Total Video Media Files:',
    novelsFilesCountLabel: 'Total Novel Files:',
    storeMediaFoldersTitle: 'Separated Store & Video Media Architecture',
    storeMediaFoldersDesc: 'Store files and video media courses are cleanly partitioned in separate server directories for future video and product sales expansion.',
    videosFolderLabel: 'Videos Folder:',
    novelsFolderLabel: 'Books & Novels Folder:',
    forceSaveDiskBtn: 'Force Save & Sync Database to Disk',
    forceSaveSuccess: 'Database successfully persisted to server disk and backup snapshot created.',
    exportBackupBtn: 'Export Full Database (JSON Backup)',
    importBackupBtn: 'Restore Database from JSON Backup',
    importBackupSuccess: 'Database restored successfully from backup file.',
    storageUsedLabel: 'Browser Local Storage Used:',
    totalDataRecordsLabel: 'Total Database Entries & Check-ins:',
    optimizeCacheBtn: 'Optimize & Flush Cache',
    cacheOptimizedSuccess: 'Local storage cache successfully rebuilt and optimized!',
    systemDiagnosticsTitle: 'System Diagnostics & Info',
    scientificParamsTitle: 'Lally Asymptotic Mathematical Model Parameters',
    scientificParamsDesc: 'Logistic function: Automaticity = 100 / (1 + e^(-k * (t - t0))) with exponential neural growth.',
    testSoundBtn: 'Test Sound',
    testConfettiBtn: 'Test Confetti',
    // Task Management
    tasksNavTitle: 'Tasks & To-Dos',
    habitsNavTitle: '66-Day Habits',
    dailyFocusNavTitle: 'Daily Focus',
    tasksSectionTitle: 'Task Management & Action Items',
    tasksSectionSubtitle: 'Plan, prioritize, track subtasks checklists and earn reward coins upon completion',
    createTaskTitle: 'Create New Task',
    createTaskSubtitle: 'Define your task with priority, due date, subtasks, and custom rewards',
    editTaskTitle: 'Edit Task Details',
    taskTitleLabel: 'Task Title',
    taskTitlePlaceholder: 'e.g. Prepare project proposal, grocery shopping, team call...',
    taskTitleError: 'Please enter a task title',
    taskDescLabel: 'Description & Notes (optional)',
    taskDescPlaceholder: 'Add detailed instructions, links, or notes...',
    taskPriorityLabel: 'Priority Level',
    priorityHigh: 'Urgent & Important (High)',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    taskDueDateLabel: 'Due Date',
    taskDueToday: 'Today',
    taskDueTomorrow: 'Tomorrow',
    taskDueNoDate: 'No Due Date',
    taskCustomDate: 'Custom Date',
    taskDueTimeLabel: 'Due Time (optional)',
    taskCategoryLabel: 'Category / Tag',
    taskCategoryPlaceholder: 'e.g. Work, Personal, Project, Study...',
    taskSubtasksLabel: 'Subtasks / Checklist',
    addSubtaskBtn: 'Add Subtask',
    subtaskPlaceholder: 'Subtask title...',
    taskRewardCoinsLabel: 'Reward Coins (1 to 10)',
    taskRewardXpLabel: 'Reward XP (1 to 5)',
    submitCreateTask: 'Create Task',
    submitSaveTask: 'Save Changes',
    filterTaskAll: 'All Tasks',
    filterTaskPending: 'Pending',
    filterTaskCompleted: 'Completed',
    filterTaskHighPriority: 'High Priority',
    filterTaskToday: 'Due Today',
    tasksDoneSummary: 'Tasks Completed',
    noTasksYet: 'No tasks added yet',
    noTasksFiltered: 'No tasks match this filter',
    noTasksSubtext: 'Create tasks to manage your action items, boost daily productivity, and earn reward coins.',
    quickAddTaskPlaceholder: 'Quick add a new task (press Enter)...',
    deleteTaskConfirm: 'Are you sure you want to delete this task?',
    taskCompletedCelebration: 'Task successfully completed!',
    subtasksCompletedRatio: 'Subtasks Completed:',
    taskDueIn2Days: 'In 2 days',
    taskDueNextWeek: 'Next week (+7d)',
    taskDueNextMonth: 'Next month (+30d)',
    taskDatePickerTitle: 'Select Custom Due Date',
    taskShamsiYear: 'Year',
    taskShamsiMonth: 'Month',
    taskShamsiDay: 'Day',
    taskSelectedDatePreview: 'Selected Due Date:',
    recurringTaskToggle: 'Recurring Task (Repeat Automatically)',
    recurringTaskDesc: 'When checked off, the next due date is automatically calculated for the next cycle.',
    recurrenceFrequencyLabel: 'Repeat Frequency',
    recurrenceDaily: 'Daily (Every day)',
    recurrenceWeekdays: 'Weekdays',
    recurrenceWeekly: 'Weekly',
    recurrenceMonthly: 'Monthly',
    recurrenceCustom: 'Custom Interval',
    recurrenceIntervalLabel: 'Repeat Every:',
    recurrenceDaysOfWeekLabel: 'Repeat on Weekdays:',
    filterTaskRecurring: 'Recurring',
    recurringTaskBadge: 'Recurring',
    recurringCycleCount: 'Cycles Done',
    nextRecurringDueNotice: 'Next Due Date:',
    // Pomodoro & Focus Timer (EN)
    pomodoroNavTitle: 'Pomodoro Timer',
    pomodoroModalTitle: 'Focus Station & Pomodoro Timer',
    pomodoroModalSubtitle: 'Deep work technique, interval time management, and focus logging for habits and tasks',
    pomodoroFocusMode: 'Deep Focus',
    pomodoroShortBreak: 'Short Break',
    pomodoroLongBreak: 'Long Break',
    pomodoroStopwatch: 'Stopwatch',
    pomodoroStart: 'Start Focus',
    pomodoroPause: 'Pause',
    pomodoroResume: 'Resume',
    pomodoroReset: 'Reset',
    pomodoroSkip: 'Skip to Next',
    pomodoroTargetLabel: 'Attach to Habit or Task:',
    pomodoroNoTarget: 'Free Focus (Unassigned)',
    pomodoroHabitsGroup: 'Daily Habits',
    pomodoroTasksGroup: 'Tasks & To-Dos',
    pomodoroManualLogTitle: 'Manual Time & Focus Logging',
    pomodoroManualLogDesc: 'Spent time offline without running the timer? Log focus minutes directly:',
    pomodoroLogMinutesBtn: 'Log Time',
    pomodoroQuickAddMinutes: 'Quick Add:',
    pomodoroCustomMinutes: 'Custom Minutes:',
    pomodoroLoggedSuccess: 'Focus time logged successfully!',
    pomodoroSessionCompleted: '🎉 Focus Interval Completed!',
    pomodoroSessionCompletedDesc: 'Your focus time has been recorded to your progress.',
    pomodoroTodayTotalFocus: "Today's Total Focus:",
    pomodoroTotalFocusAllTime: 'Total Focus Logged:',
    pomodoroSessionsCount: 'Completed Sessions:',
    pomodoroMinutesLabel: 'min',
    pomodoroCoinsEarned: 'Reward Coins',
    pomodoroXpEarned: 'Experience Points (XP)',
    pomodoroMarkHabitDonePrompt: 'Would you like to mark this habit as completed for today?',
    pomodoroMarkTaskDonePrompt: 'Is this task finished? Mark it as complete?',
    pomodoroAmbientSoundLabel: 'Calming Ambient Sound (White Noise):',
    pomodoroSoundNone: 'Mute (No Sound)',
    pomodoroSoundWhiteNoise: 'Soft White Noise',
    pomodoroSoundRain: 'Gentle Rainfall',
    pomodoroSoundTick: 'Mechanical Clock Tick',
    pomodoroSoundLofi: 'Lo-Fi Calming Drone',
    pomodoroHistoryTitle: 'Focus Session History',
    pomodoroNoSessionsYet: 'No focus sessions recorded yet.',
    pomodoroFloatingTimerTip: 'Closing the window keeps the timer running in the mini floating widget.',
    pomodoroQuickTimerBtn: 'Pomodoro / Log Time',
    pomodoroHabitFocusBadge: 'Focus',
    pomodoroTaskFocusBadge: 'Focus',
    pomodoroPreset15: '15 min',
    pomodoroPreset25: '25 min',
    pomodoroPreset45: '45 min',
    pomodoroPreset60: '60 min',
    pomodoroAdd5Min: '+5 min',
    pomodoroSub5Min: '-5 min',
    pomodoroClearHistory: 'Clear History',
    pomodoroSettingsTitle: 'Pomodoro Timing & Reward Settings',
    pomodoroRewardCoinsLabel: 'Reward Coins per 25-min Session',
    pomodoroRewardCoinsDesc: 'Coins awarded after completing at least 25 minutes of focus.',
    pomodoroRewardXpLabel: 'Reward XP per 25-min Session',
    pomodoroRewardXpDesc: 'Experience points (XP) awarded after completing at least 25 minutes of focus.',
    pomodoroMin25MinNotice: 'Reward Rule: Coins and XP are only awarded when at least 25 minutes of focus is completed. Early finish records actual time without bonus.',
    pomodoroEarlyFinishNotice: 'Session ended early before 25 minutes. Actual time recorded without bonus coins or XP.',
    pomodoroFullscreenMode: 'Fullscreen Immersion Mode',
    pomodoroExitFullscreen: 'Exit Fullscreen',
    pomodoroZenFocus: 'Minimal Focus (Distraction-Free)',
    pomodoroDetailedMode: 'Show Details & History',
    pomodoroScreenKeepOn: 'Keep Screen Awake',
    pomodoroScreenKeepOnActive: 'Screen will stay on (Sleep disabled)',
    pomodoroScreenKeepOnDisabled: 'Keep screen awake disabled (Click to enable)',
    pomodoroScreenKeepOnUnsupported: 'Screen keep-awake protection active',
    pomodoroAutoBreakNotice: 'Focus period ended! Break mode has started automatically ☕',
    pomodoroAutoBreakBtn: 'Continue Break',
    pomodoroTabControls: 'Timer & Controls',
    pomodoroTabAnalytics: 'Analytics & History',
    pomodoroTargetCardTitle: 'Focus Session Target',
    pomodoroSoundCardTitle: 'Ambient Soundscapes',
    pomodoroQuickLogCardTitle: 'Quick Focus Logger',
    pomodoroAutomationSettings: 'Automation & Cycle Rules',
    stopwatchRewardCoinsLabel: 'Stopwatch Reward Coins per Minute',
    stopwatchRewardCoinsDesc: 'Coins awarded per 1 minute of stopwatch focus (total reward is rounded to a whole integer).',
    stopwatchRewardXpLabel: 'Stopwatch Reward XP per Minute',
    stopwatchRewardXpDesc: 'XP points awarded per 1 minute of stopwatch focus (total reward is rounded to a whole integer).',
    pomodoroFinishStopwatch: 'Finish & Record Session',
    pomodoroFinishStopwatchDesc: 'Finish stopwatch, save to history and statistics, and award rounded integer coins & XP',
    pomodoroSkipSessionNotice: 'Session skipped. Actual elapsed time was logged to history and stats without coin/XP bonus.',
    pomodoroResetNoSaveTooltip: 'Reset timer (without saving to history)',
    pomodoroIntegerRewardNotice: 'All earned focus rewards are rounded to a whole integer without decimals.',
  },
};

export function formatNumber(num: number | string | null | undefined, lang: Language): string {
  if (num === null || num === undefined) {
    return lang === 'fa' ? '۰' : lang === 'ar' ? '٠' : '0';
  }
  if (typeof num === 'number' && (isNaN(num) || !isFinite(num))) {
    return lang === 'fa' ? '۰' : lang === 'ar' ? '٠' : '0';
  }
  if (typeof num === 'string') {
    const trimmed = num.trim();
    if (
      trimmed === '' ||
      trimmed.toLowerCase() === 'nan' ||
      trimmed.toLowerCase() === 'undefined' ||
      trimmed.toLowerCase() === 'null'
    ) {
      return lang === 'fa' ? '۰' : lang === 'ar' ? '٠' : '0';
    }
  }
  if (lang === 'fa') {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/[0-9]/g, (w) => farsiDigits[+w]);
  }
  if (lang === 'ar') {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
  }
  return String(num);
}

export function getLocalizedDate(lang: Language): { weekday: string; dayMonthYear: string } {
  const now = new Date();
  const locale = lang === 'fa' ? 'fa-IR' : lang === 'ar' ? 'ar-SA' : 'en-US';
  
  try {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now);
    const dayMonthYear = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
    return { weekday, dayMonthYear };
  } catch {
    return {
      weekday: now.toLocaleDateString(),
      dayMonthYear: now.toLocaleDateString(),
    };
  }
}

export function truncateTitleByWords(title: string, maxWords: number = 6, maxChars: number = 40): string {
  if (!title) return '';
  const trimmed = title.trim();
  const words = trimmed.split(/\s+/);
  
  if (words.length <= maxWords && trimmed.length <= maxChars) {
    return trimmed;
  }
  
  let truncatedByWord = words.slice(0, maxWords).join(' ');
  if (truncatedByWord.length > maxChars) {
    truncatedByWord = truncatedByWord.slice(0, maxChars).trim();
  }
  return `${truncatedByWord}...`;
}

