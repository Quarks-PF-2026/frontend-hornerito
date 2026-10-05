export interface Need {
  id: string;
  supplyId: string;
  requiredQuantity: number;
  coveredQuantity: number;
  deadline: string; // ISO yyyy-mm-dd
  closedManually: boolean;
  /** Evento al que sirve la necesidad; null si no está asociada. */
  eventId: string | null;
}

/** Vista derivada de una necesidad, con estilos y textos calculados. */
export interface NeedView {
  id: string;
  eventId: string | null;
  supply: string;
  unit: string;
  icon: string;
  covered: number;
  required: number;
  pct: number;
  pctW: string;
  barColor: string;
  deadline: string;
  open: boolean;
  closed: boolean;
  /** Cerrada sólo por vencimiento: editar la fecha la reabre. */
  expired: boolean;
  cardOpacity: string;
  badge: string;
  badgeBg: string;
  badgeInk: string;
  closedNote: string;
}
