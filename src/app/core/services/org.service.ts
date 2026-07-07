import { Injectable, signal } from '@angular/core';
import { Org, OrgStatus } from '../models/org.model';

@Injectable({ providedIn: 'root' })
export class OrgService {
  private readonly _org = signal<Org>({
    name: 'Comedor Manos del Barrio',
    desc: 'Brindamos almuerzo y merienda a más de 80 chicos y chicas del barrio San Nicolás, de lunes a viernes.',
    address: 'Bv. Sarmiento 1450, Villa María, Córdoba',
    contact: '353 412-7788 · comedormanosdelbarrio@gmail.com',
    status: 'pendiente',
    rejectReason:
      'La dirección no coincide con la documentación enviada. Verificá los datos y volvé a guardar.',
  });

  readonly org = this._org.asReadonly();

  setStatus(status: OrgStatus): void {
    this._org.update((o) => ({ ...o, status }));
  }

  /** Actualiza datos. Si estaba rechazada, vuelve a 'pendiente' (reenvío a validación). */
  update(patch: Pick<Org, 'name' | 'desc' | 'address' | 'contact'>): { resent: boolean } {
    const resent = this._org().status === 'rechazada';
    this._org.update((o) => ({ ...o, ...patch, status: resent ? 'pendiente' : o.status }));
    return { resent };
  }
}
