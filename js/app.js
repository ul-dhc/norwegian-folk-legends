function switchTab(tab) {
  curTab = tab;
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.querySelector(`.nav-tab[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'map') {
    setTimeout(() => {
      initMap();
      mapInst && mapInst.invalidateSize();
    }, 50);
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
