import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OrgStatus } from '../../../../core/models/org.model';
import { AuthService } from '../../../../core/services/auth.service';
import { OrgService } from '../../../../core/services/org.service';
import { ModalService } from '../../../../core/services/modal.service';

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
  templateUrl: './organizacion.html',
  styleUrl: './organizacion.scss',
})
export class OrganizacionPage {
  private readonly orgSvc = inject(OrgService);
  private readonly modal = inject(ModalService);
  private readonly auth = inject(AuthService);

  readonly org = this.orgSvc.org;
  readonly canEditOrg = this.auth.isOwner;
  readonly st = computed(() => {
    const o = this.org();
    return o ? STATUS[o.status] : null;
  });

  constructor() {
    this.orgSvc.load().subscribe();
  }

  edit(): void {
    this.modal.editOrg();
  }
  preview(): void {
    this.modal.previewOrg();
  }
}
