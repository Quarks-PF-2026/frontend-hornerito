import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { fmtMoney } from '../../../../core/models/monetary-donation.model';
import { DonorProfile } from '../../../../core/models/public.model';
import { PublicService } from '../../../../core/services/public.service';
import { initials } from '../../../../core/util/format';

// Zona fija: el mes de alta es un dato de la plataforma (Argentina), no del
// navegador de quien mira; sin esto, un alta cerca de medianoche del día 1
// se mostraría en otro mes según dónde esté el visitante.
const MEMBER_SINCE = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** Perfil público del donante (QK-110): solo nombre y montos, nunca datos de contacto. */
@Component({
  selector: 'app-donante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './donante.html',
  styleUrl: './donante.scss',
})
export class DonantePage {
  private readonly api = inject(PublicService);
  private readonly userId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly donor = signal<DonorProfile | null>(null);
  readonly loading = signal(true);
  /** 404: el usuario no existe o no tiene perfil público. Otro error: se puede reintentar. */
  readonly notFound = signal(false);
  readonly failed = signal(false);

  readonly view = computed(() => {
    const d = this.donor();
    if (!d) return null;
    return {
      name: d.name,
      initials: initials(d.name),
      since: MEMBER_SINCE.format(new Date(d.memberSince)),
      month: fmtMoney(d.monthTotal),
      total: fmtMoney(d.totalAmount),
    };
  });

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.notFound.set(false);
    this.api.donor(this.userId).subscribe({
      next: (donor) => {
        this.donor.set(donor);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // 400 = id que no es un uuid (link roto o tipeado a mano): para el
        // visitante es lo mismo que un perfil que no existe.
        if (err.status === 404 || err.status === 400) {
          this.notFound.set(true);
        } else {
          this.failed.set(true);
        }
      },
    });
  }
}
