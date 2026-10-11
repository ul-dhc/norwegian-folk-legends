import type { LegendProperties } from './types';

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]!);

// Every map view describes a place from the same filtered legend records.
export function placeProfileMarkup(options: {
  name: string; records: LegendProperties[]; href: string; tone: string;
  tr: (key: string, values?: Record<string, string | number>) => string;
  format: (count: number) => string; categoryColor: (record: LegendProperties) => string;
  english: boolean; connections?: number; networkRecords?: number; extra?: string;
}) {
  const {name, records, href, tone, tr, format, categoryColor, english} = options;
  const themes = new Map<string, {record: LegendProperties; count: number}>();
  const collectors = new Map<string, {name: string; count: number}>();
  const narrators = new Set<string>();
  for (const record of records) {
    if (record.themeNo) {
      const item = themes.get(record.themeNo) || {record, count: 0};
      item.count++; themes.set(record.themeNo, item);
    }
    if (record.collectorId || record.collector) {
      const id = record.collectorId || record.collector;
      const item = collectors.get(id) || {name: record.collector || id, count: 0};
      item.count++; collectors.set(id, item);
    }
    if (record.narratorId || record.narrator) narrators.add(record.narratorId || record.narrator);
  }
  const stats = [['map.legendCount', records.length], ['map.placeThemeCount', themes.size], ['map.narrators', narrators.size], ['map.collectors', collectors.size]] as const;
  const ranked = [...themes.values()].sort((a,b) => b.count-a.count || a.record.themeNo.localeCompare(b.record.themeNo)).slice(0,5);
  const max = ranked[0]?.count || 1;
  const categories = ranked.length ? `<section class="network-profile-section"><h3>${tr('map.placeTopThemes')}</h3><ul class="network-category-chart">${ranked.map(({record,count}) => {
    const [code,...title] = (english ? record.themeEn || record.themeNo : record.themeNo).split(' · ');
    return `<li style="--category-tone:${categoryColor(record)};--category-share:${count/max*100}%"><span class="network-category-code">${escape(code)}</span><span class="network-category-name">${escape(title.join(' · '))}</span><strong>${format(count)}</strong><i class="network-category-track"><b></b></i></li>`;
  }).join('')}</ul></section>` : '';
  const people = collectors.size ? `<section class="network-profile-section"><h3>${tr('map.networkPlaceCollectors')}</h3><ul class="network-ranked">${[...collectors.values()].sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,'no')).map(item=>`<li><span>${escape(item.name)}</span><strong>${format(item.count)}</strong></li>`).join('')}</ul></section>` : '';
  const network = options.connections === undefined ? '' : `<section class="network-profile-section place-connections"><h3>${tr('map.connectedPlaces')}<strong>${format(options.connections)}</strong></h3>${options.networkRecords !== undefined && options.networkRecords !== records.length ? `<p class="map-panel-note">${tr('map.placeNetworkRecords',{count:format(options.networkRecords)})}</p>` : ''}${options.extra || ''}</section>`;
  return `<article class="place-profile network-profile" style="--profile-tone:${tone}"><button class="map-panel-close" type="button" aria-label="${tr('map.close')}"><i data-lucide="x"></i></button><header class="network-profile-header"><p class="map-panel-eyebrow"><i data-lucide="map-pin"></i>${tr('map.profile.place')}</p><h2>${escape(name)}</h2><dl class="place-profile-stats">${stats.map(([key,count])=>`<div><dt>${tr(key)}</dt><dd>${format(count)}</dd></div>`).join('')}</dl></header>${categories}${people}${network}<footer class="network-profile-footer"><a class="button place-browser-button" href="${escape(href)}"><span>${tr('map.openLegendBrowser')}</span><i data-lucide="arrow-right"></i></a></footer></article>`;
}
