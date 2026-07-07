import { Injectable, computed, inject, signal } from '@angular/core';
import { Need, NeedView } from '../models/need.model';
import { CAT_ICON, DEFAULT_CAT_ICON } from '../models/catalog';
import { fmtDate } from '../util/format';
import { SuppliesService } from './supplies.service';

@Injectable({ providedIn: 'root' })
export class NeedsService {
  private readonly suppliesSvc = inject(SuppliesService);

  private readonly _needs = signal<Need[]>([
    { id: 1, supplyId: 1, required: 50, covered: 30, deadline: '2026-07-15', closedManual: false },
    { id: 2, supplyId: 2, required: 40, covered: 40, deadline: '2026-07-10', closedManual: false },
    { id: 3, supplyId: 4, required: 24, covered: 6, deadline: '2026-07-20', closedManual: false },
    { id: 4, supplyId: 3, required: 30, covered: 12, deadline: '2026-07-18', closedManual: false },
  ]);
  readonly needs = this._needs.asReadonly();
  private nextId = 5;

  /** Vistas derivadas (reaccionan a cambios de needs y supplies). */
  readonly views = computed<NeedView[]>(() => this._needs().map((n) => this.toView(n)));
  readonly openViews = computed(() => this.views().filter((v) => v.open));

  private toView(n: Need): NeedView {
    const sup = this.suppliesSvc.find(n.supplyId);
    const done = n.covered >= n.required;
    const closed = done || n.closedManual;
    const pct = Math.min(100, Math.round((n.covered / n.required) * 100));
    const barColor = done ? '#3F8B5C' : pct >= 50 ? '#C1783A' : '#D4A46A';
    return {
      id: n.id,
      supply: sup ? sup.name : 'Insumo',
      unit: sup ? sup.unit.toLowerCase() : '',
      icon: sup ? CAT_ICON[sup.category] ?? DEFAULT_CAT_ICON : DEFAULT_CAT_ICON,
      covered: n.covered,
      required: n.required,
      pct,
      pctW: pct + '%',
      barColor,
      deadline: fmtDate(n.deadline),
      open: !closed,
      closed,
      cardOpacity: closed ? '.8' : '1',
      badge: done ? 'Completada' : n.closedManual ? 'Cerrada' : 'Abierta',
      badgeBg: closed ? '#E6F0E7' : '#FBEFD4',
      badgeInk: closed ? '#2C6B45' : '#8A5E12',
      closedNote: done
        ? '✓ Objetivo cumplido — cerrada automáticamente'
        : '✓ Cerrada manualmente — ya no recibe aportes',
    };
  }

  add(data: Pick<Need, 'supplyId' | 'required' | 'deadline'>): void {
    this._needs.update((list) => [
      ...list,
      { id: this.nextId++, covered: 0, closedManual: false, ...data },
    ]);
  }

  update(id: number, data: Pick<Need, 'supplyId' | 'required' | 'deadline'>): void {
    this._needs.update((list) => list.map((n) => (n.id === id ? { ...n, ...data } : n)));
  }

  /** Actualiza el progreso. Devuelve si quedó completada. */
  setProgress(id: number, covered: number): { completed: boolean } {
    let completed = false;
    this._needs.update((list) =>
      list.map((n) => {
        if (n.id !== id) return n;
        completed = covered >= n.required;
        return { ...n, covered };
      }),
    );
    return { completed };
  }

  close(id: number): void {
    this._needs.update((list) =>
      list.map((n) => (n.id === id ? { ...n, closedManual: true } : n)),
    );
  }

  find(id: number): Need | undefined {
    return this._needs().find((n) => n.id === id);
  }
}
