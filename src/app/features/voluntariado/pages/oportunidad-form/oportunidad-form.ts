import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  OpportunityDraft,
  VolunteeringService,
} from '../../../../core/services/volunteering.service';

@Component({
  selector: 'app-oportunidad-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './oportunidad-form.html',
  styleUrl: './oportunidad-form.scss',
})
export class OportunidadFormPage {
  private readonly volunteering = inject(VolunteeringService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly draft = this.volunteering.draft;
  readonly errors = this.volunteering.errors;
  readonly saving = this.volunteering.saving;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      // Alta: no depende del listado, se abre el form de una.
      this.volunteering.openNew();
    } else if (this.volunteering.find(id)) {
      this.volunteering.openEdit(id);
    } else {
      // Edición por URL directa: hace falta cargar la oportunidad primero.
      this.volunteering.load().subscribe({
        next: () => (this.volunteering.find(id) ? this.volunteering.openEdit(id) : this.back()),
        error: () => this.back(),
      });
    }
  }

  back(): void {
    this.volunteering.closeForm();
    void this.router.navigate(['/app/voluntariado']);
  }

  save(): void {
    this.volunteering.save(() => this.back());
  }

  onField(key: keyof OpportunityDraft, event: Event): void {
    this.volunteering.setField(key, (event.target as HTMLInputElement).value);
  }
}
