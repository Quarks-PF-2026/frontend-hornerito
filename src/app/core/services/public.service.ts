import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PublicNeed,
  PublicOrgDetail,
  PublicOrgSummary,
  PublicPage,
  VolunteerRequestPayload,
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
    return this.http.get<PublicPage<PublicOrgSummary>>(`${this.apiUrl}/public/organizations`, {
      params: toParams(query),
    });
  }

  organization(id: string): Observable<PublicOrgDetail> {
    return this.http.get<PublicOrgDetail>(`${this.apiUrl}/public/organizations/${id}`);
  }

  /**
   * Alguien sin cuenta se ofrece como voluntario (QK-16). Wrapper HTTP puro,
   * sin signals: el estado del formulario no sobrevive al componente.
   *
   * El `auth.interceptor` le adosa el Bearer si hay sesión abierta; es inocuo,
   * el endpoint no tiene guard y no mira el token.
   */
  submitVolunteerRequest(
    organizationId: string,
    payload: VolunteerRequestPayload,
  ): Observable<{ id: string; status: string }> {
    return this.http.post<{ id: string; status: string }>(
      `${this.apiUrl}/public/organizations/${organizationId}/volunteer-requests`,
      payload,
    );
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
