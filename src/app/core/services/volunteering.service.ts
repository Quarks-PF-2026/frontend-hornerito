import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  APPLICATION_COLORS,
  APPLICATION_LABEL,
  Application,
  Opportunity,
  OpportunityPatch,
  OpportunityView,
  toDatetimeLocal,
  whenLabel,
} from '../models/volunteering.model';
import { ToastService } from './toast.service';
import { VolunteerTypesService } from './volunteer-types.service';

/** Lo que devuelve aceptar/rechazar: la postulación sin datos del voluntario. */
export type DecidedApplication = Omit<Application, 'volunteerName' | 'volunteerEmail'>;

/** Estado del formulario de alta/edición de una oportunidad. */
export interface OpportunityDraft {
  mode: 'new' | 'edit';
  id: string | null;
  title: string;
  description: string;
  /** Valor de un `<input type="datetime-local">`. */
  startsAt: string;
  location: string;
  /** Id del tipo de voluntario; '' = sin tipo. */
  volunteerTypeId: string;
  capacity: string;
}

@Injectable({ providedIn: 'root' })
export class VolunteeringService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly volunteerTypes = inject(VolunteerTypesService);
  private readonly apiUrl = `${environment.apiUrl}/volunteering`;

  private readonly _opportunities = signal<Opportunity[]>([]);
  readonly opportunities = this._opportunities.asReadonly();

  readonly views = computed<OpportunityView[]>(() =>
    this._opportunities().map((o) => this.toView(o)),
  );

  private readonly _applications = signal<Application[]>([]);
  readonly applications = this._applications.asReadonly();

  // ---------------- estado del formulario ----------------
  private readonly _draft = signal<OpportunityDraft | null>(null);
  private readonly _errors = signal<Record<string, string>>({});
  private readonly _saving = signal(false);

  readonly draft = this._draft.asReadonly();
  readonly errors = this._errors.asReadonly();
  readonly saving = this._saving.asReadonly();

  // ---------------- datos ----------------
  load(): Observable<Opportunity[]> {
    return this.http
      .get<Opportunity[]>(`${this.apiUrl}/opportunities`)
      .pipe(tap((list) => this._opportunities.set(list)));
  }

  find(id: string): Opportunity | undefined {
    return this._opportunities().find((o) => o.id === id);
  }

  close(id: string): Observable<Opportunity> {
    return this.patchOpportunity(id, 'close');
  }

  cancel(id: string): Observable<Opportunity> {
    return this.patchOpportunity(id, 'cancel');
  }

  /** El backend devuelve la postulación; la lista se recarga para ver el cupo. */
  apply(id: string): Observable<Application> {
    return this.http.post<Application>(`${this.apiUrl}/opportunities/${id}/applications`, {});
  }

  loadApplications(opportunityId: string): Observable<Application[]> {
    return this.http
      .get<Application[]>(`${this.apiUrl}/opportunities/${opportunityId}/applications`)
      .pipe(tap((list) => this._applications.set(list)));
  }

  accept(applicationId: string): Observable<DecidedApplication> {
    return this.decide(applicationId, 'accept');
  }

  reject(applicationId: string): Observable<DecidedApplication> {
    return this.decide(applicationId, 'reject');
  }

  // ---------------- formulario ----------------
  openNew(): void {
    this._errors.set({});
    this._draft.set({
      mode: 'new',
      id: null,
      title: '',
      description: '',
      startsAt: '',
      location: '',
      volunteerTypeId: '',
      capacity: '',
    });
  }

  openEdit(id: string): void {
    const opportunity = this.find(id);
    if (!opportunity) return;
    this._errors.set({});
    this._draft.set({
      mode: 'edit',
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      startsAt: toDatetimeLocal(opportunity.startsAt),
      location: opportunity.location,
      volunteerTypeId: opportunity.volunteerTypeId ?? '',
      capacity: String(opportunity.capacity),
    });
  }

  closeForm(): void {
    this._draft.set(null);
    this._errors.set({});
  }

  setField(key: keyof OpportunityDraft, value: string): void {
    this._draft.update((d) => (d ? { ...d, [key]: value } : d));
    this._errors.update((e) => ({ ...e, [key]: '' }));
  }

  save(onSuccess?: () => void): void {
    const draft = this._draft();
    if (!draft || this._saving()) return;

    const errs = this.validate(draft);
    if (Object.keys(errs).length) {
      this._errors.set(errs);
      return;
    }

    const data: OpportunityPatch = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      startsAt: new Date(draft.startsAt).toISOString(),
      location: draft.location.trim(),
      volunteerTypeId: draft.volunteerTypeId || null,
      capacity: Number(draft.capacity),
    };

    const request$ =
      draft.mode === 'new'
        ? this.http
            .post<Opportunity>(`${this.apiUrl}/opportunities`, data)
            .pipe(tap(() => this.load().subscribe()))
        : this.http
            .put<Opportunity>(`${this.apiUrl}/opportunities/${draft.id}`, data)
            .pipe(tap(() => this.load().subscribe()));

    this._saving.set(true);
    request$.subscribe({
      next: () => {
        this._saving.set(false);
        this.toast.show(draft.mode === 'new' ? 'Oportunidad publicada' : 'Oportunidad actualizada');
        onSuccess?.();
      },
      error: (err: HttpErrorResponse) => {
        this._saving.set(false);
        this._errors.set(
          err.status === 409
            ? { capacity: 'No podés dejar menos cupos que los voluntarios ya aceptados.' }
            : { title: 'No se pudo guardar. Intentá de nuevo.' },
        );
      },
    });
  }

  private validate(draft: OpportunityDraft): Record<string, string> {
    const errs: Record<string, string> = {};
    const title = draft.title.trim();
    const description = draft.description.trim();
    const location = draft.location.trim();
    const capacity = Number(draft.capacity);

    if (title.length < 3 || title.length > 80) {
      errs['title'] = 'El título debe tener entre 3 y 80 caracteres.';
    }
    if (description.length < 10) {
      errs['description'] = 'Contá en qué consiste la actividad (mínimo 10 caracteres).';
    }
    if (!draft.startsAt) {
      errs['startsAt'] = 'Elegí la fecha y hora de la actividad.';
    }
    if (location.length < 3) {
      errs['location'] = 'Ingresá el lugar de la actividad.';
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
      errs['capacity'] = 'Los cupos deben ser un número entero entre 1 y 1000.';
    }

    return errs;
  }

  private patchOpportunity(id: string, action: 'close' | 'cancel'): Observable<Opportunity> {
    return this.http
      .patch<Opportunity>(`${this.apiUrl}/opportunities/${id}/${action}`, {})
      .pipe(tap(() => this.load().subscribe()));
  }

  /**
   * Aceptar/rechazar devuelven la postulación cruda, sin el nombre ni el mail
   * del voluntario (eso solo lo arma el listado). Por eso se hace merge sobre
   * la fila que ya está en pantalla en vez de reemplazarla.
   */
  private decide(
    applicationId: string,
    action: 'accept' | 'reject',
  ): Observable<DecidedApplication> {
    return this.http
      .patch<DecidedApplication>(`${this.apiUrl}/applications/${applicationId}/${action}`, {})
      .pipe(
        tap((decided) => {
          this._applications.update((list) =>
            list.map((a) => (a.id === decided.id ? { ...a, ...decided } : a)),
          );
          // El cupo cambia al aceptar, así que el listado se refresca.
          this.load().subscribe();
        }),
      );
  }

  private toView(o: Opportunity): OpportunityView {
    const badge = this.badgeFor(o);
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      location: o.location,
      when: whenLabel(o.startsAt),
      volunteerTypeName: o.volunteerTypeId
        ? (this.volunteerTypes.find(o.volunteerTypeId)?.name ?? '')
        : '',
      cupos: `${o.acceptedCount} de ${o.capacity} cupos cubiertos`,
      isOpen: o.isOpen,
      status: o.status,
      myApplicationStatus: o.myApplicationStatus,
      pendingCount: o.pendingCount,
      ...badge,
      cardOpacity: o.isOpen ? '1' : '.8',
    };
  }

  private badgeFor(o: Opportunity): {
    badge: string;
    badgeBg: string;
    badgeInk: string;
  } {
    // La postulación propia manda: es la notificación in-app del voluntario.
    if (o.myApplicationStatus) {
      const colors = APPLICATION_COLORS[o.myApplicationStatus];
      return {
        badge: APPLICATION_LABEL[o.myApplicationStatus],
        badgeBg: colors.bg,
        badgeInk: colors.ink,
      };
    }
    if (o.status === 'cancelled') {
      return {
        badge: 'Cancelada',
        badgeBg: 'var(--hn-danger-bg)',
        badgeInk: 'var(--hn-danger-ink)',
      };
    }
    if (!o.isOpen) {
      return {
        badge: o.status === 'closed' ? 'Cerrada' : 'Cupos completos',
        badgeBg: 'var(--hn-cream-soft)',
        badgeInk: 'var(--hn-muted)',
      };
    }
    return {
      badge: 'Abierta',
      badgeBg: 'var(--hn-success-bg)',
      badgeInk: 'var(--hn-success-ink)',
    };
  }
}
