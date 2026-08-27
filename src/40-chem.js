/* =====================================================================
   포뮬라랩 — 물성 예측 엔진
   ---------------------------------------------------------------------
   처방(원료 % 목록) + 공정 환경 → 점도 · pH · 탁도 · 색상 · 입경 · 안정성
   모든 식은 실제 제형 이론에 근거한 축약 모델이다. 절대값은 근사이지만
   "무엇을 바꾸면 어느 쪽으로 얼마나 움직이는가"는 실제와 같은 방향·크기다.
   ===================================================================== */
(function (G) {
'use strict';

var ING = G.ING;

/* ── 산·염기 당량표 (mmol/g) ────────────────────────────────────────
   aeq 산 당량, beq 염기 당량, pka 겉보기 pKa, n 폴리전해질 지수      */
var AB = {
  carb940:  { aeq: 4.3,  pka: 5.5, pka0: 4.8, n: 2.0 },
  pemulen:  { aeq: 3.9,  pka: 5.6, pka0: 4.9, n: 2.0 },
  citric:   { aeq: 10.4, pka: 3.5, pka0: 3.5, n: 1.0 },
  lactic:   { aeq: 8.6,  pka: 3.9, pka0: 3.9, n: 1.0 },
  ga:       { aeq: 9.2,  pka: 3.8, pka0: 3.8, n: 1.0 },
  aa:       { aeq: 5.7,  pka: 4.2, pka0: 4.2, n: 1.0 },
  sa:       { aeq: 7.2,  pka: 3.0, pka0: 3.0, n: 1.0 },
  eac:      { aeq: 2.2,  pka: 4.3, pka0: 4.3, n: 1.0 },
  phytic:   { aeq: 9.0,  pka: 2.5, pka0: 2.5, n: 1.0 },
  edta:     { aeq: 2.0,  pka: 4.5, pka0: 4.5, n: 1.0 },
  /* 지방산: 미셀 상태의 겉보기 pKa 가 8 대로 올라가 비누 pH 9~10.5 를 만든다 */
  stearic:  { aeq: 3.5,  pka: 7.2, pka0: 8.3, n: 1.3 },
  myristic: { aeq: 4.4,  pka: 7.2, pka0: 8.3, n: 1.3 },
  lauric:   { aeq: 5.0,  pka: 7.1, pka0: 8.2, n: 1.3 },

  /* 실제 중화제만 염기 당량을 갖는다. 소듐시트레이트·소듐벤조에이트 같은
     약산의 염은 강염기가 아니라 완충제이므로 pv/pc 로만 작용시킨다. */
  tea:      { beq: 6.7 },
  naoh:     { beq: 4.5 },
  koh:      { beq: 17.9 },
  arginine: { beq: 5.7 },
  tromet:   { beq: 8.3 }
};

/* ── 무수 제형용 오일 점도 (cP, 25℃) ───────────────────────────── */
var OILV = {
  cct: 30, ceh: 12, ipm: 6, dcc: 8, dce: 5, coco: 12, squal: 32,
  minoil: 65, jojoba: 30, maca: 60, argan: 60, rosehip: 45, sunfl: 55,
  olive: 80, castor: 700, isododec: 2, petro: 40000, bos: 90,
  dime5: 5, dime350: 350, d5: 4, phenyl: 25, amodime: 900,
  emc: 12, ehs: 10, octo: 300, ubm: 200, bemt: 3000, peg7gc: 200,
  shea: 8000, tocoph: 2500, pg4cap: 300
};

/* ── 유틸 ──────────────────────────────────────────────────────── */
function cl(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(x, a, b) { if (x <= a) return 0; if (x >= b) return 1; var t = (x - a) / (b - a); return t * t * (3 - 2 * t); }

/* Lab → sRGB hex (D65) */
function labToRgb(L, A, B) {
  var y = (L + 16) / 116, x = A / 500 + y, z = y - B / 200;
  var f = function (t) { var t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
  var X = f(x) * 0.95047, Y = f(y) * 1.00000, Z = f(z) * 1.08883;
  var r = X * 3.2406 + Y * -1.5372 + Z * -0.4986,
      g = X * -0.9689 + Y * 1.8758 + Z * 0.0415,
      b = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
  var s = function (c) { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055; return Math.round(cl(c, 0, 1) * 255); };
  var h = function (v) { var t = v.toString(16); return t.length < 2 ? '0' + t : t; };
  return '#' + h(s(r)) + h(s(g)) + h(s(b));
}

/* =====================================================================
   1. 조성 집계
   ===================================================================== */
function composition(rows) {
  var a = {
    total: 0, water: 0, polyol: 0, oil: 0, wax: 0, powder: 0,
    emul: 0, emulHi: 0, emulLo: 0, surf: 0, surfActive: 0, cond: 0,
    lam: 0, salt: 0, saltAdd: 0, etoh: 0, nacl: 0, thickGel: 0,
    uvOrg: 0, uvInorg: 0, spfRaw: 0, pfaRaw: 0, foamRaw: 0, hardRaw: 0,
    extract: 0, filmer: 0, pigment: 0,
    oilVol: 0, watVol: 0, pwdVol: 0, totVol: 0,
    riOil: 0, riWat: 0, cost: 0, rhSum: 0, rhW: 0, hlbSum: 0, hlbW: 0,
    thickers: [], colors: [], byCat: {}, rows: []
  };
  /* 알칼리가 있으면 지방산은 그 자리에서 비누가 된다 — 오일이 아니라 계면활성제 */
  var FATTY = ['myristic', 'lauric', 'stearic'];
  var alkali = rows.some(function (r) {
    return r.pct > 0 && ['koh', 'naoh', 'tea', 'arginine', 'tromet'].indexOf(r.id) >= 0;
  });
  a.soap = alkali && rows.some(function (r) { return r.pct > 0 && FATTY.indexOf(r.id) >= 0; });

  var rawTotal = rows.reduce(function (x, y) { return x + (+y.pct > 0 ? +y.pct : 0); }, 0);
  var norm = rawTotal > 0 ? 100 / rawTotal : 1;
  a.rawTotal = rawTotal;

  rows.forEach(function (r) {
    var g = ING.BY[r.id]; if (!g || !(r.pct > 0)) return;
    var c = r.pct * norm;                     /* 100% 기준으로 환산 */
    var saponified = a.soap && FATTY.indexOf(g.id) >= 0;
    a.total += c;
    a.cost += c / 100 * g.pr;
    a.byCat[g.cat] = (a.byCat[g.cat] || 0) + c;
    a.rows.push({ g: g, c: c });

    var vol = c / g.d;
    a.totVol += vol;
    a.salt += (g.el || 0) * c;

    if (g.id === 'naclthick') a.nacl += c;
    if (g.id === 'etoh') a.etoh += c;

    var isEmul = saponified || (g.cat === 'emul') ||
                 (g.hlb > 0 && ['surf', 'presv', 'thick'].indexOf(g.cat) < 0) ||
                 (g.cat === 'cond' && g.lam > 0);
    var oily = !saponified && ((g.sol === 'o') || (g.cat === 'wax') || (g.cat === 'oil') || (g.cat === 'sili'));
    var pwd = (g.sol === 'd');

    if (pwd) { a.powder += c; a.pwdVol += vol; }
    else if (oily) {
      a.oilVol += vol;
      if (g.cat === 'wax') a.wax += c; else a.oil += c;
      if (g.rh > 0 && !isEmul) { a.rhSum += g.rh * c; a.rhW += c; }
      if (!a.riOil) a.riOil = 0;
      a.riOil += g.ri * vol;
    } else {
      a.watVol += vol;
      if (g.cat === 'water' || g.cat === 'humect') { a.water += c; if (g.id !== 'aqua') a.polyol += c; }
      a.riWat += g.ri * vol;
    }

    a.lam += (g.lam || 0) * c;

    /* 유화제 풀 — 양이온 컨디셔닝제(BTMS)도 실제로는 유화제로 작동한다 */
    if (isEmul) {
      a.emul += c;
      var h = saponified ? 18 : (g.hlb > 0 ? g.hlb : 15);
      a.hlbSum += h * c; a.hlbW += c;
      if (h >= 8) a.emulHi += c; else a.emulLo += c;
    }
    if (g.cat === 'surf') { a.surf += c; a.surfActive += c * surfActivity(g.id); }
    if (g.cat === 'cond') a.cond += c;
    /* 계면활성제 자신의 대이온은 "추가 전해질"이 아니다 (솔트 커브용) */
    if (['surf', 'cond'].indexOf(g.cat) < 0) a.saltAdd += (g.el || 0) * c;
    if (g.spf > 0 || g.pfa > 0) {
      a.spfRaw += g.spf * c; a.pfaRaw += g.pfa * c;
      if (g.cat === 'uv') { if (g.sol === 'd') a.uvInorg += c; else a.uvOrg += c; }
    }
    if (g.foam > 0) a.foamRaw += c * surfActivity(g.id) * g.foam;
    if (g.hard > 0) a.hardRaw += g.hard * c;
    if (g.ox >= 0.3 && (g.cat === 'active' || g.cat === 'cond') && g.sol === 'w') a.extract += c;
    if (['isododec', 'undectri', 'c1315', 'd5', 'dce', 'dime5', 'dime350', 'dimecop',
         'hpstarch', 'ps15', 'bos', 'inn'].indexOf(g.id) >= 0) a.filmer += c;
    if (g.tint > 20) a.pigment += c;
    if (g.th) a.thickers.push({ g: g, c: c });
    if (g.tint > 0.05) a.colors.push({ g: g, c: c });
  });

  a.riOil = a.oilVol > 0 ? a.riOil / a.oilVol : 1.46;
  a.riWat = a.watVol > 0 ? a.riWat / a.watVol : 1.333;
  a.dn = Math.abs(a.riOil - a.riWat);
  a.phi = a.totVol > 0 ? (a.oilVol + a.pwdVol) / a.totVol : 0;   /* 내상 부피분율 */
  a.aqueous = a.water + a.surf * 0.6;
  a.anhydrous = a.water < 5;
  return a;
}

/* 계면활성제 원료의 활성분 비율 */
function surfActivity(id) {
  return { sles: 0.70, capb: 0.30, chs: 0.50, slmi: 0.85, cocoglut: 0.30,
           decylglu: 0.50, lauryglu: 0.50, myristic: 1.0, lauric: 1.0 }[id] || 0.5;
}

/* =====================================================================
   2. pH — 산·염기 적정 + 완충 가중 평균
   ===================================================================== */
function pH(rows) {
  var A = 0, B = 0, pkaS = 0, pka0S = 0, nS = 0, w = 0;
  var pvS = 0, pcS = 0;
  var rt = rows.reduce(function (x, y) { return x + (+y.pct > 0 ? +y.pct : 0); }, 0);
  var nz = rt > 0 ? 100 / rt : 1;
  rows.forEach(function (r) {
    var g = ING.BY[r.id]; if (!g || !(r.pct > 0)) return;
    var pct = r.pct * nz;
    var t = AB[r.id];
    if (t) {
      if (t.aeq) {
        var m = t.aeq * pct;                   /* 100 g 기준 mmol */
        A += m; pkaS += t.pka * m; pka0S += t.pka0 * m; nS += t.n * m; w += m;
      }
      if (t.beq) B += t.beq * pct;
    }
    if (g.pc > 0) { pvS += g.pv * g.pc * pct; pcS += g.pc * pct; }
  });

  var pHw = pcS > 0 ? pvS / pcS : 6.5;
  if (A + B < 0.02) return cl(pHw, 2, 12);

  var pka = w > 0 ? pkaS / w : 4.5,
      pka0 = w > 0 ? pka0S / w : 4.5,
      n = w > 0 ? nS / w : 1.0;
  var pHab;

  if (A < 0.01) {                               /* 산 없음 — 잔여 염기 */
    pHab = 14 + Math.log(Math.max(B, 1e-6) / 1000 / 0.1) / Math.LN10;
  } else {
    var alpha = B / A;
    if (alpha <= 0.03) {
      /* 미중화 약산 : pH = ½(pKa − log C) */
      pHab = 0.5 * (pka - Math.log(A / 1000 / 0.1) / Math.LN10);
    } else {
      /* Henderson–Hasselbalch. 폴리전해질은 n>1 로 완만해진다 */
      var al = cl(alpha, 0.03, 0.985);
      pHab = pka0 + n * Math.log(al / (1 - al)) / Math.LN10;
      if (alpha > 1) pHab += Math.min(3.2, 4 * (alpha - 1));   /* 과중화 */
    }
  }
  /* 완충 성분(계면활성제·아미노산·추출물)이 많을수록 적정 결과가 희석된다 */
  var wt = cl((A + B) / ((A + B) + 0.6 * pcS + 0.05), 0, 1);
  return cl(wt * pHab + (1 - wt) * pHw, 1.2, 13.5);
}

/* 카보머 중화도(0~1) — 겔 활성 계산용 */
function neutralDegree(rows) {
  var A = 0, B = 0;
  var rt = rows.reduce(function (x, y) { return x + (+y.pct > 0 ? +y.pct : 0); }, 0);
  var nz = rt > 0 ? 100 / rt : 1;
  rows.forEach(function (r) {
    var t = AB[r.id]; if (!t) return;
    if (t.aeq && (r.id === 'carb940' || r.id === 'pemulen')) A += t.aeq * r.pct * nz;
    if (t.beq) B += t.beq * r.pct * nz;
  });
  if (A <= 0) return 0;
  return cl(B / A, 0, 1.4);
}

/* 카보머를 목표 pH 까지 올리는 데 필요한 중화제 양(%) */
function neutralizerNeeded(rows, agentId, targetPh) {
  var t = AB[agentId]; if (!t || !t.beq) return 0;
  var A = 0, pka0 = 4.8, n = 2.0, w = 0;
  rows.forEach(function (r) {
    var q = AB[r.id]; if (!q || !q.aeq) return;
    var m = q.aeq * r.pct; A += m; pka0 += 0; w += m;
    pka0 = q.pka0; n = q.n;
  });
  if (A <= 0) return 0;
  var tp = targetPh || 6.3;
  var alpha = cl(1 / (1 + Math.pow(10, (pka0 - tp) / n)), 0.05, 0.95);
  return +(A * alpha / t.beq).toFixed(4);
}

/* =====================================================================
   3. 액적 크기 d32 (µm)
   ===================================================================== */
function dropletSize(a, p) {
  if (a.oil + a.wax < 0.02 || a.water < 5) return 0;
  var oilTot = a.oil + a.wax;

  /* 요구 HLB vs 유화제 혼합 HLB */
  var rh = a.rhW > 0 ? a.rhSum / a.rhW : 10;
  var bh = a.hlbW > 0 ? a.hlbSum / a.hlbW : 0;
  var match = a.emul > 0 ? Math.exp(-Math.pow(bh - rh, 2) / 8) : 0;
  /* 가용화(미셀 내부에 오일을 품는 것)는 HLB 가 조금 어긋나도 작동한다 */
  var matchSol = a.emul > 0 ? Math.exp(-Math.pow(bh - rh, 2) / 40) : 0;

  /* 계면장력 (mN/m) */
  var polymerAssist = 0;
  a.thickers.forEach(function (t) { if (t.g.hlb > 0) polymerAssist += t.c * 3.0; });
  var rEff = (a.emul * match + polymerAssist) / Math.max(oilTot, 0.02);
  var rSol = (a.emul * matchSol + polymerAssist + a.surfActive * 0.8 + a.cond * 0.3) /
             Math.max(oilTot, 0.02);
  var sigma = Math.max(0.4, 30 / (1 + 40 * rEff));

  /* 전단 한계 */
  var U = Math.max(p.tip || 0.5, 0.15);
  var fPhi = 1 + 1.5 * a.phi;
  var fEta = cl(Math.pow(Math.max(p.etaC || 20, 1) / 50, -0.15), 0.65, 1.6);
  var dEq = 5.11 * Math.pow(sigma, 0.6) * Math.pow(U, -1.2) * fPhi * fEta;
  var tau = 90;                                            /* s */
  var dShear = dEq * (1 + 3 * Math.exp(-(p.sec || 60) / tau));

  /* 유화제 피복 한계 : d = Γ·6φ / (질량농도) */
  var cover = a.emul * Math.max(match, 0.2) + polymerAssist + a.surfActive * 0.8 + a.cond * 0.3;
  var dCover = cover > 0.01 ? 3e-6 * 6 * a.phi / (10 * cover) * 1e6 : 999;

  /* 가용화 : 계면활성제가 오일보다 훨씬 많으면 전단과 무관하게
     10~40 nm 미셀이 스스로 만들어져 투명해진다 */
  var solub = smooth(rSol, 1.5, 3.0);
  var dSolub = solub > 0.001 ? (0.012 + 0.08 / Math.max(rSol, 0.1)) / solub : 1e9;

  var d = Math.max(dCover, Math.min(dShear, dSolub));
  return { d: cl(d, 0.012, 200), dShear: dShear, dCover: dCover, dSolub: dSolub,
           sigma: sigma, rh: rh, bh: bh, match: match, rEff: rEff, rSol: rSol, solub: solub,
           minor: oilTot < 0.5,
           starved: dCover > Math.min(dShear, dSolub) * 1.15 };
}

/* =====================================================================
   4. 점도 (cP, 25℃, 12 rpm 기준)
   ===================================================================== */
function viscosity(a, env) {
  var ph = env.pH, d32 = env.d32 || 1, alpha = env.alpha || 0;

  /* (1) 용매 점도 — 폴리올 */
  var etaSolv = Math.exp(0.035 * a.polyol);

  /* (2) 점증제 겔 */
  var gel = 0, gelDetail = [];
  var E = a.salt;
  a.thickers.forEach(function (t) {
    var g = t.g, K = g.th[0], n = g.th[1], eff = 1;
    if (g.id === 'carb940' || g.id === 'pemulen') {
      var fp = smooth(ph, 3.9, 5.6) * (1 - smooth(ph, 8.5, 11));
      var fa = cl(alpha / 0.35, 0, 1);
      eff = Math.min(fp, Math.max(fa, fp * 0.15)) / (1 + 1.9 * E) / (1 + 0.06 * a.etoh);
    } else if (g.id === 'xanthan' || g.id === 'sclero' || g.id === 'gellan' || g.id === 'carrag') {
      eff = (1 - smooth(ph, 11, 13)) / (1 + 0.06 * E) / (1 + 0.02 * a.etoh);
    } else if (g.id === 'hec' || g.id === 'ha' || g.id === 'pq10' || g.id === 'guar') {
      eff = 1 / (1 + 0.03 * E) / (1 + 0.03 * a.etoh);
    } else if (g.id === 'peg150ds') {
      eff = Math.min(1, a.surfActive / 6);
    } else if (g.id === 'napolyacr') {
      eff = smooth(ph, 4.5, 6) / (1 + 0.9 * E);
    } else {                                        /* 아리스토플렉스 · 세피노브 · 시뮬젤 */
      eff = smooth(ph, 3, 4.5) * (1 - smooth(ph, 9, 11)) / (1 + 0.35 * E);
    }
    var v = K * Math.pow(Math.max(t.c, 0.001), n) * eff;
    gel += v;
    gelDetail.push({ ko: g.ko, v: v, eff: eff });
  });

  /* (3) 계면활성제 미셀 점도 (샴푸·바디워시) */
  var surfV = 0;
  if (a.surfActive > 4) {
    var s = a.nacl + a.saltAdd * 0.045;
    var saltF = 1 + 16 * s * Math.exp(-s / 1.6);
    surfV = 6.5 * Math.pow(a.surfActive, 1.6) * saltF;
    if (a.cond > 0.2) surfV *= 1 + 0.25 * a.cond;
  }

  /* (4) 라멜라 겔망 (지방알코올 × 유화제) */
  var lamV = 0;
  if (a.lam > 0.05) {
    /* 890·L^2.29 : 세테아릴 1.2 + 유화제 2.0 → 6천 cP(로션),
       세테아릴 3 + 유화제 3 → 3만 cP(크림) 두 점에 맞춘 곡선 */
    var support = cl((a.emul + a.cond * 0.8 + a.surfActive * 0.15) / (0.30 * a.lam), 0, 1);
    lamV = 890 * Math.pow(a.lam, 2.29) * support;
    lamV *= (env.coolFactor || 1);
  }

  /* (5) 내상 부피분율 — Krieger–Dougherty */
  var phiEff = a.phi * Math.pow(1 + 0.02 / Math.max(d32, 0.05), 3);
  var phim = 0.72;
  var KD = Math.pow(1 - Math.min(phiEff, 0.985 * phim) / phim, -1.8);

  /* (6) 무수 제형 */
  var eta;
  if (a.anhydrous) {
    var ov = 0, ow = 0;
    a.rows.forEach(function (r) {
      var v = OILV[r.g.id]; if (v == null) v = (r.g.sol === 'o' ? 40 : 20);
      ov += Math.log(v) * r.c; ow += r.c;
    });
    eta = ow > 0 ? Math.exp(ov / ow) : 30;
    if (a.wax > 0.5) eta *= Math.pow(1 + a.wax, 2.6);
    if (a.powder > 0.5) eta *= Math.pow(1 - Math.min(a.pwdVol / a.totVol, 0.5) / 0.62, -1.8);
  } else {
    eta = (etaSolv + gel + surfV) * KD + lamV;
  }

  /* (7) 전단감점 지수 n */
  var struct = gel + lamV + surfV * 0.4;
  var frac = struct / Math.max(eta, 1);
  var nIdx = cl(1 - 0.78 * frac, 0.16, 1);

  /* (8) 항복응력 (Pa) — 파우더·액적 부유 판정 */
  var yieldS = gel > 20 ? 0.06 * Math.pow(gel, 0.72) : 0;
  if (lamV > 500) yieldS += 0.04 * Math.pow(lamV, 0.72);   /* 라멜라가 액적을 붙든다 */
  if (a.thickers.some(function (t) { return t.g.id === 'xanthan' || t.g.id === 'gellan'; })) yieldS *= 2.2;

  return { eta: eta, gel: gel, lam: lamV, surfV: surfV, KD: KD, n: nIdx,
           yieldStress: yieldS, detail: gelDetail, phiEff: phiEff };
}

/* Brookfield rpm 별 겉보기 점도 */
function apparent(eta12, n, rpm) {
  return eta12 * Math.pow((rpm || 12) / 12, n - 1);
}

/* =====================================================================
   4.5 자외선 차단 — SPF · UVA-PF · PA 등급
   ---------------------------------------------------------------------
   각 필터의 1% 당 기여를 더한 뒤, 실제로 SPF 를 깎아먹는 세 가지로 보정한다.
     · 광불안정   아보벤존은 안정화제가 없으면 빛을 받아 스스로 부서진다
     · 도포막     퍼짐이 나쁘거나 액적이 굵으면 막이 얼룩져 표시값이 안 나온다
     · 미용해     결정이 남은 필터는 그만큼 일을 하지 않는다
   ===================================================================== */
function uvProtect(a, env) {
  if (a.spfRaw < 1) return null;
  var spf = a.spfRaw, pfa = a.pfaRaw;
  var notes = [];

  /* 광안정성 */
  var avo = 0, stabilizer = 0;
  a.rows.forEach(function (r) {
    if (r.g.id === 'ubm') avo += r.c;
    if (['octo', 'bemt', 'eht', 'ps15', 'dhhb', 'mbbt'].indexOf(r.g.id) >= 0) stabilizer += r.c;
  });
  var photo = 1;
  if (avo > 0.2 && stabilizer < avo * 0.8) {
    photo = 0.62;
    notes.push({ sev: 12, ko: '광불안정',
      msg: '아보벤존 ' + avo.toFixed(1) + '% 를 잡아줄 광안정화제가 ' + stabilizer.toFixed(1) +
           '% 뿐이다. 햇빛 아래에서 스스로 분해되어 차단력이 시간에 따라 떨어진다. ' +
           '옥토크릴렌이나 티노소브 계열을 아보벤존의 0.8배 이상 넣어라.' });
  }

  /* 도포막 균일성 */
  var film = cl(0.70 + 0.30 * Math.min(1, a.filmer / 3), 0.70, 1.0);
  var d = env.d32 || 0;
  if (d > 3) film *= cl(1 - (d - 3) / 12, 0.7, 1);
  if (a.uvInorg > 1 && a.emul < 0.8) {
    film *= 0.82;
    notes.push({ sev: 9, ko: '무기 분산 불량',
      msg: '무기 차단제 ' + a.uvInorg.toFixed(1) + '% 에 비해 분산·유화제가 모자란다. ' +
           '입자가 뭉치면 뭉친 만큼 빛이 새어 나가 표시 SPF 가 나오지 않는다.' });
  }

  /* 미용해 필터 */
  var undis = env.uvUndissolved ? 0.7 : 1;

  spf = 1 + (spf - 0) * photo * film * undis;
  pfa = pfa * photo * film * undis;

  var pa = pfa >= 16 ? 'PA++++' : pfa >= 8 ? 'PA+++' : pfa >= 4 ? 'PA++' : pfa >= 2 ? 'PA+' : '등급 없음';
  var broad = pfa >= spf / 3;
  if (pfa < spf / 4 && spf > 15)
    notes.push({ sev: 10, ko: 'UVA 부족',
      msg: 'UVA-PF ' + pfa.toFixed(1) + ' 은 SPF ' + Math.round(spf) + ' 에 비해 너무 낮다. ' +
           'UVB 만 막는 제품이 되어 광노화를 막지 못한다. ' +
           'UVA 필터(다이에틸아미노하이드록시벤조일헥실벤조에이트 · 티노소브 · 징크옥사이드)를 늘려라.' });

  return { spf: Math.max(1, spf), pfa: pfa, pa: pa, broad: broad,
           org: a.uvOrg, inorg: a.uvInorg, film: film, photo: photo, notes: notes };
}

/* =====================================================================
   4.6 거품력 · 경도
   ===================================================================== */
function foaming(a) {
  if (a.foamRaw <= 0.05) return 0;
  var kill = a.oil + a.wax * 0.6 + a.pigment;      /* 오일·실리콘은 거품을 죽인다 */
  return Math.min(100, 5.5 * a.foamRaw / (1 + 0.2 * kill));
}

function hardness(a) {
  if (!a.anhydrous) return 0;
  return a.hardRaw;
}

/* =====================================================================
   5. 탁도 (NTU)
   ===================================================================== */
function turbidity(a, env) {
  var ntu = 0, src = [];

  /* 파우더·무기입자 */
  var pw = 0;
  a.rows.forEach(function (r) { if (r.g.op > 0 && r.g.sol === 'd') pw += r.g.op * r.c; });
  if (pw > 0) { ntu += pw; src.push({ ko: '파우더·무기입자', v: pw }); }

  /* 유화 액적 */
  if (a.phi > 0.001 && env.d32 > 0) {
    var x = env.d32 / 0.12;
    var x4 = Math.pow(x, 4);
    var s = 3.5 * x4 / ((1 + x4) * (1 + 0.25 * x));
    var e = 5.5e4 * a.phi * Math.pow(a.dn / 0.137, 2) * s;
    ntu += e; src.push({ ko: '유화 액적 산란', v: e });
  }

  /* 미셀·고분자 자체 탁도 */
  var mz = 0;
  a.rows.forEach(function (r) { if (r.g.op > 0 && r.g.sol !== 'd') mz += r.g.op * r.c; });
  if (a.anhydrous) mz *= 0.12;                    /* 물이 없으면 미셀 산란도 없다 */
  if (mz > 0) { ntu += mz; src.push({ ko: '용해 원료 자체 탁도', v: mz }); }

  /* 석출 결정 */
  if (env.precipitate > 0) { ntu += env.precipitate; src.push({ ko: '결정 석출·미용해', v: env.precipitate }); }

  /* 기포 */
  if (env.airPct > 0) { var b = 60 * env.airPct; ntu += b; src.push({ ko: '혼입 기포', v: b }); }

  ntu = Math.max(ntu, 0.3);
  return { ntu: ntu, grade: grade(ntu), src: src };
}

function grade(n) {
  if (n < 5) return '투명';
  if (n < 40) return '미탁';
  if (n < 300) return '반투명';
  if (n < 2000) return '유백';
  return '불투명';
}

/* =====================================================================
   6. 색상
   ===================================================================== */
function color(a, env) {
  var L = 0, A = 0, B = 0, W = 0;
  a.rows.forEach(function (r) {
    var w = r.g.tint * r.c;
    if (w <= 0) return;
    L += r.g.lab[0] * w; A += r.g.lab[1] * w; B += r.g.lab[2] * w; W += w;
  });
  /* 산란에 의한 백색 */
  var white = 9 * Math.min(1, (env.ntu || 0) / 600);
  L += 97 * white; A += -0.4 * white; B += 1.2 * white; W += white;
  /* 무색 베이스 */
  L += 99 * 3; A += -0.3 * 3; B += 0.6 * 3; W += 3;

  L /= W; A /= W; B /= W;

  /* 갈변 · 산화 */
  var br = env.browning || 0;
  L -= br * 0.85; A += br * 0.38; B += br * 1.0;

  L = cl(L, 8, 100); A = cl(A, -60, 70); B = cl(B, -60, 90);
  return { L: L, a: A, b: B, hex: labToRgb(L, A, B), browning: br };
}

/* =====================================================================
   7. 안정성 진단
   ===================================================================== */
function stability(a, env) {
  var items = [], score = 100;
  function bad(sev, ko, msg) { items.push({ sev: sev, ko: ko, msg: msg }); score -= sev; }

  var dp = env.drop, v = env.visc, ph = env.pH;

  if (a.oil + a.wax > 1 && a.water > 5) {
    /* HLB */
    if (dp && a.emul > 0.05 && a.rhW > 0.5) {
      var dev = Math.abs(dp.bh - dp.rh);
      if (dev > 3.5) bad(18, 'HLB 불일치',
        '유화제 HLB ' + dp.bh.toFixed(1) + ' 대 오일 요구 HLB ' + dp.rh.toFixed(1) +
        ' — 차이 ' + dev.toFixed(1) + '. 저HLB/고HLB 유화제 비율을 조정하라.');
      else if (dev > 1.6) bad(7, 'HLB 근소 불일치',
        'HLB 차이 ' + dev.toFixed(1) + '. ±1.5 안으로 맞추면 액적이 더 작아진다.');
    }
    if (a.emul < 0.05 && !a.thickers.some(function (t) { return t.g.hlb > 0; }))
      bad(35, '유화제 없음', '오일 ' + (a.oil + a.wax).toFixed(1) + '% 를 잡아줄 유화제가 없다. 즉시 분리된다.');
    else if (dp && dp.starved)
      bad(20, '유화제 부족',
        '계면을 덮을 유화제가 모자라 액적이 ' + dp.dCover.toFixed(2) + ' µm 아래로 내려가지 못한다. 유화제를 늘리거나 오일을 줄여라.');

    /* 크리밍 (Stokes) */
    if (dp && dp.d > 0) {
      var dm = dp.d * 1e-6;
      /* 연속상 점도 — 라멜라·미셀 구조도 액적의 상승을 늦춘다 */
      var etaC = Math.max((v.gel + v.lam * 0.6 + v.surfV * 0.35 +
                           Math.exp(0.035 * a.polyol)) / 1000, 0.001);          /* Pa·s */
      var vel = 100 * 9.81 * dm * dm / (18 * etaC);                              /* m/s */
      var mmday = vel * 86400 * 1000;
      var held = v.yieldStress > 100 * 9.81 * dm / 6;
      env.creamMmDay = held ? 0 : mmday;
      if (!held) {
        if (mmday > 20) bad(25, '크리밍·분리', '액적 ' + dp.d.toFixed(2) + ' µm, 연속상 점도가 낮아 상승 속도 ' + mmday.toFixed(1) + ' mm/일. 하루 이틀이면 층이 보인다.');
        else if (mmday > 2) bad(12, '크리밍 진행', '상승 속도 ' + mmday.toFixed(2) + ' mm/일. 몇 주 안에 위층이 진해진다. 점증제를 올리거나 액적을 더 잘게.');
        else if (mmday > 0.3) bad(4, '완만한 크리밍', '상승 속도 ' + mmday.toFixed(2) + ' mm/일. 흔들면 되돌아오는 수준.');
      }
    }
    /* 상 반전 */
    if (a.phi > 0.70) bad(20, '상 반전 위험', '내상 부피분율 ' + (a.phi * 100).toFixed(0) + '%. 74%를 넘으면 O/W가 W/O로 뒤집힌다.');
  }

  /* 전해질 vs 카보머 */
  var carb = a.thickers.filter(function (t) { return t.g.id === 'carb940' || t.g.id === 'pemulen'; });
  if (carb.length && a.salt > 0.5)
    bad(a.salt > 2 ? 16 : 8, '전해질 부하',
      '염 지수 ' + a.salt.toFixed(2) + '. 카보머 겔이 ' + ((1 - 1 / (1 + 1.9 * a.salt)) * 100).toFixed(0) + '% 만큼 무너졌다. 잔탄검·세피노브 같은 내염 점증제로 바꿔라.');
  if (carb.length && env.alpha < 0.25)
    bad(22, '중화 부족', '카보머 중화도 ' + (env.alpha * 100).toFixed(0) + '%. 점도가 나오지 않는다. TEA·아르지닌·NaOH로 pH 5.5~7까지 올려라.');

  /* pH 적합성 — 비누(지방산 + 알칼리) 제형은 알칼리가 설계다 */
  var soap = a.rows.some(function (r) { return ['myristic', 'lauric', 'stearic'].indexOf(r.g.id) >= 0; }) &&
             a.rows.some(function (r) { return ['koh', 'naoh', 'tea'].indexOf(r.g.id) >= 0; });
  if (ph < 3.0) bad(10, 'pH 과산성', 'pH ' + ph.toFixed(2) + '. 자극 위험이 크다.');
  if (ph > 11.2) bad(16, 'pH 과알칼리', 'pH ' + ph.toFixed(2) + '. 과중화다. 알칼리를 줄여라.');
  else if (ph > 8.5 && !soap) bad(12, 'pH 과알칼리', 'pH ' + ph.toFixed(2) + '. 피부 장벽을 해치고 원료가 가수분해된다.');

  /* 가용화되지 않은 향료·오일 */
  if (dp && dp.minor && dp.rSol < 1.5 && a.water > 20)
    bad(9, '가용화 실패', '향료·오일 ' + (a.oil + a.wax).toFixed(2) + '% 를 잡아줄 가용화제가 모자란다(비 ' +
      dp.rSol.toFixed(1) + ':1). 시간이 지나면 표면에 기름방울이 뜬다. 오일의 4~8배를 넣어라.');

  /* ── 방부 ──────────────────────────────────────────────────────
     가진 방부력(have)을 필요한 방부력(need)으로 나눈다.
     추출물·발효물·전분은 미생물의 먹이라 need 를 올리고,
     높은 폴리올(낮은 수분활성도)과 알칼리 비누는 need 를 내린다.        */
  var have = 0;
  a.rows.forEach(function (r) {
    if (r.g.cat !== 'presv') return;
    var e = r.c / Math.max(r.g.max, 0.01);
    if (['nabenz', 'ksorb', 'levul'].indexOf(r.g.id) >= 0) e *= (1 - smooth(ph, 4.8, 6.2));
    if (['phenox', 'pe9010', 'benzalc'].indexOf(r.g.id) >= 0) e *= (1 - smooth(ph, 7.2, 8.6));
    if (r.g.id === 'cymen') e *= 0.7;
    have += e;
  });
  a.rows.forEach(function (r) {
    if (['hex', 'penta', 'caprylyl', 'ehg'].indexOf(r.g.id) >= 0) have += r.c * 0.28;
    if (r.g.id === 'etoh' && r.c >= 15) have += 0.5;
    if (r.g.id === 'propolis') have += r.c * 0.03;
  });
  if (soap && ph > 9.3) have += 1.0;        /* 알칼리 비누는 그 자체로 미생물을 막는다 */

  var need = 1.0;
  if (a.extract > 5) need += 0.25;
  if (a.extract > 20) need += 0.2;
  if ((a.byCat.powder || 0) > 3 || a.rows.some(function (r) { return r.g.id === 'starch' && r.c > 1; })) need += 0.2;
  if (a.polyol >= 25) need -= 0.3;
  else if (a.polyol >= 15) need -= 0.15;
  if (a.water < 20) need -= 0.45;
  need = Math.max(0.3, need);

  var pres = have / need;
  env.preserve = pres;
  env.presNeed = need;
  if (a.water > 12) {
    if (pres < 0.35) bad(26, '방부 부족',
      '방부 지수 ' + pres.toFixed(2) + '. 수분이 ' + a.water.toFixed(0) + '% 인데 미생물을 막을 수단이 사실상 없다. ' +
      '한 달을 못 간다.');
    else if (pres < 0.75) bad(11, '방부 여유 부족',
      '방부 지수 ' + pres.toFixed(2) + (a.extract > 5 ? ' (추출물 ' + a.extract.toFixed(1) + '% 때문에 요구치가 ' + need.toFixed(2) + '로 올라갔다)' : '') +
      '. 챌린지 테스트를 통과하기 어렵다.');
  }

  /* 석출 */
  if (env.precipNotes) env.precipNotes.forEach(function (t) { bad(t.sev, t.ko, t.msg); });

  /* 열 손상 */
  if (env.lossNotes) env.lossNotes.forEach(function (t) { bad(t.sev, t.ko, t.msg); });

  score = cl(score, 0, 100);
  var g = score >= 90 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : score >= 45 ? 'C' : 'D';
  return { score: Math.round(score), grade: g, items: items };
}

/* =====================================================================
   8. 통합 평가
   ===================================================================== */
function evaluate(rows, env) {
  env = env || {};
  var a = composition(rows);
  var p = pH(rows);
  var alpha = neutralDegree(rows);

  /* 연속상 점도를 먼저 어림잡아 액적 계산에 넣는다 */
  var v0 = viscosity(a, { pH: p, d32: 1.5, alpha: alpha, coolFactor: env.coolFactor });
  var dp = dropletSize(a, {
    tip: env.tip != null ? env.tip : 6.3,
    sec: env.sec != null ? env.sec : 300,
    etaC: Math.exp(0.035 * a.polyol) + v0.gel
  });
  var d32 = dp ? dp.d : 0;

  var v = viscosity(a, { pH: p, d32: d32 || 1, alpha: alpha, coolFactor: env.coolFactor });
  var t = turbidity(a, { d32: d32, precipitate: env.precipitate || 0, airPct: env.airPct || 0 });
  var c = color(a, { ntu: t.ntu, browning: env.browning || 0 });

  var uv = uvProtect(a, { d32: d32, uvUndissolved: env.uvUndissolved });

  var senv = {
    drop: dp, visc: v, pH: p, alpha: alpha,
    precipNotes: (env.precipNotes || []).concat(uv ? uv.notes : []),
    lossNotes: env.lossNotes
  };
  var st = stability(a, senv);

  return {
    agg: a, pH: p, alpha: alpha, drop: dp, d32: d32,
    visc: v, eta: v.eta, nIdx: v.n,
    turb: t, ntu: t.ntu, color: c,
    uv: uv, foam: foaming(a), hard: hardness(a),
    stability: st, cream: senv.creamMmDay || 0,
    preserve: senv.preserve || 0, presNeed: senv.presNeed || 1,
    cost: a.cost, total: a.total
  };
}

G.CHEM = {
  composition: composition, pH: pH, neutralDegree: neutralDegree,
  neutralizerNeeded: neutralizerNeeded, dropletSize: dropletSize,
  viscosity: viscosity, apparent: apparent, turbidity: turbidity,
  color: color, stability: stability, evaluate: evaluate,
  uvProtect: uvProtect, foaming: foaming, hardness: hardness,
  labToRgb: labToRgb, grade: grade, surfActivity: surfActivity, AB: AB, OILV: OILV,
  cl: cl, smooth: smooth
};
})(window);
