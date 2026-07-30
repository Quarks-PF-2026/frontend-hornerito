export type MemberRole = 'owner' | 'admin' | 'coordinador' | 'voluntario';

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  active: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  coordinador: 'Coordinador',
  voluntario: 'Voluntario',
};

/** Roles que un administrador puede asignar; el dueño no se transfiere. */
export const ASSIGNABLE_ROLES: MemberRole[] = ['admin', 'coordinador', 'voluntario'];

/** Ve y usa la sección Usuarios. */
export function canManageMembers(role: MemberRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

/** Puede crear y editar insumos, puntos, necesidades y publicaciones. */
export function canWriteContent(role: MemberRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'coordinador';
}
