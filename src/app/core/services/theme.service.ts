import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ThemeOption {
  id: string;
  label: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  /** Focus/glow ring color (e.g. primary with alpha) */
  primaryGlow?: string;
  /** Shell sidebar background */
  shellSidebarBg?: string;
  /** Shell header/content area background */
  shellHeaderBg?: string;
  /** Shell border color */
  shellBorder?: string;
}

export const THEME_STORAGE_KEY = 'selfaccounting.theme';

export const THEMES: ThemeOption[] = [
  {
    id: 'default',
    label: 'Blue',
    primary: '#0077c8',
    primaryHover: '#005fa3',
    primaryLight: 'rgba(0, 119, 200, 0.12)',
    primaryGlow: 'rgba(0, 119, 200, 0.22)',
    shellSidebarBg: '#eff6ff',
    shellHeaderBg: '#f0f9ff',
    shellBorder: '#bfdbfe',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    primary: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: 'rgba(13, 148, 136, 0.12)',
    primaryGlow: 'rgba(13, 148, 136, 0.22)',
    shellSidebarBg: '#f0fdfa',
    shellHeaderBg: '#f0fdfa',
    shellBorder: '#99f6e4',
  },
  {
    id: 'forest',
    label: 'Forest',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: 'rgba(5, 150, 105, 0.12)',
    primaryGlow: 'rgba(5, 150, 105, 0.22)',
    shellSidebarBg: '#ecfdf5',
    shellHeaderBg: '#ecfdf5',
    shellBorder: '#a7f3d0',
  },
  {
    id: 'violet',
    label: 'Violet (default)',
    primary: '#667eea',
    primaryHover: '#5a67d8',
    primaryLight: 'rgba(102, 126, 234, 0.14)',
    primaryGlow: 'rgba(102, 126, 234, 0.25)',
    shellSidebarBg: '#f5f3ff',
    shellHeaderBg: '#faf5ff',
    shellBorder: '#e9e7ff',
  },
  {
    id: 'slate',
    label: 'Slate',
    primary: '#475569',
    primaryHover: '#334155',
    primaryLight: 'rgba(71, 85, 105, 0.12)',
    primaryGlow: 'rgba(71, 85, 105, 0.22)',
    shellSidebarBg: '#f8fafc',
    shellHeaderBg: '#f1f5f9',
    shellBorder: '#e2e8f0',
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly currentThemeSubject = new BehaviorSubject<string>('violet');
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
    let themeId = 'violet';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        themeId = stored;
      }
    } catch {
      themeId = 'violet';
    }
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES.find((t) => t.id === 'violet') ?? THEMES[0];
    this.applyTheme(theme);
    this.currentThemeSubject.next(themeId);
  }

  private applyTheme(theme: ThemeOption): void {
    const root = document.documentElement;
    root.style.setProperty('--app-theme-primary', theme.primary);
    root.style.setProperty('--app-theme-primary-hover', theme.primaryHover);
    root.style.setProperty('--app-theme-primary-light', theme.primaryLight);
    root.style.setProperty('--app-theme-primary-glow', theme.primaryGlow ?? theme.primaryLight);
    root.style.setProperty('--app-theme-shell-sidebar-bg', theme.shellSidebarBg ?? theme.primaryLight);
    root.style.setProperty('--app-theme-shell-header-bg', theme.shellHeaderBg ?? theme.primaryLight);
    root.style.setProperty('--app-theme-shell-content-bg', theme.shellHeaderBg ?? theme.primaryLight);
    root.style.setProperty('--app-theme-shell-border', theme.shellBorder ?? 'rgba(0,0,0,0.08)');
    document.body.setAttribute('data-theme', theme.id);
  }
}
