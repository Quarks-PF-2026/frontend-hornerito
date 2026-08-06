import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CATS, CAT_BG, CAT_ICON, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import { PublicOrgSummary } from '../../../../core/models/public.model';
import { PublicService } from '../../../../core/services/public.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-explorar',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly empty = computed(
    () => !this.loading() && !this.failed() && this.items().length === 0,
  );

  private page = 1;
  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    this.fetch();
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
