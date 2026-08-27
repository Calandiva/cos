/* =====================================================================
   포뮬라랩 — 상태 · 저장 · 공용 유틸
   ===================================================================== */
(function (G) {
'use strict';

/* ── DOM ───────────────────────────────────────────────────────── */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

function el(tag, attr, kids) {
  var parts = tag.split(/([#.])/), n = document.createElement(parts[0] || 'div'), i;
  for (i = 1; i < parts.length; i += 2) {
    if (parts[i] === '#') n.id = parts[i + 1];
    else n.classList.add(parts[i + 1]);
  }
  if (attr) for (var k in attr) {
    var v = attr[k];
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
    if (c == null || c === false) return;
    n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
  });
  return n;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ── 숫자 ──────────────────────────────────────────────────────── */
function n0(v) { return Math.round(v).toLocaleString('ko-KR'); }
function nd(v, d) { return Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function eng(v) {                                        /* 점도처럼 폭이 큰 값 */
  if (!isFinite(v)) return '—';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + '백만';
  if (v >= 1e4) return n0(v);
  if (v >= 100) return n0(v);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
function mass(g) {
  if (g >= 1e6) return (g / 1e6).toFixed(g >= 1e7 ? 1 : 2) + ' t';
  if (g >= 1000) return (g / 1000).toFixed(g >= 1e5 ? 0 : g >= 1e4 ? 1 : 2) + ' kg';
  if (g >= 1) return g.toFixed(2) + ' g';
  if (g >= 0.001) return (g * 1000).toFixed(1) + ' mg';
  return (g * 1e6).toFixed(0) + ' µg';
}
function won(v) {
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '억';
  if (v >= 1e4) return n0(v / 1e4) + '만';
  return n0(v);
}

/* ── 저장 ──────────────────────────────────────────────────────── */
var LS = 'formulab.v1';
function load() {
  try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; }
}
function save(o) {
  try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {}
}

/* ── 공유 코드 (URL 해시) ──────────────────────────────────────── */
function b64e(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}
function pack(st) {
  var o = {
    p: st.prod, b: st.batchG,
    r: st.rows.map(function (x) { return x.id + ':' + (+x.pct.toFixed(4)); }).join(','),
    s: st.steps ? st.steps.map(function (x) {
      return [x.t, x.temp, x.aji, x.homo, x.min, x.vac ? 1 : 0, (x.add || []).join('|'), x.ko].join('~');
    }).join(',') : ''
  };
  return 'F1.' + b64e(JSON.stringify(o));
}
function unpack(code) {
  if (!code || code.slice(0, 3) !== 'F1.') return null;
  try {
    var o = JSON.parse(b64d(code.slice(3)));
    return {
      prod: o.p, batchG: o.b,
      rows: (o.r || '').split(',').filter(Boolean).map(function (t) {
        var q = t.split(':'); return { id: q[0], pct: parseFloat(q[1]) || 0 };
      }),
      steps: o.s ? o.s.split(',').map(function (t) {
        var q = t.split('~');
        return { t: q[0], temp: +q[1], aji: +q[2], homo: +q[3], min: +q[4],
                 vac: q[5] === '1', add: q[6] ? q[6].split('|') : [], ko: q[7] || '', note: '' };
      }) : null
    };
  } catch (e) { return null; }
}

/* ── 상태 ──────────────────────────────────────────────────────── */
var S = {
  prod: 'lotion',
  rows: [],
  steps: null,          /* null = 표준 공정 자동 생성 */
  batchG: 1000,
  rigKey: null,         /* null = 배치 규모에 맞춰 자동 */
  mid: 'form',          /* form | proc | learn */
  view: 'ing',          /* 모바일 활성 화면 */
  cat: '',
  q: '',
  sel: null,
  result: null,
  spread: null,
  mission: null,
  progress: {},
  seed: 1
};

function rig() {
  return S.rigKey ? G.PROC.RIGS.filter(function (r) { return r.key === S.rigKey; })[0] || G.PROC.rigFor(S.batchG)
                  : G.PROC.rigFor(S.batchG);
}
function steps() {
  if (S.steps && S.steps.length) return S.steps;
  var p = G.PROD.get(S.prod);
  return G.PROC.buildTemplate(S.rows, p ? p.kind : 'emulsion', rig());
}
function total() {
  return S.rows.reduce(function (a, b) { return a + (+b.pct || 0); }, 0);
}
function setRows(rows) {
  S.rows = rows.map(function (r) { return { id: r.id, pct: +r.pct || 0 }; });
  S.steps = null; S.result = null; S.spread = null;
}
function addRow(id, pct) {
  var g = G.ING.BY[id]; if (!g) return false;
  var ex = S.rows.filter(function (r) { return r.id === id; })[0];
  if (ex) return false;
  var rest = 100 - total();
  var p = pct != null ? pct : Math.min(g.typ, Math.max(rest, 0.01));
  S.rows.push({ id: id, pct: +p.toFixed(4) });
  S.steps = null; S.result = null;
  return true;
}
function delRow(id) {
  S.rows = S.rows.filter(function (r) { return r.id !== id; });
  S.steps = null; S.result = null;
}
function has(id) { return S.rows.some(function (r) { return r.id === id; }); }

/* 정제수로 100% 맞추기 */
function balance() {
  var w = S.rows.filter(function (r) { return r.id === 'aqua'; })[0];
  var other = S.rows.reduce(function (a, b) { return a + (b.id === 'aqua' ? 0 : +b.pct || 0); }, 0);
  var rest = 100 - other;
  if (rest < 0) return false;
  if (w) w.pct = +rest.toFixed(4);
  else S.rows.unshift({ id: 'aqua', pct: +rest.toFixed(4) });
  S.result = null;
  return true;
}

/* 100% 로 정규화 */
function normalize() {
  var t = total(); if (t <= 0) return;
  S.rows.forEach(function (r) { r.pct = +(r.pct / t * 100).toFixed(4); });
  S.result = null;
}

/* ── 토스트 ────────────────────────────────────────────────────── */
var toastT = null;
function toast(msg, ms) {
  var old = $('.toast'); if (old) old.remove();
  var n = el('div.toast', { text: msg });
  document.body.appendChild(n);
  clearTimeout(toastT);
  toastT = setTimeout(function () { n.remove(); }, ms || 2200);
}

/* ── 시트(모달) ────────────────────────────────────────────────── */
function sheet(title, bodyNode, footNodes) {
  var mask = el('div.mask');
  var sh = el('div.sheet', null, [
    el('div.grab'),
    el('div.sheet-hd', null, [
      el('b', { text: title }),
      el('button.btn.ico', { text: '✕', onclick: close, 'aria-label': '닫기' })
    ]),
    el('div.sheet-bd', null, [bodyNode]),
    footNodes && footNodes.length ? el('div.sheet-ft', null, footNodes) : null
  ]);
  mask.appendChild(sh);
  mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  document.body.appendChild(mask);
  function close() { mask.remove(); document.removeEventListener('keydown', onk); }
  function onk(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onk);
  return { close: close, node: sh };
}

G.CORE = {
  $: $, $$: $$, el: el, clear: clear, esc: esc,
  n0: n0, nd: nd, eng: eng, mass: mass, won: won,
  load: load, save: save, pack: pack, unpack: unpack,
  S: S, rig: rig, steps: steps, total: total,
  setRows: setRows, addRow: addRow, delRow: delRow, has: has,
  balance: balance, normalize: normalize,
  toast: toast, sheet: sheet, LS: LS
};
})(window);
