export interface Need {
  id: string;
  supplyId: string;
  requiredQuantity: number;
  coveredQuantity: number;
  deadline: string; // ISO yyyy-mm-dd
  closedManually: boolean;
}

/** Vista derivada de una necesidad, con estilos y textos calculados. */
export interface NeedView {
  id: string;
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
  cardOpacity: string;
  badge: string;
  badgeBg: string;
  badgeInk: string;
  closedNote: string;
}
