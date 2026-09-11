import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Sparkles, 
  Pause, 
  Play, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Layers,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { 
  backgroundNovelTranslator, 
  BackgroundTranslationJob 
} from '../utils/backgroundNovelTranslator';
import { formatNumber } from '../utils/translations';
import { Language, WebNovel } from '../types';

interface BackgroundTranslationProgressBannerProps {
  language: Language;
  onOpenReader?: (novel: WebNovel) => void;
  novels?: WebNovel[];
  compact?: boolean;
}

export const BackgroundTranslationProgressBanner: React.FC<BackgroundTranslationProgressBannerProps> = ({
  language,
  onOpenReader,
  novels = [],
}) => {
  const [jobs, setJobs] = useState<BackgroundTranslationJob[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const isFa = language === 'fa';
  const isAr = language === 'ar';
  const isRtl = isFa || isAr;

  useEffect(() => {
    const unsubscribe = backgroundNovelTranslator.subscribe((allJobs) => {
      setJobs(allJobs);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'paused' || j.status === 'error');
  const recentCompleted = jobs.filter((j) => j.status === 'completed');

  // Auto-dismiss completed jobs after 5 seconds
  useEffect(() => {
    if (recentCompleted.length === 0) return;

    // Automatically expand to show success message if it was minimized
    if (!isExpanded && activeJobs.length === 0) {
      setIsExpanded(true);
    }

    const timers = recentCompleted.map((job) => {
      return setTimeout(() => {
        backgroundNovelTranslator.removeJob(job.id);
      }, 5000);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [recentCompleted.map((j) => j.id).join(','), isExpanded, activeJobs.length]);

  if (activeJobs.length === 0 && recentCompleted.length === 0) {
    return null;
  }

  // Calculate overall summary progress for minimized pill
  const totalCompleted = activeJobs.reduce((acc, j) => acc + (j.completedChapters || 0), 0);
  const totalChaptersCount = activeJobs.reduce((acc, j) => acc + (j.totalChapters || 1), 0);
  const overallPercent = totalChaptersCount > 0 
    ? Math.min(100, Math.round((totalCompleted / totalChaptersCount) * 100))
    : 0;

  const primaryJob = activeJobs[0] || recentCompleted[0];

  const handleOpenNovel = (job: BackgroundTranslationJob) => {
    if (!onOpenReader) return;
    const targetNovel = novels.find((n) => n.id === job.novelId) || {
      id: job.novelId,
      title: job.novelTitle,
      author: job.author,
      genre: job.genre || 'عمومی',
      synopsis: job.synopsis || '',
      coverGradient: job.coverGradient,
      price: job.price,
      pricePerChapter: job.pricePerChapter,
      isPriceLocked: job.isPriceLocked,
      chapters: job.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        chapterNumber: c.chapterNumber,
        price: job.pricePerChapter || 2,
      })),
      isDefault: false,
    };
    onOpenReader(targetNovel);
  };

  // If there are no active jobs and only completed jobs, show pure celebratory success cards that auto-dismiss in 5s
  if (activeJobs.length === 0 && recentCompleted.length > 0) {
    return (
      <div
        id="background-translation-success-stack"
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto"
      >
        {recentCompleted.map((job) => (
          <div
            key={job.id}
            id={`translation-success-${job.id}`}
            className="p-4 rounded-2xl bg-slate-900/95 border-2 border-emerald-500/60 text-white shadow-2xl shadow-emerald-950/40 backdrop-blur-md relative overflow-hidden flex flex-col gap-3"
          >
            {/* Top Celebratory Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-emerald-300">
                      {isFa ? 'ترجمه با موفقیت انجام شد!' : isAr ? 'تمت الترجمة بنجاح!' : 'Translation completed successfully!'}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium line-clamp-1">
                    {isFa
                      ? `تمام ${formatNumber(job.totalChapters, language)} فصل رمان «${job.novelTitle}» با موفقیت ترجمه و ذخیره شدند.`
                      : isAr
                      ? `تمت ترجمة وحفظ جميع فصول الرواية «${job.novelTitle}».`
                      : `All ${job.totalChapters} chapters for "${job.novelTitle}" translated & saved.`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {onOpenReader && (
                  <button
                    type="button"
                    onClick={() => {
                      backgroundNovelTranslator.removeJob(job.id);
                      handleOpenNovel(job);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isFa ? 'شروع مطالعه' : isAr ? 'بدء القراءة' : 'Read'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => backgroundNovelTranslator.removeJob(job.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
                  title={isFa ? 'بستن' : 'Dismiss'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 5-second Auto Dismiss Visual Countdown Indicator */}
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-5000 ease-linear"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ================= MINIMIZED / COLLAPSED VIEW =================
  if (!isExpanded && activeJobs.length > 0) {
    return (
      <div
        id="background-translation-minimized-pill"
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full flex justify-end animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          onClick={() => setIsExpanded(true)}
          className="group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-850 border border-cyan-500/40 hover:border-cyan-400 text-white shadow-2xl shadow-cyan-950/40 backdrop-blur-md cursor-pointer transition-all duration-200 select-none max-w-full"
          title={isFa ? 'کلیک کنید تا جزئیات کامل ترجمه باز شود' : 'Click to expand translation details'}
        >
          {/* Animated Icon */}
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
            {activeJobs.some((j) => j.status === 'running') ? (
              <Zap className="w-4 h-4 animate-pulse fill-cyan-400 text-cyan-300" />
            ) : recentCompleted.length > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Pause className="w-4 h-4 text-amber-300" />
            )}
          </div>

          {/* Minimized Info & Progress */}
          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white truncate max-w-[160px] sm:max-w-[220px]">
                {primaryJob ? primaryJob.novelTitle : (isFa ? 'ترجمه در پس‌زمینه' : 'Background Translation')}
              </span>
              <span className="text-[11px] font-mono font-black text-cyan-300 px-1.5 py-0.2 rounded-md bg-cyan-950/60 border border-cyan-800/40 shrink-0">
                {formatNumber(overallPercent, language)}٪
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="truncate">
                {activeJobs.length > 1
                  ? (isFa ? `${formatNumber(activeJobs.length, language)} رمان در حال پردازش` : `${activeJobs.length} active novels`)
                  : primaryJob?.currentChapterTitle
                  ? primaryJob.currentChapterTitle
                  : isFa ? 'در حال ترجمه فصول...' : 'Translating chapters...'}
              </span>
            </div>
          </div>

          {/* Expand Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-cyan-400 border border-slate-700 transition cursor-pointer shrink-0 ms-1 flex items-center gap-1 text-[11px] font-bold"
            title={isFa ? 'نمایش کامل جزئیات' : 'Expand'}
          >
            <ChevronUp className="w-4 h-4" />
            <span className="hidden sm:inline">{isFa ? 'باز کردن' : 'Open'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ================= FULL EXPANDED VIEW =================
  return (
    <div
      id="background-translation-widget"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full mb-4 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      {/* Top Header Bar for Global Minimize Toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-white text-[11px] sm:text-xs">
            {isFa 
              ? `⚡ ترجمه در پس‌زمینه (${formatNumber(activeJobs.length, language)} فعال)` 
              : `⚡ Background Translation (${activeJobs.length} active)`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer text-[11px] font-bold"
          title={isFa ? 'جمع کردن این پنجره برای اشغال فضای کمتر' : 'Collapse widget to save screen space'}
        >
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isFa ? 'جمع کردن' : 'Minimize'}</span>
        </button>
      </div>

      {/* Active Jobs */}
      {activeJobs.map((job) => {
        const percent = job.totalChapters > 0
          ? Math.min(100, Math.round((job.completedChapters / job.totalChapters) * 100))
          : 0;

        const isRunning = job.status === 'running';
        const isPaused = job.status === 'paused';

        return (
          <div
            key={job.id}
            id={`job-card-${job.id}`}
            className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/30 shadow-xl shadow-cyan-950/20 relative overflow-hidden backdrop-blur-md"
          >
            {/* Top Status & Title Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                  isRunning 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : isPaused 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {isRunning ? (
                    <Zap className="w-4 h-4 text-cyan-400" />
                  ) : isPaused ? (
                    <Pause className="w-4 h-4 text-amber-300" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-300" />
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-white line-clamp-1">
                      {job.novelTitle}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      (job.engineUsed || job.engine) === 'free'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}>
                      {(job.engineUsed || job.engine) === 'free' ? (
                        <>
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span>{isFa ? 'موتور پرسرعت وب' : 'Fast Free Engine'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>{isFa ? 'هوش مصنوعی' : 'AI Engine'}</span>
                        </>
                      )}
                    </span>
                    {job.failoverOccurred && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>{isFa ? 'سوییچ خودکار' : 'Auto Failover'}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {isRunning
                      ? (isFa
                          ? `⚡ در حال ترجمه: «${job.currentChapterTitle || `فصل ${job.currentChapterIndex + 1}`}»`
                          : `Translating: "${job.currentChapterTitle}"`)
                      : isPaused
                      ? (isFa ? '⏸️ ترجمه موقتا متوقف شده است' : 'Paused')
                      : (isFa ? `❌ خطا در ترجمه: ${job.error || 'ناشناخته'}` : 'Error')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 ms-auto">
                {/* Retry / Unstuck button always available if not 100% */}
                <button
                  type="button"
                  onClick={() => backgroundNovelTranslator.forceRetryJob(job.id)}
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  title={isFa ? 'رفع گیر و ادامه ترجمه فصول باقیمانده' : 'Retry / Continue remaining chapters'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{isFa ? 'رفع گیر' : 'Retry'}</span>
                </button>

                {isRunning ? (
                  <button
                    type="button"
                    onClick={() => backgroundNovelTranslator.pauseJob(job.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title={isFa ? 'توقف موقت ترجمه' : 'Pause'}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isFa ? 'توقف موقت' : 'Pause'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => backgroundNovelTranslator.resumeJob(job.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                    title={isFa ? 'ادامه ترجمه' : 'Resume'}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">{isFa ? 'ادامه' : 'Resume'}</span>
                  </button>
                )}

                {onOpenReader && (
                  <button
                    type="button"
                    onClick={() => handleOpenNovel(job)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title={isFa ? 'مشاهده فصول ترجمه‌شده تاکنون' : 'Read'}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isFa ? 'مطالعه' : 'Read'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => backgroundNovelTranslator.removeJob(job.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                  title={isFa ? 'لغو و حذف ترجمه' : 'Cancel'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar & Percentage Numbers */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {isFa
                      ? `فصل ${formatNumber(job.completedChapters, language)} از ${formatNumber(job.totalChapters, language)} ترجمه شد`
                      : `Chapter ${job.completedChapters} of ${job.totalChapters} translated`}
                  </span>
                </span>
                <span className="font-mono text-xs text-cyan-300 font-black">
                  {formatNumber(percent, language)}٪
                </span>
              </div>

              {/* Visual Progress Track */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-300 shadow-sm relative overflow-hidden"
                  style={{ width: `${percent}%` }}
                >
                  {isRunning && (
                    <div className="absolute inset-0 bg-white/20 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  )}
                </div>
              </div>
            </div>

            {/* Failover Status Notice if switched */}
            {job.failoverOccurred && job.failoverReason && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-amber-300 text-[11px]">
                    {isFa ? 'سوییچ خودکار فعال شد:' : 'Automatic Failover Active:'}
                  </span>
                  <span className="text-[11px] leading-relaxed opacity-90">
                    {job.failoverReason}
                  </span>
                </div>
              </div>
            )}

            {/* Dual Engine Failure Report Box */}
            {(job.status === 'error' || job.errorDetails || (job.error && job.error.includes('شکست'))) && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {isFa 
                      ? 'گزارش عدم موفقیت ترجمه (شکست هر دو روش وب و هوش مصنوعی)' 
                      : 'Dual-Engine Translation Failure Notice'}
                  </span>
                </div>
                <div className="text-[11px] text-rose-100 font-medium whitespace-pre-line leading-relaxed bg-slate-950/70 p-2.5 rounded-lg border border-rose-900/40 select-text font-mono">
                  {job.error || 'هر دو روش ترجمه (وب و هوش مصنوعی) قادر به ترجمه نبودند.'}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">
                    {isFa 
                      ? '💡 راهکار: اتصال اینترنت را چک کنید یا در تنظیمات یک کلید هوش مصنوعی معتبر اضافه کنید.' 
                      : '💡 Tip: Check connection or configure an AI key in settings.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => backgroundNovelTranslator.forceRetryJob(job.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isFa ? 'تلاش مجدد' : 'Retry'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Recently Completed Jobs Toast/Banner */}
      {recentCompleted.map((job) => (
        <div
          key={job.id}
          className="p-3.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-500/60 text-white flex flex-col gap-2.5 shadow-xl shadow-emerald-950/30 backdrop-blur-md animate-in fade-in"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-emerald-300">
                  {isFa ? 'ترجمه با موفقیت انجام شد!' : isAr ? 'تمت الترجمة بنجاح!' : 'Translation completed successfully!'}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {isFa
                    ? `تمام ${formatNumber(job.totalChapters, language)} فصل رمان «${job.novelTitle}» با موفقیت ترجمه و ذخیره شدند.`
                    : isAr
                    ? `تمت ترجمة وحفظ جميع فصول الرواية «${job.novelTitle}».`
                    : `All ${job.totalChapters} chapters for "${job.novelTitle}" translated & saved.`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenReader && (
                <button
                  type="button"
                  onClick={() => {
                    backgroundNovelTranslator.removeJob(job.id);
                    handleOpenNovel(job);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isFa ? 'شروع مطالعه' : isAr ? 'بدء القراءة' : 'Read'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => backgroundNovelTranslator.removeJob(job.id)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
                title={isFa ? 'بستن' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-5000 ease-linear"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

