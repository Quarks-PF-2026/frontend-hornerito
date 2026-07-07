import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalService } from '../../../core/services/modal.service';
import { OrgService } from '../../../core/services/org.service';
import { NeedsService } from '../../../core/services/needs.service';
import { BottomSheet } from '../../../shared/ui/bottom-sheet/bottom-sheet';
import { ProgressBar } from '../../../shared/ui/progress-bar/progress-bar';

@Component({
  selector: 'app-modal-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet, ProgressBar],
  templateUrl: './modal-host.html',
  styleUrl: './modal-host.scss',
})
export class ModalHost {
  readonly modal = inject(ModalService);
  private readonly orgSvc = inject(OrgService);
  private readonly needsSvc = inject(NeedsService);

  readonly org = this.orgSvc.org;
  readonly openNeeds = this.needsSvc.openViews;

  onInput(key: string, event: Event): void {
    this.modal.setField(key, (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
  }
}
