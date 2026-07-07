import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OrgStatus } from '../../../../core/models/org.model';
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
  pendiente: {
    label: 'Pendiente de validación',
    icon: '⏳',
    bg: '#FBEFD4',
    border: '#EBCF88',
    iconBg: '#F6E0AE',
    ink: '#8A5E12',
  },
  validada: {
    label: 'Validada',
    icon: '✓',
    bg: '#E6F0E7',
    border: '#B6D8C0',
    iconBg: '#CDE8D5',
    ink: '#2C6B45',
  },
  rechazada: {
    label: 'Rechazada',
    icon: '✕',
    bg: '#FAE7E2',
    border: '#E6B6A8',
    iconBg: '#F3CFC5',
    ink: '#9E3826',
  },
};

@Component({
  selector: 'app-comedor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comedor.html',
  styleUrl: './comedor.scss',
})
export class ComedorPage {
  private readonly orgSvc = inject(OrgService);
  private readonly modal = inject(ModalService);

  readonly org = this.orgSvc.org;
  readonly st = computed(() => STATUS[this.org().status]);

  readonly seg = computed(() => {
    const s = this.org().status;
    return {
      pendBg: s === 'pendiente' ? '#C58A1E' : 'transparent',
      pendInk: s === 'pendiente' ? '#fff' : '#9C7C4E',
      valBg: s === 'validada' ? '#3F8B5C' : 'transparent',
      valInk: s === 'validada' ? '#fff' : '#9C7C4E',
      rejBg: s === 'rechazada' ? '#C24A36' : 'transparent',
      rejInk: s === 'rechazada' ? '#fff' : '#9C7C4E',
    };
  });

  setStatus(s: OrgStatus): void {
    this.orgSvc.setStatus(s);
  }
  edit(): void {
    this.modal.editOrg();
  }
  preview(): void {
    this.modal.previewOrg();
  }
}
