import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteeringService } from '../../../../core/services/volunteering.service';
import { Badge } from '../../../../shared/ui/badge/badge';

/**
 * Un único listado para los dos lados: el voluntario se postula y ve el estado
 * de su postulación en el badge; el gestor edita, cierra y entra a la bandeja.
 */
@Component({
  selector: 'app-oportunidades',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge],
  templateUrl: './oportunidades.html',
  styleUrl: './oportunidades.scss',
})
export class OportunidadesPage {
  private readonly auth = inject(AuthService);
  readonly canWrite = this.auth.canWriteContent;
  private readonly volunteering = inject(VolunteeringService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly views = this.volunteering.views;

  constructor() {
    this.volunteering.load().subscribe();
  }

  newOpportunity(): void {
    void this.router.navigate(['/app/voluntariado/nueva']);
  }

  edit(id: string): void {
    void this.router.navigate(['/app/voluntariado', id, 'editar']);
  }

  applications(id: string): void {
    void this.router.navigate(['/app/voluntariado', id, 'postulaciones']);
  }

  apply(id: string): void {
    this.volunteering.apply(id).subscribe({
      next: () => {
        this.toast.show('Te postulaste · esperá la respuesta del comedor');
        this.volunteering.load().subscribe();
      },
      error: (err: HttpErrorResponse) =>
        this.toast.show(
          err.status === 409
            ? 'La actividad ya no acepta postulaciones'
            : 'No se pudo enviar la postulación',
        ),
    });
  }

  close(id: string): void {
    this.volunteering.close(id).subscribe({
      next: () => this.toast.show('Actividad cerrada · ya no acepta postulaciones'),
      error: () => this.toast.show('No se pudo cerrar la actividad'),
    });
  }

  cancel(id: string): void {
    this.volunteering.cancel(id).subscribe({
      next: () => this.toast.show('Actividad cancelada'),
      error: () => this.toast.show('No se pudo cancelar la actividad'),
    });
  }
}
