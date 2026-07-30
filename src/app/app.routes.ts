import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { memberManagerGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then((m) => m.RegisterPage),
  },
  {
    path: 'invitacion',
    loadComponent: () =>
      import('./features/auth/pages/invitacion/invitacion').then((m) => m.InvitacionPage),
  },
  {
    path: 'verify',
    loadComponent: () => import('./features/auth/pages/verify/verify').then((m) => m.VerifyPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/app-shell/app-layout').then((m) => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'organizacion' },
      {
        path: 'organizacion',
        loadComponent: () =>
          import('./features/organizacion/pages/organizacion/organizacion').then(
            (m) => m.OrganizacionPage,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [memberManagerGuard],
        loadComponent: () =>
          import('./features/organizacion/pages/usuarios/usuarios').then((m) => m.UsuariosPage),
      },
      {
        path: 'publicaciones',
        loadComponent: () =>
          import('./features/publicaciones/pages/publicaciones/publicaciones').then(
            (m) => m.PublicacionesPage,
          ),
      },
      {
        path: 'necesidades',
        loadComponent: () =>
          import('./features/necesidades/pages/necesidades/necesidades').then(
            (m) => m.NecesidadesPage,
          ),
      },
      {
        path: 'puntos',
        loadComponent: () =>
          import('./features/puntos/pages/puntos/puntos').then((m) => m.PuntosPage),
      },
      {
        path: 'puntos/nuevo',
        loadComponent: () =>
          import('./features/puntos/pages/punto-form/punto-form').then((m) => m.PuntoFormPage),
      },
      {
        path: 'puntos/:id/editar',
        loadComponent: () =>
          import('./features/puntos/pages/punto-form/punto-form').then((m) => m.PuntoFormPage),
      },
      {
        path: 'insumos',
        loadComponent: () =>
          import('./features/insumos/pages/insumos/insumos').then((m) => m.InsumosPage),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
