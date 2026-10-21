import {
  createIcons,
  ChartScatter,
  Play,
  Pause,
  ChartNoAxesColumn,
  Circle,
  Eye,
  EyeOff,
  ListFilter,
  Menu,
  Maximize2,
  Scan,
  Type,
  ZoomIn,
  ZoomOut,
  CircleAlert,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileStack,
  GitCompareArrows,
  Info,
  Layers,
  LayoutGrid,
  Link,
  List,
  LocateFixed,
  MapPin,
  MapPinOff,
  BookOpen,
  UserRound,
  Minus,
  Moon,
  Network,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Quote,
  RotateCcw,
  Settings2,
  Sun,
  UsersRound,
  X,
} from 'lucide';
const iconSet = {
  ChartScatter,
  Play,
  Pause,
  ChartNoAxesColumn,
  Circle,
  Eye,
  EyeOff,
  ListFilter,
  Menu,
  Maximize2,
  Scan,
  Type,
  ZoomIn,
  ZoomOut,
  CircleAlert,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileStack,
  GitCompareArrows,
  Info,
  Layers,
  LayoutGrid,
  Link,
  List,
  LocateFixed,
  MapPin,
  MapPinOff,
  BookOpen,
  UserRound,
  Minus,
  Moon,
  Network,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Quote,
  RotateCcw,
  Settings2,
  Sun,
  UsersRound,
  X,
};
const renderIcons = () =>
  createIcons({ icons: iconSet, attrs: { 'aria-hidden': 'true', 'stroke-width': '1.8' } });
window.renderLucideIcons = renderIcons;
window.addEventListener('lucide-refresh', renderIcons);
renderIcons();
const syncSliderProgress = () =>
  document
    .querySelectorAll<HTMLInputElement>('input[type="range"]:not(.dual-range input)')
    .forEach((input) => {
      const min = Number(input.min) || 0,
        max = Number(input.max) || 100;
      input.style.setProperty(
        '--slider-progress',
        `${Math.max(0, Math.min(100, ((Number(input.value) - min) / (max - min)) * 100))}%`,
      );
    });
window.syncSliderProgress = syncSliderProgress;
syncSliderProgress();
requestAnimationFrame(syncSliderProgress);
document.addEventListener('input', (event) => {
  if ((event.target as HTMLElement)?.matches('input[type="range"]')) syncSliderProgress();
});
const doc = document.documentElement,
  store = localStorage,
  themeButton = document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!;
const applyTheme = (theme: string) => {
  doc.dataset.theme = theme;
  store.setItem('norske-theme', theme);
  themeButton.querySelector<HTMLElement>('[data-theme-icon]')!.dataset.lucide =
    theme === 'dark' ? 'sun' : 'moon';
  renderIcons();
};
applyTheme(doc.dataset.theme || 'light');
themeButton.addEventListener('click', () =>
  applyTheme(doc.dataset.theme === 'dark' ? 'light' : 'dark'),
);
let scale = Number(store.getItem('norske-font-scale') || 1);
const applyScale = (value: number) => {
  scale = Math.max(0.9, Math.min(1.2, value));
  doc.style.setProperty('--font-scale', String(scale));
  store.setItem('norske-font-scale', String(scale));
};
document
  .querySelector('[data-font-down]')
  ?.addEventListener('click', () => applyScale(scale - 0.1));
document.querySelector('[data-font-up]')?.addEventListener('click', () => applyScale(scale + 0.1));
type UiLang = 'no' | 'en';
type Entry = { no: string; en: string };
const ui = JSON.parse(document.querySelector('#ui-translations')!.textContent || '{}') as Record<
    string,
    Entry
  >,
  byAny = new Map<string, string>();
Object.entries(ui).forEach(([key, value]) =>
  (['no', 'en'] as UiLang[]).forEach((lang) => value[lang] && byAny.set(value[lang], key)),
);
const tr = (key: string, values: Record<string, string | number> = {}) => {
  const lang = (doc.dataset.uiLang || 'no') as UiLang;
  return (ui[key]?.[lang] || ui[key]?.no || key).replace(/\{(\w+)\}/g, (_, name) =>
    String(values[name] ?? ''),
  );
};
window.teikasT = tr;
window.norskeT = tr;
const skip = (node: Node) => {
  const el = node.parentElement;
  return (
    !el ||
    !!el.closest(
      'script,style,[data-i18n-skip],.legend-text,[data-title-lang],.result-card h2,.result-excerpt,.meta-value,.source-list',
    )
  );
};
const applyTranslations = (lang: UiLang) => {
  doc.dataset.uiLang = lang;
  doc.lang = lang;
  store.setItem('norske-ui-lang', lang);
  document
    .querySelectorAll<HTMLButtonElement>('button[data-ui-lang]')
    .forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.uiLang === lang)));
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (skip(node)) continue;
    const raw = node.textContent || '',
      trimmed = raw.trim(),
      key = node.parentElement?.dataset.i18n || byAny.get(trimmed);
    if (key && ui[key]) node.textContent = raw.replace(trimmed, ui[key][lang]);
  }
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    for (const attr of ['placeholder', 'aria-label', 'title'] as const) {
      const value = el.getAttribute(attr),
        key = value && byAny.get(value);
      if (key && ui[key]) el.setAttribute(attr, ui[key][lang]);
    }
  });
  window.dispatchEvent(new CustomEvent('ui-language-change', { detail: lang }));
};
window.applyTeikasUiLanguage = applyTranslations;
document
  .querySelectorAll<HTMLButtonElement>('button[data-ui-lang]')
  .forEach((button) =>
    button.addEventListener('click', () => applyTranslations(button.dataset.uiLang as UiLang)),
  );
applyTranslations((doc.dataset.uiLang as UiLang) || 'no');

// Keep the navigation out of the tab order while the menu is closed.
const siteHeader = document.querySelector<HTMLElement>('.site-header')!;
const menuToggle = document.querySelector<HTMLButtonElement>('.site-menu-toggle')!;
const menuPanel = document.querySelector<HTMLElement>('#site-header-panel')!;
const setMenuOpen = (open: boolean) => {
  menuToggle.setAttribute('aria-expanded', String(open));
};
siteHeader.dataset.menuReady = 'true';
new ResizeObserver(() => {
  doc.style.setProperty('--site-header-height', `${siteHeader.getBoundingClientRect().height}px`);
}).observe(siteHeader);
menuToggle.addEventListener('click', () =>
  setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'),
);
siteHeader.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', (event) => {
  if (!siteHeader.contains(event.target as Node)) setMenuOpen(false);
});
menuPanel.querySelectorAll('nav a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});
