import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Media, MediaOwnerType } from '../models/media.model';

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
    return this.http.post<Media>(
      `${this.apiUrl}/media/${ownerType}/${ownerId}/${purpose}`,
      body,
    );
  }
}
