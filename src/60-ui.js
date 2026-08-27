/* =====================================================================
   포뮬라랩 — 화면
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, S = K.S, el = K.el, $ = K.$, clear = K.clear;
var ING = G.ING, PROD = G.PROD, PROC = G.PROC, CHEM = G.CHEM, SIM = G.SIM, MISS = G.MISS;

/* =====================================================================
   휠 스테퍼 — 버튼 · 마우스 휠 · 위아래 드래그 · 직접 입력
   ===================================================================== */
function smartStep(v, kind) {
  var a = Math.abs(v);
  if (kind === 'pct') {
    if (a < 0.05) return 0.001;
    if (a < 0.5)  return 0.01;
    if (a < 5)    return 0.1;
    if (a < 30)   return 0.5;
    return 1;
  }
  if (kind === 'rpm')  return a < 400 ? 50 : a < 2000 ? 100 : 250;
  if (kind === 'min')  return a < 10 ? 1 : 5;
  if (kind === 'temp') return 1;
  if (kind === 'g')    return a < 500 ? 50 : a < 5000 ? 500 : a < 100000 ? 5000 : 50000;
  return 1;
}
function decOf(step) {
  return step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
}
function snap(v, step) {
  var d = decOf(step);
  return +(Math.round(v / step) * step).toFixed(d);
}

/* opt : {kind, unit, min, max, cls, fmt, onChange} */
function stepper(value, opt) {
  opt = opt || {};
  var kind = opt.kind || 'pct',
      min = opt.min != null ? opt.min : 0,
      max = opt.max != null ? opt.max : 1e9;
  var val = value;

  var vb = el('b'), vu = opt.unit ? el('em', { text: opt.unit }) : null;
  var vbox = el('div.v', { title: '드래그하거나 휠을 굴려 조절 · 눌러서 직접 입력' }, [vb, vu]);
  var minus = el('button', { type: 'button', text: '−', 'aria-label': '줄이기' });
  var plus  = el('button', { type: 'button', text: '+', 'aria-label': '늘리기' });
  var box = el('div.stp' + (opt.cls ? '.' + opt.cls : ''), null, [minus, vbox, plus]);

  function show() {
    vb.textContent = opt.fmt ? opt.fmt(val) : String(val);
  }
  function commit(nv, silent) {
    nv = Math.max(min, Math.min(max, nv));
    var st = smartStep(nv, kind);
    nv = snap(nv, st);
    if (nv === val) { show(); return; }
    val = nv; show();
    if (!silent && opt.onChange) opt.onChange(val);
  }
  function bump(dir) {
    var st = smartStep(val + (dir > 0 ? 1e-9 : -1e-9), kind);
    /* 경계에서 단계가 바뀔 때 자연스럽게 */
    var nv = snap(val + dir * st, st);
    if (nv === val) nv = val + dir * st;
    commit(nv);
  }
  show();

  /* 버튼 — 길게 누르면 반복 */
  function hold(btn, dir) {
    var t1 = null, t2 = null;
    function stop() { clearTimeout(t1); clearInterval(t2); t1 = t2 = null; }
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault(); bump(dir);
      t1 = setTimeout(function () { t2 = setInterval(function () { bump(dir); }, 70); }, 420);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      btn.addEventListener(ev, stop);
    });
  }
  hold(minus, -1); hold(plus, 1);

  /* 마우스 휠 */
  box.addEventListener('wheel', function (e) {
    e.preventDefault();
    bump(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  /* 위아래 드래그 */
  var dragging = false, startY = 0, startV = 0, moved = 0;
  vbox.addEventListener('pointerdown', function (e) {
    if (vbox.querySelector('input')) return;
    dragging = true; moved = 0; startY = e.clientY; startV = val;
    vbox.setPointerCapture(e.pointerId);
    box.classList.add('drag');
  });
  vbox.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dy = startY - e.clientY;
    if (Math.abs(dy) > moved) moved = Math.abs(dy);
    var steps = Math.round(dy / 7);
    if (!steps) return;
    var st = smartStep(startV, kind);
    commit(startV + steps * st);
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false; box.classList.remove('drag');
    try { vbox.releasePointerCapture(e.pointerId); } catch (err) {}
    if (moved < 4) edit();                 /* 움직이지 않았으면 = 탭 → 직접 입력 */
  }
  vbox.addEventListener('pointerup', endDrag);
  vbox.addEventListener('pointercancel', endDrag);

  /* 직접 입력 */
  function edit() {
    if (vbox.querySelector('input')) return;
    var inp = el('input', { type: 'text', inputmode: 'decimal', value: String(val) });
    clear(vbox); vbox.appendChild(inp);
    inp.focus(); inp.select();
    function done(save) {
      var nv = parseFloat(inp.value);
      clear(vbox); vbox.appendChild(vb); if (vu) vbox.appendChild(vu);
      if (save && isFinite(nv)) commit(nv); else show();
    }
    inp.addEventListener('blur', function () { done(true); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      if (e.key === 'ArrowUp') { e.preventDefault(); inp.value = String(val); bump(1); inp.value = String(val); }
      if (e.key === 'ArrowDown') { e.preventDefault(); inp.value = String(val); bump(-1); inp.value = String(val); }
    });
  }

  box.setValue = function (v) { val = v; show(); };
  return box;
}

/* 퍼센트 표시 */
function pctText(v) {
  return v >= 10 ? v.toFixed(v % 1 ? 2 : 0) : v >= 1 ? v.toFixed(2) : v.toFixed(v < 0.1 ? 3 : 2);
}

/* =====================================================================
   원료 고르기 오버레이
   ===================================================================== */
function openPicker(q) {
  if (q != null) { S.q = q; $('#q').value = q; }
  $('#picker').hidden = false;
  renderCats(); renderIngList();
  setTimeout(function () { if (window.innerWidth >= 980) $('#q').focus(); }, 30);
}
function closePicker() {
  $('#picker').hidden = true;
  renderMid(); renderResult();
}

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

function pickerFoot() {
  var t = K.total();
  $('#ptotal').textContent = '처방 합계 ' + t.toFixed(2) + '% · ' + S.rows.length + '종';
  $('#ptotal').style.color = Math.abs(t - 100) < 0.02 ? 'var(--ok)' : 'var(--ink-3)';
}

function renderIngList() {
  var body = clear($('#ilist'));
  var list = ING.search(S.q, S.cat);
  $('#icount').textContent = list.length + ' / ' + ING.LIST.length + ' 종';
  $('#qClear').hidden = !S.q;
  pickerFoot();

  if (!list.length) {
    body.appendChild(el('div.empty', { html: '찾는 원료가 없습니다.<br>기능(보습 · 점증 · 유화)이나 제품명(샴푸 · 선크림)으로도 찾을 수 있습니다.' }));
    return;
  }

  list.slice(0, 300).forEach(function (g) {
    var row = S.rows.filter(function (r) { return r.id === g.id; })[0];
    var act = el('div.act');

    if (row) {
      act.appendChild(stepper(row.pct, {
        kind: 'pct', unit: '%', min: 0, max: 100, cls: 'sm', fmt: pctText,
        onChange: function (v) { row.pct = v; S.result = null; S.spread = null; pickerFoot(); }
      }));
      act.appendChild(el('button.info', {
        text: '✕', title: '빼기', 'aria-label': '빼기',
        onclick: function () { K.delRow(g.id); renderIngList(); K.toast(g.ko + ' 뺐습니다'); }
      }));
    } else {
      act.appendChild(el('button.addb', {
        text: '＋ ' + pctText(g.typ) + '%',
        title: '권장량으로 담기 — 담은 뒤 양을 자유롭게 바꿀 수 있습니다',
        onclick: function () {
          K.addRow(g.id, g.typ);
          renderIngList();
          K.toast(g.ko + ' ' + pctText(g.typ) + '% — 담은 뒤 조절하세요');
        }
      }));
      act.appendChild(el('button.info', {
        text: 'ⓘ', title: '설명', 'aria-label': '설명',
        onclick: function () { showIng(g); }
      }));
    }

    body.appendChild(el('div.irow' + (row ? '.on' : ''), null, [
      el('div.bar', { style: 'background:' + ING.catColor(g.cat) }),
      el('div.txt', { onclick: function () { showIng(g); } }, [
        el('div.n1', { text: g.ko }),
        el('div.n2', { text: g.inci }),
        el('div.n3', { text: g.n })
      ]),
      act
    ]));
  });
  if (list.length > 300)
    body.appendChild(el('div.empty', { text: '…외 ' + (list.length - 300) + '종. 검색어를 좁혀 주세요.' }));
}

function showIng(g) {
  var kv = el('div.kv');
  function add(t) { kv.appendChild(el('span', { text: t })); }
  add(ING.catName(g.cat));
  add('보통 ' + g.typ + '% (' + g.min + '~' + g.max + '%)');
  add('투입 ' + (ING.PHASES[g.ph] || {}).ko);
  add('밀도 ' + g.d);
  add('굴절률 ' + g.ri.toFixed(3));
  if (g.hlb) add('HLB ' + g.hlb);
  if (g.rh) add('요구 HLB ' + g.rh);
  if (g.th) add('점증 K=' + K.n0(g.th[0]) + ' n=' + g.th[1]);
  if (g.lam) add('라멜라 ' + g.lam);
  if (g.tmax) add('투입 ' + g.tmax + '℃ 이하');
  if (g.el) add('전해질 ' + g.el);
  if (g.vol) add('휘발 ' + g.vol);
  if (g.ox) add('산화 민감 ' + g.ox);
  add(K.n0(g.pr) + ' 원/kg');

  var cur = S.rows.filter(function (r) { return r.id === g.id; })[0];
  var amtBox = el('div', { style: 'display:flex;align-items:center;gap:12px;justify-content:center;margin:6px 0 14px' });
  var start = cur ? cur.pct : g.typ;
  var stp = stepper(start, {
    kind: 'pct', unit: '%', min: 0, max: 100, cls: 'lg', fmt: pctText,
    onChange: function (v) { start = v; }
  });
  amtBox.appendChild(stp);

  var body = el('div', null, [
    el('div.rt', null, [
      el('p', { html: '<b>' + K.esc(g.inci) + '</b>' }),
      el('p', { text: g.n })
    ]),
    el('h3.sec', { text: '넣을 양' }),
    amtBox,
    el('div', { style: 'display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-bottom:6px' },
      [0.5, 1, 2, 4].map(function (m) {
        var v = +(g.typ * m).toFixed(3);
        return el('button.chip', { text: pctText(v) + '%', onclick: function () { start = v; stp.setValue(v); } });
      }).concat([
        el('button.chip', { text: '권장 상한 ' + g.max + '%', onclick: function () { start = g.max; stp.setValue(g.max); } })
      ])),
    el('div', { style: 'font-size:12.5px;color:var(--ink-3);text-align:center' },
      '권장 범위는 참고값입니다. 그 이상도 넣을 수 있고, 결과로 무슨 일이 생기는지 보여줍니다.'),
    el('h3.sec', { text: '물성' }),
    kv
  ]);

  var sh = K.sheet(g.ko, body, [
    cur ? el('button.btn', { text: '빼기', onclick: function () {
      K.delRow(g.id); sh.close(); renderIngList(); renderMid(); renderResult();
    } }) : null,
    el('button.btn.pri', { style: 'flex:1', text: cur ? '양 바꾸기' : '처방에 담기', onclick: function () {
      if (cur) cur.pct = start; else K.addRow(g.id, start);
      S.result = null;
      sh.close(); renderIngList(); renderMid(); renderResult();
      K.toast(g.ko + ' ' + pctText(start) + '%');
    } })
  ].filter(Boolean));
}

/* =====================================================================
   중간 패널
   ===================================================================== */
var MIDS = [{ k: 'form', ko: '처방' }, { k: 'proc', ko: '공정' }];

function renderMid() {
  var tabs = clear($('#midtabs'));
  MIDS.forEach(function (m) {
    tabs.appendChild(el('button', {
      text: m.ko, 'aria-selected': S.mid === m.k,
      onclick: function () { S.mid = m.k; S.view = m.k; renderMid(); syncNav(); }
    }));
  });
  $('#midTitle').textContent = (MIDS.filter(function (m) { return m.k === S.mid; })[0] || {}).ko || '';
  clear($('#midTools')); clear($('#midFoot'));
  var body = clear($('#midBody'));
  if (S.mid === 'proc') renderProcess(body); else renderFormula(body);
  renderStrip();
}

/* ── 진행 중인 과제 띠 ─────────────────────────────────────────── */
function renderStrip() {
  var n = $('#misStrip');
  if (!S.mission) { n.hidden = true; clear(n); return; }
  var m = S.mission;
  var done = S.progress[m.id];
  clear(n); n.hidden = false;
  n.appendChild(el('div.mi', { text: done ? '✓' : '✦' }));
  n.appendChild(el('div.mt', null, [
    el('b', { text: m.ko }),
    el('small', { text: TYPEKO[m.type] + ' · ' + PROD.get(m.ch).ko +
      (done ? ' · 통과 ' + done.grade : ' · 필수 ' + m.must.length + '개') })
  ]));
  n.appendChild(el('button', { text: '조건', onclick: function () { openMission(m); } }));
  n.appendChild(el('button', { text: '그만', onclick: function () {
    S.mission = null; renderAll(); persist(); K.toast('자유 모드로 돌아갔습니다');
  } }));
}

/* ── 처방 ──────────────────────────────────────────────────────── */
function renderFormula(body) {
  $('#midTools').appendChild(el('button.btn.sm', {
    text: '기준 처방', title: '이 제품군의 표준 처방을 불러온다',
    onclick: function () {
      if (S.rows.length > 1 && !confirm('현재 처방을 " ' + PROD.get(S.prod).ko + ' 기준 처방" 으로 바꿉니다.')) return;
      K.setRows(PROD.get(S.prod).base); S.mission = null;
      renderAll(); persist(); K.toast('기준 처방을 불러왔습니다');
    }
  }));

  var real = S.rows.filter(function (r) { return r.pct > 0; });
  if (!real.length) {
    body.appendChild(el('div.empty', { html:
      '처방이 비어 있습니다.<br><br>아래 <b>＋ 원료 추가</b> 로 시작하거나,<br>위 <b>기준 처방</b> 을 불러오세요.' }));
  }

  ['A', 'E', 'B', 'D', 'C'].forEach(function (ph) {
    var rows = S.rows.filter(function (r) { var g = ING.BY[r.id]; return g && g.ph === ph; });
    if (!rows.length) return;
    var info = ING.PHASES[ph];
    var sum = rows.reduce(function (a, b) { return a + (+b.pct || 0); }, 0);
    body.appendChild(el('div.phase-hd', null, [
      el('span.pdot', { style: 'background:' + info.c }),
      ph + '상 · ' + info.ko,
      el('span.amt', { text: sum.toFixed(2) + '%  ·  ' + K.mass(S.batchG * sum / 100) })
    ]));
    rows.forEach(function (r) {
      var g = ING.BY[r.id];
      var gv = el('div.gv', { text: K.mass(S.batchG * r.pct / 100) });
      var over = r.pct > g.max * 1.001;
      body.appendChild(el('div.frow', null, [
        el('div.nm', { onclick: function () { showIng(g); } }, [
          el('b', { text: g.ko }),
          over ? el('small', null, [el('span.over', { text: '권장 상한 ' + g.max + '% 초과' })])
               : el('small', { text: g.inci })
        ]),
        stepper(r.pct, {
          kind: 'pct', unit: '%', min: 0, max: 100, fmt: pctText,
          onChange: function (v) {
            r.pct = v; S.result = null; S.spread = null;
            gv.textContent = K.mass(S.batchG * v / 100);
            refreshTotal(); scheduleResult();
          }
        }),
        gv,
        el('button.del', { text: '✕', 'aria-label': '삭제', onclick: function () {
          K.delRow(r.id); renderMid(); renderResult();
        } })
      ]));
    });
  });

  /* 카보머 중화 도우미 */
  if (S.rows.some(function (r) { return (r.id === 'carb940' || r.id === 'pemulen') && r.pct > 0; })) {
    var wrap = el('div', { style: 'padding:12px' });
    wrap.appendChild(el('h3.sec', { text: '중화 계산기 — pH 6.3 목표' }));
    var line = el('div.kv');
    ['arginine', 'tromet', 'tea', 'naoh'].forEach(function (a) {
      var need = CHEM.neutralizerNeeded(S.rows, a, 6.3);
      line.appendChild(el('button.chip', {
        text: ING.BY[a].ko + ' ' + need.toFixed(3) + '%',
        onclick: function () {
          var ex = S.rows.filter(function (r) { return r.id === a; })[0];
          if (ex) ex.pct = need; else S.rows.push({ id: a, pct: need });
          S.result = null; renderMid(); renderResult();
          K.toast(ING.BY[a].ko + ' ' + need.toFixed(3) + '% 적용');
        }
      }));
    });
    wrap.appendChild(line);
    body.appendChild(wrap);
  }

  var f = $('#midFoot');
  f.appendChild(el('div', { style: 'display:flex;gap:8px' }, [
    el('button.btn.pri', { style: 'flex:1', text: '＋ 원료 추가', onclick: function () { openPicker(); } }),
    el('button.btn', { text: '물로 맞추기', title: '정제수로 합계를 100% 로', onclick: function () {
      if (!K.balance()) { K.toast('다른 원료 합이 이미 100% 를 넘습니다'); return; }
      renderMid(); renderResult();
    } })
  ]));
  f.appendChild(el('div', { id: 'totline', style: 'margin-top:8px' }));
  refreshTotal();
}

function refreshTotal() {
  var n = $('#totline'); if (!n) return;
  clear(n);
  var t = K.total();
  var ok = Math.abs(t - 100) < 0.02;
  n.appendChild(el('div', { style: 'display:flex;align-items:center;gap:9px;font-size:13.5px' }, [
    el('span', { style: 'color:var(--ink-3)', text: '합계' }),
    el('b', { class: 'num', style: 'font-size:17px', text: t.toFixed(2) + '%' }),
    el('span', { style: 'color:var(--ink-3);font-size:12.5px',
      text: '· ' + S.rows.length + '종 · ' + K.mass(S.batchG) }),
    el('span.badge.' + (ok ? 'ok' : 'bad'), {
      style: 'margin:0 0 0 auto;padding:3px 10px',
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
    text: '표준 공정', title: '처방에 맞는 표준 제조 순서를 다시 짠다',
    onclick: function () { S.steps = null; S.result = null; renderMid(); K.toast('표준 공정으로 되돌렸습니다'); }
  }));

  var st = K.steps();
  body.appendChild(el('div', { style: 'padding:12px;background:var(--panel-2);border-bottom:1px solid var(--line)' }, [
    el('div', { style: 'font-size:15px;font-weight:600', text: rig.icon + ' ' + rig.ko + ' · ' + K.mass(S.batchG) }),
    el('div', { style: 'font-size:13px;color:var(--ink-2);margin-top:4px', text: rig.n }),
    el('div.kv', { style: 'margin-top:8px' }, [
      el('span', { text: '호모 Ø' + (rig.dHomo * 1000) + 'mm / 최대 ' + K.n0(rig.maxHomo) + 'rpm' }),
      el('span', { text: '아지 Ø' + (rig.dAji * 1000) + 'mm' }),
      el('span', { text: rig.vacuum ? '진공 가능' : '개방 · 진공 없음' })
    ])
  ]));

  st.forEach(function (s, i) {
    var node = el('div.step');
    node.appendChild(el('div.step-hd', null, [
      el('div.no', { text: i + 1 }),
      el('div.ttl', { text: s.ko || PROC.STEPKO[s.t] })
    ]));

    var par = el('div.step-par');
    function add(lab, key, kind, unit, max) {
      par.appendChild(el('span.parlab', { text: lab }));
      par.appendChild(stepper(s[key], {
        kind: kind, unit: unit, min: 0, max: max, cls: 'sm',
        fmt: function (v) { return String(v); },
        onChange: function (v) {
          materialize()[i][key] = v; S.result = null; S.spread = null; renderResult();
        }
      }));
    }
    add('온도', 'temp', 'temp', '℃', 120);
    add('시간', 'min', 'min', '분', 300);
    if (s.aji > 0 || s.t !== 'weigh') add('아지', 'aji', 'rpm', 'rpm', rig.maxAji);
    if (['emulsify', 'homo', 'grind', 'neutralize'].indexOf(s.t) >= 0 || s.homo > 0)
      add('호모', 'homo', 'rpm', 'rpm', rig.maxHomo);
    par.appendChild(el('button.chip', {
      'aria-pressed': !!s.vac, text: s.vac ? '진공 ON' : '진공 OFF',
      onclick: function () {
        if (!rig.vacuum) { K.toast('이 설비에는 진공이 없습니다'); return; }
        materialize()[i].vac = !s.vac; S.result = null; renderMid(); renderResult();
      }
    }));
    node.appendChild(par);

    if (s.homo > 0) {
      var tip = PROC.tipSpeed(rig.dHomo, s.homo);
      node.appendChild(el('div.step-add', null, [
        el('span.tag', {
          style: tip > 18 ? 'background:var(--bad-soft);color:var(--bad)'
               : tip < 3  ? 'background:var(--warn-soft);color:var(--warn)' : '',
          text: '팁속도 ' + tip.toFixed(1) + ' m/s' })
      ]));
    }
    if (s.add && s.add.length) {
      var tags = el('div.step-add');
      s.add.forEach(function (id) {
        var g = ING.BY[id]; if (!g) return;
        var hot = g.tmax && s.temp > g.tmax;
        tags.appendChild(el('span.tag', {
          style: hot ? 'background:var(--bad-soft);color:var(--bad);font-weight:600' : '',
          text: g.ko + (hot ? ' ⚠' + g.tmax + '℃' : '')
        }));
      });
      node.appendChild(tags);
    }
    if (s.note) node.appendChild(el('div.step-note', { text: s.note }));
    body.appendChild(node);
  });

  $('#midFoot').appendChild(el('div', { style: 'display:flex;align-items:center;gap:9px;font-size:13.5px' }, [
    el('span', { style: 'color:var(--ink-3)', text: '스텝' }),
    el('b', { class: 'num', style: 'font-size:17px', text: String(st.length) }),
    el('span', { style: 'color:var(--ink-3);font-size:12.5px',
      text: '· 지시 시간 ' + Math.round(st.reduce(function (a, b) { return a + b.min; }, 0)) + '분' }),
    el('span.badge.info', { style: 'margin:0 0 0 auto;padding:3px 10px', text: S.steps ? '수정됨' : '표준' })
  ]));
}

/* =====================================================================
   결과
   ===================================================================== */
function jarSvg(hex, ntu, eta, fill) {
  var alpha = 0.16 + 0.84 * Math.min(1, Math.pow(Math.max(ntu, 0.5) / 700, 0.55));
  var lvl = 92 - Math.max(22, Math.min(74, (fill == null ? 74 : fill) * 0.72));
  var dome = Math.min(8, 1.4 + Math.log(Math.max(eta, 1)) / Math.LN10 * 1.4);
  var id = 'j' + Math.floor(Math.random() * 1e6);
  var d = document.createElement('div');
  d.innerHTML =
  '<svg width="82" height="98" viewBox="0 0 82 98" aria-hidden="true" style="flex:0 0 auto">' +
  '<defs><linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="0">' +
  '<stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".28" stop-color="#fff" stop-opacity=".32"/>' +
  '<stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".17"/>' +
  '</linearGradient>' +
  '<clipPath id="c' + id + '"><path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z"/></clipPath></defs>' +
  '<path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z" fill="var(--panel-3)"/>' +
  '<g clip-path="url(#c' + id + ')">' +
  '<rect x="13" y="' + lvl + '" width="56" height="98" fill="' + hex + '" opacity="' + alpha.toFixed(3) + '"/>' +
  '<ellipse cx="41" cy="' + lvl + '" rx="28" ry="' + dome.toFixed(1) + '" fill="' + hex + '" opacity="' + (alpha * 0.85).toFixed(3) + '"/>' +
  '<ellipse cx="41" cy="' + lvl + '" rx="28" ry="' + dome.toFixed(1) + '" fill="#fff" opacity=".2"/>' +
  '<rect x="13" y="0" width="56" height="98" fill="url(#g' + id + ')"/></g>' +
  '<path d="M13 9 h56 v66 a12 12 0 0 1 -12 12 h-32 a12 12 0 0 1 -12 -12 z" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>' +
  '<rect x="10" y="3" width="62" height="7" rx="3" fill="var(--panel-3)" stroke="var(--line-2)" stroke-width="1.3"/>' +
  '</svg>';
  return d.firstChild;
}

function gauge(v, lo, hi, log) {
  var f = log ? function (x) { return Math.log(Math.max(x, 0.4)); } : function (x) { return x; };
  var pad = (f(hi) - f(lo)) * 1.15 + 0.001;
  var a = f(lo) - pad, b = f(hi) + pad;
  var pc = function (x) { return Math.max(0, Math.min(100, (f(x) - a) / (b - a) * 100)); };
  return el('div.gauge', null, [
    el('div.band', { style: 'left:' + pc(lo) + '%;right:' + (100 - pc(hi)) + '%' }),
    el('div.mark', { style: 'left:calc(' + pc(v) + '% - 1.5px)' })
  ]);
}

function met(k, v, u, cls, extra, rangeText) {
  return el('div.met' + (cls ? '.' + cls : ''), null, [
    el('div.k', { text: k }),
    el('div.v', null, [String(v), u ? el('span.u', { text: u }) : null]),
    rangeText ? el('div.r', { text: rangeText }) : null,
    extra || null
  ]);
}

function acc(title, count, countCls, open, buildBody) {
  var d = el('details.acc', open ? { open: true } : null);
  var sum = el('summary', null, [title]);
  if (count != null) sum.appendChild(el('span.cnt' + (countCls ? '.' + countCls : ''), { text: String(count) }));
  d.appendChild(sum);
  var b = el('div.body');
  d.appendChild(b);
  var built = false;
  function fill() { if (built) return; built = true; buildBody(b); }
  if (open) fill(); else d.addEventListener('toggle', function () { if (d.open) fill(); });
  return d;
}

function noteNode(i) {
  return el('div.note.s' + (i.sev >= 14 ? 3 : i.sev >= 7 ? 2 : 1), null, [
    el('div.sv', { text: '−' + i.sev }),
    el('div', null, [el('b', { text: i.ko }), i.msg])
  ]);
}

function renderResult() {
  var body = clear($('#resBody'));
  $('#resSub').textContent = '';

  if (!S.rows.filter(function (r) { return r.pct > 0; }).length) {
    body.appendChild(el('div.empty', { html: '처방을 만들고 <b>제조</b> 를 누르세요.' }));
    return;
  }

  var run = S.result;
  var r = run ? run.res : CHEM.evaluate(S.rows, { tip: 6.3, sec: 300 });
  var p = PROD.get(S.prod);
  var judge = PROD.judge(S.prod, r);
  var wrap = el('div.res');
  $('#resSub').textContent = run ? '실측' : '미리보기';

  /* ── 한눈에 ── */
  var st = r.stability;
  var verdict = judge.ok
    ? (st.score >= 85 ? '규격 통과 · 안정' : st.score >= 62 ? '규격 통과 · 불안 요소 있음' : '규격은 맞지만 불안정')
    : '규격 미달';
  wrap.appendChild(el('div.hero', null, [
    jarSvg(r.color.hex, r.ntu, r.eta, run ? run.yieldPct : 74),
    el('div.info', null, [
      el('div.verdict', {
        style: 'color:' + (judge.ok && st.score >= 62 ? 'var(--ok)' : judge.ok ? 'var(--warn)' : 'var(--bad)'),
        text: verdict }),
      el('div.sub', { text: p.icon + ' ' + p.ko + ' · ' + r.turb.grade + ' · ' + r.color.hex }),
      el('div', null, [
        el('span.badge.' + (judge.ok ? 'ok' : 'bad'), { text: judge.ok ? '규격 ✓' : '규격 ✗' }),
        ' ',
        el('span.badge.info', { text: '안정도 ' + st.score + ' (' + st.grade + ')' })
      ])
    ])
  ]));

  /* ── 과제 채점 ── */
  if (S.mission && run) wrap.appendChild(missionCard(run));

  /* ── 핵심 수치 ── */
  var mets = el('div.mets');
  var sv = p.spec.visc, sp = p.spec.ph, sn = p.spec.ntu;
  mets.appendChild(met('점도', K.eng(r.eta), 'cP',
    sv ? (r.eta >= sv[0] && r.eta <= sv[1] ? 'ok' : 'bad') : '',
    sv ? gauge(r.eta, sv[0], sv[1], true) : null,
    sv ? K.n0(sv[0]) + ' ~ ' + K.n0(sv[1]) : null));
  mets.appendChild(met('pH', r.pH.toFixed(2), '',
    sp ? (r.pH >= sp[0] && r.pH <= sp[1] ? 'ok' : 'bad') : '',
    sp ? gauge(r.pH, sp[0], sp[1]) : null,
    sp ? sp[0].toFixed(1) + ' ~ ' + sp[1].toFixed(1) : null));
  mets.appendChild(met('탁도', K.eng(r.ntu), 'NTU',
    sn ? (r.ntu >= sn[0] && r.ntu <= sn[1] ? 'ok' : 'bad') : '',
    sn ? gauge(r.ntu, Math.max(sn[0], 0.5), Math.min(sn[1], 1e5), true) : null,
    sn ? (sn[1] >= 1e6 ? K.n0(sn[0]) + ' 이상' : K.n0(sn[1]) + ' 이하') : null));
  mets.appendChild(met('원가', K.won(r.cost), '원/kg'));
  if (run) {
    mets.appendChild(met('수율', run.yieldPct.toFixed(1), '%',
      run.yieldPct >= 95 ? 'ok' : run.yieldPct < 85 ? 'bad' : ''));
    mets.appendChild(met('제조 시간', Math.round(run.minutes), '분'));
  }
  wrap.appendChild(mets);

  /* ── 문제 ── */
  var probs = st.items.slice();
  if (run) run.warn.forEach(function (w) {
    if (!probs.some(function (x) { return x.ko === w.ko && x.msg === w.msg; })) probs.push(w);
  });
  probs.sort(function (a, b) { return b.sev - a.sev; });

  wrap.appendChild(acc(probs.length ? '무엇이 문제인가' : '문제 없음',
    probs.length, probs.length ? (probs[0].sev >= 14 ? 'bad' : '') : 'ok',
    probs.length > 0, function (b) {
      if (!probs.length) {
        b.appendChild(el('div.note.good', null, [el('div', null, [
          el('b', { text: '지적 사항 없음' }), '처방과 공정 모두 문제가 발견되지 않았습니다.'])]));
        return;
      }
      probs.forEach(function (i) { b.appendChild(noteNode(i)); });
    }));

  /* ── 규격 ── */
  if (judge.items.length) wrap.appendChild(acc('출하 규격', judge.items.filter(function (i) { return i.ok; }).length + '/' + judge.items.length,
    judge.ok ? 'ok' : 'bad', false, function (b) {
      judge.items.forEach(function (i) {
        b.appendChild(el('div.goal' + (i.ok ? '.hit' : ''), null, [
          el('div.bx', { text: '✓' }),
          el('div.gt', { text: i.ko + ' ' + (i.range[1] >= 1e6
            ? fnum(i.range[0], i.fmt) + ' 이상'
            : fnum(i.range[0], i.fmt) + ' ~ ' + fnum(i.range[1], i.fmt)) + (i.unit ? ' ' + i.unit : '') }),
          el('div.gv', { text: i.fmt ? i.val.toFixed(i.fmt) : K.n0(i.val) })
        ]));
      });
    }));

  /* ── 자세히 ── */
  wrap.appendChild(acc('점도와 유화 자세히', null, null, false, function (b) {
    var v = r.visc, kv = el('div.kv');
    if (v.gel > 1) kv.appendChild(el('span', { text: '점증제 겔 ' + K.eng(v.gel) + ' cP' }));
    if (v.lam > 1) kv.appendChild(el('span', { text: '라멜라 겔망 ' + K.eng(v.lam) + ' cP' }));
    if (v.surfV > 1) kv.appendChild(el('span', { text: '미셀 ' + K.eng(v.surfV) + ' cP' }));
    kv.appendChild(el('span', { text: '내상 효과 ×' + v.KD.toFixed(2) }));
    kv.appendChild(el('span', { text: '전단감점 n ' + r.nIdx.toFixed(2) }));
    if (v.yieldStress > 0.1) kv.appendChild(el('span', { text: '항복응력 ' + v.yieldStress.toFixed(1) + ' Pa' }));
    b.appendChild(kv);
    var d = r.drop;
    if (d && !d.minor) {
      b.appendChild(el('h3.sec', { text: '유화' }));
      b.appendChild(el('div.kv', null, [
        el('span', { text: '평균 액적 ' + r.d32.toFixed(2) + ' µm' }),
        el('span', { text: '오일 요구 HLB ' + d.rh.toFixed(1) }),
        el('span', { text: '유화제 HLB ' + d.bh.toFixed(1) }),
        el('span', { text: '계면장력 ' + d.sigma.toFixed(1) + ' mN/m' }),
        el('span', { text: '전단 한계 ' + d.dShear.toFixed(2) + ' µm' }),
        el('span', { text: '피복 한계 ' + (d.dCover > 100 ? '—' : d.dCover.toFixed(2) + ' µm') }),
        el('span', { text: '내상 ' + (r.agg.phi * 100).toFixed(1) + '%' }),
        el('span', { text: '굴절률 차 ' + r.agg.dn.toFixed(3) }),
        el('span', { text: '크리밍 ' + (r.cream ? r.cream.toFixed(2) + ' mm/일' : '정지') })
      ]));
    }
  }));

  if (run) {
    wrap.appendChild(acc('스케일이 만든 차이', null, null, false, function (b) {
      var t = el('table.rec');
      t.appendChild(el('thead', null, [el('tr', null, [
        el('th', { text: '항목' }), el('th', { text: '이론' }), el('th', { text: '실측' }), el('th', { text: '차이' })])]));
      var tb = el('tbody');
      function cr(ko, a, c, fmt) {
        var dv = a ? (c - a) / a * 100 : 0;
        tb.appendChild(el('tr', null, [
          el('td', { text: ko }), el('td', { text: fmt(a) }), el('td', { text: fmt(c) }),
          el('td', { class: Math.abs(dv) > 12 ? 'hi' : '', text: (dv >= 0 ? '+' : '') + dv.toFixed(1) + '%' })]));
      }
      cr('점도 cP', run.ideal.eta, run.res.eta, K.eng);
      cr('pH', run.ideal.pH, run.res.pH, function (x) { return x.toFixed(2); });
      cr('탁도 NTU', run.ideal.ntu, run.res.ntu, K.eng);
      t.appendChild(tb);
      b.appendChild(el('div.scroller', null, [t]));
      b.appendChild(el('h3.sec', { text: '이 배치의 조건' }));
      b.appendChild(el('div.kv', null,
        [['설비', run.rig.icon + ' ' + run.rig.ko],
         ['용기 지름', (run.geo.D * 100).toFixed(1) + ' cm'],
         ['표면적/부피', run.geo.svRatio.toFixed(1) + ' /m'],
         ['증발 손실', run.evapPct.toFixed(2) + '%'],
         ['벽면 잔류', K.mass(run.holdG)],
         ['최고 온도', run.maxT.toFixed(0) + '℃'],
         ['열이력', run.thermalDose.toFixed(0)],
         ['냉각 속도', run.coolRate.toFixed(2) + ' ℃/분'],
         ['라멜라 계수', '×' + run.coolFactor.toFixed(2)],
         ['혼합 균질도', run.homog.toFixed(0) + '%'],
         ['95% 혼합', (run.theta / 60).toFixed(1) + '분'],
         ['혼입 기포', run.airPct.toFixed(2) + '%']
        ].map(function (x) { return el('span', { text: x[0] + ' ' + x[1] }); })));
    }));

    wrap.appendChild(acc('공정 타임라인', Math.round(run.minutes) + '분', null, false, function (b) {
      var tmax = Math.max(run.minutes, 1), acc2 = 0;
      run.trace.forEach(function (t) {
        var w = t.min / tmax * 100, x = acc2 / tmax * 100; acc2 += t.min;
        var hot = Math.max(0, Math.min(1, (t.temp - 25) / 65));
        b.appendChild(el('div.tlrow', null, [
          el('div.tt', { text: t.min >= 1 ? Math.round(t.min) + '분' : '<1분' }),
          el('div.tlbar', null, [el('i', { style: 'left:' + x + '%;width:' + Math.max(w, 1.5) +
            '%;background:hsl(' + Math.round(210 - hot * 205) + ' 62% ' + (52 - hot * 6) + '%)' })]),
          el('div.tn', { text: t.ko })
        ]));
      });
      b.appendChild(el('div', { style: 'font-size:12px;color:var(--ink-3);margin-top:6px',
        text: '막대 색 = 그 스텝의 도달 온도 (파랑 25℃ → 빨강 90℃)' }));
    }));

    wrap.appendChild(acc('칭량 기록', run.items.length + '종', null, false, function (b) {
      var t = el('table.rec');
      t.appendChild(el('thead', null, [el('tr', null, [
        el('th', { text: '원료' }), el('th', { text: '%' }), el('th', { text: '목표' }),
        el('th', { text: '실제' }), el('th', { text: '오차' }), el('th', { text: '저울' })])]));
      var tb = el('tbody');
      run.items.slice().sort(function (a, c) { return Math.abs(c.rel) - Math.abs(a.rel); }).forEach(function (i) {
        tb.appendChild(el('tr', null, [
          el('td', { text: i.g.ko }), el('td', { text: i.pct.toFixed(3) }),
          el('td', { text: K.mass(i.target) }), el('td', { text: K.mass(i.actual) }),
          el('td', { class: Math.abs(i.rel) > 0.05 ? 'hi' : '', text: (i.rel * 100).toFixed(2) + '%' }),
          el('td', { text: i.scale.d + ' g' })]));
      });
      t.appendChild(tb);
      b.appendChild(el('div.scroller', null, [t]));
    }));
  }

  if (S.spread) {
    var sp2 = S.spread;
    wrap.appendChild(acc('배치 간 편차 (5배치)', null, null, true, function (b) {
      var t = el('table.rec');
      t.appendChild(el('thead', null, [el('tr', null, [
        el('th', { text: '항목' }), el('th', { text: '평균' }), el('th', { text: '최소' }),
        el('th', { text: '최대' }), el('th', { text: 'CV' })])]));
      var tb = el('tbody');
      function sr(ko, s2, f) {
        tb.appendChild(el('tr', null, [
          el('td', { text: ko }), el('td', { text: f(s2.mean) }), el('td', { text: f(s2.min) }),
          el('td', { text: f(s2.max) }), el('td', { class: s2.cv > 5 ? 'hi' : '', text: s2.cv.toFixed(2) + '%' })]));
      }
      sr('점도 cP', sp2.eta, K.eng);
      sr('pH', sp2.pH, function (x) { return x.toFixed(2); });
      sr('탁도 NTU', sp2.ntu, K.eng);
      sr('수율 %', sp2.yieldPct, function (x) { return x.toFixed(1); });
      if (sp2.d32.mean > 0) sr('액적 µm', sp2.d32, function (x) { return x.toFixed(2); });
      t.appendChild(tb);
      b.appendChild(el('div.scroller', null, [t]));
    }));
  }

  body.appendChild(wrap);
}

function fnum(v, d) { return d ? v.toFixed(d) : K.n0(v); }

/* 드래그 중에는 프레임당 한 번만 다시 계산한다 */
var resPend = 0;
function scheduleResult() {
  if (resPend) return;
  resPend = requestAnimationFrame(function () { resPend = 0; renderResult(); });
}

/* =====================================================================
   학습
   ===================================================================== */
var TYPEKO = { build: '설계', fix: '고장 수리', process: '공정 개선', scale: '스케일업' };
function gradeColor(g) {
  return g === 'S' ? 'var(--acc)' : g === 'A' ? 'var(--ok)' : g === 'B' ? 'var(--info)' : 'var(--warn)';
}

function openLearn() {
  $('#learn').hidden = false;
  renderLearn();
}
function closeLearn() {
  $('#learn').hidden = true;
  syncNav();
}

function renderLearn() {
  var body = clear($('#learnBody'));
  var tot = MISS.LIST.length;
  var done = MISS.LIST.filter(function (m) { return S.progress[m.id]; }).length;
  $('#learnProg').textContent = done + ' / ' + tot;

  body.appendChild(el('div', { style: 'padding:12px;background:var(--panel-2);border-bottom:1px solid var(--line)' }, [
    el('div', { style: 'font-size:15px;font-weight:600', text: '17개 제품군 · ' + tot + '개 과제' }),
    el('div', { style: 'font-size:13.5px;color:var(--ink-2);margin-top:4px',
      text: '과제를 고르면 시작 처방과 조건이 세팅됩니다. 제조할 때마다 채점되고, 필수 조건을 다 채우면 통과입니다.' })
  ]));

  MISS.CHAPTERS.forEach(function (ch, ci) {
    var d = ch.list.filter(function (m) { return S.progress[m.id]; }).length;
    var open = S.openCh === ch.key;
    var sec = el('div.chapter');
    sec.appendChild(el('button.ch-hd', {
      onclick: function () { S.openCh = open ? null : ch.key; renderLearn(); }
    }, [
      el('div.ic', { text: ch.icon }),
      el('div.t', null, [
        el('b', { text: (ci + 1) + '. ' + ch.ko }),
        el('small', { text: ch.tag }),
        el('div.prog', null, [el('i', { style: 'width:' + (ch.list.length ? d / ch.list.length * 100 : 0) + '%' })])
      ]),
      el('div.pg', { text: d + '/' + ch.list.length })
    ]));
    if (open) {
      sec.appendChild(el('div', { style: 'padding:12px;background:var(--panel-2);border-top:1px solid var(--line)' }, [
        el('div', { style: 'font-size:13.5px;color:var(--ink-2);line-height:1.7', text: ch.n }),
        el('div.kv', { style: 'margin-top:8px' }, ch.key3.map(function (t) {
          return el('span', { style: 'font-family:var(--sans)', text: '· ' + t }); }))
      ]));
      ch.list.forEach(function (m) {
        var pr = S.progress[m.id];
        sec.appendChild(el('button.mrow', { onclick: function () { openMission(m); } }, [
          el('div.st' + (pr ? '.done' : ''), { text: pr ? '✓' : String(m.no) }),
          el('div.tx', null, [
            el('b', { text: m.ko }),
            el('small', { text: TYPEKO[m.type] + ' · 필수 ' + m.must.length + '개' +
              (m.batchG ? ' · ' + K.mass(m.batchG) : '') })
          ]),
          el('div.gr', { style: 'color:' + (pr ? gradeColor(pr.grade) : 'var(--ink-3)'), text: pr ? pr.grade : '' })
        ]));
      });
    }
    body.appendChild(sec);
  });
}

function openMission(m) {
  var goals = el('div');
  goals.appendChild(el('h3.sec', { text: '필수 조건' }));
  m.must.forEach(function (c) {
    goals.appendChild(el('div.goal', null, [el('div.bx', { text: '✓' }), el('div.gt', { text: MISS.label(c, m.ch) })]));
  });
  if (m.bonus.length) {
    goals.appendChild(el('h3.sec', { text: '추가 조건 — 만점용' }));
    m.bonus.forEach(function (c) {
      goals.appendChild(el('div.goal.opt', null, [el('div.bx', { text: '✓' }), el('div.gt', { text: MISS.label(c, m.ch) })]));
    });
  }
  var sh = K.sheet(m.ko, el('div', null, [
    el('div.rt', null, [
      el('p', { html: '<b>' + TYPEKO[m.type] + '</b> · ' + PROD.get(m.ch).ko +
        (m.batchG ? ' · 배치 ' + K.mass(m.batchG) : '') }),
      el('p', { text: m.brief }),
      m.hint ? el('p', { style: 'color:var(--ink-3);font-size:13.5px', text: '힌트 — ' + m.hint }) : null
    ]),
    goals
  ]), [
    el('button.btn', { text: '닫기', onclick: function () { sh.close(); } }),
    el('button.btn.pri', { style: 'flex:1', text: '이 과제 시작', onclick: function () { startMission(m); sh.close(); } })
  ]);
}

function startMission(m) {
  S.mission = m;
  S.prod = m.ch;
  K.setRows(MISS.startRows(m));
  if (m.batchG) S.batchG = m.batchG;
  S.rigKey = m.rigKey || null;
  S.steps = null; S.result = null; S.spread = null;
  if (m.pm && m.pm.length) {
    var st = materialize();
    m.pm.forEach(function (mu) {
      st.forEach(function (x, i) {
        if (mu.t ? x.t === mu.t : i === mu.i) for (var k in mu.set) x[k] = mu.set[k];
      });
    });
  }
  S.mid = 'form'; S.view = 'form';
  closeLearn();
  syncTop(); renderAll(); go('form');
  K.toast('과제 시작 — ' + m.ko);
}

function missionCard(run) {
  var m = S.mission;
  var g = MISS.grade(m, run, S);
  var box = el('div', { style: 'margin-bottom:12px' });
  box.appendChild(el('div.note.' + (g.ok ? 'good' : 's2'), { style: 'margin-bottom:8px' }, [
    el('div', null, [
      el('b', { text: (g.ok ? '통과 · ' + g.grade + ' 등급 ' + g.score + '점' : '아직 미달') + '  —  ' + m.ko }),
      g.ok ? ('추가 조건 ' + g.bHit + '/' + m.bonus.length + ' 달성.')
           : ('필수 ' + g.must.filter(function (x) { return x.ok; }).length + '/' + g.must.length + ' 충족.')
    ])
  ]));
  var det = acc('과제 조건', g.must.filter(function (x) { return x.ok; }).length + '/' + g.must.length,
    g.ok ? 'ok' : 'bad', !g.ok, function (b) {
      g.must.forEach(function (x) {
        b.appendChild(el('div.goal' + (x.ok ? '.hit' : ''), null, [
          el('div.bx', { text: '✓' }), el('div.gt', { text: x.t }), el('div.gv', { text: x.v })]));
      });
      if (g.bonus.length) {
        b.appendChild(el('h3.sec', { text: '추가 조건' }));
        g.bonus.forEach(function (x) {
          b.appendChild(el('div.goal.opt' + (x.ok ? '.hit' : ''), null, [
            el('div.bx', { text: '✓' }), el('div.gt', { text: x.t }), el('div.gv', { text: x.v })]));
        });
      }
      b.appendChild(el('div', { style: 'display:flex;gap:7px;margin-top:12px;flex-wrap:wrap' }, [
        el('button.btn.sm', { text: '설명 다시 보기', onclick: function () { openMission(m); } }),
        el('button.btn.sm', { text: '과제 그만두기', onclick: function () {
          S.mission = null; renderAll(); K.toast('자유 모드로 돌아갔습니다'); } })
      ]));
    });
  det.style.marginTop = '0';
  box.appendChild(det);
  if (g.ok) {
    var prev = S.progress[m.id];
    if (!prev || prev.score < g.score) { S.progress[m.id] = { score: g.score, grade: g.grade }; persist(); }
  }
  return box;
}

/* =====================================================================
   실행 · 내비게이션
   ===================================================================== */
function runBatch(spread) {
  if (!S.rows.filter(function (r) { return r.pct > 0; }).length) { K.toast('처방이 비어 있습니다'); return; }
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
  renderResult(); persist();
  var shown = false;
  if (!spread && G.BREW && G.BREW.enabled())
    shown = G.BREW.show(S.result, function () { go('res'); renderResult(); renderStrip(); });
  if (!shown) { go('res'); renderResult(); }
}

function syncNav() {
  K.$$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.go === S.view); });
}

function go(v) {
  if (v === 'learn') { openLearn(); return; }
  S.view = v;
  if (v === 'form' || v === 'proc') S.mid = v;
  var map = { form: 'p-mid', proc: 'p-mid', res: 'p-res' };
  K.$$('.pane').forEach(function (n) { n.classList.toggle('active', n.id === map[v]); });
  syncNav();
  renderMid();
}

function syncTop() {
  $('#selProd').value = S.prod;
  $('#btnBatch').textContent = K.mass(S.batchG);
}

function renderAll() { syncTop(); renderMid(); renderResult(); renderStrip(); }

function persist() {
  K.save({
    prod: S.prod, rows: S.rows, batchG: S.batchG, rigKey: S.rigKey,
    steps: S.steps, progress: S.progress, mission: S.mission ? S.mission.id : null
  });
}

G.UI = {
  renderAll: renderAll, renderMid: renderMid, renderResult: renderResult,
  renderIngList: renderIngList, renderCats: renderCats,
  openPicker: openPicker, closePicker: closePicker,
  openLearn: openLearn, closeLearn: closeLearn, renderLearn: renderLearn,
  renderStrip: renderStrip,
  go: go, run: runBatch, syncTop: syncTop, persist: persist,
  showIng: showIng, openMission: openMission, startMission: startMission,
  materialize: materialize, stepper: stepper, pctText: pctText,
  gradeColor: gradeColor, TYPEKO: TYPEKO
};
})(window);
