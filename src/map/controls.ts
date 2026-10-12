import * as maplibregl from 'maplibre-gl';
import { createElement, Maximize, Minimize, MapPin } from 'lucide';
import type { MapDataset } from './types';
type Options = {
  map: maplibregl.Map;
  page: HTMLElement;
  dataset: MapDataset;
  mapWorkspace: HTMLElement;
  uncertaintyToggle: HTMLInputElement;
  getMode: () => string;
  tr: (key: string, values?: Record<string, string | number>) => string;
};
export function installMapControls({
  map,
  page,
  dataset,
  mapWorkspace,
  uncertaintyToggle,
  tr,
  getMode,
}: Options) {
  const navigationControl = new maplibregl.NavigationControl({
    showCompass: false,
    visualizePitch: false,
  });
  map.addControl(navigationControl, 'top-right');
  const navigationGroup = page.querySelector<HTMLElement>(
      '.maplibregl-ctrl-top-right .maplibregl-ctrl-group',
    ),
    centerMapButton = document.createElement('button');
  centerMapButton.type = 'button';
  centerMapButton.className = 'map-center-control';
  centerMapButton.setAttribute('aria-label', tr('map.resetExtent'));
  centerMapButton.title = tr('map.resetExtent');
  centerMapButton.innerHTML = '<i data-lucide="locate-fixed"></i>';
  window.renderLucideIcons?.();
  const resetExtent = () => {
    const bounds = new maplibregl.LngLatBounds();
    dataset.legends.features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
    if (!bounds.isEmpty())
      map.fitBounds(bounds, { padding: { top: 80, right: 45, bottom: 70, left: 45 }, duration: 0 });
  };
  centerMapButton.addEventListener('click', resetExtent);
  navigationGroup?.append(centerMapButton);
  const uncertaintyButton = document.createElement('button');
  uncertaintyButton.type = 'button';
  uncertaintyButton.className = 'map-uncertainty-control';
  uncertaintyButton.replaceChildren(
    createElement(MapPin, { width: 18, height: 18, 'stroke-width': 1.8, 'aria-hidden': 'true' }),
  );
  navigationGroup?.append(uncertaintyButton);
  const syncUncertaintyButton = () => {
    const label = tr('map.showUncertainty');
    uncertaintyButton.hidden = getMode() === 'heatmap';
    uncertaintyButton.title = label;
    uncertaintyButton.setAttribute('aria-label', label);
    uncertaintyButton.setAttribute('aria-pressed', String(uncertaintyToggle.checked));
  };
  uncertaintyButton.addEventListener('click', () => {
    uncertaintyToggle.checked = !uncertaintyToggle.checked;
    uncertaintyToggle.dispatchEvent(new Event('change'));
  });
  syncUncertaintyButton();
  window.addEventListener('ui-language-change', syncUncertaintyButton);
  const fullscreenButton = document.createElement('button');
  fullscreenButton.type = 'button';
  fullscreenButton.className = 'map-fullscreen-control';
  navigationGroup?.append(fullscreenButton);
  const fullscreenActive = () =>
    document.fullscreenElement === mapWorkspace || mapWorkspace.classList.contains('is-fullscreen');
  const syncFullscreen = () => {
    const active = fullscreenActive(),
      label = tr(active ? 'map.exitFullscreen' : 'map.enterFullscreen');
    fullscreenButton.title = label;
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.setAttribute('aria-pressed', String(active));
    fullscreenButton.replaceChildren(
      createElement(active ? Minimize : Maximize, {
        width: 18,
        height: 18,
        'stroke-width': 1.8,
        'aria-hidden': 'true',
      }),
    );
    document.body.classList.toggle('map-fullscreen-active', active);
    window.renderLucideIcons?.();
    requestAnimationFrame(() => map.resize());
    window.setTimeout(() => map.resize(), 220);
  };
  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement === mapWorkspace) await document.exitFullscreen();
    else if (mapWorkspace.classList.contains('is-fullscreen'))
      mapWorkspace.classList.remove('is-fullscreen');
    else {
      try {
        if (!mapWorkspace.requestFullscreen) throw new Error('Fullscreen unavailable');
        await mapWorkspace.requestFullscreen();
      } catch {
        mapWorkspace.classList.add('is-fullscreen');
      }
    }
    syncFullscreen();
  });
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mapWorkspace.classList.contains('is-fullscreen')) {
      mapWorkspace.classList.remove('is-fullscreen');
      syncFullscreen();
      fullscreenButton.focus();
    }
  });
  syncFullscreen();
  for (const [selector, icon] of [
    ['.maplibregl-ctrl-zoom-in', 'plus'],
    ['.maplibregl-ctrl-zoom-out', 'minus'],
  ]) {
    const button = page.querySelector<HTMLButtonElement>(selector);
    if (button) button.innerHTML = `<i data-lucide="${icon}"></i>`;
  }
  window.renderLucideIcons?.();
  requestAnimationFrame(() => {
    const label = tr('map.resetExtent');
    centerMapButton.setAttribute('aria-label', label);
    centerMapButton.title = label;
  });
  map.addControl(
    new maplibregl.AttributionControl({
      compact: true,
    }),
    'bottom-right',
  );

  return { centerMapButton, resetExtent, syncUncertaintyButton, syncFullscreen };
}
