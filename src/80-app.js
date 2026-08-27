/* =====================================================================
   포뮬라랩 — 배선
   ===================================================================== */
(function (G) {
'use strict';

var K = G.CORE, S = K.S, el = K.el, $ = K.$;
var ING = G.ING, PROD = G.PROD, PROC = G.PROC, MISS = G.MISS, UI = G.UI;

/* ── 상단 ──────────────────────────────────────────────────────── */
function fillProducts() {
  var s = K.clear($('#selProd'));
  PROD.LIST.forEach(function (p) {
    s.appendChild(el('option', { value: p.key, text: p.icon + ' ' + p.ko }));
  });
  s.value = S.prod;
}

function readBatch() {
  var v = parseFloat($('#inBatch').value) || 0;
  var u = parseFloat($('#selUnit').value) || 1;
  S.batchG = Math.max(10, v * u);
  S.result = null; S.spread = null;
  UI.renderMid(); UI.renderResult(); UI.persist();
}

/* ── 메뉴 ──────────────────────────────────────────────────────── */
function openMenu() {
  var rigSel = el('select', { onchange: function () {
    S.rigKey = rigSel.value || null; S.steps = null; S.result = null;
    UI.renderMid(); UI.renderResult(); UI.persist();
  } }, [el('option', { value: '', text: '배치 규모에 맞춰 자동' })].concat(
    PROC.RIGS.map(function (r) {
      return el('option', { value: r.key, text: r.icon + ' ' + r.ko + ' (' + K.mass(r.range[0]) + '~' + K.mass(r.range[1]) + ')' });
    })));
  rigSel.value = S.rigKey || '';

  var code = K.pack(S);
  var codeIn = el('input', { type: 'text', value: location.origin + location.pathname + '#' + code,
    style: 'width:100%', onclick: function () { codeIn.select(); } });

  var body = el('div', null, [
    el('h3.sec', { text: '설비' }),
    rigSel,
    el('div', { style: 'font-size:12px;color:var(--ink-3);margin-top:6px', text: K.rig().n }),

    el('h3.sec', { text: '공유 · 저장' }),
    codeIn,
    el('div', { style: 'display:flex;gap:6px;margin-top:7px;flex-wrap:wrap' }, [
      el('button.btn.sm', { text: '링크 복사', onclick: function () {
        codeIn.select();
        try { navigator.clipboard ? navigator.clipboard.writeText(codeIn.value) : document.execCommand('copy'); } catch (e) {}
        K.toast('링크를 복사했습니다');
      } }),
      el('button.btn.sm', { text: 'JSON 내려받기', onclick: dumpJson }),
      el('button.btn.sm', { text: 'JSON 불러오기', onclick: loadJson })
    ]),

    el('h3.sec', { text: '화면' }),
    el('div', { style: 'display:flex;gap:6px' }, [
      el('button.btn.sm', { text: '밝게', onclick: function () { theme('light'); } }),
      el('button.btn.sm', { text: '어둡게', onclick: function () { theme('dark'); } }),
      el('button.btn.sm', { text: '시스템', onclick: function () { theme(''); } })
    ]),

    el('h3.sec', { text: '기타' }),
    el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
      el('button.btn.sm', { text: '사용 설명', onclick: function () { help(); } }),
      el('button.btn.sm', { text: '계산 근거', onclick: function () { about(); } }),
      el('button.btn.sm', { text: '처방 비우기', onclick: function () {
        if (!confirm('현재 처방을 비웁니다.')) return;
        K.setRows([{ id: 'aqua', pct: 100 }]); UI.renderAll(); UI.persist();
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
        UI.syncTop(); UI.renderAll(); UI.persist();
        K.toast('불러왔습니다');
      } catch (e) { K.toast('파일을 읽지 못했습니다'); }
      inp.remove();
    };
    fr.readAsText(f);
  });
  inp.click();
}

function help() {
  K.sheet('사용 설명', el('div.rt', null, [
    el('p', { html: '<b>1. 제품군을 고른다.</b> 스킨·로션·크림·샴푸·린스·선크림·립밤 등 17가지. ' +
      '제품군마다 출하 규격(점도·pH·탁도)과 표준 공정이 다르다.' }),
    el('p', { html: '<b>2. 처방을 짠다.</b> 왼쪽에서 원료를 검색해 넣고 %를 조정한다. ' +
      '합계는 100.00% 여야 한다 — <code>물로 맞추기</code> 버튼이 정제수로 나머지를 채운다.' }),
    el('p', { html: '<b>3. 공정을 확인한다.</b> 처방을 읽어 표준 제조 순서가 자동으로 짜인다. ' +
      '온도·교반 rpm·시간·진공을 직접 바꿀 수 있다.' }),
    el('p', { html: '<b>4. 제조한다.</b> 배치 규모를 정하고 <code>제조 ▶</code>. ' +
      '칭량 오차, 증발, 벽면 잔류, 열이력, 전단, 혼합 불균일까지 계산해 실제로 나올 물건을 보여준다.' }),
    el('p', { html: '<b>같은 처방도 배치 규모에 따라 다른 물건이 나온다.</b> ' +
      '100 g 비커와 1톤 탱크로 각각 제조해 결과를 비교해 보라. ' +
      '점도·수율·색까지 달라지는 이유가 결과 화면의 <b>스케일이 만든 차이</b> 에 전부 적혀 있다.' }),
    el('p', { html: '<b>학습</b> 탭에는 17개 제품군 × 6과제, 모두 ' + MISS.count + '개의 과제가 있다. ' +
      '빈 처방에서 규격을 맞추는 것부터, 고장난 처방을 넘겨받아 고치는 것, 랩 처방을 1톤으로 옮기는 것까지.' }),
    el('p', { style: 'color:var(--ink-3)', html: '단축키 — <code>Ctrl+Enter</code> 제조 · <code>/</code> 검색' })
  ]));
}

function about() {
  K.sheet('계산 근거', el('div.rt', null, [
    el('p', { html: '실제 제형 이론을 축약한 모델이다. 절대값은 근사지만, ' +
      '<b>무엇을 바꾸면 어느 쪽으로 얼마나 움직이는가</b> 는 실제와 같다.' }),
    el('p', { html: '<b>점도</b> — 점증제 겔(η = K·c<sup>n</sup>, pH·전해질·알코올로 보정), ' +
      '라멜라 겔망(지방알코올 × 유화제), 계면활성제 미셀(솔트 커브), ' +
      '내상 부피분율(Krieger–Dougherty)을 합산한다.' }),
    el('p', { html: '<b>pH</b> — 산·염기 당량을 세어 Henderson–Hasselbalch 로 적정한다. ' +
      '카보머는 폴리전해질 지수 n≈2 를 써서 완만한 중화 곡선을 만든다.' }),
    el('p', { html: '<b>액적 크기</b> — 전단 한계(계면장력<sup>0.6</sup> × 팁속도<sup>−1.2</sup>)와 ' +
      '유화제 피복 한계(Γ·6φ/d) 중 큰 값. 가용화제가 오일보다 많으면 자발적으로 미셀이 생긴다.' }),
    el('p', { html: '<b>탁도</b> — 액적의 Mie 산란(부피분율 × 굴절률 차² × 크기 함수), ' +
      '무기 입자, 석출 결정, 혼입 기포의 합.' }),
    el('p', { html: '<b>색상</b> — 원료 고유색을 색력으로 가중 평균한 뒤, ' +
      '산란에 의한 백색과 열이력·산화에 의한 갈변을 더해 CIE L*a*b* 로 계산하고 sRGB 로 변환한다.' }),
    el('p', { html: '<b>스케일</b> — 액체를 H=D 원통으로 보고 지름 D ∝ V<sup>1/3</sup>. ' +
      '증발과 벽면 잔류는 표면적/부피(∝ V<sup>−1/3</sup>)에 비례하고, ' +
      '냉각 시간은 V<sup>1/3</sup> 에 비례한다. 저울은 목표 중량을 담을 수 있는 가장 정밀한 것이 선택된다.' }),
    el('p', { style: 'color:var(--ink-3)', text:
      '교육·설계 검토용 도구다. 실제 제조·안전성·인허가 판단의 근거로 삼지 말 것.' })
  ]));
}

/* ── 초기화 ────────────────────────────────────────────────────── */
function boot() {
  try {
    var t = localStorage.getItem('formulab.theme');
    if (t) document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}

  fillProducts();

  /* 저장된 상태 */
  var saved = K.load();
  if (saved.progress) S.progress = saved.progress;

  /* URL 해시 우선 */
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

  /* 이벤트 */
  $('#selProd').addEventListener('change', function () {
    S.prod = $('#selProd').value;
    S.mission = null; S.result = null; S.spread = null; S.steps = null;
    UI.renderMid(); UI.renderResult(); UI.persist();
    K.toast(PROD.get(S.prod).ko + ' 규격으로 전환');
  });
  $('#inBatch').addEventListener('change', readBatch);
  $('#selUnit').addEventListener('change', readBatch);
  $('#btnRun').addEventListener('click', function () { UI.run(false); });
  $('#btnRepeat').addEventListener('click', function () { UI.run(true); });
  $('#btnMenu').addEventListener('click', openMenu);
  $('#btnBase').addEventListener('click', function () {
    K.setRows(PROD.get(S.prod).base);
    S.mission = null;
    UI.renderAll(); UI.persist();
    K.toast(PROD.get(S.prod).ko + ' 기준 처방을 불러왔습니다');
  });

  var q = $('#q');
  q.addEventListener('input', function () { S.q = q.value; UI.renderIngList(); });

  K.$$('#nav button').forEach(function (b) {
    b.addEventListener('click', function () { UI.go(b.dataset.go); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); UI.run(false); }
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
      e.preventDefault(); UI.go('ing'); q.focus(); q.select();
    }
  });

  window.addEventListener('beforeunload', function () {
    try { history.replaceState(null, '', '#' + K.pack(S)); } catch (e) {}
  });

  UI.syncTop();
  UI.go(window.innerWidth >= 900 ? 'form' : 'form');
  UI.renderAll();
}

G.APP = { boot: boot, help: help, about: about, openMenu: openMenu, theme: theme };
})(window);
