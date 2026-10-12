/// <reference types="astro/client" />

interface Window {
  teikasT?: (key: string, values?: Record<string, string | number>) => string;
  norskeT?: (key: string, values?: Record<string, string | number>) => string;
  renderLucideIcons?: () => void;
  syncSliderProgress?: () => void;
  applyTeikasUiLanguage?: (language: 'no' | 'en') => void;
}
