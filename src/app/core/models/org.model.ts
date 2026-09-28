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
  /**
   * Ubicación elegida del buscador de direcciones (QK-112). Las tres viajan
   * juntas: salen de una sola sugerencia, nunca se escriben a mano.
   */
  locality: string | null;
  province: string | null;
  country: string | null;
}

/** Localidad elegida del buscador, con lo que la acompaña (QK-112). */
export interface PickedLocality {
  locality: string;
  province: string | null;
  country: string | null;
}

/** "Villa María, Córdoba" — la provincia solo si vino. Vacío si no hay localidad. */
export function localityLabel(locality: string | null, province: string | null): string {
  if (!locality) return '';
  return province ? `${locality}, ${province}` : locality;
}
