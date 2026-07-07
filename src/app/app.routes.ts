import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
    path: 'verify',
    loadComponent: () => import('./features/auth/pages/verify/verify').then((m) => m.VerifyPage),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./features/app-shell/app-layout').then((m) => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'comedor' },
      {
        path: 'comedor',
        loadComponent: () =>
          import('./features/comedor/pages/comedor/comedor').then((m) => m.ComedorPage),
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
        path: 'insumos',
        loadComponent: () =>
          import('./features/insumos/pages/insumos/insumos').then((m) => m.InsumosPage),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
