import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteerTypesService } from '../../../../core/services/volunteer-types.service';
import {
  OpportunityDraft,
  VolunteeringService,
} from '../../../../core/services/volunteering.service';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';

/** Alta/edición de un tipo de voluntario sin salir del formulario (QK-33). */
interface TypeSheet {
  mode: 'new' | 'edit';
  id: string | null;
  name: string;
  /** Solo en modo edit: refleja el estado del tipo que se está editando. */
  active: boolean;
  error: string;
}

@Component({
  selector: 'app-oportunidad-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet],
  templateUrl: './oportunidad-form.html',
  styleUrl: './oportunidad-form.scss',
})
export class OportunidadFormPage {
  private readonly volunteering = inject(VolunteeringService);
  private readonly volunteerTypes = inject(VolunteerTypesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly draft = this.volunteering.draft;
  readonly errors = this.volunteering.errors;
  readonly saving = this.volunteering.saving;

  /**
   * Los tipos vigentes, más el que ya tenga la actividad aunque esté de baja:
   * si no, editar una actividad vieja le borraría el tipo sin avisar.
   */
  readonly types = computed(() => {
    const active = this.volunteerTypes.active();
    const current = this.volunteerTypes.find(this.draft()?.volunteerTypeId ?? '');
    return current && !current.active ? [...active, current] : active;
  });
  readonly typeSheet = signal<TypeSheet | null>(null);

  constructor() {
    this.volunteerTypes.load().subscribe();

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

  // ---------------- catálogo de tipos ----------------
  openNewType(): void {
    this.typeSheet.set({ mode: 'new', id: null, name: '', active: true, error: '' });
  }

  openEditType(): void {
    const type = this.volunteerTypes.find(this.draft()?.volunteerTypeId ?? '');
    if (!type) return;
    this.typeSheet.set({
      mode: 'edit',
      id: type.id,
      name: type.name,
      active: type.active,
      error: '',
    });
  }

  closeTypeSheet(): void {
    this.typeSheet.set(null);
  }

  onTypeName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.typeSheet.update((s) => (s ? { ...s, name, error: '' } : s));
  }

  saveType(): void {
    const sheet = this.typeSheet();
    if (!sheet) return;

    const name = sheet.name.trim();
    if (name.length < 2 || name.length > 60) {
      this.typeSheet.set({ ...sheet, error: 'El nombre debe tener entre 2 y 60 caracteres.' });
      return;
    }

    const request$ =
      sheet.mode === 'new'
        ? this.volunteerTypes.create({ name })
        : this.volunteerTypes.update(sheet.id!, { name });

    request$.subscribe({
      next: (type) => {
        // Al crear se deja elegido el tipo nuevo: es para lo que se abrió el sheet.
        if (sheet.mode === 'new') {
          this.volunteering.setField('volunteerTypeId', type.id);
        }
        this.closeTypeSheet();
        this.toast.show(sheet.mode === 'new' ? 'Tipo de voluntario agregado' : 'Tipo actualizado');
      },
      error: (err: HttpErrorResponse) =>
        this.typeSheet.update((s) =>
          s
            ? {
                ...s,
                error:
                  err.status === 409
                    ? ((err.error as { message?: string })?.message ??
                      'Ya existe un tipo de voluntario con ese nombre.')
                    : 'No se pudo guardar. Intentá de nuevo.',
              }
            : s,
        ),
    });
  }

  toggleType(): void {
    const sheet = this.typeSheet();
    if (!sheet?.id) return;

    this.volunteerTypes.toggle(sheet.id).subscribe({
      next: (type) => {
        // Un tipo dado de baja sale del select, así que el campo se limpia.
        if (!type.active && this.draft()?.volunteerTypeId === type.id) {
          this.volunteering.setField('volunteerTypeId', '');
        }
        this.closeTypeSheet();
        this.toast.show(type.active ? 'Tipo reactivado' : 'Tipo dado de baja');
      },
      error: () =>
        this.typeSheet.update((s) =>
          s ? { ...s, error: 'No se pudo cambiar el estado. Intentá de nuevo.' } : s,
        ),
    });
  }
}
