function buildCbDropdown(containerId, options, stateSet, label, onChangeFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  el.className = 'cb-dropdown';
  const trigger = document.createElement('div');
  trigger.className = 'cb-trigger';
  trigger.innerHTML = `<span class="cb-trigger-text">${label}</span><span class="cb-arrow">▾</span>`;
  trigger.onclick = (e) => {
    e.stopPropagation();
    toggleCbMenu(el, trigger, menu);
  };
  const menu = document.createElement('div');
  menu.className = 'cb-menu';
  menu.style.display = 'none';
  const searchWrap = document.createElement('div');
  searchWrap.className = 'cb-search';
  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Filter…';
  searchInput.oninput = () =>
    filterCbOptions(searchInput.value, menu, stateSet, options, onChangeFn, trigger, label);
  searchWrap.appendChild(searchInput);
  menu.appendChild(searchWrap);
  const allOpt = document.createElement('div');
  allOpt.className = 'cb-option cb-all';
  const allCb = document.createElement('input');
  allCb.type = 'checkbox';
  allCb.checked = stateSet.size === 0;
  allCb.onchange = () => {
    stateSet.clear();
    updateCbMenu(menu, stateSet, options);
    updateCbTrigger(trigger, label, stateSet);
    if (onChangeFn) onChangeFn();
  };
  const allLbl = document.createElement('span');
  allLbl.textContent = 'All';
  allOpt.appendChild(allCb);
  allOpt.appendChild(allLbl);
  menu.appendChild(allOpt);
  options.forEach((opt) => {
    const div = document.createElement('div');
    div.className = 'cb-option';
    div.dataset.val = opt.value;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = opt.value;
    cb.checked = stateSet.has(opt.value);
    cb.onchange = () => {
      if (cb.checked) stateSet.add(opt.value);
      else stateSet.delete(opt.value);
      allCb.checked = stateSet.size === 0;
      updateCbTrigger(trigger, label, stateSet);
      if (onChangeFn) onChangeFn();
    };
    const lbl = document.createElement('span');
    lbl.textContent = opt.label;
    div.appendChild(cb);
    div.appendChild(lbl);
    menu.appendChild(div);
  });
  el.appendChild(trigger);
  el.appendChild(menu);
  document.addEventListener(
    'click',
    (e) => {
      if (!el.contains(e.target)) {
        menu.style.display = 'none';
        trigger.classList.remove('open');
      }
    },
    {
      passive: true,
    },
  );
}

function toggleCbMenu(el, trigger, menu) {
  const isOpen = menu.style.display !== 'none';
  document.querySelectorAll('.cb-menu').forEach((m) => {
    m.style.display = 'none';
  });
  document.querySelectorAll('.cb-trigger').forEach((t) => t.classList.remove('open'));
  if (!isOpen) {
    menu.style.display = 'block';
    trigger.classList.add('open');
  }
}

function updateCbMenu(menu, stateSet, options) {
  menu.querySelectorAll('.cb-option:not(.cb-all) input').forEach((cb) => {
    cb.checked = stateSet.has(cb.value);
  });
}

function filterCbOptions(q, menu, stateSet, options, onChangeFn, trigger, label) {
  const ql = q.toLowerCase();
  menu.querySelectorAll('.cb-option:not(.cb-all)').forEach((div) => {
    const val = div.dataset.val || '';
    div.style.display = val.toLowerCase().includes(ql) ? 'flex' : 'none';
  });
}

function updateCbTrigger(trigger, label, stateSet) {
  const countEl = trigger.querySelector('.cb-count');
  if (stateSet.size === 0) {
    trigger.querySelector('.cb-trigger-text').textContent = label;
    if (countEl) countEl.remove();
  } else {
    trigger.querySelector('.cb-trigger-text').textContent = label;
    if (!countEl) {
      const c = document.createElement('span');
      c.className = 'cb-count';
      trigger.insertBefore(c, trigger.querySelector('.cb-arrow'));
    }
    trigger.querySelector('.cb-count').textContent = stateSet.size;
  }
}

function initDropdowns() {
  const mlCodes = [...new Set(allData.map((d) => d.ml_code).filter(Boolean))].sort();
  const mlTitles = {};
  allData.forEach((d) => {
    if (d.ml_code) mlTitles[d.ml_code] = d.ml_title;
  });
  const mlOpts = mlCodes.map((c) => ({
    value: c,
    label: c + (mlTitles[c] ? ' – ' + mlTitles[c] : ''),
  }));
  const fylker = [...new Set(allData.map((d) => d.fylke).filter(Boolean))].sort();
  const fylkeOpts = fylker.map((f) => ({
    value: f,
    label: f,
  }));
  const infOpts = informants.map((i) => ({
    value: i,
    label: i,
  }));
  buildCbDropdown('cbd-ml', mlOpts, MS.ml, 'All categories', applyFilters);
  buildCbDropdown('cbd-fylke', fylkeOpts, MS.fylke, 'All counties', applyFilters);
  buildCbDropdown(
    'cbd-samler',
    samlers.map((s) => ({
      value: s,
      label: s,
    })),
    MS.samler,
    'All collectors',
    applyFilters,
  );
  buildCbDropdown('cbd-informant', infOpts, MS.informant, 'All informants', applyFilters);
  buildCbDropdown('cbd-srch-ml', mlOpts, MSS.ml, 'All categories', null);
  buildCbDropdown('cbd-srch-fylke', fylkeOpts, MSS.fylke, 'All counties', null);
  buildCbDropdown('cbd-map-ml', mlOpts, MSM.ml, 'All categories', renderMapMarkers);
  buildCbDropdown('cbd-map-fylke', fylkeOpts, MSM.fylke, 'All counties', renderMapMarkers);
  buildCbDropdown(
    'cbd-map-samler',
    samlers.map((s) => ({
      value: s,
      label: s,
    })),
    MSM.samler,
    'All collectors',
    renderMapMarkers,
  );
  buildCbDropdown('cbd-map-informant', infOpts, MSM.informant, 'All informants', renderMapMarkers);
}

function renderFiltersBar(containerId, state) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const tags = [];
  if (state.ml && state.ml.size > 0)
    state.ml.forEach((v) =>
      tags.push({
        label: v,
        remove: () => {
          state.ml.delete(v);
          applyFilters();
          initDropdowns();
        },
      }),
    );
  if (state.fylke && state.fylke.size > 0)
    state.fylke.forEach((v) =>
      tags.push({
        label: v,
        remove: () => {
          state.fylke.delete(v);
          applyFilters();
        },
      }),
    );
  if (state.samler && state.samler.size > 0)
    state.samler.forEach((v) =>
      tags.push({
        label: v.slice(0, 25),
        remove: () => {
          state.samler.delete(v);
          applyFilters();
        },
      }),
    );
  if (state.informant && state.informant.size > 0)
    state.informant.forEach((v) =>
      tags.push({
        label: v.slice(0, 25),
        remove: () => {
          state.informant.delete(v);
          applyFilters();
        },
      }),
    );
  if (state === MS && sgFilter.size < 2) {
    sgFilter.forEach((v) =>
      tags.push({
        label: v === 'Naturmytiske sagn' ? 'Naturmytiske' : 'Historiske',
        remove: () => {
          sgFilter = new Set(['Naturmytiske sagn', 'Historiske sagn']);
          document.getElementById('btn-natur').className = 'subgenre-btn on-natur';
          document.getElementById('btn-hist').className = 'subgenre-btn on-hist';
          applyFilters();
        },
      }),
    );
  }
  if (!tags.length) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  el.innerHTML =
    '<span class="filters-bar-label">Active:</span>' +
    tags
      .map(
        (t, i) =>
          `<span class="filter-tag">${esc(t.label)}<span class="filter-tag-remove" onclick="removeFTag(${i},'${containerId}')">×</span></span>`,
      )
      .join('') +
    '<span class="filters-clear" onclick="resetFilters()">Clear all</span>';
  el._tags = tags;
}

function removeFTag(i, cid) {
  document.getElementById(cid)._tags[i].remove();
}

function updateYrSlider() {
  let f = parseInt(document.getElementById('yr-from').value);
  let t = parseInt(document.getElementById('yr-to').value);
  if (f > t) {
    const tmp = f;
    f = t;
    t = tmp;
    document.getElementById('yr-from').value = f;
    document.getElementById('yr-to').value = t;
  }
  const min = 1832,
    max = 1954,
    range = max - min;
  const pctF = ((f - min) / range) * 100,
    pctT = ((t - min) / range) * 100;
  document.getElementById('yr-from-lbl').textContent = f;
  document.getElementById('yr-to-lbl').textContent = t;
  const fill = document.getElementById('yr-dual-fill');
  if (fill) {
    fill.style.left = pctF + '%';
    fill.style.width = pctT - pctF + '%';
  }
  const tf = document.getElementById('yr-thumb-from');
  const tt = document.getElementById('yr-thumb-to');
  if (tf) tf.style.left = pctF + '%';
  if (tt) tt.style.left = pctT + '%';
}

document.addEventListener('DOMContentLoaded', () => updateYrSlider());

function toggleSg(sg) {
  if (sgFilter.has(sg)) {
    if (sgFilter.size > 1) sgFilter.delete(sg);
  } else sgFilter.add(sg);
  document.getElementById('btn-natur').className =
    'subgenre-btn' + (sgFilter.has('Naturmytiske sagn') ? ' on-natur' : '');
  document.getElementById('btn-hist').className =
    'subgenre-btn' + (sgFilter.has('Historiske sagn') ? ' on-hist' : '');
}

function setTrans(v) {
  transFilter = v;
  ['all', 'yes', 'no'].forEach(
    (x) => (document.getElementById('tbtn-' + x).className = 'trans-btn' + (x === v ? ' on' : '')),
  );
}

function applyFilters() {
  const yF = parseInt(document.getElementById('yr-from').value) || 1832;
  const yT = parseInt(document.getElementById('yr-to').value) || 1954;
  const yFromActive = yF > 1832,
    yToActive = yT < 1954;
  filtered = allData.filter((d) => {
    if (MS.ml.size > 0 && !MS.ml.has(d.ml_code)) return false;
    if (!sgFilter.has(d.undersjanger)) return false;
    if (MS.fylke.size > 0 && !MS.fylke.has(d.fylke)) return false;
    if (MS.samler.size > 0 && !MS.samler.has(d.samler)) return false;
    if (MS.informant.size > 0 && !MS.informant.has(d.informant)) return false;
    if (yFromActive || yToActive) {
      const y = cleanY(d.år_clean);
      if (y && (y < yF || y > yT)) return false;
    }
    if (transFilter === 'yes' && !d.english_translation?.trim()) return false;
    if (transFilter === 'no' && d.english_translation?.trim()) return false;
    return true;
  });
  doSort();
  curPage = 1;
  renderBrowse();
  document.getElementById('sidebar-cnt').textContent =
    filtered.length.toLocaleString() + ' legends';
  renderFiltersBar('browse-fbar', MS);
}

function doSort() {
  filtered.sort((a, b) => {
    if (sortFld === 'ml_code') return (a.ml_code || '').localeCompare(b.ml_code || '');
    if (sortFld === 'year') return (cleanY(a.år_clean) || 9999) - (cleanY(b.år_clean) || 9999);
    if (sortFld === 'county') return (a.fylke || '').localeCompare(b.fylke || '');
    return 0;
  });
}

function setSort(f, el) {
  sortFld = f;
  document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('on'));
  el.classList.add('on');
  doSort();
  curPage = 1;
  renderBrowse();
}

function resetFilters() {
  MS.ml.clear();
  MS.fylke.clear();
  MS.samler.clear();
  MS.informant.clear();
  sgFilter = new Set(['Naturmytiske sagn', 'Historiske sagn']);
  transFilter = 'all';
  document.getElementById('yr-from').value = '1832';
  document.getElementById('yr-to').value = '1954';
  updateYrSlider();
  document.getElementById('btn-natur').className = 'subgenre-btn on-natur';
  document.getElementById('btn-hist').className = 'subgenre-btn on-hist';
  ['all', 'yes', 'no'].forEach(
    (x) =>
      (document.getElementById('tbtn-' + x).className = 'trans-btn' + (x === 'all' ? ' on' : '')),
  );
  initDropdowns();
  applyFilters();
}

function toggleMobFilters() {
  const b = document.getElementById('mob-filter-body');
  const a = document.getElementById('mob-filter-arrow');
  const open = b.classList.toggle('open');
  a.textContent = open ? '▾' : '▸';
}

function renderBrowse() {
  const main = document.getElementById('browse-main');
  if (!filtered.length) {
    main.innerHTML =
      '<div class="loading" style="height:120px">No legends match the current filters.</div>';
    return;
  }
  const total = filtered.length,
    pages = Math.ceil(total / PPG),
    start = (curPage - 1) * PPG;
  const pageData = filtered.slice(start, start + PPG);
  let html = `<div class="browse-hdr">\n    <span class="res-lbl">${total.toLocaleString()} legends</span>\n    <div class="sort-row">\n      <span style="font-size:11px;color:var(--td);margin-right:3px">Sort:</span>\n      <button class="sort-btn${sortFld === 'ml_code' ? ' on' : ''}" onclick="setSort('ml_code',this)">ML</button>\n      <button class="sort-btn${sortFld === 'year' ? ' on' : ''}" onclick="setSort('year',this)">Year</button>\n      <button class="sort-btn${sortFld === 'county' ? ' on' : ''}" onclick="setSort('county',this)">County</button>\n    </div>\n  </div>`;
  pageData.forEach((d, i) => {
    const hasTr = d.english_translation && d.english_translation.trim();
    const title = d.tittel || d.ml_title || d.id;
    const yr = cleanY(d.år_clean);
    const sub = [d.sted, d.fylke, yr].filter(Boolean).join(' · ');
    html += legendCard(`card-${start + i}`, d, title, sub, hasTr, yr, 'toggleCard');
  });
  html += `<div class="pgn"><button class="pgb" onclick="goPage(${curPage - 1})" ${curPage === 1 ? 'disabled' : ''}>‹</button>`;
  pageRange(curPage, pages).forEach((p, idx, arr) => {
    if (idx > 0 && p - arr[idx - 1] > 1)
      html += `<span style="font-size:12px;color:var(--td);padding:0 3px">…</span>`;
    html += `<button class="pgb${p === curPage ? ' on' : ''}" onclick="goPage(${p})">${p}</button>`;
  });
  html += `<button class="pgb" onclick="goPage(${curPage + 1})" ${curPage === pages ? 'disabled' : ''}>›</button></div>`;
  main.innerHTML = html;
}

function pageRange(cur, tot) {
  const r = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(tot, cur + 2); i++) r.push(i);
  if (r[0] > 1) r.unshift(1);
  if (r[r.length - 1] < tot) r.push(tot);
  return r;
}

function legendCard(id, d, title, sub, hasTr, yr, toggleFn, extraClass = '') {
  const transSection = hasTr
    ? `<div class="tsl">English translation with AI</div><div class="tsb">${esc(d.english_translation)}</div>`
    : `<div class="tsl">English translation with AI</div><div class="tspend">Translation pending</div>`;
  return `<div class="lcard${extraClass}" id="${id}">\n    <div class="lcard-top" onclick="${toggleFn}('${id}')">\n      <span class="mlb" style="background:${mlC(d.ml_code)}30;color:${mlT(d.ml_code)}">${esc(d.ml_code || '')}</span>\n      <div style="flex:1"><div class="ct">${esc(title)}</div><div class="csub">${esc(sub)}</div></div>\n      <button class="lcard-link" title="Copy link to this legend" onclick="event.stopPropagation();copyLegendLink('${esc(d.id)}',this)">🔗</button>\n      <span class="chev">›</span>\n    </div>\n    <div class="cpills">\n      <span class="pill ${d.undersjanger === 'Naturmytiske sagn' ? 'pn' : 'ph'}">${esc(d.undersjanger || '')}</span>\n      ${d.fylke ? `<span class="pill pc">${esc(d.fylke)}</span>` : ''}\n      ${yr ? `<span class="pill py">${yr}</span>` : ''}\n      ${hasTr ? `<span class="pill pt">Translated</span>` : `<span class="pill pp">Pending</span>`}\n    </div>\n    <div class="cbody">\n      <div class="tsl">Norwegian original</div>\n      <div class="tsb">${esc(d.tekst || '')}</div>\n      ${transSection}\n      <div class="cmeta">\n        ${d.samler ? `<span class="mi"><strong>Collector</strong> ${esc(d.samler)}</span>` : ''}\n        ${d.informant ? `<span class="mi"><strong>Informant</strong> ${esc(d.informant)}</span>` : ''}\n        ${d.signatur ? `<span class="mi"><strong>Archive</strong> ${esc(d.signatur)}</span>` : ''}\n        ${d._url ? `<span style="margin-left:auto"><a class="srcl" href="${esc(d._url)}" target="_blank">View at UiO ↗</a></span>` : ''}\n      </div>\n    </div>\n  </div>`;
}

function toggleCard(id) {
  document.getElementById(id)?.classList.toggle('collapsed');
}

function openLegendModal(id) {
  const d = allData.find((x) => x.id === id);
  const body = document.getElementById('legend-modal-body');
  const backdrop = document.getElementById('legend-modal-backdrop');
  if (!d || !body || !backdrop) return;
  const title = d.tittel || d.ml_title || d.id;
  const yr = cleanY(d.år_clean);
  const sub = [d.sted, d.fylke, yr].filter(Boolean).join(' · ');
  const hasTr = d.english_translation && d.english_translation.trim();
  body.innerHTML = `
    <span class="mlb" style="background:${mlC(d.ml_code)}30;color:${mlT(d.ml_code)}">${esc(d.ml_code || '')}</span>
    <div class="ct" style="font-size:18px;margin-top:10px">${esc(title)}</div>
    <div class="csub">${esc(sub)}</div>
    <div class="cpills">
      <span class="pill ${d.undersjanger === 'Naturmytiske sagn' ? 'pn' : 'ph'}">${esc(d.undersjanger || '')}</span>
      ${d.fylke ? `<span class="pill pc">${esc(d.fylke)}</span>` : ''}
      ${yr ? `<span class="pill py">${yr}</span>` : ''}
      ${hasTr ? `<span class="pill pt">Translated</span>` : `<span class="pill pp">Pending</span>`}
    </div>
    <div class="tsl">Norwegian original</div>
    <div class="tsb">${esc(d.tekst || '')}</div>
    <div class="tsl">English translation with AI</div>
    ${hasTr ? `<div class="tsb">${esc(d.english_translation)}</div>` : `<div class="tspend">Translation pending</div>`}
    <div class="cmeta">
      ${d.samler ? `<span class="mi"><strong>Collector</strong> ${esc(d.samler)}</span>` : ''}
      ${d.informant ? `<span class="mi"><strong>Informant</strong> ${esc(d.informant)}</span>` : ''}
      ${d.signatur ? `<span class="mi"><strong>Archive</strong> ${esc(d.signatur)}</span>` : ''}
      ${d._url ? `<span style="margin-left:auto"><a class="srcl" href="${esc(d._url)}" target="_blank">View at UiO ↗</a></span>` : ''}
    </div>
    <button class="legend-modal-copy" onclick="copyLegendLink('${esc(d.id)}',this)">🔗 Copy link to this legend</button>
  `;
  backdrop.classList.add('show');
}

function closeLegendModal() {
  const backdrop = document.getElementById('legend-modal-backdrop');
  if (backdrop) backdrop.classList.remove('show');
  if (location.hash.slice(1).startsWith('legend-')) {
    history.replaceState(null, '', location.pathname + location.search + '#' + curTab);
  }
}

function goPage(p) {
  const pages = Math.ceil(filtered.length / PPG);
  if (p < 1 || p > pages) return;
  curPage = p;
  renderBrowse();
  document.getElementById('browse-main').scrollTop = 0;
}

let srchTimer = null;
