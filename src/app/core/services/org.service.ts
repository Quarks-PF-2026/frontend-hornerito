import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Org } from '../models/org.model';
import { AuthService, LoginResponse } from './auth.service';

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
  private readonly auth = inject(AuthService);
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
    // Sin organización cargada, este PUT no edita: crea la organización y la
    // membresía de dueño. El JWT en curso se firmó en el login, cuando esa
    // membresía todavía no existía, así que no lleva `orgId` y todo endpoint
    // protegido por TenantGuard responde 403 hasta el próximo login. Por eso
    // se renueva la sesión en el acto, igual que al aceptar una invitación.
    const creating = this._org() === null;
    return this.http.put<Org>(`${this.apiUrl}/organization/me`, patch).pipe(
      tap((org) => this._org.set(org)),
      switchMap((org) => (creating ? this.refreshSession(org) : of(org))),
    );
  }

  /**
   * Cambia la sesión a la organización recién creada. Reusa `switch-org`, que
   * corre solo con JwtAuthGuard: funciona con el token viejo, todavía sin
   * `orgId`.
   */
  private refreshSession(org: Org): Observable<Org> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/switch-org`, { organizationId: org.id })
      .pipe(
        tap((res) => this.auth.startSession(res.accessToken, res.role, res.user.email)),
        map(() => org),
        catchError(() => {
          // La organización quedó creada; lo que falló es renovar el token.
          // Seguir con el token viejo deja la app dando 403 en silencio, así
          // que se corta la sesión: volver a entrar la deja consistente.
          this.auth.logout();
          return EMPTY;
        }),
      );
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
