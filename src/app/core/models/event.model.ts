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
