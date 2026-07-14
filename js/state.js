const SHEET =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTX0GaV9SDaoF3xNvAr3DPifS2ExhtY-NupAS_dlfL5P4lwPro1QMSHIAFU9bmTt7s08ciuR2jWoB1F/pub?output=csv';

const PPG = 15;

let allData = [],
  filtered = [],
  curPage = 1,
  curTab = 'browse';

let mapInst = null,
  mapLayerObj = null,
  mapMarkerLayer = null,
  mapHeatLayer = null,
  mapMode = 'place',
  curMapLayer = 'light';

let netSim = null,
  sortFld = 'ml_code';

let netSgFilter = 'all',
  netView = 'force';

let sgFilter = new Set(['Naturmytiske sagn', 'Historiske sagn']),
  transFilter = 'all';

let tlG = 'decade',
  tlC = 'subgenre',
  tlSel = null,
  tlCollFilter = null;

let advOpen = false;

const MS = {
  ml: new Set(),
  fylke: new Set(),
  samler: new Set(),
  informant: new Set(),
};

const MSS = {
  ml: new Set(),
  fylke: new Set(),
};

const MSM = {
  ml: new Set(),
  fylke: new Set(),
  samler: new Set(),
  informant: new Set(),
};

const MLC = {
  ml3: '#E8D5B7',
  ml4: '#B9CAE7',
  ml5: '#BFE3DA',
  ml6: '#D8A8B3',
  ml7: '#F1E7D8',
  ml8: '#C8D8C0',
};

const MLT = {
  ml3: '#633806',
  ml4: '#0C447C',
  ml5: '#085041',
  ml6: '#72243E',
  ml7: '#633806',
  ml8: '#27500A',
};

const MLGC = {
  ml3: {
    bar: '#E8D5B7',
    txt: '#633806',
  },
  ml4: {
    bar: '#B9CAE7',
    txt: '#0C447C',
  },
  ml5: {
    bar: '#BFE3DA',
    txt: '#085041',
  },
  ml6: {
    bar: '#D8A8B3',
    txt: '#72243E',
  },
  ml7: {
    bar: '#F1E7D8',
    txt: '#633806',
  },
  ml8: {
    bar: '#C8D8C0',
    txt: '#27500A',
  },
};

function mlC(c) {
  return c ? MLC[c.slice(0, 3)] || '#E7DED2' : '#E7DED2';
}

function mlT(c) {
  return c ? MLT[c.slice(0, 3)] || '#3A4358' : '#3A4358';
}

function cleanY(v) {
  if (!v) return null;
  const n = parseInt(parseFloat(String(v)));
  return n >= 1800 && n <= 2010 ? n : null;
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isUkjent(v) {
  return !v || v.trim().toLowerCase() === 'ukjent';
}

let pendingLegendId = null;

function legendUrl(id) {
  return location.origin + location.pathname + '#legend-' + encodeURIComponent(id);
}

function copyLegendLink(id, btnEl) {
  const url = legendUrl(id);
  const done = () => {
    if (!btnEl) return;
    const original = btnEl.innerHTML;
    btnEl.innerHTML = '✓';
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.innerHTML = original;
      btnEl.classList.remove('copied');
    }, 1400);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(done).catch(done);
  } else {
    done();
  }
}

let samlers = [],
  informants = [];
