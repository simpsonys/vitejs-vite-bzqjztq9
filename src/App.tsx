// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import * as recharts from "recharts";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Import from refactored modules
import { T, SC, SHEET_URLS } from './constants';
import { fK, fF, fP, n, parseDate, parseMonthlyTSV, parseHoldingsTSV, deriveDividends } from './utils';

const {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
  ComposedChart, ReferenceLine, Line
} = recharts;

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

// 커스텀 툴팁 컴포넌트
function CT({ active, payload, label, fmt }) {
  if (active && payload && payload.length) {
    const tooltipStyle = {
      background: "rgba(15, 19, 24, 0.5)",
      border: "1px solid rgba(200, 200, 200, 0.3)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)"
    };

    return (
      <div style={tooltipStyle}>
        <p style={{ 
          color: "#FFFFFF",
          fontSize: 12, 
          margin: "0 0 6px",
          fontWeight: 700,
          textShadow: "0 1px 3px rgba(255,255,255,0.3)"
        }}>
          {label}
        </p>
        {payload.map((p, i) => (
          <p key={i} style={{ 
            color: p.color || "#FFFFFF",
            fontSize: 14, 
            margin: "4px 0", 
            fontWeight: 700,
            textShadow: "0 1px 3px rgba(255,255,255,0.3)"
          }}>
            {p.name}: <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>
              {fmt === "pct" ? fP(p.value) : fmt === "krw" ? fK(p.value) + "원" : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
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
  const isMobile  = bp === "mobile"; 
  const pad   = isDesktop ? "0 28px 48px" : "0 16px 100px";
  const chartH = isDesktop ? 340 : isWide ? 280 : 250;

  const [quickQuestion, setQuickQuestion] = useState("");
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [showMonthlyData, setShowMonthlyData] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'originalRank', direction: 'asc' });

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

  const stats = isMobile ? allStats.slice(2, 4) : allStats;

  const maxVal = Math.max(...MONTHLY.map(m => Math.max(m.principal, m.evalTotal, m.profit, 0)));
  const minVal = Math.min(...MONTHLY.map(m => Math.min(m.principal, m.evalTotal, m.profit, 0))); 
  const tickStep = maxVal > 1500000000 ? 200000000 : 100000000; 
  const yMin = Math.floor(minVal / tickStep) * tickStep;
  const yMax = Math.ceil(maxVal / tickStep) * tickStep;
  const yTicks = [];
  for (let i = yMin; i <= yMax; i += tickStep) yTicks.push(i);

  const holdingsWithRank = HOLDINGS.map((h, i) => ({ ...h, originalRank: i + 1 }));
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    else if (sortConfig.key !== key && (key === 'originalRank' || key === 'name' || key === 'type')) direction = 'asc';
    setSortConfig({ key, direction });
  };
  
  const sortedHoldings = [...holdingsWithRank].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'type') { aVal = a.country + a.type; bVal = b.country + b.type; }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, fontSize: 10, marginLeft: 4 }}>↕</span>;
    return <span style={{ color: T.accent, fontSize: 10, marginLeft: 4 }}>{sortConfig.direction === 'asc' ? "▲" : "▼"}</span>;
  };
  const thStyle = { cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1 };

  return (
    <div style={{ padding:pad }}>
      <div style={{ background:"linear-gradient(145deg,#131B26,#0E1319)", borderRadius:20, padding:isDesktop?"28px":"24px 20px", marginBottom:16, border:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:T.accentGlow, filter:"blur(40px)" }}/>
        <p style={{ color:T.textSec, fontSize:isDesktop?14:12, margin:"0 0 3px", fontWeight:500 }}>총 평가금액</p>
        <h2 
          style={{ color:T.text, fontSize:isDesktop?38:28, fontWeight:800, margin:"0 0 2px", letterSpacing:"-1px", fontFamily:"'IBM Plex Mono',monospace", cursor:"pointer" }}
          onClick={() => setShowMonthlyData(true)}
          title="월별 데이터 보기"
        >
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

      <div style={{ marginBottom: 16, padding: "6px 8px 6px 16px", background: T.surface, borderRadius: 12, border: `1px solid ${T.accent}50`, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
        <input 
          value={quickQuestion}
          onChange={(e) => setQuickQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="오늘 SPGI 주가 어때?"
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: T.text, fontSize: 16, outline: "none" }}
        />
        <button 
          onClick={() => quickQuestion.trim() && onAskAi && onAskAi(quickQuestion)}
          style={{ background: "transparent", border: "1px solid #5A6272", color: T.text, padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink: 0 }}
        >
          🚀
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isWide ? "repeat(4,1fr)" : "repeat(2,1fr)", gap:10, marginBottom:16 }}>
        {stats.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} color={s.color} sub={s.sub} isMobile={isMobile} />
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isDesktop?"1fr 1fr":"1fr", gap:16 }}>
        <div style={{ background:T.card, borderRadius:16, padding:"16px 6px 8px 0", border:`1px solid ${T.border}`, minWidth: 0, overflow: "hidden" }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.25)"/>
              <XAxis dataKey="date" tick={{fill:T.textSec,fontSize:10,fontWeight:600}} tickFormatter={v=>v.slice(2)} axisLine={false} tickLine={false} interval={Math.floor(MONTHLY.length/6)}/>
              <YAxis 
                tick={{fill:T.textSec,fontSize:10,fontWeight:600}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v=>fK(v)} 
                width={46} 
                domain={[yMin, yMax]} 
                ticks={yTicks} 
                interval={0}
              />
              <Tooltip content={<CT fmt="krw"/>}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="principal" name="투자원금" stroke={T.blue} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="evalTotal" name="평가총액" stroke={T.red} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="profit" name="수익금액" stroke={T.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
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
                  <div 
                    style={{ flex:1, minWidth:0, cursor:"pointer" }} 
                    onClick={() => setShowAllHoldings(true)}
                    title="전체 종목 보기"
                  >
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

      {/* ─────────────────────────────────────────────────────────────
          ★ 수정된 숨겨진 전체 종목 페이지 (풀스크린 모달 표) ★
         ───────────────────────────────────────────────────────────── */}
      {showAllHoldings && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: T.bg, zIndex: 99999,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <h2 style={{ color: T.text, fontSize: 18, margin: 0, fontWeight: 800 }}>💎 전체 보유 종목 ({HOLDINGS.length}개)</h2>
            <button 
              onClick={() => setShowAllHoldings(false)} 
              style={{ background: "transparent", border: "none", color: T.text, fontSize: 24, cursor: "pointer", padding: "0 8px" }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
            <div style={{ minWidth: 840 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('originalRank')} style={{ ...thStyle }}>순위{renderSortIcon('originalRank')}</th>
                    <th onClick={() => handleSort('name')} style={{ ...thStyle, textAlign: "center" }}>종목명{renderSortIcon('name')}</th>
                    <th onClick={() => handleSort('type')} style={{ ...thStyle }}>국가/분류{renderSortIcon('type')}</th>
                    <th onClick={() => handleSort('qty')} style={{ ...thStyle, textAlign: "right" }}>수량{renderSortIcon('qty')}</th>
                    <th onClick={() => handleSort('weight')} style={{ ...thStyle, textAlign: "right" }}>비중{renderSortIcon('weight')}</th>
                    <th onClick={() => handleSort('buyAmount')} style={{ ...thStyle, textAlign: "right" }}>매입금액{renderSortIcon('buyAmount')}</th>
                    <th onClick={() => handleSort('evalAmount')} style={{ ...thStyle, textAlign: "right" }}>평가금액{renderSortIcon('evalAmount')}</th>
                    <th onClick={() => handleSort('profit')} style={{ ...thStyle, textAlign: "right" }}>수익금액{renderSortIcon('profit')}</th>
                    <th onClick={() => handleSort('returnPct')} style={{ ...thStyle, textAlign: "right" }}>수익률{renderSortIcon('returnPct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((h, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}40` }}>
                      <td style={{ padding: "12px 8px", color: T.textSec, fontSize: 13, fontWeight: 700 }}>{h.originalRank}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 14, fontWeight: 600, textAlign: "center" }}>{h.name}</td>
                      <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 12 }}>{h.country} · {h.type}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{h.qty.toLocaleString()}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{h.weight.toFixed(1)}%</td>
                      <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(h.buyAmount)}원</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(h.evalAmount)}원</td>
                      <td style={{ padding: "12px 8px", color: h.profit >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>
                        {fK(h.profit)}원
                      </td>
                      <td style={{ padding: "12px 8px", color: h.returnPct >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>
                        {fP(h.returnPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 월별 데이터 모달 */}
      {showMonthlyData && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: T.bg, zIndex: 99999,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <h2 style={{ color: T.text, fontSize: 18, margin: 0, fontWeight: 800 }}>📊 월별 데이터</h2>
            <button 
              onClick={() => setShowMonthlyData(false)} 
              style={{ background: "transparent", border: "none", color: T.text, fontSize: 24, cursor: "pointer", padding: "0 8px" }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
            <div style={{ minWidth: 1000 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1 }}>Date</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>투자원금</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>평가총액</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수익금액</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>원금증감</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수익증감</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수익률</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>CD</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>채권</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>배당수익</th>
                    <th style={{ padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>누적배당</th>
                  </tr>
                </thead>
                <tbody>
                  {[...MONTHLY].reverse().map((m, i, arr) => {
                    const prev = arr[i + 1];
                    const profitChange = prev ? m.profit - prev.profit : 0;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}40` }}>
                        <td style={{ padding: "12px 8px", color: T.textSec, fontSize: 13, fontWeight: 600 }}>{m.date}</td>
                        <td style={{ padding: "12px 8px", color: T.blue, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.principal)}원</td>
                        <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.evalTotal)}원</td>
                        <td style={{ padding: "12px 8px", color: m.profit >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.profit)}원</td>
                        <td style={{ padding: "12px 8px", color: m.principalChg >= 0 ? T.cyan : T.red, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{m.principalChg >= 0 ? "+" : ""}{fK(m.principalChg)}원</td>
                        <td style={{ padding: "12px 8px", color: profitChange >= 0 ? T.accent : T.red, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{profitChange >= 0 ? "+" : ""}{fK(profitChange)}원</td>
                        <td style={{ padding: "12px 8px", color: m.returnPct >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fP(m.returnPct)}</td>
                        <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.deposit)}원</td>
                        <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.tBond)}원</td>
                        <td style={{ padding: "12px 8px", color: T.orange, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.dividend)}원</td>
                        <td style={{ padding: "12px 8px", color: T.orange, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(m.cumDividend)}원</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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

      <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}`, marginBottom:16 }}>
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

      <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}` }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 12px" }}>월별 누적 수익률</p>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ padding:"8px 4px", textAlign:"left", color:T.textDim, borderBottom:`1px solid ${T.border}`, position:"sticky", left:0, background:T.card, zIndex:1 }}>연도</th>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                  <th key={m} style={{ padding:"8px 4px", textAlign:"right", color:T.textDim, borderBottom:`1px solid ${T.border}`, minWidth:60 }}>{m}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byYear = {};
                MONTHLY.forEach(d => {
                  const [year, month] = d.date.split("-");
                  if (!byYear[year]) byYear[year] = {};
                  byYear[year][month] = d.returnPct;
                });
                return Object.keys(byYear).sort().reverse().map(year => (
                  <tr key={year}>
                    <td style={{ padding:"8px 4px", color:T.text, fontWeight:600, borderBottom:`1px solid ${T.border}40`, position:"sticky", left:0, background:T.card, zIndex:1 }}>{year}</td>
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(month => {
                      const val = byYear[year][month];
                      return (
                        <td key={month} style={{ 
                          padding:"8px 4px", 
                          textAlign:"right", 
                          color: val === undefined ? T.textDim : val >= 0 ? T.accent : T.red,
                          fontWeight: val === undefined ? 400 : 600,
                          fontFamily: val === undefined ? "inherit" : "'IBM Plex Mono',monospace",
                          borderBottom:`1px solid ${T.border}40`
                        }}>
                          {val === undefined ? "-" : fP(val)}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
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

      <div style={{ background:T.card, borderRadius:16, padding:16, border:`1px solid ${T.border}`, marginBottom:16 }}>
        <p style={{ color:T.text, fontSize:13, fontWeight:700, margin:"0 0 12px" }}>월별 누적 수익률</p>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                <th style={{ padding:"8px 4px", textAlign:"left", color:T.textDim, borderBottom:`1px solid ${T.border}`, position:"sticky", left:0, background:T.card, zIndex:1 }}>연도</th>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                  <th key={m} style={{ padding:"8px 4px", textAlign:"right", color:T.textDim, borderBottom:`1px solid ${T.border}`, minWidth:60 }}>{m}월</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const byYear = {};
                MONTHLY.forEach(d => {
                  const [year, month] = d.date.split("-");
                  if (!byYear[year]) byYear[year] = {};
                  byYear[year][month] = d.returnPct;
                });
                return Object.keys(byYear).sort().reverse().map(year => (
                  <tr key={year}>
                    <td style={{ padding:"8px 4px", color:T.text, fontWeight:600, borderBottom:`1px solid ${T.border}40`, position:"sticky", left:0, background:T.card, zIndex:1 }}>{year}</td>
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(month => {
                      const val = byYear[year][month];
                      return (
                        <td key={month} style={{ 
                          padding:"8px 4px", 
                          textAlign:"right", 
                          color: val === undefined ? T.textDim : val >= 0 ? T.accent : T.red,
                          fontWeight: val === undefined ? 400 : 600,
                          fontFamily: val === undefined ? "inherit" : "'IBM Plex Mono',monospace",
                          borderBottom:`1px solid ${T.border}40`
                        }}>
                          {val === undefined ? "-" : fP(val)}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
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
  const { SUMMARY, DIVIDENDS, MONTHLY } = data;
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

      {/* 월별 배당 테이블 */}
      <div style={{ background:T.card, borderRadius:16, overflow:"hidden", border:`1px solid ${T.border}`, marginTop:16 }}>
        <div style={{ padding:"16px", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          <p style={{ color:T.text, fontSize:14, fontWeight:700, margin:0 }}>월별 배당 내역</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr", background:T.surface, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
            {["월","배당 수익","누적 배당","수익률"].map((h, i) => (
              <span key={`mh1-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
            ))}
          </div>
          {isWide && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px" }}>
              {["월","배당 수익","누적 배당","수익률"].map((h, i) => (
                <span key={`mh2-${i}`} style={{ color:T.textDim, fontSize:10, fontWeight:600, textAlign:"center" }}>{h}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:isWide?"repeat(2,1fr)":"1fr" }}>
          {[...MONTHLY].reverse().map((m, i, arr) => {
            const prev = arr[i + 1];
            const monthlyDiv = prev ? m.cumDividend - prev.cumDividend : 0;
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", padding:"10px 14px", borderBottom:`1px solid ${T.border}`, alignItems:"center" }}>
                <span style={{ color:T.textSec, fontSize:12, textAlign:"center" }}>{m.date}</span>
                <span style={{ color:T.orange, fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(monthlyDiv)}</span>
                <span style={{ color:T.orange, fontSize:12, fontWeight:600, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fK(m.cumDividend)}</span>
                <span style={{ color:m.returnPct>=0?T.accent:T.red, fontSize:12, fontWeight:700, textAlign:"center", fontFamily:"'IBM Plex Mono',monospace" }}>{fP(m.returnPct)}</span>
              </div>
            );
          })}
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
                  <div style={{ background:"rgba(15, 19, 24, 0.5)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(200, 200, 200, 0.3)", backdropFilter:"blur(12px)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
                    <p style={{ color:d.fill || "#FFFFFF", fontSize:13, fontWeight:700, margin:"0 0 6px", textShadow:"0 1px 3px rgba(255,255,255,0.3)" }}>{d.name}</p>
                    <p style={{ color:d.fill || "#FFFFFF", fontSize:12, margin:0, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, textShadow:"0 1px 3px rgba(255,255,255,0.3)" }}>{pct}% · ₩{fK(d.value)}원</p>
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
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'originalRank', direction: 'asc' });
  
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
                const idx = top12.findIndex(h => h.name === d.name);
                const color = SC[idx % SC.length];
                return (
                  <div style={{ background:"rgba(15, 19, 24, 0.5)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(200, 200, 200, 0.3)", backdropFilter:"blur(12px)", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
                    <p style={{ color:color || "#FFFFFF", fontSize:13, fontWeight:700, margin:"0 0 6px", textShadow:"0 1px 3px rgba(255,255,255,0.3)" }}>{d.name}</p>
                    <p style={{ color:color || "#FFFFFF", fontSize:12, margin:0, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, textShadow:"0 1px 3px rgba(255,255,255,0.3)" }}>{d.weight.toFixed(1)}% · ₩{fK(d.evalAmount)}원</p>
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
        <button onClick={() => setShowAllHoldings(true)} style={{ padding:"5px 10px", borderRadius:6, border:`1px solid ${T.borderActive}`, background:T.accentDim, color:T.accent, fontSize:10, fontWeight:600, cursor:"pointer", marginLeft:"auto" }}>
          전체 종목 보기 ({HOLDINGS.length})
        </button>
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

      {/* 전체 종목 팝업 */}
      {showAllHoldings && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: T.bg, zIndex: 99999,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <h2 style={{ color: T.text, fontSize: 18, margin: 0, fontWeight: 800 }}>💎 전체 보유 종목 ({HOLDINGS.length}개)</h2>
            <button 
              onClick={() => setShowAllHoldings(false)} 
              style={{ background: "transparent", border: "none", color: T.text, fontSize: 24, cursor: "pointer", padding: "0 8px" }}
            >
              ✕
            </button>
          </div>
          <div onDoubleClick={() => setShowAllHoldings(false)} style={{ flex: 1, overflow: "auto", padding: "16px" }}>
            <div style={{ minWidth: 840 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th onClick={() => { setSortConfig({ key: 'originalRank', direction: sortConfig.key === 'originalRank' && sortConfig.direction === 'asc' ? 'desc' : 'asc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1 }}>순위</th>
                    <th onClick={() => { setSortConfig({ key: 'name', direction: sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "center" }}>종목명</th>
                    <th onClick={() => { setSortConfig({ key: 'type', direction: sortConfig.key === 'type' && sortConfig.direction === 'asc' ? 'desc' : 'asc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1 }}>국가/분류</th>
                    <th onClick={() => { setSortConfig({ key: 'qty', direction: sortConfig.key === 'qty' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수량</th>
                    <th onClick={() => { setSortConfig({ key: 'weight', direction: sortConfig.key === 'weight' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>비중</th>
                    <th onClick={() => { setSortConfig({ key: 'buyAmount', direction: sortConfig.key === 'buyAmount' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>매입금액</th>
                    <th onClick={() => { setSortConfig({ key: 'evalAmount', direction: sortConfig.key === 'evalAmount' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>평가금액</th>
                    <th onClick={() => { setSortConfig({ key: 'profit', direction: sortConfig.key === 'profit' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수익금액</th>
                    <th onClick={() => { setSortConfig({ key: 'returnPct', direction: sortConfig.key === 'returnPct' && sortConfig.direction === 'desc' ? 'asc' : 'desc' }); }} style={{ cursor: "pointer", userSelect: "none", padding: "12px 8px", color: T.textDim, borderBottom: `2px solid ${T.border}`, position: "sticky", top: 0, background: T.bg, fontSize: 13, zIndex: 1, textAlign: "right" }}>수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {HOLDINGS.map((h, i) => ({ ...h, originalRank: i + 1 })).sort((a, b) => {
                    let aVal = a[sortConfig.key];
                    let bVal = b[sortConfig.key];
                    if (sortConfig.key === 'type') { aVal = a.country + a.type; bVal = b.country + b.type; }
                    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                  }).map((h, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}40` }}>
                      <td style={{ padding: "12px 8px", color: T.textSec, fontSize: 13, fontWeight: 700 }}>{h.originalRank}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 14, fontWeight: 600, textAlign: "center" }}>{h.name}</td>
                      <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 12 }}>{h.country} · {h.type}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{h.qty.toLocaleString()}</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{h.weight.toFixed(1)}%</td>
                      <td style={{ padding: "12px 8px", color: T.textDim, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(h.buyAmount)}원</td>
                      <td style={{ padding: "12px 8px", color: T.text, fontSize: 13, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>{fK(h.evalAmount)}원</td>
                      <td style={{ padding: "12px 8px", color: h.profit >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>
                        {fK(h.profit)}원
                      </td>
                      <td style={{ padding: "12px 8px", color: h.returnPct >= 0 ? T.accent : T.red, fontSize: 13, fontWeight: 700, fontFamily:"'IBM Plex Mono',monospace", textAlign: "right" }}>
                        {fP(h.returnPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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

  const baseFontSize = isDesktop ? 15 : 17; 
  const titleFontSize = isDesktop ? "18px" : "20px";

  const [messages, setMessages] = useState([
    { role: "model", text: "안녕하세요! SimpsonYS님의 전체 자산 현황이나 특정 종목에 대해 무엇이든 물어보세요. 🤖" }
  ]);
  
  const [loading, setLoading] = useState(false);
  const hasAutoSent = useRef(false);
  
  // ★ 추가된 부분 1: 스크롤 위치를 기억할 '닻(Ref)' 만들기
  const messagesEndRef = useRef(null); 

  // ★ 추가된 부분 2: 글자가 타이핑될 때마다(messages가 변할 때마다) 화면을 맨 아래로 끌어내리기
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" }); 
    }
  }, [messages]);

  const handleSend = async (overrideInput) => {
    const textToSend = typeof overrideInput === "string" ? overrideInput : input;
    if (!textToSend || !textToSend.trim() || loading) return;

    setMessages(prev => [
      ...prev, 
      { role: "user", text: textToSend },
      { role: "model", text: "" } 
    ]);
    setInput("");
    setLoading(true);

    const currentSummary = {
      eval: Math.round(SUMMARY.evalTotal / 10000),
      prin: Math.round(SUMMARY.principal / 10000),
      div: Math.round(SUMMARY.cumDividend / 10000)
    };

    const latest = MONTHLY[MONTHLY.length - 1] || {};
    const assetBreakdown = {
      총순자산: Math.round((latest.assetTotal || 0) / 10000),
      투자_자산: Math.round((latest.invest || 0) / 10000),
      부동산_순가치_자산: Math.round((latest.realEstate || 0) / 10000),
      거주전세보증금_자산: Math.round((latest.jeonse || 0) / 10000),
      T채권_자산: Math.round((latest.tBond || 0) / 10000),
      예적금_자산: Math.round((latest.deposit || 0) / 10000),
      계좌카드현금_자산: Math.round((latest.accCard || 0) / 10000),
      연금_자산: Math.round((latest.pension || 0) / 10000),
      자동차_자산: Math.round((latest.car || 0) / 10000)
    };

    const historyData = MONTHLY.map(m => 
      `${m.date.replace('20', '')}: ${Math.round(m.principal / 10000)}/${Math.round(m.evalTotal / 10000)}`
    );

    const holdingsData = HOLDINGS.map(h => 
      `${h.name}: ${Math.round(h.evalAmount / 10000)}/${h.returnPct.toFixed(1)}%`
    );

    const systemPrompt = `
You are a Senior Quantitative Investment Analyst briefing your client, SimpsonYS. 
Your tone must be cold, objective, and purely data-driven. Respond professionally in Korean.

# CLIENT CONTEXT & GOALS
- Target: Retire in Dec 2030 with Net Worth 5B KRW (Realistic: 2-3B KRW).
- Income & Tax [CRITICAL]: Samsung Part Leader (>150M KRW income). 38% Marginal Tax Bracket. Keep Financial Income < 20M KRW.
- Family & Real Estate: 1 Wife, 2 Daughters. Keep Sadang (73㎡), Sell Pyeongtaek (79㎡) in 2028.
- Annual Additional Investment: Exactly 10,000,000 KRW (1,000만 원). DO NOT assume 40M.

# ACCOUNTING & LIQUIDITY RULES [CRITICAL]
1. ZERO DEBT IN BREAKDOWN: ALL items in the [Asset Breakdown] are pure ASSETS (자산).
2. Real Estate (부동산_순가치_자산): NET EQUITY (Total Value - Jeonse Liability).
3. Jeonse Deposit (거주전세보증금_자산): Asset (money to be returned to the client).
4. Liquidity Event (2026-2027): Jan '27 Jeonse Return to the tenant means moving liquidity (Cash/Bonds) INTO Real Estate. (Flow: Investment -> Real Estate). In 2028, selling Pyeongtaek reverses this (Real Estate -> Investment).

# PORTFOLIO DATA (All currency values are in '만원' - 10,000 KRW)
1. [Current Status] 
- Principal: ${currentSummary.prin}만원
- Total Evaluation: ${currentSummary.eval}만원

2. [Asset Breakdown (Total Wealth)]
${JSON.stringify(assetBreakdown)}

3. [Monthly History] (Format: YY-MM: Principal/Evaluation, where YY is 20YY, e.g., 25-01 = 2025-01)
${JSON.stringify(historyData)}

4. [All Holdings]
${JSON.stringify(holdingsData)}

# RULES
- Tone: Cold and Data-driven.
- FORMATTING [CRITICAL]: Use Markdown lists, headers, line breaks (\\n), and tables. DO NOT include memo headers (TO, FROM, DATE).
- Number Formatting: Always format numbers naturally in Korean (e.g., 32000만원 -> 3억 2,000만원).
    `;

    const MODEL_NAME = "gemini-2.5-pro"; 
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
      const chatHistory = messages
        .filter(m => !m.text.includes("안녕하세요") && m.text !== "")
        .map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      
      chatHistory.push({ role: "user", parts: [{ text: textToSend }] });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: chatHistory, 
          tools: [{ googleSearch: {} }] 
        })
      });

      if (!response.ok) throw new Error("API 연결 에러");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let currentResponse = ""; 
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;
            
            try {
              const data = JSON.parse(dataStr);
              const textPiece = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              
              if (textPiece) {
                 currentResponse += textPiece; 
                 setMessages(prev => {
                    const newMsg = [...prev];
                    newMsg[newMsg.length - 1].text = currentResponse.replace(/\*\*/g, ""); 
                    return newMsg;
                 });
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const newMsg = [...prev];
        newMsg[newMsg.length - 1].text = `시스템 알림: ${error.message}`;
        return newMsg;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (input && input.trim() !== "" && !hasAutoSent.current) {
      hasAutoSent.current = true;
      handleSend();
    }
  }, []);

  return (
    <div style={
      isDesktop
        ? { padding: pad, display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: T.bg }
        : { position: "fixed", top: headerH, left: 0, right: 0, bottom: tabBarH, display: "flex", flexDirection: "column", background: T.bg, zIndex: 5 }
    }>
      <div style={{ background: T.card, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: isDesktop ? `1px solid ${T.border}` : "none", borderRadius: isDesktop ? 16 : 0 }}>
        
        {/* 스크롤이 생기는 메인 채팅 영역 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: "flex-start", width: "100%" }}>
              <div style={{ 
                color: m.role === "user" ? T.accent : T.text, 
                padding: m.role === "user" ? "10px 0" : "0",
                fontSize: baseFontSize,
                lineHeight: 1.6, 
                textAlign: "left",
                borderBottom: m.role === "user" ? `1px dashed ${T.border}` : "none",
                marginBottom: m.role === "user" ? 10 : 0
              }}>
                {m.role === "user" ? (
                  `💬 SimpsonYS: ${m.text}`
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p style={{ marginBottom: "16px", lineHeight: "1.7", fontSize: `${baseFontSize}px` }} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ marginTop: "30px", marginBottom: "14px", fontSize: titleFontSize, fontWeight: "bold", color: T.text }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ paddingLeft: "24px", marginBottom: "16px", listStyleType: "disc" }} {...props} />,
                      li: ({node, ...props}) => <li style={{ marginBottom: "10px", lineHeight: "1.7", fontSize: `${baseFontSize}px` }} {...props} />,
                      strong: ({node, ...props}) => <strong style={{ fontWeight: "800", color: T.accent }} {...props} />,
                      table: ({node, ...props}) => <div style={{ overflowX: "auto", margin: "16px 0", borderRadius: 8, border: `1px solid ${T.border}` }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: `${baseFontSize - 1}px` }} {...props} /></div>,
                      th: ({node, ...props}) => <th style={{ borderBottom: `2px solid ${T.border}`, padding: "12px 14px", color: T.text, fontWeight: 800, background: T.surface }} {...props} />,
                      td: ({node, ...props}) => <td style={{ borderBottom: `1px solid ${T.border}`, padding: "12px 14px", color: T.textDim }} {...props} />
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ color: T.textDim, fontSize: baseFontSize - 2, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
              데이터 분석 중... 
              <span style={{ display: "inline-block", animation: "spin 2s linear infinite" }}>⏳</span>
            </div>
          )}
          
          {/* ★ 추가된 부분 3: 맨 아래에 위치한 '투명한 닻' */}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "12px 16px", background: T.surface, borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, paddingBottom: isDesktop ? 12 : "calc(12px + env(safe-area-inset-bottom))" }}>
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="질문을 입력하세요..."
            style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "12px 14px", borderRadius: 10, outline: "none", fontSize: baseFontSize }} 
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            style={{ background: "transparent", color: "#000", border: "1px solid #5A6272", padding: "0 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.5 : 1, fontSize: baseFontSize - 1 }} 
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

  // 1. 실제 탭 상태를 저장하는 변수 (이름을 살짝 바꿨습니다)
  const [tab, setTabState] = useState("overview");

  // 2. 탭을 변경할 때 브라우저 방문 기록(History)에 발자국을 남기는 함수
  // (기존 코드들이 setTab을 그대로 쓸 수 있도록 함수 이름을 setTab으로 맞췄습니다)
  const setTab = (newTab) => {
    if (tab === newTab) return;
    // URL 뒤에 ?tab=이름 을 붙여서 브라우저가 이동한 것으로 착각하게 만듭니다.
    window.history.pushState({ tab: newTab }, "", `?tab=${newTab}`);
    setTabState(newTab);
  };

  // 3. 안드로이드 '물리 뒤로가기' 버튼 감지기
  useEffect(() => {
    // 앱을 처음 켰을 때(초기화), 현재 위치를 방문 기록에 등록해 둡니다.
    window.history.replaceState({ tab: "overview" }, "", "?tab=overview");

    // 뒤로가기 버튼이 눌렸을 때(popstate 이벤트) 실행될 함수
    const handlePopState = (e) => {
      if (e.state && e.state.tab) {
        // 방문 기록에 남아있는 이전 탭 이름으로 화면을 바꿉니다.
        setTabState(e.state.tab);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
        @keyframes spin{to{transform:rotate(360deg)}}
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
              <p style={{ color:T.textDim, fontSize:9, margin:"1px 0 0" }}>
                SIMPSONYS FINANCE REPORT (v{__BUILD_VERSION__})
              </p>
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