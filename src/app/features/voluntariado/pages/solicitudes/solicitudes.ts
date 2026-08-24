import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { VolunteerRequestView } from '../../../../core/models/volunteer-request.model';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteerRequestsService } from '../../../../core/services/volunteer-requests.service';
import { Badge } from '../../../../shared/ui/badge/badge';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';

@Component({
  selector: 'app-solicitudes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, BottomSheet],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.scss',
})
export class SolicitudesPage {
  private readonly requests = inject(VolunteerRequestsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly rows = this.requests.views;
  readonly deciding = signal<string | null>(null);

  /** Solicitud que se está rechazando; el motivo es obligatorio. */
  readonly rejecting = signal<VolunteerRequestView | null>(null);
  readonly reason = signal('');
  readonly reasonError = signal('');

  constructor() {
    this.requests.load().subscribe({
      error: () => this.toast.show('No se pudieron cargar las solicitudes'),
    });
  }

  back(): void {
    void this.router.navigate(['/app/voluntariado']);
  }

  approve(row: VolunteerRequestView): void {
    if (this.deciding()) return;
    this.deciding.set(row.id);
    this.requests.approve(row.id).subscribe({
      next: () => {
        this.deciding.set(null);
        this.toast.show('Solicitud aprobada · le enviamos la invitación');
      },
      error: (err: HttpErrorResponse) => {
        this.deciding.set(null);
        this.toast.show(this.approveError(err));
        // El 409 puede venir de que otro gestor la resolvió: se recarga para
        // que la pantalla deje de ofrecer una acción que ya no existe.
        this.requests.load().subscribe();
      },
    });
  }

  openReject(row: VolunteerRequestView): void {
    this.rejecting.set(row);
    this.reason.set('');
    this.reasonError.set('');
  }

  closeReject(): void {
    this.rejecting.set(null);
  }

  updateReason(value: string): void {
    this.reason.set(value);
    if (this.reasonError()) {
      this.reasonError.set('');
    }
  }

  confirmReject(): void {
    const row = this.rejecting();
    if (!row || this.deciding()) return;

    const reason = this.reason().trim();
    if (!reason) {
      this.reasonError.set('Contale por qué no la aceptás.');
      return;
    }

    this.deciding.set(row.id);
    this.requests.reject(row.id, reason).subscribe({
      next: () => {
        this.deciding.set(null);
        this.rejecting.set(null);
        this.toast.show('Solicitud rechazada');
      },
      error: () => {
        this.deciding.set(null);
        this.toast.show('No se pudo rechazar la solicitud');
      },
    });
  }

  private approveError(err: HttpErrorResponse): string {
    if (err.status !== 409) {
      return 'No se pudo aprobar la solicitud';
    }
    // El backend distingue tres 409 y el texto de cada uno es útil tal cual:
    // cupo lleno, ya es miembro, o ya hay una invitación pendiente.
    return typeof err.error?.message === 'string'
      ? err.error.message
      : 'La solicitud ya no se puede aprobar';
  }
}
