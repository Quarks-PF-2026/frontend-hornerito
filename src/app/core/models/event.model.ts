export type EventKind = 'periodic' | 'one_off';

export interface OrgEvent {
  id: string;
  name: string;
  kind: EventKind;
  startDate: string; // 'YYYY-MM-DD'
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

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  periodic: 'Periódico',
  one_off: 'Extraordinario',
};

export type AttendanceTrend = 'sube' | 'baja' | 'estable';

/** `GET /events/attendance-forecast` (QK-30): uno por evento periódico activo. */
export interface AttendanceForecast {
  eventId: string;
  eventName: string;
  daysRecorded: number;
  minDaysRequired: number;
  sufficientHistory: boolean;
  trend: AttendanceTrend | null;
  forecast: { date: string; expected: number }[];
}
