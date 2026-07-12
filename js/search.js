function handleHdrSearch(v) {
  document.getElementById('srch-input').value = v;
  if (curTab !== 'search') switchTab('search');
  schedSearch();
}

function toggleAdv() {
  advOpen = !advOpen;
  document.getElementById('adv-panel').className = 'adv-panel' + (advOpen ? ' open' : '');
  document.getElementById('adv-tbtn').textContent = (advOpen ? '▾' : '▸') + ' Advanced search';
}

function updateSliderLabels() {
  const f = document.getElementById('adv-yr-from'),
    t = document.getElementById('adv-yr-to');
  let fv = parseInt(f.value),
    tv = parseInt(t.value);
  if (fv > tv) {
    const tmp = fv;
    fv = tv;
    tv = tmp;
    f.value = fv;
    t.value = tv;
  }
  document.getElementById('adv-yr-from-lbl').textContent = fv;
  document.getElementById('adv-yr-to-lbl').textContent = tv;
}

function autocomplete(inputId, listName, menuId) {
  const val = document.getElementById(inputId).value.toLowerCase();
  const menu = document.getElementById(menuId);
  const list = listName === 'samlers' ? samlers : informants;
  if (val.length < 1) {
    menu.style.display = 'none';
    return;
  }
  const matches = list.filter((s) => s.toLowerCase().includes(val)).slice(0, 12);
  if (!matches.length) {
    menu.style.display = 'none';
    return;
  }
  menu.innerHTML = matches
    .map(
      (m) =>
        `<div class="autocomplete-item" onclick="selectAC('${inputId}','${menuId}','${esc(m)}')">${esc(m)}</div>`,
    )
    .join('');
  menu.style.display = 'block';
}

function selectAC(inputId, menuId, val) {
  document.getElementById(inputId).value = val;
  document.getElementById(menuId).style.display = 'none';
}

document.addEventListener('click', (e) => {
  document.querySelectorAll('.autocomplete-list').forEach((m) => {
    if (!m.previousElementSibling?.contains(e.target)) m.style.display = 'none';
  });
});

function schedSearch() {
  clearTimeout(srchTimer);
  srchTimer = setTimeout(runSearch, 200);
}

function runSearch() {
  document.getElementById('hsi').value = document.getElementById('srch-input').value;
  const q = document.getElementById('srch-input').value.trim().toLowerCase();
  const advSg = document.getElementById('adv-sg')?.value || '';
  const advYF = parseInt(document.getElementById('adv-yr-from')?.value) || 0;
  const advYT = parseInt(document.getElementById('adv-yr-to')?.value) || 9999;
  const advSamler = document.getElementById('adv-samler')?.value.trim().toLowerCase() || '';
  const advInf = document.getElementById('adv-informant')?.value.trim().toLowerCase() || '';
  const hasAdv =
    MSS.ml.size > 0 ||
    MSS.fylke.size > 0 ||
    advSg ||
    advYF > 1832 ||
    advYT < 1954 ||
    advSamler ||
    advInf;
  if (!q && !hasAdv) {
    document.getElementById('srch-results').innerHTML =
      '<div class="srch-empty">Type to search across ' +
      allData.length.toLocaleString() +
      ' legends</div>';
    document.getElementById('srch-cnt').textContent = '';
    renderSrchFiltersBar();
    return;
  }
  let results = allData
    .filter((d) => {
      if (MSS.ml.size > 0 && !MSS.ml.has(d.ml_code)) return false;
      if (advSg && d.undersjanger !== advSg) return false;
      if (MSS.fylke.size > 0 && !MSS.fylke.has(d.fylke)) return false;
      const y = cleanY(d.år_clean);
      if (advYF > 1832 && y && y < advYF) return false;
      if (advYT < 1954 && y && y > advYT) return false;
      if (advSamler && !(d.samler || '').toLowerCase().includes(advSamler)) return false;
      if (advInf && !(d.informant || '').toLowerCase().includes(advInf)) return false;
      if (q)
        return (
          (d.tittel || '').toLowerCase().includes(q) ||
          (d.ml_title || '').toLowerCase().includes(q) ||
          (d.tekst || '').toLowerCase().includes(q) ||
          (d.english_translation || '').toLowerCase().includes(q)
        );
      return true;
    })
    .slice(0, 80);
  const resEl = document.getElementById('srch-results');
  document.getElementById('srch-cnt').textContent =
    results.length +
    (results.length === 80 ? '+' : '') +
    ' result' +
    (results.length !== 1 ? 's' : '');
  if (!results.length) {
    resEl.innerHTML = '<div class="srch-empty">No legends found</div>';
    renderSrchFiltersBar();
    return;
  }
  resEl.innerHTML = results
    .map((d, i) => {
      const title = d.tittel || d.ml_title || d.id;
      const yr = cleanY(d.år_clean);
      const sub = [d.sted, d.fylke, yr].filter(Boolean).join(' · ');
      const hasTr = d.english_translation && d.english_translation.trim();
      let snippetHtml = '';
      if (q) {
        if ((d.tekst || '').toLowerCase().includes(q)) {
          snippetHtml = `<div style="font-size:12px;color:var(--tm);line-height:1.7;margin:6px 0 0;padding:6px 10px;background:var(--sf2);border-radius:6px;border-left:3px solid var(--butter)">${hlSnippet(d.tekst || '', q, 220)}</div>`;
        } else if (hasTr && (d.english_translation || '').toLowerCase().includes(q)) {
          snippetHtml = `<div style="font-size:12px;color:var(--tm);line-height:1.7;margin:6px 0 0;padding:6px 10px;background:var(--sf2);border-radius:6px;border-left:3px solid var(--butter)">${hlSnippet(d.english_translation, q, 220)}</div>`;
        }
      }
      return `<div class="lcard collapsed" id="sc-${i}">\n      <div class="lcard-top" onclick="toggleCard('sc-${i}')">\n        <span class="mlb" style="background:${mlC(d.ml_code)}30;color:${mlT(d.ml_code)}">${esc(d.ml_code || '')}</span>\n        <div style="flex:1">\n          <div class="ct">${q ? hlText(title, q) : esc(title)}</div>\n          <div class="csub">${esc(sub)}</div>\n          ${snippetHtml}\n        </div>\n        <span class="chev">›</span>\n      </div>\n      <div class="cpills">\n        <span class="pill ${d.undersjanger === 'Naturmytiske sagn' ? 'pn' : 'ph'}">${esc(d.undersjanger || '')}</span>\n        ${d.fylke ? `<span class="pill pc">${esc(d.fylke)}</span>` : ''}\n        ${yr ? `<span class="pill py">${yr}</span>` : ''}\n        ${hasTr ? `<span class="pill pt">Translated</span>` : `<span class="pill pp">Pending</span>`}\n      </div>\n      <div class="cbody">\n        <div class="tsl">Norwegian original</div>\n        <div class="tsb">${q ? hlFull(d.tekst || '', q) : esc(d.tekst || '')}</div>\n        <div class="tsl">English translation with AI</div>\n        ${hasTr ? `<div class="tsb">${q ? hlFull(d.english_translation, q) : esc(d.english_translation)}</div>` : `<div class="tspend">Translation pending</div>`}\n        <div class="cmeta">\n          ${d.samler ? `<span class="mi"><strong>Collector</strong> ${esc(d.samler)}</span>` : ''}\n          ${d.informant ? `<span class="mi"><strong>Informant</strong> ${esc(d.informant)}</span>` : ''}\n          ${d.signatur ? `<span class="mi"><strong>Archive</strong> ${esc(d.signatur)}</span>` : ''}\n          ${d._url ? `<span style="margin-left:auto"><a class="srcl" href="${esc(d._url)}" target="_blank">View at UiO ↗</a></span>` : ''}\n        </div>\n      </div>\n    </div>`;
    })
    .join('');
  renderSrchFiltersBar();
}

function hlSnippet(text, q, maxLen) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return esc(text.slice(0, maxLen)) + (text.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + q.length + 100);
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return hlText(snippet, q);
}

function hlFull(text, q) {
  if (!q || !text) return esc(text || '');
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return esc(text).replace(
    re,
    '<mark style="background:var(--butter);border-radius:2px;padding:0 2px">$1</mark>',
  );
}

function renderSrchFiltersBar() {
  const el = document.getElementById('srch-fbar');
  const tags = [];
  MSS.ml.forEach((v) =>
    tags.push({
      label: v,
      remove: () => {
        MSS.ml.delete(v);
        runSearch();
      },
    }),
  );
  MSS.fylke.forEach((v) =>
    tags.push({
      label: v,
      remove: () => {
        MSS.fylke.delete(v);
        runSearch();
      },
    }),
  );
  if (!tags.length) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  el.innerHTML =
    '<span class="filters-bar-label">Active:</span>' +
    tags
      .map(
        (t, i) =>
          `<span class="filter-tag">${esc(t.label)}<span class="filter-tag-remove" onclick="document.getElementById('srch-fbar')._tags[${i}].remove()">×</span></span>`,
      )
      .join('');
  el._tags = tags;
}

function hlText(text, q) {
  if (!q) return esc(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return esc(text).replace(
    re,
    '<mark style="background:var(--butter);border-radius:2px;padding:0 2px">$1</mark>',
  );
}

function getSnippet(text, q, len) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return esc(text.slice(0, len)) + (text.length > len ? '…' : '');
  const s = Math.max(0, idx - 60),
    e = Math.min(text.length, idx + q.length + 80);
  return (s > 0 ? '…' : '') + esc(text.slice(s, e)) + (e < text.length ? '…' : '');
}

const MAP_LAYERS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};
