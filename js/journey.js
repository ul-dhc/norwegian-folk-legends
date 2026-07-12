const JOURNEY_FLIGHT_MS = 3200;
const JOURNEY_JUMP_MS = 4600;
const JOURNEY_HUB_PAUSE_BASE_MS = 1800;
const JOURNEY_TRAIL_MAX = 300;
const JOURNEY_CLICK_RADIUS = 16;

const JOURNEY_ZOOM = { collector: 6.4, place: 8.2, category: 6.4, legend: 10 };

const JOURNEY_COLORS = {
  collector: '#FFC857',
  place: '#5EA8FF',
  category: '#5EEAD4',
  legend: '#FF7AC6',
};

const JOURNEY_FLIGHT_CAPTIONS = {
  collector: 'Seeking a collector…',
  place: 'Traveling to a place…',
  category: 'Following the thread…',
  legend: 'Arriving at a legend…',
  jump: 'Crossing the void…',
};

const JOURNEY_COLLECTOR_PHRASES = [
  'Now I will take you to {name}, who collected {count} legends across Norway.',
  '{name} gathered {count} legends from across the land. Follow the thread…',
  'Let us seek out {name} – {count} legends passed through their hands.',
];

const JOURNEY_PLACE_PHRASES = [
  'We arrive in {place}. {count} legend{s} were recorded in this surroundings. Let\u2019s go to one of them…',
  'Follow the thread to {place} – home to {count} recorded legend{s}.',
  'The path leads to {place}, where {count} legend{s} once were told.',
];

const JOURNEY_CATEGORY_PHRASES = [
  '{count} legends about \u201c{title}\u201d have been collected. Let\u2019s hear another…',
  'This story belongs to a wider circle – \u201c{title}\u201d, {count} legends strong. Follow the thread to one more…',
  'Many told of \u201c{title}\u201d – {count} legends in all. Here is another…',
];

let journeyMap = null;
let journeyCanvas = null;
let journeyCtx = null;
let journeyRAFId = null;
let journeyPlaying = false;
let journeyIdle = true;
let journeyFlightTimer = null;
let journeyDwellTimer = null;
let journeyStep = 'collector';
let journeyCurrent = null;
let journeyFlight = null;
let journeyTrail = [];
let journeyEdges = [];
let journeyRecentCollectors = [];
let journeyCollectors = [];
let journeyCategories = [];
let journeyPlaces = {};
let journeyMemory = {};
let journeyStatsReady = false;
let journeyMusicOn = false;

function journeyCoords(d) {
  const sla = parseFloat(d.sted_lat);
  const slo = parseFloat(d.sted_lon);
  if (sla && slo && !isNaN(sla) && !isNaN(slo)) return { lat: sla, lon: slo };
  const fla = parseFloat(d.fylke_lat);
  const flo = parseFloat(d.fylke_lon);
  if (fla && flo && !isNaN(fla) && !isNaN(flo)) return { lat: fla, lon: flo };
  return null;
}

function journeyPlaceKey(d) {
  return (d.sted || d.fylke || '').trim();
}

function journeyCentroid(items) {
  const lat = items.reduce((s, i) => s + i.coords.lat, 0) / items.length;
  const lon = items.reduce((s, i) => s + i.coords.lon, 0) / items.length;
  return { lat, lon };
}

function buildJourneyStats() {
  if (journeyStatsReady || !allData.length) return;
  const collMap = {};
  const catMap = {};
  const placeMap = {};
  allData.forEach((d) => {
    const coords = journeyCoords(d);
    if (!coords) return;
    const s = (d.samler || '').trim();
    if (s && s !== 'nan') {
      if (!collMap[s]) collMap[s] = { name: s, items: [] };
      collMap[s].items.push({ d, coords });
    }
    const m = (d.ml_code || '').trim();
    if (m && m !== 'nan') {
      if (!catMap[m]) catMap[m] = { code: m, title: d.ml_title || m, items: [] };
      catMap[m].items.push({ d, coords });
    }
    const p = journeyPlaceKey(d);
    if (p && p !== 'nan') {
      if (!placeMap[p]) placeMap[p] = { name: p, items: [] };
      placeMap[p].items.push({ d, coords });
    }
  });
  journeyCollectors = Object.values(collMap)
    .filter((c) => c.items.length >= 2)
    .map((c) => ({
      name: c.name,
      items: c.items,
      count: c.items.length,
      centroid: journeyCentroid(c.items),
    }))
    .sort((a, b) => b.count - a.count);
  journeyCategories = Object.values(catMap)
    .filter((c) => c.items.length >= 2)
    .map((c) => ({
      code: c.code,
      title: c.title,
      items: c.items,
      count: c.items.length,
      centroid: journeyCentroid(c.items),
    }));
  journeyPlaces = {};
  Object.values(placeMap).forEach((p) => {
    journeyPlaces[p.name] = {
      name: p.name,
      items: p.items,
      count: p.items.length,
      centroid: journeyCentroid(p.items),
    };
  });
  journeyStatsReady = journeyCollectors.length > 0;
  updateJourneyButtons();
}

function journeyPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function journeyWeightedTopPick(sortedArr, topN, excludeNames) {
  const pool = sortedArr.filter((c) => !excludeNames.includes(c.name)).slice(0, topN);
  return journeyPick(pool.length ? pool : sortedArr);
}

function journeyNarrate(templates, ctx) {
  const withPlural = { ...ctx, s: ctx.count === 1 ? '' : 's' };
  const tpl = journeyPick(templates);
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (withPlural[k] != null ? withPlural[k] : ''));
}

function journeyMkNode(type, coords, story) {
  return { type, lat: coords.lat, lon: coords.lon, story };
}

function journeyMkLegendNode(pick) {
  return { type: 'legend', lat: pick.coords.lat, lon: pick.coords.lon, item: pick.d };
}

function initJourneyCanvas() {
  journeyCanvas = document.getElementById('journey-glow-canvas');
  journeyCtx = journeyCanvas.getContext('2d');
  resizeJourneyCanvas();
}

function resizeJourneyCanvas() {
  if (!journeyCanvas) return;
  const wrap = document.getElementById('journey-map-container');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  journeyCanvas.width = rect.width * dpr;
  journeyCanvas.height = rect.height * dpr;
  journeyCanvas.style.width = rect.width + 'px';
  journeyCanvas.style.height = rect.height + 'px';
  journeyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initJourney() {
  if (journeyMap) {
    setTimeout(() => journeyMap.invalidateSize(), 50);
    startJourneyRAF();
    updateJourneyButtons();
    return;
  }
  journeyMap = L.map('journey-map-container', {
    zoomControl: false,
    attributionControl: true,
    worldCopyJump: true,
  }).setView([65, 15], 5);
  L.tileLayer(MAP_LAYERS.dark, {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 14,
    keepBuffer: 6,
  }).addTo(journeyMap);
  initJourneyCanvas();
  window.addEventListener('resize', resizeJourneyCanvas);
  journeyMap.on('move', drawJourneyOverlay);
  journeyMap.on('zoom', drawJourneyOverlay);
  journeyMap.on('click', handleJourneyClick);
  document.addEventListener('fullscreenchange', onJourneyFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onJourneyFullscreenChange);
  startJourneyRAF();
  buildJourneyStats();
  updateJourneyButtons();
}

function startJourneyRAF() {
  if (journeyRAFId) return;
  const loop = () => {
    drawJourneyOverlay();
    journeyRAFId = requestAnimationFrame(loop);
  };
  journeyRAFId = requestAnimationFrame(loop);
}

function stopJourneyRAF() {
  if (journeyRAFId) cancelAnimationFrame(journeyRAFId);
  journeyRAFId = null;
}

function journeyProject(lat, lon) {
  const p = journeyMap.latLngToContainerPoint([lat, lon]);
  return { x: p.x, y: p.y };
}

function journeyBezier(from, to) {
  const midLat = (from.lat + to.lat) / 2;
  const midLon = (from.lon + to.lon) / 2;
  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;
  const bulge = Math.min(6, Math.hypot(dx, dy) * 0.18);
  const nx = -dy;
  const ny = dx;
  const norm = Math.hypot(nx, ny) || 1;
  const ctrlLat = midLat + (ny / norm) * bulge;
  const ctrlLon = midLon + (nx / norm) * bulge;
  return (tt) => ({
    lat: (1 - tt) * (1 - tt) * from.lat + 2 * (1 - tt) * tt * ctrlLat + tt * tt * to.lat,
    lon: (1 - tt) * (1 - tt) * from.lon + 2 * (1 - tt) * tt * ctrlLon + tt * tt * to.lon,
  });
}

function journeyHexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function drawJourneyOverlay() {
  if (!journeyCtx || !journeyMap) return;
  const wrap = document.getElementById('journey-map-container');
  const rect = wrap.getBoundingClientRect();
  journeyCtx.clearRect(0, 0, rect.width, rect.height);

  const now = performance.now();

  journeyEdges.forEach((edge) => {
    const settle = Math.min(1, (now - edge.t) / 500);
    const bez = journeyBezier(edge.from, edge.to);
    journeyCtx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const pp = bez(i / steps);
      const p = journeyProject(pp.lat, pp.lon);
      if (i === 0) journeyCtx.moveTo(p.x, p.y);
      else journeyCtx.lineTo(p.x, p.y);
    }
    journeyCtx.strokeStyle = `rgba(${journeyHexToRgb(edge.color)},${0.32 * settle})`;
    journeyCtx.lineWidth = 1.1;
    journeyCtx.stroke();
  });

  journeyTrail.forEach((pt) => {
    const settle = Math.min(1, (now - pt.t) / 500);
    const p = journeyProject(pt.lat, pt.lon);
    const color = JOURNEY_COLORS[pt.type];
    const r = pt.type === 'legend' ? 4.5 : 3.5;
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
    journeyCtx.fillStyle = `rgba(${journeyHexToRgb(color)},${0.85 * settle})`;
    journeyCtx.fill();
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
    journeyCtx.strokeStyle = `rgba(${journeyHexToRgb(color)},${0.35 * settle})`;
    journeyCtx.lineWidth = 1;
    journeyCtx.stroke();
  });

  if (journeyFlight) {
    const t = Math.min(1, (now - journeyFlight.start) / journeyFlight.duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const bez = journeyBezier(journeyFlight.from, journeyFlight.to);
    const color = JOURNEY_COLORS[journeyFlight.type] || '#c8e1ff';
    const rgb = journeyHexToRgb(color);

    journeyCtx.beginPath();
    const steps = 40;
    const drawSteps = Math.max(1, Math.round(steps * ease));
    for (let i = 0; i <= drawSteps; i++) {
      const pp = bez(i / steps);
      const p = journeyProject(pp.lat, pp.lon);
      if (i === 0) journeyCtx.moveTo(p.x, p.y);
      else journeyCtx.lineTo(p.x, p.y);
    }
    journeyCtx.strokeStyle = `rgba(${rgb},0.7)`;
    journeyCtx.lineWidth = 1.6;
    journeyCtx.stroke();

    const head = bez(Math.min(1, ease));
    const hp = journeyProject(head.lat, head.lon);
    const grad = journeyCtx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 14);
    grad.addColorStop(0, `rgba(${rgb},0.9)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    journeyCtx.beginPath();
    journeyCtx.arc(hp.x, hp.y, 14, 0, Math.PI * 2);
    journeyCtx.fillStyle = grad;
    journeyCtx.fill();
    journeyCtx.beginPath();
    journeyCtx.arc(hp.x, hp.y, 3, 0, Math.PI * 2);
    journeyCtx.fillStyle = '#fff';
    journeyCtx.fill();

    if (t >= 1) journeyFlight = null;
  }

  if (journeyCurrent) {
    const p = journeyProject(journeyCurrent.lat, journeyCurrent.lon);
    const color = JOURNEY_COLORS[journeyCurrent.type];
    const rgb = journeyHexToRgb(color);
    const pulse = 6 + Math.sin(now / 260) * 2.5;
    const grad = journeyCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulse * 3);
    grad.addColorStop(0, `rgba(${rgb},0.55)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, pulse * 3, 0, Math.PI * 2);
    journeyCtx.fillStyle = grad;
    journeyCtx.fill();
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    journeyCtx.fillStyle = '#fff';
    journeyCtx.fill();
  }
}

function handleJourneyClick(e) {
  const clickPt = e.containerPoint;
  let closest = null;
  let closestDist = JOURNEY_CLICK_RADIUS;
  journeyTrail.forEach((pt) => {
    const p = journeyProject(pt.lat, pt.lon);
    const d = Math.hypot(p.x - clickPt.x, p.y - clickPt.y);
    if (d < closestDist) {
      closestDist = d;
      closest = pt;
    }
  });
  if (!closest) return;
  if (closest.type === 'legend') {
    setJourneyCaption('');
    showJourneyTextPanel(closest.item);
  } else {
    hideJourneyTextPanel();
    setJourneyCaption(closest.story);
  }
}

function setJourneyCaption(text) {
  const el = document.getElementById('journey-caption');
  if (!el) return;
  if (!text) {
    el.classList.remove('show');
    return;
  }
  el.textContent = text;
  el.classList.add('show');
}

function showJourneyTextPanel(d) {
  const panel = document.getElementById('journey-textpanel');
  if (!panel) return;
  const hasTr = d.english_translation && d.english_translation.trim();
  const yr = cleanY(d.år_clean);
  const title = d.tittel || d.ml_title || d.id;
  const sub = [d.sted, d.fylke, yr].filter(Boolean).join(' · ');
  const meta = [
    d.samler ? `Collected by ${esc(d.samler)}` : '',
    d.informant ? `told by ${esc(d.informant)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  panel.innerHTML = `
    ${d.ml_code ? `<span class="journey-mlb">${esc(d.ml_code)}</span>` : ''}
    <div class="journey-tp-title">${esc(title)}</div>
    <div class="journey-tp-sub">${esc(sub)}</div>
    <div class="journey-tp-text">${esc(d.tekst || '')}</div>
    ${hasTr ? `<div class="journey-tp-text journey-tp-en">${esc(d.english_translation)}</div>` : ''}
    ${meta ? `<div class="journey-tp-meta">${meta}</div>` : ''}
  `;
  panel.classList.add('show');
}

function hideJourneyTextPanel() {
  const panel = document.getElementById('journey-textpanel');
  if (panel) panel.classList.remove('show');
}

function journeyFlyTo(target, isJump) {
  clearTimeout(journeyFlightTimer);
  const from = journeyCurrent || target;
  const duration = isJump ? JOURNEY_JUMP_MS : JOURNEY_FLIGHT_MS;
  journeyFlight = {
    from: { lat: from.lat, lon: from.lon },
    to: { lat: target.lat, lon: target.lon },
    start: performance.now(),
    duration,
    type: target.type,
  };
  setJourneyCaption(JOURNEY_FLIGHT_CAPTIONS[isJump ? 'jump' : target.type] || '');
  hideJourneyTextPanel();
  const zoom = isJump ? JOURNEY_ZOOM.collector - 1.2 : JOURNEY_ZOOM[target.type];
  journeyMap.flyTo([target.lat, target.lon], zoom, {
    duration: duration / 1000,
    easeLinearity: 0.3,
  });
  journeyFlightTimer = setTimeout(() => journeyArrive(target), duration);
}

function journeyArrive(target) {
  if (journeyCurrent) {
    journeyEdges.push({
      from: { lat: journeyCurrent.lat, lon: journeyCurrent.lon },
      to: { lat: target.lat, lon: target.lon },
      color: JOURNEY_COLORS[target.type],
      t: performance.now(),
    });
  }
  journeyCurrent = target;
  journeyTrail.push({
    lat: target.lat,
    lon: target.lon,
    type: target.type,
    story: target.story,
    item: target.item,
    t: performance.now(),
  });
  if (journeyTrail.length > JOURNEY_TRAIL_MAX) journeyTrail.shift();
  journeyIdle = true;
  let dwell = JOURNEY_HUB_PAUSE_BASE_MS;
  if (target.type === 'legend') {
    setJourneyCaption('');
    showJourneyTextPanel(target.item);
    const len = ((target.item.tekst || '') + (target.item.english_translation || '')).length;
    dwell = Math.max(7000, Math.min(15000, 6500 + len * 12));
  } else {
    hideJourneyTextPanel();
    setJourneyCaption(target.story);
    dwell = Math.max(
      4200,
      Math.min(8000, JOURNEY_HUB_PAUSE_BASE_MS + (target.story || '').length * 35),
    );
  }
  journeyDwellTimer = setTimeout(() => {
    if (journeyPlaying) journeyAdvance();
  }, dwell);
}

function journeyAdvance() {
  journeyIdle = false;
  let target;
  if (journeyStep === 'collector') {
    const c = journeyWeightedTopPick(journeyCollectors, 20, journeyRecentCollectors);
    journeyRecentCollectors.push(c.name);
    if (journeyRecentCollectors.length > 6) journeyRecentCollectors.shift();
    journeyMemory.collector = c;
    const story = journeyNarrate(JOURNEY_COLLECTOR_PHRASES, { name: c.name, count: c.count });
    target = journeyMkNode('collector', c.centroid, story);
    journeyStep = 'place';
  } else if (journeyStep === 'place') {
    const c = journeyMemory.collector;
    const itemPick = journeyPick(c.items);
    const placeName = journeyPlaceKey(itemPick.d);
    const p = journeyPlaces[placeName] || {
      name: placeName,
      items: [itemPick],
      count: 1,
      centroid: itemPick.coords,
    };
    journeyMemory.place = p;
    const story = journeyNarrate(JOURNEY_PLACE_PHRASES, { place: placeName, count: p.count });
    target = journeyMkNode('place', p.centroid, story);
    journeyStep = 'legendA';
  } else if (journeyStep === 'legendA') {
    const p = journeyMemory.place;
    const byCollector = p.items.filter((i) => i.d.samler === journeyMemory.collector.name);
    const pick = journeyPick(byCollector.length ? byCollector : p.items);
    journeyMemory.legendA = pick;
    target = journeyMkLegendNode(pick);
    journeyStep = 'category';
  } else if (journeyStep === 'category') {
    const ml = (journeyMemory.legendA.d.ml_code || '').trim();
    const cat = journeyCategories.find((x) => x.code === ml) || journeyPick(journeyCategories);
    journeyMemory.category = cat;
    const story = journeyNarrate(JOURNEY_CATEGORY_PHRASES, { title: cat.title, count: cat.count });
    target = journeyMkNode('category', cat.centroid, story);
    journeyStep = 'legendB';
  } else {
    const cat = journeyMemory.category;
    const excludeId = journeyMemory.legendA.d.id;
    const pool = cat.items.filter((x) => x.d.id !== excludeId);
    const pick = journeyPick(pool.length ? pool : cat.items);
    target = journeyMkLegendNode(pick);
    journeyStep = 'collector';
  }
  journeyFlyTo(target, false);
}

function updateJourneyButtons() {
  const playBtn = document.getElementById('jny-play');
  const stopBtn = document.getElementById('jny-stop');
  const jumpBtn = document.getElementById('jny-jump');
  if (!playBtn) return;
  playBtn.classList.toggle('on', journeyPlaying);
  playBtn.textContent = journeyPlaying ? '⏸ Pause' : '▶ Play';
  stopBtn.disabled = !journeyPlaying;
  jumpBtn.disabled = !journeyStatsReady;
  playBtn.disabled = !journeyStatsReady;
}

function journeyPlay() {
  if (!journeyStatsReady) buildJourneyStats();
  if (!journeyStatsReady) return;
  journeyPlaying = true;
  updateJourneyButtons();
  if (journeyIdle) journeyAdvance();
}

function journeyStop() {
  journeyPlaying = false;
  clearTimeout(journeyDwellTimer);
  updateJourneyButtons();
}

function journeyJump() {
  if (!journeyStatsReady) buildJourneyStats();
  if (!journeyStatsReady) return;
  clearTimeout(journeyDwellTimer);
  clearTimeout(journeyFlightTimer);
  journeyPlaying = true;
  updateJourneyButtons();
  const exclude = journeyRecentCollectors.slice(-3);
  let pool = journeyCollectors.filter((c) => !exclude.includes(c.name));
  if (!pool.length) pool = journeyCollectors;
  const c = journeyPick(pool);
  journeyRecentCollectors.push(c.name);
  if (journeyRecentCollectors.length > 6) journeyRecentCollectors.shift();
  journeyMemory.collector = c;
  journeyStep = 'place';
  const story = journeyNarrate(JOURNEY_COLLECTOR_PHRASES, { name: c.name, count: c.count });
  journeyFlyTo(journeyMkNode('collector', c.centroid, story), true);
}

function toggleJourneyFullscreen() {
  const el = document.getElementById('panel-journey');
  const isFs = document.fullscreenElement || document.webkitFullscreenElement;
  if (!isFs) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

function onJourneyFullscreenChange() {
  const btn = document.getElementById('jny-fullscreen');
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (btn) btn.textContent = isFs ? '⤡ Exit' : '⛶ Fullscreen';
  setTimeout(() => {
    resizeJourneyCanvas();
    if (journeyMap) journeyMap.invalidateSize();
  }, 60);
}

let journeyAudioEl = null;
let journeyFadeRAF = null;

function journeyFadeAudio(target, duration) {
  if (!journeyAudioEl) return;
  cancelAnimationFrame(journeyFadeRAF);
  const start = journeyAudioEl.volume;
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    journeyAudioEl.volume = start + (target - start) * t;
    if (t < 1) {
      journeyFadeRAF = requestAnimationFrame(step);
    } else if (target === 0) {
      journeyAudioEl.pause();
    }
  };
  journeyFadeRAF = requestAnimationFrame(step);
}

function toggleJourneyMusic() {
  if (!journeyAudioEl) journeyAudioEl = document.getElementById('journey-audio');
  journeyMusicOn = !journeyMusicOn;
  const btn = document.getElementById('jny-music');
  if (btn) btn.classList.toggle('on', journeyMusicOn);
  if (journeyMusicOn) {
    journeyAudioEl.volume = 0;
    journeyAudioEl.play().catch(() => {});
    journeyFadeAudio(0.35, 2000);
  } else {
    journeyFadeAudio(0, 1200);
  }
}

function pauseJourneyMusic() {
  if (journeyMusicOn) toggleJourneyMusic();
}
