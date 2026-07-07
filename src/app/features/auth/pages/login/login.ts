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
    const r = this.auth.login(this.email(), this.pass());
    if (r.ok) {
      this.router.navigateByUrl('/app');
      return;
    }
    this.loginErr.set(r.error);
    this.unverified.set(r.unverified);
  }

  goRegister(): void {
    this.router.navigateByUrl('/register');
  }
}
