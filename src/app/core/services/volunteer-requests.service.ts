import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  REQUEST_COLORS,
  REQUEST_LABEL,
  VolunteerRequest,
  VolunteerRequestView,
} from '../models/volunteer-request.model';

/**
 * Solicitudes de voluntario (QK-16). Va aparte de `VolunteeringService` a
 * propósito: ese ya carga el listado de actividades y el estado del formulario,
 * y son ciclos de vida distintos.
 */
@Injectable({ providedIn: 'root' })
export class VolunteerRequestsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/volunteering/requests`;

  private readonly _requests = signal<VolunteerRequest[]>([]);
  readonly requests = this._requests.asReadonly();

  readonly views = computed<VolunteerRequestView[]>(() =>
    this._requests().map((request) => ({
      ...request,
      label: REQUEST_LABEL[request.status],
      bg: REQUEST_COLORS[request.status].bg,
      ink: REQUEST_COLORS[request.status].ink,
      pending: request.status === 'pending',
      target: request.opportunityTitle ?? request.volunteerTypeName ?? '',
    })),
  );

  readonly pendingCount = computed(
    () => this._requests().filter((request) => request.status === 'pending').length,
  );

  load(): Observable<VolunteerRequest[]> {
    return this.http
      .get<VolunteerRequest[]>(this.apiUrl)
      .pipe(tap((list) => this._requests.set(list)));
  }

  approve(id: string): Observable<VolunteerRequest> {
    return this.http
      .patch<VolunteerRequest>(`${this.apiUrl}/${id}/approve`, {})
      .pipe(tap((updated) => this.replace(updated)));
  }

  reject(id: string, reason: string): Observable<VolunteerRequest> {
    return this.http
      .patch<VolunteerRequest>(`${this.apiUrl}/${id}/reject`, { reason })
      .pipe(tap((updated) => this.replace(updated)));
  }

  private replace(updated: VolunteerRequest): void {
    this._requests.update((list) =>
      list.map((request) => (request.id === updated.id ? updated : request)),
    );
  }
}
