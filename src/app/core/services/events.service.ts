import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EventOccurrence, OrgEvent } from '../models/event.model';

/** `weekdays` solo viaja en `periodic`; en `one_off` se omite. */
export type EventCreate = Pick<OrgEvent, 'name' | 'kind' | 'startDate' | 'startTime'> & {
  weekdays?: number[];
};
/** Con asistencias cargadas el backend solo acepta cambiar `name` y
 * `startTime`; tocar kind/startDate/weekdays da 409. */
export type EventPatch = Partial<EventCreate>;

export interface AttendanceResult {
  eventId: string;
  date: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/events`;

  private readonly _events = signal<OrgEvent[]>([]);
  readonly events = this._events.asReadonly();
  readonly active = computed(() => this._events().filter((e) => e.active));
  readonly inactive = computed(() => this._events().filter((e) => !e.active));

  load(): Observable<OrgEvent[]> {
    return this.http.get<OrgEvent[]>(this.apiUrl).pipe(tap((events) => this._events.set(events)));
  }

  create(data: EventCreate): Observable<OrgEvent> {
    return this.http
      .post<OrgEvent>(this.apiUrl, data)
      .pipe(tap((ev) => this._events.update((list) => [...list, ev])));
  }

  update(id: string, data: EventPatch): Observable<OrgEvent> {
    return this.http
      .put<OrgEvent>(`${this.apiUrl}/${id}`, data)
      .pipe(tap((ev) => this.replace(id, ev)));
  }

  deactivate(id: string): Observable<OrgEvent> {
    return this.http
      .patch<OrgEvent>(`${this.apiUrl}/${id}/deactivate`, {})
      .pipe(tap((ev) => this.replace(id, ev)));
  }

  /**
   * No se cachea en el signal store: el detalle pide su propio rango cada vez
   * que entra, y cachearlo por evento complicaría invalidación sin necesidad.
   */
  occurrences(id: string, from?: string, to?: string): Observable<EventOccurrence[]> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<EventOccurrence[]>(`${this.apiUrl}/${id}/occurrences`, { params });
  }

  setAttendance(id: string, date: string, count: number): Observable<AttendanceResult> {
    return this.http.put<AttendanceResult>(`${this.apiUrl}/${id}/attendance/${date}`, { count });
  }

  find(id: string): OrgEvent | undefined {
    return this._events().find((e) => e.id === id);
  }

  private replace(id: string, ev: OrgEvent): void {
    this._events.update((list) => list.map((e) => (e.id === id ? ev : e)));
  }
}
