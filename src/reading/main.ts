import { copyText, showCopied } from '../lib/clipboard';

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-mode]')],
  panels = [...document.querySelectorAll<HTMLElement>('[data-lang]')],
  titles = [...document.querySelectorAll<HTMLElement>('[data-title-lang]')],
  texts = document.querySelector<HTMLElement>('[data-texts]')!;
const syncChapterMeta = (_mode: string) => {};
const hasTranslation =
  document.querySelector<HTMLElement>('.detail')?.dataset.hasTranslation === 'true';
let currentMode = hasTranslation
  ? document.documentElement.dataset.contentMode || 'parallel'
  : 'no';
const hashForMode = (mode: string) => (mode === 'parallel' ? 'no-en' : mode);
const modeFromHash = () =>
  location.hash === '#no'
    ? 'no'
    : location.hash === '#en'
      ? 'en'
      : location.hash === '#no-en'
        ? 'parallel'
        : null;
function setMode(mode: string, updateHash = false) {
  if (!hasTranslation) mode = 'no';
  currentMode = mode;
  document.documentElement.dataset.contentMode = mode;
  localStorage.setItem('norske-content-mode', mode);
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === mode)));
  panels.forEach((p) => (p.hidden = mode !== 'parallel' && p.dataset.lang !== mode));
  titles.forEach((t) => (t.hidden = mode !== 'parallel' && t.dataset.titleLang !== mode));
  texts.classList.toggle('single', mode !== 'parallel');
  syncChapterMeta(mode);
  if (updateHash) history.replaceState(null, '', `#${hashForMode(mode)}`);
}
tabs.forEach((t) => {
  t.addEventListener('click', () => setMode(t.dataset.mode!, true));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const i = tabs.indexOf(t);
      tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].focus();
    }
  });
});
setMode(modeFromHash() || document.documentElement.dataset.contentMode || 'parallel');
window.addEventListener('hashchange', () => {
  const hashMode = modeFromHash();
  if (hashMode) setMode(hashMode);
});
window.addEventListener('content-mode-change', (event) => setMode((event as CustomEvent).detail));
document.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async (e) => {
  const button = e.currentTarget as HTMLButtonElement,
    text =
      currentMode === 'no'
        ? button.dataset.copyNo
        : currentMode === 'en'
          ? button.dataset.copyEn
          : button.dataset.copyParallel,
    tr = (key: string) => window.teikasT?.(key) || key;
  await copyText(text || '');
  button.setAttribute('aria-label', tr('detail.copied'));
  showCopied(button);
  setTimeout(() => button.setAttribute('aria-label', tr('detail.copy')), 1800);
});
document
  .querySelector<HTMLButtonElement>('[data-copy-link]')
  ?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement,
      tr = (key: string) => window.teikasT?.(key) || key;
    await copyText(button.dataset.copyLink || location.href);
    button.setAttribute('aria-label', tr('detail.copied'));
    showCopied(button, 'link');
    setTimeout(() => button.setAttribute('aria-label', tr('detail.copyLink')), 1800);
  });
const detailPin = document.querySelector<HTMLButtonElement>('[data-detail-pin]')!;
const readPins = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem('norske-pins') || '[]'));
  } catch {
    return new Set<string>();
  }
};
const syncDetailPin = () => {
  const pinned = readPins().has(detailPin.dataset.detailPin!);
  detailPin.setAttribute('aria-pressed', String(pinned));
  const label =
    window.teikasT?.(pinned ? 'browser.unpin' : 'browser.pin') ||
    (pinned ? 'Fjern feste fra sagn' : 'Fest sagn');
  detailPin.setAttribute('aria-label', label);
  detailPin.title = label;
};
detailPin.addEventListener('click', () => {
  const pins = readPins(),
    id = detailPin.dataset.detailPin!;
  pins.has(id) ? pins.delete(id) : pins.add(id);
  localStorage.setItem('norske-pins', JSON.stringify([...pins]));
  syncDetailPin();
});
window.addEventListener('ui-language-change', syncDetailPin);
window.addEventListener('storage', (event) => {
  if (event.key === 'norske-pins') syncDetailPin();
});
syncDetailPin();
const citationToggle = document.querySelector<HTMLButtonElement>('[data-citation-toggle]')!,
  citationPanel = document.querySelector<HTMLElement>('[data-citation-panel]')!;
const setCitationOpen = (open: boolean) => {
  citationPanel.hidden = !open;
  citationToggle.setAttribute('aria-expanded', String(open));
};
citationToggle.addEventListener('click', (event) => {
  event.stopPropagation();
  setCitationOpen(citationPanel.hasAttribute('hidden'));
});
document
  .querySelector('[data-citation-close]')
  ?.addEventListener('click', () => setCitationOpen(false));
document.querySelectorAll<HTMLButtonElement>('[data-citation-copy]').forEach((button) =>
  button.addEventListener('click', async () => {
    await copyText(button.dataset.citationCopy || '');
    showCopied(button);
  }),
);
citationPanel.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', () => setCitationOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setCitationOpen(false);
});
document.querySelector<HTMLAnchorElement>('[data-back]')?.addEventListener('click', (e) => {
  if (document.referrer.startsWith(location.origin)) {
    e.preventDefault();
    history.back();
  }
});
type BrowseNeighbour = { id: string; titleNo: string; titleEn: string };
const neighbourNav = document.querySelector<HTMLElement>('[data-prev-next]');
const browseNeighbours = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('norske-browse-results') || '[]') as BrowseNeighbour[];
  } catch {
    return [] as BrowseNeighbour[];
  }
})();
const neighbourIndex = browseNeighbours.findIndex(
  (item) => item.id === neighbourNav?.dataset.currentId,
);
const neighbourTitle = (item: BrowseNeighbour) =>
  currentMode === 'en'
    ? item.titleEn || item.titleNo || item.id
    : item.titleNo || item.titleEn || item.id;
const setNeighbour = (selector: string, item: BrowseNeighbour | undefined) => {
  const anchor = neighbourNav?.querySelector<HTMLAnchorElement>(selector);
  if (!anchor) return;
  anchor.hidden = !item;
  if (!item) return;
  anchor.href = `${import.meta.env.BASE_URL}legends/${item.id}/`;
  const title = anchor.querySelector<HTMLElement>('.legend-nav-title');
  if (title) title.textContent = neighbourTitle(item);
};
const syncNeighbours = () => {
  if (neighbourIndex < 0) return;
  setNeighbour('[data-previous]', browseNeighbours[neighbourIndex - 1]);
  setNeighbour('[data-next]', browseNeighbours[neighbourIndex + 1]);
};
syncNeighbours();
tabs.forEach((tab) => tab.addEventListener('click', syncNeighbours));
window.addEventListener('content-mode-change', syncNeighbours);
const info = document.querySelector<HTMLDetailsElement>('[data-information]')!,
  mobile = matchMedia('(max-width: 850px)');
const arrangeInfo = (event: MediaQueryList | MediaQueryListEvent) => {
  info.open = !event.matches;
};
arrangeInfo(mobile);
mobile.addEventListener('change', arrangeInfo);

export {};
