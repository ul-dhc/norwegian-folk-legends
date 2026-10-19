import test from 'node:test';
import assert from 'node:assert/strict';
import {
  continuousBridge,
  creditedBridge,
  roadBridge,
  storyPlaceBridge,
  jumpBridge,
  networkBridge,
} from '../src/journey/credits.js';
const before = { sted: 'Bø', placeId: 'bo', collectorId: 'collector', narratorId: 'narrator' };
const record = {
  sted: 'Halsa',
  placeId: 'halsa',
  collectorId: 'collector',
  narratorId: 'narrator',
  samler: 'Maurits Fugelsøy',
  informant: 'Narrator',
};
for (const lang of ['en', 'no']) {
  test(`${lang}: shared relationships vary without losing names, places or adding unrelated themes`, () => {
    for (const kind of ['collector', 'narrator', 'story', 'elsewhere', 'place']) {
      const target = kind === 'place' ? { ...record, placeId: 'bo' } : record;
      const lines = Array.from({ length: 6 }, (_, i) =>
        continuousBridge(before, target, { kind, value: 'Mountain' }, lang, i),
      );
      assert.equal(new Set(lines).size, 6, kind);
      for (const line of lines) {
        assert.ok(line.includes('Halsa'), line);
        assert.ok(!/undefined|NaN|Ukjent|legend type|sagntype/.test(line), line);
        for (const name of ['Maurits Fugelsøy', 'Narrator'])
          assert.ok(line.split(name).length <= 2, line);
        if (kind === 'collector') assert.ok(line.includes('Maurits Fugelsøy'));
        if (kind === 'narrator') assert.ok(line.includes('Narrator'));
        if (kind === 'story') assert.ok(line.includes('Mountain'));
      }
    }
    const opening = Array.from({ length: 4 }, (_, i) =>
      continuousBridge(null, record, null, lang, i),
    );
    assert.equal(new Set(opening).size, 4);
  });
  test(`${lang}: roads, jumps and wider views rotate through grounded captions`, () => {
    const roads = Array.from({ length: 6 }, (_, i) => roadBridge(record, lang, i * 3 + 1));
    assert.equal(new Set(roads).size, 6);
    for (const line of roads) assert.ok(line.includes('Halsa'));
    const jumps = Array.from({ length: 4 }, (_, i) => jumpBridge(record, lang, i));
    assert.equal(new Set(jumps).size, 4);
    for (const line of jumps) {
      assert.ok(line.includes('Halsa'));
      assert.match(line, lang === 'en' ? /no (recorded )?(connection|link)/i : /ingen|uten noen/);
    }
    for (const kind of ['collector', 'narrator']) {
      const lines = Array.from({ length: 4 }, (_, i) => networkBridge(record, kind, 42, lang, i));
      assert.equal(new Set(lines).size, 4);
      for (const line of lines) {
        assert.ok(line.includes('42'));
        assert.ok(line.includes(kind === 'collector' ? 'Maurits Fugelsøy' : 'Narrator'));
      }
    }
  });
  test(`${lang}: story locations retain the record association and exact quoted text remains separate`, () => {
    for (const role of ['story', 'family'])
      for (const hold of [false, true]) {
        const lines = Array.from({ length: 4 }, (_, i) =>
          storyPlaceBridge(record, { name: 'Mountain', role }, lang, i, hold),
        );
        assert.equal(new Set(lines).size, 4);
        for (const line of lines) assert.ok(line.includes('Halsa') && line.includes('Mountain'));
      }
  });
  test(`${lang}: credits vary without repeating names or inventing missing metadata`, () => {
    const lines = Array.from({ length: 3 }, (_, i) =>
      creditedBridge('Arrival.', { ...record, år_clean: '1901' }, lang, i),
    );
    assert.equal(new Set(lines).size, 3);
    for (const line of lines)
      for (const name of ['Narrator', 'Maurits Fugelsøy']) assert.equal(line.split(name).length, 2);
    assert.ok(lines[2].includes('1901'));
    assert.equal(creditedBridge('Arrival.', { samler: 'Ukjent', informant: '' }, lang), 'Arrival.');
  });
}
