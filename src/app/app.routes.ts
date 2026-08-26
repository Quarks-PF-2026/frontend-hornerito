import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { contentWriterGuard, memberManagerGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/public-layout').then((m) => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/public/pages/explorar/explorar').then((m) => m.ExplorarPage),
      },
      {
        path: 'organizacion/:id',
        loadComponent: () =>
          import('./features/public/pages/organizacion-publica/organizacion-publica').then(
            (m) => m.OrganizacionPublicaPage,
          ),
      },
    ],
  },
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
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then(
        (m) => m.ResetPasswordPage,
      ),
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
        path: 'donaciones',
        loadComponent: () =>
          import('./features/donaciones/pages/donaciones/donaciones').then((m) => m.DonacionesPage),
      },
      {
        // Antes de `donaciones/nueva` no hace falta: no hay rutas con `:id`
        // bajo donaciones, así que no hay colisión posible.
        path: 'donaciones/economicas',
        loadComponent: () =>
          import('./features/donaciones/pages/donaciones-economicas/donaciones-economicas').then(
            (m) => m.DonacionesEconomicasPage,
          ),
      },
      {
        path: 'donaciones/nueva',
        loadComponent: () =>
          import('./features/donaciones/pages/donacion-form/donacion-form').then(
            (m) => m.DonacionFormPage,
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
        path: 'voluntariado',
        loadComponent: () =>
          import('./features/voluntariado/pages/oportunidades/oportunidades').then(
            (m) => m.OportunidadesPage,
          ),
      },
      {
        path: 'voluntariado/nueva',
        loadComponent: () =>
          import('./features/voluntariado/pages/oportunidad-form/oportunidad-form').then(
            (m) => m.OportunidadFormPage,
          ),
      },
      {
        path: 'voluntariado/:id/editar',
        loadComponent: () =>
          import('./features/voluntariado/pages/oportunidad-form/oportunidad-form').then(
            (m) => m.OportunidadFormPage,
          ),
      },
      {
        // Antes de las rutas con `:id` para que se lea junto al resto del
        // voluntariado; no hay colisión real con `voluntariado/:id`.
        path: 'voluntariado/solicitudes',
        canActivate: [contentWriterGuard],
        loadComponent: () =>
          import('./features/voluntariado/pages/solicitudes/solicitudes').then(
            (m) => m.SolicitudesPage,
          ),
      },
      {
        path: 'voluntariado/:id/postulaciones',
        loadComponent: () =>
          import('./features/voluntariado/pages/postulaciones/postulaciones').then(
            (m) => m.PostulacionesPage,
          ),
      },
      {
        path: 'insumos',
        loadComponent: () =>
          import('./features/insumos/pages/insumos/insumos').then((m) => m.InsumosPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
