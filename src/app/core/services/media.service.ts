import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Media,
  MediaOwnerType,
  MediaResourceType,
  PostMedia,
  mediaKindOf,
} from '../models/media.model';

/**
 * Firma de una subida. `params` va tal cual al multipart de Cloudinary: la
 * firma los cubre a todos, así que no se agrega ni se quita ninguno.
 */
export interface UploadSignature {
  cloudName: string;
  params: {
    public_id: string;
    timestamp: number;
    allowed_formats: string;
    overwrite?: string;
    api_key: string;
    signature: string;
  };
}

/**
 * Imágenes de cualquier entidad. El backend resuelve el tenant a partir del
 * token, así que acá no hace falta mandar nada de la organización.
 */
@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(ownerType: MediaOwnerType, ownerId: string): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.apiUrl}/media/${ownerType}/${ownerId}`);
  }

  upload(
    ownerType: MediaOwnerType,
    ownerId: string,
    purpose: string,
    file: File,
  ): Observable<Media> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<Media>(`${this.apiUrl}/media/${ownerType}/${ownerId}/${purpose}`, body);
  }

  /**
   * Adjunto de publicación. El archivo no pasa por nuestro backend (los videos
   * pesan hasta 50 MB): el backend firma, el navegador sube directo a
   * Cloudinary y después el backend confirma y registra el `public_id`.
   *
   * Cada firma vale para un único archivo: fija el `public_id`, y es ese id
   * firmado (no el que devuelve Cloudinary) el que se confirma. La subida a
   * Cloudinary no lleva el JWT porque el interceptor solo lo agrega a URLs de
   * nuestra API.
   */
  uploadAttachment(postId: string, file: File): Observable<PostMedia> {
    const base = `${this.apiUrl}/media/post/${postId}/attachment`;
    // Quien llama ya validó el archivo; ante la duda se sube como imagen.
    const resourceType = mediaKindOf(file) ?? 'image';
    return this.http.post<UploadSignature>(`${base}/signature`, null).pipe(
      switchMap((signature) =>
        this.uploadSigned(signature, file, resourceType).pipe(
          switchMap(() =>
            this.http.post<Media>(`${base}/confirm`, {
              publicId: signature.params.public_id,
              resourceType,
            }),
          ),
        ),
      ),
      map(({ id, url, resourceType, width, height }) => ({ id, url, resourceType, width, height })),
    );
  }

  /**
   * Paso del medio de toda subida directa: el archivo va del navegador a
   * Cloudinary con la firma que armó el backend. Lo usan los adjuntos de
   * publicación y las historias (QK-111); cada uno pide su firma y confirma
   * contra su propio endpoint.
   */
  uploadSigned(
    { cloudName, params }: UploadSignature,
    file: File,
    resourceType: MediaResourceType,
  ): Observable<unknown> {
    const body = new FormData();
    body.append('file', file);
    for (const [key, value] of Object.entries(params)) body.append(key, String(value));
    return this.http.post(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      body,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/media/${id}`);
  }
}
