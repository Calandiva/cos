/* =====================================================================
   포뮬라랩 — 화면
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, S = K.S, el = K.el, $ = K.$, clear = K.clear;
var ING = G.ING, PROD = G.PROD, PROC = G.PROC, CHEM = G.CHEM, SIM = G.SIM, MISS = G.MISS;

/* ══ 원료 패널 ═══════════════════════════════════════════════════ */
function renderCats() {
  var box = clear($('#cats'));
  box.appendChild(el('button.chip', {
    'aria-pressed': S.cat === '', text: '전체',
    onclick: function () { S.cat = ''; renderCats(); renderIngList(); }
  }));
  ING.CATS.forEach(function (c) {
    box.appendChild(el('button.chip', {
      'aria-pressed': S.cat === c.k,
      onclick: function () { S.cat = S.cat === c.k ? '' : c.k; renderCats(); renderIngList(); }
    }, [el('span.dot', { style: 'background:' + c.c }), c.ko]));
  });
}

function renderIngList() {
  var body = clear($('#ilist'));
  var list = ING.search(S.q, S.cat);
  $('#icount').textContent = list.length + ' / ' + ING.LIST.length + ' 종';
  if (!list.length) { body.appendChild(el('div.empty', { text: '검색 결과가 없습니다.' })); return; }

  var wrap = el('div.ilist');
  list.slice(0, 400).forEach(function (g) {
    var on = K.has(g.id);
    var row = el('div.irow' + (on ? '.on' : ''), {
      onclick: function (e) {
        if (e.target.classList.contains('n2') || e.target.classList.contains('n1')) { showIng(g); return; }
        if (K.has(g.id)) { K.delRow(g.id); K.toast(g.ko + ' 제거'); }
        else if (K.addRow(g.id)) K.toast(g.ko + ' 추가 — ' + g.typ + '%');
        renderIngList(); renderMid(); renderResult();
      }
    }, [
      el('div.bar', { style: 'background:' + ING.catColor(g.cat) }),
      el('div.txt', null, [
        el('div.n1', { text: g.ko }),
        el('div.n2', { text: g.inci })
      ]),
      el('div.use', { text: g.typ + '%' }),
      el('button.add', { text: on ? '−' : '+', 'aria-label': on ? '제거' : '추가' })
    ]);
    row.addEventListener('contextmenu', function (e) { e.preventDefault(); showIng(g); });
    wrap.appendChild(row);
  });
  if (list.length > 400) wrap.appendChild(el('div.empty', { text: '…외 ' + (list.length - 400) + '종. 검색어를 좁혀 주세요.' }));
  body.appendChild(wrap);
}

function showIng(g) {
  var kv = el('div.kv');
  function add(t) { kv.appendChild(el('span', { text: t })); }
  add(ING.catName(g.cat));
  add('권장 ' + g.min + '~' + g.max + '% (통상 ' + g.typ + '%)');
  add('밀도 ' + g.d + ' g/mL');
  add('굴절률 ' + g.ri.toFixed(3));
  if (g.hlb) add('HLB ' + g.hlb);
  if (g.rh) add('요구 HLB ' + g.rh);
  if (g.th) add('점증 K=' + g.th[0].toLocaleString('ko-KR') + ', n=' + g.th[1]);
  if (g.lam) add('라멜라 계수 ' + g.lam);
  if (g.tmax) add('투입 ' + g.tmax + '℃ 이하');
  if (g.pv) add('pH ' + g.pv + ' 쪽 (완충 ' + g.pc + ')');
  if (g.el) add('전해질 지수 ' + g.el);
  if (g.vol) add('휘발 ' + g.vol);
  if (g.ox) add('산화·열분해 민감도 ' + g.ox);
  add('단가 ' + K.n0(g.pr) + ' 원/kg');
  add('상 ' + (ING.PHASES[g.ph] || {}).ko);

  var body = el('div.rt', null, [
    el('p', { html: '<b>' + K.esc(g.inci) + '</b>' }),
    el('p', { text: g.n }),
    kv
  ]);
  K.sheet(g.ko, body, [
    el('button.btn.pri', {
      text: K.has(g.id) ? '처방에서 빼기' : '처방에 넣기 (' + g.typ + '%)',
      onclick: function (e) {
        if (K.has(g.id)) K.delRow(g.id); else K.addRow(g.id);
        e.target.closest('.mask').remove();
        renderIngList(); renderMid(); renderResult();
      }
    })
  ]);
}

/* ══ 중간 패널 (처방 / 공정 / 학습) ══════════════════════════════ */
var MIDS = [{ k: 'form', ko: '처방' }, { k: 'proc', ko: '공정' }, { k: 'learn', ko: '학습' }];

function renderMid() {
  var tabs = clear($('#midtabs'));
  MIDS.forEach(function (m) {
    tabs.appendChild(el('button.btn.sm', {
      text: m.ko, style: S.mid === m.k ? 'background:var(--acc);border-color:var(--acc);color:var(--acc-ink);font-weight:600' : '',
      onclick: function () { S.mid = m.k; renderMid(); }
    }));
  });
  $('#midTitle').textContent = (MIDS.filter(function (m) { return m.k === S.mid; })[0] || {}).ko || '';
  clear($('#midTools')); clear($('#midFoot'));
  var body = clear($('#midBody'));
  if (S.mid === 'form') renderFormula(body);
  else if (S.mid === 'proc') renderProcess(body);
  else renderLearn(body);
}

/* ── 처방표 ────────────────────────────────────────────────────── */
function renderFormula(body) {
  var tools = $('#midTools');
  tools.appendChild(el('button.btn.sm', { text: '물로 맞추기', title: '정제수로 합계를 100% 로', onclick: function () {
    if (!K.balance()) K.toast('다른 원료 합이 이미 100% 를 넘습니다');
    renderMid(); renderResult();
  } }));
  tools.appendChild(el('button.btn.sm', { text: '100%', title: '전체를 비율대로 100% 로 환산', onclick: function () {
    K.normalize(); renderMid(); renderResult();
  } }));

  if (!S.rows.length) {
    body.appendChild(el('div.empty', { html: '왼쪽 <b>원료</b> 에서 골라 넣으세요.<br><br>' +
      '아래 <b>기준 처방 불러오기</b> 로 시작해도 됩니다.' }));
  }

  var order = ['A', 'E', 'B', 'D', 'C'];
  order.forEach(function (ph) {
    var rows = S.rows.filter(function (r) { var g = ING.BY[r.id]; return g && g.ph === ph; });
    if (!rows.length) return;
    var info = ING.PHASES[ph];
    var sum = rows.reduce(function (a, b) { return a + (+b.pct || 0); }, 0);
    var sec = el('div.phase');
    sec.appendChild(el('div.phase-hd', null, [
      el('span.pdot', { style: 'background:' + info.c }),
      ph + '상 · ' + info.ko,
      el('span.amt', { text: sum.toFixed(2) + '%  ·  ' + K.mass(S.batchG * sum / 100) })
    ]));
    rows.forEach(function (r) {
      var g = ING.BY[r.id];
      var inp = el('input', { type: 'number', step: '0.01', min: '0', value: r.pct,
        onchange: function () { r.pct = Math.max(0, +inp.value || 0); S.result = null; renderMid(); renderResult(); },
        oninput: function () { r.pct = Math.max(0, +inp.value || 0); S.result = null; refreshTotal(); }
      });
      var over = r.pct > g.max * 1.001;
      sec.appendChild(el('div.frow' + (over ? '.over' : ''), null, [
        el('div.nm', { onclick: function () { showIng(g); } }, [
          el('b', { text: g.ko }),
          el('small', { text: g.inci + (over ? '  ⚠ 권장 상한 ' + g.max + '%' : '') })
        ]),
        inp,
        el('div.gval', { text: K.mass(S.batchG * r.pct / 100) }),
        el('button.del', { text: '✕', 'aria-label': '삭제', onclick: function () {
          K.delRow(r.id); renderMid(); renderIngList(); renderResult();
        } })
      ]));
    });
    body.appendChild(sec);
  });

  /* 카보머 중화 도우미 */
  var carb = S.rows.filter(function (r) { return r.id === 'carb940' || r.id === 'pemulen'; });
  if (carb.length) {
    var box = el('div.idetail');
    var need = {};
    ['arginine', 'tromet', 'tea', 'naoh'].forEach(function (a) {
      need[a] = CHEM.neutralizerNeeded(S.rows, a, 6.3);
    });
    box.appendChild(el('div', { html: '<b>중화 계산기</b> — pH 6.3 을 목표로 할 때 필요한 양' }));
    var line = el('div.kv');
    ['arginine', 'tromet', 'tea', 'naoh'].forEach(function (a) {
      line.appendChild(el('button.chip', { style: 'height:24px',
        text: ING.BY[a].ko + ' ' + need[a].toFixed(3) + '%',
        onclick: function () {
          var ex = S.rows.filter(function (r) { return r.id === a; })[0];
          if (ex) ex.pct = need[a]; else S.rows.push({ id: a, pct: need[a] });
          S.result = null; renderMid(); renderIngList(); renderResult();
          K.toast(ING.BY[a].ko + ' ' + need[a].toFixed(3) + '% 적용');
        } }));
    });
    box.appendChild(line);
    body.appendChild(box);
  }

  refreshTotal();
}

function refreshTotal() {
  var f = clear($('#midFoot'));
  if (S.mid !== 'form') return;
  var t = K.total();
  var ok = Math.abs(t - 100) < 0.02;
  f.appendChild(el('div.total', null, [
    '합계 ', el('b', { text: t.toFixed(2) + '%' }),
    el('span', { style: 'color:var(--ink-3);font-size:11px', text: '· ' + S.rows.length + '종 · ' + K.mass(S.batchG) }),
    el('span.pill' + (ok ? '.ok' : t > 100 ? '.bad' : '.warn'), {
      text: ok ? '정상' : t > 100 ? '초과 ' + (t - 100).toFixed(2) + '%' : '부족 ' + (100 - t).toFixed(2) + '%'
    })
  ]));
}

/* ── 공정 ──────────────────────────────────────────────────────── */
function materialize() {
  if (!S.steps) S.steps = K.steps().map(function (s) {
    return { t: s.t, ko: s.ko, temp: s.temp, aji: s.aji, homo: s.homo, min: s.min,
             vac: s.vac, add: (s.add || []).slice(), note: s.note };
  });
  return S.steps;
}

function renderProcess(body) {
  var rig = K.rig();
  $('#midTools').appendChild(el('button.btn.sm', {
    text: '표준 공정 재생성', onclick: function () {
      S.steps = null; S.result = null; renderMid(); K.toast('처방에 맞는 표준 공정을 다시 짰습니다');
    } }));

  var st = K.steps();
  body.appendChild(el('div.idetail', null, [
    el('div', { html: '<b>' + rig.icon + ' ' + rig.ko + '</b> · 배치 ' + K.mass(S.batchG) }),
    el('div', { style: 'margin-top:3px', text: rig.n }),
    el('div.kv', null, [
      el('span', { text: '호모 지름 ' + (rig.dHomo * 1000) + ' mm / 최대 ' + K.n0(rig.maxHomo) + ' rpm' }),
      el('span', { text: '아지 지름 ' + (rig.dAji * 1000) + ' mm' }),
      el('span', { text: rig.vacuum ? '진공 가능' : '개방 (진공 없음)' }),
      el('span', { text: '자켓 ' + (rig.tj[0] ? rig.tj[0] + '℃ / ' : '') + rig.tj[1] + '℃' })
    ])
  ]));

  st.forEach(function (s, i) {
    var node = el('div.step');
    node.appendChild(el('div.step-hd', null, [
      el('div.no', { text: i + 1 }),
      el('div.ttl', { text: s.ko || PROC.STEPKO[s.t] }),
      el('div.kind', { text: PROC.STEPKO[s.t] || s.t })
    ]));

    var par = el('div.step-par');
    function pnum(lbl, key, unit, max) {
      var inp = el('input', { type: 'number', value: s[key], min: '0', max: max || '',
        onchange: function () {
          materialize()[i][key] = Math.max(0, +inp.value || 0);
          S.result = null; renderMid(); renderResult();
        } });
      par.appendChild(el('div.par', null, [el('em', { text: lbl }), inp, el('em', { text: unit })]));
    }
    pnum('온도', 'temp', '℃', 120);
    pnum('아지', 'aji', 'rpm', rig.maxAji);
    if (['emulsify', 'homo', 'grind', 'neutralize'].indexOf(s.t) >= 0 || s.homo > 0) pnum('호모', 'homo', 'rpm', rig.maxHomo);
    pnum('시간', 'min', '분', 300);
    par.appendChild(el('button.chip', {
      style: 'height:26px', 'aria-pressed': !!s.vac, text: s.vac ? '진공 ON' : '진공 OFF',
      onclick: function () {
        if (!rig.vacuum) { K.toast('이 설비에는 진공이 없습니다'); return; }
        materialize()[i].vac = !s.vac; S.result = null; renderMid(); renderResult();
      } }));
    node.appendChild(par);

    if (s.homo > 0) {
      var tip = PROC.tipSpeed(rig.dHomo, s.homo);
      node.appendChild(el('div.step-add', null, [
        el('span.tag', { style: tip > 18 ? 'background:var(--bad-soft);color:var(--bad)' : tip < 3 ? 'background:var(--warn-soft);color:var(--warn)' : '',
          text: '팁속도 ' + tip.toFixed(1) + ' m/s' })
      ]));
    }
    if (s.add && s.add.length) {
      var tags = el('div.step-add');
      s.add.forEach(function (id) {
        var g = ING.BY[id]; if (!g) return;
        var hot = g.tmax && s.temp > g.tmax;
        tags.appendChild(el('span.tag', {
          style: hot ? 'background:var(--bad-soft);color:var(--bad)' : 'background:' + ING.catColor(g.cat) + '22',
          text: g.ko + (hot ? ' ⚠' + g.tmax + '℃' : '')
        }));
      });
      node.appendChild(tags);
    }
    if (s.note) node.appendChild(el('div.step-note', { text: s.note }));
    body.appendChild(node);
  });

  var foot = $('#midFoot');
  foot.appendChild(el('div.total', null, [
    '스텝 ', el('b', { text: st.length + '' }),
    el('span', { style: 'color:var(--ink-3);font-size:11px',
      text: '· 지시 시간 합 ' + Math.round(st.reduce(function (a, b) { return a + b.min; }, 0)) + '분' }),
    el('span.pill.info', { text: S.steps ? '수정됨' : '표준' })
  ]));
}

/* ══ 결과 ════════════════════════════════════════════════════════ */
function jarSvg(hex, ntu, eta, fill) {
  var alpha = 0.16 + 0.84 * Math.min(1, Math.pow(Math.max(ntu, 0.5) / 700, 0.55));
  var lvl = 88 - Math.max(20, Math.min(70, (fill == null ? 72 : fill) * 0.68));
  var dome = Math.min(7, 1.2 + Math.log(Math.max(eta, 1)) / Math.LN10 * 1.25);
  var id = 'j' + Math.random().toString(36).slice(2, 7);
  var s =
  '<svg class="jarsvg" width="74" height="92" viewBox="0 0 74 92" aria-hidden="true">' +
  '<defs>' +
  '<linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="0">' +
  '<stop offset="0" stop-color="#000" stop-opacity=".13"/><stop offset=".28" stop-color="#fff" stop-opacity=".30"/>' +
  '<stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".16"/>' +
  '</linearGradient>' +
  '<clipPath id="c' + id + '"><path d="M12 8 h50 v62 a11 11 0 0 1 -11 11 h-28 a11 11 0 0 1 -11 -11 z"/></clipPath>' +
  '</defs>' +
  '<path d="M12 8 h50 v62 a11 11 0 0 1 -11 11 h-28 a11 11 0 0 1 -11 -11 z" fill="var(--panel-3)"/>' +
  '<g clip-path="url(#c' + id + ')">' +
  '<rect x="12" y="' + lvl + '" width="50" height="90" fill="' + hex + '" opacity="' + alpha.toFixed(3) + '"/>' +
  '<ellipse cx="37" cy="' + lvl + '" rx="25" ry="' + dome.toFixed(1) + '" fill="' + hex + '" opacity="' + (alpha * 0.85).toFixed(3) + '"/>' +
  '<ellipse cx="37" cy="' + lvl + '" rx="25" ry="' + dome.toFixed(1) + '" fill="#fff" opacity=".18"/>' +
  '<rect x="12" y="0" width="50" height="92" fill="url(#g' + id + ')"/>' +
  '</g>' +
  '<path d="M12 8 h50 v62 a11 11 0 0 1 -11 11 h-28 a11 11 0 0 1 -11 -11 z" fill="none" stroke="var(--line-2)" stroke-width="1.4"/>' +
  '<rect x="9" y="3" width="56" height="6" rx="2.5" fill="var(--panel-3)" stroke="var(--line-2)" stroke-width="1.2"/>' +
  '</svg>';
  var d = document.createElement('div');
  d.innerHTML = s;
  return d.firstChild;
}

function gauge(v, lo, hi, log) {
  var f = log ? function (x) { return Math.log(Math.max(x, 0.4)); } : function (x) { return x; };
  var pad = (f(hi) - f(lo)) * 1.1 + 0.001;
  var a = f(lo) - pad, b = f(hi) + pad;
  var pc = function (x) { return Math.max(0, Math.min(100, (f(x) - a) / (b - a) * 100)); };
  return el('div.gauge', null, [
    el('div.band', { style: 'left:' + pc(lo) + '%;right:' + (100 - pc(hi)) + '%' }),
    el('div.mark', { style: 'left:calc(' + pc(v) + '% - 1.5px)' })
  ]);
}

function fnum(v, d) { return d ? v.toFixed(d) : K.n0(v); }

function met(k, v, u, cls, extra) {
  return el('div.met' + (cls ? '.' + cls : ''), null, [
    el('div.k', { text: k }),
    el('div.v', null, [String(v), u ? el('span.u', { text: u }) : null]),
    extra || null
  ]);
}

function renderResult() {
  var body = clear($('#resBody'));
  $('#resSub').textContent = '';

  if (!S.rows.length) {
    body.appendChild(el('div.empty', { html: '처방을 만들고 <b>제조 ▶</b> 를 누르세요.' }));
    return;
  }

  /* 실행 전이면 이론값 미리보기 */
  var run = S.result;
  var live = run ? run.res : CHEM.evaluate(S.rows, { tip: 6.3, sec: 300 });
  var p = PROD.get(S.prod);
  var judge = PROD.judge(S.prod, live);
  var wrap = el('div.res');

  /* 미리보기 / 실측 배지 */
  $('#resSub').textContent = run ? '실측 · seed ' + run.seed : '이론 미리보기';

  wrap.appendChild(el('div.jar', null, [
    jarSvg(live.color.hex, live.ntu, live.eta, run ? run.yieldPct : 72),
    el('div.jarinfo', null, [
      el('div.grade', { style: 'color:' + (live.stability.score >= 85 ? 'var(--ok)' : live.stability.score >= 62 ? 'var(--warn)' : 'var(--bad)'),
        text: live.stability.grade + ' ' + live.stability.score }),
      el('div.gsub', { text: '안정도 · ' + live.turb.grade + ' · ' + live.color.hex }),
      el('div.gsub', { style: 'margin-top:4px' }, [
        el('span.pill' + (judge.ok ? '.ok' : '.bad'), { text: judge.ok ? '규격 통과' : '규격 미달' }),
        ' ', el('span', { style: 'font-size:11px;color:var(--ink-3)', text: p.ko + ' · ' + p.tag })
      ])
    ])
  ]));

  /* 핵심 수치 */
  var mets = el('div.mets');
  var sv = p.spec.visc, sp = p.spec.ph, sn = p.spec.ntu;
  mets.appendChild(met('점도 (12 rpm)', K.eng(live.eta), 'cP',
    sv ? (live.eta >= sv[0] && live.eta <= sv[1] ? 'ok' : 'bad') : '',
    sv ? gauge(live.eta, sv[0], sv[1], true) : null));
  mets.appendChild(met('pH', live.pH.toFixed(2), '',
    sp ? (live.pH >= sp[0] && live.pH <= sp[1] ? 'ok' : 'bad') : '',
    sp ? gauge(live.pH, sp[0], sp[1]) : null));
  mets.appendChild(met('탁도', K.eng(live.ntu), 'NTU',
    sn ? (live.ntu >= sn[0] && live.ntu <= sn[1] ? 'ok' : 'bad') : '',
    sn ? gauge(live.ntu, Math.max(sn[0], 0.5), Math.min(sn[1], 1e5), true) : null));
  mets.appendChild(met('평균 액적 d₃₂',
    live.d32 && !(live.drop && live.drop.minor) ? live.d32.toFixed(2) : '—', 'µm'));
  mets.appendChild(met('전단감점 지수 n', live.nIdx.toFixed(2), ''));
  mets.appendChild(met('원가', K.won(live.cost), '원/kg'));
  if (run) {
    mets.appendChild(met('수율', run.yieldPct.toFixed(1), '%', run.yieldPct >= 95 ? 'ok' : run.yieldPct < 85 ? 'bad' : ''));
    mets.appendChild(met('제조 시간', Math.round(run.minutes), '분'));
  }
  wrap.appendChild(mets);

  /* 규격 상세 */
  if (judge.items.length) {
    wrap.appendChild(el('h3.sec', { text: '출하 규격' }));
    judge.items.forEach(function (i) {
      wrap.appendChild(el('div.goal' + (i.ok ? '.hit' : ''), null, [
        el('div.bx', { text: '✓' }),
        el('div.gt', { text: i.ko + '  ' + (i.range[1] >= 1e6 ? fnum(i.range[0], i.fmt) + ' 이상'
            : fnum(i.range[0], i.fmt) + ' ~ ' + fnum(i.range[1], i.fmt)) + (i.unit ? ' ' + i.unit : '') }),
        el('div.gv', { text: i.fmt ? i.val.toFixed(i.fmt) : K.n0(i.val) })
      ]));
    });
  }

  /* 안정성 진단 */
  wrap.appendChild(el('h3.sec', { text: '안정성 진단' }));
  if (!live.stability.items.length) {
    wrap.appendChild(el('div.note.good', null, [el('div', null, [
      el('b', { text: '문제 없음' }), '처방상 불안정 요인이 발견되지 않았습니다.'])]));
  }
  live.stability.items.forEach(function (i) {
    wrap.appendChild(el('div.note.s' + (i.sev >= 16 ? 3 : i.sev >= 8 ? 2 : 1), null, [
      el('div.sv', { text: '−' + i.sev }),
      el('div', null, [el('b', { text: i.ko }), i.msg])
    ]));
  });

  /* 유화 진단 */
  if (live.drop && !live.drop.minor) {
    var d = live.drop;
    wrap.appendChild(el('h3.sec', { text: '유화 진단' }));
    wrap.appendChild(el('div.idetail', { style: 'border:1px solid var(--line);border-radius:var(--r-sm)' }, [
      el('div.kv', null, [
        el('span', { text: '오일 요구 HLB ' + d.rh.toFixed(1) }),
        el('span', { text: '유화제 혼합 HLB ' + d.bh.toFixed(1) }),
        el('span', { text: '차이 ' + Math.abs(d.bh - d.rh).toFixed(1) }),
        el('span', { text: '계면장력 ' + d.sigma.toFixed(1) + ' mN/m' }),
        el('span', { text: '전단 한계 ' + d.dShear.toFixed(2) + ' µm' }),
        el('span', { text: '피복 한계 ' + (d.dCover > 100 ? '—' : d.dCover.toFixed(2) + ' µm') }),
        el('span', { text: '내상 부피분율 ' + (live.agg.phi * 100).toFixed(1) + '%' }),
        el('span', { text: '굴절률 차 ' + live.agg.dn.toFixed(3) }),
        el('span', { text: '크리밍 ' + (live.cream ? live.cream.toFixed(2) + ' mm/일' : '정지(항복응력)') })
      ])
    ]));
  }

  /* 점도 구성 */
  wrap.appendChild(el('h3.sec', { text: '점도가 어디서 나오는가' }));
  var v = live.visc, comp = [];
  if (v.gel > 1) comp.push(['점증제 겔', v.gel]);
  if (v.lam > 1) comp.push(['라멜라 겔망', v.lam]);
  if (v.surfV > 1) comp.push(['계면활성제 미셀', v.surfV]);
  comp.push(['내상 부피분율 배수', null]);
  var cbox = el('div.kv');
  comp.forEach(function (c) {
    cbox.appendChild(el('span', { text: c[1] == null ? '내상 효과 ×' + v.KD.toFixed(2) : c[0] + ' ' + K.eng(c[1]) + ' cP' }));
  });
  if (v.yieldStress > 0.1) cbox.appendChild(el('span', { text: '항복응력 ' + v.yieldStress.toFixed(1) + ' Pa' }));
  wrap.appendChild(cbox);

  /* 실행 결과 */
  if (run) {
    wrap.appendChild(el('h3.sec', { text: '배치 결과 — 이론 대비' }));
    var cmp = el('table.rec');
    cmp.appendChild(el('thead', null, [el('tr', null, [
      el('th', { text: '항목' }), el('th', { text: '이론' }), el('th', { text: '실측' }), el('th', { text: '차이' })])]));
    var tb = el('tbody');
    function cr(ko, a, b, fmt) {
      var dv = a ? (b - a) / a * 100 : 0;
      tb.appendChild(el('tr', null, [
        el('td', { text: ko }),
        el('td', { text: fmt(a) }), el('td', { text: fmt(b) }),
        el('td', { class: Math.abs(dv) > 12 ? 'hi' : '', text: (dv >= 0 ? '+' : '') + dv.toFixed(1) + '%' })
      ]));
    }
    cr('점도 cP', run.ideal.eta, run.res.eta, K.eng);
    cr('pH', run.ideal.pH, run.res.pH, function (x) { return x.toFixed(2); });
    cr('탁도 NTU', run.ideal.ntu, run.res.ntu, K.eng);
    if (run.res.d32) cr('액적 µm', run.ideal.d32 || run.res.d32, run.res.d32, function (x) { return x.toFixed(2); });
    cmp.appendChild(tb);
    wrap.appendChild(el('div.scroller', null, [cmp]));

    wrap.appendChild(el('h3.sec', { text: '스케일이 만든 차이' }));
    var sk = el('div.kv');
    [['설비', run.rig.icon + ' ' + run.rig.ko],
     ['용기 지름', (run.geo.D * 100).toFixed(1) + ' cm'],
     ['표면적/부피', run.geo.svRatio.toFixed(1) + ' /m'],
     ['증발 손실', run.evapPct.toFixed(2) + '%'],
     ['벽면 잔류', K.mass(run.holdG)],
     ['수율', run.yieldPct.toFixed(1) + '%'],
     ['최고 온도', run.maxT.toFixed(0) + '℃'],
     ['열이력 지수', run.thermalDose.toFixed(0)],
     ['냉각 속도', run.coolRate.toFixed(2) + ' ℃/분'],
     ['라멜라 냉각계수', '×' + run.coolFactor.toFixed(2)],
     ['혼합 균질도', run.homog.toFixed(0) + '%'],
     ['95% 혼합 시간', (run.theta / 60).toFixed(1) + '분'],
     ['혼입 기포', run.airPct.toFixed(2) + '%'],
     ['갈변 지수', run.browning.toFixed(1)]
    ].forEach(function (r) { sk.appendChild(el('span', { text: r[0] + ' ' + r[1] })); });
    wrap.appendChild(sk);

    /* 공정 경고 */
    if (run.warn.length) {
      wrap.appendChild(el('h3.sec', { text: '공정 경고 (' + run.warn.length + '건)' }));
      run.warn.forEach(function (w) {
        wrap.appendChild(el('div.note.s' + (w.sev >= 12 ? 3 : w.sev >= 7 ? 2 : 1), null, [
          el('div.sv', { text: '−' + w.sev }),
          el('div', null, [el('b', { text: w.ko }), w.msg])
        ]));
      });
    } else {
      wrap.appendChild(el('h3.sec', { text: '공정 경고' }));
      wrap.appendChild(el('div.note.good', null, [el('div', null, [el('b', { text: '무결점' }), '공정상 지적 사항이 없습니다.'])]));
    }

    /* 타임라인 */
    wrap.appendChild(el('h3.sec', { text: '공정 타임라인' }));
    var tl = el('div.tl'), tmax = Math.max(run.minutes, 1), acc = 0;
    run.trace.forEach(function (t) {
      var w = t.min / tmax * 100, x = acc / tmax * 100; acc += t.min;
      var hot = Math.max(0, Math.min(1, (t.temp - 25) / 65));
      var col = 'hsl(' + Math.round(210 - hot * 205) + ' 62% ' + (52 - hot * 6) + '%)';
      tl.appendChild(el('div.tlrow', null, [
        el('div.tt', { text: t.min >= 1 ? Math.round(t.min) + '분' : '<1분' }),
        el('div.tlbar', null, [el('i', { style: 'left:' + x + '%;width:' + Math.max(w, 1.2) + '%;background:' + col })]),
        el('div.tn', { text: t.ko })
      ]));
    });
    wrap.appendChild(tl);
    wrap.appendChild(el('div.kv', null, [el('span', { text: '막대 색 = 그 스텝의 도달 온도 (파랑 25℃ → 빨강 90℃)' })]));

    /* 칭량 기록 */
    wrap.appendChild(el('h3.sec', { text: '칭량 기록' }));
    var rec = el('table.rec');
    rec.appendChild(el('thead', null, [el('tr', null, [
      el('th', { text: '원료' }), el('th', { text: '%' }), el('th', { text: '목표' }),
      el('th', { text: '실제' }), el('th', { text: '오차' }), el('th', { text: '저울' })])]));
    var tbody = el('tbody');
    run.items.slice().sort(function (a, b) { return Math.abs(b.rel) - Math.abs(a.rel); }).forEach(function (i) {
      tbody.appendChild(el('tr', null, [
        el('td', { text: i.g.ko }),
        el('td', { text: i.pct.toFixed(3) }),
        el('td', { text: K.mass(i.target) }),
        el('td', { text: K.mass(i.actual) }),
        el('td', { class: Math.abs(i.rel) > 0.05 ? 'hi' : '', text: (i.rel * 100).toFixed(2) + '%' }),
        el('td', { text: i.scale.d + ' g' })
      ]));
    });
    rec.appendChild(tbody);
    wrap.appendChild(el('div.scroller', null, [rec]));
  }

  /* 반복 배치 */
  if (S.spread) {
    var sp2 = S.spread;
    wrap.appendChild(el('h3.sec', { text: '배치 간 편차 (5배치)' }));
    var t2 = el('table.rec');
    t2.appendChild(el('thead', null, [el('tr', null, [
      el('th', { text: '항목' }), el('th', { text: '평균' }), el('th', { text: '최소' }),
      el('th', { text: '최대' }), el('th', { text: 'CV' })])]));
    var tb2 = el('tbody');
    function sr(ko, s2, f) {
      tb2.appendChild(el('tr', null, [
        el('td', { text: ko }), el('td', { text: f(s2.mean) }), el('td', { text: f(s2.min) }),
        el('td', { text: f(s2.max) }), el('td', { class: s2.cv > 5 ? 'hi' : '', text: s2.cv.toFixed(2) + '%' })]));
    }
    sr('점도 cP', sp2.eta, K.eng);
    sr('pH', sp2.pH, function (x) { return x.toFixed(2); });
    sr('탁도 NTU', sp2.ntu, K.eng);
    sr('수율 %', sp2.yieldPct, function (x) { return x.toFixed(1); });
    if (sp2.d32.mean > 0) sr('액적 µm', sp2.d32, function (x) { return x.toFixed(2); });
    t2.appendChild(tb2);
    wrap.appendChild(el('div.scroller', null, [t2]));
  }

  /* 과제 채점 */
  if (S.mission && run) wrap.appendChild(missionCard(run));

  body.appendChild(wrap);
}

/* ══ 학습 ════════════════════════════════════════════════════════ */
function chProgress(ch) {
  var done = ch.list.filter(function (m) { return S.progress[m.id]; }).length;
  return { done: done, total: ch.list.length };
}

function renderLearn(body) {
  var tot = MISS.LIST.length;
  var done = MISS.LIST.filter(function (m) { return S.progress[m.id]; }).length;
  $('#midTools').appendChild(el('span.pill.info', { text: done + ' / ' + tot }));
  if (done) $('#midTools').appendChild(el('button.btn.sm', { text: '초기화', onclick: function () {
    if (!confirm('학습 진행 상황을 모두 지웁니다.')) return;
    S.progress = {}; persist(); renderMid(); K.toast('진행 상황 초기화');
  } }));

  body.appendChild(el('div.idetail', null, [
    el('div', { html: '<b>17개 제품군 · ' + tot + '개 과제.</b> 제품군마다 만드는 법이 다르다.' }),
    el('div', { style: 'margin-top:4px',
      text: '과제를 고르면 시작 처방과 조건이 세팅된다. 조건은 제조할 때마다 채점된다. ' +
            '필수 조건을 모두 채우면 통과, 추가 조건까지 채우면 만점이다.' })
  ]));

  MISS.CHAPTERS.forEach(function (ch, ci) {
    var pg = chProgress(ch);
    var open = S.openCh === ch.key;
    var sec = el('div.chapter');
    sec.appendChild(el('button.ch-hd', {
      onclick: function () { S.openCh = open ? null : ch.key; renderMid(); }
    }, [
      el('div.ic', { text: ch.icon }),
      el('div.t', null, [
        el('b', { text: (ci + 1) + '. ' + ch.ko }),
        el('small', { text: ch.tag }),
        el('div.prog', null, [el('i', { style: 'width:' + (pg.total ? pg.done / pg.total * 100 : 0) + '%' })])
      ]),
      el('div.pg', { text: pg.done + '/' + pg.total })
    ]));
    if (open) {
      sec.appendChild(el('div.idetail', null, [
        el('div', { text: ch.n }),
        el('div.kv', null, ch.key3.map(function (t) { return el('span', { text: '· ' + t }); }))
      ]));
      ch.list.forEach(function (m) {
        var p = S.progress[m.id];
        sec.appendChild(el('button.mrow', { onclick: function () { openMission(m); } }, [
          el('div.st' + (p ? '.done' : ''), { text: p ? '✓' : m.no }),
          el('div.tx', null, [
            el('b', { text: m.ko }),
            el('small', { text: TYPEKO[m.type] + ' · ' + m.must.length + '개 필수' +
              (m.batchG ? ' · ' + K.mass(m.batchG) : '') })
          ]),
          el('div.gr', { style: 'color:' + (p ? gradeColor(p.grade) : 'var(--ink-3)'), text: p ? p.grade : '' })
        ]));
      });
    }
    body.appendChild(sec);
  });
}

var TYPEKO = { build: '설계', fix: '고장 수리', process: '공정 개선', scale: '스케일업' };
function gradeColor(g) {
  return g === 'S' ? 'var(--acc)' : g === 'A' ? 'var(--ok)' : g === 'B' ? 'var(--info)' : 'var(--warn)';
}

function openMission(m) {
  var goals = el('div');
  goals.appendChild(el('h3.sec', { text: '필수 조건' }));
  m.must.forEach(function (c) {
    goals.appendChild(el('div.goal', null, [el('div.bx', { text: '✓' }), el('div.gt', { text: MISS.label(c, m.ch) })]));
  });
  if (m.bonus.length) {
    goals.appendChild(el('h3.sec', { text: '추가 조건 (만점용)' }));
    m.bonus.forEach(function (c) {
      goals.appendChild(el('div.goal.opt', null, [el('div.bx', { text: '✓' }), el('div.gt', { text: MISS.label(c, m.ch) })]));
    });
  }
  var body = el('div', null, [
    el('div.rt', null, [
      el('p', { html: '<b>' + TYPEKO[m.type] + '</b> · ' + PROD.get(m.ch).ko +
        (m.batchG ? ' · 배치 ' + K.mass(m.batchG) : '') }),
      el('p', { text: m.brief }),
      m.hint ? el('p', { style: 'color:var(--ink-3);font-size:12px', text: '힌트 — ' + m.hint }) : null
    ]),
    goals
  ]);
  var sh = K.sheet(m.ko, body, [
    el('button.btn', { text: '닫기', onclick: function () { sh.close(); } }),
    el('button.btn.pri', { style: 'flex:1', text: '이 과제 시작', onclick: function () {
      startMission(m); sh.close();
    } })
  ]);
}

function startMission(m) {
  S.mission = m;
  S.prod = m.ch;
  K.setRows(MISS.startRows(m));
  if (m.batchG) S.batchG = m.batchG;
  S.rigKey = m.rigKey || null;
  S.steps = null; S.result = null; S.spread = null;
  /* 과제가 "고장난 공정" 을 지정했으면 표준 공정에 적용한다 */
  if (m.pm && m.pm.length) {
    var st = materialize();
    m.pm.forEach(function (mu) {
      st.forEach(function (x, i) {
        if (mu.t ? x.t === mu.t : i === mu.i) for (var k in mu.set) x[k] = mu.set[k];
      });
    });
  }
  syncTop();
  S.mid = 'form';
  go('form');
  renderAll();
  K.toast('과제 시작 — ' + m.ko);
}

function missionCard(run) {
  var m = S.mission;
  var g = MISS.grade(m, run, S);
  var box = el('div');
  box.appendChild(el('h3.sec', { text: '과제 채점 — ' + m.ko }));
  box.appendChild(el('div.note.' + (g.ok ? 'good' : 's2'), null, [
    el('div', null, [
      el('b', { text: g.ok ? '통과 · ' + g.grade + ' 등급 (' + g.score + '점)' : '아직 미달' }),
      g.ok ? ('추가 조건 ' + g.bHit + '/' + m.bonus.length + ' 달성.')
           : ('필수 ' + g.must.filter(function (x) { return x.ok; }).length + '/' + g.must.length + ' 충족.')
    ])
  ]));
  g.must.forEach(function (x) {
    box.appendChild(el('div.goal' + (x.ok ? '.hit' : ''), null, [
      el('div.bx', { text: '✓' }), el('div.gt', { text: x.t }), el('div.gv', { text: x.v })]));
  });
  g.bonus.forEach(function (x) {
    box.appendChild(el('div.goal.opt' + (x.ok ? '.hit' : ''), null, [
      el('div.bx', { text: '✓' }), el('div.gt', { text: x.t }), el('div.gv', { text: x.v })]));
  });
  if (g.ok) {
    var prev = S.progress[m.id];
    if (!prev || prev.score < g.score) {
      S.progress[m.id] = { score: g.score, grade: g.grade };
      persist();
    }
  }
  box.appendChild(el('div', { style: 'display:flex;gap:6px;margin-top:10px' }, [
    el('button.btn.sm', { text: '과제 설명 다시 보기', onclick: function () { openMission(m); } }),
    el('button.btn.sm', { text: '과제 그만두기', onclick: function () {
      S.mission = null; renderAll(); K.toast('자유 모드로 돌아갔습니다');
    } })
  ]));
  return box;
}

/* ══ 실행 ════════════════════════════════════════════════════════ */
function runBatch(spread) {
  if (!S.rows.length) { K.toast('처방이 비어 있습니다'); return; }
  var t = K.total();
  if (Math.abs(t - 100) > 0.02) K.toast('합계가 ' + t.toFixed(2) + '% 입니다 — 비율대로 환산해 제조합니다');
  var p = PROD.get(S.prod);
  var opt = { batchG: S.batchG, rig: K.rig(), steps: K.steps(), kind: p.kind, seed: S.seed };
  try {
    S.result = SIM.run(S.rows, opt);
    S.spread = spread ? SIM.repeat(S.rows, opt, 5) : null;
  } catch (e) {
    K.toast('계산 오류: ' + e.message);
    if (window.console) console.error(e);
    return;
  }
  go('res');
  renderResult();
  persist();
}

/* ══ 내비게이션 ══════════════════════════════════════════════════ */
function go(v) {
  S.view = v;
  if (v === 'form' || v === 'proc' || v === 'learn') S.mid = v;
  var map = { ing: 'p-ing', form: 'p-mid', proc: 'p-mid', learn: 'p-mid', res: 'p-res' };
  K.$$('.pane').forEach(function (n) { n.classList.toggle('active', n.id === map[v]); });
  K.$$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.go === v); });
  renderMid();
}

function syncTop() {
  $('#inBatch').value = S.batchG >= 1000 ? +(S.batchG / 1000).toFixed(3) : S.batchG;
  $('#selUnit').value = S.batchG >= 1000 ? '1000' : '1';
  $('#selProd').value = S.prod;
}

function renderAll() {
  renderCats(); renderIngList(); renderMid(); renderResult(); syncTop();
}

function persist() {
  K.save({
    prod: S.prod, rows: S.rows, batchG: S.batchG, rigKey: S.rigKey,
    steps: S.steps, progress: S.progress, mission: S.mission ? S.mission.id : null
  });
}

G.UI = {
  renderAll: renderAll, renderMid: renderMid, renderResult: renderResult,
  renderIngList: renderIngList, renderCats: renderCats,
  go: go, run: runBatch, syncTop: syncTop, persist: persist,
  showIng: showIng, openMission: openMission, startMission: startMission,
  materialize: materialize, gradeColor: gradeColor, TYPEKO: TYPEKO
};
})(window);
