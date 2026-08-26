import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MonetaryDonationPayload,
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

  /**
   * Alguien sin cuenta declara una donación económica que ya transfirió
   * (QK-20). Va por `FormData` y no JSON porque el comprobante viaja en el
   * mismo request: para el donante, declarar y adjuntar son un solo acto.
   *
   * No se setea `Content-Type` a mano — el navegador tiene que agregar el
   * `boundary` del multipart, y fijarlo a mano lo rompe.
   */
  declareDonation(
    organizationId: string,
    payload: MonetaryDonationPayload,
    receipt?: File | null,
  ): Observable<{ id: string; status: string }> {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value));
      }
    }
    if (receipt) {
      form.append('receipt', receipt);
    }
    return this.http.post<{ id: string; status: string }>(
      `${this.apiUrl}/public/organizations/${organizationId}/donations`,
      form,
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
