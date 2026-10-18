import test from 'node:test';
import assert from 'node:assert/strict';
import { jumpDestination, links, normalText, continueRoute } from '../src/journey/engine.js';
const make = (id, overrides = {}) => ({
  source_text_id: id,
  tekst: `Legend ${id}`,
  lat: 60,
  lon: 10,
  placeId: id,
  collectorId: id,
  samler: id,
  narratorId: id,
  informant: id,
  categoryId: id,
  ...overrides,
});
const start = make('start');
test('Jump rejects every recorded relationship, duplicate texts and shared coordinates', () => {
  const unrelated = make('fresh', { lat: 65 });
  const connected = ['placeId', 'collectorId', 'narratorId', 'categoryId'].map((key, i) =>
    make(`connected-${i}`, { lat: 64, [key]: start[key] }),
  );
  const storyStart = { ...start, storyPlaces: [{ key: 'mountain' }] };
  const pool = [
    ...connected,
    make('same-point'),
    make('duplicate', { lat: 64, tekst: start.tekst }),
    make('story', { lat: 64, storyPlaces: [{ key: 'mountain' }] }),
    unrelated,
  ];
  assert.equal(
    jumpDestination(pool, storyStart, new Set(), () => 0),
    unrelated,
  );
  assert.deepEqual(links(storyStart, unrelated), []);
  assert.equal(jumpDestination(pool.slice(0, -1), storyStart), null);
});
test('Jump prefers fresh, non-recent, distant places and safely handles exhaustion', () => {
  const near = make('near', { lat: 60.1 });
  const far = make('far', { lat: 65 });
  const recent = make('recent', { lat: 67 });
  const seen = new Set([normalText(recent.tekst)]);
  assert.equal(
    jumpDestination([recent, near, far], start, seen, () => 0),
    far,
  );
  assert.equal(
    jumpDestination([recent, far], start, new Set(), () => 0, [recent]),
    far,
  );
  assert.equal(
    jumpDestination([near, far], start, new Set([normalText(far.tekst)]), () => 0),
    near,
  );
  assert.equal(
    jumpDestination([far], start, new Set([normalText(far.tekst)]), () => 0),
    far,
  );
  assert.equal(jumpDestination([], start), null);
  assert.equal(jumpDestination([far], null), null);
});
test('Jump chooses locations fairly and continuation reserves only the requested records', () => {
  const a = make('a', { lat: 64 }),
    b = make('b', { lat: 64 }),
    c = make('c', { lat: 67 });
  assert.equal(
    jumpDestination([a, b, c], start, new Set(), () => 0.6),
    c,
  );
  const visited = new Set([normalText(start.tekst)]);
  const pool = Array.from({ length: 12 }, (_, i) => make(`stop-${i}`, { lat: 61 + i }));
  assert.equal(continueRoute(pool, start, visited, () => 0, [], 4).length, 4);
  assert.equal(visited.size, 5);
});
