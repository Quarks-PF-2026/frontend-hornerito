import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Org } from '../models/org.model';

export type OrgPatch = Pick<Org, 'name' | 'description' | 'address' | 'contact'> & {
  seeksVolunteers?: boolean;
  /** Datos bancarios (QK-20). String vacío borra el dato; ausente no lo toca. */
  paymentAlias?: string;
  paymentHolder?: string;
  paymentCuit?: string;
  paymentBank?: string;
};

@Injectable({ providedIn: 'root' })
export class OrgService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _org = signal<Org | null>(null);
  readonly org = this._org.asReadonly();

  load(): Observable<Org | null> {
    return this.http.get<Org[]>(`${this.apiUrl}/organization/me`).pipe(
      map((orgs) => orgs[0] ?? null),
      tap((org) => this._org.set(org)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          this._org.set(null);
          return of(null);
        }
        throw err;
      }),
    );
  }

  save(patch: OrgPatch): Observable<Org> {
    return this.http
      .put<Org>(`${this.apiUrl}/organization/me`, patch)
      .pipe(tap((org) => this._org.set(org)));
  }

  /**
   * El interruptor de "buscamos voluntarios" (QK-16). Reusa el mismo PUT que
   * el resto del perfil, que espera la entidad completa: el backend valida
   * todos los campos, así que se reenvían los actuales sin tocarlos.
   */
  setSeeksVolunteers(value: boolean): Observable<Org> {
    const org = this._org();
    if (!org) {
      throw new Error('No hay organización cargada.');
    }
    return this.save({
      name: org.name,
      description: org.description,
      address: org.address,
      contact: org.contact,
      seeksVolunteers: value,
    });
  }
}
