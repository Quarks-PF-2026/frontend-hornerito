import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { emailOk } from '../util/format';

export interface LoginResult {
  ok: boolean;
  unverified: boolean;
  error: string;
}

interface LoginResponse {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly _authenticated = signal(!!localStorage.getItem('accessToken'));
  readonly authenticated = this._authenticated.asReadonly();

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
      tap((res) => {
        localStorage.setItem('accessToken', res.accessToken);
        this._authenticated.set(true);
      }),
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

  logout(): void {
    localStorage.removeItem('accessToken');
    this._authenticated.set(false);
    this.router.navigateByUrl('/login');
  }
}
