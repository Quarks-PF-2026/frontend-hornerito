import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  APPLICATION_COLORS,
  APPLICATION_LABEL,
  ApplicationStatus,
} from '../../../../core/models/volunteering.model';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteeringService } from '../../../../core/services/volunteering.service';
import { Badge } from '../../../../shared/ui/badge/badge';

@Component({
  selector: 'app-postulaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  templateUrl: './postulaciones.html',
  styleUrl: './postulaciones.scss',
})
export class PostulacionesPage {
  private readonly volunteering = inject(VolunteeringService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly opportunityId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly deciding = signal<string | null>(null);

  readonly opportunity = computed(() =>
    this.volunteering.views().find((o) => o.id === this.opportunityId),
  );
  readonly rows = computed(() =>
    this.volunteering.applications().map((a) => ({
      ...a,
      label: APPLICATION_LABEL[a.status],
      bg: APPLICATION_COLORS[a.status].bg,
      ink: APPLICATION_COLORS[a.status].ink,
      pending: a.status === 'pending',
    })),
  );

  constructor() {
    if (!this.opportunityId) {
      this.back();
    } else {
      if (!this.volunteering.find(this.opportunityId)) {
        this.volunteering.load().subscribe();
      }
      this.volunteering.loadApplications(this.opportunityId).subscribe({
        error: () => this.back(),
      });
    }
  }

  back(): void {
    void this.router.navigate(['/app/voluntariado']);
  }

  accept(id: string): void {
    this.decide(id, 'accepted');
  }

  reject(id: string): void {
    this.decide(id, 'rejected');
  }

  private decide(id: string, outcome: Exclude<ApplicationStatus, 'pending'>): void {
    if (this.deciding()) return;
    this.deciding.set(id);

    const request$ =
      outcome === 'accepted' ? this.volunteering.accept(id) : this.volunteering.reject(id);

    request$.subscribe({
      next: () => {
        this.deciding.set(null);
        this.toast.show(
          outcome === 'accepted' ? 'Postulación aceptada · cupo ocupado' : 'Postulación rechazada',
        );
      },
      error: (err: HttpErrorResponse) => {
        this.deciding.set(null);
        this.toast.show(
          err.status === 409
            ? 'Ya no quedan cupos disponibles'
            : 'No se pudo resolver la postulación',
        );
        this.volunteering.loadApplications(this.opportunityId).subscribe();
      },
    });
  }
}
