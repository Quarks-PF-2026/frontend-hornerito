import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { fmtMoney, monetaryStatusBadge } from '../models/monetary-donation.model';
import {
  ChangePasswordRequest,
  MyDonation,
  MyDonationView,
  Profile,
  UpdateProfileRequest,
} from '../models/profile.model';
import { fmtDate } from '../util/format';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/profile`;

  private readonly _profile = signal<Profile | null>(null);
  readonly profile = this._profile.asReadonly();

  private readonly _donations = signal<MyDonation[]>([]);
  readonly donations = this._donations.asReadonly();
  readonly donationViews = computed<MyDonationView[]>(() =>
    this._donations().map((d) => {
      const badge = monetaryStatusBadge(d.status);
      return {
        ...d,
        amountLabel: fmtMoney(d.amount),
        // `createdAt` viene con hora; `fmtDate` espera 'YYYY-MM-DD'.
        date: fmtDate(d.createdAt.slice(0, 10)),
        statusLabel: badge.label,
        statusBg: badge.bg,
        statusInk: badge.ink,
      };
    }),
  );

  load(): Observable<Profile> {
    return this.http.get<Profile>(this.apiUrl).pipe(tap((p) => this._profile.set(p)));
  }

  /** Historial propio: el backend lo resuelve del JWT, más nuevas primero y hasta 50. */
  loadDonations(): Observable<MyDonation[]> {
    return this.http
      .get<MyDonation[]>(`${this.apiUrl}/donations`)
      .pipe(tap((list) => this._donations.set(list)));
  }

  update(data: UpdateProfileRequest): Observable<Profile> {
    return this.http.patch<Profile>(this.apiUrl, data).pipe(
      tap((p) => {
        this._profile.set(p);
        // El nombre/teléfono pueden aparecer en menú o top-bar más adelante:
        // se reflejan en la sesión sin esperar un nuevo login.
        this.auth.updateProfileSession(p.name, p.phone);
      }),
    );
  }

  /** No toca el signal de perfil: la contraseña no es parte de esos datos. */
  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/password`, data);
  }
}
