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
  'The trail leads to {name}, who preserved {count} legends gathered across Norway. Read this one…',
  'Through {name}, {count} stories entered the written record. Let us follow one of their paths…',
  'We come to {name}\u2019s collection – {count} accounts carried into the present. Explore one of them…',
  'Somewhere along the way, {name} gathered {count} legends – enough to leave a trace across the map. Let\u2019s find one of them…',
  'Behind {name} are {count} legends, each carrying a place, a voice, and something once believed. One of them reads as follows…',
  '{name} recorded {count} legends from the stories people told. Let us turn to one of them…',
  'The journey now brings us to {name}, whose work includes {count} recorded legends. Here is one…',
  'Among the collectors in this collection is {name}, connected to {count} legends. Let us read one of them…',
  '{count} legends in the collection were recorded by {name}. We will begin with this one…',
  'We meet {name} through {count} legends preserved in the collection. One of those accounts follows…',
  'The path crosses the work of {name}, who wrote down {count} legends. Let us stop at one of them…',
  'This part of the collection belongs to {name}: {count} legends gathered from oral tradition. Here is one…',
  '{name} listened to stories, noted where they were told, and preserved {count} legends. Let us open one…',
  'The record now points to {name}, responsible for {count} legends in the collection. One of them begins here…',
  'Through the collecting work of {name}, {count} legends remain available to us. Let us examine one…',
  'Our next collector is {name}. Their {count} recorded legends connect people, places, and remembered events. Here is one…',
];

const JOURNEY_PLACE_PHRASES = [
  'We arrive in {place}, where {count} legend{s} were recorded. One of their voices is telling…',
  'The thread settles in {place} – a landscape connected to {count} recorded legend{s}. One of them tells…',
  'Here is {place}, where {count} legend{s} were told, remembered, and written down. Each is distinct, including this one…',
  'We stop in {place}. {count} legend{s} were recorded here. Follow me in reading one of them…',
  'Next is {place}, with {count} legend{s} connected to it. Hear this one…',
  'The record takes us to {place}, a place associated with {count} legend{s}. Let us read one of them…',
  'In {place}, collectors recorded {count} legend{s}. This is one of those accounts…',
  '{place} appears in the collection through {count} legend{s}. We will turn to one of them now…',
  'Our next stop is {place}, where {count} legend{s} entered the collection. Here is one…',
  'The map brings us to {place}. From the {count} legend{s} connected to this place, we choose one…',
  '{count} legend{s} in the collection are linked to {place}. One of them follows…',
  'We have reached {place}, a setting remembered in {count} recorded legend{s}. Let us consider one…',
  'At {place}, {count} legend{s} were preserved in writing. This account is among them…',
  'The journey pauses at {place}, represented here by {count} legend{s}. Let us open one of the records…',
  'From the wider landscape, we move into {place}, where {count} legend{s} were documented. Here is one…',
  'This point on the map is {place}. It is connected to {count} recorded legend{s}, including the one before us…',
];

const JOURNEY_PLACE_SINGULAR_PHRASES = [
  'We arrive in {place}, where a single legend was recorded. Let us hear it…',
  'The thread settles in {place} – just one legend was recorded here. Let\u2019s explore it…',
  'Here is {place}, home to a single recorded legend. It reads like this…',
  'We stop in {place}. Only one legend was recorded here. Let us explore it…',
  'Next is {place}, with one legend connected to it. Hear it out…',
  'The record takes us to {place}, represented in the collection by one legend. Here it is…',
  'Only one legend in the collection is linked to {place}. Let us read it…',
  '{place} appears once in this collection, through the legend that follows…',
  'Our next stop is {place}, where a single account was written down. Let us turn to it…',
  'The map brings us to {place}. One recorded legend connects the collection to this place…',
  'A single legend carries us to {place}. This is the account…',
  'We have reached {place}, preserved here through one recorded legend. Let us examine it…',
  'At {place}, one legend entered the written record. It begins as follows…',
  'The journey pauses at {place}. Only one legend from this place is included in the collection…',
  'From the wider map, we move into {place}, known here through a single recorded legend…',
  'This point marks {place}. One legend is associated with it, and we will read it now…',
];

const JOURNEY_CATEGORY_CONTEXT_PHRASES = [
  'A familiar motif returns: \u201c{title}\u201d. Let us follow it into another story…',
  'The next legend echoes the same theme – \u201c{title}\u201d…',
  'One story opens onto another through the thread of \u201c{title}\u201d…',
  'Another version of \u201c{title}\u201d appears here…',
  'We stay with \u201c{title}\u201d, but move into a different telling…',
  'The same category, \u201c{title}\u201d, leads us to another recorded account…',
  'Here is another legend classified under \u201c{title}\u201d…',
  'The subject remains \u201c{title}\u201d, though the place and telling have changed…',
  'We move from one example of \u201c{title}\u201d to another…',
  'Another account takes up the topic of \u201c{title}\u201d…',
  'This next legend belongs to the same group: \u201c{title}\u201d…',
  'The collection connects these two stories through \u201c{title}\u201d…',
  'We follow the classification \u201c{title}\u201d into a different part of the collection…',
  'The motif \u201c{title}\u201d appears again, this time in another place…',
  'A second telling offers a different example of \u201c{title}\u201d…',
  'The journey continues within \u201c{title}\u201d, moving to another recorded legend…',
];

const JOURNEY_CATEGORY_SPOTLIGHT_PHRASES = [
  'Across the map, {count} legends gather around the theme \u201c{title}\u201d.',
  'Let us pause with \u201c{title}\u201d – {count} related accounts, dispersed across Norway.',
  'A constellation takes shape: {count} legends connected by \u201c{title}\u201d.',
  'On the map, \u201c{title}\u201d appears in {count} different legends.',
  '{count} legends share this topic: \u201c{title}\u201d.',
  'The category \u201c{title}\u201d includes {count} legends in the collection.',
  'Here we see the geographical spread of \u201c{title}\u201d across {count} recorded legends.',
  '{count} accounts have been grouped under \u201c{title}\u201d. Their locations are now visible together.',
  'The map brings together {count} legends classified as \u201c{title}\u201d.',
  'These {count} points show where legends concerning \u201c{title}\u201d were recorded.',
  'Within the collection, \u201c{title}\u201d connects {count} legends from different places.',
  'Let us look at \u201c{title}\u201d as a group: {count} recorded examples across the collection.',
  'The theme \u201c{title}\u201d appears repeatedly, linking {count} separate accounts.',
  'Here are the {count} legends associated with \u201c{title}\u201d, viewed across the map.',
  'Taken together, these {count} legends show how widely \u201c{title}\u201d appears in the material.',
  '\u201c{title}\u201d is represented by {count} legends, recorded in several parts of the country.',
];

const JOURNEY_COLLECTOR_SPOTLIGHT_PHRASES = [
  'The map widens around {name}, revealing {count} legends gathered across Norway.',
  'Seen together, {name}\u2019s {count} recorded legends form a path across the landscape.',
  'These points trace the work of {name}: {count} legends carried into the collection.',
  'Here is what {name} left behind – {count} legends, recorded in places across the country.',
  '{name} appears across the map through {count} collected legends.',
  'These locations show where the {count} legends recorded by {name} are connected to the landscape.',
  'The work of {name} is visible here through {count} legends and the places associated with them.',
  'Across these points, we can follow {name}\u2019s contribution of {count} legends to the collection.',
  'The map now shows the geographical range of the {count} legends linked to {name}.',
  '{count} records connect {name} to places across the map.',
  'Here, {name}\u2019s {count} legends reveal the range of places reached through the collection.',
  'These points bring together the places represented in {name}\u2019s collection of {count} legends.',
  'The collection attributes {count} legends to {name}. Their distribution becomes visible here.',
  'We pause to see {name}\u2019s work as a whole: {count} legends connected to their recorded locations.',
  'This view gathers the {count} legends associated with {name} and places them back on the map.',
  'Through {count} recorded legends, the collecting work of {name} reaches across several local traditions.',
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

const JOURNEY_CYCLE_LIMIT = 8;

const JOURNEY_NORWAY_BOUNDS = [
  [57.8, 4.0],
  [71.3, 31.5],
];

const JOURNEY_OUTRO = [
  'The Norwegian folk legend journey is over for now.',
  'Thank you for coming along.',
  'Would you like to experience it again, or share it with someone else?',
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
let journeyDataBounds = null;
let journeyStarfield = [];
let journeyStarfieldEdges = [];
let journeyStarfieldActive = false;
let journeyStarfieldFadeUntil = null;
let journeyIntroDone = false;
let journeyCycleCount = 0;
let journeyOutroIndex = 0;
let journeyEnded = false;
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
  let minLat = null;
  let maxLat = null;
  let minLon = null;
  let maxLon = null;
  allData.forEach((d) => {
    const coords = journeyCoords(d);
    if (!coords) return;
    if (minLat === null || coords.lat < minLat) minLat = coords.lat;
    if (maxLat === null || coords.lat > maxLat) maxLat = coords.lat;
    if (minLon === null || coords.lon < minLon) minLon = coords.lon;
    if (maxLon === null || coords.lon > maxLon) maxLon = coords.lon;
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
  if (minLat !== null) {
    journeyDataBounds = [
      [minLat, minLon],
      [maxLat, maxLon],
    ];
  }
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
  if (journeyMap && journeyDataBounds && !journeyCurrent) {
    journeyMap.fitBounds(journeyDataBounds, { padding: [24, 24] });
  }
  updateJourneyButtons();
}

function buildJourneyStarfield() {
  if (journeyStarfield.length || !journeyCollectors.length) return;
  const nodes = [];
  const nodeIndex = {};
  const edges = [];

  function addNode(key, type, coords) {
    if (nodeIndex[key] != null) return nodeIndex[key];
    const idx = nodes.length;
    nodes.push({
      lat: coords.lat,
      lon: coords.lon,
      color: JOURNEY_COLORS[type],
      hub: type !== 'place',
    });
    nodeIndex[key] = idx;
    return idx;
  }

  journeyCollectors.slice(0, 26).forEach((c) => {
    const cIdx = addNode('c:' + c.name, 'collector', c.centroid);
    [...c.items]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .forEach((item) => {
        const placeName = journeyPlaceKey(item.d);
        const p = journeyPlaces[placeName];
        if (!p) return;
        const pIdx = addNode('p:' + placeName, 'place', p.centroid);
        edges.push({ a: cIdx, b: pIdx });
      });
  });

  journeyCategories.slice(0, 22).forEach((cat) => {
    const catIdx = addNode('cat:' + cat.code, 'category', cat.centroid);
    [...cat.items]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .forEach((item) => {
        const placeName = journeyPlaceKey(item.d);
        const p = journeyPlaces[placeName];
        if (!p) return;
        const pIdx = addNode('p:' + placeName, 'place', p.centroid);
        edges.push({ a: catIdx, b: pIdx });
      });
  });

  journeyStarfield = nodes;
  journeyStarfieldEdges = edges;
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
  const breathe = 0.5 + 0.5 * Math.sin(now * 0.00045);
  journeyStarfieldEdges.forEach((edge) => {
    const a = journeyStarfield[edge.a];
    const b = journeyStarfield[edge.b];
    if (!a || !b) return;
    const pa = journeyProject(a.lat, a.lon);
    const pb = journeyProject(b.lat, b.lon);
    journeyCtx.beginPath();
    journeyCtx.moveTo(pa.x, pa.y);
    journeyCtx.lineTo(pb.x, pb.y);
    journeyCtx.strokeStyle = `rgba(160,195,255,${(0.05 + breathe * 0.16) * globalAlpha})`;
    journeyCtx.lineWidth = 1;
    journeyCtx.stroke();
  });
  journeyStarfield.forEach((s) => {
    const p = journeyProject(s.lat, s.lon);
    const alpha = (0.12 + breathe * 0.32) * globalAlpha;
    const rgb = journeyHexToRgb(s.color);
    const baseR = s.hub ? 2.1 : 1.5;
    const glowR = s.hub ? 8 : 6;
    const grad = journeyCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
    grad.addColorStop(0, `rgba(${rgb},${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
    journeyCtx.fillStyle = grad;
    journeyCtx.fill();
    journeyCtx.beginPath();
    journeyCtx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
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
  });
  journeyMap.fitBounds(journeyDataBounds || JOURNEY_NORWAY_BOUNDS, { padding: [24, 24] });
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

function journeyFlyToTarget(lat, lon, zoom) {
  if (!journeyMap || window.innerWidth > 768) return [lat, lon];
  const size = journeyMap.getSize();
  const targetPx = journeyMap.project([lat, lon], zoom);
  const shiftedPx = targetPx.add([0, size.y * 0.2]);
  const shifted = journeyMap.unproject(shiftedPx, zoom);
  return [shifted.lat, shifted.lng];
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
    const wholeSteps = Math.max(0, Math.floor(steps * t));
    for (let i = 0; i <= wholeSteps; i++) {
      const pp = bez(i / steps);
      const p = journeyProject(pp.lat, pp.lon);
      if (i === 0) journeyCtx.moveTo(p.x, p.y);
      else journeyCtx.lineTo(p.x, p.y);
    }
    const head = bez(t);
    const hp = journeyProject(head.lat, head.lon);
    if (wholeSteps === 0) journeyCtx.moveTo(hp.x, hp.y);
    journeyCtx.lineTo(hp.x, hp.y);
    journeyCtx.strokeStyle = `rgba(${rgb},0.7)`;
    journeyCtx.lineWidth = 1.6;
    journeyCtx.stroke();

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
    !isUkjent(d.samler) ? `Collected by ${esc(d.samler)}` : '',
    !isUkjent(d.informant) ? `told by ${esc(d.informant)}` : '',
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
  panel.scrollTop = 0;
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
  journeyMap.flyTo(journeyFlyToTarget(target.lat, target.lon, zoom), zoom, {
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
  if (target.type === 'legend') {
    setJourneyCaption('');
    showJourneyTextPanel(target.item);
    const len = ((target.item.tekst || '') + (target.item.english_translation || '')).length;
    const dwell = Math.max(9000, Math.min(24000, 7000 + len * 17));
    journeyPendingAdvanceFn = journeyAdvance;
    journeyDwellTimer = setTimeout(() => {
      if (journeyPlaying) journeyAdvance();
    }, dwell);
  } else if (target.item) {
    hideJourneyTextPanel();
    setJourneyCaption(target.story);
    const dwell = Math.max(4800, Math.min(9500, 3200 + (target.story || '').length * 36));
    journeyPendingAdvanceFn = () => journeyShowStopLegend(target);
    journeyDwellTimer = setTimeout(() => {
      if (journeyPlaying) journeyShowStopLegend(target);
    }, dwell);
  } else {
    hideJourneyTextPanel();
    setJourneyCaption(target.story);
    const dwell = Math.max(8500, Math.min(16000, 4200 + (target.story || '').length * 55));
    journeyPendingAdvanceFn = journeyAdvance;
    journeyDwellTimer = setTimeout(() => {
      if (journeyPlaying) journeyAdvance();
    }, dwell);
  }
}

function journeyShowStopLegend(target) {
  setJourneyCaption('');
  showJourneyTextPanel(target.item);
  const len = ((target.item.tekst || '') + (target.item.english_translation || '')).length;
  const dwell = Math.max(9000, Math.min(24000, 7000 + len * 17));
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
    journeyCycleCount++;
    if (journeyCycleCount > JOURNEY_CYCLE_LIMIT) {
      journeyRunOutro();
      return;
    }
    const c = journeyWeightedTopPick(journeyCollectors, 20, journeyRecentCollectors);
    journeyRecentCollectors.push(c.name);
    if (journeyRecentCollectors.length > 6) journeyRecentCollectors.shift();
    journeyMemory.collector = c;
    journeyStep = 'place';
    if (Math.random() < 0.3) {
      journeySpotlightCollector(c, () => journeyAdvance());
    } else {
      const collectorItem = journeyPick(c.items);
      const story = journeyNarrate(JOURNEY_COLLECTOR_PHRASES, { name: c.name, count: c.count });
      const node = journeyMkNode('collector', c.centroid, story);
      node.item = collectorItem.d;
      journeyFlyTo(node, false);
    }
    return;
  }
  if (journeyStep === 'place') {
    const c = journeyMemory.collector;
    const placeItem = journeyPick(c.items);
    const placeName = journeyPlaceKey(placeItem.d);
    const p = journeyPlaces[placeName] || {
      name: placeName,
      items: [placeItem],
      count: 1,
      centroid: placeItem.coords,
    };
    journeyMemory.place = p;
    journeyMemory.placeItem = placeItem;
    const story = journeyNarrate(
      p.count === 1 ? JOURNEY_PLACE_SINGULAR_PHRASES : JOURNEY_PLACE_PHRASES,
      { place: placeName, count: p.count },
    );
    const node = journeyMkNode('place', p.centroid, story);
    node.item = placeItem.d;
    journeyFlyTo(node, false);
    journeyStep = 'legendB';
    return;
  }
  const ml = (journeyMemory.placeItem.d.ml_code || '').trim();
  const cat = journeyCategories.find((x) => x.code === ml) || journeyPick(journeyCategories);
  journeyMemory.category = cat;
  const excludeId = journeyMemory.placeItem.d.id;
  const pool = cat.items.filter((x) => x.d.id !== excludeId);
  const pick = journeyPick(pool.length ? pool : cat.items);
  journeyStep = 'collector';
  const r = Math.random();
  if (r < 0.25) {
    journeySpotlightCategory(cat, journeyMemory.placeItem.coords, () => {
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
  const playIcon = document.getElementById('jny-play-icon');
  const playLabel = document.getElementById('jny-play-label');
  const stopBtn = document.getElementById('jny-stop');
  const jumpBtn = document.getElementById('jny-jump');
  const nextBtn = document.getElementById('jny-next');
  if (!playBtn) return;
  playBtn.classList.toggle('on', journeyPlaying);
  if (playIcon) playIcon.textContent = journeyPlaying ? '⏸' : '▶';
  if (playLabel) playLabel.textContent = journeyPlaying ? ' Pause' : ' Play';
  stopBtn.disabled = !journeyPlaying;
  jumpBtn.disabled = !journeyStatsReady;
  playBtn.disabled = !journeyStatsReady;
  if (nextBtn) nextBtn.disabled = !journeyStatsReady;
}

function journeyIntroText(i) {
  return JOURNEY_INTRO[i].replace('{collectorCount}', samlers.length);
}

function journeyIntroDwell(text) {
  return Math.max(6500, Math.min(13500, 3500 + text.length * 50));
}

function journeyRunIntro() {
  const captionEl = document.getElementById('journey-caption');
  if (journeyIntroIndex >= JOURNEY_INTRO.length) {
    journeyIntroDone = true;
    if (captionEl) captionEl.classList.remove('intro');
    setJourneyCaption('');
    journeySkipNextFlightCaption = true;
    journeyAdvance();
    return;
  }
  if (captionEl) captionEl.classList.add('intro');
  journeyIdle = true;
  const text = journeyIntroText(journeyIntroIndex);
  setJourneyCaption(text);
  journeyIntroIndex++;
  journeyPendingAdvanceFn = journeyRunIntro;
  journeyDwellTimer = setTimeout(() => {
    if (journeyPlaying) journeyRunIntro();
  }, journeyIntroDwell(text));
}

function journeyRunOutro() {
  hideJourneyTextPanel();
  if (journeyOutroIndex >= JOURNEY_OUTRO.length) {
    journeyShowEndPanel();
    return;
  }
  journeyIdle = true;
  const text = JOURNEY_OUTRO[journeyOutroIndex];
  setJourneyCaption(text);
  journeyOutroIndex++;
  journeyPendingAdvanceFn = journeyRunOutro;
  journeyDwellTimer = setTimeout(() => {
    if (journeyPlaying) journeyRunOutro();
  }, journeyIntroDwell(text));
}

function journeyShowEndPanel() {
  journeyEnded = true;
  journeyPlaying = false;
  setJourneyCaption('');
  const panel = document.getElementById('journey-end-panel');
  if (panel) panel.classList.add('show');
  updateJourneyButtons();
}

function journeyPlayAgain() {
  const panel = document.getElementById('journey-end-panel');
  if (panel) panel.classList.remove('show');
  journeyEnded = false;
  journeyCycleCount = 0;
  journeyOutroIndex = 0;
  journeyTrail = [];
  journeyEdges = [];
  journeyCurrent = null;
  journeyStep = 'collector';
  journeyIdle = true;
  journeyPlay();
}

function journeyShareResult() {
  const shareData = {
    title: 'Norwegian Folk Legends – A Journey',
    text: 'I just travelled through Norwegian folk legends as a living landscape. Take the journey yourself:',
    url: location.href,
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(location.href).then(() => {
      setJourneyCaption('Link copied to your clipboard.');
    });
  }
}

function journeyPlay() {
  if (journeyEnded) {
    journeyPlayAgain();
    return;
  }
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
  if (journeyEnded) {
    const panel = document.getElementById('journey-end-panel');
    if (panel) panel.classList.remove('show');
    journeyEnded = false;
    journeyCycleCount = 0;
    journeyOutroIndex = 0;
  }
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
  if (window.innerWidth <= 768) return;
  const el = document.getElementById('panel-journey');
  const nativeSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  if (nativeSupported) {
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        const result = req.call(el);
        if (result && result.catch) result.catch(() => journeyToggleFakeFullscreen());
        return;
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      return;
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      return;
    }
  }
  journeyToggleFakeFullscreen();
}

function journeyToggleFakeFullscreen() {
  const el = document.getElementById('panel-journey');
  const isFake = el.classList.toggle('fake-fullscreen');
  document.body.classList.toggle('journey-fake-fullscreen-active', isFake);
  onJourneyFullscreenChange();
}

function onJourneyFullscreenChange() {
  const icon = document.getElementById('jny-fullscreen-icon');
  const label = document.getElementById('jny-fullscreen-label');
  const el = document.getElementById('panel-journey');
  const isFs = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    (el && el.classList.contains('fake-fullscreen'))
  );
  if (icon) icon.textContent = isFs ? '⤡' : '⛶';
  if (label) label.textContent = isFs ? ' Exit' : ' Fullscreen';
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
