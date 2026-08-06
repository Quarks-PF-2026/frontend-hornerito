import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { scheduleLines } from '../../../../core/models/collection-point.model';
import { CAT_ICON, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import { PublicOrgDetail } from '../../../../core/models/public.model';
import { PublicService } from '../../../../core/services/public.service';
import { fmtDate } from '../../../../core/util/format';
import { MapMarker, MapPicker } from '../../../../shared/ui/map-picker/map-picker';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';

interface NeedRow {
  id: string;
  supply: string;
  icon: string;
  unit: string;
  covered: number;
  required: number;
  pct: number;
  color: string;
  deadline: string;
}

interface PointRow {
  id: string;
  name: string;
  addressLine: string;
  phone: string;
  scheduleLines: string[];
}

@Component({
  selector: 'app-organizacion-publica',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressBar, MapPicker, RouterLink],
  templateUrl: './organizacion-publica.html',
  styleUrl: './organizacion-publica.scss',
})
export class OrganizacionPublicaPage {
  private readonly api = inject(PublicService);
  private readonly orgId =
    inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly org = signal<PublicOrgDetail | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly contactOpen = signal(false);

  readonly needs = computed<NeedRow[]>(() =>
    (this.org()?.needs ?? []).map((need) => {
      const pct = Math.min(
        100,
        Math.round((need.coveredQuantity / need.requiredQuantity) * 100),
      );
      return {
        id: need.id,
        supply: need.supplyName,
        icon: CAT_ICON[need.supplyCategory] ?? DEFAULT_CAT_ICON,
        unit: need.supplyUnit.toLowerCase(),
        covered: need.coveredQuantity,
        required: need.requiredQuantity,
        pct,
        color: pct >= 50 ? 'var(--hn-primary)' : 'var(--hn-canela-200)',
        deadline: fmtDate(need.deadline),
      };
    }),
  );

  readonly points = computed<PointRow[]>(() =>
    (this.org()?.collectionPoints ?? []).map((point) => ({
      id: point.id,
      name: point.name,
      addressLine: point.addressLine,
      phone: point.phone,
      scheduleLines: scheduleLines(point.schedule),
    })),
  );

  readonly markers = computed<MapMarker[]>(() =>
    (this.org()?.collectionPoints ?? []).map((point) => ({
      lat: point.latitude,
      lng: point.longitude,
      label: point.name,
    })),
  );

  /** El contacto puede ser un mail o un teléfono; el link se arma según eso. */
  readonly contactHref = computed(() => {
    const contact = this.org()?.contact?.trim() ?? '';
    if (!contact) return null;
    return contact.includes('@')
      ? `mailto:${contact}`
      : `tel:${contact.replace(/[^\d+]/g, '')}`;
  });

  readonly initials = computed(() =>
    (this.org()?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
  );

  constructor() {
    this.load();
  }

  showContact(): void {
    this.contactOpen.set(true);
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.organization(this.orgId).subscribe({
      next: (detail) => {
        this.org.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }
}
