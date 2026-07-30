import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MemberRole, canManageMembers, canWriteContent } from '../models/member.model';
import { emailOk } from '../util/format';

export interface LoginResult {
  ok: boolean;
  unverified: boolean;
  error: string;
}

interface LoginResponse {
  accessToken: string;
  user: { id: string; name: string; email: string };
  role: MemberRole | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly _authenticated = signal(!!localStorage.getItem('accessToken'));
  readonly authenticated = this._authenticated.asReadonly();

  /**
   * Rol en la organización activa. Solo sirve para armar el menú: el backend
   * revalida los permisos en cada request.
   */
  private readonly _role = signal<MemberRole | null>(
    (localStorage.getItem('role') as MemberRole | null) ?? null,
  );
  readonly role = this._role.asReadonly();

  /** Permisos derivados del rol, para mostrar u ocultar acciones en la UI. */
  readonly canWriteContent = computed(() => canWriteContent(this._role()));
  readonly canManageMembers = computed(() => canManageMembers(this._role()));
  readonly isOwner = computed(() => this._role() === 'owner');

  /** Correo de la sesión activa, para no ofrecerse acciones sobre uno mismo. */
  private readonly _currentEmail = signal(localStorage.getItem('userEmail') ?? '');
  readonly currentEmail = this._currentEmail.asReadonly();

  /** Correo del último registro, para la pantalla de verificación. */
  readonly registeredEmail = signal('');

  emailOk = emailOk;

  register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
    acceptedTerms: boolean,
  ): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${this.apiUrl}/auth/register`, {
      name,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });
  }

  login(email: string, pass: string): Observable<LoginResult> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password: pass }).pipe(
      tap((res) => this.startSession(res.accessToken, res.role, res.user.email)),
      map((): LoginResult => ({ ok: true, unverified: false, error: '' })),
      catchError((err: HttpErrorResponse) => {
        const unverified = Boolean(err.error?.unverified);
        const error = unverified
          ? ''
          : (err.error?.message ?? 'Correo o contraseña incorrectos. Revisá los datos e intentá de nuevo.');
        return of<LoginResult>({ ok: false, unverified, error });
      }),
    );
  }

  /** Guarda la sesión; la usan el login y la aceptación de una invitación. */
  startSession(accessToken: string, role: MemberRole | null, email: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('userEmail', email);
    if (role) {
      localStorage.setItem('role', role);
    } else {
      localStorage.removeItem('role');
    }
    this._role.set(role);
    this._currentEmail.set(email);
    this._authenticated.set(true);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userEmail');
    this._role.set(null);
    this._currentEmail.set('');
    this._authenticated.set(false);
    this.router.navigateByUrl('/login');
  }
}
