export type OrgStatus = 'pending' | 'validated' | 'rejected';

export interface Org {
  id: string;
  name: string;
  description: string;
  address: string;
  contact: string;
  status: OrgStatus;
  rejectReason: string | null;
  /** Prende la sección "Sumate como voluntario" en la ficha pública (QK-16). */
  seeksVolunteers: boolean;
  /** Alias o CBU: cargarlo prende la sección "Donar dinero" (QK-20). */
  paymentAlias: string | null;
  paymentHolder: string | null;
  paymentCuit: string | null;
  paymentBank: string | null;
}
