import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapColors } from './palette';
import type { NetworkNode } from './types';
import { css, mix } from './palette';
export type ThemeContext = {
  colors: MapColors;
  themeColors: () => MapColors;
  mapStage: HTMLElement;
  page: HTMLElement;
  densityPalette: string;
  map: MapLibreMap;
  effectivePointStyle: () => string;
  pointIntensity: HTMLInputElement;
  pointBubbleOpacity: unknown;
  pointBubbleStrokeOpacity: unknown;
  pointLinkOpacity: unknown;
  pointColorBy: string;
  updatePointCenterSelection: () => void;
  networkNodes: NetworkNode[];
  recalculateNetwork: () => void;
  points: { state: { pointSpreadZoom: number } };
  updatePointSources: () => void;
  syncPointStyleLayers: () => void;
  applyBasemapStyle: () => void;
};
// Updates the existing layer styles without changing coordinates or selections.
export function applyMapTheme(context: ThemeContext, preserveMapPalette = false) {
  if (!preserveMapPalette) context.colors = context.themeColors();
  context.mapStage.dataset.mapTheme = context.colors.dark ? 'dark' : 'light';
  context.page.style.setProperty('--map-palette-color', context.colors.green);
  context.page.style.setProperty('--map-density-color', context.colors.density);
  context.page.style.setProperty(
    '--map-density-ramp',
    context.densityPalette === 'spectrum'
      ? `linear-gradient(90deg, ${mix(context.colors.spectrum[0], 0.25)}, ${context.colors.spectrum[0]}, ${context.colors.spectrum[1]}, ${context.colors.spectrum[2]})`
      : `linear-gradient(90deg, transparent, ${mix(context.colors.density, 0.18)}, ${mix(context.colors.density, 0.45)}, ${mix(context.colors.density, 0.72)}, ${mix(context.colors.density, 0.9)}, ${context.colors.density})`,
  );
  context.page.style.setProperty(
    '--map-palette-spectrum',
    `linear-gradient(90deg, ${context.colors.spectrum.join(',')})`,
  );
  context.page.style.setProperty(
    '--map-palette-coral',
    css(`--map-data-coral-${context.colors.dark ? 'dark' : 'light'}`),
  );
  context.page.style.setProperty(
    '--map-palette-green',
    css(context.colors.dark ? '--map-data-green-dark' : '--map-data-green-light'),
  );
  context.page.style.setProperty(
    '--map-palette-blue',
    css(context.colors.dark ? '--map-data-blue-dark' : '--map-data-blue-light'),
  );
  context.page.style.setProperty(
    '--map-palette-yellow',
    css(context.colors.dark ? '--map-data-yellow-dark' : '--map-data-yellow-light'),
  );
  const paint = (id: string, property: Parameters<MapLibreMap['setPaintProperty']>[1], value: unknown) =>
    context.map.getLayer(id) && context.map.setPaintProperty(id, property, value as never);
  const displayStyle = context.effectivePointStyle(),
    pointStrength = Number(context.pointIntensity.value) / 100,
    scalePointOpacity = (value: number | unknown[]) =>
      typeof value === 'number'
        ? Math.min(1, value * pointStrength)
        : ['min', 1, ['*', value, pointStrength]];
  paint('background', 'background-color', context.colors.water);
  paint('land', 'fill-color', context.colors.land);
  paint('coast', 'line-color', context.colors.coast);
  paint('territory-boundaries', 'line-color', context.colors.boundary);
  paint('rivers', 'line-color', context.colors.river);
  paint('lakes', 'fill-color', context.colors.waterFeature);
  paint('city-dots', 'circle-color', context.colors.city);
  paint('city-labels', 'text-color', context.colors.muted);
  paint('city-labels', 'text-halo-color', context.colors.halo);
  paint('place-labels', 'text-color', context.colors.dark ? '#c9d3e3' : '#46566b');
  paint(
    'place-labels',
    'text-halo-color',
    context.colors.dark ? 'rgba(23,29,43,.65)' : 'rgba(252,250,246,.65)',
  );
  const corpusPointColor = ['coalesce', ['get', 'categoryColor'], context.colors.green];
  const corpusLinkColor = ['coalesce', ['get', 'categoryColor'], context.colors.green];
  const clusterColor = context.colors.green;
  paint('cluster-aura', 'circle-color', clusterColor);
  paint('cluster-aura', 'circle-opacity', context.colors.dark ? 0.17 : 0.14);
  paint('cluster-ring', 'circle-color', clusterColor);
  paint('cluster-ring', 'circle-opacity', context.colors.dark ? 0.035 : 0.025);
  paint('cluster-ring', 'circle-stroke-color', clusterColor);
  paint('cluster-ring', 'circle-stroke-opacity', context.colors.dark ? 0.1 : 0.08);
  paint('clusters', 'circle-color', clusterColor);
  paint('clusters', 'circle-opacity', context.colors.dark ? 0.2 : 0.16);
  paint('clusters', 'circle-stroke-color', clusterColor);
  paint('clusters', 'circle-stroke-opacity', context.colors.dark ? 0.82 : 0.76);
  paint('cluster-hover', 'circle-color', clusterColor);
  paint('cluster-hover', 'circle-opacity', context.colors.dark ? 0.2 : 0.16);
  paint('cluster-hover', 'circle-stroke-color', clusterColor);
  paint('cluster-hover', 'circle-stroke-opacity', context.colors.dark ? 0.96 : 0.9);
  paint('cluster-count', 'text-color', context.colors.dark ? '#eef3fb' : '#17243a');
  paint(
    'cluster-count',
    'text-halo-color',
    context.colors.dark ? 'rgba(7,13,28,.72)' : 'rgba(255,255,255,.84)',
  );
  paint('cluster-count', 'text-halo-width', context.colors.dark ? 0.6 : 1.1);
  paint('points', 'circle-color', [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    corpusPointColor,
    context.colors.raised,
  ]);
  paint('points', 'circle-opacity', 0);
  paint('points', 'circle-stroke-color', corpusPointColor);
  paint('points', 'circle-radius', ['interpolate', ['linear'], ['zoom'], 5, 2.3, 8, 3, 11, 4.3]);
  paint('points', 'circle-stroke-opacity', [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    0.98,
    0,
  ]);
  paint('points', 'circle-stroke-width', [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    ['case', ['boolean', ['feature-state', 'selected'], false], 2, 0.9],
    10,
    ['case', ['boolean', ['feature-state', 'selected'], false], 2, 1.2],
  ]);
  paint('point-end-bubbles', 'circle-color', context.colors.land);
  paint('point-end-bubbles', 'circle-radius', [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      3.8,
      ['boolean', ['feature-state', 'selected'], false],
      3.2,
      2,
    ],
    8,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      4.8,
      ['boolean', ['feature-state', 'selected'], false],
      4.2,
      2.8,
    ],
    11,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      6.2,
      ['boolean', ['feature-state', 'selected'], false],
      5.4,
      3.8,
    ],
  ]);
  context.pointBubbleOpacity = 0;
  paint('point-end-bubbles', 'circle-opacity', context.pointBubbleOpacity);
  paint('point-end-bubbles', 'circle-stroke-color', corpusPointColor);
  context.pointBubbleStrokeOpacity = [
    'case',
    [
      'any',
      ['boolean', ['feature-state', 'hovered'], false],
      ['boolean', ['feature-state', 'selected'], false],
    ],
    1,
    scalePointOpacity([
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
    ]),
  ];
  paint('point-end-bubbles', 'circle-stroke-opacity', context.pointBubbleStrokeOpacity);
  const bubbleStrokeScale = Math.min(1.45, 0.75 + pointStrength * 0.25);
  paint('point-end-bubbles', 'circle-stroke-width', [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      2.2,
      ['boolean', ['feature-state', 'selected'], false],
      1.8,
      0.7 * bubbleStrokeScale,
    ],
    10,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      2.2,
      ['boolean', ['feature-state', 'selected'], false],
      1.8,
      bubbleStrokeScale,
    ],
  ]);
  paint('point-place-containers', 'circle-color', context.colors.green);
  paint('point-place-containers', 'circle-stroke-color', context.colors.green);
  paint(
    'point-place-containers',
    'circle-opacity',
    displayStyle === 'rays' ? 0 : context.colors.dark ? 0.018 : 0.008,
  );
  paint(
    'point-place-containers',
    'circle-stroke-opacity',
    displayStyle === 'rays' ? 0 : context.colors.dark ? 0.16 : 0.12,
  );
  paint('point-links', 'line-color', corpusLinkColor);
  context.pointLinkOpacity = [
    'case',
    ['boolean', ['feature-state', 'hovered'], false],
    1,
    scalePointOpacity(
      displayStyle === 'rays'
        ? [
            'interpolate',
            ['linear'],
            ['get', 'placeCount'],
            1,
            context.colors.dark
              ? context.pointColorBy === 'single'
                ? 0.74
                : 0.76
              : context.pointColorBy === 'single'
                ? 0.62
                : 0.7,
            20,
            context.colors.dark
              ? context.pointColorBy === 'single'
                ? 0.56
                : 0.6
              : context.pointColorBy === 'single'
                ? 0.47
                : 0.54,
            200,
            context.colors.dark
              ? context.pointColorBy === 'single'
                ? 0.37
                : 0.42
              : context.pointColorBy === 'single'
                ? 0.32
                : 0.4,
            700,
            context.colors.dark
              ? context.pointColorBy === 'single'
                ? 0.25
                : 0.32
              : context.pointColorBy === 'single'
                ? 0.22
                : 0.31,
          ]
        : [
            'interpolate',
            ['linear'],
            ['get', 'placeCount'],
            1,
            context.colors.dark ? 0.48 : 0.42,
            20,
            context.colors.dark ? 0.38 : 0.34,
            200,
            context.colors.dark ? 0.27 : 0.25,
            700,
            context.colors.dark ? 0.19 : 0.18,
          ],
    ),
  ];
  paint('point-links', 'line-opacity', context.pointLinkOpacity);
  const linkWidthScale = Math.min(1.6, 0.8 + pointStrength * 0.28);
  const linkWidths = displayStyle === 'rays' ? [0.88, 1.08, 1.32] : [0.72, 0.9, 1.08];
  paint('point-links', 'line-width', [
    'interpolate',
    ['linear'],
    ['zoom'],
    5,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      2.25,
      linkWidths[0] * linkWidthScale,
    ],
    9,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      2.25,
      linkWidths[1] * linkWidthScale,
    ],
    12,
    [
      'case',
      ['boolean', ['feature-state', 'hovered'], false],
      2.25,
      linkWidths[2] * linkWidthScale,
    ],
  ]);
  paint(
    'point-links',
    'line-blur',
    displayStyle === 'rays' ? Math.max(0.08, 0.18 - pointStrength * 0.06) : 0,
  );
  paint('point-focus-links', 'line-color', corpusLinkColor);
  paint('point-focus-links', 'line-opacity', [
    'case',
    ['boolean', ['get', 'hovered'], false],
    1,
    ['boolean', ['get', 'selected'], false],
    [
      'min',
      0.72,
      [
        '+',
        0.12,
        scalePointOpacity([
          'interpolate',
          ['linear'],
          ['get', 'placeCount'],
          1,
          context.colors.dark ? 0.72 : 0.66,
          20,
          context.colors.dark ? 0.56 : 0.5,
          100,
          context.colors.dark ? 0.4 : 0.35,
          300,
          context.colors.dark ? 0.26 : 0.23,
        ]),
      ],
    ],
    [
      'interpolate',
      ['linear'],
      ['get', 'placeCount'],
      1,
      context.colors.dark ? 0.64 : 0.58,
      20,
      context.colors.dark ? 0.42 : 0.36,
      100,
      context.colors.dark ? 0.22 : 0.18,
      300,
      context.colors.dark ? 0.14 : 0.12,
    ],
  ]);
  paint('point-focus-links', 'line-width', [
    'case',
    ['boolean', ['get', 'hovered'], false],
    2.4,
    ['boolean', ['get', 'selected'], false],
    ['interpolate', ['linear'], ['get', 'placeCount'], 1, 1.45, 20, 1.25, 100, 1.05, 300, 0.9],
    ['interpolate', ['linear'], ['get', 'placeCount'], 1, 1.2, 20, 0.95, 100, 0.72, 300, 0.6],
  ]);
  paint('point-focus-links', 'line-blur', [
    'case',
    ['boolean', ['get', 'selected'], false],
    0.08,
    0.16,
  ]);
  paint('point-place-centers', 'circle-color', context.colors.land);
  paint('point-place-centers', 'circle-stroke-color', context.colors.green);
  paint('point-place-center-halo', 'circle-color', context.colors.green);
  paint('point-place-selection-ring', 'circle-stroke-color', context.colors.green);
  paint('point-place-selection-label', 'text-color', context.colors.dark ? '#e0e6ef' : '#34465b');
  paint(
    'point-place-selection-label',
    'text-halo-color',
    context.colors.dark ? 'rgba(7,13,28,.9)' : 'rgba(255,255,255,.92)',
  );
  paint('point-place-selection-label', 'text-halo-width', 0.7);
  paint('point-place-selection-label', 'text-halo-blur', 0.3);
  paint('point-place-cluster-count', 'text-color', context.colors.dark ? '#eef8f5' : '#173b37');
  paint(
    'point-place-cluster-count',
    'text-halo-color',
    context.colors.dark ? 'rgba(7,13,28,.86)' : 'rgba(255,255,255,.9)',
  );
  paint('point-place-cluster-count', 'text-halo-width', context.colors.dark ? 1.1 : 1.5);
  context.updatePointCenterSelection();
  paint('network', 'line-color', ['get', 'color']);
  paint('network-halo', 'line-color', ['get', 'color']);
  paint('network-nodes', 'circle-color', ['get', 'color']);
  paint('network-node-labels', 'text-color', context.colors.dark ? '#c9d3e3' : '#46566b');
  paint(
    'network-node-labels',
    'text-halo-color',
    context.colors.dark ? 'rgba(23,29,43,.65)' : 'rgba(252,250,246,.65)',
  );
  paint('unmapped', 'circle-color', context.colors.green);
  paint('unmapped', 'circle-opacity', [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    context.colors.dark ? 0.22 : 0.16,
    ['boolean', ['feature-state', 'hovered'], false],
    context.colors.dark ? 0.17 : 0.12,
    context.colors.dark ? 0.08 : 0.055,
  ]);
  paint('unmapped', 'circle-stroke-color', context.colors.green);
  paint('unmapped', 'circle-stroke-opacity', [
    'case',
    [
      'any',
      ['boolean', ['feature-state', 'selected'], false],
      ['boolean', ['feature-state', 'hovered'], false],
    ],
    0.92,
    context.colors.dark ? 0.5 : 0.58,
  ]);
  paint('unmapped-aura', 'circle-color', context.colors.green);
  paint('unmapped-aura', 'circle-opacity', [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    context.colors.dark ? 0.12 : 0.08,
    ['boolean', ['feature-state', 'hovered'], false],
    context.colors.dark ? 0.09 : 0.06,
    context.colors.dark ? 0.045 : 0.03,
  ]);
  for (let index = 0; index < 12; index += 1) {
    paint(`unmapped-dot-${index}`, 'circle-color', context.colors.green);
    paint(`unmapped-dot-${index}`, 'circle-opacity', [
      'case',
      [
        'any',
        ['boolean', ['feature-state', 'selected'], false],
        ['boolean', ['feature-state', 'hovered'], false],
      ],
      1,
      context.colors.dark ? 0.7 : 0.76,
    ]);
  }
  paint('unmapped-count', 'text-color', context.colors.dark ? '#eef8f5' : '#173b37');
  const heatmapRamp =
    context.densityPalette === 'spectrum'
      ? [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          mix(context.colors.spectrum[0], 0),
          0.04,
          mix(context.colors.spectrum[0], 0.25),
          0.16,
          context.colors.spectrum[0],
          0.4,
          context.colors.spectrum[1],
          0.75,
          context.colors.spectrum[2],
          1,
          context.colors.spectrum[2],
        ]
      : [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          mix(context.colors.density, 0),
          0.04,
          mix(context.colors.density, 0.18),
          0.18,
          mix(context.colors.density, 0.45),
          0.38,
          mix(context.colors.density, 0.72),
          0.65,
          mix(context.colors.density, 0.9),
          1,
          context.colors.density,
        ];
  paint('heatmap', 'heatmap-color', heatmapRamp);
  paint('heatmap', 'heatmap-opacity', [
    'interpolate',
    ['linear'],
    ['zoom'],
    4,
    context.colors.dark ? 0.96 : 0.9,
    11,
    context.colors.dark ? 0.7 : 0.62,
  ]);
  if (context.networkNodes.length) context.recalculateNetwork();
  context.points.state.pointSpreadZoom = -1;
  context.updatePointSources();
  context.syncPointStyleLayers();
  context.applyBasemapStyle();
}
