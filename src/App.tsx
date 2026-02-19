// @ts-nocheck
import { useState } from 'react';
import * as recharts from 'recharts';

const {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
} = recharts;

const T = {
  bg: '#080B10',
  surface: '#0F1318',
  card: '#131820',
  accent: '#00E676',
  accentDim: 'rgba(0,230,118,0.12)',
  accentGlow: 'rgba(0,230,118,0.05)',
  red: '#FF5252',
  redDim: 'rgba(255,82,82,0.12)',
  orange: '#FFB74D',
  blue: '#42A5F5',
  purple: '#CE93D8',
  cyan: '#4DD0E1',
  yellow: '#FFD740',
  text: '#ECF0F6',
  textSec: '#8A94A6',
  textDim: '#4A5268',
  border: 'rgba(255,255,255,0.04)',
  borderActive: 'rgba(0,230,118,0.25)',
};

const SC = [
  '#42A5F5',
  '#FF7043',
  '#66BB6A',
  '#FFD740',
  '#CE93D8',
  '#4DD0E1',
  '#FF8A65',
  '#AED581',
  '#FFF176',
  '#BA68C8',
  '#4FC3F7',
  '#FF5252',
  '#81C784',
  '#FFB74D',
  '#9575CD',
  '#26C6DA',
  '#EF5350',
  '#A5D6A7',
  '#FFC107',
  '#7E57C2',
  '#F06292',
  '#80CBC4',
  '#DCE775',
  '#B39DDB',
  '#4DB6AC',
  '#E57373',
  '#64B5F6',
  '#AED581',
  '#FFB74D',
  '#90A4AE',
];

const SUMMARY = {
  principal: 321630293,
  profit: 348612903,
  evalTotal: 670243196,
  returnPct: 108.39,
  months: 72.5,
  highReturnPct: 111.55,
  fromHighPct: -3.16,
  avgMonthlyProfit: 4808453,
  highProfit: 348612903,
  cumDividend: 58251931,
  cumCapGain: 290360972,
};
const MONTHLY = [
  {
    date: '2019-07',
    principal: 3000000,
    evalTotal: 3000000,
    profit: 0,
    principalChg: 3000000,
    profitChg: 0,
    returnPct: 0,
    dividend: 0,
    cumDividend: 0,
  },
  {
    date: '2020-01',
    principal: 3000000,
    evalTotal: 2684127,
    profit: -315873,
    principalChg: 0,
    profitChg: -315873,
    returnPct: -10.53,
    dividend: 0,
    cumDividend: 0,
  },
  {
    date: '2020-02',
    principal: 3000000,
    evalTotal: 2308300,
    profit: -691700,
    principalChg: 0,
    profitChg: -375827,
    returnPct: -23.06,
    dividend: 0,
    cumDividend: 0,
  },
  {
    date: '2020-03',
    principal: 3000000,
    evalTotal: 2057104,
    profit: -942896,
    principalChg: 0,
    profitChg: -251196,
    returnPct: -31.43,
    dividend: 0,
    cumDividend: 0,
  },
  {
    date: '2020-04',
    principal: 24500000,
    evalTotal: 25813679,
    profit: 1313679,
    principalChg: 21500000,
    profitChg: 2256575,
    returnPct: 5.36,
    dividend: 22569,
    cumDividend: 22569,
  },
  {
    date: '2020-05',
    principal: 46000000,
    evalTotal: 51040987,
    profit: 5040987,
    principalChg: 21500000,
    profitChg: 3727308,
    returnPct: 10.96,
    dividend: 207401,
    cumDividend: 229970,
  },
  {
    date: '2020-06',
    principal: 50500000,
    evalTotal: 55247192,
    profit: 4747192,
    principalChg: 4500000,
    profitChg: -293795,
    returnPct: 9.4,
    dividend: 230681,
    cumDividend: 460651,
  },
  {
    date: '2020-07',
    principal: 53500000,
    evalTotal: 59016740,
    profit: 5516740,
    principalChg: 3000000,
    profitChg: 769548,
    returnPct: 10.31,
    dividend: 421760,
    cumDividend: 882411,
  },
  {
    date: '2020-08',
    principal: 53500000,
    evalTotal: 62312159,
    profit: 8812159,
    principalChg: 0,
    profitChg: 3295419,
    returnPct: 16.47,
    dividend: 403321,
    cumDividend: 1285732,
  },
  {
    date: '2020-09',
    principal: 54500000,
    evalTotal: 60145970,
    profit: 5645970,
    principalChg: 1000000,
    profitChg: -3166189,
    returnPct: 10.36,
    dividend: 203295,
    cumDividend: 1489027,
  },
  {
    date: '2020-10',
    principal: 56500000,
    evalTotal: 58000912,
    profit: 1500912,
    principalChg: 2000000,
    profitChg: -4145058,
    returnPct: 2.66,
    dividend: 282027,
    cumDividend: 1771054,
  },
  {
    date: '2020-11',
    principal: 57000000,
    evalTotal: 67030453,
    profit: 10030453,
    principalChg: 500000,
    profitChg: 8529541,
    returnPct: 17.6,
    dividend: 268281,
    cumDividend: 2039335,
  },
  {
    date: '2020-12',
    principal: 57000000,
    evalTotal: 68064340,
    profit: 11064340,
    principalChg: 0,
    profitChg: 1033887,
    returnPct: 19.41,
    dividend: 771573,
    cumDividend: 2810908,
  },
  {
    date: '2021-01',
    principal: 63000000,
    evalTotal: 76041208,
    profit: 13041208,
    principalChg: 6000000,
    profitChg: 1976868,
    returnPct: 20.7,
    dividend: 317822,
    cumDividend: 3128730,
  },
  {
    date: '2021-02',
    principal: 71500000,
    evalTotal: 89541072,
    profit: 18041072,
    principalChg: 8500000,
    profitChg: 4999864,
    returnPct: 25.23,
    dividend: 332835,
    cumDividend: 3461565,
  },
  {
    date: '2021-03',
    principal: 76821500,
    evalTotal: 100961659,
    profit: 24140159,
    principalChg: 5321500,
    profitChg: 6099087,
    returnPct: 31.42,
    dividend: 394633,
    cumDividend: 3856198,
  },
  {
    date: '2021-04',
    principal: 77685500,
    evalTotal: 104336659,
    profit: 26651159,
    principalChg: 864000,
    profitChg: 2511000,
    returnPct: 34.31,
    dividend: 788747,
    cumDividend: 4644945,
  },
  {
    date: '2021-05',
    principal: 81701000,
    evalTotal: 110659764,
    profit: 28958764,
    principalChg: 4015500,
    profitChg: 2307605,
    returnPct: 35.44,
    dividend: 386290,
    cumDividend: 5031235,
  },
  {
    date: '2021-06',
    principal: 81745000,
    evalTotal: 116567619,
    profit: 34822619,
    principalChg: 44000,
    profitChg: 5863855,
    returnPct: 42.6,
    dividend: 871280,
    cumDividend: 5902515,
  },
  {
    date: '2021-07',
    principal: 81905000,
    evalTotal: 116193008,
    profit: 34288008,
    principalChg: 160000,
    profitChg: -534611,
    returnPct: 41.86,
    dividend: 368227,
    cumDividend: 6270742,
  },
  {
    date: '2021-08',
    principal: 82594104,
    evalTotal: 122488874,
    profit: 39894770,
    principalChg: 689104,
    profitChg: 5606762,
    returnPct: 48.3,
    dividend: 589791,
    cumDividend: 6860533,
  },
  {
    date: '2021-09',
    principal: 82619604,
    evalTotal: 123071259,
    profit: 40451655,
    principalChg: 25500,
    profitChg: 556885,
    returnPct: 48.96,
    dividend: 296857,
    cumDividend: 7157390,
  },
  {
    date: '2021-10',
    principal: 149174962,
    evalTotal: 217559570,
    profit: 68384608,
    principalChg: 66555358,
    profitChg: 27932953,
    returnPct: 45.84,
    dividend: 456821,
    cumDividend: 7614211,
  },
  {
    date: '2021-11',
    principal: 149474961,
    evalTotal: 220069023,
    profit: 70594062,
    principalChg: 299999,
    profitChg: 2209454,
    returnPct: 47.23,
    dividend: 617477,
    cumDividend: 8231688,
  },
  {
    date: '2021-12',
    principal: 196659774,
    evalTotal: 268920570,
    profit: 72260796,
    principalChg: 47184813,
    profitChg: 1666734,
    returnPct: 36.74,
    dividend: 1026857,
    cumDividend: 9258545,
  },
  {
    date: '2022-01',
    principal: 205025294,
    evalTotal: 262272846,
    profit: 57247552,
    principalChg: 8365520,
    profitChg: -15013244,
    returnPct: 27.92,
    dividend: 673084,
    cumDividend: 9931629,
  },
  {
    date: '2022-02',
    principal: 225075814,
    evalTotal: 282365870,
    profit: 57290056,
    principalChg: 20050520,
    profitChg: 42504,
    returnPct: 25.45,
    dividend: 653705,
    cumDividend: 10585334,
  },
  {
    date: '2022-03',
    principal: 237587334,
    evalTotal: 307319744,
    profit: 69732410,
    principalChg: 12511520,
    profitChg: 12442354,
    returnPct: 29.35,
    dividend: 519669,
    cumDividend: 11105003,
  },
  {
    date: '2022-04',
    principal: 248827607,
    evalTotal: 311027514,
    profit: 62199907,
    principalChg: 11240273,
    profitChg: -7532503,
    returnPct: 25.0,
    dividend: 2508403,
    cumDividend: 13613406,
  },
  {
    date: '2022-05',
    principal: 254616127,
    evalTotal: 311762496,
    profit: 57146369,
    principalChg: 5788520,
    profitChg: -5053538,
    returnPct: 22.44,
    dividend: 658996,
    cumDividend: 14272402,
  },
  {
    date: '2022-06',
    principal: 259104647,
    evalTotal: 301049989,
    profit: 41945342,
    principalChg: 4488520,
    profitChg: -15201027,
    returnPct: 16.19,
    dividend: 1054624,
    cumDividend: 15327026,
  },
  {
    date: '2022-07',
    principal: 261091570,
    evalTotal: 322818744,
    profit: 61727174,
    principalChg: 1986923,
    profitChg: 19781832,
    returnPct: 23.64,
    dividend: 579911,
    cumDividend: 15906937,
  },
  {
    date: '2022-08',
    principal: 261584410,
    evalTotal: 325277168,
    profit: 63692758,
    principalChg: 492840,
    profitChg: 1965584,
    returnPct: 24.35,
    dividend: 663057,
    cumDividend: 16569994,
  },
  {
    date: '2022-09',
    principal: 264577250,
    evalTotal: 298454082,
    profit: 33876832,
    principalChg: 2992840,
    profitChg: -29815926,
    returnPct: 12.8,
    dividend: 588683,
    cumDividend: 17158677,
  },
  {
    date: '2022-10',
    principal: 266070090,
    evalTotal: 311987067,
    profit: 45916977,
    principalChg: 1492840,
    profitChg: 12040145,
    returnPct: 17.26,
    dividend: 556349,
    cumDividend: 17715026,
  },
  {
    date: '2022-11',
    principal: 266535852,
    evalTotal: 312928285,
    profit: 46392433,
    principalChg: 465762,
    profitChg: 475456,
    returnPct: 17.41,
    dividend: 513750,
    cumDividend: 18228776,
  },
  {
    date: '2022-12',
    principal: 267228692,
    evalTotal: 290539068,
    profit: 23310376,
    principalChg: 692840,
    profitChg: -23082057,
    returnPct: 8.72,
    dividend: 1509529,
    cumDividend: 19738305,
  },
  {
    date: '2023-01',
    principal: 267721532,
    evalTotal: 309679181,
    profit: 41957649,
    principalChg: 492840,
    profitChg: 18647273,
    returnPct: 15.67,
    dividend: 481592,
    cumDividend: 20219897,
  },
  {
    date: '2023-02',
    principal: 268214372,
    evalTotal: 314715899,
    profit: 46501527,
    principalChg: 492840,
    profitChg: 4543878,
    returnPct: 17.34,
    dividend: 619028,
    cumDividend: 20838925,
  },
  {
    date: '2023-03',
    principal: 268707212,
    evalTotal: 315195070,
    profit: 46487858,
    principalChg: 492840,
    profitChg: -13669,
    returnPct: 17.3,
    dividend: 666929,
    cumDividend: 21505854,
  },
  {
    date: '2023-04',
    principal: 268562329,
    evalTotal: 327607853,
    profit: 59045524,
    principalChg: -144883,
    profitChg: 12557666,
    returnPct: 21.99,
    dividend: 1200231,
    cumDividend: 22706085,
  },
  {
    date: '2023-05',
    principal: 274388436,
    evalTotal: 335210929,
    profit: 60822493,
    principalChg: 5826107,
    profitChg: 1776969,
    returnPct: 22.17,
    dividend: 778097,
    cumDividend: 23484182,
  },
  {
    date: '2023-06',
    principal: 274066566,
    evalTotal: 347138964,
    profit: 73072398,
    principalChg: -321870,
    profitChg: 12249905,
    returnPct: 26.66,
    dividend: 1400336,
    cumDividend: 24884518,
  },
  {
    date: '2023-07',
    principal: 274648214,
    evalTotal: 350368634,
    profit: 75720420,
    principalChg: 581648,
    profitChg: 2648022,
    returnPct: 27.57,
    dividend: 474352,
    cumDividend: 25358870,
  },
  {
    date: '2023-08',
    principal: 276010274,
    evalTotal: 343605018,
    profit: 67594744,
    principalChg: 1362060,
    profitChg: -8125676,
    returnPct: 24.49,
    dividend: 699102,
    cumDividend: 26057972,
  },
  {
    date: '2023-09',
    principal: 276592334,
    evalTotal: 340924503,
    profit: 64332169,
    principalChg: 582060,
    profitChg: -3262575,
    returnPct: 23.26,
    dividend: 622920,
    cumDividend: 26680892,
  },
  {
    date: '2023-10',
    principal: 277174394,
    evalTotal: 327648168,
    profit: 50473774,
    principalChg: 582060,
    profitChg: -13858395,
    returnPct: 18.21,
    dividend: 641282,
    cumDividend: 27322174,
  },
  {
    date: '2023-11',
    principal: 277756454,
    evalTotal: 351791736,
    profit: 74035282,
    principalChg: 582060,
    profitChg: 23561508,
    returnPct: 26.65,
    dividend: 557777,
    cumDividend: 27879951,
  },
  {
    date: '2023-12',
    principal: 279905355,
    evalTotal: 370930337,
    profit: 91024982,
    principalChg: 2148901,
    profitChg: 16989700,
    returnPct: 32.52,
    dividend: 1713041,
    cumDividend: 29592992,
  },
  {
    date: '2024-01',
    principal: 274686965,
    evalTotal: 377759967,
    profit: 103073002,
    principalChg: -5218390,
    profitChg: 12048020,
    returnPct: 37.52,
    dividend: 538148,
    cumDividend: 30131140,
  },
  {
    date: '2024-02',
    principal: 274206381,
    evalTotal: 395732914,
    profit: 121526533,
    principalChg: -480584,
    profitChg: 18453531,
    returnPct: 44.32,
    dividend: 899857,
    cumDividend: 31030997,
  },
  {
    date: '2024-03',
    principal: 262342539,
    evalTotal: 392454091,
    profit: 130111552,
    principalChg: -11863842,
    profitChg: 8585019,
    returnPct: 49.6,
    dividend: 754170,
    cumDividend: 31785167,
  },
  {
    date: '2024-04',
    principal: 264457714,
    evalTotal: 386644545,
    profit: 122186831,
    principalChg: 2115175,
    profitChg: -7924721,
    returnPct: 46.2,
    dividend: 1191536,
    cumDividend: 32976703,
  },
  {
    date: '2024-05',
    principal: 264292266,
    evalTotal: 396765122,
    profit: 132472856,
    principalChg: -165448,
    profitChg: 10286025,
    returnPct: 50.12,
    dividend: 794944,
    cumDividend: 33771647,
  },
  {
    date: '2024-06',
    principal: 264508104,
    evalTotal: 408502451,
    profit: 143994347,
    principalChg: 215838,
    profitChg: 11521491,
    returnPct: 54.44,
    dividend: 3195214,
    cumDividend: 36966861,
  },
  {
    date: '2024-07',
    principal: 260563930,
    evalTotal: 408137403,
    profit: 147573473,
    principalChg: -3944174,
    profitChg: 3579126,
    returnPct: 56.64,
    dividend: 658986,
    cumDividend: 37625847,
  },
  {
    date: '2024-08',
    principal: 258742191,
    evalTotal: 405123610,
    profit: 146381419,
    principalChg: -1821739,
    profitChg: -1192054,
    returnPct: 56.57,
    dividend: 923171,
    cumDividend: 38549018,
  },
  {
    date: '2024-09',
    principal: 259023020,
    evalTotal: 407334445,
    profit: 148311425,
    principalChg: 280829,
    profitChg: 1930006,
    returnPct: 57.26,
    dividend: 596427,
    cumDividend: 39145445,
  },
  {
    date: '2024-10',
    principal: 259843584,
    evalTotal: 424393424,
    profit: 164549840,
    principalChg: 820564,
    profitChg: 16238415,
    returnPct: 63.33,
    dividend: 654983,
    cumDividend: 39800428,
  },
  {
    date: '2024-11',
    principal: 272600909,
    evalTotal: 447480687,
    profit: 174879778,
    principalChg: 12757325,
    profitChg: 10329938,
    returnPct: 64.15,
    dividend: 676747,
    cumDividend: 40477175,
  },
  {
    date: '2024-12',
    principal: 267364969,
    evalTotal: 450500773,
    profit: 183135804,
    principalChg: -5235940,
    profitChg: 8256026,
    returnPct: 68.5,
    dividend: 1496464,
    cumDividend: 41973639,
  },
  {
    date: '2025-01',
    principal: 265794398,
    evalTotal: 450356356,
    profit: 184561958,
    principalChg: -1570571,
    profitChg: 1426154,
    returnPct: 69.44,
    dividend: 1682577,
    cumDividend: 43656216,
  },
  {
    date: '2025-02',
    principal: 265611961,
    evalTotal: 453532433,
    profit: 187920472,
    principalChg: -182437,
    profitChg: 3358514,
    returnPct: 70.75,
    dividend: 1117399,
    cumDividend: 44773615,
  },
  {
    date: '2025-03',
    principal: 273342862,
    evalTotal: 448499409,
    profit: 175156547,
    principalChg: 7730901,
    profitChg: -12763925,
    returnPct: 64.08,
    dividend: 698837,
    cumDividend: 45472452,
  },
  {
    date: '2025-04',
    principal: 292424143,
    evalTotal: 451426163,
    profit: 159002020,
    principalChg: 19081281,
    profitChg: -16154527,
    returnPct: 54.37,
    dividend: 1724028,
    cumDividend: 47196480,
  },
  {
    date: '2025-05',
    principal: 293589143,
    evalTotal: 470812738,
    profit: 177223595,
    principalChg: 1165000,
    profitChg: 18221575,
    returnPct: 60.36,
    dividend: 1024548,
    cumDividend: 48221028,
  },
  {
    date: '2025-06',
    principal: 298649997,
    evalTotal: 501219339,
    profit: 202569341,
    principalChg: 5060854,
    profitChg: 25345746,
    returnPct: 67.83,
    dividend: 1548312,
    cumDividend: 49769340,
  },
  {
    date: '2025-07',
    principal: 298823034,
    evalTotal: 521033000,
    profit: 222209965,
    principalChg: 173037,
    profitChg: 19640623,
    returnPct: 74.36,
    dividend: 744078,
    cumDividend: 50513418,
  },
  {
    date: '2025-08',
    principal: 298520119,
    evalTotal: 536004416,
    profit: 237484297,
    principalChg: -302915,
    profitChg: 15274331,
    returnPct: 79.55,
    dividend: 1410510,
    cumDividend: 51923928,
  },
  {
    date: '2025-09',
    principal: 292663165,
    evalTotal: 548868091,
    profit: 256204926,
    principalChg: -5856954,
    profitChg: 18720629,
    returnPct: 87.54,
    dividend: 879373,
    cumDividend: 52803301,
  },
  {
    date: '2025-10',
    principal: 294712172,
    evalTotal: 587205622,
    profit: 292493450,
    principalChg: 2049007,
    profitChg: 36288524,
    returnPct: 99.25,
    dividend: 549722,
    cumDividend: 53353023,
  },
  {
    date: '2025-11',
    principal: 294964590,
    evalTotal: 594704817,
    profit: 299740227,
    principalChg: 252418,
    profitChg: 7246777,
    returnPct: 101.62,
    dividend: 1042585,
    cumDividend: 54395608,
  },
  {
    date: '2025-12',
    principal: 295505003,
    evalTotal: 598540206,
    profit: 303035203,
    principalChg: 540413,
    profitChg: 3294976,
    returnPct: 102.55,
    dividend: 1862799,
    cumDividend: 56258407,
  },
  {
    date: '2026-01',
    principal: 301477051,
    evalTotal: 637776622,
    profit: 336299571,
    principalChg: 5972048,
    profitChg: 33264368,
    returnPct: 111.55,
    dividend: 1086465,
    cumDividend: 57344872,
  },
  {
    date: '2026-02',
    principal: 321630293,
    evalTotal: 670243196,
    profit: 348612903,
    principalChg: 20153242,
    profitChg: 12313332,
    returnPct: 108.39,
    dividend: 907059,
    cumDividend: 58251931,
  },
];
const HOLDINGS = [
  {
    country: '미국',
    code: 'KRX:379810',
    name: 'KODEX 미국나스닥100',
    type: 'ETF',
    qty: 3654.0,
    buyAmount: 49875726,
    evalAmount: 87476760,
    profit: 37601034,
    returnPct: 75.39,
    weight: 13.08,
  },
  {
    country: '미국',
    code: 'KRX:379800',
    name: 'KODEX 미국S&P500',
    type: 'ETF',
    qty: 3434.0,
    buyAmount: 47225936,
    evalAmount: 77522550,
    profit: 30296614,
    returnPct: 64.15,
    weight: 11.59,
  },
  {
    country: '미국',
    code: 'NYSE:SPGI',
    name: 'SPGI',
    type: '금융',
    qty: 94.0,
    buyAmount: 52350209,
    evalAmount: 57101770,
    profit: 4751561,
    returnPct: 9.08,
    weight: 8.54,
  },
  {
    country: '한국',
    code: 'KRX:102110',
    name: 'TIGER 200',
    type: 'ETF',
    qty: 450.0,
    buyAmount: 14324214,
    evalAmount: 37953000,
    profit: 23628786,
    returnPct: 164.96,
    weight: 5.68,
  },
  {
    country: '한국',
    code: 'KRX:00680K',
    name: '미래에셋증권2우B',
    type: '금융',
    qty: 1692.0,
    buyAmount: 5244318,
    evalAmount: 38408400,
    profit: 33164082,
    returnPct: 632.38,
    weight: 5.74,
  },
  {
    country: '한국',
    code: 'KRX:293940',
    name: '신한알파리츠',
    type: '기타',
    qty: 5244.0,
    buyAmount: 31040639,
    evalAmount: 31149360,
    profit: 108721,
    returnPct: 0.35,
    weight: 4.66,
  },
  {
    country: '미국',
    code: 'NYSE:O',
    name: 'O',
    type: '부동산',
    qty: 200.0,
    buyAmount: 13190112,
    evalAmount: 18850583,
    profit: 5660471,
    returnPct: 42.91,
    weight: 2.82,
  },
  {
    country: '미국',
    code: 'NYSEARCA:SPYM',
    name: 'SPYM',
    type: 'ETF',
    qty: 160.88,
    buyAmount: 12741328,
    evalAmount: 18817355,
    profit: 6076027,
    returnPct: 47.69,
    weight: 2.81,
  },
  {
    country: '미국',
    code: 'NYSE:WELL',
    name: 'WELL',
    type: '부동산',
    qty: 59.0,
    buyAmount: 3878319,
    evalAmount: 17826229,
    profit: 13947910,
    returnPct: 359.64,
    weight: 2.67,
  },
  {
    country: '한국',
    code: 'KRX:00088K',
    name: '한화3우B',
    type: '소재',
    qty: 368.0,
    buyAmount: 4298410,
    evalAmount: 17461600,
    profit: 13163190,
    returnPct: 306.23,
    weight: 2.61,
  },
  {
    country: '미국',
    code: 'NYSE:XOM',
    name: 'XOM',
    type: '에너지',
    qty: 70.0,
    buyAmount: 4148968,
    evalAmount: 15278040,
    profit: 11129072,
    returnPct: 268.24,
    weight: 2.28,
  },
  {
    country: '미국',
    code: 'NYSEARCA:SPYG',
    name: 'SPYG',
    type: 'ETF',
    qty: 100.0,
    buyAmount: 7155223,
    evalAmount: 15067140,
    profit: 7911917,
    returnPct: 110.58,
    weight: 2.25,
  },
  {
    country: '미국',
    code: 'NASDAQ:AMD',
    name: 'AMD',
    type: '첨단 기술',
    qty: 47.0,
    buyAmount: 4913995,
    evalAmount: 13623928,
    profit: 8709933,
    returnPct: 177.25,
    weight: 2.04,
  },
  {
    country: '미국',
    code: 'NYSE:MAIN',
    name: 'MAIN',
    type: '금융',
    qty: 162.0,
    buyAmount: 6075711,
    evalAmount: 14083967,
    profit: 8008256,
    returnPct: 131.81,
    weight: 2.11,
  },
  {
    country: '미국',
    code: 'NYSEARCA:DGRO',
    name: 'DGRO',
    type: 'ETF',
    qty: 128.0,
    buyAmount: 7315826,
    evalAmount: 13673698,
    profit: 6357872,
    returnPct: 86.91,
    weight: 2.04,
  },
  {
    country: '미국',
    code: 'NASDAQ:TQQQ',
    name: 'TQQQ',
    type: 'ETF',
    qty: 190.0,
    buyAmount: 4232387,
    evalAmount: 13592728,
    profit: 9360341,
    returnPct: 221.16,
    weight: 2.03,
  },
  {
    country: '미국',
    code: 'NYSEARCA:UPRO',
    name: 'UPRO',
    type: 'ETF',
    qty: 80.0,
    buyAmount: 4452932,
    evalAmount: 13415288,
    profit: 8962356,
    returnPct: 201.27,
    weight: 2.01,
  },
  {
    country: '미국',
    code: 'NYSE:SPG',
    name: 'SPG',
    type: '부동산',
    qty: 41.0,
    buyAmount: 3933493,
    evalAmount: 11855603,
    profit: 7922110,
    returnPct: 201.4,
    weight: 1.77,
  },
  {
    country: '미국',
    code: 'NYSEARCA:SPHD',
    name: 'SPHD',
    type: 'ETF',
    qty: 134.0,
    buyAmount: 6096278,
    evalAmount: 10120217,
    profit: 4023939,
    returnPct: 66.01,
    weight: 1.51,
  },
  {
    country: '한국',
    code: 'KRX:005389',
    name: '현대차3우B',
    type: '운송·물류',
    qty: 35.0,
    buyAmount: 2993266,
    evalAmount: 9240000,
    profit: 6246734,
    returnPct: 208.69,
    weight: 1.38,
  },
  {
    country: '미국',
    code: 'NYSE:T',
    name: 'T',
    type: '통신',
    qty: 211.0,
    buyAmount: 7673401,
    evalAmount: 8520973,
    profit: 847572,
    returnPct: 11.05,
    weight: 1.27,
  },
  {
    country: '미국',
    code: 'NASDAQ:QQQM',
    name: 'QQQM',
    type: 'ETF',
    qty: 23.0,
    buyAmount: 6132679,
    evalAmount: 8308133,
    profit: 2175454,
    returnPct: 35.47,
    weight: 1.24,
  },
  {
    country: '미국',
    code: 'NYSE:OKE',
    name: 'OKE',
    type: '에너지',
    qty: 66.0,
    buyAmount: 3374210,
    evalAmount: 8297124,
    profit: 4922914,
    returnPct: 145.9,
    weight: 1.24,
  },
  {
    country: '한국',
    code: 'KRX:091230',
    name: 'TIGER 반도체',
    type: 'ETF',
    qty: 86.0,
    buyAmount: 2716815,
    evalAmount: 8251270,
    profit: 5534455,
    returnPct: 203.71,
    weight: 1.23,
  },
  {
    country: '미국',
    code: 'NYSE:MGM',
    name: 'MGM',
    type: '경기 소비재',
    qty: 156.0,
    buyAmount: 3734162,
    evalAmount: 8403588,
    profit: 4669426,
    returnPct: 125.05,
    weight: 1.26,
  },
  {
    country: '미국',
    code: 'KRX:446720',
    name: 'SOL 미국배당다우존스',
    type: 'ETF',
    qty: 556.0,
    buyAmount: 5473798,
    evalAmount: 7408700,
    profit: 1934902,
    returnPct: 35.35,
    weight: 1.11,
  },
  {
    country: '미국',
    code: 'NYSE:EPR',
    name: 'EPR',
    type: '부동산',
    qty: 81.0,
    buyAmount: 3130732,
    evalAmount: 6701734,
    profit: 3571002,
    returnPct: 114.06,
    weight: 1.0,
  },
  {
    country: '한국',
    code: 'KRX:005935',
    name: '삼성전자우',
    type: '첨단 기술',
    qty: 52.0,
    buyAmount: 3352645,
    evalAmount: 6942000,
    profit: 3589355,
    returnPct: 107.06,
    weight: 1.04,
  },
  {
    country: '한국',
    code: 'KRX:088980',
    name: '맥쿼리인프라',
    type: '금융',
    qty: 537.0,
    buyAmount: 5943210,
    evalAmount: 6213090,
    profit: 269880,
    returnPct: 4.54,
    weight: 0.93,
  },
  {
    country: '미국',
    code: 'NYSEARCA:SCHD',
    name: 'SCHD',
    type: 'ETF',
    qty: 135.0,
    buyAmount: 4773506,
    evalAmount: 6171415,
    profit: 1397909,
    returnPct: 29.28,
    weight: 0.92,
  },
  {
    country: '한국',
    code: 'KRX:305540',
    name: 'TIGER 2차전지테마',
    type: 'ETF',
    qty: 275.0,
    buyAmount: 3841899,
    evalAmount: 6033500,
    profit: 2191601,
    returnPct: 57.04,
    weight: 0.9,
  },
  {
    country: '미국',
    code: 'FTEC',
    name: 'FTEC',
    type: 'IT',
    qty: 18.0,
    buyAmount: 2653041,
    evalAmount: 5738607,
    profit: 3085566,
    returnPct: 116.3,
    weight: 0.86,
  },
  {
    country: '한국',
    code: 'KRX:005930',
    name: '삼성전자',
    type: '첨단 기술',
    qty: 30.0,
    buyAmount: 1641000,
    evalAmount: 5700000,
    profit: 4059000,
    returnPct: 247.35,
    weight: 0.85,
  },
  {
    country: '미국',
    code: 'DIVB',
    name: 'DIVB',
    type: 'ETF',
    qty: 60.0,
    buyAmount: 3493327,
    evalAmount: 4915578,
    profit: 1422251,
    returnPct: 40.71,
    weight: 0.74,
  },
  {
    country: '미국',
    code: 'NASDAQ:QYLG',
    name: 'QYLG',
    type: 'ETF',
    qty: 124.0,
    buyAmount: 5183111,
    evalAmount: 4842343,
    profit: -340767,
    returnPct: -6.57,
    weight: 0.72,
  },
  {
    country: '미국',
    code: 'NYSEARCA:XLRE',
    name: 'XLRE',
    type: 'ETF',
    qty: 72.0,
    buyAmount: 3388211,
    evalAmount: 4521011,
    profit: 1132800,
    returnPct: 33.43,
    weight: 0.68,
  },
  {
    country: '미국',
    code: 'NYSE:BRK.B',
    name: 'BRK.B',
    type: '금융',
    qty: 5.667,
    buyAmount: 3970907,
    evalAmount: 4096648,
    profit: 125741,
    returnPct: 3.17,
    weight: 0.61,
  },
  {
    country: '미국',
    code: 'SOXL',
    name: 'SOXL',
    type: 'ETF',
    qty: 41.0,
    buyAmount: 528280,
    evalAmount: 3936822,
    profit: 3408542,
    returnPct: 645.22,
    weight: 0.59,
  },
  {
    country: '한국',
    code: 'KRX:338100',
    name: 'NH프라임리츠',
    type: '기타',
    qty: 826.0,
    buyAmount: 3787795,
    evalAmount: 3791340,
    profit: 3545,
    returnPct: 0.09,
    weight: 0.57,
  },
  {
    country: '한국',
    code: 'KRX:228810',
    name: 'TIGER 미디어컨텐츠',
    type: 'ETF',
    qty: 557.0,
    buyAmount: 3598579,
    evalAmount: 3431120,
    profit: -167459,
    returnPct: -4.65,
    weight: 0.51,
  },
  {
    country: '한국',
    code: 'KRX:157490',
    name: 'TIGER 소프트웨어',
    type: 'ETF',
    qty: 308.0,
    buyAmount: 3959466,
    evalAmount: 3073840,
    profit: -885626,
    returnPct: -22.37,
    weight: 0.46,
  },
  {
    country: '미국',
    code: 'NYSEARCA:HDV',
    name: 'HDV',
    type: 'ETF',
    qty: 15.0,
    buyAmount: 1713251,
    evalAmount: 3003795,
    profit: 1290544,
    returnPct: 75.33,
    weight: 0.45,
  },
  {
    country: '한국',
    code: 'KRX:329650',
    name: 'KODEX TRF3070',
    type: 'ETF',
    qty: 202.0,
    buyAmount: 2607977,
    evalAmount: 2884560,
    profit: 276583,
    returnPct: 10.61,
    weight: 0.43,
  },
  {
    country: '미국',
    code: 'SRVR',
    name: 'SRVR',
    type: '부동산',
    qty: 43.0,
    buyAmount: 1560636,
    evalAmount: 2041697,
    profit: 481061,
    returnPct: 30.82,
    weight: 0.31,
  },
  {
    country: '한국',
    code: 'KRX:256440',
    name: 'ACE MSCI인도네시아(합성)',
    type: 'ETF',
    qty: 193.0,
    buyAmount: 1630825,
    evalAmount: 1598040,
    profit: -32785,
    returnPct: -2.01,
    weight: 0.24,
  },
  {
    country: '미국',
    code: 'NASDAQ:WBD',
    name: 'WBD',
    type: '경기 소비재',
    qty: 34.0,
    buyAmount: 1002111,
    evalAmount: 1417864,
    profit: 415753,
    returnPct: 41.49,
    weight: 0.21,
  },
];
const DIVIDENDS = [
  {
    year: 2020,
    divIncome: 2810908,
    capGain: 8253432,
    totalReturn: 11064340,
    divGrowth: 0,
    cumDiv: 2810908,
    cumCapGain: 19020664,
    cumTotal: 21831572,
    preTaxDiv: 3306950,
    yearEndPrincipal: 57000000,
    yearEndEval: 68064340,
  },
  {
    year: 2021,
    divIncome: 6447637,
    capGain: 54748819,
    totalReturn: 61196456,
    divGrowth: 129.38,
    cumDiv: 9258545,
    cumCapGain: 63002251,
    cumTotal: 72260796,
    preTaxDiv: 7585455,
    yearEndPrincipal: 196659774,
    yearEndEval: 268920570,
  },
  {
    year: 2022,
    divIncome: 10479760,
    capGain: -59430180,
    totalReturn: -48950420,
    divGrowth: 62.54,
    cumDiv: 19738305,
    cumCapGain: 3572071,
    cumTotal: 23310376,
    preTaxDiv: 12329129,
    yearEndPrincipal: 267228692,
    yearEndEval: 290539068,
  },
  {
    year: 2023,
    divIncome: 9854687,
    capGain: 57859919,
    totalReturn: 67714606,
    divGrowth: -5.96,
    cumDiv: 29592992,
    cumCapGain: 61431990,
    cumTotal: 91024982,
    preTaxDiv: 11593749,
    yearEndPrincipal: 279905355,
    yearEndEval: 370930337,
  },
  {
    year: 2024,
    divIncome: 12380647,
    capGain: 79730175,
    totalReturn: 92110822,
    divGrowth: 25.63,
    cumDiv: 41973639,
    cumCapGain: 141162165,
    cumTotal: 183135804,
    preTaxDiv: 14565467,
    yearEndPrincipal: 267364969,
    yearEndEval: 450500773,
  },
  {
    year: 2025,
    divIncome: 14284768,
    capGain: 105614631,
    totalReturn: 119899399,
    divGrowth: 15.38,
    cumDiv: 56258407,
    cumCapGain: 246776796,
    cumTotal: 303035203,
    preTaxDiv: 16805609,
    yearEndPrincipal: 295505003,
    yearEndEval: 598540206,
  },
  {
    year: 2026,
    divIncome: 1993524,
    capGain: 43584176,
    totalReturn: 45577700,
    divGrowth: -86.04,
    cumDiv: 58251931,
    cumCapGain: 290360972,
    cumTotal: 348612903,
    preTaxDiv: 2345322,
    yearEndPrincipal: 321630293,
    yearEndEval: 670243196,
  },
];

const fK = (n) => {
  const a = Math.abs(n);
  if (a >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (a >= 10000) return Math.round(n / 10000).toLocaleString() + '만';
  return n.toLocaleString();
};
const fF = (n) => (n > 0 ? '+' : '') + Math.abs(n).toLocaleString() + '원';
const fP = (n) => (n > 0 ? '+' : '') + n.toFixed(2) + '%';

function CT({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#1C2230',
        borderRadius: 10,
        padding: '10px 14px',
        border: `1px solid ${T.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        maxWidth: 220,
      }}
    >
      <p style={{ color: T.textSec, fontSize: 11, margin: '0 0 5px' }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color || T.text,
            fontSize: 12,
            fontWeight: 600,
            margin: '2px 0',
          }}
        >
          {p.name}:{' '}
          {fmt === 'pct'
            ? fP(p.value)
            : fmt === 'krw'
            ? fK(p.value) + '원'
            : p.value}
        </p>
      ))}
    </div>
  );
}

function S({ label, value, color, sub }) {
  return (
    <div
      style={{
        background: T.card,
        borderRadius: 14,
        padding: '14px 16px',
        border: `1px solid ${T.border}`,
        flex: 1,
        minWidth: 0,
      }}
    >
      <p
        style={{
          color: T.textDim,
          fontSize: 10,
          margin: '0 0 5px',
          fontWeight: 600,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: color || T.text,
          fontSize: 18,
          fontWeight: 800,
          margin: 0,
          letterSpacing: '-0.5px',
          fontFamily: "'IBM Plex Mono',monospace",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ color: T.textSec, fontSize: 10, margin: '3px 0 0' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function OverviewTab() {
  const latest = MONTHLY[MONTHLY.length - 1];
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div
        style={{
          background: 'linear-gradient(145deg,#131B26,#0E1319)',
          borderRadius: 20,
          padding: '24px 20px',
          marginBottom: 16,
          border: `1px solid ${T.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: T.accentGlow,
            filter: 'blur(40px)',
          }}
        />
        <p
          style={{
            color: T.textSec,
            fontSize: 12,
            margin: '0 0 3px',
            fontWeight: 500,
          }}
        >
          총 평가금액
        </p>
        <h2
          style={{
            color: T.text,
            fontSize: 28,
            fontWeight: 800,
            margin: '0 0 2px',
            letterSpacing: '-1px',
            fontFamily: "'IBM Plex Mono',monospace",
          }}
        >
          ₩{SUMMARY.evalTotal.toLocaleString()}
        </h2>
        <p
          style={{
            color: SUMMARY.returnPct >= 0 ? T.accent : T.red,
            fontSize: 14,
            fontWeight: 700,
            margin: '0 0 16px',
            fontFamily: "'IBM Plex Mono',monospace",
          }}
        >
          {fP(SUMMARY.returnPct)} ({fF(SUMMARY.profit)})
        </p>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: T.textDim, fontSize: 10, margin: '0 0 3px' }}>
              투자원금
            </p>
            <p
              style={{
                color: T.blue,
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fK(SUMMARY.principal)}원
            </p>
          </div>
          <div style={{ width: 1, background: T.border }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: T.textDim, fontSize: 10, margin: '0 0 3px' }}>
              투자기간
            </p>
            <p
              style={{
                color: T.text,
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {SUMMARY.months}개월
            </p>
          </div>
          <div style={{ width: 1, background: T.border }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: T.textDim, fontSize: 10, margin: '0 0 3px' }}>
              월평균수익
            </p>
            <p
              style={{
                color: T.accent,
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fK(SUMMARY.avgMonthlyProfit)}원
            </p>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <S
          label="수익률 고점"
          value={fP(SUMMARY.highReturnPct)}
          color={T.accent}
          sub={'고점대비 ' + fP(SUMMARY.fromHighPct)}
        />
        <S
          label="누적 배당"
          value={fK(SUMMARY.cumDividend) + '원'}
          color={T.orange}
          sub={'시세차익 ' + fK(SUMMARY.cumCapGain) + '원'}
        />
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 10px 16px',
          }}
        >
          수익률 추이
        </p>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={MONTHLY}>
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity={0.2} />
                <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: T.textDim, fontSize: 9 }}
              tickFormatter={(v) => v.slice(2)}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(MONTHLY.length / 6)}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v + '%'}
              width={42}
            />
            <Tooltip content={<CT fmt="pct" />} />
            <ReferenceLine y={0} stroke={T.textDim} strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="returnPct"
              name="수익률"
              stroke={T.accent}
              strokeWidth={2}
              fill="url(#rg)"
              dot={false}
              activeDot={{ r: 4, fill: T.accent, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${T.border}`,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 12px',
          }}
        >
          TOP 5 종목
        </p>
        {HOLDINGS.slice(0, 5).map((h, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: `${SC[i]}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: SC[i],
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: T.text,
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {h.name}
              </p>
              <p style={{ color: T.textDim, fontSize: 10, margin: '2px 0 0' }}>
                {h.country} · {h.type} · {h.weight}%
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  color: h.returnPct >= 0 ? T.accent : T.red,
                  fontSize: 13,
                  fontWeight: 700,
                  margin: 0,
                  fontFamily: "'IBM Plex Mono',monospace",
                }}
              >
                {fP(h.returnPct)}
              </p>
              <p style={{ color: T.textDim, fontSize: 10, margin: '1px 0 0' }}>
                {fK(h.evalAmount)}원
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReturnsTab() {
  const yearlyMap = {};
  MONTHLY.forEach((d) => {
    const yr = d.date.split('-')[0];
    if (!yearlyMap[yr])
      yearlyMap[yr] = { last: d.returnPct, max: d.returnPct, min: d.returnPct };
    yearlyMap[yr].last = d.returnPct;
    yearlyMap[yr].max = Math.max(yearlyMap[yr].max, d.returnPct);
    yearlyMap[yr].min = Math.min(yearlyMap[yr].min, d.returnPct);
  });
  const mR = MONTHLY.map((d, i) => {
    const p = MONTHLY[i - 1];
    return { ...d, mReturn: p ? d.returnPct - p.returnPct : d.returnPct };
  });
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <S
          label="현재 수익률"
          value={fP(SUMMARY.returnPct)}
          color={SUMMARY.returnPct >= 0 ? T.accent : T.red}
        />
        <S
          label="고점 대비"
          value={fP(SUMMARY.fromHighPct)}
          color={T.orange}
          sub={'고점 ' + fP(SUMMARY.highReturnPct)}
        />
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 10px 16px',
          }}
        >
          수익률 추이
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={MONTHLY}>
            <defs>
              <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity={0.25} />
                <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: T.textDim, fontSize: 9 }}
              tickFormatter={(v) => v.slice(2)}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(MONTHLY.length / 6)}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v + '%'}
              width={42}
            />
            <Tooltip content={<CT fmt="pct" />} />
            <ReferenceLine y={0} stroke={T.textDim} strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="returnPct"
              name="수익률"
              stroke={T.accent}
              strokeWidth={2.5}
              fill="url(#rg2)"
              dot={false}
              activeDot={{ r: 5, fill: T.accent }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 10px 16px',
          }}
        >
          월간 수익률 변동
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={mR}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: T.textDim, fontSize: 8 }}
              tickFormatter={(v) => v.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(0) + '%'}
              width={36}
            />
            <Tooltip content={<CT fmt="pct" />} />
            <ReferenceLine y={0} stroke={T.textDim} />
            <Bar dataKey="mReturn" name="월간변동" radius={[2, 2, 0, 0]}>
              {mR.map((e, i) => (
                <Cell key={i} fill={e.mReturn >= 0 ? T.accent : T.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${T.border}`,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 12px',
          }}
        >
          연도별 누적 수익률
        </p>
        {Object.entries(yearlyMap).map(([yr, v]) => (
          <div
            key={yr}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ color: T.textSec, fontSize: 13, fontWeight: 500 }}>
              {yr}년
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: T.textDim, fontSize: 11 }}>
                최저 {fP(v.min)}
              </span>
              <span style={{ color: T.textDim, fontSize: 11 }}>
                최고 {fP(v.max)}
              </span>
              <span
                style={{
                  color: v.last >= 0 ? T.accent : T.red,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Mono',monospace",
                  minWidth: 70,
                  textAlign: 'right',
                }}
              >
                {fP(v.last)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CumulativeTab() {
  const latest = MONTHLY[MONTHLY.length - 1];
  const cD = MONTHLY.map((d) => ({
    date: d.date,
    원금: d.principal,
    수익: Math.max(0, d.profit),
    누적배당: d.cumDividend,
  }));
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <S
          label="투자원금"
          value={fK(latest.principal) + '원'}
          color={T.blue}
        />
        <S
          label="평가수익"
          value={fK(latest.profit) + '원'}
          color={latest.profit >= 0 ? T.accent : T.red}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <S
          label="누적배당"
          value={fK(latest.cumDividend) + '원'}
          color={T.orange}
        />
        <S
          label="원금증감"
          value={fK(latest.principalChg) + '원'}
          color={latest.principalChg >= 0 ? T.cyan : T.red}
          sub="전월대비"
        />
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 14,
            margin: '0 0 10px 16px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { l: '원금', c: T.blue },
            { l: '수익', c: T.accent },
            { l: '누적배당', c: T.orange },
          ].map((x) => (
            <div
              key={x.l}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: x.c,
                }}
              />
              <span style={{ color: T.textSec, fontSize: 11 }}>{x.l}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={cD}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: T.textDim, fontSize: 9 }}
              tickFormatter={(v) => v.slice(2)}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(cD.length / 6)}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fK(v)}
              width={48}
            />
            <Tooltip content={<CT fmt="krw" />} />
            <Bar dataKey="원금" stackId="a" fill={T.blue} />
            <Bar
              dataKey="수익"
              stackId="a"
              fill={T.accent}
              radius={[2, 2, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="누적배당"
              name="누적배당"
              stroke={T.orange}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${T.border}`,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 12px',
          }}
        >
          최근 원금 변동
        </p>
        {[...MONTHLY]
          .reverse()
          .filter((d) => d.principalChg !== 0)
          .slice(0, 10)
          .map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '9px 0',
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <span style={{ color: T.textSec, fontSize: 12 }}>{d.date}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span
                  style={{
                    color: d.principalChg > 0 ? T.accent : T.red,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}
                >
                  {d.principalChg > 0 ? '+' : ''}
                  {fK(d.principalChg)}
                </span>
                <span style={{ color: T.textDim, fontSize: 11 }}>
                  → {fK(d.principal)}원
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function DividendTab() {
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <S
          label="누적 배당수익"
          value={fK(SUMMARY.cumDividend) + '원'}
          color={T.orange}
        />
        <S
          label="누적 시세차익"
          value={fK(SUMMARY.cumCapGain) + '원'}
          color={T.accent}
        />
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 14, margin: '0 0 10px 16px' }}>
          {[
            { l: '배당', c: T.orange },
            { l: '시세차익', c: T.accent },
          ].map((x) => (
            <div
              key={x.l}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: x.c,
                }}
              />
              <span style={{ color: T.textSec, fontSize: 11 }}>{x.l}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={DIVIDENDS}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="year"
              tick={{ fill: T.textDim, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fK(v)}
              width={44}
            />
            <Tooltip content={<CT fmt="krw" />} />
            <Bar
              dataKey="divIncome"
              name="배당"
              fill={T.orange}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="capGain"
              name="시세차익"
              fill={T.accent}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 10px 16px',
          }}
        >
          누적 수익 추이
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={DIVIDENDS}>
            <defs>
              <linearGradient id="cd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.orange} stopOpacity={0.2} />
                <stop offset="100%" stopColor={T.orange} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="year"
              tick={{ fill: T.textDim, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fK(v)}
              width={44}
            />
            <Tooltip content={<CT fmt="krw" />} />
            <Area
              type="monotone"
              dataKey="cumTotal"
              name="누적수익"
              stroke={T.accent}
              strokeWidth={2}
              fill="url(#cd)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="cumDiv"
              name="누적배당"
              stroke={T.orange}
              strokeWidth={2}
              fill="transparent"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            padding: '10px 14px',
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ color: T.textDim, fontSize: 10, fontWeight: 600 }}>
            연도
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            배당
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            시세
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            합계
          </span>
        </div>
        {[...DIVIDENDS].reverse().map((d, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              padding: '10px 14px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ color: T.textSec, fontSize: 12 }}>{d.year}</span>
            <span
              style={{
                color: T.orange,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fK(d.divIncome)}
            </span>
            <span
              style={{
                color: d.capGain >= 0 ? T.accent : T.red,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fK(d.capGain)}
            </span>
            <span
              style={{
                color: d.totalReturn >= 0 ? T.text : T.red,
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fK(d.totalReturn)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyTab() {
  const mR = MONTHLY.map((d, i) => {
    const p = MONTHLY[i - 1];
    return { ...d, mReturn: p ? d.returnPct - p.returnPct : d.returnPct };
  });
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: '16px 6px 8px 0',
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 10px 16px',
          }}
        >
          월간 수익률
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={mR}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis
              dataKey="date"
              tick={{ fill: T.textDim, fontSize: 8 }}
              tickFormatter={(v) => v.slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: T.textDim, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(0) + '%'}
              width={36}
            />
            <Tooltip content={<CT fmt="pct" />} />
            <ReferenceLine y={0} stroke={T.textDim} />
            <Bar dataKey="mReturn" name="월간" radius={[2, 2, 0, 0]}>
              {mR.map((e, i) => (
                <Cell key={i} fill={e.mReturn >= 0 ? T.accent : T.red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            padding: '10px 14px',
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <span style={{ color: T.textDim, fontSize: 10, fontWeight: 600 }}>
            월
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            월간
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            누적
          </span>
          <span
            style={{
              color: T.textDim,
              fontSize: 10,
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            배당
          </span>
        </div>
        {[...mR].reverse().map((d, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              padding: '10px 14px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ color: T.textSec, fontSize: 12 }}>{d.date}</span>
            <span
              style={{
                color: d.mReturn >= 0 ? T.accent : T.red,
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {d.mReturn >= 0 ? '+' : ''}
              {d.mReturn.toFixed(1)}%
            </span>
            <span
              style={{
                color: d.returnPct >= 0 ? T.accent : T.red,
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {fP(d.returnPct)}
            </span>
            <span
              style={{
                color: d.dividend > 0 ? T.orange : T.textDim,
                fontSize: 11,
                textAlign: 'right',
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {d.dividend > 0 ? fK(d.dividend) : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingsTab() {
  const [sortBy, setSortBy] = useState('weight');
  const [filter, setFilter] = useState('전체');
  const types = ['전체', ...new Set(HOLDINGS.map((h) => h.type))];
  const filtered =
    filter === '전체' ? HOLDINGS : HOLDINGS.filter((h) => h.type === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'weight') return b.weight - a.weight;
    if (sortBy === 'profit') return b.returnPct - a.returnPct;
    return b.evalAmount - a.evalAmount;
  });
  const totalEval = HOLDINGS.reduce((s, h) => s + h.evalAmount, 0);
  const top12 = HOLDINGS.slice(0, 12);
  return (
    <div style={{ padding: '0 16px 100px' }}>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${T.border}`,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: T.text,
            fontSize: 13,
            fontWeight: 700,
            margin: '0 0 4px',
          }}
        >
          포트폴리오 구성
        </p>
        <p style={{ color: T.textDim, fontSize: 11, margin: '0 0 8px' }}>
          {HOLDINGS.length}종목 · ₩{totalEval.toLocaleString()}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={top12}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="evalAmount"
              nameKey="name"
              paddingAngle={1}
              strokeWidth={0}
            >
              {top12.map((_, i) => (
                <Cell key={i} fill={SC[i % SC.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div
                    style={{
                      background: '#1C2230',
                      borderRadius: 10,
                      padding: '10px 14px',
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <p
                      style={{
                        color: T.text,
                        fontSize: 12,
                        fontWeight: 600,
                        margin: '0 0 3px',
                      }}
                    >
                      {d.name}
                    </p>
                    <p style={{ color: T.textSec, fontSize: 11, margin: 0 }}>
                      {d.weight}% · ₩{d.evalAmount.toLocaleString()}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            marginTop: 4,
          }}
        >
          {top12.map((h, i) => (
            <div
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: SC[i % SC.length],
                }}
              />
              <span style={{ color: T.textSec, fontSize: 10 }}>
                {h.name.length > 12 ? h.name.slice(0, 12) + '..' : h.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          marginBottom: 10,
          paddingBottom: 4,
        }}
      >
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 12px',
              borderRadius: 7,
              flexShrink: 0,
              border: `1px solid ${filter === t ? T.borderActive : T.border}`,
              background: filter === t ? T.accentDim : 'transparent',
              color: filter === t ? T.accent : T.textSec,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[
          { id: 'weight', l: '비중' },
          { id: 'profit', l: '수익률' },
          { id: 'amount', l: '금액' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSortBy(s.id)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: `1px solid ${
                sortBy === s.id ? T.borderActive : T.border
              }`,
              background: sortBy === s.id ? T.accentDim : 'transparent',
              color: sortBy === s.id ? T.accent : T.textDim,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {s.l}순
          </button>
        ))}
      </div>
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
        }}
      >
        {sorted.map((h, i) => (
          <div
            key={i}
            style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${SC[i % SC.length]}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: SC[i % SC.length],
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: T.text,
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {h.name}
              </p>
              <p style={{ color: T.textDim, fontSize: 10, margin: '2px 0 0' }}>
                {h.country} · {h.type} · {h.weight}%
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p
                style={{
                  color: h.returnPct >= 0 ? T.accent : T.red,
                  fontSize: 13,
                  fontWeight: 700,
                  margin: 0,
                  fontFamily: "'IBM Plex Mono',monospace",
                }}
              >
                {fP(h.returnPct)}
              </p>
              <p style={{ color: T.textDim, fontSize: 10, margin: '1px 0 0' }}>
                {fK(h.evalAmount)}원
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: '종합', icon: '🏠' },
    { id: 'returns', label: '수익률', icon: '📈' },
    { id: 'cumul', label: '누적', icon: '📊' },
    { id: 'dividend', label: '배당', icon: '💰' },
    { id: 'monthly', label: '월별', icon: '📅' },
    { id: 'holdings', label: '종목', icon: '💎' },
  ];
  const titles = {
    overview: '포트폴리오 종합',
    returns: '수익률 분석',
    cumul: '누적 현황',
    dividend: '배당 분석',
    monthly: '월별 상세',
    holdings: '종목별 현황',
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        fontFamily: "'IBM Plex Sans KR','Noto Sans KR',sans-serif",
        maxWidth: 520,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{background:${T.bg};overflow-x:hidden}::-webkit-scrollbar{display:none}`}</style>
      <div
        style={{
          padding: '14px 18px 10px',
          position: 'sticky',
          top: 0,
          background: `${T.bg}ee`,
          backdropFilter: 'blur(20px)',
          zIndex: 10,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <h1
          style={{
            color: T.text,
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          {titles[tab]}
        </h1>
        <p style={{ color: T.textDim, fontSize: 11, margin: '1px 0 0' }}>
          SIMPSON{"'"}S FINANCE · 2026.02.13 기준
        </p>
      </div>
      <div style={{ paddingTop: 12 }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'returns' && <ReturnsTab />}
        {tab === 'cumul' && <CumulativeTab />}
        {tab === 'dividend' && <DividendTab />}
        {tab === 'monthly' && <MonthlyTab />}
        {tab === 'holdings' && <HoldingsTab />}
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 520,
          background: `${T.bg}f8`,
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          padding: '5px 0 env(safe-area-inset-bottom,5px)',
          zIndex: 20,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              padding: '6px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 17,
                filter: tab === t.id ? 'none' : 'grayscale(1) opacity(0.3)',
                transition: 'filter 0.2s',
              }}
            >
              {t.icon}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? T.accent : T.textDim,
                transition: 'color 0.2s',
              }}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
