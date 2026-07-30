import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { NeedsService } from '../../../../core/services/needs.service';
import { ModalService } from '../../../../core/services/modal.service';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';
import { Badge } from '../../../../shared/ui/badge/badge';

@Component({
  selector: 'app-necesidades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar, Badge],
  templateUrl: './necesidades.html',
  styleUrl: './necesidades.scss',
})
export class NecesidadesPage {
  private readonly auth = inject(AuthService);
  readonly canWrite = this.auth.canWriteContent;
  private readonly needsSvc = inject(NeedsService);
  private readonly suppliesSvc = inject(SuppliesService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  readonly views = this.needsSvc.views;

  constructor() {
    this.suppliesSvc.load().subscribe();
    this.needsSvc.load().subscribe();
  }

  progress(id: string): void {
    this.modal.progress(id);
  }
  edit(id: string): void {
    this.modal.editNeed(id);
  }
  close(id: string): void {
    this.needsSvc.close(id).subscribe({
      next: () => this.toast.show('Necesidad cerrada manualmente'),
      error: () => this.toast.show('No se pudo cerrar la necesidad'),
    });
  }
}
