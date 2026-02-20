// @ts-nocheck
import { useState, useEffect } from "react";
import * as recharts from "recharts";
import Papa from "papaparse";

const {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
  ComposedChart, ReferenceLine, Line
} = recharts;

// ─────────────────────────────────────────────────────────────────────────────
//  Google Sheets TSV URLs
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_URLS = {
  MONTHLY:  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNIqvHfw09eErVopZIhn9_zwahlvNGbZQNmK511jF_VpAXnphgZzGODTHOBRbYwyMsEP6s4_FRtBYa/pub?gid=945160625&single=true&output=tsv",
  HOLDINGS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRNIqvHfw09eErVopZIhn9_zwahlvNGbZQNmK511jF_VpAXnphgZzGODTHOBRbYwyMsEP6s4_FRtBYa/pub?gid=2105489842&single=true&output=tsv",
};

// ─────────────────────────────────────────────────────────────────────────────
//  Theme & Colors
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:"#080B10", surface:"#0F1318", card:"#131820",
  accent:"#00E676", accentDim:"rgba(0,230,118,0.12)", accentGlow:"rgba(0,230,118,0.05)",
  red:"#FF5252", orange:"#FFB74D", blue:"#42A5F5", cyan:"#4DD0E1",
  text:"#ECF0F6", textSec:"#8A94A6", textDim:"#4A5268",
  border:"rgba(255,255,255,0.04)", borderActive:"rgba(0,230,118,0.25)",
};
const SC = ["#42A5F5","#FF7043","#66BB6A","#FFD740","#CE93D8","#4DD0E1","#FF8A65","#AED581","#FFF176","#BA68C8","#4FC3F7","#FF5252","#81C784","#FFB74D","#9575CD","#26C6DA","#EF5350","#A5D6A7","#FFC107","#7E57C2","#F06292","#80CBC4","#DCE775","#B39DDB","#4DB6AC","#E57373","#64B5F6","#AED581","#FFB74D","#90A4AE"];

// ─────────────────────────────────────────────────────────────────────────────
//  TSV 파싱 유틸리티 (수정됨)
// ─────────────────────────────────────────────────────────────────────────────

/** 문자열 → 숫자 변환 (쉼표, %, ₩ 등 특수기호 완벽 제거) */
function n(v) {
  if (v === null || v === undefined || v === "" || v === "#N/A" || v === "#REF!") return 0;
  if (typeof v === "number") return v;
  
  // ₩, $, %, 쉼표, 공백 모두 제거 (마이너스 기호와 소수점은 남김)
  const s = String(v).replace(/[₩$,\s%]/g, "").trim();
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/** 날짜 문자열 → "YYYY-MM" 형식 (띄어쓰기 및 다양한 포맷 완벽 대응) */
function parseDate(str) {
  if (!str) return null;
  // 모든 공백 제거 후 정리 (예: "19/ 07" -> "19/07")
  const s = String(str).replace(/\s+/g, "").trim();
  if (!s) return null;

  // 1. YYYY.MM.DD
  let m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  // 2. YYYY-MM-DD or YYYY/MM/DD
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  // 3. M/D/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}`;

  // 4. YY/MM (이번 구글 시트 포맷: 19/07, 20/01 등)
  m = s.match(/^(\d{2})\/(\d{1,2})$/);
  if (m) {
    const year = 2000 + parseInt(m[1], 10);
    return `${year}-${m[2].padStart(2, "0")}`;
  }

  return null;
}
// ─────────────────────────────────────────────────────────────────────────────
//  MONTHLY TSV 파싱
//  시트: (월) 종합추이
//
//  행 구조 (1-indexed openpyxl → 0-indexed TSV):
//    Row 3  (idx 2) : SUMMARY - 원금(K), 수익(L), 평가(M), 수익률(N)
//    Row 4  (idx 3) : SUMMARY - 투자기간(C), 수익률고점(E), 고점대비(G), 누적배당(L)
//    Row 5  (idx 4) : SUMMARY - 월평균수익(C), 수익고점(E), 누적시세(L)
//    Row 8  (idx 7) : 컬럼 헤더 (Date, 투자원금, 평가총액, ...)
//    Row 15+(idx14+): 월별 데이터
//
//  핵심 컬럼 (0-based index):
//    0  = Date
//    1  = 투자 원금     → principal
//    2  = 평가 총액     → evalTotal
//    3  = 수익 금액     → profit
//    4  = 원금증감      → principalChg
//    5  = 수익증감      → profitChg
//    6  = 수익률 (소수) → returnPct  × 100
//    57 = 배당수익      → dividend
//    58 = 누적배당수익  → cumDividend
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  MONTHLY TSV 파싱 (누적배당 91만원 오류 완벽 해결 및 고정 인덱스 복구)
// ─────────────────────────────────────────────────────────────────────────────
function parseMonthlyTSV(text) {
  const rows = text.split("\n").map(r => r.split("\t"));

  const r2 = rows[2] || [];
  const r3 = rows[3] || [];
  const r4 = rows[4] || [];

  const SUMMARY = {
    principal:       n(r2[10]) * 1000,
    profit:          n(r2[11]) * 1000,
    evalTotal:       n(r2[12]) * 1000,
    returnPct:       n(r2[13]),
    months:          n(r3[2]),
    highReturnPct:   n(r3[4]),
    fromHighPct:     n(r3[6]),
    cumDividend:     n(r3[11]) * 1000,
    avgMonthlyProfit:n(r4[2])  * 1000,
    highProfit:      n(r4[4])  * 1000,
    cumCapGain:      n(r4[11]) * 1000, 
  };

  const monthlyMap = new Map(); 

  for (let i = 8; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    // 날짜 및 앞쪽 기본 데이터는 유동적으로 찾음
    let dateStr = null;
    let dIdx = -1;
    for(let j=0; j<4; j++) {
      if (parseDate(row[j])) {
        dateStr = row[j];
        dIdx = j;
        break;
      }
    }
    if (dIdx === -1) continue; 

    const date = parseDate(dateStr);
    const principal = n(row[dIdx + 1]) * 1000; 
    if (principal === 0) continue; 

    const profit = n(row[dIdx + 3]) * 1000;
    
    // ── ★ 핵심: 자산 및 배당 데이터는 오류 방지를 위해 시트의 고정 인덱스 사용 ──
    const deposit    = n(row[45]) * 1000; // AT열: 예적금
    const invest     = n(row[46]) * 1000; // AU열: 투자
    const pension    = n(row[49]) * 1000; // AX열: 연금
    const car        = n(row[51]) * 1000; // AZ열: 자동차
    const jeonse     = n(row[52]) * 1000; // BA열: 전세금
    const assetTotal = n(row[53]) * 1000; // BB열: TOTAL
    const tBond      = n(row[54]) * 1000; // BC열: T채권
    const accCard    = n(row[55]) * 1000; // BD열: 계좌-카드
    const realEstate = n(row[56]) * 1000; // BE열: 부동산-대출
    const dividend   = n(row[57]) * 1000; // BF열: 배당수익 (월별)
    const cumDividend= n(row[58]) * 1000; // BG열: 누적 배당 수익

    const existing = monthlyMap.get(date) || {};
    const mergedProfit = profit !== 0 ? profit : (existing.profit || 0);
    const mergedCumDiv = cumDividend !== 0 ? cumDividend : (existing.cumDividend || 0);

    monthlyMap.set(date, {
      date,
      principal:     principal !== 0 ? principal : (existing.principal || 0),
      evalTotal:     (n(row[dIdx + 2]) * 1000) || existing.evalTotal || 0,
      profit:        mergedProfit,
      principalChg:  (n(row[dIdx + 4]) * 1000) || existing.principalChg || 0,
      profitChg:     (n(row[dIdx + 5]) * 1000) || existing.profitChg || 0,
      returnPct:     n(row[dIdx + 6]) || existing.returnPct || 0,
      dividend:      dividend !== 0 ? dividend : (existing.dividend || 0),
      cumDividend:   mergedCumDiv,
      capGain:       mergedProfit - mergedCumDiv,
      deposit:       deposit !== 0 ? deposit : (existing.deposit || 0),
      invest:        invest !== 0 ? invest : (existing.invest || 0),
      pension:       pension !== 0 ? pension : (existing.pension || 0),
      car:           car !== 0 ? car : (existing.car || 0),
      jeonse:        jeonse !== 0 ? jeonse : (existing.jeonse || 0),
      assetTotal:    assetTotal !== 0 ? assetTotal : (existing.assetTotal || 0),
      tBond:         tBond !== 0 ? tBond : (existing.tBond || 0),
      accCard:       accCard !== 0 ? accCard : (existing.accCard || 0),
      realEstate:    realEstate !== 0 ? realEstate : (existing.realEstate || 0),
    });
  }

  const MONTHLY = Array.from(monthlyMap.values());
  MONTHLY.sort((a, b) => a.date.localeCompare(b.date));

  // 최신 달 데이터로 SUMMARY 강제 보정
  if (MONTHLY.length > 0) {
    const latest = MONTHLY[MONTHLY.length - 1];
    SUMMARY.cumDividend = latest.cumDividend || 0;
    SUMMARY.cumCapGain  = latest.capGain || 0;
  }

  return { SUMMARY, MONTHLY };
}


// ─────────────────────────────────────────────────────────────────────────────
//  HOLDINGS TSV 파싱
//  시트: 종목별(100만원이상)
//
//  컬럼 (0-based index):
//    0 = 국가          → country
//    1 = 종목코드      → code
//    2 = 종목명        → name
//    3 = 유형          → type
//    4 = 수량          → qty
//    5 = 매입금액      → buyAmount
//    6 = 평가금액      → evalAmount
//    7 = 손익          → profit
//    8 = 수익률(%) 소수 → returnPct × 100
//    9 = 비중(%)  소수  → weight    × 100
// ─────────────────────────────────────────────────────────────────────────────
function parseHoldingsTSV(text) {
  const rows = text.split("\n").map(r => r.split("\t"));
  const HOLDINGS = [];

  // Row 0 = 헤더, Row 1부터 데이터
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;

    const name = (row[2] || "").trim();
    if (!name) continue;  // 빈 행 스킵

    const evalAmount = n(row[6]);
    if (evalAmount <= 0) continue;  // 평가금액 0 이하 스킵

    const rawReturn = n(row[8]);
    const rawWeight = n(row[9]);

    HOLDINGS.push({
      country:    (row[0] || "").trim(),
      code:       (row[1] || "").trim(),
      name,
      type:       (row[3] || "").trim(),
      qty:        n(row[4]),
      buyAmount:  n(row[5]),
      evalAmount,
      profit:     n(row[7]),
      // 소수 (0.75) vs 이미 % (75.39) 자동 판별
      returnPct:  n(row[8]), // 이미 % 처리되어 있으므로 그대로 사용
      weight:     n(row[9]), // 이미 % 처리되어 있으므로 그대로 사용
    });
  }

  // 비중 내림차순 정렬
  HOLDINGS.sort((a, b) => b.weight - a.weight);
  return HOLDINGS;
}

// ─────────────────────────────────────────────────────────────────────────────
//  DIVIDENDS 연도별 집계 (MONTHLY 데이터에서 계산)
//
//  계산 방법:
//    divIncome   = 해당 연도 월배당 합계
//    totalReturn = 해당 연도말 누적수익 − 전년도말 누적수익
//    capGain     = totalReturn − divIncome
//    cumDiv      = 누적 배당합계
//    cumTotal    = 해당 연도말 누적수익 (절대값)
// ─────────────────────────────────────────────────────────────────────────────
function deriveDividends(monthly) {
  if (!monthly.length) return [];

  const byYear = {};
  monthly.forEach(d => {
    const yr = d.date.substring(0, 4);
    if (!byYear[yr]) byYear[yr] = { dividends: [], lastProfit: 0, lastPrincipal: 0, lastEval: 0 };
    byYear[yr].dividends.push(d.dividend || 0);
    byYear[yr].lastProfit    = d.profit;
    byYear[yr].lastPrincipal = d.principal;
    byYear[yr].lastEval      = d.evalTotal;
  });

  let cumDiv = 0;
  let cumCapGain = 0;
  let prevProfit = 0;

  const sorted = Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]));

  const result = sorted.map(([yr, v]) => {
    const divIncome    = Math.round(v.dividends.reduce((s, x) => s + x, 0));
    const totalReturn  = v.lastProfit - prevProfit;
    const capGain      = totalReturn - divIncome;
    cumDiv            += divIncome;
    cumCapGain        += capGain;
    prevProfit         = v.lastProfit;

    return {
      year:             parseInt(yr),
      divIncome,
      capGain,
      totalReturn,
      divGrowth:        0,      // 아래에서 계산
      cumDiv,
      cumCapGain,
      cumTotal:         v.lastProfit,
      yearEndPrincipal: v.lastPrincipal,
      yearEndEval:      v.lastEval,
    };
  });

  // divGrowth 계산
  return result.map((d, i) => ({
    ...d,
    divGrowth: i === 0 ? 0 : +((d.divIncome / result[i - 1].divIncome - 1) * 100).toFixed(2),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  포맷 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
const fK = (v) => {
  const a = Math.abs(v);
  if (a >= 100000000) return (v / 100000000).toFixed(1) + "억";
  if (a >= 10000)     return Math.round(v / 10000).toLocaleString() + "만";
  return v.toLocaleString();
};
const fF = (v) => (v > 0 ? "+" : "") + Math.abs(v).toLocaleString() + "원";
const fP = (v) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";

// ─────────────────────────────────────────────────────────────────────────────
//  반응형 브레이크포인트 훅
// ─────────────────────────────────────────────────────────────────────────────
function useBP() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  if (w >= 1024) return "desktop";
  if (w >= 600)  return "tablet";
  return "mobile";
}

// ─────────────────────────────────────────────────────────────────────────────
//  공통 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function CT({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1C2230", borderRadius:10, padding:"10px 14px", border:`1px solid ${T.border}`, boxShadow:"0 8px 24px rgba(0,0,0,0.6)", maxWidth:220 }}>
      <p style={{ color:T.textSec, fontSize:11, margin:"0 0 5px" }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:p.color||T.text, fontSize:12, fontWeight:600, margin:"2px 0" }}>
          {p.name}: {fmt==="pct" ? fP(p.value) : fmt==="krw" ? fK(p.value)+"원" : p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, color, sub, large }) {
  return (
    <div style={{ background:T.card, borderRadius:14, padding:large?"20px 22px":"14px 16px", border:`1px solid ${T.border}`, flex:1, minWidth:0 }}>
      <p style={{ color:T.textDim, fontSize:large?11:10, margin:`0 0 ${large?7:5}px`, fontWeight:600, letterSpacing:"0.4px", textTransform:"uppercase" }}>{label}</p>
      <p style={{ color:color||T.text, fontSize:large?22:18, fontWeight:800, margin:0, letterSpacing:"-0.5px", fontFamily:"'IBM Plex Mono',monospace" }}>{value}</p>
      {sub && <p style={{ color:T.textSec, fontSize:large?11:10, margin:"3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  로딩 / 에러 화면
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <div style={{ width:48, height:48, borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"spin 0.9s linear infinite" }}/>
      <p style={{ color:T.textSec, fontSize:13, fontFamily:"'IBM Plex Mono',monospace" }}>Google Sheets 데이터 불러오는 중...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24 }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <p style={{ color:T.text, fontSize:16, fontWeight:700, textAlign:"center" }}>데이터 불러오기 실패</p>
      <p style={{ color:T.textSec, fontSize:12, textAlign:"center", maxWidth:320 }}>{message}</p>
      <button onClick={onRetry} style={{ padding:"10px 24px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.borderActive}`, color:T.accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>
        다시 시도
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  탭 컴포넌트들
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  종합(Overview) 탭 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ data, bp }) {
  const { SUMMARY, MONTHLY, HOLDINGS } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad   = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 340 : isWide ? 280 : 250;

  // TOP 10 데이터 분리
  const top10 = HOLDINGS.slice(0, 10);

  // 상단 4개 요약 카드용 데이터
  const stats = [
    { label: "현재 수익률", value: fP(SUMMARY.returnPct),       color: T.accent },
    { label: "수익률 고점", value: fP(SUMMARY.highReturnPct),    color: T.accent, sub: "고점대비 "+fP(SUMMARY.fromHighPct) },
    { label: "누적 배당",   value: fK(SUMMARY.cumDividend)+"원", color: T.orange },
    { label: "시세차익",    value: fK(SUMMARY.cumCapGain)+"원",  color: T.blue }
  ];

  return (
    <div style={{ padding:pad }}>
      {/* Hero */}
      <div style={{ background:"linear-gradient(145deg,#131B26,#0E1319)", borderRadius:20, padding:isDesktop?"28px":"24px 20px", marginBottom:16, border:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:T.accentGlow, filter:"blur(40px)" }}/>
        <p style={{ color:T.textSec, fontSize:isDesktop?14:12, margin:"0 0 3px", fontWeight:500 }}>총 평가금액</p>
        <h2 style={{ color:T.text, fontSize:isDesktop?38:28, fontWeight:800, margin:"0 0 2px", letterSpacing:"-1px", fontFamily:"'IBM Plex Mono',monospace" }}>
          ₩{SUMMARY.evalTotal.toLocaleString()}
        </h2>
        <p style={{ color:SUMMARY.returnPct>=0?T.accent:T.red, fontSize:isDesktop?18:14, fontWeight:700, margin:"0 0 20px", fontFamily:"'IBM Plex Mono',monospace" }}>
          {fP(SUMMARY.returnPct)} ({fF(SUMMARY.profit)})
        </p>
        <div style={{ display:"flex", gap:isDesktop?24:14, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:80 }}>
            <p style={{ color:T.textDim, fontSize:10, margin:"0 0 3px" }}>투자원금</p>
            <p style={{ color:T.blue, fontSize:isDesktop?17:15, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{fK(SUMMARY.principal)}원</p>
          </div>
          <div style={{ width:1, background:T.border }}/>
          <div style={{ flex:1, minWidth:80 }}>
            <p style={{ color:T.textDim, fontSize:10, margin:"0 0 3px" }}>투자기간</p>
            <p style={{ color:T.text, fontSize:isDesktop?17:15, fontWeight:700, margin:0 }}>{SUMMARY.months}개월</p>
          </div>
          <div style={{ width:1, background:T.border }}/>
          <div style={{ flex:1, minWidth:80 }}>
            <p style={{ color:T.textDim, fontSize:10, margin:"0 0 3px" }}>월평균수익</p>
            <p style={{ color:T.accent, fontSize:isDesktop?17:15, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{fK(SUMMARY.avgMonthlyProfit)}원</p>
          </div>
        </div>
      </div>

      {/* ── ★ 변경점: StatCard 대신 직접 높이와 여백을 최소화한 커스텀 카드 적용 ── */}
      <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(4,1fr)":"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background:T.card, borderRadius:12, padding:"12px 14px", border:`1px solid ${T.border}`, display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <p style={{ color:T.textDim, fontSize:11, margin:"0 0 4px" }}>{s.label}</p>
            <p style={{ color:s.color, fontSize:16, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{s.value}</p>
            {s.sub && <p style={{ color:T.textSec, fontSize:10, margin:"4px 0 0" }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart + Top10 */}
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16 }}>
        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 8px 16px" }}>자산 및 수익 추이</p>
          
          <div style={{ display:"flex", gap:14, margin:"0 0 10px 16px", flexWrap:"wrap" }}>
            {[{l:"평가총액",c:T.red},{l:"투자원금",c:T.blue},{l:"수익금액",c:T.orange}].map(x => (
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                <span style={{ color:T.textSec, fontSize:11 }}>{x.l}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={chartH}>
            <ComposedChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(MONTHLY.length/6)}/>
              
              <YAxis 
                tick={{fill:T.textDim,fontSize:9}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v=>fK(v)} 
                width={46}
                domain={[dataMin => Math.min(dataMin, -50000000), 'auto']} 
                allowDataOverflow={true} 
              />
              
              <Tooltip content={<CT fmt="krw"/>}/>
              <ReferenceLine y={0} stroke={T.textDim} strokeDasharray="3 3"/>
              
              <Line type="monotone" dataKey="principal" name="투자원금" stroke={T.blue} strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="evalTotal" name="평가총액" stroke={T.red} strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="profit" name="수익금액" stroke={T.orange} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* TOP 10 영역 */}
        <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 12px" }}>TOP 10 종목</p>
          
          <div style={{ display:"grid", gridTemplateColumns:isWide?"1fr 1fr":"1fr", columnGap:24 }}>
            {top10.map((h, i) => {
              const isLastRow = isWide ? (i + 2 >= top10.length) : (i === top10.length - 1);
              
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom: isLastRow ? "none" : `1px solid ${T.border}` }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:`${SC[i%SC.length]}15`, display:"flex", alignItems:"center", justifyContent:"center", color:SC[i%SC.length], fontSize:11, fontWeight:800 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:T.text, fontSize:12, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name}</p>
                    <p style={{ color:T.textDim, fontSize:10, margin:"2px 0 0" }}>
                      {h.country} · {h.type} · <span style={{ color:h.returnPct>=0?T.accent:T.red, fontWeight:600 }}>{fP(h.returnPct)}</span>
                    </p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ color:T.text, fontSize:14, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{h.weight.toFixed(1)}%</p>
                    <p style={{ color:T.textDim, fontSize:10, margin:"1px 0 0" }}>{fK(h.evalAmount)}원</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturnsTab({ data, bp }) {
  const { SUMMARY, MONTHLY } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 280 : isWide ? 230 : 200;

  const yearlyMap = {};
  MONTHLY.forEach(d => {
    const yr = d.date.split("-")[0];
    if (!yearlyMap[yr]) yearlyMap[yr] = { last:d.returnPct, max:d.returnPct, min:d.returnPct };
    yearlyMap[yr].last = d.returnPct;
    yearlyMap[yr].max  = Math.max(yearlyMap[yr].max, d.returnPct);
    yearlyMap[yr].min  = Math.min(yearlyMap[yr].min, d.returnPct);
  });

  const mR = MONTHLY.map((d, i) => {
    const p = MONTHLY[i - 1];
    return { ...d, mReturn: p ? d.returnPct - p.returnPct : d.returnPct };
  });

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(4,1fr)":"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="현재 수익률" value={fP(SUMMARY.returnPct)}      color={SUMMARY.returnPct>=0?T.accent:T.red} large={isDesktop}/>
        <StatCard label="고점 대비"   value={fP(SUMMARY.fromHighPct)}    color={T.orange} sub={"고점 "+fP(SUMMARY.highReturnPct)} large={isDesktop}/>
        <StatCard label="최고 수익률" value={fP(SUMMARY.highReturnPct)}  color={T.accent} large={isDesktop}/>
        <StatCard label="투자기간"    value={SUMMARY.months+"개월"}      color={T.blue}   large={isDesktop}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>수익률 추이</p>
          <ResponsiveContainer width="100%" height={chartH}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity={0.25}/>
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(MONTHLY.length/6)}/>
              <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v+"%"} width={42}/>
              <Tooltip content={<CT fmt="pct"/>}/>
              <ReferenceLine y={0} stroke={T.textDim} strokeDasharray="3 3"/>
              <Area type="monotone" dataKey="returnPct" name="수익률" stroke={T.accent} strokeWidth={2.5} fill="url(#rg1)" dot={false} activeDot={{r:5,fill:T.accent}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>월간 수익률 변동</p>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={mR}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:8}} tickFormatter={v=>v.slice(5)} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"} width={36}/>
              <Tooltip content={<CT fmt="pct"/>}/>
              <ReferenceLine y={0} stroke={T.textDim}/>
              <Bar dataKey="mReturn" name="월간변동" radius={[2,2,0,0]}>
                {mR.map((e, i) => <Cell key={i} fill={e.mReturn>=0?T.accent:T.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 12px" }}>연도별 누적 수익률</p>
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr", gap:"0 16px" }}>
          {Object.entries(yearlyMap).map(([yr, v]) => (
            <div key={yr} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.textSec, fontSize:13, fontWeight:500 }}>{yr}년</span>
              <div style={{ display:"flex", gap:12 }}>
                <span style={{ color:T.textDim, fontSize:11 }}>최저 {fP(v.min)}</span>
                <span style={{ color:T.textDim, fontSize:11 }}>최고 {fP(v.max)}</span>
                <span style={{ color:v.last>=0?T.accent:T.red, fontSize:14, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", minWidth:70, textAlign:"right" }}>{fP(v.last)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function CumulativeTab({ data, bp }) {
  const { MONTHLY } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 280 : isWide ? 230 : 200;
  const latest = MONTHLY[MONTHLY.length - 1] || {};
  const cD = MONTHLY.map(d => ({ date:d.date, 원금:d.principal, 수익:Math.max(0,d.profit), 누적배당:d.cumDividend }));

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(4,1fr)":"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="투자원금"  value={fK(latest.principal||0)+"원"}     color={T.blue}   large={isDesktop}/>
        <StatCard label="평가수익"  value={fK(latest.profit||0)+"원"}        color={(latest.profit||0)>=0?T.accent:T.red} large={isDesktop}/>
        <StatCard label="누적배당"  value={fK(latest.cumDividend||0)+"원"}   color={T.orange} large={isDesktop}/>
        <StatCard label="원금증감"  value={fK(latest.principalChg||0)+"원"}  color={(latest.principalChg||0)>=0?T.cyan:T.red} sub="전월대비" large={isDesktop}/>
      </div>

      <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}`, marginBottom:16 }}>
        <div style={{ display:"flex", gap:14, margin:"0 0 10px 16px", flexWrap:"wrap" }}>
          {[{l:"원금",c:T.blue},{l:"수익",c:T.accent},{l:"누적배당",c:T.orange}].map(x => (
            <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
              <span style={{ color:T.textSec, fontSize:11 }}>{x.l}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart data={cD}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(MONTHLY.length/6)}/>
            <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>fK(v)} width={44}/>
            <Tooltip content={<CT fmt="krw"/>}/>
            <Bar dataKey="원금" stackId="a" fill={T.blue}/>
            <Bar dataKey="수익" stackId="a" fill={T.accent} radius={[2,2,0,0]}/>
            <Line type="monotone" dataKey="누적배당" name="누적배당" stroke={T.orange} strokeWidth={2} dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 12px" }}>원금 변동</p>
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr", gap:"0 16px" }}>
          {[...MONTHLY].reverse().filter(d => d.principalChg !== 0).map((d, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.textSec, fontSize:12 }}>{d.date}</span>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ color:d.principalChg>0?T.accent:T.red, fontSize:12, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace" }}>
                  {d.principalChg>0?"+":""}{fK(d.principalChg)}
                </span>
                <span style={{ color:T.textDim, fontSize:11 }}>→ {fK(d.principal)}원</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DividendTab({ data, bp }) {
  const { SUMMARY, DIVIDENDS } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 260 : isWide ? 220 : 200;

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(4,1fr)":"repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="누적 배당수익" value={fK(SUMMARY.cumDividend)+"원"} color={T.orange} large={isDesktop}/>
        <StatCard label="누적 시세차익" value={fK(SUMMARY.cumCapGain)+"원"}  color={T.accent} large={isDesktop}/>
        <StatCard label="총 수익합계"   value={fK(SUMMARY.profit)+"원"}      color={T.text}   large={isDesktop}/>
        <StatCard label="배당 비중" value={SUMMARY.profit ? (SUMMARY.cumDividend/SUMMARY.profit*100).toFixed(1)+"%" : "-"} color={T.orange} sub="총수익 대비" large={isDesktop}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", gap:14, margin:"0 0 10px 16px" }}>
            {[{l:"배당",c:T.orange},{l:"시세차익",c:T.accent}].map(x => (
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                <span style={{ color:T.textSec, fontSize:11 }}>{x.l}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={chartH}>
            <BarChart data={DIVIDENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="year" tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>fK(v)} width={44}/>
              <Tooltip content={<CT fmt="krw"/>}/>
              <Bar dataKey="divIncome" name="배당"     fill={T.orange} radius={[2,2,0,0]}/>
              <Bar dataKey="capGain"   name="시세차익" fill={T.accent} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>누적 수익 추이</p>
          <ResponsiveContainer width="100%" height={chartH}>
            <AreaChart data={DIVIDENDS}>
              <defs>
                <linearGradient id="cd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.orange} stopOpacity={0.2}/>
                  <stop offset="100%" stopColor={T.orange} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="year" tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>fK(v)} width={44}/>
              <Tooltip content={<CT fmt="krw"/>}/>
              <Area type="monotone" dataKey="cumTotal" name="누적수익" stroke={T.accent}  strokeWidth={2} fill="url(#cd)" dot={false}/>
              <Area type="monotone" dataKey="cumDiv"   name="누적배당" stroke={T.orange}  strokeWidth={2} fill="transparent" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
        {/* 헤더 영역: 화면이 넓으면 2단으로 복제해서 렌더링 */}
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
            {["연도","배당 수익","시세 차익","종합 수익"].map((h, i) => (
              <span key={`h1-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
            ))}
          </div>
          {isWide && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
              {["연도","배당 수익","시세 차익","종합 수익"].map((h, i) => (
                <span key={`h2-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
              ))}
            </div>
          )}
        </div>
        
        {/* 데이터 영역 */}
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr" }}>
          {[...DIVIDENDS].reverse().map((d, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
              <span style={{ color:T.textSec, fontSize:12, textAlign:"center" }}>{d.year}</span>
              <span style={{ color:T.orange, fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.divIncome)}</span>
              <span style={{ color:d.capGain>=0?T.accent:T.red, fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.capGain)}</span>
              <span style={{ color:d.totalReturn>=0?T.text:T.red, fontSize:12, fontWeight:700, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.totalReturn)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function MonthlyTab({ data, bp }) {
  const { MONTHLY } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 260 : isWide ? 220 : 180;

  const mR = MONTHLY.map((d, i) => {
    const p = MONTHLY[i - 1];
    return { ...d, mReturn: p ? d.returnPct - p.returnPct : d.returnPct };
  });

  return (
    <div style={{ padding:pad }}>
      <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}`, marginBottom:16 }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>월간 수익률</p>
        <ResponsiveContainer width="100%" height={chartH}>
          <BarChart data={mR}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:8}} tickFormatter={v=>v.slice(5)} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)+"%"} width={36}/>
            <Tooltip content={<CT fmt="pct"/>}/>
            <ReferenceLine y={0} stroke={T.textDim}/>
            <Bar dataKey="mReturn" name="월간" radius={[2,2,0,0]}>
              {mR.map((e, i) => <Cell key={i} fill={e.mReturn>=0?T.accent:T.red}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
        {/* 헤더 영역: 화면이 넓으면 2단으로 복제해서 렌더링 */}
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
            {["월","월간","누적","배당"].map((h, i) => (
              <span key={`h1-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
            ))}
          </div>
          {isWide && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
              {["월","월간","누적","배당"].map((h, i) => (
                <span key={`h2-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
              ))}
            </div>
          )}
        </div>
        
        {/* 데이터 영역 */}
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr" }}>
          {[...mR].reverse().map((d, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
              <span style={{ color:T.textSec, fontSize:12, textAlign:"center" }}>{d.date}</span>
              <span style={{ color:d.mReturn>=0?T.accent:T.red, fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
                {d.mReturn>=0?"+":""}{d.mReturn.toFixed(1)}%
              </span>
              <span style={{ color:d.returnPct>=0?T.accent:T.red, fontSize:12, fontWeight:700, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
                {fP(d.returnPct)}
              </span>
              <span style={{ color:d.dividend>0?T.orange:T.textDim, fontSize:11, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>
                {d.dividend>0?fK(d.dividend):"-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
//  자산(Assets) 탭 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function AssetsTab({ data, bp }) {
  const { MONTHLY } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 300 : isWide ? 260 : 220;

  // 1. 도넛 차트용 최신 데이터
  const latest = MONTHLY[MONTHLY.length - 1] || {};
  const donutData = [
    { name: "투자",        value: latest.invest,     fill: SC[0] }, 
    { name: "부동산-대출", value: latest.realEstate, fill: SC[1] }, 
    { name: "전세금",      value: latest.jeonse,     fill: SC[2] }, 
    { name: "T채권",       value: latest.tBond,      fill: SC[3] }, 
    { name: "예적금",      value: latest.deposit,    fill: SC[4] }, 
    { name: "계좌-카드",   value: latest.accCard,    fill: SC[5] }, 
    { name: "연금",        value: latest.pension,    fill: SC[6] }, 
    { name: "자동차",      value: latest.car,        fill: SC[7] }, 
  ].filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  // 2. 추이 그래프용 전체 데이터
  const chartData = MONTHLY.filter(m => m.assetTotal > 0);

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
        
        {/* 상단: 도넛 차트 */}
        <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 4px" }}>최신 자산 구성</p>
          <p style={{ color:T.textDim, fontSize:11, margin:"0 0 8px" }}>₩{(latest.assetTotal||0).toLocaleString()} · {latest.date}</p>
          <ResponsiveContainer width="100%" height={isDesktop?240:200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={isDesktop?65:55} outerRadius={isDesktop?95:85} dataKey="value" paddingAngle={2} strokeWidth={0}>
                {donutData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip content={({active,payload}) => {
                if (!active||!payload?.length) return null;
                const d = payload[0].payload;
                const pct = ((d.value / latest.assetTotal) * 100).toFixed(1);
                return (
                  <div style={{ background:"#1C2230", borderRadius:10, padding:"10px 14px", border:`1px solid ${T.border}` }}>
                    <p style={{ color:T.text, fontSize:12, fontWeight:600, margin:"0 0 3px" }}>{d.name}</p>
                    <p style={{ color:T.textSec, fontSize:11, margin:0 }}>{pct}% · ₩{fK(d.value)}원</p>
                  </div>
                );
              }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginTop:10, justifyContent:"center" }}>
            {donutData.map((h, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:h.fill }}/>
                <span style={{ color:T.textSec, fontSize:11 }}>{h.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 상단: 주요 자산 요약 카드 */}
        {isDesktop && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <StatCard label="총 자산 (TOTAL)" value={"₩"+fK(latest.assetTotal||0)} color={T.text} large/>
            <StatCard label="투자 자산" value={fK(latest.invest||0)+"원"} color={SC[0]} large/>
            <StatCard label="부동산-대출" value={fK(latest.realEstate||0)+"원"} color={SC[1]} large/>
            <StatCard label="T채권" value={fK(latest.tBond||0)+"원"} color={SC[3]} large/>
          </div>
        )}
      </div>

      {/* 중단: 누적 추이 영역 차트 (이중 축 제거) */}
      <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}`, marginBottom:16 }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>자산 및 TOTAL 추이</p>
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(chartData.length/6)}/>
            
            {/* 단일 Y축으로 통합 */}
            <YAxis tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>fK(v)} width={46}/>
            <Tooltip content={<CT fmt="krw"/>}/>
            
            <Area type="monotone" dataKey="invest"     name="투자"        stackId="a" fill={SC[0]} stroke={SC[0]}/>
            <Area type="monotone" dataKey="realEstate" name="부동산-대출" stackId="a" fill={SC[1]} stroke={SC[1]}/>
            <Area type="monotone" dataKey="jeonse"     name="전세금"      stackId="a" fill={SC[2]} stroke={SC[2]}/>
            <Area type="monotone" dataKey="tBond"      name="T채권"       stackId="a" fill={SC[3]} stroke={SC[3]}/>
            <Area type="monotone" dataKey="deposit"    name="예적금"      stackId="a" fill={SC[4]} stroke={SC[4]}/>
            <Area type="monotone" dataKey="accCard"    name="계좌-카드"   stackId="a" fill={SC[5]} stroke={SC[5]}/>
            <Area type="monotone" dataKey="pension"    name="연금"        stackId="a" fill={SC[6]} stroke={SC[6]}/>
            <Area type="monotone" dataKey="car"        name="자동차"      stackId="a" fill={SC[7]} stroke={SC[7]}/>

            <Line type="monotone" dataKey="assetTotal" name="TOTAL" stroke={T.text} strokeWidth={2} dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 하단: 날짜별 자산 데이터 테이블 */}
      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
        <div style={{ overflowX:"auto" }}>
          {/* 모바일에서도 칼럼이 안 찌그러지도록 최소 넓이(700px) 지정 */}
          <div style={{ minWidth: 700 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr", padding:"10px 14px", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
              {["Date","투자","부동산","전세금","T채권","예적금","계좌·카드","연금","자동차","TOTAL"].map((h, i) => (
                <span key={h} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:i===0?"left":"right" }}>{h}</span>
              ))}
            </div>
            <div>
              {[...chartData].reverse().map((d, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr", padding:"10px 14px", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                  <span style={{ color:T.textSec, fontSize:11, textAlign:"left" }}>{d.date}</span>
                  <span style={{ color:SC[0], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.invest)}</span>
                  <span style={{ color:SC[1], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.realEstate)}</span>
                  <span style={{ color:SC[2], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.jeonse)}</span>
                  <span style={{ color:SC[3], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.tBond)}</span>
                  <span style={{ color:SC[4], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.deposit)}</span>
                  <span style={{ color:SC[5], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.accCard)}</span>
                  <span style={{ color:SC[6], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.pension)}</span>
                  <span style={{ color:SC[7], fontSize:11, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.car)}</span>
                  <span style={{ color:T.text, fontSize:12, fontWeight:700, textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(d.assetTotal)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
//  종목(Holdings) 탭 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function HoldingsTab({ data, bp }) {
  const { HOLDINGS } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";

  const [sortBy, setSortBy] = useState("weight");
  const [filter, setFilter] = useState("전체");
  
  const types    = ["전체", ...new Set(HOLDINGS.map(h => h.type))];
  const filtered = filter === "전체" ? HOLDINGS : HOLDINGS.filter(h => h.type === filter);
  
  // 정렬 로직 (매입금액순 추가)
  const sorted   = [...filtered].sort((a, b) => {
    if (sortBy === "weight")    return b.weight - a.weight;
    if (sortBy === "profit")    return b.returnPct - a.returnPct;
    if (sortBy === "buyAmount") return b.buyAmount - a.buyAmount; 
    return b.evalAmount - a.evalAmount;
  });
  
  const totalEval = HOLDINGS.reduce((s, h) => s + h.evalAmount, 0);
  const top12     = HOLDINGS.slice(0, 12);

  // ── 국가별 비중 계산 (미국 vs 한국) ──
  const usSum = HOLDINGS.filter(h => h.country === "미국").reduce((s, h) => s + h.evalAmount, 0);
  const krSum = HOLDINGS.filter(h => h.country === "한국").reduce((s, h) => s + h.evalAmount, 0);
  const etcSum = totalEval - usSum - krSum;
  
  const usPct = totalEval ? (usSum / totalEval) * 100 : 0;
  const krPct = totalEval ? (krSum / totalEval) * 100 : 0;
  const etcPct = totalEval ? (etcSum / totalEval) * 100 : 0;

  return (
    <div style={{ padding:pad }}>
      
      {/* ── 상단 요약 대시보드 ── */}
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
        
        {/* 1. 파이 차트 (TOP 12) */}
        <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 4px" }}>포트폴리오 구성</p>
          <p style={{ color:T.textDim, fontSize:11, margin:"0 0 8px" }}>{HOLDINGS.length}종목 · ₩{totalEval.toLocaleString()}</p>
          <ResponsiveContainer width="100%" height={isDesktop?260:200}>
            <PieChart>
              <Pie data={top12} cx="50%" cy="50%" innerRadius={isDesktop?70:55} outerRadius={isDesktop?105:85} dataKey="evalAmount" nameKey="name" paddingAngle={1} strokeWidth={0}>
                {top12.map((_, i) => <Cell key={i} fill={SC[i%SC.length]}/>)}
              </Pie>
              <Tooltip content={({active,payload}) => {
                if (!active||!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background:"#1C2230", borderRadius:10, padding:"10px 14px", border:`1px solid ${T.border}` }}>
                    <p style={{ color:T.text, fontSize:12, fontWeight:600, margin:"0 0 3px" }}>{d.name}</p>
                    <p style={{ color:T.textSec, fontSize:11, margin:0 }}>{d.weight.toFixed(1)}% · ₩{fK(d.evalAmount)}원</p>
                  </div>
                );
              }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginTop:4 }}>
            {top12.map((h, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:7, height:7, borderRadius:2, background:SC[i%SC.length] }}/>
                <span style={{ color:T.textSec, fontSize:10 }}>{h.name.length>12?h.name.slice(0,12)+"..":h.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 국가별 비중 & 요약 카드 */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          
          {/* 국가별 비중 시각화 바 (모바일/PC 모두 표시) */}
          <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
            <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 14px" }}>미국 vs 한국 투자 비중</p>
            <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: `${usPct}%`, background: T.blue }} />
              <div style={{ width: `${krPct}%`, background: T.accent }} />
              {etcPct > 0 && <div style={{ width: `${etcPct}%`, background: T.textDim }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: T.blue }} />
                <span style={{ color: T.textSec }}>미국 <strong style={{ color: T.text, fontFamily:"'IBM Plex Mono',monospace" }}>{usPct.toFixed(1)}%</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: T.accent }} />
                <span style={{ color: T.textSec }}>한국 <strong style={{ color: T.text, fontFamily:"'IBM Plex Mono',monospace" }}>{krPct.toFixed(1)}%</strong></span>
              </div>
              {etcPct > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: T.textDim }} />
                  <span style={{ color: T.textSec }}>기타 <strong style={{ color: T.text }}>{etcPct.toFixed(1)}%</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* 데스크톱 전용 통계 카드 */}
          {isDesktop && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <StatCard label="총 평가금액" value={"₩"+fK(totalEval)+"원"} color={T.text} large/>
              <StatCard label="ETF 비중"    value={HOLDINGS.filter(h=>h.type==="ETF").reduce((s,h)=>s+h.weight,0).toFixed(1)+"%"} color={T.orange} large/>
            </div>
          )}
        </div>
      </div>

      {/* ── 필터 및 정렬 버튼 ── */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10, paddingBottom:4 }}>
        {types.map(t => (
          <button key={t} onClick={()=>setFilter(t)} style={{ padding:"6px 12px", borderRadius:7, flexShrink:0, border:`1px solid ${filter===t?T.borderActive:T.border}`, background:filter===t?T.accentDim:"transparent", color:filter===t?T.accent:T.textSec, fontSize:11, fontWeight:600, cursor:"pointer" }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {/* 매입금액 정렬 옵션 추가 */}
        {[{id:"weight",l:"비중순"},{id:"profit",l:"수익률순"},{id:"buyAmount",l:"매입금액순"}].map(s => (
          <button key={s.id} onClick={()=>setSortBy(s.id)} style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${sortBy===s.id?T.borderActive:T.border}`, background:sortBy===s.id?T.accentDim:"transparent", color:sortBy===s.id?T.accent:T.textDim, fontSize:10, fontWeight:600, cursor:"pointer" }}>
            {s.l}
          </button>
        ))}
      </div>

      {/* ── 종목 리스트 ── */}
      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr" }}>
          {sorted.map((h, i) => (
            <div key={i} style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:`${SC[i%SC.length]}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <div style={{ width:12, height:12, borderRadius:3, background:SC[i%SC.length] }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:T.text, fontSize:12, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name}</p>
                <p style={{ color:T.textDim, fontSize:10, margin:"2px 0 0" }}>
                  {h.country} · {h.type} · <span style={{ color:h.returnPct>=0?T.accent:T.red, fontWeight:600 }}>{fP(h.returnPct)}</span>
                </p>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <p style={{ color:T.text, fontSize:14, fontWeight:700, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{h.weight.toFixed(1)}%</p>
                {/* 정렬이 매입금액순일 때는 매입 원금을 보여줌 */}
                <p style={{ color:T.textDim, fontSize:10, margin:"1px 0 0" }}>
                  {sortBy === "buyAmount" ? `${fK(h.buyAmount)}원 (매입)` : `${fK(h.evalAmount)}원 (평가)`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  사이드바 (데스크톱 전용)
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, tabs, summary }) {
  return (
    <div style={{ width:220, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ padding:"28px 24px 20px", borderBottom:`1px solid ${T.border}` }}>
        <h1 style={{ color:T.text, fontSize:16, fontWeight:800, margin:0, letterSpacing:"-0.5px" }}>SIMPSON'S</h1>
        <p style={{ color:T.accent, fontSize:11, fontWeight:700, margin:"2px 0 0", letterSpacing:"1px" }}>FINANCE</p>
        <p style={{ color:T.textDim, fontSize:10, margin:"8px 0 0" }}>2026.02.13 기준</p>
      </div>
      <div style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
        <p style={{ color:T.textDim, fontSize:10, margin:"0 0 4px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>총 수익률</p>
        <p style={{ color:T.accent, fontSize:26, fontWeight:800, margin:0, fontFamily:"'IBM Plex Mono',monospace" }}>{fP(summary.returnPct||0)}</p>
        <p style={{ color:T.textSec, fontSize:11, margin:"4px 0 0" }}>{fK(summary.evalTotal||0)}원</p>
      </div>
      <nav style={{ padding:"12px", flex:1 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 14px", marginBottom:4, borderRadius:10, border:`1px solid ${tab===t.id?T.borderActive:"transparent"}`, background:tab===t.id?T.accentDim:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ color:tab===t.id?T.accent:T.textSec, fontSize:13, fontWeight:tab===t.id?700:500 }}>{t.label}</span>
            {tab===t.id && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:2, background:T.accent }}/>}
          </button>
        ))}
      </nav>
      <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}` }}>
        <p style={{ color:T.textDim, fontSize:10, margin:0 }}>투자기간 {summary.months||0}개월</p>
        <p style={{ color:T.textDim, fontSize:10, margin:"2px 0 0" }}>원금 {fK(summary.principal||0)}원</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  메인 App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("overview");
  const [status, setStatus]   = useState("loading");  // "loading" | "error" | "done"
  const [errMsg, setErrMsg]   = useState("");
  const [appData, setAppData] = useState(null);
  const bp = useBP();
  const isDesktop = bp === "desktop";

  const tabs = [
    { id:"overview", label:"종합",   icon:"🏠" },
    { id:"returns",  label:"수익률", icon:"📈" },
    { id:"cumul",    label:"누적",   icon:"📊" },
    { id:"dividend", label:"배당",   icon:"💰" },
    { id:"monthly",  label:"월별",   icon:"📅" },
    { id:"holdings", label:"종목",   icon:"💎" },
    { id:"assets",   label:"자산",   icon:"🏦" }, // <-- 추가된 부분
  ];
  
  const titles = {
    overview:"포트폴리오 종합", returns:"수익률 분석",
    cumul:"누적 현황",          dividend:"배당 분석",
    monthly:"월별 상세",        holdings:"종목별 현황",
    assets:"자산 구성",         // <-- 추가된 부분
  };

  async function loadData() {
    setStatus("loading");
    try {
      const [mRes, hRes] = await Promise.all([
        fetch(SHEET_URLS.MONTHLY),
        fetch(SHEET_URLS.HOLDINGS),
      ]);
      if (!mRes.ok) throw new Error(`MONTHLY 시트 오류: HTTP ${mRes.status}`);
      if (!hRes.ok) throw new Error(`HOLDINGS 시트 오류: HTTP ${hRes.status}`);

      const [mText, hText] = await Promise.all([mRes.text(), hRes.text()]);

      // parseMonthlyTSV에서 SUMMARY 객체를 함께 받아옵니다.
      const { SUMMARY, MONTHLY } = parseMonthlyTSV(mText);
      const HOLDINGS  = parseHoldingsTSV(hText);

      if (!MONTHLY.length)  throw new Error("MONTHLY 데이터를 파싱할 수 없습니다.");
      if (!HOLDINGS.length) throw new Error("HOLDINGS 데이터를 파싱할 수 없습니다.");

      const DIVIDENDS = deriveDividends(MONTHLY);

      setAppData({ SUMMARY, MONTHLY, HOLDINGS, DIVIDENDS });
      setStatus("done");
    } catch (e) {
      setErrMsg(e.message || "알 수 없는 오류가 발생했습니다.");
      setStatus("error");
    }
  }

  useEffect(() => { loadData(); }, []);

  if (status === "loading") return <LoadingScreen/>;
  if (status === "error")   return <ErrorScreen message={errMsg} onRetry={loadData}/>;

const renderTab = () => {
    const props = { data: appData, bp };
    switch (tab) {
      case "overview": return <OverviewTab  {...props}/>;
      case "returns":  return <ReturnsTab   {...props}/>;
      case "cumul":    return <CumulativeTab{...props}/>;
      case "dividend": return <DividendTab  {...props}/>;
      case "monthly":  return <MonthlyTab   {...props}/>;
      case "holdings": return <HoldingsTab  {...props}/>;
      case "assets":   return <AssetsTab    {...props}/>; // <-- 추가된 부분
      default:         return null;
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'IBM Plex Sans KR','Noto Sans KR',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{background:${T.bg};overflow-x:hidden}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
      `}</style>

      {isDesktop ? (
        /* ── Desktop: 사이드바 + 메인 콘텐츠 ── */
        <div style={{ display:"flex", minHeight:"100vh" }}>
          <Sidebar tab={tab} setTab={setTab} tabs={tabs} summary={appData.SUMMARY}/>
          <div style={{ flex:1, minWidth:0, overflowY:"auto" }}>
            <div style={{ padding:"20px 28px 16px", position:"sticky", top:0, background:`${T.bg}ee`, backdropFilter:"blur(20px)", zIndex:10, borderBottom:`1px solid ${T.border}` }}>
              <h2 style={{ color:T.text, fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.5px" }}>{titles[tab]}</h2>
            </div>
            <div style={{ paddingTop:8 }}>{renderTab()}</div>
          </div>
        </div>
      ) : (
        /* ── Mobile / Tablet: 하단 탭 바 ── */
        <div style={{ maxWidth:bp==="tablet"?768:520, margin:"0 auto", position:"relative" }}>
          <div style={{ padding:"14px 18px 10px", position:"sticky", top:0, background:`${T.bg}ee`, backdropFilter:"blur(20px)", zIndex:10, borderBottom:`1px solid ${T.border}` }}>
            <h1 style={{ color:T.text, fontSize:18, fontWeight:700, margin:0, letterSpacing:"-0.5px" }}>{titles[tab]}</h1>
            <p style={{ color:T.textDim, fontSize:11, margin:"1px 0 0" }}>SIMPSON'S FINANCE · 2026.02.13 기준</p>
          </div>
          <div style={{ paddingTop:12 }}>{renderTab()}</div>
          <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:bp==="tablet"?768:520, background:`${T.bg}f8`, backdropFilter:"blur(20px)", borderTop:`1px solid ${T.border}`, display:"flex", padding:"5px 0 env(safe-area-inset-bottom,5px)", zIndex:20 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1, padding:"6px 0", border:"none", background:"none", cursor:"pointer" }}>
                <span style={{ fontSize:17, filter:tab===t.id?"none":"grayscale(1) opacity(0.3)", transition:"filter 0.2s" }}>{t.icon}</span>
                <span style={{ fontSize:9, fontWeight:tab===t.id?700:400, color:tab===t.id?T.accent:T.textDim, transition:"color 0.2s" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
