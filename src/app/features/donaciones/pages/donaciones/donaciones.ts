import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CollectionPointsService } from '../../../../core/services/collection-points.service';
import { DonationsService } from '../../../../core/services/donations.service';
import { MonetaryDonationsService } from '../../../../core/services/monetary-donations.service';
import { NeedsService } from '../../../../core/services/needs.service';
import { SuppliesService } from '../../../../core/services/supplies.service';

@Component({
  selector: 'app-donaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly router = inject(Router);

  private readonly monetarySvc = inject(MonetaryDonationsService);

  readonly views = this.donationsSvc.views;
  /** Cuántas donaciones económicas esperan que alguien confirme el dinero. */
  readonly pendingMonetary = this.monetarySvc.pendingCount;

  constructor() {
    // Las tres listas alimentan la vista: insumo, necesidad y punto se
    // resuelven por id contra el catálogo ya cargado.
    this.suppliesSvc.load().subscribe();
    this.needsSvc.load().subscribe();
    this.pointsSvc.load().subscribe();
    this.donationsSvc.load().subscribe();
    // Solo para el contador de la entrada a económicas; el detalle lo carga
    // esa pantalla.
    this.monetarySvc.load().subscribe();
  }

  newDonation(): void {
    void this.router.navigate(['/app/donaciones/nueva']);
  }

  monetaryDonations(): void {
    void this.router.navigate(['/app/donaciones/economicas']);
  }
}
