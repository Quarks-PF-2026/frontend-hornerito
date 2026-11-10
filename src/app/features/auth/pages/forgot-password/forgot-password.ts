import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly submitErr = signal('');
  readonly successMsg = signal('');
  readonly loading = signal(false);

  submit(): void {
    const val = this.email().trim();
    if (!val || !this.auth.emailOk(val)) {
      this.submitErr.set('Ingresá un correo electrónico válido.');
      return;
    }

    this.submitErr.set('');
    this.loading.set(true);

    this.auth.forgotPassword(val).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMsg.set(
          res.message ||
            'Si el correo está registrado en nuestro sistema, recibirás un enlace de restablecimiento.',
        );
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // 503 = el correo no salió: decir "recibirás un enlace" sería mentir.
        // El backend ya acepta que esto revele que el correo existe.
        if (err.status === 503) {
          this.submitErr.set(
            err.error?.message ??
              'No pudimos enviar el correo en este momento. Probá de nuevo en unos minutos.',
          );
          return;
        }
        // Por seguridad mostramos el mismo mensaje (Caso 1, PU-3)
        this.successMsg.set(
          'Si el correo está registrado en nuestro sistema, recibirás un enlace de restablecimiento.',
        );
      },
    });
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
