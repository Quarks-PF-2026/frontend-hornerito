import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * La ruta sirve dos casos: sin `?token` es la pantalla posterior al registro
 * ("revisá tu correo"); con token viene del link del mail y lo consume.
 */
@Component({
  selector: 'app-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './verify.html',
  styleUrl: './verify.scss',
})
export class VerifyPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly email = this.auth.registeredEmail;

  readonly checking = signal(false);
  readonly verified = signal(false);
  readonly failed = signal(false);

  /**
   * Con el link del mail la página puede cargarse en frío, sin el registro
   * previo en memoria, así que el correo del reenvío es editable.
   */
  readonly resendEmail = signal(this.auth.registeredEmail());
  readonly resendMsg = signal('');
  readonly resending = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'] || '';
    if (!token) {
      return;
    }
    this.checking.set(true);
    this.auth.verifyEmail(token).subscribe((ok) => {
      this.checking.set(false);
      this.verified.set(ok);
      this.failed.set(!ok);
    });
  }

  resend(): void {
    const email = this.resendEmail().trim();
    if (!email || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.auth.resendVerification(email).subscribe({
      next: (r) => {
        this.resending.set(false);
        this.resendMsg.set(r.message);
      },
      error: () => {
        this.resending.set(false);
        this.resendMsg.set('No pudimos reenviar el correo. Intentá de nuevo en unos minutos.');
      },
    });
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
