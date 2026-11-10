import { MediaResourceType, mediaKindOf } from './media.model';

/** Historia de una organización (QK-111, DOMAIN §18). Vence a los 7 días. */
export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: MediaResourceType;
  /** Solo video. */
  durationSec: number | null;
  text: string | null;
  linkUrl: string | null;
  createdAt: string;
  expiresAt: string;
  /**
   * Solo en `GET /public/stories`: si quien mira ya la vio (§18). Opcional
   * porque el perfil público y el panel no lo mandan; ausente cuenta como no vista.
   */
  seen?: boolean;
}

/** `GET /stories`: las vencidas quedan como historial de solo lectura. */
export interface StoryList {
  active: Story[];
  expired: Story[];
}

/** `GET /public/stories`: una entrada por organización con historias vigentes. */
export interface StoryGroup {
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  stories: Story[];
}

export interface StoryPayload {
  publicId: string;
  resourceType: MediaResourceType;
  text?: string;
  linkUrl?: string;
}

/**
 * Límites de §18. Espejan los del backend, que es el que manda: acá solo
 * sirven para avisar antes de gastar una subida.
 */
export const STORY_MAX_ACTIVE = 20;
export const STORY_TEXT_MAX = 200;
export const STORY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const STORY_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const STORY_VIDEO_MAX_SEC = 30;
export const STORY_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm';

/** Igual que los adjuntos de publicación, menos QuickTime: las historias no lo aceptan. */
export function storyKindOf(file: File): MediaResourceType | null {
  if (file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov')) return null;
  return mediaKindOf(file);
}

/**
 * El enlace solo se ofrece si es http/https (§18): nunca `javascript:` ni
 * similares. Además pide un host con TLD, igual que el `@IsUrl` del backend:
 * si el front aceptara `http://localhost`, el rechazo llegaría recién después
 * de subir la media a Cloudinary y el archivo quedaría huérfano.
 */
export function isHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url.trim());
    return (protocol === 'http:' || protocol === 'https:') && /\.[a-z]{2,}$/i.test(hostname);
  } catch {
    return false;
  }
}
