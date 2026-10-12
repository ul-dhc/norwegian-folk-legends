import type * as maplibregl from 'maplibre-gl';
import type { LegendProperties, MapDataset, LegendFeature, DisplayLegendFeature } from './types';
import type { MapColors } from './palette';
type Options = {
  map: maplibregl.Map;
  dataset: MapDataset;
  mapMode: string;
  pointStyle: string;
  placesSizeBy: string;
  placesSize: HTMLInputElement;
  pointIntensity: HTMLInputElement;
  pointColorBy: string;
  colors: MapColors;
  filteredFeatures: MapDataset['legends']['features'];
  selectedPointCenter: string | null;
  selectedId: string | null;
  pointLinkOpacity: unknown;
  pointBubbleOpacity: unknown;
  pointBubbleStrokeOpacity: unknown;
  renderLegend: (properties: LegendProperties) => void;
  updateUrl: (push?: boolean) => void;
};
// Owns dispersed point geometry, focus links and the point-selection state.
export function createPointLayers(context: Options) {
  let pointSpreadZoom = -1,
    activePointPlace: string | null = null,
    activePointLegend: string | null = null,
    selectedPointLegend: string | null = null;
  let hoveredPointLegendState: string | null = null;
  let hoveredClusterId: number | null = null;
  const clusterDetailZoom = 11.5;
  const legendMapActive = () => context.mapMode === 'points' || context.mapMode === 'places';
  const clusterDetailActive = () =>
    context.mapMode === 'clusters' && context.map.getZoom() >= clusterDetailZoom;
  const bubbleInteractionActive = () =>
    context.mapMode === 'places' ||
    (context.mapMode === 'points' ? context.pointStyle === 'bubbles' : clusterDetailActive());
  const effectivePointStyle = () =>
    context.mapMode === 'places' || clusterDetailActive() ? 'bubbles' : context.pointStyle;
  let clusterDetailRendered = false;
  const placeCircleRadius = (count: number) =>
    ((context.placesSizeBy === 'uniform' ? 6 : Math.min(24, 4 + 2 * (Math.sqrt(count) - 1))) *
      Number(context.placesSize.value)) /
    100;
  const placeAnchorRadii = new Map<string, number>();
  const pointAnchors = new Map<string, [number, number]>(),
    pointDisplayFeatures = new Map<string, DisplayLegendFeature>();
  const setHoveredPointLegendState = (legendId: string | null) => {
    if (hoveredPointLegendState === legendId) return;
    if (hoveredPointLegendState) {
      context.map.setFeatureState(
        { source: 'point-links', id: hoveredPointLegendState },
        { hovered: false },
      );
      context.map.setFeatureState(
        { source: 'legends', id: hoveredPointLegendState },
        { hovered: false },
      );
    }
    hoveredPointLegendState = legendId;
    if (legendId) {
      context.map.setFeatureState({ source: 'point-links', id: legendId }, { hovered: true });
      context.map.setFeatureState({ source: 'legends', id: legendId }, { hovered: true });
    }
  };
  const pointLinkCoordinates = (anchor: [number, number], endpoint: [number, number]) => {
    const startPixel = context.map.project(anchor),
      endPixel = context.map.project(endpoint),
      dx = endPixel.x - startPixel.x,
      dy = endPixel.y - startPixel.y,
      distance = Math.hypot(dx, dy),
      offset =
        context.mapMode === 'places'
          ? (placeAnchorRadii.get(anchor.join(',')) || 4) + 0.5
          : effectivePointStyle() === 'rays'
            ? 4.5
            : 5.5,
      ratio = distance
        ? Math.min(context.mapMode === 'places' ? 0.95 : 0.42, offset / distance)
        : 0;
    return [
      [
        anchor[0] + (endpoint[0] - anchor[0]) * ratio,
        anchor[1] + (endpoint[1] - anchor[1]) * ratio,
      ],
      endpoint,
    ] as [[number, number], [number, number]];
  };
  const nearestPointLegend = (
    event: maplibregl.MapMouseEvent & {
      features?: maplibregl.MapGeoJSONFeature[];
    },
  ) => {
    let nearestId = '',
      nearestDistance = Number.POSITIVE_INFINITY;
    for (const feature of event.features || []) {
      const id = String(feature.properties?.id || ''),
        display = pointDisplayFeatures.get(id),
        anchor = pointAnchors.get(id);
      if (!id || !display || !anchor) continue;
      const start = context.map.project(anchor),
        end = context.map.project(display.geometry.coordinates),
        dx = end.x - start.x,
        dy = end.y - start.y,
        lengthSquared = dx * dx + dy * dy,
        position = lengthSquared
          ? Math.max(
              0,
              Math.min(
                1,
                ((event.point.x - start.x) * dx + (event.point.y - start.y) * dy) / lengthSquared,
              ),
            )
          : 0,
        distance = Math.hypot(
          event.point.x - (start.x + position * dx),
          event.point.y - (start.y + position * dy),
        );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = id;
      }
    }
    return nearestId;
  };
  const pointCategoryValue = (properties: LegendProperties) =>
    String(
      context.pointColorBy === 'theme'
        ? properties.themeNo
        : context.pointColorBy === 'narrator'
          ? properties.narrator
          : properties.collector,
    ).trim();
  const pointCategoryIndex = (properties: LegendProperties) => {
    if (context.pointColorBy === 'single') return 0;
    const value = pointCategoryValue(properties);
    if (!value) return context.colors.category.length;
    const hash = [...value].reduce(
      (total, character) => ((total << 5) - total + character.charCodeAt(0)) | 0,
      0,
    );
    return Math.abs(hash) % context.colors.category.length;
  };
  const categoryColor = (properties: LegendProperties) =>
    context.pointColorBy === 'single'
      ? context.colors.green
      : pointCategoryIndex(properties) === context.colors.category.length
        ? context.colors.categoryNeutral
        : context.colors.category[pointCategoryIndex(properties)];
  const canonicalPointCoordinates = new Map(
    context.dataset.places.features.map((feature) => [
      feature.properties.id,
      feature.geometry.coordinates,
    ]),
  );
  const colocatedPlaces = new Map<string, typeof context.dataset.places.features>();
  for (const feature of context.dataset.places.features) {
    const key = feature.geometry.coordinates.join(',');
    const group = colocatedPlaces.get(key) || [];
    group.push(feature);
    colocatedPlaces.set(key, group);
  }
  const placesAtCoordinates = (placeId: string) => {
    const coordinates = canonicalPointCoordinates.get(placeId);
    return coordinates ? colocatedPlaces.get(coordinates.join(',')) || [] : [];
  };
  const pointGroupCoordinates = (feature: (typeof context.dataset.legends.features)[number]) => {
    const coordinates = feature.geometry.coordinates,
      canonical = canonicalPointCoordinates.get(feature.properties.placeId);
    return canonical &&
      Math.abs(coordinates[0] - canonical[0]) < 0.0001 &&
      Math.abs(coordinates[1] - canonical[1]) < 0.0001
      ? canonical
      : coordinates;
  };
  const updatePointSources = () => {
    const legendSource = context.map.getSource('legends') as maplibregl.GeoJSONSource | undefined,
      placeSource = context.map.getSource('point-places') as maplibregl.GeoJSONSource | undefined,
      linkSource = context.map.getSource('point-links') as maplibregl.GeoJSONSource | undefined;
    if (!legendSource || !placeSource || !linkSource) return;
    const zoom = context.map.getZoom(),
      displayStyle = effectivePointStyle(),
      overviewSpacing = Math.max(0, Math.min(1.6, (zoom - 6) * 0.35)),
      detailSpacing = Math.max(0, zoom - 9) * 0.85,
      spacing = 1.1 + overviewSpacing + detailSpacing,
      rayLength = displayStyle === 'rays' ? 1.05 + Number(context.pointIntensity.value) / 360 : 1,
      groups = new Map<string, LegendFeature[]>();
    context.filteredFeatures.forEach((feature) => {
      const [longitude, latitude] = pointGroupCoordinates(feature),
        key = [longitude, latitude].join(',');
      const group = groups.get(key) || [];
      group.push(feature);
      groups.set(key, group);
    });
    const features: DisplayLegendFeature[] = [],
      centers: any[] = [],
      goldenAngle = Math.PI * (3 - Math.sqrt(5));
    pointAnchors.clear();
    placeAnchorRadii.clear();
    pointDisplayFeatures.clear();
    groups.forEach((group, key) => {
      group.sort(
        (first, second) =>
          pointCategoryIndex(first.properties) - pointCategoryIndex(second.properties) ||
          pointCategoryValue(first.properties).localeCompare(
            pointCategoryValue(second.properties),
            'no',
          ) ||
          String(first.properties.id).localeCompare(String(second.properties.id)),
      );
      const [longitude, latitude] = pointGroupCoordinates(group[0]),
        latitudeRadians = (latitude * Math.PI) / 180,
        metersPerPixel = (156543.03392 * Math.cos(latitudeRadians)) / 2 ** zoom,
        placements = group
          .map((_, index) => ({
            radiusIndex: index,
            angle: index * goldenAngle,
          }))
          .sort((first, second) => {
            const normalizedFirst = ((first.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
              normalizedSecond = ((second.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            return normalizedFirst - normalizedSecond;
          });
      placeAnchorRadii.set([longitude, latitude].join(','), placeCircleRadius(group.length));
      group.forEach((feature, index) => {
        const placement =
            context.pointColorBy === 'single'
              ? { radiusIndex: index, angle: index * goldenAngle }
              : placements[index],
          radiusPixels =
            ((context.mapMode === 'places'
              ? Math.max(9.5, placeCircleRadius(group.length) + 6)
              : displayStyle === 'rays'
                ? 8.5
                : 9.5) +
              spacing * Math.sqrt(placement.radiusIndex + 1)) *
            rayLength,
          radiusMeters = radiusPixels * metersPerPixel,
          angle = placement.angle,
          latitudeOffset = (Math.sin(angle) * radiusMeters) / 111320,
          longitudeOffset =
            (Math.cos(angle) * radiusMeters) / Math.max(111320 * Math.cos(latitudeRadians), 1);
        const displayFeature: DisplayLegendFeature = {
          ...feature,
          geometry: {
            type: 'Point',
            coordinates: [longitude + longitudeOffset, latitude + latitudeOffset],
          },
          properties: {
            ...feature.properties,
            visuallyDispersed: true,
            placeCount: group.length,
            centerKey: key,
            categoryColor: categoryColor(feature.properties),
          },
        };
        features.push(displayFeature);
        pointAnchors.set(feature.properties.id, [longitude, latitude]);
        pointDisplayFeatures.set(feature.properties.id, displayFeature);
      });
      const categoryCounts = new Map<
        string,
        {
          record: LegendProperties;
          count: number;
        }
      >();
      for (const feature of group) {
        const value = pointCategoryValue(feature.properties);
        if (!value) continue;
        const item = categoryCounts.get(value) || { record: feature.properties, count: 0 };
        item.count++;
        categoryCounts.set(value, item);
      }
      const dominant = [...categoryCounts].sort(
        (a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], 'no'),
      )[0]?.[1].record;
      const placeColor =
        context.pointColorBy === 'single'
          ? context.colors.green
          : dominant
            ? categoryColor(dominant)
            : context.colors.categoryNeutral;
      centers.push({
        type: 'Feature',
        id: `${group[0].properties.placeId}-${longitude}-${latitude}`,
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
        properties: {
          placeId: group[0].properties.placeId,
          centerKey: key,
          placeName: group[0].properties.placeName,
          placeColor,
          locationUncertain: group.some(
            (feature) => feature.properties.locationUncertain === 1,
          ),
          count: group.length,
          radius: 11 + spacing * Math.sqrt(group.length),
        },
      });
    });
    legendSource.setData({ type: 'FeatureCollection', features } as any);
    placeSource.setData({ type: 'FeatureCollection', features: centers } as any);
    const links = features
      .map((feature) => {
        const anchor = pointAnchors.get(feature.properties.id);
        if (!anchor || !feature.properties.visuallyDispersed) return null;
        return {
          type: 'Feature',
          id: feature.properties.id,
          geometry: {
            type: 'LineString',
            coordinates: pointLinkCoordinates(anchor, feature.geometry.coordinates),
          },
          properties: {
            id: feature.properties.id,
            placeId: feature.properties.placeId,
            centerKey: feature.properties.centerKey,
            placeCount: feature.properties.placeCount,
            categoryColor: feature.properties.categoryColor,
          },
        };
      })
      .filter(Boolean);
    linkSource.setData({ type: 'FeatureCollection', features: links } as any);
    pointSpreadZoom = zoom;
    requestAnimationFrame(() => {
      if (selectedPointLegend)
        context.map.setFeatureState(
          { source: 'legends', id: selectedPointLegend },
          { selected: true },
        );
      if (hoveredPointLegendState) {
        context.map.setFeatureState(
          { source: 'legends', id: hoveredPointLegendState },
          { hovered: true },
        );
        context.map.setFeatureState(
          { source: 'point-links', id: hoveredPointLegendState },
          { hovered: true },
        );
      }
      if (activePointLegend)
        showPointLegendLink(activePointLegend, activePointLegend === selectedPointLegend);
      else if (activePointPlace)
        showPointLinks(activePointPlace, activePointPlace === context.selectedPointCenter);
    });
  };
  const showPointLinks = (centerKey: string | null, selected = false) => {
    activePointPlace = centerKey;
    activePointLegend = null;
    const source = context.map.getSource('point-focus-links') as
      maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const visibleCenters = new Set(
      (context.mapMode === 'places'
        ? [context.selectedPointCenter]
        : [context.selectedPointCenter, centerKey]
      ).filter(Boolean),
    );
    const lines = visibleCenters.size
      ? [...pointDisplayFeatures.values()]
          .filter((feature) => visibleCenters.has(feature.properties.centerKey))
          .map((feature) => {
            const display = pointDisplayFeatures.get(feature.properties.id),
              anchor = pointAnchors.get(feature.properties.id);
            return display && anchor
              ? {
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: pointLinkCoordinates(anchor, display.geometry.coordinates),
                  },
                  properties: {
                    id: feature.properties.id,
                    categoryColor: display.properties.categoryColor,
                    placeCount: display.properties.placeCount,
                    selected:
                      feature.properties.centerKey === context.selectedPointCenter ||
                      (selected && feature.properties.centerKey === centerKey),
                  },
                }
              : null;
          })
          .filter(Boolean)
      : [];
    source.setData({ type: 'FeatureCollection', features: lines } as any);
  };
  const showPointLegendLink = (legendId: string | null, selected = false) => {
    activePointLegend = legendId;
    activePointPlace = null;
    const source = context.map.getSource('point-focus-links') as
      maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const ids = [...new Set([selectedPointLegend, legendId].filter(Boolean))] as string[],
      selectedPlaceFeatures = context.selectedPointCenter
        ? [...pointDisplayFeatures.values()]
            .filter(
              (feature) =>
                feature.properties.centerKey === context.selectedPointCenter &&
                !ids.includes(feature.properties.id),
            )
            .map((feature) => {
              const anchor = pointAnchors.get(feature.properties.id);
              return anchor
                ? {
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: pointLinkCoordinates(anchor, feature.geometry.coordinates),
                    },
                    properties: {
                      id: feature.properties.id,
                      selected: true,
                      placeCount: feature.properties.placeCount,
                      categoryColor: feature.properties.categoryColor,
                    },
                  }
                : null;
            })
            .filter(Boolean)
        : [],
      features = [
        ...selectedPlaceFeatures,
        ...ids
          .map((id) => {
            const display = pointDisplayFeatures.get(id),
              anchor = pointAnchors.get(id);
            if (!display || !anchor) return null;
            const isSelected = id === selectedPointLegend || selected,
              isHovered = id === legendId && id !== selectedPointLegend,
              endpoint = display.geometry.coordinates,
              extension = isHovered ? 1.15 : 1,
              extendedEndpoint = [
                anchor[0] + (endpoint[0] - anchor[0]) * extension,
                anchor[1] + (endpoint[1] - anchor[1]) * extension,
              ];
            return {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: pointLinkCoordinates(anchor, extendedEndpoint as [number, number]),
              },
              properties: {
                id,
                selected: isSelected,
                hovered: isHovered,
                placeCount: display.properties.placeCount,
                categoryColor: display.properties.categoryColor,
              },
            };
          })
          .filter(Boolean),
      ];
    source.setData({ type: 'FeatureCollection', features } as any);
  };
  const selectPointLegend = (legendId: string | null) => {
    if (selectedPointLegend)
      context.map.setFeatureState(
        { source: 'legends', id: selectedPointLegend },
        { selected: false },
      );
    selectedPointLegend = legendId;
    if (legendId)
      context.map.setFeatureState({ source: 'legends', id: legendId }, { selected: true });
    showPointLegendLink(legendId, true);
  };
  const placesRadiusExpression = (): maplibregl.ExpressionSpecification => [
    '*',
    context.placesSizeBy === 'uniform'
      ? 6
      : ['min', 24, ['+', 4, ['*', 2, ['-', ['sqrt', ['get', 'count']], 1]]]],
    Number(context.placesSize.value) / 100,
  ];
  const syncPlaceExpansion = () => {
    const filter =
      context.mapMode === 'places'
        ? ['==', ['get', 'centerKey'], context.selectedPointCenter || '']
        : null;
    for (const id of [
      'points',
      'points-hit',
      'point-end-bubbles',
      'point-links',
      'point-links-hit',
      'point-place-containers',
    ])
      if (context.map.getLayer(id)) context.map.setFilter(id, filter as any);
  };
  const updatePointCenterSelection = () => {
    syncPlaceExpansion();
    if (!context.map.getLayer('point-place-centers')) return;
    const selected = context.selectedPointCenter || '',
      displayStyle = effectivePointStyle(),
      detailActive = clusterDetailActive();
    const focusedOpacity = (base: unknown, dimmed: number) =>
      context.selectedPointCenter
        ? [
            'case',
            [
              'any',
              ['boolean', ['feature-state', 'hovered'], false],
              ['boolean', ['feature-state', 'selected'], false],
            ],
            base,
            ['==', ['get', 'centerKey'], selected],
            base,
            ['*', base, dimmed],
          ]
        : base;
    context.map.setPaintProperty(
      'point-links',
      'line-opacity',
      focusedOpacity(context.pointLinkOpacity, displayStyle === 'rays' ? 0.24 : 0.3) as never,
    );
    context.map.setPaintProperty(
      'point-end-bubbles',
      'circle-opacity',
      focusedOpacity(context.pointBubbleOpacity, 0.3) as never,
    );
    context.map.setPaintProperty(
      'point-end-bubbles',
      'circle-stroke-opacity',
      focusedOpacity(context.pointBubbleStrokeOpacity, 0.34) as never,
    );
    const strength = Number(context.pointIntensity.value) / 100;
    const scale = (opacity: number) => Math.min(1, opacity * strength);
    // The place anchor responds to intensity, with a visibility boost over its records.
    const mainStroke = (opacity: number) => Math.min(1, 0.16 + opacity * strength);
    context.map.setPaintProperty(
      'point-place-containers',
      'circle-opacity',
      legendMapActive()
        ? 0
        : context.selectedPointCenter
          ? [
              'case',
              ['==', ['get', 'centerKey'], selected],
              displayStyle === 'rays' ? 0 : scale(context.colors.dark ? 0.018 : 0.008),
              displayStyle === 'rays' ? 0 : scale(context.colors.dark ? 0.006 : 0.003),
            ]
          : displayStyle === 'rays'
            ? 0
            : scale(context.colors.dark ? 0.018 : 0.008),
    );
    context.map.setPaintProperty(
      'point-place-containers',
      'circle-stroke-opacity',
      context.selectedPointCenter
        ? [
            'case',
            ['==', ['get', 'centerKey'], selected],
            displayStyle === 'rays' ? 0 : scale(context.colors.dark ? 0.16 : 0.12),
            displayStyle === 'rays' ? 0 : scale(context.colors.dark ? 0.05 : 0.04),
          ]
        : displayStyle === 'rays'
          ? 0
          : scale(context.colors.dark ? 0.16 : 0.12),
    );
    context.map.setPaintProperty(
      'point-place-centers',
      'circle-stroke-color',
      context.mapMode === 'places' ? ['get', 'placeColor'] : context.colors.green,
    );
    context.map.setPaintProperty('point-place-centers', 'circle-color', [
      'case',
      ['==', ['get', 'centerKey'], selected],
      context.colors.green,
      detailActive ? context.colors.green : context.colors.land,
    ]);
    context.map.setPaintProperty(
      'point-place-centers',
      'circle-opacity',
      detailActive
        ? [
            'case',
            ['==', ['get', 'centerKey'], selected],
            scale(context.colors.dark ? 0.42 : 0.34),
            context.selectedPointCenter
              ? scale(context.colors.dark ? 0.16 : 0.12)
              : scale(context.colors.dark ? 0.22 : 0.16),
          ]
        : 0,
    );
    context.map.setPaintProperty(
      'point-place-centers',
      'circle-stroke-opacity',
      context.mapMode === 'places'
        ? mainStroke(context.colors.dark ? 0.76 : 0.82)
        : detailActive
          ? [
              'case',
              ['==', ['get', 'centerKey'], selected],
              mainStroke(1),
              context.selectedPointCenter ? mainStroke(0.46) : mainStroke(0.84),
            ]
          : [
              'case',
              ['==', ['get', 'centerKey'], selected],
              mainStroke(0.95),
              context.selectedPointCenter
                ? mainStroke(context.colors.dark ? 0.24 : 0.28)
                : mainStroke(context.colors.dark ? 0.76 : 0.82),
            ],
    );
    context.map.setPaintProperty(
      'point-place-center-halo',
      'circle-opacity',
      legendMapActive()
        ? 0
        : [
            'case',
            ['==', ['get', 'centerKey'], selected],
            scale(context.colors.dark ? 0.13 : 0.1),
            0,
          ],
    );
    context.map.setPaintProperty(
      'point-place-centers',
      'circle-radius',
      context.mapMode === 'places'
        ? placesRadiusExpression()
        : detailActive
          ? ['interpolate', ['linear'], ['get', 'count'], 1, 11, 10, 12.5, 50, 14.5, 150, 17]
          : displayStyle === 'rays'
            ? ['interpolate', ['linear'], ['zoom'], 5, 3.2, 10, 4.6]
            : ['interpolate', ['linear'], ['zoom'], 5, 4.4, 10, 6.2],
    );
    if (context.map.getLayer('point-place-hit'))
      context.map.setPaintProperty(
        'point-place-hit',
        'circle-radius',
        context.mapMode === 'places' ? ['max', 10, placesRadiusExpression()] : 10,
      );
    if (context.map.getLayer('point-place-selection-ring'))
      context.map.setPaintProperty(
        'point-place-selection-ring',
        'circle-opacity',
        legendMapActive() ? 0 : 0.08,
      );
    if (context.map.getLayer('point-place-selection-ring'))
      context.map.setPaintProperty(
        'point-place-selection-ring',
        'circle-radius',
        context.mapMode === 'places'
          ? ['+', placesRadiusExpression(), 3]
          : ['interpolate', ['linear'], ['zoom'], 5, 8, 10, 11],
      );
    if (context.map.getLayer('point-place-selection-ring'))
      context.map.setFilter('point-place-selection-ring', ['==', ['get', 'centerKey'], selected]);
    if (context.map.getLayer('point-place-selection-label'))
      context.map.setFilter('point-place-selection-label', ['==', ['get', 'centerKey'], selected]);
  };

  return {
    legendMapActive,
    clusterDetailActive,
    bubbleInteractionActive,
    effectivePointStyle,
    placeCircleRadius,
    setHoveredPointLegendState,
    pointLinkCoordinates,
    nearestPointLegend,
    pointCategoryValue,
    pointCategoryIndex,
    categoryColor,
    placesAtCoordinates,
    pointGroupCoordinates,
    updatePointSources,
    showPointLinks,
    showPointLegendLink,
    selectPointLegend,
    placesRadiusExpression,
    syncPlaceExpansion,
    updatePointCenterSelection,
    placeAnchorRadii,
    pointAnchors,
    pointDisplayFeatures,
    state: {
      get pointSpreadZoom() {
        return pointSpreadZoom;
      },
      set pointSpreadZoom(value: typeof pointSpreadZoom) {
        pointSpreadZoom = value;
      },
      get activePointPlace() {
        return activePointPlace;
      },
      set activePointPlace(value: typeof activePointPlace) {
        activePointPlace = value;
      },
      get activePointLegend() {
        return activePointLegend;
      },
      set activePointLegend(value: typeof activePointLegend) {
        activePointLegend = value;
      },
      get selectedPointLegend() {
        return selectedPointLegend;
      },
      set selectedPointLegend(value: typeof selectedPointLegend) {
        selectedPointLegend = value;
      },
      get hoveredPointLegendState() {
        return hoveredPointLegendState;
      },
      set hoveredPointLegendState(value: typeof hoveredPointLegendState) {
        hoveredPointLegendState = value;
      },
      get hoveredClusterId() {
        return hoveredClusterId;
      },
      set hoveredClusterId(value: typeof hoveredClusterId) {
        hoveredClusterId = value;
      },
      get clusterDetailRendered() {
        return clusterDetailRendered;
      },
      set clusterDetailRendered(value: typeof clusterDetailRendered) {
        clusterDetailRendered = value;
      },
    },
  };
}
