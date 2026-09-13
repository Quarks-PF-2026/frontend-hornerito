import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChangePasswordRequest, Profile, UpdateProfileRequest } from '../models/profile.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/profile`;

  private readonly _profile = signal<Profile | null>(null);
  readonly profile = this._profile.asReadonly();

  load(): Observable<Profile> {
    return this.http.get<Profile>(this.apiUrl).pipe(tap((p) => this._profile.set(p)));
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
