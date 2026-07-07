import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NeedsService } from '../../../../core/services/needs.service';
import { ModalService } from '../../../../core/services/modal.service';
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
  private readonly needsSvc = inject(NeedsService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  readonly views = this.needsSvc.views;

  progress(id: number): void {
    this.modal.progress(id);
  }
  edit(id: number): void {
    this.modal.editNeed(id);
  }
  close(id: number): void {
    this.needsSvc.close(id);
    this.toast.show('Necesidad cerrada manualmente');
  }
}
