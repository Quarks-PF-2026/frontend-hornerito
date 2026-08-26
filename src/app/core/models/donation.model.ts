export interface DonationItem {
  id: string;
  supplyId: string;
  needId: string | null;
  quantity: number;
}

export interface Donation {
  id: string;
  collectionPointId: string | null;
  donorName: string | null;
  donorContact: string | null;
  /** ISO completo con hora: el backend usa `createdAt` como fecha de entrega. */
  createdAt: string;
  items: DonationItem[];
}

/** Datos que viajan al backend al registrar una donación recibida. */
export interface DonationPatch {
  collectionPointId: string | null;
  donorName: string | null;
  donorContact: string | null;
  items: { supplyId: string; needId: string | null; quantity: number }[];
}

export interface DonationItemView {
  icon: string;
  supply: string;
  quantity: number;
  unit: string;
  /** Texto del aporte a la necesidad, null si el ítem no cubre ninguna. */
  needNote: string | null;
}

/** Vista derivada de una donación, con textos ya calculados. */
export interface DonationView {
  id: string;
  /** ISO crudo, para filtrar por rango sin reparsear `date`. */
  createdAt: string;
  date: string;
  donor: string;
  contact: string | null;
  point: string | null;
  items: DonationItemView[];
}
