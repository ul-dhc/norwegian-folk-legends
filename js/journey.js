const JOURNEY_FLIGHT_MS = 4400;
const JOURNEY_JUMP_MS = 6200;
const JOURNEY_HUB_PAUSE_BASE_MS = 1800;
const JOURNEY_TRAIL_MAX = 300;
const JOURNEY_CLICK_RADIUS = 16;
const JOURNEY_SPOTLIGHT_HOLD_MS = 5200;
const JOURNEY_SPOTLIGHT_FADE_MS = 900;
const JOURNEY_SPOTLIGHT_SAMPLE = 14;

const JOURNEY_ZOOM = { collector: 6.4, place: 8.2, legend: 10 };

const JOURNEY_COLORS = {
  collector: '#FFC857',
  place: '#5EA8FF',
  category: '#5EEAD4',
  legend: '#FF7AC6',
};

const JOURNEY_FLIGHT_CAPTIONS = {
  collector: [
    'Following a collector\u2019s trail…',
    'Looking for the next collector…',
    'Tracing another collection…',
  ],
  place: [
    'Moving through the remembered landscape…',
    'Travelling toward the next place…',
    'Following the story back to its setting…',
  ],
  legend: [
    'Approaching another recorded encounter…',
    'Entering another telling…',
    'Bringing the next story into view…',
  ],
  jump: [
    'Crossing to a distant thread…',
    'Jumping to another part of the map…',
    'Leaving this trail for a new one…',
  ],
};

const JOURNEY_COLLECTOR_PHRASES = [
  'The trail leads to {name}, who preserved {count} legends gathered across Norway.',
  'Through {name}, {count} stories entered the written record. Let us follow one of their paths…',
  'We come to {name}\u2019s collection – {count} accounts carried to nowadays.',
  'Somewhere along the way, {name} gathered {count} legends – enough to leave a trace across the map.',
  'Behind {name} are {count} legends, each carrying a place, a voice, and something once believed.',
];

const JOURNEY_PLACE_PHRASES = [
  'We arrive in {place}, where {count} legend{s} were recorded. One of their voices is waiting…',
  'The thread settles in {place} – a landscape connected to {count} recorded legend{s}.',
  'Here is {place}, where {count} legend{s} were told, remembered, and written down.',
  'We stop in {place}. {count} legend{s} were recorded here.',
  'Next is {place}, with {count} legend{s} connected to it.',
];

const JOURNEY_PLACE_SINGULAR_PHRASES = [
  'We arrive in {place}, where a single legend was recorded. Let us hear it…',
  'The thread settles in {place} – just one legend was recorded here.',
  'Here is {place}, home to a single recorded legend.',
  'We stop in {place}. Only one legend was recorded here.',
  'Next is {place}, with one legend connected to it.',
];

const JOURNEY_CATEGORY_CONTEXT_PHRASES = [
  'A familiar motif returns: \u201c{title}\u201d. Let us follow it into another story…',
  'The next legend echoes the same theme – \u201c{title}\u201d…',
  'One story opens onto another through the thread of \u201c{title}\u201d…',
  'Another version of \u201c{title}\u201d appears here…',
  'We stay with \u201c{title}\u201d, but move into a different telling…',
];

const JOURNEY_CATEGORY_SPOTLIGHT_PHRASES = [
  'Across the map, {count} legends gather around the theme \u201c{title}\u201d.',
  'Let us pause with \u201c{title}\u201d – {count} related accounts, dispersed across Norway.',
  'A constellation takes shape: {count} legends connected by \u201c{title}\u201d.',
  'On the map, \u201c{title}\u201d appears in {count} different legends.',
  '{count} legends share this topic: \u201c{title}\u201d.',
];

const JOURNEY_COLLECTOR_SPOTLIGHT_PHRASES = [
  'The map widens around {name}, revealing {count} legends gathered across Norway.',
  'Seen together, {name}\u2019s {count} recorded legends form a path across the landscape.',
  'These points trace the work of {name}: {count} legends carried into the archive.',
  'Here is what {name} left behind – {count} legends, recorded in places across the country.',
  '{name} appears across the map through {count} collected legends.',
];

const JOURNEY_INTRO = [
  'This journey invites you into Norwegian folk legends as a living landscape. Mountains, waters, farms, roads, churches, and hidden places carry accounts of uncanny encounters and unseen beings.',
  'Here, the landscape is never only scenery. Each place becomes part of the story – somewhere the strange was sensed, interpreted, remembered, and retold.',
  'In the past, these accounts were presented as experiences that actually happened…',
  'The collection contains 1,477 legends recorded across Norway between 1832 and 1954.',
  'They survive through the work of {collectorCount} folk collectors, who travelled, listened, and wrote down what people told them – we can thank them for this heritage.',
  '…and we thank also professor Kyrre Kverndokk, who digitized and brought this collection online, some time ago.',
  'This journey offers another way through the archive – as a landscape to travel and explore through stories. And it is never the same.',
  'Follow the threads. We begin with a collector…',
];

let journeyMap = null;
let journeyCanvas = null;
let journeyCtx = null;
let journeyRAFId = null;
let journeyPlaying = false;
let journeyIdle = true;
let journeyDwellTimer = null;
let journeyStep = 'collector';
let journeyCurrent = null;
let journeyFlight = null;
let journeyBurst = null;
let journeyTrail = [];
let journeyEdges = [];
let journeyRecentCollectors = [];
let journeyCollectors = [];
let journeyCategories = [];
let journeyPlaces = {};
let journeyMemory = {};
let journeyStatsReady = false;
let journeyStarfield = [];
let journeyStarfieldActive = false;
let journeyStarfieldFadeUntil = null;
let journeyIntroDone = false;
let journeySkipNextFlightCaption = false;
let journeyPendingAdvanceFn = null;
let journeyIntroIndex = 0;
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
  buildJourneyStarfield();
  updateJourneyButtons();
}

function buildJourneyStarfield() {
  if (journeyStarfield.length || !allData.length) return;
  const colors = [
    JOURNEY_COLORS.collector,
    JOURNEY_COLORS.place,
    JOURNEY_COLORS.category,
    JOURNEY_COLORS.legend,
  ];
  const sample = [...allData].sort(() => Math.random() - 0.5).slice(0, 220);
  journeyStarfield = sample
    .map((d) => {
      const c = journeyCoords(d);
      if (!c) return null;
      return {
        lat: c.lat,
        lon: c.lon,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.001,
        flashAt: performance.now() + 1500 + Math.random() * 9000,
        flashDur: 350 + Math.random() * 250,
      };
    })
    .filter(Boolean);
  journeyStarfieldActive = true;
}

function deactivateJourneyStarfield() {
  if (!journeyStarfieldActive) return;
  journeyStarfieldActive = false;
  journeyStarfieldFadeUntil = performance.now() + 1500;
}

function journeyStarfieldAlpha(now) {
  if (journeyStarfieldActive) return 1;
  if (journeyStarfieldFadeUntil && now < journeyStarfieldFadeUntil) {
    return Math.max(0, (journeyStarfieldFadeUntil - now) / 1500);
  }
  return 0;
}

function journeyDrawStarfield(now) {
  const globalAlpha = journeyStarfieldAlpha(now);
  if (globalAlpha <= 0 || !journeyCtx) return;
  journeyStarfield.forEach((s) => {
    const p = journeyProject(s.lat, s.lon);
    const pulse = (Math.sin(now * s.speed + s.phase) + 1) / 2;
    let alpha = 0.06 + pulse * 0.2;
    let radius = 1.4 + pulse * 1.1;
    if (now >= s.flashAt) {
      const flashElapsed = now - s.flashAt;
      if (flashElapsed < s.flashDur) {
        const ft = flashElapsed / s.flashDur;
        const curve = ft < 0.3 ? ft / 0.3 : 1 - (ft - 0.3) / 0.7;
        alpha = Math.max(alpha, curve * 0.85);
        radius = Math.max(radius, 1.4 + curve * 2.4);
      } else {
        s.flashAt = now + 3500 + Math.random() * 7000;
        s.flashDur = 350 + Math.random() * 250;
      }
    }
    alpha *= globalAlpha;
    const rgb = journeyHexToRgb(s.color);
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    journeyCtx.fillStyle = `rgba(${rgb},${alpha})`;
    journeyCtx.fill();
  });
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

function journeySamplePoints(items, n, excludeCoords) {
  const filtered = items.filter(
    (i) => i.coords.lat !== excludeCoords.lat || i.coords.lon !== excludeCoords.lon,
  );
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function journeyBoundsFor(coordsList) {
  const lats = coordsList.map((c) => c.lat);
  const lons = coordsList.map((c) => c.lon);
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  );
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

function journeyDrawBurst(now) {
  if (!journeyBurst || !journeyCtx) return;
  const { center, points, color, start, holdMs, fadeMs } = journeyBurst;
  const elapsed = now - start;
  const total = holdMs + fadeMs;
  if (elapsed > total) {
    journeyBurst = null;
    return;
  }
  let alpha;
  if (elapsed < 500) alpha = elapsed / 500;
  else if (elapsed > holdMs) alpha = Math.max(0, 1 - (elapsed - holdMs) / fadeMs);
  else alpha = 1;
  const rgb = journeyHexToRgb(color);
  const cp = journeyProject(center.lat, center.lon);
  points.forEach((pt) => {
    const p = journeyProject(pt.lat, pt.lon);
    journeyCtx.beginPath();
    journeyCtx.moveTo(cp.x, cp.y);
    journeyCtx.lineTo(p.x, p.y);
    journeyCtx.strokeStyle = `rgba(${rgb},${0.4 * alpha})`;
    journeyCtx.lineWidth = 1;
    journeyCtx.stroke();
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
    journeyCtx.fillStyle = `rgba(${rgb},${0.8 * alpha})`;
    journeyCtx.fill();
  });
  journeyCtx.beginPath();
  journeyCtx.arc(cp.x, cp.y, 6, 0, Math.PI * 2);
  journeyCtx.fillStyle = `rgba(${rgb},${0.9 * alpha})`;
  journeyCtx.fill();
}

function drawJourneyOverlay() {
  if (!journeyCtx || !journeyMap) return;
  const wrap = document.getElementById('journey-map-container');
  const rect = wrap.getBoundingClientRect();
  journeyCtx.clearRect(0, 0, rect.width, rect.height);

  const now = performance.now();

  journeyDrawStarfield(now);

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

  journeyDrawBurst(now);

  if (journeyFlight) {
    const t = Math.min(1, (now - journeyFlight.start) / journeyFlight.duration);
    const bez = journeyBezier(journeyFlight.from, journeyFlight.to);
    const color = JOURNEY_COLORS[journeyFlight.type] || '#c8e1ff';
    const rgb = journeyHexToRgb(color);

    journeyCtx.beginPath();
    const steps = 40;
    const drawSteps = Math.max(1, Math.round(steps * t));
    for (let i = 0; i <= drawSteps; i++) {
      const pp = bez(i / steps);
      const p = journeyProject(pp.lat, pp.lon);
      if (i === 0) journeyCtx.moveTo(p.x, p.y);
      else journeyCtx.lineTo(p.x, p.y);
    }
    journeyCtx.strokeStyle = `rgba(${rgb},0.7)`;
    journeyCtx.lineWidth = 1.6;
    journeyCtx.stroke();

    const head = bez(t);
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

    if (t >= 1) {
      const arrivedTarget = journeyFlight.target;
      journeyFlight = null;
      journeyArrive(arrivedTarget);
    }
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

let journeyCaptionFadeTimer = null;
let journeyTypeInterval = null;

function journeyTypeCaption(el, text) {
  clearInterval(journeyTypeInterval);
  el.textContent = '';
  let i = 0;
  journeyTypeInterval = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(journeyTypeInterval);
  }, 26);
}

function setJourneyCaption(text) {
  const el = document.getElementById('journey-caption');
  if (!el) return;
  clearTimeout(journeyCaptionFadeTimer);
  clearInterval(journeyTypeInterval);
  if (!text) {
    el.classList.remove('show');
    return;
  }
  if (el.classList.contains('show') && el.textContent) {
    el.classList.remove('show');
    journeyCaptionFadeTimer = setTimeout(() => {
      el.classList.add('show');
      journeyTypeCaption(el, text);
    }, 700);
  } else {
    el.classList.add('show');
    journeyTypeCaption(el, text);
  }
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

function journeyFlyTo(target, isJump, captionOverride) {
  const from = journeyCurrent || target;
  const duration = isJump ? JOURNEY_JUMP_MS : JOURNEY_FLIGHT_MS;
  journeyFlight = {
    from: { lat: from.lat, lon: from.lon },
    to: { lat: target.lat, lon: target.lon },
    start: performance.now(),
    duration,
    type: target.type,
    target,
  };
  const captionPool = JOURNEY_FLIGHT_CAPTIONS[isJump ? 'jump' : target.type];
  if (journeySkipNextFlightCaption) {
    setJourneyCaption('');
    journeySkipNextFlightCaption = false;
  } else {
    setJourneyCaption(captionOverride || (captionPool ? journeyPick(captionPool) : ''));
  }
  hideJourneyTextPanel();
  const zoom = isJump ? JOURNEY_ZOOM.collector - 1.2 : JOURNEY_ZOOM[target.type];
  journeyVeilPulse(duration);
  journeyMap.flyTo([target.lat, target.lon], zoom, {
    duration: duration / 1000,
    easeLinearity: 0.2,
  });
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
      4800,
      Math.min(9500, 2200 + (target.story || '').length * 38),
    );
  }
  journeyPendingAdvanceFn = journeyAdvance;
  journeyDwellTimer = setTimeout(() => {
    if (journeyPlaying) journeyAdvance();
  }, dwell);
}

function journeySpotlightCollector(c, onDone) {
  journeyFlight = null;
  clearTimeout(journeyDwellTimer);
  hideJourneyTextPanel();
  const story = journeyNarrate(JOURNEY_COLLECTOR_SPOTLIGHT_PHRASES, {
    name: c.name,
    count: c.count,
  });
  if (journeyCurrent) {
    journeyEdges.push({
      from: { lat: journeyCurrent.lat, lon: journeyCurrent.lon },
      to: { lat: c.centroid.lat, lon: c.centroid.lon },
      color: JOURNEY_COLORS.collector,
      t: performance.now(),
    });
  }
  journeyCurrent = { type: 'collector', lat: c.centroid.lat, lon: c.centroid.lon, story };
  journeyTrail.push({
    lat: c.centroid.lat,
    lon: c.centroid.lon,
    type: 'collector',
    story,
    item: null,
    t: performance.now(),
  });
  if (journeyTrail.length > JOURNEY_TRAIL_MAX) journeyTrail.shift();

  const sample = journeySamplePoints(c.items, JOURNEY_SPOTLIGHT_SAMPLE, c.centroid);
  const bounds = journeyBoundsFor([c.centroid, ...sample.map((s) => s.coords)]);
  journeyVeilPulse(JOURNEY_FLIGHT_MS);
  journeyMap.flyToBounds(bounds, {
    padding: [70, 70],
    duration: JOURNEY_FLIGHT_MS / 1000,
    easeLinearity: 0.2,
    maxZoom: 7.5,
  });
  setJourneyCaption(story);
  journeyBurst = {
    center: c.centroid,
    points: sample.map((s) => s.coords),
    color: JOURNEY_COLORS.collector,
    start: performance.now(),
    holdMs: JOURNEY_SPOTLIGHT_HOLD_MS,
    fadeMs: JOURNEY_SPOTLIGHT_FADE_MS,
  };
  journeyPendingAdvanceFn = () => {
    setJourneyCaption('');
    onDone();
  };
  journeyDwellTimer = setTimeout(() => {
    setJourneyCaption('');
    if (journeyPlaying) onDone();
  }, JOURNEY_FLIGHT_MS + JOURNEY_SPOTLIGHT_HOLD_MS);
}

function journeySpotlightCategory(cat, centerCoords, onDone) {
  journeyFlight = null;
  clearTimeout(journeyDwellTimer);
  hideJourneyTextPanel();
  const sample = journeySamplePoints(cat.items, JOURNEY_SPOTLIGHT_SAMPLE, centerCoords);
  const bounds = journeyBoundsFor([centerCoords, ...sample.map((s) => s.coords)]);
  journeyVeilPulse(JOURNEY_FLIGHT_MS);
  journeyMap.flyToBounds(bounds, {
    padding: [70, 70],
    duration: JOURNEY_FLIGHT_MS / 1000,
    easeLinearity: 0.2,
    maxZoom: 7.5,
  });
  const story = journeyNarrate(JOURNEY_CATEGORY_SPOTLIGHT_PHRASES, {
    title: cat.title,
    count: cat.count,
  });
  setJourneyCaption(story);
  journeyBurst = {
    center: centerCoords,
    points: sample.map((s) => s.coords),
    color: JOURNEY_COLORS.category,
    start: performance.now(),
    holdMs: JOURNEY_SPOTLIGHT_HOLD_MS,
    fadeMs: JOURNEY_SPOTLIGHT_FADE_MS,
  };
  journeyPendingAdvanceFn = () => {
    setJourneyCaption('');
    onDone();
  };
  journeyDwellTimer = setTimeout(() => {
    setJourneyCaption('');
    if (journeyPlaying) onDone();
  }, JOURNEY_FLIGHT_MS + JOURNEY_SPOTLIGHT_HOLD_MS);
}

function journeyAdvance() {
  journeyIdle = false;
  deactivateJourneyStarfield();
  if (journeyStep === 'collector') {
    const c = journeyWeightedTopPick(journeyCollectors, 20, journeyRecentCollectors);
    journeyRecentCollectors.push(c.name);
    if (journeyRecentCollectors.length > 6) journeyRecentCollectors.shift();
    journeyMemory.collector = c;
    journeyStep = 'place';
    if (Math.random() < 0.3) {
      journeySpotlightCollector(c, () => journeyAdvance());
    } else {
      const story = journeyNarrate(JOURNEY_COLLECTOR_PHRASES, { name: c.name, count: c.count });
      journeyFlyTo(journeyMkNode('collector', c.centroid, story), false);
    }
    return;
  }
  if (journeyStep === 'place') {
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
    const story = journeyNarrate(
      p.count === 1 ? JOURNEY_PLACE_SINGULAR_PHRASES : JOURNEY_PLACE_PHRASES,
      { place: placeName, count: p.count },
    );
    journeyFlyTo(journeyMkNode('place', p.centroid, story), false);
    journeyStep = 'legendA';
    return;
  }
  if (journeyStep === 'legendA') {
    const p = journeyMemory.place;
    const byCollector = p.items.filter((i) => i.d.samler === journeyMemory.collector.name);
    const pick = journeyPick(byCollector.length ? byCollector : p.items);
    journeyMemory.legendA = pick;
    const ml = (pick.d.ml_code || '').trim();
    journeyMemory.category =
      journeyCategories.find((x) => x.code === ml) || journeyPick(journeyCategories);
    journeyFlyTo(journeyMkLegendNode(pick), false);
    journeyStep = 'legendB';
    return;
  }
  const cat = journeyMemory.category;
  const excludeId = journeyMemory.legendA.d.id;
  const pool = cat.items.filter((x) => x.d.id !== excludeId);
  const pick = journeyPick(pool.length ? pool : cat.items);
  journeyStep = 'collector';
  const r = Math.random();
  if (r < 0.25) {
    journeySpotlightCategory(cat, journeyMemory.legendA.coords, () => {
      journeyFlyTo(journeyMkLegendNode(pick), false);
    });
  } else if (r < 0.6) {
    const caption = journeyNarrate(JOURNEY_CATEGORY_CONTEXT_PHRASES, {
      title: cat.title,
      count: cat.count,
    });
    journeyFlyTo(journeyMkLegendNode(pick), false, caption);
  } else {
    journeyFlyTo(journeyMkLegendNode(pick), false);
  }
}

function updateJourneyButtons() {
  const playBtn = document.getElementById('jny-play');
  const stopBtn = document.getElementById('jny-stop');
  const jumpBtn = document.getElementById('jny-jump');
  const nextBtn = document.getElementById('jny-next');
  if (!playBtn) return;
  playBtn.classList.toggle('on', journeyPlaying);
  playBtn.textContent = journeyPlaying ? '⏸ Pause' : '▶ Play';
  stopBtn.disabled = !journeyPlaying;
  jumpBtn.disabled = !journeyStatsReady;
  playBtn.disabled = !journeyStatsReady;
  if (nextBtn) nextBtn.disabled = !journeyStatsReady;
}

function journeyIntroText(i) {
  return JOURNEY_INTRO[i].replace('{collectorCount}', samlers.length);
}

function journeyIntroDwell(text) {
  return Math.max(4200, Math.min(9000, 2200 + text.length * 38));
}

function journeyRunIntro() {
  if (journeyIntroIndex >= JOURNEY_INTRO.length) {
    journeyIntroDone = true;
    setJourneyCaption('');
    journeySkipNextFlightCaption = true;
    journeyAdvance();
    return;
  }
  journeyIdle = true;
  const text = journeyIntroText(journeyIntroIndex);
  setJourneyCaption(text);
  journeyIntroIndex++;
  journeyPendingAdvanceFn = journeyRunIntro;
  journeyDwellTimer = setTimeout(() => {
    if (journeyPlaying) journeyRunIntro();
  }, journeyIntroDwell(text));
}

function journeyPlay() {
  if (journeyPlaying) {
    journeyStop();
    return;
  }
  if (!journeyStatsReady) buildJourneyStats();
  if (!journeyStatsReady) return;
  journeyPlaying = true;
  updateJourneyButtons();
  if (journeyIdle) {
    if (!journeyIntroDone && !journeyCurrent) journeyRunIntro();
    else journeyAdvance();
  }
}

function journeyStop() {
  journeyPlaying = false;
  clearTimeout(journeyDwellTimer);
  updateJourneyButtons();
}

function journeyNext() {
  if (!journeyPendingAdvanceFn || journeyFlight) return;
  clearTimeout(journeyDwellTimer);
  const fn = journeyPendingAdvanceFn;
  journeyPendingAdvanceFn = null;
  fn();
}

function journeyJump() {
  if (!journeyStatsReady) buildJourneyStats();
  if (!journeyStatsReady) return;
  journeyIntroDone = true;
  deactivateJourneyStarfield();
  clearTimeout(journeyDwellTimer);
  journeyFlight = null;
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

let journeyVeilTimer = null;

function journeyVeilPulse(duration) {
  const veil = document.getElementById('journey-veil');
  if (!veil) return;
  clearTimeout(journeyVeilTimer);
  veil.classList.add('show');
  journeyVeilTimer = setTimeout(() => {
    veil.classList.remove('show');
  }, duration * 0.5);
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
