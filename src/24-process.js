/* =====================================================================
   포뮬라랩 — 장비 · 스케일 · 공정 템플릿
   ---------------------------------------------------------------------
   배치 규모가 바뀌면 바뀌는 것들
     · 용기 지름 D ∝ V^(1/3)  → 표면적/부피 비 ∝ V^(-1/3)
       → 소량일수록 증발 손실과 벽면 잔류 손실의 "비율"이 커진다
     · 열전달 면적 A ∝ V^(2/3), 열용량 ∝ V
       → 냉각 시간 ∝ V^(1/3)  → 대량일수록 열이력이 길다
     · 호모믹서 지름이 커지므로 같은 rpm 이면 팁속도가 폭증한다
       → 스케일업 규칙(팁속도 일정 / P/V 일정)을 골라야 한다
     · 저울 눈금이 커진다 → 미량 원료의 상대 오차
   ===================================================================== */
(function (G) {
'use strict';

/* ── 저울 : [최소눈금 g, 최대칭량 g, 반복정밀도 g, 이름] ─────────── */
var SCALES = [
  { d: 0.001, cap: 300,     rep: 0.002, ko: '미량 전자저울 0.001 g' },
  { d: 0.01,  cap: 3000,    rep: 0.02,  ko: '정밀 전자저울 0.01 g' },
  { d: 1,     cap: 60000,   rep: 2,     ko: '벤치 저울 1 g' },
  { d: 100,   cap: 3000000, rep: 200,   ko: '플로어 저울 100 g' }
];

/* ── 설비 프리셋 ────────────────────────────────────────────────── */
var RIGS = [
  { key: 'beaker', ko: '실험실 비커', icon: '🧫', range: [20, 2000],
    dHomo: 0.032, maxHomo: 8000, dAji: 0.030, maxAji: 600,
    U: 100, open: 1.0, vacuum: false, scales: [2],
    tj: [null, 20], scrape: 0.6,
    n: '핫플레이트와 수조, 랩용 호모믹서. 열이 빨리 들고 빨리 빠진다. ' +
       '벽면에 남는 양의 비율이 커서 수율이 낮고, 개방 가열이라 물이 잘 마른다.' },

  { key: 'lab', ko: '소형 진공 유화기', icon: '⚗️', range: [1000, 30000],
    dHomo: 0.060, maxHomo: 4000, dAji: 0.150, maxAji: 200,
    U: 260, open: 0.10, vacuum: true, scales: [2, 3],
    tj: [85, 15], scrape: 0.8,
    n: '자켓·진공·스크레이퍼를 갖춘 파일럿 설비. 여기서 나온 결과가 생산으로 옮겨진다.' },

  { key: 'pilot', ko: '파일럿 유화기', icon: '🏭', range: [20000, 200000],
    dHomo: 0.120, maxHomo: 3000, dAji: 0.320, maxAji: 120,
    U: 300, open: 0.08, vacuum: true, scales: [2, 3],
    tj: [85, 15], scrape: 0.88,
    n: '양산 직전 검증용. 여기서 스케일업 규칙이 맞는지 확인한다.' },

  { key: 'plant', ko: '생산 진공 유화기', icon: '🏗️', range: [200000, 3000000],
    dHomo: 0.250, maxHomo: 1800, dAji: 0.700, maxAji: 60,
    U: 300, open: 0.06, vacuum: true, scales: [2, 3, 4],
    tj: [85, 15], scrape: 0.92,
    n: '실제 생산 설비. 열이 아주 천천히 들고 빠진다. 랩에서 5분이던 냉각이 한 시간이 된다.' }
];

function rigFor(massG) {
  for (var i = 0; i < RIGS.length; i++) if (massG <= RIGS[i].range[1]) return RIGS[i];
  return RIGS[RIGS.length - 1];
}

/* ── 용기 형상 : 액체를 H = D 인 원통으로 본다 ──────────────────── */
function geometry(massG, density) {
  var V = massG / 1e6 / (density || 1.0);              /* g → m³ (물 1 kg = 0.001 m³) */
  var D = Math.pow(4 * V / Math.PI, 1 / 3);
  return {
    V: V, D: D,
    aSurf: Math.PI * D * D / 4,                        /* 자유 표면적 */
    aWet: 1.25 * Math.PI * D * D,                      /* 젖은 벽 + 바닥 */
    svRatio: 1 / D                                     /* 표면적/부피 */
  };
}

/* ── 저울 선택 : 목표 중량을 담을 수 있는 가장 정밀한 저울 ─────── */
function pickScale(rig, targetG) {
  var av = rig.scales.map(function (i) { return SCALES[i - 1]; });
  for (var i = 0; i < av.length; i++) if (targetG <= av[i].cap) return av[i];
  return av[av.length - 1];
}

/* ── 팁속도 (m/s) ──────────────────────────────────────────────── */
function tipSpeed(dImp, rpm) { return Math.PI * dImp * rpm / 60; }

/* ── 스케일업 규칙 : 랩 rpm → 목표 설비 rpm ────────────────────── */
var SCALEUP = {
  tip: { ko: '팁속도 일정', n: '가장 흔한 규칙. 액적 크기는 비슷하게 나오지만 단위부피당 투입동력이 줄어 혼합이 느려진다.',
         f: function (n1, d1, d2) { return n1 * d1 / d2; } },
  pv:  { ko: 'P/V 일정', n: '단위부피당 동력을 맞춘다. 팁속도가 올라가 국부 과전단과 발열이 생긴다.',
         f: function (n1, d1, d2) { return n1 * Math.pow(d1 / d2, 2 / 3); } },
  rpm: { ko: 'rpm 그대로', n: '가장 흔한 실수. 지름이 커진 만큼 팁속도가 폭증해 과전단·발열·기포가 생긴다.',
         f: function (n1) { return n1; } }
};

/* =====================================================================
   공정 템플릿 생성 — 처방을 읽고 표준 제조 순서를 짠다
   ===================================================================== */
var ING = G.ING;

function S(t, o) {
  var s = { t: t, temp: 25, aji: 0, homo: 0, min: 5, add: [], vac: false, ko: '', note: '' };
  for (var k in o) s[k] = o[k];
  return s;
}

function idsIn(rows, pred) {
  return rows.filter(function (r) {
    var g = ING.BY[r.id]; return g && r.pct > 0 && pred(g, r);
  }).map(function (r) { return r.id; });
}

function buildTemplate(rows, kind, rig) {
  var st = [], A = [], B = [], C = [], D = [], E = [];
  rows.forEach(function (r) {
    var g = ING.BY[r.id]; if (!g || !(r.pct > 0)) return;
    (g.ph === 'A' ? A : g.ph === 'B' ? B : g.ph === 'C' ? C : g.ph === 'D' ? D : E).push(r.id);
  });
  var hasCarb = E.concat(A).some(function (i) { return i === 'carb940' || i === 'pemulen'; });
  var hasNeut = D.length > 0;
  var hotB = B.length > 0;
  var maxMelt = 0;
  B.concat(E).forEach(function (i) {
    var g = ING.BY[i]; if (!g) return;
    var m = { carnauba: 86, candel: 73, beeswax: 65, behenyl: 71, micro: 70,
              stearyl: 60, ceteryl: 52, cetyl: 50, stearic: 70, myristic: 55,
              lauric: 44, cera: 75, bemt: 82, btms50: 62, shea: 38 }[i] || 0;
    if (m > maxMelt) maxMelt = m;
  });
  var hotT = Math.max(75, Math.min(88, maxMelt + 6));

  function T(list, extra) { return list.filter(function (x) { return list.indexOf(x) >= 0; }).concat(extra || []); }

  if (kind === 'solubilize') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 8 }));
    var oilish = idsIn(rows, function (g) { return g.sol === 'o' || g.cat === 'misc' && g.id === 'parfum'; });
    var solub = idsIn(rows, function (g) { return g.cat === 'emul' && g.hlb >= 12; });
    st.push(S('mix', { ko: '가용화 프리믹스 — 오일·향 + 가용화제', temp: 40, aji: 200, min: 10,
      add: solub.concat(oilish), note: '오일과 가용화제를 먼저 완전히 균일하게 섞는다. 이 순서를 지켜야 미셀이 작게 잡힌다.' }));
    st.push(S('mix', { ko: '수상 투입·용해', temp: 40, aji: 300, min: 15,
      add: A.concat(E).filter(function (x) { return solub.indexOf(x) < 0 && oilish.indexOf(x) < 0; }),
      note: '정제수에 수용성 원료를 완전히 녹인다.' }));
    st.push(S('mix', { ko: '프리믹스를 수상에 서서히 투입', temp: 35, aji: 400, min: 15,
      note: '한 번에 부으면 국부적으로 오일 과잉이 되어 뿌옇게 흐려진다.' }));
    st.push(S('add', { ko: '냉각 첨가', temp: 30, aji: 250, min: 8, add: C }));
    if (hasNeut) st.push(S('neutralize', { ko: 'pH 조정', temp: 28, aji: 250, min: 8, add: D }));
    st.push(S('filter', { ko: '여과 · 배출', temp: 25, aji: 100, min: 8 }));

  } else if (kind === 'coldgel') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 10 }));
    st.push(S('mix', { ko: '수상 준비', temp: 30, aji: 300, min: 10, add: ['aqua'] }));
    st.push(S('hydrate', { ko: '고분자 분산·수화', temp: 30, aji: 500, min: 25,
      add: E.concat(A.filter(function (x) { var g = ING.BY[x]; return g && g.th; })),
      note: '고분자는 폴리올에 미리 적셔 넣어야 덩어리(fish-eye)가 생기지 않는다.' }));
    st.push(S('mix', { ko: '수용성 원료 투입', temp: 30, aji: 400, min: 15,
      add: A.filter(function (x) { var g = ING.BY[x]; return g && !g.th && x !== 'aqua'; }) }));
    if (B.length) st.push(S('homo', { ko: '유상 투입 · 호모 분산', temp: 30, aji: 400, homo: 3000, min: 6, add: B }));
    st.push(S('add', { ko: '활성·방부·향 투입', temp: 28, aji: 300, min: 10, add: C }));
    if (hasNeut) st.push(S('neutralize', { ko: 'pH 조정', temp: 28, aji: 300, min: 8, add: D }));
    st.push(S('vacuum', { ko: '진공 탈포', temp: 27, aji: 200, min: 12, vac: true }));
    st.push(S('discharge', { ko: '배출 · 충전', temp: 25, aji: 60, min: 10 }));

  } else if (kind === 'gel') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 10 }));
    st.push(S('mix', { ko: '정제수 투입', temp: 40, aji: 300, min: 5, add: ['aqua'] }));
    st.push(S('hydrate', { ko: '카보머 분산 · 수화', temp: 40, aji: 600, min: 40,
      add: E, note: '완전히 수화되기 전에 중화하면 점도가 나오지 않는다. 투명해질 때까지 기다린다.' }));
    st.push(S('mix', { ko: '수용성 원료 투입', temp: 35, aji: 400, min: 15,
      add: A.filter(function (x) { return x !== 'aqua'; }) }));
    if (B.length) st.push(S('homo', { ko: '가용화·유상 투입', temp: 35, aji: 400, homo: 2500, min: 6, add: B }));
    st.push(S('add', { ko: '활성·방부·향 투입', temp: 30, aji: 300, min: 10, add: C }));
    st.push(S('neutralize', { ko: '중화 — 아주 천천히 적하', temp: 30, aji: 350, min: 20, add: D,
      note: '한 번에 부으면 그 자리만 겔이 되어 덩어리가 지고 전체 점도는 오히려 떨어진다.' }));
    st.push(S('vacuum', { ko: '진공 탈포', temp: 28, aji: 150, min: 15, vac: true,
      note: '겔에 들어간 기포는 저절로 빠지지 않는다.' }));
    st.push(S('discharge', { ko: '배출 · 충전', temp: 25, aji: 60, min: 10 }));

  } else if (kind === 'emulsion' || kind === 'sun' || kind === 'pigment') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 12 }));
    st.push(S('mix', { ko: 'A상(수상) 투입', temp: 40, aji: 300, min: 6,
      add: A.filter(function (x) { var g = ING.BY[x]; return g && !g.th; }) }));
    if (E.length) st.push(S('hydrate', { ko: '점증제 분산 · 수화', temp: 50, aji: 500, min: 30, add: E,
      note: '점증제는 완전히 부풀기 전에 다음 단계로 넘어가면 점도가 20~30% 덜 나온다.' }));
    st.push(S('heat', { ko: 'A상 가온 ' + hotT + '℃', temp: hotT, aji: 300, min: 15 }));
    st.push(S('melt', { ko: 'B상(유상) 용해 ' + hotT + '℃', temp: hotT, aji: 200, min: 15, add: B,
      note: '가장 융점이 높은 원료까지 완전히 녹아야 한다. 덜 녹으면 식은 뒤 알갱이로 나온다.' }));
    if (kind === 'pigment')
      st.push(S('grind', { ko: '안료 분산 (프리믹스)', temp: hotT, aji: 400, homo: 3000, min: 12,
        note: '안료는 유상 일부에 미리 갈아 넣는다. 뭉친 채로 들어가면 줄무늬가 남는다.' }));
    st.push(S('emulsify', { ko: 'B상을 A상에 투입 · 유화', temp: hotT, aji: 400,
      homo: Math.min(rig.maxHomo, Math.round(6.3 * 60 / (Math.PI * rig.dHomo))), min: 6, vac: rig.vacuum,
      note: '두 상의 온도 차가 10℃ 이상이면 계면에서 바로 굳어 유화가 거칠어진다.' }));
    st.push(S('cool', { ko: '냉각 (교반 유지)', temp: 45, aji: 250, min: 0, vac: rig.vacuum }));
    if (hasNeut) st.push(S('neutralize', { ko: '중화 · pH 조정', temp: 45, aji: 300, homo: 1200, min: 10, add: D }));
    st.push(S('add', { ko: '냉각 첨가 (방부·활성·향)', temp: 38, aji: 250, min: 10, add: C,
      note: '방부제와 향은 40℃ 아래에서. 그 위에서 넣으면 날아간다.' }));
    st.push(S('cool', { ko: '30℃ 까지 냉각', temp: 30, aji: 150, min: 0, vac: rig.vacuum }));
    st.push(S('vacuum', { ko: '진공 탈포', temp: 30, aji: 120, min: 10, vac: true }));
    st.push(S('discharge', { ko: '배출 · 충전', temp: 28, aji: 60, min: 12 }));

  } else if (kind === 'surfactant') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 10 }));
    st.push(S('mix', { ko: '정제수 · 폴리올 투입', temp: 45, aji: 250, min: 6,
      add: ['aqua'].concat(A.filter(function (x) { var g = ING.BY[x]; return g && g.cat === 'humect'; })) }));
    if (E.length) st.push(S('hydrate', { ko: '양이온·점증 폴리머 수화', temp: 45, aji: 500, min: 20, add: E,
      note: '폴리쿼터늄은 계면활성제보다 먼저, 낮은 pH 에서 풀어 놓아야 뭉치지 않는다.' }));
    st.push(S('mix', { ko: '계면활성제 투입 (저속)', temp: 50, aji: 180, min: 25,
      add: A.filter(function (x) { var g = ING.BY[x]; return g && g.cat === 'surf'; }),
      note: '빠르게 돌리면 거품만 잔뜩 생긴다. 천천히, 오래.' }));
    st.push(S('mix', { ko: '보조 원료 투입', temp: 45, aji: 200, min: 12,
      add: A.filter(function (x) { var g = ING.BY[x]; return g && ['surf', 'humect'].indexOf(g.cat) < 0 && x !== 'aqua'; }).concat(B) }));
    st.push(S('add', { ko: '방부·향 투입', temp: 35, aji: 180, min: 10, add: C }));
    st.push(S('neutralize', { ko: 'pH 조정 후 증점 확인', temp: 32, aji: 200, min: 15, add: D,
      note: 'pH 를 맞춘 다음에 소금으로 점도를 잡는다. 순서가 바뀌면 점도가 흔들린다.' }));
    st.push(S('vacuum', { ko: '탈포 · 정치', temp: 30, aji: 80, min: 25, vac: rig.vacuum }));
    st.push(S('filter', { ko: '여과 · 배출', temp: 28, aji: 60, min: 12 }));

  } else if (kind === 'conditioner') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 10 }));
    st.push(S('heat', { ko: 'A상 가온 75℃', temp: 75, aji: 300, min: 15,
      add: ['aqua'].concat(A.filter(function (x) { return x !== 'aqua'; })) }));
    st.push(S('melt', { ko: 'B상 용해 75℃ (양이온 + 지방알코올)', temp: 75, aji: 200, min: 15, add: B,
      note: 'BTMS 는 완전히 녹아야 라멜라가 짜인다.' }));
    st.push(S('emulsify', { ko: 'B상 투입 · 호모 분산', temp: 75, aji: 400,
      homo: Math.min(rig.maxHomo, 2500), min: 5, vac: rig.vacuum }));
    st.push(S('cool', { ko: '45℃ 까지 냉각', temp: 45, aji: 250, min: 0, vac: rig.vacuum }));
    st.push(S('add', { ko: '방부·향·활성 투입', temp: 40, aji: 200, min: 10, add: C }));
    st.push(S('neutralize', { ko: 'pH 3.5~5.0 로 조정', temp: 35, aji: 250, min: 12, add: D,
      note: '이 pH 에서만 양이온이 모발에 달라붙는다.' }));
    st.push(S('cool', { ko: '30℃ 까지 냉각', temp: 30, aji: 120, min: 0 }));
    st.push(S('discharge', { ko: '배출 · 충전', temp: 28, aji: 60, min: 12 }));

  } else if (kind === 'saponify') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 10 }));
    st.push(S('heat', { ko: 'A상(물·폴리올) 가온 80℃', temp: 80, aji: 300, min: 18,
      add: ['aqua'].concat(A.filter(function (x) { return x !== 'aqua'; })).concat(E) }));
    st.push(S('melt', { ko: 'B상(지방산) 용해 80℃', temp: 80, aji: 200, min: 18, add: B,
      note: '지방산이 완전히 녹지 않으면 비누화가 균일하지 않다.' }));
    st.push(S('mix', { ko: 'B상을 A상에 투입', temp: 80, aji: 400, min: 8 }));
    st.push(S('neutralize', { ko: '비누화 — 알칼리 적하', temp: 80, aji: 500, min: 30, add: D,
      note: '반응이 발열하고 점도가 급상승한다. 30분에 걸쳐 나눠 넣는다. 이론량의 90~95% 만.' }));
    st.push(S('hold', { ko: '숙성 (반응 완결)', temp: 78, aji: 300, min: 30 }));
    st.push(S('cool', { ko: '45℃ 까지 냉각', temp: 45, aji: 250, min: 0, vac: rig.vacuum }));
    st.push(S('add', { ko: '방부·향 투입', temp: 39, aji: 200, min: 10, add: C }));
    st.push(S('vacuum', { ko: '진공 탈포', temp: 40, aji: 120, min: 20, vac: true }));
    st.push(S('discharge', { ko: '배출 · 충전', temp: 38, aji: 60, min: 15 }));

  } else if (kind === 'anhydrous') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 8 }));
    st.push(S('mix', { ko: '오일상 혼합', temp: 35, aji: 250, min: 15, add: B.concat(A).concat(E) }));
    st.push(S('add', { ko: '휘발·향 성분 투입', temp: 28, aji: 200, min: 10, add: C,
      note: '무수 제형은 물이 없어 방부제가 필요 없다. 대신 휘발 성분 관리가 전부다.' }));
    st.push(S('filter', { ko: '여과 · 배출', temp: 25, aji: 100, min: 10 }));

  } else if (kind === 'melt') {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 8 }));
    st.push(S('melt', { ko: '왁스 용융 ' + Math.max(78, maxMelt + 6) + '℃', temp: Math.max(78, maxMelt + 6),
      aji: 150, min: 25, add: B.concat(A).filter(function (x) { var g = ING.BY[x]; return g && g.sol !== 'd'; }),
      note: '가장 융점이 높은 왁스까지 완전히 녹인다. 덜 녹으면 나중에 알갱이가 씹힌다.' }));
    st.push(S('grind', { ko: '안료 분산', temp: Math.max(78, maxMelt + 6), aji: 300, homo: 2000, min: 15,
      add: idsIn(rows, function (g) { return g.sol === 'd'; }),
      note: '안료는 피마자유에 미리 갈아 넣는다(롤밀). 뭉치면 발색이 죽는다.' }));
    st.push(S('add', { ko: '향·항산화제 투입', temp: 68, aji: 150, min: 6, add: C }));
    st.push(S('discharge', { ko: '주입 (몰드) · 냉각', temp: 70, aji: 0, min: 20,
      note: '주입 온도가 낮으면 표면이 거칠고, 냉각이 느리면 오일이 배어 나온다(발한).' }));

  } else {
    st.push(S('weigh', { ko: '전 원료 칭량', min: 8 }));
    st.push(S('mix', { ko: '전 원료 혼합', temp: 40, aji: 300, min: 20,
      add: A.concat(B).concat(E).concat(C).concat(D) }));
    st.push(S('discharge', { ko: '배출', temp: 25, aji: 60, min: 10 }));
  }
  return prune(st, B.length > 0);
}

/* 실제로 투입할 것이 없는 스텝은 지운다.
   방부제를 하나도 안 넣었는데 "방부 투입" 스텝이 남아 있으면 안 된다. */
function prune(st, hasOil) {
  var needAdd = { add: 1, neutralize: 1, hydrate: 1, melt: 1, grind: 1 };
  st = st.filter(function (s) {
    if (needAdd[s.t] && (!s.add || !s.add.length)) return false;
    if (!hasOil && (s.t === 'emulsify' || s.t === 'melt' || s.t === 'grind')) return false;
    return true;
  });
  /* 남은 첨가 스텝의 이름을 실제 내용에 맞춘다 */
  st.forEach(function (s) {
    if (s.t !== 'add' || !s.add.length) return;
    var seen = {}, part = [];
    s.add.forEach(function (id) {
      var g = ING.BY[id]; if (!g) return;
      var ko = g.cat === 'presv' ? '방부'
             : g.cat === 'active' ? '활성'
             : g.cat === 'humect' || g.cat === 'water' ? '보습'
             : g.id === 'parfum' || g.id === 'menthol' ? '향'
             : g.cat === 'cond' ? '컨디셔닝'
             : g.cat === 'misc' ? '첨가'
             : g.cat === 'oil' || g.cat === 'sili' ? '오일' : '첨가';
      if (!seen[ko]) { seen[ko] = 1; part.push(ko); }
    });
    if (part.length) s.ko = '냉각 첨가 (' + part.slice(0, 3).join('·') + ')';
  });
  return st;
}

var STEPKO = {
  weigh: '칭량', heat: '가온', melt: '용해', hydrate: '수화', mix: '혼합',
  homo: '호모 분산', emulsify: '유화', grind: '분산·분쇄', cool: '냉각',
  neutralize: '중화·조정', add: '첨가', vacuum: '탈포', hold: '숙성',
  filter: '여과', discharge: '배출'
};

G.PROC = {
  SCALES: SCALES, RIGS: RIGS, SCALEUP: SCALEUP, STEPKO: STEPKO,
  rigFor: rigFor, geometry: geometry, pickScale: pickScale,
  tipSpeed: tipSpeed, buildTemplate: buildTemplate, S: S
};
})(window);
