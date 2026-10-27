import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '@/src/utils/storage';

type Theme = 'dark' | 'light';

// Accent colours the user can pick in Settings → Appearance.
export const ACCENT_COLORS = [
  { key: 'red', label: 'Red', value: '#DC143C' },
  { key: 'blue', label: 'Blue', value: '#1E88E5' },
  { key: 'green', label: 'Green', value: '#2E9E4F' },
  { key: 'purple', label: 'Purple', value: '#8E44AD' },
  { key: 'orange', label: 'Orange', value: '#F57C00' },
  { key: 'pink', label: 'Pink', value: '#E91E8C' },
  { key: 'teal', label: 'Teal', value: '#00897B' },
  { key: 'gold', label: 'Gold', value: '#C9A227' },
] as const;

export type AccentColorKey = typeof ACCENT_COLORS[number]['key'];
const DEFAULT_ACCENT: AccentColorKey = 'red';

const accentValue = (key: string) =>
  (ACCENT_COLORS.find(c => c.key === key) ?? ACCENT_COLORS[0]).value;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  accentColor: AccentColorKey;
  setAccentColor: (key: AccentColorKey) => void;
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    success: string;
    error: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const darkColors = {
  background: '#000000',
  surface: '#1A1A1A',
  primary: '#DC143C',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  border: '#333333',
  card: '#1F1F1F',
  success: '#4CAF50',
  error: '#F44336',
};

const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#DC143C',
  text: '#000000',
  textSecondary: '#666666',
  border: '#DDDDDD',
  card: '#FFFFFF',
  success: '#4CAF50',
  error: '#F44336',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [accentColor, setAccentColorState] = useState<AccentColorKey>(DEFAULT_ACCENT);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await storage.getItem('theme', 'dark') as Theme;
    setTheme(savedTheme);
    const savedAccent = await storage.getItem('accentColor', DEFAULT_ACCENT) as AccentColorKey;
    if (ACCENT_COLORS.some(c => c.key === savedAccent)) {
      setAccentColorState(savedAccent);
    }
  };

  const setAccentColor = async (key: AccentColorKey) => {
    setAccentColorState(key);
    await storage.setItem('accentColor', key);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await storage.setItem('theme', newTheme);
  };

  const colors = {
    ...(theme === 'dark' ? darkColors : lightColors),
    primary: accentValue(accentColor),
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
