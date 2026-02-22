/**
 * 다양한 날짜 형식을 YYYY-MM 형식으로 변환
 */
export const parseDate = (str: any): string | null => {
  if (!str) return null;
  const s = String(str).replace(/\s+/g, "").trim();
  if (!s) return null;

  // YYYY.MM.DD 형식
  let m = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  // YYYY-MM-DD 또는 YYYY/MM/DD 형식
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  // MM/DD/YYYY 형식
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}`;

  // YY/MM 형식 (20YY로 가정)
  m = s.match(/^(\d{2})\/(\d{1,2})$/);
  if (m) {
    const year = 2000 + parseInt(m[1], 10);
    return `${year}-${m[2].padStart(2, "0")}`;
  }

  return null;
};
