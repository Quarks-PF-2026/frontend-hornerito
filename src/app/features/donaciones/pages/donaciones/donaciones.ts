import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { inPersonTotals } from '../../../../core/models/donation-filters';
import { DonationView } from '../../../../core/models/donation.model';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CollectionPointsService } from '../../../../core/services/collection-points.service';
import { DonationsService } from '../../../../core/services/donations.service';
import { MonetaryDonationsService } from '../../../../core/services/monetary-donations.service';
import { NeedsService } from '../../../../core/services/needs.service';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { DonacionesEconomicasPage } from '../donaciones-economicas/donaciones-economicas';

type Tab = 'presenciales' | 'economicas';

/**
 * Historial de donaciones (QK-23). Dos pestañas y no una lista sola: la
 * presencial se cuenta en insumos y la económica en pesos, así que mezclarlas
 * obligaría a una fila que no dice nada de ninguna de las dos.
 */
@Component({
  selector: 'app-donaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DonacionesEconomicasPage],
  templateUrl: './donaciones.html',
  styleUrl: './donaciones.scss',
})
export class DonacionesPage {
  private readonly auth = inject(AuthService);
  readonly canWrite = this.auth.canWriteContent;
  private readonly donationsSvc = inject(DonationsService);
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly needsSvc = inject(NeedsService);
  private readonly pointsSvc = inject(CollectionPointsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly monetarySvc = inject(MonetaryDonationsService);

  readonly tab = signal<Tab>('presenciales');
  readonly from = signal('');
  readonly to = signal('');

  /** Cuántas donaciones económicas esperan que alguien confirme el dinero. */
  readonly pendingMonetary = this.monetarySvc.pendingCount;

  /** Filtra el backend: acá solo se muestra lo que volvió. */
  readonly rows: Signal<DonationView[]> = this.donationsSvc.views;

  readonly totals = computed(() => inPersonTotals(this.rows()));

  /** Distingue "todavía no registraste nada" de "el filtro no encontró nada". */
  readonly filtered = computed(() => !!this.from() || !!this.to());

  constructor() {
    // Las tres listas alimentan la vista: insumo, necesidad y punto se
    // resuelven por id contra el catálogo ya cargado.
    this.suppliesSvc.load().subscribe();
    this.needsSvc.load().subscribe();
    this.pointsSvc.load().subscribe();
    this.reload();
    // Sin filtros a propósito: alimenta el contador de pendientes de la
    // pestaña, que cuenta toda la organización y no lo que se esté viendo.
    this.monetarySvc.load().subscribe();
  }

  newDonation(): void {
    void this.router.navigate(['/app/donaciones/nueva']);
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
    this.from.set('');
    this.to.set('');
    this.reload();
  }

  private reload(): void {
    this.donationsSvc.load({ from: this.from(), to: this.to() }).subscribe({
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
}
