import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { canManageMembers } from '../models/member.model';
import { AuthService } from '../services/auth.service';

/** Sección Usuarios: solo dueño y administradores. */
export const memberManagerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return canManageMembers(auth.role()) ? true : router.createUrlTree(['/app/organizacion']);
};
