import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DonorProfile,
  MonetaryDonationPayload,
  PublicFeedNeed,
  PublicLocality,
  PublicOrgDetail,
  PublicOrgSummary,
  PublicPage,
  TopDonor,
  VolunteerRequestPayload,
} from '../models/public.model';

export interface PublicQuery {
  q?: string;
  category?: string;
  /** Solo `/public/organizations`: localidad exacta (QK-109). */
  locality?: string;
  page?: number;
  pageSize?: number;
  /** Solo `/public/needs`: las que vencen entre hoy y hoy + N días. */
  withinDays?: number;
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

  localities(): Observable<PublicLocality[]> {
    return this.http.get<PublicLocality[]>(`${this.apiUrl}/public/localities`);
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
   * Alguien declara una donación económica que ya transfirió (QK-20). Si hay
   * sesión, el `auth.interceptor` adosa el Bearer y el backend la asocia a la
   * cuenta (QK-113): el front no manda ningún id de usuario.
   *
   * Va por `FormData` y no JSON porque el comprobante viaja en el
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

  /** Top 10 donantes del mes para el inicio (QK-114). */
  topDonors(): Observable<TopDonor[]> {
    return this.http.get<TopDonor[]>(`${this.apiUrl}/public/donors/top`);
  }

  /** Perfil público del donante (QK-110). 404 si no tiene perfil público. */
  donor(userId: string): Observable<DonorProfile> {
    return this.http.get<DonorProfile>(`${this.apiUrl}/public/donors/${userId}`);
  }

  needs(query: PublicQuery = {}): Observable<PublicPage<PublicFeedNeed>> {
    return this.http.get<PublicPage<PublicFeedNeed>>(`${this.apiUrl}/public/needs`, {
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
