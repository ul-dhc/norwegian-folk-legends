import test from 'node:test';
import assert from 'node:assert/strict';
import { fold, searchNorm, marked, contextual } from '../src/lib/search.ts';
import { mapExportData } from '../src/map/export.ts';
import { typingScale, characterDelay } from '../src/journey/typing.js';

test('Norwegian search keeps ø and æ while normalizing accents and whitespace', () => {
  assert.equal(fold('Å Æ Ø'), 'a æ ø');
  assert.equal(searchNorm('  HULDÉR   kvinne '), 'hulder kvinne');
});
test('highlights preserve source characters and escape HTML', () => {
  assert.equal(
    marked('Å <hulder> &', ['a', 'hulder']),
    '<mark>Å</mark> &lt;<mark>hulder</mark>&gt; &amp;',
  );
});
test('overlapping highlight terms form one range', () => {
  assert.equal(marked('hulder', ['hul', 'hulder']), '<mark>hulder</mark>');
});
test('context snippets include the match and retain fallback truncation', () => {
  assert.equal(contextual('', [], 'abcdef', false, 3), 'abc…');
  const text = 'before '.repeat(60) + 'hulder ' + 'after '.repeat(60);
  assert.match(contextual(text, ['hulder'], ''), /hulder/);
  assert.ok(contextual(text, ['hulder'], '').startsWith('…'));
});
const row = {
  id: '1',
  placeName: 'A, "B"',
  year: 0,
  themeNo: 'ML',
  narrator: 'N',
  collector: 'C',
  volume: 'V',
  county: 'K',
  genre: 'G',
  translation: 'T',
};
const context = {
  filteredFeatures: [],
  filteredUnmappedLegends: [row],
  networkType: { value: 'collectors' },
  networkNodes: [],
  networkEdges: [],
  mapMode: 'points',
  graphCollections: () => ({ nodes: ['all nodes'], edges: ['all edges'] }),
};
test('CSV retains field order, quoting, missing year and file name', () => {
  const data = mapExportData('csv', context);
  assert.equal(data.filename, 'norske-sagn-selection.csv');
  assert.equal(
    data.content,
    'id,place,year,ml_category,narrator,collector,subgenre,county,genre,translation\n"1","A, ""B""","","ML","N","C","V","K","G","T"',
  );
});
test('GeoJSON preserves unlocated records with null geometry', () => {
  assert.deepEqual(JSON.parse(mapExportData('geojson', context).content), {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: null, properties: row }],
  });
});
test('network exports use complete collections and escape XML metadata', () => {
  assert.deepEqual(
    JSON.parse(mapExportData('geojson', { ...context, mapMode: 'network' }).content),
    { relationshipType: 'collectors', nodes: ['all nodes'], edges: ['all edges'] },
  );
  const node = {
    id: 'a&b',
    name: '<place>',
    coordinates: [1, 2],
    count: 1,
    connectionCount: 0,
    dominantTheme: '"theme"',
    plotCount: 1,
    legendIds: ['1'],
  };
  const xml = mapExportData('graphml', { ...context, networkNodes: [node] }).content;
  assert.match(xml, /id="a&amp;b"/);
  assert.match(xml, /&lt;place&gt;/);
  assert.match(xml, /&quot;theme&quot;/);
});
test('journey reading-time curve retains its endpoints', () => {
  assert.equal(typingScale(70), 0.5);
  assert.equal(typingScale(100), 1);
  assert.equal(typingScale(200), 2.5);
});
test('journey punctuation pauses retain their timing', () => {
  for (const char of ['.', '!', '?', '…']) assert.equal(characterDelay(char), 380);
  for (const char of [',', ';', ':']) assert.equal(characterDelay(char), 170);
  assert.equal(characterDelay(' '), 45);
  assert.equal(characterDelay('ø'), 32);
});
