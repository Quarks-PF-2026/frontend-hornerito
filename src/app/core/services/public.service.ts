import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PublicNeed,
  PublicOrgDetail,
  PublicOrgSummary,
  PublicPage,
} from '../models/public.model';

export interface PublicQuery {
  q?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

/** Directorio público: se consume sin sesión, el backend no pide token. */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  organizations(query: PublicQuery = {}): Observable<PublicPage<PublicOrgSummary>> {
    return this.http.get<PublicPage<PublicOrgSummary>>(
      `${this.apiUrl}/public/organizations`,
      { params: toParams(query) },
    );
  }

  organization(id: string): Observable<PublicOrgDetail> {
    return this.http.get<PublicOrgDetail>(`${this.apiUrl}/public/organizations/${id}`);
  }

  needs(query: PublicQuery = {}): Observable<PublicPage<PublicNeed>> {
    return this.http.get<PublicPage<PublicNeed>>(`${this.apiUrl}/public/needs`, {
      params: toParams(query),
    });
  }
}

function toParams(query: PublicQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
