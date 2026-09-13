import JSZip from 'jszip';
import { WebNovelChapter, Language } from '../types';
import { getStoredSectionAIKeys } from './aiKeyManager';

// Convert Persian/Arabic digits to standard ASCII digits
export const normalizeDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.split(persianDigits[i]).join(String(i));
    res = res.split(arabicDigits[i]).join(String(i));
  }
  return res;
};

// Persian and English ordinal words to numbers
const WORD_NUMBERS: Record<string, number> = {
  'اول': 1, 'نخست': 1, 'دوم': 2, 'سوم': 3, 'چهارم': 4, 'پنجم': 5,
  'ششم': 6, 'هفتم': 7, 'هشتم': 8, 'نهم': 9, 'دهم': 10,
  'یازدهم': 11, 'دوازدهم': 12, 'سیزدهم': 13, 'چهاردهم': 14, 'پانزدهم': 15,
  'شانزدهم': 16, 'هفدهم': 17, 'هجدهم': 18, 'نوزدهم': 19, 'بیستم': 20,
  'بیست و یکم': 21, 'بیست و دوم': 22, 'بیست و سوم': 23, 'بیست و چهارم': 24, 'بیست و پنجم': 25,
  'بیست و ششم': 26, 'بیست و هفتم': 27, 'بیست و هشتم': 28, 'بیست و نهم': 29, 'سی ام': 30, 'سی‌ام': 30,
  'چهلم': 40, 'پنجاهم': 50, 'شصتم': 60, 'هفتادم': 70, 'هشتادم': 80, 'نودم': 90, 'صدم': 100,
  'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6, 'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10,
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
  'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
  'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15
};

export interface ParsedFileInfo {
  file: File;
  fileName: string;
  detectedChapterNumber: number | null;
  detectedTitle: string;
  fileSizeFormatted: string;
}

/**
 * Strip website watermarks, novel prefixes, file extensions, and technical clutter.
 * Returns clean chapterNumber, cleanTitle (e.g. "فصل ۱: عنوان" or "فصل ۱"), and isolated subtitle.
 */
export const cleanChapterMetadata = (
  rawTitle: string,
  fallbackNum?: number | null,
  language: Language = 'fa'
): { chapterNumber: number; title: string; subtitle: string } => {
  const isFa = language === 'fa';
  const isAr = language === 'ar';
  let num: number | null = typeof fallbackNum === 'number' && fallbackNum > 0 ? fallbackNum : null;

  let str = (rawTitle || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Strip file extensions & technical/uploader clutter
  str = str
    .replace(/\.(html?|xhtml|txt|epub|pdf|md)$/i, '')
    .replace(/[_.\-]*(?:raw|v\d+|1080p|720p|scan|asura|reaper|flame|boxnovel|wuxia|webnovel).*$/i, '')
    .replace(/\s*[|\-—–]\s*(?:Webnovel|ReadNovelFull|NovelFull|Novels|WuxiaWorld|LightNovel|LightNovelPub|ناول|رمان|Novel Updates|BoxNovel|RoyalRoad|ScribbleHub|MoonQuill|Free Web Novel|Read free novel online|Read light novel online).*$/i, '')
    .trim();

  // Normalize Persian/Arabic digits for pattern matching
  const normalized = normalizeDigits(str);

  // 2. Extract chapter number if present in text/filename
  const numMatch = normalized.match(/(?:chapter|ch\.|ch|chap|فصل|چپتر|قسمت|الفصل|باب)[\s_.:#-]*([0-9]{1,5})/i)
    || normalized.match(/(?:第\s*([0-9]{1,5})\s*(?:章|话|回)|([0-9]{1,5})\s*(?:화|장|章|话|回))/i)
    || normalized.match(/^(?:[#=*_\-\[\]()~`\s]*)([0-9]{1,5})\s*[:\-\—\–.]/);

  if (numMatch && numMatch[1]) {
    const parsed = parseInt(numMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
      num = parsed;
    }
  }

  // If still no num, check word numbers (e.g. "Chapter One", "فصل اول")
  if (num === null) {
    for (const [word, val] of Object.entries(WORD_NUMBERS)) {
      const wRegex = new RegExp(`(?:^|[\\s_.:#\\-\\[\\]()~])(?:فصل|چپتر|قسمت|الفصل|chapter|ch)[\\s_.-]+${word}(?:[^a-zA-Z0-9]|$)`, 'i');
      if (wRegex.test(normalized)) {
        num = val;
        break;
      }
    }
  }

  const finalNum = num !== null && num > 0 ? num : (fallbackNum && fallbackNum > 0 ? fallbackNum : 1);
  const prefix = isFa ? `فصل ${finalNum}` : isAr ? `الفصل ${finalNum}` : `Chapter ${finalNum}`;

  // 3. Extract clean subtitle if present
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

  // Clean the extracted subtitle
  if (sub) {
    sub = sub
      .replace(/^[#=*\-_\[\]()~`\s:–—]+/, '')
      .replace(/[#=*\-_\[\]()~`\s:–—]+$/, '')
      .replace(/^(?:chapter|ch\.|ch|chap|فصل|چپتر)[\s_.:#-]*[0-9]{1,5}\s*[:\-\—\–.]?\s*/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (
      sub.length > 65 ||
      /^[0-9\s]+$/.test(sub) ||
      sub === String(finalNum) ||
      /^(?:chapter|ch|فصل|چپتر|part|episode)[\s_.:#-]*[0-9]+$/i.test(sub) ||
      /(?:read novel|freewebnovel|boxnovel|novelfull|all chapters|updated)/i.test(sub) ||
      (sub.length > 40 && /[.!?؟؛…]$/.test(sub))
    ) {
      sub = '';
    }
  }

  const finalTitle = sub ? `${prefix}: ${sub}` : prefix;

  return {
    chapterNumber: finalNum,
    title: finalTitle,
    subtitle: sub,
  };
};

/**
 * Extract chapter number, title, and body from raw plain text content (TXT, MD)
 * Checks the beginning of the file content for chapter heading patterns.
 */
export const extractChapterFromTextContent = (
  rawText: string,
  language: Language = 'fa',
  fallbackIndex: number = 1
): {
  title: string;
  content: string;
  chapterNumber: number | null;
} => {
  const isFa = language === 'fa';
  const clean = rawText.trim();
  if (!clean) {
    const defaultPrefix = isFa ? `فصل ${fallbackIndex}` : `Chapter ${fallbackIndex}`;
    return {
      title: defaultPrefix,
      content: '',
      chapterNumber: fallbackIndex,
    };
  }

  const lines = clean.split('\n');
  let detectedChapterNum: number | null = null;
  let detectedTitle = '';
  let headerLineIndex = -1;

  // Inspect the first 8 non-empty lines for chapter headers
  let checkedCount = 0;
  for (let i = 0; i < lines.length && checkedCount < 8; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;
    checkedCount++;

    const normalizedLine = normalizeDigits(rawLine);

    // 1. Asian notation: 第50章 标题 / 50화
    const matchAsian = normalizedLine.match(/(?:第\s*([0-9]{1,5})\s*(?:章|话|回)|([0-9]{1,5})\s*(?:화|장|章|话|回))\s*(.*)/);
    if (matchAsian) {
      const parsedNum = parseInt(matchAsian[1] || matchAsian[2], 10);
      const meta = cleanChapterMetadata(rawLine, parsedNum, language);
      detectedChapterNum = meta.chapterNumber;
      detectedTitle = meta.title;
      headerLineIndex = i;
      break;
    }

    // 2. Keyword with digits: فصل 10: عنوان / Chapter 10 - Title / Ch. 10 / Vol 1 Ch 10 / ## Chapter 10
    const keywordRegex = /^(?:[#=*_\-\[\]()~`\s]*)(?:فصل|چپتر|قسمت|بخش|الفصل|باب|chapter|ch\.|ch|part|episode|ep|vol|c)[\s_.-]*([0-9]{1,5})(?:\s*[:\-\—\–.]\s*(.*)|\s*(.*))$/i;
    const matchKeyword = normalizedLine.match(keywordRegex);
    if (matchKeyword) {
      const parsedNum = parseInt(matchKeyword[1], 10);
      const meta = cleanChapterMetadata(rawLine, parsedNum, language);
      detectedChapterNum = meta.chapterNumber;
      detectedTitle = meta.title;
      headerLineIndex = i;
      break;
    }

    // 3. Word numbers: فصل اول: ... / Chapter One: ...
    let foundWord = false;
    for (const [word, num] of Object.entries(WORD_NUMBERS)) {
      const wordRegex = new RegExp(`^(?:[#=*_\\-\\[\\]()~\`\\s]*)(?:فصل|چپتر|قسمت|الفصل|chapter|ch)[\\s_.-]+${word}(?:\\s*[:\\-\\—\\–.]\\s*(.*)|\\s*(.*))$`, 'i');
      const matchWord = normalizedLine.match(wordRegex);
      if (matchWord) {
        const meta = cleanChapterMetadata(rawLine, num, language);
        detectedChapterNum = meta.chapterNumber;
        detectedTitle = meta.title;
        headerLineIndex = i;
        foundWord = true;
        break;
      }
    }
    if (foundWord) break;

    // 4. Leading number format: "12: The Battle" / "12 - The Attack" / "12. Awakening"
    const leadingNumberRegex = /^(?:[#=*_\-\[\]()~`\s]*)([0-9]{1,5})\s*[:\-\—\–.]\s*([^0-9\s].*)$/;
    const matchLeading = normalizedLine.match(leadingNumberRegex);
    if (matchLeading) {
      const candidateSub = matchLeading[2].trim();
      // Ensure candidate is actually a title and not a long narrative sentence (>60 chars or ends in sentence mark)
      if (candidateSub.length > 1 && candidateSub.length <= 60 && !/[.!?؟؛…]$/.test(candidateSub)) {
        const parsedNum = parseInt(matchLeading[1], 10);
        const meta = cleanChapterMetadata(rawLine, parsedNum, language);
        detectedChapterNum = meta.chapterNumber;
        detectedTitle = meta.title;
        headerLineIndex = i;
        break;
      }
    }

    // 5. Short Markdown header: "### Chapter 1: The Encounter"
    const mdHeaderMatch = rawLine.match(/^#{1,4}\s+([^#\n]+)$/);
    if (mdHeaderMatch && mdHeaderMatch[1].trim().length > 1 && mdHeaderMatch[1].trim().length < 75) {
      const meta = cleanChapterMetadata(mdHeaderMatch[1].trim(), fallbackIndex, language);
      if (meta.subtitle || meta.chapterNumber !== fallbackIndex) {
        detectedChapterNum = meta.chapterNumber;
        detectedTitle = meta.title;
        headerLineIndex = i;
        break;
      }
    }
  }

  // If a header line was found at index 0 or 1, strip it from content body so it is not duplicated
  let finalBody = clean;
  if (headerLineIndex >= 0 && headerLineIndex <= 2) {
    const remainingLines = lines.slice(headerLineIndex + 1);
    finalBody = remainingLines.join('\n').trim();
  }

  const finalNum = detectedChapterNum !== null && detectedChapterNum > 0 ? detectedChapterNum : fallbackIndex;
  const defaultPrefix = isFa ? `فصل ${finalNum}` : `Chapter ${finalNum}`;
  const finalTitle = detectedTitle || defaultPrefix;

  return {
    title: finalTitle,
    content: finalBody || clean,
    chapterNumber: detectedChapterNum !== null && detectedChapterNum > 0 ? detectedChapterNum : null,
  };
};

/**
 * Clean and extract raw text, chapter title, and chapter number from HTML content.
 * Extracts title and chapter number strictly from inside the HTML document!
 */
export const cleanHtmlToNovelText = (
  rawHtml: string,
  fileName?: string,
  language: Language = 'fa'
): { 
  title: string; 
  content: string; 
  chapterNumber: number | null;
  stats?: { wordCount: number; paragraphCount: number; charCount: number; isComplete: boolean };
} => {
  const isFa = language === 'fa';
  let detectedTitle = '';
  let chapterNumber: number | null = null;
  let cleanText = '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

      // 1. First extract metadata & chapter hints BEFORE stripping elements
      const metaChapter = doc.querySelector('meta[name="chapter"], meta[property="chapter"], meta[name="chapter-number"], meta[property="chapter:number"], meta[name="novel:chapter"]')?.getAttribute('content');
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const docTitle = doc.querySelector('title')?.textContent?.trim() || '';

      // Check explicit chapter number in meta tag
      if (metaChapter && !isNaN(parseInt(metaChapter, 10))) {
        chapterNumber = parseInt(metaChapter, 10);
      }

      // Check title tag / og:title for chapter number and title
      const titleCandidate = docTitle || ogTitle || '';
      if (titleCandidate) {
        const meta = cleanChapterMetadata(titleCandidate, chapterNumber, language);
        if (meta.subtitle || meta.chapterNumber !== 1) {
          chapterNumber = meta.chapterNumber;
          detectedTitle = meta.title;
        }
      }

      // 2. Try to extract chapter title from inside HTML elements:
      // Prioritize elements that explicitly match chapter headings
      const allHeadings = Array.from(
        doc.querySelectorAll(
          '.chapter-title, #chapter-title, .chr-title, .chap-title, .cha-tit, .entry-title, .novel-chapter-title, .reader-chapter, h1.chapter, h2.chapter, h1.chapter-title, h2.chapter-title, h3.chapter-title, h1, h2, h3, h4, .title, p strong, p b'
        )
      );

      for (const el of allHeadings) {
        const text = el.textContent?.trim() || '';
        if (text.length < 2 || text.length > 180) continue;
        const meta = cleanChapterMetadata(text, chapterNumber, language);
        // If it extracted a meaningful subtitle or explicit chapter notation
        if (meta.subtitle || text.toLowerCase().includes('chapter') || text.includes('فصل') || text.includes('چپتر')) {
          chapterNumber = meta.chapterNumber;
          detectedTitle = meta.title;
          break;
        }
      }

      // 3. Remove non-content elements safely
      const toRemove = doc.querySelectorAll(
        'script, style, noscript, svg, canvas, iframe, nav, header, footer, aside, form, input, button, select, textarea, .ads, .ad, .advertisement, #sidebar, .sidebar, .comments, #comments, .share, .social, .breadcrumb, .breadcrumbs, .pagination, .nav-buttons, .prev-next'
      );
      toRemove.forEach((el) => el.remove());

      // 4. Extract main content container if available
      const contentContainer = doc.querySelector(
        'article, .chapter-content, .entry-content, .novel-content, .reading-content, #chapter-content, #content, .post-content, main, .text-content, .read-content, #read-content'
      );

      const targetRoot = contentContainer || doc.body;

      if (targetRoot) {
        // Collect paragraphs or line-break separated text
        const paragraphs = targetRoot.querySelectorAll('p, div.paragraph, .text-paragraph, li, blockquote');
        if (paragraphs.length >= 2) {
          const lines: string[] = [];
          paragraphs.forEach((p) => {
            const text = p.textContent?.trim();
            if (text && text.length > 0) {
              lines.push(text);
            }
          });
          cleanText = lines.join('\n\n');
        } else {
          // Inner text with breaks
          const clone = targetRoot.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
          clone.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach((el) => {
            el.insertAdjacentText('afterend', '\n\n');
          });
          cleanText = clone.textContent || '';
        }
      }

      // If no title was found from tags, check the first 3 lines of extracted text
      if (!detectedTitle && cleanText) {
        const textExtract = extractChapterFromTextContent(cleanText, language, 1);
        if (textExtract.chapterNumber !== null) {
          chapterNumber = textExtract.chapterNumber;
          detectedTitle = textExtract.title;
          cleanText = textExtract.content;
        } else if (textExtract.title) {
          detectedTitle = textExtract.title;
        }
      }
    } catch {
      // Fallback to regex below
    }
  }

  // Fallback regex cleaning if DOMParser failed or empty
  if (!cleanText || cleanText.trim().length < 20) {
    if (!detectedTitle) {
      const h1Match = rawHtml.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
      const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);
      const ogMatch = rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
      const extracted = (h1Match ? h1Match[1] : ogMatch ? ogMatch[1] : titleMatch ? titleMatch[1] : '')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (extracted) {
        const meta = cleanChapterMetadata(extracted, chapterNumber, language);
        chapterNumber = meta.chapterNumber;
        detectedTitle = meta.title;
      }
    }

    cleanText = rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(?:p|div|h[1-6]|li|br|tr|blockquote|article|section)[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }

  // Fallback check from fileName if chapterNumber is still null
  if (chapterNumber === null && fileName) {
    const fileMeta = cleanChapterMetadata(fileName, null, language);
    if (fileMeta.chapterNumber) {
      chapterNumber = fileMeta.chapterNumber;
    }
  }

  // Detect chapter number from text start if still null
  if (chapterNumber === null && cleanText) {
    const textSample = (detectedTitle + '\n' + cleanText.slice(0, 800));
    const parsedHeader = extractChapterFromTextContent(textSample, language, 1);
    if (parsedHeader.chapterNumber !== null && parsedHeader.chapterNumber > 0) {
      chapterNumber = parsedHeader.chapterNumber;
      if (!detectedTitle) detectedTitle = parsedHeader.title;
    }
  }

  const finalCleanMeta = cleanChapterMetadata(detectedTitle || (fileName ? fileName.replace(/\.[^/.]+$/, '') : ''), chapterNumber, language);
  chapterNumber = finalCleanMeta.chapterNumber;
  detectedTitle = finalCleanMeta.title;

  const finalContent = cleanText.trim();
  const wordCount = finalContent ? finalContent.split(/\s+/).filter(Boolean).length : 0;
  const paragraphCount = finalContent ? finalContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;

  return {
    title: detectedTitle,
    content: finalContent,
    chapterNumber,
    stats: {
      wordCount,
      paragraphCount,
      charCount: finalContent.length,
      isComplete: true,
    },
  };
};

/**
 * Universal content-first chapter extractor (for HTML, TXT, MD, etc.)
 * Strictly prioritizes reading chapter numbers and titles from INSIDE the file content!
 */
export const extractChapterDetailsFromAnyFile = (
  rawContent: string,
  isHtml: boolean,
  language: Language = 'fa',
  fallbackIndex: number = 1,
  fallbackFileName?: string
): {
  title: string;
  content: string;
  chapterNumber: number;
  detectedChapterNumber: number | null;
} => {
  if (isHtml) {
    const htmlRes = cleanHtmlToNovelText(rawContent, fallbackFileName, language);
    let explicitNum: number | null = htmlRes.chapterNumber !== null && htmlRes.chapterNumber > 0 ? htmlRes.chapterNumber : null;
    if (explicitNum === null && fallbackFileName) {
      const parsedFile = parseChapterFromFileName(fallbackFileName, 0, language);
      if (parsedFile.chapterNumber > 0) {
        explicitNum = parsedFile.chapterNumber;
      }
    }

    const assignedNum = explicitNum ?? fallbackIndex;
    const assignedTitle = cleanChapterMetadata(htmlRes.title, assignedNum, language).title;
    return {
      title: assignedTitle,
      content: htmlRes.content,
      chapterNumber: assignedNum,
      detectedChapterNumber: explicitNum,
    };
  }

  // TXT / MD content: Extract from inside the text
  const txtRes = extractChapterFromTextContent(rawContent, language, fallbackIndex);
  let explicitNum: number | null = txtRes.chapterNumber !== null && txtRes.chapterNumber > 0 ? txtRes.chapterNumber : null;

  if (explicitNum === null && fallbackFileName) {
    const fromName = parseChapterFromFileName(fallbackFileName, 0, language);
    if (fromName.chapterNumber > 0) {
      explicitNum = fromName.chapterNumber;
    }
  }

  const assignedNum = explicitNum ?? fallbackIndex;
  const assignedTitle = cleanChapterMetadata(txtRes.title, assignedNum, language).title;
  return {
    title: assignedTitle,
    content: txtRes.content,
    chapterNumber: assignedNum,
    detectedChapterNumber: explicitNum,
  };
};

/**
 * 100% Free Non-AI Web Translation Engine (Fast, Unlimited, No API Key needed)
 */
export const translateNovelChapterWithFreeEngine = async (
  text: string,
  title: string = '',
  targetLang: string = 'fa'
): Promise<{ title: string; content: string; success: boolean; errorReason?: string }> => {
  let lastErrorReason = '';

  try {
    const res = await fetch('/api/translation/free-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        title,
        targetLang,
        sourceLang: 'auto',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.content) {
        return {
          title: data.title || title,
          content: data.content,
          success: true,
        };
      } else if (data.error) {
        lastErrorReason = data.error;
      }
    } else {
      lastErrorReason = `سرور وب خطای ${res.status} بازگرداند (محدودیت نرخ یا اختلال ارتباطی).`;
    }
  } catch (err: any) {
    lastErrorReason = err?.message || 'خطای شبکه در اتصال به سرور ترجمه وب';
    console.warn('Free Translation API error:', err);
  }

  // Client-side fallback if server endpoint had issue
  try {
    const [fallbackTitle, fallbackContent] = await Promise.all([
      title ? clientSideTranslateChunk(title, targetLang) : Promise.resolve(title),
      clientSideTranslateChunk(text, targetLang),
    ]);
    if (fallbackContent && fallbackContent.trim().length > 0) {
      return {
        title: fallbackTitle || title,
        content: fallbackContent,
        success: true,
      };
    }
  } catch (e: any) {
    lastErrorReason = e?.message || lastErrorReason || 'خطا در ارتباط کلاینت با موتور ترجمه وب';
    console.warn('Client-side free translation fallback error:', e);
  }

  return {
    title,
    content: text,
    success: false,
    errorReason: lastErrorReason || 'سرویس‌های موتور وب پاسخ معتبری بازنگرداندند (محدودیت نرخ یا عدم اتصال).',
  };
};

/**
 * Client-side direct free web translate fallback (High Speed Parallel Chunking)
 */
async function clientSideTranslateChunk(raw: string, targetLang: string): Promise<string> {
  if (!raw || !raw.trim()) return '';
  const rawParagraphs = raw.split(/\n\s*\n/);
  const chunks: string[] = [];

  for (const rawPara of rawParagraphs) {
    const para = rawPara.trim();
    if (!para) continue;
    if (para.length <= 800) {
      chunks.push(para);
      continue;
    }
    const lines = para.split(/\n+/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.length <= 800) {
        chunks.push(line);
        continue;
      }
      const sentences = line.split(/(?<=[.!?؟؛…])\s+/);
      let accumulated = '';
      for (const sent of sentences) {
        const trimmed = sent.trim();
        if (!trimmed) continue;
        if ((accumulated + ' ' + trimmed).length > 800) {
          if (accumulated) chunks.push(accumulated.trim());
          accumulated = trimmed;
        } else {
          accumulated = accumulated ? accumulated + ' ' + trimmed : trimmed;
        }
      }
      if (accumulated) chunks.push(accumulated.trim());
    }
  }
  if (chunks.length === 0 && raw.trim()) chunks.push(raw.trim().substring(0, 800));

  const translateChunk = async (chunk: string): Promise<string> => {
    if (!chunk.trim()) return '';

    // 1. Primary: Google GTX endpoint
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && Array.isArray(json[0])) {
          const joined = json[0].map((item: any) => item[0] || '').join('');
          if (joined && joined.trim()) {
            return joined.trim();
          }
        }
      }
    } catch {}

    // 2. Secondary: clients5 Google Translate
    try {
      const url2 = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(chunk)}`;
      const res2 = await fetch(url2);
      if (res2.ok) {
        const json2 = await res2.json();
        if (Array.isArray(json2) && Array.isArray(json2[0])) {
          const trans = json2[0][0];
          if (typeof trans === 'string' && trans.trim()) {
            return trans.trim();
          }
        } else if (typeof json2 === 'string' && json2.trim()) {
          return json2.trim();
        }
      }
    } catch {}

    // 3. Tertiary: Fallback to MyMemory for short excerpt
    try {
      const sub = chunk.length > 450 ? chunk.substring(0, 450) : chunk;
      const url3 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sub)}&langpair=en|${targetLang}`;
      const res3 = await fetch(url3);
      if (res3.ok) {
        const json3 = await res3.json();
        if (json3.responseData?.translatedText && !json3.responseData.translatedText.includes('MYMEMORY WARNING')) {
          return json3.responseData.translatedText.trim();
        }
      }
    } catch {}

    return chunk;
  };

  const results: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const res = await translateChunk(chunks[i]);
    results.push(res || chunks[i]);
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 60));
    }
  }
  return results.join('\n\n');
}

export interface NovelChapterTranslationResult {
  title: string;
  content: string;
  success: boolean;
  engineUsed?: 'free' | 'ai';
  failoverOccurred?: boolean;
  failoverReason?: string;
  error?: string;
  errorDetails?: {
    primaryEngine: 'free' | 'ai';
    webError?: string;
    aiError?: string;
    summary?: string;
  };
}

/**
 * Universal Novel Chapter Translator with Bidirectional Automatic Failover (Web <-> AI)
 * - If Web engine fails, automatically switches to AI engine.
 * - If AI engine fails, automatically switches to Web engine.
 * - If BOTH fail, returns detailed failure causes for both engines to notify the user.
 */
export const translateNovelChapter = async (
  text: string,
  title: string = '',
  options: {
    engine?: 'free' | 'ai' | 'auto';
    targetLang?: string;
  } = {}
): Promise<NovelChapterTranslationResult> => {
  const { engine = 'auto', targetLang = 'fa' } = options;
  const isTargetFree = engine === 'free';

  let webError = '';
  let aiError = '';

  if (isTargetFree) {
    // -------------------------------------------------------------
    // PRIMARY: Free Web Engine
    // -------------------------------------------------------------
    const freeRes = await translateNovelChapterWithFreeEngine(text, title, targetLang);
    if (freeRes.success && freeRes.content && freeRes.content.trim().length > 0) {
      return {
        title: freeRes.title || title,
        content: freeRes.content,
        success: true,
        engineUsed: 'free',
        failoverOccurred: false,
      };
    }

    webError = freeRes.errorReason || 'موتور وب پاسخ معتبری بازنگرداند یا مسدود شد (Rate Limit / Timeout)';
    console.info(`[translateNovelChapter] Free Web engine failed (${webError}). Automatically switching to AI Engine...`);

    // -------------------------------------------------------------
    // AUTOMATIC FAILOVER: Free Web failed -> Switch to AI Engine
    // -------------------------------------------------------------
    const aiRes = await translateNovelChapterWithAIDirect(text, title, targetLang);
    if (aiRes.success && aiRes.content && aiRes.content.trim().length > 0) {
      console.info('[translateNovelChapter] Successfully translated via AI failover!');
      return {
        title: aiRes.title || title,
        content: aiRes.content,
        success: true,
        engineUsed: 'ai',
        failoverOccurred: true,
        failoverReason: `موتور وب با اختلال مواجه شد (${webError})؛ ترجمه خودکار با هوش مصنوعی انجام شد.`,
      };
    }

    aiError = aiRes.errorReason || 'عدم دسترسی به هوش مصنوعی یا اتمام سهمیه کلید';

    // BOTH ENGINES FAILED!
    const dualSummary = `شکست هر دو روش ترجمه:\n• علت شکست ترجمه وب: ${webError}\n• علت شکست ترجمه هوش مصنوعی: ${aiError}`;
    return {
      title,
      content: text,
      success: false,
      error: dualSummary,
      errorDetails: {
        primaryEngine: 'free',
        webError,
        aiError,
        summary: dualSummary,
      },
    };
  } else {
    // -------------------------------------------------------------
    // PRIMARY: AI Engine
    // -------------------------------------------------------------
    const aiRes = await translateNovelChapterWithAIDirect(text, title, targetLang);
    if (aiRes.success && aiRes.content && aiRes.content.trim().length > 0) {
      return {
        title: aiRes.title || title,
        content: aiRes.content,
        success: true,
        engineUsed: 'ai',
        failoverOccurred: false,
      };
    }

    aiError = aiRes.errorReason || 'عدم دسترسی به مدل هوش مصنوعی یا اتمام سهمیه کلید (Quota Exceeded)';
    console.info(`[translateNovelChapter] AI engine failed (${aiError}). Automatically switching to Free Web Engine...`);

    // -------------------------------------------------------------
    // AUTOMATIC FAILOVER: AI failed -> Switch to Free Web Engine
    // -------------------------------------------------------------
    const freeRes = await translateNovelChapterWithFreeEngine(text, title, targetLang);
    if (freeRes.success && freeRes.content && freeRes.content.trim().length > 0) {
      console.info('[translateNovelChapter] Successfully translated via Free Web failover!');
      return {
        title: freeRes.title || title,
        content: freeRes.content,
        success: true,
        engineUsed: 'free',
        failoverOccurred: true,
        failoverReason: `موتور هوش مصنوعی با اختلال مواجه شد (${aiError})؛ ترجمه خودکار با موتور پرسرعت وب انجام شد.`,
      };
    }

    webError = freeRes.errorReason || 'موتور وب پاسخ معتبری بازنگرداند یا مسدود شد (Rate Limit / Timeout)';

    // BOTH ENGINES FAILED!
    const dualSummary = `شکست هر دو روش ترجمه:\n• علت شکست ترجمه هوش مصنوعی: ${aiError}\n• علت شکست ترجمه وب: ${webError}`;
    return {
      title,
      content: text,
      success: false,
      error: dualSummary,
      errorDetails: {
        primaryEngine: 'ai',
        aiError,
        webError,
        summary: dualSummary,
      },
    };
  }
};

/**
 * Direct AI novel chapter translation helper (tracks accurate error reasons)
 */
export const translateNovelChapterWithAIDirect = async (
  text: string,
  title: string = '',
  targetLang: string = 'fa'
): Promise<{ title: string; content: string; success: boolean; errorReason?: string }> => {
  let errorReason = '';
  try {
    const userKeys = getStoredSectionAIKeys('translationAI');
    const res = await fetch('/api/gemini/translate-novel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        title,
        targetLang,
        aiKeys: userKeys,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.content) {
        return {
          title: data.title || title,
          content: data.content,
          success: true,
        };
      } else if (data.error) {
        errorReason = data.error;
      }
    } else {
      const errJson = await res.json().catch(() => null);
      errorReason = errJson?.error || `سرور هوش مصنوعی خطای ${res.status} بازگرداند (احتمالاً اتمام سهمیه یا خطای کلید).`;
    }
  } catch (err: any) {
    errorReason = err?.message || 'خطا در ارتباط شبکه با سرور هوش مصنوعی';
    console.warn('AI Novel translation API error:', err);
  }

  return {
    title,
    content: text,
    success: false,
    errorReason: errorReason || 'هوش مصنوعی پاسخ معتبری ارائه نداد یا کلید فعالی ثبت نشده است.',
  };
};

/**
 * Intelligent AI extraction & translation of novel chapter from HTML (legacy wrapper)
 */
export const translateNovelChapterWithAI = async (
  text: string,
  title: string = '',
  targetLang: string = 'fa'
): Promise<{ title: string; content: string; success: boolean; errorReason?: string }> => {
  return translateNovelChapterWithAIDirect(text, title, targetLang);
};

export const extractNovelFromHtmlWithAI = async (
  rawHtml: string,
  options: {
    fileName?: string;
    language?: Language;
    translateTo?: string;
    useTranslation?: boolean;
    translationEngine?: 'free' | 'ai' | 'auto';
  } = {}
): Promise<{ 
  title: string; 
  content: string; 
  chapterNumber: number | null; 
  translated: boolean;
  stats?: { wordCount: number; paragraphCount: number; charCount: number; isComplete: boolean };
}> => {
  const { fileName = '', language = 'fa', translateTo, useTranslation = false, translationEngine = 'free' } = options;
  const isFa = language === 'fa';
  const targetLanguage = translateTo || (isFa ? 'fa' : 'en');

  // 1. Initial client-side cleanup to avoid sending enormous 10MB raw HTML if not needed
  const clientParsed = cleanHtmlToNovelText(rawHtml, fileName, language);

  try {
    const userKeys = getStoredSectionAIKeys('translationAI');
    const res = await fetch('/api/gemini/extract-html-novel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        htmlContent: rawHtml.length > 250000 ? clientParsed.content : rawHtml,
        fileName,
        language,
        translateTo: targetLanguage,
        useTranslation,
        translationEngine,
        aiKeys: userKeys,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.content) {
        let finalContent = data.content;
        let finalTitle = data.title || clientParsed.title;
        let isTranslated = Boolean(data.translated);

        // If translation was requested but server couldn't translate in single pass, trigger dedicated translation
        if (useTranslation && !isTranslated) {
          const trans = await translateNovelChapter(finalContent, finalTitle, { engine: translationEngine, targetLang: targetLanguage });
          if (trans.success && trans.content) {
            finalContent = trans.content;
            finalTitle = trans.title || finalTitle;
            isTranslated = true;
          }
        }

        const wordCount = finalContent ? finalContent.split(/\s+/).filter(Boolean).length : 0;
        const paragraphCount = finalContent ? finalContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length : 0;

        return {
          title: finalTitle,
          content: finalContent,
          chapterNumber: typeof data.chapterNumber === 'number' && data.chapterNumber > 0 ? data.chapterNumber : clientParsed.chapterNumber,
          translated: isTranslated,
          stats: {
            wordCount,
            paragraphCount,
            charCount: finalContent.length,
            isComplete: true,
          },
        };
      }
    }
  } catch (err) {
    console.warn('AI HTML extraction API failed, falling back to client-side DOM parser:', err);
  }

  let fallbackContent = clientParsed.content;
  let fallbackTitle = clientParsed.title;
  let fallbackTranslated = false;

  if (useTranslation) {
    const trans = await translateNovelChapter(fallbackContent, fallbackTitle, { engine: translationEngine, targetLang: targetLanguage });
    if (trans.success && trans.content) {
      fallbackContent = trans.content;
      fallbackTitle = trans.title || fallbackTitle;
      fallbackTranslated = true;
    }
  }

  const fallbackWordCount = fallbackContent ? fallbackContent.split(/\s+/).filter(Boolean).length : 0;
  const fallbackParaCount = fallbackContent ? fallbackContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length : 0;

  // Graceful fallback to client-side parsed data
  return {
    title: fallbackTitle,
    content: fallbackContent,
    chapterNumber: clientParsed.chapterNumber,
    translated: fallbackTranslated,
    stats: {
      wordCount: fallbackWordCount,
      paragraphCount: fallbackParaCount,
      charCount: fallbackContent.length,
      isComplete: true,
    },
  };
};

/**
 * Intelligently parse chapter number and title from a filename or header text
 */
export const parseChapterFromFileName = (
  rawFileName: string,
  fallbackIndex: number,
  language: Language = 'fa'
): { chapterNumber: number; title: string } => {
  const meta = cleanChapterMetadata(rawFileName, fallbackIndex, language);
  return {
    chapterNumber: meta.chapterNumber,
    title: meta.title,
  };
};

/**
 * Naturally sort an array of parsed files so that ch1, ch2, ch10, ch20 are in correct mathematical order
 */
export const sortParsedFiles = (files: ParsedFileInfo[]): ParsedFileInfo[] => {
  return [...files].sort((a, b) => {
    const numA = a.detectedChapterNumber ?? 999999;
    const numB = b.detectedChapterNumber ?? 999999;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
  });
};

/**
 * Split a single long novel text file into multiple chapters based on headings
 */
export const autoSplitSingleFileChapters = (
  textContent: string, 
  defaultPrice: number = 2,
  language: Language = 'fa',
  existingOffset: number = 0
): WebNovelChapter[] => {
  const isFa = language === 'fa';
  // Regex to detect chapter headers in Persian, Arabic, or English
  // Matches: "فصل 1", "فصل اول", "Chapter 1", "## الفصل الأول", "### Chapter 5", "--- فصل ۲ ---", "[فصل ۳]", "بخش ۴"
  const chapterHeaderRegex = /(?:^|\n)(?:[#=*_\-\[\]()~`]+\s*)*(?:فصل|چپتر|قسمت|بخش|الفصل|Chapter|Ch\.|Episode|Part)\s*(?:[۰-۹0-9]+|[a-zA-Z\u0600-\u06FF]+)?(?:\s*[:\-\—\–]\s*[^\n]+|\s*[^\n]*)?(?:\n|$)/gi;

  const matches = [...textContent.matchAll(chapterHeaderRegex)];

  if (matches.length <= 1) {
    const title = isFa ? `فصل ${existingOffset + 1}: متن کامل` : `Chapter ${existingOffset + 1}: Full Content`;
    return [
      {
        id: `ch-1-${Date.now()}`,
        chapterNumber: existingOffset + 1,
        title,
        price: defaultPrice,
        content: textContent.trim(),
      }
    ];
  }

  const result: WebNovelChapter[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index || 0;
    const end = i < matches.length - 1 ? (matches[i + 1].index || textContent.length) : textContent.length;
    const fullBlock = textContent.slice(start, end).trim();
    const lines = fullBlock.split('\n');
    
    // The first line is the chapter header
    const rawHeader = lines[0].replace(/^[#=*\-_\[\]()~`\s]+/, '').replace(/[#=*\-_\[\]()~`\s]+$/, '').trim();
    const bodyContent = lines.slice(1).join('\n').trim();

    const assignedNumber = existingOffset + i + 1;
    const parsed = parseChapterFromFileName(rawHeader || `Chapter ${assignedNumber}`, assignedNumber, language);

    result.push({
      id: `ch-${assignedNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      chapterNumber: assignedNumber,
      title: rawHeader || parsed.title,
      price: defaultPrice,
      content: bodyContent || fullBlock,
    });
  }

  return result;
};

export type SplitMode = 'auto' | 'delimiter' | 'word_count' | 'single';

/**
 * Super-flexible text splitter for pasted novel content
 */
export const splitPastedTextIntoChapters = (
  rawText: string,
  mode: SplitMode = 'auto',
  options: {
    delimiter?: string;
    wordsPerChapter?: number;
    language?: Language;
    existingOffset?: number;
    defaultPrice?: number;
  } = {}
): ExtractedChapterItem[] => {
  const clean = rawText.trim();
  if (!clean) return [];

  const {
    delimiter = '===',
    wordsPerChapter = 1000,
    language = 'fa',
    existingOffset = 0,
    defaultPrice = 2,
  } = options;

  const isFa = language === 'fa';

  if (mode === 'single') {
    const num = existingOffset + 1;
    return [{
      id: `custom-ch-${Date.now()}-0`,
      chapterNumber: num,
      title: isFa ? `فصل ${num}: متن اصلی` : `Chapter ${num}`,
      content: clean,
    }];
  }

  if (mode === 'delimiter') {
    const safeDelim = delimiter.trim() || '===';
    const parts = clean.split(new RegExp(`(?:^|\\n)\\s*${safeDelim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:\\n|$)`, 'g'))
      .map(p => p.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      // Try line-based delimiter split
      const fallbackParts = clean.split(safeDelim).map(p => p.trim()).filter(Boolean);
      if (fallbackParts.length > 1) {
        return fallbackParts.map((part, idx) => {
          const num = existingOffset + idx + 1;
          const firstLine = part.split('\n')[0].trim();
          const title = firstLine.length > 1 && firstLine.length < 60
            ? firstLine
            : (isFa ? `فصل ${num}` : `Chapter ${num}`);
          const content = firstLine === title ? part.split('\n').slice(1).join('\n').trim() : part;
          return {
            id: `custom-ch-${Date.now()}-${idx}`,
            chapterNumber: num,
            title,
            content: content || part,
          };
        });
      }
    } else {
      return parts.map((part, idx) => {
        const num = existingOffset + idx + 1;
        const firstLine = part.split('\n')[0].trim();
        const title = firstLine.length > 1 && firstLine.length < 60
          ? firstLine
          : (isFa ? `فصل ${num}` : `Chapter ${num}`);
        const content = firstLine === title ? part.split('\n').slice(1).join('\n').trim() : part;
        return {
          id: `custom-ch-${Date.now()}-${idx}`,
          chapterNumber: num,
          title,
          content: content || part,
        };
      });
    }
  }

  if (mode === 'word_count') {
    const words = clean.split(/\s+/);
    const targetSize = Math.max(100, wordsPerChapter || 1000);
    const result: ExtractedChapterItem[] = [];

    let currentWords: string[] = [];
    let chIdx = 0;

    for (let i = 0; i < words.length; i++) {
      currentWords.push(words[i]);
      if (currentWords.length >= targetSize || i === words.length - 1) {
        const num = existingOffset + chIdx + 1;
        result.push({
          id: `custom-ch-${Date.now()}-${chIdx}`,
          chapterNumber: num,
          title: isFa ? `فصل ${num}` : `Chapter ${num}`,
          content: currentWords.join(' '),
        });
        currentWords = [];
        chIdx++;
      }
    }
    return result;
  }

  // Default 'auto' mode
  const autoList = autoSplitSingleFileChapters(clean, defaultPrice, language, existingOffset);
  return autoList.map((ch, idx) => ({
    id: ch.id,
    chapterNumber: ch.chapterNumber || existingOffset + idx + 1,
    title: ch.title,
    content: ch.content,
  }));
};

export interface ExtractedChapterItem {
  id?: string;
  title: string;
  content: string;
  chapterNumber: number;
  sourceFileName?: string;
  isHtml?: boolean;
}

export interface ZipExtractionResult {
  chapters: ExtractedChapterItem[];
  detectedNovelTitle: string;
  totalFilesFound: number;
  extractedTextCount: number;
  zipName: string;
  htmlCount: number;
}

/**
 * Robustly decode ArrayBuffer or Uint8Array to string supporting UTF-8 and Persian/Arabic text
 */
export const decodeTextContent = (buffer: ArrayBuffer | Uint8Array): string => {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(buffer);
  } catch {
    // Fallback if TextDecoder not available
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    try {
      return decodeURIComponent(escape(binary));
    } catch {
      return binary;
    }
  }
};

export interface AIMetadataExtractionOptions {
  language?: Language;
  onProgress?: (text: string) => void;
  onKeySwitched?: (info: {
    previousProvider?: string;
    newProvider: string;
    newModel?: string;
    newKeyLabel?: string;
    message: string;
  }) => void;
  onNoKeysWarning?: (warning: string) => void;
}

/**
 * Extract chapter numbers and titles with AI in high-speed parallel batches by calling the server API
 * Supports automated failover across keys configured in Advanced Settings (translationAI).
 */
export const extractChaptersMetadataWithAI = async (
  items: Array<{
    id: string;
    fileName: string;
    rawContent: string;
    isHtml: boolean;
  }>,
  languageOrOptions: Language | AIMetadataExtractionOptions = 'fa',
  legacyOnProgress?: (text: string) => void,
  legacyOnKeySwitched?: (info: any) => void,
  legacyOnNoKeysWarning?: (warning: string) => void
): Promise<Map<string, { chapterNumber: number | null; title: string; source?: string }>> => {
  const options: AIMetadataExtractionOptions = typeof languageOrOptions === 'object' && languageOrOptions !== null
    ? languageOrOptions
    : {
        language: languageOrOptions as Language,
        onProgress: legacyOnProgress,
        onKeySwitched: legacyOnKeySwitched,
        onNoKeysWarning: legacyOnNoKeysWarning,
      };

  const language = options.language || 'fa';
  const isFa = language === 'fa';
  const resultMap = new Map<string, { chapterNumber: number | null; title: string; source?: string }>();
  if (!items || items.length === 0) return resultMap;

  // 1. Prepare ultra-compact, high-density snippets for blazing fast inference
  const preparedItems = items.map((item) => {
    let snippet = '';
    if (item.isHtml) {
      const headChunk = item.rawContent.substring(0, 8000);
      let title = '';
      const titleM = headChunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleM) title = titleM[1].replace(/<[^>]+>/g, '').trim();

      let metaChapter = '';
      const metaM = headChunk.match(/<meta[^>]+(?:name|property)=["'](?:chapter|chapter-number|og:title)["'][^>]+content=["']([\s\S]*?)["']/i);
      if (metaM) metaChapter = metaM[1].trim();

      const headings: string[] = [];
      const hRegex = /<(?:h[1-4]|div|span|p)[^>]+(?:class|id)=["'][^"']*(?:chapter-title|chap-title|chr-title|entry-title|title)[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[1-4]|div|span|p)>/gi;
      let hm: RegExpExecArray | null;
      while ((hm = hRegex.exec(headChunk)) !== null && headings.length < 3) {
        const cleanH = hm[1].replace(/<[^>]+>/g, '').trim();
        if (cleanH.length > 1 && cleanH.length < 150) headings.push(cleanH);
      }
      if (headings.length === 0) {
        const hTagRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
        let htm: RegExpExecArray | null;
        while ((htm = hTagRegex.exec(headChunk)) !== null && headings.length < 3) {
          const cleanH = htm[1].replace(/<[^>]+>/g, '').trim();
          if (cleanH.length > 1 && cleanH.length < 150) headings.push(cleanH);
        }
      }

      const cleanSnippetText = headChunk
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 300);

      snippet = `[File: ${item.fileName}] ${title ? `[Title: ${title}] ` : ''}${metaChapter ? `[Meta: ${metaChapter}] ` : ''}${headings.length > 0 ? `[Headings: ${headings.join(' | ')}] ` : ''}\nSnippet: ${cleanSnippetText}`;
    } else {
      snippet = `[File: ${item.fileName}]\nSnippet: ${item.rawContent.substring(0, 400).replace(/\s+/g, ' ').trim()}`;
    }

    return {
      id: item.id,
      fileName: item.fileName,
      snippet,
    };
  });

  // 2. Query server in optimized batches of 25 with a concurrency pool of 3
  const aiKeys = getStoredSectionAIKeys('translationAI');
  const batchSize = 25;
  const chunks: Array<typeof preparedItems> = [];
  for (let i = 0; i < preparedItems.length; i += batchSize) {
    chunks.push(preparedItems.slice(i, i + batchSize));
  }
  const totalBatches = chunks.length;

  let currentWorkingKeyIndex = 0;
  let hasNotifiedKeySwitch = false;
  let hasNotifiedNoKeys = false;
  let completedBatches = 0;

  const concurrency = Math.min(3, chunks.length);
  let queueIndex = 0;

  const processChunk = async (chunk: typeof preparedItems) => {
    try {
      const response = await fetch('/api/translation/extract-chapters-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: chunk,
          aiKeys,
          language,
          activeKeyIndex: currentWorkingKeyIndex,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          if (data.keySwitched && data.keyUsed) {
            currentWorkingKeyIndex = data.keyUsed.index ?? currentWorkingKeyIndex;
            if (!hasNotifiedKeySwitch) {
              hasNotifiedKeySwitch = true;
              options.onKeySwitched?.({
                previousProvider: data.previousKey?.provider,
                newProvider: data.keyUsed.provider,
                newModel: data.keyUsed.model,
                newKeyLabel: data.keyUsed.label,
                message: data.keySwitchMessage || (isFa
                  ? `🔄 کلید هوش مصنوعی تعویض شد: اکنون از ${data.keyUsed.provider} (${data.keyUsed.model || 'مدل سریع'}) استفاده می‌شود.`
                  : `Switched to AI Key: ${data.keyUsed.provider} (${data.keyUsed.model}).`),
              });
            }
          }

          if (data.noMoreKeys && data.warning && !hasNotifiedNoKeys) {
            hasNotifiedNoKeys = true;
            options.onNoKeysWarning?.(data.warning);
          }

          if (Array.isArray(data.results)) {
            for (const res of data.results) {
              if (res && res.id) {
                resultMap.set(res.id, {
                  chapterNumber: typeof res.chapterNumber === 'number' && res.chapterNumber > 0 ? res.chapterNumber : null,
                  title: res.title || '',
                  source: res.source,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[extractChaptersMetadataWithAI] Chunk processing error:', err);
    } finally {
      completedBatches++;
      options.onProgress?.(
        isFa
          ? `⚡ استخراج فوق‌سریع شماره و عناوین فصول (${completedBatches} از ${totalBatches} بسته)...`
          : `⚡ AI extracting chapter metadata (${completedBatches}/${totalBatches} batches)...`
      );
    }
  };

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queueIndex < chunks.length) {
      const current = chunks[queueIndex++];
      await processChunk(current);
    }
  });

  await Promise.all(workers);
  return resultMap;
};

/**
 * Unpacks a ZIP file, extracts chapter text and HTML files, detects chapter ordering, and sorts them naturally
 */
export const extractChaptersFromZip = async (
  zipFile: File,
  language: Language = 'fa',
  existingChaptersCount: number = 0,
  defaultPrice: number = 2,
  options: {
    useAiHtmlExtraction?: boolean;
    useTranslation?: boolean;
    translationEngine?: 'free' | 'ai' | 'auto';
    translateTo?: string;
    onProgress?: (text: string) => void;
    onKeySwitched?: (info: {
      previousProvider?: string;
      newProvider: string;
      newModel?: string;
      newKeyLabel?: string;
      message: string;
    }) => void;
    onNoKeysWarning?: (warning: string) => void;
  } = {}
): Promise<ZipExtractionResult> => {
  const isFa = language === 'fa';
  const translationEngine = options.translationEngine || 'free';
  const zip = await JSZip.loadAsync(zipFile);

  const cleanZipName = zipFile.name.replace(/\.[^/.]+$/, '').trim();
  
  // Try to derive a clean novel title from the ZIP file's name
  let detectedTitle = cleanZipName
    .replace(/(?:فصل|چپتر|قسمت|chapter|ch|part|vol|volume)[\s_.-]*[0-9]+.*$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!detectedTitle || detectedTitle.length < 2) {
    detectedTitle = cleanZipName.replace(/[_-]/g, ' ').trim();
  }

  const rawEntries: { fileName: string; fullPath: string; isHtml: boolean; bufferPromise: () => Promise<ArrayBuffer> }[] = [];

  zip.forEach((relativePath, entry) => {
    // Skip directories and OS junk files
    if (entry.dir) return;
    if (relativePath.includes('__MACOSX/') || relativePath.startsWith('.') || relativePath.includes('/.')) return;
    if (relativePath.endsWith('.DS_Store') || relativePath.endsWith('Thumbs.db')) return;

    // Filter text/chapter friendly extensions including HTML
    const ext = relativePath.split('.').pop()?.toLowerCase() || '';
    const isHtml = ['html', 'htm', 'xhtml'].includes(ext);
    const isTextExt = ['txt', 'md', 'text', 'json', 'rtf', 'csv', 'html', 'htm', 'xhtml'].includes(ext);

    // If extension is not specified or looks like a text/html file
    if (isTextExt || !ext || ext.length > 5) {
      const baseName = relativePath.split('/').pop() || relativePath;
      rawEntries.push({
        fileName: baseName,
        fullPath: relativePath,
        isHtml,
        bufferPromise: () => entry.async('arraybuffer'),
      });
    }
  });

  if (rawEntries.length === 0) {
    throw new Error(isFa ? 'هیچ فایل متنی یا HTML (TXT, HTML, MD) درون این فایل ZIP یافت نشد.' : 'No text or HTML chapter files found in this ZIP archive.');
  }

  const htmlCount = rawEntries.filter((e) => e.isHtml).length;

  // If there is only ONE single file in the ZIP
  if (rawEntries.length === 1) {
    const singleEntry = rawEntries[0];
    const buffer = await singleEntry.bufferPromise();
    const rawContent = decodeTextContent(buffer);

    let textContent = rawContent;
    let singleDetectedTitle = '';
    let singleExplicitChapterNum: number | null = null;

    if (singleEntry.isHtml) {
      const cleaned = cleanHtmlToNovelText(rawContent, singleEntry.fileName, language);
      textContent = cleaned.content;
      singleDetectedTitle = cleaned.title;
      singleExplicitChapterNum = cleaned.chapterNumber;
    } else {
      const extracted = extractChapterFromTextContent(rawContent, language, 1);
      singleDetectedTitle = extracted.title;
      singleExplicitChapterNum = extracted.chapterNumber;
    }

    const splitChapters = autoSplitSingleFileChapters(textContent, defaultPrice, language, existingChaptersCount);
    
    const chapters: ExtractedChapterItem[] = splitChapters.map((ch, idx) => {
      const assignedChapterNum = (splitChapters.length === 1 && singleExplicitChapterNum !== null && singleExplicitChapterNum > 0)
        ? singleExplicitChapterNum
        : existingChaptersCount + idx + 1;

      return {
        id: ch.id,
        title: singleDetectedTitle || ch.title,
        content: ch.content,
        chapterNumber: assignedChapterNum,
        sourceFileName: singleEntry.fileName,
        isHtml: singleEntry.isHtml,
      };
    });

    return {
      chapters,
      detectedNovelTitle: detectedTitle,
      totalFilesFound: 1,
      extractedTextCount: chapters.length,
      zipName: zipFile.name,
      htmlCount,
    };
  }

  // Multi-file ZIP archive: Read and extract chapter numbers & titles directly from INSIDE file contents
  const loadedEntries: {
    fileName: string;
    fullPath: string;
    isHtml: boolean;
    rawText: string;
    detectedChapterNumber: number | null;
    detectedTitle: string;
    content: string;
  }[] = [];

  for (let i = 0; i < rawEntries.length; i++) {
    const entry = rawEntries[i];
    const buffer = await entry.bufferPromise();
    const rawText = decodeTextContent(buffer).trim();
    if (!rawText) continue;

    const extracted = extractChapterDetailsFromAnyFile(
      rawText,
      entry.isHtml,
      language,
      existingChaptersCount + loadedEntries.length + 1,
      entry.fileName
    );

    loadedEntries.push({
      fileName: entry.fileName,
      fullPath: entry.fullPath,
      isHtml: entry.isHtml,
      rawText,
      detectedChapterNumber: extracted.detectedChapterNumber, // Accurate: null if not explicitly detected
      detectedTitle: extracted.title,
      content: extracted.content,
    });
  }

  // 1. AI Intelligent Chapter Number & Title Extraction from inside file contents (HTML/Text)
  if (options.useAiHtmlExtraction !== false && loadedEntries.length > 0) {
    if (options.onProgress) {
      options.onProgress(
        isFa 
          ? `🤖 در حال تحلیل هوش مصنوعی و استخراج دقیق شماره و عناوین فصول (${loadedEntries.length} فایل)...`
          : `🤖 AI extracting exact chapter numbers and titles (${loadedEntries.length} files)...`
      );
    }

    try {
      const aiMap = await extractChaptersMetadataWithAI(
        loadedEntries.map((e, idx) => ({
          id: `zip-item-${idx}`,
          fileName: e.fileName,
          rawContent: e.rawText,
          isHtml: e.isHtml,
        })),
        {
          language,
          onProgress: options.onProgress,
          onKeySwitched: options.onKeySwitched,
          onNoKeysWarning: options.onNoKeysWarning,
        }
      );

      for (let i = 0; i < loadedEntries.length; i++) {
        const aiRes = aiMap.get(`zip-item-${i}`);
        if (aiRes) {
          if (aiRes.chapterNumber !== null && aiRes.chapterNumber > 0) {
            loadedEntries[i].detectedChapterNumber = aiRes.chapterNumber;
          }
          if (aiRes.title && aiRes.title.trim().length > 1) {
            loadedEntries[i].detectedTitle = aiRes.title.trim();
          }
        }
      }
    } catch (aiErr) {
      console.warn('AI chapter extraction failed, continuing with heuristic parsing:', aiErr);
    }
  }

  // Naturally sort files by mathematical chapter number extracted from file content
  loadedEntries.sort((a, b) => {
    const numA = a.detectedChapterNumber;
    const numB = b.detectedChapterNumber;
    if (numA !== null && numB !== null && numA !== numB) {
      return numA - numB;
    }
    return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Calculate base offset if files start from a high number (e.g. Chapter 45, 50, etc.)
  let baseNumber: number | null = null;
  let baseIndex: number = -1;

  for (let i = 0; i < loadedEntries.length; i++) {
    if (loadedEntries[i].detectedChapterNumber !== null && loadedEntries[i].detectedChapterNumber! > 0) {
      baseNumber = loadedEntries[i].detectedChapterNumber!;
      baseIndex = i;
      break;
    }
  }

  // Extract chapters in sorted order with preserved true numbers
  const finalChapters: ExtractedChapterItem[] = loadedEntries.map((item, idx) => {
    let assignedNum: number;
    if (item.detectedChapterNumber !== null && item.detectedChapterNumber > 0) {
      assignedNum = item.detectedChapterNumber;
    } else if (baseNumber !== null && baseIndex >= 0) {
      assignedNum = Math.max(1, baseNumber + (idx - baseIndex));
    } else {
      assignedNum = existingChaptersCount + idx + 1;
    }

    const cleanTitle = cleanChapterMetadata(item.detectedTitle || '', assignedNum, language).title;

    return {
      id: `custom-ch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      title: cleanTitle,
      content: item.content,
      chapterNumber: assignedNum,
      sourceFileName: item.fileName,
      isHtml: item.isHtml,
    };
  });

  if (finalChapters.length === 0) {
    throw new Error(isFa ? 'فایل‌های متنی یا HTML درون ZIP خالی بودند.' : 'Files in the ZIP archive were empty.');
  }

  return {
    chapters: finalChapters,
    detectedNovelTitle: detectedTitle,
    totalFilesFound: rawEntries.length,
    extractedTextCount: finalChapters.length,
    zipName: zipFile.name,
    htmlCount,
  };
};
