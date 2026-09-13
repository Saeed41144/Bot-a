// Safe Storage Wrapper with memory fallback for iframe / cross-origin sandbox compatibility

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const memoryFallback = new MemoryStorage();

// Probe once whether localStorage is permitted in the current context
let isLocalStorageAllowed = false;
try {
  if (typeof window !== 'undefined' && 'localStorage' in window) {
    const testKey = '__lally_test_storage__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    isLocalStorageAllowed = true;
  }
} catch {
  isLocalStorageAllowed = false;
}

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (isLocalStorageAllowed) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch (err: any) {
        if (err?.name === 'SecurityError') {
          isLocalStorageAllowed = false;
        }
      }
    }
    return memoryFallback.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    if (isLocalStorageAllowed) {
      try {
        window.localStorage.setItem(key, value);
      } catch (err: any) {
        // If quota exceeded or security error, do not disable localStorage globally unless security error
        if (err?.name === 'SecurityError') {
          isLocalStorageAllowed = false;
        } else {
          console.warn(`[SafeStorage] LocalStorage write failed for key "${key}" (likely quota exceeded), fallback to memory:`, err?.message || err);
        }
      }
    }
    memoryFallback.setItem(key, value);
  },

  removeItem: (key: string): void => {
    if (isLocalStorageAllowed) {
      try {
        window.localStorage.removeItem(key);
      } catch (err: any) {
        if (err?.name === 'SecurityError') {
          isLocalStorageAllowed = false;
        }
      }
    }
    memoryFallback.removeItem(key);
  },
};

