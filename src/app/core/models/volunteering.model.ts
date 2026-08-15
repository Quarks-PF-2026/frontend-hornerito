export type OpportunityStatus = 'open' | 'closed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  /** ISO con fecha y hora de inicio de la actividad. */
  startsAt: string;
  location: string;
  /** Tipo del catálogo de la organización; null si la actividad no se clasificó. */
  volunteerTypeId: string | null;
  capacity: number;
  acceptedCount: number;
  status: OpportunityStatus;
  /** Deriva de status + cupos: lo calcula el backend. */
  isOpen: boolean;
  /** Cómo le fue al voluntario que está mirando; null si no se postuló. */
  myApplicationStatus: ApplicationStatus | null;
  pendingCount: number;
}

/** Datos que viajan al backend al crear o editar una oportunidad. */
export interface OpportunityPatch {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  volunteerTypeId: string | null;
  capacity: number;
}

export interface Application {
  id: string;
  opportunityId: string;
  userId: string;
  volunteerName: string;
  volunteerEmail: string;
  status: ApplicationStatus;
  createdAt: string;
  decidedAt: string | null;
}

/** Vista derivada de una oportunidad, con textos y estilos ya calculados. */
export interface OpportunityView {
  id: string;
  title: string;
  description: string;
  location: string;
  when: string;
  /** Nombre del tipo de voluntario; '' si la actividad no tiene uno. */
  volunteerTypeName: string;
  cupos: string;
  isOpen: boolean;
  status: OpportunityStatus;
  myApplicationStatus: ApplicationStatus | null;
  pendingCount: number;
  badge: string;
  badgeBg: string;
  badgeInk: string;
  cardOpacity: string;
}

export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

/** Colores de estado de la postulación, tomados de los tokens de estado. */
export const APPLICATION_COLORS: Record<ApplicationStatus, { bg: string; ink: string }> = {
  pending: { bg: 'var(--hn-warning-bg)', ink: 'var(--hn-warning-ink)' },
  accepted: { bg: 'var(--hn-success-bg)', ink: 'var(--hn-success-ink)' },
  rejected: { bg: 'var(--hn-danger-bg)', ink: 'var(--hn-danger-ink)' },
};

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "sáb, 12 sept, 17:00" — fecha y hora en una línea. */
export function whenLabel(startsAt: string): string {
  return DATE_FORMAT.format(new Date(startsAt));
}

/** `startsAt` ISO → valor de un `<input type="datetime-local">` (hora local). */
export function toDatetimeLocal(startsAt: string): string {
  const date = new Date(startsAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
