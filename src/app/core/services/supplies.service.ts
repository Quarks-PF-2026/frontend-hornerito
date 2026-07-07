import { Injectable, computed, signal } from '@angular/core';
import { Supply } from '../models/supply.model';

@Injectable({ providedIn: 'root' })
export class SuppliesService {
  private readonly _supplies = signal<Supply[]>([
    { id: 1, name: 'Arroz', category: 'Alimentos secos', unit: 'Kilogramos', active: true },
    { id: 2, name: 'Leche', category: 'Frescos', unit: 'Litros', active: true },
    { id: 3, name: 'Aceite', category: 'Alimentos secos', unit: 'Litros', active: true },
    { id: 4, name: 'Fideos', category: 'Alimentos secos', unit: 'Paquetes', active: true },
    { id: 5, name: 'Yerba', category: 'Alimentos secos', unit: 'Kilogramos', active: true },
    { id: 6, name: 'Lavandina', category: 'Limpieza', unit: 'Litros', active: false },
  ]);
  readonly supplies = this._supplies.asReadonly();
  readonly active = computed(() => this._supplies().filter((s) => s.active));
  private nextId = 7;

  add(data: Pick<Supply, 'name' | 'category' | 'unit'>): void {
    this._supplies.update((list) => [...list, { id: this.nextId++, active: true, ...data }]);
  }

  update(id: number, data: Pick<Supply, 'name' | 'category' | 'unit'>): void {
    this._supplies.update((list) => list.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }

  /** Alterna alta/baja. Devuelve true si quedó activo. */
  toggle(id: number): boolean {
    let nowActive = false;
    this._supplies.update((list) =>
      list.map((s) => {
        if (s.id !== id) return s;
        nowActive = !s.active;
        return { ...s, active: nowActive };
      }),
    );
    return nowActive;
  }

  find(id: number): Supply | undefined {
    return this._supplies().find((s) => s.id === id);
  }

  existsName(name: string, exceptId?: number): boolean {
    const n = name.trim().toLowerCase();
    return this._supplies().some((s) => s.name.trim().toLowerCase() === n && s.id !== exceptId);
  }
}
