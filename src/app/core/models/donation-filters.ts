import { HttpParams } from '@angular/common/http';
import { DonationView } from './donation.model';
import { MonetaryDonationStatus, MonetaryDonationView } from './monetary-donation.model';

/**
 * Filtros y totales del historial de donaciones (QK-23).
 *
 * El filtrado lo hace el backend: acá solo se arma el query string y se
 * resumen las filas que volvieron. Vive fuera del componente para poder
 * probarlo sin montar Angular.
 */

/** Rango de días 'AAAA-MM-DD', tal como los deja un `<input type="date">`. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface MonetaryDonationQuery extends DateRange {
  status?: MonetaryDonationStatus | '';
}

/**
 * Pasa el filtro a query params, salteando lo vacío. Un parámetro vacío no es
 * lo mismo que ausente: el DTO del backend rechaza `from=` porque no tiene
 * formato de fecha.
 */
export function toHttpParams(
  query: MonetaryDonationQuery,
  params: HttpParams,
): HttpParams {
  let result = params;
  for (const [key, value] of Object.entries(query)) {
    if (value) result = result.set(key, value);
  }
  return result;
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
