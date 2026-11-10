import { HttpErrorResponse } from '@angular/common/http';
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
  readonly mailSent = this.auth.verificationMailSent;

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
        // El reenvío salió: la alerta del registro ya no aplica. Solo si fue al
        // mismo correo del registro; si se editó el campo, el texto "Te
        // enviamos un correo a <registro>" seguiría siendo falso.
        if (email === this.email()) this.mailSent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.resending.set(false);
        // 503 = el backend no pudo mandar el correo y trae un mensaje
        // accionable; cualquier otro error queda en el genérico.
        const generic = 'No pudimos reenviar el correo. Intentá de nuevo en unos minutos.';
        this.resendMsg.set(err.status === 503 ? (err.error?.message ?? generic) : generic);
      },
    });
  }

  goLogin(): void {
    // El aviso es del registro que acaba de pasar; una visita posterior a
    // /verify en la misma pestaña no tiene que heredarlo.
    this.mailSent.set(true);
    this.router.navigateByUrl('/login');
  }
}
