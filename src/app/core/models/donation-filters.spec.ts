import { HttpParams } from '@angular/common/http';
import { DonationView } from './donation.model';
import { MonetaryDonationStatus, MonetaryDonationView } from './monetary-donation.model';
import { inPersonTotals, monetaryTotals, toHttpParams } from './donation-filters';

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

describe('toHttpParams', () => {
  const empty = new HttpParams();

  it('no manda nada cuando no hay filtros', () => {
    expect(toHttpParams({}, empty).keys()).toEqual([]);
  });

  it('saltea los valores vacíos', () => {
    // `from=` no es lo mismo que sin `from`: el backend lo rechaza por formato.
    const params = toHttpParams({ status: '', from: '', to: '2026-08-31' }, empty);
    expect(params.keys()).toEqual(['to']);
    expect(params.get('to')).toBe('2026-08-31');
  });

  it('manda estado y rango juntos', () => {
    const params = toHttpParams(
      { status: 'declarada', from: '2026-08-01', to: '2026-08-31' },
      empty,
    );
    expect(params.get('status')).toBe('declarada');
    expect(params.get('from')).toBe('2026-08-01');
    expect(params.get('to')).toBe('2026-08-31');
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
