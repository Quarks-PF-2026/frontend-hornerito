import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly pass = signal('');
  readonly loginErr = signal('');
  readonly unverified = signal(false);
  readonly resending = signal(false);
  readonly resendMsg = signal('');

  /**
   * El aviso de cuenta sin verificar era un callejón sin salida si el enlace
   * del registro venció o nunca llegó: desde acá se pide uno nuevo.
   */
  resend(): void {
    const email = this.email().trim();
    if (!email || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.auth.resendVerification(email).subscribe({
      next: (r) => {
        this.resending.set(false);
        this.resendMsg.set(r.message);
      },
      error: (err: HttpErrorResponse) => {
        this.resending.set(false);
        // 503 = el backend no pudo mandar el correo y trae un mensaje accionable.
        const generic = 'No pudimos reenviar el correo. Intentá de nuevo en unos minutos.';
        this.resendMsg.set(err.status === 503 ? (err.error?.message ?? generic) : generic);
      },
    });
  }

  submit(): void {
    this.resendMsg.set('');
    if (!this.email() || !this.pass()) {
      this.loginErr.set('Completá tu correo y tu contraseña.');
      this.unverified.set(false);
      return;
    }
    this.auth.login(this.email(), this.pass()).subscribe((r) => {
      if (r.ok) {
        // Un donante no tiene nada que hacer en el panel: va al inicio. El
        // criterio (rol, admin de plataforma o cuenta de organización) vive en
        // AuthService.hasPanelAccess.
        this.router.navigateByUrl(this.auth.hasPanelAccess() ? '/app' : '/');
        return;
      }
      this.loginErr.set(r.error);
      this.unverified.set(r.unverified);
    });
  }

  goRegister(): void {
    this.router.navigateByUrl('/register');
  }

  goForgotPassword(): void {
    this.router.navigateByUrl('/forgot-password');
  }
}
