import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly email = signal('');
  readonly pass = signal('');
  readonly confirm = signal('');
  readonly terms = signal(false);
  readonly errors = signal<Record<string, string>>({});
  readonly serverErr = signal('');

  toggleTerms(): void {
    this.terms.update((v) => !v);
  }

  submit(): void {
    const errs: Record<string, string> = {};
    const name = this.name();
    const email = this.email();
    const pass = this.pass();
    const confirm = this.confirm();

    if (!name.trim()) errs['name'] = 'Ingresá tu nombre y apellido.';
    if (!email.trim()) errs['email'] = 'Ingresá tu correo electrónico.';
    else if (!this.auth.emailOk(email.trim())) errs['email'] = 'El correo no tiene un formato válido.';
    else if (email.trim().toLowerCase() === this.auth.EXISTING)
      errs['email'] = 'Este correo ya está en uso. ¿Querés iniciar sesión?';
    if (!pass) errs['pass'] = 'Ingresá una contraseña.';
    else if (pass.length < 8) errs['pass'] = 'La contraseña debe tener al menos 8 caracteres.';
    if (!confirm) errs['confirm'] = 'Repetí la contraseña.';
    else if (confirm !== pass) errs['confirm'] = 'Las contraseñas no coinciden.';
    if (!this.terms()) errs['terms'] = 'Tenés que aceptar los términos y condiciones.';

    if (Object.keys(errs).length) {
      this.errors.set(errs);
      this.serverErr.set('');
      return;
    }
    this.errors.set({});
    this.serverErr.set('');
    this.auth.registeredEmail.set(email);
    this.router.navigateByUrl('/verify');
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
