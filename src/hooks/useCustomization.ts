import { useState, useEffect, useCallback } from 'react';

export interface CustomColors {
  sidebarBackground: string | null;
  editorBackground: string | null;
  accentColor: string | null;
  foreground: string | null;
  editorBackgroundImage: string | null;
}

export interface SavedTheme {
  id: string;
  name: string;
  colors: CustomColors;
  fonts: FontSettings;
}

export interface FontSettings {
  interfaceFont: string;
  contentFont: string;
}

export interface Customization {
  colors: CustomColors;
  fonts: FontSettings;
  savedThemes: SavedTheme[];
  isDark?: boolean;
}

const DEFAULT_COLORS: CustomColors = {
  sidebarBackground: null,
  editorBackground: null,
  accentColor: null,
  foreground: null,
  editorBackgroundImage: null,
};

const DEFAULT_FONTS: FontSettings = {
  interfaceFont: 'Inter',
  contentFont: 'Merriweather',
};

const STORAGE_KEY = 'notes-customization';

export const AVAILABLE_FONTS = [
  { name: 'Inter', value: 'Inter', type: 'sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' },
  { name: 'SF Pro Display', value: 'SF Pro Display', type: 'sans-serif', url: null },
  { name: 'Montserrat', value: 'Montserrat', type: 'sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap' },
  { name: 'Roboto', value: 'Roboto', type: 'sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' },
  { name: 'Poppins', value: 'Poppins', type: 'sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap' },
  { name: 'Open Sans', value: 'Open Sans', type: 'sans-serif', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap' },
  { name: 'Merriweather', value: 'Merriweather', type: 'serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap' },
  { name: 'Playfair Display', value: 'Playfair Display', type: 'serif', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap' },
  { name: 'Source Code Pro', value: 'Source Code Pro', type: 'monospace', url: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap' },
  { name: 'JetBrains Mono', value: 'JetBrains Mono', type: 'monospace', url: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap' },
];

export const PRESET_THEMES: Omit<SavedTheme, 'id'>[] = [
  {
    name: 'Azul Ciano',
    colors: { sidebarBackground: '210 28% 6%', editorBackground: '210 25% 8%', accentColor: '190 85% 50%', foreground: '0 0% 100%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Inter', contentFont: 'Merriweather' },
  },
  {
    name: 'Noite Roxa',
    colors: { sidebarBackground: '270 30% 8%', editorBackground: '270 25% 10%', accentColor: '280 80% 60%', foreground: '0 0% 100%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Poppins', contentFont: 'Playfair Display' },
  },
  {
    name: 'Floresta',
    colors: { sidebarBackground: '150 25% 8%', editorBackground: '150 20% 10%', accentColor: '142 70% 45%', foreground: '0 0% 100%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Montserrat', contentFont: 'Merriweather' },
  },
  {
    name: 'Pôr do Sol',
    colors: { sidebarBackground: '20 30% 8%', editorBackground: '20 25% 10%', accentColor: '25 90% 55%', foreground: '0 0% 100%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Roboto', contentFont: 'Playfair Display' },
  },
  {
    name: 'Oceano',
    colors: { sidebarBackground: '200 40% 6%', editorBackground: '200 35% 8%', accentColor: '200 90% 55%', foreground: '0 0% 100%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Inter', contentFont: 'Source Code Pro' },
  },
  {
    name: 'Neutro Claro',
    colors: { sidebarBackground: '40 15% 95%', editorBackground: '40 20% 98%', accentColor: '35 90% 50%', foreground: '30 10% 15%', editorBackgroundImage: null },
    fonts: { interfaceFont: 'Inter', contentFont: 'Merriweather' },
  },
];

interface UseCustomizationOptions {
  cloudMode?: boolean;
}

export function useCustomization(options?: UseCustomizationOptions) {
  const cloudMode = options?.cloudMode ?? false;

  const [customization, setCustomization] = useState<Customization>(() => {
    if (cloudMode) {
      // In cloud mode, start with defaults — cloud data will be loaded later
      return { colors: DEFAULT_COLORS, fonts: DEFAULT_FONTS, savedThemes: [] };
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        colors: { ...DEFAULT_COLORS, ...parsed.colors },
        fonts: { ...DEFAULT_FONTS, ...parsed.fonts },
        savedThemes: parsed.savedThemes || [],
        isDark: parsed.isDark,
      };
    }
    return { colors: DEFAULT_COLORS, fonts: DEFAULT_FONTS, savedThemes: [] };
  });

  // Tracks whether customization is safe to write back to the cloud.
  // Guests are always ready (they only touch localStorage). Cloud users
  // are only ready after we've either loaded their existing record or
  // confirmed none exists — this prevents the initial default-state
  // render from clobbering a saved theme.
  const [cloudReady, setCloudReady] = useState<boolean>(!cloudMode);

  // Load fonts dynamically
  useEffect(() => {
    const loadFont = (fontName: string) => {
      const font = AVAILABLE_FONTS.find(f => f.value === fontName);
      if (font?.url) {
        const existingLink = document.querySelector(`link[data-font="${fontName}"]`);
        if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = font.url;
          link.setAttribute('data-font', fontName);
          document.head.appendChild(link);
        }
      }
    };
    loadFont(customization.fonts.interfaceFont);
    loadFont(customization.fonts.contentFont);
  }, [customization.fonts]);

  // Apply custom colors and fonts to CSS variables.
  // In cloud mode, do NOT touch CSS variables until we've reconciled with the
  // cloud — otherwise the initial default (all-null) state would strip any
  // previously-applied CSS variables before the saved theme arrives.
  useEffect(() => {
    if (cloudMode && !cloudReady) return;
    const root = document.documentElement;
    
    if (customization.colors.sidebarBackground) {
      root.style.setProperty('--sidebar-background', customization.colors.sidebarBackground);
    } else {
      root.style.removeProperty('--sidebar-background');
    }
    
    if (customization.colors.editorBackground) {
      root.style.setProperty('--background', customization.colors.editorBackground);
      root.style.setProperty('--card', customization.colors.editorBackground);
    } else {
      root.style.removeProperty('--background');
      root.style.removeProperty('--card');
    }
    
    if (customization.colors.accentColor) {
      root.style.setProperty('--primary', customization.colors.accentColor);
      root.style.setProperty('--accent', customization.colors.accentColor);
      root.style.setProperty('--ring', customization.colors.accentColor);
      root.style.setProperty('--sidebar-primary', customization.colors.accentColor);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
    }

    root.style.removeProperty('--foreground');
    root.style.removeProperty('--card-foreground');
    root.style.removeProperty('--popover-foreground');
    root.style.removeProperty('--sidebar-foreground');

    const font = AVAILABLE_FONTS.find(f => f.value === customization.fonts.interfaceFont);
    root.style.setProperty('--font-interface', `'${customization.fonts.interfaceFont}', ${font?.type || 'sans-serif'}`);
    
    const contentFont = AVAILABLE_FONTS.find(f => f.value === customization.fonts.contentFont);
    root.style.setProperty('--font-content', `'${customization.fonts.contentFont}', ${contentFont?.type || 'serif'}`);
  }, [customization, cloudMode, cloudReady]);


  // Apply dark/light mode from customization
  useEffect(() => {
    if (customization.isDark !== undefined) {
      const root = document.documentElement;
      if (customization.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [customization.isDark]);

  // Save to localStorage only in guest mode
  useEffect(() => {
    if (!cloudMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
    }
  }, [customization, cloudMode]);

  const updateColor = useCallback((key: keyof CustomColors, value: string | null) => {
    setCustomization(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  }, []);

  const updateFont = useCallback((key: keyof FontSettings, value: string) => {
    setCustomization(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value },
    }));
  }, []);

  const resetColors = useCallback(() => {
    setCustomization(prev => ({
      ...prev,
      colors: DEFAULT_COLORS,
    }));
    const root = document.documentElement;
    root.style.removeProperty('--sidebar-background');
    root.style.removeProperty('--background');
    root.style.removeProperty('--card');
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--sidebar-primary');
  }, []);

  const saveCurrentTheme = useCallback((name: string) => {
    const newTheme: SavedTheme = {
      id: crypto.randomUUID(),
      name,
      colors: { ...customization.colors },
      fonts: { ...customization.fonts },
    };
    setCustomization(prev => ({
      ...prev,
      savedThemes: [...prev.savedThemes, newTheme],
    }));
    return newTheme;
  }, [customization.colors, customization.fonts]);

  const deleteTheme = useCallback((id: string) => {
    setCustomization(prev => ({
      ...prev,
      savedThemes: prev.savedThemes.filter(t => t.id !== id),
    }));
  }, []);

  const applyTheme = useCallback((theme: Omit<SavedTheme, 'id'> | SavedTheme) => {
    setCustomization(prev => ({
      ...prev,
      colors: { ...theme.colors },
      fonts: { ...theme.fonts },
    }));
  }, []);

  const setIsDark = useCallback((isDark: boolean) => {
    setCustomization(prev => ({ ...prev, isDark }));
    // Only persist to localStorage for guests; authenticated users persist
    // through the cloud customization record to prevent cross-account leaks.
    if (!cloudMode) {
      localStorage.setItem('notes-app-theme', isDark ? 'dark' : 'light');
    }
  }, [cloudMode]);


  const hexToHsl = useCallback((hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '';
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }, []);

  const hslToHex = useCallback((hsl: string): string => {
    if (!hsl) return '#000000';
    const parts = hsl.match(/(\d+\.?\d*)/g);
    if (!parts || parts.length < 3) return '#000000';
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, []);

  const setCustomizationFromCloud = useCallback((data: Customization) => {
    setCustomization({
      colors: { ...DEFAULT_COLORS, ...data.colors },
      fonts: { ...DEFAULT_FONTS, ...data.fonts },
      savedThemes: data.savedThemes || [],
      isDark: data.isDark,
    });
    setCloudReady(true);
  }, []);

  const markCloudReady = useCallback(() => {
    setCloudReady(true);
  }, []);

  // Reset in-memory state to defaults and mark not-ready. Used when the
  // authenticated user changes (logout, account switch) so the previous
  // user's customization cannot leak into the new account's cloud record
  // before loadFromCloud resolves.
  const resetForUserChange = useCallback(() => {
    setCustomization({ colors: DEFAULT_COLORS, fonts: DEFAULT_FONTS, savedThemes: [] });
    setCloudReady(false);
  }, []);

  return {
    customization,
    cloudReady,
    setCustomizationFromCloud,
    markCloudReady,
    resetForUserChange,
    updateColor,
    updateFont,
    resetColors,
    saveCurrentTheme,
    deleteTheme,
    applyTheme,
    hexToHsl,
    hslToHex,
    setIsDark,
  };
}

