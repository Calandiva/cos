/* =====================================================================
   포뮬라랩 — 제조 연출
   ---------------------------------------------------------------------
   공정 스텝을 하나씩 지나가며 탱크 안에서 실제로 벌어지는 일을 보여준다.
   색과 탁도는 흉내가 아니라, 그 시점까지 투입된 원료로 다시 계산한 값이다.
   물만 있을 때는 맑고, 유상이 들어가 호모가 돌면 그 자리에서 하얘진다.
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, el = K.el, $ = K.$, clear = K.clear;
var CHEM = G.CHEM, PROC = G.PROC, PROD = G.PROD, ING = G.ING;

var SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attr) {
  var n = document.createElementNS(SVGNS, tag);
  for (var k in (attr || {})) n.setAttribute(k, attr[k]);
  return n;
}

/* ── 스텝별 스냅샷 ─────────────────────────────────────────────── */
function buildFrames(run) {
  var byId = {};
  run.items.forEach(function (i) { byId[i.id] = i; });

  var present = {}, out = [];
  var totalMass = run.weighSum || 1;
  var totalMin = run.trace.reduce(function (a, b) { return a + b.min; }, 0) || 1;
  /* 한 번 잘게 쪼개진 액적은 교반을 늦춘다고 다시 커지지 않는다.
     그래서 지금까지 겪은 최대 전단을 계속 들고 간다. */
  var maxTip = 0.7;

  run.trace.forEach(function (t) {
    var added = [];
    (t.add || []).forEach(function (id) {
      if (byId[id] && !present[id]) { present[id] = true; added.push(ING.BY[id].ko); }
    });
    var ids = Object.keys(present);
    var mass = 0;
    ids.forEach(function (id) { mass += byId[id].actual; });

    var hex = '#E3EAF1', ntu = 0.4, eta = 1;
    if (ids.length) {
      var rows = ids.map(function (id) { return { id: id, pct: byId[id].actual }; });
      if (t.homo > 0) maxTip = Math.max(maxTip, PROC.tipSpeed(run.rig.dHomo, t.homo));
      try {
        var r = CHEM.evaluate(rows, { tip: maxTip, sec: 240 });
        hex = r.color.hex; ntu = r.ntu; eta = r.eta;
      } catch (e) {}
    }
    out.push({
      ko: t.ko, kind: t.t, temp: t.temp, aji: t.aji, homo: t.homo, vac: t.vac,
      min: t.min, added: added,
      level: Math.min(1, mass / totalMass),
      hex: hex, ntu: ntu, eta: eta,
      ms: Math.min(800, 170 + t.min / totalMin * 2200)
    });
  });
  return out;
}

/* ── 탱크 ──────────────────────────────────────────────────────── */
var TOP = 52, BOT = 194;

function buildTank() {
  var s = sv('svg', { viewBox: '0 0 260 250', width: '260', height: '250', class: 'tank' });
  s.setAttribute('style', 'max-width:100%;height:auto');

  var defs = sv('defs');
  var cp = sv('clipPath', { id: 'tankclip' });
  cp.appendChild(sv('path', { d: 'M64 48 h132 v120 a26 26 0 0 1 -26 26 h-80 a26 26 0 0 1 -26 -26 z' }));
  defs.appendChild(cp);
  s.appendChild(defs);

  /* 자켓 */
  var jacket = sv('path', {
    class: 'jacket',
    d: 'M56 62 h-14 v112 h14 M204 62 h14 v112 h-14'
  });
  s.appendChild(jacket);

  /* 증기 */
  var steam = sv('g', { opacity: '0' });
  [96, 130, 164].forEach(function (x, i) {
    var p = sv('path', { class: 'steam', d: 'M' + x + ' 34 c 6 -8 -6 -14 0 -22' });
    p.setAttribute('style', 'animation-delay:' + (i * 0.5) + 's');
    steam.appendChild(p);
  });
  s.appendChild(steam);

  /* 액체 */
  var g = sv('g', { 'clip-path': 'url(#tankclip)' });
  var liq = sv('rect', { class: 'liq', x: '64', y: String(BOT), width: '132', height: '0', fill: '#dfe7ee', opacity: '0.2' });
  var surf = sv('ellipse', { class: 'surf', cx: '130', cy: String(BOT), rx: '66', ry: '4', fill: '#ffffff', opacity: '0.25' });
  g.appendChild(liq); g.appendChild(surf);

  var bubs = sv('g', { opacity: '0' });
  [82, 104, 126, 150, 174].forEach(function (x, i) {
    var c = sv('circle', { class: 'bub', cx: String(x), cy: '176', r: String(2 + (i % 3)) });
    c.setAttribute('style', 'animation-delay:' + (i * 0.28) + 's');
    bubs.appendChild(c);
  });
  g.appendChild(bubs);
  s.appendChild(g);

  /* 벽 · 뚜껑 */
  s.appendChild(sv('path', { class: 'wall',
    d: 'M64 48 h132 v120 a26 26 0 0 1 -26 26 h-80 a26 26 0 0 1 -26 -26 z' }));
  s.appendChild(sv('rect', { class: 'wall', x: '58', y: '38', width: '144', height: '12', rx: '5' }));

  /* 교반축 · 임펠러 */
  s.appendChild(sv('line', { class: 'shaft', x1: '130', y1: '18', x2: '130', y2: '172' }));
  var blade = sv('g', { class: 'blade' });
  blade.appendChild(sv('rect', { x: '98', y: '166', width: '64', height: '7', rx: '3' }));
  blade.appendChild(sv('rect', { x: '112', y: '152', width: '36', height: '6', rx: '3' }));
  s.appendChild(blade);

  /* 호모 헤드 */
  var homo = sv('g', { opacity: '0' });
  homo.appendChild(sv('circle', { class: 'homoring', cx: '130', cy: '140', r: '15' }));
  homo.appendChild(sv('circle', { class: 'homoring', cx: '130', cy: '140', r: '8' }));
  s.appendChild(homo);

  /* 진공 표시 */
  var vac = sv('g', { opacity: '0' });
  vac.appendChild(sv('rect', { class: 'vac', x: '206', y: '26', width: '44', height: '20', rx: '9' }));
  var vt = sv('text', { x: '228', y: '40', 'text-anchor': 'middle',
    'font-size': '11', 'font-weight': '700', fill: '#8FB6EE' });
  vt.textContent = '진공';
  vac.appendChild(vt);
  s.appendChild(vac);

  return { node: s, liq: liq, surf: surf, jacket: jacket, blade: blade,
           homo: homo, bubs: bubs, steam: steam, vac: vac };
}

function paint(T, f) {
  var y = BOT - f.level * (BOT - TOP);
  T.liq.setAttribute('y', String(y));
  T.liq.setAttribute('height', String(Math.max(BOT + 6 - y, 0)));
  T.liq.setAttribute('fill', f.hex);
  var alpha = 0.16 + 0.84 * Math.min(1, Math.pow(Math.max(f.ntu, 0.5) / 700, 0.55));
  T.liq.setAttribute('opacity', alpha.toFixed(3));
  T.surf.setAttribute('cy', String(y));
  T.surf.setAttribute('fill', f.hex);
  T.surf.setAttribute('opacity', (Math.min(0.95, alpha + 0.18)).toFixed(3));
  T.surf.setAttribute('ry', String(f.aji > 200 ? 8 : f.aji > 0 ? 5 : 3.5));

  T.jacket.setAttribute('class', 'jacket' + (f.temp >= 55 ? ' hot' : f.temp <= 32 ? ' cold' : ''));

  var spin = f.aji > 0;
  T.blade.setAttribute('class', 'blade' + (spin ? ' spin' : ''));
  if (spin) T.blade.style.animationDuration = Math.max(0.14, 1.6 - f.aji / 260) + 's';

  T.homo.setAttribute('opacity', f.homo > 0 ? '1' : '0');
  T.bubs.setAttribute('opacity', (f.homo > 0 && !f.vac) ? '1' : '0');
  T.steam.setAttribute('opacity', (f.temp >= 68 && !f.vac) ? '1' : '0');
  T.vac.setAttribute('opacity', f.vac ? '1' : '0');
}

/* ── 계기판 ────────────────────────────────────────────────────── */
function readout(kk, vv, uu, cls) {
  return el('div.read' + (cls ? '.' + cls : ''), null, [
    el('div.rk', { text: kk }),
    el('div.rv', null, [String(vv), uu ? el('em', { text: uu }) : null])
  ]);
}

/* ── 숫자 카운트업 ─────────────────────────────────────────────── */
function countUp(node, to, fmt, ms) {
  node.textContent = fmt(to);            /* 먼저 정답을 넣는다 */
  if (!window.requestAnimationFrame) return;
  var t0 = 0;
  function tick(ts) {
    if (!t0) t0 = ts;
    var p = Math.min(1, (ts - t0) / (ms || 700));
    var e = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt(to * e);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── 실행 ──────────────────────────────────────────────────────── */
var busy = false;

function show(run, onDone) {
  if (busy) return false;
  busy = true;
  var fr = buildFrames(run);
  var box = $('#brew');
  box.hidden = false;

  var stage = clear($('#brewStage'));
  var foot = clear($('#brewFoot'));
  var T = buildTank();
  stage.appendChild(T.node);

  var reads = el('div.brewreads');
  var flow = el('div.addflow');
  foot.appendChild(reads);
  foot.appendChild(flow);

  var i = -1, timer = null, elapsed = 0, ended = false;

  function step() {
    i++;
    if (i >= fr.length) { finale(); return; }
    var f = fr[i];
    elapsed += f.min;
    paint(T, f);
    $('#brewTtl').textContent = (i + 1) + '. ' + f.ko;
    $('#brewFill').style.width = ((i + 1) / fr.length * 100).toFixed(1) + '%';

    clear(reads);
    reads.appendChild(readout('온도', Math.round(f.temp), '℃',
      f.temp >= 55 ? 'hot' : f.temp <= 32 ? 'cold' : ''));
    reads.appendChild(readout('아지', f.aji ? K.n0(f.aji) : '—', f.aji ? 'rpm' : ''));
    if (f.homo > 0) reads.appendChild(readout('호모', K.n0(f.homo), 'rpm'));
    reads.appendChild(readout('누적', Math.round(elapsed), '분'));

    clear(flow);
    f.added.slice(0, 6).forEach(function (ko) { flow.appendChild(el('span', { text: '↓ ' + ko })); });
    if (f.added.length > 6) flow.appendChild(el('span', { text: '외 ' + (f.added.length - 6) + '종' }));

    timer = setTimeout(step, f.ms);
  }

  function finale() {
    if (ended) return;
    ended = true;
    clearTimeout(timer);

    var r = run.res, p = PROD.get(K.S.prod), judge = PROD.judge(K.S.prod, r);
    var st = r.stability;
    var okAll = judge.ok && st.score >= 62;

    $('#brewTtl').textContent = '완성';
    $('#brewFill').style.width = '100%';
    $('#brewSkip').textContent = '닫기';

    var stage2 = clear($('#brewStage'));
    var wrap = el('div.reveal');

    /* 완성품 */
    var alpha = 0.16 + 0.84 * Math.min(1, Math.pow(Math.max(r.ntu, 0.5) / 700, 0.55));
    var lvl = 92 - Math.max(22, Math.min(74, run.yieldPct * 0.72));
    var dome = Math.min(8, 1.4 + Math.log(Math.max(r.eta, 1)) / Math.LN10 * 1.4);
    var jd = document.createElement('div');
    jd.innerHTML =
      '<svg width="118" height="140" viewBox="0 0 82 98">' +
      '<defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".28" stop-color="#fff" stop-opacity=".36"/>' +
      '<stop offset=".62" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".22"/>' +
      '</linearGradient><clipPath id="bc1">' +
      '<path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z"/></clipPath></defs>' +
      '<path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z" fill="rgba(255,255,255,.08)"/>' +
      '<g clip-path="url(#bc1)">' +
      '<rect x="13" y="' + lvl + '" width="56" height="98" fill="' + r.color.hex + '" opacity="' + alpha.toFixed(3) + '"/>' +
      '<ellipse cx="41" cy="' + lvl + '" rx="28" ry="' + dome.toFixed(1) + '" fill="' + r.color.hex + '" opacity="' + (alpha * 0.85).toFixed(3) + '"/>' +
      '<ellipse cx="41" cy="' + lvl + '" rx="28" ry="' + dome.toFixed(1) + '" fill="#fff" opacity=".22"/>' +
      '<rect x="13" y="0" width="56" height="98" fill="url(#bg1)"/></g>' +
      '<path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z" fill="none" stroke="rgba(255,255,255,.42)" stroke-width="1.6"/>' +
      '<rect x="10" y="3" width="62" height="7" rx="3" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.36)" stroke-width="1.3"/>' +
      '</svg>';
    wrap.appendChild(jd.firstChild);

    wrap.appendChild(el('div.rv-verdict', {
      style: 'color:' + (okAll ? '#63D398' : judge.ok ? '#E7B45C' : '#F58A8E'),
      text: judge.ok ? (st.score >= 85 ? '규격 통과' : st.score >= 62 ? '규격은 통과, 불안 요소 있음' : '규격은 맞지만 불안정')
                     : '규격 미달' }));
    wrap.appendChild(el('div.rv-sub', {
      text: p.icon + ' ' + p.ko + ' · ' + K.mass(run.yieldG) + ' 생산 · ' +
            Math.round(run.minutes) + '분 · ' + r.turb.grade }));

    var mets = el('div.rv-mets');
    function tile(kk, target, unit, fmt, cls) {
      var v = el('div.v', null, [el('span', { text: '0' }), unit ? el('em', { text: unit }) : null]);
      mets.appendChild(el('div.rv-met' + (cls ? '.' + cls : ''), null, [el('div.k', { text: kk }), v]));
      countUp(v.firstChild, target, fmt, 750);
    }
    var sv2 = p.spec.visc, sp2 = p.spec.ph, sn2 = p.spec.ntu;
    tile('점도', r.eta, 'cP', function (x) { return K.eng(x); },
      sv2 ? (r.eta >= sv2[0] && r.eta <= sv2[1] ? 'ok' : 'bad') : '');
    tile('pH', r.pH, '', function (x) { return x.toFixed(2); },
      sp2 ? (r.pH >= sp2[0] && r.pH <= sp2[1] ? 'ok' : 'bad') : '');
    tile('탁도', r.ntu, 'NTU', function (x) { return K.eng(x); },
      sn2 ? (r.ntu >= sn2[0] && r.ntu <= sn2[1] ? 'ok' : 'bad') : '');
    tile('안정도', st.score, '점', function (x) { return String(Math.round(x)); },
      st.score >= 85 ? 'ok' : st.score < 62 ? 'bad' : '');
    wrap.appendChild(mets);

    /* 가장 큰 문제 하나만 */
    var probs = st.items.concat(run.warn).sort(function (a, b) { return b.sev - a.sev; });
    if (probs.length) {
      wrap.appendChild(el('div', {
        style: 'background:rgba(238,113,118,.14);border:1px solid rgba(238,113,118,.4);' +
               'border-radius:11px;padding:10px 13px;font-size:13px;color:#F0DDDE;line-height:1.6;width:100%',
        html: '<b style="display:block;color:#FF9BA0;font-size:13px">가장 큰 문제 — ' +
              K.esc(probs[0].ko) + ' (−' + probs[0].sev + ')</b>' + K.esc(probs[0].msg) +
              (probs.length > 1 ? '<span style="color:#A8B6C4"> · 외 ' + (probs.length - 1) + '건</span>' : '')
      }));
    }

    /* 과제 */
    if (K.S.mission && G.MISS) {
      var mg = G.MISS.grade(K.S.mission, run, K.S);
      wrap.appendChild(el('div', {
        style: 'background:' + (mg.ok ? 'rgba(84,196,134,.15)' : 'rgba(255,255,255,.08)') +
               ';border:1px solid ' + (mg.ok ? 'rgba(84,196,134,.45)' : 'rgba(255,255,255,.18)') +
               ';border-radius:11px;padding:10px 13px;font-size:13px;width:100%;text-align:center;color:#E3EAF1',
        html: '<b style="font-size:14px;color:' + (mg.ok ? '#63D398' : '#E3EAF1') + '">' +
              (mg.ok ? '과제 통과 · ' + mg.grade + ' 등급 ' + mg.score + '점' : '과제 미달') +
              '</b><br><span style="color:#A8B6C4">' + K.esc(K.S.mission.ko) + ' — 필수 ' +
              mg.must.filter(function (x) { return x.ok; }).length + '/' + mg.must.length + '</span>'
      }));
    }

    wrap.appendChild(el('button.btn.pri.wide', {
      style: 'margin-top:2px', text: '자세히 보기', onclick: close
    }));
    stage2.appendChild(wrap);
  }

  function close() {
    clearTimeout(timer);
    box.hidden = true;
    busy = false;
    $('#brewSkip').textContent = '건너뛰기';
    if (onDone) onDone();
  }

  function skip() {
    if (ended) { close(); return; }
    clearTimeout(timer);
    paint(T, fr[fr.length - 1]);
    finale();
  }

  $('#brewSkip').onclick = skip;
  box.onclick = function (e) { if (e.target === box) skip(); };

  step();
  return true;
}

function enabled() {
  try { return localStorage.getItem('formulab.brew') !== '0'; } catch (e) { return true; }
}
function setEnabled(v) {
  try { localStorage.setItem('formulab.brew', v ? '1' : '0'); } catch (e) {}
}

G.BREW = { show: show, enabled: enabled, setEnabled: setEnabled };
})(window);
