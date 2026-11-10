import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

  submit(): void {
    if (!this.email() || !this.pass()) {
      this.loginErr.set('Completá tu correo y tu contraseña.');
      this.unverified.set(false);
      return;
    }
    this.auth.login(this.email(), this.pass()).subscribe((r) => {
      if (r.ok) {
        // Sin organización (un donante) el panel solo le ofrece crear un
        // comedor: va al inicio. El admin de plataforma sin organización entra
        // igual al panel, porque ahí vive la validación.
        const hasOrgAccess = !!this.auth.role() || this.auth.isPlatformAdmin();
        this.router.navigateByUrl(hasOrgAccess ? '/app' : '/');
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
