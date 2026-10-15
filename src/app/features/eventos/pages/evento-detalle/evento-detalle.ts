import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventOccurrence, scheduleLabel } from '../../../../core/models/event.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EventsService } from '../../../../core/services/events.service';
import { NeedsService } from '../../../../core/services/needs.service';
import { SuppliesService } from '../../../../core/services/supplies.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VolunteeringService } from '../../../../core/services/volunteering.service';
import { fmtDate } from '../../../../core/util/format';

interface OccurrenceRow {
  date: string;
  dateLabel: string;
  count: number | null;
  draft: string;
  saving: boolean;
  error: string;
}

/**
 * Cargar/corregir el conteo es para cualquier miembro activo (voluntario
 * incluido): a diferencia del listado de eventos, acá no hay `canWrite()`.
 */
@Component({
  selector: 'app-evento-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './evento-detalle.html',
  styleUrl: './evento-detalle.scss',
})
export class EventoDetallePage {
  private readonly eventsSvc = inject(EventsService);
  private readonly needsSvc = inject(NeedsService);
  private readonly volunteering = inject(VolunteeringService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly rows = signal<OccurrenceRow[]>([]);

  readonly canWrite = this.auth.canWriteContent;

  /** Necesidades y actividades asociadas a este evento, y las abiertas que todavía no tienen evento. */
  readonly linkedNeeds = computed(() => this.needsSvc.views().filter((v) => v.eventId === this.id));
  readonly freeNeeds = computed(() => this.needsSvc.openViews().filter((v) => !v.eventId));
  readonly linkedOpportunities = computed(() =>
    this.volunteering.views().filter((v) => v.eventId === this.id),
  );
  readonly freeOpportunities = computed(() =>
    this.volunteering.views().filter((v) => v.isOpen && !v.eventId),
  );

  readonly event = computed(() => this.eventsSvc.find(this.id));
  readonly schedule = computed(() => {
    const ev = this.event();
    return ev ? scheduleLabel(ev) : '';
  });

  constructor() {
    // Las asociaciones viven en cada necesidad/actividad: se cargan sus listados.
    inject(SuppliesService).load().subscribe();
    this.needsSvc.load().subscribe();
    this.volunteering.load().subscribe();
    if (this.eventsSvc.find(this.id)) {
      this.loadOccurrences();
    } else {
      // Entrada directa por URL: el store todavía no tiene el evento.
      this.eventsSvc.load().subscribe({
        next: () => {
          if (this.eventsSvc.find(this.id)) {
            this.loadOccurrences();
          } else {
            this.notFound.set(true);
            this.loading.set(false);
          }
        },
        error: () => {
          this.notFound.set(true);
          this.loading.set(false);
        },
      });
    }
  }

  private loadOccurrences(): void {
    // Default del backend: últimos 30 días. No hace falta un selector de rango.
    this.eventsSvc.occurrences(this.id).subscribe({
      next: (occ) => {
        // Backend devuelve asc; en pantalla va más reciente primero.
        this.rows.set([...occ].reverse().map((o) => this.toRow(o)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('No se pudieron cargar las ocurrencias');
      },
    });
  }

  private toRow(o: EventOccurrence): OccurrenceRow {
    return {
      date: o.date,
      dateLabel: fmtDate(o.date),
      count: o.count,
      draft: o.count != null ? String(o.count) : '',
      saving: false,
      error: '',
    };
  }

  linkNeed(event: Event): void {
    this.setNeedEvent((event.target as HTMLSelectElement).value, this.id);
    (event.target as HTMLSelectElement).value = '';
  }
  linkOpportunity(event: Event): void {
    this.setOpportunityEvent((event.target as HTMLSelectElement).value, this.id);
    (event.target as HTMLSelectElement).value = '';
  }

  setNeedEvent(needId: string, eventId: string | null): void {
    if (!needId) return;
    this.needsSvc.setEvent(needId, eventId).subscribe({
      error: (err: HttpErrorResponse) =>
        this.toast.show(err.error?.message ?? 'No se pudo actualizar la necesidad'),
    });
  }

  setOpportunityEvent(opportunityId: string, eventId: string | null): void {
    if (!opportunityId) return;
    this.volunteering.setEvent(opportunityId, eventId).subscribe({
      error: (err: HttpErrorResponse) =>
        this.toast.show(err.error?.message ?? 'No se pudo actualizar la actividad'),
    });
  }

  back(): void {
    void this.router.navigate(['/app/eventos']);
  }

  /** Lleva al input de la ocurrencia más reciente sin cargar (o la más reciente). */
  register(): void {
    const list = this.rows();
    const target = list.find((r) => r.count == null) ?? list[0];
    const input = document.getElementById(`count-${target.date}`);
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }

  onDraft(date: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchRow(date, { draft: value, error: '' });
  }

  save(row: OccurrenceRow): void {
    const count = parseInt(row.draft, 10);
    if (row.draft.trim() === '' || isNaN(count) || count < 0) {
      this.patchRow(row.date, { error: 'Ingresá un número entero mayor o igual a cero.' });
      return;
    }
    this.patchRow(row.date, { saving: true, error: '' });
    this.eventsSvc.setAttendance(this.id, row.date, count).subscribe({
      next: (res) => {
        this.patchRow(row.date, { saving: false, count: res.count, draft: String(res.count) });
        this.toast.show('Asistencia guardada');
      },
      error: (err: HttpErrorResponse) => {
        this.patchRow(row.date, {
          saving: false,
          error: err.error?.message ?? 'No se pudo guardar. Intentá de nuevo.',
        });
      },
    });
  }

  private patchRow(date: string, patch: Partial<OccurrenceRow>): void {
    this.rows.update((list) => list.map((r) => (r.date === date ? { ...r, ...patch } : r)));
  }
}
