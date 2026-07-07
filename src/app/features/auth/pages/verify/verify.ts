import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './verify.html',
  styleUrl: './verify.scss',
})
export class VerifyPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly email = this.auth.registeredEmail;

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
