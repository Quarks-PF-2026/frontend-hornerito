export type EventKind = 'periodic' | 'one_off';

export interface OrgEvent {
  id: string;
  name: string;
  kind: EventKind;
  startDate: string; // 'YYYY-MM-DD'
  /** 0=domingo..6=sábado. null en `one_off`; no vacío en `periodic`. */
  weekdays: number[] | null;
  startTime: string; // 'HH:MM', 24 h
  active: boolean;
  endedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Una fecha del calendario del evento; `count` null = todavía no se cargó. */
export interface EventOccurrence {
  date: string; // 'YYYY-MM-DD'
  count: number | null;
}

/** Indexado como `Date.getDay()`: 0=domingo. */
export const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
/** Para lectores de pantalla: "Mié" se lee mal. */
export const WEEKDAY_LONG = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/** Orden de pantalla: la semana arranca el lunes, como se la piensa acá. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function scheduleLabel(ev: Pick<OrgEvent, 'kind' | 'weekdays' | 'startTime'>): string {
  if (ev.kind === 'one_off') return `Extraordinario · ${ev.startTime}`;
  const days = ev.weekdays ?? [];
  const label =
    days.length === 7
      ? 'Todos los días'
      : WEEKDAY_DISPLAY_ORDER.filter((d) => days.includes(d))
          .map((d) => WEEKDAY_SHORT[d])
          .join(', ');
  return `${label} · ${ev.startTime}`;
}
