import { dueLabel } from './format';

describe('dueLabel (QK-108)', () => {
  // 23:30 local: no debe correrse al día siguiente por UTC.
  const today = new Date(2026, 8, 27, 23, 30);

  it('vence hoy', () => {
    expect(dueLabel('2026-09-27', today)).toBe('Vence hoy');
  });

  it('vence mañana', () => {
    expect(dueLabel('2026-09-28', today)).toBe('Vence mañana');
  });

  it('vence en N días, cruzando de mes', () => {
    expect(dueLabel('2026-10-04', today)).toBe('Vence en 7 días');
  });
});
