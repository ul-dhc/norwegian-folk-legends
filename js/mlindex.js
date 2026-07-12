let mliActive = null;

function initMLIndex() {
  const body = document.getElementById('mli-tree-body');
  if (body._built) return;
  body._built = true;
  function countForCode(code) {
    const norm = code.replace('ML ', 'ml').replace(' ', '').toLowerCase();
    return allData.filter((d) => {
      const dc = (d.ml_code || '').toLowerCase().replace(/\s/g, '');
      return dc === norm || dc.startsWith(norm.slice(0, 6));
    }).length;
  }
  function renderLeaf(item) {
    const count = countForCode(item.code);
    if (!count) return '';
    const div = document.createElement('div');
    div.className = 'mli-item';
    div.dataset.code = item.code;
    div.innerHTML = `<span class="mli-code">${esc(item.code)}</span><span style="flex:1">${esc(item.label)}</span><span class="mli-badge">${count}</span>`;
    div.onclick = () => selectMLType(item.code, item.label, div);
    return div;
  }
  function renderGroup(node, depth) {
    if (node.code) {
      return renderLeaf(node);
    }
    const wrap = document.createElement('div');
    wrap.className = 'mli-group';
    const hdr = document.createElement('div');
    hdr.className = 'mli-group-header';
    hdr.innerHTML = `<span>${esc(node.group)}</span><span class="mli-caret">▶</span>`;
    hdr.onclick = () => {
      hdr.classList.toggle('open');
    };
    wrap.appendChild(hdr);
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'mli-group-items';
    (node.items || []).forEach((child) => {
      const el = renderGroup(child, depth + 1);
      if (el) itemsDiv.appendChild(el);
    });
    if (!itemsDiv.children.length) return null;
    wrap.appendChild(itemsDiv);
    return wrap;
  }
  ML_TREE.forEach((topNode) => {
    const el = renderGroup(topNode, 0);
    if (el) body.appendChild(el);
  });
}

function selectMLType(code, label, el) {
  document.querySelectorAll('.mli-item').forEach((e) => e.classList.remove('active'));
  el.classList.add('active');
  mliActive = code;
  const norm = code.replace('ML ', 'ml').replace(/\s/g, '').toLowerCase();
  const matches = allData
    .filter((d) => {
      const dc = (d.ml_code || '').toLowerCase().replace(/\s/g, '');
      return dc === norm || dc.startsWith(norm.slice(0, 6));
    })
    .sort((a, b) => (a.tittel || '').localeCompare(b.tittel || ''));
  const detail = document.getElementById('mli-detail-inner');
  const samlaUrl = `https://samla.no/viewer/typekatalog/segn/`;
  detail.innerHTML = `\n    <div style="margin-bottom:20px">\n      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">\n        <span style="font-size:11px;font-weight:600;color:var(--lu);font-family:monospace">${esc(code)}</span>\n        <h2 style="font-size:18px;font-weight:600;color:var(--tp);margin:0">${esc(label)}</h2>\n      </div>\n      <div style="margin-top:6px;display:flex;gap:12px;align-items:center">\n        <span style="font-size:13px;color:var(--tm)">${matches.length} legend${matches.length !== 1 ? 's' : ''} in this subchapter</span>\n      </div>\n    </div>\n    ${
    matches.length
      ? `\n      <div style="display:flex;gap:8px;margin-bottom:16px">\n        <button onclick="mliExpandAll(true)" style="font-size:12px;padding:5px 12px;border:1px solid var(--bd);border-radius:var(--r);background:var(--sf);color:var(--ts);cursor:pointer">Expand all</button>\n        <button onclick="mliExpandAll(false)" style="font-size:12px;padding:5px 12px;border:1px solid var(--bd);border-radius:var(--r);background:var(--sf);color:var(--ts);cursor:pointer">Collapse all</button>\n      </div>\n      ${matches
          .map((d, i) => {
            const title = d.tittel || d.ml_title || 'Untitled';
            const sub = `${d.sted || ''}${d.sted && d.fylke ? ' · ' : ''}${d.fylke || ''}`;
            const hasTr = !!(d.english_translation || '').trim();
            const yr = cleanY(d.år_clean) || '';
            return legendCard(`mli-c-${i}`, d, title, sub, hasTr, yr, 'toggleCard', ' collapsed');
          })
          .join('')}`
      : '<div style="color:var(--td);font-size:13px">No legends found for this type in the current dataset.</div>'
  }\n  `;
}

function mliExpandAll(open) {
  document.querySelectorAll('#mli-detail-inner .lcard').forEach((c) => {
    if (open) c.classList.remove('collapsed');
    else c.classList.add('collapsed');
  });
}

function renderMLLegendCard(d, i) {
  return '';
}
