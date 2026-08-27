/* =====================================================================
   포뮬라랩 — 학습 과정 (17 챕터 · 102 과제)
   ---------------------------------------------------------------------
   과제 유형
     build    빈 처방 또는 뼈대에서 규격을 맞춘다
     fix      고장난 처방을 넘겨받아 고친다
     process  처방은 그대로, 공정만 고친다
     scale    랩 처방을 지정한 규모로 옮겨 규격을 지킨다
   채점
     필수 조건 전부 → 통과 70점, 추가 조건 비율만큼 +30점
     S 95 · A 85 · B 78 · C 70
   ===================================================================== */
(function (G) {
'use strict';

/* ── 조건 생성기 ───────────────────────────────────────────────── */
var C = {
  spec:     function ()          { return { k: 'spec' }; },
  visc:     function (lo, hi)    { return { k: 'visc', lo: lo, hi: hi }; },
  ph:       function (lo, hi)    { return { k: 'ph', lo: lo, hi: hi }; },
  ntu:      function (lo, hi)    { return { k: 'ntu', lo: lo, hi: hi }; },
  stab:     function (lo)        { return { k: 'stab', lo: lo }; },
  cost:     function (hi)        { return { k: 'cost', hi: hi }; },
  yield_:   function (lo)        { return { k: 'yield', lo: lo }; },
  d32:      function (lo, hi)    { return { k: 'd32', lo: lo, hi: hi }; },
  has:      function (id)        { return { k: 'has', id: id }; },
  no:       function (id)        { return { k: 'no', id: id }; },
  hasCat:   function (c)         { return { k: 'hasCat', cat: c }; },
  noCat:    function (c)         { return { k: 'noCat', cat: c }; },
  maxCat:   function (c, hi)     { return { k: 'maxCat', cat: c, hi: hi }; },
  minCat:   function (c, lo)     { return { k: 'minCat', cat: c, lo: lo }; },
  count:    function (hi)        { return { k: 'count', hi: hi }; },
  total100: function ()          { return { k: 'total100' }; },
  clean:    function (sev)       { return { k: 'clean', sev: sev || 8 }; },
  warnMax:  function (hi)        { return { k: 'warnMax', hi: hi }; },
  preserve: function (lo)        { return { k: 'preserve', lo: lo }; },
  salt:     function (hi)        { return { k: 'salt', hi: hi }; },
  time:     function (hi)        { return { k: 'time', hi: hi }; },
  temp:     function (hi)        { return { k: 'temp', hi: hi }; },
  evap:     function (hi)        { return { k: 'evap', hi: hi }; },
  alpha:    function (lo, hi)    { return { k: 'alpha', lo: lo, hi: hi }; },
  homog:    function (lo)        { return { k: 'homog', lo: lo }; },
  water:    function (lo, hi)    { return { k: 'water', lo: lo, hi: hi }; },
  color:    function (lab, de)   { return { k: 'color', lab: lab, de: de }; },
  air:      function (hi)        { return { k: 'air', hi: hi }; },
  ingErr:   function (id, hi)    { return { k: 'ingErr', id: id, hi: hi }; }
};

/* ── 조건 문구 ─────────────────────────────────────────────────── */
var CN = G.CORE ? null : null;
function catKo(c) { return G.ING.catName(c); }
function ingKo(i) { var g = G.ING.BY[i]; return g ? g.ko : i; }
function rng(lo, hi, u, d) {
  var f = function (v) { return d ? v.toFixed(d) : Math.round(v).toLocaleString('ko-KR'); };
  if (lo != null && hi != null) return f(lo) + ' ~ ' + f(hi) + (u || '');
  if (lo != null) return f(lo) + (u || '') + ' 이상';
  return f(hi) + (u || '') + ' 이하';
}
function label(c, prod) {
  switch (c.k) {
    case 'spec': {
      var p = G.PROD.get(prod), s = p.spec, t = [];
      if (s.visc) t.push('점도 ' + rng(s.visc[0], s.visc[1], ' cP'));
      if (s.ph) t.push('pH ' + rng(s.ph[0], s.ph[1], '', 1));
      if (s.ntu) t.push(s.ntu[0] > 0 ? '탁도 ' + Math.round(s.ntu[0]).toLocaleString('ko-KR') + ' NTU 이상(불투명)'
                                     : '탁도 ' + Math.round(s.ntu[1]).toLocaleString('ko-KR') + ' NTU 이하');
      return '출하 규격 충족 — ' + t.join(' · ');
    }
    case 'visc':  return '점도 ' + rng(c.lo, c.hi, ' cP');
    case 'ph':    return 'pH ' + rng(c.lo, c.hi, '', 1);
    case 'ntu':   return '탁도 ' + rng(c.lo, c.hi, ' NTU');
    case 'stab':  return '안정도 ' + c.lo + '점 이상';
    case 'cost':  return '원가 ' + Math.round(c.hi).toLocaleString('ko-KR') + ' 원/kg 이하';
    case 'yield': return '수율 ' + c.lo + '% 이상';
    case 'd32':   return '평균 액적 ' + rng(c.lo, c.hi, ' µm', 2);
    case 'has':   return ingKo(c.id) + ' 사용';
    case 'no':    return ingKo(c.id) + ' 사용 금지';
    case 'hasCat':return catKo(c.cat) + ' 사용';
    case 'noCat': return catKo(c.cat) + ' 사용 금지';
    case 'maxCat':return catKo(c.cat) + ' 합계 ' + c.hi + '% 이하';
    case 'minCat':return catKo(c.cat) + ' 합계 ' + c.lo + '% 이상';
    case 'count': return '원료 ' + c.hi + '종 이하';
    case 'total100': return '처방 합계 100.00%';
    case 'clean': return '심각한 공정 경고 없음';
    case 'warnMax': return '공정 감점 합계 ' + c.hi + ' 이하';
    case 'preserve': return '방부 지수 ' + c.lo.toFixed(2) + ' 이상';
    case 'salt':  return '염 지수 ' + c.hi.toFixed(1) + ' 이하';
    case 'time':  return '총 제조 시간 ' + c.hi + '분 이하';
    case 'temp':  return '최고 온도 ' + c.hi + '℃ 이하';
    case 'evap':  return '증발 손실 ' + c.hi + '% 이하';
    case 'alpha': return '카보머 중화도 ' + Math.round(c.lo * 100) + '% 이상';
    case 'homog': return '혼합 균질도 ' + c.lo + '% 이상';
    case 'water': return '정제수 ' + rng(c.lo, c.hi, '%', 0);
    case 'color': return '색상 목표와 ΔE ' + c.de + ' 이내';
    case 'ingErr': return ingKo(c.id) + ' 칭량 오차 ' + (c.hi * 100).toFixed(1) + '% 이내';
    case 'air':   return '혼입 기포 ' + c.hi + '% 이하';
  }
  return c.k;
}

/* ── 조건 판정 ─────────────────────────────────────────────────── */
function value(c, run, st) {
  var r = run.res, a = r.agg;
  function catSum(k) { return a.byCat[k] || 0; }
  switch (c.k) {
    case 'visc':  return r.eta;
    case 'ph':    return r.pH;
    case 'ntu':   return r.ntu;
    case 'stab':  return r.stability.score;
    case 'cost':  return r.cost;
    case 'yield': return run.yieldPct;
    case 'd32':   return r.d32 || 0;
    case 'count': return st.rows.filter(function (x) { return x.pct > 0; }).length;
    case 'total100': return st.rows.reduce(function (x, y) { return x + (+y.pct || 0); }, 0);
    case 'maxCat': case 'minCat': return catSum(c.cat);
    case 'hasCat': case 'noCat': return catSum(c.cat);
    case 'warnMax': return run.warn.reduce(function (x, y) { return x + y.sev; }, 0);
    case 'clean': return run.warn.filter(function (w) { return w.sev >= c.sev; }).length;
    case 'preserve': return r.preserve;
    case 'salt':  return a.salt;
    case 'time':  return run.minutes;
    case 'temp':  return run.maxT;
    case 'evap':  return run.evapPct;
    case 'alpha': return r.alpha;
    case 'homog': return run.homog;
    case 'water': return catSum('water') + (a.byCat.humect || 0) * 0;
    case 'air':   return run.airPct;
    case 'ingErr': {
      var it = (run.items || []).filter(function (x) { return x.id === c.id; })[0];
      return it ? Math.abs(it.rel) : 1;
    }
    case 'color': {
      var L = r.color;
      return Math.sqrt(Math.pow(L.L - c.lab[0], 2) + Math.pow(L.a - c.lab[1], 2) + Math.pow(L.b - c.lab[2], 2));
    }
  }
  return 0;
}

function pass(c, run, st, prod) {
  var v = value(c, run, st);
  switch (c.k) {
    case 'spec':  return G.PROD.judge(prod, run.res).ok;
    case 'has':   return st.rows.some(function (x) { return x.id === c.id && x.pct > 0; });
    case 'no':    return !st.rows.some(function (x) { return x.id === c.id && x.pct > 0; });
    case 'hasCat':return v > 0;
    case 'noCat': return v <= 0.0001;
    case 'clean': return v === 0;
    case 'total100': return Math.abs(v - 100) < 0.02;
    case 'color': return v <= c.de;
  }
  if (c.lo != null && v < c.lo) return false;
  if (c.hi != null && v > c.hi) return false;
  return true;
}

function display(c, run, st) {
  var v = value(c, run, st);
  switch (c.k) {
    case 'spec': return '';
    case 'has': case 'no': return '';
    case 'hasCat': case 'noCat': return v.toFixed(2) + '%';
    case 'clean': return v + '건';
    case 'ph': case 'alpha': return c.k === 'alpha' ? Math.round(v * 100) + '%' : v.toFixed(2);
    case 'd32': return v ? v.toFixed(2) + ' µm' : '—';
    case 'stab': case 'count': case 'warnMax': return Math.round(v) + '';
    case 'yield': case 'homog': case 'evap': case 'air': return v.toFixed(1) + '%';
    case 'preserve': return v.toFixed(2);
    case 'salt': return v.toFixed(2);
    case 'time': return Math.round(v) + '분';
    case 'temp': return Math.round(v) + '℃';
    case 'total100': return v.toFixed(2) + '%';
    case 'maxCat': case 'minCat': case 'water': return v.toFixed(2) + '%';
    case 'color': return 'ΔE ' + v.toFixed(1);
    case 'ingErr': return (v * 100).toFixed(2) + '%';
  }
  return Math.round(v).toLocaleString('ko-KR');
}

/* ── 채점 ──────────────────────────────────────────────────────── */
function grade(m, run, st) {
  var must = m.must.map(function (c) { return { c: c, ok: pass(c, run, st, m.ch), v: display(c, run, st), t: label(c, m.ch) }; });
  var bonus = (m.bonus || []).map(function (c) { return { c: c, ok: pass(c, run, st, m.ch), v: display(c, run, st), t: label(c, m.ch) }; });
  var mOk = must.every(function (x) { return x.ok; });
  var bHit = bonus.filter(function (x) { return x.ok; }).length;
  var score = mOk ? Math.round(70 + (bonus.length ? bHit / bonus.length * 30 : 30)) : 0;
  var g = !mOk ? '—' : score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 78 ? 'B' : 'C';
  return { must: must, bonus: bonus, ok: mOk, score: score, grade: g, bHit: bHit };
}

/* ── 처방 변형 헬퍼 : 기준 처방에서 값을 바꿔 "고장난" 처방을 만든다 ── */
function mutate(prodKey, changes) {
  var base = G.PROD.get(prodKey).base.map(function (r) { return { id: r.id, pct: r.pct }; });
  (changes || []).forEach(function (ch) {
    var id = ch[0], v = ch[1];
    var row = base.filter(function (r) { return r.id === id; })[0];
    if (v === 0 || v == null) { base = base.filter(function (r) { return r.id !== id; }); return; }
    if (row) row.pct = v; else base.push({ id: id, pct: v });
  });
  return base;
}
/* 정제수로 100% 맞춰 돌려준다 */
function fix100(rows) {
  var other = rows.reduce(function (a, b) { return a + (b.id === 'aqua' ? 0 : b.pct); }, 0);
  var w = rows.filter(function (r) { return r.id === 'aqua'; })[0];
  if (w) w.pct = +(100 - other).toFixed(4);
  return rows;
}
function broken(prodKey, changes, keepTotal) {
  var r = mutate(prodKey, changes);
  return keepTotal === false ? r : fix100(r);
}

/* ── 과제 정의 ─────────────────────────────────────────────────── */
function M(ch, no, ko, type, brief, must, bonus, o) {
  var m = { ch: ch, no: no, ko: ko, type: type, brief: brief, must: must, bonus: bonus || [] };
  for (var k in (o || {})) m[k] = o[k];
  m.id = ch + '-' + no;
  return m;
}

var L = [];

/* ── 1. 스킨 · 토너 ───────────────────────────────────────────── */
L.push(
M('toner',1,'처방의 첫 줄','build',
  '정제수와 보습제만으로 합계를 정확히 100.00% 로 맞춰라. 모든 처방은 여기서 시작한다. 오른쪽 아래 "물로 맞추기" 를 쓰면 정제수가 나머지를 채운다.',
  [C.total100(), C.has('aqua'), C.minCat('humect',5)],
  [C.count(6), C.visc(1,20)], { start:'empty' }),
M('toner',2,'썩지 않게 만들기','build',
  '물이 든 화장품은 반드시 미생물을 막아야 한다. 방부제를 넣어 방부 지수 0.8 이상을 만들되, 페녹시에탄올은 한도 1% 를 넘기지 마라.',
  [C.total100(), C.preserve(0.8), C.ph(4.5,6.5)],
  [C.stab(90), C.cost(1500)], { start:'empty' }),
M('toner',3,'투명하게 향을 녹인다','build',
  '향료 0.10% 를 물에 투명하게 녹여라. 가용화제를 향의 4~8배로 잡는 것이 요령이다. 부족하면 그 즉시 뿌예진다.',
  [C.total100(), C.has('parfum'), C.ntu(0,8), C.preserve(0.7)],
  [C.ntu(0,3), C.cost(2000)], { start:'empty' }),
M('toner',4,'pH 를 손끝으로 맞춘다','build',
  '피부에 가장 편한 약산성 pH 5.0 ± 0.3 을 맞춰라. 산 한 방울이 pH 를 얼마나 움직이는지 몸으로 익히는 과제다.',
  [C.total100(), C.ph(4.7,5.3), C.preserve(0.7), C.spec()],
  [C.ph(4.9,5.1), C.stab(92)], { start:'empty' }),
M('toner',5,'원가 1,000원의 벽','build',
  '규격을 지키면서 원가를 kg 당 1,000원 아래로 낮춰라. 비싼 원료를 덜어내고도 규격이 유지되는지가 관건이다.',
  [C.spec(), C.total100(), C.cost(1000), C.preserve(0.7)],
  [C.cost(800), C.stab(90)], { start:'base' }),
M('toner',6,'뿌예진 토너','fix',
  '출고 직전 토너가 우유처럼 흐려졌다. 향은 그대로 두고 맑게 되돌려라.',
  [C.spec(), C.total100(), C.has('parfum'), C.ntu(0,8), C.stab(92)],
  [C.ntu(0,2), C.stab(95)],
  { start: broken('toner',[['parfum',0.35],['peg40rch',0.15]]), hint:'가용화제 대 오일 비율이 2:1 아래로 내려가면 미셀이 오일을 못 품는다.' })
);

/* ── 2. 미스트 ────────────────────────────────────────────────── */
L.push(
M('mist',1,'분무되는 점도','build',
  '미스트는 점도가 조금만 있어도 노즐이 막히고 입자가 굵어진다. 점증제 없이 규격을 맞춰라.',
  [C.spec(), C.total100(), C.noCat('thick'), C.preserve(0.7)],
  [C.visc(1,3), C.cost(1200)], { start:'empty' }),
M('mist',2,'방부제 없이 지키기','build',
  '다이올(1,2-헥산다이올·펜틸렌글라이콜·카프릴릴글라이콜)만으로 방부 지수 0.8 을 만들어라. "무방부" 표방 처방의 실체다.',
  [C.spec(), C.total100(), C.noCat('presv'), C.preserve(0.8)],
  [C.cost(3000), C.stab(88)], { start: broken('mist',[['phenox',0]]) }),
M('mist',3,'청량한 알코올 미스트','build',
  '에탄올 10% 이상으로 시원한 사용감을 내면서도 맑기를 지켜라.',
  [C.spec(), C.total100(), C.has('etoh'), C.ntu(0,5)],
  [C.stab(88), C.cost(2000)], { start:'empty' }),
M('mist',4,'얼룩을 남기지 않는다','build',
  '분사 후 얼룩은 전해질과 비휘발 고형분이 만든다. 염 지수 0.4 이하로 눌러라.',
  [C.spec(), C.total100(), C.salt(0.4), C.preserve(0.7)],
  [C.salt(0.2), C.count(9)], { start:'empty' }),
M('mist',5,'가벼움과 보습 사이','build',
  '보습제 합계는 8% 이하로 두면서 안정도 90 이상을 유지하라. 미스트는 남는 것이 적어야 한다.',
  [C.spec(), C.total100(), C.maxCat('humect',4), C.stab(93)],
  [C.cost(1500), C.count(10)], { start:'base' }),
M('mist',6,'막히는 노즐','fix',
  '고객 클레임 — 미스트가 뿜어지지 않고 뚝뚝 떨어진다. 원인을 찾아 제거하라.',
  [C.spec(), C.total100(), C.noCat('thick'), C.visc(1,5)],
  [C.ntu(0,3), C.stab(90)],
  { start: broken('mist',[['xanthan',0.25]]), hint:'미스트에 점증제가 들어가면 분무 입자가 굵어지고 노즐이 막힌다.' })
);

/* ── 3. 에센스 (냉공정) ───────────────────────────────────────── */
L.push(
M('essence',1,'불을 쓰지 않는 제조','build',
  '가열 없이 상온에서 점도 2,000 cP 이상을 만들어라. 중화가 필요 없는 냉공정 점증제가 답이다.',
  [C.visc(2000,10000), C.total100(), C.temp(45), C.preserve(0.7)],
  [C.time(90), C.stab(92)], { start:'empty' }),
M('essence',2,'나이아신아마이드 5%','build',
  '미백·주름 이중 기능성을 노리고 나이아신아마이드를 5% 넣어라. 전해질이 늘어도 점도가 무너지지 않아야 한다.',
  [C.has('niacin'), C.minCat('active',5), C.visc(1500,10000), C.ph(5,6.8), C.total100()],
  [C.stab(90), C.ntu(0,120)], { start:'empty' }),
M('essence',3,'실을 늘어뜨리는 보습','build',
  '고분자 히알루론산으로 특유의 늘어짐을 만들되 덩어리 없이 완전히 수화시켜라.',
  [C.has('ha'), C.spec(), C.total100(), C.clean()],
  [C.stab(92), C.ntu(0,60)], { start:'empty' }),
M('essence',4,'한 시간 안에 끝낸다','process',
  '냉공정의 최대 장점은 시간이다. 총 제조 시간 75분 안에 규격 제품을 완성하라.',
  [C.spec(), C.total100(), C.time(75), C.temp(45)],
  [C.time(60), C.stab(92)], { start:'base' }),
M('essence',5,'열에 약한 것들','build',
  '판테놀·펩타이드·추출물을 살려라. 최고 온도 40℃ 이하에서 안정도 92 이상.',
  [C.temp(42), C.stab(94), C.spec(), C.total100(), C.has('pep')],
  [C.cost(9000), C.count(14)], { start:'base' }),
M('essence',6,'덩어리진 에센스','fix',
  '고분자를 물에 그대로 부었더니 어묵 같은 덩어리(fish-eye)가 생기고 점도가 절반밖에 안 나온다. 처방으로 해결하라.',
  [C.visc(2000,10000), C.total100(), C.spec(), C.clean()],
  [C.stab(92), C.ntu(0,100)],
  { start: broken('essence',[['aristo',0.25],['naclthick',0.3]]),
    hint:'점증제가 모자라고, 소금이 남은 점도마저 깎아먹고 있다.' })
);

/* ── 4. 세럼 · 앰플 (카보머 겔) ───────────────────────────────── */
L.push(
M('serum',1,'수화 다음에 중화','build',
  '카보머는 물에 완전히 풀린 뒤에야 중화해야 점도가 나온다. 카보머 0.3% 이상으로 규격을 맞춰라.',
  [C.has('carb940'), C.alpha(0.5), C.spec(), C.total100()],
  [C.alpha(0.7,1.0), C.stab(90)], { start:'empty' }),
M('serum',2,'중화도가 곧 점도다','build',
  '중화제 양을 조절해 pH 5.8~6.5, 중화도 70% 이상을 만들어라. 넘치면 오히려 점도가 떨어진다.',
  [C.has('carb940'), C.ph(5.8,6.5), C.alpha(0.7,1.05), C.total100()],
  [C.visc(4000,12000), C.stab(92)], { start:'empty' }),
M('serum',3,'활성과 점도의 줄다리기','build',
  '활성 성분을 합계 7% 이상 넣고도 점도 2,000 cP 이상을 지켜라. 카보머로는 어렵다면 다른 점증제를 고려하라.',
  [C.minCat('active',7), C.visc(2000,12000), C.ph(4.5,6.8), C.total100()],
  [C.ntu(0,150), C.stab(88)], { start:'empty' }),
M('serum',4,'0.04% 를 맞추는 법','scale',
  '주름개선 고시 원료 아데노신은 정확히 0.04% 여야 한다. 100 g 배치에서 이 극미량을 맞춰 보라. ' +
  '계량 오차가 얼마나 크게 나오는지 배치 기록을 확인하라. 배치 규모는 바꿔도 된다.',
  [C.has('adeno'), C.spec(), C.total100(), C.ingErr('adeno',0.02)],
  [C.ingErr('adeno',0.005), C.yield_(90)],
  { batchG:100, rigKey:'beaker', start:'base',
    hint:'저울 눈금보다 작은 양은 1% 희석액을 만들어 계량한다. 배치를 키우면 상대 오차가 줄어든다.' }),
M('serum',5,'변색을 막는 두 가지','build',
  '킬레이트제와 항산화제를 함께 넣어 갈변을 막아라. 금속 이온을 잡고 산소를 잡는 것이 순서다.',
  [C.has('edta'), C.spec(), C.total100(), C.stab(88)],
  [C.has('tocoph'), C.salt(2.5)], { start:'base' }),
M('serum',6,'점도가 안 나오는 세럼','fix',
  '카보머를 규정대로 넣었는데 물처럼 묽다. 배치 기록의 pH 와 중화도를 보라.',
  [C.spec(), C.total100(), C.alpha(0.6), C.visc(1500,12000)],
  [C.ph(5.5,6.5), C.stab(90)],
  { start: broken('serum',[['arginine',0.02]]), hint:'중화되지 않은 카보머는 pH 3 대의 묽은 산성 분산액일 뿐이다.' })
);

/* ── 5. 수분 젤 ───────────────────────────────────────────────── */
L.push(
M('gel',1,'유리처럼 맑은 겔','build',
  '카보머로 점도 30,000 cP 이상, 탁도 20 NTU 이하의 투명 겔을 만들어라.',
  [C.visc(30000,80000), C.ntu(0,20), C.total100(), C.ph(5,7)],
  [C.stab(92), C.cost(2000)], { start:'empty' }),
M('gel',2,'중화제를 고른다','build',
  '트로메타민이나 아르지닌으로 중화해 pH 6.0~6.8 을 맞춰라. TEA 는 쓰지 않는다.',
  [C.no('tea'), C.ph(6,6.8), C.spec(), C.total100()],
  [C.has('arginine'), C.stab(92)], { start:'empty' }),
M('gel',3,'기포와의 싸움','process',
  '겔에 들어간 기포는 저절로 빠지지 않는다. 진공 탈포 시간을 늘려 혼입 기포 0.5% 이하로 만들어라.',
  [C.air(0.5), C.spec(), C.total100()],
  [C.air(0.2), C.ntu(0,20)],
  { start:'base', batchG:20000,
    pm:[{t:'vacuum',set:{min:1,vac:false}},{t:'neutralize',set:{homo:2500}}],
    hint:'탈포 스텝의 진공을 켜고 시간을 늘려라. 겔에 들어간 기포는 저절로 빠지지 않는다.' }),
M('gel',4,'천천히 떨어뜨린다','process',
  '중화제를 20분 이상에 걸쳐 적하해 국부 과중화를 막아라. 급속 중화 경고가 없어야 한다.',
  [C.clean(), C.spec(), C.total100(), C.visc(15000,60000)],
  [C.stab(94), C.air(0.3)],
  { start:'base', pm:[{t:'neutralize',set:{min:4}}],
    hint:'중화 스텝의 시간을 20분 이상으로 늘려라.' }),
M('gel',5,'전해질을 견디는 겔','build',
  '나이아신아마이드 4% 와 소듐하이알루로네이트를 넣고도 점도 12,000 cP 이상을 지켜라. 카보머만으로는 무너진다.',
  [C.has('niacin'), C.visc(12000,60000), C.total100(), C.ph(5,7)],
  [C.ntu(0,60), C.stab(92)], { start:'empty' }),
M('gel',6,'소금 한 스푼','fix',
  '누가 배합 중 소금을 넣었다. 겔이 물이 됐다. 처방을 되살려라.',
  [C.visc(10000,60000), C.spec(), C.total100()],
  [C.salt(1.0), C.stab(92)],
  { start: broken('gel',[['naclthick',0.6]]), hint:'카보머는 전해질 앞에서 사슬이 오그라든다. 소금을 빼거나 내염 점증제로 바꿔라.' })
);

/* ── 6. 로션 ──────────────────────────────────────────────────── */
L.push(
M('lotion',1,'첫 번째 유화','build',
  '오일 10% 이상을 물에 안정하게 분산시켜라. 유화제 없이는 시작도 안 된다.',
  [C.minCat('oil',10), C.hasCat('emul'), C.stab(80), C.total100()],
  [C.spec(), C.d32(0,3)], { start:'empty' }),
M('lotion',2,'요구 HLB 를 맞춘다','build',
  '오일이 요구하는 HLB 와 유화제 혼합 HLB 를 ±1.5 안으로 맞춰라. 결과 화면의 HLB 진단을 보면서 조정하면 된다.',
  [C.spec(), C.stab(90), C.total100(), C.d32(0,2.5)],
  [C.stab(95), C.d32(0,1.5)], { start:'empty' }),
M('lotion',3,'라멜라가 만드는 되기','build',
  '점증제를 쓰지 않고 지방알코올과 유화제만으로 점도 4,000 cP 이상을 만들어라.',
  [C.noCat('thick'), C.visc(4000,9000), C.total100(), C.stab(88)],
  [C.d32(0,2), C.cost(2200)], { start:'empty' }),
M('lotion',4,'크리밍을 멈춰라','build',
  '액적을 1.5 µm 아래로 줄이고 연속상에 점도를 줘서 층 분리를 막아라. 안정도 94 이상.',
  [C.d32(0,1.5), C.stab(94), C.spec(), C.total100()],
  [C.stab(97), C.ntu(2000,1e9)], { start:'base' }),
M('lotion',5,'40℃ 의 규칙','process',
  '방부제와 향료는 40℃ 아래에서 넣어야 한다. 투입 온도 경고를 모두 없애라.',
  [C.clean(), C.spec(), C.total100(), C.warnMax(6)],
  [C.warnMax(0), C.stab(94)],
  { start:'base', pm:[{t:'add',set:{temp:70}},{t:'cool',set:{temp:70}}],
    hint:'냉각 스텝의 목표 온도를 낮추고, 첨가 스텝의 온도를 38℃ 이하로 내려라.' }),
M('lotion',6,'분리되는 로션','fix',
  '3일 만에 위쪽에 노란 층이 떴다. 유화계를 다시 짜라.',
  [C.stab(90), C.spec(), C.total100(), C.d32(0,2.2)],
  [C.stab(95), C.d32(0,1.5)],
  { start: broken('lotion',[['gmsse',0.3],['ceteryl',0.5],['minoil',8]]),
    hint:'유화제가 계면을 다 덮지 못하면 액적이 커지고 스토크스 법칙대로 떠오른다.' })
);

/* ── 7. 크림 ──────────────────────────────────────────────────── */
L.push(
M('cream',1,'되직한 크림','build',
  '점도 20,000 cP 이상의 크림을 만들어라. 지방알코올과 유화제의 비율이 열쇠다.',
  [C.visc(20000,60000), C.stab(88), C.total100()],
  [C.spec(), C.d32(0,2)], { start:'empty' }),
M('cream',2,'세라마이드를 녹인다','process',
  '세라마이드는 75℃ 이상에서 완전히 녹여야 한다. 미용해 경고를 없애라.',
  [C.has('cera'), C.clean(), C.spec(), C.total100()],
  [C.ntu(2000,1e9), C.stab(94)],
  { start:'base', pm:[{t:'melt',set:{temp:66}},{t:'heat',set:{temp:66}},{t:'emulsify',set:{temp:66}}],
    hint:'용해 스텝의 온도를 75℃ 이상으로 올려야 세라마이드가 다 녹는다.' }),
M('cream',3,'내상 부피분율','build',
  '오일과 왁스 합계를 22% 이상으로 올리면서 상 반전 없이 안정도 90 을 지켜라.',
  [C.minCat('oil',18), C.stab(90), C.visc(18000,60000), C.total100()],
  [C.stab(95), C.cost(8000)], { start:'empty' }),
M('cream',4,'급냉과 서냉','scale',
  '같은 처방을 1톤 탱크에서 만들면 냉각이 느려 라멜라 결정이 커지고 점도가 떨어진다. ' +
  '규격 하한 15,000 cP 를 지키도록 처방을 보강하라.',
  [C.spec(), C.total100(), C.visc(20000,60000)],
  [C.yield_(97), C.stab(94)],
  { batchG:1000000, rigKey:'plant',
    start: broken('cream',[['ceteryl',1.6],['gmsse',1.8],['gms',0.6]]),
    hint:'랩보다 묽어지는 만큼 지방알코올이나 유화제를 조금 더 넣어 라멜라를 두껍게 한다.' }),
M('cream',5,'원가 5,000원','build',
  '규격을 지키면서 원가를 kg 당 5,000원 아래로. 스쿠알란과 세라마이드가 원가의 대부분이다.',
  [C.spec(), C.cost(5000), C.total100(), C.stab(90)],
  [C.cost(4000), C.stab(94)], { start:'base' }),
M('cream',6,'알갱이가 씹히는 크림','fix',
  '바르면 오돌토돌한 것이 만져진다. 원인이 될 만한 원료가 셋 있다.',
  [C.clean(), C.spec(), C.total100(), C.ntu(800,1e9)],
  [C.stab(94), C.cost(8000)],
  { start: broken('cream',[['allantoin',0.9],['behenyl',1.2]]),
    hint:'용해도를 넘긴 알란토인과, 융점까지 못 올린 고급 지방알코올을 확인하라.' })
);

/* ── 8. 선크림 ────────────────────────────────────────────────── */
L.push(
M('sun',1,'유기 차단제를 녹인다','build',
  '유기 자외선차단제 합계 12% 이상을 완전히 녹여라. 결정이 남으면 SPF 가 나오지 않는다.',
  [C.minCat('uv',12), C.clean(), C.total100(), C.stab(88)],
  [C.spec(), C.cost(20000)], { start:'empty' }),
M('sun',2,'백탁과 차단력','build',
  '티타늄디옥사이드를 넣어 물리적 차단을 더하되 안정도 90 이상을 지켜라.',
  [C.has('tio2uv'), C.stab(90), C.spec(), C.total100()],
  [C.d32(0,2.5), C.cost(18000)], { start:'empty' }),
M('sun',3,'징크옥사이드의 함정','build',
  '징크옥사이드는 pH 를 끌어올리고 카보머를 죽인다. 카보머 없이 점도 8,000 cP 이상을 만들어라.',
  [C.has('zno'), C.no('carb940'), C.visc(8000,30000), C.ph(5.5,7.8), C.total100()],
  [C.stab(90), C.d32(0,3)], { start:'empty' }),
M('sun',4,'물에 지지 않는다','build',
  '휘발성 탄화수소나 실리콘으로 워터프루프 필름을 만들어라. 아이소도데케인 또는 사이클로펜타실록산 사용.',
  [C.spec(), C.total100(), C.stab(92), C.clean(), C.minCat('sili',3)],
  [C.has('isododec'), C.cost(20000)], { start:'base' }),
M('sun',5,'아보벤존 살리기','build',
  '아보벤존은 빛을 받으면 스스로 부서진다. 옥토크릴렌을 함께 넣어 광안정화하라.',
  [C.has('ubm'), C.has('octo'), C.spec(), C.total100()],
  [C.stab(92), C.cost(22000)], { start:'empty' }),
M('sun',6,'알갱이 생긴 선크림','fix',
  '보관 중 표면에 하얀 결정이 자랐다. 용해 온도와 용제를 손봐라.',
  [C.clean(), C.spec(), C.total100(), C.stab(90)],
  [C.stab(94), C.cost(18000)],
  { start: broken('sun',[['bemt',4],['dcc',0],['bos',0]]),
    pm:[{t:'melt',set:{temp:74}},{t:'heat',set:{temp:74}},{t:'emulsify',set:{temp:74}}],
    hint:'BEMT 는 결정성이 강해 80℃ 이상과 좋은 용제(다이카프릴릴카보네이트·부틸옥틸살리실레이트)가 필요하다.' })
);

/* ── 9. 샴푸 ──────────────────────────────────────────────────── */
L.push(
M('shampoo',1,'거품을 만든다','build',
  '계면활성제 활성분이 충분해야 거품이 산다. 세정 계면활성제 합계 24% 이상(원료 기준)으로 규격을 맞춰라.',
  [C.minCat('surf',24), C.spec(), C.total100()],
  [C.stab(90), C.cost(2500)], { start:'empty' }),
M('shampoo',2,'솔트 커브','build',
  '소금만으로 점도 4,000~8,000 cP 를 맞춰라. 너무 넣으면 오히려 묽어진다.',
  [C.has('naclthick'), C.visc(4000,8000), C.total100(), C.ph(4.8,6)],
  [C.visc(5000,7000), C.stab(92)],
  { start: broken('shampoo',[['naclthick',0]]) }),
M('shampoo',3,'순한 샴푸','build',
  '설페이트 없이 아미노산계·아이세티오네이트로 규격을 맞춰라.',
  [C.no('sles'), C.spec(), C.total100(), C.stab(88)],
  [C.cost(6000), C.visc(3500,8000)], { start:'empty' }),
M('shampoo',4,'헹굴 때 얹히는 것','build',
  '폴리쿼터늄-10 을 넣어 2-in-1 컨디셔닝을 더하되 점도와 탁도 규격을 지켜라.',
  [C.has('pq10'), C.spec(), C.total100()],
  [C.stab(92), C.ntu(0,600)], { start:'empty' }),
M('shampoo',5,'두피의 pH','build',
  'pH 5.0~5.6 으로 맞춰라. 알칼리 샴푸는 큐티클을 들뜨게 한다.',
  [C.ph(5.0,5.6), C.spec(), C.total100()],
  [C.stab(92), C.cost(2500)],
  { start: broken('shampoo',[['citric',0]]) }),
M('shampoo',6,'침전한 샴푸','fix',
  '탱크 바닥에 흰 덩어리가 가라앉았다. 이온 조합을 다시 보라.',
  [C.clean(), C.spec(), C.total100(), C.stab(85)],
  [C.stab(92), C.ntu(0,800)],
  { start: broken('shampoo',[['ctac',1.2],['btms50',1.5]]),
    hint:'양이온 계면활성제와 음이온 계면활성제는 만나는 즉시 복합체를 만들어 침전한다.' })
);

/* ── 10. 컨디셔너 · 린스 ──────────────────────────────────────── */
L.push(
M('conditioner',1,'양이온이 붙는 조건','build',
  'BTMS 와 지방알코올로 라멜라를 짜고 pH 를 4.5 이하로 낮춰라. 그래야 모발에 달라붙는다.',
  [C.has('btms50'), C.ph(3.5,4.5), C.visc(8000,30000), C.total100()],
  [C.stab(90), C.cost(2500)], { start:'empty' }),
M('conditioner',2,'되기를 만든다','build',
  '점도 15,000 cP 이상. BTMS 와 세틸알코올의 비율을 조정하라.',
  [C.visc(15000,30000), C.spec(), C.total100()],
  [C.stab(92), C.cost(3000)], { start:'empty' }),
M('conditioner',3,'손상 부위만 골라 붙는다','build',
  '아모다이메티콘을 넣어 손상 모발에 선택적으로 흡착시켜라.',
  [C.has('amodime'), C.spec(), C.total100(), C.stab(90)],
  [C.stab(94), C.visc(12000,26000)],
  { start: broken('conditioner',[['amodime',0]]) }),
M('conditioner',4,'음이온 금지','build',
  '음이온 계면활성제를 하나도 쓰지 않고 규격을 맞춰라. 침전을 피하는 유일한 방법이다.',
  [C.no('sles'), C.no('cocoglut'), C.no('slmi'), C.spec(), C.total100(), C.clean()],
  [C.stab(92), C.cost(2600)], { start:'empty' }),
M('conditioner',5,'헹굼감','build',
  '실리콘 합계 2% 이상으로 미끄러운 헹굼감을 만들되 점도 규격을 지켜라.',
  [C.minCat('sili',2.5), C.spec(), C.total100(), C.ph(3.5,5)],
  [C.stab(94), C.cost(3200)], { start:'base' }),
M('conditioner',6,'묽어진 린스','fix',
  '물처럼 흘러내려 손에 잡히지 않는다. 라멜라를 다시 세워라.',
  [C.visc(8000,30000), C.spec(), C.total100()],
  [C.stab(92), C.visc(14000,26000)],
  { start: broken('conditioner',[['btms50',0.8],['cetyl',0.3]]),
    hint:'양이온 계면활성제와 지방알코올이 함께 있어야 라멜라가 짜인다. 둘 다 모자란다.' })
);

/* ── 11. 클렌징 폼 ────────────────────────────────────────────── */
L.push(
M('cleansingfoam',1,'그 자리에서 비누를 만든다','build',
  '지방산과 KOH 로 비누화하라. pH 9.5~10.5, 점도 30,000 cP 이상.',
  [C.has('koh'), C.ph(9.3,10.6), C.visc(30000,180000), C.total100()],
  [C.stab(85), C.cost(3000)], { start:'empty' }),
M('cleansingfoam',2,'90%만 중화한다','build',
  '알칼리를 이론량 전부 넣으면 강알칼리가 남아 자극이 된다. pH 10.2 이하로 눌러라.',
  [C.ph(9.2,10.2), C.spec(), C.total100()],
  [C.ph(9.5,10.0), C.stab(88)],
  { start: broken('cleansingfoam',[['koh',6.4]]) }),
M('cleansingfoam',3,'크리미한 거품','build',
  '미리스틱애씨드 10% 이상으로 조밀한 거품을 만들어라.',
  [C.has('myristic'), C.minCat('surf',20), C.spec(), C.total100()],
  [C.stab(88), C.cost(2800)], { start:'empty' }),
M('cleansingfoam',4,'당김 없는 마무리','build',
  '글리세린을 15% 이상 넣어 세정 후 당김을 줄여라. 점도가 무너지지 않게.',
  [C.minCat('humect',18), C.spec(), C.total100()],
  [C.stab(88), C.visc(40000,150000)],
  { start: broken('cleansingfoam',[['gly',5]]) }),
M('cleansingfoam',5,'천천히 적하','process',
  '비누화는 발열하며 점도가 급상승한다. 알칼리 적하를 30분 이상으로 늘리고 경고를 없애라.',
  [C.clean(), C.spec(), C.total100()],
  [C.warnMax(10), C.stab(88)],
  { start:'base', batchG:50000, pm:[{t:'neutralize',set:{min:6}}],
    hint:'중화 스텝 시간을 30분 이상으로 늘려라.' }),
M('cleansingfoam',6,'눈이 시린 폼','fix',
  '사용자가 눈이 따갑다고 한다. 과중화다. 알칼리를 다시 계산하라.',
  [C.ph(9.2,10.3), C.spec(), C.total100()],
  [C.ph(9.5,10.0), C.stab(88)],
  { start: broken('cleansingfoam',[['koh',7.2]]), hint:'지방산 당량의 90~95% 가 정석이다. 지금은 넘치고 있다.' })
);

/* ── 12. 클렌징 오일 ──────────────────────────────────────────── */
L.push(
M('cleansingoil',1,'물이 없는 처방','build',
  '정제수 없이 오일만으로 100% 를 맞춰라. 물이 없으면 방부제도 필요 없다.',
  [C.no('aqua'), C.total100(), C.noCat('presv'), C.spec()],
  [C.cost(8000), C.count(9)], { start:'empty' }),
M('cleansingoil',2,'물에 씻겨 나가게','build',
  '자기유화제를 15% 이상 넣어 물과 만나면 하얗게 유화되도록 만들어라.',
  [C.total100(), C.minCat('surf',15), C.spec()],
  [C.cost(9000), C.visc(25,70)], { start:'empty' }),
M('cleansingoil',3,'가볍게 발린다','build',
  '점도 40 cP 이하로 산뜻하게. 오일 점도의 로그 평균이 최종 점도가 된다.',
  [C.visc(15,40), C.total100(), C.minCat('surf',15)],
  [C.visc(20,32), C.cost(9000)], { start:'empty' }),
M('cleansingoil',4,'산패를 막는다','build',
  '항산화제를 넣어 불포화 오일의 산패를 막아라.',
  [C.has('tocoph'), C.has('bht'), C.spec(), C.total100(), C.stab(95)],
  [C.cost(9000), C.minCat('surf',15)],
  { start: broken('cleansingoil',[['tocoph',0],['bht',0]], false) }),
M('cleansingoil',5,'원가 6,000원','build',
  '규격을 지키면서 kg 당 6,000원 아래로 낮춰라. 미네랄오일이 답이 될 수 있다.',
  [C.spec(), C.cost(6000), C.total100(), C.minCat('surf',15)],
  [C.cost(5000), C.stab(95)], { start:'base' }),
M('cleansingoil',6,'안 씻기는 클렌징오일','fix',
  '헹궈도 얼굴에 기름막이 남는다는 클레임. 자기유화제를 다시 보라.',
  [C.minCat('surf',15), C.spec(), C.total100()],
  [C.visc(20,50), C.cost(8000)],
  { start: broken('cleansingoil',[['peg7gc',4],['minoil',32]]),
    hint:'자기유화제가 15~20% 는 되어야 물과 만나 유화된다.' })
);

/* ── 13. 바디워시 ─────────────────────────────────────────────── */
L.push(
M('bodywash',1,'넓은 면적을 씻는다','build',
  '규격을 맞추되 음이온 계면활성제 비율을 낮춰 자극을 줄여라.',
  [C.spec(), C.total100(), C.stab(88)],
  [C.cost(2200), C.visc(3000,7000)], { start:'empty' }),
M('bodywash',2,'소금 없이 점도 내기','build',
  '회합형 점증제(PEG-150 다이스테아레이트)로 소금 없이 점도 4,000 cP 이상.',
  [C.no('naclthick'), C.visc(4000,8000), C.total100()],
  [C.stab(90), C.cost(2600)], { start:'empty' }),
M('bodywash',3,'베이비 등급','build',
  '설페이트와 강한 음이온 없이 데실글루코사이드·베타인으로 규격을 맞춰라.',
  [C.no('sles'), C.spec(), C.total100(), C.ph(4.8,6)],
  [C.stab(90), C.cost(5000)], { start:'empty' }),
M('bodywash',4,'헹굼 뒤에 남기는 것','build',
  '오일이나 실리콘을 1% 이상 넣어 세정 후 당김을 줄여라. 탁도 규격은 지킨다.',
  [C.spec(), C.total100(), C.minCat('oil',1)],
  [C.stab(90), C.cost(2800)], { start:'base' }),
M('bodywash',5,'원가 1,800원','build',
  '대용량 제품이라 원가가 곧 경쟁력이다. kg 당 1,800원 아래로.',
  [C.spec(), C.cost(1800), C.total100()],
  [C.cost(1500), C.stab(90)], { start:'base' }),
M('bodywash',6,'묽어진 바디워시','fix',
  '점도가 규격 아래로 떨어졌다. 솔트 커브의 어느 쪽에 있는지 확인하라.',
  [C.spec(), C.total100(), C.visc(3000,8000)],
  [C.stab(90), C.cost(2200)],
  { start: broken('bodywash',[['naclthick',7]]), hint:'소금은 어느 지점을 넘으면 점도를 다시 떨어뜨린다.' })
);

/* ── 14. 바디로션 ─────────────────────────────────────────────── */
L.push(
M('bodylotion',1,'싸게, 그러나 좋게','build',
  '원가 kg 당 1,600원 이하로 규격을 맞춰라. 미네랄오일과 해바라기유가 무기다.',
  [C.spec(), C.cost(1600), C.total100(), C.stab(88)],
  [C.cost(1300), C.stab(92)], { start:'empty' }),
M('bodylotion',2,'펌프가 밀어낼 수 있는 점도','build',
  '점도 3,000~8,000 cP. 너무 되면 펌프가 안 나오고 묽으면 흘러내린다.',
  [C.visc(3000,10000), C.spec(), C.total100()],
  [C.stab(92), C.d32(0,2.5)], { start:'empty' }),
M('bodylotion',3,'1톤으로 옮긴다','scale',
  '랩에서 잘 나오던 처방을 1톤 생산 탱크로 옮겼다. 규격을 지키고 수율 97% 이상을 확보하라.',
  [C.spec(), C.total100(), C.yield_(97), C.homog(95)],
  [C.homog(99), C.stab(93)],
  { batchG:1000000, rigKey:'plant', start:'base',
    hint:'대량은 냉각이 느려 점도가 떨어진다. 잔류 손실은 오히려 줄어든다.' }),
M('bodylotion',4,'열이력을 줄인다','process',
  '대량 배치는 오래 뜨겁다. 총 제조 시간을 240분 이하로 줄이면서 규격을 지켜라.',
  [C.time(170), C.spec(), C.total100()],
  [C.time(140), C.stab(92)], { batchG:500000, rigKey:'plant', start:'base' }),
M('bodylotion',5,'증발을 막는다','process',
  '개방 가열은 물을 날린다. 증발 손실 0.5% 이하로 눌러라.',
  [C.evap(1.5), C.spec(), C.total100()],
  [C.evap(0.8), C.yield_(92)],
  { batchG:2000, rigKey:'beaker', start:'base',
    hint:'가온 온도를 낮추고 고온 유지 시간을 줄이면 증발이 준다. 개방 용기는 표면적/부피 비가 크다.' }),
M('bodylotion',6,'병마다 다른 제품','fix',
  '충전 앞뒤 병의 점도가 다르다는 QC 보고. 혼합 균질도를 95% 이상으로 올려라.',
  [C.homog(95), C.spec(), C.total100()],
  [C.homog(99), C.stab(92)],
  { batchG:1000000, rigKey:'plant', start:'base',
    hint:'마지막 첨가·중화 스텝의 교반 시간을 늘려야 한다. 탱크가 클수록 균질에 오래 걸린다.' })
);

/* ── 15. 립밤 ─────────────────────────────────────────────────── */
L.push(
M('lipbalm',1,'녹여서 붓는다','build',
  '왁스와 오일만으로 무수 처방 100% 를 맞춰라. 물이 없으니 방부제도 필요 없다.',
  [C.no('aqua'), C.total100(), C.noCat('presv'), C.minCat('wax',18)],
  [C.count(10), C.cost(14000)], { start:'empty' }),
M('lipbalm',2,'단단함의 균형','build',
  '왁스 합계 20~32% 로 잡아라. 무르면 여름에 주저앉고 단단하면 안 발린다.',
  [C.minCat('wax',20), C.maxCat('wax',30), C.total100(), C.no('aqua')],
  [C.cost(13000), C.stab(95)], { start:'empty' }),
M('lipbalm',3,'색을 입힌다','build',
  '레이크 안료로 붉은 색을 내라. 피마자유가 안료를 잘 적신다.',
  [C.has('ci15850'), C.has('castor'), C.total100(), C.no('aqua')],
  [C.color([48,58,28],14), C.cost(14000)], { start:'empty' }),
M('lipbalm',4,'카나우바를 녹인다','process',
  '카나우바왁스는 융점이 82~86℃ 다. 용융 온도를 올려 미용해 경고를 없애라.',
  [C.has('carnauba'), C.clean(), C.total100(), C.no('aqua')],
  [C.minCat('wax',22), C.cost(15000)], { start:'base' }),
M('lipbalm',5,'발한을 막는다','build',
  '표면에 오일이 배어 나오지 않게 마이크로크리스탈린왁스로 오일을 붙들어라.',
  [C.has('micro'), C.minCat('wax',24), C.total100(), C.no('aqua'), C.clean()],
  [C.cost(14000), C.count(12)],
  { start: broken('lipbalm',[['micro',0],['cct',25]], false) }),
M('lipbalm',6,'알갱이 씹히는 립밤','fix',
  '바르면 서걱거린다. 녹지 않은 왁스와 안료 뭉침 둘 다 의심하라.',
  [C.clean(), C.total100(), C.no('aqua')],
  [C.minCat('wax',20), C.cost(15000)],
  { start: broken('lipbalm',[['carnauba',6],['castor',10],['cct',40]], false),
    hint:'카나우바는 85℃ 이상이 필요하고, 안료를 적실 피마자유가 줄었다. 합계도 100% 가 아니다.' })
);

/* ── 16. 파운데이션 ───────────────────────────────────────────── */
L.push(
M('foundation',1,'삼원색으로 피부톤','build',
  '적·황·흑 산화철과 티타늄디옥사이드로 한국인 피부톤(21호 근처)을 만들어라.',
  [C.has('ci77491'), C.has('ci77492'), C.has('ci77499'), C.has('tio2uv'), C.total100()],
  [C.color([72,10,18],10), C.spec()], { start:'empty' }),
M('foundation',2,'커버력','build',
  '파우더·안료 합계 12% 이상으로 커버력을 내되 점도 규격을 지켜라.',
  [C.minCat('powder',12), C.spec(), C.total100(), C.stab(88)],
  [C.stab(90), C.cost(9000)], { start:'empty' }),
M('foundation',3,'0.01% 의 색차','scale',
  '흑색산화철 0.12% 를 200 g 배치에서 맞춰라. 계량 오차가 그대로 색차가 된다. ' +
  '배치 기록에서 오차율을 확인하라. 배치 규모는 바꿔도 된다.',
  [C.has('ci77499'), C.total100(), C.spec(), C.ingErr('ci77499',0.005)],
  [C.ingErr('ci77499',0.001), C.color([72,10,18],9)],
  { batchG:100, rigKey:'beaker', start:'base',
    hint:'미량 색소는 반드시 1% 희석 프리믹스로 계량한다. 배치를 키우면 오차가 줄어든다.' }),
M('foundation',4,'가라앉지 않게','build',
  '잔탄검이나 젤란검으로 항복응력을 만들어 파우더가 뜨게 하라.',
  [C.has('xanthan'), C.spec(), C.total100(), C.stab(92)],
  [C.stab(96), C.visc(9000,20000)],
  { start: broken('foundation',[['xanthan',0]]) }),
M('foundation',5,'매끄러운 발림','build',
  '실리콘 엘라스토머나 구형 파우더로 블러 효과와 슬립을 더하라.',
  [C.has('dimecop'), C.has('silica'), C.spec(), C.total100()],
  [C.stab(94), C.minCat('powder',10)],
  { start: broken('foundation',[['dimecop',0],['silica',0]]) }),
M('foundation',6,'줄무늬가 생긴 파운데이션','fix',
  '도포하면 색이 얼룩덜룩하다. 안료 분산과 처방 균형을 다시 보라.',
  [C.spec(), C.total100(), C.clean(), C.stab(90), C.color([72,10,18],11)],
  [C.color([72,10,18],6), C.stab(94)],
  { start: broken('foundation',[['ci77499',0.55],['xanthan',0]]),
    hint:'흑색산화철이 과하고, 파우더를 붙들어 줄 항복응력이 사라졌다.' })
);

/* ── 17. 종합 · 스케일업 ──────────────────────────────────────── */
L.push(
M('cream',7,'랩에서 생산으로','scale',
  '100 g 비커에서 완성한 크림을 1톤 탱크로 옮긴다. 두 배치의 점도 차이를 15% 안으로 줄여라. ' +
  '(규격 하한을 지키면서 냉각 계수 손실을 처방으로 보상하는 것이 정답이다.)',
  [C.spec(), C.total100(), C.visc(30000,50000), C.yield_(97), C.homog(96)],
  [C.stab(95), C.time(320), C.cost(7000)],
  { batchG:1000000, rigKey:'plant', start:'base' }),
M('cream',8,'열에 약한 것들을 살린다','process',
  '레티놀을 넣고도 분해를 15% 아래로 막아라. 투입 온도·진공·항산화제 세 가지를 모두 써야 한다.',
  [C.has('reti'), C.total100(), C.warnMax(14), C.spec()],
  [C.stab(92), C.temp(80)],
  { batchG:20000, rigKey:'lab', start:'base' }),
M('cream',9,'수율 99%','process',
  '벽면 잔류와 증발을 모두 줄여 수율 99% 이상을 만들어라. 큰 배치일수록 유리하다.',
  [C.yield_(99), C.spec(), C.total100()],
  [C.evap(0.15), C.time(220)],
  { batchG:20000, rigKey:'lab', start:'base',
    hint:'잔류 손실은 젖은 면적에 비례한다. 증발은 개방도와 고온 유지 시간에 비례한다.' }),
M('cream',10,'무결점 배치','process',
  '공정 경고를 하나도 남기지 마라. 감점 합계 0.',
  [C.warnMax(0), C.spec(), C.total100()],
  [C.stab(95), C.yield_(97)],
  { batchG:200000, rigKey:'pilot', start:'base' }),
M('cream',11,'원가와 품질','build',
  '안정도 95 이상, 원가 kg 당 3,500원 이하의 크림. 두 마리 토끼를 잡아라.',
  [C.spec(), C.stab(95), C.cost(3500), C.total100()],
  [C.cost(2800), C.stab(97)], { start:'empty' }),
M('cream',12,'졸업 과제','build',
  '자유롭게 설계하라. 크림 규격 · 안정도 96 · 원가 6,000원 이하 · 공정 경고 감점 6 이하 · 수율 96% 이상. ' +
  '여기까지 오면 처방과 공정을 함께 읽을 수 있는 사람이다.',
  [C.spec(), C.stab(96), C.cost(6000), C.warnMax(6), C.yield_(96), C.total100()],
  [C.stab(98), C.cost(4500), C.homog(97)],
  { batchG:100000, rigKey:'pilot', start:'empty' })
);

/* ── 챕터 묶기 ─────────────────────────────────────────────────── */
var CHAPTERS = G.PROD.LIST.map(function (p) {
  return { key: p.key, ko: p.ko, icon: p.icon, tag: p.tag, n: p.n, key3: p.key3, list: [] };
});
var byKey = {}; CHAPTERS.forEach(function (c) { byKey[c.key] = c; });
L.forEach(function (m) { if (byKey[m.ch]) byKey[m.ch].list.push(m); });
CHAPTERS.forEach(function (c) { c.list.sort(function (a, b) { return a.no - b.no; }); });

var ALL = {};
L.forEach(function (m) { ALL[m.id] = m; });

/* 시작 처방 만들기 */
function startRows(m) {
  if (m.start === 'empty' || m.start == null) return [{ id: 'aqua', pct: 100 }];
  if (m.start === 'base') return G.PROD.get(m.ch).base.map(function (r) { return { id: r.id, pct: r.pct }; });
  return m.start.map(function (r) { return { id: r.id, pct: r.pct }; });
}

G.MISS = {
  CHAPTERS: CHAPTERS, ALL: ALL, LIST: L,
  grade: grade, label: label, display: display, pass: pass,
  startRows: startRows, count: L.length
};
})(window);
