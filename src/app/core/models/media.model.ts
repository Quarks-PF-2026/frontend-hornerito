/** Tipos de cosas que pueden tener imagen. Espeja `MEDIA_OWNERS` del backend. */
export type MediaOwnerType = 'organization' | 'post';

export type MediaResourceType = 'image' | 'video';

export interface Media {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  purpose: string;
  resourceType: MediaResourceType;
  url: string;
  width: number;
  height: number;
}

/** Adjunto tal como viene embebido en una publicación (`GET /posts`, ficha pública). */
export type PostMedia = Pick<Media, 'id' | 'url' | 'resourceType' | 'width' | 'height'>;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

/** Valor de `accept` para el selector de adjuntos: mimes y extensiones. */
export const POST_MEDIA_ACCEPT = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
].join(',');

/**
 * Clasifica un archivo como imagen o video admitidos, o `null` si no lo es.
 * Algunos navegadores (sobre todo móviles) dejan `file.type` vacío: en ese
 * caso se decide por la extensión. HEIC queda afuera porque el backend no lo
 * acepta.
 */
export function mediaKindOf(file: File): MediaResourceType | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) return 'video';
  if (file.type) return null;
  const name = file.name.toLowerCase();
  if (IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'image';
  if (VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'video';
  return null;
}

/**
 * Límites de adjuntos de publicación. Espejan los del backend, que es el que
 * manda: acá solo sirven para avisar antes de gastar una subida.
 */
export const POST_MEDIA_MAX = 4;
export const POST_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
