import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly checkingToken = signal(true);
  readonly tokenExpired = signal(false);

  readonly pass = signal('');
  readonly confirmPass = signal('');
  readonly submitErr = signal('');
  readonly success = signal(false);
  readonly loading = signal(false);

  token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (!this.token) {
      this.checkingToken.set(false);
      this.tokenExpired.set(true);
      return;
    }

    this.auth.verifyResetToken(this.token).subscribe((isValid) => {
      this.checkingToken.set(false);
      this.tokenExpired.set(!isValid);
    });
  }

  submit(): void {
    if (!this.pass() || !this.confirmPass()) {
      this.submitErr.set('Completá ambos campos de contraseña.');
      return;
    }

    if (this.pass().length < 8) {
      this.submitErr.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (this.pass() !== this.confirmPass()) {
      this.submitErr.set('Las contraseñas no coinciden.');
      return;
    }

    this.submitErr.set('');
    this.loading.set(true);

    this.auth.resetPassword(this.token, this.pass(), this.confirmPass()).subscribe((r) => {
      this.loading.set(false);
      if (r.ok) {
        this.success.set(true);
      } else {
        this.submitErr.set(r.error);
      }
    });
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }

  goForgotPassword(): void {
    this.router.navigateByUrl('/forgot-password');
  }
}
