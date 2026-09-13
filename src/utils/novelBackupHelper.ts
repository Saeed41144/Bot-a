import JSZip from 'jszip';
import { WebNovel, Language, UserRewardWallet } from '../types';
import { formatBackupBytes } from './backupHelper';

export interface NovelBackupManifest {
  version: string;
  type: 'novel_backup_zip';
  appName: string;
  exportDate: string;
  timestamp: number;
  totalNovels: number;
  totalChapters: number;
  novelTitles: string[];
  hasReadingProgress: boolean;
  hasUnlockedState: boolean;
}

export interface ParsedNovelZipResult {
  valid: boolean;
  novels: WebNovel[];
  manifest?: NovelBackupManifest;
  readingProgress?: Record<string, any>;
  unlockedNovelIds?: string[];
  unlockedChapterIds?: string[];
  totalChapters: number;
  totalWords: number;
  errors: string[];
}

/**
 * Creates a structured ZIP archive containing all novel data, chapters, manifest, and plain-text readable chapters
 */
export async function createNovelsZipBlob(
  novels: WebNovel[],
  options: {
    includeReadingProgress?: boolean;
    wallet?: UserRewardWallet;
    customTitle?: string;
  } = {}
): Promise<{ blob: Blob; manifest: NovelBackupManifest; sizeStr: string }> {
  const zip = new JSZip();
  const timestamp = Date.now();
  const exportDate = new Date().toISOString();

  let totalChapters = 0;
  novels.forEach((n) => {
    totalChapters += (n.chapters && Array.isArray(n.chapters)) ? n.chapters.length : 0;
  });

  const manifest: NovelBackupManifest = {
    version: '2.0.0',
    type: 'novel_backup_zip',
    appName: 'Lally Scientific Habit Tracker & Novel Library',
    exportDate,
    timestamp,
    totalNovels: novels.length,
    totalChapters,
    novelTitles: novels.map((n) => n.title),
    hasReadingProgress: !!(options.includeReadingProgress && options.wallet?.readingProgress),
    hasUnlockedState: !!(options.wallet?.unlockedNovelIds?.length || options.wallet?.unlockedChapterIds?.length),
  };

  // 1. Manifest JSON
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // 2. Full Novels JSON
  zip.file('novels.json', JSON.stringify(novels, null, 2));

  // 3. User reading progress and unlocked chapters (if enabled)
  if (options.wallet) {
    const progressData = {
      readingProgress: options.wallet.readingProgress || {},
      unlockedNovelIds: options.wallet.unlockedNovelIds || [],
      unlockedChapterIds: options.wallet.unlockedChapterIds || [],
      exportedAt: exportDate,
    };
    zip.file('reading_state.json', JSON.stringify(progressData, null, 2));
  }

  // 4. Human-readable text directory for instant offline viewing/reading
  const readablesFolder = zip.folder('readables');
  if (readablesFolder) {
    novels.forEach((novel, nIndex) => {
      const safeTitle = (novel.title || `novel_${nIndex + 1}`).replace(/[\\/:*?"<>|]/g, '_').trim();
      const novelFolder = readablesFolder.folder(`${nIndex + 1}_${safeTitle}`);
      if (novelFolder) {
        // Novel summary
        const summaryText = `عنوان رمان: ${novel.title}\nنویسنده: ${novel.author || 'نامشخص'}\nژانر: ${novel.genre || 'نامشخص'}\nقیمت: ${novel.price} سکه\nتعداد فصول: ${novel.chapters?.length || 0}\n\nخلاصه:\n${novel.synopsis || ''}\n`;
        novelFolder.file('00_info.txt', summaryText);

        // Chapters
        if (novel.chapters && Array.isArray(novel.chapters)) {
          novel.chapters.forEach((ch, chIdx) => {
            const chTitle = (ch.title || `Chapter_${ch.chapterNumber || chIdx + 1}`).replace(/[\\/:*?"<>|]/g, '_').trim();
            const chContent = `فصل ${ch.chapterNumber || chIdx + 1}: ${ch.title || ''}\n----------------------------------------\n\n${ch.content || ''}`;
            novelFolder.file(`ch_${String(ch.chapterNumber || chIdx + 1).padStart(3, '0')}_${chTitle}.txt`, chContent);
          });
        }
      }
    });
  }

  // Generate Deflate compressed ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  const sizeStr = formatBackupBytes(blob.size);
  return { blob, manifest, sizeStr };
}

/**
 * Triggers direct browser download of the generated Novel ZIP archive
 */
export async function downloadNovelsZip(
  novels: WebNovel[],
  options: {
    includeReadingProgress?: boolean;
    wallet?: UserRewardWallet;
    fileNamePrefix?: string;
  } = {}
) {
  const { blob } = await createNovelsZipBlob(novels, options);
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${options.fileNamePrefix || 'lally-novels-backup'}-${dateStr}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded ZIP file containing novel backups
 */
export async function parseAndValidateNovelsZip(
  fileOrBuffer: File | Blob | ArrayBuffer
): Promise<ParsedNovelZipResult> {
  const errors: string[] = [];
  try {
    const zip = await JSZip.loadAsync(fileOrBuffer);

    // Look for novels.json or search in zip
    let novelsJsonStr: string | null = null;
    let manifestJsonStr: string | null = null;
    let readingStateJsonStr: string | null = null;

    // Check direct filenames
    if (zip.file('novels.json')) {
      novelsJsonStr = await zip.file('novels.json')!.async('string');
    }
    if (zip.file('manifest.json')) {
      manifestJsonStr = await zip.file('manifest.json')!.async('string');
    }
    if (zip.file('reading_state.json')) {
      readingStateJsonStr = await zip.file('reading_state.json')!.async('string');
    }

    // Fallback: search any .json file that might contain novel array
    if (!novelsJsonStr) {
      const fileNames = Object.keys(zip.files);
      for (const fn of fileNames) {
        if (fn.endsWith('.json') && !fn.includes('manifest') && !fn.includes('reading_state')) {
          const content = await zip.files[fn].async('string');
          if (content.includes('"chapters"') || content.includes('"synopsis"')) {
            novelsJsonStr = content;
            break;
          }
        }
      }
    }

    if (!novelsJsonStr) {
      errors.push('هیچ فایل داده رمانی (novels.json) در فایل زیپ یافت نشد.');
      return {
        valid: false,
        novels: [],
        totalChapters: 0,
        totalWords: 0,
        errors,
      };
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(novelsJsonStr);
    } catch (e: any) {
      errors.push(`خطا در پردازش JSON فایل رمان‌ها: ${e.message}`);
      return {
        valid: false,
        novels: [],
        totalChapters: 0,
        totalWords: 0,
        errors,
      };
    }

    let novelsList: WebNovel[] = [];
    if (Array.isArray(parsedData)) {
      novelsList = parsedData;
    } else if (parsedData && Array.isArray(parsedData.customNovels)) {
      novelsList = parsedData.customNovels;
    } else if (parsedData && Array.isArray(parsedData.novels)) {
      novelsList = parsedData.novels;
    } else if (parsedData && parsedData.title) {
      // Single novel object
      novelsList = [parsedData];
    } else {
      errors.push('ساختار رمان‌ها در فایل زیپ معتبر نیست.');
      return {
        valid: false,
        novels: [],
        totalChapters: 0,
        totalWords: 0,
        errors,
      };
    }

    // Sanitize and validate each novel
    const validatedNovels: WebNovel[] = [];
    let totalChapters = 0;
    let totalWords = 0;

    for (let i = 0; i < novelsList.length; i++) {
      const item = novelsList[i];
      if (!item || typeof item !== 'object' || !item.title) {
        continue;
      }

      const novelId = item.id || `restored-novel-${Date.now()}-${i}`;
      const chapters = Array.isArray(item.chapters) ? item.chapters : [];
      totalChapters += chapters.length;

      chapters.forEach((ch: any) => {
        if (ch && typeof ch.content === 'string') {
          totalWords += ch.content.split(/\s+/).filter(Boolean).length;
        }
      });

      validatedNovels.push({
        ...item,
        id: novelId,
        title: String(item.title).trim(),
        author: item.author ? String(item.author).trim() : 'نویسنده نامشخص',
        genre: item.genre ? String(item.genre).trim() : 'عمومی',
        synopsis: item.synopsis ? String(item.synopsis) : '',
        price: typeof item.price === 'number' ? Math.max(0, item.price) : 5,
        pricePerChapter: typeof item.pricePerChapter === 'number' ? item.pricePerChapter : 2,
        uploadedAt: item.uploadedAt || new Date().toISOString().slice(0, 10),
        chapters: chapters.map((c: any, cIdx: number) => ({
          id: c.id || `ch-${cIdx + 1}-${Date.now()}`,
          chapterNumber: typeof c.chapterNumber === 'number' ? c.chapterNumber : cIdx + 1,
          title: c.title ? String(c.title).trim() : `فصل ${cIdx + 1}`,
          content: c.content ? String(c.content) : '',
          price: typeof c.price === 'number' ? c.price : 2,
        })),
      });
    }

    if (validatedNovels.length === 0) {
      errors.push('هیچ رمان معتبری در فایل زیپ پیدا نشد.');
      return {
        valid: false,
        novels: [],
        totalChapters: 0,
        totalWords: 0,
        errors,
      };
    }

    let manifest: NovelBackupManifest | undefined;
    if (manifestJsonStr) {
      try {
        manifest = JSON.parse(manifestJsonStr);
      } catch {}
    }

    let readingProgress: Record<string, any> | undefined;
    let unlockedNovelIds: string[] | undefined;
    let unlockedChapterIds: string[] | undefined;

    if (readingStateJsonStr) {
      try {
        const rs = JSON.parse(readingStateJsonStr);
        readingProgress = rs.readingProgress;
        unlockedNovelIds = rs.unlockedNovelIds;
        unlockedChapterIds = rs.unlockedChapterIds;
      } catch {}
    }

    return {
      valid: true,
      novels: validatedNovels,
      manifest,
      readingProgress,
      unlockedNovelIds,
      unlockedChapterIds,
      totalChapters,
      totalWords,
      errors: [],
    };
  } catch (err: any) {
    errors.push(`خطا در بازگشایی فایل فشرده زیپ: ${err.message || err}`);
    return {
      valid: false,
      novels: [],
      totalChapters: 0,
      totalWords: 0,
      errors,
    };
  }
}

/**
 * Triggers download of a raw novel ZIP blob
 */
export function downloadNovelZipFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
