import test from 'node:test';
import assert from 'node:assert/strict';
import { revealReadingLines, readingPlaybackDuration } from '../src/journey/reading-reveal.js';

// Exercise the real animation builder with measured line positions and WAAPI adapters.
function withPassage(text, tops, run) {
  const originalDocument = globalThis.document;
  const animations = [];
  globalThis.document = {
    createElement: () => ({
      animate(frames, options) {
        let duration = options.duration;
        const animation = {
          frames,
          currentTime: 0,
          state: 'running',
          play() {
            this.state = 'running';
          },
          pause() {
            this.state = 'paused';
          },
          cancel() {
            this.state = 'idle';
          },
          effect: {
            getTiming: () => ({ duration }),
            updateTiming: (timing) => {
              duration = timing.duration;
            },
          },
        };
        animations.push(animation);
        return animation;
      },
    }),
  };
  const passage = {
    textContent: text,
    replaceChildren(...children) {
      this.children = children;
      children.forEach((child, i) => {
        child.offsetTop = tops[i];
      });
    },
  };
  try {
    run(passage, animations);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

test('lines appear in reading order without changing the source or splitting line timing', () => {
  const text = 'Første linje.\nAndre linje.  Siste ord.';
  withPassage(text, [0, 0, 28, 28, 56, 56], (passage, animations) => {
    const reveal = revealReadingLines(passage, 20000);
    assert.equal(passage.children.map((word) => word.textContent).join(''), text);
    assert.deepEqual(animations[0].frames, [{ opacity: 1 }, { opacity: 1 }]);
    assert.deepEqual(animations[2].frames, animations[3].frames);
    assert.ok(animations[2].frames[1].offset < animations[4].frames[1].offset);
    assert.equal(animations[4].frames[2].offset * 20000, reveal.revealEnd);
    assert.equal(reveal.revealEnd, 7000);
    reveal.pause();
    assert.ok(animations.every((a) => a.state === 'paused'));
    reveal.currentTime = 3000;
    assert.ok(animations.every((a) => a.currentTime === 3000));
    reveal.play();
    assert.ok(animations.every((a) => a.state === 'running'));
    reveal.cancel();
    assert.ok(animations.every((a) => a.state === 'idle'));
  });
});
test('reading-speed changes keep the reported final line aligned with its keyframes', () => {
  withPassage('First line second line', [0, 0, 28, 28], (passage, animations) => {
    const reveal = revealReadingLines(passage, 10000);
    reveal.effect.updateTiming({ duration: 20000 });
    assert.equal(reveal.revealEnd, 7000);
    assert.equal(reveal.effect.getTiming().duration, 20000);
    assert.equal(animations[2].frames[2].offset * 20000, reveal.revealEnd);
    assert.ok(animations.every((a) => a.effect.getTiming().duration === 20000));
  });
});
test('a single line is already fully visible; long passages retain the reveal cap', () => {
  withPassage('One line.', [0, 0], (passage) => {
    assert.equal(revealReadingLines(passage, 10000).revealEnd, 0);
  });
  withPassage('Line one line two', [0, 0, 28, 28], (passage) => {
    assert.equal(revealReadingLines(passage, 100000).revealEnd, 22000);
  });
  withPassage('', [], (passage) => {
    const reveal = revealReadingLines(passage, 10000);
    assert.equal(reveal.revealEnd, 0);
    reveal.pause();
    reveal.play();
    reveal.cancel();
  });
});

test('Moe legends advance three seconds after the final line, including after retiming', () => {
  withPassage('First line last line', [0, 0, 28, 28], (passage) => {
    const reveal = revealReadingLines(passage, 60000);
    assert.equal(readingPlaybackDuration('moe', reveal.revealEnd, 61800), 24000);
    reveal.effect.updateTiming({ duration: 30000 });
    assert.equal(readingPlaybackDuration('moe', reveal.revealEnd, 31800), 13500);
    assert.equal(readingPlaybackDuration('weave', reveal.revealEnd, 35000), 12500);
  });
});
test('Moe legends without a reveal have a three-second hold from their immediate appearance', () => {
  assert.equal(readingPlaybackDuration('moe', undefined, 60000), 3000);
  assert.equal(readingPlaybackDuration('moe', 0, 60000), 3000);
  assert.equal(readingPlaybackDuration('weave', undefined, 60000), 60000);
});
