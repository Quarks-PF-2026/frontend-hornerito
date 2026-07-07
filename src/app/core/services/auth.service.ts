import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { emailOk } from '../util/format';

export interface LoginResult {
  ok: boolean;
  unverified: boolean;
  error: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  /** Credenciales demo (según diseño). */
  readonly EXISTING = 'referente@comedor.org';
  readonly UNVERIFIED = 'pendiente@comedor.org';

  private readonly _authenticated = signal(false);
  readonly authenticated = this._authenticated.asReadonly();

  /** Correo del último registro, para la pantalla de verificación. */
  readonly registeredEmail = signal('');

  emailOk = emailOk;

  login(email: string, pass: string): LoginResult {
    if (!email || !pass) {
      return { ok: false, unverified: false, error: 'Completá tu correo y tu contraseña.' };
    }
    const e = email.trim().toLowerCase();
    if (e === this.UNVERIFIED) {
      return { ok: false, unverified: true, error: '' };
    }
    if (e === this.EXISTING && pass === 'hornerito123') {
      this._authenticated.set(true);
      return { ok: true, unverified: false, error: '' };
    }
    return {
      ok: false,
      unverified: false,
      error: 'Correo o contraseña incorrectos. Revisá los datos e intentá de nuevo.',
    };
  }

  logout(): void {
    this._authenticated.set(false);
    this.router.navigateByUrl('/login');
  }
}
