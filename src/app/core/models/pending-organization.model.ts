/**
 * Organización en la cola de validación del administrador de plataforma
 * (QK-19). Trae al representante embebido porque quien valida no tiene
 * membresía en esa organización y no puede pedirlo por otro lado.
 */
export interface PendingOrganization {
  id: string;
  name: string;
  description: string;
  address: string;
  contact: string;
  /** ISO 8601; el backend ya devuelve la cola de la más antigua a la más nueva. */
  createdAt: string;
  owner: { name: string; email: string };
}

/** Vista con la fecha de solicitud ya formateada, como `VolunteerRequestView`. */
export interface PendingOrganizationView extends PendingOrganization {
  requestedAt: string;
}
