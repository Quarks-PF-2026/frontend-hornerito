import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EventsService } from '../../../../core/services/events.service';
import { ModalService } from '../../../../core/services/modal.service';
import { scheduleLabel } from '../../../../core/models/event.model';
import { fmtDate } from '../../../../core/util/format';

@Component({
  selector: 'app-eventos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './eventos.html',
  styleUrl: './eventos.scss',
})
export class EventosPage {
  private readonly auth = inject(AuthService);
  /** Crear/editar/dar de baja: solo owner/admin/coordinador (backend revalida). */
  readonly canWrite = this.auth.canWriteContent;
  private readonly eventsSvc = inject(EventsService);
  private readonly modal = inject(ModalService);
  private readonly router = inject(Router);

  readonly activeViews = computed(() =>
    this.eventsSvc.active().map((e) => ({
      ...e,
      schedule: scheduleLabel(e),
      startLabel: fmtDate(e.startDate),
    })),
  );
  readonly inactiveViews = computed(() =>
    this.eventsSvc.inactive().map((e) => ({
      ...e,
      schedule: scheduleLabel(e),
      endedLabel: e.endedOn ? fmtDate(e.endedOn) : '',
    })),
  );

  constructor() {
    this.eventsSvc.load().subscribe();
  }

  open(id: string): void {
    void this.router.navigate(['/app/eventos', id]);
  }

  newEvent(): void {
    this.modal.newEvent();
  }

  edit(id: string, event: Event): void {
    event.stopPropagation();
    this.modal.editEvent(id);
  }

  deactivate(id: string, event: Event): void {
    event.stopPropagation();
    this.modal.confirmDeactivateEvent(id);
  }
}
