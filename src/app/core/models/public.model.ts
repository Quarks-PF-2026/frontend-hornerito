import { ScheduleDay } from './collection-point.model';

/** Página genérica que devuelven los endpoints públicos. */
export interface PublicPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicOrgSummary {
  id: string;
  name: string;
  description: string;
  address: string;
  logoUrl: string | null;
  coverUrl: string | null;
  openNeedsCount: number;
  categories: string[];
}

export interface PublicNeed {
  id: string;
  supplyName: string;
  supplyCategory: string;
  supplyUnit: string;
  requiredQuantity: number;
  coveredQuantity: number;
  deadline: string;
}

export interface PublicCollectionPoint {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone: string;
  schedule: ScheduleDay[];
}

export interface PublicPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

/** Actividad de voluntariado abierta, tal como la ve un visitante. */
export interface PublicOpportunity {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  capacity: number;
  acceptedCount: number;
  volunteerTypeId: string | null;
  volunteerTypeName: string | null;
}

export interface PublicVolunteerType {
  id: string;
  name: string;
}

export interface PublicVolunteering {
  /** Interruptor de la organización: sin esto la sección no se muestra. */
  seeksVolunteers: boolean;
  types: PublicVolunteerType[];
  opportunities: PublicOpportunity[];
}

/** Lo que manda el formulario público. `opportunityId` y `volunteerTypeId` son
 * excluyentes: o se postula a una actividad, o a la organización eligiendo tipo. */
export interface VolunteerRequestPayload {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  opportunityId?: string;
  volunteerTypeId?: string;
}

export interface PublicOrgDetail {
  id: string;
  name: string;
  description: string;
  address: string;
  contact: string;
  logoUrl: string | null;
  coverUrl: string | null;
  needs: PublicNeed[];
  collectionPoints: PublicCollectionPoint[];
  posts: PublicPost[];
  volunteering: PublicVolunteering;
}
