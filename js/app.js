const VALID_TABS = ['browse', 'search', 'map', 'journey', 'network', 'timeline', 'mlindex', 'about'];

function tabFromHash() {
  const tab = location.hash.slice(1);
  return VALID_TABS.includes(tab) ? tab : 'browse';
}

function switchTab(tab, skipHash) {
  const prevTab = curTab;
  curTab = tab;
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.querySelector(`.nav-tab[data-tab="${tab}"]`).classList.add('active');
  if (!skipHash && location.hash.slice(1) !== tab) {
    location.hash = tab;
  }
  if (tab === 'map') {
    setTimeout(() => {
      initMap();
      mapInst && mapInst.invalidateSize();
    }, 50);
  }
  if (tab === 'journey') {
    setTimeout(initJourney, 50);
  } else if (prevTab === 'journey') {
    journeyStop();
    stopJourneyRAF();
    pauseJourneyMusic();
  }
  if (tab === 'network' && allData.length) {
    setTimeout(() => {
      initNetCanvas();
      initNetSidebar();
      renderNetwork();
    }, 150);
  }
  if (tab === 'timeline' && allData.length) renderTimeline();
  if (tab === 'mlindex' && allData.length) setTimeout(initMLIndex, 50);
}

window.addEventListener('hashchange', () => {
  const tab = tabFromHash();
  if (tab !== curTab) switchTab(tab, true);
});

document.addEventListener('DOMContentLoaded', () => {
  const tab = tabFromHash();
  if (tab !== 'browse') switchTab(tab, true);
});
