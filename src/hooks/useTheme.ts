import { useCallback, useEffect, useState } from 'react';

// index.html's inline script already applied the right class before React
// even loaded (localStorage 'theme' if set, else OS preference) -- read
// that back instead of recomputing it, so the two can never disagree.
function getInitialIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

export function useTheme() {
  const [isDark, setIsDark] = useState(getInitialIsDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Only persists an explicit choice on an actual toggle click -- until then,
  // a returning visitor keeps following their OS theme, not a value we wrote
  // for them on their very first page load.
  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        // Storage can be unavailable in privacy-restricted browsers.
      }
      return next;
    });
  }, []);

  return { isDark, toggleTheme };
}
