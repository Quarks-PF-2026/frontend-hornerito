import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { phoneOk } from '../../../../core/util/format';
import { ProfileService } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilPage {
  private readonly profileSvc = inject(ProfileService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);

  // --- Datos personales ---
  readonly email = signal('');
  readonly name = signal('');
  readonly phone = signal('');
  readonly errors = signal<Record<string, string>>({});
  readonly saving = signal(false);

  // --- Cambio de contraseña ---
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmNewPassword = signal('');
  readonly passwordErrors = signal<Record<string, string>>({});
  readonly changingPassword = signal(false);

  constructor() {
    this.profileSvc.load().subscribe({
      next: (p) => {
        this.email.set(p.email);
        this.name.set(p.name);
        this.phone.set(p.phone ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('No pudimos cargar tu perfil. Probá de nuevo más tarde.');
      },
    });
  }

  saveProfile(): void {
    const errs: Record<string, string> = {};
    const name = this.name();
    const phone = this.phone().trim();

    if (!name.trim()) errs['name'] = 'Ingresá tu nombre.';
    if (phone && !phoneOk(phone)) {
      errs['phone'] = 'El teléfono debe tener entre 8 y 15 dígitos, sin espacios ni guiones.';
    }

    if (Object.keys(errs).length) {
      this.errors.set(errs);
      return;
    }
    this.errors.set({});
    this.saving.set(true);
    this.profileSvc.update({ name: name.trim(), phone: phone || null }).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.name.set(p.name);
        this.phone.set(p.phone ?? '');
        this.toast.show('Perfil actualizado');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.show(this.serverMessage(err, 'No se pudo actualizar el perfil.'));
      },
    });
  }

  changePassword(): void {
    const errs: Record<string, string> = {};
    const current = this.currentPassword();
    const next = this.newPassword();
    const confirm = this.confirmNewPassword();

    if (!current) errs['currentPassword'] = 'Ingresá tu contraseña actual.';
    if (!next) errs['newPassword'] = 'Ingresá una nueva contraseña.';
    else if (next.length < 8) errs['newPassword'] = 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (!confirm) errs['confirmNewPassword'] = 'Repetí la nueva contraseña.';
    else if (confirm !== next) errs['confirmNewPassword'] = 'Las contraseñas no coinciden.';

    if (Object.keys(errs).length) {
      this.passwordErrors.set(errs);
      return;
    }
    this.passwordErrors.set({});
    this.changingPassword.set(true);
    this.profileSvc
      .changePassword({ currentPassword: current, newPassword: next, confirmNewPassword: confirm })
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          // No desloguea (QK-11): solo se limpian los campos del formulario.
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmNewPassword.set('');
          this.toast.show('Contraseña actualizada');
        },
        error: (err: HttpErrorResponse) => {
          this.changingPassword.set(false);
          this.toast.show(this.serverMessage(err, 'No se pudo actualizar la contraseña.'));
        },
      });
  }

  private serverMessage(err: HttpErrorResponse, fallback: string): string {
    const message: unknown = err.error?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
    return fallback;
  }
}
