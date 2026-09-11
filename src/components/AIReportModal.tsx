import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Quote, 
  Lightbulb, 
  TrendingUp, 
  Zap,
  Settings,
  Bot,
  Calculator,
  Key,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ShieldCheck,
  Globe,
  Sliders,
  Brain,
  CheckSquare,
  Clock,
  Target,
  ShieldAlert,
  MessageSquare,
  SendHorizontal,
  Trash2,
  Activity,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';
import { Habit, Language, TelegramConfig, AIReportData, AIConfigurationSettings, AIKeyConfig, AIServiceProvider, Task, UserWallet } from '../types';
import { translations, formatNumber } from '../utils/translations';
import { calculateHabitStats } from '../utils/habitMath';
import { getTodayString } from '../utils/persianDate';
import { safeClipboardCopy } from '../utils/safeDom';
import { 
  getStoredSectionAIKeys, 
  getStoredAdvancedAIConfig, 
  saveStoredAdvancedAIConfig,
  detectAIProviderFromKey,
  testAIKeyConnection,
  PROVIDER_METADATA 
} from '../utils/aiKeyManager';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  tasks?: Task[];
  wallet?: UserWallet;
  language: Language;
  telegramConfig: TelegramConfig;
  aiConfig?: AIConfigurationSettings;
  onUpdateAiConfig?: (newAiConfig: AIConfigurationSettings) => void;
  onOpenSettings?: (initialTab?: 'general' | 'telegram' | 'backup' | 'advanced') => void;
}

export const AIReportModal: React.FC<AIReportModalProps> = ({
  isOpen,
  onClose,
  habits,
  tasks = [],
  wallet,
  language,
  telegramConfig,
  aiConfig,
  onUpdateAiConfig,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'habits' | 'tasks' | 'cognitive' | 'coach'>('habits');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  // Ask AI Coach interactive state
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isAskingCoach, setIsAskingCoach] = useState(false);
  const [coachHistory, setCoachHistory] = useState<Array<{ q: string; a: string; time: string }>>([]);

  // In-modal Key Configuration State
  const [showKeyManager, setShowKeyManager] = useState(false);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [inlineProvider, setInlineProvider] = useState<AIServiceProvider | 'auto'>('auto');
  const [inlineDetectedProvider, setInlineDetectedProvider] = useState<AIServiceProvider | null>(null);
  const [inlineDetectionMessage, setInlineDetectionMessage] = useState<string | null>(null);
  const [showKeyText, setShowKeyText] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const t = translations[language];

  // Retrieve active AI keys strictly from latest storage and props
  const getActiveKeys = (): AIKeyConfig[] => {
    const collected: AIKeyConfig[] = [];

    // 1. Direct props analyticsAI & translationAI
    if (aiConfig?.analyticsAI?.keys && Array.isArray(aiConfig.analyticsAI.keys)) {
      collected.push(...aiConfig.analyticsAI.keys);
    }
    if (aiConfig?.translationAI?.keys && Array.isArray(aiConfig.translationAI.keys)) {
      collected.push(...aiConfig.translationAI.keys);
    }

    // 2. Stored section keys
    try {
      const storedAnalytics = getStoredSectionAIKeys('analyticsAI');
      if (storedAnalytics && Array.isArray(storedAnalytics)) {
        collected.push(...storedAnalytics);
      }
      const storedTranslation = getStoredSectionAIKeys('translationAI');
      if (storedTranslation && Array.isArray(storedTranslation)) {
        collected.push(...storedTranslation);
      }
    } catch (e) {
      console.warn('Error reading stored keys:', e);
    }

    // 3. Fallback to full advanced config
    try {
      const adv = getStoredAdvancedAIConfig();
      if (adv?.analyticsAI?.keys && Array.isArray(adv.analyticsAI.keys)) {
        collected.push(...adv.analyticsAI.keys);
      }
      if (adv?.translationAI?.keys && Array.isArray(adv.translationAI.keys)) {
        collected.push(...adv.translationAI.keys);
      }
    } catch (e) {
      console.warn('Error reading advanced AI config:', e);
    }

    // 4. Check legacy and direct localStorage keys
    try {
      ['lally_ai_keys', 'lally_api_keys', 'gemini_api_key', 'ai_api_key'].forEach((storageKey) => {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          if (raw.startsWith('[') || raw.startsWith('{')) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) collected.push(...parsed);
              else if (parsed && typeof parsed === 'object' && parsed.key) collected.push(parsed);
            } catch {}
          } else if (raw.trim()) {
            collected.push({
              id: `legacy-${Date.now()}`,
              key: raw.trim(),
              provider: 'gemini',
              name: 'Saved Key',
              isValid: true,
              createdAt: Date.now(),
            });
          }
        }
      });
    } catch {}

    // Deduplicate by clean key string
    const seen = new Set<string>();
    const valid: AIKeyConfig[] = [];
    for (const item of collected) {
      if (item && typeof item.key === 'string' && item.key.trim().length > 0) {
        const cleanKey = item.key.trim();
        if (!seen.has(cleanKey)) {
          seen.add(cleanKey);
          const detected = detectAIProviderFromKey(cleanKey);
          valid.push({
            id: item.id || `key-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: item.createdAt || Date.now(),
            ...item,
            key: cleanKey,
            provider: (item.provider && item.provider !== 'unknown') ? item.provider : (detected.provider || 'gemini'),
          });
        }
      }
    }

    return valid;
  };

  // Handle live typing in key input
  const handleKeyInputChange = (val: string) => {
    setInlineKeyInput(val);
    setKeyTestResult(null);
    if (!val.trim()) {
      setInlineDetectedProvider(null);
      setInlineDetectionMessage(null);
      return;
    }

    const detected = detectAIProviderFromKey(val);
    if (detected.isRecognized && detected.provider) {
      setInlineDetectedProvider(detected.provider);
      setInlineProvider(detected.provider);
      setInlineDetectionMessage(isFa ? detected.messageFa : detected.messageEn);
    } else {
      setInlineDetectedProvider(null);
      setInlineDetectionMessage(
        isFa 
          ? '⚠️ کلید شناسایی نشد. لطفاً ارائه‌دهنده را دستی انتخاب کنید.' 
          : isAr 
          ? '⚠️ لم يتم التعرف على المزود تلقائياً.' 
          : '⚠️ Provider not recognized. Please select manually.'
      );
      if (inlineProvider === 'auto') {
        setInlineProvider('gemini');
      }
    }
  };

  // Test the key in modal
  const handleTestInlineKey = async () => {
    const key = inlineKeyInput.trim();
    if (!key) return;
    const providerToUse = inlineProvider === 'auto' ? (inlineDetectedProvider || 'gemini') : inlineProvider;
    setIsTestingKey(true);
    setKeyTestResult(null);
    try {
      const res = await testAIKeyConnection(key, providerToUse);
      setKeyTestResult({
        success: res.success,
        message: res.message,
        latency: res.latencyMs,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Save the key and trigger AI report immediately
  const handleSaveKeyAndAnalyze = async () => {
    const key = inlineKeyInput.trim();
    if (!key) {
      await fetchAIReport(false);
      return;
    }

    const providerToUse = inlineProvider === 'auto' ? (inlineDetectedProvider || 'gemini') : inlineProvider;
    const newKeyObj: AIKeyConfig = {
      id: `ai-key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key,
      provider: providerToUse,
      name: `${PROVIDER_METADATA[providerToUse]?.name || 'AI'} Key`,
      isValid: keyTestResult ? keyTestResult.success : true,
      lastChecked: Date.now(),
      createdAt: Date.now(),
    };

    try {
      const currentFullConfig = getStoredAdvancedAIConfig();
      const existingKeys = currentFullConfig.analyticsAI?.keys || [];
      const updatedKeys = [newKeyObj, ...existingKeys.filter(k => k.key.trim() !== key)];
      
      const updatedFullConfig: AIConfigurationSettings = {
        ...currentFullConfig,
        analyticsAI: {
          ...currentFullConfig.analyticsAI,
          keys: updatedKeys,
          autoFallback: true,
        },
      };

      saveStoredAdvancedAIConfig(updatedFullConfig);
      if (onUpdateAiConfig) {
        onUpdateAiConfig(updatedFullConfig);
      }
    } catch (e) {
      console.warn('Failed to save AI config:', e);
    }

    setShowKeyManager(false);
    setInlineKeyInput('');
    setKeyTestResult(null);

    await fetchAIReport(false, [newKeyObj]);
  };

  // Main Report Fetcher
  const fetchAIReport = async (sendToTelegram = false, explicitKeys?: AIKeyConfig[]) => {
    setLoading(true);
    setError(null);
    setTelegramStatus(null);

    const todayStr = getTodayString();
    const habitsSummary = (habits || []).map((h) => {
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
      let activeKeys = explicitKeys && explicitKeys.length > 0 ? explicitKeys : [];
      if (activeKeys.length === 0 && inlineKeyInput.trim()) {
        const prov = inlineProvider === 'auto' ? (inlineDetectedProvider || 'gemini') : inlineProvider;
        activeKeys = [{
          id: `temp-${Date.now()}`,
          key: inlineKeyInput.trim(),
          provider: prov,
          name: `${PROVIDER_METADATA[prov]?.name || 'AI'} Key`,
          isValid: true,
          createdAt: Date.now(),
        }];
      }

      if (activeKeys.length === 0) {
        activeKeys = getActiveKeys();
      }

      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitsSummary,
          habits: habits || [],
          tasks: tasks || [],
          wallet,
          language,
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          sendToTelegram,
          sendVisualCharts: telegramConfig.sendVisualCharts ?? true,
          dateFormatted: todayStr,
          aiKeys: activeKeys,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.report) {
        setReport(data.report);
        if (data.report.aiError && data.report.generationEngine === 'math') {
          // AI attempted but failed, informative warning
          console.warn('AI Execution warning:', data.report.aiError);
        }
        if (sendToTelegram) {
          if (data.telegramSent) {
            setTelegramStatus(t.sendToTelegramSuccess);
          } else {
            setTelegramStatus(data.telegramError || t.sendToTelegramFailed);
          }
        }
      } else {
        setError(data.error || (isFa ? 'خطا در برقراری ارتباط با سرویس هوش مصنوعی' : 'AI Communication Error'));
      }
    } catch (err: any) {
      setError(err.message || (isFa ? 'خطا در دریافت گزارش هوش مصنوعی' : 'Error fetching AI report'));
    } finally {
      setLoading(false);
      setIsSendingTelegram(false);
    }
  };

  // Interactive Ask AI Coach handler
  const handleAskAICoach = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = coachQuestion.trim();
    if (!q) return;

    setIsAskingCoach(true);
    setCoachResponse(null);

    try {
      const activeKeys = getActiveKeys();
      const res = await fetch('/api/ai/coach/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          habits: habits || [],
          tasks: tasks || [],
          wallet,
          language,
          aiKeys: activeKeys,
        }),
      });

      const data = await res.json();
      const reply = data.answer || data.reply || data.response;
      if (res.ok && data.success && reply) {
        setCoachResponse(reply);
        setCoachHistory(prev => [{ q, a: reply, time: new Date().toLocaleTimeString(language === 'fa' ? 'fa-IR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) }, ...prev]);
        setCoachQuestion('');
      } else {
        setCoachResponse(data.error || (isFa ? 'پاسخی از هوش مصنوعی دریافت نشد.' : 'No response from AI.'));
      }
    } catch (err: any) {
      setCoachResponse(err.message || (isFa ? 'خطا در ارتباط با مربی هوش مصنوعی' : 'Error connecting to AI Coach'));
    } finally {
      setIsAskingCoach(false);
    }
  };

  // Reset stored cognitive profile
  const handleResetCognitiveProfile = async () => {
    if (!window.confirm(isFa ? 'آیا از پاکسازی حافظه شناختی هوش مصنوعی اطمینان دارید؟' : 'Are you sure you want to reset the AI cognitive memory profile?')) {
      return;
    }
    try {
      await fetch('/api/ai/cognitive-profile/reset', { method: 'POST' });
      await fetchAIReport(false);
    } catch (e) {
      console.warn('Failed to reset cognitive profile:', e);
    }
  };

  useEffect(() => {
    if (isOpen && !report && !loading) {
      fetchAIReport(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentKeys = getActiveKeys();
  const hasActiveKey = currentKeys.length > 0;

  const handleCopyText = () => {
    if (!report) return;
    let fullText = `${report.title}\n\n${report.overview}\n\n`;
    if (report.habitFeedback?.length) {
      fullText += report.habitFeedback
        .map((h) => `• ${h.name} [${h.status}]: ${h.critiqueAndTip}`)
        .join('\n') + '\n\n';
    }
    if (report.tasksFeedback) {
      fullText += `Executive Tasks: ${report.tasksFeedback.completionRate}%\n${report.tasksFeedback.overdueAnalysis}\nTip: ${report.tasksFeedback.procrastinationTip}\n\n`;
    }
    if (report.generalCritique) {
      fullText += `${t.generalCritiqueTitle}\n${report.generalCritique}\n\n`;
    }
    if (report.actionableTips?.length) {
      fullText += `${t.actionableTipsTitle}\n` + report.actionableTips.map((tip) => `- ${tip}`).join('\n') + '\n\n';
    }
    if (report.motivationalQuote) {
      fullText += `${t.motivationalQuoteTitle}\n"${report.motivationalQuote}"\n`;
    }

    safeClipboardCopy(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendToTelegram = async () => {
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      setTelegramStatus(
        isFa
          ? 'لطفاً ابتدا در بخش تنظیمات، توکن ربات و شناسه چت را وارد کنید.'
          : isAr
          ? 'يرجى إدخال توكن البوت ومعرف المحادثة في الإعدادات أولاً.'
          : 'Please set your Bot Token and Chat ID in Settings first.'
      );
      return;
    }

    setIsSendingTelegram(true);
    await fetchAIReport(true);
  };

  const activeProviderMeta = PROVIDER_METADATA[inlineProvider === 'auto' ? (inlineDetectedProvider || 'gemini') : inlineProvider];
  const cognitiveProfile = report?.userCognitiveProfile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        id="ai-report-modal-content"
        dir={t.dir}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{isFa ? 'سیستم هوشمند تحلیل جامع رفتار و یادگیری' : t.aiReportModalTitle}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                  Lally 2010 + Memory
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {isFa 
                  ? 'یادگیری الگوهای رفتاری، تحلیل هم‌افزایی عادات و تسک‌ها و مربی‌گری اختصاصی'
                  : t.aiReportModalSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyManager(!showKeyManager)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                hasActiveKey 
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
              title={hasActiveKey ? (isFa ? 'کلیدهای فعال بخش تحلیل داده در تنظیمات پیشرفته (با قابلیت جایگزینی خودکار)' : 'Active Analytics Keys with automatic failover') : (isFa ? 'افزودن کلید هوش مصنوعی' : 'Add AI Key')}
            >
              <Key className="w-3.5 h-3.5" />
              <span>
                {hasActiveKey 
                  ? `${formatNumber(currentKeys.length, language)} ${isFa ? 'کلید تحلیل فعال' : 'Active Keys'}` 
                  : (isFa ? 'افزودن کلید' : 'Add Key')}
              </span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-4 overflow-x-auto text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('habits')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'habits'
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isFa ? 'تحلیل عادات و علوم اعصاب' : 'Habits Analysis'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isFa ? 'تسک‌ها و زمان‌بندی اجرایی' : 'Executive Tasks'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cognitive')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cognitive'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{isFa ? 'حافظه و پروفایل شناختی' : 'Cognitive Memory'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coach')}
            className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'coach'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isFa ? 'پرسش از مربی هوش مصنوعی' : 'Ask AI Coach'}</span>
          </button>
        </div>

        {/* Telegram feedback status */}
        {telegramStatus && (
          <div className="p-3 mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{telegramStatus}</span>
          </div>
        )}

        {/* Inline AI Key Management Box */}
        {showKeyManager && (
          <div className="p-4 mb-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5 animate-in slide-in-from-top-2 duration-200 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                  {isFa ? 'ثبت و اتصال کلید هوش مصنوعی (API Key)' : 'Connect AI API Key'}
                </h3>
              </div>
              {activeProviderMeta?.url && (
                <a
                  href={activeProviderMeta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                >
                  {isFa ? `دریافت کلید ${activeProviderMeta.name}` : `Get ${activeProviderMeta.name} Key`}
                </a>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {isFa 
                ? 'کلید هوش مصنوعی پلتفرم دلخواه (Google Gemini, OpenAI, DeepSeek, Groq, Anthropic و ...) را وارد کنید تا هوش مصنوعی با بهره‌گیری از تمام سوابق، تسک‌ها و عادات شما تحلیل دقیق تولید کند.'
                : 'Enter your AI API Key to generate advanced behavioral neuroscience analysis.'}
            </p>

            <div className="relative">
              <input
                type={showKeyText ? 'text' : 'password'}
                value={inlineKeyInput}
                onChange={(e) => handleKeyInputChange(e.target.value)}
                placeholder={isFa ? 'کلید API خود را اینجا جای‌گذاری (Paste) کنید...' : 'Paste your API key here...'}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {isFa ? 'ارائه‌دهنده:' : 'Provider:'}
                </span>
                <select
                  value={inlineProvider}
                  onChange={(e) => setInlineProvider(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value="auto">{isFa ? '🔍 تشخیص خودکار' : 'Auto Detect'}</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="mistral">Mistral AI</option>
                  <option value="together">Together AI</option>
                  <option value="xai">xAI Grok</option>
                </select>
              </div>

              {inlineDetectionMessage && (
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
                  {inlineDetectionMessage}
                </span>
              )}
            </div>

            {keyTestResult && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                keyTestResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {keyTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{keyTestResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 flex-wrap justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestInlineKey}
                  disabled={isTestingKey || !inlineKeyInput.trim()}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isTestingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{isTestingKey ? (isFa ? 'در حال تست...' : 'Testing...') : (isFa ? 'تست اتصال' : 'Test Key')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveKeyAndAnalyze}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isFa ? 'ذخیره و تحلیل جامع با هوش مصنوعی' : 'Save & Analyze with AI'}</span>
                </button>
              </div>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings('advanced');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isFa ? 'تنظیمات پیشرفته چند کلیدی' : 'Advanced Multi-Key Settings'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="text-xs font-bold">{t.generatingAiReport}</p>
            <span className="text-[11px] text-slate-400">
              {isFa ? 'در حال پردازش داده‌های عادات، تسک‌ها، زمان‌بندی‌ها و به‌روزرسانی حافظه شناختی...' : 'Analyzing habit automaticity curves & executive tasks...'}
            </span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/70 text-rose-800 dark:text-rose-200 text-xs space-y-3.5 mb-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <p className="font-bold text-sm text-rose-950 dark:text-rose-100">
                  {isFa ? 'خطا در برقراری ارتباط با سرویس هوش مصنوعی' : 'AI Communication Error'}
                </p>
                <p className="leading-relaxed text-rose-800 dark:text-rose-200 opacity-95 break-words">{error}</p>
              </div>
            </div>

            {/* Inline Quick Key Input directly inside error state for effortless fix */}
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-200/80 dark:border-rose-900/50 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-rose-500" />
                <span>{isFa ? 'بررسی یا وارد کردن کلید هوش مصنوعی (Gemini / OpenAI / DeepSeek / Groq):' : 'Verify or Enter AI API Key:'}</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="password"
                  value={inlineKeyInput}
                  onChange={(e) => handleKeyInputChange(e.target.value)}
                  placeholder={isFa ? 'کلید API خود را اینجا جای‌گذاری نمایید (مثل AIzaSy... یا gsk_... یا sk-...)' : 'Paste your API key here (AIzaSy... or gsk_... or sk-...)'}
                  className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  dir="ltr"
                />
                {inlineKeyInput.trim() && (
                  <button
                    type="button"
                    onClick={handleTestInlineKey}
                    disabled={isTestingKey}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isTestingKey ? 'animate-spin' : ''}`} />
                    <span>{isFa ? 'تست کلید' : 'Test'}</span>
                  </button>
                )}
                {inlineKeyInput.trim() && (
                  <button
                    type="button"
                    onClick={handleSaveKeyAndAnalyze}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isFa ? 'ذخیره و تحلیل' : 'Save & Analyze'}</span>
                  </button>
                )}
              </div>

              {keyTestResult && (
                <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${keyTestResult.success ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200'}`}>
                  {keyTestResult.success ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{keyTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2.5 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setReport(null);
                  fetchAIReport(false);
                }}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{isFa ? 'تلاش مجدد برای ارتباط با هوش مصنوعی' : 'Retry AI Connection'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowKeyManager(!showKeyManager)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isFa ? 'مدیریت کلیدهای پیشرفته' : 'Advanced Key Manager'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Areas */}
        {!loading && report && (
          <div className="space-y-4 flex-1">
            {/* AI Warning Banner if generated via Math fallback */}
            {report.generationEngine === 'math' && (report as any).aiError && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    {isFa 
                      ? 'تحلیل آفلاین بر پایه مدل علمی لالی نمایش داده شد. در صورت تمایل می‌توانید کلید هوش مصنوعی را تست یا مجدداً تلاش کنید.' 
                      : 'Offline mathematical analysis displayed. You may verify AI keys or retry.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setError(null);
                    fetchAIReport(false);
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isFa ? 'تلاش مجدد با هوش مصنوعی' : 'Retry AI'}</span>
                </button>
              </div>
            )}

            {/* Top Engine Badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {report.generationEngine === 'ai' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-100/90 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 text-[11px] font-bold shadow-2xs">
                  <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    {isFa
                      ? `🤖 تحلیل شده با هوش مصنوعی و یادگیری عمیق (${report.providerUsed || 'AI'}${report.modelUsed ? ' - ' + report.modelUsed : ''})`
                      : `🤖 Analyzed by Artificial Intelligence (${report.providerUsed || 'AI'})`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shadow-2xs">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {isFa
                        ? '🧮 الگوریتم ریاضی و ماتریس رفتاری لالی (آفلاین)'
                        : '🧮 Mathematical Behavioral Matrix (Offline)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKeyManager(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-purple-500" />
                    <span>{isFa ? 'اتصال کلید هوش مصنوعی اختصاصی' : 'Connect Custom AI Key'}</span>
                  </button>
                </div>
              )}

              {cognitiveProfile?.holisticMasteryIndex !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {isFa ? `شاخص تسلط رفتاری: ${formatNumber(cognitiveProfile.holisticMasteryIndex, language)}٪` : `Mastery Index: ${cognitiveProfile.holisticMasteryIndex}%`}
                  </span>
                </div>
              )}
            </div>

            {/* TAB 1: Habits & Neuroscience Analysis */}
            {activeTab === 'habits' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Title & Overview Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-sm sm:text-base mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>{report.title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {report.overview}
                  </p>
                </div>

                {/* Habit Feedback List */}
                {report.habitFeedback && report.habitFeedback.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                      {isFa ? 'تحلیل تخصصی وضعیت نورونی عادات:' : 'Habits Neural Feedback:'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {report.habitFeedback.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-950/70 space-y-1.5 shadow-2xs transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {item.name}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                item.status === 'automatic'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/60'
                                  : item.status === 'warning'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800/60'
                                  : item.status === 'improving'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 dark:border dark:border-blue-800/60'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/60'
                              }`}
                            >
                              {item.status === 'automatic'
                                ? (isFa ? '🏆 تثبیت ناخودآگاه' : '🏆 Automatic')
                                : item.status === 'warning'
                                ? (isFa ? '⚠️ خطر افت زنجیره' : '⚠️ Warning')
                                : item.status === 'improving'
                                ? (isFa ? '🚀 در حال میلین‌سازی' : '🚀 Improving')
                                : (isFa ? '🔹 شکل‌گیری اولیه' : '🔹 Steady')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.critiqueAndTip}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Critique */}
                {report.generalCritique && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-950/70 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{t.generalCritiqueTitle}</span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {report.generalCritique}
                    </p>
                  </div>
                )}

                {/* Actionable Tips */}
                {report.actionableTips && report.actionableTips.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 shadow-2xs">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{t.actionableTipsTitle}</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {report.actionableTips.map((tip, idx) => (
                        <li key={idx} className="text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Motivational Quote */}
                {report.motivationalQuote && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-950 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 relative shadow-2xs">
                    <Quote className="w-6 h-6 text-indigo-300 dark:text-indigo-600 absolute top-3 left-3 opacity-30" />
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
                      <span>{t.motivationalQuoteTitle}</span>
                    </h4>
                    <p className="text-xs sm:text-sm font-medium italic text-indigo-950 dark:text-indigo-100 leading-relaxed pt-1">
                      « {report.motivationalQuote} »
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Tasks & Executive Function Analysis */}
            {activeTab === 'tasks' && (
              <div className="space-y-4 animate-in fade-in">
                {report.tasksFeedback ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 font-bold text-sm">
                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{isFa ? 'تحلیل عملکرد اجرایی و نرخ تکمیل تسک‌ها' : 'Executive Tasks Analysis'}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                        {isFa ? `${formatNumber(report.tasksFeedback.completionRate, language)}٪ تکمیل` : `${report.tasksFeedback.completionRate}% Done`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                      {report.tasksFeedback.overdueAnalysis}
                    </p>

                    <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700 dark:text-slate-200">
                        <strong className="text-blue-900 dark:text-blue-300 block mb-0.5">
                          {isFa ? 'راهکار غلبه بر اهمال‌کاری:' : 'Procrastination Antidote:'}
                        </strong>
                        <p className="leading-relaxed">{report.tasksFeedback.procrastinationTip}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
                    {isFa ? 'اطلاعات تحلیلی تسک‌ها در حال حاضر در دسترس نیست.' : 'No tasks feedback available.'}
                  </div>
                )}

                {/* Circadian & Peak Hours card */}
                {cognitiveProfile?.circadianProductivity && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span>{isFa ? 'پنجره‌های زمانی بهره‌وری و ریتم بیولوژیکی (Circadian Rhythm)' : 'Circadian Productivity Windows'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          {isFa ? '⚡ ساعات اوج تمرکز' : 'Peak Hours'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cognitiveProfile.circadianProductivity.peakHours}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          {isFa ? '📅 روزهای پربازده' : 'Best Days'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cognitiveProfile.circadianProductivity.bestDays}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">
                          {isFa ? '⚠️ ساعات پرریسک افت انرژی' : 'High Risk Window'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cognitiveProfile.circadianProductivity.highRiskTimeframe}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: AI Learned Cognitive Profile & Memory */}
            {activeTab === 'cognitive' && (
              <div className="space-y-4 animate-in fade-in">
                {cognitiveProfile ? (
                  <>
                    {/* Top Stats Overview */}
                    <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
                      <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block mb-1">
                          {isFa ? 'هم‌افزایی عادت و تسک' : 'Synergy Score'}
                        </span>
                        <span className="text-base font-black text-purple-900 dark:text-purple-100">
                          {formatNumber(cognitiveProfile.taskHabitSynergyScore || 0, language)}٪
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mb-1">
                          {isFa ? 'ریسک تعویق و خستگی' : 'Procrastination Risk'}
                        </span>
                        <span className="text-base font-black text-amber-900 dark:text-amber-100">
                          {formatNumber(cognitiveProfile.procrastinationRiskIndex || 0, language)}٪
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mb-1">
                          {isFa ? 'شاخص تسلط جامع' : 'Holistic Mastery'}
                        </span>
                        <span className="text-base font-black text-emerald-900 dark:text-emerald-100">
                          {formatNumber(cognitiveProfile.holisticMasteryIndex || 0, language)}٪
                        </span>
                      </div>
                    </div>

                    {/* Learned User Patterns */}
                    {cognitiveProfile.learnedUserPatterns && cognitiveProfile.learnedUserPatterns.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span>{isFa ? 'الگوهای رفتاری ثبت‌شده در حافظه هوش مصنوعی:' : 'Learned User Patterns:'}</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {cognitiveProfile.learnedUserPatterns.map((pat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-purple-500 font-bold">•</span>
                              <span className="leading-relaxed">{pat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Strengths & Vulnerabilities */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {cognitiveProfile.cognitiveStrengths && cognitiveProfile.cognitiveStrengths.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                          <h5 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{isFa ? 'نقاط قوت شناختی شما:' : 'Cognitive Strengths:'}</span>
                          </h5>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                            {cognitiveProfile.cognitiveStrengths.map((str, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span className="leading-relaxed">{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {cognitiveProfile.vulnerabilityTriggers && cognitiveProfile.vulnerabilityTriggers.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-2">
                          <h5 className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>{isFa ? 'محرک‌های آسیب‌پذیری و افت:' : 'Vulnerability Triggers:'}</span>
                          </h5>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                            {cognitiveProfile.vulnerabilityTriggers.map((vul, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-rose-600 font-bold">•</span>
                                <span className="leading-relaxed">{vul}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Tailored Neuro Hacks */}
                    {cognitiveProfile.tailoredNeuroHacks && cognitiveProfile.tailoredNeuroHacks.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2">
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>{isFa ? 'هک‌های علوم اعصاب سفارشی‌سازی‌شده برای شما:' : 'Tailored Neuro-Hacks:'}</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {cognitiveProfile.tailoredNeuroHacks.map((hack, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span className="leading-relaxed">{hack}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Personal Advice */}
                    {cognitiveProfile.personalAdvice && (
                      <div className="p-4 rounded-2xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          <span>{isFa ? 'نصیحت و مربی‌گری اختصاصی هوش مصنوعی:' : 'Personalized AI Guidance:'}</span>
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {cognitiveProfile.personalAdvice}
                        </p>
                      </div>
                    )}

                    {/* Reset AI Memory Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleResetCognitiveProfile}
                        className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isFa ? 'پاکسازی و بازنشانی حافظه شناختی هوش مصنوعی' : 'Reset AI Memory Profile'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isFa ? 'پروفایل شناختی هنوز تولید نشده است. یک بار گزارش را به‌روزرسانی فرمایید.' : 'No cognitive profile available yet. Regenerate the report.'}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Ask AI Coach Assistant */}
            {activeTab === 'coach' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {isFa 
                    ? '💡 از مربی هوش مصنوعی هر سؤالی درباره موانع، زمان‌بندی، خستگی، نحوه ساخت عادات یا اولویت‌بندی تسک‌هایتان بپرسید. مربی با تسلط بر تمام سوابق شما پاسخ می‌دهد.'
                    : 'Ask your AI Habit Coach any question regarding your current routine, obstacles, or neuroplastic strategies.'}
                </div>

                <form onSubmit={handleAskAICoach} className="space-y-2">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={coachQuestion}
                      onChange={(e) => setCoachQuestion(e.target.value)}
                      placeholder={isFa ? 'مثال: چطور وقتی خسته‌ام عادت ورزش روزانه را حفظ کنم؟ یا چطور تسک‌های عقب‌افتاده‌ام را بدون استرس جمع کنم؟' : 'Ask your dilemma...'}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isAskingCoach || !coachQuestion.trim()}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
                    >
                      {isAskingCoach ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal className="w-3.5 h-3.5" />}
                      <span>{isAskingCoach ? (isFa ? 'در حال پاسخ...' : 'Thinking...') : (isFa ? 'ارسال به مربی هوش مصنوعی' : 'Ask Coach')}</span>
                    </button>
                  </div>
                </form>

                {/* Coach Response Display */}
                {coachResponse && (
                  <div className="p-4 rounded-2xl bg-purple-50/90 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 text-xs font-bold">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{isFa ? 'پاسخ مربی علوم اعصاب:' : 'Coach Response:'}</span>
                    </div>
                    <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {coachResponse}
                    </div>
                  </div>
                )}

                {/* Question History */}
                {coachHistory.length > 1 && (
                  <div className="space-y-3 pt-2">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {isFa ? 'پرسش‌های پیشین این جلسه:' : 'Session History:'}
                    </h5>
                    {coachHistory.slice(1).map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <strong>Q: {item.q}</strong>
                          <span>{item.time}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              id="refresh-ai-report-btn"
              type="button"
              onClick={() => fetchAIReport(false)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isFa ? 'تحلیل مجدد' : isAr ? 'تحديث التقرير' : 'Regenerate'}</span>
            </button>

            {report && (
              <button
                id="copy-ai-report-btn"
                type="button"
                onClick={handleCopyText}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.reportCopied : t.copyReportBtn}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {telegramConfig.botToken && telegramConfig.chatId && (
              <button
                id="send-report-to-tg-btn"
                type="button"
                onClick={handleSendToTelegram}
                disabled={isSendingTelegram || loading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSendingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isFa ? 'ارسال به تلگرام' : isAr ? 'إرسال إلى تيليجرام' : 'Send to Telegram'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
