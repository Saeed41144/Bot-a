// Safe DOM utilities for handling clipboard, fullscreen, and cross-origin iframe security restrictions

/**
 * Safely copy text to clipboard without throwing uncaught SecurityErrors in iframes
 */
export async function safeClipboardCopy(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard API might be blocked by iframe permissions policy (SecurityError / NotAllowedError)
  }

  // 2. Fallback to textarea + execCommand
  try {
    if (typeof document !== 'undefined' && document.body) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      let successful = false;
      try {
        successful = document.execCommand('copy');
      } catch {
        successful = false;
      }
      
      try {
        document.body.removeChild(textarea);
      } catch {}

      return successful;
    }
  } catch {
    // Ignore DOM fallback errors
  }

  return false;
}

/**
 * Safely check if document is in fullscreen mode
 */
export function safeIsFullscreen(): boolean {
  try {
    if (typeof document !== 'undefined') {
      return Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
    }
  } catch {
    // Cross-origin restriction
  }
  return false;
}

/**
 * Safely request fullscreen for an element
 */
export async function safeRequestFullscreen(element: HTMLElement | null): Promise<boolean> {
  if (!element) return false;
  try {
    if (typeof element.requestFullscreen === 'function') {
      await element.requestFullscreen();
      return true;
    } else if (typeof (element as any).webkitRequestFullscreen === 'function') {
      (element as any).webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Request fullscreen not allowed or rejected
  }
  return false;
}

/**
 * Safely check if system prefers dark mode
 */
export function safeMatchMediaDark(): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch {
    // Cross-origin restriction
  }
  return false;
}

export async function safeExitFullscreen(): Promise<boolean> {
  try {
    if (typeof document !== 'undefined' && safeIsFullscreen()) {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
        return true;
      } else if (typeof (document as any).webkitExitFullscreen === 'function') {
        (document as any).webkitExitFullscreen();
        return true;
      }
    }
  } catch {
    // Exit fullscreen rejected
  }
  return false;
}
