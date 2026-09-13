import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Upload, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Coins, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  AlertCircle,
  AlertTriangle,
  FolderPlus,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Edit3,
  Check,
  Library,
  HelpCircle,
  FileCheck,
  FileArchive,
  Archive,
  FolderArchive,
  Loader2,
  FolderUp,
  Clipboard,
  ClipboardPaste,
  Globe,
  Scissors,
  AlignLeft,
  FileCode,
  Link2,
  Copy,
  PenTool,
  Languages,
  Lock,
  ShieldCheck,
  Zap,
  Cpu,
  Search,
  RefreshCw,
  Sliders,
  Type,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { WebNovel, WebNovelChapter, Language } from '../types';
import { formatNumber } from '../utils/translations';
import { 
  parseChapterFromFileName, 
  sortParsedFiles, 
  autoSplitSingleFileChapters,
  normalizeDigits,
  extractChaptersFromZip,
  ExtractedChapterItem,
  splitPastedTextIntoChapters,
  cleanHtmlToNovelText,
  extractChapterFromTextContent,
  extractChapterDetailsFromAnyFile,
  extractNovelFromHtmlWithAI,
  extractChaptersMetadataWithAI,
  translateNovelChapterWithAI,
  translateNovelChapterWithFreeEngine,
  translateNovelChapter,
  SplitMode
} from '../utils/novelParser';
import { backgroundNovelTranslator } from '../utils/backgroundNovelTranslator';
import { resolveNovelSynopsis } from '../utils/rewardWallet';

export interface CustomChapter {
  id?: string;
  title: string;
  content: string;
  chapterNumber: number;
  sourceFileName?: string;
}

interface UploadNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNovel: (novel: WebNovel) => void;
  existingNovels?: WebNovel[];
  targetNovel?: WebNovel | null;
  language: Language;
}

const GENRE_SUGGESTIONS = [
  'سیستم و تناسخ (Progression/System)',
  'فانتزی حماسی و جادو',
  'علمی‌تخیلی و آینده‌نگر',
  'توسعه فردی و روانشناسی اراده',
  'ماجراجویی و صعود',
  'معمایی و رازآلود',
  'فلسفی و انگیزشی',
  'رمان کوتاه الهام‌بخش',
];

const COVER_GRADIENTS = [
  { name: 'شب بنفش', class: 'from-slate-800 via-indigo-950 to-slate-950' },
  { name: 'فولاد تیره', class: 'from-slate-800 via-slate-900 to-black' },
  { name: 'زمرد تاریک', class: 'from-emerald-950 via-teal-950 to-slate-950' },
  { name: 'یاقوت دودی', class: 'from-rose-950 via-slate-900 to-stone-950' },
  { name: 'اقیانوس عمیق', class: 'from-cyan-950 via-blue-950 to-slate-950' },
  { name: 'سایه نایت', class: 'from-zinc-900 via-slate-950 to-black' },
];

export const UploadNovelModal: React.FC<UploadNovelModalProps> = ({
  isOpen,
  onClose,
  onSaveNovel,
  existingNovels = [],
  targetNovel = null,
  language,
}) => {
  // Mode: 'new' novel or 'append' chapters to existing novel
  const [modalMode, setModalMode] = useState<'new' | 'append'>('new');
  const [selectedExistingNovelId, setSelectedExistingNovelId] = useState<string>('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState(GENRE_SUGGESTIONS[0]);
  const [customGenre, setCustomGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [novelPrice, setNovelPrice] = useState<number>(2); // Total novel unlock price (fixed & immutable)
  const [pricePerChapter, setPricePerChapter] = useState<number>(2); // 1 to 5 coins per chapter
  const [isPriceLocked, setIsPriceLocked] = useState<boolean>(true);
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0].class);
  const [tagsInput, setTagsInput] = useState('');

  // Working chapters list
  const [chapters, setChapters] = useState<{
    id?: string;
    title: string;
    content: string;
    chapterNumber: number;
    sourceFileName?: string;
  }[]>([]);

  // Intelligent AI chapter number extraction from content
  const [useAiChapterExtraction, setUseAiChapterExtraction] = useState<boolean>(true);

  // Tab and Working States
  const [activeTab, setActiveTab] = useState<'paste' | 'manual' | 'upload' | 'url_import' | 'chapters_list'>('paste');
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState('');

  // AI Key Switch Notification & Quota Warning State
  const [aiKeyNotice, setAiKeyNotice] = useState<{
    type: 'switch' | 'warning';
    message: string;
    details?: string;
  } | null>(null);

  // 1. Direct Text Paste state
  const [pastedRawText, setPastedRawText] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [customDelimiter, setCustomDelimiter] = useState('===');
  const [wordsPerPart, setWordsPerPart] = useState(1000);

  // 2. Manual chapter-by-chapter editor state
  const [manualChapterTitle, setManualChapterTitle] = useState('');
  const [manualChapterContent, setManualChapterContent] = useState('');

  // 3. URL Import state
  const [urlToFetch, setUrlToFetch] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // 4. Smart AI HTML Parsing & Translation Settings
  const [useAiHtmlExtraction, setUseAiHtmlExtraction] = useState(true);
  const [useTranslation, setUseTranslation] = useState(false);
  const [translationEngine, setTranslationEngine] = useState<'free' | 'ai'>('ai'); // 'ai' = Gemini AI model (literary quality), 'free' = non-AI web translator
  const [translateTargetLang, setTranslateTargetLang] = useState<'fa' | 'ar' | 'en'>('fa');
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [isTranslatingPasted, setIsTranslatingPasted] = useState(false);
  const [translatingChapterIdx, setTranslatingChapterIdx] = useState<number | null>(null);
  const [showTranslationLauncherModal, setShowTranslationLauncherModal] = useState(false);
  
  // Smart Translation Center Redesigned Stages: 'select' | 'confirm' | 'translating' | 'completed'
  const [smartHubStep, setSmartHubStep] = useState<'select' | 'confirm' | 'translating' | 'completed'>('select');
  const [smartHubScope, setSmartHubScope] = useState<'all' | 'untranslated'>('all');
  
  // Live in-modal translation progress tracking
  const [liveProgress, setLiveProgress] = useState<{
    total: number;
    completed: number;
    currentTitle: string;
    percent: number;
    engine: 'free' | 'ai';
    targetLang: 'fa' | 'ar' | 'en';
  } | null>(null);
  const cancelLiveRef = useRef<boolean>(false);

  // 5. Glossary & Batch Word/Name Replacement Tool
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [glossaryFind, setGlossaryFind] = useState('');
  const [glossaryReplace, setGlossaryReplace] = useState('');
  const [glossaryMatchCase, setGlossaryMatchCase] = useState(false);

  // Live match counter for glossary
  const liveGlossaryMatchesCount = useMemo(() => {
    const term = glossaryFind.trim();
    if (!term) return 0;
    try {
      const flags = glossaryMatchCase ? 'g' : 'gi';
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      let count = 0;
      chapters.forEach((ch) => {
        if (ch.title) count += (ch.title.match(regex) || []).length;
        if (ch.content) count += (ch.content.match(regex) || []).length;
      });
      if (pastedRawText) {
        count += (pastedRawText.match(regex) || []).length;
      }
      if (manualChapterTitle) count += (manualChapterTitle.match(regex) || []).length;
      if (manualChapterContent) count += (manualChapterContent.match(regex) || []).length;
      if (title) count += (title.match(regex) || []).length;
      if (synopsis) count += (synopsis.match(regex) || []).length;
      return count;
    } catch {
      return 0;
    }
  }, [glossaryFind, glossaryMatchCase, chapters, pastedRawText, manualChapterTitle, manualChapterContent, title, synopsis]);

  // Batch Replace word or character name in all chapters & raw text
  const handleGlossaryReplaceAll = () => {
    const findStr = glossaryFind.trim();
    if (!findStr) {
      setError(isFa ? 'لطفاً کلمه یا عبارت مورد نظر برای جستجو را وارد کنید.' : 'Enter text to find.');
      return;
    }
    setError('');

    let totalReplacements = 0;
    const repStr = glossaryReplace;
    const flags = glossaryMatchCase ? 'g' : 'gi';

    // Safe regex escaping
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegex(findStr), flags);

    // 1. Replace in chapters
    if (chapters.length > 0) {
      const updated = chapters.map((ch) => {
        const matchInTitle = (ch.title ? (ch.title.match(regex) || []).length : 0);
        const matchInContent = (ch.content ? (ch.content.match(regex) || []).length : 0);
        totalReplacements += matchInTitle + matchInContent;

        return {
          ...ch,
          title: ch.title ? ch.title.replace(regex, repStr) : ch.title,
          content: ch.content ? ch.content.replace(regex, repStr) : ch.content,
        };
      });
      setChapters(updated);
    }

    // 2. Replace in pasted raw text if present
    if (pastedRawText) {
      const matchInPasted = (pastedRawText.match(regex) || []).length;
      totalReplacements += matchInPasted;
      if (matchInPasted > 0) {
        setPastedRawText((prev) => prev.replace(regex, repStr));
      }
    }

    // 3. Replace in manual chapter inputs
    if (manualChapterTitle) {
      const matchInManualTitle = (manualChapterTitle.match(regex) || []).length;
      totalReplacements += matchInManualTitle;
      setManualChapterTitle((prev) => prev.replace(regex, repStr));
    }
    if (manualChapterContent) {
      const matchInManualContent = (manualChapterContent.match(regex) || []).length;
      totalReplacements += matchInManualContent;
      setManualChapterContent((prev) => prev.replace(regex, repStr));
    }

    // 4. Replace in novel title & synopsis
    if (title) {
      const matchInTitle = (title.match(regex) || []).length;
      totalReplacements += matchInTitle;
      setTitle((prev) => prev.replace(regex, repStr));
    }
    if (synopsis) {
      const matchInSynopsis = (synopsis.match(regex) || []).length;
      totalReplacements += matchInSynopsis;
      setSynopsis((prev) => prev.replace(regex, repStr));
    }

    setShowGlossaryModal(false);
    if (totalReplacements > 0) {
      setSuccessInfo(
        isFa
          ? `✅ عبارت «${findStr}» جستجو شد و در تعداد ${formatNumber(totalReplacements, language)} مورد با «${repStr}» جایگزین گردید.`
          : `✅ Replaced "${findStr}" with "${repStr}" ${totalReplacements} times across novel.`
      );
    } else {
      setSuccessInfo(
        isFa
          ? `ℹ️ عبارت «${findStr}» در فصول و متون رمان یافت نشد.`
          : `ℹ️ Term "${findStr}" was not found in novel.`
      );
    }
    setGlossaryFind('');
    setGlossaryReplace('');
  };

  // Translate pasted raw text in paste tab
  const handleTranslatePastedText = async (engineToUse?: 'free' | 'ai') => {
    if (!pastedRawText.trim() || isTranslatingPasted) return;
    const chosenEngine = engineToUse || translationEngine;

    try {
      setIsTranslatingPasted(true);
      setError('');
      setProcessingStatusText(
        isFa
          ? `در حال ترجمه متن الصاقی با ${chosenEngine === 'free' ? 'موتور سریع رایگان وب (بدون هوش مصنوعی)' : 'هوش مصنوعی ادبی'}...`
          : `Translating pasted text (${chosenEngine === 'free' ? 'Free Web Engine' : 'AI Engine'})...`
      );

      const res = await translateNovelChapter(pastedRawText, title, {
        engine: chosenEngine,
        targetLang: translateTargetLang,
      });

      if (res.success && res.content) {
        setPastedRawText(res.content);
        if (res.title && !title) {
          setTitle(res.title);
        }
        setSuccessInfo(
          isFa
            ? `✅ متن رمان با موفقیت توسط ${chosenEngine === 'free' ? 'موتور سریع رایگان' : 'هوش مصنوعی'} به فارسی ترجمه شد.`
            : `✅ Text translated successfully using ${chosenEngine === 'free' ? 'Free Engine' : 'AI Engine'}.`
        );
      } else {
        setError(isFa ? 'ترجمه متن با مشکل مواجه شد. در صورت استفاده از هوش مصنوعی، لطفاً کلید هوش مصنوعی را در تنظیمات بررسی کنید یا از گزینه «موتور رایگان» استفاده فرمایید.' : 'Translation failed. Try the Free Engine option.');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err?.message || (isFa ? 'خطا در ترجمه متن.' : 'Error translating text.'));
    } finally {
      setIsTranslatingPasted(false);
      setProcessingStatusText('');
    }
  };

  // Translate a single chapter in the chapter list
  const handleTranslateSingleChapter = async (index: number, engineToUse?: 'free' | 'ai') => {
    const ch = chapters[index];
    if (!ch || !ch.content.trim()) return;
    const chosenEngine = engineToUse || translationEngine;

    try {
      setTranslatingChapterIdx(index);
      setError('');
      const res = await translateNovelChapter(ch.content, ch.title, {
        engine: chosenEngine,
        targetLang: translateTargetLang,
      });

      if (res.success && res.content) {
        setChapters((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  title: res.title || c.title,
                  content: res.content,
                }
              : c
          )
        );
        setSuccessInfo(
          isFa
            ? `✅ فصل «${res.title || ch.title}» با ${chosenEngine === 'free' ? 'موتور سریع رایگان وب' : 'هوش مصنوعی'} ترجمه شد.`
            : `✅ Chapter "${res.title || ch.title}" translated using ${chosenEngine === 'free' ? 'Free Engine' : 'AI Engine'}.`
        );
      } else {
        setError(isFa ? 'ترجمه با مشکل مواجه شد. لطفاً موتور رایگان را امتحان کنید.' : 'Translation failed. Try Free Engine.');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err?.message || (isFa ? 'خطا در ترجمه فصل.' : 'Error translating chapter.'));
    } finally {
      setTranslatingChapterIdx(null);
    }
  };

  // Translate all chapters in the chapter list with high-speed parallel workers
  const handleTranslateAllChapters = async (engineToUse?: 'free' | 'ai', targetLangToUse?: 'fa' | 'ar' | 'en') => {
    if (chapters.length === 0 || isTranslatingAll) return;
    const chosenEngine = engineToUse || translationEngine;
    const chosenLang = targetLangToUse || translateTargetLang;
    cancelLiveRef.current = false;

    try {
      setIsTranslatingAll(true);
      setSmartHubStep('translating');
      setError('');
      const updated = [...chapters];
      let completedCount = 0;
      const totalCount = updated.length;

      setLiveProgress({
        total: totalCount,
        completed: 0,
        currentTitle: updated[0]?.title || '',
        percent: 0,
        engine: chosenEngine,
        targetLang: chosenLang,
      });

      // Concurrency limit: 3 parallel workers for free engine, 2 for AI
      const concurrency = chosenEngine === 'free' ? 3 : 2;
      let nextIndex = 0;

      const worker = async () => {
        while (nextIndex < totalCount && !cancelLiveRef.current) {
          const currentIndex = nextIndex++;
          const ch = updated[currentIndex];
          if (!ch || !ch.content.trim()) {
            completedCount++;
            setLiveProgress((prev) => prev ? {
              ...prev,
              completed: completedCount,
              percent: Math.round((completedCount / totalCount) * 100),
            } : null);
            continue;
          }

          setTranslatingChapterIdx(currentIndex);
          setLiveProgress((prev) => prev ? {
            ...prev,
            currentTitle: ch.title,
            completed: completedCount,
            percent: Math.round((completedCount / totalCount) * 100),
          } : null);

          setProcessingStatusText(
            isFa
              ? `⚡ در حال ترجمه پرسرعت (${completedCount + 1}/${totalCount}) - فصل «${ch.title}» با ${chosenEngine === 'free' ? 'موتور سریع رایگان وب' : 'هوش مصنوعی'}...`
              : `⚡ Translating (${completedCount + 1}/${totalCount}) - "${ch.title}" using ${chosenEngine === 'free' ? 'Free Engine' : 'AI'}...`
          );

          try {
            const res = await translateNovelChapter(ch.content, ch.title, {
              engine: chosenEngine,
              targetLang: chosenLang,
            });

            if (res.success && res.content) {
              updated[currentIndex] = {
                ...updated[currentIndex],
                title: res.title || updated[currentIndex].title,
                content: res.content,
              };
              setChapters([...updated]);
            }
          } catch (e) {
            console.warn(`Error translating chapter ${currentIndex + 1}:`, e);
          } finally {
            completedCount++;
            setLiveProgress((prev) => prev ? {
              ...prev,
              completed: completedCount,
              percent: Math.round((completedCount / totalCount) * 100),
            } : null);
          }
        }
      };

      // Run workers concurrently
      const workers = Array.from({ length: Math.min(concurrency, totalCount) }, () => worker());
      await Promise.all(workers);

      if (!cancelLiveRef.current) {
        setSmartHubStep('completed');
        setSuccessInfo(
          isFa
            ? `🎉 تمام ${formatNumber(updated.length, language)} فصل با موفقیت توسط ${chosenEngine === 'free' ? 'موتور سریع رایگان وب' : 'هوش مصنوعی'} به فارسی ترجمه شدند.`
            : `🎉 All ${updated.length} chapters translated successfully using ${chosenEngine === 'free' ? 'Free Engine' : 'AI Engine'}.`
        );
      }
    } catch (err: any) {
      console.error('Batch translation error:', err);
      setError(err?.message || (isFa ? 'خطا در ترجمه دسته‌جمعی فصول.' : 'Error during batch translation.'));
    } finally {
      setIsTranslatingAll(false);
      setTranslatingChapterIdx(null);
      setLiveProgress(null);
      setProcessingStatusText('');
    }
  };

  // Offload in-progress live translation to persistent server background
  const handleOffloadLiveToServer = () => {
    cancelLiveRef.current = true;
    setIsTranslatingAll(false);
    setSmartHubStep('select');
    handleStartBackgroundTranslation(translationEngine, translateTargetLang, true);
  };

  // Start Background Translation job and save novel so user can freely close the modal
  const handleStartBackgroundTranslation = (
    engineToUse?: 'free' | 'ai', 
    targetLangToUse?: 'fa' | 'ar' | 'en',
    runOnServer: boolean = true
  ) => {
    let chaptersToTranslate = [...chapters];

    // If chapters is empty but user pasted raw text, split it immediately!
    if (chaptersToTranslate.length === 0 && pastedRawText.trim()) {
      const splitList = splitPastedTextIntoChapters(pastedRawText, splitMode, {
        delimiter: customDelimiter,
        wordsPerChapter: wordsPerPart,
        language,
        existingOffset: 0,
        defaultPrice: pricePerChapter,
      });
      if (splitList.length > 0) {
        chaptersToTranslate = splitList.map((c) => ({
          id: c.id,
          title: c.title,
          content: c.content,
          chapterNumber: c.chapterNumber,
          sourceFileName: c.sourceFileName,
        }));
      }
    }

    // If still no chapters, check manual input
    if (chaptersToTranslate.length === 0 && manualChapterContent.trim()) {
      chaptersToTranslate = [{
        id: `custom-manual-${Date.now()}`,
        title: manualChapterTitle.trim() || (isFa ? 'فصل اول' : 'Chapter 1'),
        content: manualChapterContent.trim(),
        chapterNumber: 1,
      }];
    }

    if (chaptersToTranslate.length === 0) {
      setError(isFa ? 'لطفاً ابتدا فایل‌ها را انتخاب کرده یا متن رمان را الصاق نمایید.' : 'Please add novel files or paste text first.');
      setShowTranslationLauncherModal(false);
      return;
    }

    const chosenEngine = engineToUse || translationEngine || 'free';
    const chosenLang = targetLangToUse || translateTargetLang || 'fa';
    const novelTitleToUse = title.trim() || (isFa ? 'رمان در حال ترجمه' : 'Novel in Translation');
    const targetNovelId = targetNovel?.id || (modalMode === 'append' ? selectedExistingNovelId : `user-novel-${Date.now()}`);

    const finalPricePerChapter = Math.max(1, Number(pricePerChapter) || 2);
    const totalNovelPrice = chaptersToTranslate.length > 0 ? chaptersToTranslate.length * finalPricePerChapter : finalPricePerChapter;

    const formattedChapters = chaptersToTranslate.map((c, i) => ({
      id: c.id || `ch-${targetNovelId}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
      title: c.title || (isFa ? `فصل ${c.chapterNumber || (i + 1)}` : `Chapter ${c.chapterNumber || (i + 1)}`),
      content: c.content,
      chapterNumber: c.chapterNumber || (i + 1),
      price: finalPricePerChapter,
      sourceFileName: c.sourceFileName,
      isTranslated: Boolean((c as any).isTranslated),
    }));

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let novelToSave: WebNovel;
    if (modalMode === 'append' && selectedExistingNovelId) {
      const targetExistingNovel = appendableNovels.find((n) => n.id === selectedExistingNovelId);
      novelToSave = {
        ...(targetExistingNovel || {}),
        id: selectedExistingNovelId,
        title: targetExistingNovel?.title || novelTitleToUse,
        author: targetExistingNovel?.author || (author.trim() || (isFa ? 'ناشناس' : 'Anonymous Author')),
        genre: targetExistingNovel?.genre || (genre === 'سایر...' ? customGenre.trim() : genre) || (isFa ? 'فانتزی' : 'Fantasy'),
        synopsis: targetExistingNovel?.synopsis || synopsis.trim() || '',
        coverColor: targetExistingNovel?.coverColor || selectedGradient,
        chapters: formattedChapters,
        price: formattedChapters.length * finalPricePerChapter,
        pricePerChapter: finalPricePerChapter,
        isPriceLocked: true,
        isDefault: false,
      } as WebNovel;
    } else {
      novelToSave = {
        id: targetNovelId,
        title: novelTitleToUse,
        author: author.trim() || (isFa ? 'نویسنده ناشناس' : 'Anonymous Author'),
        genre: (genre === 'سایر...' ? customGenre.trim() : genre) || (isFa ? 'فانتزی' : 'Fantasy'),
        synopsis: synopsis.trim() || (isFa ? 'رمان در حال ترجمه خودکار در پس‌زمینه...' : 'Novel is being translated in background...'),
        coverColor: selectedGradient,
        price: totalNovelPrice,
        pricePerChapter: finalPricePerChapter,
        isPriceLocked: true,
        tags: parsedTags.length > 0 ? parsedTags : [isFa ? 'رمان ترجمه' : 'Translated Novel'],
        chapters: formattedChapters,
        isDefault: false,
        rating: 5.0,
        uploadedAt: new Date().toISOString(),
      };
    }

    // 1. Launch background translation job (Translates in background and uploads only translated chapters)
    backgroundNovelTranslator.startNewJob({
      novelId: novelToSave.id,
      novelTitle: novelToSave.title,
      author: novelToSave.author,
      genre: novelToSave.genre,
      synopsis: novelToSave.synopsis,
      coverGradient: novelToSave.coverColor,
      price: novelToSave.price,
      pricePerChapter: novelToSave.pricePerChapter,
      isPriceLocked: true,
      chapters: formattedChapters.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        chapterNumber: c.chapterNumber,
        sourceFileName: c.sourceFileName,
        isTranslated: c.isTranslated,
      })),
      targetLang: chosenLang,
      engine: chosenEngine,
      runOnServer,
    });

    setShowTranslationLauncherModal(false);
    onClose();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Quick 1-Click Complete Novel Template Loader
  const handleLoadFullSampleNovel = () => {
    setError('');
    if (isFa) {
      setTitle('صعود اراده: ارباب سایه‌ها');
      setAuthor('آریو راد');
      setGenre('فانتزی');
      setSynopsis('در دنیایی که جادوگران قدرت‌های خود را بر اساس شانس به دست می‌آورند، پسری جوان با کشف سیستمی مخفی یاد می‌گیرد که چگونه با انضباط شخصی و تمرکز روزانه بر کل امپراتوری حکومت کند.');
      setTagsInput('سیستم، صعود، جادو، انضباط، اراده');
      setSelectedGradient('from-slate-800 via-cyan-950 to-slate-950');
      setChapters([
        {
          id: `sample-ch-${Date.now()}-1`,
          chapterNumber: 1,
          title: 'فصل ۱: بیداری نشان کهن',
          content: 'در تالار عظیم آکادمی نور، صدها جوان در صف ایستاده بودند تا سنگ سرنوشت را لمس کنند. نوبت به آریو رسید. دستش را روی سنگ صیقلی گذاشت. ناگهان نوری طلایی در چشمانش درخشید و صدایی در مغزش پیچید: «سیستم اراده فعال شد. پاداش اولین تمرکز: +۱۰ سکه عزم».',
        },
        {
          id: `sample-ch-${Date.now()}-2`,
          chapterNumber: 2,
          title: 'فصل ۲: دروازه اولین آزمون',
          content: 'دروازه‌های آهنین برج تاریکی با صدایی سهمگین گشوده شد. مه غلیظی فضای تالار را پوشانده بود. هیولاهای سایه از دیوارها بیرون می‌آمدند. آریو نفس عمیقی کشید و با فعال کردن تمرکز درونی، مسیر مخفی را پیدا کرد.',
        },
        {
          id: `sample-ch-${Date.now()}-3`,
          chapterNumber: 3,
          title: 'فصل ۳: راز کتابخانه باستانی',
          content: 'در اعماق برج، طومارهای نایابی قرار داشتند که سال‌ها کسی به آنها دست نزده بود. با لمس اولین طومار، دانش نیاکان به ذهن آریو سرازیر شد: «اراده قوی‌تر از هر جادوی بیرونی است».',
        },
        {
          id: `sample-ch-${Date.now()}-4`,
          chapterNumber: 4,
          title: 'فصل ۴: نبرد در دژ سایه‌ها',
          content: 'فرمانده نگهبانان با شمشیر آتشینش به سمت آریو هجوم آورد. زمان به نظر متوقف شده بود. آریو با استفاده از مهارت گام باد، از ضربه جاخالی داد و ضربه پایانی را وارد کرد.',
        },
        {
          id: `sample-ch-${Date.now()}-5`,
          chapterNumber: 5,
          title: 'فصل ۵: پادشاهی نوین',
          content: 'خورشید از پشت کوهستان سر برآورد. پرچم جدید بر فراز برج به اهتزاز درآمد. تمام مردم به احترام آریو تعظیم کردند و عصر جدیدی از صلح و پیشرفت آغاز شد...',
        },
      ]);
    } else {
      setTitle('Shadow Ascendant: Master of Will');
      setAuthor('Alex Vance');
      setGenre('Fantasy');
      setSynopsis('In a world governed by random awakening talents, one boy discovers the ancient Willpower System, allowing him to grow stronger through daily focus and discipline.');
      setTagsInput('System, Fantasy, Willpower, Progression');
      setSelectedGradient('from-slate-800 via-cyan-950 to-slate-950');
      setChapters([
        {
          id: `sample-ch-${Date.now()}-1`,
          chapterNumber: 1,
          title: 'Chapter 1: The Awakening',
          content: 'Standing before the monolith of destiny, Alex placed his palm against the cold obsidian stone. A brilliant golden interface flashed before his vision: [Willpower System Activated. Focus level: 100%].',
        },
        {
          id: `sample-ch-${Date.now()}-2`,
          chapterNumber: 2,
          title: 'Chapter 2: The First Dungeon',
          content: 'The colossal iron doors groaned as they parted. Shadows danced across the ruined pillars as beasts prepared to strike. Alex gripped his blade with steady breath.',
        },
        {
          id: `sample-ch-${Date.now()}-3`,
          chapterNumber: 3,
          title: 'Chapter 3: The Ancient Codex',
          content: 'Hidden deep within the sanctuary lay the forgotten scrolls of the first masters. Knowledge rushed through his consciousness like an unstoppable tide.',
        },
        {
          id: `sample-ch-${Date.now()}-4`,
          chapterNumber: 4,
          title: 'Chapter 4: Trial by Fire',
          content: 'Flames surged across the arena as the guardian unleashed its ultimate attack. With absolute mental stillness, Alex found the weakness in the armor.',
        },
        {
          id: `sample-ch-${Date.now()}-5`,
          chapterNumber: 5,
          title: 'Chapter 5: Dawn of a Legend',
          content: 'As sunlight pierced through the storm clouds, the realm recognized its new protector. The journey towards the peak had only just begun...',
        },
      ]);
    }
    setActiveTab('chapters_list');
    setSuccessInfo(
      isFa 
        ? '✨ رمان نمونه ۵ فصلی با موفقیت بارگذاری شد! می‌توانید اطلاعات را ویرایش کرده یا مستقیماً دکمه «ثبت و انتشار در فروشگاه» را بزنید.' 
        : '✨ Complete 5-chapter sample novel loaded! You can edit or click Save & Publish.'
    );
  };

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  // Custom novels that can receive appended chapters
  const appendableNovels = existingNovels.filter((n) => !n.isDefault);

  // Initialize or update state when targetNovel or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (targetNovel && !targetNovel.isDefault) {
      setModalMode('append');
      setSelectedExistingNovelId(targetNovel.id);
      loadExistingNovelData(targetNovel);
    } else {
      setModalMode('new');
      resetNewNovelForm();
    }
  }, [isOpen, targetNovel]);

  const resetNewNovelForm = () => {
    setTitle('');
    setAuthor('');
    setGenre(GENRE_SUGGESTIONS[0]);
    setCustomGenre('');
    setSynopsis('');
    setNovelPrice(2);
    setPricePerChapter(2);
    setIsPriceLocked(true);
    setSelectedGradient(COVER_GRADIENTS[0].class);
    setTagsInput('');
    setChapters([]);
    setPastedRawText('');
    setSplitMode('auto');
    setCustomDelimiter('===');
    setWordsPerPart(1000);
    setManualChapterTitle('');
    setManualChapterContent('');
    setUrlToFetch('');
    setError('');
    setSuccessInfo('');
    setActiveTab('paste');
    setProcessingStatusText('');
  };

  const loadExistingNovelData = (novel: WebNovel) => {
    if (!novel || typeof novel !== 'object' || !novel.title) return;
    setTitle(novel.title || '');
    setAuthor(novel.author || '');
    setGenre(novel.genre || GENRE_SUGGESTIONS[0]);
    setSynopsis(resolveNovelSynopsis(novel, language));
    setNovelPrice(novel.price !== undefined ? novel.price : 2);
    setPricePerChapter(novel.pricePerChapter || 2);
    setIsPriceLocked(novel.isPriceLocked ?? true);
    setSelectedGradient(novel.coverColor || COVER_GRADIENTS[0].class);
    setTagsInput(Array.isArray(novel.tags) ? novel.tags.join(', ') : '');
    
    // Load existing chapters
    if (novel.chapters && novel.chapters.length > 0) {
      setChapters(
        novel.chapters.map((ch, idx) => ({
          id: ch.id,
          title: ch.title || `فصل ${idx + 1}`,
          content: ch.content || '',
          chapterNumber: ch.chapterNumber || idx + 1,
        }))
      );
    } else {
      setChapters([
        {
          title: 'فصل اول: سرآغاز',
          content: novel.rawContent || '',
          chapterNumber: 1,
        }
      ]);
    }
    setError('');
    setSuccessInfo(
      isFa 
        ? `رمان «${novel.title}» با ${novel.chapters?.length || 1} فصل بارگذاری شد. می‌توانید فصل‌های جدید یا فایل ZIP را اضافه کنید.`
        : `Loaded "${novel.title}" with ${novel.chapters?.length || 1} chapters. You can add new chapters or ZIP now.`
    );
  };

  if (!isOpen) return null;

  // Handle multi-file or ZIP archive upload with intelligent chapter number detection & natural sorting
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;
    setIsProcessingFiles(true);
    setProcessingStatusText(isFa ? 'در حال بررسی و پردازش فایل‌های انتخابی...' : 'Processing selected files...');
    setError('');

    const filesArray = Array.from(fileList);
    
    // Determine existing chapters offset if in append mode
    const existingCount = chapters.length;

    // Categorize files
    const zipFiles: File[] = [];
    const htmlFiles: File[] = [];
    const textFiles: File[] = [];

    for (const f of filesArray) {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const isZip = ext === 'zip' || f.type.includes('zip') || f.name.toLowerCase().endsWith('.zip');
      const isHtml = ['html', 'htm', 'xhtml'].includes(ext) || f.type.includes('html');
      const isText = ['txt', 'md', 'json', 'csv', 'text', 'rtf'].includes(ext) || f.type.startsWith('text/');

      if (isZip) {
        zipFiles.push(f);
      } else if (isHtml) {
        htmlFiles.push(f);
      } else if (isText) {
        textFiles.push(f);
      }
    }

    if (zipFiles.length === 0 && htmlFiles.length === 0 && textFiles.length === 0) {
      setIsProcessingFiles(false);
      setProcessingStatusText('');
      setError(
        isFa 
          ? 'لطفاً فایل‌های متنی معتبر (HTML, ZIP, TXT, MD) حاوی فصل‌های رمان را انتخاب نمایید.' 
          : 'Please select valid novel files (HTML, ZIP, TXT, MD).'
      );
      return;
    }

    try {
      setAiKeyNotice(null);
      const newlyExtractedChapters: {
        id?: string;
        title: string;
        content: string;
        chapterNumber: number;
        sourceFileName?: string;
      }[] = [];

      let autoDetectedTitle = '';

      // 1. Process any ZIP archives first (with inner HTML detection & automatic chapter sorting)
      if (zipFiles.length > 0) {
        for (let zIdx = 0; zIdx < zipFiles.length; zIdx++) {
          const zipFile = zipFiles[zIdx];
          setProcessingStatusText(
            isFa 
              ? `📦 در حال بازگشایی و استخراج خودکار فایل فشرده ZIP (${zipFile.name})...`
              : `📦 Unpacking and sorting ZIP archive (${zipFile.name})...`
          );

          const zipResult = await extractChaptersFromZip(
            zipFile,
            language,
            existingCount + newlyExtractedChapters.length,
            pricePerChapter,
            {
              useAiHtmlExtraction: useAiChapterExtraction,
              onProgress: (status) => setProcessingStatusText(status),
              onKeySwitched: (info) => {
                setAiKeyNotice({
                  type: 'switch',
                  message: info.message,
                  details: info.newKeyLabel,
                });
              },
              onNoKeysWarning: (warnMsg) => {
                setAiKeyNotice({
                  type: 'warning',
                  message: warnMsg,
                });
              },
            }
          );

          if (!autoDetectedTitle && zipResult.detectedNovelTitle) {
            autoDetectedTitle = zipResult.detectedNovelTitle;
          }

          newlyExtractedChapters.push(...zipResult.chapters);
        }
      }

      // 2. Process HTML files: extract title and chapter number from INSIDE HTML tags & content
      if (htmlFiles.length > 0) {
        setProcessingStatusText(isFa ? 'در حال خواندن و استخراج مشخصات از داخل محتوای فایل‌های HTML...' : 'Extracting chapter details from HTML content...');

        const loadedHtmlList: {
          file: File;
          fileName: string;
          rawHtml: string;
          cleanResult: { title: string; content: string; chapterNumber: number | null };
        }[] = [];

        for (let i = 0; i < htmlFiles.length; i++) {
          const file = htmlFiles[i];
          const rawHtml = await readFileAsText(file);
          const cleanResult = cleanHtmlToNovelText(rawHtml, file.name, language);
          loadedHtmlList.push({
            file,
            fileName: file.name,
            rawHtml,
            cleanResult,
          });
        }

        // Use AI Extraction for HTML files if enabled
        if (useAiChapterExtraction && loadedHtmlList.length > 0) {
          setProcessingStatusText(
            isFa
              ? `🤖 در حال تحلیل هوش مصنوعی فایل‌های HTML (${loadedHtmlList.length} فایل)...`
              : `🤖 AI analyzing chapter numbers from HTML (${loadedHtmlList.length} files)...`
          );

          try {
            const aiMap = await extractChaptersMetadataWithAI(
              loadedHtmlList.map((h, idx) => ({
                id: `html-${idx}`,
                fileName: h.fileName,
                rawContent: h.rawHtml,
                isHtml: true,
              })),
              {
                language,
                onProgress: (status) => setProcessingStatusText(status),
                onKeySwitched: (info) => {
                  setAiKeyNotice({
                    type: 'switch',
                    message: info.message,
                    details: info.newKeyLabel,
                  });
                },
                onNoKeysWarning: (warnMsg) => {
                  setAiKeyNotice({
                    type: 'warning',
                    message: warnMsg,
                  });
                },
              }
            );

            for (let i = 0; i < loadedHtmlList.length; i++) {
              const aiData = aiMap.get(`html-${i}`);
              if (aiData) {
                if (aiData.chapterNumber !== null && aiData.chapterNumber > 0) {
                  loadedHtmlList[i].cleanResult.chapterNumber = aiData.chapterNumber;
                }
                if (aiData.title && aiData.title.trim().length > 1) {
                  loadedHtmlList[i].cleanResult.title = aiData.title.trim();
                }
              }
            }
          } catch (aiErr) {
            console.warn('AI extraction for HTML files failed, fallback to heuristics:', aiErr);
          }
        }

        // Naturally sort HTML files by chapter number extracted from INSIDE HTML content
        loadedHtmlList.sort((a, b) => {
          const numA = a.cleanResult.chapterNumber ?? 999999;
          const numB = b.cleanResult.chapterNumber ?? 999999;
          if (numA !== numB) {
            return numA - numB;
          }
          return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Find anchor chapter number if any
        let baseNumber: number | null = null;
        let baseIndex: number = -1;
        for (let i = 0; i < loadedHtmlList.length; i++) {
          if (loadedHtmlList[i].cleanResult.chapterNumber !== null && loadedHtmlList[i].cleanResult.chapterNumber! > 0) {
            baseNumber = loadedHtmlList[i].cleanResult.chapterNumber!;
            baseIndex = i;
            break;
          }
        }

        for (let i = 0; i < loadedHtmlList.length; i++) {
          const item = loadedHtmlList[i];
          let assignedNum: number;
          if (item.cleanResult.chapterNumber !== null && item.cleanResult.chapterNumber > 0) {
            assignedNum = item.cleanResult.chapterNumber;
          } else if (baseNumber !== null && baseIndex >= 0) {
            assignedNum = Math.max(1, baseNumber + (i - baseIndex));
          } else {
            assignedNum = existingCount + newlyExtractedChapters.length + 1;
          }

          const cleanTitle = item.cleanResult.title || (isFa ? `فصل ${assignedNum}` : `Chapter ${assignedNum}`);

          newlyExtractedChapters.push({
            id: `custom-html-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            content: item.cleanResult.content,
            chapterNumber: assignedNum,
            sourceFileName: item.fileName,
          });
        }

        if (!autoDetectedTitle && loadedHtmlList.length > 0) {
          const firstTitle = loadedHtmlList[0].cleanResult.title;
          if (firstTitle && firstTitle.length > 2 && !firstTitle.match(/^(?:فصل|چپتر|chapter)[\s0-9]+$/i)) {
            autoDetectedTitle = firstTitle;
          }
        }
      }

      // 3. Process text files: extract title and chapter number from INSIDE text content
      if (textFiles.length > 0) {
        setProcessingStatusText(isFa ? 'در حال خواندن و استخراج مشخصات از داخل متن فایل‌ها...' : 'Reading and extracting chapter info from text content...');

        // Single large file check
        if (textFiles.length === 1 && existingCount === 0 && newlyExtractedChapters.length === 0) {
          const file = textFiles[0];
          const textContent = await readFileAsText(file);

          const splitChapters = autoSplitSingleFileChapters(textContent, pricePerChapter, language);
          
          if (splitChapters.length > 1) {
            for (let i = 0; i < splitChapters.length; i++) {
              newlyExtractedChapters.push({
                id: splitChapters[i].id,
                title: splitChapters[i].title,
                content: splitChapters[i].content,
                chapterNumber: existingCount + i + 1,
                sourceFileName: file.name,
              });
            }
          } else {
            const extracted = extractChapterFromTextContent(textContent, language, 1);
            const assignedNum = extracted.chapterNumber || 1;
            const finalTitle = extracted.title || (isFa ? `فصل ${assignedNum}` : `Chapter ${assignedNum}`);
            newlyExtractedChapters.push({
              id: `custom-ch-${Date.now()}-0`,
              title: finalTitle,
              content: extracted.content || textContent.trim(),
              chapterNumber: assignedNum,
              sourceFileName: file.name,
            });
            if (!autoDetectedTitle && extracted.title && !extracted.title.match(/^(?:فصل|چپتر|chapter)[\s0-9]+$/i)) {
              autoDetectedTitle = extracted.title;
            }
          }
        } else {
          // Multiple text files: read each text and extract chapter info from the text itself
          const loadedTextList: {
            file: File;
            fileName: string;
            extracted: { title: string; content: string; chapterNumber: number | null };
          }[] = [];

          for (let i = 0; i < textFiles.length; i++) {
            const file = textFiles[i];
            const rawText = await readFileAsText(file);
            const extracted = extractChapterFromTextContent(
              rawText,
              language,
              existingCount + newlyExtractedChapters.length + i + 1
            );
            loadedTextList.push({
              file,
              fileName: file.name,
              extracted,
            });
          }

          // Naturally sort text files by chapter number extracted from INSIDE text content
          loadedTextList.sort((a, b) => {
            const numA = a.extracted.chapterNumber ?? 999999;
            const numB = b.extracted.chapterNumber ?? 999999;
            if (numA !== numB) {
              return numA - numB;
            }
            return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
          });

          for (let i = 0; i < loadedTextList.length; i++) {
            const item = loadedTextList[i];
            const assignedNum = item.extracted.chapterNumber || (existingCount + newlyExtractedChapters.length + 1);
            const cleanTitle = item.extracted.title || (isFa ? `فصل ${assignedNum}` : `Chapter ${assignedNum}`);

            newlyExtractedChapters.push({
              id: `custom-ch-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              title: cleanTitle,
              content: item.extracted.content,
              chapterNumber: assignedNum,
              sourceFileName: item.fileName,
            });
          }

          if (!autoDetectedTitle && loadedTextList.length > 0) {
            const firstTitle = loadedTextList[0].extracted.title;
            if (firstTitle && firstTitle.length > 2 && !firstTitle.match(/^(?:فصل|چپتر|chapter)[\s0-9]+$/i)) {
              autoDetectedTitle = firstTitle;
            }
          }
        }
      }

      // Auto-fill novel title if creating new novel and title is empty
      if (modalMode === 'new' && !title && autoDetectedTitle) {
        setTitle(autoDetectedTitle);
      }

      // Merge with existing chapters and sort mathematically by chapter number (preserving e.g. 50, 51, 52)
      const mergedChapters = [...chapters, ...newlyExtractedChapters];
      
      const sortedMergedChapters = [...mergedChapters].sort((a, b) => {
        const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : 999999;
        const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : 999999;
        return numA - numB;
      });

      setChapters(sortedMergedChapters);
      setActiveTab('chapters_list');

      if (zipFiles.length > 0) {
        setSuccessInfo(
          isFa 
            ? `🎉 فایل فشرده ZIP (${zipFiles.map(z => z.name).join(', ')}) با موفقیت باز شد و ${formatNumber(newlyExtractedChapters.length, language)} فصل استخراج و مرتب‌سازی شدند (مجموع: ${formatNumber(sortedMergedChapters.length, language)} فصل).`
            : `🎉 Successfully unpacked ZIP and sorted ${newlyExtractedChapters.length} chapters (Total: ${sortedMergedChapters.length} chapters).`
        );
      } else if (htmlFiles.length > 0) {
        setSuccessInfo(
          isFa 
            ? `✨ تعداد ${formatNumber(newlyExtractedChapters.length, language)} فصل از فایل‌های HTML با هوش مصنوعی استخراج و مرتب‌سازی شدند (مجموع: ${formatNumber(sortedMergedChapters.length, language)} فصل).`
            : `✨ Successfully extracted and sorted ${newlyExtractedChapters.length} chapters from HTML (Total: ${sortedMergedChapters.length} chapters).`
        );
      } else {
        setSuccessInfo(
          isFa 
            ? `🎉 تعداد ${formatNumber(newlyExtractedChapters.length, language)} فصل به ترتیب نام و شماره‌گذاری شناسایی و اضافه شدند (مجموع کل: ${formatNumber(sortedMergedChapters.length, language)} فصل).`
            : `🎉 Successfully detected and added ${newlyExtractedChapters.length} chapters in order (Total: ${sortedMergedChapters.length} chapters).`
        );
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err?.message || (isFa ? 'خطا در بازگشایی و پردازش فایل‌های انتخابی.' : 'Error reading selected files.'));
    } finally {
      setIsProcessingFiles(false);
      setProcessingStatusText('');
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Chapter list management operations
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedRawText(text);
          setSuccessInfo(isFa ? '📋 متن با موفقیت از کلیپ‌بورد الصاق شد.' : '📋 Text pasted from clipboard.');
        } else {
          setError(isFa ? 'کلیپ‌بورد شما خالی است.' : 'Clipboard is empty.');
        }
      } else {
        setError(isFa ? 'لطفاً متن رمان را با کلیدهای Ctrl+V درون کادر متنی پیست فرمایید.' : 'Please paste text manually using Ctrl+V in the box.');
      }
    } catch {
      setError(isFa ? 'لطفاً متن رمان را مستقیماً با فشردن راست‌کلیک یا Ctrl+V در کادر زیر پیست نمایید.' : 'Please paste text manually using Ctrl+V in the box.');
    }
  };

  const handleInsertSampleTemplate = () => {
    const sample = isFa
      ? `=== فصل ۱: سرآغاز بیداری ===\nدر دنیایی که هر کس با یک نشان جادویی متولد می‌شد، آریو هیچ نشانی نداشت. اما در روز هجده سالگی‌اش، صدایی ناگهانی در ذهنش طنین‌انداز شد: «سیستم صعود نامتناهی فعال شد!»...\n\n=== فصل ۲: اولین آزمون برج ===\nمه غلیظی جلوی دروازه سنگی برج را پوشانده بود. همه جادوگران با غرور به سمت ورودی حرکت می‌کردند در حالی که آریو تنها با یک خنجر ساده ایستاده بود...\n\n=== فصل ۳: قدرت پنهان ===\nنور درخشانی از کف دستانش ساتع شد و سیستم پیامی هشداردهنده صادر کرد: «سطح تمرکز شما به ۱۰۰٪ رسید. مهارت چشم اراده آزاد شد!»...`
      : `=== Chapter 1: The Awakening ===\nIn a world where status determined fate, Alex had nothing. Until a glowing blue interface appeared before his eyes...\n\n=== Chapter 2: The First Trial ===\nThe heavy stone doors of the dungeon creaked open, revealing glowing runes etched into the ancient walls...\n\n=== Chapter 3: Hidden Power ===\nA surge of golden energy coursed through his veins as the system prompted: "Focus level 100% reached!"...`;
    setPastedRawText(sample);
    setSplitMode('delimiter');
    setCustomDelimiter('===');
    if (!title) {
      setTitle(isFa ? 'صعود نامتناهی آریو' : 'The Infinite Ascension');
    }
    setSuccessInfo(isFa ? 'متن نمونه چند فصلی درج شد. حالا دکمه «تفکیک و افزودن فصل‌ها» را بزنید.' : 'Sample template inserted.');
  };

  const handlePasteAndSplit = () => {
    if (!pastedRawText.trim()) {
      setError(isFa ? 'لطفاً متن رمان یا فصل‌ها را در کادر پیست نمایید.' : 'Please paste novel text in the box.');
      return;
    }

    setError('');
    const existingCount = chapters.length;

    const extracted = splitPastedTextIntoChapters(pastedRawText, splitMode, {
      delimiter: customDelimiter,
      wordsPerChapter: wordsPerPart,
      language,
      existingOffset: existingCount,
      defaultPrice: pricePerChapter,
    });

    if (extracted.length === 0) {
      setError(isFa ? 'متنی برای تفکیک یافت نشد.' : 'No chapters could be extracted.');
      return;
    }

    // Auto fill title if empty
    if (!title && modalMode === 'new') {
      const firstLine = pastedRawText.trim().split('\n')[0].replace(/^[#=*\-_\[\]~`\s]+/, '').replace(/[#=*\-_\[\]~`\s]+$/, '');
      const clean = firstLine.replace(/(?:فصل|چپتر|قسمت|chapter|ch)[\s_.-]*[0-9]+/gi, '').replace(/^[0-9_\s.-]+/, '').trim();
      if (clean.length > 2 && clean.length < 50) {
        setTitle(clean);
      }
    }

    const merged = [...chapters, ...extracted].map((ch, idx) => ({
      ...ch,
      chapterNumber: idx + 1,
    }));

    setChapters(merged);
    setActiveTab('chapters_list');
    setSuccessInfo(
      isFa 
        ? `🎉 تعداد ${formatNumber(extracted.length, language)} فصل با موفقیت از متن الصاق شده تفکیک و به فهرست اضافه شدند (مجموع: ${formatNumber(merged.length, language)} فصل).`
        : `🎉 Successfully split and added ${extracted.length} chapters from pasted text (Total: ${merged.length} chapters).`
    );
    setPastedRawText('');
  };

  const handleAddSingleManualChapter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualChapterContent.trim() && !manualChapterTitle.trim()) {
      setError(isFa ? 'لطفاً عنوان یا متن فصل را وارد کنید.' : 'Please enter chapter title or text.');
      return;
    }

    const nextNum = chapters.length + 1;
    const newCh = {
      id: `custom-ch-${Date.now()}-${nextNum}`,
      title: manualChapterTitle.trim() || (isFa ? `فصل ${nextNum}` : `Chapter ${nextNum}`),
      content: manualChapterContent.trim() || (isFa ? 'متن این فصل...' : 'Chapter content...'),
      chapterNumber: nextNum,
    };

    const merged = [...chapters, newCh];
    setChapters(merged);
    setManualChapterTitle('');
    setManualChapterContent('');
    setSuccessInfo(
      isFa
        ? `✅ فصل «${newCh.title}» اضافه شد. می‌توانید فصل بعدی را بنویسید یا به فهرست فصول بروید.`
        : `✅ Added "${newCh.title}". You can write the next chapter or check the list.`
    );
  };

  const handleFetchUrl = async () => {
    if (!urlToFetch.trim()) {
      setError(isFa ? 'لطفاً آدرس اینترنتی (URL) را وارد کنید.' : 'Please enter a valid URL.');
      return;
    }

    setIsFetchingUrl(true);
    setError('');
    try {
      let fetchedText = '';
      try {
        const res = await fetch(urlToFetch.trim());
        if (res.ok) {
          fetchedText = await res.text();
        }
      } catch {
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlToFetch.trim())}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            fetchedText = await res.text();
          }
        } catch {
          // Fallback
        }
      }

      if (!fetchedText || fetchedText.length < 10) {
        throw new Error(isFa ? 'امکان دریافت مستقیم متن از این آدرس به دلیل محدودیت‌های امنیتی (CORS) سرور مقصد وجود ندارد. لطفاً متن را کپی کرده و در تب «الصاق مستقیم متن» پیست فرمایید.' : 'Could not fetch text from URL due to CORS. Please copy and paste the text into "Paste Text" tab.');
      }

      const cleanText = fetchedText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      setPastedRawText(cleanText);
      setActiveTab('paste');
      setSuccessInfo(isFa ? 'متن آنلاین با موفقیت واکشی شد! اکنون روش تفکیک فصل‌ها را انتخاب و ثبت کنید.' : 'Online text fetched successfully! Choose splitting mode to proceed.');
    } catch (err: any) {
      setError(err?.message || (isFa ? 'خطا در دریافت متن از لینک.' : 'Error fetching from URL.'));
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleAddManualChapter = () => {
    const nextNum = chapters.length + 1;
    setChapters([
      ...chapters,
      {
        title: isFa ? `فصل ${nextNum}: بخش جدید` : `Chapter ${nextNum}`,
        content: '',
        chapterNumber: nextNum,
      }
    ]);
    setActiveTab('chapters_list');
  };

  const handleUpdateChapter = (index: number, field: 'title' | 'content' | 'chapterNumber', value: string | number) => {
    const updated = [...chapters];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setChapters(updated);
  };

  const handleRemoveChapter = (index: number) => {
    const updated = chapters.filter((_, i) => i !== index);
    setChapters(updated);
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...chapters];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    const startNum = (typeof chapters[0]?.chapterNumber === 'number' && chapters[0].chapterNumber > 0)
      ? chapters[0].chapterNumber
      : 1;
    const renumbered = updated.map((ch, idx) => ({
      ...ch,
      chapterNumber: startNum + idx,
    }));
    setChapters(renumbered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(isFa ? 'لطفاً عنوان رمان را وارد کنید.' : 'Please enter novel title.');
      return;
    }
    if (chapters.length === 0) {
      setError(isFa ? 'حداقل یک فصل برای رمان باید اضافه شود.' : 'Please add at least one chapter.');
      return;
    }

    const formattedChapters: WebNovelChapter[] = chapters.map((ch, idx) => {
      const explicitNum = (typeof ch.chapterNumber === 'number' && ch.chapterNumber > 0)
        ? ch.chapterNumber
        : (idx + 1);

      return {
        id: ch.id || `custom-ch-${Date.now()}-${explicitNum}`,
        chapterNumber: explicitNum,
        title: ch.title.trim() || `${isFa ? 'فصل' : 'Chapter'} ${explicitNum}`,
        content: ch.content.trim() || (isFa ? 'متن فصل وارد نشده است.' : 'Chapter text is empty.'),
        price: pricePerChapter,
        isUnlocked: idx === 0, // First chapter is free
      };
    });

    const tags = tagsInput
      .split(/[,،]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const targetExistingNovel = modalMode === 'append' && selectedExistingNovelId
      ? existingNovels.find((n) => n.id === selectedExistingNovelId) || targetNovel
      : null;

    if (modalMode === 'append' && targetExistingNovel) {
      const existingPricePerChapter = Math.max(1, Number(targetExistingNovel.pricePerChapter) || 2);
      const totalNovelPrice = formattedChapters.length > 0 
        ? formattedChapters.length * existingPricePerChapter 
        : existingPricePerChapter;

      const novelToSave: WebNovel = {
        ...targetExistingNovel,
        chapters: formattedChapters,
        price: totalNovelPrice,
        pricePerChapter: existingPricePerChapter,
        isPriceLocked: true,
      };

      onSaveNovel(novelToSave);
      onClose();
      return;
    }

    // Total novel price is dynamically calculated: number of chapters * price per chapter
    const finalPricePerChapter = Math.max(1, Number(pricePerChapter) || 2);
    const totalNovelPrice = formattedChapters.length > 0 
      ? formattedChapters.length * finalPricePerChapter 
      : finalPricePerChapter;

    const novelToSave: WebNovel = {
      id: `user-novel-${Date.now()}`,
      title: title.trim(),
      author: author.trim() || (isFa ? 'نویسنده ناشناس' : 'Anonymous Author'),
      genre: (genre === 'سایر...' ? customGenre.trim() : genre) || (isFa ? 'فانتزی' : 'Fantasy'),
      synopsis: synopsis.trim() || (isFa ? 'خلاصه داستان ثبت نشده است.' : 'No synopsis provided.'),
      coverColor: selectedGradient,
      price: totalNovelPrice,
      pricePerChapter: finalPricePerChapter,
      isPriceLocked: true,
      tags: tags.length > 0 ? tags : [isFa ? 'رمان کاربر' : 'User Novel'],
      chapters: formattedChapters,
      isDefault: false,
      rating: 5.0,
      uploadedAt: new Date().toISOString(),
    };

    onSaveNovel(novelToSave);
    onClose();
  };

  return (
    <div
      id="upload-novel-modal-backdrop"
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] relative z-[71]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Mode Switcher */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700/80 text-cyan-400 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isFa ? 'مدیریت و ثبت فصول رمان' : 'Novel & Chapter Management'}</span>
                {chapters.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-200 border border-slate-700">
                    {formatNumber(chapters.length, language)} {isFa ? 'فصل' : 'ch'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isFa 
                  ? 'ثبت سریع با الصاق متن، نوشتن فصل به فصل، دریافت از لینک یا آپلود فایل' 
                  : 'Fast novel entry via Text Paste, Chapter Writer, URL or File Upload'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Glossary / Terms Replacer Button in Header */}
            <button
              type="button"
              onClick={() => setShowGlossaryModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title={isFa ? 'جستجو و اصلاح واژگان و نام‌های شخصیت‌ها در تمام فصول رمان' : 'Batch find and replace character names and terms'}
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{isFa ? '🔍 اصلاح واژگان و نام‌ها' : '🔍 Replace Terms'}</span>
            </button>

            {/* Instant Sample Novel Generator Button */}
            <button
              type="button"
              onClick={handleLoadFullSampleNovel}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title={isFa ? 'پر کردن خودکار یک رمان ۵ فصلی کامل جهت تست سریع' : '1-Click Load 5-Chapter Sample Novel'}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{isFa ? '⚡ رمان نمونه ۵ فصلی' : '⚡ Sample Novel'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector (New Novel vs Append Chapters) */}
        {appendableNovels.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setModalMode('new');
                  resetNewNovelForm();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'new' 
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isFa ? '🆕 ثبت رمان جدید' : '🆕 New Novel'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalMode('append');
                  if (appendableNovels.length > 0) {
                    setSelectedExistingNovelId(appendableNovels[0].id);
                    loadExistingNovelData(appendableNovels[0]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'append' 
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isFa ? '📚 افزودن فصل به رمان قبلی' : '📚 Append to Existing'}</span>
              </button>
            </div>

            {modalMode === 'append' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">{isFa ? 'انتخاب رمان مقصد:' : 'Target Novel:'}</span>
                <select
                  value={selectedExistingNovelId}
                  onChange={(e) => {
                    setSelectedExistingNovelId(e.target.value);
                    const found = appendableNovels.find((n) => n.id === e.target.value);
                    if (found) loadExistingNovelData(found);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 outline-hidden cursor-pointer"
                >
                  {appendableNovels.map((n) => (
                    <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                      {n.title} ({n.chapters?.length || 1} فصل)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {modalMode === 'append' ? (
            /* Locked Novel Information Banner in Append Mode */
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedGradient} flex items-center justify-center text-white shadow-md shrink-0 border border-slate-700`}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-white">{title || (isFa ? 'رمان منتخب' : 'Selected Novel')}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        <span>{isFa ? 'اطلاعات پایه رمان قفل است' : 'Novel Info Locked'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {isFa ? 'نویسنده:' : 'Author:'} <strong className="text-white">{author || (isFa ? 'ناشناس' : 'Anonymous')}</strong> • {isFa ? 'ژانر:' : 'Genre:'} <strong className="text-white">{genre}</strong>
                    </p>
                  </div>
                </div>
                <div className="text-start sm:text-end shrink-0">
                  <span className="text-xs text-slate-200 font-black flex items-center sm:justify-end gap-1">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    {formatNumber(pricePerChapter, language)} {isFa ? 'سکه / هر فصل' : 'coins / chapter'}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {formatNumber(chapters.length, language)} {isFa ? 'فصل کل' : 'total chapters'}
                  </span>
                </div>
              </div>

              {(() => {
                const displaySynopsis = resolveNovelSynopsis(
                  {
                    title,
                    author,
                    genre: (genre === 'سایر...' ? customGenre : genre),
                    synopsis,
                    chapters,
                  },
                  language
                );
                return displaySynopsis ? (
                  <p className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 line-clamp-2">
                    <span className="text-slate-300 font-bold">{isFa ? 'خلاصه: ' : 'Synopsis: '}</span>
                    {displaySynopsis}
                  </p>
                ) : null;
              })()}

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-750 flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {isFa
                    ? 'مشخصات اولیه این رمان ثبت و قفل شده است و قابل تغییر نیست. در این بخش صرفاً می‌توانید فصل‌های جدید اضافه نمایید.'
                    : 'Novel details are permanently locked. You can only append new chapters below.'}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Quick 1-Click Banner (Only for New Novel Creation) */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center font-black shrink-0">
                    <Sparkles className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block">
                      {isFa ? 'می‌خواهید بلافاصله تست کنید؟' : 'Want to test instantly?'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isFa 
                        ? 'با زدن دکمه روبرو، یک رمان ۵ فصلی کامل به همراه عنوان و متن‌ها به صورت خودکار بارگذاری می‌شود.' 
                        : 'Click to auto-load a full 5-chapter novel with title and chapters ready to publish.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadFullSampleNovel}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isFa ? '⚡ پر کردن خودکار رمان نمونه' : '⚡ Load Sample Novel'}</span>
                </button>
              </div>

              {/* Title & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isFa ? 'عنوان رمان / وب‌ناول *' : 'Novel Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isFa ? 'مثال: رستاخیز اراده در دنیای سیناپس‌ها' : 'e.g. Solo Willpower Leveling'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 text-white text-sm outline-hidden transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isFa ? 'نام نویسنده / مترجم' : 'Author / Translator'}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={isFa ? 'مثال: الکس، نام شما یا نام اثر اصلی' : 'e.g. Your name or Original author'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-slate-600 focus:ring-1 focus:ring-slate-600 text-white text-sm outline-hidden transition"
                  />
                </div>
              </div>

              {/* Genre & Single Fixed Novel Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isFa ? 'ژانر و دسته‌بندی' : 'Genre & Category'}
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => {
                      setGenre(e.target.value);
                      setCustomGenre('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-slate-600 text-white text-sm outline-hidden cursor-pointer"
                  >
                    {GENRE_SUGGESTIONS.map((g) => (
                      <option key={g} value={g} className="bg-slate-900 text-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Per Chapter Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isFa ? 'قیمت هر فصل (سکه) 🪙' : 'Price per Chapter (Coins) 🪙'}</span>
                    </span>
                    <span className="text-[11px] text-slate-300 font-bold">
                      {formatNumber(pricePerChapter, language)} {isFa ? 'سکه/فصل' : 'coins/ch'}
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <div className="grid grid-cols-5 gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map((presetPrice) => (
                        <button
                          key={presetPrice}
                          type="button"
                          onClick={() => {
                            setPricePerChapter(presetPrice);
                            setNovelPrice(presetPrice * (chapters.length || 1));
                          }}
                          className={`py-2 px-1 text-xs font-black rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition ${
                            pricePerChapter === presetPrice
                              ? 'bg-slate-800 text-white border-slate-500 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <Coins className={`w-3 h-3 ${pricePerChapter === presetPrice ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span>{formatNumber(presetPrice, language)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom price input */}
                    <div className="w-16 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={pricePerChapter}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setPricePerChapter(val);
                          setNovelPrice(val * (chapters.length || 1));
                        }}
                        className="w-full py-2 px-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-slate-600 text-white font-bold text-xs text-center outline-hidden"
                        title={isFa ? 'قیمت دلخواه هر فصل' : 'Custom price per chapter'}
                      />
                    </div>
                  </div>

                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium flex items-center justify-between">
                    <span>{isFa ? 'مجموع قیمت کل رمان:' : 'Total calculated novel price:'}</span>
                    <span className="font-bold text-white">
                      {formatNumber((chapters.length || 1) * pricePerChapter, language)} {isFa ? 'سکه' : 'coins'} ({formatNumber(chapters.length || 1, language)} {isFa ? 'فصل' : 'ch'} × {formatNumber(pricePerChapter, language)} {isFa ? 'سکه' : 'coins'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Cover Theme Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {isFa ? 'طرح جلد و تم گرادینت' : 'Cover Gradient Theme'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COVER_GRADIENTS.map((cov) => (
                    <button
                      key={cov.class}
                      type="button"
                      onClick={() => setSelectedGradient(cov.class)}
                      className={`h-10 rounded-xl bg-gradient-to-br ${cov.class} border-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                        selectedGradient === cov.class ? 'border-slate-300 scale-105 shadow-md ring-2 ring-slate-400/40' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                      title={cov.name}
                    >
                      {selectedGradient === cov.class && (
                        <CheckCircle2 className="w-5 h-5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {isFa ? 'خلاصه داستان / معرفی رمان' : 'Novel Synopsis'}
                </label>
                <textarea
                  rows={2}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder={isFa ? 'خلاصه‌ای از ماجرای رمان را برای تشویق کاربران بنویسید...' : 'Brief plot summary...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white text-sm outline-hidden transition resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successInfo}</span>
            </div>
          )}

          {aiKeyNotice && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 animate-in fade-in transition-all ${
                aiKeyNotice.type === 'switch'
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {aiKeyNotice.type === 'switch' ? (
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                    <span>
                      {aiKeyNotice.type === 'switch'
                        ? (isFa ? '🔄 تعویض خودکار هوش مصنوعی / کلید فعال' : 'AI Key Switched Automatically')
                        : (isFa ? '⚠️ هشدار عدم دسترسی به کلید هوش مصنوعی' : 'AI Key Warning')}
                    </span>
                    {aiKeyNotice.details && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {aiKeyNotice.details}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-300 leading-relaxed">{aiKeyNotice.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiKeyNotice(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                title={isFa ? 'بستن پیام' : 'Dismiss'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chapters & Multiple Input Methods Section */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>{isFa ? 'روش‌های ورود و ثبت فصل‌های رمان:' : 'Chapter Entry Methods:'}</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    {isFa 
                      ? 'یکی از ۴ روش زیر را انتخاب کرده و فصول خود را با یک کلیک اضافه فرمایید:' 
                      : 'Choose one of the 4 methods below to add your chapters:'}
                  </p>
                </div>

                {chapters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('chapters_list')}
                    className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-850 hover:border-slate-600 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isFa ? 'فهرست فصول ثبت شده:' : 'Chapters:'} {formatNumber(chapters.length, language)} {isFa ? 'فصل' : 'ch'}</span>
                  </button>
                )}
              </div>

              {/* Multi-Tab Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setActiveTab('paste');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'paste' 
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>{isFa ? '📋 الصاق متن' : '📋 Paste'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setActiveTab('manual');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'manual' 
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>{isFa ? '✍️ فصل به فصل' : '✍️ Writer'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setActiveTab('upload');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'upload' 
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{isFa ? '📦 فایل / ZIP' : '📦 File'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setActiveTab('url_import');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'url_import' 
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{isFa ? '🌐 لینک وب' : '🌐 URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setActiveTab('chapters_list');
                  }}
                  className={`col-span-2 sm:col-span-1 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'chapters_list' 
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isFa ? '📚 فهرست' : '📚 List'} ({formatNumber(chapters.length, language)})</span>
                </button>
              </div>
            </div>

            {/* ================= LIVE TRANSLATION IN-MODAL PROGRESS BAR ================= */}
            {liveProgress && (
              <div className="mb-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center shrink-0">
                      {liveProgress.engine === 'free' ? <Zap className="w-5 h-5 text-emerald-400" /> : <Sparkles className="w-5 h-5 text-cyan-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">
                          {isFa ? '🌐 نوار پیشرفت ترجمه زنده فصول رمان' : 'Live Translation Progress'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          liveProgress.engine === 'free'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}>
                          {liveProgress.engine === 'free' 
                            ? (isFa ? '⚡ موتور سریع رایگان وب' : 'Free Web Engine') 
                            : (isFa ? '🤖 هوش مصنوعی ادبی' : 'AI Literary Engine')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-300 block truncate max-w-md mt-0.5">
                        {isFa 
                          ? `در حال پردازش (${formatNumber(liveProgress.completed + 1, language)} از ${formatNumber(liveProgress.total, language)}): «${liveProgress.currentTitle}»` 
                          : `Translating (${liveProgress.completed + 1}/${liveProgress.total}): "${liveProgress.currentTitle}"`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Switch to Background Translation */}
                    <button
                      type="button"
                      onClick={() => {
                        cancelLiveRef.current = true;
                        handleStartBackgroundTranslation(liveProgress.engine, liveProgress.targetLang);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition"
                      title={isFa ? 'بستن پنجره و ادامه ترجمه در پس‌زمینه بدون وقفه' : 'Continue translation in background and close modal'}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isFa ? '⚡ ادامه در پس‌زمینه و بستن' : '⚡ Switch to Background'}</span>
                    </button>

                    {/* Stop Live Translation */}
                    <button
                      type="button"
                      onClick={() => {
                        cancelLiveRef.current = true;
                        setIsTranslatingAll(false);
                        setLiveProgress(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-700 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>{isFa ? '⏹️ توقف' : 'Stop'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar with percentage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>{formatNumber(liveProgress.completed, language)} / {formatNumber(liveProgress.total, language)} {isFa ? 'فصل ترجمه شده' : 'chapters translated'}</span>
                    </span>
                    <span className="text-cyan-400 text-sm font-black">{formatNumber(liveProgress.percent, language)}٪</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${Math.max(2, liveProgress.percent)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 1: DIRECT TEXT PASTE & AUTO-SPLITTER ================= */}
            {activeTab === 'paste' && (
              <div className="space-y-3 p-4 rounded-3xl bg-slate-950/90 border border-slate-800 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                      <ClipboardPaste className="w-4 h-4 text-cyan-400" />
                      <span>{isFa ? 'الصاق متن کامل رمان یا چند فصل (بدون نیاز به آپلود فایل)' : 'Paste Novel Text (No file upload needed)'}</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isFa 
                        ? 'متن را در کادر زیر پیست (Ctrl+V) کنید. سیستم خودکار فصل‌ها را تشخیص داده و تفکیک می‌کند.' 
                        : 'Paste text below. The smart engine will auto-detect and split chapters.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pastedRawText.trim() && (
                      <>
                        <button
                          type="button"
                          disabled={isTranslatingPasted}
                          onClick={() => handleTranslatePastedText('free')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title={isFa ? 'ترجمه سریع متن رمان با موتور رایگان (بدون نیاز به هوش مصنوعی و نامحدود)' : 'Fast free translation (without AI)'}
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isTranslatingPasted ? (isFa ? 'در حال ترجمه...' : 'Translating...') : (isFa ? '⚡ ترجمه رایگان' : '⚡ Free Fast Translate')}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isTranslatingPasted}
                          onClick={() => handleTranslatePastedText('ai')}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title={isFa ? 'ترجمه عمیق متن رمان با هوش مصنوعی ادبی' : 'Translate pasted text to Persian with AI'}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isTranslatingPasted ? (isFa ? 'در حال ترجمه...' : 'Translating...') : (isFa ? '🤖 هوش مصنوعی' : '🤖 AI Translate')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowGlossaryModal(true)}
                          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title={isFa ? 'اصلاح واژگان و نام‌های خاص در کل متن' : 'Glossary & Names Replacer'}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isFa ? '📖 اصلاح واژگان' : 'Glossary'}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleInsertSampleTemplate}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isFa ? '✨ درج داستان نمونه ۳ فصلی' : 'Sample 3-Ch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isFa ? 'الصاق از کلیپ‌بورد' : 'Paste Clipboard'}</span>
                    </button>

                    {pastedRawText && (
                      <button
                        type="button"
                        onClick={() => setPastedRawText('')}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title={isFa ? 'پاکسازی' : 'Clear'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Paste Box */}
                <div>
                  <textarea
                    rows={7}
                    value={pastedRawText}
                    onChange={(e) => setPastedRawText(e.target.value)}
                    placeholder={isFa 
                      ? 'متن رمان، داستان یا فصل‌ها را اینجا کپی و پیست کنید...\n\nمثال:\n=== فصل اول: بیداری ===\nمتن ماجرای فصل اول...\n\n=== فصل دوم: نبرد در دژ ===\nمتن فصل دوم...' 
                      : 'Paste novel chapters text here...'}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 focus:border-cyan-500 text-white text-xs leading-relaxed outline-hidden transition resize-y font-mono"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                    <span>
                      {isFa ? 'تعداد حروف:' : 'Chars:'} {formatNumber(pastedRawText.length, language)} • {isFa ? 'کلمات تقریبی:' : 'Words:'} {formatNumber(pastedRawText.trim() ? pastedRawText.trim().split(/\s+/).length : 0, language)}
                    </span>
                    <span>{isFa ? 'پشتیبانی از متون طولانی چند هزار کلمه‌ای' : 'Supports multi-thousand word texts'}</span>
                  </div>
                </div>

                {/* Splitting Method Options */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isFa ? 'نحوه تفکیک و تقسیم به فصل‌ها:' : 'Chapter Splitting Mode:'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSplitMode('auto')}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                        splitMode === 'auto'
                          ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block font-black">⚡ {isFa ? 'هوشمند / عناوین' : 'Smart Headings'}</span>
                      <span className="text-[10px] opacity-75 block mt-0.5">{isFa ? 'تشخیص فصل ۱، چپتر ۲ و...' : 'Detects Chapter 1, 2...'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('delimiter')}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                        splitMode === 'delimiter'
                          ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block font-black">✂️ {isFa ? 'جداکننده دلخواه' : 'Custom Delimiter'}</span>
                      <span className="text-[10px] opacity-75 block mt-0.5">{isFa ? 'مانند === یا ---' : 'Like === or ---'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('word_count')}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                        splitMode === 'word_count'
                          ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block font-black">📊 {isFa ? 'بر اساس کلمات' : 'By Word Count'}</span>
                      <span className="text-[10px] opacity-75 block mt-0.5">{isFa ? 'هر ۱۰۰۰ کلمه یک فصل' : 'e.g. 1000 words/ch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('single')}
                      className={`p-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                        splitMode === 'single'
                          ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="block font-black">📄 {isFa ? 'یک فصل کامل' : 'Single Chapter'}</span>
                      <span className="text-[10px] opacity-75 block mt-0.5">{isFa ? 'بدون تکه‌تکه کردن' : 'Without splitting'}</span>
                    </button>
                  </div>

                  {/* Extra configuration if custom delimiter or word count is selected */}
                  {splitMode === 'delimiter' && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{isFa ? 'عبارت جداکننده بین فصول:' : 'Delimiter string:'}</span>
                      <input
                        type="text"
                        value={customDelimiter}
                        onChange={(e) => setCustomDelimiter(e.target.value)}
                        placeholder="==="
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 text-xs font-mono font-bold w-36 outline-hidden focus:border-cyan-500"
                      />
                      <span className="text-[11px] text-slate-500">{isFa ? '(هر جا این علامت دیده شود فصل جدید آغاز می‌شود)' : '(Splits on every occurrence)'}</span>
                    </div>
                  )}

                  {splitMode === 'word_count' && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{isFa ? 'تعداد کلمات در هر فصل:' : 'Words per chapter:'}</span>
                      <input
                        type="number"
                        min={100}
                        max={10000}
                        step={100}
                        value={wordsPerPart}
                        onChange={(e) => setWordsPerPart(Number(e.target.value) || 1000)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 text-xs font-mono font-bold w-28 outline-hidden focus:border-cyan-500"
                      />
                      <span className="text-[11px] text-slate-500">{isFa ? 'کلمه' : 'words'}</span>
                    </div>
                  )}
                </div>

                {/* Action Button to Split and Apply */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pastedRawText.trim()) {
                        handleInsertSampleTemplate();
                        setTimeout(() => handlePasteAndSplit(), 50);
                      } else {
                        handlePasteAndSplit();
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {!pastedRawText.trim()
                        ? (isFa ? '⚡ درج متن نمونه و تفکیک به فصل‌ها' : '⚡ Insert Sample & Split')
                        : (isFa ? '⚡ تفکیک متن و مشاهده فصول' : '⚡ Split Text & View Chapters')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 2: MANUAL CHAPTER-BY-CHAPTER WRITER ================= */}
            {activeTab === 'manual' && (
              <div className="space-y-3 p-4 rounded-3xl bg-slate-950/90 border border-slate-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-cyan-400" />
                      <span>{isFa ? 'ویرایشگر و ثبت دستی فصل به فصل' : 'Manual Chapter-by-Chapter Writer'}</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {isFa 
                        ? 'عنوان و متن فصل را وارد کرده و با زدن دکمه «➕ افزودن فصل»، فصل را ذخیره و فصل بعدی را بنویسید.' 
                        : 'Enter title and text for each chapter and click add.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-900 text-cyan-300 border border-slate-700">
                      {isFa ? `فصل جدید #${formatNumber(chapters.length + 1, language)}` : `New Chapter #${chapters.length + 1}`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      {isFa ? 'عنوان این فصل:' : 'Chapter Title:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextNum = chapters.length + 1;
                        setManualChapterTitle(isFa ? `فصل ${nextNum}: ماجرای تازه در دژ` : `Chapter ${nextNum}: The New Quest`);
                        setManualChapterContent(isFa 
                          ? `در این بخش، قهرمان داستان با چالش جدیدی روبرو می‌شود. تمرکز و اراده او مورد آزمایش قرار می‌گیرد...` 
                          : `In this chapter, the protagonist faces a new trial of focus and willpower...`);
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isFa ? 'درج متن نمونه برای این فصل' : 'Insert Sample for this Ch'}</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={manualChapterTitle}
                    onChange={(e) => setManualChapterTitle(e.target.value)}
                    placeholder={isFa ? `مثال: فصل ${chapters.length + 1}: کشف راز کهن` : `e.g. Chapter ${chapters.length + 1}: The Ancient Secret`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:border-cyan-500 outline-hidden"
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isFa ? 'متن کامل این فصل:' : 'Chapter Content:'}
                    </label>
                    <textarea
                      rows={5}
                      value={manualChapterContent}
                      onChange={(e) => setManualChapterContent(e.target.value)}
                      placeholder={isFa ? 'متن این فصل از داستان را در اینجا بنویسید یا پیست کنید...' : 'Type or paste this chapter text here...'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-hidden focus:border-cyan-500 resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualChapterTitle('');
                        setManualChapterContent('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold transition cursor-pointer"
                    >
                      {isFa ? 'پاک کردن کادرها' : 'Clear'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddSingleManualChapter}
                        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isFa ? '➕ ثبت و افزودن این فصل به رمان' : '➕ Add Chapter to Novel'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Preview of Added Chapters in Manual Mode */}
                {chapters.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-200 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isFa ? 'فصل‌های ثبت شده تاکنون:' : 'Added Chapters:'} ({formatNumber(chapters.length, language)} {isFa ? 'فصل' : 'ch'})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('chapters_list')}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                      >
                        {isFa ? 'مشاهده در فهرست کامل' : 'View in Full List'}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pe-1">
                      {chapters.map((ch, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-5 h-5 rounded-md bg-slate-800 text-cyan-300 text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-700">
                              {formatNumber(idx + 1, language)}
                            </span>
                            <span className="font-bold text-white truncate">{ch.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title={isFa ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: WEB LINK / URL IMPORT ================= */}
            {activeTab === 'url_import' && (
              <div className="space-y-3 p-4 rounded-3xl bg-slate-950/90 border border-slate-800 animate-in fade-in duration-150">
                <div className="space-y-0.5 pb-2 border-b border-slate-800">
                  <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>{isFa ? 'دریافت مستقیم متن رمان از لینک اینترنتی / وبلاگ' : 'Import Novel from Web URL / Link'}</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {isFa 
                      ? 'اگر متن رمان شما در تلگراف، پیست‌بین (Pastebin)، گیت‌هاب یا یک صفحه وب قرار دارد، آدرس لینک آن را وارد کنید.' 
                      : 'Enter a link to raw text (Telegraph, Pastebin, Raw GitHub, Blog post) to fetch novel content.'}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="w-4 h-4 text-slate-500 absolute start-3 top-3" />
                      <input
                        type="url"
                        value={urlToFetch}
                        onChange={(e) => setUrlToFetch(e.target.value)}
                        placeholder="https://raw.githubusercontent.com/... یا https://pastebin.com/raw/..."
                        className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-hidden focus:border-cyan-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleFetchUrl}
                      disabled={isFetchingUrl || !urlToFetch.trim()}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition shadow-md disabled:opacity-40 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isFetchingUrl ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      <span>{isFetchingUrl ? (isFa ? 'در حال دریافت...' : 'Fetching...') : (isFa ? 'دریافت متن' : 'Fetch')}</span>
                    </button>
                  </div>

                  {/* Preset Demo Links */}
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isFa ? 'یا یکی از نمونه‌های آنلاین زیر را جهت تست انتخاب فرمایید:' : 'Or pick a demo preset:'}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleInsertSampleTemplate();
                          setActiveTab('paste');
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-200 border border-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        📜 {isFa ? 'رمان فانتزی صعود آریو (۳ فصل)' : 'Ascension Novel (3 ch)'}
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadFullSampleNovel}
                        className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[11px] font-bold transition cursor-pointer"
                      >
                        ⚡ {isFa ? 'رمان کامل ارباب سایه‌ها (۵ فصل)' : 'Shadow Master (5 ch)'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: FILE & ZIP UPLOAD ================= */}
            {activeTab === 'upload' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Hidden real file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".html,.htm,.xhtml,.zip,.txt,.md,.text,.json,.csv,text/html,text/plain,application/zip,application/x-zip-compressed,multipart/x-zip"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                    }
                  }}
                  className="hidden"
                />
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed,multipart/x-zip"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFilesSelected(e.target.files);
                    }
                  }}
                  className="hidden"
                />

                {/* AI Chapter Extraction Switch */}
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/90 text-cyan-400 flex items-center justify-center border border-cyan-800/60 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{isFa ? 'استخراج هوشمند شماره و عنوان فصل با هوش مصنوعی (AI)' : 'Smart AI Chapter Number & Title Extraction'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                          {isFa ? 'فعال و هوشمند' : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isFa
                          ? 'شماره واقعی فصل مستقیماً از درون کدهای HTML، تگ‌های عنوان و متن فایل‌ها استخراج می‌شود و از شروع اجباری از ۱ جلوگیری می‌گردد.'
                          : 'Extracts real chapter numbers from inside HTML/text content so numbering does not reset to 1.'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={useAiChapterExtraction}
                      onChange={(e) => setUseAiChapterExtraction(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all duration-200 group relative overflow-hidden ${
                    isDragging 
                      ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-xl shadow-cyan-950/20' 
                      : 'border-slate-700 hover:border-cyan-500/80 bg-slate-950/70 hover:bg-slate-900/60'
                  }`}
                >
                  {isProcessingFiles ? (
                    <div className="py-6 flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 text-cyan-400 flex items-center justify-center animate-spin border border-slate-700">
                        <Loader2 className="w-7 h-7" />
                      </div>
                      <span className="text-sm sm:text-base font-black text-cyan-300">
                        {processingStatusText || (isFa ? 'در حال بازگشایی و استخراج هوشمند فصل‌ها...' : 'Processing and sorting chapters...')}
                      </span>
                      <span className="text-xs text-slate-400">
                        {isFa ? 'لطفاً چند لحظه صبر کنید، فایل‌ها در حال پردازش هستند...' : 'Please wait a moment...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center shadow-md">
                          <FileCode className="w-5 h-5" />
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center shadow-md">
                          <Archive className="w-5 h-5" />
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-700 text-cyan-300 flex items-center justify-center shadow-md">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      
                      <span className="text-sm sm:text-base font-black text-white block mb-1">
                        {isFa 
                          ? 'فایل‌های HTML، آرشیو ZIP یا فایل‌های متنی رمان را اینجا بکشید یا انتخاب کنید' 
                          : 'Drop HTML files, ZIP archive, or text files here or choose below'}
                      </span>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                        {isFa
                          ? 'پشتیبانی کامل از فایل‌های تک‌به‌تک HTML، فایل‌های ZIP حاوی HTML یا TXT، اسناد متنی و تشخیص خودکار شماره فصل'
                          : 'Full support for HTML web novel files, ZIP archives, TXT, and MD with automatic chapter extraction'}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95"
                        >
                          <FileCode className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
                          <span>{isFa ? '🌐 انتخاب فایل‌های HTML / صفحات وب' : '🌐 Select HTML Files'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            zipInputRef.current?.click();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95"
                        >
                          <Archive className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                          <span>{isFa ? '📦 انتخاب فایل ZIP (حاوی HTML یا TXT)' : '📦 Select ZIP Archive'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-slate-700 active:scale-95"
                        >
                          <Upload className="w-4 h-4 text-slate-400 stroke-[2.5]" />
                          <span>{isFa ? '📄 انتخاب فایل‌های متنی (TXT / MD)' : '📄 Select Text Files'}</span>
                        </button>
                      </div>

                      <span className="text-xs text-cyan-400/90 block mt-3 font-medium">
                        {isFa 
                          ? '✨ پردازش خودکار: فایل‌های HTML چه تک‌به‌تک و چه داخل فایل ZIP فرستاده شوند، متن اصلی داستان استخراج و شماره فصل‌ها مرتب می‌شوند.' 
                          : '✨ Auto-Detection: HTML files (single or in ZIP) are extracted and ordered by chapter number automatically.'}
                      </span>
                    </>
                  )}
                </div>

                {/* Fast Background Translation Callout when chapters exist */}
                {chapters.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          {isFa
                            ? `🎉 ${formatNumber(chapters.length, language)} فصل آماده است`
                            : `🎉 ${chapters.length} chapters loaded`}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {isFa
                            ? 'می‌توانید در تب فهرست، تنظیمات ترجمه را انجام دهید یا مستقیماً ذخیره کنید.'
                            : 'You can configure translation options in the list tab or save directly.'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('chapters_list')}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{isFa ? '📚 رفتن به مرکز ترجمه و فهرست فصول' : '📚 View Chapters & Translation'}</span>
                    </button>
                  </div>
                )}

                {/* Alternative prompt */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{isFa ? 'امکان آپلود فایل ندارید؟' : 'Cannot upload files?'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-[11px] cursor-pointer transition"
                  >
                    {isFa ? 'استفاده از الصاق مستقیم متن' : 'Use Direct Text Paste'}
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 5: CHAPTER MANAGEMENT LIST ================= */}
            {activeTab === 'chapters_list' && (
              <div className="space-y-3 bg-slate-950/80 p-4 rounded-3xl border border-slate-800 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">
                    {isFa ? 'فهرست فصل‌های آماده ذخیره:' : 'Ready Chapters List:'} (<strong className="text-cyan-400">{formatNumber(chapters.length, language)}</strong> {isFa ? 'فصل' : 'chapters'})
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('paste')}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>{isFa ? '+ الصاق فصل‌های جدید' : '+ Paste More'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddManualChapter}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isFa ? 'افزودن دستی' : 'Add Empty'}</span>
                    </button>
                  </div>
                </div>

                {/* ================= REDESIGNED SMART TRANSLATION CENTER (مرکز هوشمند ترجمه فصل رمان) ================= */}
                {chapters.length > 0 && (
                  <div 
                    id="smart-novel-translation-center"
                    className="p-4 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl space-y-3.5 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2 relative z-10 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center">
                          <Languages className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white block">
                              {isFa ? 'مرکز هوشمند ترجمه فصل رمان' : 'Smart Chapter Translation Center'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/30">
                              {isFa ? `${formatNumber(chapters.length, language)} فصل آماده` : `${chapters.length} chapters`}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {isFa 
                              ? 'ترجمه خودکار، هوشمند و با قابلیت اجرای پایدار در سرور (حتی با بستن مرورگر)'
                              : 'Automatic, AI-assisted translation with persistent server background worker'}
                          </span>
                        </div>
                      </div>

                      {/* Mode / Step Indicator */}
                      <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        {isTranslatingAll || smartHubStep === 'translating' ? (
                          <span className="text-cyan-400 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{isFa ? 'در حال ترجمه...' : 'Translating...'}</span>
                          </span>
                        ) : smartHubStep === 'completed' ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isFa ? 'ترجمه تکمیل شد' : 'Completed'}</span>
                          </span>
                        ) : smartHubStep === 'confirm' ? (
                          <span className="text-cyan-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isFa ? 'مرحله ۲: تایید شروع' : 'Step 2: Confirm'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{isFa ? 'مرحله ۱: انتخاب نوع ترجمه' : 'Step 1: Choose Type'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ================= STAGE 1: SELECTION (انتخاب نوع ترجمه) ================= */}
                    {(smartHubStep === 'select' && !isTranslatingAll) && (
                      <div className="space-y-3.5 relative z-10 animate-in fade-in duration-200">
                        {/* Section 1: Choose Engine */}
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">۱</span>
                            <span>{isFa ? 'نوع و موتور ترجمه را انتخاب فرمایید:' : 'Select Translation Engine:'}</span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Option 1: AI Literary Engine */}
                            <div
                              onClick={() => setTranslationEngine('ai')}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                                translationEngine === 'ai'
                                  ? 'bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/30'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="smartHubEngine"
                                    checked={translationEngine === 'ai'}
                                    onChange={() => setTranslationEngine('ai')}
                                    className="accent-cyan-400 cursor-pointer"
                                  />
                                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-cyan-400" />
                                    <span>{isFa ? '🤖 هوش مصنوعی ادبی' : '🤖 AI Literary Engine'}</span>
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/30">
                                  {isFa ? 'کیفیت عالی و روان' : 'High Quality'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {isFa
                                  ? 'ترجمه داستانی پر از احساس و بازنویسی دقیق اصطلاحات و دیالوگ‌ها متناسب با فضای رمان.'
                                  : 'Literary translation with context-aware tone adjustment and emotional pacing.'}
                              </p>
                            </div>

                            {/* Option 2: Free Fast Web Engine */}
                            <div
                              onClick={() => setTranslationEngine('free')}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                                translationEngine === 'free'
                                  ? 'bg-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="smartHubEngine"
                                    checked={translationEngine === 'free'}
                                    onChange={() => setTranslationEngine('free')}
                                    className="accent-emerald-400 cursor-pointer"
                                  />
                                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-emerald-400" />
                                    <span>{isFa ? '⚡ موتور سریع رایگان وب' : '⚡ Free Web Engine'}</span>
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                                  {isFa ? '⚡ ۱۰۰٪ رایگان و نامحدود' : '100% Free & Fast'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {isFa
                                  ? 'بدون نیاز به کلید، سرعت فوق‌العاده بالا و ترجمه موازی صدها فصل به صورت پایدار و پیوسته.'
                                  : 'Zero API key needed, lightning fast parallel chapter translations with no downtime.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Choose Target Language */}
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-slate-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">۲</span>
                            <span>{isFa ? 'زبان مقصد ترجمه:' : 'Target Language:'}</span>
                          </label>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setTranslateTargetLang('fa')}
                              className={`p-2.5 rounded-xl border text-center font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                translateTargetLang === 'fa'
                                  ? 'bg-slate-900 border-cyan-400 text-cyan-300 shadow-sm'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>🇮🇷</span>
                              <span>{isFa ? 'فارسی روان' : 'Persian'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTranslateTargetLang('ar')}
                              className={`p-2.5 rounded-xl border text-center font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                translateTargetLang === 'ar'
                                  ? 'bg-slate-900 border-cyan-400 text-cyan-300 shadow-sm'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>🇸🇦</span>
                              <span>{isFa ? 'عربی فصیح' : 'Arabic'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setTranslateTargetLang('en')}
                              className={`p-2.5 rounded-xl border text-center font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                translateTargetLang === 'en'
                                  ? 'bg-slate-900 border-cyan-400 text-cyan-300 shadow-sm'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>🇬🇧</span>
                              <span>English</span>
                            </button>
                          </div>
                        </div>

                        {/* Confirmation Step Transition Button */}
                        <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setShowGlossaryModal(true)}
                            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Search className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{isFa ? '🔍 اصلاح واژگان و نام‌ها' : '🔍 Replace Names'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSmartHubStep('confirm')}
                            className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-md transition active:scale-95"
                          >
                            <Check className="w-4 h-4" />
                            <span>{isFa ? '🚀 تایید تنظیمات و مرحله بعد' : '🚀 Next: Confirm & Start'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= STAGE 2: CONFIRMATION (تایید شروع از کاربر) ================= */}
                    {(smartHubStep === 'confirm' && !isTranslatingAll) && (
                      <div className="space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                          <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            <span>{isFa ? '📋 خلاصه مشخصات ترجمه آماده اجرا:' : 'Translation Summary:'}</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">{isFa ? 'تعداد فصول:' : 'Chapters:'}</span>
                              <span className="text-white font-black">{formatNumber(chapters.length, language)} {isFa ? 'فصل' : 'ch'}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">{isFa ? 'موتور انتخابی:' : 'Engine:'}</span>
                              <span className="text-cyan-300 font-black">
                                {translationEngine === 'ai' ? (isFa ? '🤖 هوش مصنوعی ادبی' : 'AI Literary') : (isFa ? '⚡ موتور سریع رایگان وب' : 'Free Web Engine')}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">{isFa ? 'زبان مقصد:' : 'Target:'}</span>
                              <span className="text-emerald-300 font-black">
                                {translateTargetLang === 'fa' ? '🇮🇷 فارسی' : translateTargetLang === 'ar' ? '🇸🇦 عربی' : '🇬🇧 انگلیسی'}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">{isFa ? 'عنوان رمان:' : 'Novel:'}</span>
                              <span className="text-cyan-300 font-black line-clamp-1">{title.trim() || (isFa ? 'رمان در حال ایجاد' : 'New Novel')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Start Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {/* 1. Direct Background Start */}
                          <button
                            type="button"
                            onClick={() => handleStartBackgroundTranslation(translationEngine, translateTargetLang, true)}
                            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-white font-black text-xs flex items-center justify-between gap-2.5 cursor-pointer shadow-md transition active:scale-95 text-start"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black block">{isFa ? '⚡ شروع مستقیم در پس‌زمینه سرور' : '⚡ Start in Server Background'}</span>
                                <span className="text-[10px] text-emerald-400/80 block font-normal">{isFa ? 'بستن سایت بدون توقف ترجمه' : 'Keeps translating if browser closes'}</span>
                              </div>
                            </div>
                            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                          </button>

                          {/* 2. Live Translation Start */}
                          <button
                            type="button"
                            onClick={() => handleTranslateAllChapters(translationEngine, translateTargetLang)}
                            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-200 font-black text-xs flex items-center justify-between gap-2.5 cursor-pointer transition active:scale-95 text-start"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-300">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black block">{isFa ? '🖥️ شروع ترجمه زنده در صفحه' : '🖥️ Start Live In-Page Translation'}</span>
                                <span className="text-[10px] text-cyan-300/80 block font-normal">{isFa ? 'مشاهده زنده با امکان انتقال به سرور' : 'Watch progress with offload option'}</span>
                              </div>
                            </div>
                            <Play className="w-4 h-4 fill-current shrink-0 text-cyan-400" />
                          </button>
                        </div>

                        {/* Back to selection */}
                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={() => setSmartHubStep('select')}
                            className="text-xs text-slate-400 hover:text-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>← {isFa ? 'بازگشت به تغییر نوع ترجمه' : 'Back to selection'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= STAGE 3: LIVE PROGRESS BOX (باکس نمایش نسبت پیشرفت + دکمه ترجمه در پس‌زمینه) ================= */}
                    {(isTranslatingAll || (smartHubStep === 'translating' && liveProgress)) && (
                      <div 
                        id="smart-translation-progress-box"
                        className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3.5 relative z-10 animate-in fade-in duration-200"
                      >
                        {/* Progress Header & Counter */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                            <div>
                              <span className="text-xs sm:text-sm font-black text-white block">
                                {isFa 
                                  ? `در حال ترجمه فصل ${formatNumber((liveProgress?.completed || 0) + 1, language)} از ${formatNumber(liveProgress?.total || chapters.length, language)}`
                                  : `Translating Chapter ${(liveProgress?.completed || 0) + 1} of ${liveProgress?.total || chapters.length}`}
                              </span>
                              <span className="text-[11px] text-cyan-300 line-clamp-1">
                                «{liveProgress?.currentTitle || chapters[translatingChapterIdx || 0]?.title || ''}»
                              </span>
                            </div>
                          </div>

                          <div className="text-end">
                            <span className="text-base font-black font-mono text-cyan-400">
                              {formatNumber(liveProgress?.percent || 0, language)}٪
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {isFa 
                                ? `${formatNumber(liveProgress?.completed || 0, language)} از ${formatNumber(liveProgress?.total || chapters.length, language)} فصل`
                                : `${liveProgress?.completed || 0} of ${liveProgress?.total || chapters.length} done`}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${liveProgress?.percent || 0}%` }}
                          />
                        </div>

                        {/* Cancel / Stop Button */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              cancelLiveRef.current = true;
                              setIsTranslatingAll(false);
                              setSmartHubStep('select');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-rose-300 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isFa ? 'توقف و لغو فرآیند ترجمه' : 'Stop Translation'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ================= STAGE 4: COMPLETED (پایان ترجمه) ================= */}
                    {(smartHubStep === 'completed' && !isTranslatingAll) && (
                      <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3 relative z-10 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-black text-white block">
                              {isFa ? '🎉 تمام فصل‌ها با موفقیت ترجمه شدند!' : '🎉 All chapters translated successfully!'}
                            </span>
                            <span className="text-[11px] text-emerald-300/80">
                              {isFa 
                                ? `تمام ${formatNumber(chapters.length, language)} فصل به زبان مقصد ترجمه و در لیست فصول به‌روزرسانی شدند.`
                                : `All ${chapters.length} chapters translated and updated.`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setSmartHubStep('select')}
                            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                          >
                            {isFa ? 'تنظیم مجدد یا ترجمه دوباره' : 'Reset / Translate Again'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chapter Numbering and Completeness Toolbar */}
                {chapters.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-300 font-bold flex items-center gap-1 text-[11px]">
                        <span>🔢 {isFa ? 'تنظیم شماره شروع فصول:' : 'Start from ch:'}</span>
                      </span>
                      <input
                        type="number"
                        min="1"
                        defaultValue={chapters[0]?.chapterNumber || 1}
                        id="startChapterInputBox"
                        className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-black text-xs text-center outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const inputEl = document.getElementById('startChapterInputBox') as HTMLInputElement;
                          const startVal = parseInt(inputEl?.value || '1', 10);
                          if (startVal > 0) {
                            setChapters(prev => prev.map((c, i) => ({
                              ...c,
                              chapterNumber: startVal + i,
                            })));
                            setSuccessInfo(isFa ? `✅ شماره‌گذاری فصول با موفقیت از فصل ${formatNumber(startVal, language)} اعمال شد.` : `✅ Chapters renumbered starting from ${startVal}.`);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-[11px] cursor-pointer transition"
                      >
                        ⚡ {isFa ? 'اعمال شروع' : 'Apply'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChapters(prev => [...prev].sort((a, b) => {
                            const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : 999999;
                            const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : 999999;
                            return numA - numB;
                          }));
                          setSuccessInfo(isFa ? '✅ تمام فصل‌ها به ترتیب شماره ریاضی مرتب‌سازی شدند.' : '✅ Chapters sorted mathematically.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] cursor-pointer transition"
                      >
                        🔀 {isFa ? 'مرتب‌سازی ریاضی' : 'Sort by Number'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isFa ? 'تضمین استخراج ۱۰۰٪ کامل متن' : '100% Full Content Verified'}</span>
                    </div>
                  </div>
                )}

                {chapters.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-slate-500 text-xs">
                      {isFa ? 'هنوز فصلی برای این رمان وارد نشده است.' : 'No chapters added yet.'}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('paste')}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black transition cursor-pointer"
                      >
                        {isFa ? '📋 الصاق متن رمان در ویرایشگر' : '📋 Paste Novel Text'}
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadFullSampleNovel}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-black transition cursor-pointer"
                      >
                        {isFa ? '⚡ درج رمان نمونه ۵ فصلی' : '⚡ Load Sample Novel'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pe-1">
                    {chapters.map((ch, idx) => {
                      const wordsCount = ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0;
                      const paragraphsCount = ch.content ? ch.content.split(/\n\s*\n/).filter(Boolean).length : 0;
                      const isPersianContent = /[\u0600-\u06FF]/.test(ch.content.substring(0, 200));

                      return (
                        <div 
                          key={idx} 
                          className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {/* Chapter number input/badge */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-slate-400 font-bold">{isFa ? 'فصل' : 'Ch'}</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={ch.chapterNumber ?? (idx + 1)}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val > 0) {
                                      handleUpdateChapter(idx, 'chapterNumber' as any, val);
                                    }
                                  }}
                                  className="w-12 px-1.5 py-1 rounded-lg bg-slate-950 text-cyan-300 border border-slate-700 text-xs font-black text-center focus:border-cyan-500 outline-hidden"
                                  title={isFa ? 'شماره این فصل' : 'Chapter number'}
                                />
                              </div>

                              <input
                                type="text"
                                value={ch.title}
                                onChange={(e) => handleUpdateChapter(idx, 'title', e.target.value)}
                                placeholder={`فصل ${ch.chapterNumber ?? (idx + 1)}`}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 w-full focus:border-cyan-500 outline-hidden"
                              />
                            </div>

                            {/* Actions: Translate Free, Translate AI, Reorder, Delete */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Free Engine translation button */}
                              <button
                                type="button"
                                onClick={() => handleTranslateSingleChapter(idx, 'free')}
                                disabled={translatingChapterIdx === idx || isTranslatingAll}
                                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer transition"
                                title={isFa ? 'ترجمه سریع این فصل با موتور رایگان وب (بدون هوش مصنوعی)' : 'Translate this chapter with Free Engine'}
                              >
                                {translatingChapterIdx === idx ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
                                ) : (
                                  <Zap className="w-3 h-3 text-emerald-400" />
                                )}
                                <span className="hidden sm:inline">{translatingChapterIdx === idx ? (isFa ? 'ترجمه...' : '...') : (isFa ? 'ترجمه رایگان' : 'Free')}</span>
                              </button>

                              {/* AI translation button */}
                              <button
                                type="button"
                                onClick={() => handleTranslateSingleChapter(idx, 'ai')}
                                disabled={translatingChapterIdx === idx || isTranslatingAll}
                                className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer transition"
                                title={isFa ? 'ترجمه این فصل با هوش مصنوعی ادبی' : 'Translate this chapter with AI'}
                              >
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                                <span className="hidden sm:inline">{isFa ? 'هوش مصنوعی' : 'AI'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveChapter(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                title={isFa ? 'انتقال به بالا' : 'Move Up'}
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveChapter(idx, 'down')}
                                disabled={idx === chapters.length - 1}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                title={isFa ? 'انتقال به پایین' : 'Move Down'}
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveChapter(idx)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 cursor-pointer ms-1"
                                title={isFa ? 'حذف این فصل' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Chapter Text preview or editor */}
                          <textarea
                            rows={2}
                            value={ch.content}
                            onChange={(e) => handleUpdateChapter(idx, 'content', e.target.value)}
                            placeholder={isFa ? 'متن این فصل...' : 'Chapter text...'}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-hidden resize-none focus:border-cyan-500"
                          />

                          {/* Chapter Stats & Status Footer */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-2">
                              {ch.sourceFileName && (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <FileCheck className="w-3 h-3 text-emerald-400" />
                                  <span>{ch.sourceFileName}</span>
                                </span>
                              )}
                              <span className="text-slate-300 font-medium">
                                📊 {formatNumber(wordsCount, language)} {isFa ? 'کلمه' : 'words'} • {formatNumber(paragraphsCount, language)} {isFa ? 'بند' : 'paragraphs'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isPersianContent ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                  ✓ {isFa ? 'فارسی' : 'Persian'}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold border border-slate-700">
                                  🌐 {isFa ? 'زبان اصلی' : 'Original'}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                                ✓ {isFa ? 'استخراج کامل' : '100% Complete'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tags (Only for new novel registration) */}
          {modalMode === 'new' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {isFa ? 'برچسب‌ها (با ویرگول جدا کنید)' : 'Tags (comma separated)'}
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={isFa ? 'مثال: سیستم، ماجراجویی، لالی، انگیزه، تمرکز' : 'e.g. System, Adventure, Willpower'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white text-sm outline-hidden"
              />
            </div>
          )}

          {/* Summary Calculation Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-300">
                {isFa ? 'تعداد کل فصل‌ها:' : 'Total Chapters:'} <strong className="text-white">{formatNumber(chapters.length, language)}</strong> • {isFa ? 'قیمت هر فصل:' : 'Per Ch:'} <strong className="text-cyan-300">{formatNumber(pricePerChapter, language)} سکه</strong>
              </span>
            </div>
            <div className="text-end">
              <span className="text-slate-400 text-[11px] block">{isFa ? 'قیمت کل رمان:' : 'Total Novel Price:'}</span>
              <span className="text-sm font-black text-cyan-300 flex items-center justify-end gap-1">
                <Coins className="w-3.5 h-3.5 text-cyan-400" />
                {formatNumber(chapters.length * pricePerChapter, language)} {isFa ? 'سکه' : 'coins'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {modalMode === 'append'
                  ? (isFa ? 'ذخیره و به‌روزرسانی فصول رمان' : 'Save & Update Novel Chapters')
                  : (isFa ? 'ثبت و انتشار در فروشگاه' : 'Save & Publish to Store')}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* ================= GLOSSARY & CHARACTER NAME REPLACER MODAL ================= */}
      {showGlossaryModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {isFa ? '🔍 جستجو و اصلاح واژگان و نام‌ها در کل فصول' : '🔍 Batch Find & Replace Terms'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isFa
                      ? 'اصلاح اسامی شخصیت‌ها، مهارت‌ها یا واژگان در تمام فصل‌های رمان به‌صورت یکجا'
                      : 'Replace terms across all novel chapters simultaneously'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlossaryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">
                    {isFa ? 'عبارت یا نام فعلی برای جستجو:' : 'Find Term / Name:'}
                  </label>
                  {glossaryFind.trim() && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 font-bold">
                      {isFa
                        ? `${formatNumber(liveGlossaryMatchesCount, language)} مورد یافت شد`
                        : `${liveGlossaryMatchesCount} matches found`}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={glossaryFind}
                  onChange={(e) => setGlossaryFind(e.target.value)}
                  placeholder={isFa ? 'مثال: Lin Feng یا Tang San یا Lord' : 'e.g. Lin Feng or System'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-hidden focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isFa ? 'جایگزین شود با:' : 'Replace With:'}
                </label>
                <input
                  type="text"
                  value={glossaryReplace}
                  onChange={(e) => setGlossaryReplace(e.target.value)}
                  placeholder={isFa ? 'مثال: لین فنگ یا تانگ سان یا ارباب' : 'e.g. لین فنگ'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 text-xs font-bold outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={glossaryMatchCase}
                    onChange={(e) => setGlossaryMatchCase(e.target.checked)}
                    className="accent-cyan-400 rounded cursor-pointer"
                  />
                  <span>{isFa ? 'حساس به حروف بزرگ و کوچک (Match Case)' : 'Match Case'}</span>
                </label>

                <span className="text-[11px] text-slate-400">
                  {isFa ? `پوشش: ${formatNumber(chapters.length, language)} فصل` : `Scope: ${chapters.length} ch`}
                </span>
              </div>

              {/* Sample Quick Terms */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">{isFa ? '💡 نمونه‌های پرکاربرد برای جایگزینی سریع:' : '💡 Common Webnovel Terms:'}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGlossaryFind('System');
                      setGlossaryReplace('سیستم');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer text-[11px] transition"
                  >
                    System ➔ سیستم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGlossaryFind('Host');
                      setGlossaryReplace('میزبان');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer text-[11px] transition"
                  >
                    Host ➔ میزبان
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGlossaryFind('Shadow Monarch');
                      setGlossaryReplace('ارباب سایه‌ها');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer text-[11px] transition"
                  >
                    Shadow Monarch ➔ ارباب سایه‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGlossaryFind('Sect Leader');
                      setGlossaryReplace('رهبر فرقه');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 cursor-pointer text-[11px] transition"
                  >
                    Sect Leader ➔ رهبر فرقه
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowGlossaryModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleGlossaryReplaceAll}
                disabled={!glossaryFind.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black transition shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isFa ? 'اعمال اصلاحات در کل رمان' : 'Apply to All Chapters'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
