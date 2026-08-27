/* =====================================================================
   포뮬라랩 — 배선
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, S = K.S, el = K.el, $ = K.$;
var ING = G.ING, PROD = G.PROD, PROC = G.PROC, MISS = G.MISS, UI = G.UI;

function fillProducts() {
  var s = K.clear($('#selProd'));
  PROD.LIST.forEach(function (p) {
    s.appendChild(el('option', { value: p.key, text: p.icon + ' ' + p.ko }));
  });
  s.value = S.prod;
}

/* ── 배치 규모 ─────────────────────────────────────────────────── */
var PRESETS = [
  { g: 100,     ko: '100 g',  n: '실험실 비커 — 손으로 만드는 크기' },
  { g: 1000,    ko: '1 kg',   n: '비커 · 랩 시제품' },
  { g: 20000,   ko: '20 kg',  n: '소형 진공 유화기' },
  { g: 200000,  ko: '200 kg', n: '파일럿 유화기' },
  { g: 1000000, ko: '1 t',    n: '생산 진공 유화기' }
];

function openBatch() {
  var body = el('div');
  var wrap = el('div', { style: 'display:flex;justify-content:center;margin:4px 0 16px' });
  var kg = S.batchG >= 1000;
  var val = kg ? +(S.batchG / 1000).toFixed(3) : S.batchG;
  var stp;

  function rebuild() {
    K.clear(wrap);
    stp = UI.stepper(val, {
      kind: 'g', unit: kg ? 'kg' : 'g', min: kg ? 0.02 : 20, max: kg ? 3000 : 3000, cls: 'lg',
      fmt: function (v) { return v >= 100 ? K.n0(v) : String(v); },
      onChange: function (v) { val = v; apply(); }
    });
    wrap.appendChild(stp);
  }
  function apply() {
    S.batchG = Math.max(20, kg ? val * 1000 : val);
    S.result = null; S.spread = null;
    UI.syncTop(); UI.renderMid(); UI.renderResult(); UI.persist();
    info.textContent = K.rig().icon + ' ' + K.rig().ko + ' — ' + K.rig().n;
  }
  rebuild();

  var unit = el('div.seg', { style: 'margin:0 auto 14px;width:fit-content' }, [
    el('button', { text: 'g', 'aria-selected': !kg, onclick: function () {
      if (!kg) return; kg = false; val = Math.round(S.batchG); unit.children[0].setAttribute('aria-selected', true);
      unit.children[1].setAttribute('aria-selected', false); rebuild(); apply();
    } }),
    el('button', { text: 'kg', 'aria-selected': kg, onclick: function () {
      if (kg) return; kg = true; val = +(S.batchG / 1000).toFixed(3); unit.children[0].setAttribute('aria-selected', false);
      unit.children[1].setAttribute('aria-selected', true); rebuild(); apply();
    } })
  ]);

  var info = el('div', { style: 'font-size:13px;color:var(--ink-2);text-align:center;margin-bottom:14px',
    text: K.rig().icon + ' ' + K.rig().ko + ' — ' + K.rig().n });

  var chips = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center' },
    PRESETS.map(function (p) {
      return el('button.chip', { text: p.ko, title: p.n, onclick: function () {
        S.batchG = p.g; kg = p.g >= 1000; val = kg ? p.g / 1000 : p.g;
        unit.children[0].setAttribute('aria-selected', !kg);
        unit.children[1].setAttribute('aria-selected', kg);
        rebuild(); apply();
      } });
    }));

  var rigSel = el('select', { style: 'width:100%', onchange: function () {
    S.rigKey = rigSel.value || null; S.steps = null; S.result = null;
    UI.renderMid(); UI.renderResult(); UI.persist();
    info.textContent = K.rig().icon + ' ' + K.rig().ko + ' — ' + K.rig().n;
  } }, [el('option', { value: '', text: '배치 규모에 맞춰 자동' })].concat(
    PROC.RIGS.map(function (r) {
      return el('option', { value: r.key, text: r.icon + ' ' + r.ko }); })));
  rigSel.value = S.rigKey || '';

  body.appendChild(wrap);
  body.appendChild(unit);
  body.appendChild(info);
  body.appendChild(chips);
  body.appendChild(el('h3.sec', { text: '설비' }));
  body.appendChild(rigSel);
  body.appendChild(el('div', { style: 'font-size:12.5px;color:var(--ink-3);margin-top:8px;line-height:1.7',
    text: '같은 처방도 배치 규모에 따라 다른 물건이 나옵니다. 100 g 과 1 t 로 각각 제조해 결과를 비교해 보세요.' }));

  var sh = K.sheet('배치 규모', body, [
    el('button.btn.pri.wide', { text: '확인', onclick: function () { sh.close(); } })
  ]);
}

/* ── 메뉴 ──────────────────────────────────────────────────────── */
function openMenu() {
  var code = K.pack(S);
  var codeIn = el('input', { type: 'text', value: location.origin + location.pathname + '#' + code,
    onclick: function () { codeIn.select(); } });

  var body = el('div', null, [
    el('h3.sec', { text: '공유 · 저장' }),
    codeIn,
    el('div', { style: 'display:flex;gap:8px;margin-top:9px;flex-wrap:wrap' }, [
      el('button.btn.sm', { text: '링크 복사', onclick: function () {
        codeIn.select();
        try { navigator.clipboard ? navigator.clipboard.writeText(codeIn.value) : document.execCommand('copy'); } catch (e) {}
        K.toast('링크를 복사했습니다');
      } }),
      el('button.btn.sm', { text: 'JSON 내려받기', onclick: dumpJson }),
      el('button.btn.sm', { text: 'JSON 불러오기', onclick: loadJson })
    ]),

    el('h3.sec', { text: '제조 연출' }),
    el('div', { style: 'display:flex;align-items:center;gap:10px' }, [
      el('button.btn.sm', { text: G.BREW.enabled() ? '연출 켜짐 — 끄기' : '연출 꺼짐 — 켜기',
        onclick: function (e) {
          G.BREW.setEnabled(!G.BREW.enabled());
          e.target.textContent = G.BREW.enabled() ? '연출 켜짐 — 끄기' : '연출 꺼짐 — 켜기';
          K.toast(G.BREW.enabled() ? '제조 과정을 보여줍니다' : '결과만 바로 보여줍니다');
        } }),
      el('span', { style: 'font-size:12.5px;color:var(--ink-3)', text: '제조 중 탱크 안을 보여줄지' })
    ]),

    el('h3.sec', { text: '화면' }),
    el('div.seg', { style: 'width:fit-content' }, [
      el('button', { text: '밝게', onclick: function () { theme('light'); } }),
      el('button', { text: '어둡게', onclick: function () { theme('dark'); } }),
      el('button', { text: '시스템', onclick: function () { theme(''); } })
    ]),

    el('h3.sec', { text: '도움말' }),
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      el('button.btn.sm', { text: '사용 설명', onclick: help }),
      el('button.btn.sm', { text: '용어집', onclick: function () { UI.openGloss(''); } }),
      el('button.btn.sm', { text: '계산 근거', onclick: about })
    ]),

    el('h3.sec', { text: '초기화' }),
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      el('button.btn.sm', { text: '처방 비우기', onclick: function () {
        if (!confirm('현재 처방을 비웁니다.')) return;
        K.setRows([{ id: 'aqua', pct: 100 }]); S.mission = null;
        UI.renderAll(); UI.persist(); K.toast('비웠습니다');
      } }),
      el('button.btn.sm', { text: '학습 진행 초기화', onclick: function () {
        if (!confirm('학습 진행 상황을 모두 지웁니다.')) return;
        S.progress = {}; UI.persist(); UI.renderMid(); K.toast('초기화했습니다');
      } })
    ])
  ]);
  K.sheet('설정', body);
}

function theme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('formulab.theme', t); } catch (e) {}
}

function dumpJson() {
  var o = { v: 1, prod: S.prod, batchG: S.batchG, rigKey: S.rigKey, rows: S.rows, steps: S.steps };
  var blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'formulab-' + S.prod + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
}

function loadJson() {
  var inp = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
  document.body.appendChild(inp);
  inp.addEventListener('change', function () {
    var f = inp.files[0]; if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var o = JSON.parse(fr.result);
        if (o.prod) S.prod = o.prod;
        if (o.batchG) S.batchG = o.batchG;
        S.rigKey = o.rigKey || null;
        K.setRows(o.rows || []);
        S.steps = o.steps || null;
        UI.renderAll(); UI.persist(); K.toast('불러왔습니다');
      } catch (e) { K.toast('파일을 읽지 못했습니다'); }
      inp.remove();
    };
    fr.readAsText(f);
  });
  inp.click();
}

function help() {
  K.sheet('사용 설명', el('div.rt', null, [
    el('p', { html: '<b>1. 제품군을 고른다.</b> 스킨 · 로션 · 크림 · 샴푸 · 린스 · 선크림 · 립밤 등 17가지. ' +
      '제품군마다 출하 규격(점도 · pH · 탁도)과 표준 공정이 다르다.' }),
    el('p', { html: '<b>2. 처방을 짠다.</b> <code>＋ 원료 추가</code> 로 원료를 담고, 옆의 <b>− 숫자 +</b> 로 양을 조절한다. ' +
      '숫자는 <b>휠을 굴리거나 위아래로 끌어도</b> 되고, 눌러서 직접 입력해도 된다.' }),
    el('p', { html: '표시된 권장량은 <b>상한이 아니라 출발점</b>이다. 1.5% 라고 적혀 있어도 3% 든 10% 든 넣을 수 있고, ' +
      '그 결과로 무슨 일이 생기는지 결과 화면이 알려준다.' }),
    el('p', { html: '<b>3. 공정을 확인한다.</b> 처방을 읽어 표준 제조 순서가 자동으로 짜인다. ' +
      '온도 · 교반 · 시간 · 진공을 직접 바꿀 수 있다.' }),
    el('p', { html: '<b>4. 제조한다.</b> 배치 규모를 정하고 <code>제조</code>. ' +
      '칭량 오차, 증발, 벽면 잔류, 열이력, 전단, 혼합 불균일까지 계산해 실제로 나올 물건을 보여준다.' }),
    el('p', { html: '<b>같은 처방도 배치 규모에 따라 다른 물건이 나온다.</b> ' +
      '100 g 과 1 t 으로 각각 제조해 비교해 보라. 이유는 결과 화면의 ' +
      '<b>스케일이 만든 차이</b> 에 전부 적혀 있다.' }),
    el('p', { html: '<b>학습</b> 탭에는 제품군 × 6과제, 모두 ' + MISS.count + '개의 과제가 있다.' }),
    el('p', { style: 'color:var(--ink-3)', html: '단축키 — <code>Ctrl+Enter</code> 제조 · <code>/</code> 원료 검색' })
  ]));
}

function about() {
  K.sheet('계산 근거', el('div.rt', null, [
    el('p', { html: '실제 제형 이론을 축약한 모델이다. 절대값은 근사지만, ' +
      '<b>무엇을 바꾸면 어느 쪽으로 얼마나 움직이는가</b> 는 실제와 같다.' }),
    el('p', { html: '<b>점도</b> — 점증제 겔(η = K·c<sup>n</sup>, pH · 전해질 · 알코올 보정), ' +
      '라멜라 겔망(지방알코올 × 유화제), 계면활성제 미셀(솔트 커브), ' +
      '내상 부피분율(Krieger–Dougherty)을 합산한다.' }),
    el('p', { html: '<b>pH</b> — 산 · 염기 당량을 세어 Henderson–Hasselbalch 로 적정한다. ' +
      '카보머는 폴리전해질 지수 n≈2, 지방산은 비누화 후 겉보기 pKa 8.3 을 쓴다.' }),
    el('p', { html: '<b>액적 크기</b> — 전단 한계(σ<sup>0.6</sup> × 팁속도<sup>−1.2</sup>)와 ' +
      '유화제 피복 한계(Γ·6φ/d) 중 큰 값. 가용화제가 오일보다 충분히 많으면 자발적으로 미셀이 생긴다.' }),
    el('p', { html: '<b>탁도</b> — 액적의 Mie 산란(부피분율 × 굴절률 차<sup>2</sup> × 크기 함수), ' +
      '무기 입자, 석출 결정, 혼입 기포의 합.' }),
    el('p', { html: '<b>색상</b> — 원료 고유색을 색력으로 가중 평균한 뒤 산란 백색과 열이력 갈변을 더해 ' +
      'CIE L*a*b* 로 계산하고 sRGB 로 변환한다.' }),
    el('p', { html: '<b>스케일</b> — 액체를 H=D 원통으로 보고 지름 D ∝ V<sup>1/3</sup>. ' +
      '증발과 벽면 잔류는 표면적/부피(∝ V<sup>−1/3</sup>)에, 냉각 시간은 V<sup>1/3</sup> 에 비례한다. ' +
      '저울은 목표 중량을 담을 수 있는 가장 정밀한 것이 자동 선택된다.' }),
    el('p', { style: 'color:var(--ink-3)',
      text: '교육 · 설계 검토용 도구다. 실제 제조 · 안전성 · 인허가 판단의 근거로 삼지 말 것.' })
  ]));
}

/* ── 초기화 ────────────────────────────────────────────────────── */
function boot() {
  try {
    var t = localStorage.getItem('formulab.theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}

  fillProducts();

  var saved = K.load();
  if (saved.progress) S.progress = saved.progress;

  var fromHash = K.unpack((location.hash || '').replace(/^#/, ''));
  if (fromHash && fromHash.rows && fromHash.rows.length) {
    S.prod = fromHash.prod || S.prod;
    S.batchG = fromHash.batchG || S.batchG;
    K.setRows(fromHash.rows);
    S.steps = fromHash.steps;
    K.toast('공유된 처방을 불러왔습니다');
  } else if (saved.rows && saved.rows.length) {
    S.prod = saved.prod || S.prod;
    S.batchG = saved.batchG || S.batchG;
    S.rigKey = saved.rigKey || null;
    K.setRows(saved.rows);
    S.steps = saved.steps || null;
    if (saved.mission && MISS.ALL[saved.mission]) S.mission = MISS.ALL[saved.mission];
  } else {
    K.setRows(PROD.get(S.prod).base);
  }

  $('#selProd').addEventListener('change', function () {
    S.prod = $('#selProd').value;
    S.mission = null; S.result = null; S.spread = null; S.steps = null;
    UI.renderMid(); UI.renderResult(); UI.persist();
    K.toast(PROD.get(S.prod).ko + ' 규격으로 전환');
  });
  $('#btnBatch').addEventListener('click', openBatch);
  $('#btnRun').addEventListener('click', function () { UI.run(false); });
  $('#btnRepeat').addEventListener('click', function () { UI.run(true); });
  $('#btnMenu').addEventListener('click', openMenu);

  var q = $('#q');
  q.addEventListener('input', function () { S.q = q.value; UI.renderIngList(); });
  $('#qClear').addEventListener('click', function () { S.q = ''; q.value = ''; q.focus(); UI.renderIngList(); });
  $('#pickDone').addEventListener('click', UI.closePicker);
  $('#btnLearn').addEventListener('click', UI.openLearn);
  $('#learnDone').addEventListener('click', UI.closeLearn);
  $('#visDone').addEventListener('click', function () { G.VIS.close(); });
  $('#vis').addEventListener('click', function (e) { if (e.target.id === 'vis') G.VIS.close(); });
  $('#learn').addEventListener('click', function (e) { if (e.target.id === 'learn') UI.closeLearn(); });
  $('#picker').addEventListener('click', function (e) { if (e.target.id === 'picker') UI.closePicker(); });

  K.$$('#nav button').forEach(function (b) {
    b.addEventListener('click', function () { UI.go(b.dataset.go); });
  });

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); UI.run(false); }
    if (e.key === 'Escape' && !$('#picker').hidden) { e.preventDefault(); UI.closePicker(); }
    else if (e.key === 'Escape' && !$('#learn').hidden) { e.preventDefault(); UI.closeLearn(); }
    else if (e.key === 'Escape' && !$('#vis').hidden) { e.preventDefault(); G.VIS.close(); }
    if (e.key === '/' && !typing) { e.preventDefault(); UI.openPicker(); }
  });

  window.addEventListener('beforeunload', function () {
    try { history.replaceState(null, '', '#' + K.pack(S)); } catch (e) {}
  });

  UI.go('form');
  UI.renderAll();
}

G.APP = { boot: boot, help: help, about: about, openMenu: openMenu, openBatch: openBatch, theme: theme };
})(window);
