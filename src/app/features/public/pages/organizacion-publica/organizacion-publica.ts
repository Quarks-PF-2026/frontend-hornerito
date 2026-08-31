import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { scheduleLines } from '../../../../core/models/collection-point.model';
import { CAT_ICON, DEFAULT_CAT_ICON } from '../../../../core/models/catalog';
import {
  MonetaryDonationPayload,
  PublicOpportunity,
  PublicOrgDetail,
  VolunteerRequestPayload,
} from '../../../../core/models/public.model';
import { MIN_DONATION_AMOUNT, fmtMoney } from '../../../../core/models/monetary-donation.model';
import { PublicService } from '../../../../core/services/public.service';
import { fmtDate } from '../../../../core/util/format';
import { MapMarker, MapPicker } from '../../../../shared/ui/map-picker/map-picker';
import { ProgressBar } from '../../../../shared/ui/progress-bar/progress-bar';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';
import { FilePicker } from '../../../../shared/ui/file-picker/file-picker';
import { HttpErrorResponse } from '@angular/common/http';

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

/** A qué se está postulando: a una actividad concreta o a la organización. */
interface RequestTarget {
  kind: 'org' | 'opportunity';
  id?: string;
  title?: string;
}

interface OpportunityRow {
  id: string;
  title: string;
  description: string;
  location: string;
  when: string;
  typeName: string;
  cupos: string;
  pct: number;
  color: string;
}

interface RequestForm {
  name: string;
  email: string;
  phone: string;
  message: string;
  volunteerTypeId: string;
}

/** Lo que el donante completa después de haber transferido (QK-20). */
interface DonationForm {
  amount: string;
  operationNumber: string;
  donorName: string;
  donorContact: string;
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
  imports: [ProgressBar, MapPicker, RouterLink, BottomSheet, FilePicker],
  templateUrl: './organizacion-publica.html',
  styleUrl: './organizacion-publica.scss',
})
export class OrganizacionPublicaPage {
  private readonly api = inject(PublicService);
  private readonly orgId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly org = signal<PublicOrgDetail | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly contactOpen = signal(false);

  readonly needs = computed<NeedRow[]>(() =>
    (this.org()?.needs ?? []).map((need) => {
      const pct = Math.min(100, Math.round((need.coveredQuantity / need.requiredQuantity) * 100));
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

  // ---------------- voluntariado (QK-16) ----------------

  readonly volunteering = computed(() => this.org()?.volunteering ?? null);

  readonly showVolunteering = computed(() => this.volunteering()?.seeksVolunteers === true);

  readonly opportunities = computed<OpportunityRow[]>(() =>
    (this.volunteering()?.opportunities ?? []).map((o) => this.toRow(o)),
  );

  readonly requestTarget = signal<RequestTarget | null>(null);
  readonly form = signal<RequestForm>(EMPTY_FORM);
  readonly errors = signal<Record<string, string>>({});
  readonly sending = signal(false);
  /** Correo al que le confirmamos el envío; null mientras no se mandó nada. */
  readonly sentTo = signal<string | null>(null);

  // ---------------- donación económica (QK-20) ----------------

  readonly donations = computed(() => this.org()?.donations ?? null);

  /** Sin alias cargado la organización no tiene a dónde recibir: no se ofrece. */
  readonly showDonations = computed(() => this.donations()?.acceptsMonetary === true);

  readonly donationOpen = signal(false);
  readonly donationForm = signal<DonationForm>(EMPTY_DONATION);
  readonly donationErrors = signal<Record<string, string>>({});
  readonly donating = signal(false);
  readonly receipt = signal<File | null>(null);
  /** Monto declarado con éxito; null mientras no se declaró nada. */
  readonly donatedAmount = signal<string | null>(null);
  readonly minAmountLabel = fmtMoney(MIN_DONATION_AMOUNT);
  /** Qué se copió recién, para el feedback del botón. */
  readonly copied = signal<string | null>(null);

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
    return contact.includes('@') ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`;
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

  openRequest(target: RequestTarget): void {
    this.requestTarget.set(target);
    this.form.set(EMPTY_FORM);
    this.errors.set({});
    this.sentTo.set(null);
  }

  closeRequest(): void {
    this.requestTarget.set(null);
  }

  updateField(field: keyof RequestForm, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    if (this.errors()[field]) {
      this.errors.update(({ [field]: _drop, ...rest }) => rest);
    }
  }

  submitRequest(): void {
    const target = this.requestTarget();
    if (!target || this.sending()) return;

    const form = this.form();
    // Validación de cortesía: la que manda es la del backend, que revalida
    // todo. Acá solo evitamos un viaje de ida y vuelta obvio.
    const errors: Record<string, string> = {};
    if (form.name.trim().length < 2) {
      errors['name'] = 'Ingresá tu nombre.';
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      errors['email'] = 'Ingresá un correo válido.';
    }
    this.errors.set(errors);
    if (Object.keys(errors).length) return;

    const payload: VolunteerRequestPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.message.trim()) payload.message = form.message.trim();
    if (target.kind === 'opportunity') {
      payload.opportunityId = target.id;
    } else if (form.volunteerTypeId) {
      payload.volunteerTypeId = form.volunteerTypeId;
    }

    this.sending.set(true);
    this.api.submitVolunteerRequest(this.orgId, payload).subscribe({
      next: () => {
        this.sending.set(false);
        this.sentTo.set(payload.email);
        this.requestTarget.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.sending.set(false);
        this.errors.set({
          form:
            err.status === 409
              ? 'La actividad ya no acepta postulaciones.'
              : 'No pudimos enviar tu solicitud. Probá de nuevo en un rato.',
        });
      },
    });
  }

  // ---------------- donación económica (QK-20) ----------------

  openDonation(): void {
    this.donationOpen.set(true);
    this.donationForm.set(EMPTY_DONATION);
    this.donationErrors.set({});
    this.receipt.set(null);
    this.donatedAmount.set(null);
  }

  closeDonation(): void {
    this.donationOpen.set(false);
  }

  updateDonationField(field: keyof DonationForm, value: string): void {
    this.donationForm.update((form) => ({ ...form, [field]: value }));
    if (this.donationErrors()[field]) {
      this.donationErrors.update(({ [field]: _drop, ...rest }) => rest);
    }
  }

  async copyAlias(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(value);
    } catch {
      // Sin permiso de portapapeles (o contexto inseguro) el dato igual está
      // a la vista para copiarlo a mano: no vale la pena molestar con un error.
    }
  }

  submitDonation(): void {
    if (this.donating()) return;

    const form = this.donationForm();
    // Validación de cortesía: la que manda es la del backend, que revalida todo.
    const errors: Record<string, string> = {};
    const amount = Number(form.amount.replace(',', '.'));
    if (!form.amount.trim() || !Number.isFinite(amount) || amount < MIN_DONATION_AMOUNT) {
      errors['amount'] = `Ingresá un monto de al menos ${this.minAmountLabel}.`;
    }
    if (form.donorContact.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.donorContact.trim())) {
      errors['donorContact'] = 'Ingresá un correo válido o dejalo vacío.';
    }
    this.donationErrors.set(errors);
    if (Object.keys(errors).length) return;

    const payload: MonetaryDonationPayload = { amount, method: 'transferencia' };
    if (form.operationNumber.trim()) payload.operationNumber = form.operationNumber.trim();
    if (form.donorName.trim()) payload.donorName = form.donorName.trim();
    if (form.donorContact.trim()) payload.donorContact = form.donorContact.trim();

    this.donating.set(true);
    this.api.declareDonation(this.orgId, payload, this.receipt()).subscribe({
      next: () => {
        this.donating.set(false);
        this.donatedAmount.set(fmtMoney(amount));
        this.donationOpen.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.donating.set(false);
        const message = (err.error as { message?: string | string[] })?.message;
        this.donationErrors.set({
          form: Array.isArray(message)
            ? message[0]
            : (message ?? 'No pudimos registrar tu donación. Probá de nuevo en un rato.'),
        });
      },
    });
  }

  private toRow(opportunity: PublicOpportunity): OpportunityRow {
    const pct = Math.min(100, Math.round((opportunity.acceptedCount / opportunity.capacity) * 100));
    const left = opportunity.capacity - opportunity.acceptedCount;
    return {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      location: opportunity.location,
      when: fmtDateTime(opportunity.startsAt),
      typeName: opportunity.volunteerTypeName ?? '',
      cupos: left === 1 ? 'Queda 1 lugar' : `Quedan ${left} lugares`,
      pct,
      color: pct >= 50 ? 'var(--hn-primary)' : 'var(--hn-canela-200)',
    };
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

const EMPTY_FORM: RequestForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
  volunteerTypeId: '',
};

const EMPTY_DONATION: DonationForm = {
  amount: '',
  operationNumber: '',
  donorName: '',
  donorContact: '',
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "sáb, 12 sept, 17:00". Espeja `whenLabel` del módulo interno; no se importa
 * de ahí para que la ficha pública no dependa del modelo del panel. */
function fmtDateTime(startsAt: string): string {
  return DATE_TIME_FORMAT.format(new Date(startsAt));
}
