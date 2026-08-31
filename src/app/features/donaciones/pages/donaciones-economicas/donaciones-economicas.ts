import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { monetaryTotals } from '../../../../core/models/donation-filters';
import {
  MonetaryDonationStatus,
  MonetaryDonationView,
  fmtMoney,
} from '../../../../core/models/monetary-donation.model';
import { AuthService } from '../../../../core/services/auth.service';
import { MonetaryDonationsService } from '../../../../core/services/monetary-donations.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Badge } from '../../../../shared/ui/badge/badge';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';

type StatusFilter = MonetaryDonationStatus | '';

/**
 * Pestaña de donaciones económicas del historial (QK-23). Nació como pantalla
 * propia en QK-20; ahora se embebe en `/app/donaciones` y por eso no navega.
 */
@Component({
  selector: 'app-donaciones-economicas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, BottomSheet],
  templateUrl: './donaciones-economicas.html',
  styleUrl: './donaciones-economicas.scss',
})
export class DonacionesEconomicasPage {
  private readonly donations = inject(MonetaryDonationsService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  /**
   * Confirmar mueve plata: lo deciden owner y admin. Como todo permiso del
   * front, es solo para no ofrecer un botón que va a dar 403 — el backend
   * revalida.
   */
  readonly canDecide = this.auth.canManageMembers;

  readonly filter = signal<StatusFilter>('');
  readonly from = signal('');
  readonly to = signal('');
  readonly deciding = this.donations.deciding;

  /** Filtra el backend: acá solo se muestra lo que volvió. */
  readonly rows: Signal<MonetaryDonationView[]> = this.donations.views;

  /** Totales de lo filtrado: cambian con el rango y con el estado elegido. */
  readonly totals = computed(() => monetaryTotals(this.rows()));
  readonly confirmedLabel = computed(() => fmtMoney(this.totals().confirmedAmount));

  /** Distingue "no hay nada" de "el filtro no encontró nada". */
  readonly filtered = computed(() => !!this.filter() || !!this.from() || !!this.to());

  /** Comprobante abierto en el modal; se mira sin salir del panel. */
  readonly viewingReceipt = signal<MonetaryDonationView | null>(null);

  /** Donación que se está rechazando; el motivo es obligatorio. */
  readonly rejecting = signal<MonetaryDonationView | null>(null);
  readonly reason = signal('');
  readonly reasonError = signal('');

  constructor() {
    this.reload();
  }

  setFilter(value: string): void {
    this.filter.set(value as StatusFilter);
    this.reload();
  }

  setFrom(value: string): void {
    this.from.set(value);
    this.reload();
  }

  setTo(value: string): void {
    this.to.set(value);
    this.reload();
  }

  clearFilters(): void {
    this.filter.set('');
    this.from.set('');
    this.to.set('');
    this.reload();
  }

  private reload(): void {
    this.donations
      .load({ status: this.filter(), from: this.from(), to: this.to() })
      .subscribe({
        error: (err: HttpErrorResponse) => {
          // El 400 del backend trae el motivo (por ejemplo, rango dado vuelta).
          const message = (err.error as { message?: string | string[] })?.message;
          this.toast.show(
            Array.isArray(message)
              ? message[0]
              : (message ?? 'No se pudieron cargar las donaciones'),
          );
        },
      });
  }

  confirm(row: MonetaryDonationView): void {
    this.donations.confirm(row.id);
  }

  openReceipt(row: MonetaryDonationView): void {
    this.viewingReceipt.set(row);
  }

  closeReceipt(): void {
    this.viewingReceipt.set(null);
  }

  openReject(row: MonetaryDonationView): void {
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

  submitReject(): void {
    const row = this.rejecting();
    if (!row) return;

    const reason = this.reason().trim();
    if (reason.length < 3) {
      this.reasonError.set('Contá en pocas palabras por qué la rechazás.');
      return;
    }

    this.donations.reject(row.id, reason);
    this.rejecting.set(null);
  }
}
