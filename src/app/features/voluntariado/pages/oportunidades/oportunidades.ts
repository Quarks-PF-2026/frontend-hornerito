import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteerRequestsService } from '../../../../core/services/volunteer-requests.service';
import { VolunteerTypesService } from '../../../../core/services/volunteer-types.service';
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
  private readonly volunteerTypes = inject(VolunteerTypesService);
  private readonly requests = inject(VolunteerRequestsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly views = this.volunteering.views;
  /** Contador de la entrada a solicitudes de la comunidad (QK-16). */
  readonly pendingRequests = this.requests.pendingCount;

  constructor() {
    this.volunteering.load().subscribe();
    // El nombre del tipo lo resuelve la vista contra este catálogo.
    this.volunteerTypes.load().subscribe();
    if (this.canWrite()) {
      // Solo por el contador: la lista se carga de nuevo al entrar a la página.
      this.requests.load().subscribe({ error: () => undefined });
    }
  }

  newOpportunity(): void {
    void this.router.navigate(['/app/voluntariado/nueva']);
  }

  edit(id: string): void {
    void this.router.navigate(['/app/voluntariado', id, 'editar']);
  }

  requestsInbox(): void {
    void this.router.navigate(['/app/voluntariado/solicitudes']);
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
