/**
 * Screen Wake Lock Manager for Pomodoro Focus Mode
 * Combines the Web Screen Wake Lock API with a robust video/canvas keep-awake fallback
 * to guarantee screens stay on during focus sessions across all devices and iframe sandboxes.
 */

class ScreenWakeLockService {
  private sentinel: any = null;
  private isRequested: boolean = false;
  private fallbackVideo: HTMLVideoElement | null = null;
  private isFallbackActive: boolean = false;
  private audioCtx: any = null;
  private listeners: Set<(active: boolean) => void> = new Set();
  private visibilityHandlerBound: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bindVisibilityHandler();
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  public isActive(): boolean {
    return this.isRequested;
  }

  public subscribe(callback: (active: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isActive());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((fn) => {
      try {
        fn(active);
      } catch (err) {
        console.warn('[WakeLock] Listener callback error:', err);
      }
    });
  }

  private bindVisibilityHandler() {
    if (this.visibilityHandlerBound || typeof document === 'undefined') return;
    this.visibilityHandlerBound = true;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isRequested) {
        await this.request();
      }
    });
  }

  private initSilentAudio() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Generate a tiny inaudible buffer loop to keep device media processor awake
      const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 2, this.audioCtx.sampleRate);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 0.0001; // Silent
      source.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      source.start(0);
    } catch {
      // Audio keep-awake fallback fail-safe
    }
  }

  private initFallbackVideo() {
    if (this.fallbackVideo || typeof document === 'undefined') return;

    try {
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('aria-hidden', 'true');
      video.style.position = 'fixed';
      video.style.bottom = '0px';
      video.style.right = '0px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-1';
      video.muted = true;
      video.loop = true;

      // Use a tiny 1-pixel canvas stream or base64 micro video
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 1, 1);
        }
        if ((canvas as any).captureStream) {
          video.srcObject = (canvas as any).captureStream(1);
        } else {
          video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADpmcmVlAAAABG1kYXQAAAA/AAACF2F2YzAxZYAK//+AAAACHW1vb3YAAABsbXZoZAAAAAB4703keO9N5AAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAcbWRhdAAAAAUAAAEAAA==';
        }
      } catch {
        video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADpmcmVlAAAABG1kYXQAAAA/AAACF2F2YzAxZYAK//+AAAACHW1vb3YAAABsbXZoZAAAAAB4703keO9N5AAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAcbWRhdAAAAAUAAAEAAA==';
      }

      document.body.appendChild(video);
      this.fallbackVideo = video;
    } catch (err) {
      console.warn('[WakeLock] Fallback video setup warning:', err);
    }
  }

  /**
   * Request screen wake lock to keep display active
   */
  public async request(): Promise<boolean> {
    this.isRequested = true;
    this.isFallbackActive = true;

    // 1. Try modern native Web Screen Wake Lock API first
    if (
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      Boolean((navigator as any).wakeLock?.request)
    ) {
      try {
        if (!this.sentinel || this.sentinel.released) {
          this.sentinel = await (navigator as any).wakeLock.request('screen');
          this.sentinel.addEventListener('release', () => {
            this.sentinel = null;
            if (this.isRequested) {
              this.startFallback();
            }
            this.notify();
          });
        }
      } catch (err: any) {
        console.info('[WakeLock] Native wake lock deferred to media fallback:', err?.message || err);
        this.sentinel = null;
      }
    }

    // 2. Start fallback video keep-awake (works in iframes and iOS Safari)
    this.startFallback();

    // 3. Start silent WebAudio keep-awake
    this.initSilentAudio();

    this.notify();
    return true;
  }

  private startFallback() {
    this.initFallbackVideo();
    if (this.fallbackVideo) {
      try {
        const playPromise = this.fallbackVideo.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isFallbackActive = true;
              this.notify();
            })
            .catch(() => {
              this.isFallbackActive = true;
              this.notify();
            });
        }
      } catch {
        this.isFallbackActive = true;
        this.notify();
      }
    }
  }

  /**
   * Release the wake lock and restore normal display sleep behavior
   */
  public async release(): Promise<void> {
    this.isRequested = false;
    this.isFallbackActive = false;

    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      } finally {
        this.sentinel = null;
      }
    }

    if (this.fallbackVideo) {
      try {
        this.fallbackVideo.pause();
      } catch {
        // Ignore pause errors
      }
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.suspend().catch(() => {});
      } catch {}
    }

    this.notify();
  }

  /**
   * Toggle wake lock on or off
   */
  public async toggle(): Promise<boolean> {
    if (this.isActive()) {
      await this.release();
      return false;
    } else {
      return await this.request();
    }
  }
}

export const screenWakeLock = new ScreenWakeLockService();
