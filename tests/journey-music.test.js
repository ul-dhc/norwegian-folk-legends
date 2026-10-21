import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourneyMusic } from '../src/journey/music.js';

function setup(play = null) {
  const audio = {
    paused: true,
    volume: 1,
    plays: 0,
    play() {
      this.plays++;
      this.paused = false;
      return play ? play() : Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
  let failures = 0;
  return {
    audio,
    music: createJourneyMusic(
      audio,
      () => {},
      () => failures++,
    ),
    failures: () => failures,
  };
}

test('starting a story plays quiet music immediately, with pause and resume', async () => {
  const { music, audio } = setup();
  music.start();
  assert.equal(audio.paused, false);
  assert.equal(audio.volume, 0.16);
  await Promise.resolve();
  music.pause();
  assert.equal(audio.paused, true);
  assert.equal(music.enabled, true);
  music.resume();
  assert.equal(audio.paused, false);
});

test('muting survives story pause/resume; the note can enable music again', () => {
  const { music, audio } = setup();
  music.start();
  music.toggle();
  music.pause();
  music.resume();
  assert.equal(music.enabled, false);
  assert.equal(audio.paused, true);
  assert.equal(audio.plays, 1);
  music.toggle();
  assert.equal(music.enabled, true);
  assert.equal(audio.paused, false);
});

test('enabling while paused waits for resume, and each new story starts with music', () => {
  const { music, audio } = setup();
  music.start();
  music.toggle();
  music.pause();
  music.toggle();
  assert.equal(audio.paused, true);
  music.resume();
  assert.equal(audio.paused, false);
  music.toggle();
  music.start();
  assert.equal(music.enabled, true);
  assert.equal(audio.paused, false);
});

test('blocked playback shows music off and allows retry from the note button', async () => {
  let blocked = true;
  const { music, audio, failures } = setup(() =>
    blocked ? Promise.reject(new Error('blocked')) : Promise.resolve(),
  );
  music.start();
  await Promise.resolve();
  assert.equal(music.enabled, false);
  assert.equal(failures(), 1);
  blocked = false;
  music.toggle();
  await Promise.resolve();
  assert.equal(music.enabled, true);
  assert.equal(audio.paused, false);
});

test('pausing during pending playback keeps it silent and ignores a cancelled attempt', async () => {
  let resolve;
  const { music, audio } = setup(() => new Promise((done) => (resolve = done)));
  music.start();
  music.pause();
  resolve();
  await Promise.resolve();
  assert.equal(audio.paused, true);
});
