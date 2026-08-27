/* =====================================================================
   포뮬라랩 — 제조 공정 시뮬레이터
   ---------------------------------------------------------------------
   처방 + 공정 + 설비 + 배치 규모 → 실제로 나오는 물건
   소량과 대량에서 갈리는 것들을 전부 물리량으로 계산한다.
     칭량 오차   저울 눈금 · 반복정밀도. 미량 원료일수록 상대 오차가 크다
     증발 손실   ∝ 표면적/부피 ∝ V^(-1/3).  비커가 탱크보다 20배 잘 마른다
     잔류 손실   ∝ 젖은 면적/부피 ∝ V^(-1/3).  소량 배치의 수율이 낮은 이유
     열이력      냉각 시간 ∝ V^(1/3).  대량은 오래 뜨거워 활성이 깨지고 갈변한다
     냉각 속도   라멜라 겔망의 결정 크기를 바꾼다 → 대량이 더 묽다
     전단        같은 rpm 이라도 지름이 다르면 팁속도가 다르다
     혼합 균질도 혼합 시간이 배치 크기에 따라 늘어난다
   ===================================================================== */
(function (G) {
'use strict';

var ING = G.ING, CHEM = G.CHEM, PROC = G.PROC;
var cl = CHEM.cl;

/* 재현 가능한 난수 */
function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  var u = 1 - r(), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Antoine — 물의 포화증기압 (Pa) */
function psat(T) {
  var mmHg = Math.pow(10, 8.07131 - 1730.63 / (233.426 + Math.min(T, 99)));
  return mmHg * 133.322;
}
var PAMB = psat(25) * 0.5;                       /* 25℃ 50% RH */
var KEVAP = 3.7e-8;                              /* kg / (m²·s·Pa) */
var CP = 3500;                                   /* J/(kg·K) */

/* =====================================================================
   실행
   ===================================================================== */
function run(rows, opt) {
  opt = opt || {};
  var batchG = opt.batchG || 1000;
  var rig = opt.rig || PROC.rigFor(batchG);
  var seed = opt.seed == null ? 1 : opt.seed;
  var r = rng(seed * 2654435761 + 7);
  var steps = opt.steps && opt.steps.length ? opt.steps : PROC.buildTemplate(rows, opt.kind || 'emulsion', rig);

  var log = [], warn = [];
  function W(sev, ko, msg) { warn.push({ sev: sev, ko: ko, msg: msg }); }

  /* 처방 합계가 100% 가 아니면 비율대로 환산해 칭량한다.
     그래야 "1 kg 배치" 가 실제로 1 kg 이 되고 수율이 뜻을 갖는다. */
  var rawTotal = rows.reduce(function (x, y) { return x + (+y.pct > 0 ? +y.pct : 0); }, 0);
  if (rawTotal > 0 && Math.abs(rawTotal - 100) > 0.001) {
    var k = 100 / rawTotal;
    rows = rows.map(function (r) { return { id: r.id, pct: (+r.pct || 0) * k }; });
  }

  /* ── 1. 칭량 ─────────────────────────────────────────────────── */
  var items = [], weighSum = 0, worst = null;
  rows.forEach(function (row) {
    var g = ING.BY[row.id]; if (!g || !(row.pct > 0)) return;
    var target = batchG * row.pct / 100;
    var sc = PROC.pickScale(rig, target);
    var q = Math.round(target / sc.d) * sc.d;
    var actual = Math.max(0, q + gauss(r) * sc.rep / 2);
    var it = {
      id: row.id, g: g, pct: row.pct, target: target, actual: actual,
      scale: sc, rel: target > 0 ? (actual - target) / target : 0,
      mass: actual, alive: actual
    };
    if (target < sc.d * 0.5) {
      it.unweighable = true;
      W(14, '계량 불가', g.ko + ' ' + fmtg(target) + ' 은 ' + sc.ko + ' 의 눈금보다 작다. ' +
        '희석액(1% 프리믹스)을 만들어 계량해야 한다.');
    } else if (Math.abs(it.rel) > 0.10 && row.pct < 1) {
      W(6, '미량 계량 오차', g.ko + ' 목표 ' + fmtg(target) + ' → 실제 ' + fmtg(actual) +
        ' (' + (it.rel * 100).toFixed(1) + '%). ' + sc.ko + ' 로는 이 이상 맞추기 어렵다.');
    }
    if (!worst || Math.abs(it.rel) > Math.abs(worst.rel)) worst = it;
    items.push(it); weighSum += actual;
  });
  var byId = {}; items.forEach(function (i) { byId[i.id] = i; });

  /* ── 2. 용기 형상 ───────────────────────────────────────────── */
  var dens = 1.0;
  var geo = PROC.geometry(weighSum, dens);
  var massKg = weighSum / 1000;

  /* ── 3. 공정 진행 ───────────────────────────────────────────── */
  var T = 25, present = {}, evapWater = 0, thermalDose = 0, homoSec = 0;
  var d32 = 0, minutes = 0, maxT = 0, tempAt = {}, evapAt = {}, doseAt = {}, airPct = 0, deaerMin = 0;
  var clock = 0, hotAt = null, cool40At = null;
  var trace = [];
  var vacFrac = 0, vacMin = 0, totalStirMin = 0;
  var etaGuess = 200;

  var pre = CHEM.evaluate(rows, { tip: 6.3, sec: 300 });
  etaGuess = Math.max(pre.eta, 10);

  var dt = 20;                                     /* 적분 간격 s */
  var jacketHot = rig.tj[0] || 100, jacketCold = rig.tj[1];

  /* 한 스텝의 물리를 dt 만큼 진행한다 */
  function tick(st, vac) {
    var target = st.temp;
    var drive = T < target - 0.2 ? jacketHot : T > target + 0.2 ? jacketCold : T;
    if (Math.abs(T - target) > 0.2) {
      var dT = rig.U * geo.aWet * (drive - T) / (massKg * CP) * dt;
      if (Math.abs(dT) > Math.abs(target - T)) dT = target - T;
      T += dT;
    }
    if (T > maxT) maxT = T;
    clock += dt / 60;
    if (T >= 65) { hotAt = clock; cool40At = null; }
    else if (T < 40 && hotAt != null && cool40At == null) cool40At = clock;

    /* 증발 — 자유표면 × 포화증기압 × 개방도 */
    var open = vac ? rig.open * 1.6 : rig.open;
    evapWater += KEVAP * geo.aSurf * Math.max(psat(T) - PAMB, 0) * open * dt * 1000;

    thermalDose += Math.max(0, T - 55) / 25 * (dt / 60);

    if (st.homo > 0) {
      homoSec += dt;
      var tip = PROC.tipSpeed(rig.dHomo, st.homo);
      var dp = CHEM.dropletSize(pre.agg, { tip: tip, sec: 1e5, etaC: etaGuess });
      if (dp) {
        if (d32 <= 0) d32 = dp.d * 4;
        d32 += (dp.d - d32) * (1 - Math.exp(-dt / 90));
      }
      airPct += (tip > 15 ? 0.03 : 0.02) * dt / 60 * (vac ? 0.12 : 1);
    } else if (d32 > 0 && T > 55 && pre.drop && pre.drop.starved) {
      d32 *= 1 + 0.0004 * dt / 60;                 /* 유화제 부족 → 고온에서 합일 */
    }
    if (st.aji > 0 && !vac && etaGuess > 2500) airPct += 0.004 * dt / 60;
    if (vac) { vacMin += dt / 60; if (st.t === 'vacuum') deaerMin += dt / 60; }
  }

  steps.forEach(function (st, si) {
    var vac = !!st.vac;
    var rampMin = 0, holdMin = 0;

    /* ① 승온·냉각 — 목표 온도에 닿을 때까지. 이 시간이 배치가 클수록 길어진다 */
    if (st.t !== 'weigh' && Math.abs(T - st.temp) > 1.5) {
      var el = 0, cap = 300 * 60;
      while (el < cap && Math.abs(T - st.temp) > 0.6) { tick(st, vac); el += dt; }
      rampMin = el / 60;
    }

    /* ② 투입 — 목표 온도에 도달한 뒤에 넣는다 */
    (st.add || []).forEach(function (id) {
      if (!byId[id] || present[id]) return;
      present[id] = true;
      tempAt[id] = T;
      evapAt[id] = evapWater;          /* 투입 시점까지 이미 날아간 물 */
      doseAt[id] = thermalDose;        /* 투입 시점까지의 열이력 */
      var g = ING.BY[id];
      if (g.tmax && T > g.tmax + 0.5)
        W(g.cat === 'presv' ? 9 : g.cat === 'active' ? 11 : 7,
          '투입 온도 초과',
          g.ko + ' 를 ' + T.toFixed(0) + '℃ 에 넣었다. 허용은 ' + g.tmax + '℃ 이하 — ' +
          (g.vol > 0.4 ? '상당량이 날아간다.' : '분해가 시작된다.'));
    });

    /* 상 온도차 — 직전 용해 스텝의 온도와 비교 */
    if (st.t === 'emulsify') {
      for (var k = si - 1; k >= 0; k--) if (steps[k].t === 'melt') {
        if (Math.abs(steps[k].temp - T) > 10)
          W(12, '상 온도차', '수상 ' + T.toFixed(0) + '℃ 와 유상 ' + steps[k].temp.toFixed(0) +
            '℃ 의 차이가 ' + Math.abs(steps[k].temp - T).toFixed(0) +
            '℃ 다. 계면에서 바로 굳어 액적이 거칠어진다.');
        break;
      }
    }

    /* ③ 유지 — 지시한 시간만큼 */
    var hold = (st.min || 0) * 60, e2 = 0;
    while (e2 < hold) { tick(st, vac); e2 += dt; }
    holdMin = e2 / 60;

    var usedMin = rampMin + holdMin;
    minutes += usedMin;
    totalStirMin += st.aji > 0 ? usedMin : 0;
    if (vac && (st.aji > 0 || st.homo > 0)) vacFrac += usedMin;

    trace.push({ ko: st.ko || PROC.STEPKO[st.t], t: st.t, temp: T,
                 min: usedMin, ramp: rampMin, hold: holdMin,
                 aji: st.aji, homo: st.homo, vac: vac, add: (st.add || []).slice() });

    checkStep(st, holdMin, T, si);
  });

  function checkStep(st, used, tNow, si) {
    var carb = rows.some(function (x) { return x.id === 'carb940' || x.id === 'pemulen'; });
    if (st.t === 'hydrate' && carb && used < 25)
      W(10, '수화 부족', '카보머 수화 ' + used.toFixed(0) + '분. 30분 이상 풀어야 사슬이 다 펴진다. ' +
        '덜 풀린 채 중화하면 점도가 20~30% 덜 나온다.');
    if (st.t === 'neutralize' && st.add && st.add.length && used < 8 && carb)
      W(9, '급속 중화', '중화를 ' + used.toFixed(0) + '분 만에 끝냈다. 국부 과중화로 겔이 끊겨 점도가 떨어진다.');
    var fatty = rows.some(function (x) { return ['myristic', 'lauric', 'stearic'].indexOf(x.id) >= 0 && x.pct > 3; });
    if (st.t === 'neutralize' && fatty && byId['koh'] && used < 20)
      W(10, '급속 비누화', '알칼리를 ' + used.toFixed(0) + '분 만에 다 넣었다. 반응열로 온도가 튀고 ' +
        '점도가 급상승해 교반이 멈춘다. 20~30분에 걸쳐 나눠 넣어라.');
    if (st.homo > 0) {
      var tip = PROC.tipSpeed(rig.dHomo, st.homo);
      if (tip > 18) W(8, '과전단', '호모 팁속도 ' + tip.toFixed(1) + ' m/s. 발열과 기포가 생기고 라멜라가 깨진다.');
      if (tip < 3 && st.t === 'emulsify') W(10, '전단 부족', '호모 팁속도 ' + tip.toFixed(1) +
        ' m/s 로는 액적이 잘게 쪼개지지 않는다. rpm 을 올려라.');
    }
  }

  /* ── 4. 증발 반영 ───────────────────────────────────────────── */
  var waterItem = byId['aqua'];
  var evapPct = 0;
  if (waterItem) {
    var lost = Math.min(evapWater, waterItem.mass * 0.6);
    waterItem.mass -= lost;
    evapPct = weighSum > 0 ? lost / weighSum * 100 : 0;
    if (opt.evapCorrect && lost > 0) { waterItem.mass += lost; evapPct = 0; }
  }
  var evapFrac = evapPct / 100;

  /* ── 5. 휘발 · 열분해 ───────────────────────────────────────── */
  var antiox = 0, chelate = 0;
  items.forEach(function (i) {
    if (i.id === 'tocoph' || i.id === 'bht') antiox += i.mass / weighSum * 100 * (i.id === 'bht' ? 6 : 1);
    if (i.id === 'edta' || i.id === 'phytic') chelate += i.mass / weighSum * 100 * 10;
  });
  antiox = cl(antiox, 0, 1); chelate = cl(chelate, 0, 1);
  var oxProtect = (1 - 0.55 * antiox) * (1 - 0.35 * chelate) * (1 - 0.45 * (vacMin > 5 ? 1 : 0));

  var browningSum = 0, lossNotes = [];
  items.forEach(function (i) {
    var g = i.g;
    if (!present[i.id]) return;
    var tIn = tempAt[i.id] != null ? tempAt[i.id] : 25;
    /* 휘발 : "투입 이후에" 일어난 증발에만 노출된다 */
    var afterEvap = Math.max(0, (evapWater - (evapAt[i.id] || 0))) / Math.max(weighSum, 1);
    if (g.vol > 0) {
      var f = 1 - Math.exp(-36 * g.vol * afterEvap);
      if (f > 0.02) {
        i.mass *= (1 - f);
        if (f > 0.12) lossNotes.push({ sev: g.cat === 'misc' ? 5 : 7, ko: '휘발 손실',
          msg: g.ko + ' 의 ' + (f * 100).toFixed(0) + '% 가 날아갔다. 더 낮은 온도에서 넣어라.' });
      }
    }
    /* 열분해 : 투입 이후에 받은 열이력만 센다 */
    if (g.ox > 0) {
      var dose = Math.max(0, thermalDose - (doseAt[i.id] || 0));
      var k = 0.004 * g.ox * Math.exp((Math.min(maxT, 95) - 60) / 12) * oxProtect;
      var deg = 1 - Math.exp(-k * dose * 0.8);
      if (deg > 0.02) {
        i.mass *= (1 - deg);
        browningSum += i.mass / weighSum * 100 * g.ox * deg * 30;
        if (deg > 0.10) lossNotes.push({ sev: g.cat === 'active' ? 10 : 5, ko: '열분해',
          msg: g.ko + ' 의 ' + (deg * 100).toFixed(0) + '% 가 분해됐다. ' +
               '이 원료는 ' + (g.tmax ? g.tmax + '℃ 이하에서' : '냉각 후에') + ' 넣어야 한다. ' +
               (antiox < 0.05 ? '항산화제를 함께 넣고, ' : '') +
               (vacMin < 5 ? '진공이나 질소 치환으로 산소를 빼라.' : '투입 온도를 더 낮춰라.') });
      }
    }
    browningSum += i.mass / weighSum * 100 * g.ox * Math.max(0, thermalDose - (doseAt[i.id] || 0)) * 0.05 * (1 - 0.6 * antiox);
  });

  /* ── 6. 잔류 손실 (수율) ────────────────────────────────────── */
  var etaFinalGuess = Math.max(etaGuess, 10);
  /* 제조 중(고온)의 점도. 무수 왁스 제형은 녹아 있는 동안 묽다. */
  var procEta = (pre.agg.anhydrous && pre.agg.wax > 8) ? 300
              : etaFinalGuess / (1 + Math.max(0, maxT - 30) / 45);
  var film = cl(0.15 + 0.55 * Math.log(1 + procEta / 100) / Math.LN10, 0.12, 2.0) / 1000;  /* m */
  var holdKg = 1000 * film * geo.aWet * (1 - rig.scrape) * 2.5;
  var holdG = Math.min(holdKg * 1000, weighSum * 0.35);
  var inVessel = 0; items.forEach(function (i) { inVessel += i.mass; });
  var yieldG = Math.max(inVessel - holdG, 0);
  var yieldPct = batchG > 0 ? yieldG / batchG * 100 : 0;

  /* ── 7. 냉각 속도 → 라멜라 계수 ─────────────────────────────── */
  /* 65℃ → 40℃ 구간의 평균 냉각 속도 (℃/분) */
  var coolSpan = (hotAt != null && cool40At != null) ? (cool40At - hotAt) : null;
  var coolRate = coolSpan && coolSpan > 0.05 ? 25 / coolSpan : (maxT < 45 ? 3 : 2);
  var coolFactor = cl(1 + 0.32 * Math.log(Math.max(coolRate, 0.05) / 0.8) / Math.LN10, 0.72, 1.38);

  /* ── 8. 혼합 균질도 ─────────────────────────────────────────── */
  var uTip = PROC.tipSpeed(rig.dAji, Math.max(steps[steps.length - 1].aji || 60, 20));
  var theta = 699 * Math.pow(geo.D, 1.6) * Math.pow(Math.max(procEta, 10) / 1000, 0.3) / Math.max(uTip, 0.05);
  var lastAdd = 0;
  steps.forEach(function (s) { if (s.t === 'add' || s.t === 'neutralize') lastAdd = Math.max(lastAdd, s.min * 60); });
  var homog = 100 * (1 - Math.exp(-3 * Math.max(lastAdd, 60) / Math.max(theta, 1)));
  if (homog < 92)
    W(homog < 75 ? 14 : 7, '혼합 불균일',
      '이 크기의 탱크에서 95% 균질에 ' + (theta / 60).toFixed(0) + '분이 필요한데 ' +
      (lastAdd / 60).toFixed(0) + '분만 돌렸다. 균질도 ' + homog.toFixed(0) + '%. ' +
      '충전 순서에 따라 앞뒤 병의 함량이 달라진다.');

  /* ── 9. 석출 · 미용해 ───────────────────────────────────────── */
  var precip = 0, precipNotes = [];
  function pchk(id, cond, sev, ko, msg, ntu) {
    if (!byId[id] || !cond) return;
    precip += ntu; precipNotes.push({ sev: sev, ko: ko, msg: msg });
  }
  var pctOf = function (id) { return byId[id] ? byId[id].mass / Math.max(inVessel, 1) * 100 : 0; };
  pchk('allantoin', pctOf('allantoin') > 0.5, 8, '결정 석출',
    '알란토인 ' + pctOf('allantoin').toFixed(2) + '% 는 상온 용해도(약 0.5%)를 넘는다. 식으면서 바늘 결정이 뜬다.', 450);
  pchk('cera', maxT < 72, 9, '미용해',
    '세라마이드는 75℃ 이상에서 녹여야 한다. 최고 온도가 ' + maxT.toFixed(0) + '℃ 라 알갱이가 남는다.', 380);
  pchk('bemt', maxT < 80, 9, '재결정',
    'BEMT(티노소브 S)는 80℃ 이상 완전 용해가 필요하다. 최고 ' + maxT.toFixed(0) + '℃ 에서는 식으며 결정이 자란다.', 300);
  pchk('sa', (pctOf('etoh') + pctOf('bg') + pctOf('pdo') + pctOf('dpg') + pctOf('penta')) < 5, 8, '미용해',
    '살리실릭애씨드는 물에 거의 안 녹는다. 글라이콜이나 알코올을 5% 이상 함께 넣어 먼저 녹여라.', 500);
  pchk('caff', pctOf('caff') > 1 && maxT < 65, 6, '미용해',
    '카페인 1% 이상은 80℃ 물에서 녹여야 한다.', 220);
  pchk('carnauba', maxT < 84, 7, '미용해',
    '카나우바왁스는 융점이 82~86℃ 다. 최고 ' + maxT.toFixed(0) + '℃ 로는 다 녹지 않는다.', 260);

  /* 양이온 · 음이온 충돌 */
  /* 양이온 "계면활성제" 만 음이온과 침전한다. 폴리쿼터늄 같은 양이온 폴리머는
     오히려 음이온 계면활성제와 함께 쓰여 헹굼 시 코아세르베이트를 만든다. */
  var cationic = ['btms50', 'ctac'].some(function (i) { return byId[i]; });
  var anionic = ['sles', 'cocoglut', 'slmi', 'nastearoylglu', 'kcp'].some(function (i) { return byId[i]; });
  if (cationic && anionic) {
    precip += 900;
    precipNotes.push({ sev: 20, ko: '이온 충돌 침전',
      msg: '양이온 계면활성제와 음이온 계면활성제를 함께 넣었다. 그 자리에서 복합체를 이뤄 침전한다.' });
  }

  /* 시어버터 급냉 그레이닝 */
  if (byId['shea'] && coolRate > 4 && pctOf('shea') > 1.5)
    precipNotes.push({ sev: 5, ko: '왁스 그레이닝',
      msg: '시어버터를 ' + coolRate.toFixed(1) + '℃/분으로 급냉했다. 다형 결정이 자라 시간이 지나면 오돌토돌해진다.' });

  /* ── 10. 기포 ──────────────────────────────────────────────── */
  airPct = cl(airPct * (1 - cl(deaerMin / 15, 0, 0.85)), 0, 4);
  if (airPct > 0.8) W(6, '기포 혼입', '혼입 공기 ' + airPct.toFixed(1) + '%. 탁도가 오르고 충전 중량이 흔들린다. 진공 탈포를 늘려라.');

  /* ── 11. 최종 조성 → 물성 ──────────────────────────────────── */
  var finalMass = 0;
  items.forEach(function (i) { finalMass += i.mass; });
  var finalRows = items.map(function (i) {
    return { id: i.id, pct: finalMass > 0 ? i.mass / finalMass * 100 : 0 };
  });

  var browning = cl(browningSum, 0, 45);
  /* 실제로 걸린 전단 이력을 반영하기 위해, 공정에서 추적한 팁속도·시간을 넘긴다 */
  var maxTip = 0.5;
  steps.forEach(function (s) {
    if (s.homo > 0) maxTip = Math.max(maxTip, PROC.tipSpeed(rig.dHomo, s.homo));
  });
  if (maxTip < 1) maxTip = PROC.tipSpeed(rig.dAji, steps.reduce(function (a, s) { return Math.max(a, s.aji || 0); }, 60));
  var lastTip = maxTip, lastSec = Math.max(homoSec, 60);
  var res = CHEM.evaluate(finalRows, {
    tip: lastTip, sec: lastSec,
    coolFactor: coolFactor, browning: browning,
    precipitate: precip, airPct: airPct,
    precipNotes: precipNotes, lossNotes: lossNotes
  });

  /* 이론값(오차 없는 처방·이상 공정)과의 비교 */
  var ideal = CHEM.evaluate(rows, { tip: 6.3, sec: 300, coolFactor: 1 });

  return {
    rows: finalRows, items: items, ideal: ideal, res: res,
    rig: rig, geo: geo, batchG: batchG, weighSum: weighSum,
    yieldG: yieldG, yieldPct: yieldPct, holdG: holdG,
    evapG: evapWater, evapPct: evapPct,
    minutes: minutes, maxT: maxT, thermalDose: thermalDose,
    coolRate: coolRate, coolFactor: coolFactor,
    homog: homog, theta: theta, airPct: airPct, browning: browning,
    d32: res.d32, worstWeigh: worst, trace: trace,
    warn: warn.concat(lossNotes).concat(precipNotes).sort(function (a, b) { return b.sev - a.sev; }),
    steps: steps, seed: seed
  };
}

/* 여러 배치를 돌려 편차를 본다 */
function repeat(rows, opt, n) {
  var out = [];
  for (var i = 0; i < (n || 3); i++) {
    var o = {}; for (var k in opt) o[k] = opt[k];
    o.seed = (opt.seed || 1) + i * 977;
    out.push(run(rows, o));
  }
  var pick = function (f) { return out.map(f); };
  function stat(a) {
    var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
    var v = a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / Math.max(a.length - 1, 1);
    var sd = Math.sqrt(v);
    return { mean: m, sd: sd, cv: m !== 0 ? sd / Math.abs(m) * 100 : 0, min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
  }
  return {
    runs: out,
    eta: stat(pick(function (x) { return x.res.eta; })),
    pH: stat(pick(function (x) { return x.res.pH; })),
    ntu: stat(pick(function (x) { return x.res.ntu; })),
    yieldPct: stat(pick(function (x) { return x.yieldPct; })),
    d32: stat(pick(function (x) { return x.d32 || 0; }))
  };
}

function fmtg(g) {
  if (g >= 1000000) return (g / 1000000).toFixed(3) + ' t';
  if (g >= 1000) return (g / 1000).toFixed(g >= 10000 ? 1 : 3) + ' kg';
  if (g >= 1) return g.toFixed(2) + ' g';
  if (g >= 0.001) return (g * 1000).toFixed(1) + ' mg';
  return (g * 1000).toFixed(3) + ' mg';
}

G.SIM = { run: run, repeat: repeat, fmtg: fmtg, psat: psat, rng: rng };
})(window);
