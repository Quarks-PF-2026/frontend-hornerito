export type VolunteerRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Solicitud llegada desde la ficha pública (QK-16). No hay usuario todavía:
 * los datos de contacto viven en la solicitud hasta que la persona acepta la
 * invitación que se le manda al aprobarla.
 */
export interface VolunteerRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: VolunteerRequestStatus;
  rejectReason: string | null;
  opportunityId: string | null;
  opportunityTitle: string | null;
  volunteerTypeId: string | null;
  volunteerTypeName: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** Vista con textos y estilos ya resueltos, como `OpportunityView`. */
export interface VolunteerRequestView extends VolunteerRequest {
  label: string;
  bg: string;
  ink: string;
  pending: boolean;
  /** "Cocina" o el título de la actividad; '' si no eligió nada. */
  target: string;
}

export const REQUEST_LABEL: Record<VolunteerRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

/** Mismos tokens de estado que usan las postulaciones. */
export const REQUEST_COLORS: Record<VolunteerRequestStatus, { bg: string; ink: string }> = {
  pending: { bg: 'var(--hn-warning-bg)', ink: 'var(--hn-warning-ink)' },
  approved: { bg: 'var(--hn-success-bg)', ink: 'var(--hn-success-ink)' },
  rejected: { bg: 'var(--hn-danger-bg)', ink: 'var(--hn-danger-ink)' },
};
