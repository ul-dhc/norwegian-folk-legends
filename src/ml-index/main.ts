import { copy } from './copy';
import { mapLink } from './map-link.js';
import type { types as collection, topics as topicData } from './data';

type Type = (typeof collection)[number];
type Topic = (typeof topicData)[number];
const { types, topics, base } = JSON.parse(document.querySelector('#ml-data')!.textContent!) as {
  types: Type[];
  topics: Topic[];
  base: string;
};
type Key = keyof typeof copy.en;
const $ = (id: string) => document.getElementById(id)!;
const lang = () => (document.documentElement.dataset.uiLang === 'en' ? 'en' : 'no');
const t = (key: Key) => copy[lang()][key];
const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const title = (type: Type) => (lang() === 'en' ? type.en || type.no : type.no);
const codeKey = (type: Type) => type.code.replace(/\s/g, '');
const byCode = (code: string | null) =>
  types.find(
    (type) => codeKey(type).toLowerCase() === (code || '').replace(/\s/g, '').toLowerCase(),
  );
const groupTypes = (topic: Topic) => types.filter((type) => type.topic === topic.id);
const explorerUrl = (set: Type[]) =>
  `${base}browse/?theme=${encodeURIComponent(set.map((type) => type.id).join(','))}`;
const search = $('ml-search') as HTMLInputElement;
const sort = $('ml-sort') as HTMLSelectElement;
const fold = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae');
function highlight(value: string) {
  const term = fold(search.value.trim());
  // Match against folded text while retaining original character positions.
  const chars = [...value];
  const positions = chars.flatMap((char, index) => [...fold(char)].map(() => index));
  const index = term ? fold(value).indexOf(term) : -1;
  if (index < 0) return esc(value);
  const start = positions[index],
    end = positions[index + term.length - 1] + 1;
  return (
    esc(chars.slice(0, start).join('')) +
    '<mark>' +
    esc(chars.slice(start, end).join('')) +
    '</mark>' +
    esc(chars.slice(end).join(''))
  );
}
function actions(set: Type[], topic: Topic) {
  const dataUrl = (view: string) => {
    const params = new URLSearchParams({ topic: topic.id, view });
    if (set.length === 1) params.set('type', codeKey(set[0]));
    if (view === 'network') {
      params.set('layout', 'free');
      params.set('categories', 'county,collector,typeId,narrator');
    }
    return `${base}data/?${params}#${view}`;
  };
  return [
    [explorerUrl(set), 'list', t('exploreType')],
    [mapLink(base, set), 'map-pin', t('openMap')],
    [dataUrl('network'), 'network', t('network')],
    [dataUrl('overview'), 'chart-no-axes-column', t('overview')],
  ]
    .map(
      ([href, icon, label]) =>
        `<a href="${esc(href)}" aria-label="${esc((set.length === 1 ? set[0].code : topic[lang()]) + ': ' + label)}" data-tooltip="${esc(label)}"><i data-lucide="${icon}" aria-hidden="true"></i></a>`,
    )
    .join('');
}
let selectedTopic: Topic | undefined;
let openTopics = new Set<string>();
let highlightedType: Type | undefined;

function readState() {
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'stats') {
    params.delete('view');
    location.replace(`${base}data/${params.size ? '?' + params : ''}`);
  }
  const type = byCode(params.get('type'));
  selectedTopic = topics.find((topic) => topic.id === (type?.topic || params.get('topic')));
  highlightedType = type;
  search.value = params.get('q') || '';
  sort.value = params.get('sort') === 'alphabetical' ? 'alphabetical' : 'collection';
  openTopics = new Set(
    (params.get('open') || '').split(',').filter((id) => topics.some((topic) => topic.id === id)),
  );
  if (selectedTopic) openTopics.add(selectedTopic.id);
}
function stateUrl() {
  const params = new URLSearchParams();
  if (search.value) params.set('q', search.value);
  if (sort.value === 'alphabetical') params.set('sort', sort.value);
  if (openTopics.size) params.set('open', [...openTopics].join(','));
  if (highlightedType) params.set('type', codeKey(highlightedType));
  return location.pathname + (params.size ? '?' + params : '');
}
function sync(push = false) {
  history[push ? 'pushState' : 'replaceState']({}, '', stateUrl());
}
function refreshIcons() {
  window.dispatchEvent(new Event('lucide-refresh'));
}

function renderContents() {
  const query = fold(search.value.trim());
  const compact = query.replace(/\s/g, '');
  let shown = 0;
  $('ml-toc').innerHTML = [...topics]
    .sort((a, b) =>
      sort.value === 'alphabetical'
        ? a[lang()].localeCompare(b[lang()], lang() === 'no' ? 'nb' : 'en')
        : a.min - b.min,
    )
    .map((topic) => {
      const inTopic = groupTypes(topic);
      const topicMatches = fold(`${topic.no} ${topic.en}`).includes(query);
      const matches = inTopic.filter(
        (type) =>
          !query ||
          topicMatches ||
          fold(`${type.code} ${type.no} ${type.en}`).includes(query) ||
          codeKey(type).toLowerCase().includes(compact),
      );
      if (!matches.length) return '';
      shown += matches.length;
      const total = inTopic.reduce((n, type) => n + type.records.length, 0);
      return `<details class="ml-topic-section" data-toc-topic="${topic.id}" ${query || openTopics.has(topic.id) ? 'open' : ''}>
   <summary><i data-lucide="chevron-right" aria-hidden="true"></i><span class="ml-topic-name">${highlight(topic[lang()])}</span><span class="ml-topic-meta"><small>ML ${topic.min}–${topic.max}</small><b>${total} ${t('legends')}</b></span></summary>
   <div class="ml-toc-body"><nav class="ml-topic-actions ml-catalog-actions" aria-label="${esc(topic[lang()])}">${actions(inTopic, topic)}</nav>
    <ul>${matches.map((type) => `<li class="${highlightedType === type ? 'is-highlighted' : ''}" data-toc-type="${codeKey(type)}"><span class="ml-code">${highlight(type.code)}</span><a class="ml-toc-title" href="${explorerUrl([type])}">${highlight(title(type))}</a><span class="ml-type-count" aria-label="${type.records.length} ${t('legends')}">${type.records.length}</span><nav class="ml-type-actions ml-catalog-actions" aria-label="${esc(type.code + ': ' + title(type))}">${actions([type], topic)}</nav></li>`).join('')}</ul>
   </div></details>`;
    })
    .join('');
  $('ml-count').textContent = query ? `${shown} / ${types.length} ${t('found')}` : '';
  $('ml-no-types').hidden = shown > 0;
  refreshIcons();
}
function render() {
  document.querySelectorAll<HTMLElement>('[data-ml-copy]').forEach((element) => {
    element.textContent = t(element.dataset.mlCopy as Key);
  });
  search.placeholder = t('searchPlaceholder');
  renderContents();
}

$('ml-toc').addEventListener(
  'toggle',
  (event) => {
    const details = event.target as HTMLDetailsElement;
    const id = details.dataset.tocTopic;
    if (!id || !details.isConnected || search.value.trim()) return;
    if (details.open) openTopics.add(id);
    else openTopics.delete(id);
    sync();
  },
  true,
);
sort.addEventListener('change', () => {
  renderContents();
  sync();
});
search.addEventListener('input', () => {
  renderContents();
  sync();
});
document.querySelector('.ml-page')!.addEventListener('click', async (event) => {
  const element = (event.target as Element).closest<HTMLElement>(
    'a[href="#ml-method"],[data-expand-all],[data-collapse-all]',
  );
  if (!element) return;
  if (
    element.tagName === 'A' &&
    ((event as MouseEvent).metaKey ||
      (event as MouseEvent).ctrlKey ||
      (event as MouseEvent).shiftKey)
  )
    return;
  if (element.getAttribute('href') === '#ml-method') {
    ($('ml-method') as HTMLDetailsElement).open = true;
  } else if (element.hasAttribute('data-expand-all') || element.hasAttribute('data-collapse-all')) {
    const expand = element.hasAttribute('data-expand-all');
    search.value = '';
    openTopics = new Set(expand ? topics.map((topic) => topic.id) : []);
    renderContents();
    sync();
  }
});
window.addEventListener('ui-language-change', render);
window.addEventListener('popstate', () => {
  readState();
  render();
});
readState();
render();
