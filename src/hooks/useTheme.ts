import { useState, useEffect, useCallback, useRef } from 'react';

interface UseThemeOptions {
  /**
   * When true, this hook will NOT read or write localStorage.
   * Use this for authenticated users where the theme is owned by
   * the cloud customization record (prevents cross-account pollution
   * and prevents stale local values from overwriting cloud state).
   */
  cloudMode?: boolean;
}

export function useTheme(options?: UseThemeOptions) {
  const cloudMode = options?.cloudMode ?? false;
  const cloudModeRef = useRef(cloudMode);
  cloudModeRef.current = cloudMode;

  const [isDark, setIsDark] = useState(() => {
    if (cloudMode) {
      // In cloud mode start from system pref; cloud value will override after load.
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    const saved = localStorage.getItem('notes-app-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Only persist to localStorage for guests. Authenticated users persist
    // through the cloud customization record to avoid leaking the previous
    // account's preference into a new login.
    if (!cloudModeRef.current) {
      localStorage.setItem('notes-app-theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);

  return { isDark, toggleTheme, setIsDark };
}
