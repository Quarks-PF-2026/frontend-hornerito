import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ASSIGNABLE_ROLES, MemberRole, ROLE_LABEL } from '../../../../core/models/member.model';
import { AuthService } from '../../../../core/services/auth.service';
import { MembersService } from '../../../../core/services/members.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BottomSheet } from '../../../../shared/ui/bottom-sheet/bottom-sheet';

interface RoleOption {
  value: MemberRole | '';
  label: string;
}

const ALL_ROLES: RoleOption = { value: '', label: 'Todos los roles' };

@Component({
  selector: 'app-usuarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BottomSheet],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class UsuariosPage {
  private readonly membersSvc = inject(MembersService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly roleFilter = signal<MemberRole | ''>('');

  readonly roleOptions: RoleOption[] = [
    ALL_ROLES,
    { value: 'owner', label: ROLE_LABEL['owner'] },
    ...ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
  ];
  readonly assignableRoles = ASSIGNABLE_ROLES.map((role) => ({
    value: role,
    label: ROLE_LABEL[role],
  }));

  readonly invitations = this.membersSvc.invitations;

  // Estado del panel de invitación.
  readonly inviteOpen = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<MemberRole>('voluntario');
  readonly inviteError = signal('');

  constructor() {
    this.membersSvc.load().subscribe();
    this.membersSvc.loadInvitations().subscribe();
  }

  readonly views = computed(() => {
    const term = this.search().trim().toLowerCase();
    const role = this.roleFilter();

    return this.membersSvc
      .members()
      .filter((m) => (role ? m.role === role : true))
      .filter(
        (m) => !term || m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term),
      )
      .map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        roleLabel: ROLE_LABEL[m.role],
        active: m.active,
        // Al dueño y a uno mismo no se los puede tocar: el backend también lo
        // rechaza, esto solo evita ofrecer la acción.
        editable: m.role !== 'owner' && m.email !== this.auth.currentEmail(),
        initial: m.name.trim().charAt(0).toUpperCase() || '?',
        opacity: m.active ? '1' : '.55',
        toggleIcon: m.active ? '⊘' : '↻',
        toggleInk: m.active ? 'var(--hn-muted)' : 'var(--hn-success)',
        toggleTitle: m.active ? 'Deshabilitar' : 'Rehabilitar',
      }));
  });

  readonly empty = computed(() => this.views().length === 0);

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onRoleFilter(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as MemberRole | '');
  }

  changeRole(userId: string, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as MemberRole;
    this.membersSvc.changeRole(userId, role).subscribe({
      next: (member) => this.toast.show(`Rol actualizado a ${ROLE_LABEL[member.role]}`),
      error: (err: HttpErrorResponse) => this.toast.show(this.message(err)),
    });
  }

  toggle(userId: string): void {
    this.membersSvc.toggle(userId).subscribe({
      next: (member) =>
        this.toast.show(member.active ? 'Usuario habilitado' : 'Usuario deshabilitado'),
      error: (err: HttpErrorResponse) => this.toast.show(this.message(err)),
    });
  }

  // ---------------- invitación ----------------
  openInvite(): void {
    this.inviteEmail.set('');
    this.inviteRole.set('voluntario');
    this.inviteError.set('');
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
  }

  onInviteEmail(event: Event): void {
    this.inviteEmail.set((event.target as HTMLInputElement).value);
    this.inviteError.set('');
  }

  onInviteRole(event: Event): void {
    this.inviteRole.set((event.target as HTMLSelectElement).value as MemberRole);
  }

  sendInvite(): void {
    const email = this.inviteEmail().trim();
    if (!this.auth.emailOk(email)) {
      this.inviteError.set('Ingresá un correo válido.');
      return;
    }
    this.membersSvc.invite(email, this.inviteRole()).subscribe({
      next: () => {
        this.inviteOpen.set(false);
        this.toast.show('Invitación enviada');
      },
      error: (err: HttpErrorResponse) => this.inviteError.set(this.message(err)),
    });
  }

  cancelInvitation(id: string): void {
    this.membersSvc.cancelInvitation(id).subscribe({
      next: () => this.toast.show('Invitación cancelada'),
      error: (err: HttpErrorResponse) => this.toast.show(this.message(err)),
    });
  }

  roleLabel(role: MemberRole): string {
    return ROLE_LABEL[role];
  }

  private message(err: HttpErrorResponse): string {
    const message: unknown = err.error?.message;
    return typeof message === 'string' ? message : 'No se pudo completar la acción.';
  }
}
