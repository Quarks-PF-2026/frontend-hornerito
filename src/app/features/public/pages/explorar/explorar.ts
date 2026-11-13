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
import { daysUntil, dueLabel, initials } from '../../../../core/util/format';
import { LocalityPipe } from '../../../../shared/pipes/locality.pipe';
import { DonorRanking } from '../../../../shared/ui/donor-ranking/donor-ranking';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';
import { StoryBar } from '../../../../shared/ui/story-bar/story-bar';
import { StoryViewer } from '../../../../shared/ui/story-viewer/story-viewer';

const SEARCH_DEBOUNCE_MS = 300;
/**
 * "Por vencer" (QK-108): las abiertas que vencen primero, de a N por página, sin ventana fija.
 * Con ventana de 7 días el carrusel quedaba vacío cuando ninguna vencía tan
 * pronto, justo cuando más visibilidad hacía falta.
 */
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
  catBg: string;
  urgency: Urgency;
}

/**
 * Solo énfasis visual del chip de vencimiento, no una regla de negocio: el
 * orden y qué está abierto lo decide el backend. Umbrales: una y dos semanas.
 */
type Urgency = 'high' | 'mid' | 'low';
function urgencyOf(days: number): Urgency {
  if (days <= 7) return 'high';
  if (days <= 14) return 'mid';
  return 'low';
}

function toExpiringRow(need: PublicFeedNeed): ExpiringRow {
  const pct = Math.min(100, Math.round((need.coveredQuantity / need.requiredQuantity) * 100));
  return {
    catBg: CAT_BG[need.supplyCategory] ?? 'var(--hn-cream-soft)',
    urgency: urgencyOf(daysUntil(need.deadline)),
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
  readonly expiringTotal = signal(0);
  readonly expiringLoading = signal(false);
  readonly hasMoreExpiring = computed(() => this.expiring().length < this.expiringTotal());
  /** Posición del carrusel: apaga la flecha y el fundido del extremo alcanzado. */
  readonly railAtStart = signal(true);
  readonly railAtEnd = signal(false);
  readonly topDonors = signal<TopDonor[]>([]);
  readonly storyGroups = signal<StoryGroup[]>([]);
  /** Grupo con el que se abrió el visor; null con el visor cerrado. */
  readonly storyStart = signal<number | null>(null);

  readonly hasMore = computed(() => this.items().length < this.total());
  readonly empty = computed(() => !this.loading() && !this.failed() && this.items().length === 0);

  private page = 1;
  private expiringPage = 1;
  private debounce?: ReturnType<typeof setTimeout>;
  /** Vistas de esta apertura del visor; se marcan en la barra al cerrarlo. */
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

  /** Avanza o retrocede casi una pantalla del carrusel; sin animación si el usuario pidió menos movimiento. */
  scrollRail(rail: HTMLElement, dir: 1 | -1): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  }

  onRailScroll(rail: HTMLElement): void {
    // 1px de tolerancia: el zoom del navegador deja scrollLeft fraccionario.
    this.railAtStart.set(rail.scrollLeft <= 1);
    this.railAtEnd.set(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
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
   * Las vistas se marcan recién al cerrar, no al mostrarlas: si no, la barra y
   * los grupos del visor se reacomodarían a mitad de la visualización. Nada
   * sale de la barra (§18): una organización con todo visto pasa al final y
   * cada bloque va por historia más reciente, el mismo orden que arma el
   * backend, para que recargar no reacomode la barra.
   */
  closeStories(): void {
    this.storyStart.set(null);
    if (!this.seenStories.size) return;
    const seen = new Set(this.seenStories);
    this.seenStories.clear();
    const allSeen = (g: StoryGroup) => g.stories.every((s) => s.seen);
    // Las historias vienen de la más vieja a la más nueva: la última es la más reciente.
    const latest = (g: StoryGroup) => Date.parse(g.stories[g.stories.length - 1]?.createdAt ?? '');
    this.storyGroups.update((groups) =>
      groups
        .map((g) => ({
          ...g,
          stories: g.stories.map((s) => (seen.has(s.id) ? { ...s, seen: true } : s)),
        }))
        .sort((a, b) => Number(allSeen(a)) - Number(allSeen(b)) || latest(b) - latest(a)),
    );
  }

  moreExpiring(): void {
    if (this.expiringLoading()) return;
    this.expiringPage += 1;
    this.fetchExpiring(true);
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

  /**
   * Fija: no depende de la búsqueda ni de los chips. Paginada: el backend
   * ordena por vencimiento y, a igual fecha, la menos cubierta primero.
   */
  private fetchExpiring(append = false): void {
    this.expiringLoading.set(true);
    this.api.needs({ page: this.expiringPage, pageSize: EXPIRING_MAX }).subscribe({
      next: (result) => {
        const rows = result.items.map(toExpiringRow);
        this.expiring.update((current) => (append ? [...current, ...rows] : rows));
        // Llegaron tarjetas nuevas a la derecha: ya no se está en el final.
        if (append && rows.length) this.railAtEnd.set(false);
        this.expiringTotal.set(result.total);
        this.expiringLoading.set(false);
      },
      // Si falla la primera página la sección no se muestra; si falla "Ver más",
      // queda lo ya cargado y se vuelve a la página anterior para reintentar.
      error: () => {
        if (append) this.expiringPage -= 1;
        else this.expiring.set([]);
        this.expiringLoading.set(false);
      },
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
