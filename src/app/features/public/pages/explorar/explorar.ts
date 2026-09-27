import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CATS, CAT_BG, CAT_ICON, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import { PublicFeedNeed, PublicOrgSummary } from '../../../../core/models/public.model';
import { PublicService } from '../../../../core/services/public.service';
import { dueLabel } from '../../../../core/util/format';
import { LocalityPipe } from '../../../../shared/pipes/locality.pipe';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';

const SEARCH_DEBOUNCE_MS = 300;
/** "Por vencer" (QK-108): ventana y tope del carrusel. */
const EXPIRING_DAYS = 7;
const EXPIRING_MAX = 8;

interface ExpiringRow {
  id: string;
  organizationId: string;
  organization: string;
  supply: string;
  icon: string;
  unit: string;
  covered: number;
  required: number;
  pct: number;
  color: string;
  due: string;
}

function toExpiringRow(need: PublicFeedNeed): ExpiringRow {
  const pct = Math.min(100, Math.round((need.coveredQuantity / need.requiredQuantity) * 100));
  return {
    id: need.id,
    organizationId: need.organizationId,
    organization: need.organizationName,
    supply: need.supplyName,
    icon: CAT_ICON[need.supplyCategory] ?? DEFAULT_CAT_ICON,
    unit: need.supplyUnit.toLowerCase(),
    covered: need.coveredQuantity,
    required: need.requiredQuantity,
    pct,
    color: pct >= 50 ? 'var(--hn-primary)' : 'var(--hn-canela-200)',
    due: dueLabel(need.deadline),
  };
}

@Component({
  selector: 'app-explorar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalityPipe, ProgressBar],
  templateUrl: './explorar.html',
  styleUrl: './explorar.scss',
})
export class ExplorarPage implements OnDestroy {
  private readonly api = inject(PublicService);
  private readonly router = inject(Router);

  readonly cats = CATS;
  readonly items = signal<PublicOrgSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly query = signal('');
  readonly category = signal<string | null>(null);
  readonly expiring = signal<ExpiringRow[]>([]);

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly empty = computed(
    () => !this.loading() && !this.failed() && this.items().length === 0,
  );

  private page = 1;
  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    this.fetch();
    this.fetchExpiring();
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounce);
  }

  icon(category: string): string {
    return CAT_ICON[category] ?? DEFAULT_CAT_ICON;
  }

  bg(category: string): string {
    return CAT_BG[category] ?? 'var(--hn-cream-soft)';
  }

  /** Iniciales para las organizaciones que todavía no cargaron su logo. */
  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  search(value: string): void {
    this.query.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.reload(), SEARCH_DEBOUNCE_MS);
  }

  filterBy(category: string): void {
    this.category.update((current) => (current === category ? null : category));
    this.reload();
  }

  open(id: string): void {
    void this.router.navigate(['/organizacion', id]);
  }

  more(): void {
    this.page += 1;
    this.fetch(true);
  }

  retry(): void {
    this.reload();
  }

  private reload(): void {
    this.page = 1;
    this.fetch();
  }

  /** Fija: no depende de la búsqueda ni de los chips. */
  private fetchExpiring(): void {
    this.api.needs({ withinDays: EXPIRING_DAYS, pageSize: EXPIRING_MAX }).subscribe({
      next: (result) => this.expiring.set(result.items.map(toExpiringRow)),
      // Si falla, la sección no se muestra: la grilla de organizaciones sigue sola.
      error: () => this.expiring.set([]),
    });
  }

  private fetch(append = false): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .organizations({
        q: this.query(),
        category: this.category() ?? undefined,
        page: this.page,
      })
      .subscribe({
        next: (result) => {
          this.items.update((current) =>
            append ? [...current, ...result.items] : result.items,
          );
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }
}
