import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invitation, Member, MemberRole } from '../models/member.model';

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/organization/members`;

  private readonly _members = signal<Member[]>([]);
  readonly members = this._members.asReadonly();

  private readonly _invitations = signal<Invitation[]>([]);
  readonly invitations = this._invitations.asReadonly();

  load(): Observable<Member[]> {
    return this.http.get<Member[]>(this.apiUrl).pipe(tap((members) => this._members.set(members)));
  }

  loadInvitations(): Observable<Invitation[]> {
    return this.http
      .get<Invitation[]>(`${this.apiUrl}/invitations`)
      .pipe(tap((invitations) => this._invitations.set(invitations)));
  }

  invite(email: string, role: MemberRole): Observable<Invitation> {
    return this.http
      .post<Invitation>(`${this.apiUrl}/invitations`, { email, role })
      .pipe(tap((invitation) => this._invitations.update((list) => [invitation, ...list])));
  }

  cancelInvitation(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/invitations/${id}`)
      .pipe(tap(() => this._invitations.update((list) => list.filter((i) => i.id !== id))));
  }

  changeRole(userId: string, role: MemberRole): Observable<Member> {
    return this.http
      .patch<Member>(`${this.apiUrl}/${userId}/role`, { role })
      .pipe(tap((member) => this.replace(member)));
  }

  toggle(userId: string): Observable<Member> {
    return this.http
      .patch<Member>(`${this.apiUrl}/${userId}/toggle`, {})
      .pipe(tap((member) => this.replace(member)));
  }

  private replace(member: Member): void {
    this._members.update((list) => list.map((m) => (m.userId === member.userId ? member : m)));
  }
}
