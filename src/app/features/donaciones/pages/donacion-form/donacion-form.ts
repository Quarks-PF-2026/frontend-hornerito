import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionPointsService } from '../../../../core/services/collection-points.service';
import {
  DonationDraft,
  DonationDraftItem,
  DonationsService,
} from '../../../../core/services/donations.service';
import { NeedsService } from '../../../../core/services/needs.service';
import { SuppliesService } from '../../../../core/services/supplies.service';

@Component({
  selector: 'app-donacion-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donacion-form.html',
  styleUrl: './donacion-form.scss',
})
export class DonacionFormPage {
  private readonly donationsSvc = inject(DonationsService);
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly needsSvc = inject(NeedsService);
  private readonly pointsSvc = inject(CollectionPointsService);
  private readonly router = inject(Router);

  readonly draft = this.donationsSvc.draft;
  readonly errors = this.donationsSvc.errors;
  readonly saving = this.donationsSvc.saving;

  readonly supplies = this.suppliesSvc.active;
  readonly points = this.pointsSvc.activePoints;

  /** Necesidades abiertas por insumo, para el select de cada línea. */
  readonly needOptions = computed(() => {
    const draft = this.draft();
    // Depender de las necesidades acá mantiene el computed al día.
    this.needsSvc.needs();
    return (draft?.items ?? []).map((item) =>
      this.donationsSvc.needOptionsFor(item.supplyId),
    );
  });

  constructor() {
    // Entrada directa por URL: el formulario necesita catálogo, necesidades y
    // puntos para poder elegir.
    this.suppliesSvc.load().subscribe(() => this.donationsSvc.openNew());
    this.needsSvc.load().subscribe();
    this.pointsSvc.load().subscribe();
  }

  back(): void {
    this.donationsSvc.closeForm();
    void this.router.navigate(['/app/donaciones']);
  }

  save(): void {
    this.donationsSvc.save(() => this.back());
  }

  onField(key: keyof DonationDraft, event: Event): void {
    this.donationsSvc.setField(
      key,
      (event.target as HTMLInputElement | HTMLSelectElement).value,
    );
  }

  onItemField(index: number, key: keyof DonationDraftItem, event: Event): void {
    this.donationsSvc.setItemField(
      index,
      key,
      (event.target as HTMLInputElement | HTMLSelectElement).value,
    );
  }

  addItem(): void {
    this.donationsSvc.addItem();
  }

  removeItem(index: number): void {
    this.donationsSvc.removeItem(index);
  }
}
