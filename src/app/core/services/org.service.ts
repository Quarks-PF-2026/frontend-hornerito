import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Org } from '../models/org.model';

export type OrgPatch = Pick<Org, 'name' | 'description' | 'address' | 'contact'>;

@Injectable({ providedIn: 'root' })
export class OrgService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _org = signal<Org | null>(null);
  readonly org = this._org.asReadonly();

  load(): Observable<Org | null> {
    return this.http.get<Org[]>(`${this.apiUrl}/organization/me`).pipe(
      map((orgs) => orgs[0] ?? null),
      tap((org) => this._org.set(org)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          this._org.set(null);
          return of(null);
        }
        throw err;
      }),
    );
  }

  save(patch: OrgPatch): Observable<Org> {
    return this.http
      .put<Org>(`${this.apiUrl}/organization/me`, patch)
      .pipe(tap((org) => this._org.set(org)));
  }
}
