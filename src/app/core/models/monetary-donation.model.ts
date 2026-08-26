export type MonetaryDonationStatus = 'declarada' | 'confirmada' | 'rechazada';

/** Monto mínimo, espejo del backend (`MIN_DONATION_AMOUNT`). Si cambia allá,
 * cambia acá: la validación del cliente es de cortesía, la que manda es la API. */
export const MIN_DONATION_AMOUNT = 100;

/** Una donación económica tal como la devuelve el panel. */
export interface MonetaryDonation {
  id: string;
  amount: number;
  status: MonetaryDonationStatus;
  method: 'transferencia' | 'mercadopago';
  operationNumber: string | null;
  receiptUrl: string | null;
  donorName: string | null;
  donorContact: string | null;
  rejectReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface MonetaryDonationView extends MonetaryDonation {
  donor: string;
  amountLabel: string;
  date: string;
  statusLabel: string;
  statusBg: string;
  statusInk: string;
  /** Solo las declaradas admiten decisión; el backend lo vuelve a controlar. */
  decidable: boolean;
}

const STATUS_LABEL: Record<MonetaryDonationStatus, string> = {
  declarada: 'Pendiente',
  confirmada: 'Confirmada',
  rechazada: 'Rechazada',
};

/**
 * Tokens de estado, no hex sueltos: `needs.service.ts` y `shared/ui/badge`
 * tienen colores hardcodeados y están marcados como deuda en DESIGN_SYSTEM;
 * no se replica acá.
 */
const STATUS_COLOR: Record<MonetaryDonationStatus, { bg: string; ink: string }> = {
  declarada: { bg: 'var(--hn-warning-bg)', ink: 'var(--hn-warning-ink)' },
  confirmada: { bg: 'var(--hn-success-bg)', ink: 'var(--hn-success-ink)' },
  rechazada: { bg: 'var(--hn-danger-bg)', ink: 'var(--hn-danger-ink)' },
};

const MONEY = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export function fmtMoney(amount: number): string {
  return MONEY.format(amount);
}

export function toMonetaryView(
  donation: MonetaryDonation,
  fmtDate: (iso: string) => string,
): MonetaryDonationView {
  const color = STATUS_COLOR[donation.status];
  return {
    ...donation,
    donor: donation.donorName?.trim() || 'Anónimo',
    amountLabel: fmtMoney(donation.amount),
    // `createdAt` viene con hora; `fmtDate` espera 'YYYY-MM-DD'.
    date: fmtDate(donation.createdAt.slice(0, 10)),
    statusLabel: STATUS_LABEL[donation.status],
    statusBg: color.bg,
    statusInk: color.ink,
    decidable: donation.status === 'declarada',
  };
}
