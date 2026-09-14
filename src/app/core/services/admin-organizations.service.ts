import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Org } from '../models/org.model';
import {
  PendingOrganization,
  PendingOrganizationView,
} from '../models/pending-organization.model';
import { fmtDate } from '../util/format';

/**
 * Cola de validación de organizaciones (QK-19). Es del administrador de
 * plataforma, no de un tenant: por eso vive aparte de `OrgService`, que
 * representa la organización propia de la sesión.
 */
@Injectable({ providedIn: 'root' })
export class AdminOrganizationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/organizations`;

  private readonly _pending = signal<PendingOrganization[]>([]);
  readonly pending = this._pending.asReadonly();

  readonly views = computed<PendingOrganizationView[]>(() =>
    this._pending().map((org) => ({
      ...org,
      // Se corta a la fecha para que `fmtDate` no tenga que entender la hora.
      requestedAt: fmtDate((org.createdAt ?? '').slice(0, 10)),
    })),
  );

  /** El orden lo decide el backend (más antigua primero); acá no se reordena. */
  load(): Observable<PendingOrganization[]> {
    return this.http
      .get<PendingOrganization[]>(`${this.apiUrl}/pending`)
      .pipe(tap((list) => this._pending.set(list)));
  }

  approve(id: string): Observable<Org> {
    return this.http
      .patch<Org>(`${this.apiUrl}/${id}/validate`, {})
      .pipe(tap(() => this.remove(id)));
  }

  reject(id: string, reason: string): Observable<Org> {
    return this.http
      .patch<Org>(`${this.apiUrl}/${id}/reject`, { reason })
      .pipe(tap(() => this.remove(id)));
  }

  /** Decidida deja de estar pendiente, así que sale de la cola sin recargar. */
  private remove(id: string): void {
    this._pending.update((list) => list.filter((org) => org.id !== id));
  }
}
