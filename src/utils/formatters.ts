/**
 * 숫자를 한국 화폐 단위로 포맷 (억, 만원)
 */
export const fK = (v: number | undefined | null): string => {
  if (v === undefined || v === null || isNaN(v)) return "0";
  const val = Number(v);
  if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(1) + "억";
  if (Math.abs(val) >= 10000) return (val / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "만";
  return val.toLocaleString();
};

/**
 * 숫자를 원화 포맷으로 변환 (+/- 부호 포함)
 */
export const fF = (v: number): string => {
  return (v > 0 ? "+" : "") + Math.abs(v).toLocaleString() + "원";
};

/**
 * 숫자를 퍼센트 포맷으로 변환
 */
export const fP = (v: number | undefined | null): string => {
  if (v === undefined || v === null || isNaN(v)) return "0.00%";
  const val = Number(v);
  if (Math.abs(val) > 1000) return "0.00%";
  return val.toFixed(2) + "%";
};

/**
 * 문자열을 숫자로 변환 (화폐 기호, 쉼표 제거)
 */
export const n = (v: any): number => {
  if (v === null || v === undefined || v === "" || v === "#N/A") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[₩$,\s]/g, "").trim();
  if (s.includes("%")) return parseFloat(s.replace("%", ""));
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};
