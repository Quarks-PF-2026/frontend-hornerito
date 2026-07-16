import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CAT_ICON, DEFAULT_CAT_ICON } from '../models/catalog';
import { Need, NeedView } from '../models/need.model';
import { fmtDate } from '../util/format';
import { SuppliesService } from './supplies.service';

export type NeedPatch = Pick<Need, 'supplyId' | 'requiredQuantity' | 'deadline'>;

@Injectable({ providedIn: 'root' })
export class NeedsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly suppliesSvc = inject(SuppliesService);

  private readonly _needs = signal<Need[]>([]);
  readonly needs = this._needs.asReadonly();

  /** Vistas derivadas (reaccionan a cambios de needs y supplies). */
  readonly views = computed<NeedView[]>(() => this._needs().map((n) => this.toView(n)));
  readonly openViews = computed(() => this.views().filter((v) => v.open));

  private toView(n: Need): NeedView {
    const sup = this.suppliesSvc.find(n.supplyId);
    const done = n.coveredQuantity >= n.requiredQuantity;
    const closed = done || n.closedManually;
    const pct = Math.min(100, Math.round((n.coveredQuantity / n.requiredQuantity) * 100));
    const barColor = done ? '#3F8B5C' : pct >= 50 ? '#C1783A' : '#D4A46A';
    return {
      id: n.id,
      supply: sup ? sup.name : 'Insumo',
      unit: sup ? sup.unit.toLowerCase() : '',
      icon: sup ? CAT_ICON[sup.category] ?? DEFAULT_CAT_ICON : DEFAULT_CAT_ICON,
      covered: n.coveredQuantity,
      required: n.requiredQuantity,
      pct,
      pctW: pct + '%',
      barColor,
      deadline: fmtDate(n.deadline),
      open: !closed,
      closed,
      cardOpacity: closed ? '.8' : '1',
      badge: done ? 'Completada' : n.closedManually ? 'Cerrada' : 'Abierta',
      badgeBg: closed ? '#E6F0E7' : '#FBEFD4',
      badgeInk: closed ? '#2C6B45' : '#8A5E12',
      closedNote: done
        ? '✓ Objetivo cumplido — cerrada automáticamente'
        : '✓ Cerrada manualmente — ya no recibe aportes',
    };
  }

  load(): Observable<Need[]> {
    return this.http
      .get<Need[]>(`${this.apiUrl}/needs`)
      .pipe(tap((needs) => this._needs.set(needs)));
  }

  create(data: NeedPatch): Observable<Need> {
    return this.http
      .post<Need>(`${this.apiUrl}/needs`, data)
      .pipe(tap((need) => this._needs.update((list) => [...list, need])));
  }

  update(id: string, data: NeedPatch): Observable<Need> {
    return this.http.put<Need>(`${this.apiUrl}/needs/${id}`, data).pipe(
      tap((need) =>
        this._needs.update((list) => list.map((n) => (n.id === id ? need : n))),
      ),
    );
  }

  setProgress(id: string, coveredQuantity: number): Observable<Need> {
    return this.http
      .patch<Need>(`${this.apiUrl}/needs/${id}/progress`, { coveredQuantity })
      .pipe(
        tap((need) =>
          this._needs.update((list) => list.map((n) => (n.id === id ? need : n))),
        ),
      );
  }

  close(id: string): Observable<Need> {
    return this.http.patch<Need>(`${this.apiUrl}/needs/${id}/close`, {}).pipe(
      tap((need) =>
        this._needs.update((list) => list.map((n) => (n.id === id ? need : n))),
      ),
    );
  }

  find(id: string): Need | undefined {
    return this._needs().find((n) => n.id === id);
  }
}
