import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { CATS, CAT_BG, CAT_ICON, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import {
  PublicFeedNeed,
  PublicLocality,
  PublicOrgSummary,
  TopDonor,
} from '../../../../core/models/public.model';
import { StoryGroup } from '../../../../core/models/story.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PublicService } from '../../../../core/services/public.service';
import { dueLabel, initials } from '../../../../core/util/format';
import { LocalityPipe } from '../../../../shared/pipes/locality.pipe';
import { DonorRanking } from '../../../../shared/ui/donor-ranking/donor-ranking';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';
import { StoryBar } from '../../../../shared/ui/story-bar/story-bar';
import { StoryViewer } from '../../../../shared/ui/story-viewer/story-viewer';

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
  imports: [LocalityPipe, ProgressBar, DonorRanking, StoryBar, StoryViewer],
  templateUrl: './explorar.html',
  styleUrl: './explorar.scss',
})
export class ExplorarPage implements OnDestroy {
  private readonly api = inject(PublicService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly cats = CATS;
  readonly items = signal<PublicOrgSummary[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly query = signal('');
  readonly category = signal<string | null>(null);
  readonly localities = signal<PublicLocality[]>([]);
  readonly locality = signal<string | null>(null);
  readonly expiring = signal<ExpiringRow[]>([]);
  readonly topDonors = signal<TopDonor[]>([]);
  readonly storyGroups = signal<StoryGroup[]>([]);
  /** Grupo con el que se abrió el visor; null con el visor cerrado. */
  readonly storyStart = signal<number | null>(null);

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly empty = computed(() => !this.loading() && !this.failed() && this.items().length === 0);

  private page = 1;
  private debounce?: ReturnType<typeof setTimeout>;
  /** Vistas de esta apertura del visor; se descuentan de la barra al cerrarlo. */
  private readonly seenStories = new Set<string>();

  constructor() {
    this.fetch();
    this.fetchExpiring();
    this.fetchTopDonors();
    this.fetchLocalities();
    this.fetchStories();
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
    return initials(name);
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

  filterByLocality(value: string): void {
    this.locality.set(value || null);
    this.reload();
  }

  open(id: string): void {
    void this.router.navigate(['/organizacion', id]);
  }

  openStories(index: number): void {
    this.storyStart.set(index);
  }

  /** Sin sesión no hay a quién atribuirle la vista (§18): no se manda nada. */
  storyViewed(id: string): void {
    if (!this.auth.authenticated()) return;
    this.seenStories.add(id);
    this.api.markStoryViewed(id).subscribe({ error: () => undefined });
  }

  /**
   * Las vistas se sacan recién al cerrar, no al mostrarlas: si no, la barra y
   * los grupos del visor se reacomodarían a mitad de la visualización. Una
   * organización sin nada sin ver sale de la barra.
   */
  closeStories(): void {
    this.storyStart.set(null);
    if (!this.seenStories.size) return;
    const seen = new Set(this.seenStories);
    this.seenStories.clear();
    this.storyGroups.update((groups) =>
      groups
        .map((g) => ({ ...g, stories: g.stories.filter((s) => !seen.has(s.id)) }))
        .filter((g) => g.stories.length > 0),
    );
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

  /** Top donantes del mes (QK-114). Fijo, como "Por vencer". */
  private fetchTopDonors(): void {
    this.api.topDonors().subscribe({
      next: (donors) => this.topDonors.set(donors ?? []),
      // Si falla, la sección no se muestra: no es motivo para ensuciar el inicio.
      error: () => this.topDonors.set([]),
    });
  }

  /** Si falla, la barra no se muestra: no es motivo para ensuciar el inicio. */
  private fetchStories(): void {
    this.api.stories().subscribe({
      next: (groups) => this.storyGroups.set((groups ?? []).filter((g) => g.stories?.length)),
      error: () => this.storyGroups.set([]),
    });
  }

  /** Si falla, el selector no se muestra: se puede buscar igual sin él. */
  private fetchLocalities(): void {
    this.api.localities().subscribe({
      next: (localities) => this.localities.set(localities),
      error: () => this.localities.set([]),
    });
  }

  private fetch(append = false): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .organizations({
        q: this.query(),
        category: this.category() ?? undefined,
        locality: this.locality() ?? undefined,
        page: this.page,
      })
      .subscribe({
        next: (result) => {
          this.items.update((current) => (append ? [...current, ...result.items] : result.items));
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
