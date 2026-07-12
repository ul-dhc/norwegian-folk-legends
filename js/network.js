const NetViz = (function () {
  const MLC = {
    ml3: {
      f: '#E8C990',
      s: '#9A6F20',
      l: 'ml3 Magic & Devil',
    },
    ml4: {
      f: '#7BAFD4',
      s: '#1A5C8A',
      l: 'ml4 Nøkk & Water',
    },
    ml5: {
      f: '#7ECBB8',
      s: '#0F6B58',
      l: 'ml5 Hulder',
    },
    ml6: {
      f: '#D48BAA',
      s: '#7A2545',
      l: 'ml6 Huldrefolk',
    },
    ml7: {
      f: '#B8A8D8',
      s: '#4A2F8C',
      l: 'ml7 Historical',
    },
    ml8: {
      f: '#9DC880',
      s: '#376B20',
      l: 'ml8 Other',
    },
  };
  const DPR = window.devicePixelRatio || 1;
  let nodes = [],
    edges = [],
    layout = 'force',
    sgFilter = 'all',
    dark = true;
  let sc = 1,
    tx = 0,
    ty = 0;
  let dragNode = null,
    panning = false,
    panStart = null,
    downPos = null,
    moved = false;
  let hoverNode = null,
    selected = null,
    alpha = 0.9;
  let animId = null,
    needFit = false;
  let mlF = new Set(Object.keys(MLC));
  let bipLeft = [],
    bipRight = [],
    bipEdges = [];
  function nfill(n) {
    if (n.k === 'county') return dark ? '#7BAFD4' : '#3B82F6';
    if (n.k === 'coll') return dark ? '#BFE3DA' : '#10B981';
    return (
      MLC[n.g] || {
        f: '#888',
      }
    ).f;
  }
  function nstroke(n) {
    if (n.k === 'county') return dark ? '#1A5C8A' : '#1D4ED8';
    if (n.k === 'coll') return dark ? '#0F6E56' : '#047857';
    return (
      MLC[n.g] || {
        s: '#555',
      }
    ).s;
  }
  function nr(n) {
    if (n.k === 'county') return 8 + Math.min(n.c / 10, 10);
    if (n.k === 'ml') return 4 + Math.min(n.c / 8, 14);
    return 4 + Math.min(n.c / 12, 8);
  }
  function cv() {
    return document.getElementById('net-canvas');
  }
  function wrap() {
    return document.getElementById('net-canvas-wrap');
  }
  function h2rgb(h) {
    return `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)}`;
  }
  function esc2(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function getData() {
    let d = allData;
    if (sgFilter === 'natur') d = d.filter((x) => x.undersjanger === 'Naturmytiske sagn');
    if (sgFilter === 'hist') d = d.filter((x) => x.undersjanger === 'Historiske sagn');
    const fc = document.getElementById('net-county-focus')?.value || '';
    if (fc) d = d.filter((x) => x.fylke === fc);
    return d;
  }
  function buildAdj() {
    const adj = new Map(nodes.map((n) => [n.id, new Set()]));
    edges.forEach((e) => {
      adj.get(e.a)?.add(e.b);
      adj.get(e.b)?.add(e.a);
    });
    return adj;
  }
  function buildGraph() {
    if (!allData.length) return;
    if (layout === 'bip') {
      buildBipartite();
      return;
    }
    const data = getData();
    const ml = {},
      co = {},
      fy = {};
    data.forEach((d) => {
      const m = (d.ml_code || '').trim(),
        s = (d.samler || '').trim(),
        f = (d.fylke || '').trim();
      if (m && m !== 'nan') {
        if (!ml[m])
          ml[m] = {
            id: m,
            label: d.ml_title || m,
            k: 'ml',
            g: m.slice(0, 3),
            c: 0,
            hi: false,
          };
        ml[m].c++;
      }
      if (s && s !== 'nan') {
        if (!co[s])
          co[s] = {
            id: s,
            label: s,
            k: 'coll',
            g: 'coll',
            c: 0,
            hi: false,
          };
        co[s].c++;
      }
      if (f && f !== 'nan') {
        if (!fy[f])
          fy[f] = {
            id: f,
            label: f,
            k: 'county',
            g: 'county',
            c: 0,
            hi: false,
          };
        fy[f].c++;
      }
    });
    const mlN = Object.values(ml).filter((n) => mlF.has(n.g));
    const mlI = new Set(mlN.map((n) => n.id));
    const coN = Object.values(co).filter((n) => n.c >= 3);
    const coI = new Set(coN.map((n) => n.id));
    const fyN = Object.values(fy);
    const eMap = {};
    data.forEach((d) => {
      const m = (d.ml_code || '').trim(),
        s = (d.samler || '').trim(),
        f = (d.fylke || '').trim();
      if (m && f && mlI.has(m) && f !== 'nan') {
        const k = f + '|' + m;
        eMap[k] = (eMap[k] || 0) + 1;
      }
      if (m && s && mlI.has(m) && coI.has(s)) {
        const k = m + '|' + s;
        eMap[k] = (eMap[k] || 0) + 1;
      }
    });
    const el = cv();
    const W = el?.parentElement?.getBoundingClientRect().width || 800;
    const H = el?.parentElement?.getBoundingClientRect().height || 600;
    const ep = new Map(
      nodes.map((n) => [
        n.id,
        {
          x: n.x,
          y: n.y,
        },
      ]),
    );
    const allN = [...fyN, ...mlN, ...coN];
    if (layout === 'hier') {
      const rows = [fyN, mlN, coN];
      const ys = [H * 0.12, H * 0.5, H * 0.88];
      rows.forEach((row, ri) => {
        const span = W * 0.94,
          sx2 = (W - span) / 2;
        row.forEach((n, i) => {
          n.x = sx2 + (row.length > 1 ? (i / (row.length - 1)) * span : W / 2);
          n.y = ys[ri];
          n.vx = 0;
          n.vy = 0;
        });
      });
      alpha = 0;
    } else {
      const R = Math.min(W, H) * 0.38;
      allN.forEach((n, i) => {
        const p = ep.get(n.id);
        if (p && p.x && layout === 'force') {
          n.x = p.x;
          n.y = p.y;
        } else {
          const a = (i / allN.length) * Math.PI * 2;
          n.x = W / 2 + Math.cos(a) * R * (0.6 + Math.random() * 0.4);
          n.y = H / 2 + Math.sin(a) * R * (0.6 + Math.random() * 0.4);
        }
        n.vx = 0;
        n.vy = 0;
      });
      alpha = 0.9;
    }
    nodes = allN;
    edges = Object.entries(eMap).map(([k, w]) => {
      const [a, b] = k.split('|');
      return {
        a: a,
        b: b,
        w: w,
      };
    });
    selected = null;
    hoverNode = null;
    nodes.forEach((n) => (n.hi = false));
    const dp = document.getElementById('net-detail-panel');
    if (dp) dp.style.display = 'none';
    const st = document.getElementById('net-status');
    if (st) st.textContent = allN.length + ' nodes · ' + edges.length + ' edges';
    const nc = document.getElementById('nc-coll');
    if (nc) nc.textContent = coN.length;
    if (layout === 'force') {
      for (let i = 0; i < 300; i++) tick();
    }
    needFit = true;
  }
  function buildBipartite() {
    if (!allData.length) return;
    const data = getData();
    const lf = document.getElementById('bip-left')?.value || 'samler';
    const rf = document.getElementById('bip-right')?.value || 'ml';
    const lMap = {},
      rMap = {};
    data.forEach((d) => {
      const lv = (lf === 'samler' ? d.samler : d.fylke || '').trim();
      const rv = (rf === 'ml' ? d.ml_code : rf === 'fylke' ? d.fylke : d.samler || '').trim();
      if (!lv || lv === 'nan' || !rv || rv === 'nan') return;
      if (!lMap[lv])
        lMap[lv] = {
          id: 'L|' + lv,
          label: lv,
          k: lf === 'samler' ? 'coll' : 'county',
          g: 'left',
          c: 0,
          raw: lv,
          hi: false,
        };
      lMap[lv].c++;
      const rLabel = rf === 'ml' ? data.find((x) => x.ml_code === rv)?.ml_title || rv : rv;
      if (!rMap[rv])
        rMap[rv] = {
          id: 'R|' + rv,
          label: rLabel,
          k: rf === 'ml' ? 'ml' : rf === 'fylke' ? 'county' : 'coll',
          g: rv.slice(0, 3),
          c: 0,
          raw: rv,
          hi: false,
        };
      rMap[rv].c++;
    });
    const lNodes = Object.values(lMap)
      .sort((a, b) => b.c - a.c)
      .slice(0, 30);
    const lSet = new Set(lNodes.map((n) => n.raw));
    const eMap = {};
    data.forEach((d) => {
      const lv = (lf === 'samler' ? d.samler : d.fylke || '').trim();
      const rv = (rf === 'ml' ? d.ml_code : rf === 'fylke' ? d.fylke : d.samler || '').trim();
      if (!lv || !rv || !lSet.has(lv) || lv === 'nan' || rv === 'nan') return;
      const k = 'L|' + lv + '|||R|' + rv;
      eMap[k] = (eMap[k] || 0) + 1;
    });
    const rSet = new Set(Object.keys(eMap).map((k) => k.split('|||')[1].slice(2)));
    const rNodes = Object.values(rMap)
      .filter((n) => rSet.has(n.raw))
      .sort((a, b) => b.c - a.c);
    bipLeft = lNodes;
    bipRight = rNodes;
    bipEdges = Object.entries(eMap).map(([k, w]) => {
      const [a, b] = k.split('|||');
      return {
        a: a,
        b: b,
        w: w,
      };
    });
    nodes = [...lNodes, ...rNodes];
    edges = bipEdges;
    selected = null;
    hoverNode = null;
    nodes.forEach((n) => (n.hi = false));
    const dp = document.getElementById('net-detail-panel');
    if (dp) dp.style.display = 'none';
    const st = document.getElementById('net-status');
    if (st)
      st.textContent =
        lNodes.length + ' left · ' + rNodes.length + ' right · ' + bipEdges.length + ' edges';
    const el2 = cv();
    const W2 = el2?.parentElement?.getBoundingClientRect().width || 800;
    const H2 = el2?.parentElement?.getBoundingClientRect().height || 600;
    const pad = 50;
    const lx = W2 * 0.25,
      rx = W2 * 0.75;
    lNodes.forEach((n, i) => {
      n.x = lx;
      n.y = pad + (i / (lNodes.length - 1 || 1)) * (H2 - pad * 2);
      n.vx = 0;
      n.vy = 0;
    });
    rNodes.forEach((n, i) => {
      n.x = rx;
      n.y = pad + (i / (rNodes.length - 1 || 1)) * (H2 - pad * 2);
      n.vx = 0;
      n.vy = 0;
    });
    alpha = 0;
    sc = 1;
    tx = 0;
    ty = 0;
    needFit = false;
  }
  function tick() {
    if (layout === 'bip' || layout === 'hier') return;
    const el = cv();
    if (!el) return;
    const nm = new Map(nodes.map((n) => [n.id, n]));
    nodes.forEach((n) => {
      n.fx = 0;
      n.fy = 0;
    });
    const nn = nodes.length;
    const spreadVal = parseFloat(document.getElementById('net-spread')?.value || 4);
    const REP = 500 * spreadVal;
    const REST = 50 + spreadVal * 18;
    for (let i = 0; i < nn; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nn; j++) {
        const b = nodes[j];
        let dx = a.x - b.x,
          dy = a.y - b.y,
          d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const d = Math.sqrt(d2);
        if (d > 1200) continue;
        const f = REP / d2;
        const fx = (dx / d) * f,
          fy = (dy / d) * f;
        a.fx += fx;
        a.fy += fy;
        b.fx -= fx;
        b.fy -= fy;
      }
    }
    edges.forEach((e) => {
      const a = nm.get(e.a),
        b = nm.get(e.b);
      if (!a || !b) return;
      let dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = 0.01 * (d - REST);
      const fx = (dx / d) * f,
        fy = (dy / d) * f;
      a.fx += fx;
      a.fy += fy;
      b.fx -= fx;
      b.fy -= fy;
    });
    const drift = alpha < 0.025 ? 0.008 : alpha;
    nodes.forEach((n) => {
      n.fx += -n.x * 0.003;
      n.fy += -n.y * 0.003;
      if (n === dragNode) return;
      n.vx = (n.vx + n.fx * drift) * 0.82;
      n.vy = (n.vy + n.fy * drift) * 0.82;
      const sp = Math.hypot(n.vx, n.vy);
      const maxSpd = alpha < 0.025 ? 1.2 : 28;
      if (sp > maxSpd) {
        n.vx *= maxSpd / sp;
        n.vy *= maxSpd / sp;
      }
      n.x += n.vx;
      n.y += n.vy;
    });
    if (alpha > 0.025) alpha *= 0.988;
  }
  function toWorld(sx, sy) {
    return {
      x: (sx - tx) / sc,
      y: (sy - ty) / sc,
    };
  }
  function nodeAt(sx, sy) {
    const w = toWorld(sx, sy);
    let best = null,
      bd = 1e9;
    nodes.forEach((n) => {
      const r = nr(n) + 6;
      const d = Math.hypot(n.x - w.x, n.y - w.y);
      if (d < r && d < bd) {
        bd = d;
        best = n;
      }
    });
    return best;
  }
  function fit() {
    if (!nodes.length) return;
    const el = cv();
    if (!el) return;
    const W = el.offsetWidth || 800,
      H = el.offsetHeight || 600;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    nodes.forEach((n) => {
      const r = nr(n);
      x0 = Math.min(x0, n.x - r);
      y0 = Math.min(y0, n.y - r);
      x1 = Math.max(x1, n.x + r);
      y1 = Math.max(y1, n.y + r);
    });
    const pad = 60,
      bw = x1 - x0 + pad * 2,
      bh = y1 - y0 + pad * 2;
    sc = Math.min(W / bw, H / bh, 1.8);
    if (!isFinite(sc) || sc <= 0) sc = 1;
    tx = W / 2 - ((x0 + x1) / 2) * sc;
    ty = H / 2 - ((y0 + y1) / 2) * sc;
  }
  function draw() {
    const el = cv();
    if (!el) return;
    const wp = wrap();
    if (!wp) return;
    const rect = wp.getBoundingClientRect();
    const W = Math.round(rect.width),
      H = Math.round(rect.height);
    if (!W || !H) return;
    if (el.width !== W * DPR || el.height !== H * DPR) {
      el.width = W * DPR;
      el.height = H * DPR;
      el.style.width = W + 'px';
      el.style.height = H + 'px';
    }
    const ctx = el.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const bg = dark ? '#0E1117' : '#F7F8FA';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (!nodes.length) {
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click Apply to build the network', W / 2, H / 2);
      return;
    }
    if (layout === 'bip') {
      drawBip(ctx, W, H);
      return;
    }
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(sc, sc);
    const nm = new Map(nodes.map((n) => [n.id, n]));
    const textColor = dark ? 'rgba(255,255,255,.9)' : 'rgba(20,20,40,.9)';
    const dimTextColor = dark ? 'rgba(255,255,255,.12)' : 'rgba(20,20,40,.12)';
    ctx.setLineDash([]);
    edges.forEach((e) => {
      const a = nm.get(e.a),
        b = nm.get(e.b);
      if (!a || !b) return;
      const isActive = selected && (e.a === selected || e.b === selected);
      const mn = a.k === 'ml' ? a : b.k === 'ml' ? b : null;
      const rgb = h2rgb(
        (
          MLC[mn?.g] || {
            f: '#7BAFD4',
          }
        ).f,
      );
      let col, lw;
      if (selected) {
        if (isActive) {
          col = `rgba(${rgb},.52)`;
          lw = 1.4 / sc;
        } else {
          col = dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)';
          lw = 0.3 / sc;
        }
      } else {
        col = dark ? `rgba(${rgb},.13)` : `rgba(${rgb},.22)`;
        lw = 0.5 / sc;
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    nodes.forEach((n) => {
      const r = nr(n) / sc;
      const dim = selected && !n.hi;
      ctx.globalAlpha = dim ? 0.08 : hoverNode === n || n.hi ? 1 : 0.85;
      ctx.fillStyle = nfill(n);
      ctx.strokeStyle = nstroke(n);
      ctx.lineWidth = (n.hi || hoverNode === n ? 2 : 1) / sc;
      if (n.k === 'county') {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });
    const BASE_FS = 11;
    nodes.forEach((n) => {
      const r = nr(n) / sc;
      const dim = selected && !n.hi;
      const ih = hoverNode === n || n.hi;
      if (layout === 'hier') {
        if (dim) return;
        const lbl = (n.label || n.id).slice(0, 26);
        const fs = BASE_FS / sc;
        ctx.save();
        ctx.font = `${ih ? '600 ' : ''}${fs}px system-ui`;
        const color = dark ? 'rgba(255,255,255,.9)' : 'rgba(20,20,40,.85)';
        if (n.k === 'county') {
          ctx.translate(n.x, n.y - r - 4 / sc);
          ctx.rotate(-Math.PI / 3);
        } else if (n.k === 'coll') {
          ctx.translate(n.x, n.y + r + 4 / sc);
          ctx.rotate(-Math.PI / 3);
        } else {
          ctx.translate(n.x, n.y + r + 4 / sc);
          ctx.rotate(-Math.PI / 3);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = dark ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.6)';
        ctx.fillText(lbl, 1 / sc, 1 / sc);
        ctx.fillStyle = color;
        ctx.fillText(lbl, 0, 0);
        ctx.restore();
      } else {
        const show =
          ih || n.k === 'county' || (n.k === 'ml' && n.c > 15) || (n.k === 'coll' && n.c > 12);
        if (!show || dim) return;
        const fs = BASE_FS / sc;
        ctx.font = `${ih ? '600 ' : ''}${fs}px system-ui`;
        ctx.fillStyle = dim
          ? dimTextColor
          : ih
            ? textColor
            : dark
              ? 'rgba(255,255,255,.75)'
              : 'rgba(20,20,40,.75)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText((n.label || n.id).slice(0, 22), n.x, n.y + r + 3 / sc);
      }
    });
    ctx.restore();
  }
  let bipAnimT = 0;
  let bipAnimTarget = null;
  let bipAnimEdges = [];
  function drawBip(ctx, W, H) {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(sc, sc);
    const nm = new Map(nodes.map((n) => [n.id, n]));
    const maxW = Math.max(...bipEdges.map((e) => e.w), 1);
    const maxC = Math.max(...[...bipLeft, ...bipRight].map((n) => n.c), 1);
    const lx = bipLeft[0]?.x || (W * 0.25) / sc;
    const rx = bipRight[0]?.x || (W * 0.75) / sc;
    const tcolor = dark ? 'rgba(255,255,255,.88)' : 'rgba(20,20,40,.9)';
    const dtcolor = dark ? 'rgba(255,255,255,.13)' : 'rgba(20,20,40,.13)';
    const muted = dark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.35)';
    const lLabel =
      document.getElementById('bip-left')?.value === 'samler' ? 'COLLECTORS' : 'COUNTIES';
    const rLabel =
      document.getElementById('bip-right')?.value === 'ml'
        ? 'ML CATEGORIES'
        : document.getElementById('bip-right')?.value === 'fylke'
          ? 'COUNTIES'
          : 'COLLECTORS';
    ctx.font = `500 ${9 / sc}px system-ui`;
    ctx.letterSpacing = '0.08em';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    if (bipLeft.length) ctx.fillText(lLabel, lx, bipLeft[0].y - 22 / sc);
    if (bipRight.length) ctx.fillText(rLabel, rx, bipRight[0].y - 22 / sc);
    ctx.letterSpacing = '0';
    if (bipAnimTarget && bipAnimT < 1) {
      bipAnimT = Math.min(1, bipAnimT + 0.032);
    }
    const hasSelection = !!selected;
    bipEdges.forEach((e) => {
      const a = nm.get(e.a),
        b = nm.get(e.b);
      if (!a || !b) return;
      const isActive = hasSelection && (e.a === selected || e.b === selected);
      const dim = hasSelection && !isActive;
      const rn = bipRight.find((n) => n.id === e.b);
      const rgb = h2rgb(
        (
          MLC[rn?.g] || {
            f: '#7BAFD4',
          }
        ).f,
      );
      const baseOpacity = 0.08 + 0.14 * (e.w / maxW);
      if (dim) {
        ctx.strokeStyle = `rgba(${rgb},0.03)`;
        ctx.lineWidth = Math.max(0.2, Math.sqrt(e.w / maxW) * 1.2) / sc;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (lx + rx) / 2;
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke();
        return;
      }
      const connCount = bipEdges.filter((ed) => ed.a === e.a).length;
      const relW = 1 / Math.sqrt(connCount || 1);
      const lw = Math.max(0.3, ((0.5 + relW * 2.5) * e.w) / maxW) / sc;
      if (isActive && bipAnimT < 1) {
        const t = bipAnimT;
        const mx = (a.x + b.x) / 2;
        ctx.strokeStyle = `rgba(${rgb},0.45)`;
        ctx.lineWidth = lw * 1.5;
        ctx.beginPath();
        const steps = 40;
        let started = false;
        for (let i = 0; i <= steps * t; i++) {
          const tt = i / steps;
          const cx = (lx + rx) / 2;
          const bx =
            3 * (1 - tt) * (1 - tt) * tt * cx + 3 * (1 - tt) * tt * tt * cx + tt * tt * tt * b.x;
          const by2 =
            3 * (1 - tt) * (1 - tt) * tt * a.y + 3 * (1 - tt) * tt * tt * b.y + tt * tt * tt * b.y;
          const p0x = a.x,
            p0y = a.y,
            c1x = cx,
            c1y = a.y,
            c2x = cx,
            c2y = b.y,
            p3x = b.x,
            p3y = b.y;
          const bpx =
            Math.pow(1 - tt, 3) * p0x +
            3 * Math.pow(1 - tt, 2) * tt * c1x +
            3 * (1 - tt) * tt * tt * c2x +
            tt * tt * tt * p3x;
          const bpy =
            Math.pow(1 - tt, 3) * p0y +
            3 * Math.pow(1 - tt, 2) * tt * c1y +
            3 * (1 - tt) * tt * tt * c2y +
            tt * tt * tt * p3y;
          if (!started) {
            ctx.moveTo(bpx, bpy);
            started = true;
          } else ctx.lineTo(bpx, bpy);
        }
        ctx.stroke();
        if (t < 0.98) {
          const tt = Math.min(t, 0.99);
          const p0x = a.x,
            p0y = a.y,
            c1x = (lx + rx) / 2,
            c1y = a.y,
            c2x = (lx + rx) / 2,
            c2y = b.y,
            p3x = b.x,
            p3y = b.y;
          const tipX =
            Math.pow(1 - tt, 3) * p0x +
            3 * Math.pow(1 - tt, 2) * tt * c1x +
            3 * (1 - tt) * tt * tt * c2x +
            tt * tt * tt * p3x;
          const tipY =
            Math.pow(1 - tt, 3) * p0y +
            3 * Math.pow(1 - tt, 2) * tt * c1y +
            3 * (1 - tt) * tt * tt * c2y +
            tt * tt * tt * p3y;
          ctx.beginPath();
          ctx.arc(tipX, tipY, 3 / sc, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},0.55)`;
          ctx.fill();
        }
      } else {
        const opacity = isActive ? 0.42 : baseOpacity;
        ctx.strokeStyle = `rgba(${rgb},${opacity})`;
        ctx.lineWidth = isActive ? lw * 1.4 : lw;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (lx + rx) / 2;
        ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
        ctx.stroke();
      }
    });
    const BASE_NR = 5;
    bipLeft.forEach((n) => {
      const dim = hasSelection && !n.hi;
      const ih = hoverNode === n || n.hi;
      const nR = (BASE_NR + Math.sqrt(n.c / maxC) * 10) / sc;
      ctx.globalAlpha = dim ? 0.08 : ih ? 1 : 0.88;
      ctx.fillStyle = nfill(n);
      ctx.strokeStyle = nstroke(n);
      ctx.lineWidth = (ih ? 2 : 1) / sc;
      ctx.beginPath();
      ctx.arc(n.x, n.y, nR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      const fs = 11 / sc;
      ctx.font = `${ih ? '600 ' : ''}${fs}px system-ui`;
      ctx.fillStyle = dim ? dtcolor : ih ? '#fff' : tcolor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((n.label || n.raw || '').slice(0, 30), n.x - nR - 6 / sc, n.y);
    });
    bipRight.forEach((n) => {
      const dim = hasSelection && !n.hi;
      const ih = hoverNode === n || n.hi;
      const col = (
        MLC[n.g] || {
          f: '#B0B8C8',
        }
      ).f;
      const nR = (BASE_NR + Math.sqrt(n.c / maxC) * 10) / sc;
      ctx.globalAlpha = dim ? 0.08 : ih ? 1 : 0.88;
      ctx.fillStyle = col;
      ctx.strokeStyle = (
        MLC[n.g] || {
          s: '#4A5568',
        }
      ).s;
      ctx.lineWidth = (ih ? 2 : 1) / sc;
      ctx.beginPath();
      ctx.arc(n.x, n.y, nR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      const fs = 11 / sc;
      ctx.font = `${ih ? '600 ' : ''}${fs}px system-ui`;
      ctx.fillStyle = dim ? dtcolor : ih ? '#fff' : tcolor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText((n.label || n.raw || '').slice(0, 30), n.x + nR + 6 / sc, n.y);
    });
    ctx.restore();
  }
  function loop() {
    tick();
    if (needFit && alpha < 0.15) {
      fit();
      needFit = false;
    }
    draw();
    animId = requestAnimationFrame(loop);
  }
  function select(n) {
    if (selected === n.id) {
      selected = null;
      nodes.forEach((x) => (x.hi = false));
      document.getElementById('net-detail-panel').style.display = 'none';
      return;
    }
    selected = n.id;
    const adj = buildAdj();
    const nb = adj.get(n.id) || new Set();
    nodes.forEach((x) => (x.hi = x.id === n.id || nb.has(x.id)));
    showInfo(n, nb);
  }
  function showInfo(n, nb) {
    const panel = document.getElementById('net-detail-panel');
    if (!panel) return;
    panel.style.display = 'block';
    const kl = {
      county: 'County',
      ml: 'ML category',
      coll: 'Collector',
    };
    const tbg = n.k === 'county' ? '#B9CAE7' : n.k === 'coll' ? '#BFE3DA' : MLC[n.g]?.f || '#888';
    const nm = new Map(nodes.map((x) => [x.id, x]));
    const connNodes = [...nb]
      .map((id) => nm.get(id))
      .filter(Boolean)
      .sort((a, b) => b.c - a.c);
    const byK = {};
    connNodes.forEach((x) => {
      if (!byK[x.k]) byK[x.k] = [];
      byK[x.k].push(x);
    });
    const ae = edges.filter((e) => e.a === n.id || e.b === n.id);
    document.getElementById('net-detail-inner').innerHTML =
      `\n      <button onclick="NetViz.closeInfo()" style="float:right;background:none;border:none;font-size:18px;cursor:pointer;color:rgba(255,255,255,.5);line-height:1">×</button>\n      <span class="net-detail-tag" style="background:${tbg};color:#111">${kl[n.k] || n.k}</span>\n      <div class="net-detail-title">${esc(n.label || n.id)}</div>\n      <div class="net-detail-sub">${n.c} legend${n.c !== 1 ? 's' : ''} · ${nb.size} connection${nb.size !== 1 ? 's' : ''}</div>\n      ${Object.entries(
        byK,
      )
        .map(
          ([k, items]) =>
            `\n        <div class="net-detail-section">${
              {
                county: 'Counties',
                ml: 'ML categories',
                coll: 'Collectors',
              }[k] || k
            } (${items.length})</div>\n        ${items
              .slice(0, 12)
              .map((x) => {
                const w = ae.find((e) => e.a === x.id || e.b === x.id)?.w || '';
                return `<div class="net-detail-item"><div class="net-detail-dot" style="background:${nfill(x)}"></div><span style="flex:1">${esc((x.label || x.id).slice(0, 28))}</span>${w ? `<span style="color:rgba(255,255,255,.3);font-size:10px">${w}</span>` : ''}</div>`;
              })
              .join(
                '',
              )}\n        ${items.length > 12 ? `<div style="font-size:10px;color:rgba(255,255,255,.25);margin-top:3px">+${items.length - 12} more</div>` : ''}\n      `,
        )
        .join('')}`;
  }
  function attachEvents() {
    const el = cv();
    if (!el || el._ev) return;
    el._ev = true;
    el.addEventListener('mousedown', (e) => {
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left,
        sy = e.clientY - r.top;
      downPos = {
        sx: sx,
        sy: sy,
      };
      moved = false;
      const n = nodeAt(sx, sy);
      if (n) {
        dragNode = n;
        const prevSel = selected;
        selected = n.id;
        const adj = buildAdj();
        const nb = adj.get(n.id) || new Set();
        nodes.forEach((x) => (x.hi = x.id === n.id || nb.has(x.id)));
        showInfo(n, nb);
        if (layout === 'bip' && selected !== prevSel) {
          bipAnimT = 0;
          bipAnimTarget = selected;
        }
      } else {
        panning = true;
        panStart = {
          x: e.clientX - tx,
          y: e.clientY - ty,
        };
        el.classList.add('grabbing');
      }
    });
    window.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left,
        sy = e.clientY - r.top;
      if (downPos && Math.hypot(sx - downPos.sx, sy - downPos.sy) > 4) moved = true;
      if (dragNode) {
        const w = toWorld(sx, sy);
        dragNode.x = w.x;
        dragNode.y = w.y;
        dragNode.vx = 0;
        dragNode.vy = 0;
        if (layout !== 'bip') alpha = Math.max(alpha, 0.3);
      } else if (panning) {
        tx = e.clientX - panStart.x;
        ty = e.clientY - panStart.y;
      } else {
        const n = nodeAt(sx, sy);
        hoverNode = n || null;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (!dragNode && panning && !moved) {
        selected = null;
        nodes.forEach((x) => (x.hi = false));
        document.getElementById('net-detail-panel').style.display = 'none';
        bipAnimT = 0;
        bipAnimTarget = null;
      }
      dragNode = null;
      panning = false;
      el.classList.remove('grabbing');
      downPos = null;
    });
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const sx = e.clientX - r.left,
          sy = e.clientY - r.top;
        const w = toWorld(sx, sy);
        const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        sc = Math.max(0.07, Math.min(5, sc * f));
        tx = sx - w.x * sc;
        ty = sy - w.y * sc;
      },
      {
        passive: false,
      },
    );
  }
  function initSidebar() {
    const c = document.getElementById('net-ml-filters');
    if (!c || c._b) return;
    c._b = true;
    Object.entries(MLC).forEach(([k, col]) => {
      const row = document.createElement('label');
      row.className = 'net-ml-filter-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.onchange = () => {
        if (cb.checked) mlF.add(k);
        else mlF.delete(k);
      };
      const dot = document.createElement('div');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${col.f};flex-shrink:0`;
      const lbl = document.createElement('span');
      lbl.textContent = col.l;
      row.appendChild(cb);
      row.appendChild(dot);
      row.appendChild(lbl);
      c.appendChild(row);
    });
    const sel = document.getElementById('net-county-focus');
    if (sel && sel.options.length === 1 && allData.length) {
      [...new Set(allData.map((d) => d.fylke).filter(Boolean))].sort().forEach((f) => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        sel.appendChild(o);
      });
    }
  }
  const pub = {
    init() {
      attachEvents();
      initSidebar();
      if (!animId) loop();
    },
    rebuild() {
      buildGraph();
    },
    setLayout(l) {
      layout = l;
      ['force', 'hier', 'bip'].forEach((x) => {
        const b = document.getElementById('nlb-' + x);
        if (b) b.className = 'net-layout-btn' + (x === l ? ' on' : '');
      });
      document.getElementById('net-bip-ctrl-sb').style.display = l === 'bip' ? '' : 'none';
      document.getElementById('net-3l-ctrl-sb').style.display = l === 'bip' ? 'none' : '';
      document.getElementById('net-spread-ctrl').style.display = l === 'force' ? '' : 'none';
      buildGraph();
    },
    resetFilters() {
      mlF = new Set(Object.keys(MLC));
      document
        .querySelectorAll('#net-ml-filters input[type=checkbox]')
        .forEach((cb) => (cb.checked = true));
      const cf = document.getElementById('net-county-focus');
      if (cf) cf.value = '';
      sgFilter = 'all';
      ['all', 'natur', 'hist'].forEach((x) => {
        const b = document.getElementById('nfb-' + x);
        if (b) b.className = 'net-filter-btn' + (x === 'all' ? ' on' : '');
      });
      const sp = document.getElementById('net-spread');
      if (sp) {
        sp.value = 4;
        const sv = document.getElementById('net-spread-val');
        if (sv) sv.textContent = 4;
      }
      buildGraph();
    },
    setSg(v) {
      ['all', 'natur', 'hist'].forEach((x) => {
        const b = document.getElementById('nfb-' + x);
        if (b) b.className = 'net-filter-btn' + (x === v ? ' on' : '');
      });
    },
    zoom(f) {
      sc = Math.max(0.07, Math.min(5, sc * f));
    },
    fit() {
      needFit = true;
      alpha = Math.max(alpha, 0.1);
    },
    closeInfo() {
      selected = null;
      nodes.forEach((x) => (x.hi = false));
      document.getElementById('net-detail-panel').style.display = 'none';
    },
    toggleDark() {
      dark = !dark;
      const btn = document.getElementById('net-dark-btn');
      const wp = wrap();
      if (btn) {
        btn.textContent = dark ? '☀ Light mode' : '◑ Dark mode';
        btn.style.background = 'var(--lu)';
        btn.style.color = '#fff';
        btn.style.border = 'none';
      }
      if (wp) wp.style.background = dark ? '#0E1117' : '#F7F8FA';
    },
  };
  return pub;
})();

function renderNetwork() {
  NetViz.init();
  NetViz.rebuild();
}

function initNetSidebar() {}

function initNetCanvas() {}
