import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MemberRole } from '../models/member.model';
import { AuthService } from './auth.service';

export interface InvitationPreview {
  organizationName: string;
  email: string;
  role: MemberRole;
  userExists: boolean;
}

interface AcceptResponse {
  accessToken: string;
  user: { id: string; name: string; email: string };
  role: MemberRole | null;
  organizationId: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/invitations`;

  preview(token: string): Observable<InvitationPreview> {
    return this.http.get<InvitationPreview>(`${this.apiUrl}/${token}`);
  }

  /** Aceptar deja la sesión iniciada: el backend devuelve el token. */
  accept(token: string, name?: string, password?: string): Observable<AcceptResponse> {
    return this.http
      .post<AcceptResponse>(`${this.apiUrl}/${token}/accept`, { name, password })
      .pipe(tap((res) => this.auth.startSession(res.accessToken, res.role, res.user.email)));
  }
}
