function setTlC(c) {
  tlC = c;
  document.getElementById('tlb-sg').className = 'tl-tb' + (c === 'subgenre' ? ' on' : '');
  document.getElementById('tlb-ml').className = 'tl-tb' + (c === 'mlgroup' ? ' on' : '');
  renderTimeline();
}

function renderTimeline() {
  const dated = allData.filter((d) => cleanY(d.år_clean) !== null);
  const years = dated.map((d) => cleanY(d.år_clean));
  const minY = Math.min(...years),
    maxY = Math.max(...years);
  const total = allData.length,
    undated = total - dated.length;
  document.getElementById('tl-dated').textContent = dated.length.toLocaleString();
  document.getElementById('tl-total').textContent = total.toLocaleString();
  document.getElementById('tl-undated').textContent = undated.toLocaleString();
  document.getElementById('tl-upct').textContent = Math.round((undated / total) * 100) + '%';
  document.getElementById('tl-sn1').textContent = dated.length.toLocaleString();
  document.getElementById('tl-ssub').textContent = 'of ' + total.toLocaleString() + ' total';
  document.getElementById('tl-sn2').textContent = minY;
  document.getElementById('tl-sn3').textContent = maxY;
  const buckets = {};
  dated.forEach((d) => {
    const y = cleanY(d.år_clean);
    const key = tlG === 'decade' ? Math.floor(y / 10) * 10 : y;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(d);
  });
  const keys = Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b);
  const maxCnt = Math.max(...keys.map((k) => buckets[k].length));
  const peak = keys.find((k) => buckets[k].length === maxCnt);
  document.getElementById('tl-sn4').textContent = tlG === 'decade' ? peak + 's' : String(peak);
  if (tlC === 'subgenre') {
    document.getElementById('tl-lgnd').innerHTML =
      `\n      <div class="tl-lgnd-item"><div class="tl-lgnd-dot" style="background:#B9CAE7"></div>Naturmytiske sagn</div>\n      <div class="tl-lgnd-item"><div class="tl-lgnd-dot" style="background:#D8A8B3"></div>Historiske sagn</div>`;
  } else {
    document.getElementById('tl-lgnd').innerHTML = Object.entries(MLGC)
      .map(
        ([k, v]) =>
          `<div class="tl-lgnd-item"><div class="tl-lgnd-dot" style="background:${v.bar}"></div>${k}xxx</div>`,
      )
      .join('');
  }
  let barHtml = '<div class="tl-axis"></div>';
  keys.forEach((k) => {
    const items = buckets[k];
    const h = Math.max(2, Math.round((items.length / maxCnt) * 100));
    const isSel = tlSel === k;
    const label = tlG === 'decade' ? k + 's' : String(k);
    let stk = '';
    if (tlC === 'subgenre') {
      const n = items.filter((d) => d.undersjanger === 'Naturmytiske sagn').length;
      const np = Math.round((n / items.length) * 100);
      stk = `<div style="height:${np}%;background:#B9CAE7"></div><div style="height:${100 - np}%;background:#D8A8B3"></div>`;
    } else {
      const grp = {};
      items.forEach((d) => {
        const g = (d.ml_code || '').slice(0, 3);
        grp[g] = (grp[g] || 0) + 1;
      });
      const t = items.length;
      stk = Object.entries(grp)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([g, c]) =>
            `<div style="height:${Math.round((c / t) * 100)}%;background:${
              (
                MLGC[g] || {
                  bar: '#E7DED2',
                }
              ).bar
            }"></div>`,
        )
        .join('');
    }
    barHtml += `<div class="tl-col" onclick="selectPeriod(${k})">\n      <div class="tl-bv${isSel ? ' sel' : ''}">${items.length}</div>\n      <div class="tl-stk${isSel ? ' sel' : ''}" style="height:${h}%">${stk}</div>\n      <div class="tl-bl${isSel ? ' sel' : ''}">${label}</div>\n    </div>`;
  });
  document.getElementById('tl-bars').innerHTML = barHtml;
  renderTlCollectors(tlSel, tlCollFilter);
  if (tlSel !== null) renderPeriodDetail(tlSel);
}

function renderTlCollectors(selKey, collFilter) {
  const dated = allData.filter((d) => cleanY(d.år_clean) !== null);
  let scope =
    selKey === null
      ? dated
      : dated.filter((d) => {
          const y = cleanY(d.år_clean);
          return tlG === 'decade' ? Math.floor(y / 10) * 10 === selKey : y === selKey;
        });
  const title =
    selKey === null
      ? 'Top collectors (all dated legends)'
      : `Top collectors — ${tlG === 'decade' ? selKey + 's' : selKey}`;
  document.getElementById('tl-coll-title').textContent = title;
  const cm = {};
  scope.forEach((d) => {
    if (d.samler) {
      const s = d.samler.trim();
      cm[s] = (cm[s] || 0) + 1;
    }
  });
  const top = Object.entries(cm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxC = top[0]?.[1] || 1;
  document.getElementById('tl-colls').innerHTML = top
    .map(
      ([name, cnt]) =>
        `\n    <div class="tl-cr" onclick="setTlCollFilter('${esc(name)}')">\n      <div class="tl-cn${collFilter === name ? ' ' + ' ' : ''}' style="${collFilter === name ? 'color:var(--lu);font-weight:500' : ''}">${esc(name)}</div>\n      <div class="tl-bw"><div class="tl-cb" style="width:${Math.round((cnt / maxC) * 100)}%;${collFilter === name ? 'background:var(--lu2)' : ''}"></div></div>\n      <div class="tl-cn-ct">${cnt}</div>\n    </div>`,
    )
    .join('');
}

function setTlCollFilter(name) {
  tlCollFilter = tlCollFilter === name ? null : name;
  if (tlSel !== null) renderPeriodLegends(tlSel, null, tlCollFilter);
  renderTlCollectors(tlSel, tlCollFilter);
  const fd = document.getElementById('tl-collector-filter-display');
  if (tlCollFilter) {
    fd.innerHTML = `<span class="tl-collector-filter">${esc(tlCollFilter)}<span class="tl-collector-filter-x" onclick="setTlCollFilter('${esc(tlCollFilter)}')">×</span></span>`;
  } else {
    fd.innerHTML = '';
  }
}

function selectPeriod(key) {
  tlSel = key;
  tlCollFilter = null;
  document.getElementById('tl-collector-filter-display').innerHTML = '';
  renderTimeline();
  document.getElementById('tl-ls').style.display = 'block';
  renderPeriodDetail(key);
  renderPeriodLegends(key, null, null);
}

function renderPeriodDetail(key) {
  const dated = allData.filter((d) => cleanY(d.år_clean) !== null);
  const items = dated.filter((d) => {
    const y = cleanY(d.år_clean);
    return tlG === 'decade' ? Math.floor(y / 10) * 10 === key : y === key;
  });
  const label = tlG === 'decade' ? key + 's' : String(key);
  const n = items.filter((d) => d.undersjanger === 'Naturmytiske sagn').length;
  document.getElementById('tl-sel-hd').textContent = label + ' — ' + items.length + ' legends';
  const mlM = {};
  items.forEach((d) => {
    if (d.ml_code) mlM[d.ml_code] = (mlM[d.ml_code] || 0) + 1;
  });
  const topML = Object.entries(mlM)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  document.getElementById('tl-sel-info').innerHTML =
    `\n    <div class="tl-sc">\n      <div class="tl-st">${label}</div>\n      <div class="tl-ss">${n} Naturmytiske · ${items.length - n} Historiske</div>\n      <div class="tl-mpl">${topML.map(([code, cnt]) => `<span class="tl-mpp" style="background:${mlC(code)}30;color:${mlT(code)};border-color:${mlC(code)}" onclick="filterTlByML('${esc(code)}',${key})">${esc(code)} ×${cnt}</span>`).join('')}\n      </div>\n      <button class="tl-sab" onclick="renderPeriodLegends(${key},null,null)">Show all ${items.length} legends ↓</button>\n    </div>`;
}

function filterTlByML(ml, key) {
  renderPeriodLegends(key, ml, tlCollFilter);
}

function renderPeriodLegends(key, mlCode, collFilter) {
  const dated = allData.filter((d) => cleanY(d.år_clean) !== null);
  let items = dated.filter((d) => {
    const y = cleanY(d.år_clean);
    return tlG === 'decade' ? Math.floor(y / 10) * 10 === key : y === key;
  });
  if (mlCode) items = items.filter((d) => d.ml_code === mlCode);
  if (collFilter) items = items.filter((d) => d.samler === collFilter);
  const label = tlG === 'decade' ? key + 's' : String(key);
  document.getElementById('tl-lt').textContent =
    label + (mlCode ? ' · ' + mlCode : '') + (collFilter ? ' · ' + collFilter : '');
  document.getElementById('tl-lc').textContent =
    items.length + ' legend' + (items.length !== 1 ? 's' : '');
  const ll = document.getElementById('tl-ll');
  if (!items.length) {
    ll.innerHTML = '<div class="tl-empty">No legends match.</div>';
    return;
  }
  ll.innerHTML = items
    .map((d, i) => {
      const hasTr = d.english_translation && d.english_translation.trim();
      const title = d.tittel || d.ml_title || d.id;
      const yr = cleanY(d.år_clean);
      const sub = [d.sted, d.fylke, yr].filter(Boolean).join(' · ');
      return legendCard(`tlc-${key}-${i}`, d, title, sub, hasTr, yr, 'toggleCard');
    })
    .join('');
}
