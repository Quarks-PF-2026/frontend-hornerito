import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MediaResourceType } from '../models/media.model';
import { Story, StoryList, StoryPayload } from '../models/story.model';
import { expiresInLabel } from '../util/format';
import { MediaService, UploadSignature } from './media.service';

/** Firma de una historia: la misma de `signUpload` más el id que después se confirma. */
type StorySignature = UploadSignature & { publicId: string };

export interface StoryView extends Story {
  isVideo: boolean;
  /** Vigentes: "Vence en 3 días". Vencidas: "Venció el 2 nov". */
  when: string;
}

const EXPIRED_FORMAT = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

/** Historias de la organización en el panel (QK-111). El tenant sale del token. */
@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);
  private readonly media = inject(MediaService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _active = signal<Story[]>([]);
  private readonly _expired = signal<Story[]>([]);
  readonly active = this._active.asReadonly();
  readonly expired = this._expired.asReadonly();

  // El "vence en" se calcula al derivar, no en vivo: alcanza con la precisión
  // de la última carga o alta, el panel no queda abierto días.
  readonly activeViews = computed<StoryView[]>(() =>
    this._active().map((s) => ({
      ...s,
      isVideo: s.mediaType === 'video',
      when: expiresInLabel(s.expiresAt),
    })),
  );
  readonly expiredViews = computed<StoryView[]>(() =>
    this._expired().map((s) => ({
      ...s,
      isVideo: s.mediaType === 'video',
      when: `Venció el ${EXPIRED_FORMAT.format(new Date(s.expiresAt))}`,
    })),
  );

  load(): Observable<StoryList> {
    return this.http.get<StoryList>(`${this.apiUrl}/stories`).pipe(
      tap(({ active, expired }) => {
        this._active.set(active ?? []);
        this._expired.set(expired ?? []);
      }),
    );
  }

  /**
   * Misma subida directa que los adjuntos de publicación: el backend firma, el
   * navegador sube a Cloudinary y el alta confirma el `publicId` firmado. El
   * backend revalida tipo, peso y duración contra lo que quedó en Cloudinary.
   */
  create(
    file: File,
    resourceType: MediaResourceType,
    extra: Pick<StoryPayload, 'text' | 'linkUrl'>,
  ): Observable<Story> {
    return this.http
      .post<StorySignature>(`${this.apiUrl}/stories/signature`, { resourceType })
      .pipe(
        switchMap((signature) =>
          this.media.uploadSigned(signature, file, resourceType).pipe(
            switchMap(() =>
              this.http.post<Story>(`${this.apiUrl}/stories`, {
                publicId: signature.publicId,
                resourceType,
                ...extra,
              } satisfies StoryPayload),
            ),
          ),
        ),
        tap((story) => this._active.update((list) => [story, ...list])),
      );
  }

  /** Borrado lógico (§18): sale de vigentes y no pasa al historial. */
  remove(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/stories/${encodeURIComponent(id)}`)
      .pipe(tap(() => this._active.update((list) => list.filter((s) => s.id !== id))));
  }
}
