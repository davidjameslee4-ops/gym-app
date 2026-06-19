import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '@/src/utils/storage';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
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

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await storage.getItem('theme', 'dark') as Theme;
    setTheme(savedTheme);
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await storage.setItem('theme', newTheme);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
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
