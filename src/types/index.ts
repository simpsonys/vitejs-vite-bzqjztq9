export interface Summary {
  principal: number;
  profit: number;
  evalTotal: number;
  returnPct: number;
  months: number;
  highReturnPct: number;
  fromHighPct: number;
  cumDividend: number;
  avgMonthlyProfit: number;
  cumCapGain: number;
}

export interface MonthlyData {
  date: string;
  principal: number;
  evalTotal: number;
  profit: number;
  principalChg: number;
  returnPct: number;
  cumDividend: number;
  capGain: number;
  assetTotal: number;
  invest: number;
  realEstate: number;
  tBond: number;
  deposit: number;
  pension: number;
  car: number;
  jeonse: number;
  accCard: number;
}

export interface Holding {
  country: string;
  code: string;
  name: string;
  type: string;
  qty: number;
  buyAmount: number;
  evalAmount: number;
  profit: number;
  returnPct: number;
  weight: number;
  originalRank?: number;
}

export interface DividendData {
  year: number;
  divIncome: number;
  capGain: number;
  totalReturn: number;
  cumDiv: number;
  cumTotal: number;
  yearEndPrincipal: number;
  yearEndEval: number;
  divGrowth: number;
}

export interface AppData {
  SUMMARY: Summary;
  MONTHLY: MonthlyData[];
  HOLDINGS: Holding[];
  DIVIDENDS: DividendData[];
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export type TabId = 'overview' | 'returns' | 'cumulative' | 'dividend' | 'monthly' | 'assets' | 'holdings' | 'qa';
