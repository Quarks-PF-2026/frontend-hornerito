import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MonetaryDonation,
  MonetaryDonationStatus,
  MonetaryDonationView,
  toMonetaryView,
} from '../models/monetary-donation.model';
import { fmtDate } from '../util/format';
import { ToastService } from './toast.service';

/**
 * Panel de donaciones económicas (QK-20). Solo la vista de la organización: la
 * declaración del donante es pública y vive en `PublicService`, porque no
 * comparte ni sesión ni estado con esto.
 */
@Injectable({ providedIn: 'root' })
export class MonetaryDonationsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _donations = signal<MonetaryDonation[]>([]);
  readonly donations = this._donations.asReadonly();

  private readonly _deciding = signal<string | null>(null);
  /** Id de la donación que está esperando respuesta, para deshabilitar su fila. */
  readonly deciding = this._deciding.asReadonly();

  readonly views = computed<MonetaryDonationView[]>(() =>
    this._donations().map((donation) => toMonetaryView(donation, fmtDate)),
  );

  readonly pendingCount = computed(
    () => this._donations().filter((d) => d.status === 'declarada').length,
  );

  load(status?: MonetaryDonationStatus): Observable<MonetaryDonation[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<MonetaryDonation[]>(`${this.apiUrl}/donations/monetary`, { params })
      .pipe(tap((donations) => this._donations.set(donations)));
  }

  confirm(id: string): void {
    this.decide(id, `${this.apiUrl}/donations/monetary/${id}/confirm`, {}, 'Donación confirmada');
  }

  reject(id: string, rejectReason: string): void {
    this.decide(
      id,
      `${this.apiUrl}/donations/monetary/${id}/reject`,
      { rejectReason },
      'Donación rechazada',
    );
  }

  private decide(id: string, url: string, body: Record<string, string>, okMessage: string): void {
    if (this._deciding()) return;
    this._deciding.set(id);

    this.http.post<MonetaryDonation>(url, body).subscribe({
      next: (updated) => {
        this._deciding.set(null);
        this._donations.update((list) =>
          list.map((donation) => (donation.id === id ? updated : donation)),
        );
        this.toast.show(okMessage);
      },
      error: (err: HttpErrorResponse) => {
        this._deciding.set(null);
        const message = (err.error as { message?: string | string[] })?.message;
        this.toast.show(
          Array.isArray(message) ? message[0] : (message ?? 'No se pudo actualizar la donación.'),
        );
        // La donación pudo haber sido decidida desde otra sesión: se recarga
        // para no dejar la pantalla mostrando un estado que ya no existe.
        this.load().subscribe();
      },
    });
  }
}
