import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fmtMoney } from '../../../core/models/monetary-donation.model';
import { TopDonor } from '../../../core/models/public.model';
import { initials } from '../../../core/util/format';

/**
 * Ranking de donantes del mes: el inicio (QK-114) y la ficha de la organización
 * (QK-115). El título viene adentro para que los dos lugares lo vean igual sin
 * repetir estilos en cada página.
 */
@Component({
  selector: 'hn-donor-ranking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <h2 class="hn-head">{{ heading() }}</h2>
    <ol class="hn-card">
      @for (row of rows(); track row.userId) {
        <li>
          <span class="pos">{{ row.position }}</span>
          <span class="avatar" aria-hidden="true">{{ row.initials }}</span>
          <a class="name" [routerLink]="['/donante', row.userId]">{{ row.name }}</a>
          <span class="amount">{{ row.amount }}</span>
        </li>
      }
    </ol>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      h2 {
        font-size: 19px;
        margin: 0 0 12px;
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 4px 16px;
      }
      li {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        border-bottom: 1px solid var(--hn-border-line);
      }
      li:last-child {
        border-bottom: none;
      }
      .pos {
        flex: none;
        width: 20px;
        text-align: center;
        font-weight: 800;
        color: var(--hn-primary-strong);
      }
      .avatar {
        flex: none;
        width: 36px;
        height: 36px;
        border-radius: var(--hn-radius-pill);
        background: var(--hn-cream-soft);
        color: var(--hn-primary-strong);
        font-weight: 800;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 700;
        color: var(--hn-ink);
        text-decoration: none;
      }
      .name:hover {
        color: var(--hn-primary-strong);
        text-decoration: underline;
      }
      .amount {
        flex: none;
        font-weight: 700;
        font-size: 14px;
        color: var(--hn-text);
      }
    `,
  ],
})
export class DonorRanking {
  readonly heading = input('');
  readonly donors = input<TopDonor[]>([]);

  readonly rows = computed(() =>
    this.donors().map((d) => ({
      ...d,
      initials: initials(d.name),
      amount: fmtMoney(d.total),
    })),
  );
}
