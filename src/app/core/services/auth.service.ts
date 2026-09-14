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

export interface LoginResponse {
  accessToken: string;
  user: { id: string; name: string; email: string; isPlatformAdmin: boolean; phone: string | null };
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

  /**
   * Administrador de plataforma (QK-19): es un atributo del usuario, no de la
   * membresía, así que no depende de la organización activa. Igual que el rol,
   * solo arma el menú: el backend revalida en cada request a `/admin/*`.
   */
  private readonly _isPlatformAdmin = signal(localStorage.getItem('isPlatformAdmin') === 'true');
  readonly isPlatformAdmin = this._isPlatformAdmin.asReadonly();

  /** Correo de la sesión activa, para no ofrecerse acciones sobre uno mismo. */
  private readonly _currentEmail = signal(localStorage.getItem('userEmail') ?? '');
  readonly currentEmail = this._currentEmail.asReadonly();

  /**
   * Nombre y teléfono de la sesión activa (QK-11). Se guardan acá, y no solo
   * en el estado local de la página de perfil, para que un menú o saludo que
   * los use en el futuro no dependa de un nuevo login para verlos al día.
   */
  private readonly _currentName = signal(localStorage.getItem('userName') ?? '');
  readonly currentName = this._currentName.asReadonly();
  private readonly _currentPhone = signal<string | null>(localStorage.getItem('userPhone'));
  readonly currentPhone = this._currentPhone.asReadonly();

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

  /** Consume el token del correo de verificación. false si venció o ya se usó. */
  verifyEmail(token: string): Observable<boolean> {
    return this.http.get<void>(`${this.apiUrl}/auth/verify`, { params: { token } }).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-verification`, {
      email,
    });
  }

  login(email: string, pass: string): Observable<LoginResult> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password: pass }).pipe(
      tap((res) =>
        this.startSession(
          res.accessToken,
          res.role,
          res.user.email,
          res.user.isPlatformAdmin,
          res.user.name,
          res.user.phone,
        ),
      ),
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

  /**
   * Guarda la sesión; la usan el login, la aceptación de una invitación y el
   * cambio de organización activa. `name`/`phone` son opcionales porque no
   * todos esos flujos los devuelven todavía (QK-11 solo lo confirmó para
   * login) — si faltan, se conserva lo que ya había en la sesión.
   */
  startSession(
    accessToken: string,
    role: MemberRole | null,
    email: string,
    isPlatformAdmin: boolean,
    name?: string,
    phone?: string | null,
  ): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('userEmail', email);
    if (role) {
      localStorage.setItem('role', role);
    } else {
      localStorage.removeItem('role');
    }
    // Estricto contra `true`: una respuesta sin el campo no promueve a nadie.
    const platformAdmin = isPlatformAdmin === true;
    if (platformAdmin) {
      localStorage.setItem('isPlatformAdmin', 'true');
    } else {
      localStorage.removeItem('isPlatformAdmin');
    }
    this._role.set(role);
    this._isPlatformAdmin.set(platformAdmin);
    this._currentEmail.set(email);
    this._authenticated.set(true);
    if (name !== undefined) this.setSessionName(name);
    if (phone !== undefined) this.setSessionPhone(phone);
  }

  /**
   * Actualiza nombre/teléfono reflejados en la sesión después de un PATCH
   * exitoso a `/profile` (QK-11), para que un consumidor futuro (menú,
   * top-bar) no necesite un nuevo login para verlos al día. El componente de
   * perfil no escribe `localStorage` directamente: pasa siempre por acá.
   */
  updateProfileSession(name: string, phone: string | null): void {
    this.setSessionName(name);
    this.setSessionPhone(phone);
  }

  private setSessionName(name: string): void {
    localStorage.setItem('userName', name);
    this._currentName.set(name);
  }

  private setSessionPhone(phone: string | null): void {
    if (phone) {
      localStorage.setItem('userPhone', phone);
    } else {
      localStorage.removeItem('userPhone');
    }
    this._currentPhone.set(phone);
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isPlatformAdmin');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    this._role.set(null);
    this._isPlatformAdmin.set(false);
    this._currentEmail.set('');
    this._currentName.set('');
    this._currentPhone.set(null);
    this._authenticated.set(false);
    this.router.navigateByUrl('/login');
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  verifyResetToken(token: string): Observable<boolean> {
    return this.http
      .get<void>(`${this.apiUrl}/auth/verify-reset-token`, { params: { token } })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ): Observable<{ ok: boolean; error: string }> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/reset-password`, { token, password, confirmPassword })
      .pipe(
        map(() => ({ ok: true, error: '' })),
        catchError((err: HttpErrorResponse) => {
          const error =
            err.error?.message ??
            'No se pudo restablecer la contraseña. Intentá de nuevo.';
          return of({ ok: false, error });
        }),
      );
  }
}
