import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ThemeOption {
  id: string;
  label: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
}

export const THEME_STORAGE_KEY = 'selfaccounting.theme';

export const THEMES: ThemeOption[] = [
  {
    id: 'default',
    label: 'Default (Blue)',
    primary: '#0077c8',
    primaryHover: '#005fa3',
    primaryLight: 'rgba(0, 119, 200, 0.12)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    primary: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: 'rgba(13, 148, 136, 0.12)',
  },
  {
    id: 'forest',
    label: 'Forest',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: 'rgba(5, 150, 105, 0.12)',
  },
  {
    id: 'violet',
    label: 'Violet',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: 'rgba(124, 58, 237, 0.12)',
  },
  {
    id: 'slate',
    label: 'Slate',
    primary: '#475569',
    primaryHover: '#334155',
    primaryLight: 'rgba(71, 85, 105, 0.12)',
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly currentThemeSubject = new BehaviorSubject<string>('default');
  readonly currentTheme$: Observable<string> = this.currentThemeSubject.asObservable();

  constructor() {
    this.applyStoredTheme();
  }

  getThemes(): ThemeOption[] {
    return THEMES;
  }

  getCurrentTheme(): string {
    return this.currentThemeSubject.value;
  }

  setTheme(themeId: string): void {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // ignore storage errors
    }
    this.applyTheme(theme);
    this.currentThemeSubject.next(themeId);
  }

  private applyStoredTheme(): void {
    let themeId = 'default';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        themeId = stored;
      }
    } catch {
      themeId = 'default';
    }
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
    this.applyTheme(theme);
    this.currentThemeSubject.next(themeId);
  }

  private applyTheme(theme: ThemeOption): void {
    const root = document.documentElement;
    root.style.setProperty('--app-theme-primary', theme.primary);
    root.style.setProperty('--app-theme-primary-hover', theme.primaryHover);
    root.style.setProperty('--app-theme-primary-light', theme.primaryLight);
    document.body.setAttribute('data-theme', theme.id);
  }
}
