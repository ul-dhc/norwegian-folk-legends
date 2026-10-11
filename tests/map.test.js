import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('build/map/index.html');
const dataset = JSON.parse(html.match(/<script[^>]*id="corpus-map-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const source = JSON.parse(read('norske_json/legends.json'));
const originalPlaces = JSON.parse(read('norske_json/places.json'));
const places = new Map(JSON.parse(read('norske_json/places-geography.json')).map(place => [place.id, place]));
const records = [...dataset.legends.features.map(feature => feature.properties), ...dataset.unmappedLegends];

test('the map accounts for every source record once and keeps the detail-page IDs', () => {
  const expected = source.map(record => record.sourceUrl.match(/[?&]id=(\d+)/)[1]);
  assert.equal(new Set(records.map(record => record.id)).size, source.length);
  assert.deepEqual(records.map(record => record.id).sort(), expected.sort());
  assert.equal(dataset.unmappedLegendCount, dataset.unmappedLegends.length);
});

test('map points use the geographic dataset and missing coordinates stay separate', () => {
  for (const feature of dataset.legends.features) {
    const coordinates = places.get(feature.properties.placeId).coordinates;
    assert.deepEqual(feature.geometry.coordinates, [coordinates.longitude, coordinates.latitude]);
    assert.equal(feature.id, feature.properties.id);
  }
  for (const record of dataset.unmappedLegends) assert.ok(!places.get(record.placeId)?.coordinates);
  assert.equal(dataset.places.features.reduce((sum, place) => sum + place.properties.count, 0), dataset.legends.features.length);
  for (const place of dataset.places.features) {
    const expected = dataset.legends.features.filter(record => record.properties.placeId === place.id);
    assert.equal(place.properties.count, expected.length);
    assert.deepEqual(place.properties.legendIds.split(',').sort(), expected.map(record => record.id).sort());
  }
});

test('Norwegian filter metadata and translation availability agree with source records', () => {
  const byId = new Map(source.map(record => [record.sourceUrl.match(/[?&]id=(\d+)/)[1], record]));
  for (const record of records) {
    const original = byId.get(record.id);
    assert.equal(record.volume, original.subgenre || '');
    assert.equal(record.genre, original.genre || '');
    assert.equal(record.translation, original.text.en ? 'translated' : 'norwegian-only');
    assert.equal(record.year, original.year ? String(original.year) : null);
  }
});

const { buildMetadataNetwork } = await import('../src/map/networks.js');
test('ML networks use only recorded place coordinates and exact shared types', () => {
  const graph = buildMetadataNetwork('plots', dataset.legends.features);
  const byId = new Map(dataset.legends.features.map(feature => [feature.properties.id, feature]));
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  const eligible = dataset.legends.features.filter(feature => feature.properties.themeNo.trim());
  assert.equal(graph.recordCount, eligible.length);
  for (const node of graph.nodes) {
    assert.equal(node.kind, 'place');
    assert.equal(node.illustrative, false);
    assert.deepEqual(node.coordinates, byId.get(node.legendIds[0]).geometry.coordinates);
    assert.equal(node.count, new Set(node.legendIds).size);
  }
  const actualPairs = new Set();
  for (const edge of graph.edges) {
    assert.ok(!('similarity' in edge));
    const from = nodes.get(edge.fromId), to = nodes.get(edge.toId);
    const shared = from.plots.map(([plot]) => plot).filter(plot => to.plots.some(([other]) => other === plot));
    assert.deepEqual(edge.strongest.map(item => item.plot).sort(), shared.sort());
    assert.equal(edge.sharedCount, shared.length);
    assert.deepEqual(edge.coordinates, [from.coordinates, to.coordinates]);
    for (const item of edge.strongest) {
      assert.equal(item.from, from.plots.find(([plot]) => plot === item.plot)[1]);
      assert.equal(item.to, to.plots.find(([plot]) => plot === item.plot)[1]);
    }
    const expectedIds = [...new Set([...from.legendIds, ...to.legendIds].filter(id => shared.includes(byId.get(id).properties.themeNo)))].sort();
    assert.deepEqual([...edge.legendIds].sort(), expectedIds);
    assert.equal(edge.count, expectedIds.length);
    actualPairs.add(edge.id);
  }
  const allNodes = graph.nodes;
  for (let i = 0; i < allNodes.length; i++) for (let j = i + 1; j < allNodes.length; j++) {
    const from = allNodes[i], to = allNodes[j], shared = from.plots.some(([plot]) => to.plots.some(([other]) => other === plot));
    assert.equal(actualPairs.has([from.id, to.id].sort((a,b)=>a.localeCompare(b)).join('|')), shared);
  }
  const selection = eligible.slice(0, 10), selected = new Set(selection.map(feature => feature.properties.id));
  const filtered = buildMetadataNetwork('plots', selection);
  assert.ok(filtered.nodes.every(node => node.legendIds.every(id => selected.has(id))));
  assert.ok(filtered.edges.every(edge => edge.legendIds.every(id => selected.has(id))));
  assert.deepEqual(buildMetadataNetwork('plots', []), { nodes: [], edges: [], recordCount: 0 });
  for (const removed of ['narratorCollectors', 'similarity', 'sources']) assert.deepEqual(buildMetadataNetwork(removed, eligible), { nodes: [], edges: [], recordCount: 0 });
});

test('Moe’s 88 records reconcile between the Journey, mapped and unlocated records', () => {
  const allMoe = records.filter(record => record.collectorId === 'collector-moltke-moe');
  const sourceMoe = source.filter(record => record.collectorId === 'collector-moltke-moe');
  assert.equal(sourceMoe.length, 88);
  assert.deepEqual(allMoe.map(record => record.id).sort(), sourceMoe.map(record => record.sourceUrl.match(/[?&]id=(\d+)/)[1]).sort());
  const mapped = dataset.legends.features.filter(feature => feature.properties.collectorId === 'collector-moltke-moe');
  const unmapped = dataset.unmappedLegends.filter(record => record.collectorId === 'collector-moltke-moe');
  assert.equal(mapped.length, 87);
  assert.deepEqual(unmapped.map(record => record.id), ['53140']);
  assert.equal(mapped.length + unmapped.length, 88);
  const journey = JSON.parse(read('build/journey-data.json'));
  assert.equal(journey.records.filter(record => record.collectorId === 'collector-moltke-moe').length, 88);
});

test('network overview preserves each place’s strongest 10%, rounds up, and invents no edges', async () => {
  const { strongestConnectionIds, buildMetadataNetwork } = await import('../src/map/networks.js');
  const edges = Array.from({length:21}, (_,index) => ({id:`edge-${index}`,fromId:'hub',toId:index===20?'small':'other',sharedCount:21-index,count:1}));
  const snapshot = structuredClone(edges);
  const selected = strongestConnectionIds(edges);
  assert.deepEqual([...selected], ['edge-0','edge-1','edge-2','edge-20']);
  assert.deepEqual([...strongestConnectionIds([...edges].reverse())], [...selected]);
  assert.deepEqual(edges, snapshot);
  assert.equal(strongestConnectionIds([]).size, 0);
  const graph = buildMetadataNetwork('plots', dataset.legends.features), overview = strongestConnectionIds(graph.edges);
  assert.ok(overview.size < graph.edges.length);
  for (const node of graph.nodes) {
    const incident = graph.edges.filter(edge => edge.fromId===node.id || edge.toId===node.id);
    const strongest = [...incident].sort((a,b)=>b.sharedCount-a.sharedCount || b.count-a.count || a.id.localeCompare(b.id)).slice(0,Math.ceil(incident.length*.1));
    assert.ok(strongest.every(edge=>overview.has(edge.id)), node.id);
  }
  assert.ok([...overview].every(id=>graph.edges.some(edge=>edge.id===id)));
});


test('shared collectors connect recorded places by collector IDs and exact supporting legends', () => {
  const graph = buildMetadataNetwork('collectors', dataset.legends.features);
  const records = new Map(dataset.legends.features.map(f => [f.properties.id, f]));
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  assert.equal(graph.recordCount, dataset.legends.features.filter(f => f.properties.collectorId.trim()).length);
  for (const node of graph.nodes) {
    assert.equal(node.kind, 'place');
    assert.equal(node.illustrative, false);
    assert.deepEqual(node.coordinates, records.get(node.legendIds[0]).geometry.coordinates);
  }
  const pairs = new Set();
  for (const edge of graph.edges) {
    const from = nodes.get(edge.fromId), to = nodes.get(edge.toId);
    const shared = from.collectors.filter(a => to.collectors.some(b => a.id === b.id));
    assert.deepEqual(edge.strongest.map(c => c.key).sort(), shared.map(c => c.id).sort());
    assert.equal(edge.sharedCount, shared.length);
    assert.deepEqual(edge.coordinates, [from.coordinates, to.coordinates]);
    for (const c of edge.strongest) {
      assert.equal(c.from, from.collectors.find(a => a.id === c.key).count);
      assert.equal(c.to, to.collectors.find(a => a.id === c.key).count);
    }
    const ids = [...from.legendIds, ...to.legendIds].filter(id => shared.some(c => c.id === records.get(id).properties.collectorId));
    assert.deepEqual([...edge.legendIds].sort(), [...new Set(ids)].sort());
    pairs.add(edge.id);
  }
  for (let i=0;i<graph.nodes.length;i++) for(let j=i+1;j<graph.nodes.length;j++) {
    const a=graph.nodes[i],b=graph.nodes[j];
    assert.equal(pairs.has([a.id,b.id].sort((a,b)=>a.localeCompare(b)).join('|')),a.collectors.some(c=>b.collectors.some(d=>c.id===d.id)));
  }
  const first=dataset.legends.features[0];
  const record=(id,placeId,collectorId,name='Same displayed name',themeNo='')=>({...first,geometry:{type:'Point',coordinates:[10,60]},properties:{...first.properties,id,placeId,collectorId,collector:name,themeNo}});
  const fixture=[record('1','a','c1'),record('2','b','c1'),record('3','c','c2'),record('4','d',''),record('5','e','c3')];
  const result=buildMetadataNetwork('collectors',fixture);
  assert.equal(result.edges.length,1); // Same names, different IDs must not create a connection.
  assert.deepEqual(result.edges[0].legendIds,['1','2']); // ML types are optional.
  assert.equal(result.nodes.length,4); // Eligible isolated places stay visible.
  assert.deepEqual(buildMetadataNetwork('collectors',[fixture[0]]).edges,[]);
  assert.deepEqual(buildMetadataNetwork('collectors',[]),{nodes:[],edges:[],recordCount:0});
  const filtered=buildMetadataNetwork('collectors',dataset.legends.features.filter(f=>f.properties.collectorId==='collector-moltke-moe'));
  assert.equal(filtered.recordCount,87); // The 88th Moe legend has no coordinates.
  assert.ok(filtered.edges.every(e=>e.sharedCount===1&&e.strongest[0].key==='collector-moltke-moe'));
});


test('node connection counts use unique neighbouring places in the full filtered network', () => {
  for (const type of ['plots', 'collectors']) {
    for (const features of [dataset.legends.features, dataset.legends.features.filter(f => f.properties.collectorId === 'collector-moltke-moe')]) {
      const graph = buildMetadataNetwork(type, features);
      for (const node of graph.nodes) {
        const neighbours = new Set(graph.edges.filter(e => e.fromId === node.id || e.toId === node.id).map(e => e.fromId === node.id ? e.toId : e.fromId));
        assert.equal(node.connectionCount, neighbours.size);
      }
      assert.equal(graph.nodes.reduce((sum, n) => sum + n.connectionCount, 0), graph.edges.length * 2);
    }
    const single = buildMetadataNetwork(type, [dataset.legends.features.find(f => f.properties.collectorId && f.properties.themeNo)]);
    assert.equal(single.nodes[0].connectionCount, 0);
  }
});


test('geographic decisions preserve originals and relocate only supported authority matches', () => {
  assert.equal(places.size, originalPlaces.length);
  for (const original of originalPlaces) {
    const place = places.get(original.id), geo = place.geography;
    assert.equal(place.name, original.name);
    assert.equal(place.legendCount, original.legendCount);
    assert.deepEqual(geo.originalCoordinates, original.coordinates);
    if (geo.verification === 'authority_matched') {
      const authority = geo.authority;
      assert.ok(authority.id);
      assert.ok(authority.sourceUrl.startsWith('https://ws.geonorge.no/'));
      assert.ok(authority.names.some(n => n.name.toLocaleLowerCase() === place.name.toLocaleLowerCase() && ['vedtatt','godkjent','godkjent og prioritert'].includes(n.status)));
      assert.equal(geo.reason, 'unique_exact_name_and_all_recorded_counties');
      assert.ok(Object.keys(geo.countyContext).length);
      for (const county of Object.keys(geo.countyContext)) assert.ok(authority.counties.some(c => c.fylkesnavn.toLocaleLowerCase() === county.toLocaleLowerCase()));
    } else assert.deepEqual(place.coordinates, original.coordinates);
    if (geo.displayStatus === 'historical') {
      assert.equal(geo.verification, 'historical_name_matched');
      assert.equal(geo.precision, 'unknown');
      assert.ok(geo.nameEvidence.length);
      assert.ok(geo.nameEvidence.every(item => item.sourceUrl.startsWith('https://data.ssb.no/')));
      assert.deepEqual(place.coordinates, original.coordinates);
    }
    if (!original.coordinates) assert.equal(geo.displayStatus, 'unlocated');
  }
  for (const point of dataset.places.features) assert.deepEqual(point.properties.geography, places.get(point.id).geography);
});


test('Journeys and the map use the same updated place coordinates and location status', () => {
  const journey = JSON.parse(read('build/journey-data.json')).records;
  for (const record of journey) {
    const place = places.get(record.placeId);
    if (place?.coordinates) {
      assert.equal(record.lat, place.coordinates.latitude, record.id);
      assert.equal(record.lon, place.coordinates.longitude, record.id);
      assert.equal(record.geographicStatus, place.geography.displayStatus);
      assert.equal(record.locationUncertain, ['area', 'ambiguous'].includes(place.geography.mapUncertainty.kind));
      assert.equal(record.coordinateSource, place.geography.coordinateSource);
    } else {
      assert.equal(record.geographicStatus, 'unresolved');
      assert.ok(['none', 'existing county coordinate'].includes(record.coordinateSource));
    }
  }
});


test('map uncertainty distinguishes evidence of ambiguity from incomplete verification', () => {
  const kind = id => places.get(id).geography.mapUncertainty.kind;
  assert.equal(kind('place-alta'), 'none');
  assert.equal(kind('place-b-herad'), 'none');
  assert.equal(kind('place-forsand'), 'ambiguous');
  assert.equal(kind('place-bruvik-eller-hosanger'), 'ambiguous');
  assert.equal(kind('place-arendalskanten'), 'area');
  assert.equal(kind('place-hallingdal'), 'area');
  assert.equal(kind('place-treungen'), 'none');
  for (const place of places.values()) {
    const geo = place.geography;
    if (geo.reason === 'county_context_not_confirmed') assert.equal(geo.mapUncertainty.kind, 'none');
    if (geo.reason === 'multiple_matches_in_recorded_county') assert.equal(geo.mapUncertainty.kind, 'ambiguous');
    assert.ok(['none', 'area', 'ambiguous'].includes(geo.mapUncertainty.kind));
  }
});
