import { WebNovel, WebNovelChapter, Language } from '../types';
import { translateNovelChapter } from './novelParser';
import { safeStorage } from './safeStorage';
import {
  getCustomWebNovels,
  saveCustomWebNovels,
  isPlaceholderSynopsis,
  resolveNovelSynopsis,
} from './rewardWallet';
import { getStoredSectionAIKeys } from './aiKeyManager';

export interface BackgroundTranslationJob {
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
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'error' | 'queued';
  totalChapters: number;
  completedChapters: number;
  currentChapterIndex: number;
  currentChapterTitle: string;
  currentProgressPercent?: number;
  isServerJob?: boolean;
  createdAt: number;
  updatedAt: number;
  error?: string;
  chapters: {
    id: string;
    title: string;
    content: string;
    chapterNumber: number;
    sourceFileName?: string;
    isTranslated?: boolean;
  }[];
}

const JOBS_STORAGE_KEY = 'reward_background_novel_translation_jobs_v2';

class BackgroundNovelTranslationManager {
  private jobs: Map<string, BackgroundTranslationJob> = new Map();
  private listeners: Set<(jobs: BackgroundTranslationJob[]) => void> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private activeWorkers: Map<string, boolean> = new Map();
  private pollInterval: any = null;

  constructor() {
    this.loadPersistedJobs();
    this.startServerSyncPolling();
  }

  private loadPersistedJobs() {
    try {
      const raw = safeStorage.getItem(JOBS_STORAGE_KEY);
      if (raw) {
        const list: BackgroundTranslationJob[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((j) => {
            if (!j.isServerJob && j.status === 'running') {
              j.status = 'paused';
            }
            this.jobs.set(j.id, j);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load background translation jobs:', e);
    }
  }

  private persistJobs() {
    try {
      const list = Array.from(this.jobs.values());
      safeStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
    this.notifyListeners();
  }

  public subscribe(callback: (jobs: BackgroundTranslationJob[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllJobs());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const list = this.getAllJobs();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('Error in job listener callback:', err);
      }
    });
  }

  public getAllJobs(): BackgroundTranslationJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getActiveJobs(): BackgroundTranslationJob[] {
    return this.getAllJobs().filter(
      (j) => j.status === 'running' || j.status === 'paused' || j.status === 'queued'
    );
  }

  public getJob(id: string): BackgroundTranslationJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Start polling server for background jobs
   */
  public startServerSyncPolling() {
    if (this.pollInterval) return;
    this.syncWithServerJobs();
    this.pollInterval = setInterval(() => {
      this.syncWithServerJobs();
    }, 3000);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncWithServerJobs();
      });
    }
  }

  /**
   * Sync active server jobs into client store with multi-device reconciliation
   */
  public async syncWithServerJobs() {
    try {
      // If any local job is missing chapters, request full job data
      const needsFullData = Array.from(this.jobs.values()).some(
        (j) => !j.chapters || j.chapters.length === 0
      );
      const endpoint = needsFullData ? '/api/translation/server-jobs?full=true' : '/api/translation/server-jobs';

      const res = await fetch(endpoint);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        let changed = false;
        const now = Date.now();
        const serverJobIds = new Set(data.jobs.map((j: any) => j.id));
        const serverNovelIds = new Set(data.jobs.map((j: any) => j.novelId).filter(Boolean));

        // Clean up stale local placeholder jobs ONLY if they have exceeded the 120s grace period and are not on the server
        for (const [jobId, localJob] of Array.from(this.jobs.entries())) {
          const isRecent = (now - (localJob.createdAt || 0)) < 120000;
          if (!isRecent && !serverJobIds.has(jobId) && (localJob.isServerJob || serverNovelIds.has(localJob.novelId))) {
            this.jobs.delete(jobId);
            changed = true;
          }
        }

        for (const serverJob of data.jobs) {
          // Find any existing job entry by server ID or matching novelId
          let prev = this.jobs.get(serverJob.id);
          if (!prev) {
            // Check if there's a temporary optimistic job for the same novel
            for (const [localId, localJob] of Array.from(this.jobs.entries())) {
              if (localJob.novelId === serverJob.novelId) {
                prev = localJob;
                // Clean up the temporary ID to avoid duplicates
                if (localId !== serverJob.id) {
                  this.jobs.delete(localId);
                  changed = true;
                }
                break;
              }
            }
          }

          const wasCompleted = prev?.status === 'completed';
          const isNowCompleted = serverJob.status === 'completed';

          const existingChapters = (prev?.chapters && prev.chapters.length > 0) ? prev.chapters : [];
          const serverChapters = Array.isArray(serverJob.chapters) && serverJob.chapters.length > 0 ? serverJob.chapters : [];

          // Monotonic progress guarantee: never regress in completed chapters or percentage
          const safeCompleted = Math.max(serverJob.completedChapters || 0, prev?.completedChapters || 0);
          const safePercent = Math.max(serverJob.currentProgressPercent || 0, prev?.currentProgressPercent || 0);

          const clientJob: BackgroundTranslationJob = {
            id: serverJob.id,
            novelId: serverJob.novelId,
            novelTitle: serverJob.novelTitle,
            author: serverJob.author,
            genre: serverJob.genre,
            synopsis: serverJob.synopsis,
            coverGradient: serverJob.coverGradient,
            price: serverJob.price,
            pricePerChapter: serverJob.pricePerChapter,
            isPriceLocked: serverJob.isPriceLocked,
            targetLang: serverJob.targetLang,
            engine: serverJob.engine,
            status: serverJob.status,
            totalChapters: serverJob.totalChapters,
            completedChapters: safeCompleted,
            currentChapterIndex: serverJob.currentChapterIndex,
            currentChapterTitle: serverJob.currentChapterTitle,
            currentProgressPercent: safePercent,
            isServerJob: true,
            createdAt: serverJob.createdAt || prev?.createdAt || now,
            updatedAt: Math.max(serverJob.updatedAt || now, prev?.updatedAt || 0),
            error: serverJob.error,
            chapters: serverChapters.length > 0 ? serverChapters : existingChapters,
          };

          if (
            !prev ||
            prev.id !== serverJob.id ||
            prev.updatedAt !== serverJob.updatedAt ||
            prev.completedChapters !== safeCompleted ||
            prev.status !== serverJob.status ||
            prev.currentProgressPercent !== safePercent
          ) {
            this.jobs.set(serverJob.id, clientJob);
            changed = true;

            // If job transitioned to completed, notify UI and trigger completion celebration
            if (!wasCompleted && isNowCompleted) {
              try {
                window.dispatchEvent(
                  new CustomEvent('novelTranslationCompleted', {
                    detail: {
                      novelId: clientJob.novelId,
                      novelTitle: clientJob.novelTitle,
                      totalChapters: clientJob.totalChapters,
                    },
                  })
                );
              } catch {}

              // Refresh full storage state from server so all translated chapters appear in store immediately
              this.refreshFullNovelsFromServer();
            } else if (clientJob.completedChapters > (prev?.completedChapters || 0)) {
              // Periodically refresh custom novels from server so store reflects newly translated chapters
              this.refreshFullNovelsFromServer();
            }
          }
        }

        if (changed) {
          this.persistJobs();
        }
      }

      // Stalled worker auto-recovery watchdog ONLY for truly client-side (non-server) jobs
      for (const [id, j] of this.jobs.entries()) {
        if (!j.isServerJob && j.status === 'running') {
          if (!this.activeWorkers.get(id)) {
            console.info(`[BackgroundTranslator] Auto-reviving stalled client job ${id}...`);
            this.runJob(id);
          }
        }
      }
    } catch {}
  }

  /**
   * Refresh authoritative custom novels list from server
   */
  public async refreshFullNovelsFromServer() {
    try {
      const res = await fetch('/api/storage/full-state');
      if (res.ok) {
        const state = await res.json();
        const serverCustomNovels = state.database?.customNovels || state.customNovels;
        if (state.success && Array.isArray(serverCustomNovels)) {
          saveCustomWebNovels(serverCustomNovels);
          try {
            window.dispatchEvent(
              new CustomEvent('customNovelsUpdated', {
                detail: { novels: serverCustomNovels },
              })
            );
          } catch {}
        }
      }
    } catch {}
  }

  /**
   * Start a translation job on the server (True background persistence across page closes)
   */
  public async startServerJob(params: {
    novelId?: string;
    novelTitle: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    coverGradient?: string;
    price?: number;
    pricePerChapter?: number;
    isPriceLocked?: boolean;
    chapters: {
      id?: string;
      title: string;
      content: string;
      chapterNumber: number;
      sourceFileName?: string;
      isTranslated?: boolean;
    }[];
    targetLang: 'fa' | 'ar' | 'en';
    engine: 'free' | 'ai';
  }): Promise<string> {
    const novelId = params.novelId || `custom-novel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tempJobId = `srv-job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const normalizedChapters = params.chapters.map((ch, idx) => ({
      id: ch.id || `ch-${novelId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
      title: ch.title || `فصل ${idx + 1}`,
      content: ch.content,
      chapterNumber: ch.chapterNumber || idx + 1,
      sourceFileName: ch.sourceFileName,
      isTranslated: Boolean(ch.isTranslated),
    }));

    const optimisticJob: BackgroundTranslationJob = {
      id: tempJobId,
      novelId,
      novelTitle: params.novelTitle,
      author: params.author || 'ناشناس',
      genre: params.genre || 'عمومی',
      synopsis: params.synopsis || 'رمان در حال ترجمه در پس‌زمینه سرور...',
      coverGradient: params.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
      price: params.price ?? 2,
      pricePerChapter: params.pricePerChapter ?? 2,
      isPriceLocked: params.isPriceLocked ?? true,
      targetLang: params.targetLang,
      engine: params.engine,
      status: 'running',
      totalChapters: normalizedChapters.length,
      completedChapters: normalizedChapters.filter((c) => c.isTranslated).length,
      currentChapterIndex: 0,
      currentChapterTitle: normalizedChapters[0]?.title || '',
      isServerJob: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chapters: normalizedChapters,
    };

    this.jobs.set(tempJobId, optimisticJob);
    this.persistJobs();

    try {
      const res = await fetch('/api/translation/server-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          novelTitle: params.novelTitle,
          author: params.author,
          genre: params.genre,
          synopsis: params.synopsis,
          coverGradient: params.coverGradient,
          price: params.price,
          pricePerChapter: params.pricePerChapter,
          isPriceLocked: params.isPriceLocked,
          targetLang: params.targetLang,
          engine: params.engine,
          aiKeys: getStoredSectionAIKeys('translationAI'),
          chapters: normalizedChapters,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          this.jobs.delete(tempJobId);
          this.jobs.set(data.job.id, {
            ...data.job,
            chapters: normalizedChapters,
            isServerJob: true,
          });
          this.persistJobs();
          return data.job.id;
        } else {
          throw new Error(data.error || 'سرور درخواست ترجمه را نپذیرفت');
        }
      } else {
        throw new Error(`خطای سرور: ${res.status}`);
      }
    } catch (e) {
      console.warn('Failed to start server translation job, falling back to local runner:', e);
      optimisticJob.isServerJob = false;
      this.persistJobs();
      this.runJob(tempJobId);
    }

    return tempJobId;
  }

  /**
   * Start or queue a new client-side background novel translation job
   */
  public startNewJob(params: {
    novelId?: string;
    novelTitle: string;
    author?: string;
    genre?: string;
    synopsis?: string;
    coverGradient?: string;
    price?: number;
    pricePerChapter?: number;
    isPriceLocked?: boolean;
    chapters: {
      id?: string;
      title: string;
      content: string;
      chapterNumber: number;
      sourceFileName?: string;
      isTranslated?: boolean;
    }[];
    targetLang: 'fa' | 'ar' | 'en';
    engine: 'free' | 'ai';
    runOnServer?: boolean;
  }): string {
    if (params.runOnServer !== false) {
      this.startServerJob(params);
      return `srv-job-${Date.now()}`;
    }

    const novelId = params.novelId || `custom-novel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const jobId = `job-trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const normalizedChapters = params.chapters.map((ch, idx) => ({
      id: ch.id || `ch-${novelId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
      title: ch.title || `فصل ${idx + 1}`,
      content: ch.content,
      chapterNumber: ch.chapterNumber || (idx + 1),
      sourceFileName: ch.sourceFileName,
      isTranslated: Boolean(ch.isTranslated),
    }));

    const job: BackgroundTranslationJob = {
      id: jobId,
      novelId,
      novelTitle: params.novelTitle,
      author: params.author || 'ناشناس',
      genre: params.genre || 'سیستم و تناسخ',
      synopsis: params.synopsis || 'رمان در حال ترجمه و بارگذاری خودکار...',
      coverGradient: params.coverGradient || 'from-blue-600 via-indigo-700 to-purple-900',
      price: params.price ?? 2,
      pricePerChapter: params.pricePerChapter ?? 2,
      isPriceLocked: params.isPriceLocked ?? true,
      targetLang: params.targetLang,
      engine: params.engine,
      status: 'running',
      totalChapters: normalizedChapters.length,
      completedChapters: normalizedChapters.filter((c) => c.isTranslated).length,
      currentChapterIndex: 0,
      currentChapterTitle: normalizedChapters[0]?.title || '',
      isServerJob: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chapters: normalizedChapters,
    };

    this.jobs.set(jobId, job);
    this.persistJobs();
    // Do NOT publish novel to store until translation is completed!

    this.runJob(jobId);
    return jobId;
  }

  /**
   * Offload an existing or active job to the server for continuous processing
   */
  public async offloadToServer(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Pause local worker
    this.pauseJob(jobId);

    try {
      const res = await fetch('/api/translation/server-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          chapters: job.chapters,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.job) {
          this.jobs.delete(jobId);
          this.jobs.set(data.job.id, {
            ...data.job,
            isServerJob: true,
          });
          this.persistJobs();
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to offload job to server:', e);
    }
    return false;
  }

  /**
   * Progressive sync of translated chapters into customNovels in localStorage and server
   */
  public syncNovelToStorage(job: BackgroundTranslationJob) {
    try {
      const existing = getCustomWebNovels();
      const existingIdx = existing.findIndex((n) => n.id === job.novelId);

      // Under NO circumstances should an untranslated or in-progress novel be published to the store
      if (existingIdx < 0) {
        if (job.status !== 'completed' || job.completedChapters === 0) {
          return;
        }
      }

      // Resolve proper, informative synopsis when translating/completed, never retaining a placeholder
      let resolvedSynopsis = job.synopsis || '';
      if (isPlaceholderSynopsis(resolvedSynopsis)) {
        const lang = job.targetLang === 'ar' ? 'ar' : job.targetLang === 'en' ? 'en' : 'fa';
        resolvedSynopsis = resolveNovelSynopsis(
          {
            title: job.novelTitle,
            author: job.author,
            genre: job.genre,
            synopsis: job.synopsis,
            chapters: job.chapters,
          },
          lang
        );
        job.synopsis = resolvedSynopsis;
      }

      const novelObj: WebNovel = {
        id: job.novelId,
        title: job.novelTitle,
        author: job.author,
        genre: job.genre || 'عمومی',
        synopsis: resolvedSynopsis,
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
          isTranslated: c.isTranslated ?? false,
        })),
        isDefault: false,
        uploadedAt: new Date().toISOString(),
      };

      let updatedList: WebNovel[];
      if (existingIdx >= 0) {
        updatedList = [...existing];
        updatedList[existingIdx] = novelObj;
      } else {
        updatedList = [novelObj, ...existing];
      }

      saveCustomWebNovels(updatedList);

      try {
        window.dispatchEvent(new CustomEvent('customNovelsUpdated', { detail: { novels: updatedList } }));
      } catch {}
    } catch (e) {
      console.warn('Error syncing novel progress to storage:', e);
    }
  }

  /**
   * Run translation loop with parallel workers and multi-pass recovery (Client worker)
   */
  private async runJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running' || job.isServerJob) return;
    if (this.activeWorkers.get(jobId)) return;

    this.activeWorkers.set(jobId, true);
    const abortCtrl = new AbortController();
    this.abortControllers.set(jobId, abortCtrl);

    const concurrency = job.engine === 'free' ? 2 : 2;
    const chapters = job.chapters;

    try {
      // Multi-pass execution: Pass 1 (all uncompleted), Pass 2 (retry failures), Pass 3 (final retry)
      for (let pass = 1; pass <= 3; pass++) {
        const curJob = this.jobs.get(jobId);
        if (!curJob || curJob.status !== 'running' || abortCtrl.signal.aborted) break;

        const uncompletedIndices: number[] = [];
        for (let i = 0; i < chapters.length; i++) {
          if (!chapters[i].isTranslated) {
            uncompletedIndices.push(i);
          }
        }

        if (uncompletedIndices.length === 0) {
          // All chapters translated!
          break;
        }

        if (pass > 1) {
          console.info(`[BackgroundTranslator] Job ${jobId} starting retry pass #${pass} for ${uncompletedIndices.length} remaining chapters...`);
          await new Promise((r) => setTimeout(r, 1000 * pass));
        }

        let cursor = 0;
        const worker = async () => {
          while (cursor < uncompletedIndices.length) {
            const currentJob = this.jobs.get(jobId);
            if (!currentJob || currentJob.status !== 'running' || abortCtrl.signal.aborted) {
              break;
            }

            const targetIdx = uncompletedIndices[cursor++];
            if (targetIdx === undefined) break;
            const ch = chapters[targetIdx];
            if (!ch || ch.isTranslated) continue;

            currentJob.currentChapterIndex = targetIdx;
            currentJob.currentChapterTitle = ch.title;
            currentJob.updatedAt = Date.now();
            this.persistJobs();

            try {
              const res = await translateNovelChapter(ch.content, ch.title, {
                engine: currentJob.engine,
                targetLang: currentJob.targetLang,
              });

              if (res.success && res.content) {
                ch.content = res.content;
                if (res.title) {
                  ch.title = res.title;
                }
                ch.isTranslated = true;

                if (res.failoverOccurred) {
                  currentJob.failoverOccurred = true;
                  currentJob.failoverReason = res.failoverReason;
                  currentJob.engineUsed = res.engineUsed;
                }
              } else {
                ch.isTranslated = false;
                if (res.errorDetails) {
                  currentJob.errorDetails = res.errorDetails;
                  currentJob.error = res.error;
                }
              }

              currentJob.completedChapters = chapters.filter((c) => c.isTranslated).length;
              currentJob.currentProgressPercent = Math.min(
                99,
                Math.max(1, Math.round((currentJob.completedChapters / currentJob.totalChapters) * 100))
              );
              currentJob.updatedAt = Date.now();

              this.syncNovelToStorage(currentJob);
              this.persistJobs();

              // Safe delay between chapters to avoid rate limits
              await new Promise((r) => setTimeout(r, 150));
            } catch (err: any) {
              console.warn(`[BackgroundTranslator] Pass #${pass} error translating chapter ${targetIdx + 1}:`, err);
              if (err?.details) {
                currentJob.errorDetails = err.details;
                currentJob.error = err.message;
              }
            }
          }
        };

        const workers = Array.from({ length: Math.min(concurrency, uncompletedIndices.length) }, () => worker());
        await Promise.all(workers);
      }

      const finalJob = this.jobs.get(jobId);
      if (finalJob && finalJob.status === 'running' && !abortCtrl.signal.aborted) {
        const translatedCount = finalJob.chapters.filter((c) => c.isTranslated).length;
        const allDone = translatedCount === finalJob.totalChapters;

        if (allDone) {
          finalJob.status = 'completed';
          finalJob.completedChapters = finalJob.totalChapters;
          finalJob.currentProgressPercent = 100;
          if (isPlaceholderSynopsis(finalJob.synopsis)) {
            const lang = finalJob.targetLang === 'ar' ? 'ar' : finalJob.targetLang === 'en' ? 'en' : 'fa';
            finalJob.synopsis = resolveNovelSynopsis(
              {
                title: finalJob.novelTitle,
                author: finalJob.author,
                genre: finalJob.genre,
                synopsis: finalJob.synopsis,
                chapters: finalJob.chapters,
              },
              lang
            );
          }
          finalJob.updatedAt = Date.now();
          this.syncNovelToStorage(finalJob);
          this.persistJobs();

          try {
            window.dispatchEvent(
              new CustomEvent('novelTranslationCompleted', {
                detail: {
                  novelId: finalJob.novelId,
                  novelTitle: finalJob.novelTitle,
                  totalChapters: finalJob.totalChapters,
                },
              })
            );
          } catch {}
        } else if (translatedCount === 0) {
          finalJob.status = 'error';
          finalJob.error = finalJob.error || 'هر دو روش ترجمه (وب و هوش مصنوعی) با شکست مواجه شدند.\n• لطفاً اتصال اینترنت و کلیدهای هوش مصنوعی را در تنظیمات بررسی کنید.';
          finalJob.updatedAt = Date.now();
          this.persistJobs();
          return;
        } else if (translatedCount >= Math.ceil(finalJob.totalChapters * 0.6)) {
          // More than 60% translated - complete so user can access and read
          finalJob.status = 'completed';
          finalJob.completedChapters = translatedCount;
          finalJob.currentProgressPercent = 100;
          if (isPlaceholderSynopsis(finalJob.synopsis)) {
            const lang = finalJob.targetLang === 'ar' ? 'ar' : finalJob.targetLang === 'en' ? 'en' : 'fa';
            finalJob.synopsis = resolveNovelSynopsis(
              {
                title: finalJob.novelTitle,
                author: finalJob.author,
                genre: finalJob.genre,
                synopsis: finalJob.synopsis,
                chapters: finalJob.chapters,
              },
              lang
            );
          }
          finalJob.updatedAt = Date.now();
          this.syncNovelToStorage(finalJob);
          this.persistJobs();
        } else {
          // Partial progress, set to paused with clear resume prompt so it's not stuck
          finalJob.status = 'paused';
          finalJob.completedChapters = translatedCount;
          finalJob.currentProgressPercent = Math.round((translatedCount / finalJob.totalChapters) * 100);
          finalJob.error = finalJob.error || `ترجمه تا فصل ${translatedCount} از ${finalJob.totalChapters} انجام شد. برای تکمیل بقیه فصول دکمه «ادامه» را بزنید.`;
          finalJob.updatedAt = Date.now();
          this.syncNovelToStorage(finalJob);
          this.persistJobs();
        }
      }
    } catch (e: any) {
      const j = this.jobs.get(jobId);
      if (j && !abortCtrl.signal.aborted) {
        j.status = 'error';
        j.error = e?.message || 'خطا در ترجمه پس‌زمینه';
        j.updatedAt = Date.now();
        this.persistJobs();
      }
    } finally {
      this.activeWorkers.delete(jobId);
      this.abortControllers.delete(jobId);
    }
  }

  public async pauseJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.isServerJob) {
      try {
        await fetch(`/api/translation/server-jobs/${jobId}/pause`, { method: 'POST' });
      } catch {}
    }

    job.status = 'paused';
    job.updatedAt = Date.now();
    const ctrl = this.abortControllers.get(jobId);
    if (ctrl) {
      ctrl.abort();
      this.abortControllers.delete(jobId);
    }
    this.activeWorkers.delete(jobId);
    this.persistJobs();
  }

  public async resumeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.isServerJob) {
      try {
        const res = await fetch(`/api/translation/server-jobs/${jobId}/resume`, { method: 'POST' });
        if (!res.ok) throw new Error(`Server resume HTTP ${res.status}`);
        await this.syncWithServerJobs();
        return;
      } catch (err) {
        console.warn(`[BackgroundTranslator] Failed to resume on server, falling back to local runner:`, err);
        job.isServerJob = false;
      }
    }

    job.status = 'running';
    job.error = undefined;
    job.updatedAt = Date.now();
    this.persistJobs();
    this.runJob(jobId);
  }

  public async forceRetryJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const ctrl = this.abortControllers.get(jobId);
    if (ctrl) {
      ctrl.abort();
      this.abortControllers.delete(jobId);
    }
    this.activeWorkers.delete(jobId);

    if (job.isServerJob) {
      try {
        const res = await fetch(`/api/translation/server-jobs/${jobId}/resume`, { method: 'POST' });
        if (!res.ok) throw new Error(`Server retry HTTP ${res.status}`);
        await this.syncWithServerJobs();
        return;
      } catch (err) {
        console.warn(`[BackgroundTranslator] Failed to retry on server, falling back to local runner:`, err);
        job.isServerJob = false;
      }
    }

    job.status = 'running';
    job.error = undefined;
    job.updatedAt = Date.now();
    this.persistJobs();
    this.runJob(jobId);
  }

  public async cancelJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (job.isServerJob) {
      try {
        await fetch(`/api/translation/server-jobs/${jobId}`, { method: 'DELETE' });
      } catch {}
    }

    job.status = 'cancelled';
    job.updatedAt = Date.now();
    const ctrl = this.abortControllers.get(jobId);
    if (ctrl) {
      ctrl.abort();
      this.abortControllers.delete(jobId);
    }
    this.activeWorkers.delete(jobId);
    this.persistJobs();
  }

  public async removeJob(jobId: string) {
    await this.cancelJob(jobId);
    this.jobs.delete(jobId);
    this.persistJobs();
  }
}

export const backgroundNovelTranslator = new BackgroundNovelTranslationManager();
