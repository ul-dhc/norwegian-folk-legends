import { decodeSelection } from '../lib/selection.js';
import { esc, fold, searchNorm, marked, contextual } from '../lib/search';

type R = {
  id: string;
  mlCategoryId: string;
  genreId: string;
  subgenreId: string;
  countyId: string;
  placeId: string;
  collectorId: string;
  narratorId: string;
  translationId: string;
  volume: string;
  genre: string;
  chapterNo: string;
  chapterEn: string;
  county: string;
  titleNo: string;
  titleEn: string;
  place: string;
  collector: string;
  narrator: string;
  year: string;
  excerptNo: string;
  excerptEn: string;
};

const root = document.querySelector<HTMLElement>('[data-browser]')!,
  data = JSON.parse(document.querySelector('#browse-data')!.textContent || '[]') as R[];

const q = root.querySelector<HTMLInputElement>('#q')!,
  searchHelp = root.querySelector<HTMLElement>('#search-help')!,
  yearFrom = root.querySelector<HTMLInputElement>('#year-from')!,
  yearTo = root.querySelector<HTMLInputElement>('#year-to')!,
  includeUndated = root.querySelector<HTMLInputElement>('#include-undated')!,
  includeUnknownPlace = root.querySelector<HTMLInputElement>('#include-unknown-place')!,
  timeline = yearFrom.closest<HTMLElement>('.timeline')!;

const list = root.querySelector<HTMLOListElement>('[data-results]')!,
  count = root.querySelector<HTMLElement>('[data-count]')!,
  empty = root.querySelector<HTMLElement>('[data-empty]')!,
  pages = root.querySelector<HTMLElement>('[data-pagination]')!,
  pageLabel = root.querySelector<HTMLElement>('[data-page-label]')!,
  listHead = root.querySelector<HTMLElement>('[data-list-head]')!,
  cardSort = root.querySelector<HTMLSelectElement>('[data-card-sort]')!,
  cardSortWrap = cardSort.closest<HTMLElement>('.card-sort')!,
  activeFilters = root.querySelector<HTMLElement>('[data-active-filters]')!,
  clearButton = root.querySelector<HTMLButtonElement>('[data-clear]')!,
  clearPinsButton = root.querySelector<HTMLButtonElement>('[data-clear-pins]')!,
  mobileFilterToggle = root.querySelector<HTMLButtonElement>('[data-mobile-filter-toggle]')!,
  filterSidebar = root.querySelector<HTMLElement>('.filter-sidebar')!,
  filterCollapse = root.querySelector<HTMLButtonElement>('[data-filter-collapse]')!;
root.querySelector<HTMLElement>('.pagination-row')!.prepend(pageLabel);

const openPinsButton = document.createElement('button');
openPinsButton.type = 'button';
openPinsButton.className = 'clear-pins open-pins';
openPinsButton.innerHTML = '<i data-lucide="external-link"></i><span></span>';
clearPinsButton.insertAdjacentElement('afterend', openPinsButton);

const copySelectionButton = document.createElement('button');
copySelectionButton.type = 'button';
copySelectionButton.className = 'clear-pins copy-selection-link';
copySelectionButton.innerHTML = '<i data-lucide="link"></i><span></span>';
openPinsButton.insertAdjacentElement('afterend', copySelectionButton);

const downloadMenu = document.createElement('details');
downloadMenu.className = 'download-menu';
downloadMenu.innerHTML =
  '<summary><i data-lucide="download"></i><span></span><i data-lucide="chevron-down"></i></summary><div class="download-options"><fieldset class="download-citation"><legend></legend><label><input type="radio" name="download-citation" value="clarin" checked><span>CLARIN-NO</span></label><label><input type="radio" name="download-citation" value="site"><span>Norske sagn</span></label></fieldset><div class="download-formats"><button type="button" data-download-format="csv">CSV</button><button type="button" data-download-format="txt">TXT</button><button type="button" data-download-format="json">JSON</button></div></div>';
filterSidebar.append(downloadMenu);
const downloadHelp = root.querySelector<HTMLElement>('[data-download-help]')!;
filterSidebar.append(downloadHelp);
const downloadHint = document.createElement('p');
downloadHint.className = 'download-hint';
downloadMenu.insertAdjacentElement('afterend', downloadHint);

type SearchText = { no: string; en: string };
type MultiType =
  'theme' | 'narrator' | 'collector' | 'county' | 'place' | 'genre' | 'volume' | 'translation';
const filterTypes: MultiType[] = [
    'theme',
    'narrator',
    'collector',
    'county',
    'place',
    'genre',
    'volume',
    'translation',
  ],
  unknownPerson = '__unknown__',
  selections = Object.fromEntries(filterTypes.map((type) => [type, new Set<string>()])) as Record<
    MultiType,
    Set<string>
  >,
  explicitSelections = new Set<MultiType>(),
  pins = new Set<string>(JSON.parse(localStorage.getItem('norske-pins') || '[]')),
  expandedIds = new Set<string>(),
  seed = Math.random();
let page = 1,
  size = 20,
  view = localStorage.getItem('norske-browse-view') || 'list',
  sortKey = 'random',
  sortDirection = 1,
  searchIndex: Map<string, SearchText> | null = null,
  token = 0,
  activeTerms: string[] = [],
  activeTermLabels: string[] = [];

const initialThemeIds = (new URLSearchParams(location.search).get('theme') || '')
  .split(',')
  .filter((id) => id && data.some((record) => record.mlCategoryId === id));
if (initialThemeIds.length) {
  initialThemeIds.forEach((id) => selections.theme.add(id));
  explicitSelections.add('theme');
}

const initialCollectorId = new URLSearchParams(location.search).get('collector');
if (initialCollectorId && data.some((record) => record.collectorId === initialCollectorId)) {
  selections.collector.add(initialCollectorId);
  explicitSelections.add('collector');
}

const initialPlaceId = new URLSearchParams(location.search).get('place');
if (initialPlaceId && data.some((record) => record.placeId === initialPlaceId)) {
  selections.place.add(initialPlaceId);
  explicitSelections.add('place');
  includeUnknownPlace.checked = false;
}

const tr = (key: string, values: Record<string, string | number> = {}) =>
  window.teikasT?.(key, values) || key;
let filterCollapsePreference = localStorage.getItem('norske-browse-filters-collapsed');
const filterLayoutQuery = matchMedia('(min-width:851px)');
function applyFilterCollapse(currentView = view) {
  const collapsed =
    filterLayoutQuery.matches &&
    (filterCollapsePreference === null
      ? currentView === 'grid'
      : filterCollapsePreference === 'true');
  root.classList.toggle('filters-collapsed', collapsed);
  filterCollapse.setAttribute('aria-expanded', String(!collapsed));
  const label = tr(collapsed ? 'map.expandFilters' : 'map.collapseFilters');
  filterCollapse.setAttribute('aria-label', label);
  filterCollapse.title = label;
  filterCollapse.querySelector<HTMLElement>('[data-filter-collapse-label]')!.textContent = label;
}
filterCollapse.addEventListener('click', () => {
  const collapsed = !root.classList.contains('filters-collapsed');
  filterCollapsePreference = String(collapsed);
  localStorage.setItem('norske-browse-filters-collapsed', filterCollapsePreference);
  applyFilterCollapse();
});
filterLayoutQuery.addEventListener('change', () => applyFilterCollapse());
window.addEventListener('ui-language-change', () => applyFilterCollapse());
const hasActiveSelection = () =>
  selectionOnly ||
  activeTerms.length > 0 ||
  explicitSelections.size > 0 ||
  yearFrom.value !== yearFrom.min ||
  yearTo.value !== yearTo.max ||
  !includeUndated.checked ||
  !includeUnknownPlace.checked;
const syncDownloadAvailability = (resultCount: number) => {
  const available = resultCount > 0 && resultCount < data.length;
  downloadMenu.dataset.hasSelection = String(hasActiveSelection());
  downloadMenu.dataset.disabled = String(!available);
  downloadMenu.querySelector('summary')!.setAttribute('aria-disabled', String(!available));
  downloadMenu
    .querySelectorAll<HTMLButtonElement>('[data-download-format]')
    .forEach((button) => (button.disabled = !available));
  downloadHint.hidden = available;
  downloadHint.textContent = tr('browser.downloadHint');
  if (!available) downloadMenu.open = false;
};
downloadMenu.querySelector('summary')!.addEventListener('click', (event) => {
  if (downloadMenu.dataset.disabled === 'true') event.preventDefault();
});
new MutationObserver(() =>
  syncDownloadAvailability(Number((count.textContent || '').replace(/\D/g, '')) || 0),
).observe(count, { childList: true, characterData: true, subtree: true });
window.addEventListener('ui-language-change', () => {
  downloadHint.textContent = tr('browser.downloadHint');
});

const resultCountLabel = root.querySelector<HTMLElement>('[data-result-count-label]')!;
const decorateReadActions = () => {
  list
    .querySelectorAll<HTMLAnchorElement>('.read-full:not([data-primary-read])')
    .forEach((link) => {
      link.dataset.primaryRead = '';
      const actions = document.createElement('div');
      actions.className = 'card-read-actions';
      const openNew = document.createElement('a');
      openNew.className = 'read-full open-new';
      openNew.href = link.href;
      openNew.target = '_blank';
      openNew.rel = 'noopener';
      openNew.innerHTML = `<span>${tr('browser.openNewWindow')}</span><i data-lucide="external-link"></i>`;
      link.before(actions);
      actions.append(link, openNew);
    });
  refreshIcons();
};
const syncResultCountLabel = () => {
  const nodes = resultCountLabel.childNodes;
  nodes[0].textContent = `${list.children.length} ${tr('browser.resultsOf')} `;
  nodes[nodes.length - 1].textContent = ` ${tr('browser.resultsNoun')}`;
  decorateReadActions();
};
new MutationObserver(syncResultCountLabel).observe(list, { childList: true });
window.addEventListener('ui-language-change', () => {
  syncResultCountLabel();
  list
    .querySelectorAll<HTMLElement>('.open-new span')
    .forEach((label) => (label.textContent = tr('browser.openNewWindow')));
});
const parseRawTerms = (value: string) => {
  const terms: string[] = [];
  for (const match of value.matchAll(/"([^"]+)"|“([^”]+)”|(\S+)/g)) {
    const term = (match[1] || match[2] || match[3] || '').replace(/\s+/g, ' ').trim();
    if (term && !terms.some((item) => searchNorm(item) === searchNorm(term))) terms.push(term);
  }
  return terms;
};
const mode = () => document.documentElement.dataset.contentMode || 'parallel';
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};

const base = import.meta.env.BASE_URL;

const selectionParams = new URLSearchParams(location.search),
  sharedSelection = new Set(
    decodeSelection(selectionParams.get('selection') || '', data),
  ),
  pinnedOnly = selectionParams.get('pinned') === '1';
let selectionOnly = sharedSelection.size > 0;

const inferredSelections = new Map<MultiType, string>();

if (selectionOnly) {
  const scope = data.filter((record) => sharedSelection.has(record.id));
  filterTypes.forEach((type) => {
    const values = new Set(scope.map((record) => filterValue(record, type))),
      allValues = new Set(data.map((record) => filterValue(record, type)).filter(Boolean));
    if (values.size === 1 && allValues.size > 1 && !explicitSelections.has(type)) {
      const value = [...values][0];
      if (
        root.querySelector(`[data-filter-options="${type}"] input[value="${CSS.escape(value)}"]`)
      ) {
        selections[type].add(value);
        explicitSelections.add(type);
        inferredSelections.set(type, value);
      }
    }
  });
  includeUnknownPlace.checked = scope.some((record) => !record.placeId);
}

function clearSelectionScope() {
  selectionOnly = false;
  inferredSelections.forEach((value, type) => {
    if (selections[type].size === 1 && selections[type].has(value)) {
      selections[type].clear();
      explicitSelections.delete(type);
    }
  });
  inferredSelections.clear();
  includeUnknownPlace.checked = true;
  const url = new URL(location.href);
  url.searchParams.delete('selection');
  history.replaceState(null, '', url);
  syncFilterChecks();
  syncOpenPins();
}

async function ensureSearch() {
  if (searchIndex) return searchIndex;
  const rows = (await (await fetch(`${base}search-index.json?v=2`)).json()) as ({
    id: string;
  } & SearchText)[];
  return (searchIndex = new Map(rows.map((r) => [r.id, { no: r.no || '', en: r.en || '' }])));
}

function title(r: R) {
  const noTitle = marked(r.titleNo || 'Uten tittel', activeTerms);
  if (!r.excerptEn) return noTitle;
  if (mode() === 'en')
    return `<span lang="en">${marked(r.titleEn || r.titleNo || 'Untitled', activeTerms)}</span>`;
  if (mode() === 'parallel')
    return `${noTitle}${r.titleEn ? `<small lang="en">${marked(r.titleEn, activeTerms)}</small>` : ''}`;
  return noTitle;
}
function excerpt(r: R, expanded = false) {
  const full = searchIndex?.get(r.id),
    noText = full?.no || '',
    enText = full?.en || '',
    hasEn = Boolean(enText || r.excerptEn),
    parallel = mode() === 'parallel' && hasEn,
    parallelLimit = parallel && view === 'list' ? (expanded ? 380 : 145) : undefined,
    no = contextual(noText, activeTerms, r.excerptNo, expanded, parallelLimit),
    en = contextual(enText, activeTerms, r.excerptEn, expanded, parallelLimit),
    noHit = activeTerms.some((term) => fold(`${r.titleNo} ${noText}`).includes(term)),
    enHit = activeTerms.some((term) => fold(`${r.titleEn} ${enText}`).includes(term));
  if (parallel)
    return `<span>${marked(no, activeTerms)}</span><span class="excerpt-en" lang="en">${marked(en, activeTerms)}</span>`;
  if ((mode() === 'en' || (enHit && !noHit)) && hasEn)
    return `<span class="excerpt-en" lang="en">${marked(en, activeTerms)}</span>`;
  return marked(no, activeTerms);
}

function item(r: R) {
  const pinned = pins.has(r.id),
    expanded = expandedIds.has(r.id),
    href = `${base}legends/${r.id}/`,
    whereWhen = [r.place, r.year].filter(Boolean).join(', '),
    personMeta = (label: string, value: string) =>
      value
        ? `<span class="person-meta"><span class="meta-label">${label}:</span> <span class="meta-value">${marked(value.replace(/[.\s]+$/, ''), activeTerms)}.</span></span>`
        : '',
    people = [
      personMeta(tr('meta.narrator'), r.narrator),
      personMeta(tr('meta.collector'), r.collector),
    ]
      .filter(Boolean)
      .join(' '),
    parallel = mode() === 'parallel' && Boolean(r.excerptEn);
  return `<li class="result-card${pinned ? ' is-pinned' : ''}${expanded ? ' is-expanded' : ''}" data-id="${r.id}" data-href="${href}" tabindex="0" aria-expanded="${expanded}" aria-label="${tr(expanded ? 'browser.collapse' : 'browser.expand')}: ${esc(r.titleNo || r.id)}"><button class="pin-button" data-pin="${r.id}" aria-pressed="${pinned}" aria-label="${tr(pinned ? 'browser.unpin' : 'browser.pin')}"><i data-lucide="pin"></i></button><div class="result-id">${marked(r.id, activeTerms)}</div><h2><a href="${href}" data-title-link>${title(r)}</a></h2><div class="result-excerpt${parallel ? ' is-parallel' : ''}">${excerpt(r, expanded)}</div><div class="result-narrator${r.narrator ? '' : ' is-empty'}">${marked(r.narrator || '—', activeTerms)}</div><div class="result-collector${r.collector ? '' : ' is-empty'}">${marked(r.collector || '—', activeTerms)}</div><div class="result-place${r.place ? '' : ' is-empty'}">${marked(r.place || '—', activeTerms)}</div><div class="result-year${r.year ? '' : ' is-empty'}">${marked(r.year || '—', activeTerms)}</div>${whereWhen ? `<div class="card-location">${marked(whereWhen, activeTerms)}</div>` : ''}${people ? `<div class="card-people">${people}</div>` : ''}<a class="read-full" href="${href}">${tr('browser.readAll')} <i data-lucide="arrow-right"></i></a></li>`;
}

function sortValue(r: R) {
  if (sortKey === 'id') return r.id;
  if (sortKey === 'title') return mode() === 'en' ? r.titleEn : r.titleNo;
  if (sortKey === 'narrator') return r.narrator;
  if (sortKey === 'collector') return r.collector;
  if (sortKey === 'place') return r.place;
  if (sortKey.startsWith('year')) return r.year;
  return hash(r.id + seed);
}

function refreshIcons() {
  window.renderLucideIcons?.();
}

function textMatches(r: R, terms: string[], index: Map<string, SearchText> | null) {
  if (!terms.length) return true;
  const text = index?.get(r.id),
    common = [r.id, r.place, r.narrator, r.collector].join(' '),
    languageText =
      mode() === 'no'
        ? `${r.titleNo} ${r.chapterNo} ${text?.no || ''}`
        : mode() === 'en'
          ? `${r.titleEn} ${r.chapterEn} ${text?.en || ''}`
          : `${r.titleNo} ${r.chapterNo} ${text?.no || ''} ${r.titleEn} ${r.chapterEn} ${text?.en || ''}`,
    haystack = searchNorm(`${common} ${languageText}`);
  return terms.every((term) => haystack.includes(term));
}

function filterValue(r: R, type: MultiType) {
  return {
    theme: r.mlCategoryId,
    narrator: r.narratorId || unknownPerson,
    collector: r.collectorId || unknownPerson,
    county: r.countyId,
    place: r.placeId,
    genre: r.genreId,
    volume: r.subgenreId,
    translation: r.translationId,
  }[type];
}
function selected(type: MultiType, value: string) {
  return !explicitSelections.has(type) || selections[type].has(value || unknownPerson);
}
function baseMatches(r: R, skip: MultiType | '' = '') {
  return (
    (!selectionOnly || sharedSelection.has(r.id)) &&
    (!pinnedOnly || pins.has(r.id)) &&
    filterTypes.every(
      (type) =>
        type === skip ||
        (type === 'place' && !r.placeId
          ? includeUnknownPlace.checked
          : selected(type, filterValue(r, type))),
    ) &&
    (r.year
      ? Number(r.year) >= Number(yearFrom.value) && Number(r.year) <= Number(yearTo.value)
      : includeUndated.checked)
  );
}

function updateFilterOptions() {
  filterTypes.forEach((type) => {
    const allowed = new Set(
        data
          .filter((r) => baseMatches(r, type) && textMatches(r, activeTerms, searchIndex))
          .map((r) => filterValue(r, type) || unknownPerson),
      ),
      search = root.querySelector<HTMLInputElement>(`[data-filter-search="${type}"]`),
      term = search ? fold(search.value) : '',
      current = selections[type];
    root
      .querySelectorAll<HTMLElement>(`[data-filter-options="${type}"] [data-option]`)
      .forEach((label) => {
        const input = label.querySelector<HTMLInputElement>('input')!,
          available =
            allowed.has(input.value) || (explicitSelections.has(type) && current.has(input.value));
        if (!explicitSelections.has(type)) input.checked = available;
        const optionCount = label.querySelector('small');
        if (optionCount) {
          const scope = selectionOnly
            ? data.filter((record) => sharedSelection.has(record.id))
            : data;
          optionCount.textContent = `(${scope.filter((record) => (filterValue(record, type) || unknownPerson) === input.value).length})`;
        }
        label.hidden = !available || (!!term && !fold(label.textContent || '').includes(term));
        input.disabled = !available;
      });
    root.querySelector(`[data-filter-count="${type}"]`)!.textContent = explicitSelections.has(type)
      ? tr('browser.selected', { count: current.size })
      : selectionOnly
        ? tr('browser.allInSelection', { count: allowed.size })
        : tr('browser.all');
  });
}

function renderActiveFilters() {
  const entries: [string, string, string][] = [];
  if (selectionOnly)
    entries.push([
      'selection',
      tr('browser.selectionScope', {
        count: data.filter((record) => sharedSelection.has(record.id)).length,
      }),
      '',
    ]);
  activeTerms.forEach((term, index) =>
    entries.push(['q', tr('browser.searched', { value: activeTermLabels[index] || term }), term]),
  );
  filterTypes.forEach((type) => {
    if (!explicitSelections.has(type)) return;
    selections[type].forEach((value) => {
      const option = root.querySelector<HTMLElement>(
          `[data-filter-options="${type}"] [data-option="${CSS.escape(value)}"] span`,
        ),
        label = (option?.textContent || value).replace(/\s*\(\d+\)\s*$/, '');
      entries.push([type, label, value]);
    });
  });
  if (yearFrom.value !== yearFrom.min || yearTo.value !== yearTo.max)
    entries.push(['years', `${yearFrom.value}–${yearTo.value}`, '']);
  if (!includeUndated.checked) entries.push(['undated', tr('browser.withoutUndated'), '']);
  if (!includeUnknownPlace.checked) entries.push(['unknown-place', 'Uten ukjente steder', '']);
  activeFilters.hidden = !entries.length;
  clearButton.hidden = !entries.length;
  activeFilters.innerHTML = entries
    .map(
      ([type, label, value]) =>
        `<button type="button" data-remove-filter="${type}" data-filter-value="${esc(value)}">${esc(label)} <i data-lucide="x"></i></button>`,
    )
    .join('');
  refreshIcons();
  activeFilters.querySelectorAll<HTMLButtonElement>('button').forEach((button) =>
    button.addEventListener('click', () => {
      const type = button.dataset.removeFilter!,
        value = button.dataset.filterValue!;
      if (type === 'selection') clearSelectionScope();
      if (type === 'q') {
        const remaining = parseRawTerms(q.value).filter((term) => searchNorm(term) !== value);
        q.value = remaining.map((term) => (term.includes(' ') ? `"${term}"` : term)).join(' ');
      }
      if (filterTypes.includes(type as MultiType)) {
        selections[type as MultiType].delete(value);
        if (!selections[type as MultiType].size) explicitSelections.delete(type as MultiType);
        syncFilterChecks();
      }
      if (type === 'years') {
        yearFrom.value = yearFrom.min;
        yearTo.value = yearTo.max;
      }
      if (type === 'undated') includeUndated.checked = true;
      if (type === 'unknown-place') includeUnknownPlace.checked = true;
      syncYears();
      page = 1;
      render();
    }),
  );
}

async function render() {
  searchHelp.hidden = !q.value.trim();
  const current = ++token,
    labels = parseRawTerms(q.value.trim()),
    terms = labels.map(searchNorm),
    index = terms.length ? await ensureSearch() : null;
  if (current !== token) return;
  activeTerms = terms;
  activeTermLabels = labels;
  let rows = data.filter((r) => textMatches(r, terms, index) && baseMatches(r));
  rows.sort((a, b) => {
    const pd = Number(pins.has(b.id)) - Number(pins.has(a.id));
    return (
      pd ||
      String(sortValue(a)).localeCompare(String(sortValue(b)), 'no', { numeric: true }) *
        sortDirection
    );
  });
  sessionStorage.setItem(
    'norske-browse-results',
    JSON.stringify(rows.map(({ id, titleNo, titleEn }) => ({ id, titleNo, titleEn }))),
  );
  const total = Math.max(1, Math.ceil(rows.length / size));
  page = Math.min(page, total);
  list.innerHTML = rows
    .slice((page - 1) * size, page * size)
    .map(item)
    .join('');
  count.textContent = rows.length.toLocaleString('no-NO');
  pageLabel.textContent = tr('browse.page', { page, total });
  clearPinsButton.hidden = !pins.size;
  empty.hidden = !!rows.length;
  list.hidden = !rows.length;
  pages.innerHTML = '';
  [1, page - 1, page, page + 1, total]
    .filter((v, i, a) => total > 1 && v > 0 && v <= total && a.indexOf(v) === i)
    .sort((a, b) => a - b)
    .forEach((n, i, a) => {
      if (i && n - a[i - 1] > 1) pages.append('…');
      if (n === page) {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = String(total);
        input.value = String(page);
        input.className = 'pagination-current';
        input.setAttribute('aria-label', tr('browser.currentPage', { total }));
        const go = () => {
          const requested = Math.max(1, Math.min(total, Number(input.value) || page));
          if (requested !== page) {
            page = requested;
            render();
          } else input.value = String(page);
        };
        input.addEventListener('change', go);
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            go();
          }
        });
        pages.append(input);
      } else {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(n);
        b.addEventListener('click', () => {
          page = n;
          render();
        });
        pages.append(b);
      }
    });
  updateFilterOptions();
  renderActiveFilters();
  refreshIcons();
  list.querySelectorAll<HTMLButtonElement>('[data-pin]').forEach((b) =>
    b.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = b.dataset.pin!;
      pins.has(id) ? pins.delete(id) : pins.add(id);
      localStorage.setItem('norske-pins', JSON.stringify([...pins]));
      render();
    }),
  );
  list.querySelectorAll<HTMLElement>('[data-href]').forEach((card) => {
    const activate = async () => {
      if (view === 'grid' && !matchMedia('(max-width:600px)').matches) {
        location.href = card.dataset.href!;
        return;
      }
      await ensureSearch();
      expandedIds.has(card.dataset.id!)
        ? expandedIds.delete(card.dataset.id!)
        : expandedIds.add(card.dataset.id!);
      render();
    };
    card.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-pin],.read-full')) return;
      if (target.closest('[data-title-link]')) event.preventDefault();
      activate();
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target === card) {
        event.preventDefault();
        activate();
      }
    });
  });
}

function updateSortState() {
  root.querySelectorAll<HTMLButtonElement>('[data-column-sort]').forEach((button) => {
    const active = view === 'list' && button.dataset.columnSort === sortKey;
    button.setAttribute('aria-pressed', String(active));
    if (active) button.dataset.sortDirection = sortDirection === 1 ? 'ascending' : 'descending';
    else delete button.dataset.sortDirection;
    const icon = button.querySelector<HTMLElement>('[data-lucide]');
    if (icon)
      icon.dataset.lucide = active
        ? sortDirection === 1
          ? 'arrow-up'
          : 'arrow-down'
        : 'arrow-up-down';
    if (active)
      button.setAttribute(
        'aria-label',
        `${button.textContent?.trim()}: ${tr(sortDirection === 1 ? 'browser.sortAscending' : 'browser.sortDescending')}`,
      );
    else button.removeAttribute('aria-label');
  });
  refreshIcons();
}
function setMode(m: string) {
  document.documentElement.dataset.contentMode = m;
  localStorage.setItem('norske-content-mode', m);
  root
    .querySelectorAll<HTMLButtonElement>('[data-text-mode]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.textMode === m)));
  render();
}
function setView(v: string) {
  view = v;
  root.dataset.view = v;
  localStorage.setItem('norske-browse-view', v);
  root
    .querySelectorAll<HTMLButtonElement>('[data-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  listHead.hidden = v !== 'list';
  cardSortWrap.hidden = v !== 'grid';
  applyFilterCollapse(v);
  updateSortState();
}

function syncFilterChecks() {
  filterTypes.forEach((type) =>
    root
      .querySelectorAll<HTMLInputElement>(`[data-filter-options="${type}"] input`)
      .forEach(
        (input) =>
          (input.checked = explicitSelections.has(type)
            ? selections[type].has(input.value)
            : !selectionOnly ||
              data.some(
                (record) =>
                  sharedSelection.has(record.id) &&
                  (filterValue(record, type) || unknownPerson) === input.value,
              )),
      ),
  );
}
root.querySelectorAll<HTMLInputElement>('[data-filter-options] input').forEach((input) =>
  input.addEventListener('change', () => {
    const type = input.closest<HTMLElement>('[data-filter-options]')!.dataset
        .filterOptions as MultiType,
      options = root.querySelectorAll<HTMLInputElement>(`[data-filter-options="${type}"] input`);
    explicitSelections.add(type);
    selections[type].clear();
    options.forEach((option) => {
      if (option.checked) selections[type].add(option.value);
    });
    page = 1;
    render();
  }),
);
root
  .querySelectorAll<HTMLInputElement>('[data-filter-search]')
  .forEach((input) => input.addEventListener('input', updateFilterOptions));
root
  .querySelectorAll<HTMLButtonElement>('[data-filter-select-all],[data-filter-clear-all]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      const group = button.closest<HTMLElement>('[data-multi-filter]')!,
        type = group.dataset.multiFilter as MultiType,
        selectAll = button.hasAttribute('data-filter-select-all');
      selections[type].clear();
      if (selectAll) explicitSelections.delete(type);
      else explicitSelections.add(type);
      group
        .querySelectorAll<HTMLInputElement>('[data-filter-options] input')
        .forEach((input) => (input.checked = selectAll));
      page = 1;
      render();
    }),
  );
root.querySelector('[data-clear]')?.addEventListener('click', () => {
  if (selectionOnly) clearSelectionScope();
  q.value = '';
  page = 1;
  yearFrom.value = yearFrom.min;
  yearTo.value = yearTo.max;
  includeUndated.checked = true;
  includeUnknownPlace.checked = true;
  explicitSelections.clear();
  Object.values(selections).forEach((set) => set.clear());
  syncFilterChecks();
  syncYears();
  render();
});
clearPinsButton.addEventListener('click', () => {
  pins.clear();
  localStorage.setItem('norske-pins', '[]');
  render();
});

includeUnknownPlace.addEventListener('change', () => {
  page = 1;
  render();
});
openPinsButton.addEventListener('click', () => {
  const params = new URLSearchParams({ selection: [...pins].join(',') });
  window.open(`${location.pathname}?${params}`, '_blank', 'noopener');
});
const selectionUrl = () => {
  const url = new URL(location.pathname, location.origin),
    ids = selectionOnly
      ? data
          .filter((record) => baseMatches(record) && textMatches(record, activeTerms, searchIndex))
          .map((record) => record.id)
      : [...pins];
  url.searchParams.set('selection', ids.join(','));
  return url.href;
};
copySelectionButton.addEventListener('click', async () => {
  const text = selectionUrl();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  const icon = copySelectionButton.querySelector<HTMLElement>('[data-lucide]')!,
    label = copySelectionButton.querySelector<HTMLElement>('span')!;
  copySelectionButton.classList.add('copied');
  icon.dataset.lucide = 'check';
  label.textContent = tr('browser.selectionLinkCopied');
  refreshIcons();
  setTimeout(() => {
    copySelectionButton.classList.remove('copied');
    icon.dataset.lucide = 'link';
    label.textContent = tr('browser.copySelectionLink');
    refreshIcons();
  }, 1800);
});
const syncOpenPins = () => {
  openPinsButton.hidden = pinnedOnly || selectionOnly;
  copySelectionButton.hidden = !pinnedOnly && !selectionOnly;
  openPinsButton.querySelector('span')!.textContent = tr('browser.openPinsShort');
  openPinsButton.setAttribute('aria-label', tr('browser.openPins'));
  copySelectionButton.querySelector('span')!.textContent = tr('browser.copySelectionLink');
  copySelectionButton.setAttribute('aria-label', tr('browser.copySelectionLink'));
  refreshIcons();
};
const reloadPins = () => {
  pins.clear();
  try {
    for (const id of JSON.parse(localStorage.getItem('norske-pins') || '[]')) pins.add(id);
  } catch {}
  page = 1;
  syncOpenPins();
  render();
};
window.addEventListener('ui-language-change', syncOpenPins);
window.addEventListener('storage', (event) => {
  if (event.key === 'norske-pins') reloadPins();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) reloadPins();
});
syncOpenPins();

const filterMenus = [
  ...root.querySelectorAll<HTMLDetailsElement>('.filter-sidebar details.multi-select'),
];
document.addEventListener('click', (event) => {
  const target = event.target as Node;
  filterMenus.forEach((menu) => {
    if (menu.open && !menu.contains(target)) menu.open = false;
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') filterMenus.forEach((menu) => (menu.open = false));
});

// @ts-ignore CSV columns are assembled dynamically from the selected language fields.
const syncDownloadLabel = () => {
  downloadMenu.querySelector('summary span')!.textContent = tr('browser.download');
  downloadMenu.querySelector('summary')!.setAttribute('aria-label', tr('browser.download'));
  downloadMenu.querySelector('.download-citation legend')!.textContent = tr('browser.citation');
};
const exportCitations = {
  clarin: { text: 'Norske sagn template dataset.', url: 'https://www2.hf.uio.no/eventyr_og_sagn/' },
  site: {
    text: 'Norske sagn. Development template.',
    url: 'https://ul-dhc.github.io/norwegian-folk-legends/',
  },
};
const selectedExportCitation = () =>
  exportCitations[
    (downloadMenu.querySelector<HTMLInputElement>('input[name="download-citation"]:checked')
      ?.value || 'clarin') as keyof typeof exportCitations
  ];
const exportRecords = async () => {
  const full = await ensureSearch(),
    rows = data.filter((r) => textMatches(r, activeTerms, full) && baseMatches(r)),
    language = mode();
  rows.sort((a, b) => {
    const pd = Number(pins.has(b.id)) - Number(pins.has(a.id));
    return (
      pd ||
      String(sortValue(a)).localeCompare(String(sortValue(b)), 'no', { numeric: true }) *
        sortDirection
    );
  });
  return rows.map((r) => {
    const text = full.get(r.id),
      record: Record<string, string> = {
        id: r.id,
        volume: r.volume,
        place: r.place,
        narrator: r.narrator,
        collector: r.collector,
        year: r.year,
      };
    if (language !== 'en')
      Object.assign(record, {
        title_lv: r.titleNo,
        text_lv: text?.no || '',
        chapter_lv: r.chapterNo,
      });
    if (language !== 'no')
      Object.assign(record, {
        title_de: r.titleEn,
        text_de: text?.en || '',
        chapter_de: r.chapterEn,
      });
    return record;
  });
};
const downloadBlob = (content: string, type: string, extension: string) => {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    link = document.createElement('a'),
    date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `norske-sagn-${selectionOnly || pinnedOnly ? 'selection' : 'results'}-${date}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
downloadMenu.querySelectorAll<HTMLButtonElement>('[data-download-format]').forEach((button) =>
  button.addEventListener('click', async () => {
    button.disabled = true;
    const records = await exportRecords(),
      format = button.dataset.downloadFormat!,
      citation = selectedExportCitation(),
      citationLabel = `${tr('browser.citation')}: ${citation.text} ${citation.url}`;
    if (format === 'json')
      downloadBlob(
        JSON.stringify(
          { citation: citationLabel, citation_url: citation.url, language: mode(), records },
          null,
          2,
        ),
        'application/json;charset=utf-8',
        'json',
      );
    if (format === 'csv') {
      const enriched: Record<string,string>[] = records.map((record) => ({
          ...record,
          citation: citationLabel,
          citation_url: citation.url,
        })),
        keys = Object.keys(enriched[0] || { id: '', citation: '', citation_url: '' }),
        cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      downloadBlob(
        '\ufeff' +
          [
            keys.join(','),
            ...enriched.map((record) => keys.map((key) => cell(record[key])).join(',')),
          ].join('\r\n'),
        'text/csv;charset=utf-8',
        'csv',
      );
    }
    if (format === 'txt') {
      const text = records
        .map((record) => {
          const lines = [`ID: ${record.id}`];
          if (record.title_lv !== undefined)
            lines.push(`NO: ${record.title_lv}`, record.text_lv || '');
          if (record.title_de !== undefined)
            lines.push(`EN: ${record.title_de}`, record.text_de || '');
          lines.push(
            `${tr('meta.chapter')}: ${[record.chapter_lv, record.chapter_de].filter(Boolean).join(' / ')}`,
            `${tr('meta.place')}: ${record.place || '—'}`,
            `${tr('meta.narrator')}: ${record.narrator || '—'}`,
            `${tr('meta.collector')}: ${record.collector || '—'}`,
            `${tr('meta.year')}: ${record.year || '—'}`,
          );
          return lines.join('\n');
        })
        .join('\n\n-----\n\n');
      downloadBlob(`${citationLabel}\n\n${text}`, 'text/plain;charset=utf-8', 'txt');
    }
    button.disabled = false;
    downloadMenu.open = false;
  }),
);
downloadMenu.addEventListener('click', (event) => event.stopPropagation());
document.addEventListener('click', () => (downloadMenu.open = false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') downloadMenu.open = false;
});
window.addEventListener('ui-language-change', syncDownloadLabel);
syncDownloadLabel();
refreshIcons();

exportCitations.clarin.text = `${exportCitations.clarin.text} https://www2.hf.uio.no/eventyr_og_sagn/\n${tr('browser.citation')}: ${exportCitations.site.text}`;
exportCitations.clarin.url = exportCitations.site.url;
downloadMenu.querySelector('.download-citation')?.setAttribute('hidden', '');

const combinedCitation = () =>
  `${tr('browser.citation')}\n(1) Norske sagn template dataset. https://www2.hf.uio.no/eventyr_og_sagn/\n\n(2) Norske sagn. Development template. https://ul-dhc.github.io/norwegian-folk-legends/`;
downloadMenu.addEventListener(
  'click',
  async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[data-download-format]',
    );
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    const records = await exportRecords(),
      format = button.dataset.downloadFormat!,
      citationHeading = tr('browser.citation');
    if (format === 'json')
      downloadBlob(
        JSON.stringify(
          {
            citation_heading: citationHeading,
            citations: [
              {
                number: 1,
                text: 'Norske sagn template dataset.',
                url: 'https://www2.hf.uio.no/eventyr_og_sagn/',
              },
              {
                number: 2,
                text: 'Norske sagn. Development template.',
                url: 'https://ul-dhc.github.io/norwegian-folk-legends/',
              },
            ],
            language: mode(),
            records,
          },
          null,
          2,
        ),
        'application/json;charset=utf-8',
        'json',
      );
    if (format === 'csv') {
      const enriched = records.map((record) => ({ ...record, citation: combinedCitation() })),
        keys = Object.keys(enriched[0] || { id: '', citation: '' }),
        cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      downloadBlob(
        '\ufeff' +
          [
            keys.join(','),
            ...enriched.map((record) =>
              keys.map((key) => cell((record as Record<string, string>)[key])).join(','),
            ),
          ].join('\r\n'),
        'text/csv;charset=utf-8',
        'csv',
      );
    }
    if (format === 'txt') {
      const text = records
        .map((record) => {
          const lines = [`ID: ${record.id}`];
          if (record.title_lv !== undefined)
            lines.push(`NO: ${record.title_lv}`, record.text_lv || '');
          if (record.title_de !== undefined)
            lines.push(`EN: ${record.title_de}`, record.text_de || '');
          lines.push(
            `${tr('meta.chapter')}: ${[record.chapter_lv, record.chapter_de].filter(Boolean).join(' / ')}`,
            `${tr('meta.place')}: ${record.place || '—'}`,
            `${tr('meta.narrator')}: ${record.narrator || '—'}`,
            `${tr('meta.collector')}: ${record.collector || '—'}`,
            `${tr('meta.year')}: ${record.year || '—'}`,
          );
          return lines.join('\n');
        })
        .join('\n\n-----\n\n');
      downloadBlob(`${combinedCitation()}\n\n${text}`, 'text/plain;charset=utf-8', 'txt');
    }
    button.disabled = false;
    downloadMenu.open = false;
  },
  true,
);

pages.addEventListener('focusin', (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>('.pagination-current');
  if (input) {
    input.inputMode = 'numeric';
    input.select();
  }
});

const pageJump = root.querySelector<HTMLInputElement>('[data-page-jump]')!;
const goToEnteredPage = () => {
  const total = Number(pageLabel.textContent?.match(/\d+\D+(\d+)/)?.[1] || 1),
    requested = Number(pageJump.value);
  if (!Number.isInteger(requested) || requested < 1 || requested > total) {
    pageJump.setCustomValidity(tr('browser.pageRange', { total }));
    pageJump.reportValidity();
    return;
  }
  pageJump.setCustomValidity('');
  page = requested;
  pageJump.value = '';
  render();
};
pageJump.addEventListener('change', goToEnteredPage);
pageJump.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    goToEnteredPage();
  }
});

const pageSizeMenu = root.querySelector<HTMLDetailsElement>('[data-page-size-menu]')!,
  pageSizeLabel = root.querySelector<HTMLElement>('[data-page-size-label]')!,
  pageSizeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-page-size]')];
pageSizeButtons.forEach((button) =>
  button.addEventListener('click', () => {
    size = Number(button.dataset.pageSize);
    page = 1;
    pageSizeLabel.textContent = String(size);
    pageSizeButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    pageSizeMenu.open = false;
    render();
  }),
);
document.addEventListener('click', (event) => {
  if (pageSizeMenu.open && !pageSizeMenu.contains(event.target as Node)) pageSizeMenu.open = false;
});

const sortMenu = root.querySelector<HTMLDetailsElement>('[data-sort-menu]')!,
  sortLabel = root.querySelector<HTMLElement>('[data-sort-label]')!,
  sortButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-sort-value]')],
  sortDirectionButton = document.createElement('button');
sortDirectionButton.type = 'button';
sortDirectionButton.className = 'sort-direction';
sortDirectionButton.innerHTML = '<i data-lucide="arrow-up"></i>';
sortMenu.insertAdjacentElement('afterend', sortDirectionButton);
const syncCustomSort = () => {
  const active = sortButtons.find((button) => button.dataset.sortValue === cardSort.value),
    random = cardSort.value === 'random';
  sortButtons.forEach((button) => button.setAttribute('aria-pressed', String(button === active)));
  if (active) sortLabel.textContent = active.querySelector('span')?.textContent || '';
  sortDirectionButton.hidden = random;
  sortDirectionButton.dataset.direction = sortDirection === 1 ? 'ascending' : 'descending';
  sortDirectionButton.setAttribute(
    'aria-label',
    tr(sortDirection === 1 ? 'browser.sortAscending' : 'browser.sortDescending'),
  );
  sortDirectionButton.querySelector<HTMLElement>('[data-lucide]')!.dataset.lucide =
    sortDirection === 1 ? 'arrow-up' : 'arrow-down';
  refreshIcons();
};
sortButtons.forEach((button) =>
  button.addEventListener('click', () => {
    cardSort.value = button.dataset.sortValue!;
    cardSort.dispatchEvent(new Event('change', { bubbles: true }));
    sortMenu.open = false;
    syncCustomSort();
  }),
);
sortDirectionButton.addEventListener('click', () => {
  sortDirection *= -1;
  page = 1;
  updateSortState();
  syncCustomSort();
  render();
});
window.addEventListener('ui-language-change', () => {
  updateSortState();
  requestAnimationFrame(syncCustomSort);
});
syncCustomSort();

function syncYears() {
  if (+yearFrom.value > +yearTo.value)
    [yearFrom.value, yearTo.value] = [yearTo.value, yearFrom.value];
  const fromOutput = root.querySelector<HTMLElement>('[data-year-from]')!,
    toOutput = root.querySelector<HTMLElement>('[data-year-to]')!;
  fromOutput.textContent = yearFrom.value;
  toOutput.textContent = yearTo.value;
  const fromChanged = yearFrom.value !== yearFrom.min,
    toChanged = yearTo.value !== yearTo.max;
  fromOutput.classList.toggle('is-changed', fromChanged);
  toOutput.classList.toggle('is-changed', toChanged);
  timeline.classList.toggle('is-active', fromChanged || toChanged);
  const min = +yearFrom.min,
    max = +yearFrom.max,
    left = ((+yearFrom.value - min) / (max - min)) * 100,
    right = 100 - ((+yearTo.value - min) / (max - min)) * 100;
  root.querySelector<HTMLElement>('.range-track')!.style.setProperty('--range-left', `${left}%`);
  root.querySelector<HTMLElement>('.range-track')!.style.setProperty('--range-right', `${right}%`);
}
const syncSearchHelp = () => {
  searchHelp.hidden = !q.value.trim();
};
let rangeFrame = 0,
  searchTimer = 0,
  isComposing = false;
root.querySelector('[data-controls]')!.addEventListener('input', (event) => {
  if ((event.target as HTMLElement).closest('[data-multi-filter]')) return;
  syncYears();
  page = 1;
  if ((event.target as HTMLInputElement).type === 'range') {
    cancelAnimationFrame(rangeFrame);
    rangeFrame = requestAnimationFrame(() => render());
  } else render();
});
q.addEventListener('compositionstart', () => (isComposing = true));
q.addEventListener('compositionend', () => {
  isComposing = false;
  window.clearTimeout(searchTimer);
  page = 1;
  render();
});
q.addEventListener('input', () => {
  syncSearchHelp();
  if (isComposing) return;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    page = 1;
    render();
  }, 180);
});
mobileFilterToggle.addEventListener('click', () => {
  const open = !filterSidebar.classList.contains('filters-open');
  filterSidebar.classList.toggle('filters-open', open);
  mobileFilterToggle.setAttribute('aria-expanded', String(open));
});
root
  .querySelectorAll<HTMLButtonElement>('[data-text-mode]')
  .forEach((b) => b.addEventListener('click', () => setMode(b.dataset.textMode!)));
root
  .querySelectorAll<HTMLButtonElement>('[data-view]')
  .forEach((b) => b.addEventListener('click', () => setView(b.dataset.view!)));
root.querySelectorAll<HTMLButtonElement>('[data-column-sort]').forEach((b) =>
  b.addEventListener('click', () => {
    const k = b.dataset.columnSort!;
    sortDirection = sortKey === k ? -sortDirection : 1;
    sortKey = k;
    updateSortState();
    render();
  }),
);
cardSort.addEventListener('change', () => {
  sortKey = cardSort.value;
  sortDirection = sortKey === 'year-desc' ? -1 : 1;
  updateSortState();
  render();
});
const initial = new URLSearchParams(location.search).get('q');
if (initial) q.value = initial;
const translateThemeOptions = (lang: string) =>
  root
    .querySelectorAll<HTMLElement>('[data-option-no]')
    .forEach(
      (option) =>
        (option.textContent =
          lang === 'en'
            ? option.dataset.optionEn || option.dataset.optionNo!
            : option.dataset.optionNo!),
    );
window.addEventListener('ui-language-change', (event) => {
  translateThemeOptions((event as CustomEvent).detail);
  pageJump.setCustomValidity('');
  render();
});
translateThemeOptions(document.documentElement.dataset.uiLang || 'no');
syncSearchHelp();
syncYears();
syncFilterChecks();
setMode(mode());
setView(view);
render();

async function animateReorder(goToFirstPage = false) {
  const before = new Map<string, number>();
  list
    .querySelectorAll<HTMLElement>('.result-card[data-id]')
    .forEach((item) => before.set(item.dataset.id!, item.getBoundingClientRect().top));
  if (goToFirstPage) page = 1;
  await render();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animations: Animation[] = [];
  list.querySelectorAll<HTMLElement>('.result-card[data-id]').forEach((item) => {
    const oldTop = before.get(item.dataset.id!);
    if (oldTop === undefined) return;
    const delta = oldTop - item.getBoundingClientRect().top;
    if (Math.abs(delta) > 1)
      animations.push(
        item.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
          duration: 680,
          easing: 'cubic-bezier(.22,.75,.2,1)',
        }),
      );
  });
  await Promise.allSettled(animations.map((animation) => animation.finished));
}

list.addEventListener(
  'click',
  (event) => {
    const pin = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-pin]');
    if (!pin) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id = pin.dataset.pin!,
      card = pin.closest<HTMLElement>('.result-card')!,
      willPin = !pins.has(id);
    willPin ? pins.add(id) : pins.delete(id);
    localStorage.setItem('norske-pins', JSON.stringify([...pins]));
    pin.setAttribute('aria-pressed', String(willPin));
    pin.setAttribute('aria-label', `${willPin ? 'Fjern feste fra' : 'Fest'} sagn`);
    card.classList.toggle('is-pinned', willPin);
    clearPinsButton.hidden = !pins.size;
    pin.disabled = true;
    window.setTimeout(() => animateReorder(), 360);
  },
  true,
);

const undatedLabel = root.querySelector<HTMLElement>('.undated-toggle small'),
  undatedValues = undatedLabel?.textContent?.match(/(\d+)%.*?(\d+)/);
const translateUndated = () => {
  if (undatedLabel && undatedValues)
    undatedLabel.textContent = tr('filters.undatedCount', {
      percent: undatedValues[1],
      count: Number(undatedValues[2]).toLocaleString(document.documentElement.lang),
    });
};
window.addEventListener('ui-language-change', translateUndated);
translateUndated();

window.addEventListener('content-mode-change', (event) => setMode((event as CustomEvent).detail));

export {};
