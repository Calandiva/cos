/* =====================================================================
   포뮬라랩 — 원료 데이터베이스
   ---------------------------------------------------------------------
   필드 (생략하면 NORM 의 기본값)
     id    코드            ko/inci  한글명 / INCI
     cat   분류 키          ph  기본 투입 상 (A수상 B유상 C냉각 D중화 E예비분산)
     sol   용해성 w수용 o유용 d분산 wo양쪽
     u     [최소,최대,권장] 사용률 %
     d     밀도 g/mL       ri  굴절률
     hlb   유화제 HLB      rh  오일이 요구하는 HLB(required HLB)
     th    [K,n] 연속상 점증  η(cP) = K · c^n     (c = %)
     lam   라멜라 겔망 기여 (지방알코올·왁스류)
     lab   고유색 CIE L*a*b*   tint 색력(가중치)
     op    탁도 기여 (NTU / %)
     tmax  투입 허용 최고온도 °C
     pv    이 원료가 끌고 가는 pH    pc 완충력(상대)
     el    전해질 지수 (카보머 파괴력)
     vol   가열 중 휘발 손실 계수 0~1
     ox    열/산화 분해 민감도 0~1
     pr    단가 원/kg
   ===================================================================== */
(function (G) {
'use strict';

var CATS = [
  { k: 'water',  ko: '수상·용매',        c: '#3B82C4' },
  { k: 'humect', ko: '보습제',           c: '#4CA3A8' },
  { k: 'thick',  ko: '점증제',           c: '#8B5FBF' },
  { k: 'emul',   ko: '유화제',           c: '#C97B2B' },
  { k: 'oil',    ko: '오일·에스터',      c: '#C2952B' },
  { k: 'sili',   ko: '실리콘',           c: '#6E8CA0' },
  { k: 'wax',    ko: '왁스·지방알코올',  c: '#A08050' },
  { k: 'surf',   ko: '세정 계면활성제',  c: '#2E9E5B' },
  { k: 'cond',   ko: '컨디셔닝',         c: '#B0509B' },
  { k: 'active', ko: '활성 성분',        c: '#C9333A' },
  { k: 'uv',     ko: '자외선차단제',     c: '#D08A00' },
  { k: 'powder', ko: '파우더·안료',      c: '#7C8B9C' },
  { k: 'presv',  ko: '방부제',           c: '#5D6D7E' },
  { k: 'ph',     ko: 'pH 조절',          c: '#3B62B8' },
  { k: 'misc',   ko: '첨가·기타',        c: '#8A8A8A' }
];

var PHASES = {
  A: { ko: '수상',      c: '#3B82C4' },
  B: { ko: '유상',      c: '#C2952B' },
  C: { ko: '냉각 첨가', c: '#2E9E5B' },
  D: { ko: '중화·조정', c: '#8B5FBF' },
  E: { ko: '예비 분산', c: '#C97B2B' }
};

var NORM = {
  cat: 'misc', ph: 'A', sol: 'w', u: [0, 10, 1], d: 1.0, ri: 0,
  hlb: 0, rh: 0, th: null, lam: 0, lab: [98, 0, 1], tint: 0.02, op: 0,
  tmax: 0, pv: 0, pc: 0, el: 0, vol: 0, ox: 0, pr: 5000,
  spf: 0,      /* 1% 당 SPF 기여 */
  pfa: 0,      /* 1% 당 UVA-PF 기여 */
  foam: 0,     /* 거품력 (활성분 1% 당) */
  hard: 0,     /* 무수 제형 경도 기여 */
  hot: 0,      /* 최근 실무에서 많이 쓰는 원료 */
  tags: '', n: ''
};

/* ------------------------------------------------------------------ */
var RAW = [

/* ── 수상 · 용매 ─────────────────────────────────────────────────── */
{ id: 'aqua', ko: '정제수', inci: 'Aqua', cat: 'water', sol: 'w', u: [0, 100, 60], d: 1.0, ri: 1.3330,
  pv: 6.5, pc: 0.004, pr: 200, tags: '물 water aqua 정제수 di수 용매',
  n: '모든 수상 처방의 기준. 이온교환·역삼투로 경도와 미생물을 제거한 물. 경수를 쓰면 칼슘·마그네슘이 카보머를 무너뜨리고 비누를 침전시킨다.' },

{ id: 'etoh', ko: '에탄올', inci: 'Alcohol', cat: 'water', ph: 'C', sol: 'w', u: [0, 40, 8], d: 0.789, ri: 1.361,
  tmax: 40, vol: 0.85, pv: 6.5, pc: 0.02, pr: 3000, tags: '에탄올 알코올 alcohol ethanol 변성알코올 청량감',
  n: '가용화 보조·청량감·속건. 카보머 겔은 20% 이상에서 급격히 묽어지고, 40℃ 이상 투입 시 증발 손실이 크다.' },

{ id: 'penta', ko: '펜틸렌글라이콜', inci: 'Pentylene Glycol', cat: 'water', sol: 'w', u: [0, 5, 3], d: 0.97, ri: 1.447,
  pv: 6.3, pc: 0.02, pr: 22000, tags: '펜틸렌글라이콜 pentylene 다이올 보존보조',
  n: '보습 + 항균 보조. 방부 시스템을 가볍게 가져갈 때 함께 쓴다.' },

/* ── 보습제 ─────────────────────────────────────────────────────── */
{ id: 'gly', ko: '글리세린', inci: 'Glycerin', cat: 'humect', sol: 'w', u: [0, 20, 5], d: 1.261, ri: 1.473,
  pv: 6.5, pc: 0.02, pr: 2200, tags: '글리세린 glycerin 보습 humectant 다가알코올',
  n: '가장 기본적인 보습제. 굴절률이 높아 수상의 굴절률을 오일 쪽으로 끌어올려 유화물을 덜 뿌옇게 만든다. 10%가 넘으면 끈적임이 심해진다.' },

{ id: 'bg', ko: '부틸렌글라이콜', inci: 'Butylene Glycol', cat: 'humect', sol: 'w', u: [0, 20, 5], d: 1.005, ri: 1.442,
  pv: 6.5, pc: 0.02, pr: 4500, tags: '부틸렌글라이콜 bg 1,3-bg butylene 보습 용해보조',
  n: '글리세린보다 산뜻하다. 추출물·방부제의 용해 보조로도 널리 쓰인다.' },

{ id: 'pdo', ko: '프로판다이올', inci: 'Propanediol', cat: 'humect', sol: 'w', u: [0, 20, 4], d: 1.05, ri: 1.440,
  pv: 6.5, pc: 0.02, pr: 7000, tags: '프로판다이올 propanediol 천연유래 보습',
  n: '옥수수 유래. 프로필렌글라이콜 대체재로 자극이 낮고 사용감이 가볍다.' },

{ id: 'dpg', ko: '다이프로필렌글라이콜', inci: 'Dipropylene Glycol', cat: 'humect', sol: 'w', u: [0, 15, 3], d: 1.022, ri: 1.440,
  pv: 6.5, pc: 0.01, pr: 4000, tags: 'dpg 다이프로필렌 향료용해 보습',
  n: '향료 용해력이 좋아 향 가용화의 짝으로 자주 쓴다.' },

{ id: 'hex', ko: '1,2-헥산다이올', inci: '1,2-Hexanediol', cat: 'humect', sol: 'w', u: [0, 3, 1.5], d: 0.95, ri: 1.440,
  pv: 6.4, pc: 0.02, pr: 26000, tags: '헥산다이올 hexanediol 보존보조 무방부 다이올',
  n: '보습 + 항균. "무방부" 표방 처방의 주력. 1.5%를 넘으면 유화 안정성을 떨어뜨릴 수 있다.' },

{ id: 'betaine', ko: '베타인', inci: 'Betaine', cat: 'humect', sol: 'w', u: [0, 5, 2], d: 1.0,
  pv: 6.0, pc: 0.05, el: 0.25, pr: 9000, tags: '베타인 betaine 사탕무 보습 저자극',
  n: '사탕무 유래 천연 보습제. 전해질 성격이 있어 카보머 겔의 점도를 떨어뜨린다.' },

{ id: 'napca', ko: '소듐PCA', inci: 'Sodium PCA', cat: 'humect', sol: 'w', u: [0, 2, 0.8], d: 1.1,
  pv: 6.8, pc: 0.15, el: 0.7, pr: 38000, tags: '소듐pca nmf 천연보습인자 보습',
  n: '피부 천연보습인자(NMF)의 주성분. 염이므로 전해질 부하가 크다.' },

{ id: 'urea', ko: '우레아', inci: 'Urea', cat: 'humect', ph: 'C', sol: 'w', u: [0, 10, 3], d: 1.0, tmax: 50,
  pv: 7.5, pc: 0.3, ox: 0.4, pr: 3000, tags: '우레아 urea 요소 각질연화 보습',
  n: '보습 + 각질 연화. 가열하면 암모니아로 분해되어 pH가 올라가고 냄새가 난다. 반드시 냉각 후 투입.' },

{ id: 'treha', ko: '트레할로스', inci: 'Trehalose', cat: 'humect', sol: 'w', u: [0, 5, 1], d: 1.0,
  pv: 6.5, pc: 0.02, ox: 0.5, pr: 30000, tags: '트레할로스 trehalose 당 보습',
  n: '이당류 보습제. 가열 시 갈변(마이야르 반응)에 관여한다.' },

{ id: 'ha', ko: '소듐하이알루로네이트', inci: 'Sodium Hyaluronate', cat: 'humect', ph: 'E', sol: 'w', u: [0, 1, 0.1], d: 1.0,
  th: [3000, 1.25], op: 2, pv: 6.5, pc: 0.05, el: 0.2, ox: 0.3, pr: 900000,
  tags: '히알루론산 하이알루로네이트 ha 보습 점증 고분자',
  n: '고분자 히알루론산. 0.1%만 넣어도 점도가 오르고 특유의 실 늘어짐이 생긴다. 덩어리지기 쉬우니 글리세린에 미리 분산시킨 뒤 물에 넣는다.' },

{ id: 'panth', ko: '판테놀', inci: 'Panthenol', cat: 'humect', ph: 'C', sol: 'w', u: [0, 5, 1], d: 1.2, tmax: 60,
  pv: 6.5, pc: 0.05, ox: 0.35, pr: 35000, tags: '판테놀 panthenol 비타민b5 진정 보습',
  n: '프로비타민 B5. 산성 조건과 고온에서 판토텐산으로 가수분해된다. pH 5~7, 60℃ 이하에서 투입.' },

/* ── 점증제 ──────────────────────────────────────────────────────── */
{ id: 'carb940', ko: '카보머', inci: 'Carbomer', cat: 'thick', ph: 'E', sol: 'w', u: [0, 1.5, 0.35], d: 0.2,
  th: [280000, 2.64], op: 0.4, pv: 3.0, pc: 2.2, pr: 70000,
  tags: '카보머 carbomer 카보폴 940 980 점증 겔 투명',
  n: '가장 투명한 겔을 만드는 점증제. 그대로는 pH 3 부근의 뿌연 산성 분산액이고, 중화해서 pH 5.5~7이 되어야 사슬이 펴지며 점도가 폭발한다. 전해질(염·추출물·비타민C)에 매우 약하다.' },

{ id: 'pemulen', ko: '아크릴레이트/C10-30알킬아크릴레이트크로스폴리머', inci: 'Acrylates/C10-30 Alkyl Acrylate Crosspolymer', cat: 'thick', ph: 'E', sol: 'w', u: [0, 1, 0.3], d: 0.2,
  th: [140000, 2.5], hlb: 15.5, op: 1.5, pv: 3.0, pc: 2.0, pr: 95000,
  tags: '페뮬렌 pemulen tr-1 tr-2 유화점증 소수변성 카보머',
  n: '소수기를 붙인 카보머. 점증과 유화를 동시에 한다. 0.2~0.3%로 오일 15%까지 별도 유화제 없이 잡아 초경량 사용감을 만든다. 역시 중화가 필요하다.' },

{ id: 'xanthan', ko: '잔탄검', inci: 'Xanthan Gum', cat: 'thick', ph: 'E', sol: 'w', u: [0, 1, 0.2], d: 0.7,
  th: [6000, 1.8], op: 35, pv: 6.5, pc: 0.1, pr: 30000,
  tags: '잔탄검 xanthan gum 천연점증 다당류 전해질내성',
  n: '미생물 발효 다당류. 전해질과 넓은 pH에 견디고 항복응력이 커서 파우더를 떠 있게 한다. 대신 약간 뿌옇고 미끌거리며 실이 늘어진다.' },

{ id: 'sclero', ko: '스클레로튬검', inci: 'Sclerotium Gum', cat: 'thick', ph: 'E', sol: 'w', u: [0, 1, 0.2], d: 0.7,
  th: [7000, 1.75], op: 18, pv: 6.2, pc: 0.08, pr: 120000,
  tags: '스클레로튬검 sclerotium 천연점증 잔탄대체',
  n: '잔탄검보다 실 늘어짐이 적고 사용감이 깔끔한 천연 점증제.' },

{ id: 'hec', ko: '하이드록시에틸셀룰로오스', inci: 'Hydroxyethylcellulose', cat: 'thick', ph: 'E', sol: 'w', u: [0, 2, 0.6], d: 0.6,
  th: [4500, 2.0], op: 8, pv: 6.5, pc: 0.05, pr: 26000,
  tags: 'hec 셀룰로오스 하이드록시에틸 점증 샴푸',
  n: '셀룰로오스계. 전해질 내성이 좋아 샴푸·클렌저 점증에 쓴다. 찬물에 그냥 넣으면 뭉치므로 분산 후 가온 수화한다.' },

{ id: 'aristo', ko: '암모늄아크릴로일다이메틸타우레이트/VP코폴리머', inci: 'Ammonium Acryloyldimethyltaurate/VP Copolymer', cat: 'thick', ph: 'A', sol: 'w', u: [0, 3, 0.8], d: 0.5,
  th: [26000, 1.5], op: 3, pv: 6.0, pc: 0.3, el: 0.1, pr: 110000,
  tags: '아리스토플렉스 aristoflex avc 냉공정 점증 중화불필요',
  n: '중화가 필요 없고 상온에서 바로 부풀어 오르는 점증제. 냉공정(콜드 프로세스) 에센스·젤의 주력.' },

{ id: 'sepinov', ko: '하이드록시에틸아크릴레이트/소듐아크릴로일다이메틸타우레이트코폴리머', inci: 'Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer', cat: 'thick', ph: 'A', sol: 'w', u: [0, 3, 1.0], d: 0.5,
  th: [18000, 1.45], hlb: 12, op: 4, pv: 6.2, pc: 0.25, pr: 98000, hot: 1,
  tags: '세피노브 sepinov emt10 점증 유화 냉공정 부드러움',
  n: '점증 + 보조 유화. 전해질 내성이 좋고 벨벳 같은 사용감을 준다. 냉공정과 열공정 모두 가능.' },

{ id: 'simulgel', ko: '아크릴아마이드/소듐아크릴로일다이메틸타우레이트코폴리머', inci: 'Acrylamide/Sodium Acryloyldimethyltaurate Copolymer (and) Isohexadecane (and) Polysorbate 80', cat: 'thick', ph: 'A', sol: 'w', u: [0, 4, 1.5], d: 0.95,
  th: [9000, 1.4], hlb: 11, op: 6, pv: 6.3, pc: 0.2, pr: 75000,
  tags: '시뮬젤 simulgel 600 역상에멀전 즉시점증 냉공정',
  n: '이미 유중수형 에멀전 상태로 공급되어 물에 넣는 즉시 점도가 오른다. 스케일과 무관하게 재현성이 좋아 대량 생산에서 선호된다.' },

{ id: 'napolyacr', ko: '소듐폴리아크릴레이트', inci: 'Sodium Polyacrylate', cat: 'thick', ph: 'E', sol: 'w', u: [0, 2, 0.5], d: 0.6,
  th: [40000, 1.9], op: 5, pv: 7.0, pc: 0.4, el: 0.05, pr: 45000,
  tags: '소듐폴리아크릴레이트 점증 중화불필요',
  n: '이미 중화된 형태라 그대로 쓴다. 카보머보다 전해질에 조금 더 견딘다.' },

{ id: 'gellan', ko: '젤란검', inci: 'Gellan Gum', cat: 'thick', ph: 'E', sol: 'w', u: [0, 0.6, 0.15], d: 0.7,
  th: [9000, 1.6], op: 20, pv: 6.5, pc: 0.05, pr: 90000,
  tags: '젤란검 gellan 부유 비드 서스펜션',
  n: '매우 낮은 농도에서 강한 항복응력을 만들어, 비드나 캡슐을 액체 속에 떠 있게 할 때 쓴다.' },

{ id: 'carrag', ko: '카라기난', inci: 'Carrageenan', cat: 'thick', ph: 'E', sol: 'w', u: [0, 1, 0.3], d: 0.7,
  th: [5000, 1.7], op: 25, pv: 7.5, pc: 0.1, el: 0.3, pr: 35000,
  tags: '카라기난 carrageenan 해조 점증 마스크',
  n: '해조 유래. 마스크 시트 에센스나 젤리 텍스처에 쓴다.' },

{ id: 'peg150ds', ko: 'PEG-150다이스테아레이트', inci: 'PEG-150 Distearate', cat: 'thick', ph: 'A', sol: 'w', u: [0, 3, 1.2], d: 1.0,
  th: [1200, 1.3], op: 12, hlb: 18, pv: 6.5, pr: 16000,
  tags: 'peg-150 다이스테아레이트 샴푸점증 회합점증',
  n: '계면활성제 미셀을 서로 연결해 점도를 올리는 회합형 점증제. 샴푸·바디워시 전용.' },

{ id: 'naclthick', ko: '소듐클로라이드', inci: 'Sodium Chloride', cat: 'thick', ph: 'C', sol: 'w', u: [0, 3, 1.0], d: 1.2,
  el: 12, pv: 6.5, pc: 0.02, pr: 600, tags: '소금 소듐클로라이드 nacl 염 샴푸점증 전해질',
  n: '설페이트 계면활성제 미셀을 막대형으로 바꿔 점도를 올리는 고전적 방법. 넣을수록 오르다 어느 지점을 넘으면 급격히 묽어진다(솔트 커브). 카보머 처방에는 금물.' },

/* ── 지방알코올 · 왁스 ─────────────────────────────────────────── */
{ id: 'ceteryl', ko: '세테아릴알코올', inci: 'Cetearyl Alcohol', cat: 'wax', ph: 'B', sol: 'o', u: [0, 10, 3], d: 0.81, ri: 1.435,
  lam: 1.0, rh: 15.5, op: 180, pr: 4500, tags: '세테아릴알코올 cetearyl 지방알코올 컨시스턴시 라멜라',
  n: '크림의 되기를 결정하는 핵심. 유화제와 만나 라멜라 겔망을 짜서 점도와 안정성을 동시에 준다. 이 겔망은 냉각 속도에 민감해 스케일업에서 가장 자주 문제가 된다.' },

{ id: 'cetyl', ko: '세틸알코올', inci: 'Cetyl Alcohol', cat: 'wax', ph: 'B', sol: 'o', u: [0, 8, 2], d: 0.81, ri: 1.428,
  lam: 0.85, rh: 15.5, op: 150, pr: 4200, tags: '세틸알코올 cetyl 지방알코올 부드러움',
  n: '세테아릴보다 부드럽고 매끄러운 감촉. 겔망 형성력은 조금 약하다.' },

{ id: 'stearyl', ko: '스테아릴알코올', inci: 'Stearyl Alcohol', cat: 'wax', ph: 'B', sol: 'o', u: [0, 8, 2], d: 0.81, ri: 1.437,
  lam: 1.05, rh: 15.5, op: 190, pr: 4300, hard: 0.8, tags: '스테아릴알코올 stearyl 지방알코올 단단함',
  n: '탄소수가 길어 더 단단하고 왁시한 느낌. 겔망은 가장 강하다.' },

{ id: 'behenyl', ko: '베헤닐알코올', inci: 'Behenyl Alcohol', cat: 'wax', ph: 'B', sol: 'o', u: [0, 5, 1.5], d: 0.82, ri: 1.44,
  lam: 1.25, rh: 15, op: 210, pr: 14000, hard: 0.9, tags: '베헤닐알코올 behenyl c22 고급지방알코올',
  n: 'C22. 소량으로 큰 점도를 내지만 융점이 70℃로 높아 완전히 녹이지 않으면 알갱이가 남는다.' },

{ id: 'stearic', ko: '스테아릭애씨드', inci: 'Stearic Acid', cat: 'wax', ph: 'B', sol: 'o', u: [0, 15, 3], d: 0.85, ri: 1.43,
  lam: 0.5, rh: 15, op: 170, pv: 5.0, pc: 0.5, pr: 3200,
  tags: '스테아릭애씨드 stearic acid 지방산 비누화 진주광',
  n: '알칼리(TEA·NaOH)와 만나면 그 자리에서 비누(유화제)가 된다. 이 비누화 유화가 고전적 바니싱 크림의 원리다. 과량이면 하얗게 뜨는 백탁 자국이 남는다.' },

{ id: 'beeswax', ko: '비즈왁스', inci: 'Cera Alba', cat: 'wax', ph: 'B', sol: 'o', u: [0, 15, 3], d: 0.96, ri: 1.44,
  lam: 0.9, rh: 12, op: 220, lab: [92, 1, 14], tint: 0.3, pr: 16000, hard: 1.6,
  tags: '비즈왁스 밀랍 cera alba 왁스 립밤 발수',
  n: '밀랍. 융점 62~65℃. 발수막을 만들어 립밤·밤 제형의 뼈대가 된다.' },

{ id: 'candel', ko: '칸데릴라왁스', inci: 'Euphorbia Cerifera Wax', cat: 'wax', ph: 'B', sol: 'o', u: [0, 15, 4], d: 0.98, ri: 1.45,
  lam: 1.1, rh: 11, op: 230, lab: [90, 0, 10], tint: 0.2, pr: 22000, hard: 2.4,
  tags: '칸데릴라 왁스 비건 립밤 광택',
  n: '비건 왁스. 밀랍보다 단단하고 광택이 좋다. 융점 68~73℃.' },

{ id: 'carnauba', ko: '카나우바왁스', inci: 'Copernicia Cerifera Wax', cat: 'wax', ph: 'B', sol: 'o', u: [0, 10, 2], d: 0.99, ri: 1.45,
  lam: 1.4, rh: 11, op: 240, lab: [88, 1, 16], tint: 0.3, pr: 26000, hard: 3.2,
  tags: '카나우바 왁스 경도 광택 마스카라',
  n: '융점 82~86℃로 가장 단단하다. 마스카라·립스틱의 내열도를 올린다. 완전히 녹이려면 85℃ 이상이 필요하다.' },

{ id: 'micro', ko: '마이크로크리스탈린왁스', inci: 'Microcrystalline Wax', cat: 'wax', ph: 'B', sol: 'o', u: [0, 15, 4], d: 0.92, ri: 1.45,
  lam: 1.0, rh: 10, op: 200, pr: 6000, hard: 1.5, tags: '마이크로크리스탈린 왁스 유연 결착',
  n: '미세결정 왁스. 오일을 잘 붙들어 립 제형의 발한(sweating)을 막는다.' },

{ id: 'shea', ko: '시어버터', inci: 'Butyrospermum Parkii Butter', cat: 'wax', ph: 'B', sol: 'o', u: [0, 20, 4], d: 0.91, ri: 1.463,
  lam: 0.35, rh: 8, op: 120, lab: [93, -1, 9], tint: 0.25, ox: 0.3, pr: 12000, hard: 0.35,
  tags: '시어버터 shea butter 버터 보습 유연',
  n: '융점 32~38℃로 체온에서 녹는다. 결정형이 여러 가지라 급냉하면 나중에 알갱이(그레이닝)가 생긴다.' },

/* ── 오일 · 에스터 ──────────────────────────────────────────────── */
{ id: 'cct', ko: '카프릴릭/카프릭트라이글리세라이드', inci: 'Caprylic/Capric Triglyceride', cat: 'oil', ph: 'B', sol: 'o', u: [0, 40, 8], d: 0.945, ri: 1.449,
  rh: 5.5, pr: 7000, tags: 'cct mct 트라이글리세라이드 코코넛 에몰리언트 기본오일',
  n: '가장 무난한 합성 에몰리언트. 산화 안정성이 뛰어나고 무색무취, 가벼운 발림성. 처방 설계의 기준점으로 삼기 좋다.' },

{ id: 'ceh', ko: '세틸에틸헥사노에이트', inci: 'Cetyl Ethylhexanoate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 6], d: 0.86, ri: 1.443,
  rh: 11, pr: 6500, tags: '세틸에틸헥사노에이트 에스터 산뜻 퍼짐성',
  n: '퍼짐성이 매우 좋고 산뜻하게 마무리된다. 자외선차단제 분산에도 쓰인다.' },

{ id: 'ipm', ko: '아이소프로필미리스테이트', inci: 'Isopropyl Myristate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 20, 4], d: 0.853, ri: 1.434,
  rh: 11.5, pr: 5000, tags: 'ipm 아이소프로필미리스테이트 침투 가벼움 클렌징',
  n: '침투감이 좋고 매우 가볍지만 여드름 유발(코메도제닉) 논란이 있어 페이셜에는 절제해서 쓴다.' },

{ id: 'dcc', ko: '다이카프릴릴카보네이트', inci: 'Dicaprylyl Carbonate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 6], d: 0.90, ri: 1.435,
  rh: 11, pr: 14000, tags: '다이카프릴릴카보네이트 실키 드라이터치 자외선분산',
  n: '실리콘 없이 실크 같은 마무리를 낸다. 유기 자외선차단제 용해력이 좋다.' },

{ id: 'dce', ko: '다이카프릴릴에터', inci: 'Dicaprylyl Ether', cat: 'oil', ph: 'B', sol: 'o', u: [0, 20, 5], d: 0.81, ri: 1.432,
  rh: 11, vol: 0.15, pr: 16000, tags: '다이카프릴릴에터 드라이 휘발성 실리콘대체',
  n: '가볍게 날아가는 느낌으로 사이클로메티콘 대체재로 쓰인다.' },

{ id: 'coco', ko: '코코-카프릴레이트/카프레이트', inci: 'Coco-Caprylate/Caprate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 6], d: 0.86, ri: 1.44,
  rh: 10, pr: 11000, tags: '코코카프릴레이트 천연유래 실리콘대체 실키',
  n: '천연 유래 실리콘 대체 에몰리언트. 부드럽고 잔여감이 적다.' },

{ id: 'squal', ko: '스쿠알란', inci: 'Squalane', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 5], d: 0.81, ri: 1.452,
  rh: 11, pr: 38000, tags: '스쿠알란 squalane 올리브 사탕수수 피지유사 안정',
  n: '피지와 조성이 비슷해 친화력이 높고 산화되지 않는다. 값은 비싸지만 사용감 프리미엄이 확실하다.' },

{ id: 'minoil', ko: '미네랄오일', inci: 'Paraffinum Liquidum', cat: 'oil', ph: 'B', sol: 'o', u: [0, 40, 8], d: 0.85, ri: 1.470,
  rh: 10.5, pr: 2000, tags: '미네랄오일 유동파라핀 광물유 폐색 저렴',
  n: '굴절률이 1.47로 높아 물과의 차이가 커서 유화하면 가장 하얗게 된다. 폐색막을 만들어 수분 증발을 막는다.' },

{ id: 'jojoba', ko: '호호바씨오일', inci: 'Simmondsia Chinensis Seed Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 20, 4], d: 0.87, ri: 1.465,
  rh: 6.5, lab: [95, -2, 12], tint: 0.2, ox: 0.15, pr: 26000,
  tags: '호호바 jojoba 왁스에스터 안정 두피',
  n: '엄밀히는 액체 왁스 에스터. 산화 안정성이 매우 높다.' },

{ id: 'maca', ko: '마카다미아씨오일', inci: 'Macadamia Ternifolia Seed Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 20, 4], d: 0.91, ri: 1.467,
  rh: 7, lab: [94, -2, 14], tint: 0.25, ox: 0.35, pr: 22000,
  tags: '마카다미아 팔미톨레익 영양 피부친화',
  n: '팔미톨레익산이 풍부해 피부 친화력이 높다.' },

{ id: 'argan', ko: '아르간커넬오일', inci: 'Argania Spinosa Kernel Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 15, 3], d: 0.91, ri: 1.468,
  rh: 7, lab: [92, -1, 22], tint: 0.4, ox: 0.4, pr: 60000,
  tags: '아르간 argan 헤어 영양 토코페롤',
  n: '헤어 에센스의 대표 오일. 불포화도가 높아 항산화제를 함께 넣어야 산패 냄새를 막는다.' },

{ id: 'rosehip', ko: '로즈힙오일', inci: 'Rosa Canina Fruit Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 10, 2], d: 0.92, ri: 1.472,
  rh: 7, lab: [86, 3, 34], tint: 1.2, ox: 0.85, pr: 75000,
  tags: '로즈힙 rosehip 리놀레닉 재생 산패주의',
  n: '리놀렌산이 많아 재생 효과가 좋지만 매우 쉽게 산패한다. 60℃ 이상 노출과 장시간 가열을 피하고 반드시 냉각 후 투입한다.' },

{ id: 'sunfl', ko: '해바라기씨오일', inci: 'Helianthus Annuus Seed Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 5], d: 0.92, ri: 1.474,
  rh: 7, lab: [94, -2, 16], tint: 0.25, ox: 0.5, pr: 5000,
  tags: '해바라기 sunflower 리놀레익 저렴 식물유',
  n: '가성비 좋은 식물유. 리놀레산이 풍부하다.' },

{ id: 'olive', ko: '올리브오일', inci: 'Olea Europaea Fruit Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 5], d: 0.915, ri: 1.468,
  rh: 7, lab: [92, -4, 20], tint: 0.4, ox: 0.4, pr: 9000,
  tags: '올리브 olive 올레익 무거움 클렌징',
  n: '올레산이 주성분. 무겁고 폐색성이 강해 클렌징이나 바디에 적합하다.' },

{ id: 'castor', ko: '피마자오일', inci: 'Ricinus Communis Seed Oil', cat: 'oil', ph: 'B', sol: 'o', u: [0, 40, 8], d: 0.96, ri: 1.478,
  rh: 14, pr: 6000, tags: '피마자 캐스터 castor 립 안료분산 점성 광택',
  n: '리시놀레산 때문에 극성이 매우 높다. 안료를 잘 적셔 립 제형의 필수 오일이지만, 다른 오일과 잘 안 섞이고 특유의 무게감이 있다.' },

{ id: 'isododec', ko: '아이소도데케인', inci: 'Isododecane', cat: 'oil', ph: 'B', sol: 'o', u: [0, 40, 8], d: 0.75, ri: 1.42,
  rh: 11, vol: 0.75, tmax: 60, pr: 18000,
  tags: '아이소도데케인 휘발성 탄화수소 워터프루프 롱웨어',
  n: '완전히 날아가면서 필름만 남긴다. 워터프루프 선크림·롱웨어 메이크업의 핵심. 가온 시 대부분 증발하므로 냉각 후 투입한다.' },

{ id: 'petro', ko: '페트롤라툼', inci: 'Petrolatum', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 5], d: 0.87, ri: 1.48,
  rh: 8, lam: 0.3, op: 100, pr: 3000, hard: 0.3, tags: '바세린 페트롤라툼 폐색 보호막',
  n: '가장 강력한 폐색제. 경피수분손실을 거의 완전히 막지만 무겁고 번들거린다.' },

{ id: 'bos', ko: '부틸옥틸살리실레이트', inci: 'Butyloctyl Salicylate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 10, 3], d: 1.0, ri: 1.51,
  rh: 11, pr: 35000, tags: '부틸옥틸살리실레이트 자외선용해 spf효율 광택',
  n: '유기 자외선차단제를 잘 녹이고 SPF 효율을 올린다. 굴절률이 높아 광택을 준다.' },

/* ── 실리콘 ─────────────────────────────────────────────────────── */
{ id: 'dime5', ko: '다이메티콘 5cs', inci: 'Dimethicone (5cst)', cat: 'sili', ph: 'B', sol: 'o', u: [0, 20, 4], d: 0.92, ri: 1.397,
  rh: 11, pr: 12000, tags: '다이메티콘 실리콘 5cs 가벼움 실키',
  n: '굴절률이 1.40으로 낮아 물과의 차이가 작다. 그래서 실리콘 유화물은 유난히 투명하거나 푸른빛이 돈다.' },

{ id: 'dime350', ko: '다이메티콘 350cs', inci: 'Dimethicone (350cst)', cat: 'sili', ph: 'B', sol: 'o', u: [0, 15, 3], d: 0.97, ri: 1.403,
  rh: 11, pr: 13000, tags: '다이메티콘 350 실리콘 발수 실키 잔여감',
  n: '점도가 높아 매끄러운 막을 남긴다. 발수·발유성으로 지속력을 준다.' },

{ id: 'd5', ko: '사이클로펜타실록산', inci: 'Cyclopentasiloxane', cat: 'sili', ph: 'B', sol: 'o', u: [0, 30, 6], d: 0.96, ri: 1.397,
  rh: 11, vol: 0.6, tmax: 60, pr: 20000,
  tags: '사이클로펜타실록산 d5 휘발성실리콘 드라이터치',
  n: '뽀송하게 날아간다. 비점이 210℃지만 개방 가열 중 손실이 있어 냉각 후 투입이 유리하다.' },

{ id: 'phenyl', ko: '페닐트라이메티콘', inci: 'Phenyl Trimethicone', cat: 'sili', ph: 'B', sol: 'o', u: [0, 10, 2], d: 0.99, ri: 1.460,
  rh: 11, pr: 32000, tags: '페닐트라이메티콘 광택 헤어 윤기',
  n: '굴절률이 높아 머리카락과 피부에 윤기를 준다.' },

{ id: 'amodime', ko: '아모다이메티콘', inci: 'Amodimethicone', cat: 'cond', ph: 'B', sol: 'o', u: [0, 3, 1], d: 0.98, ri: 1.41,
  rh: 11, pr: 45000, tags: '아모다이메티콘 양이온실리콘 헤어 손상부흡착 린스',
  n: '아미노기가 손상된 모발의 음전하 부위에 선택적으로 붙는다. 헹굼 후에도 남아 컨디셔닝 효과가 지속된다.' },

{ id: 'dimecop', ko: '다이메티콘/비닐다이메티콘크로스폴리머', inci: 'Dimethicone/Vinyl Dimethicone Crosspolymer', cat: 'sili', ph: 'B', sol: 'd', u: [0, 10, 3], d: 0.98, ri: 1.41,
  op: 60, pr: 55000, tags: '실리콘엘라스토머 크로스폴리머 블러 모공 매트',
  n: '실리콘 엘라스토머. 빛을 산란시켜 모공과 잔주름을 흐리게 보이게 하는 블러 효과를 낸다.' },

/* ── 유화제 ─────────────────────────────────────────────────────── */
{ id: 'gms', ko: '글리세릴스테아레이트', inci: 'Glyceryl Stearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 8, 2], d: 0.97, ri: 1.44,
  hlb: 3.8, lam: 0.5, op: 130, pr: 6000,
  tags: 'gms 글리세릴스테아레이트 유화제 보조유화 저hlb',
  n: '단독으로는 W/O 쪽. 고HLB 유화제와 짝을 지어 요구 HLB를 맞추고 라멜라 겔망을 함께 만든다.' },

{ id: 'gmsse', ko: '글리세릴스테아레이트/PEG-100스테아레이트', inci: 'Glyceryl Stearate (and) PEG-100 Stearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 8, 3], d: 0.98, ri: 1.44,
  hlb: 11.2, lam: 0.55, op: 140, pr: 9000,
  tags: '아라셀165 arlacel 165 유화제 만능 o/w 크림',
  n: '그 자체로 저HLB와 고HLB가 섞여 있어 단독으로 O/W를 만든다. 가장 널리 쓰이는 만능 유화제.' },

{ id: 'ps60', ko: '폴리소르베이트60', inci: 'Polysorbate 60', cat: 'emul', ph: 'A', sol: 'w', u: [0, 6, 2], d: 1.10, ri: 1.47,
  hlb: 14.9, op: 8, pr: 8000, tags: '폴리소르베이트60 tween60 고hlb 유화제',
  n: '대표적 고HLB 유화제. 저HLB 파트너와 조합해 요구 HLB를 정밀하게 맞춘다.' },

{ id: 'ps20', ko: '폴리소르베이트20', inci: 'Polysorbate 20', cat: 'emul', ph: 'C', sol: 'w', u: [0, 5, 1.5], d: 1.10, ri: 1.468,
  hlb: 16.7, op: 3, pr: 8000, tags: '폴리소르베이트20 tween20 가용화 향 투명',
  n: '향료·에센셜오일 가용화의 표준. 향의 4~6배를 쓰면 투명하게 녹는다.' },

{ id: 'ps80', ko: '폴리소르베이트80', inci: 'Polysorbate 80', cat: 'emul', ph: 'A', sol: 'w', u: [0, 5, 1.5], d: 1.07, ri: 1.473,
  hlb: 15.0, op: 5, pr: 8000, tags: '폴리소르베이트80 tween80 가용화 유화',
  n: '올레에이트형. 극성 오일 가용화에 유리하다.' },

{ id: 'span60', ko: '솔비탄스테아레이트', inci: 'Sorbitan Stearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 1.5], d: 1.0, ri: 1.47,
  hlb: 4.7, op: 90, pr: 9000, tags: '솔비탄스테아레이트 span60 저hlb 파트너',
  n: '폴리소르베이트60과 짝을 이루는 고전 조합. 두 개의 비율로 HLB를 자유롭게 맞춘다.' },

{ id: 'span80', ko: '솔비탄올리에이트', inci: 'Sorbitan Oleate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 1.5], d: 0.99, ri: 1.47,
  hlb: 4.3, op: 40, pr: 9000, tags: '솔비탄올리에이트 span80 저hlb w/o',
  n: '액상 저HLB 유화제. W/O 보조에도 쓰인다.' },

{ id: 'ceteareth20', ko: '세테아레스-20', inci: 'Ceteareth-20', cat: 'emul', ph: 'B', sol: 'wo', u: [0, 6, 2], d: 1.0, ri: 1.45,
  hlb: 15.7, lam: 0.3, op: 60, pr: 10000,
  tags: '세테아레스20 고hlb 유화 라멜라 크림 유화왁스',
  n: '세테아릴알코올과 함께 강한 라멜라 구조를 만든다. 유화왁스(Emulsifying Wax NF)의 주성분.' },

{ id: 'olivem', ko: '세테아릴올리베이트/솔비탄올리베이트', inci: 'Cetearyl Olivate (and) Sorbitan Olivate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 8, 4], d: 0.95, ri: 1.46,
  hlb: 9.0, lam: 0.7, op: 160, pr: 28000, hot: 1,
  tags: '올리브엠 olivem 1000 천연유화제 액정 리퀴드크리스탈',
  n: '올리브 유래. 피부 지질과 비슷한 액정(liquid crystal) 구조를 만들어 촉촉하면서도 무겁지 않다. 천연 처방의 주력.' },

{ id: 'cetglu', ko: '세테아릴글루코사이드', inci: 'Cetearyl Glucoside', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 2.5], d: 0.95, ri: 1.46,
  hlb: 12.0, lam: 0.6, op: 170, pr: 24000,
  tags: '세테아릴글루코사이드 당유화제 천연 montanov',
  n: '당 유래 유화제. 세테아릴알코올과 함께 공급되는 경우가 많고, 매트하고 탄탄한 텍스처를 낸다.' },

{ id: 'tegocare', ko: '폴리글리세릴-3메틸글루코오스다이스테아레이트', inci: 'Polyglyceryl-3 Methylglucose Distearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 2.5], d: 0.98, ri: 1.46,
  hlb: 12.0, lam: 0.4, op: 120, pr: 32000,
  tags: '테고케어450 폴리글리세릴 peg프리 천연유화제',
  n: 'PEG-프리 유화제. 부드럽고 산뜻하며 전해질 내성이 좋다.' },

{ id: 'pg10laur', ko: '폴리글리세릴-10라우레이트', inci: 'Polyglyceryl-10 Laurate', cat: 'emul', ph: 'A', sol: 'w', u: [0, 5, 2], d: 1.05, ri: 1.47,
  hlb: 15.5, op: 4, pr: 34000,
  tags: '폴리글리세릴-10라우레이트 가용화 peg프리 투명',
  n: 'PEG-프리 가용화제. 투명 토너·미스트에서 향과 오일을 맑게 녹인다.' },

{ id: 'peg40rch', ko: 'PEG-40하이드로제네이티드캐스터오일', inci: 'PEG-40 Hydrogenated Castor Oil', cat: 'emul', ph: 'C', sol: 'w', u: [0, 5, 1.5], d: 1.05, ri: 1.47,
  hlb: 14.5, op: 2, pr: 9000,
  tags: 'peg-40 경화피마자유 가용화 투명 미스트 향',
  n: '가용화의 표준. 오일 대비 3~5배를 쓰면 완전히 투명해진다. 40℃ 부근에서 오일과 미리 섞은 뒤 물에 천천히 넣는 것이 요령.' },

{ id: 'nastearoylglu', ko: '소듐스테아로일글루타메이트', inci: 'Sodium Stearoyl Glutamate', cat: 'emul', ph: 'B', sol: 'wo', u: [0, 3, 1], d: 1.0,
  hlb: 14.0, lam: 0.3, op: 80, el: 1.5, pv: 6.5, pc: 0.2, pr: 42000,
  tags: '소듐스테아로일글루타메이트 아미노산유화제 저자극 천연',
  n: '아미노산계 음이온 유화제. 소량으로 강력하지만 염이라 전해질 부하가 있고 산성 pH에서 힘을 잃는다.' },

{ id: 'kcp', ko: '포타슘세틸포스페이트', inci: 'Potassium Cetyl Phosphate', cat: 'emul', ph: 'B', sol: 'wo', u: [0, 3, 1.5], d: 1.0,
  hlb: 10.0, lam: 0.4, op: 110, el: 1.8, pv: 7.0, pc: 0.3, pr: 36000,
  tags: '포타슘세틸포스페이트 선크림유화 무기분산 음이온',
  n: '자외선차단제 분산에 강한 음이온 유화제. 선크림 처방의 단골.' },

{ id: 'abilem90', ko: '세틸PEG/PPG-10/1다이메티콘', inci: 'Cetyl PEG/PPG-10/1 Dimethicone', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 3], d: 0.95, ri: 1.42,
  hlb: 5.0, op: 30, pr: 52000,
  tags: '아빌em90 실리콘유화제 w/o 유중수 선크림 쿠션',
  n: 'W/O(유중수) 전용 실리콘 유화제. 쿠션·워터프루프 선크림의 기반. 반드시 유상에 녹인 뒤 수상을 천천히 적하해야 한다.' },

{ id: 'pg4dis', ko: '폴리글리세릴-4다이아이소스테아레이트/폴리하이드록시스테아레이트/세바케이트', inci: 'Polyglyceryl-4 Diisostearate/Polyhydroxystearate/Sebacate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 3], d: 0.96, ri: 1.46,
  hlb: 5.5, op: 35, pr: 58000,
  tags: 'w/o 유화제 유중수 비실리콘 안정',
  n: '비실리콘 W/O 유화제. 전해질을 넣은 내수상을 안정하게 잡아준다.' },

{ id: 'lecithin', ko: '하이드로제네이티드레시틴', inci: 'Hydrogenated Lecithin', cat: 'emul', ph: 'B', sol: 'o', u: [0, 3, 1], d: 1.0, ri: 1.47,
  hlb: 7.0, lam: 0.3, op: 70, lab: [90, 1, 12], tint: 0.3, ox: 0.3, pr: 60000,
  tags: '레시틴 리포좀 인지질 천연유화',
  n: '인지질. 리포좀·라멜라 구조를 만들어 유효성분 전달에 쓴다. 고압 균질기가 있어야 제 성능이 나온다.' },

/* ── 세정 계면활성제 ────────────────────────────────────────────── */
{ id: 'sles', ko: '소듐라우레스설페이트', inci: 'Sodium Laureth Sulfate (70%)', cat: 'surf', ph: 'A', sol: 'w', u: [0, 40, 12], d: 1.05,
  hlb: 16, op: 6, el: 1.2, pv: 6.5, pc: 0.2, pr: 2200, foam: 1.0,
  tags: 'sles 소듐라우레스설페이트 설페이트 샴푸 세정 거품',
  n: '풍부한 거품과 강한 세정력. 소금으로 점도를 조절할 수 있는 것이 큰 장점이다. 자극 때문에 베타인·글루타메이트와 섞어 완화한다.' },

{ id: 'slmi', ko: '소듐라우로일메칠아이세티오네이트', inci: 'Sodium Lauroyl Methyl Isethionate', cat: 'surf', ph: 'A', sol: 'w', u: [0, 25, 8], d: 1.0,
  hlb: 15, op: 20, el: 0.8, pv: 6.0, pc: 0.2, pr: 12000, foam: 0.85, hot: 1,
  tags: '아이세티오네이트 slmi 저자극 크리미 거품 설페이트프리',
  n: '설페이트 프리의 대표. 크리미하고 조밀한 거품과 부드러운 마무리. 찬물에 잘 안 녹으니 가온 용해가 필요하다.' },

{ id: 'capb', ko: '코카미도프로필베타인', inci: 'Cocamidopropyl Betaine (30%)', cat: 'surf', ph: 'A', sol: 'w', u: [0, 30, 8], d: 1.04,
  hlb: 13, op: 4, el: 1.5, pv: 5.5, pc: 0.3, pr: 2600, foam: 0.7,
  tags: '코카미도프로필베타인 capb 양쪽성 거품보조 자극완화',
  n: '양쪽성. 단독 세정력은 약하지만 다른 계면활성제의 자극을 낮추고 거품을 안정시킨다. 거의 모든 세정 처방에 들어간다.' },

{ id: 'chs', ko: '코카미도프로필하이드록시설테인', inci: 'Cocamidopropyl Hydroxysultaine', cat: 'surf', ph: 'A', sol: 'w', u: [0, 20, 5], d: 1.05,
  hlb: 13, op: 4, el: 1.6, pv: 6.0, pc: 0.3, pr: 4200, foam: 0.75,
  tags: '하이드록시설테인 양쪽성 저ph 점증',
  n: '베타인보다 낮은 pH에서도 안정하고 점증 반응이 좋다.' },

{ id: 'cocoglut', ko: '소듐코코일글루타메이트', inci: 'Sodium Cocoyl Glutamate', cat: 'surf', ph: 'A', sol: 'w', u: [0, 25, 8], d: 1.05,
  hlb: 14, op: 8, el: 1.4, pv: 6.5, pc: 0.5, pr: 9000, foam: 0.6, hot: 1,
  tags: '코코일글루타메이트 아미노산계 약산성 저자극 클렌징',
  n: '아미노산계. 약산성에서 부드럽게 씻긴다. pH 5 아래로 내려가면 유리산이 석출되어 뿌옇게 흐려질 수 있다.' },

{ id: 'decylglu', ko: '데실글루코사이드', inci: 'Decyl Glucoside', cat: 'surf', ph: 'A', sol: 'w', u: [0, 20, 5], d: 1.05,
  hlb: 13, op: 10, pv: 11.5, pc: 0.6, pr: 6000, foam: 0.45,
  tags: '데실글루코사이드 apg 비이온 천연 저자극 베이비',
  n: '당 유래 비이온. 매우 순하지만 원액 pH가 11 부근이라 반드시 산으로 낮춰야 한다. 거품이 성기다.' },

{ id: 'lauryglu', ko: '라우릴글루코사이드', inci: 'Lauryl Glucoside', cat: 'surf', ph: 'A', sol: 'w', u: [0, 20, 5], d: 1.05,
  hlb: 13, op: 14, pv: 11.5, pc: 0.6, pr: 6200, foam: 0.5,
  tags: '라우릴글루코사이드 apg 천연 세정',
  n: '데실글루코사이드보다 세정력이 세고 점도가 있다.' },

{ id: 'myristic', ko: '미리스틱애씨드', inci: 'Myristic Acid', cat: 'surf', ph: 'B', sol: 'o', u: [0, 25, 10], d: 0.86,
  lam: 0.18, op: 160, pv: 4.5, pc: 0.6, pr: 4000, foam: 0.95,
  tags: '미리스틱애씨드 비누화 폼클렌저 크리미거품 지방산',
  n: 'KOH와 반응해 그 자리에서 비누를 만든다. 이것이 크리미한 폼 클렌저의 원리다. 비누화 반응은 발열하며 점도가 급상승하므로 천천히 중화한다.' },

{ id: 'lauric', ko: '라우릭애씨드', inci: 'Lauric Acid', cat: 'surf', ph: 'B', sol: 'o', u: [0, 20, 6], d: 0.88,
  lam: 0.14, op: 150, pv: 4.5, pc: 0.6, pr: 4200, foam: 1.25,
  tags: '라우릭애씨드 비누화 거품량 폼클렌저',
  n: '거품 양을 늘린다. 많이 쓰면 세정 후 당김이 심해진다.' },

{ id: 'koh', ko: '포타슘하이드록사이드', inci: 'Potassium Hydroxide', cat: 'ph', ph: 'D', sol: 'w', u: [0, 10, 3], d: 1.2,
  pv: 13.5, pc: 6.0, el: 8, pr: 2000,
  tags: 'koh 수산화칼륨 비누화 알칼리 중화',
  n: '지방산을 비누로 바꾼다. 과량이면 강알칼리로 남아 자극이 된다. 지방산 몰수의 90~95%만 중화하는 것이 정석.' },

{ id: 'peg7gc', ko: 'PEG-7글리세릴코코에이트', inci: 'PEG-7 Glyceryl Cocoate', cat: 'surf', ph: 'B', sol: 'o', u: [0, 20, 6], d: 1.02,
  hlb: 11.0, op: 2, pr: 9000,
  tags: 'peg-7글리세릴코코에이트 클렌징오일 자기유화 워터오프',
  n: '클렌징 오일이 물과 만나 하얗게 변하며 씻겨 나가게 하는 자기유화제.' },

{ id: 'pg4cap', ko: '폴리글리세릴-4카프레이트', inci: 'Polyglyceryl-4 Caprate', cat: 'surf', ph: 'B', sol: 'wo', u: [0, 15, 5], d: 1.03,
  hlb: 13.0, op: 6, pr: 34000,
  tags: '폴리글리세릴-4카프레이트 peg프리 클렌징오일 자기유화',
  n: 'PEG-프리 자기유화제. 클렌징 오일·밤에 쓴다.' },

/* ── 컨디셔닝 ───────────────────────────────────────────────────── */
{ id: 'btms50', ko: '베헨트라이모늄메토설페이트', inci: 'Behentrimonium Methosulfate (and) Cetearyl Alcohol', cat: 'cond', ph: 'B', sol: 'o', u: [0, 8, 4], d: 0.9,
  lam: 0.9, op: 200, el: 1.0, pv: 5.0, pc: 0.3, pr: 22000,
  tags: 'btms btms-50 양이온계면활성제 린스 컨디셔너 정전기',
  n: '컨디셔너의 심장. 양전하가 손상된 모발의 음전하에 붙어 큐티클을 눕히고 빗질을 부드럽게 한다. pH 4~5에서 가장 잘 붙는다.' },

{ id: 'ctac', ko: '세트라이모늄클로라이드', inci: 'Cetrimonium Chloride', cat: 'cond', ph: 'A', sol: 'w', u: [0, 3, 1], d: 0.98,
  el: 2.2, pv: 5.5, pc: 0.2, pr: 6000,
  tags: '세트라이모늄클로라이드 ctac 양이온 대전방지 린스오프',
  n: '가벼운 양이온. 헹굼 후 미끄러움을 준다. 음이온 계면활성제와 만나면 침전하므로 샴푸에는 쓸 수 없다.' },

{ id: 'pq10', ko: '폴리쿼터늄-10', inci: 'Polyquaternium-10', cat: 'cond', ph: 'E', sol: 'w', u: [0, 1.5, 0.3], d: 0.6,
  th: [2500, 1.5], op: 12, el: 0.4, pv: 6.0, pc: 0.1, pr: 38000,
  tags: '폴리쿼터늄-10 양이온셀룰로오스 샴푸컨디셔닝 코아세르베이트',
  n: '양이온 셀룰로오스. 샴푸를 헹굴 때 희석되면서 계면활성제와 뭉쳐(코아세르베이트) 모발에 얹힌다. 2-in-1 샴푸의 원리.' },

{ id: 'pq7', ko: '폴리쿼터늄-7', inci: 'Polyquaternium-7', cat: 'cond', ph: 'A', sol: 'w', u: [0, 3, 1], d: 1.03,
  op: 8, el: 0.5, pv: 6.0, pc: 0.1, pr: 12000,
  tags: '폴리쿼터늄-7 양이온폴리머 부드러움 샴푸',
  n: '거품을 크리미하게 하고 헹굼감을 부드럽게 한다.' },

{ id: 'guar', ko: '구아하이드록시프로필트라이모늄클로라이드', inci: 'Guar Hydroxypropyltrimonium Chloride', cat: 'cond', ph: 'E', sol: 'w', u: [0, 1, 0.3], d: 0.7,
  th: [3000, 1.4], op: 25, el: 0.4, pv: 5.5, pc: 0.1, pr: 30000,
  tags: '양이온구아 자연유래 컨디셔닝 샴푸',
  n: '천연 유래 양이온 폴리머. 낮은 pH에서 미리 수화시켜야 뭉치지 않는다.' },

{ id: 'hydprot', ko: '가수분해실크', inci: 'Hydrolyzed Silk', cat: 'cond', ph: 'C', sol: 'w', u: [0, 3, 1], d: 1.05,
  el: 0.6, pv: 6.0, pc: 0.2, ox: 0.4, lab: [95, 0, 6], tint: 0.15, tmax: 50, pr: 55000,
  tags: '가수분해실크 단백질 아미노산 헤어 보수',
  n: '단백질 가수분해물. 손상 부위를 메운다. 고온에서 갈변·냄새가 생기므로 냉각 후 투입.' },

/* ── 자외선차단제 ───────────────────────────────────────────────── */
{ id: 'emc', ko: '에틸헥실메톡시신나메이트', inci: 'Ethylhexyl Methoxycinnamate', cat: 'uv', ph: 'B', sol: 'o', u: [0, 7.5, 6], d: 1.01, ri: 1.545,
  rh: 11, ox: 0.4, tmax: 88, pr: 16000, spf: 2.2, pfa: 0.15,
  tags: '옥시노세이트 에틸헥실메톡시신나메이트 uvb 유기자차 옥티녹세이트',
  n: 'UVB 주력. 액상이라 다루기 쉽지만 광안정성이 낮고 아보벤존과 함께 쓰면 서로를 망가뜨린다. 국내 한도 7.5%.' },

{ id: 'ehs', ko: '에틸헥실살리실레이트', inci: 'Ethylhexyl Salicylate', cat: 'uv', ph: 'B', sol: 'o', u: [0, 5, 4], d: 1.01, ri: 1.500,
  rh: 11, pr: 14000, spf: 1.0, pfa: 0.05, tags: '옥티살레이트 에틸헥실살리실레이트 uvb 광안정 용해보조',
  n: 'UVB 보조 + 다른 차단제 용해 보조. 광안정성이 좋다. 한도 5%.' },

{ id: 'bemt', ko: '비스에틸헥실옥시페놀메톡시페닐트라이아진', inci: 'Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine', cat: 'uv', ph: 'B', sol: 'o', u: [0, 10, 3], d: 1.1, ri: 1.60,
  rh: 12, lab: [92, 2, 22], tint: 0.6, op: 12, pr: 420000, spf: 3.0, pfa: 1.2, hot: 1,
  tags: '티노소브s bemt 광범위 uva uvb 광안정 고가',
  n: 'UVA·UVB를 모두 막는 고성능 차단제. 노란빛이 강하고 결정성이 높아 완전히 녹이려면 80℃ 이상과 좋은 용제가 필요하다. 식으면서 재결정하면 알갱이가 생긴다.' },

{ id: 'ubm', ko: '부틸메톡시다이벤조일메탄', inci: 'Butyl Methoxydibenzoylmethane', cat: 'uv', ph: 'B', sol: 'o', u: [0, 5, 3], d: 1.1, ri: 1.58,
  rh: 12, ox: 0.6, lab: [93, 0, 18], tint: 0.4, op: 20, pr: 60000, spf: 1.6, pfa: 1.5,
  tags: '아보벤존 부틸메톡시다이벤조일메탄 uva 광불안정',
  n: 'UVA 표준이지만 빛을 받으면 스스로 분해된다. 옥토크릴렌이나 광안정화제와 반드시 함께 쓴다.' },

{ id: 'octo', ko: '옥토크릴렌', inci: 'Octocrylene', cat: 'uv', ph: 'B', sol: 'o', u: [0, 10, 5], d: 1.05, ri: 1.567,
  rh: 11, pr: 20000, spf: 1.1, pfa: 0.2, tags: '옥토크릴렌 uvb 광안정화 아보벤존안정',
  n: '그 자체로 UVB를 막고 아보벤존의 광분해를 억제한다. 점성이 있고 끈적임을 준다.' },

{ id: 'tio2uv', ko: '티타늄디옥사이드(분산)', inci: 'Titanium Dioxide (and) Triethoxycaprylylsilane', cat: 'uv', ph: 'B', sol: 'd', u: [0, 25, 10], d: 1.5, ri: 2.55,
  op: 900, lab: [99, 0, -1], tint: 5.0, pr: 48000, spf: 2.0, pfa: 0.35,
  tags: '티타늄디옥사이드 tio2 무기자차 백탁 uvb 물리적',
  n: '물리적 차단. 굴절률 2.55로 압도적으로 빛을 산란시켜 강한 백탁을 만든다. 분산이 나쁘면 뭉쳐서 차단력이 떨어지고 얼룩이 진다.' },

{ id: 'zno', ko: '징크옥사이드(분산)', inci: 'Zinc Oxide (and) Triethoxycaprylylsilane', cat: 'uv', ph: 'B', sol: 'd', u: [0, 25, 12], d: 1.6, ri: 2.0,
  op: 600, lab: [99, 0, 0], tint: 4.0, el: 0.4, pv: 7.5, pc: 0.4, pr: 30000, spf: 1.1, pfa: 0.9,
  tags: '징크옥사이드 zno 무기자차 uva 백탁 진정',
  n: 'UVA까지 넓게 막는다. 약알칼리성이고 아연 이온이 나와 카보머와 상극이며 처방 pH를 끌어올린다.' },

/* ── 파우더 · 안료 ─────────────────────────────────────────────── */
{ id: 'silica', ko: '실리카', inci: 'Silica', cat: 'powder', ph: 'B', sol: 'd', u: [0, 15, 3], d: 0.6, ri: 1.46,
  op: 260, lab: [98, 0, 0], tint: 1.0, pr: 22000,
  tags: '실리카 silica 피지흡착 매트 소프트포커스',
  n: '피지를 빨아들여 매트하게 만든다. 구형이면 볼베어링처럼 굴러 부드러운 발림성을 준다.' },

{ id: 'nylon12', ko: '나일론-12', inci: 'Nylon-12', cat: 'powder', ph: 'B', sol: 'd', u: [0, 15, 4], d: 1.02, ri: 1.53,
  op: 220, lab: [98, 0, 1], tint: 0.9, pr: 26000,
  tags: '나일론-12 실키파우더 슬립 매트',
  n: '미끄러운 사용감과 매트한 마무리를 준다.' },

{ id: 'starch', ko: '옥수수전분', inci: 'Zea Mays Starch', cat: 'powder', ph: 'B', sol: 'd', u: [0, 15, 4], d: 0.6,
  op: 230, lab: [97, 0, 3], tint: 0.9, ox: 0.4, pr: 4000,
  tags: '전분 스타치 천연 파우더 매트 흡수',
  n: '천연 매트화제. 미생물의 먹이가 되므로 방부에 특히 신경 써야 한다.' },

{ id: 'mica', ko: '마이카', inci: 'Mica', cat: 'powder', ph: 'B', sol: 'd', u: [0, 20, 5], d: 0.4, ri: 1.58,
  op: 320, lab: [96, 0, 2], tint: 1.5, pr: 12000,
  tags: '마이카 mica 운모 펄 광택 소프트포커스',
  n: '판상 구조로 빛을 부드럽게 반사한다. 펄과 커버력의 기본 체질안료.' },

{ id: 'talc', ko: '탈크', inci: 'Talc', cat: 'powder', ph: 'B', sol: 'd', u: [0, 30, 8], d: 0.6, ri: 1.59,
  op: 280, lab: [97, 0, 1], tint: 1.2, pr: 3000,
  tags: '탈크 talc 활석 슬립 체질안료',
  n: '가장 미끄러운 체질안료. 파우더 제형의 뼈대.' },

{ id: 'bn', ko: '보론나이트라이드', inci: 'Boron Nitride', cat: 'powder', ph: 'B', sol: 'd', u: [0, 10, 2], d: 0.5, ri: 1.74,
  op: 300, lab: [98, 0, 0], tint: 1.4, pr: 180000,
  tags: '보론나이트라이드 실키 광택 고급 파우더',
  n: '"화이트 그래파이트". 매끄러움과 은은한 광택을 동시에 준다.' },

{ id: 'ci77491', ko: '적색산화철', inci: 'CI 77491 (Iron Oxides)', cat: 'powder', ph: 'B', sol: 'd', u: [0, 10, 0.5], d: 1.2,
  op: 700, lab: [42, 32, 26], tint: 70, pr: 14000,
  tags: '적색산화철 ci77491 아이언옥사이드 red 색소 파운데이션',
  n: '파운데이션 삼원색 중 붉은색. 분산이 덜 되면 줄무늬가 남는다.' },

{ id: 'ci77492', ko: '황색산화철', inci: 'CI 77492 (Iron Oxides)', cat: 'powder', ph: 'B', sol: 'd', u: [0, 10, 1.0], d: 1.0,
  op: 650, lab: [62, 14, 48], tint: 60, pr: 13000,
  tags: '황색산화철 ci77492 yellow 색소 파운데이션 옐로베이스',
  n: '한국인 피부톤의 기준이 되는 노란색. 보통 가장 많이 들어간다.' },

{ id: 'ci77499', ko: '흑색산화철', inci: 'CI 77499 (Iron Oxides)', cat: 'powder', ph: 'B', sol: 'd', u: [0, 5, 0.1], d: 1.4,
  op: 800, lab: [18, 0, 0], tint: 200, pr: 14000,
  tags: '흑색산화철 ci77499 black 색소 명도조절',
  n: '명도를 낮춘다. 극소량으로 색이 확 어두워지므로 계량 오차에 가장 민감한 원료다.' },

{ id: 'ci15850', ko: '적색 202호', inci: 'CI 15850 (Red 7 Lake)', cat: 'powder', ph: 'B', sol: 'd', u: [0, 5, 0.5], d: 1.3,
  op: 400, lab: [46, 62, 30], tint: 150, pr: 60000,
  tags: '적색202호 red7 레이크 립스틱 색소 선명',
  n: '선명한 청색기 도는 빨강. 립 제형의 주력 레이크 안료.' },

{ id: 'ci19140', ko: '황색 4호', inci: 'CI 19140 (Tartrazine)', cat: 'powder', ph: 'A', sol: 'w', u: [0, 0.1, 0.005], d: 1.0,
  lab: [85, -2, 80], tint: 400, el: 1.2, pr: 40000,
  tags: '황색4호 타트라진 수용성색소 착색',
  n: '수용성 염료. 0.001% 단위로 쓰기 때문에 반드시 1% 희석액을 만들어 계량한다.' },

{ id: 'ci42090', ko: '청색 1호', inci: 'CI 42090 (Blue 1)', cat: 'powder', ph: 'A', sol: 'w', u: [0, 0.1, 0.003], d: 1.0,
  lab: [45, -25, -55], tint: 600, el: 1.2, pr: 45000,
  tags: '청색1호 blue1 수용성색소 착색',
  n: '매우 강한 청색 염료. 노란기를 상쇄해 백색도를 올릴 때도 미량 쓴다.' },

/* ── 활성 성분 ──────────────────────────────────────────────────── */
{ id: 'niacin', ko: '나이아신아마이드', inci: 'Niacinamide', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 4], d: 1.4, tmax: 60,
  pv: 6.5, pc: 0.4, el: 0.3, pr: 22000, hot: 1,
  tags: '나이아신아마이드 비타민b3 미백 주름 홍조',
  n: '미백·주름 이중 기능성. pH 5~7에서 안정하며, pH 4 이하나 장시간 가열에서 니코틴산으로 가수분해되어 홍조와 자극을 일으킨다.' },

{ id: 'aa', ko: '아스코빅애씨드', inci: 'Ascorbic Acid', cat: 'active', ph: 'C', sol: 'w', u: [0, 20, 10], d: 1.65, tmax: 35,
  pv: 2.5, pc: 2.5, el: 1.0, ox: 1.0, lab: [97, 0, 4], tint: 0.6, pr: 30000,
  tags: '비타민c 아스코빅애씨드 미백 항산화 산화 황변',
  n: '순수 비타민C. 효과는 최고지만 물·산소·빛·금속이온 앞에서 급격히 산화해 노랗다 못해 갈색으로 변한다. pH 3.5 이하, 무산소 공정, 킬레이트제가 필수다.' },

{ id: 'eac', ko: '3-O-에틸아스코빅애씨드', inci: '3-O-Ethyl Ascorbic Acid', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 2], d: 1.3, tmax: 50,
  pv: 4.5, pc: 0.6, ox: 0.25, lab: [97, 0, 3], tint: 0.3, pr: 280000, hot: 1,
  tags: '에틸아스코빅애씨드 비타민c유도체 안정 미백',
  n: '안정화된 비타민C 유도체. 순수 C보다 훨씬 덜 변색되면서 피부에서 활성형으로 전환된다.' },

{ id: 'ag', ko: '아스코빌글루코사이드', inci: 'Ascorbyl Glucoside', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 2], d: 1.4, tmax: 50,
  pv: 6.0, pc: 0.3, ox: 0.2, pr: 200000,
  tags: '아스코빌글루코사이드 ag 비타민c 유도체 미백 기능성',
  n: '당을 붙여 안정화한 비타민C. 중성 pH에서 안정해 다루기 쉽다.' },

{ id: 'adeno', ko: '아데노신', inci: 'Adenosine', cat: 'active', ph: 'A', sol: 'w', u: [0, 0.1, 0.04], d: 1.3,
  pv: 6.5, pc: 0.05, pr: 900000,
  tags: '아데노신 주름개선 기능성 고시원료',
  n: '주름개선 고시 원료. 고시 함량은 0.04%. 이 극미량을 정확히 맞추는 것이 소량 생산에서 가장 어려운 과제다. 용해도가 낮아 미리 온수에 녹여 넣는다.' },

{ id: 'reti', ko: '레티놀', inci: 'Retinol (10만 IU/g)', cat: 'active', ph: 'C', sol: 'o', u: [0, 1, 0.25], d: 0.95, tmax: 40,
  ox: 0.95, lab: [92, 3, 26], tint: 0.8, pr: 900000,
  tags: '레티놀 비타민a 주름개선 산화 불안정 차광',
  n: '주름개선의 정점이자 가장 다루기 어려운 원료. 열·빛·산소에 모두 약하다. 40℃ 이하, 질소 치환, 차광 용기가 삼종 세트다.' },

{ id: 'baka', ko: '바쿠치올', inci: 'Bakuchiol', cat: 'active', ph: 'B', sol: 'o', u: [0, 2, 0.5], d: 0.95,
  ox: 0.3, lab: [90, 2, 20], tint: 0.5, pr: 600000, hot: 1,
  tags: '바쿠치올 레티놀대체 식물 항노화',
  n: '레티놀 유사 효과를 내는 식물 유래 성분. 훨씬 안정적이고 자극이 적다.' },

{ id: 'arbutin', ko: '알부틴', inci: 'Arbutin', cat: 'active', ph: 'C', sol: 'w', u: [0, 3, 2], d: 1.3, tmax: 55,
  pv: 5.5, pc: 0.2, ox: 0.4, pr: 150000,
  tags: '알부틴 미백 기능성 하이드로퀴논 티로시나제',
  n: '미백 고시 원료(2%). 산성·고온에서 가수분해되어 하이드로퀴논이 나올 수 있으므로 pH와 온도 관리가 중요하다.' },

{ id: 'sa', ko: '살리실릭애씨드', inci: 'Salicylic Acid', cat: 'active', ph: 'B', sol: 'o', u: [0, 2, 0.5], d: 1.44,
  pv: 3.0, pc: 1.2, pr: 20000,
  tags: '살리실릭애씨드 bha 각질 모공 여드름',
  n: 'BHA. 물에 잘 안 녹아 글라이콜이나 알코올에 미리 녹여야 한다. pH 4 이하에서만 유리산으로 존재해 효과가 난다.' },

{ id: 'ga', ko: '글라이콜릭애씨드', inci: 'Glycolic Acid (70%)', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 3], d: 1.25,
  pv: 1.5, pc: 2.2, el: 0.6, pr: 8000,
  tags: '글라이콜릭애씨드 aha 각질 필링 산',
  n: '분자량이 작아 침투가 빠른 AHA. 최종 pH를 3.5 이상으로 올려 자극을 조절한다.' },

{ id: 'lactic', ko: '락틱애씨드', inci: 'Lactic Acid (88%)', cat: 'ph', ph: 'D', sol: 'w', u: [0, 8, 0.3], d: 1.2,
  pv: 2.0, pc: 2.0, el: 0.5, pr: 5000,
  tags: '락틱애씨드 aha ph조절 산 보습',
  n: 'AHA이자 pH 조절제. 글라이콜릭보다 순하고 보습감이 있다.' },

{ id: 'allantoin', ko: '알란토인', inci: 'Allantoin', cat: 'active', ph: 'A', sol: 'w', u: [0, 0.5, 0.2], d: 1.4,
  pv: 6.0, pc: 0.1, op: 1.5, pr: 26000,
  tags: '알란토인 진정 각질 용해도한계 석출',
  n: '진정·각질 연화. 상온 물 용해도가 0.5% 남짓이라 그 이상 넣으면 식으면서 바늘 모양 결정이 석출된다.' },

{ id: 'madeca', ko: '센텔라아시아티카추출물', inci: 'Centella Asiatica Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 2], d: 1.0, tmax: 50,
  pv: 5.5, pc: 0.2, el: 0.8, ox: 0.6, lab: [90, -4, 16], tint: 0.9, op: 6, pr: 60000,
  tags: '센텔라 시카 마데카소사이드 진정 병풀 추출물',
  n: '진정의 대명사. 추출물은 전해질과 색소를 함께 가져와 카보머 점도를 떨어뜨리고 처방을 누렇게 만든다.' },

{ id: 'green', ko: '녹차추출물', inci: 'Camellia Sinensis Leaf Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 1], d: 1.0, tmax: 50,
  pv: 5.5, pc: 0.2, el: 0.9, ox: 0.8, lab: [85, -6, 24], tint: 1.4, op: 8, pr: 35000,
  tags: '녹차 카테킨 항산화 추출물 갈변',
  n: '폴리페놀이 풍부해 항산화 효과가 좋지만, 바로 그 폴리페놀이 산화되어 처방을 갈색으로 만든다.' },

{ id: 'cera', ko: '세라마이드NP', inci: 'Ceramide NP', cat: 'active', ph: 'B', sol: 'o', u: [0, 1, 0.2], d: 0.95,
  op: 40, pr: 1200000, hot: 1,
  tags: '세라마이드 ceramide np 장벽 지질 용해어려움',
  n: '피부 장벽 지질. 융점이 높고 용해가 매우 어렵다. 75℃ 이상에서 오일·글리콜에 완전히 녹이지 않으면 식은 뒤 결정으로 석출되어 알갱이가 뜬다.' },

{ id: 'pep', ko: '팔미토일트라이펩타이드-1', inci: 'Palmitoyl Tripeptide-1', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 2], d: 1.0, tmax: 45,
  ox: 0.5, el: 0.4, pr: 400000,
  tags: '펩타이드 트라이펩타이드 주름 시그널',
  n: '신호 전달 펩타이드. 열과 단백질 분해에 약하므로 저온에서 넣고 급격한 pH 이동을 피한다.' },

{ id: 'caff', ko: '카페인', inci: 'Caffeine', cat: 'active', ph: 'A', sol: 'w', u: [0, 3, 1], d: 1.23,
  pv: 6.5, pc: 0.05, op: 2, pr: 30000,
  tags: '카페인 순환 눈가 부기 셀룰라이트',
  n: '혈행·부기 관리. 찬물에 잘 안 녹으니 80℃ 물에 녹인다.' },

{ id: 'ttoil', ko: '티트리오일', inci: 'Melaleuca Alternifolia Leaf Oil', cat: 'active', ph: 'C', sol: 'o', u: [0, 2, 0.5], d: 0.89, ri: 1.478,
  rh: 12, vol: 0.6, tmax: 40, ox: 0.6, pr: 40000,
  tags: '티트리 에센셜오일 여드름 항균 휘발',
  n: '항균 에센셜오일. 휘발성이 커서 가온하면 날아가고, 산화하면 자극 물질이 생긴다.' },

/* ── 방부제 ─────────────────────────────────────────────────────── */
{ id: 'phenox', ko: '페녹시에탄올', inci: 'Phenoxyethanol', cat: 'presv', ph: 'C', sol: 'w', u: [0, 1, 0.7], d: 1.11, ri: 1.537,
  tmax: 45, vol: 0.2, pv: 6.5, pc: 0.02, pr: 6000,
  tags: '페녹시에탄올 방부제 표준 1% 한도',
  n: '가장 널리 쓰이는 방부제. 한도 1%. pH 7 이하에서 잘 듣고, 45℃ 이상에서 넣으면 증발 손실과 향 변화가 생긴다.' },

{ id: 'pe9010', ko: '페녹시에탄올/에틸헥실글리세린', inci: 'Phenoxyethanol (and) Ethylhexylglycerin', cat: 'presv', ph: 'C', sol: 'w', u: [0, 1.2, 0.9], d: 1.1,
  tmax: 45, vol: 0.18, pv: 6.5, pc: 0.02, pr: 14000,
  tags: '유크실 pe9010 방부제 블렌드 표준',
  n: '에틸헥실글리세린이 계면 활성 작용으로 방부력을 끌어올린다. 사실상의 업계 표준 조합.' },

{ id: 'ehg', ko: '에틸헥실글리세린', inci: 'Ethylhexylglycerin', cat: 'presv', ph: 'C', sol: 'wo', u: [0, 1, 0.3], d: 0.95,
  tmax: 60, hlb: 8, pr: 30000,
  tags: '에틸헥실글리세린 방부보조 데오드란트 부스터',
  n: '단독 방부력은 약하지만 다른 방부제의 효과를 크게 올린다.' },

{ id: 'clophen', ko: '클로페네신', inci: 'Chlorphenesin', cat: 'presv', ph: 'C', sol: 'w', u: [0, 0.3, 0.2], d: 1.2,
  tmax: 50, pv: 6.5, pr: 26000, tags: '클로페네신 방부제 곰팡이 광범위',
  n: '곰팡이·효모에 강하다. 페녹시에탄올과 조합해 스펙트럼을 넓힌다.' },

{ id: 'nabenz', ko: '소듐벤조에이트', inci: 'Sodium Benzoate', cat: 'presv', ph: 'C', sol: 'w', u: [0, 0.5, 0.3], d: 1.4,
  el: 2.5, pv: 7.5, pc: 0.5, pr: 3500,
  tags: '소듐벤조에이트 방부제 산성 천연인증 전해질',
  n: 'pH 5 이하에서만 제 힘을 낸다(유리 벤조산이 활성). 염이라 전해질 부하가 크고 비타민C와 만나면 벤젠이 생길 수 있다.' },

{ id: 'ksorb', ko: '포타슘솔베이트', inci: 'Potassium Sorbate', cat: 'presv', ph: 'C', sol: 'w', u: [0, 0.5, 0.3], d: 1.4,
  el: 2.4, pv: 8.0, pc: 0.5, ox: 0.5, lab: [94, 2, 14], tint: 0.3, pr: 5000,
  tags: '포타슘솔베이트 방부제 곰팡이 산성 갈변',
  n: '곰팡이·효모용. pH 5.5 이하 필수. 시간이 지나면 갈변하는 성질이 있다.' },

{ id: 'caprylyl', ko: '카프릴릴글라이콜', inci: 'Caprylyl Glycol', cat: 'presv', ph: 'C', sol: 'wo', u: [0, 1, 0.5], d: 0.94,
  tmax: 60, hlb: 8, pr: 32000,
  tags: '카프릴릴글라이콜 방부보조 보습 다이올',
  n: '보습 + 항균 다이올. 무방부 표방 처방의 조합원.' },

{ id: 'benzalc', ko: '벤질알코올', inci: 'Benzyl Alcohol', cat: 'presv', ph: 'C', sol: 'w', u: [0, 1, 0.5], d: 1.04, ri: 1.539,
  tmax: 45, vol: 0.3, pv: 6.5, pr: 7000,
  tags: '벤질알코올 방부제 천연인증 향',
  n: '천연 인증이 가능한 방부제. 특유의 아몬드 향이 있다.' },

/* ── pH 조절 · 킬레이트 · 항산화 ────────────────────────────────── */
{ id: 'tea', ko: '트라이에탄올아민', inci: 'Triethanolamine', cat: 'ph', ph: 'D', sol: 'w', u: [0, 2, 0.15], d: 1.12, ri: 1.485,
  pv: 10.5, pc: 4.0, el: 1.0, pr: 4000,
  tags: 'tea 트라이에탄올아민 중화제 카보머 알칼리',
  n: '카보머 중화의 고전. 카보머 1g당 약 0.4~0.5g. 니트로사민 우려로 최근에는 아르지닌·트로메타민으로 대체하는 추세.' },

{ id: 'naoh', ko: '소듐하이드록사이드(18%)', inci: 'Sodium Hydroxide (18% aq.)', cat: 'ph', ph: 'D', sol: 'w', u: [0, 5, 0.7], d: 1.2,
  pv: 13.0, pc: 8.0, el: 6, pr: 1500,
  tags: 'naoh 수산화나트륨 가성소다 중화 강알칼리',
  n: '강력하고 값싸다. 카보머 1g당 18% 용액 약 0.7g. 국소적으로 과중화되면 겔이 끊어지므로 아주 천천히 적하한다.' },

{ id: 'arginine', ko: '아르지닌', inci: 'Arginine', cat: 'ph', ph: 'D', sol: 'w', u: [0, 2, 0.3], d: 1.1,
  pv: 10.8, pc: 3.0, el: 1.5, pr: 26000,
  tags: '아르지닌 아미노산 중화제 천연 카보머',
  n: '아미노산 중화제. 완충력이 있어 pH가 잘 흔들리지 않고 천연 인증에 유리하다.' },

{ id: 'tromet', ko: '트로메타민', inci: 'Tromethamine', cat: 'ph', ph: 'D', sol: 'w', u: [0, 2, 0.25], d: 1.1,
  pv: 10.4, pc: 3.5, el: 1.2, pr: 18000,
  tags: '트로메타민 tris 중화제 카보머 투명',
  n: 'TEA 대체 중화제. 투명도가 높은 겔을 만든다.' },

{ id: 'citric', ko: '시트릭애씨드', inci: 'Citric Acid', cat: 'ph', ph: 'D', sol: 'w', u: [0, 2, 0.1], d: 1.66,
  pv: 2.2, pc: 2.5, el: 3.0, pr: 2500,
  tags: '시트릭애씨드 구연산 ph조절 산 킬레이트 전해질',
  n: '가장 흔한 산성 조절제. 3가 산이라 전해질 부하가 크고 카보머 겔을 눈에 띄게 무너뜨린다.' },

{ id: 'nacitrate', ko: '소듐시트레이트', inci: 'Sodium Citrate', cat: 'ph', ph: 'A', sol: 'w', u: [0, 2, 0.2], d: 1.7,
  pv: 8.0, pc: 2.0, el: 4.0, pr: 3000,
  tags: '소듐시트레이트 완충 버퍼 전해질',
  n: '시트릭애씨드와 짝을 지어 pH를 붙잡아 두는 완충계를 만든다.' },

{ id: 'edta', ko: '다이소듐이디티에이', inci: 'Disodium EDTA', cat: 'misc', ph: 'A', sol: 'w', u: [0, 0.2, 0.05], d: 1.5,
  pv: 5.0, pc: 0.3, el: 2.0, pr: 6000,
  tags: 'edta 킬레이트 금속봉쇄 변색방지 안정',
  n: '금속 이온을 붙잡아 산화·변색을 막고 방부력을 높인다. 0.05%면 충분하고, 미량이라도 전해질로 작용한다.' },

{ id: 'phytic', ko: '파이틱애씨드', inci: 'Phytic Acid', cat: 'misc', ph: 'A', sol: 'w', u: [0, 0.3, 0.1], d: 1.1,
  pv: 2.0, pc: 0.8, el: 2.5, pr: 20000,
  tags: '파이틱애씨드 천연킬레이트 edta대체',
  n: '천연 유래 킬레이트제. EDTA 대체.' },

{ id: 'tocoph', ko: '토코페롤', inci: 'Tocopherol', cat: 'misc', ph: 'B', sol: 'o', u: [0, 1, 0.2], d: 0.95, ri: 1.503,
  rh: 6, ox: 0.3, lab: [88, 2, 32], tint: 1.0, pr: 60000,
  tags: '토코페롤 비타민e 항산화 산패방지',
  n: '유상 항산화제. 식물유의 산패를 막는다. 그 자체가 노란색이라 많이 넣으면 처방이 누레진다.' },

{ id: 'bht', ko: 'BHT', inci: 'BHT', cat: 'misc', ph: 'B', sol: 'o', u: [0, 0.1, 0.05], d: 1.0,
  pr: 12000, tags: 'bht 항산화 합성 산패방지',
  n: '합성 항산화제. 아주 적은 양으로 강하게 작동한다.' },

{ id: 'parfum', ko: '향료', inci: 'Parfum', cat: 'misc', ph: 'C', sol: 'o', u: [0, 1, 0.2], d: 0.95, ri: 1.48,
  tmax: 40, vol: 0.9, rh: 12, ox: 0.4, lab: [93, 1, 14], tint: 0.3, pr: 120000,
  tags: '향료 프래그런스 parfum 부향 휘발',
  n: '가장 휘발성이 큰 원료. 40℃를 넘겨 넣으면 탑노트가 날아가 향이 달라진다. 유화물에서는 계면에 몰려 안정성을 흔들기도 한다.' },

{ id: 'menthol', ko: '멘톨', inci: 'Menthol', cat: 'misc', ph: 'C', sol: 'o', u: [0, 0.5, 0.1], d: 0.9,
  tmax: 40, vol: 0.8, pr: 40000, tags: '멘톨 쿨링 청량 두피 승화',
  n: '청량감. 승화성이 있어 가온 중에 그대로 날아간다.' },

/* ══════════════════════════════════════════════════════════════════
   최근 실무 대세 원료 (2025~2026)
   ══════════════════════════════════════════════════════════════════ */

/* ── 바이오 · 재생 활성 ──────────────────────────────────────────── */
{ id: 'pdrn', ko: '폴리데옥시리보뉴클레오타이드', inci: 'Polydeoxyribonucleotide', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 1], d: 1.0, tmax: 45,
  pv: 6.8, pc: 0.15, el: 0.5, ox: 0.4, op: 3, pr: 2400000, hot: 1,
  tags: 'pdrn 폴리데옥시리보뉴클레오타이드 연어dna 재생 리쥬란 회복',
  n: '연어 정소 DNA 단편. 재생·회복 소구로 2025년 이후 K-뷰티의 최대 화두. 고분자 핵산이라 열과 전단에 사슬이 끊기고, 강한 전해질에서 뭉친다. 45℃ 이하 냉각 투입이 원칙.' },

{ id: 'exo', ko: '엑소좀 배양액', inci: 'Adipose-Derived Stem Cell Exosomes', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 1], d: 1.0, tmax: 40,
  pv: 7.0, pc: 0.1, el: 0.4, ox: 0.5, op: 4, pr: 6000000, hot: 1,
  tags: '엑소좀 exosome 줄기세포 배양액 세포외소포 재생',
  n: '세포가 내보내는 지질 소포. 신호 전달 물질을 실어 나른다는 개념으로 프리미엄 앰플에 들어간다. 지질막이라 열·계면활성제·고전단에 깨진다. 저온·저전단·후첨이 필수.' },

{ id: 'ectoin', ko: '엑토인', inci: 'Ectoin', cat: 'active', ph: 'C', sol: 'w', u: [0, 2, 0.5], d: 1.2, tmax: 70,
  pv: 6.5, pc: 0.1, el: 0.6, pr: 1800000, hot: 1,
  tags: '엑토인 ectoin 극한미생물 보호 진정 수분장벽',
  n: '극한 환경 미생물이 만드는 아미노산 유도체. 세포 주변에 수화막을 만들어 단백질과 지질막을 보호한다. 매우 안정해서 다루기 쉽고, 0.5%면 충분하다.' },

{ id: 'betaglucan', ko: '베타글루칸', inci: 'Beta-Glucan', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 1], d: 1.0, tmax: 60,
  th: [1400, 1.2], op: 14, pv: 6.0, pc: 0.1, el: 0.3, ox: 0.3, pr: 90000, hot: 1,
  tags: '베타글루칸 beta-glucan 귀리 효모 진정 면역 점증',
  n: '귀리·효모 유래 다당류. 진정과 보습에 더해 약간의 점증 효과가 있다. 고분자라 뿌옇게 흐려지는 경향이 있다.' },

{ id: 'pga', ko: '소듐폴리글루타메이트', inci: 'Sodium Polyglutamate', cat: 'humect', ph: 'C', sol: 'w', u: [0, 2, 0.3], d: 1.0,
  th: [1800, 1.2], op: 5, pv: 6.5, pc: 0.15, el: 1.4, pr: 220000, hot: 1,
  tags: '폴리글루탐산 pga 낫토 보습 히알루론대체',
  n: '낫토 발효 유래. 히알루론산보다 수분 보유력이 크다고 알려져 있다. 염이라 전해질 부하가 있다.' },

{ id: 'trxa', ko: '트라넥사믹애씨드', inci: 'Tranexamic Acid', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 2], d: 1.3, tmax: 60,
  pv: 7.0, pc: 0.3, el: 0.5, pr: 60000, hot: 1,
  tags: '트라넥사믹애씨드 tranexamic 미백 색소침착 홍조 기미',
  n: '색소 침착과 홍조에 쓰는 미백 활성. 물에 잘 녹고 안정하지만 자체가 약염기라 pH 를 끌어올린다. 2~5%로 쓴다.' },

{ id: 'azeloyl', ko: '포타슘아젤로일다이글리시네이트', inci: 'Potassium Azeloyl Diglycinate', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 4], d: 1.1,
  pv: 6.0, pc: 0.4, el: 2.2, pr: 130000, hot: 1,
  tags: '아젤라익 아젤로일 azeloyl 피지 모공 미백 수용성',
  n: '아젤라익애씨드의 수용성 유도체. 피지 조절과 색소 완화를 함께 노린다. 전해질 부하가 커서 카보머 겔과는 상성이 나쁘다.' },

{ id: 'retinal', ko: '레티날', inci: 'Retinal (Retinaldehyde)', cat: 'active', ph: 'C', sol: 'o', u: [0, 0.1, 0.05], d: 0.95, tmax: 38,
  ox: 0.98, lab: [88, 6, 42], tint: 1.4, pr: 4000000, hot: 1,
  tags: '레티날 retinal 레티날데하이드 비타민a 주름 레티놀상위',
  n: '레티놀보다 한 단계 앞선 형태라 전환 단계가 짧고 효과가 빠르다. 대신 더 불안정하고 진한 노란색이라 제형이 누렇게 뜬다. 0.05%에서도 색이 보인다.' },

{ id: 'granactive', ko: '하이드록시피나콜론레티노에이트', inci: 'Hydroxypinacolone Retinoate', cat: 'active', ph: 'B', sol: 'o', u: [0, 2, 0.5], d: 1.0,
  ox: 0.35, lab: [94, 1, 12], tint: 0.3, pr: 1600000, hot: 1,
  tags: '그래낙티브 hpr 레티노이드 에스터 저자극 주름',
  n: '수용체에 직접 붙는 레티노이드 에스터. 레티놀보다 훨씬 안정하고 자극이 적어 "순한 레티놀" 소구에 쓴다.' },

{ id: 'argireline', ko: '아세틸헥사펩타이드-8', inci: 'Acetyl Hexapeptide-8', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 4], d: 1.0, tmax: 45,
  ox: 0.4, el: 0.6, pv: 6.0, pc: 0.2, pr: 300000, hot: 1,
  tags: '아르지렐린 아세틸헥사펩타이드 표정주름 보톡스유사 펩타이드',
  n: '표정 주름을 겨냥한 신호 펩타이드. 보통 10% 용액으로 공급되어 처방에 4~10% 넣는다. 열과 극단적 pH 를 피한다.' },

{ id: 'copperpep', ko: '카퍼트라이펩타이드-1', inci: 'Copper Tripeptide-1', cat: 'active', ph: 'C', sol: 'w', u: [0, 2, 0.5], d: 1.0, tmax: 45,
  ox: 0.5, el: 0.8, pv: 6.5, pc: 0.2, lab: [72, -14, -6], tint: 3.5, pr: 900000, hot: 1,
  tags: '구리펩타이드 카퍼펩타이드 ghk-cu 재생 콜라겐',
  n: '구리 착화 펩타이드. 특유의 파란색이라 처방이 푸르스름해진다. 킬레이트제(EDTA)와 같이 쓰면 구리를 빼앗겨 효과와 색이 함께 사라진다.' },

{ id: 'matrixyl', ko: '팔미토일펜타펩타이드-4', inci: 'Palmitoyl Pentapeptide-4', cat: 'active', ph: 'C', sol: 'w', u: [0, 5, 3], d: 1.0, tmax: 45,
  ox: 0.45, el: 0.4, pr: 420000, hot: 1,
  tags: '마트릭실 팔미토일펜타펩타이드 콜라겐 주름 펩타이드',
  n: '콜라겐 합성 신호를 주는 대표 펩타이드. 3% 전후로 쓴다.' },

{ id: 'glutathione', ko: '글루타티온', inci: 'Glutathione', cat: 'active', ph: 'C', sol: 'w', u: [0, 2, 0.5], d: 1.2, tmax: 40,
  ox: 0.8, el: 0.7, pv: 4.5, pc: 0.5, lab: [95, 0, 8], tint: 0.4, pr: 260000, hot: 1,
  tags: '글루타티온 glutathione 항산화 미백 톤업',
  n: '체내 항산화 물질. 산화되면 효과가 사라지고 특유의 냄새가 난다. 무산소 공정과 킬레이트가 사실상 필수.' },

{ id: 'resveratrol', ko: '레스베라트롤', inci: 'Resveratrol', cat: 'active', ph: 'C', sol: 'o', u: [0, 1, 0.2], d: 1.0, tmax: 50,
  ox: 0.7, lab: [90, 2, 26], tint: 0.9, pr: 320000,
  tags: '레스베라트롤 폴리페놀 항산화 포도 항노화',
  n: '포도 유래 폴리페놀. 강한 항산화제지만 빛과 산소에 갈변한다.' },

{ id: 'butylres', ko: '4-부틸레조르시놀', inci: '4-Butylresorcinol', cat: 'active', ph: 'C', sol: 'w', u: [0, 0.3, 0.2], d: 1.1, tmax: 45,
  ox: 0.6, el: 0.2, lab: [94, 1, 14], tint: 0.5, pr: 900000, hot: 1,
  tags: '부틸레조르시놀 미백 고시원료 티로시나제 기미',
  n: '미백 고시 원료(0.1~0.3%). 티로시나제 억제력이 알부틴보다 훨씬 강하다. 산화 변색에 주의.' },

/* ── 발효 · 포스트바이오틱 ──────────────────────────────────────── */
{ id: 'galacto', ko: '갈락토미세스발효여과물', inci: 'Galactomyces Ferment Filtrate', cat: 'active', ph: 'C', sol: 'w', u: [0, 90, 20], d: 1.0, tmax: 45,
  pv: 5.0, pc: 0.4, el: 1.6, ox: 0.5, lab: [93, -1, 12], tint: 0.5, op: 5, pr: 26000, hot: 1,
  tags: '갈락토미세스 발효여과물 피테라 모공 결 발효',
  n: '누룩 발효 여과물. 정제수 자리를 통째로 대신해 80~90%까지 넣는 처방도 있다. 산성이고 전해질과 유기물이 많아 점증과 방부 설계를 다시 짜야 한다.' },

{ id: 'bifida', ko: '비피다발효용해물', inci: 'Bifida Ferment Lysate', cat: 'active', ph: 'C', sol: 'w', u: [0, 20, 5], d: 1.0, tmax: 45,
  pv: 5.5, pc: 0.3, el: 1.4, ox: 0.5, lab: [92, 0, 14], tint: 0.5, op: 6, pr: 60000, hot: 1,
  tags: '비피다 발효용해물 프로바이오틱 포스트바이오틱 장벽 진정',
  n: '유산균 용해물. 포스트바이오틱 소구의 대표. 미생물 배지 성분이 함께 들어와 방부 부담이 커진다.' },

{ id: 'lactoferm', ko: '락토바실러스발효물', inci: 'Lactobacillus Ferment', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 3], d: 1.0, tmax: 45,
  pv: 4.5, pc: 0.5, el: 1.3, ox: 0.4, op: 5, pr: 40000, hot: 1,
  tags: '락토바실러스 발효 포스트바이오틱 마이크로바이옴 저자극',
  n: '마이크로바이옴 소구. 그 자체가 산성이라 처방 pH 를 끌어내린다.' },

{ id: 'riceferm', ko: '쌀발효여과물', inci: 'Oryza Sativa Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 20, 5], d: 1.0, tmax: 50,
  pv: 5.5, pc: 0.25, el: 1.0, ox: 0.5, lab: [93, -1, 14], tint: 0.5, op: 6, pr: 22000, hot: 1,
  tags: '쌀 발효 오리자 사티바 톤업 결 한방',
  n: '쌀 유래 발효물. 톤업·결 소구로 한국 브랜드가 즐겨 쓴다. 당류가 있어 가열 시 갈변한다.' },

/* ── 진정 · 추출물 ─────────────────────────────────────────────── */
{ id: 'heartleaf', ko: '어성초추출물', inci: 'Houttuynia Cordata Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 80, 10], d: 1.0, tmax: 50,
  pv: 5.5, pc: 0.25, el: 1.1, ox: 0.6, lab: [88, -5, 18], tint: 1.0, op: 7, pr: 20000, hot: 1,
  tags: '어성초 하우투이니아 진정 트러블 민감 발효',
  n: '트러블·민감 진정의 대표 소재. 정제수 대신 통째로 넣는 처방이 많다. 색과 전해질을 함께 가져온다.' },

{ id: 'mugwort', ko: '쑥추출물', inci: 'Artemisia Vulgaris Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 80, 8], d: 1.0, tmax: 50,
  pv: 5.5, pc: 0.25, el: 1.0, ox: 0.65, lab: [86, -7, 20], tint: 1.3, op: 8, pr: 24000, hot: 1,
  tags: '쑥 아르테미시아 진정 민감 한방',
  n: '진정 소재. 녹갈색이 진해 제형 색을 확실히 바꾼다. 폴리페놀이 많아 산화 갈변이 빠르다.' },

{ id: 'snail', ko: '달팽이점액여과물', inci: 'Snail Secretion Filtrate', cat: 'active', ph: 'C', sol: 'w', u: [0, 92, 20], d: 1.0, tmax: 45,
  th: [900, 1.15], pv: 6.5, pc: 0.2, el: 1.2, ox: 0.4, op: 10, pr: 30000, hot: 1,
  tags: '달팽이 점액 뮤신 재생 보습 탄력',
  n: '점성 다당·당단백 혼합물. 자체 점도와 특유의 늘어짐이 있어 점증제 설계에 영향을 준다.' },

{ id: 'propolis', ko: '프로폴리스추출물', inci: 'Propolis Extract', cat: 'active', ph: 'C', sol: 'w', u: [0, 20, 5], d: 1.0, tmax: 45,
  pv: 5.0, pc: 0.3, el: 0.9, ox: 0.7, lab: [82, 4, 40], tint: 2.2, op: 12, pr: 45000, hot: 1,
  tags: '프로폴리스 벌 진정 항균 광채 꿀',
  n: '벌집 수지 추출물. 진한 호박색이라 제형이 확실히 누레진다. 항균력이 있어 방부에 조금 보탬이 된다.' },

{ id: 'madecas', ko: '마데카소사이드', inci: 'Madecassoside', cat: 'active', ph: 'C', sol: 'w', u: [0, 1, 0.2], d: 1.2, tmax: 55,
  pv: 6.0, pc: 0.1, ox: 0.3, op: 4, pr: 1400000, hot: 1,
  tags: '마데카소사이드 정제센텔라 시카 진정 재생 teca',
  n: '센텔라에서 뽑아낸 단일 성분. 추출물과 달리 색과 전해질을 거의 안 들고 온다. 물 용해도가 낮아 폴리올에 미리 녹인다.' },

/* ── 장벽 지질 ─────────────────────────────────────────────────── */
{ id: 'cholesterol', ko: '콜레스테롤', inci: 'Cholesterol', cat: 'active', ph: 'B', sol: 'o', u: [0, 1, 0.2], d: 1.0,
  lam: 0.4, op: 60, pr: 180000, hot: 1,
  tags: '콜레스테롤 장벽 지질 세라마이드조합 3종지질',
  n: '세라마이드 : 콜레스테롤 : 지방산 = 3:1:1 이 피부 장벽의 황금비다. 세 가지를 같이 넣어야 의미가 있다.' },

{ id: 'phytosph', ko: '피토스핑고신', inci: 'Phytosphingosine', cat: 'active', ph: 'B', sol: 'o', u: [0, 0.5, 0.1], d: 0.95,
  op: 30, pv: 9.0, pc: 0.4, pr: 900000,
  tags: '피토스핑고신 스핑고신 장벽 항균 세라마이드전구체',
  n: '세라마이드의 뼈대가 되는 염기성 지질. 항균력도 있다. 염기성이라 소량으로도 pH 를 올린다.' },

/* ── 각질 · 산 ─────────────────────────────────────────────────── */
{ id: 'mandelic', ko: '만델릭애씨드', inci: 'Mandelic Acid', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 3], d: 1.3,
  pv: 3.4, pc: 1.6, el: 0.4, ox: 0.3, pr: 60000, hot: 1,
  tags: '만델릭애씨드 aha 저자극 각질 색소 대분자',
  n: '분자가 커서 천천히 침투하는 AHA. 자극이 적어 민감성 각질 관리에 쓴다.' },

{ id: 'pha', ko: '글루코노락톤', inci: 'Gluconolactone', cat: 'active', ph: 'C', sol: 'w', u: [0, 10, 4], d: 1.2,
  pv: 3.6, pc: 1.4, el: 0.5, pr: 30000, hot: 1,
  tags: 'pha 글루코노락톤 폴리하이드록시 저자극 각질 보습',
  n: 'PHA. 분자에 수산기가 많아 보습을 겸하고 자극이 낮다. 물에서 천천히 글루콘산으로 열려 pH 가 시간이 지나며 내려간다.' },

{ id: 'lha', ko: '카프릴로일살리실릭애씨드', inci: 'Capryloyl Salicylic Acid', cat: 'active', ph: 'B', sol: 'o', u: [0, 2, 0.5], d: 1.1,
  pv: 3.4, pc: 0.9, pr: 400000,
  tags: 'lha 카프릴로일살리실릭 bha유도체 모공 각질',
  n: 'BHA 에 지방 사슬을 붙인 유도체. 유상에 녹아 다루기 쉽고 각질을 낱장으로 떼어낸다.' },

{ id: 'zincpca', ko: '징크피씨에이', inci: 'Zinc PCA', cat: 'active', ph: 'C', sol: 'w', u: [0, 1, 0.3], d: 1.2,
  pv: 6.5, pc: 0.3, el: 2.6, pr: 90000,
  tags: '징크피씨에이 아연 피지 모공 트러블',
  n: '피지 조절용 아연염. 전해질 부하가 크고, 아연 이온이 카보머와 일부 활성을 무너뜨린다.' },

/* ── 현대 점증 · 유화 ──────────────────────────────────────────── */
{ id: 'sepimax', ko: '폴리아크릴레이트크로스폴리머-6', inci: 'Polyacrylate Crosspolymer-6', cat: 'thick', ph: 'A', sol: 'w', u: [0, 3, 1.2], d: 0.5,
  th: [16000, 1.35], op: 3, pv: 6.2, pc: 0.2, pr: 140000, hot: 1,
  tags: '세피맥스젠 sepimax zen 폴리아크릴레이트크로스폴리머-6 전해질내성 냉공정 벨벳',
  n: '중화가 필요 없고 전해질을 소금 10%까지 견딘다. 고농도 활성이 들어가는 요즘 세럼에서 카보머를 밀어낸 주역. 벨벳 같은 사용감에 파우더 부유력도 좋다.' },

{ id: 'simulgeleg', ko: '소듐아크릴레이트/소듐아크릴로일다이메틸타우레이트코폴리머', inci: 'Sodium Acrylate/Sodium Acryloyldimethyl Taurate Copolymer', cat: 'thick', ph: 'A', sol: 'w', u: [0, 4, 1.5], d: 0.95,
  th: [11000, 1.35], hlb: 11, op: 5, pv: 6.4, pc: 0.2, pr: 82000, hot: 1,
  tags: '시뮬젤eg simulgel 즉시점증 냉공정 역상 유화점증',
  n: '물에 넣는 즉시 점도가 오르는 역상 에멀전형. 냉공정 크림·젤의 뼈대. 유화 보조도 한다.' },

{ id: 'hpstarch', ko: '하이드록시프로필스타치포스페이트', inci: 'Hydroxypropyl Starch Phosphate', cat: 'thick', ph: 'E', sol: 'w', u: [0, 3, 1], d: 0.6,
  th: [3200, 1.5], op: 30, pv: 6.5, pc: 0.05, ox: 0.3, pr: 24000, hot: 1,
  tags: '하이드록시프로필스타치포스페이트 전분 천연점증 매트 산뜻',
  n: '변성 전분. 끈적임 없이 산뜻하게 점도를 올려 선크림·세럼의 사용감 개선에 널리 쓴다.' },

{ id: 'montanov68', ko: '세테아릴알코올/코코-글루코사이드', inci: 'Cetearyl Alcohol (and) Coco-Glucoside', cat: 'emul', ph: 'B', sol: 'o', u: [0, 8, 4], d: 0.9,
  hlb: 11.5, lam: 0.95, op: 175, pr: 26000, hot: 1,
  tags: '몬타노브68 세테아릴알코올 코코글루코사이드 액정 천연유화제 peg프리',
  n: '당 유화제 + 지방알코올이 하나로 묶인 제품. 액정 라멜라를 안정적으로 만들어 초심자도 실패가 적다.' },

{ id: 'emulmell', ko: '폴리글리세릴-6스테아레이트/폴리글리세릴-6베헤네이트', inci: 'Polyglyceryl-6 Stearate (and) Polyglyceryl-6 Behenate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 3], d: 0.95,
  hlb: 10.5, lam: 0.5, op: 130, pr: 42000, hot: 1,
  tags: '에멀리움 폴리글리세릴-6 peg프리 천연유화제 라멜라',
  n: 'PEG-프리 폴리글리세릴 유화제. 가볍고 촉촉한 마무리로 클린뷰티 처방에서 선호된다.' },

{ id: 'sucrosest', ko: '수크로오스스테아레이트', inci: 'Sucrose Stearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 5, 2], d: 1.0,
  hlb: 15.0, lam: 0.35, op: 90, pr: 48000, hot: 1,
  tags: '수크로오스스테아레이트 설탕유화제 저자극 천연 베이비',
  n: '설탕 에스터. 매우 순하고 사용감이 가벼워 베이비·민감성 제품에 쓴다.' },

{ id: 'pg2dips', ko: '폴리글리세릴-2다이폴리하이드록시스테아레이트', inci: 'Polyglyceryl-2 Dipolyhydroxystearate', cat: 'emul', ph: 'B', sol: 'o', u: [0, 6, 4], d: 0.96,
  hlb: 5.5, op: 35, pr: 52000,
  tags: '폴리글리세릴-2 w/o 유중수 비실리콘 천연 선크림',
  n: '천연 유래 W/O 유화제. 전해질을 넣은 내수상을 잘 잡아 무기 선크림과 잘 맞는다.' },

/* ── 실리콘 대체 에몰리언트 ────────────────────────────────────── */
{ id: 'c1315', ko: 'C13-15알칸', inci: 'C13-15 Alkane', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 8], d: 0.77, ri: 1.428,
  rh: 11, vol: 0.25, pr: 20000, hot: 1,
  tags: 'c13-15알칸 에모그린 실리콘대체 드라이터치 생분해 사탕수수',
  n: '사탕수수 유래 알케인. 사이클로펜타실록산과 사용감이 거의 같으면서 생분해된다. 실리콘 탈피 처방의 1순위 대체재.' },

{ id: 'undectri', ko: '운데칸/트라이데칸', inci: 'Undecane (and) Tridecane', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 6], d: 0.75, ri: 1.42,
  rh: 11, vol: 0.55, tmax: 60, pr: 24000, hot: 1,
  tags: '운데칸 트라이데칸 휘발성 실리콘대체 드라이 생분해',
  n: '휘발성 알케인. 아이소도데케인·D5 대체. 날아가면서 뽀송한 마무리를 남긴다.' },

{ id: 'isoamyl', ko: '아이소아밀라우레이트', inci: 'Isoamyl Laurate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 6], d: 0.86, ri: 1.438,
  rh: 10, pr: 22000, hot: 1,
  tags: '아이소아밀라우레이트 천연에스터 실리콘대체 실키 생분해',
  n: '100% 식물 유래 에스터. 다이메티콘과 유사한 실키한 미끄러짐을 낸다.' },

{ id: 'triethylhex', ko: '트리에틸헥사노인', inci: 'Triethylhexanoin', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 8], d: 0.88, ri: 1.446,
  rh: 9, pr: 12000, hot: 1,
  tags: '트리에틸헥사노인 에스터 자외선용해 가벼움 클렌징',
  n: '가볍고 산화되지 않는 합성 트라이에스터. 자외선차단제 용해와 클렌징 베이스로 두루 쓴다.' },

{ id: 'inn', ko: '아이소노닐아이소노나노에이트', inci: 'Isononyl Isononanoate', cat: 'oil', ph: 'B', sol: 'o', u: [0, 25, 6], d: 0.86, ri: 1.434,
  rh: 11, pr: 16000,
  tags: '아이소노닐아이소노나노에이트 inn 드라이 퍼짐성 메이크업',
  n: '퍼짐 속도가 매우 빨라 메이크업과 선크림의 발림성을 크게 개선한다.' },

{ id: 'hpolydecene', ko: '하이드로제네이티드폴리데센', inci: 'Hydrogenated Polydecene', cat: 'oil', ph: 'B', sol: 'o', u: [0, 30, 6], d: 0.82, ri: 1.45,
  rh: 11, pr: 15000,
  tags: '하이드로제네이티드폴리데센 폴리알파올레핀 미네랄오일대체 안정',
  n: '완전히 포화된 합성 탄화수소. 미네랄오일 대체재로 산화되지 않고 무취다.' },

/* ── 신세대 자외선차단제 ──────────────────────────────────────── */
{ id: 'eht', ko: '에틸헥실트라이아존', inci: 'Ethylhexyl Triazone', cat: 'uv', ph: 'B', sol: 'o', u: [0, 5, 3], d: 1.1, ri: 1.57,
  rh: 12, lab: [95, 0, 10], tint: 0.3, op: 8, spf: 3.6, pfa: 0.15, pr: 380000, hot: 1,
  tags: '에틸헥실트라이아존 유비눌t150 uvb 고효율 광안정 한국선크림',
  n: 'UVB 흡광도가 가장 높은 필터. 적은 양으로 SPF 를 크게 올려 한국 SPF50+ 처방의 사실상 표준. 분말이라 80℃ 이상에서 용제에 완전히 녹여야 한다. 한도 5%.' },

{ id: 'dhhb', ko: '다이에틸아미노하이드록시벤조일헥실벤조에이트', inci: 'Diethylamino Hydroxybenzoyl Hexyl Benzoate', cat: 'uv', ph: 'B', sol: 'o', u: [0, 10, 4], d: 1.05, ri: 1.58,
  rh: 12, lab: [93, 1, 20], tint: 0.5, op: 10, spf: 1.4, pfa: 1.3, pr: 260000, hot: 1,
  tags: '유비눌a플러스 dhhb uva 광안정 아보벤존대체 액상',
  n: 'UVA 전담 필터. 아보벤존과 달리 광안정하고 액상이라 다루기 쉽다. 요즘 UVA 차단의 주력. 한도 10%.' },

{ id: 'mbbt', ko: '메틸렌비스벤조트라이아졸릴테트라메틸부틸페놀', inci: 'Methylene Bis-Benzotriazolyl Tetramethylbutylphenol', cat: 'uv', ph: 'A', sol: 'd', u: [0, 10, 4], d: 1.2, ri: 1.6,
  op: 120, lab: [96, 0, 6], tint: 0.6, spf: 2.5, pfa: 1.1, el: 0.3, pr: 300000, hot: 1,
  tags: '티노소브m mbbt 유무기하이브리드 광범위 분산형 수상',
  n: '유기 필터인데 물에 분산된 입자로 공급된다. 흡수와 산란을 함께 해서 UVA·UVB 를 모두 막는다. 수상에 넣는 유기 필터라 처방 설계가 달라진다. 한도 10%.' },

{ id: 'ps15', ko: '폴리실리콘-15', inci: 'Polysilicone-15', cat: 'uv', ph: 'B', sol: 'o', u: [0, 10, 3], d: 1.0, ri: 1.5,
  rh: 11, spf: 1.4, pfa: 0.1, pr: 220000, hot: 1,
  tags: '폴리실리콘-15 파솔slx uvb 실리콘필터 사용감 광안정',
  n: '실리콘 골격의 UVB 필터. 끈적임 없이 사용감을 크게 개선해 한국 선크림이 즐겨 쓴다. 한도 10%.' },

{ id: 'pbsa', ko: '페닐벤즈이미다졸설포닉애씨드', inci: 'Phenylbenzimidazole Sulfonic Acid', cat: 'uv', ph: 'A', sol: 'w', u: [0, 4, 2], d: 1.2,
  spf: 1.9, pfa: 0.05, pv: 3.0, pc: 1.8, el: 2.0, pr: 90000,
  tags: '엔술리졸 pbsa 수용성 자외선차단 uvb 산성',
  n: '물에 녹는 UVB 필터. 수상에 넣어 산뜻한 선크림을 만들 수 있지만, 산성이라 반드시 중화해야 녹고 전해질 부하가 크다. 한도 4%.' },

{ id: 'homosal', ko: '호모살레이트', inci: 'Homosalate', cat: 'uv', ph: 'B', sol: 'o', u: [0, 10, 6], d: 1.05, ri: 1.517,
  rh: 11, spf: 0.85, pfa: 0.05, pr: 12000,
  tags: '호모살레이트 uvb 용제 자외선차단제용해 저가',
  n: 'UVB 차단 겸 다른 필터를 녹이는 용제. 차단력 자체는 약하지만 처방을 성립시키는 역할이 크다. 한도 10%.' },

/* ── 세정 · 헤어 ───────────────────────────────────────────────── */
{ id: 'smct', ko: '소듐메칠코코일타우레이트', inci: 'Sodium Methyl Cocoyl Taurate', cat: 'surf', ph: 'A', sol: 'w', u: [0, 20, 6], d: 1.05,
  hlb: 15, op: 12, el: 1.3, pv: 7.0, pc: 0.3, foam: 1.15, pr: 16000, hot: 1,
  tags: '타우레이트 smct 아미노산계 조밀한거품 저자극 설페이트프리',
  n: '타우린계. 거품이 조밀하고 풍성하면서 자극이 낮아 설페이트 프리 샴푸의 주력이 되었다. 경수에도 강하다.' },

{ id: 'dsls', ko: '다이소듐라우레스설포석시네이트', inci: 'Disodium Laureth Sulfosuccinate', cat: 'surf', ph: 'A', sol: 'w', u: [0, 25, 8], d: 1.05,
  hlb: 14, op: 8, el: 1.2, pv: 6.0, pc: 0.25, foam: 0.9, pr: 7000, hot: 1,
  tags: '설포석시네이트 저자극 유아 거품 순한세정',
  n: '설포석시네이트계. 순하면서 거품이 좋아 유아용·저자극 세정에 널리 쓴다.' },

{ id: 'aos', ko: '소듐C14-16올레핀설포네이트', inci: 'Sodium C14-16 Olefin Sulfonate', cat: 'surf', ph: 'A', sol: 'w', u: [0, 25, 8], d: 1.05,
  hlb: 16, op: 6, el: 1.3, pv: 7.5, pc: 0.3, foam: 1.1, pr: 3000,
  tags: 'aos 올레핀설포네이트 설페이트프리 거품 저가 세정',
  n: '설페이트가 아니면서 거품과 세정력이 강하다. 값이 싸 바디워시에 널리 쓴다. 다만 탈지력이 세다.' },

{ id: 'pq67', ko: '폴리쿼터늄-67', inci: 'Polyquaternium-67', cat: 'cond', ph: 'E', sol: 'w', u: [0, 2, 0.5], d: 1.0,
  th: [1600, 1.3], op: 8, el: 0.4, pv: 6.0, pc: 0.1, pr: 55000, hot: 1,
  tags: '폴리쿼터늄-67 소프케어 컨디셔닝 샴푸 손상모발',
  n: '소수성 곁사슬을 붙인 양이온 셀룰로오스. 손상 부위에 더 잘 붙고 헹굼감이 가볍다.' },

{ id: 'bisamino', ko: '비스아미노프로필다이메티콘', inci: 'Bis-Aminopropyl Dimethicone', cat: 'cond', ph: 'B', sol: 'o', u: [0, 3, 1], d: 0.98, ri: 1.41,
  rh: 11, pr: 62000, hot: 1,
  tags: '비스아미노프로필다이메티콘 양쪽말단 아미노실리콘 헤어 큐티클',
  n: '양쪽 끝에 아미노기가 있어 손상 부위를 다리처럼 이어 붙인다. 아모다이메티콘보다 가볍고 빌드업이 적다.' },

/* ── 방부 · 기타 ───────────────────────────────────────────────── */
{ id: 'levul', ko: '소듐레불리네이트/소듐아니세이트', inci: 'Sodium Levulinate (and) Sodium Anisate', cat: 'presv', ph: 'C', sol: 'w', u: [0, 4, 2.5], d: 1.1,
  tmax: 50, el: 2.2, pv: 6.0, pc: 0.5, pr: 34000, hot: 1,
  tags: '레불리네이트 아니세이트 천연방부 코스모스인증 무방부',
  n: '사탕수수·회향 유래. 천연 인증 처방의 방부 주력. pH 5.5 이하에서만 듣고, 염이라 전해질 부하가 크며 2~3%나 넣어야 해서 사용감에 영향을 준다.' },

{ id: 'cymen', ko: 'o-사이멘-5-올', inci: 'o-Cymen-5-ol', cat: 'presv', ph: 'C', sol: 'wo', u: [0, 0.1, 0.05], d: 1.0,
  tmax: 60, hlb: 6, pr: 90000,
  tags: '사이멘올 이소프로필메틸페놀 ipmp 항균 트러블 데오드란트',
  n: '강한 항균력을 가진 페놀계. 트러블·데오드란트 제품에 쓴다. 한도 0.1%.' },

{ id: 'tocotri', ko: '토코트리에놀', inci: 'Tocotrienols', cat: 'misc', ph: 'B', sol: 'o', u: [0, 1, 0.2], d: 0.95, ri: 1.5,
  rh: 6, ox: 0.3, lab: [86, 3, 38], tint: 1.4, pr: 180000, hot: 1,
  tags: '토코트리에놀 비타민e 항산화 강력 팜',
  n: '토코페롤보다 항산화력이 몇 배 강한 비타민 E 계열. 색이 진해 소량만 쓴다.' },

{ id: 'ferulic', ko: '페룰릭애씨드', inci: 'Ferulic Acid', cat: 'misc', ph: 'C', sol: 'w', u: [0, 1, 0.5], d: 1.1, tmax: 50,
  ox: 0.6, pv: 4.0, pc: 0.5, lab: [92, 1, 22], tint: 0.8, pr: 140000, hot: 1,
  tags: '페룰릭애씨드 항산화 비타민c안정화 시너지',
  n: '비타민 C + E 조합의 안정성과 효능을 함께 끌어올리는 고전 조합의 세 번째 축.' },

{ id: 'panthenolo', ko: '판테닐트리아세테이트', inci: 'Panthenyl Triacetate', cat: 'humect', ph: 'B', sol: 'o', u: [0, 2, 0.5], d: 1.05,
  rh: 8, ox: 0.2, pr: 120000,
  tags: '판테닐트리아세테이트 유용성판테놀 b5 헤어',
  n: '유용성 판테놀. 무수 제형과 헤어 오일에 B5 를 넣을 때 쓴다.' }
];
/* ------------------------------------------------------------------ */

var LIST = RAW.map(function (r) {
  var o = {}, k;
  for (k in NORM) o[k] = NORM[k];
  for (k in r) o[k] = r[k];
  if (!o.ri) o.ri = (o.sol === 'o' ? 1.46 : 1.36);
  o.min = o.u[0]; o.max = o.u[1]; o.typ = o.u[2];
  o.tags = (o.tags + ' ' + o.ko + ' ' + o.inci + ' ' + o.id + ' ' +
            (CATS.filter(function (c) { return c.k === o.cat; })[0] || {}).ko).toLowerCase();
  return o;
});

var BY = {};
LIST.forEach(function (o) { BY[o.id] = o; });

G.ING = {
  CATS: CATS, PHASES: PHASES, LIST: LIST, BY: BY,
  get: function (id) { return BY[id]; },
  catName: function (k) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].k === k) return CATS[i].ko;
    return k;
  },
  catColor: function (k) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].k === k) return CATS[i].c;
    return '#888';
  },
  /* 검색: 한글명 · INCI · 태그 · 분류명. 공백으로 나눈 토큰은 AND */
  search: function (q, cat) {
    var t = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    return LIST.filter(function (o) {
      if (cat && o.cat !== cat) return false;
      for (var i = 0; i < t.length; i++) if (o.tags.indexOf(t[i]) < 0) return false;
      return true;
    });
  }
};
})(window);
