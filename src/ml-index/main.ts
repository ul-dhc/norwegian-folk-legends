import {copy} from './copy';
import type {types as collection, topics as topicData} from './data';

type Type = typeof collection[number];
type Topic = typeof topicData[number];
const {types, topics, base} = JSON.parse(document.querySelector('#ml-data')!.textContent!) as {types: Type[]; topics: Topic[]; base: string};
type Key = keyof typeof copy.en;
const $ = (id: string) => document.getElementById(id)!;
const lang = () => document.documentElement.dataset.uiLang === 'en' ? 'en' : 'no';
const t = (key: Key) => copy[lang()][key];
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const title = (type: Type) => lang() === 'en' ? (type.en || type.no) : type.no;
const codeKey = (type: Type) => type.code.replace(/\s/g, '');
const byCode = (code: string | null) => types.find(type => codeKey(type).toLowerCase() === (code || '').replace(/\s/g, '').toLowerCase());
const groupTypes = (topic: Topic) => types.filter(type => type.topic === topic.id);
const explorerUrl = (set: Type[]) => `${base}browse/?theme=${encodeURIComponent(set.map(type => type.id).join(','))}`;
const search = $('ml-search') as HTMLInputElement;
let selectedTopic: Topic | undefined;
let openTopics = new Set<string>();
let highlightedType: Type | undefined;

function readState() {
 const params = new URLSearchParams(location.search);
 if(params.get('view')==='stats'){params.delete('view');location.replace(`${base}data/${params.size?'?'+params:''}`);}
 const type = byCode(params.get('type'));
 selectedTopic = topics.find(topic => topic.id === (type?.topic || params.get('topic')));
 highlightedType = type;
 search.value = params.get('q') || '';
 openTopics = new Set((params.get('open') || '').split(',').filter(id => topics.some(topic => topic.id === id)));
 if (selectedTopic) openTopics.add(selectedTopic.id);
}
function stateUrl() {
 const params = new URLSearchParams();
 if (search.value) params.set('q', search.value);
 if (openTopics.size) params.set('open', [...openTopics].join(','));
 if (highlightedType) params.set('type', codeKey(highlightedType));
 return location.pathname + (params.size ? '?' + params : '');
}
function sync(push = false) {
 history[push ? 'pushState' : 'replaceState']({}, '', stateUrl());
}
function refreshIcons() { window.dispatchEvent(new Event('lucide-refresh')); }

function renderContents() {
 const query = search.value.trim().toLocaleLowerCase();
 const compact = query.replace(/\s/g, '');
 let shown = 0;
 $('ml-toc').innerHTML = topics.map(topic => {
  const inTopic = groupTypes(topic);
  const topicMatches = `${topic.no} ${topic.en}`.toLocaleLowerCase().includes(query);
  const matches = inTopic.filter(type => !query || topicMatches || `${type.code} ${type.no} ${type.en}`.toLocaleLowerCase().includes(query) || codeKey(type).toLowerCase().includes(compact));
  if (!matches.length) return '';
  shown += matches.length;
  const total = inTopic.reduce((n, type) => n + type.records.length, 0);
  return `<details class="ml-topic-section" data-toc-topic="${topic.id}" ${query || openTopics.has(topic.id) ? 'open' : ''}>
   <summary><i data-lucide="chevron-right"></i><span>${esc(topic[lang()])}</span><small>ML ${topic.min}–${topic.max}</small><b>${total} ${t('legends')}</b></summary>
   <div class="ml-toc-body"><div class="ml-topic-actions"><span>${inTopic.length} ${t('types')} · ${total} ${t('legends')}</span><a class="icon-link" href="${explorerUrl(inTopic)}">${t('exploreTopic')}<i data-lucide="arrow-right"></i></a></div>
    <ul>${matches.map(type => `<li class="${highlightedType === type ? 'is-highlighted' : ''}" data-toc-type="${codeKey(type)}"><span class="ml-code">${type.code}</span><a class="ml-toc-title" href="${explorerUrl([type])}">${esc(title(type))}</a><a class="ml-toc-open icon-link" href="${explorerUrl([type])}" aria-label="${esc(type.code + ': ' + t('exploreType') + ' (' + type.records.length + ')')}"><span>${type.records.length} ${t('legends')}</span><i data-lucide="arrow-right"></i></a></li>`).join('')}</ul>
   </div></details>`;
 }).join('');
 $('ml-count').textContent = query ? `${shown} / ${types.length} ${t('found')}` : '';
 $('ml-no-types').hidden = shown > 0;
 refreshIcons();
}
function render() {
 document.querySelectorAll<HTMLElement>('[data-ml-copy]').forEach(element => { element.textContent = t(element.dataset.mlCopy as Key); });
 search.placeholder = t('searchPlaceholder');
 renderContents();
}

$('ml-toc').addEventListener('toggle',event => {
 const details = event.target as HTMLDetailsElement;
 const id = details.dataset.tocTopic;
 if (!id || !details.isConnected || search.value.trim()) return;
 if (details.open) openTopics.add(id); else openTopics.delete(id);
 sync();
},true);
search.addEventListener('input',() => { renderContents(); sync(); });
document.querySelector('.ml-page')!.addEventListener('click',async event => {
 const element = (event.target as Element).closest<HTMLElement>('a[href="#ml-method"],[data-expand-all],[data-collapse-all]');
 if (!element) return;
 if (element.tagName === 'A' && ((event as MouseEvent).metaKey || (event as MouseEvent).ctrlKey || (event as MouseEvent).shiftKey)) return;
 if (element.getAttribute('href') === '#ml-method') { ($('ml-method') as HTMLDetailsElement).open = true; }
 else if (element.hasAttribute('data-expand-all') || element.hasAttribute('data-collapse-all')) {
  const expand = element.hasAttribute('data-expand-all');
  search.value = '';
  openTopics = new Set(expand ? topics.map(topic => topic.id) : []);
  renderContents(); sync();
 }
});
window.addEventListener('ui-language-change',render);
window.addEventListener('popstate',() => { readState(); render(); });
readState(); render();
