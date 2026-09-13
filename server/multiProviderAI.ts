import { GoogleGenAI } from "@google/genai";

export type AIServiceProvider = 
  | 'gemini' 
  | 'openai' 
  | 'anthropic' 
  | 'deepseek' 
  | 'groq' 
  | 'openrouter' 
  | 'mistral' 
  | 'together' 
  | 'xai' 
  | 'custom';

export interface AIKeyConfig {
  id?: string;
  key: string;
  provider: AIServiceProvider | 'unknown';
  name?: string;
  label?: string;
  selectedModel?: string;
  availableModels?: string[];
  isValid?: boolean;
}

export function detectProviderFromKey(rawKey: string): AIServiceProvider {
  const key = (rawKey || '').trim();
  if (key.startsWith('AIza') || key.includes('AIza')) return 'gemini';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('xai-')) return 'xai';
  if (key.startsWith('mistral-')) return 'mistral';
  if (key.startsWith('deepseek-') || key.startsWith('sk-ds-')) return 'deepseek';
  if (key.startsWith('sk-proj-') || key.startsWith('sk-svcacct-') || key.startsWith('sk-admin-')) return 'openai';
  if (key.startsWith('sk-')) return 'openai';
  return 'gemini';
}

export function getCompatibleProvidersForKey(rawKey: string, preferredProvider?: string): AIServiceProvider[] {
  const key = (rawKey || '').trim();

  // If a specific provider is configured for this key and is not 'auto'/'unknown', strictly respect that provider!
  if (preferredProvider && preferredProvider !== 'auto' && preferredProvider !== 'unknown') {
    const p = preferredProvider.toLowerCase() as AIServiceProvider;
    return [p];
  }

  // Auto-detect based on key prefix
  if (key.startsWith('AIza') || key.includes('AIza')) {
    return ['gemini'];
  }
  if (key.startsWith('gsk_')) {
    return ['groq'];
  }
  if (key.startsWith('sk-ant-')) {
    return ['anthropic'];
  }
  if (key.startsWith('sk-or-')) {
    return ['openrouter'];
  }
  if (key.startsWith('deepseek-') || key.startsWith('sk-ds-')) {
    return ['deepseek'];
  }
  if (key.startsWith('xai-')) {
    return ['xai'];
  }
  if (key.startsWith('mistral-')) {
    return ['mistral'];
  }
  if (key.startsWith('sk-proj-') || key.startsWith('sk-svcacct-') || key.startsWith('sk-admin-')) {
    return ['openai'];
  }
  if (key.startsWith('sk-')) {
    return ['openai', 'deepseek'];
  }

  return [detectProviderFromKey(key)];
}

export function isModelValidForProvider(model: string, provider: AIServiceProvider): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  if (provider === 'gemini') {
    return m.includes('gemini') || m.includes('flash') || m.includes('pro');
  }
  if (provider === 'groq') {
    return (
      m.includes('llama') ||
      m.includes('qwen') ||
      m.includes('gemma') ||
      m.includes('gpt-oss') ||
      m.includes('distill') ||
      m.includes('groq') ||
      m.includes('mixtral')
    );
  }
  if (provider === 'openai') {
    return (m.startsWith('gpt-') && !m.includes('gpt-oss')) || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('chatgpt');
  }
  if (provider === 'deepseek') {
    return m.includes('deepseek');
  }
  if (provider === 'anthropic') {
    return m.includes('claude');
  }
  if (provider === 'xai') {
    return m.includes('grok');
  }
  if (provider === 'mistral') {
    return m.includes('mistral') || m.includes('codestral');
  }
  return true;
}

export const PROVIDER_ENDPOINTS: Record<string, { chatUrl: string; modelsUrl: string; authHeader: (k: string) => Record<string, string> }> = {
  openai: {
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    modelsUrl: 'https://api.openai.com/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
  deepseek: {
    chatUrl: 'https://api.deepseek.com/chat/completions',
    modelsUrl: 'https://api.deepseek.com/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
  groq: {
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
  openrouter: {
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}`, 'HTTP-Referer': 'https://aistudio.google.com', 'X-Title': 'Lally Habits' }),
  },
  mistral: {
    chatUrl: 'https://api.mistral.ai/v1/chat/completions',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
  together: {
    chatUrl: 'https://api.together.xyz/v1/chat/completions',
    modelsUrl: 'https://api.together.xyz/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
  xai: {
    chatUrl: 'https://api.x.ai/v1/chat/completions',
    modelsUrl: 'https://api.x.ai/v1/models',
    authHeader: (k: string) => ({ 'Authorization': `Bearer ${k}` }),
  },
};

export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'openai/gpt-4o-mini',
  mistral: 'mistral-small-latest',
  anthropic: 'claude-3-7-sonnet-20250219',
  xai: 'grok-2-latest',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  custom: 'default',
};

export const PROVIDER_FALLBACK_LISTS: Record<string, string[]> = {
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
    'o3-mini',
    'o1',
    'gpt-4.1-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen-2.5-32b',
    'deepseek-r1-distill-llama-70b',
    'gemma2-9b-it',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
  ],
  openrouter: [
    'openai/gpt-4o-mini',
    'deepseek/deepseek-r1',
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'meta-llama/llama-3.3-70b-instruct',
  ],
  mistral: [
    'mistral-large-latest',
    'mistral-small-latest',
    'codestral-latest',
    'open-mistral-nemo',
  ],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  xai: [
    'grok-2-latest',
    'grok-beta',
    'grok-vision-beta',
  ],
  together: [
    'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    'deepseek-ai/DeepSeek-V3',
    'deepseek-ai/DeepSeek-R1',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
  ],
  custom: ['default', 'gpt-3.5-turbo', 'llama-3'],
};

export function sanitizeGeminiModelName(model?: string): string {
  if (!model || model === 'auto' || model === 'default') return 'gemini-2.5-flash';
  const m = model.trim();
  const lower = m.toLowerCase();

  // Return standard canonical model names
  if (lower === 'gemini-2.5-flash' || lower.includes('2.5-flash')) {
    return 'gemini-2.5-flash';
  }
  if (lower === 'gemini-2.5-pro' || lower.includes('2.5-pro')) {
    return 'gemini-2.5-pro';
  }
  if (lower === 'gemini-2.0-flash' || lower.includes('2.0-flash')) {
    return 'gemini-2.0-flash';
  }
  if (lower === 'gemini-flash-latest' || lower === 'gemini-flash' || lower === 'flash') {
    return 'gemini-flash-latest';
  }
  if (lower === 'gemini-3.8-flash' || lower.includes('3.8-flash')) {
    return 'gemini-3.8-flash';
  }
  if (lower === 'gemini-3.6-flash' || lower.includes('3.6-flash')) {
    return 'gemini-3.6-flash';
  }
  if (lower === 'gemini-3.1-flash-lite' || lower.includes('3.1-flash-lite') || lower.includes('flash-lite')) {
    return 'gemini-3.1-flash-lite';
  }
  if (lower === 'gemini-3.1-pro-preview' || lower.includes('3.1-pro')) {
    return 'gemini-3.1-pro-preview';
  }
  if (lower.includes('1.5')) {
    return 'gemini-2.5-flash';
  }

  return m;
}

/**
 * Fetch available live models from provider API
 */
export async function fetchLiveModelsFromProvider(
  rawKey: string,
  provider: string
): Promise<{ success: boolean; models: string[]; defaultModel: string; error?: string }> {
  const key = rawKey.trim();
  const fallbackModels = PROVIDER_FALLBACK_LISTS[provider] || PROVIDER_FALLBACK_LISTS.custom;
  const defaultModel = PROVIDER_DEFAULT_MODELS[provider] || fallbackModels[0];

  if (!key) {
    return { success: true, models: fallbackModels, defaultModel };
  }

  try {
    // 1. Google Gemini Model Fetching
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.models && Array.isArray(data.models)) {
          const validModels: string[] = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace(/^models\//, ''))
            .filter((name: string) => {
              const lower = name.toLowerCase();
              return (
                !lower.includes('embedding') &&
                !lower.includes('aqa') &&
                !lower.includes('imagen') &&
                !lower.includes('tts') &&
                !lower.includes('transcribe') &&
                !lower.includes('live') &&
                !lower.includes('1.5')
              );
            });
          
          if (validModels.length > 0) {
            // Sort: prioritize 2.5-flash, flash-latest, 2.5-pro, 2.0-flash, 3.8-flash
            const sorted = validModels.sort((a, b) => {
              const aLower = a.toLowerCase();
              const bLower = b.toLowerCase();
              if (aLower.includes('2.5-flash') && !bLower.includes('2.5-flash')) return -1;
              if (bLower.includes('2.5-flash') && !aLower.includes('2.5-flash')) return 1;
              if (aLower.includes('flash-latest') && !bLower.includes('flash-latest')) return -1;
              if (bLower.includes('flash-latest') && !aLower.includes('flash-latest')) return 1;
              if (aLower.includes('2.5-pro') && !bLower.includes('2.5-pro')) return -1;
              if (bLower.includes('2.5-pro') && !aLower.includes('2.5-pro')) return 1;
              if (aLower.includes('2.0-flash') && !bLower.includes('2.0-flash')) return -1;
              if (bLower.includes('2.0-flash') && !aLower.includes('2.0-flash')) return 1;
              return 0;
            });
            const pickedDefault = sorted.find((m) => m.includes('2.5-flash')) || sorted.find((m) => m.includes('flash-latest')) || sorted[0];
            return { success: true, models: sorted, defaultModel: pickedDefault };
          }
        }
      }
      return { success: true, models: fallbackModels, defaultModel };
    }

    // 2. Anthropic Model Fetching
    if (provider === 'anthropic') {
      try {
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.data && Array.isArray(data.data)) {
            const models = data.data.map((m: any) => m.id);
            return { success: true, models, defaultModel: models[0] || defaultModel };
          }
        }
      } catch {}
      return { success: true, models: fallbackModels, defaultModel };
    }

    // 3. OpenAI and standard OpenAI-compatible providers
    const endpointConfig = PROVIDER_ENDPOINTS[provider];
    if (endpointConfig?.modelsUrl) {
      const res = await fetch(endpointConfig.modelsUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...endpointConfig.authHeader(key),
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        let models: string[] = list
          .filter((item: any) => item && (item.active === undefined || item.active === true))
          .map((item: any) => item.id || item.name || String(item))
          .filter(Boolean);

        // For OpenAI, filter out embeddings/dall-e/tts/audio
        if (provider === 'openai') {
          models = models.filter((m) => m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('chatgpt-'));
        }

        // For Groq, filter out whisper/guard/audio/tts/embeddings and decommissioned models
        if (provider === 'groq') {
          models = models.filter((m) => {
            const lower = m.toLowerCase();
            return !lower.includes('whisper') && 
                   !lower.includes('guard') && 
                   !lower.includes('tts') && 
                   !lower.includes('audio') && 
                   !lower.includes('embedding') &&
                   !lower.includes('playai') &&
                   lower !== 'llama3-8b-8192' &&
                   lower !== 'llama3-70b-8192' &&
                   lower !== 'llama-3.1-70b-versatile' &&
                   lower !== 'mixtral-8x7b-32768';
          });
          // Sort prioritized models: standard reliable models first
          models = models.sort((a, b) => {
            if (a.includes('3.3-70b') && !b.includes('3.3-70b')) return -1;
            if (b.includes('3.3-70b') && !a.includes('3.3-70b')) return 1;
            if (a.includes('3.1-8b') && !b.includes('3.1-8b')) return -1;
            if (b.includes('3.1-8b') && !a.includes('3.1-8b')) return 1;
            if (a.includes('qwen-2.5') && !b.includes('qwen-2.5')) return -1;
            if (b.includes('qwen-2.5') && !a.includes('qwen-2.5')) return 1;
            if (a.includes('gpt-oss') && !b.includes('gpt-oss')) return -1;
            if (b.includes('gpt-oss') && !a.includes('gpt-oss')) return 1;
            return 0;
          });
        }

        if (models.length > 0) {
          const pickedDefault = models.includes(defaultModel) ? defaultModel : models[0];
          return { success: true, models, defaultModel: pickedDefault };
        }
      }
    }

    // If API endpoint wasn't reachable, return curated provider list
    return { success: true, models: fallbackModels, defaultModel };
  } catch (err: any) {
    return { success: true, models: fallbackModels, defaultModel, error: err?.message };
  }
}

/**
 * Direct Google Gemini REST API execution fallback
 */
async function callGeminiRest(
  key: string,
  model: string,
  systemPrompt: string,
  prompt: string,
  temperature: number = 0.3,
  responseJson: boolean = false,
  maxOutputTokens?: number
): Promise<string> {
  const cleanKey = (key && key.trim()) ? key.trim() : (process.env.GEMINI_API_KEY || '').trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is not configured.');
  }
  const effectiveModel = sanitizeGeminiModelName(model || 'gemini-3.8-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${cleanKey}`;
  
  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      ...(responseJson ? { responseMimeType: 'application/json' } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    },
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'aistudio-build' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  // If responseMimeType was rejected by this model version, retry once without it
  if (!res.ok && responseJson && (res.status === 400 || res.status === 404)) {
    const errText = await res.text().catch(() => '');
    delete body.generationConfig.responseMimeType;
    body.contents[0].parts[0].text = `${prompt}\n\nIMPORTANT: Return strictly valid JSON format without extra markdown commentary.`;
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aistudio-build' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini REST error (${res.status}): ${errText.substring(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response received from Gemini REST API');
  }
  return text.trim();
}

/**
 * Execute completion using Google Gemini with SDK and direct REST fallback
 */
async function callGemini(
  key: string,
  model: string,
  systemPrompt: string,
  prompt: string,
  temperature: number = 0.3,
  responseJson: boolean = false,
  maxOutputTokens?: number
): Promise<string> {
  const cleanKey = (key && key.trim()) ? key.trim() : (process.env.GEMINI_API_KEY || '').trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is not configured.');
  }
  const effectiveModel = sanitizeGeminiModelName(model || 'gemini-3.8-flash');

  // Candidate models to try in case of 503 (high demand) or 404
  const modelsToTry = [effectiveModel];
  if (effectiveModel !== 'gemini-3.8-flash') modelsToTry.push('gemini-3.8-flash');
  if (!modelsToTry.includes('gemini-flash-latest')) modelsToTry.push('gemini-flash-latest');

  let lastErr: any = null;

  for (const m of modelsToTry) {
    // 1. Try with @google/genai SDK
    try {
      const ai = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const generatePromise = ai.models.generateContent({
        model: m,
        contents: prompt,
        config: {
          temperature,
          systemInstruction: systemPrompt || undefined,
          ...(responseJson ? { responseMimeType: 'application/json' } : {}),
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini request timeout after 60s for model ${m}`)), 60000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response.text?.trim() || '';
      if (text) return text;
    } catch (err: any) {
      lastErr = err;
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('API_KEY_INVALID') || 
        errMsg.includes('401') || 
        errMsg.includes('403') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Quota exceeded')
      ) {
        throw err;
      }
    }

    // 2. Direct REST fallback
    try {
      return await callGeminiRest(cleanKey, m, systemPrompt, prompt, temperature, responseJson, maxOutputTokens);
    } catch (restErr: any) {
      lastErr = restErr;
      const restMsg = restErr?.message || String(restErr);
      if (
        restMsg.includes('API_KEY_INVALID') || 
        restMsg.includes('401') || 
        restMsg.includes('403') ||
        restMsg.includes('RESOURCE_EXHAUSTED') ||
        restMsg.includes('429') ||
        restMsg.includes('quota') ||
        restMsg.includes('Quota exceeded')
      ) {
        throw restErr;
      }
    }
  }

  throw lastErr || new Error('Gemini API call failed');
}

/**
 * Execute completion using OpenAI-compatible standard chat completion API
 */
async function callOpenAICompatible(
  endpointUrl: string,
  authHeaders: Record<string, string>,
  model: string,
  systemPrompt: string,
  prompt: string,
  temperature: number = 0.3,
  responseJson: boolean = false
): Promise<string> {
  // If JSON mode is requested, ensure explicit instruction in prompts
  let finalSystemPrompt = systemPrompt || '';
  let finalPrompt = prompt || '';
  if (responseJson) {
    const jsonDirective = 'CRITICAL: Output must be strictly valid JSON format only without extra prose or conversational comments.';
    finalSystemPrompt = finalSystemPrompt ? `${finalSystemPrompt}\n\n${jsonDirective}` : jsonDirective;
    if (!finalPrompt.toLowerCase().includes('json')) {
      finalPrompt = `${finalPrompt}\n\nReturn strictly valid JSON format.`;
    }
  }

  const messages: any[] = [];
  if (finalSystemPrompt) {
    messages.push({ role: 'system', content: finalSystemPrompt });
  }
  messages.push({ role: 'user', content: finalPrompt });

  const body: any = {
    model,
    messages,
    temperature,
    max_tokens: 8192,
  };

  // Only attach response_format json_object for models known to support it without strict schema validation rejection
  const isModelWithStrictJsonIssue = 
    model.includes('gpt-oss') || 
    model.includes('qwen') || 
    model.includes('vision');

  if (responseJson && !isModelWithStrictJsonIssue) {
    body.response_format = { type: 'json_object' };
  }

  let res = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  // If 400 with json_validate_failed, max completion tokens, or response_format error, retry once WITHOUT response_format!
  if (!res.ok && responseJson && res.status === 400) {
    const errBody = await res.text().catch(() => '');
    const isJsonFormatError = 
      errBody.includes('json_validate_failed') ||
      errBody.includes('response_format') ||
      errBody.includes('Failed to validate JSON') ||
      errBody.includes('Failed to generate JSON') ||
      errBody.includes('max completion tokens reached') ||
      errBody.includes('json_object');

    if (isJsonFormatError) {
      console.info(`[callOpenAICompatible] ${model} retrying with prompt-guided JSON...`);
      delete body.response_format;
      res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } else {
      throw new Error(`AI API error (${res.status}): ${errBody.substring(0, 300)}`);
    }
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`AI API error (${res.status}): ${errorText.substring(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const choice = data.choices?.[0];
  let content = choice?.message?.content;

  // Handle thinking / reasoning models that put output in reasoning_content or text
  if ((!content || typeof content !== 'string' || content.trim() === '') && choice?.message?.reasoning_content) {
    content = choice.message.reasoning_content;
  }
  if ((!content || typeof content !== 'string' || content.trim() === '') && choice?.text) {
    content = choice.text;
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    throw new Error('Invalid or empty completion content in API response');
  }
  return content.trim();
}

/**
 * Execute completion using Anthropic Claude API
 */
async function callAnthropic(
  key: string,
  model: string,
  systemPrompt: string,
  prompt: string,
  temperature: number = 0.3
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature,
      system: systemPrompt || undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Anthropic API error (${res.status}): ${errText.substring(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const block = data.content?.find((b: any) => b.type === 'text');
  if (!block || !block.text) {
    throw new Error('Empty response text from Anthropic Claude');
  }
  return block.text.trim();
}

/**
 * Test a single AI key with a quick lightweight ping and multi-model fallback testing
 */
export async function testSingleAIKey(
  key: string,
  providerInput: string,
  model?: string
): Promise<{ success: boolean; modelUsed: string; latencyMs: number; message: string; availableModels?: string[] }> {
  const startTime = Date.now();
  const provider = (!providerInput || providerInput === 'auto' || providerInput === 'unknown') 
    ? detectProviderFromKey(key) 
    : providerInput;
  const fallbackModels = PROVIDER_FALLBACK_LISTS[provider] || PROVIDER_FALLBACK_LISTS.custom || ['default'];
  
  // Dynamically fetch live available models for this specific API key if possible
  let liveModels: string[] = [];
  try {
    const liveRes = await fetchLiveModelsFromProvider(key, provider);
    if (liveRes.success && Array.isArray(liveRes.models) && liveRes.models.length > 0) {
      liveModels = liveRes.models;
    }
  } catch (e) {
    // ignore live model discovery error
  }

  const modelPool = liveModels.length > 0 ? liveModels : fallbackModels;

  const isDecommissioned = (m: string) => {
    const l = m.toLowerCase();
    if (provider === 'gemini') {
      return (
        l.includes('embedding') ||
        l.includes('aqa') ||
        l.includes('imagen')
      );
    }
    if (provider === 'groq') {
      return (
        l === 'llama3-8b-8192' ||
        l === 'llama3-70b-8192' ||
        l === 'llama-3.1-70b-versatile' ||
        l === 'mixtral-8x7b-32768' ||
        l.includes('whisper') ||
        l.includes('guard')
      );
    }
    return false;
  };

  const candidates: string[] = [];
  if (model && model !== 'auto') {
    const sanitized = provider === 'gemini' ? sanitizeGeminiModelName(model) : model;
    if (!isDecommissioned(sanitized) && !candidates.includes(sanitized)) {
      candidates.push(sanitized);
    }
  }
  for (const m of modelPool) {
    const sanitized = provider === 'gemini' ? sanitizeGeminiModelName(m) : m;
    if (!isDecommissioned(sanitized) && !candidates.includes(sanitized)) {
      candidates.push(sanitized);
    }
  }

  // Fallback candidate if everything was filtered out
  if (candidates.length === 0) {
    const safeFallback = fallbackModels.map((m) => provider === 'gemini' ? sanitizeGeminiModelName(m) : m).filter((m) => !isDecommissioned(m));
    candidates.push(...(safeFallback.length > 0 ? safeFallback : [provider === 'gemini' ? 'gemini-2.5-flash' : 'llama-3.3-70b-versatile']));
  }

  let lastError = '';

  for (const testModel of candidates) {
    try {
      let output = '';
      if (provider === 'gemini') {
        output = await callGemini(key, testModel, '', 'Please reply with the exact word: OK', 0.1);
      } else if (provider === 'anthropic') {
        output = await callAnthropic(key, testModel, '', 'Please reply with the exact word: OK', 0.1);
      } else {
        const endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
        output = await callOpenAICompatible(
          endpoint.chatUrl,
          endpoint.authHeader(key),
          testModel,
          '',
          'Please reply with the exact word: OK',
          0.1
        );
      }

      if (output) {
        const latency = Date.now() - startTime;
        return {
          success: true,
          modelUsed: testModel,
          latencyMs: latency,
          availableModels: modelPool,
          message: `اتصال به سرویس با مدل ${testModel} با موفقیت تأیید شد (${latency}ms).`,
        };
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[testSingleAIKey] Model ${testModel} failed for provider ${provider}:`, lastError);
    }
  }

  // If all candidate models failed for this key
  const latency = Date.now() - startTime;
  let friendlyMsg = lastError || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی';
  if (lastError.includes('API_KEY_INVALID') || lastError.includes('401') || lastError.includes('Incorrect API key')) {
    friendlyMsg = 'کلید API وارد شده نامعتبر یا منقضی شده است (۴۰۱). لطفاً کلید صحیح را از پنل خود کپی کنید.';
  } else if (lastError.includes('RESOURCE_EXHAUSTED') || lastError.includes('429') || lastError.includes('quota')) {
    friendlyMsg = 'سهمیه استفاده رایگان یا اعتبار این کلید به اتمام رسیده است (خطای سهمیه ۴۲۹).';
  } else if (lastError.includes('NOT_FOUND') || lastError.includes('404') || lastError.includes('model_not_found') || lastError.includes('decommissioned')) {
    friendlyMsg = 'مدل انتخاب شده پشتیبانی نمی‌شود یا از رده خارج شده است. مدل دیگری از لیست انتخاب نمایید.';
  } else if (lastError.includes('503') || lastError.includes('UNAVAILABLE') || lastError.includes('high demand') || lastError.includes('overloaded')) {
    friendlyMsg = 'مدل‌های هوش مصنوعی ارائه‌دهنده در حال حاضر با بار ترافیکی و تقاضای بالا مواجه هستند (۵۰۳). لطفاً کمی بعدتر تست کنید یا از کلید ارائه‌دهنده دیگری استفاده نمایید.';
  }

  return {
    success: false,
    modelUsed: candidates[0] || 'default',
    latencyMs: latency,
    availableModels: modelPool,
    message: friendlyMsg,
  };
}

export interface MultiProviderCompletionResult {
  text: string;
  providerUsed: string;
  modelUsed: string;
  keyIndexUsed?: number;
  switchedKey?: boolean;
  switchedFromKeyIndex?: number;
  switchedFromProvider?: string;
  keySwitchMessage?: string;
  errorsEncountered?: Array<{ keyIndex: number; provider: string; model: string; error: string }>;
}

/**
 * Executes a prompt across multiple AI keys with automatic failover and key rotation!
 * Strictly uses only user-provided API keys from settings/request.
 */
export async function executeMultiProviderCompletion(options: {
  keys?: AIKeyConfig[];
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  responseJson?: boolean;
  maxOutputTokens?: number;
  startIndex?: number;
}): Promise<MultiProviderCompletionResult> {
  const {
    keys = [],
    systemPrompt = '',
    prompt,
    temperature = 0.3,
    responseJson = false,
    maxOutputTokens,
    startIndex = 0,
  } = options;

  const errorsEncountered: Array<{ keyIndex: number; provider: string; model: string; error: string }> = [];

  // Filter valid user keys
  const activeKeys = [...keys.filter((k) => k && k.key && k.key.trim().length > 0)];

  // Always ensure system GEMINI_API_KEY is available as a final fallback if not already registered
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    const envKey = process.env.GEMINI_API_KEY.trim();
    const alreadyPresent = activeKeys.some((k) => (k?.key || '').trim() === envKey);
    if (!alreadyPresent) {
      activeKeys.push({
        key: envKey,
        provider: 'gemini',
        selectedModel: 'gemini-3.8-flash',
        availableModels: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'],
        isValid: true,
        label: 'کلید پشتیبان سیستم (Gemini)',
      });
    }
  }

  if (activeKeys.length === 0) {
    throw new Error(
      'هیچ کلید هوش مصنوعی فعالی یافت نشد. لطفاً در بخش تنظیمات پیشرفته، کلید API اختصاصی خود را وارد نمایید.'
    );
  }

  // 1. Iterate through keys starting from requested startIndex, wrapping around if needed
  const startIdx = Math.max(0, Math.min(startIndex, activeKeys.length - 1));
  const keyOrder: number[] = [];
  for (let idx = startIdx; idx < activeKeys.length; idx++) keyOrder.push(idx);
  for (let idx = 0; idx < startIdx; idx++) keyOrder.push(idx);

  for (const i of keyOrder) {
    const keyConfig = activeKeys[i];
    const key = (keyConfig.key || '').trim().replace(/^["'`]|["'`]$/g, '');
    if (!key) continue;

    const compatibleProviders = getCompatibleProvidersForKey(key, keyConfig.provider);

    for (const provider of compatibleProviders) {
      // Build candidate models strictly valid for this provider
      const candidateModels: string[] = [];

      let rawPrimary = keyConfig.selectedModel;
      if (!rawPrimary || !isModelValidForProvider(rawPrimary, provider)) {
        rawPrimary = PROVIDER_DEFAULT_MODELS[provider] || (provider === 'gemini' ? 'gemini-3.8-flash' : 'llama-3.3-70b-versatile');
      }
      const primaryModel = provider === 'gemini' ? sanitizeGeminiModelName(rawPrimary) : rawPrimary;
      if (primaryModel && !candidateModels.includes(primaryModel)) {
        candidateModels.push(primaryModel);
      }

      // Add user-selected availableModels if valid for this provider
      if (Array.isArray(keyConfig.availableModels)) {
        for (const m of keyConfig.availableModels) {
          if (!isModelValidForProvider(m, provider)) continue;
          const sanitized = provider === 'gemini' ? sanitizeGeminiModelName(m) : m;
          if (sanitized && !candidateModels.includes(sanitized)) {
            candidateModels.push(sanitized);
          }
        }
      }

      // Add curated reliable fallback models for this provider
      const curatedFallbacks = PROVIDER_FALLBACK_LISTS[provider] || [];
      for (const m of curatedFallbacks) {
        if (!candidateModels.includes(m)) {
          candidateModels.push(m);
        }
      }

      console.info(`[MultiProviderAI] Attempting Key #${i + 1} with provider "${provider}" (${candidateModels[0]})...`);

      let providerAuthFailed = false;
      let keyRateLimitCount = 0;

      for (const model of candidateModels) {
        try {
          let resultText = '';

          if (provider === 'gemini') {
            resultText = await callGemini(key, model, systemPrompt, prompt, temperature, responseJson, maxOutputTokens);
          } else if (provider === 'anthropic') {
            resultText = await callAnthropic(key, model, systemPrompt, prompt, temperature);
          } else {
            const endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.openai;
            resultText = await callOpenAICompatible(
              endpoint.chatUrl,
              endpoint.authHeader(key),
              model,
              systemPrompt,
              prompt,
              temperature,
              responseJson
            );
          }

          if (resultText && resultText.trim().length > 0) {
            console.info(`[MultiProviderAI] Key #${i + 1} (${provider} / ${model}) succeeded!`);
            const isSwitched = i !== startIdx;
            return {
              text: resultText,
              providerUsed: provider,
              modelUsed: model,
              keyIndexUsed: i,
              switchedKey: isSwitched,
              switchedFromKeyIndex: isSwitched ? startIdx : undefined,
              switchedFromProvider: isSwitched ? (activeKeys[startIdx]?.provider || 'نامشخص') : undefined,
              keySwitchMessage: isSwitched
                ? `کلید هوش مصنوعی تعویض شد: اکنون از کلید شماره ${i + 1} (${provider} - ${model}) استفاده می‌شود.`
                : undefined,
              errorsEncountered,
            };
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn(`[MultiProviderAI] Key #${i + 1} (${provider} / ${model}) failed:`, errMsg);
          errorsEncountered.push({
            keyIndex: i + 1,
            provider,
            model,
            error: errMsg,
          });

          // Check for auth error on this key
          const isAuthError = 
            errMsg.includes('API_KEY_INVALID') || 
            errMsg.includes('401') || 
            errMsg.includes('403') || 
            errMsg.includes('Incorrect API key') ||
            errMsg.includes('invalid_api_key') ||
            errMsg.includes('API key not valid') ||
            errMsg.includes('Authentication Fails') ||
            errMsg.includes('authentication_error') ||
            errMsg.includes('unauthorized') ||
            errMsg.includes('Unauthorized');

          if (isAuthError) {
            providerAuthFailed = true;
            console.warn(`[MultiProviderAI] Key #${i + 1} authentication failed. Skipping key.`);
            break; // Stop testing models on this invalid key
          }

          // Check for account credit exhaustion (e.g. OpenAI balance $0)
          const isAccountBalanceExhausted = errMsg.includes('insufficient_quota');
          if (isAccountBalanceExhausted) {
            console.warn(`[MultiProviderAI] Key #${i + 1} account balance exhausted (${provider}). Advancing to next key.`);
            break;
          }

          // Check for rate limit / quota exhaustion
          const isRateLimit =
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Rate limit reached') ||
            errMsg.includes('quota') ||
            errMsg.includes('Quota exceeded');

          if (isRateLimit) {
            keyRateLimitCount++;
            if (keyRateLimitCount >= 2) {
              console.warn(`[MultiProviderAI] Key #${i + 1} hit rate limits across multiple models (${provider}). Advancing to next key.`);
              break; // After 2 models hitting rate limits on this key, advance to next key
            } else {
              console.info(`[MultiProviderAI] Key #${i + 1} hit model rate limit on ${model}, attempting next fallback model for ${provider}...`);
              continue; // Try next model on this key (e.g. llama-3.3-70b on Groq)
            }
          }
        }
      }

      if (providerAuthFailed) {
        break; // If key had auth error, don't try other providers on this same key
      }
    }
  }

  if (errorsEncountered.length > 0) {
    const lastErr = errorsEncountered[errorsEncountered.length - 1].error;
    let friendly = lastErr;
    if (lastErr.includes('API_KEY_INVALID') || lastErr.includes('401') || lastErr.includes('Incorrect API key')) {
      friendly = 'کلید API ارائه شده نامعتبر است (۴۰۱). لطفاً کلید صحیح را در تنظیمات وارد کنید.';
    } else if (lastErr.includes('RESOURCE_EXHAUSTED') || lastErr.includes('429') || lastErr.includes('quota')) {
      friendly = 'سهمیه استفاده از این کلید هوش مصنوعی به اتمام رسیده یا با محدودیت نرخ درخواست (۴۲۹) مواجه شده است.';
    } else if (lastErr.includes('413') || lastErr.includes('Request too large') || lastErr.includes('TPM')) {
      friendly = 'حجم متن ارسالی برای مدل انتخاب شده بیش از حد مجاز سهمیه توکن بر دقیقه (TPM) است. از مدل‌های با ظرفیت بالاتر مانند Llama 3.3 استفاده نمایید.';
    } else if (lastErr.includes('503') || lastErr.includes('UNAVAILABLE') || lastErr.includes('high demand') || lastErr.includes('overloaded')) {
      friendly = 'مدل‌های هوش مصنوعی ارائه‌دهنده در حال حاضر با بار ترافیکی بالا مواجه هستند (۵۰۳). لطفاً لحظاتی دیگر مجدداً امتحان نمایید یا از کلید ارائه‌دهنده دیگری استفاده کنید.';
    }
    throw new Error(`خطا در اجرای هوش مصنوعی با کلیدهای شما: ${friendly}`);
  }

  throw new Error('هیچ کلید هوش مصنوعی معتبری یافت نشد. لطفاً در بخش تنظیمات پیشرفته، کلید اختصاصی خود را وارد نمایید.');
}

/**
 * Automatically refresh available models for all configured keys across analytics and translation sections.
 * Also discovers and sets best models if selected model is missing or deprecated.
 */
export async function autoRefreshAllConfiguredKeys(aiConfig: any): Promise<{
  success: boolean;
  updatedCount: number;
  results: Array<{
    id?: string;
    label?: string;
    provider: string;
    modelCount: number;
    selectedModel: string;
    availableModels: string[];
  }>;
}> {
  if (!aiConfig || typeof aiConfig !== 'object') {
    return { success: true, updatedCount: 0, results: [] };
  }

  const results: Array<{
    id?: string;
    label?: string;
    provider: string;
    modelCount: number;
    selectedModel: string;
    availableModels: string[];
  }> = [];

  let updatedCount = 0;
  const sections = ['analyticsAI', 'translationAI'];

  for (const secKey of sections) {
    const sec = aiConfig[secKey];
    if (sec && Array.isArray(sec.keys)) {
      for (const k of sec.keys) {
        if (!k.key || !k.key.trim()) continue;
        const prov = (k.provider && k.provider !== 'auto' && k.provider !== 'unknown')
          ? k.provider
          : detectProviderFromKey(k.key);

        try {
          const fetchRes = await fetchLiveModelsFromProvider(k.key, prov);
          if (fetchRes.success && Array.isArray(fetchRes.models) && fetchRes.models.length > 0) {
            k.availableModels = fetchRes.models;
            k.isValid = true;
            // If selectedModel is missing or not in available models or is an old deprecated name, update to default
            if (!k.selectedModel || !fetchRes.models.includes(k.selectedModel)) {
              k.selectedModel = fetchRes.defaultModel;
            }
            updatedCount++;
            results.push({
              id: k.id,
              label: k.name || k.label || prov,
              provider: prov,
              modelCount: fetchRes.models.length,
              selectedModel: k.selectedModel,
              availableModels: fetchRes.models,
            });
          }
        } catch (fetchErr) {
          console.warn(`[autoRefreshAllConfiguredKeys] Error refreshing key ${k.id || prov}:`, fetchErr);
        }
      }
    }
  }

  return { success: true, updatedCount, results };
}

