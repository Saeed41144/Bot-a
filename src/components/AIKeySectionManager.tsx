import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Layers, 
  Eye, 
  EyeOff, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  MoveUp, 
  MoveDown, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  Cpu,
  Bot,
  Globe,
  Sliders,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  AIServiceProvider, 
  AIKeyConfig, 
  AISettingsSection, 
  Language 
} from '../types';
import { 
  PROVIDER_METADATA, 
  detectAIProviderFromKey, 
  fetchModelsForProvider, 
  testAIKeyConnection,
  getStoredAdvancedAIConfig,
  saveStoredAdvancedAIConfig
} from '../utils/aiKeyManager';
import { translations, formatNumber } from '../utils/translations';
import { ResolvedAppearance } from '../utils/themeAppearance';

interface AIKeySectionManagerProps {
  sectionKey: 'analyticsAI' | 'translationAI';
  title: string;
  subtitle?: string;
  description: string;
  icon?: React.ReactNode;
  sectionData?: AISettingsSection;
  section?: AISettingsSection;
  language: Language;
  appearance?: ResolvedAppearance;
  onChange: (updatedSection: AISettingsSection) => void;
}

export const AIKeySectionManager: React.FC<AIKeySectionManagerProps> = ({
  sectionKey,
  title,
  subtitle,
  description,
  icon,
  sectionData,
  section,
  language,
  appearance,
  onChange,
}) => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';

  // Defensive safe section state
  const safeSection: AISettingsSection = sectionData || section || { keys: [], autoFallback: true };
  const keys = safeSection.keys || [];

  // Form State for Adding New Key
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIServiceProvider | 'auto'>('auto');
  const [detectedProvider, setDetectedProvider] = useState<AIServiceProvider | null>(null);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [isRecognized, setIsRecognized] = useState<boolean>(true);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [chosenModel, setChosenModel] = useState<string>('');
  const [isTestingNewKey, setIsTestingNewKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [showKeyText, setShowKeyText] = useState(false);
  const [isAddingOpen, setIsAddingOpen] = useState(false);

  // Per-key testing & updating state
  const [keyTestingStatus, setKeyTestingStatus] = useState<Record<string, { loading: boolean; result?: any }>>({});
  const [keyFetchingStatus, setKeyFetchingStatus] = useState<Record<string, boolean>>({});

  // Auto-migrate any keys referencing decommissioned or legacy problematic models
  useEffect(() => {
    let hasChanges = false;
    const updated = keys.map((k) => {
      if (k.provider === 'groq') {
        const m = (k.selectedModel || '').toLowerCase();
        if (
          m.includes('llama3-') ||
          m.includes('llama-3.1') ||
          m.includes('llama-3.2') ||
          m.includes('llama-3.3') ||
          m.includes('mixtral') ||
          m.includes('gemma') ||
          m.includes('distill') ||
          m.includes('qwen-2.5') ||
          m.includes('canopylabs') ||
          m.includes('orpheus') ||
          m.includes('allam')
        ) {
          hasChanges = true;
          return {
            ...k,
            selectedModel: 'openai/gpt-oss-20b',
          };
        }
      }
      return k;
    });

    if (hasChanges) {
      onChange({
        ...safeSection,
        keys: updated,
      });
    }
  }, [keys]);

  // When key input changes, perform live provider detection
  const handleKeyInputChange = (val: string) => {
    setNewKeyInput(val);
    setTestResult(null);
    if (!val.trim()) {
      setDetectedProvider(null);
      setDetectionMessage(null);
      setIsRecognized(true);
      setFetchedModels([]);
      setChosenModel('');
      return;
    }

    const detected = detectAIProviderFromKey(val);
    if (detected.isRecognized && detected.provider) {
      setDetectedProvider(detected.provider);
      setSelectedProvider(detected.provider);
      setIsRecognized(true);
      setDetectionMessage(isFa ? detected.messageFa : detected.messageEn);
      // Pre-fill default popular models
      const meta = PROVIDER_METADATA[detected.provider];
      setFetchedModels(meta.popularModels || []);
      setChosenModel(meta.defaultBestModel || '');
    } else {
      setDetectedProvider(null);
      setIsRecognized(false);
      setDetectionMessage(
        isFa 
          ? '⚠️ کلید وارد شده به صورت خودکار شناسایی نشد. لطفاً ارائه‌دهنده را دستی انتخاب فرمایید.' 
          : isAr 
          ? '⚠️ لم يتم التعرف على مزود الخدمة تلقائياً. يرجى الاختيار يدوياً.' 
          : '⚠️ AI Key not recognized. Please choose provider manually.'
      );
      if (selectedProvider === 'auto') {
        setSelectedProvider('openai');
      }
    }
  };

  const handleProviderSelectChange = (prov: AIServiceProvider) => {
    setSelectedProvider(prov);
    const meta = PROVIDER_METADATA[prov];
    setFetchedModels(meta.popularModels || []);
    setChosenModel(meta.defaultBestModel || '');
  };

  // Fetch live models using API key
  const handleFetchModels = async () => {
    const key = newKeyInput.trim();
    if (!key) return;
    const providerToUse = selectedProvider === 'auto' ? (detectedProvider || 'gemini') : selectedProvider;
    setIsFetchingModels(true);
    try {
      const res = await fetchModelsForProvider(key, providerToUse);
      if (res.models && res.models.length > 0) {
        setFetchedModels(res.models);
        setChosenModel(res.defaultModel || res.models[0]);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Test new key
  const handleTestNewKey = async () => {
    const key = newKeyInput.trim();
    if (!key) return;
    const providerToUse = selectedProvider === 'auto' ? (detectedProvider || 'gemini') : selectedProvider;
    setIsTestingNewKey(true);
    setTestResult(null);
    try {
      const res = await testAIKeyConnection(key, providerToUse, chosenModel);
      setTestResult({
        success: res.success,
        message: res.message,
        latency: res.latencyMs,
      });
    } finally {
      setIsTestingNewKey(false);
    }
  };

  const updateSectionAndSync = (newSection: AISettingsSection) => {
    onChange(newSection);
    try {
      const fullConfig = getStoredAdvancedAIConfig();
      const updatedFullConfig = {
        ...fullConfig,
        [sectionKey]: newSection,
      };
      saveStoredAdvancedAIConfig(updatedFullConfig);
    } catch (e) {
      console.warn('Sync AI config error:', e);
    }
  };

  // Add the key to the list
  const handleAddKey = () => {
    const key = newKeyInput.trim();
    if (!key) return;

    const providerToUse: AIServiceProvider = 
      selectedProvider === 'auto' 
        ? (detectedProvider || 'gemini') 
        : (selectedProvider as AIServiceProvider);

    const newKeyObj: AIKeyConfig = {
      id: `ai-key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key,
      provider: providerToUse,
      name: newKeyLabel.trim() || `${PROVIDER_METADATA[providerToUse]?.name || 'AI'} Key ${keys.length + 1}`,
      selectedModel: chosenModel || undefined, // undefined means auto-select latest
      availableModels: fetchedModels.length > 0 ? fetchedModels : undefined,
      isValid: testResult ? testResult.success : undefined,
      lastChecked: testResult ? Date.now() : undefined,
      createdAt: Date.now(),
    };

    const updatedKeys = [...keys, newKeyObj];
    updateSectionAndSync({
      ...safeSection,
      keys: updatedKeys,
    });

    // Reset form
    setNewKeyInput('');
    setNewKeyLabel('');
    setSelectedProvider('auto');
    setDetectedProvider(null);
    setDetectionMessage(null);
    setIsRecognized(true);
    setFetchedModels([]);
    setChosenModel('');
    setTestResult(null);
    setIsAddingOpen(false);
  };

  // Delete key
  const handleDeleteKey = (id: string) => {
    const updatedKeys = keys.filter((k) => k.id !== id);
    updateSectionAndSync({
      ...safeSection,
      keys: updatedKeys,
    });
  };

  // Move key up/down for failover priority
  const handleMoveKey = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= keys.length) return;
    const updated = [...keys];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    updateSectionAndSync({
      ...safeSection,
      keys: updated,
    });
  };

  // Update chosen model for an existing key
  const handleKeyModelChange = (id: string, model: string) => {
    const updated = keys.map((k) => {
      if (k.id === id) {
        return {
          ...k,
          selectedModel: model === 'auto' ? undefined : model,
        };
      }
      return k;
    });
    updateSectionAndSync({
      ...safeSection,
      keys: updated,
    });
  };

  // Live fetch/refresh models for existing key
  const handleRefreshKeyModels = async (keyConfig: AIKeyConfig) => {
    setKeyFetchingStatus((prev) => ({ ...prev, [keyConfig.id]: true }));
    try {
      const provider = keyConfig.provider === 'unknown' ? 'gemini' : keyConfig.provider;
      const res = await fetchModelsForProvider(keyConfig.key, provider);
      if (res.models && res.models.length > 0) {
        const updated = keys.map((k) => {
          if (k.id === keyConfig.id) {
            return {
              ...k,
              availableModels: res.models,
              selectedModel: k.selectedModel || res.defaultModel,
            };
          }
          return k;
        });
        updateSectionAndSync({ ...safeSection, keys: updated });
      }
    } finally {
      setKeyFetchingStatus((prev) => ({ ...prev, [keyConfig.id]: false }));
    }
  };

  // Test existing key
  const handleTestExistingKey = async (keyConfig: AIKeyConfig) => {
    setKeyTestingStatus((prev) => ({ ...prev, [keyConfig.id]: { loading: true } }));
    try {
      const provider = keyConfig.provider === 'unknown' ? 'gemini' : keyConfig.provider;
      const res = await testAIKeyConnection(keyConfig.key, provider, keyConfig.selectedModel);
      setKeyTestingStatus((prev) => ({
        ...prev,
        [keyConfig.id]: { loading: false, result: res },
      }));

      // Update key validity & verified model in state
      const updated = keys.map((k) => {
        if (k.id === keyConfig.id) {
          return {
            ...k,
            isValid: res.success,
            availableModels: (res.availableModels && res.availableModels.length > 0) ? res.availableModels : k.availableModels,
            selectedModel: (res.success && res.modelUsed) ? res.modelUsed : k.selectedModel,
            lastChecked: Date.now(),
            errorMessage: res.success ? undefined : res.message,
          };
        }
        return k;
      });
      updateSectionAndSync({ ...safeSection, keys: updated });
    } catch {
      setKeyTestingStatus((prev) => ({
        ...prev,
        [keyConfig.id]: { loading: false, result: { success: false, message: 'خطا در تست' } },
      }));
    }
  };

  const handleToggleAutoFallback = () => {
    const current = safeSection.autoFallback !== false; // default true
    updateSectionAndSync({
      ...safeSection,
      autoFallback: !current,
    });
  };

  const maskKey = (str: string) => {
    if (!str || str.length < 10) return '••••••••••••';
    return `${str.substring(0, 7)}••••••••${str.substring(str.length - 4)}`;
  };

  const activeProviderMeta = selectedProvider !== 'auto' 
    ? PROVIDER_METADATA[selectedProvider] 
    : (detectedProvider ? PROVIDER_METADATA[detectedProvider] : null);

  return (
    <div 
      style={appearance?.cardBoxStyle}
      className="bg-white dark:bg-slate-900/90 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                {subtitle}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action / Count Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <div className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            {formatNumber(keys.length, language)} {isFa ? 'کلید فعال' : isAr ? 'مفاتيح' : 'Keys'}
          </div>
          <button
            type="button"
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isAddingOpen
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 active:scale-95'
            }`}
          >
            {isAddingOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                {isFa ? 'بستن فرم' : isAr ? 'إغلاق' : 'Close'}
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                {isFa ? 'افزودن کلید جدید' : isAr ? 'إضافة مفتاح' : 'Add Key'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Adding New Key Form */}
      {isAddingOpen && (
        <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              {isFa ? 'ثبت و اتصال کلید هوش مصنوعی' : isAr ? 'إضافة وتوصيل مفتاح API' : 'Register & Connect AI API Key'}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isFa ? 'تشخیص خودکار سرویس' : 'Auto Provider Detection'}
            </span>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{isFa ? 'کلید اختصاصی API (API Key)' : isAr ? 'مفتاح API الخاص بك' : 'API Key'}</span>
              {activeProviderMeta?.docsUrl && (
                <a
                  href={activeProviderMeta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>{isFa ? `دریافت رایگان کلید ${activeProviderMeta.name}` : `Get ${activeProviderMeta.name} key`}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </label>
            <div className="relative flex items-center">
              <input
                type={showKeyText ? 'text' : 'password'}
                value={newKeyInput}
                onChange={(e) => handleKeyInputChange(e.target.value)}
                placeholder={activeProviderMeta?.keyPlaceholder || 'AIzaSy... / sk-... / gsk_... / sk-ant-...'}
                dir="ltr"
                className="w-full pl-3 pr-20 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title={showKeyText ? 'مخفی‌سازی' : 'نمایش متن'}
                >
                  {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Key Detection / Identification Feedback */}
          {newKeyInput.trim().length > 0 && (
            <div
              className={`p-3 rounded-xl text-xs border flex items-start gap-2.5 transition-all ${
                isRecognized
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              {isRecognized ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{detectionMessage}</div>
                {activeProviderMeta && (
                  <p className="text-[11px] opacity-90">
                    {isFa ? activeProviderMeta.descriptionFa : activeProviderMeta.descriptionEn}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Provider Selection (Auto or Manual override) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isFa ? 'سرویس ارائه‌دهنده هوش مصنوعی' : isAr ? 'مزود خدمة الذكاء الاصطناعي' : 'AI Provider'}
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderSelectChange(e.target.value as AIServiceProvider)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="auto">
                  {detectedProvider 
                    ? `⚡ خودکار (${PROVIDER_METADATA[detectedProvider]?.name})` 
                    : '⚡ تشخیص هوشمند خودکار'}
                </option>
                {Object.values(PROVIDER_METADATA).map((meta) => (
                  <option key={meta.id} value={meta.id}>
                    {meta.name} ({meta.nameFa})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isFa ? 'برچسب یا نام دلخواه (اختیاری)' : isAr ? 'تسمية مخصصة (اختياري)' : 'Custom Label / Nickname'}
              </label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder={isFa ? 'مثال: کلید اصلی جمینای یا حساب اوپن‌ای‌آی شرکت' : 'e.g. Primary Gemini or Work OpenAI'}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Model Selection & Live Update */}
          <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isFa ? 'مدل انتخابی جهت پردازش' : isAr ? 'النموذج المحدد' : 'Target Model'}</span>
              </label>
              
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={!newKeyInput.trim() || isFetchingModels}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                <span>{isFetchingModels ? (isFa ? 'در حال استعلام مدل‌ها...' : 'Fetching models...') : (isFa ? 'بروزرسانی مدل‌ها از سرور' : 'Fetch live models')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={chosenModel}
                onChange={(e) => setChosenModel(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">
                  {isFa 
                    ? `✨ انتخاب خودکار بروزترین مدل (${activeProviderMeta?.defaultBestModel || 'پیشنهادی'})` 
                    : `✨ Auto-select latest recommended model`}
                </option>
                {fetchedModels.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === activeProviderMeta?.defaultBestModel ? ' (توصیه شده ★)' : ''}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestNewKey}
                  disabled={!newKeyInput.trim() || isTestingNewKey}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-500 ${isTestingNewKey ? 'animate-pulse' : ''}`} />
                  <span>{isTestingNewKey ? (isFa ? 'در حال تست...' : 'Testing...') : (isFa ? 'تست اتصال کلید' : 'Test Key')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddKey}
                  disabled={!newKeyInput.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-indigo-500/30 transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isFa ? 'تأیید و افزودن' : isAr ? 'حفظ وإضافة' : 'Save Key'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs border flex items-center justify-between ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.latency && (
                  <span className="text-[10px] font-mono opacity-80">
                    ⚡ {testResult.latency}ms
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List of Configured Keys with Failover Management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            {isFa ? 'فهرست کلیدها و اولویت چرخش خودکار (Failover & Fallback)' : 'Configured Keys & Priority Order'}
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            {isFa ? 'به ترتیب اولویت فراخوانی می‌شوند' : 'Executed in order of priority'}
          </span>
        </div>

        {keys.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {isFa
                ? 'هنوز هیچ کلید اختصاصی برای این بخش ثبت نشده است.'
                : isAr
                ? 'لم يتم تكوين أي مفاتيح مخصصة بعد.'
                : 'No custom API keys registered for this section yet.'}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
              {isFa
                ? 'برنامه در صورت عدم وجود کلید اختصاصی، به صورت خودکار از سرویس پیش‌فرض داخلی هوش مصنوعی استفاده می‌نماید. افزودن چند کلید به شما پایداری ۱۰۰٪ بدون توقف می‌دهد.'
                : 'The system uses default built-in AI. Adding custom keys grants unlimited bandwidth and redundant failover.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAddingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              {isFa ? 'افزودن اولین کلید' : 'Add First Key'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {keys.map((keyConfig, index) => {
              const meta = PROVIDER_METADATA[keyConfig.provider] || PROVIDER_METADATA.custom;
              const testing = keyTestingStatus[keyConfig.id];
              const fetching = keyFetchingStatus[keyConfig.id];
              const modelsList = keyConfig.availableModels || meta.popularModels || [];

              return (
                <div
                  key={keyConfig.id}
                  className="p-3.5 md:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all space-y-3 group"
                >
                  {/* Top line: Priority Badge, Name, Provider, Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${meta.badgeColor}`}>
                          {meta.name}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {keyConfig.name}
                        </span>
                      </div>
                    </div>

                    {/* Up/Down and Delete buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveKey(index, 'up')}
                        disabled={index === 0}
                        title={isFa ? 'افزایش اولویت' : 'Move up'}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveKey(index, 'down')}
                        disabled={index === keys.length - 1}
                        title={isFa ? 'کاهش اولویت' : 'Move down'}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(keyConfig.id)}
                        title={isFa ? 'حذف این کلید' : 'Delete key'}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Masked Key & Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-4 flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full truncate" dir="ltr">
                        {maskKey(keyConfig.key)}
                      </span>
                    </div>

                    {/* Model Dropdown */}
                    <div className="sm:col-span-5 flex items-center gap-1.5">
                      <select
                        value={keyConfig.selectedModel || 'auto'}
                        onChange={(e) => handleKeyModelChange(keyConfig.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="auto">
                          {isFa 
                            ? `✨ خودکار: ${meta.defaultBestModel}` 
                            : `✨ Auto: ${meta.defaultBestModel}`}
                        </option>
                        {modelsList.map((m) => (
                          <option key={m} value={m}>
                            {m} {m === meta.defaultBestModel ? ' (توصیه شده)' : ''}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRefreshKeyModels(keyConfig)}
                        disabled={fetching}
                        title={isFa ? 'بروزرسانی لیست مدل‌های این کلید' : 'Update models'}
                        className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Test Key Button */}
                    <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestExistingKey(keyConfig)}
                        disabled={testing?.loading}
                        className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors disabled:opacity-50"
                      >
                        <Zap className={`w-3 h-3 text-amber-500 ${testing?.loading ? 'animate-pulse' : ''}`} />
                        <span>{testing?.loading ? '...' : (isFa ? 'تست' : 'Test')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Testing Feedback Banner if tested */}
                  {testing?.result && (
                    <div
                      className={`p-2 rounded-xl text-[11px] border flex items-center justify-between ${
                        testing.result.success
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40'
                          : 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {testing.result.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                        {testing.result.message}
                      </span>
                      {testing.result.latencyMs && (
                        <span className="font-mono opacity-75">⚡ {testing.result.latencyMs}ms</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Server Fallback Toggle & Status Card */}
      <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5 max-w-md">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              {isFa ? 'استفاده از هوش مصنوعی پشتیبان سرور (Server AI Fallback)' : 'Use Server AI as Fallback'}
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {safeSection.autoFallback === false
                ? (isFa 
                    ? 'غیرفعال: فقط و فقط از کلیدهای اختصاصی شما استفاده خواهد شد و در صورت نبود یا خرابی کلید، هیچ درخواستی با کلید پیش‌فرض سرور ارسال نمی‌شود.'
                    : 'Disabled: Strictly only your custom keys are used. No request will be routed through server default keys.')
                : (isFa 
                    ? 'فعال: در صورتی که هیچ کلیدی وارد نشده باشد یا تمام کلیدهای شما با خطا مواجه شوند، از هوش مصنوعی سرور به عنوان پشتیبان استفاده می‌شود.'
                    : 'Enabled: If no custom keys exist or all keys fail, server default AI will be used as a fallback.')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoFallback}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              safeSection.autoFallback !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={safeSection.autoFallback !== false}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                safeSection.autoFallback !== false ? (isFa ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Warning if no keys and fallback is disabled */}
        {keys.length === 0 && safeSection.autoFallback === false && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {isFa
                ? 'توجه: کلید اختصاصی ثبت نشده و هوش مصنوعی پشتیبان سرور نیز غیرفعال است. لطفاً کلید خود را اضافه کنید.'
                : 'Notice: No custom keys registered and server fallback is disabled. Please add a key.'}
            </span>
          </div>
        )}
      </div>

      {/* Failover and Redundancy Architecture Info Footer */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {isFa ? 'سیستم چرخش و اولویت‌بندی کلیدها (Smart Key Rotation):' : 'Smart Key Rotation & Redundancy:'}
          </span>
          <p className="text-[11px] leading-relaxed">
            {isFa
              ? 'در صورت ثبت چند کلید، درخواست‌ها ابتدا به کلید شماره ۱ ارسال می‌شوند. در صورت اتمام سهمیه (۴۲۹) یا بروز اختلال، به طور خودکار به کلید بعدی منتقل می‌گردد.'
              : 'When multiple keys are added, requests go to Key #1 first. If it hits quota limits (429) or errors, it seamlessly rolls over to the next key.'}
          </p>
        </div>
      </div>
    </div>
  );
};
