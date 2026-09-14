import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { OrgService } from '../services/org.service';

/**
 * Secciones que operan datos de la organización: solo con la organización
 * validada (DOMAIN.md §4). Como todo guard del front, evita mostrar una pantalla
 * que va a responder 403; el que bloquea de verdad es el TenantGuard del backend.
 *
 * Si la organización cargada no está validada se vuelve a pedir antes de
 * decidir: el estado lo cambia otro usuario (el administrador de plataforma),
 * así que el valor en memoria puede estar viejo y no hace falta reloguear.
 */
export const validatedOrgGuard: CanActivateFn = () => {
  const orgSvc = inject(OrgService);
  const router = inject(Router);
  const fallback = router.createUrlTree(['/app/organizacion']);

  if (orgSvc.canOperate()) return true;

  return orgSvc.load().pipe(
    map(() => (orgSvc.canOperate() ? true : fallback)),
    // Un error de red no deja la navegación colgada ni la aprueba a ciegas:
    // se manda a Mi comedor, que muestra el estado o su propio error.
    catchError(() => of(fallback)),
  );
};
