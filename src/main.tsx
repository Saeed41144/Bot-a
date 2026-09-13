import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent unhandled cross-origin frame SecurityErrors from breaking iframe execution
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('error', (event) => {
      const msg = event?.message || '';
      if (
        msg.includes('cross-origin') ||
        msg.includes('SecurityError') ||
        msg.includes('Blocked a frame')
      ) {
        event.preventDefault?.();
        return true;
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || '');
      if (
        msg.includes('cross-origin') ||
        msg.includes('SecurityError') ||
        msg.includes('Blocked a frame') ||
        reason?.name === 'SecurityError'
      ) {
        event.preventDefault?.();
      }
    });
  } catch {
    // Ignore listener registration errors
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

