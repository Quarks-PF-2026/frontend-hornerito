import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CAT_BG, CAT_ICON, DEFAULT_CAT_BG, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { ModalService } from '../../../../core/services/modal.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-insumos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './insumos.html',
  styleUrl: './insumos.scss',
})
export class InsumosPage {
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.suppliesSvc.load().subscribe();
  }

  readonly views = computed(() =>
    this.suppliesSvc.supplies().map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      unit: s.unit,
      icon: CAT_ICON[s.category] ?? DEFAULT_CAT_ICON,
      catBg: CAT_BG[s.category] ?? DEFAULT_CAT_BG,
      inactive: !s.active,
      opacity: s.active ? '1' : '.55',
      toggleIcon: s.active ? '⊘' : '↻',
      toggleInk: s.active ? '#9A8C7A' : '#3F8B5C',
      toggleTitle: s.active ? 'Dar de baja' : 'Reactivar',
    })),
  );

  edit(id: string): void {
    this.modal.editSupply(id);
  }
  toggle(id: string): void {
    this.suppliesSvc.toggle(id).subscribe((supply) => {
      this.toast.show(supply.active ? 'Insumo reactivado' : 'Insumo dado de baja');
    });
  }
}
