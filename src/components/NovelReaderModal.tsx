import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Maximize2, 
  Minimize2, 
  Type, 
  Bookmark, 
  Share2, 
  List, 
  Check, 
  Sparkles,
  Layers,
  FileText,
  Lock,
  Coins,
  Unlock,
  CheckCircle2,
  Languages,
  Loader2,
  Search,
  Clock,
  Eye,
  ArrowRight,
  ArrowLeft,
  Star,
  Flame,
  BookMarked,
  Filter,
  CheckCheck,
  BookCheck
} from 'lucide-react';
import { WebNovel, WebNovelChapter, Language, UserRewardWallet } from '../types';
import {
  isChapterUnlocked,
  getChapterPrice,
  getNovelTotalCalculatedPrice,
  isChapterRead,
  getLastReadChapterNumber,
  getReadChaptersCount,
  resolveNovelSynopsis,
} from '../utils/rewardWallet';
import { formatNumber, truncateTitleByWords } from '../utils/translations';
import { safeClipboardCopy, safeRequestFullscreen, safeExitFullscreen, safeIsFullscreen } from '../utils/safeDom';
import { translateNovelChapter } from '../utils/novelParser';

interface NovelReaderModalProps {
  isOpen?: boolean;
  onClose: () => void;
  novel: WebNovel | null;
  language: Language;
  wallet?: UserRewardWallet;
  initialChapterIndex?: number;
  onUnlockChapter?: (novel: WebNovel, chapter: WebNovelChapter) => boolean;
  onUnlockNovel?: (novel: WebNovel) => boolean;
  onSaveNovel?: (novel: WebNovel) => void;
  onSaveProgress?: (
    novelId: string,
    chapterIndex: number,
    scrollPercent: number,
    chapterId?: string,
    chapterNumber?: number
  ) => void;
  onToggleChapterRead?: (novelId: string, chapterIndex: number, chapterId?: string) => void;
}

type ReaderTheme = 'light' | 'sepia' | 'dark' | 'oled';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type ViewMode = 'chapters' | 'reader';
type ChapterFilter = 'all' | 'unlocked' | 'locked' | 'read';

export const NovelReaderModal: React.FC<NovelReaderModalProps> = ({
  isOpen = true,
  onClose,
  novel,
  language,
  wallet,
  initialChapterIndex = 0,
  onUnlockChapter,
  onUnlockNovel,
  onSaveNovel,
  onSaveProgress,
  onToggleChapterRead,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('chapters');
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(initialChapterIndex);
  const [theme, setTheme] = useState<ReaderTheme>('dark');
  const [fontSize, setFontSize] = useState<FontSize>('lg');
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [unlockToast, setUnlockToast] = useState<{ message: string; success: boolean } | null>(null);
  const [translatedOverrides, setTranslatedOverrides] = useState<Record<number, { title: string; content: string }>>({});
  const [isTranslatingChapter, setIsTranslatingChapter] = useState(false);
  const [translatingChapterIndex, setTranslatingChapterIndex] = useState<number | null>(null);
  const [currentNovel, setCurrentNovel] = useState<WebNovel | null>(novel);

  // Chapter search & filter states on the chapters selection page
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>('all');

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  // Keep currentNovel in sync with prop updates
  useEffect(() => {
    setCurrentNovel(novel);
  }, [novel]);

  // Reset chapter and viewMode on novel open
  useEffect(() => {
    if (novel) {
      setCurrentNovel(novel);
      // Find saved progress if any
      const savedProg = wallet?.readingProgress?.[novel.id];
      const targetIdx = typeof savedProg?.lastChapter === 'number' ? savedProg.lastChapter : 0;
      setCurrentChapterIndex(targetIdx);
      setScrollProgress(savedProg?.scrollPercentage || 0);
      setTranslatedOverrides({});
      setViewMode('chapters'); // Always open chapters list first as requested!
      setChapterSearchQuery('');
      setChapterFilter('all');
    }
  }, [novel?.id]);

  // Handle scroll progress in reader mode
  const handleScroll = () => {
    if (!contentContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentContainerRef.current;
    if (scrollHeight <= clientHeight) {
      setScrollProgress(100);
      return;
    }
    const percent = Math.min(100, Math.max(0, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));
    setScrollProgress(percent);
    if (currentNovel && onSaveProgress) {
      onSaveProgress(currentNovel.id, currentChapterIndex, percent);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !currentNovel) return;
      if (e.key === 'Escape') {
        if (isFullscreen || safeIsFullscreen()) {
          safeExitFullscreen();
          setIsFullscreen(false);
        } else if (viewMode === 'reader') {
          setViewMode('chapters');
        } else {
          onClose();
        }
      }
    };
    try {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } catch {
      // Ignore if event listener restricted
    }
  }, [isOpen, currentNovel, isFullscreen, viewMode, onClose]);

  if (!isOpen || !currentNovel) return null;

  const chapters: WebNovelChapter[] = currentNovel.chapters && currentNovel.chapters.length > 0
    ? currentNovel.chapters
    : [
        {
          id: 'single-chapter',
          chapterNumber: 1,
          title: currentNovel.title,
          price: currentNovel.pricePerChapter || 2,
          content: currentNovel.rawContent || currentNovel.synopsis || (isFa ? 'متن کامل در فایل پیوست قرار دارد.' : 'Full content available in attachment.'),
        }
      ];

  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const activeChapterTitle = translatedOverrides[currentChapterIndex]?.title || currentChapter.title;
  const activeChapterContent = translatedOverrides[currentChapterIndex]?.content || currentChapter.content;
  const isCurrentChapterTranslated = Boolean(translatedOverrides[currentChapterIndex]) || Boolean(currentChapter.isTranslated);

  const chapterPrice = getChapterPrice(currentChapter, currentNovel.pricePerChapter || 2);
  const totalCalculatedFullPrice = getNovelTotalCalculatedPrice(currentNovel);
  const isFullNovelUnlocked = (wallet?.unlockedNovelIds || []).includes(currentNovel.id);

  // Chapter unlock status
  const isCurrentChapterUnlocked = wallet 
    ? isChapterUnlocked(wallet, currentNovel.id, currentChapter.id, currentChapterIndex)
    : true;

  const userCoins = wallet?.coins ?? 0;
  const canAffordChapter = userCoins >= chapterPrice;
  const canAffordFullNovel = userCoins >= totalCalculatedFullPrice;

  // Filtered chapters for the selection page
  const filteredChapters = chapters.filter((ch, idx) => {
    const isUnlocked = wallet ? isChapterUnlocked(wallet, currentNovel.id, ch.id, idx) : true;
    const isRead = isChapterRead(wallet, currentNovel.id, ch.id, idx);
    
    if (chapterFilter === 'unlocked' && !isUnlocked) return false;
    if (chapterFilter === 'locked' && isUnlocked) return false;
    if (chapterFilter === 'read' && !isRead) return false;

    if (chapterSearchQuery.trim()) {
      const q = chapterSearchQuery.toLowerCase();
      const matchTitle = (ch.title || '').toLowerCase().includes(q);
      const matchContent = (ch.content || '').toLowerCase().includes(q);
      const matchNum = `${ch.chapterNumber}`.includes(q);
      return matchTitle || matchContent || matchNum;
    }
    return true;
  });

  const unlockedChaptersCount = chapters.filter((ch, idx) => 
    wallet ? isChapterUnlocked(wallet, currentNovel.id, ch.id, idx) : true
  ).length;

  const readChaptersCount = getReadChaptersCount(wallet, currentNovel.id);
  const lastReadChapterNumber = getLastReadChapterNumber(wallet, currentNovel.id);

  const handleSelectChapterToRead = (index: number) => {
    const ch = chapters[index];
    setCurrentChapterIndex(index);
    setViewMode('reader');
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
    if (currentNovel && onSaveProgress) {
      onSaveProgress(currentNovel.id, index, 0, ch?.id, ch?.chapterNumber || index + 1);
    }
  };

  const handleTranslateChapterAtIndex = async (targetIndex: number) => {
    const targetChapter = chapters[targetIndex];
    if (!targetChapter || isTranslatingChapter) return;
    try {
      setIsTranslatingChapter(true);
      setTranslatingChapterIndex(targetIndex);

      const res = await translateNovelChapter(
        targetChapter.content,
        targetChapter.title,
        {
          engine: 'auto',
          targetLang: 'fa',
        }
      );

      if (res.success && res.content) {
        const translatedTitle = res.title || targetChapter.title;
        const translatedContent = res.content;

        // 1. Update transient view overrides for instant UI update
        setTranslatedOverrides((prev) => ({
          ...prev,
          [targetIndex]: {
            title: translatedTitle,
            content: translatedContent,
          },
        }));

        // 2. Persistently update the chapter in novel model and database
        const updatedChapters = chapters.map((ch, idx) => {
          if (idx === targetIndex) {
            return {
              ...ch,
              title: translatedTitle,
              content: translatedContent,
              isTranslated: true,
            };
          }
          return ch;
        });

        const updatedNovel: WebNovel = {
          ...currentNovel,
          chapters: updatedChapters,
        };

        setCurrentNovel(updatedNovel);

        if (onSaveNovel) {
          onSaveNovel(updatedNovel);
        }

        // 3. Notify global listeners that custom novels updated
        try {
          window.dispatchEvent(
            new CustomEvent('customNovelsUpdated', {
              detail: { novelId: currentNovel.id, chapterIndex: targetIndex },
            })
          );
        } catch {}

        setUnlockToast({
          message: isFa 
            ? `فصل «${translatedTitle}» با موفقیت ترجمه شد و به طور دائمی ذخیره گردید.` 
            : 'Chapter translated and permanently saved to library.',
          success: true,
        });
        setTimeout(() => setUnlockToast(null), 4000);
      } else {
        setUnlockToast({
          message: isFa ? 'خطا در فرآیند ترجمه فصل.' : 'Translation request failed.',
          success: false,
        });
        setTimeout(() => setUnlockToast(null), 3500);
      }
    } catch (err) {
      console.warn('Reader translation error:', err);
      setUnlockToast({
        message: isFa ? 'خطای غیرمنتظره در ارتباط با سرور ترجمه.' : 'Unexpected translation error.',
        success: false,
      });
      setTimeout(() => setUnlockToast(null), 3500);
    } finally {
      setIsTranslatingChapter(false);
      setTranslatingChapterIndex(null);
    }
  };

  const handleTranslateCurrentChapter = () => {
    handleTranslateChapterAtIndex(currentChapterIndex);
  };

  const handleBuyChapter = (ch: WebNovelChapter, autoEnterReader: boolean = false) => {
    if (!onUnlockChapter) return;
    const success = onUnlockChapter(novel, ch);
    if (success) {
      setUnlockToast({
        success: true,
        message: isFa 
          ? `فصل «${ch.title}» با موفقیت بازگشایی شد!` 
          : `Chapter unlocked successfully!`
      });
      if (autoEnterReader) {
        const idx = chapters.findIndex((c) => c.id === ch.id);
        if (idx >= 0) {
          handleSelectChapterToRead(idx);
        }
      }
    } else {
      const price = getChapterPrice(ch, novel.pricePerChapter || 2);
      setUnlockToast({
        success: false,
        message: isFa 
          ? `سکه کافی نیست! نیاز به ${formatNumber(price - userCoins, language)} سکه بیشتر دارید. با انجام عادات روزانه سکه کسب کنید.` 
          : `Not enough coins! Need ${price - userCoins} more coins.`
      });
    }
    setTimeout(() => setUnlockToast(null), 4000);
  };

  const handleBuyFullNovel = () => {
    if (!onUnlockNovel) return;
    const success = onUnlockNovel(novel);
    if (success) {
      setUnlockToast({
        success: true,
        message: isFa 
          ? `کل رمان «${novel.title}» با موفقیت بازگشایی شد!` 
          : `Entire novel unlocked!`
      });
    } else {
      setUnlockToast({
        success: false,
        message: isFa 
          ? `سکه کافی نیست! با انجام عادات روزانه سکه کسب کنید.` 
          : `Not enough coins.`
      });
    }
    setTimeout(() => setUnlockToast(null), 4000);
  };

  const toggleFullscreen = async () => {
    if (!safeIsFullscreen()) {
      const ok = await safeRequestFullscreen(modalContainerRef.current);
      if (ok) setIsFullscreen(true);
    } else {
      await safeExitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Theme styling definitions
  const themeStyles: Record<ReaderTheme, {
    bg: string;
    text: string;
    subtext: string;
    headerBg: string;
    border: string;
    cardBg: string;
    highlight: string;
  }> = {
    light: {
      bg: 'bg-stone-50',
      text: 'text-stone-900',
      subtext: 'text-stone-600',
      headerBg: 'bg-stone-100/90 border-stone-200',
      border: 'border-stone-200',
      cardBg: 'bg-white',
      highlight: 'bg-stone-200',
    },
    sepia: {
      bg: 'bg-[#fbf0d9]',
      text: 'text-[#433422]',
      subtext: 'text-[#705e46]',
      headerBg: 'bg-[#f4e4c1]/90 border-[#e6ce9e]',
      border: 'border-[#e6ce9e]',
      cardBg: 'bg-[#fff8ea]',
      highlight: 'bg-[#eddab2]',
    },
    dark: {
      bg: 'bg-slate-900',
      text: 'text-slate-100',
      subtext: 'text-slate-400',
      headerBg: 'bg-slate-950/90 border-slate-800',
      border: 'border-slate-800',
      cardBg: 'bg-slate-850',
      highlight: 'bg-slate-800',
    },
    oled: {
      bg: 'bg-black',
      text: 'text-zinc-200',
      subtext: 'text-zinc-500',
      headerBg: 'bg-black/95 border-zinc-900',
      border: 'border-zinc-900',
      cardBg: 'bg-zinc-950',
      highlight: 'bg-zinc-900',
    },
  };

  const currentTheme = themeStyles[theme];

  const fontSizeClass = {
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl',
  }[fontSize];

  const lineHeightClass = {
    normal: 'leading-normal sm:leading-relaxed',
    relaxed: 'leading-relaxed sm:leading-loose',
    loose: 'leading-loose sm:leading-[2.5]',
  }[lineHeight];

  const handleCopyText = () => {
    if (!currentChapter) return;
    safeClipboardCopy(`${novel.title} - ${currentChapter.title}\n\n${currentChapter.content}`).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  return (
    <div
      id="novel-reader-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        ref={modalContainerRef}
        id="novel-reader-viewport"
        className={`w-full h-full sm:h-[94vh] max-w-5xl sm:rounded-3xl ${viewMode === 'reader' ? currentTheme.bg : 'bg-slate-900'} ${viewMode === 'reader' ? currentTheme.text : 'text-slate-100'} flex flex-col shadow-2xl overflow-hidden border ${viewMode === 'reader' ? currentTheme.border : 'border-slate-800'} transition-colors duration-200 relative`}
      >
        {/* Toast Alert */}
        {unlockToast && (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
            unlockToast.success 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-500/20' 
              : 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-500/20'
          }`}>
            {unlockToast.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Lock className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{unlockToast.message}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 1: CHAPTERS LIST SELECTION SCREEN (صفحه انتخاب قسمت‌های رمان)         */}
        {/* ========================================================================= */}
        {viewMode === 'chapters' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
            {/* Top Bar for Chapters Selection View */}
            <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <List className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white truncate">
                    {novel.title}
                  </h2>
                  <span className="text-[11px] text-slate-400 block truncate font-medium">
                    {isFa ? 'فهرست و انتخاب قسمت‌ها' : isAr ? 'فهرس واختيار الفصول' : 'Table of Chapters & Episodes'}
                  </span>
                </div>
              </div>

              {/* Wallet Balance & Close */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-blue-400">
                  <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{formatNumber(userCoins, language)} {isFa ? 'سکه' : 'coins'}</span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                  title={isFa ? 'بستن' : 'Close'}
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </header>

            {/* Scrollable Container with Novel Hero Banner & Chapters Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar">
              {/* Novel Hero Card */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 z-10 relative">
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30">
                        {novel.genre}
                      </span>
                      {isFullNovelUnlocked ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{isFa ? 'بازگشایی کامل' : 'Full Unlocked'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-950 text-blue-400 border border-slate-800 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          <span>{isFa ? `مجموع قیمت: ${formatNumber(totalCalculatedFullPrice, language)} سکه` : `Total: ${totalCalculatedFullPrice} Coins`}</span>
                        </span>
                      )}
                      {novel.rating && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-slate-400 text-slate-400" />
                          <span>{novel.rating}</span>
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                      {novel.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {resolveNovelSynopsis(novel, language)}
                    </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span>{isFa ? 'نویسنده:' : 'Author:'} <strong className="text-slate-200">{novel.author || (isFa ? 'نامشخص' : 'Unknown')}</strong></span>
                        <span>•</span>
                        <span>{isFa ? 'تعداد قسمت‌ها:' : 'Total Chapters:'} <strong className="text-blue-400">{formatNumber(chapters.length, language)}</strong></span>
                        <span>•</span>
                        <span>{isFa ? 'قسمت‌های آزاد:' : 'Unlocked:'} <strong className="text-emerald-400">{formatNumber(unlockedChaptersCount, language)}</strong></span>
                        {readChaptersCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-300 font-bold">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isFa ? `${formatNumber(readChaptersCount, language)} قسمت خوانده شده` : `${readChaptersCount} chapters read`}</span>
                            </span>
                          </>
                        )}
                        {lastReadChapterNumber !== null && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-blue-300 font-bold">
                              <BookCheck className="w-3.5 h-3.5 text-blue-400" />
                              <span>{isFa ? `آخرین مطالعه: فصل ${formatNumber(lastReadChapterNumber, language)}` : `Last read: Ch. ${lastReadChapterNumber}`}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons on Novel Hero */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 pt-2 md:pt-0">
                      <button
                        type="button"
                        onClick={() => handleSelectChapterToRead(currentChapterIndex || 0)}
                        className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-blue-600/20"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>
                          {currentChapterIndex > 0
                            ? (isFa ? `ادامه مطالعه (فصل ${formatNumber(currentChapterIndex + 1, language)})` : `Continue (Ch. ${currentChapterIndex + 1})`)
                            : (isFa ? 'شروع مطالعه از ابتدا' : 'Start Reading')}
                        </span>
                      </button>

                      {!isFullNovelUnlocked && onUnlockNovel && (
                        <button
                          type="button"
                          onClick={handleBuyFullNovel}
                          disabled={!canAffordFullNovel}
                          className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span>
                            {isFa
                              ? `بازگشایی کل رمان (${formatNumber(totalCalculatedFullPrice, language)} سکه)`
                              : `Unlock Full Novel (${totalCalculatedFullPrice} Coins)`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chapters Search & Filters Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={chapterSearchQuery}
                      onChange={(e) => setChapterSearchQuery(e.target.value)}
                      placeholder={isFa ? 'جستجو در عنوان یا متن فصل‌ها...' : 'Search chapters...'}
                      className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-hidden transition"
                    />
                    {chapterSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setChapterSearchQuery('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs w-full sm:w-auto justify-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => setChapterFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        chapterFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isFa ? `همه (${formatNumber(chapters.length, language)})` : `All (${chapters.length})`}
                    </button>

                    <button
                      type="button"
                      onClick={() => setChapterFilter('unlocked')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        chapterFilter === 'unlocked'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{isFa ? `بازگشایی‌شده (${formatNumber(unlockedChaptersCount, language)})` : `Unlocked (${unlockedChaptersCount})`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChapterFilter('read')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        chapterFilter === 'read'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      <span>{isFa ? `خوانده‌شده (${formatNumber(readChaptersCount, language)})` : `Read (${readChaptersCount})`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChapterFilter('locked')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        chapterFilter === 'locked'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>{isFa ? `قفل (${formatNumber(chapters.length - unlockedChaptersCount, language)})` : `Locked (${chapters.length - unlockedChaptersCount})`}</span>
                    </button>
                  </div>
                </div>

              {/* Chapters List Grid */}
              {filteredChapters.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-300">
                    {isFa ? 'قسمتی با این فیلتر یا عبارت یافت نشد.' : 'No chapters found matching filter.'}
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
                  {filteredChapters.map((ch, idx) => {
                    const originalIdx = chapters.findIndex((c) => c.id === ch.id);
                    const isUnlocked = wallet ? isChapterUnlocked(wallet, novel.id, ch.id, originalIdx) : true;
                    const isRead = isChapterRead(wallet, novel.id, ch.id, originalIdx);
                    const chPrice = getChapterPrice(ch, novel.pricePerChapter || 2);
                    const canAffordThis = userCoins >= chPrice;
                    const isCurrent = currentChapterIndex === originalIdx;

                    // Approximate reading metrics
                    const wordCount = (ch.content || '').split(/\s+/).filter(Boolean).length;
                    const readingMins = Math.max(1, Math.ceil(wordCount / 180));

                    return (
                      <div
                        key={ch.id || idx}
                        className={`rounded-2xl border transition-all duration-150 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isCurrent
                            ? 'bg-blue-950/40 border-blue-500/40 shadow-sm'
                            : isUnlocked
                            ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                            : 'bg-slate-950/80 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {/* Chapter Left Details */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isUnlocked
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isUnlocked ? (
                              <BookOpen className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Lock className="w-4 h-4 text-amber-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-bold text-blue-400">
                                {isFa ? `قسمت ${formatNumber(ch.chapterNumber || originalIdx + 1, language)}` : `Episode ${ch.chapterNumber || originalIdx + 1}`}
                              </span>

                              {isRead && (
                                <span
                                  id={`chapter-read-badge-${ch.id || originalIdx}`}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs animate-in fade-in"
                                  title={isFa ? 'این فصل خوانده شده است' : isAr ? 'تمت قراءة هذا الفصل' : 'This chapter has been read'}
                                >
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                                  <span>{isFa ? 'خوانده شده' : isAr ? 'تمت القراءة' : 'Read'}</span>
                                </span>
                              )}

                              {isUnlocked ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isFa ? 'آماده مطالعه' : 'Unlocked'}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-blue-300 border border-slate-700 flex items-center gap-1">
                                  <Coins className="w-3 h-3" />
                                  <span>{formatNumber(chPrice, language)} {isFa ? 'سکه' : 'coins'}</span>
                                </span>
                              )}

                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {isFa ? 'آخرین مطالعه شده' : 'Last Read'}
                                </span>
                              )}
                            </div>

                            <h3 
                              className="text-sm sm:text-base font-bold text-white leading-snug break-words"
                              title={ch.title}
                            >
                              {truncateTitleByWords(ch.title, 7, 45)}
                            </h3>

                            <p className="text-xs text-slate-400 line-clamp-1">
                              {(ch.content || '').slice(0, 140).replace(/\s+/g, ' ')}...
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>~{formatNumber(readingMins, language)} {isFa ? 'دقیقه مطالعه' : 'min read'}</span>
                              </span>
                              <span>•</span>
                              <span>{formatNumber(wordCount, language)} {isFa ? 'کلمه' : 'words'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Chapter Right Actions */}
                        <div className="w-full sm:w-auto flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                          {/* Re-translate / Translate Chapter Quick Button */}
                          <button
                            type="button"
                            disabled={isTranslatingChapter}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTranslateChapterAtIndex(originalIdx);
                            }}
                            className={`p-2 sm:px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                              isTranslatingChapter && translatingChapterIndex === originalIdx
                                ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                                : ch.isTranslated
                                ? 'bg-slate-800/60 text-slate-300 border-slate-700 hover:text-emerald-300 hover:border-emerald-500/30'
                                : 'bg-blue-900/30 text-blue-300 border-blue-500/40 hover:bg-blue-600 hover:text-white'
                            } disabled:opacity-60`}
                            title={ch.isTranslated ? (isFa ? 'ترجمه مجدد این فصل' : 'Re-translate chapter') : (isFa ? 'ترجمه این فصل' : 'Translate chapter')}
                          >
                            {isTranslatingChapter && translatingChapterIndex === originalIdx ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            ) : (
                              <Languages className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            <span className="hidden md:inline text-[11px]">
                              {isTranslatingChapter && translatingChapterIndex === originalIdx
                                ? (isFa ? 'در حال ترجمه...' : 'Translating...')
                                : ch.isTranslated
                                ? (isFa ? 'ترجمه مجدد' : 'Re-translate')
                                : (isFa ? 'ترجمه فصل' : 'Translate')}
                            </span>
                          </button>

                          {onToggleChapterRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleChapterRead(novel.id, originalIdx, ch.id);
                              }}
                              className={`p-2 sm:px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                                isRead
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-300 hover:border-emerald-500/30'
                              }`}
                              title={isRead ? (isFa ? 'علامت‌گذاری به عنوان خوانده نشده' : 'Mark as unread') : (isFa ? 'علامت‌گذاری به عنوان خوانده شده' : 'Mark as read')}
                            >
                              <CheckCheck className={`w-3.5 h-3.5 ${isRead ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <span className="hidden sm:inline text-[11px]">{isRead ? (isFa ? 'خوانده شده' : 'Read') : (isFa ? 'نخوانده' : 'Unread')}</span>
                            </button>
                          )}

                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleSelectChapterToRead(originalIdx)}
                              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{isFa ? 'مطالعه این قسمت' : 'Read Chapter'}</span>
                            </button>
                          ) : (
                            <div className="w-full sm:w-auto flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBuyChapter(ch, true)}
                                className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                                  canAffordThis
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                                }`}
                              >
                                <Coins className="w-3.5 h-3.5" />
                                <span>
                                  {isFa 
                                    ? `بازگشایی (${formatNumber(chPrice, language)} سکه)` 
                                    : `Unlock (${chPrice} Coins)`}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectChapterToRead(originalIdx)}
                                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
                                title={isFa ? 'پیش‌نمایش این قسمت' : 'Preview'}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: ACTIVE READING CANVAS (نمای خواندن متن قسمت انتخاب‌شده)            */}
        {/* ========================================================================= */}
        {viewMode === 'reader' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Reading Progress Bar */}
            <div className="w-full h-1 bg-slate-800/40 relative z-30">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-all duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>

            {/* Top Reader Navbar */}
            <header className={`px-4 sm:px-6 py-3 border-b ${currentTheme.headerBg} flex items-center justify-between gap-3 shrink-0 z-20 backdrop-blur-md`}>
              {/* Left: Back to Chapters List & Novel Title Breadcrumb */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Back to Chapters List View Button */}
                <button
                  type="button"
                  onClick={() => setViewMode('chapters')}
                  className={`p-2 rounded-xl border ${currentTheme.border} hover:scale-105 active:scale-95 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${currentTheme.cardBg}`}
                  title={isFa ? 'بازگشت به فهرست قسمت‌های رمان' : 'Back to Chapters List'}
                >
                  <List className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold hidden sm:inline">
                    {isFa ? 'فهرست قسمت‌ها' : 'Chapters List'}
                  </span>
                </button>

                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black truncate">
                    {novel.title}
                  </h2>
                  <span className={`text-[10px] sm:text-xs ${currentTheme.subtext} block truncate font-medium`}>
                    {activeChapterTitle} {isCurrentChapterTranslated && <span className="text-emerald-400 font-bold ms-1">(ترجمه شده)</span>}
                  </span>
                </div>
              </div>

              {/* Right: Controls (Theme, Font, AI Translate, Download, Fullscreen, Close) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* AI Live Translation button */}
                <button
                  type="button"
                  onClick={handleTranslateCurrentChapter}
                  disabled={isTranslatingChapter}
                  className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                    isCurrentChapterTranslated 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                      : 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30 text-blue-300'
                  } disabled:opacity-50`}
                  title={isFa ? 'ترجمه این فصل به فارسی با هوش مصنوعی' : 'Translate this chapter to Persian with AI'}
                >
                  {isTranslatingChapter ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                  ) : (
                    <Languages className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="hidden lg:inline">
                    {isTranslatingChapter 
                      ? (isFa ? 'در حال ترجمه...' : 'Translating...') 
                      : isCurrentChapterTranslated 
                        ? (isFa ? 'فارسی شده ✓' : 'Translated ✓') 
                        : (isFa ? 'ترجمه هوشمند' : 'Translate')}
                  </span>
                </button>

                {/* Theme switcher button */}
                <div className="flex items-center p-0.5 rounded-xl border border-slate-700/40 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${theme === 'light' ? 'bg-amber-100 text-stone-900 shadow-xs' : 'text-stone-400 hover:text-white'}`}
                    title={isFa ? 'تم روشن' : 'Light'}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('sepia')}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${theme === 'sepia' ? 'bg-[#ecd6a8] text-[#433422] font-bold shadow-xs' : 'text-stone-400 hover:text-white'}`}
                    title={isFa ? 'تم کاغذی ملایم (سپیا)' : 'Sepia Paper'}
                  >
                    <span className="text-[10px] font-black">Sep</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                    title={isFa ? 'تم شب' : 'Dark'}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('oled')}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${theme === 'oled' ? 'bg-zinc-800 text-white font-bold shadow-xs' : 'text-zinc-500 hover:text-white'}`}
                    title={isFa ? 'سیاه خالص OLED' : 'OLED Pitch Black'}
                  >
                    <span className="text-[10px] font-black">OLED</span>
                  </button>
                </div>

                {/* Font Size Adjuster */}
                <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-slate-700/40 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => prev === '2xl' ? 'xl' : prev === 'xl' ? 'lg' : prev === 'lg' ? 'base' : 'sm')}
                    className="px-2 py-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    title={isFa ? 'کاهش سایز فونت' : 'Smaller Font'}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize((prev) => prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : prev === 'lg' ? 'xl' : '2xl')}
                    className="px-2 py-1 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    title={isFa ? 'افزایش سایز فونت' : 'Larger Font'}
                  >
                    A+
                  </button>
                </div>

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl border ${currentTheme.border} ${currentTheme.cardBg} hover:scale-105 transition cursor-pointer hidden sm:flex`}
                  title={isFullscreen ? 'خروج از تمام صفحه' : 'تمام صفحه'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close modal */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                  title={isFa ? 'بستن' : 'Close'}
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </header>

            {/* Quick Drawer for chapter jumping */}
            {isChapterDrawerOpen && (
              <div
                className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex animate-in fade-in duration-150"
                onClick={() => setIsChapterDrawerOpen(false)}
              >
                <div
                  className={`w-full max-w-sm h-full ${currentTheme.cardBg} ${currentTheme.text} border-e ${currentTheme.border} shadow-2xl p-5 overflow-y-auto flex flex-col justify-between`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700/40">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-black">{isFa ? 'فهرست فصل‌های رمان' : 'Chapters Index'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChapterDrawerOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {chapters.map((ch, idx) => {
                        const isChUnlocked = wallet 
                          ? isChapterUnlocked(wallet, novel.id, ch.id, idx)
                          : true;
                        const isRead = isChapterRead(wallet, novel.id, ch.id, idx);
                        const chP = getChapterPrice(ch, novel.pricePerChapter || 2);

                        return (
                          <button
                            key={ch.id || idx}
                            type="button"
                            onClick={() => {
                              setCurrentChapterIndex(idx);
                              setIsChapterDrawerOpen(false);
                              if (contentContainerRef.current) {
                                contentContainerRef.current.scrollTop = 0;
                              }
                              if (novel && onSaveProgress) {
                                onSaveProgress(novel.id, idx, 0, ch.id, ch.chapterNumber || idx + 1);
                              }
                            }}
                            className={`w-full text-start p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                              currentChapterIndex === idx
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-xs'
                                : `hover:${currentTheme.highlight} ${currentTheme.border} ${currentTheme.subtext}`
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {isChUnlocked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                              )}
                              <span className="truncate" title={ch.title}>
                                {truncateTitleByWords(ch.title, 6, 35)}
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 ms-2">
                              {isRead && (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md shrink-0">
                                  <CheckCheck className="w-3 h-3 stroke-[2.5]" />
                                  <span>{isFa ? 'خوانده شده' : 'Read'}</span>
                                </span>
                              )}
                              {!isChUnlocked && (
                                <span className="text-[10px] font-black bg-slate-900 text-blue-300 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                                  <Coins className="w-3 h-3" />
                                  <span>{formatNumber(chP, language)}</span>
                                </span>
                              )}
                              {currentChapterIndex === idx && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isFa ? 'نویسنده:' : 'Author:'} {novel.author || 'نامشخص'}</span>
                    <span>{formatNumber(chapters.length, language)} {isFa ? 'فصل' : 'Ch'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Reader Reading Canvas */}
            <div
              ref={contentContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-5 sm:px-12 md:px-20 py-8 sm:py-12 scroll-smooth custom-scrollbar"
            >
              <div className="max-w-3xl mx-auto flex flex-col">
                {/* Chapter Header */}
                <div className="text-center pb-6 sm:pb-10 border-b border-slate-700/20 mb-8 sm:mb-12">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    {novel.genre}
                  </span>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2">
                    {activeChapterTitle}
                  </h1>
                  <p className={`text-xs sm:text-sm ${currentTheme.subtext}`}>
                    {novel.title} • {isFa ? 'اثر:' : 'By:'} {novel.author || 'نویسنده خلاق'}
                  </p>

                  {/* Direct translate prompt banner inside reader if chapter isn't translated or user wants to re-translate */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleTranslateCurrentChapter}
                      disabled={isTranslatingChapter}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm ${
                        isCurrentChapterTranslated
                          ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      {isTranslatingChapter ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                      <span>
                        {isTranslatingChapter
                          ? (isFa ? 'در حال ترجمه فصل جاری...' : 'Translating current chapter...')
                          : isCurrentChapterTranslated
                          ? (isFa ? 'ترجمه مجدد این فصل با هوش مصنوعی' : 'Re-translate chapter with AI')
                          : (isFa ? 'ترجمه فارسی این فصل با هوش مصنوعی' : 'Translate this chapter to Persian')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Chapter Content / Locked Wall */}
                {isCurrentChapterUnlocked ? (
                  /* Unlocked full chapter content */
                  <div className={`prose max-w-none ${fontSizeClass} ${lineHeightClass} space-y-6 select-text text-justify`}>
                    {activeChapterContent.split('\n\n').map((paragraph, pIdx) => {
                      const trimmed = paragraph.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed.startsWith('---')) {
                        return (
                          <div
                            key={pIdx}
                            className="p-4 my-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-300 font-bold text-center"
                          >
                            {trimmed}
                          </div>
                        );
                      }
                      return (
                        <p key={pIdx} className="indent-4 sm:indent-8">
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  /* Locked chapter teaser & unlock wall */
                  <div className="space-y-6">
                    {/* Teaser text with blurred gradient fadeout */}
                    <div className="relative select-none pointer-events-none opacity-40">
                      <div className={`prose max-w-none ${fontSizeClass} ${lineHeightClass} space-y-4 filter blur-[1.5px]`}>
                        <p className="indent-4 sm:indent-8">
                          {activeChapterContent.slice(0, 260) || 'شروع ماجرای هیجان‌انگیز این فصل در اعماق ذهن و میدان نبرد شکل می‌گیرد...'}
                        </p>
                        <p className="indent-4 sm:indent-8">
                          تلاش مداوم و انضباط سیناپسی تنها راه عبور از دروازه‌های ناشناخته بعدی است...
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/60 to-slate-900" />
                    </div>

                    {/* Chapter Unlock Card */}
                    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 text-center shadow-2xl relative overflow-hidden">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 shadow-lg">
                        <Lock className="w-7 h-7" />
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-white mb-1.5">
                        {isFa ? 'این فصل قفل است' : 'This Chapter is Locked'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
                        {isFa 
                          ? `برای ادامه مطالعه «${currentChapter.title}» می‌توانید این فصل را با سکه‌های پاداش عادات خود بازگشایی کنید.` 
                          : `Unlock this chapter with your habit reward coins.`}
                      </p>

                      {/* Coin Balance & Price Info */}
                      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                          <span className="text-xs text-slate-400">{isFa ? 'قیمت این چپتر:' : 'Chapter Price:'}</span>
                          <span className="text-sm font-black text-blue-400 flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            {formatNumber(chapterPrice, language)} {isFa ? 'سکه' : 'coins'}
                          </span>
                        </div>

                        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                          <span className="text-xs text-slate-400">{isFa ? 'موجودی شما:' : 'Your Balance:'}</span>
                          <span className="text-sm font-black text-emerald-400 flex items-center gap-1">
                            <Coins className="w-4 h-4" />
                            {formatNumber(userCoins, language)} {isFa ? 'سکه' : 'coins'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => handleBuyChapter(currentChapter)}
                          className={`w-full sm:flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                            canAffordChapter
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 hover:scale-102'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-400/40'
                          }`}
                        >
                          {canAffordChapter ? (
                            <>
                              <Unlock className="w-4 h-4 stroke-[2.5]" />
                              <span>{isFa ? `بازگشایی این فصل (${formatNumber(chapterPrice, language)} سکه)` : `Unlock Chapter (${chapterPrice} Coins)`}</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>{isFa ? `نیاز به ${formatNumber(chapterPrice - userCoins, language)} سکه دیگر` : `Need ${chapterPrice - userCoins} more coins`}</span>
                            </>
                          )}
                        </button>

                        {!isFullNovelUnlocked && totalCalculatedFullPrice > chapterPrice && (
                          <button
                            type="button"
                            onClick={handleBuyFullNovel}
                            className={`w-full sm:w-auto py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                              canAffordFullNovel
                                ? 'bg-slate-900 hover:bg-slate-850 text-blue-300 border-blue-500/40 hover:border-blue-400'
                                : 'bg-slate-900/50 text-slate-500 border-slate-800'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isFa ? `بازگشایی کل رمان (${formatNumber(totalCalculatedFullPrice, language)} سکه)` : `Unlock Whole Novel (${totalCalculatedFullPrice} coins)`}</span>
                          </button>
                        )}
                      </div>

                      {/* Habit earn reminder hint */}
                      <p className="text-[11px] text-slate-500 mt-4">
                        {isFa ? 'یادآوری: با انجام هر عادت روزانه ۱۰ سکه پاداش دریافت می‌کنید.' : 'Tip: You earn 10 coins for each habit check-in.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bottom Chapter Completion & Navigation */}
                <div className="mt-14 pt-8 border-t border-slate-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Prev Chapter */}
                  <button
                    type="button"
                    disabled={currentChapterIndex === 0}
                    onClick={() => {
                      if (currentChapterIndex > 0) {
                        const newIdx = currentChapterIndex - 1;
                        const prevCh = chapters[newIdx];
                        setCurrentChapterIndex(newIdx);
                        if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                        if (novel && onSaveProgress) {
                          onSaveProgress(novel.id, newIdx, 0, prevCh?.id, prevCh?.chapterNumber || newIdx + 1);
                        }
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                      currentChapterIndex === 0
                        ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                        : `${currentTheme.cardBg} ${currentTheme.border} hover:scale-105`
                    }`}
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isFa ? 'فصل قبلی' : 'Previous Chapter'}</span>
                  </button>

                  {/* Return to Chapter List */}
                  <button
                    type="button"
                    onClick={() => setViewMode('chapters')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <List className="w-4 h-4 text-blue-400" />
                    <span>{isFa ? 'فهرست همه قسمت‌ها' : 'All Chapters'}</span>
                  </button>

                  {/* Share/Copy current text */}
                  {isCurrentChapterUnlocked && (
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-3.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedNotification ? (isFa ? 'متن کپی شد!' : 'Copied!') : (isFa ? 'کپی متن فصل' : 'Copy Chapter')}</span>
                    </button>
                  )}

                  {/* Next Chapter */}
                  <button
                    type="button"
                    disabled={currentChapterIndex >= chapters.length - 1}
                    onClick={() => {
                      if (currentChapterIndex < chapters.length - 1) {
                        const newIdx = currentChapterIndex + 1;
                        const nextCh = chapters[newIdx];
                        setCurrentChapterIndex(newIdx);
                        if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                        if (novel && onSaveProgress) {
                          onSaveProgress(novel.id, newIdx, 0, nextCh?.id, nextCh?.chapterNumber || newIdx + 1);
                        }
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                      currentChapterIndex >= chapters.length - 1
                        ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                        : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 hover:scale-105 shadow-md shadow-blue-600/20'
                    }`}
                  >
                    <span>{isFa ? 'فصل بعدی' : 'Next Chapter'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer info banner */}
            <footer className={`px-5 py-2.5 border-t ${currentTheme.headerBg} flex items-center justify-between text-[11px] ${currentTheme.subtext} shrink-0`}>
              <span>
                {isFa ? 'فصل' : 'Chapter'} {formatNumber(currentChapterIndex + 1, language)} {isFa ? 'از' : 'of'} {formatNumber(chapters.length, language)}
              </span>
              <div className="flex items-center gap-2">
                <span>{isFa ? 'پیشرفت مطالعه:' : 'Read Progress:'} {formatNumber(scrollProgress, language)}٪</span>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
