import fs from 'fs';
import path from 'path';
import { executeMultiProviderCompletion, AIKeyConfig } from './multiProviderAI';
import { getPersistentDatabase, savePersistentDatabase } from './persistentStorage';

export interface ServerTranslationChapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  sourceFileName?: string;
  isTranslated?: boolean;
}

export interface ServerTranslationJob {
  id: string;
  novelId: string;
  novelTitle: string;
  author?: string;
  genre?: string;
  synopsis?: string;
  coverGradient?: string;
  price: number;
  pricePerChapter?: number;
  isPriceLocked?: boolean;
  targetLang: 'fa' | 'ar' | 'en';
  engine: 'free' | 'ai';
  engineUsed?: 'free' | 'ai' | 'mixed';
  failoverOccurred?: boolean;
  failoverReason?: string;
  errorDetails?: {
    primaryEngine: 'free' | 'ai';
    webError?: string;
    aiError?: string;
    summary?: string;
  };
  aiKeys?: AIKeyConfig[];
  status: 'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  totalChapters: number;
  completedChapters: number;
  currentChapterIndex: number;
  currentChapterTitle: string;
  currentProgressPercent: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
  chapters: ServerTranslationChapter[];
}

const JOBS_FILE_PATH = path.join(process.cwd(), 'data', 'server_translation_jobs.json');

// In-memory cache of server jobs
const serverJobsMap: Map<string, ServerTranslationJob> = new Map();
const jobAbortControllers: Map<string, AbortController> = new Map();
let isWorkerRunning = false;

function loadJobsFromDisk() {
  try {
    if (fs.existsSync(JOBS_FILE_PATH)) {
      const raw = fs.readFileSync(JOBS_FILE_PATH, 'utf-8');
      const list: ServerTranslationJob[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((diskJob) => {
          const inMem = serverJobsMap.get(diskJob.id);
          // Protection: NEVER overwrite in-memory state if job is actively running
          // or if in-memory progress is further ahead or more recent!
          if (inMem) {
            if (inMem.status === 'running') {
              return;
            }
            if ((inMem.completedChapters || 0) > (diskJob.completedChapters || 0)) {
              return;
            }
            if ((inMem.updatedAt || 0) > (diskJob.updatedAt || 0)) {
              return;
            }
          }
          serverJobsMap.set(diskJob.id, diskJob);
        });
      }
    }
  } catch (err) {
    console.warn('[ServerTranslation] Error loading jobs from disk:', err);
  }
}

let isDiskSaveScheduled = false;
let lastDiskSaveTime = 0;

function scheduleThrottledDiskSave() {
  const now = Date.now();
  if (now - lastDiskSaveTime > 1000) {
    lastDiskSaveTime = now;
    saveJobsToDisk();
  } else if (!isDiskSaveScheduled) {
    isDiskSaveScheduled = true;
    setTimeout(() => {
      isDiskSaveScheduled = false;
      lastDiskSaveTime = Date.now();
      saveJobsToDisk();
    }, 1000);
  }
}

export function saveJobsToDisk() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const list = Array.from(serverJobsMap.values());
    fs.writeFileSync(JOBS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ServerTranslation] Error saving jobs to disk:', err);
  }
}

// Helper: Safely split long text into small, bite-sized chunks guaranteed to not exceed maxChunkLen
export function splitTextIntoSafeChunks(text: string, maxChunkLen: number = 900): string[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  const rawParagraphs = clean.split(/\n\s*\n/);
  const safeChunks: string[] = [];

  for (const rawPara of rawParagraphs) {
    const para = rawPara.trim();
    if (!para) continue;

    if (para.length <= maxChunkLen) {
      safeChunks.push(para);
      continue;
    }

    // Split long paragraph by single newlines
    const lines = para.split(/\n+/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.length <= maxChunkLen) {
        safeChunks.push(line);
        continue;
      }

      // Split line by sentence punctuation (. ! ? ؛ …)
      const sentences = line.split(/(?<=[.!?؟؛…])\s+/);
      let accumulated = '';

      for (const sent of sentences) {
        const trimmedSent = sent.trim();
        if (!trimmedSent) continue;

        if (trimmedSent.length > maxChunkLen) {
          if (accumulated) {
            safeChunks.push(accumulated.trim());
            accumulated = '';
          }
          // Split by word boundary
          const words = trimmedSent.split(/\s+/);
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).length > maxChunkLen) {
              if (wordChunk) safeChunks.push(wordChunk.trim());
              wordChunk = w;
            } else {
              wordChunk = wordChunk ? wordChunk + ' ' + w : w;
            }
          }
          if (wordChunk) safeChunks.push(wordChunk.trim());
        } else if ((accumulated + ' ' + trimmedSent).length > maxChunkLen) {
          if (accumulated) safeChunks.push(accumulated.trim());
          accumulated = trimmedSent;
        } else {
          accumulated = accumulated ? accumulated + ' ' + trimmedSent : trimmedSent;
        }
      }
      if (accumulated) {
        safeChunks.push(accumulated.trim());
      }
    }
  }

  return safeChunks.length > 0 ? safeChunks : [clean.substring(0, maxChunkLen)];
}

// Helper: Check if translated text is genuinely translated into target language
export function isTextActuallyTranslated(
  original: string,
  translated: string,
  targetLang: string = 'fa'
): boolean {
  if (!translated || !translated.trim()) return false;
  const cleanTrans = translated.trim();
  const cleanOrig = (original || '').trim();
  if (cleanTrans.length === 0) return false;

  // If target is Persian or Arabic and translated text contains Persian/Arabic chars
  if (targetLang === 'fa' || targetLang === 'ar') {
    const hasTargetChars = /[\u0600-\u06FF]/.test(cleanTrans);
    if (hasTargetChars) {
      return true;
    }
    // If original already has Persian/Arabic and trans matches it, it is already in target language
    if (/[\u0600-\u06FF]/.test(cleanOrig)) {
      return true;
    }
    return false;
  }

  if (cleanOrig.length > 8 && cleanTrans === cleanOrig) return false;
  return true;
}

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Helper: Free Web Translation Engine (Server-side with mobile web, fallback endpoints, safe chunking, and AI auto-upgrade)
export async function serverTranslateTextWithFreeEngine(
  text: string,
  targetLang: string = 'fa',
  sourceLang: string = 'auto'
): Promise<string> {
  const clean = text.trim();
  if (!clean) return '';

  const chunks = splitTextIntoSafeChunks(clean, 750);
  if (chunks.length === 0) return clean;

  const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
  const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const translateChunk = async (chunk: string): Promise<string> => {
    if (!chunk.trim()) return '';

    // 1. Primary: Google Mobile Web Translate (Extremely reliable, bypasses datacenter blocks, returns clean HTML)
    try {
      const mobileUrl = `https://translate.google.com/m?sl=${sourceLang}&tl=${targetLang}&q=${encodeURIComponent(chunk)}`;
      const res0 = await fetch(mobileUrl, {
        headers: {
          'User-Agent': mobileUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res0.ok) {
        const html = await res0.text();
        const match = html.match(/<div class="result-container">([\s\S]*?)<\/div>/);
        if (match && match[1]) {
          const trans = decodeHtmlEntities(match[1]).trim();
          if (trans && isTextActuallyTranslated(chunk, trans, targetLang)) {
            return trans;
          }
        }
      }
    } catch {}

    // 2. Secondary: Googleapis GTX via GET
    try {
      const gtxGetUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
      const res2 = await fetch(gtxGetUrl, {
        headers: { 'User-Agent': desktopUserAgent },
        signal: AbortSignal.timeout(4000),
      });
      if (res2.ok) {
        const rawJson2 = (await res2.json()) as any;
        if (Array.isArray(rawJson2) && Array.isArray(rawJson2[0])) {
          const trans2 = rawJson2[0]
            .map((item: any) => (Array.isArray(item) ? item[0] : ''))
            .filter(Boolean)
            .join('');
          if (trans2 && trans2.trim().length > 0 && isTextActuallyTranslated(chunk, trans2, targetLang)) {
            return trans2.trim();
          }
        }
      }
    } catch {}

    // 3. Tertiary: Googleapis GTX via POST
    try {
      const gtxPostUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t`;
      const res1 = await fetch(gtxPostUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          'User-Agent': desktopUserAgent,
          'Accept': '*/*',
        },
        body: new URLSearchParams({ q: chunk }).toString(),
        signal: AbortSignal.timeout(4000),
      });

      if (res1.ok) {
        const rawJson = (await res1.json()) as any;
        if (Array.isArray(rawJson) && Array.isArray(rawJson[0])) {
          const trans = rawJson[0]
            .map((item: any) => (Array.isArray(item) ? item[0] : ''))
            .filter(Boolean)
            .join('');
          if (trans && trans.trim().length > 0 && isTextActuallyTranslated(chunk, trans, targetLang)) {
            return trans.trim();
          }
        }
      }
    } catch {}

    // 4. Quaternary: clients5 Google Translate (client=dict-chrome-ex via POST)
    try {
      const clients5Url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sourceLang}&tl=${targetLang}`;
      const res3 = await fetch(clients5Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          'User-Agent': desktopUserAgent,
        },
        body: new URLSearchParams({ q: chunk }).toString(),
        signal: AbortSignal.timeout(4000),
      });

      if (res3.ok) {
        const rawJson3 = (await res3.json()) as any;
        if (Array.isArray(rawJson3) && Array.isArray(rawJson3[0])) {
          const trans3 = rawJson3[0][0];
          if (typeof trans3 === 'string' && trans3.trim().length > 0 && isTextActuallyTranslated(chunk, trans3, targetLang)) {
            return trans3.trim();
          }
        } else if (typeof rawJson3 === 'string' && rawJson3.trim().length > 0 && isTextActuallyTranslated(chunk, rawJson3, targetLang)) {
          return rawJson3.trim();
        }
      }
    } catch {}

    // 5. Quinary: MyMemory API for smaller snippets
    try {
      const subChunk = chunk.length > 450 ? chunk.substring(0, 450) : chunk;
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(subChunk)}&langpair=${sourceLang === 'auto' ? 'en' : sourceLang}|${targetLang}`;
      const res4 = await fetch(myMemoryUrl, { signal: AbortSignal.timeout(4000) });
      if (res4.ok) {
        const data = (await res4.json()) as any;
        const transText = data.responseData?.translatedText;
        if (transText && !transText.includes('MYMEMORY WARNING') && isTextActuallyTranslated(subChunk, transText, targetLang)) {
          return transText.trim();
        }
      }
    } catch {}

    return '';
  };

  // Translate chunks concurrently in batches of 3 for high performance
  const results: string[] = new Array(chunks.length);
  const concurrency = 3;
  let cursor = 0;

  const chunkWorker = async () => {
    while (cursor < chunks.length) {
      const idx = cursor++;
      const chunk = chunks[idx];
      const trans = await translateChunk(chunk);
      if (trans && isTextActuallyTranslated(chunk, trans, targetLang)) {
        results[idx] = trans;
      } else {
        results[idx] = chunk;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, () => chunkWorker())
  );

  // Count how many chunks were translated
  const translatedChunksCount = results.filter((r, idx) => isTextActuallyTranslated(chunks[idx], r, targetLang)).length;
  if (translatedChunksCount > 0) {
    return results.join('\n\n');
  }

  // If free web engine produced 0 translated chunks, auto-failover to Gemini AI if available
  if (process.env.GEMINI_API_KEY) {
    try {
      console.info('[ServerTranslation] Free engine produced no chunks, auto-upgrading chunk to AI (Gemini)...');
      const aiResult = await serverTranslateNovelWithAI(clean, '', targetLang);
      if (aiResult.content && isTextActuallyTranslated(clean, aiResult.content, targetLang)) {
        return aiResult.content;
      }
    } catch (aiErr) {
      console.warn('[ServerTranslation] Auto-upgrade to AI failed:', aiErr);
    }
  }

  throw new Error('موتور وب به دلیل مسدودسازی یا محدودیت نرخ قادر به ترجمه نبود. لطفاً از موتور هوش مصنوعی استفاده فرمایید.');
}

// Helper: AI Novel Translation (Server-side)
export async function serverTranslateNovelWithAI(
  text: string,
  title: string = '',
  targetLang: string = 'fa',
  aiKeys?: AIKeyConfig[]
): Promise<{ title: string; content: string; engineUsed: string }> {
  const isFa = targetLang === 'fa';
  const isAr = targetLang === 'ar';
  const langName = isFa ? 'Persian (Farsi - فارسی سلیس، روان و ادبی)' : isAr ? 'Arabic (العربية الفصحى)' : 'English';

  const cleanText = text.trim();
  if (!cleanText) {
    return { title: title.trim(), content: '', engineUsed: 'none' };
  }

  const activeKeys = [...(aiKeys && aiKeys.length > 0 ? aiKeys : [])];
  if (activeKeys.length === 0) {
    try {
      const db = getPersistentDatabase();
      const savedKeys = db.advancedSettings?.aiConfig?.translationAI?.keys;
      if (Array.isArray(savedKeys) && savedKeys.length > 0) {
        const validSaved = savedKeys.filter((k: any) => k?.key && typeof k.key === 'string' && k.key.trim().length > 0);
        if (validSaved.length > 0) {
          activeKeys.push(...validSaved);
        }
      }
    } catch {}
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    const envKey = process.env.GEMINI_API_KEY.trim();
    const alreadyPresent = activeKeys.some((k: any) => {
      const existing = typeof k === 'string' ? k : (k?.key || '');
      return existing.trim() === envKey;
    });
    if (!alreadyPresent) {
      activeKeys.push({
        key: envKey,
        provider: 'gemini',
        selectedModel: 'gemini-3.8-flash',
        availableModels: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'],
        isValid: true,
        label: 'کلید پیش‌فرض سیستم (Gemini)',
      });
    }
  }

  // If no AI keys available, fallback to free web engine
  if (activeKeys.length === 0) {
    const [transTitle, transContent] = await Promise.all([
      title && title.trim() ? serverTranslateTextWithFreeEngine(title, targetLang) : Promise.resolve(title),
      serverTranslateTextWithFreeEngine(cleanText, targetLang),
    ]);
    return {
      title: transTitle || title,
      content: transContent || cleanText,
      engineUsed: 'free_engine',
    };
  }

  const CHUNK_SIZE = 8500;
  const chunks: string[] = [];

  if (cleanText.length <= CHUNK_SIZE) {
    chunks.push(cleanText);
  } else {
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';
    for (const p of paragraphs) {
      if ((currentChunk + '\n\n' + p).length > CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + p : p;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  }

  const translateTitleTask = async (): Promise<string> => {
    if (!title || !title.trim()) return title;
    try {
      const titlePrompt = `Translate this web novel chapter title into ${langName}. Return ONLY the translated title text without quotes:\n\n${title}`;
      const titleResp = await executeMultiProviderCompletion({
        keys: activeKeys,
        prompt: titlePrompt,
        temperature: 0.2,
      });
      if (titleResp.text) {
        return titleResp.text.replace(/^["'«]+|["'»]+$/g, '').trim();
      }
    } catch {
      try {
        return await serverTranslateTextWithFreeEngine(title, targetLang);
      } catch {}
    }
    return title;
  };

  const translateSingleAIChunk = async (chunk: string): Promise<string> => {
    const prompt = `You are a professional literary novel translator specializing in web novels and light novels.
Translate the following story excerpt into ${langName}.

Requirements:
1. Deliver a natural, fluent, and immersive literary translation.
2. Translate all dialogue with natural tone and emotional depth.
3. Preserve paragraph breaks (double newlines).
4. Do NOT omit or summarize any sentences.
5. Return ONLY the translated story text.

Novel Text to Translate:
${chunk}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const chunkRes = await executeMultiProviderCompletion({
          keys: activeKeys,
          prompt,
          temperature: 0.3,
        });
        if (chunkRes.text && chunkRes.text.trim().length > 10) {
          return chunkRes.text.trim();
        }
      } catch {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    try {
      const freeRes = await serverTranslateTextWithFreeEngine(chunk, targetLang);
      if (freeRes && freeRes.trim().length > 5) {
        return freeRes.trim();
      }
    } catch {}

    return chunk;
  };

  const [translatedTitle, ...translatedChunks] = await Promise.all([
    translateTitleTask(),
    ...chunks.map((c) => translateSingleAIChunk(c)),
  ]);

  return {
    title: translatedTitle || title,
    content: translatedChunks.join('\n\n'),
    engineUsed: 'ai_with_failover',
  };
}

export interface ChapterTranslationResult {
  content: string;
  title?: string;
  engineUsed: 'free' | 'ai';
  failoverOccurred: boolean;
  failoverReason?: string;
}

/**
 * Intelligently extract chapter number and subtitle, and translate only the subtitle.
 * Formats final title strictly as:
 * "فصل [شماره]: [عنوان ترجمه‌شده]" or "فصل [شماره]"
 * Eliminates long, meaningless titles, novel titles, or uploader codes.
 */
export async function formatAndTranslateChapterTitle(
  rawTitle: string,
  chapterNumber: number | null,
  targetLang: string = 'fa',
  engine: 'free' | 'ai' = 'free',
  aiKeys: any[] = []
): Promise<string> {
  const isFa = targetLang === 'fa';
  const isAr = targetLang === 'ar';

  let num: number | null = typeof chapterNumber === 'number' && chapterNumber > 0 ? chapterNumber : null;
  const str = (rawTitle || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.(html?|xhtml|txt|epub|pdf|md)$/i, '')
    .replace(/[_.\-]*(?:raw|v\d+|1080p|720p|scan|asura|reaper|flame|boxnovel|wuxia|webnovel).*$/i, '')
    .replace(/\s*[|\-—–]\s*(?:Webnovel|ReadNovelFull|NovelFull|Novels|WuxiaWorld|LightNovel|LightNovelPub|ناول|رمان|Novel Updates|BoxNovel|RoyalRoad|ScribbleHub|MoonQuill|Free Web Novel|Read free novel online|Read light novel online).*$/i, '')
    .trim();

  const normalized = str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  if (num === null) {
    const matchNum = normalized.match(/(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)[\s_.:#-]*([0-9]{1,5})/i)
      || normalized.match(/(?:第\s*([0-9]{1,5})\s*(?:章|话|回)|([0-9]{1,5})\s*(?:화|장|章|话|回))/i)
      || normalized.match(/^(?:[#=*_\-\[\]()~`\s]*)([0-9]{1,5})\s*[:\-\—\–.]/);
    if (matchNum && matchNum[1]) {
      const parsed = parseInt(matchNum[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        num = parsed;
      }
    }
  }

  const finalNum = num !== null && num > 0 ? num : 1;
  const prefix = isFa ? `فصل ${finalNum}` : isAr ? `الفصل ${finalNum}` : `Chapter ${finalNum}`;

  // Extract subtitle
  let sub = '';
  const sepMatch = normalized.match(/(?:(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)?[\s_.:#-]*[0-9]{1,5}|[#=*_~`]+)\s*[:\-\—\–.]\s*(.+)$/i);
  if (sepMatch && sepMatch[1]) {
    sub = sepMatch[1].trim();
  } else {
    const afterNumMatch = normalized.match(/(?:chapter|ch\.|ch|chap|فصل|چپتر)[\s_.:#-]*[0-9]{1,5}\s+([^\n\r]+)$/i);
    if (afterNumMatch && afterNumMatch[1]) {
      sub = afterNumMatch[1].trim();
    }
  }

  if (sub) {
    sub = sub
      .replace(/^[#=*\-_\[\]()~`\s:–—]+/, '')
      .replace(/[#=*\-_\[\]()~`\s:–—]+$/, '')
      .replace(/^(?:chapter|ch\.|ch|chap|فصل|چپتر)[\s_.:#-]*[0-9]{1,5}\s*[:\-\—\–.]?\s*/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      sub.length > 50 ||
      /^[0-9\s]+$/.test(sub) ||
      sub === String(finalNum) ||
      /^(?:chapter|ch|فصل|چپتر|part|episode)[\s_.:#-]*[0-9]+$/i.test(sub) ||
      /(?:read novel|freewebnovel|boxnovel|novelfull|all chapters|updated)/i.test(sub) ||
      (sub.length > 30 && /[.!?؟؛…]$/.test(sub))
    ) {
      sub = '';
    }
  }

  if (!sub) {
    return prefix;
  }

  const hasPersianChars = /[\u0600-\u06FF]/.test(sub);
  if (hasPersianChars && isFa) {
    return `${prefix}: ${sub}`;
  }

  let translatedSub = '';
  if (engine === 'ai') {
    try {
      const activeKeys = aiKeys && aiKeys.length > 0 ? aiKeys : (process.env.GEMINI_API_KEY ? [{ key: process.env.GEMINI_API_KEY, provider: 'gemini' }] : []);
      if (activeKeys.length > 0) {
        const langName = isFa ? 'Persian (Farsi)' : isAr ? 'Arabic' : targetLang;
        const prompt = `Translate this chapter subtitle into ${langName}. Return ONLY the short translated subtitle text without chapter numbers, without quotes, maximum 5 words:\n\n${sub}`;
        const res = await executeMultiProviderCompletion({
          keys: activeKeys,
          prompt,
          temperature: 0.2,
          maxOutputTokens: 50,
        });
        if (res.text) {
          translatedSub = res.text.replace(/^["'«]+|["'»]+$/g, '').replace(/^(?:فصل|چپتر|chapter)[\s0-9:.-]+/i, '').trim();
        }
      }
    } catch {}
  }

  if (!translatedSub) {
    try {
      const trans = await serverTranslateTextWithFreeEngine(sub, targetLang);
      if (trans && trans.trim().length > 0) {
        translatedSub = trans.replace(/^["'«]+|["'»]+$/g, '').replace(/^(?:فصل|چپتر|chapter)[\s0-9:.-]+/i, '').trim();
      }
    } catch {}
  }

  if (translatedSub && translatedSub.length > 0 && translatedSub.length <= 50) {
    return `${prefix}: ${translatedSub}`;
  }

  return sub.length <= 30 ? `${prefix}: ${sub}` : prefix;
}

/**
 * Robust chapter translation with intelligent bidirectional failover (Web <-> AI)
 * - If Web engine fails for any reason, automatically switches to AI engine.
 * - If AI engine fails for any reason, automatically switches to Web engine.
 * - If BOTH engines fail, throws a descriptive error explaining the exact failure reasons for both engines.
 */
async function translateChapterWithRetries(
  ch: ServerTranslationChapter,
  engine: 'free' | 'ai',
  targetLang: 'fa' | 'ar' | 'en',
  aiKeys?: AIKeyConfig[]
): Promise<ChapterTranslationResult> {
  if (!ch.content || !ch.content.trim()) {
    return { content: ch.content || '', title: ch.title, engineUsed: engine, failoverOccurred: false };
  }

  let webFailureReason = '';
  let aiFailureReason = '';

  if (engine === 'free') {
    // -------------------------------------------------------------
    // PRIMARY: Free Web Engine
    // -------------------------------------------------------------
    let webSuccess = false;
    let webContent = '';
    let webTitle = ch.title;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const [cleanTitle, transContent] = await Promise.all([
          formatAndTranslateChapterTitle(ch.title, ch.chapterNumber, targetLang, 'free', aiKeys).catch(() => ch.title),
          serverTranslateTextWithFreeEngine(ch.content, targetLang),
        ]);
        if (transContent && isTextActuallyTranslated(ch.content, transContent, targetLang)) {
          webContent = transContent;
          webTitle = cleanTitle || ch.title;
          webSuccess = true;
          break;
        } else {
          webFailureReason = 'متن خروجی موتور وب ترجمه نشده بود یا با متن مبدأ یکسان بود.';
        }
      } catch (err: any) {
        webFailureReason = err?.message || 'خطای شبکه یا محدودیت نرخ سرویس وب (Rate limit / Timeout)';
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }

    if (webSuccess) {
      return {
        content: webContent,
        title: webTitle,
        engineUsed: 'free',
        failoverOccurred: false,
      };
    }

    // -------------------------------------------------------------
    // AUTOMATIC FAILOVER: Free Web failed -> Switch to AI Engine
    // -------------------------------------------------------------
    console.info(
      `[ServerTranslation] Chapter ${ch.chapterNumber || ch.id}: Free Web engine failed (${webFailureReason}). Automatically switching to AI engine...`
    );

    try {
      const [cleanTitle, aiRes] = await Promise.all([
        formatAndTranslateChapterTitle(ch.title, ch.chapterNumber, targetLang, 'ai', aiKeys).catch(() => ch.title),
        serverTranslateNovelWithAI(ch.content, '', targetLang, aiKeys),
      ]);
      if (aiRes.content && isTextActuallyTranslated(ch.content, aiRes.content, targetLang)) {
        console.info(`[ServerTranslation] Chapter ${ch.chapterNumber || ch.id}: Successfully translated via AI failover!`);
        return {
          content: aiRes.content,
          title: cleanTitle || aiRes.title || ch.title,
          engineUsed: 'ai',
          failoverOccurred: true,
          failoverReason: `موتور وب با اختلال مواجه شد (${webFailureReason})؛ ترجمه به طور خودکار با هوش مصنوعی انجام شد.`,
        };
      } else {
        aiFailureReason = 'پاسخ مدل هوش مصنوعی نامعتبر بود یا ترجمه نشد.';
      }
    } catch (aiErr: any) {
      aiFailureReason = aiErr?.message || 'عدم دسترسی به مدل هوش مصنوعی یا اتمام سهمیه کلید (Quota Exceeded)';
    }

    // Both methods failed!
    const dualError: any = new Error(
      `ترجمه فصل ${ch.chapterNumber || ch.id} در هر دو روش با شکست مواجه شد:\n` +
      `• علت شکست روش وب: ${webFailureReason || 'خطای ناشناخته در اتصال به سرورهای وب'}\n` +
      `• علت شکست روش هوش مصنوعی: ${aiFailureReason || 'عدم وجود یا اتمام سهمیه کلید هوش مصنوعی'}`
    );
    dualError.details = {
      primaryEngine: 'free',
      webError: webFailureReason,
      aiError: aiFailureReason,
      summary: `شکست هر دو روش (وب: ${webFailureReason} | هوش مصنوعی: ${aiFailureReason})`,
    };
    throw dualError;
  } else {
    // -------------------------------------------------------------
    // PRIMARY: AI Engine
    // -------------------------------------------------------------
    let aiSuccess = false;
    let aiContent = '';
    let aiTitle = ch.title;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const [cleanTitle, aiRes] = await Promise.all([
          formatAndTranslateChapterTitle(ch.title, ch.chapterNumber, targetLang, 'ai', aiKeys).catch(() => ch.title),
          serverTranslateNovelWithAI(ch.content, '', targetLang, aiKeys),
        ]);
        if (aiRes.content && isTextActuallyTranslated(ch.content, aiRes.content, targetLang)) {
          aiContent = aiRes.content;
          aiTitle = cleanTitle || aiRes.title || ch.title;
          aiSuccess = true;
          break;
        } else {
          aiFailureReason = 'متن خروجی هوش مصنوعی نامعتبر بود یا ترجمه نشد.';
        }
      } catch (err: any) {
        aiFailureReason = err?.message || 'خطا در ارتباط با هوش مصنوعی یا اتمام سهمیه کلید (Quota Exceeded / 429)';
        if (attempt < 3) await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }

    if (aiSuccess) {
      return {
        content: aiContent,
        title: aiTitle,
        engineUsed: 'ai',
        failoverOccurred: false,
      };
    }

    // -------------------------------------------------------------
    // AUTOMATIC FAILOVER: AI failed -> Switch to Free Web Engine
    // -------------------------------------------------------------
    console.info(
      `[ServerTranslation] Chapter ${ch.chapterNumber || ch.id}: AI engine failed (${aiFailureReason}). Automatically switching to Free Web engine...`
    );

    try {
      const [cleanTitle, transContent] = await Promise.all([
        formatAndTranslateChapterTitle(ch.title, ch.chapterNumber, targetLang, 'free', aiKeys).catch(() => ch.title),
        serverTranslateTextWithFreeEngine(ch.content, targetLang),
      ]);
      if (transContent && isTextActuallyTranslated(ch.content, transContent, targetLang)) {
        console.info(`[ServerTranslation] Chapter ${ch.chapterNumber || ch.id}: Successfully translated via Web failover!`);
        return {
          content: transContent,
          title: cleanTitle || ch.title,
          engineUsed: 'free',
          failoverOccurred: true,
          failoverReason: `موتور هوش مصنوعی با اختلال مواجه شد (${aiFailureReason})؛ ترجمه به طور خودکار با موتور پرسرعت وب انجام شد.`,
        };
      } else {
        webFailureReason = 'پاسخ موتور وب دریافت نشد یا متن ترجمه نشده باقی ماند.';
      }
    } catch (webErr: any) {
      webFailureReason = webErr?.message || 'اختلال در اتصال به سرورهای ترجمه وب یا محدودیت نرخ';
    }

    // Both methods failed!
    const dualError: any = new Error(
      `ترجمه فصل ${ch.chapterNumber || ch.id} در هر دو روش با شکست مواجه شد:\n` +
      `• علت شکست روش هوش مصنوعی: ${aiFailureReason || 'عدم وجود یا اتمام سهمیه کلید هوش مصنوعی'}\n` +
      `• علت شکست روش وب: ${webFailureReason || 'خطای ناشناخته در اتصال به سرورهای وب'}`
    );
    dualError.details = {
      primaryEngine: 'ai',
      aiError: aiFailureReason,
      webError: webFailureReason,
      summary: `شکست هر دو روش (هوش مصنوعی: ${aiFailureReason} | وب: ${webFailureReason})`,
    };
    throw dualError;
  }
}

/**
 * Check if a synopsis string is a temporary placeholder
 */
export function isPlaceholderSynopsis(synopsis?: string): boolean {
  if (!synopsis || typeof synopsis !== 'string') return true;
  const trimmed = synopsis.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();

  return (
    trimmed.includes('در حال ترجمه') ||
    trimmed.includes('در دست ترجمه') ||
    trimmed.includes('قید ترجمه') ||
    lower.includes('in translation') ||
    lower.includes('being translated') ||
    lower.includes('novel is being translated') ||
    trimmed === 'خلاصه داستان ثبت نشده است.' ||
    trimmed === 'No synopsis provided.'
  );
}

/**
 * Extract clean introductory excerpt from novel chapters
 */
export function extractCleanExcerptFromChapters(
  chapters?: { content?: string; title?: string }[],
  maxLength: number = 200
): string {
  if (!Array.isArray(chapters) || chapters.length === 0) return '';
  for (const ch of chapters) {
    if (!ch || !ch.content || typeof ch.content !== 'string') continue;
    let text = ch.content.replace(/<[^>]+>/g, ' ');
    text = text.replace(/[#*`_~=\-]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    if (ch.title) {
      const cleanTitle = ch.title.replace(/\s+/g, ' ').trim();
      if (cleanTitle && text.startsWith(cleanTitle)) {
        text = text.slice(cleanTitle.length).trim();
      }
    }
    if (text.length >= 20) {
      if (text.length <= maxLength) {
        return text;
      }
      const slice = text.slice(0, maxLength);
      const lastPunc = Math.max(
        slice.lastIndexOf('.'),
        slice.lastIndexOf('!'),
        slice.lastIndexOf('؟'),
        slice.lastIndexOf('?')
      );
      if (lastPunc > 60) {
        return slice.slice(0, lastPunc + 1).trim();
      }
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > 50) {
        return slice.slice(0, lastSpace).trim() + '...';
      }
      return slice.trim() + '...';
    }
  }
  return '';
}

/**
 * Resolve a proper, informative synopsis for a novel, never leaving a placeholder "در حال ترجمه"
 */
export function resolveNovelSynopsis(
  novel: {
    title?: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    chapters?: { content?: string; title?: string }[];
  },
  language: string = 'fa'
): string {
  if (!novel) return '';
  if (novel.synopsis && !isPlaceholderSynopsis(novel.synopsis)) {
    return novel.synopsis.trim();
  }

  const isFa = language === 'fa' || !language;
  const isAr = language === 'ar';
  const cleanTitle = (novel.title || '').trim() || (isFa ? 'رمان' : isAr ? 'رواية' : 'Novel');
  const cleanAuthor = (novel.author || '').trim() || (isFa ? 'ناشناس' : isAr ? 'مجهول' : 'Unknown');
  const cleanGenre = (novel.genre || '').trim() || (isFa ? 'عمومی' : isAr ? 'عام' : 'General');
  const chaptersCount = Array.isArray(novel.chapters) ? novel.chapters.length : 0;

  const excerpt = extractCleanExcerptFromChapters(novel.chapters, 190);

  if (excerpt) {
    if (isFa) {
      return `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}. بخشی از داستان: «${excerpt}»`;
    }
    if (isAr) {
      return `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}. مقتطف من القصة: «${excerpt}»`;
    }
    return `"${cleanTitle}" — a captivating ${cleanGenre} novel by ${cleanAuthor}. Excerpt: "${excerpt}"`;
  }

  if (isFa) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}، شامل ${chaptersCount} فصل ترجمه‌شده و آماده مطالعه.`
      : `«${cleanTitle}»؛ رمانی خواندنی در ژانر ${cleanGenre} به قلم ${cleanAuthor}.`;
  }
  if (isAr) {
    return chaptersCount > 0
      ? `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}، تضم ${chaptersCount} فصول مترجمة وجاهزة للقراءة.`
      : `«${cleanTitle}»؛ رواية شيقة من تصنيف ${cleanGenre} للكاتب ${cleanAuthor}.`;
  }
  return chaptersCount > 0
    ? `"${cleanTitle}" — a complete ${cleanGenre} novel by ${cleanAuthor}, featuring ${chaptersCount} translated chapters.`
    : `"${cleanTitle}" — an engaging ${cleanGenre} novel by ${cleanAuthor}.`;
}

/**
 * Authoritative sync of translated novel into Persistent Database customNovels collection
 * STRICT USER DIRECTIVE: Under NO circumstances should an untranslated novel be sent to the store!
 */
export function syncServerJobToDatabase(job: ServerTranslationJob, forceDiskSave: boolean = false) {
  try {
    const db = getPersistentDatabase();
    if (!Array.isArray(db.customNovels)) {
      db.customNovels = [];
    }

    const existingIdx = db.customNovels.findIndex((n: any) => n.id === job.novelId);

    const formattedChapters = job.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      chapterNumber: c.chapterNumber,
      price: job.pricePerChapter || 2,
      isTranslated: c.isTranslated ?? false,
    }));

    const translatedCount = formattedChapters.filter((c) => c.isTranslated).length;
    const isFullyTranslated = job.status === 'completed' && translatedCount === job.totalChapters;

    // STRICT GUARANTEE: Never insert untranslated or in-progress novel to store!
    if (existingIdx < 0) {
      if (job.status !== 'completed' || translatedCount === 0) {
        return; // Reject insertion into store until fully translated
      }
    }

    // Resolve proper synopsis when completed or when translated chapters exist
    let resolvedSynopsis = job.synopsis || '';
    if (isPlaceholderSynopsis(resolvedSynopsis)) {
      resolvedSynopsis = resolveNovelSynopsis(
        {
          title: job.novelTitle,
          author: job.author,
          genre: job.genre,
          synopsis: job.synopsis,
          chapters: formattedChapters,
        },
        job.targetLang || 'fa'
      );
      job.synopsis = resolvedSynopsis;
    }

    const novelRecord = {
      id: job.novelId,
      title: job.novelTitle,
      author: job.author || 'ناشناس',
      genre: job.genre || 'عمومی',
      synopsis: resolvedSynopsis,
      coverColor: job.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
      coverGradient: job.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
      price: job.price,
      pricePerChapter: job.pricePerChapter || 2,
      isPriceLocked: job.isPriceLocked ?? true,
      chapters: formattedChapters,
      isDefault: false,
      rating: 5.0,
      uploadedAt: new Date(job.createdAt).toISOString(),
      lastTranslatedAt: new Date().toISOString(),
      translationStatus: isFullyTranslated ? 'completed' : 'in_progress',
      translatedChaptersCount: translatedCount,
      totalChaptersCount: formattedChapters.length,
    };

    if (existingIdx >= 0) {
      if (translatedCount > 0 || job.status === 'completed') {
        db.customNovels[existingIdx] = {
          ...db.customNovels[existingIdx],
          ...novelRecord,
        };
      }
    } else {
      // Completed and translated novel added to store
      db.customNovels.unshift(novelRecord);
    }

    db.lastUpdated = Date.now();
    if (forceDiskSave) {
      savePersistentDatabase({ force: true });
    } else {
      savePersistentDatabase();
    }
  } catch (err) {
    console.warn('[ServerTranslation] Error syncing novel to persistent DB:', err);
  }
}

/**
 * Background worker loop for processing running jobs on the server
 */
async function processServerJob(jobId: string) {
  const job = serverJobsMap.get(jobId);
  if (!job || (job.status !== 'running' && job.status !== 'queued')) return;

  job.status = 'running';
  job.updatedAt = Date.now();
  saveJobsToDisk();

  const abortCtrl = new AbortController();
  jobAbortControllers.set(jobId, abortCtrl);

  const concurrency = 1; // Strictly sequential chapter processing to prevent progress flapping and rate limit bursts
  const chapters = job.chapters;

  try {
    // Multi-pass execution: Pass 1 (all uncompleted), Pass 2-4 (retry any failed chapters with progressive cooldowns)
    for (let pass = 1; pass <= 4; pass++) {
      const curJob = serverJobsMap.get(jobId);
      if (!curJob || curJob.status !== 'running' || abortCtrl.signal.aborted) break;

      const uncompletedIndices: number[] = [];
      for (let i = 0; i < chapters.length; i++) {
        if (!chapters[i].isTranslated) {
          uncompletedIndices.push(i);
        }
      }

      if (uncompletedIndices.length === 0) {
        // All chapters successfully translated!
        break;
      }

      if (pass > 1) {
        console.info(`[ServerTranslation] Job ${jobId} starting retry pass #${pass} for ${uncompletedIndices.length} remaining chapters...`);
        // Cooldown delay between retry passes (2s, 4s, 6s) so external rate limits expire
        await new Promise((r) => setTimeout(r, 2000 * pass));
      }

      for (const targetIdx of uncompletedIndices) {
        const activeJob = serverJobsMap.get(jobId);
        if (!activeJob || activeJob.status !== 'running' || abortCtrl.signal.aborted) {
          break;
        }

        const ch = chapters[targetIdx];
        if (!ch || ch.isTranslated) continue;

        activeJob.currentChapterIndex = targetIdx;
        activeJob.currentChapterTitle = ch.title;
        activeJob.updatedAt = Date.now();

        try {
          const originalContent = ch.content;
          const transRes = await translateChapterWithRetries(ch, activeJob.engine, activeJob.targetLang, activeJob.aiKeys);

          if (transRes.content && isTextActuallyTranslated(originalContent, transRes.content, activeJob.targetLang)) {
            ch.content = transRes.content;
            if (transRes.title) ch.title = transRes.title;
            ch.isTranslated = true;

            if (transRes.failoverOccurred) {
              activeJob.failoverOccurred = true;
              activeJob.failoverReason = transRes.failoverReason;
              activeJob.engineUsed = transRes.engineUsed;
            }

            const currentTranslatedCount = chapters.filter((c) => c.isTranslated).length;
            activeJob.completedChapters = Math.max(activeJob.completedChapters, currentTranslatedCount);
            activeJob.currentProgressPercent = Math.min(
              99,
              Math.max(1, Math.round((activeJob.completedChapters / activeJob.totalChapters) * 100))
            );
            activeJob.updatedAt = Date.now();
            activeJob.error = undefined;
            activeJob.errorDetails = undefined;

            syncServerJobToDatabase(activeJob, false);
            // Save immediately so state is 100% synchronized
            saveJobsToDisk();

            // Pacing cooldown between chapters
            await new Promise((r) => setTimeout(r, 250));
          } else {
            ch.isTranslated = false;
          }
        } catch (err: any) {
          console.warn(`[ServerTranslation] Pass #${pass} error on chapter ${targetIdx + 1}:`, err?.message || err);
          ch.isTranslated = false;
          // Monotonic progress guarantee: NEVER decrement completedChapters
          activeJob.completedChapters = Math.max(activeJob.completedChapters, chapters.filter((c) => c.isTranslated).length);
          activeJob.updatedAt = Date.now();
          if (err?.details) {
            activeJob.errorDetails = err.details;
            activeJob.error = err.message;
          } else if (!activeJob.error) {
            activeJob.error = err?.message || 'خطا در ترجمه فصل';
          }
          saveJobsToDisk();
          // Short pause on failure before next attempt
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    const finalJob = serverJobsMap.get(jobId);
    if (finalJob && finalJob.status === 'running' && !abortCtrl.signal.aborted) {
      const actualTranslatedCount = finalJob.chapters.filter((c) => c.isTranslated).length;

      if (actualTranslatedCount === 0) {
        finalJob.status = 'error';
        finalJob.error = finalJob.error || 'هر دو روش ترجمه (وب و هوش مصنوعی) با شکست مواجه شدند.\n• لطفاً اتصال اینترنت و تنظیمات کلیدهای هوش مصنوعی را بررسی فرمایید.';
        finalJob.updatedAt = Date.now();
        saveJobsToDisk();
        return;
      }

      if (actualTranslatedCount === finalJob.totalChapters) {
        finalJob.completedChapters = actualTranslatedCount;
        finalJob.currentProgressPercent = 100;
        finalJob.status = 'completed';
        if (isPlaceholderSynopsis(finalJob.synopsis)) {
          finalJob.synopsis = resolveNovelSynopsis(
            {
              title: finalJob.novelTitle,
              author: finalJob.author,
              genre: finalJob.genre,
              synopsis: finalJob.synopsis,
              chapters: finalJob.chapters,
            },
            finalJob.targetLang || 'fa'
          );
        }
        finalJob.updatedAt = Date.now();
        syncServerJobToDatabase(finalJob, true);
        saveJobsToDisk();
        console.info(`[ServerTranslation] Job ${jobId} («${finalJob.novelTitle}») successfully COMPLETED on server! (${actualTranslatedCount}/${finalJob.totalChapters} chapters translated)`);
      } else {
        // Partially completed (some chapters translated, some hit errors)
        finalJob.completedChapters = actualTranslatedCount;
        finalJob.currentProgressPercent = Math.round((actualTranslatedCount / finalJob.totalChapters) * 100);
        // Persist translated chapters to store so user can read them
        syncServerJobToDatabase(finalJob, true);

        if (actualTranslatedCount >= Math.ceil(finalJob.totalChapters * 0.6)) {
          finalJob.status = 'completed';
          finalJob.currentProgressPercent = 100;
          if (isPlaceholderSynopsis(finalJob.synopsis)) {
            finalJob.synopsis = resolveNovelSynopsis(
              {
                title: finalJob.novelTitle,
                author: finalJob.author,
                genre: finalJob.genre,
                synopsis: finalJob.synopsis,
                chapters: finalJob.chapters,
              },
              finalJob.targetLang || 'fa'
            );
          }
          console.info(`[ServerTranslation] Job ${jobId} marked completed with ${actualTranslatedCount}/${finalJob.totalChapters} chapters.`);
        } else {
          finalJob.status = 'paused';
          finalJob.error = finalJob.error || `ترجمه تا فصل ${actualTranslatedCount} از ${finalJob.totalChapters} انجام شد. برای ادامه ترجمه فصول باقیمانده دکمه «ادامه» را بزنید.`;
        }
        finalJob.updatedAt = Date.now();
        saveJobsToDisk();
      }
    }
  } catch (err: any) {
    const j = serverJobsMap.get(jobId);
    if (j && !abortCtrl.signal.aborted) {
      j.status = 'error';
      j.error = err?.message || 'خطا در پردازش ترجمه در سرور';
      j.updatedAt = Date.now();
      saveJobsToDisk();
    }
  } finally {
    jobAbortControllers.delete(jobId);
  }
}

/**
 * Public API methods
 */

export interface ServerJobSummary {
  id: string;
  novelId: string;
  novelTitle: string;
  author: string;
  genre: string;
  synopsis: string;
  coverGradient?: string;
  price?: number;
  pricePerChapter?: number;
  isPriceLocked?: boolean;
  targetLang: 'fa' | 'ar' | 'en';
  engine: 'free' | 'ai';
  status: 'queued' | 'running' | 'paused' | 'completed' | 'error' | 'cancelled';
  totalChapters: number;
  completedChapters: number;
  currentChapterIndex?: number;
  currentChapterTitle?: string;
  currentProgressPercent: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export function getAllServerJobsSummary(): ServerJobSummary[] {
  if (serverJobsMap.size === 0) {
    loadJobsFromDisk();
  }
  return Array.from(serverJobsMap.values())
    .map((job) => ({
      id: job.id,
      novelId: job.novelId,
      novelTitle: job.novelTitle,
      author: job.author,
      genre: job.genre,
      synopsis: job.synopsis,
      coverGradient: job.coverGradient,
      price: job.price,
      pricePerChapter: job.pricePerChapter,
      isPriceLocked: job.isPriceLocked,
      targetLang: job.targetLang,
      engine: job.engine,
      status: job.status,
      totalChapters: job.totalChapters,
      completedChapters: job.completedChapters,
      currentChapterIndex: job.currentChapterIndex,
      currentChapterTitle: job.currentChapterTitle,
      currentProgressPercent: job.currentProgressPercent,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createOrEnqueueServerJob(params: {
  novelId?: string;
  novelTitle: string;
  author?: string;
  genre?: string;
  synopsis?: string;
  coverGradient?: string;
  price?: number;
  pricePerChapter?: number;
  isPriceLocked?: boolean;
  targetLang?: 'fa' | 'ar' | 'en';
  engine?: 'free' | 'ai';
  aiKeys?: AIKeyConfig[];
  chapters: Array<{
    id?: string;
    title: string;
    content: string;
    chapterNumber?: number;
    sourceFileName?: string;
    isTranslated?: boolean;
  }>;
}): ServerTranslationJob {
  loadJobsFromDisk();

  const novelId = params.novelId || `novel-srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const jobId = `srv-job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const normalizedChapters: ServerTranslationChapter[] = params.chapters.map((ch, idx) => ({
    id: ch.id || `ch-${novelId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
    title: ch.title || `فصل ${idx + 1}`,
    content: ch.content,
    chapterNumber: ch.chapterNumber || idx + 1,
    sourceFileName: ch.sourceFileName,
    isTranslated: Boolean(ch.isTranslated),
  }));

  const initialCompleted = normalizedChapters.filter((c) => c.isTranslated).length;

  const job: ServerTranslationJob = {
    id: jobId,
    novelId,
    novelTitle: params.novelTitle,
    author: params.author || 'نویسنده',
    genre: params.genre || 'عمومی',
    synopsis: params.synopsis || 'رمان در حال ترجمه در سرور...',
    coverGradient: params.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
    price: params.price ?? 2,
    pricePerChapter: params.pricePerChapter ?? 2,
    isPriceLocked: params.isPriceLocked ?? true,
    targetLang: params.targetLang || 'fa',
    engine: params.engine || 'free',
    aiKeys: params.aiKeys,
    status: 'running',
    totalChapters: normalizedChapters.length,
    completedChapters: initialCompleted,
    currentChapterIndex: 0,
    currentChapterTitle: normalizedChapters[0]?.title || '',
    currentProgressPercent: normalizedChapters.length > 0
      ? Math.round((initialCompleted / normalizedChapters.length) * 100)
      : 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: normalizedChapters,
  };

  serverJobsMap.set(jobId, job);
  saveJobsToDisk();

  // Note: Novel is NOT published to store until translation is completely finished!

  // Trigger non-blocking worker execution on server
  setTimeout(() => {
    processServerJob(jobId).catch((err) =>
      console.error('[ServerTranslation] Uncaught job error:', err)
    );
  }, 100);

  return job;
}

export function getAllServerJobs(): ServerTranslationJob[] {
  if (serverJobsMap.size === 0) {
    loadJobsFromDisk();
  }
  return Array.from(serverJobsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getServerJobById(jobId: string): ServerTranslationJob | undefined {
  if (serverJobsMap.size === 0) {
    loadJobsFromDisk();
  }
  return serverJobsMap.get(jobId);
}

export function pauseServerJob(jobId: string): boolean {
  loadJobsFromDisk();
  const job = serverJobsMap.get(jobId);
  if (!job) return false;

  job.status = 'paused';
  job.updatedAt = Date.now();
  const ctrl = jobAbortControllers.get(jobId);
  if (ctrl) {
    ctrl.abort();
    jobAbortControllers.delete(jobId);
  }
  saveJobsToDisk();
  return true;
}

export function resumeServerJob(jobId: string): boolean {
  loadJobsFromDisk();
  const job = serverJobsMap.get(jobId);
  if (!job) return false;

  job.status = 'running';
  job.error = undefined;
  job.updatedAt = Date.now();
  saveJobsToDisk();

  setTimeout(() => {
    processServerJob(jobId).catch((err) =>
      console.error('[ServerTranslation] Uncaught resume error:', err)
    );
  }, 100);

  return true;
}

export function cancelServerJob(jobId: string): boolean {
  loadJobsFromDisk();
  const job = serverJobsMap.get(jobId);
  if (!job) return false;

  job.status = 'cancelled';
  job.updatedAt = Date.now();
  const ctrl = jobAbortControllers.get(jobId);
  if (ctrl) {
    ctrl.abort();
    jobAbortControllers.delete(jobId);
  }
  saveJobsToDisk();
  return true;
}

export function deleteServerJob(jobId: string): boolean {
  loadJobsFromDisk();
  cancelServerJob(jobId);
  const deleted = serverJobsMap.delete(jobId);
  saveJobsToDisk();
  return deleted;
}

// Auto-initialize jobs on module load & resume any uncompleted jobs
loadJobsFromDisk();
const existingJobs = Array.from(serverJobsMap.values());
existingJobs.forEach((j) => {
  if (j.status === 'running') {
    // Resume jobs that were running before server restarted
    setTimeout(() => {
      processServerJob(j.id).catch(() => {});
    }, 1500);
  }
});
