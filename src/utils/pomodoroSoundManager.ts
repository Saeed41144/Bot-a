import { PomodoroCustomSound } from '../types';

const DB_NAME = 'lally_pomodoro_sounds_db';
const DB_VERSION = 1;
const STORE_NAME = 'sounds';
const LOCALSTORAGE_SOUNDS_KEY = 'lally_pomodoro_custom_sounds_v1';

// Open or create IndexedDB
function openSoundsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback to localStorage
function getLocalStorageFallback(): PomodoroCustomSound[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_SOUNDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalStorageFallback(sounds: PomodoroCustomSound[]) {
  try {
    localStorage.setItem(LOCALSTORAGE_SOUNDS_KEY, JSON.stringify(sounds));
  } catch (e) {
    console.warn('LocalStorage quota exceeded for pomodoro sounds fallback:', e);
  }
}

/**
 * Loads all custom uploaded sounds from IndexedDB (or localStorage fallback).
 */
export async function getAllCustomPomodoroSounds(): Promise<PomodoroCustomSound[]> {
  try {
    const db = await openSoundsDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        if (results.length === 0) {
          // Check fallback
          const fallback = getLocalStorageFallback();
          resolve(fallback);
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        resolve(getLocalStorageFallback());
      };
    });
  } catch {
    return getLocalStorageFallback();
  }
}

/**
 * Saves or updates a custom pomodoro sound.
 */
export async function saveCustomPomodoroSound(sound: PomodoroCustomSound): Promise<void> {
  try {
    const db = await openSoundsDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sound);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, saving to localStorage fallback:', err);
    const existing = getLocalStorageFallback();
    const idx = existing.findIndex((s) => s.id === sound.id);
    if (idx >= 0) {
      existing[idx] = sound;
    } else {
      existing.push(sound);
    }
    setLocalStorageFallback(existing);
  }

  // Notify listeners
  notifySoundsUpdated();
}

/**
 * Deletes a custom pomodoro sound by ID.
 */
export async function deleteCustomPomodoroSound(id: string): Promise<void> {
  try {
    const db = await openSoundsDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete failed, deleting from localStorage fallback:', err);
    const existing = getLocalStorageFallback();
    setLocalStorageFallback(existing.filter((s) => s.id !== id));
  }

  // Stop if currently playing
  if (activePlayingSoundId === id) {
    stopCustomPomodoroSound();
  }

  // Notify listeners
  notifySoundsUpdated();
}

/**
 * Dispatches an event to notify UI components of sounds updates.
 */
export function notifySoundsUpdated() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pomodoroCustomSoundsChanged'));
    }
  } catch {}
}

/**
 * Converts a File to Base64 string data.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Calculates audio duration in seconds.
 */
export function getAudioDuration(base64Data: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      audio.src = base64Data;
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration) || 0);
      };
      audio.onerror = () => {
        resolve(0);
      };
    } catch {
      resolve(0);
    }
  });
}

// ----------------------------------------------------
// Global Audio Playback Engine for Custom Pomodoro Ambient
// ----------------------------------------------------

let activeAudioElement: HTMLAudioElement | null = null;
let activePlayingSoundId: string | null = null;
let previewAudioElement: HTMLAudioElement | null = null;
let previewSoundId: string | null = null;

/**
 * Plays a custom Pomodoro sound in an infinite loop with specified volume.
 */
export async function playCustomPomodoroSound(soundId: string, volume: number = 0.35): Promise<boolean> {
  if (!soundId || soundId === 'none') {
    stopCustomPomodoroSound();
    return true;
  }

  const safeVolume = Math.max(0.01, Math.min(1.0, volume));

  // If already playing this exact sound, just adjust volume
  if (activeAudioElement && activePlayingSoundId === soundId && !activeAudioElement.paused) {
    activeAudioElement.volume = safeVolume;
    return true;
  }

  // Stop preview if any
  stopPreviewCustomSound();

  // Stop previous active audio
  stopCustomPomodoroSound();

  try {
    const allSounds = await getAllCustomPomodoroSounds();
    const sound = allSounds.find((s) => s.id === soundId);
    if (!sound || !sound.fileData) {
      console.warn(`Pomodoro sound with id "${soundId}" not found`);
      return false;
    }

    const audio = new Audio();
    audio.src = sound.fileData;
    audio.loop = true;
    audio.volume = safeVolume;

    // Handle play promise
    await audio.play();
    activeAudioElement = audio;
    activePlayingSoundId = soundId;
    return true;
  } catch (err) {
    console.warn('Failed to play custom pomodoro ambient audio:', err);
    return false;
  }
}

/**
 * Adjusts volume of active pomodoro audio track without restarting.
 */
export function setCustomPomodoroSoundVolume(volume: number) {
  const safeVolume = Math.max(0.01, Math.min(1.0, volume));
  if (activeAudioElement) {
    activeAudioElement.volume = safeVolume;
  }
}

/**
 * Pauses the active custom ambient sound.
 */
export function pauseCustomPomodoroSound() {
  if (activeAudioElement && !activeAudioElement.paused) {
    try {
      activeAudioElement.pause();
    } catch {}
  }
}

/**
 * Resumes the active custom ambient sound.
 */
export function resumeCustomPomodoroSound() {
  if (activeAudioElement && activeAudioElement.paused) {
    try {
      activeAudioElement.play().catch(() => {});
    } catch {}
  }
}

/**
 * Stops and clears active custom pomodoro sound.
 */
export function stopCustomPomodoroSound() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch {}
    activeAudioElement = null;
  }
  activePlayingSoundId = null;
}

/**
 * Returns currently playing sound ID (or null).
 */
export function getActivePlayingSoundId(): string | null {
  return activePlayingSoundId;
}

// ----------------------------------------------------
// Preview Sound in Settings Tab
// ----------------------------------------------------

/**
 * Plays a preview of a custom sound in settings.
 */
export function previewCustomSound(
  sound: PomodoroCustomSound,
  onEnd?: () => void
): { stop: () => void; isPlaying: () => boolean } {
  // If already previewing this sound, stop it
  if (previewAudioElement && previewSoundId === sound.id) {
    stopPreviewCustomSound();
    if (onEnd) onEnd();
    return {
      stop: stopPreviewCustomSound,
      isPlaying: () => false,
    };
  }

  stopPreviewCustomSound();

  try {
    const audio = new Audio();
    audio.src = sound.fileData;
    audio.loop = false;
    audio.volume = 0.7;

    audio.onended = () => {
      stopPreviewCustomSound();
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      stopPreviewCustomSound();
      if (onEnd) onEnd();
    };

    audio.play().catch(() => {
      stopPreviewCustomSound();
      if (onEnd) onEnd();
    });

    previewAudioElement = audio;
    previewSoundId = sound.id;

    return {
      stop: stopPreviewCustomSound,
      isPlaying: () => !audio.paused,
    };
  } catch {
    if (onEnd) onEnd();
    return {
      stop: stopPreviewCustomSound,
      isPlaying: () => false,
    };
  }
}

/**
 * Stops any active preview sound.
 */
export function stopPreviewCustomSound() {
  if (previewAudioElement) {
    try {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
      previewAudioElement.src = '';
    } catch {}
    previewAudioElement = null;
  }
  previewSoundId = null;
}

export function getPreviewingSoundId(): string | null {
  return previewSoundId;
}
