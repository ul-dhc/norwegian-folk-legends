function toggleMapFilters() {
  const b = document.getElementById('map-filter-body');
  const a = document.getElementById('map-filter-arrow');
  const open = b.classList.toggle('open');
  a.textContent = open ? '▾' : '▸';
}

function initMap() {
  if (mapInst) return;
  mapInst = L.map('map-container', {
    zoomControl: false,
  }).setView([65, 15], 5);
  mapLayerObj = L.tileLayer(MAP_LAYERS.light, {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 14,
  }).addTo(mapInst);
  L.control
    .zoom({
      position: 'bottomright',
    })
    .addTo(mapInst);
  renderMapMarkers();
  initMapDrag();
}

function setMapLayer(name) {
  curMapLayer = name;
  if (mapLayerObj) mapInst.removeLayer(mapLayerObj);
  const attr =
    name === 'satellite' ? '© Esri' : name === 'topo' ? '© OpenTopoMap' : '© OpenStreetMap © CARTO';
  mapLayerObj = L.tileLayer(MAP_LAYERS[name], {
    attribution: attr,
    maxZoom: 14,
  }).addTo(mapInst);
  document.querySelectorAll('.map-layer-opt').forEach((el) => {
    el.classList.toggle('on', el.dataset.layer === name);
  });
  document.getElementById('map-layer-menu').classList.remove('open');
}

function toggleLayerMenu() {
  document.getElementById('map-layer-menu').classList.toggle('open');
}

function getMapData() {
  const mls = MSM.ml;
  const fylkes = MSM.fylke;
  const samlerSet = MSM.samler;
  const infSet = MSM.informant;
  const yF = parseInt(document.getElementById('mf-yr-from')?.value) || 0;
  const yT = parseInt(document.getElementById('mf-yr-to')?.value) || 9999;
  return allData.filter((d) => {
    if (mls.size > 0 && !mls.has(d.ml_code)) return false;
    if (fylkes.size > 0 && !fylkes.has(d.fylke)) return false;
    if (samlerSet.size > 0 && !samlerSet.has(d.samler)) return false;
    if (infSet.size > 0 && !infSet.has(d.informant)) return false;
    const y = cleanY(d.år_clean);
    if (y && (y < yF || y > yT)) return false;
    return true;
  });
}

function renderMapMarkers() {
  if (!mapInst) return;
  if (mapMarkerLayer) {
    mapMarkerLayer.clearLayers();
  }
  if (mapHeatLayer) {
    mapInst.removeLayer(mapHeatLayer);
    mapHeatLayer = null;
  }
  document.getElementById('map-heat-ctrl').className =
    'map-heat-ctrl' + (mapMode === 'heat' ? ' show' : '');
  const data = getMapData();
  const latK = mapMode === 'place' ? 'sted_lat' : 'fylke_lat';
  const lonK = mapMode === 'place' ? 'sted_lon' : 'fylke_lon';
  if (mapMode === 'heat') {
    if (curMapLayer === 'light') {
      if (mapLayerObj) mapInst.removeLayer(mapLayerObj);
      mapLayerObj = L.tileLayer(MAP_LAYERS.dark, {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 14,
      }).addTo(mapInst);
    }
    const countyPts = {};
    data.forEach((d) => {
      const la = parseFloat(d.fylke_lat),
        lo = parseFloat(d.fylke_lon);
      if (!la || !lo || isNaN(la) || isNaN(lo)) return;
      const k = d.fylke || '';
      if (!countyPts[k])
        countyPts[k] = {
          lat: la,
          lon: lo,
          count: 0,
        };
      countyPts[k].count++;
    });
    const maxCount = Math.max(...Object.values(countyPts).map((p) => p.count), 1);
    const pts = Object.values(countyPts).map((p) => [p.lat, p.lon, p.count / maxCount]);
    const radius = parseInt(document.getElementById('heat-radius')?.value || 40);
    const blur = parseInt(document.getElementById('heat-blur')?.value || 30);
    if (L.heatLayer) {
      mapHeatLayer = L.heatLayer(pts, {
        radius: radius,
        blur: blur,
        maxZoom: 8,
        max: 1,
        minOpacity: 0.5,
        gradient: {
          0: '#00007F',
          0.2: '#0000FF',
          0.4: '#00FFFF',
          0.55: '#00FF00',
          0.7: '#FFFF00',
          0.85: '#FF6600',
          1: '#FF0000',
        },
      }).addTo(mapInst);
    }
    return;
  }
  if (
    curMapLayer === 'light' &&
    mapLayerObj &&
    mapLayerObj._url &&
    mapLayerObj._url.includes('dark')
  ) {
    mapInst.removeLayer(mapLayerObj);
    mapLayerObj = L.tileLayer(MAP_LAYERS.light, {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 14,
    }).addTo(mapInst);
  }
  if (!mapMarkerLayer) mapMarkerLayer = L.layerGroup().addTo(mapInst);
  else mapMarkerLayer.clearLayers();
  const colorMap = {
    'Naturmytiske sagn': '#B9CAE7',
    'Historiske sagn': '#D8A8B3',
  };
  const grouped = {};
  data.forEach((d) => {
    const la = parseFloat(d[latK]),
      lo = parseFloat(d[lonK]);
    if (!la || !lo || isNaN(la) || isNaN(lo)) return;
    const key = `${la.toFixed(3)},${lo.toFixed(3)}`;
    if (!grouped[key])
      grouped[key] = {
        lat: la,
        lon: lo,
        items: [],
      };
    grouped[key].items.push(d);
  });
  Object.values(grouped).forEach((g) => {
    const color = g.items.length === 1 ? colorMap[g.items[0].undersjanger] || '#B9CAE7' : '#1F396C';
    const sz = mapMode === 'county' ? Math.max(10, Math.min(28, g.items.length / 5)) : 8;
    const m = L.circleMarker([g.lat, g.lon], {
      radius: sz,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.85,
    });
    const locName =
      mapMode === 'county'
        ? g.items[0].fylke || g.items[0].sted
        : g.items[0].sted || g.items[0].fylke;
    m.on('click', () => showMapSide(g.items, locName));
    mapMarkerLayer.addLayer(m);
  });
}

function updateHeat() {
  if (mapMode === 'heat') renderMapMarkers();
}

function showMapSide(items, locName) {
  const side = document.getElementById('map-side');
  const inner = document.getElementById('map-side-inner');
  side.classList.add('open');
  setTimeout(() => mapInst && mapInst.invalidateSize(), 260);
  if (items.length === 1) {
    renderMapSideCard(items[0], inner, null);
  } else {
    inner.innerHTML = `\n      <button class="map-side-close" onclick="closeMapSide()">×</button>\n      <div style="font-size:14px;font-weight:500;color:var(--tp);margin-bottom:3px">${esc(locName || '')}</div>\n      <div style="font-size:12px;color:var(--tm);margin-bottom:10px">${items.length} legends – click to read</div>\n      ${items
      .map((d, i) => {
        const yr = cleanY(d.år_clean);
        return `\n        <div class="map-side-list-item" onclick="showMapSideItem(${i})">\n          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">\n            <span class="mlb" style="background:${mlC(d.ml_code)}30;color:${mlT(d.ml_code)};font-size:9px">${esc(d.ml_code || '')}</span>\n            <span style="font-size:12px;font-weight:500;color:var(--tp)">${esc(d.tittel || d.ml_title || d.id)}</span>\n          </div>\n          <span style="font-size:11px;color:var(--tm)">${yr ? yr + ' · ' : ''}${esc(d.undersjanger || '')} · ${esc(d.fylke || '')}</span>\n        </div>`;
      })
      .join('')}`;
    inner._items = items;
    inner._locName = locName;
  }
}

function showMapSideItem(i) {
  const inner = document.getElementById('map-side-inner');
  const items = inner._items;
  const locName = inner._locName;
  inner._backItems = items;
  inner._backLoc = locName;
  renderMapSideCard(items[i], inner, {
    items: items,
    locName: locName,
  });
}

function renderMapSideCard(d, inner, backRef) {
  const hasTr = d.english_translation && d.english_translation.trim();
  const yr = cleanY(d.år_clean);
  inner.innerHTML = `\n    <button class="map-side-close" onclick="closeMapSide()" style="position:absolute;top:12px;right:12px">×</button>\n    ${backRef ? `<button style="font-size:12px;color:var(--lu);background:none;border:none;cursor:pointer;padding:0;margin-bottom:8px;display:block" onclick="restoreMapList()">← Back to list</button>` : ''}\n    <div class="cpills" style="margin-bottom:8px">\n      <span class="mlb" style="background:${mlC(d.ml_code)}30;color:${mlT(d.ml_code)}">${esc(d.ml_code || '')}</span>\n      <span class="pill ${d.undersjanger === 'Naturmytiske sagn' ? 'pn' : 'ph'}">${esc(d.undersjanger || '')}</span>\n      ${yr ? `<span class="pill py">${yr}</span>` : ''}\n    </div>\n    <div style="font-size:14px;font-weight:500;color:var(--tp);margin-bottom:3px;padding-right:24px">${esc(d.tittel || d.ml_title || d.id)}</div>\n    <div style="font-size:12px;color:var(--tm);margin-bottom:10px">${[d.sted, d.fylke].filter(Boolean).map(esc).join(' · ')}</div>\n    <div class="tsl">Norwegian original</div>\n    <div class="tsb" style="margin-bottom:10px">${esc(d.tekst || '')}</div>\n    ${hasTr ? `<div class="tsl">English translation with AI</div><div class="tsb" style="margin-bottom:10px">${esc(d.english_translation)}</div>` : '<div class="tspend" style="margin-bottom:10px">Translation pending</div>'}\n    <div class="cmeta">\n      ${d.samler ? `<span class="mi"><strong>Collector</strong> ${esc(d.samler)}</span>` : ''}\n      ${d.informant ? `<span class="mi"><strong>Informant</strong> ${esc(d.informant)}</span>` : ''}\n      ${d.signatur ? `<span class="mi"><strong>Archive</strong> ${esc(d.signatur)}</span>` : ''}\n      ${d._url ? `<a class="srcl" href="${esc(d._url)}" target="_blank">View at UiO ↗</a>` : ''}\n    </div>`;
  if (backRef) {
    inner._items = backRef.items;
    inner._locName = backRef.locName;
  }
}

function restoreMapList() {
  const inner = document.getElementById('map-side-inner');
  if (inner._items) showMapSide(inner._items, inner._locName);
}

function closeMapSide() {
  document.getElementById('map-side').classList.remove('open');
  setTimeout(() => mapInst && mapInst.invalidateSize(), 260);
}

function setMapMode(m) {
  mapMode = m;
  ['place', 'county', 'heat'].forEach(
    (x) =>
      (document.getElementById('mbt-' + x).className = 'map-toggle-btn' + (x === m ? ' on' : '')),
  );
  renderMapMarkers();
}

function initMapDrag() {
  const drag = document.getElementById('map-drag');
  const side = document.getElementById('map-side');
  let dragging = false,
    startX = 0,
    startW = 0;
  drag.addEventListener('mousedown', (e) => {
    if (!side.classList.contains('open')) return;
    dragging = true;
    startX = e.clientX;
    startW = side.offsetWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const delta = startX - e.clientX;
    const newW = Math.max(260, Math.min(800, startW + delta));
    side.style.width = newW + 'px';
    mapInst && mapInst.invalidateSize();
  });
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  });
}
