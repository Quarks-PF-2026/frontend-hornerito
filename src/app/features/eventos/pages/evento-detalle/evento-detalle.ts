import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EVENT_KIND_LABEL, EventOccurrence } from '../../../../core/models/event.model';
import { EventsService } from '../../../../core/services/events.service';
import { ToastService } from '../../../../core/services/toast.service';
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
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly rows = signal<OccurrenceRow[]>([]);

  readonly event = computed(() => this.eventsSvc.find(this.id));
  readonly kindLabel = computed(() => {
    const ev = this.event();
    return ev ? EVENT_KIND_LABEL[ev.kind] : '';
  });

  constructor() {
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

  back(): void {
    void this.router.navigate(['/app/eventos']);
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
