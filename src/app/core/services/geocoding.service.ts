import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Busca direcciones vía el proxy del backend. Ante error devuelve lista vacía. */
  search(query: string): Observable<GeocodeResult[]> {
    const q = query.trim();
    if (q.length < 3) {
      return of([]);
    }
    return this.http
      .get<GeocodeResult[]>(`${this.apiUrl}/geocoding/search`, { params: { q } })
      .pipe(catchError(() => of([])));
  }
}
