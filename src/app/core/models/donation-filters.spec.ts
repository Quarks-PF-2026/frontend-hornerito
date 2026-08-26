import { DonationView } from './donation.model';
import { MonetaryDonationStatus, MonetaryDonationView } from './monetary-donation.model';
import { inDateRange, inPersonTotals, monetaryTotals } from './donation-filters';

function monetary(
  status: MonetaryDonationStatus,
  amount: number,
): MonetaryDonationView {
  return {
    id: `m-${status}-${amount}`,
    amount,
    status,
    method: 'transferencia',
    operationNumber: null,
    receiptUrl: null,
    donorName: null,
    donorContact: null,
    rejectReason: null,
    decidedAt: null,
    createdAt: '2026-08-20T12:00:00.000Z',
    donor: 'Anónimo',
    amountLabel: '',
    date: '',
    statusLabel: '',
    statusBg: '',
    statusInk: '',
    decidable: status === 'declarada',
  };
}

function inPerson(quantities: number[]): DonationView {
  return {
    id: `p-${quantities.join('-')}`,
    createdAt: '2026-08-20T12:00:00.000Z',
    date: '20 ago',
    donor: 'Donante anónimo',
    contact: null,
    point: null,
    items: quantities.map((quantity) => ({
      icon: '📦',
      supply: 'Arroz',
      quantity,
      unit: 'kg',
      needNote: null,
    })),
  };
}

describe('inDateRange', () => {
  const iso = '2026-08-20T12:00:00.000Z';

  it('acepta todo cuando los dos extremos están vacíos', () => {
    expect(inDateRange(iso, '', '')).toBe(true);
  });

  it('incluye los extremos', () => {
    expect(inDateRange(iso, '2026-08-20', '2026-08-20')).toBe(true);
  });

  it('deja afuera lo anterior al desde y lo posterior al hasta', () => {
    expect(inDateRange(iso, '2026-08-21', '')).toBe(false);
    expect(inDateRange(iso, '', '2026-08-19')).toBe(false);
  });

  it('no se corre de día por la hora ni por la zona horaria', () => {
    // 23:30 UTC del 20 sigue siendo el 20 para el filtro.
    expect(inDateRange('2026-08-20T23:30:00.000Z', '2026-08-20', '2026-08-20')).toBe(true);
  });
});

describe('monetaryTotals', () => {
  it('suma solo las confirmadas y cuenta las declaradas', () => {
    const totals = monetaryTotals([
      monetary('confirmada', 1000),
      monetary('confirmada', 500.5),
      monetary('declarada', 9999),
      monetary('rechazada', 7777),
    ]);
    expect(totals.confirmedAmount).toBe(1500.5);
    expect(totals.pendingCount).toBe(1);
  });

  it('devuelve ceros con la lista vacía', () => {
    expect(monetaryTotals([])).toEqual({ confirmedAmount: 0, pendingCount: 0 });
  });
});

describe('inPersonTotals', () => {
  it('cuenta donaciones y suma las cantidades de todos los ítems', () => {
    const totals = inPersonTotals([inPerson([2, 3]), inPerson([5])]);
    expect(totals).toEqual({ donations: 2, items: 10 });
  });

  it('devuelve ceros con la lista vacía', () => {
    expect(inPersonTotals([])).toEqual({ donations: 0, items: 0 });
  });
});
