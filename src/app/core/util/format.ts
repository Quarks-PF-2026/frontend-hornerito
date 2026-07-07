const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Formatea 'YYYY-MM-DD' a 'D mmm' (ej: '2026-07-15' → '15 jul'). */
export function fmtDate(iso: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return parseInt(p[2], 10) + ' ' + MESES[parseInt(p[1], 10) - 1];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function emailOk(e: string): boolean {
  return EMAIL_RE.test(e);
}
