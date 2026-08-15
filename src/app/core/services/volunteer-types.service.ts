import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VolunteerType } from '../models/volunteer-type.model';

export type VolunteerTypePatch = Pick<VolunteerType, 'name'>;

@Injectable({ providedIn: 'root' })
export class VolunteerTypesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/volunteer-types`;

  private readonly _types = signal<VolunteerType[]>([]);
  readonly types = this._types.asReadonly();
  readonly active = computed(() => this._types().filter((t) => t.active));

  load(): Observable<VolunteerType[]> {
    return this.http.get<VolunteerType[]>(this.apiUrl).pipe(tap((types) => this._types.set(types)));
  }

  create(data: VolunteerTypePatch): Observable<VolunteerType> {
    return this.http
      .post<VolunteerType>(this.apiUrl, data)
      .pipe(tap((type) => this._types.update((list) => [...list, type])));
  }

  update(id: string, data: VolunteerTypePatch): Observable<VolunteerType> {
    return this.http
      .put<VolunteerType>(`${this.apiUrl}/${id}`, data)
      .pipe(tap((type) => this.replace(id, type)));
  }

  toggle(id: string): Observable<VolunteerType> {
    return this.http
      .patch<VolunteerType>(`${this.apiUrl}/${id}/toggle`, {})
      .pipe(tap((type) => this.replace(id, type)));
  }

  find(id: string): VolunteerType | undefined {
    return this._types().find((t) => t.id === id);
  }

  private replace(id: string, type: VolunteerType): void {
    this._types.update((list) => list.map((t) => (t.id === id ? type : t)));
  }
}
