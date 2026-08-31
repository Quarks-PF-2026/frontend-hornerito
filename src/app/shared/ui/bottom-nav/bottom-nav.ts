import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  /** Segmento de ruta bajo `/app`; misma clave que el mapa TABS de AppLayout. */
  key: string;
  label: string;
  /** Paths del ícono: todos son stroke-only sobre un viewBox 0 0 24 24. */
  d: string[];
  /** cx, cy, r cuando el ícono además lleva un círculo. */
  c?: [number, number, number];
  /** Uno de los tres fijos de la barra inferior en mobile. */
  bar?: true;
  /** Solo visible para dueño y administradores. */
  admin?: true;
}

/**
 * Orden del rail de desktop, que es el que manda: los items del drawer están
 * intercalados con los de la barra (Publicaciones es el segundo), así que la
 * lista se recorre entera para el rail y se filtra para las dos superficies
 * de mobile.
 */
const NAV_ITEMS: NavItem[] = [
  {
    key: 'organizacion',
    label: 'Mi comedor',
    bar: true,
    d: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-6h6v6'],
  },
  {
    key: 'publicaciones',
    label: 'Publicaciones',
    d: ['M3 11l16-6-3 15-5-4-3 3v-5'],
  },
  {
    key: 'necesidades',
    label: 'Necesidades',
    bar: true,
    d: ['M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z'],
  },
  {
    key: 'donaciones',
    label: 'Donaciones',
    bar: true,
    d: [
      'M3 8.5h18V12H3z',
      'M5 12v8h14v-8',
      'M12 8.5V20',
      'M12 8.5S10.5 3 7.8 4.2C5.6 5.2 6.6 8.5 12 8.5z',
      'M12 8.5s1.5-5.5 4.2-4.3c2.2 1 1.2 4.3-4.2 4.3z',
    ],
  },
  {
    key: 'puntos',
    label: 'Puntos',
    d: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z'],
    c: [12, 10, 2.5],
  },
  {
    key: 'voluntariado',
    label: 'Voluntariado',
    d: ['M17 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20', 'M18 5.5v5M20.5 8h-5'],
    c: [9.5, 7, 3.2],
  },
  {
    key: 'insumos',
    label: 'Insumos',
    d: ['M21 16V8l-9-5-9 5v8l9 5 9-5z', 'M3.3 7 12 12l8.7-5M12 22V12'],
  },
  {
    key: 'usuarios',
    label: 'Usuarios',
    admin: true,
    d: ['M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20', 'M17 11.2a3 3 0 0 0 0-5.9M22 20v-1.5a4 4 0 0 0-3-3.8'],
    c: [9, 7, 3.2],
  },
];

const MENU_ICON = ['M4 7h16', 'M4 12h16', 'M4 17h16'];
const LOGOUT_ICON = ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'];

/**
 * Barra inferior en mobile, rail lateral en desktop (≥1024px).
 *
 * En mobile la barra muestra solo 4 celdas —los tres items `bar` más el botón
 * Menú— y el drawer lista todos los destinos, incluidos esos tres: quien abre
 * el menú espera ver el mapa completo, no el complemento de la barra. En
 * desktop esos mismos destinos se
 * renderizan inline en el rail y el botón Menú es `display: none`, así que el
 * drawer no es alcanzable ahí por construcción, no por un chequeo de viewport.
 * Por eso no viola la regla de DESIGN_SYSTEM sobre overlays mobile-only: el
 * rail es la forma desktop de este overlay, igual que el modal centrado es la
 * forma desktop de `hn-bottom-sheet`. Las dos superficies salen del mismo
 * NAV_ITEMS, así que no pueden divergir.
 */
@Component({
  selector: 'hn-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  template: `
    <nav class="nav">
      @for (it of items(); track it.key) {
        <a
          [routerLink]="'/app/' + it.key"
          routerLinkActive="active"
          [class.secondary]="!it.bar"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            @for (p of it.d; track p) {
              <path [attr.d]="p" />
            }
            @if (it.c; as c) {
              <circle [attr.cx]="c[0]" [attr.cy]="c[1]" [attr.r]="c[2]" />
            }
          </svg>
          <span>{{ it.label }}</span>
        </a>
      }
      <button
        class="menu-btn"
        type="button"
        aria-controls="hn-nav-drawer"
        [attr.aria-expanded]="menuOpen()"
        [class.active]="menuActive()"
        (click)="menuOpen.set(true)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @for (p of menuIcon; track p) {
            <path [attr.d]="p" />
          }
        </svg>
        <span>Menú</span>
      </button>
      <button class="logout secondary" type="button" (click)="logout.emit()">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          @for (p of logoutIcon; track p) {
            <path [attr.d]="p" />
          }
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </nav>

    @if (menuOpen()) {
      <div class="drawer-backdrop" (click)="menuOpen.set(false)">
        <div
          id="hn-nav-drawer"
          class="drawer hn-scroll"
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          (click)="$event.stopPropagation()"
        >
          @for (it of items(); track it.key) {
            <a
              [routerLink]="'/app/' + it.key"
              routerLinkActive="active"
              (click)="menuOpen.set(false)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                @for (p of it.d; track p) {
                  <path [attr.d]="p" />
                }
                @if (it.c; as c) {
                  <circle [attr.cx]="c[0]" [attr.cy]="c[1]" [attr.r]="c[2]" />
                }
              </svg>
              <span>{{ it.label }}</span>
            </a>
          }
          <button class="logout" type="button" (click)="menuOpen.set(false); logout.emit()">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              @for (p of logoutIcon; track p) {
                <path [attr.d]="p" />
              }
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .nav {
        flex-shrink: 0;
        display: flex;
        background: #fff;
        border-top: 1px solid var(--hn-border-soft);
        padding: 8px 3px calc(8px + env(safe-area-inset-bottom));
        box-shadow: 0 -4px 20px -10px rgba(90, 50, 10, 0.18);
      }
      a {
        flex: 1;
        min-width: 0;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 1px;
        color: var(--hn-muted-2);
      }
      a.active {
        color: var(--hn-primary-strong);
      }
      svg {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }
      /* 4 celdas en 360px: 90px cada una, entra "Necesidades" sin truncar. */
      span {
        font-size: 11px;
        font-weight: 700;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .logout,
      .menu-btn {
        flex: 1;
        min-width: 0;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 0;
        color: var(--hn-muted-2);
        background: none;
        border: none;
        font-family: inherit;
        cursor: pointer;
      }
      .menu-btn.active {
        color: var(--hn-primary-strong);
      }
      /* Solo existen en mobile; el rail de desktop ya muestra esos destinos. */
      .menu-btn,
      .drawer-backdrop {
        display: none;
      }

      @media (max-width: 1023.98px) {
        .secondary {
          display: none;
        }
        .menu-btn {
          display: flex;
        }
        .drawer-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(46, 24, 10, 0.5);
          z-index: 40;
          display: flex;
          justify-content: flex-start;
          animation: hn-fade 0.15s ease;
        }
        .drawer {
          width: min(78%, 300px);
          background: var(--hn-surface);
          border-radius: 0 22px 22px 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 20px 12px calc(12px + env(safe-area-inset-bottom));
          animation: hn-drawer 0.22s ease;
        }
        .drawer a,
        .drawer .logout {
          flex: 0 0 auto;
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
        }
        .drawer svg {
          width: 24px;
          height: 24px;
        }
        .drawer span {
          font-size: 14px;
        }
        .drawer a.active {
          background: var(--hn-cream-soft);
        }
        .drawer .logout {
          margin-top: auto;
        }
      }

      @keyframes hn-drawer {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }

      @media (min-width: 1024px) {
        .nav {
          flex-direction: column;
          height: 100%;
          border-top: none;
          border-right: 1px solid var(--hn-border-soft);
          padding: 20px 12px;
          gap: 4px;
          box-shadow: none;
        }
        a {
          flex: 0 0 auto;
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
        }
        a.active {
          background: var(--hn-cream-soft);
        }
        svg {
          width: 24px;
          height: 24px;
        }
        span {
          font-size: 14px;
          letter-spacing: normal;
        }
        .logout {
          flex: 0 0 auto;
          flex-direction: row;
          justify-content: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          margin-top: auto;
        }
        .logout:hover {
          background: var(--hn-danger-bg);
          color: var(--hn-danger-ink);
        }
      }
    `,
  ],
})
export class BottomNav {
  /** El tab Usuarios solo existe para dueño y administradores. */
  readonly canManageMembers = input(false);
  /**
   * Segmento activo, ya resuelto por AppLayout (colapsa sub-vistas como
   * `puntos/nuevo` → `puntos`). Se usa para iluminar el botón Menú cuando la
   * ruta actual vive adentro del drawer, donde no hay un `routerLinkActive`
   * disponible porque los links solo existen mientras está abierto.
   */
  readonly currentTab = input('');
  readonly logout = output<void>();

  readonly menuOpen = signal(false);
  readonly menuIcon = MENU_ICON;
  readonly logoutIcon = LOGOUT_ICON;

  readonly items = computed(() =>
    NAV_ITEMS.filter((i) => !i.admin || this.canManageMembers()),
  );
  readonly menuActive = computed(() =>
    NAV_ITEMS.some((i) => !i.bar && i.key === this.currentTab()),
  );
}
