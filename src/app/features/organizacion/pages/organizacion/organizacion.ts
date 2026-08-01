import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Media } from '../../../../core/models/media.model';
import { OrgStatus } from '../../../../core/models/org.model';
import { AuthService } from '../../../../core/services/auth.service';
import { MediaService } from '../../../../core/services/media.service';
import { OrgService } from '../../../../core/services/org.service';
import { ModalService } from '../../../../core/services/modal.service';
import { ImageUpload } from '../../../../shared/ui/image-upload/image-upload';

interface StatusStyle {
  label: string;
  icon: string;
  bg: string;
  border: string;
  iconBg: string;
  ink: string;
}

const STATUS: Record<OrgStatus, StatusStyle> = {
  pending: {
    label: 'Pendiente de validación',
    icon: '⏳',
    bg: 'var(--hn-warning-bg)',
    border: 'var(--hn-warning-border)',
    iconBg: 'var(--hn-warning-border)',
    ink: 'var(--hn-warning-ink)',
  },
  validated: {
    label: 'Validada',
    icon: '✓',
    bg: 'var(--hn-success-bg)',
    border: 'var(--hn-success-border)',
    iconBg: 'var(--hn-success-border)',
    ink: 'var(--hn-success-ink)',
  },
  rejected: {
    label: 'Rechazada',
    icon: '✕',
    bg: 'var(--hn-danger-bg)',
    border: 'var(--hn-danger-border)',
    iconBg: 'var(--hn-danger-border)',
    ink: 'var(--hn-danger-ink)',
  },
};

@Component({
  selector: 'app-organizacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImageUpload],
  templateUrl: './organizacion.html',
  styleUrl: './organizacion.scss',
})
export class OrganizacionPage {
  private readonly orgSvc = inject(OrgService);
  private readonly modal = inject(ModalService);
  private readonly auth = inject(AuthService);
  private readonly mediaSvc = inject(MediaService);

  readonly org = this.orgSvc.org;
  readonly canEditOrg = this.auth.isOwner;
  /** Cargar imágenes lo permite el mismo rol que administra usuarios. */
  readonly canEditImages = this.auth.canManageMembers;
  readonly st = computed(() => {
    const o = this.org();
    return o ? STATUS[o.status] : null;
  });

  /** URL por `purpose` (`logo`, `cover`). */
  private readonly images = signal<Record<string, string>>({});
  readonly logoUrl = computed(() => this.images()['logo'] ?? null);
  readonly coverUrl = computed(() => this.images()['cover'] ?? null);

  constructor() {
    this.orgSvc.load().subscribe((org) => {
      if (org) this.loadImages(org.id);
    });
  }

  onImageUploaded(media: Media): void {
    this.images.update((current) => ({ ...current, [media.purpose]: media.url }));
  }

  private loadImages(orgId: string): void {
    this.mediaSvc.list('organization', orgId).subscribe((items) => {
      this.images.set(Object.fromEntries(items.map((m) => [m.purpose, m.url])));
    });
  }

  edit(): void {
    this.modal.editOrg();
  }
  preview(): void {
    this.modal.previewOrg();
  }
}
