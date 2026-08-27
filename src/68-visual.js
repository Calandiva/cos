/* =====================================================================
   포뮬라랩 — 육안 분석
   ---------------------------------------------------------------------
   실험실에서 시제품을 처음 받으면 하는 일을 그대로 옮겼다.
     기울여 본다      점도와 항복응력이 흐름으로 드러난다
     글자 위에 댄다   탁도를 눈으로 잰다
     빛에 비춘다      색과 투명도
     며칠 두고 본다   크리밍 · 변색 · 액적 성장
   액체 표면은 화면 기준으로 수평이 되려 하지만, 되직할수록 천천히 눕고
   항복응력이 크면 아예 눕지 않는다. 그래서 기울이면 점도가 보인다.
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, el = K.el, $ = K.$, clear = K.clear;
var CHEM = G.CHEM, PROD = G.PROD, ING = G.ING;

var NS = 'http://www.w3.org/2000/svg';
function sv(t, a) {
  var n = document.createElementNS(NS, t);
  for (var k in (a || {})) n.setAttribute(k, a[k]);
  return n;
}
function cl(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ── 다각형 반평면 자르기 (부피 보존용) ────────────────────────── */
function clipHalf(poly, gx, gy, d) {
  var out = [];
  for (var i = 0; i < poly.length; i++) {
    var A = poly[i], B = poly[(i + 1) % poly.length];
    var da = A[0] * gx + A[1] * gy - d, db = B[0] * gx + B[1] * gy - d;
    if (da >= 0) out.push(A);
    if ((da >= 0) !== (db >= 0)) {
      var t = da / (da - db);
      out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    }
  }
  return out;
}
function areaOf(p) {
  var s = 0;
  for (var i = 0; i < p.length; i++) {
    var a = p[i], b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
}
/* 넓이가 target 이 되도록 반평면 위치를 찾는다 */
function levelPoly(rect, gx, gy, target) {
  var lo = -1e4, hi = 1e4, mid, p;
  for (var i = 0; i < 26; i++) {
    mid = (lo + hi) / 2;
    p = clipHalf(rect, gx, gy, mid);
    if (areaOf(p) > target) lo = mid; else hi = mid;
  }
  return clipHalf(rect, gx, gy, lo);
}
function toPath(p) {
  if (!p.length) return '';
  return 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z';
}

/* ── 색 이름 ───────────────────────────────────────────────────── */
function colorName(L, a, b, ntu) {
  var c = Math.sqrt(a * a + b * b);
  var opaque = (ntu || 0) > 60;
  var tone = L > 92 ? '' : L > 78 ? '' : L > 55 ? '어두운 ' : '짙은 ';
  if (c < 3.5) return L > 92 ? (opaque ? '백색' : '무색 투명') : L > 70 ? '회백색' : '회색';
  if (b > 8 && Math.abs(a) < b * 0.7) return tone + (b > 34 ? '진한 황색' : b > 18 ? '황색' : '미황색');
  if (a > 12 && b > 8) return tone + (a > 35 ? '적갈색' : '살구색');
  if (a > 12) return tone + (a > 35 ? '적색' : '분홍색');
  if (a < -8) return tone + '녹색';
  if (b < -8) return tone + '청색';
  return tone + '미황색';
}

/* ── 상태 ──────────────────────────────────────────────────────── */
var S = {
  tilt: 0, phi: 0, bg: 'text', days: 0, hot: false,
  raf: 0, sensor: false, res: null, aged: null, prod: null,
  stick: 0, fill: 0.72, shakeT: 0
};

var R = {};      /* SVG 참조 */

/* ── 뷰 만들기 ─────────────────────────────────────────────────── */
function buildVial() {
  var s = sv('svg', { viewBox: '0 0 210 310', class: 'vial' });
  s.setAttribute('style', 'width:100%;max-width:260px;height:auto;overflow:visible');

  var defs = sv('defs');
  var cp = sv('clipPath', { id: 'vialclip' });
  cp.appendChild(sv('path', {
    d: 'M69 52 h72 v186 a20 20 0 0 1 -20 20 h-32 a20 20 0 0 1 -20 -20 z' }));
  defs.appendChild(cp);
  var gr = sv('linearGradient', { id: 'vialglass', x1: '0', y1: '0', x2: '1', y2: '0' });
  [['0', '#000', '.16'], ['.22', '#fff', '.34'], ['.55', '#fff', '.05'], ['1', '#000', '.18']]
    .forEach(function (x) {
      gr.appendChild(sv('stop', { offset: x[0], 'stop-color': x[1], 'stop-opacity': x[2] }));
    });
  defs.appendChild(gr);
  s.appendChild(defs);

  /* 배경 */
  R.bg = sv('g');
  s.appendChild(R.bg);

  /* 병 전체 (회전) */
  R.rot = sv('g');
  s.appendChild(R.rot);

  var body = 'M69 52 h72 v186 a20 20 0 0 1 -20 20 h-32 a20 20 0 0 1 -20 -20 z';
  R.rot.appendChild(sv('path', { d: body, fill: 'rgba(255,255,255,.05)' }));

  var inner = sv('g', { 'clip-path': 'url(#vialclip)' });
  R.film = sv('path', { d: body, fill: '#ddd', opacity: '0' });
  R.liq = sv('path', { d: '', fill: '#ddd', opacity: '.5' });
  R.sep = sv('path', { d: '', fill: '#fff', opacity: '0' });
  R.bubs = sv('g', { opacity: '0' });
  [80, 96, 112, 128].forEach(function (x, i) {
    var c = sv('circle', { cx: String(x), cy: '120', r: String(1.6 + (i % 3) * 0.9),
      fill: 'rgba(255,255,255,.75)' });
    inner.appendChild(c);
  });
  inner.insertBefore(R.film, inner.firstChild);
  inner.insertBefore(R.liq, inner.firstChild);
  inner.appendChild(R.sep);
  R.rot.appendChild(inner);
  R.bubsHost = inner;

  /* 실 늘어짐 */
  R.string = sv('path', { d: '', fill: 'none', stroke: '#ccc', 'stroke-width': '2.4',
    'stroke-linecap': 'round', opacity: '0' });
  R.rot.appendChild(R.string);

  /* 유리 반사 · 테두리 · 뚜껑 */
  R.rot.appendChild(sv('path', { d: body, fill: 'url(#vialglass)' }));
  R.rot.appendChild(sv('path', { d: body, fill: 'none',
    stroke: 'rgba(255,255,255,.5)', 'stroke-width': '2' }));
  R.rot.appendChild(sv('rect', { x: '78', y: '28', width: '54', height: '26', rx: '7',
    fill: 'rgba(255,255,255,.13)', stroke: 'rgba(255,255,255,.45)', 'stroke-width': '1.8' }));
  R.rot.appendChild(sv('rect', { x: '86', y: '18', width: '38', height: '12', rx: '4',
    fill: 'rgba(255,255,255,.2)' }));

  return s;
}

var RECT = [[71, 54], [139, 54], [139, 256], [71, 256]];
var CX = 105, CY = 155;

function drawBg() {
  clear(R.bg);
  if (S.bg === 'text') {
    R.bg.appendChild(sv('rect', { x: '0', y: '0', width: '210', height: '310', fill: '#FFFFFF' }));
    ['가나다라마', '포뮬라랩 육안', '0123456789', '탁도 판정용', 'ABCDEFGH'].forEach(function (t, i) {
      var n = sv('text', { x: '105', y: String(76 + i * 42), 'text-anchor': 'middle',
        'font-size': '19', 'font-weight': '700', fill: '#1B2733', 'font-family': 'inherit' });
      n.textContent = t;
      R.bg.appendChild(n);
    });
  } else if (S.bg === 'dark') {
    R.bg.appendChild(sv('rect', { x: '0', y: '0', width: '210', height: '310', fill: '#0B1016' }));
  } else {
    R.bg.appendChild(sv('rect', { x: '0', y: '0', width: '210', height: '310', fill: '#F4F6F8' }));
  }
}

/* ── 한 프레임 그리기 ──────────────────────────────────────────── */
function paint() {
  var res = S.res, aged = S.aged;
  if (!res) return;
  var hex = aged.color.hex;
  var ntu = res.ntu;
  var alpha = 0.10 + 0.90 * Math.min(1, Math.pow(Math.max(ntu, 0.4) / 600, 0.5));

  R.rot.setAttribute('transform', 'rotate(' + S.tilt.toFixed(1) + ' ' + CX + ' ' + CY + ')');

  var g = S.phi * Math.PI / 180;
  var gx = Math.sin(g), gy = Math.cos(g);
  var target = areaOf(RECT) * S.fill;
  var poly = levelPoly(RECT, gx, gy, target);

  R.liq.setAttribute('d', toPath(poly));
  R.liq.setAttribute('fill', hex);
  R.liq.setAttribute('opacity', alpha.toFixed(3));

  /* 벽에 남은 막 */
  var filmOp = S.stick > 0.25 && Math.abs(S.tilt) > 12
    ? Math.min(0.4, (S.stick - 0.2) * 0.55) * alpha : 0;
  R.film.setAttribute('fill', hex);
  R.film.setAttribute('opacity', filmOp.toFixed(3));

  /* 크리밍 층 — 액면 쪽에 얇게 */
  if (aged.sepMm > 0.6) {
    var t = Math.min(28, aged.sepMm * 1.1);
    var d2 = poly.length ? (function () {
      var lo = -1e4, hi = 1e4, mid, p;
      var tgt = Math.max(areaOf(poly) - target * (1 - t / 200), 1);
      for (var i = 0; i < 20; i++) {
        mid = (lo + hi) / 2;
        p = clipHalf(poly, -gx, -gy, mid);
        if (areaOf(p) > t * 3) lo = mid; else hi = mid;
      }
      return clipHalf(poly, -gx, -gy, lo);
    })() : [];
    R.sep.setAttribute('d', toPath(d2));
    R.sep.setAttribute('fill', '#FFFFFF');
    R.sep.setAttribute('opacity', Math.min(0.5, 0.12 + aged.sepMm / 60).toFixed(3));
  } else R.sep.setAttribute('opacity', '0');

  /* 기포 */
  R.bubsHost.style.opacity = '1';

  /* 실 늘어짐 */
  var stringy = S.stringy;
  if (stringy > 0.25 && Math.abs(S.tilt) > 60) {
    var tipX = 105 + (S.tilt > 0 ? 30 : -30);
    R.string.setAttribute('d', 'M105 250 Q ' + tipX + ' 275 ' + (tipX + (S.tilt > 0 ? 10 : -10)) + ' 300');
    R.string.setAttribute('stroke', hex);
    R.string.setAttribute('opacity', Math.min(0.85, stringy).toFixed(2));
    R.string.setAttribute('stroke-width', (1.4 + stringy * 2.4).toFixed(1));
  } else R.string.setAttribute('opacity', '0');
}

/* ── 흐름 애니메이션 ───────────────────────────────────────────── */
function tick() {
  var eq = S.tilt * (1 - S.stick);
  var tau = 0.055 + S.stick * 0.9;                /* 되직할수록 천천히 눕는다 */
  S.phi += (eq - S.phi) * (1 - Math.exp(-1 / (tau * 33)));
  if (S.shakeT > 0) {
    S.shakeT -= 1;
    S.phi += Math.sin(S.shakeT * 0.9) * 14 * (S.shakeT / 30);
  }
  paint();
  if (Math.abs(eq - S.phi) < 0.05 && S.shakeT <= 0) {
    S.phi = eq; paint();
    clearInterval(S.raf); S.raf = 0;
  }
}
function nudge() {
  if (S.raf) return;
  S.raf = setInterval(tick, 30);
  setTimeout(function () {          /* 타이머가 죽은 환경에서도 결과는 맞게 */
    if (S.raf) return;
    S.phi = S.tilt * (1 - S.stick); paint();
  }, 4000);
}

/* ── 소견 ──────────────────────────────────────────────────────── */
function flowText() {
  var e = S.res.eta, y = S.res.visc.yieldStress;
  if (y > 25) return ['거꾸로 들어도 흘러내리지 않는다', '항복응력 ' + y.toFixed(0) + ' Pa — 떠먹는 제형'];
  if (y > 8)  return ['기울여도 한참 버티다 천천히 무너진다', '항복응력 ' + y.toFixed(1) + ' Pa'];
  if (e > 60000) return ['거의 움직이지 않는다', '숟가락으로 떠야 하는 되기'];
  if (e > 20000) return ['기울이면 아주 천천히 기운다', '통을 흔들어야 나온다'];
  if (e > 6000)  return ['천천히 기울어 눕는다', '펌프로 밀어낼 수 있는 되기'];
  if (e > 1200)  return ['부드럽게 흘러내린다', '튜브·펌프 모두 가능'];
  if (e > 60)    return ['주르륵 흐른다', '점적 용기에 맞다'];
  return ['물처럼 즉시 쏟아진다', '분무·토너 용기'];
}

function clarityText(ntu) {
  if (ntu < 5)   return ['뒤 글자가 또렷하게 읽힌다', '투명'];
  if (ntu < 40)  return ['글자가 읽히지만 살짝 뿌옇다', '미탁'];
  if (ntu < 300) return ['글자 윤곽만 겨우 보인다', '반투명'];
  if (ntu < 2000)return ['글자가 전혀 보이지 않는다', '유백'];
  return ['빛이 거의 통과하지 않는다', '불투명'];
}

function renderNotes() {
  var box = clear($('#visNotes'));
  var res = S.res, aged = S.aged, p = S.prod;
  var c = aged.color;

  function row(k, v, sub, sw) {
    box.appendChild(el('div.vrow', null, [
      el('div.vk', { text: k }),
      el('div.vv', null, [
        sw ? el('span.vsw', { style: 'background:' + sw }) : null,
        el('b', { text: v }),
        sub ? el('small', { text: sub }) : null
      ])
    ]));
  }

  row('색상', colorName(c.L, c.a, c.b, res.ntu), c.hex + '  ·  L ' + c.L.toFixed(0) +
      ' a ' + c.a.toFixed(1) + ' b ' + c.b.toFixed(1), c.hex);

  var cy = clarityText(res.ntu);
  row('투명도', cy[1], cy[0] + '  ·  ' + K.eng(res.ntu) + ' NTU');

  var fl = flowText();
  row('흐름', fl[0], fl[1] + '  ·  ' + K.eng(res.eta) + ' cP');

  if (res.d32 && res.drop && !res.drop.minor)
    row('입자', aged.d32.toFixed(2) + ' µm',
        S.days ? '처음 ' + res.d32.toFixed(2) + ' µm 에서 자랐다' : '유화 액적 평균');

  if (res.foam > 1) row('거품', Math.round(res.foam) + ' / 100', '물에 풀었을 때의 기포력');
  if (res.hard > 0) row('경도', res.hard.toFixed(1), '무수 제형의 단단한 정도');
  if (res.uv) row('차단력', 'SPF ' + Math.round(res.uv.spf) + '  ' + res.uv.pa,
                  'UVA-PF ' + res.uv.pfa.toFixed(1));

  if (res.agg && res.agg.dn > 0.001 && res.d32)
    row('굴절률 차', res.agg.dn.toFixed(3),
        res.agg.dn < 0.06 ? '작아서 덜 뿌옇다 (실리콘계)' : '커서 하얗게 보인다');

  /* 보관 소견 */
  box.appendChild(el('div.vsec', { text: S.days
    ? (S.hot ? '45℃ 가속 4주 (상온 약 1년)' : S.days + '일 보관 후') : '제조 직후' }));
  if (!aged.notes.length) {
    box.appendChild(el('div.vnote.ok', { text: S.days
      ? '눈에 띄는 변화가 없다. 색 · 층 · 입자 모두 처음과 같다.'
      : '갓 만든 상태다. 보관 기간을 바꿔 시간이 지난 뒤를 볼 수 있다.' }));
  }
  aged.notes.forEach(function (n) {
    box.appendChild(el('div.vnote.l' + n.lv, null, [
      el('b', { text: n.ko }), n.msg
    ]));
  });

  /* 규격 대비 */
  var j = PROD.judge(p.key, res);
  var fails = j.items.filter(function (x) { return !x.ok; }).map(function (x) { return x.ko; })
    .concat((j.req || []).filter(function (x) { return !x.ok; }).map(function (x) { return x.ko; }));
  box.appendChild(el('div.vnote.' + (j.ok ? 'ok' : 'l3'), null, [
    el('b', { text: j.ok ? p.ko + ' 규격 통과' : p.ko + ' 규격 미달' }),
    j.ok ? '점도 · pH · 탁도와 필수 요건을 모두 만족한다.'
         : '미달 항목 — ' + fails.join(' · ')
  ]));
}

/* ── 열기 ──────────────────────────────────────────────────────── */
function open(res, prod) {
  S.res = res;
  S.prod = prod || PROD.get(K.S.prod);
  S.tilt = 0; S.phi = 0; S.days = 0; S.hot = false; S.shakeT = 0;

  var y = res.visc.yieldStress;
  S.stick = cl(Math.log(Math.max(res.eta, 1)) / Math.LN10 / 5.2, 0, 0.96);
  if (y > 8) S.stick = Math.max(S.stick, 0.93);
  if (y > 25) S.stick = Math.max(S.stick, 0.985);
  S.fill = cl((K.S.result ? K.S.result.yieldPct : 74) / 100 * 0.78, 0.3, 0.8);

  var st = 0;
  (res.agg.thickers || []).forEach(function (t) {
    if (['xanthan', 'ha', 'sclero', 'carrag', 'pq10', 'guar', 'gellan'].indexOf(t.g.id) >= 0)
      st += t.c * 2.6;
  });
  S.stringy = Math.min(1, st);

  S.aged = CHEM.age(res, 0, false);

  var box = $('#vis');
  box.hidden = false;
  var stage = clear($('#visStage'));
  stage.appendChild(buildVial());
  drawBg();
  paint();
  renderNotes();
  buildControls();
}

function reAge() {
  S.aged = CHEM.age(S.res, S.days, S.hot);
  paint(); renderNotes();
}

function close() {
  $('#vis').hidden = true;
  if (S.raf) clearInterval(S.raf);
  S.raf = 0;
  if (S.sensor) { window.removeEventListener('deviceorientation', onOri); S.sensor = false; }
}

function setTilt(v) {
  S.tilt = cl(v, -180, 180);
  var lab = $('#visTiltV'); if (lab) lab.textContent = Math.round(S.tilt) + '°';
  var sl = $('#visSlider'); if (sl && +sl.value !== Math.round(S.tilt)) sl.value = Math.round(S.tilt);
  paint();          /* 병은 곧바로 돈다 */
  nudge();          /* 안에 든 것만 천천히 따라 눕는다 */
}

function onOri(e) {
  var g = e.gamma;
  if (g == null) return;
  setTilt(cl(g * 2, -180, 180));
}

function enableSensor(btn) {
  function attach() {
    window.addEventListener('deviceorientation', onOri);
    S.sensor = true;
    btn.setAttribute('aria-pressed', true);
    btn.textContent = '센서 켜짐';
    K.toast('휴대폰을 좌우로 기울여 보세요');
  }
  if (S.sensor) {
    window.removeEventListener('deviceorientation', onOri);
    S.sensor = false;
    btn.setAttribute('aria-pressed', false);
    btn.textContent = '기울기 센서';
    return;
  }
  var D = window.DeviceOrientationEvent;
  if (!D) { K.toast('이 기기에서는 기울기 센서를 쓸 수 없습니다'); return; }
  if (typeof D.requestPermission === 'function') {
    D.requestPermission().then(function (r) {
      if (r === 'granted') attach(); else K.toast('센서 사용이 거부되었습니다');
    }).catch(function () { K.toast('센서를 켤 수 없습니다'); });
  } else attach();
}

/* ── 조작부 ────────────────────────────────────────────────────── */
function buildControls() {
  var c = clear($('#visCtl'));

  /* 기울기 */
  var row1 = el('div.vctl');
  row1.appendChild(el('span.vlab', { text: '기울기' }));
  [[0, '세움'], [45, '45°'], [90, '눕힘'], [135, '135°'], [180, '뒤집기']].forEach(function (t) {
    row1.appendChild(el('button.chip', { text: t[1], onclick: function () { setTilt(t[0]); } }));
  });
  row1.appendChild(el('button.chip', { text: '흔들기', onclick: function () {
    S.shakeT = 30; S.days = 0; S.hot = false; syncDays(); reAge(); nudge();
  } }));
  row1.appendChild(el('button.chip', { text: '기울기 센서', 'aria-pressed': false,
    onclick: function (e) { enableSensor(e.currentTarget); } }));
  c.appendChild(row1);

  var slRow = el('div.vctl');
  var sl = el('input', { id: 'visSlider', type: 'range', min: '-180', max: '180', value: '0',
    style: 'flex:1', oninput: function () { setTilt(+sl.value); } });
  slRow.appendChild(sl);
  slRow.appendChild(el('b', { id: 'visTiltV', class: 'num', style: 'width:48px;text-align:right', text: '0°' }));
  c.appendChild(slRow);

  /* 배경 */
  var row2 = el('div.vctl');
  row2.appendChild(el('span.vlab', { text: '배경' }));
  [['text', '글자 (탁도 판정)'], ['light', '밝게'], ['dark', '어둡게']].forEach(function (t) {
    row2.appendChild(el('button.chip', { text: t[1], 'aria-pressed': S.bg === t[0],
      onclick: function () { S.bg = t[0]; drawBg(); buildControls(); } }));
  });
  c.appendChild(row2);

  /* 보관 */
  var row3 = el('div.vctl');
  row3.appendChild(el('span.vlab', { text: '보관' }));
  [[0, false, '제조 직후'], [7, false, '1주'], [30, false, '1개월'], [90, false, '3개월'],
   [28, true, '45℃ 4주']].forEach(function (t) {
    row3.appendChild(el('button.chip', { text: t[2],
      'aria-pressed': S.days === t[0] && S.hot === t[1],
      onclick: function () { S.days = t[0]; S.hot = t[1]; buildControls(); reAge(); } }));
  });
  c.appendChild(row3);
}
function syncDays() { }

G.VIS = { open: open, close: close, setTilt: setTilt, colorName: colorName };
})(window);
