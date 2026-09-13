import { AIServiceProvider, AIKeyConfig, AIConfigurationSettings } from '../types';

export interface ProviderMetadata {
  id: AIServiceProvider;
  name: string;
  nameFa: string;
  nameAr: string;
  badgeColor: string;
  accentColor: string;
  defaultBestModel: string;
  popularModels: string[];
  keyPrefixes: string[];
  keyPlaceholder: string;
  docsUrl: string;
  descriptionFa: string;
  descriptionEn: string;
}

export const PROVIDER_METADATA: Record<AIServiceProvider, ProviderMetadata> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    nameFa: 'گوگل جمینای (Gemini)',
    nameAr: 'جوجل جيميني (Gemini)',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    accentColor: '#2563eb',
    defaultBestModel: 'gemini-3.8-flash',
    popularModels: [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
    ],
    keyPrefixes: ['AIzaSy'],
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    descriptionFa: 'سریع‌ترین و پیشرفته‌ترین مدل گوگل با سهمیه رایگان بالا و عملکرد فوق‌العاده در زبان فارسی',
    descriptionEn: 'High-speed reasoning with large context window & generous free tier',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    nameFa: 'اوپن‌ای‌آی (GPT-4o)',
    nameAr: 'أوبن إيه آي (OpenAI)',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    accentColor: '#10b981',
    defaultBestModel: 'gpt-4o-mini',
    popularModels: [
      'gpt-4o-mini',
      'gpt-4o',
      'o3-mini',
      'o1',
      'gpt-4.1-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
    keyPrefixes: ['sk-proj-', 'sk-svcacct-', 'sk-admin-', 'sk-'],
    keyPlaceholder: 'sk-proj-... / sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    descriptionFa: 'مدل‌های هوشمند و پایدار GPT-4o و GPT-4o-mini مناسب برای استدلال و ترجمه',
    descriptionEn: 'Flagship reasoning and creative text generation models',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    nameFa: 'دیپ‌سیک (DeepSeek V3 / R1)',
    nameAr: 'ديب سيك (DeepSeek)',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    accentColor: '#6366f1',
    defaultBestModel: 'deepseek-chat',
    popularModels: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    keyPrefixes: ['deepseek-', 'sk-ds-'],
    keyPlaceholder: 'sk-... (کلید پلتفرم DeepSeek)',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    descriptionFa: 'مدل قدرتمند و فوق‌العاده مقرون‌به‌صرفه V3 و استدلال R1 با تسلط بالا بر زبان‌های طبیعی',
    descriptionEn: 'DeepSeek V3 and R1 reasoning with ultra-low latency & affordable pricing',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    nameFa: 'کلود آنتروپیک (Claude 3.7 / 3.5)',
    nameAr: 'أنثروبيك كلود (Claude)',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    accentColor: '#d97706',
    defaultBestModel: 'claude-3-7-sonnet-20250219',
    popularModels: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    keyPrefixes: ['sk-ant-api03-', 'sk-ant-'],
    keyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    descriptionFa: 'کیفیت نگارشی استثنایی و طبیعی‌ترین لحن ترجمه و تحلیل داده در دنیا',
    descriptionEn: 'Unmatched nuance, prose translation fidelity, and analytical depth',
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    nameFa: 'گروک (Groq LPU - فوق سریع)',
    nameAr: 'جروك السريع (Groq)',
    badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    accentColor: '#ea580c',
    defaultBestModel: 'openai/gpt-oss-20b',
    popularModels: [
      'openai/gpt-oss-20b',
      'qwen/qwen3.6-27b',
      'qwen/qwen3.8-27b',
      'groq/qwen/qwen3-32b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'openai/gpt-oss-120b',
    ],
    keyPrefixes: ['gsk_'],
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    descriptionFa: 'پردازش فوق‌سریع مدل‌های OpenAI GPT-OSS و Qwen 3 و Llama 4 با شتاب‌دهنده سخت‌افزاری Groq LPU',
    descriptionEn: 'Ultra-fast inference powered by Groq LPU hardware',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    nameFa: 'اوپن‌روتر (OpenRouter Hub)',
    nameAr: 'أوبن روتر (OpenRouter)',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    accentColor: '#9333ea',
    defaultBestModel: 'google/gemini-2.0-flash-001',
    popularModels: [
      'google/gemini-2.0-flash-001',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    keyPrefixes: ['sk-or-v1-', 'sk-or-'],
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    descriptionFa: 'دسترسی یکپارچه به صدها مدل هوش مصنوعی با یک کلید واحد',
    descriptionEn: 'Universal AI gateway connecting 200+ models with unified billing',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    nameFa: 'میسترال (Mistral Large)',
    nameAr: 'ميسترال (Mistral)',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    accentColor: '#e11d48',
    defaultBestModel: 'mistral-small-latest',
    popularModels: [
      'mistral-large-latest',
      'mistral-small-latest',
      'codestral-latest',
      'open-mistral-nemo',
    ],
    keyPrefixes: ['mistral-'],
    keyPlaceholder: 'mistral-... / API Key',
    docsUrl: 'https://console.mistral.ai/api-keys/',
    descriptionFa: 'مدل‌های اروپایی قدرتمند Mistral با تسلط چندزبانه و سرعت بالا',
    descriptionEn: 'Open-weight European powerhouse models with multilingual mastery',
  },
  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    nameFa: 'ایکس‌ای‌آی (Grok 2)',
    nameAr: 'إكس إيه آي (Grok)',
    badgeColor: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    accentColor: '#3f3f46',
    defaultBestModel: 'grok-2-latest',
    popularModels: [
      'grok-2-latest',
      'grok-beta',
      'grok-vision-beta',
    ],
    keyPrefixes: ['xai-'],
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://console.x.ai/',
    descriptionFa: 'مدل پیشرفته Grok توسعه یافته توسط تیم xAI',
    descriptionEn: 'Real-time reasoning and unfiltered intelligence from xAI',
  },
  together: {
    id: 'together',
    name: 'Together AI',
    nameFa: 'توگدر (Together AI)',
    nameAr: 'توغيزر (Together)',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    accentColor: '#0d9488',
    defaultBestModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    popularModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
    keyPrefixes: ['together-'],
    keyPlaceholder: 'Together API key...',
    docsUrl: 'https://api.together.ai/settings/api-keys',
    descriptionFa: 'میزبانی سریع‌ترین مدل‌های منبع‌باز از جمله Llama 3.3 و Qwen 2.5',
    descriptionEn: 'Blazing fast open-source model inference API',
  },
  custom: {
    id: 'custom',
    name: 'Custom / Other API',
    nameFa: 'سرویس سفارشی / سازگار با OpenAI',
    nameAr: 'خدمة مخصصة (OpenAI Compatible)',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    accentColor: '#64748b',
    defaultBestModel: 'default',
    popularModels: ['default', 'custom-model'],
    keyPrefixes: [],
    keyPlaceholder: 'کلید API دلخواه...',
    docsUrl: '',
    descriptionFa: 'هر سرور محلی یا پراکسی سازگار با ساختار استاندارد OpenAI (Ollama, LMStudio, vLLM)',
    descriptionEn: 'Custom endpoint compatible with standard OpenAI schema',
  },
};

export const DEFAULT_PROVIDER_META: ProviderMetadata = {
  id: 'gemini',
  name: 'Google Gemini',
  nameFa: 'گوگل جمینای (Gemini)',
  nameAr: 'جوجل جيميني (Gemini)',
  badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  accentColor: '#2563eb',
  defaultBestModel: 'gemini-2.5-flash',
  popularModels: [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.5-pro',
  ],
  keyPrefixes: ['AIzaSy'],
  keyPlaceholder: 'AIzaSy...',
  docsUrl: 'https://aistudio.google.com/app/apikey',
  descriptionFa: 'سرویس هوش مصنوعی هوشمند و پرسرعت',
  descriptionEn: 'High-speed AI reasoning and processing',
};

export function getProviderMeta(provider?: string | null): ProviderMetadata {
  if (!provider || provider === 'auto' || provider === 'unknown') {
    return PROVIDER_METADATA.gemini || DEFAULT_PROVIDER_META;
  }
  return PROVIDER_METADATA[provider as AIServiceProvider] || PROVIDER_METADATA.custom || DEFAULT_PROVIDER_META;
}

/**
 * Intelligently detect AI Provider based on API key structure and signatures
 */
export function detectAIProviderFromKey(rawKey: string): {
  provider: AIServiceProvider | null;
  isRecognized: boolean;
  confidence: 'high' | 'medium' | 'low';
  messageFa: string;
  messageEn: string;
} {
  const key = rawKey.trim();
  if (!key) {
    return {
      provider: null,
      isRecognized: false,
      confidence: 'low',
      messageFa: 'کلیدی وارد نشده است.',
      messageEn: 'No key provided.',
    };
  }

  // 1. Google Gemini: starts with AIzaSy (39 characters usually)
  if (key.startsWith('AIzaSy') || /^AIza[0-9A-Za-z-_]{35}$/.test(key)) {
    return {
      provider: 'gemini',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: Google Gemini (گوگل جمینای)',
      messageEn: 'Identified as Google Gemini',
    };
  }

  // 2. Anthropic Claude: starts with sk-ant-api03- or sk-ant-
  if (key.startsWith('sk-ant-')) {
    return {
      provider: 'anthropic',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: Anthropic Claude (کلود)',
      messageEn: 'Identified as Anthropic Claude',
    };
  }

  // 3. Groq: starts with gsk_
  if (key.startsWith('gsk_')) {
    return {
      provider: 'groq',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: Groq Cloud (فوق‌سریع)',
      messageEn: 'Identified as Groq Cloud',
    };
  }

  // 4. OpenRouter: starts with sk-or-v1- or sk-or-
  if (key.startsWith('sk-or-')) {
    return {
      provider: 'openrouter',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: OpenRouter Hub',
      messageEn: 'Identified as OpenRouter Hub',
    };
  }

  // 5. xAI: starts with xai-
  if (key.startsWith('xai-')) {
    return {
      provider: 'xai',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: xAI Grok',
      messageEn: 'Identified as xAI Grok',
    };
  }

  // 6. DeepSeek explicit prefix
  if (key.startsWith('deepseek-') || key.startsWith('sk-ds-')) {
    return {
      provider: 'deepseek',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: DeepSeek (دیپ‌سیک)',
      messageEn: 'Identified as DeepSeek',
    };
  }

  // 7. Mistral explicit prefix
  if (key.startsWith('mistral-')) {
    return {
      provider: 'mistral',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: Mistral AI',
      messageEn: 'Identified as Mistral AI',
    };
  }

  // 8. OpenAI project / standard keys
  if (key.startsWith('sk-proj-') || key.startsWith('sk-svcacct-') || key.startsWith('sk-admin-')) {
    return {
      provider: 'openai',
      isRecognized: true,
      confidence: 'high',
      messageFa: 'شناسایی شد: OpenAI (پلتفرم رسمی)',
      messageEn: 'Identified as OpenAI Official',
    };
  }

  // 9. Generic "sk-" prefix (could be OpenAI or DeepSeek or others)
  if (key.startsWith('sk-')) {
    // If length is standard 51 chars or standard OpenAI format
    return {
      provider: 'openai',
      isRecognized: true,
      confidence: 'medium',
      messageFa: 'شناسایی شد: OpenAI (یا DeepSeek با کلید سازگار)',
      messageEn: 'Identified as OpenAI / Compatible',
    };
  }

  // Unrecognized
  return {
    provider: null,
    isRecognized: false,
    confidence: 'low',
    messageFa: '⚠️ کلید هوش مصنوعی شناسایی نشد. لطفاً سرویس مورد نظر را دستی انتخاب کنید.',
    messageEn: '⚠️ AI Key format not recognized. Please choose provider manually.',
  };
}

/**
 * Returns the default initial AI configuration
 */
export function getInitialAIConfig(): AIConfigurationSettings {
  return {
    analyticsAI: {
      keys: [],
      autoFallback: true,
    },
    translationAI: {
      keys: [],
      autoFallback: true,
    },
  };
}

/**
 * Fetch available models for a key and provider from the server
 */
export async function fetchModelsForProvider(
  key: string,
  provider: AIServiceProvider
): Promise<{
  success: boolean;
  models: string[];
  defaultModel: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/ai/fetch-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, provider }),
    });

    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.models) && data.models.length > 0) {
      return {
        success: true,
        models: data.models,
        defaultModel: data.defaultModel || data.models[0],
      };
    }
    return {
      success: false,
      models: PROVIDER_METADATA[provider]?.popularModels || [],
      defaultModel: PROVIDER_METADATA[provider]?.defaultBestModel || 'default',
      error: data.error || 'دریافت مدل‌ها از سرور با خطا مواجه شد. از لیست پیش‌فرض استفاده شد.',
    };
  } catch (err: any) {
    return {
      success: false,
      models: PROVIDER_METADATA[provider]?.popularModels || [],
      defaultModel: PROVIDER_METADATA[provider]?.defaultBestModel || 'default',
      error: err.message || 'خطا در برقراری ارتباط با سرور',
    };
  }
}

/**
 * Test connectivity of an AI Key
 */
export async function testAIKeyConnection(
  key: string,
  provider: AIServiceProvider,
  model?: string
): Promise<{
  success: boolean;
  modelUsed: string;
  latencyMs: number;
  message: string;
  availableModels?: string[];
}> {
  const startTime = Date.now();
  try {
    const res = await fetch('/api/ai/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, provider, model }),
    });
    const latency = Date.now() - startTime;
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        modelUsed: data.modelUsed || model || 'auto',
        latencyMs: latency,
        availableModels: Array.isArray(data.availableModels) ? data.availableModels : undefined,
        message: data.message || 'ارتباط با موفقیت برقرار شد.',
      };
    }
    return {
      success: false,
      modelUsed: model || 'auto',
      latencyMs: latency,
      availableModels: Array.isArray(data.availableModels) ? data.availableModels : undefined,
      message: data.error || data.message || 'کلید نامعتبر است یا سهمیه آن به اتمام رسیده است.',
    };
  } catch (err: any) {
    return {
      success: false,
      modelUsed: model || 'auto',
      latencyMs: Date.now() - startTime,
      message: err.message || 'خطا در ارتباط با سرور',
    };
  }
}

export function sanitizeKeyConfig(keyConfig: AIKeyConfig): AIKeyConfig {
  if (!keyConfig) return keyConfig;
  const copy = { ...keyConfig };
  const prov = (copy.provider || '').toLowerCase();
  if (prov === 'gemini' || prov === '' || prov === 'auto') {
    if (!copy.selectedModel || copy.selectedModel === 'default' || copy.selectedModel === 'auto') {
      copy.selectedModel = 'gemini-2.5-flash';
    }
    if (Array.isArray(copy.availableModels)) {
      copy.availableModels = copy.availableModels
        .filter((modelName) => {
          const l = modelName.toLowerCase();
          return (
            !l.includes('embedding') &&
            !l.includes('aqa') &&
            !l.includes('imagen')
          );
        });
      if (!copy.availableModels.includes('gemini-2.5-flash')) {
        copy.availableModels.unshift('gemini-2.5-flash');
      }
      if (!copy.availableModels.includes('gemini-2.0-flash')) {
        copy.availableModels.push('gemini-2.0-flash');
      }
      if (!copy.availableModels.includes('gemini-1.5-flash')) {
        copy.availableModels.push('gemini-1.5-flash');
      }
      if (!copy.availableModels.includes('gemini-3.7-flash')) {
        copy.availableModels.push('gemini-3.7-flash');
      }
    }
  }
  return copy;
}

/**
 * Universal getter for AI Configuration from localStorage (Advanced Settings)
 */
export function getStoredAdvancedAIConfig(): AIConfigurationSettings {
  const defaultConf: AIConfigurationSettings = {
    analyticsAI: { keys: [], autoFallback: true },
    translationAI: { keys: [], autoFallback: true },
  };

  try {
    // Check v1 key first
    const savedV1 = localStorage.getItem('lally_advanced_settings_v1');
    if (savedV1) {
      const parsed = JSON.parse(savedV1);
      if (parsed?.aiConfig) {
        return {
          analyticsAI: {
            keys: (parsed.aiConfig.analyticsAI?.keys || []).map(sanitizeKeyConfig),
            autoFallback: parsed.aiConfig.analyticsAI?.autoFallback !== false,
            preferredProvider: parsed.aiConfig.analyticsAI?.preferredProvider,
          },
          translationAI: {
            keys: (parsed.aiConfig.translationAI?.keys || []).map(sanitizeKeyConfig),
            autoFallback: parsed.aiConfig.translationAI?.autoFallback !== false,
            preferredProvider: parsed.aiConfig.translationAI?.preferredProvider,
          },
        };
      }
    }

    // Check legacy key
    const savedLegacy = localStorage.getItem('lally_advanced_settings');
    if (savedLegacy) {
      const parsed = JSON.parse(savedLegacy);
      if (parsed?.aiConfig) {
        return {
          analyticsAI: {
            keys: (parsed.aiConfig.analyticsAI?.keys || []).map(sanitizeKeyConfig),
            autoFallback: parsed.aiConfig.analyticsAI?.autoFallback !== false,
            preferredProvider: parsed.aiConfig.analyticsAI?.preferredProvider,
          },
          translationAI: {
            keys: (parsed.aiConfig.translationAI?.keys || []).map(sanitizeKeyConfig),
            autoFallback: parsed.aiConfig.translationAI?.autoFallback !== false,
            preferredProvider: parsed.aiConfig.translationAI?.preferredProvider,
          },
        };
      }
    }
  } catch (e) {
    console.warn('Error reading stored AI config:', e);
  }

  return defaultConf;
}

/**
 * Universal getter for specific active AI keys (e.g. analyticsAI or translationAI)
 */
export function getStoredSectionAIKeys(section: 'analyticsAI' | 'translationAI'): AIKeyConfig[] {
  const conf = getStoredAdvancedAIConfig();
  const keys = conf[section]?.keys || [];
  return keys.filter((k) => k && typeof k.key === 'string' && k.key.trim().length > 0);
}

/**
 * Universal synchronous saver for AI configuration to localStorage + Server Database
 */
export function saveStoredAdvancedAIConfig(newAiConfig: AIConfigurationSettings): void {
  try {
    // Update lally_advanced_settings_v1
    const rawV1 = localStorage.getItem('lally_advanced_settings_v1');
    const parsedV1 = rawV1 ? JSON.parse(rawV1) : {};
    const updatedV1 = { ...parsedV1, aiConfig: newAiConfig };
    localStorage.setItem('lally_advanced_settings_v1', JSON.stringify(updatedV1));

    // Update lally_advanced_settings
    const rawLegacy = localStorage.getItem('lally_advanced_settings');
    const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : {};
    const updatedLegacy = { ...parsedLegacy, aiConfig: newAiConfig };
    localStorage.setItem('lally_advanced_settings', JSON.stringify(updatedLegacy));

    // Fire background server persistence sync
    fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiConfig: newAiConfig }),
    }).catch(() => {});
  } catch (e) {
    console.warn('Failed to save AI config:', e);
  }
}

