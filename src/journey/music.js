// Start playback inside the story's user gesture, and keep mute separate from pause.
export function createJourneyMusic(audio, onChange, onError) {
  let enabled = true;
  let active = false;
  let attempt = 0;
  const pause = () => {
    attempt++;
    active = false;
    audio.pause();
    onChange();
  };
  const resume = () => {
    active = true;
    if (!enabled) return;
    const current = ++attempt;
    audio.volume = 0.16;
    audio.play().then(
      () => {
        if (!active || !enabled) audio.pause();
        onChange();
      },
      () => {
        if (current !== attempt || !active || !enabled) return;
        enabled = false;
        onChange();
        onError();
      },
    );
  };
  return {
    get enabled() {
      return enabled;
    },
    start() {
      enabled = true;
      resume();
    },
    pause,
    resume,
    toggle() {
      enabled = !enabled;
      if (!enabled) {
        attempt++;
        audio.pause();
      } else if (active) resume();
      onChange();
    },
  };
}
