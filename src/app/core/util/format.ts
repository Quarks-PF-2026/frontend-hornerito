const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Formatea 'YYYY-MM-DD' a 'D mmm' (ej: '2026-07-15' → '15 jul'). */
export function fmtDate(iso: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return parseInt(p[2], 10) + ' ' + MESES[parseInt(p[1], 10) - 1];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' → 'Vence hoy' | 'Vence mañana' | 'Vence en N días' (QK-108). */
export function dueLabel(iso: string, today = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number);
  // Medianoche local en ambos lados: el día calendario, sin corrimiento por UTC.
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((new Date(y, m - 1, d).getTime() - from.getTime()) / DAY_MS);
  if (days <= 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function emailOk(e: string): boolean {
  return EMAIL_RE.test(e);
}

/** '+' opcional seguido de 8 a 15 dígitos, sin espacios ni guiones (QK-11). */
const PHONE_RE = /^\+?\d{8,15}$/;
export function phoneOk(p: string): boolean {
  return PHONE_RE.test(p);
}
