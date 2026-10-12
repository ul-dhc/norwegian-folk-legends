import { applyMapTheme } from './theme';
import type { MapColors } from './palette';
import { installMapLayers } from './layers';
import { mapElements } from './elements';
import { css, basemapPalette, mapThemeColors } from './palette';
import { installMapControls } from './controls';
import { createPointLayers } from './point-layers';
import { exportSelection as downloadMapSelection } from './export';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
import { buildMetadataNetwork, strongestConnectionIds } from './networks.js';
import { installUncertaintyStrokes } from './uncertainty';
import { placeProfileMarkup, placeProfileSelection } from './place-profile';
import type {
  LegendProperties,
  MapDataset,
  PlaceProperties,
  NetworkEdge,
  NetworkNode,
} from './types';
const {
  page,
  mapStage,
  container,
  panel,
  layerMenu,
  countLabel,
  countText,
  heatKey,
  heatControls,
  pointControls,
  networkToolbar,
  networkContext,
  networkTooltip,
  heatInput,
  heatOutput,
  placesSize,
  placesSizeOutput,
  pointIntensity,
  pointIntensityOutput,
  heatRadius,
  radiusOutput,
  networkType,
  networkStrongestOnly,
  networkVisibility,
  networkSizeBy,
  networkOthers,
  networkSize,
  networkSizeOutput,
  networkIntensity,
  networkIntensityOutput,
  networkColor,
  basemapStyle,
  basemapMenu,
  basemapLabel,
  filterPanel,
  filterClear,
  yearFromInput,
  yearToInput,
  yearFromOutput,
  yearToOutput,
  includeUndated,
  includeUnknownPlace,
  mobileFilterToggle,
  filterCollapse,
  mapWorkspace,
  downloadMenu,
  downloadHint,
  emptyState,
} = mapElements();
const dataset = JSON.parse(
    document.querySelector('#corpus-map-data')!.textContent || '{}',
  ) as MapDataset,
  base = page.dataset.base || '/norwegian-folk-legends/',
  tr = (key: string, values: Record<string, string | number> = {}) =>
    typeof window.norskeT === 'function' ? window.norskeT(key, values) : key,
  formatter = () => new Intl.NumberFormat(document.documentElement.lang),
  params = new URLSearchParams(location.search);
const placeUncertaintyById = new Map(
  dataset.places.features.map((place) => [
    place.properties.id,
    place.properties.geography?.mapUncertainty?.kind || 'none',
  ]),
);
for (const feature of dataset.legends.features)
  feature.properties.locationUncertain = ['area', 'ambiguous'].includes(
    placeUncertaintyById.get(feature.properties.placeId) || 'none',
  )
    ? 1
    : 0;
const uncertaintyToggle = page.querySelector<HTMLInputElement>('[data-show-uncertainty]')!;
uncertaintyToggle.checked = params.get('uncertainty') === '1';
const requestedLayers = new Set((params.get('layers') || 'geography,labels').split(',')),
  initialCenter: [number, number] = [
    Number(params.get('lng')) || 12.5,
    Number(params.get('lat')) || 64.2,
  ],
  initialZoom = Number(params.get('z')) || 4.5;
let mapMode = ['places', 'points', 'clusters', 'heatmap', 'network'].includes(
  params.get('mode') || '',
)
  ? params.get('mode')!
  : 'points';
const filterKeys = [
    'theme',
    'narrator',
    'collector',
    'place',
    'volume',
    'county',
    'genre',
    'translation',
  ] as const,
  selectedFilters = Object.fromEntries(
    filterKeys.map((key) => [
      key,
      new Set(
        (params.get(key) || '')
          .split('|')
          .filter((value) => value && !(key === 'place' && value.startsWith('place-'))),
      ),
    ]),
  ) as Record<(typeof filterKeys)[number], Set<string>>;
const unknownPersonValue = '__unknown__',
  personFilterKeys = ['narrator', 'collector'] as const,
  unknownPersonKey = {
    narrator: 'map.unknownNarrators',
    collector: 'map.unknownCollectors',
  } as const,
  personFilterExplicit: Record<(typeof personFilterKeys)[number], boolean> = {
    narrator:
      params.has('narrator') ||
      params.get('narratorMode') === 'selection' ||
      params.get('onlyUnknownNarrators') === '1' ||
      params.get('unknownNarrators') === '0',
    collector:
      params.has('collector') ||
      params.get('collectorMode') === 'selection' ||
      params.get('onlyUnknownCollectors') === '1' ||
      params.get('unknownCollectors') === '0',
  },
  filterOptionValues = {} as Record<(typeof filterKeys)[number], string[]>;
const filterExplicit = Object.fromEntries(
  filterKeys.map((key) => [key, params.has(key) || params.get(`${key}Mode`) === 'selection']),
) as Record<(typeof filterKeys)[number], boolean>;
personFilterKeys.forEach((key) => (filterExplicit[key] = personFilterExplicit[key]));
if (params.get('onlyUnknownNarrators') === '1')
  selectedFilters.narrator = new Set([unknownPersonValue]);
if (params.get('onlyUnknownCollectors') === '1')
  selectedFilters.collector = new Set([unknownPersonValue]);
let filteredFeatures = dataset.legends.features,
  filteredUnmappedLegends = dataset.unmappedLegends || [];
let unmappedSelected = false;
const propertyForFilter = {
  theme: 'themeNo',
  narrator: 'narrator',
  collector: 'collector',
  place: 'placeName',
  volume: 'volume',
  county: 'county',
  genre: 'genre',
  translation: 'translation',
} as const;
const allLegendProperties = [
  ...dataset.legends.features.map((feature) => feature.properties),
  ...(dataset.unmappedLegends || []),
];
for (const key of filterKeys) {
  const values = [
    ...new Set(
      allLegendProperties.map((properties) => properties[propertyForFilter[key]]).filter(Boolean),
    ),
  ]
    .sort((first, second) => String(first).localeCompare(String(second), 'no', { numeric: true }))
    .map(String);
  if (key === 'narrator' || key === 'collector') values.unshift(unknownPersonValue);
  filterOptionValues[key] = values;
  const options = filterPanel.querySelector<HTMLElement>(
    `[data-map-filter="${key}"] .multi-options`,
  )!;
  for (const value of values) {
    const label = document.createElement('label'),
      input = document.createElement('input'),
      text = document.createElement('span');
    input.type = 'checkbox';
    input.value = String(value);
    if (value === unknownPersonValue && (key === 'narrator' || key === 'collector')) {
      text.dataset.unknownPersonType = key;
      text.textContent = tr(unknownPersonKey[key]);
    } else
      text.textContent = key === 'translation' ? tr(`map.translation.${value}`) : String(value);
    if (key === 'theme') {
      const properties = allLegendProperties.find((properties) => properties.themeNo === value)!;
      text.dataset.themeNo = properties.themeNo;
      text.dataset.themeEn = properties.themeEn || properties.themeNo;
    }
    label.append(input, text);
    options.append(label);
  }
}
heatInput.value = String(Math.min(200, Math.max(40, Number(params.get('heat')) || 100)));
pointIntensity.value = String(
  Math.min(200, Math.max(20, Number(params.get('pointIntensity')) || 60)),
);
pointIntensityOutput.value = `${pointIntensity.value}%`;
placesSize.value = String(
  params.has('placesSize') && Number.isFinite(Number(params.get('placesSize')))
    ? Math.min(200, Math.max(15, Number(params.get('placesSize'))))
    : 100,
);
placesSizeOutput.value = `${placesSize.value}%`;
heatRadius.value = String(Number(params.get('radius')) || 14);
networkStrongestOnly.checked = params.get('networkShowAll') === '0';
networkSize.value = String(
  params.has('networkSize') && Number.isFinite(Number(params.get('networkSize')))
    ? Math.min(200, Math.max(25, Number(params.get('networkSize'))))
    : 60,
);
networkSizeOutput.value = `${networkSize.value}%`;
networkIntensity.value = String(
  params.has('networkIntensity') && Number.isFinite(Number(params.get('networkIntensity')))
    ? Math.min(200, Math.max(0, Number(params.get('networkIntensity'))))
    : 15,
);
networkIntensityOutput.value = `${networkIntensity.value}%`;
networkType.value = params.get('networkType') === 'plots' ? 'plots' : 'collectors';
networkSizeBy.value = params.get('networkSizeBy') === 'connections' ? 'connections' : 'legends';
networkOthers.value = params.get('networkOthers') === 'hide' ? 'hide' : 'fade';
networkColor.value = ['collector', 'theme', 'single'].includes(params.get('networkColor') || '')
  ? params.get('networkColor')!
  : 'collector';
const previousBasemaps: Record<string, string> = {
  light: 'positron',
  terrain: 'fiord',
  minimal: 'fiord',
};
const basemapParam = params.get('basemap') || '',
  requestedBasemap = previousBasemaps[basemapParam] || basemapParam;
const allowedBasemaps = ['dark', 'fiord', 'positron', 'streets'];
let basemapExplicit = allowedBasemaps.includes(requestedBasemap);
basemapStyle.value = basemapExplicit
  ? requestedBasemap
  : document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'positron';
const singlePalettes = ['green', 'blue', 'yellow', 'coral'];
let networkPalette = singlePalettes.includes(params.get('networkPalette') || '')
  ? params.get('networkPalette')!
  : 'yellow';
let pointPalette = singlePalettes.includes(params.get('palette') || '')
  ? params.get('palette')!
  : 'yellow';
let densityPalette = ['spectrum', ...singlePalettes].includes(params.get('densityPalette') || '')
  ? params.get('densityPalette')!
  : mapMode === 'heatmap' && singlePalettes.includes(params.get('palette') || '')
    ? params.get('palette')!
    : 'spectrum';
const syncPaletteSelection = () => {
  const selected = mapMode === 'heatmap' ? densityPalette : pointPalette;
  page
    .querySelectorAll<HTMLInputElement>('[data-map-palette] input[name="map-palette"]')
    .forEach((input) => {
      input.checked = input.value === selected;
      input.closest('label')!.hidden = input.value === 'spectrum' && mapMode !== 'heatmap';
    });
};
syncPaletteSelection();
let pointColorBy = ['single', 'theme', 'narrator', 'collector'].includes(
  params.get('colorBy') || '',
)
  ? params.get('colorBy')!
  : 'theme';
page.querySelector<HTMLInputElement>(
  `[data-point-color-by] input[value="${pointColorBy}"]`,
)!.checked = true;
let placesSizeBy = params.get('placesSizeBy') === 'uniform' ? 'uniform' : 'legends';
page.querySelector<HTMLInputElement>(`[name="places-size-by"][value="${placesSizeBy}"]`)!.checked =
  true;
let pointStyle = params.get('pointStyle') === 'rays' ? 'rays' : 'bubbles';
page.querySelector<HTMLInputElement>(
  `[data-point-style-choice] input[value="${pointStyle}"]`,
)!.checked = true;
const syncPointStyleText = () => {
  const pointText = page.querySelector<HTMLElement>('.point-key span:last-child')!,
    noteText = page.querySelector<HTMLElement>('.overlap-key')!,
    pointKey = pointStyle === 'rays' ? 'map.rayLegend' : 'map.bubbleLegend',
    noteKey = pointStyle === 'rays' ? 'map.rayExplanation' : 'map.bubbleExplanation';
  page.dataset.pointStyle = pointStyle;
  pointText.dataset.i18n = pointKey;
  noteText.dataset.i18n = noteKey;
  pointText.textContent = tr(pointKey);
  noteText.textContent = tr(noteKey);
};
syncPointStyleText();
const syncBasemapMenu = () => {
  const options = page.querySelectorAll<HTMLButtonElement>('[data-basemap-option]');
  options.forEach((option) =>
    option.setAttribute(
      'aria-checked',
      String(option.dataset.basemapOption === basemapStyle.value),
    ),
  );
  const selected = page.querySelector<HTMLButtonElement>(
    `[data-basemap-option="${basemapStyle.value}"]`,
  );
  basemapLabel.textContent = selected?.textContent || '';
};
syncBasemapMenu();
page
  .querySelectorAll<HTMLInputElement>('[data-layer]')
  .forEach((input) => (input.checked = requestedLayers.has(input.dataset.layer!)));
for (const key of filterKeys)
  filterPanel
    .querySelectorAll<HTMLInputElement>(
      `[data-map-filter="${key}"] .multi-options input[type="checkbox"]`,
    )
    .forEach(
      (input) =>
        (input.checked =
          !filterExplicit[key] ||
          ((key === 'narrator' || key === 'collector') && !personFilterExplicit[key]) ||
          selectedFilters[key].has(input.value)),
    );
for (const key of personFilterKeys)
  if (
    params.get(`unknown${key === 'narrator' ? 'Narrators' : 'Collectors'}`) === '0' &&
    !params.has(key) &&
    !selectedFilters[key].size
  ) {
    selectedFilters[key] = new Set(
      filterOptionValues[key].filter((value) => value !== unknownPersonValue),
    );
    filterPanel
      .querySelectorAll<HTMLInputElement>(
        `[data-map-filter="${key}"] .multi-options input[type="checkbox"]`,
      )
      .forEach((input) => (input.checked = input.value !== unknownPersonValue));
  }
yearFromInput.value = params.get('yearFrom') || yearFromInput.min;
yearToInput.value = params.get('yearTo') || yearToInput.max;
includeUndated.checked = params.get('undated') !== '0';
includeUnknownPlace.checked = params.get('unknownPlaces') !== '0';
const themeColors = (mapDark = document.documentElement.dataset.theme === 'dark') =>
  mapThemeColors(mapDark, pointPalette, densityPalette);
let colors = themeColors(
    basemapExplicit
      ? (basemapPalette(basemapStyle.value) ?? document.documentElement.dataset.theme === 'dark')
      : document.documentElement.dataset.theme === 'dark',
  ),
  selectedId =
    params.get('selectedPlace') ||
    (params.get('place')?.startsWith('place-') ? params.get('place') : null),
  selectedPointCenter =
    params.get('selectedCenter')?.includes('|') && selectedId
      ? dataset.places.features
          .find((place) => place.properties.id === selectedId)
          ?.geometry.coordinates.join(',') || null
      : params.get('selectedCenter'),
  moveTimer = 0;
let pointLinkOpacity: unknown = 0.28,
  pointBubbleOpacity: unknown = 0,
  pointBubbleStrokeOpacity: unknown = 0.76;
mapStage.dataset.mapTheme = colors.dark ? 'dark' : 'light';
const map = new maplibregl.Map({
  container,
  cooperativeGestures: true,
  center: initialCenter,
  zoom: initialZoom,
  minZoom: 3,
  maxZoom: 15,
  maxBounds: [
    [-26, 46],
    [51, 80],
  ],
  attributionControl: false,
  style: {
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': colors.water },
      },
    ],
  },
});
const { centerMapButton, resetExtent, syncUncertaintyButton, syncFullscreen } = installMapControls({
  map,
  page,
  dataset,
  mapWorkspace,
  uncertaintyToggle,
  tr,
  getMode: () => mapMode,
});
const visible = (name: string) =>
  page.querySelector<HTMLInputElement>(`[data-layer="${name}"]`)?.checked ? 'visible' : 'none';
const updateUrl = (push = false) => {
  const center = map.getCenter(),
    url = new URL(location.href),
    layers = [...page.querySelectorAll<HTMLInputElement>('[data-layer]:checked')].map(
      (input) => input.dataset.layer!,
    );
  url.searchParams.set('lng', center.lng.toFixed(4));
  url.searchParams.set('lat', center.lat.toFixed(4));
  url.searchParams.set('z', map.getZoom().toFixed(2));
  url.searchParams.set('layers', layers.join(','));
  url.searchParams.set('mode', mapMode);
  url.searchParams.set('heat', heatInput.value);
  url.searchParams.set('radius', heatRadius.value);
  url.searchParams.set('networkType', networkType.value);
  url.searchParams.set('networkIntensity', networkIntensity.value);
  url.searchParams.set('networkSize', networkSize.value);
  url.searchParams.set('networkSizeBy', networkSizeBy.value);
  url.searchParams.set('networkOthers', networkOthers.value);
  url.searchParams.set('networkShowAll', !networkStrongestOnly.checked ? '1' : '0');
  url.searchParams.delete('networkDensity');
  url.searchParams.set('networkColor', networkColor.value);
  url.searchParams.set('networkPalette', networkPalette);
  url.searchParams.delete('networkFocus');
  url.searchParams.set('palette', pointPalette);
  url.searchParams.set('densityPalette', densityPalette);
  url.searchParams.set('colorBy', pointColorBy);
  url.searchParams.set('pointStyle', pointStyle);
  url.searchParams.set('placesSize', placesSize.value);
  url.searchParams.set('placesSizeBy', placesSizeBy);
  url.searchParams.set('pointIntensity', pointIntensity.value);
  if (uncertaintyToggle.checked) url.searchParams.set('uncertainty', '1');
  else url.searchParams.delete('uncertainty');
  basemapExplicit
    ? url.searchParams.set('basemap', basemapStyle.value)
    : url.searchParams.delete('basemap');
  for (const key of filterKeys) {
    if (key === 'narrator' || key === 'collector') {
      if (personFilterExplicit[key]) {
        url.searchParams.set(`${key}Mode`, 'selection');
        const value = [...selectedFilters[key]].join('|');
        value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
      } else {
        url.searchParams.delete(`${key}Mode`);
        url.searchParams.delete(key);
      }
      continue;
    }
    const value = [...selectedFilters[key]].join('|');
    if (filterExplicit[key]) {
      url.searchParams.set(`${key}Mode`, 'selection');
      value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    } else {
      url.searchParams.delete(`${key}Mode`);
      url.searchParams.delete(key);
    }
  }
  url.searchParams.set('yearFrom', yearFromInput.value);
  url.searchParams.set('yearTo', yearToInput.value);
  url.searchParams.set('undated', includeUndated.checked ? '1' : '0');
  url.searchParams.delete('unknownNarrators');
  url.searchParams.delete('unknownCollectors');
  url.searchParams.set('unknownPlaces', includeUnknownPlace.checked ? '1' : '0');
  url.searchParams.delete('onlyUnknownNarrators');
  url.searchParams.delete('onlyUnknownCollectors');
  selectedId
    ? url.searchParams.set('selectedPlace', selectedId)
    : url.searchParams.delete('selectedPlace');
  selectedPointCenter
    ? url.searchParams.set('selectedCenter', selectedPointCenter)
    : url.searchParams.delete('selectedCenter');
  history[push ? 'pushState' : 'replaceState']({}, '', url);
};
const updateCount = () => {
  if (!map.getSource('legends')) return;
  const bounds = map.getBounds(),
    visibleFeatures = filteredFeatures.filter((feature) =>
      bounds.contains(feature.geometry.coordinates),
    );
  const value = visibleFeatures.length;
  const countTemplate = tr(
    matchMedia('(max-width: 600px)').matches ? 'map.mobileCount' : 'map.resultsInView',
    {
      count: '__visible_count__',
      total: formatter().format(filteredFeatures.length),
    },
  );
  const [countPrefix, countSuffix] = countTemplate.split('__visible_count__'),
    visibleCount = document.createElement('strong');
  visibleCount.textContent = formatter().format(value);
  countText.replaceChildren(
    document.createTextNode(countPrefix),
    visibleCount,
    document.createTextNode(countSuffix || ''),
  );
  const visibleIds = visibleFeatures.map((feature) => feature.properties.id);
  if (visibleIds.length)
    countLabel.href = `${base}browse/?selection=${encodeURIComponent(visibleIds.join(','))}`;
  else countLabel.removeAttribute('href');
  const unlocatedLink = page.querySelector<HTMLAnchorElement>('[data-map-unlocated-count]')!;
  unlocatedLink.hidden = filteredUnmappedLegends.length === 0;
  const unlocatedText = tr('map.unlocatedCount', {
    count: formatter().format(filteredUnmappedLegends.length),
  });
  unlocatedLink.querySelector('span')!.textContent = unlocatedText;
  unlocatedLink.href = `${base}browse/?selection=${encodeURIComponent(filteredUnmappedLegends.map((record) => record.id).join(','))}`;
  unlocatedLink.title = tr('map.coordinateCountDetails', {
    mapped: formatter().format(filteredFeatures.length),
    unmapped: formatter().format(filteredUnmappedLegends.length),
  });
  unlocatedLink.setAttribute('aria-label', unlocatedLink.title);
  countLabel.setAttribute('aria-disabled', String(visibleIds.length === 0));
  countLabel.setAttribute(
    'aria-label',
    tr('map.openVisibleSelection', { count: formatter().format(value) }),
  );
};
const syncFilterInterface = () => {
  let active =
    yearFromInput.value !== yearFromInput.min ||
    yearToInput.value !== yearToInput.max ||
    !includeUndated.checked ||
    !includeUnknownPlace.checked ||
    Object.values(personFilterExplicit).some(Boolean);
  for (const key of filterKeys) {
    const count = selectedFilters[key].size;
    active ||= filterExplicit[key];
    filterPanel.querySelector<HTMLElement>(
      `[data-map-filter="${key}"] [data-map-filter-count]`,
    )!.textContent = !filterExplicit[key] ? tr(`map.filterAll.${key}`) : String(count);
  }
  const activeFilterDisplay = page.querySelector<HTMLElement>('[data-network-active-filters]')!;
  activeFilterDisplay.replaceChildren();
  const addFilterChip = (label: string, values: string[], countLabel?: string) => {
    const chip = document.createElement('details'),
      summary = document.createElement('summary'),
      list = document.createElement('ul');
    chip.className = 'network-filter-chip';
    summary.textContent =
      countLabel ||
      `${label}: ${values[0] || tr('map.noSelectedValues')}${values.length > 1 ? ` +${values.length - 1}` : ''}`;
    (values.length ? values : [tr('map.noSelectedValues')]).forEach((value) => {
      const item = document.createElement('li');
      item.textContent = value;
      list.append(item);
    });
    chip.append(summary, list);
    activeFilterDisplay.append(chip);
  };
  for (const key of filterKeys) {
    if (!filterExplicit[key]) continue;
    const label =
      filterPanel.querySelector<HTMLElement>(`[data-map-filter="${key}"] > summary > span`)!
        .textContent || key;
    const values = [...selectedFilters[key]].map((value) => {
      if ((key === 'collector' || key === 'narrator') && value === unknownPersonValue)
        return tr(unknownPersonKey[key]);
      if (key === 'translation') return tr(`map.translation.${value}`);
      if (key === 'theme') {
        const record = allLegendProperties.find((record) => record.themeNo === value);
        return record
          ? document.documentElement.dataset.uiLang === 'en'
            ? record.themeEn || record.themeNo
            : record.themeNo
          : value;
      }
      return value;
    });
    addFilterChip(
      label,
      values,
      key === 'theme'
        ? tr(values.length === 1 ? 'map.selectedThemeCountOne' : 'map.selectedThemeCount', {
            count: formatter().format(values.length),
          })
        : undefined,
    );
  }
  if (yearFromInput.value !== yearFromInput.min || yearToInput.value !== yearToInput.max)
    addFilterChip(tr('map.timeRange'), [`${yearFromInput.value}–${yearToInput.value}`]);
  if (!includeUndated.checked) addFilterChip(tr('map.timeRange'), [tr('map.datedOnly')]);
  if (!includeUnknownPlace.checked)
    addFilterChip(tr('map.filterPlaces'), [tr('map.knownPlacesOnly')]);
  activeFilterDisplay.hidden = activeFilterDisplay.childElementCount === 0;
  if (!activeFilterDisplay.hidden) {
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'network-filter-clear';
    clear.title = tr('map.clearFiltersLong');
    clear.setAttribute('aria-label', clear.title);
    clear.innerHTML = '<i data-lucide="x"></i>';
    clear.addEventListener('click', () => filterClear.click());
    activeFilterDisplay.append(clear);
    window.renderLucideIcons?.();
  }
  filterClear.hidden = !active;
  yearFromOutput.value = yearFromInput.value;
  yearToOutput.value = yearToInput.value;
  yearFromOutput.classList.toggle('is-changed', yearFromInput.value !== yearFromInput.min);
  yearToOutput.classList.toggle('is-changed', yearToInput.value !== yearToInput.max);
  const minimum = Number(yearFromInput.min),
    maximum = Number(yearFromInput.max),
    left = ((Number(yearFromInput.value) - minimum) / (maximum - minimum)) * 100,
    right = 100 - ((Number(yearToInput.value) - minimum) / (maximum - minimum)) * 100;
  filterPanel.querySelector<HTMLElement>('.range-track')!.style.cssText =
    `--range-left:${left}%;--range-right:${right}%`;
  filterPanel
    .querySelector<HTMLElement>('.timeline')!
    .classList.toggle(
      'is-active',
      yearFromInput.value !== yearFromInput.min || yearToInput.value !== yearToInput.max,
    );
  const downloadable =
    (active || mapMode === 'network') &&
    filteredFeatures.length + filteredUnmappedLegends.length > 0;
  downloadMenu.dataset.disabled = String(!downloadable);
  downloadMenu.querySelector('summary')!.setAttribute('aria-disabled', String(!downloadable));
  downloadMenu
    .querySelectorAll<HTMLButtonElement>('button')
    .forEach((button) => (button.disabled = !downloadable));
  downloadHint.hidden = downloadable;
  const networkEmpty = mapMode === 'network' && networkNodes.length === 0;
  emptyState.hidden =
    !networkEmpty && (!active || filteredFeatures.length + filteredUnmappedLegends.length > 0);
  const emptyTitle = emptyState.querySelector<HTMLElement>('strong')!;
  emptyTitle.dataset.i18n =
    networkEmpty && filteredFeatures.length > 0 ? 'map.networkEmpty' : 'map.emptyTitle';
  emptyTitle.textContent = tr(emptyTitle.dataset.i18n);
};
const points = createPointLayers({
  map,
  dataset,
  get mapMode() {
    return mapMode;
  },
  get pointStyle() {
    return pointStyle;
  },
  get placesSizeBy() {
    return placesSizeBy;
  },
  placesSize,
  pointIntensity,
  get pointColorBy() {
    return pointColorBy;
  },
  get colors() {
    return colors;
  },
  get filteredFeatures() {
    return filteredFeatures;
  },
  get selectedPointCenter() {
    return selectedPointCenter;
  },
  get selectedId() {
    return selectedId;
  },
  get pointLinkOpacity() {
    return pointLinkOpacity;
  },
  get pointBubbleOpacity() {
    return pointBubbleOpacity;
  },
  get pointBubbleStrokeOpacity() {
    return pointBubbleStrokeOpacity;
  },
  renderLegend: (properties: LegendProperties) => renderLegend(properties),
  updateUrl: (push?: boolean) => updateUrl(push),
});
const {
  legendMapActive,
  clusterDetailActive,
  bubbleInteractionActive,
  effectivePointStyle,
  setHoveredPointLegendState,
  nearestPointLegend,
  placesAtCoordinates,
  updatePointSources,
  showPointLinks,
  showPointLegendLink,
  selectPointLegend,
  updatePointCenterSelection,
  pointDisplayFeatures,
} = points;
const applyFilters = (save = true) => {
  const from = Number(yearFromInput.value),
    to = Number(yearToInput.value),
    timeFilterActive =
      yearFromInput.value !== yearFromInput.min || yearToInput.value !== yearToInput.max;
  const matchesFilters = (properties: LegendProperties) => {
    const year = Number(properties.year);
    if (year ? timeFilterActive && (year < from || year > to) : !includeUndated.checked)
      return false;
    if (
      filterExplicit.narrator &&
      !selectedFilters.narrator.has(properties.narrator || unknownPersonValue)
    )
      return false;
    if (
      filterExplicit.collector &&
      !selectedFilters.collector.has(properties.collector || unknownPersonValue)
    )
      return false;
    if (!properties.placeName && !includeUnknownPlace.checked) return false;
    return (
      (!filterExplicit.theme || selectedFilters.theme.has(properties.themeNo)) &&
      (!filterExplicit.place || selectedFilters.place.has(properties.placeName)) &&
      (!filterExplicit.volume || selectedFilters.volume.has(properties.volume)) &&
      (['county', 'genre', 'translation'] as const).every(
        (key) => !filterExplicit[key] || selectedFilters[key].has(properties[key]),
      )
    );
  };
  filteredFeatures = dataset.legends.features.filter(({ properties }) =>
    matchesFilters(properties),
  );
  filteredUnmappedLegends = (dataset.unmappedLegends || []).filter(matchesFilters);
  const selectedLegendRemoved = Boolean(
    points.state.selectedPointLegend &&
    !filteredFeatures.some(({ properties }) => properties.id === points.state.selectedPointLegend),
  );
  if (selectedLegendRemoved) {
    map.setFeatureState(
      { source: 'legends', id: points.state.selectedPointLegend! },
      { selected: false },
    );
    points.state.selectedPointLegend = null;
    points.state.activePointLegend = null;
  }
  const collection = { type: 'FeatureCollection', features: filteredFeatures } as any;
  updatePointSources();
  const selectedCenterRemoved = Boolean(
    selectedPointCenter &&
    ![...pointDisplayFeatures.values()].some(
      (feature) => feature.properties.centerKey === selectedPointCenter,
    ),
  );
  if (selectedCenterRemoved) {
    selectedId = null;
    selectedPointCenter = null;
    points.state.activePointPlace = null;
    updatePointCenterSelection();
  }
  if (legendMapActive() && (selectedLegendRemoved || selectedCenterRemoved)) renderPanel();
  (map.getSource('legend-clusters') as maplibregl.GeoJSONSource)?.setData(collection);
  (map.getSource('unmapped') as maplibregl.GeoJSONSource)?.setData({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [3.0, 64.0] },
    properties: { id: 'unmapped', count: filteredUnmappedLegends.length },
  } as any);
  if (map.getSource('network')) recalculateNetwork();
  syncFilterInterface();
  updateCount();
  if (selectedId && (legendMapActive() || clusterDetailActive()))
    renderPointPlace(selectedId, selectedPointCenter);
  else if (unmappedSelected) renderUnmapped();
  else if (mapMode === 'clusters') renderPanel();
  if (save) updateUrl();
};
const sharedPlaceProfile = (
  placeId: string,
  name: string,
  options: {
    tone?: string;
    connections?: number;
    networkRecords?: number;
    extra?: string;
  } = {},
) => {
  const locationPlaces = placesAtCoordinates(placeId),
    grouped = locationPlaces.length > 1 && options.connections === undefined;
  const selection = placeProfileSelection(
    placeId,
    locationPlaces.map((place) => place.properties),
    filteredFeatures.map((feature) => feature.properties),
    grouped,
  );
  const { records } = selection;
  const recordedPlaces =
    locationPlaces.length > 1
      ? selection.recordedPlaces.map((place) => ({ ...place, href: recordHref(place.legendIds) }))
      : undefined;
  const profileName = grouped
    ? selection.recordedPlaces
        .filter((place) => place.count > 0)
        .map((place) => place.name)
        .join(' / ')
    : name;
  return placeProfileMarkup({
    name: profileName,
    records,
    recordedPlaces,
    geography: grouped
      ? undefined
      : dataset.places.features.find((place) => place.properties.id === placeId)?.properties
          .geography,
    grouped,
    href: `${recordHref(records.map((record) => record.id))}${grouped ? '' : `&place=${encodeURIComponent(placeId)}`}`,
    tone: options.tone || colors.green,
    tr,
    format: (count) => formatter().format(count),
    english: document.documentElement.dataset.uiLang === 'en',
    categoryColor: (record) => {
      if (!record.themeNo) return colors.categoryNeutral;
      const hash = [...record.themeNo.trim()].reduce(
        (total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0,
        0,
      );
      return colors.category[Math.abs(hash) % colors.category.length];
    },
    ...options,
  });
};
const renderPanel = (properties?: PlaceProperties) => {
  if (!properties) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }
  panel.hidden = false;
  panel.innerHTML = sharedPlaceProfile(properties.id, properties.name);
  window.renderLucideIcons?.();
  panel.querySelector('button')?.addEventListener('click', () => selectPlace(null, true));
};
const renderLegend = (properties: LegendProperties) => {
  selectedId = null;
  selectedPointCenter = null;
  updatePointCenterSelection();
  selectPointLegend(properties.id);
  const english = document.documentElement.dataset.uiLang === 'en',
    title =
      (english ? properties.titleEn : properties.titleNo) || properties.titleNo || properties.id,
    theme = (english ? properties.themeEn : properties.themeNo) || properties.themeNo;
  panel.hidden = false;
  panel.innerHTML = `<button class="map-panel-close" type="button" aria-label="${tr('map.close')}"><i data-lucide="x"></i></button><p class="map-panel-eyebrow">${tr('map.profile.legend')} · ${properties.id}</p><h2>${title}</h2><dl><div><dt>${tr('meta.place')}</dt><dd>${properties.placeName}</dd></div>${theme ? `<div><dt>${tr('meta.theme')}</dt><dd>${theme}</dd></div>` : ''}${properties.narrator ? `<div><dt>${tr('meta.narrator')}</dt><dd>${properties.narrator}</dd></div>` : ''}${properties.collector ? `<div><dt>${tr('meta.collector')}</dt><dd>${properties.collector}</dd></div>` : ''}<div><dt>${tr('meta.year')}</dt><dd>${properties.year || tr('map.noYear')}</dd></div></dl><a class="button" href="${base}legends/${properties.id}/"><span>${tr('map.openLegend')}</span><i data-lucide="arrow-right"></i></a><button class="button button-secondary" type="button" data-open-point-place="${properties.placeId}">${tr('map.openPlaceLegends')}</button>`;
  window.renderLucideIcons?.();
  panel.querySelector('button')?.addEventListener('click', () => {
    selectPointLegend(null);
    renderPanel();
  });
  panel.querySelector<HTMLButtonElement>('[data-open-point-place]')?.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      renderPointPlace(
        properties.placeId,
        String(
          (
            properties as LegendProperties & {
              centerKey?: string;
            }
          ).centerKey || '',
        ) || null,
      );
    },
    { capture: true },
  );
};
const renderPointPlace = (placeId: string, centerKey: string | null = null) => {
  if (points.state.selectedPointLegend)
    map.setFeatureState(
      { source: 'legends', id: points.state.selectedPointLegend },
      { selected: false },
    );
  points.state.selectedPointLegend = null;
  const { records } = placeProfileSelection(
    placeId,
    placesAtCoordinates(placeId).map((place) => place.properties),
    filteredFeatures.map((feature) => feature.properties),
    true,
  );
  const placeName = dataset.places.features.find((feature) => feature.properties.id === placeId)
    ?.properties.name;
  if (!placeName || !records.length) return;
  selectedId = placeId;
  selectedPointCenter =
    centerKey ||
    [...pointDisplayFeatures.values()].find((feature) =>
      records.some((record) => record.id === feature.properties.id),
    )?.properties.centerKey ||
    null;
  updatePointCenterSelection();
  showPointLinks(selectedPointCenter, true);
  panel.hidden = false;
  panel.innerHTML = sharedPlaceProfile(placeId, placeName);
  panel.querySelector('.map-panel-close')?.addEventListener('click', () => {
    selectedId = null;
    selectedPointCenter = null;
    updatePointCenterSelection();
    showPointLinks(null);
    renderPanel();
    updateUrl();
  });
  window.renderLucideIcons?.();
  showPointLinks(selectedPointCenter, true);
  updateUrl();
};
const renderUnmapped = () => {
  unmappedSelected = true;
  map.setFeatureState({ source: 'unmapped', id: 'unmapped' }, { selected: true });
  const english = document.documentElement.dataset.uiLang === 'en',
    themes = new Set(
      filteredUnmappedLegends.map((properties) => properties.themeNo).filter(Boolean),
    ),
    narrators = new Set(
      filteredUnmappedLegends.map((properties) => properties.narrator).filter(Boolean),
    ),
    collectors = new Set(
      filteredUnmappedLegends.map((properties) => properties.collector).filter(Boolean),
    ),
    themeCounts = new Map<
      string,
      {
        label: string;
        count: number;
      }
    >();
  for (const properties of filteredUnmappedLegends) {
    if (!properties.themeNo) continue;
    const entry = themeCounts.get(properties.themeNo) ?? {
      label: english ? properties.themeEn || properties.themeNo : properties.themeNo,
      count: 0,
    };
    entry.count += 1;
    themeCounts.set(properties.themeNo, entry);
  }
  const topThemes = [...themeCounts.values()]
      .sort(
        (first, second) =>
          second.count - first.count ||
          first.label.localeCompare(second.label, english ? 'en' : 'no'),
      )
      .slice(0, 5),
    largestThemeCount = topThemes[0]?.count || 1,
    themeChart = topThemes.length
      ? `<section class="place-theme-chart"><h3>${tr('map.placeTopThemes')}</h3><ol>${topThemes.map((theme) => `<li><div><span>${theme.label}</span><strong>${formatter().format(theme.count)}</strong></div><i><b style="--theme-share:${(theme.count / largestThemeCount) * 100}%"></b></i></li>`).join('')}</ol></section>`
      : '',
    ids = filteredUnmappedLegends.map((properties) => properties.id).filter(Boolean),
    href =
      ids.length && ids.join(',').length < 6500
        ? `${base}browse/?selection=${encodeURIComponent(ids.join(','))}`
        : `${base}browse/`;
  panel.hidden = false;
  panel.innerHTML = `<button class="map-panel-close" type="button" aria-label="${tr('map.close')}"><i data-lucide="x"></i></button><p class="map-panel-eyebrow">${tr('map.analyticalSummary')}</p><h2>${tr('map.unmappedTitle')}</h2><p class="map-panel-note unmapped-panel-note">${tr('map.unmappedExplanation')}</p><dl class="place-summary"><div><dt>${tr('map.legendCount')}</dt><dd>${formatter().format(filteredUnmappedLegends.length)}</dd></div><div><dt>${tr('map.placeThemeCount')}</dt><dd>${formatter().format(themes.size)}</dd></div><div><dt>${tr('map.narrators')}</dt><dd>${formatter().format(narrators.size)}</dd></div><div><dt>${tr('map.collectors')}</dt><dd>${formatter().format(collectors.size)}</dd></div></dl>${themeChart}<a class="button place-browser-button" href="${href}"><span>${tr('map.openLegendBrowser')}</span><i data-lucide="arrow-right"></i></a>`;
  window.renderLucideIcons?.();
  panel.querySelector('button')?.addEventListener('click', () => {
    unmappedSelected = false;
    map.setFeatureState({ source: 'unmapped', id: 'unmapped' }, { selected: false });
    renderPanel();
  });
};
const renderAggregate = (
  title: string,
  features: any[],
  total = features.length,
  eyebrow = tr('map.analyticalSummary'),
) => {
  const values = features.map((feature) => feature.properties),
    themes = new Map<string, number>();
  values.forEach(
    (value) => value.themeNo && themes.set(value.themeNo, (themes.get(value.themeNo) || 0) + 1),
  );
  const dominantTheme =
      [...themes].sort((first, second) => second[1] - first[1])[0]?.[0] || tr('map.notAvailable'),
    ids = values.map((value) => value.id).filter(Boolean),
    href =
      ids.length && ids.join(',').length < 6500
        ? `${base}browse/?selection=${encodeURIComponent(ids.join(','))}`
        : `${base}browse/`;
  panel.hidden = false;
  panel.innerHTML = `<button class="map-panel-close" type="button" aria-label="${tr('map.close')}"><i data-lucide="x"></i></button><p class="map-panel-eyebrow">${eyebrow}</p><h2>${title}</h2><dl><div><dt>${tr('map.legendCount')}</dt><dd>${formatter().format(total)}</dd></div><div><dt>${tr('map.dominantTheme')}</dt><dd>${dominantTheme}</dd></div></dl><a class="button" href="${href}"><span>${tr('map.openTexts')}</span><i data-lucide="arrow-right"></i></a>`;
  window.renderLucideIcons?.();
  panel.querySelector('button')?.addEventListener('click', () => renderPanel());
};
const selectPlace = (id: string | null, push = false) => {
  selectedId = id;
  updatePointCenterSelection();
  if (id) {
    const feature = dataset.places.features.find((item) => item.properties.id === id);
    if (feature) {
      if (legendMapActive() || clusterDetailActive()) renderPointPlace(id, selectedPointCenter);
      else renderPanel(feature.properties);
      map.easeTo({
        center: feature.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 8),
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
      });
    }
  } else renderPanel();
  updateUrl(push);
};
const heatIntensity = () => [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  (0.35 * Number(heatInput.value)) / 100,
  10,
  (1.15 * Number(heatInput.value)) / 100,
];
const heatRadiusValue = () => [
  'interpolate',
  ['linear'],
  ['zoom'],
  3,
  Math.max(8, Number(heatRadius.value) * 0.65),
  10,
  Number(heatRadius.value),
];
let networkRecordCount = 0;
let networkNodes: NetworkNode[] = [],
  networkEdges: NetworkEdge[] = [],
  activeNetworkNode: string | null = null,
  hoveredNetworkNode: string | null = null;
const networkLegendProperties = new Map(
  dataset.legends.features.map((feature) => [
    String(feature.properties.id),
    feature.properties as LegendProperties,
  ]),
);
const networkCollectorFor = (ids: string[]) => {
  const counts = new Map<string, number>();
  ids.forEach((id) => {
    const name = networkLegendProperties.get(id)?.collector?.trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'no'))[0]?.[0] || '';
};
const networkCollectorColor = (name: string) => {
  if (!name) return colors.categoryNeutral;
  const hash = [...name.trim()].reduce(
    (total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0,
    0,
  );
  return colors.category[Math.abs(hash) % colors.category.length];
};
const networkSingleColor = () =>
  css(`--map-data-${networkPalette}-${colors.dark ? 'dark' : 'light'}`);
const networkColorFor = (node: NetworkNode) => {
  if (networkColor.value === 'single') return networkSingleColor();
  if (networkColor.value === 'collector')
    return networkCollectorColor(
      node.kind === 'collector' ? node.name : networkCollectorFor(node.legendIds),
    );
  if (!node.dominantTheme.trim()) return colors.categoryNeutral;
  const hash = [...node.dominantTheme.trim()].reduce(
    (total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0,
    0,
  );
  return colors.category[Math.abs(hash) % colors.category.length];
};
const networkThemeFor = (ids: string[]) => {
  const counts = new Map<string, number>();
  ids.forEach((id) => {
    const theme = networkLegendProperties.get(id)?.themeNo;
    if (theme) counts.set(theme, (counts.get(theme) || 0) + 1);
  });
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
};
const graphCollections = () => ({
  nodes: {
    type: 'FeatureCollection',
    features: networkNodes.map((node) => ({
      type: 'Feature',
      id: node.id,
      geometry: { type: 'Point', coordinates: node.coordinates },
      properties: {
        id: node.id,
        name: node.name,
        kind: node.kind || 'place',
        count: node.count,
        connectionCount: node.connectionCount,
        plotCount: node.plotCount,
        dominantTheme: node.dominantTheme,
        color: node.color,
        legendIds: node.legendIds.join(','),
      },
    })),
  },
  edges: {
    type: 'FeatureCollection',
    features: networkEdges.map((edge) => ({
      type: 'Feature',
      id: edge.id,
      geometry: { type: 'LineString', coordinates: edge.coordinates },
      properties: {
        id: edge.id,
        color:
          networkColor.value === 'single'
            ? networkSingleColor()
            : networkColor.value === 'collector'
              ? networkCollectorColor(networkCollectorFor(edge.legendIds || []))
              : networkCollectorColor(
                  networkType.value === 'collectors'
                    ? networkThemeFor(edge.legendIds || [])
                    : edge.strongest[0]?.plot || '',
                ),
        fromId: edge.fromId,
        toId: edge.toId,
        count: edge.count || 0,
        legendIds: (edge.legendIds || []).join(','),
        relationshipType: networkType.value,
        sharedCount: edge.sharedCount,
        strongest: JSON.stringify(edge.strongest),
      },
    })),
  },
});
let overviewConnections = new Set<string>();
const publishNetwork = () => {
  const collections = graphCollections();
  (map.getSource('network') as maplibregl.GeoJSONSource)?.setData({
    ...collections.edges,
    features: collections.edges.features.map((feature, index) => ({
      ...feature,
      properties: {
        ...feature.properties,
        strength: networkEdges[index].strength,
        overview: overviewConnections.has(feature.properties.id),
      },
    })),
  } as any);
  (map.getSource('network-nodes') as maplibregl.GeoJSONSource)?.setData(collections.nodes as any);
  networkContext.textContent = tr('map.networkBuiltFrom', {
    count: formatter().format(networkRecordCount),
  });
  const label = page.querySelector<HTMLElement>(
    '[data-i18n="map.networkEdgeStrength"], [data-i18n="map.networkEdgeRecords"], [data-i18n="map.networkEdgeMLTypes"], [data-i18n="map.networkEdgeCollectors"]',
  );
  if (label) {
    label.dataset.i18n =
      networkType.value === 'collectors' ? 'map.networkEdgeCollectors' : 'map.networkEdgeMLTypes';
    label.textContent = tr(label.dataset.i18n);
  }
  const method = page.querySelector<HTMLElement>('[data-network-method] span')!;
  method.dataset.i18n = 'map.networkMethodMetadata';
  method.textContent = tr(method.dataset.i18n);
  method.parentElement!.title = method.textContent;
  if (activeNetworkNode && !networkNodes.some((node) => node.id === activeNetworkNode)) {
    activeNetworkNode = null;
    panel.hidden = true;
  }
  if (hoveredNetworkNode && !networkNodes.some((node) => node.id === hoveredNetworkNode)) {
    hoveredNetworkNode = null;
    networkTooltip.hidden = true;
  }
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  syncFilterInterface();
};
// Use the complete dataset as the visual reference, so filtering never rescales
// an unchanged relationship or degree to look stronger than it was before.
const networkScaleReferences = new Map<
  string,
  {
    maxWeight: number;
    maxConnections: number;
  }
>();
const networkScaleReference = () => {
  const type = networkType.value;
  if (!networkScaleReferences.has(type)) {
    const complete = buildMetadataNetwork(type, dataset.legends.features);
    networkScaleReferences.set(type, {
      maxWeight: Math.max(1, ...complete.edges.map((edge) => edge.sharedCount)),
      maxConnections: Math.max(1, ...complete.nodes.map((node) => node.connectionCount)),
    });
  }
  return networkScaleReferences.get(type)!;
};
const recalculateNetwork = () => {
  const graph = buildMetadataNetwork(networkType.value, filteredFeatures);
  page.querySelector<HTMLAnchorElement>('[data-network-method]')!.href =
    `${base}about/#${networkType.value === 'collectors' ? 'network-collectors' : 'network'}`;
  networkRecordCount = graph.recordCount;
  const { maxWeight } = networkScaleReference();
  hoveredNetworkNode = null;
  networkTooltip.hidden = true;
  networkNodes = graph.nodes.map((node) => ({
    ...node,
    color: networkColorFor(node as NetworkNode),
  })) as NetworkNode[];
  networkEdges = graph.edges.map((edge) => ({
    ...edge,
    strength: Math.sqrt(edge.sharedCount / maxWeight),
  }));
  overviewConnections = strongestConnectionIds(networkEdges);
  publishNetwork();
};
const relatedNodeIds = (id: string) => {
  const ids = new Set([id]);
  networkEdges.forEach((edge) => {
    if (edge.fromId === id) ids.add(edge.toId);
    if (edge.toId === id) ids.add(edge.fromId);
  });
  return [...ids];
};
const networkBubbleRadius = () => {
  const radius =
    networkSizeBy.value === 'connections'
      ? [
          'interpolate',
          ['linear'],
          ['sqrt', ['get', 'connectionCount']],
          0,
          2,
          Math.sqrt(networkScaleReference().maxConnections),
          10,
        ]
      : ['interpolate', ['linear'], ['sqrt', ['get', 'count']], 2, 3, 17, 10];
  return ['*', radius, Number(networkSize.value) / 100];
};
const applyNetworkFocus = (hoveredId: string | null) => {
  if (!map.getLayer('network') || !map.getLayer('network-nodes')) return;
  const id = activeNetworkNode || hoveredId;
  const focused = id && (hoveredNetworkNode || activeNetworkNode),
    related = focused ? relatedNodeIds(id!) : [];
  const incident = ['any', ['==', ['get', 'fromId'], id], ['==', ['get', 'toId'], id]],
    hideOthers = focused && networkOthers.value === 'hide';
  const edgeFilter = hideOthers
    ? incident
    : networkStrongestOnly.checked
      ? focused
        ? ['any', ['==', ['get', 'overview'], true], incident]
        : ['==', ['get', 'overview'], true]
      : null;
  const nodeFilter = hideOthers ? ['in', ['get', 'id'], ['literal', related]] : null;
  for (const layer of ['network-nodes', 'network-node-hit', 'network-node-labels'])
    if (map.getLayer(layer)) map.setFilter(layer, nodeFilter as any);
  map.setFilter('network', edgeFilter as any);
  map.setFilter('network-halo', edgeFilter as any);
  const shown = hideOthers
    ? networkEdges.filter((edge) => edge.fromId === id || edge.toId === id).length
    : networkStrongestOnly.checked
      ? networkEdges.filter(
          (edge) =>
            overviewConnections.has(edge.id) ||
            (focused && (edge.fromId === id || edge.toId === id)),
        ).length
      : networkEdges.length;
  networkVisibility.textContent = tr(
    !focused && networkStrongestOnly.checked
      ? 'map.networkStrongestConnections'
      : 'map.networkVisibleConnections',
    { shown: formatter().format(shown), total: formatter().format(networkEdges.length) },
  );
  const stroke = colors.dark ? 0.62 : 0.66,
    dimmed = colors.dark ? 0.16 : 0.22;
  const edgeColor = ['get', 'color'];
  map.setPaintProperty('network', 'line-color', edgeColor as any);
  map.setPaintProperty('network-halo', 'line-color', edgeColor as any);
  map.setPaintProperty('network-nodes', 'circle-radius', networkBubbleRadius() as any);
  if (map.getLayer('network-node-hit'))
    map.setPaintProperty('network-node-hit', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], activeNetworkNode || ''],
      ['max', 10, ['+', networkBubbleRadius(), 6]],
      ['max', 6, networkBubbleRadius()],
    ] as any);
  map.setPaintProperty('network-nodes', 'circle-opacity', 0);
  map.setPaintProperty('network-nodes', 'circle-stroke-color', ['get', 'color']);
  map.setPaintProperty(
    'network-nodes',
    'circle-stroke-opacity',
    focused
      ? [
          'case',
          ['==', ['get', 'id'], id],
          1,
          ['in', ['get', 'id'], ['literal', related]],
          0.82,
          dimmed,
        ]
      : stroke,
  );
  map.setPaintProperty(
    'network-nodes',
    'circle-stroke-width',
    activeNetworkNode
      ? [
          'case',
          ['==', ['get', 'id'], activeNetworkNode],
          Math.max(2.4, (2.2 * Number(networkSize.value)) / 100),
          Math.max(0.65, (1.55 * Number(networkSize.value)) / 100),
        ]
      : Math.max(0.65, (1.55 * Number(networkSize.value)) / 100),
  );
  const overviewOpacity = ['interpolate', ['linear'], ['get', 'strength'], 0.1, 0.12, 0.75, 0.52];
  const edgeOpacity = focused
    ? [
        'case',
        incident,
        ['interpolate', ['linear'], ['get', 'strength'], 0.1, 0.65, 0.75, 1],
        ['*', overviewOpacity, 0.18],
      ]
    : overviewOpacity;
  const threadStrength = Number(networkIntensity.value) / 100;
  map.setPaintProperty('network', 'line-opacity', [
    'min',
    1,
    ['*', edgeOpacity, threadStrength],
  ] as any);
  if (map.getLayer('network-node-labels'))
    map.setPaintProperty(
      'network-node-labels',
      'text-opacity',
      focused ? ['case', ['in', ['get', 'id'], ['literal', related]], 1, 0.15] : 0.85,
    );
  for (const layer of ['network-selected-ring', 'network-selected-label']) {
    if (!map.getLayer(layer)) continue;
    map.setFilter(layer, ['==', ['get', 'id'], activeNetworkNode || '']);
    map.setLayoutProperty(layer, 'visibility', mapMode === 'network' ? 'visible' : 'none');
  }
  if (map.getLayer('network-selected-ring')) {
    map.setPaintProperty('network-selected-ring', 'circle-radius', [
      '+',
      networkBubbleRadius(),
      4,
    ] as any);
    map.setPaintProperty(
      'network-selected-ring',
      'circle-stroke-color',
      css(`--map-data-yellow-${colors.dark ? 'dark' : 'light'}`),
    );
  }
  if (map.getLayer('network-selected-label')) {
    map.setPaintProperty('network-selected-label', 'text-color', colors.ink);
    map.setPaintProperty('network-selected-label', 'text-halo-color', colors.raised);
  }
  map.setPaintProperty('network-halo', 'line-opacity', 0);
  map.setPaintProperty('network', 'line-blur', 0);
};
const recordHref = (ids: string[]) =>
  `${base}browse/?selection=${encodeURIComponent(ids.join(','))}`;
const networkKindLabel = (node: NetworkNode) => tr(`map.networkKind.${node.kind || 'place'}`);
const renderNetworkNodePanel = (id: string) => {
  const node = networkNodes.find((item) => item.id === id);
  if (!node) return;
  activeNetworkNode = id;
  const related = networkEdges
    .filter((edge) => edge.fromId === id || edge.toId === id)
    .sort((a, b) => b.sharedCount - a.sharedCount);
  const escapeText = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  const relatedList = related
    .slice(0, 5)
    .map((edge) => {
      const other = networkNodes.find(
        (item) => item.id === (edge.fromId === id ? edge.toId : edge.fromId),
      );
      if (!other) return '';
      return `<li><button type="button" data-network-related="${escapeText(other.id)}"><span>${escapeText(other.name)}<small>${networkKindLabel(other)}</small></span><strong>${formatter().format(edge.sharedCount)}</strong><i data-lucide="chevron-right"></i></button></li>`;
    })
    .join('');
  panel.hidden = false;
  panel.innerHTML = sharedPlaceProfile(node.id.replace(/^place:/, ''), node.name, {
    tone: node.color,
    connections: node.connectionCount,
    networkRecords: node.count,
    extra: relatedList
      ? `<p class="place-connection-key">${tr(networkType.value === 'collectors' ? 'map.networkSharedCollectors' : 'map.sharedPlots')}</p><ul class="network-profile-links">${relatedList}</ul>`
      : '',
  });
  panel
    .querySelectorAll<HTMLButtonElement>('[data-network-related]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        renderNetworkNodePanel(button.dataset.networkRelated!),
      ),
    );
  panel.querySelector('.map-panel-close')?.addEventListener('click', () => {
    activeNetworkNode = null;
    panel.hidden = true;
    applyNetworkFocus(null);
  });
  window.renderLucideIcons?.();
  applyNetworkFocus(id);
};
const renderNetworkEdgePanel = (id: string) => {
  const edge = networkEdges.find((item) => item.id === id);
  if (!edge) return;
  const from = networkNodes.find((node) => node.id === edge.fromId)!,
    to = networkNodes.find((node) => node.id === edge.toId)!;
  const escapeText = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  const rows = edge.strongest
    .map(
      (item) =>
        `<li><span>${escapeText(item.plot)}</span><strong>${item.from} / ${item.to}</strong></li>`,
    )
    .join('');
  panel.hidden = false;
  panel.innerHTML = `<button class="map-panel-close" type="button" aria-label="${tr('map.close')}"><i data-lucide="x"></i></button><p class="map-panel-eyebrow">${tr('map.profile.connection')}</p><h2>${escapeText(from.name)} ↔ ${escapeText(to.name)}</h2><p class="network-panel-count">${tr(networkType.value === 'collectors' ? (edge.sharedCount === 1 ? 'map.networkSharedCollectorCountOne' : 'map.networkSharedCollectorCount') : 'map.networkSharedTypeCount', { count: formatter().format(edge.sharedCount) })}</p><p class="map-panel-note">${tr(networkType.value === 'collectors' ? 'map.networkCollectorRecordCounts' : 'map.networkTypeRecordCounts', { from: from.name, to: to.name })}</p><ul class="network-ranked">${rows}</ul><a class="button" href="${recordHref(edge.legendIds || [])}"><span>${tr('map.openTexts')}</span><i data-lucide="arrow-right"></i></a>`;
  panel.querySelector('.map-panel-close')?.addEventListener('click', () => {
    panel.hidden = true;
  });
  window.renderLucideIcons?.();
};
const syncPointStyleLayers = () => {
  page
    .querySelectorAll<HTMLInputElement>('[data-point-style-choice] input[name="point-style"]')
    .forEach((input) => {
      input.checked = input.value === pointStyle;
    });
  page.dataset.pointStyle = pointStyle;
  const pointModeActive = legendMapActive(),
    detailActive = clusterDetailActive(),
    pointLayersVisible = pointModeActive || detailActive;
  for (const id of [
    'points',
    'point-place-containers',
    'point-links',
    'point-focus-links',
    'point-place-center-halo',
    'point-place-centers',
    'point-place-selection-ring',
    'point-place-selection-label',
    'point-place-hit',
  ])
    if (map.getLayer(id))
      map.setLayoutProperty(id, 'visibility', pointLayersVisible ? 'visible' : 'none');
  if (map.getLayer('point-place-cluster-count'))
    map.setLayoutProperty(
      'point-place-cluster-count',
      'visibility',
      detailActive ? 'visible' : 'none',
    );
  if (map.getLayer('point-links-hit'))
    map.setLayoutProperty(
      'point-links-hit',
      'visibility',
      pointModeActive && effectivePointStyle() === 'rays' ? 'visible' : 'none',
    );
  for (const id of ['point-end-bubbles', 'points-hit'])
    if (map.getLayer(id))
      map.setLayoutProperty(
        id,
        'visibility',
        (pointModeActive && effectivePointStyle() === 'bubbles') || detailActive
          ? 'visible'
          : 'none',
      );
  if (map.getLayer('point-place-centers')) updatePointCenterSelection();
  if (!points.state.selectedPointLegend)
    showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
};
const setMapMode = (mode: string, save = true) => {
  if (!['places', 'points', 'clusters', 'heatmap', 'network'].includes(mode)) mode = 'points';
  mapMode = mode;
  page.querySelector<HTMLElement>('.uncertainty-settings')!.hidden = mode === 'heatmap';
  page.querySelector<HTMLElement>('[data-uncertainty-key]')!.hidden =
    !uncertaintyToggle.checked || mode === 'heatmap';
  syncUncertaintyButton();
  const uncertaintyKey = page.querySelector<HTMLElement>('[data-uncertainty-key] p')!;
  uncertaintyKey.dataset.i18n =
    mode === 'clusters' ? 'map.uncertaintyClusterKey' : 'map.uncertaintyKey';
  uncertaintyKey.textContent = tr(uncertaintyKey.dataset.i18n);
  syncPaletteSelection();
  page
    .querySelectorAll<HTMLButtonElement>('[data-map-mode]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode)),
    );
  for (const [id, visibleMode] of [
    ['points', 'points'],
    ['points-hit', 'points'],
    ['point-place-containers', 'points'],
    ['point-links', 'points'],
    ['point-links-hit', 'points'],
    ['point-focus-links', 'points'],
    ['point-place-center-halo', 'points'],
    ['point-place-centers', 'points'],
    ['point-place-selection-ring', 'points'],
    ['point-place-selection-label', 'points'],
    ['point-place-cluster-count', 'points'],
    ['point-place-hit', 'points'],
    ['cluster-aura', 'clusters'],
    ['cluster-ring', 'clusters'],
    ['clusters', 'clusters'],
    ['cluster-hover', 'clusters'],
    ['cluster-count', 'clusters'],
    ['heatmap', 'heatmap'],
  ] as const)
    if (map.getLayer(id))
      map.setLayoutProperty(id, 'visibility', mode === visibleMode ? 'visible' : 'none');
  syncPointStyleLayers();
  if (map.getLayer('point-links')) applyTheme(true);
  points.state.clusterDetailRendered = clusterDetailActive();
  for (const id of [
    'network-halo',
    'network',
    'network-nodes',
    'network-node-hit',
    'network-selected-ring',
    'network-selected-label',
  ])
    if (map.getLayer(id))
      map.setLayoutProperty(id, 'visibility', mode === 'network' ? 'visible' : 'none');
  heatControls.hidden = mode !== 'heatmap';
  pointControls.hidden = !legendMapActive();
  page
    .querySelectorAll<HTMLElement>('[data-point-layer-control]')
    .forEach((control) => (control.hidden = !legendMapActive()));
  heatKey.hidden = mode !== 'heatmap';
  networkToolbar.hidden = mode !== 'network';
  page.querySelector<HTMLElement>('[data-map-legend]')!.dataset.mode = mode;
  if (
    (legendMapActive() || clusterDetailActive()) &&
    Math.abs(map.getZoom() - points.state.pointSpreadZoom) >= 0.2
  )
    updatePointSources();
  syncControls();
  if (mode === 'clusters') renderPanel();
  if (save) updateUrl();
};
const applyTheme = (preserveMapPalette = false) =>
  applyMapTheme(
    {
      get colors() {
        return colors;
      },
      set colors(value: MapColors) {
        colors = value;
      },
      get themeColors() {
        return themeColors;
      },
      get mapStage() {
        return mapStage;
      },
      get page() {
        return page;
      },
      get densityPalette() {
        return densityPalette;
      },
      get map() {
        return map;
      },
      get effectivePointStyle() {
        return effectivePointStyle;
      },
      get pointIntensity() {
        return pointIntensity;
      },
      get pointBubbleOpacity() {
        return pointBubbleOpacity;
      },
      set pointBubbleOpacity(value: unknown) {
        pointBubbleOpacity = value;
      },
      get pointBubbleStrokeOpacity() {
        return pointBubbleStrokeOpacity;
      },
      set pointBubbleStrokeOpacity(value: unknown) {
        pointBubbleStrokeOpacity = value;
      },
      get pointLinkOpacity() {
        return pointLinkOpacity;
      },
      set pointLinkOpacity(value: unknown) {
        pointLinkOpacity = value;
      },
      get pointColorBy() {
        return pointColorBy;
      },
      get updatePointCenterSelection() {
        return updatePointCenterSelection;
      },
      get networkNodes() {
        return networkNodes;
      },
      get recalculateNetwork() {
        return recalculateNetwork;
      },
      get points() {
        return points;
      },
      get updatePointSources() {
        return updatePointSources;
      },
      get syncPointStyleLayers() {
        return syncPointStyleLayers;
      },
      get applyBasemapStyle() {
        return applyBasemapStyle;
      },
    },
    preserveMapPalette,
  );
const openFreeMapLayers: {
  id: string;
  style: string;
  labels: boolean;
}[] = [];
const applyBasemapStyle = () => {
  if (!map.getLayer('land')) return;
  const style = basemapStyle.value,
    geography = visible('geography') === 'visible',
    labels = visible('labels') === 'visible';
  for (const id of [
    'land',
    'coast',
    'lakes',
    'rivers',
    'territory-boundaries',
    'city-dots',
    'city-labels',
  ])
    map.setLayoutProperty(id, 'visibility', 'none');
  map.setLayoutProperty('place-labels', 'visibility', labels ? 'visible' : 'none');
  if (map.getLayer('network-node-labels'))
    map.setLayoutProperty(
      'network-node-labels',
      'visibility',
      labels && mapMode === 'network' ? 'visible' : 'none',
    );
  map.setLayoutProperty(
    'carto-streets',
    'visibility',
    style === 'streets' && geography ? 'visible' : 'none',
  );
  for (const layer of openFreeMapLayers)
    map.setLayoutProperty(
      layer.id,
      'visibility',
      layer.style === style && (layer.labels ? labels : geography) ? 'visible' : 'none',
    );
};
installMapLayers({
  get map() {
    return map;
  },
  get base() {
    return base;
  },
  get dataset() {
    return dataset;
  },
  get filteredUnmappedLegends() {
    return filteredUnmappedLegends;
  },
  get openFreeMapLayers() {
    return openFreeMapLayers;
  },
  get visible() {
    return visible;
  },
  get colors() {
    return colors;
  },
  get heatIntensity() {
    return heatIntensity;
  },
  get heatRadiusValue() {
    return heatRadiusValue;
  },
  get networkBubbleRadius() {
    return networkBubbleRadius;
  },
  get pointStyle() {
    return pointStyle;
  },
  get params() {
    return params;
  },
  get selectedId() {
    return selectedId;
  },
  get resetExtent() {
    return resetExtent;
  },
  get applyTheme() {
    return applyTheme;
  },
  get basemapExplicit() {
    return basemapExplicit;
  },
  get setMapMode() {
    return setMapMode;
  },
  get mapMode() {
    return mapMode;
  },
  get applyFilters() {
    return applyFilters;
  },
  get selectPlace() {
    return selectPlace;
  },
  get updateCount() {
    return updateCount;
  },
  get syncControls() {
    return syncControls;
  },
});
map.on('click', 'clusters', async (event) => {
  const feature = map.queryRenderedFeatures(event.point, {
      layers: ['clusters'],
    })[0],
    source = map.getSource('legend-clusters') as maplibregl.GeoJSONSource,
    clusterId = Number(feature.properties?.cluster_id),
    zoom = await source.getClusterExpansionZoom(clusterId);
  renderPanel();
  map.easeTo({
    center: (
      feature.geometry as unknown as {
        coordinates: [number, number];
      }
    ).coordinates,
    zoom,
  });
});
map.on('mousemove', 'clusters', (event) => {
  const clusterId = Number(event.features?.[0]?.properties?.cluster_id);
  if (!Number.isFinite(clusterId) || clusterId === points.state.hoveredClusterId) return;
  points.state.hoveredClusterId = clusterId;
  map.setFilter('cluster-hover', [
    'all',
    ['has', 'point_count'],
    ['==', ['get', 'cluster_id'], clusterId],
  ]);
});
map.on('mouseleave', 'clusters', () => {
  points.state.hoveredClusterId = null;
  map.setFilter('cluster-hover', [
    'all',
    ['has', 'point_count'],
    ['==', ['get', 'cluster_id'], -1],
  ]);
});
map.on('click', 'heatmap', (event) => {
  const northwest = map.unproject([event.point.x - 42, event.point.y - 42]),
    southeast = map.unproject([event.point.x + 42, event.point.y + 42]),
    nearby = filteredFeatures.filter((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return (
        longitude >= northwest.lng &&
        longitude <= southeast.lng &&
        latitude <= northwest.lat &&
        latitude >= southeast.lat
      );
    });
  if (nearby.length) renderAggregate(tr('map.hotspotSummary'), nearby);
});
map.on('click', 'point-links-hit', (event) => {
  if (
    pointStyle !== 'rays' ||
    map.queryRenderedFeatures(event.point, { layers: ['point-place-hit'] }).length
  )
    return;
  const id = nearestPointLegend(event),
    feature = filteredFeatures.find((item) => item.properties.id === id);
  if (feature) renderLegend(feature.properties);
});
map.on('mousemove', 'point-links-hit', (event) => {
  if (
    pointStyle !== 'rays' ||
    map.queryRenderedFeatures(event.point, { layers: ['point-place-hit'] }).length
  )
    return;
  const id = nearestPointLegend(event);
  setHoveredPointLegendState(id || null);
  if (id && id !== points.state.activePointLegend) showPointLegendLink(id);
});
map.on('mouseleave', 'point-links-hit', () => {
  if (pointStyle !== 'rays') return;
  setHoveredPointLegendState(null);
  points.state.selectedPointLegend
    ? showPointLegendLink(points.state.selectedPointLegend, true)
    : showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
});
map.on('click', 'points-hit', (event) => {
  if (
    !bubbleInteractionActive() ||
    map.queryRenderedFeatures(event.point, { layers: ['point-place-hit'] }).length
  )
    return;
  const properties = event.features?.[0]?.properties as LegendProperties | undefined;
  if (properties) renderLegend(properties);
});
map.on('mousemove', 'points-hit', (event) => {
  if (
    !bubbleInteractionActive() ||
    map.queryRenderedFeatures(event.point, { layers: ['point-place-hit'] }).length
  )
    return;
  const id = String(event.features?.[0]?.properties?.id || '');
  setHoveredPointLegendState(id || null);
  if (id && id !== points.state.activePointLegend) showPointLegendLink(id);
});
map.on('mouseleave', 'points-hit', () => {
  if (!bubbleInteractionActive()) return;
  setHoveredPointLegendState(null);
  points.state.selectedPointLegend
    ? showPointLegendLink(points.state.selectedPointLegend, true)
    : showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
});
map.on('click', 'point-place-hit', (event) => {
  const placeId = String(event.features?.[0]?.properties?.placeId || ''),
    centerKey = String(event.features?.[0]?.properties?.centerKey || '');
  if (placeId) renderPointPlace(placeId, centerKey || null);
});
map.on('mouseenter', 'point-place-hit', (event) => {
  const centerKey = String(event.features?.[0]?.properties?.centerKey || '');
  if (centerKey && mapMode !== 'places') showPointLinks(centerKey);
});
map.on('mouseleave', 'point-place-hit', () =>
  points.state.selectedPointLegend
    ? showPointLegendLink(points.state.selectedPointLegend, true)
    : showPointLinks(selectedPointCenter, Boolean(selectedPointCenter)),
);
container.addEventListener('mouseleave', () => {
  setHoveredPointLegendState(null);
  points.state.selectedPointLegend
    ? showPointLegendLink(points.state.selectedPointLegend, true)
    : showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
});
map.on('click', 'unmapped', renderUnmapped);
map.on('mouseenter', 'unmapped', () =>
  map.setFeatureState({ source: 'unmapped', id: 'unmapped' }, { hovered: true }),
);
map.on('mouseleave', 'unmapped', () =>
  map.setFeatureState({ source: 'unmapped', id: 'unmapped' }, { hovered: false }),
);
map.on('mouseenter', 'network-node-hit', (event) => {
  const properties = event.features?.[0]?.properties as
      | {
          id?: string;
        }
      | undefined,
    node = networkNodes.find((item) => item.id === properties?.id);
  if (!node) return;
  hoveredNetworkNode = node.id;
  applyNetworkFocus(node.id);
  const related = networkEdges.filter(
    (edge) => edge.fromId === node.id || edge.toId === node.id,
  ).length;
  networkTooltip.hidden = false;
  networkTooltip.innerHTML = `<strong>${node.name}</strong><span>${networkKindLabel(node)}</span><span>${tr('map.networkLegendCount', { count: formatter().format(node.count) })}</span><span>${tr('map.networkPlotCount', { count: formatter().format(node.plotCount) })}</span><span>${tr('map.networkRelatedCount', { count: formatter().format(related) })}</span>`;
});
map.on('mousemove', 'network-node-hit', (event) => {
  networkTooltip.style.left = `${event.point.x + 14}px`;
  networkTooltip.style.top = `${event.point.y + 14}px`;
});
map.on('mouseleave', 'network-node-hit', () => {
  hoveredNetworkNode = null;
  unmappedSelected = false;
  map.setFeatureState({ source: 'unmapped', id: 'unmapped' }, { selected: false, hovered: false });
  networkTooltip.hidden = true;
  applyNetworkFocus(activeNetworkNode);
});
map.on('click', 'network-node-hit', (event) => {
  const id = String(event.features?.[0]?.properties?.id || '');
  if (id) renderNetworkNodePanel(id);
});
map.on('click', 'network-selected-label', (event) => {
  const id = String(event.features?.[0]?.properties?.id || '');
  if (id) renderNetworkNodePanel(id);
});
map.on('click', 'network', (event) => {
  if (map.queryRenderedFeatures(event.point, { layers: ['network-node-hit'] }).length) return;
  const id = String(event.features?.[0]?.properties?.id || '');
  if (id) renderNetworkEdgePanel(id);
});
const clearMapSelection = () => {
  setHoveredPointLegendState(null);
  selectPointLegend(null);
  selectedId = null;
  selectedPointCenter = null;
  points.state.activePointPlace = null;
  points.state.activePointLegend = null;
  activeNetworkNode = null;
  hoveredNetworkNode = null;
  updatePointCenterSelection();
  showPointLinks(null);
  applyNetworkFocus(null);
  networkTooltip.hidden = true;
  renderPanel();
  updateUrl();
};
map.on('click', (event) => {
  const interactiveLayers = [
    'points-hit',
    'point-links-hit',
    'point-place-hit',
    'clusters',
    'heatmap',
    'unmapped',
    'network-node-hit',
    'network-selected-label',
    'network',
  ].filter((layer) => map.getLayer(layer));
  if (
    interactiveLayers.length &&
    map.queryRenderedFeatures(event.point, { layers: interactiveLayers }).length
  )
    return;
  clearMapSelection();
});
for (const layer of [
  'points-hit',
  'point-links-hit',
  'point-place-hit',
  'clusters',
  'unmapped',
  'network-node-hit',
  'network',
]) {
  map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
}
const syncNetworkChoices = () => {
  page.querySelector<HTMLElement>('[data-network-palette]')!.hidden =
    networkColor.value !== 'single';
  page
    .querySelectorAll<HTMLInputElement>('[name="network-palette"]')
    .forEach((input) => (input.checked = input.value === networkPalette));
  networkToolbar.querySelectorAll<HTMLDetailsElement>('[data-network-choice]').forEach((choice) => {
    const select = choice.querySelector<HTMLSelectElement>('select')!,
      selected = choice.querySelector<HTMLButtonElement>(`[data-network-value="${select.value}"]`)!,
      label = choice.querySelector<HTMLElement>('[data-network-choice-label]')!;
    const translationKey = selected.dataset.i18n!;
    label.dataset.i18n = translationKey;
    label.textContent = tr(translationKey);
    choice
      .querySelectorAll<HTMLButtonElement>('[data-network-value]')
      .forEach((button) => button.setAttribute('aria-pressed', String(button === selected)));
  });
};
const syncControls = () => {
  const viewHelp = page.querySelector<HTMLAnchorElement>('[data-map-method]')!;
  viewHelp.hidden = mapMode === 'network';
  viewHelp.href = `${base}about/#${mapMode === 'places' ? 'map-places' : mapMode === 'points' ? 'map-legends' : mapMode === 'clusters' ? 'map-clusters' : 'map-density'}`;
  window.syncSliderProgress?.();
  heatControls.hidden = mapMode !== 'heatmap';
  heatKey.hidden = mapMode !== 'heatmap';
  networkToolbar.hidden = mapMode !== 'network';
  const networkTitle = page.querySelector<HTMLElement>('[data-network-view-title]')!;
  networkTitle.hidden = mapMode !== 'network';
  const networkTitleText = networkTitle.querySelector<HTMLElement>('[data-network-title-text]')!;
  networkTitleText.dataset.i18n =
    networkType.value === 'collectors' ? 'map.networkTitleCollectors' : 'map.networkTitleTypes';
  networkTitleText.textContent = tr(networkTitleText.dataset.i18n);
  syncNetworkChoices();
  page.querySelector<HTMLElement>('[data-visualization-settings]')!.hidden = mapMode === 'network';
  const detailActive = clusterDetailActive();
  page.querySelector<HTMLElement>('[data-point-color-by]')!.hidden =
    !legendMapActive() && !detailActive;
  page.querySelector<HTMLElement>('[data-point-style-choice]')!.hidden = mapMode !== 'points';
  pointControls.hidden = !legendMapActive() && !detailActive;
  page.querySelector<HTMLElement>('[data-places-size-control]')!.hidden = mapMode !== 'places';
  page.querySelector<HTMLElement>('[data-places-sizing]')!.hidden = mapMode !== 'places';
  const unmappedVisible =
    mapMode !== 'network' &&
    page.querySelector<HTMLInputElement>('[data-layer="unmapped"]')!.checked;
  for (const id of [
    'unmapped-aura',
    'unmapped',
    ...Array.from({ length: 12 }, (_, index) => `unmapped-dot-${index}`),
    'unmapped-count',
  ])
    if (map.getLayer(id))
      map.setLayoutProperty(id, 'visibility', unmappedVisible ? 'visible' : 'none');
};
page.querySelectorAll<HTMLInputElement>('[data-layer]').forEach((input) =>
  input.addEventListener('change', () => {
    const name = input.dataset.layer!,
      visibility = input.checked ? 'visible' : 'none',
      ids =
        name === 'labels'
          ? ['city-dots', 'city-labels', 'place-labels']
          : name === 'geography'
            ? ['land', 'coast', 'lakes', 'rivers', 'territory-boundaries', 'carto-streets']
            : name === 'clusters'
              ? ['cluster-aura', 'cluster-ring', 'clusters', 'cluster-hover', 'cluster-count']
              : name === 'unmapped'
                ? [
                    'unmapped-aura',
                    'unmapped',
                    ...Array.from({ length: 12 }, (_, index) => `unmapped-dot-${index}`),
                    'unmapped-count',
                  ]
                : [name];
    ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', visibility));
    if (name === 'labels' || name === 'geography') applyBasemapStyle();
    syncControls();
    updateCount();
    updateUrl();
  }),
);
page
  .querySelectorAll<HTMLButtonElement>('[data-map-mode]:not(:disabled)')
  .forEach((button) => button.addEventListener('click', () => setMapMode(button.dataset.mapMode!)));
heatInput.addEventListener('input', () => {
  heatOutput.value = `${heatInput.value}%`;
  if (map.getLayer('heatmap'))
    map.setPaintProperty('heatmap', 'heatmap-intensity', heatIntensity() as any);
  updateUrl();
});
networkStrongestOnly.addEventListener('change', () => {
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  updateUrl();
});
networkSize.addEventListener('input', () => {
  networkSizeOutput.value = `${networkSize.value}%`;
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  updateUrl();
});
networkIntensity.addEventListener('input', () => {
  networkIntensityOutput.value = `${networkIntensity.value}%`;
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  updateUrl();
});
page.querySelectorAll<HTMLInputElement>('[name="places-size-by"]').forEach((input) =>
  input.addEventListener('change', () => {
    if (!input.checked) return;
    placesSizeBy = input.value;
    updatePointSources();
    updatePointCenterSelection();
    showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
    updateUrl();
  }),
);
placesSize.addEventListener('input', () => {
  placesSizeOutput.value = `${placesSize.value}%`;
  updatePointSources();
  updatePointCenterSelection();
  showPointLinks(selectedPointCenter, Boolean(selectedPointCenter));
  updateUrl();
});
pointIntensity.addEventListener('input', () => {
  pointIntensityOutput.value = `${pointIntensity.value}%`;
  if (pointStyle === 'rays') {
    points.state.pointSpreadZoom = -1;
    updatePointSources();
  }
  applyTheme(true);
  updateUrl();
});
heatRadius.addEventListener('input', () => {
  radiusOutput.value = heatRadius.value;
  if (map.getLayer('heatmap'))
    map.setPaintProperty('heatmap', 'heatmap-radius', heatRadiusValue() as any);
  updateUrl();
});
networkToolbar.querySelectorAll<HTMLDetailsElement>('[data-network-choice]').forEach((choice) => {
  choice
    .querySelectorAll<HTMLButtonElement>('[data-network-value]:not(:disabled)')
    .forEach((button) =>
      button.addEventListener('click', () => {
        const select = choice.querySelector<HTMLSelectElement>('select')!;
        select.value = button.dataset.networkValue!;
        select.dispatchEvent(new Event('change'));
        choice.open = false;
        syncNetworkChoices();
      }),
    );
  choice.addEventListener('toggle', () => {
    if (!choice.open) return;
    networkToolbar
      .querySelectorAll<HTMLDetailsElement>('[data-network-choice][open]')
      .forEach((other) => {
        if (other !== choice) other.open = false;
      });
  });
});
networkToolbar.addEventListener('toggle', () => {
  if (!networkToolbar.open)
    networkToolbar
      .querySelectorAll<HTMLDetailsElement>('[data-network-choice]')
      .forEach((choice) => (choice.open = false));
});
networkType.addEventListener('change', () => {
  activeNetworkNode = null;
  hoveredNetworkNode = null;
  panel.hidden = true;
  networkTooltip.hidden = true;
  recalculateNetwork();
  syncControls();
  updateUrl();
});
networkOthers.addEventListener('change', () => {
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  syncNetworkChoices();
  updateUrl();
});
networkSizeBy.addEventListener('change', () => {
  applyNetworkFocus(activeNetworkNode || hoveredNetworkNode);
  syncNetworkChoices();
  updateUrl();
});
networkColor.addEventListener('change', () => {
  recalculateNetwork();
  updateUrl();
});
page.querySelectorAll<HTMLInputElement>('[name="network-palette"]').forEach((input) =>
  input.addEventListener('change', () => {
    if (!input.checked) return;
    networkPalette = input.value;
    recalculateNetwork();
    syncNetworkChoices();
    updateUrl();
  }),
);
page.querySelectorAll<HTMLButtonElement>('[data-basemap-option]').forEach((option) =>
  option.addEventListener('click', () => {
    basemapStyle.value = option.dataset.basemapOption!;
    basemapExplicit = true;
    colors = themeColors(
      basemapPalette(basemapStyle.value) ?? document.documentElement.dataset.theme === 'dark',
    );
    basemapMenu.open = false;
    syncBasemapMenu();
    applyTheme(true);
    updateUrl();
  }),
);
page
  .querySelectorAll<HTMLInputElement>('[data-map-palette] input[name="map-palette"]')
  .forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      if (mapMode === 'heatmap') densityPalette = input.value;
      else pointPalette = input.value;
      colors = themeColors(
        basemapPalette(basemapStyle.value) ?? document.documentElement.dataset.theme === 'dark',
      );
      applyTheme(true);
      updateUrl();
    }),
  );
page
  .querySelectorAll<HTMLInputElement>('[data-point-color-by] input[name="point-color-by"]')
  .forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      pointColorBy = input.value;
      applyTheme(true);
      updateUrl();
    }),
  );
page
  .querySelectorAll<HTMLInputElement>('[data-point-style-choice] input[name="point-style"]')
  .forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      pointStyle = input.value;
      syncPointStyleText();
      points.state.pointSpreadZoom = -1;
      updatePointSources();
      syncPointStyleLayers();
      applyTheme(true);
      updateUrl();
    }),
  );
filterPanel
  .querySelectorAll<HTMLInputElement>('[data-map-filter] .multi-options input[type="checkbox"]')
  .forEach((input) =>
    input.addEventListener('change', () => {
      const key = input.closest<HTMLElement>('[data-map-filter]')!.dataset
        .mapFilter as (typeof filterKeys)[number];
      filterExplicit[key] = true;
      if (key === 'narrator' || key === 'collector') personFilterExplicit[key] = true;
      selectedFilters[key] = new Set(
        [
          ...input
            .closest<HTMLElement>('.multi-options')!
            .querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'),
        ].map((option) => option.value),
      );
      applyFilters();
    }),
  );
const syncYears = () => {
  if (Number(yearFromInput.value) > Number(yearToInput.value)) {
    if (document.activeElement === yearFromInput) yearToInput.value = yearFromInput.value;
    else yearFromInput.value = yearToInput.value;
  }
  applyFilters();
};
yearFromInput.addEventListener('input', syncYears);
yearToInput.addEventListener('input', syncYears);
includeUndated.addEventListener('change', () => applyFilters());
includeUnknownPlace.addEventListener('change', () => applyFilters());
filterPanel
  .querySelectorAll<HTMLButtonElement>('[data-map-select-all], [data-map-clear-all]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      const filter = button.closest<HTMLElement>('[data-map-filter]')!;
      const key = filter.dataset.mapFilter as (typeof filterKeys)[number];
      const selectAll = button.hasAttribute('data-map-select-all');
      filterExplicit[key] = !selectAll;
      if (key === 'narrator' || key === 'collector') personFilterExplicit[key] = !selectAll;
      selectedFilters[key].clear();
      filter
        .querySelectorAll<HTMLInputElement>('.multi-options input[type="checkbox"]')
        .forEach((option) => (option.checked = selectAll));
      applyFilters();
    }),
  );
filterClear.addEventListener('click', () => {
  for (const key of filterKeys) selectedFilters[key].clear();
  filterKeys.forEach((key) => (filterExplicit[key] = false));
  personFilterKeys.forEach((key) => (personFilterExplicit[key] = false));
  filterPanel
    .querySelectorAll<HTMLInputElement>('[data-map-filter] .multi-options input[type="checkbox"]')
    .forEach((input) => (input.checked = true));
  yearFromInput.value = yearFromInput.min;
  yearToInput.value = yearToInput.max;
  includeUndated.checked = true;
  includeUnknownPlace.checked = true;
  applyFilters();
});
filterPanel.querySelectorAll<HTMLInputElement>('[data-map-filter-search]').forEach((input) =>
  input.addEventListener('input', () => {
    const query = input.value
      .toLocaleLowerCase('no')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    input
      .closest<HTMLElement>('[data-map-filter]')!
      .querySelectorAll<HTMLElement>('.multi-options label')
      .forEach((label) => {
        const value = (label.textContent || '')
          .toLocaleLowerCase('no')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        label.hidden = !value.includes(query);
      });
  }),
);
mobileFilterToggle.addEventListener('click', () => {
  const open = !filterPanel.classList.contains('filters-open');
  filterPanel.classList.toggle('filters-open', open);
  mobileFilterToggle.setAttribute('aria-expanded', String(open));
});
const syncFilterCollapseLabel = () => {
  const collapsed = mapWorkspace.classList.contains('filters-collapsed');
  const label = tr(collapsed ? 'map.expandFilters' : 'map.collapseFilters');
  filterCollapse.setAttribute('aria-label', label);
  filterCollapse.title = label;
  filterCollapse.setAttribute('aria-expanded', String(!collapsed));
};
filterCollapse.addEventListener('click', () => {
  mapWorkspace.classList.toggle('filters-collapsed');
  syncFilterCollapseLabel();
  requestAnimationFrame(() => map.resize());
  window.setTimeout(() => map.resize(), 220);
});
filterCollapse.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  filterCollapse.click();
});
const filterLayoutQuery = matchMedia('(min-width: 851px)');
filterLayoutQuery.addEventListener('change', () => {
  if (!filterLayoutQuery.matches) mapWorkspace.classList.remove('filters-collapsed');
  syncFilterCollapseLabel();
  requestAnimationFrame(() => map.resize());
});
syncFilterCollapseLabel();
const exportSelection = (format: 'csv' | 'geojson' | 'graphml') =>
  downloadMapSelection(format, {
    filteredFeatures,
    filteredUnmappedLegends,
    networkType,
    networkNodes,
    networkEdges,
    mapMode,
    graphCollections,
  });
page
  .querySelectorAll<HTMLButtonElement>('[data-map-export]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      exportSelection(button.dataset.mapExport as 'csv' | 'geojson' | 'graphml'),
    ),
  );
page
  .querySelector<HTMLButtonElement>('[data-map-empty-clear]')!
  .addEventListener('click', () => filterClear.click());
map.on('moveend', () => {
  window.clearTimeout(moveTimer);
  moveTimer = window.setTimeout(() => {
    const pointDetailVisible = legendMapActive() || clusterDetailActive();
    if (pointDetailVisible && Math.abs(map.getZoom() - points.state.pointSpreadZoom) >= 0.2)
      updatePointSources();
    if (points.state.clusterDetailRendered !== clusterDetailActive()) {
      points.state.clusterDetailRendered = clusterDetailActive();
      applyTheme(true);
    }
    syncPointStyleLayers();
    syncControls();
    updateCount();
    updateUrl();
  }, 120);
});
document.addEventListener('click', (event) => {
  if (layerMenu.open && !layerMenu.contains(event.target as Node)) layerMenu.open = false;
  if (basemapMenu.open && !basemapMenu.contains(event.target as Node)) basemapMenu.open = false;
  filterPanel.querySelectorAll<HTMLDetailsElement>('[data-map-filter][open]').forEach((details) => {
    if (!details.contains(event.target as Node)) details.open = false;
  });
  networkToolbar
    .querySelectorAll<HTMLDetailsElement>('[data-network-choice][open]')
    .forEach((details) => {
      if (!details.contains(event.target as Node)) details.open = false;
    });
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    layerMenu.open = false;
    basemapMenu.open = false;
    filterPanel
      .querySelectorAll<HTMLDetailsElement>('[data-map-filter][open]')
      .forEach((details) => (details.open = false));
    networkToolbar
      .querySelectorAll<HTMLDetailsElement>('[data-network-choice][open]')
      .forEach((details) => (details.open = false));
  }
});
filterPanel.querySelectorAll<HTMLDetailsElement>('[data-map-filter]').forEach((details) =>
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    filterPanel.querySelectorAll<HTMLDetailsElement>('[data-map-filter][open]').forEach((other) => {
      if (other !== details) other.open = false;
    });
  }),
);
new MutationObserver((records) => {
  if (records.some((record) => record.attributeName === 'data-theme')) {
    if (!basemapExplicit) {
      basemapStyle.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'positron';
      syncBasemapMenu();
    }
    applyTheme(basemapExplicit);
  }
}).observe(document.documentElement, { attributes: true });
const translate = () => {
  syncFullscreen();
  const centerMapLabel = tr('map.resetExtent');
  centerMapButton.setAttribute('aria-label', centerMapLabel);
  centerMapButton.title = centerMapLabel;
  syncFilterCollapseLabel();
  filterPanel.querySelectorAll<HTMLElement>('[data-unknown-person-type]').forEach((label) => {
    const key = label.dataset.unknownPersonType as keyof typeof unknownPersonKey;
    label.textContent = tr(unknownPersonKey[key]);
  });
  page.querySelector<HTMLElement>('[data-map-undated-note]')!.textContent = tr('map.undatedNote', {
    count: page.dataset.undatedCount || '0',
    percent: page.dataset.undatedPercent || '0',
  });
  filterPanel
    .querySelectorAll<HTMLElement>('[data-map-filter="translation"] .multi-options label')
    .forEach((label) => {
      const value = label.querySelector<HTMLInputElement>('input')!.value;
      label.querySelector('span')!.textContent = tr(`map.translation.${value}`);
    });
  syncPointStyleText();
  updateCount();
  syncControls();
  syncFilterInterface();
  requestAnimationFrame(syncBasemapMenu);
  const language = document.documentElement.dataset.uiLang;
  filterPanel
    .querySelectorAll<HTMLElement>('[data-theme-no]')
    .forEach(
      (option) =>
        (option.textContent =
          language === 'en' ? option.dataset.themeEn! : option.dataset.themeNo!),
    );
  if (activeNetworkNode && mapMode === 'network') renderNetworkNodePanel(activeNetworkNode);
  else if (selectedId) {
    if ((legendMapActive() || clusterDetailActive()) && selectedPointCenter)
      renderPointPlace(selectedId, selectedPointCenter);
    else {
      const feature = dataset.places.features.find((item) => item.properties.id === selectedId);
      renderPanel(feature?.properties);
    }
  } else if (unmappedSelected) renderUnmapped();
};
window.addEventListener('ui-language-change', translate);
window.addEventListener('resize', updateCount);
heatOutput.value = `${heatInput.value}%`;
radiusOutput.value = heatRadius.value;
requestAnimationFrame(translate);
const locationUncertainty = new Map(
  dataset.places.features.map((place) => [
    place.properties.id,
    place.properties.geography?.mapUncertainty?.kind || 'none',
  ]),
);
const renderUncertainty = installUncertaintyStrokes(
  map,
  () => uncertaintyToggle.checked && mapMode !== 'heatmap',
  (feature) => {
    if (feature.properties.cluster) return Number(feature.properties.uncertainCount || 0) > 0;
    const id =
      feature.properties.placeId || String(feature.properties.id || '').replace(/^place:/, '');
    if (feature.properties.locationUncertain != null)
      return Boolean(feature.properties.locationUncertain);
    return ['area', 'ambiguous'].includes(locationUncertainty.get(id) || 'none');
  },
);
uncertaintyToggle.addEventListener('change', () => {
  page.querySelector<HTMLElement>('[data-uncertainty-key]')!.hidden =
    !uncertaintyToggle.checked || mapMode === 'heatmap';
  renderUncertainty();
  syncUncertaintyButton();
  updateUrl();
});
page.querySelector<HTMLElement>('[data-uncertainty-key]')!.hidden =
  !uncertaintyToggle.checked || mapMode === 'heatmap';
