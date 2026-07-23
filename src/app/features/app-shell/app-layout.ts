import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';
import { TopBar } from '../../shared/ui/top-bar/top-bar';
import { BottomNav } from '../../shared/ui/bottom-nav/bottom-nav';
import { Toast } from '../../shared/ui/toast/toast';
import { ModalHost } from './modal-host/modal-host';

interface TabMeta {
  kicker: string;
  title: string;
  fab: string;
}

const TABS: Record<string, TabMeta> = {
  organizacion: { kicker: 'Tu organización', title: 'Mi comedor', fab: 'Editar' },
  publicaciones: { kicker: 'Difusión', title: 'Publicaciones', fab: 'Publicar' },
  necesidades: { kicker: 'Lo que hace falta', title: 'Necesidades', fab: 'Necesidad' },
  puntos: { kicker: 'Dónde entregar', title: 'Puntos de recolección', fab: 'Punto' },
  insumos: { kicker: 'Catálogo', title: 'Insumos', fab: 'Insumo' },
};

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'hn-fill' },
  imports: [RouterOutlet, TopBar, BottomNav, Toast, ModalHost],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);

  private readonly tab = signal(this.currentTab());
  private readonly subView = signal(this.isSubView());
  readonly meta = computed(() => TABS[this.tab()] ?? TABS['organizacion']);
  /** El FAB se muestra en las listas, no dentro de un formulario ruteado. */
  readonly showFab = computed(() => !this.subView());

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.tab.set(this.currentTab());
        this.subView.set(this.isSubView());
      });
  }

  private currentTab(): string {
    // Se toma el primer segmento que coincida con un tab conocido, así rutas
    // hijas como `puntos/nuevo` siguen resolviendo al tab `puntos`.
    const segs = this.router.url.split('?')[0].split('/').filter(Boolean);
    return segs.find((seg) => TABS[seg]) ?? 'organizacion';
  }

  /** True en las vistas-hoja de un tab (formularios ruteados), no en su lista. */
  private isSubView(): boolean {
    const segs = this.router.url.split('?')[0].split('/').filter(Boolean);
    const tabIndex = segs.findIndex((seg) => TABS[seg]);
    return tabIndex >= 0 && tabIndex < segs.length - 1;
  }

  logout(): void {
    this.auth.logout();
  }

  fab(): void {
    switch (this.tab()) {
      case 'publicaciones':
        this.modal.newPost();
        break;
      case 'necesidades':
        this.modal.newNeed();
        break;
      case 'insumos':
        this.modal.newSupply();
        break;
      case 'puntos':
        void this.router.navigate(['/app/puntos/nuevo']);
        break;
      default:
        this.modal.editOrg();
    }
  }
}
