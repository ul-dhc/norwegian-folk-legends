import type { MapDataset, LegendProperties, NetworkNode, NetworkEdge } from './types';
export type ExportContext = {
  filteredFeatures: MapDataset['legends']['features'];
  filteredUnmappedLegends: LegendProperties[];
  networkType: { value: string };
  networkNodes: NetworkNode[];
  networkEdges: NetworkEdge[];
  mapMode: string;
  graphCollections: () => { nodes: unknown; edges: unknown };
};
export function mapExportData(format: 'csv' | 'geojson' | 'graphml', context: ExportContext) {
  const rows = [
    ...context.filteredFeatures.map((feature) => feature.properties),
    ...context.filteredUnmappedLegends,
  ];
  const csv = [
    'id,place,year,ml_category,narrator,collector,subgenre,county,genre,translation',
    ...rows.map((row) =>
      [
        row.id,
        row.placeName,
        row.year || '',
        row.themeNo,
        row.narrator,
        row.collector,
        row.volume,
        row.county,
        row.genre,
        row.translation,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    ),
  ].join('\n');
  const xml = (value: unknown) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const relationshipField = context.networkType.value === 'collectors' ? 'collectors' : 'themes';
  const graphml = `<?xml version="1.0" encoding="UTF-8"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="relationship" for="graph" attr.name="relationship_type" attr.type="string"/><key id="shared_ids" for="edge" attr.name="shared_metadata_ids" attr.type="string"/><key id="connections" for="node" attr.name="connection_count" attr.type="int"/><key id="name" for="node" attr.name="name" attr.type="string"/><key id="latitude" for="node" attr.name="latitude" attr.type="double"/><key id="longitude" for="node" attr.name="longitude" attr.type="double"/><key id="records" for="node" attr.name="record_count" attr.type="int"/><key id="theme" for="node" attr.name="dominant_theme" attr.type="string"/><key id="themes" for="node" attr.name="theme_count" attr.type="int"/><key id="kind" for="node" attr.name="entity_type" attr.type="string"/><key id="weight" for="edge" attr.name="record_count" attr.type="int"/><key id="ids" for="all" attr.name="legend_ids" attr.type="string"/><key id="shared" for="edge" attr.name="shared_${relationshipField}" attr.type="int"/><key id="strongest" for="edge" attr.name="strongest_shared_${relationshipField}" attr.type="string"/><graph id="norske-sagn" edgedefault="undirected"><data key="relationship">${xml(context.networkType.value)}</data>${context.networkNodes.map((node) => `<node id="${xml(node.id)}"><data key="name">${xml(node.name)}</data><data key="latitude">${node.coordinates[1]}</data><data key="longitude">${node.coordinates[0]}</data><data key="records">${node.count}</data><data key="connections">${node.connectionCount}</data><data key="theme">${xml(node.dominantTheme)}</data><data key="themes">${node.plotCount}</data><data key="kind">${xml(node.kind || 'place')}</data><data key="ids">${xml(node.legendIds.join(','))}</data></node>`).join('')}${context.networkEdges.map((edge) => `<edge id="${xml(edge.id)}" source="${xml(edge.fromId)}" target="${xml(edge.toId)}"><data key="weight">${edge.count || 0}</data><data key="ids">${xml((edge.legendIds || []).join(','))}</data><data key="shared">${edge.sharedCount}</data><data key="shared_ids">${xml(edge.strongest.map((item) => item.key || item.plot).join(','))}</data><data key="strongest">${xml(edge.strongest.map((item) => item.plot).join(' · '))}</data></edge>`).join('')}</graph></graphml>`;
  const content =
    format === 'csv'
      ? csv
      : format === 'graphml'
        ? graphml
        : JSON.stringify(
            context.mapMode === 'network'
              ? {
                  relationshipType: context.networkType.value,
                  nodes: context.graphCollections().nodes,
                  edges: context.graphCollections().edges,
                }
              : {
                  type: 'FeatureCollection',
                  features: [
                    ...context.filteredFeatures,
                    ...context.filteredUnmappedLegends.map((properties) => ({
                      type: 'Feature',
                      geometry: null,
                      properties,
                    })),
                  ],
                },
            null,
            2,
          );
  return {
    content,
    type:
      format === 'csv'
        ? 'text/csv;charset=utf-8'
        : format === 'graphml'
          ? 'application/graphml+xml;charset=utf-8'
          : 'application/geo+json',
    filename: `norske-sagn-selection.${format}`,
  };
}
export function exportSelection(format: 'csv' | 'geojson' | 'graphml', context: ExportContext) {
  const data = mapExportData(format, context);
  const blob = new Blob([data.content], { type: data.type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = data.filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
