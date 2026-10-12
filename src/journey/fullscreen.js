export async function toggleJourneyFullscreen(root, resize, controls) {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (root.classList.contains('is-fullscreen')) {
    root.classList.remove('is-fullscreen');
    document.body.classList.remove('journey-fullscreen');
    resize();
    controls();
    return;
  }
  try {
    if (!root.requestFullscreen) throw new Error('Fullscreen unavailable');
    await root.requestFullscreen();
  } catch {
    root.classList.add('is-fullscreen');
    document.body.classList.add('journey-fullscreen');
    resize();
    controls();
  }
}
