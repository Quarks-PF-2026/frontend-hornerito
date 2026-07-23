import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { DAY_LABELS } from '../../../../core/models/collection-point.model';
import { CollectionPointsService } from '../../../../core/services/collection-points.service';
import { GeocodeResult, GeocodingService } from '../../../../core/services/geocoding.service';
import { MapPicker } from '../../../../shared/ui/map-picker/map-picker';

@Component({
  selector: 'app-punto-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPicker],
  templateUrl: './punto-form.html',
  styleUrl: './punto-form.scss',
})
export class PuntoFormPage {
  private readonly pointsSvc = inject(CollectionPointsService);
  private readonly geocoding = inject(GeocodingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly draft = this.pointsSvc.draft;
  readonly errors = this.pointsSvc.errors;
  readonly saving = this.pointsSvc.saving;
  readonly dayLabels = DAY_LABELS;

  readonly results = signal<GeocodeResult[]>([]);
  readonly searching = signal(false);
  private readonly query$ = new Subject<string>();

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      // Alta: no depende de la lista de puntos, se abre el form de una.
      this.pointsSvc.openNew();
    } else if (this.pointsSvc.find(id)) {
      this.pointsSvc.openEdit(id);
    } else {
      // Edición por URL directa: hace falta cargar el punto primero.
      this.pointsSvc.load().subscribe({
        next: () => (this.pointsSvc.find(id) ? this.pointsSvc.openEdit(id) : this.back()),
        error: () => this.back(),
      });
    }

    this.query$
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        switchMap((q) => this.geocoding.search(q)),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.searching.set(false);
      });
  }

  back(): void {
    this.pointsSvc.closeForm();
    this.results.set([]);
    void this.router.navigate(['/app/puntos']);
  }

  save(): void {
    this.pointsSvc.save(() => this.back());
  }

  onField(key: 'name' | 'phone' | 'email' | 'contactName', event: Event): void {
    this.pointsSvc.setField(key, (event.target as HTMLInputElement).value);
  }

  onAddress(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pointsSvc.setField('addressLine', value);
    if (value.trim().length >= 3) {
      this.searching.set(true);
      this.query$.next(value);
    } else {
      this.results.set([]);
    }
  }

  pickResult(result: GeocodeResult): void {
    this.pointsSvc.applyGeocodeResult(result.label, result.lat, result.lon);
    this.results.set([]);
  }

  onMapPick(position: { lat: number; lng: number }): void {
    this.pointsSvc.setLocation(position.lat, position.lng);
  }

  toggleDay(day: number): void {
    this.pointsSvc.toggleDayClosed(day);
  }

  onTime(day: number, field: 'open' | 'close', event: Event): void {
    this.pointsSvc.setDayTime(day, field, (event.target as HTMLInputElement).value);
  }
}
