import * as maplibregl from 'maplibre-gl';
import type { MapDataset, LegendProperties } from './types';
import type { MapColors } from './palette';
import { css } from './palette';
type Options = {
  map: maplibregl.Map;
  base: string;
  dataset: MapDataset;
  filteredUnmappedLegends: LegendProperties[];
  openFreeMapLayers: Array<{ id: string; style: string; labels: boolean }>;
  visible: (name: string) => 'visible' | 'none';
  colors: MapColors;
  heatIntensity: () => unknown[];
  heatRadiusValue: () => unknown[];
  networkBubbleRadius: () => unknown[];
  pointStyle: string;
  params: URLSearchParams;
  selectedId: string | null;
  resetExtent: () => void;
  applyTheme: (preserveMapPalette?: boolean) => void;
  basemapExplicit: boolean;
  setMapMode: (mode: string, save?: boolean) => void;
  mapMode: string;
  applyFilters: (save?: boolean) => void;
  selectPlace: (id: string | null, push?: boolean) => void;
  updateCount: () => void;
  syncControls: () => void;
};
// Register sources and layers once. Theme and filter updates remain in the controller.
export function installMapLayers(context: Options) {
  context.map.on('load', async () => {
    const region = await fetch(`${context.base}data/map/northern-europe.json`).then((response) =>
      response.json(),
    );
    const osmAttribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      addOsmSource = (id: string) =>
        context.map.addSource(id, {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution: osmAttribution,
        });
    addOsmSource('carto-streets');
    const openFreeMapStyles = await Promise.all(
      ['dark', 'fiord', 'positron'].map(async (name) => ({
        name,
        style: (await fetch(`${context.base}data/map/openfreemap-${name}.json`).then((response) =>
          response.json(),
        )) as maplibregl.StyleSpecification,
      })),
    );
    const sharedStyle = openFreeMapStyles[0].style;
    context.map.setGlyphs(sharedStyle.glyphs);
    if (typeof sharedStyle.sprite === 'string') context.map.setSprite(sharedStyle.sprite);
    for (const [id, source] of Object.entries(sharedStyle.sources))
      context.map.addSource(`ofm-${id}`, source);
    context.map.addSource('land', { type: 'geojson', data: region.land });
    context.map.addSource('coast', { type: 'geojson', data: region.coast });
    context.map.addSource('territory-boundaries', { type: 'geojson', data: region.boundaries });
    context.map.addSource('rivers', { type: 'geojson', data: region.rivers });
    context.map.addSource('lakes', { type: 'geojson', data: region.lakes });
    context.map.addSource('cities', { type: 'geojson', data: region.cities });
    context.map.addSource('places', { type: 'geojson', data: context.dataset.places });
    context.map.addSource('legends', {
      type: 'geojson',
      data: context.dataset.legends,
      promoteId: 'id',
    });
    context.map.addSource('point-places', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    context.map.addSource('point-links', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    context.map.addSource('point-focus-links', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    context.map.addSource('legend-clusters', {
      type: 'geojson',
      data: context.dataset.legends,
      cluster: true,
      clusterRadius: 44,
      clusterProperties: { uncertainCount: ['+', ['get', 'locationUncertain']] },
      clusterMaxZoom: 11,
      promoteId: 'id',
    });
    context.map.addSource('network', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    });
    context.map.addSource('network-nodes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    });
    context.map.addSource('unmapped', {
      type: 'geojson',
      promoteId: 'id',
      data: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [3.0, 64.0] },
        properties: { id: 'unmapped', count: context.filteredUnmappedLegends.length },
      },
    });
    context.map.addLayer({
      id: 'carto-streets',
      type: 'raster',
      source: 'carto-streets',
      layout: { visibility: 'none' },
    });
    for (const { name, style } of openFreeMapStyles) {
      for (const layer of style.layers) {
        const id = `ofm-${name}-${layer.id}`,
          labels = layer.type === 'symbol' && Boolean(layer.layout?.['text-field']);
        context.map.addLayer({
          ...layer,
          id,
          ...('source' in layer ? { source: `ofm-${layer.source}` } : {}),
          layout: { ...layer.layout, visibility: 'none' },
        } as maplibregl.LayerSpecification);
        context.openFreeMapLayers.push({ id, style: name, labels });
      }
    }
    context.map.addLayer({
      id: 'land',
      type: 'fill',
      source: 'land',
      layout: { visibility: context.visible('geography') },
      paint: { 'fill-color': context.colors.land, 'fill-opacity': 0.68 },
    });
    context.map.addLayer({
      id: 'coast',
      type: 'line',
      source: 'coast',
      layout: { visibility: context.visible('geography'), 'line-cap': 'round' },
      paint: {
        'line-color': context.colors.coast,
        'line-opacity': 0.28,
        'line-width': 0.55,
      },
    });
    context.map.addLayer({
      id: 'lakes',
      type: 'fill',
      source: 'lakes',
      layout: { visibility: context.visible('geography') },
      paint: { 'fill-color': context.colors.waterFeature, 'fill-opacity': 0.72 },
    });
    context.map.addLayer({
      id: 'rivers',
      type: 'line',
      source: 'rivers',
      minzoom: 4,
      layout: { visibility: context.visible('geography'), 'line-cap': 'round' },
      paint: {
        'line-color': context.colors.river,
        'line-opacity': 0.3,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 9, 0.8],
      },
    });
    context.map.addLayer({
      id: 'territory-boundaries',
      type: 'line',
      source: 'territory-boundaries',
      minzoom: 4,
      layout: { visibility: context.visible('geography'), 'line-cap': 'round' },
      paint: {
        'line-color': context.colors.boundary,
        'line-opacity': 0.32,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 9, 0.7],
        'line-dasharray': [2, 2.5],
      },
    });
    context.map.addLayer({
      id: 'city-dots',
      type: 'circle',
      source: 'cities',
      layout: { visibility: context.visible('labels') },
      paint: {
        'circle-radius': 2.2,
        'circle-color': context.colors.city,
        'circle-opacity': 0.7,
      },
    });
    context.map.addLayer({
      id: 'city-labels',
      type: 'symbol',
      source: 'cities',
      layout: {
        visibility: context.visible('labels'),
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 7, 12],
        'text-offset': [0, 0.8],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': context.colors.muted,
        'text-halo-color': context.colors.halo,
        'text-halo-width': 1.2,
        'text-opacity': 0.76,
      },
    });
    context.map.addLayer({
      id: 'heatmap',
      type: 'heatmap',
      source: 'legends',
      maxzoom: 12,
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': 0.25,
        'heatmap-intensity': context.heatIntensity() as any,
        'heatmap-radius': context.heatRadiusValue() as any,
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 11, 0.38, 12, 0],
      },
    });
    context.map.addLayer({
      id: 'network-halo',
      type: 'line',
      source: 'network',
      layout: { visibility: context.visible('network'), 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': context.colors.green,
        'line-opacity': ['interpolate', ['linear'], ['get', 'strength'], 0.1, 0.025, 0.75, 0.11],
        'line-width': ['interpolate', ['linear'], ['get', 'strength'], 0.1, 2, 0.75, 6],
        'line-blur': 0,
      },
    });
    context.map.addLayer({
      id: 'network',
      type: 'line',
      source: 'network',
      layout: { visibility: context.visible('network'), 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': context.colors.green,
        'line-opacity': ['interpolate', ['linear'], ['get', 'strength'], 0.1, 0.12, 0.75, 0.52],
        'line-width': ['interpolate', ['linear'], ['get', 'strength'], 0.1, 0.65, 0.75, 2.6],
        'line-blur': 0,
      },
    });
    context.map.addLayer({
      id: 'network-nodes',
      type: 'circle',
      source: 'network-nodes',
      layout: { visibility: context.visible('network') },
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': context.networkBubbleRadius() as any,
        'circle-opacity': 0,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': context.colors.dark ? 0.62 : 0.66,
        'circle-stroke-width': 1.55,
      },
    });
    context.map.addLayer({
      id: 'network-node-hit',
      type: 'circle',
      source: 'network-nodes',
      layout: { visibility: context.visible('network') },
      paint: {
        'circle-radius': ['max', 6, context.networkBubbleRadius()] as any,
        'circle-opacity': 0,
      },
    });
    context.map.addLayer({
      id: 'network-node-labels',
      type: 'symbol',
      source: 'network-nodes',
      minzoom: 6,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10.5,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-max-width': 12,
      },
      paint: {
        'text-color': context.colors.dark ? '#c9d3e3' : '#46566b',
        'text-halo-color': context.colors.halo,
        'text-halo-width': 0.6,
        'text-halo-blur': 0.3,
      },
    });
    context.map.addLayer({
      id: 'network-selected-ring',
      type: 'circle',
      source: 'network-nodes',
      filter: ['==', ['get', 'id'], ''],
      layout: { visibility: context.visible('network') },
      paint: {
        'circle-radius': ['+', context.networkBubbleRadius(), 4] as any,
        'circle-opacity': 0,
        'circle-stroke-color': css(`--map-data-yellow-${context.colors.dark ? 'dark' : 'light'}`),
        'circle-stroke-opacity': 1,
        'circle-stroke-width': 2,
      },
    });
    context.map.addLayer({
      id: 'network-selected-label',
      type: 'symbol',
      source: 'network-nodes',
      filter: ['==', ['get', 'id'], ''],
      layout: {
        visibility: context.visible('network'),
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 13,
        'text-offset': [0, -2],
        'text-anchor': 'bottom',
        'text-max-width': 14,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': context.colors.ink,
        'text-halo-color': context.colors.raised,
        'text-halo-width': 2,
        'text-halo-blur': 0,
      },
    });
    const clusterRadius = [
      'step',
      ['get', 'point_count'],
      15,
      10,
      18,
      50,
      22,
      150,
      26,
      500,
      30,
    ] as any;
    context.map.addLayer({
      id: 'cluster-aura',
      type: 'circle',
      source: 'legend-clusters',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': context.colors.dark ? 0.17 : 0.14,
        'circle-radius': ['+', clusterRadius, 17],
        'circle-blur': 0.78,
      },
    });
    context.map.addLayer({
      id: 'cluster-ring',
      type: 'circle',
      source: 'legend-clusters',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': context.colors.dark ? 0.035 : 0.025,
        'circle-radius': ['+', clusterRadius, 4],
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.1 : 0.08,
        'circle-stroke-width': 1,
        'circle-blur': 0.52,
      },
    });
    context.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'legend-clusters',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': context.colors.dark ? 0.2 : 0.16,
        'circle-radius': clusterRadius,
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.82 : 0.76,
        'circle-stroke-width': 1.6,
        'circle-blur': 0,
      },
    });
    context.map.addLayer({
      id: 'cluster-hover',
      type: 'circle',
      source: 'legend-clusters',
      filter: ['all', ['has', 'point_count'], ['==', ['get', 'cluster_id'], -1]],
      layout: { visibility: 'none' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': context.colors.dark ? 0.2 : 0.16,
        'circle-radius': ['+', clusterRadius, 8],
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.96 : 0.9,
        'circle-stroke-width': 2,
        'circle-blur': 0.32,
      },
    });
    context.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'legend-clusters',
      filter: ['has', 'point_count'],
      layout: {
        visibility: 'none',
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': ['step', ['get', 'point_count'], 10, 50, 11, 150, 12],
      },
      paint: {
        'text-color': context.colors.dark ? '#eef3fb' : '#17243a',
        'text-halo-color': context.colors.dark ? 'rgba(7,13,28,.72)' : 'rgba(255,255,255,.84)',
        'text-halo-width': context.colors.dark ? 0.6 : 1.1,
      },
    });
    context.map.addLayer({
      id: 'point-place-containers',
      type: 'circle',
      source: 'point-places',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': context.colors.dark ? 0.018 : 0.008,
        'circle-radius': ['get', 'radius'],
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.16 : 0.12,
        'circle-stroke-width': 0.65,
      },
    });
    context.map.addLayer({
      id: 'point-links',
      type: 'line',
      source: 'point-links',
      layout: { visibility: 'visible', 'line-cap': 'round' },
      paint: {
        'line-color': context.colors.green,
        'line-opacity': context.colors.dark ? 0.28 : 0.24,
        'line-width': 0.6,
      },
    });
    context.map.addLayer({
      id: 'point-links-hit',
      type: 'line',
      source: 'point-links',
      layout: { visibility: 'visible', 'line-cap': 'round' },
      paint: { 'line-color': context.colors.green, 'line-opacity': 0.001, 'line-width': 9 },
    });
    context.map.addLayer({
      id: 'point-focus-links',
      type: 'line',
      source: 'point-focus-links',
      layout: { visibility: 'visible', 'line-cap': 'round' },
      paint: {
        'line-color': context.colors.green,
        'line-opacity': [
          'case',
          ['boolean', ['get', 'selected'], false],
          0.9,
          context.colors.dark ? 0.68 : 0.62,
        ],
        'line-width': ['case', ['boolean', ['get', 'selected'], false], 2.1, 1.2],
      },
    });
    context.map.addLayer({
      id: 'point-end-bubbles',
      type: 'circle',
      source: 'legends',
      layout: { visibility: context.pointStyle === 'bubbles' ? 'visible' : 'none' },
      paint: {
        'circle-color': context.colors.land,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 8, 2.8, 11, 3.8],
        'circle-opacity': 0,
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'placeCount'],
          1,
          context.colors.dark ? 0.82 : 0.78,
          20,
          context.colors.dark ? 0.76 : 0.72,
          200,
          context.colors.dark ? 0.68 : 0.64,
          700,
          context.colors.dark ? 0.58 : 0.54,
        ],
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 10, 1],
      },
    });
    context.map.addLayer({
      id: 'points',
      type: 'circle',
      source: 'legends',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          context.colors.green,
          context.colors.raised,
        ],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 1.35, 8, 2.1, 11, 3.8],
        'circle-opacity': 0,
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.98,
          0,
        ],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0.65],
          10,
          ['case', ['boolean', ['feature-state', 'selected'], false], 2, 1],
        ],
      },
    });
    context.map.addLayer({
      id: 'points-hit',
      type: 'circle',
      source: 'legends',
      layout: { visibility: context.pointStyle === 'bubbles' ? 'visible' : 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 3.5, 10, 6],
        'circle-opacity': 0.001,
      },
    });
    context.map.addLayer({
      id: 'point-place-center-halo',
      type: 'circle',
      source: 'point-places',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': context.colors.green,
        'circle-opacity': 0,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 7.5, 10, 10],
        'circle-blur': 0.55,
      },
    });
    context.map.addLayer({
      id: 'point-place-centers',
      type: 'circle',
      source: 'point-places',
      layout: { visibility: 'visible' },
      paint: {
        'circle-color': context.colors.raised,
        'circle-opacity': 0,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4.4, 10, 6.2],
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.76 : 0.82,
        'circle-stroke-width': 1.55,
      },
    });
    context.map.addLayer({
      id: 'point-place-selection-ring',
      type: 'circle',
      source: 'point-places',
      filter: ['==', ['get', 'centerKey'], ''],
      layout: { visibility: 'visible' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 11],
        'circle-color': context.colors.land,
        'circle-opacity': 0.08,
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': 0.88,
        'circle-stroke-width': 1.8,
      },
    });
    context.map.addLayer({
      id: 'point-place-cluster-count',
      type: 'symbol',
      source: 'point-places',
      layout: {
        visibility: 'none',
        'text-field': ['to-string', ['get', 'count']],
        'text-size': ['interpolate', ['linear'], ['get', 'count'], 1, 11, 10, 12, 50, 13, 150, 14],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': context.colors.dark ? '#eef8f5' : '#173b37',
        'text-halo-color': context.colors.dark ? 'rgba(7,13,28,.86)' : 'rgba(255,255,255,.9)',
        'text-halo-width': context.colors.dark ? 1.1 : 1.5,
      },
    });
    context.map.addLayer({
      id: 'point-place-selection-label',
      type: 'symbol',
      source: 'point-places',
      filter: ['==', ['get', 'centerKey'], ''],
      layout: {
        visibility: 'visible',
        'text-field': ['get', 'placeName'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-anchor': 'bottom',
        'text-offset': [0, -1.55],
        'text-letter-spacing': 0.015,
        'text-padding': 4,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': context.colors.dark ? '#e0e6ef' : '#34465b',
        'text-halo-color': context.colors.dark ? 'rgba(7,13,28,.9)' : 'rgba(255,255,255,.92)',
        'text-halo-width': 0.7,
        'text-halo-blur': 0.3,
      },
    });
    context.map.addLayer({
      id: 'point-place-hit',
      type: 'circle',
      source: 'point-places',
      layout: { visibility: 'visible' },
      paint: {
        'circle-radius': 10,
        'circle-opacity': 0.001,
      },
    });
    context.map.addLayer({
      id: 'place-labels',
      type: 'symbol',
      source: 'places',
      minzoom: 8.4,
      layout: {
        visibility: context.visible('labels'),
        'text-field': ['get', 'name'],
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-font': ['Noto Sans Regular'],
        'text-size': 10.5,
        'text-letter-spacing': 0.025,
        'text-max-width': 9,
      },
      paint: {
        'text-color': context.colors.dark ? '#c9d3e3' : '#46566b',
        'text-halo-color': context.colors.dark ? 'rgba(23,29,43,.65)' : 'rgba(252,250,246,.65)',
        'text-halo-width': 0.6,
        'text-halo-blur': 0.3,
      },
    });
    context.map.addLayer({
      id: 'unmapped-aura',
      type: 'circle',
      source: 'unmapped',
      layout: { visibility: context.visible('unmapped') },
      paint: {
        'circle-color': context.colors.green,
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          31,
          ['boolean', ['feature-state', 'hovered'], false],
          29,
          27,
        ],
        'circle-opacity': context.colors.dark ? 0.045 : 0.03,
        'circle-blur': 0.72,
      },
    });
    context.map.addLayer({
      id: 'unmapped',
      type: 'circle',
      source: 'unmapped',
      layout: { visibility: context.visible('unmapped') },
      paint: {
        'circle-color': context.colors.green,
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          21,
          ['boolean', ['feature-state', 'hovered'], false],
          20,
          18,
        ],
        'circle-opacity': context.colors.dark ? 0.08 : 0.055,
        'circle-stroke-color': context.colors.green,
        'circle-stroke-opacity': context.colors.dark ? 0.5 : 0.58,
        'circle-stroke-width': [
          'case',
          [
            'any',
            ['boolean', ['feature-state', 'selected'], false],
            ['boolean', ['feature-state', 'hovered'], false],
          ],
          2.2,
          1.4,
        ],
        'circle-blur': 0,
      },
    });
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      context.map.addLayer({
        id: `unmapped-dot-${index}`,
        type: 'circle',
        source: 'unmapped',
        layout: { visibility: context.visible('unmapped') },
        paint: {
          'circle-color': context.colors.green,
          'circle-radius': [
            'case',
            [
              'any',
              ['boolean', ['feature-state', 'selected'], false],
              ['boolean', ['feature-state', 'hovered'], false],
            ],
            1.7,
            1.35,
          ],
          'circle-opacity': context.colors.dark ? 0.7 : 0.76,
          'circle-translate': [Math.cos(angle) * 24, Math.sin(angle) * 24],
          'circle-translate-anchor': 'viewport',
        },
      });
    }
    context.map.addLayer({
      id: 'unmapped-count',
      type: 'symbol',
      source: 'unmapped',
      layout: {
        visibility: context.visible('unmapped'),
        'text-field': ['get', 'count'],
        'text-size': 11,
      },
      paint: { 'text-color': context.colors.ink },
    });
    if (!context.params.has('lng') && !context.params.has('lat') && !context.selectedId)
      context.resetExtent();
    context.applyTheme(context.basemapExplicit);
    context.setMapMode(context.mapMode, false);
    context.applyFilters(false);
    if (context.selectedId) context.selectPlace(context.selectedId);
    context.updateCount();
    context.syncControls();
  });
}
