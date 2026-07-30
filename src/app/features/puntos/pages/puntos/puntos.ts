import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CollectionPointsService } from '../../../../core/services/collection-points.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Badge } from '../../../../shared/ui/badge/badge';

@Component({
  selector: 'app-puntos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  templateUrl: './puntos.html',
  styleUrl: './puntos.scss',
})
export class PuntosPage {
  private readonly auth = inject(AuthService);
  readonly canWrite = this.auth.canWriteContent;
  private readonly pointsSvc = inject(CollectionPointsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly views = this.pointsSvc.views;

  constructor() {
    this.pointsSvc.load().subscribe();
  }

  newPoint(): void {
    void this.router.navigate(['/app/puntos/nuevo']);
  }

  edit(id: string): void {
    void this.router.navigate(['/app/puntos', id, 'editar']);
  }

  deactivate(id: string): void {
    this.pointsSvc.deactivate(id).subscribe({
      next: () => this.toast.show('Punto desactivado · ya no se ofrece para donar'),
      error: () => this.toast.show('No se pudo desactivar el punto'),
    });
  }

  activate(id: string): void {
    this.pointsSvc.activate(id).subscribe({
      next: () => this.toast.show('Punto reactivado'),
      error: () => this.toast.show('No se pudo reactivar el punto'),
    });
  }
}
