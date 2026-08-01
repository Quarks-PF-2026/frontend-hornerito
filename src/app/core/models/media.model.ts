/** Tipos de cosas que pueden tener imagen. Espeja `MEDIA_OWNERS` del backend. */
export type MediaOwnerType = 'organization';

export interface Media {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  purpose: string;
  url: string;
  width: number;
  height: number;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
