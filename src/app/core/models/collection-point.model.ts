/** Franja horaria de un día (0 = domingo … 6 = sábado). */
export interface ScheduleDay {
  day: number;
  closed: boolean;
  /** `HH:mm`, null si el día está cerrado. */
  open: string | null;
  /** `HH:mm`, null si el día está cerrado. */
  close: string | null;
}

export interface CollectionPoint {
  id: string;
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string | null;
  contactName: string | null;
  schedule: ScheduleDay[];
  active: boolean;
}

/** Datos que viajan al backend al crear o editar un punto. */
export type CollectionPointPatch = Omit<CollectionPoint, 'id' | 'active'>;

/** Vista derivada de un punto, con textos y estilos ya calculados. */
export interface CollectionPointView {
  id: string;
  name: string;
  addressLine: string;
  phone: string;
  email: string | null;
  contactName: string | null;
  /** Horario agrupado en líneas legibles, ej. "Lun a Vie · 09:00 a 18:00". */
  scheduleLines: string[];
  active: boolean;
  badge: string;
  badgeBg: string;
  badgeInk: string;
  cardOpacity: string;
}

export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Agrupa días consecutivos con el mismo horario: "Lun a Vie · 09:00 a 18:00". */
export function scheduleLines(schedule: ScheduleDay[]): string[] {
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

/** Horario por defecto de un punto nuevo: lunes a viernes de 09:00 a 18:00. */
export function defaultSchedule(): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, day) => {
    const weekday = day >= 1 && day <= 5;
    return {
      day,
      closed: !weekday,
      open: weekday ? '09:00' : null,
      close: weekday ? '18:00' : null,
    };
  });
}
