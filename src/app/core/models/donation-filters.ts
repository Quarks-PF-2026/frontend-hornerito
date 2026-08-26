import { DonationView } from './donation.model';
import { MonetaryDonationView } from './monetary-donation.model';

/**
 * Filtros y totales del historial de donaciones (QK-23).
 *
 * Viven acá y no en el componente porque son lo único con lógica de la
 * pantalla: separados se pueden probar sin montar Angular.
 */

/**
 * ¿La donación cae en el rango? Los extremos son inclusivos y opcionales:
 * vacío significa "sin límite por ese lado".
 *
 * `iso` viene del backend con hora (`2026-08-26T14:03:00.000Z`) y los
 * extremos vienen de un `<input type="date">` (`2026-08-26`), así que se
 * comparan los primeros 10 caracteres: comparar strings 'YYYY-MM-DD' equivale
 * a comparar fechas y evita construir `Date` con la zona horaria del navegador.
 */
export function inDateRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export interface MonetaryTotals {
  /** Solo lo confirmado: lo declarado todavía no entró a la organización. */
  confirmedAmount: number;
  pendingCount: number;
}

export function monetaryTotals(rows: MonetaryDonationView[]): MonetaryTotals {
  let confirmedAmount = 0;
  let pendingCount = 0;
  for (const row of rows) {
    if (row.status === 'confirmada') confirmedAmount += row.amount;
    if (row.status === 'declarada') pendingCount++;
  }
  return { confirmedAmount, pendingCount };
}

export interface InPersonTotals {
  donations: number;
  /** Unidades recibidas sumando todos los ítems; mezcla kilos con paquetes. */
  items: number;
}

export function inPersonTotals(rows: DonationView[]): InPersonTotals {
  return {
    donations: rows.length,
    items: rows.reduce(
      (total, row) => total + row.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    ),
  };
}
