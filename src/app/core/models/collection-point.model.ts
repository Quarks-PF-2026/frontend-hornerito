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
