import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ROLE_LABEL } from '../../../../core/models/member.model';
import {
  InvitationPreview,
  InvitationsService,
} from '../../../../core/services/invitations.service';

@Component({
  selector: 'app-invitacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  templateUrl: './invitacion.html',
  styleUrl: './invitacion.scss',
})
export class InvitacionPage {
  private readonly invitations = inject(InvitationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly preview = signal<InvitationPreview | null>(null);
  readonly loadError = signal('');
  readonly name = signal('');
  readonly password = signal('');
  readonly formError = signal('');

  constructor() {
    if (!this.token) {
      this.loadError.set('El link de invitación no es válido.');
      return;
    }
    this.invitations.preview(this.token).subscribe({
      next: (preview) => this.preview.set(preview),
      error: (err: HttpErrorResponse) =>
        this.loadError.set(this.message(err, 'La invitación no es válida o ya venció.')),
    });
  }

  roleLabel(): string {
    const role = this.preview()?.role;
    return role ? ROLE_LABEL[role] : '';
  }

  onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.formError.set('');
  }

  onPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
    this.formError.set('');
  }

  accept(): void {
    const preview = this.preview();
    if (!preview) return;

    if (!preview.userExists) {
      if (!this.name().trim()) {
        this.formError.set('Ingresá tu nombre y apellido.');
        return;
      }
      if (this.password().length < 8) {
        this.formError.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
    }

    this.invitations
      .accept(
        this.token,
        preview.userExists ? undefined : this.name().trim(),
        preview.userExists ? undefined : this.password(),
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/app'),
        error: (err: HttpErrorResponse) =>
          this.formError.set(this.message(err, 'No se pudo aceptar la invitación.')),
      });
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }

  private message(err: HttpErrorResponse, fallback: string): string {
    const message: unknown = err.error?.message;
    return typeof message === 'string' ? message : fallback;
  }
}
