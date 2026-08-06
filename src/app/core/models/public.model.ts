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
}
