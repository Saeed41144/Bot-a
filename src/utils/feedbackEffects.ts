import confetti from 'canvas-confetti';
import { safeStorage } from './safeStorage';
import { playCustomPomodoroSound, stopCustomPomodoroSound, setCustomPomodoroSoundVolume } from './pomodoroSoundManager';

/**
 * Web Audio API based chime sounds (no external audio files required, 100% offline & fast)
 */
let audioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Auto-unlock AudioContext on user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

function runWithAudioContext(fn: (ctx: AudioContext) => void) {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        try {
          fn(ctx);
        } catch {
          // Ignore
        }
      }).catch(() => {});
    } else {
      fn(ctx);
    }
  } catch {
    // Ignore audio failures
  }
}

/**
 * Plays a modern, crisp and pleasant acoustic check-in chime (two-note ascending bell ping)
 */
export function playCheckinSound() {
  runWithAudioContext((ctx) => {
    const now = ctx.currentTime;

    // Master gain for comfort & clarity
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.32, now);
    masterGain.connect(ctx.destination);

    // Note 1: First bell tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.008);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2: Harmonic higher bell note (1318.5 Hz - E6) played with a slight delay
    const note2Time = now + 0.065;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, note2Time);

    gain2.gain.setValueAtTime(0.001, note2Time);
    gain2.gain.linearRampToValueAtTime(0.85, note2Time + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, note2Time + 0.35);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start(note2Time);
    osc2.stop(note2Time + 0.38);
  });
}

/**
 * Plays a celebratory chord chime for 100% completion
 */
export function playCelebrationSound() {
  runWithAudioContext((ctx) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 Major Chord
    notes.forEach((freq, index) => {
      const now = ctx.currentTime + index * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    });
  });
}

/**
 * Triggers subtle haptic vibration on mobile devices
 */
export function triggerHapticFeedback(pattern: number | number[] = 25) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore
  }
}

/**
 * Fires confetti celebration
 */
export function triggerCelebrationConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'],
      ticks: 200,
      zIndex: 9999,
    });
  } catch {
    // Ignore
  }
}

/**
 * Plays a pleasant, resonant Tibetan/Zen bowl focus completion chime (two rich harmonic tones)
 */
export function playPomodoroBellSound() {
  runWithAudioContext((ctx) => {
    const now = ctx.currentTime;
    const frequencies = [587.33, 880.0, 1174.66, 1760.0]; // D5, A5, D6, A6 harmonics

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const peakGain = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 1.8 + idx * 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.2);
    });
  });
}

/**
 * Plays an uplifting chime for break completion / return to focus
 */
export function playBreakCompleteSound() {
  runWithAudioContext((ctx) => {
    const notes = [440, 554.37, 659.25, 880]; // A Major Arpeggio (A4, C#5, E5, A5)
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  });
}

/**
 * Plays a very subtle mechanical tick for clock pacing
 */
export function playTickSound() {
  runWithAudioContext((ctx) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  });
}

// Ambient Audio Handlers
let activeSynthNodes: {
  stop: () => void;
  gainNode: GainNode;
} | null = null;

export function stopAmbientSound() {
  try {
    // 1. Stop custom file audio
    stopCustomPomodoroSound();

    // 2. Stop procedural synthesizer
    if (activeSynthNodes) {
      activeSynthNodes.stop();
      activeSynthNodes = null;
    }
  } catch (err) {
    console.warn('Error stopping ambient sound:', err);
  }
}

export function startAmbientSound(
  soundId: string,
  volume: number = 0.35
) {
  // Always stop previous ambient sound cleanly
  stopAmbientSound();

  if (!soundId || soundId === 'none' || soundId === 'off') {
    return;
  }

  const safeVolume = Math.max(0.01, Math.min(1.0, volume));

  // Procedural Web Audio Synths
  if (['whitenoise', 'rain', 'deep_focus', 'ocean_waves', 'forest_stream'].includes(soundId)) {
    runWithAudioContext((ctx) => {
      try {
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(safeVolume * 0.45, ctx.currentTime + 0.5);
        masterGain.connect(ctx.destination);

        const stopCallbacks: (() => void)[] = [];

        if (soundId === 'whitenoise' || soundId === 'rain' || soundId === 'forest_stream' || soundId === 'ocean_waves') {
          // Generate 4-second looping pink/brown noise buffer
          const bufferSize = ctx.sampleRate * 4;
          const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
          }

          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          noiseSource.loop = true;

          const filter = ctx.createBiquadFilter();
          if (soundId === 'rain') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(900, ctx.currentTime);
          } else if (soundId === 'forest_stream') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, ctx.currentTime);
            filter.Q.setValueAtTime(0.7, ctx.currentTime);
          } else if (soundId === 'ocean_waves') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(450, ctx.currentTime);
            // LFO for wave swelling
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 sec wave period
            lfoGain.gain.setValueAtTime(250, ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();
            stopCallbacks.push(() => {
              try { lfo.stop(); lfo.disconnect(); lfoGain.disconnect(); } catch {}
            });
          } else {
            // whitenoise
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2800, ctx.currentTime);
          }

          noiseSource.connect(filter);
          filter.connect(masterGain);
          noiseSource.start();

          stopCallbacks.push(() => {
            try { noiseSource.stop(); noiseSource.disconnect(); filter.disconnect(); } catch {}
          });
        } else if (soundId === 'deep_focus') {
          // Dual binaural drone (196 Hz and 200 Hz with rich harmonics)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const osc3 = ctx.createOscillator();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(108, ctx.currentTime);

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(112, ctx.currentTime); // 4Hz theta wave beat

          osc3.type = 'triangle';
          osc3.frequency.setValueAtTime(216, ctx.currentTime);

          const gain1 = ctx.createGain(); gain1.gain.setValueAtTime(0.4, ctx.currentTime);
          const gain2 = ctx.createGain(); gain2.gain.setValueAtTime(0.4, ctx.currentTime);
          const gain3 = ctx.createGain(); gain3.gain.setValueAtTime(0.15, ctx.currentTime);

          osc1.connect(gain1); gain1.connect(masterGain);
          osc2.connect(gain2); gain2.connect(masterGain);
          osc3.connect(gain3); gain3.connect(masterGain);

          osc1.start(); osc2.start(); osc3.start();

          stopCallbacks.push(() => {
            try {
              osc1.stop(); osc2.stop(); osc3.stop();
              osc1.disconnect(); osc2.disconnect(); osc3.disconnect();
              gain1.disconnect(); gain2.disconnect(); gain3.disconnect();
            } catch {}
          });
        }

        activeSynthNodes = {
          gainNode: masterGain,
          stop: () => {
            try {
              masterGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
              setTimeout(() => {
                stopCallbacks.forEach((cb) => cb());
                try { masterGain.disconnect(); } catch {}
              }, 200);
            } catch {
              stopCallbacks.forEach((cb) => cb());
            }
          },
        };
      } catch (err) {
        console.warn('Failed to start procedural ambient synth:', err);
      }
    });
    return;
  }

  // Play custom uploaded sound track
  playCustomPomodoroSound(soundId, volume);
}

/**
 * Calculates used localStorage size in KB
 */
export function getLocalStorageStats(): {
  totalBytes: number;
  formattedSize: string;
  totalKeys: number;
} {
  try {
    let total = 0;
    let keysCount = 0;
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const val = window.localStorage.getItem(key) || '';
          total += key.length * 2 + val.length * 2;
          keysCount++;
        }
      }
    }
    const formatted = total > 1024 * 1024 
      ? `${(total / (1024 * 1024)).toFixed(2)} MB` 
      : total > 1024 
      ? `${(total / 1024).toFixed(1)} KB` 
      : `${total} Bytes`;

    return { totalBytes: total, formattedSize: formatted, totalKeys: keysCount };
  } catch {
    return { totalBytes: 0, formattedSize: '0 KB', totalKeys: 0 };
  }
}

/**
 * Optimizes local storage by re-serializing JSON cleanly
 */
export function optimizeLocalStorage() {
  try {
    const keys = ['lally_habits_data_v1', 'lally_telegram_v1', 'lally_reward_wallet_v1', 'lally_custom_novels_v1', 'lally_advanced_settings_v1'];
    keys.forEach((k) => {
      const item = safeStorage.getItem(k);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          safeStorage.setItem(k, JSON.stringify(parsed));
        } catch {
          // Keep as is
        }
      }
    });
    return true;
  } catch {
    return false;
  }
}
