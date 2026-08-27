import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CAT_ICON, DEFAULT_CAT_ICON } from '../models/catalog';
import { DateRange, toHttpParams } from '../models/donation-filters';
import {
  Donation,
  DonationItemView,
  DonationPatch,
  DonationView,
} from '../models/donation.model';
import { fmtDate } from '../util/format';
import { CollectionPointsService } from './collection-points.service';
import { NeedsService } from './needs.service';
import { SuppliesService } from './supplies.service';
import { ToastService } from './toast.service';

/** Una línea del formulario. La cantidad es texto: viene de un `<input>`. */
export interface DonationDraftItem {
  supplyId: string;
  needId: string;
  quantity: string;
}

export interface DonationDraft {
  donorName: string;
  donorContact: string;
  collectionPointId: string;
  items: DonationDraftItem[];
}

@Injectable({ providedIn: 'root' })
export class DonationsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl;
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly needsSvc = inject(NeedsService);
  private readonly pointsSvc = inject(CollectionPointsService);

  private readonly _donations = signal<Donation[]>([]);
  readonly donations = this._donations.asReadonly();

  /** Vistas derivadas (reaccionan a donaciones, insumos y puntos). */
  readonly views = computed<DonationView[]>(() =>
    this._donations().map((d) => this.toView(d)),
  );

  // ---------------- estado del formulario ----------------
  private readonly _draft = signal<DonationDraft | null>(null);
  private readonly _errors = signal<Record<string, string>>({});
  private readonly _saving = signal(false);

  readonly draft = this._draft.asReadonly();
  readonly errors = this._errors.asReadonly();
  readonly saving = this._saving.asReadonly();

  // ---------------- datos ----------------
  /** El rango lo filtra el backend: acá solo se arma el query string. */
  load(range: DateRange = {}): Observable<Donation[]> {
    return this.http
      .get<Donation[]>(`${this.apiUrl}/donations`, {
        params: toHttpParams(range, new HttpParams()),
      })
      .pipe(tap((donations) => this._donations.set(donations)));
  }

  // ---------------- formulario ----------------
  openNew(): void {
    this._errors.set({});
    this._draft.set({
      donorName: '',
      donorContact: '',
      collectionPointId: '',
      items: [this.emptyItem()],
    });
  }

  closeForm(): void {
    this._draft.set(null);
    this._errors.set({});
  }

  setField(key: keyof DonationDraft, value: string): void {
    this._draft.update((d) => (d ? { ...d, [key]: value } : d));
    this.clearError(key);
  }

  addItem(): void {
    this._draft.update((d) =>
      d ? { ...d, items: [...d.items, this.emptyItem()] } : d,
    );
    this.clearError('items');
  }

  /** Nunca deja la donación sin líneas: el backend exige al menos una. */
  removeItem(index: number): void {
    this._draft.update((d) => {
      if (!d || d.items.length <= 1) return d;
      return { ...d, items: d.items.filter((_, i) => i !== index) };
    });
    this._errors.set({});
  }

  setItemField(
    index: number,
    key: keyof DonationDraftItem,
    value: string,
  ): void {
    this._draft.update((d) => {
      if (!d) return d;
      const items = d.items.map((item, i) => {
        if (i !== index) return item;
        // Cambiar el insumo invalida la necesidad elegida antes.
        return key === 'supplyId'
          ? { ...item, supplyId: value, needId: '' }
          : { ...item, [key]: value };
      });
      return { ...d, items };
    });
    this.clearError(`items.${index}.${key}`);
  }

  /** Necesidades abiertas del insumo elegido, para el select de la línea. */
  needOptionsFor(supplyId: string) {
    if (!supplyId) return [];
    return this.needsSvc
      .needs()
      .filter(
        (need) =>
          need.supplyId === supplyId &&
          !need.closedManually &&
          need.coveredQuantity < need.requiredQuantity,
      )
      .map((need) => ({
        id: need.id,
        label: `Faltan ${need.requiredQuantity - need.coveredQuantity} · vence ${fmtDate(need.deadline)}`,
      }));
  }

  save(onSuccess?: () => void): void {
    const draft = this._draft();
    if (!draft || this._saving()) return;

    const errs = this.validate(draft);
    if (Object.keys(errs).length) {
      this._errors.set(errs);
      return;
    }

    const data: DonationPatch = {
      collectionPointId: draft.collectionPointId || null,
      donorName: draft.donorName.trim() || null,
      donorContact: draft.donorContact.trim() || null,
      items: draft.items.map((item) => ({
        supplyId: item.supplyId,
        needId: item.needId || null,
        quantity: Number(item.quantity),
      })),
    };

    this._saving.set(true);
    this.http
      .post<Donation>(`${this.apiUrl}/donations`, data)
      .subscribe({
        next: (donation) => {
          this._saving.set(false);
          this._donations.update((list) => [donation, ...list]);
          // El registro movió el progreso de las necesidades acreditadas.
          this.needsSvc.load().subscribe();
          this.toast.show('Donación registrada');
          onSuccess?.();
        },
        error: (err: HttpErrorResponse) => {
          this._saving.set(false);
          const message = (err.error as { message?: string | string[] })?.message;
          this._errors.set({
            form: Array.isArray(message)
              ? message[0]
              : (message ?? 'No se pudo registrar. Intentá de nuevo.'),
          });
        },
      });
  }

  private validate(draft: DonationDraft): Record<string, string> {
    const errs: Record<string, string> = {};

    if (draft.donorName.trim().length > 80) {
      errs['donorName'] = 'El nombre no puede superar los 80 caracteres.';
    }
    if (draft.donorContact.trim().length > 120) {
      errs['donorContact'] = 'El contacto no puede superar los 120 caracteres.';
    }
    if (!draft.items.length) {
      errs['items'] = 'Agregá al menos un insumo a la donación.';
    }

    draft.items.forEach((item, index) => {
      if (!item.supplyId) {
        errs[`items.${index}.supplyId`] = 'Elegí un insumo.';
      }
      const quantity = Number(item.quantity);
      if (!item.quantity.trim() || !Number.isInteger(quantity) || quantity <= 0) {
        errs[`items.${index}.quantity`] =
          'Ingresá una cantidad entera mayor a cero.';
      }
    });

    return errs;
  }

  private emptyItem(): DonationDraftItem {
    const first = this.suppliesSvc.active()[0];
    return { supplyId: first ? first.id : '', needId: '', quantity: '' };
  }

  private clearError(key: string): void {
    this._errors.update((e) => ({ ...e, [key]: '', form: '' }));
  }

  private toView(donation: Donation): DonationView {
    const point = donation.collectionPointId
      ? this.pointsSvc.find(donation.collectionPointId)
      : undefined;

    const items: DonationItemView[] = donation.items.map((item) => {
      const supply = this.suppliesSvc.find(item.supplyId);
      const need = item.needId ? this.needsSvc.find(item.needId) : undefined;
      return {
        icon: supply ? (CAT_ICON[supply.category] ?? DEFAULT_CAT_ICON) : DEFAULT_CAT_ICON,
        supply: supply ? supply.name : 'Insumo',
        quantity: item.quantity,
        unit: supply ? supply.unit.toLowerCase() : '',
        // El aporte puede haber quedado topeado, así que no se repite el número.
        needNote: need ? 'Suma al progreso de la necesidad' : null,
      };
    });

    return {
      id: donation.id,
      // `createdAt` viene con hora; `fmtDate` espera 'YYYY-MM-DD'.
      date: fmtDate(donation.createdAt.slice(0, 10)),
      donor: donation.donorName?.trim() || 'Donante anónimo',
      contact: donation.donorContact,
      point: point ? point.name : null,
      items,
    };
  }
}
