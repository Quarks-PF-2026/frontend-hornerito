import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'hn-bottom-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <a routerLink="/app/organizacion" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" />
        </svg>
        <span>Mi comedor</span>
      </a>
      <a routerLink="/app/publicaciones" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11l16-6-3 15-5-4-3 3v-5" />
        </svg>
        <span>Publicaciones</span>
      </a>
      <a routerLink="/app/necesidades" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        <span>Necesidades</span>
      </a>
      <a routerLink="/app/insumos" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" />
        </svg>
        <span>Insumos</span>
      </a>
      <button class="logout" type="button" (click)="logout.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </nav>
  `,
  styles: [
    `
      .nav {
        flex-shrink: 0;
        display: flex;
        background: #fff;
        border-top: 1px solid var(--hn-border-soft);
        padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
        box-shadow: 0 -4px 20px -10px rgba(90, 50, 10, 0.18);
      }
      a {
        flex: 1;
        text-decoration: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 6px 0;
        color: var(--hn-muted-2);
      }
      a.active {
        color: var(--hn-primary-strong);
      }
      svg {
        width: 24px;
        height: 24px;
      }
      span {
        font-size: 11px;
        font-weight: 700;
      }
      .logout {
        flex: 1;
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
        span {
          font-size: 14px;
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
  readonly logout = output<void>();
}
