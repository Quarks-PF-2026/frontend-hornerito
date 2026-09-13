import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PendingOrganizationView } from '../../../../core/models/pending-organization.model';
import { AdminOrganizationsService } from '../../../../core/services/admin-organizations.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';

/** Mismo tope que valida el backend para el motivo de rechazo. */
const REASON_MAX = 500;

/**
 * Validación de organizaciones (QK-19). Mismo flujo que las solicitudes de
 * voluntario: aprobar es directo y rechazar pide el motivo en un sheet, porque
 * es lo que la organización va a leer en "Mi comedor".
 */
@Component({
  selector: 'app-validacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet],
  templateUrl: './validacion.html',
  styleUrl: './validacion.scss',
})
export class ValidacionPage {
  private readonly admin = inject(AdminOrganizationsService);
  private readonly toast = inject(ToastService);

  readonly rows = this.admin.views;
  readonly deciding = signal<string | null>(null);
  readonly reasonMax = REASON_MAX;

  /** Organización que se está rechazando; el motivo es obligatorio. */
  readonly rejecting = signal<PendingOrganizationView | null>(null);
  readonly reason = signal('');
  readonly reasonError = signal('');

  constructor() {
    this.reload();
  }

  approve(row: PendingOrganizationView): void {
    if (this.deciding()) return;
    this.deciding.set(row.id);
    this.admin.approve(row.id).subscribe({
      next: () => {
        this.deciding.set(null);
        this.toast.show(`${row.name} quedó validada`);
      },
      error: (err: HttpErrorResponse) => {
        this.deciding.set(null);
        this.handleDecisionError(err, 'No se pudo validar la organización');
      },
    });
  }

  openReject(row: PendingOrganizationView): void {
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
      this.reasonError.set('Contale a la organización por qué no la validás.');
      return;
    }

    this.deciding.set(row.id);
    this.admin.reject(row.id, reason).subscribe({
      next: () => {
        this.deciding.set(null);
        this.rejecting.set(null);
        this.toast.show(`${row.name} quedó rechazada`);
      },
      error: (err: HttpErrorResponse) => {
        this.deciding.set(null);
        // En un 409 ya no hay nada que rechazar: se cierra el sheet para no
        // dejar abierta una acción sobre una tarjeta que va a desaparecer.
        if (err.status === 409) {
          this.rejecting.set(null);
        }
        this.handleDecisionError(err, 'No se pudo rechazar la organización');
      },
    });
  }

  private reload(): void {
    this.admin.load().subscribe({
      error: () => this.toast.show('No se pudieron cargar las organizaciones pendientes'),
    });
  }

  private handleDecisionError(err: HttpErrorResponse, fallback: string): void {
    if (err.status !== 409) {
      this.toast.show(fallback);
      return;
    }
    // El 409 dice que otro administrador ya la decidió: se muestra el motivo
    // del backend y se recarga para que la cola refleje el estado real.
    const message = (err.error as { message?: string | string[] })?.message;
    this.toast.show(
      Array.isArray(message) ? message[0] : (message ?? 'La organización ya no está pendiente'),
    );
    this.reload();
  }
}
