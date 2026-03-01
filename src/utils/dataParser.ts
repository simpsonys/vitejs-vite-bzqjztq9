import type { Summary, MonthlyData, Holding, DividendData } from '../types';
import { n } from './formatters';
import { parseDate } from './dateUtils';

export function parseMonthlyTSV(text: string): { SUMMARY: Summary; MONTHLY: MonthlyData[] } {
  const rows = text.split("\n").map(r => r.split("\t"));
  const header = rows[7] || [];
  const findIdx = (name: string) => header.findIndex(h => h.includes(name));
  
  const idxCumDiv = findIdx("누적 배당 수익");
  const idxTotal = findIdx("TOTAL");

  const r2 = rows[2] || [];
  const r3 = rows[3] || [];
  const r4 = rows[4] || [];

  const SUMMARY: Summary = {
    principal: n(r2[10]) * 1000,
    profit: n(r2[11]) * 1000,
    evalTotal: n(r2[12]) * 1000,
    returnPct: n(r2[13]) > 500 ? n(r2[13]) / 100 : n(r2[13]),
    months: n(r3[2]),
    highReturnPct: n(r3[4]) > 500 ? n(r3[4]) / 100 : n(r3[4]),
    fromHighPct: n(r3[6]),
    cumDividend: n(r3[11]) * 1000,
    avgMonthlyProfit: n(r4[2]) * 1000,
    cumCapGain: n(r4[11]) * 1000 || (n(r2[11]) * 1000 - n(r3[11]) * 1000)
  };

  const monthlyMap = new Map<string, MonthlyData>();
  let runningCumDiv = 0;
  let firstDividendFound = false;

  for (let i = 14; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 10) continue;

    let dIdx = -1;
    for (let j = 0; j < 4; j++) {
      if (parseDate(row[j])) {
        dIdx = j;
        break;
      }
    }
    if (dIdx === -1) continue;

    const date = parseDate(row[dIdx]);
    if (!date) continue;

    const principal = n(row[dIdx + 1]) * 1000;
    if (principal <= 0) continue;

    const rawVal = n(row[idxCumDiv !== -1 ? idxCumDiv : 58]) * 1000;
    if (rawVal > 0) {
      firstDividendFound = true;
      runningCumDiv = rawVal;
    }

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
      evalTotal: (n(row[dIdx + 2]) * 1000) || principal,
      profit: profit,
      principalChg: n(row[dIdx + 4]) * 1000,
      returnPct: rawReturn,
      cumDividend: curCumDiv,
      capGain: profit - curCumDiv,
      assetTotal: n(row[idxTotal !== -1 ? idxTotal : 53]) * 1000 || 0,
      invest: n(row[46]) * 1000 || 0,
      realEstate: n(row[56]) * 1000 || 0,
      tBond: n(row[54]) * 1000 || 0,
      deposit: n(row[45]) * 1000 || 0,
      pension: n(row[49]) * 1000 || 0,
      car: n(row[51]) * 1000 || 0,
      jeonse: n(row[52]) * 1000 || 0,
      accCard: n(row[55]) * 1000 || 0,
      dividend: n(row[57]) * 1000 || 0
    });
  }

  const MONTHLY = Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  
  // Fix: Use the last month's cumDividend as the summary value for stability
  if (MONTHLY.length > 0) {
    const lastMonth = MONTHLY[MONTHLY.length - 1];
    SUMMARY.cumDividend = lastMonth.cumDividend;
    SUMMARY.cumCapGain = lastMonth.capGain;
  }
  
  return { SUMMARY, MONTHLY };
}

export function parseHoldingsTSV(text: string): Holding[] {
  const rows = text.split("\n").map(r => r.split("\t"));
  const HOLDINGS: Holding[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;

    const name = (row[2] || "").trim();
    if (!name) continue;

    const evalAmount = n(row[6]);
    if (evalAmount <= 0) continue;

    HOLDINGS.push({
      country: (row[0] || "").trim(),
      code: (row[1] || "").trim(),
      name,
      type: (row[3] || "").trim(),
      qty: n(row[4]),
      buyAmount: n(row[5]),
      evalAmount,
      profit: n(row[7]),
      returnPct: n(row[8]),
      weight: n(row[9]),
    });
  }

  HOLDINGS.sort((a, b) => b.weight - a.weight);
  return HOLDINGS;
}

export function deriveDividends(monthly: MonthlyData[]): DividendData[] {
  if (!monthly || !monthly.length) return [];

  const byYear: Record<string, any> = {};

  monthly.forEach(d => {
    const yr = d.date.substring(0, 4);
    if (!byYear[yr]) {
      byYear[yr] = {
        monthlyDividends: [],
        cumDividends: [],
        lastProfit: 0,
        lastPrincipal: 0,
        lastEval: 0
      };
    }
    byYear[yr].monthlyDividends.push(0); // dividend field doesn't exist in MonthlyData
    byYear[yr].cumDividends.push(d.cumDividend || 0);
    byYear[yr].lastProfit = d.profit || 0;
    byYear[yr].lastPrincipal = d.principal || 0;
    byYear[yr].lastEval = d.evalTotal || 0;
  });

  let prevYearEndCumDiv = 0;
  let prevProfit = 0;
  const sortedYears = Object.keys(byYear).sort();

  const result = sortedYears.map(yr => {
    const v = byYear[yr];
    let divIncome = v.monthlyDividends.reduce((s: number, x: number) => s + x, 0);
    const yearEndCumDiv = Math.max(...v.cumDividends);
    if (divIncome <= 0 && yearEndCumDiv > prevYearEndCumDiv) {
      divIncome = yearEndCumDiv - prevYearEndCumDiv;
    }
    const totalReturn = v.lastProfit - prevProfit;
    const capGain = totalReturn - divIncome;

    const item: DividendData = {
      year: parseInt(yr),
      divIncome: Math.max(0, divIncome),
      capGain,
      totalReturn,
      cumDiv: yearEndCumDiv,
      cumTotal: v.lastProfit,
      yearEndPrincipal: v.lastPrincipal,
      yearEndEval: v.lastEval,
      divGrowth: 0
    };
    prevYearEndCumDiv = yearEndCumDiv;
    prevProfit = v.lastProfit;
    return item;
  });

  return result.map((d, i) => ({
    ...d,
    divGrowth: i === 0 || result[i - 1].divIncome === 0
      ? 0
      : +((d.divIncome / result[i - 1].divIncome - 1) * 100).toFixed(2),
  }));
}
