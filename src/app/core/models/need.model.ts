export interface Need {
  id: number;
  supplyId: number;
  required: number;
  covered: number;
  deadline: string; // ISO yyyy-mm-dd
  closedManual: boolean;
}

/** Vista derivada de una necesidad, con estilos y textos calculados. */
export interface NeedView {
  id: number;
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
