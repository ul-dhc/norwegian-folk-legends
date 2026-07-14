Papa.parse(SHEET, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete(res) {
    allData = res.data.filter((r) => r.id && r.id.trim());
    samlers = [...new Set(allData.map((d) => d.samler).filter(Boolean))].sort();
    informants = [...new Set(allData.map((d) => d.informant).filter(Boolean))].sort();
    initDropdowns();
    applyFilters();
    document.getElementById('stats-b').textContent = allData.length.toLocaleString() + ' legends';
    if (curTab === 'timeline') renderTimeline();
    if (curTab === 'map') renderMapMarkers();
    if (curTab === 'mlindex') initMLIndex();
    buildJourneyStats();
    if (pendingLegendId) {
      openLegendModal(pendingLegendId);
      pendingLegendId = null;
    }
    setTimeout(() => {
      if (curTab === 'network') renderNetwork();
    }, 300);
  },
  error() {
    document.getElementById('browse-main').innerHTML =
      '<div class="loading" style="color:#A8AAA7">Failed to load data.</div>';
  },
});
