import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canManageMembers, canWriteContent } from '../models/member.model';
import { AuthService } from '../services/auth.service';

/** Sección Usuarios: solo dueño y administradores. */
export const memberManagerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return canManageMembers(auth.role()) ? true : router.createUrlTree(['/app/organizacion']);
};

/** Solicitudes de voluntario: quien gestiona voluntariado, o sea el coordinador
 * además de dueño y administradores. Espeja CONTENT_WRITER_ROLES del backend. */
export const contentWriterGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return canWriteContent(auth.role()) ? true : router.createUrlTree(['/app/organizacion']);
};
