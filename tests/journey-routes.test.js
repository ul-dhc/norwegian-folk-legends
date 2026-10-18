import test from 'node:test';
import assert from 'node:assert/strict';
import { journeyHash, readJourneyHash } from '../src/journey/routes.js';
const themes = ['water', 'hulder', 'boundary'];

test('distinct journey links select the correct form and theme', () => {
  for (const mode of ['weave', 'thread', 'moe']) {
    const hash = journeyHash(mode);
    assert.equal(readJourneyHash(`#${hash}`, themes).mode, mode);
  }
  assert.equal(journeyHash('moe'), 'moltke-moe');
  assert.equal(journeyHash('thread'), 'one-thread');
  for (const theme of themes)
    assert.equal(readJourneyHash(journeyHash('thread', theme), themes).theme, theme);
});

test('legacy shared routes preserve form, theme, dataset version and exact records', () => {
  const old = readJourneyHash('#mode=thread&theme=hulder&v=old&route=SIN1,SIN2', themes);
  assert.equal(old.mode, 'thread');
  assert.equal(old.theme, 'hulder');
  assert.equal(old.saved.get('v'), 'old');
  assert.equal(old.saved.get('route'), 'SIN1,SIN2');
  const hash = journeyHash('weave', null, {v: 'abc', route: 'SIN1,SIN2'});
  const restored = readJourneyHash(hash, themes);
  assert.equal(restored.mode, 'weave');
  assert.equal(restored.saved.get('route'), 'SIN1,SIN2');
  assert.equal(restored.saved.get('v'), 'abc');
  assert.equal(readJourneyHash('#mode=moe', themes).mode, 'moe');
  assert.equal(readJourneyHash('#one-thread/unknown', themes).theme, null);
  assert.equal(readJourneyHash('#unknown', themes).mode, 'weave');
});
