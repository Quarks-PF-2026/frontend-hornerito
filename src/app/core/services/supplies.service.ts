import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Supply } from '../models/supply.model';

export type SupplyPatch = Pick<Supply, 'name' | 'category' | 'unit'>;

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _supplies = signal<Supply[]>([]);
  readonly supplies = this._supplies.asReadonly();
  readonly active = computed(() => this._supplies().filter((s) => s.active));

  load(): Observable<Supply[]> {
    return this.http
      .get<Supply[]>(`${this.apiUrl}/supplies`)
      .pipe(tap((supplies) => this._supplies.set(supplies)));
  }

  create(data: SupplyPatch): Observable<Supply> {
    return this.http.post<Supply>(`${this.apiUrl}/supplies`, data).pipe(
      tap((supply) => this._supplies.update((list) => [...list, supply])),
    );
  }

  update(id: string, data: SupplyPatch): Observable<Supply> {
    return this.http.put<Supply>(`${this.apiUrl}/supplies/${id}`, data).pipe(
      tap((supply) =>
        this._supplies.update((list) => list.map((s) => (s.id === id ? supply : s))),
      ),
    );
  }

  toggle(id: string): Observable<Supply> {
    return this.http.patch<Supply>(`${this.apiUrl}/supplies/${id}/toggle`, {}).pipe(
      tap((supply) =>
        this._supplies.update((list) => list.map((s) => (s.id === id ? supply : s))),
      ),
    );
  }

  find(id: string): Supply | undefined {
    return this._supplies().find((s) => s.id === id);
  }
}
