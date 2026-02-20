// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import * as recharts from "recharts";
import Papa from "papaparse";
import ReactMarkdown from 'react-markdown';

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
  // ▼ 여기 두 줄을 더 밝은 회색으로 변경했습니다 ▼
  text:"#ECF0F6", textSec:"#B0B8C4", textDim:"#8A94A6",
  border:"rgba(255,255,255,0.04)", borderActive:"rgba(0,230,118,0.25)",
};
const SC = ["#42A5F5","#FF7043","#66BB6A","#FFD740","#CE93D8","#4DD0E1","#FF8A65","#AED581","#FFF176","#BA68C8","#4FC3F7","#FF5252","#81C784","#FFB74D","#9575CD","#26C6DA","#EF5350","#A5D6A7","#FFC107","#7E57C2","#F06292","#80CBC4","#DCE775","#B39DDB","#4DB6AC","#E57373","#64B5F6","#AED581","#FFB74D","#90A4AE"];

// ─────────────────────────────────────────────────────────────────────────────
//  TSV 파싱 유틸리티
// ─────────────────────────────────────────────────────────────────────────────
function n(v) {
  if (v === null || v === undefined || v === "" || v === "#N/A") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[₩$,\s]/g, "").trim();
  if (s.includes("%")) return parseFloat(s.replace("%", ""));
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function parseDate(str) {
  if (!str) return null;
  const s = String(str).replace(/\s+/g, "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{2})\/(\d{1,2})$/);
  if (m) {
    const year = 2000 + parseInt(m[1], 10);
    return `${year}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function parseMonthlyTSV(text) {
  const rows = text.split("\n").map(r => r.split("\t"));
  const header = rows[7] || [];
  const findIdx = (name) => header.findIndex(h => h.includes(name));
  
  const idxCumDiv = findIdx("누적 배당 수익");
  const idxTotal  = findIdx("TOTAL");

  const r2 = rows[2] || [];
  const r3 = rows[3] || [];
  const r4 = rows[4] || [];

  const SUMMARY = {
    principal: n(r2[10]) * 1000,
    profit:    n(r2[11]) * 1000,
    evalTotal: n(r2[12]) * 1000,
    returnPct: n(r2[13]) > 500 ? n(r2[13]) / 100 : n(r2[13]),
    months:    n(r3[2]),
    highReturnPct: n(r3[4]) > 500 ? n(r3[4]) / 100 : n(r3[4]),
    fromHighPct:   n(r3[6]),
    cumDividend:   n(r3[11]) * 1000,
    avgMonthlyProfit: n(r4[2]) * 1000,
    cumCapGain:    n(r4[11]) * 1000 || (n(r2[11]) * 1000 - n(r3[11]) * 1000)
  };

  const monthlyMap = new Map();
  let runningCumDiv = 0;
  let firstDividendFound = false;

  for (let i = 14; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 10) continue;

    let dIdx = -1;
    for(let j=0; j<4; j++) {
      if (parseDate(row[j])) { dIdx = j; break; }
    }
    if (dIdx === -1) continue; 

    const date = parseDate(row[dIdx]);
    const principal = n(row[dIdx + 1]) * 1000;
    if (principal <= 0) continue; 

    const rawVal = n(row[idxCumDiv !== -1 ? idxCumDiv : 58]) * 1000;
    if (rawVal > 0) { firstDividendFound = true; runningCumDiv = rawVal; }

    const profit = n(row[dIdx + 3]) * 1000;
    const curCumDiv = firstDividendFound ? runningCumDiv : 0;
    
    let rawReturn = n(row[dIdx + 6]);
    if (principal < 10000000 && (rawReturn > 500 || rawReturn < -500)) {
      rawReturn = 0; 
    } else if (rawReturn > 500) {
      rawReturn = rawReturn / 100;
    }

    monthlyMap.set(date, {
      date,
      principal,
      evalTotal:     (n(row[dIdx + 2]) * 1000) || principal,
      profit:        profit,
      principalChg:  n(row[dIdx + 4]) * 1000,
      returnPct:     rawReturn,
      cumDividend:   curCumDiv,
      capGain:       profit - curCumDiv,
      assetTotal:    n(row[idxTotal !== -1 ? idxTotal : 53]) * 1000 || 0,
      invest: n(row[46])*1000||0, realEstate: n(row[56])*1000||0, tBond: n(row[54])*1000||0,
      deposit: n(row[45])*1000||0, pension: n(row[49])*1000||0, car: n(row[51])*1000||0,
      jeonse: n(row[52])*1000||0, accCard: n(row[55])*1000||0
    });
  }

  const MONTHLY = Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { SUMMARY, MONTHLY };
}

function parseHoldingsTSV(text) {
  const rows = text.split("\n").map(r => r.split("\t"));
  const HOLDINGS = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;

    const name = (row[2] || "").trim();
    if (!name) continue;

    const evalAmount = n(row[6]);
    if (evalAmount <= 0) continue;

    HOLDINGS.push({
      country:    (row[0] || "").trim(),
      code:       (row[1] || "").trim(),
      name,
      type:       (row[3] || "").trim(),
      qty:        n(row[4]),
      buyAmount:  n(row[5]),
      evalAmount,
      profit:     n(row[7]),
      returnPct:  n(row[8]),
      weight:     n(row[9]),
    });
  }

  HOLDINGS.sort((a, b) => b.weight - a.weight);
  return HOLDINGS;
}

function deriveDividends(monthly) {
  if (!monthly || !monthly.length) return [];

  const byYear = {};
  
  monthly.forEach(d => {
    const yr = d.date.substring(0, 4);
    if (!byYear[yr]) {
      byYear[yr] = { monthlyDividends: [], cumDividends: [], lastProfit: 0, lastPrincipal: 0, lastEval: 0 };
    }
    byYear[yr].monthlyDividends.push(d.dividend || 0);
    byYear[yr].cumDividends.push(d.cumDividend || 0);
    byYear[yr].lastProfit    = d.profit || 0;
    byYear[yr].lastPrincipal = d.principal || 0;
    byYear[yr].lastEval      = d.evalTotal || 0;
  });

  let prevYearEndCumDiv = 0;
  let prevProfit = 0;
  const sortedYears = Object.keys(byYear).sort();

  const result = sortedYears.map(yr => {
    const v = byYear[yr];
    let divIncome = v.monthlyDividends.reduce((s, x) => s + x, 0);
    const yearEndCumDiv = Math.max(...v.cumDividends);
    if (divIncome <= 0 && yearEndCumDiv > prevYearEndCumDiv) {
      divIncome = yearEndCumDiv - prevYearEndCumDiv;
    }
    const totalReturn  = v.lastProfit - prevProfit;
    const capGain      = totalReturn - divIncome;
    
    const item = {
      year: parseInt(yr),
      divIncome: Math.max(0, divIncome),
      capGain, totalReturn, cumDiv: yearEndCumDiv,
      cumTotal: v.lastProfit, yearEndPrincipal: v.lastPrincipal, yearEndEval: v.lastEval,
    };
    prevYearEndCumDiv = yearEndCumDiv;
    prevProfit = v.lastProfit;
    return item;
  });

  return result.map((d, i) => ({
    ...d,
    divGrowth: i === 0 || result[i-1].divIncome === 0 ? 0 : +((d.divIncome / result[i-1].divIncome - 1) * 100).toFixed(2),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  포맷 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
const fK = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0";
  const val = Number(v);
  if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + "억";
  if (Math.abs(val) >= 10000) return (val / 10000).toLocaleString(undefined, {maximumFractionDigits:0}) + "만";
  return val.toLocaleString();
};
const fF = (v) => (v > 0 ? "+" : "") + Math.abs(v).toLocaleString() + "원";
const fP = (v) => {
  if (v === undefined || v === null || isNaN(v)) return "0.00%";
  const val = Number(v);
  if (Math.abs(val) > 1000) return "0.00%";
  return val.toFixed(2) + "%";
};

function useBP() {
  // ★ FIX 1: visualViewport로 폴드폰 화면 전환을 정확하게 감지 + 디바운스로 안정화
  const getW = () =>
    typeof window !== "undefined"
      ? (window.visualViewport?.width ?? window.innerWidth)
      : 1024;

  const [w, setW] = useState(getW);

  useEffect(() => {
    let timer;
    const fn = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setW(getW()), 80);
    };
    window.addEventListener("resize", fn);
    window.visualViewport?.addEventListener("resize", fn);
    return () => {
      window.removeEventListener("resize", fn);
      window.visualViewport?.removeEventListener("resize", fn);
      clearTimeout(timer);
    };
  }, []);

  if (w >= 1024) return "desktop";
  if (w >= 600)  return "tablet";
  return "mobile";
}

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

function StatCard({ label, value, color, sub, large, isMobile }) {
  // ★ 카드의 위아래 패딩(여백)을 대폭 줄여서 납작하게 만듭니다.
  const pad = isMobile ? "8px 10px" : (large ? "16px 18px" : "10px 12px");
  
  const labelSize = isMobile ? 11 : (large ? 11 : 11); 
  const valueSize = isMobile ? 16 : (large ? 20 : 17);
  const subSize   = isMobile ? 10 : (large ? 11 : 10);

  // ★ 글씨 사이의 띄어쓰기(Margin)도 최소한으로 줄입니다.
  const labelMarginBottom = isMobile ? 2 : 3;
  const subMarginTop = isMobile ? 2 : 3;

  return (
    <div style={{ background:T.card, borderRadius:12, padding:pad, border:`1px solid ${T.border}`, flex:1, minWidth:0, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <p style={{ color:T.textDim, fontSize:labelSize, margin:`0 0 ${labelMarginBottom}px`, fontWeight:600, letterSpacing:"0.4px" }}>{label}</p>
      <p style={{ color:color||T.text, fontSize:valueSize, fontWeight:800, margin:0, letterSpacing:"-0.5px", fontFamily:"'IBM Plex Mono',monospace" }}>{value}</p>
      {sub && <p style={{ color:T.textSec, fontSize:subSize, margin:`${subMarginTop}px 0 0` }}>{sub}</p>}
    </div>
  );
}

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
//  종합(Overview) 탭 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ data, bp, onAskAi }) {
  const { SUMMARY, MONTHLY, HOLDINGS } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const isMobile  = bp === "mobile"; // ★ 에러 원인 해결: 모바일 판별 변수 추가! ★
  const pad   = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 340 : isWide ? 280 : 250;

  const [quickQuestion, setQuickQuestion] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && quickQuestion.trim() && onAskAi) {
      onAskAi(quickQuestion);
    }
  };

  const top10 = HOLDINGS.slice(0, 10);
  const allStats = [
    { label: "현재 수익률", value: fP(SUMMARY.returnPct),       color: T.accent },
    { label: "수익률 고점", value: fP(SUMMARY.highReturnPct),    color: T.accent, sub: "고점대비 "+fP(SUMMARY.fromHighPct) },
    { label: "누적 배당",   value: fK(SUMMARY.cumDividend)+"원", color: T.orange },
    { label: "시세차익",    value: fK(SUMMARY.cumCapGain)+"원",  color: T.blue }
  ];

  // ★ 2. 모바일 화면일 때는 뒤의 2개(누적배당, 시세차익)만 뽑아서 씁니다. PC/와이드는 4개 전부 씁니다.
  const stats = isMobile ? allStats.slice(2, 4) : allStats;

  return (
    <div style={{ padding:pad }}>
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

      {/* ★ AI 질문 박스 수정 (폴드 화면 뚫림 방지 적용) */}
      <div style={{ 
        marginBottom: 16, 
        padding: "6px 8px 6px 16px", // 우측 패딩을 줄여 버튼이 착 달라붙게 수정
        background: T.surface, 
        borderRadius: 12, 
        border: `1px solid ${T.accent}50`, 
        display: "flex", 
        alignItems: "center", 
        gap: 10, 
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)" 
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
        <input 
          value={quickQuestion}
          onChange={(e) => setQuickQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="오늘 SPGI 주가 어때?"
          style={{ 
            flex: 1, 
            minWidth: 0, // ★ 핵심: 플렉스 박스가 영역을 뚫고 나가는 것을 방지
            background: "transparent", 
            border: "none", 
            color: T.text, 
            fontSize: 16, 
            outline: "none" 
          }}
        />
        <button 
          onClick={() => quickQuestion.trim() && onAskAi && onAskAi(quickQuestion)}
          style={{ 
            background: "transparent", 
            color: "#000", 
            border: "1px solid #5A6272", 
            padding: "8px 14px", 
            borderRadius: 8, 
            fontWeight: 700, 
            cursor: "pointer", 
            fontSize: 18, 
            display:"flex", 
            alignItems:"center", 
            justifyContent:"center",
            flexShrink: 0 // ★ 핵심: 버튼 크기가 찌그러지지 않게 방어
          }}
        >
          🚀
        </button>
      </div>

{/* ★ 3. 카드 레이아웃: 모바일이면 2칸, 넓은 화면이면 4칸으로 자동 조절 */}
<div style={{ display:"grid", gridTemplateColumns: isWide ? "repeat(4,1fr)" : "repeat(2,1fr)", gap:10, marginBottom:16 }}>
        {stats.map((s, i) => (
          // ★ 중요: isMobile={isMobile} 추가 ★
          <StatCard key={i} label={s.label} value={s.value} color={s.color} sub={s.sub} isMobile={isMobile} />
        ))}
      </div>

      {/* Chart + Top10 */}
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16 }}>
        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:14, fontWeight:700, margin:"0 0 8px 16px" }}>자산 및 수익 추이</p>
          <div style={{ display:"flex", gap:14, margin:"0 0 10px 16px", flexWrap:"wrap" }}>
            {[{l:"평가총액",c:T.red},{l:"투자원금",c:T.blue},{l:"수익금액",c:T.orange}].map(x => (
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                <span style={{ color:T.textSec, fontSize:12 }}>{x.l}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={chartH}>
            <ComposedChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
              <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:10}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(MONTHLY.length/6)}/>
              <YAxis tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>fK(v)} width={46} domain={[dataMin => Math.min(dataMin, -50000000), 'auto']} allowDataOverflow={true} />
              <Tooltip content={<CT fmt="krw"/>}/>
              <ReferenceLine y={0} stroke={T.textDim} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="principal" name="투자원금" stroke={T.blue} strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="evalTotal" name="평가총액" stroke={T.red} strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="profit" name="수익금액" stroke={T.orange} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

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
                    <p style={{ color:T.textDim, fontSize:10, margin:"2px 0 0" }}>{h.country} · {h.type} · <span style={{ color:h.returnPct>=0?T.accent:T.red, fontWeight:600 }}>{fP(h.returnPct)}</span></p>
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

// ─────────────────────────────────────────────────────────────────────────────
//  나머지 탭들 (Returns, Cumulative, Dividend, Monthly, Assets, Holdings)
// ─────────────────────────────────────────────────────────────────────────────
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

function AssetsTab({ data, bp }) {
  const { MONTHLY } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 300 : isWide ? 260 : 220;

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

  const chartData = MONTHLY.filter(m => m.assetTotal > 0);

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
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

        {isDesktop && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <StatCard label="총 자산 (TOTAL)" value={"₩"+fK(latest.assetTotal||0)} color={T.text} large/>
            <StatCard label="투자 자산" value={fK(latest.invest||0)+"원"} color={SC[0]} large/>
            <StatCard label="부동산-대출" value={fK(latest.realEstate||0)+"원"} color={SC[1]} large/>
            <StatCard label="T채권" value={fK(latest.tBond||0)+"원"} color={SC[3]} large/>
          </div>
        )}
      </div>

      <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}`, marginBottom:16 }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 10px 16px" }}>자산 및 TOTAL 추이</p>
        <ResponsiveContainer width="100%" height={chartH}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(chartData.length/6)}/>
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

      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}` }}>
        <div style={{ overflowX:"auto" }}>
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

function HoldingsTab({ data, bp }) {
  const { HOLDINGS } = data;
  const isDesktop = bp === "desktop";
  const isWide    = bp !== "mobile";
  const pad    = isDesktop ? "0 28px 48px" : "0 16px 100px";

  const [sortBy, setSortBy] = useState("weight");
  const [filter, setFilter] = useState("전체");
  
  const types    = ["전체", ...new Set(HOLDINGS.map(h => h.type))];
  const filtered = filter === "전체" ? HOLDINGS : HOLDINGS.filter(h => h.type === filter);
  
  const sorted   = [...filtered].sort((a, b) => {
    if (sortBy === "weight")    return b.weight - a.weight;
    if (sortBy === "profit")    return b.returnPct - a.returnPct;
    if (sortBy === "buyAmount") return b.buyAmount - a.buyAmount; 
    return b.evalAmount - a.evalAmount;
  });
  
  const totalEval = HOLDINGS.reduce((s, h) => s + h.evalAmount, 0);
  const top12     = HOLDINGS.slice(0, 12);

  const usSum = HOLDINGS.filter(h => h.country === "미국").reduce((s, h) => s + h.evalAmount, 0);
  const krSum = HOLDINGS.filter(h => h.country === "한국").reduce((s, h) => s + h.evalAmount, 0);
  const etcSum = totalEval - usSum - krSum;
  
  const usPct = totalEval ? (usSum / totalEval) * 100 : 0;
  const krPct = totalEval ? (krSum / totalEval) * 100 : 0;
  const etcPct = totalEval ? (etcSum / totalEval) * 100 : 0;

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16, marginBottom:16 }}>
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

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
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

          {isDesktop && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <StatCard label="총 평가금액" value={"₩"+fK(totalEval)+"원"} color={T.text} large/>
              <StatCard label="ETF 비중"    value={HOLDINGS.filter(h=>h.type==="ETF").reduce((s,h)=>s+h.weight,0).toFixed(1)+"%"} color={T.orange} large/>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10, paddingBottom:4 }}>
        {types.map(t => (
          <button key={t} onClick={()=>setFilter(t)} style={{ padding:"6px 12px", borderRadius:7, flexShrink:0, border:`1px solid ${filter===t?T.borderActive:T.border}`, background:filter===t?T.accentDim:"transparent", color:filter===t?T.accent:T.textSec, fontSize:11, fontWeight:600, cursor:"pointer" }}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {[{id:"weight",l:"비중순"},{id:"profit",l:"수익률순"},{id:"buyAmount",l:"매입금액순"}].map(s => (
          <button key={s.id} onClick={()=>setSortBy(s.id)} style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${sortBy===s.id?T.borderActive:T.border}`, background:sortBy===s.id?T.accentDim:"transparent", color:sortBy===s.id?T.accent:T.textDim, fontSize:10, fontWeight:600, cursor:"pointer" }}>
            {s.l}
          </button>
        ))}
      </div>

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
//  Q&A (AI 비서) 탭 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
function QaTab({ data, bp, input, setInput, headerH = 56, tabBarH = 50 }) {
  const { SUMMARY, MONTHLY, HOLDINGS } = data;
  const isDesktop = bp === "desktop";
  const pad = isDesktop ? "0 28px 48px" : "0 0 0"; 

  // ★ 모바일일 때 글씨 크기를 전반적으로 키웁니다.
  const baseFontSize = isDesktop ? 15 : 17; 
  const titleFontSize = isDesktop ? "18px" : "20px";

  const [messages, setMessages] = useState([
    { role: "model", text: "안녕하세요! SimpsonYS님의 자산 현황이나 특정 종목에 대해 무엇이든 물어보세요. 🤖" }
  ]);
  
  // ❌ 주의: 여기에 있던 const [input, setInput] = useState(""); 코드는 완전히 삭제되었습니다!

  const [loading, setLoading] = useState(false);

  // ★ 핵심 추가: 자동 전송이 두 번 실행되는 것을 막는 방어막(Flag)
  const hasAutoSent = useRef(false);

  const handleSend = async (overrideInput) => {
    // ★ 버튼 클릭 이벤트(객체)가 들어올 경우를 대비한 안전장치 추가
    const textToSend = typeof overrideInput === "string" ? overrideInput : input;
    
    if (!textToSend || !textToSend.trim() || loading) return;

    setMessages(prev => [...prev, { role: "user", text: textToSend }]);
    setInput("");
    setLoading(true);

    const currentSummary = {
      eval: Math.round(SUMMARY.evalTotal / 10000),
      prin: Math.round(SUMMARY.principal / 10000),
      div: Math.round(SUMMARY.cumDividend / 10000)
    };

    const historyData = MONTHLY.map(m => 
      `${m.date}: ${Math.round(m.principal / 10000)}/${Math.round(m.evalTotal / 10000)}`
    );

    const holdingsData = HOLDINGS.map(h => 
      `${h.name}: ${Math.round(h.evalAmount / 10000)}/${h.returnPct.toFixed(1)}%`
    );

    const systemPrompt = `
You are a Senior Quantitative Investment Analyst briefing your client, SimpsonYS. Respond professionally in Korean.

# PORTFOLIO DATA (All currency values are in '만원' - 10,000 KRW)

1. [Current Status] 
- Principal: ${currentSummary.prin}만원
- Total Evaluation: ${currentSummary.eval}만원
- Cumulative Dividend: ${currentSummary.div}만원

2. [Monthly History (Format: "YY-MM: Principal/TotalEval")]
${JSON.stringify(historyData)}

3. [All Holdings (Format: "Ticker: TotalEval/ReturnPct")]
${JSON.stringify(holdingsData)}

# RULES
- Read the 'Monthly History' array to answer questions about past performance, principal amounts, or total evaluations at specific dates.
- Calculate profit dynamically as (TotalEval - Principal).
- Always format numbers naturally in Korean for the client (e.g., if data says 32000만원, output as 3억 2,000만원).
    `;

    const MODEL_NAME = "gemini-2.5-flash"; 
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
      const chatHistory = messages
        .filter(m => !m.text.includes("안녕하세요"))
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      
      // ★ 문제의 원인 해결: userText를 textToSend로 확실하게 변경했습니다.
      chatHistory.push({ role: "user", parts: [{ text: textToSend }] });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: chatHistory, 
          tools: [{ googleSearch: {} }] 
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error?.message || "API 연결 에러");
      
      const reply = resData.candidates[0].content.parts[0].text;
      setMessages(prev => [...prev, { role: "model", text: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "model", text: `시스템 알림: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // ★ 핵심 수정: 방어막(hasAutoSent.current)이 false일 때만 한 번 전송
  useEffect(() => {
    if (input && input.trim() !== "" && !hasAutoSent.current) {
      hasAutoSent.current = true; // 깃발을 꽂아서 다음 렌더링 땐 무시하도록 처리
      handleSend();
    }
  }, []);
  // ─────────────────────────────────────────────────────────

  return (
    // ★ 모바일: position:fixed로 헤더 바로 아래 ~ 탭바 바로 위를 정확히 채움
    // ★ 데스크톱: 기존 방식 유지
    <div style={
      isDesktop
        ? { padding: pad, display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: T.bg }
        : { position: "fixed", top: headerH, left: 0, right: 0, bottom: tabBarH, display: "flex", flexDirection: "column", background: T.bg, zIndex: 5 }
    }>
      <div style={{ background: T.card, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: isDesktop ? `1px solid ${T.border}` : "none", borderRadius: isDesktop ? 16 : 0 }}>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: "flex-start", width: "100%" }}>
              <div style={{ 
                color: m.role === "user" ? T.accent : T.text, 
                padding: m.role === "user" ? "10px 0" : "0",
                fontSize: baseFontSize, // ★ 기본 폰트 크기 적용
                lineHeight: 1.6, 
                textAlign: "left",
                borderBottom: m.role === "user" ? `1px dashed ${T.border}` : "none",
                marginBottom: m.role === "user" ? 10 : 0
              }}>
                {m.role === "user" ? (
                  `💬 SimpsonYS: ${m.text}`
                ) : (
                  <ReactMarkdown
                    components={{
                      // ★ 마크다운 요소별 글씨 크기 대폭 확대
                      p: ({node, ...props}) => <p style={{ marginBottom: "16px", lineHeight: "1.7", fontSize: `${baseFontSize}px` }} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ marginTop: "30px", marginBottom: "14px", fontSize: titleFontSize, fontWeight: "bold", color: T.text }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ paddingLeft: "24px", marginBottom: "16px", listStyleType: "disc" }} {...props} />,
                      li: ({node, ...props}) => <li style={{ marginBottom: "10px", lineHeight: "1.7", fontSize: `${baseFontSize}px` }} {...props} />,
                      strong: ({node, ...props}) => <strong style={{ fontWeight: "800", color: T.text }} {...props} />
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && <div style={{ color: T.textDim, fontSize: baseFontSize - 2, textAlign: "left" }}>데이터 분석 중... ⏳</div>}
        </div>

        <div style={{ padding: "12px 16px", background: T.surface, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, paddingBottom: isDesktop ? 12 : "calc(12px + env(safe-area-inset-bottom))" }}>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="질문을 입력하세요..."
            style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "12px 14px", borderRadius: 10, outline: "none", fontSize: baseFontSize }} // ★ 입력창 글씨 크기 확대
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            style={{ background: "transparent", color: "#000", border: "1px solid #5A6272", padding: "0 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.5 : 1, fontSize: baseFontSize - 1 }} // ★ 전송 버튼 글씨 크기 확대
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  사이드바 (데스크톱 전용)
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, tabs, summary }) {
  // 종합(overview) + 자산 + Q&A → 상단 SPECIAL SERVICES 영역
  const topTabs  = tabs.filter(t => ["overview", "assets", "qa"].includes(t.id));
  // 나머지 → INVESTMENT DATA 영역
  const mainTabs = tabs.filter(t => !["overview", "assets", "qa"].includes(t.id));

  return (
    <div style={{ width:220, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ padding:"28px 24px 20px", borderBottom:`1px solid ${T.border}` }}>
        <h1 style={{ color:T.text, fontSize:16, fontWeight:800, margin:0, letterSpacing:"-0.5px" }}>SIMPSONYS</h1>
        <p style={{ color:T.accent, fontSize:11, fontWeight:700, margin:"2px 0 0", letterSpacing:"1px" }}>FINANCE</p>
      </div>

      <div style={{ padding:"12px", borderBottom:`1px solid ${T.border}`, background: "rgba(255,255,255,0.02)" }}>
        <p style={{ color:T.textDim, fontSize:9, margin:"0 8px 8px", fontWeight:700, letterSpacing:"0.5px" }}>SPECIAL SERVICES</p>
        {topTabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:4, borderRadius:10, border:`1px solid ${tab===t.id?T.borderActive:"transparent"}`, background:tab===t.id?T.accentDim:"transparent", cursor:"pointer", transition:"all 0.15s" }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>
            <span style={{ color:tab===t.id?T.accent:T.text, fontSize:13, fontWeight:tab===t.id?700:600 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <nav style={{ padding:"12px", flex:1 }}>
        <p style={{ color:T.textDim, fontSize:9, margin:"0 8px 8px", fontWeight:700, letterSpacing:"0.5px" }}>INVESTMENT DATA</p>
        {mainTabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"10px 14px", marginBottom:4, borderRadius:10, border:`1px solid ${tab===t.id?T.borderActive:"transparent"}`, background:tab===t.id?T.accentDim:"transparent", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
            <span style={{ fontSize:17 }}>{t.icon}</span>
            <span style={{ color:tab===t.id?T.accent:T.textSec, fontSize:13, fontWeight:tab===t.id?700:500 }}>{t.label}</span>
          </button>
        ))}
      </nav>
      
      <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}` }}>
        <p style={{ color:T.textDim, fontSize:10, margin:0 }}>{fP(summary.returnPct)} 수익 중</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  메인 App 
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("overview");
  
  const [status, setStatus]   = useState("loading");
  const [errMsg, setErrMsg]   = useState("");
  const [appData, setAppData] = useState(null);
  const bp = useBP();
  const isDesktop = bp === "desktop";

  // ★ FIX 4: key={resizeKey} 강제 remount 방식 제거 → 깜빡임 및 레이아웃 깨짐 원인 제거

  // ★ FIX 2: 모바일 헤더 높이를 ResizeObserver로 실시간 측정
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(56);

  useEffect(() => {
    if (!headerRef.current) return;
    const obs = new ResizeObserver(entries => {
      setHeaderH(entries[0].contentRect.height);
    });
    obs.observe(headerRef.current);
    return () => obs.disconnect();
  }, [bp]);

  // ★ 하단 탭바 높이도 정확히 측정 → QaTab에 전달해서 여백 0으로 맞춤
  const tabBarRef = useRef(null);
  const [tabBarH, setTabBarH] = useState(50);

  useEffect(() => {
    if (!tabBarRef.current) return;
    const obs = new ResizeObserver(entries => {
      setTabBarH(entries[0].contentRect.height);
    });
    obs.observe(tabBarRef.current);
    return () => obs.disconnect();
  }, [bp]);

  // ★ 1. Q&A 검색어 상태 
  const [qaInput, setQaInput] = useState(""); 

  // ★ 2. 종합 탭에서 질문 시 Q&A 탭으로 이동시키는 함수 (이름 불일치 및 setTab 에러 해결 완료)
  const handleAskAiFromOverview = (text) => {
    setQaInput(text);      
    setTab("qa");          
  };

  const tabs = [
    { id:"overview", label:"종합",   icon:"🏠" },
    { id:"returns",  label:"수익률", icon:"📈" },
    { id:"cumul",    label:"누적",   icon:"📊" },
    { id:"dividend", label:"배당",   icon:"💰" },
    { id:"monthly",  label:"월별",   icon:"📅" },
    { id:"holdings", label:"종목",   icon:"💎" },
    { id:"assets",   label:"자산",   icon:"🏦" },
    { id:"qa",       label:"Q&A",    icon:"🤖" },
  ];

  const titles = {
    overview:"포트폴리오 종합", returns:"수익률 분석", cumul:"누적 현황", 
    dividend:"배당 분석", monthly:"월별 상세", holdings:"종목별 현황",
    assets:"자산 구성", qa:"AI 금융 비서"
  };

  const renderTab = () => {
    const props = { data: appData, bp };
    
    switch (tab) {
      case "overview": return <OverviewTab  {...props} onAskAi={handleAskAiFromOverview} />;
      case "returns":  return <ReturnsTab   {...props}/>;
      case "cumul":    return <CumulativeTab{...props}/>;
      case "dividend": return <DividendTab  {...props}/>;
      case "monthly":  return <MonthlyTab   {...props}/>;
      case "holdings": return <HoldingsTab  {...props}/>;
      case "assets":   return <AssetsTab    {...props}/>;
      case "qa":       return <QaTab        {...props} input={qaInput} setInput={setQaInput} headerH={headerH} tabBarH={tabBarH} />;
      default:         return <OverviewTab  {...props}/>;
    }
  };

  async function loadData() {
    setStatus("loading");
    try {
      const [mRes, hRes] = await Promise.all([
        fetch(SHEET_URLS.MONTHLY),
        fetch(SHEET_URLS.HOLDINGS),
      ]);
      const [mText, hText] = await Promise.all([mRes.text(), hRes.text()]);
      const { SUMMARY, MONTHLY } = parseMonthlyTSV(mText);
      const HOLDINGS = parseHoldingsTSV(hText);
      const DIVIDENDS = deriveDividends(MONTHLY);
      setAppData({ SUMMARY, MONTHLY, HOLDINGS, DIVIDENDS });
      setStatus("done");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  useEffect(() => { loadData(); }, []);

  if (status === "loading") return <LoadingScreen/>;
  if (status === "error")   return <ErrorScreen message={errMsg} onRetry={loadData}/>;

  return (
    // ★ FIX 4: key={resizeKey} 제거 → 화면 전환 시 불필요한 전체 remount 방지
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'IBM Plex Sans KR',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{background:${T.bg};overflow-x:hidden}
      `}</style>

      {isDesktop ? (
        <div style={{ display:"flex", minHeight:"100vh" }}>
          <Sidebar tab={tab} setTab={setTab} tabs={tabs} summary={appData.SUMMARY}/>
          <div style={{ flex:1, minWidth:0, overflowY:"auto" }}>
            <div style={{ padding:"20px 28px 16px", position:"sticky", top:0, background:`${T.bg}ee`, backdropFilter:"blur(20px)", zIndex:10, borderBottom:`1px solid ${T.border}` }}>
              <h2 style={{ color:T.text, fontSize:20, fontWeight:800, margin:0 }}>{titles[tab]}</h2>
            </div>
            {/* ★ 핵심 수정: paddingTop을 8로 조정 */}
            <div style={{ paddingTop:8 }}>{renderTab()}</div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:768, margin:"0 auto", position:"relative" }}>
          {/* ★ FIX 2: ref 추가 → 헤더 높이를 ResizeObserver로 동적 측정 */}
          <div ref={headerRef} style={{ padding:"14px 18px", position:"sticky", top:0, background:`${T.bg}ee`, backdropFilter:"blur(20px)", zIndex:10, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <h1 style={{ color:T.text, fontSize:17, fontWeight:700, margin:0 }}>{titles[tab]}</h1>
              <p style={{ color:T.textDim, fontSize:9, margin:"1px 0 0" }}>SIMPSONYS FINANCE REPORT</p>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["overview", "assets", "qa"].map(id => {
                const t = tabs.find(x => x.id === id);
                return (
                  <button key={id} onClick={()=>setTab(id)} style={{ padding:"7px 10px", borderRadius:10, background:tab===id?T.accentDim:T.card, border:`1px solid ${tab===id?T.accent:T.border}`, color:tab===id?T.accent:T.textSec, fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                    <span>{t.icon}</span>{t.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* ★ FIX 2: paddingTop을 측정된 headerH 기반으로 동적 설정 / paddingBottom은 하단 탭바 높이 확보 */}
          <div style={{ paddingTop: headerH, paddingBottom: 80 }}>{renderTab()}</div>

          {/* ★ FIX 3: left/right 대신 left:50% + translateX(-50%) + maxWidth로 컨테이너와 정렬 맞춤 */}
          <div ref={tabBarRef} style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:768, background:`${T.bg}f8`, backdropFilter:"blur(20px)", borderTop:`1px solid ${T.border}`, display:"flex", padding:"6px 0 env(safe-area-inset-bottom,6px)", zIndex:20 }}>
            {tabs.filter(t => !["overview","assets", "qa"].includes(t.id)).map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, border:"none", background:"none" }}>
                <span style={{ fontSize:18, opacity:tab===t.id?1:0.3 }}>{t.icon}</span>
                <span style={{ fontSize:9, fontWeight:tab===t.id?700:400, color:tab===t.id?T.accent:T.textDim }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}