import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CollectionPoint,
  CollectionPointPatch,
  CollectionPointView,
  DAY_LABELS,
  ScheduleDay,
  defaultSchedule,
} from '../models/collection-point.model';
import { ToastService } from './toast.service';

/** Estado del formulario de alta/edición (lo abre el FAB del layout o la página). */
export interface CollectionPointDraft {
  mode: 'new' | 'edit';
  id: string | null;
  name: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  contactName: string;
  schedule: ScheduleDay[];
}

@Injectable({ providedIn: 'root' })
export class CollectionPointsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _points = signal<CollectionPoint[]>([]);
  readonly points = this._points.asReadonly();

  readonly views = computed<CollectionPointView[]>(() =>
    this._points().map((p) => this.toView(p)),
  );
  readonly activePoints = computed(() => this._points().filter((p) => p.active));

  // ---------------- estado del formulario ----------------
  private readonly _draft = signal<CollectionPointDraft | null>(null);
  private readonly _errors = signal<Record<string, string>>({});
  private readonly _saving = signal(false);

  readonly draft = this._draft.asReadonly();
  readonly errors = this._errors.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly isOpen = computed(() => this._draft() !== null);

  // ---------------- datos ----------------
  load(): Observable<CollectionPoint[]> {
    return this.http
      .get<CollectionPoint[]>(`${this.apiUrl}/collection-points`)
      .pipe(tap((points) => this._points.set(points)));
  }

  find(id: string): CollectionPoint | undefined {
    return this._points().find((p) => p.id === id);
  }

  deactivate(id: string): Observable<CollectionPoint> {
    return this.http
      .patch<CollectionPoint>(`${this.apiUrl}/collection-points/${id}/deactivate`, {})
      .pipe(tap((point) => this.replace(point)));
  }

  activate(id: string): Observable<CollectionPoint> {
    return this.http
      .patch<CollectionPoint>(`${this.apiUrl}/collection-points/${id}/activate`, {})
      .pipe(tap((point) => this.replace(point)));
  }

  // ---------------- formulario ----------------
  openNew(): void {
    this._errors.set({});
    this._draft.set({
      mode: 'new',
      id: null,
      name: '',
      addressLine: '',
      latitude: null,
      longitude: null,
      phone: '',
      email: '',
      contactName: '',
      schedule: defaultSchedule(),
    });
  }

  openEdit(id: string): void {
    const point = this.find(id);
    if (!point) return;
    this._errors.set({});
    this._draft.set({
      mode: 'edit',
      id: point.id,
      name: point.name,
      addressLine: point.addressLine,
      latitude: point.latitude,
      longitude: point.longitude,
      phone: point.phone,
      email: point.email ?? '',
      contactName: point.contactName ?? '',
      schedule: point.schedule.map((d) => ({ ...d })),
    });
  }

  closeForm(): void {
    this._draft.set(null);
    this._errors.set({});
  }

  setField(key: keyof CollectionPointDraft, value: string): void {
    this._draft.update((d) => (d ? { ...d, [key]: value } : d));
    this.clearError(key);
  }

  setLocation(latitude: number, longitude: number): void {
    this._draft.update((d) => (d ? { ...d, latitude, longitude } : d));
    this.clearError('latitude');
  }

  /** Aplica la dirección elegida en el buscador: texto + coordenadas juntos. */
  applyGeocodeResult(label: string, lat: number, lon: number): void {
    this._draft.update((d) =>
      d ? { ...d, addressLine: label, latitude: lat, longitude: lon } : d,
    );
    this.clearError('addressLine');
    this.clearError('latitude');
  }

  toggleDayClosed(day: number): void {
    this._draft.update((d) => {
      if (!d) return d;
      const schedule = d.schedule.map((s) =>
        s.day === day
          ? s.closed
            ? { ...s, closed: false, open: '09:00', close: '18:00' }
            : { ...s, closed: true, open: null, close: null }
          : s,
      );
      return { ...d, schedule };
    });
    this.clearError('schedule');
  }

  setDayTime(day: number, field: 'open' | 'close', value: string): void {
    this._draft.update((d) => {
      if (!d) return d;
      const schedule = d.schedule.map((s) => (s.day === day ? { ...s, [field]: value } : s));
      return { ...d, schedule };
    });
    this.clearError('schedule');
  }

  save(onSuccess?: () => void): void {
    const draft = this._draft();
    if (!draft || this._saving()) return;

    const errs = this.validate(draft);
    if (Object.keys(errs).length) {
      this._errors.set(errs);
      return;
    }

    const data: CollectionPointPatch = {
      name: draft.name.trim(),
      addressLine: draft.addressLine.trim(),
      latitude: draft.latitude!,
      longitude: draft.longitude!,
      phone: draft.phone.trim(),
      email: draft.email.trim() || null,
      contactName: draft.contactName.trim() || null,
      schedule: draft.schedule,
    };

    const request$ =
      draft.mode === 'new'
        ? this.http
            .post<CollectionPoint>(`${this.apiUrl}/collection-points`, data)
            .pipe(tap((point) => this._points.update((list) => [...list, point])))
        : this.http
            .put<CollectionPoint>(`${this.apiUrl}/collection-points/${draft.id}`, data)
            .pipe(tap((point) => this.replace(point)));

    this._saving.set(true);
    request$.subscribe({
      next: () => {
        this._saving.set(false);
        this.toast.show(
          draft.mode === 'new' ? 'Punto de recolección creado' : 'Punto actualizado',
        );
        onSuccess?.();
      },
      error: (err: HttpErrorResponse) => {
        this._saving.set(false);
        this._errors.set({
          name:
            err.status === 409
              ? 'Ya existe un punto de recolección con ese nombre.'
              : 'No se pudo guardar. Intentá de nuevo.',
        });
      },
    });
  }

  private validate(draft: CollectionPointDraft): Record<string, string> {
    const errs: Record<string, string> = {};
    const name = draft.name.trim();
    const address = draft.addressLine.trim();
    const phone = draft.phone.trim();
    const email = draft.email.trim();

    if (name.length < 3 || name.length > 80) {
      errs['name'] = 'El nombre debe tener entre 3 y 80 caracteres.';
    }
    if (address.length < 5) {
      errs['addressLine'] = 'La dirección es obligatoria.';
    }
    if (draft.latitude === null || draft.longitude === null) {
      errs['latitude'] = 'Marcá la ubicación en el mapa.';
    }
    if (!/^[0-9+()\s-]{6,20}$/.test(phone)) {
      errs['phone'] = 'Ingresá un teléfono de contacto válido.';
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errs['email'] = 'Ingresá un correo válido.';
    }

    const openDays = draft.schedule.filter((d) => !d.closed);
    if (!openDays.length) {
      errs['schedule'] = 'El punto tiene que abrir al menos un día.';
    } else if (openDays.some((d) => !d.open || !d.close || d.open >= d.close)) {
      errs['schedule'] = 'La hora de cierre tiene que ser posterior a la de apertura.';
    }

    return errs;
  }

  private clearError(key: string): void {
    this._errors.update((e) => ({ ...e, [key]: '' }));
  }

  private replace(point: CollectionPoint): void {
    this._points.update((list) => list.map((p) => (p.id === point.id ? point : p)));
  }

  private toView(p: CollectionPoint): CollectionPointView {
    return {
      id: p.id,
      name: p.name,
      addressLine: p.addressLine,
      phone: p.phone,
      email: p.email,
      contactName: p.contactName,
      scheduleLines: this.scheduleLines(p.schedule),
      active: p.active,
      badge: p.active ? 'Activo' : 'Inactivo',
      badgeBg: p.active ? '#E6F0E7' : '#EFE7DC',
      badgeInk: p.active ? '#2C6B45' : '#7A6A55',
      cardOpacity: p.active ? '1' : '.8',
    };
  }

  /** Agrupa días consecutivos con el mismo horario: "Lun a Vie · 09:00 a 18:00". */
  private scheduleLines(schedule: ScheduleDay[]): string[] {
    const days = [...schedule].sort((a, b) => a.day - b.day).filter((d) => !d.closed);
    const lines: string[] = [];
    let start: ScheduleDay | null = null;
    let prev: ScheduleDay | null = null;

    const flush = () => {
      if (!start || !prev) return;
      const range =
        start.day === prev.day
          ? DAY_LABELS[start.day]
          : `${DAY_LABELS[start.day]} a ${DAY_LABELS[prev.day]}`;
      lines.push(`${range} · ${start.open} a ${start.close}`);
    };

    for (const day of days) {
      const continues =
        prev !== null &&
        day.day === prev.day + 1 &&
        day.open === prev.open &&
        day.close === prev.close;
      if (!continues) {
        flush();
        start = day;
      }
      prev = day;
    }
    flush();

    return lines.length ? lines : ['Sin horario cargado'];
  }
}
