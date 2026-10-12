import { legends, resolveLegend, displayPersonName } from '../lib/data';
import geographyRaw from '../../norske_json/places-geography.json';
const geographicPlaces = new Map(geographyRaw.map((place) => [place.id, place]));
import type { MapDataset, LegendProperties, PlaceFeature, PlaceGeography } from './types';

// Preserve source IDs; use the audited geographic dataset for map positions.
const mapped: MapDataset['legends']['features'] = [];
const unmapped: LegendProperties[] = [];
const groups = new Map<string, typeof legends>();
for (const legend of legends) {
  const { place, county, category, collector, narrator } = resolveLegend(legend);
  const properties: LegendProperties = {
    id: legend.id,
    placeId: legend.placeId || '',
    placeName: place?.name || '',
    titleNo: legend.title.no || category?.title || legend.id,
    titleEn: legend.title.en || legend.title.no || category?.title || legend.id,
    themeNo: [category?.code, category?.title].filter(Boolean).join(' · '),
    themeEn: [category?.code, category?.title].filter(Boolean).join(' · '),
    volume: legend.subgenre || '',
    genre: legend.genre || '',
    county: county?.name || '',
    translation: legend.text.en ? 'translated' : 'norwegian-only',
    collectorId: legend.collectorId || '',
    narratorId: legend.narratorId || '',
    collector: displayPersonName(collector),
    narrator: displayPersonName(narrator),
    year: legend.year || null,
    coordinateSource: 'place',
  };
  const coordinates = place
    ? (geographicPlaces.get(place.id)?.coordinates ?? place.coordinates)
    : null;
  if (
    !coordinates ||
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude)
  ) {
    unmapped.push(properties);
    continue;
  }
  mapped.push({
    type: 'Feature',
    id: legend.id,
    geometry: { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] },
    properties,
  });
  const records = groups.get(place!.id) || [];
  records.push(legend);
  groups.set(place!.id, records);
}
const places: PlaceFeature[] = [...groups].map(([id, records]) => {
  const place = resolveLegend(records[0]).place!;
  const location = geographicPlaces.get(id)!;
  const years = records.map((record) => Number(record.year)).filter(Boolean);
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      coordinates: [location.coordinates!.longitude, location.coordinates!.latitude],
    },
    properties: {
      id,
      name: place.name,
      geography: location.geography as PlaceGeography,
      count: records.length,
      yearFrom: years.length ? Math.min(...years) : null,
      yearTo: years.length ? Math.max(...years) : null,
      collectorCount: new Set(
        records.map((record) => displayPersonName(resolveLegend(record).collector)).filter(Boolean),
      ).size,
      narratorCount: new Set(
        records.map((record) => displayPersonName(resolveLegend(record).narrator)).filter(Boolean),
      ).size,
      legendIds: records.map((record) => record.id).join(','),
    },
  };
});
export const mapData: MapDataset = {
  places: { type: 'FeatureCollection', features: places },
  legends: { type: 'FeatureCollection', features: mapped },
  unmappedLegends: unmapped,
  networks: {},
  unmappedLegendCount: unmapped.length,
  unmappedPlaceCount: new Set(unmapped.map((record) => record.placeId).filter(Boolean)).size,
};
